/* ============================================================================
 * prologue.js — Prólogo do jogo (sessão #19, 2026-05-21 PADRAO_ALDRIC v2 refactor)
 * ============================================================================
 *
 * MAPA_IA — navegação rápida:
 *   ~30   Init: token/api/uid, audio, session-heartbeat
 *   ~80   apiCall(endpoint, body) — wrapper HTTP autenticado
 *   ~130  showError(msg, err)
 *   ~150  showDiceRoll(result) / showGateResult — overlays auxiliares
 *   ~250  Build scenes (objects { npc, script, choices }):
 *           _scenePreface, _sceneIntro, _sceneRoad, _sceneAftermath, _sceneGate
 *   ~420  Handlers de choice: onPrefaceDone, onIntroChoice, onRoadChoice,
 *           onAftermathDone, onGateChoice
 *   ~530  doFight / doDistract — transições para combate e dice
 *   ~580  doReroll / openLoreOverlay / _showLastRerollPopup
 *   ~650  boot() — entry point + resume logic via saved_choices
 *
 * REFACTOR sessão #19: ANTES era render*() retornando HTML + addScreen + slide.
 * Agora _scene*() retorna dialogue object pra vEncounter.render() (canonical
 * char-by-char typewriter + cursor + paginação + sub-overlay choice picker).
 *
 * Doc canonical: docs/sistemas/encounter-popup.md (PADRAO_ALDRIC engine)
 * Dialogue refs: shared/encounter-popup.js linhas 396+ (vEncounter.render)
 * ============================================================================ */

var tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

var _spaP = window.__spaRouteParams || {};
var params = new URLSearchParams(location.search);
var TOKEN = _spaP.token || params.get('token') || '';
var API_BASE = (_spaP.api || params.get('api') || '').replace(/\/$/, '');
var USER_ID = parseInt(_spaP.uid || params.get('uid') || '0', 10);

if (window.SessionHeartbeat && API_BASE && TOKEN && USER_ID) {
  SessionHeartbeat.init({ apiBase: API_BASE, token: TOKEN, uid: USER_ID });
}

var MODE = _spaP.mode || params.get('mode') || 'full';
var SHOW_PREFACE = (_spaP.preface || params.get('preface')) === '1';

if (window.ValdoriaErrors) {
  ValdoriaErrors.init({ appName: 'PROLOGUE', apiBase: API_BASE, token: TOKEN, uid: USER_ID });
}

var DATA = null;
var choices = {};
var rerollsLeft = 5;

function haptic(type) {
  if (window.vHaptic) vHaptic.impact(type || 'light');
}

/* ============================================================================
 * apiCall — fetch com auth + reconnect on 401/403
 * ============================================================================ */
async function apiCall(endpoint, body = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
  };
  if (window.Telegram?.WebApp?.initData) {
    headers['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
  }
  if (endpoint.includes('/reroll') || endpoint.includes('/fight') ||
      endpoint.includes('/complete') || endpoint.includes('/distract')) {
    headers['X-Idempotency-Key'] = crypto.randomUUID();
  }
  const resp = await fetchT(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user_id: USER_ID, ...body }),
  });
  if (resp.status === 401 || resp.status === 403) {
    console.error('[PROLOGUE] Auth error:', resp.status);
    /* 2026-06-12 (user: "o jogo travou e o webapp encerrou sozinho" + "bots
       enviando mensagens sem /start"). Se JÁ estamos numa transição intencional
       (o /complete que navega pra cidade CONSOME a sessão de prólogo), uma 2ª
       chamada recebe 401 ESPERADO. Disparar webapp_reconnect (→ bot manda banner
       sem /start) + tgRef.close() (→ WebApp fecha) era o bug. Durante transição:
       suprime tudo e só propaga o erro silenciosamente — a navegação segue. */
    if (window.__valdoria_transitioning) {
      throw new Error('session_expired');
    }
    const tgRef = window.Telegram?.WebApp;
    if (tgRef?.sendData) {
      window.__valdoria_transitioning = true;
      tgRef.sendData(JSON.stringify({
        action: 'webapp_reconnect',
        webapp: 'PROLOGUE',
        reason: resp.status === 401 ? 'session_expired' : 'invalid_init_data',
      }));
      setTimeout(function() { if (tgRef.close) tgRef.close(); }, 1000);
    }
    throw new Error('session_expired');
  }
  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${resp.status}`);
  }
  return resp.json().then(function(data) {
    if (data && data.status === 'displaced') {
      if (window.SessionHeartbeat) {
        SessionHeartbeat.handleDisplaced(data.device || '', data.from_device || '');
      }
      return null;
    }
    return data;
  }).catch(function() { throw new Error('Resposta inválida do servidor'); });
}

/* 2026-06-11 (user: escolheu combater os lobos → 2min de tela em branco).
   Logs do device mostraram a conexão STALLANDO: o servidor respondeu o
   save_choice em 1ms mas a resposta nunca chegou (timeout 15s). Chamadas
   CRÍTICAS (fight/complete/distract) agora re-tentam em falha TRANSIENTE
   (network/timeout/5xx) a cada 3s — mesmo padrão do /play/ e da cidade.
   Erro DEFINITIVO (sessão/4xx) propaga na hora. */
async function apiCallRetry(endpoint, body, opts) {
  opts = opts || {};
  var max = opts.attempts || 5;
  for (var i = 0; ; i++) {
    try {
      return await apiCall(endpoint, body || {});
    } catch (e) {
      var msg = String(e && e.message || e);
      var transient = !(/session_expired/.test(msg) || /HTTP 4\d\d/.test(msg));
      if (!transient || i >= max - 1) throw e;
      console.warn('[PROLOGUE] ' + endpoint + ' transiente (' + msg.slice(0, 80) + ') — retry ' + (i + 2) + '/' + max);
      try {
        if (window.vProcessing && vProcessing.isActive && vProcessing.isActive()) {
          vProcessing.setText('Reconectando ao servidor… (tentativa ' + (i + 2) + ')');
        }
      } catch (e2) {}
      await new Promise(function (r) { setTimeout(r, 3000); }); /* noqa: preflight - backoff de retry de rede, nao tempo de leitura */
    }
  }
}

/* Overlay PERSISTENTE para transições de PÁGINA (fight→combate, complete→cidade).
   O _prologueInitLoading usa contentCheck '#viewport' — correto pro INIT do
   prólogo, mas numa transição o #viewport local está sempre "pronto" e o
   vProcessing auto-escondia em 6ms, deixando o download da página destino SEM
   nenhum feedback (a tela em branco dos 2min). SEM contentCheck o overlay fica
   até o browser pintar o documento de destino; se a navegação travar, o botão
   de retry default do vProcessing (18s) recarrega — e o resume server-side
   (detect_active_state) leva de volta ao destino correto. */
function _showTransitionOverlay(text) {
  try {
    if (window.vProcessing && vProcessing.show) { vProcessing.show({ text: text }); return; }
  } catch (e) {}
  var _ld = document.getElementById('loading');
  if (_ld) { _ld.style.display = 'flex'; _ld.classList.remove('hidden'); }
}

function showError(msg, err) {
  console.error('[PROLOGUE]', msg, err || '');
  /* Bug user 2026-06-10: o botão "Fechar" só removia o overlay → deixava a
     tela VAZIA por baixo (o boot havia falhado, nada renderizou). Agora a ação
     primária é "Recomeçar" (recarrega — o server já recupera a sessão via DB
     authority), pra o jogador NUNCA ficar preso numa tela sem saída. Construído
     via DOM (textContent na mensagem) para evitar injeção. */
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:20px';
  var card = document.createElement('div');
  card.style.cssText = 'background:#2a2218;border:1px solid #c4953a;padding:24px;border-radius:12px;max-width:380px;color:#d4c8b0;text-align:center';
  var icon = document.createElement('div');
  icon.style.cssText = 'color:#c02020;font-size:32px;margin-bottom:8px';
  icon.textContent = '';
  var p = document.createElement('p');
  p.style.cssText = 'margin:0 0 16px';
  p.textContent = String(msg == null ? '' : msg);
  var btn = document.createElement('button');
  btn.style.cssText = 'padding:10px 24px;background:#c4953a;color:#1a1510;border:none;border-radius:6px;font-weight:bold;cursor:pointer';
  btn.textContent = '↻ Recomeçar';
  btn.addEventListener('click', function() {
    try { window.location.reload(); } catch (e) { /* ok */ }
  });
  card.appendChild(icon);
  card.appendChild(p);
  card.appendChild(btn);
  ov.appendChild(card);
  document.body.appendChild(ov);
}

/* ============================================================================
 * Dice overlay — distract skill check (kept as-is; not part of PADRAO_ALDRIC)
 * ============================================================================ */
var _prologueDice = null;
function showDiceRoll(result) {
  const overlay = document.getElementById('diceOverlay');
  const canvas = document.getElementById('prologueDice3dCanvas');
  const breakdown = document.getElementById('diceBreakdown');
  const resultLabel = document.getElementById('diceResultLabel');
  const narrative = document.getElementById('diceNarrative');
  const actions = document.getElementById('diceActions');
  if (!overlay || !breakdown || !resultLabel || !narrative || !actions) return;
  breakdown.textContent = '';
  resultLabel.textContent = '';
  narrative.textContent = '';
  actions.innerHTML = '';
  overlay.classList.add('active');
  try {
    if (_prologueDice) { _prologueDice.dispose(); _prologueDice = null; }
    _prologueDice = new Dice3D(canvas, {
      size: typeof ValdoriaDice !== 'undefined' ? ValdoriaDice.D20_SIZE : 220,
      dieType: 'd20',
      duration: typeof ValdoriaDice !== 'undefined' ? ValdoriaDice.TIMING.D20_ROLL_MS : 1200
    });
  } catch (e) {
    console.warn('[PROLOGUE] Dice3D init failed, fallback:', e);
    _showDiceRollFallback(result);
    return;
  }
  const natural = result.natural;
  const mod = result.modifier;
  const total = result.total;
  const dc = result.dc;
  const success = result.success;
  var _rollDone = false;
  _prologueDice.roll(natural, function() {
    if (_rollDone) return;
    _rollDone = true;
    const modSign = mod >= 0 ? '+' : '';
    breakdown.textContent = `1d20 (${natural}) ${modSign}${mod} = ${total} vs DC ${dc}`;
    resultLabel.textContent = success ? 'SUCESSO!' : 'FALHA!';
    resultLabel.style.color = success ? 'var(--v-success)' : 'var(--v-danger)';
    if (success) {
      narrative.innerHTML = (
        'Você pega uma tocha da carroça tombada e a balança na direção dos lobos, ' +
        'gritando e batendo em um escudo improvisado. O fogo e o barulho os assustam — ' +
        'os predadores recuam entre os arbustos, ganindo.<br><br>' +
        '<span style="color:var(--v-success);font-weight:700">+100 XP</span>'
      );
      actions.innerHTML = `<button class="cenario-btn" onclick="haptic('medium'); onDistractSuccess()">Falar com o ferreiro</button>`;
    } else {
      narrative.innerHTML = (
        'Você tenta assustar os lobos, mas o líder da matilha não se intimida. ' +
        'Ele rosna e avança! Não há outra opção — é lutar ou morrer!'
      );
      let _failDone = false;
      const goFight = () => {
        if (_failDone) return;
        _failDone = true;
        haptic('heavy');
        onDistractFail();
      };
      actions.innerHTML = `<button class="v-skip-btn" id="distractFailSkip">Lutar!</button>`;
      /* 2026-06-11 (user): NÃO avança sozinho — só pelo botão "Lutar!". */
      setTimeout(() => {
        const skipBtn = document.getElementById('distractFailSkip');
        if (skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = goFight; }
      }, 500);
    }
    try { if (tg) tg.HapticFeedback.notificationOccurred(success ? 'success' : 'error'); }
    catch (e) { console.warn('[PROLOGUE] haptic:', e); }
  });
}
function _showDiceRollFallback(result) {
  const d20 = document.getElementById('diceD20');
  if (!d20) return;
  d20.style.display = '';
  d20.className = 'dice-d20 rolling';
  d20.textContent = '?';
  let rollInterval = setInterval(() => { d20.textContent = Math.floor(Math.random() * 20) + 1; }, 80);
  setTimeout(() => {
    clearInterval(rollInterval);
    d20.textContent = result.natural;
    d20.className = 'dice-d20 ' + (result.success ? 'success' : 'fail');
    const modSign = result.modifier >= 0 ? '+' : '';
    document.getElementById('diceBreakdown').textContent = `1d20 (${result.natural}) ${modSign}${result.modifier} = ${result.total} vs DC ${result.dc}`;
    document.getElementById('diceResultLabel').textContent = result.success ? 'SUCESSO!' : 'FALHA!';
    document.getElementById('diceResultLabel').style.color = result.success ? 'var(--v-success)' : 'var(--v-danger)';
    const narrative = document.getElementById('diceNarrative');
    const actions = document.getElementById('diceActions');
    if (result.success) {
      narrative.innerHTML = 'Você pega uma tocha da carroça tombada e a balança na direção dos lobos, ' +
        'gritando e batendo em um escudo improvisado. O fogo e o barulho os assustam — ' +
        'os predadores recuam entre os arbustos, ganindo.<br><br>' +
        '<span style="color:var(--v-success);font-weight:700">+100 XP</span>';
      actions.innerHTML = `<button class="cenario-btn" onclick="haptic('medium'); onDistractSuccess()">Falar com o ferreiro</button>`;
    } else {
      narrative.innerHTML = 'Você tenta assustar os lobos, mas o líder da matilha não se intimida. ' +
        'Ele rosna e avança! Não há outra opção — é lutar ou morrer!';
      let _failDone = false;
      const goFight = () => { if (_failDone) return; _failDone = true; haptic('heavy'); onDistractFail(); };
      actions.innerHTML = `<button class="v-skip-btn" id="distractFailSkipFb">Lutar!</button>`;
      /* 2026-06-11 (user): botão only, sem auto-avanço (igual path 3D). */
      setTimeout(() => {
        const skipBtn = document.getElementById('distractFailSkipFb');
        if (skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = goFight; }
      }, 500);
    }
  }, 2000);
}

function showGateResult(outcomeText, effectText, callback) {
  const overlay = document.getElementById('resultOverlay');
  const textEl = document.getElementById('resultText');
  const effectsEl = document.getElementById('resultEffects');
  const skipBtn = document.getElementById('resultSkip');
  if (!overlay || !textEl || !effectsEl || !skipBtn) return;
  textEl.innerHTML = outcomeText;
  let badgeClass = 'neutral';
  if (effectText.includes('Penalidade') || effectText.includes('-')) badgeClass = 'negative';
  else if (effectText.includes('Bônus') || effectText.includes('+')) badgeClass = 'positive';
  effectsEl.innerHTML = effectText ? `<div class="effect-badge ${badgeClass}">${effectText}</div>` : '';
  overlay.classList.add('active');
  const fullText = (outcomeText || '') + ' ' + (effectText || '');
  const delay = typeof calcReadTime === 'function' ? calcReadTime(fullText, 'summary') : 2500;
  let _done = false;
  const finish = () => {
    if (_done) return;
    _done = true;
    skipBtn.classList.remove('visible');
    skipBtn.onclick = null;
    overlay.classList.remove('active');
    callback();
  };
  setTimeout(() => { if (!_done) { skipBtn.classList.add('visible'); skipBtn.onclick = finish; } }, 500);
  setTimeout(finish, delay);
}

/* ============================================================================
 * Scene builders — return dialogue object pra vEncounter.render
 * ============================================================================ */

/* Cena PREFACE: boas-vindas inicial (mostrada se DATA.show_preface). */
function _scenePreface() {
  const text = DATA.preface_text || 'Boas vindas a Valdoria!';
  return {
    npc: { name: 'Boas-Vindas a Valdoria', desc: 'O início da sua jornada', portrait: '' },
    script: [
      { type: 'narration', text: text }
    ],
    choices: [
      { id: 'continuar', label: '▸ Continuar', cb: '__local_continue' }
    ]
  };
}

/* Cena INTRO: apresenta o personagem do jogador (origem + classe + nível).
   Choices: Ver Origem (drawer), Sortear Outra (reroll), Continuar Jornada. */
function _sceneIntro() {
  const c = DATA.character || {};
  const l = DATA.lore || {};
  const fullName = `${c.name || ''} ${c.surname || ''}`.trim();
  const rerollLabel = rerollsLeft > 0 ? `Sortear Outra (${rerollsLeft})` : 'Limite atingido';
  /* Script combina lore intro + classe info como 2 estrofes narrativas. */
  const charLine = (c.class_label || '') + ' · ' + (c.race || '') + ' · Nível ' + (c.level || 1);
  const script = [
    { type: 'narration', text: '<i>' + (l.title || 'Sua Origem') + '</i> — ' + (l.description || '') },
    { type: 'narration', text: 'As origens criam escolhas e eventos diferentes durante a jornada.' }
  ];
  const choices = [
    { id: 'origem', label: 'Ver Origem', cb: '__local_lore' }
  ];
  if (rerollsLeft > 0) {
    choices.push({ id: 'reroll', label: rerollLabel, cb: '__local_reroll' });
  }
  choices.push({ id: 'continuar', label: '▸ Continuar Jornada', cb: '__local_intro_done' });
  return {
    npc: {
      name: fullName.toUpperCase(),
      desc: charLine,
      portrait: ''  /* Sem portrait — empty gold circle (player meta-screen) */
    },
    script: script,
    choices: choices
  };
}

/* Cena ROAD: emboscada na estrada — narrativa multi-stanza paginada.
   Engine vEncounter já lida com paginação automática (2 estrofes / 10 lines per page). */
function _sceneRoad() {
  const road = DATA.road || {};
  /* Backend retorna road.script[] (lista de narration/speech segments)
     OU road.text (fallback antigo). */
  let script = [];
  if (Array.isArray(road.script) && road.script.length > 0) {
    script = road.script.map(function(seg) {
      return {
        type: seg.type || 'narration',
        speaker: seg.speaker || undefined,
        text: seg.text || ''
      };
    });
  } else {
    script = [{ type: 'narration', text: road.text || 'A jornada se torna perigosa...' }];
  }
  return {
    npc: { name: 'Emboscada na Estrada', desc: 'A jornada se torna perigosa', portrait: '' },
    script: script,
    choices: [
      { id: 'fight', label: 'Lutar contra os lobos!', cb: '__local_road_fight' },
      { id: 'distract', label: 'Criar uma distração', cb: '__local_road_distract' }
    ]
  };
}

/* Cena INJURED COMPANION: Sessao #37 v19 (2026-05-25) — apos o combate,
   Thorne pede ajuda pro aprendiz Brenn que esta inconsciente no chao.
   Choices dinamicos baseados em classe + inventario (vem do backend
   em DATA.injured_companion.choices). */
function _sceneInjuredCompanion() {
  const ic = (DATA && DATA.injured_companion) || {};
  const npc = ic.npc || { name: 'Ferreiro Ferido', desc: 'Tenta socorrer o aprendiz', portrait: '' };
  const script = ic.script || [];
  /* Map server choices → vEncounter choice shape */
  const choices = (ic.choices || []).map(function(c){
    return {
      id: c.key,
      label: c.label,
      desc: c.desc || '',
      cb: '__local_heal_companion:' + c.key,
      dc: c.dc,
      skill: c.skill,
      cost: c.cost_label
    };
  });
  return { npc: npc, script: script, choices: choices };
}

/* Cena CURANDEIRA ERRANTE (tarefa A, sessao #86): se o personagem caiu a 0 PV
   durante o combate da estrada MAS a luta foi vencida (Thorne abateu o ultimo
   lobo), Maela Folha-Prata passa e o estabiliza. Server e a autoridade — esta
   cena so existe quando DATA.death_healer vem preenchido (player.hp <= 0 no
   aftermath); a cura e aplicada server-side (apply_road_aftermath). Escolha
   unica avanca pro fluxo normal do aftermath (Brenn / aftermath canonical). */
function _sceneDeathHealer() {
  const dh = (DATA && DATA.death_healer) || {};
  const npc = dh.npc || { name: 'Maela Folha-Prata', desc: 'Curandeira errante', portrait: '' };
  const script = _filterEmptySegments(dh.script || []);
  return {
    npc: npc,
    script: script,
    choices: [
      { id: 'levantar', label: '▸ Levantar-se', cb: '__local_death_healer_done' }
    ]
  };
}

/* Cena INJURED COMPANION RESULT: mostra outcome narrativo apos a escolha
   de cura. Header com nome do NPC vivo (Brenn) ou Thorne dependendo do
   outcome. Choice unica avanca pra _sceneAftermath. */
/* #85 (user): RECOMPENSA ÉPICA (PADRAO_ALDRIC) — XP/Valdoritas/itens com
   apresentação digna. 2026-06-11 (user, bug grotesco): NÃO se constrói mais
   HTML aqui (o antigo _epicRewardBlock cravava `<div style>` em narração e o
   sanitizer do vEncounter o ESCAPAVA → vazava `<div style=...>` como texto pro
   jogador). Agora é um SCRIPT ITEM ESTRUTURADO `{type:'reward', ...}` que o
   renderer confiável desenha via DOM (shared/encounter-popup.js _buildRewardBlockEl).
   Helper só monta o objeto — zero HTML em campo de texto. */
function _rewardItem(opts) {
  opts = opts || {};
  return { type: 'reward', xp: opts.xp || 0, gold: opts.gold || 0, items: opts.items || [] };
}

/* #85 (user): remove segmentos de script VAZIOS (texto só whitespace/tags/aspas)
   que viravam um "fundo de diálogo sem nada" (ex.: acima da fala do Thorne nos
   portões, entre duas falas consecutivas). Defensivo p/ TODA cena PADRAO_ALDRIC. */
function _filterEmptySegments(script) {
  return (script || []).filter(function (s) {
    if (!s) return false;
    /* Script item estruturado (reward) não tem .text — preservar sempre. */
    if (s.type === 'reward') return true;
    return typeof s.text === 'string'
      && s.text.replace(/<[^>]*>/g, '').replace(/[\s'"'']/g, '').length > 0;
  });
}

function _sceneInjuredCompanionResult(result) {
  result = result || {};
  /* Parse narrativa: split em paragrafos pra narration / speech */
  const text = result.narrative || '';
  const script = [];
  const quoteRegex = /([""'']|<i>['"])(.+?)(['""'']|['"]<\/i>)/g;
  let lastIdx = 0;
  let match;
  let foundAny = false;
  let quoteIdx = 0;
  /* Speaker coerente com o header (bug 2026-06-11): quando o Brenn acorda
     (magic_success/potion) a 1ª fala é dele ("Mestre..."/"Que aconteceu?") e as
     seguintes do Thorne; quando NÃO acorda (first_aid/carry/fails) todas são do
     Thorne — assim o nome da bolha nunca diverge do retrato do header. */
  const isBrennAwake = (result.outcome_key === 'magic_success' || result.outcome_key === 'potion');
  while ((match = quoteRegex.exec(text)) !== null) {
    foundAny = true;
    const preText = text.slice(lastIdx, match.index).trim();
    if (preText) script.push({ type: 'narration', text: preText });
    const speaker = (isBrennAwake && quoteIdx === 0) ? 'Brenn, Aprendiz' : 'Thorne, o Ferreiro';
    script.push({ type: 'speech', speaker: speaker, text: match[2] });
    quoteIdx++;
    lastIdx = match.index + match[0].length;
  }
  if (foundAny) {
    const trailing = text.slice(lastIdx).trim();
    if (trailing) script.push({ type: 'narration', text: trailing });
  } else {
    script.push({ type: 'narration', text: text });
  }
  /* #85 (user): recompensa ÉPICA (PADRAO_ALDRIC) — agora script item estruturado
     (bug 2026-06-11: HTML em narração vazava como texto). */
  if ((result.xp && result.xp > 0) || (result.gold && result.gold > 0) || (result.items && result.items.length)) {
    script.push(_rewardItem({ xp: result.xp, gold: result.gold, items: result.items }));
  }
  /* O NPC do header (retrato + nome + desc) DEVE ser COERENTE com quem fala.
     2026-06-11 (user, bug): em `first_aid_success` o Brenn NÃO acorda ("Brenn
     não acorda, mas a respiração estabiliza") → quem fala é o Thorne. Mas o
     header mostrava imagem do Brenn (hardcoded) + nome do Thorne — mismatch.
     _brennAwake = SÓ quando o Brenn realmente acorda e fala (magic_success/
     potion). A key do server é `first_aid_success` (com underscore) — o antigo
     'firstaid_success' era dead code (e Brenn não acorda no firstaid de toda
     forma). Retrato/nome/desc agora derivam todos do MESMO booleano. */
  var _brennAwake = (result.outcome_key === 'magic_success' || result.outcome_key === 'potion');
  return {
    npc: {
      name: _brennAwake ? 'Brenn, Aprendiz' : 'Thorne, o Ferreiro',
      desc: _brennAwake ? 'Aprendiz de Thorne' : 'O Ferreiro',
      portrait: _brennAwake
        ? '/shared/img/npcs/brenn-aprendiz.webp'
        : '/shared/img/npcs/thorne-armeiro.webp'
    },
    script: _filterEmptySegments(script),
    choices: [
      { id: 'continuar', label: '▸ Seguir para Valdoria', cb: '__local_companion_result_done' }
    ]
  };
}

/* Cena AFTERMATH: o ferreiro (ainda sem nome) agradece por salvar seu filho.
   Sessao #33 (2026-05-25): user pediu coerencia narrativa — Thorne so deve ser
   nomeado APOS a apresentacao no texto ("Seu nome e Thorne Tempera-de-Aco").
   Speaker das falas antes desse ponto = "Ferreiro Ferido" (anonimo); apos =
   "Thorne, o Ferreiro". NPC header da scene fica como "O Ferreiro" inicialmente
   pois a apresentacao formal acontece DURANTE a cena. */
function _sceneAftermath() {
  const text = DATA.aftermath_text || '';
  /* Parse aspas → cada quote vira speech bubble; resto vira narration. */
  const script = [];
  const quoteRegex = /([""'']|<i>['"])(.+?)(['""'']|['"]<\/i>)/g;
  let lastIdx = 0;
  let match;
  let foundAny = false;
  /* Sessao #33: marker = posicao no texto onde Thorne se apresenta. Speeches
     ANTES desse offset usam speaker anonimo; depois, nome revelado. */
  const NAME_REVEAL_MARKER = 'Seu nome é';
  const nameRevealIdx = text.indexOf(NAME_REVEAL_MARKER);
  const anonSpeaker = 'Ferreiro Ferido';
  const namedSpeaker = 'Thorne, o Ferreiro';
  while ((match = quoteRegex.exec(text)) !== null) {
    foundAny = true;
    const preText = text.slice(lastIdx, match.index).trim();
    if (preText) script.push({ type: 'narration', text: preText });
    /* Speech speaker depende da posicao no texto */
    const speakerHere = (nameRevealIdx >= 0 && match.index > nameRevealIdx)
      ? namedSpeaker : anonSpeaker;
    script.push({ type: 'speech', speaker: speakerHere, text: match[2] });
    lastIdx = match.index + match[0].length;
  }
  if (foundAny) {
    const trailing = text.slice(lastIdx).trim();
    if (trailing) script.push({ type: 'narration', text: trailing });
  } else {
    script.push({ type: 'narration', text: text });
  }
  return {
    npc: {
      /* Header da cena mostra nome revelado — afinal o player vai aprender
         o nome durante a cena (narration "Seu nome e Thorne..."). Manter o
         nome no header acompanha a revelacao narrativa. */
      name: namedSpeaker,
      desc: 'Salvo dos lobos, agradecido',
      portrait: '../shared/img/npcs/thorne-armeiro.webp'
    },
    script: _filterEmptySegments(script),
    choices: [
      { id: 'continuar', label: 'Seguir para os Portões', cb: '__local_aftermath_done' }
    ]
  };
}

/* Cena GATE: interação com guarda no portão da cidade. N options dinâmicas.
   Sessão #38 (2026-05-26): server pre-pagineia o texto em script[] estruturado
   (Server-side processing priority — MEMORY P0). Cliente apenas usa inter.script
   direto. Fallback pra inter.text preservado pra backwards compat. */
function _sceneGate() {
  const inter = DATA.interaction || {};
  const title = inter.title || 'Portões de Valdória';
  const options = inter.options || [];

  /* Prefer pre-paginated script from server (Python _split_narration_paragraphs).
     Fallback: legacy single-text payload (versões antigas do server). */
  let script;
  if (Array.isArray(inter.script) && inter.script.length > 0) {
    script = inter.script;
  } else {
    const text = inter.text || 'Você chega aos portões. O guarda barra sua passagem.';
    script = [{ type: 'narration', text: text }];
  }

  const choices = options.map(function(o) {
    return {
      id: o.key,
      label: o.label || o.key,
      cb: '__local_gate:' + o.key
    };
  });
  if (choices.length === 0) {
    choices.push({ id: 'enter', label: '▸ Entrar', cb: '__local_gate:enter' });
  }
  /* #85 (user, #7): evento de lore com imagem do sujeito (cão/NPC/objeto). O
     server manda inter.subject_image (/shared/img/lore/<origin>.webp); usamos no
     portrait do vEncounter. Evento de lore mostra o contexto como desc; o gate
     padrão (sem imagem) mantém "Os portões de Valdória". */
  const isLore = (inter.type === 'lore');
  const subjectImg = inter.subject_image || '';
  /* Bug 2026-06-11 (user): vinhetas de ORIGEM têm cenário próprio (praia/mastro,
     deserto, montanha…) e tocavam aos portões de Valdoria como se acontecessem
     ALI — incoerência espacial ("estou na floresta, por que uma praia?"). Fix de
     RAIZ p/ todas as ~250 origens, sem editar 250 arquivos: enquadrar a vinheta
     como MEMÓRIA da terra natal. A lembrança é coerente em QUALQUER cenário; as
     escolhas representam como você reviveu/agiu naquele momento. O outcome
     (_sceneLoreOutcome) já fecha com "Seguir para os Portões" (volta ao presente). */
  if (isLore) {
    script = [{
      type: 'narration',
      text: 'A estrada para Valdoria se estende adiante. Por um instante seus passos pesam — '
        + 'e a memória te puxa de volta, para um dia que ainda mora em você, nítido como se '
        + 'acontecesse agora:'
    }].concat(script);
  }
  return {
    npc: {
      name: title.toUpperCase(),
      desc: isLore ? ('Uma lembrança — ' + (inter.context || 'sua origem')) : 'Os portões de Valdória',
      portrait: subjectImg
    },
    script: script,
    choices: choices
  };
}

/* ============================================================================
 * Scene dispatcher — single source pra abrir cada cena via vEncounter
 * ============================================================================ */
/* 2026-06-12 (user): garante tema FLORESTA em todo diálogo do prólogo. play() é
   idempotente (não faz nada se já é 'forest'); se a música de vitória do combate
   estiver tocando ao voltar pro aftermath, faz crossfade pra floresta. */
function _ensureForestMusic() {
  try {
    if (typeof ValdoriaAudio !== 'undefined' && ValdoriaAudio.play) {
      ValdoriaAudio.play('forest');
    }
  } catch (e) { /* áudio é best-effort */ }
}

function _renderScene(sceneFn) {
  if (typeof vEncounter === 'undefined' || !vEncounter.render) {
    showError('PADRAO_ALDRIC engine não carregada.');
    return;
  }
  _ensureForestMusic();
  const dialogue = sceneFn();
  vEncounter.render(dialogue, {
    onChoice: function(ch) {
      _dispatchPrologueChoice(ch);
    }
  });
}

/* Choice dispatcher — routes by cb prefix '__local_*'. */
function _dispatchPrologueChoice(ch) {
  haptic('medium');
  const cb = ch.cb || '';
  if (cb === '__local_continue') {
    onPrefaceDone();
  } else if (cb === '__local_lore') {
    /* Lore drawer abre por cima do encounter (z-index lore > encounter) */
    openLoreOverlay();
  } else if (cb === '__local_reroll') {
    doReroll();
  } else if (cb === '__local_intro_done') {
    onIntroDone();
  } else if (cb === '__local_road_fight') {
    onRoadChoice('fight');
  } else if (cb === '__local_road_distract') {
    onRoadChoice('distract');
  } else if (cb.indexOf('__local_heal_companion:') === 0) {
    /* Sessao #37 v19 — Brenn ferido, escolha de cura */
    const key = cb.slice('__local_heal_companion:'.length);
    onCompanionHealChoice(key);
  } else if (cb === '__local_companion_result_done') {
    /* Apos resultado da cura → segue pro aftermath canonical */
    _renderScene(_sceneAftermath);
  } else if (cb === '__local_death_healer_done') {
    /* Tarefa A: apos a curandeira errante → segue pro fluxo normal do aftermath
       (Brenn ferido se ainda nao curado, senao aftermath canonical). */
    var _scDH = (DATA && DATA.saved_choices) || {};
    if (_scDH.brenn_choice) { _renderScene(_sceneAftermath); }
    else { _renderScene(_sceneInjuredCompanion); }
  } else if (cb === '__local_aftermath_done') {
    onAftermathDone();
  } else if (cb.indexOf('__local_gate:') === 0) {
    const key = cb.slice('__local_gate:'.length);
    onGateChoice(key);
  } else if (cb === '__local_lore_outcome_done') {
    /* #85 (#8): fim da narrativa pós-escolha de lore → entra na cidade */
    onEnterCity();
  } else {
    console.warn('[PROLOGUE] Unknown choice cb:', cb);
  }
}

/* 2026-06-08 (user): rolagem 3D GENERICA (PADRAO 3D Dice) pra checks do prologo
   que retornam result.rolled (ex.: Primeiros Socorros = Medicina DC12; Magia de
   Cura = Religiao DC10). Mostra d20 + breakdown + SUCESSO/FALHA, depois onDone().
   Diferente de showDiceRoll() que e especifico do gate (narrativa hardcoded). */
function _showSkillDiceThen(rolled, onDone) {
  var overlay = document.getElementById('diceOverlay');
  var canvas = document.getElementById('prologueDice3dCanvas');
  var breakdown = document.getElementById('diceBreakdown');
  var resultLabel = document.getElementById('diceResultLabel');
  var narrative = document.getElementById('diceNarrative');
  var actions = document.getElementById('diceActions');
  if (!overlay || !breakdown || !resultLabel || !actions || !rolled) { if (onDone) onDone(); return; }
  breakdown.textContent = '';
  resultLabel.textContent = '';
  if (narrative) narrative.textContent = '';
  actions.textContent = '';
  overlay.classList.add('active');
  var _done = false;
  function finish() {
    if (_done) return;
    _done = true;
    try { if (_prologueDice) { _prologueDice.dispose(); _prologueDice = null; } } catch (e) { /* ok */ }
    overlay.classList.remove('active');
    if (onDone) onDone();
  }
  function afterRoll() {
    var modSign = rolled.modifier >= 0 ? '+' : '';
    breakdown.textContent = '1d20 (' + rolled.natural + ') ' + modSign + rolled.modifier + ' = ' + rolled.total + ' vs DC ' + rolled.dc;
    resultLabel.textContent = rolled.success ? 'SUCESSO!' : 'FALHA!';
    resultLabel.style.color = rolled.success ? 'var(--v-success)' : 'var(--v-danger)';
    try { if (tg) tg.HapticFeedback.notificationOccurred(rolled.success ? 'success' : 'error'); } catch (e) { /* ok */ }
    var btn = document.createElement('button');
    btn.className = 'v-skip-btn';
    btn.id = 'skillDiceContinue';
    btn.textContent = 'Continuar ▸';
    btn.onclick = finish;
    actions.appendChild(btn);
    /* 2026-06-11 (user): a rolagem de dados NÃO fecha sozinha — só pelo botão
       "Continuar ▸". Antes um setTimeout(finish, delay) auto-fechava, sem dar
       tempo de ler o resultado. Botão revela em 500ms (anti-double-fire). */
    setTimeout(function () { var b = document.getElementById('skillDiceContinue'); if (b) b.classList.add('visible'); }, 500);
  }
  try {
    if (_prologueDice) { _prologueDice.dispose(); _prologueDice = null; }
    _prologueDice = new Dice3D(canvas, {
      size: (typeof ValdoriaDice !== 'undefined' ? ValdoriaDice.D20_SIZE : 220),
      dieType: 'd20',
      duration: (typeof ValdoriaDice !== 'undefined' ? ValdoriaDice.TIMING.D20_ROLL_MS : 1200)
    });
    var _rd = false;
    _prologueDice.roll(rolled.natural, function () { if (_rd) return; _rd = true; afterRoll(); });
  } catch (e) {
    console.warn('[PROLOGUE] skill dice init failed:', e);
    afterRoll();
  }
}

/* Sessao #37 v19 (2026-05-25): handler de escolha de cura do Brenn.
   Chama POST /api/prologue/heal_companion → render result scene. */
var _brennChoiceMade = false;
async function onCompanionHealChoice(key) {
  if (_brennChoiceMade) return;
  _brennChoiceMade = true;
  try {
    const result = await apiCall('/api/prologue/heal_companion', { choice: key });
    if (!result || result.error) {
      _brennChoiceMade = false; // permite tentar de novo
      showError('Erro ao aplicar cura: ' + (result && result.error || 'desconhecido'));
      return;
    }
    /* 2026-06-08 (user): se houve rolagem (Primeiros Socorros / Magia de Cura),
       mostra o d20 3D + resultado ANTES da cena (PADRAO 3D Dice); senao vai direto. */
    var _renderOutcome = function () { _renderScene(function () { return _sceneInjuredCompanionResult(result); }); };
    if (result.rolled) {
      /* #85 (user): a rolagem de dados NÃO aparecia (Magia de Cura) porque o
         vEncounter ficava POR CIMA do dice overlay. Fecha o encounter ANTES de
         rolar (mesmo padrão do doDistract) → o d20 3D aparece 100% das vezes. */
      if (typeof vEncounter !== 'undefined' && vEncounter.close) vEncounter.close();
      _showSkillDiceThen(result.rolled, _renderOutcome);
    } else { _renderOutcome(); }
  } catch (e) {
    _brennChoiceMade = false;
    showError('Erro ao curar aprendiz.', e);
  }
}

/* ============================================================================
 * Handlers — bridge entre vEncounter choices e API/transitions
 * ============================================================================ */
function onPrefaceDone() {
  // 2026-06-12 (user): escolha de origem REMOVIDA — a origem é aleatória (atribuída na
  // criação do personagem, character_webapp_apply.py). Pula o _sceneIntro e vai direto à
  // narrativa. Reativar a escolha (voltar p/ _sceneIntro) quando a origem influenciar de
  // fato a narrativa/eventos do jogo. (O _sceneIntro/doReroll ficam intactos p/ reativar.)
  _renderScene(_sceneRoad);
}

function onIntroDone() {
  closeLoreOverlay();
  _renderScene(_sceneRoad);
}

var _roadChoiceMade = false;
async function onRoadChoice(key) {
  if (_roadChoiceMade) return;
  _roadChoiceMade = true;
  choices.road_choice = key;
  /* 2026-06-11: SEM await — save_choice é persistência não-crítica (o /fight
     já grava a escolha server-side via quest) e o await bloqueava o caminho
     crítico por até 15s quando a conexão stallava (timeout do fetchT). A
     função tem catch próprio — fire-and-forget é seguro. */
  _saveChoiceServer('road', key);
  if (key === 'fight') {
    await doFight();
  } else {
    await doDistract();
  }
}

async function doFight() {
  try {
    /* Overlay PERSISTENTE (sem contentCheck) — cobre a chamada + a navegação
       inteira até o combate pintar. Antes: _prologueInitLoading auto-escondia
       em 6ms e a navegação ficava sem feedback (user: 2min de tela em branco). */
    _showTransitionOverlay('Os lobos avançam — preparando o combate…');
    const result = await apiCallRetry('/api/prologue/fight', {});
    if (result.combat_url || result.arena_url) {
      window.__valdoria_transitioning = true;
      /* Close encounter overlay antes da transição (UX limpo) */
      if (typeof vEncounter !== 'undefined' && vEncounter.close) vEncounter.close();
      try { if (window.vProcessing && vProcessing.setText) vProcessing.setText('Entrando em combate…'); } catch (e2) {}
      valdoriaSpaNav(result.combat_url || result.arena_url);
      /* NÃO esconder o overlay — ele cobre o download da página de combate. */
    } else {
      try { if (window.vProcessing) vProcessing.hide(); } catch (e3) {}
      showError('Erro ao iniciar combate.');
    }
  } catch (e) {
    try { if (window.vProcessing) vProcessing.hide(); } catch (e4) {}
    showError('Erro ao iniciar combate.', e);
  }
}

async function doDistract() {
  try {
    /* Fecha encounter antes de abrir dice overlay (z-index conflict). */
    if (typeof vEncounter !== 'undefined' && vEncounter.close) vEncounter.close();
    const result = await apiCallRetry('/api/prologue/distract');
    choices.distract = result;
    showDiceRoll(result);
  } catch (e) {
    showError('Erro no teste de habilidade.', e);
  }
}

function onDistractSuccess() {
  document.getElementById('diceOverlay').classList.remove('active');
  /* FASE C (sessão #11, 2026-05-19) — NPC Living System hooks. */
  try {
    if (typeof window._npcMarkVisit === 'function') {
      window._npcMarkVisit('thorne', 'prologue_save');
      window._npcRemember('thorne', 'rescued_from_wolves', true);
      window._npcUnlockDialogue('thorne', 'gossip_prologue_rescue');
    }
    if (typeof window._applyRenownDelta === 'function') {
      window._applyRenownDelta('market', +3);
    }
  } catch (e) { console.warn('[PROLOGUE] NPC living hook err:', e); }
  _renderScene(_sceneAftermath);
}

async function onDistractFail() {
  document.getElementById('diceOverlay').classList.remove('active');
  await doFight();
}

function onAftermathDone() {
  _renderScene(_sceneGate);
}

var _gateChoiceMade = false;
async function onGateChoice(key) {
  if (_gateChoiceMade) return;
  const inter = DATA.interaction || {};
  /* #85 (user, #8): opção de lore COM teste de dados D&D. Servidor é a autoridade
     — rola o d20 e escolhe success/fail. Fluxo espelha onCompanionHealChoice:
     fecha o encounter → mostra o d20 3D (_showSkillDiceThen) → showGateResult. */
  const chosen = (inter.options || []).find(function (o) { return o.key === key; });
  if (chosen && chosen.check) {
    _gateChoiceMade = true;
    choices.gate_choice = key;
    choices.interaction_type = inter.type || 'lore';
    try {
      const result = await apiCall('/api/prologue/lore_check', { option_key: key });
      if (!result || result.error) {
        _gateChoiceMade = false;
        showError('Erro ao resolver o teste: ' + (result && result.error || 'desconhecido'));
        return;
      }
      /* 2026-06-11: sem await — não-crítico, não bloquear (ver onRoadChoice) */
      _saveChoiceServer('gate', key);
      _saveChoiceServer('interaction_type', choices.interaction_type);
      const _eff = result.effect || (result.xp ? '+' + result.xp + ' XP' : '');
      /* Narrativa pós-escolha (PADRAO_ALDRIC) com o script do outcome + recompensa. */
      const _finishLore = function () {
        _renderScene(function () { return _sceneLoreOutcome(result.script, _eff); });
      };
      if (typeof vEncounter !== 'undefined' && vEncounter.close) vEncounter.close();
      if (result.rolled) { _showSkillDiceThen(result.rolled, _finishLore); }
      else { _finishLore(); }
    } catch (e) {
      _gateChoiceMade = false;
      showError('Erro ao resolver o teste de lore.', e);
    }
    return;
  }
  _gateChoiceMade = true;
  choices.gate_choice = key;
  choices.interaction_type = DATA.interaction?.type || 'gate';
  /* 2026-06-11: sem await — não-crítico, não bloquear (ver onRoadChoice) */
  _saveChoiceServer('gate', key);
  _saveChoiceServer('interaction_type', choices.interaction_type);
  /* #85 (#8): lore SEM teste (ex.: feed/ignore) — renderiza a narrativa pós-escolha
     (PADRAO_ALDRIC) com o script do outcome, depois segue para os portões. */
  if (inter.type === 'lore' && inter.outcomes) {
    const outcome = inter.outcomes[key] || {};
    let eff = '';
    if (outcome.gold) { const sign = outcome.gold > 0 ? '+' : ''; eff = `${sign}${outcome.gold} Valdoritas`; }
    else if (outcome.xp) { eff = '+' + outcome.xp + ' XP'; }
    if (typeof vEncounter !== 'undefined' && vEncounter.close) vEncounter.close();
    _renderScene(function () { return _sceneLoreOutcome(outcome.script, eff); });
    return;
  }
  /* Gate clássico (guarda) — mantém o result overlay. */
  const gateTexts = {
    refuge: { text: 'O guarda te analisa de cima a baixo e te deixa passar, mas não sem uma inspeção.', effect: 'Inspeção nos portões' },
    bribe: { text: 'O guarda pega as moedas rapidamente. "Um cidadão exemplar. A cidade lhe dá as boas-vindas."', effect: '<span class="vi vi-coin sm"></span> Taxa de entrada paga' },
    intimidate: { text: 'O guarda mais velho não hesita — a coronha da lança acerta seu estômago. A dor acende algo dentro de você.', effect: 'Entrada pela força' },
  };
  const g = gateTexts[key] || { text: 'Você entra na cidade.', effect: '' };
  if (typeof vEncounter !== 'undefined' && vEncounter.close) vEncounter.close();
  showGateResult(g.text, g.effect, () => { onEnterCity(); });
}

/* #85 (user, #8): cena de narrativa pós-escolha de evento de lore. Renderiza o
   script do outcome (PADRAO_ALDRIC) + a recompensa, com a imagem do sujeito. */
function _sceneLoreOutcome(scriptSegs, effectText) {
  const inter = DATA.interaction || {};
  let segs = (Array.isArray(scriptSegs) && scriptSegs.length)
    ? scriptSegs.slice()
    : [{ type: 'narration', text: 'Você segue em frente.' }];
  if (effectText) {
    /* 2026-06-11 (user, bug grotesco): antes cravava `<b style="color:...">` em
       narração e o sanitizer ESCAPAVA → vazava `<b style=...>` como texto. Agora
       script item estruturado de recompensa (efeito ornamentado pelo renderer). */
    segs = segs.concat([{ type: 'reward', effect: effectText }]);
  }
  return {
    npc: {
      name: (inter.title || 'O Caminho').toUpperCase(),
      desc: inter.context || '',
      portrait: inter.subject_image || ''
    },
    script: segs,
    choices: [{ id: 'continue', label: 'Seguir para os Portões', cb: '__local_lore_outcome_done' }]
  };
}

var _enteringCity = false;
async function onEnterCity() {
  /* 2026-06-12 (user): guard de double-fire. A 2ª chamada de /complete batia 401
     (sessão de prólogo já consumida pela 1ª) e disparava o reconnect+close.
     Uma vez iniciada a entrada na cidade, NUNCA re-disparar. */
  if (_enteringCity) return;
  _enteringCity = true;
  try {
    /* 2026-06-11: overlay persistente + retry transiente — mesma família do
       doFight (a transição prólogo→cidade tinha o mesmo gap: contentCheck
       '#viewport' auto-escondia e o /complete não re-tentava em stall). */
    _showTransitionOverlay('Os portões de Valdoria se aproximam…');
    const body = {
      gate_choice: choices.gate_choice || '',
      interaction_type: choices.interaction_type || 'gate',
      aftermath_only: MODE === 'aftermath',
    };
    if (choices.distract) body.distract = choices.distract;
    const result = await apiCallRetry('/api/prologue/complete', body);
    if (result && result.game_url) {
      window.__valdoria_transitioning = true;
      try { if (window.vProcessing && vProcessing.setText) vProcessing.setText('Entrando na cidade…'); } catch (e2) {}
      valdoriaSpaNav(result.game_url);
      /* overlay fica — cobre o download da cidade */
    } else {
      /* 2026-06-12 (user): NUNCA fechar o WebApp sozinho. Sem game_url (raro — o
         server retorna 503 nesse caso, que cai no catch), mostra erro c/ retry em
         vez de fechar o app pelo Telegram (que era o "encerrou sozinho"). */
      _enteringCity = false;
      try { if (window.vProcessing) vProcessing.hide(); } catch (e3) {}
      showError('Não foi possível entrar na cidade agora. Toque para tentar de novo.');
    }
  } catch (e) {
    /* erro definitivo (rede/serv): libera o guard p/ o jogador re-tentar; NUNCA
       fecha o WebApp. */
    _enteringCity = false;
    try { if (window.vProcessing) vProcessing.hide(); } catch (e4) {}
    showError('Erro ao entrar na cidade. Toque para tentar de novo.', e);
  }
}

/* ============================================================================
 * Reroll + Lore overlay (kept — drawer-style sub-screen)
 * ============================================================================ */
async function doReroll() {
  if (rerollsLeft <= 0) return;
  try {
    const result = await apiCall('/api/prologue/reroll');
    DATA.lore = result.lore;
    DATA.interaction = result.interaction;
    rerollsLeft = result.rerolls_left ?? (rerollsLeft - 1);
    /* Re-render intro com nova lore */
    _renderScene(_sceneIntro);
    if (rerollsLeft === 0) _showLastRerollPopup();
  } catch (e) {
    showError('Erro ao sortear nova origem.', e);
  }
}

function _showLastRerollPopup() {
  if (!document.getElementById('reroll-limit-style')) {
    var st = document.createElement('style');
    st.id = 'reroll-limit-style';
    st.textContent =
      '#reroll-limit-overlay{position:fixed;inset:0;z-index:10500;background:rgba(0,0,0,0.85);'
      + '  display:flex;align-items:center;justify-content:center;padding:16px;'
      + '  animation:rrFadeIn 0.4s ease-out}'
      + '@keyframes rrFadeIn{from{opacity:0}to{opacity:1}}'
      + '.rr-card{background:linear-gradient(180deg,#3a2e22,#2a2218);'
      + '  border:1px solid rgba(196,149,58,0.6);border-radius:12px;'
      + '  max-width:380px;width:100%;padding:22px;text-align:center;'
      + '  box-shadow:0 12px 40px rgba(0,0,0,0.7),0 0 30px rgba(196,149,58,0.15)}'
      + '.rr-icon{font-size:36px;margin-bottom:12px;color:#c4953a;'
      + '  text-shadow:0 0 12px rgba(196,149,58,0.5)}'
      + '.rr-title{font-family:Cinzel,serif;color:#c4953a;font-size:16px;'
      + '  font-weight:700;letter-spacing:1.5px;margin:0 0 12px;text-transform:uppercase;'
      + '  text-shadow:0 0 8px rgba(196,149,58,0.4)}'
      + '.rr-text{color:#d4c8b0;font-size:14px;line-height:1.6;margin-bottom:18px;'
      + '  padding:10px 12px;background:rgba(0,0,0,0.18);border-left:2px solid rgba(196,149,58,0.4);'
      + '  border-radius:0 4px 4px 0;text-align:left;font-style:italic}'
      + '.rr-btn{padding:14px 28px;background:linear-gradient(180deg,#c4953a,#9a7530);'
      + '  border:1px solid #c4953a;border-radius:8px;color:#1a1510;'
      + '  font-family:Cinzel,serif;font-size:14px;font-weight:700;'
      + '  letter-spacing:1px;cursor:pointer;text-transform:uppercase;'
      + '  min-width:160px;min-height:48px;'
      + '  box-shadow:0 3px 12px rgba(196,149,58,0.3);'
      + '  transition:transform 0.1s,background 0.15s}'
      + '.rr-btn:hover{background:linear-gradient(180deg,#d4a54a,#a78540)}'
      + '.rr-btn:active{transform:scale(0.97)}';
    document.head.appendChild(st);
  }
  var ov = document.createElement('div');
  ov.id = 'reroll-limit-overlay';
  ov.innerHTML =
    '<div class="rr-card">'
    + '  <div class="rr-icon"></div>'
    + '  <h3 class="rr-title">Última Sortida</h3>'
    + '  <p class="rr-text">Esta foi a sua última oportunidade de sortear uma nova origem. '
    + 'O destino agora se firmou — mesmo que não goste do resultado, terá que seguir adiante '
    + 'com a história que o dado escolheu.</p>'
    + '  <button class="rr-btn">Entendido</button>'
    + '</div>';
  document.body.appendChild(ov);
  ov.querySelector('.rr-btn').addEventListener('click', function() {
    haptic('medium');
    ov.remove();
  });
}

/* SPA cleanup hook */
if (!window._spaCleanupFns) window._spaCleanupFns = [];
window._spaCleanupFns.push(function() {
  var ids = ['reroll-limit-overlay', 'reroll-limit-style'];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });
  /* Close encounter overlay on SPA exit */
  if (typeof vEncounter !== 'undefined' && vEncounter.close) {
    try { vEncounter.close(); } catch (e) {}
  }
});

function openLoreOverlay() {
  const l = DATA.lore || {};
  const c = DATA.character || {};
  const fullName = `${c.name || ''} ${c.surname || ''}`.trim();
  const body = document.getElementById('loreOverlayBody');
  if (!body) return;
  var pages = (l.pages && Array.isArray(l.pages) && l.pages.length) ? l.pages
              : [l.intro_text || 'Nenhuma história disponível.'];
  var curPage = 0;
  function _renderPage() {
    var pageHtml = pages[curPage] || '';
    body.innerHTML =
      '<div class="prol-card" style="height:100%;">'
      + '  <div class="prol-header">'
      + '    <div class="prol-portrait prol-portrait-orb"></div>'
      + '    <div class="prol-meta">'
      + '      <h3 class="prol-name">' + (l.title || 'Sua Origem') + '</h3>'
      + '      <p class="prol-desc">' + _escapeHtml(fullName) + '</p>'
      + '    </div>'
      + '    <div class="prol-page-ind">' + (curPage + 1) + ' / ' + pages.length + '</div>'
      + '  </div>'
      + '  <div class="prol-body" style="overflow-y:auto;">'
      + '    <div class="prol-line prol-narration" style="--reveal-dur:1200ms;">'
      + pageHtml.replace(/\n\n/g, '<br><br>')
      + '    </div>'
      + '  </div>'
      + '  <div class="prol-actions" style="flex-direction:row;gap:6px;">'
      + '    <button class="prol-btn" id="lore-prev"' + (curPage === 0 ? ' disabled' : '') + '>← Anterior</button>'
      + (curPage < pages.length - 1
          ? '    <button class="prol-btn prol-btn-primary" id="lore-next">Próximo →</button>'
          : '    <button class="prol-btn prol-btn-primary" id="lore-close">✓ Entendido</button>')
      + '  </div>'
      + '</div>';
    var prevBtn = body.querySelector('#lore-prev');
    var nextBtn = body.querySelector('#lore-next');
    var closeBtn = body.querySelector('#lore-close');
    if (prevBtn) prevBtn.onclick = function() { if (curPage > 0) { curPage--; haptic('light'); _renderPage(); } };
    if (nextBtn) nextBtn.onclick = function() { if (curPage < pages.length - 1) { curPage++; haptic('light'); _renderPage(); } };
    if (closeBtn) closeBtn.onclick = function() { haptic('medium'); closeLoreOverlay(); };
  }
  function _escapeHtml(s) { if (typeof vEsc === 'function') return vEsc(s); return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  _renderPage();
  vDrawer.open('loreOverlay');
}

function closeLoreOverlay() {
  haptic();
  vDrawer.close('loreOverlay');
}

/* ============================================================================
 * Anti-cheat: persiste escolha server-side IMEDIATAMENTE
 * ============================================================================ */
async function _saveChoiceServer(choiceType, choiceValue) {
  try {
    await apiCall('/api/prologue/save_choice', { choice_type: choiceType, choice_value: choiceValue });
  } catch (e) {
    console.warn('[PROLOGUE] save_choice failed for ' + choiceType + '=' + choiceValue + ':', e);
  }
}

/* ============================================================================
 * Loading helpers
 * ============================================================================ */
function _hideAllLoadings() {
  try { if (window._prologueInitLoading && window._prologueInitLoading.hide) window._prologueInitLoading.hide(); } catch (e) {}
  try { if (window.vProcessing && window.vProcessing.hide) window.vProcessing.hide(); } catch (e) {}
  try { if (typeof window.hideLoading === 'function') window.hideLoading(); } catch (e) {}
  try {
    var _ld = document.getElementById('loading');
    if (_ld) { _ld.classList.add('hidden'); _ld.style.display = 'none'; }
  } catch (e) {}
}

/* ============================================================================
 * boot — entry point + resume logic via saved_choices
 * ============================================================================ */
async function boot() {
  if (!TOKEN || !API_BASE || !USER_ID) {
    _hideAllLoadings();
    showError('Parâmetros inválidos. Feche e tente novamente.');
    return;
  }
  try {
    /* mode/show_preface viajam no body p/ a recuperação server-side (WebApp
       Token Resilience): se o token efêmero morreu num restart, o server
       reconstrói a sessão do prólogo a partir do DB usando estes parâmetros.
       2026-06-11: retry transiente (init é read-only — seguro re-tentar). */
    DATA = await apiCallRetry('/api/prologue/init', { mode: MODE, show_preface: SHOW_PREFACE });
    _hideAllLoadings();
    /* 2026-06-12 (user): TODO o prólogo (incluindo o aftermath pós-combate) usa
       o tema FLORESTA — a estrada/lobos acontecem na floresta. Antes tocava
       'prologue', e ao voltar do combate a música de VITÓRIA persistia (resume
       do combate). `_ensureForestMusic()` (chamado também em _renderScene) força
       floresta em toda cena/diálogo — crossfade idempotente sobre victory. */
    _ensureForestMusic();

    var sc = (DATA && DATA.saved_choices) || {};
    if (sc.gate_choice) choices.gate_choice = sc.gate_choice;
    if (sc.interaction_type) choices.interaction_type = sc.interaction_type;
    if (sc.road_choice) choices.road_choice = sc.road_choice;
    if (sc.distract_result) choices.distract = sc.distract_result;

    if (DATA.mode === 'aftermath') {
      /* Tarefa A (sessao #86): se o personagem caiu a 0 PV mas venceu, a curandeira
         errante (Maela) aparece ANTES do fluxo normal. DATA.death_healer so vem
         preenchido quando downed (gate server-side) -> o caso comum (sobreviveu)
         nao e afetado. A escolha "Levantar-se" segue pro fluxo Brenn/aftermath. */
      if (DATA.death_healer) {
        console.info('[PROLOGUE] mode=aftermath: player downed → death healer scene');
        _renderScene(_sceneDeathHealer);
        return;
      }
      /* Sessao #37 v19 (2026-05-25): novo flow — injured companion FIRST
         (se ainda nao foi feita a escolha), depois aftermath canonical. */
      if (sc.brenn_choice) {
        /* Ja escolheu — pula direto pra aftermath */
        console.info('[PROLOGUE] resume: brenn ja curado (' + sc.brenn_choice + ') → aftermath');
        _renderScene(_sceneAftermath);
      } else {
        console.info('[PROLOGUE] mode=aftermath → injured companion scene');
        _renderScene(_sceneInjuredCompanion);
      }
      return;
    }

    /* Resume logic — anti-cheat: NUNCA re-rola dice. */
    if (sc.distract_result && sc.distract_result.success && !sc.gate_choice) {
      console.info('[PROLOGUE] resume: distract success → injured_companion');
      /* Sessao #37 v19: distract success tambem ganha cena do Brenn */
      if (sc.brenn_choice) {
        _renderScene(_sceneAftermath);
      } else {
        _renderScene(_sceneInjuredCompanion);
      }
      return;
    }
    if (sc.distract_result && sc.distract_result.success === false) {
      console.info('[PROLOGUE] resume: distract fail → fight (forced)');
      _renderScene(_sceneRoad);
      setTimeout(function() { doFight(); }, 600);
      return;
    }
    if (DATA.show_preface) {
      _renderScene(_scenePreface);
    } else {
      // 2026-06-12 (user): sem escolha de origem — direto à narrativa (origem aleatória
      // já atribuída na criação). Pula o _sceneIntro.
      _renderScene(_sceneRoad);
    }
  } catch (e) {
    _hideAllLoadings();
    showError('Erro ao carregar prólogo. Feche e tente novamente.', e);
  }
}

boot();

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

function showError(msg, err) {
  console.error('[PROLOGUE]', msg, err || '');
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML = '<div style="background:#2a2218;border:1px solid #c4953a;padding:24px;border-radius:12px;max-width:380px;color:#d4c8b0;text-align:center">'
    + '<div style="color:#c02020;font-size:32px;margin-bottom:8px">⚠️</div>'
    + '<p style="margin:0 0 16px">' + msg + '</p>'
    + '<button style="padding:10px 24px;background:#c4953a;color:#1a1510;border:none;border-radius:6px;font-weight:bold;cursor:pointer" onclick="this.closest(\'div\').parentElement.remove()">Fechar</button>'
    + '</div>';
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
        '<span style="color:var(--v-success);font-weight:700">✨ +50 XP</span>'
      );
      actions.innerHTML = `<button class="cenario-btn" onclick="haptic('medium'); onDistractSuccess()">🗣️ Falar com o ferreiro</button>`;
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
      actions.innerHTML = `<button class="v-skip-btn" id="distractFailSkip">⚔️ Lutar!</button>`;
      const failDelay = typeof calcReadTime === 'function' ? calcReadTime(narrative.textContent, 'overlay') : 2500;
      setTimeout(() => {
        if (!_failDone) {
          const skipBtn = document.getElementById('distractFailSkip');
          if (skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = goFight; }
        }
      }, 500);
      setTimeout(goFight, failDelay);
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
        '<span style="color:var(--v-success);font-weight:700">✨ +50 XP</span>';
      actions.innerHTML = `<button class="cenario-btn" onclick="haptic('medium'); onDistractSuccess()">🗣️ Falar com o ferreiro</button>`;
    } else {
      narrative.innerHTML = 'Você tenta assustar os lobos, mas o líder da matilha não se intimida. ' +
        'Ele rosna e avança! Não há outra opção — é lutar ou morrer!';
      let _failDone = false;
      const goFight = () => { if (_failDone) return; _failDone = true; haptic('heavy'); onDistractFail(); };
      actions.innerHTML = `<button class="v-skip-btn" id="distractFailSkipFb">⚔️ Lutar!</button>`;
      const fbDelay = typeof calcReadTime === 'function' ? calcReadTime(narrative.textContent, 'overlay') : 2500;
      setTimeout(() => {
        if (!_failDone) {
          const skipBtn = document.getElementById('distractFailSkipFb');
          if (skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = goFight; }
        }
      }, 500);
      setTimeout(goFight, fbDelay);
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
  const text = DATA.preface_text || 'Boas vindas a Eldoria!';
  return {
    npc: { name: 'Boas-Vindas a Eldoria', desc: 'O início da sua jornada', portrait: '' },
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
  const rerollLabel = rerollsLeft > 0 ? `🎲 Sortear Outra (${rerollsLeft})` : '🎲 Limite atingido';
  /* Script combina lore intro + classe info como 2 estrofes narrativas. */
  const charLine = (c.class_label || '') + ' · ' + (c.race || '') + ' · Nível ' + (c.level || 1);
  const script = [
    { type: 'narration', text: '<i>' + (l.title || 'Sua Origem') + '</i> — ' + (l.description || '') },
    { type: 'narration', text: 'As origens criam escolhas e eventos diferentes durante a jornada.' }
  ];
  const choices = [
    { id: 'origem', label: '📜 Ver Origem', cb: '__local_lore' }
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
      { id: 'fight', label: '⚔️ Lutar contra os lobos!', cb: '__local_road_fight' },
      { id: 'distract', label: '🛡️ Criar uma distração', cb: '__local_road_distract' }
    ]
  };
}

/* Cena AFTERMATH: Thorne, o ferreiro, agradece por salvar seu filho. */
function _sceneAftermath() {
  const text = DATA.aftermath_text || '';
  /* Parse aspas → cada quote vira speech bubble; resto vira narration. */
  const script = [];
  const quoteRegex = /([""'']|<i>['"])(.+?)(['""'']|['"]<\/i>)/g;
  let lastIdx = 0;
  let match;
  let foundAny = false;
  while ((match = quoteRegex.exec(text)) !== null) {
    foundAny = true;
    const preText = text.slice(lastIdx, match.index).trim();
    if (preText) script.push({ type: 'narration', text: preText });
    script.push({ type: 'speech', speaker: 'Thorne, o Ferreiro', text: match[2] });
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
      name: 'Thorne, o Ferreiro',
      desc: 'Salvo dos lobos, agradecido',
      portrait: '../shared/img/npcs/thorne-armeiro.png'
    },
    script: script,
    choices: [
      { id: 'continuar', label: '🏰 Seguir para os Portões', cb: '__local_aftermath_done' }
    ]
  };
}

/* Cena GATE: interação com guarda no portão da cidade. N options dinâmicas. */
function _sceneGate() {
  const inter = DATA.interaction || {};
  const title = inter.title || 'Portões de Valdória';
  const text = inter.text || 'Você chega aos portões. O guarda barra sua passagem.';
  const options = inter.options || [];
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
  return {
    npc: {
      name: title.toUpperCase(),
      desc: 'Os portões de Valdória',
      portrait: ''
    },
    script: [
      { type: 'narration', text: text }
    ],
    choices: choices
  };
}

/* ============================================================================
 * Scene dispatcher — single source pra abrir cada cena via vEncounter
 * ============================================================================ */
function _renderScene(sceneFn) {
  if (typeof vEncounter === 'undefined' || !vEncounter.render) {
    showError('PADRAO_ALDRIC engine não carregada.');
    return;
  }
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
  } else if (cb === '__local_aftermath_done') {
    onAftermathDone();
  } else if (cb.indexOf('__local_gate:') === 0) {
    const key = cb.slice('__local_gate:'.length);
    onGateChoice(key);
  } else {
    console.warn('[PROLOGUE] Unknown choice cb:', cb);
  }
}

/* ============================================================================
 * Handlers — bridge entre vEncounter choices e API/transitions
 * ============================================================================ */
function onPrefaceDone() {
  _renderScene(_sceneIntro);
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
  await _saveChoiceServer('road', key);
  if (key === 'fight') {
    await doFight();
  } else {
    await doDistract();
  }
}

async function doFight() {
  try {
    if (window._prologueInitLoading) {
      window._prologueInitLoading.show();
    } else {
      var _ld = document.getElementById('loading');
      if (_ld) { _ld.style.display = 'flex'; _ld.classList.remove('hidden'); }
    }
    const result = await apiCall('/api/prologue/fight', {});
    if (result.combat_url || result.arena_url) {
      window.__valdoria_transitioning = true;
      /* Close encounter overlay antes da transição (UX limpo) */
      if (typeof vEncounter !== 'undefined' && vEncounter.close) vEncounter.close();
      valdoriaSpaNav(result.combat_url || result.arena_url);
    } else {
      showError('Erro ao iniciar combate.');
    }
  } catch (e) {
    showError('Erro ao iniciar combate.', e);
  }
}

async function doDistract() {
  try {
    /* Fecha encounter antes de abrir dice overlay (z-index conflict). */
    if (typeof vEncounter !== 'undefined' && vEncounter.close) vEncounter.close();
    const result = await apiCall('/api/prologue/distract');
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

async function onGateChoice(key) {
  choices.gate_choice = key;
  choices.interaction_type = DATA.interaction?.type || 'gate';
  await _saveChoiceServer('gate', key);
  await _saveChoiceServer('interaction_type', choices.interaction_type);
  const inter = DATA.interaction || {};
  let outcomeText = '';
  let effectText = '';
  if (inter.type === 'lore' && inter.outcomes) {
    const outcome = inter.outcomes[key] || {};
    outcomeText = outcome.text || 'Você avança para a cidade.';
    if (outcome.gold) { const sign = outcome.gold > 0 ? '+' : ''; effectText = `${sign}${outcome.gold} GP`; }
  } else {
    const gateTexts = {
      refuge: { text: 'O guarda te analisa de cima a baixo e te deixa passar, mas não sem uma inspeção.', effect: '⚠️ Inspeção nos portões' },
      bribe: { text: 'O guarda pega as moedas rapidamente. "Um cidadão exemplar. A cidade lhe dá as boas-vindas."', effect: '<span class="vi vi-coin sm"></span> Taxa de entrada paga' },
      intimidate: { text: 'O guarda mais velho não hesita — a coronha da lança acerta seu estômago. A dor acende algo dentro de você.', effect: '⚡ Entrada pela força' },
    };
    const g = gateTexts[key] || { text: 'Você entra na cidade.', effect: '' };
    outcomeText = g.text;
    effectText = g.effect;
  }
  /* Close encounter antes de mostrar result overlay (z-index) */
  if (typeof vEncounter !== 'undefined' && vEncounter.close) vEncounter.close();
  showGateResult(outcomeText, effectText, () => { onEnterCity(); });
}

async function onEnterCity() {
  try {
    if (window._prologueInitLoading) {
      window._prologueInitLoading.show();
    } else {
      var _ld2 = document.getElementById('loading');
      if (_ld2) { _ld2.style.display = 'flex'; _ld2.classList.remove('hidden'); }
    }
    const body = {
      gate_choice: choices.gate_choice || '',
      interaction_type: choices.interaction_type || 'gate',
      aftermath_only: MODE === 'aftermath',
    };
    if (choices.distract) body.distract = choices.distract;
    const result = await apiCall('/api/prologue/complete', body);
    if (result && result.game_url) {
      window.__valdoria_transitioning = true;
      valdoriaSpaNav(result.game_url);
    } else {
      if (window.Telegram && Telegram.WebApp) {
        window.__valdoria_transitioning = true;
        valdoriaSpaClose();
      }
    }
  } catch (e) {
    showError('Erro ao entrar na cidade.', e);
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
    + '  <div class="rr-icon">🎲</div>'
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
      + '      <h3 class="prol-name">📜 ' + (l.title || 'Sua Origem') + '</h3>'
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
  function _escapeHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
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
    DATA = await apiCall('/api/prologue/init');
    _hideAllLoadings();
    if (typeof ValdoriaAudio !== 'undefined') ValdoriaAudio.play('prologue');

    var sc = (DATA && DATA.saved_choices) || {};
    if (sc.gate_choice) choices.gate_choice = sc.gate_choice;
    if (sc.interaction_type) choices.interaction_type = sc.interaction_type;
    if (sc.road_choice) choices.road_choice = sc.road_choice;
    if (sc.distract_result) choices.distract = sc.distract_result;

    if (DATA.mode === 'aftermath') {
      _renderScene(_sceneAftermath);
      return;
    }

    /* Resume logic — anti-cheat: NUNCA re-rola dice. */
    if (sc.distract_result && sc.distract_result.success && !sc.gate_choice) {
      console.info('[PROLOGUE] resume: distract success → aftermath');
      _renderScene(_sceneAftermath);
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
      _renderScene(_sceneIntro);
    }
  } catch (e) {
    _hideAllLoadings();
    showError('Erro ao carregar prólogo. Feche e tente novamente.', e);
  }
}

boot();

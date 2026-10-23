/* ============================================================================
 * journey-runner.js — PADRAO_VIAGEM: o ÚNICO sistema de viagem (cidade↔exploração)
 * ============================================================================
 * Sessão #90 (2026-06-15, user): "dois sistemas de viagem não fazem o menor
 * sentido". Antes a IDA (cidade→local) usava o v13 inline em cidade.html
 * (vEncounter) e a VOLTA (exploração→cidade) usava o #journey-overlay LEGADO em
 * exploracao.html — mesmos DADOS, renderizadores DIFERENTES. Este módulo extrai
 * a orquestração+render para UM lugar compartilhado, usado pelas DUAS direções.
 *
 * SINGLE-SOURCE máximo: usa o canônico já compartilhado —
 *   - window.JourneyData  : dados (HAZARDS/SAFE/DEPARTURES) + lógica (pickFresh*,
 *                            resolveJourneyCheck = DndRules ODDS IGUAIS,
 *                            successPctForChoice, pickNarrative, RISK_CHANCE).
 *   - window.vEncounter   : render PADRAO_ALDRIC (shared/encounter-popup.js).
 *   - window.Dice3D/THREE : dado 3D canônico.
 *   - window.DndRules     : statLabel (PT-BR).
 * Nada de matemática de check inline aqui (a cidade duplicava _statBaseForClass/
 * _classHasSkillProficiency — REMOVIDO; agora delega a JourneyData/DndRules).
 *
 * API (window.JourneyRunner):
 *   start(opts) — inicia a viagem. opts:
 *     biome        : bioma do TERRENO (p/ hazards). Ida: bioma do destino.
 *                    Volta: bioma atual de onde o jogador parte.
 *     displayName  : nome do DESTINO ("Campos Verdes" / "Valdoria").
 *     player       : () => objeto vivo do jogador (HP/stats/cls/level).
 *     onArrive     : (biome, displayName) => fim da viagem. O caller decide o
 *                    destino real (ida: playTravelAnimation+redirect p/ exploração;
 *                    volta: ExploracaoAPI.finish()+redirect p/ cidade).
 *     onCancel     : () => cancelou na confirmação (volta ao mapa).
 *     onDefeat     : () => o CALLER decide a morte (exploração: triggerDefeat —
 *                    derrota real + servidor). SEM ele = cidade-mock revive a 1/4 HP.
 *     confirm      : false desliga o popup de confirmação (default: mostra).
 *     totalSteps   : nº de etapas (default 3-5 aleatório).
 *     log          : (msg) => log. audioBiome: true toca trilha do bioma.
 *     refreshHud   : () => atualiza HUD após dano. toast: (msg,type) => aviso.
 *   isActive() — true se há viagem em andamento.
 *
 * MAPA_IA: start · _confirm · _departure · _step · _renderStep · _safe ·
 *   _renderContinue(continuar/chegar) · _resolve · _dice(popup d20) ·
 *   _outcome(narrativa+dano+morte) · _arrive · _close
 * ============================================================================ */
(function (global) {
  'use strict';

  var _j = null;  // estado da viagem ativa

  function _player() { try { return (_j && _j.opts.player && _j.opts.player()) || {}; } catch (e) { return {}; } }
  function _log(m) { try { if (_j && typeof _j.opts.log === 'function') _j.opts.log(m); } catch (e) {} }
  var JD = function () { return global.JourneyData || {}; };

  function start(opts) {
    if (_j) { _log('journey already active — ignorando start'); return; }
    opts = opts || {};
    var biome = opts.biome || 'plains';
    var total = opts.totalSteps || (3 + Math.floor(Math.random() * 3));  // 3-5 trechos
    var distTotal = total * 3;
    var prevTrack = (global.ValdoriaAudio && typeof ValdoriaAudio.getCurrentTrack === 'function')
      ? ValdoriaAudio.getCurrentTrack() : null;
    _j = { opts: opts, biome: biome, displayName: opts.displayName || 'destino',
           total: total, step: 0, distTotal: distTotal, distRemaining: distTotal,
           usedHaz: [], usedSafe: [], prevTrack: prevTrack, weather: null };
    if (opts.confirm === false) {
      _showMarcoTutorial(function () { _departure(); });
    } else {
      _confirm();
    }
  }

  // Verifica se o jogador já viu a introdução aos Marcos de Valdoria (Ordem do Usuário 2026-10)
  function _hasSeenMarcoTutorial() {
    try {
      if (localStorage.getItem('valdoria_seen_marcos_lore') === '1') return true;
    } catch (_) {}
    var p = _player();
    return !!(p && (p.seen_marcos_lore || p.corvus_route_knowledge));
  }

  function _markSeenMarcoTutorial() {
    try { localStorage.setItem('valdoria_seen_marcos_lore', '1'); } catch (_) {}
    var p = _player();
    if (p) p.seen_marcos_lore = true;
  }

  // Janela explicativa instrutiva na 1ª vez que o jogador lida com a medida dos Marcos (Ordem do Usuário 2026-10)
  function _showMarcoTutorial(proceedCb) {
    if (_hasSeenMarcoTutorial()) {
      if (typeof proceedCb === 'function') proceedCb();
      return;
    }

    var scriptLines = [
      {
        type: 'narration',
        text: 'Antes de cruzar os portões rumo às terras ermas, você consulta seus registros de navegação e as cartas terrestres do Conservatório de Valdoria. Nas velhas crônicas falava-se em "léguas" ou "passos", mas neste território a sobrevivência depende de uma medida própria: <b>os Marcos de Valdoria</b>.'
      },
      {
        type: 'narration',
        text: '<b>A Medida Oficial das Estradas: Os Marcos</b><br><br>Em <i>Lendas de Valdoria</i>, as distâncias entre a cidade e os ermos são medidas em <b>Marcos</b>. Cada Marco equivale à distância percorrida em aproximadamente <b>uma hora de marcha contínua e resoluta</b> em terreno plano (~3 milhas / ~4,8 km no D&D 5e), tendo como base as antigas pedras-marco de basalto cravadas nas estradas pelos pioneiros.'
      },
      {
        type: 'narration',
        text: '<b>Por que a Distância é uma Estimativa?</b><br><br><b>• Monólitos Esquecidos:</b> Com o passar dos anos, muitos marcos foram tombados, cobertos por musgo ou partidos por feras. Por isso, a rota informa uma <i>estimativa aproximada de marcos restantes</i> calculada pelo grupo.'
      },
      {
        type: 'narration',
        text: '<b>• Desvios e Relevo:</b> Erros de orientação ou terrenos intransponíveis exigem contornos forçados, adicionando marcos à viagem <b>determinados por rolagem de dados (1d4 a 1d6 marcos adicionais)</b> e atraindo mais perigos.'
      },
      {
        type: 'narration',
        text: '<b>• Atalhos e Perícia:</b> Conselhos de cartógrafos, batedores veteranos ou testes bem-sucedidos de Sobrevivência e Percepção permitem cortar caminho por trilhas ocultas, <b>encurtando a distância calculada nos dados (1d4 a 1d6 marcos a menos)</b>.'
      },
      {
        type: 'narration',
        text: 'Manter o ritmo da marcha e calcular os marcos restantes com cautela é o que separa um retorno em segurança de um destino trágico nas terras selvagens.'
      }
    ];

    _vRender({
      npc: {
        name: 'Compêndio de Cartografia',
        desc: 'Tratado Oficial de Medição e Rotas de Valdoria',
        portrait: '../shared/img/npcs/corvus.webp'
      },
      script: scriptLines,
      choices: [{ id: 'marco_lore_ack', label: 'Compreendido, planejar postura de marcha ▸' }],
      inline: true,
      noProgress: true,
      onChoice: function () {
        _markSeenMarcoTutorial();
        if (typeof proceedCb === 'function') proceedCb();
      }
    });
  }

  // Render de uma "página" no encounter canônico (vEncounter, PADRAO_ALDRIC).
  function _vRender(cfg) {
    if (!(global.vEncounter && typeof global.vEncounter.render === 'function')) {
      _log('WARN: vEncounter ausente — pulando passo');
      if (typeof cfg.onChoice === 'function') cfg.onChoice((cfg.choices && cfg.choices[0]) || {});
      return;
    }
    var prog = null;
    if (!cfg.noProgress && _j && _j.total > 0 && _j.step >= 1) {
      prog = {
        current: _j.step,
        total: _j.total,
        distTotal: _j.distTotal || (_j.total * 3),
        distRemaining: (_j.distRemaining != null) ? _j.distRemaining : Math.max(0, (_j.total - _j.step) * 3),
        distEstimated: (_j.distRemaining != null) ? _j.distRemaining : Math.max(0, (_j.total - _j.step) * 3),
        isDistance: true,
        hideStages: true,
        biome: _j.biome,
        destination: _j.displayName
      };
    }
    global.vEncounter.render(
      {
        npc: cfg.npc || null,
        script: cfg.script || [],
        choices: cfg.choices || [],
        choicesTitle: cfg.choicesTitle || null,
        choicesSubtitle: cfg.choicesSubtitle || null,
        choicesBtnLabel: cfg.choicesBtnLabel || null,
        compact: cfg.compact || false
      },
      {
        player: _player(), showGold: false, fullHeight: true, progress: prog,
        showHp: false, /* #91 (user): remove barra permanente; ficha resumida exibida somente quando houver impacto */
        inlineChoices: cfg.inline === true,
        compact: cfg.compact || false,
        onChoice: function (ch) { if (typeof cfg.onChoice === 'function') cfg.onChoice(ch); }
      }
    );
  }

  // Confirmação antes de viajar (user sessão #90: "não tem popup de confirmação").
  function _confirm() {
    var j = _j; if (!j) return;
    _showMarcoTutorial(function () {
      var p = _player();
      var content = (JD().getConfirmationContent) ? JD().getConfirmationContent(p, j) : null;
      var script = (content && content.script) || [
        { type: 'narration', text: 'Preparar viagem para <b>' + j.displayName + '</b>? A jornada terá ' + j.total + ' etapas — perigos podem surgir no caminho.' }
      ];
      var choices = (content && content.choices) || [
        { id: 'jrn_go', label: 'Confirmar viagem' },
        { id: 'jrn_cancel', label: 'Cancelar' }
      ];
      _vRender({
        script: script,
        choices: choices,
        choicesTitle: (content && content.choicesTitle) || 'Preparação de Viagem',
        choicesSubtitle: (content && content.choicesSubtitle) || (j.displayName ? ('Rumo a ' + j.displayName) : ''),
        choicesBtnLabel: 'Escolher Postura de Viagem',
        compact: true,
        inline: false,
        noProgress: true,
        onChoice: function (ch) {
          if (ch && ch.id === 'jrn_cancel') {
            _cancel();
          } else if (ch && ch.isPrep) {
            _prepStance(ch);
          } else {
            _departure();
          }
        }
      });
    });
  }

  // Postura de viagem especializada escolhida na confirmação (D&D 5e)
  function _prepStance(prepChoice) {
    var j = _j; if (!j) return;
    j.prep = {
      id: prepChoice.id,
      label: prepChoice.label,
      stat: prepChoice.stat,
      advantageOnFirst: true
    };
    var descText = prepChoice.prepText || 'Você assume uma postura de alerta cuidadoso para a jornada.';
    _vRender({
      script: [
        { type: 'narration', text: descText },
        { type: 'narration', text: '<i>Postura ativada:</i> <b>' + prepChoice.label + '</b> — concederá <b>Vantagem</b> contra perigos durante o trajeto.' }
      ],
      choices: [{ id: 'jrn_go_prep', label: 'Iniciar viagem (A caminho)', speech: '"Estamos prontos. É hora de pegar a estrada."', tag: 'PARTIR' }],
      inline: true,
      noProgress: true,
      onChoice: function () { _departure(); }
    });
  }

  function _cancel() {
    var cb = _j && _j.opts.onCancel;
    var prev = _j && _j.prevTrack;
    _close();
    if (prev && global.ValdoriaAudio && typeof ValdoriaAudio.play === 'function') {
      try {
        if (typeof ValdoriaAudio.getCurrentTrack === 'function' && ValdoriaAudio.getCurrentTrack() !== prev) {
          ValdoriaAudio.play(prev);
        }
      } catch (e) { _log('restore music on cancel failed: ' + e.message); }
    }
    if (typeof cb === 'function') { try { cb(); } catch (e) {} }
  }

  // Partida — narração cinematográfica PADRAO_ALDRIC ("Rumo a <destino>").
  function _departure() {
    var j = _j; if (!j) return;
    try {
      if (j.opts.audioBiome && global.ValdoriaAudio && typeof ValdoriaAudio.playBiome === 'function') {
        ValdoriaAudio.playBiome(j.biome);
      }
    } catch (e) { _log('biome music failed: ' + e.message); }
    var p = _player();
    var isGrp = (JD().isParty) ? JD().isParty(p) : false;
    var dep = (JD().pickDeparture) ? JD().pickDeparture(j.biome, p, []) : null;
    var script = (dep || []).map(function (l) {
      var txt = l.text;
      if (JD().adaptPartyNarrative) txt = JD().adaptPartyNarrative(txt, isGrp);
      return { type: l.type || 'narration', text: txt };
    });
    if (!script.length) script = [{ type: 'narration', text: (isGrp ? 'Vocês partem' : 'Você parte') + ' rumo a ' + j.displayName + '.' }];
    if (j.prep && j.prep.label) {
      script.push({ type: 'narration', text: 'Sob a postura de <b>' + j.prep.label + '</b>, a marcha se inicia com foco redobrado.' });
    }
    if (JD().detectWeather) {
      var wDep = JD().detectWeather(script);
      if (wDep) { j.weather = wDep; _log('journey weather updated on departure -> ' + wDep); }
    }
    _vRender({
      script: script, choices: [{ id: 'jrn_partir', label: 'Partir' }],
      inline: true, noProgress: true,
      onChoice: function () { _step(); }
    });
  }

  function _step() {
    var j = _j; if (!j) return;
    j.step++;
    if (j.distRemaining != null) {
      j.distRemaining = Math.max(0, j.distTotal - (j.step * 3));
    }
    if (j.step > j.total || (j.distRemaining != null && j.distRemaining <= 0)) {
      _arrive();
      return;
    }
    _renderStep();
  }

  function _renderStep() {
    var j = _j; if (!j) return;
    // #3 (user 2026-06-16): COMBATE RARO de viagem (emboscada). Só em jornada com
    // opts.onCombat (exploração — combate real). Vence → caller retoma a viagem até
    // o destino; perde → templo (padrão). Nunca na cidade mock (sem onCombat).
    if (typeof j.opts.onCombat === 'function') {
      var rc = (typeof JD().RARE_COMBAT_CHANCE === 'number') ? JD().RARE_COMBAT_CHANCE : 0;
      if (rc > 0 && (Math.random() * 100) < rc) { _rareCombat(); return; }
    }
    var risk = (typeof JD().RISK_CHANCE === 'number') ? JD().RISK_CHANCE : 55;
    var hasHaz = (Math.random() * 100) < risk;
    if (!hasHaz) { _safe(); return; }
    var hz = JD().pickFreshHazard ? JD().pickFreshHazard(j.biome, _player(), j.usedHaz) : null;
    if (!hz) { _safe(); return; }
    // pickFreshHazard já empurra hz.title em j.usedHaz (anti-repeat sessão+24h).
    var p = _player();
    var isGrp = (JD().isParty) ? JD().isParty(p) : false;
    var script = (hz.script || []).map(function (line) {
      if (line.type === 'speech') return { type: 'speech', speaker: (hz.npc && hz.npc.name) || line.speaker || '', text: line.text };
      var txt = line.text;
      if (JD().adaptPartyNarrative) txt = JD().adaptPartyNarrative(txt, isGrp);
      return { type: 'narration', text: txt };
    });
    if (!script.length && hz.narr) {
      var nTxt = (JD().adaptPartyNarrative) ? JD().adaptPartyNarrative(hz.narr, isGrp) : hz.narr;
      script = [{ type: 'narration', text: nTxt }];
    }
    if (hz.speech && hz.npc) script.push({ type: 'speech', speaker: hz.npc.name, text: hz.speech });
    var available = (hz.choices || []).filter(function (ch) {
      return (JD().canTakeChoice) ? JD().canTakeChoice(p, ch) : true;
    });
    var choices = available.map(function (ch, i) {
      var vInfo = (JD().pickChoiceVoice) ? JD().pickChoiceVoice(ch, p, hz) : null;
      var speech = (vInfo && vInfo.speech) || ch.speech || '';
      var tag = (vInfo && vInfo.tag) || ch.tag || ch.badge || '';
      var out = {
        id: 'jrn_ch_' + i,
        label: ch.t,
        desc: ch.desc || '',
        speech: speech,
        tag: tag,
        badge: tag ? ('[' + tag + ']') : '',
        _haz: ch
      };
      if (ch.stat && ch.dc != null) {
        out.dc = ch.dc;
        out.skill = (global.DndRules && DndRules.statLabel) ? DndRules.statLabel(ch.stat) : ch.stat;
        var pc = JD().successPctForChoice ? JD().successPctForChoice(p, ch) : null;
        if (pc != null) out.chance = pc;
      }
      return out;
    });
    _vRender({
      npc: hz.npc || null, script: script, choices: choices,
      inline: choices.length <= 1,
      onChoice: function (ch) { _resolve(hz, (ch && ch._haz) || ch); }
    });
  }

  function _safe() {
    var j = _j; if (!j) return;
    var p = _player();
    var isGrp = (JD().isParty) ? JD().isParty(p) : false;
    var txt = JD().pickFreshSafe ? JD().pickFreshSafe(j.biome, p, j.usedSafe) : null;
    if (txt && JD().adaptPartyNarrative) txt = JD().adaptPartyNarrative(txt, isGrp);
    if (JD().detectWeather && txt) {
      var wSafe = JD().detectWeather(txt);
      if (wSafe) { j.weather = wSafe; _log('journey weather updated on safe -> ' + wSafe); }
    }
    _renderContinue([{ type: 'narration', text: txt || 'O caminho segue tranquilo por mais um trecho.' }]);
  }

  // #3 (user 2026-06-16): emboscada — narração + 1 escolha "Enfrentar". O caller
  // (exploração) salva o resume da viagem e dispara o combate REAL (redireciona).
  // Vence/foge → retoma a viagem até o destino; perde → templo (padrão).
  function _rareCombat() {
    var j = _j; if (!j) return;
    var jinfo = { biome: j.biome, displayName: j.displayName, step: j.step, total: j.total };
    _vRender({
      script: [{ type: 'narration', text: 'Vultos surgem no caminho — uma <b>emboscada</b>! Não há como prosseguir sem lutar.' }],
      choices: [{ id: 'jrn_fight', label: 'Enfrentar' }],
      inline: true,
      onChoice: function () {
        var cb = j.opts.onCombat;
        if (typeof cb === 'function') { try { cb(jinfo); } catch (e) { _log('onCombat failed: ' + e.message); } }
      }
    });
  }

  // Tela "continuar/chegar" — UMA escolha inline. IDÊNTICA ida<->volta (PADRAO_VIAGEM:
  // mesma interface, mínimo trabalho). Sem "Acampar" no caminho (a exploração mantém o
  // descanso pelo botão de acampar normal do mapa) — assim a travessia é 1 toque nas 2 direções.
  function _renderContinue(scriptLines, npc) {
    var j = _j; if (!j) return;
    var distLeft = (j.distRemaining != null) ? j.distRemaining : Math.max(0, (j.total - j.step) * 3);
    var isNear = (distLeft <= 0 || j.step >= j.total);
    var distUnit = (distLeft === 1) ? ' marco' : ' marcos';
    _vRender({
      npc: npc || null,
      script: scriptLines,
      choices: [{ id: 'jrn_cont', label: (isNear ? ('Chegar a ' + j.displayName) : ('Continuar marcha (~' + distLeft + distUnit + ')')) }],
      inline: true,
      onChoice: function () { _step(); }
    });
  }

  // Resolve a escolha: check D&D (JourneyData=DndRules, ODDS IGUAIS) → dado 3D → desfecho.
  function _resolve(hz, ch) {
    var p = _player();
    // COMBATE DIRETO (user 2026-10): se a escolha for combate (isCombat / combat)
    if (ch && (ch.isCombat || ch.combat)) {
      _triggerHazardCombat(hz, ch);
      return;
    }
    var checkOpts = {};
    if (ch && (ch.advantage || ch.adv)) checkOpts.advantage = true;
    if (_j && _j.prep && _j.prep.advantageOnFirst) {
      checkOpts.advantage = true;
      _j.prep.advantageOnFirst = false; // consumido no primeiro teste
    }
    var roll = JD().resolveJourneyCheck ? JD().resolveJourneyCheck(p, ch, checkOpts) : null;
    if (!roll) { _outcome(hz, ch, true, null); return; }
    _dice(roll, function () { _outcome(hz, ch, roll.success, roll); });
  }

  // Combate originado de escolha em perigo/evento de jornada
  function _triggerHazardCombat(hz, ch) {
    var j = _j; if (!j) return;
    var enemyId = (ch && ch.enemyId) || (hz && hz.enemyId) || (hz && hz.npc && hz.npc.enemyId) || 'bandit_leader';
    var jinfo = {
      biome: j.biome,
      displayName: j.displayName,
      step: j.step,
      total: j.total,
      enemyId: enemyId,
      title: (hz && hz.title) || 'Perigo no Caminho',
      isHazardChoice: true
    };
    var foeName = (hz && hz.npc && hz.npc.name) || (hz && hz.title) || 'Inimigos';
    _vRender({
      npc: (hz && hz.npc) || null,
      script: [
        { type: 'narration', text: 'Você desembainha suas armas e assume postura de combate contra <b>' + foeName + '</b>!' }
      ],
      choices: [{ id: 'jrn_fight_now', label: '⚔️ Iniciar combate' }],
      inline: true,
      onChoice: function () {
        var cb = j.opts.onCombat;
        if (typeof cb === 'function') {
          try { cb(jinfo); } catch (e) { _log('onCombat failed: ' + e.message); }
        } else {
          _outcome(hz, ch, true, null);
        }
      }
    });
  }

  // Popup de dado 3D — DOM seguro (createElement/textContent, SEM innerHTML).
  // Roda no MESMO #encounter-overlay aberto pelo vEncounter. Fallback número.
  function _dice(roll, onDone) {
    var ov = document.getElementById('encounter-overlay');
    if (!ov) { onDone(); return; }
    var label = (global.DndRules && DndRules.statLabel) ? DndRules.statLabel(roll.stat) : String(roll.stat || '').toUpperCase();
    var modTotal = (roll.mod || 0) + (roll.prof || 0);
    function _mk(tag, css, txt) {
      var e = document.createElement(tag);
      if (css) e.style.cssText = css;
      if (txt != null) e.textContent = txt;
      return e;
    }
    while (ov.firstChild) ov.removeChild(ov.firstChild);
    var card = document.createElement('div');
    card.className = 'enc-card enc-full';
    card.style.cssText = 'display:flex;flex-direction:column;justify-content:center;text-align:center;padding: var(--v-space-2xl, 24px);';
    card.appendChild(_mk('div', 'font-size:calc(11px * var(--v-font-scale,1));letter-spacing:2px;color:#c4953a;text-transform:uppercase;margin-bottom:6px;', 'Teste de ' + label));
    card.appendChild(_mk('div', 'font-size:calc(13px * var(--v-font-scale,1));color:#f4d896;letter-spacing:1.5px;margin-bottom: var(--v-space-xl, 16px);', 'Classe de Dificuldade ' + roll.dc + '  ·  modificador ' + (modTotal >= 0 ? '+' : '') + modTotal));
    var mount = _mk('div', 'width:160px;height:160px;margin:0 auto 14px;');
    card.appendChild(mount);
    var resEl = _mk('div', 'min-height:52px;font-size:calc(15px * var(--v-font-scale,1));color:#f4d896;letter-spacing:1px;line-height:1.6;');
    card.appendChild(resEl);
    var actEl = _mk('div', 'display:flex;gap: var(--v-space-md-lg, 10px);justify-content:center;margin-top: var(--v-space-xl, 16px);opacity:0;transition:opacity 0.4s;');
    card.appendChild(actEl);
    ov.appendChild(card);
    try { if (typeof ov.showModal === 'function' && !ov.open) ov.showModal(); } catch (_e) {}
    ov.classList.add('active');
    var _done = false;
    function _finish() { if (_done) return; _done = true; if (typeof onDone === 'function') onDone(); }
    function _showResult() {
      while (resEl.firstChild) resEl.removeChild(resEl.firstChild);
      var rollNote = (roll.advantage ? ' com Vantagem (' + roll.rolls.join(', ') + ')' : (roll.disadvantage ? ' com Desvantagem (' + roll.rolls.join(', ') + ')' : ''));
      resEl.appendChild(_mk('div', 'font-size:calc(11px * var(--v-font-scale,1));color:#a09484;letter-spacing:1.5px;margin-bottom:6px;', 'Rolagem d20' + rollNote + ' ' + (modTotal >= 0 ? '+' : '') + modTotal + ' = ' + roll.total + ' vs CD ' + roll.dc));
      var statusTxt = roll.d20 === 20 ? 'ACERTO CRÍTICO!' : roll.d20 === 1 ? 'FALHA CRÍTICA' : (roll.success ? 'Sucesso' : 'Falha');
      var statusColor = roll.success ? '#7ad06b' : '#d85848';
      resEl.appendChild(_mk('div', 'font-size:calc(18px * var(--v-font-scale,1));color:' + statusColor + ';font-weight:700;letter-spacing:2px;font-family:Cinzel,serif;', statusTxt));
      var btn = document.createElement('button');
      btn.className = 'enc-btn enc-btn-primary';
      btn.style.cssText = 'padding: var(--v-space-md, 8px) 22px;';
      btn.textContent = 'Continuar →';
      btn.addEventListener('click', _finish);
      actEl.appendChild(btn);
      actEl.style.opacity = '1';
    }
    setTimeout(function () {
      if (typeof global.Dice3D === 'function' && typeof global.THREE !== 'undefined') {
        try {
          var dice = new global.Dice3D(mount, { size: 156, dieType: 'd20', duration: 1600 });
          dice.roll(roll.d20, _showResult);
          setTimeout(function () { if (!_done && actEl.style.opacity !== '1') _showResult(); }, 5000);
          return;
        } catch (e) { _log('journey Dice3D failed: ' + e.message); }
      }
      mount.appendChild(_mk('div', 'font-size:80px;color:#f4d896;line-height:160px;font-family:Cinzel,serif;', String(roll.d20)));
      setTimeout(_showResult, 700);
    }, 80);
  }

  // Seleciona condição temática com base no perigo ou biome em falhas
  function _pickBiomeHazardCondition(biome, hz, ch) {
    if (ch && ch.condition) return ch.condition;
    var text = (((hz && hz.title) || '') + ' ' + ((ch && (ch.fNarr || ch.desc)) || '')).toLowerCase();
    if (text.indexOf('veneno') !== -1 || text.indexOf('peconha') !== -1 || text.indexOf('picada') !== -1 || text.indexOf('gas') !== -1 || text.indexOf('podre') !== -1 || text.indexOf('esporo') !== -1) {
      return { id: 'poisoned', icon: '🧪', label: 'Envenenado', desc: 'Desvantagem em jogadas de ataque e testes de atributo no mapa hexagonal.' };
    }
    if (text.indexOf('torc') !== -1 || text.indexOf('tornozelo') !== -1 || text.indexOf('queda') !== -1 || text.indexOf('tropec') !== -1 || text.indexOf('escorreg') !== -1 || text.indexOf('lama') !== -1 || text.indexOf('atoleiro') !== -1 || text.indexOf('raiz') !== -1) {
      return { id: 'sprained', icon: '🦶', label: 'Torção no Tornozelo (−3m)', desc: 'Deslocamento reduzido em 3m (-2 hexes) e desvantagem em testes de Destreza no mapa hexagonal.' };
    }
    if (text.indexOf('vento') !== -1 || text.indexOf('frio') !== -1 || text.indexOf('gelo') !== -1 || text.indexOf('sede') !== -1 || text.indexOf('cansac') !== -1 || text.indexOf('exaust') !== -1 || text.indexOf('afund') !== -1 || text.indexOf('tempestade') !== -1) {
      return { id: 'exhaustion', icon: '⏳', label: 'Exausto (Fadiga Nv. 1)', desc: 'Exaustão Nível 1: Desvantagem em testes de atributo e perícias durante a exploração.' };
    }
    if (text.indexOf('impacto') !== -1 || text.indexOf('pancada') !== -1 || text.indexOf('galho') !== -1 || text.indexOf('rocha') !== -1 || text.indexOf('pedra') !== -1) {
      return { id: 'bruised', icon: '💥', label: 'Contusão Muscular (−1)', desc: 'Penalidade em testes físicos de Força e Constituição no mapa hexagonal.' };
    }
    // Chance de fadiga leve em viagens com biomas desafiadores
    if (Math.random() < 0.45) {
      return { id: 'exhaustion', icon: '⏳', label: 'Exausto (Fadiga Nv. 1)', desc: 'Exaustão Nível 1: Desvantagem em testes de atributo e perícias durante a exploração.' };
    }
    return null;
  }

  // Aplica condição temporária ao aventureiro e persiste para a exploração
  function _applyJourneyCondition(p, cond) {
    if (!p || !cond) return;
    p.conditions = p.conditions || {};
    if (Array.isArray(p.conditions)) {
      if (p.conditions.indexOf(cond.id) < 0) p.conditions.push(cond.id);
    } else {
      p.conditions[cond.id] = { id: cond.id, label: cond.label, desc: cond.desc };
    }
    try {
      var saved = [];
      try { saved = JSON.parse(sessionStorage.getItem('valdoria_journey_conditions') || '[]'); } catch (_) {}
      if (!Array.isArray(saved)) saved = [];
      if (saved.indexOf(cond.id) < 0) saved.push(cond.id);
      sessionStorage.setItem('valdoria_journey_conditions', JSON.stringify(saved));
    } catch (_) {}
  }

  // Desfecho: narrativa + cálculo de dano e condições + ficha resumida condicional.
  function _outcome(hz, ch, success, roll) {
    var j = _j; if (!j) return;
    var p = _player();
    var prevHp = (p && p.hp != null) ? p.hp : 28;
    var hpMax = (p && (p.hpMax || p.mhp || p.max_hp)) || 28;
    var narr = (JD().pickNarrative ? JD().pickNarrative(ch, p, success) : '')
      || (success ? 'Você supera o perigo e segue em frente.' : 'O perigo te alcança, mas você sobrevive — desta vez.');
    var dmgApplied = 0;
    var conditionApplied = null;
    if (!success) {
      var dmg = (ch && ch.dmg != null) ? ch.dmg : 1;
      if (dmg > 0 && p) {
        p.hp = Math.max(0, (p.hp || 0) - dmg);
        dmgApplied = dmg;
        try { sessionStorage.setItem('valdoria_journey_hp', String(p.hp)); } catch (_) {}
        if (typeof j.opts.refreshHud === 'function') { try { j.opts.refreshHud(); } catch (e) {} }
      }
      var pickedCond = _pickBiomeHazardCondition(j.biome, hz, ch);
      if (pickedCond) {
        conditionApplied = pickedCond;
        _applyJourneyCondition(p, pickedCond);
      }
    }
    var body = narr;
    // Ajuste dinâmico de distância em Marcos com Rolagem de Dados D&D 5e (Ordem do Usuário 2026-10):
    // Desvios e atalhos NUNCA usam valores fixos (+3 ou -3); decorrem de cálculo tirado nos dados!
    if (success && (ch && (ch.isShortcut || (ch._haz && ch._haz.isShortcut)))) {
      var isHighMargin = (roll && (roll.d20 === 20 || (roll.total != null && ch && ch.dc && roll.total >= ch.dc + 5)));
      var dieSides = isHighMargin ? 6 : 4;
      var dieRoll = Math.floor(Math.random() * dieSides) + 1;
      var corvusBonus = (p && p.corvus_route_knowledge) ? 1 : 0;
      var rawShortcut = dieRoll + corvusBonus;
      var currentDist = j.distRemaining || 3;
      var marcosEncurtados = Math.max(1, Math.min((currentDist > 1 ? currentDist - 1 : 1), rawShortcut));
      j.distRemaining = Math.max(0, currentDist - marcosEncurtados);
      j.step = Math.min(j.total, j.step + 1);

      var corvusTag = corvusBonus ? ' <i>(+1 Conhecimento de Corvus)</i>' : '';
      var critTag = isHighMargin ? ' <b>★ SUCESSO NOTÁVEL</b>' : '';
      body += '<br><br><b>🎲 Rolagem de Atalho:</b> d' + dieSides + ' [' + dieRoll + ']' + corvusTag + critTag + ' ➔ ' + marcosEncurtados + (marcosEncurtados === 1 ? ' Marco' : ' Marcos') + '<br>'
            + '<b>🗺️ Atalho de rota aproveitado!</b> O grupo descobre uma picada secreta e encurta o caminho em <b>~' + marcosEncurtados + (marcosEncurtados === 1 ? ' marco' : ' marcos') + '</b>.';
    } else if (!success && (ch && (ch.isDetour || (ch._haz && ch._haz.isDetour) || (hz && hz.isOrientationHazard)))) {
      var isSevereFailure = (roll && (roll.d20 === 1 || (roll.total != null && ch && ch.dc && roll.total <= ch.dc - 5)));
      var dieSides = isSevereFailure ? 6 : 4;
      var dieRoll = Math.floor(Math.random() * dieSides) + 1;
      var cautiousMitigation = (j.pace === 'cautious' || (j.opts && j.opts.stance === 'cautious')) ? 1 : 0;
      var detourMarcos = Math.max(1, dieRoll - cautiousMitigation);
      j.distRemaining = (j.distRemaining || 0) + detourMarcos;
      j.total = (j.total || 3) + 1;

      var mitTag = cautiousMitigation ? ' <i>(−1 Marcha Cautelosa)</i>' : '';
      var fumbleTag = isSevereFailure ? ' <b>⚠ FALHA SEVERA</b>' : '';
      body += '<br><br><b>🎲 Rolagem de Desvio:</b> d' + dieSides + ' [' + dieRoll + ']' + mitTag + fumbleTag + ' ➔ +' + detourMarcos + (detourMarcos === 1 ? ' Marco' : ' Marcos') + '<br>'
            + '<b>⚠️ Desvio forçado!</b> O relevo difícil e a rota obstruída exigiram um contorno, adicionando <b>+' + detourMarcos + (detourMarcos === 1 ? ' marco' : ' marcos') + '</b> ao caminho.';
    }
    // Concessão de itens e flags de eventos de jornada (Ordem do Usuário 2026-10)
    var targetCh = (ch && ch._haz) || ch;
    if (success && targetCh && targetCh.giveItem) {
      if (p) {
        p.inventory = p.inventory || [];
        if (p.inventory.indexOf(targetCh.giveItem) < 0) {
          p.inventory.push(targetCh.giveItem);
        }
      }
      try {
        var inv = JSON.parse(localStorage.getItem('player_inventory') || '[]');
        if (Array.isArray(inv) && inv.indexOf(targetCh.giveItem) < 0) {
          inv.push(targetCh.giveItem);
          localStorage.setItem('player_inventory', JSON.stringify(inv));
        }
      } catch (_) {}
    }
    if (success && targetCh && targetCh.flag) {
      if (p) p[targetCh.flag] = true;
      try { localStorage.setItem('valdoria_' + targetCh.flag, '1'); } catch (_) {}
    }
    if (JD().detectWeather && narr) {
      var wNarr = JD().detectWeather(narr);
      if (wNarr) { j.weather = wNarr; _log('journey weather updated on outcome -> ' + wNarr); }
    }
    var pSpeech = (ch && (ch.speech || (ch._haz && ch._haz.speech))) || '';
    if (!pSpeech && JD().pickChoiceVoice) {
      var vInfo = JD().pickChoiceVoice((ch && ch._haz) || ch, p, hz);
      if (vInfo && vInfo.speech) pSpeech = vInfo.speech;
    }
    var pSpeaker = (p && (p.name || p.char_name)) || 'Você';

    // Morte na jornada. AUTORIDADE do desfecho:
    //  • opts.onDefeat presente (exploração REMOTE) → o CALLER decide (triggerDefeat:
    //    derrota REAL + post status=dead ao servidor). NUNCA reviver no cliente aqui —
    //    seria fabricar estado de jogo (viola "Servidor é a Autoridade" #0).
    //  • sem onDefeat (cidade = sandbox client-mock) → socorro local a 1/4 HP.
    if (p && p.hp <= 0) {
      var deadScript = [];
      if (pSpeech) {
        deadScript.push({ type: 'speech', is_player: true, speaker: pSpeaker, text: pSpeech });
      }
      deadScript.push({ type: 'narration', text: body });
      deadScript.push({
        type: 'player_impact',
        player: p,
        prevHp: prevHp,
        newHp: 0,
        hpMax: hpMax,
        dmg: dmgApplied,
        condition: conditionApplied
      });
      _vRender({
        script: deadScript,
        choices: [{ id: 'jrn_dead', label: 'Você sucumbiu...' }],
        inline: true,
        onChoice: function () {
          _close();
          if (typeof j.opts.onDefeat === 'function') {
            try { j.opts.onDefeat(); } catch (e) {}
            return;
          }
          if (p) p.hp = Math.max(1, Math.floor((p.hpMax || p.max_hp || 28) / 4));
          if (typeof j.opts.toast === 'function') { try { j.opts.toast('Você foi derrotado na jornada. Socorro nos Portões.', 'warn'); } catch (e) {} }
          if (typeof j.opts.refreshHud === 'function') { try { j.opts.refreshHud(); } catch (e) {} }
        }
      });
      return;
    }
    // Recompensas de XP / Ouro / Itens estruturadas (Ordem do Usuário 2026-10):
    var targetCh = (ch && ch._haz) || ch;
    var rewardXp = 0;
    var rewardReason = '';
    if (success) {
      if (targetCh && targetCh.xp) {
        rewardXp = targetCh.xp;
        rewardReason = targetCh.xpReason || '';
      }
      var xpMatch = body.match(/(\+?\d+)\s*XP(?:\s+(?:por|de|—|-)\s+([^.<]+))?/i);
      if (xpMatch) {
        if (!rewardXp) rewardXp = parseInt(xpMatch[1].replace('+', ''), 10);
        if (!rewardReason && xpMatch[2]) rewardReason = xpMatch[2].trim();
        body = body.replace(/<i>\s*\+?\d+\s*XP[^<]*<\/i>/gi, '')
                   .replace(/\+?\d+\s*XP(?:\s+(?:por|de|—|-)\s+[^.<]+)?\.?/gi, '')
                   .replace(/\s{2,}/g, ' ').trim();
      }
      if (rewardXp > 0 && p) {
        p.xp = (p.xp || 0) + rewardXp;
        try {
          var savedXp = parseInt(localStorage.getItem('player_xp') || '0', 10);
          localStorage.setItem('player_xp', String(savedXp + rewardXp));
        } catch (_) {}
        if (typeof j.opts.toast === 'function') {
          j.opts.toast('+' + rewardXp + ' XP — ' + (rewardReason || 'Experiência adquirida'), 'info');
        }
        if (typeof j.opts.refreshHud === 'function') {
          try { j.opts.refreshHud(); } catch (e) {}
        }
      }
    }

    var scriptLines = [];
    if (pSpeech) {
      scriptLines.push({ type: 'speech', is_player: true, speaker: pSpeaker, text: pSpeech });
    }
    scriptLines.push({ type: 'narration', text: body });
    if (rewardXp > 0) {
      scriptLines.push({
        type: 'reward',
        xp: rewardXp,
        effect: rewardReason || 'Superação na jornada'
      });
    }
    // REGRA DO USUÁRIO: ficha/card resumida exibida SOMENTE se algo acontecer com a vida ou stats
    if (dmgApplied > 0 || conditionApplied != null) {
      scriptLines.push({
        type: 'player_impact',
        player: p,
        prevHp: prevHp,
        newHp: p ? p.hp : 0,
        hpMax: hpMax,
        dmg: dmgApplied,
        condition: conditionApplied
      });
    }
    _renderContinue(scriptLines, (hz && hz.npc) || null);
  }

  function _arrive() {
    var j = _j; if (!j) return;
    var cb = j.opts.onArrive, biome = j.biome, dn = j.displayName;
    var p = _player();
    var meta = {
      weather: j.weather || null,
      conditions: (p && p.conditions) || []
    };
    _log('journey complete -> onArrive(' + biome + ', weather=' + meta.weather + ')');
    _close();
    if (typeof cb === 'function') { try { cb(biome, dn, meta); } catch (e) {} }
  }

  function _close() {
    try { if (global.vEncounter && typeof global.vEncounter.close === 'function') global.vEncounter.close(); } catch (e) {}
    _j = null;
  }

  global.JourneyRunner = {
    start: start,
    close: _close,
    isActive: function () { return !!_j; }
  };
})(typeof window !== 'undefined' ? window : this);

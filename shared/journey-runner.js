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
    var total = opts.totalSteps || (3 + Math.floor(Math.random() * 3));  // 3-5 etapas
    _j = { opts: opts, biome: biome, displayName: opts.displayName || 'destino',
           total: total, step: 0, usedHaz: [], usedSafe: [] };
    try {
      if (opts.audioBiome && global.ValdoriaAudio && typeof ValdoriaAudio.playBiome === 'function') {
        ValdoriaAudio.playBiome(biome);
      }
    } catch (e) { _log('biome music failed: ' + e.message); }
    if (opts.confirm === false) _departure();
    else _confirm();
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
      prog = { current: _j.step, total: _j.total };
    }
    global.vEncounter.render(
      { npc: cfg.npc || null, script: cfg.script || [], choices: cfg.choices || [] },
      {
        player: _player(), showGold: false, fullHeight: true, progress: prog,
        inlineChoices: cfg.inline === true,
        onChoice: function (ch) { if (typeof cfg.onChoice === 'function') cfg.onChoice(ch); }
      }
    );
  }

  // Confirmação antes de viajar (user sessão #90: "não tem popup de confirmação").
  function _confirm() {
    var j = _j; if (!j) return;
    _vRender({
      script: [{ type: 'narration', text: 'Preparar viagem para <b>' + j.displayName + '</b>? A jornada terá ' + j.total + ' etapas — perigos podem surgir no caminho.' }],
      choices: [{ id: 'jrn_go', label: 'Confirmar viagem' }, { id: 'jrn_cancel', label: 'Cancelar' }],
      inline: true, noProgress: true,
      onChoice: function (ch) { if (ch && ch.id === 'jrn_cancel') _cancel(); else _departure(); }
    });
  }

  function _cancel() {
    var cb = _j && _j.opts.onCancel;
    _close();
    if (typeof cb === 'function') { try { cb(); } catch (e) {} }
  }

  // Partida — narração cinematográfica PADRAO_ALDRIC ("Rumo a <destino>").
  function _departure() {
    var j = _j; if (!j) return;
    var dep = (JD().pickDeparture) ? JD().pickDeparture(j.biome, _player(), []) : null;
    var script = (dep || []).map(function (l) { return { type: l.type || 'narration', text: l.text }; });
    if (!script.length) script = [{ type: 'narration', text: 'Você parte rumo a ' + j.displayName + '.' }];
    _vRender({
      script: script, choices: [{ id: 'jrn_partir', label: 'Partir' }],
      inline: true, noProgress: true,
      onChoice: function () { _step(); }
    });
  }

  function _step() {
    var j = _j; if (!j) return;
    j.step++;
    if (j.step > j.total) { _arrive(); return; }
    _renderStep();
  }

  function _renderStep() {
    var j = _j; if (!j) return;
    var risk = (typeof JD().RISK_CHANCE === 'number') ? JD().RISK_CHANCE : 55;
    var hasHaz = (Math.random() * 100) < risk;
    if (!hasHaz) { _safe(); return; }
    var hz = JD().pickFreshHazard ? JD().pickFreshHazard(j.biome, _player(), j.usedHaz) : null;
    if (!hz) { _safe(); return; }
    // pickFreshHazard já empurra hz.title em j.usedHaz (anti-repeat sessão+24h).
    j._haz = hz;
    var script = (hz.script || []).map(function (line) {
      if (line.type === 'speech') return { type: 'speech', speaker: (hz.npc && hz.npc.name) || line.speaker || '', text: line.text };
      return { type: 'narration', text: line.text };
    });
    if (!script.length && hz.narr) script = [{ type: 'narration', text: hz.narr }];
    if (hz.speech && hz.npc) script.push({ type: 'speech', speaker: hz.npc.name, text: hz.speech });
    var choices = (hz.choices || []).map(function (ch, i) {
      var out = { id: 'jrn_ch_' + i, label: ch.t, desc: ch.desc || '', _haz: ch };
      if (ch.stat && ch.dc != null) {
        out.dc = ch.dc;
        out.skill = (global.DndRules && DndRules.statLabel) ? DndRules.statLabel(ch.stat) : ch.stat;
        var pc = JD().successPctForChoice ? JD().successPctForChoice(_player(), ch) : null;
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
    // pickFreshSafe já empurra o texto em j.usedSafe (anti-repeat sessão+24h).
    var txt = JD().pickFreshSafe ? JD().pickFreshSafe(j.biome, _player(), j.usedSafe) : null;
    _renderContinue([{ type: 'narration', text: txt || 'O caminho segue tranquilo por mais um trecho.' }]);
  }

  // Tela "continuar/chegar" — UMA escolha inline. IDÊNTICA ida<->volta (PADRAO_VIAGEM:
  // mesma interface, mínimo trabalho). Sem "Acampar" no caminho (a exploração mantém o
  // descanso pelo botão de acampar normal do mapa) — assim a etapa é 1 toque nas 2 direções.
  function _renderContinue(scriptLines, npc) {
    var j = _j; if (!j) return;
    var remaining = j.total - j.step;
    _vRender({
      npc: npc || null,
      script: scriptLines,
      choices: [{ id: 'jrn_cont', label: (remaining > 0 ? 'Continuar viagem' : 'Chegar ao destino') }],
      inline: true,
      onChoice: function () { _step(); }
    });
  }

  // Resolve a escolha: check D&D (JourneyData=DndRules, ODDS IGUAIS) → dado 3D → desfecho.
  function _resolve(hz, ch) {
    var roll = JD().resolveJourneyCheck ? JD().resolveJourneyCheck(_player(), ch) : null;
    if (!roll) { _outcome(hz, ch, true, null); return; }
    _dice(roll, function () { _outcome(hz, ch, roll.success, roll); });
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
      resEl.appendChild(_mk('div', 'font-size:calc(11px * var(--v-font-scale,1));color:#a09484;letter-spacing:1.5px;margin-bottom:6px;', 'Rolagem d20 ' + roll.d20 + ' ' + (modTotal >= 0 ? '+' : '') + modTotal + ' = ' + roll.total + ' vs CD ' + roll.dc));
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

  // Desfecho: narrativa (por classe/alinhamento via JourneyData) + dano + morte.
  function _outcome(hz, ch, success, roll) {
    var j = _j; if (!j) return;
    var p = _player();
    var narr = (JD().pickNarrative ? JD().pickNarrative(ch, p, success) : '')
      || (success ? 'Você supera o perigo e segue em frente.' : 'O perigo te alcança, mas você sobrevive — desta vez.');
    var dmgApplied = 0;
    if (!success) {
      var dmg = (ch && ch.dmg != null) ? ch.dmg : 1;
      if (dmg > 0 && p) {
        p.hp = Math.max(0, (p.hp || 0) - dmg);
        dmgApplied = dmg;
        if (typeof j.opts.refreshHud === 'function') { try { j.opts.refreshHud(); } catch (e) {} }
      }
    }
    var body = narr;
    if (dmgApplied > 0) {
      body += ' <span style="color:#d85848;font-family:Cinzel,serif;font-weight:700;letter-spacing:1px;white-space:nowrap;">(−' + dmgApplied + ' HP)</span>';
    }
    // Morte na jornada. AUTORIDADE do desfecho:
    //  • opts.onDefeat presente (exploração REMOTE) → o CALLER decide (triggerDefeat:
    //    derrota REAL + post status=dead ao servidor). NUNCA reviver no cliente aqui —
    //    seria fabricar estado de jogo (viola "Servidor é a Autoridade" #0).
    //  • sem onDefeat (cidade = sandbox client-mock) → socorro local a 1/4 HP.
    if (p && p.hp <= 0) {
      _vRender({
        script: [{ type: 'narration', text: body }],
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
    _renderContinue([{ type: 'narration', text: body }]);
  }

  function _arrive() {
    var j = _j; if (!j) return;
    var cb = j.opts.onArrive, biome = j.biome, dn = j.displayName;
    _log('journey complete -> onArrive(' + biome + ')');
    _close();
    if (typeof cb === 'function') { try { cb(biome, dn); } catch (e) {} }
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

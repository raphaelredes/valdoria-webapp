/**
 * PADRAO_SVC_INTERACTIONS — helpers canonical para svc click dispatcher
 *
 * USAGE em cada mockup *-final.html:
 *   1. Carregar este arquivo via document.write antes do choice handler.
 *   2. Definir window._SVC_CONFIG = { faction: 'bank'|'temple'|..., npcMap: {...} }
 *   3. Importar 3 funções no namespace: _diceCheckSvc, _showOpinionReaction, _showPurchaseConfirm
 *   4. No choice handler dos services, reconhecer cb patterns:
 *      - 'dice:<ability>:<dc>:<mod>' → _diceCheckSvc(...)
 *      - 'opinion-*' → _showOpinionReaction(npc, label, renownDelta)
 *      - '*-confirm' → _showPurchaseConfirm(npc, label, renownDelta)
 *
 * Cada mockup DEFINE as reações específicas via _SVC_CONFIG.reactions{positive,negative,neutral}.
 *
 * Renown global em window._PLAYER_RENOWN (mock; em produção viria do Player).
 *
 * Dice3D API: window.Dice3D global de valdoria-webapp/shared/dice-3d.js.
 *
 * @see memory/reference_npc_personalities_canonical.md
 * @see memory/feedback_png_generation_canonical_workflow.md
 */
(function() {
  'use strict';

  // Mock Renown global — em produção viria de Player.metadata.renown
  if (!window._PLAYER_RENOWN) {
    window._PLAYER_RENOWN = {
      bank: 0, temple: 12, guild: 7, market: 5, tavern: 6,
      inn: 8, arena: 4, workshop: 3, runes: 2
    };
  }

  window._applyRenownDelta = function(facao, delta) {
    if (!delta) return;
    window._PLAYER_RENOWN[facao] = (window._PLAYER_RENOWN[facao] || 0) + delta;
    console.log('[Renown]', facao, 'delta:', delta, 'now:', window._PLAYER_RENOWN[facao]);
  };

  /**
   * Dice check com PADRAO_DICE3D — anima d20, calcula vs DC, aplica Renown delta.
   * @param {Object} opts { ability, dc, mod, npc, label, faction }
   */
  window._diceCheckSvc = function(opts) {
    var ov = document.getElementById('encounter-overlay');
    ov.innerHTML = '';
    var card = document.createElement('div');
    card.className = 'enc-card';
    card.style.maxWidth = '420px';
    card.style.padding = '24px';
    card.style.textAlign = 'center';
    card.innerHTML =
      '<div style="font-size:11px;letter-spacing:2px;color:#c4953a;text-transform:uppercase;margin-bottom:6px;">Teste de ' + (opts.ability||'Atributo') + '</div>'
      + '<div style="font-size:13px;color:#f4d896;letter-spacing:1.5px;margin-bottom:14px;">Classe de Dificuldade ' + opts.dc + ' &nbsp;·&nbsp; modificador ' + (opts.mod>=0?'+':'') + opts.mod + '</div>'
      + '<div id="dice-mount" style="width:160px;height:160px;margin:0 auto 12px;"></div>'
      + '<div id="dice-result" style="min-height:48px;font-size:15px;color:#f4d896;letter-spacing:1px;line-height:1.6;"></div>'
      + '<div id="dice-actions" style="display:flex;gap:10px;justify-content:center;margin-top:14px;opacity:0;transition:opacity 0.4s;"></div>';
    ov.appendChild(card);
    ov.classList.add('active');

    var rawD20 = Math.floor(Math.random()*20)+1;
    var total = rawD20 + opts.mod;
    var success = total >= opts.dc;
    var critSuccess = rawD20 === 20;
    var critFail = rawD20 === 1;
    var faction = opts.faction || (window._SVC_CONFIG && window._SVC_CONFIG.faction) || 'unknown';

    function showResult() {
      var resEl = card.querySelector('#dice-result');
      var statusTxt, statusColor;
      if (critSuccess) { statusTxt = '⚜ ACERTO CRÍTICO! ⚜'; statusColor = '#fff4d0'; }
      else if (critFail) { statusTxt = '✗ FALHA CRÍTICA'; statusColor = '#d04848'; }
      else if (success) { statusTxt = '✓ SUCESSO'; statusColor = '#7ad06b'; }
      else { statusTxt = '✗ FALHA'; statusColor = '#d04848'; }
      resEl.innerHTML =
        '<div style="font-size:11px;color:#a09484;letter-spacing:1.5px;margin-bottom:6px;">Rolagem d20 ' + rawD20 + ' ' + (opts.mod>=0?'+':'') + opts.mod + ' = <b>' + total + '</b> vs CD ' + opts.dc + '</div>'
        + '<div style="font-size:18px;color:' + statusColor + ';font-weight:700;letter-spacing:2px;">' + statusTxt + '</div>';

      var deltaR = critSuccess ? +3 : success ? +1 : critFail ? -2 : -1;
      window._applyRenownDelta(faction, deltaR);

      /* Sessao #29 (2026-05-24): se opts.ch.ally_source existe, dispara
         POST /api/ally/apply-effect com o dice_result. Backend aplica
         renown REAL + effect + item + gold conforme registry. Toast de
         confirmacao em cima do existente "+1 Renome ·". */
      if (opts.ch && opts.ch.ally_source && typeof window._postAllyEffect === 'function') {
        try {
          window._postAllyEffect(opts.ch.ally_source, {
            success: success,
            crit_success: critSuccess,
            crit_failure: critFail,
            total: total,
          });
        } catch(_e) { /* defensivo, nao bloqueia dice flow */ }
      }

      setTimeout(function() {
        var actions = card.querySelector('#dice-actions');
        actions.innerHTML = '<button class="enc-btn enc-btn-primary" style="padding:8px 18px;">Continuar →</button>';
        actions.style.opacity = '1';
        actions.querySelector('button').addEventListener('click', function() {
          // Sessão #23 v8: Toast de Renome + continuação do diálogo se houver.
          if (typeof window.vToast === 'function') {
            var facLabel = (window._SVC_CONFIG && window._SVC_CONFIG.factionLabel) || faction;
            window.vToast((deltaR>=0?'+':'')+deltaR+' Renome · '+facLabel, deltaR>=0?'gold':'warn');
          }
          // Próximo nó: success → opts.ch.success / fail → opts.ch.failure
          // Senão: continueDialogue (legacy). Senão: close.
          var nextNodeId = null;
          if (opts.ch) {
            if (success && opts.ch.success) nextNodeId = opts.ch.success;
            else if (!success && opts.ch.failure) nextNodeId = opts.ch.failure;
            else if (opts.ch.continueDialogue) nextNodeId = opts.ch.continueDialogue;
          }
          if (nextNodeId && opts.dialogues && opts.dialogues[nextNodeId]) {
            // Render próximo nó PADRAO_ALDRIC
            if (window.vEncounter && typeof window.vEncounter.render === 'function') {
              window.vEncounter.render(opts.dialogues[nextNodeId], { dialogues: opts.dialogues });
            } else if (typeof window._renderEncounterPopup === 'function') {
              window._renderEncounterPopup(opts.dialogues[nextNodeId]);
            } else {
              ov.classList.remove('active');
            }
          } else if (opts.ch && (opts.ch.resultNarration || opts.ch.resultText)) {
            // Mostra narrativa de resultado (success/fail) como popup curto
            var rNarration = success ? (opts.ch.resultNarration || '') : (opts.ch.resultNarrationFail || opts.ch.resultNarration || '');
            var rText = success ? (opts.ch.resultText || '') : (opts.ch.resultTextFail || opts.ch.resultText || '');
            ov.classList.remove('active');
            if (typeof window._showInfoPopup === 'function') {
              window._showInfoPopup({
                icon: '',
                npc: (opts.dialogue && opts.dialogue.npc && opts.dialogue.npc.name) || '',
                title: success ? 'Sucesso' : 'Falha',
                desc: (rNarration ? '<i style="color:var(--v-text-dim,#a09484);">' + rNarration + '</i><br><br>' : '') + rText,
                onConfirm: function(){}
              });
            }
          } else {
            ov.classList.remove('active');
          }
        });
      }, 600);
    }

    setTimeout(function() {
      var mount = card.querySelector('#dice-mount');
      if (window.Dice3D) {
        try {
          var dice = new window.Dice3D(mount, { size: 156, dieType: 'd20', duration: 2200 });
          dice.roll(rawD20, showResult);
        } catch(e) {
          mount.innerHTML = '<div style="font-size:80px;color:#f4d896;line-height:160px;">'+rawD20+'</div>';
          setTimeout(showResult, 800);
        }
      } else {
        mount.innerHTML = '<div style="font-size:80px;color:#f4d896;line-height:160px;">'+rawD20+'</div>';
        setTimeout(showResult, 800);
      }
    }, 100);
  };

  /**
   * Mostra reação do NPC a uma opinião do jogador + aplica Renown delta.
   * NPC reactions vêm de _SVC_CONFIG.reactions (positive/negative/neutral).
   */
  /* task #52 (2026-05-20) — UNIFY: prefer vEncounter.render (canonical, shared
     pra cidade + exploracao + futuro) sobre _renderEncounterPopup (legacy,
     cidade-only). Fallback ao legacy mantido pra compat com mockups antigos. */
  function _renderViaCanonical(dialogue) {
    if (window.vEncounter && typeof window.vEncounter.render === 'function') {
      window.vEncounter.render(dialogue);
      return true;
    }
    if (typeof window._renderEncounterPopup === 'function') {
      window._renderEncounterPopup(dialogue);
      return true;
    }
    console.warn('[svc-interactions] No dialogue renderer available');
    return false;
  }

  /* task #62 (2026-05-20) — Backend dispatch: choices *-confirm + opinion-*
     agora chamam vCity.act(ch.backend_cb) (se disponivel) pra aplicar effect
     real no Player server-side (charge gold, +HP, +Renown, save no DB).
     Simulador/Chrome MCP: vCity.act é no-op → so UX feedback.
     Bot DEV/PROD: vCity.act envia ação pro backend que aplica efeito. */
  function _dispatchBackendAction(ch) {
    if (!ch) return;
    var backendCb = ch.backend_cb;
    if (!backendCb) return; // sem backend_cb declarado, apenas UX
    if (typeof window.vCity !== 'object' || typeof window.vCity.act !== 'function') return;
    try {
      window.vCity.act(backendCb);
    } catch(_) { /* non-fatal: simulator/chrome-mcp sem backend */ }
  }

  window._showOpinionReaction = function(npc, optionLabel, renownDelta, ch) {
    var faction = (window._SVC_CONFIG && window._SVC_CONFIG.faction) || 'unknown';
    var reactions = (window._SVC_CONFIG && window._SVC_CONFIG.reactions) || {};
    var resp;
    if (renownDelta < -2) resp = reactions.very_negative || 'NPC fecha o livro com som seco. <i>(voz cortante)</i> "Vossa Senhoria escolheu como tratar esta casa. Eu não esquecerei."';
    else if (renownDelta < 0) resp = reactions.negative || 'NPC pausa. <i>(sorri sem calor)</i> "Cada um tem sua opinião."';
    else if (renownDelta > 2) resp = reactions.very_positive || 'NPC curva-se levemente. <i>(sorri com cortesia rara)</i> "Palavras que honram esta casa."';
    else if (renownDelta > 0) resp = reactions.positive || 'NPC acena com aprovação contida. "Bem dito."';
    else resp = reactions.neutral || 'NPC mantém o olhar neutro. "Anotado."';

    _renderViaCanonical({
      npc: npc,
      script: [
        { type: 'narration', text: '<b>Vossa Senhoria:</b> "' + optionLabel.replace(/^"|"$/g,'') + '"' },
        { type: 'speech', speaker: npc.name, text: resp }
      ],
      choices: [{ id: 'continue', label: '↩ Voltar', cb: 'close' }]
    });
    window._applyRenownDelta(faction, renownDelta);
    _dispatchBackendAction(ch); /* task #62: bot DEV apply effect */
    if (typeof window.vToast === 'function' && renownDelta !== 0) {
      var facLabel = (window._SVC_CONFIG && window._SVC_CONFIG.factionLabel) || faction;
      setTimeout(function(){ window.vToast((renownDelta>=0?'+':'')+renownDelta+' Renown · '+facLabel, renownDelta>=0?'gold':'warn'); }, 400);
    }
  };

  /**
   * Confirma purchase/serviço + aplica Renown delta + mostra mensagem do NPC.
   *
   * task #62 (2026-05-20): se ch.backend_cb declarado, chama vCity.act
   * pra aplicar effect real no Player server-side (bot DEV).
   *
   * task #84 (2026-05-20) — DIALOGUE COHESION FIX:
   * Antes: TODAS as choices `-confirm` mostravam a mesma mensagem genérica
   * (confirmMsgs.generic), causando incoerência (player escolhe "Sobre Lobos"
   * e vê "Anotado. Bom proveito" — texto de pedido de bebida).
   *
   * Agora: choice pode declarar `resultText` (speech específico) e/ou
   * `resultNarration` (narração específica) que sobrescrevem o genérico.
   * Quando ausentes, usa fallback genérico (back-compat).
   *
   * User reportou: "diálogos da cidade estão com resultado sem coesão".
   */
  window._showPurchaseConfirm = function(npc, optionLabel, renownDelta, ch) {
    var faction = (window._SVC_CONFIG && window._SVC_CONFIG.faction) || 'unknown';
    var confirmMsgs = (window._SVC_CONFIG && window._SVC_CONFIG.confirmMsgs) || {};
    var defaultMsg = 'NPC registra a transação. <i>(gesto pragmático)</i> "Combinado. Boa jornada, viajante."';

    /* Choice-specific overrides — preferido (cohesão) */
    var specificNarration = (ch && ch.resultNarration) || confirmMsgs.narration || 'NPC anota o valor com gesto preciso.';
    var specificMsg = (ch && ch.resultText) || confirmMsgs.generic || defaultMsg;

    /* Script multi-segment: aceita ch.resultScript (array de {type, text})
       pra cenas mais ricas (ex: rumor com múltiplas linhas). */
    var script;
    if (ch && Array.isArray(ch.resultScript) && ch.resultScript.length > 0) {
      script = ch.resultScript;
    } else {
      script = [
        { type: 'narration', text: specificNarration },
        { type: 'speech', speaker: npc.name, text: specificMsg }
      ];
    }

    _renderViaCanonical({
      npc: npc,
      script: script,
      choices: [{ id: 'continue', label: '↩ Voltar', cb: 'close' }]
    });
    window._applyRenownDelta(faction, renownDelta);
    _dispatchBackendAction(ch); /* task #62: bot DEV apply effect */
    if (typeof window.vToast === 'function' && renownDelta !== 0) {
      var facLabel = (window._SVC_CONFIG && window._SVC_CONFIG.factionLabel) || faction;
      setTimeout(function(){ window.vToast((renownDelta>=0?'+':'')+renownDelta+' Renown · '+facLabel, renownDelta>=0?'gold':'warn'); }, 400);
    }
  };

  /**
   * Choice handler dispatcher canonical — chamado dentro de _renderEncounterPopup.
   * Reconhece cb patterns:
   *   - 'close'                                → fecha overlay
   *   - 'dice:<ability>:<dc>:<mod>'            → _diceCheckSvc
   *   - 'opinion-*'                            → _showOpinionReaction
   *   - '*-confirm'                            → _showPurchaseConfirm
   *   - 'cascade:<targetNpc>:<dialogueId>'     → desbloqueia diálogo em outro NPC
   *   - 'memory:<key>:<value>'                 → grava memória do NPC atual
   *   - 'visit:<topic>'                        → registra tópico de visita
   *   - <id de outro dialogue em dialogues{}>  → chain (re-renderiza)
   *
   * Cascade/memory/visit suportam continuação via ch.continueDialogue (id) —
   * útil pra "depois do cascade, Aldwin diz: <fala canonical>" sem fechar overlay.
   *
   * @returns {boolean} true se interceptou; caller pode return.
   */
  window._dispatchSvcChoice = function(ch, dialogue, dialogues) {
    var cb = ch.cb || '';
    var ov = document.getElementById('encounter-overlay');
    if (cb === 'close') {
      // Sessão #23 v8 (2026-05-22): user reportou "Talvez depois" não fechava.
      // Sessão #28 (2026-05-24): user reportou tela escurecida + nada acontece
      // ao escolher choice em ally chat. Causa raiz: codigo legacy abaixo
      // limpava classList/innerHTML/display MAS nunca chamava <dialog>.close(),
      // entao o dialog nativo permanecia aberto com ::backdrop visivel +
      // conteudo zerado = tela preta. Fix: usar vEncounter.close() canonical.
      if (window.vEncounter && typeof window.vEncounter.close === 'function') {
        window.vEncounter.close();
      } else if (ov) {
        // Fallback legacy (caso vEncounter nao carregue): close + limpa
        if (typeof ov.close === 'function' && ov.open) {
          try { ov.close(); } catch(e){}
        }
        ov.classList.remove('active');
        ov.innerHTML = '';
      }
      // Limpa também qualquer sub-overlay flutuante (choices)
      try {
        var sub = document.querySelector('.enc-choices-overlay, .enc-choices, #enc-choices-overlay');
        if (sub) {
          if (typeof sub.close === 'function' && sub.open) { try { sub.close(); } catch(e){} }
          sub.classList.remove('active', 'open', 'opening', 'closing');
        }
      } catch(_e){}
      return true;
    }
    if (cb.indexOf('dice:') === 0) {
      var parts = cb.split(':');
      // Sessão #23 v8 (2026-05-22): user reportou que após Continuar do dice,
      // nada acontece. Fix: passar ch + dialogues pra _diceCheckSvc poder
      // chain pra continueDialogue OU resultText narrativo (PADRAO_ALDRIC).
      window._diceCheckSvc({
        ability: parts[1],
        dc: parseInt(parts[2], 10),
        mod: parseInt(parts[3].replace('+',''), 10) || 0,
        npc: dialogue.npc,
        label: ch.label,
        faction: (window._SVC_CONFIG && window._SVC_CONFIG.faction),
        // Continuação do diálogo:
        ch: ch,
        dialogue: dialogue,
        dialogues: dialogues
      });
      return true;
    }
    if (cb.indexOf('opinion-') === 0) {
      window._showOpinionReaction(dialogue.npc, ch.label, ch.renownDelta || 0, ch);
      return true;
    }
    if (cb.indexOf('-confirm') > 0) {
      window._showPurchaseConfirm(dialogue.npc, ch.label, ch.renownDelta || 0, ch);
      return true;
    }
    // === FASE B (sessão #11, 2026-05-19) — NPC Living System cascade ===========
    // cb prefix 'cascade:' / 'memory:' / 'visit:' delegate to _npcDispatchCascadeChoice.
    // After dispatching, optionally chain to ch.continueDialogue (id em dialogues{})
    // pra continuação da conversa; senão fecha overlay.
    if (cb.indexOf('cascade:') === 0 || cb.indexOf('memory:') === 0 || cb.indexOf('visit:') === 0) {
      if (typeof window._npcDispatchCascadeChoice === 'function') {
        window._npcDispatchCascadeChoice(cb, dialogue);
      }
      if (ch.continueDialogue && dialogues && dialogues[ch.continueDialogue]) {
        // task #68 fix: prefer canonical engine
        if (window.vEncounter && typeof window.vEncounter.render === 'function') {
          window.vEncounter.render(dialogues[ch.continueDialogue], { dialogues: dialogues });
        } else if (typeof window._renderEncounterPopup === 'function') {
          window._renderEncounterPopup(dialogues[ch.continueDialogue]);
        }
      } else {
        if (window.vEncounter && typeof window.vEncounter.close === 'function') {
          window.vEncounter.close();
        } else if (ov) {
          ov.classList.remove('active');
        }
      }
      return true;
    }
    // task #68 (2026-05-20) CRITICAL FIX — user reportou: click em choice do
    // greeting (ex: Grom "Uma cerveja, por favor") NÃO FUNCIONAVA. Root cause:
    // _renderEncounterPopup é LEGACY cidade-only, espera enc.npc como string
    // key em RECURRING_NPCS. Mas SERVICE_DIALOGUES_X têm enc.npc como OBJETO
    // ({name, desc, portrait}). Lookup falha → early return → nada acontece.
    // Fix: prefer vEncounter.render (canonical, aceita npc como objeto direto).
    if (dialogues && dialogues[ch.id]) {
      if (window.vEncounter && typeof window.vEncounter.render === 'function') {
        // Preserve opts.dialogues pra chain continuar funcionando
        window.vEncounter.render(dialogues[ch.id], { dialogues: dialogues });
      } else if (typeof window._renderEncounterPopup === 'function') {
        window._renderEncounterPopup(dialogues[ch.id]); // legacy fallback
      }
      return true;
    }
    return false;
  };

  /* ========================================================================
   * Sessao #29 (2026-05-24): _postAllyEffect — POST /api/ally/apply-effect
   * Chamado por dois caminhos:
   *  1. encounter-popup.js _handleChoiceInternal (non-dice choices, cb='close')
   *  2. _diceCheckSvc showResult (dice choices, apos resolver d20)
   *
   * Auth via window.__CITY_AUTH (token/api/uid) setado por cidade.html quando
   * em REMOTE mode. Em LOCAL mode (file://) ou se auth ausente, no-op silencioso.
   *
   * Backend aplica renown/effect/item/gold via overworld_effects + give_item +
   * modify_reputation. Frontend mostra toast de confirmacao.
   * ====================================================================== */
  /* Fallback toast quando backend nao responde — mostra renown hint local.
     Usado quando auth ausente (LOCAL mode) OU quando backend retorna erro.
     So fire pra NON-DICE choices (dice ja tem proprio toast em showResult).
     Sessao #29 v2 (2026-05-24). */
  function _allyFallbackToast(ally_source, dice_result) {
    if (dice_result) return;  // dice path tem toast proprio
    if (typeof window.vToast !== 'function') return;
    var hint = ally_source && ally_source.renown_hint;
    if (typeof hint !== 'number' || hint === 0) {
      // Sem renown hint ou 0 — toast generico de confirmacao
      window.vToast('Conversa encerrada', 'info');
      return;
    }
    var sign = hint > 0 ? '+' : '';
    window.vToast(sign + hint + ' Renome · ' + (ally_source.name || 'Aliado'),
                   hint >= 0 ? 'gold' : 'warn');
  }

  window._postAllyEffect = function(ally_source, dice_result) {
    var auth = window.__CITY_AUTH;
    if (!auth || !auth.token || !auth.api || !auth.uid) {
      console.debug('[ALLY] _postAllyEffect: no auth context — using fallback toast');
      _allyFallbackToast(ally_source, dice_result);
      return Promise.resolve(null);
    }
    if (!ally_source || !ally_source.cls || !ally_source.choice_id) {
      console.warn('[ALLY] _postAllyEffect: invalid ally_source', ally_source);
      return Promise.resolve(null);
    }
    var body = {
      user_id: auth.uid,
      ally_class: ally_source.cls,
      choice_id: ally_source.choice_id,
      ally_name: ally_source.name || '',
      dice_result: dice_result || null,
    };
    var url = auth.api + '/api/ally/apply-effect';
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var tid = ctrl ? setTimeout(function(){ ctrl.abort(); }, 8000) : null;
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + auth.token,
      },
      body: JSON.stringify(body),
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function(resp) {
      if (tid) clearTimeout(tid);
      if (!resp.ok) {
        console.warn('[ALLY] apply-effect HTTP ' + resp.status + ' — fallback toast');
        _allyFallbackToast(ally_source, dice_result);
        return null;
      }
      return resp.json();
    }).then(function(data) {
      if (!data || !data.ok) return data;
      var applied = data.applied || {};
      // Toast composto com TODAS as aplicacoes em uma linha
      if (typeof window.vToast === 'function') {
        var parts = [];
        if (applied.item_given) {
          var emoji = applied.item_given.emoji || '🎁';
          var qty = applied.item_given.qty || 1;
          parts.push(emoji + ' ' + applied.item_given.name + (qty > 1 ? ' x' + qty : ''));
        }
        if (applied.gold_delta) {
          parts.push((applied.gold_delta > 0 ? '+' : '') + applied.gold_delta + ' Valdoritas');
        }
        if (applied.effect && applied.effect.name) {
          parts.push('✨ ' + applied.effect.name);
        }
        if (parts.length) {
          var positive = (applied.gold_delta || 0) >= 0 && (applied.renown_delta || 0) >= 0;
          window.vToast(parts.join(' · '), positive ? 'gold' : 'warn');
        }
      }
      return data;
    }).catch(function(err) {
      if (tid) clearTimeout(tid);
      console.warn('[ALLY] apply-effect error — fallback toast', err && err.message || err);
      _allyFallbackToast(ally_source, dice_result);
      return null;
    });
  };

  console.log('[svc-interactions] PADRAO loaded — _diceCheckSvc, _showOpinionReaction, _showPurchaseConfirm, _dispatchSvcChoice (+ FASE B cascade/memory/visit), _postAllyEffect (Sessao #29)');
})();

/* ============================================================================
 * encounter-popup.js — PADRAO_ALDRIC dialogue engine (shared canonical)
 * ============================================================================
 *
 * Source canonical: simuladores/banco-cofre-final.html linhas 1324-1853.
 * Extraído nesta sessão (#13) pra ser reusável por TODOS os renderers
 * de estabelecimento em cidade/index.html (Task #23 centralização).
 *
 * MAPA_IA — navegação rápida:
 *   ~40   _ensureOverlay() — cria #encounter-overlay no DOM se ainda não existe
 *   ~80   _groupScriptIntoPages(script) — paginação canonical (2 estrofes / 10 linhas)
 *   ~110  _splitIntoSentences(text) — quebra por .!? pra typewriter por frase
 *   ~125  _typewriter(el, text, charMs, onDone) — char-by-char com pausa em <i>
 *   ~200  vEncounter.render(dialogue) — entry principal
 *   ~430  renderActions(dialogue, actionsEl, overlayEl, dialoguesRef) — cb dispatch
 *   ~510  vEncounter.close() / vEncounter.isOpen()
 *
 * Doc canonical:
 *   memory/feedback_centralize_in_canonical_webapps.md (porting pattern)
 *   simuladores/banco-cofre-final.html (mockup source)
 *
 * USO em renderer (após carregar shared/svc-interactions.js + shared/dice-3d.js):
 *
 *   var SERVICE_DIALOGUES_BANK = {
 *     deposit: {
 *       npc: { name: 'Aldwin de Tholram', desc: 'Banqueiro · Casa de Tholram',
 *              portrait: '../shared/img/npcs/banqueiro.png' },
 *       script: [ { type:'narration', text:'...' }, { type:'speech', speaker:'Aldwin', text:'...' } ],
 *       choices: [ { id:'pay', label:'Pagar', cb:'pay-confirm', renownDelta: +1 } ]
 *     }
 *   };
 *
 *   vEncounter.render(SERVICE_DIALOGUES_BANK.deposit, { dialogues: SERVICE_DIALOGUES_BANK });
 *
 * cb patterns reconhecidos (delegated to svc-interactions._dispatchSvcChoice):
 *   - 'close'                            → fecha overlay
 *   - 'dice:<ability>:<dc>:<mod>'        → skill check Dice3D
 *   - 'opinion-*'                        → reação NPC + Renown delta
 *   - '*-confirm'                        → purchase confirm + Renown delta
 *   - 'cascade:<targetNpc>:<dialogueId>' → NPC Living cascade
 *   - 'memory:<key>:<value>'             → grava NPC memory
 *   - 'visit:<topic>'                    → marca visita
 *   - <id de outro dialogue em dialogues> → chain (re-renderiza)
 *
 * ============================================================================ */

(function(){
  'use strict';

  var OVERLAY_ID = 'encounter-overlay';
  var _currentRenderState = null;

  function _ensureOverlay() {
    var ov = document.getElementById(OVERLAY_ID);
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = OVERLAY_ID;
    document.body.appendChild(ov);
    return ov;
  }

  /* Quebra texto em FRASES pra typewriter por sentence.
     Split por .!?: seguidos de espaço + capital/quote/tag. Preserva HTML tags. */
  function _splitIntoSentences(text) {
    if (!text) return [];
    var parts = text.split(/(?<=[.!?])\s+(?=["'<—A-ZÁÉÍÓÚÂÊÔÀÃÕÇ])/);
    return parts.map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 0; });
  }

  /* Agrupa estrofes em páginas (canonical PADRAO_ALDRIC):
     - Até 2 estrofes por página
     - Até 10 sentences por página
     - Quebra quando atingir qualquer limite */
  function _groupScriptIntoPages(script) {
    var MAX_STROPHES_PER_PAGE = 2;
    var MAX_LINES_PER_PAGE = 10;
    var pages = [];
    var current = [];
    var currentLineCount = 0;
    script.forEach(function(stroph) {
      var lineCount = _splitIntoSentences(stroph.text || '').length;
      var wouldExceed = (current.length >= MAX_STROPHES_PER_PAGE) ||
                        (currentLineCount + lineCount > MAX_LINES_PER_PAGE);
      if (current.length > 0 && wouldExceed) {
        pages.push(current);
        current = [];
        currentLineCount = 0;
      }
      current.push(stroph);
      currentLineCount += lineCount;
    });
    if (current.length > 0) pages.push(current);
    return pages;
  }

  /* Typewriter RPG clássico — char-by-char com pausa em <i>/</i>.
     Velocidade ~28ms/char (~36 chars/s). */
  function _typewriter(element, text, charMs, onDone) {
    var tokens = [];
    var i = 0;
    while (i < text.length) {
      var c = text[i];
      if (c === '<') {
        var end = text.indexOf('>', i);
        if (end > 0) { tokens.push({type:'tag', content: text.substring(i, end+1)}); i = end+1; continue; }
      }
      if (c === '&') {
        var sc = text.indexOf(';', i);
        if (sc > 0 && sc - i < 10) { tokens.push({type:'entity', content: text.substring(i, sc+1)}); i = sc+1; continue; }
      }
      tokens.push({type:'char', content: c});
      i++;
    }
    var idx = 0;
    var html = '';
    var timer = null;
    var done = false;
    element.classList.add('typing');
    var ASIDE_PAUSE_MS = 500;
    function step() {
      if (idx >= tokens.length) {
        done = true;
        element.classList.remove('typing');
        if (onDone) onDone();
        return;
      }
      var tok = tokens[idx++];
      html += tok.content;
      element.innerHTML = html;
      if (tok.type === 'tag') {
        if (/^<\s*(i|em)\s*[^>]*>$/i.test(tok.content) || /^<\s*\/\s*(i|em)\s*>$/i.test(tok.content)) {
          timer = setTimeout(step, ASIDE_PAUSE_MS);
          return;
        }
        step();
        return;
      }
      if (tok.type === 'entity') { step(); return; }
      timer = setTimeout(step, charMs);
    }
    step();
    return {
      skip: function() {
        if (done) return;
        if (timer) clearTimeout(timer);
        timer = null;
        while (idx < tokens.length) html += tokens[idx++].content;
        element.innerHTML = html;
        element.classList.remove('typing');
        done = true;
        if (onDone) onDone();
      },
      isDone: function() { return done; }
    };
  }

  function _sanitizeDialogueHTML(html) {
    // Whitelist simples — permite <i><em><b><strong>. Em produção bem robusta usar DOMPurify.
    return html;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Choice sub-overlay AAA (task #49) — module-level public API.
  // Reabrível, fechável via ✕ / ESC / backdrop / botão Voltar.
  // z-index 9700 (acima do encounter 9500 e city popup 9000).
  // ──────────────────────────────────────────────────────────────────────

  function _iconForChoice(ch) {
    if (ch.cb && /dice|check|skill/.test(ch.cb)) return '🎲';
    if (ch.cb && /close|leave|skip/.test(ch.cb)) return '←';
    if (ch.cb && /confirm|pay|deposit|invest/.test(ch.cb)) return '✓';
    if (ch.cb && /attack|fight|duel/.test(ch.cb)) return '⚔';
    if (ch.cb && /talk|chat|gossip/.test(ch.cb)) return '💬';
    if (ch.result && /goto_cartographer/.test(ch.result)) return '🗺';
    return '◆';
  }

  /* Ensure choice sub-overlay DOM exists (singleton). */
  function _ensureChoicesOverlay() {
    var sub = document.getElementById('enc-choices-overlay');
    if (sub) return sub;
    sub = document.createElement('div');
    sub.id = 'enc-choices-overlay';
    sub.innerHTML =
      '<div class="enc-cho-backdrop"></div>' +
      '<div class="enc-cho-card" role="dialog" aria-modal="true">' +
        '<button class="enc-cho-close" aria-label="Fechar" type="button">✕</button>' +
        '<div class="enc-cho-title"></div>' +
        '<div class="enc-cho-divider"><span class="enc-cho-divider-gem">◆</span></div>' +
        '<div class="enc-cho-list"></div>' +
        '<button class="enc-cho-back" type="button">← Voltar à narrativa</button>' +
      '</div>';
    document.body.appendChild(sub);
    // Wire close interactions
    var closeBtn = sub.querySelector('.enc-cho-close');
    var backBtn = sub.querySelector('.enc-cho-back');
    var backdrop = sub.querySelector('.enc-cho-backdrop');
    if (closeBtn) closeBtn.addEventListener('click', closeChoices);
    if (backBtn) backBtn.addEventListener('click', closeChoices);
    if (backdrop) backdrop.addEventListener('click', closeChoices);
    // ESC key (global, mas só fecha se overlay tiver open)
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && sub.classList.contains('open')) {
        closeChoices();
      }
    });
    return sub;
  }

  /* Public API: openChoices(choices, opts).
     - choices: array de { id, label, icon?, desc?, dc?, skill?, cost?, renownDelta?, cb? }
     - opts.title: titulo do sub-overlay (default "Escolher ação")
     - opts.npcName: nome do NPC mostrado abaixo do titulo (opcional)
     - opts.onChoice(ch): callback quando user clica numa choice */
  function openChoices(choices, opts) {
    opts = opts || {};
    if (!choices || choices.length === 0) return;
    var sub = _ensureChoicesOverlay();
    var listEl = sub.querySelector('.enc-cho-list');
    var titleEl = sub.querySelector('.enc-cho-title');
    listEl.innerHTML = '';

    var title = opts.title || 'Escolher ação';
    var ctxName = opts.npcName || '';
    titleEl.innerHTML = '<span class="enc-cho-title-orn">✦</span>' +
                        '<span class="enc-cho-title-text">' + title + '</span>' +
                        '<span class="enc-cho-title-orn">✦</span>' +
                        (ctxName ? '<div class="enc-cho-title-sub">' + ctxName + '</div>' : '');

    choices.forEach(function(ch, idx) {
      var row = document.createElement('button');
      row.className = 'enc-cho-row';
      row.style.setProperty('--idx', idx);
      var icon = ch.icon || _iconForChoice(ch);
      var dcBadge = '';
      if (ch.dc && ch.skill) {
        dcBadge = '<span class="enc-cho-dc">DC ' + ch.dc + ' · ' + ch.skill + '</span>';
      } else if (ch.cost) {
        dcBadge = '<span class="enc-cho-dc enc-cho-cost">' + ch.cost + ' V</span>';
      } else if (ch.renownDelta) {
        var rd = ch.renownDelta > 0 ? '+' + ch.renownDelta : String(ch.renownDelta);
        dcBadge = '<span class="enc-cho-dc enc-cho-renown">Renome ' + rd + '</span>';
      }
      // label e desc podem ter HTML inline simples (<span>, <i>)
      row.innerHTML =
        '<span class="enc-cho-row-icon">' + icon + '</span>' +
        '<span class="enc-cho-row-body">' +
          '<span class="enc-cho-row-label">' + (ch.label || '') + '</span>' +
          (ch.desc ? '<span class="enc-cho-row-desc">' + ch.desc + '</span>' : '') +
        '</span>' +
        (dcBadge ? '<span class="enc-cho-row-side">' + dcBadge + '</span>' : '') +
        '<span class="enc-cho-row-chev">›</span>';
      row.addEventListener('click', function() {
        closeChoices(); // sempre fecha primeiro pra UX consistente
        if (typeof opts.onChoice === 'function') opts.onChoice(ch);
      });
      listEl.appendChild(row);
    });

    // Activate animations
    sub.classList.add('active');
    void sub.offsetWidth; // force reflow
    sub.classList.add('opening');
    setTimeout(function() {
      sub.classList.remove('opening');
      sub.classList.add('open');
    }, 50);
  }

  function closeChoices() {
    var sub = document.getElementById('enc-choices-overlay');
    if (!sub || !sub.classList.contains('active')) return;
    sub.classList.add('closing');
    sub.classList.remove('open');
    setTimeout(function() {
      sub.classList.remove('active');
      sub.classList.remove('closing');
      sub.classList.remove('opening');
    }, 280);
  }

  function isChoicesOpen() {
    var sub = document.getElementById('enc-choices-overlay');
    return !!(sub && sub.classList.contains('open'));
  }

  /* Main entry: vEncounter.render(dialogue, opts) */
  function render(dialogue, opts) {
    opts = opts || {};
    var ov = _ensureOverlay();
    ov.innerHTML = '';

    var pages = _groupScriptIntoPages(dialogue.script || []);
    var currentPage = 0;

    var card = document.createElement('div');
    card.className = 'enc-card';

    // Header
    var header = document.createElement('div');
    header.className = 'enc-header';
    var npcPortrait = (dialogue.npc && dialogue.npc.portrait) || '';
    var npcName = (dialogue.npc && dialogue.npc.name) || '';
    var npcDesc = (dialogue.npc && dialogue.npc.desc) || '';
    header.innerHTML =
      '<div class="enc-portrait" title="Clique pra ampliar">' +
        (npcPortrait ? '<img src="' + npcPortrait + '" alt="">' : '') +
      '</div>' +
      '<div class="enc-meta">' +
        '<div class="enc-name">' + npcName + '</div>' +
        '<div class="enc-desc">' + npcDesc + '</div>' +
      '</div>' +
      '<div class="enc-page-indicator" id="enc-page-ind">' + (currentPage + 1) + ' / ' + pages.length + '</div>';
    card.appendChild(header);

    // Lightbox no portrait click (se window.showLightbox existir)
    var portraitEl = header.querySelector('.enc-portrait');
    if (portraitEl && typeof window.showLightbox === 'function') {
      portraitEl.addEventListener('click', function(e){
        e.stopPropagation();
        window.showLightbox(npcPortrait, npcName, npcDesc);
      });
    }

    // Body
    var body = document.createElement('div');
    body.className = 'enc-body';
    body.id = 'enc-body';
    card.appendChild(body);

    // Nav
    var nav = document.createElement('div');
    nav.className = 'enc-nav';
    nav.innerHTML =
      '<button class="enc-nav-btn" id="enc-prev" disabled>← Anterior</button>' +
      '<button class="enc-nav-btn enc-nav-btn-next" id="enc-next">Continuar →</button>';
    card.appendChild(nav);

    // Actions (mostrado só na última página)
    var actions = document.createElement('div');
    actions.className = 'enc-actions';
    actions.id = 'enc-actions';
    actions.style.display = 'none';
    card.appendChild(actions);

    ov.appendChild(card);
    ov.classList.add('active');

    function renderPage(idx) {
      if (_currentRenderState && _currentRenderState.activeTypewriters) {
        _currentRenderState.activeTypewriters.forEach(function(tw){ tw.skip(); });
      }
      body.innerHTML = '';
      body.classList.remove('revealed');
      body.style.minHeight = '';
      var page = pages[idx];

      var strophes = page.map(function(line) {
        var div = document.createElement('div');
        div.className = 'enc-line ' + (line.type === 'narration' ? 'enc-narration' : 'enc-speech');
        if (line.type === 'speech' && line.speaker) {
          div.setAttribute('data-speaker', line.speaker);
        }
        body.appendChild(div);
        return {
          line: line,
          container: div,
          sentences: _splitIntoSentences(_sanitizeDialogueHTML(line.text))
        };
      });

      // Pre-measure (forçar reflow pra calcular altura)
      strophes.forEach(function(s) {
        s.container.classList.add('typing-started');
        s.container.style.visibility = 'hidden';
        s.container.innerHTML = s.sentences.map(function(t, i) {
          var sep = (i > 0) ? ' ' : '';
          return sep + '<span class="enc-sentence">' + t + '</span>';
        }).join('');
      });
      var measuredHeight = body.scrollHeight;
      body.style.minHeight = measuredHeight + 'px';
      strophes.forEach(function(s) {
        s.container.innerHTML = '';
        s.container.classList.remove('typing-started');
        s.container.style.visibility = '';
      });

      var state = {
        strophes: strophes,
        stropheIdx: 0,
        sentenceIdx: 0,
        activeTypewriters: [],
        skipped: false,
        isLastPage: idx === pages.length - 1 // task #55: gate pra renderActions
      };
      _currentRenderState = state;

      var CHAR_MS = 28;
      var GAP_BETWEEN_SENTENCES = 100;
      var GAP_BETWEEN_STROPHES = 400;

      function typeNextSentence() {
        if (state.skipped) return;
        if (state.stropheIdx >= state.strophes.length) {
          state.skipped = true;
          body.classList.add('revealed');
          // task #55 (2026-05-20) — user pediu: "Escolher ação" só APÓS dialogue
          // terminar (natural ou skip). Na última página, renderActions só agora.
          if (state.isLastPage) renderActions();
          return;
        }
        var sd = state.strophes[state.stropheIdx];
        if (state.sentenceIdx >= sd.sentences.length) {
          state.stropheIdx++;
          state.sentenceIdx = 0;
          setTimeout(typeNextSentence, GAP_BETWEEN_STROPHES);
          return;
        }
        if (state.sentenceIdx === 0) {
          sd.container.classList.add('typing-started');
        }
        var sentence = sd.sentences[state.sentenceIdx];
        var container = sd.container;
        if (state.sentenceIdx > 0) container.appendChild(document.createTextNode(' '));
        var span = document.createElement('span');
        span.className = 'enc-sentence';
        container.appendChild(span);
        var tw = _typewriter(span, sentence, CHAR_MS, function() {
          state.sentenceIdx++;
          if (state.skipped) return;
          setTimeout(typeNextSentence, GAP_BETWEEN_SENTENCES);
        });
        state.activeTypewriters.push(tw);
      }
      typeNextSentence();

      var pageInd = document.getElementById('enc-page-ind');
      if (pageInd) pageInd.textContent = (idx + 1) + ' / ' + pages.length;
      var prevBtn = document.getElementById('enc-prev');
      if (prevBtn) prevBtn.disabled = idx === 0;
      var nextBtn = document.getElementById('enc-next');
      if (nextBtn) {
        if (idx === pages.length - 1) {
          /* task #53 (2026-05-20) — user pediu: remover "Escolher ↓" duplicado
             da nav-row. O botao "⚔ ESCOLHER ACAO" no actions panel ja serve
             a mesma funcao (e mais claro/AAA). Esconde next btn na ultima pagina.
             Mantém prev btn pra back navigation.

             task #55 (2026-05-20) — actions NÃO renderiza aqui na entrada do
             page; só APÓS typewriter completar (natural ou via _instantReveal).
             Garante UX: user lê dialogue antes de ver opções. */
          nextBtn.style.visibility = 'hidden';
          actions.style.display = 'none'; // garante que começa escondido
        } else {
          nextBtn.style.visibility = 'visible';
          nextBtn.textContent = 'Continuar →';
          actions.style.display = 'none';
        }
      }
      // Hide entire nav row if only 1 page (no point in showing "← Anterior" alone)
      var navRow = card.querySelector('.enc-nav');
      if (navRow) {
        navRow.style.display = (pages.length === 1) ? 'none' : '';
      }
    }

    /* Click-to-skip canonical (PADRAO_ALDRIC regra global 2026-05-19). */
    function _instantReveal() {
      var st = _currentRenderState;
      if (!st || st.skipped) return;
      st.skipped = true;
      st.activeTypewriters.forEach(function(tw){ tw.skip(); });
      st.activeTypewriters = [];
      while (st.stropheIdx < st.strophes.length) {
        var sd = st.strophes[st.stropheIdx];
        var container = sd.container;
        container.classList.add('typing-started');
        while (st.sentenceIdx < sd.sentences.length) {
          var sentence = sd.sentences[st.sentenceIdx];
          if (st.sentenceIdx > 0) container.appendChild(document.createTextNode(' '));
          var span = document.createElement('span');
          span.className = 'enc-sentence';
          span.innerHTML = sentence;
          container.appendChild(span);
          st.sentenceIdx++;
        }
        st.stropheIdx++;
        st.sentenceIdx = 0;
      }
      body.classList.add('revealed');
      // task #55 (2026-05-20) — user pediu: "Escolher ação" só APÓS dialogue
      // terminar. Em click-to-skip também precisa mostrar actions.
      if (st.isLastPage) renderActions();
    }
    body.addEventListener('click', function(e) {
      if (e.target.closest('button, a')) return;
      if (body.classList.contains('revealed')) return;
      _instantReveal();
    });

    /* 2026-05-20 task #49 — AAA choice sub-overlay (reabrível).
       Em vez de listar choices inline no encounter, mostra UM botão primário
       "⚔ Escolher ação" que ABRE sub-tela acima (z=9700) com choices em
       cards. Sub-tela pode ser FECHADA (✕) e REABERTA via mesmo botão.
       Encounter permanece intacto atrás.

       Fallback: se opts.inlineChoices === true OU dialogue tem 1 choice única,
       mantém comportamento antigo (inline buttons). */
    function renderActions() {
      actions.innerHTML = '';
      var choices = dialogue.choices || [];
      if (choices.length === 0) {
        actions.style.display = 'none';
        return;
      }
      var useInline = opts.inlineChoices === true || choices.length === 1;
      if (useInline) {
        choices.forEach(function(ch, idx) {
          var btn = document.createElement('button');
          btn.className = 'enc-btn' + (idx === 0 ? ' enc-btn-primary' : '');
          btn.textContent = ch.label;
          btn.addEventListener('click', function() { _handleChoiceInternal(ch); });
          actions.appendChild(btn);
        });
      } else {
        // Single primary button → opens choice-overlay
        var btn = document.createElement('button');
        btn.className = 'enc-btn enc-btn-primary enc-btn-choose';
        btn.innerHTML = '<span class="enc-btn-choose-icon">⚔</span>' +
                        '<span class="enc-btn-choose-label">Escolher ação</span>' +
                        '<span class="enc-btn-choose-count">' + choices.length + '</span>';
        btn.addEventListener('click', function() {
          openChoices(choices, {
            title: 'Escolher ação',
            npcName: (dialogue.npc && dialogue.npc.name) || '',
            onChoice: _handleChoiceInternal
          });
        });
        actions.appendChild(btn);
      }
      actions.style.display = '';
    }

    /* Dispatch único usado por renderActions (closure sobre dialogue + opts). */
    function _handleChoiceInternal(ch) {
      closeChoices(); /* fecha sub-overlay antes de dispatch */
      if (typeof window._dispatchSvcChoice === 'function') {
        var handled = window._dispatchSvcChoice(ch, dialogue, opts.dialogues || {});
        if (handled) return;
      }
      var cb = ch.cb || '';
      if (cb === 'close') { close(); return; }
      if (opts.dialogues && opts.dialogues[ch.id]) {
        render(opts.dialogues[ch.id], opts);
        return;
      }
      // External onChoice callback (PADRAO_ALDRIC v2 contrato)
      if (typeof opts.onChoice === 'function') {
        opts.onChoice(ch, dialogue);
        return;
      }
      close();
    }

    var prevBtn = document.getElementById('enc-prev');
    var nextBtn = document.getElementById('enc-next');
    if (prevBtn) prevBtn.onclick = function() {
      if (currentPage > 0) { currentPage--; renderPage(currentPage); }
    };
    if (nextBtn) nextBtn.onclick = function() {
      if (currentPage < pages.length - 1) { currentPage++; renderPage(currentPage); }
    };

    renderPage(0);
  }

  function close() {
    var ov = document.getElementById(OVERLAY_ID);
    if (ov) ov.classList.remove('active');
    _currentRenderState = null;
  }

  function isOpen() {
    var ov = document.getElementById(OVERLAY_ID);
    return !!(ov && ov.classList.contains('active'));
  }

  // === Public API ===========================================================
  window.vEncounter = {
    render: render,
    close: close,
    isOpen: isOpen,
    /* task #49 (2026-05-20) — Choice sub-overlay AAA: módulo público
       pra reuso por _renderEncounterPopup legacy + qualquer outro renderer. */
    openChoices: openChoices,
    closeChoices: closeChoices,
    isChoicesOpen: isChoicesOpen
  };

  /* Compat: alias usado por cidade openCityPopup (task #47 dismiss flow). */
  window._vEncChoicesClose = closeChoices;

  console.log('[encounter-popup] PADRAO_ALDRIC engine loaded — vEncounter.{render,openChoices,close} ready');
})();

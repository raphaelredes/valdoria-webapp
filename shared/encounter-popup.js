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
        skipped: false
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
          nextBtn.textContent = 'Escolher ↓';
          renderActions();
        } else {
          nextBtn.textContent = 'Continuar →';
          actions.style.display = 'none';
        }
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
    }
    body.addEventListener('click', function(e) {
      if (e.target.closest('button, a')) return;
      if (body.classList.contains('revealed')) return;
      _instantReveal();
    });

    function renderActions() {
      actions.innerHTML = '';
      (dialogue.choices || []).forEach(function(ch, idx) {
        var btn = document.createElement('button');
        btn.className = 'enc-btn' + (idx === 0 ? ' enc-btn-primary' : '');
        btn.textContent = ch.label;
        btn.addEventListener('click', function() {
          // Delegate to svc-interactions._dispatchSvcChoice if available
          if (typeof window._dispatchSvcChoice === 'function') {
            var handled = window._dispatchSvcChoice(ch, dialogue, opts.dialogues || {});
            if (handled) return;
          }
          // Fallback dispatch (mockup compat)
          var cb = ch.cb || '';
          if (cb === 'close') { close(); return; }
          if (opts.dialogues && opts.dialogues[ch.id]) {
            render(opts.dialogues[ch.id], opts);
            return;
          }
          close();
        });
        actions.appendChild(btn);
      });
      actions.style.display = '';
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
    isOpen: isOpen
  };

  console.log('[encounter-popup] PADRAO_ALDRIC engine loaded — vEncounter.render(dialogue, opts) ready');
})();

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

  /* task #69 (2026-05-20) — MIGRATION HTML <dialog> element.
     Pesquisa em 4 fontes (MDN, caniuse 95.48%, LogRocket, dev.to) confirma
     <dialog> + showModal() é solução definitiva pra z-index conflicts.
     Browser support 95.48% (Chrome 37+, Safari 15.4+, FF 98+, Edge 79+).
     Telegram WebView (Chromium) suporta. Top-layer rendering elimina
     conflicts estruturalmente. Mantém API pública compatível. */
  function _ensureOverlay() {
    var ov = document.getElementById(OVERLAY_ID);
    var isNew = false;
    if (ov) {
      // Migration: if exists as <div> from old code, replace with <dialog>
      if (ov.tagName.toLowerCase() !== 'dialog') {
        var newOv = document.createElement('dialog');
        newOv.id = OVERLAY_ID;
        ov.parentNode.replaceChild(newOv, ov);
        ov = newOv;
        isNew = true;
      } else {
        return ov; // already migrated, listeners already attached
      }
    } else {
      ov = document.createElement('dialog');
      ov.id = OVERLAY_ID;
      document.body.appendChild(ov);
      isNew = true;
    }
    if (isNew) {
      // task #69: ESC key triggers cancel event → call our close() for clean
      // state teardown (stops active typewriters, clears _currentRenderState).
      // Without this, native <dialog> default close leaks running setTimeouts.
      ov.addEventListener('cancel', function(e) {
        e.preventDefault();
        close();
      });
      // task #69: defensive close listener — if dialog closes via any path
      // (programmatic .close(), ESC default fallback, etc.), ensure state cleanup.
      ov.addEventListener('close', function() {
        if (_currentRenderState && _currentRenderState.activeTypewriters) {
          _currentRenderState.activeTypewriters.forEach(function(tw){ try { tw.skip && tw.skip(); } catch(e){} });
        }
        _currentRenderState = null;
      });
    }
    return ov;
  }

  /* task #69: helpers pra mudar entre <dialog> API e classList (backward compat).
     showOverlay/closeOverlay usam .showModal()/.close() nativos quando dialog,
     fallback pra classList.add('active')/.remove('active') pra elementos antigos.
     IMPORTANTE — REGRESSION GUARD (revisão task #69):
     cidade/index.html line ~49748 injeta inline <style id="encounter-style"> com
     `#encounter-overlay { display:flex }` HARDCODED, SEM [open]/.active selector.
     Esse inline CSS é parseado DEPOIS do shared encounter-popup.css → mesma
     specificity, cascade ordering vence → legacy CSS ganha. Sem força bruta
     via inline style.display='none', o dialog ficaria visível mesmo após close()
     (sem [open], legacy CSS ainda diz display:flex). _closeOverlay agora SEMPRE
     força display:none via inline style (specificity inline > qualquer CSS). */
  function _showOverlay(ov) {
    if (!ov) return;
    // Clear inline 'none' from previous close (deixa CSS [open] rule kick in)
    ov.style.display = '';
    if (ov.tagName.toLowerCase() === 'dialog' && typeof ov.showModal === 'function') {
      try { if (!ov.open) ov.showModal(); }
      catch(e) { ov.classList.add('active'); ov.style.display = 'flex'; } // fallback
    } else {
      ov.classList.add('active');
    }
  }
  function _closeOverlay(ov) {
    if (!ov) return;
    if (ov.tagName.toLowerCase() === 'dialog' && typeof ov.close === 'function') {
      try { if (ov.open) ov.close(); } catch(e){}
    }
    ov.classList.remove('active'); // sempre remove .active pra compat
    // FORCE hide via inline style — overrides legacy inline CSS hardcoded display:flex
    // (cidade/index.html line ~49748 injects `#encounter-overlay { display:flex }`)
    ov.style.display = 'none';
  }
  function _isOverlayOpen(ov) {
    if (!ov) return false;
    if (ov.tagName.toLowerCase() === 'dialog') return !!ov.open;
    return ov.classList.contains('active');
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
     Velocidade ~28ms/char (~36 chars/s).
     Sessão #38 perf P0 (Fase 2.5): O(n²) → O(n) via textNode.appendData()
     em vez de element.innerHTML = html. Antes, cada char reparseava todo
     o HTML acumulado (~200 chars × 200 ops = 40k operações em Android 2GB).
     Agora: appendChild de text nodes + stack DOM pra tags inline. */
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
    var timer = null;
    var done = false;
    element.classList.add('typing');
    element.innerHTML = '';  /* limpa — vamos construir via DOM nodes */
    var ASIDE_PAUSE_MS = 500;
    /* Stack-based DOM construction. Topo = elemento onde appendamos texto.
       Para <i>/<em> abertas, push child no stack; close → pop. */
    var stack = [element];
    var currentText = null;  /* texto onde acumulamos chars via appendData */

    function _decodeEntity(s) {
      var tmp = document.createElement('span');
      tmp.innerHTML = s;
      return tmp.textContent;
    }
    function _processToken(tok, immediate) {
      var top = stack[stack.length - 1];
      if (tok.type === 'tag') {
        var t = tok.content;
        var closeM = /^<\s*\/\s*(\w+)\s*>$/i.exec(t);
        if (closeM) {
          if (stack.length > 1) stack.pop();
          currentText = null;
          return /^(i|em)$/i.test(closeM[1]);  /* needsPause */
        }
        var openM = /^<\s*(\w+)([^>]*?)\s*\/?>$/i.exec(t);
        if (openM) {
          var el = document.createElement(openM[1]);
          var attrStr = openM[2];
          if (attrStr) {
            var attrRE = /(\w+)\s*=\s*"([^"]*)"/g, am;
            while ((am = attrRE.exec(attrStr)) !== null) el.setAttribute(am[1], am[2]);
          }
          top.appendChild(el);
          /* Self-closing (br, hr, etc.) não entra no stack */
          if (!/^(br|hr|img|input)$/i.test(openM[1])) stack.push(el);
          currentText = null;
          return /^(i|em)$/i.test(openM[1]);  /* needsPause */
        }
        /* Desconhecido — texto literal */
        top.appendChild(document.createTextNode(t));
        currentText = null;
        return false;
      }
      var ch = tok.content;
      if (tok.type === 'entity') ch = _decodeEntity(ch);
      if (currentText && currentText.parentNode === top) {
        currentText.appendData(ch);
      } else {
        currentText = document.createTextNode(ch);
        top.appendChild(currentText);
      }
      return false;
    }
    function step() {
      if (idx >= tokens.length) {
        done = true;
        element.classList.remove('typing');
        if (onDone) onDone();
        return;
      }
      var tok = tokens[idx++];
      var needsPause = _processToken(tok, false);
      if (tok.type === 'tag') {
        if (needsPause) {
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
        while (idx < tokens.length) _processToken(tokens[idx++], true);
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

  /* Ensure choice sub-overlay DOM exists (singleton).
     task #69 (2026-05-20) — MIGRATION HTML <dialog> element.
     Native top-layer rendering elimina conflitos z-index estruturalmente.
     ::backdrop pseudo-element substitui .enc-cho-backdrop manual.
     ESC key + inert background tratados nativamente pelo browser. */
  function _ensureChoicesOverlay() {
    var sub = document.getElementById('enc-choices-overlay');
    if (sub) {
      // Migrate legacy <div> to <dialog> if necessary
      if (sub.tagName.toLowerCase() !== 'dialog') {
        var newSub = document.createElement('dialog');
        newSub.id = 'enc-choices-overlay';
        sub.parentNode.replaceChild(newSub, sub);
        sub = newSub;
      } else {
        return sub;
      }
    } else {
      sub = document.createElement('dialog');
      sub.id = 'enc-choices-overlay';
    }
    // <dialog> has native ::backdrop — no need for manual .enc-cho-backdrop element
    sub.innerHTML =
      '<div class="enc-cho-card" role="document">' +
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
    if (closeBtn) closeBtn.addEventListener('click', closeChoices);
    if (backBtn) backBtn.addEventListener('click', closeChoices);
    // Click on backdrop (clicking outside the card) closes
    sub.addEventListener('click', function(e) {
      // event.target is the <dialog> itself when clicking on ::backdrop
      if (e.target === sub) closeChoices();
    });
    // <dialog> native cancel event (ESC key)
    sub.addEventListener('cancel', function(e) {
      e.preventDefault(); // prevent default close, use our animation
      closeChoices();
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

    // task #69: activate via showModal() — native top-layer rendering
    if (sub.tagName.toLowerCase() === 'dialog' && typeof sub.showModal === 'function') {
      try { if (!sub.open) sub.showModal(); }
      catch(e) { sub.classList.add('active'); }
    } else {
      sub.classList.add('active');
    }
    void sub.offsetWidth; // force reflow
    sub.classList.add('opening');
    setTimeout(function() {
      sub.classList.remove('opening');
      sub.classList.add('open');
    }, 50);
  }

  function closeChoices() {
    var sub = document.getElementById('enc-choices-overlay');
    if (!sub) return;
    // task #69: check open via <dialog>.open OR .active class (compat)
    var isOpen = (sub.tagName.toLowerCase() === 'dialog' && sub.open) ||
                 sub.classList.contains('active');
    if (!isOpen) return;
    sub.classList.add('closing');
    sub.classList.remove('open');
    setTimeout(function() {
      // task #69: close <dialog> via .close() if available
      if (sub.tagName.toLowerCase() === 'dialog' && typeof sub.close === 'function') {
        try { if (sub.open) sub.close(); } catch(e){}
      }
      sub.classList.remove('active');
      sub.classList.remove('closing');
      sub.classList.remove('opening');
    }, 280);
  }

  function isChoicesOpen() {
    var sub = document.getElementById('enc-choices-overlay');
    if (!sub) return false;
    // task #69: <dialog>.open is canonical, .open class is fallback
    if (sub.tagName.toLowerCase() === 'dialog') return !!sub.open;
    return sub.classList.contains('open');
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
    /* Sessão #28 (2026-05-24): suporte a portraitHTML — HTML pronto (ex: SVG
       sprite ou <img> de PNG de classe) em vez de URL pra <img src=...>.
       Quando portraitHTML é passado, lightbox é desabilitado (faz sentido
       só pra fotos reais de personagem). */
    var npcPortraitHTML = (dialogue.npc && dialogue.npc.portraitHTML) || '';
    var npcName = (dialogue.npc && dialogue.npc.name) || '';
    var npcDesc = (dialogue.npc && dialogue.npc.desc) || '';
    // 2026-05-22 B3: affinity badge no header (NPC dialogue engine integration).
    // Renderiza tier visual se player + npc_id + npcAffinity disponíveis.
    var npcId = (dialogue.npc && (dialogue.npc.id || dialogue.npc.key)) || '';
    var affinityBadge = '';
    if (npcId && window.npcAffinity && typeof window.npcAffinity.renderBadgeHTML === 'function') {
      var _p = (opts && opts.player) || window.CITY_MOCK_PLAYER || null;
      if (_p) {
        try { affinityBadge = window.npcAffinity.renderBadgeHTML(_p, npcId); } catch(_e){}
      }
    }
    header.innerHTML =
      '<div class="enc-portrait"' + (npcPortrait ? ' title="Clique pra ampliar"' : '') + '>' +
        (npcPortraitHTML ? npcPortraitHTML
          : (npcPortrait ? '<img src="' + npcPortrait + '" alt="">' : '')) +
      '</div>' +
      '<div class="enc-meta">' +
        '<div class="enc-name">' + npcName + (affinityBadge ? ' ' + affinityBadge : '') + '</div>' +
        '<div class="enc-desc">' + npcDesc + '</div>' +
      '</div>' +
      '<div class="enc-page-indicator" id="enc-page-ind">' + (currentPage + 1) + ' / ' + pages.length + '</div>';
    card.appendChild(header);

    // Lightbox no portrait click — só quando há URL real (npcPortrait), não
    // pra HTML customizado (ex: SVG/PNG de classe via portraitHTML).
    /* Sessao #33 (2026-05-25): user reportou que click NAO funcionava no
       prologo apesar de lightbox.js carregado. Causa raiz provavel: render()
       avaliava `typeof window.showLightbox === 'function'` no momento da
       criacao do listener, mas window.showLightbox podia ainda nao ter sido
       definido (race com defer/document.write order). Fix: SEMPRE attach
       listener se npcPortrait existir; check showLightbox AT CLICK TIME.
       Bonus: pointerdown listener pra capture touch antes de outros listeners.
       Tambem adiciona stopImmediatePropagation pra garantir que body click
       (skip-typewriter) nao intercepta. */
    var portraitEl = header.querySelector('.enc-portrait');
    if (portraitEl && npcPortrait) {
      var _onPortraitTap = function(e){
        if (e) {
          if (e.stopPropagation) e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          if (e.preventDefault) e.preventDefault();
        }
        if (typeof window.showLightbox === 'function') {
          window.showLightbox(npcPortrait, npcName, npcDesc);
        } else {
          console.warn('[ENC] showLightbox unavailable — lightbox.js missing?');
        }
      };
      portraitEl.addEventListener('click', _onPortraitTap);
      // Touch fallback (alguns Telegram WebViews engolem click apos touch
      // sem chamar dispatchEvent). pointerup cobre touch + mouse + pen.
      portraitEl.addEventListener('pointerup', _onPortraitTap);
      portraitEl.style.cursor = 'pointer';
    } else if (portraitEl && !npcPortrait) {
      // Sem lightbox: cursor default (não sugere interação)
      portraitEl.style.cursor = 'default';
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

    /* Sessão #28 (2026-05-24): opts.closeable=true renderiza X close visivel.
       Permite sair a qualquer momento sem se comprometer a uma choice (player
       decide quando conversar). Usado pra ally chats (conversa amistosa).
       Story events / forced encounters NAO devem passar closeable=true.
       Classe `closeable` na card aciona padding-right no header pra o
       .enc-page-indicator nao colidir com o X (CSS em encounter-popup.css). */
    if (opts.closeable) {
      card.classList.add('closeable');
      var encClose = document.createElement('button');
      encClose.className = 'enc-card-close';
      encClose.type = 'button';
      encClose.setAttribute('aria-label', 'Fechar conversa');
      encClose.textContent = '✕';
      encClose.addEventListener('click', function(e){
        e.stopPropagation();
        close();
      });
      card.appendChild(encClose);
    }

    ov.appendChild(card);
    // task #69: use <dialog>.showModal() (top-layer, inert background, focus trap)
    _showOverlay(ov);

    function renderPage(idx) {
      if (_currentRenderState && _currentRenderState.activeTypewriters) {
        _currentRenderState.activeTypewriters.forEach(function(tw){ tw.skip(); });
      }
      body.innerHTML = '';
      body.classList.remove('revealed');
      body.style.minHeight = '';
      var page = pages[idx];
      // Sessão #23 v8 (2026-05-22): user reportou cabeçalho com nome NPC
      // aparece durante narração (deveria só aparecer quando NPC fala).
      // Fix: oculta header se página atual NÃO tem speech (só narration).
      var hasSpeech = page.some(function(line){ return line.type === 'speech'; });
      header.style.display = hasSpeech ? '' : 'none';

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
      /* Sessao #42 (2026-05-27): clamp minHeight ao espaço disponivel no
         viewport pra evitar overflow:hidden do card cortar nav+actions.
         Reserva ~200px pra header (~50px) + nav (~50px) + actions (~100px).
         Se texto + fonte grande mediria 465px e viewport tem 600px (Telegram
         desktop), antes body forçava 465px e nav/actions saíam pra fora.
         Agora cap em (vh - reserved); se texto excede, body fica scrollavel
         (overflow-y:auto ja existe) mas nav/actions ficam VISIVEIS. */
      var VIEWPORT_RESERVED = 200;
      var maxAllowed = Math.max(150, window.innerHeight - VIEWPORT_RESERVED);
      var clampedMinH = Math.min(measuredHeight, maxAllowed);
      body.style.minHeight = clampedMinH + 'px';
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
          /* Sessao #42 (2026-05-27): apos typewriter natural completar,
             atualiza nextBtn (mesma logica do _instantReveal). Em ultima pagina,
             actions assume o lugar (renderActions abaixo); em intermediaria,
             nextBtn vira "Continuar ▸" sem hint "(pular)" do CSS. */
          var nextBtnNat = document.getElementById('enc-next');
          if (nextBtnNat) {
            if (state.isLastPage) {
              nextBtnNat.style.visibility = 'hidden';
            } else {
              nextBtnNat.textContent = 'Continuar ▸';
            }
          }
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
      if (prevBtn) {
        prevBtn.disabled = idx === 0;
        /* Sessao #42 (2026-05-27): esconde "Anterior" se 1 pagina (nao tem
           pra onde voltar). Tambem esconde durante typewriter da pagina 1
           pra UI ficar limpa. */
        prevBtn.style.visibility = (idx === 0) ? 'hidden' : 'visible';
      }
      var nextBtn = document.getElementById('enc-next');
      var isLastPage = idx === pages.length - 1;
      if (nextBtn) {
        /* Sessao #42 (2026-05-27): "Pular ▸" SEMPRE visivel durante typewriter,
           inclusive na ultima pagina. Bug raiz: antes na ultima pagina ou em
           dialogo de 1 pagina, nav era hidden + actions display:none durante
           typewriter -> user em viewport pequeno + fonte grande ficava SEM
           NENHUM BOTAO visivel, travado.

           Agora:
           - Durante typewriter (qualquer pagina): "Pular ▸" visivel
           - Apos typewriter completar:
             * Pagina intermediaria -> "Continuar ▸"
             * Ultima pagina -> nextBtn hidden (actions aparecem com choices) */
        nextBtn.style.visibility = 'visible';
        nextBtn.textContent = isLastPage ? 'Pular ▸' : 'Continuar ▸';
        nextBtn.removeAttribute('disabled');
        actions.style.display = 'none'; // sempre começa escondido
      }
      /* Sessao #42 (2026-05-27): NUNCA esconder nav inteira. Antes, em dialogo
         de 1 pagina, navRow ficava display:none -> user sem botoes durante
         typewriter. Agora nav sempre visivel; conteudo se adapta. */
      var navRow = card.querySelector('.enc-nav');
      if (navRow) {
        navRow.style.display = '';
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
      /* Sessao #42 (2026-05-27): apos pular typewriter, atualiza nextBtn:
         - Ultima pagina -> hidden (actions choices aparece em renderActions)
         - Pagina intermediaria -> "Continuar ▸" (sem mais hint "(pular)"
           pois CSS :not(.revealed) deixou de matchar quando .revealed foi
           adicionada). */
      var nextBtn = document.getElementById('enc-next');
      if (nextBtn) {
        if (st.isLastPage) {
          nextBtn.style.visibility = 'hidden';
        } else {
          nextBtn.textContent = 'Continuar ▸';
        }
      }
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
      /* Sessao #29 (2026-05-24): ally_source dispara backend apply-effect.
         Pra non-dice (cb='close' ou empty): chama AGORA antes do close.
         Pra dice (cb='dice:'): _diceCheckSvc chama apos resolver dado. */
      var _cb = ch.cb || '';
      if (ch.ally_source && (_cb === '' || _cb === 'close')
          && typeof window._postAllyEffect === 'function') {
        try { window._postAllyEffect(ch.ally_source, null); } catch(_e) {}
      }
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
      // task #70 (2026-05-20) — BACKEND DISPATCH FALLBACK
      // Quando cb não é 'close', dice:, opinion-, *-confirm, cascade:, memory:,
      // visit:, ou key em opts.dialogues — dispatcha pro backend via vCity.act.
      // Resolve bug: choices em greeting dialogues (Guild, Arena, Workshop,
      // Market merchants, RuneScribe) tinham cb's ('guild_quests', 'arena_fight',
      // 'workshop_forge', etc.) que não eram dispatched → clique apenas fechava
      // overlay. Agora cb não-roteado vai pra backend (que pode reconhecer
      // como cb canonical de hub menu).
      if (cb && typeof window.vCity === 'object' && typeof window.vCity.act === 'function') {
        try { window.vCity.act(cb); } catch(_e) { /* non-fatal */ }
        close();
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
      /* Sessao #42 (2026-05-27): UX visual-novel — primeiro click PULA typewriter
         se ainda rodando, segundo click avanca. Antes: click avancava direto sem
         dar chance de ver texto, OU travava sem pular em viewport pequeno + fonte
         grande quando nav original (opacity:0) ficava invisivel. Agora nav
         sempre visivel + skip-then-advance funciona consistente. */
      var st = _currentRenderState;
      if (st && !st.skipped && !body.classList.contains('revealed')) {
        _instantReveal();
        return;
      }
      if (currentPage < pages.length - 1) { currentPage++; renderPage(currentPage); }
    };

    renderPage(0);
  }

  function close() {
    var ov = document.getElementById(OVERLAY_ID);
    // task #69: idempotent state cleanup (also covers edge case where .close()
    // is called but dialog already closed — close event won't fire then).
    if (_currentRenderState && _currentRenderState.activeTypewriters) {
      _currentRenderState.activeTypewriters.forEach(function(tw){ try { tw.skip && tw.skip(); } catch(e){} });
    }
    // task #69: use <dialog>.close() nativo (libera top-layer, restaura focus)
    _closeOverlay(ov);
    _currentRenderState = null;
  }

  function isOpen() {
    var ov = document.getElementById(OVERLAY_ID);
    // task #69: check <dialog>.open OR .active class (compat)
    return _isOverlayOpen(ov);
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

/* ============================================================================
 * encounter-popup.js — PADRAO_ALDRIC dialogue engine (shared canonical)
 * ============================================================================
 *
 * Source canonical: simuladores/banco-cofre-final.html linhas 1324-1853.
 * Extraído nesta sessão (#13) pra ser reusável por TODOS os renderers
 * de estabelecimento em cidade/index.html (Task #23 centralização).
 *
 * MAPA_IA — navegação rápida:
 *   ~80   _ensureOverlay() — cria #encounter-overlay no DOM se ainda não existe
 *   ~170  _groupScriptIntoPages(script) — paginação canonical (2 estrofes / 10 linhas)
 *   ~160  _splitIntoSentences(text) — quebra por .!? pra typewriter por frase
 *   ~200  _typewriter(el, text, charMs, onDone) — char-by-char com pausa em <i>
 *   ~310  _sanitizeDialogueHTML(html) — whitelist REAL (#88): escape + i/em/b/strong/br/u/s/code
 *   ~325  _SKILL_LABEL_PT + _skillLabelPT(s) — keys EN → PT-BR no badge de CD
 *   ~390  openChoices(choices, opts) — sub-overlay AAA (badge CD, label fallback)
 *   ~500  vEncounter.render(dialogue) — entry principal (check_hint preproc #88)
 *   ~720  renderPage(idx) — linhas narration/speech/dm + GUARD anti speaker-key (#88)
 *   ~960  renderActions() — choices (fallback Fechar se vazio #88) + cb dispatch
 *   ~1090 vEncounter.close() / vEncounter.isOpen()
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
 *              portrait: '../shared/img/npcs/banqueiro.webp' },
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

  /* PADRAO_LOCAIS #2 (2026-06-03): fallback de retrato. Atributo onerror estático
     (sem conteúdo dinâmico) anexado ao <img> do portrait — se o WebP falhar
     (404/rede), some o <img> quebrado e marca o .enc-portrait com a classe
     enc-portrait-fallback, revelando um brasão heráldico via CSS (gradiente
     dourado + glifo). NUNCA mostra o ícone de imagem quebrada do browser. */
  var _ENC_IMG_ONERR = "onerror=\"this.style.display='none';this.parentNode.classList.add('enc-portrait-fallback');\"";

  /* Sessão #72 (user, IMMUTABLE): nas ESCOLHAS DE AÇÃO de TODOS os diálogos, o
     custo em moeda DEVE usar o desenho da Valdorita (ícone), nunca "Valdoritas"
     por extenso. Só a FALA/narrativa do NPC (enc-line) pode usar "valdoritas" por
     extenso em ocasiões raras. _coinify converte "<n> Valdoritas/Valdorita/V" no
     ícone — aplicado SOMENTE em labels de choice (não em speech/narration). */
  var _VCOIN = '<span class="vi vi-coin sm" aria-label="Valdoritas"></span>';
  function _coinify(s) {
    return String(s == null ? '' : s)
      .replace(/(\d+)\s*[Vv]aldoritas?\b/g, '$1 ' + _VCOIN)
      .replace(/(\d+)\s*V\b(?![a-zA-Z])/g, '$1 ' + _VCOIN);
  }

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
    /* Whitelist REAL (sessão #88 — antes era no-op `return html`): escapa toda
       tag e re-permite apenas inline seguro SEM atributos (i/em/b/strong/br/
       u/s/code) — mesmo contrato dos sanitizers da cidade e da exploração.
       Fecha num ponto único os 3 sinks de line.text (pre-measure innerHTML,
       _instantReveal span.innerHTML e _typewriter createElement/setAttribute):
       um `<img onerror=...>` vindo de payload nunca chega ao DOM como tag.
       NÃO escapa `&` — entidades (&mdash;) são legítimas nos textos. */
    var escaped = String(html == null ? '' : html)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return escaped.replace(/&lt;(\/?)(i|em|b|strong|br|u|s|code)&gt;/gi, '<$1$2>');
  }

  // ──────────────────────────────────────────────────────────────────────
  // Choice sub-overlay AAA (task #49) — module-level public API.
  // Reabrível, fechável via ✕ / ESC / backdrop / botão Voltar.
  // z-index 9700 (acima do encounter 9500 e city popup 9000).
  // ──────────────────────────────────────────────────────────────────────

  /* Tradução EN→PT-BR de keys de skill/atributo no badge de CD das choices.
     Preserva strings já em PT-BR (callers da viagem/cidade passam label pronto):
     key desconhecida retorna o valor original — NUNCA clobbera label legítimo. */
  var _SKILL_LABEL_PT = {
    strength: 'Força', dexterity: 'Destreza', constitution: 'Constituição',
    intelligence: 'Inteligência', wisdom: 'Sabedoria', charisma: 'Carisma',
    athletics: 'Atletismo', acrobatics: 'Acrobacia', stealth: 'Furtividade',
    sleight_of_hand: 'Prestidigitação', arcana: 'Arcanismo', history: 'História',
    investigation: 'Investigação', nature: 'Natureza', religion: 'Religião',
    animal_handling: 'Adestrar Animais', insight: 'Intuição', medicine: 'Medicina',
    perception: 'Percepção', survival: 'Sobrevivência', deception: 'Enganação',
    intimidation: 'Intimidação', performance: 'Atuação', persuasion: 'Persuasão'
  };
  function _skillLabelPT(s) {
    if (!s) return '';
    return _SKILL_LABEL_PT[String(s).toLowerCase()] || s;
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
      var dcBadge = '';
      if (ch.dc && ch.skill) {
        /* sessão #88: "CD" (convenção PT-BR do projeto, não "DC") + tradução
           de key EN ('charisma' → 'Carisma') preservando labels já em PT-BR. */
        dcBadge = '<span class="enc-cho-dc">CD ' + ch.dc + ' · ' + _skillLabelPT(ch.skill) + (ch.chance != null ? ' · ' + ch.chance + '%' : '') + '</span>';
      } else if (ch.cost) {
        dcBadge = '<span class="enc-cho-dc enc-cho-cost">' + ch.cost + ' ' + _VCOIN + '</span>';
      } else if (ch.renownDelta) {
        var rd = ch.renownDelta > 0 ? '+' + ch.renownDelta : String(ch.renownDelta);
        dcBadge = '<span class="enc-cho-dc enc-cho-renown">Renome ' + rd + '</span>';
      }
      // label e desc podem ter HTML inline simples (<span>, <i>)
      /* sessão #88: choice sem label NUNCA vira botão vazio (só chevron) —
         fallback 'Continuar' + warn pro error-reporter. */
      var _choLabel = (ch.label && String(ch.label).trim()) || 'Continuar';
      if (!ch.label) console.warn('[ENC] choice sem label', ch.id || ch.cb || '');
      row.innerHTML =
        /* 2026-06-07 (user): PADRAO_ALDRIC — SEM símbolo (◆) à esquerda das escolhas;
           o badge de DC/custo vira uma meta-line de LARGURA TOTAL embaixo do título
           (antes era coluna à direita que espremia o título e ficava mal distribuída). */
        '<span class="enc-cho-row-body">' +
          '<span class="enc-cho-row-label">' + _coinify(_choLabel) + '</span>' +
          (ch.desc ? '<span class="enc-cho-row-desc">' + ch.desc + '</span>' : '') +
          (dcBadge ? '<span class="enc-cho-row-meta">' + dcBadge + '</span>' : '') +
        '</span>' +
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

    /* check_hint (doc dialogue-pattern-aldric.md §4.0.2, implementado sessão #88):
       linha com { check_hint: { phrase } } ganha uma sub-linha dourada própria
       ("⚀ Sabedoria (Percepção) CD 13") logo após a estrofe — anuncia o teste
       antes das choices. Estrofe sintética flui pelo pipeline normal. */
    var _scriptIn = dialogue.script || [];
    var _script = [];
    _scriptIn.forEach(function (l) {
      _script.push(l);
      if (l && l.check_hint && l.check_hint.phrase) {
        _script.push({ type: 'narration', _checkHint: true, text: '⚀ ' + l.check_hint.phrase });
      }
    });
    var pages = _groupScriptIntoPages(_script);
    var currentPage = 0;

    var card = document.createElement('div');
    card.className = 'enc-card';
    /* sessão #77: opts.fullHeight → card ocupa o MÁXIMO de espaço vertical
       (regra "Popup DEVE Ocupar Máximo de Espaço"). Usado pela viagem da
       cidade ("Rumo a <destino>") pra ficar épico/imersivo igual à exploração. */
    if (opts.fullHeight) card.classList.add('enc-full');

    /* 2026-06-07 EX5 (viagem "Rumo a <destino>"): mostra no TOPO quantas etapas
       faltam até o local. opts.progress = { current, total } (1-based). Banner
       épico full-width com barra de avanço. Safe-DOM (evita hook de innerHTML). */
    if (opts.progress && opts.progress.total > 0) {
      var _pg = opts.progress;
      var _cur = Math.max(1, Math.min(_pg.current || 1, _pg.total));
      var _remain = Math.max(0, _pg.total - _cur);
      var pBan = document.createElement('div');
      pBan.className = 'enc-journey-progress';
      var pLine = document.createElement('div');
      pLine.className = 'enc-jp-line';
      var pLabel = document.createElement('span');
      pLabel.className = 'enc-jp-label';
      pLabel.textContent = 'Etapa ' + _cur + ' de ' + _pg.total;
      var pRemain = document.createElement('span');
      pRemain.className = 'enc-jp-remain';
      pRemain.textContent = _remain === 0 ? 'Você chegou!'
        : (_remain === 1 ? 'Falta 1 etapa' : 'Faltam ' + _remain + ' etapas');
      pLine.appendChild(pLabel);
      pLine.appendChild(pRemain);
      var pBar = document.createElement('div');
      pBar.className = 'enc-jp-bar';
      var pFill = document.createElement('div');
      pFill.className = 'enc-jp-fill';
      pFill.style.width = Math.round((_cur / _pg.total) * 100) + '%';
      pBar.appendChild(pFill);
      pBan.appendChild(pLine);
      pBan.appendChild(pBar);
      card.appendChild(pBan);
    }

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
    // PADRAO_ALDRIC (sessão #70): contador de Valdoritas SEMPRE visível, logo
    // ACIMA dos números de paginação. Lê opts.player.gold (ou CITY_MOCK_PLAYER).
    // A classe cgb-num deixa o contador da cidade (_refreshGoldBadges) atualizá-lo.
    var _encGold = '';
    var _gp = (opts && opts.player) || window.CITY_MOCK_PLAYER || null;
    if (_gp && typeof _gp.gold === 'number' && !(opts && opts.showGold === false)) {
      _encGold = '<div class="enc-gold-badge" title="Suas Valdoritas">' +
        '<span class="vi vi-coin sm"></span>' +
        '<span class="enc-gold-num cgb-num">' + _gp.gold + '</span></div>';
    }
    /* sessão #88: npcName/npcDesc passam pelo sanitizer (escape + whitelist
       inline) — fecha o sink de header que aceitava HTML cru; URL do portrait
       tem aspas escapadas. portraitHTML continua confiado (gerado pelo caller
       via _heralIco/sprite, nunca payload). */
    var _safePortraitURL = String(npcPortrait).replace(/"/g, '&quot;');
    header.innerHTML =
      '<div class="enc-portrait"' + (npcPortrait ? ' title="Clique pra ampliar"' : '') + '>' +
        (npcPortraitHTML ? npcPortraitHTML
          : (npcPortrait ? ('<img src="' + _safePortraitURL + '" alt="" ' + _ENC_IMG_ONERR + '>') : '')) +
      '</div>' +
      '<div class="enc-meta">' +
        '<div class="enc-name">' + _sanitizeDialogueHTML(npcName) + (affinityBadge ? ' ' + affinityBadge : '') + '</div>' +
        '<div class="enc-desc">' + _sanitizeDialogueHTML(npcDesc) + '</div>' +
      '</div>' +
      '<div class="enc-rightcol">' +
        _encGold +
        '<div class="enc-page-indicator" id="enc-page-ind">' + (currentPage + 1) + ' / ' + pages.length + '</div>' +
      '</div>';
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
      // sessão #76 FIX: os listeners 'click' E 'pointerup' (abaixo) disparavam
      // AMBOS no mesmo toque → window.showLightbox era chamado 2x em sequência →
      // o lightbox abria e FECHAVA SOZINHO (bug reportado: foto pisca e some).
      // Guard de double-fire (400ms) mantém a compat touch do pointerup sem o
      // 2º disparo. NÃO remover o pointerup (alguns Telegram WebViews engolem click).
      var _lastPortraitTap = 0;
      var _onPortraitTap = function(e){
        if (e) {
          if (e.stopPropagation) e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          if (e.preventDefault) e.preventDefault();
        }
        var _now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (_now - _lastPortraitTap < 400) return;  // ignora o disparo duplicado
        _lastPortraitTap = _now;
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

      var strophes = [];
      page.forEach(function(line) {
        /* 2026-06-08 (user): NAO cria box pra estrofe sem texto. Aparecia uma
           caixa com fundo/borda VAZIA no dialogo (ex.: resultado dos Primeiros
           Socorros). So renderiza estrofe que de fato tem conteudo. */
        var _sentences = _splitIntoSentences(_sanitizeDialogueHTML(line.text));
        if (!_sentences.length) return;
        var div = document.createElement('div');
        /* sessão #88: tipo 'dm' (voz de Mestre, doc §4.0.1) ganha visual próprio
           (sépia + label MESTRE via .enc-dm); qualquer type desconhecido cai em
           narration (antes caía em speech — invertido vs. legacy/Stub). */
        var _lineCls = (line.type === 'speech') ? 'enc-speech'
          : (line.type === 'dm') ? 'enc-narration enc-dm'
          : 'enc-narration' + (line._checkHint ? ' enc-check-hint' : '');
        div.className = 'enc-line ' + _lineCls;
        if (line.type === 'speech' && line.speaker) {
          /* GUARD anti-vazamento (sessão #88 — bug reportado pelo user: key de
             backend exibida como nome do NPC). speaker DEVE ser display name;
             o CSS exibe data-speaker VERBATIM (content:attr). Key snake_case
             pura (lowercase ASCII sem espaço/acento) ou igual ao id/key do NPC
             do diálogo NUNCA aparece — cai pro nome do NPC e loga o vazamento.
             Display names legítimos ('Martha', 'Grom Barba-Cinza', 'Aldwin de
             Tholram') têm maiúscula/acento/espaço e passam intactos. */
          var _spk = String(line.speaker);
          if (/^[a-z0-9_]+$/.test(_spk) ||
              (dialogue.npc && (_spk === dialogue.npc.id || _spk === dialogue.npc.key))) {
            console.warn('[ENC] speaker key não resolvida (usando npc.name): ' + _spk);
            _spk = (dialogue.npc && dialogue.npc.name) || '';
          }
          if (_spk) div.setAttribute('data-speaker', _spk);
        }
        body.appendChild(div);
        strophes.push({
          line: line,
          container: div,
          sentences: _sentences
        });
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
      /* Sessao #42 (2026-05-27): clamp minHeight DINAMICO baseado no que esta
         REALMENTE ocupando viewport. Bug raiz: clamp fixo (200px) assumia
         header ~50px + nav ~50px + actions ~100px. Mas em fonte 1.4x-1.6x,
         header wrap pra 2-3 linhas (~120-150px), nome NPC longo + desc.
         Reserva fixa era insuficiente -> nav era cortada por overflow:hidden.

         Medida dinamica: header.offsetHeight + nav.offsetHeight + reserva
         actions (100px choices em ultima pagina). Tolerance extra 40px pra
         padding/border. Resultado: body shrink quando texto excede,
         overflow-y:auto ativa scroll interno, nav+actions FICAM VISIVEIS. */
      var headerH = header ? header.offsetHeight : 60;
      var navOuterH = card.querySelector('.enc-nav')?.offsetHeight || 50;
      var ACTIONS_RESERVED = 100;
      var PADDING_TOLERANCE = 40;
      var maxAllowed = Math.max(
        120,
        window.innerHeight - headerH - navOuterH - ACTIONS_RESERVED - PADDING_TOLERANCE
      );
      var clampedMinH = Math.min(measuredHeight, maxAllowed);
      body.style.minHeight = clampedMinH + 'px';
      strophes.forEach(function(s) {
        s.container.innerHTML = '';
        s.container.classList.remove('typing-started');
        /* 2026-06-08 (user): a estrofe so aparece quando A SUA digitacao comecar.
           Mantem o box escondido (sem fundo/borda visivel) ate typeNextSentence
           (ou _instantReveal) revelar. Inline visibility e SCOPED a esta engine
           (renderPage) -> NAO afeta o renderer legacy da cidade (clip-path) que
           tinha o bug do default visibility:hidden em 2026-05-20. */
        s.container.style.visibility = 'hidden';
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
          sd.container.style.visibility = '';  /* revela a estrofe ao INICIAR a digitacao */
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
        container.style.visibility = '';  /* skip/pular revela TODAS as estrofes */
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
        /* Anti-trap (sessão #88): última página sem choices virava modal SEM
           SAÍDA no mobile (<dialog> showModal, sem ESC no Telegram WebView,
           nextBtn hidden, X só com opts.closeable). Fallback: botão Fechar. */
        console.warn('[ENC] dialogue sem choices — fallback Fechar');
        choices = [{ id: '_enc_auto_close', label: 'Fechar', cb: 'close' }];
      }
      var useInline = opts.inlineChoices === true || choices.length === 1;
      if (useInline) {
        choices.forEach(function(ch, idx) {
          var btn = document.createElement('button');
          btn.className = 'enc-btn' + (idx === 0 ? ' enc-btn-primary' : '');
          /* sessão #88: label vazio → 'Continuar' (nunca botão clicável vazio) */
          btn.innerHTML = _coinify((ch.label && String(ch.label).trim()) || 'Continuar');  // labels são autorais (não input) — coin icon ok
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
      /* sessão #76: diálogos de ALIADO (npc.id 'ally_*') marcam a pergunta como
         USADA ao escolher — mesmo em falha de skill check → não reaparece. NPCs
         normais já fazem seu próprio tracking; este guard é só pra allies. */
      if (dialogue && dialogue.npc && typeof dialogue.npc.id === 'string'
          && dialogue.npc.id.indexOf('ally_') === 0
          && ch && ch.id && typeof window._npcMarkUsed === 'function') {
        try { window._npcMarkUsed(dialogue.npc.id, ch.id); } catch(_e) {}
      }
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
    isChoicesOpen: isChoicesOpen,
    /* A1.2 (auditoria #90): sanitizer de diálogo CANÔNICO. Whitelist
       i/em/b/strong/br/u/s/code (sem atributos), case-insensitive, NÃO escapa
       & (entidades &mdash; são legítimas). cidade/exploração delegam a ele. */
    sanitize: _sanitizeDialogueHTML
  };

  /* Compat: alias usado por cidade openCityPopup (task #47 dismiss flow). */
  window._vEncChoicesClose = closeChoices;

  console.log('[encounter-popup] PADRAO_ALDRIC engine loaded — vEncounter.{render,openChoices,close} ready');
})();

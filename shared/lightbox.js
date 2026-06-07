/* ============================================================================
 * lightbox.js — NPC portrait lightbox (PADRAO_TAVERNA + PADRAO_ALDRIC)
 * ============================================================================
 *
 * task #55 (2026-05-20) — user pediu: clicar nas imagens dos NPCs para ver
 * maior (PADRAO_TAVERNA + PADRAO_ALDRIC default).
 *
 * Two integration paths:
 *
 * 1. EXPLICIT API:
 *      window.showLightbox(imgSrc, npcName, npcDesc)
 *    Used by encounter-popup.js (PADRAO_ALDRIC) ja wireada.
 *
 * 2. EVENT DELEGATION (global, auto-aplica em TODOS os webapps que carregam
 *    lightbox.js):
 *      Click em qualquer .npc-portrait (PADRAO_TAVERNA NPC card) abre lightbox.
 *    NPC name + desc extraido do .row-npc parent (.npc-info .name / .quote).
 *    stopPropagation pra NAO disparar o click do .row-npc (que abre dialogue).
 *
 * MAPA_IA:
 *   ~30   _ensureLightbox() — cria #v-lightbox DOM singleton
 *   ~90   showLightbox(src, name, desc) — open fullscreen viewer
 *   ~130  closeLightbox() — close + cleanup
 *   ~150  Global event delegation pra .npc-portrait
 *
 * ============================================================================ */

(function() {
  'use strict';

  var LIGHTBOX_ID = 'v-lightbox';
  var _isOpen = false;
  var _lbOpenedAt = 0;  /* 2026-06-07: ts de abertura — guard anti-fechar-no-mesmo-tap */

  function _ensureLightbox() {
    var lb = document.getElementById(LIGHTBOX_ID);
    if (lb) {
      // task #69: migrate legacy <div> to <dialog> if needed
      if (lb.tagName.toLowerCase() !== 'dialog') {
        var newLb = document.createElement('dialog');
        newLb.id = LIGHTBOX_ID;
        lb.parentNode.replaceChild(newLb, lb);
        lb = newLb;
      } else {
        return lb;
      }
    } else {
      lb = document.createElement('dialog');
      lb.id = LIGHTBOX_ID;
    }
    // task #69 (2026-05-20) — MIGRATION HTML <dialog> element.
    // Native top-layer rendering (acima de TODO z-index) + ::backdrop +
    // ESC nativo + inert background automatic.
    lb.setAttribute('aria-label', 'Visualização ampliada');
    // <dialog> has native ::backdrop — no manual .v-lb-backdrop needed
    lb.innerHTML =
      '<div class="v-lb-card">' +
        '<button class="v-lb-close" type="button" aria-label="Fechar">✕</button>' +
        '<div class="v-lb-img-wrap">' +
          '<img class="v-lb-img" alt="">' +
        '</div>' +
        '<div class="v-lb-meta">' +
          '<div class="v-lb-name"></div>' +
          '<div class="v-lb-desc"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(lb);

    // Wire close interactions
    var closeBtn = lb.querySelector('.v-lb-close');
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    // Click on backdrop (clicking outside card) closes
    lb.addEventListener('click', function(e) {
      /* 2026-06-07 FIX (foto fecha o diálogo): no toque, o MESMO tap que abriu o
         lightbox dispara um 'click' trailing que caía no backdrop e fechava na hora
         (parecia "tocar na foto fecha o diálogo sozinho"). Ignora cliques de backdrop
         nos primeiros ~350ms após abrir. */
      if (e.target === lb && (Date.now() - _lbOpenedAt) > 350) closeLightbox();
    });
    // <dialog> native cancel event (ESC key)
    lb.addEventListener('cancel', function(e) {
      e.preventDefault();
      closeLightbox();
    });

    // Inject CSS once
    if (!document.getElementById('v-lightbox-style')) {
      var st = document.createElement('style');
      st.id = 'v-lightbox-style';
      // task #69: <dialog> element CSS — reset defaults + ::backdrop + native top-layer
      st.textContent = ''
        + '#v-lightbox{margin:0;padding:12px;border:0;background:transparent;'
        +   'color:inherit;max-width:none;max-height:none;width:100%;height:100%;'
        +   'position:fixed;inset:0;z-index:10500;display:none;'
        +   'align-items:center;justify-content:center;'
        +   'pointer-events:none}'
        + '#v-lightbox[open],#v-lightbox.active{display:flex;pointer-events:auto}'
        + '#v-lightbox::backdrop{background:radial-gradient('
        +   'circle at 50% 50%, rgba(196,149,58,0.15), transparent 70%),'
        +   'rgba(6,4,2,0.94);opacity:0;'
        +   'transition:opacity 200ms ease-out}'
        + '#v-lightbox[open]::backdrop{opacity:1}'
        + '#v-lightbox.closing::backdrop{opacity:0}'
        + '.v-lb-backdrop{position:absolute;inset:0;background:radial-gradient('
        +   'circle at 50% 50%, rgba(196,149,58,0.15), transparent 70%),'
        +   'rgba(6,4,2,0.94);opacity:0;transition:opacity 200ms ease-out;'
        +   'pointer-events:auto}'
        + '#v-lightbox.opening .v-lb-backdrop,'
        + '#v-lightbox.open .v-lb-backdrop{opacity:1}'
        + '#v-lightbox.closing .v-lb-backdrop{opacity:0}'
        + '.v-lb-card{position:relative;max-width:min(92vw,520px);'
        +   'max-height:92vh;display:flex;flex-direction:column;gap:0;'
        +   'transform:scale(0.85);opacity:0;'
        +   'transition:transform 320ms cubic-bezier(0.16,1.08,0.32,1),opacity 220ms ease-out;'
        +   'pointer-events:auto}'
        + '#v-lightbox.opening .v-lb-card,'
        + '#v-lightbox.open .v-lb-card,'
        + '#v-lightbox[open] .v-lb-card{transform:scale(1);opacity:1}'
        + '#v-lightbox.closing .v-lb-card{transform:scale(0.92);opacity:0;'
        +   'transition:transform 200ms ease-in,opacity 180ms ease-in}'
        + '.v-lb-close{position:absolute;top:-14px;right:-14px;width:38px;height:38px;'
        +   'padding:0;background:rgba(15,12,8,0.95);'
        +   'border:1.5px solid rgba(196,149,58,0.75);border-radius:50%;'
        +   'color:#c4953a;font-size:16px;font-weight:700;line-height:1;'
        +   'cursor:pointer;display:flex;align-items:center;justify-content:center;'
        +   'box-shadow:0 4px 12px rgba(0,0,0,0.6),0 0 16px rgba(196,149,58,0.4);'
        +   'transition:all 0.2s ease;z-index:2}'
        + '.v-lb-close:hover{background:rgba(196,149,58,0.25);'
        +   'border-color:#c4953a;color:#fff4d0;transform:rotate(90deg)}'
        + '.v-lb-close:active{transform:rotate(90deg) scale(0.92)}'
        + '.v-lb-img-wrap{display:flex;align-items:center;justify-content:center;'
        +   'background:linear-gradient(180deg,#3a2e22 0%,#2a2218 100%);'
        +   'border:1.5px solid rgba(196,149,58,0.7);border-radius:14px 14px 0 0;'
        +   'overflow:hidden;flex:1;min-height:0;'
        +   'box-shadow:inset 0 0 24px rgba(0,0,0,0.4)}'
        + '.v-lb-img{max-width:100%;max-height:60vh;width:auto;height:auto;'
        +   'object-fit:contain;display:block}'
        + '.v-lb-meta{padding:14px 18px 16px;background:linear-gradient(180deg,'
        +   'rgba(15,12,8,0.55) 0%,#1f1810 100%);'
        +   'border:1.5px solid rgba(196,149,58,0.7);border-top:none;'
        +   'border-radius:0 0 14px 14px;text-align:center;flex-shrink:0}'
        + '.v-lb-name{font-family:"Cinzel","Georgia",serif;font-size:calc(17px * var(--v-font-scale, 1));'
        +   'font-weight:700;color:#c4953a;letter-spacing:2px;text-transform:uppercase;'
        +   'text-shadow:0 0 10px rgba(196,149,58,0.4);margin-bottom:4px;line-height:1.2}'
        + '.v-lb-desc{font-family:"Georgia",serif;font-size:calc(12px * var(--v-font-scale, 1));font-style:italic;'
        +   'color:#a09484;letter-spacing:0.4px;line-height:1.5}'
        // Decorative scrollwork corners
        + '.v-lb-img-wrap::before,.v-lb-img-wrap::after{content:"";position:absolute;'
        +   'top:6px;width:18px;height:18px;border:1px solid rgba(196,149,58,0.55);'
        +   'pointer-events:none}'
        + '.v-lb-img-wrap::before{left:6px;border-right:none;border-bottom:none;'
        +   'border-radius:6px 0 0 0}'
        + '.v-lb-img-wrap::after{right:6px;border-left:none;border-bottom:none;'
        +   'border-radius:0 6px 0 0}'
        // .npc-portrait cursor pointer (signals clickability)
        + '.npc-portrait{cursor:pointer;transition:transform 0.15s ease,'
        +   'box-shadow 0.15s ease}'
        + '.npc-portrait:hover{transform:scale(1.04);'
        +   'box-shadow:0 0 18px rgba(196,149,58,0.5)}'
        + '@media (prefers-reduced-motion: reduce){'
        +   '.v-lb-card{transform:none;transition:opacity 150ms ease}'
        +   '.npc-portrait{transition:none}'
        + '}';
      document.head.appendChild(st);
    }

    return lb;
  }

  function showLightbox(src, name, desc) {
    if (!src) return;
    var lb = _ensureLightbox();
    var img = lb.querySelector('.v-lb-img');
    var nameEl = lb.querySelector('.v-lb-name');
    var descEl = lb.querySelector('.v-lb-desc');
    if (img) {
      img.src = src;
      img.alt = name || '';
    }
    if (nameEl) {
      nameEl.textContent = name || '';
      nameEl.style.display = name ? '' : 'none';
    }
    if (descEl) {
      descEl.innerHTML = desc || '';
      descEl.style.display = desc ? '' : 'none';
    }
    _lbOpenedAt = Date.now();  /* 2026-06-07: marca abertura p/ o guard do backdrop */
    // task #69: activate via showModal() — native top-layer
    if (lb.tagName.toLowerCase() === 'dialog' && typeof lb.showModal === 'function') {
      try { if (!lb.open) lb.showModal(); }
      catch(e) { lb.classList.add('active'); }
    } else {
      lb.classList.add('active');
    }
    void lb.offsetWidth; // force reflow
    lb.classList.add('opening');
    setTimeout(function() {
      lb.classList.remove('opening');
      lb.classList.add('open');
    }, 50);
    _isOpen = true;
  }

  function closeLightbox() {
    var lb = document.getElementById(LIGHTBOX_ID);
    if (!lb) return;
    // task #69: check open via <dialog>.open OR .active class (compat)
    var isOpenNow = (lb.tagName.toLowerCase() === 'dialog' && lb.open) ||
                    lb.classList.contains('active');
    if (!isOpenNow) return;
    lb.classList.add('closing');
    lb.classList.remove('open');
    setTimeout(function() {
      // task #69: close <dialog> via .close() if available
      if (lb.tagName.toLowerCase() === 'dialog' && typeof lb.close === 'function') {
        try { if (lb.open) lb.close(); } catch(e){}
      }
      lb.classList.remove('active');
      lb.classList.remove('closing');
      lb.classList.remove('opening');
      var img = lb.querySelector('.v-lb-img');
      if (img) img.src = ''; // free memory
    }, 220);
    _isOpen = false;
  }

  function isOpen() { return _isOpen; }

  // ──────────────────────────────────────────────────────────────────────
  // GLOBAL EVENT DELEGATION — click em .npc-portrait abre lightbox
  // (auto-aplica em PADRAO_TAVERNA establishments sem precisar editar
  // cada game-*.js renderer).
  // ──────────────────────────────────────────────────────────────────────

  function _onDocClick(e) {
    // 2026-05-22 A2b: extensão pra .v-zoomable selector genérico (medals, items,
    // banners, qualquer imagem). User pediu "revisão de todas imagens... possam
    // ter sistema de apertar pra ver mais de perto".
    // Selectors suportados (em ordem de especificidade):
    //   .v-zoomable      → genérico (qualquer img que receba a class)
    //   .npc-portrait    → PADRAO_TAVERNA NPC cards (com .row-npc parent)
    //   .enc-portrait    → PADRAO_ALDRIC encounters (já tem handler próprio)
    var target = e.target;
    if (!target.closest) return;

    // Check .v-zoomable first (genérico — image OR container with image)
    var zoomable = target.closest('.v-zoomable');
    if (zoomable) {
      var img2 = zoomable.tagName === 'IMG' ? zoomable : zoomable.querySelector('img');
      if (!img2 || !img2.src) return;
      var name2 = zoomable.dataset.zoomName || zoomable.dataset.medalName || img2.alt || '';
      var desc2 = zoomable.dataset.zoomDesc || zoomable.dataset.medalDesc || '';
      e.stopPropagation();
      e.preventDefault();
      showLightbox(img2.src, name2, desc2);
      return;
    }

    // Find closest .npc-portrait OR .enc-portrait (PADRAO_ALDRIC encounter)
    var portrait = target.closest('.npc-portrait, .enc-portrait');
    if (!portrait) return;

    // .enc-portrait JÁ tem seu próprio click handler na encounter-popup.js que
    // chama showLightbox direto. Não duplicar — só atender .npc-portrait aqui.
    if (portrait.classList.contains('enc-portrait')) return;

    // Find image src
    var img = portrait.querySelector('img');
    if (!img || !img.src) return; // sem imagem → não abre

    // Find name + desc from sibling .npc-info
    var row = portrait.closest('.row-npc');
    var name = '';
    var desc = '';
    if (row) {
      var nameEl = row.querySelector('.npc-info .name, .row-npc-name');
      var quoteEl = row.querySelector('.npc-info .quote, .row-npc-quote');
      if (nameEl) name = nameEl.textContent.trim();
      if (quoteEl) desc = quoteEl.textContent.trim();
    }
    if (!name) name = img.alt || '';

    // Stop propagation to avoid triggering row click (which opens dialogue)
    e.stopPropagation();
    e.preventDefault();
    showLightbox(img.src, name, desc);
  }

  document.addEventListener('click', _onDocClick, true); // capture phase pra interceptar antes do row

  // === Public API ===========================================================
  window.showLightbox = showLightbox;
  window.vLightbox = {
    show: showLightbox,
    close: closeLightbox,
    isOpen: isOpen
  };

  console.log('[lightbox] PADRAO_LIGHTBOX engine loaded — showLightbox(src,name,desc) + event delegation .npc-portrait');
})();

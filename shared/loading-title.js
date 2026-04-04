/* ── Title Screen — Epic Entry (v1.0) ── */
/* Tela titulo com "Toque para Iniciar" que desbloqueia audio antes do loading */
/* NOTE: All HTML is hardcoded (no user input), safe for innerHTML usage */
(function() {
  'use strict';

  var RUNES = ['\u16A0','\u16A2','\u16A6','\u16A8','\u16B1','\u16B7','\u16C1','\u16C7'];

  window.ValdoriaTitleScreen = function(opts) {
    opts = opts || {};
    var onStart = opts.onStart || function() {};
    var _started = false;
    var _el = null;

    /* ── Detect performance tier ── */
    var tier = window._valdoriaPerformanceTier || 'full';
    var tierClass = tier === 'lite' ? ' title-lite' : tier === 'medium' ? ' title-medium' : '';

    /* ── Build DOM safely ── */
    function _buildDOM() {
      var root = document.createElement('div');
      root.id = 'title-screen';
      root.className = 'title-screen' + tierClass;

      /* Particles (embers rising) */
      var particles = document.createElement('div');
      particles.className = 'title-particles';
      for (var i = 0; i < 8; i++) {
        var p = document.createElement('div');
        p.className = 'tp';
        particles.appendChild(p);
      }
      root.appendChild(particles);

      /* Floating runes */
      var runesDiv = document.createElement('div');
      runesDiv.className = 'title-runes';
      for (var r = 0; r < 4; r++) {
        var rune = document.createElement('div');
        rune.className = 'title-rune';
        rune.textContent = RUNES[Math.floor(Math.random() * RUNES.length)];
        runesDiv.appendChild(rune);
      }
      root.appendChild(runesDiv);

      /* Brand */
      var brand = document.createElement('div');
      brand.className = 'title-brand';

      var titleTop = document.createElement('div');
      titleTop.className = 'title-text';
      titleTop.textContent = 'Lendas de';
      brand.appendChild(titleTop);

      var titleSub = document.createElement('div');
      titleSub.className = 'title-text-sub';
      titleSub.textContent = 'Valdoria';
      brand.appendChild(titleSub);

      var divider = document.createElement('div');
      divider.className = 'title-divider';
      var lineL = document.createElement('span');
      lineL.className = 'title-divider-line';
      var gem = document.createElement('span');
      gem.className = 'title-divider-gem';
      gem.textContent = '\u25C6';
      var lineR = document.createElement('span');
      lineR.className = 'title-divider-line';
      divider.appendChild(lineL);
      divider.appendChild(gem);
      divider.appendChild(lineR);
      brand.appendChild(divider);

      root.appendChild(brand);

      /* CTA */
      var cta = document.createElement('div');
      cta.className = 'title-cta';
      cta.textContent = 'Toque para Iniciar';
      root.appendChild(cta);

      /* Flash overlay — two-layer (gold burst + white wash) */
      var flash = document.createElement('div');
      flash.className = 'title-flash';
      var flashGold = document.createElement('div');
      flashGold.className = 'title-flash-gold';
      var flashWhite = document.createElement('div');
      flashWhite.className = 'title-flash-white';
      flash.appendChild(flashGold);
      flash.appendChild(flashWhite);
      root.appendChild(flash);

      return root;
    }

    /* ── Inject into DOM ── */
    function show() {
      if (_el) { console.log('[INTRO_TITLE] show() skipped — already visible'); return; }
      _el = _buildDOM();
      document.body.appendChild(_el);
      console.log('[INTRO_TITLE] Title screen INJECTED into DOM (tier=' + tier + ')');

      /* Tap handler — entire screen is clickable */
      _el.addEventListener('click', _onTap);
      _el.addEventListener('touchend', function(e) {
        e.preventDefault();
        _onTap();
      }, { passive: false });
    }

    /* ── Tap handler ── */
    function _onTap() {
      if (_started) { console.log('[INTRO_TITLE] _onTap ignored — already started'); return; }
      _started = true;
      console.log('[INTRO_TITLE] User TAPPED — starting exit sequence');

      /* Haptic feedback */
      try {
        if (window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
          Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
      } catch(e) { /* noop */ }

      /* Phase 1: Flash burst (gold + white) */
      var flash = _el.querySelector('.title-flash');
      if (flash) flash.classList.add('active');

      /* Callback immediately (unlocks audio — needs user gesture context) */
      onStart();

      /* Phase 2: Cinematic element exit (staggered, 200ms after flash starts) */
      setTimeout(function() {
        if (_el) {
          _el.classList.add('exit');
          /* Phase 3: Remove from DOM after all animations complete (1.2s total) */
          setTimeout(function() { hide(); }, 1000);
        }
      }, 200);
    }

    /* ── Remove from DOM ── */
    function hide() {
      if (_el && _el.parentNode) {
        _el.parentNode.removeChild(_el);
        console.log('[INTRO_TITLE] Title screen REMOVED from DOM');
      }
      _el = null;
    }

    /* ── Check if visible ── */
    function isVisible() {
      return !!_el;
    }

    return { show: show, hide: hide, isVisible: isVisible };
  };
})();

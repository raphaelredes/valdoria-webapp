/**
 * Bloqueio visual em paisagem em telemóveis — a Web não pode impedir a rotação física do SO;
 * manifest.json já usa "orientation": "portrait" para PWA; aqui cobrimos WebView / browser.
 * ScreenOrientation.lock pode falhar silenciosamente (Telegram, iOS); overlay é a garantia.
 */
(function () {
  'use strict';
  if (window.__valdoriaOrientationGateInit) {
    return;
  }
  window.__valdoriaOrientationGateInit = true;

  var GATE_ID = 'valdoria-orientation-gate';
  var _lockAttempted = false;

  function shortSide() {
    return Math.min(window.innerWidth || 0, window.innerHeight || 0);
  }

  /** Paisagem com menor dimensão até 600px (telemóvel + tablets compactos). */
  function isPhoneLandscapeLayout() {
    var w = window.innerWidth || 0;
    var h = window.innerHeight || 0;
    if (w <= h) return false;
    return shortSide() <= 600;
  }

  /**
   * Evitar falso positivo em janelas de desktop estreitas (dev tools) quando só há ponteiro fino.
   */
  function shouldShowGate() {
    if (!isPhoneLandscapeLayout()) return false;
    var fine = window.matchMedia('(pointer: fine)').matches;
    var coarse = window.matchMedia('(pointer: coarse)').matches;
    if (fine && !coarse && shortSide() > 420) return false;
    return true;
  }

  function tryLockPortraitFromGesture() {
    if (_lockAttempted) return;
    var so = window.screen && window.screen.orientation;
    if (!so || typeof so.lock !== 'function') return;
    _lockAttempted = true;
    so.lock('portrait').catch(function () {
      _lockAttempted = false;
    });
  }

  function ensureGate() {
    var el = document.getElementById(GATE_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = GATE_ID;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'valdoria-orientation-gate-title');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="v-orientation-gate-inner">' +
      '<div class="v-orientation-gate-icon" aria-hidden="true">&#8635;</div>' +
      '<p id="valdoria-orientation-gate-title" class="v-orientation-gate-title">Modo retrato necessário</p>' +
      '<p class="v-orientation-gate-text">Gire o dispositivo para a posição vertical para jogar.</p>' +
      '<p class="v-orientation-gate-hint">Toque para tentar fixar o retrato (se o dispositivo permitir).</p>' +
      '</div>';
    el.addEventListener(
      'click',
      function () {
        tryLockPortraitFromGesture();
      },
      { passive: true }
    );
    (document.body || document.documentElement).appendChild(el);
    return el;
  }

  function sync() {
    if (!document.body) return;
    var el = ensureGate();
    var on = shouldShowGate();
    el.setAttribute('aria-hidden', on ? 'false' : 'true');
    if (on) {
      el.classList.add('v-orientation-gate--active');
      el.setAttribute('tabindex', '-1');
      try {
        el.focus({ preventScroll: true });
      } catch (e) {
        /* focus opcional em WebViews antigos */
      }
    } else {
      el.classList.remove('v-orientation-gate--active');
      el.removeAttribute('tabindex');
      if (document.activeElement === el) {
        try {
          el.blur();
        } catch (e2) {
          /* intentionally silent */
        }
      }
    }
  }

  function init() {
    sync();
    window.addEventListener('resize', sync, { passive: true });
    window.addEventListener('orientationchange', function () {
      setTimeout(sync, 200);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

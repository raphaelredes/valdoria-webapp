/**
 * Portrait Lock — Universal orientation enforcement for Valdoria WebApps.
 *
 * 3-layer defense strategy (all layers fire in parallel):
 *   1. Telegram.WebApp.lockOrientation() (Bot API 8.0+) — native, most reliable
 *   2. screen.orientation.lock('portrait') — Chrome Android, PWA
 *   3. CSS overlay (#valdoria-orientation-gate in valdoria-design.css) — ultimate fallback
 *
 * Re-fires the lock on EVERY opportunity:
 *   - DOMContentLoaded (initial)
 *   - visibilitychange (tab returns)
 *   - focus (window regains focus)
 *   - pageshow (bfcache restore)
 *   - orientationchange / resize (device rotation)
 *   - matchMedia('(orientation: landscape)') change event
 *   - First user gesture (touchstart/click/keydown)
 *
 * Note: Web platform cannot forcibly rotate a device — the CSS overlay is the
 * ultimate guarantee that the user sees "Rotate to portrait" instead of a
 * broken landscape UI. The JS layers TRY to lock, but fail silently on iOS
 * Safari and other non-supporting environments.
 *
 * manifest.json uses "orientation": "portrait" for PWA mode.
 */
(function () {
  'use strict';
  if (window.__valdoriaOrientationGateInit) {
    return;
  }
  window.__valdoriaOrientationGateInit = true;

  var GATE_ID = 'valdoria-orientation-gate';
  var LOG_PREFIX = '[ORIENTATION-GATE]';
  var _lockAttempted = false;
  var _lockFireCount = 0;

  function log(msg) {
    try { console.info(LOG_PREFIX, msg); } catch (e) { /* noqa: preflight */ }
  }

  function logWarn(msg, err) {
    try { console.warn(LOG_PREFIX, msg, err || ''); } catch (e) { /* noqa: preflight */ }
  }

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

  // ── Layer 1: Telegram Mini App API (Bot API 8.0+) ──
  function tryTelegramLock() {
    try {
      var tg = window.Telegram && window.Telegram.WebApp;
      if (!tg) return false;
      if (typeof tg.lockOrientation !== 'function') return false;
      tg.lockOrientation();
      log('telegram lockOrientation() called');
      return true;
    } catch (e) {
      logWarn('telegram lockOrientation failed', e);
      return false;
    }
  }

  // ── Layer 2: Screen Orientation API (Chrome Android/PWA) ──
  function tryScreenOrientationLock() {
    try {
      var so = window.screen && window.screen.orientation;
      if (!so || typeof so.lock !== 'function') return false;
      if (_lockAttempted) return false;
      _lockAttempted = true;
      var p = so.lock('portrait');
      if (p && typeof p.then === 'function') {
        p.then(function () {
          log('screen.orientation.lock(portrait) succeeded');
        }).catch(function (err) {
          _lockAttempted = false;  // allow retry on next gesture
          logWarn('screen.orientation.lock rejected (CSS fallback active)', err && err.message);
        });
      }
      return true;
    } catch (e) {
      // iOS Safari throws — silent fail, CSS fallback handles it
      _lockAttempted = false;
      logWarn('screen.orientation.lock threw (CSS fallback active)', e && e.message);
      return false;
    }
  }

  function tryLockPortraitFromGesture() {
    tryTelegramLock();
    tryScreenOrientationLock();
  }

  // ── Layer 3: Gate overlay (CSS in valdoria-design.css) ──
  function _createGateDOM() {
    var el = document.createElement('div');
    el.id = GATE_ID;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'valdoria-orientation-gate-title');
    el.setAttribute('aria-hidden', 'true');

    var inner = document.createElement('div');
    inner.className = 'v-orientation-gate-inner';

    var icon = document.createElement('div');
    icon.className = 'v-orientation-gate-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '\u21BB';  // ↻ clockwise open circle arrow
    inner.appendChild(icon);

    var title = document.createElement('p');
    title.id = 'valdoria-orientation-gate-title';
    title.className = 'v-orientation-gate-title';
    title.textContent = 'Modo retrato necessário';
    inner.appendChild(title);

    var text = document.createElement('p');
    text.className = 'v-orientation-gate-text';
    text.textContent = 'Gire o dispositivo para a posição vertical para jogar.';
    inner.appendChild(text);

    var hint = document.createElement('p');
    hint.className = 'v-orientation-gate-hint';
    hint.textContent = 'Toque para tentar fixar o retrato (se o dispositivo permitir).';
    inner.appendChild(hint);

    el.appendChild(inner);

    el.addEventListener(
      'click',
      function () {
        tryLockPortraitFromGesture();
      },
      { passive: true }
    );

    return el;
  }

  function ensureGate() {
    var el = document.getElementById(GATE_ID);
    if (el) return el;
    el = _createGateDOM();
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

  // ── Fire all 3 layers + sync overlay ──
  function fireLock(reason) {
    _lockFireCount++;
    log('fire #' + _lockFireCount + ' (reason: ' + reason + ')');
    tryTelegramLock();
    tryScreenOrientationLock();
    sync();
  }

  function init() {
    // Ensure gate DOM exists early (before first sync)
    ensureGate();

    // Fire all layers at init
    fireLock('init');

    // Re-fire on resize / orientation change (device physically rotated)
    window.addEventListener('resize', function () { fireLock('resize'); }, { passive: true });
    window.addEventListener('orientationchange', function () {
      setTimeout(function () { fireLock('orientationchange'); }, 200);
    });

    // Re-fire when tab becomes visible again (user switched tabs and came back)
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) fireLock('visibilitychange');
    });

    // Re-fire when window regains focus
    window.addEventListener('focus', function () {
      fireLock('focus');
    });

    // Re-fire on bfcache restore (browser back/forward from another page)
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) fireLock('pageshow-bfcache');
      else fireLock('pageshow');
    });

    // matchMedia listener for more reliable orientation change detection
    try {
      if (window.matchMedia) {
        var mql = window.matchMedia('(orientation: landscape)');
        var mqlHandler = function () { fireLock('matchmedia'); };
        if (mql.addEventListener) mql.addEventListener('change', mqlHandler);
        else if (mql.addListener) mql.addListener(mqlHandler);  // Safari < 14
      }
    } catch (e) {
      logWarn('matchMedia listener failed', e);
    }

    // Re-fire on first user gesture (many browsers require gesture for screen.orientation.lock)
    var gestureEvents = ['touchstart', 'touchend', 'click', 'keydown'];
    var gestureFired = false;
    var gestureHandler = function () {
      if (gestureFired) return;
      gestureFired = true;
      fireLock('user-gesture');
      gestureEvents.forEach(function (ev) {
        document.removeEventListener(ev, gestureHandler, true);
      });
    };
    gestureEvents.forEach(function (ev) {
      document.addEventListener(ev, gestureHandler, true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API for manual control
  window.ValdoriaOrientationGate = {
    fire: fireLock,
    sync: sync,
    attempts: function () { return _lockFireCount; },
  };
  // Back-compat alias
  window.ValdoriaPortraitLock = window.ValdoriaOrientationGate;
})();

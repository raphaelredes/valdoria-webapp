/* ══════════════════════════════════════════════════════════
 * PORTRAIT LOCK — Universal orientation lock for Valdoria
 * ══════════════════════════════════════════════════════════
 *
 * 3-layer defense strategy (all layers fire in parallel):
 *   1. Telegram.WebApp.lockOrientation() — Bot API 8.0+, nativo
 *   2. screen.orientation.lock('portrait') — Chrome Android, PWA
 *   3. CSS overlay — portrait-lock.css (ultimate fallback)
 *
 * Re-fires the lock on EVERY opportunity:
 *   - DOMContentLoaded (initial)
 *   - visibilitychange (tab returns)
 *   - focus (window regains focus)
 *   - pageshow (bfcache restore)
 *   - orientationchange / resize (device rotation)
 *   - First user interaction (many browsers require gesture)
 *
 * The CSS overlay in portrait-lock.css is ALWAYS active via
 * @media queries — it shows automatically when the device is in
 * landscape orientation on a mobile-sized viewport, regardless of
 * whether the JS APIs succeeded.
 */
(function () {
    'use strict';

    var LOG_PREFIX = '[PORTRAIT-LOCK]';
    var _lockAttempts = 0;
    var _overlayInjected = false;

    function log(msg) {
        try { console.info(LOG_PREFIX, msg); } catch (e) { /* noqa: preflight */ }
    }

    function logWarn(msg, err) {
        try { console.warn(LOG_PREFIX, msg, err || ''); } catch (e) { /* noqa: preflight */ }
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
            if (!screen || !screen.orientation) return false;
            if (typeof screen.orientation.lock !== 'function') return false;
            var p = screen.orientation.lock('portrait');
            if (p && typeof p.then === 'function') {
                p.then(function () {
                    log('screen.orientation.lock(portrait) succeeded');
                }).catch(function (err) {
                    // Silent fail — CSS overlay handles this case
                    logWarn('screen.orientation.lock rejected (CSS fallback active)', err && err.message);
                });
            }
            return true;
        } catch (e) {
            // On iOS Safari this throws — silent fail, CSS handles it
            logWarn('screen.orientation.lock threw (CSS fallback active)', e && e.message);
            return false;
        }
    }

    // ── Layer 3: Inject CSS overlay DOM (if not already in page) ──
    function injectOverlayDOM() {
        if (_overlayInjected) return;
        if (document.querySelector('.portrait-lock-overlay')) {
            _overlayInjected = true;
            return;
        }
        if (!document.body) return;
        var overlay = document.createElement('div');
        overlay.className = 'portrait-lock-overlay';
        overlay.setAttribute('role', 'alertdialog');
        overlay.setAttribute('aria-label', 'Gire o dispositivo para modo retrato');

        var icon = document.createElement('div');
        icon.className = 'pl-icon';
        icon.textContent = '\uD83D\uDCF1';  // mobile phone emoji
        overlay.appendChild(icon);

        var divider1 = document.createElement('div');
        divider1.className = 'pl-divider';
        overlay.appendChild(divider1);

        var title = document.createElement('div');
        title.className = 'pl-title';
        title.textContent = 'Gire o Dispositivo';
        overlay.appendChild(title);

        var text = document.createElement('div');
        text.className = 'pl-text';
        text.textContent = 'Lendas de Valdoria funciona apenas em modo retrato. Vire seu celular na vertical para continuar.';
        overlay.appendChild(text);

        var divider2 = document.createElement('div');
        divider2.className = 'pl-divider';
        overlay.appendChild(divider2);

        document.body.appendChild(overlay);
        _overlayInjected = true;
        log('portrait-lock overlay DOM injected');
    }

    // ── Fire all layers ──
    function fireLock(reason) {
        _lockAttempts++;
        log('lock attempt #' + _lockAttempts + ' (reason: ' + reason + ')');
        tryTelegramLock();
        tryScreenOrientationLock();
        injectOverlayDOM();
    }

    // ── Event wiring ──
    function init() {
        // Fire once immediately
        fireLock('init');

        // Re-fire on every visibility/focus change
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) fireLock('visibilitychange');
        });

        window.addEventListener('focus', function () {
            fireLock('focus');
        });

        window.addEventListener('pageshow', function (e) {
            // bfcache restore always has persisted=true
            if (e.persisted) fireLock('pageshow-bfcache');
            else fireLock('pageshow');
        });

        // Re-fire on orientation change (the API may unlock itself when orientation changes)
        window.addEventListener('orientationchange', function () {
            setTimeout(function () { fireLock('orientationchange'); }, 50);
        });

        // Match-media for more reliable detection
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

        // Re-fire on first user interaction (some browsers require gesture for lock)
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

    // Wait for DOM before injecting overlay
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API for manual control
    window.ValdoriaPortraitLock = {
        fire: fireLock,
        attempts: function () { return _lockAttempts; },
    };
})();

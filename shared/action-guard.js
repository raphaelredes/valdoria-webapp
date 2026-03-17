/**
 * ActionGuard — Universal double-action protection for Valdoria WebApps.
 *
 * Prevents duplicate clicks during pending API requests.
 * Provides visual feedback (dimming) on action buttons.
 *
 * Usage:
 *   <script src="../shared/action-guard.js"></script>
 *
 *   // Before sending an action:
 *   if (!actionGuard.acquire()) return;
 *   try {
 *       const resp = await fetch('/api/game/action', ...);
 *       // process response
 *   } finally {
 *       actionGuard.release();
 *   }
 *
 *   // For non-async (toggle) actions — debounce only, no lock:
 *   if (!actionGuard.debounce()) return;
 */
var actionGuard = (() => {
    'use strict';

    let _busy = false;
    let _lastTime = 0;
    const DEBOUNCE_MS = 300;

    // CSS selectors for buttons to dim during pending action
    const BTN_SELECTORS = '[data-action],.action-btn,.btn-action,.btn-hero,.choice-btn,.v-btn';

    function _setButtonsDisabled(disabled) {
        document.querySelectorAll(BTN_SELECTORS).forEach(b => {
            if (disabled) {
                b.style.pointerEvents = 'none';
                b.style.opacity = '0.5';
            } else {
                b.style.pointerEvents = '';
                b.style.opacity = '';
            }
        });
    }

    return {
        /** True if an action is currently in-flight. */
        get busy() { return _busy; },

        /**
         * Acquire the action lock. Returns false if busy or within debounce window.
         * Call release() when the action completes (use try/finally).
         */
        acquire() {
            if (_busy) return false;
            const now = Date.now();
            if (now - _lastTime < DEBOUNCE_MS) return false;
            _lastTime = now;
            _busy = true;
            _setButtonsDisabled(true);
            return true;
        },

        /** Release the action lock and re-enable buttons. */
        release() {
            _busy = false;
            _setButtonsDisabled(false);
        },

        /**
         * Debounce-only check (no lock). For toggle/multi-select actions
         * that don't need a persistent busy state.
         * Returns false if within debounce window.
         */
        debounce() {
            const now = Date.now();
            if (now - _lastTime < DEBOUNCE_MS) return false;
            _lastTime = now;
            return true;
        },

        /** Force-reset (e.g., on page transition or error recovery). */
        reset() {
            _busy = false;
            _setButtonsDisabled(false);
        }
    };
})();

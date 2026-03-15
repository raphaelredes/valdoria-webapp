/* ========================================================
   VALDORIA EXIT CONFIRM v1.1
   Shared exit confirmation popup for ALL WebApps.
   Shows "Encerrar Aventura?" when pressing Telegram BackButton
   or Android physical back button.

   AUTO-SETUP (no WebApp code needed):
     - BackButton.show() + onClick() → shows popup
     - Android back (popstate) → shows popup
     - "Sair" → calls __valdoriaExitAction or tg.close()
     - "Continuar Jogando" / backdrop click → dismisses popup

   INTEGRATION PATTERNS:
     1. DEFAULT — WebApp uses tg.close() on exit (most WebApps):
        Nothing to do. exit-confirm.js handles everything.

     2. CUSTOM CLOSE — WebApp has cleanup/transition logic:
        window.__valdoriaExitAction = function() { myCleanup(); };

     3. COMPLEX NAV — WebApp has sub-screen back navigation:
        Set window.__valdoriaPopstateTrap = true BEFORE this script loads.
        Override BackButton.onClick with conditional logic.
        Call ValdoriaExitConfirm.show() for the exit case.

   TAG: All related code in WebApps is tagged [EXIT-CONFIRM].
   ======================================================== */
(function () {
    "use strict";

    var tg = window.Telegram && Telegram.WebApp;
    var _popupVisible = false;
    var _overlay = null;

    // --- Inject HTML ---
    function _ensureDOM() {
        if (_overlay) return;
        var div = document.createElement('div');
        div.innerHTML =
            '<div id="v-exit-overlay" class="v-exit-overlay" style="display:none">' +
                '<div class="v-exit-box">' +
                    '<div class="v-exit-icon">\u2694\uFE0F</div>' +
                    '<div class="v-exit-title">Encerrar Aventura?</div>' +
                    '<div class="v-exit-msg">Deseja realmente sair do jogo?</div>' +
                    '<div class="v-exit-buttons">' +
                        '<button id="v-exit-stay" class="v-exit-btn v-exit-btn-stay">Continuar Jogando</button>' +
                        '<button id="v-exit-leave" class="v-exit-btn v-exit-btn-leave">Sair</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(div.firstChild);
        _overlay = document.getElementById('v-exit-overlay');

        // Event listeners
        document.getElementById('v-exit-stay').addEventListener('click', function () {
            _hide();
        });
        document.getElementById('v-exit-leave').addEventListener('click', function () {
            // Don't call _hide() here — it would resume heartbeat just before exit.
            // Just dismiss overlay and proceed with exit.
            if (_overlay) _overlay.style.display = 'none';
            _popupVisible = false;
            _doExit();
        });
        // Click on backdrop = stay
        _overlay.addEventListener('click', function (e) {
            if (e.target === _overlay) _hide();
        });
    }

    function _show() {
        _ensureDOM();
        _overlay.style.display = '';
        _popupVisible = true;
        if (window.vHaptic) vHaptic.medium();
        // Pause heartbeat while popup is visible (no need to poll)
        if (window.SessionHeartbeat) SessionHeartbeat.stop();
    }

    function _hide() {
        if (!_overlay) return;
        _overlay.style.display = 'none';
        _popupVisible = false;
        // Resume heartbeat if player chose to stay
        if (window.SessionHeartbeat && window.SessionHeartbeat.init && window.S) {
            try { SessionHeartbeat.init({ apiBase: S.apiBase, token: S.token, uid: S.uid }); } catch(e) {}
        }
    }

    function _doExit() {
        if (window.__valdoriaExitAction) {
            try { window.__valdoriaExitAction(); } catch (e) {
                console.warn('[EXIT-CONFIRM] custom exit failed:', e);
            }
            return;
        }
        if (tg) {
            try { tg.close(); } catch (e) { console.warn('[EXIT-CONFIRM] tg.close:', e); }
        }
    }

    // --- Public API ---
    function showExitConfirm() {
        if (window.__valdoriaExitBypass) {
            _doExit();
            return;
        }
        if (_popupVisible) {
            _hide();
            return;
        }
        _show();
    }

    function isExitPopupVisible() {
        return _popupVisible;
    }

    function hideExitConfirm() {
        _hide();
    }

    window.ValdoriaExitConfirm = {
        show: showExitConfirm,
        hide: hideExitConfirm,
        isVisible: isExitPopupVisible,
    };

    // --- Auto-setup Telegram BackButton ---
    // Show BackButton and wire it to the exit popup as a fallback.
    // WebApps that register their own BackButton.onClick will override this.
    if (tg && tg.BackButton) {
        try { tg.BackButton.show(); } catch(e) {}
        try {
            tg.BackButton.onClick(function() {
                showExitConfirm();
            });
        } catch(e) {}
    }

    // --- Android back button trap ---
    // Set up history trap for WebApps that don't have their own popstate handler.
    // WebApps with custom navigation (Game Hub) override this with their own handler.
    // Guard: only push if no WebApp has already set up its own trap.
    if (!window.__valdoriaPopstateTrap) {
        window.__valdoriaPopstateTrap = true;
        history.replaceState({ screen: 'valdoria_init' }, '');
        history.pushState({ screen: 'valdoria_app' }, '');
        window.addEventListener('popstate', function () {
            history.pushState({ screen: 'valdoria_app' }, '');
            if (window.__valdoria_transitioning) return;
            showExitConfirm();
        });
    }
})();

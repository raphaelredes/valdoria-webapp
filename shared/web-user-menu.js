/* =============================================
   Web User Menu — Logout button for browser mode
   Placed in footer bar, only active outside Telegram
   ============================================= */
(function() {
    'use strict';

    /* Skip entirely if running inside Telegram */
    if (!document.documentElement.classList.contains('web-standalone')) return;

    var _el = null;

    function _doLogout() {
        /* 1. Notify server (fire-and-forget) */
        var api = localStorage.getItem(ValdoriaEnv.getEnvKey('valdoria_api_base')) || '';
        var token = localStorage.getItem(ValdoriaEnv.getEnvKey('valdoria_web_token')) || '';
        var uid = parseInt(localStorage.getItem(ValdoriaEnv.getEnvKey('valdoria_web_user_id')) || '0', 10);
        if (api && token) {
            try {
                fetch(api + '/api/game/close', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ user_id: uid })
                }).catch(function() { /* ignore */ });
            } catch (e) { /* ignore */ }
        }

        /* 2. Clear auth storage */
        localStorage.removeItem(ValdoriaEnv.getEnvKey('valdoria_web_token'));
        localStorage.removeItem(ValdoriaEnv.getEnvKey('valdoria_web_user_id'));
        localStorage.removeItem(ValdoriaEnv.getEnvKey('valdoria_api_base'));

        /* 3. Redirect to login page */
        var base = window.location.pathname;
        if (base.indexOf('app.html') >= 0) {
            base = base.replace(/app\.html.*$/, 'web/');
        } else {
            base = base.replace(/\/[^\/]+\/index\.html.*$/, '/web/');
        }
        window.location.href = base;
    }

    function _init() {
        if (_el) return;

        /* Create fixed bottom-right logout button */
        _el = document.createElement('button');
        _el.className = 'wum-footer-btn';
        _el.setAttribute('aria-label', 'Sair da Conta');
        _el.setAttribute('title', 'Sair da Conta');
        _el.textContent = 'Sair';
        _el.addEventListener('click', function(e) {
            e.stopPropagation();
            _doLogout();
        });

        document.body.appendChild(_el);
    }

    /* Initialize when DOM is ready */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

    /* Hide floating button when game footer is active (game has Settings → Sair da Conta) */
    function _syncVisibility() {
        if (!_el) return;
        var quick = document.getElementById('footer-quick');
        var isGameFooterActive = quick && quick.style.display !== 'none' && quick.children.length > 0;
        _el.classList.toggle('wum-hidden', !!isGameFooterActive);
    }

    var _observer = new MutationObserver(_syncVisibility);
    var _target = document.body || document.documentElement;
    if (_target) {
        _observer.observe(_target, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            _observer.observe(document.body, { childList: true, subtree: true });
        });
    }
})();

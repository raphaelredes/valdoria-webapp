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
        var api = localStorage.getItem('valdoria_api_base') || '';
        var token = localStorage.getItem('valdoria_web_token') || '';
        var uid = parseInt(localStorage.getItem('valdoria_web_user_id') || '0', 10);
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
        localStorage.removeItem('valdoria_web_token');
        localStorage.removeItem('valdoria_web_user_id');
        localStorage.removeItem('valdoria_api_base');

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

        /* Try to find the game footer to insert there */
        var footer = document.getElementById('footer-nav');
        if (footer) {
            /* Insert as last item in footer nav row */
            footer.appendChild(_el);
            _el.classList.add('wum-in-footer');
        } else {
            /* Fallback: fixed bottom-right, non-intrusive */
            document.body.appendChild(_el);
        }
    }

    /* Initialize when DOM is ready */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

    /* Re-check footer after SPA navigation (footer may appear later) */
    var _observer = new MutationObserver(function() {
        if (_el && !_el.classList.contains('wum-in-footer')) {
            var footer = document.getElementById('footer-nav');
            if (footer && !footer.contains(_el)) {
                footer.appendChild(_el);
                _el.classList.add('wum-in-footer');
            }
        }
    });
    _observer.observe(document.body, { childList: true, subtree: true });
})();

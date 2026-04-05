/* =============================================
   Web User Menu — Floating logout for browser mode
   Only active when running outside Telegram
   ============================================= */
(function() {
    'use strict';

    /* Skip entirely if running inside Telegram */
    if (!document.documentElement.classList.contains('web-standalone')) return;

    var _open = false;
    var _el = null;
    var _menu = null;
    var _btn = null;
    var _backdrop = null;

    function _createSvg(paths, size) {
        var ns = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('width', String(size || 16));
        svg.setAttribute('height', String(size || 16));
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        for (var i = 0; i < paths.length; i++) {
            var p = paths[i];
            var el = document.createElementNS(ns, p.tag);
            var attrs = p.attrs || {};
            for (var k in attrs) {
                if (Object.prototype.hasOwnProperty.call(attrs, k)) {
                    el.setAttribute(k, attrs[k]);
                }
            }
            svg.appendChild(el);
        }
        return svg;
    }

    /* User icon (person silhouette) */
    function _userIcon() {
        return _createSvg([
            { tag: 'path', attrs: { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' } },
            { tag: 'circle', attrs: { cx: '12', cy: '7', r: '4' } }
        ], 16);
    }

    /* Logout icon (door with arrow) */
    function _logoutIcon() {
        return _createSvg([
            { tag: 'path', attrs: { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' } },
            { tag: 'polyline', attrs: { points: '16 17 21 12 16 7' } },
            { tag: 'line', attrs: { x1: '21', y1: '12', x2: '9', y2: '12' } }
        ], 14);
    }

    function _init() {
        if (_el) return;

        /* Container */
        _el = document.createElement('div');
        _el.className = 'wum-float';

        /* Trigger button */
        _btn = document.createElement('button');
        _btn.className = 'wum-btn';
        _btn.setAttribute('aria-label', 'Menu da conta');
        _btn.appendChild(_userIcon());
        _btn.addEventListener('click', function(e) {
            e.stopPropagation();
            _toggle();
        });

        /* Dropdown menu */
        _menu = document.createElement('div');
        _menu.className = 'wum-menu';

        var logoutBtn = document.createElement('button');
        logoutBtn.className = 'wum-item';
        var iconSpan = document.createElement('span');
        iconSpan.className = 'wum-item-icon';
        iconSpan.appendChild(_logoutIcon());
        logoutBtn.appendChild(iconSpan);
        logoutBtn.appendChild(document.createTextNode('Sair da Conta'));
        logoutBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            _doLogout();
        });
        _menu.appendChild(logoutBtn);

        /* Invisible backdrop to close on outside click */
        _backdrop = document.createElement('div');
        _backdrop.className = 'wum-backdrop';
        _backdrop.addEventListener('click', function() {
            _close();
        });

        _el.appendChild(_btn);
        _el.appendChild(_menu);
        document.body.appendChild(_backdrop);
        document.body.appendChild(_el);
    }

    function _toggle() {
        if (_open) {
            _close();
        } else {
            _openMenu();
        }
    }

    function _openMenu() {
        _open = true;
        _btn.classList.add('wum-open');
        _menu.classList.add('wum-visible');
        _backdrop.classList.add('wum-visible');
    }

    function _close() {
        _open = false;
        _btn.classList.remove('wum-open');
        _menu.classList.remove('wum-visible');
        _backdrop.classList.remove('wum-visible');
    }

    function _doLogout() {
        _close();

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
        /* Handle SPA path: /app.html → /web/ */
        if (base.indexOf('app.html') >= 0) {
            base = base.replace(/app\.html.*$/, 'web/');
        } else {
            /* Handle sub-route paths: /game/index.html → /web/ */
            base = base.replace(/\/[^\/]+\/index\.html.*$/, '/web/');
        }
        window.location.href = base;
    }

    /* Initialize when DOM is ready */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();

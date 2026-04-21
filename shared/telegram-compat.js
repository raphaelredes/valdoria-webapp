/**
 * telegram-compat.js - Polyfill Telegram.WebApp para acesso web direto.
 * Carregado APOS telegram-web-app.js em cada index.html.
 * Se Telegram.WebApp real existe com initData, nao faz nada.
 * Se nao, cria polyfill compativel para modo web standalone.
 */
(function () {
    "use strict";

    // Se ja existe Telegram.WebApp com initData, estamos dentro do Telegram
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
        return;
    }

    // Ler token/session do localStorage
    var _token = localStorage.getItem(ValdoriaEnv.getEnvKey('valdoria_web_token')) || "";
    var _userId = parseInt(localStorage.getItem(ValdoriaEnv.getEnvKey('valdoria_web_user_id')) || "0", 10);
    var _apiBase = localStorage.getItem(ValdoriaEnv.getEnvKey('valdoria_api_base')) || "";

    /* [FIX 2026-04-21] FALLBACK pra URL params quando localStorage vazio.
       ROOT CAUSE do bug "caiu na tela de auth pós-vitória": após combate, o
       server redireciona pra `/app.html?route=explore&token=X&uid=Y&api=Z`.
       Telegram Desktop perde initData no location.replace, então telegram-compat
       entra em cena. Mas localStorage estava vazio (WebApp abre via URL, não
       persiste token) → _token falsy → redirect pra /web/.
       Fix: usa URL params como fallback. Se URL tem token válido, pula redirect
       e confia no handshake downstream (SPA/explore/game core lê mesma URL).
       Diagnóstico completo em commits anteriores com tags [C-REM:LEAVE*]. */
    if (!_token) {
        try {
            var _urlParams = new URLSearchParams(window.location.search);
            var _urlToken = _urlParams.get('token');
            if (_urlToken) {
                _token = _urlToken;
                console.info('[COMPAT] token from URL params (no localStorage) uid=' + (_urlParams.get('uid') || '?'));
                if (!_userId) _userId = parseInt(_urlParams.get('uid') || '0', 10);
                if (!_apiBase) _apiBase = _urlParams.get('api') || '';
            }
        } catch (_eUp) { /* URLSearchParams not supported — tolera */ }
    }

    // Haptic feedback fallback
    function _vibrate(ms) {
        try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { console.warn('[COMPAT]', e.message || e); }
    }

    var polyfill = {
        // Lifecycle
        ready: function () {},
        expand: function () {},
        close: function () {
            var webBase = window.location.pathname.replace(/\/[^\/]+\/index\.html.*$/, "/web/");
            window.location.href = webBase;
        },
        disableVerticalSwipes: function () {},
        enableClosingConfirmation: function () {},

        // Appearance
        setHeaderColor: function () {},
        setBackgroundColor: function () {},
        colorScheme: "dark",
        themeParams: {
            bg_color: "#2a2420", text_color: "#d4c8b0",
            hint_color: "#a09484", button_color: "#c8a84e",
            button_text_color: "#1a1410"
        },

        // Viewport
        viewportHeight: window.innerHeight,
        viewportStableHeight: window.innerHeight,
        isExpanded: true,
        contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
        safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },

        // Platform
        platform: "web",
        version: "7.0",
        isVersionAtLeast: function () { return true; },

        // Auth (empty = backend soft-allows)
        initData: "",
        initDataUnsafe: {},

        // Navigation
        BackButton: {
            isVisible: false,
            show: function () { this.isVisible = true; },
            hide: function () { this.isVisible = false; },
            onClick: function (cb) { window._valdoriaBackCb = cb; },
            offClick: function () { window._valdoriaBackCb = null; }
        },

        // Main button
        MainButton: {
            text: "", color: "#c8a84e", textColor: "#1a1410",
            isVisible: false, isActive: true, isProgressVisible: false,
            setText: function (t) { this.text = t; return this; },
            show: function () { this.isVisible = true; return this; },
            hide: function () { this.isVisible = false; return this; },
            enable: function () { this.isActive = true; return this; },
            disable: function () { this.isActive = false; return this; },
            showProgress: function () { this.isProgressVisible = true; return this; },
            hideProgress: function () { this.isProgressVisible = false; return this; },
            onClick: function () { return this; },
            offClick: function () { return this; },
            setParams: function () { return this; }
        },

        // Haptic feedback
        HapticFeedback: {
            impactOccurred: function (style) {
                _vibrate(style === "heavy" ? 50 : style === "medium" ? 30 : 15);
            },
            notificationOccurred: function (type) {
                _vibrate(type === "error" ? 80 : type === "success" ? 40 : 20);
            },
            selectionChanged: function () { _vibrate(10); }
        },

        // Links
        openLink: function (url) { window.open(url, "_blank"); },
        openTelegramLink: function (url) { window.open(url, "_blank"); },

        // sendData - web mode: redirect back to game hub
        sendData: function (data) {
            console.info("[COMPAT] sendData intercepted, redirecting to game hub");
            window.__valdoria_transitioning = true;
            var gameUrl = window.location.pathname.replace(/\/[^\/]+\/index\.html.*$/, "/game/index.html");
            window.location.replace(gameUrl);
        },

        // Events (no-op)
        onEvent: function () {},
        offEvent: function () {},

        // Popups
        showPopup: function (params, cb) {
            if (params.message) alert(params.message);
            if (cb) cb();
        },
        showAlert: function (msg, cb) { alert(msg); if (cb) cb(); },
        showConfirm: function (msg, cb) {
            var r = confirm(msg); if (cb) cb(r);
        },

        // Cloud storage (localStorage fallback)
        CloudStorage: {
            setItem: function (k, v, cb) {
                try { localStorage.setItem("tg_cloud_" + k, v); } catch (e) { console.warn("[COMPAT]", e.message || e); }
                if (cb) cb(null, true);
            },
            getItem: function (k, cb) {
                var v = null;
                try { v = localStorage.getItem("tg_cloud_" + k); } catch (e) { console.warn("[COMPAT]", e.message || e); }
                if (cb) cb(null, v);
            },
            getItems: function (keys, cb) {
                var r = {};
                keys.forEach(function (k) {
                    try { r[k] = localStorage.getItem("tg_cloud_" + k); } catch (e) { console.warn("[COMPAT]", e.message || e); }
                });
                if (cb) cb(null, r);
            },
            removeItem: function (k, cb) {
                try { localStorage.removeItem("tg_cloud_" + k); } catch (e) { console.warn("[COMPAT]", e.message || e); }
                if (cb) cb(null, true);
            },
            getKeys: function (cb) { if (cb) cb(null, []); }
        },

        isClosingConfirmationEnabled: false,
        headerColor: "#2a2420",
        backgroundColor: "#2a2420"
    };

    // Install polyfill
    window.Telegram = { WebApp: polyfill };
    document.documentElement.classList.add("web-standalone");

    // Browser back button
    window.addEventListener("popstate", function () {
        if (window._valdoriaBackCb) window._valdoriaBackCb();
    });

    // Viewport resize
    window.addEventListener("resize", function () {
        polyfill.viewportHeight = window.innerHeight;
        polyfill.viewportStableHeight = window.innerHeight;
    });

    console.info("[COMPAT] Telegram.WebApp polyfill active (web standalone)");

    // Redirect to login if no valid session (web-standalone only)
    if (!_token && window.location.pathname.indexOf('/web/') < 0) {
        var isDev = false;
        try {
            // Never call a non-existent method; ValdoriaEnv exposes .id ('dev'|'prod')
            isDev = (window.ValdoriaEnv && ValdoriaEnv.id === 'dev');
            // Hard guard: on PROD host we NEVER send user to /web/dev (which redirects to ?env=dev).
            if (window.ValdoriaEnv && ValdoriaEnv.isProd) isDev = false;
        } catch (e) { isDev = false; }
        var loginBase = isDev ? '/web/dev' : '/web/';

        /* [COMPAT:DIAG] (2026-04-21) sync XHR pra capturar ROOT CAUSE do redirect
           pra auth screen. Mesmo após o fix de URL fallback, logar se o branch é
           alcançado significa que algo ainda quebrou o handshake. */
        try {
            var _compatApi = _apiBase || (new URLSearchParams(window.location.search).get('api')) || '';
            var _compatUid = _userId || parseInt((new URLSearchParams(window.location.search).get('uid')) || '0', 10);
            if (_compatApi) {
                var _xhrC = new XMLHttpRequest();
                _xhrC.open('POST', _compatApi + '/api/game/log', false);
                _xhrC.setRequestHeader('Content-Type', 'application/json');
                _xhrC.send(JSON.stringify({
                    entries: [{
                        level: 'warn',
                        msg: '[COMPAT:DIAG] redirecting_to_web reason=no_token hrefHead=' + location.href.substring(0, 140)
                            + ' hashHead=' + (location.hash || '').substring(0, 40)
                            + ' lsKeys=' + (function () { try { var k = []; for (var i = 0; i < localStorage.length; i++) { var x = localStorage.key(i); if (x && x.indexOf('valdoria_') === 0) k.push(x); } return k.join(','); } catch (e) { return '(err)'; } })()
                            + ' urlHasToken=' + (new URLSearchParams(location.search).has('token'))
                            + ' urlHasUid=' + (new URLSearchParams(location.search).has('uid'))
                            + ' urlHasApi=' + (new URLSearchParams(location.search).has('api'))
                            + ' pathname=' + location.pathname
                    }],
                    uid: _compatUid
                }));
            }
        } catch (_eXc) {}
        console.warn('[COMPAT] No session token — redirecting to login portal: ' + loginBase);
        window.location.replace(loginBase);
    }
})();

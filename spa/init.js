/* SPA init — bootstrap com diagnóstico detalhado (2026-04-21).
 *
 * DIAG via sendBeacon direto pra /api/game/log:
 *   - roda ANTES de qualquer redirect
 *   - sobrevive a location.replace (sendBeacon é garantido pelo browser)
 *   - independente de log-relay (que pode não ter flushado ainda)
 *
 * Tags: [SPA:DIAG] (console) + [SPA:DIAG-BEACON] (via beacon → bot.log)
 *
 * Objetivo: capturar o root cause de "caiu na tela de auth" após vitória do combate.
 * Ver: feedback_follow_user_clues.md, docs/sistemas/combat2-master-index.md
 */
(function () {
    "use strict";

    function _captureDiag(routeParams, route) {
        var _hasTg = !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
        var _initDataLen = _hasTg ? (window.Telegram.WebApp.initData || '').length : 0;
        return {
            route: route,
            hasTg: _hasTg,
            initDataLen: _initDataLen,
            rpToken: routeParams.token ? (String(routeParams.token).substring(0, 12) + '…') : null,
            rpUid: routeParams.uid || null,
            rpApi: !!routeParams.api,
            rpApiVal: routeParams.api || null,
            rpEnv: routeParams.env || null,
            rpReturn: routeParams.return || null,
            rpChar: routeParams.char || null,
            hash: location.hash ? location.hash.substring(0, 50) : null,
            hrefLen: location.href.length,
            hrefHead: location.href.substring(0, 140),
            readyState: document.readyState,
            ts: Date.now()
        };
    }

    function _sendDiagBeacon(stage, diag, apiBase) {
        try {
            if (!apiBase) return false;
            var payload = {
                entries: [{ level: 'info', msg: '[SPA:DIAG-BEACON] stage=' + stage + ' ' + JSON.stringify(diag) }],
                uid: parseInt(diag.rpUid || '0', 10)
            };
            var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            if (navigator.sendBeacon) {
                return navigator.sendBeacon(apiBase + '/api/game/log', blob);
            }
            /* Fallback: fetch keepalive (funciona em redirect) */
            fetch(apiBase + '/api/game/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(function () {});
            return true;
        } catch (e) {
            return false;
        }
    }

    function bootstrap() {
        var params = new URLSearchParams(window.location.search);
        var route = params.get("route") || "game";
        var routeParams = {};
        params.forEach(function (val, key) {
            if (key !== "route") routeParams[key] = val;
        });

        var diag = _captureDiag(routeParams, route);
        console.info('[SPA:DIAG] bootstrap_start ' + JSON.stringify(diag));
        var apiBase = routeParams.api || '';
        _sendDiagBeacon('bootstrap_start', diag, apiBase);

        /* Session guard: if navigating to game without session params AND not inside Telegram,
           redirect to web portal. FIX (2026-04-20): preserve location.hash (#tgWebAppData) pra
           Telegram SDK poder re-inicializar initData no destino.
           DIAG (2026-04-21): loga o motivo exato via sendBeacon antes de redirecionar. */
        if (route === "game" && !diag.hasTg && !routeParams.token && !routeParams.uid) {
            var _env = routeParams.env || "dev";
            var _tgHash = (location.hash && location.hash.indexOf("tgWebApp") >= 0) ? location.hash : "";
            var _webUrl = "/web/" + (_env === "prod" ? "" : "?env=" + _env) + _tgHash;
            console.warn("[SPA:DIAG] REDIRECT_TO_WEB url=" + _webUrl
                + " reason=no_session_params hasTg=" + diag.hasTg
                + " hasToken=" + !!routeParams.token + " hasUid=" + !!routeParams.uid
                + " hashPreserved=" + !!_tgHash);
            _sendDiagBeacon('redirect_to_web', diag, apiBase);
            window.__valdoria_transitioning = true;
            window.location.replace(_webUrl);
            return;
        }

        /* Skip title screen + loading overlay for non-game routes */
        if (route !== "game") {
            if (window.__introTitle) { try { window.__introTitle.hide(); } catch (e) {} }
            var _ts = document.getElementById("title-screen");
            if (_ts) _ts.remove();
            var _lo = document.getElementById("loading");
            if (_lo) _lo.style.display = "none";
        }

        console.info('[SPA:DIAG] navigate_start route=' + route);
        _sendDiagBeacon('navigate', diag, apiBase);
        SpaRouter.navigate(route, routeParams);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootstrap);
    } else {
        bootstrap();
    }
})();

/* SPA Navigation Helpers — valdoriaSpaNav + valdoriaSpaClose */
(function () {
    "use strict";

    /**
     * Navigate to a URL using SPA routing when possible.
     * Detects ?route=X in the URL and uses SpaRouter.navigate().
     * Falls back to window.location.replace() for external URLs.
     */
    window.valdoriaSpaNav = function (url) {
        if (!url) return;

        // In SPA mode, try internal routing
        if (window.SpaRouter && window.__spaRouteName) {
            var route = _detectRoute(url);
            if (route && SpaRouter._routes && SpaRouter._routes[route]) {
                var params = _extractParams(url);
                console.debug("[SPA-NAV] Internal navigate:", route, params);
                SpaRouter.navigate(route, params);
                return;
            }
        }

        // Fallback: full page navigation
        window.__valdoria_transitioning = true;
        window.location.replace(url);
    };

    /**
     * Close/exit: navigate to game route in SPA mode, or close WebApp in standalone.
     */
    window.valdoriaSpaClose = function () {
        if (window.__spaRouteName && window.SpaRouter) {
            console.debug("[SPA-NAV] Close -> navigate to game");
            SpaRouter.navigate("game", {});
            return;
        }
        if (window.Telegram && Telegram.WebApp && Telegram.WebApp.close) {
            Telegram.WebApp.close();
        }
    };

    function _detectRoute(url) {
        try {
            var u = new URL(url, window.location.origin);
            return u.searchParams.get("route") || null;
        } catch (e) {
            // Try regex fallback for relative URLs
            var m = url.match(/[?&]route=([^&#]+)/);
            return m ? m[1] : null;
        }
    }

    function _extractParams(url) {
        var params = {};
        try {
            var u = new URL(url, window.location.origin);
            u.searchParams.forEach(function (v, k) {
                if (k !== "route" && k !== "v") params[k] = v;
            });
        } catch (e) {
            // Regex fallback
            var pairs = url.split(/[?&]/);
            for (var i = 0; i < pairs.length; i++) {
                var kv = pairs[i].split("=");
                if (kv.length === 2 && kv[0] !== "route" && kv[0] !== "v") {
                    params[kv[0]] = decodeURIComponent(kv[1] || "");
                }
            }
        }
        return params;
    }
})();

/* SPA ROUTER - Lightweight hash-based router for Valdoria */
(function () {
    "use strict";

    var _routes = {};
    var _current = null;
    var _loadedCSS = {};
    var _loadedJS = {};
    var _navigating = false;

    var Router = {
        register: function (name, config) { _routes[name] = config; },

        navigate: function (name, params) {
            if (_navigating) return Promise.resolve();
            if (!_routes[name]) {
                console.error("[SPA] Unknown route:", name);
                return Promise.resolve();
            }
            _navigating = true;
            return _doNavigate(name, params || {}).then(function () {
                _navigating = false;
            }).catch(function (e) {
                _navigating = false;
                console.error("[SPA] Navigation error:", e);
            });
        },

        current: function () { return _current; },
        isLoaded: function (src) { return !!_loadedJS[src]; },
        markLoaded: function (src) { _loadedJS[src] = true; },

        /* Fallback: leave SPA for external WebApp */
        external: function (url) {
            if (window.ValdoriaAudio && ValdoriaAudio.getCurrentTrack) {
                try {
                    var track = ValdoriaAudio.getCurrentTrack();
                    if (track) {
                        localStorage.setItem("valdoria_audio_resume", track);
                        localStorage.setItem("valdoria_audio_resume_ts", String(Date.now()));
                    }
                } catch (e) { /* optional */ }
            }
            window.__valdoria_transitioning = true;
            window.location.replace(url);
        },
    };

    function _doNavigate(name, params) {
        var route = _routes[name];
        var routeRoot = document.getElementById("route-root");
        if (!routeRoot) return Promise.reject(new Error("No #route-root"));
        console.debug("[SPA] Navigating to:", name);
        _cleanupCurrentRoute(routeRoot);
        _showLoading();
        window.__spaRouteParams = params;
        window.__spaRouteName = name;
        return _fetchRouteHTML(route).then(function (bodyHtml) {
            routeRoot.innerHTML = bodyHtml;
            // Remove elements that already exist in the shell (prevent duplicate IDs)
            var _shellIds = ["loading"];
            _shellIds.forEach(function (id) {
                var dup = routeRoot.querySelector("#" + id);
                if (dup) dup.remove();
            });
            return _loadExternals(route.external || []);
        }).then(function () {
            return _loadCSS(route.css || []);
        }).then(function () {
            return _loadScripts(route.sharedJs || []);
        }).then(function () {
            return _loadScripts(route.js || []);
        }).then(function () {
            _current = name;
            if (route.init && typeof route.init === "function") return route.init(params);
        }).then(function () {
            _hideLoading();
            console.debug("[SPA] Route ready:", name);
        });
    }

    function _cleanupCurrentRoute(routeRoot) {
        if (!_current) return;
        var prev = _routes[_current];
        if (prev && prev.cleanup) try { prev.cleanup(); } catch (e) { console.warn("[SPA] Cleanup:", e); }
        if (prev && prev.css) prev.css.forEach(function (h) {
            if (_loadedCSS[h]) { _loadedCSS[h].remove(); delete _loadedCSS[h]; }
        });
        routeRoot.innerHTML = "";
    }

    function _fetchRouteHTML(route) {
        if (route.html) return Promise.resolve(route.html);
        if (route.page) {
            return fetch(route.page + "?v=" + Date.now()).then(function (r) {
                if (!r.ok) throw new Error("Fetch " + route.page + " failed: " + r.status);
                return r.text();
            }).then(function (full) { return _extractBody(full); });
        }
        return Promise.resolve("");
    }

    function _extractBody(html) {
        var re = /<body[^>]*>([\s\S]*)<\/body>/i;
        var m = re.exec(html);
        if (!m) return "";
        return m[1].replace(/<script[\s\S]*?<\/script>/gi, "");
    }

    function _loadCSS(hrefs) {
        hrefs.forEach(function (h) {
            if (_loadedCSS[h]) return;
            var link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = h + "?v=" + Date.now();
            document.head.appendChild(link);
            _loadedCSS[h] = link;
        });
        return Promise.resolve();
    }

    function _loadExternals(urls) {
        return Promise.all(urls.map(function (u) {
            return _loadedJS[u] ? Promise.resolve() : _loadOneScript(u);
        }));
    }

    function _loadScripts(srcs) {
        var chain = Promise.resolve();
        srcs.forEach(function (s) {
            chain = chain.then(function () {
                return _loadedJS[s] ? Promise.resolve() : _loadOneScript(s + "?v=" + Date.now());
            });
        });
        return chain;
    }

    function _loadOneScript(src) {
        return new Promise(function (resolve) {
            var s = document.createElement("script");
            s.src = src;
            s.onload = function () { _loadedJS[src.split("?")[0]] = true; resolve(); };
            s.onerror = function () { console.error("[SPA] Script failed:", src); resolve(); };
            document.body.appendChild(s);
        });
    }

    function _showLoading() {
        var el = document.getElementById("loading");
        if (el) el.style.display = "";
    }
    function _hideLoading() {
        var el = document.getElementById("loading");
        if (el) el.style.display = "none";
    }

    window.SpaRouter = Router;
})();

/**
 * Shared API URL auto-discovery for all WebApps.
 * Periodically checks if tunnel URL changed and live-updates apiBase.
 * Fallback chain: health endpoint -> api-url.json (GitHub Pages).
 */
var ApiDiscovery = (function () {
    var _interval = null;
    var _apiBase = '';
    var _onUrlChange = null;
    var _checking = false;
    var INTERVAL_MS = 30000; // 30s between checks

    function init(apiBase, onUrlChange) {
        _apiBase = (apiBase || '').replace(/\/$/, '');
        _onUrlChange = onUrlChange;
        if (_interval) clearInterval(_interval);
        _interval = setInterval(_check, INTERVAL_MS);
    }

    function stop() {
        if (_interval) { clearInterval(_interval); _interval = null; }
    }

    function updateBase(newUrl) {
        _apiBase = (newUrl || '').replace(/\/$/, '');
    }

    async function _check() {
        if (_checking || !_apiBase) return;
        _checking = true;
        try {
            // 1. Try health — if OK, tunnel is alive
            var _acH = new AbortController();
            var _tidH = setTimeout(function() { _acH.abort(); }, 5000);
            var resp = await fetch(_apiBase + '/api/game/health', {
                signal: _acH.signal,
            });
            clearTimeout(_tidH);
            if (resp.ok) { _checking = false; return; }
        } catch (e) { /* health failed, try discovery */ }

        // 2. Fetch api-url.json from GitHub Pages
        try {
            var _acD = new AbortController();
            var _tidD = setTimeout(function() { _acD.abort(); }, 4000);
            var resp2 = await fetch('../api-url.json?t=' + Date.now(), {
                cache: 'no-store',
                signal: _acD.signal,
            });
            clearTimeout(_tidD);
            if (!resp2.ok) { _checking = false; return; }
            var data = await resp2.json();
            var newUrl = (data.url || '').replace(/\/$/, '');
            if (newUrl && newUrl !== _apiBase) {
                console.debug('[ApiDiscovery] URL changed:', _apiBase, '->', newUrl);
                _apiBase = newUrl;
                if (_onUrlChange) _onUrlChange(newUrl);
            }
        } catch (e) {
            console.warn('[ApiDiscovery] check failed:', e.message || e);
        }
        _checking = false;
    }

    return { init: init, stop: stop, updateBase: updateBase };
})();

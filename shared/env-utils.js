var ValdoriaEnv = (function() {
    'use strict';
    /* Honor explicit window._envOverride (set by portal pages like web/dev.html)
     * before falling back to URL param or hostname-based detection. */
    function _looksLikeProdHost(hostname) {
        hostname = String(hostname || '').toLowerCase();
        // Canonical prod host (legacy)
        if (hostname === 'jogo.lendasdevaldoria.com.br') return true;
        // Current prod tunnel host
        if (hostname === 'prod.lendasdevaldoria.com.br') return true;
        // Any other *.lendasdevaldoria.com.br defaults to prod unless explicitly dev.*
        if (hostname.endsWith('.lendasdevaldoria.com.br') && !hostname.startsWith('dev.')) return true;
        return false;
    }
    var _hostProd = _looksLikeProdHost(window.location.hostname);
    var _envOverride = window._envOverride || new URLSearchParams(window.location.search).get('env');
    // Hard guard: on PROD host we NEVER allow forcing env=dev via query param.
    // This prevents grotesque cross-env contamination after redirects/restarts.
    if (_hostProd && _envOverride === 'dev') {
        try { console.warn('[ENV] Ignoring env=dev override on PROD host:', window.location.hostname); } catch (e) {}
        _envOverride = null;
    }
    var _isProd = _envOverride ? (_envOverride === 'prod') : _hostProd;
    var _envId = _isProd ? 'prod' : 'dev';

    function getEnvKey(baseKey) {
        return baseKey + '_' + _envId;
    }

    return {
        id: _envId,
        isProd: _isProd,
        getEnvKey: getEnvKey
    };
})();

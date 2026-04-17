var ValdoriaEnv = (function() {
    'use strict';
    /* Honor explicit window._envOverride (set by portal pages like web/dev.html)
     * before falling back to URL param or hostname-based detection. */
    var _envOverride = window._envOverride || new URLSearchParams(window.location.search).get('env');
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
    var _isProd = _envOverride ? (_envOverride === 'prod') : _looksLikeProdHost(window.location.hostname);
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

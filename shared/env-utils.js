var ValdoriaEnv = (function() {
    'use strict';
    /* Honor explicit window._envOverride (set by portal pages like web/dev.html)
     * before falling back to URL param or hostname-based detection. */
    var _envOverride = window._envOverride || new URLSearchParams(window.location.search).get('env');
    var _isProd = _envOverride ? (_envOverride === 'prod') : (window.location.hostname === 'jogo.lendasdevaldoria.com.br');
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

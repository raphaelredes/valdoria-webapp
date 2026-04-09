var ValdoriaEnv = (function() {
    'use strict';
    var _envOverride = new URLSearchParams(window.location.search).get('env');
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

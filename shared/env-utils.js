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
    // 2026-05-04 USER FIX: Removed the hard guard that silently ignored env=dev
    // on the canonical host (jogo.lendasdevaldoria.com.br). Architecture (.env)
    // intentionally shares WEBAPP_BASE_URL between DEV and PROD bots, so
    // ?env=dev MUST be honored on the canonical host — otherwise DEV players
    // can never access their characters via web. Cross-env contamination is
    // already prevented by:
    //   - env-prefixed localStorage keys (*_dev vs *_prod)
    //   - separate api-url-{env}.json files
    //   - bot_id-based OAuth (DEV bot signs DEV tokens; PROD bot signs PROD)
    //   - server-side token validation (DEV API rejects PROD tokens, vice-versa)
    // Honoring ?env=dev here just changes which API/bot the WebApp talks to;
    // the user's actual data (chars, etc.) stays scoped to their env via auth.
    if (_envOverride && _envOverride !== 'prod' && _envOverride !== 'dev') {
        // Reject malformed override values
        try { console.warn('[ENV] Ignoring invalid env override:', _envOverride); } catch (e) {}
        _envOverride = null;
    }
    var _isProd = _envOverride ? (_envOverride === 'prod') : _hostProd;
    var _envId = _isProd ? 'prod' : 'dev';
    if (_envOverride && _envOverride !== (_hostProd ? 'prod' : 'dev')) {
        try { console.info('[ENV] Override active: env=' + _envId + ' on host=' + window.location.hostname); } catch (e) {}
    }

    function getEnvKey(baseKey) {
        return baseKey + '_' + _envId;
    }

    return {
        id: _envId,
        isProd: _isProd,
        getEnvKey: getEnvKey
    };
})();

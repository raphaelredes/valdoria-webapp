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
    var _hostname = String(window.location.hostname || '').toLowerCase();
    var _hostProd = _looksLikeProdHost(_hostname);
    var _envOverride = window._envOverride || new URLSearchParams(window.location.search).get('env');

    // 2026-05-04 USER ARCHITECTURE RULE (canonical):
    //   • jogo.lendasdevaldoria.com.br  → PROD ONLY (canonical public host)
    //   • dev.lendasdevaldoria.com.br   → DEV (auth-restricted allowlist)
    //   • bot-launched WebApps from DEV bot use jogo.* with HMAC initData
    //     (NOT ?env=dev — that's the path for browser users only)
    //
    // If a user lands on jogo.*?env=dev (e.g., from an old link/typo), we
    // REDIRECT to dev.lendasdevaldoria.com.br/web/?env=dev. This is the ONLY
    // valid browser entry point for DEV. Never silently honor ?env=dev on
    // jogo.* — that mixes PROD bot OAuth + DEV API and just creates broken
    // sessions ("Bot domain invalid" or worse, cross-env contamination).
    if (_hostname === 'jogo.lendasdevaldoria.com.br' && _envOverride === 'dev') {
        try { console.warn('[ENV] jogo.* + ?env=dev → redirecting to dev.lendasdevaldoria.com.br (DEV is auth-restricted on dev.*)'); } catch (e) {}
        var _newUrl = 'https://dev.lendasdevaldoria.com.br' + window.location.pathname + window.location.search + window.location.hash;
        try { window.location.replace(_newUrl); } catch (e) { /* noqa: preflight */ }
        // Continue with PROD env below — the redirect supersedes; this
        // only prevents a flash of broken auth in case redirect is delayed.
        _envOverride = null;
    }

    if (_envOverride && _envOverride !== 'prod' && _envOverride !== 'dev') {
        try { console.warn('[ENV] Ignoring invalid env override:', _envOverride); } catch (e) {}
        _envOverride = null;
    }
    var _isProd = _envOverride ? (_envOverride === 'prod') : _hostProd;
    var _envId = _isProd ? 'prod' : 'dev';
    if (_envOverride && _envOverride !== (_hostProd ? 'prod' : 'dev')) {
        try { console.info('[ENV] Override active: env=' + _envId + ' on host=' + _hostname); } catch (e) {}
    }

    function getEnvKey(baseKey) {
        return baseKey + '_' + _envId;
    }

    /* 2026-05-11 (user request): adicionar classe `app-frame` em <html>
       SOMENTE em hosts reais (jogo.* e dev.*). Isso ativa o "molde epico"
       definido em valdoria-design.css (html.app-frame { ... }) — visivel
       apenas em navegador desktop/tablet (via media query hover+pointer:fine
       +min-width:700px). Simuladores file:// e qualquer outro contexto
       NAO recebem a classe -> ficam sem o frame, preservando telas de debug
       ao redor (regra soberana).

       Hostnames reais:
         - jogo.lendasdevaldoria.com.br (PROD)
         - dev.lendasdevaldoria.com.br (DEV)
         - prod.lendasdevaldoria.com.br (PROD tunnel atual) */
    var _APP_FRAME_HOSTS = [
        'jogo.lendasdevaldoria.com.br',
        'dev.lendasdevaldoria.com.br',
        'prod.lendasdevaldoria.com.br'
    ];
    if (_APP_FRAME_HOSTS.indexOf(_hostname) >= 0) {
        try {
            if (document.documentElement) {
                document.documentElement.classList.add('app-frame');
            } else if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function () {
                    try { document.documentElement.classList.add('app-frame'); } catch (e) {}
                }, { once: true });
            }
        } catch (e) { /* silent — frame e cosmetic */ }
    }

    return {
        id: _envId,
        isProd: _isProd,
        getEnvKey: getEnvKey
    };
})();

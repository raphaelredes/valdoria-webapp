/* Auth Gate — Universal Authentication Check (2026-05-11)
 *
 * Verifica se o jogador tem contexto de autenticacao ANTES de carregar
 * qualquer pagina de jogo. Sem auth -> redireciona pra /web/ (tela de
 * login Telegram OAuth + Google Sign-In).
 *
 * Atende user request: "faca com que apareca a tela de autenticacao caso
 * alguma pagina nao seja carregada por nao estar autenticado".
 *
 * Detecta 3 contextos validos (qualquer um -> permite carregar a pagina):
 *   1. Telegram WebApp initData (window.Telegram.WebApp.initData presente)
 *   2. URL params token + uid (bot-launched WebApp com HMAC)
 *   3. localStorage session web (v_dev_session_* ou v_prod_session_*)
 *
 * Skip automatico (NUNCA redireciona):
 *   - Simuladores file:// e qualquer hostname nao-real
 *   - Paths /web/, /play/, /apoie/, /legal/, /docs/, / (root)
 *   - Quando ja foi checado nesta sessao (idempotente)
 *
 * Load: precisa ser sincrono e ANTES de qualquer outra logica de pagina.
 * Recomendado: <script src="../shared/auth-gate.js"></script> no inicio
 * do <head>, apos meta tags + Telegram SDK (se aplicavel), antes do CSS
 * de design.
 */
(function () {
    'use strict';

    if (window.__valdoriaAuthGateChecked) return;
    window.__valdoriaAuthGateChecked = true;

    var host = String(location.hostname || '').toLowerCase();
    var REAL_HOSTS = [
        'jogo.lendasdevaldoria.com.br',
        'dev.lendasdevaldoria.com.br',
        'prod.lendasdevaldoria.com.br'
    ];
    if (REAL_HOSTS.indexOf(host) < 0) return;  // simulator file://, local dev, etc

    var path = String(location.pathname || '').toLowerCase();
    /* Paths que NAO exigem auth (entry pages + utility) */
    var SKIP_PATHS = ['/web/', '/play/', '/apoie/', '/legal/', '/docs/', '/_test/'];
    for (var sp = 0; sp < SKIP_PATHS.length; sp++) {
        if (path.indexOf(SKIP_PATHS[sp]) === 0) return;
    }
    if (path === '/' || path === '/index.html') return;

    /* Check 1: Telegram WebApp initData */
    try {
        var tg = window.Telegram && window.Telegram.WebApp;
        if (tg && tg.initData && String(tg.initData).length > 0) return;
    } catch (e) { /* sem Telegram SDK ainda — segue */ }

    /* Check 2: URL params (bot-launched WebApp com HMAC).
       Aceita token (game session), creation_token (character creator
       flow) ou session_token (legacy alias). uid sempre necessario. */
    try {
        var params = new URLSearchParams(location.search);
        var hasUid = !!params.get('uid');
        var hasAnyToken = !!(params.get('token') || params.get('creation_token') || params.get('session_token'));
        if (hasUid && hasAnyToken) return;
    } catch (e) { /* URLSearchParams indisponivel — segue */ }

    /* Check 3: localStorage session web. Keys canonicas vem do web-auth.js
       (~L45+): valdoria_web_token_<env> + valdoria_web_user_id_<env>. */
    var env = host.indexOf('dev.') === 0 ? 'dev' : 'prod';
    try {
        var tokenKey = 'valdoria_web_token_' + env;
        var userKey = 'valdoria_web_user_id_' + env;
        var savedToken = localStorage.getItem(tokenKey);
        var savedUser = localStorage.getItem(userKey);
        if (savedToken && savedUser) return;  /* sessao web autenticada */

        /* Fallback adicional: qualquer key v_<env>_session_* (sim/dev legacy) */
        var len = localStorage.length || 0;
        for (var i = 0; i < len; i++) {
            var key = localStorage.key(i) || '';
            if (key.indexOf('v_' + env + '_session_') === 0) {
                return;
            }
        }
    } catch (e) { /* localStorage bloqueado — segue pro redirect */ }

    /* Nenhum contexto -> redireciona pra /web/ (auth screen) */
    try {
        /* Salva URL atual pra retornar apos auth bem-sucedida */
        sessionStorage.setItem(
            'v_postauth_redirect',
            location.pathname + location.search + location.hash
        );
    } catch (e) { /* sessionStorage bloqueado — sem retorno pos-auth */ }

    try { window.__valdoria_transitioning = true; } catch (e) {}
    try { console.warn('[AUTH-GATE] Sem contexto de auth em', path, '-> /web/'); } catch (e) {}

    location.replace('/web/');
})();

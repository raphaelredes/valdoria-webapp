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
 *   3. localStorage session web (valdoria_session_<env> via vAuthTokenStore)
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
    /* Paths que NAO exigem auth — apenas a tela de autenticacao e paginas
       publicas. /play/ AGORA tambem e gateado (user request 2026-05-11:
       "literalmente tudo que vier depois de dev.com/ deve redirecionar
       para tela de autenticacao caso nao esteja autenticado"). */
    var SKIP_PATHS = ['/web/', '/apoie/', '/legal/', '/docs/', '/_test/'];
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

    /* Check 3 (bug C1 fix, Sessao #68 2026-06-01): localStorage
       `valdoria_session_<env>` — a chave CANONICA escrita por vAuthTokenStore
       (shared/auth-token-store.js) em /play/ e /web/ apos auth bem-sucedida.
       Formato: {token, user_id, char_id, env, scope, api_base, saved_at}.

       Lemos a chave DIRETO (nao via window.vAuthTokenStore.getRecord) porque
       o auth-gate carrega ANTES de auth-token-store.js no <head> de TODAS as
       paginas — window.vAuthTokenStore ainda eh undefined neste ponto.

       Antes (bug C1, account-linking-design.md §C): liamos uma chave ORFA
       antiga (campos `uid`/`apiBase`/`ts`) que NADA escrevia (REFACTOR-1
       Sessao #65 centralizou no writer novo e deixou este reader apontando
       pra chave morta). Resultado: o redirect "pular prompt" NUNCA disparava
       e /web/ reaparecia mesmo ja autenticado.

       Se presente e valida (token+user_id+api_base, env bate, < 30 dias),
       REDIRECT direto pra /cidade/?token=... (skip /web/ login screen). */
    try {
        var _env = host === 'dev.lendasdevaldoria.com.br' ? 'dev' : 'prod';
        var sessKey = 'valdoria_session_' + _env;
        var rawSession = localStorage.getItem(sessKey);
        if (rawSession) {
            var sess = JSON.parse(rawSession);
            // env stamp deve bater com o ambiente atual (Environment Isolation)
            var envOk = !sess.env || sess.env === _env;
            // Valid session: token + user_id + api_base present, NOT older than 30 days
            var ageMs = Date.now() - (sess.saved_at || 0);
            var maxAge = 30 * 24 * 60 * 60 * 1000;  // 30 days
            if (envOk && sess.token && sess.user_id && sess.api_base && ageMs < maxAge) {
                // Redirect direto pra cidade com URL params (game pages lêem do URL)
                var url = '/cidade/?token=' + encodeURIComponent(sess.token)
                    + '&api=' + encodeURIComponent(sess.api_base)
                    + '&uid=' + encodeURIComponent(String(sess.user_id))
                    + '&env=' + encodeURIComponent(sess.env || _env)
                    + (sess.char_id ? '&char=' + encodeURIComponent(sess.char_id) : '')
                    + '&_cb=' + Date.now();
                // Se já estamos em /cidade/, /exploracao/, etc, NAO redirect (deixa página carregar)
                if (path === '/play/' || path === '/play') {
                    try { console.info('[AUTH-GATE] valdoria_session detectada — redirect /play/ -> /cidade/ com URL params'); } catch(_){}
                    try { window.__valdoria_transitioning = true; } catch(_){}
                    location.replace(url);
                    return;
                }
                // Em outras game pages, deixa página carregar (já é destino válido)
                try { console.info('[AUTH-GATE] valdoria_session detectada — permite carregar', path); } catch(_){}
                return;
            }
        }
    } catch (e) {
        try { console.warn('[AUTH-GATE] valdoria_session check falhou', e); } catch(_){}
    }

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

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

    /* NAO ha mais Check 3 de localStorage standalone. Game pages precisam
       de URL token pra funcionar (API client le do URL). localStorage soh
       e usado por /web/'s checkExistingSession() que detecta sessao e
       redireciona pra game com URL params via redirectToGame().

       Resultado: usuario com localStorage mas sem URL token visita /cidade/
       -> gate redireciona pra /web/ -> /web/ detecta localStorage -> faz
       fetch /api/game/state -> redirect pra "tela salva no personagem" com
       URL params completos. User-facing: 1 redirect extra mas garante que
       o destino sempre routes pra last_screen_payload (atende user request
       2026-05-11: "se estiver autenticado deve ir para a tela que esta
       salvo no personagem"). */

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

'use strict';

/* =============================================
   Lendas de Valdoria — Web Login (v2)
   ============================================= */

// Allow portal-level override (window._envOverride) or URL ?env=dev to force mode
function _looksLikeProdHost(hostname) {
    hostname = String(hostname || '').toLowerCase();
    if (hostname === 'jogo.lendasdevaldoria.com.br') return true;
    if (hostname === 'prod.lendasdevaldoria.com.br') return true;
    if (hostname.endsWith('.lendasdevaldoria.com.br') && !hostname.startsWith('dev.')) return true;
    return false;
}
var _hostname = String(window.location.hostname || '').toLowerCase();
var _hostProd = _looksLikeProdHost(_hostname);
var _envOverride = window._envOverride || new URLSearchParams(window.location.search).get('env');

// 2026-05-04 USER ARCHITECTURE RULE (canonical):
//   • jogo.lendasdevaldoria.com.br = PROD ONLY (canonical public host)
//   • dev.lendasdevaldoria.com.br  = DEV (auth-restricted allowlist)
// Browser DEV access goes ONLY through dev.*. If user lands on jogo.*?env=dev,
// redirect to dev.*?env=dev. See shared/env-utils.js for full rationale.
if (_hostname === 'jogo.lendasdevaldoria.com.br' && _envOverride === 'dev') {
    console.warn('[WEB-AUTH] jogo.* + ?env=dev → redirecting to dev.lendasdevaldoria.com.br');
    try {
        var _devUrl = 'https://dev.lendasdevaldoria.com.br' + window.location.pathname + window.location.search + window.location.hash;
        /* 2026-05-18 preflight fix (check_webapp_transition_flag): flag impede
           close beacon dispar durante transicao entre hosts (jogo.* → dev.*). */
        window.__valdoria_transitioning = true;
        window.location.replace(_devUrl);
    } catch (e) { /* noqa: preflight */ }
    _envOverride = null;
}

if (_envOverride && _envOverride !== 'prod' && _envOverride !== 'dev') {
    console.warn('[WEB-AUTH] Ignoring invalid env override:', _envOverride);
    _envOverride = null;
}
var _isProd = _envOverride ? (_envOverride === 'prod') : _hostProd;
var BOT_USERNAME = _isProd ? 'LendasDeValdoriaBOT' : 'DevValdoriaBot';
var _envId = _isProd ? 'prod' : 'dev';
if (_envOverride && _envOverride !== (_hostProd ? 'prod' : 'dev')) {
    console.info('[WEB-AUTH] env override ACTIVE: env=' + _envId + ' (host=' + _hostname + ' would default to ' + (_hostProd ? 'prod' : 'dev') + ')');
}

// Storage keys
var WEB_TOKEN_KEY = 'valdoria_web_token' + '_' + _envId;
var WEB_USER_KEY = 'valdoria_web_user_id' + '_' + _envId;
var WEB_API_KEY = 'valdoria_api_base' + '_' + _envId;
// BUG #3 fix (session-control-audit.md): env suffix for DEV_DEVICE_KEY
// prevents cross-env contamination when user accesses both DEV and PROD
// from the same browser. Server already rejects DEV tokens in PROD, but
// this keeps localStorage isolation consistent with other storage keys.
var DEV_DEVICE_KEY = 'valdoria_dev_device_' + _envId;
// Legacy key cleanup — remove old unsuffixed key on any load
try { localStorage.removeItem('valdoria_dev_device'); } catch (_) { /* noqa: preflight */ }

var _apiBase = '';
var _authToken = '';
var _userId = 0;
var _characters = [];
var _selectedCharId = '';
var _isDevLogin = false;
// AUTH-1 (Sessao #64): link_mode quando a tela /web/ foi aberta como
// callback de "Vincular Google" a partir das Configuracoes. Quando setado,
// o id_token vai pro endpoint /api/auth/link-account (com Bearer da sessao
// existente em sessionStorage) em vez do /api/auth/login normal.
var _linkMode = '';  // '', 'google'
var _linkPending = null;  // { token, api, returnUrl, ts }
/* 2026-06-08: ?hall=1 — quando o jogador volta do criador pro Hall (botao Voltar
   na 1a tela). Forca a tela de selecao (#screen-chars) a aparecer mesmo com 0 ou 1
   personagem, em vez de auto-redirecionar pro jogo/criador (que causava o loop
   criador<->/web/ pra contas com 0 chars). NUNCA usar como early-return no topo
   (auth precisa rodar primeiro) — so dentro dos ramos de contagem de personagens. */
var _forceHall = false;
try { _forceHall = (new URLSearchParams(location.search).get('hall') === '1'); } catch (_eh) { /* noqa: preflight */ }

/* ----- API Base Discovery ----- */

async function discoverApiBase() {
    // 1. Check localStorage (env-specific key to prevent cross-env contamination)
    var envApiKey = WEB_API_KEY;
    var stored = localStorage.getItem(envApiKey);
    if (stored) {
        _apiBase = stored;
        return true;
    }
    // Clear old generic key if exists (migration)
    localStorage.removeItem(WEB_API_KEY);
    // 2. Try environment-specific api-url file (ONLY source of truth)
    // CROSS-ENV ISOLATION FIX 2026-04-11:
    // Removed: fallback to generic api-url.json (would cause @raphaelrego
    // on DEV to see PROD characters when env-specific file was missing).
    // Now: if api-url-{env}.json fails, we FAIL FAST with an error shown
    // to the user — never silently mix environments.
    var env = _isProd ? 'prod' : 'dev';
    try {
        var resp = await fetch('../api-url-' + env + '.json?t=' + Date.now(), { cache: 'no-store' });
        if (resp.ok) {
            var data = await resp.json();
            // Defensive: verify the env field matches (if present) — prevents cross-env contamination
            if (data.env && data.env !== env) {
                console.error('[WEB-AUTH] api-url-' + env + '.json has wrong env field: ' + data.env + ' (expected ' + env + ')');
                return false;
            }
            if (data.url) {
                _apiBase = data.url.replace(/\/$/, '');
                localStorage.setItem(WEB_API_KEY, _apiBase);
                return true;
            }
        }
    } catch (e) {
        console.warn('[WEB-AUTH] api-url-' + env + '.json not found', e);
    }
    // 3. No fallback — show explicit env-isolation error
    console.error('[WEB-AUTH] api-url-' + env + '.json missing or invalid — aborting discovery (no generic fallback to preserve env isolation)');
    return false;
}

/* ----- Telegram Login Widget (hidden, auth-only) ----- */

/* ----- Telegram OAuth Redirect (no widget/iframe) ----- */

function loadTelegramWidget() {
    /* Check if we're returning FROM an OAuth redirect (Telegram or Google). */
    _checkTelegramOAuthReturn();
    _checkGoogleOAuthReturn();
}

/* BUG #51 follow-up: when web-auth.js runs inside the DEV panel iframe,
 * the OAuth return hash lands on the top-level window (because the redirect
 * is navigated via topWin.location), not on the iframe. Read the hash from
 * the top-level window when same-origin access is possible, falling back
 * to the iframe's own hash for standalone mode. */
function _getOAuthReturnHash() {
    var hashCandidates = [];
    try {
        if (window.top && window.top !== window) {
            /* Same-origin iframe: top-level hash is accessible */
            var topHash = window.top.location.hash || '';
            if (topHash) hashCandidates.push({ win: window.top, hash: topHash });
        }
    } catch (e) {
        /* cross-origin: can't read top — fall through to own hash */
    }
    var ownHash = window.location.hash || '';
    if (ownHash) hashCandidates.push({ win: window, hash: ownHash });
    return hashCandidates;
}

function _clearOAuthHash(winObj) {
    try {
        var newUrl = winObj.location.pathname + winObj.location.search;
        if (winObj === window) {
            history.replaceState(null, '', newUrl);
        } else {
            /* Top-level: can't use history.replaceState across frame boundary
             * reliably on all browsers, so just reassign hash to empty. */
            winObj.history.replaceState(null, '', newUrl);
        }
    } catch (e) {
        console.warn('[WEB-AUTH] Failed to clear OAuth hash:', e);
    }
}

function _checkTelegramOAuthReturn() {
    /* Telegram OAuth redirect returns with hash fragment:
     * #tgAuthResult=<base64 JSON> */
    var candidates = _getOAuthReturnHash();
    for (var i = 0; i < candidates.length; i++) {
        var c = candidates[i];
        if (c.hash.indexOf('tgAuthResult=') === -1) continue;
        console.info('[WEB-AUTH] Telegram OAuth redirect detected (source=%s)',
            c.win === window ? 'self' : 'top');
        try {
            var encoded = c.hash.split('tgAuthResult=')[1];
            /* Strip trailing hash params (e.g. &other=x) */
            if (encoded.indexOf('&') !== -1) encoded = encoded.split('&')[0];
            var jsonStr = atob(encoded);
            var user = JSON.parse(jsonStr);
            console.info('[WEB-AUTH] Telegram OAuth user: %s id=%s', user.first_name, user.id);
            _clearOAuthHash(c.win);
            window.onTelegramAuth(user);
            return;
        } catch (e) {
            console.error('[WEB-AUTH] Failed to parse Telegram OAuth result:', e);
        }
    }
}

function _checkGoogleOAuthReturn() {
    /* Google OAuth implicit flow returns with hash fragment:
     * #id_token=<JWT>&... */
    var candidates = _getOAuthReturnHash();
    for (var i = 0; i < candidates.length; i++) {
        var c = candidates[i];
        if (c.hash.indexOf('id_token=') === -1) continue;
        console.info('[WEB-AUTH] Google OAuth redirect detected (source=%s)',
            c.win === window ? 'self' : 'top');
        try {
            var params = new URLSearchParams(c.hash.substring(1));
            var idToken = params.get('id_token');
            if (!idToken) continue;
            _clearOAuthHash(c.win);
            // AUTH-1 (Sessao #64): link_mode='google' route id_token to
            // /api/auth/link-account com Bearer da sessao existente, em vez
            // de /api/auth/login (que cria nova sessao).
            if (_linkMode === 'google') {
                _onGoogleAuthLink({ credential: idToken });
                return;
            }
            window.onGoogleAuth({ credential: idToken });
            return;
        } catch (e) {
            console.error('[WEB-AUTH] Failed to parse Google OAuth result:', e);
            showAuthError('Erro ao processar resposta do Google.');
        }
    }
}

/* AUTH-1 (Sessao #64): Vincular Google callback handler.
 * Recebe id_token do Google OAuth implicit flow, retira o Bearer token da
 * sessao salva em sessionStorage.valdoria_link_pending, POST /api/auth/
 * link-account, mostra mensagem e tenta voltar pro game. */
async function _onGoogleAuthLink(response) {
    console.info('[WEB-AUTH] AUTH-1 link callback received credential');
    if (!_linkPending || !_linkPending.token || !_linkPending.api) {
        console.error('[WEB-AUTH] AUTH-1 link_pending missing');
        showAuthError('Sessão de vinculação expirada. Volte ao jogo e tente novamente.');
        return;
    }
    var credential = response && response.credential;
    if (!credential) {
        showAuthError('Token Google ausente.');
        return;
    }
    showAuthLoading(true);
    hideAuthError();
    try {
        var resp = await fetch(_linkPending.api + '/api/auth/link-account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + _linkPending.token
            },
            body: JSON.stringify({
                provider: 'google',
                credential: credential
            })
        });
        var data = {};
        try { data = await resp.json(); } catch (_e) { /* noqa: preflight */ }
        if (resp.status === 409 && data && data.code === 'linked_to_another_account') {
            // Fase 4 (Sessão #68): oferece as >=3 opções de merge (data.merge).
            if (data.merge && data.merge.options && window.vMergeDialog) {
                showAuthLoading(false);
                window.vMergeDialog.show({
                    api: _linkPending.api, token: _linkPending.token,
                    credentialBody: { provider: 'google', credential: credential },
                    mergeData: data.merge,
                    onMerged: function () {
                        try { sessionStorage.removeItem('valdoria_link_pending'); } catch (_) { /* noqa: preflight */ }
                        try {
                            _showLoginUI();  // 2026-06-08: revela #screen-login (link mode o esconde via CSS)
                            var b = document.getElementById('screen-login');
                            if (b) b.innerHTML = '<div style="text-align:center;padding:24px;color:#d4c8b0;font-family:Cinzel,serif">'
                                + '<div style="font-size:48px;margin-bottom:16px">✓</div>'
                                + '<div style="font-size:18px">Contas vinculadas!</div>'
                                + '<div style="font-size:13px;opacity:.7;margin-top:12px">Você pode fechar esta janela.</div></div>';
                        } catch (_e) { /* noqa: preflight */ }
                    }
                });
                return;
            }
            showAuthError('Esta conta Google já está vinculada a outra conta.');
            return;
        }
        if (resp.ok && (data.linked || data.already_linked)) {
            // Limpa pending; mostra sucesso; tenta voltar pro game.
            try { sessionStorage.removeItem('valdoria_link_pending'); } catch (_) { /* noqa: preflight */ }
            var msg = data.already_linked ? 'Conta Google já vinculada.' : 'Conta Google vinculada com sucesso!';
            // Substitui a tela de login por uma mensagem de sucesso.
            try {
                _showLoginUI();  // 2026-06-08: revela #screen-login (link mode o esconde via CSS) + tira o #wa-boot
                var box = document.getElementById('screen-login');
                if (box) {
                    box.innerHTML = '<div class="wa-link-success" style="text-align:center;padding:24px;color:#d4c8b0;font-family:Cinzel,serif;">'
                        + '<div style="font-size:48px;margin-bottom:16px">✓</div>'
                        + '<div style="font-size:18px;margin-bottom:24px">' + msg + '</div>'
                        + '<div style="font-size:13px;opacity:0.7;margin-bottom:16px">Você pode fechar esta janela.</div>'
                        + '<button id="btn-link-back" class="wa-btn" style="margin-top:8px">Voltar ao jogo</button>'
                        + '</div>';
                    var btn = document.getElementById('btn-link-back');
                    if (btn) {
                        btn.onclick = function() {
                            var ret = (_linkPending && _linkPending.returnUrl) || '';
                            if (ret) {
                                window.__valdoria_transitioning = true;
                                window.location.replace(ret);
                            } else {
                                try { window.close(); } catch (_) { /* noqa: preflight */ }
                            }
                        };
                    }
                }
            } catch (_e) { /* noqa: preflight */ }
            return;
        }
        // Other failures
        var errMsg = (data && (data.error || data.message)) || 'Falha ao vincular Google.';
        showAuthError(errMsg);
    } catch (e) {
        console.error('[WEB-AUTH] AUTH-1 link error:', e);
        showAuthError(_friendlyError(e));
    } finally {
        showAuthLoading(false);
    }
}

/* ----- Custom Social Button Handlers ----- */

/* BUG #51 follow-up (2026-04-11): OAuth redirects MUST go to the top-level
 * window, not the current frame. When the portal is hosted inside the DEV
 * panel iframe (dev-debug-panel.js wraps the game in a 430px iframe), using
 * window.location navigates only the iframe — which then tries to load
 * oauth.telegram.org inside the frame, is blocked by X-Frame-Options:DENY,
 * and the iframe renders blank. _topWindow() returns window.top when the
 * portal is inside any iframe, falling back to window when standalone. */
function _topWindow() {
    try {
        if (window.top && window.top !== window) {
            return window.top;
        }
    } catch (e) {
        /* cross-origin access error means there IS a top window we can't
         * read, so navigation via window.top should still work */
    }
    return window;
}

window.onTelegramClick = function() {
    /* Redirect to Telegram OAuth page — clean, no iframe, no widget */
    var topWin = _topWindow();
    /* Return path must land on the same top URL that hosts the portal,
     * otherwise after Telegram OAuth the user ends up on a different page. */
    var origin = encodeURIComponent(topWin.location.origin);
    var returnTo = encodeURIComponent(topWin.location.href);
    /* bot_id must be numeric — map username to ID */
    var botIds = { 'LendasDeValdoriaBOT': '8511215729', 'DevValdoriaBot': '8544608824' };
    var botId = botIds[BOT_USERNAME] || BOT_USERNAME;
    var authUrl = 'https://oauth.telegram.org/auth?bot_id=' + botId
        + '&origin=' + origin
        + '&return_to=' + returnTo
        + '&request_access=write';
    console.info('[WEB-AUTH] Redirecting to Telegram OAuth bot_id=%s topWindow=%s',
        botId, topWin === window ? 'self' : 'parent');
    topWin.location.href = authUrl;
};

window.onGoogleClick = function() {
    /* Google OAuth 2.0 implicit flow — redirect, no popup.
     * Returns id_token directly in URL hash fragment. */
    var topWin = _topWindow();
    var nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('google_nonce', nonce);
    var redirectUri = topWin.location.origin + '/web/';
    var authUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
        + '?client_id=' + encodeURIComponent(_GOOGLE_CLIENT_ID)
        + '&redirect_uri=' + encodeURIComponent(redirectUri)
        + '&response_type=id_token'
        + '&scope=' + encodeURIComponent('openid email profile')
        + '&nonce=' + nonce
        + '&prompt=select_account';
    console.info('[WEB-AUTH] Redirecting to Google OAuth (implicit flow) topWindow=%s',
        topWin === window ? 'self' : 'parent');
    topWin.location.href = authUrl;
};

/* ----- Friendly Error Messages ----- */

function _friendlyError(e) {
    if (!e) return 'Erro desconhecido.';
    var msg = e.message || String(e);
    if (e.name === 'AbortError' || msg.indexOf('abort') !== -1) {
        return 'Servidor não respondeu a tempo. Verifique sua conexão e tente novamente.';
    }
    if (msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('NetworkError') !== -1 || msg.indexOf('network') !== -1) {
        return 'Servidor temporariamente indisponível. Tente novamente em alguns segundos.';
    }
    if (msg.indexOf('Load failed') !== -1) {
        return 'Falha na conexão com o servidor. Verifique sua internet.';
    }
    return msg;
}

/* ----- Auth Callbacks ----- */

window.onTelegramAuth = async function(user) {
    console.info('[WEB-AUTH] Telegram auth callback:', user.first_name, 'id:', user.id);
    showAuthLoading(true);
    hideAuthError();
    try {
        var ok = await discoverApiBase();
        if (!ok) {
            showAuthError('Não foi possível encontrar o servidor. Configure a URL manualmente.');
            return;
        }
        var resp = await fetch(_apiBase + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'telegram',
                telegram_data: user
            })
        });
        if (_checkRateLimit(resp)) return;
        if (!resp.ok) {
            var err = await resp.json().catch(function() { return {}; });
            throw new Error(err.error || 'Erro na autenticação (' + resp.status + ')');
        }
        var data = await resp.json();
        handleLoginSuccess(data);
    } catch (e) {
        console.error('[WEB-AUTH] Telegram login error:', e);
        showAuthError(_friendlyError(e));
    } finally {
        showAuthLoading(false);
    }
};

window.onGoogleAuth = async function(response) {
    console.info('[WEB-AUTH] Google auth callback received credential_len=%d', (response.credential || '').length);
    if (!response.credential) {
        console.error('[WEB-AUTH] Google auth callback WITHOUT credential — aborting');
        showAuthError('Google não retornou credencial. Tente novamente.');
        return;
    }
    showAuthLoading(true);
    hideAuthError();
    try {
        var ok = await discoverApiBase();
        console.info('[WEB-AUTH] API discovery ok=%s apiBase=%s', ok, _apiBase);
        if (!ok) {
            showAuthError('Não foi possível encontrar o servidor. Configure a URL manualmente.');
            return;
        }
        console.info('[WEB-AUTH] POST %s/api/auth/login provider=google', _apiBase);
        var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timeout = controller ? setTimeout(function() { controller.abort(); }, 15000) : null;
        var _fopts = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'google',
                credential: response.credential
            })
        };
        if (controller) { _fopts.signal = controller.signal; }
        var resp = await fetch(_apiBase + '/api/auth/login', _fopts);
        if (timeout) { clearTimeout(timeout); timeout = null; }
        console.info('[WEB-AUTH] Login response status=%d', resp.status);
        if (_checkRateLimit(resp)) return;
        if (!resp.ok) {
            var err = await resp.json().catch(function() { return {}; });
            console.error('[WEB-AUTH] Login failed status=%d error=%s', resp.status, err.error || '');
            throw new Error(err.error || 'Erro na autenticação (' + resp.status + ')');
        }
        var data = await resp.json();
        console.info('[WEB-AUTH] Login success user_id=%s chars=%d', data.user_id, (data.characters || []).length);
        handleLoginSuccess(data);
    } catch (e) {
        console.error('[WEB-AUTH] Google login error:', e);
        showAuthError(_friendlyError(e));
    } finally {
        if (timeout) { clearTimeout(timeout); }  // limpa o timer em erro (evita abort em contexto morto)
        showAuthLoading(false);
    }
};

/* ----- Login Success Handler ----- */

function handleLoginSuccess(data) {
    console.info('[WEB-AUTH] handleLoginSuccess user_id=%s token_len=%d chars=%d',
        data.user_id, (data.token || '').length, (data.characters || []).length);
    _authToken = data.token || '';
    _userId = data.user_id || 0;
    _characters = data.characters || [];

    // Persist credentials
    localStorage.setItem(WEB_TOKEN_KEY, _authToken);
    localStorage.setItem(WEB_USER_KEY, String(_userId));
    localStorage.setItem(WEB_API_KEY, _apiBase);

    // DEV permanent auto-login: persist device token if provided
    if (data.dev_device_token) {
        localStorage.setItem(DEV_DEVICE_KEY, data.dev_device_token);
        console.info('[WEB-AUTH] handleLoginSuccess: dev_device_token saved for future auto-login');
    }

    // 2026-06-08 (user): 1 personagem (e sem ?hall=1) → joga direto. TODO o resto —
    // 0 personagens, vários, ou ?hall=1 — mostra o Hall. Com 0 chars o Hall é o
    // "Crie sua Lenda" e o jogador FICA nele (NÃO encaminha pra criação sozinho;
    // ele toca "Criar Personagem"). Antes 0 chars ia direto pro criador.
    if (!_forceHall && _characters.length === 1) {
        _selectedCharId = _characters[0].id || _characters[0].char_id || '';
        redirectToGame(_selectedCharId, false);
    } else {
        showCharacterSelect();
    }
}

/* ----- Character Selection ----- */

function showCharacterSelect() {
    // 2026-06-08 (Loading-First): some o #wa-boot no MESMO frame em que mostra o
    // #screen-chars — o Hall aparece sob a cobertura e a cobertura é removida; a tela
    // de login NUNCA é exibida no caminho pro Hall (ela nem ficou wa-active).
    _hideBoot();
    document.getElementById('screen-login').classList.remove('wa-active');
    document.getElementById('screen-chars').classList.add('wa-active');
    /* Sessao #19 (2026-05-21): user pediu remover botao Sair quando aberto
       pelo Telegram WebApp. No Telegram so existe auth Telegram (initData)
       — nao ha Google login pra alternar conta. Botao Sair so faz sentido
       em browser desktop. _isInsideTelegram() ja existe (line 915). */
    try {
        var logoutBtn = document.querySelector('.wa-btn-logout');
        if (logoutBtn) {
            if (_isInsideTelegram()) {
                logoutBtn.style.display = 'none';
                logoutBtn.setAttribute('aria-hidden', 'true');
            } else {
                logoutBtn.style.display = '';
                logoutBtn.removeAttribute('aria-hidden');
            }
        }
    } catch (e) { /* non-fatal */ }
    renderCharacterList();
}

function renderCharacterList() {
    var list = document.getElementById('char-list');
    var playBtn = document.getElementById('btn-play');
    var createBtn = document.getElementById('btn-create-char');
    var titleEl = document.getElementById('chars-title');
    var hero = document.getElementById('wa-empty-hero');
    var miniOrb = document.querySelector('.wa-chars-orb');
    if (!_characters || _characters.length === 0) {
        // 2026-06-08: Hall VAZIO (0 personagens) — HERO ÉPICO (orb de Valdória
        // animada + moldura de pergaminho + chamado). Esconde mini-orb/título/lista/
        // Jogar e revela o hero. "Criar Personagem" é a ação principal.
        // (User: "o hall pode estar sem nenhum inicialmente" + "melhorias épicas".)
        // redirectToGame('',true) é o caminho PROVADO de 1a criação (0 chars);
        // contas COM chars criam pela cidade (handshake /api/character/new_session).
        if (hero) hero.style.display = '';
        if (miniOrb) miniOrb.style.display = 'none';
        if (titleEl) titleEl.style.display = 'none';
        if (list) { list.style.display = 'none'; list.textContent = ''; }
        if (playBtn) playBtn.style.display = 'none';
        if (createBtn) {
            createBtn.style.display = '';
            createBtn.classList.add('wa-btn-create--forge');
            createBtn.textContent = 'Criar Personagem';
        }
        return;
    }
    // >=1 personagem: seleção normal. Criar-novo se faz pela cidade (handshake p/
    // creation_token), então o botão Criar fica oculto aqui.
    if (hero) hero.style.display = 'none';
    if (miniOrb) miniOrb.style.display = '';
    if (list) list.style.display = '';
    if (createBtn) { createBtn.style.display = 'none'; createBtn.classList.remove('wa-btn-create--forge'); }
    if (playBtn) playBtn.style.display = '';
    if (titleEl) { titleEl.style.display = ''; titleEl.textContent = 'Selecione seu Personagem'; }
    var html = '';
    for (var i = 0; i < _characters.length; i++) {
        var c = _characters[i];
        var charId = c.id || c.char_id || '';
        var name = _esc(c.name || 'Sem Nome');
        var level = c.level || 1;
        var cls = _esc(c.class_name || c.hero_class || '');
        var race = _esc(c.race || '');
        var emoji = c.emoji || '';

        html += '<div class="wa-char-card' + (_selectedCharId === charId ? ' selected' : '') + '" '
            + 'data-id="' + _esc(charId) + '" onclick="selectChar(this)">'
            + '<div class="wa-char-icon">' + emoji + '</div>'
            + '<div class="wa-char-info">'
            + '<div class="wa-char-name">' + name + '</div>'
            + '<div class="wa-char-meta">Nível ' + level + ' &middot; ' + race + ' ' + cls + '</div>'
            + '</div>'
            + '<div class="wa-char-check"></div>'
            + '</div>';
    }
    list.innerHTML = html;
}

function selectChar(el) {
    _selectedCharId = el.getAttribute('data-id') || '';
    // Update selection UI
    var cards = document.querySelectorAll('.wa-char-card');
    for (var i = 0; i < cards.length; i++) {
        cards[i].classList.toggle('selected', cards[i].getAttribute('data-id') === _selectedCharId);
    }
    document.getElementById('btn-play').disabled = !_selectedCharId;
}

/* 2026-06-08: Criar Personagem a partir do Hall (/web/). redirectToGame('', true)
   persiste a sessao de jogo (vAuthTokenStore -> valdoria_session_<env>) e abre o
   criador com from=web. O criador NAO recebe um creation_token aqui — ele troca o
   game token por um creation_token no APPLY (401-recovery via valdoria_session_<env>,
   character_creator/index.html ~L7760). O from=web faz o Voltar do criador retornar
   pra ESTE Hall (sem loop). É o MESMO caminho da 1a criacao (0 chars) ja em producao. */
function onCreateChar() {
    // 2026-06-08 (user "transição demorando"): mostra a cobertura de carregamento
    // IMEDIATAMENTE. Sem isto, o Hall ficava CONGELADO durante o download/parse do
    // criador (página grande; pior no celular/3G) — parecia travado. O #wa-boot
    // (anel girando) cobre o Hall na hora e fica até o criador pintar (loader contínuo).
    try {
        var b = document.getElementById('wa-boot');
        if (b) { b.style.display = 'flex'; }   // cobre o Hall com o anel de loading na hora
        var btn = document.getElementById('btn-create-char');
        if (btn) { btn.disabled = true; }       // evita duplo-clique (o cover já bloqueia)
    } catch (_e) { /* noqa: preflight */ }
    redirectToGame('', true);
}
window.onCreateChar = onCreateChar;

/* ----- Play / Redirect ----- */

async function onPlay() {
    if (!_selectedCharId) return;
    var btn = document.getElementById('btn-play');
    btn.disabled = true;
    btn.textContent = 'Entrando...';
    hideCharError();

    try {
        if (_isDevLogin) {
            // DEV mode: create a new session with the selected char_id
            var devResp = await fetch(_apiBase + '/api/game/_dev_session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: _userId, char_id: _selectedCharId })
            });
            if (!devResp.ok) throw new Error('Erro ao criar sessão DEV');
            var devData = await devResp.json();
            _authToken = devData.token || _authToken;
            localStorage.setItem(WEB_TOKEN_KEY, _authToken);
            redirectToGame(_selectedCharId, false, _authToken);
            return;
        }

        var resp = await fetch(_apiBase + '/api/auth/select-character', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + _authToken,
                // WEB-OAUTH-02: prova de identidade p/ o restore gated pós-restart
                // (server tenta peek primeiro; só usa o uid+token-fp no miss).
                'X-User-Id': String(_userId)
            },
            body: JSON.stringify({ char_id: _selectedCharId })
        });
        if (!resp.ok) {
            var err = await resp.json().catch(function() { return {}; });
            throw new Error(err.error || 'Erro ao selecionar personagem');
        }
        var data = await resp.json();
        // Server may return an updated token for the selected character
        var gameToken = data.token || _authToken;
        redirectToGame(_selectedCharId, false, gameToken);
    } catch (e) {
        console.error('[WEB-AUTH] Select character error:', e);
        showCharError(_friendlyError(e));
        btn.disabled = false;
        btn.textContent = 'Jogar';
    }
}

function redirectToGame(charId, isNew, token) {
    // 2026-06-08 (Loading-First): mantém o #wa-boot painted através da navegação
    // (NUNCA chama _showLoginUI/_hideBoot aqui) — a próxima tela tem o próprio loader,
    // então a transição é uma cobertura de carregamento contínua, sem flash. O flag
    // de transição também impede o close-beacon de disparar no beforeunload.
    try { window.__valdoria_transitioning = true; } catch (_e) { /* noqa: preflight */ }
    var t = token || _authToken;
    var params = new URLSearchParams();
    params.set('token', t);
    params.set('uid', String(_userId));
    params.set('user_id', String(_userId));
    params.set('api', _apiBase);
    params.set('api_base', _apiBase);
    params.set('env', _envId);
    if (charId) {
        params.set('char', charId);
        params.set('char_id', charId);
    }
    if (isNew) params.set('new', '1');

    /* REFACTOR-1 Phase 2 (Part C prereq): persist the Bearer token in vAuthTokenStore
       so destination WebApps (combat2/exploracao) read it via getToken() without
       ?token= in the URL. ADDITIVE — the token still flows via `params` below for
       backward compat; this just mirrors what the initData /play/ path already does.
       Guarded + try/catch so a store failure never blocks the redirect/login.
       Doc: docs/sistemas/refactor-1-plan.md */
    try {
        if (window.vAuthTokenStore && t) {
            window.vAuthTokenStore.setToken(t, {
                user_id: _userId, char_id: charId || '', env: _envId,
                scope: 'game', api_base: _apiBase,
            });
        }
    } catch (eStore) { console.warn('[WEB-AUTH] vAuthTokenStore.setToken failed', eStore); }

    /* BUG (2026-04-11): nodevpanel iframe carry-over */
    var _currentParams = new URLSearchParams(window.location.search);
    if (_currentParams.get('nodevpanel') === '1') {
        params.set('nodevpanel', '1');
    }

    /* USER REQUEST 2026-05-05: REGRA MANDATORY last_screen_payload —
       pre-fetch /api/game/state pra determinar destino (player NUNCA é forçado
       pra cidade hub se estava em explore/combat). Server retorna transition.to
       indicando onde player parou. */
    var paramStr = params.toString();
    if (isNew && !charId) {
        // Fluxo de criação de personagem (sem state restore)
        // 2026-05-23 FIX (Wilzen loop): /app.html → 301 → /play/. Usar /character_creator/ direto.
        // 2026-06-08: from=web — o criador sabe que o Hall de retorno é /web/?hall=1
        // (e não history.back, que com 0 personagens voltava pra cá e re-bouncava = loop).
        params.set('from', 'web');
        var url = '../character_creator/?' + params.toString();
        console.info('[WEB-AUTH] redirect target=%s (new char flow)', url.split('?')[0]);
        window.location.href = url;
        return;
    }

    // Pre-fetch /api/game/state pra determinar destino exato.
    // 2026-06-08: timeout 15s — sem ele, um servidor pendurado deixaria o #wa-boot
    // preso pra sempre (o backstop pula páginas em transição). No abort/erro, o
    // .catch cai pra cidade (navega; cobertura contínua até o destino).
    var _stCtl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var _stTo = _stCtl ? setTimeout(function () { try { _stCtl.abort(); } catch (_e) {} }, 15000) : null;
    var _stOpts = {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + t, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: _userId })
    };
    if (_stCtl) _stOpts.signal = _stCtl.signal;
    fetch(_apiBase + '/api/game/state', _stOpts).then(function(r){
        if (_stTo) { clearTimeout(_stTo); _stTo = null; }
        if (!r.ok) throw new Error('state HTTP ' + r.status);
        return r.json();
    }).then(function(state){
        // FIX 2026-05-04 v2: se server retornou URL completa (com snap/map_id/etc),
        //   USAR essa URL — não construir uma URL genérica que perde estado.
        //   detect_explore_transition retorna URL pronta com map_id + snap_b64.
        if (state && state.transition && state.transition.url){
            var fullUrl = state.transition.url;
            console.info('[WEB-AUTH] redirect via transition.url to=%s', state.transition.to);
            window.location.href = fullUrl;
            return;
        }
        var dest = '../cidade/index.html'; // default
        if (state && state.transition && state.transition.to){
            var to = state.transition.to;
            if (to === 'explore' || to === 'exploration') dest = '../exploracao/exploracao.html';
            else if (to === 'combat' || to === 'combat2') dest = '../combat2/combate.html';
            else if (to === 'levelup') dest = '../levelup/index.html';
            // 2026-05-23 FIX (Wilzen loop): /app.html → 301 → /play/.
            // Navigate/inventory popups quase sempre vêm com state.transition.url
            // (server-built — check acima já trata). Fallback aqui é cidade.
            else dest = '../cidade/index.html';
        }
        var url = dest + (dest.indexOf('?') >= 0 ? '&' : '?') + paramStr;
        console.info('[WEB-AUTH] redirect target=%s uid=%s char=%s last_screen=%s',
            dest.split('?')[0], _userId, charId || 'none',
            state && state.transition ? state.transition.to : 'none');
        window.location.href = url;
    }).catch(function(err){
        if (_stTo) { clearTimeout(_stTo); _stTo = null; }
        // Fallback graceful: vai pra cidade como antes (cobre abort/timeout/erro de rede).
        console.warn('[WEB-AUTH] /api/game/state failed, fallback to cidade:', err.message || err);
        var fallbackUrl = '../cidade/index.html?' + paramStr;
        window.location.href = fallbackUrl;
    });
}

/* ----- Logout ----- */

function onLogout() {
    _clearStoredSession();
    document.getElementById('screen-chars').classList.remove('wa-active');
    document.getElementById('screen-login').classList.add('wa-active');
}

/* ----- Blocked Screen (brute force detected) ----- */

function showBlockedScreen(retryAfter) {
    _hideBoot();  // 2026-06-08: tela bloqueada (429) fica SOB o #wa-boot (z-60) — revela
    /* Hide both login and character screens */
    var login = document.getElementById('screen-login');
    var chars = document.getElementById('screen-chars');
    if (login) login.classList.remove('wa-active');
    if (chars) chars.classList.remove('wa-active');

    /* Create or show the blocked screen */
    var blocked = document.getElementById('screen-blocked');
    if (!blocked) {
        blocked = document.createElement('div');
        blocked.id = 'screen-blocked';
        blocked.className = 'wa-screen wa-active';

        var card = document.createElement('div');
        card.className = 'wa-blocked-card';

        var shield = document.createElement('div');
        shield.className = 'wa-blocked-icon';
        shield.textContent = ''; /* shield emoji */

        var title = document.createElement('h2');
        title.className = 'wa-blocked-title';
        title.textContent = 'Acesso Bloqueado';

        var msg = document.createElement('p');
        msg.className = 'wa-blocked-msg';
        msg.textContent = 'Detectamos tentativas suspeitas de acesso a esta conta. '
            + 'Por segurança, o acesso foi temporariamente bloqueado.';

        var timer = document.createElement('p');
        timer.className = 'wa-blocked-timer';
        timer.id = 'blocked-timer';

        var note = document.createElement('p');
        note.className = 'wa-blocked-note';
        note.textContent = 'Se você é o dono da conta, aguarde o tempo indicado e tente novamente.';

        card.appendChild(shield);
        card.appendChild(title);
        card.appendChild(msg);
        card.appendChild(timer);
        card.appendChild(note);
        blocked.appendChild(card);
        document.body.appendChild(blocked);
    } else {
        blocked.classList.add('wa-active');
    }

    /* Countdown timer */
    var remaining = retryAfter || 60;
    var timerEl = document.getElementById('blocked-timer');
    function updateTimer() {
        if (remaining <= 0) {
            if (timerEl) timerEl.textContent = 'Tente novamente agora.';
            /* Re-show login after cooldown */
            blocked.classList.remove('wa-active');
            if (login) login.classList.add('wa-active');
            return;
        }
        var min = Math.floor(remaining / 60);
        var sec = remaining % 60;
        var timeStr = min > 0
            ? min + ' min ' + (sec > 0 ? sec + 's' : '')
            : sec + ' segundos';
        if (timerEl) timerEl.textContent = 'Tente novamente em ' + timeStr;
        remaining--;
        setTimeout(updateTimer, 1000);
    }
    updateTimer();
}

function _checkRateLimit(resp) {
    if (resp.status === 429) {
        var retryAfter = parseInt(resp.headers.get('Retry-After') || '60', 10);
        showBlockedScreen(retryAfter);
        return true;
    }
    return false;
}

/* ----- UI Helpers ----- */

function showAuthLoading(show) {
    var el = document.getElementById('auth-loading');
    if (el) el.style.display = show ? 'flex' : 'none';
}

/* 2026-06-08 (Loading-First): #wa-boot cobre a tela do 1º paint até o destino final
   estar decidido. _hideBoot() remove a cobertura; _showLoginUI() revela a tela de
   login. Chamados SÓ nos pontos terminais "fica no /web/ e mostra login". Caminhos de
   redirect/hall NUNCA chamam _showLoginUI — deixam o #wa-boot painted até a navegação
   (a próxima tela tem o próprio loader), evitando o flash da tela de login. */
function _hideBoot() {
    try { var b = document.getElementById('wa-boot'); if (b) b.style.display = 'none'; } catch (_e) { /* noqa: preflight */ }
}
function _showLoginUI() {
    _hideBoot();
    try {
        // 2026-06-08: se estávamos em link_mode=google, o CSS html.wa-link-google
        // esconde #screen-login (display:none!important) — revelar o login (ex.: erro
        // de vinculação) exige remover a classe, senão a mensagem fica invisível e o
        // usuário trava no overlay "Vinculando…".
        document.documentElement.classList.remove('wa-link-google');
        var s = document.getElementById('screen-login');
        if (s) { s.classList.add('wa-active'); s.style.visibility = ''; }
    } catch (_e) { /* noqa: preflight */ }
}

function showAuthError(msg) {
    _showLoginUI();  // um erro só faz sentido com a tela de login visível
    var el = document.getElementById('auth-error');
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
    }
}

function hideAuthError() {
    var el = document.getElementById('auth-error');
    if (el) el.style.display = 'none';
}

function showCharError(msg) {
    var el = document.getElementById('char-error');
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
    }
}

function hideCharError() {
    var el = document.getElementById('char-error');
    if (el) el.style.display = 'none';
}

function _esc(str) {
    // A1.1: delega ao escaper canônico (window.vEsc — escapa também " e ',
    // seguro em atributo como data-id="..."). Fallback DOM-based (legado: NÃO
    // escapa aspas) só roda se escape.js não tiver carregado.
    if (typeof vEsc === 'function') return vEsc(str);
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

/* ----- DEV Permanent Auto-Login ----- */

async function _devReauth(devToken) {
    console.info('[WEB-AUTH] _devReauth: attempting auto-login with dev device token');
    try {
        var ok = await discoverApiBase();
        if (!ok) {
            console.warn('[WEB-AUTH] _devReauth: API discovery failed');
            localStorage.removeItem(DEV_DEVICE_KEY);
            showAuthLoading(false);
            return false;
        }
        var resp = await fetch(_apiBase + '/api/game/_dev_reauth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dev_device_token: devToken })
        });
        if (!resp.ok) {
            console.warn('[WEB-AUTH] _devReauth: server rejected token status=%d — clearing', resp.status);
            localStorage.removeItem(DEV_DEVICE_KEY);
            showAuthLoading(false);
            return false;
        }
        var data = await resp.json();
        console.info('[WEB-AUTH] _devReauth: success user_id=%s', data.user_id);
        handleLoginSuccess(data);
        return true;
    } catch (e) {
        console.warn('[WEB-AUTH] _devReauth: network error — clearing dev token', e.message || e);
        localStorage.removeItem(DEV_DEVICE_KEY);
        showAuthLoading(false);
        return false;
    }
}

/* ----- Auto-Login Check ----- */

/* Auto-recuperação (2026-06-08): a cidade redireciona pra /web/?relogin=1 quando o
   carregamento do personagem falha (sessão morta OU 0 personagens pós-wipe). Em vez do
   redirect CEGO de volta pra /cidade/ (que faria loop com o token morto), validamos via
   fetchCharacters — que roteia certo: token válido + 0 personagens → criação; token
   morto → login. Lê o token da sessão canônica (valdoria_session_<env>) ou das WEB_* keys. */
function _reauthAndRoute() {
    try {
        var host = String(location.hostname || '').toLowerCase();
        var _env = host === 'dev.lendasdevaldoria.com.br' ? 'dev' : 'prod';
        var token, uid, api;
        var sessKey = 'valdoria_session_' + _env;  // chave canônica env-namespaced (igual _tryVStarSession)
        var raw = localStorage.getItem(sessKey);
        if (raw) {
            try { var s = JSON.parse(raw); if (s && s.token) { token = s.token; uid = s.user_id; api = s.api_base; } } catch (e) {}
        }
        if (!token) {
            token = localStorage.getItem(WEB_TOKEN_KEY);
            uid = localStorage.getItem(WEB_USER_KEY);
            api = localStorage.getItem(WEB_API_KEY);
        }
        if (!token || !uid || !api) {
            console.info('[WEB-AUTH] relogin: sem token/uid/api — cai no login');
            return false;
        }
        _authToken = token;
        _userId = parseInt(uid, 10);
        _apiBase = api;
        console.info('[WEB-AUTH] relogin: validando sessão via fetchCharacters (uid=%s)', uid);
        fetchCharacters();  // 200+chars → cidade/select · 200+0 → criação · 401 → login
        return true;
    } catch (e) {
        console.warn('[WEB-AUTH] _reauthAndRoute erro', e);
        return false;
    }
}

function checkExistingSession() {
    // Auto-recuperação pós-falha da cidade: valida (fetchCharacters) em vez do redirect cego.
    var _relogin = false;
    try { _relogin = new URLSearchParams(location.search).get('relogin') === '1'; } catch (e) {}
    if (_relogin) {
        console.info('[WEB-AUTH] checkExistingSession: relogin=1 (vindo de falha de carga) — rota validada');
        if (_reauthAndRoute()) return;
        // sem sessão utilizável → segue pro fluxo normal (que mostrará login)
    }
    // DEV auto-login: if a persistent device token exists, try to re-authenticate silently.
    // Fix (2026-04-11): if _devReauth fails (expired token, 401), fall through to the
    // normal WEB_TOKEN_KEY flow instead of stopping on the login screen. Previously the
    // failed _devReauth left the user stuck on login even though a valid Telegram session
    // token existed in WEB_TOKEN_KEY from an earlier OAuth flow.
    if (_envId === 'dev') {
        var devToken = localStorage.getItem(DEV_DEVICE_KEY);
        if (devToken) {
            console.info('[WEB-AUTH] checkExistingSession: DEV device token found, attempting reauth');
            showAuthLoading(true);
            _devReauth(devToken).then(function(succeeded) {
                if (!succeeded) {
                    console.info('[WEB-AUTH] _devReauth failed — falling back to valdoria_session / WEB_TOKEN_KEY flow');
                    if (!_tryVStarSession()) _tryWebTokenSession();
                }
            });
            return;
        }
    }
    // Sessao #37 (2026-05-25) + bug C1 fix (Sessao #68): se ha sessao canonica
    // `valdoria_session_<env>` no localStorage (escrita por vAuthTokenStore em
    // /play/ e /web/) com token+user_id+api_base validos, auth-gate.js JA
    // detecta isso em outras pages MAS skip /web/ — fazia user reportar 5+
    // vezes "/web/ aparece mesmo ja autenticado, JA CANSEI". Fix: web-auth.js
    // detecta a sessao canonica ANTES do WEB_TOKEN_KEY flow + auto-redirect
    // pra /cidade/.
    if (_tryVStarSession()) return;
    _tryWebTokenSession();
}

/* Sessao #68 (2026-06-01, bug C1 fix): detecta sessao `valdoria_session_<env>`
   — a chave CANONICA escrita por vAuthTokenStore (auth-token-store.js) em
   /play/ e /web/. Se valida (token+user_id+api_base, env bate, age < 30d),
   auto-redirect pra /cidade/ sem prompt — mesmo pattern do auth-gate.js mas
   executado de DENTRO de /web/ (auth-gate skip esse path).

   Antes (bug C1, account-linking-design.md §C): lia uma chave ORFA antiga
   (campos `uid`/`apiBase`/`ts`) que NADA escrevia → _tryVStarSession sempre
   retornava false e /web/ reaparecia mesmo ja autenticado (reportado 5+ vezes).
   Retorna true se redirecionou; false se nao havia sessao valida. */
function _tryVStarSession() {
    try {
        var host = String(location.hostname || '').toLowerCase();
        var _env = host === 'dev.lendasdevaldoria.com.br' ? 'dev' : 'prod';
        var sessKey = 'valdoria_session_' + _env;
        var rawSession = localStorage.getItem(sessKey);
        if (!rawSession) {
            console.info('[WEB-AUTH] _tryVStarSession: nenhuma %s no localStorage', sessKey);
            return false;
        }
        var sess = JSON.parse(rawSession);
        var ageMs = Date.now() - (sess.saved_at || 0);
        var maxAgeMs = 30 * 24 * 60 * 60 * 1000;
        if (!sess.token || !sess.user_id || !sess.api_base) {
            console.info('[WEB-AUTH] _tryVStarSession: %s incompleta (token/user_id/api_base)', sessKey);
            return false;
        }
        if (sess.env && sess.env !== _env) {
            console.info('[WEB-AUTH] _tryVStarSession: %s de outro env (%s != %s) — ignora', sessKey, sess.env, _env);
            return false;
        }
        if (ageMs >= maxAgeMs) {
            console.info('[WEB-AUTH] _tryVStarSession: %s expirada (%dd)', sessKey, Math.floor(ageMs / 86400000));
            return false;
        }
        // Sessao valida — migra pras keys WEB_* + redirect pra /cidade/.
        // Migra ANTES do redirect pra que se cidade.html falhar e voltar pra /web/,
        // checkExistingSession encontre as WEB_* keys e nao caia em loop.
        // (Nao re-escrevemos vAuthTokenStore: a sessao JA veio da chave dele.)
        try {
            localStorage.setItem(WEB_TOKEN_KEY, sess.token);
            localStorage.setItem(WEB_USER_KEY, String(sess.user_id));
            localStorage.setItem(WEB_API_KEY, sess.api_base);
        } catch (e) {
            console.warn('[WEB-AUTH] _tryVStarSession: localStorage.setItem failed', e);
        }
        // 2026-06-08: ?hall=1 (voltou do criador pro Hall) — NAO auto-redireciona
        // pra /cidade/. As keys WEB_* ja foram migradas acima, entao retornar false
        // deixa checkExistingSession seguir pra _tryWebTokenSession -> fetchCharacters,
        // que com _forceHall renderiza o Hall de selecao (inclusive vazio).
        if (_forceHall) {
            console.info('[WEB-AUTH] _tryVStarSession: ?hall=1 — mostra Hall em vez de redirect pra /cidade/');
            return false;
        }
        // 2026-06-08 (user): sessão SEM personagem ativo (char_id vazio — ex.: conta
        // pós-wipe) NÃO vai pra /cidade/ (que mostraria título + hub em branco antes
        // de redirecionar de volta). As chaves WEB_* já foram migradas acima, então
        // retornar false deixa o fluxo seguir pra fetchCharacters → 0 chars → Hall
        // vazio "Crie sua Lenda" direto. (>=1 char tem char_id → segue pro /cidade/.)
        if (!sess.char_id) {
            console.info('[WEB-AUTH] _tryVStarSession: sessão sem char ativo — vai pro Hall (sem passar pela cidade)');
            return false;
        }
        var url = '/cidade/?token=' + encodeURIComponent(sess.token)
            + '&api=' + encodeURIComponent(sess.api_base)
            + '&uid=' + encodeURIComponent(String(sess.user_id))
            + '&env=' + encodeURIComponent(sess.env || _env)
            + (sess.char_id ? '&char=' + encodeURIComponent(sess.char_id) : '')
            + '&_cb=' + Date.now();
        console.info('[WEB-AUTH] _tryVStarSession: sessao valida detectada (uid=%s, age=%dh) — redirect pra /cidade/',
            sess.user_id, Math.floor(ageMs / 3600000));
        try { window.__valdoria_transitioning = true; } catch (_) {}
        location.replace(url);
        return true;
    } catch (e) {
        console.warn('[WEB-AUTH] _tryVStarSession: erro', e);
        return false;
    }
}

function _tryWebTokenSession() {
    var token = localStorage.getItem(WEB_TOKEN_KEY);
    var uid = localStorage.getItem(WEB_USER_KEY);
    var api = localStorage.getItem(WEB_API_KEY);

    /* BUG (2026-04-11): Session keys were migrated to use per-env suffix
     * (_dev / _prod). Users who logged in BEFORE the migration have the
     * legacy unsuffixed keys in localStorage. If the new keys are missing
     * but the legacy keys exist, migrate them transparently so the player
     * keeps their session instead of being forced back to the login screen. */
    if (!token || !uid) {
        var legacyToken = localStorage.getItem('valdoria_web_token'); /* noqa: preflight — legacy migration */
        var legacyUid = localStorage.getItem('valdoria_web_user_id'); /* noqa: preflight — legacy migration */
        if (legacyToken && legacyUid) {
            console.info('[WEB-AUTH] Migrating legacy session keys -> env-suffixed keys (env=%s)', _envId);
            token = legacyToken;
            uid = legacyUid;
            if (!api) {
                api = localStorage.getItem(WEB_API_KEY) || '';
            }
            try {
                localStorage.setItem(WEB_TOKEN_KEY, token);
                localStorage.setItem(WEB_USER_KEY, uid);
                if (api) localStorage.setItem(WEB_API_KEY, api);
                /* Remove legacy keys so this migration runs only once */
                localStorage.removeItem('valdoria_web_token'); /* noqa: preflight — legacy cleanup */
                localStorage.removeItem('valdoria_web_user_id'); /* noqa: preflight — legacy cleanup */
            } catch (e) {
                console.warn('[WEB-AUTH] Legacy migration partial failure', e);
            }
        }
    }

    console.info('[WEB-AUTH] checkExistingSession token=%s uid=%s api=%s',
        token ? 'present(' + token.length + ')' : 'none', uid || 'none', api || 'none');
    if (token && uid && api) {
        _authToken = token;
        _userId = parseInt(uid, 10);
        _apiBase = api;
        // Try to fetch characters with existing token (validates session server-side)
        fetchCharacters();
    } else {
        console.info('[WEB-AUTH] No existing session — showing login buttons');
        _showLoginUI();  // terminal: sem sessão → revela a tela de login (tira o #wa-boot)
    }
}

async function fetchCharacters() {
    showAuthLoading(true);
    // Timeout (15s) p/ não deixar o spinner preso se o servidor pendurar — crítico no
    // fluxo de auto-recuperação (/web/?relogin=1). Mesmo padrão de onGoogleAuth.
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timeout = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;
    try {
        var fopts = { method: 'GET', headers: {
            'Authorization': 'Bearer ' + _authToken,
            // WEB-OAUTH-02: prova de identidade p/ o restore gated pós-restart
            // (server tenta peek primeiro; só usa o uid+token-fp no miss).
            'X-User-Id': String(_userId)
        } };
        if (controller) { fopts.signal = controller.signal; }
        var resp = await fetch(_apiBase + '/api/auth/characters', fopts);
        if (timeout) { clearTimeout(timeout); timeout = null; }
        if (!resp.ok) {
            // Token expired or invalid — clear and show login
            console.warn('[WEB-AUTH] Existing session invalid status=%d, clearing token', resp.status);
            _clearStoredSession();
            _clearReloginGuard();
            showAuthLoading(false);
            _showLoginUI();  // terminal: sessão inválida → revela login (tira o #wa-boot)
            return;
        }
        var data = await resp.json();
        _characters = data.characters || [];
        console.info('[WEB-AUTH] fetchCharacters OK count=%d hall=%s', _characters.length, _forceHall);
        // 2026-06-08 (user): 1 personagem (sem ?hall=1) → joga direto; 0 / vários /
        // ?hall=1 → mostra o Hall. 0 chars = "Crie sua Lenda" e o jogador FICA nele
        // (toca "Criar Personagem"); NUNCA encaminha sozinho pro criador.
        if (!_forceHall && _characters.length === 1) {
            _selectedCharId = _characters[0].id || _characters[0].char_id || '';
            redirectToGame(_selectedCharId, false);
        } else {
            if (_characters.length === 1) {
                _selectedCharId = _characters[0].id || _characters[0].char_id || '';
            }
            showCharacterSelect();
        }
    } catch (e) {
        if (timeout) { clearTimeout(timeout); timeout = null; }
        // Timeout (AbortError) ou erro de rede — limpa sessão + guard e mostra login (sem spinner preso).
        var msg = (e && e.name === 'AbortError') ? 'timeout (servidor não respondeu)' : (e.message || e);
        console.warn('[WEB-AUTH] Session check failed:', msg);
        _clearStoredSession();
        _clearReloginGuard();
        _showLoginUI();  // terminal: falha de rede/timeout → revela login (tira o #wa-boot)
    } finally {
        showAuthLoading(false);
    }
}

/* Limpa o guard anti-loop da auto-recuperação (set por cidade.html em
   /web/?relogin=1). Sem isso, um reload do /web/ após falha de rede ficaria preso
   (a cidade não tentaria recuperar de novo). */
function _clearReloginGuard() {
    try { sessionStorage.removeItem('valdoria_relogin_attempt'); } catch (e) { /* */ }
}

function _clearStoredSession() {
    localStorage.removeItem(WEB_TOKEN_KEY);
    localStorage.removeItem(WEB_USER_KEY);
    _authToken = '';
    _userId = 0;
    _characters = [];
    _selectedCharId = '';
}

/* ----- DEV Login (bypass auth) ----- */

window.onDevLogin = async function() {
    showAuthLoading(true);
    hideAuthError();
    try {
        var ok = await discoverApiBase();
        if (!ok) {
            showAuthError('Configure a URL do servidor primeiro.');
            return;
        }
        // Step 1: Create dev session
        var resp = await fetch(_apiBase + '/api/game/_dev_session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 7685169782, char_id: '' })
        });
        if (!resp.ok) {
            var err = await resp.json().catch(function() { return {}; });
            throw new Error(err.error || 'Erro no login DEV (' + resp.status + ')');
        }
        var data = await resp.json();
        _authToken = data.token || '';
        _userId = data.user_id || 0;
        _isDevLogin = true;
        localStorage.setItem(WEB_TOKEN_KEY, _authToken);
        localStorage.setItem(WEB_USER_KEY, String(_userId));
        localStorage.setItem(WEB_API_KEY, _apiBase);

        // Step 2: Fetch character list
        var charsResp = await fetch(_apiBase + '/api/game/characters?user_id=' + _userId, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + _authToken }
        });
        if (charsResp.ok) {
            var charsData = await charsResp.json();
            _characters = charsData.characters || [];
        }

        if (_characters.length === 0) {
            // No characters — go to game (will create)
            redirectToGame('', true);
        } else if (_characters.length === 1) {
            _selectedCharId = _characters[0].id || _characters[0].char_id || '';
            redirectToGame(_selectedCharId, false);
        } else {
            showCharacterSelect();
        }
    } catch (e) {
        console.error('[WEB-AUTH] DEV login error:', e);
        showAuthError(_friendlyError(e));
    } finally {
        showAuthLoading(false);
    }
};

/* ----- Google GSI (programmatic init) ----- */

var _GOOGLE_CLIENT_ID = '717031857989-gu6hh4h9mgl3gikua705ov1fnbm57lg9.apps.googleusercontent.com';

/* Google GSI not needed — using OAuth redirect flow instead */

/* ----- Telegram Mini App auto-login via initData ----- */

/* True quando a pagina esta sendo aberta de DENTRO do Telegram (Mini App).
 * Em contexto Telegram real, o SDK (telegram-web-app.js) popula `initData`.
 * O polyfill `telegram-compat.js` NUNCA preenche initData — garantia que
 * este flag so da true em contexto real. */
function _isInsideTelegram() {
    try {
        var tg = window.Telegram && window.Telegram.WebApp;
        return !!(tg && typeof tg.initData === 'string' && tg.initData.length > 0);
    } catch (_) { return false; }
}

/* Silent auth via initData. Se sucesso: salva token/user_id e redireciona
 * direto para /app.html?route=game. Caso contrario: retorna false para
 * deixar o fluxo de login manual seguir. */
async function _tryTelegramInitAuth() {
    if (!_isInsideTelegram()) return false;
    var initData = window.Telegram.WebApp.initData;
    console.info('[WEB-AUTH] Telegram Mini App detected — attempting silent auth (initData len=%d)', initData.length);

    /* Garante que temos a base da API antes de POST */
    try {
        var ok = await discoverApiBase();
        if (!ok) {
            console.warn('[WEB-AUTH] Silent auth: no API base discovered — fallback to login UI');
            return false;
        }
    } catch (e) {
        console.warn('[WEB-AUTH] Silent auth: API discovery failed', e);
        return false;
    }

    try {
        /* Expande o WebApp para ocupar toda a viewport (melhor UX antes do redirect). */
        try { window.Telegram.WebApp.ready(); } catch (_) { /* noqa: preflight */ }
        try { window.Telegram.WebApp.expand(); } catch (_) { /* noqa: preflight */ }

        var resp = await fetch(_apiBase + '/api/game/init-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': initData,
            },
            body: JSON.stringify({ init_data: initData }),
        });

        if (!resp.ok) {
            console.warn('[WEB-AUTH] Silent auth: server returned %d — fallback to login UI', resp.status);
            return false;
        }
        var data = await resp.json();
        if (!data || !data.token || !data.user_id) {
            console.warn('[WEB-AUTH] Silent auth: invalid response — fallback to login UI');
            return false;
        }

        /* Persiste estado (mesmas chaves que o fluxo manual, para coerencia). */
        _authToken = data.token;
        _userId = Number(data.user_id);
        _apiBase = (data.api || _apiBase || '').replace(/\/$/, '');
        if (_apiBase) localStorage.setItem(WEB_API_KEY, _apiBase);
        localStorage.setItem(WEB_TOKEN_KEY, _authToken);
        localStorage.setItem(WEB_USER_KEY, String(_userId));

        var charId = data.char_id || '';
        console.info('[WEB-AUTH] Silent auth OK — uid=%s char=%s env=%s hall=%s', _userId, charId || '(none)', data.env || '?', _forceHall);

        if (_forceHall) {
            /* 2026-06-08: voltou do criador pro Hall (?hall=1) dentro do Telegram.
               Este path de silent-auth roda ANTES de checkExistingSession e NAO
               consultava _forceHall — re-criava o loop criador<->/web/ pra contas
               com 0 personagens. Agora busca a lista e mostra a selecao (inclui o
               estado vazio com "Criar Personagem"), nunca auto-redireciona. */
            if (charId) _selectedCharId = charId;
            await fetchCharacters();
            return true;
        }
        if (charId) {
            /* Ja tem personagem ativo — direto para o jogo. */
            redirectToGame(charId, false, _authToken);
        } else {
            /* 2026-06-08 (user): 0 personagens — busca a lista e FICA no Hall vazio
             * ("Crie sua Lenda"), em vez de encaminhar direto pro criador. O jogador
             * toca "Criar Personagem". (fetchCharacters com 0 chars mostra o Hall.) */
            await fetchCharacters();
        }
        return true;
    } catch (e) {
        console.error('[WEB-AUTH] Silent auth failed — fallback to login UI', e);
        return false;
    }
}

/* ----- Init ----- */

async function _initWebAuth() {
    console.info('[WEB-AUTH] Init: isProd=%s bot=%s env=%s readyState=%s', _isProd, BOT_USERNAME, _envId, document.readyState);

    /* 2026-06-12 (user): garante 100% que o botão "Sair" NUNCA aparece no Hall
       quando jogando pelo Telegram WebApp. _isInsideTelegram() (initData != '')
       é a detecção CANÔNICA — o SDK do Telegram só popula initData quando a
       página é aberta de DENTRO do Telegram (o polyfill nunca preenche). Marca
       <html>.tg-webapp logo no boot → a regra CSS (web-auth.css) esconde o Sair
       em QUALQUER caminho de render do Hall, independente de timing/JS. */
    try {
        if (_isInsideTelegram()) {
            document.documentElement.classList.add('tg-webapp');
        }
    } catch (_eTg) { /* non-fatal */ }

    /* 2026-06-08 BACKSTOP (Loading-First): se em ~12s o #wa-boot ainda cobre a tela e
       nenhum destino foi revelado nem navegamos (algum caminho terminal imprevisto),
       revela o login pra NUNCA deixar o jogador preso numa tela escura. */
    setTimeout(function () {
        try {
            if (window.__valdoria_transitioning) return;
            var b = document.getElementById('wa-boot');
            if (!b || b.style.display === 'none') return;
            var login = document.getElementById('screen-login');
            var chars = document.getElementById('screen-chars');
            var loginActive = login && login.classList.contains('wa-active');
            var charsActive = chars && chars.classList.contains('wa-active');
            if (!loginActive && !charsActive) {
                console.warn('[WEB-AUTH] boot backstop — revelando login (nenhum destino em 12s)');
                _showLoginUI();
            }
        } catch (_e) { /* noqa: preflight */ }
    }, 12000);

    /* AUTH-1 (Sessao #64): Detecta link_mode=google OU pending sessionStorage.
     * Fluxo:
     *   1. cidade.html grava sessionStorage.valdoria_link_pending + openLink('/web/?link_mode=google')
     *   2. _initWebAuth ve link_mode → seta _linkMode + dispara Google OAuth
     *   3. Google redirect_uri = '/web/' (sem query) → URL volta sem link_mode
     *   4. _initWebAuth re-roda → ve pending no sessionStorage → re-seta _linkMode
     *   5. Hash #id_token=... presente → _checkGoogleOAuthReturn → _onGoogleAuthLink
     *   6. POST /api/auth/link-account → sucesso → limpa sessionStorage + UI sucesso */
    try {
        var _qsLink = new URLSearchParams(window.location.search);
        var _lmQS = _qsLink.get('link_mode') || '';
        // Sempre tenta carregar pending; se valido (token + api + ttl < 10min)
        // assume link_mode='google' mesmo se URL nao tem link_mode (apos Google redirect).
        try {
            var raw = sessionStorage.getItem('valdoria_link_pending');
            if (raw) {
                var parsed = JSON.parse(raw);
                var ageMs = Date.now() - (parsed && parsed.ts || 0);
                if (parsed && parsed.token && parsed.api && ageMs < 10 * 60 * 1000) {
                    _linkPending = parsed;
                }
            }
            // Sessao #63 (2026-05-30): fallback — token/api via query string.
            // openLink abre browser EXTERNO (sessionStorage do WebView do
            // Telegram NAO propaga pro browser); o jogo passa token+api na URL
            // do /web/. Grava no sessionStorage DESTE browser pra sobreviver ao
            // redirect de volta do Google (que volta sem query, so com #id_token).
            if (!_linkPending) {
                var _qTok = _qsLink.get('token') || '';
                var _qApi = (_qsLink.get('api') || '').replace(/\/$/, '');
                if (_qTok && _qApi) {
                    _linkPending = { token: _qTok, api: _qApi, returnUrl: window.location.href, ts: Date.now() };
                    try { sessionStorage.setItem('valdoria_link_pending', JSON.stringify(_linkPending)); } catch (_e2) { /* noqa: preflight */ }
                }
            }
        } catch (_) { /* noqa: preflight */ }
        // Decide se estamos em link_mode:
        var _hasIdTokenHash = String(window.location.hash || '').indexOf('id_token=') !== -1;
        if (_lmQS === 'google' || (_linkPending && _hasIdTokenHash)) {
            _linkMode = 'google';
            console.info('[WEB-AUTH] AUTH-1 link_mode=google detected (qs=%s pending=%s hash=%s)',
                _lmQS, !!_linkPending, _hasIdTokenHash);
            if (!_linkPending) {
                showAuthError('Sessão de vinculação expirada. Volte ao jogo e tente novamente.');
                return;
            }
            if (_hasIdTokenHash) {
                _checkGoogleOAuthReturn();
                return;
            }
            // Primeiro passo: dispara Google OAuth. Redirect volta SEM link_mode
            // mas sessionStorage mantem pending, e re-init detecta via pending+hash.
            window.onGoogleClick();
            return;
        }
    } catch (e) { console.error('[WEB-AUTH] AUTH-1 init error:', e); }

    /* 2026-05-04 USER FIX: visible env badge on auth screen — prevents user
     * from being silently logged into the wrong env (recurring complaint
     * "?env=dev está pegando dados do PROD novamente"). */
    try {
        var _envBadge = document.getElementById('wa-env-badge');
        if (_envBadge) {
            _envBadge.setAttribute('data-env', _envId);
            _envBadge.textContent = _envId === 'dev' ? 'Ambiente DEV' : 'Ambiente PROD';
        }
    } catch (e) { /* noqa: preflight */ }

    /* ── AUTO-LOGIN VIA TELEGRAM MINI APP (deve rodar ANTES do dev portal) ─
     * Quando a pagina abre de dentro do Telegram (bot Menu Button ou link
     * de WebApp), `window.Telegram.WebApp.initData` contem autenticacao
     * HMAC pronta. Trocamos silenciosamente por um token de sessao via
     * /api/game/init-session e redirecionamos direto para o jogo — sem
     * exibir botoes de login.
     *
     * CRITICO: este check PRECISA rodar antes do "dev portal host mode"
     * abaixo, porque Telegram.WebApp.initData so existe no TOP window
     * (nao propaga para iframes). Se o dev-debug-panel tomar conta antes,
     * o initData se perde e o auto-login nunca roda. */
    if (_isInsideTelegram()) {
        console.info('[WEB-AUTH] Telegram context detected — running silent auth BEFORE dev panel');
        /* 2026-06-08: o #wa-boot já cobre a tela desde o 1º paint, então o login
         * nunca pisca enquanto a silent auth roda (não precisa mais de visibility
         * hidden). Em sucesso, redirectToGame mantém o #wa-boot até navegar. */
        var silentOk = await _tryTelegramInitAuth();
        if (silentOk) return;
        /* 2026-05-21 USER FIX: NUNCA mostrar opção Google quando estamos em
           Telegram WebApp. Se silent auth falhou: esconder Google + separator,
           mostrar APENAS botão Telegram com mensagem clara pra retry. */
        try {
            var _googleBtn = document.getElementById('btn-google');
            if (_googleBtn) _googleBtn.style.display = 'none';
            var _separator = document.querySelector('.wa-separator');
            if (_separator) _separator.style.display = 'none';
            var _errBox = document.getElementById('auth-error');
            if (_errBox) {
                _errBox.textContent = 'Sessão expirou. Feche e abra novamente pelo /start do bot.';
                _errBox.style.display = 'block';
            }
            _showLoginUI();  // silent auth falhou → revela a tela de login (tira o #wa-boot)
        } catch (_) { /* noqa: preflight */ }
        /* Não retorna — deixa loadTelegramWidget e checkExistingSession rodarem
           pra tentar reauth via Telegram (mas Google fica escondido). */
    }

    /* BUG (2026-04-11): When ?env=dev is present but nodevpanel=1 is NOT,
     * this page will be taken over by dev-debug-panel.js and turned into
     * a host shell that embeds a real /web/?env=dev&nodevpanel=1 iframe.
     * The iframe is the one that should drive authentication. If we let
     * the TOP window also run checkExistingSession() and redirectToGame(),
     * a successful auto-login navigates the entire tab away to /app.html
     * BEFORE dev-debug-panel.js has a chance to wipe the body and inject
     * the iframe + log panes — the user never sees the dev portal.
     *
     * Fix: when the dev portal host mode is detected, do not run
     * checkExistingSession here. dev-debug-panel.js will clear the body
     * and create the iframe; the iframe loads /web/?env=dev&nodevpanel=1,
     * its own copy of web-auth.js runs, and that iframe handles the
     * auto-login flow. */
    var _params = new URLSearchParams(window.location.search);
    var _isDevEnv = _params.get('env') === 'dev';
    var _isIframe = _params.get('nodevpanel') === '1';
    var _isDevPortalHost = _isDevEnv && !_isIframe;
    if (_isDevPortalHost) {
        console.info('[WEB-AUTH] Dev portal host mode — deferring all auth (checkExistingSession + OAuth return) to iframe');
        return;
    }

    loadTelegramWidget();
    checkExistingSession();
}

/* Script may load after DOMContentLoaded (dynamic createElement loading) */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initWebAuth);
} else {
    _initWebAuth();
}

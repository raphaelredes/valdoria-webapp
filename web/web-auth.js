'use strict';

/* =============================================
   Lendas de Valdoria — Web Login (v2)
   ============================================= */

// Allow portal-level override (window._envOverride) or URL ?env=dev to force mode
var _envOverride = window._envOverride || new URLSearchParams(window.location.search).get('env');
var _isProd = _envOverride ? (_envOverride === 'prod') : (window.location.hostname === 'jogo.lendasdevaldoria.com.br');
var BOT_USERNAME = _isProd ? 'LendasDeValdoriaBOT' : 'ValdoriaDevBot';
var _envId = _isProd ? 'prod' : 'dev';
if (_envOverride) console.info('[WEB-AUTH] environment FORCED to %s (isProd=%s)', _envId, _isProd);

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
    // 2. Try environment-specific api-url file
    var env = _isProd ? 'prod' : 'dev';
    try {
        var resp = await fetch('../api-url-' + env + '.json?t=' + Date.now(), { cache: 'no-store' });
        if (resp.ok) {
            var data = await resp.json();
            if (data.url) {
                _apiBase = data.url.replace(/\/$/, '');
                localStorage.setItem(WEB_API_KEY, _apiBase);
                return true;
            }
        }
    } catch (e) {
        console.warn('[WEB-AUTH] api-url-' + env + '.json not found', e);
    }
    // 3. Fallback to local api-url.json
    try {
        var resp2 = await fetch('api-url.json?t=' + Date.now(), { cache: 'no-store' });
        if (resp2.ok) {
            var data2 = await resp2.json();
            if (data2.url) {
                _apiBase = data2.url.replace(/\/$/, '');
                localStorage.setItem(WEB_API_KEY, _apiBase);
                return true;
            }
        }
    } catch (e2) {
        console.warn('[WEB-AUTH] api-url.json not found', e2);
    }
    // 4. Prompt user (last resort)
    var url = prompt('URL do servidor Valdoria (ex: https://valdoria.example.com):');
    if (url) {
        _apiBase = url.replace(/\/$/, '');
        localStorage.setItem(WEB_API_KEY, _apiBase);
        return true;
    }
    return false;
}

/* ----- Telegram Login Widget (hidden, auth-only) ----- */

/* ----- Telegram OAuth Redirect (no widget/iframe) ----- */

function loadTelegramWidget() {
    /* Check if we're returning FROM an OAuth redirect (Telegram or Google). */
    _checkTelegramOAuthReturn();
    _checkGoogleOAuthReturn();
}

function _checkTelegramOAuthReturn() {
    /* Telegram OAuth redirect returns with hash fragment:
     * #tgAuthResult=<base64 JSON> */
    var hash = window.location.hash || '';
    if (hash.indexOf('tgAuthResult=') === -1) return;

    console.info('[WEB-AUTH] Telegram OAuth redirect detected');
    try {
        var encoded = hash.split('tgAuthResult=')[1];
        var jsonStr = atob(encoded);
        var user = JSON.parse(jsonStr);
        console.info('[WEB-AUTH] Telegram OAuth user: %s id=%s', user.first_name, user.id);
        /* Clear the hash to avoid re-processing on reload */
        history.replaceState(null, '', window.location.pathname + window.location.search);
        /* Trigger the same auth callback as the widget */
        window.onTelegramAuth(user);
    } catch (e) {
        console.error('[WEB-AUTH] Failed to parse Telegram OAuth result:', e);
    }
}

function _checkGoogleOAuthReturn() {
    /* Google OAuth implicit flow returns with hash fragment:
     * #id_token=<JWT>&... */
    var hash = window.location.hash || '';
    if (hash.indexOf('id_token=') === -1) return;

    console.info('[WEB-AUTH] Google OAuth redirect detected');
    try {
        var params = new URLSearchParams(hash.substring(1));
        var idToken = params.get('id_token');
        if (!idToken) return;
        /* Clear hash to avoid re-processing */
        history.replaceState(null, '', window.location.pathname + window.location.search);
        /* Use same auth callback as GSI — id_token IS the credential */
        window.onGoogleAuth({ credential: idToken });
    } catch (e) {
        console.error('[WEB-AUTH] Failed to parse Google OAuth result:', e);
        showAuthError('Erro ao processar resposta do Google.');
    }
}

/* ----- Custom Social Button Handlers ----- */

window.onTelegramClick = function() {
    /* Redirect to Telegram OAuth page — clean, no iframe, no widget */
    var origin = encodeURIComponent(window.location.origin);
    var returnTo = encodeURIComponent(window.location.href);
    /* bot_id must be numeric — map username to ID */
    var botIds = { 'LendasDeValdoriaBOT': '8511215729', 'ValdoriaDevBot': '8074658054' };
    var botId = botIds[BOT_USERNAME] || BOT_USERNAME;
    var authUrl = 'https://oauth.telegram.org/auth?bot_id=' + botId
        + '&origin=' + origin
        + '&return_to=' + returnTo
        + '&request_access=write';
    console.info('[WEB-AUTH] Redirecting to Telegram OAuth bot_id=%s', botId);
    window.location.href = authUrl;
};

window.onGoogleClick = function() {
    /* Google OAuth 2.0 implicit flow — redirect, no popup.
     * Returns id_token directly in URL hash fragment. */
    var nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('google_nonce', nonce);
    var redirectUri = window.location.origin + '/web/';
    var authUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
        + '?client_id=' + encodeURIComponent(_GOOGLE_CLIENT_ID)
        + '&redirect_uri=' + encodeURIComponent(redirectUri)
        + '&response_type=id_token'
        + '&scope=' + encodeURIComponent('openid email profile')
        + '&nonce=' + nonce
        + '&prompt=select_account';
    console.info('[WEB-AUTH] Redirecting to Google OAuth (implicit flow)');
    window.location.href = authUrl;
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
        var controller = new AbortController();
        var timeout = setTimeout(function() { controller.abort(); }, 15000);
        var resp = await fetch(_apiBase + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'google',
                credential: response.credential
            }),
            signal: controller.signal
        });
        clearTimeout(timeout);
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

    if (_characters.length === 0) {
        // No characters — redirect to character creation
        redirectToGame('', true);
    } else if (_characters.length === 1) {
        // Single character — go straight to game
        _selectedCharId = _characters[0].id || _characters[0].char_id || '';
        redirectToGame(_selectedCharId, false);
    } else {
        // Multiple characters — show selection
        showCharacterSelect();
    }
}

/* ----- Character Selection ----- */

function showCharacterSelect() {
    document.getElementById('screen-login').classList.remove('wa-active');
    document.getElementById('screen-chars').classList.add('wa-active');
    renderCharacterList();
}

function renderCharacterList() {
    var list = document.getElementById('char-list');
    if (!_characters || _characters.length === 0) {
        list.innerHTML = '<div class="wa-char-empty">Nenhum personagem encontrado.</div>';
        return;
    }
    var html = '';
    for (var i = 0; i < _characters.length; i++) {
        var c = _characters[i];
        var charId = c.id || c.char_id || '';
        var name = _esc(c.name || 'Sem Nome');
        var level = c.level || 1;
        var cls = _esc(c.class_name || c.hero_class || '');
        var race = _esc(c.race || '');
        var emoji = c.emoji || '🧙';

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
                'Authorization': 'Bearer ' + _authToken
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
        btn.textContent = '⚔️ Jogar';
    }
}

function redirectToGame(charId, isNew, token) {
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

    var route = isNew && !charId ? 'character_creator' : 'game';
    params.set('route', route);
    var url = '../app.html?' + params.toString();
    console.info('[WEB-AUTH] redirect route=%s uid=%s char=%s env=%s api=%s',
        route, _userId, charId || 'none', _envId, _apiBase);
    window.location.href = url;
}

/* ----- Logout ----- */

function onLogout() {
    _clearStoredSession();
    document.getElementById('screen-chars').classList.remove('wa-active');
    document.getElementById('screen-login').classList.add('wa-active');
}

/* ----- Blocked Screen (brute force detected) ----- */

function showBlockedScreen(retryAfter) {
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
        shield.textContent = '\uD83D\uDEE1\uFE0F'; /* shield emoji */

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

function showAuthError(msg) {
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

function checkExistingSession() {
    // DEV auto-login: if a persistent device token exists, try to re-authenticate silently
    if (_envId === 'dev') {
        var devToken = localStorage.getItem(DEV_DEVICE_KEY);
        if (devToken) {
            console.info('[WEB-AUTH] checkExistingSession: DEV device token found, attempting reauth');
            showAuthLoading(true);
            _devReauth(devToken);
            return;
        }
    }

    var token = localStorage.getItem(WEB_TOKEN_KEY);
    var uid = localStorage.getItem(WEB_USER_KEY);
    var api = localStorage.getItem(WEB_API_KEY);
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
    }
}

async function fetchCharacters() {
    showAuthLoading(true);
    try {
        var resp = await fetch(_apiBase + '/api/auth/characters', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + _authToken
            }
        });
        if (!resp.ok) {
            // Token expired or invalid — clear and show login
            console.warn('[WEB-AUTH] Existing session invalid status=%d, clearing token', resp.status);
            _clearStoredSession();
            showAuthLoading(false);
            return;
        }
        var data = await resp.json();
        _characters = data.characters || [];
        console.info('[WEB-AUTH] fetchCharacters OK count=%d', _characters.length);
        if (_characters.length === 1) {
            _selectedCharId = _characters[0].id || _characters[0].char_id || '';
            redirectToGame(_selectedCharId, false);
        } else if (_characters.length > 1) {
            showCharacterSelect();
        } else {
            redirectToGame('', true);
        }
    } catch (e) {
        // Network error (server unreachable) — clear token and show login
        console.warn('[WEB-AUTH] Session check failed (network?):', e.message || e);
        _clearStoredSession();
    } finally {
        showAuthLoading(false);
    }
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

/* ----- Init ----- */

function _initWebAuth() {
    console.info('[WEB-AUTH] Init: isProd=%s bot=%s env=%s readyState=%s', _isProd, BOT_USERNAME, _envId, document.readyState);
    loadTelegramWidget();
    checkExistingSession();
}

/* Script may load after DOMContentLoaded (dynamic createElement loading) */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initWebAuth);
} else {
    _initWebAuth();
}

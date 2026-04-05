'use strict';

/* =============================================
   Lendas de Valdoria — Web Login (v2)
   ============================================= */

// Allow ?env=dev override to force DEV API (for testing on prod domain)
var _envOverride = new URLSearchParams(window.location.search).get('env');
var _isProd = _envOverride ? (_envOverride === 'prod') : (window.location.hostname === 'jogo.lendasdevaldoria.com.br');
var BOT_USERNAME = _isProd ? 'LendasDeValdoriaBOT' : 'ValdoriaDevBot';
var _envId = _isProd ? 'prod' : 'dev';
if (_envOverride) console.info('[WEB-AUTH] env override=%s isProd=%s', _envOverride, _isProd);

// Storage keys
var WEB_TOKEN_KEY = 'valdoria_web_token';
var WEB_USER_KEY = 'valdoria_web_user_id';
var WEB_API_KEY = 'valdoria_api_base';

var _apiBase = '';
var _authToken = '';
var _userId = 0;
var _characters = [];
var _selectedCharId = '';
var _isDevLogin = false;

/* ----- API Base Discovery ----- */

async function discoverApiBase() {
    // 1. Check localStorage
    var stored = localStorage.getItem(WEB_API_KEY);
    if (stored) {
        _apiBase = stored;
        return true;
    }
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

/* ----- Telegram Login Widget ----- */

function loadTelegramWidget() {
    var container = document.getElementById('tg-widget');
    if (!container) return;
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?23';
    script.setAttribute('data-telegram-login', BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-userpic', 'true');
    container.appendChild(script);

    console.info('[WEB-AUTH] Telegram widget script injected for bot:', BOT_USERNAME);
    /* Fallback: if widget doesn't render in 4s, show a styled button */
    setTimeout(function() {
        if (container.querySelector('iframe')) { console.info('[WEB-AUTH] Telegram widget iframe loaded OK'); return; }
        console.warn('[WEB-AUTH] Telegram widget did NOT load in 4s, showing fallback button');
        var fallback = document.createElement('a');
        fallback.href = 'https://t.me/' + BOT_USERNAME;
        fallback.target = '_blank';
        fallback.rel = 'noopener';
        fallback.className = 'wa-tg-fallback';
        var icon = document.createElement('span');
        icon.className = 'wa-tg-fallback-icon';
        icon.textContent = '\u2708'; /* plane icon */
        fallback.appendChild(icon);
        fallback.appendChild(document.createTextNode('Entrar com Telegram'));
        container.appendChild(fallback);
    }, 4000);
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
        showAuthError(e.message || 'Erro ao autenticar com Telegram');
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
        var msg = e.name === 'AbortError'
            ? 'Servidor não respondeu a tempo. Verifique sua conexão.'
            : (e.message || 'Erro ao autenticar com Google');
        showAuthError(msg);
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
        showCharError(e.message || 'Erro ao entrar no jogo');
        btn.disabled = false;
        btn.textContent = '⚔️ Jogar';
    }
}

function redirectToGame(charId, isNew, token) {
    var t = token || _authToken;
    var params = new URLSearchParams();
    params.set('token', t);
    params.set('uid', String(_userId));
    params.set('api', _apiBase);
    params.set('env', _envId);
    if (charId) params.set('char', charId);
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

/* ----- Auto-Login Check ----- */

function checkExistingSession() {
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
        showAuthError(e.message || 'Erro no login DEV');
    } finally {
        showAuthLoading(false);
    }
};

/* ----- Init ----- */

function _initWebAuth() {
    console.info('[WEB-AUTH] Init: isProd=%s bot=%s readyState=%s', _isProd, BOT_USERNAME, document.readyState);
    loadTelegramWidget();
    checkExistingSession();
}

/* Script may load after DOMContentLoaded (dynamic createElement loading) */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initWebAuth);
} else {
    _initWebAuth();
}

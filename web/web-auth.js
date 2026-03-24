'use strict';

/* =============================================
   Lendas de Valdoria — Web Login
   ============================================= */

var BOT_USERNAME = 'LendasDeValdoriaBOT';

// Storage keys
var WEB_TOKEN_KEY = 'valdoria_web_token';
var WEB_USER_KEY = 'valdoria_web_user_id';
var WEB_API_KEY = 'valdoria_api_base';

var _apiBase = '';
var _authToken = '';
var _userId = 0;
var _characters = [];
var _selectedCharId = '';

/* ----- API Base Discovery ----- */

async function discoverApiBase() {
    // 1. Check localStorage
    var stored = localStorage.getItem(WEB_API_KEY);
    if (stored) {
        _apiBase = stored;
        return true;
    }
    // 2. Try api-url.json in same directory
    try {
        var resp = await fetch('api-url.json', { cache: 'no-store' });
        if (resp.ok) {
            var data = await resp.json();
            if (data.url) {
                _apiBase = data.url.replace(/\/$/, '');
                localStorage.setItem(WEB_API_KEY, _apiBase);
                return true;
            }
        }
    } catch (e) {
        console.warn('[WEB-AUTH] api-url.json not found', e);
    }
    // 3. Prompt user
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
}

/* ----- Auth Callbacks ----- */

window.onTelegramAuth = async function(user) {
    console.log('[WEB-AUTH] Telegram auth:', user.first_name);
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
    console.log('[WEB-AUTH] Google auth callback');
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
                provider: 'google',
                credential: response.credential
            })
        });
        if (!resp.ok) {
            var err = await resp.json().catch(function() { return {}; });
            throw new Error(err.error || 'Erro na autenticação (' + resp.status + ')');
        }
        var data = await resp.json();
        handleLoginSuccess(data);
    } catch (e) {
        console.error('[WEB-AUTH] Google login error:', e);
        showAuthError(e.message || 'Erro ao autenticar com Google');
    } finally {
        showAuthLoading(false);
    }
};

/* ----- Login Success Handler ----- */

function handleLoginSuccess(data) {
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
    if (charId) params.set('char', charId);
    if (isNew) params.set('new', '1');

    window.location.href = '../game/index.html?' + params.toString();
}

/* ----- Logout ----- */

function onLogout() {
    localStorage.removeItem(WEB_TOKEN_KEY);
    localStorage.removeItem(WEB_USER_KEY);
    _authToken = '';
    _userId = 0;
    _characters = [];
    _selectedCharId = '';
    document.getElementById('screen-chars').classList.remove('wa-active');
    document.getElementById('screen-login').classList.add('wa-active');
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
    if (token && uid && api) {
        _authToken = token;
        _userId = parseInt(uid, 10);
        _apiBase = api;
        // Try to fetch characters with existing token
        fetchCharacters();
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
            // Token expired or invalid — show login
            console.warn('[WEB-AUTH] Existing session invalid, showing login');
            localStorage.removeItem(WEB_TOKEN_KEY);
            showAuthLoading(false);
            return;
        }
        var data = await resp.json();
        _characters = data.characters || [];
        if (_characters.length === 1) {
            _selectedCharId = _characters[0].id || _characters[0].char_id || '';
            redirectToGame(_selectedCharId, false);
        } else if (_characters.length > 1) {
            showCharacterSelect();
        } else {
            redirectToGame('', true);
        }
    } catch (e) {
        console.warn('[WEB-AUTH] Session check failed:', e);
        localStorage.removeItem(WEB_TOKEN_KEY);
    } finally {
        showAuthLoading(false);
    }
}

/* ----- Init ----- */

document.addEventListener('DOMContentLoaded', function() {
    loadTelegramWidget();
    checkExistingSession();
});

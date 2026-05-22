/* Donor identification — v10 (2026-05-22)
 *
 * Substitui o Telegram Login Widget bugado ("Bot domain invalid" quando
 * /setdomain nao foi configurado no @BotFather). Em vez disso, oferece:
 *
 *   1) Telegram: deep-link para t.me/<bot>?start=apoiar
 *      - Funciona SEMPRE (nao depende de /setdomain)
 *      - Usuario abre o bot, confirma com /apoiar <TXID> apos pagar
 *
 *   2) Google: Google Identity Services (se GOOGLE_CLIENT_ID configurado)
 *      - Fallback: modal de email simples (sem OAuth real)
 *
 *   3) Anonimo: padrao se nao identificar
 *
 * Compat com codigo legado:
 *   - window.onTelegramAuth(user) ainda funciona (chamado por callback Google tambem)
 *   - window.ApTgOAuth.init() mantido (chama o novo ApAuth.init internamente)
 *
 * Public API (window.ApAuth):
 *   - init(opts: { botUsername, googleClientId, onAuth })
 *   - connectTelegram()    -> opens t.me deep-link + saves intent
 *   - connectGoogle()      -> Google OAuth or email modal
 *   - logout()
 *   - getUser()
 *   - getIdentity()        -> {provider, name, email?, telegram?} or null
 */
(function() {
    'use strict';

    var state = {
        botUsername: '',
        googleClientId: '',
        user: null,
        onAuth: null,
    };

    var ui = {
        container: null,  // #ap-tg-login-container
        status: null,     // #ap-tg-status
        btnsWrap: null,
    };

    var STORAGE_KEY = 'apDonorIdentity';

    // ─── Utilities ───────────────────────────────────────────

    function _escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function _save(identity) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(identity)); } catch (_) {}
    }

    function _load() {
        try {
            var s = localStorage.getItem(STORAGE_KEY);
            return s ? JSON.parse(s) : null;
        } catch (_) { return null; }
    }

    function _clear() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    }

    // ─── Icons ───────────────────────────────────────────────

    var ICON_TELEGRAM =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>' +
        '</svg>';

    var ICON_GOOGLE =
        '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>' +
        '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>' +
        '<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>' +
        '<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>' +
        '</svg>';

    var ICON_CHECK =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="vertical-align:-2px;margin-right:4px">' +
        '<path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>';

    // ─── Rendering ───────────────────────────────────────────

    function _renderButtons() {
        if (!ui.container) return;
        // Clear previous
        ui.container.innerHTML = '';

        ui.btnsWrap = document.createElement('div');
        ui.btnsWrap.className = 'ap-auth-buttons';

        // Telegram
        var btnTg = document.createElement('button');
        btnTg.type = 'button';
        btnTg.className = 'ap-auth-btn ap-auth-btn-tg';
        btnTg.innerHTML = ICON_TELEGRAM + '<span>Conectar com Telegram</span>';
        btnTg.addEventListener('click', connectTelegram);

        // Google
        var btnGoogle = document.createElement('button');
        btnGoogle.type = 'button';
        btnGoogle.className = 'ap-auth-btn ap-auth-btn-google';
        btnGoogle.innerHTML = ICON_GOOGLE + '<span>Conectar com Google</span>';
        btnGoogle.addEventListener('click', connectGoogle);

        ui.btnsWrap.appendChild(btnTg);
        ui.btnsWrap.appendChild(btnGoogle);
        ui.container.appendChild(ui.btnsWrap);
    }

    function _renderConnected(identity) {
        if (!ui.status) return;
        var icon = identity.provider === 'telegram' ? ICON_TELEGRAM :
                   identity.provider === 'google' ? ICON_GOOGLE : ICON_CHECK;
        var label = identity.provider === 'telegram' ? 'via Telegram' :
                    identity.provider === 'google' ? 'via Google' : 'via Email';
        ui.status.innerHTML =
            '<div class="ap-auth-badge ap-auth-connected">' +
            '<span class="ap-auth-badge-icon">' + icon + '</span>' +
            '<span class="ap-auth-badge-text">' + ICON_CHECK +
            'Identificado: <b>' + _escapeHtml(identity.name) + '</b> <em>' + label + '</em></span>' +
            '<button class="ap-auth-logout" type="button" aria-label="Desconectar">desconectar</button>' +
            '</div>';
        var btn = ui.status.querySelector('.ap-auth-logout');
        if (btn) btn.addEventListener('click', logout);

        // Hide buttons
        if (ui.btnsWrap) ui.btnsWrap.style.display = 'none';
    }

    function _renderDisconnected() {
        if (ui.status) ui.status.innerHTML = '';
        if (ui.btnsWrap) ui.btnsWrap.style.display = '';
        else _renderButtons();
    }

    // ─── Telegram (deep-link) ──────────────────────────────

    function connectTelegram() {
        if (!state.botUsername) {
            console.warn('[AUTH] botUsername not configured');
            return;
        }

        var link = 'https://t.me/' + state.botUsername + '?start=apoiar';
        // Open bot in new tab
        var win = window.open(link, '_blank', 'noopener,noreferrer');
        if (!win) {
            // Popup blocked — show inline
            window.location.href = link;
            return;
        }

        // Show confirmation modal
        _openTelegramConfirmModal();
    }

    function _openTelegramConfirmModal() {
        var modal = document.createElement('div');
        modal.className = 'ap-auth-modal';
        modal.innerHTML =
            '<div class="ap-auth-modal-backdrop"></div>' +
            '<div class="ap-auth-modal-card">' +
            '<div class="ap-auth-modal-icon">' + ICON_TELEGRAM + '</div>' +
            '<h3>Bot Telegram aberto</h3>' +
            '<p class="ap-auth-modal-hint">Confirme no bot que voce quer apoiar.' +
            ' Apos pagar o PIX, suas recompensas chegam automaticamente ao seu personagem.</p>' +
            '<div class="ap-auth-modal-info">' +
            '<div><b>Como funciona:</b></div>' +
            '<ol>' +
            '<li>Bot abriu numa nova aba</li>' +
            '<li>Toque em <b>Iniciar</b> ou envie <code>/apoiar</code></li>' +
            '<li>Volte aqui e gere o QR Code PIX</li>' +
            '<li>Pague o PIX (codigo VLD-XXXXX vai na descricao)</li>' +
            '<li>Recompensas no jogo em ate 24h</li>' +
            '</ol></div>' +
            '<div class="ap-auth-modal-fields">' +
            '<label>Seu @username Telegram (opcional, para acelerar)' +
            '<input type="text" id="ap-tg-username" maxlength="40" placeholder="@seu_usuario" autocomplete="off"></label>' +
            '<label>Seu nome (como quer ser identificado)' +
            '<input type="text" id="ap-tg-name" maxlength="60" placeholder="Ex: Alex" required></label>' +
            '</div>' +
            '<div class="ap-auth-modal-actions">' +
            '<button type="button" class="ap-auth-modal-cancel">Cancelar</button>' +
            '<button type="button" class="ap-auth-modal-ok">Confirmar identificacao</button>' +
            '</div></div>';
        document.body.appendChild(modal);

        var btnCancel = modal.querySelector('.ap-auth-modal-cancel');
        var btnOk = modal.querySelector('.ap-auth-modal-ok');
        var bd = modal.querySelector('.ap-auth-modal-backdrop');
        function close() { try { modal.remove(); } catch (_) {} }
        btnCancel.addEventListener('click', close);
        bd.addEventListener('click', close);

        btnOk.addEventListener('click', function() {
            var usernameRaw = (modal.querySelector('#ap-tg-username').value || '').trim();
            var nameRaw = (modal.querySelector('#ap-tg-name').value || '').trim();
            if (!nameRaw) {
                alert('Informe seu nome.');
                return;
            }
            var username = usernameRaw.replace(/^@/, '');
            var identity = {
                provider: 'telegram',
                name: nameRaw.substring(0, 60),
                telegram_username: username ? '@' + username.substring(0, 40) : '',
                created_at: Date.now(),
            };
            _save(identity);
            state.user = identity;
            _renderConnected(identity);
            if (typeof state.onAuth === 'function') {
                try { state.onAuth(_toLegacyUser(identity)); } catch (e) { console.warn('[AUTH] onAuth error:', e); }
            }
            close();
        });

        setTimeout(function() {
            var n = modal.querySelector('#ap-tg-name');
            if (n) n.focus();
        }, 80);
    }

    // ─── Google OAuth 2.0 (implicit flow — redirect) ─────────
    // Mesmo fluxo usado em jogo.lendasdevaldoria.com.br/web/ (web-auth.js).
    // Sem GSI/One Tap — implicit redirect e mais confiavel em mobile e iframes.

    function connectGoogle() {
        if (!state.googleClientId) {
            // No client id — fallback to email modal
            _openEmailModal();
            return;
        }
        try {
            var nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
            try { sessionStorage.setItem('ap_google_nonce', nonce); } catch (_) {}

            // Redirect URI = a propria pagina apoie (sem path adicional)
            var redirectUri = window.location.origin + '/';
            var url = 'https://accounts.google.com/o/oauth2/v2/auth' +
                '?client_id=' + encodeURIComponent(state.googleClientId) +
                '&redirect_uri=' + encodeURIComponent(redirectUri) +
                '&response_type=id_token' +
                '&scope=' + encodeURIComponent('openid email profile') +
                '&nonce=' + encodeURIComponent(nonce) +
                '&prompt=select_account';

            console.info('[AUTH] Redirecting to Google OAuth (implicit flow)');
            // Flag para suprimir close beacon durante a transicao
            window.__valdoria_transitioning = true;
            window.location.href = url;
        } catch (e) {
            console.error('[AUTH] Google redirect error:', e);
            _openEmailModal();
        }
    }

    function _decodeJwtPayload(jwt) {
        var parts = jwt.split('.');
        if (parts.length !== 3) throw new Error('Invalid JWT format');
        var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        var pad = b64.length % 4;
        if (pad) b64 += '='.repeat(4 - pad);
        return JSON.parse(decodeURIComponent(atob(b64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')));
    }

    function _checkGoogleRedirectCallback() {
        // Detecta retorno do Google OAuth — id_token vem no hash fragment.
        var hash = window.location.hash || '';
        if (hash.indexOf('id_token=') === -1) return false;

        var params;
        try {
            params = new URLSearchParams(hash.replace(/^#/, ''));
        } catch (_) {
            return false;
        }
        var idToken = params.get('id_token');
        if (!idToken) return false;

        // Limpa o hash imediatamente para evitar re-processamento
        try {
            var clean = window.location.pathname + window.location.search;
            history.replaceState({}, document.title, clean);
        } catch (_) {}

        try {
            var payload = _decodeJwtPayload(idToken);

            // Verifica nonce (CSRF)
            var savedNonce;
            try { savedNonce = sessionStorage.getItem('ap_google_nonce'); } catch (_) {}
            if (savedNonce && payload.nonce !== savedNonce) {
                console.warn('[AUTH] Google nonce mismatch — possible CSRF, ignoring');
                return false;
            }
            try { sessionStorage.removeItem('ap_google_nonce'); } catch (_) {}

            // Verifica expiracao
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                console.warn('[AUTH] Google token expired');
                return false;
            }

            // Verifica issuer (deve ser do Google)
            var iss = payload.iss || '';
            if (iss !== 'https://accounts.google.com' && iss !== 'accounts.google.com') {
                console.warn('[AUTH] Google issuer invalid:', iss);
                return false;
            }

            // Verifica audience (deve bater com o client id)
            if (state.googleClientId && payload.aud !== state.googleClientId) {
                console.warn('[AUTH] Google audience mismatch:',
                    payload.aud, '!=', state.googleClientId);
                return false;
            }

            var identity = {
                provider: 'google',
                name: payload.name || payload.email || 'Apoiador',
                email: payload.email,
                sub: payload.sub,
                picture: payload.picture,
                email_verified: !!payload.email_verified,
                created_at: Date.now(),
            };
            _save(identity);
            state.user = identity;
            return true;
        } catch (e) {
            console.error('[AUTH] Google callback parse error:', e);
            return false;
        }
    }

    function _openEmailModal() {
        var modal = document.createElement('div');
        modal.className = 'ap-auth-modal';
        modal.innerHTML =
            '<div class="ap-auth-modal-backdrop"></div>' +
            '<div class="ap-auth-modal-card">' +
            '<div class="ap-auth-modal-icon">' + ICON_GOOGLE + '</div>' +
            '<h3>Identificacao por email</h3>' +
            '<p class="ap-auth-modal-hint">Preencha nome e email — vamos notificar quando sua doacao for confirmada. Sem login Google real necessario.</p>' +
            '<div class="ap-auth-modal-fields">' +
            '<label>Nome <input type="text" id="ap-em-name" maxlength="60" placeholder="Como gostaria de ser identificado" required></label>' +
            '<label>Email <input type="email" id="ap-em-email" maxlength="120" placeholder="voce@exemplo.com" required></label>' +
            '</div>' +
            '<div class="ap-auth-modal-actions">' +
            '<button type="button" class="ap-auth-modal-cancel">Cancelar</button>' +
            '<button type="button" class="ap-auth-modal-ok">Confirmar</button>' +
            '</div></div>';
        document.body.appendChild(modal);

        var bd = modal.querySelector('.ap-auth-modal-backdrop');
        var btnCancel = modal.querySelector('.ap-auth-modal-cancel');
        var btnOk = modal.querySelector('.ap-auth-modal-ok');
        function close() { try { modal.remove(); } catch (_) {} }
        btnCancel.addEventListener('click', close);
        bd.addEventListener('click', close);

        btnOk.addEventListener('click', function() {
            var name = (modal.querySelector('#ap-em-name').value || '').trim();
            var email = (modal.querySelector('#ap-em-email').value || '').trim().toLowerCase();
            if (!name) { alert('Informe seu nome.'); return; }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Email invalido.'); return; }
            var identity = {
                provider: 'email',
                name: name.substring(0, 60),
                email: email.substring(0, 120),
                created_at: Date.now(),
            };
            _save(identity);
            state.user = identity;
            _renderConnected(identity);
            if (typeof state.onAuth === 'function') {
                try { state.onAuth(_toLegacyUser(identity)); } catch (e) { console.warn('[AUTH] onAuth error:', e); }
            }
            close();
        });

        setTimeout(function() {
            var n = modal.querySelector('#ap-em-name');
            if (n) n.focus();
        }, 80);
    }

    // ─── Common ─────────────────────────────────────────────

    function _toLegacyUser(identity) {
        // Convert internal identity -> shape expected by old onTelegramAuth callback
        if (!identity) return null;
        var parts = String(identity.name || '').split(' ');
        return {
            provider: identity.provider,
            first_name: parts[0] || identity.name,
            last_name: parts.slice(1).join(' '),
            username: identity.telegram_username ? identity.telegram_username.replace(/^@/, '') : '',
            email: identity.email,
            // donate API expects "telegram_user" object — only passes through when provider=telegram
        };
    }

    function logout() {
        state.user = null;
        _clear();
        _renderDisconnected();
        if (typeof state.onAuth === 'function') {
            try { state.onAuth(null); } catch (_) {}
        }
    }

    function getUser() { return state.user; }

    function getIdentity() {
        return state.user ? Object.assign({}, state.user) : null;
    }

    function init(opts) {
        opts = opts || {};
        state.botUsername = opts.botUsername || '';
        state.googleClientId = opts.googleClientId || window.GOOGLE_CLIENT_ID || '';
        state.onAuth = opts.onAuth || null;

        ui.container = document.getElementById('ap-tg-login-container');
        ui.status = document.getElementById('ap-tg-status');

        if (!ui.container) {
            console.warn('[AUTH] container #ap-tg-login-container not found');
            return;
        }

        _renderButtons();

        // Detecta retorno do Google OAuth (id_token no hash fragment)
        var camFromGoogle = _checkGoogleRedirectCallback();

        // Restore saved identity (do redirect Google OU sessao anterior)
        var saved = state.user || _load();
        if (saved && saved.provider && saved.name) {
            state.user = saved;
            _renderConnected(saved);
            if (typeof state.onAuth === 'function') {
                try { state.onAuth(_toLegacyUser(saved)); } catch (_) {}
            }
            // Se veio do Google, rola pra area de doacao pra o usuario ver o badge
            if (camFromGoogle) {
                setTimeout(function() {
                    var d = document.getElementById('donate');
                    if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 250);
            }
        }
    }

    // ─── Public API ─────────────────────────────────────────

    window.ApAuth = {
        init: init,
        connectTelegram: connectTelegram,
        connectGoogle: connectGoogle,
        logout: logout,
        getUser: getUser,
        getIdentity: getIdentity,
    };

    // Backward-compat shim for apoie.js calling ApTgOAuth.init(botUsername, callback)
    window.ApTgOAuth = {
        init: function(botUsername, onAuthCallback) {
            init({
                botUsername: botUsername,
                googleClientId: window.GOOGLE_CLIENT_ID || '',
                onAuth: onAuthCallback,
            });
        },
        openLoginPopup: connectTelegram,
        logout: logout,
        getUser: getUser,
    };
})();

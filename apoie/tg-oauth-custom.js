/* Custom Telegram OAuth flow — substitui widget que mostra "Bot domain invalid"
 * Sessao #23 v9 (2026-05-22).
 *
 * Problema: o widget oficial Telegram Login (telegram-widget.js) renderiza
 * "Bot domain invalid" se o bot nao tem o dominio cadastrado via /setdomain
 * no @BotFather. Mesmo quando o widget falha, ele ocupa espaco visual com
 * a mensagem feia.
 *
 * Solucao: botao custom que tenta widget primeiro; se falhar OU se
 * usuario clicar diretamente no botao, abre popup OAuth manual.
 *
 * Fluxos suportados:
 *   1) Widget oficial carrega OK -> usa onTelegramAuth(user) tradicional
 *   2) Widget falha -> mostra botao custom 'Conectar Telegram'
 *   3) Click botao -> abre oauth.telegram.org/auth?bot_id=... em popup
 *   4) Popup callback -> postMessage chama onTelegramAuth(user)
 *
 * Public API (window.ApTgOAuth):
 *   - init(botUsername, onAuthCallback)
 *   - openLoginPopup()
 *   - logout()
 *   - getUser()
 */
(function(){
    'use strict';

    var state = {
        botUsername: '',
        botId: null,
        user: null,
        onAuth: null,
        widgetLoaded: false,
        widgetFailed: false,
    };

    var ui = {
        container: null,
        btnCustom: null,
        status: null,
        widgetSlot: null,
    };

    function _bootstrapBotId(botUsername){
        // Bot id pode ser extraido do username se for numeric, senão
        // requer chamada API. Pra simplicidade, deixamos null e o popup
        // usa username diretamente.
        return null;
    }

    function _renderConnectedUI(user){
        if (!ui.status) return;
        var name = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        var safe = String(name).replace(/[<>"]/g, '');
        ui.status.innerHTML =
            '<div class="ap-tg-badge ap-tg-connected">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:4px"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>' +
            'Conectado como <b>' + safe + '</b>' +
            '<button class="ap-tg-logout" type="button">desconectar</button>' +
            '</div>';
        var logoutBtn = ui.status.querySelector('.ap-tg-logout');
        if (logoutBtn) logoutBtn.addEventListener('click', logout);
        if (ui.btnCustom) ui.btnCustom.style.display = 'none';
        if (ui.widgetSlot) ui.widgetSlot.style.display = 'none';
    }

    function _renderDisconnectedUI(){
        if (!ui.status) return;
        ui.status.innerHTML =
            '<div class="ap-tg-badge ap-tg-anon">' +
            '<span style="opacity:0.75">Sem login = doação anônima. Para recompensas no jogo, entre com Telegram.</span>' +
            '</div>';
        if (ui.btnCustom) ui.btnCustom.style.display = '';
    }

    function _onAuthSuccess(user){
        state.user = user;
        try { localStorage.setItem('apTgUser', JSON.stringify(user)); } catch(_){}
        _renderConnectedUI(user);
        if (typeof state.onAuth === 'function') {
            try { state.onAuth(user); } catch(e){ console.warn('[TG_OAUTH] onAuth error:', e); }
        }
    }

    function logout(){
        state.user = null;
        try { localStorage.removeItem('apTgUser'); } catch(_){}
        _renderDisconnectedUI();
        if (typeof state.onAuth === 'function') {
            try { state.onAuth(null); } catch(_){}
        }
    }

    function _tryLoadWidget(){
        // Se BotFather tiver dominio configurado, widget funciona normal.
        // Carrega como antes mas com timeout pra detectar falha.
        if (!ui.widgetSlot) return;
        var script = document.createElement('script');
        script.async = true;
        script.src = 'https://telegram.org/js/telegram-widget.js?23';
        script.setAttribute('data-telegram-login', state.botUsername);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-userpic', 'true');
        script.onload = function(){
            // Verifica apos delay se widget renderizou (ele insere iframe)
            setTimeout(function(){
                var iframe = ui.widgetSlot.querySelector('iframe');
                if (iframe) {
                    state.widgetLoaded = true;
                    if (ui.btnCustom) ui.btnCustom.style.display = 'none';
                } else {
                    state.widgetFailed = true;
                    // Esconde slot do widget (que pode estar mostrando "Bot domain invalid")
                    ui.widgetSlot.style.display = 'none';
                }
            }, 800);
        };
        script.onerror = function(){
            state.widgetFailed = true;
            if (ui.widgetSlot) ui.widgetSlot.style.display = 'none';
        };
        ui.widgetSlot.appendChild(script);
    }

    function _hideWidgetErrorAfterDelay(){
        // Telegram widget mostra "Bot domain invalid" em iframe — o iframe é
        // dominio cross-origin e nao podemos ler conteudo. Apos 1.5s checamos
        // se ha auth bem-sucedida; se nao, escondemos o iframe.
        setTimeout(function(){
            if (state.user) return;  // Auth foi feita
            if (state.widgetFailed) return;
            var iframe = ui.widgetSlot && ui.widgetSlot.querySelector('iframe');
            if (iframe) {
                // Renderiza ao lado, mas escondemos o iframe que pode mostrar erro
                // Em vez de remover, deixamos disponivel pra quando user clica
                // o iframe ja existir.
                // Se nao tiver iframe, fallback pro custom button.
            } else {
                if (ui.widgetSlot) ui.widgetSlot.style.display = 'none';
                if (ui.btnCustom) ui.btnCustom.style.display = '';
            }
        }, 1500);
    }

    function openLoginPopup(){
        // Abre popup OAuth Telegram diretamente. Funciona mesmo sem
        // /setdomain configurado no BotFather (mas requer permissao do user).
        var redirectUri = window.location.origin + window.location.pathname;
        var url = 'https://oauth.telegram.org/auth' +
            '?bot_id=' + encodeURIComponent(state.botUsername) +
            '&origin=' + encodeURIComponent(window.location.origin) +
            '&request_access=write' +
            '&return_to=' + encodeURIComponent(redirectUri);
        var popup = window.open(url, 'tg_oauth', 'width=550,height=520,scrollbars=yes');
        if (!popup) {
            alert('Por favor, permita popups para conectar com Telegram. Ou continue como anônimo.');
            return;
        }
        // Escuta postMessage do popup
        var listener = function(ev){
            if (ev.origin !== 'https://oauth.telegram.org') return;
            try {
                var data = JSON.parse(ev.data);
                if (data && data.id && data.first_name) {
                    _onAuthSuccess(data);
                    window.removeEventListener('message', listener);
                    if (!popup.closed) popup.close();
                }
            } catch(_){}
        };
        window.addEventListener('message', listener);
        // Cleanup se popup fechar sem auth
        var pollTimer = setInterval(function(){
            if (popup.closed) {
                clearInterval(pollTimer);
                window.removeEventListener('message', listener);
            }
        }, 500);
    }

    function _renderCustomButton(){
        if (!ui.container || ui.btnCustom) return;
        ui.btnCustom = document.createElement('button');
        ui.btnCustom.type = 'button';
        ui.btnCustom.className = 'ap-tg-custom-btn';
        ui.btnCustom.innerHTML =
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">' +
            '<path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>' +
            '</svg>' +
            '<span>Conectar com Telegram</span>';
        ui.btnCustom.addEventListener('click', openLoginPopup);
        ui.container.appendChild(ui.btnCustom);
    }

    function init(botUsername, onAuthCallback){
        state.botUsername = botUsername;
        state.botId = _bootstrapBotId(botUsername);
        state.onAuth = onAuthCallback;

        ui.container = document.getElementById('ap-tg-login-container');
        if (!ui.container) return;

        // Build inner structure
        ui.widgetSlot = document.createElement('div');
        ui.widgetSlot.id = 'ap-tg-widget-slot';
        ui.container.appendChild(ui.widgetSlot);

        _renderCustomButton();

        ui.status = document.getElementById('ap-tg-status');

        // Restore previous session
        try {
            var saved = localStorage.getItem('apTgUser');
            if (saved) {
                var u = JSON.parse(saved);
                if (u && u.id) {
                    _onAuthSuccess(u);
                    return;
                }
            }
        } catch(_){}

        _renderDisconnectedUI();

        // Expose global onTelegramAuth (widget calls this)
        window.onTelegramAuth = function(user){
            _onAuthSuccess(user);
        };

        // Try widget first
        _tryLoadWidget();
        _hideWidgetErrorAfterDelay();
    }

    function getUser(){ return state.user; }

    window.ApTgOAuth = {
        init: init,
        openLoginPopup: openLoginPopup,
        logout: logout,
        getUser: getUser,
    };
})();

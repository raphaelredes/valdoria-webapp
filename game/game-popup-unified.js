/**
 * game-popup-unified.js -- Sistema Unificado de Popups
 *
 * Todas as telas marcadas com _is_popup pelo server são renderizadas
 * como popups sobre o hub. Suporta navegação em stack (Voltar/Fechar).
 *
 * Regras:
 * - Popups NUNCA salvam last_screen_payload (regra backend)
 * - "Voltar" volta ao popup anterior no stack
 * - "Fechar" fecha TODOS os popups e mostra a tela de fundo
 * - Fechar é SEMPRE o último botão, na parte mais de baixo
 */
(function () {
'use strict';

var _popupStack = [];
var _overlayId = 'unified-popup-overlay';

/**
 * Show a unified popup from server response data.
 * Called from doAction() when data._is_popup is true.
 */
window._showUnifiedPopup = function (data) {
    if (_popupStack.length > 0) {
        var top = _popupStack[_popupStack.length - 1];
        // Same screen re-render (e.g. after using a consumable) — replace top
        if (top._popup_title === data._popup_title && top.screen_id === data.screen_id) {
            _popupStack[_popupStack.length - 1] = data;
        } else {
            _popupStack.push(data);
        }
    } else {
        _popupStack.push(data);
    }
    _renderCurrentPopup();
};

/**
 * Check if the unified popup is currently open.
 */
window._isUnifiedPopupOpen = function () {
    return _popupStack.length > 0 && typeof vPopup !== 'undefined' && vPopup.isOpen();
};

/**
 * Close all unified popups and clear the stack.
 */
window._closeUnifiedPopup = function () {
    _popupStack = [];
    if (typeof vPopup !== 'undefined') vPopup.hide(_overlayId);
};

function _renderCurrentPopup() {
    if (_popupStack.length === 0) return;

    var data = _popupStack[_popupStack.length - 1];
    var bodyEl = _buildPopupBody(data);
    var actionsHtml = _buildPopupActions(data);

    if (typeof vPopup === 'undefined') {
        console.error('[POPUP-UNIFIED] vPopup not loaded');
        return;
    }

    vPopup.show({
        id: _overlayId,
        header: data._popup_title || '',
        bodyEl: bodyEl,
        actions: actionsHtml,
        onAction: _handlePopupAction,
        closeOnOutside: true,
        onHide: function () {
            _popupStack = [];
        }
    });
}

function _buildPopupBody(data) {
    var el = document.createElement('div');
    el.className = 'unified-popup-body';

    // Image banner (if present)
    if (data.image_url) {
        var img = document.createElement('img');
        img.src = data.image_url;
        img.className = 'unified-popup-banner';
        img.alt = '';
        el.appendChild(img);
    }

    // Text content
    if (data.text) {
        var textDiv = document.createElement('div');
        textDiv.className = 'unified-popup-text';
        textDiv.style.whiteSpace = 'pre-wrap';
        textDiv.innerHTML = data.text;
        el.appendChild(textDiv);
    }

    // Toast inside popup
    if (data.toast) {
        var toastDiv = document.createElement('div');
        toastDiv.className = 'unified-popup-toast';
        toastDiv.textContent = data.toast;
        el.appendChild(toastDiv);
    }

    // Action buttons (from server response)
    // Filter out back/footer buttons — popup has its own Voltar/Fechar
    var _POPUP_SKIP_CBS = {"action_universal_back":1, "action_toggle_footer":1, "main_menu":1, "action_menu":1};
    if (data.buttons && data.buttons.length > 0) {
        var btnsDiv = document.createElement('div');
        btnsDiv.className = 'unified-popup-buttons';
        for (var r = 0; r < data.buttons.length; r++) {
            var row = data.buttons[r];
            if (!row || row.length === 0) continue;

            var rowDiv = document.createElement('div');
            rowDiv.className = row.length >= 2 ? 'unified-popup-btn-row' : 'unified-popup-btn-row unified-popup-btn-row--single';
            for (var b = 0; b < row.length; b++) {
                var btnData = row[b];
                // Skip back/footer buttons in popup context
                if (btnData.is_back || _POPUP_SKIP_CBS[btnData.cb]) continue;
                var btn = document.createElement('button');
                btn.className = 'v-popup-btn';
                btn.textContent = btnData.text || '';
                if (btnData.cb) {
                    btn.setAttribute('data-action', btnData.cb);
                } else if (btnData.url) {
                    btn.setAttribute('data-url', btnData.url);
                }
                rowDiv.appendChild(btn);
            }
            btnsDiv.appendChild(rowDiv);
        }
        el.appendChild(btnsDiv);
    }

    return el;
}

function _buildPopupActions(data) {
    var html = '';

    // "Voltar" button — only if there is a previous popup in the stack
    if (_popupStack.length > 1) {
        html += '<button class="v-popup-btn" data-action="popup_back">\u2b05\ufe0f Voltar</button>';
    }

    // "Fechar" button — ALWAYS present, ALWAYS last
    html += '<button class="v-popup-btn v-popup-btn--cancel" data-action="popup_close">\ud83c\udfe0 Fechar</button>';

    return html;
}

function _handlePopupAction(action) {
    // Navigation: go back in popup stack
    if (action === 'popup_back') {
        if (_popupStack.length > 1) {
            _popupStack.pop();
            _renderCurrentPopup();
        } else {
            _popupStack = [];
        }
        return true; // prevent default close
    }

    // Close all popups
    if (action === 'popup_close') {
        _popupStack = [];
        return false; // allow vPopup to close
    }

    // Regular game action — send to server via doAction
    if (action && action !== 'cancel' && typeof doAction === 'function') {
        doAction(action);
        return true; // keep popup open — next response will update/replace it
    }

    return false;
}

})();

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
var _MAX_DEPTH = 8;

/**
 * Show a unified popup from server response data.
 * Called from doAction() when data._is_popup is true.
 */
window._showUnifiedPopup = function (data) {
    console.log("[POPUP] _showUnifiedPopup received:", data);
    if (!data) return;

    if (_popupStack.length > 0) {
        var top = _popupStack[_popupStack.length - 1];
        // Same screen re-render (e.g. after using a consumable) — replace top
        if (top._popup_title === data._popup_title && (top.screen_id === data.screen_id || (!top.screen_id && !data.screen_id))) {
            console.log("[POPUP] Same screen detected, replacing top for refresh");
            _popupStack[_popupStack.length - 1] = data;
        } else if (_popupStack.length >= _MAX_DEPTH) {
            console.warn('[POPUP-UNIFIED] Max depth reached (' + _MAX_DEPTH + '), replacing top');
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
    // Clear previous if open
    if (typeof vPopup !== 'undefined' && vPopup.isOpen() && vPopup.body) {
        console.log("[POPUP] Pre-clearing body before vPopup.show");
        vPopup.body.innerHTML = "";
    }

    var bodyEl = _buildPopupBody(data);
    var actionsHtml = _buildPopupActions(data);

    if (typeof vPopup === 'undefined') {
        console.error('[POPUP-UNIFIED] vPopup not loaded');
        return;
    }

    var popupOpts = {
        id: _overlayId,
        header: data._popup_title || '',
        bodyEl: bodyEl,
        actions: actionsHtml,
        onAction: _handlePopupAction,
        closeOnOutside: true,
        onHide: function () {
            _popupStack = [];
            if (window._innRestRefreshPending) {
                window._innRestRefreshPending = false;
                if (typeof fetchState === 'function') fetchState(true);
            }
        }
    };
    if (data._is_error_fallback) {
        popupOpts.headerClass = 'v-popup-header--error';
    }
    vPopup.show(popupOpts);
}

function _buildPopupBody(data) {
    var el = document.createElement('div');
    el.className = 'unified-popup-body';

    // Error fallback: clear technical error styling
    if (data._is_error_fallback) {
        el.classList.add('unified-popup-error');
        return el;
    }

    // Tavern game: structured card renderer
    if (data._tavern_game && typeof renderTavernGame === 'function') {
        renderTavernGame(el, data._tavern_game);
        return el;
    }

    // Inn redesign: structured data renderer
    if (data._inn_screen && typeof renderInnConfirm === 'function') {
        renderInnConfirm(el, data._inn_screen);
        return el;
    }

    // City locations redesign: structured card grid
    if (data._city_locations && typeof renderCityLocations === 'function') {
        renderCityLocations(el, data._city_locations);
        return el;
    }

    // City gates redesign
    if (data._gates_screen && typeof renderGatesHub === 'function') {
        renderGatesHub(el, data._gates_screen);
        return el;
    }

    // Temple redesign
    if (data._temple_screen && typeof renderTempleHub === 'function') {
        renderTempleHub(el, data._temple_screen);
        return el;
    }

    // Bank redesign
    if (data._bank_screen && typeof renderBankHub === 'function') {
        renderBankHub(el, data._bank_screen);
        return el;
    }

    // Square redesign
    if (data._square_screen && typeof renderSquareHub === 'function') {
        renderSquareHub(el, data._square_screen);
        return el;
    }

    // Guild redesign
    if (data._guild_screen && typeof renderGuildHub === 'function') {
        renderGuildHub(el, data._guild_screen);
        return el;
    }

    // Guild: adventurer detail (V1 Hero Portrait)
    if (data._guild_adventurer && typeof renderGuildAdventurer === 'function') {
        renderGuildAdventurer(el, data._guild_adventurer);
        return el;
    }

    // Guild: hire confirm (V2 Quick Confirm)
    if (data._guild_hire_confirm && typeof renderGuildHireConfirm === 'function') {
        renderGuildHireConfirm(el, data._guild_hire_confirm);
        return el;
    }

    // Guild: hire success (V2 NPC Welcome)
    if (data._guild_hire_success && typeof renderGuildHireSuccess === 'function') {
        renderGuildHireSuccess(el, data._guild_hire_success);
        return el;
    }

    // Tavern redesign
    if (data._tavern_screen && typeof renderTavernHub === 'function') {
        renderTavernHub(el, data._tavern_screen);
        return el;
    }

    // Market redesign
    if (data._market_screen && typeof renderMarketHub === 'function') {
        renderMarketHub(el, data._market_screen);
        return el;
    }

    // Bank sub-screens (insurance, loans, investments)
    if (data._bank_sub_screen && typeof renderBankSub === 'function') {
        renderBankSub(el, data._bank_sub_screen);
        return el;
    }

    // Codex / Compêndio popup
    if (data._codex_screen && typeof renderCodexScreen === 'function') {
        renderCodexScreen(el, data._codex_screen);
        return el;
    }

    // Festival hub
    if (data._festival_screen && typeof renderFestivalHub === 'function') {
        renderFestivalHub(el, data._festival_screen);
        return el;
    }

    // Guard dialogue
    if (data._guard_screen && typeof renderGuardScreen === 'function') {
        renderGuardScreen(el, data._guard_screen);
        return el;
    }

    // Help screen
    if (data._help_screen && typeof renderHelpScreen === 'function') {
        renderHelpScreen(el, data._help_screen);
        return el;
    }

    // Wandering NPC encounter
    if (data._wandering_npc_screen && typeof renderWanderingNpc === 'function') {
        renderWanderingNpc(el, data._wandering_npc_screen);
        return el;
    }

    // Trade Board hub
    if (data._trade_board_screen && typeof renderTradeBoard === 'function') {
        renderTradeBoard(el, data._trade_board_screen);
        return el;
    }

    // Rune Scribe redesign
    if (data._rune_scribe_screen && typeof renderRuneScribe === 'function') {
        renderRuneScribe(el, data._rune_scribe_screen);
        return el;
    }

    // Workshop/Crafting redesign
    if (data._workshop_screen && typeof renderWorkshopHub === 'function') {
        renderWorkshopHub(el, data._workshop_screen);
        return el;
    }

    // Arena redesign
    if (data._arena_screen && typeof renderArenaScreen === 'function') {
        renderArenaScreen(el, data._arena_screen);
        return el;
    }

    // Achievements redesign
    if (data.achievements_data) {
        console.log("[POPUP] Achievements data found, calling renderer.");
        if (typeof renderAchievementsData === 'function') {
            try {
                console.log("[POPUP] Calling renderAchievementsData with view:", data.achievements_data.view);
                renderAchievementsData(el, data.achievements_data);
                return el;
            } catch (e) {
                console.error('[POPUP] renderAchievementsData error:', e);
                var errEl = document.createElement('div');
                errEl.style.padding = "20px";
                errEl.style.color = "var(--color-danger, red)";
                errEl.innerHTML = "<b>Erro de Renderização (Conquistas):</b> " + e.message;
                el.appendChild(errEl);
                return el;
            }
        } else {
            var errEl = document.createElement('div');
            errEl.style.padding = "20px";
            errEl.style.color = "var(--color-danger, red)";
            errEl.style.textAlign = "center";
            errEl.innerHTML = "<b>Aviso de Cache:</b> O script das Conquistas n\u00e3o foi carregado.<br>Por favor, FECHE O MINICLIENTE e abra novamente, ou limpe o cache.";
            el.appendChild(errEl);
            return el;
        }
    }

    // League redesign
    if (data.league_data) {
        if (typeof renderLeagueData === 'function') {
            try {
                renderLeagueData(el, data.league_data);
                return el;
            } catch (e) {
                console.error('[POPUP] renderLeagueData error:', e);
                var errEl = document.createElement('div');
                errEl.style.padding = "20px";
                errEl.style.color = "var(--color-danger, red)";
                errEl.innerHTML = "<b>Erro de Renderiza\u00e7\u00e3o (Ligas):</b> " + e.message;
                el.appendChild(errEl);
                return el;
            }
        } else {
            var errEl = document.createElement('div');
            errEl.style.padding = "20px";
            errEl.style.color = "var(--color-danger, red)";
            errEl.style.textAlign = "center";
            errEl.innerHTML = "<b>Aviso de Cache:</b> O script das Ligas n\u00e3o foi carregado.<br>Por favor, FECHE O MINICLIENTE e abra novamente.";
            el.appendChild(errEl);
            return el;
        }
    }

    // Ficha do personagem (dados estruturados — substitui texto com barras emoji)
    if (data.char_details && typeof renderCharDetails === 'function') {
        var sheetEl = document.createElement('div');
        sheetEl.className = 'unified-popup-char-sheet';
        renderCharDetails(sheetEl, data.char_details);
        el.appendChild(sheetEl);
        if (data.toast) {
            var toastDiv = document.createElement('div');
            toastDiv.className = 'unified-popup-toast';
            toastDiv.textContent = data.toast;
            el.appendChild(toastDiv);
        }
        if (data.buttons && data.buttons.length > 0) {
            var _POPUP_SKIP_CBS = {"action_universal_back":1, "action_toggle_footer":1, "main_menu":1, "action_menu":1};
            var btnsDiv = document.createElement('div');
            btnsDiv.className = 'unified-popup-buttons';
            for (var r = 0; r < data.buttons.length; r++) {
                var row = data.buttons[r];
                if (!row || row.length === 0) continue;
                var rowDiv = document.createElement('div');
                rowDiv.className = row.length >= 2 ? 'unified-popup-btn-row' : 'unified-popup-btn-row unified-popup-btn-row--single';
                for (var b = 0; b < row.length; b++) {
                    var btnData = row[b];
                    if (btnData.is_back || _POPUP_SKIP_CBS[btnData.cb]) continue;
                    var btn = document.createElement('button');
                    btn.className = 'v-popup-btn';
                    btn.textContent = btnData.text || '';
                    if (btnData.cb) btn.setAttribute('data-action', btnData.cb);
                    else if (btnData.url) btn.setAttribute('data-url', btnData.url);
                    rowDiv.appendChild(btn);
                }
                btnsDiv.appendChild(rowDiv);
            }
            el.appendChild(btnsDiv);
        }
        return el;
    }

    // Quest detail redesign (V3 — Grimório Dual)
    if (data.quest_detail && typeof renderQuestDetail === 'function') {
        try {
            renderQuestDetail(el, data.quest_detail);
            return el;
        } catch (e) {
            console.error('[POPUP] renderQuestDetail error:', e);
        }
    }

    // Image banner (if present)
    if (data.image_url) {
        var img = document.createElement('img');
        img.src = data.image_url;
        img.className = 'unified-popup-banner';
        img.alt = '';
        el.appendChild(img);
    }

    // Text content — detect legacy inline format and show "Em Construção"
    if (data.text) {
        var _rawText = data.text;
        var _isLegacy = /━|✦|═|◆.*◆.*◆/.test(_rawText);
        if (_isLegacy && data._is_popup) {
            console.info('[POPUP] Legacy inline detected — showing WIP for', data._popup_title || '?');
            var wip = document.createElement('div');
            wip.className = 'unified-popup-wip';
            var wipIcon = document.createElement('div');
            wipIcon.className = 'wip-icon';
            /* Medieval scroll+quill SVG — safe static content, no user input */
            wipIcon.innerHTML = '<svg viewBox="0 0 64 64" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                '<rect x="16" y="8" width="32" height="48" rx="3" fill="#3a2a1a" stroke="#8a6a3a" stroke-width="1.5"/>' +
                '<rect x="20" y="14" width="24" height="36" rx="1" fill="#2a1e14" stroke="#6a5030" stroke-width="0.8"/>' +
                '<line x1="22" y1="22" x2="42" y2="22" stroke="#5a4a30" stroke-width="0.8" stroke-dasharray="2 2"/>' +
                '<line x1="22" y1="28" x2="38" y2="28" stroke="#5a4a30" stroke-width="0.8" stroke-dasharray="2 2"/>' +
                '<line x1="22" y1="34" x2="40" y2="34" stroke="#5a4a30" stroke-width="0.8" stroke-dasharray="2 2"/>' +
                '<circle cx="44" cy="44" r="12" fill="#2a2018" stroke="#8a6a3a" stroke-width="1.2"/>' +
                '<path d="M44 36 L44 44 L48 48" stroke="#c4953a" stroke-width="1.5" stroke-linecap="round" fill="none"/>' +
                '<path d="M40 40 L48 48 M48 40 L40 48" stroke="#c4953a" stroke-width="1" stroke-linecap="round" opacity="0.4"/>' +
                '</svg>';
            wip.appendChild(wipIcon);
            var wipTitle = document.createElement('div');
            wipTitle.className = 'wip-title';
            wipTitle.textContent = 'Em Constru\u00e7\u00e3o';
            wip.appendChild(wipTitle);
            var wipDesc = document.createElement('div');
            wipDesc.className = 'wip-desc';
            wipDesc.textContent = 'Esta tela est\u00e1 sendo redesenhada para uma experi\u00eancia melhor. Em breve estar\u00e1 dispon\u00edvel com o novo visual!';
            wip.appendChild(wipDesc);
            el.appendChild(wip);
        } else {
            var textDiv = document.createElement('div');
            textDiv.className = 'unified-popup-text';
            textDiv.style.whiteSpace = 'pre-wrap';
            textDiv.innerHTML = data.text; /* noqa: preflight — server-rendered HTML */
            el.appendChild(textDiv);
        }
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

    // Close all popups — MUST return true so shared/popup.js does NOT call
    // doAction('popup_close'). Returning false caused doAction → server error.
    if (action === 'popup_close') {
        _popupStack = [];
        if (typeof vPopup !== 'undefined') {
            vPopup.hide();
        }
        return true;
    }

    // Regular game action — send to server via doAction
    if (action && action !== 'cancel' && typeof doAction === 'function') {
        doAction(action);
        return true; // keep popup open — next response will update/replace it
    }

    return false;
}

})();

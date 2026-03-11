/* ═══════════════════════════════════════════════════════════════
   GAME HUB — Character Selection Screen
   Renders the character list for in-WebApp character selection.
   Replaces the inline Telegram buttons for character management.
   ═══════════════════════════════════════════════════════════════ */

/** Escape HTML entities to prevent XSS in user-controlled strings. */
function _escChar(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/**
 * Fetch character list from /api/game/characters and render selection screen.
 * Called when: init() has no char param, main_menu callback, or character switch.
 */
async function showCharacterSelect() {
    console.log('[GAME] showCharacterSelect()');
    showLoading();

    try {
        const url = `${S.apiBase}/api/game/characters?user_id=${S.uid}`;
        const resp = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${S.token}` },
            signal: AbortSignal.timeout(10000),
        });

        if (!resp.ok) {
            console.error('[GAME] characters fetch failed:', resp.status);
            hideLoading();
            showError('Erro ao carregar personagens. Tente novamente.');
            return;
        }

        const data = await resp.json();
        if (data.error) {
            console.error('[GAME] characters error:', data.error);
            hideLoading();
            showError('Sessão expirada. Feche e abra novamente.');
            return;
        }

        await hideLoadingWithDelay();
        renderCharacterSelect(data);
    } catch (e) {
        console.error('[GAME] showCharacterSelect error:', e);
        hideLoading();
        showError('Sem conexão. Verifique sua internet.');
    }
}

/**
 * Render the character selection screen.
 * @param {Object} data - {characters, can_create, active_char_id, census}
 */
function renderCharacterSelect(data) {
    const screenEl = document.getElementById('screen');
    const contentEl = document.getElementById('content');
    const panelEl = document.getElementById('bottom-panel');
    const bannerEl = document.getElementById('banner');

    // Hide banner and bottom panel
    if (bannerEl) bannerEl.style.display = 'none';
    if (panelEl) panelEl.style.display = 'none';

    // Hide immersive toggle on char select
    const immToggle = document.getElementById('immersive-toggle');
    const immRestore = document.getElementById('immersive-restore');
    if (immToggle) immToggle.style.display = 'none';
    if (immRestore) immRestore.style.display = 'none';

    screenEl.style.display = '';
    screenEl.style.paddingBottom = '24px';
    screenEl.scrollTop = 0;

    const chars = data.characters || [];
    const canCreate = data.can_create;
    const census = data.census;

    let html = '';

    // Header
    html += '<div class="char-select-header">';
    html += '<div class="char-select-title">\u269C\uFE0F Sele\u00E7\u00E3o de Personagem</div>';
    if (census) {
        html += `<div class="char-select-census">\uD83C\uDF0D ${census.total} aventureiros em Valdoria`;
        if (census.max_level > 0) {
            const names = (census.max_level_chars || []).join(', ');
            html += ` \u00B7 \uD83C\uDFC6 Nv.${census.max_level}${names ? ' (' + names + ')' : ''}`;
        }
        html += '</div>';
    }
    html += '</div>';

    // Character cards
    if (chars.length === 0) {
        html += '<div class="char-select-empty">';
        html += '<div class="char-select-empty-icon">\uD83D\uDCDC</div>';
        html += '<div class="char-select-empty-text">Nenhum personagem encontrado.<br>Crie seu primeiro aventureiro!</div>';
        html += '</div>';
    } else {
        html += '<div class="char-select-list">';
        for (const c of chars) {
            const fullName = _escChar(`${c.name} ${c.surname || ''}`.trim());
            const activeClass = c.is_active ? ' char-card-active' : '';
            const activeBadge = c.is_active ? '<span class="char-card-badge">Ativo</span>' : '';

            html += `<button class="char-card${activeClass}" data-char-id="${_escChar(c.char_id)}">`;
            html += `<div class="char-card-icon">${_escChar(c.race_icon)}</div>`;
            html += '<div class="char-card-info">';
            html += `<div class="char-card-name">${fullName} ${activeBadge}</div>`;
            html += `<div class="char-card-details">Nv.${c.level} \u00B7 ${_escChar(c.race)} ${_escChar(c.hero_class)}</div>`;
            html += '</div>';
            html += '<div class="char-card-arrow">\u25B8</div>';
            html += '</button>';
        }
        html += '</div>';
    }

    // Action buttons
    html += '<div class="char-select-actions">';

    if (canCreate) {
        html += '<button class="btn-hero char-select-create" id="cs-create">\u2795 Iniciar Nova Jornada</button>';
    }

    html += '<div class="char-select-secondary">';
    html += '<button class="btn-action char-select-manage" id="cs-manage">\uD83D\uDC65 Gerenciar</button>';
    html += '<button class="btn-action char-select-account" id="cs-account">\uD83D\uDD10 Conta</button>';
    html += '</div>';

    html += '<button class="btn-action char-select-community" id="cs-community">\uD83D\uDCAC Comunidade</button>';

    html += '</div>';

    contentEl.innerHTML = html;

    // Bind events: character cards
    contentEl.querySelectorAll('.char-card').forEach(card => {
        card.addEventListener('click', () => {
            const charId = card.dataset.charId;
            if (!charId) return;
            _selectCharacter(charId);
        });
    });

    // Bind events: create button
    const createBtn = document.getElementById('cs-create');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            if (typeof requestTransition === 'function') {
                requestTransition('character_creator');
            } else {
                doAction('create_new_char');
            }
        });
    }

    // Bind events: manage button
    const manageBtn = document.getElementById('cs-manage');
    if (manageBtn) {
        manageBtn.addEventListener('click', () => doAction('manage_chars'));
    }

    // Bind events: account button
    const accountBtn = document.getElementById('cs-account');
    if (accountBtn) {
        accountBtn.addEventListener('click', () => doAction('action_account'));
    }

    // Bind events: community button
    const communityBtn = document.getElementById('cs-community');
    if (communityBtn) {
        communityBtn.addEventListener('click', () => {
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.openTelegramLink('https://t.me/lendasdevaldoria');
            } else {
                window.open('https://t.me/lendasdevaldoria', '_blank');
            }
        });
    }
}

/**
 * Select a character and start the game.
 */
async function _selectCharacter(charId) {
    console.log('[GAME] _selectCharacter:', charId);
    S.charId = charId;
    showLoading();

    const startBody = { char_id: charId };
    const tgPlatform = (window.Telegram && Telegram.WebApp && Telegram.WebApp.platform) || '';
    if (tgPlatform) startBody.platform = tgPlatform;

    const data = await apiCall('/api/game/start', startBody);
    await hideLoadingWithDelay();

    if (data && !data.error) {
        if (data.sv !== undefined) S.screenVersion = data.sv;
        if (data.transition && !data.text) {
            handleTransition(data.transition);
        } else {
            renderScreen(data);
        }
    } else if (data && data.error) {
        showError('Erro ao selecionar personagem. Tente novamente.');
        // Return to character selection after brief delay
        setTimeout(() => showCharacterSelect(), 2500);
    } else if (!data) {
        showError('Sem resposta do servidor. Verifique sua conex\u00e3o.');
        setTimeout(() => showCharacterSelect(), 2500);
    }
}

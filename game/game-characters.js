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
    _showCharSelectSkeleton();

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
            showError('⚠️ Erro ao carregar personagens. Tente novamente.');
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
        showError('🌐 Sem conexão. Verifique sua internet.');
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
            const names = (census.max_level_chars || []).map(n => _escChar(n)).join(', ');
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

            // HP bar percentage
            var hpPct = c.max_hp > 0 ? Math.round((c.hp / c.max_hp) * 100) : 100;
            var hpColor = hpPct > 50 ? '#4ade80' : hpPct > 25 ? '#fbbf24' : '#ef4444';

            // Last played relative time
            var lastPlayed = '';
            if (c.last_activity > 0) {
                var ago = Math.floor((Date.now() / 1000) - c.last_activity);
                if (ago < 3600) lastPlayed = Math.max(1, Math.floor(ago / 60)) + 'min';
                else if (ago < 86400) lastPlayed = Math.floor(ago / 3600) + 'h';
                else lastPlayed = Math.floor(ago / 86400) + 'd';
            }

            html += `<button class="char-card${activeClass}" data-char-id="${_escChar(c.char_id)}">`;
            html += `<div class="char-card-icon">${_escChar(c.race_icon)}</div>`;
            html += '<div class="char-card-info">';
            html += `<div class="char-card-name">${fullName} ${activeBadge}</div>`;
            html += `<div class="char-card-details">Nv.${c.level} \u00B7 ${_escChar(c.race)} ${_escChar(c.hero_class)}</div>`;
            // Meta line: location + quest + last played
            html += '<div class="char-card-meta">';
            if (c.location) html += `<span>${_escChar(c.location)}</span>`;
            if (c.active_quests > 0) html += `<span>\uD83D\uDCDC ${c.active_quests}</span>`;
            if (lastPlayed) html += `<span>\u23F0 ${lastPlayed}</span>`;
            html += '</div>';
            // HP bar
            html += `<div class="char-card-hp"><div class="char-card-hp-fill" style="width:${hpPct}%;background:${hpColor}"></div></div>`;
            html += '</div>';
            html += '<div class="char-card-arrow">\u25B8</div>';
            html += '<button class="char-card-delete" data-del-id="' + _escChar(c.char_id) + '" data-del-name="' + fullName + '" aria-label="Excluir personagem">\u2715</button>';
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

    // Pull-to-refresh indicator
    html = '<div id="ptr-indicator" class="ptr-indicator"></div>' + html;
    contentEl.innerHTML = html;
    _initPullToRefresh();

    // Bind events: character cards
    contentEl.querySelectorAll('.char-card').forEach(card => {
        card.addEventListener('click', () => {
            const charId = card.dataset.charId;
            if (!charId) return;
            _selectCharacter(charId);
        });
    });

    // Bind events: delete buttons (stop propagation to prevent card click)
    contentEl.querySelectorAll('.char-card-delete').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            var charId = btn.dataset.delId;
            var charName = btn.dataset.delName;
            if (charId && charName) _showDeleteConfirmation(charId, charName);
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

    // Prefetch: if only 1 character, preload the game start
    if (chars.length === 1 && typeof _prefetchStart === 'function') {
        _prefetchStart(chars[0].char_id);
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
let _selectingChar = false;
async function _selectCharacter(charId) {
    if (_selectingChar) return;
    _selectingChar = true;
    console.log('[GAME] _selectCharacter:', charId);
    S.charId = charId;
    // Animate card press before loading
    var pressedCard = document.querySelector('.char-card[data-char-id="' + charId + '"]');
    if (pressedCard) { pressedCard.style.transform = 'scale(0.97)'; pressedCard.style.opacity = '0.7'; }
    showLoading();

    const startBody = { char_id: charId };
    const tgPlatform = (window.Telegram && Telegram.WebApp && Telegram.WebApp.platform) || '';
    if (tgPlatform) startBody.platform = tgPlatform;

    const data = await apiCall('/api/game/start', startBody);
    await hideLoadingWithDelay();

    if (data && !data.error) {
        if (data.sv !== undefined) S.screenVersion = data.sv;
        if (data.session_ttl && typeof initSessionExpiry === 'function') initSessionExpiry(data.session_ttl);
        if (data.transition && !data.text) {
            handleTransition(data.transition);
        } else {
            renderScreen(data);
            // Welcome toast with character name
            var charBtn = document.querySelector('.char-card[data-char-id="' + charId + '"]');
            var cName = charBtn ? charBtn.querySelector('.char-card-name') : null;
            _showWelcomeToast(cName ? cName.textContent.replace(/Ativo/g, '').trim() : '');
        }
    } else if (data && data.error) {
        showError('Erro ao selecionar personagem. Tente novamente.');
        // Return to character selection after brief delay
        setTimeout(() => showCharacterSelect(), 2500);
    } else if (!data) {
        showError('Sem resposta do servidor. Verifique sua conex\u00e3o.');
        setTimeout(() => showCharacterSelect(), 2500);
    }
    _selectingChar = false;
}


// ─── Character Deletion Confirmation Modal ───
function _showDeleteConfirmation(charId, charName) {
    // Remove existing modal
    var existing = document.getElementById('char-delete-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'char-delete-modal';
    modal.className = 'char-delete-modal';
    modal.innerHTML = '<div class="char-delete-card">' +
        '<div class="char-delete-icon">\u26A0\uFE0F</div>' +
        '<div class="char-delete-title">Excluir Personagem?</div>' +
        '<div class="char-delete-name">' + _escChar(charName) + '</div>' +
        '<div class="char-delete-warn">Esta a\u00E7\u00E3o \u00E9 irrevers\u00EDvel.<br>O personagem ser\u00E1 permanentemente removido.</div>' +
        '<div class="char-delete-actions">' +
        '<button class="char-delete-cancel" id="del-cancel">Cancelar</button>' +
        '<button class="char-delete-confirm" id="del-confirm">Excluir</button>' +
        '</div></div>';

    document.body.appendChild(modal);
    if (typeof haptic === 'function') haptic('warning');

    // Close on backdrop click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) { modal.remove(); }
    });

    document.getElementById('del-cancel').addEventListener('click', function() {
        modal.remove();
    });

    document.getElementById('del-confirm').addEventListener('click', function() {
        modal.remove();
        _deleteCharacter(charId, charName);
    });
}

async function _deleteCharacter(charId, charName) {
    if (typeof showToast === 'function') showToast('\uD83D\uDDD1\uFE0F Excluindo ' + _escChar(charName) + '...', 2000);
    var data = await apiCall('/api/game/action', { cb: 'delete_char_' + charId });
    if (data && !data.error) {
        if (typeof showToast === 'function') showToast('\u2705 Personagem exclu\u00EDdo.', 2000);
        setTimeout(function() { showCharacterSelect(); }, 500);
    } else {
        if (typeof showToast === 'function') showToast('\u26A0\uFE0F N\u00E3o foi poss\u00EDvel excluir. Tente novamente.', 3000);
    }
}


// ─── Skeleton Loading for Character Cards ───
function _showCharSelectSkeleton() {
    var screenEl = document.getElementById('screen');
    var contentEl = document.getElementById('content');
    var panelEl = document.getElementById('bottom-panel');
    var bannerEl = document.getElementById('banner');
    if (bannerEl) bannerEl.style.display = 'none';
    if (panelEl) panelEl.style.display = 'none';
    if (screenEl) { screenEl.style.display = ''; screenEl.scrollTop = 0; }

    var html = '<div class="char-select-header">';
    html += '<div class="char-select-title">\u269C\uFE0F Sele\u00E7\u00E3o de Personagem</div>';
    html += '</div>';
    for (var i = 0; i < 3; i++) {
        html += '<div class="char-card-skeleton">';
        html += '<div class="skeleton-icon"></div>';
        html += '<div class="skeleton-lines">';
        html += '<div class="skeleton-line long"></div>';
        html += '<div class="skeleton-line medium"></div>';
        html += '<div class="skeleton-line short"></div>';
        html += '</div></div>';
    }
    if (contentEl) contentEl.innerHTML = html;
}

// ─── Pull-to-Refresh ───
var _ptrStartY = 0;
var _ptrActive = false;
var _ptrRefreshing = false;

function _initPullToRefresh() {
    var screenEl = document.getElementById('screen');
    if (!screenEl) return;

    screenEl.addEventListener('touchstart', function(e) {
        if (_ptrRefreshing) return;
        if (screenEl.scrollTop <= 0) {
            _ptrStartY = e.touches[0].clientY;
            _ptrActive = true;
        }
    }, { passive: true });

    screenEl.addEventListener('touchmove', function(e) {
        if (!_ptrActive || _ptrRefreshing) return;
        var dy = e.touches[0].clientY - _ptrStartY;
        var indicator = document.getElementById('ptr-indicator');
        if (dy > 30 && indicator) {
            indicator.classList.add('visible');
            indicator.textContent = dy > 80 ? '\uD83D\uDD04 Solte para atualizar' : '\u2B07\uFE0F Puxe para atualizar';
        }
    }, { passive: true });

    screenEl.addEventListener('touchend', function(e) {
        if (!_ptrActive) return;
        _ptrActive = false;
        var indicator = document.getElementById('ptr-indicator');
        if (indicator && indicator.classList.contains('visible')) {
            indicator.innerHTML = '<span class="ptr-spinner">\u2B6F</span> Atualizando...';
            _ptrRefreshing = true;
            showCharacterSelect().then(function() {
                _ptrRefreshing = false;
                if (indicator) indicator.classList.remove('visible');
            });
        }
    }, { passive: true });
}

// ─── Welcome Toast (after character select → game) ───
function _showWelcomeToast(charName) {
    if (!charName || typeof showToast !== 'function') return;
    setTimeout(function() {
        showToast('\u2728 Bem-vindo(a) de volta, ' + charName + '!', 2500);
    }, 800);
}

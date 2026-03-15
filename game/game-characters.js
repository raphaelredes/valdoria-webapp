/* ═══════════════════════════════════════════════════════════════
   GAME HUB — Character Selection Screen (Hall dos Personagens)
   Professional medieval design with census stats and character cards.
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
    console.debug('[GAME] showCharacterSelect()');
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
            showError('\u26a0\ufe0f Erro ao carregar personagens. Tente novamente.');
            return;
        }

        const data = await resp.json();
        if (data.error) {
            console.error('[GAME] characters error:', data.error);
            hideLoading();
            showError('Sess\u00e3o expirada. Feche e abra novamente.');
            return;
        }

        await hideLoadingWithDelay();
        renderCharacterSelect(data);
    } catch (e) {
        console.error('[GAME] showCharacterSelect error:', e);
        hideLoading();
        showError('\ud83c\udf10 Sem conex\u00e3o. Verifique sua internet.');
    }
}

/**
 * Render the character selection screen with professional medieval design.
 * @param {Object} data - {characters, can_create, active_char_id, census}
 */
function renderCharacterSelect(data) {
    const screenEl = document.getElementById('screen');
    const contentEl = document.getElementById('content');
    const panelEl = document.getElementById('bottom-panel');
    const bannerEl = document.getElementById('banner');

    // Hide banner, bottom panel, and immersive controls
    if (bannerEl) bannerEl.style.display = 'none';
    if (panelEl) panelEl.style.display = 'none';
    var toggleEl = document.getElementById('immersive-toggle');
    var restoreEl = document.getElementById('immersive-restore');
    if (toggleEl) toggleEl.style.display = 'none';
    if (restoreEl) restoreEl.style.display = 'none';

    screenEl.style.display = '';
    screenEl.style.paddingBottom = '24px';
    screenEl.style.overflowY = 'auto';
    screenEl.scrollTop = 0;

    const chars = data.characters || [];
    const canCreate = data.can_create;
    const census = data.census;

    let html = '<div id="ptr-indicator" class="ptr-indicator"></div>';

    // ─── Census Card ───
    if (census && census.total > 0) {
        html += '<div class="hall-census">';
        html += '<div class="hall-census-title">\ud83c\udff0 Estat\u00edsticas do Reino</div>';
        html += '<div class="hall-census-grid">';
        html += '<div class="hall-census-stat"><span class="hall-census-icon">\ud83d\udc65</span><span class="hall-census-val">' + census.total + '</span><span class="hall-census-label">Aventureiros</span></div>';
        // Top races
        if (census.top_races && census.top_races.length > 0) {
            var racesStr = census.top_races.map(function(r) { return _escChar(r.name) + ' (' + r.count + ')'; }).join(', ');
            html += '<div class="hall-census-stat wide"><span class="hall-census-icon">\ud83e\uddec</span><span class="hall-census-detail">' + racesStr + '</span></div>';
        }
        // Top classes
        if (census.top_classes && census.top_classes.length > 0) {
            var classesStr = census.top_classes.map(function(c) { return _escChar(c.name) + ' (' + c.count + ')'; }).join(', ');
            html += '<div class="hall-census-stat wide"><span class="hall-census-icon">\u2694\ufe0f</span><span class="hall-census-detail">' + classesStr + '</span></div>';
        }
        html += '</div>';
        // Highlights row
        var highlights = [];
        if (census.max_level > 0) {
            var hlName = (census.max_level_chars || [])[0] || '';
            highlights.push('\ud83c\udfc6 Nv.' + census.max_level + (hlName ? ' <span class="hall-hl-name">' + _escChar(hlName) + '</span>' : ''));
        }
        if (census.max_level_deathless > 0) {
            var dlName = (census.max_level_deathless_chars || [])[0] || '';
            highlights.push('\ud83d\udee1\ufe0f Inv\u00edcto Nv.' + census.max_level_deathless + (dlName ? ' <span class="hall-hl-name">' + _escChar(dlName) + '</span>' : ''));
        }
        if (census.max_daily_quests > 0) {
            var mqName = (census.max_daily_quest_chars || [])[0] || '';
            highlights.push('\ud83d\udcdc ' + census.max_daily_quests + ' miss\u00f5es' + (mqName ? ' <span class="hall-hl-name">' + _escChar(mqName) + '</span>' : ''));
        }
        if (highlights.length > 0) {
            html += '<div class="hall-census-highlights">' + highlights.join(' <span class="hall-sep">\u00b7</span> ') + '</div>';
        }
        html += '</div>';
    }

    // ─── Section Title ───
    var countLabel = chars.length > 0 ? ' (' + chars.length + '/5)' : '';
    html += '<div class="hall-section-title">\ud83d\udcdc Sele\u00e7\u00e3o de Personagem' + countLabel + '</div>';

    // ─── Character Cards ───
    if (chars.length === 0) {
        html += '<div class="char-select-empty">';
        html += '<div class="char-select-empty-icon">\ud83d\udcdc</div>';
        html += '<div class="char-select-empty-text">Os pergaminhos est\u00e3o em branco...<br>Sua hist\u00f3ria em Vald\u00f3ria ainda n\u00e3o come\u00e7ou.</div>';
        html += '</div>';
    } else {
        html += '<div class="char-select-list">';
        for (var i = 0; i < chars.length; i++) {
            var c = chars[i];
            var fullName = _escChar((c.name + ' ' + (c.surname || '')).trim());
            var activeClass = c.is_active ? ' char-card-active' : '';
            var activeBadge = c.is_active ? '<span class="char-card-badge">\u2b50 Ativo</span>' : '';

            // HP bar percentage
            var hpPct = c.max_hp > 0 ? Math.round((c.hp / c.max_hp) * 100) : 100;
            var hpColor = hpPct > 50 ? 'var(--v-hp, #4ade80)' : hpPct > 25 ? '#fbbf24' : '#ef4444';

            // Last played relative time
            var lastPlayed = '';
            if (c.last_activity > 0) {
                var ago = Math.floor((Date.now() / 1000) - c.last_activity);
                if (ago < 3600) lastPlayed = Math.max(1, Math.floor(ago / 60)) + 'min';
                else if (ago < 86400) lastPlayed = Math.floor(ago / 3600) + 'h';
                else lastPlayed = Math.floor(ago / 86400) + 'd';
            }

            // Stagger animation delay
            var animDelay = ' style="animation-delay:' + (i * 80) + 'ms"';

            html += '<button class="char-card' + activeClass + '"' + animDelay + ' data-char-id="' + _escChar(c.char_id) + '">';
            html += '<div class="char-card-avatar"><span class="char-card-icon">' + _escChar(c.race_icon) + '</span></div>';
            html += '<div class="char-card-info">';
            html += '<div class="char-card-name">' + fullName + ' ' + activeBadge + '</div>';
            html += '<div class="char-card-details">Nv.' + c.level + ' \u00b7 ' + _escChar(c.race) + ' ' + _escChar(c.hero_class) + '</div>';
            // Meta line: location + quest + last played
            html += '<div class="char-card-meta">';
            if (c.location) html += '<span>' + _escChar(c.location) + '</span>';
            if (c.active_quests > 0) html += '<span>\ud83d\udcdc ' + c.active_quests + '</span>';
            if (lastPlayed) html += '<span>\u23f0 ' + lastPlayed + '</span>';
            html += '</div>';
            // HP bar
            var hpCritCls = hpPct <= 25 ? ' hp-critical' : '';
            html += '<div class="char-card-hp"><div class="char-card-hp-fill' + hpCritCls + '" style="width:' + hpPct + '%;background:' + hpColor + '"></div></div>';
            html += '</div>';
            html += '<div class="char-card-arrow">\u25b8</div>';
            html += '<button class="char-card-delete" data-del-id="' + _escChar(c.char_id) + '" data-del-name="' + fullName + '" aria-label="Excluir personagem">\u2715</button>';
            html += '</button>';
        }
        html += '</div>';
    }

    // ─── Action Buttons ───
    html += '<div class="char-select-actions">';
    if (canCreate) {
        html += '<button class="btn-hero char-select-create" id="cs-create">\u2795 Iniciar Nova Jornada</button>';
    }
    html += '<div class="char-select-secondary">';
    html += '<button class="btn-action char-select-account" id="cs-account">\ud83d\udd10 Conta</button>';
    html += '<button class="btn-action char-select-community" id="cs-community">\ud83d\udcac Comunidade</button>';
    html += '</div>';
    html += '</div>';

    contentEl.innerHTML = html;
    _initPullToRefresh();

    // Bind events: character cards
    contentEl.querySelectorAll('.char-card').forEach(function(card) {
        card.addEventListener('click', function() {
            var charId = card.dataset.charId;
            if (!charId) return;
            _selectCharacter(charId);
        });
    });

    // Bind events: delete buttons with long-press ring effect
    contentEl.querySelectorAll('.char-card-delete').forEach(function(btn) {
        var pressTimer = null;
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
        });
        btn.addEventListener('touchstart', function(e) {
            e.stopPropagation();
            btn.classList.add('pressing');
            pressTimer = setTimeout(function() {
                btn.classList.remove('pressing');
                if (typeof haptic === 'function') haptic('heavy');
                var charId = btn.dataset.delId;
                var charName = btn.dataset.delName;
                if (charId && charName) _showDeleteConfirmation(charId, charName);
            }, 800);
        }, { passive: true });
        btn.addEventListener('touchend', function(e) {
            e.stopPropagation();
            btn.classList.remove('pressing');
            if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
        });
        btn.addEventListener('touchcancel', function() {
            btn.classList.remove('pressing');
            if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
        });
        // Fallback: mouse click for desktop
        btn.addEventListener('mousedown', function(e) {
            e.stopPropagation();
            e.preventDefault();
            btn.classList.add('pressing');
            pressTimer = setTimeout(function() {
                btn.classList.remove('pressing');
                var charId = btn.dataset.delId;
                var charName = btn.dataset.delName;
                if (charId && charName) _showDeleteConfirmation(charId, charName);
            }, 800);
        });
        btn.addEventListener('mouseup', function() {
            btn.classList.remove('pressing');
            if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
        });
        btn.addEventListener('mouseleave', function() {
            btn.classList.remove('pressing');
            if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
        });
    });

    // Bind events: create button
    var createBtn = document.getElementById('cs-create');
    if (createBtn) {
        createBtn.addEventListener('click', function() {
            if (typeof requestTransition === 'function') {
                requestTransition('character_creator');
            } else {
                doAction('create_new_char');
            }
        });
    }

    // Bind events: account button
    var accountBtn = document.getElementById('cs-account');
    if (accountBtn) {
        accountBtn.addEventListener('click', function() { doAction('action_account'); });
    }

    // Prefetch: if only 1 character, preload the game start
    if (chars.length === 1 && typeof _prefetchStart === 'function') {
        _prefetchStart(chars[0].char_id);
    }

    // Bind events: community button
    var communityBtn = document.getElementById('cs-community');
    if (communityBtn) {
        communityBtn.addEventListener('click', function() {
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
    console.debug('[GAME] _selectCharacter:', charId);
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
        setTimeout(function() { showCharacterSelect(); }, 2500);
    } else if (!data) {
        showError('Sem resposta do servidor. Verifique sua conex\u00e3o.');
        setTimeout(function() { showCharacterSelect(); }, 2500);
    }
    _selectingChar = false;
}


// ─── Character Deletion Confirmation Modal ───
function _showDeleteConfirmation(charId, charName) {
    var existing = document.getElementById('char-delete-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'char-delete-modal';
    modal.className = 'char-delete-modal';
    modal.innerHTML = '<div class="char-delete-card">' +
        '<div class="char-delete-icon">\u26a0\ufe0f</div>' +
        '<div class="char-delete-title">Excluir Personagem?</div>' +
        '<div class="char-delete-name">' + _escChar(charName) + '</div>' +
        '<div class="char-delete-warn">Esta a\u00e7\u00e3o \u00e9 irrevers\u00edvel.<br>O personagem ser\u00e1 permanentemente removido.</div>' +
        '<div class="char-delete-actions">' +
        '<button class="char-delete-cancel" id="del-cancel">Cancelar</button>' +
        '<button class="char-delete-confirm" id="del-confirm">Excluir</button>' +
        '</div></div>';

    document.body.appendChild(modal);
    if (typeof haptic === 'function') haptic('warning');

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
    if (typeof showToast === 'function') showToast('\ud83d\uddd1\ufe0f Excluindo ' + _escChar(charName) + '...', 2000);
    var data = await apiCall('/api/game/action', { cb: 'delete_char_' + charId });
    if (data && !data.error) {
        if (typeof showToast === 'function') showToast('\u2705 Personagem exclu\u00eddo.', 2000);
        setTimeout(function() { showCharacterSelect(); }, 500);
    } else {
        if (typeof showToast === 'function') showToast('\u26a0\ufe0f N\u00e3o foi poss\u00edvel excluir. Tente novamente.', 3000);
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
    // Hide immersive controls during loading
    var toggleEl = document.getElementById('immersive-toggle');
    var restoreEl = document.getElementById('immersive-restore');
    if (toggleEl) toggleEl.style.display = 'none';
    if (restoreEl) restoreEl.style.display = 'none';
    if (screenEl) { screenEl.style.display = ''; screenEl.scrollTop = 0; }

    var html = '<div class="hall-section-title">\ud83d\udcdc Sele\u00e7\u00e3o de Personagem</div>';
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
            indicator.textContent = dy > 80 ? '\ud83d\udd04 Solte para atualizar' : '\u2b07\ufe0f Puxe para atualizar';
        }
    }, { passive: true });

    screenEl.addEventListener('touchend', function(e) {
        if (!_ptrActive) return;
        _ptrActive = false;
        var indicator = document.getElementById('ptr-indicator');
        if (indicator && indicator.classList.contains('visible')) {
            indicator.innerHTML = '<span class="ptr-spinner">\u2b6f</span> Atualizando...';
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

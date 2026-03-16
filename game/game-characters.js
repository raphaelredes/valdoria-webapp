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
        var _ac = new AbortController();
        var _tid = setTimeout(function() { _ac.abort(); }, 10000);
        const resp = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${S.token}` },
            signal: _ac.signal,
        });
        clearTimeout(_tid);

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

        // Auto-select: if only 1 character, skip Hall and enter game directly
        var _chars = data.characters || [];
        if (_chars.length === 1 && _chars[0].is_active && typeof showLoading === 'function') {
            renderCharacterSelect(data); // render briefly for visual continuity
            // Small delay ensures all UI functions are available
            setTimeout(function() { _selectCharacter(_chars[0].char_id); }, 100);
            return;
        }

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
    screenEl.style.paddingBottom = 'max(24px, env(safe-area-inset-bottom, 24px))';
    screenEl.style.overflowY = 'auto';
    screenEl.scrollTop = 0;

    // Hide Telegram BackButton on Hall (root screen — no back target)
    try {
        if (window.Telegram && Telegram.WebApp && Telegram.WebApp.BackButton) {
            Telegram.WebApp.BackButton.hide();
        }
    } catch (e) { /* older clients */ }

    const chars = data.characters || [];
    const canCreate = data.can_create;
    const census = data.census;

    let html = '<div id="ptr-indicator" class="ptr-indicator"></div>';

    // ─── Census Card ───
    var _censusWasCollapsed = false;
    if (census && census.total > 0) {
        html += '<div class="hall-census">';
        html += '<div class="hall-census-title" id="census-toggle">\ud83c\udff0 Estat\u00edsticas do Reino <span class="hall-census-toggle">\u25bc</span></div>';
        html += '<div class="hall-census-body">';
        html += '<div class="hall-census-grid">';
        html += '<div class="hall-census-stat"><span class="hall-census-icon">\ud83d\udc65</span><span class="hall-census-val" data-count-to="' + census.total + '">0</span><span class="hall-census-label">Aventureiros</span></div>';
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
        html += '</div>'; // close hall-census-body
        html += '</div>'; // close hall-census
        // Restore collapsed state from localStorage
        try { _censusWasCollapsed = localStorage.getItem('valdoria_census_collapsed') === '1'; } catch(e) {}
    }

    // ─── Section Title ───
    var countLabel = chars.length > 0 ? ' (' + chars.length + '/5)' : '';
    html += '<div class="hall-section-title">\ud83d\udcdc Sele\u00e7\u00e3o de Personagem' + countLabel + '</div>';

    // ─── Character Cards ───
    if (chars.length === 0) {
        html += '<div class="char-select-empty">';
        html += '<div class="char-select-empty-icon">\u2694\ufe0f</div>';
        html += '<div class="char-select-empty-title">Nenhum aventureiro encontrado</div>';
        html += '<div class="char-select-empty-text">Os pergaminhos est\u00e3o em branco...<br>Crie seu primeiro personagem e comece<br>sua jornada em Vald\u00f3ria!</div>';
        html += '</div>';
    } else {
        html += '<div class="char-select-list">';
        for (var i = 0; i < chars.length; i++) {
            var c = chars[i];
            var fullName = _escChar((c.name + ' ' + (c.surname || '')).trim());
            var activeClass = c.is_active ? ' char-card-active' : '';
            var activeBadge = c.is_active ? '<span class="char-card-badge">\u2b50 Ativo</span>' : '';

            // HP + MP bar percentages
            var hpPct = c.max_hp > 0 ? Math.round((c.hp / c.max_hp) * 100) : 100;
            var hpColor = hpPct > 50 ? '#4ade80' : hpPct > 25 ? '#f97316' : '#ef4444';
            var mpPct = c.max_mp > 0 ? Math.round((c.mp / c.max_mp) * 100) : 0;
            var hasMP = c.max_mp > 0;

            // Last played relative time
            var lastPlayed = '';
            if (c.last_activity > 0) {
                var ago = Math.floor((Date.now() / 1000) - c.last_activity);
                if (ago < 3600) lastPlayed = Math.max(1, Math.floor(ago / 60)) + 'min';
                else if (ago < 86400) lastPlayed = Math.floor(ago / 3600) + 'h';
                else lastPlayed = Math.floor(ago / 86400) + 'd';
            }

            // Stagger animation delay
            var animDelay = ' style="animation-delay:' + (i * 60) + 'ms"';

            html += '<button class="char-card' + activeClass + '"' + animDelay + ' data-char-id="' + _escChar(c.char_id) + '">';
            html += '<div class="char-card-avatar"><span class="char-card-icon">' + _escChar(c.race_icon) + '</span></div>';
            html += '<div class="char-card-info">';
            html += '<div class="char-card-name">' + fullName + ' ' + activeBadge + '</div>';
            html += '<div class="char-card-details">Nv.' + c.level + ' \u00b7 ' + _escChar(c.race) + ' ' + _escChar(c.class_icon || '') + ' ' + _escChar(c.hero_class) + '</div>';
            // Meta line: location + quest + last played
            html += '<div class="char-card-meta">';
            if (c.location) html += '<span>' + _escChar(c.location) + '</span>';
            if (c.active_quests > 0) html += '<span>\ud83d\udcdc ' + c.active_quests + '</span>';
            if (c.gold > 0) html += '<span>\ud83d\udcb0 ' + c.gold + '</span>';
            if (lastPlayed) html += '<span>\u23f0 ' + lastPlayed + '</span>';
            html += '</div>';
            // HP + MP bars
            var hpCritCls = hpPct <= 25 ? ' hp-critical' : hpPct <= 50 ? ' hp-warn' : '';
            html += '<div class="char-card-bars">';
            html += '<div class="char-card-bar"><div class="char-card-bar-fill bar-hp' + hpCritCls + '" style="width:' + hpPct + '%;background:' + hpColor + '"></div></div>';
            if (hasMP) {
                html += '<div class="char-card-bar"><div class="char-card-bar-fill bar-mp" style="width:' + mpPct + '%"></div></div>';
            }
            html += '</div>';
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
    // Smooth entry animation
    screenEl.classList.add('hall-enter');
    requestAnimationFrame(function() { screenEl.classList.add('hall-enter-active'); });

    // Census collapsible toggle
    var censusToggle = document.getElementById('census-toggle');
    var censusCard = contentEl.querySelector('.hall-census');
    if (censusToggle && censusCard) {
        if (_censusWasCollapsed) censusCard.classList.add('collapsed');
        censusToggle.addEventListener('click', function() {
            censusCard.classList.toggle('collapsed');
            try {
                localStorage.setItem('valdoria_census_collapsed', censusCard.classList.contains('collapsed') ? '1' : '0');
            } catch(e) {}
        });
        censusToggle.style.cursor = 'pointer';
        censusToggle.style.userSelect = 'none';
    }

    // Count-up animation for census numbers
    contentEl.querySelectorAll('[data-count-to]').forEach(function(el) {
        var target = parseInt(el.dataset.countTo, 10);
        if (isNaN(target) || target <= 0) { el.textContent = '0'; return; }
        var duration = Math.min(800, target * 80);
        var start = performance.now();
        function _tick(now) {
            var t = Math.min((now - start) / duration, 1);
            el.textContent = Math.round(t * target);
            if (t < 1) requestAnimationFrame(_tick);
        }
        requestAnimationFrame(_tick);
    });

    _initPullToRefresh();

    // Bind events: character cards
    contentEl.querySelectorAll('.char-card').forEach(function(card) {
        card.addEventListener('click', function() {
            var charId = card.dataset.charId;
            if (!charId) return;
            _selectCharacter(charId);
        });
    });

    // Bind events: swipe-to-delete on character cards
    contentEl.querySelectorAll('.char-card').forEach(function(card) {
        var startX = 0, startY = 0, swiping = false;
        card.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            swiping = false;
        }, { passive: true });
        card.addEventListener('touchmove', function(e) {
            var dx = e.touches[0].clientX - startX;
            var dy = Math.abs(e.touches[0].clientY - startY);
            // Horizontal swipe detection (left swipe)
            if (dx < -20 && dy < 30) {
                swiping = true;
                card.classList.add('swiped');
            } else if (dx > 10 && card.classList.contains('swiped')) {
                card.classList.remove('swiped');
            }
        }, { passive: true });
        card.addEventListener('touchend', function() {
            if (!swiping) return;
            // If swiped far enough, show delete confirmation
            if (card.classList.contains('swiped')) {
                if (typeof haptic === 'function') haptic('light');
            }
        }, { passive: true });
    });

    // Bind events: delete button tap (revealed by swipe)
    contentEl.querySelectorAll('.char-card-delete').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            if (typeof haptic === 'function') haptic('heavy');
            var charId = btn.dataset.delId;
            var charName = btn.dataset.delName;
            if (charId && charName) _showDeleteConfirmation(charId, charName);
        });
    });

    // Tap anywhere on screen to un-swipe all cards
    contentEl.addEventListener('click', function(e) {
        if (!e.target.closest('.char-card-delete')) {
            contentEl.querySelectorAll('.char-card.swiped').forEach(function(c) {
                c.classList.remove('swiped');
            });
        }
    });

    // Bind events: create button (inline + Telegram MainButton)
    var createBtn = document.getElementById('cs-create');
    var _createAction = function() {
        if (typeof requestTransition === 'function') {
            requestTransition('character_creator');
        } else {
            doAction('create_new_char');
        }
    };
    if (createBtn) {
        createBtn.addEventListener('click', _createAction);
    }

    // Telegram MainButton: native sticky CTA for "Iniciar Nova Jornada"
    try {
        if (window.Telegram && Telegram.WebApp && Telegram.WebApp.MainButton && canCreate && chars.length === 0) {
            var mb = Telegram.WebApp.MainButton;
            mb.setText('\u2795 Iniciar Nova Jornada');
            mb.color = '#c4953a';
            mb.textColor = '#1a1610';
            mb.onClick(_createAction);
            mb.show();
            // Hide MainButton when leaving Hall
            S._hallMainBtn = true;
        } else if (window.Telegram && Telegram.WebApp && Telegram.WebApp.MainButton) {
            Telegram.WebApp.MainButton.hide();
            S._hallMainBtn = false;
        }
    } catch (e) { /* older clients */ }

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
    // Haptic feedback on card tap (Telegram WebApp API)
    if (typeof haptic === 'function') haptic('medium');
    // Hide Telegram MainButton when leaving Hall
    try { if (S._hallMainBtn && Telegram.WebApp.MainButton) Telegram.WebApp.MainButton.hide(); } catch(e) {}
    // Animate: selected card glows, others fade
    var listEl = document.querySelector('.char-select-list');
    var pressedCard = document.querySelector('.char-card[data-char-id="' + charId + '"]');
    if (listEl) listEl.classList.add('selecting');
    if (pressedCard) pressedCard.classList.add('char-card-selected');
    // Brief delay for visual feedback before loading overlay
    await new Promise(function(r) { setTimeout(r, 250); });
    showLoading();
    // Restore Telegram BackButton when entering game
    try {
        if (window.Telegram && Telegram.WebApp && Telegram.WebApp.BackButton) {
            Telegram.WebApp.BackButton.show();
        }
    } catch (e) { /* older clients */ }

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
        html += '<div class="skeleton-bar-row"><div class="skeleton-bar"></div><div class="skeleton-bar"></div></div>';
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

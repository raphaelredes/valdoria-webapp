/* ═══════════════════════════════════════════════════════════════
   GAME HUB — Universal Screen Renderer
   Converts server JSON screen data into DOM elements.
   Supports text (HTML), buttons (2-per-row grid), images,
   fixed bottom panel (buttons + text input + footer), and
   transition detection.
   ═══════════════════════════════════════════════════════════════ */

const LONG_BTN_THRESHOLD = 24; // chars — buttons longer get full width
const HERO_KEYWORDS = ['PARTIR', 'JOGAR', 'AVENTURA', 'CONFIRMAR', 'INICIAR'];

/**
 * Update #screen padding-bottom to match the current height of #bottom-panel.
 * Also sets --bottom-panel-h CSS variable for toast positioning.
 * Must be called after any change to bottom-panel contents.
 */
function updateBottomPadding() {
    const screenEl = document.getElementById('screen');
    const panelEl = document.getElementById('bottom-panel');
    if (!screenEl || !panelEl) return;

    requestAnimationFrame(() => {
        // Skip if panel is collapsed (immersive mode handles padding)
        if (panelEl.classList.contains('immersive-collapsed')) return;

        const h = panelEl.offsetHeight;
        screenEl.style.paddingBottom = (h + 8) + 'px';
        document.documentElement.style.setProperty('--bottom-panel-h', h + 'px');

        // Position immersive toggle above the panel
        const toggle = document.getElementById('immersive-toggle');
        if (toggle) toggle.style.bottom = h + 'px';
    });
}

/**
 * Check if the button area overflows its max-height and toggle overflow class.
 */
function checkButtonOverflow() {
    const el = document.getElementById('buttons');
    if (!el) return;
    el.classList.toggle('has-overflow', el.scrollHeight > el.clientHeight);
}

/**
 * Render a screen JSON object from the server.
 * @param {Object} screen - {text, buttons, footer, image_url, timer, transition,
 *                           toast, alert, waiting_for_text, text_placeholder}
 */
function renderScreen(screen) {
    if (!screen) { console.warn('[GAME] renderScreen() called with null/undefined screen'); return; }

    // If screen has a dice roll, show 3D animation first, then render content
    if (screen.dice_roll && !screen._diceShown) {
        _showDiceAnimation(screen);
        return;
    }

    console.log('[GAME] renderScreen() keys:', Object.keys(screen).join(','),
        'text_len:', (screen.text || '').length,
        'buttons:', (screen.buttons || []).length,
        'footer:', screen.footer ? 'yes' : 'no',
        'transition:', screen.transition ? 'yes' : 'no',
        'dialogue:', screen.dialogue ? 'yes' : 'no',
        'image:', screen.image_url ? 'yes' : 'no');

    S.currentScreen = screen;
    if (typeof cacheScreen === 'function') cacheScreen(screen);
    // Update ambient particles based on screen content
    if (typeof updateParticleTheme === 'function') updateParticleTheme(screen.text || '');

    const screenEl = document.getElementById('screen');
    const loadingEl = document.getElementById('loading');
    const panelEl = document.getElementById('bottom-panel');

    // Hide loading, show screen
    loadingEl.style.display = 'none';
    screenEl.style.display = '';

    // Reset scroll position to top
    screenEl.scrollTop = 0;

    // Banner image (filter out placeholder text-banners)
    const bannerEl = document.getElementById('banner');
    const bannerImg = document.getElementById('banner-img');
    const imgUrl = screen.image_url || '';
    const isRealImage = imgUrl && !imgUrl.includes('placehold.co');
    if (isRealImage) {
        const resolvedUrl = imgUrl.startsWith('/') ? S.apiBase + imgUrl : imgUrl;
        bannerImg.src = resolvedUrl;
        bannerImg.onerror = () => { bannerEl.style.display = 'none'; };
        bannerEl.style.display = '';
    } else {
        bannerEl.style.display = 'none';
    }

    // Text content (server sends trusted HTML, enhanced client-side)
    const contentEl = document.getElementById('content');
    if (screen.dialogue && typeof renderDialogue === 'function') {
        renderDialogue(screen);
    } else {
        if (typeof clearMoodAmbient === 'function') clearMoodAmbient();
        contentEl.innerHTML = enhanceContent(screen.text || '');
    }

    // Inject font picker on settings screen
    if (screen.screen_id === 'city.settings' && typeof injectFontPicker === 'function') {
        injectFontPicker(contentEl);
    }

    // Render structured ally cards (replaces plain text ally block)
    if (screen.allies && screen.allies.length > 0) {
        renderAllyCards(contentEl, screen.allies);
    }

    // Render inn member selection as visual toggle cards
    if (screen.inn_select) {
        renderInnSelect(contentEl, screen.inn_select);
    }

    // Render guild member detail as rich card
    if (screen.member_detail) {
        renderMemberDetail(contentEl, screen.member_detail);
    }

    // Show contextual notifications as toasts
    if (screen.notifications && screen.notifications.length > 0) {
        _showNotifications(screen.notifications);
    }

    // Buttons (rendered into #buttons inside #bottom-panel)
    const buttonsEl = document.getElementById('buttons');
    buttonsEl.innerHTML = '';
    renderButtons(buttonsEl, screen.buttons || []);

    // Text input field (bank amounts, NPC AI chat, tickets)
    renderTextInput(screen);

    // Footer rows (quick + nav)
    const hasFooter = screen.footer && (screen.footer.quick || screen.footer.nav);
    const quickEl = document.getElementById('footer-quick');
    const navEl = document.getElementById('footer-nav');

    if (hasFooter) {
        renderFooter(screen.footer);
    } else {
        if (quickEl) quickEl.style.display = 'none';
        if (navEl) navEl.style.display = 'none';
    }

    // Show bottom panel if there's ANY bottom content
    const hasButtons = (screen.buttons || []).length > 0;
    const hasTextInput = !!screen.waiting_for_text;
    if (hasButtons || hasTextInput || hasFooter) {
        panelEl.style.display = '';
    } else {
        panelEl.style.display = 'none';
    }

    // Hide error overlay if visible
    hideError();

    // Dynamic padding + overflow check
    checkButtonOverflow();
    updateBottomPadding();

    // Immersive mode eligibility
    if (typeof updateImmersiveEligibility === 'function') {
        updateImmersiveEligibility(screen);
    }
}

/**
 * Render content buttons into a container.
 * Arranges in 2-per-row grid, with long buttons getting full width.
 */
function renderButtons(container, rows) {
    for (const row of rows) {
        if (!row || !row.length) continue;

        const rowEl = document.createElement('div');
        rowEl.className = 'btn-row';

        // Determine columns
        const hasLong = row.some(b => (b.text || '').length > LONG_BTN_THRESHOLD);
        const isHeroRow = row.length === 1 && HERO_KEYWORDS.some(k => (row[0].text || '').toUpperCase().includes(k));

        if (row.length === 1 || hasLong) {
            rowEl.classList.add('cols-1');
        } else if (row.length === 2) {
            rowEl.classList.add('cols-2');
        } else {
            rowEl.classList.add('cols-3');
        }

        for (const btn of row) {
            const el = createButton(btn, isHeroRow);
            rowEl.appendChild(el);
        }

        container.appendChild(rowEl);
    }
}

/**
 * Create a single button element.
 */
function createButton(btn, forceHero = false) {
    // Transition button (opens another WebApp via transition API)
    if (btn.transition) {
        const el = document.createElement('button');
        el.className = 'btn-hero';
        el.textContent = btn.text || '';
        const target = typeof btn.transition === 'string' ? btn.transition : btn.transition.to;
        if (target) {
            el.onclick = () => requestTransition(target);
        } else {
            // Legacy fallback: screen-level transition
            el.onclick = () => {
                const screen = S.currentScreen;
                if (screen && screen.transition) handleTransition(screen.transition);
            };
        }
        return el;
    }

    // URL button (external link)
    if (btn.url) {
        const el = document.createElement('button');
        el.className = 'btn-action btn-link';
        el.textContent = btn.text || '';
        el.onclick = () => {
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.openLink(btn.url);
            } else {
                window.open(btn.url, '_blank');
            }
        };
        return el;
    }

    // Main menu button — close WebApp and return to Telegram
    if (btn.cb === 'main_menu') {
        const el = document.createElement('button');
        el.className = 'btn-action';
        el.textContent = btn.text || '';
        el.onclick = () => {
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.close();
            }
        };
        return el;
    }

    // Skip toggle_footer — Game Hub uses its own immersive toggle
    if (btn.cb === 'action_toggle_footer') {
        const el = document.createElement('button');
        el.style.display = 'none';
        return el;
    }

    // Regular callback button
    const el = document.createElement('button');
    const isHero = forceHero || HERO_KEYWORDS.some(k => (btn.text || '').toUpperCase().includes(k));
    el.className = isHero ? 'btn-hero' : 'btn-action';
    el.textContent = btn.text || '';
    if (btn.cb) {
        el.onclick = () => doAction(btn.cb);
    }
    return el;
}

/**
 * Show or hide the text input field based on server signal.
 */
function renderTextInput(screen) {
    const wrap = document.getElementById('text-input-wrap');
    const inputEl = document.getElementById('text-input');
    const sendBtn = document.getElementById('text-send');
    const maxLabel = document.getElementById('text-input-max');
    if (!wrap) return;

    if (!screen.waiting_for_text) {
        wrap.style.display = 'none';
        return;
    }

    wrap.style.display = '';
    inputEl.placeholder = screen.text_placeholder || 'Digite aqui...';
    inputEl.value = '';

    const isNumeric = screen.text_input_type === 'numeric';
    const maxVal = screen.text_max_value;

    // Configure input mode
    if (isNumeric) {
        inputEl.inputMode = 'numeric';
        inputEl.pattern = '[0-9]*';
        inputEl.oninput = () => {
            inputEl.value = inputEl.value.replace(/\D/g, '');
            if (maxVal != null && inputEl.value !== '') {
                const n = parseInt(inputEl.value, 10);
                if (n > maxVal) inputEl.value = String(maxVal);
            }
        };
    } else {
        inputEl.inputMode = '';
        inputEl.pattern = '';
        inputEl.oninput = null;
    }

    // Max value label
    if (maxLabel) {
        if (isNumeric && maxVal != null) {
            maxLabel.textContent = `M\u00e1x: ${maxVal.toLocaleString('pt-BR')} GP`;
            maxLabel.style.display = '';
        } else {
            maxLabel.textContent = '';
            maxLabel.style.display = 'none';
        }
    }

    const submitText = () => {
        const val = inputEl.value.trim();
        if (!val) return;
        if (isNumeric) {
            const n = parseInt(val, 10);
            if (isNaN(n) || n <= 0) return;
            if (maxVal != null && n > maxVal) return;
        }
        wrap.style.display = 'none';
        doText(val);
    };

    sendBtn.onclick = submitText;
    inputEl.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitText();
        }
    };

    // Focus after a short delay (mobile keyboard)
    setTimeout(() => inputEl.focus(), 150);

    // Recalculate padding after showing text input (changes panel height)
    updateBottomPadding();
}

/**
 * Render the footer rows (quick access + nav) inside #bottom-panel.
 * The entire panel is collapsible via immersive mode (toggle above panel).
 */
function renderFooter(footer) {
    const quickEl = document.getElementById('footer-quick');
    const navEl = document.getElementById('footer-nav');

    quickEl.innerHTML = '';
    navEl.innerHTML = '';

    const setupButton = (btn, container) => {
        // Skip the toggle button — collapsing is handled by immersive mode
        if (btn.cb === 'action_toggle_footer') return;

        const el = document.createElement('button');
        el.className = 'btn-action';
        el.textContent = btn.text || '';

        if (btn.cb === 'main_menu') {
            el.onclick = () => {
                if (window.Telegram && Telegram.WebApp) {
                    Telegram.WebApp.close();
                }
            };
        } else if (btn.cb) {
            el.onclick = () => doAction(btn.cb);
        } else if (btn.url) {
            const isWebAppUrl = btn.url && (
                btn.url.includes('/inventory/') || btn.url.includes('/market/') ||
                btn.url.includes('/levelup/') || btn.url.includes('/combat/') || btn.url.includes('/arena/') ||
                btn.url.includes('/explore/') || btn.url.includes('/navigate/') ||
                btn.url.includes('/dice/') || btn.url.includes('/workstation/') ||
                btn.url.includes('/pix/')
            );
            if (isWebAppUrl) {
                el.onclick = () => {
                    if (typeof _detect_webapp_target_js === 'function') {
                        const to = _detect_webapp_target_js(btn.url);
                        handleTransition({ to, url: btn.url });
                    } else {
                        handleTransition({ to: 'unknown', url: btn.url });
                    }
                };
            } else {
                el.onclick = () => {
                    if (window.Telegram && Telegram.WebApp) Telegram.WebApp.openLink(btn.url);
                    else window.open(btn.url, '_blank');
                };
            }
        } else if (btn.transition) {
            const transData = btn.transition_data || null;
            if (transData && transData.url) {
                el.onclick = () => handleTransition(transData);
            } else {
                const target = typeof btn.transition === 'string' ? btn.transition : null;
                if (target) {
                    el.onclick = () => requestTransition(target);
                } else {
                    el.onclick = () => {
                        const screen = S.currentScreen;
                        if (screen && screen.transition) handleTransition(screen.transition);
                    };
                }
            }
        }

        container.appendChild(el);
    };

    // Quick row (always visible when panel is expanded — immersive handles collapse)
    if (footer.quick && footer.quick.length) {
        quickEl.style.display = '';
        for (const btn of footer.quick) setupButton(btn, quickEl);
    } else {
        quickEl.style.display = 'none';
    }

    // Nav row (always visible when panel is expanded)
    if (footer.nav && footer.nav.length) {
        navEl.style.display = '';
        for (const btn of footer.nav) setupButton(btn, navEl);
    } else {
        navEl.style.display = 'none';
    }
}

// ─── Dice Roll 3D Animation ───
let _diceInstance = null;

function _getDice() {
    if (_diceInstance) return _diceInstance;
    const container = document.getElementById('dice3d-canvas');
    if (!container || typeof DiceRoller3D === 'undefined') return null;
    try {
        _diceInstance = new DiceRoller3D(container);
        return _diceInstance;
    } catch (e) {
        console.error('[GAME] Dice3D init error:', e);
        return null;
    }
}

function _showDiceAnimation(screen) {
    const dr = screen.dice_roll;
    const overlay = document.getElementById('dice-overlay');
    const labelEl = document.getElementById('dice-skill-label');
    const formulaEl = document.getElementById('dice-formula');
    const resultEl = document.getElementById('dice-result');
    const skipBtn = document.getElementById('dice-skip-btn');

    if (!overlay) {
        screen._diceShown = true;
        renderScreen(screen);
        return;
    }

    // Hide loading
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'none';

    // Setup overlay
    labelEl.textContent = dr.skill + (dr.stat ? ' (' + dr.stat + ')' : '');
    formulaEl.textContent = '';
    resultEl.textContent = '';
    resultEl.className = 'dice-result';
    skipBtn.style.display = 'none';
    overlay.style.display = '';

    let _done = false;

    const finish = () => {
        if (_done) return;
        _done = true;
        skipBtn.onclick = null;
        skipBtn.style.display = 'none';
        overlay.style.display = 'none';
        screen._diceShown = true;
        renderScreen(screen);
    };

    const showResult = () => {
        // Show formula: d20(roll) +mod = total vs DC dc
        const sign = dr.mod >= 0 ? '+' : '';
        formulaEl.textContent = 'd20(' + dr.roll + ') ' + sign + dr.mod + ' = ' + dr.total + ' vs DC ' + dr.dc;

        resultEl.textContent = dr.success ? 'Sucesso!' : 'Falha!';
        resultEl.className = 'dice-result ' + (dr.success ? 'success' : 'failure');

        // Haptic feedback
        try {
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.HapticFeedback.notificationOccurred(dr.success ? 'success' : 'error');
            }
        } catch (e) { /* */ }

        // Show skip after 500ms, auto-advance after 2500ms
        setTimeout(() => {
            if (!_done) {
                skipBtn.style.display = '';
                skipBtn.onclick = finish;
            }
        }, 500);
        setTimeout(finish, 2500);
    };

    // Try 3D dice
    const dice = _getDice();
    if (dice) {
        try {
            dice.roll(dr.roll, showResult);
        } catch (e) {
            console.error('[GAME] Dice3D roll error:', e);
            showResult();
        }
    } else {
        // Fallback: show result after brief delay
        setTimeout(showResult, 800);
    }
}


// ─── Ally Cards (rich party display) ───

function renderAllyCards(container, allies) {
    // Remove plain-text ally block (GRUPO section) if present
    const textContent = container.innerHTML;
    const grupoIdx = textContent.indexOf('━ GRUPO ━');
    if (grupoIdx >= 0) {
        container.innerHTML = textContent.replace(/━ GRUPO ━[\s\S]*$/, '');
    }

    const wrap = document.createElement('div');
    wrap.className = 'ally-cards';

    const header = document.createElement('div');
    header.className = 'ally-header';
    header.textContent = '━ GRUPO ━';
    wrap.appendChild(header);

    for (const a of allies) {
        const card = document.createElement('div');
        card.className = 'ally-card' + (a.dead ? ' ally-dead' : '');

        // Left: icon
        const ico = document.createElement('div');
        ico.className = 'ally-ico';
        ico.textContent = a.ico || '⚔️';
        card.appendChild(ico);

        // Center: info
        const info = document.createElement('div');
        info.className = 'ally-info';

        // Name row: name + level + duration/level-up badges
        const nameRow = document.createElement('div');
        nameRow.className = 'ally-name-row';
        const nameEl = document.createElement('span');
        nameEl.className = 'ally-name';
        nameEl.textContent = a.n;
        nameRow.appendChild(nameEl);
        if (a.l > 0) {
            const lvl = document.createElement('span');
            lvl.className = 'ally-lvl';
            lvl.textContent = 'Lv' + a.l;
            nameRow.appendChild(lvl);
        }
        if (a.type === 'merc' && a.dur > 0) {
            const dur = document.createElement('span');
            dur.className = 'ally-dur' + (a.dur <= 2 ? ' ally-dur-warn' : '');
            dur.textContent = '📜' + a.dur;
            nameRow.appendChild(dur);
        }
        if (a.lu && a.lu > 0) {
            const luBadge = document.createElement('span');
            luBadge.className = 'ally-lu';
            luBadge.textContent = '⬆️';
            nameRow.appendChild(luBadge);
        }
        info.appendChild(nameRow);

        // HP bar
        if (a.mhp > 0 && !a.dead) {
            info.appendChild(_makeAllyBar(a.hp, a.mhp, 'hp'));
        } else if (a.dead) {
            const deadLabel = document.createElement('div');
            deadLabel.className = 'ally-dead-label';
            deadLabel.textContent = '💀 Caído';
            info.appendChild(deadLabel);
        }

        // MP bar
        if (a.mmp > 0 && !a.dead) {
            info.appendChild(_makeAllyBar(a.mp, a.mmp, 'mp'));
        }

        // Adventurer description
        if (a.type === 'adv' && a.desc) {
            const descEl = document.createElement('div');
            descEl.className = 'ally-desc';
            descEl.textContent = '✨ ' + a.desc + (a.dur > 0 ? ' ⏳ ' + a.dur + ' combates' : '');
            info.appendChild(descEl);
        }

        // Status effects
        if (a.se && a.se.length > 0) {
            const seRow = document.createElement('div');
            seRow.className = 'ally-se';
            seRow.textContent = a.se.join(' ');
            info.appendChild(seRow);
        }

        card.appendChild(info);
        wrap.appendChild(card);
    }

    container.appendChild(wrap);
}

function _makeAllyBar(current, max, type) {
    const row = document.createElement('div');
    row.className = 'ally-bar-row';

    const track = document.createElement('div');
    track.className = 'ally-bar-track';

    const fill = document.createElement('div');
    const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
    fill.className = 'ally-bar-fill ally-bar-' + type;
    fill.style.width = pct + '%';
    if (type === 'hp') {
        if (pct <= 25) fill.classList.add('ally-bar-critical');
        else if (pct <= 50) fill.classList.add('ally-bar-low');
    }
    track.appendChild(fill);
    row.appendChild(track);

    const label = document.createElement('span');
    label.className = 'ally-bar-label';
    label.textContent = current + '/' + max;
    row.appendChild(label);

    return row;
}

// ─── Contextual Notifications ───

function _showNotifications(notifs) {
    notifs.forEach((n, i) => {
        setTimeout(() => {
            if (typeof showToast === 'function') {
                showToast(n.text, n.type === 'warn' ? 4000 : 3000);
            }
        }, i * 600);
    });
}


// --- Inn Member Selection (visual toggle cards) ---

function renderInnSelect(container, data) {
    // Remove instruction text
    var textContent = container.innerHTML;
    var selectIdx = textContent.indexOf('Toque nos companheiros');
    if (selectIdx >= 0) {
        container.innerHTML = textContent.substring(0, selectIdx);
    }

    var wrap = document.createElement('div');
    wrap.className = 'inn-select-cards';

    for (var i = 0; i < data.allies.length; i++) {
        var a = data.allies[i];
        var card = document.createElement('div');
        card.className = 'inn-select-card' + (a.sel ? ' inn-selected' : '') + (a.full ? ' inn-full' : '');

        (function(cb) {
            card.onclick = function() { if (cb) doAction(cb); };
        })(a.cb);

        var hpPct = a.mhp > 0 ? Math.round((a.hp / a.mhp) * 100) : 0;
        var hpCls = hpPct > 75 ? 'ally-bar-hp' : hpPct > 40 ? 'ally-bar-hp ally-bar-low' : 'ally-bar-hp ally-bar-critical';

        var barsHtml = '';
        if (!a.full) {
            barsHtml += '<div class="ally-bar-row"><div class="ally-bar-track"><div class="ally-bar-fill ' + hpCls + '" style="width:' + hpPct + '%"></div></div><span class="ally-bar-label">' + a.hp + '/' + a.mhp + '</span></div>';
            if (a.mmp > 0) {
                var mpPct = a.mmp > 0 ? Math.round((a.mp / a.mmp) * 100) : 0;
                barsHtml += '<div class="ally-bar-row"><div class="ally-bar-track"><div class="ally-bar-fill ally-bar-mp" style="width:' + mpPct + '%"></div></div><span class="ally-bar-label">' + a.mp + '/' + a.mmp + '</span></div>';
            }
        }

        var checkIcon = a.sel ? '✅' : '⬜';
        var fullBadge = a.full ? ' <span class="inn-full-badge">✨ Completo</span>' : '';

        card.innerHTML = '<div class="inn-select-check">' + checkIcon + '</div>'
            + '<div class="inn-select-ico">' + a.ico + '</div>'
            + '<div class="inn-select-info">'
            + '<div class="inn-select-name">' + a.n + fullBadge + '</div>'
            + barsHtml
            + '</div>';

        wrap.appendChild(card);
    }

    container.appendChild(wrap);
}


// --- Guild Member Detail (rich stat card) ---

function renderMemberDetail(container, m) {
    var wrap = document.createElement('div');
    wrap.className = 'member-detail-card';

    // HP bar
    var hpPct = m.mhp > 0 ? Math.round((m.hp / m.mhp) * 100) : 0;
    var hpCls = hpPct > 75 ? 'ally-bar-hp' : hpPct > 40 ? 'ally-bar-hp ally-bar-low' : 'ally-bar-hp ally-bar-critical';
    var bars = '<div class="ally-bar-row"><span class="member-bar-icon">❤️</span><div class="ally-bar-track"><div class="ally-bar-fill ' + hpCls + '" style="width:' + hpPct + '%"></div></div><span class="ally-bar-label">' + m.hp + '/' + m.mhp + '</span></div>';

    // MP bar
    if (m.mmp > 0) {
        var mpPct = m.mmp > 0 ? Math.round((m.mp / m.mmp) * 100) : 0;
        bars += '<div class="ally-bar-row"><span class="member-bar-icon">' + (m.res || '💧') + '</span><div class="ally-bar-track"><div class="ally-bar-fill ally-bar-mp" style="width:' + mpPct + '%"></div></div><span class="ally-bar-label">' + m.mp + '/' + m.mmp + '</span></div>';
    }

    // XP bar
    if (m.xpn > 0) {
        var xpPct = m.xpn > 0 ? Math.round((m.xp / m.xpn) * 100) : 0;
        bars += '<div class="ally-bar-row"><span class="member-bar-icon">✨</span><div class="ally-bar-track"><div class="ally-bar-fill ally-bar-xp" style="width:' + xpPct + '%"></div></div><span class="ally-bar-label">' + m.xp + '/' + m.xpn + '</span></div>';
    }

    // Stats grid
    var stats = m.stats || {};
    var statsNames = [['FOR', 'strength'], ['DES', 'dexterity'], ['CON', 'constitution'], ['INT', 'intelligence'], ['SAB', 'wisdom'], ['CAR', 'charisma']];
    var statsHtml = '<div class="member-stats-grid">';
    for (var i = 0; i < statsNames.length; i++) {
        var label = statsNames[i][0];
        var key = statsNames[i][1];
        var val = stats[key] || 10;
        var mod = Math.floor((val - 10) / 2);
        var modStr = mod >= 0 ? '+' + mod : '' + mod;
        statsHtml += '<div class="member-stat"><span class="member-stat-label">' + label + '</span><span class="member-stat-val">' + val + '</span><span class="member-stat-mod">(' + modStr + ')</span></div>';
    }
    statsHtml += '</div>';

    wrap.innerHTML = bars + statsHtml;
    container.appendChild(wrap);
}

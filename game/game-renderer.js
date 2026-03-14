/** Escape HTML entities to prevent XSS in user-controlled strings. */
function _escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

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

    // Ambient music: play track based on screen context
    if (typeof ValdoriaAudio !== 'undefined') {
        _updateAmbientMusic(screen.screen_id || '');
    }

    S.currentScreen = screen;
    if (typeof cacheScreen === 'function') cacheScreen(screen);

    // Apply day/night ambient tint based on server time
    _applyTimeTint(screen);

    // Update ambient particles based on screen content
    if (typeof updateParticleTheme === 'function') updateParticleTheme(screen.text || '');

    const screenEl = document.getElementById('screen');
    const loadingEl = document.getElementById('loading');
    const panelEl = document.getElementById('bottom-panel');

    // Hide loading with narrative minimum delay, show screen
    if (loadingEl && loadingEl.style.display !== 'none') {
        const elapsed = Date.now() - (_loadingStartTime || 0);
        const remaining = (typeof MIN_LOADING_MS !== 'undefined' ? MIN_LOADING_MS : 2500) - elapsed;
        if (remaining > 0) {
            // Delay hide — screen renders underneath (loading has z-index 1000)
            setTimeout(() => {
                if (typeof hideLoading === 'function') { hideLoading(); } else { loadingEl.style.display = 'none'; }
            }, remaining);
        } else {
            if (typeof hideLoading === 'function') { hideLoading(); } else { loadingEl.style.display = 'none'; }
        }
    }
    screenEl.style.display = '';

    // Reset scroll position to top
    screenEl.scrollTop = 0;

    // Clean up orphan resource floaters from previous screen
    document.querySelectorAll('.resource-floater').forEach(function(el) { el.remove(); });

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

    // Animate resource deltas (gold, XP changes between screens)
    _animateResourceDeltas(contentEl);
    // Animate HP/MP bar deltas (ghost bar on damage, shine on heal)
    _animateBarDeltas(contentEl);

    // Inject font picker and audio settings on settings screen
    if (screen.screen_id === 'city.settings') {
        if (typeof injectFontPicker === 'function') injectFontPicker(contentEl);
        if (typeof injectAudioSettings === 'function') injectAudioSettings(contentEl);
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

    // Render quest diary as rich cards (replaces plain text quest list)
    if (screen.quest_diary) {
        renderQuestDiary(contentEl, screen.quest_diary);
    }

    // Render quest detail as rich card (replaces plain text detail)
    if (screen.quest_detail) {
        renderQuestDetail(contentEl, screen.quest_detail);
    }

    // Render quest turn-in reward screen
    if (screen.quest_turnin) {
        renderQuestTurnin(contentEl, screen.quest_turnin);
    }

    // Render quest abandon confirmation
    if (screen.quest_abandon) {
        renderQuestAbandon(contentEl, screen.quest_abandon);
    }

    // Render quest mini-tracker on hub screens
    if (screen.quest_tracker) {
        renderQuestTracker(contentEl, screen.quest_tracker);
    }

    // Show contextual notifications as toasts
    if (screen.notifications && screen.notifications.length > 0) {
        _showNotifications(screen.notifications);
    }

    // Feedback popup (rare ~4% on city screens) — all phases are client-side
    if (screen.feedback_popup && !_fbActive) {
        setTimeout(() => _showFeedbackOverlay(screen.feedback_popup), 800);
    }

    // Nav position setting
    const navAtTop = screen.nav_position === 'top';

    // Toggle CSS class on screen element for conditional styling
    screenEl.classList.toggle('nav-at-top', navAtTop);

    // Buttons — when navAtTop, separate Voltar from action buttons
    if (navAtTop) {
        const allRows = screen.buttons || [];
        // Separate: action rows vs Voltar row (marked with is_back by serializer)
        const actionRows = [];
        let voltarRow = null;
        for (const row of allRows) {
            if (!voltarRow && row.length === 1 && row[0].is_back) {
                voltarRow = row;
            } else {
                actionRows.push(row);
            }
        }
        // Render action buttons AFTER the header (title stays above buttons)
        if (actionRows.length > 0) {
            const wrap = document.createElement('div');
            wrap.className = 'buttons-top';
            renderButtons(wrap, actionRows);
            // Insert after the location header so title stays on top
            const header = contentEl.querySelector('.v-location-header');
            if (header && header.nextSibling) {
                contentEl.insertBefore(wrap, header.nextSibling);
            } else if (header) {
                contentEl.appendChild(wrap);
            } else {
                // No header found — fallback to top
                const firstChild = contentEl.firstChild;
                if (firstChild) {
                    contentEl.insertBefore(wrap, firstChild);
                } else {
                    contentEl.appendChild(wrap);
                }
            }
        }
        // Render Voltar at the END of content (after text, allies, tracker)
        if (voltarRow) {
            renderButtons(contentEl, [voltarRow]);
        }
    } else {
        // Default: action buttons after text content
        renderButtons(contentEl, screen.buttons || []);
    }

    // Text input field (bank amounts, NPC AI chat, tickets)
    renderTextInput(screen);

    // Footer rows (quick + nav) — ALWAYS in fixed bottom panel
    const hasFooter = screen.footer && (screen.footer.quick || screen.footer.nav);
    const quickEl = document.getElementById('footer-quick');
    const navEl = document.getElementById('footer-nav');

    if (hasFooter) {
        renderFooter(screen.footer);
    } else {
        if (quickEl) quickEl.style.display = 'none';
        if (navEl) navEl.style.display = 'none';
    }

    // Show bottom panel for text input or footer
    const hasTextInput = !!screen.waiting_for_text;
    if (hasTextInput || hasFooter) {
        panelEl.style.display = '';
    } else {
        panelEl.style.display = 'none';
    }


    // Hide error overlay if visible
    hideError();

    // Dynamic padding for footer
    updateBottomPadding();

    // Immersive mode eligibility
    if (typeof updateImmersiveEligibility === 'function') {
        updateImmersiveEligibility(screen);
    }
    if (typeof showImmersiveTooltip === 'function') showImmersiveTooltip();
    if (typeof showSwipeBackHint === 'function') showSwipeBackHint();
    if (typeof _focusFirstAction === 'function') _focusFirstAction();
    if (typeof _trackRender === 'function') _trackRender();
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

    // Main menu button — show character selection screen
    if (btn.cb === 'main_menu') {
        const el = document.createElement('button');
        el.className = 'btn-action';
        el.textContent = btn.text || '';
        el.onclick = () => {
            if (typeof showCharacterSelect === 'function') showCharacterSelect();
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
    const isBack = /^(action_universal_back|city_back)$/.test(btn.cb || '');
    el.className = isHero ? 'btn-hero' : (isBack ? 'btn-action btn-back' : 'btn-action');
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
    if (!quickEl || !navEl) return;

    // Merge all footer buttons into a single compact row
    quickEl.innerHTML = '';
    navEl.style.display = 'none';

    const allBtns = [];
    // Quick row first (Mochila, Ficha, Grupo)
    if (footer.quick && footer.quick.length) {
        for (const btn of footer.quick) {
            if (btn.cb === 'action_toggle_footer') continue;
            allBtns.push(btn);
        }
    }
    // Nav row second (help, settings, social — Voltar already extracted to content)
    if (footer.nav && footer.nav.length) {
        for (const btn of footer.nav) {
            if (btn.cb === 'action_toggle_footer') continue;
            allBtns.push(btn);
        }
    }

    if (allBtns.length === 0) {
        quickEl.style.display = 'none';
        return;
    }

    quickEl.style.display = '';

    for (const btn of allBtns) {
        const el = document.createElement('button');
        el.className = 'btn-action footer-btn';
        el.textContent = btn.text || '';

        if (btn.cb === 'main_menu') {
            el.onclick = () => { if (typeof showCharacterSelect === 'function') showCharacterSelect(); };
        } else if (btn.cb) {
            el.onclick = () => doAction(btn.cb);
        } else if (btn.url) {
            const target = typeof _detect_webapp_target_js === 'function'
                ? _detect_webapp_target_js(btn.url) : 'unknown';
            if (target !== 'unknown') {
                el.onclick = () => handleTransition({ to: target, url: btn.url });
            } else {
                el.onclick = () => {
                    if (window.Telegram && Telegram.WebApp) Telegram.WebApp.openLink(btn.url);
                    else window.open(btn.url, '_blank');
                };
            }
        } else if (btn.transition) {
            const transData = btn.transition_data || null;
            if (transData && typeof transData === 'object' && transData.url) {
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
        } else {
            el.disabled = true;
            el.style.opacity = '0.4';
        }

        quickEl.appendChild(el);
    }
}

// ─── Dice Roll 3D Animation ───
let _diceInstance = null;

function _getDice() {
    if (_diceInstance) return _diceInstance;
    const container = document.getElementById('dice3d-canvas');
    if (!container || typeof Dice3D === 'undefined') return null;
    try {
        _diceInstance = new Dice3D(container);
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
    const opposedBlock = document.getElementById('dice-opposed-block');
    const playerEl = document.getElementById('dice-formula-player');
    const opponentEl = document.getElementById('dice-formula-opponent');
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

    // Reset overlay state
    labelEl.textContent = dr.skill + (dr.stat ? ' (' + dr.stat + ')' : '');
    formulaEl.textContent = '';
    formulaEl.style.display = 'none';
    if (opposedBlock) opposedBlock.style.display = 'none';
    resultEl.textContent = '';
    resultEl.className = 'dice-result';
    skipBtn.classList.remove('visible');
    skipBtn.onclick = null;
    overlay.className = 'dice-overlay entering';
    overlay.style.display = '';

    let _done = false;

    const finish = () => {
        if (_done) return;
        _done = true;
        skipBtn.classList.remove('visible');
        skipBtn.onclick = null;
        // Fade-out animation
        overlay.className = 'dice-overlay exiting';
        const onEnd = () => {
            overlay.removeEventListener('animationend', onEnd);
            overlay.style.display = 'none';
            overlay.className = 'dice-overlay';
            screen._diceShown = true;
            renderScreen(screen);
        };
        overlay.addEventListener('animationend', onEnd, { once: true });
    };

    const showResult = () => {
        const sign = dr.mod >= 0 ? '+' : '';

        if (dr.type === 'opposed' && opposedBlock) {
            // Two-line layout for opposed rolls
            formulaEl.style.display = 'none';
            opposedBlock.style.display = '';
            playerEl.innerHTML = '\ud83c\udfb2 <b>' + dr.total + '</b> \u2039d20(' + dr.roll + ') ' + sign + dr.mod + '\u203a';
            opponentEl.innerHTML = '\ud83d\udc7a ' + _escHtml(dr.opponent_name || 'Oponente') + ': <b>' + dr.opponent_total + '</b>';
            resultEl.textContent = dr.success ? 'Vit\u00f3ria!' : 'Derrota!';
            resultEl.className = 'dice-result ' + (dr.success ? 'success' : 'failure');
        } else if (dr.type === 'generic') {
            // Generic roll (healing, hit dice) — no DC, no pass/fail
            formulaEl.style.display = '';
            var fStr = dr.formula || ('d20' + sign + dr.mod);
            formulaEl.textContent = fStr + ' = ' + dr.total;
            resultEl.textContent = '';
            resultEl.className = 'dice-result success';
        } else {
            // Skill check: d20(roll) +mod = total vs DC dc
            formulaEl.style.display = '';
            formulaEl.textContent = 'd20(' + dr.roll + ') ' + sign + dr.mod + ' = ' + dr.total + ' vs DC ' + dr.dc;
            resultEl.textContent = dr.success ? 'Sucesso!' : 'Falha!';
            resultEl.className = 'dice-result ' + (dr.success ? 'success' : 'failure');
        }

        // Haptic feedback
        if (window.vHaptic) vHaptic.notify(dr.success ? 'success' : 'error');

        // Show skip pill after 500ms, auto-advance after calculated reading time
        var resultText = (formulaEl ? formulaEl.textContent : '') + ' ' + (resultEl ? resultEl.textContent : '');
        var readDur = (typeof calcReadTime === 'function')
            ? calcReadTime(resultText, 'overlay')
            : 2500;
        setTimeout(() => {
            if (!_done) {
                skipBtn.classList.add('visible');
                skipBtn.onclick = finish;
            }
        }, 500);
        setTimeout(finish, readDur);
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

    // Solo player (only 1 entry of type 'player'): skip GRUPO header to save space
    const isSolo = allies.length === 1 && allies[0].type === 'player';
    if (!isSolo) {
        const header = document.createElement('div');
        header.className = 'ally-header';
        header.textContent = '━ GRUPO ━';
        wrap.appendChild(header);
    }

    for (const a of allies) {
        const card = document.createElement('div');
        card.className = 'ally-card' + (a.dead ? ' ally-dead' : '') + (a.type === 'player' ? ' ally-player' : '');

        // Left: icon column
        const icoCol = document.createElement('div');
        icoCol.className = 'ally-ico-col';
        const ico = document.createElement('div');
        ico.className = 'ally-ico';
        ico.textContent = a.ico || '⚔️';
        icoCol.appendChild(ico);
        card.appendChild(icoCol);

        // Center: info
        const info = document.createElement('div');
        info.className = 'ally-info';

        // Name row: name + level + badges
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
            dur.textContent = '📜 ' + a.dur;
            nameRow.appendChild(dur);
        }
        if (a.lu && a.lu > 0) {
            const luBadge = document.createElement('span');
            luBadge.className = 'ally-lu';
            luBadge.textContent = '⬆️';
            nameRow.appendChild(luBadge);
        }
        info.appendChild(nameRow);

        // Class + type subtitle
        const subRow = document.createElement('div');
        subRow.className = 'ally-sub';
        let subText = a.c || '';
        if (a.type === 'player') {} // No subtitle suffix for player
        else if (a.type === 'merc') subText += ' · Mercenário';
        else if (a.type === 'adv') subText += ' · Explorador';
        else if (a.type === 'familiar') subText = 'Familiar';
        subRow.textContent = subText;
        info.appendChild(subRow);

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

        // Affinity indicator (party members only)
        if (a.type === 'party' && a.aff > 0 && !a.dead) {
            const affRow = document.createElement('div');
            affRow.className = 'ally-aff';
            const hearts = a.aff >= 5 ? '💚💚💚' : a.aff >= 3 ? '💚💚' : '💚';
            affRow.textContent = hearts;
            info.appendChild(affRow);
        }

        // Adventurer description
        if (a.type === 'adv' && a.desc) {
            const descEl = document.createElement('div');
            descEl.className = 'ally-desc';
            descEl.textContent = '✨ ' + a.desc + (a.dur > 0 ? ' · ⏳ ' + a.dur : '');
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
                const cat = n.type === 'warn' ? 'toast-warn' : 'toast';
                const dur = (typeof calcReadTime === 'function') ? calcReadTime(n.text, cat) : (n.type === 'warn' ? 4000 : 3000);
                showToast(n.text, dur);
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
            + '<div class="inn-select-ico">' + _escHtml(a.ico) + '</div>'
            + '<div class="inn-select-info">'
            + '<div class="inn-select-name">' + _escHtml(a.n) + fullBadge + '</div>'
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

    // ── Bars section ──
    var barsHtml = '<div class="member-bars">';

    // HP bar
    var hpPct = m.mhp > 0 ? Math.round((m.hp / m.mhp) * 100) : 0;
    var hpCls = hpPct > 75 ? 'ally-bar-hp' : hpPct > 40 ? 'ally-bar-hp ally-bar-low' : 'ally-bar-hp ally-bar-critical';
    barsHtml += '<div class="ally-bar-row"><span class="member-bar-icon">❤️</span><div class="ally-bar-track"><div class="ally-bar-fill ' + hpCls + '" style="width:' + hpPct + '%"></div></div><span class="ally-bar-label">' + m.hp + '/' + m.mhp + '</span></div>';

    // MP bar
    if (m.mmp > 0) {
        var mpPct = m.mmp > 0 ? Math.round((m.mp / m.mmp) * 100) : 0;
        barsHtml += '<div class="ally-bar-row"><span class="member-bar-icon">' + (m.res || '💧') + '</span><div class="ally-bar-track"><div class="ally-bar-fill ally-bar-mp" style="width:' + mpPct + '%"></div></div><span class="ally-bar-label">' + m.mp + '/' + m.mmp + '</span></div>';
    }

    // XP bar
    if (m.xpn > 0) {
        var xpPct = m.xpn > 0 ? Math.round((m.xp / m.xpn) * 100) : 0;
        barsHtml += '<div class="ally-bar-row"><span class="member-bar-icon">✨</span><div class="ally-bar-track"><div class="ally-bar-fill ally-bar-xp" style="width:' + xpPct + '%"></div></div><span class="ally-bar-label">' + m.xp + '/' + m.xpn + '</span></div>';
    }
    barsHtml += '</div>';

    // ── Stats grid (compact 3x2) ──
    var stats = m.stats || {};
    var statsIcons = {strength:'💪', dexterity:'⚡', constitution:'🧱', intelligence:'🧠', wisdom:'🦉', charisma:'🎭'};
    var statsNames = [['FOR', 'strength'], ['DES', 'dexterity'], ['CON', 'constitution'], ['INT', 'intelligence'], ['SAB', 'wisdom'], ['CAR', 'charisma']];
    var statsHtml = '<div class="member-stats-grid">';
    for (var i = 0; i < statsNames.length; i++) {
        var label = statsNames[i][0];
        var key = statsNames[i][1];
        var val = stats[key] || 10;
        var mod = Math.floor((val - 10) / 2);
        var modStr = mod >= 0 ? '+' + mod : '' + mod;
        var icon = statsIcons[key] || '';
        statsHtml += '<div class="member-stat"><span class="member-stat-ico">' + icon + '</span><span class="member-stat-label">' + label + '</span><span class="member-stat-val">' + val + '</span><span class="member-stat-mod">' + modStr + '</span></div>';
    }
    statsHtml += '</div>';

    // ── Spells/abilities section ──
    var spellsHtml = '';
    if (m.spells && m.spells.length > 0) {
        var casterClasses = ['Mago', 'Clérigo', 'Druida', 'Feiticeiro', 'Bruxo', 'Bardo'];
        var spellTitle = casterClasses.indexOf(m.c) >= 0 ? '📜 Magias' : '⚔️ Habilidades';
        spellsHtml = '<div class="member-spells"><div class="member-spells-title">' + spellTitle + '</div>';
        spellsHtml += '<div class="member-spells-list">';
        for (var j = 0; j < m.spells.length; j++) {
            spellsHtml += '<span class="member-spell-tag">' + _escHtml(m.spells[j]) + '</span>';
        }
        spellsHtml += '</div></div>';
    }

    // ── Affinity section ──
    var affHtml = '';
    if (m.aff !== undefined) {
        var affLevel = m.aff >= 5 ? 'Leal' : m.aff >= 3 ? 'Confiança' : m.aff >= 1 ? 'Conhecido' : 'Novo';
        var affColor = m.aff >= 5 ? '#4ade80' : m.aff >= 3 ? '#60a5fa' : m.aff >= 1 ? '#fbbf24' : 'var(--v-text-dim)';
        var dots = '';
        for (var d = 0; d < 5; d++) {
            dots += '<span class="aff-dot' + (d < m.aff ? ' aff-dot-filled' : '') + '"></span>';
        }
        affHtml = '<div class="member-aff"><span class="member-aff-label">💚 Afinidade</span><span class="member-aff-dots">' + dots + '</span><span class="member-aff-tier" style="color:' + affColor + '">' + affLevel + '</span></div>';
    }

    // ── Equipment summary ──
    var equipHtml = '';
    if (m.equip && m.equip.length > 0) {
        equipHtml = '<div class="member-equip"><span class="member-equip-label">🛡️ ' + m.equip.length + ' equipado' + (m.equip.length > 1 ? 's' : '') + '</span></div>';
    }

    // ── Lore ──
    var loreHtml = '';
    if (m.lore) {
        loreHtml = '<div class="member-lore">' + _escHtml(m.lore) + '</div>';
    }

    wrap.innerHTML = barsHtml + statsHtml + spellsHtml + affHtml + equipHtml + loreHtml;
    container.appendChild(wrap);
}

// ═══════════════════════════════════════════════════════════════
//  RESOURCE DELTA ANIMATIONS (floating +Gold, +XP badges)
// ═══════════════════════════════════════════════════════════════

var _prevResources = {};

function _animateResourceDeltas(contentEl) {
    var badges = contentEl.querySelectorAll('.v-resource-badge');
    if (!badges.length) return;

    var cur = {};
    badges.forEach(function(b) {
        var text = b.textContent.trim();
        // Match patterns like "🪙 1250" or "✨ 450 XP" or "💎 3"
        var m = text.match(/^(.+?)\s+([\d.,]+)/);
        if (m) {
            var key = m[1].trim();
            var val = parseInt(m[2].replace(/[.,]/g, ''));
            if (!isNaN(val)) cur[key] = { val: val, el: b };
        }
    });

    // Compare with previous and animate deltas
    for (var key in cur) {
        if (_prevResources[key] !== undefined && cur[key].val !== _prevResources[key]) {
            var delta = cur[key].val - _prevResources[key];
            if (delta !== 0) {
                _showResourceFloater(cur[key].el, delta, key);
                // Count-up animation: animate the number from old to new value
                var badge = cur[key].el;
                var m = badge.textContent.trim().match(/^(.+?)\s+([\d.,]+)(.*)/);
                if (m && typeof animateCounter === 'function') {
                    var prefix = m[1] + ' ';
                    var suffix = m[3] || '';
                    var numSpan = document.createElement('span');
                    numSpan.textContent = _prevResources[key];
                    badge.textContent = '';
                    badge.appendChild(document.createTextNode(prefix));
                    badge.appendChild(numSpan);
                    badge.appendChild(document.createTextNode(suffix));
                    animateCounter(numSpan, _prevResources[key], cur[key].val, 600);
                }
            }
        }
    }

    // Cache current values
    _prevResources = {};
    for (var k in cur) { _prevResources[k] = cur[k].val; }
}

function _showResourceFloater(targetEl, delta, icon) {
    var rect = targetEl.getBoundingClientRect();
    // Skip floater if badge is not visible (collapsed panel, off-screen)
    if (!rect.width || !rect.height || (rect.top === 0 && rect.left === 0)) return;
    var el = document.createElement('div');
    el.className = 'resource-floater' + (delta > 0 ? ' gain' : ' loss');
    el.textContent = (delta > 0 ? '+' : '') + delta;
    el.style.left = (rect.left + rect.width / 2) + 'px';
    el.style.top = rect.top + 'px';
    document.body.appendChild(el);
    // Pulse the badge itself
    targetEl.classList.remove('resource-pop');
    void targetEl.offsetWidth;
    targetEl.classList.add('resource-pop');
    setTimeout(function() { el.remove(); }, 1200);
}

// ─── HP/MP Bar Delta — Ghost bar on damage, shine on heal ───
var _prevBarState = {};

function _animateBarDeltas(contentEl) {
    var bars = contentEl.querySelectorAll('.v-bar-fill');
    bars.forEach(function(fill) {
        var track = fill.parentElement;
        if (!track) return;
        // Extract current width percentage
        var curPct = parseFloat(fill.style.width) || 0;
        // Build a key from the bar type class
        var typeClass = Array.from(fill.classList).find(function(c) { return c !== 'v-bar-fill'; }) || 'unknown';
        var key = typeClass + '_' + Array.from(track.parentElement.children).indexOf(track.parentElement);

        if (_prevBarState[key] !== undefined && _prevBarState[key] !== curPct) {
            var oldPct = _prevBarState[key];
            if (curPct < oldPct) {
                // Damage: show ghost bar
                var ghost = track.querySelector('.bar-ghost');
                if (!ghost) {
                    ghost = document.createElement('div');
                    ghost.className = 'bar-ghost';
                    track.insertBefore(ghost, fill);
                }
                ghost.style.transition = 'none';
                ghost.style.width = oldPct + '%';
                requestAnimationFrame(function() {
                    ghost.style.transition = 'width 1.2s ease-in 0.3s';
                    ghost.style.width = curPct + '%';
                });
            } else {
                // Heal: shine sweep
                fill.classList.add('healing');
                setTimeout(function() { fill.classList.remove('healing'); }, 700);
            }
        }
        _prevBarState[key] = curPct;
    });
}

/* ═══════════════════════════════════════════════════════
   FEEDBACK & DONATION OVERLAY
   ═══════════════════════════════════════════════════════ */

var _fbData = null;
var _fbSelectedRating = 0;
var _fbActive = false; // Prevents re-trigger during same session

function _showFeedbackOverlay(data) {
    _fbData = data;
    _fbSelectedRating = 0;
    _fbActive = true;
    var overlay = document.getElementById('feedback-overlay');
    if (!overlay) return;

    // Populate phase 1 (rating)
    var titleEl = document.getElementById('fb-title');
    var msgEl = document.getElementById('fb-message');
    var starsEl = document.getElementById('fb-stars');
    var pixBtn = document.getElementById('fb-pix-btn');

    if (titleEl) titleEl.textContent = data.title || '';
    if (msgEl) msgEl.textContent = data.message || '';

    // Build star buttons (Unicode ★ for consistent cross-platform rendering)
    if (starsEl) {
        starsEl.innerHTML = '';
        for (var i = 1; i <= 5; i++) {
            var star = document.createElement('button');
            star.className = 'feedback-star';
            star.textContent = '\u2605'; // ★ filled star
            star.dataset.rating = i;
            star.setAttribute('aria-label', i + ' estrela' + (i > 1 ? 's' : ''));
            star.addEventListener('click', _onStarClick);
            starsEl.appendChild(star);
        }
    }

    // Pre-render survey form (questions come with the popup data)
    if (data.survey_questions) {
        _renderFeedbackSurvey(data.survey_questions);
    }

    // PIX button
    if (pixBtn) {
        pixBtn.style.display = data.show_pix ? '' : 'none';
        pixBtn.onclick = function() {
            _haptic();
            _hideFeedbackOverlay();
            if (typeof doAction === 'function') doAction('fb_pix');
        };
    }

    // Dismiss button
    var dismissBtn = document.getElementById('fb-dismiss-btn');
    if (dismissBtn) {
        dismissBtn.onclick = function() {
            _haptic();
            _hideFeedbackOverlay();
            if (typeof doAction === 'function') doAction('fb_dismiss');
        };
    }

    // Survey offer buttons — purely client-side phase transition
    var surveyYes = document.getElementById('fb-survey-yes');
    if (surveyYes) {
        surveyYes.onclick = function() {
            _haptic();
            _showFeedbackPhase('survey');
        };
    }
    var surveyNo = document.getElementById('fb-survey-no');
    if (surveyNo) {
        surveyNo.onclick = function() {
            _haptic();
            _hideFeedbackOverlay();
            // Save rating only (no survey)
            if (typeof apiCall === 'function') {
                apiCall('/api/game/action', {
                    cb: 'fb_survey_no',
                    user_id: S.userId,
                    rating: _fbSelectedRating
                }).catch(function(e) {
                    console.error('[GAME] Feedback save error:', e);
                });
            }
            if (typeof showToast === 'function') {
                showToast('\u2728 Obrigado pela avalia\u00e7\u00e3o!', 2500);
            }
        };
    }

    // Submit survey button
    var submitBtn = document.getElementById('fb-survey-submit');
    if (submitBtn) {
        submitBtn.onclick = _onSurveySubmit;
    }

    // Click outside card to dismiss
    overlay.onclick = function(evt) {
        if (evt.target === overlay) {
            _haptic();
            _hideFeedbackOverlay();
            if (typeof doAction === 'function') doAction('fb_dismiss');
        }
    };

    // Show phase 1, hide others
    _showFeedbackPhase('rating');
    overlay.classList.remove('fb-hiding');
    overlay.style.display = 'flex';
}

var _fbStarLocked = false;
function _onStarClick(e) {
    if (_fbStarLocked) return;
    _fbStarLocked = true;
    var rating = parseInt(e.currentTarget.dataset.rating) || 3;
    _fbSelectedRating = rating;
    _haptic();
    // Highlight stars up to selected
    var stars = document.querySelectorAll('.feedback-star');
    stars.forEach(function(s) {
        var r = parseInt(s.dataset.rating) || 0;
        if (r <= rating) {
            s.classList.add('active');
        } else {
            s.classList.remove('active');
        }
    });
    // Show selected rating in survey offer title
    var offerTitle = document.querySelector('#fb-phase-survey-offer .feedback-title');
    if (offerTitle) {
        var filled = '★'.repeat(rating);
        var empty = '☆'.repeat(5 - rating);
        offerTitle.textContent = filled + empty + ' Obrigado!';
    }
    // Brief delay then show survey offer
    setTimeout(function() {
        _showFeedbackPhase('survey-offer');
        _fbStarLocked = false;
    }, 500);
}

function _showFeedbackPhase(phase) {
    var phases = ['rating', 'survey-offer', 'survey'];
    phases.forEach(function(p) {
        var el = document.getElementById('fb-phase-' + p);
        if (el) el.style.display = (p === phase) ? '' : 'none';
    });
    var overlay = document.getElementById('feedback-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function _renderFeedbackSurvey(questions) {
    var form = document.getElementById('fb-survey-form');
    if (!form) return;
    form.innerHTML = '';

    questions.forEach(function(q) {
        var qDiv = document.createElement('div');
        qDiv.className = 'fb-question';
        qDiv.dataset.questionId = q.id;

        var label = document.createElement('div');
        label.className = 'fb-question-text';
        label.textContent = q.text;
        qDiv.appendChild(label);

        if (q.type === 'choice' && q.options) {
            var opts = document.createElement('div');
            opts.className = 'fb-options';
            q.options.forEach(function(opt) {
                var btn = document.createElement('button');
                btn.className = 'fb-option';
                btn.textContent = opt;
                btn.dataset.questionId = q.id;
                btn.dataset.value = opt;
                btn.onclick = function() {
                    _haptic();
                    opts.querySelectorAll('.fb-option').forEach(function(b) {
                        b.classList.remove('selected');
                    });
                    btn.classList.add('selected');
                };
                opts.appendChild(btn);
            });
            qDiv.appendChild(opts);
        } else if (q.type === 'text') {
            var ta = document.createElement('textarea');
            ta.className = 'fb-textarea';
            ta.placeholder = 'Sugest\u00f5es, elogios, cr\u00edticas...';
            ta.maxLength = 500;
            ta.dataset.questionId = q.id;
            qDiv.appendChild(ta);
        }

        form.appendChild(qDiv);
    });
}

function _onSurveySubmit() {
    var form = document.getElementById('fb-survey-form');
    if (!form) return;
    _haptic();
    var answers = {};
    var choiceCount = 0;
    form.querySelectorAll('.fb-question').forEach(function(qDiv) {
        var qId = qDiv.dataset.questionId;
        var selected = qDiv.querySelector('.fb-option.selected');
        if (selected) {
            answers[qId] = selected.dataset.value;
            choiceCount++;
        }
        var ta = qDiv.querySelector('.fb-textarea');
        if (ta && ta.value.trim()) {
            answers[qId] = ta.value.trim().substring(0, 500);
        }
    });
    if (choiceCount === 0) {
        if (typeof showToast === 'function') showToast('Responda pelo menos uma pergunta', 2000);
        return;
    }
    _hideFeedbackOverlay();
    // Send rating + survey via single API call (no renderScreen to avoid re-trigger)
    if (typeof apiCall === 'function') {
        apiCall('/api/game/action', {
            cb: 'fb_survey_submit',
            user_id: S.userId,
            survey: answers,
            rating: _fbSelectedRating
        }).catch(function(e) {
            console.error('[GAME] Survey submit error:', e);
        });
    }
    if (typeof showToast === 'function') {
        showToast('\u2728 Obrigado pelo feedback! Suas respostas ajudam muito.', 3500);
    }
}

function _hideFeedbackOverlay() {
    var overlay = document.getElementById('feedback-overlay');
    if (!overlay) return;
    // Smooth fade-out animation
    overlay.classList.add('fb-hiding');
    setTimeout(function() {
        overlay.style.display = 'none';
        overlay.classList.remove('fb-hiding');
    }, 300);
}

// Haptic feedback helper
function _haptic() {
    if (window.vHaptic) vHaptic.tap();
}


// ─── Day/Night Ambient Tint ───
// Sets body[data-time] attribute for CSS tint overlay.
// Uses server is_night flag + client hour for dusk/dawn detection.
function _applyTimeTint(screen) {
    if (screen.is_night) {
        document.body.setAttribute('data-time', 'night');
    } else {
        // Check for dusk/dawn based on local time (approximate)
        const h = new Date().getHours();
        if (h >= 5 && h < 7) {
            document.body.setAttribute('data-time', 'dawn');
        } else if (h >= 18 && h < 20) {
            document.body.setAttribute('data-time', 'dusk');
        } else {
            document.body.removeAttribute('data-time');
        }
    }
}


// ===================================================================
// AMBIENT MUSIC - Maps screen_id to audio track
// ===================================================================
function _updateAmbientMusic(screenId) {
    if (!screenId || typeof ValdoriaAudio === 'undefined') return;

    const SCREEN_MUSIC = {
        // City screens -> city ambient
        'city.hub':        'city',
        'city.locations':  'city',
        'city.guild':      'city',
        'city.market':     'city',
        'city.bank':       'city',
        'city.temple':     'city',
        'city.cartographer': 'city',
        'city.arena':      'combat',
        // Tavern -> tavern ambient
        'city.tavern':     'tavern',
        // Character screens -> city (background)
        'char.status':     'city',
        'char.inventory':  'city',
        'char.skills':     'city',
        // Exploration-related -> forest (generic)
        'explore':         'forest',
    };

    // Match by prefix for sub-screens (e.g., city.guild.quests -> city)
    let track = SCREEN_MUSIC[screenId];
    if (!track) {
        // Try prefix match
        const prefix = screenId.split('.').slice(0, 2).join('.');
        track = SCREEN_MUSIC[prefix];
    }
    if (!track) {
        // Default: city ambient for all unmatched screens
        track = 'city';
    }

    ValdoriaAudio.play(track);
}

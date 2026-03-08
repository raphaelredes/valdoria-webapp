// ═══════════════════════════════════════════════════════
// 3D DICE MANAGER (shared Dice3D instance for check overlays)
// ═══════════════════════════════════════════════════════

let _dice3d = null;

function getDice3D() {
    const container = document.getElementById('dice3d-canvas');
    const particles = document.getElementById('dice3d-particles');
    if (!container) return null;
    if (_dice3d) {
        _dice3d.dispose();
        _dice3d = null;
    }
    try {
        _dice3d = new Dice3D(container, { size: 200, particlesContainer: particles });
    } catch (e) {
        console.warn('[EXPLORE] Dice3D init failed, fallback to emoji:', e);
        return null;
    }
    return _dice3d;
}

function disposeDice3D() {
    if (_dice3d) {
        _dice3d.dispose();
        _dice3d = null;
    }
}

// ═══════════════════════════════════════════════════════
// MOVEMENT LOG (internal — sent to backend)
// ═══════════════════════════════════════════════════════
function logMoveEvent(events) {
    S.moveLog.push({
        s: ++S._stepCount,
        h: [S.playerCol, S.playerRow],
        t: (S.grid[S.playerRow] && S.grid[S.playerRow][S.playerCol]) || '.',
        ts: Date.now(),
        ev: events || [],
        hp: getCurrentHP(),
    });
    // Keep only last 50 entries to limit payload size
    if (S.moveLog.length > 50) S.moveLog.shift();
}

// ═══════════════════════════════════════════════════════
// POI INTERACTION
// ═══════════════════════════════════════════════════════
function showPOI(poi) {
    // POI discovery flash on hex (canvas-based golden pulse, only if visible)
    const poiKey = `${poi.col},${poi.row}`;
    if (S.fogState[poiKey] !== 'hidden') flashHex(poi.col, poi.row);

    // activateOverlay clears dm-choices + dm-narration before showing
    activateOverlay('dm-overlay');

    document.getElementById('dm-icon').textContent = '';
    document.getElementById('dm-title').textContent = poi.title || 'Evento';
    document.getElementById('dm-type').textContent = POI_TYPE_LABELS[poi.type] || poi.type;

    // Typewriter narration
    const narrEl = document.getElementById('dm-narration');
    narrEl.innerHTML = '<span class="cursor"></span>';
    typewriter(narrEl, poi.narration || '', () => {
        showChoices(poi);
    });
}

// --- Paginated Typewriter ---
// Splits text on '|' delimiter into pages. If no delimiter, auto-splits
// long text at sentence boundaries to keep each page readable.
// Shows a "Continuar..." button between pages, then calls onDone after the last.
const _NARR_PAGE_MAX = 90; // Max chars per auto-page (fits dm-card on 390px)

function _splitNarrationPages(text) {
    if (!text) return [''];
    // Explicit page breaks via '|'
    if (text.includes('|')) {
        return text.split('|').map(p => p.trim()).filter(Boolean);
    }
    // Short text — single page
    if (text.length <= _NARR_PAGE_MAX) return [text];
    // Auto-split at sentence boundary ('. ')
    const pages = [];
    let remaining = text;
    while (remaining.length > _NARR_PAGE_MAX) {
        let cut = remaining.lastIndexOf('. ', _NARR_PAGE_MAX);
        if (cut < _NARR_PAGE_MAX * 0.4) {
            // No good sentence break — try comma
            cut = remaining.lastIndexOf(', ', _NARR_PAGE_MAX);
        }
        if (cut < _NARR_PAGE_MAX * 0.4) {
            // Hard break at space
            cut = remaining.lastIndexOf(' ', _NARR_PAGE_MAX);
        }
        if (cut <= 0) cut = _NARR_PAGE_MAX;
        else cut += 1; // Include the '.' or ','
        pages.push(remaining.slice(0, cut).trim());
        remaining = remaining.slice(cut).trim();
    }
    if (remaining) pages.push(remaining);
    return pages;
}

function typewriter(el, text, onDone) {
    const pages = _splitNarrationPages(text);
    _typewriterPage(el, pages, 0, onDone);
}

function _typewriterPage(el, pages, pageIdx, onDone) {
    const text = pages[pageIdx] || '';
    const isLast = pageIdx >= pages.length - 1;
    const totalPages = pages.length;
    let i = 0;
    el.innerHTML = '';
    const span = document.createElement('span');
    el.appendChild(span);
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    el.appendChild(cursor);

    const iv = setInterval(() => {
        if (i >= text.length) {
            clearInterval(iv);
            cursor.remove();
            if (isLast) {
                if (onDone) onDone();
            } else {
                // Show page indicator + continue button
                if (totalPages > 1) {
                    const indicator = document.createElement('div');
                    indicator.className = 'dm-page-indicator';
                    indicator.textContent = `${pageIdx + 1} / ${totalPages}`;
                    el.appendChild(indicator);
                }
                const contBtn = document.createElement('button');
                contBtn.className = 'dm-continue-btn';
                contBtn.innerHTML = '<span>Continuar…</span> <span style="font-size:16px">▸</span>';
                contBtn.addEventListener('click', () => {
                    _typewriterPage(el, pages, pageIdx + 1, onDone);
                });
                el.appendChild(contBtn);
            }
            return;
        }
        span.textContent += text[i];
        i++;
    }, 20);
}

function showChoices(poi) {
    const choicesEl = document.getElementById('dm-choices');
    choicesEl.innerHTML = '';

    (poi.choices || []).forEach((ch, idx) => {
        const btn = document.createElement('button');
        btn.className = 'dm-choice-btn';

        let html = `<span class="choice-icon"></span>`;
        html += `<span class="choice-label">${ch.t || ch.l || 'Escolher'}</span>`;

        // Stat check display (D&D 5e skill with proficiency + adv/dis indicator)
        if (ch.k) {
            const statShort = STAT_SHORT[ch.k.s] || ch.k.s.toUpperCase();
            const proficient = S.charData && S.charData.sp && S.charData.sp.includes(ch.k.s);
            const profMark = proficient ? '★' : '';
            const mode = getRollMode(ch.k);
            const modeMark = mode === 'advantage' ? ' ▲' : mode === 'disadvantage' ? ' ▼' : '';
            const mod = ch.k.m || 0;
            const chance = Math.max(5, Math.min(95, Math.round(((21 - ch.k.dc + mod) / 20) * 100)));
            html += `<span class="choice-check${mode !== 'normal' ? ' ' + mode : ''}">${statShort}${profMark}${modeMark} ${chance}%</span>`;
        }

        btn.innerHTML = html;
        btn.addEventListener('click', () => handleChoice(poi, ch, idx));
        choicesEl.appendChild(btn);
    });
}

function handleChoice(poi, choice, idx) {
    document.getElementById('dm-overlay').classList.remove('active');
    S.poisResolved.add(poi.id);

    if (choice.k) {
        // Stat check
        performStatCheck(poi, choice);
    } else {
        // Direct outcome
        applyOutcome(poi, choice.o || {}, choice);
    }
}

// ═══════════════════════════════════════════════════════
// ADVANTAGE / DISADVANTAGE (D&D 5e)
// ═══════════════════════════════════════════════════════

// Determine roll mode: 'normal', 'advantage', or 'disadvantage'
function getRollMode(check) {
    const hasAdv = !!(check && check.adv);
    const hasDis = hasCondition('poisoned') || !!(check && check.dis);
    // D&D 5e: advantage + disadvantage cancel out
    if (hasAdv && hasDis) return 'normal';
    if (hasAdv) return 'advantage';
    if (hasDis) return 'disadvantage';
    return 'normal';
}

// Roll with advantage/disadvantage
function rollD20(mode) {
    const r1 = Math.floor(Math.random() * 20) + 1;
    if (mode === 'normal') return { roll: r1, r1: r1, r2: null };
    const r2 = Math.floor(Math.random() * 20) + 1;
    const kept = mode === 'advantage' ? Math.max(r1, r2) : Math.min(r1, r2);
    return { roll: kept, r1: r1, r2: r2 };
}

// Build dice display HTML for the check overlay
function buildDiceHTML(r1, r2, mode) {
    if (!r2) return `<span class="dice-single">d20</span>`;
    const isAdv = mode === 'advantage';
    const kept = isAdv ? Math.max(r1, r2) : Math.min(r1, r2);
    const label = isAdv ? 'VANTAGEM' : 'DESVANTAGEM';
    const cls = isAdv ? 'adv' : 'dis';
    const c1 = r1 === kept ? 'kept' : 'dropped';
    const c2 = r2 === kept ? 'kept' : 'dropped';
    return `<span class="roll-mode-label ${cls}">${label}</span>` +
        `<span class="dice-pair">` +
        `<span class="die ${c1}">${r1}</span>` +
        `<span class="die ${c2}">${r2}</span>` +
        `</span>`;
}

// Build formula string for check overlay
function buildFormula(roll, mod, statName, profMark, dc, total, r1, r2, mode) {
    let rollPart;
    if (r2 !== null) {
        const isAdv = mode === 'advantage';
        const kept = isAdv ? Math.max(r1, r2) : Math.min(r1, r2);
        const other = kept === r1 ? r2 : r1;
        const keptColor = isAdv ? '#4a8' : '#a44';
        rollPart = `<span style="color:${keptColor}"><b>${kept}</b></span> / <span style="opacity:0.4">${other}</span>`;
    } else {
        rollPart = `<b>${roll}</b>`;
    }
    const sign = mod >= 0 ? '+' : '';
    const profLabel = profMark ? ' ★' : '';
    const modeLabel = r2 !== null ? (mode === 'advantage' ? ' <span style="color:#4a8;font-size:0.85em">Vant.</span>' : ' <span style="color:#a44;font-size:0.85em">Desv.</span>') : '';
    return `${rollPart} ${sign} ${mod} (${statName}${profLabel}) = <b>${total}</b> vs DC <b>${dc}</b>${modeLabel}`;
}

// ═══════════════════════════════════════════════════════
// STAT CHECK
// ═══════════════════════════════════════════════════════
function performStatCheck(poi, choice) {
    const check = choice.k;
    const mod = check.m || 0;
    const dc = check.dc || 10;

    // D&D 5e advantage/disadvantage
    const mode = getRollMode(check);
    const { roll, r1, r2 } = rollD20(mode);

    const total = roll + mod;
    const success = total >= dc;

    // Record check
    S.checksPerformed.push({
        stat: check.s, dc: dc, roll: roll, mod: mod, ok: success, mode: mode,
    });

    // Show check overlay
    const overlay = document.getElementById('check-overlay');
    const formulaEl = document.getElementById('check-formula');
    const resultEl = document.getElementById('check-result');

    const statName = STAT_NAMES[check.s] || check.s;
    const proficient = S.charData && S.charData.sp && S.charData.sp.includes(check.s);
    const profMark = proficient ? '★' : '';

    formulaEl.innerHTML = '';
    resultEl.textContent = '';
    resultEl.className = 'check-result';
    overlay.classList.add('active');

    // 3D dice animation
    const dice = getDice3D();
    if (dice) {
        // Show advantage/disadvantage label above the 3D dice
        const wrapper = document.getElementById('dice3d-wrapper');
        wrapper.classList.remove('has-mode-label');
        let modeLabel = wrapper.querySelector('.roll-mode-label-3d');
        if (modeLabel) modeLabel.remove();
        if (r2 !== null) {
            wrapper.classList.add('has-mode-label');
            const cls = mode === 'advantage' ? 'adv' : 'dis';
            const label = mode === 'advantage' ? 'VANTAGEM' : 'DESVANTAGEM';
            modeLabel = document.createElement('div');
            modeLabel.className = `roll-mode-label-3d ${cls}`;
            modeLabel.textContent = label;
            wrapper.insertBefore(modeLabel, wrapper.firstChild);
        }

        const animDur = dice.roll(roll, () => {
            // Animation done — show formula and result
            formulaEl.innerHTML = buildFormula(roll, mod, statName, profMark, dc, total, r1, r2, mode);

            resultEl.textContent = success ? 'Sucesso!' : 'Falha!';
            resultEl.className = 'check-result ' + (success ? 'success' : 'failure');

            try {
                if (tg) tg.HapticFeedback.notificationOccurred(success ? 'success' : 'error');
            } catch (e) { console.warn('[EXPLORE] haptic:', e); }

            _showCheckSkip(overlay, success, choice, poi);
        });
    } else {
        // Fallback: emoji-based animation (no THREE.js)
        _showCheckEmojiFallback(overlay, roll, r1, r2, mode, mod, statName, profMark, dc, total, success, choice, poi);
    }
}

// Skip/continue logic shared by both 3D and emoji paths
function _showCheckSkip(overlay, success, choice, poi) {
    let _checkDone = false;
    const skipBtn = document.getElementById('check-skip-btn');

    const finishCheck = () => {
        if (_checkDone) return;
        _checkDone = true;
        if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
        disposeDice3D();
        overlay.classList.remove('active');
        const outcome = success ? (choice.o || {}) : (choice.f || choice.o || {});

        if (!success && choice.cmb_on_fail && poi.combat) {
            triggerCombat(poi);
            return;
        }
        if (success && choice.s2) {
            showStage2(poi, choice.s2);
            return;
        }
        applyOutcome(poi, outcome, choice);
    };

    setTimeout(() => {
        if (!_checkDone && skipBtn) {
            skipBtn.classList.add('visible');
            skipBtn.onclick = finishCheck;
        }
    }, 500);

    setTimeout(finishCheck, 2500);
}

// Emoji fallback when THREE.js is unavailable
function _showCheckEmojiFallback(overlay, roll, r1, r2, mode, mod, statName, profMark, dc, total, success, choice, poi) {
    const formulaEl = document.getElementById('check-formula');
    const resultEl = document.getElementById('check-result');
    const wrapper = document.getElementById('dice3d-wrapper');

    // Show emoji in the wrapper
    wrapper.innerHTML = `<div class="dice-display-fallback" style="font-size:64px;text-align:center;animation:diceRoll 0.7s ease">${r2 !== null ? buildDiceHTML(r1, r2, mode) : 'd20'}</div>`;

    formulaEl.innerHTML = buildFormula(roll, mod, statName, profMark, dc, total, r1, r2, mode);

    setTimeout(() => {
        const fb = wrapper.querySelector('.dice-display-fallback');
        if (fb && r2 === null) {
            fb.textContent = roll <= 1 ? 'Falha Critica' : roll >= 20 ? 'Critico!' : roll;
        }
        resultEl.textContent = success ? 'Sucesso!' : 'Falha!';
        resultEl.className = 'check-result ' + (success ? 'success' : 'failure');

        try {
            if (tg) tg.HapticFeedback.notificationOccurred(success ? 'success' : 'error');
        } catch (e) { console.warn('[EXPLORE] haptic:', e); }

        _showCheckSkip(overlay, success, choice, poi);
    }, 700);
}

function showStage2(poi, stage2) {
    // activateOverlay clears dm-choices + dm-narration before showing
    activateOverlay('dm-overlay');

    const overlay = document.getElementById('dm-overlay');
    document.getElementById('dm-icon').textContent = '';
    document.getElementById('dm-title').textContent = stage2.tt || 'Continuação';
    document.getElementById('dm-type').textContent = 'mistério';

    const narrEl = document.getElementById('dm-narration');
    narrEl.innerHTML = '';
    typewriter(narrEl, stage2.n || '', () => {
        const choicesEl = document.getElementById('dm-choices');
        choicesEl.innerHTML = '';
        const fakePoi = { id: poi.id, choices: stage2.ch || [], combat: null, type: poi.type };
        (stage2.ch || []).forEach((ch, idx) => {
            const btn = document.createElement('button');
            btn.className = 'dm-choice-btn';
            let html = `<span class="choice-icon"></span>`;
            html += `<span class="choice-label">${ch.t || ch.l || 'Escolher'}</span>`;
            if (ch.k) {
                const statShort = STAT_SHORT[ch.k.s] || ch.k.s.toUpperCase();
                const proficient = S.charData && S.charData.sp && S.charData.sp.includes(ch.k.s);
                const profMark = proficient ? '★' : '';
                const mode = getRollMode(ch.k);
                const modeMark = mode === 'advantage' ? ' ▲' : mode === 'disadvantage' ? ' ▼' : '';
                const mod = ch.k.m || 0;
                const chance = Math.max(5, Math.min(95, Math.round(((21 - ch.k.dc + mod) / 20) * 100)));
                html += `<span class="choice-check${mode !== 'normal' ? ' ' + mode : ''}">${statShort}${profMark}${modeMark} ${chance}%</span>`;
            }
            btn.innerHTML = html;
            btn.addEventListener('click', () => {
                overlay.classList.remove('active');
                if (ch.k) {
                    performStatCheck(fakePoi, ch);
                } else {
                    applyOutcome(fakePoi, ch.o || {}, ch);
                }
            });
            choicesEl.appendChild(btn);
        });
    });
}

// ═══════════════════════════════════════════════════════
// OUTCOME
// ═══════════════════════════════════════════════════════
function applyOutcome(poi, outcome, choice) {
    // Check if danger POI and player chose to fight
    if (poi.combat && poi.type === 'dan' && choice.l && choice.l.includes('Lutar')) {
        triggerCombat(poi);
        return;
    }

    const overlay = document.getElementById('outcome-overlay');
    const textEl = document.getElementById('outcome-text');
    const rewardsEl = document.getElementById('outcome-rewards');

    textEl.textContent = outcome.t || 'Você continua sua jornada.';
    rewardsEl.innerHTML = '';

    // Apply and display rewards
    if (outcome.x) {
        S.xpEarned += outcome.x;
        addRewardBadge(rewardsEl, `+${outcome.x} XP`, 'xp');
    }
    if (outcome.g) {
        S.goldEarned += outcome.g;
        addRewardBadge(rewardsEl, `+${outcome.g} Ouro`, 'gold');
    }
    if (outcome.h && outcome.h > 0) {
        S.hpChange += outcome.h;
        addRewardBadge(rewardsEl, `+${outcome.h} HP`, 'heal');
        if (S.charData) {
            const newHP = Math.min(S.charData.mh, (S.charData.hp + S.hpChange));
            updateHP(newHP, S.charData.mh);
        }
    }
    if (outcome.d && outcome.d > 0) {
        S.hpChange -= outcome.d;
        addRewardBadge(rewardsEl, `-${outcome.d} HP`, 'damage');
        if (S.charData) {
            const newHP = Math.max(0, S.charData.hp + S.hpChange);
            updateHP(newHP, S.charData.mh);
        }
    }
    if (outcome.i) {
        S.itemsFound.push(outcome.i);
        addRewardBadge(rewardsEl, outcome.i, 'item');
    }

    // Log the outcome event
    const logEvents = [];
    if (outcome.x) logEvents.push({ type: 'xp', val: outcome.x });
    if (outcome.g) logEvents.push({ type: 'gold', val: outcome.g });
    if (outcome.h && outcome.h > 0) logEvents.push({ type: 'heal', val: outcome.h });
    if (outcome.d && outcome.d > 0) logEvents.push({ type: 'dmg', val: outcome.d });
    if (outcome.i) logEvents.push({ type: 'item', val: outcome.i });
    if (logEvents.length) logMoveEvent(logEvents);

    // Haptic feedback on positive rewards
    const hasReward = outcome.x || outcome.g || (outcome.h && outcome.h > 0) || outcome.i;
    if (hasReward) {
        try { if (tg) tg.HapticFeedback.notificationOccurred('success'); } catch (e) { /* ignore */ }
    }

    updateRewards();
    overlay.classList.add('active');
}

function addRewardBadge(container, text, type) {
    const badge = document.createElement('div');
    badge.className = 'outcome-reward ' + type;
    badge.textContent = text;
    const idx = container.children.length;
    badge.style.animationDelay = (idx * 120) + 'ms';
    container.appendChild(badge);
}

function closeOutcome() {
    document.getElementById('outcome-overlay').classList.remove('active');
    if (checkDeath()) return;
    // If returning to city, continue the journey after resolving the encounter
    if (_returningToCity && _returnJourney) {
        setTimeout(() => showReturnJourneyStep(), 400);
        return;
    }
    if (checkLowHP()) { saveState(); return; }
    saveState();
}

// ═══════════════════════════════════════════════════════
// COMBAT
// ═══════════════════════════════════════════════════════
function triggerCombat(poi) {
    const combat = poi.combat;
    S.combatTrigger = combat;
    logMoveEvent([{ type: 'combat', enemy: combat.en || 'unknown' }]);

    // Screen shake on map viewport for combat
    const viewport = document.getElementById('map-viewport');
    if (viewport) {
        viewport.classList.add('screen-shake');
        setTimeout(() => viewport.classList.remove('screen-shake'), 600);
    }

    // Double flash effect for combat
    const flash = document.createElement('div');
    flash.className = 'encounter-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 700);

    const overlay = document.getElementById('combat-overlay');
    document.getElementById('combat-icon').textContent = '';
    document.getElementById('combat-enemy').textContent = combat.en || 'Inimigo';
    document.getElementById('combat-text').innerHTML = '<span style="color:#d44;font-weight:bold;">Iniciando Combate...</span>';

    overlay.classList.add('active');
    try { if (tg) tg.HapticFeedback.impactOccurred('heavy'); } catch (e) { console.warn('[EXPLORE] haptic:', e); }

    // Skip button + 2000ms auto-advance
    let _combatDone = false;
    const skipBtn = document.getElementById('combat-skip-btn');

    const finishCombat = () => {
        if (_combatDone) return;
        _combatDone = true;
        if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
        // Use transition API if available (stays in same WebView)
        if (S.apiBase) {
            transitionToArena();
        } else {
            finishExploration('combat');
        }
    };

    setTimeout(() => {
        if (!_combatDone && skipBtn) {
            skipBtn.classList.add('visible');
            skipBtn.onclick = finishCombat;
        }
    }, 500);

    setTimeout(finishCombat, 2000);
}

// Post-combat narrative (brief toast after returning from combat)
function showPostCombatNarrative() {
    const lines = [
        'A poeira assenta. Você respira fundo e segue adiante.',
        'O silêncio retorna ao redor. Você recupera o fôlego.',
        'A ameaça foi neutralizada. A trilha está livre.',
        'Com a vitória, sua confiança cresce.',
        'Após a batalha, você examina os arredores com cautela.',
    ];
    const text = lines[Math.floor(Math.random() * lines.length)];
    showTerrainToast(text, 'ranger');
}

// ═══════════════════════════════════════════════════════
// WEBAPP TRANSITIONS (same-origin navigation)
// ═══════════════════════════════════════════════════════

async function transitionToArena() {
    saveState();

    const params = new URLSearchParams(window.location.search);
    const mapData = params.get('data') || '';

    const body = {
        from: 'explore', to: 'combat',
        user_id: parseInt(S.uid),
        payload: {
            results: {
                xp: S.xpEarned, gold: S.goldEarned,
                hp_change: S.hpChange, items: S.itemsFound,
                pois_resolved: Array.from(S.poisResolved),
                hexes_explored: S.visited.size,
                checks: S.checksPerformed,
                log: S.moveLog.slice(-50),
                inventory_used: S.inventoryUsed,
            },
            combat: S.combatTrigger,
            map_data: mapData,
        }
    };
    const _th = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${S.token}` };
    if (window.Telegram?.WebApp?.initData) { _th['X-Telegram-Init-Data'] = Telegram.WebApp.initData; }
    _th['X-Idempotency-Key'] = crypto.randomUUID();

    // Retry transition up to 2 times (tunnel might be reconnecting)
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            if (attempt > 0) {
                console.log('[EXPLORE] Transition retry', attempt);
                await new Promise(r => setTimeout(r, 2000));
            }
            const resp = await fetchT(`${S.apiBase}/api/webapp/transition`, {
                method: 'POST',
                headers: _th,
                body: JSON.stringify(body)
            }, 10000);

            if (resp.ok) {
                const data = await resp.json();
                if (data.url) {
                    window.location.replace(data.url);
                    return;
                }
            }
            console.error('[EXPLORE] Transition to combat failed (attempt ' + attempt + ')');
        } catch (e) {
            console.error('[EXPLORE] Transition to combat error (attempt ' + attempt + '):', e);
        }
    }

    if (typeof showTerrainToast === 'function') showTerrainToast('Erro na transição. Usando fallback...', 'damage');

    // Fallback: old sendData + close behavior
    finishExploration('combat');
}

async function transitionToInventory() {
    saveState();

    const params = new URLSearchParams(window.location.search);
    const mapData = params.get('data') || '';

    const body = {
        from: 'explore', to: 'inventory',
        user_id: parseInt(S.uid),
        payload: { map_data: mapData }
    };
    const _th = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${S.token}` };
    if (window.Telegram?.WebApp?.initData) { _th['X-Telegram-Init-Data'] = Telegram.WebApp.initData; }
    _th['X-Idempotency-Key'] = crypto.randomUUID();

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            if (attempt > 0) {
                console.log('[EXPLORE] Inventory transition retry', attempt);
                await new Promise(r => setTimeout(r, 2000));
            }
            const resp = await fetchT(`${S.apiBase}/api/webapp/transition`, {
                method: 'POST',
                headers: _th,
                body: JSON.stringify(body)
            }, 10000);

            if (resp.ok) {
                const data = await resp.json();
                if (data.url) {
                    window.location.replace(data.url);
                    return;
                }
            }
            console.error('[EXPLORE] Transition to inventory failed (attempt ' + attempt + ')');
        } catch (e) {
            console.error('[EXPLORE] Transition to inventory error (attempt ' + attempt + '):', e);
        }
    }
    if (typeof showTerrainToast === 'function') showTerrainToast('Erro ao abrir mochila. Tente novamente.', 'damage');
}

// ═══════════════════════════════════════════════════════
// PORTAL OVERLAY (exit transition) + EXIT BOSS
// ═══════════════════════════════════════════════════════
function showPortalOverlay() {
    // Boss guardian check — must defeat or bypass before exiting
    if (S.bossData && !S._bossDefeated) {
        showBossEncounter();
        return;
    }
    _showPortalSummary();
}

function showBossEncounter() {
    const boss = S.bossData;
    const overlay = document.getElementById('event-overlay');
    if (!overlay) { _showPortalSummary(); return; }

    const stealthMod = S.charData ? getSkillMod('stealth') : 0;
    const stealthDC = 12 + S.dangerLevel;
    const stealthChance = Math.min(95, Math.max(5, (stealthMod + 10.5 - stealthDC) / 20 * 100));

    overlay.innerHTML = `
        <div class="event-content" style="text-align:center">
            <div style="font-size:18px;margin:12px 0;color:#c4953a;font-weight:bold">GUARDIÃO</div>
            <div style="font-size:18px;font-weight:bold;color:#c4953a;margin-bottom:8px">${boss.en || 'Guardião'}</div>
            <div style="font-size:13px;color:#b0b8c0;margin-bottom:16px;line-height:1.4">${boss.n || 'Um guardião bloqueia a saída!'}</div>
            <div id="boss-choices" style="display:flex;flex-direction:column;gap:8px"></div>
        </div>`;

    const choicesDiv = overlay.querySelector('#boss-choices');
    // Fight (direct combat)
    const fightBtn = document.createElement('button');
    fightBtn.className = 'v-btn v-btn-primary';
    fightBtn.innerHTML = 'Lutar';
    fightBtn.onclick = () => {
        overlay.classList.remove('active');
        triggerCombat({ combat: { en: boss.en, ei: boss.ei, b: boss.b || S.biome, d: boss.d || S.dangerLevel } });
        S._bossDefeated = true; saveState();
    };
    choicesDiv.appendChild(fightBtn);

    // Stealth bypass (skill check)
    const stealthBtn = document.createElement('button');
    stealthBtn.className = 'v-btn';
    stealthBtn.innerHTML = `Esgueirar <span style="font-size:11px;opacity:0.7">(${Math.round(stealthChance)}%)</span>`;
    stealthBtn.onclick = () => {
        const roll = rollD20('normal');
        const total = roll + stealthMod;
        if (total >= stealthDC) {
            overlay.innerHTML = `<div class="event-content" style="text-align:center">
                <div style="font-size:28px;margin:20px 0;color:#6a8">${roll}+${stealthMod} = ${total} vs DC ${stealthDC}</div>
                <div style="color:#6a8;font-size:16px">Você passa sem ser notado!</div></div>`;
            S._bossDefeated = true; saveState();
            S.xpEarned += 10;
            setTimeout(() => { overlay.classList.remove('active'); _showPortalSummary(); }, 2000);
        } else {
            overlay.innerHTML = `<div class="event-content" style="text-align:center">
                <div style="font-size:28px;margin:20px 0;color:#a66">${roll}+${stealthMod} = ${total} vs DC ${stealthDC}</div>
                <div style="color:#a66;font-size:16px">Detectado! O guardião ataca!</div></div>`;
            S._bossDefeated = true; saveState();
            setTimeout(() => {
                overlay.classList.remove('active');
                triggerCombat({ combat: { en: boss.en, ei: boss.ei, b: boss.b || S.biome, d: boss.d || S.dangerLevel } });
            }, 2000);
        }
    };
    choicesDiv.appendChild(stealthBtn);

    // Retreat (go back to map)
    const retreatBtn = document.createElement('button');
    retreatBtn.className = 'v-btn';
    retreatBtn.style.opacity = '0.7';
    retreatBtn.innerHTML = 'Recuar';
    retreatBtn.onclick = () => { overlay.classList.remove('active'); };
    choicesDiv.appendChild(retreatBtn);

    overlay.classList.add('active');
    try { if (tg) tg.HapticFeedback.notificationOccurred('warning'); } catch (e) { console.warn('[EXPLORE] haptic:', e); }
}

function _showPortalSummary() {
    const overlay = document.getElementById('portal-overlay');
    const summary = document.getElementById('portal-summary');

    let html = '';
    if (S.xpEarned > 0) html += `<div class="reward-line">+${S.xpEarned} XP</div>`;
    if (S.goldEarned > 0) html += `<div class="reward-line">+${S.goldEarned} Ouro</div>`;
    if (S.hpChange > 0) html += `<div class="reward-line">+${S.hpChange} HP</div>`;
    else if (S.hpChange < 0) html += `<div class="reward-line">${S.hpChange} HP</div>`;
    if (S.itemsFound.length > 0) html += `<div class="reward-line">${S.itemsFound.length} itens</div>`;
    html += `<div style="margin-top:8px;color:#8a8090">${S.visited.size} turnos</div>`;

    summary.innerHTML = html;
    overlay.classList.add('active');
    try { if (tg) tg.HapticFeedback.notificationOccurred('success'); } catch (e) { console.warn('[EXPLORE] haptic:', e); }

    let _portalDone = false;
    const skipBtn = document.getElementById('portal-skip-btn');
    const finishPortal = () => {
        if (_portalDone) return; _portalDone = true;
        if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
        finishExploration('finished');
    };
    setTimeout(() => { if (!_portalDone && skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = finishPortal; } }, 500);
    setTimeout(finishPortal, 2500);
}

// ═══════════════════════════════════════════════════════
// RANDOM ENCOUNTERS
// ═══════════════════════════════════════════════════════
function showRandomEncounter(enc) {
    // Screen shake on map viewport
    const viewport = document.getElementById('map-viewport');
    if (viewport) {
        viewport.classList.add('screen-shake');
        setTimeout(() => viewport.classList.remove('screen-shake'), 500);
    }

    // Double flash effect
    const flash = document.createElement('div');
    flash.className = 'encounter-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 700);

    try { if (tg) tg.HapticFeedback.impactOccurred('heavy'); } catch (e) { console.warn('[EXPLORE] haptic:', e); }

    const overlay = document.getElementById('encounter-overlay');
    document.getElementById('enc-icon').textContent = '';
    document.getElementById('enc-title').textContent = enc.title || 'Encontro!';

    const ENC_TYPE_LABELS = { amb: 'Emboscada', trp: 'Armadilha', hid: 'Descoberta', snd: 'Ameaça', wth: 'Clima' };
    document.getElementById('enc-type').textContent = ENC_TYPE_LABELS[enc.type] || 'Surpresa';

    const narrEl = document.getElementById('enc-narration');
    const choicesEl = document.getElementById('enc-choices');
    choicesEl.innerHTML = '';

    typewriter(narrEl, enc.narration || '', () => {
        (enc.choices || []).forEach((ch, idx) => {
            const btn = document.createElement('button');
            btn.className = 'dm-choice-btn';

            let html = `<span class="choice-icon"></span>`;
            html += `<span class="choice-label">${ch.t || ch.l || 'Agir'}</span>`;

            // cmb_direct choices (e.g., "Atacar") — no stat check, trigger combat
            // No-check safe choices (e.g., "Preparar Defesa") — direct outcome
            if (ch.cmb_direct || !ch.k) {
                // No stat check display for direct actions
            } else {
                const check = ch.k;
                const statShort = STAT_SHORT[check.s] || check.s.toUpperCase();
                const proficient = S.charData && S.charData.sp && S.charData.sp.includes(check.s);
                const profMark = proficient ? '★' : '';
                const mode = getRollMode(check);
                const modeMark = mode === 'advantage' ? ' ▲' : mode === 'disadvantage' ? ' ▼' : '';
                const mod = check.m || 0;
                const chance = Math.max(5, Math.min(95, Math.round(((21 - check.dc + mod) / 20) * 100)));
                html += `<span class="choice-check${mode !== 'normal' ? ' ' + mode : ''}">${statShort}${profMark}${modeMark} ${chance}%</span>`;
            }

            btn.innerHTML = html;
            btn.addEventListener('click', () => {
                overlay.classList.remove('active');
                logMoveEvent([{ type: 'encounter', enc_type: enc.type, choice: idx }]);

                const encPoi = { id: -1, choices: [], combat: enc.combat || null, type: 'enc' };

                if (ch.cmb_direct && enc.combat) {
                    // Direct combat — skip stat check entirely
                    triggerCombat(encPoi);
                } else if (ch.k) {
                    // Stat check with possible cmb_on_fail escalation
                    const enhanced = Object.assign({}, ch);
                    if (!enhanced.f) {
                        enhanced.f = {
                            t: 'A tentativa falhou!',
                            d: Math.max(1, Math.ceil(S.dangerLevel * 1.5)),
                        };
                    }
                    performStatCheck(encPoi, enhanced);
                } else {
                    // Safe choice — apply outcome directly
                    applyOutcome(encPoi, ch.o || {}, ch);
                }
            });
            choicesEl.appendChild(btn);
        });
    });

    overlay.classList.add('active');
}

// ═══════════════════════════════════════════════════════
// DM INTRO
// ═══════════════════════════════════════════════════════
function showDMIntro(text) {
    const overlay = document.getElementById('dm-overlay');  // kept for header hide
    // Hide the header (icon, title, badge) — DM intro is ambient narration, not an NPC
    const header = overlay.querySelector('.dm-header');
    if (header) header.style.display = 'none';

    // activateOverlay clears dm-choices + dm-narration before showing
    activateOverlay('dm-overlay');

    const narrEl = document.getElementById('dm-narration');
    const choicesEl = document.getElementById('dm-choices');

    typewriter(narrEl, text, () => {
        const btn = document.createElement('button');
        btn.className = 'dm-choice-btn';
        btn.innerHTML = '<span class="choice-icon"></span><span class="choice-label">Explorar</span>';
        btn.addEventListener('click', () => {
            overlay.classList.remove('active');
            // Restore header for next POI event usage
            if (header) header.style.display = '';
        });
        choicesEl.appendChild(btn);
    });
}

// ═══════════════════════════════════════════════════════
// TERRAIN TOAST & ENVIRONMENTAL HAZARDS (D&D 5e Phase 2)
// ═══════════════════════════════════════════════════════

// Terrain toast color themes
const TOAST_STYLES = {
    difficult: 'background:rgba(220,160,40,0.2);border:1px solid rgba(220,160,40,0.4);color:#dca028',
    ranger: 'background:rgba(68,170,100,0.2);border:1px solid rgba(68,170,100,0.4);color:#4aa664',
    damage: 'background:rgba(200,60,60,0.25);border:1px solid rgba(200,60,60,0.5);color:#c44',
    condition: 'background:rgba(170,68,68,0.2);border:1px solid rgba(170,68,68,0.4);color:#c88',
    flavor: 'background:rgba(50,44,58,0.95);border:1px solid rgba(196,149,58,0.4);color:#ddd4c6;font-style:italic;font-size:12px;letter-spacing:0.3px;box-shadow:0 2px 12px rgba(0,0,0,0.5)',
};

// Compact toast notification for terrain effects
function showTerrainToast(message, type) {
    const existing = document.getElementById('terrain-toast-el');
    if (existing) existing.remove();

    const theme = TOAST_STYLES[type] || TOAST_STYLES.difficult;
    const toast = document.createElement('div');
    toast.id = 'terrain-toast-el';
    toast.textContent = message;
    toast.style.cssText = 'position:fixed;top:50px;left:50px;right:50px;' +
        'padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700;' +
        'pointer-events:none;z-index:99999;text-align:center;' + theme;
    document.body.appendChild(toast);

    const duration = type === 'flavor' ? 2500 : 1500;
    setTimeout(() => toast.remove(), duration);
}

// Full-screen color flash for hazard damage
function flashScreen(color) {
    const flash = document.createElement('div');
    flash.style.cssText = `position:fixed;inset:0;background:${color};z-index:199;pointer-events:none;`;
    flash.style.animation = 'encounterFlash 0.6s ease-out forwards';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 700);
}

// Check if current hex has an environmental hazard
function checkHazard(col, row) {
    if (!S._hazardsTriggered) S._hazardsTriggered = new Set();
    const key = `${col},${row}`;
    if (S._hazardsTriggered.has(key)) return null;

    const tile = S.grid[row] && S.grid[row][col] ? S.grid[row][col] : '.';
    const baseTile = tile.match(/[0-9@E]/) ? '.' : tile;

    // Lava adjacency — CON save DC 12, 1d4 fire damage
    const neighbors = getNeighbors(col, row);
    const nearLava = neighbors.some(([c, r]) => {
        const t = S.grid[r] && S.grid[r][c] ? S.grid[r][c] : '.';
        return t === 'L';
    });
    if (nearLava) {
        S._hazardsTriggered.add(key);
        return {
            type: 'lava', stat: 'cn', dc: 12,
            label: 'Calor Intenso',
            desc: 'O calor abrasador da lava próxima queima sua pele.',
            failEffect: 'fire_damage',
        };
    }

    // Swamp mud — CON save DC 10, poisoned 3 steps
    if (baseTile === 'm' && S.biome === 'swamp') {
        S._hazardsTriggered.add(key);
        return {
            type: 'swamp', stat: 'cn', dc: 10,
            label: 'Miasma Tóxico',
            desc: 'Vapores tóxicos emanam do pântano.',
            failEffect: 'poisoned',
        };
    }

    // Ice — DEX save DC 11, prone (next move slow)
    if (baseTile === 'i') {
        S._hazardsTriggered.add(key);
        return {
            type: 'ice', stat: 'dx', dc: 11,
            label: 'Gelo Escorregadio',
            desc: 'O chão congelado ameaça fazê-lo escorregar.',
            failEffect: 'prone',
        };
    }

    return null;
}

// Automatic saving throw for environmental hazards
function showHazardCheck(hazard) {
    const mod = getAbilityMod(hazard.stat);

    // D&D 5e: poisoned gives disadvantage on ability checks (saves too)
    const mode = hasCondition('poisoned') ? 'disadvantage' : 'normal';
    const { roll, r1, r2 } = rollD20(mode);

    const total = roll + mod;
    const success = total >= hazard.dc;

    S.checksPerformed.push({
        stat: hazard.stat, dc: hazard.dc, roll: roll, mod: mod, ok: success, mode: mode,
    });

    const overlay = document.getElementById('check-overlay');
    const formulaEl = document.getElementById('check-formula');
    const resultEl = document.getElementById('check-result');

    const statName = STAT_NAMES[hazard.stat] || hazard.stat;

    formulaEl.innerHTML = '';
    resultEl.textContent = '';
    resultEl.className = 'check-result';
    overlay.classList.add('active');

    // 3D dice animation
    const dice = getDice3D();
    if (dice) {
        // Show advantage/disadvantage label
        const wrapper = document.getElementById('dice3d-wrapper');
        wrapper.classList.remove('has-mode-label');
        let modeLabel = wrapper.querySelector('.roll-mode-label-3d');
        if (modeLabel) modeLabel.remove();
        if (r2 !== null) {
            wrapper.classList.add('has-mode-label');
            const cls = mode === 'advantage' ? 'adv' : 'dis';
            const label = mode === 'advantage' ? 'VANTAGEM' : 'DESVANTAGEM';
            modeLabel = document.createElement('div');
            modeLabel.className = `roll-mode-label-3d ${cls}`;
            modeLabel.textContent = label;
            wrapper.insertBefore(modeLabel, wrapper.firstChild);
        }

        dice.roll(roll, () => {
            const formulaStr = buildFormula(roll, mod, statName, '', hazard.dc, total, r1, r2, mode);
            formulaEl.innerHTML =
                `<span style="color:var(--v-gold);font-size:14px">${hazard.label}</span><br>` + formulaStr;

            resultEl.textContent = success ? 'Resistiu!' : 'Falhou!';
            resultEl.className = 'check-result ' + (success ? 'success' : 'failure');

            try {
                if (tg) tg.HapticFeedback.notificationOccurred(success ? 'success' : 'error');
            } catch (e) { console.warn('[EXPLORE] haptic:', e); }

            _showHazardSkip(overlay, success, hazard);
        });
    } else {
        _showHazardEmojiFallback(overlay, roll, r1, r2, mode, mod, statName, hazard, total, success);
    }
}

function _showHazardSkip(overlay, success, hazard) {
    let _hazDone = false;
    const skipBtn = document.getElementById('check-skip-btn');

    const finishHazard = () => {
        if (_hazDone) return;
        _hazDone = true;
        if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
        disposeDice3D();
        overlay.classList.remove('active');
        if (!success) {
            applyHazardEffect(hazard);
            if (checkDeath()) return;
            if (checkLowHP()) { saveState(); return; }
            if (checkHazardCombat()) { saveState(); return; }
        }
        saveState();
    };

    setTimeout(() => {
        if (!_hazDone && skipBtn) {
            skipBtn.classList.add('visible');
            skipBtn.onclick = finishHazard;
        }
    }, 500);

    setTimeout(finishHazard, 2500);
}

function _showHazardEmojiFallback(overlay, roll, r1, r2, mode, mod, statName, hazard, total, success) {
    const formulaEl = document.getElementById('check-formula');
    const resultEl = document.getElementById('check-result');
    const wrapper = document.getElementById('dice3d-wrapper');

    const icon = r2 !== null ? buildDiceHTML(r1, r2, mode) : hazard.label.split(' ')[0];
    wrapper.innerHTML = `<div class="dice-display-fallback" style="font-size:64px;text-align:center;animation:diceRoll 0.7s ease">${icon}</div>`;

    const formulaStr = buildFormula(roll, mod, statName, '', hazard.dc, total, r1, r2, mode);
    formulaEl.innerHTML =
        `<span style="color:var(--v-gold);font-size:14px">${hazard.label}</span><br>` + formulaStr;

    setTimeout(() => {
        const fb = wrapper.querySelector('.dice-display-fallback');
        if (fb && r2 === null) {
            fb.textContent = roll <= 1 ? 'Falha Critica' : roll >= 20 ? 'Critico!' : roll;
        }
        resultEl.textContent = success ? 'Resistiu!' : 'Falhou!';
        resultEl.className = 'check-result ' + (success ? 'success' : 'failure');

        try {
            if (tg) tg.HapticFeedback.notificationOccurred(success ? 'success' : 'error');
        } catch (e) { console.warn('[EXPLORE] haptic:', e); }

        _showHazardSkip(overlay, success, hazard);
    }, 700);
}

// Apply hazard consequences on failed save
function applyHazardEffect(hazard) {
    if (hazard.failEffect === 'fire_damage') {
        const dmg = Math.floor(Math.random() * 4) + 1; // 1d4
        S.hpChange -= dmg;
        if (S.charData) {
            const newHP = Math.max(0, S.charData.hp + S.hpChange);
            updateHP(newHP, S.charData.mh);
        }
        flashScreen('rgba(200,60,60,0.3)');
        showTerrainToast(`-${dmg} HP (fogo)`, 'damage');
    }
    if (hazard.failEffect === 'poisoned') {
        S.conditions.push({ type: 'poisoned', stepsLeft: 3 });
        showTerrainToast('Envenenado! (3 turnos)', 'condition');
    }
    if (hazard.failEffect === 'prone') {
        S.conditions.push({ type: 'prone', stepsLeft: 1 });
        showTerrainToast('Escorregou!', 'condition');
    }
    updateConditionHUD();
    updateRewards();
    logMoveEvent([{ type: 'hazard', effect: hazard.failEffect, source: hazard.type }]);

    // 25% chance: hazard noise attracts nearby creatures
    if (Math.random() < 0.25 && S.encounters && S.encounters.length > 0) {
        const enc = S.encounters.pop();
        const combat = enc.cb || { en: 'Criatura', ei: '', b: S.biome, d: S.dangerLevel };
        S._hazardCombatPending = { combat };
    }
}

// Called after hazard overlay closes to trigger attracted combat
function checkHazardCombat() {
    if (!S._hazardCombatPending) return false;
    const data = S._hazardCombatPending;
    S._hazardCombatPending = null;
    showTerrainToast('O barulho atraiu criaturas!', 'danger');
    setTimeout(() => triggerCombat({ combat: data.combat }), 1500);
    return true;
}

// ═══════════════════════════════════════════════════════
// INVENTORY USAGE (potions, consumables, food)
// ═══════════════════════════════════════════════════════
function useInventoryItem(item) {
    if (!item || item.q <= 0) return 0;
    // Decrement local copy
    item.q--;
    // Roll healing (if any)
    let heal = 0;
    if (item.h && item.h !== '0') {
        heal = rollDiceFormula(item.h);
    }
    if (heal > 0) {
        S.hpChange += heal;
        if (S.charData) {
            const newHP = Math.min(S.charData.mh, S.charData.hp + S.hpChange);
            updateHP(newHP, S.charData.mh);
        }
    }
    // Track consumption for backend
    const existing = S.inventoryUsed.find(u => u.name === item.n);
    if (existing) { existing.qty++; }
    else { S.inventoryUsed.push({ name: item.n, type: item.t, qty: 1 }); }
    // Log
    logMoveEvent([{ type: 'use_item', item: item.n, heal: heal }]);
    updateRewards();
    saveState();
    return heal;
}

// Animated version: shows 3D dice roll, then calls onDone(heal)
let _healDice = null;
function useInventoryItemAnimated(item, onDone) {
    if (!item || item.q <= 0) { if (onDone) onDone(0); return; }
    // Parse formula to get die type
    const formula = item.h || '0';
    const match = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) {
        // No dice formula — use sync version
        const heal = useInventoryItem(item);
        if (onDone) onDone(heal);
        return;
    }

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const dieType = 'd' + sides;

    // Roll the dice first
    const heal = useInventoryItem(item);
    // Determine individual roll value (for single die)
    const bonus = parseInt(match[3]) || 0;
    const rollVal = Math.max(1, Math.min(sides, heal - bonus));

    const overlay = document.getElementById('heal-dice-overlay');
    const canvas = document.getElementById('heal-dice-canvas');
    const label = document.getElementById('heal-dice-label');
    const title = document.getElementById('heal-dice-title');

    if (!overlay || !canvas || typeof Dice3D === 'undefined') {
        if (onDone) onDone(heal);
        return;
    }

    title.textContent = item.n || 'CURA';
    label.textContent = '';
    overlay.classList.add('active');

    try {
        if (_healDice) { _healDice.dispose(); _healDice = null; }
        _healDice = new Dice3D(canvas, { size: 140, dieType: dieType, duration: 1000 });
    } catch (e) {
        console.warn('[EXPLORE] Heal Dice3D init failed:', e);
        overlay.classList.remove('active');
        if (onDone) onDone(heal);
        return;
    }

    _healDice.roll(rollVal, function () {
        label.textContent = `+${heal} HP`;
        try { if (tg) tg.HapticFeedback.impactOccurred('medium'); } catch (e) {}

        setTimeout(function () {
            overlay.classList.remove('active');
            if (_healDice) { _healDice.dispose(); _healDice = null; }
            if (onDone) onDone(heal);
        }, 1000);
    });
}

// Get available healing items (potions + consumables with h > 0)
function getHealingItems() {
    return S.inventory.filter(i => i.q > 0 && i.h && i.h !== '0');
}

// Get available food items (for camping)
function getFoodItems() {
    return S.inventory.filter(i => i.q > 0 && i.t === 'food');
}

// ═══════════════════════════════════════════════════════
// EXIT RISK ASSESSMENT (replaces simple exit confirm)
// ═══════════════════════════════════════════════════════
function showExitRiskAssessment() {
    const overlay = document.getElementById('exit-risk-overlay');
    const hpRow = document.getElementById('exit-hp-row');
    const infoRow = document.getElementById('exit-info-row');
    const optionsEl = document.getElementById('exit-options');

    const currentHP = getCurrentHP();
    const maxHP = getMaxHP();
    const hpPct = getHPPercent();
    const distance = bfsDistanceToExit(S.playerCol, S.playerRow);
    const risk = calculateExitRisk(distance);

    // HP bar
    const hpColor = hpPct > 60 ? '#4a8' : hpPct > 25 ? '#dca028' : '#c44';
    hpRow.innerHTML = `<span>HP</span>` +
        `<div class="exit-hp-bar"><div class="exit-hp-fill" style="width:${Math.max(2, hpPct)}%;background:${hpColor}"></div></div>` +
        `<span>${currentHP}/${maxHP}</span>`;

    // Info: distance + risk + estimated encounters
    const distText = distance >= 0 ? `${distance} turnos` : '???';
    const dangerLvl = S.dangerLevel || 1;
    const estEnc = distance > 0 ? Math.max(1, Math.round(distance * dangerLvl * 0.04)) : 0;
    const encText = estEnc > 0 ? `<span>~${estEnc} encontro${estEnc > 1 ? 's' : ''}</span>` : '';
    infoRow.innerHTML = `<span>${distText} até a saída</span>` +
        `<span style="color:${risk.color}">Risco: ${risk.label} (${risk.chance}%)</span>` +
        encText;

    // Build options
    optionsEl.innerHTML = '';

    // Option 1: Return to city (with encounter chance on the way back)
    addExitOption(optionsEl, '', 'Retornar à Cidade',
        distance >= 0 ? `Jornada de ${distance} turnos, ${risk.chance}% risco` : 'Rota desconhecida',
        risk.color, () => {
            overlay.classList.remove('active');
            attemptReturnToCity(risk.chance);
        });

    // Option 2: Use healing potion (if available and HP < 100%)
    const healItems = getHealingItems();
    if (healItems.length > 0 && hpPct < 100) {
        const best = healItems[0];
        addExitOption(optionsEl, best.e || '', `Usar ${best.n} (${best.q}x)`,
            `Restaura ${best.h} HP`, '#4a8', () => {
                overlay.classList.remove('active');
                useInventoryItemAnimated(best, (heal) => {
                    showTerrainToast(`${best.e || ''} +${heal} HP`, 'ranger');
                    setTimeout(() => showExitRiskAssessment(), 300);
                });
            });
    }

    // Option 3: Camp (if has food items)
    const foodItems = getFoodItems();
    if (foodItems.length > 0) {
        addExitOption(optionsEl, '', 'Montar Acampamento',
            'Descanso Curto: 1d8 + CON', '#4a8', () => {
                overlay.classList.remove('active');
                showCampOverlay();
            });
    }

    // Option 4: Continue exploring (always)
    addExitOption(optionsEl, '', 'Continuar Explorando',
        'Voltar ao mapa', '#8a8090', () => {
            overlay.classList.remove('active');
        });

    overlay.classList.add('active');
}

function addExitOption(container, icon, title, desc, color, onClick) {
    const btn = document.createElement('button');
    btn.className = 'exit-option-btn';
    btn.innerHTML = `<span class="exit-option-icon">${icon}</span>` +
        `<div class="exit-option-info">` +
        `<div class="exit-option-title">${title}</div>` +
        `<div class="exit-option-desc" style="color:${color}">${desc}</div>` +
        `</div>`;
    btn.addEventListener('click', onClick);
    container.appendChild(btn);
}

// ═══════════════════════════════════════════════════════
// CAMP SYSTEM (Short Rest with food)
// ═══════════════════════════════════════════════════════
function showCampOverlay() {
    const overlay = document.getElementById('camp-overlay');
    const foodList = document.getElementById('camp-food-list');
    foodList.innerHTML = '';

    const foodItems = getFoodItems();
    for (const food of foodItems) {
        const btn = document.createElement('button');
        btn.className = 'camp-food-btn';
        const healText = food.h && food.h !== '0' ? ` (+${food.h} HP)` : '';
        btn.innerHTML = `<span style="font-size:14px;color:#c4953a;font-weight:bold">${food.n ? food.n[0] : '•'}</span>` +
            `<div style="flex:1"><div style="font-weight:600">${food.n} (${food.q}x)</div>` +
            `<div style="font-size:11px;color:#8a8090">Refeição${healText}</div></div>`;
        btn.addEventListener('click', () => {
            overlay.classList.remove('active');
            doCampRest(food);
        });
        foodList.appendChild(btn);
    }

    // Option to rest without food
    const noFoodBtn = document.createElement('button');
    noFoodBtn.className = 'camp-food-btn';
    noFoodBtn.innerHTML = `<span style="font-size:14px;color:#8a7a68;font-weight:bold">—</span>` +
        `<div style="flex:1"><div style="font-weight:600">Descansar sem comer</div>` +
        `<div style="font-size:11px;color:#8a8090">Apenas 1d8 + CON</div></div>`;
    noFoodBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
        doCampRest(null);
    });
    foodList.appendChild(noFoodBtn);

    overlay.classList.add('active');
}

function closeCampOverlay() {
    document.getElementById('camp-overlay').classList.remove('active');
}

function doCampRest(food) {
    // D&D 5e Short Rest: 1d8 hit die + CON modifier
    const hitDie = rollDiceFormula('1d8');
    const conMod = getAbilityMod('cn');
    const baseHeal = Math.max(1, hitDie + conMod);

    // Food bonus
    let foodBonus = 0;
    let foodName = 'sem refeição';
    if (food) {
        foodName = food.n;
        if (food.h && food.h !== '0') {
            foodBonus = rollDiceFormula(food.h);
        }
        // Consume the food
        useInventoryItem(food);
    }

    const totalHeal = baseHeal + foodBonus;
    S.hpChange += totalHeal;
    if (S.charData) {
        const newHP = Math.min(S.charData.mh, S.charData.hp + S.hpChange);
        updateHP(newHP, S.charData.mh);
    }

    logMoveEvent([{ type: 'camp', heal: totalHeal, food: foodName }]);
    updateRewards();
    saveState();

    // Show 3D d8 dice animation before result
    _showCampDiceRoll(hitDie, conMod, foodBonus, totalHeal, foodName);
}

let _campDice = null;
function _showCampDiceRoll(roll, conMod, bonus, total, foodName) {
    const overlay = document.getElementById('camp-dice-overlay');
    const canvas = document.getElementById('camp-dice-canvas');
    const label = document.getElementById('camp-dice-label');

    if (!overlay || !canvas) {
        showCampResultOverlay(roll, conMod, bonus, total, foodName);
        return;
    }

    label.textContent = '';
    overlay.classList.add('active');

    try {
        if (_campDice) { _campDice.dispose(); _campDice = null; }
        _campDice = new Dice3D(canvas, { size: 140, dieType: 'd8', duration: 1200 });
    } catch (e) {
        console.warn('[EXPLORE] Camp Dice3D init failed:', e);
        overlay.classList.remove('active');
        showCampResultOverlay(roll, conMod, bonus, total, foodName);
        return;
    }

    _campDice.roll(roll, function () {
        const sign = conMod >= 0 ? '+' : '';
        label.textContent = `1d8 = ${roll} ${sign}${conMod} (CON)`;
        try { if (tg) tg.HapticFeedback.impactOccurred('medium'); } catch (e) {}

        setTimeout(function () {
            overlay.classList.remove('active');
            if (_campDice) { _campDice.dispose(); _campDice = null; }
            showCampResultOverlay(roll, conMod, bonus, total, foodName);
        }, 1200);
    });
}

function showCampResultOverlay(roll, conMod, bonus, total, foodName) {
    const overlay = document.getElementById('camp-result-overlay');
    document.getElementById('camp-result-text').textContent = `+${total} HP Restaurados`;

    const sign = conMod >= 0 ? '+' : '';
    let detail = `1d8 = ${roll} ${sign} ${conMod} (CON) = ${roll + conMod}`;
    if (bonus > 0) {
        detail += `\n${foodName}: +${bonus} HP`;
    }
    detail += `\n\nHP: ${getCurrentHP()}/${getMaxHP()}`;
    document.getElementById('camp-result-detail').textContent = detail;

    overlay.classList.add('active');
    try { if (tg) tg.HapticFeedback.notificationOccurred('success'); } catch (e) { console.warn('[EXPLORE] haptic:', e); }
}

function closeCampResult() {
    document.getElementById('camp-result-overlay').classList.remove('active');
    // Reset low HP alert flag so it can trigger again after camp
    S._lowHPAlertShown = false;

    // Night ambush check — triggers after rest overlay closes
    if (S.campAmbush && !S._campAmbushUsed) {
        S._campAmbushUsed = true;
        saveState();
        showTerrainToast('Algo ataca durante seu descanso!', 'danger');
        setTimeout(() => {
            triggerCombat({ combat: S.campAmbush });
        }, 1500);
        return;
    }

    // If camping during return journey, resume the journey
    if (_returningToCity && _returnJourney) {
        setTimeout(() => {
            document.getElementById('return-journey-overlay').classList.add('active');
            _renderReturnHP(document.getElementById('return-journey-hp'));
            const remaining = _returnJourney.totalSteps - _returnJourney.currentStep;
            const actionsEl = document.getElementById('return-journey-actions');
            const overlay = document.getElementById('return-journey-overlay');
            _addReturnActions(actionsEl, overlay, remaining);
        }, 400);
    }
}

// ═══════════════════════════════════════════════════════
// LOW HP ALERT (HP <= 25%)
// ═══════════════════════════════════════════════════════
function checkLowHP() {
    const pct = getHPPercent();
    if (pct > 25 || pct <= 0) return false;
    if (S._lowHPAlertShown) return false;
    S._lowHPAlertShown = true;
    showLowHPOverlay();
    return true;
}

function showLowHPOverlay() {
    const overlay = document.getElementById('lowhp-overlay');
    const hpRow = document.getElementById('lowhp-hp-row');
    const optionsEl = document.getElementById('lowhp-options');

    const currentHP = getCurrentHP();
    const maxHP = getMaxHP();
    const hpPct = getHPPercent();
    const distance = bfsDistanceToExit(S.playerCol, S.playerRow);
    const risk = calculateExitRisk(distance);

    // HP bar (red tint)
    hpRow.innerHTML = `<span>HP</span>` +
        `<div class="exit-hp-bar"><div class="exit-hp-fill" style="width:${Math.max(2, hpPct)}%;background:#c44"></div></div>` +
        `<span style="color:#c44">${currentHP}/${maxHP}</span>`;

    // Build options
    optionsEl.innerHTML = '';

    // Option 1: Use healing potion (priority)
    const healItems = getHealingItems();
    for (const item of healItems.slice(0, 2)) {
        addExitOption(optionsEl, item.e || '', `Usar ${item.n} (${item.q}x)`,
            `Restaura ${item.h} HP`, '#4a8', () => {
                overlay.classList.remove('active');
                useInventoryItemAnimated(item, (heal) => {
                    showTerrainToast(`${item.e || ''} +${heal} HP`, 'ranger');
                    S._lowHPAlertShown = false;
                });
            });
    }

    // Option 2: Return to city (multi-step journey)
    const distText = distance >= 0 ? `${distance} turnos` : '???';
    addExitOption(optionsEl, '', `Retornar (${distText})`,
        `Risco: ${risk.label} (${risk.chance}%)`, risk.color, () => {
            overlay.classList.remove('active');
            attemptReturnToCity(risk.chance);
        });

    // Option 3: Continue exploring
    addExitOption(optionsEl, '', 'Continuar Explorando',
        'Arriscar seguir adiante', '#8a8090', () => {
            overlay.classList.remove('active');
        });

    overlay.classList.add('active');
    try { if (tg) tg.HapticFeedback.notificationOccurred('warning'); } catch (e) { console.warn('[EXPLORE] haptic:', e); }
}

// ═══════════════════════════════════════════════════════
// D&D 5e DEATH SAVING THROWS (PHB p.197)
// ═══════════════════════════════════════════════════════
function checkDeath() {
    if (!S.charData) return false;
    const currentHP = S.charData.hp + S.hpChange;
    if (currentHP <= 0) {
        showDeathSaves();
        return true;
    }
    return false;
}

function showDeathSaves() {
    const overlay = document.getElementById('death-overlay');
    const summary = document.getElementById('death-summary');
    overlay.classList.add('active');
    try { if (tg) tg.HapticFeedback.notificationOccurred('error'); } catch (e) { console.warn('[EXPLORE] haptic:', e); }

    let successes = 0, failures = 0, rollNum = 0;
    let _done = false;

    function renderState(roll, isResult) {
        const sMarks = '●'.repeat(successes) + '○'.repeat(3 - successes);
        const fMarks = '●'.repeat(failures) + '○'.repeat(3 - failures);
        let html = `<div style="text-align:center;margin-bottom:12px">
            <div style="font-size:20px;margin-bottom:8px">Salvaguardas contra Morte</div>
            <div style="font-size:14px;color:#6a8">✓ ${sMarks}</div>
            <div style="font-size:14px;color:#a66">✗ ${fMarks}</div>
        </div>`;
        if (roll !== null) {
            const color = roll === 20 ? '#ffd700' : roll === 1 ? '#ff3333' : roll >= 10 ? '#6a8' : '#a66';
            html += `<div style="text-align:center;margin:12px 0">
                <div class="dice-result" style="font-size:28px;color:${color}">${roll}</div>
                <div style="font-size:12px;color:#8a8090;margin-top:4px">Rolagem ${rollNum}</div>
            </div>`;
        }
        if (isResult) {
            if (successes >= 3) {
                html += `<div style="text-align:center;color:#6a8;font-size:16px;margin-top:12px">
                    Estabilizado! Você acorda com 1 HP.</div>`;
            } else if (failures >= 3) {
                html += `<div style="text-align:center;color:#a66;font-size:16px;margin-top:12px">
                    Você sucumbe aos ferimentos...</div>`;
            } else if (roll === 20) {
                html += `<div style="text-align:center;color:#ffd700;font-size:16px;margin-top:12px">
                    Crítico Natural! Você se levanta com 1 HP!</div>`;
            }
        }
        summary.innerHTML = html;
    }

    function rollDeathSave() {
        if (_done) return;
        rollNum++;
        const roll = Math.floor(Math.random() * 20) + 1;

        if (roll === 20) {
            // Nat 20: regain 1 HP, continue exploring
            successes = 3;
            renderState(roll, true);
            setTimeout(() => {
                if (_done) return; _done = true;
                overlay.classList.remove('active');
                S.hpChange = -(S.charData.hp - 1); // Set to exactly 1 HP
                updateHP(1);
                saveState();
            }, 2500);
            return;
        }
        if (roll === 1) { failures += 2; } // Nat 1 = 2 failures (PHB p.197)
        else if (roll >= 10) { successes++; }
        else { failures++; }

        renderState(roll, successes >= 3 || failures >= 3);

        if (successes >= 3) {
            // Stabilized: wake with 1 HP
            setTimeout(() => {
                if (_done) return; _done = true;
                overlay.classList.remove('active');
                S.hpChange = -(S.charData.hp - 1);
                updateHP(1);
                saveState();
            }, 2500);
        } else if (failures >= 3) {
            // Dead: temple rescue
            setTimeout(() => {
                if (_done) return; _done = true;
                finishExploration('death');
            }, 2500);
        } else {
            // Continue rolling after delay
            setTimeout(rollDeathSave, 1500);
        }
    }

    renderState(null, false);
    setTimeout(rollDeathSave, 1000);
}

function showDeathOverlay() {
    // Legacy fallback — immediate death without saves
    const overlay = document.getElementById('death-overlay');
    const summary = document.getElementById('death-summary');
    let html = '';
    if (S.xpEarned > 0) html += `<div class="reward-line">+${S.xpEarned} XP</div>`;
    if (S.goldEarned > 0) html += `<div class="reward-line">+${S.goldEarned} Ouro</div>`;
    html += `<div class="reward-line">HP reduzido a 0</div>`;
    summary.innerHTML = html;
    overlay.classList.add('active');
    let _deathDone = false;
    const skipBtn = document.getElementById('death-skip-btn');
    const finishDeath = () => {
        if (_deathDone) return; _deathDone = true;
        if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
        finishExploration('death');
    };
    setTimeout(() => { if (!_deathDone && skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = finishDeath; } }, 500);
    setTimeout(finishDeath, 2500);
}

// ═══════════════════════════════════════════════════════
// FINISH
// ═══════════════════════════════════════════════════════
// RETURN JOURNEY — immersive multi-step travel to city
// ═══════════════════════════════════════════════════════
let _returningToCity = false;
let _returnJourney = null;
let _returnDice = null;

// Biome-specific travel narrations
const RETURN_NARRATIONS = {
    forest: [
        'As copas das árvores se fecham sobre a trilha, criando um túnel verde onde a luz do sol mal penetra. Galhos estalam sob seus pés enquanto pássaros silenciam à sua passagem — a floresta observa quem ousa cruzá-la.',
        'Um riacho serpenteia ao lado do caminho, seu murmúrio constante acalma seus nervos. Marcas de garras em uma árvore próxima lembram que você não está sozinho nesta floresta, mas por ora o caminho está livre.',
        'Raízes retorcidas tornam cada passo uma negociação. A trilha foi feita por animais, não por homens — mas é o caminho mais curto de volta. Você se agacha sob um tronco caído e continua.',
        'A luz dourada do entardecer penetra entre os galhos, pintando o chão da floresta com sombras alongadas. O aroma de musgo e terra úmida enche seus pulmões. Por um momento, a jornada quase parece pacífica.',
        'Pegadas de cervos cruzam a trilha em várias direções. A floresta tem seus próprios caminhos e seus próprios viajantes. Ao longe, o canto de um pássaro desconhecido ecoa como um aviso — ou talvez uma despedida.',
    ],
    plains: [
        'O vento varre os campos abertos, dobrando a grama alta em ondas douradas que se estendem até o horizonte. Você caminha pela estrada de terra, sentindo o sol aquecer suas costas. A cidade é apenas um ponto distante, mas cresce a cada passo.',
        'Rebanhos selvagens pastam ao longe, indiferentes à sua passagem. A planície parece infinita sob o céu vasto, e o silêncio só é quebrado pelo farfalhar da grama. Seus pés encontram ritmo na estrada batida por mil viajantes antes de você.',
        'Flores silvestres pontilham os campos, pintando o verde com toques de roxo e amarelo. O aroma doce mistura-se com o cheiro de terra seca. Uma brisa gentil empurra você na direção certa — como se a própria planície quisesse levá-lo de volta.',
        'Uma colina suave revela a vastidão da estrada à frente. Ao longe, fumaça de chaminés sobe preguiçosamente — sinal de civilização. O cansaço da jornada é real, mas seus pés encontram novo vigor com a promessa de um teto seguro.',
        'Nuvens se acumulam no horizonte, projetando sombras enormes sobre os campos. O vento muda de direção, trazendo consigo o cheiro de chuva. Você aperta o passo — melhor chegar antes que a tempestade alcance a estrada.',
    ],
    cave: [
        'O eco de seus passos é o único som nos túneis frios. Gotas de água caem do teto em intervalos regulares, como um relógio subterrâneo contando os minutos até a superfície. Suas mãos deslizam pela parede úmida, seguindo as marcações de giz.',
        'Estalactites gotejam lentamente, criando poças cristalinas que refletem a luz bruxuleante da sua tocha. A passagem se estreita e depois se abre em uma câmara onde o ar é surpreendentemente fresco — um bom sinal de que a saída está próxima.',
        'Cristais incrustados na rocha capturam a luz e a devolvem em faíscas multicoloridas. Por um instante, você para para apreciar a beleza oculta destas profundezas. Mas o caminho chama — e ficar parado demais nestas cavernas nunca é sábio.',
        'Uma corrente de ar gelado atinge seu rosto, trazendo o cheiro inconfundível de vegetação. A superfície está perto. Você acelera o passo, ansioso para trocar a escuridão opressiva pela luz do dia e o ar livre.',
        'Cogumelos luminescentes bordejam o caminho como lanternas fantasmagóricas. Seus tons azulados iluminam formações rochosas que parecem esculturas de algum artista subterrâneo. A natureza cria suas próprias maravilhas, mesmo nas profundezas.',
    ],
    swamp: [
        'A lama suga seus pés a cada passo, relutante em liberá-lo. O ar pesado e úmido enche seus pulmões como um cobertor molhado. Insetos zumbem ao redor, mas você mantém o foco na trilha elevada — o único caminho seguro neste pântano traiçoeiro.',
        'Brumas espessas cobrem a superfície da água estagnada. Você segue as estacas de marcação fincadas por viajantes anteriores, cada uma um testemunho de que outros cruzaram este pântano e sobreviveram. O silêncio é quebrado apenas pelo coaxar distante de sapos.',
        'Raízes de manguezais formam pontes naturais sobre a água escura, seus galhos retorcidos como dedos de uma criatura adormecida. Você equilibra-se sobre elas com cuidado, observando bolhas subindo na lama abaixo — algo se move nas profundezas.',
        'O pântano exala seus gases pútridos enquanto o sol se esforça para penetrar a névoa persistente. Tábuas de madeira apodrecida marcam uma passadeira improvisada. Cada passo é uma aposta, mas você conhece os sinais de madeira podre e avança com cautela.',
        'Luzes fantasmagóricas dançam sobre a superfície da água — fogo-fátuo, dizem os viajantes. Belas, mas traiçoeiras. Você desvia o olhar e mantém os pés firmes na trilha. O pântano já engoliu muitos que se deixaram seduzir por suas luzes.',
    ],
    mountain: [
        'O vento frio corta como lâmina nas passagens altas da montanha. Cada respiração é uma conquista nesta altitude, e seus músculos protestam na subida. Mas a vista panorâmica revela o vale distante onde Eldoria repousa — motivação suficiente para continuar.',
        'Pedras soltas rolam sob seus pés, ecoando pelo desfiladeiro como tambores de guerra. A trilha serpenteia entre paredões de rocha escura, e você se mantém próximo à parede interna. Um olhar para o precipício confirma: não há margem para erro.',
        'Cabras montesas observam sua passagem de uma saliência acima, suas silhuetas recortadas contra o céu cinzento. Elas conhecem estas montanhas melhor que qualquer mapa. Você segue o mesmo caminho que elas trilharam por gerações — o mais seguro.',
        'Uma nascente brota da rocha, sua água gelada e cristalina. Você bebe e enche seu cantil, agradecendo por este pequeno presente da montanha. O frio nas mãos é um preço barato pelo revigor que a água traz aos seus membros cansados.',
        'O caminho desce agora, e cada passo é um alívio depois da longa escalada. As árvores começam a reaparecer, primeiro arbustos raquíticos, depois pinheiros firmes. A montanha está ficando para trás, e com ela, os piores perigos da jornada.',
    ],
    desert: [
        'O sol escaldante castiga a areia interminável. Miragens dançam no horizonte, prometendo oásis que não existem. Você puxa o capuz sobre os olhos e segue as marcações de pedra empilhada — a única prova de que outros já cruzaram esta desolação antes.',
        'Dunas imensas mudam lentamente sob o vento, redesenhando o deserto a cada hora. A areia fina se infiltra em cada fresta da armadura, irritando a pele. Você usa as estrelas e o sol como bússola, mantendo o rumo mesmo quando a trilha desaparece.',
        'Um oásis seco é tudo que resta de uma antiga fonte — ossos brancos de animais ao redor contam a história. Mas adiante, rochas projetam uma sombra abençoada. Você descansa brevemente, recuperando forças antes de enfrentar o próximo trecho exposto.',
        'Lagartos escalam as rochas aquecidas pelo sol, os únicos seres vivos visíveis nesta vastidão. O silêncio é ensurdecedor, quebrado apenas pelo sussurro da areia no vento. Seus passos deixam pegadas que serão apagadas em minutos — o deserto não guarda memórias.',
        'O horizonte finalmente muda. Onde antes havia apenas areia, agora surgem os primeiros arbustos resistentes e, além deles, uma linha verde promissora. O deserto está cedendo terreno. Você sente a umidade no ar aumentar e respira fundo — o pior ficou para trás.',
    ],
    snow: [
        'A neve range sob seus pés com cada passo, um som ritmado que se tornou companhia constante. O frio morde cada pedaço de pele exposta, e sua respiração forma nuvens densas no ar gelado. Mas o caminho está firme — neve compactada por muitas passagens.',
        'Uma trilha de pegadas antigas guia seu caminho entre os montes de neve. Alguém — ou algo — passou por aqui recentemente. Você segue os rastros com cautela, atento a qualquer sinal de perigo, mas agradecido por não ter que abrir caminho na neve virgem.',
        'Pinheiros cobertos de gelo formam uma catedral branca ao redor da trilha. Flocos de neve caem suavemente, cobrindo a paisagem em um silêncio reverente. A beleza é hipnotizante, mas o frio é real — você mantém as mãos em movimento dentro das luvas.',
        'O vento uiva entre os pinheiros, levantando redemoinhos de neve que reduzem a visibilidade. Você se abaixa e avança, usando as árvores como abrigo. Entre as rajadas, consegue vislumbrar a trilha descendo — sinal de que está deixando as alturas nevadas.',
        'Cristais de gelo brilham como diamantes sob a fraca luz do sol que rompe as nuvens. A paisagem é de uma beleza cruel — esplêndida aos olhos, mortal para quem se perde. Você confere suas marcações e segue em frente, os olhos fixos no caminho.',
    ],
    _default: [
        'A estrada se estende à sua frente, seus paralelepípedos gastos por mil viajantes. Cada passo aproxima você da segurança dos muros de Eldoria. O peso da exploração se faz sentir nos ombros, mas a determinação mantém seus pés firmes na trilha.',
        'O terreno familiar traz um certo alívio — você reconhece uma árvore marcada, uma curva na estrada. Estas terras já não são desconhecidas. Sons de civilização começam a se misturar com os sons da natureza: um carro distante, vozes abafadas.',
        'Sons distantes ecoam pela trilha. Viajantes ou perigo? Impossível dizer a esta distância. Você mantém a mão próxima à arma e os olhos atentos, mas não desacelera. Cada momento parado é um momento a mais em território hostil.',
        'Um marco de pedra surge ao lado do caminho, gravado com a runa de Eldoria. A cidade não está longe — estas marcações são colocadas a cada meia légua dos portões. O alívio começa a se instalar, mas você sabe que os últimos passos são os mais traiçoeiros.',
        'O cansaço pesa como chumbo em seus membros, mas no horizonte, as torres de vigia de Eldoria começam a se erguer contra o céu. A promessa de uma cama quente, comida e segurança motiva seus passos. Só mais um pouco — só mais um pouco.',
    ],
};

// Travel hazards — each has multiple choices with different skill checks
// choices[]: i=icon, t=title, k={s:stat, dc:DC}, sNarr/fNarr/fDmg per choice
const RETURN_HAZARDS = {
    forest: [
        { icon: '', title: 'Teias Gigantes', narr: 'Teias enormes bloqueiam a trilha entre os troncos, grossas como cordas e pegajosas ao toque. Casulos pendem dos galhos — o que as teceu é grande e ainda está por perto.', choices: [
            { i: '', t: 'Queimar as teias', k: { s: 'int', dc: 10 }, sNarr: 'Você improvisa uma tocha com galhos secos e queima as teias com precisão. As chamas consomem os fios sem se espalhar.', fNarr: 'O fogo se espalha descontrolado! Você recua, mas as chamas alcançam seu braço antes que consiga apagá-las.', fDmg: 3 },
            { i: '', t: 'Desviar por baixo', k: { s: 'dex', dc: 12 }, sNarr: 'Com movimentos calculados, você desliza sob as teias sem tocar em um único fio. Limpo e silencioso.', fNarr: 'As teias são mais baixas do que pareciam. Fios grudam em suas costas e puxam — quanto mais se debate, mais se enrosca.', fDmg: 4 },
            { i: '', t: 'Forçar passagem', k: { s: 'str', dc: 13 }, sNarr: 'Com um grito de esforço, você rasga as teias como cortinas e abre caminho à força bruta.', fNarr: 'As teias são resistentes como aço! Seu braço fica preso e a vibração certamente alertou o que vive aqui.', fDmg: 3 },
        ]},
        { icon: '', title: 'Território de Urso', narr: 'Marcas de garras profundas nos troncos, casca arrancada, chão revolto. O ar carrega o cheiro forte e almiscarado do animal — ele esteve aqui há pouco tempo.', choices: [
            { i: '', t: 'Contornar em silêncio', k: { s: 'dex', dc: 12 }, sNarr: 'Controlando até a respiração, você traça uma rota alternativa. O urso nem percebe sua passagem.', fNarr: 'Um galho estala sob seu pé como um trovão no silêncio! O urso ergue a cabeça e avança com um urro.', fDmg: 5 },
            { i: '', t: 'Ler os sinais da natureza', k: { s: 'wis', dc: 11 }, sNarr: 'Rastros frescos apontam para o norte — o urso se afastou. Você cruza o território pela rota oposta.', fNarr: 'Você interpreta os sinais ao contrário. O caminho que parecia seguro leva direto à toca.', fDmg: 5 },
            { i: '', t: 'Fazer barulho para afastar', k: { s: 'cha', dc: 13 }, sNarr: 'Batendo as mãos e gritando, você se faz parecer maior. O urso bufa e se retira pesadamente.', fNarr: 'O urso interpreta seus gritos como desafio! Ele avança e você foge com arranhões profundos.', fDmg: 6 },
        ]},
        { icon: '', title: 'Raízes Traiçoeiras', narr: 'O chão da floresta se transformou em um labirinto de raízes expostas, retorcidas e entrelaçadas como serpentes petrificadas. A trilha desapareceu sob esta teia vegetal.', choices: [
            { i: '', t: 'Caminhar com cautela', k: { s: 'wis', dc: 10 }, sNarr: 'Olhos atentos mapeiam cada passo. Você navega o trecho como quem lê um mapa no chão.', fNarr: 'Uma raiz que parecia firme cede! Você tropeça e cai pesadamente, batendo o joelho em uma rocha.', fDmg: 2 },
            { i: '', t: 'Correr e saltar', k: { s: 'dex', dc: 12 }, sNarr: 'Com saltos ágeis de raiz em raiz, você atravessa o trecho como um acrobata.', fNarr: 'Seu pé engancha em uma raiz oculta no meio do salto! A queda é dolorosa e seu tornozelo protesta.', fDmg: 3 },
        ]},
    ],
    plains: [
        { icon: '', title: 'Ventania Repentina', narr: 'Nuvens negras surgem do nada sobre a planície. O vento se intensifica em segundos, arrancando grama e levantando poeira. Sem abrigo natural à vista, você precisa decidir rápido.', choices: [
            { i: '', t: 'Resistir de pé', k: { s: 'str', dc: 11 }, sNarr: 'Fincando os pés no chão e curvando-se contra o vento, você resiste com determinação. Quando passa, ainda está de pé.', fNarr: 'Uma rajada mais forte derruba você de costas! Detritos arrastados pelo vento cortam sua pele exposta.', fDmg: 3 },
            { i: '', t: 'Buscar abrigo', k: { s: 'wis', dc: 10 }, sNarr: 'Olhos treinados identificam uma depressão no terreno. Você se abriga ali até a tempestade passar.', fNarr: 'Não há abrigo nesta planície maldita. A ventania castiga sem piedade enquanto busca em vão por cobertura.', fDmg: 4 },
        ]},
        { icon: '', title: 'Buraco Oculto', narr: 'A grama alta e densa esconde o terreno real. Tocas de animais e erosão criaram um campo minado de buracos invisíveis. Um passo errado pode custar um tornozelo.', choices: [
            { i: '', t: 'Observar o terreno', k: { s: 'wis', dc: 11 }, sNarr: 'Você nota as diferenças na grama que denunciam os buracos. Com passos cuidadosos, desvia de todos.', fNarr: 'Seu pé afunda até o joelho em um buraco invisível! Seu tornozelo gira com um estalo doloroso.', fDmg: 4 },
            { i: '', t: 'Correr pelo campo', k: { s: 'dex', dc: 12 }, sNarr: 'Reflexos afiados e passos leves levam você pelo campo. Quando um buraco aparece, seus pés já acharam outro apoio.', fNarr: 'Na velocidade, impossível ver os buracos. Um deles engole seu pé e o impulso faz o resto — queda brusca.', fDmg: 3 },
        ]},
    ],
    cave: [
        { icon: '', title: 'Desmoronamento', narr: 'Um estrondo ecoa pelo túnel! Pedras se soltam do teto em cascata, rachaduras se espalham pelas paredes. Poeira enche o ar e a passagem começa a ceder.', choices: [
            { i: '', t: 'Correr para o outro lado', k: { s: 'dex', dc: 13 }, sNarr: 'Você dispara pela passagem em colapso! Pedras caem ao redor, mas seus pés são mais rápidos. Escapa por um fio.', fNarr: 'Pedras enormes caem sobre você antes que alcance o outro lado! Dor aguda percorre seu corpo sob os escombros.', fDmg: 6 },
            { i: '', t: 'Proteger-se e esperar', k: { s: 'cn', dc: 11 }, sNarr: 'Você se encolhe sob uma saliência de rocha sólida. O desmoronamento passa e você emerge coberto de poeira mas intacto.', fNarr: 'A saliência não era tão sólida. Uma pedra acerta seu ombro com força apesar da proteção improvisada.', fDmg: 4 },
            { i: '', t: 'Analisar a estrutura', k: { s: 'int', dc: 12 }, sNarr: 'Em um relance, você identifica os pilares naturais e traça uma rota entre os pontos de sustentação. Sem um arranhão.', fNarr: 'Sua análise parecia correta, mas a rocha neste ponto era friável. O caminho que escolheu desaba sob seus pés.', fDmg: 5 },
        ]},
        { icon: '', title: 'Gás Venenoso', narr: 'Um cheiro pungente e sulfuroso emana de uma fissura na rocha. O ar ganha uma tonalidade esverdeada e seus olhos ardem. Gás tóxico, espalhando-se pelo túnel.', choices: [
            { i: '', t: 'Prender a respiração', k: { s: 'cn', dc: 12 }, sNarr: 'Você inspira fundo o último ar limpo e atravessa a zona contaminada em apneia. Seus pulmões ardem, mas resiste.', fNarr: 'O trecho é mais longo do que calculou! O gás irrita seus pulmões. Tosse violenta e náusea se seguem.', fDmg: 4 },
            { i: '', t: 'Buscar corrente de ar', k: { s: 'int', dc: 11 }, sNarr: 'Você localiza uma passagem lateral com ventilação natural. O ar limpo permite uma rota segura ao redor da nuvem.', fNarr: 'A corrente que você seguiu era a fonte do gás! O ar fica pior. Você recua tossindo e busca outro caminho.', fDmg: 3 },
        ]},
    ],
    swamp: [
        { icon: '', title: 'Emboscada Rastejante', narr: 'A água escura se agita em ondas suaves. Bolhas sobem à superfície, e por um instante você vê escamas brilhantes sob a lama. Algo grande se move abaixo.', choices: [
            { i: '', t: 'Observar e contornar', k: { s: 'wis', dc: 12 }, sNarr: 'Seus olhos identificam o formato do predador na água. Você traça uma rota elevada, longe de suas mandíbulas.', fNarr: 'O predador é mais rápido do que parecia! Mandíbulas emergem da água. Você escapa, mas garras rasgam sua perna.', fDmg: 5 },
            { i: '', t: 'Criar distração', k: { s: 'int', dc: 11 }, sNarr: 'Você arremessa um galho pesado na água a dez metros dali. A criatura persegue o ruído, abrindo passagem.', fNarr: 'A criatura não cai na armadilha — é mais esperta do que parece. Ignora o galho e avança em sua direção.', fDmg: 4 },
            { i: '', t: 'Atravessar correndo', k: { s: 'dex', dc: 13 }, sNarr: 'Seus pés encontram os pontos firmes na lama e você cruza antes que a criatura possa reagir. Velocidade pura.', fNarr: 'A lama suga seus pés no pior momento! A criatura ganha terreno e suas garras alcançam suas pernas.', fDmg: 6 },
        ]},
        { icon: '', title: 'Bruma Desorientante', narr: 'Névoa espessa desce sobre o pântano como um manto vivo, engolindo toda visibilidade. A trilha desaparece, as estacas de marcação somem, e até o som parece abafado.', choices: [
            { i: '', t: 'Orientar-se pelas estrelas', k: { s: 'wis', dc: 11 }, sNarr: 'Olhando para cima, você encontra a Estrela do Norte. Seu senso de direção se mantém firme, e a névoa se dissipa.', fNarr: 'As nuvens cobrem tudo e a névoa engana seus sentidos. Você vaga por horas até achar a trilha, exausto.', fDmg: 3 },
            { i: '', t: 'Seguir os sons da cidade', k: { s: 'wis', dc: 12 }, sNarr: 'Você fecha os olhos e aguça os ouvidos. Ali — um sino distante, um cão ladrando. Sons que guiam seus passos.', fNarr: 'O eco do pântano distorce tudo. Você segue miragens sonoras e anda em círculos até a exaustão.', fDmg: 3 },
        ]},
    ],
    mountain: [
        { icon: '', title: 'Passagem Estreita', narr: 'A trilha se reduz a uma beirada de menos de um passo. De um lado, rocha vertical. Do outro, precipício que some nas nuvens. O vento empurra você para a borda.', choices: [
            { i: '', t: 'Escalar devagar', k: { s: 'dex', dc: 13 }, sNarr: 'Dedos e pés encontram apoio na rocha. Centímetro por centímetro, você cruza com precisão de escalador.', fNarr: 'Uma rajada de vento na hora errada! Você escorrega e bate o corpo contra a rocha áspera. O precipício quase vence.', fDmg: 6 },
            { i: '', t: 'Agarrar-se e avançar', k: { s: 'str', dc: 12 }, sNarr: 'Mãos firmes como garras na rocha, você avança sem olhar para baixo. A força bruta vence a vertigem.', fNarr: 'Seus dedos cedem na rocha lisa! A queda é curta — uma saliência abaixo amortece — mas o impacto é brutal.', fDmg: 5 },
            { i: '', t: 'Procurar rota alternativa', k: { s: 'int', dc: 11 }, sNarr: 'Você estuda a formação rochosa e descobre um desvio mais largo. Mais longo, porém infinitamente mais seguro.', fNarr: 'O desvio leva a um beco sem saída — rocha intransponível. Você perde tempo e volta cansado para a passagem.', fDmg: 2 },
        ]},
        { icon: '', title: 'Gelo na Trilha', narr: 'Gelo traiçoeiro cobre a trilha íngreme, transformando cada passo em uma aposta contra a gravidade. O vento gelado ameaça roubar seu equilíbrio.', choices: [
            { i: '', t: 'Pisar com cuidado', k: { s: 'dex', dc: 12 }, sNarr: 'Testando cada passo, você encontra as fissuras no gelo que oferecem tração. Lento, mas seguro.', fNarr: 'Seus pés perdem tração na parte mais íngreme! Você desliza descontrolado e bate nas pedras abaixo.', fDmg: 4 },
            { i: '', t: 'Cavar apoios no gelo', k: { s: 'str', dc: 11 }, sNarr: 'Com força e persistência, você escava degraus no gelo. Uma escada improvisada, mas funcional.', fNarr: 'O gelo racha em linha longa sob o impacto! A superfície cede e você desliza junto com os pedaços.', fDmg: 5 },
        ]},
    ],
    desert: [
        { icon: '', title: 'Ninho de Escorpiões', narr: 'A areia ganha vida ao redor de seus pés! Dezenas de escorpiões emergem das tocas, pinças erguidas e ferrões curvados brilhando ao sol. Você está no centro do ninho.', choices: [
            { i: '', t: 'Saltar para fora', k: { s: 'dex', dc: 12 }, sNarr: 'Com movimentos explosivos, você salta por cima das criaturas e aterrissa em areia limpa.', fNarr: 'Um escorpião maior emerge onde você ia pousar! Uma ferroada no tornozelo — o veneno arde como fogo líquido.', fDmg: 5 },
            { i: '', t: 'Ficar imóvel', k: { s: 'wis', dc: 11 }, sNarr: 'Você congela como estátua. Sem movimento ou calor, os escorpiões perdem interesse e retornam às tocas.', fNarr: 'Um escorpião escalando sua perna é demais! O pânico toma conta e o ferrão encontra pele exposta.', fDmg: 4 },
        ]},
        { icon: '', title: 'Exaustão pelo Calor', narr: 'O sol é implacável. O ar tremula sobre a areia escaldante, sua boca está seca como pergaminho e a visão escurece nas bordas. Cada passo fica mais pesado.', choices: [
            { i: '', t: 'Resistir e avançar', k: { s: 'cn', dc: 11 }, sNarr: 'Você controla a respiração, modera o ritmo e conserva energia. Passo firme após passo firme, vence o trecho.', fNarr: 'O calor vence a vontade. Suas pernas cedem e você cambaleia — quase desmaia antes de encontrar sombra.', fDmg: 3 },
            { i: '', t: 'Improvisar proteção', k: { s: 'int', dc: 10 }, sNarr: 'Com pano úmido na cabeça e pausas nas raras sombras, você mantém a temperatura controlada.', fNarr: 'Sem material adequado e sem sombra, o improviso falha. O sol castiga sem misericórdia.', fDmg: 4 },
        ]},
    ],
    snow: [
        { icon: '', title: 'Nevasca', narr: 'O céu desaba em uma cortina branca furiosa. Flocos grossos chicoteiam seu rosto e o vento gela até os pensamentos. A visibilidade cai para dois metros — a trilha some.', choices: [
            { i: '', t: 'Resistir ao frio', k: { s: 'cn', dc: 12 }, sNarr: 'Você se agasalha, cerra os dentes e avança contra a tempestade. Sua vontade é mais forte que o frio.', fNarr: 'O frio penetra até os ossos, ultrapassando toda proteção. Seus movimentos ficam lentos e entorpecidos.', fDmg: 4 },
            { i: '', t: 'Cavar abrigo na neve', k: { s: 'str', dc: 11 }, sNarr: 'Você escava uma trincheira na neve compacta. Seu abrigo bloqueia o vento e conserva o calor. A nevasca passa.', fNarr: 'O abrigo desaba sob o peso da neve! Você fica soterrado por segundos aterrorizantes, gelado e machucado.', fDmg: 5 },
        ]},
        { icon: '', title: 'Lago Congelado', narr: 'A trilha cruza um lago congelado sem caminho ao redor. O gelo geme e rachaduras se espalham como veias sob a superfície. Água negra se move lá embaixo.', choices: [
            { i: '', t: 'Distribuir o peso', k: { s: 'dex', dc: 13 }, sNarr: 'De bruços, você distribui o peso e desliza sobre o gelo. Cada estalo faz seu coração parar, mas alcança o outro lado.', fNarr: 'O gelo racha sob você com um estampido! Água gelada invade até a cintura. O choque térmico é brutal.', fDmg: 6 },
            { i: '', t: 'Contornar pela margem', k: { s: 'wis', dc: 11 }, sNarr: 'Nas bordas, pedras se projetam sobre o lago. Pulando de rocha em rocha, cruza sem tocar o gelo.', fNarr: 'A margem é tão frágil quanto o centro. Uma placa de gelo costeiro cede e você afunda na água congelante.', fDmg: 4 },
        ]},
    ],
    _default: [
        { icon: '', title: 'Armadilha Abandonada', narr: 'Folhas secas cobrem algo metálico na trilha. Um brilho de ferro entre o marrom — armadilha de caçadores, esquecida há meses. O mecanismo ainda parece funcional.', choices: [
            { i: '', t: 'Examinar com cuidado', k: { s: 'wis', dc: 11 }, sNarr: 'Olhos treinados identificam a placa de pressão e os fios. Você marca a armadilha e desvia com precisão.', fNarr: 'O mecanismo é mais sofisticado do que parecia! Ao pisar no que achava ser seguro, o ferro morde sua perna.', fDmg: 4 },
            { i: '', t: 'Pular por cima', k: { s: 'dex', dc: 12 }, sNarr: 'Um salto limpo e bem calculado leva você além da armadilha. Seus pés aterrissam em solo limpo e seguro.', fNarr: 'Você aterrissa mal e ativa uma segunda armadilha que não havia visto! Impacto duplo — queda e ferro.', fDmg: 3 },
        ]},
        { icon: '', title: 'Escuridão Repentina', narr: 'Nuvens espessas cobrem a lua e as estrelas de uma vez. Escuridão total desce sobre a trilha — você não enxerga nem as próprias mãos. A trilha está ali, em algum lugar.', choices: [
            { i: '', t: 'Seguir pelos sons', k: { s: 'wis', dc: 10 }, sNarr: 'Aguçando os ouvidos, você percebe o farfalhar de folhas, água corrente — um mapa sonoro que compensa a cegueira.', fNarr: 'Sons enganam no escuro. O que parecia trilha firme era encosta. Você rola antes de conseguir se agarrar.', fDmg: 3 },
            { i: '', t: 'Improvisar luz', k: { s: 'int', dc: 11 }, sNarr: 'Com galhos secos e engenho, uma tocha improvisada ilumina o caminho. A trilha reaparece, clara e segura.', fNarr: 'Sem material seco ou ignição, a escuridão prevalece. O terreno irregular cobra seu preço em tombos.', fDmg: 2 },
        ]},
    ],
};

function _getReturnBiome() {
    return (S.biome || 'forest').replace(/^dungeon_/, '');
}

function _pickFrom(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
}

function _getReturnNarration() {
    const b = _getReturnBiome();
    const pool = RETURN_NARRATIONS[b] || RETURN_NARRATIONS._default;
    return _pickFrom(pool);
}

function _getReturnHazard() {
    const b = _getReturnBiome();
    const pool = RETURN_HAZARDS[b] || RETURN_HAZARDS._default;
    return _pickFrom(pool);
}

// Dice instance for return journey checks
function _getReturnDice() {
    const canvas = document.getElementById('return-dice-canvas');
    const particles = document.getElementById('return-dice-particles');
    if (!canvas) return null;
    if (_returnDice) { _returnDice.dispose(); _returnDice = null; }
    try {
        _returnDice = new Dice3D(canvas, { size: 160, particlesContainer: particles });
    } catch (e) {
        console.warn('[EXPLORE] Return dice init failed:', e);
        return null;
    }
    return _returnDice;
}

function _disposeReturnDice() {
    if (_returnDice) { _returnDice.dispose(); _returnDice = null; }
}

function _renderReturnHP(el) {
    const hp = getCurrentHP();
    const max = getMaxHP();
    const pct = (hp / max) * 100;
    const color = pct > 60 ? '#4a8' : pct > 25 ? '#dca028' : '#c44';
    el.innerHTML = `<span>HP</span>` +
        `<div class="exit-hp-bar"><div class="exit-hp-fill" style="width:${Math.max(2, pct)}%;background:${color}"></div></div>` +
        `<span>${hp}/${max}</span>`;
}

function _renderReturnProgress(el, j) {
    const pct = Math.round(((j.currentStep - 1) / j.totalSteps) * 100);
    // Dot-based progress (no castle emoji — destination shown in header)
    let dots = '';
    for (let i = 1; i <= j.totalSteps; i++) {
        const cls = i < j.currentStep ? 'done' : i === j.currentStep ? 'current' : 'pending';
        dots += `<div class="return-progress-dot ${cls}"></div>`;
    }
    el.innerHTML =
        `<div class="return-progress-bar"><div class="return-progress-fill" style="width:${pct}%"></div></div>` +
        (j.totalSteps <= 8 ? `<div class="return-progress-steps">${dots}</div>` : '') +
        `<div class="return-progress-label"><span>Etapa ${j.currentStep} de ${j.totalSteps}</span></div>`;
}

function _addReturnBtn(container, icon, title, desc, descColor, onClick) {
    const btn = document.createElement('button');
    btn.className = 'exit-option-btn';
    btn.innerHTML = `<span class="exit-option-icon">${icon}</span>` +
        `<div class="exit-option-info"><div class="exit-option-title">${title}</div>` +
        `<div class="exit-option-desc" style="color:${descColor}">${desc}</div></div>`;
    btn.addEventListener('click', onClick);
    container.appendChild(btn);
}

function attemptReturnToCity(riskChance) {
    const distance = bfsDistanceToExit(S.playerCol, S.playerRow);
    const steps = Math.max(1, distance);
    _returnJourney = {
        totalSteps: steps, currentStep: 0, riskChance: riskChance,
        usedNarrations: new Set(), usedHazards: new Set(),
    };
    _returningToCity = true;
    showReturnJourneyStep();
}

function showReturnJourneyStep() {
    if (!_returnJourney) return;
    const j = _returnJourney;
    j.currentStep++;

    // Arrived at the city!
    if (j.currentStep > j.totalSteps) {
        _showArrivalScreen();
        return;
    }

    // Determine step type: encounter (from randomEncounters), hazard (skill check), or safe
    const roll = Math.random() * 100;
    const hasEncounter = roll < j.riskChance * 0.5 && S.randomEncounters.length > 0;
    const hasHazard = !hasEncounter && roll < j.riskChance;
    const hazard = hasHazard ? _getReturnHazard() : null;

    const overlay = document.getElementById('return-journey-overlay');
    const hpEl = document.getElementById('return-journey-hp');
    const progressEl = document.getElementById('return-journey-progress');
    const narrEl = document.getElementById('return-journey-narration');
    const diceEl = document.getElementById('return-journey-dice');
    const checkEl = document.getElementById('return-journey-check');
    const actionsEl = document.getElementById('return-journey-actions');
    const subtitleEl = document.getElementById('return-journey-subtitle');
    const iconEl = document.getElementById('return-journey-icon');
    const titleEl = document.getElementById('return-journey-title');

    // Reset state
    diceEl.classList.remove('active');
    checkEl.innerHTML = '';
    actionsEl.innerHTML = '';
    _disposeReturnDice();

    // Header — destination objective at top
    const remaining = j.totalSteps - j.currentStep;
    titleEl.textContent = 'Rumo a Eldoria';
    subtitleEl.textContent = remaining > 0
        ? `${remaining + 1} etapa${remaining > 0 ? 's' : ''} restante${remaining > 0 ? 's' : ''}`
        : 'Quase lá...';
    iconEl.textContent = '';

    // HP bar
    _renderReturnHP(hpEl);

    // Progress
    _renderReturnProgress(progressEl, j);

    if (hasEncounter) {
        // ─── ENCOUNTER: delegate to existing random encounter system ───
        narrEl.innerHTML = `<div class="return-step-badge danger">Encontro na estrada!</div>` +
            `<div>Sombras se movem entre a vegetação. Algo se aproxima rapidamente...</div>`;
        _addReturnBtn(actionsEl, '', 'Enfrentar', 'Resolver o encontro para continuar', '#c44', () => {
            overlay.classList.remove('active');
            const enc = S.randomEncounters.shift();
            setTimeout(() => showRandomEncounter(enc), 300);
        });
    } else if (hasHazard) {
        // ─── HAZARD: multiple choices with different skill checks ───
        narrEl.innerHTML = `<div class="return-step-badge hazard">${hazard.title}</div>` +
            `<div>${hazard.narr}</div>`;
        for (const choice of hazard.choices) {
            const statName = STAT_NAMES[choice.k.s] || choice.k.s;
            const mod = getAbilityMod(choice.k.s);
            const proficient = S.charData && S.charData.sp && S.charData.sp.includes(choice.k.s);
            const profMark = proficient ? ' ★' : '';
            const chance = Math.max(5, Math.min(95, Math.round(((21 - choice.k.dc + mod) / 20) * 100)));
            _addReturnBtn(actionsEl, choice.i, choice.t,
                `${statName}${profMark} DC ${choice.k.dc} | ${mod >= 0 ? '+' : ''}${mod} | ${chance}%`, '#dca028',
                () => _rollReturnHazard(hazard, choice));
        }
    } else {
        // ─── SAFE: atmospheric narration ───
        const biomeLabels = { forest: 'Floresta', plains: 'Planície', cave: 'Caverna', swamp: 'Pântano', mountain: 'Montanha', desert: 'Deserto', snow: 'Neve' };
        const biomeLabel = biomeLabels[_getReturnBiome()] || 'Estrada';
        narrEl.innerHTML = `<div class="return-step-badge safe">✓ ${biomeLabel} — Caminho seguro</div>` +
            `<div>${_getReturnNarration()}</div>`;
        _addReturnActions(actionsEl, overlay, remaining);
    }

    overlay.classList.add('active');
    try { if (tg) tg.HapticFeedback.impactOccurred(hasEncounter ? 'heavy' : hasHazard ? 'medium' : 'light'); } catch (e) { console.warn('[EXPLORE] haptic:', e); }
}

function _rollReturnHazard(hazard, choice) {
    const actionsEl = document.getElementById('return-journey-actions');
    const diceEl = document.getElementById('return-journey-dice');
    const checkEl = document.getElementById('return-journey-check');
    actionsEl.innerHTML = ''; // Remove choice buttons

    const stat = choice.k.s;
    const dc = choice.k.dc;
    const mod = getAbilityMod(stat);
    const mode = getRollMode({ s: stat });
    const { roll, r1, r2 } = rollD20(mode);
    const total = roll + mod;
    const success = total >= dc;

    // Record the check
    S.checksPerformed.push({
        stat, dc, roll, mod, ok: success, mode, context: 'return',
    });

    // 3D dice animation
    const dice = _getReturnDice();
    if (dice) {
        diceEl.classList.add('active');
        dice.roll(roll, () => {
            _resolveReturnHazard(hazard, choice, roll, mod, total, success, r1, r2, mode);
        });
    } else {
        // Fallback without 3D
        checkEl.innerHTML = `<div style="font-size:48px;animation:diceRoll 0.7s ease">d20</div>`;
        setTimeout(() => {
            _resolveReturnHazard(hazard, choice, roll, mod, total, success, r1, r2, mode);
        }, 800);
    }
}

function _resolveReturnHazard(hazard, choice, roll, mod, total, success, r1, r2, mode) {
    const overlay = document.getElementById('return-journey-overlay');
    const checkEl = document.getElementById('return-journey-check');
    const narrEl = document.getElementById('return-journey-narration');
    const actionsEl = document.getElementById('return-journey-actions');
    const hpEl = document.getElementById('return-journey-hp');

    // Show formula
    const statName = STAT_NAMES[choice.k.s] || choice.k.s;
    const proficient = S.charData && S.charData.sp && S.charData.sp.includes(choice.k.s);
    const profMark = proficient ? '★' : '';
    checkEl.innerHTML = buildFormula(roll, mod, statName, profMark, choice.k.dc, total, r1, r2, mode) +
        `<div style="margin-top:6px;font-size:15px;font-weight:700;color:${success ? '#4a8' : '#c44'}">${success ? 'Sucesso!' : 'Falha!'}</div>`;

    // Apply outcome
    if (success) {
        narrEl.innerHTML = `<div class="return-step-badge safe">${hazard.title} — Superado!</div>` +
            `<div>${choice.sNarr}</div>`;
    } else {
        const dmg = choice.fDmg || 3;
        S.hpChange -= dmg;
        if (S.charData) {
            const newHP = Math.max(0, S.charData.hp + S.hpChange);
            updateHP(newHP, S.charData.mh);
        }
        _renderReturnHP(hpEl);
        narrEl.innerHTML = `<div class="return-step-badge danger">${hazard.title} — Falha!</div>` +
            `<div>${choice.fNarr}</div>` +
            `<div style="margin-top:6px;color:#c44;font-size:13px">-${dmg} HP</div>`;
    }

    try { if (tg) tg.HapticFeedback.notificationOccurred(success ? 'success' : 'error'); } catch (e) { /* ignore */ }

    const remaining = _returnJourney ? _returnJourney.totalSteps - _returnJourney.currentStep : 0;

    // Delay before showing action buttons (let the player read)
    setTimeout(() => {
        _disposeReturnDice();
        document.getElementById('return-journey-dice').classList.remove('active');

        // Check death
        if (getCurrentHP() <= 0) {
            actionsEl.innerHTML = '';
            _addReturnBtn(actionsEl, '', 'Você sucumbiu...', 'Seus ferimentos foram fatais', '#c44', () => {
                overlay.classList.remove('active');
                _returnJourney = null;
                _returningToCity = false;
                showDeathSaves();
            });
            return;
        }

        _addReturnActions(actionsEl, overlay, remaining);
    }, 1200);
}

function _addReturnActions(actionsEl, overlay, remaining) {
    actionsEl.innerHTML = '';

    // Continue journey
    _addReturnBtn(actionsEl, '',
        remaining > 0 ? 'Continuar Viagem' : 'Chegar à Cidade',
        remaining > 0 ? `${remaining} etapa${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}` : 'Os portões de Eldoria se erguem à frente!',
        remaining > 0 ? '#8a7a68' : '#4a8',
        () => showReturnJourneyStep()
    );

    // Camp option (needs food items per game rules)
    const foodItems = getFoodItems();
    if (foodItems.length > 0 && remaining > 0 && getHPPercent() < 100) {
        const div = document.createElement('div');
        div.className = 'return-camp-section';
        actionsEl.appendChild(div);
        _addReturnBtn(div, '', 'Montar Acampamento',
            `Descanso Curto (1d8+CON) — ${foodItems.length} refeição disponível`,
            '#4a8', () => {
                overlay.classList.remove('active');
                // Camp flows through existing camp system, then returns to journey
                showCampOverlay();
            });
    }

    // Healing potion (if available and HP < 100%)
    const healItems = getHealingItems();
    if (healItems.length > 0 && getHPPercent() < 100) {
        const best = healItems[0];
        _addReturnBtn(actionsEl, '', `Usar ${best.n} (${best.q}x)`,
            `Restaura ${best.h} HP`, '#4a8', () => {
                useInventoryItemAnimated(best, (heal) => {
                    showTerrainToast(`+${heal} HP`, 'ranger');
                    _renderReturnHP(document.getElementById('return-journey-hp'));
                    _addReturnActions(actionsEl, overlay, remaining);
                });
            });
    }
}

function _showArrivalScreen() {
    const overlay = document.getElementById('return-journey-overlay');
    const hpEl = document.getElementById('return-journey-hp');
    const progressEl = document.getElementById('return-journey-progress');
    const narrEl = document.getElementById('return-journey-narration');
    const diceEl = document.getElementById('return-journey-dice');
    const checkEl = document.getElementById('return-journey-check');
    const actionsEl = document.getElementById('return-journey-actions');
    const subtitleEl = document.getElementById('return-journey-subtitle');
    const iconEl = document.getElementById('return-journey-icon');
    const titleEl = document.getElementById('return-journey-title');

    diceEl.classList.remove('active');
    checkEl.innerHTML = '';
    actionsEl.innerHTML = '';
    _disposeReturnDice();

    iconEl.textContent = '';
    iconEl.style.animation = 'none'; // Stop bobbing
    titleEl.textContent = 'Eldoria';
    subtitleEl.textContent = 'Você chegou em segurança';

    _renderReturnHP(hpEl);
    // Full progress
    const j = _returnJourney;
    if (j) {
        j.currentStep = j.totalSteps + 1;
        _renderReturnProgress(progressEl, j);
    }

    const arrivalTexts = [
        'Os portões se abrem diante de você. O som familiar da cidade traz alívio. Você sobreviveu à jornada.',
        'As torres de vigia surgem entre as árvores. Os guardas acenam ao reconhecê-lo. Enfim, segurança.',
        'O cheiro de pão fresco e fumaça de lareiras atinge você antes mesmo de ver os muros. Eldoria, finalmente.',
    ];

    narrEl.innerHTML = `<div class="return-step-badge arrival">Chegada a Eldoria</div>` +
        `<div>${_pickFrom(arrivalTexts)}</div>`;
    _addReturnBtn(actionsEl, '', 'Entrar na Cidade',
        'Seus pés pisam solo seguro novamente', 'var(--v-gold, #c4953a)', () => {
            _closeReturnJourney();
            finishExploration('exit');
        });

    overlay.classList.add('active');
    try { if (tg) tg.HapticFeedback.notificationOccurred('success'); } catch (e) { /* ignore */ }
}

function _closeReturnJourney() {
    const overlay = document.getElementById('return-journey-overlay');
    if (overlay) overlay.classList.remove('active');
    _disposeReturnDice();
    _returnJourney = null;
    _returningToCity = false;
    // Reset icon animation
    const icon = document.getElementById('return-journey-icon');
    if (icon) icon.style.animation = '';
}

// ═══════════════════════════════════════════════════════
let _finishSent = false;

function finishExploration(reason) {
    if (_finishSent) return;
    _finishSent = true;

    // Disable return button immediately
    const btnReturn = document.getElementById('btn-return');
    if (btnReturn) {
        btnReturn.style.pointerEvents = 'none';
        btnReturn.style.opacity = '0.5';
    }

    // Haptic feedback
    try { if (tg) tg.HapticFeedback.impactOccurred('medium'); } catch (e) { console.warn('[EXPLORE] haptic:', e); }

    // Clean up session storage
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { console.warn('[EXPLORE] sessionStorage:', e); }

    // Log the exit event
    logMoveEvent([{ type: 'exit', reason: reason }]);

    // Include map_data so backend can save it for combat return trip
    const params = new URLSearchParams(window.location.search);
    const mapDataPayload = params.get('data') || '';

    const payload = {
        action: 'exploration_complete',
        token: S.token,
        reason: reason,
        results: {
            xp: S.xpEarned,
            gold: S.goldEarned,
            items: S.itemsFound,
            hp_change: S.hpChange,
            pois_resolved: Array.from(S.poisResolved),
            hexes_explored: S.visited.size,
            checks: S.checksPerformed,
            log: S.moveLog.slice(-50),
            inventory_used: S.inventoryUsed,
        },
        combat: S.combatTrigger,
        map_data: mapDataPayload,
    };

    // API mode: transition to Game Hub or Navigate (stays in WebApp)
    if (S.apiBase && S.token && S.uid) {
        const urlParams = new URLSearchParams(window.location.search);
        const returnTo = urlParams.get('return') || 'game';
        if (returnTo === 'navigate') {
            _transitionToNavigateFromExplore(payload);
        } else {
            _transitionToGameFromExplore(payload);
        }
        return;
    }

    // Fallback: sendData + close (non-API mode)
    try {
        if (tg && tg.sendData) {
            tg.sendData(JSON.stringify(payload));
        } else {
            console.log('[EXPLORE] sendData payload:', JSON.stringify(payload, null, 2));
        }
    } catch (e) {
        console.error('[EXPLORE] sendData failed:', e);
    }
    setTimeout(() => {
        try { if (tg) tg.close(); } catch (e) {
            console.warn('[EXPLORE] tg.close fallback failed:', e);
        }
    }, 500);
}

async function _transitionToGameFromExplore(payload) {
    const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + S.token };
    if (window.Telegram?.WebApp?.initData) h['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
    h['X-Idempotency-Key'] = crypto.randomUUID();
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
            const r = await fetchT(S.apiBase + '/api/webapp/transition', {
                method: 'POST', headers: h,
                body: JSON.stringify({
                    from: 'explore', to: 'game',
                    user_id: parseInt(S.uid),
                    payload: { results: payload.results }
                })
            }, 10000);
            const d = await r.json();
            if (d.url) { window.location.replace(d.url); return; }
        } catch (e) { console.error('[EXPLORE] transition error (attempt ' + attempt + '):', e); }
    }
    // Fallback: close WebApp and let user tap JOGAR from Telegram
    if (window.Telegram && Telegram.WebApp) { Telegram.WebApp.close(); }
}

async function _transitionToNavigateFromExplore(payload) {
    const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + S.token };
    if (window.Telegram?.WebApp?.initData) h['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
    h['X-Idempotency-Key'] = crypto.randomUUID();
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
            const r = await fetchT(S.apiBase + '/api/webapp/transition', {
                method: 'POST', headers: h,
                body: JSON.stringify({
                    from: 'explore', to: 'navigate',
                    user_id: parseInt(S.uid),
                    payload: { results: payload.results }
                })
            }, 10000);
            const d = await r.json();
            if (d.url) { window.location.replace(d.url); return; }
        } catch (e) { console.error('[EXPLORE] navigate transition error (attempt ' + attempt + '):', e); }
    }
    // Fallback: close WebApp
    if (window.Telegram && Telegram.WebApp) { Telegram.WebApp.close(); }
}

// ═══════════════════════════════════════════════════════
// ZLIB INFLATE — DecompressionStream('deflate') handles zlib format (RFC 1950)
// ═══════════════════════════════════════════════════════
async function zlibInflate(data) {
    if (typeof DecompressionStream === 'undefined') {
        throw new Error('DecompressionStream not supported');
    }
    // 'deflate' mode handles zlib-wrapped data (header+payload+checksum) directly
    const ds = new DecompressionStream('deflate');
    const writer = ds.writable.getWriter();
    writer.write(data);
    writer.close();
    const reader = ds.readable.getReader();
    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    const totalLen = chunks.reduce((a, c) => a + c.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}

// ═══════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════
const _EXPLORE_HEALTH_RETRIES = 3;
const _EXPLORE_HEALTH_RETRY_MS = 1500;
const _EXPLORE_HEALTH_TIMEOUT = 8000;

async function _exploreHealthCheck() {
    const url = `${S.apiBase}/api/game/health`;
    for (let i = 0; i <= _EXPLORE_HEALTH_RETRIES; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, _EXPLORE_HEALTH_RETRY_MS));
        try {
            const ac = new AbortController();
            const tid = setTimeout(() => ac.abort(), _EXPLORE_HEALTH_TIMEOUT);
            const resp = await fetch(url, {
                method: 'GET',
                headers: {},
                signal: ac.signal,
            });
            clearTimeout(tid);
            if (resp.ok) {
                const data = await resp.json();
                if (data.status === 'ok' && data.engine) return true;
            }
        } catch (_e) { /* retry */ }
    }
    console.error('[EXPLORE] Health check failed after', _EXPLORE_HEALTH_RETRIES + 1, 'attempts');
    return false;
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
async function initAsync() {
    tg = window.Telegram && window.Telegram.WebApp;
    if (tg) {
        tg.ready();
        tg.expand();
        try { tg.disableVerticalSwipes(); } catch (e) { console.warn('[EXPLORE] disableVerticalSwipes not supported'); }
        if (tg.BackButton) {
            tg.BackButton.show();
            tg.BackButton.onClick(() => { try { tg.close(); } catch (e) { console.warn('[EXPLORE] tg.close:', e); } });
        }
    }

    // Save state on close attempt
    window.addEventListener('beforeunload', () => { saveState(); });

    const params = new URLSearchParams(window.location.search);
    S.token = params.get('token') || '';
    S.apiBase = params.get('api') || '';
    S.uid = params.get('uid') || '';

    // ── Shared Error Reporter ──
    if (window.ValdoriaErrors) {
        ValdoriaErrors.init({
            appName: 'EXPLORE',
            apiBase: S.apiBase,
            token: S.token,
            uid: S.uid,
            onRetry: async () => {
                const ok = await _exploreHealthCheck();
                if (!ok) { showError('Servidor indisponível. Tente novamente em alguns segundos.'); return; }
                // Reload the page to re-init with fresh state
                window.location.reload();
            },
        });
    }

    // ── Health check before loading ──
    if (S.apiBase) {
        const healthy = await _exploreHealthCheck();
        if (!healthy) {
            // Try to show cached map while waiting for reconnect
            if (restoreState()) {
                try {
                    const dataParam = params.get('data') || '';
                    if (dataParam) {
                        const bin = atob(dataParam.replace(/-/g, '+').replace(/_/g, '/'));
                        const bytes = new Uint8Array(bin.length);
                        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                        const inflated = await zlibInflate(bytes);
                        loadMapData(JSON.parse(new TextDecoder().decode(inflated)));
                    }
                } catch (_e) { /* cached map render is best-effort */ }
            }
            showError('Servidor indisponível. Tente novamente em alguns segundos.');
            return;
        }
    }

    let dataB64 = params.get('data') || '';
    const isRestore = params.get('restore') === '1';

    console.log('[EXPLORE] Init params:', {
        hasToken: !!S.token, hasApi: !!S.apiBase, hasUid: !!S.uid,
        dataLen: dataB64.length, isRestore,
        url: window.location.href.substring(0, 120) + '...'
    });

    let dataObj = null;

    // Fetch persistence state and payload from backend API if available
    if (S.apiBase && S.uid && S.token) {
        try {
            const url = `${S.apiBase}/api/explore/state?user_id=${S.uid}`;
            console.log('[EXPLORE] Fetching state from API:', url);
            const _sh = { 'Authorization': `Bearer ${S.token}` };
            if (window.Telegram?.WebApp?.initData) { _sh['X-Telegram-Init-Data'] = Telegram.WebApp.initData; }
            const resp = await fetchT(url, {
                method: 'GET',
                headers: _sh
            });
            console.log('[EXPLORE] API response status:', resp.status);
            if (resp.ok) {
                const rData = await resp.json();
                console.log('[EXPLORE] API response:', {
                    hasPayload: !!(rData && rData.payload),
                    payloadLen: rData?.payload?.length || 0,
                    hasState: !!(rData && rData.state),
                });

                // Load map payload from API if not in URL
                if (!dataB64 && rData && rData.payload) {
                    dataB64 = rData.payload;
                    console.log('[EXPLORE] Loaded payload from API fallback (' + dataB64.length + ' chars)');
                }

                if (rData && rData.state) {
                    // On restore (returning from combat/inventory), update token
                    // and timestamp so restoreState() accepts the state
                    if (isRestore) {
                        rData.state.tk = S.token;
                        rData.state.ts = Date.now();
                        // Reset reward counters — already applied by transition API
                        rData.state.xp = 0;
                        rData.state.gp = 0;
                        rData.state.hp = 0;
                        rData.state.it = [];
                        rData.state.iu = [];
                        rData.state.ct = null;
                    }
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(rData.state));
                }
            } else {
                const errText = await resp.text().catch(() => '');
                console.warn('[EXPLORE] API state returned error:', resp.status, errText);
            }
        } catch (e) {
            console.error('[EXPLORE] Could not fetch saved state/payload from API', e);
        }
    } else {
        console.warn('[EXPLORE] Skipping API fetch — missing params:', {
            api: !!S.apiBase, uid: !!S.uid, token: !!S.token
        });
    }

    if (!dataB64) {
        console.error('[EXPLORE] FATAL: No map data available. URL data param empty, API fallback failed.');
        document.getElementById('loading').innerHTML = `
            <div style="color:#a44;font-size:16px;text-align:center;padding:20px">
                Dados do mapa não encontrados.<br>
                Volte ao bot e tente novamente.
                <br><br>
                <button onclick="location.reload()" style="background:#4a3828;color:#d4c8b0;border:1px solid #6a4a2a;padding:10px 24px;border-radius:8px;font-family:var(--v-font);font-size:14px;cursor:pointer">
                    Tentar novamente
                </button>
            </div>`;
        return;
    }

    try {
        const binary = atob(dataB64.replace(/-/g, '+').replace(/_/g, '/'));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const inflated = await zlibInflate(bytes);
        const jsonStr = new TextDecoder().decode(inflated);
        dataObj = JSON.parse(jsonStr);

        // Travel animation (only on fresh start, not restore)
        const regionName = dataObj.rn || '';
        if (!isRestore && regionName && typeof playTravelAnimation === 'function') {
            document.getElementById('loading').classList.add('hidden');
            await new Promise(resolve => {
                playTravelAnimation(dataObj.b || 'forest', regionName, resolve);
            });
        }

        loadMapData(dataObj);

        // Post-combat narrative when returning from combat
        if (isRestore) {
            setTimeout(() => showPostCombatNarrative(), 600);
        }

        // Show inventory button when API mode is available (transitions supported)
        if (S.apiBase) {
            const invBtn = document.getElementById('btn-inventory');
            if (invBtn) invBtn.style.display = '';
        }
    } catch (e) {
        console.error('Failed to parse map data:', e);
        document.getElementById('loading').innerHTML = '<div style="color:#a44;font-size:16px;text-align:center;padding:20px">Erro ao carregar mapa.<br>' + e.message + '</div>';
    }
}

// Start
document.addEventListener('DOMContentLoaded', () => initAsync());

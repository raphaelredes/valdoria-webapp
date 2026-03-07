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

    const overlay = document.getElementById('dm-overlay');
    document.getElementById('dm-icon').textContent = poi.icon || '📜';
    document.getElementById('dm-title').textContent = poi.title || 'Evento';
    document.getElementById('dm-type').textContent = POI_TYPE_LABELS[poi.type] || poi.type;

    // Typewriter narration
    const narrEl = document.getElementById('dm-narration');
    narrEl.innerHTML = '<span class="cursor"></span>';
    typewriter(narrEl, poi.narration || '', () => {
        showChoices(poi);
    });

    overlay.classList.add('active');
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

        let html = `<span class="choice-icon">${ch.i || '➡️'}</span>`;
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
    if (!r2) return `<span class="dice-single">🎲</span>`;
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

    // Haptic on dice roll
    try { if (tg) tg.HapticFeedback.impactOccurred('medium'); } catch (e) { console.warn('[EXPLORE] haptic:', e); }

    // Show check overlay
    const overlay = document.getElementById('check-overlay');
    const diceEl = document.getElementById('dice-display');
    const formulaEl = document.getElementById('check-formula');
    const resultEl = document.getElementById('check-result');

    const statName = STAT_NAMES[check.s] || check.s;
    const proficient = S.charData && S.charData.sp && S.charData.sp.includes(check.s);
    const profMark = proficient ? '★' : '';

    // Dice animation
    diceEl.innerHTML = r2 !== null ? buildDiceHTML(r1, r2, mode) : '🎲';
    diceEl.style.animation = 'none';
    void diceEl.offsetHeight;
    diceEl.style.animation = 'diceRoll 0.7s ease';

    formulaEl.innerHTML = buildFormula(roll, mod, statName, profMark, dc, total, r1, r2, mode);

    overlay.classList.add('active');

    setTimeout(() => {
        if (r2 === null) {
            diceEl.textContent = roll <= 1 ? '💀' : roll >= 20 ? '🌟' : '🎲';
        }
        resultEl.textContent = success ? '✅ Sucesso!' : '❌ Falha!';
        resultEl.className = 'check-result ' + (success ? 'success' : 'failure');

        try {
            if (tg) tg.HapticFeedback.notificationOccurred(success ? 'success' : 'error');
        } catch (e) { console.warn('[EXPLORE] haptic:', e); }

        // Phase 2: Result reading time (2000ms with skip button)
        let _checkDone = false;
        const skipBtn = document.getElementById('check-skip-btn');

        const finishCheck = () => {
            if (_checkDone) return;
            _checkDone = true;
            if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
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

        setTimeout(finishCheck, 2000);
    }, 700);
}

function showStage2(poi, stage2) {
    const overlay = document.getElementById('dm-overlay');
    document.getElementById('dm-icon').textContent = '🔮';
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
            let html = `<span class="choice-icon">${ch.i || '➡️'}</span>`;
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
    overlay.classList.add('active');
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
        addRewardBadge(rewardsEl, `✨ +${outcome.x} XP`, 'xp');
    }
    if (outcome.g) {
        S.goldEarned += outcome.g;
        addRewardBadge(rewardsEl, `💰 +${outcome.g} Ouro`, 'gold');
    }
    if (outcome.h && outcome.h > 0) {
        S.hpChange += outcome.h;
        addRewardBadge(rewardsEl, `❤️ +${outcome.h} HP`, 'heal');
        if (S.charData) {
            const newHP = Math.min(S.charData.mh, (S.charData.hp + S.hpChange));
            updateHP(newHP, S.charData.mh);
        }
    }
    if (outcome.d && outcome.d > 0) {
        S.hpChange -= outcome.d;
        addRewardBadge(rewardsEl, `💔 -${outcome.d} HP`, 'damage');
        if (S.charData) {
            const newHP = Math.max(0, S.charData.hp + S.hpChange);
            updateHP(newHP, S.charData.mh);
        }
    }
    if (outcome.i) {
        S.itemsFound.push(outcome.i);
        addRewardBadge(rewardsEl, `🎒 ${outcome.i}`, 'item');
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
    // If returning to city, finish exploration after the encounter resolves
    if (_returningToCity) {
        _returningToCity = false;
        finishExploration('exit');
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
    document.getElementById('combat-icon').textContent = combat.ei || '⚔️';
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

// Post-combat narrative (brief toast after returning from arena)
function showPostCombatNarrative() {
    const lines = [
        'A poeira assenta. Você respira fundo e segue adiante.',
        'O silêncio retorna ao redor. Você recupera o fôlego.',
        'A ameaça foi neutralizada. A trilha está livre.',
        'Com a vitória, sua confiança cresce.',
        'Após a batalha, você examina os arredores com cautela.',
    ];
    const text = lines[Math.floor(Math.random() * lines.length)];
    showTerrainToast(`⚔️ ${text}`, 'ranger');
}

// ═══════════════════════════════════════════════════════
// WEBAPP TRANSITIONS (same-origin navigation)
// ═══════════════════════════════════════════════════════

async function transitionToArena() {
    saveState();

    const params = new URLSearchParams(window.location.search);
    const mapData = params.get('data') || '';

    const body = {
        from: 'explore', to: 'arena',
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
    _th['ngrok-skip-browser-warning'] = '1';
    _th['X-Idempotency-Key'] = crypto.randomUUID();

    try {
        const resp = await fetchT(`${S.apiBase}/api/webapp/transition`, {
            method: 'POST',
            headers: _th,
            body: JSON.stringify(body)
        });

        if (resp.ok) {
            const data = await resp.json();
            if (data.url) {
                window.location.replace(data.url);
                return;
            }
        }
        console.error('[EXPLORE] Transition to arena failed, using fallback');
        if (typeof showTerrainToast === 'function') showTerrainToast('⚠️ Erro na transição. Usando fallback...', 'damage');
    } catch (e) {
        console.error('[EXPLORE] Transition to arena error:', e);
        if (typeof showTerrainToast === 'function') showTerrainToast('⚠️ Erro na transição. Usando fallback...', 'damage');
    }

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
    _th['ngrok-skip-browser-warning'] = '1';
    _th['X-Idempotency-Key'] = crypto.randomUUID();

    try {
        const resp = await fetchT(`${S.apiBase}/api/webapp/transition`, {
            method: 'POST',
            headers: _th,
            body: JSON.stringify(body)
        });

        if (resp.ok) {
            const data = await resp.json();
            if (data.url) {
                window.location.replace(data.url);
                return;
            }
        }
        console.error('[EXPLORE] Transition to inventory failed');
        if (typeof showTerrainToast === 'function') showTerrainToast('⚠️ Erro ao abrir mochila. Tente novamente.', 'damage');
    } catch (e) {
        console.error('[EXPLORE] Transition to inventory error:', e);
        if (typeof showTerrainToast === 'function') showTerrainToast('⚠️ Erro ao abrir mochila. Tente novamente.', 'damage');
    }
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
            <div style="font-size:40px;margin:12px 0">${boss.ei || '⚔️'}</div>
            <div style="font-size:18px;font-weight:bold;color:#c4953a;margin-bottom:8px">${boss.en || 'Guardião'}</div>
            <div style="font-size:13px;color:#b0b8c0;margin-bottom:16px;line-height:1.4">${boss.n || 'Um guardião bloqueia a saída!'}</div>
            <div id="boss-choices" style="display:flex;flex-direction:column;gap:8px"></div>
        </div>`;

    const choicesDiv = overlay.querySelector('#boss-choices');
    // Fight (direct combat)
    const fightBtn = document.createElement('button');
    fightBtn.className = 'v-btn v-btn-primary';
    fightBtn.innerHTML = '⚔️ Lutar';
    fightBtn.onclick = () => {
        overlay.classList.remove('active');
        triggerCombat({ combat: { en: boss.en, ei: boss.ei, b: boss.b || S.biome, d: boss.d || S.dangerLevel } });
        S._bossDefeated = true; saveState();
    };
    choicesDiv.appendChild(fightBtn);

    // Stealth bypass (skill check)
    const stealthBtn = document.createElement('button');
    stealthBtn.className = 'v-btn';
    stealthBtn.innerHTML = `🤫 Esgueirar <span style="font-size:11px;opacity:0.7">(${Math.round(stealthChance)}%)</span>`;
    stealthBtn.onclick = () => {
        const roll = rollD20('normal');
        const total = roll + stealthMod;
        if (total >= stealthDC) {
            overlay.innerHTML = `<div class="event-content" style="text-align:center">
                <div style="font-size:28px;margin:20px 0;color:#6a8">🤫 ${roll}+${stealthMod} = ${total} vs DC ${stealthDC}</div>
                <div style="color:#6a8;font-size:16px">Você passa sem ser notado!</div></div>`;
            S._bossDefeated = true; saveState();
            S.xpEarned += 10;
            setTimeout(() => { overlay.classList.remove('active'); _showPortalSummary(); }, 2000);
        } else {
            overlay.innerHTML = `<div class="event-content" style="text-align:center">
                <div style="font-size:28px;margin:20px 0;color:#a66">🤫 ${roll}+${stealthMod} = ${total} vs DC ${stealthDC}</div>
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
    retreatBtn.innerHTML = '🏃 Recuar';
    retreatBtn.onclick = () => { overlay.classList.remove('active'); };
    choicesDiv.appendChild(retreatBtn);

    overlay.classList.add('active');
    try { if (tg) tg.HapticFeedback.notificationOccurred('warning'); } catch (e) { console.warn('[EXPLORE] haptic:', e); }
}

function _showPortalSummary() {
    const overlay = document.getElementById('portal-overlay');
    const summary = document.getElementById('portal-summary');

    let html = '';
    if (S.xpEarned > 0) html += `<div class="reward-line">✨ +${S.xpEarned} XP</div>`;
    if (S.goldEarned > 0) html += `<div class="reward-line">💰 +${S.goldEarned} Ouro</div>`;
    if (S.hpChange > 0) html += `<div class="reward-line">❤️ +${S.hpChange} HP</div>`;
    else if (S.hpChange < 0) html += `<div class="reward-line">💔 ${S.hpChange} HP</div>`;
    if (S.itemsFound.length > 0) html += `<div class="reward-line">🎒 ${S.itemsFound.length} itens</div>`;
    html += `<div style="margin-top:8px;color:#8a8090">⬡ ${S.visited.size} turnos</div>`;

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
    document.getElementById('enc-icon').textContent = enc.icon || '⚠️';
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

            let html = `<span class="choice-icon">${ch.i || '➡️'}</span>`;
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
    const overlay = document.getElementById('dm-overlay');
    // Hide the header (icon, title, badge) — DM intro is ambient narration, not an NPC
    const header = overlay.querySelector('.dm-header');
    if (header) header.style.display = 'none';

    const narrEl = document.getElementById('dm-narration');
    const choicesEl = document.getElementById('dm-choices');
    choicesEl.innerHTML = '';

    typewriter(narrEl, text, () => {
        const btn = document.createElement('button');
        btn.className = 'dm-choice-btn';
        btn.innerHTML = '<span class="choice-icon">🗺️</span><span class="choice-label">Explorar</span>';
        btn.addEventListener('click', () => {
            overlay.classList.remove('active');
            // Restore header for next POI event usage
            if (header) header.style.display = '';
        });
        choicesEl.appendChild(btn);
    });

    overlay.classList.add('active');
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
            label: '🔥 Calor Intenso',
            desc: 'O calor abrasador da lava próxima queima sua pele.',
            failEffect: 'fire_damage',
        };
    }

    // Swamp mud — CON save DC 10, poisoned 3 steps
    if (baseTile === 'm' && S.biome === 'swamp') {
        S._hazardsTriggered.add(key);
        return {
            type: 'swamp', stat: 'cn', dc: 10,
            label: '☠️ Miasma Tóxico',
            desc: 'Vapores tóxicos emanam do pântano.',
            failEffect: 'poisoned',
        };
    }

    // Ice — DEX save DC 11, prone (next move slow)
    if (baseTile === 'i') {
        S._hazardsTriggered.add(key);
        return {
            type: 'ice', stat: 'dx', dc: 11,
            label: '🧊 Gelo Escorregadio',
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

    try { if (tg) tg.HapticFeedback.impactOccurred('medium'); } catch (e) { console.warn('[EXPLORE] haptic:', e); }

    const overlay = document.getElementById('check-overlay');
    const diceEl = document.getElementById('dice-display');
    const formulaEl = document.getElementById('check-formula');
    const resultEl = document.getElementById('check-result');

    const statName = STAT_NAMES[hazard.stat] || hazard.stat;

    // Dice animation (show hazard icon or dual dice for disadvantage)
    if (r2 !== null) {
        diceEl.innerHTML = buildDiceHTML(r1, r2, mode);
    } else {
        diceEl.textContent = hazard.label.split(' ')[0];
    }
    diceEl.style.animation = 'none';
    void diceEl.offsetHeight;
    diceEl.style.animation = 'diceRoll 0.7s ease';

    const formulaStr = buildFormula(roll, mod, statName, '', hazard.dc, total, r1, r2, mode);
    formulaEl.innerHTML =
        `<span style="color:var(--v-gold);font-size:14px">${hazard.label}</span><br>` + formulaStr;

    resultEl.textContent = '';
    overlay.classList.add('active');

    setTimeout(() => {
        if (r2 === null) {
            diceEl.textContent = roll <= 1 ? '💀' : roll >= 20 ? '🌟' : '🎲';
        }
        resultEl.textContent = success ? '✅ Resistiu!' : '❌ Falhou!';
        resultEl.className = 'check-result ' + (success ? 'success' : 'failure');

        try {
            if (tg) tg.HapticFeedback.notificationOccurred(success ? 'success' : 'error');
        } catch (e) { console.warn('[EXPLORE] haptic:', e); }

        // Phase 2: Result reading time (2000ms with skip button)
        let _hazDone = false;
        const skipBtn = document.getElementById('check-skip-btn');

        const finishHazard = () => {
            if (_hazDone) return;
            _hazDone = true;
            if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
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

        setTimeout(finishHazard, 2000);
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
        showTerrainToast(`💔 -${dmg} HP (fogo)`, 'damage');
    }
    if (hazard.failEffect === 'poisoned') {
        S.conditions.push({ type: 'poisoned', stepsLeft: 3 });
        showTerrainToast('☠️ Envenenado! (3 turnos)', 'condition');
    }
    if (hazard.failEffect === 'prone') {
        S.conditions.push({ type: 'prone', stepsLeft: 1 });
        showTerrainToast('🧊 Escorregou!', 'condition');
    }
    updateConditionHUD();
    updateRewards();
    logMoveEvent([{ type: 'hazard', effect: hazard.failEffect, source: hazard.type }]);

    // 25% chance: hazard noise attracts nearby creatures
    if (Math.random() < 0.25 && S.encounters && S.encounters.length > 0) {
        const enc = S.encounters.pop();
        const combat = enc.cb || { en: 'Criatura', ei: '⚔️', b: S.biome, d: S.dangerLevel };
        S._hazardCombatPending = { combat };
    }
}

// Called after hazard overlay closes to trigger attracted combat
function checkHazardCombat() {
    if (!S._hazardCombatPending) return false;
    const data = S._hazardCombatPending;
    S._hazardCombatPending = null;
    showTerrainToast('⚠️ O barulho atraiu criaturas!', 'danger');
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
    hpRow.innerHTML = `<span>❤️</span>` +
        `<div class="exit-hp-bar"><div class="exit-hp-fill" style="width:${Math.max(2, hpPct)}%;background:${hpColor}"></div></div>` +
        `<span>${currentHP}/${maxHP}</span>`;

    // Info: distance + risk + estimated encounters
    const distText = distance >= 0 ? `${distance} turnos` : '???';
    const dangerLvl = S.dangerLevel || 1;
    const estEnc = distance > 0 ? Math.max(1, Math.round(distance * dangerLvl * 0.04)) : 0;
    const encText = estEnc > 0 ? `<span>🎲 ~${estEnc} encontro${estEnc > 1 ? 's' : ''}</span>` : '';
    infoRow.innerHTML = `<span>📏 ${distText} até a saída</span>` +
        `<span style="color:${risk.color}">⚔️ Risco: ${risk.label} (${risk.chance}%)</span>` +
        encText;

    // Build options
    optionsEl.innerHTML = '';

    // Option 1: Return to city (with encounter chance on the way back)
    addExitOption(optionsEl, '🏰', 'Retornar à Cidade',
        distance >= 0 ? `Jornada de ${distance} turnos, ${risk.chance}% risco` : 'Rota desconhecida',
        risk.color, () => {
            overlay.classList.remove('active');
            attemptReturnToCity(risk.chance);
        });

    // Option 2: Use healing potion (if available and HP < 100%)
    const healItems = getHealingItems();
    if (healItems.length > 0 && hpPct < 100) {
        const best = healItems[0];
        addExitOption(optionsEl, best.e || '🧪', `Usar ${best.n} (${best.q}x)`,
            `Restaura ${best.h} HP`, '#4a8', () => {
                const heal = useInventoryItem(best);
                showTerrainToast(`${best.e || '🧪'} +${heal} HP`, 'ranger');
                // Refresh the overlay with new HP values
                overlay.classList.remove('active');
                setTimeout(() => showExitRiskAssessment(), 300);
            });
    }

    // Option 3: Camp (if has food items)
    const foodItems = getFoodItems();
    if (foodItems.length > 0) {
        addExitOption(optionsEl, '🏕️', 'Montar Acampamento',
            'Descanso Curto: 1d8 + CON', '#4a8', () => {
                overlay.classList.remove('active');
                showCampOverlay();
            });
    }

    // Option 4: Continue exploring (always)
    addExitOption(optionsEl, '🗺️', 'Continuar Explorando',
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
        btn.innerHTML = `<span style="font-size:20px">${food.e || '🍞'}</span>` +
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
    noFoodBtn.innerHTML = `<span style="font-size:20px">💤</span>` +
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

    showCampResultOverlay(hitDie, conMod, foodBonus, totalHeal, foodName);
}

function showCampResultOverlay(roll, conMod, bonus, total, foodName) {
    const overlay = document.getElementById('camp-result-overlay');
    document.getElementById('camp-result-text').textContent = `+${total} HP Restaurados`;

    const sign = conMod >= 0 ? '+' : '';
    let detail = `🎲 1d8 = ${roll} ${sign} ${conMod} (CON) = ${roll + conMod}`;
    if (bonus > 0) {
        detail += `\n🍽️ ${foodName}: +${bonus} HP`;
    }
    detail += `\n\n❤️ HP: ${getCurrentHP()}/${getMaxHP()}`;
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
        showTerrainToast('⚠️ Algo ataca durante seu descanso!', 'danger');
        setTimeout(() => {
            triggerCombat({ combat: S.campAmbush });
        }, 1500);
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
    hpRow.innerHTML = `<span>❤️</span>` +
        `<div class="exit-hp-bar"><div class="exit-hp-fill" style="width:${Math.max(2, hpPct)}%;background:#c44"></div></div>` +
        `<span style="color:#c44">${currentHP}/${maxHP}</span>`;

    // Build options
    optionsEl.innerHTML = '';

    // Option 1: Use healing potion (priority)
    const healItems = getHealingItems();
    for (const item of healItems.slice(0, 2)) {
        addExitOption(optionsEl, item.e || '🧪', `Usar ${item.n} (${item.q}x)`,
            `Restaura ${item.h} HP`, '#4a8', () => {
                const heal = useInventoryItem(item);
                showTerrainToast(`${item.e || '🧪'} +${heal} HP`, 'ranger');
                overlay.classList.remove('active');
                // Allow alert to show again if still low after heal
                S._lowHPAlertShown = false;
            });
    }

    // Option 2: Return to city
    const distText = distance >= 0 ? `${distance} turnos` : '???';
    addExitOption(optionsEl, '🏰', `Retornar (${distText})`,
        `Risco: ${risk.label} (${risk.chance}%)`, risk.color, () => {
            overlay.classList.remove('active');
            finishExploration('exit');
        });

    // Option 3: Continue exploring
    addExitOption(optionsEl, '⚔️', 'Continuar Explorando',
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
            <div style="font-size:20px;margin-bottom:8px">💀 Salvaguardas contra Morte</div>
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
                    🛡️ Estabilizado! Você acorda com 1 HP.</div>`;
            } else if (failures >= 3) {
                html += `<div style="text-align:center;color:#a66;font-size:16px;margin-top:12px">
                    💀 Você sucumbe aos ferimentos...</div>`;
            } else if (roll === 20) {
                html += `<div style="text-align:center;color:#ffd700;font-size:16px;margin-top:12px">
                    ⭐ Crítico Natural! Você se levanta com 1 HP!</div>`;
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
    if (S.xpEarned > 0) html += `<div class="reward-line">✨ +${S.xpEarned} XP</div>`;
    if (S.goldEarned > 0) html += `<div class="reward-line">💰 +${S.goldEarned} Ouro</div>`;
    html += `<div class="reward-line">💀 HP reduzido a 0</div>`;
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
// RETURN JOURNEY — roll for encounter on the way back
// ═══════════════════════════════════════════════════════
let _returningToCity = false;

function attemptReturnToCity(riskChance) {
    const roll = Math.random() * 100;
    if (roll < riskChance && S.randomEncounters.length > 0) {
        // Encounter on the way back! Show it, then finish after resolution
        _returningToCity = true;
        const enc = S.randomEncounters.shift();
        setTimeout(() => showRandomEncounter(enc), 300);
    } else {
        // Safe journey — finish exploration
        finishExploration('exit');
    }
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
    h['ngrok-skip-browser-warning'] = '1';
    h['X-Idempotency-Key'] = crypto.randomUUID();
    try {
        const r = await fetchT(S.apiBase + '/api/webapp/transition', {
            method: 'POST', headers: h,
            body: JSON.stringify({
                from: 'explore', to: 'game',
                user_id: parseInt(S.uid),
                payload: { results: payload.results }
            })
        });
        const d = await r.json();
        if (d.url) { window.location.replace(d.url); return; }
    } catch (e) { console.error('[EXPLORE] transition error:', e); }
    // Fallback: close WebApp and let user tap JOGAR from Telegram
    // (explore token is not valid for Game Hub sessions)
    if (window.Telegram && Telegram.WebApp) { Telegram.WebApp.close(); }
}

async function _transitionToNavigateFromExplore(payload) {
    const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + S.token };
    if (window.Telegram?.WebApp?.initData) h['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
    h['ngrok-skip-browser-warning'] = '1';
    h['X-Idempotency-Key'] = crypto.randomUUID();
    try {
        const r = await fetchT(S.apiBase + '/api/webapp/transition', {
            method: 'POST', headers: h,
            body: JSON.stringify({
                from: 'explore', to: 'navigate',
                user_id: parseInt(S.uid),
                payload: { results: payload.results }
            })
        });
        const d = await r.json();
        if (d.url) { window.location.replace(d.url); return; }
    } catch (e) { console.error('[EXPLORE] navigate transition error:', e); }
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
            tg.BackButton.onClick(() => { showExitRiskAssessment(); });
        }
    }

    // Save state on close attempt
    window.addEventListener('beforeunload', () => { saveState(); });

    const params = new URLSearchParams(window.location.search);
    S.token = params.get('token') || '';
    S.apiBase = params.get('api') || '';
    S.uid = params.get('uid') || '';
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
            _sh['ngrok-skip-browser-warning'] = '1';
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

        // Post-combat narrative when returning from arena
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

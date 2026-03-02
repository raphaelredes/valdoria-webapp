// ═══════════════════════════════════════════════════════
// POI INTERACTION
// ═══════════════════════════════════════════════════════
function showPOI(poi) {
    // POI discovery flash on hex
    const poiHex = getHexEl(poi.col, poi.row);
    if (poiHex) {
        poiHex.classList.add('poi-discovered');
        setTimeout(() => poiHex.classList.remove('poi-discovered'), 700);
    }

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

function typewriter(el, text, onDone) {
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
            if (onDone) onDone();
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

        // Stat check display (D&D 5e skill with proficiency indicator)
        if (ch.k) {
            const statShort = STAT_SHORT[ch.k.s] || ch.k.s.toUpperCase();
            const proficient = S.charData && S.charData.sp && S.charData.sp.includes(ch.k.s);
            const profMark = proficient ? '★' : '';
            const mod = ch.k.m || 0;
            const chance = Math.max(5, Math.min(95, Math.round(((21 - ch.k.dc + mod) / 20) * 100)));
            html += `<span class="choice-check">${statShort}${profMark} ${chance}%</span>`;
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
// STAT CHECK
// ═══════════════════════════════════════════════════════
function performStatCheck(poi, choice) {
    const check = choice.k;
    const roll = Math.floor(Math.random() * 20) + 1;
    const mod = check.m || 0;

    // Condition penalties (D&D 5e — Poisoned: disadvantage on ability checks)
    const condPenalty = hasCondition('poisoned') ? -2 : 0;
    const effectiveMod = mod + condPenalty;
    const total = roll + effectiveMod;
    const dc = check.dc || 10;
    const success = total >= dc;

    // Record check
    S.checksPerformed.push({
        stat: check.s, dc: dc, roll: roll, mod: effectiveMod, ok: success,
    });

    // Haptic on dice roll
    try { if (tg) tg.HapticFeedback.impactOccurred('medium'); } catch(e) {}

    // Show check overlay
    const overlay = document.getElementById('check-overlay');
    const diceEl = document.getElementById('dice-display');
    const formulaEl = document.getElementById('check-formula');
    const resultEl = document.getElementById('check-result');

    const statName = STAT_NAMES[check.s] || check.s;
    const proficient = S.charData && S.charData.sp && S.charData.sp.includes(check.s);
    const profMark = proficient ? '★' : '';
    const condText = condPenalty ? ` <span style="color:#a44">${condPenalty} ☠️</span>` : '';

    diceEl.textContent = '🎲';
    diceEl.style.animation = 'none';
    void diceEl.offsetHeight; // trigger reflow
    diceEl.style.animation = 'diceRoll 0.7s ease';

    formulaEl.innerHTML = `<b>${roll}</b> + ${mod}${condText} (${statName}${profMark}) = <b>${total}</b> vs DC <b>${dc}</b>`;

    overlay.classList.add('active');

    setTimeout(() => {
        diceEl.textContent = roll <= 1 ? '💀' : roll >= 20 ? '🌟' : '🎲';
        resultEl.textContent = success ? '✅ Sucesso!' : '❌ Falha!';
        resultEl.className = 'check-result ' + (success ? 'success' : 'failure');

        // Haptic on result
        try {
            if (tg) tg.HapticFeedback.notificationOccurred(success ? 'success' : 'error');
        } catch(e) {}

        setTimeout(() => {
            overlay.classList.remove('active');
            const outcome = success ? (choice.o || {}) : (choice.f || choice.o || {});

            // Handle combat-on-fail for danger POIs (Intimidar/Esgueirar failed)
            if (!success && choice.cmb_on_fail && poi.combat) {
                triggerCombat(poi);
                return;
            }

            // Handle multi-step events (stage 2)
            if (success && choice.s2) {
                showStage2(poi, choice.s2);
                return;
            }

            applyOutcome(poi, outcome, choice);
        }, 1200);
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
                const mod = ch.k.m || 0;
                const chance = Math.max(5, Math.min(95, Math.round(((21 - ch.k.dc + mod) / 20) * 100)));
                html += `<span class="choice-check">${statShort}${profMark} ${chance}%</span>`;
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
            const newHP = Math.max(1, S.charData.hp + S.hpChange);
            updateHP(newHP, S.charData.mh);
        }
    }
    if (outcome.i) {
        S.itemsFound.push(outcome.i);
        addRewardBadge(rewardsEl, `🎒 ${outcome.i}`, 'item');
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
    saveState();
}

// ═══════════════════════════════════════════════════════
// COMBAT
// ═══════════════════════════════════════════════════════
function triggerCombat(poi) {
    const combat = poi.combat;
    S.combatTrigger = combat;

    const overlay = document.getElementById('combat-overlay');
    document.getElementById('combat-icon').textContent = combat.ei || '⚔️';
    document.getElementById('combat-enemy').textContent = combat.en || 'Inimigo';
    document.getElementById('combat-text').textContent = 'Preparando combate...';

    overlay.classList.add('active');
    try { if (tg) tg.HapticFeedback.impactOccurred('heavy'); } catch(e) {}

    setTimeout(() => {
        finishExploration('combat');
    }, 2000);
}

// ═══════════════════════════════════════════════════════
// PORTAL OVERLAY (exit transition)
// ═══════════════════════════════════════════════════════
function showPortalOverlay() {
    const overlay = document.getElementById('portal-overlay');
    const summary = document.getElementById('portal-summary');

    let html = '';
    if (S.xpEarned > 0) html += `<div class="reward-line">✨ +${S.xpEarned} XP</div>`;
    if (S.goldEarned > 0) html += `<div class="reward-line">💰 +${S.goldEarned} Ouro</div>`;
    if (S.hpChange > 0) html += `<div class="reward-line">❤️ +${S.hpChange} HP</div>`;
    else if (S.hpChange < 0) html += `<div class="reward-line">💔 ${S.hpChange} HP</div>`;
    if (S.itemsFound.length > 0) html += `<div class="reward-line">🎒 ${S.itemsFound.length} itens</div>`;
    html += `<div style="margin-top:8px;color:#8a8090">⬡ ${S.visited.size} hexes explorados</div>`;

    summary.innerHTML = html;
    overlay.classList.add('active');

    try { if (tg) tg.HapticFeedback.notificationOccurred('success'); } catch(e) {}

    setTimeout(() => {
        finishExploration('finished');
    }, 2500);
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

    try { if (tg) tg.HapticFeedback.impactOccurred('heavy'); } catch(e) {}

    const overlay = document.getElementById('encounter-overlay');
    document.getElementById('enc-icon').textContent = enc.icon || '⚠️';
    document.getElementById('enc-title').textContent = enc.title || 'Encontro!';

    const ENC_TYPE_LABELS = {amb:'Emboscada',trp:'Armadilha',hid:'Descoberta',snd:'Ameaça',wth:'Clima'};
    document.getElementById('enc-type').textContent = ENC_TYPE_LABELS[enc.type] || 'Surpresa';

    const narrEl = document.getElementById('enc-narration');
    const choicesEl = document.getElementById('enc-choices');
    choicesEl.innerHTML = '';

    typewriter(narrEl, enc.narration || '', () => {
        (enc.choices || []).forEach((ch, idx) => {
            const btn = document.createElement('button');
            btn.className = 'dm-choice-btn';

            // All encounter choices MUST have a stat check (dice roll required)
            const check = ch.k || { s: 'acr', dc: 10, m: 0 };
            const statShort = STAT_SHORT[check.s] || check.s.toUpperCase();
            const proficient = S.charData && S.charData.sp && S.charData.sp.includes(check.s);
            const profMark = proficient ? '★' : '';
            const mod = check.m || 0;
            const chance = Math.max(5, Math.min(95, Math.round(((21 - check.dc + mod) / 20) * 100)));

            let html = `<span class="choice-icon">${ch.i || '➡️'}</span>`;
            html += `<span class="choice-label">${ch.t || ch.l || 'Agir'}</span>`;
            html += `<span class="choice-check">${statShort}${profMark} ${chance}%</span>`;

            btn.innerHTML = html;
            btn.addEventListener('click', () => {
                overlay.classList.remove('active');
                // Build enhanced choice with guaranteed stat check + fail outcome
                const enhanced = Object.assign({}, ch, { k: check });
                if (!enhanced.f) {
                    enhanced.f = {
                        t: 'A tentativa falhou!',
                        d: Math.max(1, Math.ceil(S.dangerLevel * 1.5)),
                    };
                }
                performStatCheck({id: -1, choices: [], combat: null, type: 'enc'}, enhanced);
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
    document.getElementById('dm-icon').textContent = '📜';
    document.getElementById('dm-title').textContent = 'Mestre';
    document.getElementById('dm-type').textContent = 'Narração';

    const narrEl = document.getElementById('dm-narration');
    const choicesEl = document.getElementById('dm-choices');
    choicesEl.innerHTML = '';

    typewriter(narrEl, text, () => {
        const btn = document.createElement('button');
        btn.className = 'dm-choice-btn';
        btn.innerHTML = '<span class="choice-icon">🗺️</span><span class="choice-label">Explorar</span>';
        btn.addEventListener('click', () => overlay.classList.remove('active'));
        choicesEl.appendChild(btn);
    });

    overlay.classList.add('active');
}

// ═══════════════════════════════════════════════════════
// TERRAIN TOAST & ENVIRONMENTAL HAZARDS (D&D 5e Phase 2)
// ═══════════════════════════════════════════════════════

// Compact toast notification for terrain effects
function showTerrainToast(message, type) {
    const existing = document.querySelector('.terrain-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `terrain-toast ${type}`;
    toast.textContent = message;
    const viewport = document.getElementById('map-viewport');
    if (viewport) viewport.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('visible');
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 1500);
    });
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
    const condPenalty = hasCondition('poisoned') ? -2 : 0;
    const effectiveMod = mod + condPenalty;
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + effectiveMod;
    const success = total >= hazard.dc;

    S.checksPerformed.push({
        stat: hazard.stat, dc: hazard.dc, roll: roll, mod: effectiveMod, ok: success,
    });

    try { if (tg) tg.HapticFeedback.impactOccurred('medium'); } catch(e) {}

    const overlay = document.getElementById('check-overlay');
    const diceEl = document.getElementById('dice-display');
    const formulaEl = document.getElementById('check-formula');
    const resultEl = document.getElementById('check-result');

    const statName = STAT_NAMES[hazard.stat] || hazard.stat;
    const condText = condPenalty ? ` <span style="color:#a44">${condPenalty} ☠️</span>` : '';

    diceEl.textContent = hazard.label.split(' ')[0]; // Hazard icon
    diceEl.style.animation = 'none';
    void diceEl.offsetHeight;
    diceEl.style.animation = 'diceRoll 0.7s ease';

    formulaEl.innerHTML =
        `<span style="color:var(--v-gold);font-size:14px">${hazard.label}</span><br>` +
        `<b>${roll}</b> + ${mod}${condText} (${statName}) = <b>${total}</b> vs DC <b>${hazard.dc}</b>`;

    resultEl.textContent = '';
    overlay.classList.add('active');

    setTimeout(() => {
        diceEl.textContent = roll <= 1 ? '💀' : roll >= 20 ? '🌟' : '🎲';
        resultEl.textContent = success ? '✅ Resistiu!' : '❌ Falhou!';
        resultEl.className = 'check-result ' + (success ? 'success' : 'failure');

        try {
            if (tg) tg.HapticFeedback.notificationOccurred(success ? 'success' : 'error');
        } catch(e) {}

        setTimeout(() => {
            overlay.classList.remove('active');
            if (!success) {
                applyHazardEffect(hazard);
            }
            saveState();
        }, 1200);
    }, 700);
}

// Apply hazard consequences on failed save
function applyHazardEffect(hazard) {
    if (hazard.failEffect === 'fire_damage') {
        const dmg = Math.floor(Math.random() * 4) + 1; // 1d4
        S.hpChange -= dmg;
        if (S.charData) {
            const newHP = Math.max(1, S.charData.hp + S.hpChange);
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
}

// ═══════════════════════════════════════════════════════
// FINISH
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
    try { if (tg) tg.HapticFeedback.impactOccurred('medium'); } catch(e) {}

    // Clean up session storage
    try { sessionStorage.removeItem(STORAGE_KEY); } catch(e) {}

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
        },
        combat: S.combatTrigger,
    };

    try {
        if (tg && tg.sendData) {
            tg.sendData(JSON.stringify(payload));
        } else {
            console.log('[EXPLORE] sendData payload:', JSON.stringify(payload, null, 2));
        }
    } catch(e) {
        console.error('[EXPLORE] sendData failed:', e);
    }

    // Always close after timeout (fallback like arena)
    setTimeout(() => {
        try { if (tg) tg.close(); } catch(e) {
            console.warn('[EXPLORE] tg.close fallback failed:', e);
        }
    }, 500);
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
        const {done, value} = await reader.read();
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
        try { tg.disableVerticalSwipes(); } catch(e) { console.warn('[EXPLORE] disableVerticalSwipes not supported'); }
    }

    // Save state on close attempt
    window.addEventListener('beforeunload', () => { saveState(); });

    const params = new URLSearchParams(window.location.search);
    S.token = params.get('token') || '';
    const dataB64 = params.get('data') || '';

    if (!dataB64) {
        document.getElementById('loading').innerHTML = '<div style="color:#a44;font-size:16px;text-align:center;padding:20px">Dados do mapa não encontrados.<br>Volte ao bot e tente novamente.</div>';
        return;
    }

    try {
        const binary = atob(dataB64.replace(/-/g,'+').replace(/_/g,'/'));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const inflated = await zlibInflate(bytes);
        const json = new TextDecoder().decode(inflated);
        const data = JSON.parse(json);
        loadMapData(data);
    } catch(e) {
        console.error('Failed to parse map data:', e);
        document.getElementById('loading').innerHTML = '<div style="color:#a44;font-size:16px;text-align:center;padding:20px">Erro ao carregar mapa.<br>'+e.message+'</div>';
    }
}

// Start
document.addEventListener('DOMContentLoaded', () => initAsync());

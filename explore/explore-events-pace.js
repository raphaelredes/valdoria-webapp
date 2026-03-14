// ═══════════════════════════════════════════════════════
//  EXPLORE EVENTS — Pace, Activities & Area Actions
//  Travel Pace (D&D PHB Ch.8), Weather Effects (DMG Ch.5),
//  Travel Activities, Explore Area, Secret Passages
//  Depends on: explore-events.js (dice, UI globals, state)
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// =========================================================
// TRAVEL PACE (D&D PHB Ch.8)
// =========================================================
const PACE_CONFIG = {
    fast:     { icon: '\u{1F3C3}', label: 'R\u00e1pido',   color: 'pace-fast',     pp: -5, dcMod: 0,  desc: '-5 Percep\u00e7\u00e3o Passiva' },
    normal:   { icon: '\u{1F6B6}', label: 'Normal',    color: '',              pp: 0,  dcMod: 0,  desc: 'Ritmo padr\u00e3o' },
    cautious: { icon: '\u{1F43E}', label: 'Cauteloso', color: 'pace-cautious', pp: +5, dcMod: -2, desc: '+5 Percep\u00e7\u00e3o, -2 DC hazards' },
};

function cycleTravelPace() {
    const order = ['fast', 'normal', 'cautious'];
    const idx = order.indexOf(S.travelPace || 'normal');
    S.travelPace = order[(idx + 1) % 3];
    updatePaceUI();
    saveState();
    const cfg = PACE_CONFIG[S.travelPace];
    showTerrainToast(`${cfg.icon} ${cfg.label}: ${cfg.desc}`, 'info');
}

function updatePaceUI() {
    const btn = document.getElementById('pace-toggle');
    if (!btn) return;
    const cfg = PACE_CONFIG[S.travelPace || 'normal'];
    btn.textContent = cfg.icon;
    btn.className = 'pace-toggle ' + cfg.color;
    btn.title = `${cfg.label}: ${cfg.desc}`;
}

function getPaceDCMod() {
    return (PACE_CONFIG[S.travelPace] || {}).dcMod || 0;
}

// =========================================================
// WEATHER MECHANICAL EFFECTS (DMG Ch.5)
// =========================================================
let _weatherEffectSteps = 0;

function _checkWeatherEffects() {
    _weatherEffectSteps++;

    // CON save for extreme conditions every 8 steps
    if (S._weatherCONSaveDC > 0 && _weatherEffectSteps % 8 === 0) {
        const conMod = getAbilityMod('cn');
        const prof = S.charData && S.charData.sp && S.charData.sp.includes('cn') ? (S.charData.pb || 2) : 0;
        const { roll } = rollD20('normal');
        const total = roll + conMod;
        if (total < S._weatherCONSaveDC) {
            if (typeof addExhaustion === 'function') {
                const source = S.biome === 'desert' || S.biome === 'volcanic'
                    ? 'Calor extremo' : 'Tempestade';
                addExhaustion(1, source);
            }
        } else {
            showTerrainToast('Resistiu ao clima! (CON ' + total + ' vs DC ' + S._weatherCONSaveDC + ')', 'ranger');
        }
    }

    // Lightning strike in storms (open terrain: plains, desert, mountain)
    if (S._weatherLightningChance > 0 && Math.random() < S._weatherLightningChance) {
        const openBiomes = ['plains', 'desert', 'mountain'];
        if (openBiomes.includes(S.biome)) {
            // DEX save DC 13 or 2d6 lightning damage
            const dexMod = getAbilityMod('dx');
            const { roll } = rollD20('normal');
            const total = roll + dexMod;
            if (total < 13) {
                const dmg = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2; // 2d6
                S.hpChange -= dmg;
                if (S.charData) {
                    const newHP = Math.max(0, S.charData.hp + S.hpChange);
                    updateHP(newHP, S.charData.mh);
                }
                flashScreen('rgba(200,200,255,0.4)');
                showTerrainToast('\u26a1 Raio! -' + dmg + ' HP (DEX ' + total + ' vs DC 13)', 'damage');
            } else {
                flashScreen('rgba(200,200,255,0.15)');
                showTerrainToast('\u26a1 Um raio cai perto! Voc\u00ea desvia a tempo.', 'info');
            }
            if (typeof checkDeath === 'function') checkDeath();
        }
    }
}

// =========================================================
// TRAVEL ACTIVITIES (D&D PHB Ch.8)
// =========================================================
const ACTIVITY_CONFIG = {
    watch:   { icon: '\u{1F441}',  name: 'Vigiar',      stat: 'per', desc: 'Vantagem no primeiro encontro (n\u00e3o \u00e9 surpreendido)', effect: 'Percep\u00e7\u00e3o ativa durante viagem' },
    forage:  { icon: '\u{1F33F}',  name: 'Forragear',   stat: 'sur', desc: 'Encontra ervas e materiais a cada 5 passos (Sobreviv\u00eancia)', effect: 'DC 10+perigo' },
    navigate:{ icon: '\u{1F9ED}',  name: 'Navegar',     stat: 'sur', desc: 'Revela POIs ocultos em raio maior (Sobreviv\u00eancia DC 15)', effect: 'Amplia detec\u00e7\u00e3o' },
    stealth: { icon: '\u{1F977}',  name: 'Furtividade', stat: 'ste', desc: 'Chance de evitar encontros aleat\u00f3rios (requer ritmo Cauteloso)', effect: 'Requer ritmo Cauteloso' },
};

function showActivitySelection() {
    const overlay = document.getElementById('activity-overlay');
    const choicesEl = document.getElementById('activity-choices');
    if (!overlay || !choicesEl) return;
    choicesEl.innerHTML = '';

    for (const [key, cfg] of Object.entries(ACTIVITY_CONFIG)) {
        const btn = document.createElement('button');
        btn.className = 'activity-choice-btn';
        const mod = getAbilityMod(cfg.stat);
        const prof = S.charData && S.charData.sp && S.charData.sp.includes(cfg.stat) ? (S.charData.pb || 2) : 0;
        const statShort = STAT_SHORT[cfg.stat] || cfg.stat.toUpperCase();
        const profStar = prof > 0 ? '\u2605' : '';
        const isStealthLocked = key === 'stealth' && S.travelPace !== 'cautious';
        const selected = S.travelActivity === key;

        const total = mod + prof;
        const statLine = total !== 0 ? `<span class="act-stat">${statShort}${profStar} ${total >= 0 ? '+' : ''}${total}${isStealthLocked ? ' \u{1F512} Requer Cauteloso' : ''}</span>` :
            (isStealthLocked ? `<span class="act-stat">\u{1F512} Requer Cauteloso</span>` : '');
        btn.innerHTML = `<span class="act-name">${cfg.icon} ${cfg.name}${selected ? ' \u2714' : ''}</span>` +
            statLine +
            `<span class="act-effect">${cfg.desc}</span>`;

        if (isStealthLocked) {
            btn.style.opacity = '0.45';
            btn.onclick = () => showTerrainToast('Furtividade requer ritmo Cauteloso!', 'info');
        } else {
            btn.onclick = () => {
                S.travelActivity = key;
                _updateActivityBadge();
                overlay.classList.remove('active');
                saveState();
                showTerrainToast(`${cfg.icon} ${cfg.name}: ${cfg.effect}`, 'info');
                // Navigate activity: immediate POI reveal check
                if (key === 'navigate') _tryNavigateReveal();
            };
        }
        choicesEl.appendChild(btn);
    }

    // Cancel / no activity
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'activity-choice-btn';
    cancelBtn.style.opacity = '0.6';
    cancelBtn.innerHTML = '<span class="act-name">Nenhuma</span><span class="act-effect">Viaje sem atividade especial</span>';
    cancelBtn.onclick = () => {
        S.travelActivity = null;
        _updateActivityBadge();
        overlay.classList.remove('active');
        saveState();
    };
    choicesEl.appendChild(cancelBtn);

    overlay.classList.add('active');
}

function _updateActivityBadge() {
    const badge = document.getElementById('activity-badge');
    if (!badge) return;
    if (S.travelActivity) {
        const cfg = ACTIVITY_CONFIG[S.travelActivity];
        badge.textContent = cfg ? cfg.icon : '';
        badge.title = cfg ? `${cfg.name}: ${cfg.effect}` : '';
        badge.style.display = '';
    } else {
        badge.style.display = 'none';
    }
}

// Navigate activity: reveal hidden POIs in extended radius
function _tryNavigateReveal() {
    const mod = getAbilityMod('sur');
    const prof = S.charData && S.charData.sp && S.charData.sp.includes('sur') ? (S.charData.pb || 2) : 0;
    const { roll } = rollD20('normal');
    const total = roll + mod + prof;
    if (total >= 15) {
        let revealed = 0;
        for (const poi of S.pois) {
            if (!S.poisResolved.has(poi.id) && poi.hidden) {
                const dist = hexDist(poi.col, poi.row, S.playerCol, S.playerRow);
                if (dist <= S.visibility + 3) { poi.hidden = false; poi.hid = 0; revealed++; }
            }
        }
        if (revealed > 0) showTerrainToast(`\u{1F9ED} Navega\u00e7\u00e3o: revelou ${revealed} local${revealed > 1 ? 'is' : ''} oculto${revealed > 1 ? 's' : ''}!`, 'ranger');
        else showTerrainToast('\u{1F9ED} Navega\u00e7\u00e3o: caminho est\u00e1 claro.', 'info');
    } else {
        showTerrainToast('\u{1F9ED} Navega\u00e7\u00e3o: n\u00e3o detectou nada incomum.', 'info');
    }
}

// Forage activity: check every 5 steps
function _checkForageActivity() {
    if (S.travelActivity !== 'forage') return;
    if (S._stepCount % 5 !== 0) return;
    const mod = getAbilityMod('sur');
    const prof = S.charData && S.charData.sp && S.charData.sp.includes('sur') ? (S.charData.pb || 2) : 0;
    const { roll } = rollD20('normal');
    const dc = 10 + S.dangerLevel;
    const total = roll + mod + prof;
    if (total >= dc) {
        const gp = 3 + Math.floor(Math.random() * 10);
        S.goldEarned += gp;
        updateRewards();
        showTerrainToast(`\u{1F33F} Forragear: encontrou materiais (+${gp} GP)`, 'ranger');
    }
}

// Watch activity: advantage on first random encounter
function _checkWatchAdvantage() {
    if (S.travelActivity !== 'watch') return false;
    if (S._watchUsed) return false;
    S._watchUsed = true;
    showTerrainToast('\u{1F441} Vigiando: voc\u00ea n\u00e3o \u00e9 surpreendido!', 'ranger');
    return true; // Caller grants advantage
}

// Stealth activity: chance to avoid random encounter
function _checkStealthAvoid() {
    if (S.travelActivity !== 'stealth') return false;
    if (S.travelPace !== 'cautious') return false;
    const mod = getAbilityMod('ste');
    const prof = S.charData && S.charData.sp && S.charData.sp.includes('ste') ? (S.charData.pb || 2) : 0;
    const { roll } = rollD20('normal');
    const total = roll + mod + prof;
    if (total >= 13) {
        showTerrainToast('\u{1F977} Furtividade: evitou o encontro!', 'ranger');
        return true; // Skip the encounter
    }
    return false;
}

// =========================================================
// EXPLORE AREA (Search, Forage, Observe, Rest)
// =========================================================
function showExploreArea() {
    const key = `${S.playerCol},${S.playerRow}`;
    if (!S.interactedHexes) S.interactedHexes = new Set();
    if (S.interactedHexes.has(key)) {
        showTerrainToast('Voc\u00ea j\u00e1 explorou esta \u00e1rea.', 'info');
        return;
    }

    const overlay = document.getElementById('dm-overlay');
    const header = document.getElementById('dm-title');
    const body = document.getElementById('dm-narration');
    const choicesEl = document.getElementById('dm-choices');
    if (!overlay || !body) return;

    header.textContent = '\u{1F50D} Explorar \u00c1rea';
    body.innerHTML = '<p style="color:var(--v-text);font-size:14px;line-height:1.6;margin:0">Voc\u00ea para por um momento e observa os arredores. O que deseja fazer?</p>';
    choicesEl.innerHTML = '';
    overlay.classList.add('active');

    const options = [
        { label: '\u{1F50E} Procurar', stat: 'inv', dc: 12, onOk: _exploreSearchSuccess, onFail: _exploreSearchFail },
        { label: '\u{1F33F} Forragear', stat: 'sur', dc: 10 + S.dangerLevel, onOk: _exploreForageSuccess, onFail: _exploreForageFail },
        { label: '\u{1F441} Observar',  stat: 'per', dc: 13, onOk: _exploreObserveSuccess, onFail: _exploreObserveFail },
    ];

    for (const opt of options) {
        const btn = document.createElement('button');
        btn.className = 'dm-choice-btn';
        const mod = getAbilityMod(opt.stat);
        const prof = S.charData && S.charData.sp && S.charData.sp.includes(opt.stat) ? (S.charData.pb || 2) : 0;
        const total = mod + prof;
        const chance = Math.min(95, Math.max(5, (21 - opt.dc + total) * 5));
        const statShort = STAT_SHORT[opt.stat] || opt.stat.toUpperCase();
        const profStar = prof > 0 ? '\u2605' : '';
        btn.innerHTML = `${opt.label} <span class="choice-stat-badge">${statShort}${profStar} ${chance}%</span>`;
        btn.onclick = () => {
            overlay.classList.remove('active');
            S.interactedHexes.add(key);
            _markExploreUsed();
            _doExploreCheck(opt);
        };
        choicesEl.appendChild(btn);
    }

    const restBtn = document.createElement('button');
    restBtn.className = 'dm-choice-btn';
    restBtn.innerHTML = '\u26fa Descansar';
    restBtn.onclick = () => {
        overlay.classList.remove('active');
        S.interactedHexes.add(key);
        _markExploreUsed();
        if (typeof showCampingOverlay === 'function') showCampingOverlay();
    };
    choicesEl.appendChild(restBtn);

    // Secret passage check (Investigation DC 15)
    const secretBtn = document.createElement('button');
    secretBtn.className = 'dm-choice-btn';
    const invMod2 = getAbilityMod('inv');
    const invProf2 = S.charData && S.charData.sp && S.charData.sp.includes('inv') ? (S.charData.pb || 2) : 0;
    const invChance2 = Math.max(5, Math.min(95, (21 - 15 + invMod2 + invProf2) * 5));
    const invShort2 = STAT_SHORT['inv'] || 'INV';
    secretBtn.innerHTML = `\u{1F6AA} Procurar Passagem <span class="choice-stat-badge">${invShort2}${invProf2 ? '\u2605' : ''} ${invChance2}%</span>`;
    secretBtn.onclick = () => {
        overlay.classList.remove('active');
        S.interactedHexes.add(key);
        _markExploreUsed();
        _doSecretPassageCheck();
    };
    choicesEl.appendChild(secretBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'dm-choice-btn';
    cancelBtn.style.opacity = '0.6';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.onclick = () => overlay.classList.remove('active');
    choicesEl.appendChild(cancelBtn);
}

function _markExploreUsed() {
    const btn = document.getElementById('btn-explore');
    if (btn) btn.classList.add('on-cooldown');
    saveState();
}

function _resetExploreButton() {
    const btn = document.getElementById('btn-explore');
    if (!btn) return;
    if (!S.interactedHexes) S.interactedHexes = new Set();
    const key = `${S.playerCol},${S.playerRow}`;
    btn.classList.toggle('on-cooldown', S.interactedHexes.has(key));
}

function _doExploreCheck(opt) {
    const mod = getAbilityMod(opt.stat);
    const prof = S.charData && S.charData.sp && S.charData.sp.includes(opt.stat) ? (S.charData.pb || 2) : 0;
    const mode = hasCondition('poisoned') ? 'disadvantage' : 'normal';
    const { roll, r1, r2 } = rollD20(mode);
    const total = roll + mod + prof;
    const success = total >= opt.dc;

    S.checksPerformed.push({ stat: opt.stat, dc: opt.dc, roll, mod: mod + prof, ok: success, mode });

    const overlay = document.getElementById('check-overlay');
    const formulaEl = document.getElementById('check-formula');
    const resultEl = document.getElementById('check-result');
    formulaEl.innerHTML = '';
    resultEl.textContent = '';
    resultEl.className = 'check-result';
    overlay.classList.add('active');

    const statName = STAT_NAMES[opt.stat] || opt.stat;
    const dice = getDice3D();
    const finishCheck = () => {
        resultEl.textContent = success ? 'Sucesso!' : 'Falha!';
        resultEl.className = 'check-result ' + (success ? 'success' : 'failure');
        const formulaStr = buildFormula(roll, mod + prof, statName, '', opt.dc, total, r1, r2, mode);
        formulaEl.innerHTML = formulaStr;
        if (window.vHaptic) vHaptic.notify(success ? 'success' : 'error');

        let _done = false;
        const finish = () => {
            if (_done) return;
            _done = true;
            disposeDice3D();
            overlay.classList.remove('active');
            if (success) opt.onOk();
            else opt.onFail();
            saveState();
        };
        const skipBtn = document.getElementById('check-skip-btn');
        setTimeout(() => { if (!_done && skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = finish; } }, 500);
        setTimeout(finish, 2500);
    };

    if (dice) { dice.roll(roll, finishCheck); }
    else { setTimeout(finishCheck, 700); }
}

function _exploreSearchSuccess() {
    const xp = 15 + Math.floor(Math.random() * 20);
    S.xpEarned += xp;
    updateRewards();
    showTerrainToast('\u{1F50E} Encontrou algo! +' + xp + ' XP', 'info');
    const hiddenPoi = S.pois.find(p => !S.poisResolved.has(p.id) && p.hid);
    if (hiddenPoi) {
        hiddenPoi.hid = 0;
        showTerrainToast('\u2728 Descobriu algo oculto nas proximidades!', 'info');
    }
}
function _exploreSearchFail() { showTerrainToast('\u{1F50E} N\u00e3o encontrou nada de especial.', 'info'); }
function _exploreForageSuccess() {
    const gp = 5 + Math.floor(Math.random() * 15);
    S.goldEarned += gp;
    updateRewards();
    showTerrainToast('\u{1F33F} Forragear: encontrou ervas e materiais (+' + gp + ' GP)', 'info');
}
function _exploreForageFail() { showTerrainToast('\u{1F33F} N\u00e3o encontrou nada \u00fatil.', 'info'); }
function _exploreObserveSuccess() {
    let revealed = 0;
    for (const poi of S.pois) {
        if (!S.poisResolved.has(poi.id) && poi.hid) {
            const dist = hexDist(poi.col, poi.row, S.playerCol, S.playerRow);
            if (dist <= S.visibility + 2) { poi.hid = 0; revealed++; }
        }
    }
    if (revealed > 0) {
        showTerrainToast('\u{1F441} Percep\u00e7\u00e3o agu\u00e7ada! ' + revealed + ' local(is) revelado(s)!', 'info');
    } else {
        S.xpEarned += 10;
        updateRewards();
        showTerrainToast('\u{1F441} Observou bem os arredores. +10 XP', 'info');
    }
}
function _exploreObserveFail() { showTerrainToast('\u{1F441} Seus sentidos n\u00e3o captam nada al\u00e9m do \u00f3bvio.', 'info'); }


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

// Secret passage check (Investigation DC 15)
function _doSecretPassageCheck() {
    const stat = 'inv';
    const dc = 15;
    const mod = getAbilityMod(stat);
    const prof = S.charData && S.charData.sp && S.charData.sp.includes(stat) ? (S.charData.pb || 2) : 0;
    const mode = hasCondition('poisoned') ? 'disadvantage' : 'normal';
    const { roll, r1, r2 } = rollD20(mode);
    const total = roll + mod + prof;
    const success = total >= dc;

    S.checksPerformed.push({ stat, dc, roll, mod: mod + prof, ok: success, mode });

    const overlay = document.getElementById('check-overlay');
    const formulaEl = document.getElementById('check-formula');
    const resultEl = document.getElementById('check-result');
    formulaEl.innerHTML = '';
    resultEl.textContent = '';
    resultEl.className = 'check-result';
    overlay.classList.add('active');

    const statName = STAT_NAMES[stat] || stat;
    const dice = getDice3D();
    const finishCheck = () => {
        resultEl.textContent = success ? 'Sucesso!' : 'Falha!';
        resultEl.className = 'check-result ' + (success ? 'success' : 'failure');
        formulaEl.innerHTML = buildFormula(roll, mod + prof, statName, '', dc, total, r1, r2, mode);

        let _done = false;
        const finish = () => {
            if (_done) return;
            _done = true;
            disposeDice3D();
            overlay.classList.remove('active');
            if (success) _secretPassageSuccess();
            else _secretPassageFail();
            saveState();
        };
        const skipBtn = document.getElementById('check-skip-btn');
        setTimeout(() => { if (!_done && skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = finish; } }, 500);
        setTimeout(finish, 2500);
    };
    if (dice) dice.roll(roll, finishCheck);
    else setTimeout(finishCheck, 700);
}

function _secretPassageSuccess() {
    // Reveal a shortcut: find nearest impassable hex and make it passable
    const neighbors = typeof getNeighbors === 'function' ? getNeighbors(S.playerCol, S.playerRow) : [];
    const IMPASSABLE_SET = typeof IMPASSABLE !== 'undefined' ? IMPASSABLE : new Set(['#', 'W', 'M', 'L']);
    let found = false;
    for (const [c, r] of neighbors) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        const tile = S.grid[r] && S.grid[r][c] ? S.grid[r][c] : '.';
        if (IMPASSABLE_SET.has(tile) && tile !== 'L') { // Don't open lava
            S.grid[r][c] = '.'; // Open passage
            if (typeof flashHex === 'function') flashHex(c, r);
            found = true;
            // Grant XP
            S.xpEarned += 25;
            updateRewards();
            showTerrainToast('\u{1F6AA} Passagem secreta revelada! +25 XP', 'ranger');
            if (window.vHaptic) vHaptic.success();
            // Trigger static redraw
            if (typeof scheduleRender === 'function') {
                _staticDirty = true;
                scheduleRender();
            }
            break;
        }
    }
    if (!found) {
        // No impassable neighbor — reveal a hidden POI instead
        let revealed = 0;
        for (const poi of S.pois) {
            if (!S.poisResolved.has(poi.id) && poi.hidden) {
                poi.hidden = false;
                poi.hid = 0;
                revealed++;
                break;
            }
        }
        if (revealed > 0) {
            S.xpEarned += 15;
            updateRewards();
            showTerrainToast('\u{1F50D} Descobriu algo oculto! +15 XP', 'ranger');
        } else {
            S.xpEarned += 10;
            updateRewards();
            showTerrainToast('\u{1F50D} Nada oculto aqui, mas a busca valeu. +10 XP', 'info');
        }
    }
}

function _secretPassageFail() {
    showTerrainToast('\u{1F6AA} N\u00e3o encontrou nenhuma passagem oculta.', 'info');
}

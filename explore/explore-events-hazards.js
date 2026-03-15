// ═══════════════════════════════════════════════════════
//  EXPLORE EVENTS — Hazards & Traps
//  Environmental hazards, saving throws, trap detection
//  Depends on: explore-events.js (dice, UI globals)
// ═══════════════════════════════════════════════════════

// Check if current hex has an environmental hazard
function checkHazard(col, row) {
    if (!S._hazardsTriggered) S._hazardsTriggered = new Set();

    // Cooldown: skip hazards for 3 steps after triggering one
    if (!S._hazardCooldown) S._hazardCooldown = 0;
    if (S._hazardCooldown > 0) {
        S._hazardCooldown--;
        return null;
    }

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
        S._hazardCooldown = 3;
        return {
            type: 'lava', stat: 'cn', dc: 12,
            label: 'Calor Intenso',
            desc: 'O calor abrasador da lava próxima queima sua pele.',
            failEffect: 'fire_damage',
        };
    }

    // Swamp mud — CON save DC 10, poisoned 3 steps (skip if already poisoned)
    if (baseTile === 'm' && S.biome === 'swamp' && !hasCondition('poisoned')) {
        S._hazardsTriggered.add(key);
        S._hazardCooldown = 3;
        return {
            type: 'swamp', stat: 'cn', dc: 10,
            label: 'Miasma Tóxico',
            desc: 'Vapores tóxicos emanam do pântano.',
            failEffect: 'poisoned',
        };
    }

    // Ice — DEX save DC 11, prone (next move slow — skip if already prone)
    if (baseTile === 'i' && !hasCondition('prone')) {
        S._hazardsTriggered.add(key);
        S._hazardCooldown = 3;
        return {
            type: 'ice', stat: 'dx', dc: 11,
            label: 'Gelo Escorregadio',
            desc: 'O chão congelado ameaça fazê-lo escorregar.',
            failEffect: 'prone',
        };
    }

    return null;
}

// Pre-check narration for environmental hazards
function showHazardNarration(hazard) {
    // Camera shake on hazard reveal (M21)
    if (typeof addShakeTrauma === 'function') addShakeTrauma(0.3);
    const narr = HAZARD_NARRATIONS[hazard.type];
    if (!narr || !narr.pre) {
        // Fallback: skip narration, go straight to check
        showHazardCheck(hazard);
        return;
    }

    const overlay = document.getElementById('dm-overlay');
    const header = document.getElementById('dm-title');
    const body = document.getElementById('dm-narration');
    const choicesEl = document.getElementById('dm-choices');

    if (!overlay || !body) { showHazardCheck(hazard); return; }

    header.textContent = hazard.label;
    body.innerHTML = '';
    choicesEl.innerHTML = '';
    overlay.classList.add('active');

    // Split narration on | for multi-page
    const pages = narr.pre.split('|').map(p => p.trim()).filter(Boolean);
    let pageIdx = 0;

    function showPage() {
        body.innerHTML = '';
        const p = document.createElement('p');
        p.style.cssText = 'color:var(--v-text);font-size:15px;line-height:1.75;margin:0';
        body.appendChild(p);

        // Typewriter effect
        const text = pages[pageIdx];
        let charIdx = 0;
        const typeInterval = setInterval(() => {
            if (charIdx < text.length) {
                p.textContent += text[charIdx];
                charIdx++;
            } else {
                clearInterval(typeInterval);
                // Show continue button
                choicesEl.innerHTML = '';
                const btn = document.createElement('button');
                btn.className = 'dm-choice-btn';
                btn.textContent = pageIdx < pages.length - 1 ? 'Continuar…' : 'Enfrentar o perigo…';
                btn.onclick = () => {
                    pageIdx++;
                    if (pageIdx < pages.length) {
                        showPage();
                    } else {
                        overlay.classList.remove('active');
                        setTimeout(() => showHazardCheck(hazard), 600);
                    }
                };
                choicesEl.appendChild(btn);
            }
        }, 28);
    }

    showPage();
}

// Automatic saving throw for environmental hazards
function showHazardCheck(hazard) {
    const mod = getAbilityMod(hazard.stat);

    // D&D 5e: poisoned gives disadvantage on ability checks (saves too)
    const mode = hasCondition('poisoned') ? 'disadvantage' : 'normal';
    const { roll, r1, r2 } = rollD20(mode);

    const paceMod = typeof getPaceDCMod === 'function' ? getPaceDCMod() : 0;
    const effectiveDC = Math.max(1, hazard.dc + paceMod);
    const total = roll + mod;
    const success = total >= effectiveDC;

    S.checksPerformed.push({
        stat: hazard.stat, dc: hazard.dc, roll: roll, mod: mod, ok: success, mode: mode,
    });

    const overlay = document.getElementById('check-overlay');
    const formulaEl = document.getElementById('check-formula');
    const resultEl = document.getElementById('check-result');

    const statName = STAT_NAMES[hazard.stat] || hazard.stat;

    // A3: Show pre-roll breakdown so player knows their chances
    const sign = mod >= 0 ? '+' : '';
    const profLabel = proficient ? ' \u2605' : '';
    const modeText = mode === 'advantage' ? ' <span style="color:#4a8;font-size:11px">(Vantagem)</span>'
                   : mode === 'disadvantage' ? ' <span style="color:#a44;font-size:11px">(Desvantagem)</span>' : '';
    formulaEl.innerHTML = '<div style="font-size:13px;color:#c4953a;margin-bottom:4px">\ud83c\udfaf ' + statName + '</div>' +
        '<div style="font-size:12px;color:#a09484">d20 ' + sign + mod + ' (' + statName + profLabel + ')' + modeText + '</div>' +
        '<div style="font-size:12px;color:#8a7a68;margin-top:2px">vs DC <b style="color:#e8dcc8">' + dc + '</b></div>';
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
            const formulaStr = buildFormula(roll, mod, statName, '', effectiveDC, total, r1, r2, mode);
            formulaEl.innerHTML =
                `<span style="color:var(--v-gold);font-size:16px;font-weight:700">${hazard.label}</span><br>` + formulaStr;

            resultEl.textContent = success ? 'Resistiu!' : 'Falhou!';
            resultEl.className = 'check-result ' + (success ? 'success' : 'failure');

            if (window.vHaptic) vHaptic.notify(success ? 'success' : 'error');

            // Screen flash on fail (color by hazard type)
            if (!success && typeof flashScreen === 'function') {
                const _fc = {lava:'rgba(255,100,0,0.25)',fire:'rgba(255,100,0,0.25)',
                    poison:'rgba(100,200,50,0.2)',gas:'rgba(100,200,50,0.2)',
                    ice:'rgba(100,180,255,0.2)',cold:'rgba(100,180,255,0.2)'};
                flashScreen(_fc[hazard.type] || 'rgba(200,70,40,0.25)');
            }
            // Delay before skip to let result sink in
            setTimeout(() => _showHazardSkip(overlay, success, hazard), success ? 800 : 1800);
        });
    } else {
        _showHazardEmojiFallback(overlay, roll, r1, r2, mode, mod, statName, hazard, total, success);
    }
}

function _showHazardSkip(overlay, success, hazard) {
    let _hazDone = false;
    const skipBtn = document.getElementById('check-skip-btn');

    // After dice result is shown, display narrative result text
    const narr = HAZARD_NARRATIONS[hazard.type];
    const resultText = narr ? (success ? narr.ok : narr.fail) : '';

    const finishHazard = () => {
        if (_hazDone) return;
        _hazDone = true;
        if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
        disposeDice3D();
        overlay.classList.remove('active');

        if (resultText) {
            // Show narrative result in DM overlay
            _showHazardResultNarration(resultText, success, hazard);
        } else {
            _applyHazardAndContinue(success, hazard);
        }
    };

    setTimeout(() => {
        if (!_hazDone && skipBtn) {
            skipBtn.classList.add('visible');
            skipBtn.onclick = finishHazard;
        }
    }, 500);

    const hazardText = (document.getElementById('check-formula').textContent || '') + ' ' + (document.getElementById('check-result').textContent || '');
    const hazardDelay = typeof calcReadTime === 'function' ? calcReadTime(hazardText, 'overlay') : 2500;
    setTimeout(finishHazard, hazardDelay);
}

// Show narrative result after hazard dice roll
function _showHazardResultNarration(text, success, hazard) {
    const overlay = document.getElementById('dm-overlay');
    const header = document.getElementById('dm-title');
    const body = document.getElementById('dm-narration');
    const choicesEl = document.getElementById('dm-choices');

    if (!overlay || !body) { _applyHazardAndContinue(success, hazard); return; }

    header.textContent = success ? 'Resistiu!' : 'Falhou!';
    header.style.color = success ? 'var(--v-gold)' : '#c44';
    body.innerHTML = '';
    choicesEl.innerHTML = '';
    overlay.classList.add('active');

    const p = document.createElement('p');
    p.style.cssText = 'color:var(--v-text);font-size:15px;line-height:1.75;margin:0';
    body.appendChild(p);

    // Typewriter
    let charIdx = 0;
    const typeInterval = setInterval(() => {
        if (charIdx < text.length) {
            p.textContent += text[charIdx];
            charIdx++;
        } else {
            clearInterval(typeInterval);
            // Pause 1s after typing before showing continue
            setTimeout(() => {
                choicesEl.innerHTML = '';
                const btn = document.createElement('button');
                btn.className = 'dm-choice-btn';
                btn.textContent = 'Continuar…';
                btn.onclick = () => {
                    overlay.classList.remove('active');
                    header.style.color = '';
                    _applyHazardAndContinue(success, hazard);
                };
                choicesEl.appendChild(btn);
            }, 1000);
        }
    }, 28);
}

// Apply hazard effect and continue game flow (async for fire_damage)
function _applyHazardAndContinue(success, hazard) {
    if (!success) {
        applyHazardEffect(hazard, function () {
            if (checkDeath()) return;
            if (checkLowHP()) { saveState(); return; }
            if (checkHazardCombat()) { saveState(); return; }
            saveState();
        });
        return;
    }
    saveState();
}

function _showHazardEmojiFallback(overlay, roll, r1, r2, mode, mod, statName, hazard, total, success) {
    const formulaEl = document.getElementById('check-formula');
    const resultEl = document.getElementById('check-result');
    const wrapper = document.getElementById('dice3d-wrapper');

    if (r2 !== null) {
        // Advantage/disadvantage: show two dice boxes
        wrapper.innerHTML = '<div class="dice-display-fallback" style="font-size:clamp(48px,12vw,64px);text-align:center;animation:diceRoll 0.7s ease">' + buildDiceHTML(r1, r2, mode) + '</div>';
    } else {
        // Normal roll: animated cycling numbers
        wrapper.innerHTML = '';
        var die = document.createElement('div');
        die.className = 'die kept';
        die.style.cssText = 'width:64px;height:64px;font-size:32px;margin:0 auto;border-radius:10px';
        die.textContent = '\ud83c\udfb2';
        wrapper.appendChild(die);
        var _cyc = setInterval(function() { die.textContent = Math.floor(Math.random() * 20) + 1; }, 50);
        setTimeout(function() {
            clearInterval(_cyc);
            die.textContent = roll;
            if (roll <= 1) { die.style.borderColor = '#a44'; die.style.boxShadow = '0 0 16px rgba(170,68,68,0.5)'; }
            else if (roll >= 20) { die.style.borderColor = '#4a8'; die.style.boxShadow = '0 0 16px rgba(68,170,136,0.5)'; }
        }, 500);
    }

    const formulaStr = buildFormula(roll, mod, statName, '', hazard.dc, total, r1, r2, mode);
    formulaEl.innerHTML =
        '<span style="color:var(--v-gold);font-size:14px">' + hazard.label + '</span><br>' + formulaStr;

    setTimeout(function() {
        resultEl.textContent = success ? 'Resistiu!' : 'Falhou!';
        resultEl.className = 'check-result ' + (success ? 'success' : 'failure');

        if (window.vHaptic) vHaptic.notify(success ? 'success' : 'error');

        _showHazardSkip(overlay, success, hazard);
    }, 700);
}

// Apply hazard consequences on failed save (async for fire_damage dice)
function applyHazardEffect(hazard, onDone) {
    var afterEffect = function () {
        if (hazard.failEffect === 'poisoned') {
            var existPoison = S.conditions.find(function(c) { return c.type === 'poisoned'; });
            if (existPoison) {
                existPoison.stepsLeft = Math.max(existPoison.stepsLeft, 3);
            } else {
                S.conditions.push({ type: 'poisoned', stepsLeft: 3 });
            }
            showTerrainToast('Envenenado! (3 turnos)', 'condition');
            flashScreen('rgba(60,180,60,0.25)');
            if (window.vHaptic) vHaptic.notify('error');
        }
        if (hazard.failEffect === 'prone') {
            var existProne = S.conditions.find(function(c) { return c.type === 'prone'; });
            if (existProne) {
                existProne.stepsLeft = Math.max(existProne.stepsLeft, 1);
            } else {
                S.conditions.push({ type: 'prone', stepsLeft: 1 });
            }
            showTerrainToast('Escorregou!', 'condition');
            flashScreen('rgba(200,180,60,0.25)');
            if (window.vHaptic) vHaptic.notify('error');
        }
        updateConditionHUD();
        updateRewards();
        logMoveEvent([{ type: 'hazard', effect: hazard.failEffect, source: hazard.type }]);

        // 25% chance: hazard noise attracts nearby creatures
        if (Math.random() < 0.25 && S.encounters && S.encounters.length > 0) {
            var enc = S.encounters.pop();
            var combat = enc.cb || { en: 'Criatura', ei: '', b: S.biome, d: S.dangerLevel };
            S._hazardCombatPending = { combat };
        }
        if (onDone) onDone();
    };

    if (hazard.failEffect === 'fire_damage') {
        // 3D dice for fire damage (1d4)
        showDamageDice('1d4', 'dano de fogo', 'fire', function (dmg) {
            S.hpChange -= dmg;
            if (S.charData) {
                var newHP = Math.max(0, S.charData.hp + S.hpChange);
                updateHP(newHP, S.charData.mh);
            }
            afterEffect();
        });
        return;
    }

    // Non-damage effects (poisoned, prone) — synchronous
    afterEffect();
}

// Called after hazard overlay closes to trigger attracted combat
// ═══════════════════════════════════════════════════════
// TRAP SYSTEM (D&D 5e — Detection + Disarm)
// ═══════════════════════════════════════════════════════
const TRAP_TYPES = [
    {
        id: 'spike', label: 'Espinhos Ocultos', icon: '\u{1F5E1}',
        detectDC: 13, disarmDC: 14, disarmStat: 'dx',
        bruteDC: 16, bruteStat: 'st',
        narr: 'Algo est\u00e1 errado com o ch\u00e3o \u00e0 frente. Pequenas fissuras revelan pontas met\u00e1licas escondidas.',
        failDmg: '1d8', failText: 'Os espinhos perfuram seus p\u00e9s!',
        okText: 'Voc\u00ea desativa a armadilha com cuidado.',
        triggerText: 'Os espinhos disparam do ch\u00e3o!',
    },
    {
        id: 'net', label: 'Rede de Ca\u00e7a', icon: '\u{1FA24}',
        detectDC: 12, disarmDC: 12, disarmStat: 'dx',
        bruteDC: 15, bruteStat: 'st',
        narr: 'Fibras quase invis\u00edveis se estendem entre as \u00e1rvores. Uma armadilha de rede espera voc\u00ea.',
        failDmg: '0', failText: 'A rede se fecha ao redor de voc\u00ea! Voc\u00ea fica preso por um momento.',
        failCondition: 'prone',
        okText: 'Voc\u00ea corta as cordas e a rede cai in\u00f3cua.',
        triggerText: 'A rede dispara e voc\u00ea \u00e9 pego!',
    },
    {
        id: 'poison_dart', label: 'Dardos Envenenados', icon: '\u{1F3AF}',
        detectDC: 14, disarmDC: 15, disarmStat: 'dx',
        bruteDC: 18, bruteStat: 'st',
        narr: 'Pequenos buracos na parede emitem um brilho sinistro. Dardos envenenados aguardam o incauto.',
        failDmg: '1d4', failText: 'Um dardo envenenado acerta voc\u00ea!',
        failCondition: 'poisoned',
        okText: 'Voc\u00ea bloqueia os disparadores com precis\u00e3o.',
        triggerText: 'Dardos voam das paredes!',
    },
    {
        id: 'pit', label: 'Fosso Camuflado', icon: '\u{1F573}',
        detectDC: 15, disarmDC: 13, disarmStat: 'dx',
        bruteDC: 14, bruteStat: 'st',
        narr: 'O ch\u00e3o parece susp eitosamente nivelado. Uma armadilha de fosso pode estar escondida aqui.',
        failDmg: '2d6', failText: 'Voc\u00ea cai no fosso!',
        failCondition: 'prone',
        okText: 'Voc\u00ea contorna o fosso com seguran\u00e7a.',
        triggerText: 'O ch\u00e3o desaba sob seus p\u00e9s!',
    },
];

// Check for trap on hex (chance based on danger level, detected via PP or Investigation)
function checkTrap(col, row) {
    if (!S._trapsTriggered) S._trapsTriggered = new Set();
    const key = `${col},${row}`;
    if (S._trapsTriggered.has(key)) return null;

    // 8% base chance + 3% per danger level (max ~23%)
    const chance = 0.08 + (S.dangerLevel || 1) * 0.03;
    if (Math.random() > chance) return null;

    S._trapsTriggered.add(key);
    const trap = TRAP_TYPES[Math.floor(Math.random() * TRAP_TYPES.length)];

    // Passive Perception detection
    const pp = typeof getPassivePerception === 'function' ? getPassivePerception() : 10;
    const detected = pp >= trap.detectDC;

    return { ...trap, detected, col, row };
}

function showTrapEvent(trap) {
    if (trap.detected) {
        // Player detected the trap — show disarm options
        _showTrapDetected(trap);
    } else {
        // Trap triggered! No chance to disarm
        _triggerTrap(trap);
    }
}

function _showTrapDetected(trap) {
    activateOverlay('dm-overlay');
    const overlay = document.getElementById('dm-overlay');
    document.getElementById('dm-icon').textContent = trap.icon;
    document.getElementById('dm-title').textContent = trap.label;
    document.getElementById('dm-type').textContent = 'armadilha';

    const narrEl = document.getElementById('dm-narration');
    const choicesEl = document.getElementById('dm-choices');
    choicesEl.innerHTML = '';

    typewriter(narrEl, trap.narr, () => {
        // Disarm option (DEX / Thieves' Tools)
        const dexMod = getAbilityMod(trap.disarmStat);
        const dexProf = S.charData && S.charData.sp && S.charData.sp.includes(trap.disarmStat) ? (S.charData.pb || 2) : 0;
        const dexTotal = dexMod + dexProf;
        const dexChance = Math.max(5, Math.min(95, (21 - trap.disarmDC + dexTotal) * 5));
        const dexShort = STAT_SHORT[trap.disarmStat] || 'DES';

        const disarmBtn = document.createElement('button');
        disarmBtn.className = 'dm-choice-btn';
        disarmBtn.innerHTML = `<span class="choice-icon">\u{1F527}</span>` +
            `<span class="choice-label">Desarmar</span>` +
            `<span class="choice-check">${dexShort}${dexProf ? '\u2605' : ''} ${dexChance}%</span>`;
        disarmBtn.onclick = () => {
            overlay.classList.remove('active');
            _attemptDisarm(trap, trap.disarmStat, trap.disarmDC, dexMod + dexProf);
        };
        choicesEl.appendChild(disarmBtn);

        // Brute force option (STR)
        const strMod = getAbilityMod(trap.bruteStat);
        const strProf = S.charData && S.charData.sp && S.charData.sp.includes(trap.bruteStat) ? (S.charData.pb || 2) : 0;
        const strTotal = strMod + strProf;
        const strChance = Math.max(5, Math.min(95, (21 - trap.bruteDC + strTotal) * 5));
        const strShort = STAT_SHORT[trap.bruteStat] || 'FOR';

        const bruteBtn = document.createElement('button');
        bruteBtn.className = 'dm-choice-btn';
        bruteBtn.innerHTML = `<span class="choice-icon">\u{1F4AA}</span>` +
            `<span class="choice-label">For\u00e7a Bruta</span>` +
            `<span class="choice-check">${strShort}${strProf ? '\u2605' : ''} ${strChance}%</span>`;
        bruteBtn.onclick = () => {
            overlay.classList.remove('active');
            _attemptDisarm(trap, trap.bruteStat, trap.bruteDC, strMod + strProf);
        };
        choicesEl.appendChild(bruteBtn);

        // Avoid (safe but no reward)
        const avoidBtn = document.createElement('button');
        avoidBtn.className = 'dm-choice-btn';
        avoidBtn.style.opacity = '0.6';
        avoidBtn.innerHTML = `<span class="choice-icon">\u{1F6B6}</span>` +
            `<span class="choice-label">Contornar</span>`;
        avoidBtn.onclick = () => {
            overlay.classList.remove('active');
            showTerrainToast('Voc\u00ea contorna a armadilha com cuidado.', 'info');
        };
        choicesEl.appendChild(avoidBtn);
    });
}

function _attemptDisarm(trap, stat, dc, totalMod) {
    const mode = hasCondition('poisoned') ? 'disadvantage' : 'normal';
    const { roll, r1, r2 } = rollD20(mode);
    const total = roll + totalMod;
    const success = total >= dc;

    S.checksPerformed.push({ stat, dc, roll, mod: totalMod, ok: success, mode });

    const overlay = document.getElementById('check-overlay');
    const formulaEl = document.getElementById('check-formula');
    const resultEl = document.getElementById('check-result');
    formulaEl.innerHTML = '';
    resultEl.textContent = '';
    resultEl.className = 'check-result';
    overlay.classList.add('active');

    const statName = STAT_NAMES[stat] || stat;
    const dice = getDice3D();
    const finish = () => {
        formulaEl.innerHTML = buildFormula(roll, totalMod, statName, '', dc, total, r1, r2, mode);
        resultEl.textContent = success ? 'Sucesso!' : 'Falha!';
        resultEl.className = 'check-result ' + (success ? 'success' : 'failure');

        let _done = false;
        const done = () => {
            if (_done) return;
            _done = true;
            disposeDice3D();
            overlay.classList.remove('active');
            if (success) {
                // Disarm success — XP reward
                const xp = 10 + dc * 2;
                S.xpEarned += xp;
                updateRewards();
                if (window.vHaptic) vHaptic.notify('success');
                showTerrainToast(`${trap.icon} ${trap.okText} (+${xp} XP)`, 'ranger');
            } else {
                // Disarm failed — trigger trap
                _triggerTrap(trap);
            }
            saveState();
        };
        const skipBtn = document.getElementById('check-skip-btn');
        setTimeout(() => { if (!_done && skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = done; } }, 500);
        setTimeout(done, 2500);
    };
    if (dice) dice.roll(roll, finish);
    else setTimeout(finish, 700);
}

var TRAP_DAMAGE_LABELS = {
    spike: { label: 'dano de perfura\u00e7\u00e3o', type: 'piercing' },
    pit: { label: 'dano de queda', type: 'bludgeoning' },
    poison_dart: { label: 'dano de perfura\u00e7\u00e3o', type: 'piercing' },
    net: { label: '', type: 'bludgeoning' },
};

function _triggerTrap(trap) {
    var hasDmg = trap.failDmg && trap.failDmg !== '0';
    var dmgInfo = TRAP_DAMAGE_LABELS[trap.id] || { label: 'dano', type: 'piercing' };

    var applyConditionAndFinish = function () {
        // Apply condition
        if (trap.failCondition) {
            var existTrapCond = S.conditions.find(function(c) { return c.type === trap.failCondition; });
            var trapCondSteps = trap.failCondition === 'poisoned' ? 5 : 2;
            if (existTrapCond) {
                existTrapCond.stepsLeft = Math.max(existTrapCond.stepsLeft, trapCondSteps);
            } else {
                S.conditions.push({ type: trap.failCondition, stepsLeft: trapCondSteps });
            }
            updateConditionHUD();
        }
        // Heavy shake for trap trigger (M21)
        if (typeof addShakeTrauma === 'function') addShakeTrauma(0.6);
        if (typeof checkDeath === 'function') checkDeath();
        saveState();
    };

    if (hasDmg) {
        // Show narration + 3D dice for damage
        showDamageEvent(trap.icon, trap.label, trap.triggerText, trap.failDmg,
            dmgInfo.label, dmgInfo.type, function (dmg) {
                S.hpChange -= dmg;
                if (S.charData) {
                    var newHP = Math.max(0, S.charData.hp + S.hpChange);
                    updateHP(newHP, S.charData.mh);
                }
                updateRewards();
                applyConditionAndFinish();
            });
    } else {
        // No damage (e.g., net trap) — just show toast and apply condition
        showTerrainToast(trap.icon + ' ' + trap.triggerText, 'damage');
        if (typeof addShakeTrauma === 'function') addShakeTrauma(0.6);
        try { if (typeof tg !== 'undefined' && tg) tg.HapticFeedback.notificationOccurred('error'); } catch(e) { /* haptic optional */ }
        applyConditionAndFinish();
    }
}

function checkHazardCombat() {
    if (!S._hazardCombatPending) return false;
    var data = S._hazardCombatPending;
    S._hazardCombatPending = null;

    // DM narration before combat transition
    activateOverlay('dm-overlay');
    var overlay = document.getElementById('dm-overlay');
    var dmIcon = document.getElementById('dm-icon');
    var dmTitle = document.getElementById('dm-title');
    var dmType = document.getElementById('dm-type');
    var narrEl = document.getElementById('dm-narration');
    var choicesEl = document.getElementById('dm-choices');

    if (!overlay) {
        showTerrainToast('O barulho atraiu criaturas!', 'danger');
        setTimeout(function() { triggerCombat({ combat: data.combat }); }, 1500);
        return true;
    }

    if (overlay) overlay.setAttribute('data-event', 'danger');
    if (dmIcon) dmIcon.textContent = '\u{1F43E}';
    if (dmTitle) dmTitle.textContent = 'Barulho!';
    if (dmType) dmType.textContent = 'perigo';
    if (choicesEl) choicesEl.innerHTML = '';

    var narr = 'O estrondo da armadilha ecoa pelas redondezas. Passos pesados se aproximam rapidamente \u2014 o barulho atraiu aten\u00e7\u00e3o indesejada.';
    typewriter(narrEl, narr, function () {
        var btn = document.createElement('button');
        btn.className = 'dm-choice-btn';
        btn.style.cssText = 'border-color:rgba(200,60,60,0.5);color:#d44;';
        btn.innerHTML = '<span class="choice-icon">\u2694\ufe0f</span><span class="choice-label">Preparar-se!</span>';
        btn.onclick = function () {
            overlay.classList.remove('active');
            triggerCombat({ combat: data.combat });
        };
        if (choicesEl) choicesEl.appendChild(btn);
    });
    return true;
}


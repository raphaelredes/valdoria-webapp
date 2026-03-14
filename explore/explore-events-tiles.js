// ═══════════════════════════════════════════════════════
//  EXPLORE EVENTS — Tile Interactions
//  Doors, walls, terrain, traps, chests, inscriptions
//  Depends on: explore-events.js (dice, UI globals)
// ═══════════════════════════════════════════════════════

/**
 * Handle interaction with an impassable tile the player clicked.
 * Called from handleCanvasClick when tile is IMPASSABLE.
 */
function handleTileInteraction(col, row, tile) {
    if (typeof isMoving === 'function' && isMoving()) return;

    // Must be adjacent to player
    if (!isAdjacent(S.playerCol, S.playerRow, col, row)) return;

    if (tile === 'D') {
        _interactDoor(col, row);
    } else if (tile === '#') {
        _interactWall(col, row);
    } else if (tile === 'M') {
        _interactMountain(col, row);
    } else if (tile === 'W') {
        _interactDeepWater(col, row);
    }
}

// ── Door interaction ─────────────────────────────────────

function _interactDoor(col, row) {
    const key = `${col},${row}`;
    if (S._doorsOpened && S._doorsOpened.has(key)) return;

    // Check if door is locked
    const locked = S.lockedDoors ? S.lockedDoors.find(
        d => d.col === col && d.row === row && !d.unlocked) : null;
    if (locked) { _interactLockedDoor(col, row, locked); return; }


    // Show door overlay
    const overlay = document.getElementById('dm-overlay');
    const narr = document.getElementById('dm-narration');
    const choices = document.getElementById('dm-choices');
    if (!overlay || !narr || !choices) return;

    narr.innerHTML = '';
    choices.innerHTML = '';

    narr.innerHTML = `<p class="dm-text">Uma porta de madeira reforçada bloqueia o caminho. Dobradiças de ferro enferrujado rangem ao toque.</p>`;

    const btnOpen = document.createElement('button');
    btnOpen.className = 'dm-choice-btn';
    btnOpen.innerHTML = '🚪 Abrir Porta';
    btnOpen.onclick = () => {
        overlay.classList.remove('active');
        _animateDoorOpen(col, row, key);
    };
    choices.appendChild(btnOpen);

    const btnBack = document.createElement('button');
    btnBack.className = 'dm-choice-btn dm-choice-secondary';
    btnBack.innerHTML = '← Voltar';
    btnBack.onclick = () => overlay.classList.remove('active');
    choices.appendChild(btnBack);

    overlay.classList.add('active');
}

// ── Secret wall interaction ──────────────────────────────

function _interactWall(col, row) {
    // Check for wall inscriptions first
    if (S.inscriptions) {
        const ins = S.inscriptions.find(i => i.col === col && i.row === row && !i.read);
        if (ins) { _showInscription(col, row, ins); return; }
    }

    // Check if this wall is a secret passage
    if (!S.secretPassages) return;
    const sp = S.secretPassages.find(
        s => s.col === col && s.row === row && !s.revealed
    );
    if (!sp) return; // Regular wall, no interaction

    const key = `${col},${row}`;
    const overlay = document.getElementById('dm-overlay');
    const narr = document.getElementById('dm-narration');
    const choices = document.getElementById('dm-choices');
    if (!overlay || !narr || !choices) return;

    narr.innerHTML = '';
    choices.innerHTML = '';

    const skillName = sp.skill === 'inv' ? 'Investigação' : 'Percepção';
    narr.innerHTML = `<p class="dm-text">Há algo estranho nesta parede... rachaduras sutis formam um padrão incomum. Parece que pode haver algo por trás.</p>`;

    const btnCheck = document.createElement('button');
    btnCheck.className = 'dm-choice-btn';
    const statShort = sp.skill === 'inv' ? 'INT' : 'SAB';
    btnCheck.innerHTML = `🔍 Examinar (${skillName} DC ${sp.dc})`;
    btnCheck.onclick = () => {
        overlay.classList.remove('active');
        // Perform D&D 5e skill check
        _performSecretCheck(sp, col, row);
    };
    choices.appendChild(btnCheck);

    const btnBack = document.createElement('button');
    btnBack.className = 'dm-choice-btn dm-choice-secondary';
    btnBack.innerHTML = '← Voltar';
    btnBack.onclick = () => overlay.classList.remove('active');
    choices.appendChild(btnBack);

    overlay.classList.add('active');
}

function _performSecretCheck(sp, col, row) {
    const mod = sp.mod || 0;
    const dc = sp.dc;

    // Roll d20
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + mod;
    const success = total >= dc;

    // Show 3D dice
    const checkOverlay = document.getElementById('check-overlay');
    if (!checkOverlay) return;
    checkOverlay.classList.add('active');

    const dice = typeof getDice3D === 'function' ? getDice3D() : null;
    const skillName = sp.skill === 'inv' ? 'Investigação' : 'Percepção';

    const showResult = () => {
        const formulaEl = checkOverlay.querySelector('.check-formula') ||
            document.getElementById('check-formula');
        const resultEl = checkOverlay.querySelector('.check-result') ||
            document.getElementById('check-result');

        if (formulaEl) {
            formulaEl.innerHTML = `<span class="check-roll">${roll}</span> + ${mod} (${skillName}) = <b>${total}</b> vs DC ${dc}`;
        }
        if (resultEl) {
            resultEl.textContent = success ? 'Passagem Descoberta!' : 'Nada encontrado...';
            resultEl.className = 'check-result ' + (success ? 'check-success' : 'check-fail');
        }

        // Show continue button after delay
        setTimeout(() => {
            const skipArea = checkOverlay.querySelector('.check-skip') ||
                document.getElementById('check-skip');
            if (skipArea) {
                skipArea.innerHTML = '';
                const btn = document.createElement('button');
                btn.className = 'v-skip-btn';
                btn.textContent = 'Continuar';
                btn.onclick = () => {
                    checkOverlay.classList.remove('active');
                    if (success) {
                        // Reveal the secret passage!
                        S.grid[row][col] = '.';
                        sp.revealed = true;
                        S._secretsRevealed.add(`${col},${row}`);
                        if (typeof _staticDirty !== 'undefined') _staticDirty = true;
                        showTerrainToast('Passagem secreta revelada!', 'flavor');
                        // Reveal fog through the new opening
                        revealFogAt(col, row, 1, S.fogState, S.grid, true);
                    } else {
                        showTerrainToast('A parede parece sólida...', 'flavor');
                    }
                    S.checksPerformed.push({
                        stat: sp.skill, dc, roll, mod, ok: success, mode: 'normal'
                    });
                    saveState();
                };
                skipArea.appendChild(btn);
            }
        }, 800);
    };

    if (dice) {
        dice.roll(roll, showResult);
    } else {
        setTimeout(showResult, 500);
    }
}

// ── Mountain climbing ────────────────────────────────────

function _interactMountain(col, row) {
    if (!S.terrainChallenges) return;
    const tc = S.terrainChallenges.find(
        t => t.col === col && t.row === row && !t.used
    );
    if (!tc) return;

    _showTerrainChallengeOverlay(tc, col, row, 'Escalar',
        'Uma parede rochosa íngreme se ergue à sua frente. Escalar exigirá força e técnica.',
        '⛰️');
}

// ── Deep water swimming ──────────────────────────────────

function _interactDeepWater(col, row) {
    if (!S.terrainChallenges) return;
    const tc = S.terrainChallenges.find(
        t => t.col === col && t.row === row && !t.used
    );
    if (!tc) return;

    _showTerrainChallengeOverlay(tc, col, row, 'Nadar',
        'Águas profundas e escuras bloqueiam o caminho. A correnteza parece forte.',
        '🌊');
}

function _showTerrainChallengeOverlay(tc, col, row, actionLabel, desc, icon) {
    const overlay = document.getElementById('dm-overlay');
    const narr = document.getElementById('dm-narration');
    const choices = document.getElementById('dm-choices');
    if (!overlay || !narr || !choices) return;

    narr.innerHTML = '';
    choices.innerHTML = '';
    narr.innerHTML = `<p class="dm-text">${desc}</p>`;

    const btnAction = document.createElement('button');
    btnAction.className = 'dm-choice-btn';
    btnAction.innerHTML = `${icon} ${actionLabel} (Atletismo DC ${tc.dc})`;
    btnAction.onclick = () => {
        overlay.classList.remove('active');
        _performTerrainCheck(tc, col, row);
    };
    choices.appendChild(btnAction);

    const btnBack = document.createElement('button');
    btnBack.className = 'dm-choice-btn dm-choice-secondary';
    btnBack.innerHTML = '← Voltar';
    btnBack.onclick = () => overlay.classList.remove('active');
    choices.appendChild(btnBack);

    overlay.classList.add('active');
}

function _performTerrainCheck(tc, col, row) {
    const mod = tc.mod || 0;
    const dc = tc.dc;
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + mod;
    const success = total >= dc;

    const checkOverlay = document.getElementById('check-overlay');
    if (!checkOverlay) return;
    checkOverlay.classList.add('active');

    const dice = typeof getDice3D === 'function' ? getDice3D() : null;

    const showResult = () => {
        const formulaEl = checkOverlay.querySelector('.check-formula') ||
            document.getElementById('check-formula');
        const resultEl = checkOverlay.querySelector('.check-result') ||
            document.getElementById('check-result');

        if (formulaEl) {
            formulaEl.innerHTML = `<span class="check-roll">${roll}</span> + ${mod} (Atletismo) = <b>${total}</b> vs DC ${dc}`;
        }
        if (resultEl) {
            resultEl.textContent = success ? 'Sucesso!' : 'Falha!';
            resultEl.className = 'check-result ' + (success ? 'check-success' : 'check-fail');
        }

        setTimeout(() => {
            const skipArea = checkOverlay.querySelector('.check-skip') ||
                document.getElementById('check-skip');
            if (skipArea) {
                skipArea.innerHTML = '';
                const btn = document.createElement('button');
                btn.className = 'v-skip-btn';
                btn.textContent = 'Continuar';
                btn.onclick = () => {
                    checkOverlay.classList.remove('active');
                    if (success) {
                        // Terrain becomes passable temporarily
                        tc.used = true;
                        S._terrainPassed.add(`${col},${row}`);
                        // Change tile to passable and move player there
                        const origTile = S.grid[row][col];
                        S.grid[row][col] = '.';
                        if (typeof _staticDirty !== 'undefined') _staticDirty = true;
                        showTerrainToast(`${tc.label} bem-sucedido!`, 'flavor');
                        // Move player to the conquered tile
                        if (typeof movePlayerCanvas === 'function') {
                            movePlayerCanvas(col, row);
                        }
                    } else {
                        // Failure: take damage
                        const dmgDice = tc.dmg || '1d6';
                        const dmgMatch = dmgDice.match(/(\d+)d(\d+)/);
                        let dmg = 0;
                        if (dmgMatch) {
                            const count = parseInt(dmgMatch[1]);
                            const sides = parseInt(dmgMatch[2]);
                            for (let i = 0; i < count; i++) {
                                dmg += Math.floor(Math.random() * sides) + 1;
                            }
                        }
                        S.hpChange -= dmg;
                        showTerrainToast(`Falha! -${dmg} HP`, 'damage');
                        if (typeof updateHPHUD === 'function') updateHPHUD();
                        if (typeof checkDeath === 'function') checkDeath();
                    }
                    S.checksPerformed.push({
                        stat: tc.skill, dc, roll, mod, ok: success, mode: 'normal'
                    });
                    saveState();
                };
                skipArea.appendChild(btn);
            }
        }, 800);
    };

    if (dice) {
        dice.roll(roll, showResult);
    } else {
        setTimeout(showResult, 500);
    }
}

// ═══════════════════════════════════════════════════════════
// TRAP TRIGGER SYSTEM
// ═══════════════════════════════════════════════════════════

/**
 * Check if player stepped on a trap. Called from onMoveComplete.
 * Returns trap object if triggered, null otherwise.
 */
function checkTrapAtPosition(col, row) {
    if (!S.traps) return null;
    const trap = S.traps.find(
        t => t.col === col && t.row === row && !t.triggered
    );
    if (!trap) return null;

    trap.triggered = true;
    return trap;
}

/**
 * Show trap event with 10s reaction timer and DEX/CON/STR save.
 */
function _showBackendTrapEvent(trap) {
    const overlay = document.getElementById('dm-overlay');
    const narr = document.getElementById('dm-narration');
    const choices = document.getElementById('dm-choices');
    if (!overlay || !narr || !choices) return;

    narr.innerHTML = '';
    choices.innerHTML = '';

    const statNames = {dex: 'Destreza', con: 'Constituição', str: 'Força'};
    const statName = statNames[trap.skill] || 'Destreza';

    narr.innerHTML = `<p class="dm-text">⚠️ <b>${trap.name}!</b></p><p class="dm-text">O chão cede sob seus pés! Você precisa reagir rapidamente!</p>`;

    const btnReact = document.createElement('button');
    btnReact.className = 'dm-choice-btn dm-choice-danger';
    btnReact.innerHTML = `⚡ Reagir! (${statName} DC ${trap.dc})`;
    btnReact.onclick = () => {
        overlay.classList.remove('active');
        _performTrapSave(trap);
    };
    choices.appendChild(btnReact);

    overlay.classList.add('active');

    // 10s reaction timer — auto-fail if player doesn't react
    const timer = setTimeout(() => {
        if (overlay.classList.contains('active')) {
            overlay.classList.remove('active');
            _applyTrapDamage(trap, false, 1); // Auto-fail with min roll
        }
    }, 10000);

    // Clear timer if player reacts
    btnReact.addEventListener('click', () => clearTimeout(timer), { once: true });
}

function _performTrapSave(trap) {
    const mod = trap.mod || 0;
    const dc = trap.dc;
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + mod;
    const success = total >= dc;

    const checkOverlay = document.getElementById('check-overlay');
    if (!checkOverlay) return;
    checkOverlay.classList.add('active');

    const dice = typeof getDice3D === 'function' ? getDice3D() : null;
    const statNames = {dex: 'Destreza', con: 'Constituição', str: 'Força'};

    const showResult = () => {
        const formulaEl = checkOverlay.querySelector('.check-formula') ||
            document.getElementById('check-formula');
        const resultEl = checkOverlay.querySelector('.check-result') ||
            document.getElementById('check-result');

        if (formulaEl) {
            formulaEl.innerHTML = `<span class="check-roll">${roll}</span> + ${mod} (${statNames[trap.skill] || 'DEX'}) = <b>${total}</b> vs DC ${dc}`;
        }
        if (resultEl) {
            resultEl.textContent = success ? 'Esquivou!' : 'Atingido!';
            resultEl.className = 'check-result ' + (success ? 'check-success' : 'check-fail');
        }

        setTimeout(() => {
            const skipArea = checkOverlay.querySelector('.check-skip') ||
                document.getElementById('check-skip');
            if (skipArea) {
                skipArea.innerHTML = '';
                const btn = document.createElement('button');
                btn.className = 'v-skip-btn';
                btn.textContent = 'Continuar';
                btn.onclick = () => {
                    checkOverlay.classList.remove('active');
                    _applyTrapDamage(trap, success, roll);
                };
                skipArea.appendChild(btn);
            }
        }, 800);
    };

    if (dice) {
        dice.roll(roll, showResult);
    } else {
        setTimeout(showResult, 500);
    }
}

function _applyTrapDamage(trap, success, roll) {
    if (success) {
        // D&D 5e: successful save = half damage (PHB)
        showTerrainToast('Esquivou parcialmente!', 'flavor');
    } else if (trap.condition) {
        // Apply D&D 5e condition on failure
        const condNames = {psn: 'Envenenado', prn: 'Prone', rst: 'Impedido', alm: 'Alarme'};
        if (trap.condition === 'alm') {
            showTerrainToast('Um alarme dispara! Algo se aproxima...', 'damage');
            S.checksPerformed.push({stat: trap.skill, dc: trap.dc, roll, mod: trap.mod || 0, ok: false, mode: 'normal'});
            saveState();
            return;
        }
        if (typeof addCondition === 'function') {
            addCondition(trap.condition === 'psn' ? 'poisoned' : trap.condition === 'rst' ? 'restrained' : 'prone');
        }
        const cName = condNames[trap.condition] || '';
        if (cName) showTerrainToast('Condicao: ' + cName + '!', 'condition');
    }

    // Roll trap damage
    const dmgDice = trap.dmg || '1d6';
    const dmgMatch = dmgDice.match(/(\d+)d(\d+)/);
    let fullDmg = 0;
    if (dmgMatch) {
        const count = parseInt(dmgMatch[1]);
        const sides = parseInt(dmgMatch[2]);
        for (let i = 0; i < count; i++) {
            fullDmg += Math.floor(Math.random() * sides) + 1;
        }
    }

    // Half damage on success (D&D 5e)
    const dmg = success ? Math.floor(fullDmg / 2) : fullDmg;

    if (dmg > 0) {
        S.hpChange -= dmg;
        showTerrainToast(`${trap.name}: -${dmg} HP${success ? ' (metade)' : ''}`, 'damage');
        if (typeof updateHPHUD === 'function') updateHPHUD();
        if (typeof checkDeath === 'function') checkDeath();
    }

    S.checksPerformed.push({
        stat: trap.skill, dc: trap.dc, roll, mod: trap.mod || 0,
        ok: success, mode: 'normal',
    });
    saveState();
}

// =============================================
// LOCKED DOOR INTERACTION
// =============================================

function _interactLockedDoor(col, row, locked) {
    const overlay = document.getElementById('dm-overlay');
    const narr = document.getElementById('dm-narration');
    const choices = document.getElementById('dm-choices');
    if (!overlay || !narr || !choices) return;
    narr.innerHTML = '';
    choices.innerHTML = '';
    narr.innerHTML = '<p class="dm-text">A porta est\u00e1 trancada. Um mecanismo de ferro resiste \u00e0 abertura.</p>';

    const btnPick = document.createElement('button');
    btnPick.className = 'dm-choice-btn';
    btnPick.textContent = 'Abrir Fechadura (Prestidigitacao DC ' + locked.pickDC + ')';
    btnPick.onclick = () => { overlay.classList.remove('active'); _performLockedDoorCheck(col, row, locked, 'pick'); };
    choices.appendChild(btnPick);

    const btnForce = document.createElement('button');
    btnForce.className = 'dm-choice-btn';
    btnForce.textContent = 'Forcar (Atletismo DC ' + locked.forceDC + ')';
    btnForce.onclick = () => { overlay.classList.remove('active'); _performLockedDoorCheck(col, row, locked, 'force'); };
    choices.appendChild(btnForce);

    const btnBack = document.createElement('button');
    btnBack.className = 'dm-choice-btn dm-choice-secondary';
    btnBack.textContent = 'Voltar';
    btnBack.onclick = () => overlay.classList.remove('active');
    choices.appendChild(btnBack);
    overlay.classList.add('active');
}

function _performLockedDoorCheck(col, row, locked, method) {
    const dc = method === 'pick' ? locked.pickDC : locked.forceDC;
    const mod = method === 'pick' ? locked.modPick : locked.modForce;
    const skillName = method === 'pick' ? 'Prestidigitacao' : 'Atletismo';
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + mod;
    const success = total >= dc;
    const checkOverlay = document.getElementById('check-overlay');
    if (!checkOverlay) return;
    checkOverlay.classList.add('active');
    const dice = typeof getDice3D === 'function' ? getDice3D() : null;
    const showResult = () => {
        const formulaEl = checkOverlay.querySelector('.check-formula') || document.getElementById('check-formula');
        const resultEl = checkOverlay.querySelector('.check-result') || document.getElementById('check-result');
        if (formulaEl) formulaEl.innerHTML = '<span class="check-roll">' + roll + '</span> + ' + mod + ' (' + skillName + ') = <b>' + total + '</b> vs DC ' + dc;
        if (resultEl) {
            resultEl.textContent = success ? 'Destrancada!' : 'Falhou!';
            resultEl.className = 'check-result ' + (success ? 'check-success' : 'check-fail');
        }
        setTimeout(() => {
            const skipArea = checkOverlay.querySelector('.check-skip') || document.getElementById('check-skip');
            if (skipArea) {
                skipArea.innerHTML = '';
                const btn = document.createElement('button');
                btn.className = 'v-skip-btn';
                btn.textContent = 'Continuar';
                btn.onclick = () => {
                    checkOverlay.classList.remove('active');
                    if (success) {
                        locked.unlocked = true;
                        S.grid[row][col] = '.';
                        S._doorsOpened.add(col + ',' + row);
                        if (typeof _staticDirty !== 'undefined') _staticDirty = true;
                        showTerrainToast('Porta destrancada!', 'flavor');
                    } else {
                        if (method === 'force') {
                            S.hpChange -= 2;
                            showTerrainToast('Falha! -2 HP pelo impacto', 'damage');
                            if (typeof updateHPHUD === 'function') updateHPHUD();
                        } else {
                            showTerrainToast('A fechadura resiste...', 'flavor');
                        }
                    }
                    S.checksPerformed.push({stat: method === 'pick' ? 'slh' : 'atl', dc, roll, mod, ok: success, mode: 'normal'});
                    saveState();
                };
                skipArea.appendChild(btn);
            }
        }, 800);
    };
    if (dice) dice.roll(roll, showResult);
    else setTimeout(showResult, 500);
}

// =============================================
// CHEST INTERACTION
// =============================================

function checkChestAtPosition(col, row) {
    if (!S.chests) return null;
    return S.chests.find(ch => ch.col === col && ch.row === row && !ch.opened);
}

function showChestEvent(chest) {
    const overlay = document.getElementById('dm-overlay');
    const narr = document.getElementById('dm-narration');
    const choices = document.getElementById('dm-choices');
    if (!overlay || !narr || !choices) return;
    narr.innerHTML = '';
    choices.innerHTML = '';
    narr.innerHTML = '<p class="dm-text">Voce encontra um bau antigo parcialmente escondido. Gravuras gastas decoram a tampa.</p>';

    if (chest.hasTrap && !chest.trapDetected) {
        const btnExamine = document.createElement('button');
        btnExamine.className = 'dm-choice-btn';
        btnExamine.textContent = 'Examinar (Investigacao DC ' + chest.trapDC + ')';
        btnExamine.onclick = () => {
            const roll = Math.floor(Math.random() * 20) + 1;
            const total = roll + (chest.modInv || 0);
            if (total >= chest.trapDC) {
                chest.trapDetected = true;
                showTerrainToast('Armadilha detectada!', 'flavor');
            } else {
                showTerrainToast('Parece seguro...', 'flavor');
            }
        };
        choices.appendChild(btnExamine);
    }

    const btnOpen = document.createElement('button');
    btnOpen.className = 'dm-choice-btn';
    btnOpen.textContent = 'Abrir Bau';
    btnOpen.onclick = () => { overlay.classList.remove('active'); _openChest(chest, chest.col, chest.row, false); };
    choices.appendChild(btnOpen);

    const btnBack = document.createElement('button');
    btnBack.className = 'dm-choice-btn dm-choice-secondary';
    btnBack.textContent = 'Deixar';
    btnBack.onclick = () => overlay.classList.remove('active');
    choices.appendChild(btnBack);
    overlay.classList.add('active');
}

function _openChest(chest, col, row, disarmed) {
    chest.opened = true;
    S._chestsOpened.add(col + ',' + row);
    if (chest.hasTrap && !disarmed && !chest.trapDetected) {
        const dmg = Math.floor(Math.random() * 6) + 1;
        S.hpChange -= dmg;
        showTerrainToast('Armadilha no bau! -' + dmg + ' HP', 'damage');
        if (typeof updateHPHUD === 'function') updateHPHUD();
    }
    if (chest.gp > 0) { S.goldChange += chest.gp; showTerrainToast('+' + chest.gp + ' GP!', 'reward'); }
    if (chest.xp > 0) { S.xpChange += chest.xp; showTerrainToast('+' + chest.xp + ' XP', 'reward'); }
    saveState();
}

// =============================================
// INSCRIPTION INTERACTION
// =============================================

const INSCRIPTION_TEXTS = {
    cave: [
        'Runas antigas marcam a pedra: "Os que buscam poder aqui encontrarao apenas escuridao."',
        'Marcas de garras profundas riscam a parede. Algo grande passou por aqui.',
        'Um simbolo circular gravado na rocha pulsa com uma luz fraca.',
        'Palavras em uma lingua esquecida cobrem a parede.',
        'Um mapa rudimentar esta riscado na pedra, mostrando tuneis que nao existem mais.',
    ],
    graveyard: [
        'Uma inscricao funeraria: "Aqui jaz Valdrik, guardiao do portal."',
        'Simbolos de protecao cobrem a parede. Alguem tentou selar algo aqui.',
        'Nomes de aventureiros estao gravados na lapide.',
        'Um aviso entalhado na pedra: "Nao perturbem os mortos."',
        'Flores secas e moedas antigas ao pe de uma placa memorial.',
    ],
    mountain: [
        'Runas anas marcam a rocha: "Mina de Thardurum - Era das Sombras."',
        'Um mural desgastado mostra guerreiros lutando contra um dragao.',
        'Marcas de picareta cobrem a parede. Veios de minerio esgotado.',
        'Um simbolo de cla anao esculpido na pedra, quase apagado.',
        'Instrucoes de mineracao em lingua antiga cobrem a superficie.',
    ],
    volcanic: [
        'Glifos de fogo brilham fracamente na rocha vulcanica.',
        'Uma profecia legivel entre as cinzas: "Quando a montanha despertar..."',
        'Ossos fossilizados incrustados na parede de lava solidificada.',
        'Cristais de obsidiana formam padroes que lembram constelacoes.',
        'Marcas de rituais antigos circundam um altar de pedra vulcanica.',
    ],
};

function _showInscription(col, row, ins) {
    const overlay = document.getElementById('dm-overlay');
    const narr = document.getElementById('dm-narration');
    const choices = document.getElementById('dm-choices');
    if (!overlay || !narr || !choices) return;
    narr.innerHTML = '';
    choices.innerHTML = '';
    const pool = INSCRIPTION_TEXTS[S.biome] || INSCRIPTION_TEXTS['cave'];
    const text = pool[ins.textIdx % pool.length];
    narr.innerHTML = '<p class="dm-text">' + text + '</p>';
    const btnOk = document.createElement('button');
    btnOk.className = 'dm-choice-btn';
    btnOk.textContent = 'Interessante (+5 XP)';
    btnOk.onclick = () => {
        ins.read = true;
        S._inscriptionsRead.add(col + ',' + row);
        S.xpChange += 5;
        overlay.classList.remove('active');
        showTerrainToast('+5 XP (Inscricao)', 'reward');
        saveState();
    };
    choices.appendChild(btnOk);
    overlay.classList.add('active');
}

// =============================================
// SAFE ROOM DETECTION
// =============================================

function checkSafeRoom(col, row) {
    if (!S.safeRooms) return;
    const sr = S.safeRooms.find(s => s.col === col && s.row === row && !s.discovered);
    if (!sr) return;
    sr.discovered = true;
    showTerrainToast('Area Segura - Descanso sem emboscada', 'flavor');
    S._inSafeRoom = true;
    saveState();
}

// =============================================
// ENVIRONMENTAL HAZARDS
// =============================================

function checkEnvironmentalHazards(col, row) {
    if (!S.grid) return;
    const neighbors = typeof getNeighbors === 'function' ? getNeighbors(col, row) : [];
    let nearLava = false;
    for (const [nc, nr] of neighbors) {
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        const tile = S.grid[nr] && S.grid[nr][nc];
        if (tile === 'L') { nearLava = true; break; }
    }
    if (nearLava) {
        const roll = Math.floor(Math.random() * 20) + 1;
        const conMod = S.playerData ? (S.playerData.con_mod || 0) : 0;
        if (roll + conMod < 12) {
            const dmg = Math.floor(Math.random() * 4) + 1;
            S.hpChange -= dmg;
            showTerrainToast('Calor extremo! -' + dmg + ' HP (fogo)', 'damage');
            if (typeof updateHPHUD === 'function') updateHPHUD();
        }
    }
}

// ── Door Opening Animation ──────────────────────────────

function _animateDoorOpen(col, row, key) {
    const pos = typeof hexToScreen === 'function' ? hexToScreen(col, row) : null;
    if (!pos) {
        // Fallback: instant open
        S.grid[row][col] = '.';
        S._doorsOpened.add(key);
        _staticDirty = true;
        saveState();
        return;
    }

    // Create door animation overlay on main canvas
    const frames = 8;
    let frame = 0;
    const doorW = HEX_W * 0.4;
    const doorH = HEX_H * 0.6;

    function drawDoorFrame() {
        // Draw on the animated (main) canvas context
        const sx = (pos.x - _cameraOffsetX) * _zoomLevel;
        const sy = (pos.y - _cameraOffsetY) * _zoomLevel;
        const progress = frame / frames; // 0 to 1

        _ctx.save();
        _ctx.translate(sx, sy);
        _ctx.scale(_zoomLevel, _zoomLevel);

        // Erase the area
        _ctx.clearRect(-doorW, -doorH / 2, doorW * 2, doorH);

        // Draw door swinging open (perspective transform via scaleX)
        const scaleX = 1.0 - progress * 0.85;
        _ctx.save();
        _ctx.translate(-doorW * 0.4, 0);
        _ctx.scale(scaleX, 1);

        // Door panel
        _ctx.fillStyle = 'rgba(100,70,40,' + (0.9 - progress * 0.5) + ')';
        _ctx.fillRect(-doorW / 2, -doorH / 2, doorW, doorH);
        // Iron bands
        _ctx.fillStyle = 'rgba(60,60,60,' + (0.7 - progress * 0.4) + ')';
        _ctx.fillRect(-doorW / 2, -doorH / 3, doorW, 2);
        _ctx.fillRect(-doorW / 2, doorH / 3, doorW, 2);
        // Handle
        _ctx.fillStyle = 'rgba(160,130,60,' + (0.8 - progress * 0.5) + ')';
        _ctx.beginPath();
        _ctx.arc(doorW / 3, 0, 1.5, 0, Math.PI * 2);
        _ctx.fill();

        _ctx.restore();

        // Dust particles during opening
        if (progress > 0.2 && progress < 0.8) {
            const dustCount = 3;
            for (let i = 0; i < dustCount; i++) {
                const dx = (Math.random() - 0.5) * doorW * 2;
                const dy = (Math.random() - 0.5) * doorH;
                const alpha = 0.3 * (1 - progress);
                _ctx.fillStyle = 'rgba(180,160,120,' + alpha + ')';
                _ctx.beginPath();
                _ctx.arc(dx, dy - doorH * 0.2, 1 + Math.random(), 0, Math.PI * 2);
                _ctx.fill();
            }
        }

        _ctx.restore();

        frame++;
        if (frame <= frames) {
            requestAnimationFrame(drawDoorFrame);
        } else {
            // Animation done — update grid
            S.grid[row][col] = '.';
            S._doorsOpened.add(key);
            _staticDirty = true;
            scheduleRender();
            showTerrainToast('A porta range ao abrir...', 'flavor');
            saveState();
        }
    }

    drawDoorFrame();
}


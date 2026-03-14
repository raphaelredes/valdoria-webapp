// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// HAZARD NARRATIONS — rich context before and after dice rolls
// ═══════════════════════════════════════════════════════
const HAZARD_NARRATIONS = {
    lava: {
        pre: "O chão racha e uma onda de calor sufocante emerge. Lava borbulha nas fendas próximas, espirrando gotas incandescentes que chiavam ao tocar a rocha.|Você precisa resistir ao calor — uma falha pode deixar marcas dolorosas.",
        ok: "Com esforço, você supera a onda de calor. Sua pele arde, mas nenhuma queimadura real. A lava recua para suas fendas enquanto você se afasta.",
        fail: "As chamas alcançam você antes que possa reagir. O fogo morde sua pele, deixando marcas que ardem a cada passo. O cheiro de tecido chamuscado preenche o ar."
    },
    swamp: {
        pre: "Bolhas emergem da lama escura ao seu redor, liberando vapores esverdeados de cheiro pútrido. O miasma tóxico do pântano envolve você como um véu invisível.|Se não resistir, o veneno entrará pela pele e pelas narinas — e ficará cada vez mais difícil seguir em frente.",
        ok: "Você prende a respiração e cobre o rosto a tempo. Os vapores passam sem efeito — desta vez. Seus olhos ardem levemente, mas o pior foi evitado.",
        fail: "Os vapores tóxicos entram pelas narinas antes que você perceba. Uma náusea pesada se instala no estômago. O veneno já corre nas veias — cada passo ficará mais difícil enquanto durar."
    },
    ice: {
        pre: "O chão à frente brilha com uma camada fina de gelo transparente. Cristais de geada cintilam sob a luz fraca, belos e traiçoeiros.|Cada passo pode ser o último antes de escorregar. Seus reflexos serão testados — gelo não perdoa.",
        ok: "Com cuidado calculado, você atravessa a superfície congelada. Seus pés encontram tração onde parecia impossível. Um suspiro de alívio escapa dos seus lábios.",
        fail: "Seus pés deslizam sem aviso. O impacto contra o chão gelado é duro e brusco, arrancando o ar dos pulmões. Você se levanta com dificuldade, sentindo cada osso protestar."
    }
};

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

    // Story event trigger — complex multi-stage narratives
    if (typeof shouldTriggerStory === 'function' && typeof showStoryEvent === 'function') {
        const story = shouldTriggerStory(poi);
        if (story) {
            showStoryEvent(story.id, 'intro');
            return;
        }
    }

    // activateOverlay clears dm-choices + dm-narration before showing
    activateOverlay('dm-overlay');

    // Apply biome visual theme
    const overlay = document.getElementById('dm-overlay');
    overlay.setAttribute('data-biome', S.biome || 'forest');
    overlay.classList.remove('ambient-event');

    document.getElementById('dm-icon').textContent = '';
    document.getElementById('dm-title').textContent = poi.title || 'Evento';
    document.getElementById('dm-type').textContent = POI_TYPE_LABELS[poi.type] || poi.type;

    // Route NPC dialogue POIs to the multi-turn dialogue system
    if (poi.dialogue && poi.dialogue.length > 0) {
        if (typeof deactivateOverlay === 'function') deactivateOverlay('dm-overlay');
        else document.getElementById('dm-overlay').classList.remove('active');
        showNPCDialogue(poi);
        return;
    }

    // Typewriter narration — after text finishes, show "Continuar" button before choices
    const narrEl = document.getElementById('dm-narration');
    narrEl.innerHTML = '<span class="cursor"></span>';
    const ambientText = poi.narration || 'O vento sussurra entre as sombras enquanto você avança com cautela...';
    if (!poi.narration) console.warn('[EXPLORE] Ambient event with empty narration, using fallback');
    typewriter(narrEl, ambientText, () => {
        // Show continue button to let player absorb the narration
        const contBtn = document.createElement('button');
        contBtn.className = 'dm-continue-btn';
        contBtn.innerHTML = '<span>Continuar…</span> <span style="font-size:16px">▸</span>';
        contBtn.addEventListener('click', () => {
            contBtn.remove();
            showChoices(poi);
        });
        narrEl.appendChild(contBtn);
    });
}

// Ambient event — narrative-only, no choices, just atmosphere
function showAmbientEvent(poi) {
    activateOverlay('dm-overlay');
    const overlay = document.getElementById('dm-overlay');
    overlay.setAttribute('data-biome', S.biome || 'forest');
    overlay.classList.add('ambient-event');

    // Hide header for ambient events — pure atmosphere
    const header = overlay.querySelector('.dm-header');
    if (header) header.style.display = 'none';

    const narrEl = document.getElementById('dm-narration');
    narrEl.innerHTML = '<span class="cursor"></span>';
    typewriter(narrEl, poi.narration || '', () => {
        const contBtn = document.createElement('button');
        contBtn.className = 'ambient-continue-btn';
        contBtn.textContent = 'Prosseguir…';
        contBtn.addEventListener('click', () => {
            overlay.classList.remove('active', 'ambient-event');
            if (typeof setEventActive === 'function') setEventActive(false);
            if (header) header.style.display = '';
            // Small XP reward for experiencing the world
            if (poi.xp) {
                S.xpEarned += poi.xp;
                updateRewards();
            }
            logMoveEvent([{ type: 'ambient', title: poi.title || '' }]);
            saveState();
        });
        narrEl.appendChild(contBtn);
    });
}



// --- Paginated Typewriter ---
// Splits text on '|' delimiter into pages. If no delimiter, auto-splits
// long text at sentence boundaries to keep each page readable.
// Shows a "Continuar..." button between pages, then calls onDone after the last.
const _NARR_PAGE_MAX = 160; // Max chars per auto-page (fits dm-card on 390px)

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
    if (window.vTypewriter) {
        vTypewriter.write(el, text, { paginate: true, onDone: onDone });
    } else if (onDone) { el.textContent = text; onDone(); }
}

/* _typewriterPage -> shared/typewriter.js */

/* _showPageContinue -> shared/typewriter.js */


// NPC Multi-Turn Dialogue — richer NPC encounters with personality
function showNPCDialogue(poi) {
    activateOverlay('dm-overlay');
    const overlay = document.getElementById('dm-overlay');
    overlay.setAttribute('data-biome', S.biome || 'forest');
    overlay.classList.remove('ambient-event');

    // Show NPC name and title
    document.getElementById('dm-icon').textContent = '';
    document.getElementById('dm-title').textContent = poi.npcName || poi.title || 'Viajante';
    document.getElementById('dm-type').textContent = poi.npcTitle || 'Encontro';

    const narrEl = document.getElementById('dm-narration');
    narrEl.innerHTML = '';

    // Show intro narration first
    typewriter(narrEl, poi.narration || '', () => {
        // Then show dialogue lines one at a time
        const dialogueLines = poi.dialogue || [];
        if (dialogueLines.length > 0) {
            _showDialogueLine(narrEl, dialogueLines, 0, poi);
        } else {
            // No dialogue, go straight to choices
            _showNPCChoicesWithContinue(narrEl, poi);
        }
    });
}

function _showDialogueLine(narrEl, lines, idx, poi) {
    if (idx >= lines.length) {
        _showNPCChoicesWithContinue(narrEl, poi);
        return;
    }
    const line = lines[idx];
    const lineEl = document.createElement('div');
    lineEl.className = 'npc-dialogue-line';

    if (line.speaker === 'npc' && poi.npcName) {
        const nameTag = document.createElement('div');
        nameTag.className = 'npc-name-tag';
        nameTag.textContent = poi.npcName;
        lineEl.appendChild(nameTag);
    }

    const textSpan = document.createElement('span');
    lineEl.appendChild(textSpan);
    narrEl.appendChild(lineEl);

    // Typewriter effect for the dialogue line
    let i = 0;
    let _done = false;
    const text = line.text || line.t || '';
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    lineEl.appendChild(cursor);

    const skipTyping = () => {
        if (_done) return;
        _done = true;
        clearInterval(iv);
        textSpan.textContent = text;
        cursor.remove();
        lineEl.removeEventListener('click', skipTyping);
        // Show continue button for next line
        const isLast = idx >= lines.length - 1;
        if (isLast) {
            _showNPCChoicesWithContinue(narrEl, poi);
        } else {
            const contBtn = document.createElement('button');
            contBtn.className = 'dm-continue-btn';
            contBtn.innerHTML = '<span>Continuar…</span> <span style="font-size:16px">▸</span>';
            contBtn.addEventListener('click', () => {
                contBtn.remove();
                _showDialogueLine(narrEl, lines, idx + 1, poi);
            });
            narrEl.appendChild(contBtn);
        }
    };
    lineEl.addEventListener('click', skipTyping);

    const iv = setInterval(() => {
        if (i >= text.length) {
            if (_done) return;
            _done = true;
            clearInterval(iv);
            cursor.remove();
            lineEl.removeEventListener('click', skipTyping);
            const isLast = idx >= lines.length - 1;
            if (isLast) {
                _showNPCChoicesWithContinue(narrEl, poi);
            } else {
                const contBtn = document.createElement('button');
                contBtn.className = 'dm-continue-btn';
                contBtn.innerHTML = '<span>Continuar…</span> <span style="font-size:16px">▸</span>';
                contBtn.addEventListener('click', () => {
                    contBtn.remove();
                    _showDialogueLine(narrEl, lines, idx + 1, poi);
                });
                narrEl.appendChild(contBtn);
            }
            return;
        }
        textSpan.textContent += text[i];
        i++;
    }, 35);
}

function _showNPCChoicesWithContinue(narrEl, poi) {
    const contBtn = document.createElement('button');
    contBtn.className = 'dm-continue-btn';
    contBtn.innerHTML = '<span>Responder…</span> <span style="font-size:16px">▸</span>';
    contBtn.addEventListener('click', () => {
        contBtn.remove();
        showChoices(poi);
    });
    narrEl.appendChild(contBtn);
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
    // Guard: prevent double-processing the same POI choice
    if (S.poisResolved.has(poi.id)) return;
    // Release event mutex when closing overlay
    if (typeof deactivateOverlay === 'function') {
        deactivateOverlay('dm-overlay');
    } else {
        document.getElementById('dm-overlay').classList.remove('active');
    }
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
    const stat = check ? check.s : null;
    const condDis = stat && typeof conditionGivesDisadvantage === 'function' && conditionGivesDisadvantage(stat);
    const hasDis = condDis || !!(check && check.dis);
    const exhDis = S.exhaustion >= 3;
    if (hasAdv && (hasDis || exhDis)) return 'normal';
    if (hasAdv) return 'advantage';
    if (hasDis || exhDis) return 'disadvantage';
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

            if (window.vHaptic) vHaptic.notify(success ? 'success' : 'error');

            _showCheckSkip(overlay, success, choice, poi);
        });
    } else {
        // Fallback: emoji-based animation (no THREE.js)
        _showCheckEmojiFallback(overlay, roll, r1, r2, mode, mod, statName, profMark, dc, total, success, choice, poi);
    }
}

// Continue logic shared by both 3D and emoji paths — requires tap to advance
function _showCheckSkip(overlay, success, choice, poi) {
    let _checkDone = false;
    const skipBtn = document.getElementById('check-skip-btn');

    const finishCheck = () => {
        if (_checkDone) return;
        _checkDone = true;
        if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
        disposeDice3D();
        overlay.classList.remove('active');
        if (typeof setEventActive === 'function') setEventActive(false);
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

    // Show "Continuar" button after 1500ms — gives time to read the dice result
    // Player must tap to proceed, giving time to read the result
    setTimeout(() => {
        if (!_checkDone && skipBtn) {
            skipBtn.classList.add('visible');
            skipBtn.onclick = finishCheck;
        }
    }, 1500);

    // Safety timeout: auto-advance after 15s to prevent stuck screen
    setTimeout(() => {
        if (!_checkDone) {
            console.warn('[EXPLORE] Check skip auto-advance (15s safety timeout)');
            finishCheck();
        }
    }, 15000);
}

// Emoji fallback when THREE.js is unavailable
function _showCheckEmojiFallback(overlay, roll, r1, r2, mode, mod, statName, profMark, dc, total, success, choice, poi) {
    const formulaEl = document.getElementById('check-formula');
    const resultEl = document.getElementById('check-result');
    const wrapper = document.getElementById('dice3d-wrapper');

    // Show emoji in the wrapper
    wrapper.innerHTML = `<div class="dice-display-fallback" style="font-size:clamp(48px,12vw,64px);text-align:center;animation:diceRoll 0.7s ease">${r2 !== null ? buildDiceHTML(r1, r2, mode) : 'd20'}</div>`;

    formulaEl.innerHTML = buildFormula(roll, mod, statName, profMark, dc, total, r1, r2, mode);

    setTimeout(() => {
        const fb = wrapper.querySelector('.dice-display-fallback');
        if (fb && r2 === null) {
            fb.textContent = roll <= 1 ? 'Falha Crítica' : roll >= 20 ? 'Crítico!' : roll;
        }
        resultEl.textContent = success ? 'Sucesso!' : 'Falha!';
        resultEl.className = 'check-result ' + (success ? 'success' : 'failure');

        if (window.vHaptic) vHaptic.notify(success ? 'success' : 'error');

        _showCheckSkip(overlay, success, choice, poi);
    }, 1000);
}

function showStage2(poi, stage2) {
    // activateOverlay clears dm-choices + dm-narration before showing
    activateOverlay('dm-overlay');

    const overlay = document.getElementById('dm-overlay');
    overlay.setAttribute('data-biome', S.biome || 'forest');
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
                if (typeof setEventActive === 'function') setEventActive(false);
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
        // Dedup: only add item if not already found in this exploration
        if (!S.itemsFound.includes(outcome.i)) {
            S.itemsFound.push(outcome.i);
        }
        addRewardBadge(rewardsEl, outcome.i, 'item');
    }
    // Chain event clue — store for later POIs in the same map
    if (outcome.cc) {
        if (!S.chainClues) S.chainClues = new Set();
        S.chainClues.add(outcome.cc);
        addRewardBadge(rewardsEl, '🔗 Pista encontrada', 'item');
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
        if (window.vHaptic) vHaptic.success();
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
    if (typeof deactivateOverlay === 'function') {
        deactivateOverlay('outcome-overlay');
    } else {
        document.getElementById('outcome-overlay').classList.remove('active');
    }
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
    const _combatNarr = (combat.en || 'Inimigo') + ' se prepara para o combate!';
    const _combatSpan = document.createElement('span');
    _combatSpan.style.cssText = 'color:#d44;font-weight:bold;';
    _combatSpan.textContent = _combatNarr;
    const _combatTextEl = document.getElementById('combat-text');
    _combatTextEl.innerHTML = '';
    _combatTextEl.appendChild(_combatSpan);

    overlay.classList.add('active');
    if (window.vHaptic) vHaptic.heavy();

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

    const combatText = _combatNarr;
    const combatDelay = typeof calcReadTime === 'function' ? calcReadTime(combatText, 'combat') : 2000;
    setTimeout(finishCombat, combatDelay);
}

// Post-combat narrative (brief toast after returning from combat, biome-aware)
const POST_COMBAT_NARRATIONS = {
    forest: [
        'O silêncio retorna à floresta. Pássaros voltam a cantar.',
        'Folhas caem sobre o campo de batalha como um véu fúnebre.',
        'A mata aceita sua vitória em silêncio. Você segue adiante.',
        'O aroma de musgo substitui o cheiro de batalha.',
        'Galhos quebrados marcam o local do combate. Você segue em frente.',
    ],
    plains: [
        'O vento varre o campo, levando consigo os ecos da luta.',
        'A grama alta se endireita lentamente onde pisaram.',
        'O horizonte permanece imutável — a planície já esqueceu.',
        'Uma brisa fresca seca o suor da batalha no seu rosto.',
    ],
    swamp: [
        'A lama engole os vestígios do combate lentamente.',
        'O pântano retoma seu silêncio úmido e opressivo.',
        'Bolhas sobem da água turva — o pântano digerindo os restos.',
        'Sapos voltam a coaxar. O perigo passou, por enquanto.',
    ],
    cave: [
        'O eco da batalha reverbera e se perde nos túneis escuros.',
        'Sua tocha vacila, mas se firma. A caverna está segura.',
        'Pingos de água retomam seu ritmo constante na escuridão.',
        'O silêncio subterrâneo retorna, pesado como pedra.',
    ],
    desert: [
        'A areia cobre rapidamente as marcas do combate.',
        'O calor implacável do deserto não dá trégua após a luta.',
        'Abutres circulam ao longe — atraídos pelo cheiro de batalha.',
        'O vento sopra areia sobre os rastros. O deserto esquece rápido.',
    ],
    mountain: [
        'O vento gélido seca o suor da batalha nos seus ossos.',
        'Pedras soltas pelo combate rolam encosta abaixo.',
        'A montanha é indiferente à sua vitória. Você segue escalando.',
        'O eco do combate se perde entre os picos distantes.',
    ],
    snow: [
        'Neve fresca começa a cobrir as marcas da luta.',
        'O frio penetra os cortes — você precisa se mover.',
        'Flocos de neve caem sobre o campo de batalha em silêncio.',
        'O branco imaculado já oculta os vestígios do combate.',
    ],
    volcanic: [
        'O calor sufocante retorna como se nada tivesse acontecido.',
        'Cinzas vulcânicas pousam sobre os restos da batalha.',
        'A terra treme brevemente — a montanha segue viva.',
        'O cheiro de enxofre se mistura ao aço e sangue.',
    ],
    graveyard: [
        'Os mortos voltam ao seu repouso inquieto. Por enquanto.',
        'A névoa se fecha sobre o local da batalha como uma mortalha.',
        'Sussurros se calam entre as lápides. O silêncio pesa.',
        'Corvos retornam aos seus postos como sentinelas da morte.',
    ],
    _default: [
        'A poeira assenta. Você respira fundo e segue adiante.',
        'O silêncio retorna ao redor. Você recupera o fôlego.',
        'A ameaça foi neutralizada. A trilha está livre.',
        'Com a vitória, sua confiança cresce.',
        'Após a batalha, você examina os arredores com cautela.',
    ],
};

function showPostCombatNarrative() {
    const lines = POST_COMBAT_NARRATIONS[S.biome] || POST_COMBAT_NARRATIONS._default;
    const text = lines[Math.floor(Math.random() * lines.length)];
    showTerrainToast(text, 'flavor');
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
                console.debug('[EXPLORE] Transition retry', attempt);
                await new Promise(r => setTimeout(r, 2000));
            }
            const resp = await fetchT(`${S.apiBase}/api/webapp/transition`, {
                method: 'POST',
                headers: _th,
                body: JSON.stringify(body)
            }, 10000);

            if (resp.status === 401 || resp.status === 403) {
                console.error('[EXPLORE] Auth error on combat transition:', resp.status);
                const tg = window.Telegram?.WebApp;
                if (tg?.sendData) {
                    tg.sendData(JSON.stringify({ action: 'webapp_error_close', webapp: 'EXPLORE', reason: 'session_expired' }));
                    setTimeout(function () { if (tg.close) tg.close(); }, 1000);
                    return;
                }
                break; // stop retrying on auth error
            }
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
                console.debug('[EXPLORE] Inventory transition retry', attempt);
                await new Promise(r => setTimeout(r, 2000));
            }
            const resp = await fetchT(`${S.apiBase}/api/webapp/transition`, {
                method: 'POST',
                headers: _th,
                body: JSON.stringify(body)
            }, 10000);

            if (resp.status === 401 || resp.status === 403) {
                console.error('[EXPLORE] Auth error on inventory transition:', resp.status);
                const tg = window.Telegram?.WebApp;
                if (tg?.sendData) {
                    tg.sendData(JSON.stringify({ action: 'webapp_error_close', webapp: 'EXPLORE', reason: 'session_expired' }));
                    return;
                }
                break;
            }
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
            <div style="font-size:16px;margin:10px 0;color:#c4953a;font-weight:bold">GUARDIÃO</div>
            <div style="font-size:16px;font-weight:bold;color:#c4953a;margin-bottom:8px">${boss.en || 'Guardião'}</div>
            <div style="font-size:13px;color:var(--v-text-dim, #a09484);margin-bottom:16px;line-height:1.4">${boss.n || 'Um guardião bloqueia a saída!'}</div>
            <div id="boss-choices" style="display:flex;flex-direction:column;gap:8px"></div>
        </div>`;

    const choicesDiv = overlay.querySelector('#boss-choices');
    // Fight (direct combat)
    const fightBtn = document.createElement('button');
    fightBtn.className = 'v-btn v-btn-primary';
    fightBtn.innerHTML = 'Lutar';
    fightBtn.onclick = () => {
        overlay.classList.remove('active');
        if (typeof setEventActive === 'function') setEventActive(false);
        triggerCombat({ combat: { en: boss.en, ei: boss.ei, b: boss.b || S.biome, d: boss.d || S.dangerLevel } });
        S._bossDefeated = true; saveState();
    };
    choicesDiv.appendChild(fightBtn);

    // Stealth bypass (skill check)
    const stealthBtn = document.createElement('button');
    stealthBtn.className = 'v-btn';
    stealthBtn.innerHTML = `Esgueirar <span style="font-size:11px;opacity:0.7">(${Math.round(stealthChance)}%)</span>`;
    stealthBtn.onclick = () => {
        const { roll } = rollD20('normal');
        const total = roll + stealthMod;
        if (total >= stealthDC) {
            const successText = 'Você passa sem ser notado!';
            overlay.innerHTML = `<div class="event-content" style="text-align:center">
                <div style="font-size:clamp(20px,5vw,24px);margin:10px 0;color:#6a8">${roll}+${stealthMod} = ${total} vs DC ${stealthDC}</div>
                <div style="color:#6a8;font-size:16px">${successText}</div></div>`;
            S._bossDefeated = true; saveState();
            S.xpEarned += 10;
            const delay = typeof calcReadTime === 'function' ? calcReadTime(successText, 'overlay') : 2000;
            setTimeout(() => { overlay.classList.remove('active'); if (typeof setEventActive === 'function') setEventActive(false); _showPortalSummary(); }, delay);
        } else {
            const failText = 'Detectado! O guardião ataca!';
            overlay.innerHTML = `<div class="event-content" style="text-align:center">
                <div style="font-size:clamp(20px,5vw,24px);margin:10px 0;color:#a66">${roll}+${stealthMod} = ${total} vs DC ${stealthDC}</div>
                <div style="color:#a66;font-size:16px">${failText}</div></div>`;
            S._bossDefeated = true; saveState();
            const delay = typeof calcReadTime === 'function' ? calcReadTime(failText, 'overlay') : 2000;
            setTimeout(() => {
                overlay.classList.remove('active');
                if (typeof setEventActive === 'function') setEventActive(false);
                triggerCombat({ combat: { en: boss.en, ei: boss.ei, b: boss.b || S.biome, d: boss.d || S.dangerLevel } });
            }, delay);
        }
    };
    choicesDiv.appendChild(stealthBtn);

    // Retreat (go back to map)
    const retreatBtn = document.createElement('button');
    retreatBtn.className = 'v-btn';
    retreatBtn.style.opacity = '0.7';
    retreatBtn.innerHTML = 'Recuar';
    retreatBtn.onclick = () => { overlay.classList.remove('active'); if (typeof setEventActive === 'function') setEventActive(false); };
    choicesDiv.appendChild(retreatBtn);

    overlay.classList.add('active');
    if (window.vHaptic) vHaptic.warning();
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
    html += `<div style="margin-top:8px;color:#8a7a68">${S.visited.size} turnos</div>`;

    summary.innerHTML = html;
    overlay.classList.add('active');
    if (window.vHaptic) vHaptic.success();

    let _portalDone = false;
    const skipBtn = document.getElementById('portal-skip-btn');
    const finishPortal = () => {
        if (_portalDone) return; _portalDone = true;
        if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
        finishExploration('finished');
    };
    setTimeout(() => { if (!_portalDone && skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = finishPortal; } }, 500);
    const summaryText = summary.textContent || '';
    const portalDelay = typeof calcReadTime === 'function' ? calcReadTime(summaryText, 'summary') : 2500;
    setTimeout(finishPortal, portalDelay);
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

    if (window.vHaptic) vHaptic.heavy();

    const overlay = document.getElementById('encounter-overlay');
    overlay.setAttribute('data-biome', S.biome || 'forest');
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
                if (typeof setEventActive === 'function') setEventActive(false);
                logMoveEvent([{ type: 'encounter', enc_type: enc.type, choice: idx }]);

                const encPoi = { id: -1, choices: [], combat: enc.cb || null, type: 'enc' };

                if (ch.cmb_direct && enc.cb) {
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
    damage: 'background:rgba(180,60,60,0.18);border:1px solid rgba(180,60,60,0.35);color:#b55',
    danger: 'background:rgba(180,60,60,0.18);border:1px solid rgba(180,60,60,0.35);color:#b55',
    condition: 'background:rgba(170,68,68,0.2);border:1px solid rgba(170,68,68,0.4);color:#c88',
    flavor: 'background:rgba(50,44,58,0.78);border:1px solid rgba(196,149,58,0.3);color:#d8d0c2;font-style:italic;font-size:12px;letter-spacing:0.3px;box-shadow:0 2px 8px rgba(0,0,0,0.4)',
};

// Toast category mapping for calcReadTime
const _TOAST_TIMING = { damage: 'toast-warn', danger: 'toast-warn', condition: 'toast-warn', flavor: 'toast' };

// Compact toast notification for terrain effects

// A5: Detect reward patterns in toast messages and spawn floating text on map
function _maybeSpawnRewardFloat(message) {
    if (typeof spawnFloatingText !== 'function') return;
    var clean = message.replace(/<[^>]*>/g, '');
    var patterns = [
        { rx: /\+(\d+)\s*XP/i, color: '#6c8', label: 'XP', sign: '+' },
        { rx: /\+(\d+)\s*GP/i, color: '#c4953a', label: 'GP', sign: '+' },
        { rx: /-(\d+)\s*HP/i, color: '#c44', label: 'HP', sign: '-' },
        { rx: /\+(\d+)\s*HP/i, color: '#4a8', label: 'HP', sign: '+' },
    ];
    for (var i = 0; i < patterns.length; i++) {
        var p = patterns[i];
        var m = clean.match(p.rx);
        if (m) {
            spawnFloatingText(S.col, S.row, p.sign + m[1] + ' ' + p.label, p.color, 'damage');
            return;
        }
    }
}

function showTerrainToast(message, type) {
    try {
        // A5: Spawn floating text on map for rewards
        _maybeSpawnRewardFloat(message);

        const existing = document.getElementById('terrain-toast-el');
        if (existing) existing.remove();

        const theme = TOAST_STYLES[type] || TOAST_STYLES.difficult;
        const toast = document.createElement('div');
        toast.id = 'terrain-toast-el';
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;top:50px;left:50px;right:50px;' +
            'padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700;' +
            'pointer-events:none;z-index:99999;text-align:center;' +
            'animation:toastSlideIn 0.3s ease-out;' +
            'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);' +
            'box-shadow:0 4px 16px rgba(0,0,0,0.5),inset 0 1px 0 rgba(196,149,58,0.08);' +
            'text-shadow:0 1px 3px rgba(0,0,0,0.7);' + theme;
        document.body.appendChild(toast);

        const category = _TOAST_TIMING[type] || 'toast';
        const duration = typeof calcReadTime === 'function' ? calcReadTime(message, category) : 1500;
        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    } catch (err) {
        console.error('[EXPLORE] showTerrainToast:', err);
    }
}

// Full-screen color flash for hazard damage
function flashScreen(color) {
    const flash = document.createElement('div');
    flash.style.cssText = `position:fixed;inset:0;background:${color};z-index:199;pointer-events:none;`;
    flash.style.animation = 'encounterFlash 0.6s ease-out forwards';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 700);
    // Camera shake on damage flash (M21)
    if (typeof addShakeTrauma === 'function') addShakeTrauma(0.4);
}

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
        if (window.vHaptic) vHaptic.medium();

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
    if (window.vHaptic) vHaptic.medium();

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
        }
    } catch (e) {
        console.error('[EXPLORE] sendData failed:', e);
    }
    setTimeout(() => {
        try { if (tg) tg.close(); } catch (e) {
            console.warn('[EXPLORE] tg.close fallback failed:', e);
        }
    }, 1000);
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
            if (r.status === 401 || r.status === 403) {
                console.error('[EXPLORE] Auth error on game transition:', r.status);
                if (window.Telegram?.WebApp?.sendData) {
                    Telegram.WebApp.sendData(JSON.stringify({ action: 'webapp_error_close', webapp: 'EXPLORE', reason: 'session_expired' }));
                    setTimeout(function () { if (Telegram.WebApp.close) Telegram.WebApp.close(); }, 1000);
                    return;
                }
                break;
            }
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
            if (r.status === 401 || r.status === 403) {
                console.error('[EXPLORE] Auth error on navigate transition:', r.status);
                if (window.Telegram?.WebApp?.sendData) {
                    Telegram.WebApp.sendData(JSON.stringify({ action: 'webapp_error_close', webapp: 'EXPLORE', reason: 'session_expired' }));
                    setTimeout(function () { if (Telegram.WebApp.close) Telegram.WebApp.close(); }, 1000);
                    return;
                }
                break;
            }
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
                if (data.status === 'ok' && data.engine) {
                    // Detect tunnel URL change — reload with new URL
                    if (data.api && S.apiBase && data.api !== S.apiBase) {
                        console.debug('[EXPLORE] Tunnel URL changed, updating apiBase in memory');
                        S.apiBase = data.api;
                        if (window.ApiDiscovery) ApiDiscovery.updateBase(data.api);
                    }
                    return true;
                }
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

    if (S.apiBase && window.ApiDiscovery) {
        ApiDiscovery.init(S.apiBase, function(newUrl) {
            S.apiBase = newUrl;
        });
    }

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

    // ── Device displacement heartbeat ──
    if (window.SessionHeartbeat && S.apiBase && S.token && S.uid) {
        SessionHeartbeat.init({ apiBase: S.apiBase, token: S.token, uid: parseInt(S.uid) || 0 });
    }

    // ── Loading progress controller ──
    const _lc = window._loadingCtrl || { setProgress: () => {}, hideLoading: (cb) => { if (cb) cb(); }, hideQuick: () => {}, cleanup: () => {} };
    _lc.setProgress(10, 'Iniciando...'); // Init started

    // ── Health check before loading ──
    if (S.apiBase) {
        _lc.setProgress(15, 'Conectando...');
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

    console.debug('[EXPLORE] Init params:', {
        hasToken: !!S.token, hasApi: !!S.apiBase, hasUid: !!S.uid,
        dataLen: dataB64.length, isRestore,
        url: window.location.href.substring(0, 120) + '...'
    });

    let dataObj = null;

    // Fetch persistence state and payload from backend API if available
    _lc.setProgress(25, 'Buscando dados...');
    if (S.apiBase && S.uid && S.token) {
        try {
            const url = `${S.apiBase}/api/explore/state?user_id=${S.uid}`;
            console.debug('[EXPLORE] Fetching state from API:', url);
            const _sh = { 'Authorization': `Bearer ${S.token}` };
            if (window.Telegram?.WebApp?.initData) { _sh['X-Telegram-Init-Data'] = Telegram.WebApp.initData; }
            const resp = await fetchT(url, {
                method: 'GET',
                headers: _sh
            });
            console.debug('[EXPLORE] API response status:', resp.status);
            if (resp.status === 401 || resp.status === 403) {
                console.error('[EXPLORE] Auth error on state fetch:', resp.status);
                const tg = window.Telegram?.WebApp;
                if (tg?.sendData) {
                    tg.sendData(JSON.stringify({
                        action: 'webapp_error_close', webapp: 'EXPLORE',
                        reason: resp.status === 401 ? 'session_expired' : 'invalid_init_data',
                    }));
                    setTimeout(function () { if (tg.close) tg.close(); }, 1000);
                    return;
                }
            }
            if (resp.ok) {
                const rData = await resp.json();
                console.debug('[EXPLORE] API response:', {
                    hasPayload: !!(rData && rData.payload),
                    payloadLen: rData?.payload?.length || 0,
                    hasState: !!(rData && rData.state),
                });

                // Load map payload from API if not in URL
                if (!dataB64 && rData && rData.payload) {
                    dataB64 = rData.payload;
                    console.debug('[EXPLORE] Loaded payload from API fallback (' + dataB64.length + ' chars)');
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

    _lc.setProgress(50, 'Dados recebidos');

    if (!dataB64) {
        _lc.cleanup();
        console.error('[EXPLORE] FATAL: No map data available. URL data param empty, API fallback failed.');
        document.getElementById('loading').innerHTML = `
            <div style="color:#a44;font-size:16px;text-align:center;padding:16px">
                Dados do mapa não encontrados.<br>
                Volte ao bot e tente novamente.
                <br><br>
                <button onclick="location.reload()" style="background:#4a3828;color:#d4c8b0;border:1px solid #6a4a2a;padding:10px 16px;border-radius:8px;font-family:var(--v-font);font-size:14px;cursor:pointer">
                    Tentar novamente
                </button>
            </div>`;
        return;
    }

    try {
        _lc.setProgress(60, 'Descomprimindo...');
        const binary = atob(dataB64.replace(/-/g, '+').replace(/_/g, '/'));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const inflated = await zlibInflate(bytes);
        const jsonStr = new TextDecoder().decode(inflated);
        dataObj = JSON.parse(jsonStr);
        _lc.setProgress(75, 'Gerando terreno...');

        // Travel animation (only on fresh start, not restore)
        const regionName = dataObj.rn || '';
        if (!isRestore && regionName && typeof playTravelAnimation === 'function') {
            _lc.hideQuick();
            await new Promise(resolve => {
                playTravelAnimation(dataObj.b || 'forest', regionName, resolve);
            });
        }

        _lc.setProgress(90, 'Preparando mapa...');
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
        _lc.cleanup();
        console.error('Failed to parse map data:', e);
        document.getElementById('loading').innerHTML = '<div style="color:#a44;font-size:16px;text-align:center;padding:16px">Erro ao carregar mapa.<br>' + e.message + '</div>';
    }
}

// Start
document.addEventListener('DOMContentLoaded', () => initAsync());


// ═══════════════════════════════════════════════════════════
// TILE INTERACTION SYSTEM (D&D 5e)
// ═══════════════════════════════════════════════════════════

// ── Environmental Storytelling (Flavor Texts) ────────────

const _BIOME_FLAVOR = {
    cave: [
        'Gotas d\'agua ecoam no escuro...',
        'O ar e umido e frio. Musgo cobre as pedras.',
        'Riscos antigos marcam a parede da caverna.',
        'Um cheiro de terra molhada permeia o tunel.',
        'Estalagmites brilham fracamente com minerais.',
        'Ossos pequenos se espalham pelo chao rochoso.',
        'O eco de seus passos viaja longe na escuridao.',
        'Raizes grossas perfuram o teto da caverna.',
    ],
    graveyard: [
        'Lapides desgastadas se inclinam no escuro.',
        'Uma brisa gelada carrega sussurros indistintos.',
        'Teias de aranha cobrem um velho candelabro.',
        'O chao de pedra esta marcado por runas apagadas.',
        'Um odor de mofo e incenso velho paira no ar.',
        'Ossos antigos descansam em nichos na parede.',
        'A escuridao aqui parece mais densa que o normal.',
        'Velas derretidas formam estalactites de cera.',
    ],
    volcanic: [
        'O calor e quase insuportavel nesta area.',
        'Fissuras no chao emitem um brilho alaranjado.',
        'O ar treme com ondas de calor intenso.',
        'Cristais negros de obsidiana brilham fracamente.',
        'Cinzas vulcanicas cobrem tudo como neve escura.',
        'O chao vibra com um tremor distante.',
    ],
    mountain: [
        'O vento uiva pelas fendas na rocha.',
        'Neve antiga se acumula nos cantos sombrios.',
        'Marcas de garras enormes riscam a pedra.',
        'O ar rarefeito dificulta a respiracao.',
        'Cristais de gelo decoram as paredes de granito.',
        'Pedras soltas rangem sob seus pes.',
    ],
    swamp: [
        'Bolhas sobem da lama escura com um plop.',
        'Raizes retorcidas formam arcos naturais.',
        'O ar e denso com o cheiro de decomposicao.',
        'Insetos luminescentes piscam entre os juncos.',
        'A lama suga seus passos com avidez.',
        'Vapores esverdeados sobem do charco proximo.',
    ],
    forest: [
        'Raios de luz filtram pela copa das arvores.',
        'Cogumelos brilhantes crescem em um tronco caido.',
        'Pegadas de animais marcam a trilha a frente.',
        'Folhas secas estaliam sob seus passos.',
        'Um riacho murmura suavemente ao longe.',
        'O canto de passaros ecoa entre as arvores.',
    ],
    desert: [
        'O sol escaldante reflete na areia clara.',
        'Dunas de areia fina se movem com o vento.',
        'Ossos branqueados pelo sol marcam uma antiga trilha.',
        'O calor cria miragens tremeluzentes no horizonte.',
    ],
};

// Flavor text cooldown and tracking
let _flavorCooldown = 0;
const _FLAVOR_CHANCE = 0.12; // 12% chance per step
const _FLAVOR_COOLDOWN_STEPS = 6; // Min 6 steps between flavor texts

function checkFlavorText(col, row) {
    if (_flavorCooldown > 0) { _flavorCooldown--; return; }

    // Only on passable terrain, not special tiles
    const tile = S.grid[row] && S.grid[row][col];
    if (!tile || tile === '#' || tile === 'D' || tile === '@' || tile === 'E') return;

    // Roll for flavor text
    if (Math.random() > _FLAVOR_CHANCE) return;

    const biome = S.biome || 'cave';
    const pool = _BIOME_FLAVOR[biome] || _BIOME_FLAVOR['cave'];
    if (!pool || pool.length === 0) return;

    // Pick a flavor text based on position (deterministic-ish but varied)
    const idx = (col * 7 + row * 13 + (S._stepCount || 0)) % pool.length;
    const text = pool[idx];

    showTerrainToast(text, 'flavor');
    _flavorCooldown = _FLAVOR_COOLDOWN_STEPS;
}


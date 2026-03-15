// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// HAZARD NARRATIONS — rich context before and after dice rolls
// ═══════════════════════════════════════════════════════
var HAZARD_NARRATIONS = {
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
    },
    desert: {
        pre: "O calor do deserto se intensifica abruptamente. Ondas de ar quente distorcem sua visão enquanto a areia escaldante queima através das solas.|Cada respiração é como engolir brasas. Seu corpo precisa resistir.",
        ok: "Você cobre o rosto e avança com determinação. A onda de calor passa, deixando apenas sede e exaustão suportáveis.",
        fail: "O calor é demais. Seus músculos cedem, a visão escurece nas bordas. A desidratação cobra seu preço antes que possa encontrar sombra."
    },
    mountain: {
        pre: "O terreno íngreme se torna instável. Pedras soltas se desprendem sob seus pés, e uma onda de cascalho desce a encosta em sua direção.|Agilidade e reflexos serão necessários para evitar a avalanche de rochas.",
        ok: "Com um salto certeiro, você evita as pedras que despencam. O coração bate forte, mas você está inteiro.",
        fail: "As pedras atingem você antes que possa reagir. O impacto é brutal — contusões e cortes marcam sua pele enquanto o cascalho se acomoda."
    },
    graveyard: {
        pre: "Uma névoa sobrenatural se adensa. O ar gela em torno de você e sussurros inaudíveis parecem vir de todos os lados.|Uma presença antiga tenta drenar sua vitalidade. Resista, ou sinta a morte roçar seus ossos.",
        ok: "Você concentra sua vontade e repele a presença. A névoa se dissipa como um suspiro de derrota.",
        fail: "O frio penetra até os ossos. Uma fração de sua vitalidade é arrancada por mãos invisíveis. Você sente a morte como uma brisa gelada."
    },
    volcanic: {
        pre: "Fissuras se abrem no chão vulcânico, liberando jatos de gás sulfuroso e fagulhas ardentes. O calor é quase insuportável.|Respirar se torna um desafio. Resistir a este inferno requer força de vontade.",
        ok: "Você protege as vias aéreas e segue firme. O pior do vulcanismo ficou para trás — desta vez.",
        fail: "Gás tóxico e fagulhas atingem você em cheio. Queimaduras e tosse violenta marcam sua passagem pelo terreno vulcânico."
    },
    snow: {
        pre: "Uma rajada de vento gelado carrega flocos de gelo cortantes. A temperatura despenca e seus músculos começam a enrijecer.|A hipotermia ameaça. Você precisa resistir ao frio mortal.",
        ok: "Apertando os dentes, você resiste à investida do frio. Seus dedos estão dormentes, mas funcionais.",
        fail: "O frio vence. Seus movimentos ficam lentos e desajeitados. Cristais de gelo se formam nos cílios enquanto a hipotermia se instala."
    },
};

// 3D DICE MANAGER (shared Dice3D instance for check overlays)
// ═══════════════════════════════════════════════════════

let _dice3d = null;

function getDice3D() {
    const container = document.getElementById('dice3d-canvas');
    const particles = document.getElementById('dice3d-particles');
    if (!container) { console.warn('[EXPLORE] dice3d-canvas not found'); return null; }
    if (typeof Dice3D === 'undefined') { console.warn('[EXPLORE] Dice3D class not defined, THREE:', typeof THREE); return null; }
    // console.log removed for production
    if (_dice3d) {
        _dice3d.dispose();
        _dice3d = null;
    }
    try {
        _dice3d = new Dice3D(container, { size: 200, particlesContainer: particles });
    } catch (e) {
        console.error('[EXPLORE] Dice3D init failed:', e);
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
// DAMAGE DICE — 3D animated damage rolls (reuses #check-overlay)
// ═══════════════════════════════════════════════════════

var DAMAGE_FLASH_COLORS = {
    fire: 'rgba(255,100,0,0.25)',
    lightning: 'rgba(200,200,255,0.4)',
    piercing: 'rgba(200,40,40,0.3)',
    poison: 'rgba(100,200,50,0.2)',
    bludgeoning: 'rgba(200,40,40,0.3)',
    slashing: 'rgba(200,40,40,0.3)',
};

/**
 * Show 3D dice animation for damage rolls.
 * @param {string} formula - Dice formula ("2d6", "1d4", "1d8")
 * @param {string} label - Damage label ("dano de queda", "dano de fogo")
 * @param {string} damageType - Flash color key ("fire","lightning","piercing","bludgeoning")
 * @param {function} onDone - Callback(totalDamage) after animation
 */
function showDamageDice(formula, label, damageType, onDone) {
    var match = formula.match(/(\d+)d(\d+)/);
    if (!match) { if (onDone) onDone(0); return; }
    var count = parseInt(match[1]);
    var sides = parseInt(match[2]);

    // Pre-calculate total
    var total = 0;
    for (var i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
    }
    if (total < 1) total = 1;

    var overlay = document.getElementById('check-overlay');
    var formulaEl = document.getElementById('check-formula');
    var resultEl = document.getElementById('check-result');
    var skipBtn = document.getElementById('check-skip-btn');
    if (!overlay || !formulaEl || !resultEl) { if (onDone) onDone(total); return; }

    // Setup overlay for damage display
    formulaEl.innerHTML = '<span style="color:var(--v-gold);font-size:14px">' + formula + ' ' + label + '</span>';
    resultEl.textContent = '';
    resultEl.className = 'check-result';
    if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
    activateOverlay('check-overlay');

    var dice = getDice3D();
    var _done = false;
    var canvas = document.getElementById('dice3d-canvas');

    var finishDamage = function () {
        if (_done) return;
        _done = true;
        // Show damage result
        resultEl.textContent = '-' + total + ' HP';
        resultEl.className = 'check-result failure';
        flashScreen(DAMAGE_FLASH_COLORS[damageType] || 'rgba(200,40,40,0.3)');
        if (window.vHaptic) vHaptic.notify('error');

        // Auto-close after reading time
        var closeDelay = typeof calcReadTime === 'function' ? calcReadTime('-' + total + ' HP ' + label, 'overlay') : 2000;
        var _closed = false;
        var closeDamage = function () {
            if (_closed) return;
            _closed = true;
            disposeDice3D();
            if (canvas) canvas.classList.remove('multi');
            overlay.classList.remove('active');
            if (onDone) onDone(total);
        };
        setTimeout(function () { if (!_closed && skipBtn) { skipBtn.classList.add('visible'); skipBtn.onclick = closeDamage; } }, 500);
        setTimeout(closeDamage, closeDelay);
    };

    if (!dice) {
        // Fallback: no 3D — show result directly after brief pause
        setTimeout(finishDamage, 700);
        return;
    }

    if (count >= 2) {
        // Multi-dice: rollMultiple → fusionTo
        var individualResults = _distributeHealTotal(total, count, sides);
        var configs = individualResults.map(function (v) { return { value: v }; });
        if (canvas) canvas.classList.add('multi');

        dice.rollMultiple(configs, function () {
            formulaEl.innerHTML = '<span style="color:var(--v-text-dim);font-size:13px">' +
                individualResults.join(' + ') + '</span>';
            setTimeout(function () {
                formulaEl.innerHTML = '';
                dice.fusionTo(total, finishDamage);
            }, 800);
        });
    } else {
        // Single die: roll directly
        var rollVal = Math.max(1, Math.min(sides, total));
        dice.roll(rollVal, finishDamage);
    }
}

/**
 * Show DM narration overlay then damage dice.
 * @param {string} icon - Emoji icon for the event
 * @param {string} title - Overlay title
 * @param {string} narration - DM narration text
 * @param {string} formula - Dice formula
 * @param {string} label - Damage label
 * @param {string} damageType - Flash color key
 * @param {function} onDone - Callback(totalDamage) after everything
 */
function showDamageEvent(icon, title, narration, formula, label, damageType, onDone) {
    activateOverlay('dm-overlay');
    var overlay = document.getElementById('dm-overlay');
    var dmIcon = document.getElementById('dm-icon');
    var dmTitle = document.getElementById('dm-title');
    var dmType = document.getElementById('dm-type');
    var narrEl = document.getElementById('dm-narration');
    var choicesEl = document.getElementById('dm-choices');

    if (!overlay) { showDamageDice(formula, label, damageType, onDone); return; }

    if (dmIcon) dmIcon.textContent = icon;
    if (dmTitle) dmTitle.textContent = title;
    if (dmType) dmType.textContent = 'perigo';
    if (choicesEl) choicesEl.innerHTML = '';

    typewriter(narrEl, narration, function () {
        var btn = document.createElement('button');
        btn.className = 'dm-choice-btn';
        btn.textContent = 'Continuar...';
        btn.onclick = function () {
            // Activate damage overlay BEFORE closing narration to avoid black flash
            showDamageDice(formula, label, damageType, onDone);
            overlay.classList.remove('active');
        };
        if (choicesEl) choicesEl.appendChild(btn);
    });
}

// ═══════════════════════════════════════════════════════
// MOVEMENT LOG (internal — sent to backend)
// ═══════════════════════════════════════════════════════
function logMoveEvent(events) {
    // Check for terrain type changes to show transition narrations
    if (typeof checkTerrainTransition === 'function') checkTerrainTransition(S.playerCol, S.playerRow);

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

    // Fallback for empty/missing choices — prevent stuck overlay
    if (!poi.choices || poi.choices.length === 0) {
        console.warn('[EXPLORE] POI has no choices, adding fallback button:', poi.id);
        const btn = document.createElement('button');
        btn.className = 'dm-choice-btn';
        btn.innerHTML = '<span class="choice-label">Prosseguir…</span>';
        btn.addEventListener('click', () => {
            if (typeof deactivateOverlay === 'function') deactivateOverlay('dm-overlay');
            else document.getElementById('dm-overlay').classList.remove('active');
            S.poisResolved.add(poi.id);
            if (poi.xp) { S.xpEarned += poi.xp; updateRewards(); }
            logMoveEvent([{type: 'poi_empty', id: poi.id}]);
            saveState();
        });
        choicesEl.appendChild(btn);
        return;
    }

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

    if (r2 !== null) {
        // Advantage/disadvantage: show two dice boxes (existing logic)
        wrapper.innerHTML = '<div class="dice-display-fallback" style="font-size:clamp(48px,12vw,64px);text-align:center;animation:diceRoll 0.7s ease">' + buildDiceHTML(r1, r2, mode) + '</div>';
    } else {
        // Normal roll: animated cycling numbers inside a styled die box
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
        }, 700);
    }

    formulaEl.innerHTML = buildFormula(roll, mod, statName, profMark, dc, total, r1, r2, mode);

    setTimeout(function() {
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

// Biome-specific pre-combat narrations for immersive encounter buildup
var PRE_COMBAT_NARRATIONS = {
    forest: [
        'Galhos estalando! Algo grande se move entre as \u00e1rvores, e voc\u00ea sente o ch\u00e3o tremer sob seus p\u00e9s.',
        'Um rosnado baixo ecoa entre o arvoredo. Olhos brilhantes surgem na escurid\u00e3o — a ca\u00e7a come\u00e7ou.',
        'As folhas se agitam violentamente. Uma presen\u00e7a hostil emerge das sombras da floresta.',
    ],
    plains: [
        'O vento muda de dire\u00e7\u00e3o. Ao longe, uma silhueta se aproxima com passos decididos.',
        'A grama alta se abre de repente. Algo estava esperando por voc\u00ea.',
        'O sil\u00eancio das plan\u00edcies \u00e9 quebrado por um grito de guerra.',
    ],
    cave: [
        'Pedras caem do teto. Nos t\u00faneis escuros, algo respira pesadamente.',
        'A tocha vacila. Uma sombra se move na parede — n\u00e3o \u00e9 a sua.',
        'O eco dos seus passos \u00e9 interrompido por um sibilo ameac\u0327ador.',
    ],
    swamp: [
        'Bolhas est\u00e3o surgindo na lama. Algo emerge lentamente das \u00e1guas turvas.',
        'O ch\u00e3o treme sob seus p\u00e9s. Uma criatura do p\u00e2ntano despertou.',
        'N\u00e9voa t\u00f3xica se adensa. Atrav\u00e9s dela, olhos \u00e2mbar brilham com fome.',
    ],
    desert: [
        'A areia se agita em esp\u00edrais. Algo sob a duna se desloca na sua dire\u00e7\u00e3o com velocidade assustadora.',
        'O calor distorce o ar, mas n\u00e3o \u00e9 uma miragem — a criatura \u00e9 real e letal.',
    ],
    mountain: [
        'Pedras rolam morro abaixo. Algo se move entre os penhascos, circundando voc\u00ea.',
        'Um rugido ecoa pelas montanhas. A criatura salta de uma sali\u00eancia rochosa.',
    ],
    snow: [
        'A neve se agita. Passos pesados se aproximam atrav\u00e9s da nevasca.',
        'O frio se intensifica. Uma presen\u00e7a ancestral emerge do gelo.',
    ],
    volcanic: [
        'Lava borbulha. Das fissuras incandescentes, algo se ergue envolvido em chamas.',
        'O calor se torna insuport\u00e1vel. Uma criatura de fogo bloqueia seu caminho.',
    ],
    graveyard: [
        'L\u00e1pides tremem. A terra se abre e m\u00e3os esquel\u00e9ticas emergem do solo.',
        'O ar gela. Uma presen\u00e7a sobrenatural materializa diante de voc\u00ea.',
    ],
};

function _getPreCombatNarration(biome, enemyName) {
    var pool = PRE_COMBAT_NARRATIONS[biome] || PRE_COMBAT_NARRATIONS.forest;
    return pool[Math.floor(Math.random() * pool.length)];
}

function triggerCombat(poi) {
    var combat = poi.combat;
    S.combatTrigger = combat;
    logMoveEvent([{ type: 'combat', enemy: combat.en || 'unknown' }]);

    // Screen shake on map viewport for combat
    var viewport = document.getElementById('map-viewport');
    if (viewport) {
        viewport.classList.add('screen-shake');
        setTimeout(function() { viewport.classList.remove('screen-shake'); }, 600);
    }

    // Double flash effect for combat
    var flash = document.createElement('div');
    flash.className = 'encounter-flash';
    document.body.appendChild(flash);
    setTimeout(function() { flash.remove(); }, 700);

    // Show DM narration BEFORE combat overlay for dramatic buildup
    var enemyName = combat.en || 'Inimigo';
    var narration = _getPreCombatNarration(S.biome, enemyName);

    activateOverlay('dm-overlay');
    var dmOverlay = document.getElementById('dm-overlay');
    var dmIcon = document.getElementById('dm-icon');
    var dmTitle = document.getElementById('dm-title');
    var dmType = document.getElementById('dm-type');
    var narrEl = document.getElementById('dm-narration');
    var choicesEl = document.getElementById('dm-choices');

    if (dmIcon) dmIcon.textContent = '\u2694\ufe0f';
    if (dmTitle) dmTitle.textContent = 'Encontro!';
    if (dmType) dmType.textContent = 'combate';
    if (choicesEl) choicesEl.innerHTML = '';

    typewriter(narrEl, narration, function () {
        var btn = document.createElement('button');
        btn.className = 'dm-choice-btn';
        btn.style.cssText = 'border-color:rgba(200,60,60,0.5);color:#d44;';
        btn.innerHTML = '<span class="choice-icon">\u2694\ufe0f</span><span class="choice-label">Enfrentar ' + enemyName + '</span>';
        btn.onclick = function () {
            dmOverlay.classList.remove('active');
            _showCombatOverlay(combat, enemyName);
        };
        if (choicesEl) choicesEl.appendChild(btn);
    });
}

function _showCombatOverlay(combat, enemyName) {
    var overlay = document.getElementById('combat-overlay');
    document.getElementById('combat-icon').textContent = '';
    document.getElementById('combat-enemy').textContent = enemyName;
    var _combatNarr = enemyName + ' se prepara para o combate!';
    var _combatSpan = document.createElement('span');
    _combatSpan.style.cssText = 'color:#d44;font-weight:bold;';
    _combatSpan.textContent = _combatNarr;
    var _combatTextEl = document.getElementById('combat-text');
    _combatTextEl.innerHTML = '';
    _combatTextEl.appendChild(_combatSpan);

    overlay.classList.add('active');
    if (window.vHaptic) vHaptic.heavy();

    var _combatDone = false;
    var skipBtn = document.getElementById('combat-skip-btn');

    var finishCombat = function () {
        if (_combatDone) return;
        _combatDone = true;
        if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
        if (S.apiBase) {
            transitionToArena();
        } else {
            finishExploration('combat');
        }
    };

    setTimeout(function () {
        if (!_combatDone && skipBtn) {
            skipBtn.classList.add('visible');
            skipBtn.onclick = finishCombat;
        }
    }, 500);

    var combatDelay = typeof calcReadTime === 'function' ? calcReadTime(_combatNarr, 'combat') : 2000;
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
                    window.__valdoria_transitioning = true;
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
                    window.__valdoria_transitioning = true;
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
            if (typeof deactivateOverlay === 'function') deactivateOverlay('dm-overlay');
            else overlay.classList.remove('active');
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
        toast.style.cssText = 'position:fixed;top:50%;left:40px;right:40px;' +
            'transform:translateY(-50%);' +
            'padding:12px 20px;border-radius:12px;font-size:14px;font-weight:700;' +
            'pointer-events:none;z-index:99999;text-align:center;' +
            'animation:toastFadeIn 0.3s ease-out;' +
            'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
            'box-shadow:0 4px 24px rgba(0,0,0,0.6),inset 0 1px 0 rgba(196,149,58,0.1);' +
            'text-shadow:0 1px 3px rgba(0,0,0,0.7);' + theme;
        document.body.appendChild(toast);

        const category = _TOAST_TIMING[type] || 'toast';
        const duration = typeof calcReadTime === 'function' ? calcReadTime(message, category) : 1500;
        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-50%) scale(0.95)';
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
    const bonus = parseInt(match[3]) || 0;

    // Roll the dice first (applies healing)
    const heal = useInventoryItem(item);

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

    // Add multi class for wider canvas when 2+ dice
    canvas.classList.remove('multi');
    if (count >= 2) canvas.classList.add('multi');

    try {
        if (_healDice) { _healDice.dispose(); _healDice = null; }
        const canvasSize = count >= 2 ? 200 : 140;
        _healDice = new Dice3D(canvas, { size: canvasSize, dieType: dieType, duration: 1000 });
    } catch (e) {
        console.warn('[EXPLORE] Heal Dice3D init failed:', e);
        // Emoji fallback: show cycling numbers then result
        var die = document.createElement('div');
        die.className = 'die kept';
        die.style.cssText = 'width:64px;height:64px;font-size:32px;margin:0 auto;border-radius:10px';
        die.textContent = '\ud83c\udfb2';
        canvas.parentNode.insertBefore(die, canvas);
        canvas.style.display = 'none';
        var _cyc = setInterval(function() { die.textContent = Math.floor(Math.random() * sides) + 1; }, 50);
        setTimeout(function() {
            clearInterval(_cyc);
            die.textContent = heal;
            label.textContent = '+' + heal + ' HP';
            if (window.vHaptic) vHaptic.medium();
            setTimeout(function() {
                overlay.classList.remove('active');
                canvas.style.display = '';
                die.remove();
                if (onDone) onDone(heal);
            }, 1000);
        }, 700);
        return;
    }

    if (count >= 2) {
        // Multi-dice: rollMultiple -> fusionTo (same pattern as combat-dice.js)
        const diceTotal = Math.max(count, heal - bonus);
        const individualResults = _distributeHealTotal(diceTotal, count, sides);
        const configs = individualResults.map(function (v) { return { value: v }; });

        _healDice.rollMultiple(configs, function () {
            label.textContent = individualResults.join(' + ') + (bonus ? ' + ' + bonus : '');
            setTimeout(function () {
                label.textContent = '';
                _healDice.fusionTo(heal, function () {
                    label.textContent = '+' + heal + ' HP';
                    if (window.vHaptic) vHaptic.medium();
                    setTimeout(function () {
                        overlay.classList.remove('active');
                        canvas.classList.remove('multi');
                        if (_healDice) { _healDice.dispose(); _healDice = null; }
                        if (onDone) onDone(heal);
                    }, 1000);
                });
            }, 800);
        });
    } else {
        // Single die: roll directly
        const rollVal = Math.max(1, Math.min(sides, heal - bonus));
        _healDice.roll(rollVal, function () {
            label.textContent = '+' + heal + ' HP';
            if (window.vHaptic) vHaptic.medium();
            setTimeout(function () { // noqa: preflight — single-die path, not fallback
                overlay.classList.remove('active');
                if (_healDice) { _healDice.dispose(); _healDice = null; }
                if (onDone) onDone(heal);
            }, 1000);
        });
    }
}

// Distribute a heal total across N dice (same algorithm as combat-dice.js)
function _distributeHealTotal(diceTotal, count, sides) {
    var results = [];
    var remaining = Math.max(count, Math.min(diceTotal, count * sides));
    for (var i = 0; i < count - 1; i++) {
        var minNeeded = count - i - 1;
        var maxAllowed = remaining - minNeeded;
        var value = Math.min(sides, Math.max(1,
            Math.floor(Math.random() * Math.min(sides, maxAllowed)) + 1));
        results.push(value);
        remaining -= value;
    }
    results.push(Math.min(sides, Math.max(1, remaining)));
    return results;
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
            window.__valdoria_transitioning = true;
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
            window.__valdoria_transitioning = true;
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
        // [EXIT-CONFIRM] BackButton handled by exit-confirm.js (shows popup)
        // Default exit (tg.close) is sufficient — exploration state saved via beforeunload
    }

    // Save state on close attempt (beforeunload) + visibility change (more reliable on iOS)
    window.addEventListener('beforeunload', () => { saveState(); });
    window.addEventListener('pagehide', () => { saveState(); }); // bfcache-compatible unload signal
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveState();
    });

    const params = new URLSearchParams(window.location.search);
    S.token = params.get('token') || '';
    S.apiBase = params.get('api') || '';
    S.uid = params.get('uid') || '';
    // Set per-character localStorage key before any save/restore
    if (typeof initCharKey === 'function') initCharKey();

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
                    // Always update token and timestamp so restoreState() accepts
                    // server state (handles page refresh, direct URL, and restore)
                    rData.state.tk = S.token;
                    rData.state.ts = Date.now();
                    if (isRestore) {
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


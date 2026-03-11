// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════
let COLS = 11, ROWS = 13;
const IMPASSABLE = new Set(['W', 'M', 'L', '#', 'D']);

// Hex neighbors (odd-r offset)
const EVEN_OFFSETS = [[-1, -1], [0, -1], [-1, 0], [1, 0], [-1, 1], [0, 1]];
const ODD_OFFSETS = [[0, -1], [1, -1], [-1, 0], [1, 0], [0, 1], [1, 1]];

// Full Portuguese names for dice animation display
const STAT_NAMES = {
    str: 'Força', dex: 'Destreza', con: 'Constituição', int: 'Inteligência', wis: 'Sabedoria', cha: 'Carisma',
    atl: 'Atletismo', acr: 'Acrobacia', slh: 'Prestidigitação', stl: 'Furtividade',
    arc: 'Arcanismo', his: 'História', inv: 'Investigação', nat: 'Natureza', rel: 'Religião',
    anh: 'Lid. Animais', ins: 'Intuição', med: 'Medicina',
    per: 'Percepção', sur: 'Sobrevivência', dec: 'Enganação',
    itm: 'Intimidação', prf: 'Atuação', prs: 'Persuasão',
};
// Compact 3-letter codes for button badges
const STAT_SHORT = {
    str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR',
    atl: 'ATL', acr: 'ACR', slh: 'PRE', stl: 'FUR', arc: 'ARC', his: 'HIS',
    inv: 'INV', nat: 'NAT', rel: 'REL', anh: 'ANI', ins: 'ITU', med: 'MED',
    per: 'PER', sur: 'SOB', dec: 'ENG', itm: 'ITM', prf: 'ATU', prs: 'PRS',
};

const POI_TYPE_LABELS = { dis: 'Descoberta', sea: 'Busca', dan: 'Perigo', mys: 'Mistério', npc: 'Encontro' };

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════
let S = {
    grid: [],         // 2D array [row][col]
    pois: [],         // POI data
    biome: 'forest',
    playerCol: 0, playerRow: 0,
    exitCol: 0, exitRow: 0,
    visibility: 3,
    visited: new Set(),
    fogState: {},     // "col,row" -> 'hidden'|'dim'|'visible'
    xpEarned: 0,
    goldEarned: 0,
    hpChange: 0,
    itemsFound: [],
    poisResolved: new Set(),
    checksPerformed: [],
    combatTrigger: null,
    charData: null,
    token: '',
    dmIntro: '',
    dangerLevel: 1,
    randomEncounters: [],
    conditions: [],          // Active conditions
    exhaustion: 0,           // D&D 5e exhaustion level (0-6)
    _stepsWithoutRest: 0,    // Steps since last rest (forced march tracking): [{type, stepsLeft}]
    _hazardsTriggered: new Set(),  // Hexes that already triggered hazards
    _watchUsed: false,             // Watch activity: first encounter advantage consumed
    _flavorSteps: 0,         // Steps since last flavor event
    travelPace: 'normal',    // 'fast'|'normal'|'cautious' (D&D PHB Ch.8)
    travelActivity: null,    // 'watch'|'forage'|'navigate'|'stealth'
    interactedHexes: new Set(), // Hexes where player used "Explore Area"

    // Movement log (internal, sent to backend)
    moveLog: [],             // Array of log entries per step
    _stepCount: 0,           // Sequential step counter
    inventory: [],           // Consumables from payload (local copy)
    inventoryUsed: [],       // Items consumed: [{name, type, qty}]
    _lowHPAlertShown: false, // Prevent repeated low HP alerts
};

let tg = null;
const STORAGE_KEY = 'valdoria_explore_state';

// ═══════════════════════════════════════════════════════
// SESSION PERSISTENCE
// ═══════════════════════════════════════════════════════
function saveState() {
    try {
        const snap = {
            tk: S.token,
            pc: S.playerCol, pr: S.playerRow,
            vis: Array.from(S.visited),
            fog: S.fogState,
            xp: S.xpEarned, gp: S.goldEarned,
            hp: S.hpChange,
            it: S.itemsFound,
            pr2: Array.from(S.poisResolved),
            ck: S.checksPerformed,
            ct: S.combatTrigger,
            re: S.randomEncounters,
            cd: S.conditions,
            hz: Array.from(S._hazardsTriggered || new Set()),
            tt: Array.from(S._trapsTriggered || new Set()),
            ml: S.moveLog,
            sc: S._stepCount,
            inv: S.inventory,
            iu: S.inventoryUsed,
            bd: S._bossDefeated || false,
            cau: S._campAmbushUsed || false,
            wu: S._watchUsed || false,
            ex: S.exhaustion || 0,
            swr: S._stepsWithoutRest || 0,
            tp: S.travelPace || 'normal',
            ta: S.travelActivity || null,
            wt: S.weather || 's',
            ih: Array.from(S.interactedHexes || new Set()),
            ccl: Array.from(S.chainClues || new Set()),
            gc: COLS, gr: ROWS,
            do2: Array.from(S._doorsOpened || new Set()),
            sr2: Array.from(S._secretsRevealed || new Set()),
            tp2: Array.from(S._terrainPassed || new Set()),
            trT: (S.traps || []).filter(t => t.triggered).map(t => `${t.col},${t.row}`),
            ts: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));

        // POST to backend API if enabled
        if (typeof S !== 'undefined' && S.apiBase && S.uid && S.token) {
            const _sh = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${S.token}`
            };
            if (window.Telegram?.WebApp?.initData) {
                _sh['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
            }
            fetchT(`${S.apiBase}/api/explore/save?user_id=${S.uid}`, {
                method: 'POST',
                headers: _sh,
                body: JSON.stringify(snap)
            }).catch(e => console.error('[EXPLORE] API save error:', e));
        }
    } catch (e) { console.error('[EXPLORE] saveState:', e); }
}

function restoreState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const snap = JSON.parse(raw);
        if (snap.tk !== S.token) {
            localStorage.removeItem(STORAGE_KEY);
            return false;
        }
        if (Date.now() - snap.ts > 600000) {
            localStorage.removeItem(STORAGE_KEY);
            return false;
        }
        if (snap.gc) COLS = snap.gc;
        if (snap.gr) ROWS = snap.gr;
        S.playerCol = snap.pc; S.playerRow = snap.pr;
        S.visited = new Set(snap.vis || []);
        S.fogState = snap.fog || {};
        S.xpEarned = snap.xp || 0;
        S.goldEarned = snap.gp || 0;
        S.hpChange = snap.hp || 0;
        S.itemsFound = snap.it || [];
        S.poisResolved = new Set(snap.pr2 || []);
        S.checksPerformed = snap.ck || [];
        S.combatTrigger = snap.ct || null;
        S.randomEncounters = snap.re || [];
        S.conditions = snap.cd || [];
        S._hazardsTriggered = new Set(snap.hz || []);
        S._trapsTriggered = new Set(snap.tt || []);
        S.chainClues = new Set(snap.ccl || []);
        S._doorsOpened = new Set(snap.do2 || []);
        S._secretsRevealed = new Set(snap.sr2 || []);
        S._terrainPassed = new Set(snap.tp2 || []);
        // Restore triggered traps
        const trT = new Set(snap.trT || []);
        if (S.traps) S.traps.forEach(t => {
            if (trT.has(`${t.col},${t.row}`)) t.triggered = true;
        });
        S.moveLog = snap.ml || [];
        S._stepCount = snap.sc || 0;
        S.inventory = snap.inv || [];
        S.inventoryUsed = snap.iu || [];
        S._bossDefeated = snap.bd || false;
        S._campAmbushUsed = snap.cau || false;
        S._watchUsed = snap.wu || false;
        if (snap.wt) S.weather = snap.wt;
        S.exhaustion = snap.ex || 0;
        S._stepsWithoutRest = snap.swr || 0;
        return true;
    } catch (e) {
        console.error('[EXPLORE] restoreState:', e);
        return false;
    }
}

function loadMapData(data) {
    // Dynamic grid size from payload (default 11×13)
    COLS = data.gc || 11;
    ROWS = data.gr || 13;

    // Parse grid
    const gridStr = data.g || '';
    S.grid = [];
    for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
            const idx = r * COLS + c;
            row.push(idx < gridStr.length ? gridStr[idx] : '.');
        }
        S.grid.push(row);
    }

    S.biome = data.b || 'forest';
    S.playerCol = data.s ? data.s[0] : 5;
    S.playerRow = data.s ? data.s[1] : 12;
    S.exitCol = data.e ? data.e[0] : 5;
    S.exitRow = data.e ? data.e[1] : 0;
    S.visibility = data.v || 1;
    // DM intro: generated client-side from biome + danger level (no longer in payload)
    S.dmIntro = data.i || (typeof getDMIntro === 'function' ? getDMIntro(S.biome, data.dl || 1) : '');
    S.charData = data.c || null;
    S.dangerLevel = data.dl || 1;
    // Clone consumable inventory from payload
    S.inventory = (data.c && data.c.inv) ? JSON.parse(JSON.stringify(data.c.inv)) : [];
    S.randomEncounters = (data.re || []).map(re => ({
        type: re.y, icon: re.ic || '', title: re.tt || 'Evento',
        // Narration: resolve from index (ni) via local pool, fallback to text (n)
        narration: (re.ni != null && typeof lookupEncNarr === 'function')
            ? (lookupEncNarr(re.y, S.biome, re.ni) || re.n || '')
            : (re.n || ''),
        choices: re.ch || [],
        combat: re.cb || null,
    }));

    // ── Map features (secret passages, terrain challenges, traps, torches) ──
    S.secretPassages = (data.sp || []).map(sp => ({
        col: sp.q, row: sp.r, dc: sp.dc, skill: sp.sk, mod: sp.m || 0,
        revealed: false,
    }));
    S.terrainChallenges = (data.tc || []).map(tc => ({
        col: tc.q, row: tc.r, dc: tc.dc, skill: tc.sk, mod: tc.m || 0,
        dmg: tc.dm, label: tc.lb, used: false,
    }));
    S.traps = (data.tr || []).map(tr => ({
        col: tr.q, row: tr.r, name: tr.nm, skill: tr.sk, dc: tr.dc,
        dmg: tr.dm, mod: tr.m || 0, hidden: tr.h, hiddenDC: tr.hd || 0,
        triggered: false,
    }));
    S.torches = (data.lt || []).map(lt => ({
        col: lt.q, row: lt.r, radius: lt.rd || 2,
    }));
    // Filter hidden traps by Passive Perception
    const pp2 = getPassivePerception();
    S.traps = S.traps.filter(t => {
        if (!t.hidden) return true;
        return pp2 >= t.hiddenDC;  // PP high enough to spot
    });
    S._doorsOpened = new Set();  // Track opened doors
    S._secretsRevealed = new Set();  // Track revealed secret passages
    S._terrainPassed = new Set();  // Track passed terrain challenges

    // Ambient events — atmospheric moments (resolved from frontend pool)
    S.ambientEvents = (data.ae || []).map(ae => ({
        title: ae.tt || '',
        narration: (ae.ni != null && typeof lookupAmbientNarr === 'function')
            ? (lookupAmbientNarr(S.biome, ae.ni) || ae.n || '')
            : (ae.n || ''),
        xp: ae.x || 0,
    }));

    // Chain event clues found during this exploration
    S.chainClues = new Set(data.cc || []);

    // Boss guardian at exit, camp ambush, weather, day cycle
    S.bossData = data.bo || null;
    S.campAmbush = data.ca || null;
    S.weather = data.w || 's';
    S.startHour = data.hr || 8;
    S._bossDefeated = false;
    S._campAmbushUsed = false;
    S._watchUsed = false;
    S.exhaustion = 0;
    S._stepsWithoutRest = 0;

    // Parse POIs (with Passive Perception filter for hidden POIs)
    const allPois = (data.p || []).map(p => ({
        id: p.i, col: p.q, row: p.r,
        type: p.y, icon: p.ic, title: p.tt,
        // Narration: resolve from index (ni) via local pool, fallback to text (n)
        narration: (p.ni != null && typeof lookupPOINarr === 'function')
            ? (lookupPOINarr(p.y, S.biome, p.ni) || p.n || '')
            : (p.n || ''),
        choices: p.ch || [],
        combat: p.cb || null,
        hidden: !!p.h, hiddenDC: p.hd || 0,
        // NPC dialogue lines (multi-turn)
        dialogue: (p.dlg || []).map(d => ({ speaker: d.s || 'npc', text: d.t || '' })),
        npcName: p.nn || null,
        npcTitle: p.nt || null,
        // Chain event metadata
        chainId: p.ci || null,
        chainStage: p.cs || 0,
    }));

    const pp = getPassivePerception();
    let hiddenDetected = 0;
    S.pois = allPois.filter(p => {
        if (!p.hidden) return true;
        if (pp >= p.hiddenDC) { hiddenDetected++; return true; }
        return false; // PP too low — player misses this POI
    });
    S._passivePerception = pp;
    S._hiddenDetected = hiddenDetected;

    // Try to restore saved session
    const restored = restoreState();

    // Setup HUD
    setupHUD();

    if (restored) {
        // Re-apply opened doors and revealed secrets to grid
        for (const key of (S._doorsOpened || [])) {
            const [c, r] = key.split(',').map(Number);
            if (S.grid[r] && S.grid[r][c] === 'D') S.grid[r][c] = '.';
        }
        for (const key of (S._secretsRevealed || [])) {
            const [c, r] = key.split(',').map(Number);
            if (S.grid[r] && S.grid[r][c] === '#') S.grid[r][c] = '.';
        }
        // Re-apply fog for all visited positions
        for (const key of S.visited) {
            const [c, r] = key.split(',').map(Number);
            revealFogAt(c, r, S.visibility, S.fogState, S.grid, false);
        }
    } else {
        // Fresh start
        S.visited.add(`${S.playerCol},${S.playerRow}`);
        revealFogAt(S.playerCol, S.playerRow, S.visibility, S.fogState, S.grid, false);
    }

    // Restore condition HUD if session had active conditions
    if (restored && S.conditions.length) {
        updateConditionHUD();
    }

    // Initialize canvas renderer
    initRenderer();

    // Initialize player position
    initPlayerPosition(S.playerCol, S.playerRow);

    // Initialize bottom bar
    initBottomBar();
    if (typeof _updateActivityBadge === 'function') _updateActivityBadge();
    if (typeof updateExhaustionHUD === 'function') updateExhaustionHUD();
    if (typeof updateCompass === 'function') updateCompass();

    // Initialize atmosphere (day/night + weather)
    if (typeof updateAtmosphere === 'function') updateAtmosphere();

    // Location info
    updateLocationInfo();

    // Initialize ambient particles
    if (typeof initBiomeParticles === 'function') initBiomeParticles(S.biome);

    // Scroll to player
    setTimeout(() => scrollCanvasToPlayer(), 100);

    // Hide loading — cinematic exit for fresh starts, quick for restores
    const _lc = window._loadingCtrl;
    if (_lc && !restored) {
        _lc.setProgress(100);
        _lc.hideLoading(() => {
            // Show DM intro after cinematic exit completes
            if (S.dmIntro) showDMIntro(S.dmIntro);
            // Show activity selection after DM intro (fresh start only)
            // Blocked if tutorial is active — tutorial will trigger it on close
            if (!S.travelActivity && typeof showActivitySelection === 'function') {
                const actDelay = S.dmIntro ? 4000 : 800;
                setTimeout(() => {
                    if (!S.travelActivity && !_tutorialActive) showActivitySelection();
                }, actDelay);
            }
            // Passive Perception notification
            if (S._hiddenDetected > 0) {
                const delay = S.dmIntro ? 2000 : 600;
                setTimeout(() => {
                    if (typeof showTerrainToast === 'function') {
                        showTerrainToast(`Percepção Passiva (${S._passivePerception})`, 'ranger');
                    }
                }, delay);
            }
        });
    } else {
        // Quick hide for restores
        if (_lc) _lc.hideQuick();
        else document.getElementById('loading').classList.add('hidden');
        // Show DM intro only on fresh start
        if (S.dmIntro && !restored) {
            setTimeout(() => showDMIntro(S.dmIntro), 400);
        }
        // Show activity selection on fresh start (blocked if tutorial active)
        if (!restored && !S.travelActivity && typeof showActivitySelection === 'function') {
            const actDelay = S.dmIntro ? 4000 : 800;
            setTimeout(() => {
                if (!S.travelActivity && !_tutorialActive) showActivitySelection();
            }, actDelay);
        }
        // Passive Perception notification
        if (S._hiddenDetected > 0 && !restored) {
            const delay = S.dmIntro ? 2000 : 600;
            setTimeout(() => {
                if (typeof showTerrainToast === 'function') {
                    showTerrainToast(`Percepção Passiva (${S._passivePerception})`, 'ranger');
                }
            }, delay);
        }
    }

    // Auto-show tutorial on first visit (polls for loading to finish)
    if (typeof autoShowTutorial === 'function') autoShowTutorial();
}

// ═══════════════════════════════════════════════════════
// HUD
// ═══════════════════════════════════════════════════════
function setupHUD() {
    const c = S.charData;
    if (!c) return;
    document.getElementById('hud-name').textContent = c.nm || 'Herói';
    updateHP(c.hp || 10, c.mh || 10);
    updateRewards();
}

function updateHP(current, max) {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    const fill = document.getElementById('hp-fill');
    fill.style.width = pct + '%';
    fill.classList.remove('hp-high', 'hp-mid', 'hp-low');
    fill.classList.add(pct > 60 ? 'hp-high' : pct > 25 ? 'hp-mid' : 'hp-low');
    document.getElementById('hp-text').textContent = current + '/' + max;
}

function updateRewards() {
    const xpBadge = document.getElementById('badge-xp');
    const goldBadge = document.getElementById('badge-gold');
    xpBadge.textContent = 'XP ' + S.xpEarned;
    goldBadge.textContent = 'GP ' + S.goldEarned;
    // Spring bounce animation
    [xpBadge, goldBadge].forEach(b => {
        b.classList.remove('pop');
        void b.offsetHeight;
        b.classList.add('pop');
    });
    setTimeout(() => { xpBadge.classList.remove('pop'); goldBadge.classList.remove('pop'); }, 800);
    updateStepCounter();
}

const _STEP_MILESTONES = {
    10: 'Seus passos ganham confiança nesta terra.',
    25: 'A paisagem revela seus segredos a você.',
    50: 'Poucos exploradores chegam tão longe.',
};

function updateStepCounter() {
    const el = document.getElementById('step-counter');
    if (el) el.textContent = S.visited.size;
    const msg = _STEP_MILESTONES[S.visited.size];
    if (msg && typeof showTerrainToast === 'function') {
        S._milestonesHit = S._milestonesHit || {};
        if (!S._milestonesHit[S.visited.size]) {
            S._milestonesHit[S.visited.size] = true;
            showTerrainToast(msg, 'flavor');
        }
    }
}

function initBottomBar() {
    updateStepCounter();
    const pips = document.querySelectorAll('.danger-pips .pip');
    pips.forEach((pip, i) => {
        if (i < S.dangerLevel) {
            pip.classList.add('filled');
            if (i === S.dangerLevel - 1) pip.classList.add('pulse');
        }
    });
}

// ═══════════════════════════════════════════════════════
// TERRAIN & CONDITIONS (D&D 5e)
// ═══════════════════════════════════════════════════════

// Difficult terrain: mud always, sand in desert, ice always
function isDifficultTerrain(tile, biome) {
    if (tile === 'm' || tile === 'i') return true;
    if (tile === 's' && biome === 'desert') return true;
    // Weather: rain/storm makes all ground difficult (mud)
    if (S._weatherDifficultAll && (tile === '.' || tile === 'g')) return true;
    // Dynamic terrain: snow-covered hexes are difficult
    if (S._snowCoveredHexes && S._snowCoveredHexes.has(tile)) return true;
    return false;
}

// Ranger (Patrulheiro) ignores difficult terrain — Natural Explorer
function isRanger() {
    return S.charData && S.charData.ci === '🏹';
}

function getClassAbility() {
    if (!S.charData || !S.charData.ci) return null;
    const ci = S.charData.ci;
    const abilities = {
        '🏹': { name: 'Explorador Natural', trapBonus: 0, perBonus: 0, stealthBonus: 0 },
        '🗡': { name: 'Per\u00edcia com Armadilhas', trapBonus: 2, perBonus: 0, stealthBonus: 0 },
        '🛡': { name: 'Sentido Marcial', trapBonus: 0, perBonus: 2, stealthBonus: 0 },
        '✨': { name: 'Sentidos Arcanos', trapBonus: 0, perBonus: 0, stealthBonus: 0, arcane: true },
        '⚔️': { name: 'Sens. ao Perigo', trapBonus: 0, perBonus: 1, stealthBonus: 0 },
        '🎵': { name: 'Passos Leves', trapBonus: 0, perBonus: 0, stealthBonus: 2 },
        '🌙': { name: 'Vis\u00e3o na Escurid\u00e3o', trapBonus: 0, perBonus: 0, stealthBonus: 0, darkvision: true },
        '✡️': { name: 'Sentir Mortos-vivos', trapBonus: 0, perBonus: 0, stealthBonus: 0, detectUndead: true },
    };
    return abilities[ci] || null;
}

function getClassTrapBonus() {
    const a = getClassAbility();
    return a ? a.trapBonus : 0;
}

function getClassPerceptionBonus() {
    const a = getClassAbility();
    return a ? a.perBonus : 0;
}

function getClassStealthBonus() {
    const a = getClassAbility();
    return a ? a.stealthBonus : 0;
}

function hasClassDarkvision() {
    const a = getClassAbility();
    return a && a.darkvision;
}

// D&D ability modifier from compact stat key
function getAbilityMod(statKey) {
    const val = (S.charData && S.charData[statKey]) || 10;
    return Math.floor((val - 10) / 2);
}

// Check for active condition
function hasCondition(type) {
    return S.conditions.some(c => c.type === type);
}

// D&D 5e Passive Perception = 10 + WIS mod + proficiency (if proficient in Perception)
function getPassivePerception() {
    if (!S.charData) return 10;
    const wisMod = getAbilityMod('ws');
    const profInPerception = S.charData.sp && S.charData.sp.includes('per');
    const profBonus = profInPerception ? (S.charData.pb || 2) : 0;
    let base = 10 + wisMod + profBonus;
    if (typeof conditionPPMod === 'function') base += conditionPPMod();
    if (typeof getClassPerceptionBonus === 'function') base += getClassPerceptionBonus();
    // D&D PHB: Fast pace = -5 passive perception, Cautious = +5
    if (S.travelPace === 'fast') base -= 5;
    if (S.travelPace === 'cautious') base += 5;
    return base;
}

// Tick conditions down after each step
function tickConditions() {
    // Poison DOT: 1d4 damage per step while poisoned (D&D 5e poison damage)
    for (const c of S.conditions) {
        if (c.type === 'poisoned' && c.stepsLeft > 0) {
            const dot = Math.floor(Math.random() * 4) + 1; // 1d4
            S.hpChange -= dot;
            if (S.charData) {
                const newHP = Math.max(0, S.charData.hp + S.hpChange);
                updateHP(newHP, S.charData.mh);
            }
            flashScreen('rgba(60,180,60,0.2)');
            showTerrainToast(`-${dot} HP (veneno)`, 'damage');
        }
    }

    S.conditions = S.conditions.filter(c => {
        c.stepsLeft--;
        return c.stepsLeft > 0;
    });
    updateConditionHUD();

    // Forced march exhaustion (D&D PHB Ch.8: CON save DC 10+1 per extra step after 15)
    S._stepsWithoutRest = (S._stepsWithoutRest || 0) + 1;
    if (S._stepsWithoutRest > 15) {
        const extraSteps = S._stepsWithoutRest - 15;
        const dc = 10 + extraSteps;
        const conMod = getAbilityMod('cn');
        const { roll } = rollD20('normal');
        if (roll + conMod < dc) {
            addExhaustion(1, 'Marcha for\u00e7ada');
        }
    }

    // Update compass
    if (typeof updateCompass === 'function') updateCompass();

    // Check death after poison tick
    if (typeof checkDeath === 'function') checkDeath();
}

// Update condition icons in HUD
// D&D 5e Condition effects lookup
const CONDITION_EFFECTS = {
    poisoned:    { icon: '\u2620', label: 'Envenenado',  css: 'condition-poisoned',    dis: ['str','dx','cn','int','ws','cha','per','ste','sur','inv','atl','acr'], dot: true },
    prone:       { icon: '🧎', label: 'Ca\u00eddo',       css: 'condition-prone',       dis: ['atl','acr'], extraMove: true },
    frightened:  { icon: '😨', label: 'Amedrontado', css: 'condition-frightened',   dis: ['str','dx','atl','acr','ste'] },
    blinded:     { icon: '👁', label: 'Cego',        css: 'condition-blinded',     dis: ['per','inv'], ppMod: -5 },
    restrained:  { icon: '\u26d3',    label: 'Contido',     css: 'condition-restrained',  dis: ['dx','ste','acr'], speedZero: true },
    deafened:    { icon: '👂', label: 'Surdo',       css: 'condition-deafened',    dis: ['per'] },
    charmed:     { icon: '💜', label: 'Encantado',   css: 'condition-charmed',     dis: [] },
    stunned:     { icon: '💫', label: 'Atordoado',   css: 'condition-stunned',     dis: ['str','dx','cn','int','ws','cha'], speedZero: true },
    incapacitated:{ icon: '\u274c', label: 'Incapacitado', css: 'condition-incapacitated', dis: [], speedZero: true },
};

function conditionGivesDisadvantage(stat) {
    for (const c of S.conditions) {
        const fx = CONDITION_EFFECTS[c.type];
        if (fx && fx.dis && fx.dis.includes(stat)) return true;
    }
    if (S.exhaustion >= 1) return true;
    return false;
}

function conditionPreventsMovement() {
    for (const c of S.conditions) {
        const fx = CONDITION_EFFECTS[c.type];
        if (fx && fx.speedZero) return true;
    }
    return false;
}

function conditionPPMod() {
    let mod = 0;
    for (const c of S.conditions) {
        const fx = CONDITION_EFFECTS[c.type];
        if (fx && fx.ppMod) mod += fx.ppMod;
    }
    return mod;
}

function updateConditionHUD() {
    const bar = document.getElementById('condition-bar');
    if (!bar) return;
    bar.innerHTML = '';
    if (!S.conditions.length) {
        bar.style.display = 'none';
        return;
    }
    bar.style.display = 'flex';
    for (const c of S.conditions) {
        const fx = CONDITION_EFFECTS[c.type] || { icon: '\u2753', label: c.type, css: '' };
        const tag = document.createElement('span');
        tag.className = 'condition-tag';
        if (fx.css) tag.classList.add(fx.css);
        if (c.stepsLeft <= 2) tag.classList.add('condition-fading');
        tag.textContent = `${fx.icon} ${fx.label} (${c.stepsLeft})`;
        bar.appendChild(tag);
    }
}

// ═══════════════════════════════════════════════════════
// EXHAUSTION SYSTEM (D&D 5e PHB — 6 levels)
// ═══════════════════════════════════════════════════════
const EXHAUSTION_EFFECTS = [
    '',
    'Desvantagem em testes de habilidade',
    'Velocidade reduzida pela metade',
    'Desvantagem em saves e ataques',
    'HP m\u00e1ximo reduzido pela metade',
    'Velocidade = 0',
    'Morte',
];

function addExhaustion(levels, source) {
    const prev = S.exhaustion || 0;
    S.exhaustion = Math.min(6, prev + levels);
    if (S.exhaustion > prev) {
        updateExhaustionHUD();
        const effect = EXHAUSTION_EFFECTS[S.exhaustion] || '';
        showTerrainToast(`\u26a0\ufe0f Exaust\u00e3o ${S.exhaustion}: ${effect}`, 'condition');
        if (source) showTerrainToast(`Causa: ${source}`, 'info');
        // Level 5: can't move
        if (S.exhaustion >= 5) {
            showTerrainToast('Voc\u00ea n\u00e3o consegue mais andar! Descanse imediatamente.', 'damage');
        }
        // Level 6: death
        if (S.exhaustion >= 6 && typeof checkDeath === 'function') {
            S.hpChange = -(S.charData ? S.charData.mh : 999);
            checkDeath();
        }
        saveState();
    }
}

function removeExhaustion(levels) {
    S.exhaustion = Math.max(0, (S.exhaustion || 0) - levels);
    updateExhaustionHUD();
    saveState();
}

function resetStepsWithoutRest() {
    S._stepsWithoutRest = 0;
    saveState();
}

function getExhaustionPenalty() {
    const lvl = S.exhaustion || 0;
    return {
        abilityDisadvantage: lvl >= 1,  // Disadvantage on ability checks
        halfSpeed: lvl >= 2,            // Speed halved
        saveDisadvantage: lvl >= 3,     // Disadvantage on saves + attacks
        halfMaxHP: lvl >= 4,            // Max HP halved
        speedZero: lvl >= 5,            // Can't move
        death: lvl >= 6,               // Death
    };
}

function updateExhaustionHUD() {
    const hud = document.getElementById('exhaustion-hud');
    if (!hud) return;
    const lvl = S.exhaustion || 0;
    if (lvl === 0) {
        hud.style.display = 'none';
        return;
    }
    hud.style.display = 'flex';
    document.getElementById('exh-label').textContent = `Exaust\u00e3o ${lvl}`;
    const pips = hud.querySelectorAll('.exh-pip');
    pips.forEach((pip, i) => {
        pip.classList.remove('filled', 'critical');
        if (i < lvl) {
            pip.classList.add('filled');
            if (i >= 3) pip.classList.add('critical'); // Level 4+ = critical
        }
    });
}

// ═══════════════════════════════════════════════════════
// EXIT COMPASS
// ═══════════════════════════════════════════════════════
function updateCompass() {
    const el = document.getElementById('exit-compass');
    if (!el) return;
    if (S.exitCol == null || S.exitRow == null) { el.style.display = 'none'; return; }

    el.style.display = 'flex';
    const dx = S.exitCol - S.playerCol;
    const dy = S.exitRow - S.playerRow;
    const dist = typeof hexDist === 'function'
        ? hexDist(S.playerCol, S.playerRow, S.exitCol, S.exitRow)
        : Math.round(Math.sqrt(dx*dx + dy*dy));
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) - 90; // -90 because arrow points up

    const arrow = document.getElementById('compass-arrow');
    const distEl = document.getElementById('compass-dist');
    arrow.style.transform = `rotate(${angle}deg)`;
    arrow.style.setProperty('--compass-angle', angle + 'deg');
    distEl.textContent = dist + 'h';

    el.classList.toggle('nearby', dist <= 3);
}

// ═══════════════════════════════════════════════════════
// LOCATION INFO (bottom bar — biome + tile type)
// ═══════════════════════════════════════════════════════
const _BIOME_NAMES = {
    forest: 'Floresta', plains: 'Campos', swamp: 'Pântano', cave: 'Caverna',
    desert: 'Deserto', mountain: 'Montanha', snow: 'Ermo Gelado',
    volcanic: 'Vulcão', graveyard: 'Cemitério'
};
const _TILE_NAMES = {
    T: 'Árvores', g: 'Grama', w: 'Água', r: 'Rochedo', R: 'Ruínas',
    p: 'Trilha', s: 'Areia', m: 'Lama', i: 'Gelo', v: 'Cinzas',
    b: 'Ponte', L: 'Lava',
};

function updateLocationInfo() {
    const el = document.getElementById('location-info');
    if (!el) return;
    const baseBiome = (S.biome || '').replace(/^dungeon_/, '');
    const biomeName = _BIOME_NAMES[baseBiome] || S.biome || '';
    const tile = S.grid && S.grid[S.playerRow] ? (S.grid[S.playerRow][S.playerCol] || '.') : '.';
    const tileName = _TILE_NAMES[tile] || '';
    el.textContent = tileName ? `${biomeName} \u2022 ${tileName}` : biomeName;
}

// ═══════════════════════════════════════════════════════
// FLAVOR EVENTS (biome-specific ambient mini-events)
// ═══════════════════════════════════════════════════════
const FLAVOR_TEXTS = {
    forest: [
        'Pássaros cantam nas copas distantes.',
        'Uma brisa agita as folhas ao seu redor.',
        'Raízes retorcidas formam padrões curiosos no chão.',
        'Cogumelos brilhantes crescem na base de um tronco.',
        'Algo se move entre as árvores — e desaparece.',
        'Uma teia de aranha reluz com gotas de orvalho.',
        'O aroma de pinheiro e terra úmida envolve o ar.',
        'Um esquilo observa você de um galho alto.',
    ],
    plains: [
        'O vento faz ondas suaves no capim alto.',
        'Uma ave de rapina circula lentamente no céu.',
        'Flores silvestres colorem o campo ao longe.',
        'Uma rajada de vento traz o cheiro de terra seca.',
        'O canto dos grilos ecoa ritmicamente.',
        'Nuvens projetam sombras que cruzam o campo.',
        'Rastros de animais marcam o solo batido.',
        'A luz dourada ilumina a paisagem aberta.',
    ],
    swamp: [
        'Bolhas sobem lentamente da água turva.',
        'Um coaxar grave ecoa entre os troncos retorcidos.',
        'Nuvens de insetos pairam sobre a água parada.',
        'Um cheiro pútrido sobe da lama escura.',
        'Névoa densa se agarra ao solo encharcado.',
        'Algo se move sob a superfície da água.',
        'Troncos apodrecidos formam pontes naturais instáveis.',
        'Luzes pálidas piscam ao longe — fogos-fátuos.',
    ],
    cave: [
        'Gotas de água ecoam nas paredes distantes.',
        'Asas agitam-se na escuridão acima.',
        'Cristais refletem a luz fracamente nas paredes.',
        'Uma corrente de ar frio vem de um túnel lateral.',
        'Estalagmites projetam sombras alongadas.',
        'Teias abandonadas pendem do teto rochoso.',
        'Seus passos ecoam várias vezes antes de silenciar.',
        'Marcas de picareta antigas cobrem a parede.',
    ],
    desert: [
        'O calor distorce o horizonte em miragens.',
        'Um escorpião desliza rapidamente entre as pedras.',
        'Uma rajada de areia agita-se em espiral.',
        'O sol implacável castiga a areia sem fim.',
        'Um lagarto observa imóvel sobre uma rocha quente.',
        'Restos de cerâmica antiga emergem da areia.',
        'Um cacto solitário projeta uma sombra minúscula.',
        'Ossos esbranquiçados pontilham a paisagem árida.',
    ],
    mountain: [
        'O vento uiva entre as rochas expostas.',
        'Uma águia plana majestosamente nas correntes de ar.',
        'Pedras soltas rolam pelo declive abaixo.',
        'A temperatura cai visivelmente a cada passo.',
        'Uma cabra montanhesa observa de um penhasco.',
        'Formações rochosas formam arcos naturais.',
        'Nuvens baixas envolvem os picos ao redor.',
        'Veios minerais brilham na rocha cortada.',
    ],
    snow: [
        'Flocos de neve dançam silenciosamente ao seu redor.',
        'Pegadas no gelo se perdem na nevasca.',
        'O vento gélido corta como uma lâmina.',
        'Estalactites de gelo pendem das rochas acima.',
        'Um uivo distante ecoa pelo ermo gelado.',
        'O gelo sob seus pés range a cada passo.',
        'Uma nevasca se forma no horizonte distante.',
        'Rastros de um animal grande cruzam a neve fresca.',
    ],
    volcanic: [
        'O ar quente tremula sobre fissuras incandescentes.',
        'Um tremor sutil faz o chão vibrar.',
        'Jatos de vapor escapam de fendas na rocha.',
        'Rocha derretida brilha em veios alaranjados.',
        'O cheiro de enxofre arde nas narinas.',
        'Cinzas flutuam no ar como neve negra.',
        'O calor intenso faz a pele arder.',
        'Obsidiana negra reluz entre as rochas vulcânicas.',
    ],
    graveyard: [
        'Lápides tortas emergem da névoa rasteira.',
        'Uma coruja pia sombriamente ao longe.',
        'O vento agita galhos secos como dedos esqueléticos.',
        'Uma vela bruxuleante arde sobre um túmulo antigo.',
        'Névoa fria se agarra às suas botas.',
        'Morcegos irrompem de uma cripta entreaberta.',
        'Uma lápide rachada revela inscrições ilegíveis.',
        'Você sente um arrepio inexplicável na nuca.',
    ],
};

// Check and trigger a flavor event (called every step)
function checkFlavorEvent() {
    // Don't trigger while any overlay is active
    const overlayIds = ['dm-overlay', 'check-overlay', 'outcome-overlay', 'combat-overlay', 'portal-overlay', 'encounter-overlay', 'exit-risk-overlay', 'death-overlay', 'camp-overlay', 'camp-result-overlay', 'lowhp-overlay'];
    for (const id of overlayIds) {
        if (document.getElementById(id)?.classList.contains('active')) return;
    }
    S._flavorSteps++;
    // Trigger every 3-4 steps (random threshold)
    const threshold = 3 + Math.floor(Math.random() * 2); // 3 or 4
    if (S._flavorSteps < threshold) return;
    S._flavorSteps = 0;

    const pool = FLAVOR_TEXTS[S.biome] || FLAVOR_TEXTS.forest;
    const text = pool[Math.floor(Math.random() * pool.length)];
    showTerrainToast(text, 'flavor');
}

// ═══════════════════════════════════════════════════════
// OVERLAY SAFETY — clear dynamic children before activation
// ═══════════════════════════════════════════════════════
// Overlay→children mapping: which containers to clear before showing
const _OVERLAY_CHILDREN = {
    'dm-overlay':        ['dm-choices', 'dm-narration'],
    'encounter-overlay': ['enc-choices', 'enc-narration'],
    'exit-risk-overlay': ['exit-options', 'exit-hp-row', 'exit-info-row'],
    'camp-overlay':      ['camp-food-list'],
};

/**
 * Activate an overlay and automatically clear its dynamic children.
 * Prevents stale content from the previous event flashing on screen.
 * @param {string} overlayId - The overlay element ID
 * @returns {HTMLElement} The overlay element (for further setup)
 */
function activateOverlay(overlayId) {
    const children = _OVERLAY_CHILDREN[overlayId];
    if (children) {
        for (const childId of children) {
            const el = document.getElementById(childId);
            if (el) el.innerHTML = '';
        }
    }
    const overlay = document.getElementById(overlayId);
    overlay.classList.add('active');
    return overlay;
}

// ═══════════════════════════════════════════════════════
// HEX UTILITIES (shared with other modules)
// ═══════════════════════════════════════════════════════
function getNeighbors(col, row) {
    const offsets = row % 2 === 0 ? EVEN_OFFSETS : ODD_OFFSETS;
    return offsets
        .map(([dc, dr]) => [col + dc, row + dr])
        .filter(([c, r]) => c >= 0 && c < COLS && r >= 0 && r < ROWS);
}

function isAdjacent(c1, r1, c2, r2) {
    return getNeighbors(c1, r1).some(([c, r]) => c === c2 && r === r2);
}

function hexDist(c1, r1, c2, r2) {
    function toCube(col, row) {
        const x = col - (row - (row & 1)) / 2;
        const z = row;
        const y = -x - z;
        return [x, y, z];
    }
    const [x1, y1, z1] = toCube(c1, r1);
    const [x2, y2, z2] = toCube(c2, r2);
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2), Math.abs(z1 - z2));
}

// ═══════════════════════════════════════════════════════
// HP HELPERS
// ═══════════════════════════════════════════════════════
function getCurrentHP() { return S.charData ? S.charData.hp + S.hpChange : 0; }
function getMaxHP() { return S.charData ? S.charData.mh : 1; }
function getHPPercent() { return (getCurrentHP() / getMaxHP()) * 100; }

// Roll a dice formula string like "2d4+2" → number
function rollDiceFormula(formula) {
    if (typeof formula === 'number') return formula;
    if (!formula || formula === '0') return 0;
    const match = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) return parseInt(formula, 10) || 0;
    const [, count, sides, bonus] = match;
    let total = 0;
    for (let i = 0; i < parseInt(count); i++) {
        total += Math.floor(Math.random() * parseInt(sides)) + 1;
    }
    return total + (parseInt(bonus) || 0);
}

// BFS distance from (fromCol, fromRow) to exit hex, respecting IMPASSABLE
function bfsDistanceToExit(fromCol, fromRow) {
    const target = `${S.exitCol},${S.exitRow}`;
    const start = `${fromCol},${fromRow}`;
    if (start === target) return 0;

    const visited = new Set([start]);
    const queue = [[fromCol, fromRow, 0]];
    while (queue.length > 0) {
        const [col, row, dist] = queue.shift();
        const neighbors = getNeighbors(col, row);
        for (const [nc, nr] of neighbors) {
            const key = `${nc},${nr}`;
            if (visited.has(key)) continue;
            visited.add(key);
            const tile = S.grid[nr] && S.grid[nr][nc] ? S.grid[nr][nc] : '.';
            if (IMPASSABLE.has(tile)) continue;
            if (key === target) return dist + 1;
            queue.push([nc, nr, dist + 1]);
        }
    }
    return -1; // Unreachable
}

// Calculate exit risk based on BFS distance + danger level
function calculateExitRisk(distance) {
    if (distance <= 0) return { chance: 5, label: 'Seguro', color: '#4a8' };
    const chance = Math.min(80, 15 + distance * 6 + S.dangerLevel * 4);
    if (chance <= 25) return { chance, label: 'Baixo', color: '#4a8' };
    if (chance <= 50) return { chance, label: 'Moderado', color: '#dca028' };
    if (chance <= 65) return { chance, label: 'Alto', color: '#c44' };
    return { chance, label: 'Perigoso', color: '#a22' };
}

// POI discovery flash — canvas-based golden pulse
let _hexFlashes = [];
function flashHex(col, row) {
    _hexFlashes.push({ col, row, start: performance.now(), duration: 700 });
    scheduleRender();
}

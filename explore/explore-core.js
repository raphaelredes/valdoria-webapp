// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════
const COLS = 11, ROWS = 13;
const IMPASSABLE = new Set(['W','M','L','#']);

// Hex neighbors (odd-r offset)
const EVEN_OFFSETS = [[-1,-1],[0,-1],[-1,0],[1,0],[-1,1],[0,1]];
const ODD_OFFSETS  = [[0,-1],[1,-1],[-1,0],[1,0],[0,1],[1,1]];

// Full Portuguese names for dice animation display
const STAT_NAMES = {
    str:'Força',dex:'Destreza',con:'Constituição',int:'Inteligência',wis:'Sabedoria',cha:'Carisma',
    atl:'Atletismo',acr:'Acrobacia',slh:'Prestidigitação',stl:'Furtividade',
    arc:'Arcanismo',his:'História',inv:'Investigação',nat:'Natureza',rel:'Religião',
    anh:'Lid. Animais',ins:'Intuição',med:'Medicina',
    per:'Percepção',sur:'Sobrevivência',dec:'Enganação',
    itm:'Intimidação',prf:'Atuação',prs:'Persuasão',
};
// Compact 3-letter codes for button badges
const STAT_SHORT = {
    str:'FOR',dex:'DES',con:'CON',int:'INT',wis:'SAB',cha:'CAR',
    atl:'ATL',acr:'ACR',slh:'PRE',stl:'FUR',arc:'ARC',his:'HIS',
    inv:'INV',nat:'NAT',rel:'REL',anh:'ANI',ins:'ITU',med:'MED',
    per:'PER',sur:'SOB',dec:'ENG',itm:'ITM',prf:'ATU',prs:'PRS',
};

const POI_TYPE_LABELS = {dis:'Descoberta',sea:'Busca',dan:'Perigo',mys:'Mistério',npc:'Encontro'};

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
            ts: Date.now(),
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch(e) { console.warn('[EXPLORE] saveState:', e); }
}

function restoreState() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const snap = JSON.parse(raw);
        if (snap.tk !== S.token) return false;
        if (Date.now() - snap.ts > 600000) {
            sessionStorage.removeItem(STORAGE_KEY);
            return false;
        }
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
        return true;
    } catch(e) {
        console.warn('[EXPLORE] restoreState:', e);
        return false;
    }
}

function loadMapData(data) {
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
    S.visibility = data.v || 3;
    S.dmIntro = data.i || '';
    S.charData = data.c || null;
    S.dangerLevel = data.dl || 1;
    S.randomEncounters = (data.re || []).map(re => ({
        type: re.y, icon: re.ic || '⚠️', title: re.tt || 'Evento',
        narration: re.n || '', choices: re.ch || [],
    }));

    // Parse POIs
    S.pois = (data.p || []).map(p => ({
        id: p.i, col: p.q, row: p.r,
        type: p.y, icon: p.ic, title: p.tt,
        narration: p.n, choices: p.ch || [],
        combat: p.cb || null,
    }));

    // Try to restore saved session
    const restored = restoreState();

    // Setup HUD
    setupHUD();

    if (restored) {
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

    // Initialize canvas renderer
    initRenderer();

    // Initialize player position
    initPlayerPosition(S.playerCol, S.playerRow);

    // Initialize bottom bar
    initBottomBar();

    // Location info
    const biomeNames = {
        forest:'Floresta',plains:'Campos',swamp:'Pântano',cave:'Caverna',
        desert:'Deserto',mountain:'Montanha',snow:'Ermo Gelado',
        volcanic:'Vulcão',graveyard:'Cemitério'
    };
    document.getElementById('location-info').textContent = biomeNames[S.biome] || S.biome;

    // Initialize ambient particles
    if (typeof initBiomeParticles === 'function') initBiomeParticles(S.biome);

    // Scroll to player
    setTimeout(() => scrollCanvasToPlayer(), 100);

    // Hide loading
    document.getElementById('loading').classList.add('hidden');

    // Show DM intro only on fresh start
    if (S.dmIntro && !restored) {
        setTimeout(() => showDMIntro(S.dmIntro), 400);
    }
}

// ═══════════════════════════════════════════════════════
// HUD
// ═══════════════════════════════════════════════════════
function setupHUD() {
    const c = S.charData;
    if (!c) return;
    document.getElementById('hud-name').textContent = (c.ci||'⚔️') + ' ' + (c.nm||'Herói');
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
    xpBadge.textContent = '✨ ' + S.xpEarned;
    goldBadge.textContent = '💰 ' + S.goldEarned;
    // Spring bounce animation
    [xpBadge, goldBadge].forEach(b => {
        b.classList.remove('pop');
        void b.offsetHeight;
        b.classList.add('pop');
    });
    setTimeout(() => { xpBadge.classList.remove('pop'); goldBadge.classList.remove('pop'); }, 450);
    updateStepCounter();
}

function updateStepCounter() {
    const el = document.getElementById('step-counter');
    if (el) el.textContent = '⬡ ' + S.visited.size;
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
// HEX UTILITIES (shared with other modules)
// ═══════════════════════════════════════════════════════
function getNeighbors(col, row) {
    const offsets = row % 2 === 0 ? EVEN_OFFSETS : ODD_OFFSETS;
    return offsets
        .map(([dc,dr]) => [col+dc, row+dr])
        .filter(([c,r]) => c >= 0 && c < COLS && r >= 0 && r < ROWS);
}

function isAdjacent(c1, r1, c2, r2) {
    return getNeighbors(c1, r1).some(([c,r]) => c === c2 && r === r2);
}

function hexDist(c1, r1, c2, r2) {
    function toCube(col, row) {
        const x = col - (row - (row & 1)) / 2;
        const z = row;
        const y = -x - z;
        return [x, y, z];
    }
    const [x1,y1,z1] = toCube(c1,r1);
    const [x2,y2,z2] = toCube(c2,r2);
    return Math.max(Math.abs(x1-x2), Math.abs(y1-y2), Math.abs(z1-z2));
}

// Stub for explore-events.js compatibility (it calls getHexEl for POI flash)
function getHexEl() { return null; }

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════
const COLS = 11, ROWS = 13;
const IMPASSABLE = new Set(['W','M','L','#']);

// Hex neighbors (odd-r offset)
const EVEN_OFFSETS = [[-1,-1],[0,-1],[-1,0],[1,0],[-1,1],[0,1]];
const ODD_OFFSETS  = [[0,-1],[1,-1],[-1,0],[1,0],[0,1],[1,1]];

// Biome emoji mapping
const BIOME_EMOJI = {
    forest:   {'.':'🟫','T':'🌲','g':'🌿','w':'💧','r':'🪨','R':'🏛️','p':'🟫','#':'🌲','W':'🌊','M':'⛰️','b':'💀','s':'🟫','m':'🟤','i':'🧊','v':'🟧','L':'🔥'},
    plains:   {'.':'🟫','T':'🌳','g':'🌾','w':'💧','r':'🪨','R':'🏚️','p':'🟫','#':'🪨','W':'🌊','M':'⛰️','b':'💀','s':'🟫','m':'🟤','i':'🧊','v':'🟧','L':'🔥'},
    swamp:    {'.':'🟫','T':'🌴','g':'🌿','w':'💧','r':'🪨','R':'🏛️','p':'🟫','#':'🌴','W':'🌊','M':'⛰️','b':'💀','s':'🟫','m':'🟤','i':'🧊','v':'🟧','L':'🔥'},
    cave:     {'.':'⬛','T':'🪨','g':'⬛','w':'💧','r':'🪨','R':'🏛️','p':'⬛','#':'🧱','W':'🌊','M':'🧱','b':'💀','s':'⬛','m':'⬛','i':'🧊','v':'🟧','L':'🔥'},
    desert:   {'.':'🟨','T':'🌵','g':'🟨','w':'💧','r':'🪨','R':'🏛️','p':'🟨','#':'🪨','W':'🌊','M':'⛰️','b':'💀','s':'🏜️','m':'🟤','i':'🧊','v':'🟧','L':'🔥'},
    mountain: {'.':'🟫','T':'🌲','g':'🌿','w':'💧','r':'🪨','R':'🏛️','p':'🟫','#':'⛰️','W':'🌊','M':'🏔️','b':'💀','s':'🟫','m':'🟤','i':'🧊','v':'🟧','L':'🔥'},
    snow:     {'.':'⬜','T':'🌲','g':'⬜','w':'💧','r':'🪨','R':'🏛️','p':'⬜','#':'🧊','W':'🌊','M':'🏔️','b':'💀','s':'⬜','m':'🟤','i':'🧊','v':'🟧','L':'🔥'},
    volcanic: {'.':'🟫','T':'🪨','g':'🟫','w':'💧','r':'🪨','R':'🏛️','p':'🟫','#':'🪨','W':'🌊','M':'⛰️','b':'💀','s':'🟫','m':'🟤','i':'🧊','v':'🟧','L':'🔥'},
    graveyard:{'.':'🟫','T':'🌲','g':'🌿','w':'💧','r':'🪨','R':'🏛️','p':'🟫','#':'🪨','W':'🌊','M':'⛰️','b':'⚰️','s':'🟫','m':'🟤','i':'🧊','v':'🟧','L':'🔥'},
};

const BIOME_COLORS = {
    forest:   {'.':'#5a3d2b','T':'#1a4a1a','g':'#2d5a2d','w':'#2a5a8a','r':'#5a5a5a','R':'#6a5a4a','p':'#6a5040','#':'#0d2e0d','W':'#1a3a6a','M':'#4a4a4a'},
    plains:   {'.':'#5a4a30','T':'#3a6a2a','g':'#6a8a3a','w':'#2a5a8a','r':'#6a6a5a','R':'#5a4a3a','p':'#6a5a40','#':'#5a5a4a','W':'#1a3a6a','M':'#4a4a4a'},
    swamp:    {'.':'#3a3a2a','T':'#2a4a2a','g':'#3a5a2a','w':'#2a4a5a','r':'#4a4a3a','R':'#5a4a3a','p':'#4a3a2a','#':'#1a3a1a','W':'#1a3a4a','M':'#3a3a3a','m':'#3a2a1a'},
    cave:     {'.':'#1a1a2a','T':'#2a2a2a','g':'#1a1a1a','w':'#1a2a4a','r':'#3a3a3a','R':'#4a3a2a','p':'#2a2a2a','#':'#0a0a0a','W':'#0a1a3a','M':'#1a1a1a'},
    desert:   {'.':'#8a7a4a','T':'#4a6a2a','g':'#8a7a50','w':'#2a5a8a','r':'#7a6a5a','R':'#6a5a4a','p':'#8a7a50','#':'#6a5a4a','W':'#1a3a6a','M':'#5a4a3a','s':'#9a8a5a'},
    mountain: {'.':'#5a4a3a','T':'#2a4a2a','g':'#3a5a3a','w':'#2a5a8a','r':'#6a6a6a','R':'#5a4a3a','p':'#5a4a3a','#':'#3a3a3a','W':'#1a3a6a','M':'#4a4a5a'},
    snow:     {'.':'#c0c8d0','T':'#2a5a3a','g':'#b0b8c0','w':'#3a6a9a','r':'#7a7a8a','R':'#6a6a7a','p':'#b0b0b8','#':'#8a8a9a','W':'#2a4a7a','M':'#6a6a7a','i':'#9ab0c0'},
    volcanic: {'.':'#3a2a1a','T':'#2a2a2a','g':'#3a2a1a','w':'#2a3a5a','r':'#4a3a2a','R':'#5a3a2a','p':'#3a2a1a','#':'#2a1a0a','W':'#1a2a4a','M':'#3a2a1a','v':'#6a3a1a','L':'#8a2a0a'},
    graveyard:{'.':'#3a3a3a','T':'#1a3a1a','g':'#2a3a2a','w':'#2a3a5a','r':'#4a4a4a','R':'#4a3a3a','p':'#3a3a3a','#':'#2a2a2a','W':'#1a2a4a','M':'#3a3a3a','b':'#4a3a3a'},
};

const STAT_NAMES = {str:'FOR',dex:'DES',con:'CON',int:'INT',wis:'SAB',cha:'CAR',
    strength:'FOR',dexterity:'DES',constitution:'CON',intelligence:'INT',wisdom:'SAB',charisma:'CAR'};

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

    // Render map
    renderMap();

    if (restored) {
        // Re-apply fog for all visited positions
        for (const key of S.visited) {
            const [c, r] = key.split(',').map(Number);
            revealFog(c, r);
        }
        // Re-render player at restored position
        const playerHex = getHexEl(S.playerCol, S.playerRow);
        if (playerHex) {
            playerHex.classList.add('player');
            playerHex.textContent = S.charData ? (S.charData.ci || '⚔️') : '⚔️';
        }
        // Mark resolved POIs
        for (const pid of S.poisResolved) {
            const poi = S.pois.find(p => p.id === pid);
            if (poi) {
                const poiHex = getHexEl(poi.col, poi.row);
                if (poiHex) {
                    poiHex.classList.remove('poi');
                    poiHex.classList.add('poi-resolved');
                    const emojiMap = BIOME_EMOJI[S.biome] || BIOME_EMOJI.forest;
                    poiHex.textContent = emojiMap['.'] || '·';
                }
            }
        }
        updateRewards();
    } else {
        // Fresh start
        S.visited.add(`${S.playerCol},${S.playerRow}`);
        revealFog(S.playerCol, S.playerRow);
    }

    highlightAdjacent();

    // Position floating player token
    positionPlayerToken();

    // Scroll to player
    scrollToPlayer();

    // Hide loading
    document.getElementById('loading').classList.add('hidden');

    // Location info
    const biomeNames = {
        forest:'Floresta',plains:'Campos',swamp:'Pântano',cave:'Caverna',
        desert:'Deserto',mountain:'Montanha',snow:'Ermo Gelado',
        volcanic:'Vulcão',graveyard:'Cemitério'
    };
    document.getElementById('location-info').textContent = biomeNames[S.biome] || S.biome;

    // Initialize bottom bar (step counter + danger pips)
    initBottomBar();

    // Biome ambient particles
    if (typeof initBiomeParticles === 'function') initBiomeParticles(S.biome);

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
// MAP RENDERING
// ═══════════════════════════════════════════════════════
function renderMap() {
    const container = document.getElementById('map-container');
    container.innerHTML = '';
    const emojiMap = BIOME_EMOJI[S.biome] || BIOME_EMOJI.forest;
    const colorMap = BIOME_COLORS[S.biome] || BIOME_COLORS.forest;

    for (let r = 0; r < ROWS; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'hex-row' + (r % 2 === 1 ? ' odd' : '');

        for (let c = 0; c < COLS; c++) {
            const tile = S.grid[r][c];
            const hex = document.createElement('div');
            hex.className = 'hex fog-hidden';
            hex.dataset.col = c;
            hex.dataset.row = r;

            // Background color
            const baseTile = tile.match(/[0-9]/) ? '.' : tile === '@' ? '.' : tile === 'E' ? '.' : tile;
            hex.style.backgroundColor = colorMap[baseTile] || colorMap['.'] || '#2b2830';

            // Emoji content
            if (c === S.playerCol && r === S.playerRow) {
                hex.textContent = S.charData ? (S.charData.ci || '⚔️') : '⚔️';
                hex.classList.add('player');
            } else {
                const poi = S.pois.find(p => p.col === c && p.row === r);
                if (poi) {
                    hex.textContent = poi.icon || '❓';
                    hex.classList.add('poi');
                    hex.dataset.poiId = poi.id;
                } else if (tile === 'E') {
                    hex.textContent = '🚪';
                    hex.classList.add('exit-tile');
                } else {
                    hex.textContent = emojiMap[baseTile] || emojiMap['.'] || '·';
                }
            }

            // Impassable
            if (IMPASSABLE.has(tile)) {
                hex.classList.add('blocked');
            }

            // Click handler
            hex.addEventListener('click', () => handleHexClick(c, r));

            rowDiv.appendChild(hex);
        }
        container.appendChild(rowDiv);
    }
}

// ═══════════════════════════════════════════════════════
// FOG OF WAR
// ═══════════════════════════════════════════════════════
function revealFog(cx, cy, animate) {
    const radius = S.visibility;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const dist = hexDist(c, r, cx, cy);
            const key = `${c},${r}`;
            if (dist <= radius) {
                S.fogState[key] = 'visible';
            } else if (dist <= radius + 1 && S.fogState[key] !== 'visible') {
                S.fogState[key] = 'dim';
            }
        }
    }
    applyFog(animate);
}

function applyFog(animate) {
    document.querySelectorAll('.hex').forEach(hex => {
        const c = parseInt(hex.dataset.col);
        const r = parseInt(hex.dataset.row);
        const key = `${c},${r}`;
        const state = S.fogState[key] || 'hidden';
        const wasHidden = hex.classList.contains('fog-hidden') || hex.classList.contains('fog-dim');
        hex.classList.remove('fog-hidden', 'fog-dim', 'fog-visible', 'fog-revealing');
        hex.classList.add('fog-' + state);
        if (animate && wasHidden && state === 'visible') {
            hex.classList.add('fog-revealing');
            setTimeout(() => hex.classList.remove('fog-revealing'), 460);
        }
    });
}

function hexDist(c1, r1, c2, r2) {
    // Convert odd-r to cube
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

// ═══════════════════════════════════════════════════════
// MOVEMENT
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

function highlightAdjacent() {
    document.querySelectorAll('.hex.adjacent').forEach(h => h.classList.remove('adjacent'));
    getNeighbors(S.playerCol, S.playerRow).forEach(([c,r]) => {
        const tile = S.grid[r][c];
        if (!IMPASSABLE.has(tile)) {
            const hex = getHexEl(c, r);
            if (hex && S.fogState[`${c},${r}`] !== 'hidden') {
                hex.classList.add('adjacent');
            }
        }
    });
}

function handleHexClick(col, row) {
    if (!isAdjacent(S.playerCol, S.playerRow, col, row)) return;
    const tile = S.grid[row][col];
    if (IMPASSABLE.has(tile)) return;

    movePlayer(col, row);
}

let _moveAnimating = false;

function movePlayer(col, row) {
    if (_moveAnimating) return;
    _moveAnimating = true;

    // Remove player from old hex
    const oldHex = getHexEl(S.playerCol, S.playerRow);
    if (oldHex) {
        oldHex.classList.remove('player');
        const oldTile = S.grid[S.playerRow][S.playerCol];
        const emojiMap = BIOME_EMOJI[S.biome] || BIOME_EMOJI.forest;
        const baseTile = oldTile === '@' ? '.' : oldTile === 'E' ? '.' : oldTile.match(/[0-9]/) ? '.' : oldTile;
        const oldPoi = S.pois.find(p => p.col === S.playerCol && p.row === S.playerRow);
        if (oldPoi && S.poisResolved.has(oldPoi.id)) {
            oldHex.textContent = emojiMap[baseTile] || '·';
            oldHex.classList.remove('poi');
            oldHex.classList.add('poi-resolved');
        } else if (oldPoi) {
            oldHex.textContent = oldPoi.icon || '❓';
        } else if (oldTile === 'E') {
            oldHex.textContent = '🚪';
        } else {
            oldHex.textContent = emojiMap[baseTile] || '·';
        }
    }

    // Animate token to new position
    const token = document.getElementById('player-token');
    const newHex = getHexEl(col, row);
    if (token && newHex) {
        token.style.left = (newHex.offsetLeft + newHex.offsetWidth / 2 - 18) + 'px';
        token.style.top = (newHex.offsetTop + newHex.offsetHeight / 2 - 18) + 'px';
    }

    // Update state
    S.playerCol = col;
    S.playerRow = row;
    S.visited.add(`${col},${row}`);

    // Mark new hex
    if (newHex) {
        newHex.classList.add('player');
    }

    // Spawn directional dust + arrival ripple
    spawnDust(newHex, oldHex);
    spawnArrivalRipple(newHex);

    // After animation settles, reveal fog and check events
    setTimeout(() => {
        _moveAnimating = false;
        revealFog(col, row, true);
        highlightAdjacent();
        scrollToPlayer();
        updateStepCounter();
        saveState();

        // Check POI first
        const poi = S.pois.find(p => p.col === col && p.row === row && !S.poisResolved.has(p.id));
        if (poi) {
            setTimeout(() => showPOI(poi), 100);
            return;
        }

        // Check exit — show portal overlay
        if (col === S.exitCol && row === S.exitRow) {
            setTimeout(() => showPortalOverlay(), 200);
            return;
        }

        // Random encounter check (on normal tiles only)
        const encChance = 0.08 + (S.dangerLevel * 0.03);
        if (Math.random() < encChance && S.randomEncounters.length > 0) {
            const enc = S.randomEncounters.shift();
            setTimeout(() => showRandomEncounter(enc), 300);
        }
    }, 260);
}

function spawnDust(hex, fromHex) {
    if (!hex) return;
    const container = document.getElementById('map-container');
    const cx = hex.offsetLeft + hex.offsetWidth / 2;
    const cy = hex.offsetTop + hex.offsetHeight / 2;
    const colors = ['rgba(196,149,58,0.6)', 'rgba(224,214,200,0.4)'];
    let dx = 0, dy = 1;
    if (fromHex) {
        dx = fromHex.offsetLeft - hex.offsetLeft;
        dy = fromHex.offsetTop - hex.offsetTop;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        dx /= len; dy /= len;
    }
    for (let i = 0; i < 6; i++) {
        const p = document.createElement('div');
        p.className = 'dust-particle';
        const size = 2 + Math.random() * 4;
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.5;
        const dist = 8 + Math.random() * 16;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = (cx - size / 2) + 'px';
        p.style.top = (cy - size / 2) + 'px';
        p.style.background = colors[i % 2];
        p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
        p.style.animationDelay = (i * 30) + 'ms';
        container.appendChild(p);
        setTimeout(() => p.remove(), 700);
    }
}

function spawnArrivalRipple(hex) {
    if (!hex) return;
    const container = document.getElementById('map-container');
    const ripple = document.createElement('div');
    ripple.className = 'arrival-ripple';
    ripple.style.left = (hex.offsetLeft - 4) + 'px';
    ripple.style.top = (hex.offsetTop - 4) + 'px';
    ripple.style.width = (hex.offsetWidth + 8) + 'px';
    ripple.style.height = (hex.offsetHeight + 8) + 'px';
    container.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

function positionPlayerToken() {
    const token = document.getElementById('player-token');
    const hex = getHexEl(S.playerCol, S.playerRow);
    if (token && hex) {
        token.textContent = S.charData ? (S.charData.ci || '⚔️') : '⚔️';
        token.style.transition = 'none';
        token.style.left = (hex.offsetLeft + hex.offsetWidth / 2 - 18) + 'px';
        token.style.top = (hex.offsetTop + hex.offsetHeight / 2 - 18) + 'px';
        token.style.display = 'flex';
        // Re-enable transition after positioning
        requestAnimationFrame(() => {
            token.style.transition = 'left 0.28s cubic-bezier(0.34,1.4,0.64,1), top 0.28s cubic-bezier(0.34,1.4,0.64,1)';
        });
    }
}

function getHexEl(col, row) {
    return document.querySelector(`.hex[data-col="${col}"][data-row="${row}"]`);
}

function scrollToPlayer() {
    const hex = getHexEl(S.playerCol, S.playerRow);
    if (hex) {
        hex.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
}

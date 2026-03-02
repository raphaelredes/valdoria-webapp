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
    conditions: [],          // Active conditions: [{type, stepsLeft}]
    _hazardsTriggered: new Set(),  // Hexes that already triggered hazards
    _flavorSteps: 0,         // Steps since last flavor event
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
        S.conditions = snap.cd || [];
        S._hazardsTriggered = new Set(snap.hz || []);
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

    // Parse POIs (with Passive Perception filter for hidden POIs)
    const allPois = (data.p || []).map(p => ({
        id: p.i, col: p.q, row: p.r,
        type: p.y, icon: p.ic, title: p.tt,
        narration: p.n, choices: p.ch || [],
        combat: p.cb || null,
        hidden: !!p.h, hiddenDC: p.hd || 0,
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

    // Passive Perception notification (after DM intro dismisses)
    if (S._hiddenDetected > 0 && !restored) {
        const delay = S.dmIntro ? 2000 : 600;
        setTimeout(() => {
            if (typeof showTerrainToast === 'function') {
                showTerrainToast(`👁️ Percepção Passiva (${S._passivePerception})`, 'ranger');
            }
        }, delay);
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
// TERRAIN & CONDITIONS (D&D 5e)
// ═══════════════════════════════════════════════════════

// Difficult terrain: mud always, sand in desert, ice always
function isDifficultTerrain(tile, biome) {
    if (tile === 'm' || tile === 'i') return true;
    if (tile === 's' && biome === 'desert') return true;
    return false;
}

// Ranger (Patrulheiro) ignores difficult terrain — Natural Explorer
function isRanger() {
    return S.charData && S.charData.ci === '🏹';
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
    return 10 + wisMod + profBonus;
}

// Tick conditions down after each step
function tickConditions() {
    S.conditions = S.conditions.filter(c => {
        c.stepsLeft--;
        return c.stepsLeft > 0;
    });
    updateConditionHUD();
}

// Update condition icons in HUD
function updateConditionHUD() {
    const bar = document.getElementById('condition-bar');
    if (!bar) return;
    bar.innerHTML = '';
    if (!S.conditions.length) {
        bar.style.display = 'none';
        return;
    }
    bar.style.display = 'flex';
    const icons = { poisoned: '☠️', prone: '🧊', frightened: '😨', exhaustion: '😩' };
    const labels = { poisoned: 'Envenenado', prone: 'Caído', frightened: 'Amedrontado', exhaustion: 'Exaustão' };
    for (const c of S.conditions) {
        const tag = document.createElement('span');
        tag.className = 'condition-tag';
        tag.textContent = `${icons[c.type] || '⚠️'} ${labels[c.type] || c.type} (${c.stepsLeft})`;
        bar.appendChild(tag);
    }
}

// ═══════════════════════════════════════════════════════
// FLAVOR EVENTS (biome-specific ambient mini-events)
// ═══════════════════════════════════════════════════════
const FLAVOR_TEXTS = {
    forest: [
        '🐦 Pássaros cantam nas copas distantes.',
        '🍃 Uma brisa agita as folhas ao seu redor.',
        '🌿 Raízes retorcidas formam padrões curiosos no chão.',
        '🍄 Cogumelos brilhantes crescem na base de um tronco.',
        '🦌 Algo se move entre as árvores — e desaparece.',
        '🕸️ Uma teia de aranha reluz com gotas de orvalho.',
        '🌲 O aroma de pinheiro e terra úmida envolve o ar.',
        '🐿️ Um esquilo observa você de um galho alto.',
    ],
    plains: [
        '🌾 O vento faz ondas suaves no capim alto.',
        '🦅 Uma ave de rapina circula lentamente no céu.',
        '🌻 Flores silvestres colorem o campo ao longe.',
        '💨 Uma rajada de vento traz o cheiro de terra seca.',
        '🦗 O canto dos grilos ecoa ritmicamente.',
        '☁️ Nuvens projetam sombras que cruzam o campo.',
        '🐾 Rastros de animais marcam o solo batido.',
        '🌅 A luz dourada ilumina a paisagem aberta.',
    ],
    swamp: [
        '🫧 Bolhas sobem lentamente da água turva.',
        '🐸 Um coaxar grave ecoa entre os troncos retorcidos.',
        '🦟 Nuvens de insetos pairam sobre a água parada.',
        '💀 Um cheiro pútrido sobe da lama escura.',
        '🌫️ Névoa densa se agarra ao solo encharcado.',
        '🐊 Algo se move sob a superfície da água.',
        '🪵 Troncos apodrecidos formam pontes naturais instáveis.',
        '🕯️ Luzes pálidas piscam ao longe — fogos-fátuos.',
    ],
    cave: [
        '💧 Gotas de água ecoam nas paredes distantes.',
        '🦇 Asas agitam-se na escuridão acima.',
        '💎 Cristais refletem a luz fracamente nas paredes.',
        '🕳️ Uma corrente de ar frio vem de um túnel lateral.',
        '🪨 Estalagmites projetam sombras alongadas.',
        '🕷️ Teias abandonadas pendem do teto rochoso.',
        '🔊 Seus passos ecoam várias vezes antes de silenciar.',
        '⛏️ Marcas de picareta antigas cobrem a parede.',
    ],
    desert: [
        '🏜️ O calor distorce o horizonte em miragens.',
        '🦂 Um escorpião desliza rapidamente entre as pedras.',
        '💨 Uma rajada de areia agita-se em espiral.',
        '☀️ O sol implacável castiga a areia sem fim.',
        '🦎 Um lagarto observa imóvel sobre uma rocha quente.',
        '🏺 Restos de cerâmica antiga emergem da areia.',
        '🌵 Um cacto solitário projeta uma sombra minúscula.',
        '💀 Ossos esbranquiçados pontilham a paisagem árida.',
    ],
    mountain: [
        '🏔️ O vento uiva entre as rochas expostas.',
        '🦅 Uma águia plana majestosamente nas correntes de ar.',
        '⛰️ Pedras soltas rolam pelo declive abaixo.',
        '❄️ A temperatura cai visivelmente a cada passo.',
        '🐐 Uma cabra montanhesa observa de um penhasco.',
        '🪨 Formações rochosas formam arcos naturais.',
        '☁️ Nuvens baixas envolvem os picos ao redor.',
        '💎 Veios minerais brilham na rocha cortada.',
    ],
    snow: [
        '❄️ Flocos de neve dançam silenciosamente ao seu redor.',
        '🐾 Pegadas no gelo se perdem na nevasca.',
        '🌬️ O vento gélido corta como uma lâmina.',
        '🏔️ Estalactites de gelo pendem das rochas acima.',
        '🐺 Um uivo distante ecoa pelo ermo gelado.',
        '❄️ O gelo sob seus pés range a cada passo.',
        '🌀 Uma nevasca se forma no horizonte distante.',
        '🦌 Rastros de um animal grande cruzam a neve fresca.',
    ],
    volcanic: [
        '🔥 O ar quente tremula sobre fissuras incandescentes.',
        '🌋 Um tremor sutil faz o chão vibrar.',
        '💨 Jatos de vapor escapam de fendas na rocha.',
        '🪨 Rocha derretida brilha em veios alaranjados.',
        '☠️ O cheiro de enxofre arde nas narinas.',
        '🔥 Cinzas flutuam no ar como neve negra.',
        '🌡️ O calor intenso faz a pele arder.',
        '💎 Obsidiana negra reluz entre as rochas vulcânicas.',
    ],
    graveyard: [
        '🪦 Lápides tortas emergem da névoa rasteira.',
        '🦉 Uma coruja pia sombriamente ao longe.',
        '💀 O vento agita galhos secos como dedos esqueléticos.',
        '🕯️ Uma vela bruxuleante arde sobre um túmulo antigo.',
        '🌫️ Névoa fria se agarra às suas botas.',
        '🦇 Morcegos irrompem de uma cripta entreaberta.',
        '⚰️ Uma lápide rachada revela inscrições ilegíveis.',
        '👻 Você sente um arrepio inexplicável na nuca.',
    ],
};

// Check and trigger a flavor event (called every step)
function checkFlavorEvent() {
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

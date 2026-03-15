/* ═══════════════════════════════════════════════════════════
   INVENTORY WEBAPP — Lendas de Valdoria v2
   ═══════════════════════════════════════════════════════════ */

const tg = window.Telegram?.WebApp;
const _vBg = getComputedStyle(document.documentElement)
    .getPropertyValue('--v-bg').trim() || '#2a2420';
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor(_vBg); tg.setBackgroundColor(_vBg); }

// ── Shared Error Reporter (lite tier — no API) ──
if (window.ValdoriaErrors) { ValdoriaErrors.init({ appName: 'INVENTORY' }); }

// ── State ──
let D = null;           // Decoded payload
let activeTab = 'items';
let activeFilter = 'all';
let searchQuery = '';
let sortMode = 'default'; // default, name, rarity, value
let pendingOps = [];    // Batch operations to send
let localEq = {};       // Local copy of equipment (player)
let localInv = [];      // Local copy of inventory [{n,q,id}]
let localAllyEq = {};   // npc_id → {slot: item}
let localGems = {};     // slot → [gem|null, ...]
let localRunes = {};    // slot → rune_name|null
let localGold = 0;
let localHP = 0;
let localMP = 0;
let localPotions = 0;       // Basic potion counter
let localFavs = [];         // Local favorites list
let localAC = 0;            // Dynamic AC (recalculated on equip/unequip)
let activeTarget = 'player'; // 'player' or npc_id
let selectionMode = false;
let selectedItems = new Set(); // item names selected for batch ops
let viewMode = localStorage.getItem('valdoria_inv_view') || 'compact'; // 'compact' or 'detailed'
let viewedItems = null; // Set of item names the player has viewed (detail modal)

// ── SVG Icon System (medieval line art) ──
const _IC = {
    // Equipment slots
    helm: '<path d="M6 19h12M7 19v-3c0-5 2-9 5-11 3 2 5 6 5 11v3"/><path d="M7 12h10"/>',
    chest: '<path d="M8 4h8l2 6v10H6V10z"/><path d="M6 10h12"/><line x1="12" y1="10" x2="12" y2="20"/>',
    pauldron: '<path d="M4 14c0-5 3-9 8-10 5 1 8 5 8 10"/><path d="M7 10c0-3 2-5 5-6 3 1 5 3 5 6"/>',
    sword: '<line x1="5" y1="19" x2="19" y2="5"/><line x1="14" y1="5" x2="19" y2="10"/><line x1="5" y1="15" x2="9" y2="19"/><circle cx="7" cy="17" r="1"/>',
    shield: '<path d="M12 3L4 7v5c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V7z"/>',
    gauntlet: '<path d="M8 20V10l-2-3v-2h2l1 2h6l1-2h2v2l-2 3v10z"/><path d="M8 14h8"/>',
    greaves: '<path d="M8 4v14l-1 3h3l1-3h2l1 3h3l-1-3V4z"/><path d="M8 10h8"/>',
    boot: '<path d="M8 4v12l-2 2v2h12v-2l-2-4V4z"/><path d="M6 18h12"/>',
    cloak: '<path d="M9 4c-4 3-5 8-5 12h4c0-2 1-3 4-3s4 1 4 3h4c0-4-1-9-5-12"/><path d="M10 4h4"/>',
    belt: '<rect x="4" y="10" width="16" height="4" rx="1"/><rect x="10" y="9" width="4" height="6" rx="1"/>',
    ring: '<circle cx="12" cy="13" r="5"/><circle cx="12" cy="8" r="2"/>',
    pendant: '<path d="M8 4h8"/><path d="M10 4v4l2 3 2-3V4"/><circle cx="12" cy="15" r="3"/>',
    scroll: '<path d="M7 5c-1 0-2 1-2 2v10c0 1 1 2 2 2"/><path d="M17 5c1 0 2 1 2 2v10c0 1-1 2-2 2"/><rect x="7" y="5" width="10" height="14" rx="1"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="13" y2="15"/>',
    // Tabs
    bag: '<path d="M6 9h12v11H6z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/><line x1="10" y1="13" x2="14" y2="13"/>',
    armorTab: '<path d="M8 4h8l1 4h-10zM7 8v12h10V8"/><path d="M7 12h10"/><circle cx="12" cy="16" r="1.5"/>',
    people: '<circle cx="8" cy="8" r="3"/><path d="M3 19c0-3 2-5 5-5s5 2 5 5"/><circle cx="16" cy="8" r="3"/><path d="M13 19c0-3 2-5 5-5"/>',
    vault: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M6 8V6a6 6 0 0 1 12 0v2"/><circle cx="12" cy="15" r="2"/><line x1="12" y1="17" x2="12" y2="19"/>',
    // Stats
    heart: '<path d="M12 21C8 17 3 13.5 3 9a4.5 4.5 0 0 1 9 0 4.5 4.5 0 0 1 9 0c0 4.5-5 8-9 12z"/>',
    orb: '<circle cx="12" cy="12" r="7"/><path d="M12 5c-2 2-3 4-3 7s1 5 3 7"/><path d="M12 5c2 2 3 4 3 7s-1 5-3 7"/><path d="M5 12h14"/>',
    coin: '<circle cx="12" cy="12" r="7"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor" stroke="none">G</text>',
    flask: '<path d="M10 3h4v4l3 8v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-3l3-8z"/><line x1="9" y1="3" x2="15" y2="3"/><path d="M8 15h8"/>',
    // Filters/Actions
    star: '<path d="M12 3l2.5 5.5L20 9.5l-4 4 1 5.5L12 16.5 7 19l1-5.5-4-4 5.5-1z"/>',
    star_f: '<path d="M12 3l2.5 5.5L20 9.5l-4 4 1 5.5L12 16.5 7 19l1-5.5-4-4 5.5-1z"/>',
    gem: '<path d="M5 9l7-5 7 5-7 11z"/><path d="M5 9h14"/><line x1="12" y1="4" x2="12" y2="20"/>',
    check: '<polyline points="4 12 9 17 20 6"/>',
    check_f: '<path d="M4 12l5 5L20 6"/>',
    sparkle: '<path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><path d="M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    lock: '<rect x="6" y="11" width="12" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.5"/>',
    trash: '<path d="M4 7h16"/><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"/><path d="M9 4h6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    save: '<path d="M7 3h10l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><rect x="8" y="13" width="8" height="6"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="17" x2="13" y2="17"/>',
    warn: '<path d="M12 3L2 20h20z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>',
    listIcon: '<rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/>',
    abc: '<text x="4" y="16" font-size="11" font-weight="bold" fill="currentColor" stroke="none">Az</text>',
    hammer: '<path d="M6 6h6v4H6z"/><line x1="9" y1="10" x2="9" y2="20"/><path d="M7 10h4"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
    person: '<circle cx="12" cy="7" r="4"/><path d="M5 21c0-4 3-7 7-7s7 3 7 7"/>',
    backpack: '<rect x="6" y="8" width="12" height="13" rx="2"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/><path d="M6 13h12"/><rect x="9" y="15" width="6" height="3" rx="1"/>',
    quill: '<path d="M18 3c-3 1-6 5-8 10l-2 6 6-2c5-2 9-5 10-8"/><path d="M8 13l3 3"/>',
    food: '<circle cx="10" cy="10" r="5"/><path d="M14 14l6 6"/><line x1="14" y1="7" x2="17" y2="7"/>',
    stealth: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/><line x1="4" y1="20" x2="20" y2="4" stroke-width="2"/>',
    tent: '<path d="M3 20L12 4l9 16z"/><line x1="12" y1="4" x2="12" y2="20"/><path d="M8 20c0-2 2-4 4-4s4 2 4 4"/>',
    // Body silhouette (gender-neutral) for equipment view
    gridView: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    listView: '<rect x="3" y="4" width="18" height="3" rx="1"/><rect x="3" y="10.5" width="18" height="3" rx="1"/><rect x="3" y="17" width="18" height="3" rx="1"/>',
    // Body silhouette (gender-neutral) for equipment view
    body_silhouette: '<path d="M12 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" fill="rgba(255,255,255,0.06)" stroke-width="0.8"/>' +
        '<path d="M8 9h8c1 0 2 1 2.5 3l1 4h-3l-.5-3H16v9h-3v-5h-2v5H8v-9h0l-.5 3H4.5l1-4C6 10 7 9 8 9z" fill="rgba(255,255,255,0.06)" stroke-width="0.8"/>',
};
function vi(name, sz) {
    const p = _IC[name]; if (!p) return '';
    const s = sz || 24;
    return `<svg class="vi" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}
function vi_f(name, sz) {
    const p = _IC[name + '_f'] || _IC[name]; if (!p) return '';
    const s = sz || 24;
    return `<svg class="vi" width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}
const SLOT_ICONS = {
    head: 'helm', chest: 'chest', shoulders: 'pauldron',
    main_hand: 'sword', off_hand: 'shield', hands: 'gauntlet',
    legs: 'greaves', feet: 'boot', cloak: 'cloak', belt: 'belt',
    ring_1: 'ring', ring_2: 'ring', necklace: 'pendant',
    amulet: 'pendant', map: 'scroll',
};

const SLOT_NAMES = {
    head: 'Cabeça', chest: 'Tronco', shoulders: 'Ombros',
    main_hand: 'M.Principal', off_hand: 'M.Secundária',
    hands: 'Mãos', legs: 'Pernas', feet: 'Botas',
    cloak: 'Capa', belt: 'Cinto',
    ring_1: 'Anel 1', ring_2: 'Anel 2',
    necklace: 'Pescoço', map: 'Mapa',
};
const SLOT_ORDER = [
    'head', 'necklace', 'shoulders', 'cloak',
    'chest', 'main_hand', 'off_hand', 'belt',
    'hands', 'ring_1', 'legs', 'ring_2',
    'feet', 'map',
];
const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, very_rare: 3, legendary: 4 };
const RARITY_FALLBACK = {
    common: { l: 'Comum', c: '#9e9e9e' },
    uncommon: { l: 'Incomum', c: '#4caf50' },
    rare: { l: 'Raro', c: '#2196f3' },
    very_rare: { l: 'Muito Raro', c: '#9c27b0' },
    legendary: { l: 'Lendário', c: '#ff9800' },
};
const RUNE_ELIGIBLE = new Set([
    'main_hand', 'off_hand', 'chest', 'head', 'hands', 'feet', 'legs', 'cloak', 'necklace'
]);
const TAG_LABELS = {
    weapon: 'Arma', simple_weapon: 'Arma Simples', martial_weapon: 'Arma Marcial',
    armor: 'Armadura', shield: 'Escudo', clothing: 'Vestimenta',
    light_armor: 'Armadura Leve', medium_armor: 'Armadura Média', heavy_armor: 'Armadura Pesada',
    consumable: 'Consumível', potion: 'Poção', food: 'Alimento',
    gem: 'Gema', socketable: 'Encaixável', rune: 'Runa',
    tool: 'Ferramenta', camping: 'Acampamento',
    junk: 'Sucata', bone: 'Osso', monster_part: 'Despojo', trophy: 'Troféu',
    valuable: 'Tesouro', material: 'Material', metal: 'Metal', leather: 'Couro',
    alchemy: 'Alquimia', accessory: 'Acessório',
    quest: 'Missão', mission_item: 'Item de Missão', key: 'Chave',
    map: 'Mapa', map_fragment: 'Fragmento de Mapa',
    no_sell: 'Invendável', no_discard: 'Indescartável',
    story_item: 'Item de História', unique: 'Único',
    two_handed: 'Duas Mãos', versatile: 'Versátil', finesse: 'Acuidade',
    ranged: 'À Distância', thrown: 'Arremesso', ammunition: 'Munição',
    melee: 'Corpo a Corpo', reach: 'Alcance', loading: 'Recarga',
    light: 'Leve', heavy: 'Pesada',
};
const SORT_LABELS = {
    default: `${vi('listIcon', 13)} Padrão`, name: `${vi('abc', 13)} Nome`,
    rarity: `${vi('sparkle', 13)} Raridade`, value: `${vi('coin', 13)} Valor`,
};
const SORT_CYCLE = ['default', 'name', 'rarity', 'value'];

// ── Rarity config (from payload or fallback) ──
function getRarityConfig() { return D?.ref?.rar || RARITY_FALLBACK; }
function getRarityLabel(r) { return (getRarityConfig()[r] || RARITY_FALLBACK.common).l; }
function getRarityColor(r) { return (getRarityConfig()[r] || RARITY_FALLBACK.common).c; }

// ── UTF-8 Base64 Decode ──
function decodeBase64Utf8(b64) {
    const raw = b64.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
}

// ── Init ──
function init() {
    // Ambient music
    if (typeof ValdoriaAudio !== 'undefined') ValdoriaAudio.play('city');

    const params = new URLSearchParams(location.search);
    const b64 = params.get('data');
    if (!b64) { hideLoading(); _showInitError('Dados não encontrados.'); return; }
    try {
        D = JSON.parse(decodeBase64Utf8(b64));
    } catch (e) { console.error('[INVENTORY] Erro ao decodificar dados', e); hideLoading(); _showInitError('Erro ao decodificar dados.'); return; }

    // Init local state from payload
    localEq = Object.assign({}, D.eq || {});
    localInv = (D.inv || []).map(i => ({ ...i }));
    localGold = D.p.g || 0;
    localHP = D.p.hp || 0;
    localMP = D.p.mp || 0;
    localPotions = D.p.pot || 0;
    localFavs = D.fav ? [...D.fav] : [];
    localGems = {};
    if (D.gems) {
        for (const [k, v] of Object.entries(D.gems))
            localGems[k] = [...v];
    }
    localRunes = D.runes ? { ...D.runes } : {};
    localAllyEq = {};
    if (D.allies) {
        for (const a of D.allies)
            localAllyEq[a.id] = Object.assign({}, a.eq || {});
    }

    // Dynamic body padding based on bottom panel height
    const panel = document.getElementById('bottomPanel');
    document.body.style.paddingBottom = (panel ? panel.offsetHeight + 12 : 80) + 'px';

    hideLoading();
    _initViewedItems();
    updateHeader();
    buildTabs();
    renderTab();
    initSwipeToDismiss();
    initBackButton();
    _initNavBar();
}

function hideLoading() {
    if (window._invLoadingCtrl) {
        window._invLoadingCtrl.hide();
    } else {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
}

function _showInitError(msg) {
    console.error('[INVENTORY]', msg);
    document.getElementById('mainContent').innerHTML =
        `<div class="empty-state"><div class="icon">${vi('warn', 32)}</div><p>${msg}</p></div>`;
}

// ── Haptic feedback ──
function haptic(type) {
    if (window.vHaptic) vHaptic.impact(type || 'light');
}
function hapticNotify(type) {
    if (window.vHaptic) vHaptic.notify(type || 'error');
}

// ── Header ──
let _acDirty = true, _acCached = 0;
function calcLocalAC() {
    if (!_acDirty) return _acCached;
    // Base AC from server (includes DEX, class features, unarmored defense)
    // We adjust by calculating the delta between original equipment bonuses and current
    let origEqAC = 0;
    for (const item of Object.values(D.eq || {})) {
        if (!item) continue;
        const it = getItemData(item);
        origEqAC += it.ac || 0;
        // Original gem bonuses
        const origGems = (D.gems || {})[getSlotForItem(item, D.eq)] || [];
        origGems.forEach(g => { if (g) { const gd = getItemData(g); origEqAC += gd.gb?.ac_bonus || 0; } });
    }
    let newEqAC = 0;
    for (const [slot, item] of Object.entries(localEq)) {
        if (!item) continue;
        const it = getItemData(item);
        newEqAC += it.ac || 0;
        const gems = localGems[slot] || [];
        gems.forEach(g => { if (g) { const gd = getItemData(g); newEqAC += gd.gb?.ac_bonus || 0; } });
    }
    localAC = D.p.ac + (newEqAC - origEqAC);
    _acCached = localAC;
    _acDirty = false;
    return localAC;
}

function getSlotForItem(itemName, eq) {
    for (const [slot, name] of Object.entries(eq || {})) { if (name === itemName) return slot; }
    return '';
}

function updateHeader() {
    calcLocalAC();
    const s = document.getElementById('headerStats');
    const potStr = localPotions > 0 ? `<span class="hs-hp">${vi('flask', 12)} ${localPotions}</span>` : '';
    let buffsStr = '';
    if (D.buffs && D.buffs.length > 0) {
        buffsStr = D.buffs.map(b =>
            `<span style="font-size:10px;opacity:0.8;">${b.i}${b.c}</span>`
        ).join('');
    }
    const combatBadge = _combatMode ? '<span style="font-size:10px;color:#e44;font-weight:700">⚔️ COMBATE</span>' : '';
    s.innerHTML = `
            <span>${D.p.n}</span>
            ${combatBadge}
            <span class="hs-hp">${vi('heart', 12)} ${localHP}/${D.p.mhp}</span>
            <span class="hs-mp">${vi('orb', 12)} ${localMP}/${D.p.mmp}</span>
            <span class="hs-gold">${vi('coin', 12)} ${localGold}</span>
            <span class="hs-ac">${vi('shield', 12)} ${localAC}</span>
            ${potStr}${buffsStr}
        `;
}

function animateStat(cls) {
    const el = document.querySelector(`.${cls}`);
    if (el) {
        el.classList.remove('stat-pop');
        void el.offsetWidth; el.classList.add('stat-pop');
    }
}

// ── Tabs ──
function buildTabs() {
    const bar = document.getElementById('tabsBar');
    const tabs = [
        { id: 'items', label: `${vi('bag', 15)} Itens` },
        { id: 'equip', label: `${vi('armorTab', 15)} Equipamento` },
    ];
    if (D.allies && D.allies.length > 0) tabs.push({ id: 'allies', label: `${vi('people', 15)} Aliados` });
    if (D.bank) tabs.push({ id: 'bank', label: `${vi('vault', 15)} Cofre` });
    bar.innerHTML = tabs.map(t =>
        `<div class="tab ${t.id === activeTab ? 'active' : ''}" onclick="switchTab('${t.id}')">${t.label}</div>`
    ).join('');
}

function switchTab(id) {
    activeTab = id;
    activeTarget = 'player';
    if (selectionMode) { selectionMode = false; selectedItems.clear(); updateSelectionBar(); }
    buildTabs();
    renderTab();
    haptic('light');
}

function renderTab() {
    const c = document.getElementById('mainContent');
    c.classList.remove('tab-entering');
    void c.offsetWidth;
    c.classList.add('tab-entering');
    if (activeTab === 'items') renderItemsTab(c);
    else if (activeTab === 'equip') renderEquipTab(c);
    else if (activeTab === 'allies') renderAlliesTab(c);
    else if (activeTab === 'bank') renderBankTab(c);
}

// ── Local inventory management ──
function addToLocalInv(name) {
    const existing = localInv.find(i => i.n === name);
    if (existing) { existing.q++; }
    else { localInv.push({ n: name, q: 1, id: 'new' }); }
}

function removeFromLocalInv(name) {
    const existing = localInv.find(i => i.n === name);
    if (existing) {
        existing.q--;
        if (existing.q <= 0) {
            localInv = localInv.filter(i => i.n !== name);
        }
    } else {
        console.warn('[INVENTORY] removeFromLocalInv: not found:', name);
    }
}

// ── Operations ──
function addOp(op) {
    pendingOps.push(op);
    updateBottomBar();
}

function updateBottomBar() {
    const count = document.getElementById('opsCount');
    const btn = document.getElementById('confirmBtn');
    const section = document.getElementById('opsSection');
    if (pendingOps.length > 0) {
        count.innerHTML = `${vi('quill', 13)} ${pendingOps.length} alteração(ões) · <span style="color:var(--v-text-dim);cursor:pointer;text-decoration:underline;" onclick="resetAllOps()">descartar</span>`;
        btn.classList.remove('hidden');
        if (section) section.classList.remove('hidden');
    } else {
        count.textContent = '';
        btn.classList.add('hidden');
        if (section) section.classList.add('hidden');
    }
}

function resetAllOps() {
    pendingOps = [];
    localEq = Object.assign({}, D.eq || {});
    localInv = (D.inv || []).map(i => ({ ...i }));
    localGold = D.p.g || 0;
    localHP = D.p.hp || 0;
    localMP = D.p.mp || 0;
    localPotions = D.p.pot || 0;
    localFavs = D.fav ? [...D.fav] : [];
    localGems = {};
    if (D.gems) {
        for (const [k, v] of Object.entries(D.gems))
            localGems[k] = [...v];
    }
    localRunes = D.runes ? { ...D.runes } : {};
    localAllyEq = {};
    if (D.allies) {
        for (const a of D.allies)
            localAllyEq[a.id] = Object.assign({}, a.eq || {});
    }
    closeModal();
    updateHeader();
    renderTab();
    updateBottomBar();
    haptic('light');
    toast(`${vi('sparkle', 13)} Alterações descartadas`, 'warn');
}

// ── Modal ──
let _modalOpen = false;
function showModal(html) {
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modalOverlay').classList.add('visible');
    if (!_modalOpen) {
        _modalOpen = true;
    }
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('visible');
    if (_modalOpen) {
        _modalOpen = false;
    }
}

function closeModalOutside(e) {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
}

// ── Swipe to dismiss ──
function initSwipeToDismiss() {
    const modal = document.getElementById('modalContent');
    let startY = 0, currentY = 0, isDragging = false;

    modal.addEventListener('touchstart', e => {
        const handle = modal.querySelector('.modal-handle');
        if (!handle) return;
        // Only activate if touching near the top (handle area)
        const rect = modal.getBoundingClientRect();
        const touchY = e.touches[0].clientY - rect.top;
        if (touchY > 40) return;
        startY = e.touches[0].clientY;
        isDragging = true;
        modal.style.transition = 'none';
    }, { passive: true });

    modal.addEventListener('touchmove', e => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        if (diff > 0) {
            modal.style.transform = `translateY(${diff}px)`;
        }
    }, { passive: true });

    modal.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        modal.style.transition = 'transform 0.3s ease-out';
        const diff = currentY - startY;
        if (diff > 100) {
            closeModal();
        }
        modal.style.transform = '';
    }, { passive: true });
}



function discardAndExit() {
    pendingOps = [];
    closeModal();
    _performExit();
}

function initBackButton() {
    try {
        if (tg?.BackButton) {
            tg.BackButton.show();
            // [EXIT-CONFIRM] Inventory overrides BackButton because _navigateBack()
            // has conditional logic (close modals, save pending ops, then exit).
            // exit-confirm.js popup is triggered via __valdoriaExitAction instead.
            tg.BackButton.onClick(() => { _navigateBack(); });
        }
        // [EXIT-CONFIRM] Custom exit: calls _performExit() directly (skip modal checks,
        // popup already confirmed the exit intent)
        window.__valdoriaExitAction = function() { _performExit(); };
    } catch(e) { console.warn('[INVENTORY] BackButton setup:', e); }
}

// ── Nav Bar Actions ──
const _RETURN_LABELS = {
    game: '🏘️ Cidade',
    explore: '🗺️ Mapa',
    combat: '⚔️ Combate',
    arena: '⚔️ Combate',
};

function _initNavBar() {
    // Nav bar removed — BackButton handled by initBackButton()
}

function navBack() {
    haptic('light');
    _navigateBack();
}

function navCharSheet() {
    haptic('light');
    // Auto-save pending ops before navigating
    if (pendingOps.length > 0) {
        sendOps();
        return;
    }
    if (_apiBase && _apiToken) {
        _transitionTo('game', { action: 'action_status' });
    } else {
        // Fallback: send data to bot and close
        const tg = window.Telegram?.WebApp;
        if (tg?.sendData) {
            try { tg.sendData(JSON.stringify({ action: 'action_status' })); } catch (e) { console.warn('[INVENTORY] sendData:', e); }
        }
        try { if (tg) tg.close(); } catch (e) { console.warn('[INVENTORY] close:', e); }
    }
}

function navMenu() {
    haptic('light');
    // Auto-save pending ops before closing
    if (pendingOps.length > 0) {
        sendOps();
        return;
    }
    // Close webapp to return to Telegram chat (main menu)
    try { if (tg) tg.close(); } catch (e) { console.warn('[INVENTORY] tg.close:', e); }
}

async function _transitionTo(target, payload = {}) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        const _lt = overlay.querySelector('.loading-text'); if (_lt) _lt.textContent = 'Navegando...';
        overlay.classList.remove('hidden');
    }
    if (_apiBase) {
        try {
            const _th = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + _apiToken,
            };
            if (window.Telegram?.WebApp?.initData) { _th['X-Telegram-Init-Data'] = Telegram.WebApp.initData; }
            _th['X-Idempotency-Key'] = crypto.randomUUID();
            const resp = await fetchT(_apiBase + '/api/webapp/transition', {
                method: 'POST',
                headers: _th,
                body: JSON.stringify({
                    from: 'inventory', to: target,
                    user_id: parseInt(_apiUid),
                    payload,
                }),
            });
            if (resp.status === 401 || resp.status === 403) {
                console.error('[INVENTORY] Auth error on transition:', resp.status);
                const tg = window.Telegram?.WebApp;
                if (tg?.sendData) { tg.sendData(JSON.stringify({ action: 'webapp_error_close', webapp: 'INVENTORY', reason: 'session_expired' })); setTimeout(function () { if (tg.close) tg.close(); }, 1000); return; }
            }
            if (resp.ok) {
                const data = await resp.json();
                if (data.url) {
                    window.__valdoria_transitioning = true;
                    window.location.replace(data.url);
                    return;
                }
            }
            console.error('[INVENTORY] Nav transition failed');
        } catch (e) {
            console.error('[INVENTORY] Nav transition error:', e);
        }
    }
    // Fallback: close
    if (overlay) overlay.classList.add('hidden');
    try { if (tg) tg.close(); } catch (e) { console.warn('[INVENTORY] close:', e); }
}

// ── Toast ──
function toast(msg, type) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    if (type === 'err') hapticNotify('error');
    else if (type === 'warn') hapticNotify('warning');
    const el = document.createElement('div');
    el.className = `toast toast-${type || 'ok'}`;
    el.innerHTML = msg;
    // Dynamic position above bottom bar (Fix 12)
    const panel = document.getElementById('bottomPanel');
    const panelH = panel ? panel.offsetHeight : 80;
    el.style.bottom = (panelH + 12) + 'px';
    document.body.appendChild(el);
    // Calculate reading time from text content
    var clean = (msg || '').replace(/<[^>]*>/g, '');
    var cat = (type === 'err' || type === 'warn') ? 'toast-warn' : 'toast';
    var dur = (typeof calcReadTime === 'function')
        ? calcReadTime(clean, cat)
        : Math.max(1500, Math.min(4000, clean.split(/\s+/).length * 250));
    // Fade-out before removal
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.25s ease';
        setTimeout(() => el.remove(), 250);
    }, dur);
}

// ── Escape for onclick attributes & HTML context ──
function esc(s) {
    return (s || '').replace(/\\/g, '\\\\').replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ── New Item Tracking (blue dot) ──
function _initViewedItems() {
    try {
        const stored = localStorage.getItem('valdoria_inv_viewed');
        if (stored) {
            viewedItems = new Set(JSON.parse(stored));
        } else {
            // First visit: mark all current items as viewed (avoid flood of dots)
            viewedItems = new Set(localInv.map(i => i.n));
            _saveViewedItems();
        }
    } catch(e) {
        viewedItems = new Set(localInv.map(i => i.n));
    }
}

function _saveViewedItems() {
    try {
        localStorage.setItem('valdoria_inv_viewed', JSON.stringify([...viewedItems]));
    } catch(e) {}
}

function isNewItem(name) {
    if (!viewedItems) return false;
    return !viewedItems.has(name);
}

function markItemViewed(name) {
    if (!viewedItems) return;
    if (!viewedItems.has(name)) {
        viewedItems.add(name);
        _saveViewedItems();
    }
}

// ── View Mode Toggle ──
function toggleViewMode() {
    viewMode = viewMode === 'compact' ? 'detailed' : 'compact';
    try { localStorage.setItem('valdoria_inv_view', viewMode); } catch(e) {}
    haptic('light');
    renderTab();
}

// ── Start ──
init();

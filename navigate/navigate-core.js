// ═══════════════════════════════════════════════════════
// NAVIGATE CORE — Init, state, Telegram integration
// ═══════════════════════════════════════════════════════

let tg = null;
let _navSent = false;  // Double-fire guard (matches explore _finishSent pattern)
const STORAGE_KEY = 'valdoria_navigate_state';

// Global state
let S = {
    token: '',
    currentLoc: 'city_gates',
    knownLocs: [],
    discoveredLocs: [],  // locations actually visited (for fog state)
    locations: {},       // loc_id → {n, b, i, d, s, c, ds}
    charData: null,      // {nm, lv, hp, mh, mp, mm, ci}
    quests: [],          // [{id, t, loc?}]
    dungeons: {},        // loc_id → [{n, done}]
    canCamp: false,
    hasMap: 0,           // 0=no map, 1=regional/fragment, 2=full map
    selectedLoc: null,   // currently tapped location ID
    // Pan/zoom state
    panX: 0, panY: 0,
    zoom: 1.0,
};

// ── Connection graph (built from location data) ──
let connectionGraph = {};  // loc_id → [connected_loc_ids]

// ═══════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════

async function initAsync() {
    try {
        tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();
            try { tg.disableVerticalSwipes(); } catch(e) { console.warn('[NAVIGATE] disableVerticalSwipes:', e); }
        }

        // Parse URL params
        const params = new URLSearchParams(window.location.search);
        S.token = params.get('token') || '';
        const dataB64 = params.get('data') || '';

        if (!dataB64) {
            showError('Dados do mapa nao encontrados');
            return;
        }

        // Decompress payload (zlib + base64)
        const data = await decompressPayload(dataB64);
        if (!data) {
            showError('Falha ao carregar dados');
            return;
        }

        // Load state
        S.currentLoc = data.cl || 'city_gates';
        S.locations = data.lo || {};
        S.knownLocs = data.kl || Object.keys(S.locations);
        S.discoveredLocs = data.dl || [];
        S.charData = data.c || {};
        S.quests = data.q || [];
        S.dungeons = data.dd || {};
        S.canCamp = !!data.cc;
        S.hasMap = data.hm || 0;

        // Build connection graph from location data
        buildConnectionGraph();

        // Restore viewport state if token matches
        restoreViewport();

        // Update HUD
        updateHUD();

        // Update current location badge
        updateLocationBadge();

        // Update bottom bar
        updateBottomBar();

        // Render the map
        renderMap();

        // Center on current location
        centerOnLocation(S.currentLoc);

        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
        }, 300);

    } catch(e) {
        showError('Erro ao inicializar', e);
    }
}

// ═══════════════════════════════════════════════════════
// PAYLOAD DECOMPRESSION
// ═══════════════════════════════════════════════════════

async function decompressPayload(b64) {
    try {
        // URL-safe base64 → standard
        const std = b64.replace(/-/g, '+').replace(/_/g, '/');
        const binary = atob(std);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        // 'deflate' mode handles zlib-wrapped data (header+payload+checksum) directly
        const inflated = await zlibInflate(bytes);
        return JSON.parse(new TextDecoder().decode(inflated));
    } catch(e) {
        console.error('[NAVIGATE] Decompress failed:', e);
        return null;
    }
}

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
    const totalLen = chunks.reduce((s, c) => s + c.length, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
    }
    return merged;
}

// ═══════════════════════════════════════════════════════
// CONNECTION GRAPH
// ═══════════════════════════════════════════════════════

function buildConnectionGraph() {
    connectionGraph = {};
    const knownSet = new Set(S.knownLocs);

    // Initialize all known locations
    for (const locId of S.knownLocs) {
        connectionGraph[locId] = [];
    }

    // Build from static CONNECTION_EDGES (map-layout.js), filtered to known locations.
    // This is more reliable than payload data which may be trimmed for size.
    for (const [aId, bId] of CONNECTION_EDGES) {
        if (knownSet.has(aId) && knownSet.has(bId)) {
            if (connectionGraph[aId] && !connectionGraph[aId].includes(bId)) {
                connectionGraph[aId].push(bId);
            }
            if (connectionGraph[bId] && !connectionGraph[bId].includes(aId)) {
                connectionGraph[bId].push(aId);
            }
        }
    }
}

function isConnected(fromId, toId) {
    const conns = connectionGraph[fromId] || [];
    return conns.includes(toId);
}

// ═══════════════════════════════════════════════════════
// VIEWPORT PERSISTENCE
// ═══════════════════════════════════════════════════════

function saveViewport() {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
            tk: S.token,
            px: S.panX, py: S.panY,
            zm: S.zoom,
            ts: Date.now(),
        }));
    } catch(e) { console.warn('[NAVIGATE] saveViewport:', e); }
}

function restoreViewport() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const snap = JSON.parse(raw);
        if (snap.tk !== S.token || Date.now() - snap.ts > 600000) return;
        S.panX = snap.px || 0;
        S.panY = snap.py || 0;
        S.zoom = snap.zm || 1.0;
    } catch(e) { console.warn('[NAVIGATE] restoreViewport:', e); }
}

// ═══════════════════════════════════════════════════════
// HUD UPDATE
// ═══════════════════════════════════════════════════════

function updateHUD() {
    const c = S.charData;
    if (!c) return;

    document.getElementById('hud-name').textContent = `${c.ci || ''} ${c.nm || 'Heroi'}`;
    document.getElementById('hud-level').textContent = `Nv.${c.lv || 1}`;

    const hpPct = c.mh > 0 ? Math.min(100, (c.hp / c.mh) * 100) : 0;
    document.getElementById('hud-hp').style.width = `${hpPct}%`;

    const mpPct = c.mm > 0 ? Math.min(100, (c.mp / c.mm) * 100) : 0;
    document.getElementById('hud-mp').style.width = `${mpPct}%`;
}

function updateLocationBadge() {
    const loc = S.locations[S.currentLoc];
    if (!loc) return;

    document.getElementById('badge-icon').textContent = loc.i || '📍';
    document.getElementById('badge-name').textContent = loc.n || 'Desconhecido';

    const known = S.knownLocs.length;
    const total = Object.keys(LOCATION_COORDS).length;
    document.getElementById('badge-info').textContent = `🗺️ ${known}/${total}`;
}

function updateBottomBar() {
    const returnBtn = document.getElementById('btn-return');
    // Hide return button if already at city gates
    if (S.currentLoc === 'city_gates') {
        returnBtn.style.display = 'none';
    }
}

// ═══════════════════════════════════════════════════════
// ACTIONS (send to bot)
// ═══════════════════════════════════════════════════════

function finishNavigation(type, target) {
    if (_navSent) return;
    _navSent = true;

    // Disable all action buttons immediately
    document.querySelectorAll('.info-btn').forEach(btn => {
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.5';
    });

    const payload = {
        action: 'navigate_action',
        token: S.token,
        type: type,
    };
    if (target) payload.target = target;
    // Signal no-map travel for risky navigation
    if (type === 'travel' && S.hasMap === 0) {
        payload.noMap = true;
    }

    try { tg?.HapticFeedback?.impactOccurred('medium'); } catch(e) { console.warn('[NAVIGATE] haptic:', e); }

    try {
        if (tg && tg.sendData) {
            tg.sendData(JSON.stringify(payload));
        } else {
            console.log('[NAVIGATE] sendData payload:', JSON.stringify(payload, null, 2));
        }
    } catch(e) {
        console.error('[NAVIGATE] sendData failed:', e);
    }

    // Close after brief delay
    setTimeout(() => {
        try { tg?.close(); } catch(e) {
            console.warn('[NAVIGATE] tg.close fallback failed:', e);
        }
    }, 500);
}

function handleReturn() {
    finishNavigation('return');
}

function handleClose() {
    try { tg?.close(); } catch(e) { console.warn('[NAVIGATE] tg.close:', e); }
}

// ═══════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════

function showError(msg, err = null) {
    console.error('[NAVIGATE]', msg, err || '');
    const toast = document.createElement('div');
    toast.className = 'v-toast-error';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);

    // Hide loading on error
    document.getElementById('loading').classList.add('hidden');
}

// ═══════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', initAsync);

// -----------------------------------------------------------
// NAVIGATE CORE - Init, state, Telegram integration
// -----------------------------------------------------------

let tg = null;
let _navSent = false;  // Double-fire guard (matches explore _finishSent pattern)
const STORAGE_KEY = 'valdoria_navigate_state';

// Global state
let S = {
    token: '',
    api: '',
    uid: 0,
    currentLoc: 'city_gates',
    knownLocs: [],
    discoveredLocs: [],  // locations actually visited (for fog state)
    locations: {},       // loc_id -> {n, b, i, d, s, c, ds}
    charData: null,      // {nm, lv, hp, mh, mp, mm, ci}
    quests: [],          // [{id, t, loc?}]
    dungeons: {},        // loc_id -> [{n, done}]
    canCamp: false,
    hasMap: 0,           // 0=no map, 1=regional/fragment, 2=full map
    mapCoverage: new Set(), // set of loc_ids with map coverage (for fog silhouette)
    selectedLoc: null,   // currently tapped location ID
    // Pan/zoom state
    panX: 0, panY: 0,
    zoom: 1.0,
};

// Connection graph (built from location data)
let connectionGraph = {};  // loc_id -> [connected_loc_ids]

// -----------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------

async function initAsync() {
    try {
        tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();
            try { tg.disableVerticalSwipes(); } catch (e) { console.warn('[NAVIGATE] disableVerticalSwipes:', e); }
            if (tg.BackButton) {
                tg.BackButton.show();
                tg.BackButton.onClick(() => { handleClose(); });
            }
        }

        // Parse URL params
        const params = new URLSearchParams(window.location.search);
        S.token = params.get('token') || '';
        S.api = params.get('api') || '';
        S.uid = parseInt(params.get('uid') || '0');
        S.returnTo = params.get('return') || 'game';

        // Init error reporter
        if (window.ValdoriaErrors) {
            ValdoriaErrors.init({ appName: 'NAVIGATE', apiBase: S.api, token: S.token, uid: S.uid });
        }

        let dataB64 = params.get('data') || '';

        // If URL data param is missing, fetch from API (robust fallback)
        if (!dataB64 && S.api && S.token) {
            console.log('[NAVIGATE] No URL data param, fetching from API...');
            dataB64 = await fetchPayloadFromAPI();
        }

        if (!dataB64) {
            document.getElementById('loading').classList.add('hidden');
            showError('Dados do mapa nao encontrados. Volte ao bot e tente novamente.');
            return;
        }

        // Decompress payload (zlib + base64)
        const data = await decompressPayload(dataB64);
        if (!data) {
            document.getElementById('loading').classList.add('hidden');
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
        S.mapCoverage = new Set(data.mc || []);

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

        // Init minimap
        if (typeof _initMinimap === 'function') _initMinimap();

        // Hide loading screen, then play arrival animation
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
            if (typeof playArrivalAnimation === 'function') playArrivalAnimation();
        }, 300);

    } catch (e) {
        document.getElementById('loading').classList.add('hidden');
        showError('Erro ao inicializar', e);
    }
}

// -----------------------------------------------------------
// API-BASED PAYLOAD FETCH (robust fallback)
// -----------------------------------------------------------

async function fetchPayloadFromAPI(retries = 2) {
    const url = S.api + '/api/navigate/state?token=' + encodeURIComponent(S.token) + '&uid=' + S.uid;
    const headers = {};
    if (window.Telegram?.WebApp?.initData) {
        headers['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            console.log('[NAVIGATE] API fetch attempt', attempt + 1);
            const r = await fetchT(url, { method: 'GET', headers: headers });
            if (!r.ok) {
                console.warn('[NAVIGATE] API state returned', r.status);
                if (attempt < retries) { await _sleep(800 * (attempt + 1)); continue; }
                return '';
            }
            const d = await r.json();
            if (d.data) {
                console.log('[NAVIGATE] Got payload from API (' + d.data.length + ' chars)');
                return d.data;
            }
            console.warn('[NAVIGATE] API returned ok but no data field');
            return '';
        } catch (e) {
            console.error('[NAVIGATE] API fetch error:', e);
            if (attempt < retries) { await _sleep(800 * (attempt + 1)); }
        }
    }
    return '';
}

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// -----------------------------------------------------------
// PAYLOAD DECOMPRESSION
// -----------------------------------------------------------

async function decompressPayload(b64) {
    try {
        // URL-safe base64 -> standard
        const std = b64.replace(/-/g, '+').replace(/_/g, '/');
        const binary = atob(std);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        // 'deflate' mode handles zlib-wrapped data (header+payload+checksum) directly
        const inflated = await zlibInflate(bytes);
        return JSON.parse(new TextDecoder().decode(inflated));
    } catch (e) {
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

// -----------------------------------------------------------
// CONNECTION GRAPH
// -----------------------------------------------------------

function buildConnectionGraph() {
    connectionGraph = {};
    const knownSet = new Set(S.knownLocs);

    // Initialize all known locations
    for (const locId of S.knownLocs) {
        connectionGraph[locId] = [];
    }

    // Build from static CONNECTION_EDGES (map-layout.js), filtered to known locations.
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

// -----------------------------------------------------------
// VIEWPORT PERSISTENCE
// -----------------------------------------------------------

function saveViewport() {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
            tk: S.token,
            px: S.panX, py: S.panY,
            zm: S.zoom,
            ts: Date.now(),
        }));
    } catch (e) { console.warn('[NAVIGATE] saveViewport:', e); }
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
    } catch (e) { console.warn('[NAVIGATE] restoreViewport:', e); }
}

// -----------------------------------------------------------
// HUD UPDATE
// -----------------------------------------------------------

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

    document.getElementById('badge-icon').textContent = loc.i || '';
    document.getElementById('badge-name').textContent = loc.n || 'Desconhecido';

    const known = S.knownLocs.length;
    const total = Object.keys(LOCATION_COORDS).length;
    document.getElementById('badge-info').textContent = `Mapa ${known}/${total}`;
}

function updateBottomBar() {
    const returnBtn = document.getElementById('btn-return');
    // Hide return button if already at city gates
    if (S.currentLoc === 'city_gates') {
        returnBtn.style.display = 'none';
    }
}

// -----------------------------------------------------------
// ACTIONS (send to bot via fetch API)
// -----------------------------------------------------------

function finishNavigation(type, target, flags) {
    console.log('[NAVIGATE][DEBUG] finishNavigation called:', { type, target, flags, _navSent, api: S.api, uid: S.uid });

    if (_navSent) {
        console.warn('[NAVIGATE][DEBUG] BLOCKED: double-fire');
        return;
    }
    _navSent = true;

    // Disable all action buttons immediately
    document.querySelectorAll('.info-btn').forEach(btn => {
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.5';
    });

    // Play travel animation before sending API call
    if (type === 'travel' && target && typeof animateTravel === 'function') {
        closeInfoPanel();
        animateTravel(S.currentLoc, target, () => _sendNavAction(type, target, flags));
        return;
    }
    _sendNavAction(type, target, flags);
}

function _sendNavAction(type, target, flags) {

    const payload = {
        action: 'navigate_action',
        token: S.token,
        uid: S.uid,
        type: type,
    };
    if (target) payload.target = target;
    // Map and visit flags for travel risk calculation
    if (flags?.noMap || (type === 'travel' && S.hasMap === 0)) payload.noMap = true;
    if (flags?.firstVisit) payload.firstVisit = true;

    // Differentiated haptic: warn for risky travel, heavy for safe travel, medium for other
    if (typeof _haptic === 'function') {
        if (flags?.noMap || flags?.firstVisit) _haptic('warn');
        else if (type === 'travel') _haptic('travel');
        else _haptic('open');
    }

    if (!S.api) {
        showError('Erro: API nao configurada. Feche e reabra o mapa.');
        console.error('[NAVIGATE] No api URL param - cannot send action. Redeploy needed.');
        setTimeout(() => { _navSent = false; }, 2000);
        // Re-enable buttons
        document.querySelectorAll('.info-btn').forEach(btn => {
            btn.style.pointerEvents = '';
            btn.style.opacity = '';
        });
        return;
    }

    const apiUrl = `${S.api}/api/navigate/action`;
    console.log('[NAVIGATE][DEBUG] fetch POST to', apiUrl, payload);

    // Show sending indicator
    const btn = document.getElementById('btn-travel') || document.querySelector('.info-btn.primary');
    if (btn) btn.textContent = 'Enviando...';

    const _nh = { 'Content-Type': 'application/json' };
    if (window.Telegram?.WebApp?.initData) { _nh['X-Telegram-Init-Data'] = Telegram.WebApp.initData; }
    fetchT(apiUrl, {
        method: 'POST',
        headers: _nh,
        body: JSON.stringify(payload),
    })
        .then(r => {
            console.log('[NAVIGATE][DEBUG] fetch status:', r.status);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(d => {
            console.log('[NAVIGATE][DEBUG] fetch ok:', d);
            // Travel: backend returns explore URL -> redirect to explore
            if (d.url && type === 'travel') {
                console.log('[NAVIGATE][DEBUG] travel -> explore:', d.url);
                window.location.replace(d.url);
                return;
            }
            // Other actions (camp, return, explore): go to Game Hub
            _transitionToGame();
        })
        .catch(e => {
            console.error('[NAVIGATE][DEBUG] fetch error:', e);
            showError('Erro ao viajar: ' + e.message + '. Tente novamente.');
            // Re-enable after error so user can retry
            _navSent = false;
            document.querySelectorAll('.info-btn').forEach(btn => {
                btn.style.pointerEvents = '';
                btn.style.opacity = '';
            });
            if (btn) btn.textContent = type === 'travel' ? 'Viajar' : type;
        });
}

function handleReturn() {
    finishNavigation('return');
}

function handleClose() {
    _transitionToGame();
}

async function _transitionToGame() {
    if (!S.api || !S.token) { try { tg?.close(); } catch (e) { } return; }
    const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + S.token };
    if (window.Telegram?.WebApp?.initData) h['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
    h['X-Idempotency-Key'] = crypto.randomUUID();
    try {
        const r = await fetchT(S.api + '/api/webapp/transition', {
            method: 'POST', headers: h,
            body: JSON.stringify({ from: 'navigate', to: (S.returnTo || 'game'), user_id: S.uid, payload: {} })
        });
        const d = await r.json();
        if (d.url) { window.location.replace(d.url); return; }
    } catch (e) { console.error('[NAVIGATE] transition error:', e); }
    // Fallback: redirect to game hub directly
    const base = window.location.href.replace(/\/navigate\/.*/, '');
    window.location.replace(`${base}/game/?token=${S.token}&api=${encodeURIComponent(S.api)}&uid=${S.uid}&return=game&v=1`);
}

// -----------------------------------------------------------
// ERROR HANDLING
// -----------------------------------------------------------

// showError provided by shared/error-reporter.js

// -----------------------------------------------------------
// BOOT
// -----------------------------------------------------------

document.addEventListener('DOMContentLoaded', initAsync);

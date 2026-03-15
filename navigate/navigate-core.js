// -----------------------------------------------------------
// NAVIGATE CORE - Init, state, Telegram integration
// -----------------------------------------------------------

let tg = null;
let _navSent = false;  // Double-fire guard (matches explore _finishSent pattern)
let _navSentTimer = null;  // Auto-reset timer for _navSent (prevents stale lock)
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
                tg.BackButton.onClick(() => {
                    if (window.ValdoriaExitConfirm) ValdoriaExitConfirm.show();
                    else handleClose();
                });
                window.__valdoriaExitAction = function() { handleClose(); };
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

        // Periodic tunnel URL discovery
        if (S.api && window.ApiDiscovery) {
            ApiDiscovery.init(S.api, function(newUrl) { S.api = newUrl; });
        }

        // Start heartbeat for device displacement detection
        if (S.api && S.token && S.uid && window.SessionHeartbeat) {
            SessionHeartbeat.init({ apiBase: S.api, token: S.token, uid: S.uid });
        }

        let dataB64 = params.get('data') || '';

        // If URL data param is missing, fetch from API (robust fallback)
        if (!dataB64 && S.api && S.token) {
            console.debug('[NAVIGATE] No URL data param, fetching from API...');
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

        // Progressive map render with loading progress + stage text
        const progressFill = document.getElementById('loading-progress-fill');
        const stageEl = document.getElementById('loading-stage');
        const tipEl = document.getElementById('loading-tip');
        const loadStart = Date.now();
        const MIN_LOAD_MS = window.VALDORIA_MIN_LOAD_MS || 5000; // immutable: tip readability rule

        const updateProgress = (pct) => {
            if (progressFill) progressFill.style.width = pct + '%';
        };
        const updateStage = (text) => {
            if (stageEl) stageEl.textContent = text;
        };

        // Rotating map-themed tips
        const MAP_TIPS = [
            // Narrativas imersivas — mapa do mundo
            'Você desenrola o pergaminho e estuda as rotas traçadas a carvão...',
            'A bússola arcana gira lentamente, apontando para o norte verdadeiro...',
            'Montanhas, florestas e rios se revelam no mapa desgastado pelo tempo...',
            'Seus dedos percorrem as trilhas marcadas, calculando a distância...',
            'Marcas de tinta vermelha indicam territórios perigosos e inexplorados...',
            'O pergaminho cheira a tinta de carvalho e segredos antigos...',
            'Runas cartográficas brilham levemente ao toque de seus dedos...',
            'Cada dobra do mapa revela caminhos que poucos ousaram trilhar...',
        ];
        let _tipIdx = Math.floor(Math.random() * MAP_TIPS.length);
        if (tipEl) tipEl.textContent = MAP_TIPS[_tipIdx];
        const _tipTimer = setInterval(() => {
            _tipIdx = (_tipIdx + 1) % MAP_TIPS.length;
            if (tipEl) {
                tipEl.classList.add('tip-exit');
                setTimeout(() => {
                    tipEl.textContent = MAP_TIPS[_tipIdx];
                    tipEl.classList.remove('tip-exit');
                    tipEl.classList.add('tip-enter');
                    setTimeout(() => tipEl.classList.remove('tip-enter'), 400);
                }, 300);
            }
        }, 6000);

        updateProgress(5);
        await renderMapAsync(updateProgress, updateStage);
        clearInterval(_tipTimer);

        // Re-apply font scale to SVG text (initFontPicker runs before SVG exists)
        if (typeof applyFont === 'function') {
            const savedFont = localStorage.getItem('valdoria_font') || 'medievalsharp';
            applyFont(savedFont);
        }

        // Center on current location
        centerOnLocation(S.currentLoc);

        // Init minimap
        if (typeof _initMinimap === 'function') _initMinimap();

        // Reset stale _navSent on visibility change (e.g., user switches tabs and comes back)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && _navSent) {
                console.debug('[NAVIGATE] Resetting stale _navSent on visibility change');
                _navSent = false;
                clearTimeout(_navSentTimer);
            }
        });

        // Auto-refresh map data when page becomes visible again (e.g., returning from explore)
        document.addEventListener('visibilitychange', _onVisibilityRefresh);
        window.addEventListener('pageshow', e => { if (e.persisted) _onVisibilityRefresh(); });

        // Wait for minimum loading time so animation plays nicely
        const elapsed = Date.now() - loadStart;
        if (elapsed < MIN_LOAD_MS) {
            updateStage('Pronto!');
            await _sleep(MIN_LOAD_MS - elapsed);
        }

        // Exit animation — lite mode uses fast fade (400ms), full uses cinematic (900ms)
        const loadingEl = document.getElementById('loading');
        const isLite = loadingEl.classList.contains('loading-lite');
        loadingEl.classList.add('exit-cinematic');
        await _sleep(isLite ? 400 : 900);
        loadingEl.classList.add('hidden');
        loadingEl.classList.remove('exit-cinematic');

        if (typeof playArrivalAnimation === 'function') playArrivalAnimation();

    // Start ambient music based on current location biome
    if (typeof ValdoriaAudio !== 'undefined') {
        const loc = S.locations[S.currentLoc];
        if (loc && loc.b) ValdoriaAudio.playBiome(loc.b);
        else ValdoriaAudio.play('city');
    }
        setTimeout(() => { if (typeof showGestureTutorial === 'function') showGestureTutorial(); }, 1500);

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
            console.debug('[NAVIGATE] API fetch attempt', attempt + 1);
            const r = await fetchT(url, { method: 'GET', headers: headers });
            if (!r.ok) {
                console.warn('[NAVIGATE] API state returned', r.status);
                if (attempt < retries) { await _sleep(800 * (attempt + 1)); continue; }
                return '';
            }
            const d = await r.json();
            if (d.data) {
                console.debug('[NAVIGATE] Got payload from API (' + d.data.length + ' chars)');
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
// AUTO-REFRESH ON VISIBILITY CHANGE
// -----------------------------------------------------------

let _lastRefreshTs = Date.now();
let _refreshing = false;
async function _onVisibilityRefresh() {
    if (document.visibilityState !== 'visible') return;
    // Only refresh if > 30s since last load (avoid rapid refires)
    if (Date.now() - _lastRefreshTs < 30000) return;
    if (_refreshing) return;
    _refreshing = true;
    _lastRefreshTs = Date.now();
    console.debug('[NAVIGATE] Refreshing map data on visibility change...');
    try {
        const dataB64 = await fetchPayloadFromAPI(1);
        if (!dataB64) return;
        const data = await decompressPayload(dataB64);
        if (!data) return;
        // Update state with fresh data
        S.currentLoc = data.cl || S.currentLoc;
        S.locations = data.lo || S.locations;
        S.knownLocs = data.kl || Object.keys(S.locations);
        S.discoveredLocs = data.dl || S.discoveredLocs;
        S.charData = data.c || S.charData;
        S.quests = data.q || S.quests;
        S.dungeons = data.dd || S.dungeons;
        S.canCamp = !!data.cc;
        S.hasMap = data.hm || 0;
        S.mapCoverage = new Set(data.mc || []);
        // Rebuild and re-render (invalidate caches for fresh fog state)
        buildConnectionGraph();
        _cachedFogState = null; // Force fog recompute to detect reveals
        updateHUD();
        updateLocationBadge();
        updateBottomBar();
        refreshDynamicLayers();
        if (typeof _initMinimap === 'function') _initMinimap();
        console.debug('[NAVIGATE] Map data refreshed successfully');
    } catch (e) {
        console.warn('[NAVIGATE] Auto-refresh failed:', e);
    } finally {
        _refreshing = false;
    }
}

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
    // Invalidate caches that depend on the connection graph
    _invalidateMapCaches();
    if (typeof invalidateBfsCache === 'function') invalidateBfsCache();
}

function _invalidateMapCaches() {
    // Clear BFS path cache
    if (typeof _bfsCache !== 'undefined') {
        for (const k in _bfsCache) delete _bfsCache[k];
    }
    // Clear fog state cache
    _cachedFogState = null;
    // Clear distance cache
    _cachedPxPerTurn = 0;
    // Terrain caches no longer needed (pre-rendered static image)
    if (typeof _invalidateTerrainCaches === 'function') _invalidateTerrainCaches();
    if (typeof _invalidateVisCache === 'function') _invalidateVisCache();
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

    document.getElementById('hud-name').textContent = `${c.ci || ''} ${c.nm || 'Aventureiro'}`;
    document.getElementById('hud-level').textContent = `Nv.${c.lv || 1}`;

    const hpEl = document.getElementById('hud-hp');
    const mpEl = document.getElementById('hud-mp');
    const hpPct = c.mh > 0 ? Math.min(100, (c.hp / c.mh) * 100) : 0;
    const mpPct = c.mm > 0 ? Math.min(100, (c.mp / c.mm) * 100) : 0;
    // Trigger shimmer if value changed
    const oldHpV = hpEl.dataset.pct || '', oldMpV = mpEl.dataset.pct || '';
    const newHpV = '' + Math.round(hpPct), newMpV = '' + Math.round(mpPct);
    hpEl.dataset.pct = newHpV; mpEl.dataset.pct = newMpV;
    hpEl.style.transform = `scaleX(${hpPct/100})`;
    mpEl.style.transform = `scaleX(${mpPct/100})`;
    if (oldHpV && oldHpV !== newHpV) { hpEl.classList.remove('shimmer'); void hpEl.offsetWidth; hpEl.classList.add('shimmer'); }
    if (oldMpV && oldMpV !== newMpV) { mpEl.classList.remove('shimmer'); void mpEl.offsetWidth; mpEl.classList.add('shimmer'); }
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

    if (_navSent) {
        console.warn('[NAVIGATE][DEBUG] BLOCKED: double-fire');
        return;
    }
    _navSent = true;
    // Auto-reset _navSent after 30s to prevent permanent lock after network timeouts
    clearTimeout(_navSentTimer);
    _navSentTimer = setTimeout(() => {
        if (_navSent) {
            console.warn('[NAVIGATE] Auto-resetting stale _navSent after 30s timeout');
            _navSent = false;
            _hideTravelOverlay();
            // Re-enable action buttons so user can retry
            document.querySelectorAll('.info-btn').forEach(btn => {
                btn.style.pointerEvents = '';
                btn.style.opacity = '';
            });
        }
    }, 30000);

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
        _navSent = false;
        clearTimeout(_navSentTimer);
        // Re-enable buttons
        document.querySelectorAll('.info-btn').forEach(btn => {
            btn.style.pointerEvents = '';
            btn.style.opacity = '';
        });
        return;
    }

    const apiUrl = `${S.api}/api/navigate/action`;

    // Show full-screen travel loading overlay
    _showTravelOverlay(type, target);

    const _nh = { 'Content-Type': 'application/json' };
    if (window.Telegram?.WebApp?.initData) { _nh['X-Telegram-Init-Data'] = Telegram.WebApp.initData; }
    fetchT(apiUrl, {
        method: 'POST',
        headers: _nh,
        body: JSON.stringify(payload),
    })
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(d => {
            // Travel/Return: backend returns URL -> redirect
            if (d.url && (type === 'travel' || type === 'return')) {
                window.__valdoria_transitioning = true;
                window.location.replace(d.url);
                return;
            }
            // Other actions (camp, explore): go to Game Hub
            _transitionToGame();
        })
        .catch(e => {
            console.error('[NAVIGATE][DEBUG] fetch error:', e);
            if (typeof _haptic === 'function') _haptic('error');
            showError('Erro ao viajar: ' + e.message + '. Tente novamente.');
            // Re-enable after error so user can retry
            _navSent = false;
            clearTimeout(_navSentTimer);
            _hideTravelOverlay();
            document.querySelectorAll('.info-btn').forEach(btn => {
                btn.style.pointerEvents = '';
                btn.style.opacity = '';
            });
        });
}

// -----------------------------------------------------------
// TRAVEL LOADING OVERLAY
// -----------------------------------------------------------

function _showTravelOverlay(type, target) {
    let overlay = document.getElementById('travel-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'travel-overlay';
        overlay.className = 'travel-overlay';
        document.body.appendChild(overlay);
    }

    const loc = target ? S.locations[target] : null;
    const biome = loc ? (BIOME_INFO[loc.b] || BIOME_INFO.plains) : null;
    const danger = loc?.d || 0;
    const edgeDist = target ? getConnectionDistance(S.currentLoc, target) : 0;

    // SVG compass icon
    const compassSvg = '<svg class="travel-overlay-compass-svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#c4953a" stroke-width="1.5" stroke-opacity="0.4"/><polygon points="24,6 27,22 24,20 21,22" fill="#c4953a" fill-opacity="0.8"/><polygon points="24,42 21,26 24,28 27,26" fill="#8a6a3a" fill-opacity="0.6"/><circle cx="24" cy="24" r="2" fill="#c4953a"/></svg>';

    let text = 'Preparando...';
    let biomeText = '';
    let dangerText = '';

    if (type === 'travel' && loc) {
        text = 'Viajando para ' + (loc.n || 'destino') + '...';
        if (biome) biomeText = biome.label + (edgeDist > 0 ? ' \u00b7 ' + edgeDist + ' turno' + (edgeDist !== 1 ? 's' : '') : '');
        if (danger >= 7) dangerText = '\u2620\ufe0f Perigo extremo no caminho';
        else if (danger >= 5) dangerText = '\u26a0\ufe0f Alta chance de encontros';
    } else if (type === 'return') {
        text = 'Retornando...';
    } else if (type === 'camp') {
        text = 'Montando acampamento...';
    } else if (type === 'explore') {
        text = 'Explorando a regi\u00e3o...';
    }

    overlay.innerHTML =
        '<div class="travel-overlay-content">' +
            compassSvg +
            '<div class="travel-overlay-text">' + text + '</div>' +
            (biomeText ? '<div class="travel-overlay-biome">' + biomeText + '</div>' : '') +
            (dangerText ? '<div class="travel-overlay-danger">' + dangerText + '</div>' : '') +
            '<div class="travel-overlay-progress"><div class="travel-overlay-progress-fill" id="travel-progress-fill"></div></div>' +
            '<div class="travel-overlay-dots"><span>.</span><span>.</span><span>.</span></div>' +
        '</div>';

    requestAnimationFrame(() => {
        overlay.classList.add('visible');
        const fill = document.getElementById('travel-progress-fill');
        if (fill) {
            requestAnimationFrame(() => { fill.style.transform = 'scaleX(1)'; fill.style.transition = 'transform 3s linear'; });
        }
    });
}

function _hideTravelOverlay() {
    const overlay = document.getElementById('travel-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
    }
}

function handleReturn() {
    finishNavigation('return');
}

function handleClose() {
    _transitionToGame();
}

async function _transitionToGame() {
    if (!S.api || !S.token) { try { tg?.close(); } catch (e) { console.warn('[NAVIGATE] Close:', e); } return; }
    const h = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + S.token };
    if (window.Telegram?.WebApp?.initData) h['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
    h['X-Idempotency-Key'] = crypto.randomUUID();
    try {
        const r = await fetchT(S.api + '/api/webapp/transition', {
            method: 'POST', headers: h,
            body: JSON.stringify({ from: 'navigate', to: (S.returnTo || 'game'), user_id: S.uid, payload: {} })
        });
        const d = await r.json();
        window.__valdoria_transitioning = true;
        if (d.url) { window.location.replace(d.url); return; }
    } catch (e) { console.error('[NAVIGATE] transition error:', e); }
    // Fallback: redirect to game hub directly
    const base = window.location.href.replace(/\/navigate\/.*/, '');
    window.__valdoria_transitioning = true;
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

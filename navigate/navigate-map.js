// ===============================================================
// NAVIGATE MAP — Orchestrator, defs, ocean, landmass, pan/zoom
// Hand-drawn medieval cartography: ink on dark parchment
// ===============================================================

var NS = 'http://www.w3.org/2000/svg';
var _mapDetail = (function() { var t = window._valdoriaPerformanceTier || 'full'; return t === 'lite' ? 0 : t === 'medium' ? 1 : 2; })();

function srand(seed) {
    let x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
}

// Ink color constants (dark parchment palette)
var INK = '#8a6a3a';        // Sepia ink (main strokes)
var INK_DARK = '#3a2810';   // Dark brown ink (hatching, details)
var INK_LIGHT = '#a08050';  // Light sepia (subtle marks)
var PARCHMENT = '#6a5a42';  // Land parchment (warmer, lighter base)
var MAP_BG = '#2a2420';     // Dark background outside the map
var GOLD = '#c4953a';          // Gold accent (current loc, highlights)
var FOG_STIPPLE = 'rgba(58, 40, 16, 0.04)';  // Fine dots on fog texture
var FOG_HATCH = 'rgba(58, 40, 16, 0.03)';    // Crosshatch lines on fog

// Full-canvas bounds — infinite map (no parchment border)
var LANDMASS_POINTS = (() => {
    const w = 733, h = 720;
    // Simple rectangle covering the entire canvas (no margin, no wobble)
    return [[0,0],[w,0],[w,h],[0,h]];
})();

// Cache: landmass path string — full canvas rectangle (infinite map)
var _cachedLandmassPath = null;
function _landmassPath() {
    if (_cachedLandmassPath) return _cachedLandmassPath;
    const p = LANDMASS_POINTS;
    _cachedLandmassPath = `M${p[0][0]},${p[0][1]} L${p[1][0]},${p[1][1]} L${p[2][0]},${p[2][1]} L${p[3][0]},${p[3][1]} Z`;
    return _cachedLandmassPath;
}

// Infinite map: every point is inside the landmass (full canvas)
function _pointInLandmass(px, py) {
    return px >= 0 && px <= 733 && py >= 0 && py <= 720;
}

// River paths
var RIVER_PATHS = [
    { pts: [[300,55],[275,105],[245,165],[215,240],[225,300],[245,350],[265,385]], w: 1.8 },
    { pts: [[475,210],[468,270],[462,330],[468,385],[478,430],[488,465]], w: 1.4 },
];


// Fog state cache — invalidated by _invalidateMapCaches()
var _cachedFogState = null;
var _prevFogState = null; // Track previous state for reveal animations

function computeFogState(forceRecompute) {
    if (_cachedFogState && !forceRecompute) return _cachedFogState;
    // Save previous state for cascade animation
    if (_cachedFogState) _prevFogState = { ..._cachedFogState };
    if(window._dbg)console.debug('[NAV] computeFogState recompute forced=%s', !!forceRecompute);

    const fog = {};
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);
    const adj = {};
    for (const id of Object.keys(LOCATION_COORDS)) adj[id] = [];
    for (const [a, b] of CONNECTION_EDGES) {
        if (adj[a]) adj[a].push(b);
        if (adj[b]) adj[b].push(a);
    }
    for (const locId of Object.keys(LOCATION_COORDS)) {
        if (knownSet.has(locId)) {
            if (discoveredSet.has(locId)) fog[locId] = 'explored';
            else if (S.mapCoverage.has(locId)) fog[locId] = 'known_mapped';
            else fog[locId] = 'known_unmapped';
        } else {
            const neighbors = adj[locId] || [];
            fog[locId] = neighbors.some(n => knownSet.has(n)) ? 'frontier' : 'hidden';
        }
    }
    _cachedFogState = fog;
    if(window._dbg){var _fs=Object.values(fog),_rv=_fs.filter(function(s){return s!=='hidden'}).length;console.debug('[NAV] fogState total=%s revealed=%s hidden=%s',_fs.length,_rv,_fs.length-_rv)} // noqa: preflight
    return fog;
}


// ===============================================================
// FOG OVERLAY — Smooth radial mask (organic edges, no hex artifacts)
// Uses SVG <mask> with radial gradients for a cinematic reveal effect.
// Each explored/known location creates a soft light circle in the mask;
// the rest is covered by a dark overlay.
// ===============================================================

function _renderFogOverlay(svg, fogState) {
    const canvas = document.getElementById('fog-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Skip fog entirely if all locations are explored
    const allExplored = Object.values(fogState).every(s => s === 'explored');
    if (allExplored) {
        ctx.clearRect(0, 0, W, H);
        canvas.style.display = 'none';
        return;
    }
    canvas.style.display = 'block';

    // ── Step 1: Fill canvas with dark fog ──
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = MAP_BG;
    ctx.fillRect(0, 0, W, H);

    // ── Step 2: Clip to landmass shape ──
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    const pts = LANDMASS_POINTS;
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();

    // ── Step 3: Collect reveal points ──
    const reveals = [];
    for (const [locId, state] of Object.entries(fogState)) {
        if (state === 'hidden') continue;
        const coords = LOCATION_COORDS[locId];
        if (!coords) continue;
        const { x, y } = hexToPixel(coords.col, coords.row);

        let radius, strength, flatZone;
        if (state === 'explored') {
            radius = HEX_RADIUS * 8;
            strength = 1.0;
            flatZone = 0.5;
        } else if (state === 'known_mapped') {
            radius = HEX_RADIUS * 5.5;
            strength = 0.88;
            flatZone = 0.4;
        } else if (state === 'known_unmapped') {
            radius = HEX_RADIUS * 4;
            strength = 0.6;
            flatZone = 0.3;
        } else { // frontier
            radius = HEX_RADIUS * 2.5;
            strength = 0.3;
            flatZone = 0.15;
        }
        reveals.push({ x, y, radius, strength, flatZone, state });
    }

    // ── Step 4: Punch reveal holes ──
    ctx.globalCompositeOperation = 'destination-out';
    for (const { x, y, radius, strength, flatZone } of reveals) {
        if (_mapDetail < 1) {
            // Lite: hard-edge circle (no gradient)
            ctx.fillStyle = `rgba(0,0,0,${strength})`;
            ctx.beginPath();
            ctx.arc(x, y, radius * (flatZone + 0.2), 0, Math.PI * 2);
            ctx.fill();
        } else {
            const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
            grad.addColorStop(0, `rgba(0,0,0,${strength})`);
            grad.addColorStop(flatZone, `rgba(0,0,0,${strength})`);
            grad.addColorStop(flatZone + 0.2, `rgba(0,0,0,${strength * 0.4})`);
            grad.addColorStop(flatZone + 0.35, `rgba(0,0,0,${strength * 0.08})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
    }

    // ── Step 5: Organic edge splotches around reveal boundaries ──
    // Place small irregular blobs at the edge of each reveal circle
    // (no getImageData needed — we know the boundary radius)
    ctx.globalCompositeOperation = 'destination-out';
    for (const { x, y, radius, strength, flatZone } of reveals) {
        const edgeR = radius * (flatZone + 0.25); // outer boundary zone
        const nBlobs = Math.floor(12 + strength * 8);
        for (let j = 0; j < nBlobs; j++) {
            const angle = srand(x * 100 + y * 200 + j * 37) * Math.PI * 2;
            const dist = edgeR * (0.8 + srand(y * 300 + x * 400 + j * 53) * 0.5);
            const bx = x + Math.cos(angle) * dist;
            const by = y + Math.sin(angle) * dist;
            const blobR = 2 + srand(x * 500 + j * 71) * 5;
            const blobAlpha = strength * 0.15;

            ctx.fillStyle = `rgba(0,0,0,${blobAlpha})`;
            ctx.beginPath();
            // Irregular blob shape
            const nPts = 5 + Math.floor(srand(j * 97 + x) * 3);
            for (let k = 0; k < nPts; k++) {
                const a = (k / nPts) * Math.PI * 2;
                const wobble = blobR * (0.4 + srand(j * 100 + k * 41 + x) * 0.8);
                const px = bx + Math.cos(a) * wobble;
                const py = by + Math.sin(a) * wobble;
                if (k === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }
    }

    // ── Step 6: Parchment texture on fog ──
    ctx.globalCompositeOperation = 'source-atop';

    // Fine stipple dots (medieval parchment feel)
    ctx.fillStyle = FOG_STIPPLE;
    for (let i = 0; i < 250; i++) {
        const nx = srand(i * 73 + 11) * W;
        const ny = srand(i * 79 + 17) * H;
        const cr = 0.4 + srand(i * 83) * 0.7;
        ctx.beginPath();
        ctx.arc(nx, ny, cr, 0, Math.PI * 2);
        ctx.fill();
    }

    // Crosshatch lines
    ctx.strokeStyle = FOG_HATCH;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 40; i++) {
        const sx = srand(i * 113 + 7) * W;
        const sy = srand(i * 127 + 13) * H;
        const angle = srand(i * 137 + 19) * Math.PI;
        const len = 5 + srand(i * 149) * 10;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
        ctx.stroke();
    }
}

// ===============================================================
// RENDER MAP
// ===============================================================

// Async progressive render — used on initial load with loading screen
// Strategy: render functional map first (landmass + terrain + roads + locations),
// show to player, then add expensive decorative layers (worn edges, aging,
// SVG filters) in the background after loading screen hides.
async function renderMapAsync(onProgress, onStage) {
    if(window._dbg)console.debug('[NAV] renderMapAsync start, detail=%s', _mapDetail);
    // Hidden SVG for path math utilities (_pointOnPath)
    const svg = document.getElementById('map-svg');
    svg.setAttribute('width', SVG_W);
    svg.setAttribute('height', SVG_H);
    svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
    svg.innerHTML = '';
    const fogState = computeFogState(true);

    // Phase 1: SVG defs (landmass clip for fog overlay)
    onStage?.('Preparando pergaminho...');
    const defs = _el('defs');
    _buildAllDefs(defs);
    svg.appendChild(defs);
    onProgress?.(20);

    // Phase 2: Fog overlay (already Canvas 2D — stays as-is)
    onStage?.('Revelando territórios...');
    _renderFogOverlay(svg, fogState);
    onProgress?.(40);

    // Phase 3: Initialize Canvas 2D renderer (roads, markers, rings, banner, particles)
    onStage?.('Traçando estradas...');
    if (typeof initCanvasRenderer === 'function') initCanvasRenderer();
    onProgress?.(80);

    // Phase 4: Compass (separate SVG, stays as-is) + interactivity
    onStage?.('Finalizando...');
    renderCompassRose();
    setupPanZoom();
    if (typeof setupCanvasClickHandler === 'function') setupCanvasClickHandler();
    onProgress?.(100);
}


// Synchronous render — used for re-renders (visibility refresh, no loading screen)
function renderMap() {
    refreshDynamicLayers();
}

// Lightweight re-render: only dynamic layers (fog, roads, markers, player)
function refreshDynamicLayers() {
    // Re-render fog overlay (Canvas)
    const svg = document.getElementById('map-svg');
    const fogState = computeFogState(true);
    _renderFogOverlay(svg, fogState);

    // Trigger canvas re-render of all dynamic layers
    if (typeof canvasSetDirty === 'function') canvasSetDirty();

    // Re-render compass (separate SVG)
    renderCompassRose();
}

// ===============================================================
// SVG DEFS — Minimal set for hand-drawn ink style
// ===============================================================

function _buildAllDefs(defs) {
    // fog-blur filter removed — replaced by multi-stroke shadow (no GPU filter overhead)

    // Ink wobble removed — LANDMASS_POINTS already has built-in irregularity;
    // feTurbulence + feDisplacementMap was an expensive GPU filter with negligible
    // visual difference on mobile. Stroke-width increased to 2.0 to compensate.

    // Landmass clip path (parchment shape)
    defs.appendChild(_el('clipPath', { id: 'land-clip' })).appendChild(_el('path', { d: _landmassPath() }));
}


// ===============================================================
// PAN / ZOOM
// ===============================================================

// Discrete zoom levels: [full map, region, area, local]
var ZOOM_LEVELS = [
    { zoom: 0.85, label: 'Mapa',       turnsPerBar: 8 },
    { zoom: 1.15, label: 'Região',     turnsPerBar: 4 },
    { zoom: 1.6,  label: 'Área',       turnsPerBar: 2 },
    { zoom: 2.2,  label: 'Local',      turnsPerBar: 1 },
];
var _zoomIdx = 1; // Default to "Região" level

function _snapToZoomLevel(dir, focalX, focalY) {
    const oldZoom = S.zoom;
    _zoomIdx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, _zoomIdx + dir));
    S.zoom = ZOOM_LEVELS[_zoomIdx].zoom;

    // Focal-point zoom: keep the screen point (focalX, focalY) over the same map point
    if (focalX !== undefined && focalY !== undefined) {
        // Map point under focal: mapX = (focalX - panX) / oldZoom
        const mapX = (focalX - S.panX) / oldZoom;
        const mapY = (focalY - S.panY) / oldZoom;
        S.panX = focalX - mapX * S.zoom;
        S.panY = focalY - mapY * S.zoom;
    }

    // Toggle zoom-out class for disabling animations on distant views
    document.body.classList.toggle('zoom-out', _zoomIdx <= 1);
    if (typeof window._zoomBtnUpdate === 'function') window._zoomBtnUpdate();
}


var _panZoomInitialized = false;
function setupPanZoom() {
    const vp = document.getElementById('map-viewport');
    const wr = document.getElementById('map-wrapper');
    // Guard: only bind listeners once (renderMap may be called multiple times via refresh)
    if (_panZoomInitialized) {
        // Just recalc zoom index and apply current transform
        let bestDist = Infinity;
        for (let i = 0; i < ZOOM_LEVELS.length; i++) {
            const d = Math.abs(S.zoom - ZOOM_LEVELS[i].zoom);
            if (d < bestDist) { bestDist = d; _zoomIdx = i; }
        }
        S.zoom = ZOOM_LEVELS[_zoomIdx].zoom;

        document.body.classList.toggle('zoom-out', _zoomIdx <= 1);
        wr.style.transform = `translate(${S.panX}px,${S.panY}px) scale(${S.zoom})`;
        if (typeof window._zoomBtnUpdate === 'function') window._zoomBtnUpdate();
        return;
    }
    _panZoomInitialized = true;
    if (_mapAbort) _mapAbort.abort();
    _mapAbort = new AbortController();
    var _sig = { signal: _mapAbort.signal };
    var _sigPassive = { signal: _mapAbort.signal, passive: true };
    var _sigActive = { signal: _mapAbort.signal, passive: false };
    let pan = false, moved = false, sx = 0, sy = 0, scx = 0, scy = 0, ipd = 0, iIdx = 0;
    // Velocity tracking for inertia
    let _velX = 0, _velY = 0, _lastMoveT = 0, _lastMoveX = 0, _lastMoveY = 0;


    function apply() { wr.style.transform = `translate(${S.panX}px,${S.panY}px) scale(${S.zoom})`; saveViewport(); if (typeof _updateOffscreenIndicator === 'function') _updateOffscreenIndicator(); }
    function clamp() {
        const vpW = vp.clientWidth, vpH = vp.clientHeight;
        const mw = SVG_W * S.zoom, mh = SVG_H * S.zoom;
        if (mw > vpW) {
            S.panX = Math.max(vpW - mw, Math.min(0, S.panX));
        } else {
            S.panX = (vpW - mw) / 2;
        }
        if (mh > vpH) {
            S.panY = Math.max(vpH - mh, Math.min(0, S.panY));
        } else {
            S.panY = (vpH - mh) / 2;
        }
    }
    // Find closest zoom level to current S.zoom (for session restore)
    let bestDist = Infinity;
    for (let i = 0; i < ZOOM_LEVELS.length; i++) {
        const d = Math.abs(S.zoom - ZOOM_LEVELS[i].zoom);
        if (d < bestDist) { bestDist = d; _zoomIdx = i; }
    }
    S.zoom = ZOOM_LEVELS[_zoomIdx].zoom;


    vp.addEventListener('pointerdown', e => {
        pan = true; moved = false;
        wr.classList.add('panning');
        wr.classList.remove('inertia');
        sx = e.clientX - S.panX; sy = e.clientY - S.panY;
        scx = e.clientX; scy = e.clientY;
        _velX = 0; _velY = 0;
        _lastMoveX = e.clientX; _lastMoveY = e.clientY; _lastMoveT = performance.now();
    }, _sig);
    vp.addEventListener('pointermove', e => {
        if (!pan) return;
        if (Math.abs(e.clientX - scx) > 5 || Math.abs(e.clientY - scy) > 5) moved = true;
        if (moved) {
            const now = performance.now();
            const dt = now - _lastMoveT;
            if (dt > 0) {
                // Exponential smoothing for velocity
                const vx = (e.clientX - _lastMoveX) / dt * 16;
                const vy = (e.clientY - _lastMoveY) / dt * 16;
                _velX = _velX * 0.4 + vx * 0.6;
                _velY = _velY * 0.4 + vy * 0.6;
            }
            _lastMoveX = e.clientX; _lastMoveY = e.clientY; _lastMoveT = now;
            S.panX = e.clientX - sx; S.panY = e.clientY - sy;
            clamp(); apply();
        }
    }, _sigPassive);
    vp.addEventListener('pointerup', () => {
        if (!pan) return;
        pan = false; wr.classList.remove('panning');
        // Apply inertia if velocity is significant
        const speed = Math.sqrt(_velX * _velX + _velY * _velY);
        if (moved && speed > 1.5) {
            const factor = Math.min(speed * 2, 80);
            S.panX += _velX * factor / speed * 0.6;
            S.panY += _velY * factor / speed * 0.6;
            clamp();
            wr.classList.add('inertia');
            apply();

            setTimeout(() => wr.classList.remove('inertia'), 650);
        }
    }, _sig);
    vp.addEventListener('pointercancel', () => { pan = false; wr.classList.remove('panning'); wr.classList.remove('inertia'); }, _sig);
    // Double-tap to zoom in (single finger, < 300ms gap) — centered on tap point
    let _lastTapTime = 0;
    vp.addEventListener('pointerup', e => {
        if (moved) return;
        const now = Date.now();
        if (now - _lastTapTime < 300 && _zoomIdx < ZOOM_LEVELS.length - 1) {
            const vpR = vp.getBoundingClientRect();
            _snapToZoomLevel(1, e.clientX - vpR.left, e.clientY - vpR.top);
            clamp(); apply();
            _lastTapTime = 0;
        } else {
            _lastTapTime = now;
        }
    }, _sig);
    // Pinch zoom: snap to discrete levels
    vp.addEventListener('touchstart', e => { if (e.touches.length === 2) { ipd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); iIdx = _zoomIdx; } }, _sigPassive);
    vp.addEventListener('touchmove', e => { if (e.touches.length === 2 && ipd > 0) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); const ratio = d / ipd; const vpR = vp.getBoundingClientRect(); const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - vpR.left; const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - vpR.top; if (ratio > 1.3 && _zoomIdx < ZOOM_LEVELS.length - 1) { _snapToZoomLevel(1, midX, midY); ipd = d; clamp(); apply(); } else if (ratio < 0.7 && _zoomIdx > 0) { _snapToZoomLevel(-1, midX, midY); ipd = d; clamp(); apply(); } } }, _sigPassive);
    // Mouse wheel: snap to discrete levels (debounced to prevent jitter)
    let _wheelTimer = null;
    vp.addEventListener('wheel', e => {
        e.preventDefault();
        if (_wheelTimer) return;
        const vpR = vp.getBoundingClientRect();
        _snapToZoomLevel(e.deltaY > 0 ? -1 : 1, e.clientX - vpR.left, e.clientY - vpR.top);
        clamp(); apply();
        _wheelTimer = setTimeout(() => { _wheelTimer = null; }, 200);
    }, _sigActive);
    vp.addEventListener('click', e => { if (e.target === vp || e.target === wr || e.target.tagName === 'rect') closeInfoPanel(); }, _sig);
    apply();

    // --- Zoom +/- buttons ---
    const btnIn = document.getElementById('btn-zoom-in');
    const btnOut = document.getElementById('btn-zoom-out');

    function _updateZoomBtns() {
        if (btnIn) btnIn.disabled = _zoomIdx >= ZOOM_LEVELS.length - 1;
        if (btnOut) btnOut.disabled = _zoomIdx <= 0;
    }
    if (btnIn) btnIn.addEventListener('click', e => { e.stopPropagation(); _snapToZoomLevel(1); clamp(); apply(); _updateZoomBtns(); if (typeof _haptic === 'function') _haptic('tap'); btnIn.classList.add('flash'); setTimeout(() => btnIn.classList.remove('flash'), 300); }, _sig);
    if (btnOut) btnOut.addEventListener('click', e => { e.stopPropagation(); _snapToZoomLevel(-1); clamp(); apply(); _updateZoomBtns(); if (typeof _haptic === 'function') _haptic('tap'); btnOut.classList.add('flash'); setTimeout(() => btnOut.classList.remove('flash'), 300); }, _sig);

    _updateZoomBtns();
    // Update buttons on any zoom change
    const origSnap = _snapToZoomLevel;
    // Patch snap to also update buttons
    const _origSnapRef = window._snapToZoomLevel_ref;
    window._zoomBtnUpdate = _updateZoomBtns;
}

function centerOnLocation(locId) {
    const c = LOCATION_COORDS[locId]; if (!c) return;
    const vp = document.getElementById('map-viewport');
    const { x, y } = hexToPixel(c.col, c.row);
    S.panX = (vp.clientWidth / 2) - (x * S.zoom);
    S.panY = (vp.clientHeight / 2) - (y * S.zoom);
    document.getElementById('map-wrapper').style.transform = `translate(${S.panX}px,${S.panY}px) scale(${S.zoom})`;
    saveViewport();
}

/** Smooth pan so a location is visible (uses CSS transition) */
function panToLocationSmooth(locId) {
    const c = LOCATION_COORDS[locId]; if (!c) return;
    const vp = document.getElementById('map-viewport');
    const wr = document.getElementById('map-wrapper');
    const { x, y } = hexToPixel(c.col, c.row);
    // Target: location at upper third (leaving room for info panel at bottom)
    const targetX = (vp.clientWidth / 2) - (x * S.zoom);
    const targetY = (vp.clientHeight * 0.35) - (y * S.zoom);
    S.panX = targetX; S.panY = targetY;
    // Clamp
    const mw = SVG_W * S.zoom, mh = SVG_H * S.zoom;
    if (mw > vp.clientWidth) S.panX = Math.max(vp.clientWidth - mw, Math.min(0, S.panX));
    else S.panX = (vp.clientWidth - mw) / 2;
    if (mh > vp.clientHeight) S.panY = Math.max(vp.clientHeight - mh, Math.min(0, S.panY));
    else S.panY = (vp.clientHeight - mh) / 2;
    // CSS transition handles the smooth animation
    wr.style.transform = `translate(${S.panX}px,${S.panY}px) scale(${S.zoom})`;
    saveViewport();
}

// ===============================================================
// MINIMAP — Compact overview (visible at zoom >= Área)
// ===============================================================


var _mapAbort = null;
function _destroyMapListeners() { if (_mapAbort) { _mapAbort.abort(); _mapAbort = null; } }


window.addEventListener('pagehide', function() { _destroyMapListeners(); });


// ===============================================================
// ARRIVAL ANIMATION — Zoom-out reveal on first load
// ===============================================================

function playArrivalAnimation() {
    const wr = document.getElementById('map-wrapper');
    const vp = document.getElementById('map-viewport');
    if (!wr || !vp) return;
    // Start at highest zoom (Local), animate to current zoom
    const startZoom = ZOOM_LEVELS[ZOOM_LEVELS.length - 1].zoom;
    const endZoom = S.zoom;
    const coords = LOCATION_COORDS[S.currentLoc];
    if (!coords) return;
    const { x, y } = hexToPixel(coords.col, coords.row);
    // Calculate start pan (centered on current loc at startZoom)
    const startPX = (vp.clientWidth / 2) - (x * startZoom);
    const startPY = (vp.clientHeight / 2) - (y * startZoom);
    // Set CSS variables for the keyframes
    wr.style.setProperty('--arr-tx', startPX + 'px');
    wr.style.setProperty('--arr-ty', startPY + 'px');
    wr.style.setProperty('--arr-zs', startZoom);
    wr.style.setProperty('--arr-fx', S.panX + 'px');
    wr.style.setProperty('--arr-fy', S.panY + 'px');
    wr.style.setProperty('--arr-fz', endZoom);
    wr.classList.add('arrival-anim');
    wr.addEventListener('animationend', () => {
        wr.classList.remove('arrival-anim');
        wr.style.transform = `translate(${S.panX}px,${S.panY}px) scale(${S.zoom})`;
    }, { once: true });
}

// ===============================================================
// DISTANCE RINGS — concentric turn-radius circles from current loc
// ===============================================================

// Compute average px/turn from actual connection data (cached)
var _cachedPxPerTurn = 0;
function _getAvgPxPerTurn() {
    if (_cachedPxPerTurn > 0) return _cachedPxPerTurn;
    let totalPxPerTurn = 0, count = 0;
    for (const [aId, bId] of CONNECTION_EDGES) {
        const ca = LOCATION_COORDS[aId], cb = LOCATION_COORDS[bId];
        if (!ca || !cb) continue;
        const pa = hexToPixel(ca.col, ca.row), pb = hexToPixel(cb.col, cb.row);
        const pxDist = Math.sqrt((pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2);
        const turns = getConnectionDistance(aId, bId);
        totalPxPerTurn += pxDist / turns;
        count++;
    }
    _cachedPxPerTurn = count > 0 ? totalPxPerTurn / count : HEX_RADIUS * 2;
    return _cachedPxPerTurn;
}

function renderDistanceRings(svg) {
    // Only show at zoom >= Região (index 1+)
    if (_zoomIdx < 1) return;
    const coords = LOCATION_COORDS[S.currentLoc];
    if (!coords) return;
    const { x: cx, y: cy } = hexToPixel(coords.col, coords.row);
    const rG = _el('g', { class: 'distance-rings-layer', 'pointer-events': 'none' });
    const pxPerTurn = _getAvgPxPerTurn();
    for (let t = 1; t <= 3; t++) {
        const r = pxPerTurn * t;
        const opac = 0.08 + (3 - t) * 0.03;
        rG.appendChild(_el('circle', {
            cx, cy, r,
            class: 'distance-ring',
            'stroke-opacity': opac,
            'stroke-width': 0.6,
            'stroke-dasharray': '4 3',
        }));
        // Label at top of ring
        const lbl = _el('text', {
            x: cx, y: cy - r - 3,
            class: 'distance-ring-label',
            'text-anchor': 'middle',
        });
        lbl.textContent = `~${t} turno${t > 1 ? 's' : ''}`;
        rG.appendChild(lbl);
    }
    svg.appendChild(rG);
}

function _el(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
}
var createSVG = _el;


// ── Fog boundary shimmer (SVG overlay at explored/unknown border) ──
function _renderFogShimmer(svg, fogState) {
    // Shimmer now rendered by canvas renderer
}

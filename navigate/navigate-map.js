// ===============================================================
// NAVIGATE MAP — Orchestrator, defs, ocean, landmass, pan/zoom
// Hand-drawn medieval cartography: ink on dark parchment
// ===============================================================

var NS = 'http://www.w3.org/2000/svg';

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

// Parchment paper outline (roughly rectangular with worn/torn edges)
var LANDMASS_POINTS = (() => {
    const m = 18;
    const w = 733, h = 720;
    const pts = [];
    const N = 28; // more points = more detailed irregular edge

    // Generate base rectangle points
    for (let i = 0; i <= N; i++) pts.push([m + (i / N) * (w - 2 * m), m]); // Top
    for (let i = 1; i <= N; i++) pts.push([w - m, m + (i / N) * (h - 2 * m)]); // Right
    for (let i = 1; i <= N; i++) pts.push([w - m - (i / N) * (w - 2 * m), h - m]); // Bottom
    for (let i = 1; i < N; i++) pts.push([m, h - m - (i / N) * (h - 2 * m)]); // Left

    return pts.map(([x, y], i) => {
        const s1 = srand(i * 17 + 3), s2 = srand(i * 23 + 7), s3 = srand(i * 31 + 11);
        const s4 = srand(i * 43 + 19), s5 = srand(i * 53 + 29);
        const isTop = y <= m + 5, isBot = y >= h - m - 5;
        const isLeft = x <= m + 5, isRight = x >= w - m - 5;
        const isHoriz = isTop || isBot;

        // Multi-frequency wobble (small + medium irregularity)
        let wx = (s1 - 0.5) * 6 + (s4 - 0.5) * 4;
        let wy = (s2 - 0.5) * 6 + (s5 - 0.5) * 4;

        // Deep tears/bites — 18% of edge points (was 10%)
        if (s3 > 0.82) {
            const tearDepth = 10 + s2 * 18; // deeper tears (10-28px)
            if (isHoriz) wy += (isTop ? 1 : -1) * tearDepth;
            else wx += (isLeft ? 1 : -1) * tearDepth;
        }
        // Medium notches — another 15% of points
        else if (s3 > 0.67) {
            const notch = 5 + s1 * 8;
            if (isHoriz) wy += (isTop ? 1 : -1) * notch;
            else wx += (isLeft ? 1 : -1) * notch;
        }

        // Corners: dramatic wear (large rounded bites)
        const corners = [
            [m, m], [w - m, m], [m, h - m], [w - m, h - m]
        ];
        for (const [cx, cy] of corners) {
            const dx = x - cx, dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 70) {
                const pull = (1 - dist / 70) * (10 + s3 * 18);
                wx += (cx < w / 2 ? pull : -pull);
                wy += (cy < h / 2 ? pull : -pull);
            }
        }
        return [x + wx, y + wy];
    });
})();

// Cache: landmass path string is deterministic and called 4+ times per render
var _cachedLandmassPath = null;
function _landmassPath() {
    if (_cachedLandmassPath) return _cachedLandmassPath;
    const p = LANDMASS_POINTS;
    let d = `M${p[0][0]},${p[0][1]}`;
    for (let i = 1; i < p.length; i++) {
        const prev = p[(i - 1 + p.length) % p.length];
        const curr = p[i];
        const next = p[(i + 1) % p.length];
        const cpx1 = prev[0] + (curr[0] - p[(i - 2 + p.length) % p.length][0]) * 0.2;
        const cpy1 = prev[1] + (curr[1] - p[(i - 2 + p.length) % p.length][1]) * 0.2;
        const cpx2 = curr[0] - (next[0] - prev[0]) * 0.2;
        const cpy2 = curr[1] - (next[1] - prev[1]) * 0.2;
        d += ` C${cpx1},${cpy1} ${cpx2},${cpy2} ${curr[0]},${curr[1]}`;
    }
    d += ' Z';
    _cachedLandmassPath = d;
    return d;
}

// Grid-based cache for _pointInLandmass — avoids repeated ray-cast over 112 polygon vertices.
// Grid cells are 10px wide; each cell is tested once and cached.
var _landmassGrid = new Map();

function _pointInLandmass(px, py) {
    // Quantize to 10px grid for cache lookup
    const key = (Math.floor(px / 10) << 16) | (Math.floor(py / 10) & 0xFFFF);
    const cached = _landmassGrid.get(key);
    if (cached !== undefined) return cached;
    const result = _pointInLandmassRaw(px, py);
    _landmassGrid.set(key, result);
    return result;
}

function _pointInLandmassRaw(px, py) {
    const pts = LANDMASS_POINTS;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi)
            inside = !inside;
    }
    return inside;
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
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `rgba(0,0,0,${strength})`);
        grad.addColorStop(flatZone, `rgba(0,0,0,${strength})`);
        grad.addColorStop(flatZone + 0.2, `rgba(0,0,0,${strength * 0.4})`);
        grad.addColorStop(flatZone + 0.35, `rgba(0,0,0,${strength * 0.08})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
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
    ctx.fillStyle = 'rgba(58, 40, 16, 0.04)';
    for (let i = 0; i < 250; i++) {
        const nx = srand(i * 73 + 11) * W;
        const ny = srand(i * 79 + 17) * H;
        const cr = 0.4 + srand(i * 83) * 0.7;
        ctx.beginPath();
        ctx.arc(nx, ny, cr, 0, Math.PI * 2);
        ctx.fill();
    }

    // Crosshatch lines
    ctx.strokeStyle = 'rgba(58, 40, 16, 0.03)';
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
    _updateScaleBar();
    // Focal-point zoom: keep the screen point (focalX, focalY) over the same map point
    if (focalX !== undefined && focalY !== undefined) {
        // Map point under focal: mapX = (focalX - panX) / oldZoom
        const mapX = (focalX - S.panX) / oldZoom;
        const mapY = (focalY - S.panY) / oldZoom;
        S.panX = focalX - mapX * S.zoom;
        S.panY = focalY - mapY * S.zoom;
    }
    _updateMinimap();
    // Toggle zoom-out class for disabling animations on distant views
    document.body.classList.toggle('zoom-out', _zoomIdx <= 1);
    if (typeof window._zoomBtnUpdate === 'function') window._zoomBtnUpdate();
}

function _updateScaleBar() {
    const bar = document.getElementById('scale-bar');
    if (!bar) return;
    const lvl = ZOOM_LEVELS[_zoomIdx];
    const turnsLabel = document.getElementById('scale-turns');
    const levelLabel = document.getElementById('scale-level');
    if (levelLabel) levelLabel.textContent = lvl.label;
    // Pulse scale bar on zoom change
    var _sc = document.getElementById('scale-container');
    if (_sc) { _sc.classList.add('pulse'); setTimeout(function() { _sc.classList.remove('pulse'); }, 400); }
    // Fixed visual bar width (~60px), compute how many turns it represents
    const BAR_PX = 60;
    const ppt = _getAvgPxPerTurn();
    const svgPx = BAR_PX / lvl.zoom; // bar width in SVG space
    const turns = svgPx / ppt;        // how many turns the bar represents
    // Round to nearest nice number
    const niceT = turns < 0.8 ? '½' : turns < 1.5 ? '1' : turns < 2.5 ? '2' : turns < 4 ? '3' : turns < 6 ? '5' : Math.round(turns).toString();
    if (turnsLabel) turnsLabel.textContent = `~${niceT} turno${niceT !== '1' && niceT !== '½' ? 's' : ''}`;
    bar.style.width = BAR_PX + 'px';
    const ticks = document.getElementById('scale-ticks');
    if (ticks) ticks.style.width = BAR_PX + 'px';
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
        _updateScaleBar();
        document.body.classList.toggle('zoom-out', _zoomIdx <= 1);
        wr.style.transform = `translate(${S.panX}px,${S.panY}px) scale(${S.zoom})`;
        if (typeof window._zoomBtnUpdate === 'function') window._zoomBtnUpdate();
        return;
    }
    _panZoomInitialized = true;
    let pan = false, moved = false, sx = 0, sy = 0, scx = 0, scy = 0, ipd = 0, iIdx = 0;
    // Velocity tracking for inertia
    let _velX = 0, _velY = 0, _lastMoveT = 0, _lastMoveX = 0, _lastMoveY = 0;
    // Minimap debounce
    let _mmDebounce = null;
    function _debouncedMinimap() {
        if (_mmDebounce) return;
        _mmDebounce = setTimeout(() => { _mmDebounce = null; _updateMinimap(); }, 80);
    }
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
    _updateScaleBar();

    vp.addEventListener('pointerdown', e => {
        pan = true; moved = false;
        wr.classList.add('panning');
        wr.classList.remove('inertia');
        sx = e.clientX - S.panX; sy = e.clientY - S.panY;
        scx = e.clientX; scy = e.clientY;
        _velX = 0; _velY = 0;
        _lastMoveX = e.clientX; _lastMoveY = e.clientY; _lastMoveT = performance.now();
    });
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
            clamp(); apply(); _debouncedMinimap();
        }
    }, { passive: true });
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
            _debouncedMinimap();
            setTimeout(() => wr.classList.remove('inertia'), 650);
        }
    });
    vp.addEventListener('pointercancel', () => { pan = false; wr.classList.remove('panning'); wr.classList.remove('inertia'); });
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
    });
    // Pinch zoom: snap to discrete levels
    vp.addEventListener('touchstart', e => { if (e.touches.length === 2) { ipd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); iIdx = _zoomIdx; } }, { passive: true });
    vp.addEventListener('touchmove', e => { if (e.touches.length === 2 && ipd > 0) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); const ratio = d / ipd; const vpR = vp.getBoundingClientRect(); const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - vpR.left; const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - vpR.top; if (ratio > 1.3 && _zoomIdx < ZOOM_LEVELS.length - 1) { _snapToZoomLevel(1, midX, midY); ipd = d; clamp(); apply(); } else if (ratio < 0.7 && _zoomIdx > 0) { _snapToZoomLevel(-1, midX, midY); ipd = d; clamp(); apply(); } } }, { passive: true });
    // Mouse wheel: snap to discrete levels (debounced to prevent jitter)
    let _wheelTimer = null;
    vp.addEventListener('wheel', e => {
        e.preventDefault();
        if (_wheelTimer) return;
        const vpR = vp.getBoundingClientRect();
        _snapToZoomLevel(e.deltaY > 0 ? -1 : 1, e.clientX - vpR.left, e.clientY - vpR.top);
        clamp(); apply();
        _wheelTimer = setTimeout(() => { _wheelTimer = null; }, 200);
    }, { passive: false });
    vp.addEventListener('click', e => { if (e.target === vp || e.target === wr || e.target.tagName === 'rect') closeInfoPanel(); });
    apply();

    // --- Zoom +/- buttons ---
    const btnIn = document.getElementById('btn-zoom-in');
    const btnOut = document.getElementById('btn-zoom-out');
    const btnRec = document.getElementById('btn-recenter');
    function _updateZoomBtns() {
        if (btnIn) btnIn.disabled = _zoomIdx >= ZOOM_LEVELS.length - 1;
        if (btnOut) btnOut.disabled = _zoomIdx <= 0;
    }
    if (btnIn) btnIn.addEventListener('click', e => { e.stopPropagation(); _snapToZoomLevel(1); clamp(); apply(); _updateZoomBtns(); if (typeof _haptic === 'function') _haptic('tap'); btnIn.classList.add('flash'); setTimeout(() => btnIn.classList.remove('flash'), 300); });
    if (btnOut) btnOut.addEventListener('click', e => { e.stopPropagation(); _snapToZoomLevel(-1); clamp(); apply(); _updateZoomBtns(); if (typeof _haptic === 'function') _haptic('tap'); btnOut.classList.add('flash'); setTimeout(() => btnOut.classList.remove('flash'), 300); });
    if (btnRec) btnRec.addEventListener('click', e => { e.stopPropagation(); centerOnLocation(S.currentLoc); apply(); _updateMinimap(); if (typeof _haptic === 'function') _haptic('tap'); });
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

var _mmFadeTimer = null;
var _mmClickBound = false;

function _initMinimap() {
    const mm = document.getElementById('minimap');
    const svg = document.getElementById('minimap-svg');
    if (!mm || !svg) return;
    svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
    // Draw landmass silhouette
    svg.innerHTML = '';
    svg.appendChild(_el('rect', { x: 0, y: 0, width: SVG_W, height: SVG_H, fill: MAP_BG }));
    svg.appendChild(_el('path', { d: _landmassPath(), fill: PARCHMENT, 'fill-opacity': 0.4, stroke: 'none' }));
    // Location dots
    const discoveredSet = new Set(S.discoveredLocs || []);
    for (const [locId, coords] of Object.entries(LOCATION_COORDS)) {
        if (!S.knownLocs.includes(locId)) continue;
        const { x, y } = hexToPixel(coords.col, coords.row);
        const isCurr = locId === S.currentLoc;
        const isExp = discoveredSet.has(locId);
        svg.appendChild(_el('circle', {
            cx: x, cy: y, r: isCurr ? 8 : 4,
            fill: isCurr ? '#c4953a' : isExp ? INK_LIGHT : INK_DARK,
            'fill-opacity': isCurr ? 0.9 : isExp ? 0.5 : 0.25,
        }));
    }
    // Viewport rectangle (updated dynamically)
    svg.appendChild(_el('rect', { class: 'mm-viewport', x: 0, y: 0, width: 100, height: 100 }));
    // Tap on minimap to recenter (bind only once)
    if (_mmClickBound) { _updateMinimap(); return; }
    _mmClickBound = true;
    mm.addEventListener('click', e => {
        const r = svg.getBoundingClientRect();
        const mx = (e.clientX - r.left) / r.width * SVG_W;
        const my = (e.clientY - r.top) / r.height * SVG_H;
        const vp = document.getElementById('map-viewport');
        S.panX = (vp.clientWidth / 2) - mx * S.zoom;
        S.panY = (vp.clientHeight / 2) - my * S.zoom;
        const mw = SVG_W * S.zoom, mh = SVG_H * S.zoom;
        if (mw > vp.clientWidth) S.panX = Math.max(vp.clientWidth - mw, Math.min(0, S.panX));
        else S.panX = (vp.clientWidth - mw) / 2;
        if (mh > vp.clientHeight) S.panY = Math.max(vp.clientHeight - mh, Math.min(0, S.panY));
        else S.panY = (vp.clientHeight - mh) / 2;
        document.getElementById('map-wrapper').style.transform = `translate(${S.panX}px,${S.panY}px) scale(${S.zoom})`;
        saveViewport();
        _updateMinimap();
    });
    _updateMinimap();
}

function _updateMinimap() {
    const mm = document.getElementById('minimap');
    if (!mm) return;
    // Only show at zoom >= Área (index 2+)
    const show = _zoomIdx >= 2;
    mm.classList.toggle('visible', show);
    if (!show) return;
    // Update viewport rect
    const vp = document.getElementById('map-viewport');
    const vpRect = mm.querySelector('.mm-viewport');
    if (!vpRect || !vp) return;
    const rx = Math.max(0, -S.panX / S.zoom);
    const ry = Math.max(0, -S.panY / S.zoom);
    const rw = Math.min(vp.clientWidth / S.zoom, SVG_W - rx);
    const rh = Math.min(vp.clientHeight / S.zoom, SVG_H - ry);
    vpRect.setAttribute('x', rx);
    vpRect.setAttribute('y', ry);
    vpRect.setAttribute('width', Math.max(0, rw));
    vpRect.setAttribute('height', Math.max(0, rh));
    // Auto-fade after 3s of no interaction
    mm.classList.remove('fading');
    clearTimeout(_mmFadeTimer);
    _mmFadeTimer = setTimeout(() => { mm.classList.add('fading'); }, 3000);
}

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

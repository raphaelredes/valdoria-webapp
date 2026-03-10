// ===============================================================
// NAVIGATE MAP — Orchestrator, defs, ocean, landmass, pan/zoom
// Hand-drawn medieval cartography: ink on dark parchment
// ===============================================================

const NS = 'http://www.w3.org/2000/svg';

function srand(seed) {
    let x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
}

// Ink color constants (dark parchment palette)
const INK = '#8a6a3a';        // Sepia ink (main strokes)
const INK_DARK = '#3a2810';   // Dark brown ink (hatching, details)
const INK_LIGHT = '#a08050';  // Light sepia (subtle marks)
const PARCHMENT = '#6a5a42';  // Land parchment (warmer, lighter base)
const MAP_BG = '#2a2420';     // Dark background outside the map

// Parchment paper outline (roughly rectangular with worn/torn edges)
const LANDMASS_POINTS = (() => {
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
let _cachedLandmassPath = null;
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
const _landmassGrid = new Map();

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
const RIVER_PATHS = [
    { pts: [[300,55],[275,105],[245,165],[215,240],[225,300],[245,350],[265,385]], w: 1.8 },
    { pts: [[475,210],[468,270],[462,330],[468,385],[478,430],[488,465]], w: 1.4 },
];

function _renderRivers(svg) {
    const rG = _el('g', { class: 'rivers', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    for (const river of RIVER_PATHS) {
        const p = river.pts;
        // Build base path
        let d = `M${p[0][0]},${p[0][1]}`;
        for (let i = 1; i < p.length; i++) {
            const wobX = (srand(i * 37 + p[0][0]) - 0.5) * 8;
            const wobY = (srand(i * 41 + p[0][1]) - 0.5) * 6;
            d += ` Q${(p[i-1][0]+p[i][0])/2+wobX},${(p[i-1][1]+p[i][1])/2+wobY} ${p[i][0]},${p[i][1]}`;
        }
        // Center line
        rG.appendChild(_el('path', { d, fill: 'none', stroke: INK,
            'stroke-width': river.w * 0.5, 'stroke-opacity': 0.4, 'stroke-linecap': 'round' }));
        // Two parallel side lines (medieval river convention)
        for (const side of [-1, 1]) {
            let dSide = '';
            for (let i = 0; i < p.length; i++) {
                const prev = i > 0 ? p[i-1] : p[0];
                const curr = p[i];
                const dx = i < p.length-1 ? p[i+1][0] - curr[0] : curr[0] - prev[0];
                const dy = i < p.length-1 ? p[i+1][1] - curr[1] : curr[1] - prev[1];
                const len = Math.sqrt(dx*dx + dy*dy) || 1;
                const nx = -dy/len * side * 2.0;
                const ny = dx/len * side * 2.0;
                if (i === 0) dSide = `M${curr[0]+nx},${curr[1]+ny}`;
                else {
                    const wobX = (srand(i * 37 + p[0][0] + side*100) - 0.5) * 6;
                    const wobY = (srand(i * 41 + p[0][1] + side*100) - 0.5) * 5;
                    const mx = (prev[0]+curr[0])/2 + nx + wobX;
                    const my = (prev[1]+curr[1])/2 + ny + wobY;
                    dSide += ` Q${mx},${my} ${curr[0]+nx},${curr[1]+ny}`;
                }
            }
            rG.appendChild(_el('path', { d: dSide, fill: 'none', stroke: INK,
                'stroke-width': 0.35, 'stroke-opacity': 0.25, 'stroke-linecap': 'round' }));
        }
        // Source tick marks
        const s0 = p[0];
        rG.appendChild(_el('line', { x1: s0[0]-3, y1: s0[1], x2: s0[0]+3, y2: s0[1],
            stroke: INK, 'stroke-width': 0.4, 'stroke-opacity': 0.3 }));
    }
    svg.appendChild(rG);
}

// Fog state cache — invalidated by _invalidateMapCaches()
let _cachedFogState = null;
let _prevFogState = null; // Track previous state for reveal animations

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
// RENDER MAP
// ===============================================================

// Yield control to browser so CSS animations stay smooth
function _yieldFrame() {
    return new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

// Async progressive render — used on initial load with loading screen
// Strategy: render functional map first (landmass + terrain + roads + locations),
// show to player, then add expensive decorative layers (worn edges, aging,
// SVG filters) in the background after loading screen hides.
async function renderMapAsync(onProgress) {
    const svg = document.getElementById('map-svg');
    svg.setAttribute('width', SVG_W);
    svg.setAttribute('height', SVG_H);
    svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
    svg.innerHTML = '';
    const fogState = computeFogState(true);

    // Phase 1: Foundation (defs, background, landmass) — lightweight
    const defs = _el('defs');
    _buildAllDefs(defs);
    svg.appendChild(defs);
    _renderBackground(svg);
    _renderLandmass(svg);
    if (onProgress) onProgress(25);
    await _yieldFrame();

    // Phase 2: Essential map (biome colors, rivers, roads, locations)
    // This is what the player NEEDS to navigate — skip ground cover & terrain details
    _renderRivers(svg);
    renderTerrainRegions(svg, fogState);
    const roadG = _el('g', { class: 'roads-layer' });
    renderRoads(roadG, fogState);
    svg.appendChild(roadG);
    if (onProgress) onProgress(55);
    await _yieldFrame();

    // Phase 3: Location markers + interactive elements
    const locG = _el('g', { class: 'locations-layer' });
    renderLocationMarkers(locG, fogState);
    svg.appendChild(locG);
    if (typeof renderDistanceRings === 'function') renderDistanceRings(svg);
    if (typeof renderBreadcrumbTrail === 'function') renderBreadcrumbTrail(svg);
    renderPlayerBanner(svg);
    renderFogWisps(svg, fogState);
    renderCompassRose();
    setupPanZoom();
    if (onProgress) onProgress(100);

    // Phase 4 (deferred): ALL decorative/texture layers rendered AFTER loading hides.
    // Staggered across multiple frames to avoid a single heavy frame that causes jank.
    // Total deferred: ~2200+ SVG elements (worn edges, aging, ground cover, terrain details, decor)
    _deferDecorativeLayers(svg, fogState);
}

// Staggered deferred rendering — spreads heavy work across multiple frames
function _deferDecorativeLayers(svg, fogState) {
    // Frame 1: Worn edges + aging (insert behind terrain but above landmass)
    requestAnimationFrame(() => {
        const terrainRegions = svg.querySelector('.terrain-regions') || svg.querySelector('.roads-layer');

        // Use cached HTML if available (worn edges + aging are fully static)
        if (_decorCache.wornHTML && _decorCache.agingHTML) {
            const wrapper = _el('g');
            wrapper.innerHTML = _decorCache.wornHTML + _decorCache.agingHTML;
            while (wrapper.firstChild) {
                if (terrainRegions) svg.insertBefore(wrapper.firstChild, terrainRegions);
                else svg.appendChild(wrapper.firstChild);
            }
        } else {
            const frag = document.createDocumentFragment();
            const wornG = _el('g', { class: 'worn-edges-deferred', 'pointer-events': 'none' });
            _renderWornEdgesInto(wornG);
            frag.appendChild(wornG);
            _decorCache.wornHTML = wornG.outerHTML;
            const agingG = _el('g', { class: 'aging-deferred' });
            _renderAgingEffectsInto(agingG);
            frag.appendChild(agingG);
            _decorCache.agingHTML = agingG.outerHTML;
            if (terrainRegions) svg.insertBefore(frag, terrainRegions);
            else svg.appendChild(frag);
        }

        // Frame 2: Ground cover (subtle background texture, insert before terrain regions)
        requestAnimationFrame(() => {
            const insertBefore = svg.querySelector('.terrain-regions') || svg.querySelector('.roads-layer');
            renderGroundCover(svg, insertBefore);

            // Frame 3: Terrain details (trees, mountains — heaviest single layer)
            requestAnimationFrame(() => {
                renderTerrainDetails(svg, fogState, svg.querySelector('.roads-layer'));
                // Frame 4: Cartography decorations (corner flourishes)
                requestAnimationFrame(() => {
                    renderCartographyDecor(svg, fogState);
                });
            });
        });
    });
}

// ── Decorative layer cache — worn edges + aging are fully static ──
let _decorCache = { wornHTML: null, agingHTML: null };

function _invalidateDecorCache() {
    _decorCache.wornHTML = null;
    _decorCache.agingHTML = null;
}

// Synchronous render — used for re-renders (visibility refresh, no loading screen)
function renderMap() {
    const svg = document.getElementById('map-svg');
    svg.setAttribute('width', SVG_W);
    svg.setAttribute('height', SVG_H);
    svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
    svg.innerHTML = '';
    const fogState = computeFogState(true);
    const defs = _el('defs');
    _buildAllDefs(defs);
    svg.appendChild(defs);

    _renderBackground(svg);
    _renderLandmass(svg);

    // Worn edges + aging: use cached HTML if available (these are fully static)
    if (_decorCache.wornHTML) {
        svg.insertAdjacentHTML('beforeend', _decorCache.wornHTML);
    } else {
        const wG = _el('g', { class: 'worn-edges', 'pointer-events': 'none' });
        _renderWornEdgesImpl(wG);
        svg.appendChild(wG);
        _decorCache.wornHTML = wG.outerHTML;
    }
    if (_decorCache.agingHTML) {
        svg.insertAdjacentHTML('beforeend', _decorCache.agingHTML);
    } else {
        const aG = _el('g', { class: 'aging', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
        _renderAgingEffectsImpl(aG);
        svg.appendChild(aG);
        _decorCache.agingHTML = aG.outerHTML;
    }

    renderGroundCover(svg);
    _renderRivers(svg);
    renderTerrainRegions(svg, fogState);
    renderTerrainDetails(svg, fogState);
    const roadG = _el('g', { class: 'roads-layer' });
    renderRoads(roadG, fogState);
    svg.appendChild(roadG);
    const locG = _el('g', { class: 'locations-layer' });
    renderLocationMarkers(locG, fogState);
    svg.appendChild(locG);
    if (typeof renderDistanceRings === 'function') renderDistanceRings(svg);
    if (typeof renderBreadcrumbTrail === 'function') renderBreadcrumbTrail(svg);
    renderPlayerBanner(svg);
    renderFogWisps(svg, fogState);
    renderCartographyDecor(svg, fogState);
    renderCompassRose();
    setupPanZoom();
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
// BACKGROUND — Flat dark fill outside the parchment paper
// ===============================================================

function _renderBackground(svg) {
    svg.appendChild(_el('rect', { x: 0, y: 0, width: SVG_W, height: SVG_H, fill: MAP_BG }));
}

// ===============================================================
// LANDMASS — Flat parchment, no gradient
// ===============================================================

function _renderLandmass(svg) {
    const path = _landmassPath();
    // Flat parchment fill
    svg.appendChild(_el('path', { d: path, fill: PARCHMENT, stroke: 'none' }));
    // Subtle stipple dots for texture — batched into single <path>
    let stipD = '';
    for (let i = 0; i < 30; i++) {
        const dx = srand(i * 73 + 11) * SVG_W;
        const dy = srand(i * 79 + 17) * SVG_H;
        if (!_pointInLandmass(dx, dy)) continue;
        const cr = 0.6 + srand(i * 83) * 0.5;
        stipD += `M${dx-cr},${dy}a${cr},${cr} 0 1,0 ${cr*2},0a${cr},${cr} 0 1,0 ${-cr*2},0`;
    }
    if (stipD) {
        svg.appendChild(_el('path', { d: stipD, fill: INK_DARK, 'fill-opacity': 0.05,
            'clip-path': 'url(#land-clip)', 'pointer-events': 'none' }));
    }
}

// ===============================================================
// WORN PARCHMENT EDGES — Torn, burnt, aged paper border
// ===============================================================

// Render worn edges into a target group (for deferred rendering)
function _renderWornEdgesInto(targetG) {
    _renderWornEdgesImpl(targetG);
}

function _renderWornEdges(svg) {
    const eG = _el('g', { class: 'worn-edges', 'pointer-events': 'none' });
    _renderWornEdgesImpl(eG);
    svg.appendChild(eG);
}

function _renderWornEdgesImpl(eG) {
    const path = _landmassPath();
    const p = LANDMASS_POINTS;

    // === Layer 1: Deep shadow under the paper (multi-stroke, no GPU filter) ===
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#0a0806',
        'stroke-width': 22, 'stroke-opacity': 0.10 }));
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#0a0806',
        'stroke-width': 16, 'stroke-opacity': 0.18 }));
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#1a1410',
        'stroke-width': 12, 'stroke-opacity': 0.22 }));
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#1a1410',
        'stroke-width': 8, 'stroke-opacity': 0.30 }));

    // === Layer 2: Burnt/darkened edge staining (multiple bands for depth) ===
    // Wide darkened band (deep age stain)
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#2a1808',
        'stroke-width': 14, 'stroke-opacity': 0.12 }));
    // Medium stain band
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#3a2810',
        'stroke-width': 8, 'stroke-opacity': 0.2 }));
    // Narrow dark edge
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#4a3820',
        'stroke-width': 4, 'stroke-opacity': 0.25 }));
    // Inner edge darkening (visible on parchment side)
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#3a2810',
        'stroke-width': 2, 'stroke-opacity': 0.15 }));

    // === Layer 3: Main border line (irregular, hand-drawn feel) ===
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: INK_DARK,
        'stroke-width': 2.0, 'stroke-opacity': 0.65 }));

    // === Layer 4: Paper fiber wisps — batched into 3 opacity-bucket <path>s ===
    const fiberBuckets = ['', '', '']; // low (0.12-0.17), mid (0.17-0.22), high (0.22-0.30)
    let strandD = '';
    for (let i = 0; i < p.length; i++) {
        const curr = p[i], next = p[(i + 1) % p.length];
        const dx = next[0] - curr[0], dy = next[1] - curr[1];
        const segLen = Math.sqrt(dx * dx + dy * dy);
        if (segLen < 1) continue;
        const nx = -dy / segLen, ny = dx / segLen;

        const fiberCount = 3 + Math.floor(srand(i * 67) * 4);
        for (let j = 0; j < fiberCount; j++) {
            const t = 0.05 + j * (0.9 / fiberCount) + (srand(i * 67 + j * 3) - 0.5) * 0.06;
            const bx = curr[0] + dx * t, by = curr[1] + dy * t;
            const fLen = 2 + srand(i * 100 + j) * 7;
            const fAngle = (srand(i * 53 + j * 7) - 0.5) * 0.8;
            const fnx = nx * Math.cos(fAngle) - ny * Math.sin(fAngle);
            const fny = nx * Math.sin(fAngle) + ny * Math.cos(fAngle);
            const op = 0.12 + srand(i * 83 + j) * 0.18;
            const bucket = op < 0.17 ? 0 : op < 0.22 ? 1 : 2;
            fiberBuckets[bucket] += `M${bx},${by}L${bx - fnx * fLen},${by - fny * fLen}`;
        }

        // Torn strands (reduced frequency)
        if (srand(i * 41) > 0.72) {
            const t = srand(i * 103) * 0.7 + 0.15;
            const bx = curr[0] + dx * t, by = curr[1] + dy * t;
            const sLen = 5 + srand(i * 107) * 10;
            const sAngle = (srand(i * 109) - 0.5) * 0.5;
            const snx = nx * Math.cos(sAngle) - ny * Math.sin(sAngle);
            const sny = nx * Math.sin(sAngle) + ny * Math.cos(sAngle);
            const mx = bx - snx * sLen * 0.5 + (srand(i * 111) - 0.5) * 4;
            const my = by - sny * sLen * 0.5 + (srand(i * 113) - 0.5) * 4;
            strandD += `M${bx},${by}Q${mx},${my} ${bx - snx * sLen},${by - sny * sLen}`;
        }
    }
    const fiberOps = [0.14, 0.19, 0.26];
    for (let b = 0; b < 3; b++) {
        if (fiberBuckets[b]) {
            eG.appendChild(_el('path', { d: fiberBuckets[b], fill: 'none', stroke: PARCHMENT,
                'stroke-width': 0.45, 'stroke-opacity': fiberOps[b], 'stroke-linecap': 'round' }));
        }
    }
    if (strandD) {
        eG.appendChild(_el('path', { d: strandD, fill: 'none', stroke: PARCHMENT,
            'stroke-width': 0.55, 'stroke-opacity': 0.14, 'stroke-linecap': 'round' }));
    }

    // === Layer 5: Edge stain dots + burn marks — batched into <path>s ===
    let foxingD = '', burnD = '';
    for (let i = 0; i < p.length; i++) {
        const curr = p[i], next = p[(i + 1) % p.length];
        const dx = next[0] - curr[0], dy = next[1] - curr[1];
        const segLen = Math.sqrt(dx * dx + dy * dy);
        if (segLen < 1) continue;
        const nx = -dy / segLen, ny = dx / segLen;

        if (srand(i * 91) > 0.35) {
            const t = srand(i * 103) * 0.8 + 0.1;
            const sx = curr[0] + dx * t + nx * (srand(i * 121) - 0.5) * 4;
            const sy = curr[1] + dy * t + ny * (srand(i * 123) - 0.5) * 4;
            const cr = 1.2 + srand(i * 107) * 2.5;
            foxingD += `M${sx-cr},${sy}a${cr},${cr} 0 1,0 ${cr*2},0a${cr},${cr} 0 1,0 ${-cr*2},0`;
        }
        if (srand(i * 131) > 0.8) {
            const t = srand(i * 133) * 0.6 + 0.2;
            const bkx = curr[0] + dx * t + nx * 3;
            const bky = curr[1] + dy * t + ny * 3;
            const cr = 2 + srand(i * 137) * 4;
            burnD += `M${bkx-cr},${bky}a${cr},${cr} 0 1,0 ${cr*2},0a${cr},${cr} 0 1,0 ${-cr*2},0`;
        }
    }
    if (foxingD) eG.appendChild(_el('path', { d: foxingD, fill: '#2a1a08', 'fill-opacity': 0.08, stroke: 'none' }));
    if (burnD) eG.appendChild(_el('path', { d: burnD, fill: '#1a0e04', 'fill-opacity': 0.05, stroke: 'none' }));

    // === Layer 6: Torn-away fragments (kept as polygons, reduced from 20 to 12) ===
    for (let i = 0; i < 12; i++) {
        const idx = Math.floor(srand(i * 137) * p.length);
        const curr = p[idx], next = p[(idx + 1) % p.length];
        const dx = next[0] - curr[0], dy = next[1] - curr[1];
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const t = 0.2 + srand(i * 149) * 0.6;
        const dist = 3 + srand(i * 151) * 8;
        const fx = curr[0] + dx * t - nx * dist;
        const fy = curr[1] + dy * t - ny * dist;
        const fr = 1.5 + srand(i * 163) * 3;
        const nVerts = 5 + Math.floor(srand(i * 165) * 3);
        const fpts = [];
        for (let k = 0; k < nVerts; k++) {
            const a = (k / nVerts) * Math.PI * 2;
            const rr = fr * (0.5 + srand(i * 100 + k * 31) * 1.0);
            fpts.push(`${fx + Math.cos(a) * rr},${fy + Math.sin(a) * rr}`);
        }
        eG.appendChild(_el('polygon', {
            points: fpts.join(' '),
            fill: PARCHMENT, 'fill-opacity': 0.08 + srand(i * 167) * 0.12,
            stroke: INK_DARK, 'stroke-width': 0.25, 'stroke-opacity': 0.12,
        }));
    }

    // === Layer 7: Corner wear — batched into single <path> ===
    const corners = [
        [p[0][0], p[0][1]],
        [p[Math.floor(p.length * 0.25)][0], p[Math.floor(p.length * 0.25)][1]],
        [p[Math.floor(p.length * 0.5)][0], p[Math.floor(p.length * 0.5)][1]],
        [p[Math.floor(p.length * 0.75)][0], p[Math.floor(p.length * 0.75)][1]],
    ];
    let cornerD = '';
    for (let ci = 0; ci < corners.length; ci++) {
        const [cx, cy] = corners[ci];
        for (let j = 0; j < 8; j++) {
            const sx = cx + (srand(ci * 200 + j * 7) - 0.5) * 25;
            const sy = cy + (srand(ci * 200 + j * 7 + 3) - 0.5) * 25;
            const cr = 0.8 + srand(ci * 200 + j * 7 + 5) * 2;
            cornerD += `M${sx-cr},${sy}a${cr},${cr} 0 1,0 ${cr*2},0a${cr},${cr} 0 1,0 ${-cr*2},0`;
        }
    }
    if (cornerD) eG.appendChild(_el('path', { d: cornerD, fill: '#2a1a08', 'fill-opacity': 0.05, stroke: 'none' }));

}

// ===============================================================
// AGING EFFECTS — Stipple clusters + crease lines
// ===============================================================

// Render aging effects into a target group (for deferred rendering)
function _renderAgingEffectsInto(targetG) {
    targetG.setAttribute('class', 'aging');
    targetG.setAttribute('pointer-events', 'none');
    targetG.setAttribute('clip-path', 'url(#land-clip)');
    _renderAgingEffectsImpl(targetG);
}

function _renderAgingEffects(svg) {
    const aG = _el('g', { class: 'aging', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    _renderAgingEffectsImpl(aG);
    svg.appendChild(aG);
}

function _renderAgingEffectsImpl(aG) {
    // Stipple clusters (foxing spots) — batched into a single <path>
    const spots = [[80,60,15],[650,100,12],[200,650,18],[550,550,10],[400,200,8],[120,400,14],[600,350,11],[350,680,16],[500,80,9],[700,600,13]];
    let foxD = '';
    for (const [x, y, r] of spots) {
        for (let j = 0; j < 12; j++) {
            const sx = x + (srand(x * 7 + j * 13) - 0.5) * r * 2;
            const sy = y + (srand(y * 11 + j * 17) - 0.5) * r * 2;
            const cr = 0.4 + srand(x * 3 + j) * 0.5;
            foxD += `M${sx-cr},${sy}a${cr},${cr} 0 1,0 ${cr*2},0a${cr},${cr} 0 1,0 ${-cr*2},0`;
        }
    }
    if (foxD) aG.appendChild(_el('path', { d: foxD, fill: INK_DARK, 'fill-opacity': 0.04, stroke: 'none' }));

    // Crease lines — batched into a single <path>
    const creases = [
        [60, SVG_H * 0.35, SVG_W - 60, SVG_H * 0.38, 0.10],
        [SVG_W * 0.6, 40, SVG_W * 0.58, SVG_H - 40, 0.07],
        [100, SVG_H * 0.65, SVG_W - 100, SVG_H * 0.62, 0.06],
        [SVG_W * 0.3, 60, SVG_W * 0.32, SVG_H - 60, 0.05],
    ];
    let creaseD = '';
    for (const [x1, y1, x2, y2] of creases) {
        creaseD += `M${x1},${y1}L${x2},${y2}`;
    }
    if (creaseD) aG.appendChild(_el('path', { d: creaseD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': 0.07 }));
}

// ===============================================================
// PAN / ZOOM
// ===============================================================

// Discrete zoom levels: [full map, region, area, local]
const ZOOM_LEVELS = [
    { zoom: 0.85, label: 'Mapa',       turnsPerBar: 8 },
    { zoom: 1.15, label: 'Região',     turnsPerBar: 4 },
    { zoom: 1.6,  label: 'Área',       turnsPerBar: 2 },
    { zoom: 2.2,  label: 'Local',      turnsPerBar: 1 },
];
let _zoomIdx = 1; // Default to "Região" level

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

let _panZoomInitialized = false;
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
    vp.addEventListener('touchmove', e => { if (e.touches.length === 2 && ipd > 0) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); const ratio = d / ipd; if (ratio > 1.3 && _zoomIdx < ZOOM_LEVELS.length - 1) { _snapToZoomLevel(1); ipd = d; clamp(); apply(); } else if (ratio < 0.7 && _zoomIdx > 0) { _snapToZoomLevel(-1); ipd = d; clamp(); apply(); } } }, { passive: true });
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
    if (btnIn) btnIn.addEventListener('click', e => { e.stopPropagation(); _snapToZoomLevel(1); clamp(); apply(); _updateZoomBtns(); if (typeof _haptic === 'function') _haptic('tap'); });
    if (btnOut) btnOut.addEventListener('click', e => { e.stopPropagation(); _snapToZoomLevel(-1); clamp(); apply(); _updateZoomBtns(); if (typeof _haptic === 'function') _haptic('tap'); });
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

let _mmFadeTimer = null;
let _mmClickBound = false;

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
let _cachedPxPerTurn = 0;
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
const createSVG = _el;

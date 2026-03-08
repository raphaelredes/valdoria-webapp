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

function _landmassPath() {
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
    return d;
}

function _pointInLandmass(px, py) {
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
            'stroke-width': river.w * 0.5, 'stroke-opacity': 0.4, 'stroke-linecap': 'round',
            filter: 'url(#ink-wobble)' }));
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

function computeFogState() {
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
    return fog;
}

// ===============================================================
// RENDER MAP
// ===============================================================

function renderMap() {
    const svg = document.getElementById('map-svg');
    svg.setAttribute('width', SVG_W);
    svg.setAttribute('height', SVG_H);
    svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
    svg.innerHTML = '';
    const fogState = computeFogState();
    const defs = _el('defs');
    _buildAllDefs(defs);
    svg.appendChild(defs);

    _renderBackground(svg);
    _renderLandmass(svg);
    _renderWornEdges(svg);
    _renderAgingEffects(svg);
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
    // Fog blur (functional — keep for fog of war)
    const fb = _el('filter', { id: 'fog-blur', x: '-50%', y: '-50%', width: '200%', height: '200%' });
    fb.appendChild(_el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '3' }));
    defs.appendChild(fb);

    // Ink wobble — ESSENTIAL for hand-drawn effect (increased scale)
    const iw = _el('filter', { id: 'ink-wobble', x: '-5%', y: '-5%', width: '110%', height: '110%' });
    iw.appendChild(_el('feTurbulence', { type: 'turbulence', baseFrequency: '0.02', numOctaves: '2', seed: '5', result: 'w' }));
    iw.appendChild(_el('feDisplacementMap', { in: 'SourceGraphic', in2: 'w', scale: '4', xChannelSelector: 'R', yChannelSelector: 'G' }));
    defs.appendChild(iw);

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
    // Subtle stipple dots for texture
    const stG = _el('g', { 'clip-path': 'url(#land-clip)', 'pointer-events': 'none' });
    for (let i = 0; i < 80; i++) {
        const dx = srand(i * 73 + 11) * SVG_W;
        const dy = srand(i * 79 + 17) * SVG_H;
        if (!_pointInLandmass(dx, dy)) continue;
        stG.appendChild(_el('circle', {
            cx: dx, cy: dy, r: 0.6 + srand(i * 83) * 0.5,
            fill: INK_DARK, 'fill-opacity': 0.04 + srand(i * 89) * 0.04,
        }));
    }
    svg.appendChild(stG);
}

// ===============================================================
// WORN PARCHMENT EDGES — Torn, burnt, aged paper border
// ===============================================================

function _renderWornEdges(svg) {
    const path = _landmassPath();
    const eG = _el('g', { class: 'worn-edges', 'pointer-events': 'none' });
    const p = LANDMASS_POINTS;

    // === Layer 1: Deep shadow under the paper (gives depth/elevation) ===
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#0a0806',
        'stroke-width': 18, 'stroke-opacity': 0.25, filter: 'url(#fog-blur)' }));
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#1a1410',
        'stroke-width': 10, 'stroke-opacity': 0.35, filter: 'url(#fog-blur)' }));

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
        'stroke-width': 1.8, 'stroke-opacity': 0.65, filter: 'url(#ink-wobble)' }));

    // === Layer 4: Paper fiber wisps (fine lines radiating outward) ===
    for (let i = 0; i < p.length; i++) {
        const curr = p[i], next = p[(i + 1) % p.length];
        const dx = next[0] - curr[0], dy = next[1] - curr[1];
        const segLen = Math.sqrt(dx * dx + dy * dy);
        if (segLen < 1) continue;
        const nx = -dy / segLen, ny = dx / segLen; // outward normal

        // Fine fiber threads (3-6 per segment, radiating outward)
        const fiberCount = 3 + Math.floor(srand(i * 67) * 4);
        for (let j = 0; j < fiberCount; j++) {
            const t = 0.05 + j * (0.9 / fiberCount) + (srand(i * 67 + j * 3) - 0.5) * 0.06;
            const bx = curr[0] + dx * t, by = curr[1] + dy * t;
            const fLen = 2 + srand(i * 100 + j) * 7;
            const fAngle = (srand(i * 53 + j * 7) - 0.5) * 0.8;
            const fnx = nx * Math.cos(fAngle) - ny * Math.sin(fAngle);
            const fny = nx * Math.sin(fAngle) + ny * Math.cos(fAngle);
            // Fiber line (parchment colored, fading outward)
            eG.appendChild(_el('line', {
                x1: bx, y1: by,
                x2: bx - fnx * fLen, y2: by - fny * fLen,
                stroke: PARCHMENT, 'stroke-width': 0.3 + srand(i * 71 + j) * 0.5,
                'stroke-opacity': 0.12 + srand(i * 83 + j) * 0.18,
                'stroke-linecap': 'round',
            }));
        }

        // Thicker torn strands (1-2 per segment, longer)
        if (srand(i * 41) > 0.55) {
            const t = srand(i * 103) * 0.7 + 0.15;
            const bx = curr[0] + dx * t, by = curr[1] + dy * t;
            const sLen = 5 + srand(i * 107) * 10;
            const sAngle = (srand(i * 109) - 0.5) * 0.5;
            const snx = nx * Math.cos(sAngle) - ny * Math.sin(sAngle);
            const sny = nx * Math.sin(sAngle) + ny * Math.cos(sAngle);
            // Curving fiber strand
            const mx = bx - snx * sLen * 0.5 + (srand(i * 111) - 0.5) * 4;
            const my = by - sny * sLen * 0.5 + (srand(i * 113) - 0.5) * 4;
            eG.appendChild(_el('path', {
                d: `M${bx},${by} Q${mx},${my} ${bx - snx * sLen},${by - sny * sLen}`,
                fill: 'none', stroke: PARCHMENT,
                'stroke-width': 0.4 + srand(i * 117) * 0.4,
                'stroke-opacity': 0.1 + srand(i * 119) * 0.12,
                'stroke-linecap': 'round',
            }));
        }

        // === Layer 5: Edge stain dots (foxing / burn spots) ===
        if (srand(i * 91) > 0.35) {
            const t = srand(i * 103) * 0.8 + 0.1;
            const sx = curr[0] + dx * t + nx * (srand(i * 121) - 0.5) * 4;
            const sy = curr[1] + dy * t + ny * (srand(i * 123) - 0.5) * 4;
            eG.appendChild(_el('circle', {
                cx: sx, cy: sy, r: 1.2 + srand(i * 107) * 2.5,
                fill: '#2a1a08', 'fill-opacity': 0.06 + srand(i * 113) * 0.08,
            }));
        }
        // Darker burn marks (less frequent, larger)
        if (srand(i * 131) > 0.8) {
            const t = srand(i * 133) * 0.6 + 0.2;
            const bkx = curr[0] + dx * t + nx * 3;
            const bky = curr[1] + dy * t + ny * 3;
            eG.appendChild(_el('circle', {
                cx: bkx, cy: bky, r: 2 + srand(i * 137) * 4,
                fill: '#1a0e04', 'fill-opacity': 0.04 + srand(i * 139) * 0.05,
            }));
        }
    }

    // === Layer 6: Torn-away fragments (loose paper pieces near the edge) ===
    for (let i = 0; i < 20; i++) {
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
        // Irregular fragment shape (5-7 vertices)
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

    // === Layer 7: Corner wear detail (extra staining at worn corners) ===
    const corners = [
        [p[0][0], p[0][1]],                          // top-left area
        [p[Math.floor(p.length * 0.25)][0], p[Math.floor(p.length * 0.25)][1]], // top-right
        [p[Math.floor(p.length * 0.5)][0], p[Math.floor(p.length * 0.5)][1]],   // bottom-right
        [p[Math.floor(p.length * 0.75)][0], p[Math.floor(p.length * 0.75)][1]], // bottom-left
    ];
    for (let ci = 0; ci < corners.length; ci++) {
        const [cx, cy] = corners[ci];
        // Cluster of stain dots around each corner
        for (let j = 0; j < 8; j++) {
            const sx = cx + (srand(ci * 200 + j * 7) - 0.5) * 25;
            const sy = cy + (srand(ci * 200 + j * 7 + 3) - 0.5) * 25;
            eG.appendChild(_el('circle', {
                cx: sx, cy: sy, r: 0.8 + srand(ci * 200 + j * 7 + 5) * 2,
                fill: '#2a1a08', 'fill-opacity': 0.04 + srand(ci * 200 + j * 7 + 6) * 0.05,
            }));
        }
    }

    svg.appendChild(eG);
}

// ===============================================================
// AGING EFFECTS — Stipple clusters + crease lines
// ===============================================================

function _renderAgingEffects(svg) {
    const aG = _el('g', { class: 'aging', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    // Stipple clusters (foxing spots)
    const spots = [[80,60,15],[650,100,12],[200,650,18],[550,550,10],[400,200,8],[120,400,14],[600,350,11],[350,680,16],[500,80,9],[700,600,13]];
    for (const [x, y, r] of spots) {
        for (let j = 0; j < 12; j++) {
            const sx = x + (srand(x * 7 + j * 13) - 0.5) * r * 2;
            const sy = y + (srand(y * 11 + j * 17) - 0.5) * r * 2;
            aG.appendChild(_el('circle', {
                cx: sx, cy: sy, r: 0.4 + srand(x * 3 + j) * 0.5,
                fill: INK_DARK, 'fill-opacity': 0.03 + srand(x * 5 + j * 7) * 0.03,
            }));
        }
    }
    // Crease lines (more pronounced, more lines)
    const creases = [
        [60, SVG_H * 0.35, SVG_W - 60, SVG_H * 0.38, 0.7, 0.10],
        [SVG_W * 0.6, 40, SVG_W * 0.58, SVG_H - 40, 0.5, 0.07],
        [100, SVG_H * 0.65, SVG_W - 100, SVG_H * 0.62, 0.4, 0.06],
        [SVG_W * 0.3, 60, SVG_W * 0.32, SVG_H - 60, 0.35, 0.05],
    ];
    for (const [x1, y1, x2, y2, sw, op] of creases) {
        aG.appendChild(_el('line', { x1, y1, x2, y2, stroke: INK_DARK, 'stroke-width': sw, 'stroke-opacity': op }));
    }
    svg.appendChild(aG);
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

function _snapToZoomLevel(dir) {
    _zoomIdx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, _zoomIdx + dir));
    S.zoom = ZOOM_LEVELS[_zoomIdx].zoom;
    _updateScaleBar();
}

function _updateScaleBar() {
    const bar = document.getElementById('scale-bar');
    if (!bar) return;
    const lvl = ZOOM_LEVELS[_zoomIdx];
    const turnsLabel = document.getElementById('scale-turns');
    const levelLabel = document.getElementById('scale-level');
    if (turnsLabel) turnsLabel.textContent = `${lvl.turnsPerBar} turno${lvl.turnsPerBar > 1 ? 's' : ''}`;
    if (levelLabel) levelLabel.textContent = lvl.label;
    // Scale bar width proportional to zoom (wider at higher zoom = more detail)
    const barPx = Math.round(40 + (lvl.zoom - 0.85) * 25);
    bar.style.width = barPx + 'px';
}

function setupPanZoom() {
    const vp = document.getElementById('map-viewport');
    const wr = document.getElementById('map-wrapper');
    let pan = false, moved = false, sx = 0, sy = 0, scx = 0, scy = 0, ipd = 0, iIdx = 0;
    function apply() { wr.style.transform = `translate(${S.panX}px,${S.panY}px) scale(${S.zoom})`; saveViewport(); }
    function clamp() {
        const vpW = vp.clientWidth, vpH = vp.clientHeight;
        const mw = SVG_W * S.zoom, mh = SVG_H * S.zoom;
        // Allow panning so the map edge reaches the viewport edge (pan=0)
        // but not beyond (no empty space past the map border).
        // On the other side, the far edge of the map aligns with far edge of viewport.
        if (mw > vpW) {
            S.panX = Math.max(vpW - mw, Math.min(0, S.panX));
        } else {
            S.panX = (vpW - mw) / 2; // center
        }
        if (mh > vpH) {
            S.panY = Math.max(vpH - mh, Math.min(0, S.panY));
        } else {
            S.panY = (vpH - mh) / 2; // center
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

    vp.addEventListener('pointerdown', e => { pan = true; moved = false; sx = e.clientX - S.panX; sy = e.clientY - S.panY; scx = e.clientX; scy = e.clientY; });
    vp.addEventListener('pointermove', e => { if (!pan) return; if (Math.abs(e.clientX - scx) > 5 || Math.abs(e.clientY - scy) > 5) moved = true; if (moved) { S.panX = e.clientX - sx; S.panY = e.clientY - sy; clamp(); apply(); } });
    vp.addEventListener('pointerup', () => { pan = false; });
    vp.addEventListener('pointercancel', () => { pan = false; });
    // Pinch zoom: snap to discrete levels
    vp.addEventListener('touchstart', e => { if (e.touches.length === 2) { ipd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); iIdx = _zoomIdx; } }, { passive: true });
    vp.addEventListener('touchmove', e => { if (e.touches.length === 2 && ipd > 0) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); const ratio = d / ipd; if (ratio > 1.3 && _zoomIdx < ZOOM_LEVELS.length - 1) { _snapToZoomLevel(1); ipd = d; clamp(); apply(); } else if (ratio < 0.7 && _zoomIdx > 0) { _snapToZoomLevel(-1); ipd = d; clamp(); apply(); } } }, { passive: true });
    // Mouse wheel: snap to discrete levels (debounced to prevent jitter)
    let _wheelTimer = null;
    vp.addEventListener('wheel', e => {
        e.preventDefault();
        if (_wheelTimer) return; // ignore rapid successive events
        _snapToZoomLevel(e.deltaY > 0 ? -1 : 1); clamp(); apply();
        _wheelTimer = setTimeout(() => { _wheelTimer = null; }, 200);
    }, { passive: false });
    vp.addEventListener('click', e => { if (e.target === vp || e.target === wr || e.target.tagName === 'rect') closeInfoPanel(); });
    apply();
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

function _el(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
}
const createSVG = _el;

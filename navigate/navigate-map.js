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
const PARCHMENT = '#5a4a38';  // Land parchment
const OCEAN_BG = '#4a3a2a';   // Ocean (darker than land)

// Landmass outline (organic continent shape enclosing all locations)
const LANDMASS_POINTS = (() => {
    const pts = [
        [240, 25], [310, 15], [380, 22],
        [440, 45], [520, 70], [570, 110], [600, 160],
        [620, 210], [635, 270], [640, 320], [630, 370],
        [635, 410], [640, 460], [630, 510], [625, 560],
        [610, 600], [580, 640], [540, 660],
        [480, 670], [420, 680], [360, 675], [300, 670],
        [240, 660], [190, 640],
        [140, 610], [110, 560], [90, 510],
        [80, 450], [75, 400], [70, 350], [75, 300],
        [85, 250], [95, 200],
        [110, 150], [130, 100], [160, 60], [200, 35],
    ];
    return pts.map(([x, y], i) => {
        const wx = (srand(i * 17 + 3) - 0.5) * 12;
        const wy = (srand(i * 23 + 7) - 0.5) * 10;
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

    _renderOcean(svg);
    _renderLandmass(svg);
    _renderCoastline(svg);
    _renderAgingEffects(svg);
    renderOrnamentBorder(svg);
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
    renderCompassRose(svg);
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

    // Ocean wave pattern (hand-drawn parallel lines)
    const wp = _el('pattern', { id: 'ocean-waves', width: '40', height: '14', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(-3)' });
    wp.appendChild(_el('path', { d: 'M0,7 Q10,3 20,7 Q30,11 40,7', fill: 'none', stroke: INK, 'stroke-width': '0.5', 'stroke-opacity': '0.12' }));
    wp.appendChild(_el('path', { d: 'M0,12 Q10,8 20,12 Q30,16 40,12', fill: 'none', stroke: INK, 'stroke-width': '0.3', 'stroke-opacity': '0.07' }));
    defs.appendChild(wp);

    // Landmass clip path
    defs.appendChild(_el('clipPath', { id: 'land-clip' })).appendChild(_el('path', { d: _landmassPath() }));
}

// ===============================================================
// OCEAN — Dark parchment with ink wave lines
// ===============================================================

function _renderOcean(svg) {
    // Flat dark parchment base
    svg.appendChild(_el('rect', { x: 0, y: 0, width: SVG_W, height: SVG_H, fill: OCEAN_BG }));
    // Wave pattern overlay
    svg.appendChild(_el('rect', { x: 0, y: 0, width: SVG_W, height: SVG_H, fill: 'url(#ocean-waves)' }));
    // Scattered hand-drawn wave crests
    const wG = _el('g', { 'pointer-events': 'none', opacity: '0.14' });
    for (let i = 0; i < 25; i++) {
        const wx = srand(i * 37 + 5) * SVG_W;
        const wy = srand(i * 41 + 11) * SVG_H;
        if (_pointInLandmass(wx, wy)) continue; // Only in ocean
        const wl = 10 + srand(i * 53) * 15;
        const wobble = (srand(i * 61) - 0.5) * 3;
        wG.appendChild(_el('path', {
            d: `M${wx},${wy} Q${wx + wl * 0.5},${wy - 2 + wobble} ${wx + wl},${wy}`,
            fill: 'none', stroke: INK, 'stroke-width': 0.5, 'stroke-linecap': 'round',
        }));
    }
    svg.appendChild(wG);
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
// COASTLINE — Dense ink hatching (enhanced)
// ===============================================================

function _renderCoastline(svg) {
    const path = _landmassPath();
    const cG = _el('g', { class: 'coastline', 'pointer-events': 'none' });
    // Main coastline ink stroke
    cG.appendChild(_el('path', { d: path, fill: 'none', stroke: INK_DARK, 'stroke-width': 2.5, 'stroke-opacity': 0.65, filter: 'url(#ink-wobble)' }));
    // Dense shore hatching (8 lines per segment, closer to coast)
    const p = LANDMASS_POINTS;
    for (let i = 0; i < p.length; i++) {
        const curr = p[i];
        const next = p[(i + 1) % p.length];
        const dx = next[0] - curr[0], dy = next[1] - curr[1];
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) continue;
        const nx = -dy / len, ny = dx / len;
        // Primary hatching (close to coast, outward into ocean)
        for (let j = 0; j < 8; j++) {
            const t = 0.06 + j * 0.12;
            const hx = curr[0] + dx * t, hy = curr[1] + dy * t;
            const hl = 4 + srand(i * 100 + j) * 8;
            cG.appendChild(_el('line', {
                x1: hx, y1: hy, x2: hx - nx * hl, y2: hy - ny * hl,
                stroke: INK_DARK, 'stroke-width': 0.4, 'stroke-opacity': 0.25 + srand(i * 50 + j) * 0.12,
            }));
        }
        // Secondary hatching (further from coast, shorter/thinner)
        for (let j = 0; j < 4; j++) {
            const t = 0.1 + j * 0.22;
            const hx = curr[0] + dx * t, hy = curr[1] + dy * t;
            const hl = 7 + srand(i * 120 + j) * 10;
            cG.appendChild(_el('line', {
                x1: hx - nx * (hl + 3), y1: hy - ny * (hl + 3),
                x2: hx - nx * (hl + 3 + 3 + srand(i * 130 + j) * 3), y2: hy - ny * (hl + 3 + 3 + srand(i * 130 + j) * 3),
                stroke: INK_DARK, 'stroke-width': 0.25, 'stroke-opacity': 0.15 + srand(i * 60 + j) * 0.08,
            }));
        }
    }
    svg.appendChild(cG);
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

function setupPanZoom() {
    const vp = document.getElementById('map-viewport');
    const wr = document.getElementById('map-wrapper');
    let pan = false, moved = false, sx = 0, sy = 0, scx = 0, scy = 0, ipd = 0, iz = 1;
    function apply() { wr.style.transform = `translate(${S.panX}px,${S.panY}px) scale(${S.zoom})`; saveViewport(); }
    function clamp() {
        const mw = SVG_W * S.zoom, mh = SVG_H * S.zoom, m = 50;
        S.panX = Math.max(-(mw - m), Math.min(m, S.panX));
        S.panY = Math.max(-(mh - m), Math.min(m, S.panY));
    }
    vp.addEventListener('pointerdown', e => { pan = true; moved = false; sx = e.clientX - S.panX; sy = e.clientY - S.panY; scx = e.clientX; scy = e.clientY; });
    vp.addEventListener('pointermove', e => { if (!pan) return; if (Math.abs(e.clientX - scx) > 5 || Math.abs(e.clientY - scy) > 5) moved = true; if (moved) { S.panX = e.clientX - sx; S.panY = e.clientY - sy; clamp(); apply(); } });
    vp.addEventListener('pointerup', () => { pan = false; });
    vp.addEventListener('pointercancel', () => { pan = false; });
    vp.addEventListener('touchstart', e => { if (e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); ipd = d; iz = S.zoom; } }, { passive: true });
    vp.addEventListener('touchmove', e => { if (e.touches.length === 2 && ipd > 0) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); S.zoom = Math.max(0.5, Math.min(2.5, iz * (d / ipd))); clamp(); apply(); } }, { passive: true });
    vp.addEventListener('wheel', e => { e.preventDefault(); S.zoom = Math.max(0.5, Math.min(2.5, S.zoom * (e.deltaY > 0 ? 0.9 : 1.1))); clamp(); apply(); }, { passive: false });
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

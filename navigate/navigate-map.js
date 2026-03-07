// ===============================================================
// NAVIGATE MAP — Orchestrator, defs, ocean, landmass, pan/zoom
// Medieval cartography: WoW + real portolan chart style
// ===============================================================

const NS = 'http://www.w3.org/2000/svg';

function srand(seed) {
    let x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
}

// Landmass outline (organic continent shape enclosing all locations)
// Defined as pixel coords, clockwise from north cape
const LANDMASS_POINTS = (() => {
    const pts = [
        // North cape (frozen waste)
        [240, 25], [310, 15], [380, 22],
        // NE coast (mountain region)
        [440, 45], [520, 70], [570, 110], [600, 160],
        // East coast
        [620, 210], [635, 270], [640, 320], [630, 370],
        // SE coast (volcanic)
        [635, 410], [640, 460], [630, 510], [625, 560],
        [610, 600], [580, 640], [540, 660],
        // South coast
        [480, 670], [420, 680], [360, 675], [300, 670],
        [240, 660], [190, 640],
        // SW coast
        [140, 610], [110, 560], [90, 510],
        // West coast
        [80, 450], [75, 400], [70, 350], [75, 300],
        [85, 250], [95, 200],
        // NW coast (forest)
        [110, 150], [130, 100], [160, 60], [200, 35],
    ];
    // Add organic wobble to each point
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
        // Smooth cubic bezier through points
        const cpx1 = prev[0] + (curr[0] - p[(i - 2 + p.length) % p.length][0]) * 0.2;
        const cpy1 = prev[1] + (curr[1] - p[(i - 2 + p.length) % p.length][1]) * 0.2;
        const cpx2 = curr[0] - (next[0] - prev[0]) * 0.2;
        const cpy2 = curr[1] - (next[1] - prev[1]) * 0.2;
        d += ` C${cpx1},${cpy1} ${cpx2},${cpy2} ${curr[0]},${curr[1]}`;
    }
    d += ' Z';
    return d;
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

    _renderOcean(svg);              // L0: Ocean water (fills ALL space)
    _renderLandmass(svg);           // L1: Continental landmass
    _renderCoastline(svg);          // L2: Ink coastline hatching
    _renderAgingEffects(svg);       // L3: Foxing, creases, stains
    renderOrnamentBorder(svg);      // L4: Manuscript border
    renderTerrainRegions(svg, fogState);  // L5: Painted biome zones
    renderTerrainDetails(svg, fogState);  // L6: Dense terrain illustrations
    const roadG = _el('g', { class: 'roads-layer' });
    renderRoads(roadG, fogState);
    svg.appendChild(roadG);         // L7: Roads
    const locG = _el('g', { class: 'locations-layer' });
    renderLocationMarkers(locG, fogState);
    svg.appendChild(locG);          // L8: Location markers
    renderPlayerBanner(svg);        // L9: Player marker
    renderFogWisps(svg, fogState);  // L10: Fog
    renderCartographyDecor(svg, fogState); // L11: Decorations
    renderCompassRose(svg);         // L12: Compass
    setupPanZoom();
}

// ===============================================================
// SVG DEFS
// ===============================================================

function _buildAllDefs(defs) {
    // Ocean gradient (dark teal-blue)
    const og = _el('radialGradient', { id: 'ocean-grad', cx: '50%', cy: '50%', r: '60%' });
    og.appendChild(_el('stop', { offset: '0%', 'stop-color': '#1a2a2a' }));
    og.appendChild(_el('stop', { offset: '100%', 'stop-color': '#0e1a1a' }));
    defs.appendChild(og);

    // Land parchment gradient
    const lg = _el('radialGradient', { id: 'land-grad', cx: '50%', cy: '45%', r: '65%' });
    lg.appendChild(_el('stop', { offset: '0%', 'stop-color': '#4a4030' }));
    lg.appendChild(_el('stop', { offset: '70%', 'stop-color': '#3e3428' }));
    lg.appendChild(_el('stop', { offset: '100%', 'stop-color': '#342a20' }));
    defs.appendChild(lg);

    // Gold marker
    const gm = _el('radialGradient', { id: 'gold-marker', cx: '35%', cy: '35%', r: '65%' });
    gm.appendChild(_el('stop', { offset: '0%', 'stop-color': '#f0d070' }));
    gm.appendChild(_el('stop', { offset: '100%', 'stop-color': '#8a6a2a' }));
    defs.appendChild(gm);

    // Current glow
    const cg = _el('radialGradient', { id: 'current-glow', cx: '50%', cy: '50%', r: '50%' });
    cg.appendChild(_el('stop', { offset: '0%', 'stop-color': 'rgba(196,149,58,0.6)' }));
    cg.appendChild(_el('stop', { offset: '100%', 'stop-color': 'rgba(196,149,58,0)' }));
    defs.appendChild(cg);

    // Parchment grain
    const pf = _el('filter', { id: 'parchment-grain', x: '0', y: '0', width: '100%', height: '100%' });
    pf.appendChild(_el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.8', numOctaves: '5', seed: '42', result: 'g' }));
    pf.appendChild(_el('feColorMatrix', { in: 'g', type: 'saturate', values: '0', result: 'gg' }));
    pf.appendChild(_el('feBlend', { in: 'SourceGraphic', in2: 'gg', mode: 'multiply' }));
    defs.appendChild(pf);

    // Ocean texture
    const of2 = _el('filter', { id: 'ocean-tex', x: '0', y: '0', width: '100%', height: '100%' });
    of2.appendChild(_el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.5', numOctaves: '3', seed: '88', result: 'ot' }));
    of2.appendChild(_el('feColorMatrix', { in: 'ot', type: 'saturate', values: '0', result: 'otg' }));
    of2.appendChild(_el('feBlend', { in: 'SourceGraphic', in2: 'otg', mode: 'multiply' }));
    defs.appendChild(of2);

    // Fog blur
    const fb = _el('filter', { id: 'fog-blur', x: '-50%', y: '-50%', width: '200%', height: '200%' });
    fb.appendChild(_el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '3' }));
    defs.appendChild(fb);

    // Ink wobble
    const iw = _el('filter', { id: 'ink-wobble', x: '-5%', y: '-5%', width: '110%', height: '110%' });
    iw.appendChild(_el('feTurbulence', { type: 'turbulence', baseFrequency: '0.02', numOctaves: '2', seed: '5', result: 'w' }));
    iw.appendChild(_el('feDisplacementMap', { in: 'SourceGraphic', in2: 'w', scale: '3', xChannelSelector: 'R', yChannelSelector: 'G' }));
    defs.appendChild(iw);

    // Marker shadow
    const ms = _el('filter', { id: 'marker-shadow', x: '-20%', y: '-20%', width: '140%', height: '140%' });
    ms.appendChild(_el('feDropShadow', { dx: '1', dy: '2', stdDeviation: '2', 'flood-color': '#1a1510', 'flood-opacity': '0.6' }));
    defs.appendChild(ms);

    // Terrain soft blur
    const sg = _el('filter', { id: 'terrain-soft', x: '-15%', y: '-15%', width: '130%', height: '130%' });
    sg.appendChild(_el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '10' }));
    defs.appendChild(sg);

    // Wave pattern for ocean
    const wp = _el('pattern', { id: 'ocean-waves', width: '30', height: '12', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(-5)' });
    wp.appendChild(_el('path', { d: 'M0,6 Q7.5,2 15,6 Q22.5,10 30,6', fill: 'none', stroke: '#2a4040', 'stroke-width': '0.6', 'stroke-opacity': '0.35' }));
    wp.appendChild(_el('path', { d: 'M0,10 Q7.5,6 15,10 Q22.5,14 30,10', fill: 'none', stroke: '#2a4040', 'stroke-width': '0.3', 'stroke-opacity': '0.2' }));
    defs.appendChild(wp);

    // Landmass clip path
    defs.appendChild(_el('clipPath', { id: 'land-clip' })).appendChild(_el('path', { d: _landmassPath() }));
}

// ===============================================================
// OCEAN (fills entire background with water)
// ===============================================================

function _renderOcean(svg) {
    // Dark ocean base
    svg.appendChild(_el('rect', { x: 0, y: 0, width: SVG_W, height: SVG_H, fill: 'url(#ocean-grad)' }));
    // Ocean noise texture
    svg.appendChild(_el('rect', { x: 0, y: 0, width: SVG_W, height: SVG_H, fill: '#1a2828', opacity: '0.12', filter: 'url(#ocean-tex)' }));
    // Wave pattern overlay
    svg.appendChild(_el('rect', { x: 0, y: 0, width: SVG_W, height: SVG_H, fill: 'url(#ocean-waves)' }));
    // Scattered wave crests in open water
    const wG = _el('g', { 'pointer-events': 'none', opacity: '0.15' });
    for (let i = 0; i < 20; i++) {
        const wx = srand(i * 37 + 5) * SVG_W;
        const wy = srand(i * 41 + 11) * SVG_H;
        const wl = 8 + srand(i * 53) * 12;
        wG.appendChild(_el('path', {
            d: `M${wx},${wy} Q${wx + wl * 0.5},${wy - 2} ${wx + wl},${wy}`,
            fill: 'none', stroke: '#4a6a6a', 'stroke-width': 0.5,
        }));
    }
    svg.appendChild(wG);
}

// ===============================================================
// LANDMASS (continental shape with parchment fill)
// ===============================================================

function _renderLandmass(svg) {
    const path = _landmassPath();
    // Land base color
    svg.appendChild(_el('path', { d: path, fill: 'url(#land-grad)', stroke: 'none' }));
    // Parchment grain on land
    const grainG = _el('g', { 'clip-path': 'url(#land-clip)' });
    grainG.appendChild(_el('rect', { x: 0, y: 0, width: SVG_W, height: SVG_H, fill: '#3a3028', opacity: '0.15', filter: 'url(#parchment-grain)' }));
    svg.appendChild(grainG);
    // Inner land vignette (lighter center)
    const lvig = _el('radialGradient', { id: '_lvig', cx: '45%', cy: '50%', r: '50%' });
    lvig.appendChild(_el('stop', { offset: '0%', 'stop-color': 'rgba(74,64,48,0.15)' }));
    lvig.appendChild(_el('stop', { offset: '100%', 'stop-color': 'rgba(0,0,0,0)' }));
    svg.querySelector('defs').appendChild(lvig);
    svg.appendChild(_el('path', { d: path, fill: 'url(#_lvig)', stroke: 'none' }));
}

// ===============================================================
// COASTLINE (ink hatching along landmass edge)
// ===============================================================

function _renderCoastline(svg) {
    const path = _landmassPath();
    const cG = _el('g', { class: 'coastline', 'pointer-events': 'none' });
    // Main coastline ink
    cG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#4a3420', 'stroke-width': 2.0, 'stroke-opacity': 0.5, filter: 'url(#ink-wobble)' }));
    // Inner shadow line
    cG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#3a2a18', 'stroke-width': 0.8, 'stroke-opacity': 0.25, 'stroke-dasharray': '4 3' }));
    // Shore hatching (short perpendicular lines along coast — simplified)
    const p = LANDMASS_POINTS;
    for (let i = 0; i < p.length; i += 2) {
        const curr = p[i];
        const next = p[(i + 1) % p.length];
        const dx = next[0] - curr[0], dy = next[1] - curr[1];
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) continue;
        const nx = -dy / len, ny = dx / len; // outward normal
        const mx = (curr[0] + next[0]) / 2, my = (curr[1] + next[1]) / 2;
        for (let j = 0; j < 3; j++) {
            const t = 0.2 + j * 0.3;
            const hx = curr[0] + dx * t, hy = curr[1] + dy * t;
            const hl = 4 + srand(i * 100 + j) * 6;
            cG.appendChild(_el('line', {
                x1: hx, y1: hy, x2: hx - nx * hl, y2: hy - ny * hl,
                stroke: '#4a3420', 'stroke-width': 0.4, 'stroke-opacity': 0.3,
            }));
        }
    }
    svg.appendChild(cG);
}

// ===============================================================
// AGING EFFECTS
// ===============================================================

function _renderAgingEffects(svg) {
    const aG = _el('g', { class: 'aging', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    const spots = [[80,60,15],[650,100,12],[200,650,18],[550,550,10],[400,200,8],[120,400,14],[600,350,11],[350,680,16],[500,80,9],[700,600,13]];
    for (const [x, y, r] of spots) {
        aG.appendChild(_el('circle', { cx: x, cy: y, r, fill: '#5a4a30', 'fill-opacity': 0.04 + srand(x * 7 + y) * 0.04, filter: 'url(#terrain-soft)' }));
    }
    aG.appendChild(_el('line', { x1: 60, y1: SVG_H * 0.35, x2: SVG_W - 60, y2: SVG_H * 0.38, stroke: '#2a2018', 'stroke-width': 0.7, 'stroke-opacity': 0.07 }));
    aG.appendChild(_el('line', { x1: SVG_W * 0.6, y1: 40, x2: SVG_W * 0.58, y2: SVG_H - 40, stroke: '#2a2018', 'stroke-width': 0.5, 'stroke-opacity': 0.05 }));
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

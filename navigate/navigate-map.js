// ===============================================================
// NAVIGATE MAP — Main orchestrator, defs, pan/zoom
// Medieval hand-drawn cartography inspired by WoW + real maps
// ===============================================================

const NS = 'http://www.w3.org/2000/svg';

// Seeded PRNG for consistent organic variation
function srand(seed) {
    let x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
}

// Fog state for each location
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

    // Defs
    const defs = _el('defs');
    _buildAllDefs(defs);
    svg.appendChild(defs);

    // L0: Parchment background
    _renderParchmentBg(svg);

    // L1: Aged stains & foxing
    _renderAgingEffects(svg);

    // L2: Ornate border
    renderOrnamentBorder(svg);

    // L3: Terrain regions (painted biome areas)
    renderTerrainRegions(svg, fogState);

    // L4: Detailed terrain illustrations
    renderTerrainDetails(svg, fogState);

    // L5: Roads
    const roadG = _el('g', { class: 'roads-layer' });
    renderRoads(roadG, fogState);
    svg.appendChild(roadG);

    // L6: Location markers
    const locG = _el('g', { class: 'locations-layer' });
    renderLocationMarkers(locG, fogState);
    svg.appendChild(locG);

    // L7: Player marker
    renderPlayerBanner(svg);

    // L8: Fog wisps
    renderFogWisps(svg, fogState);

    // L9: Cartographic decorations
    renderCartographyDecor(svg, fogState);

    // L10: Compass rose
    renderCompassRose(svg);

    setupPanZoom();
}

// ===============================================================
// SVG DEFS
// ===============================================================

function _buildAllDefs(defs) {
    // Background gradient (warm parchment)
    const bg = _el('radialGradient', { id: 'bg-grad', cx: '50%', cy: '45%', r: '70%' });
    bg.appendChild(_el('stop', { offset: '0%', 'stop-color': '#4a4030' }));
    bg.appendChild(_el('stop', { offset: '60%', 'stop-color': '#3a3028' }));
    bg.appendChild(_el('stop', { offset: '100%', 'stop-color': '#2a2018' }));
    defs.appendChild(bg);

    // Gold marker gradient
    const gm = _el('radialGradient', { id: 'gold-marker', cx: '35%', cy: '35%', r: '65%' });
    gm.appendChild(_el('stop', { offset: '0%', 'stop-color': '#f0d070' }));
    gm.appendChild(_el('stop', { offset: '100%', 'stop-color': '#8a6a2a' }));
    defs.appendChild(gm);

    // Current glow
    const cg = _el('radialGradient', { id: 'current-glow', cx: '50%', cy: '50%', r: '50%' });
    cg.appendChild(_el('stop', { offset: '0%', 'stop-color': 'rgba(196,149,58,0.6)' }));
    cg.appendChild(_el('stop', { offset: '100%', 'stop-color': 'rgba(196,149,58,0)' }));
    defs.appendChild(cg);

    // Parchment grain texture
    const pf = _el('filter', { id: 'parchment-grain', x: '0', y: '0', width: '100%', height: '100%' });
    pf.appendChild(_el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: '5', seed: '42', result: 'g' }));
    pf.appendChild(_el('feColorMatrix', { in: 'g', type: 'saturate', values: '0', result: 'gg' }));
    pf.appendChild(_el('feBlend', { in: 'SourceGraphic', in2: 'gg', mode: 'multiply' }));
    defs.appendChild(pf);

    // Coarse parchment (larger grain for stains)
    const cf = _el('filter', { id: 'coarse-grain', x: '0', y: '0', width: '100%', height: '100%' });
    cf.appendChild(_el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.35', numOctaves: '3', seed: '17', result: 'cg' }));
    cf.appendChild(_el('feColorMatrix', { in: 'cg', type: 'saturate', values: '0', result: 'cgg' }));
    cf.appendChild(_el('feBlend', { in: 'SourceGraphic', in2: 'cgg', mode: 'multiply' }));
    defs.appendChild(cf);

    // Fog blur
    const fb = _el('filter', { id: 'fog-blur', x: '-50%', y: '-50%', width: '200%', height: '200%' });
    fb.appendChild(_el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '3' }));
    defs.appendChild(fb);

    // Ink wobble (hand-drawn look)
    const iw = _el('filter', { id: 'ink-wobble', x: '-5%', y: '-5%', width: '110%', height: '110%' });
    iw.appendChild(_el('feTurbulence', { type: 'turbulence', baseFrequency: '0.02', numOctaves: '2', seed: '5', result: 'w' }));
    iw.appendChild(_el('feDisplacementMap', { in: 'SourceGraphic', in2: 'w', scale: '3', xChannelSelector: 'R', yChannelSelector: 'G' }));
    defs.appendChild(iw);

    // Marker shadow
    const ms = _el('filter', { id: 'marker-shadow', x: '-20%', y: '-20%', width: '140%', height: '140%' });
    ms.appendChild(_el('feDropShadow', { dx: '1', dy: '2', stdDeviation: '2', 'flood-color': '#1a1510', 'flood-opacity': '0.6' }));
    defs.appendChild(ms);

    // Soft glow for terrain regions
    const sg = _el('filter', { id: 'terrain-soft', x: '-10%', y: '-10%', width: '120%', height: '120%' });
    sg.appendChild(_el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '8' }));
    defs.appendChild(sg);

    // Cross-hatch pattern for mountain shadow
    const hp = _el('pattern', { id: 'cross-hatch', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    hp.appendChild(_el('line', { x1: '0', y1: '0', x2: '0', y2: '6', stroke: '#3a2a1a', 'stroke-width': '0.5', 'stroke-opacity': '0.3' }));
    defs.appendChild(hp);

    // Wave pattern for water
    const wp = _el('pattern', { id: 'water-waves', width: '20', height: '8', patternUnits: 'userSpaceOnUse' });
    wp.appendChild(_el('path', { d: 'M0,4 Q5,1 10,4 Q15,7 20,4', fill: 'none', stroke: '#3a5a5a', 'stroke-width': '0.5', 'stroke-opacity': '0.3' }));
    defs.appendChild(wp);
}

// ===============================================================
// PARCHMENT BACKGROUND
// ===============================================================

function _renderParchmentBg(svg) {
    // Base gradient
    svg.appendChild(_el('rect', { x: 0, y: 0, width: SVG_W, height: SVG_H, fill: 'url(#bg-grad)' }));

    // Fine grain overlay
    svg.appendChild(_el('rect', {
        x: 0, y: 0, width: SVG_W, height: SVG_H,
        fill: '#3a3028', opacity: '0.15', filter: 'url(#parchment-grain)',
    }));

    // Coarse grain (paper fiber)
    svg.appendChild(_el('rect', {
        x: 0, y: 0, width: SVG_W, height: SVG_H,
        fill: '#4a3a28', opacity: '0.06', filter: 'url(#coarse-grain)',
    }));

    // Vignette (darker edges)
    const vig = _el('radialGradient', { id: '_vig', cx: '50%', cy: '50%', r: '55%' });
    vig.appendChild(_el('stop', { offset: '0%', 'stop-color': 'rgba(0,0,0,0)' }));
    vig.appendChild(_el('stop', { offset: '70%', 'stop-color': 'rgba(0,0,0,0)' }));
    vig.appendChild(_el('stop', { offset: '100%', 'stop-color': 'rgba(10,5,0,0.45)' }));
    svg.querySelector('defs').appendChild(vig);
    svg.appendChild(_el('rect', { x: 0, y: 0, width: SVG_W, height: SVG_H, fill: 'url(#_vig)' }));
}

// ===============================================================
// AGING EFFECTS (foxing spots, ink stains, crease lines)
// ===============================================================

function _renderAgingEffects(svg) {
    const ageG = _el('g', { class: 'aging-effects', 'pointer-events': 'none' });

    // Foxing spots (small brown circles — age marks on paper)
    const foxingSpots = [
        { x: 80, y: 60, r: 15 }, { x: 650, y: 100, r: 12 },
        { x: 200, y: 650, r: 18 }, { x: 550, y: 550, r: 10 },
        { x: 400, y: 200, r: 8 }, { x: 120, y: 400, r: 14 },
        { x: 600, y: 350, r: 11 }, { x: 350, y: 680, r: 16 },
        { x: 500, y: 80, r: 9 }, { x: 700, y: 600, r: 13 },
    ];
    for (const s of foxingSpots) {
        ageG.appendChild(_el('circle', {
            cx: s.x, cy: s.y, r: s.r,
            fill: '#5a4a30', 'fill-opacity': 0.04 + srand(s.x * 7 + s.y) * 0.04,
            filter: 'url(#terrain-soft)',
        }));
    }

    // Crease lines (faint diagonal fold marks)
    ageG.appendChild(_el('line', {
        x1: 50, y1: SVG_H * 0.35, x2: SVG_W - 50, y2: SVG_H * 0.38,
        stroke: '#2a2018', 'stroke-width': 0.8, 'stroke-opacity': 0.08,
    }));
    ageG.appendChild(_el('line', {
        x1: SVG_W * 0.6, y1: 30, x2: SVG_W * 0.58, y2: SVG_H - 30,
        stroke: '#2a2018', 'stroke-width': 0.6, 'stroke-opacity': 0.06,
    }));

    // Water stain (large faint irregular shape)
    ageG.appendChild(_el('ellipse', {
        cx: 150, cy: 580, rx: 60, ry: 40,
        fill: '#3a3020', 'fill-opacity': 0.05,
        transform: 'rotate(-15, 150, 580)', filter: 'url(#terrain-soft)',
    }));

    svg.appendChild(ageG);
}

// ===============================================================
// PAN / ZOOM
// ===============================================================

function setupPanZoom() {
    const viewport = document.getElementById('map-viewport');
    const wrapper = document.getElementById('map-wrapper');
    let isPanning = false, hasMoved = false;
    let startX = 0, startY = 0, startClientX = 0, startClientY = 0;
    let initialPinchDist = 0, initialZoom = 1;

    function apply() {
        wrapper.style.transform = `translate(${S.panX}px, ${S.panY}px) scale(${S.zoom})`;
        saveViewport();
    }
    function clamp() {
        const mw = SVG_W * S.zoom, mh = SVG_H * S.zoom, m = 50;
        S.panX = Math.max(-(mw - m), Math.min(m, S.panX));
        S.panY = Math.max(-(mh - m), Math.min(m, S.panY));
    }

    viewport.addEventListener('pointerdown', e => {
        isPanning = true; hasMoved = false;
        startX = e.clientX - S.panX; startY = e.clientY - S.panY;
        startClientX = e.clientX; startClientY = e.clientY;
    });
    viewport.addEventListener('pointermove', e => {
        if (!isPanning) return;
        if (Math.abs(e.clientX - startClientX) > 5 || Math.abs(e.clientY - startClientY) > 5) hasMoved = true;
        if (hasMoved) { S.panX = e.clientX - startX; S.panY = e.clientY - startY; clamp(); apply(); }
    });
    viewport.addEventListener('pointerup', () => { isPanning = false; });
    viewport.addEventListener('pointercancel', () => { isPanning = false; });

    viewport.addEventListener('touchstart', e => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialPinchDist = Math.hypot(dx, dy); initialZoom = S.zoom;
        }
    }, { passive: true });
    viewport.addEventListener('touchmove', e => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const d = Math.hypot(dx, dy);
            if (initialPinchDist > 0) { S.zoom = Math.max(0.5, Math.min(2.5, initialZoom * (d / initialPinchDist))); clamp(); apply(); }
        }
    }, { passive: true });
    viewport.addEventListener('wheel', e => {
        e.preventDefault();
        S.zoom = Math.max(0.5, Math.min(2.5, S.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
        clamp(); apply();
    }, { passive: false });

    viewport.addEventListener('click', e => {
        if (e.target === viewport || e.target === wrapper || e.target.tagName === 'rect') closeInfoPanel();
    });
    apply();
}

// Center on location
function centerOnLocation(locId) {
    const coords = LOCATION_COORDS[locId];
    if (!coords) return;
    const vp = document.getElementById('map-viewport');
    const { x, y } = hexToPixel(coords.col, coords.row);
    S.panX = (vp.clientWidth / 2) - (x * S.zoom);
    S.panY = (vp.clientHeight / 2) - (y * S.zoom);
    document.getElementById('map-wrapper').style.transform = `translate(${S.panX}px, ${S.panY}px) scale(${S.zoom})`;
    saveViewport();
}

// SVG element helper
function _el(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
}

// Backward compatibility alias
const createSVG = _el;

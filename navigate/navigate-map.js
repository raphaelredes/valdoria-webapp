// ===============================================================
// NAVIGATE MAP — SVG rendering, medieval hand-drawn cartography
// Inspired by WoW world maps and real medieval cartography
// ===============================================================

const NS = 'http://www.w3.org/2000/svg';

// -- Seeded random for consistent organic shapes --
function seededRandom(seed) {
    let x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
}

// -- Fog state for each location --
function computeFogState() {
    const fog = {};
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);

    const adj = {};
    for (const id of Object.keys(LOCATION_COORDS)) {
        adj[id] = [];
    }
    for (const [a, b] of CONNECTION_EDGES) {
        if (adj[a]) adj[a].push(b);
        if (adj[b]) adj[b].push(a);
    }

    for (const locId of Object.keys(LOCATION_COORDS)) {
        if (knownSet.has(locId)) {
            if (discoveredSet.has(locId)) {
                fog[locId] = 'explored';
            } else if (S.mapCoverage.has(locId)) {
                fog[locId] = 'known_mapped';
            } else {
                fog[locId] = 'known_unmapped';
            }
        } else {
            const neighbors = adj[locId] || [];
            const hasKnownNeighbor = neighbors.some(n => knownSet.has(n));
            fog[locId] = hasKnownNeighbor ? 'frontier' : 'hidden';
        }
    }
    return fog;
}

// ===============================================================
// RENDER MAP (Medieval Cartography Style)
// ===============================================================

function renderMap() {
    const svg = document.getElementById('map-svg');
    svg.setAttribute('width', SVG_W);
    svg.setAttribute('height', SVG_H);
    svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
    svg.innerHTML = '';

    const fogState = computeFogState();

    // -- SVG Defs --
    const defs = createSVG('defs');
    _buildDefs(defs);
    svg.appendChild(defs);

    // Layer 0: Parchment background
    svg.appendChild(createSVG('rect', {
        x: 0, y: 0, width: SVG_W, height: SVG_H, fill: 'url(#bg-grad)',
    }));
    // Parchment grain
    svg.appendChild(createSVG('rect', {
        x: 0, y: 0, width: SVG_W, height: SVG_H,
        fill: '#3a3028', opacity: '0.12', filter: 'url(#parchment-grain)',
    }));

    // Layer 1: Ornate border
    renderOrnamentBorder(svg);

    // Layer 2: Terrain illustrations (mountains, trees, water)
    renderTerrainIllustrations(svg, fogState);

    // Layer 3: Connection roads (ink paths)
    const roadGroup = createSVG('g', { class: 'roads-layer' });
    renderRoads(roadGroup, fogState);
    svg.appendChild(roadGroup);

    // Layer 4: Location markers (circular medallions)
    const locGroup = createSVG('g', { class: 'locations-layer' });
    renderLocationMarkers(locGroup, fogState);
    svg.appendChild(locGroup);

    // Layer 5: Player banner marker
    renderPlayerBanner(svg);

    // Layer 6: Fog wisps
    renderFogWisps(svg, fogState);

    // Layer 7: Decorative cartography (sea monsters, text)
    renderCartographyDecor(svg, fogState);

    // Layer 8: Compass rose
    renderCompassRose(svg);

    // Pan/zoom
    setupPanZoom();
}

// ===============================================================
// DEFS — Filters, gradients, markers
// ===============================================================

function _buildDefs(defs) {
    // Background gradient
    const grad = createSVG('radialGradient', { id: 'bg-grad', cx: '50%', cy: '50%', r: '65%' });
    grad.appendChild(createSVG('stop', { offset: '0%', 'stop-color': '#3a3028' }));
    grad.appendChild(createSVG('stop', { offset: '100%', 'stop-color': '#2a2420' }));
    defs.appendChild(grad);

    // Gold marker gradient
    const goldGrad = createSVG('radialGradient', { id: 'gold-marker', cx: '35%', cy: '35%', r: '65%' });
    goldGrad.appendChild(createSVG('stop', { offset: '0%', 'stop-color': '#e8c060' }));
    goldGrad.appendChild(createSVG('stop', { offset: '100%', 'stop-color': '#8a6a2a' }));
    defs.appendChild(goldGrad);

    // Current location glow
    const glowGrad = createSVG('radialGradient', { id: 'current-glow', cx: '50%', cy: '50%', r: '50%' });
    glowGrad.appendChild(createSVG('stop', { offset: '0%', 'stop-color': 'rgba(196,149,58,0.5)' }));
    glowGrad.appendChild(createSVG('stop', { offset: '100%', 'stop-color': 'rgba(196,149,58,0)' }));
    defs.appendChild(glowGrad);

    // Parchment texture
    const pf = createSVG('filter', { id: 'parchment-grain', x: '0', y: '0', width: '100%', height: '100%' });
    pf.appendChild(createSVG('feTurbulence', {
        type: 'fractalNoise', baseFrequency: '0.65', numOctaves: '4', seed: '42', result: 'grain'
    }));
    pf.appendChild(createSVG('feColorMatrix', { in: 'grain', type: 'saturate', values: '0', result: 'gg' }));
    pf.appendChild(createSVG('feBlend', { in: 'SourceGraphic', in2: 'gg', mode: 'multiply' }));
    defs.appendChild(pf);

    // Fog blur
    const fogF = createSVG('filter', { id: 'fog-blur', x: '-50%', y: '-50%', width: '200%', height: '200%' });
    fogF.appendChild(createSVG('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '3' }));
    defs.appendChild(fogF);

    // Hand-drawn wobble filter
    const wobble = createSVG('filter', { id: 'ink-wobble', x: '-5%', y: '-5%', width: '110%', height: '110%' });
    wobble.appendChild(createSVG('feTurbulence', {
        type: 'turbulence', baseFrequency: '0.03', numOctaves: '2', seed: '3', result: 'warp'
    }));
    wobble.appendChild(createSVG('feDisplacementMap', {
        in: 'SourceGraphic', in2: 'warp', scale: '2.5', xChannelSelector: 'R', yChannelSelector: 'G'
    }));
    defs.appendChild(wobble);

    // Drop shadow for markers
    const shadow = createSVG('filter', { id: 'marker-shadow', x: '-20%', y: '-20%', width: '140%', height: '140%' });
    shadow.appendChild(createSVG('feDropShadow', {
        dx: '1', dy: '2', stdDeviation: '2', 'flood-color': '#1a1510', 'flood-opacity': '0.5'
    }));
    defs.appendChild(shadow);
}

// ===============================================================
// ORNATE BORDER (medieval cartouche style)
// ===============================================================

function renderOrnamentBorder(svg) {
    const m = 14;
    const c = '#704214';
    const g = createSVG('g', { class: 'border-ornament', opacity: '0.25' });

    // Double-line frame
    g.appendChild(createSVG('rect', {
        x: m, y: m, width: SVG_W - m * 2, height: SVG_H - m * 2,
        fill: 'none', stroke: c, 'stroke-width': 2,
    }));
    g.appendChild(createSVG('rect', {
        x: m + 6, y: m + 6, width: SVG_W - m * 2 - 12, height: SVG_H - m * 2 - 12,
        fill: 'none', stroke: c, 'stroke-width': 0.7,
    }));

    // Corner flourishes (curlicues)
    const corners = [[m, m, 1, 1], [SVG_W - m, m, -1, 1], [m, SVG_H - m, 1, -1], [SVG_W - m, SVG_H - m, -1, -1]];
    for (const [cx, cy, dx, dy] of corners) {
        // Ornate L with curl
        const curl = `M${cx},${cy} Q${cx + 20 * dx},${cy} ${cx + 25 * dx},${cy + 8 * dy} Q${cx + 28 * dx},${cy + 14 * dy} ${cx + 22 * dx},${cy + 16 * dy}`;
        g.appendChild(createSVG('path', { d: curl, fill: 'none', stroke: c, 'stroke-width': 1.5 }));
        const curl2 = `M${cx},${cy} Q${cx},${cy + 20 * dy} ${cx + 8 * dx},${cy + 25 * dy} Q${cx + 14 * dx},${cy + 28 * dy} ${cx + 16 * dx},${cy + 22 * dy}`;
        g.appendChild(createSVG('path', { d: curl2, fill: 'none', stroke: c, 'stroke-width': 1.5 }));
        // Diamond accent
        g.appendChild(createSVG('polygon', {
            points: `${cx},${cy - 4 * dy} ${cx + 4 * dx},${cy} ${cx},${cy + 4 * dy} ${cx - 4 * dx},${cy}`,
            fill: c,
        }));
    }

    // Title cartouche (top center)
    const tcx = SVG_W / 2;
    const cartouche = createSVG('g', { opacity: '0.35' });
    // Scroll banner shape
    const bw = 100, bh = 16;
    const bannerD = `M${tcx - bw},${m + 2} Q${tcx - bw + 10},${m - 4} ${tcx - bw + 20},${m + 2}
        L${tcx + bw - 20},${m + 2} Q${tcx + bw - 10},${m - 4} ${tcx + bw},${m + 2}
        L${tcx + bw},${m + bh} Q${tcx + bw - 10},${m + bh + 4} ${tcx + bw - 20},${m + bh}
        L${tcx - bw + 20},${m + bh} Q${tcx - bw + 10},${m + bh + 4} ${tcx - bw},${m + bh} Z`;
    cartouche.appendChild(createSVG('path', { d: bannerD, fill: '#2a2420', stroke: c, 'stroke-width': 1 }));
    const titleText = createSVG('text', {
        x: tcx, y: m + bh - 3, 'text-anchor': 'middle',
        'font-size': '10px', 'font-family': "'Cinzel Decorative', serif",
        'font-weight': '700', fill: '#c4953a',
    });
    titleText.textContent = 'VALDORIA';
    cartouche.appendChild(titleText);
    g.appendChild(cartouche);

    svg.appendChild(g);
}

// ===============================================================
// TERRAIN ILLUSTRATIONS (hand-drawn mountains, trees, water)
// ===============================================================

function renderTerrainIllustrations(svg, fogState) {
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);
    const terrainGroup = createSVG('g', { class: 'terrain-illust' });

    for (const [col, row, biome] of TERRAIN_HEXES) {
        const { x, y } = hexToPixel(col, row);

        // Determine visibility from nearby locations
        let opacity = 0;
        for (const locId of knownSet) {
            const coords = LOCATION_COORDS[locId];
            if (!coords) continue;
            const dist = Math.abs(col - coords.col) + Math.abs(row - coords.row);
            if (dist <= 3) {
                opacity = Math.max(opacity, dist <= 1 ? 0.5 : 0.25);
                if (discoveredSet.has(locId)) opacity = Math.max(opacity, dist <= 1 ? 0.7 : 0.35);
            }
        }
        if (opacity <= 0) continue;

        const seed = col * 100 + row;
        const g = createSVG('g', { opacity: opacity });

        if (biome === 'mountain') {
            _drawMountain(g, x, y, seed);
        } else if (biome === 'forest') {
            _drawTrees(g, x, y, seed);
        } else if (biome === 'snow') {
            _drawSnowPeak(g, x, y, seed);
        } else if (biome === 'swamp') {
            _drawSwamp(g, x, y, seed);
        } else if (biome === 'desert') {
            _drawDunes(g, x, y, seed);
        } else if (biome === 'volcanic') {
            _drawVolcano(g, x, y, seed);
        } else if (biome === 'cave' || biome === 'graveyard') {
            _drawRocks(g, x, y, seed);
        } else {
            _drawGrass(g, x, y, seed);
        }

        terrainGroup.appendChild(g);
    }
    svg.appendChild(terrainGroup);
}

// -- Terrain drawing functions (hand-drawn SVG) --

function _drawMountain(g, x, y, seed) {
    const jx = (seededRandom(seed) - 0.5) * 6;
    const h = 18 + seededRandom(seed + 1) * 10;
    const w = 14 + seededRandom(seed + 2) * 8;
    // Main peak
    g.appendChild(createSVG('path', {
        d: `M${x - w + jx},${y + 5} L${x + jx},${y - h} L${x + w + jx},${y + 5}`,
        fill: '#5a5a5a', stroke: '#3a3028', 'stroke-width': 0.8, 'stroke-linejoin': 'round',
    }));
    // Snow cap
    g.appendChild(createSVG('path', {
        d: `M${x - w * 0.3 + jx},${y - h + 8} L${x + jx},${y - h} L${x + w * 0.3 + jx},${y - h + 8}`,
        fill: '#c8c0b0', stroke: 'none',
    }));
    // Second smaller peak
    if (seededRandom(seed + 5) > 0.4) {
        const ox = w * 0.7;
        const h2 = h * 0.6;
        g.appendChild(createSVG('path', {
            d: `M${x + ox - 8 + jx},${y + 5} L${x + ox + jx},${y - h2} L${x + ox + 8 + jx},${y + 5}`,
            fill: '#4a4a4a', stroke: '#3a3028', 'stroke-width': 0.6,
        }));
    }
}

function _drawSnowPeak(g, x, y, seed) {
    const jx = (seededRandom(seed) - 0.5) * 4;
    const h = 14 + seededRandom(seed + 1) * 8;
    g.appendChild(createSVG('path', {
        d: `M${x - 12 + jx},${y + 4} L${x + jx},${y - h} L${x + 12 + jx},${y + 4}`,
        fill: '#b8b0a0', stroke: '#8a8070', 'stroke-width': 0.6,
    }));
    // Snow lines
    for (let i = 0; i < 2; i++) {
        const ly = y - h + 4 + i * 5;
        g.appendChild(createSVG('line', {
            x1: x - 6 + jx, y1: ly, x2: x + 6 + jx, y2: ly,
            stroke: '#ddd8d0', 'stroke-width': 0.5, 'stroke-opacity': 0.6,
        }));
    }
}

function _drawTrees(g, x, y, seed) {
    const count = 2 + Math.floor(seededRandom(seed) * 2);
    for (let i = 0; i < count; i++) {
        const tx = x + (seededRandom(seed + i * 10) - 0.5) * 20;
        const ty = y + (seededRandom(seed + i * 10 + 5) - 0.5) * 10;
        const h = 10 + seededRandom(seed + i * 10 + 3) * 8;
        // Trunk
        g.appendChild(createSVG('line', {
            x1: tx, y1: ty, x2: tx, y2: ty + 6,
            stroke: '#5a4020', 'stroke-width': 1.5,
        }));
        // Canopy (triangular, medieval style)
        g.appendChild(createSVG('path', {
            d: `M${tx},${ty - h} L${tx + 6},${ty} L${tx - 6},${ty} Z`,
            fill: '#2a5a1a', stroke: '#1a3a10', 'stroke-width': 0.5,
        }));
        if (h > 14) {
            g.appendChild(createSVG('path', {
                d: `M${tx},${ty - h + 4} L${tx + 5},${ty - 3} L${tx - 5},${ty - 3} Z`,
                fill: '#1a4a15', stroke: 'none',
            }));
        }
    }
}

function _drawSwamp(g, x, y, seed) {
    // Wavy water lines
    for (let i = 0; i < 3; i++) {
        const wy = y - 3 + i * 5;
        const jx = (seededRandom(seed + i) - 0.5) * 8;
        g.appendChild(createSVG('path', {
            d: `M${x - 12 + jx},${wy} Q${x - 4 + jx},${wy - 3} ${x + jx},${wy} Q${x + 4 + jx},${wy + 3} ${x + 12 + jx},${wy}`,
            fill: 'none', stroke: '#3a5a2a', 'stroke-width': 0.8, 'stroke-opacity': 0.6,
        }));
    }
    // Reed
    if (seededRandom(seed + 10) > 0.5) {
        g.appendChild(createSVG('line', {
            x1: x + 5, y1: y + 2, x2: x + 5, y2: y - 8,
            stroke: '#4a6a2a', 'stroke-width': 0.8,
        }));
        g.appendChild(createSVG('ellipse', {
            cx: x + 5, cy: y - 9, rx: 2, ry: 3,
            fill: '#5a4a20', stroke: 'none',
        }));
    }
}

function _drawDunes(g, x, y, seed) {
    const jx = (seededRandom(seed) - 0.5) * 6;
    // Rolling dune shape
    g.appendChild(createSVG('path', {
        d: `M${x - 16 + jx},${y + 3} Q${x - 6 + jx},${y - 8} ${x + jx},${y + 1} Q${x + 8 + jx},${y - 5} ${x + 16 + jx},${y + 3}`,
        fill: '#8a7a4a', stroke: '#6a5a3a', 'stroke-width': 0.5, 'fill-opacity': 0.5,
    }));
    // Wind lines
    g.appendChild(createSVG('line', {
        x1: x - 8, y1: y - 2, x2: x + 4, y2: y - 3,
        stroke: '#9a8a5a', 'stroke-width': 0.4, 'stroke-dasharray': '3 2',
    }));
}

function _drawVolcano(g, x, y, seed) {
    const jx = (seededRandom(seed) - 0.5) * 4;
    // Volcano cone
    g.appendChild(createSVG('path', {
        d: `M${x - 12 + jx},${y + 5} L${x - 3 + jx},${y - 12} L${x + 3 + jx},${y - 12} L${x + 12 + jx},${y + 5}`,
        fill: '#4a2a1a', stroke: '#3a1a0a', 'stroke-width': 0.7,
    }));
    // Lava/smoke at top
    g.appendChild(createSVG('ellipse', {
        cx: x + jx, cy: y - 13, rx: 4, ry: 2,
        fill: '#8a3a1a', 'fill-opacity': 0.6,
    }));
    // Smoke wisps
    g.appendChild(createSVG('path', {
        d: `M${x + jx},${y - 15} Q${x + 3 + jx},${y - 20} ${x - 2 + jx},${y - 22}`,
        fill: 'none', stroke: '#5a4a3a', 'stroke-width': 0.5, 'stroke-opacity': 0.4,
    }));
}

function _drawRocks(g, x, y, seed) {
    for (let i = 0; i < 2; i++) {
        const rx = x + (seededRandom(seed + i * 7) - 0.5) * 14;
        const ry = y + (seededRandom(seed + i * 7 + 3) - 0.5) * 6;
        const rw = 4 + seededRandom(seed + i * 7 + 1) * 4;
        const rh = 3 + seededRandom(seed + i * 7 + 2) * 3;
        g.appendChild(createSVG('ellipse', {
            cx: rx, cy: ry, rx: rw, ry: rh,
            fill: '#4a4040', stroke: '#3a3030', 'stroke-width': 0.5,
        }));
    }
}

function _drawGrass(g, x, y, seed) {
    // Simple grass tufts
    for (let i = 0; i < 3; i++) {
        const gx = x + (seededRandom(seed + i * 5) - 0.5) * 18;
        const gy = y + (seededRandom(seed + i * 5 + 2) - 0.5) * 8;
        g.appendChild(createSVG('path', {
            d: `M${gx},${gy + 2} Q${gx - 2},${gy - 4} ${gx - 1},${gy - 6} M${gx},${gy + 2} Q${gx + 1},${gy - 5} ${gx + 2},${gy - 7}`,
            fill: 'none', stroke: '#5a7a3a', 'stroke-width': 0.7, 'stroke-opacity': 0.5,
        }));
    }
}

// ===============================================================
// CONNECTION ROADS (medieval ink paths)
// ===============================================================

function renderRoads(group, fogState) {
    for (const [aId, bId] of CONNECTION_EDGES) {
        const aFog = fogState[aId];
        const bFog = fogState[bId];
        if (aFog === 'hidden' && bFog === 'hidden') continue;

        const aCoords = LOCATION_COORDS[aId];
        const bCoords = LOCATION_COORDS[bId];
        if (!aCoords || !bCoords) continue;

        const aPx = hexToPixel(aCoords.col, aCoords.row);
        const bPx = hexToPixel(bCoords.col, bCoords.row);

        const bothExplored = aFog === 'explored' && bFog === 'explored';
        const anyExplored = aFog === 'explored' || bFog === 'explored';
        const isActive = (aId === S.currentLoc || bId === S.currentLoc) && bothExplored;

        let lineOpacity = 0.08;
        let lineWidth = 1.2;
        let dashArray = '6 4';
        if (bothExplored) { lineOpacity = 0.4; lineWidth = 1.8; dashArray = 'none'; }
        else if (anyExplored) { lineOpacity = 0.22; lineWidth = 1.5; dashArray = '8 4'; }
        if (isActive) { lineOpacity = 0.65; lineWidth = 2.2; }
        if (aFog === 'frontier' || bFog === 'frontier') lineOpacity = 0.06;
        if (aFog === 'known_unmapped' || bFog === 'known_unmapped') lineOpacity = 0.05;
        else if (aFog === 'known_mapped' || bFog === 'known_mapped') lineOpacity = Math.max(lineOpacity, 0.12);

        // Organic curve with perpendicular jitter
        const seed = (aCoords.col * 31 + aCoords.row * 17 + bCoords.col * 13 + bCoords.row * 7);
        const mx = (aPx.x + bPx.x) / 2;
        const my = (aPx.y + bPx.y) / 2;
        const dx = bPx.x - aPx.x;
        const dy = bPx.y - aPx.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / len;
        const perpY = dx / len;
        const jitterAmt = (seededRandom(seed) - 0.5) * 10;
        const midX = mx + perpX * jitterAmt;
        const midY = my + perpY * jitterAmt;

        const pathD = `M${aPx.x},${aPx.y} Q${midX},${midY} ${bPx.x},${bPx.y}`;

        // Road shadow (wider, darker)
        if (bothExplored) {
            group.appendChild(createSVG('path', {
                d: pathD, fill: 'none', stroke: '#1a1510',
                'stroke-width': lineWidth + 1.5, 'stroke-opacity': lineOpacity * 0.3,
                'stroke-linecap': 'round',
            }));
        }

        // Main road line
        const road = createSVG('path', {
            d: pathD, fill: 'none',
            class: `road-path${isActive ? ' active' : ''}`,
            'stroke-width': lineWidth,
            'stroke-opacity': lineOpacity,
            'stroke-linecap': 'round',
        });
        if (dashArray !== 'none') road.setAttribute('stroke-dasharray', dashArray);
        group.appendChild(road);

        // Distance badge
        if (anyExplored) {
            const dist = getConnectionDistance(aId, bId);
            group.appendChild(createSVG('circle', {
                cx: midX, cy: midY, r: 9,
                fill: '#2a2420', 'fill-opacity': 0.9,
                stroke: bothExplored ? '#704214' : '#3a3028', 'stroke-width': 0.8,
            }));
            const txt = createSVG('text', {
                x: midX, y: midY + 3.5, 'text-anchor': 'middle',
                'font-size': '9px', 'font-weight': '600',
                'font-family': "'Cinzel', serif",
                fill: bothExplored ? '#8a7060' : '#5a4a3a',
                'pointer-events': 'none',
            });
            txt.textContent = dist;
            group.appendChild(txt);
        }
    }
}

// ===============================================================
// LOCATION MARKERS (circular medallion pins)
// ===============================================================

function renderLocationMarkers(group, fogState) {
    const currentAdj = new Set();
    for (const [a, b] of CONNECTION_EDGES) {
        if (a === S.currentLoc) currentAdj.add(b);
        if (b === S.currentLoc) currentAdj.add(a);
    }

    // Marker radius
    const R = 18;

    for (const [locId, coords] of Object.entries(LOCATION_COORDS)) {
        const fog = fogState[locId];
        if (fog === 'hidden') continue;

        const { x, y } = hexToPixel(coords.col, coords.row);
        const locData = S.locations[locId];
        const isCurrent = locId === S.currentLoc;
        const isExplored = fog === 'explored';
        const isKnownMapped = fog === 'known_mapped';
        const isKnownUnmapped = fog === 'known_unmapped';
        const isFrontier = fog === 'frontier';

        const biome = locData?.b || 'plains';
        const biomeInfo = BIOME_INFO[biome] || BIOME_INFO.plains;
        const danger = locData?.d || 0;
        const icon = locData?.i || '?';
        const name = locData?.n || '';
        const isSettlement = locData?.s || false;

        const nodeGroup = createSVG('g', {
            class: `loc-node ${fog}${isCurrent ? ' current' : ''}`,
            'data-loc': locId,
        });

        if (isCurrent) {
            // Current location: golden glowing medallion
            nodeGroup.appendChild(createSVG('circle', {
                cx: x, cy: y, r: R + 10,
                fill: 'url(#current-glow)', 'pointer-events': 'none',
            }));
            nodeGroup.appendChild(createSVG('circle', {
                cx: x, cy: y, r: R + 2,
                fill: '#3a3028', stroke: '#c4953a', 'stroke-width': 2.5,
                filter: 'url(#marker-shadow)',
            }));
            // Inner ring
            nodeGroup.appendChild(createSVG('circle', {
                cx: x, cy: y, r: R - 3,
                fill: 'none', stroke: '#c4953a', 'stroke-width': 0.8, 'stroke-opacity': 0.4,
            }));
        } else if (isExplored) {
            // Explored: biome-colored circle with border
            const borderColor = getDangerColor(danger);
            nodeGroup.appendChild(createSVG('circle', {
                cx: x, cy: y, r: R,
                fill: biomeInfo.hexFill, stroke: borderColor, 'stroke-width': 1.8,
                filter: 'url(#marker-shadow)',
            }));
            if (isSettlement) {
                nodeGroup.appendChild(createSVG('circle', {
                    cx: x, cy: y, r: R - 4,
                    fill: 'none', stroke: '#c4953a', 'stroke-width': 0.8,
                    'stroke-dasharray': '3 2', 'stroke-opacity': 0.5,
                }));
            }
        } else if (isKnownMapped) {
            // Known with map: faded circle
            nodeGroup.setAttribute('opacity', '0.65');
            nodeGroup.appendChild(createSVG('circle', {
                cx: x, cy: y, r: R - 2,
                fill: biomeInfo.hexFill, stroke: '#4a3a28', 'stroke-width': 1.2,
                'fill-opacity': 0.5,
            }));
        } else if (isKnownUnmapped) {
            // Known without map: ghostly circle
            nodeGroup.setAttribute('filter', 'url(#fog-blur)');
            nodeGroup.setAttribute('opacity', '0.4');
            nodeGroup.appendChild(createSVG('circle', {
                cx: x, cy: y, r: R - 4,
                fill: '#2a2420', stroke: '#3a3028', 'stroke-width': 1,
            }));
        } else {
            // Frontier: very faint dot
            nodeGroup.setAttribute('filter', 'url(#fog-blur)');
            nodeGroup.setAttribute('opacity', '0.35');
            nodeGroup.appendChild(createSVG('circle', {
                cx: x, cy: y, r: R - 6,
                fill: '#2a2420', stroke: '#3a3028', 'stroke-width': 0.8,
            }));
        }

        // Icon and label
        if (isExplored || isCurrent) {
            const iconEl = createSVG('text', { x: x, y: y + 1, class: 'loc-icon' });
            iconEl.textContent = icon;
            nodeGroup.appendChild(iconEl);

            const shortName = name.length > 16 ? name.slice(0, 14) + '..' : name;
            const label = createSVG('text', { x: x, y: y + R + 13, class: 'loc-label' });
            label.textContent = shortName;
            nodeGroup.appendChild(label);
        } else if (isKnownMapped) {
            const iconEl = createSVG('text', { x: x, y: y + 1, class: 'loc-icon', 'fill-opacity': 0.6 });
            iconEl.textContent = icon;
            nodeGroup.appendChild(iconEl);

            const shortName = name.length > 16 ? name.slice(0, 14) + '..' : name;
            const label = createSVG('text', { x: x, y: y + R + 11, class: 'loc-label', 'fill-opacity': 0.45 });
            label.textContent = shortName;
            nodeGroup.appendChild(label);
        } else if (isKnownUnmapped || isFrontier) {
            const qm = createSVG('text', { x: x, y: y + 2, class: 'loc-icon', 'fill-opacity': 0.3 });
            qm.textContent = '?';
            nodeGroup.appendChild(qm);
        }

        // Click handler
        if (isExplored || isKnownMapped) {
            nodeGroup.addEventListener('click', (e) => { e.stopPropagation(); handleLocationTap(locId); });
        } else if (isKnownUnmapped && currentAdj.has(locId)) {
            nodeGroup.style.cursor = 'pointer';
            nodeGroup.addEventListener('click', (e) => { e.stopPropagation(); handleLocationTap(locId); });
        }

        group.appendChild(nodeGroup);
    }
}

// ===============================================================
// PLAYER BANNER (flag/pennant marker)
// ===============================================================

function renderPlayerBanner(svg) {
    const coords = LOCATION_COORDS[S.currentLoc];
    if (!coords) return;
    const { x, y } = hexToPixel(coords.col, coords.row);
    const marker = createSVG('g', { class: 'player-marker' });

    // Breathing glow ring
    marker.appendChild(createSVG('circle', {
        cx: x, cy: y, r: 28,
        fill: 'none', stroke: 'rgba(196,149,58,0.2)', 'stroke-width': 2,
        class: 'player-glow-ring',
    }));
    marker.appendChild(createSVG('circle', {
        cx: x, cy: y, r: 24,
        fill: 'none', stroke: 'rgba(196,149,58,0.1)', 'stroke-width': 1,
        class: 'player-glow-ring',
    }));

    svg.appendChild(marker);
}

// ===============================================================
// FOG WISPS (animated mist over unexplored areas)
// ===============================================================

function renderFogWisps(svg, fogState) {
    const fogGroup = createSVG('g', { class: 'fog-particles', 'pointer-events': 'none' });

    for (const [locId, state] of Object.entries(fogState)) {
        if (state !== 'known_mapped' && state !== 'known_unmapped' && state !== 'frontier') continue;
        const coords = LOCATION_COORDS[locId];
        if (!coords) continue;
        const { x, y } = hexToPixel(coords.col, coords.row);

        let count, baseOpacity, fillColor;
        if (state === 'known_unmapped') { count = 4; baseOpacity = 0.1; fillColor = '#4a4030'; }
        else if (state === 'known_mapped') { count = 2; baseOpacity = 0.05; fillColor = '#6a5a40'; }
        else { count = 3; baseOpacity = 0.08; fillColor = '#5a4a30'; }

        for (let i = 0; i < count; i++) {
            const seed = coords.col * 1000 + coords.row * 100 + i;
            const ox = (seededRandom(seed) - 0.5) * 30;
            const oy = (seededRandom(seed + 50) - 0.5) * 20;
            const cloud = createSVG('ellipse', {
                cx: x + ox, cy: y + oy,
                rx: 12 + seededRandom(seed + 100) * 10,
                ry: 6 + seededRandom(seed + 150) * 5,
                fill: fillColor,
                'fill-opacity': baseOpacity + seededRandom(seed + 200) * 0.04,
                class: 'fog-cloud',
            });
            cloud.style.animationDelay = `${(seededRandom(seed + 300) * 6).toFixed(1)}s`;
            cloud.style.animationDuration = `${(6 + seededRandom(seed + 400) * 4).toFixed(1)}s`;
            fogGroup.appendChild(cloud);
        }
    }
    svg.appendChild(fogGroup);
}

// ===============================================================
// DECORATIVE CARTOGRAPHY (sea monsters, ships, text)
// ===============================================================

function renderCartographyDecor(svg, fogState) {
    const decoGroup = createSVG('g', { class: 'deco-texts' });

    // Mysterious Latin/Portuguese text in unexplored regions
    const texts = [
        { text: 'Aqui Ha Dragoes', col: 12, row: 14, size: 14, rot: -8 },
        { text: 'Terras Desconhecidas', col: 1, row: 2, size: 12, rot: 5 },
        { text: 'Perigo', col: 13, row: 6, size: 11, rot: -12 },
        { text: 'Confins do Mundo', col: 1, row: 14, size: 11, rot: 3 },
        { text: '~ mare incognitum ~', col: 7, row: 15, size: 10, rot: -2 },
        { text: 'Sombras Ancestrais', col: 8, row: 1, size: 11, rot: 6 },
    ];

    for (const t of texts) {
        const { x, y } = hexToPixel(t.col, t.row);
        const nearbyLocs = Object.entries(LOCATION_COORDS).filter(([id, c]) =>
            Math.abs(c.col - t.col) + Math.abs(c.row - t.row) <= 3
        );
        const allHiddenOrFrontier = nearbyLocs.every(([id]) =>
            fogState[id] === 'hidden' || fogState[id] === 'frontier' || !fogState[id]
        );
        if (!allHiddenOrFrontier && nearbyLocs.length > 0) continue;

        const el = createSVG('text', {
            x: x, y: y, class: 'map-deco-text',
            'font-size': t.size + 'px',
            transform: `rotate(${t.rot}, ${x}, ${y})`,
        });
        el.textContent = t.text;
        decoGroup.appendChild(el);
    }

    // Sea serpent illustration in hidden ocean areas
    _drawSeaSerpent(decoGroup, fogState);

    svg.appendChild(decoGroup);
}

function _drawSeaSerpent(group, fogState) {
    // Bottom-right ocean area (if mostly hidden)
    const checkLocs = ['burning_crater', 'deep_swamp', 'valkrest'];
    const allHidden = checkLocs.every(id => fogState[id] === 'hidden' || fogState[id] === 'frontier');
    if (!allHidden) return;

    const sx = SVG_W - 90;
    const sy = SVG_H - 100;
    const serpent = createSVG('g', { opacity: '0.12' });

    // Serpentine body (wavy curve)
    serpent.appendChild(createSVG('path', {
        d: `M${sx},${sy} Q${sx + 15},${sy - 15} ${sx + 25},${sy - 5}
            Q${sx + 35},${sy + 5} ${sx + 45},${sy - 8}
            Q${sx + 55},${sy - 20} ${sx + 60},${sy - 15}`,
        fill: 'none', stroke: '#704214', 'stroke-width': 3, 'stroke-linecap': 'round',
    }));
    // Head
    serpent.appendChild(createSVG('circle', {
        cx: sx + 60, cy: sy - 15, r: 5,
        fill: '#704214',
    }));
    // Eye
    serpent.appendChild(createSVG('circle', {
        cx: sx + 61, cy: sy - 16, r: 1.2,
        fill: '#c4953a',
    }));

    group.appendChild(serpent);
}

// ===============================================================
// COMPASS ROSE
// ===============================================================

function renderCompassRose(svg) {
    const cx = SVG_W - 50;
    const cy = SVG_H - 50;
    const r = 22;
    const g = createSVG('g', { class: 'compass-rose', opacity: '0.4' });

    // Outer circle with tick marks
    g.appendChild(createSVG('circle', {
        cx, cy, r: r + 4, fill: 'none', stroke: '#704214', 'stroke-width': 0.6,
    }));
    g.appendChild(createSVG('circle', {
        cx, cy, r: r + 1, fill: 'none', stroke: '#704214', 'stroke-width': 1,
    }));

    // 8-point star
    const needle = createSVG('g', { class: 'compass-needle' });
    // Main cardinal points (larger)
    const cardinals = [
        { angle: -90, len: r, w: 5, color: '#c4953a' },   // N (gold)
        { angle: 90, len: r * 0.8, w: 4, color: '#5a4020' }, // S
        { angle: 0, len: r * 0.7, w: 3, color: '#8a6a3a' },   // E
        { angle: 180, len: r * 0.7, w: 3, color: '#8a6a3a' },  // W
    ];
    for (const c of cardinals) {
        const rad = c.angle * Math.PI / 180;
        const tx = cx + Math.cos(rad) * c.len;
        const ty = cy + Math.sin(rad) * c.len;
        const px = cx + Math.cos(rad + Math.PI / 2) * c.w;
        const py = cy + Math.sin(rad + Math.PI / 2) * c.w;
        const px2 = cx + Math.cos(rad - Math.PI / 2) * c.w;
        const py2 = cy + Math.sin(rad - Math.PI / 2) * c.w;
        needle.appendChild(createSVG('polygon', {
            points: `${tx},${ty} ${px},${py} ${px2},${py2}`,
            fill: c.color, opacity: c.angle === -90 ? '1' : '0.5',
        }));
    }
    // Intercardinals (smaller)
    for (const angle of [-45, 45, 135, -135]) {
        const rad = angle * Math.PI / 180;
        const tx = cx + Math.cos(rad) * r * 0.55;
        const ty = cy + Math.sin(rad) * r * 0.55;
        needle.appendChild(createSVG('polygon', {
            points: `${tx},${ty} ${cx + Math.cos(rad + 0.4) * 3},${cy + Math.sin(rad + 0.4) * 3} ${cx + Math.cos(rad - 0.4) * 3},${cy + Math.sin(rad - 0.4) * 3}`,
            fill: '#6a5030', opacity: '0.4',
        }));
    }

    needle.appendChild(createSVG('circle', { cx, cy, r: 3, fill: '#c4953a' }));
    needle.appendChild(createSVG('circle', { cx, cy, r: 1.5, fill: '#2a2420' }));
    g.appendChild(needle);

    // Labels
    const labels = [
        { letter: 'N', dx: 0, dy: -r - 8 },
        { letter: 'S', dx: 0, dy: r + 12 },
        { letter: 'L', dx: r + 8, dy: 3 },
        { letter: 'O', dx: -r - 8, dy: 3 },
    ];
    for (const l of labels) {
        const txt = createSVG('text', {
            x: cx + l.dx, y: cy + l.dy,
            'text-anchor': 'middle', 'font-size': '8px',
            'font-family': "'Cinzel', serif", 'font-weight': '700',
            fill: '#c4953a', 'fill-opacity': '0.7',
        });
        txt.textContent = l.letter;
        g.appendChild(txt);
    }

    svg.appendChild(g);
}

// ===============================================================
// PAN / ZOOM
// ===============================================================

function setupPanZoom() {
    const viewport = document.getElementById('map-viewport');
    const wrapper = document.getElementById('map-wrapper');

    let isPanning = false;
    let hasMoved = false;
    let startX = 0, startY = 0;
    let startClientX = 0, startClientY = 0;
    let initialPinchDist = 0;
    let initialZoom = 1;
    const PAN_THRESHOLD = 5;

    function applyTransform() {
        wrapper.style.transform = `translate(${S.panX}px, ${S.panY}px) scale(${S.zoom})`;
        saveViewport();
    }

    function clampPan() {
        const mw = SVG_W * S.zoom;
        const mh = SVG_H * S.zoom;
        const margin = 50;
        S.panX = Math.max(-(mw - margin), Math.min(margin, S.panX));
        S.panY = Math.max(-(mh - margin), Math.min(margin, S.panY));
    }

    viewport.addEventListener('pointerdown', (e) => {
        isPanning = true; hasMoved = false;
        startX = e.clientX - S.panX; startY = e.clientY - S.panY;
        startClientX = e.clientX; startClientY = e.clientY;
    });
    viewport.addEventListener('pointermove', (e) => {
        if (!isPanning) return;
        if (Math.abs(e.clientX - startClientX) > PAN_THRESHOLD || Math.abs(e.clientY - startClientY) > PAN_THRESHOLD) hasMoved = true;
        if (hasMoved) { S.panX = e.clientX - startX; S.panY = e.clientY - startY; clampPan(); applyTransform(); }
    });
    viewport.addEventListener('pointerup', () => { isPanning = false; });
    viewport.addEventListener('pointercancel', () => { isPanning = false; });

    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialPinchDist = Math.hypot(dx, dy); initialZoom = S.zoom;
        }
    }, { passive: true });
    viewport.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            if (initialPinchDist > 0) { S.zoom = Math.max(0.5, Math.min(2.5, initialZoom * (dist / initialPinchDist))); clampPan(); applyTransform(); }
        }
    }, { passive: true });
    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        S.zoom = Math.max(0.5, Math.min(2.5, S.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
        clampPan(); applyTransform();
    }, { passive: false });

    viewport.addEventListener('click', (e) => {
        if (e.target === viewport || e.target === wrapper || e.target.tagName === 'rect') closeInfoPanel();
    });

    applyTransform();
}

// ===============================================================
// CENTER ON LOCATION
// ===============================================================

function centerOnLocation(locId) {
    const coords = LOCATION_COORDS[locId];
    if (!coords) return;
    const viewport = document.getElementById('map-viewport');
    const { x, y } = hexToPixel(coords.col, coords.row);
    S.panX = (viewport.clientWidth / 2) - (x * S.zoom);
    S.panY = (viewport.clientHeight / 2) - (y * S.zoom);
    const wrapper = document.getElementById('map-wrapper');
    wrapper.style.transform = `translate(${S.panX}px, ${S.panY}px) scale(${S.zoom})`;
    saveViewport();
}

// ===============================================================
// SVG HELPERS
// ===============================================================

function createSVG(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    if (attrs) { for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); }
    return el;
}

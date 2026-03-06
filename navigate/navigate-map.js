// ===============================================================
// NAVIGATE MAP — SVG rendering, fog, pan/zoom (medieval style)
// ===============================================================

// -- SVG namespace --
const NS = 'http://www.w3.org/2000/svg';

// -- Seeded random for consistent jitter --
function seededRandom(seed) {
    let x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
}

// -- Jittered hex points (hand-drawn feel) --
function hexPointsJittered(cx, cy, radius, seed, jitter = 2) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i);
        const jx = (seededRandom(seed + i * 7) - 0.5) * jitter;
        const jy = (seededRandom(seed + i * 13 + 3) - 0.5) * jitter;
        pts.push(`${cx + radius * Math.cos(angle) + jx},${cy + radius * Math.sin(angle) + jy}`);
    }
    return pts.join(' ');
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
// RENDER MAP
// ===============================================================

function renderMap() {
    const svg = document.getElementById('map-svg');
    svg.setAttribute('width', SVG_W);
    svg.setAttribute('height', SVG_H);
    svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
    svg.innerHTML = '';

    const fogState = computeFogState();

    // -- SVG Defs: filters, gradients --
    const defs = createSVG('defs');

    // Parchment background gradient (warm dark tones)
    const grad = createSVG('radialGradient', { id: 'bg-grad', cx: '50%', cy: '50%', r: '65%' });
    grad.appendChild(createSVG('stop', { offset: '0%', 'stop-color': '#3a3028' }));
    grad.appendChild(createSVG('stop', { offset: '100%', 'stop-color': '#2a2420' }));
    defs.appendChild(grad);

    // Parchment texture filter (subtle grain)
    const parchFilter = createSVG('filter', { id: 'parchment-grain', x: '0', y: '0', width: '100%', height: '100%' });
    parchFilter.appendChild(createSVG('feTurbulence', {
        type: 'fractalNoise', baseFrequency: '0.6', numOctaves: '3', seed: '42', result: 'grain'
    }));
    parchFilter.appendChild(createSVG('feColorMatrix', {
        in: 'grain', type: 'saturate', values: '0', result: 'grayGrain'
    }));
    const parchBlend = createSVG('feBlend', { in: 'SourceGraphic', in2: 'grayGrain', mode: 'multiply' });
    parchFilter.appendChild(parchBlend);
    defs.appendChild(parchFilter);

    // Fog filter (light)
    const fogLight = createSVG('filter', { id: 'fog-light', x: '-50%', y: '-50%', width: '200%', height: '200%' });
    fogLight.appendChild(createSVG('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '2' }));
    defs.appendChild(fogLight);

    // Fog filter (heavy) with organic displacement
    const fogHeavy = createSVG('filter', { id: 'fog-heavy', x: '-50%', y: '-50%', width: '200%', height: '200%' });
    fogHeavy.appendChild(createSVG('feTurbulence', {
        type: 'turbulence', baseFrequency: '0.04', numOctaves: '2', seed: '7', result: 'fogNoise'
    }));
    fogHeavy.appendChild(createSVG('feDisplacementMap', {
        in: 'SourceGraphic', in2: 'fogNoise', scale: '4', xChannelSelector: 'R', yChannelSelector: 'G', result: 'displaced'
    }));
    fogHeavy.appendChild(createSVG('feGaussianBlur', { in: 'displaced', stdDeviation: '3' }));
    defs.appendChild(fogHeavy);

    svg.appendChild(defs);

    // Layer 0: Parchment background
    const bg = createSVG('rect', {
        x: 0, y: 0, width: SVG_W, height: SVG_H,
        fill: 'url(#bg-grad)',
    });
    svg.appendChild(bg);

    // Parchment grain overlay (very subtle)
    const grainOverlay = createSVG('rect', {
        x: 0, y: 0, width: SVG_W, height: SVG_H,
        fill: '#3a3028', opacity: '0.15',
        filter: 'url(#parchment-grain)',
    });
    svg.appendChild(grainOverlay);

    // Layer 1: Decorative border frame
    renderBorderFrame(svg);

    // Layer 2: Terrain hexes (decorative)
    const terrainGroup = createSVG('g', { class: 'terrain-layer' });
    renderTerrainHexes(terrainGroup, fogState);
    svg.appendChild(terrainGroup);

    // Layer 3: Decorative text in unexplored areas
    renderDecorativeTexts(svg, fogState);

    // Layer 4: Connection paths (hand-drawn sepia)
    const pathGroup = createSVG('g', { class: 'paths-layer' });
    renderConnectionPaths(pathGroup, fogState);
    svg.appendChild(pathGroup);

    // Layer 5: Location nodes (jittered hexes)
    const locGroup = createSVG('g', { class: 'locations-layer' });
    renderLocationNodes(locGroup, fogState);
    svg.appendChild(locGroup);

    // Layer 6: Player marker
    renderPlayerMarker(svg);

    // Layer 7: Fog particles (animated mist)
    renderFogParticles(svg, fogState);

    // Layer 8: Compass rose
    renderCompassRose(svg);

    // Setup pan/zoom
    setupPanZoom();
}

// -- Border frame (cartographic ornament) --
function renderBorderFrame(svg) {
    const m = 12; // margin
    const frameColor = '#704214';
    const frameOpacity = 0.2;

    // Outer rectangle
    svg.appendChild(createSVG('rect', {
        x: m, y: m, width: SVG_W - m * 2, height: SVG_H - m * 2,
        fill: 'none', stroke: frameColor, 'stroke-width': 1.5, 'stroke-opacity': frameOpacity,
    }));
    // Inner rectangle
    svg.appendChild(createSVG('rect', {
        x: m + 5, y: m + 5, width: SVG_W - m * 2 - 10, height: SVG_H - m * 2 - 10,
        fill: 'none', stroke: frameColor, 'stroke-width': 0.5, 'stroke-opacity': frameOpacity * 0.6,
    }));

    // Corner ornaments (small L-shapes with dots)
    const corners = [
        [m, m], [SVG_W - m, m], [m, SVG_H - m], [SVG_W - m, SVG_H - m]
    ];
    const cLen = 18;
    for (let ci = 0; ci < corners.length; ci++) {
        const [cx, cy] = corners[ci];
        const dx = ci % 2 === 0 ? 1 : -1;
        const dy = ci < 2 ? 1 : -1;
        // L-shape lines
        svg.appendChild(createSVG('line', {
            x1: cx, y1: cy, x2: cx + cLen * dx, y2: cy,
            stroke: frameColor, 'stroke-width': 2, 'stroke-opacity': frameOpacity * 1.5,
        }));
        svg.appendChild(createSVG('line', {
            x1: cx, y1: cy, x2: cx, y2: cy + cLen * dy,
            stroke: frameColor, 'stroke-width': 2, 'stroke-opacity': frameOpacity * 1.5,
        }));
        // Corner dot
        svg.appendChild(createSVG('circle', {
            cx: cx, cy: cy, r: 2.5,
            fill: frameColor, 'fill-opacity': frameOpacity * 1.2,
        }));
    }
}

// -- Decorative texts in unexplored areas --
function renderDecorativeTexts(svg, fogState) {
    const decoGroup = createSVG('g', { class: 'deco-texts' });
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
        // Only show in areas that are hidden or frontier
        const nearbyLocs = Object.entries(LOCATION_COORDS).filter(([id, c]) =>
            Math.abs(c.col - t.col) + Math.abs(c.row - t.row) <= 3
        );
        const allHiddenOrFrontier = nearbyLocs.every(([id]) =>
            fogState[id] === 'hidden' || fogState[id] === 'frontier' || !fogState[id]
        );
        if (!allHiddenOrFrontier && nearbyLocs.length > 0) continue;

        const el = createSVG('text', {
            x: x, y: y,
            class: 'map-deco-text',
            'font-size': t.size + 'px',
            transform: `rotate(${t.rot}, ${x}, ${y})`,
        });
        el.textContent = t.text;
        decoGroup.appendChild(el);
    }
    svg.appendChild(decoGroup);
}

// -- Compass rose (bottom-left of map area) --
function renderCompassRose(svg) {
    const cx = SVG_W - 50;
    const cy = SVG_H - 50;
    const r = 22;
    const g = createSVG('g', { class: 'compass-rose', opacity: '0.4' });

    // Outer circle
    g.appendChild(createSVG('circle', {
        cx, cy, r: r + 2,
        fill: 'none', stroke: '#704214', 'stroke-width': 0.8,
    }));

    // Needle group (trembles)
    const needle = createSVG('g', { class: 'compass-needle' });

    // North (gold, prominent)
    needle.appendChild(createSVG('polygon', {
        points: `${cx},${cy - r} ${cx + 4},${cy} ${cx - 4},${cy}`,
        fill: '#c4953a',
    }));
    // South (dark)
    needle.appendChild(createSVG('polygon', {
        points: `${cx},${cy + r} ${cx - 3},${cy} ${cx + 3},${cy}`,
        fill: '#5a4020', opacity: '0.6',
    }));
    // East
    needle.appendChild(createSVG('polygon', {
        points: `${cx + r},${cy} ${cx},${cy - 3} ${cx},${cy + 3}`,
        fill: '#8a6a3a', opacity: '0.4',
    }));
    // West
    needle.appendChild(createSVG('polygon', {
        points: `${cx - r},${cy} ${cx},${cy + 3} ${cx},${cy - 3}`,
        fill: '#8a6a3a', opacity: '0.4',
    }));
    // Center
    needle.appendChild(createSVG('circle', {
        cx, cy, r: 2, fill: '#c4953a',
    }));
    g.appendChild(needle);

    // Cardinal labels
    const labels = [
        { letter: 'N', dx: 0, dy: -r - 7 },
        { letter: 'S', dx: 0, dy: r + 11 },
        { letter: 'L', dx: r + 7, dy: 3 },
        { letter: 'O', dx: -r - 7, dy: 3 },
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

// -- Terrain hexes --
function renderTerrainHexes(group, fogState) {
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);

    for (const [col, row, biome] of TERRAIN_HEXES) {
        const { x, y } = hexToPixel(col, row);
        const info = BIOME_INFO[biome] || BIOME_INFO.plains;

        let opacity = 0;
        let nearExplored = false;
        let nearUnmapped = false;
        for (const locId of knownSet) {
            const coords = LOCATION_COORDS[locId];
            if (!coords) continue;
            const dist = Math.abs(col - coords.col) + Math.abs(row - coords.row);
            if (dist <= 3) {
                opacity = Math.max(opacity, dist <= 1 ? 0.4 : 0.2);
                if (discoveredSet.has(locId)) nearExplored = true;
                if (fogState[locId] === 'known_unmapped') nearUnmapped = true;
            }
        }

        if (opacity <= 0) continue;
        if (!nearExplored) opacity *= 0.5;
        if (nearUnmapped && !nearExplored) opacity *= 0.4;

        // Use jittered hex for hand-drawn look
        const seed = col * 100 + row;
        const hex = createSVG('polygon', {
            points: hexPointsJittered(x, y, HEX_RADIUS * 0.7, seed, 1.5),
            fill: info.hexFill,
            'fill-opacity': opacity,
            stroke: 'none',
            class: 'terrain-hex',
        });
        group.appendChild(hex);
    }
}

// -- Connection paths (hand-drawn sepia with jitter) --
function renderConnectionPaths(group, fogState) {
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

        let lineOpacity = 0.1;
        if (bothExplored) lineOpacity = 0.35;
        else if (anyExplored) lineOpacity = 0.2;
        if (isActive) lineOpacity = 0.6;
        if (aFog === 'frontier' || bFog === 'frontier') lineOpacity = 0.08;
        if (aFog === 'known_unmapped' || bFog === 'known_unmapped') lineOpacity = 0.05;
        else if (aFog === 'known_mapped' || bFog === 'known_mapped') lineOpacity = Math.max(lineOpacity, 0.12);

        // Hand-drawn path: add jitter to midpoint for organic curve
        const seed = (aCoords.col * 31 + aCoords.row * 17 + bCoords.col * 13 + bCoords.row * 7);
        const mx = (aPx.x + bPx.x) / 2;
        const my = (aPx.y + bPx.y) / 2;

        // Perpendicular offset for organic curve
        const dx = bPx.x - aPx.x;
        const dy = bPx.y - aPx.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / len;
        const perpY = dx / len;
        const jitterAmt = (seededRandom(seed) - 0.5) * 8;

        const midX = mx + perpX * jitterAmt;
        const midY = my + perpY * jitterAmt;

        // Draw as quadratic bezier for organic hand-drawn feel
        const pathD = `M${aPx.x},${aPx.y} Q${midX},${midY} ${bPx.x},${bPx.y}`;
        const path = createSVG('path', {
            d: pathD,
            fill: 'none',
            class: `path-line${isActive ? ' active' : ''}`,
            'stroke-opacity': lineOpacity,
        });
        group.appendChild(path);

        // Distance badge on path midpoint
        if (anyExplored) {
            const dist = getConnectionDistance(aId, bId);
            const badgeBg = createSVG('circle', {
                cx: midX, cy: midY, r: 9,
                fill: '#2a2420', 'fill-opacity': 0.85,
                stroke: bothExplored ? '#704214' : '#3a3028',
                'stroke-width': 0.8,
            });
            group.appendChild(badgeBg);

            const badgeTxt = createSVG('text', {
                x: midX, y: midY + 3.5,
                'text-anchor': 'middle',
                'font-size': '9px', 'font-weight': '600',
                'font-family': "'Cinzel', serif",
                fill: bothExplored ? '#8a7060' : '#5a4a3a',
                'pointer-events': 'none',
            });
            badgeTxt.textContent = dist;
            group.appendChild(badgeTxt);
        }
    }
}

// -- Location nodes --
function renderLocationNodes(group, fogState) {
    const currentAdj = new Set();
    for (const [a, b] of CONNECTION_EDGES) {
        if (a === S.currentLoc) currentAdj.add(b);
        if (b === S.currentLoc) currentAdj.add(a);
    }

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
            class: `loc-hex ${fog}${isCurrent ? ' current' : ''}`,
            'data-loc': locId,
        });

        // Hex background (jittered for hand-drawn feel)
        const hexRadius = isCurrent ? HEX_RADIUS + 2 : HEX_RADIUS;
        let fillColor, strokeColor, strokeWidth;

        if (isCurrent) {
            fillColor = '#3a3028';
            strokeColor = '#c4953a';
            strokeWidth = 2.5;
        } else if (isExplored) {
            fillColor = biomeInfo.hexFill;
            strokeColor = getDangerColor(danger);
            strokeWidth = 1.5;
        } else if (isKnownMapped) {
            fillColor = biomeInfo.hexFill;
            strokeColor = '#4a3a28';
            strokeWidth = 1.2;
        } else if (isKnownUnmapped) {
            fillColor = '#2a2420';
            strokeColor = '#3a3028';
            strokeWidth = 1;
        } else {
            fillColor = '#2a2420';
            strokeColor = '#3a3028';
            strokeWidth = 1;
        }

        const effectiveRadius = (isFrontier || isKnownUnmapped) ? HEX_RADIUS * 0.85 : hexRadius;
        const seed = coords.col * 100 + coords.row;
        const jitterAmt = isCurrent ? 1 : (isExplored ? 2 : 1.5);

        const hexPoly = createSVG('polygon', {
            points: hexPointsJittered(x, y, effectiveRadius, seed, jitterAmt),
            fill: fillColor,
            stroke: strokeColor,
            'stroke-width': strokeWidth,
        });
        nodeGroup.appendChild(hexPoly);

        // Settlement indicator (inner ring)
        if (isSettlement && isExplored) {
            const ring = createSVG('polygon', {
                points: hexPointsJittered(x, y, hexRadius - 4, seed + 500, 1),
                fill: 'none',
                stroke: '#c4953a',
                'stroke-width': 1,
                'stroke-dasharray': '3 2',
                'stroke-opacity': 0.5,
            });
            nodeGroup.appendChild(ring);
        }

        if (isExplored || isCurrent) {
            const iconEl = createSVG('text', { x: x, y: y - 3, class: 'loc-icon' });
            iconEl.textContent = icon;
            nodeGroup.appendChild(iconEl);

            const shortName = name.length > 16 ? name.slice(0, 14) + '..' : name;
            const label = createSVG('text', { x: x, y: y + hexRadius + 12, class: 'loc-label' });
            label.textContent = shortName;
            nodeGroup.appendChild(label);
        } else if (isKnownMapped) {
            nodeGroup.setAttribute('filter', 'url(#fog-light)');
            nodeGroup.setAttribute('opacity', '0.7');

            const iconEl = createSVG('text', {
                x: x, y: y - 3, class: 'loc-icon', 'fill-opacity': 0.7,
            });
            iconEl.textContent = icon;
            nodeGroup.appendChild(iconEl);

            const shortName = name.length > 16 ? name.slice(0, 14) + '..' : name;
            const label = createSVG('text', {
                x: x, y: y + hexRadius + 12, class: 'loc-label', 'fill-opacity': 0.5,
            });
            label.textContent = shortName;
            nodeGroup.appendChild(label);
        } else if (isKnownUnmapped) {
            nodeGroup.setAttribute('filter', 'url(#fog-heavy)');
            nodeGroup.setAttribute('opacity', '0.45');

            const qmark = createSVG('text', {
                x: x, y: y, class: 'loc-icon', 'fill-opacity': 0.2,
            });
            qmark.textContent = '?';
            nodeGroup.appendChild(qmark);
        } else {
            // Frontier
            nodeGroup.setAttribute('filter', 'url(#fog-heavy)');
            nodeGroup.setAttribute('opacity', '0.4');

            const qmark = createSVG('text', {
                x: x, y: y, class: 'loc-icon', 'fill-opacity': 0.35,
            });
            qmark.textContent = '?';
            nodeGroup.appendChild(qmark);
        }

        // Click handler
        if (isExplored || isKnownMapped) {
            nodeGroup.addEventListener('click', (e) => {
                e.stopPropagation();
                handleLocationTap(locId);
            });
        } else if (isKnownUnmapped && currentAdj.has(locId)) {
            nodeGroup.style.cursor = 'pointer';
            nodeGroup.addEventListener('click', (e) => {
                e.stopPropagation();
                handleLocationTap(locId);
            });
        }

        group.appendChild(nodeGroup);
    }
}

// -- Player marker --
function renderPlayerMarker(svg) {
    const coords = LOCATION_COORDS[S.currentLoc];
    if (!coords) return;

    const { x, y } = hexToPixel(coords.col, coords.row);
    const marker = createSVG('g', { class: 'player-marker' });

    // Outer glow ring (organic shape)
    const glow = createSVG('circle', {
        cx: x, cy: y, r: HEX_RADIUS + 7,
        fill: 'none',
        stroke: 'rgba(196, 149, 58, 0.25)',
        'stroke-width': 2.5,
    });
    marker.appendChild(glow);
    svg.appendChild(marker);
}

// -- Fog particles (animated mist) --
function renderFogParticles(svg, fogState) {
    const fogGroup = createSVG('g', { class: 'fog-particles', 'pointer-events': 'none' });

    for (const [locId, state] of Object.entries(fogState)) {
        if (state !== 'known_mapped' && state !== 'known_unmapped' && state !== 'frontier') continue;
        const coords = LOCATION_COORDS[locId];
        if (!coords) continue;
        const { x, y } = hexToPixel(coords.col, coords.row);

        let count, baseOpacity, fillColor;
        if (state === 'known_unmapped') {
            count = 5; baseOpacity = 0.12; fillColor = '#4a4030';
        } else if (state === 'known_mapped') {
            count = 3; baseOpacity = 0.06; fillColor = '#6a5a40';
        } else {
            count = 4; baseOpacity = 0.10; fillColor = '#5a4a30';
        }

        for (let i = 0; i < count; i++) {
            const seed = coords.col * 1000 + coords.row * 100 + i;
            const ox = (seededRandom(seed) - 0.5) * HEX_RADIUS * 1.8;
            const oy = (seededRandom(seed + 50) - 0.5) * HEX_RADIUS * 1.2;
            const cloud = createSVG('ellipse', {
                cx: x + ox, cy: y + oy,
                rx: HEX_RADIUS * (0.5 + seededRandom(seed + 100) * 0.5),
                ry: HEX_RADIUS * (0.25 + seededRandom(seed + 150) * 0.25),
                fill: fillColor,
                'fill-opacity': baseOpacity + seededRandom(seed + 200) * 0.05,
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
        isPanning = true;
        hasMoved = false;
        startX = e.clientX - S.panX;
        startY = e.clientY - S.panY;
        startClientX = e.clientX;
        startClientY = e.clientY;
    });

    viewport.addEventListener('pointermove', (e) => {
        if (!isPanning) return;
        const dx = Math.abs(e.clientX - startClientX);
        const dy = Math.abs(e.clientY - startClientY);
        if (dx > PAN_THRESHOLD || dy > PAN_THRESHOLD) hasMoved = true;
        if (hasMoved) {
            S.panX = e.clientX - startX;
            S.panY = e.clientY - startY;
            clampPan();
            applyTransform();
        }
    });

    viewport.addEventListener('pointerup', () => { isPanning = false; });
    viewport.addEventListener('pointercancel', () => { isPanning = false; });

    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialPinchDist = Math.hypot(dx, dy);
            initialZoom = S.zoom;
        }
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            if (initialPinchDist > 0) {
                S.zoom = Math.max(0.5, Math.min(2.5, initialZoom * (dist / initialPinchDist)));
                clampPan();
                applyTransform();
            }
        }
    }, { passive: true });

    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        S.zoom = Math.max(0.5, Math.min(2.5, S.zoom * delta));
        clampPan();
        applyTransform();
    }, { passive: false });

    viewport.addEventListener('click', (e) => {
        if (e.target === viewport || e.target === wrapper || e.target.tagName === 'rect') {
            closeInfoPanel();
        }
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

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;

    S.panX = (vw / 2) - (x * S.zoom);
    S.panY = (vh / 2) - (y * S.zoom);

    const wrapper = document.getElementById('map-wrapper');
    wrapper.style.transform = `translate(${S.panX}px, ${S.panY}px) scale(${S.zoom})`;
    saveViewport();
}

// ===============================================================
// SVG HELPERS
// ===============================================================

function createSVG(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
            el.setAttribute(k, v);
        }
    }
    return el;
}

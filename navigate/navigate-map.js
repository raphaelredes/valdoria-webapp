// ═══════════════════════════════════════════════════════
// NAVIGATE MAP — SVG rendering, fog, pan/zoom
// ═══════════════════════════════════════════════════════

// ── SVG namespace ──
const NS = 'http://www.w3.org/2000/svg';

// ── Fog state for each location ──
// 'explored'       = visited + has map → full render (persistent)
// 'known_mapped'   = known + has map, not visited → fog with silhouette (icon visible)
// 'known_unmapped' = known + no map → fog without silhouette (no icon, heavy fog)
// 'frontier'       = adjacent to known but not in known_locations → ❓ + heavy fog
// 'hidden'         = completely unknown → invisible
function computeFogState() {
    const fog = {};
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);

    // Build adjacency from LOCATION_COORDS + CONNECTION_EDGES
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

// ═══════════════════════════════════════════════════════
// RENDER MAP
// ═══════════════════════════════════════════════════════

function renderMap() {
    const svg = document.getElementById('map-svg');
    svg.setAttribute('width', SVG_W);
    svg.setAttribute('height', SVG_H);
    svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
    svg.innerHTML = '';

    const fogState = computeFogState();

    // Layer 1: Background gradient + SVG filters
    const defs = createSVG('defs');
    const grad = createSVG('radialGradient', { id: 'bg-grad', cx: '50%', cy: '50%', r: '60%' });
    grad.appendChild(createSVG('stop', { offset: '0%', 'stop-color': '#2a2630' }));
    grad.appendChild(createSVG('stop', { offset: '100%', 'stop-color': '#1a181e' }));
    defs.appendChild(grad);

    // Fog filter — light (known locations: have map info but never visited)
    const fogLight = createSVG('filter', { id: 'fog-light', x: '-50%', y: '-50%', width: '200%', height: '200%' });
    fogLight.appendChild(createSVG('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '2' }));
    defs.appendChild(fogLight);

    // Fog filter — heavy (frontier: adjacent unknown)
    const fogHeavy = createSVG('filter', { id: 'fog-heavy', x: '-50%', y: '-50%', width: '200%', height: '200%' });
    fogHeavy.appendChild(createSVG('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '4' }));
    defs.appendChild(fogHeavy);

    svg.appendChild(defs);

    const bg = createSVG('rect', {
        x: 0, y: 0, width: SVG_W, height: SVG_H,
        fill: 'url(#bg-grad)',
    });
    svg.appendChild(bg);

    // Layer 2: Terrain hexes (decorative)
    const terrainGroup = createSVG('g', { class: 'terrain-layer' });
    renderTerrainHexes(terrainGroup, fogState);
    svg.appendChild(terrainGroup);

    // Layer 3: Connection paths
    const pathGroup = createSVG('g', { class: 'paths-layer' });
    renderConnectionPaths(pathGroup, fogState);
    svg.appendChild(pathGroup);

    // Layer 4: Location nodes
    const locGroup = createSVG('g', { class: 'locations-layer' });
    renderLocationNodes(locGroup, fogState);
    svg.appendChild(locGroup);

    // Layer 5: Player marker
    renderPlayerMarker(svg);

    // Layer 6: Fog particles (animated mist over known/frontier locations)
    renderFogParticles(svg, fogState);

    // Setup pan/zoom
    setupPanZoom();
}

// ── Terrain hexes ──
function renderTerrainHexes(group, fogState) {
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);

    for (const [col, row, biome] of TERRAIN_HEXES) {
        const { x, y } = hexToPixel(col, row);
        const info = BIOME_INFO[biome] || BIOME_INFO.plains;

        // Determine visibility based on proximity to known locations
        let opacity = 0;
        let nearExplored = false;
        let nearUnmapped = false;
        for (const locId of knownSet) {
            const coords = LOCATION_COORDS[locId];
            if (!coords) continue;
            const lx = coords.col, ly = coords.row;
            const dist = Math.abs(col - lx) + Math.abs(row - ly);
            if (dist <= 3) {
                opacity = Math.max(opacity, dist <= 1 ? 0.4 : 0.2);
                if (discoveredSet.has(locId)) nearExplored = true;
                if (fogState[locId] === 'known_unmapped') nearUnmapped = true;
            }
        }

        if (opacity <= 0) continue;

        // Reduce opacity for terrain near unvisited-but-known locations
        if (!nearExplored) opacity *= 0.5;
        // Further reduce for terrain near unmapped locations (no silhouette)
        if (nearUnmapped && !nearExplored) opacity *= 0.4;

        const hex = createSVG('polygon', {
            points: hexPoints(x, y, HEX_RADIUS * 0.7),
            fill: info.hexFill,
            'fill-opacity': opacity,
            stroke: 'none',
            class: 'terrain-hex',
        });
        group.appendChild(hex);
    }
}

// ── Connection paths ──
function renderConnectionPaths(group, fogState) {
    for (const [aId, bId] of CONNECTION_EDGES) {
        const aFog = fogState[aId];
        const bFog = fogState[bId];

        // Only draw if at least one end is not hidden
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

        const line = createSVG('line', {
            x1: aPx.x, y1: aPx.y,
            x2: bPx.x, y2: bPx.y,
            class: `path-line${isActive ? ' active' : ''}`,
            'stroke-opacity': lineOpacity,
        });
        group.appendChild(line);

        // Distance badge on path midpoint (only if at least one end is explored)
        if (anyExplored) {
            const dist = getConnectionDistance(aId, bId);
            const mx = (aPx.x + bPx.x) / 2;
            const my = (aPx.y + bPx.y) / 2;

            const badgeBg = createSVG('circle', {
                cx: mx, cy: my, r: 9,
                fill: '#2a2630',
                'fill-opacity': 0.85,
                stroke: bothExplored ? '#555' : '#3a3540',
                'stroke-width': 0.8,
            });
            group.appendChild(badgeBg);

            const badgeTxt = createSVG('text', {
                x: mx, y: my + 3.5,
                'text-anchor': 'middle',
                'font-size': '9px',
                'font-weight': '600',
                'font-family': '-apple-system, BlinkMacSystemFont, sans-serif',
                fill: bothExplored ? '#8a8090' : '#5a5560',
                'pointer-events': 'none',
            });
            badgeTxt.textContent = dist;
            group.appendChild(badgeTxt);
        }
    }
}

// ── Location nodes ──
function renderLocationNodes(group, fogState) {
    // Build adjacency for known_unmapped clickability check
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

        // Get biome info
        const biome = locData?.b || 'plains';
        const biomeInfo = BIOME_INFO[biome] || BIOME_INFO.plains;
        const danger = locData?.d || 0;
        const icon = locData?.i || '❓';
        const name = locData?.n || '';
        const isSettlement = locData?.s || false;

        // Node group
        const nodeGroup = createSVG('g', {
            class: `loc-hex ${fog}${isCurrent ? ' current' : ''}`,
            'data-loc': locId,
        });

        // Hex background
        const hexRadius = isCurrent ? HEX_RADIUS + 2 : HEX_RADIUS;
        let fillColor, strokeColor, strokeWidth;

        if (isCurrent) {
            fillColor = '#3a3530';
            strokeColor = '#c4953a';
            strokeWidth = 2.5;
        } else if (isExplored) {
            fillColor = biomeInfo.hexFill;
            strokeColor = getDangerColor(danger);
            strokeWidth = 1.5;
        } else if (isKnownMapped) {
            // Has map — silhouette visible: muted biome color
            fillColor = biomeInfo.hexFill;
            strokeColor = '#3e3845';
            strokeWidth = 1.2;
        } else if (isKnownUnmapped) {
            // No map — no silhouette: dark neutral hex
            fillColor = '#2a2630';
            strokeColor = '#332e3a';
            strokeWidth = 1;
        } else {
            // Frontier — dark, mysterious
            fillColor = '#2a2630';
            strokeColor = '#3e3845';
            strokeWidth = 1;
        }

        const hexPoly = createSVG('polygon', {
            points: hexPoints(x, y, (isFrontier || isKnownUnmapped) ? HEX_RADIUS * 0.85 : hexRadius),
            fill: fillColor,
            stroke: strokeColor,
            'stroke-width': strokeWidth,
        });
        nodeGroup.appendChild(hexPoly);

        // Settlement indicator (inner ring) — only on explored settlements
        if (isSettlement && isExplored) {
            const ring = createSVG('polygon', {
                points: hexPoints(x, y, hexRadius - 4),
                fill: 'none',
                stroke: '#c4953a',
                'stroke-width': 1,
                'stroke-dasharray': '3 2',
                'stroke-opacity': 0.5,
            });
            nodeGroup.appendChild(ring);
        }

        if (isExplored || isCurrent) {
            // Explored: full icon + name
            const iconEl = createSVG('text', {
                x: x, y: y - 3,
                class: 'loc-icon',
            });
            iconEl.textContent = icon;
            nodeGroup.appendChild(iconEl);

            const shortName = name.length > 16 ? name.slice(0, 14) + '..' : name;
            const label = createSVG('text', {
                x: x, y: y + hexRadius + 12,
                class: 'loc-label',
            });
            label.textContent = shortName;
            nodeGroup.appendChild(label);
        } else if (isKnownMapped) {
            // Known + has map: silhouette — icon visible through fog, name dimmed
            nodeGroup.setAttribute('filter', 'url(#fog-light)');
            nodeGroup.setAttribute('opacity', '0.7');

            const iconEl = createSVG('text', {
                x: x, y: y - 3,
                class: 'loc-icon',
                'fill-opacity': 0.7,
            });
            iconEl.textContent = icon;
            nodeGroup.appendChild(iconEl);

            const shortName = name.length > 16 ? name.slice(0, 14) + '..' : name;
            const label = createSVG('text', {
                x: x, y: y + hexRadius + 12,
                class: 'loc-label',
                'fill-opacity': 0.5,
            });
            label.textContent = shortName;
            nodeGroup.appendChild(label);
        } else if (isKnownUnmapped) {
            // Known + NO map: fog without silhouette — no icon, no name
            nodeGroup.setAttribute('filter', 'url(#fog-heavy)');
            nodeGroup.setAttribute('opacity', '0.45');

            // Just a faint question mark to indicate something exists
            const qmark = createSVG('text', {
                x: x, y: y,
                class: 'loc-icon',
                'fill-opacity': 0.2,
            });
            qmark.textContent = '🌫️';
            nodeGroup.appendChild(qmark);
        } else {
            // Frontier: question mark through heavy fog
            nodeGroup.setAttribute('filter', 'url(#fog-heavy)');
            nodeGroup.setAttribute('opacity', '0.4');

            const qmark = createSVG('text', {
                x: x, y: y,
                class: 'loc-icon',
                'fill-opacity': 0.35,
            });
            qmark.textContent = '❓';
            nodeGroup.appendChild(qmark);
        }

        // Click handler
        // Explored + known_mapped: always clickable
        // Known_unmapped: clickable only if adjacent to current location
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

// ── Player marker ──
function renderPlayerMarker(svg) {
    const coords = LOCATION_COORDS[S.currentLoc];
    if (!coords) return;

    const { x, y } = hexToPixel(coords.col, coords.row);

    const marker = createSVG('g', { class: 'player-marker' });

    // Outer glow ring
    const glow = createSVG('circle', {
        cx: x, cy: y, r: HEX_RADIUS + 7,
        fill: 'none',
        stroke: 'rgba(196, 149, 58, 0.25)',
        'stroke-width': 2.5,
    });
    marker.appendChild(glow);

    svg.appendChild(marker);
}

// ── Fog particles (animated mist) ──
function renderFogParticles(svg, fogState) {
    const fogGroup = createSVG('g', { class: 'fog-particles', 'pointer-events': 'none' });

    for (const [locId, state] of Object.entries(fogState)) {
        if (state !== 'known_mapped' && state !== 'known_unmapped' && state !== 'frontier') continue;
        const coords = LOCATION_COORDS[locId];
        if (!coords) continue;
        const { x, y } = hexToPixel(coords.col, coords.row);

        // Denser fog for unmapped, lighter for mapped, medium for frontier
        let count, baseOpacity, fillColor;
        if (state === 'known_unmapped') {
            count = 5;
            baseOpacity = 0.12;
            fillColor = '#4a4a5a';
        } else if (state === 'known_mapped') {
            count = 3;
            baseOpacity = 0.06;
            fillColor = '#8a8a9a';
        } else {
            // frontier
            count = 4;
            baseOpacity = 0.10;
            fillColor = '#5a5a6a';
        }

        for (let i = 0; i < count; i++) {
            const ox = (Math.random() - 0.5) * HEX_RADIUS * 1.8;
            const oy = (Math.random() - 0.5) * HEX_RADIUS * 1.2;
            const cloud = createSVG('ellipse', {
                cx: x + ox, cy: y + oy,
                rx: HEX_RADIUS * (0.5 + Math.random() * 0.5),
                ry: HEX_RADIUS * (0.25 + Math.random() * 0.25),
                fill: fillColor,
                'fill-opacity': baseOpacity + Math.random() * 0.05,
                class: 'fog-cloud',
            });
            cloud.style.animationDelay = `${(Math.random() * 6).toFixed(1)}s`;
            cloud.style.animationDuration = `${(6 + Math.random() * 4).toFixed(1)}s`;
            fogGroup.appendChild(cloud);
        }
    }
    svg.appendChild(fogGroup);
}

// ═══════════════════════════════════════════════════════
// PAN / ZOOM
// ═══════════════════════════════════════════════════════

function setupPanZoom() {
    const viewport = document.getElementById('map-viewport');
    const wrapper = document.getElementById('map-wrapper');

    let isPanning = false;
    let hasMoved = false;
    let startX = 0, startY = 0;
    let startClientX = 0, startClientY = 0;

    // Pinch zoom state
    let initialPinchDist = 0;
    let initialZoom = 1;

    const PAN_THRESHOLD = 5; // px before we consider it a drag

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

    // Pan via pointer events on the viewport (background)
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
        if (dx > PAN_THRESHOLD || dy > PAN_THRESHOLD) {
            hasMoved = true;
        }
        if (hasMoved) {
            S.panX = e.clientX - startX;
            S.panY = e.clientY - startY;
            clampPan();
            applyTransform();
        }
    });

    viewport.addEventListener('pointerup', () => {
        isPanning = false;
    });

    viewport.addEventListener('pointercancel', () => {
        isPanning = false;
    });

    // Pinch zoom via touch
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

    // Mouse wheel zoom (desktop testing)
    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        S.zoom = Math.max(0.5, Math.min(2.5, S.zoom * delta));
        clampPan();
        applyTransform();
    }, { passive: false });

    // Click on empty area closes info panel
    viewport.addEventListener('click', (e) => {
        if (e.target === viewport || e.target === wrapper || e.target.tagName === 'rect') {
            closeInfoPanel();
        }
    });

    // Apply initial transform
    applyTransform();
}

// ═══════════════════════════════════════════════════════
// CENTER ON LOCATION
// ═══════════════════════════════════════════════════════

function centerOnLocation(locId) {
    const coords = LOCATION_COORDS[locId];
    if (!coords) return;

    const viewport = document.getElementById('map-viewport');
    const { x, y } = hexToPixel(coords.col, coords.row);

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;

    // Center the location in the viewport
    S.panX = (vw / 2) - (x * S.zoom);
    S.panY = (vh / 2) - (y * S.zoom);

    const wrapper = document.getElementById('map-wrapper');
    wrapper.style.transform = `translate(${S.panX}px, ${S.panY}px) scale(${S.zoom})`;
    saveViewport();
}

// ═══════════════════════════════════════════════════════
// SVG HELPERS
// ═══════════════════════════════════════════════════════

function createSVG(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
            el.setAttribute(k, v);
        }
    }
    return el;
}

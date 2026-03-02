// ═══════════════════════════════════════════════════════
// NAVIGATE MAP — SVG rendering, fog, pan/zoom
// ═══════════════════════════════════════════════════════

// ── SVG namespace ──
const NS = 'http://www.w3.org/2000/svg';

// ── Fog state for each location ──
// 'visible' | 'dim' | 'hidden'
function computeFogState() {
    const fog = {};
    const knownSet = new Set(S.knownLocs);

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
            fog[locId] = 'visible';
        } else {
            // Check if adjacent to any known location
            const neighbors = adj[locId] || [];
            const hasKnownNeighbor = neighbors.some(n => knownSet.has(n));
            fog[locId] = hasKnownNeighbor ? 'dim' : 'hidden';
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

    // Layer 1: Background gradient
    const defs = createSVG('defs');
    const grad = createSVG('radialGradient', { id: 'bg-grad', cx: '50%', cy: '50%', r: '60%' });
    grad.appendChild(createSVG('stop', { offset: '0%', 'stop-color': '#2a2630' }));
    grad.appendChild(createSVG('stop', { offset: '100%', 'stop-color': '#1a181e' }));
    defs.appendChild(grad);
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

    // Setup pan/zoom
    setupPanZoom();
}

// ── Terrain hexes ──
function renderTerrainHexes(group, fogState) {
    const knownSet = new Set(S.knownLocs);

    for (const [col, row, biome] of TERRAIN_HEXES) {
        const { x, y } = hexToPixel(col, row);
        const info = BIOME_INFO[biome] || BIOME_INFO.plains;

        // Determine visibility based on proximity to known locations
        let opacity = 0;
        for (const locId of knownSet) {
            const coords = LOCATION_COORDS[locId];
            if (!coords) continue;
            const lx = coords.col, ly = coords.row;
            const dist = Math.abs(col - lx) + Math.abs(row - ly);
            if (dist <= 3) {
                opacity = Math.max(opacity, dist <= 1 ? 0.4 : 0.2);
            }
        }

        if (opacity <= 0) continue;

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

        // Only draw if at least one end is visible
        if (aFog === 'hidden' && bFog === 'hidden') continue;

        const aCoords = LOCATION_COORDS[aId];
        const bCoords = LOCATION_COORDS[bId];
        if (!aCoords || !bCoords) continue;

        const aPx = hexToPixel(aCoords.col, aCoords.row);
        const bPx = hexToPixel(bCoords.col, bCoords.row);

        // Is this a path from current location?
        const isActive = (aId === S.currentLoc || bId === S.currentLoc) &&
                         aFog === 'visible' && bFog === 'visible';

        let lineOpacity = 0.2;
        if (aFog === 'visible' && bFog === 'visible') lineOpacity = 0.35;
        if (isActive) lineOpacity = 0.6;
        if (aFog === 'dim' || bFog === 'dim') lineOpacity = 0.12;

        const line = createSVG('line', {
            x1: aPx.x, y1: aPx.y,
            x2: bPx.x, y2: bPx.y,
            class: `path-line${isActive ? ' active' : ''}`,
            'stroke-opacity': lineOpacity,
        });
        group.appendChild(line);
    }
}

// ── Location nodes ──
function renderLocationNodes(group, fogState) {
    for (const [locId, coords] of Object.entries(LOCATION_COORDS)) {
        const fog = fogState[locId];
        if (fog === 'hidden') continue;

        const { x, y } = hexToPixel(coords.col, coords.row);
        const locData = S.locations[locId];
        const isCurrent = locId === S.currentLoc;
        const isKnown = fog === 'visible';

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
        let fillColor;
        if (isCurrent) {
            fillColor = '#3a3530';
        } else if (isKnown) {
            fillColor = biomeInfo.hexFill;
        } else {
            fillColor = '#2a2630';
        }

        const hexPoly = createSVG('polygon', {
            points: hexPoints(x, y, hexRadius),
            fill: fillColor,
            stroke: isCurrent ? '#c4953a' : (isKnown ? getDangerColor(danger) : '#3e3845'),
            'stroke-width': isCurrent ? 2.5 : 1.5,
        });
        nodeGroup.appendChild(hexPoly);

        // Settlement indicator (inner ring)
        if (isSettlement && isKnown) {
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

        // Icon
        if (isKnown) {
            const iconEl = createSVG('text', {
                x: x, y: y - 2,
                class: 'loc-icon',
            });
            iconEl.textContent = icon;
            nodeGroup.appendChild(iconEl);

            // Label (name below hex)
            const shortName = name.length > 14 ? name.slice(0, 12) + '..' : name;
            const label = createSVG('text', {
                x: x, y: y + hexRadius + 10,
                class: 'loc-label',
            });
            label.textContent = shortName;
            nodeGroup.appendChild(label);
        } else {
            // Dim: show question mark
            const qmark = createSVG('text', {
                x: x, y: y + 1,
                class: 'loc-icon',
                'fill-opacity': 0.4,
            });
            qmark.textContent = '❓';
            nodeGroup.appendChild(qmark);
        }

        // Click handler
        if (isKnown) {
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
        cx: x, cy: y, r: HEX_RADIUS + 6,
        fill: 'none',
        stroke: 'rgba(196, 149, 58, 0.3)',
        'stroke-width': 2,
    });
    marker.appendChild(glow);

    svg.appendChild(marker);
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

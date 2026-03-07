// ===============================================================
// NAVIGATE MAP — Terrain regions, detailed illustrations
// Medieval cartography: painted biome regions + hand-drawn art
// ===============================================================

// ── TERRAIN REGIONS (soft painted biome areas like WoW maps) ──

function renderTerrainRegions(svg, fogState) {
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);
    const regG = _el('g', { class: 'terrain-regions', 'pointer-events': 'none' });

    // Biome region colors (soft, painted feel)
    const regionColors = {
        plains:   '#3a4a28', forest:   '#1a3a12', snow:     '#5a6068',
        mountain: '#4a4448', desert:   '#6a5a30', swamp:    '#2a3a22',
        cave:     '#2a2a30', graveyard:'#3a2a28', volcanic: '#4a2218',
    };

    // Draw soft colored blobs for each terrain hex
    for (const [col, row, biome] of TERRAIN_HEXES) {
        const { x, y } = hexToPixel(col, row);
        let vis = 0;
        for (const locId of knownSet) {
            const c = LOCATION_COORDS[locId];
            if (!c) continue;
            const d = Math.abs(col - c.col) + Math.abs(row - c.row);
            if (d <= 3) {
                vis = Math.max(vis, d <= 1 ? 0.18 : 0.08);
                if (discoveredSet.has(locId)) vis = Math.max(vis, d <= 1 ? 0.25 : 0.12);
            }
        }
        if (vis <= 0) continue;

        const fill = regionColors[biome] || regionColors.plains;
        const r = 28 + srand(col * 100 + row) * 12;
        regG.appendChild(_el('ellipse', {
            cx: x, cy: y, rx: r + 5, ry: r - 2,
            fill: fill, 'fill-opacity': vis,
            transform: `rotate(${(srand(col * 31 + row * 17) - 0.5) * 30}, ${x}, ${y})`,
            filter: 'url(#terrain-soft)',
        }));
    }
    svg.appendChild(regG);
}

// ── DETAILED TERRAIN ILLUSTRATIONS ──

function renderTerrainDetails(svg, fogState) {
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);
    const tG = _el('g', { class: 'terrain-illust', 'pointer-events': 'none' });

    for (const [col, row, biome] of TERRAIN_HEXES) {
        const { x, y } = hexToPixel(col, row);
        let op = 0;
        for (const locId of knownSet) {
            const c = LOCATION_COORDS[locId];
            if (!c) continue;
            const d = Math.abs(col - c.col) + Math.abs(row - c.row);
            if (d <= 3) {
                op = Math.max(op, d <= 1 ? 0.55 : 0.25);
                if (discoveredSet.has(locId)) op = Math.max(op, d <= 1 ? 0.75 : 0.4);
            }
        }
        if (op <= 0) continue;

        const seed = col * 100 + row;
        const g = _el('g', { opacity: op });

        if (biome === 'mountain') _drawMountainRange(g, x, y, seed);
        else if (biome === 'forest') _drawForestCluster(g, x, y, seed);
        else if (biome === 'snow') _drawSnowMountain(g, x, y, seed);
        else if (biome === 'swamp') _drawSwampWater(g, x, y, seed);
        else if (biome === 'desert') _drawDesertDunes(g, x, y, seed);
        else if (biome === 'volcanic') _drawVolcanicTerrain(g, x, y, seed);
        else if (biome === 'cave' || biome === 'graveyard') _drawRockyTerrain(g, x, y, seed);
        else _drawGrassland(g, x, y, seed);

        tG.appendChild(g);
    }
    svg.appendChild(tG);
}

// ── MOUNTAIN RANGE (caterpillar style with hatching) ──

function _drawMountainRange(g, x, y, seed) {
    const count = 1 + Math.floor(srand(seed) * 2);
    for (let i = 0; i < count; i++) {
        const ox = (i - (count - 1) / 2) * 18 + (srand(seed + i * 10) - 0.5) * 8;
        const oy = (srand(seed + i * 10 + 5) - 0.5) * 6;
        const h = 20 + srand(seed + i * 10 + 1) * 14;
        const w = 12 + srand(seed + i * 10 + 2) * 8;
        const px = x + ox, py = y + oy;

        // Mountain body (irregular triangle)
        const lx = px - w, rx = px + w, by = py + 6;
        const peakJit = (srand(seed + i * 10 + 7) - 0.5) * 3;
        const body = `M${lx},${by} L${px - 3 + peakJit},${py - h} L${px + 3 + peakJit},${py - h + 1} L${rx},${by} Z`;
        g.appendChild(_el('path', { d: body, fill: '#5a5550', stroke: '#3a302a', 'stroke-width': 0.8, 'stroke-linejoin': 'round' }));

        // Shadow side (hatching lines on left face)
        for (let j = 0; j < 5; j++) {
            const t = 0.2 + j * 0.15;
            const sx = lx + (px - 3 - lx) * t;
            const sy = by + (py - h - by) * t;
            const ex = sx + w * 0.3;
            const ey = sy + h * 0.12;
            g.appendChild(_el('line', {
                x1: sx, y1: sy, x2: ex, y2: ey,
                stroke: '#2a2420', 'stroke-width': 0.5, 'stroke-opacity': 0.4,
            }));
        }

        // Snow cap
        const capW = w * 0.35;
        const capH = h * 0.25;
        g.appendChild(_el('path', {
            d: `M${px - capW + peakJit},${py - h + capH} L${px + peakJit},${py - h} L${px + capW + peakJit},${py - h + capH + 1}`,
            fill: '#c8c0b0', stroke: '#a09888', 'stroke-width': 0.4,
        }));

        // Ridge line at peak
        g.appendChild(_el('path', {
            d: `M${px - capW * 0.6 + peakJit},${py - h + capH * 0.7} Q${px + peakJit},${py - h - 1} ${px + capW * 0.6 + peakJit},${py - h + capH * 0.7}`,
            fill: 'none', stroke: '#b0a898', 'stroke-width': 0.3,
        }));
    }
}

// ── FOREST CLUSTER (overlapping canopies like WoW) ──

function _drawForestCluster(g, x, y, seed) {
    const count = 3 + Math.floor(srand(seed) * 3);
    // Draw back-to-front for overlap
    const trees = [];
    for (let i = 0; i < count; i++) {
        trees.push({
            tx: x + (srand(seed + i * 13) - 0.5) * 26,
            ty: y + (srand(seed + i * 13 + 5) - 0.5) * 14,
            s: 0.7 + srand(seed + i * 13 + 3) * 0.6,
            i: i,
        });
    }
    trees.sort((a, b) => a.ty - b.ty); // back-to-front

    for (const t of trees) {
        const sz = 8 * t.s;
        // Trunk
        g.appendChild(_el('line', {
            x1: t.tx, y1: t.ty + 2, x2: t.tx, y2: t.ty + sz * 0.5,
            stroke: '#4a3018', 'stroke-width': 1.2 * t.s, 'stroke-linecap': 'round',
        }));
        // Layered canopy (3 overlapping rounds)
        for (let l = 2; l >= 0; l--) {
            const ly = t.ty - l * sz * 0.22;
            const lw = sz * (0.8 - l * 0.15);
            const lh = sz * (0.55 - l * 0.08);
            const shade = l === 0 ? '#1a4a12' : l === 1 ? '#1a5518' : '#226a1e';
            g.appendChild(_el('ellipse', {
                cx: t.tx, cy: ly, rx: lw, ry: lh,
                fill: shade, stroke: '#0a2a08', 'stroke-width': 0.3,
            }));
        }
        // Highlight dot
        g.appendChild(_el('circle', {
            cx: t.tx - sz * 0.15, cy: t.ty - sz * 0.35,
            r: sz * 0.12, fill: '#3a7a2a', 'fill-opacity': 0.4,
        }));
    }
}

// ── SNOW MOUNTAIN ──

function _drawSnowMountain(g, x, y, seed) {
    const jx = (srand(seed) - 0.5) * 4;
    const h = 16 + srand(seed + 1) * 10;
    const w = 14;
    g.appendChild(_el('path', {
        d: `M${x - w + jx},${y + 4} L${x + jx},${y - h} L${x + w + jx},${y + 4}`,
        fill: '#9a9498', stroke: '#7a7478', 'stroke-width': 0.6,
    }));
    // Full snow covering
    g.appendChild(_el('path', {
        d: `M${x - w * 0.6 + jx},${y - h * 0.3} L${x + jx},${y - h} L${x + w * 0.6 + jx},${y - h * 0.3}`,
        fill: '#d8d4cc', stroke: '#b0a8a0', 'stroke-width': 0.3,
    }));
    // Snow drift lines
    for (let i = 0; i < 3; i++) {
        const ly = y - h * (0.5 + i * 0.15);
        const lw = w * (0.5 - i * 0.1);
        g.appendChild(_el('path', {
            d: `M${x - lw + jx},${ly} Q${x + jx},${ly - 1.5} ${x + lw + jx},${ly}`,
            fill: 'none', stroke: '#e0dcd4', 'stroke-width': 0.4, 'stroke-opacity': 0.5,
        }));
    }
}

// ── SWAMP WATER (hatched water + reeds) ──

function _drawSwampWater(g, x, y, seed) {
    // Water area (oval with wave fill)
    const jx = (srand(seed) - 0.5) * 6;
    g.appendChild(_el('ellipse', {
        cx: x + jx, cy: y, rx: 16, ry: 10,
        fill: '#1a2a18', 'fill-opacity': 0.3, stroke: '#2a3a1a', 'stroke-width': 0.4,
    }));
    // Horizontal wave lines (medieval water symbol)
    for (let i = 0; i < 4; i++) {
        const wy = y - 6 + i * 4;
        const wjx = (srand(seed + i * 7) - 0.5) * 5;
        g.appendChild(_el('path', {
            d: `M${x - 12 + wjx},${wy} Q${x - 4 + wjx},${wy - 2} ${x + wjx},${wy} Q${x + 4 + wjx},${wy + 2} ${x + 12 + wjx},${wy}`,
            fill: 'none', stroke: '#3a5a2a', 'stroke-width': 0.6, 'stroke-opacity': 0.5,
        }));
    }
    // Reed stalks
    for (let i = 0; i < 2; i++) {
        const rx = x + 8 + i * 6 + jx;
        const ry = y - 2;
        g.appendChild(_el('line', { x1: rx, y1: ry + 4, x2: rx - 1, y2: ry - 10, stroke: '#4a6a2a', 'stroke-width': 0.7 }));
        g.appendChild(_el('ellipse', { cx: rx - 1, cy: ry - 11, rx: 1.5, ry: 3, fill: '#5a4a20' }));
    }
}

// ── DESERT DUNES (rolling ridges with wind marks) ──

function _drawDesertDunes(g, x, y, seed) {
    // Main dune ridge
    const jx = (srand(seed) - 0.5) * 6;
    g.appendChild(_el('path', {
        d: `M${x - 20 + jx},${y + 4} Q${x - 8 + jx},${y - 10} ${x + 2 + jx},${y + 2} Q${x + 12 + jx},${y - 7} ${x + 20 + jx},${y + 4}`,
        fill: '#7a6a38', 'fill-opacity': 0.35, stroke: '#6a5a2a', 'stroke-width': 0.5,
    }));
    // Second smaller dune
    g.appendChild(_el('path', {
        d: `M${x - 10 + jx},${y + 6} Q${x + jx},${y - 2} ${x + 14 + jx},${y + 6}`,
        fill: '#8a7a42', 'fill-opacity': 0.2, stroke: 'none',
    }));
    // Wind lines (stippled)
    for (let i = 0; i < 3; i++) {
        g.appendChild(_el('line', {
            x1: x - 10 + i * 4, y1: y - 1 + i * 2,
            x2: x + 6 + i * 3, y2: y - 2 + i * 2,
            stroke: '#9a8a4a', 'stroke-width': 0.3, 'stroke-dasharray': '2 3', 'stroke-opacity': 0.4,
        }));
    }
    // Sand dots
    for (let i = 0; i < 6; i++) {
        const dx = (srand(seed + i * 5) - 0.5) * 24;
        const dy = (srand(seed + i * 5 + 3) - 0.5) * 10;
        g.appendChild(_el('circle', { cx: x + dx, cy: y + dy, r: 0.6, fill: '#9a8a5a', 'fill-opacity': 0.3 }));
    }
}

// ── VOLCANIC (lava cracks + smoke) ──

function _drawVolcanicTerrain(g, x, y, seed) {
    const jx = (srand(seed) - 0.5) * 4;
    // Dark rock formation
    g.appendChild(_el('path', {
        d: `M${x - 14 + jx},${y + 5} L${x - 4 + jx},${y - 10} L${x + 4 + jx},${y - 10} L${x + 14 + jx},${y + 5} Z`,
        fill: '#3a2218', stroke: '#2a1a0a', 'stroke-width': 0.7,
    }));
    // Lava glow at top
    g.appendChild(_el('ellipse', {
        cx: x + jx, cy: y - 10, rx: 5, ry: 2.5,
        fill: '#8a3a10', 'fill-opacity': 0.5,
    }));
    // Lava cracks (branching lines)
    g.appendChild(_el('path', {
        d: `M${x + jx},${y - 8} L${x - 4 + jx},${y - 2} L${x - 6 + jx},${y + 3}`,
        fill: 'none', stroke: '#a04010', 'stroke-width': 0.6, 'stroke-opacity': 0.5,
    }));
    g.appendChild(_el('path', {
        d: `M${x + jx},${y - 8} L${x + 5 + jx},${y} L${x + 3 + jx},${y + 4}`,
        fill: 'none', stroke: '#903810', 'stroke-width': 0.5, 'stroke-opacity': 0.4,
    }));
    // Smoke wisps
    for (let i = 0; i < 2; i++) {
        const sx = x + jx + (srand(seed + i * 3) - 0.5) * 6;
        g.appendChild(_el('path', {
            d: `M${sx},${y - 12} Q${sx + 3},${y - 18 - i * 4} ${sx - 2},${y - 22 - i * 4}`,
            fill: 'none', stroke: '#5a4a38', 'stroke-width': 0.4 + i * 0.2, 'stroke-opacity': 0.2,
        }));
    }
}

// ── ROCKY TERRAIN (boulders with cracks) ──

function _drawRockyTerrain(g, x, y, seed) {
    for (let i = 0; i < 3; i++) {
        const rx = x + (srand(seed + i * 7) - 0.5) * 18;
        const ry = y + (srand(seed + i * 7 + 3) - 0.5) * 8;
        const rw = 5 + srand(seed + i * 7 + 1) * 5;
        const rh = 3 + srand(seed + i * 7 + 2) * 3;
        // Rock body
        g.appendChild(_el('ellipse', {
            cx: rx, cy: ry, rx: rw, ry: rh,
            fill: '#4a4038', stroke: '#3a3028', 'stroke-width': 0.6,
        }));
        // Crack line
        g.appendChild(_el('line', {
            x1: rx - rw * 0.3, y1: ry - rh * 0.2,
            x2: rx + rw * 0.4, y2: ry + rh * 0.3,
            stroke: '#2a2018', 'stroke-width': 0.3, 'stroke-opacity': 0.5,
        }));
        // Light spot
        g.appendChild(_el('ellipse', {
            cx: rx - rw * 0.2, cy: ry - rh * 0.3, rx: rw * 0.25, ry: rh * 0.2,
            fill: '#6a5a48', 'fill-opacity': 0.3,
        }));
    }
}

// ── GRASSLAND (tufts + wildflowers) ──

function _drawGrassland(g, x, y, seed) {
    // Grass tufts (multiple blades per tuft)
    for (let i = 0; i < 4; i++) {
        const gx = x + (srand(seed + i * 5) - 0.5) * 22;
        const gy = y + (srand(seed + i * 5 + 2) - 0.5) * 10;
        // 3-4 blades per tuft
        for (let b = 0; b < 3; b++) {
            const angle = -20 + b * 20 + (srand(seed + i * 5 + b) - 0.5) * 15;
            const bh = 5 + srand(seed + i * 5 + b + 10) * 4;
            const rad = angle * Math.PI / 180;
            const tipX = gx + Math.sin(rad) * bh;
            const tipY = gy - Math.cos(rad) * bh;
            g.appendChild(_el('path', {
                d: `M${gx},${gy} Q${gx + Math.sin(rad) * bh * 0.5},${gy - bh * 0.7} ${tipX},${tipY}`,
                fill: 'none', stroke: '#5a7a3a', 'stroke-width': 0.6, 'stroke-opacity': 0.5,
                'stroke-linecap': 'round',
            }));
        }
    }
    // Tiny wildflower dot
    if (srand(seed + 99) > 0.5) {
        const fx = x + (srand(seed + 77) - 0.5) * 16;
        const fy = y + (srand(seed + 78) - 0.5) * 8;
        g.appendChild(_el('circle', { cx: fx, cy: fy, r: 1.2, fill: '#8a6a8a', 'fill-opacity': 0.4 }));
    }
}

// ===============================================================
// NAVIGATE MAP — Terrain regions & dense hand-drawn illustrations
// Medieval cartography: caterpillar mountains, dense forests,
// portolan-chart detail covering ALL landmass space
// ===============================================================

// ── TERRAIN REGIONS (soft painted biome tints) ──

function renderTerrainRegions(svg, fogState) {
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);
    const regG = _el('g', { class: 'terrain-regions', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });

    const regionColors = {
        plains: '#3a4a28', forest: '#1a3a12', snow: '#5a6068',
        mountain: '#4a4448', desert: '#6a5a30', swamp: '#2a3a22',
        cave: '#2a2a30', graveyard: '#3a2a28', volcanic: '#4a2218',
    };

    // Large soft blobs for biome regions
    for (const [col, row, biome] of TERRAIN_HEXES) {
        const { x, y } = hexToPixel(col, row);
        let vis = 0;
        for (const locId of knownSet) {
            const c = LOCATION_COORDS[locId];
            if (!c) continue;
            const d = Math.abs(col - c.col) + Math.abs(row - c.row);
            if (d <= 4) {
                vis = Math.max(vis, d <= 1 ? 0.22 : d <= 2 ? 0.14 : 0.06);
                if (discoveredSet.has(locId)) vis = Math.max(vis, d <= 1 ? 0.3 : d <= 2 ? 0.18 : 0.1);
            }
        }
        if (vis <= 0) continue;
        const fill = regionColors[biome] || regionColors.plains;
        const r = 30 + srand(col * 100 + row) * 14;
        regG.appendChild(_el('ellipse', {
            cx: x, cy: y, rx: r + 8, ry: r,
            fill, 'fill-opacity': vis,
            transform: `rotate(${(srand(col * 31 + row * 17) - 0.5) * 25}, ${x}, ${y})`,
            filter: 'url(#terrain-soft)',
        }));
    }
    svg.appendChild(regG);
}

// ── DETAILED TERRAIN ILLUSTRATIONS ──

function renderTerrainDetails(svg, fogState) {
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);
    const tG = _el('g', { class: 'terrain-illust', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });

    for (const [col, row, biome] of TERRAIN_HEXES) {
        const { x, y } = hexToPixel(col, row);
        let op = 0;
        for (const locId of knownSet) {
            const c = LOCATION_COORDS[locId];
            if (!c) continue;
            const d = Math.abs(col - c.col) + Math.abs(row - c.row);
            if (d <= 4) {
                op = Math.max(op, d <= 1 ? 0.6 : d <= 2 ? 0.35 : 0.15);
                if (discoveredSet.has(locId)) op = Math.max(op, d <= 1 ? 0.8 : d <= 2 ? 0.5 : 0.25);
            }
        }
        if (op <= 0) continue;

        const seed = col * 100 + row;
        const g = _el('g', { opacity: op });

        if (biome === 'mountain') _drawMountainRange(g, x, y, seed);
        else if (biome === 'forest') _drawForestCluster(g, x, y, seed);
        else if (biome === 'snow') _drawSnowRange(g, x, y, seed);
        else if (biome === 'swamp') _drawSwampWater(g, x, y, seed);
        else if (biome === 'desert') _drawDesertDunes(g, x, y, seed);
        else if (biome === 'volcanic') _drawVolcanicTerrain(g, x, y, seed);
        else if (biome === 'cave') _drawCaveTerrain(g, x, y, seed);
        else if (biome === 'graveyard') _drawGraveyardTerrain(g, x, y, seed);
        else _drawGrassland(g, x, y, seed);

        tG.appendChild(g);
    }
    svg.appendChild(tG);
}

// ── MOUNTAIN RANGE (caterpillar-style, 3-5 overlapping peaks) ──

function _drawMountainRange(g, x, y, seed) {
    const count = 3 + Math.floor(srand(seed) * 3); // 3-5 peaks
    const peaks = [];
    for (let i = 0; i < count; i++) {
        peaks.push({
            ox: (i - (count - 1) / 2) * 14 + (srand(seed + i * 10) - 0.5) * 6,
            oy: (srand(seed + i * 10 + 5) - 0.5) * 8,
            h: 16 + srand(seed + i * 10 + 1) * 16,
            w: 10 + srand(seed + i * 10 + 2) * 7,
        });
    }
    peaks.sort((a, b) => a.oy - b.oy); // back-to-front

    for (const p of peaks) {
        const px = x + p.ox, py = y + p.oy;
        const lx = px - p.w, rx = px + p.w, by = py + 5;
        const jit = (srand(seed + p.ox * 7) - 0.5) * 3;

        // Mountain silhouette
        const body = `M${lx},${by} L${px - 2 + jit},${py - p.h} L${px + 2 + jit},${py - p.h + 1} L${rx},${by} Z`;
        g.appendChild(_el('path', { d: body, fill: '#5a5550', stroke: '#3a302a', 'stroke-width': 0.7, 'stroke-linejoin': 'round' }));

        // Left-face hatching (shadow side) — dense ink lines
        for (let j = 0; j < 7; j++) {
            const t = 0.15 + j * 0.11;
            const sx = lx + (px - 2 - lx) * t;
            const sy = by + (py - p.h - by) * t;
            const ex = sx + p.w * 0.35;
            const ey = sy + p.h * 0.1;
            g.appendChild(_el('line', { x1: sx, y1: sy, x2: ex, y2: ey,
                stroke: '#2a2420', 'stroke-width': 0.4, 'stroke-opacity': 0.45 }));
        }

        // Right-face lighter hatching
        for (let j = 0; j < 4; j++) {
            const t = 0.25 + j * 0.18;
            const sx = rx + (px + 2 - rx) * t;
            const sy = by + (py - p.h - by) * t;
            const ex = sx - p.w * 0.2;
            const ey = sy + p.h * 0.06;
            g.appendChild(_el('line', { x1: sx, y1: sy, x2: ex, y2: ey,
                stroke: '#6a6058', 'stroke-width': 0.3, 'stroke-opacity': 0.25 }));
        }

        // Snow cap
        const cW = p.w * 0.4, cH = p.h * 0.22;
        g.appendChild(_el('path', {
            d: `M${px - cW + jit},${py - p.h + cH} L${px + jit},${py - p.h - 1} L${px + cW + jit},${py - p.h + cH + 1}`,
            fill: '#c8c0b0', stroke: '#a09888', 'stroke-width': 0.3,
        }));

        // Ridge crags
        g.appendChild(_el('path', {
            d: `M${px - cW * 0.5 + jit},${py - p.h + cH * 0.6} Q${px + jit},${py - p.h - 2} ${px + cW * 0.5 + jit},${py - p.h + cH * 0.6}`,
            fill: 'none', stroke: '#b0a898', 'stroke-width': 0.25,
        }));
    }

    // Base rubble/scree dots
    for (let i = 0; i < 8; i++) {
        const dx = (srand(seed + i * 31) - 0.5) * 28;
        const dy = 4 + srand(seed + i * 31 + 1) * 6;
        g.appendChild(_el('circle', { cx: x + dx, cy: y + dy, r: 0.7 + srand(seed + i * 31 + 2) * 0.6,
            fill: '#4a4038', 'fill-opacity': 0.35 }));
    }
}

// ── FOREST CLUSTER (dense overlapping canopies, 6-10 trees) ──

function _drawForestCluster(g, x, y, seed) {
    const count = 6 + Math.floor(srand(seed) * 5); // 6-10 trees
    const trees = [];
    for (let i = 0; i < count; i++) {
        trees.push({
            tx: x + (srand(seed + i * 13) - 0.5) * 30,
            ty: y + (srand(seed + i * 13 + 5) - 0.5) * 18,
            s: 0.6 + srand(seed + i * 13 + 3) * 0.7,
            i,
        });
    }
    trees.sort((a, b) => a.ty - b.ty); // back-to-front

    for (const t of trees) {
        const sz = 7 * t.s;
        // Trunk
        g.appendChild(_el('line', {
            x1: t.tx, y1: t.ty + 1, x2: t.tx, y2: t.ty + sz * 0.5,
            stroke: '#4a3018', 'stroke-width': 1.0 * t.s, 'stroke-linecap': 'round',
        }));

        // Layered conifer canopy (4 tiers for depth)
        for (let l = 3; l >= 0; l--) {
            const ly = t.ty - l * sz * 0.2;
            const lw = sz * (0.85 - l * 0.12);
            const lh = sz * (0.5 - l * 0.06);
            const shades = ['#1a5518', '#1a4a12', '#1e5e16', '#267022'];
            g.appendChild(_el('ellipse', {
                cx: t.tx, cy: ly, rx: lw, ry: lh,
                fill: shades[l], stroke: '#0a2a08', 'stroke-width': 0.25,
            }));
        }

        // Highlight (sunlit side)
        g.appendChild(_el('circle', {
            cx: t.tx - sz * 0.12, cy: t.ty - sz * 0.3,
            r: sz * 0.15, fill: '#3a8a2a', 'fill-opacity': 0.3,
        }));
    }

    // Undergrowth: ferns & bushes between trees
    for (let i = 0; i < 5; i++) {
        const bx = x + (srand(seed + i * 51) - 0.5) * 26;
        const by = y + (srand(seed + i * 51 + 3) - 0.5) * 12 + 6;
        const bw = 3 + srand(seed + i * 51 + 1) * 3;
        g.appendChild(_el('ellipse', {
            cx: bx, cy: by, rx: bw, ry: bw * 0.5,
            fill: '#1a3a10', 'fill-opacity': 0.35, stroke: '#0a2a08', 'stroke-width': 0.2,
        }));
    }
}

// ── SNOW RANGE (multiple snow-capped peaks) ──

function _drawSnowRange(g, x, y, seed) {
    const count = 2 + Math.floor(srand(seed) * 2); // 2-3 peaks
    for (let i = 0; i < count; i++) {
        const ox = (i - (count - 1) / 2) * 16 + (srand(seed + i * 11) - 0.5) * 5;
        const oy = (srand(seed + i * 11 + 5) - 0.5) * 5;
        const h = 18 + srand(seed + i * 11 + 1) * 12;
        const w = 12 + srand(seed + i * 11 + 2) * 5;
        const px = x + ox, py = y + oy;
        const jx = (srand(seed + i * 3) - 0.5) * 3;

        // Peak body
        g.appendChild(_el('path', {
            d: `M${px - w + jx},${py + 4} L${px + jx},${py - h} L${px + w + jx},${py + 4}`,
            fill: '#8a8890', stroke: '#6a6868', 'stroke-width': 0.6,
        }));

        // Shadow hatching on left face
        for (let j = 0; j < 5; j++) {
            const t = 0.2 + j * 0.14;
            const sx = px - w + jx + (px + jx - (px - w + jx)) * t;
            const sy = py + 4 + (py - h - (py + 4)) * t;
            g.appendChild(_el('line', { x1: sx, y1: sy, x2: sx + w * 0.2, y2: sy + h * 0.08,
                stroke: '#5a585a', 'stroke-width': 0.35, 'stroke-opacity': 0.4 }));
        }

        // Snow covering (generous — it's a snow biome)
        g.appendChild(_el('path', {
            d: `M${px - w * 0.7 + jx},${py - h * 0.35} L${px + jx},${py - h - 1} L${px + w * 0.7 + jx},${py - h * 0.35}`,
            fill: '#dcd8d0', stroke: '#b8b0a8', 'stroke-width': 0.3,
        }));

        // Snow drift lines
        for (let j = 0; j < 4; j++) {
            const ly = py - h * (0.45 + j * 0.12);
            const lw = w * (0.55 - j * 0.1);
            g.appendChild(_el('path', {
                d: `M${px - lw + jx},${ly} Q${px + jx},${ly - 1.5} ${px + lw + jx},${ly}`,
                fill: 'none', stroke: '#e8e4dc', 'stroke-width': 0.35, 'stroke-opacity': 0.45,
            }));
        }
    }

    // Snowdrift ground patches
    for (let i = 0; i < 4; i++) {
        const dx = (srand(seed + i * 41) - 0.5) * 24;
        const dy = 4 + srand(seed + i * 41 + 1) * 5;
        g.appendChild(_el('ellipse', {
            cx: x + dx, cy: y + dy, rx: 5 + srand(seed + i * 41 + 2) * 4, ry: 2,
            fill: '#c8c4bc', 'fill-opacity': 0.2,
        }));
    }
}

// ── SWAMP (murky water pools + reeds + dead trees) ──

function _drawSwampWater(g, x, y, seed) {
    const jx = (srand(seed) - 0.5) * 6;

    // Main water pool
    g.appendChild(_el('ellipse', {
        cx: x + jx, cy: y, rx: 18, ry: 11,
        fill: '#1a2a18', 'fill-opacity': 0.35, stroke: '#2a3a1a', 'stroke-width': 0.4,
    }));

    // Wave ripples (medieval water symbol)
    for (let i = 0; i < 5; i++) {
        const wy = y - 7 + i * 3.5;
        const wjx = (srand(seed + i * 7) - 0.5) * 4;
        g.appendChild(_el('path', {
            d: `M${x - 13 + wjx},${wy} Q${x - 5 + wjx},${wy - 1.5} ${x + wjx},${wy} Q${x + 5 + wjx},${wy + 1.5} ${x + 13 + wjx},${wy}`,
            fill: 'none', stroke: '#3a5a2a', 'stroke-width': 0.5, 'stroke-opacity': 0.45,
        }));
    }

    // Reed clusters (both sides)
    for (let i = 0; i < 4; i++) {
        const rx = x + (i < 2 ? -10 - i * 4 : 8 + (i - 2) * 5) + jx;
        const ry = y - 2 + (srand(seed + i * 7 + 20) - 0.5) * 6;
        // Stalk
        g.appendChild(_el('line', { x1: rx, y1: ry + 5, x2: rx - 0.5, y2: ry - 10,
            stroke: '#4a6a2a', 'stroke-width': 0.6 }));
        // Cattail head
        g.appendChild(_el('ellipse', { cx: rx - 0.5, cy: ry - 11, rx: 1.3, ry: 2.8, fill: '#5a4a20' }));
    }

    // Dead tree stump
    if (srand(seed + 99) > 0.4) {
        const dx = x + 14 + jx, dy = y - 4;
        g.appendChild(_el('line', { x1: dx, y1: dy + 6, x2: dx, y2: dy - 8,
            stroke: '#3a3020', 'stroke-width': 1.2, 'stroke-linecap': 'round' }));
        g.appendChild(_el('line', { x1: dx, y1: dy - 5, x2: dx + 5, y2: dy - 9,
            stroke: '#3a3020', 'stroke-width': 0.6, 'stroke-linecap': 'round' }));
        g.appendChild(_el('line', { x1: dx, y1: dy - 3, x2: dx - 4, y2: dy - 7,
            stroke: '#3a3020', 'stroke-width': 0.5, 'stroke-linecap': 'round' }));
    }
}

// ── DESERT (rolling dune ridges + wind marks + rock outcrops) ──

function _drawDesertDunes(g, x, y, seed) {
    const jx = (srand(seed) - 0.5) * 5;

    // Multiple dune ridges (layered, back to front)
    for (let d = 0; d < 3; d++) {
        const dy = -6 + d * 5;
        const dOp = 0.15 + d * 0.08;
        const dOx = (srand(seed + d * 17) - 0.5) * 8;
        g.appendChild(_el('path', {
            d: `M${x - 22 + dOx + jx},${y + dy + 5} Q${x - 8 + dOx + jx},${y + dy - 6} ${x + 2 + dOx + jx},${y + dy + 3}
                Q${x + 12 + dOx + jx},${y + dy - 4} ${x + 22 + dOx + jx},${y + dy + 5}`,
            fill: '#7a6a38', 'fill-opacity': dOp, stroke: '#6a5a2a', 'stroke-width': 0.4,
        }));
    }

    // Wind-blown stipple lines
    for (let i = 0; i < 5; i++) {
        const wy = y - 3 + i * 3;
        const wx = x - 12 + (srand(seed + i * 9) - 0.5) * 6;
        g.appendChild(_el('line', {
            x1: wx, y1: wy, x2: wx + 10 + srand(seed + i * 9 + 1) * 6, y2: wy - 0.5,
            stroke: '#9a8a4a', 'stroke-width': 0.3, 'stroke-dasharray': '1.5 2.5', 'stroke-opacity': 0.35,
        }));
    }

    // Sand dots (scattered stippling)
    for (let i = 0; i < 10; i++) {
        const dx = (srand(seed + i * 5) - 0.5) * 28;
        const dy = (srand(seed + i * 5 + 3) - 0.5) * 12;
        g.appendChild(_el('circle', { cx: x + dx, cy: y + dy, r: 0.5, fill: '#9a8a5a', 'fill-opacity': 0.3 }));
    }

    // Small rock outcrop
    if (srand(seed + 77) > 0.5) {
        const rx = x + 12 + jx, ry = y + 2;
        g.appendChild(_el('ellipse', { cx: rx, cy: ry, rx: 4, ry: 2.5,
            fill: '#6a5a38', stroke: '#5a4a28', 'stroke-width': 0.4 }));
    }
}

// ── VOLCANIC (lava cracks + crater + smoke + ash) ──

function _drawVolcanicTerrain(g, x, y, seed) {
    const jx = (srand(seed) - 0.5) * 4;

    // Dark rocky formation (wider, more imposing)
    g.appendChild(_el('path', {
        d: `M${x - 16 + jx},${y + 6} L${x - 6 + jx},${y - 12} L${x + jx},${y - 14}
            L${x + 6 + jx},${y - 11} L${x + 16 + jx},${y + 6} Z`,
        fill: '#3a2218', stroke: '#2a1a0a', 'stroke-width': 0.7,
    }));

    // Crater glow
    g.appendChild(_el('ellipse', {
        cx: x + jx, cy: y - 13, rx: 6, ry: 2.5,
        fill: '#a04010', 'fill-opacity': 0.45,
    }));
    g.appendChild(_el('ellipse', {
        cx: x + jx, cy: y - 13, rx: 3, ry: 1.5,
        fill: '#c06020', 'fill-opacity': 0.35,
    }));

    // Lava cracks (branching fissures)
    g.appendChild(_el('path', {
        d: `M${x + jx},${y - 10} L${x - 5 + jx},${y - 3} L${x - 8 + jx},${y + 4}`,
        fill: 'none', stroke: '#a04010', 'stroke-width': 0.6, 'stroke-opacity': 0.5,
    }));
    g.appendChild(_el('path', {
        d: `M${x + jx},${y - 10} L${x + 6 + jx},${y - 1} L${x + 4 + jx},${y + 5}`,
        fill: 'none', stroke: '#903810', 'stroke-width': 0.5, 'stroke-opacity': 0.4,
    }));
    g.appendChild(_el('path', {
        d: `M${x - 5 + jx},${y - 3} L${x - 10 + jx},${y + 1}`,
        fill: 'none', stroke: '#803010', 'stroke-width': 0.3, 'stroke-opacity': 0.3,
    }));

    // Smoke plumes
    for (let i = 0; i < 3; i++) {
        const sx = x + jx + (srand(seed + i * 3) - 0.5) * 5;
        const sh = 6 + i * 5;
        g.appendChild(_el('path', {
            d: `M${sx},${y - 14} Q${sx + 3 + i * 2},${y - 14 - sh} ${sx - 2 - i},${y - 14 - sh - 4}`,
            fill: 'none', stroke: '#5a4a38', 'stroke-width': 0.4 + i * 0.15, 'stroke-opacity': 0.18 - i * 0.04,
        }));
    }

    // Ash/ember dots
    for (let i = 0; i < 6; i++) {
        const dx = (srand(seed + i * 23) - 0.5) * 20;
        const dy = (srand(seed + i * 23 + 3) - 0.5) * 10 - 4;
        g.appendChild(_el('circle', { cx: x + dx, cy: y + dy, r: 0.6,
            fill: i < 2 ? '#a05020' : '#4a3a28', 'fill-opacity': 0.3 }));
    }
}

// ── CAVE TERRAIN (boulders + cave mouth + stalactites hint) ──

function _drawCaveTerrain(g, x, y, seed) {
    // Rocky boulders cluster
    for (let i = 0; i < 4; i++) {
        const rx = x + (srand(seed + i * 7) - 0.5) * 22;
        const ry = y + (srand(seed + i * 7 + 3) - 0.5) * 10;
        const rw = 4 + srand(seed + i * 7 + 1) * 5;
        const rh = 3 + srand(seed + i * 7 + 2) * 3;
        g.appendChild(_el('ellipse', { cx: rx, cy: ry, rx: rw, ry: rh,
            fill: '#3a3430', stroke: '#2a2420', 'stroke-width': 0.5 }));
        // Crack
        g.appendChild(_el('line', { x1: rx - rw * 0.3, y1: ry - rh * 0.2,
            x2: rx + rw * 0.4, y2: ry + rh * 0.3,
            stroke: '#1a1810', 'stroke-width': 0.3, 'stroke-opacity': 0.5 }));
        // Light spot
        g.appendChild(_el('ellipse', { cx: rx - rw * 0.2, cy: ry - rh * 0.3,
            rx: rw * 0.25, ry: rh * 0.2, fill: '#5a5048', 'fill-opacity': 0.25 }));
    }

    // Cave mouth hint (dark arch)
    if (srand(seed + 55) > 0.4) {
        const cx = x + (srand(seed + 88) - 0.5) * 10;
        const cy = y + 2;
        g.appendChild(_el('path', {
            d: `M${cx - 6},${cy + 4} Q${cx - 6},${cy - 5} ${cx},${cy - 6} Q${cx + 6},${cy - 5} ${cx + 6},${cy + 4}`,
            fill: '#1a1810', 'fill-opacity': 0.4, stroke: '#3a3028', 'stroke-width': 0.5,
        }));
    }
}

// ── GRAVEYARD (tombstones + crosses + dead trees) ──

function _drawGraveyardTerrain(g, x, y, seed) {
    // Tombstones
    for (let i = 0; i < 4; i++) {
        const tx = x + (srand(seed + i * 9) - 0.5) * 24;
        const ty = y + (srand(seed + i * 9 + 3) - 0.5) * 10;
        const th = 6 + srand(seed + i * 9 + 1) * 4;
        const tw = 3 + srand(seed + i * 9 + 2) * 2;
        const tilt = (srand(seed + i * 9 + 5) - 0.5) * 8;

        if (i < 2) {
            // Rounded tombstone
            g.appendChild(_el('path', {
                d: `M${tx - tw},${ty + 2} L${tx - tw},${ty - th + 2} Q${tx},${ty - th - 2} ${tx + tw},${ty - th + 2} L${tx + tw},${ty + 2} Z`,
                fill: '#4a4038', stroke: '#3a3028', 'stroke-width': 0.4,
                transform: `rotate(${tilt}, ${tx}, ${ty})`,
            }));
        } else {
            // Cross
            g.appendChild(_el('line', { x1: tx, y1: ty + 2, x2: tx, y2: ty - th,
                stroke: '#4a4038', 'stroke-width': 1.2,
                transform: `rotate(${tilt}, ${tx}, ${ty})` }));
            g.appendChild(_el('line', { x1: tx - tw, y1: ty - th * 0.6, x2: tx + tw, y2: ty - th * 0.6,
                stroke: '#4a4038', 'stroke-width': 1,
                transform: `rotate(${tilt}, ${tx}, ${ty})` }));
        }
    }

    // Bare dead tree
    if (srand(seed + 77) > 0.3) {
        const dx = x + 10, dy = y - 3;
        g.appendChild(_el('line', { x1: dx, y1: dy + 6, x2: dx, y2: dy - 10,
            stroke: '#3a2820', 'stroke-width': 1.0, 'stroke-linecap': 'round' }));
        g.appendChild(_el('line', { x1: dx, y1: dy - 6, x2: dx + 6, y2: dy - 10,
            stroke: '#3a2820', 'stroke-width': 0.5, 'stroke-linecap': 'round' }));
        g.appendChild(_el('line', { x1: dx, y1: dy - 4, x2: dx - 5, y2: dy - 8,
            stroke: '#3a2820', 'stroke-width': 0.4, 'stroke-linecap': 'round' }));
    }

    // Mist wisps
    for (let i = 0; i < 2; i++) {
        const wx = x + (srand(seed + i * 33) - 0.5) * 20;
        const wy = y + 4 + srand(seed + i * 33 + 1) * 4;
        g.appendChild(_el('ellipse', { cx: wx, cy: wy, rx: 8, ry: 2,
            fill: '#5a5048', 'fill-opacity': 0.08 }));
    }
}

// ── GRASSLAND (lush tufts + wildflowers + path hints) ──

function _drawGrassland(g, x, y, seed) {
    // Dense grass tufts (6-8 clusters)
    for (let i = 0; i < 6; i++) {
        const gx = x + (srand(seed + i * 5) - 0.5) * 26;
        const gy = y + (srand(seed + i * 5 + 2) - 0.5) * 12;
        // 3-4 blades per tuft
        for (let b = 0; b < 4; b++) {
            const angle = -25 + b * 16 + (srand(seed + i * 5 + b) - 0.5) * 12;
            const bh = 4 + srand(seed + i * 5 + b + 10) * 4;
            const rad = angle * Math.PI / 180;
            const tipX = gx + Math.sin(rad) * bh;
            const tipY = gy - Math.cos(rad) * bh;
            g.appendChild(_el('path', {
                d: `M${gx},${gy} Q${gx + Math.sin(rad) * bh * 0.5},${gy - bh * 0.7} ${tipX},${tipY}`,
                fill: 'none', stroke: '#5a7a3a', 'stroke-width': 0.5, 'stroke-opacity': 0.45,
                'stroke-linecap': 'round',
            }));
        }
    }

    // Wildflower dots
    for (let i = 0; i < 3; i++) {
        if (srand(seed + 90 + i) > 0.4) {
            const fx = x + (srand(seed + 70 + i) - 0.5) * 20;
            const fy = y + (srand(seed + 71 + i) - 0.5) * 10;
            const colors = ['#8a6a8a', '#8a8a5a', '#aa7a5a'];
            g.appendChild(_el('circle', { cx: fx, cy: fy, r: 1.0,
                fill: colors[i % colors.length], 'fill-opacity': 0.35 }));
        }
    }
}

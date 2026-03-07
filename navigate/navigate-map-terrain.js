// ===============================================================
// NAVIGATE MAP — Terrain: auto-fill, ground cover, dense art
// Medieval cartography: caterpillar mountains, canopy masses,
// cross-hatching, full landmass coverage, ink-on-parchment
// Style: WoW / hand-drawn portolan chart — MAXIMUM realism
// ===============================================================

// ── Utility: organic irregular blob SVG path ──
function _organicBlob(cx, cy, rx, ry, seed, n = 8) {
    let d = '';
    const pts = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const v = 0.7 + srand(seed + i * 7) * 0.6;
        pts.push([cx + Math.cos(a) * rx * v, cy + Math.sin(a) * ry * v]);
    }
    d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i <= n; i++) {
        const c = pts[i % n], p = pts[(i - 1) % n];
        const mx = (p[0] + c[0]) / 2 + (srand(seed + i * 13) - 0.5) * rx * 0.35;
        const my = (p[1] + c[1]) / 2 + (srand(seed + i * 17) - 0.5) * ry * 0.35;
        d += ` Q${mx},${my} ${c[0]},${c[1]}`;
    }
    return d;
}

// ── Auto-fill: compute terrain for ALL landmass hexes ──
function _buildAutoFillHexes() {
    const seeds = [];
    for (const [col, row, biome] of TERRAIN_HEXES) seeds.push({ col, row, biome });
    for (const [locId, c] of Object.entries(LOCATION_COORDS)) {
        seeds.push({ col: c.col, row: c.row, biome: S.locations?.[locId]?.b || 'plains' });
    }
    const covered = new Set();
    for (const [c, r] of TERRAIN_HEXES) covered.add(`${c},${r}`);
    for (const c of Object.values(LOCATION_COORDS)) covered.add(`${c.col},${c.row}`);

    const extra = [];
    for (let row = 0; row <= GRID_ROWS + 1; row++) {
        for (let col = 0; col <= GRID_COLS + 1; col++) {
            if (covered.has(`${col},${row}`)) continue;
            const { x, y } = hexToPixel(col, row);
            if (!_pointInLandmass(x, y)) continue;
            let minD = Infinity, biome = 'plains';
            for (const s of seeds) {
                const d = Math.hypot(col - s.col, row - s.row);
                if (d < minD) { minD = d; biome = s.biome; }
            }
            extra.push([col, row, biome]);
        }
    }
    return extra;
}

// ── Get biome at any hex position (for ground cover) ──
function _getBiomeAt(col, row) {
    for (const [c, r, b] of TERRAIN_HEXES) if (c === col && r === row) return b;
    const seeds = [];
    for (const [c, r, b] of TERRAIN_HEXES) seeds.push({ col: c, row: r, biome: b });
    for (const [locId, c] of Object.entries(LOCATION_COORDS))
        seeds.push({ col: c.col, row: c.row, biome: S.locations?.[locId]?.b || 'plains' });
    let minD = Infinity, biome = 'plains';
    for (const s of seeds) {
        const d = Math.hypot(col - s.col, row - s.row);
        if (d < minD) { minD = d; biome = s.biome; }
    }
    return biome;
}

// ── Ground cover: biome-aware ink texture across entire landmass ──
function renderGroundCover(svg) {
    const gG = _el('g', { class: 'ground-cover', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    for (let row = 0; row <= GRID_ROWS + 1; row++) {
        for (let col = 0; col <= GRID_COLS + 1; col++) {
            const { x, y } = hexToPixel(col, row);
            if (!_pointInLandmass(x, y)) continue;
            const seed = col * 97 + row * 53;
            const biome = _getBiomeAt(col, row);

            if (biome === 'forest') {
                // Small bush/shrub dots
                for (let i = 0; i < 4; i++) {
                    const bx = x + (srand(seed + i * 7) - 0.5) * HEX_W;
                    const by = y + (srand(seed + i * 7 + 3) - 0.5) * ROW_H;
                    gG.appendChild(_el('circle', { cx: bx, cy: by, r: 0.8 + srand(seed + i * 7 + 1) * 0.6,
                        fill: '#1a3a10', 'fill-opacity': 0.12 }));
                }
            } else if (biome === 'mountain' || biome === 'cave') {
                // Rocky stipple
                for (let i = 0; i < 3; i++) {
                    const rx = x + (srand(seed + i * 9) - 0.5) * HEX_W;
                    const ry = y + (srand(seed + i * 9 + 3) - 0.5) * ROW_H;
                    gG.appendChild(_el('circle', { cx: rx, cy: ry, r: 0.4 + srand(seed + i * 9 + 1) * 0.4,
                        fill: '#3a3830', 'fill-opacity': 0.15 }));
                }
                // Small pebble lines
                if (srand(seed + 300) > 0.5) {
                    const lx = x + (srand(seed + 301) - 0.5) * 20;
                    const ly = y + (srand(seed + 302) - 0.5) * 12;
                    gG.appendChild(_el('line', { x1: lx, y1: ly, x2: lx + 3, y2: ly + 1,
                        stroke: '#4a4438', 'stroke-width': 0.3, 'stroke-opacity': 0.12 }));
                }
            } else if (biome === 'snow') {
                // White stipple / snow drift marks
                for (let i = 0; i < 2; i++) {
                    const sx = x + (srand(seed + i * 5) - 0.5) * HEX_W;
                    const sy = y + (srand(seed + i * 5 + 3) - 0.5) * ROW_H;
                    gG.appendChild(_el('circle', { cx: sx, cy: sy, r: 0.5,
                        fill: '#9a9898', 'fill-opacity': 0.1 }));
                }
                if (srand(seed + 400) > 0.6) {
                    const dx = x + (srand(seed + 401) - 0.5) * 22;
                    const dy = y + (srand(seed + 402) - 0.5) * 12;
                    gG.appendChild(_el('path', { d: `M${dx-4},${dy} Q${dx},${dy-1} ${dx+4},${dy}`,
                        fill: 'none', stroke: '#b0a898', 'stroke-width': 0.3, 'stroke-opacity': 0.08 }));
                }
            } else if (biome === 'desert') {
                // Sand dots and tiny dune hints
                for (let i = 0; i < 3; i++) {
                    const dx = x + (srand(seed + i * 6) - 0.5) * HEX_W;
                    const dy = y + (srand(seed + i * 6 + 3) - 0.5) * ROW_H;
                    gG.appendChild(_el('circle', { cx: dx, cy: dy, r: 0.35,
                        fill: '#8a7a48', 'fill-opacity': 0.1 }));
                }
            } else if (biome === 'swamp') {
                // Wavy water lines
                if (srand(seed + 500) > 0.4) {
                    const wx = x + (srand(seed + 501) - 0.5) * 20;
                    const wy = y + (srand(seed + 502) - 0.5) * 12;
                    gG.appendChild(_el('path', { d: `M${wx-6},${wy} Q${wx-2},${wy-2} ${wx+2},${wy} Q${wx+4},${wy+2} ${wx+6},${wy}`,
                        fill: 'none', stroke: '#3a5a2a', 'stroke-width': 0.3, 'stroke-opacity': 0.1 }));
                }
            } else if (biome === 'volcanic') {
                // Dark ash dots
                for (let i = 0; i < 2; i++) {
                    const vx = x + (srand(seed + i * 8) - 0.5) * HEX_W;
                    const vy = y + (srand(seed + i * 8 + 3) - 0.5) * ROW_H;
                    gG.appendChild(_el('circle', { cx: vx, cy: vy, r: 0.4,
                        fill: '#2a1a10', 'fill-opacity': 0.12 }));
                }
            } else if (biome === 'graveyard') {
                // Sparse dead grass
                if (srand(seed + 600) > 0.5) {
                    const gx = x + (srand(seed + 601) - 0.5) * 20;
                    const gy = y + (srand(seed + 602) - 0.5) * 12;
                    gG.appendChild(_el('line', { x1: gx, y1: gy, x2: gx + 2, y2: gy - 3,
                        stroke: '#5a4a30', 'stroke-width': 0.3, 'stroke-opacity': 0.1, 'stroke-linecap': 'round' }));
                }
            } else {
                // Plains: grass tufts
                for (let i = 0; i < 3; i++) {
                    const gx = x + (srand(seed + i * 7) - 0.5) * HEX_W;
                    const gy = y + (srand(seed + i * 7 + 3) - 0.5) * ROW_H;
                    const a = (srand(seed + i * 7 + 5) - 0.5) * 50 * Math.PI / 180;
                    const l = 2.5 + srand(seed + i * 7 + 1) * 3.5;
                    gG.appendChild(_el('line', {
                        x1: gx, y1: gy, x2: gx + Math.sin(a) * l, y2: gy - Math.cos(a) * l,
                        stroke: '#5a6a3a', 'stroke-width': 0.3, 'stroke-opacity': 0.12,
                        'stroke-linecap': 'round',
                    }));
                }
                // Stipple dot
                if (srand(seed + 200) > 0.5) {
                    gG.appendChild(_el('circle', {
                        cx: x + (srand(seed + 201) - 0.5) * 28,
                        cy: y + (srand(seed + 202) - 0.5) * 18,
                        r: 0.4, fill: '#4a4030', 'fill-opacity': 0.08,
                    }));
                }
            }
        }
    }
    svg.appendChild(gG);
}

// ── Terrain regions: soft painted biome tints ──
function renderTerrainRegions(svg, fogState) {
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);
    const regG = _el('g', { class: 'terrain-regions', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    const colors = {
        plains: '#3a4a28', forest: '#1a3a12', snow: '#5a6068',
        mountain: '#4a4448', desert: '#6a5a30', swamp: '#2a3a22',
        cave: '#2a2a30', graveyard: '#3a2a28', volcanic: '#4a2218',
    };
    const allHexes = [...TERRAIN_HEXES, ..._buildAutoFillHexes()];
    for (const [col, row, biome] of allHexes) {
        const { x, y } = hexToPixel(col, row);
        let vis = 0;
        for (const locId of knownSet) {
            const c = LOCATION_COORDS[locId]; if (!c) continue;
            const d = Math.abs(col - c.col) + Math.abs(row - c.row);
            if (d <= 5) {
                vis = Math.max(vis, d <= 1 ? 0.38 : d <= 2 ? 0.28 : d <= 3 ? 0.18 : 0.09);
                if (discoveredSet.has(locId)) vis = Math.max(vis, d <= 1 ? 0.48 : d <= 2 ? 0.35 : d <= 3 ? 0.22 : 0.12);
            }
        }
        if (vis <= 0) continue;
        const r = 38 + srand(col * 100 + row) * 18;
        regG.appendChild(_el('ellipse', {
            cx: x, cy: y, rx: r + 10, ry: r + 2,
            fill: colors[biome] || colors.plains, 'fill-opacity': vis,
            transform: `rotate(${(srand(col * 31 + row * 17) - 0.5) * 25}, ${x}, ${y})`,
            filter: 'url(#terrain-soft)',
        }));
    }
    svg.appendChild(regG);
}

// ── Terrain details: full art at TERRAIN_HEXES + lighter fill everywhere else ──
function renderTerrainDetails(svg, fogState) {
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);
    const tG = _el('g', { class: 'terrain-illust', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    const autoFill = _buildAutoFillHexes();

    const drawHexes = (hexes, isFill) => {
        for (const [col, row, biome] of hexes) {
            const { x, y } = hexToPixel(col, row);
            let op = 0;
            for (const locId of knownSet) {
                const c = LOCATION_COORDS[locId]; if (!c) continue;
                const d = Math.abs(col - c.col) + Math.abs(row - c.row);
                if (d <= 5) {
                    op = Math.max(op, d <= 1 ? 0.8 : d <= 2 ? 0.55 : d <= 3 ? 0.3 : 0.12);
                    if (discoveredSet.has(locId)) op = Math.max(op, d <= 1 ? 0.95 : d <= 2 ? 0.7 : d <= 3 ? 0.45 : 0.2);
                }
            }
            if (op <= 0) continue;
            if (isFill) op *= 0.75;
            const seed = col * 100 + row;
            const g = _el('g', { opacity: op });
            if (isFill) _drawLightTerrain(g, x, y, biome, seed);
            else {
                if (biome === 'mountain') _drawMountainRange(g, x, y, seed);
                else if (biome === 'forest') _drawForestMass(g, x, y, seed);
                else if (biome === 'snow') _drawSnowRange(g, x, y, seed);
                else if (biome === 'swamp') _drawSwampWater(g, x, y, seed);
                else if (biome === 'desert') _drawDesertDunes(g, x, y, seed);
                else if (biome === 'volcanic') _drawVolcanicTerrain(g, x, y, seed);
                else if (biome === 'cave') _drawCaveTerrain(g, x, y, seed);
                else if (biome === 'graveyard') _drawGraveyardTerrain(g, x, y, seed);
                else _drawGrassland(g, x, y, seed);
            }
            tG.appendChild(g);
        }
    };
    drawHexes(autoFill, true);
    drawHexes(TERRAIN_HEXES, false);
    svg.appendChild(tG);
}

// ── Light terrain for auto-fill hexes (scaled-down but still recognizable) ──
function _drawLightTerrain(g, x, y, biome, seed) {
    const jx = (srand(seed) - 0.5) * 8, jy = (srand(seed + 1) - 0.5) * 5;
    if (biome === 'mountain') {
        // Small caterpillar hump with hatching
        const h = 12 + srand(seed + 2) * 8, w = 8 + srand(seed + 3) * 5;
        const px = x + jx, py = y + jy, by = py + 3, ty = py - h;
        g.appendChild(_el('path', { d: `M${px-w},${by} Q${px-w*0.2},${ty+h*0.25} ${px},${ty} Q${px+w*0.2},${ty+h*0.25} ${px+w},${by} Z`,
            fill: '#585248', stroke: '#3a302a', 'stroke-width': 0.5, 'stroke-linejoin': 'round' }));
        for (let j = 0; j < 4; j++) { const t = 0.15 + j * 0.18;
            const hx = px-w + (px-px+w)*t*0.5, hy = by + (ty - by) * t;
            g.appendChild(_el('line', { x1: hx, y1: hy, x2: hx + 1.5, y2: hy + h*0.08,
                stroke: '#2a2018', 'stroke-width': 0.3, 'stroke-opacity': 0.4 })); }
        g.appendChild(_el('path', { d: `M${px-w*0.35},${ty+h*0.2} Q${px},${ty-1} ${px+w*0.35},${ty+h*0.2}`,
            fill: '#c8c0b0', stroke: 'none' }));
    } else if (biome === 'forest') {
        for (let i = 0; i < 3; i++) {
            const bx = x + (srand(seed+i*11)-0.5)*16 + jx, by = y + (srand(seed+i*11+3)-0.5)*10 + jy;
            const rw = 4 + srand(seed+i*11+1)*3, rh = 3 + srand(seed+i*11+2)*2.5;
            g.appendChild(_el('path', { d: _organicBlob(bx, by, rw, rh, seed+i*30, 6),
                fill: '#1a4a12', 'fill-opacity': 0.7, stroke: '#0a2808', 'stroke-width': 0.3 }));
        }
    } else if (biome === 'snow') {
        const h = 10 + srand(seed + 2) * 6, w = 7 + srand(seed + 3) * 4;
        g.appendChild(_el('path', { d: `M${x-w+jx},${y+3+jy} Q${x+jx},${y-h+jy} ${x+w+jx},${y+3+jy}`,
            fill: '#8a8888', stroke: '#6a6868', 'stroke-width': 0.4 }));
        g.appendChild(_el('path', { d: `M${x-w*0.4+jx},${y-h*0.5+jy} Q${x+jx},${y-h+jy-1} ${x+w*0.4+jx},${y-h*0.5+jy}`,
            fill: '#c8c4bc', stroke: 'none' }));
    } else if (biome === 'swamp') {
        g.appendChild(_el('path', { d: `M${x-10+jx},${y+jy} Q${x+jx},${y-3+jy} ${x+10+jx},${y+jy}`,
            fill: 'none', stroke: '#3a5a2a', 'stroke-width': 0.5, 'stroke-opacity': 0.5 }));
        g.appendChild(_el('path', { d: `M${x-8+jx},${y+3+jy} Q${x+jx},${y+jy} ${x+8+jx},${y+3+jy}`,
            fill: 'none', stroke: '#3a5a2a', 'stroke-width': 0.35, 'stroke-opacity': 0.3 }));
    } else if (biome === 'desert') {
        g.appendChild(_el('path', { d: `M${x-12+jx},${y+2+jy} Q${x+jx},${y-6+jy} ${x+12+jx},${y+2+jy}`,
            fill: '#7a6a38', 'fill-opacity': 0.2, stroke: '#6a5a2a', 'stroke-width': 0.4 }));
    } else if (biome === 'volcanic') {
        g.appendChild(_el('path', { d: `M${x-6+jx},${y+3+jy} Q${x+jx},${y-8+jy} ${x+6+jx},${y+3+jy} Z`,
            fill: '#3a2218', stroke: '#2a1a0a', 'stroke-width': 0.4 }));
        g.appendChild(_el('ellipse', { cx: x+jx, cy: y-8+jy, rx: 2.5, ry: 1, fill: '#a04010', 'fill-opacity': 0.25 }));
    } else if (biome === 'graveyard') {
        const tw = 2 + srand(seed + 5) * 1.5, th = 5 + srand(seed + 6) * 3;
        const tilt = (srand(seed + 7) - 0.5) * 10;
        g.appendChild(_el('path', { d: `M${x-tw+jx},${y+2+jy} L${x-tw+jx},${y-th+2+jy} Q${x+jx},${y-th-1+jy} ${x+tw+jx},${y-th+2+jy} L${x+tw+jx},${y+2+jy} Z`,
            fill: '#4a4038', stroke: '#3a3028', 'stroke-width': 0.35,
            transform: `rotate(${tilt}, ${x+jx}, ${y+jy})` }));
    } else {
        for (let i = 0; i < 4; i++) {
            const gx = x + (srand(seed+i*5)-0.5)*16, gy = y + (srand(seed+i*5+2)-0.5)*10;
            const a = (srand(seed+i*5+4)-0.5)*40*Math.PI/180;
            g.appendChild(_el('line', { x1: gx, y1: gy, x2: gx+Math.sin(a)*5, y2: gy-Math.cos(a)*5,
                stroke: '#5a7a3a', 'stroke-width': 0.45, 'stroke-opacity': 0.4, 'stroke-linecap': 'round' }));
        }
    }
}

// ══════════════════════════════════════════════════════════
// FULL TERRAIN ILLUSTRATIONS — realistic medieval ink art
// 2x scale, heavy ink strokes, dense cross-hatching
// ══════════════════════════════════════════════════════════

// ── Mountains: large caterpillar humps with dense cross-hatching ──
function _drawMountainRange(g, x, y, seed) {
    const count = 4 + Math.floor(srand(seed) * 4); // 4-7 peaks
    const peaks = [];
    for (let i = 0; i < count; i++) {
        peaks.push({
            px: x + (i - (count-1)/2) * 14 + (srand(seed+i*10)-0.5) * 6,
            py: y + (srand(seed+i*10+5)-0.5) * 7,
            h: 22 + srand(seed+i*10+1) * 24,  // 22-46px tall
            w: 11 + srand(seed+i*10+2) * 8,    // 11-19px wide
        });
    }
    peaks.sort((a, b) => a.h - b.h);

    for (const p of peaks) {
        const by = p.py + 5, lx = p.px - p.w, rx = p.px + p.w;
        const ty = p.py - p.h;
        const jit = (srand(seed + p.px * 7) - 0.5) * 2.5;

        // Rounded hump body (bezier, not triangle)
        const body = `M${lx},${by} Q${lx + p.w*0.12},${ty + p.h*0.2} ${p.px + jit},${ty}
            Q${rx - p.w*0.12},${ty + p.h*0.2} ${rx},${by} Z`;
        g.appendChild(_el('path', { d: body, fill: '#585248', stroke: '#2a2420', 'stroke-width': 0.9, 'stroke-linejoin': 'round' }));

        // Dense shadow hatching (left face) — 12+ parallel diagonal lines
        for (let j = 0; j < 12; j++) {
            const t = 0.08 + j * 0.075;
            const hx = lx + (p.px - lx) * t * 0.6;
            const hy = by + (ty - by) * t;
            const hLen = p.h * 0.14 * (1 - t * 0.25);
            g.appendChild(_el('line', { x1: hx, y1: hy, x2: hx + hLen * 0.35, y2: hy + hLen,
                stroke: '#1a1810', 'stroke-width': 0.4, 'stroke-opacity': 0.55 * (1 - t * 0.25) }));
        }

        // Right face lighter hatching (5 lines)
        for (let j = 0; j < 5; j++) {
            const t = 0.15 + j * 0.15;
            const hx = rx + (p.px - rx) * t * 0.45;
            const hy = by + (ty - by) * t;
            g.appendChild(_el('line', { x1: hx, y1: hy, x2: hx - 2, y2: hy + p.h * 0.06,
                stroke: '#6a6058', 'stroke-width': 0.3, 'stroke-opacity': 0.25 }));
        }

        // Cross-hatching on left face for extra depth
        for (let j = 0; j < 5; j++) {
            const t = 0.2 + j * 0.12;
            const hx = lx + (p.px - lx) * t * 0.55;
            const hy = by + (ty - by) * t * 0.8;
            g.appendChild(_el('line', { x1: hx, y1: hy, x2: hx + p.h * 0.06, y2: hy - p.h * 0.04,
                stroke: '#1a1810', 'stroke-width': 0.25, 'stroke-opacity': 0.3 }));
        }

        // Snow cap (irregular, with ragged edge)
        const cW = p.w * 0.5, cH = p.h * 0.22;
        const capPath = `M${p.px - cW + jit},${ty + cH}
            Q${p.px - cW*0.5 + jit},${ty + cH*0.3} ${p.px + jit},${ty - 2}
            Q${p.px + cW*0.5 + jit},${ty + cH*0.3} ${p.px + cW + jit},${ty + cH + 1}
            Q${p.px + cW*0.3 + jit},${ty + cH*0.7} ${p.px + jit},${ty + cH*0.8}
            Q${p.px - cW*0.3 + jit},${ty + cH*0.7} ${p.px - cW + jit},${ty + cH}`;
        g.appendChild(_el('path', { d: capPath, fill: '#d8d0c0', stroke: '#a8a090', 'stroke-width': 0.35 }));

        // Ridge line on peak
        g.appendChild(_el('line', { x1: p.px + jit - p.w*0.3, y1: ty + p.h*0.15,
            x2: p.px + jit + p.w*0.1, y2: ty + 1,
            stroke: '#3a302a', 'stroke-width': 0.5, 'stroke-opacity': 0.4 }));
    }

    // Scree at base — more rocks, larger
    for (let i = 0; i < 12; i++) {
        const sx = x + (srand(seed+i*31)-0.5) * 32, sy = y + 4 + srand(seed+i*31+1) * 6;
        const sr = 0.5 + srand(seed+i*31+2) * 0.8;
        g.appendChild(_el('circle', { cx: sx, cy: sy, r: sr,
            fill: '#4a4038', 'fill-opacity': 0.35 }));
    }

    // Base shadow
    g.appendChild(_el('path', { d: _organicBlob(x, y + 6, 22, 5, seed + 888, 8),
        fill: '#2a2018', 'fill-opacity': 0.08 }));
}

// ── Forests: dense organic canopy masses (WoW-style dark treeline) ──
function _drawForestMass(g, x, y, seed) {
    const count = 10 + Math.floor(srand(seed) * 7); // 10-16 blobs
    const spread = 36;
    const blobs = [];
    for (let i = 0; i < count; i++) {
        blobs.push({
            bx: x + (srand(seed+i*13)-0.5) * spread,
            by: y + (srand(seed+i*13+5)-0.5) * 20,
            rw: 5 + srand(seed+i*13+1) * 7,   // 5-12px radius
            rh: 4 + srand(seed+i*13+2) * 5,    // 4-9px radius
        });
    }
    blobs.sort((a, b) => a.by - b.by);

    // Large shadow mass under canopy
    g.appendChild(_el('path', { d: _organicBlob(x, y + 7, 22, 10, seed + 999, 10),
        fill: '#0a1a08', 'fill-opacity': 0.15 }));

    // Trunk hints (more trunks)
    for (let i = 0; i < 6; i++) {
        const tx = x + (srand(seed+i*23)-0.5) * 24, ty = y + 7 + srand(seed+i*23+1) * 5;
        g.appendChild(_el('line', { x1: tx, y1: ty, x2: tx + (srand(seed+i*23+2)-0.5)*2, y2: ty - 9,
            stroke: '#3a2810', 'stroke-width': 0.8, 'stroke-linecap': 'round' }));
    }

    // Canopy masses (organic blobs — heavy dark outlines on shadow side)
    for (const b of blobs) {
        // Deep shadow base
        g.appendChild(_el('path', { d: _organicBlob(b.bx + 0.5, b.by + b.rh*0.2, b.rw, b.rh*0.85, seed+b.bx*7, 7),
            fill: '#0a2808', 'fill-opacity': 0.5, stroke: '#061a04', 'stroke-width': 0.6 }));
        // Main canopy mass
        g.appendChild(_el('path', { d: _organicBlob(b.bx, b.by, b.rw, b.rh, seed+b.bx*3+1, 8),
            fill: '#1a4a12', 'fill-opacity': 0.9, stroke: '#0a2a08', 'stroke-width': 0.45 }));
        // Lighter highlight on top-left
        g.appendChild(_el('ellipse', { cx: b.bx - b.rw*0.2, cy: b.by - b.rh*0.3,
            rx: b.rw*0.4, ry: b.rh*0.3, fill: '#2a7a1a', 'fill-opacity': 0.25 }));
        // Tiny ink dot texture on canopy
        if (srand(seed + b.bx * 11) > 0.5) {
            g.appendChild(_el('circle', { cx: b.bx + b.rw*0.2, cy: b.by + b.rh*0.1,
                r: 0.6, fill: '#0a1a06', 'fill-opacity': 0.3 }));
        }
    }

    // Undergrowth (more, larger)
    for (let i = 0; i < 5; i++) {
        const ux = x + (srand(seed+i*51)-0.5) * 28, uy = y + 8 + srand(seed+i*51+3) * 5;
        g.appendChild(_el('path', { d: _organicBlob(ux, uy, 4, 2.5, seed+i*51+7, 5),
            fill: '#1a3a10', 'fill-opacity': 0.35 }));
    }

    // Edge foliage wisps (reaching out from main mass)
    for (let i = 0; i < 3; i++) {
        const fx = x + (srand(seed+i*61)-0.5) * 34;
        const fy = y + (srand(seed+i*61+1)-0.5) * 18;
        const fa = (srand(seed+i*61+2) - 0.5) * Math.PI;
        g.appendChild(_el('path', {
            d: `M${fx},${fy} Q${fx+Math.cos(fa)*6},${fy+Math.sin(fa)*4} ${fx+Math.cos(fa)*10},${fy+Math.sin(fa)*6}`,
            fill: 'none', stroke: '#1a4a12', 'stroke-width': 0.4, 'stroke-opacity': 0.3, 'stroke-linecap': 'round'
        }));
    }
}

// ── Snow range: multiple icy peaks with heavy shading ──
function _drawSnowRange(g, x, y, seed) {
    const count = 3 + Math.floor(srand(seed) * 2); // 3-4 peaks
    for (let i = 0; i < count; i++) {
        const ox = (i-(count-1)/2)*16 + (srand(seed+i*11)-0.5)*6;
        const h = 22 + srand(seed+i*11+1)*14, w = 12 + srand(seed+i*11+2)*6;
        const px = x+ox, py = y, ty = py - h;

        // Peak body
        g.appendChild(_el('path', { d: `M${px-w},${py+5} Q${px-w*0.15},${ty+h*0.15} ${px},${ty} Q${px+w*0.15},${ty+h*0.15} ${px+w},${py+5} Z`,
            fill: '#8a8890', stroke: '#5a5860', 'stroke-width': 0.6 }));

        // Left face shadow hatching (8 lines)
        for (let j = 0; j < 8; j++) {
            const t = 0.1+j*0.1;
            g.appendChild(_el('line', { x1: px-w+w*t*0.5, y1: py+5+(ty-py-5)*t,
                x2: px-w+w*t*0.5+2.5, y2: py+5+(ty-py-5)*t+h*0.08,
                stroke: '#4a4860', 'stroke-width': 0.35, 'stroke-opacity': 0.4 }));
        }

        // Snow cap (large, irregular)
        g.appendChild(_el('path', { d: `M${px-w*0.65},${ty+h*0.35} Q${px},${ty-2} ${px+w*0.65},${ty+h*0.35}`,
            fill: '#dcd8d0', stroke: '#b8b0a8', 'stroke-width': 0.35 }));

        // Snow streaks / glacier lines
        for (let j = 0; j < 4; j++) {
            const ly = ty + h*(0.12+j*0.07), lw = w*(0.45-j*0.08);
            g.appendChild(_el('path', { d: `M${px-lw},${ly} Q${px},${ly-1.5} ${px+lw},${ly}`,
                fill: 'none', stroke: '#e8e4dc', 'stroke-width': 0.35, 'stroke-opacity': 0.45 }));
        }

        // Wind-blown snow at peak
        g.appendChild(_el('path', { d: `M${px},${ty} Q${px+w*0.4},${ty-3} ${px+w*0.8},${ty+1}`,
            fill: 'none', stroke: '#c8c0b8', 'stroke-width': 0.3, 'stroke-opacity': 0.3 }));
    }
    // Snow drifts at base
    for (let i = 0; i < 4; i++) { const dx = (srand(seed+i*41)-0.5)*28;
        g.appendChild(_el('ellipse', { cx: x+dx, cy: y+6+srand(seed+i*41+1)*4, rx: 5+srand(seed+i*41+2)*4, ry: 1.8,
            fill: '#c8c4bc', 'fill-opacity': 0.22 })); }
}

// ── Swamp: murky water + reeds + dead wood (larger) ──
function _drawSwampWater(g, x, y, seed) {
    const jx = (srand(seed)-0.5)*6;
    // Water pool
    g.appendChild(_el('path', { d: _organicBlob(x+jx, y, 22, 14, seed+77, 9),
        fill: '#1a2a18', 'fill-opacity': 0.4, stroke: '#2a3a1a', 'stroke-width': 0.5 }));
    // Water ripple lines (6)
    for (let i = 0; i < 6; i++) {
        const wy = y-8+i*3.5, wj = (srand(seed+i*7)-0.5)*5;
        g.appendChild(_el('path', { d: `M${x-16+wj},${wy} Q${x+wj},${wy-2} ${x+16+wj},${wy}`,
            fill: 'none', stroke: '#3a5a2a', 'stroke-width': 0.5, 'stroke-opacity': 0.45 }));
    }
    // Reeds (6)
    for (let i = 0; i < 6; i++) {
        const rx = x+(i<3?-12-i*4:8+(i-3)*5)+jx, ry = y-2+(srand(seed+i*7+20)-0.5)*7;
        g.appendChild(_el('line', { x1: rx, y1: ry+6, x2: rx-0.5, y2: ry-12, stroke: '#4a6a2a', 'stroke-width': 0.7 }));
        g.appendChild(_el('ellipse', { cx: rx-0.5, cy: ry-13, rx: 1.5, ry: 3, fill: '#5a4a20' }));
    }
    // Dead tree
    if (srand(seed+99) > 0.3) {
        const dx = x+16+jx, dy = y-5;
        g.appendChild(_el('line', { x1: dx, y1: dy+7, x2: dx, y2: dy-10, stroke: '#3a3020', 'stroke-width': 1.2, 'stroke-linecap': 'round' }));
        g.appendChild(_el('line', { x1: dx, y1: dy-6, x2: dx+6, y2: dy-10, stroke: '#3a3020', 'stroke-width': 0.6 }));
        g.appendChild(_el('line', { x1: dx, y1: dy-4, x2: dx-5, y2: dy-9, stroke: '#3a3020', 'stroke-width': 0.5 }));
    }
    // Lily pads
    for (let i = 0; i < 3; i++) {
        if (srand(seed+120+i) > 0.4) {
            const lx = x + (srand(seed+130+i)-0.5)*18, ly = y + (srand(seed+131+i)-0.5)*8;
            g.appendChild(_el('ellipse', { cx: lx, cy: ly, rx: 2, ry: 1.2, fill: '#2a5a18', 'fill-opacity': 0.3 }));
        }
    }
}

// ── Desert: rolling dune ridges + stippling (larger) ──
function _drawDesertDunes(g, x, y, seed) {
    const jx = (srand(seed)-0.5)*5;
    // Dune ridges (4 layers)
    for (let d = 0; d < 4; d++) {
        const dy = -8+d*5, dOx = (srand(seed+d*17)-0.5)*10;
        g.appendChild(_el('path', { d: `M${x-26+dOx+jx},${y+dy+5} Q${x-8+dOx+jx},${y+dy-8} ${x+2+dOx+jx},${y+dy+3} Q${x+16+dOx+jx},${y+dy-5} ${x+26+dOx+jx},${y+dy+5}`,
            fill: '#7a6a38', 'fill-opacity': 0.1+d*0.06, stroke: '#6a5a2a', 'stroke-width': 0.45 }));
    }
    // Wind-blown sand lines
    for (let i = 0; i < 7; i++) {
        const wy = y-4+i*3, wx = x-14+(srand(seed+i*9)-0.5)*8;
        g.appendChild(_el('line', { x1: wx, y1: wy, x2: wx+12+srand(seed+i*9+1)*8, y2: wy-0.5,
            stroke: '#9a8a4a', 'stroke-width': 0.35, 'stroke-dasharray': '2 3', 'stroke-opacity': 0.35 }));
    }
    // Dense stipple dots
    for (let i = 0; i < 15; i++) {
        g.appendChild(_el('circle', { cx: x+(srand(seed+i*5)-0.5)*32, cy: y+(srand(seed+i*5+3)-0.5)*16,
            r: 0.45, fill: '#9a8a5a', 'fill-opacity': 0.3 }));
    }
    // Oasis hint (rare)
    if (srand(seed+150) > 0.7) {
        g.appendChild(_el('ellipse', { cx: x+jx, cy: y+4, rx: 4, ry: 2, fill: '#3a6a4a', 'fill-opacity': 0.15 }));
    }
}

// ── Volcanic: crater + lava cracks + smoke (larger) ──
function _drawVolcanicTerrain(g, x, y, seed) {
    const jx = (srand(seed)-0.5)*4;
    // Volcano body
    g.appendChild(_el('path', { d: `M${x-20+jx},${y+8} Q${x-8+jx},${y-18} ${x+jx},${y-20} Q${x+8+jx},${y-18} ${x+20+jx},${y+8} Z`,
        fill: '#3a2218', stroke: '#2a1a0a', 'stroke-width': 0.8 }));
    // Shadow hatching on left side
    for (let j = 0; j < 6; j++) {
        const t = 0.15 + j * 0.12;
        const hx = x-20+jx + 10*t, hy = y+8 + (y-20-y-8)*t;
        g.appendChild(_el('line', { x1: hx, y1: hy, x2: hx+2, y2: hy+4,
            stroke: '#1a0a08', 'stroke-width': 0.3, 'stroke-opacity': 0.4 }));
    }
    // Crater glow
    g.appendChild(_el('ellipse', { cx: x+jx, cy: y-19, rx: 7, ry: 3, fill: '#a04010', 'fill-opacity': 0.45 }));
    g.appendChild(_el('ellipse', { cx: x+jx, cy: y-19, rx: 4, ry: 1.8, fill: '#c06020', 'fill-opacity': 0.35 }));
    // Lava flows
    g.appendChild(_el('path', { d: `M${x+jx},${y-16} Q${x-3+jx},${y-6} ${x-8+jx},${y-1} Q${x-11+jx},${y+3} ${x-10+jx},${y+6}`,
        fill: 'none', stroke: '#a04010', 'stroke-width': 0.6, 'stroke-opacity': 0.5 }));
    g.appendChild(_el('path', { d: `M${x+jx},${y-16} Q${x+4+jx},${y-4} ${x+7+jx},${y+2} Q${x+6+jx},${y+5} ${x+5+jx},${y+7}`,
        fill: 'none', stroke: '#903810', 'stroke-width': 0.5, 'stroke-opacity': 0.4 }));
    // Smoke plumes (4)
    for (let i = 0; i < 4; i++) {
        const sx = x+jx+(srand(seed+i*3)-0.5)*6, sh = 7+i*6;
        g.appendChild(_el('path', { d: `M${sx},${y-20} Q${sx+4+i*2},${y-20-sh} ${sx-3-i},${y-20-sh-5}`,
            fill: 'none', stroke: '#5a4a38', 'stroke-width': 0.5+i*0.15, 'stroke-opacity': 0.18-i*0.03 }));
    }
    // Ash/ember dots
    for (let i = 0; i < 5; i++) {
        g.appendChild(_el('circle', { cx: x+(srand(seed+i*19)-0.5)*24, cy: y+(srand(seed+i*19+3)-0.5)*16,
            r: 0.4, fill: '#8a3010', 'fill-opacity': 0.15 }));
    }
}

// ── Cave: boulders + dark entrance (larger) ──
function _drawCaveTerrain(g, x, y, seed) {
    // Boulder field
    for (let i = 0; i < 6; i++) {
        const rx = x+(srand(seed+i*7)-0.5)*28, ry = y+(srand(seed+i*7+3)-0.5)*14;
        const rw = 5+srand(seed+i*7+1)*6, rh = 3+srand(seed+i*7+2)*4;
        g.appendChild(_el('path', { d: _organicBlob(rx, ry, rw, rh, seed+i*30, 6),
            fill: '#3a3430', stroke: '#2a2420', 'stroke-width': 0.6 }));
        // Crack line
        g.appendChild(_el('line', { x1: rx-rw*0.3, y1: ry-rh*0.2, x2: rx+rw*0.4, y2: ry+rh*0.3,
            stroke: '#1a1810', 'stroke-width': 0.35, 'stroke-opacity': 0.5 }));
        // Shadow hatching on boulders
        if (rw > 6) {
            for (let j = 0; j < 3; j++) {
                g.appendChild(_el('line', { x1: rx-rw*0.4+j*2, y1: ry-rh*0.3, x2: rx-rw*0.3+j*2, y2: ry+rh*0.3,
                    stroke: '#1a1810', 'stroke-width': 0.2, 'stroke-opacity': 0.25 }));
            }
        }
    }
    // Dark cave entrance
    if (srand(seed+55) > 0.3) {
        const cx = x+(srand(seed+88)-0.5)*10, cy = y+2;
        g.appendChild(_el('path', { d: `M${cx-8},${cy+5} Q${cx-8},${cy-7} ${cx},${cy-8} Q${cx+8},${cy-7} ${cx+8},${cy+5}`,
            fill: '#1a1810', 'fill-opacity': 0.45, stroke: '#3a3028', 'stroke-width': 0.6 }));
        // Darkness inside
        g.appendChild(_el('ellipse', { cx: cx, cy: cy-2, rx: 4, ry: 3, fill: '#0a0a08', 'fill-opacity': 0.3 }));
    }
}

// ── Graveyard: tombstones + crosses + dead trees (larger) ──
function _drawGraveyardTerrain(g, x, y, seed) {
    for (let i = 0; i < 5; i++) {
        const tx = x+(srand(seed+i*9)-0.5)*28, ty = y+(srand(seed+i*9+3)-0.5)*12;
        const th = 7+srand(seed+i*9+1)*5, tw = 3+srand(seed+i*9+2)*2.5;
        const tilt = (srand(seed+i*9+5)-0.5)*10;
        if (i < 3) {
            // Tombstone (rounded top)
            g.appendChild(_el('path', { d: `M${tx-tw},${ty+3} L${tx-tw},${ty-th+2} Q${tx},${ty-th-3} ${tx+tw},${ty-th+2} L${tx+tw},${ty+3} Z`,
                fill: '#4a4038', stroke: '#3a3028', 'stroke-width': 0.5,
                transform: `rotate(${tilt}, ${tx}, ${ty})` }));
            // Weathering lines
            g.appendChild(_el('line', { x1: tx-tw*0.5, y1: ty-th*0.3, x2: tx+tw*0.5, y2: ty-th*0.3,
                stroke: '#2a2420', 'stroke-width': 0.25, 'stroke-opacity': 0.35,
                transform: `rotate(${tilt}, ${tx}, ${ty})` }));
        } else {
            // Cross
            g.appendChild(_el('line', { x1: tx, y1: ty+3, x2: tx, y2: ty-th-1, stroke: '#4a4038', 'stroke-width': 1.3,
                transform: `rotate(${tilt}, ${tx}, ${ty})` }));
            g.appendChild(_el('line', { x1: tx-tw-1, y1: ty-th*0.55, x2: tx+tw+1, y2: ty-th*0.55, stroke: '#4a4038', 'stroke-width': 1.1,
                transform: `rotate(${tilt}, ${tx}, ${ty})` }));
        }
    }
    // Dead tree (always)
    const dx = x+12, dy = y-4;
    g.appendChild(_el('line', { x1: dx, y1: dy+7, x2: dx, y2: dy-12, stroke: '#3a2820', 'stroke-width': 1.2, 'stroke-linecap': 'round' }));
    g.appendChild(_el('line', { x1: dx, y1: dy-8, x2: dx+7, y2: dy-12, stroke: '#3a2820', 'stroke-width': 0.6 }));
    g.appendChild(_el('line', { x1: dx, y1: dy-5, x2: dx-6, y2: dy-10, stroke: '#3a2820', 'stroke-width': 0.5 }));
    g.appendChild(_el('line', { x1: dx, y1: dy-3, x2: dx+4, y2: dy-6, stroke: '#3a2820', 'stroke-width': 0.35 }));
    // Mist / fog wisps at ground level
    for (let i = 0; i < 2; i++) {
        const mx = x + (srand(seed+200+i)-0.5)*22, my = y + 4 + srand(seed+201+i)*3;
        g.appendChild(_el('ellipse', { cx: mx, cy: my, rx: 8, ry: 2, fill: '#5a5a5a', 'fill-opacity': 0.06 }));
    }
}

// ── Grassland: dense tufts + wildflowers (larger spread) ──
function _drawGrassland(g, x, y, seed) {
    for (let i = 0; i < 10; i++) {
        const gx = x+(srand(seed+i*5)-0.5)*34, gy = y+(srand(seed+i*5+2)-0.5)*18;
        for (let b = 0; b < 4; b++) {
            const angle = -25+b*16+(srand(seed+i*5+b)-0.5)*12;
            const bh = 5+srand(seed+i*5+b+10)*5;
            const rad = angle*Math.PI/180;
            g.appendChild(_el('path', { d: `M${gx},${gy} Q${gx+Math.sin(rad)*bh*0.5},${gy-bh*0.7} ${gx+Math.sin(rad)*bh},${gy-Math.cos(rad)*bh}`,
                fill: 'none', stroke: '#5a7a3a', 'stroke-width': 0.55, 'stroke-opacity': 0.45, 'stroke-linecap': 'round' }));
        }
    }
    // Wildflowers (more, larger)
    for (let i = 0; i < 5; i++) {
        if (srand(seed+90+i) > 0.35) {
            const fx = x+(srand(seed+70+i)-0.5)*26, fy = y+(srand(seed+71+i)-0.5)*14;
            g.appendChild(_el('circle', { cx: fx, cy: fy, r: 1.2,
                fill: ['#8a6a8a','#8a8a5a','#aa7a5a','#7a8a6a','#aa8a6a'][i%5], 'fill-opacity': 0.35 }));
        }
    }
}

// ===============================================================
// NAVIGATE MAP — Terrain: auto-fill, ground cover, dense art
// Medieval cartography: caterpillar mountains, canopy masses,
// cross-hatching, full landmass coverage, ink-on-parchment
// ===============================================================

// ── Utility: organic irregular blob SVG path ──
function _organicBlob(cx, cy, rx, ry, seed, n = 8) {
    let d = '';
    const pts = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const v = 0.75 + srand(seed + i * 7) * 0.5;
        pts.push([cx + Math.cos(a) * rx * v, cy + Math.sin(a) * ry * v]);
    }
    d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i <= n; i++) {
        const c = pts[i % n], p = pts[(i - 1) % n];
        const mx = (p[0] + c[0]) / 2 + (srand(seed + i * 13) - 0.5) * rx * 0.3;
        const my = (p[1] + c[1]) / 2 + (srand(seed + i * 17) - 0.5) * ry * 0.3;
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

// ── Ground cover: subtle ink texture across entire landmass ──
function renderGroundCover(svg) {
    const gG = _el('g', { class: 'ground-cover', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    for (let row = 0; row <= GRID_ROWS + 1; row++) {
        for (let col = 0; col <= GRID_COLS + 1; col++) {
            const { x, y } = hexToPixel(col, row);
            if (!_pointInLandmass(x, y)) continue;
            const seed = col * 97 + row * 53;
            // Grass tufts
            for (let i = 0; i < 2; i++) {
                const gx = x + (srand(seed + i * 7) - 0.5) * HEX_W;
                const gy = y + (srand(seed + i * 7 + 3) - 0.5) * ROW_H;
                const a = (srand(seed + i * 7 + 5) - 0.5) * 50 * Math.PI / 180;
                const l = 2 + srand(seed + i * 7 + 1) * 3;
                gG.appendChild(_el('line', {
                    x1: gx, y1: gy, x2: gx + Math.sin(a) * l, y2: gy - Math.cos(a) * l,
                    stroke: '#5a5a3a', 'stroke-width': 0.25, 'stroke-opacity': 0.1,
                    'stroke-linecap': 'round',
                }));
            }
            // Stipple dot
            if (srand(seed + 200) > 0.4) {
                gG.appendChild(_el('circle', {
                    cx: x + (srand(seed + 201) - 0.5) * 28,
                    cy: y + (srand(seed + 202) - 0.5) * 18,
                    r: 0.35, fill: '#4a4030', 'fill-opacity': 0.06,
                }));
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
                vis = Math.max(vis, d <= 1 ? 0.28 : d <= 2 ? 0.2 : d <= 3 ? 0.12 : 0.06);
                if (discoveredSet.has(locId)) vis = Math.max(vis, d <= 1 ? 0.38 : d <= 2 ? 0.25 : d <= 3 ? 0.15 : 0.08);
            }
        }
        if (vis <= 0) continue;
        const r = 30 + srand(col * 100 + row) * 14;
        regG.appendChild(_el('ellipse', {
            cx: x, cy: y, rx: r + 8, ry: r,
            fill: colors[biome] || colors.plains, 'fill-opacity': vis,
            transform: `rotate(${(srand(col * 31 + row * 17) - 0.5) * 25}, ${x}, ${y})`,
            filter: 'url(#terrain-soft)',
        }));
    }
    svg.appendChild(regG);
}

// ── Terrain details: full art at TERRAIN_HEXES + light fill everywhere else ──
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
                    op = Math.max(op, d <= 1 ? 0.65 : d <= 2 ? 0.4 : d <= 3 ? 0.2 : 0.08);
                    if (discoveredSet.has(locId)) op = Math.max(op, d <= 1 ? 0.85 : d <= 2 ? 0.55 : d <= 3 ? 0.3 : 0.12);
                }
            }
            if (op <= 0) continue;
            if (isFill) op *= 0.6; // background fill slightly lighter
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
    drawHexes(autoFill, true);   // Background fill first
    drawHexes(TERRAIN_HEXES, false); // Full detail on top
    svg.appendChild(tG);
}

// ── Light terrain for auto-fill hexes (2-3 elements each) ──
function _drawLightTerrain(g, x, y, biome, seed) {
    const jx = (srand(seed) - 0.5) * 8, jy = (srand(seed + 1) - 0.5) * 5;
    if (biome === 'mountain') {
        g.appendChild(_el('path', { d: `M${x-8+jx},${y+3+jy} Q${x+jx},${y-10+jy} ${x+8+jx},${y+3+jy}`,
            fill: '#504a44', stroke: '#3a3430', 'stroke-width': 0.4 }));
        for (let j = 0; j < 3; j++) { const t = 0.3 + j * 0.2;
            g.appendChild(_el('line', { x1: x-8+jx + 8*t, y1: y+3+jy + (y-10+jy-y-3-jy)*t,
                x2: x-8+jx + 8*t + 2, y2: y+3+jy + (y-10+jy-y-3-jy)*t + 3,
                stroke: '#2a2420', 'stroke-width': 0.3, 'stroke-opacity': 0.35 })); }
    } else if (biome === 'forest') {
        for (let i = 0; i < 2; i++) {
            const bx = x + (srand(seed+i*11)-0.5)*12 + jx, by = y + (srand(seed+i*11+3)-0.5)*8 + jy;
            g.appendChild(_el('path', { d: _organicBlob(bx, by, 5, 4, seed+i*30, 6),
                fill: '#1a4210', 'fill-opacity': 0.6, stroke: '#0a2808', 'stroke-width': 0.2 }));
        }
    } else if (biome === 'snow') {
        g.appendChild(_el('path', { d: `M${x-6+jx},${y+2+jy} Q${x+jx},${y-8+jy} ${x+6+jx},${y+2+jy}`,
            fill: '#8a8888', stroke: '#6a6868', 'stroke-width': 0.3 }));
        g.appendChild(_el('path', { d: `M${x-3+jx},${y-2+jy} Q${x+jx},${y-8+jy} ${x+3+jx},${y-2+jy}`,
            fill: '#c8c4bc', stroke: 'none' }));
    } else if (biome === 'swamp') {
        g.appendChild(_el('path', { d: `M${x-8+jx},${y+jy} Q${x+jx},${y-2+jy} ${x+8+jx},${y+jy}`,
            fill: 'none', stroke: '#3a5a2a', 'stroke-width': 0.4, 'stroke-opacity': 0.4 }));
    } else if (biome === 'desert') {
        g.appendChild(_el('path', { d: `M${x-10+jx},${y+2+jy} Q${x+jx},${y-5+jy} ${x+10+jx},${y+2+jy}`,
            fill: '#7a6a38', 'fill-opacity': 0.2, stroke: '#6a5a2a', 'stroke-width': 0.3 }));
    } else if (biome === 'volcanic') {
        g.appendChild(_el('path', { d: `M${x-5+jx},${y+3+jy} L${x+jx},${y-6+jy} L${x+5+jx},${y+3+jy} Z`,
            fill: '#3a2218', stroke: '#2a1a0a', 'stroke-width': 0.3 }));
    } else {
        for (let i = 0; i < 3; i++) {
            const gx = x + (srand(seed+i*5)-0.5)*14, gy = y + (srand(seed+i*5+2)-0.5)*8;
            const a = (srand(seed+i*5+4)-0.5)*40*Math.PI/180;
            g.appendChild(_el('line', { x1: gx, y1: gy, x2: gx+Math.sin(a)*4, y2: gy-Math.cos(a)*4,
                stroke: '#5a7a3a', 'stroke-width': 0.4, 'stroke-opacity': 0.35, 'stroke-linecap': 'round' }));
        }
    }
}

// ══════════════════════════════════════════════════════════
// FULL TERRAIN ILLUSTRATIONS — realistic medieval ink art
// ══════════════════════════════════════════════════════════

// ── Mountains: caterpillar humps with cross-hatching ──
function _drawMountainRange(g, x, y, seed) {
    const count = 3 + Math.floor(srand(seed) * 3);
    const peaks = [];
    for (let i = 0; i < count; i++) {
        peaks.push({
            px: x + (i - (count-1)/2) * 13 + (srand(seed+i*10)-0.5) * 5,
            py: y + (srand(seed+i*10+5)-0.5) * 6,
            h: 16 + srand(seed+i*10+1) * 18,
            w: 9 + srand(seed+i*10+2) * 6,
        });
    }
    peaks.sort((a, b) => a.h - b.h); // smaller behind

    for (const p of peaks) {
        const by = p.py + 4, lx = p.px - p.w, rx = p.px + p.w;
        const ty = p.py - p.h;
        const jit = (srand(seed + p.px * 7) - 0.5) * 2;
        // Rounded hump body (bezier, not triangle)
        const body = `M${lx},${by} Q${lx + p.w*0.15},${ty + p.h*0.25} ${p.px + jit},${ty}
            Q${rx - p.w*0.15},${ty + p.h*0.25} ${rx},${by} Z`;
        g.appendChild(_el('path', { d: body, fill: '#585248', stroke: '#3a302a', 'stroke-width': 0.7, 'stroke-linejoin': 'round' }));
        // Shadow hatching (left face) — dense parallel diagonal lines
        for (let j = 0; j < 8; j++) {
            const t = 0.12 + j * 0.1;
            const hx = lx + (p.px - lx) * t * 0.65;
            const hy = by + (ty - by) * t;
            const hLen = p.h * 0.12 * (1 - t * 0.3);
            g.appendChild(_el('line', { x1: hx, y1: hy, x2: hx + hLen * 0.4, y2: hy + hLen,
                stroke: '#2a2018', 'stroke-width': 0.35, 'stroke-opacity': 0.5 * (1 - t * 0.3) }));
        }
        // Right face lighter hatching
        for (let j = 0; j < 3; j++) {
            const t = 0.3 + j * 0.2;
            const hx = rx + (p.px - rx) * t * 0.5;
            const hy = by + (ty - by) * t;
            g.appendChild(_el('line', { x1: hx, y1: hy, x2: hx - 2, y2: hy + p.h * 0.06,
                stroke: '#6a6058', 'stroke-width': 0.25, 'stroke-opacity': 0.2 }));
        }
        // Snow cap (irregular)
        const cW = p.w * 0.45, cH = p.h * 0.2;
        g.appendChild(_el('path', {
            d: `M${p.px - cW + jit},${ty + cH} Q${p.px + jit},${ty - 2} ${p.px + cW + jit},${ty + cH + 1}`,
            fill: '#d0c8b8', stroke: '#a8a090', 'stroke-width': 0.3 }));
    }
    // Scree at base
    for (let i = 0; i < 8; i++) {
        const sx = x + (srand(seed+i*31)-0.5) * 26, sy = y + 3 + srand(seed+i*31+1) * 5;
        g.appendChild(_el('circle', { cx: sx, cy: sy, r: 0.5 + srand(seed+i*31+2) * 0.5,
            fill: '#4a4038', 'fill-opacity': 0.3 }));
    }
}

// ── Forests: dense organic canopy masses ──
function _drawForestMass(g, x, y, seed) {
    const count = 6 + Math.floor(srand(seed) * 5);
    const blobs = [];
    for (let i = 0; i < count; i++) {
        blobs.push({
            bx: x + (srand(seed+i*13)-0.5) * 28,
            by: y + (srand(seed+i*13+5)-0.5) * 16,
            rw: 4 + srand(seed+i*13+1) * 5,
            rh: 3 + srand(seed+i*13+2) * 4,
        });
    }
    blobs.sort((a, b) => a.by - b.by);
    // Shadow mass under canopy
    g.appendChild(_el('path', { d: _organicBlob(x, y + 5, 16, 8, seed + 999, 10),
        fill: '#0a1a08', 'fill-opacity': 0.12 }));
    // Trunk hints
    for (let i = 0; i < 4; i++) {
        const tx = x + (srand(seed+i*23)-0.5) * 18, ty = y + 5 + srand(seed+i*23+1) * 4;
        g.appendChild(_el('line', { x1: tx, y1: ty, x2: tx + (srand(seed+i*23+2)-0.5)*1.5, y2: ty - 7,
            stroke: '#3a2810', 'stroke-width': 0.7, 'stroke-linecap': 'round' }));
    }
    // Canopy masses (organic blobs — NOT circles)
    for (const b of blobs) {
        // Dark base
        g.appendChild(_el('path', { d: _organicBlob(b.bx, b.by + b.rh*0.15, b.rw*0.95, b.rh*0.9, seed+b.bx*7, 7),
            fill: '#143a0e', 'fill-opacity': 0.85, stroke: '#0a2808', 'stroke-width': 0.2 }));
        // Main canopy
        g.appendChild(_el('path', { d: _organicBlob(b.bx, b.by, b.rw, b.rh, seed+b.bx*3+1, 7),
            fill: '#1a4a12', 'fill-opacity': 0.9, stroke: '#0a2a08', 'stroke-width': 0.25 }));
        // Sunlit highlight
        g.appendChild(_el('ellipse', { cx: b.bx - b.rw*0.2, cy: b.by - b.rh*0.25,
            rx: b.rw*0.35, ry: b.rh*0.25, fill: '#2a7a1a', 'fill-opacity': 0.2 }));
    }
    // Undergrowth
    for (let i = 0; i < 3; i++) {
        const ux = x + (srand(seed+i*51)-0.5) * 22, uy = y + 7 + srand(seed+i*51+3) * 4;
        g.appendChild(_el('path', { d: _organicBlob(ux, uy, 3, 2, seed+i*51+7, 5),
            fill: '#1a3a10', 'fill-opacity': 0.3 }));
    }
}

// ── Snow range: multiple icy peaks ──
function _drawSnowRange(g, x, y, seed) {
    const count = 2 + Math.floor(srand(seed) * 2);
    for (let i = 0; i < count; i++) {
        const ox = (i-(count-1)/2)*15 + (srand(seed+i*11)-0.5)*5;
        const h = 18 + srand(seed+i*11+1)*12, w = 11 + srand(seed+i*11+2)*5;
        const px = x+ox, py = y, ty = py - h;
        g.appendChild(_el('path', { d: `M${px-w},${py+4} Q${px-w*0.2},${ty+h*0.2} ${px},${ty} Q${px+w*0.2},${ty+h*0.2} ${px+w},${py+4} Z`,
            fill: '#8a8890', stroke: '#6a6868', 'stroke-width': 0.5 }));
        for (let j = 0; j < 5; j++) { const t = 0.15+j*0.14;
            g.appendChild(_el('line', { x1: px-w+w*t*0.6, y1: py+4+(ty-py-4)*t,
                x2: px-w+w*t*0.6+2, y2: py+4+(ty-py-4)*t+h*0.07,
                stroke: '#5a5860', 'stroke-width': 0.3, 'stroke-opacity': 0.35 })); }
        g.appendChild(_el('path', { d: `M${px-w*0.6},${ty+h*0.3} Q${px},${ty-2} ${px+w*0.6},${ty+h*0.3}`,
            fill: '#dcd8d0', stroke: '#b8b0a8', 'stroke-width': 0.3 }));
        for (let j = 0; j < 3; j++) { const ly = ty + h*(0.15+j*0.08), lw = w*(0.4-j*0.08);
            g.appendChild(_el('path', { d: `M${px-lw},${ly} Q${px},${ly-1} ${px+lw},${ly}`,
                fill: 'none', stroke: '#e8e4dc', 'stroke-width': 0.3, 'stroke-opacity': 0.4 })); }
    }
    for (let i = 0; i < 3; i++) { const dx = (srand(seed+i*41)-0.5)*22;
        g.appendChild(_el('ellipse', { cx: x+dx, cy: y+5+srand(seed+i*41+1)*4, rx: 4+srand(seed+i*41+2)*3, ry: 1.5,
            fill: '#c8c4bc', 'fill-opacity': 0.2 })); }
}

// ── Swamp: murky water + reeds + dead wood ──
function _drawSwampWater(g, x, y, seed) {
    const jx = (srand(seed)-0.5)*6;
    g.appendChild(_el('path', { d: _organicBlob(x+jx, y, 18, 11, seed+77, 8),
        fill: '#1a2a18', 'fill-opacity': 0.35, stroke: '#2a3a1a', 'stroke-width': 0.4 }));
    for (let i = 0; i < 5; i++) {
        const wy = y-7+i*3.5, wj = (srand(seed+i*7)-0.5)*4;
        g.appendChild(_el('path', { d: `M${x-13+wj},${wy} Q${x+wj},${wy-1.5} ${x+13+wj},${wy}`,
            fill: 'none', stroke: '#3a5a2a', 'stroke-width': 0.5, 'stroke-opacity': 0.4 }));
    }
    for (let i = 0; i < 4; i++) {
        const rx = x+(i<2?-10-i*4:8+(i-2)*5)+jx, ry = y-2+(srand(seed+i*7+20)-0.5)*6;
        g.appendChild(_el('line', { x1: rx, y1: ry+5, x2: rx-0.5, y2: ry-10, stroke: '#4a6a2a', 'stroke-width': 0.6 }));
        g.appendChild(_el('ellipse', { cx: rx-0.5, cy: ry-11, rx: 1.3, ry: 2.8, fill: '#5a4a20' }));
    }
    if (srand(seed+99) > 0.4) {
        const dx = x+14+jx, dy = y-4;
        g.appendChild(_el('line', { x1: dx, y1: dy+6, x2: dx, y2: dy-8, stroke: '#3a3020', 'stroke-width': 1, 'stroke-linecap': 'round' }));
        g.appendChild(_el('line', { x1: dx, y1: dy-5, x2: dx+5, y2: dy-9, stroke: '#3a3020', 'stroke-width': 0.5 }));
    }
}

// ── Desert: rolling dune ridges + stippling ──
function _drawDesertDunes(g, x, y, seed) {
    const jx = (srand(seed)-0.5)*5;
    for (let d = 0; d < 3; d++) {
        const dy = -6+d*5, dOx = (srand(seed+d*17)-0.5)*8;
        g.appendChild(_el('path', { d: `M${x-22+dOx+jx},${y+dy+5} Q${x-6+dOx+jx},${y+dy-7} ${x+2+dOx+jx},${y+dy+3} Q${x+14+dOx+jx},${y+dy-4} ${x+22+dOx+jx},${y+dy+5}`,
            fill: '#7a6a38', 'fill-opacity': 0.12+d*0.06, stroke: '#6a5a2a', 'stroke-width': 0.4 }));
    }
    for (let i = 0; i < 5; i++) {
        const wy = y-3+i*3, wx = x-12+(srand(seed+i*9)-0.5)*6;
        g.appendChild(_el('line', { x1: wx, y1: wy, x2: wx+10+srand(seed+i*9+1)*6, y2: wy-0.5,
            stroke: '#9a8a4a', 'stroke-width': 0.3, 'stroke-dasharray': '1.5 2.5', 'stroke-opacity': 0.3 }));
    }
    for (let i = 0; i < 10; i++) {
        g.appendChild(_el('circle', { cx: x+(srand(seed+i*5)-0.5)*28, cy: y+(srand(seed+i*5+3)-0.5)*12,
            r: 0.5, fill: '#9a8a5a', 'fill-opacity': 0.25 }));
    }
}

// ── Volcanic: crater + lava cracks + smoke ──
function _drawVolcanicTerrain(g, x, y, seed) {
    const jx = (srand(seed)-0.5)*4;
    g.appendChild(_el('path', { d: `M${x-16+jx},${y+6} Q${x-6+jx},${y-14} ${x+jx},${y-15} Q${x+6+jx},${y-14} ${x+16+jx},${y+6} Z`,
        fill: '#3a2218', stroke: '#2a1a0a', 'stroke-width': 0.7 }));
    g.appendChild(_el('ellipse', { cx: x+jx, cy: y-14, rx: 6, ry: 2.5, fill: '#a04010', 'fill-opacity': 0.4 }));
    g.appendChild(_el('ellipse', { cx: x+jx, cy: y-14, rx: 3, ry: 1.5, fill: '#c06020', 'fill-opacity': 0.3 }));
    g.appendChild(_el('path', { d: `M${x+jx},${y-11} L${x-6+jx},${y-2} L${x-9+jx},${y+4}`,
        fill: 'none', stroke: '#a04010', 'stroke-width': 0.5, 'stroke-opacity': 0.45 }));
    g.appendChild(_el('path', { d: `M${x+jx},${y-11} L${x+6+jx},${y} L${x+4+jx},${y+5}`,
        fill: 'none', stroke: '#903810', 'stroke-width': 0.4, 'stroke-opacity': 0.35 }));
    for (let i = 0; i < 3; i++) {
        const sx = x+jx+(srand(seed+i*3)-0.5)*5, sh = 6+i*5;
        g.appendChild(_el('path', { d: `M${sx},${y-15} Q${sx+3+i*2},${y-15-sh} ${sx-2-i},${y-15-sh-4}`,
            fill: 'none', stroke: '#5a4a38', 'stroke-width': 0.4+i*0.12, 'stroke-opacity': 0.15-i*0.03 }));
    }
}

// ── Cave: boulders + dark entrance ──
function _drawCaveTerrain(g, x, y, seed) {
    for (let i = 0; i < 4; i++) {
        const rx = x+(srand(seed+i*7)-0.5)*22, ry = y+(srand(seed+i*7+3)-0.5)*10;
        const rw = 4+srand(seed+i*7+1)*5, rh = 3+srand(seed+i*7+2)*3;
        g.appendChild(_el('path', { d: _organicBlob(rx, ry, rw, rh, seed+i*30, 6),
            fill: '#3a3430', stroke: '#2a2420', 'stroke-width': 0.5 }));
        g.appendChild(_el('line', { x1: rx-rw*0.3, y1: ry-rh*0.2, x2: rx+rw*0.4, y2: ry+rh*0.3,
            stroke: '#1a1810', 'stroke-width': 0.3, 'stroke-opacity': 0.5 }));
    }
    if (srand(seed+55) > 0.4) {
        const cx = x+(srand(seed+88)-0.5)*10, cy = y+2;
        g.appendChild(_el('path', { d: `M${cx-6},${cy+4} Q${cx-6},${cy-5} ${cx},${cy-6} Q${cx+6},${cy-5} ${cx+6},${cy+4}`,
            fill: '#1a1810', 'fill-opacity': 0.4, stroke: '#3a3028', 'stroke-width': 0.5 }));
    }
}

// ── Graveyard: tombstones + crosses + dead trees ──
function _drawGraveyardTerrain(g, x, y, seed) {
    for (let i = 0; i < 4; i++) {
        const tx = x+(srand(seed+i*9)-0.5)*24, ty = y+(srand(seed+i*9+3)-0.5)*10;
        const th = 6+srand(seed+i*9+1)*4, tw = 3+srand(seed+i*9+2)*2;
        const tilt = (srand(seed+i*9+5)-0.5)*8;
        if (i < 2) {
            g.appendChild(_el('path', { d: `M${tx-tw},${ty+2} L${tx-tw},${ty-th+2} Q${tx},${ty-th-2} ${tx+tw},${ty-th+2} L${tx+tw},${ty+2} Z`,
                fill: '#4a4038', stroke: '#3a3028', 'stroke-width': 0.4,
                transform: `rotate(${tilt}, ${tx}, ${ty})` }));
        } else {
            g.appendChild(_el('line', { x1: tx, y1: ty+2, x2: tx, y2: ty-th, stroke: '#4a4038', 'stroke-width': 1.2,
                transform: `rotate(${tilt}, ${tx}, ${ty})` }));
            g.appendChild(_el('line', { x1: tx-tw, y1: ty-th*0.6, x2: tx+tw, y2: ty-th*0.6, stroke: '#4a4038', 'stroke-width': 1,
                transform: `rotate(${tilt}, ${tx}, ${ty})` }));
        }
    }
    if (srand(seed+77) > 0.3) {
        const dx = x+10, dy = y-3;
        g.appendChild(_el('line', { x1: dx, y1: dy+6, x2: dx, y2: dy-10, stroke: '#3a2820', 'stroke-width': 1, 'stroke-linecap': 'round' }));
        g.appendChild(_el('line', { x1: dx, y1: dy-6, x2: dx+6, y2: dy-10, stroke: '#3a2820', 'stroke-width': 0.5 }));
        g.appendChild(_el('line', { x1: dx, y1: dy-4, x2: dx-5, y2: dy-8, stroke: '#3a2820', 'stroke-width': 0.4 }));
    }
}

// ── Grassland: dense tufts + wildflowers ──
function _drawGrassland(g, x, y, seed) {
    for (let i = 0; i < 7; i++) {
        const gx = x+(srand(seed+i*5)-0.5)*28, gy = y+(srand(seed+i*5+2)-0.5)*14;
        for (let b = 0; b < 4; b++) {
            const angle = -25+b*16+(srand(seed+i*5+b)-0.5)*12;
            const bh = 4+srand(seed+i*5+b+10)*4;
            const rad = angle*Math.PI/180;
            g.appendChild(_el('path', { d: `M${gx},${gy} Q${gx+Math.sin(rad)*bh*0.5},${gy-bh*0.7} ${gx+Math.sin(rad)*bh},${gy-Math.cos(rad)*bh}`,
                fill: 'none', stroke: '#5a7a3a', 'stroke-width': 0.5, 'stroke-opacity': 0.4, 'stroke-linecap': 'round' }));
        }
    }
    for (let i = 0; i < 3; i++) {
        if (srand(seed+90+i) > 0.4) {
            const fx = x+(srand(seed+70+i)-0.5)*20, fy = y+(srand(seed+71+i)-0.5)*10;
            g.appendChild(_el('circle', { cx: fx, cy: fy, r: 1.0,
                fill: ['#8a6a8a','#8a8a5a','#aa7a5a'][i%3], 'fill-opacity': 0.3 }));
        }
    }
}

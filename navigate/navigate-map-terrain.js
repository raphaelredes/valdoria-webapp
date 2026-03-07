// ===============================================================
// NAVIGATE MAP — Terrain Rendering (Hand-Drawn Medieval Style)
// All terrain features are ink strokes on parchment — no fills,
// no gradients, no blur. Pure 2D cartographic symbols.
// ===============================================================

// ── Utility: organic blob path (kept for region boundaries) ──
function _organicBlob(cx, cy, rx, ry, seed, n = 8) {
    const pts = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const v = 0.7 + srand(seed + i * 7) * 0.6;
        pts.push([cx + Math.cos(a) * rx * v, cy + Math.sin(a) * ry * v]);
    }
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i <= n; i++) {
        const c = pts[i % n], p = pts[(i - 1) % n];
        const mx = (p[0] + c[0]) / 2 + (srand(seed + i * 13) - 0.5) * rx * 0.35;
        const my = (p[1] + c[1]) / 2 + (srand(seed + i * 17) - 0.5) * ry * 0.35;
        d += ` Q${mx},${my} ${c[0]},${c[1]}`;
    }
    return d;
}

// ── Utility: smooth hull path ──
function _hullPath(points, pad, seed) {
    if (points.length <= 1) {
        const p = points[0];
        return _organicBlob(p.x, p.y, pad, pad * 0.8, seed, 10);
    }
    const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const hull = [];
    for (const p of pts) {
        while (hull.length >= 2) {
            const a = hull[hull.length - 2], b = hull[hull.length - 1];
            if ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) <= 0) hull.pop();
            else break;
        }
        hull.push(p);
    }
    const lower = hull.length + 1;
    for (let i = pts.length - 2; i >= 0; i--) {
        const p = pts[i];
        while (hull.length >= lower) {
            const a = hull[hull.length - 2], b = hull[hull.length - 1];
            if ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) <= 0) hull.pop();
            else break;
        }
        hull.push(p);
    }
    hull.pop();
    const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
    const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
    const expanded = hull.map((p, i) => {
        const dx = p.x - cx, dy = p.y - cy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const wobble = (srand(seed + i * 17) - 0.5) * pad * 0.4;
        return { x: p.x + (dx / len) * (pad + wobble), y: p.y + (dy / len) * (pad + wobble) };
    });
    let d = `M${expanded[0].x},${expanded[0].y}`;
    for (let i = 1; i <= expanded.length; i++) {
        const c = expanded[i % expanded.length], p = expanded[(i - 1) % expanded.length];
        const mx = (p.x + c.x) / 2 + (srand(seed + i * 23) - 0.5) * pad * 0.3;
        const my = (p.y + c.y) / 2 + (srand(seed + i * 29) - 0.5) * pad * 0.3;
        d += ` Q${mx},${my} ${c.x},${c.y}`;
    }
    return d + ' Z';
}

// ── Auto-fill: ALL landmass hexes get a biome ──
function _buildAutoFillHexes() {
    const seeds = [];
    for (const [col, row, biome] of TERRAIN_HEXES) seeds.push({ col, row, biome });
    for (const [locId, c] of Object.entries(LOCATION_COORDS))
        seeds.push({ col: c.col, row: c.row, biome: S.locations?.[locId]?.b || 'plains' });
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

// ── Region builder ──
function _buildBiomeRegions(allHexes) {
    const byKey = new Map();
    for (const [col, row, biome] of allHexes) {
        byKey.set(`${col},${row}`, { col, row, biome, ...hexToPixel(col, row) });
    }
    const visited = new Set();
    const regions = {};
    for (const [key, hex] of byKey) {
        if (visited.has(key)) continue;
        visited.add(key);
        const cluster = [hex];
        const queue = [hex];
        while (queue.length) {
            const h = queue.shift();
            const neighbors = [
                [h.col - 1, h.row], [h.col + 1, h.row],
                [h.col + (h.row % 2 ? 1 : -1), h.row - 1], [h.col, h.row - 1],
                [h.col + (h.row % 2 ? 1 : -1), h.row + 1], [h.col, h.row + 1],
            ];
            for (const [nc, nr] of neighbors) {
                const nk = `${nc},${nr}`;
                if (visited.has(nk)) continue;
                const nh = byKey.get(nk);
                if (!nh || nh.biome !== hex.biome) continue;
                visited.add(nk);
                cluster.push(nh);
                queue.push(nh);
            }
        }
        if (!regions[hex.biome]) regions[hex.biome] = [];
        regions[hex.biome].push(cluster);
    }
    return regions;
}

// ── Visibility helper ──
function _hexVisibility(col, row, knownSet, discoveredSet) {
    let op = 0;
    for (const locId of knownSet) {
        const c = LOCATION_COORDS[locId]; if (!c) continue;
        const d = Math.abs(col - c.col) + Math.abs(row - c.row);
        if (d <= 6) {
            op = Math.max(op, d <= 1 ? 0.85 : d <= 2 ? 0.65 : d <= 3 ? 0.4 : d <= 4 ? 0.2 : 0.08);
            if (discoveredSet.has(locId))
                op = Math.max(op, d <= 1 ? 1.0 : d <= 2 ? 0.8 : d <= 3 ? 0.55 : d <= 4 ? 0.3 : 0.15);
        }
    }
    return op;
}

// ── Ground cover (ink marks per biome) ──
function renderGroundCover(svg) {
    const gG = _el('g', { class: 'ground-cover', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    const biomeCache = new Map();
    const allHexes = [...TERRAIN_HEXES, ..._buildAutoFillHexes()];
    for (const [c, r, b] of allHexes) biomeCache.set(`${c},${r}`, b);

    for (let row = 0; row <= GRID_ROWS + 1; row++) {
        for (let col = 0; col <= GRID_COLS + 1; col++) {
            const { x, y } = hexToPixel(col, row);
            if (!_pointInLandmass(x, y)) continue;
            const seed = col * 97 + row * 53;
            const biome = biomeCache.get(`${col},${row}`) || 'plains';
            const strokes = _groundCoverStrokes(x, y, biome, seed);
            for (const s of strokes) gG.appendChild(s);
        }
    }
    svg.appendChild(gG);
}

function _groundCoverStrokes(x, y, biome, seed) {
    const els = [];
    if (biome === 'forest') {
        // Undergrowth stipple (denser)
        for (let i = 0; i < 7; i++) {
            const bx = x + (srand(seed+i*7)-0.5)*HEX_W, by = y + (srand(seed+i*7+3)-0.5)*ROW_H;
            els.push(_el('circle', { cx: bx, cy: by, r: 0.4 + srand(seed+i*7+1)*0.4,
                fill: INK_DARK, 'fill-opacity': 0.15 + srand(seed+i*7+2)*0.08 }));
        }
    } else if (biome === 'mountain' || biome === 'cave') {
        // Chevron marks + rock dots
        for (let i = 0; i < 5; i++) {
            const rx = x + (srand(seed+i*9)-0.5)*HEX_W, ry = y + (srand(seed+i*9+3)-0.5)*ROW_H;
            const sz = 2 + srand(seed+i*9+1) * 2;
            els.push(_el('path', { d: `M${rx-sz},${ry+sz*0.5} L${rx},${ry-sz*0.5} L${rx+sz},${ry+sz*0.5}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.35, 'stroke-opacity': 0.2 }));
        }
        // Rock dots
        for (let i = 0; i < 3; i++) {
            const dx = x + (srand(seed+i*11+50)-0.5)*HEX_W;
            const dy = y + (srand(seed+i*11+53)-0.5)*ROW_H;
            els.push(_el('circle', { cx: dx, cy: dy, r: 0.5,
                fill: INK_DARK, 'fill-opacity': 0.15 }));
        }
    } else if (biome === 'snow') {
        // Snow: sparse marks + occasional wind streak
        if (srand(seed) > 0.5) {
            const wx = x + (srand(seed+1)-0.5)*HEX_W;
            const wy = y + (srand(seed+2)-0.5)*ROW_H;
            els.push(_el('line', { x1: wx-3, y1: wy, x2: wx+3, y2: wy-0.3,
                stroke: INK_LIGHT, 'stroke-width': 0.3, 'stroke-opacity': 0.12 }));
        }
    } else if (biome === 'desert') {
        // Wind dashes (denser)
        for (let i = 0; i < 5; i++) {
            const dx = x + (srand(seed+i*6)-0.5)*HEX_W, dy = y + (srand(seed+i*6+3)-0.5)*ROW_H;
            const wl = 4 + srand(seed+i*6+1) * 6;
            els.push(_el('line', { x1: dx, y1: dy, x2: dx+wl, y2: dy - 0.3,
                stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.15, 'stroke-dasharray': '2 2' }));
        }
    } else if (biome === 'swamp') {
        // Water marks
        for (let i = 0; i < 2; i++) {
            const wx = x + (srand(seed+i*8+501)-0.5)*20, wy = y + (srand(seed+i*8+502)-0.5)*12;
            els.push(_el('path', { d: `M${wx-5},${wy} Q${wx},${wy-1.5} ${wx+5},${wy}`,
                fill: 'none', stroke: INK, 'stroke-width': 0.35, 'stroke-opacity': 0.18 }));
        }
    } else if (biome === 'volcanic') {
        // Ash dots + small cracks
        for (let i = 0; i < 4; i++) {
            const vx = x + (srand(seed+i*8)-0.5)*HEX_W, vy = y + (srand(seed+i*8+3)-0.5)*ROW_H;
            els.push(_el('circle', { cx: vx, cy: vy, r: 0.4,
                fill: INK_DARK, 'fill-opacity': 0.15 }));
        }
        if (srand(seed+100) > 0.6) {
            const cx = x + (srand(seed+101)-0.5)*HEX_W;
            const cy = y + (srand(seed+102)-0.5)*ROW_H;
            els.push(_el('line', { x1: cx-3, y1: cy, x2: cx+3, y2: cy+1,
                stroke: INK_DARK, 'stroke-width': 0.25, 'stroke-opacity': 0.15 }));
        }
    } else if (biome === 'graveyard') {
        // Sparse grass + earth marks
        for (let i = 0; i < 2; i++) {
            const gx = x + (srand(seed+i*7)-0.5)*HEX_W, gy = y + (srand(seed+i*7+3)-0.5)*ROW_H;
            els.push(_el('line', { x1: gx, y1: gy, x2: gx+(srand(seed+i*7+5)-0.5)*3, y2: gy-3,
                stroke: INK_DARK, 'stroke-width': 0.25, 'stroke-opacity': 0.15 }));
        }
    } else {
        // Plains — grass blade tufts (more, bolder)
        for (let i = 0; i < 5; i++) {
            const gx = x + (srand(seed+i*7)-0.5)*HEX_W, gy = y + (srand(seed+i*7+3)-0.5)*ROW_H;
            for (let b = 0; b < 2; b++) {
                const a = (srand(seed+i*7+b*3+5)-0.5)*60*Math.PI/180;
                const l = 3+srand(seed+i*7+b*3+1)*3;
                els.push(_el('line', { x1: gx+b*1.5, y1: gy, x2: gx+b*1.5+Math.sin(a)*l, y2: gy-Math.cos(a)*l,
                    stroke: INK, 'stroke-width': 0.35, 'stroke-opacity': 0.22, 'stroke-linecap': 'round' }));
            }
        }
    }
    return els;
}

// ══════════════════════════════════════════════════════════
// TERRAIN REGIONS — Ink boundary lines only (no colored fills)
// ══════════════════════════════════════════════════════════

// Biome fill colors (muted, parchment-friendly — 2D flat fills)
const BIOME_FILLS = {
    plains:    { fill: '#7a9a50', op: 0.08 }, // Subtle green tint
    forest:    { fill: '#3a6a2a', op: 0.22 }, // Rich green
    mountain:  { fill: '#6a6050', op: 0.14 }, // Gray-brown
    snow:      { fill: '#d0c8b0', op: 0.2 },  // Light parchment (snow effect)
    swamp:     { fill: '#4a5a3a', op: 0.16 }, // Dark olive green
    desert:    { fill: '#b09858', op: 0.14 }, // Sandy tan
    volcanic:  { fill: '#5a3a2a', op: 0.16 }, // Dark brown-red
    cave:      { fill: '#3a3028', op: 0.18 }, // Very dark brown
    graveyard: { fill: '#4a4238', op: 0.14 }, // Ashen gray
};

function renderTerrainRegions(svg, fogState) {
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);
    const regG = _el('g', { class: 'terrain-regions', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    const allHexes = [...TERRAIN_HEXES, ..._buildAutoFillHexes()];
    const regions = _buildBiomeRegions(allHexes);

    for (const [biome, clusters] of Object.entries(regions)) {
        const fillInfo = BIOME_FILLS[biome];
        if (!fillInfo) continue;
        const isPlains = biome === 'plains';
        for (const cluster of clusters) {
            if (cluster.length < 2) continue;
            let vis = 0;
            for (const h of cluster) {
                vis = Math.max(vis, _hexVisibility(h.col, h.row, knownSet, discoveredSet));
            }
            if (vis <= 0) continue;
            const hullD = _hullPath(cluster, 22 + srand(cluster[0].col * 100 + cluster[0].row) * 8, cluster[0].col * 77 + cluster[0].row * 33);

            // Colored biome fill (subtle, blends with parchment)
            if (fillInfo) {
                regG.appendChild(_el('path', {
                    d: hullD, fill: fillInfo.fill,
                    'fill-opacity': fillInfo.op * vis,
                    stroke: 'none',
                }));
            }
            // Ink boundary line (thin, dashed) — skip for plains
            if (!isPlains) {
                regG.appendChild(_el('path', {
                    d: hullD, fill: 'none',
                    stroke: INK_DARK, 'stroke-width': 0.5,
                    'stroke-opacity': vis * 0.18,
                    'stroke-dasharray': '4 6',
                }));
            }
        }
    }
    svg.appendChild(regG);
}

// ══════════════════════════════════════════════════════════
// TERRAIN DETAILS — Hand-drawn ink symbols per biome
// ══════════════════════════════════════════════════════════

function renderTerrainDetails(svg, fogState) {
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);
    const tG = _el('g', { class: 'terrain-illust', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    const allHexes = [...TERRAIN_HEXES, ..._buildAutoFillHexes()];
    const regions = _buildBiomeRegions(allHexes);

    for (const [biome, clusters] of Object.entries(regions)) {
        for (const cluster of clusters) {
            cluster.sort((a, b) => a.row - b.row || a.col - b.col);
            let totalVis = 0;
            for (const h of cluster) {
                h.vis = _hexVisibility(h.col, h.row, knownSet, discoveredSet);
                totalVis += h.vis;
            }
            if (totalVis <= 0) continue;
            const avgVis = totalVis / cluster.length;
            const g = _el('g', { opacity: Math.min(1, avgVis * 1.1) });

            if (biome === 'mountain') _drawMountains(g, cluster);
            else if (biome === 'forest') _drawForest(g, cluster);
            else if (biome === 'snow') _drawSnow(g, cluster);
            else if (biome === 'swamp') _drawSwamp(g, cluster);
            else if (biome === 'desert') _drawDesert(g, cluster);
            else if (biome === 'volcanic') _drawVolcanic(g, cluster);
            else if (biome === 'cave') _drawCave(g, cluster);
            else if (biome === 'graveyard') _drawGraveyard(g, cluster);
            else _drawGrassland(g, cluster);

            tG.appendChild(g);
        }
    }
    svg.appendChild(tG);
}

// ══════════════════════════════════════════════════════════
// MOUNTAINS — Filled solid bodies, varied sizes/shapes
// ══════════════════════════════════════════════════════════

function _drawMountains(g, cluster) {
    const peaks = [];
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        const count = 2 + Math.floor(srand(seed) * 2); // 2-3 peaks per hex (less dense)
        for (let i = 0; i < count; i++) {
            const isBig = i === Math.floor(count / 2);
            const sizeRoll = srand(seed + i * 10 + 99);
            let height, width;
            if (isBig) {
                height = 22 + srand(seed+i*10+1) * 12; // 22-34
                width = 10 + srand(seed+i*10+2) * 5;   // 10-15
            } else if (sizeRoll > 0.5) {
                height = 14 + srand(seed+i*10+1) * 10;  // 14-24
                width = 7 + srand(seed+i*10+2) * 4;
            } else {
                height = 8 + srand(seed+i*10+1) * 8;    // 8-16
                width = 5 + srand(seed+i*10+2) * 3;
            }
            // Vary shape: 0=sharp, 1=rounded, 2=flat-top
            const typeRand = srand(seed + i * 10 + 88);
            const type = typeRand < 0.4 ? 0 : typeRand < 0.7 ? 1 : 2;
            peaks.push({
                x: h.x + (i - (count-1)/2) * 18 + (srand(seed+i*10)-0.5) * 5, // wider spacing (18px)
                y: h.y + (srand(seed+i*10+5)-0.5) * 5,
                h: height, w: width,
                seed: seed + i * 10, type,
            });
        }
    }
    // Sort back-to-front (farther peaks drawn first, closer peaks on top)
    peaks.sort((a, b) => (a.y - a.h * 0.5) - (b.y - b.h * 0.5));

    for (const p of peaks) {
        const by = p.y + 4, ty = p.y + 4 - p.h;
        const lx = p.x - p.w, rx = p.x + p.w;
        const jit = (srand(p.seed + 77) - 0.5) * 1.5;
        const peakX = p.x + jit;

        if (p.type === 1) {
            // ── ROUNDED/DOME mountain ──
            g.appendChild(_el('path', {
                d: `M${lx},${by} Q${lx - p.w*0.05},${ty + p.h*0.12} ${peakX},${ty} Q${rx + p.w*0.05},${ty + p.h*0.12} ${rx},${by} Z`,
                fill: INK_DARK, 'fill-opacity': 0.07,
            }));
            g.appendChild(_el('path', {
                d: `M${lx},${by} Q${lx - p.w*0.05},${ty + p.h*0.12} ${peakX},${ty} L${peakX},${by} Z`,
                fill: INK_DARK, 'fill-opacity': 0.18,
            }));
            g.appendChild(_el('path', {
                d: `M${lx},${by} Q${lx - p.w*0.05},${ty + p.h*0.12} ${peakX},${ty} Q${rx + p.w*0.05},${ty + p.h*0.12} ${rx},${by}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.6, 'stroke-linecap': 'round', 'stroke-opacity': 0.65,
            }));
            // 2-3 contour lines only on shadow side (subtle, not noisy)
            for (let j = 0; j < 3; j++) {
                const t = 0.35 + j * 0.18;
                const cy = ty + p.h * t;
                const cw = p.w * t * 0.55;
                g.appendChild(_el('path', {
                    d: `M${peakX - cw},${cy} Q${peakX - cw*0.3},${cy - 0.8} ${peakX},${cy + 0.3}`,
                    fill: 'none', stroke: INK_DARK, 'stroke-width': 0.18, 'stroke-opacity': 0.2 - j*0.04,
                }));
            }
        } else if (p.type === 2) {
            // ── FLAT-TOP/MESA mountain ──
            const flatW = p.w * (0.3 + srand(p.seed + 88) * 0.15);
            const flatL = peakX - flatW, flatR = peakX + flatW;
            g.appendChild(_el('polygon', {
                points: `${lx},${by} ${flatL},${ty} ${flatR},${ty} ${rx},${by}`,
                fill: INK_DARK, 'fill-opacity': 0.07,
            }));
            g.appendChild(_el('polygon', {
                points: `${lx},${by} ${flatL},${ty} ${peakX},${ty} ${peakX},${by}`,
                fill: INK_DARK, 'fill-opacity': 0.2,
            }));
            g.appendChild(_el('path', {
                d: `M${lx},${by} L${flatL},${ty} L${flatR},${ty} L${rx},${by}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.55, 'stroke-linecap': 'round', 'stroke-opacity': 0.65,
            }));
            // 2 strata lines (fewer = cleaner)
            for (let j = 0; j < 2; j++) {
                const t = 0.3 + j * 0.25;
                const sy = by + (ty - by) * t;
                const slx = lx + (flatL - lx) * t;
                g.appendChild(_el('line', {
                    x1: slx + 1, y1: sy, x2: peakX - 1, y2: sy,
                    stroke: INK_DARK, 'stroke-width': 0.18, 'stroke-opacity': 0.18,
                }));
            }
        } else {
            // ── SHARP PEAK (classic triangular) ──
            g.appendChild(_el('polygon', {
                points: `${lx},${by} ${peakX},${ty} ${rx},${by}`,
                fill: INK_DARK, 'fill-opacity': 0.08,
            }));
            g.appendChild(_el('polygon', {
                points: `${lx},${by} ${peakX},${ty} ${peakX},${by}`,
                fill: INK_DARK, 'fill-opacity': 0.22,
            }));
            g.appendChild(_el('line', { x1: lx, y1: by, x2: peakX, y2: ty,
                stroke: INK_DARK, 'stroke-width': 0.65, 'stroke-linecap': 'round', 'stroke-opacity': 0.7 }));
            g.appendChild(_el('line', { x1: peakX, y1: ty, x2: rx, y2: by,
                stroke: INK_DARK, 'stroke-width': 0.4, 'stroke-linecap': 'round', 'stroke-opacity': 0.6 }));
            // 3-4 hatching lines (clean, not overlapping)
            const hatchCount = 3 + Math.floor(srand(p.seed + 50) * 2);
            for (let j = 0; j < hatchCount; j++) {
                const t = 0.2 + j * (0.6 / hatchCount);
                const hx = lx + (peakX - lx) * t;
                const hy = by + (ty - by) * t;
                const hLen = p.h * 0.09;
                g.appendChild(_el('line', {
                    x1: hx, y1: hy, x2: hx + hLen * 0.35, y2: hy + hLen,
                    stroke: INK_DARK, 'stroke-width': 0.2, 'stroke-opacity': 0.22,
                }));
            }
        }
    }
}

// ══════════════════════════════════════════════════════════
// FOREST — Individual tree symbols (trunk + canopy outline)
// ══════════════════════════════════════════════════════════

function _drawForest(g, cluster) {
    const trees = [];
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        const count = 7 + Math.floor(srand(seed) * 5); // 7-11 trees per hex (denser)
        for (let i = 0; i < count; i++) {
            const szRoll = srand(seed+i*13+1);
            trees.push({
                x: h.x + (srand(seed+i*13)-0.5) * 34,
                y: h.y + (srand(seed+i*13+5)-0.5) * 22,
                sz: 2.5 + szRoll * 4.5, // 2.5-7 range for variety
                type: srand(seed+i*13+2) < 0.5 ? 'round' : 'conifer',
                seed: seed + i * 13,
            });
        }
    }
    trees.sort((a, b) => a.y - b.y); // back-to-front

    for (const t of trees) {
        const trunkH = t.sz * 1.8;
        const trunkLean = (srand(t.seed+99)-0.5) * 1.2;

        if (t.type === 'round') {
            const cy = t.y + 2 - trunkH - t.sz * 0.2;
            const cx = t.x + trunkLean;
            // Solid filled canopy (base to occlude things behind + pencil shading)
            g.appendChild(_el('circle', {
                cx, cy, r: t.sz + 0.5,
                fill: INK_DARK, 'fill-opacity': 0.12,
            }));
            // Dark fill for canopy body
            g.appendChild(_el('circle', {
                cx, cy, r: t.sz,
                fill: INK_DARK, 'fill-opacity': 0.2,
                stroke: INK_DARK, 'stroke-width': 0.45, 'stroke-opacity': 0.55,
            }));
            // Shadow crescent (right half darker)
            g.appendChild(_el('path', {
                d: `M${cx + t.sz * 0.1},${cy - t.sz * 0.8} A${t.sz * 0.9},${t.sz * 0.9} 0 0 1 ${cx + t.sz * 0.1},${cy + t.sz * 0.8}`,
                fill: INK_DARK, 'fill-opacity': 0.08, stroke: 'none',
            }));
            // Leaf cluster bumps on outline
            const bumpCount = 4 + Math.floor(srand(t.seed + 140) * 3);
            for (let b = 0; b < bumpCount; b++) {
                const ba = (b / bumpCount) * Math.PI * 2 + srand(t.seed + b * 11) * 0.6;
                const bx = cx + Math.cos(ba) * t.sz * 0.65;
                const by2 = cy + Math.sin(ba) * t.sz * 0.65;
                const bsz = t.sz * (0.3 + srand(t.seed + b * 11 + 2) * 0.2);
                g.appendChild(_el('circle', {
                    cx: bx, cy: by2, r: bsz,
                    fill: INK_DARK, 'fill-opacity': 0.03,
                    stroke: INK_DARK, 'stroke-width': 0.18, 'stroke-opacity': 0.2,
                }));
            }
            // Trunk (drawn after canopy so it shows below)
            g.appendChild(_el('line', {
                x1: t.x, y1: t.y + 2,
                x2: cx, y2: cy + t.sz * 0.7,
                stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': 0.6, 'stroke-linecap': 'round',
            }));
        } else {
            // Conifer — filled triangular tiers
            const topX = t.x + trunkLean;
            const topY = t.y + 2 - trunkH - t.sz * 1.2;
            const tiers = 2 + Math.floor(srand(t.seed + 160) * 2);
            // Trunk first (behind tiers)
            g.appendChild(_el('line', {
                x1: topX, y1: topY + tiers * t.sz * 0.7 + 2,
                x2: t.x, y2: t.y + 2,
                stroke: INK_DARK, 'stroke-width': 0.45, 'stroke-opacity': 0.55,
            }));
            for (let ti = 0; ti < tiers; ti++) {
                const tierTop = topY + ti * t.sz * 0.5;
                const tierBot = topY + (ti + 1) * t.sz * 0.7;
                const tierW = t.sz * (0.35 + ti * 0.3);
                // Opaque parchment base (occludes things behind)
                g.appendChild(_el('polygon', {
                    points: `${topX},${tierTop} ${topX-tierW-1},${tierBot+1} ${topX+tierW+1},${tierBot+1}`,
                    fill: INK_DARK, 'fill-opacity': 0.05, stroke: 'none',
                }));
                // Dark filled tier
                g.appendChild(_el('polygon', {
                    points: `${topX},${tierTop} ${topX-tierW},${tierBot} ${topX+tierW},${tierBot}`,
                    fill: INK_DARK, 'fill-opacity': 0.15 + ti * 0.03,
                    stroke: INK_DARK, 'stroke-width': 0.35, 'stroke-opacity': 0.5,
                }));
                // Shadow on left half
                g.appendChild(_el('polygon', {
                    points: `${topX},${tierTop} ${topX-tierW},${tierBot} ${topX},${tierBot}`,
                    fill: INK_DARK, 'fill-opacity': 0.08,
                }));
            }
        }
    }
}

// ══════════════════════════════════════════════════════════
// SNOW — Frozen tundra: ice formations, frost crystals,
// cracked ice, snow drifts, frozen ground patterns
// ══════════════════════════════════════════════════════════

function _drawSnow(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;

        // Frozen ground — cracked ice pattern (irregular polygon cracks)
        for (let i = 0; i < 4; i++) {
            const cx = h.x + (srand(seed+i*31)-0.5)*28;
            const cy = h.y + (srand(seed+i*31+1)-0.5)*16;
            // Radial crack lines from center point
            const cracks = 3 + Math.floor(srand(seed+i*31+2)*3);
            for (let c = 0; c < cracks; c++) {
                const angle = (c / cracks) * Math.PI * 2 + (srand(seed+i*31+c*5)-0.5)*0.8;
                const len = 5 + srand(seed+i*31+c*5+1)*8;
                const midA = angle + (srand(seed+i*31+c*5+2)-0.5)*0.4;
                const mx = cx + Math.cos(midA) * len * 0.5;
                const my = cy + Math.sin(midA) * len * 0.5;
                const ex = cx + Math.cos(angle) * len;
                const ey = cy + Math.sin(angle) * len;
                g.appendChild(_el('path', {
                    d: `M${cx},${cy} Q${mx},${my} ${ex},${ey}`,
                    fill: 'none', stroke: INK_LIGHT, 'stroke-width': 0.4, 'stroke-opacity': 0.3,
                }));
            }
        }

        // Ice formations — small jagged crystals (not tall mountains)
        const crystalCount = 1 + Math.floor(srand(seed+50)*2);
        for (let i = 0; i < crystalCount; i++) {
            const ix = h.x + (srand(seed+i*17+60)-0.5)*20;
            const iy = h.y + (srand(seed+i*17+61)-0.5)*10;
            const ih = 6 + srand(seed+i*17+62)*6; // short! 6-12px
            const iw = 3 + srand(seed+i*17+63)*3;
            // Crystal body (irregular polygon — not a perfect triangle)
            const tipX = ix + (srand(seed+i*17+64)-0.5)*2;
            const tipY = iy - ih;
            const bl = ix - iw, br = ix + iw * 0.8;
            const midL = ix - iw * 0.6, midR = ix + iw * 0.4;
            const midY = iy - ih * 0.4;
            g.appendChild(_el('polygon', {
                points: `${bl},${iy} ${midL},${midY} ${tipX},${tipY} ${midR},${midY+1} ${br},${iy}`,
                fill: INK_LIGHT, 'fill-opacity': 0.14,
                stroke: INK_LIGHT, 'stroke-width': 0.5, 'stroke-opacity': 0.35,
            }));
            // Inner facet line
            g.appendChild(_el('line', { x1: tipX, y1: tipY, x2: ix, y2: iy,
                stroke: INK_LIGHT, 'stroke-width': 0.25, 'stroke-opacity': 0.2 }));
        }

        // Snow drifts — gentle rolling curves (wind-shaped)
        for (let i = 0; i < 4; i++) {
            const dx = h.x + (srand(seed+i*41)-0.5)*26;
            const dy = h.y + (srand(seed+i*41+1)-0.5)*14 + 2;
            const dw = 8 + srand(seed+i*41+2)*8;
            g.appendChild(_el('path', {
                d: `M${dx-dw},${dy} Q${dx-dw*0.3},${dy-2.5} ${dx},${dy-1} Q${dx+dw*0.4},${dy-3} ${dx+dw},${dy}`,
                fill: 'none', stroke: INK_LIGHT, 'stroke-width': 0.5, 'stroke-opacity': 0.25,
            }));
        }

        // Frost crystals — small 6-pointed star marks (snowflake hint)
        for (let i = 0; i < 5; i++) {
            const fx = h.x + (srand(seed+i*23+100)-0.5)*30;
            const fy = h.y + (srand(seed+i*23+101)-0.5)*18;
            const fr = 1.5 + srand(seed+i*23+102)*1.5;
            // 3 crossing lines = 6-pointed star
            for (let a = 0; a < 3; a++) {
                const angle = a * Math.PI / 3 + (srand(seed+i*23+a+103)-0.5)*0.2;
                g.appendChild(_el('line', {
                    x1: fx - Math.cos(angle)*fr, y1: fy - Math.sin(angle)*fr,
                    x2: fx + Math.cos(angle)*fr, y2: fy + Math.sin(angle)*fr,
                    stroke: INK_LIGHT, 'stroke-width': 0.3, 'stroke-opacity': 0.25,
                }));
            }
        }

        // Wind streaks (horizontal, suggesting blizzard)
        for (let i = 0; i < 3; i++) {
            const wx = h.x + (srand(seed+i*37+150)-0.5)*28;
            const wy = h.y + (srand(seed+i*37+151)-0.5)*16;
            const wl = 10 + srand(seed+i*37+152)*12;
            g.appendChild(_el('line', { x1: wx, y1: wy, x2: wx+wl, y2: wy-0.5,
                stroke: INK_LIGHT, 'stroke-width': 0.25, 'stroke-opacity': 0.18,
                'stroke-dasharray': '4 3' }));
        }

        // Sparse stipple (fallen snow particles)
        for (let i = 0; i < 8; i++) {
            const sx = h.x + (srand(seed+i*13+200)-0.5)*32;
            const sy = h.y + (srand(seed+i*13+201)-0.5)*18;
            g.appendChild(_el('circle', { cx: sx, cy: sy,
                r: 0.3 + srand(seed+i*13+202)*0.3,
                fill: INK_LIGHT, 'fill-opacity': 0.15 }));
        }
    }
}

// ── Swamp — Standing water pools, lily pads, cypress knees, hanging moss ──
function _drawSwamp(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;

        // Standing water pools (organic irregular shapes with dark fill)
        for (let p = 0; p < 3; p++) {
            const px = h.x + (srand(seed+p*31)-0.5)*22;
            const py = h.y + (srand(seed+p*31+1)-0.5)*12;
            const prx = 6 + srand(seed+p*31+2)*8;
            const pry = 3 + srand(seed+p*31+3)*4;
            // Organic blob outline for pool
            const poolPath = _organicBlob(px, py, prx, pry, seed+p*100, 7);
            g.appendChild(_el('path', { d: poolPath,
                fill: INK_DARK, 'fill-opacity': 0.12,
                stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.25 }));
            // Water ripple lines inside pool
            for (let r = 0; r < 2; r++) {
                const ry2 = py - 1 + r * 2.5;
                const rw = prx * (0.5 + srand(seed+p*31+r*7)*0.3);
                g.appendChild(_el('path', {
                    d: `M${px-rw},${ry2} Q${px},${ry2-1} ${px+rw},${ry2}`,
                    fill: 'none', stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.2,
                }));
            }
        }

        // Lily pads (small circles with a notch, floating on water)
        for (let i = 0; i < 5; i++) {
            const lx = h.x + (srand(seed+i*17+50)-0.5)*28;
            const ly = h.y + (srand(seed+i*17+51)-0.5)*14;
            const lr = 1.5 + srand(seed+i*17+52)*1.5;
            const notchAngle = srand(seed+i*17+53) * Math.PI * 2;
            // Pad circle with notch cut
            const startA = notchAngle + 0.3;
            const endA = notchAngle + Math.PI * 2 - 0.3;
            const x1 = lx + Math.cos(startA)*lr, y1 = ly + Math.sin(startA)*lr;
            const x2 = lx + Math.cos(endA)*lr, y2 = ly + Math.sin(endA)*lr;
            g.appendChild(_el('path', {
                d: `M${lx},${ly} L${x1},${y1} A${lr},${lr} 0 1 1 ${x2},${y2} Z`,
                fill: INK_DARK, 'fill-opacity': 0.14,
                stroke: INK_DARK, 'stroke-width': 0.25, 'stroke-opacity': 0.3,
            }));
            // Vein line on pad
            const vx = lx + Math.cos(notchAngle + Math.PI)*lr*0.7;
            const vy = ly + Math.sin(notchAngle + Math.PI)*lr*0.7;
            g.appendChild(_el('line', { x1: lx, y1: ly, x2: vx, y2: vy,
                stroke: INK_DARK, 'stroke-width': 0.15, 'stroke-opacity': 0.2 }));
        }

        // Cypress/mangrove stumps (gnarled root bases rising from water)
        for (let i = 0; i < 3; i++) {
            const cx = h.x + (srand(seed+i*23+70)-0.5)*30;
            const cy = h.y + (srand(seed+i*23+71)-0.5)*12;
            const th = 6 + srand(seed+i*23+72)*5;
            // Trunk (tapered, slightly curved)
            const lean = (srand(seed+i*23+73)-0.5)*2;
            g.appendChild(_el('path', {
                d: `M${cx-1.5},${cy+3} Q${cx-1+lean*0.3},${cy-th*0.3} ${cx+lean},${cy-th}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.6, 'stroke-opacity': 0.6, 'stroke-linecap': 'round',
            }));
            g.appendChild(_el('path', {
                d: `M${cx+1.5},${cy+3} Q${cx+1+lean*0.3},${cy-th*0.3} ${cx+lean},${cy-th}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.35, 'stroke-opacity': 0.5, 'stroke-linecap': 'round',
            }));
            // Buttress roots (2-3 flared lines spreading from base)
            for (let r = 0; r < 3; r++) {
                const rDir = (r - 1) * 3.5 + (srand(seed+i*23+r*5+80)-0.5)*2;
                g.appendChild(_el('path', {
                    d: `M${cx},${cy+2} Q${cx+rDir*0.5},${cy+3} ${cx+rDir},${cy+4}`,
                    fill: 'none', stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': 0.5,
                }));
            }
            // Hanging moss wisps (thin drooping curves from top)
            if (srand(seed+i*23+76) > 0.3) {
                for (let m = 0; m < 2; m++) {
                    const mx = cx + lean + (srand(seed+i*23+m*5+85)-0.5)*3;
                    const my = cy - th + 1;
                    const mLen = 3 + srand(seed+i*23+m*5+86)*3;
                    const mSway = (srand(seed+i*23+m*5+87)-0.5)*2;
                    g.appendChild(_el('path', {
                        d: `M${mx},${my} Q${mx+mSway},${my+mLen*0.6} ${mx+mSway*0.5},${my+mLen}`,
                        fill: 'none', stroke: INK, 'stroke-width': 0.25, 'stroke-opacity': 0.3,
                    }));
                }
            }
        }

        // Short marsh grass tufts (low, spreading — NOT tall reeds)
        for (let i = 0; i < 6; i++) {
            const gx = h.x + (srand(seed+i*13+100)-0.5)*30;
            const gy = h.y + (srand(seed+i*13+101)-0.5)*14;
            for (let b = 0; b < 4; b++) {
                const angle = -30 + b * 20 + (srand(seed+i*13+b+102)-0.5)*15;
                const bh = 2 + srand(seed+i*13+b+110)*2.5; // short!
                const rad = angle * Math.PI / 180;
                g.appendChild(_el('path', {
                    d: `M${gx},${gy} Q${gx+Math.sin(rad)*bh*0.5},${gy-bh*0.7} ${gx+Math.sin(rad)*bh},${gy-Math.cos(rad)*bh}`,
                    fill: 'none', stroke: INK_DARK, 'stroke-width': 0.35,
                    'stroke-opacity': 0.35, 'stroke-linecap': 'round',
                }));
            }
        }

        // Subtle fog/mist stipple (atmosphere)
        for (let i = 0; i < 10; i++) {
            const fx = h.x + (srand(seed+i*19+200)-0.5)*32;
            const fy = h.y + (srand(seed+i*19+201)-0.5)*18;
            g.appendChild(_el('circle', { cx: fx, cy: fy,
                r: 0.3 + srand(seed+i*19+202)*0.4,
                fill: INK, 'fill-opacity': 0.08 + srand(seed+i*19+203)*0.06 }));
        }
    }
}

// ── Desert — Crescent dunes with shading + stipple + wind marks ──
function _drawDesert(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        // Crescent dune curves (bolder, with shadow side)
        for (let d = 0; d < 4; d++) {
            const dy = -8 + d * 5, dOx = (srand(seed+d*17)-0.5)*10;
            const duneW = 16 + srand(seed+d*17+1)*8;
            // Main dune curve
            g.appendChild(_el('path', {
                d: `M${h.x-duneW+dOx},${h.y+dy+3} Q${h.x+dOx},${h.y+dy-5} ${h.x+duneW+dOx},${h.y+dy+3}`,
                fill: 'none', stroke: INK, 'stroke-width': 0.7, 'stroke-opacity': 0.4,
            }));
            // Shadow hatching under dune (3-4 parallel arcs)
            for (let s = 0; s < 3; s++) {
                const sOff = 1.5 + s * 1.2;
                g.appendChild(_el('path', {
                    d: `M${h.x-duneW*0.7+dOx},${h.y+dy+3+sOff} Q${h.x+dOx},${h.y+dy-2+sOff} ${h.x+duneW*0.7+dOx},${h.y+dy+3+sOff}`,
                    fill: 'none', stroke: INK, 'stroke-width': 0.25, 'stroke-opacity': 0.2 - s*0.04,
                }));
            }
        }
        // Sand stipple dots (denser)
        for (let i = 0; i < 18; i++) {
            const sx = h.x + (srand(seed+i*5)-0.5)*32;
            const sy = h.y + (srand(seed+i*5+3)-0.5)*18;
            g.appendChild(_el('circle', { cx: sx, cy: sy, r: 0.35 + srand(seed+i*5+4)*0.3,
                fill: INK, 'fill-opacity': 0.12 + srand(seed+i*5+5)*0.1 }));
        }
        // Wind streaks
        for (let i = 0; i < 3; i++) {
            const wx = h.x + (srand(seed+i*19)-0.5)*28;
            const wy = h.y + (srand(seed+i*19+1)-0.5)*14;
            const wl = 8 + srand(seed+i*19+2)*10;
            g.appendChild(_el('line', { x1: wx, y1: wy, x2: wx+wl, y2: wy-0.5,
                stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.15, 'stroke-dasharray': '3 2' }));
        }
    }
}

// ── Volcanic — Mountain peak + crater + lava flows + smoke ──
function _drawVolcanic(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        const jx = (srand(seed)-0.5)*4;
        const ht = 22 + srand(seed+1)*12, w = 14 + srand(seed+2)*6;
        const px = h.x+jx, by = h.y+6, ty = by - ht;
        // Shadow fill
        g.appendChild(_el('polygon', {
            points: `${px-w},${by} ${px-2},${ty} ${px-2},${by}`,
            fill: INK_DARK, 'fill-opacity': 0.15,
        }));
        // Slopes
        g.appendChild(_el('line', { x1: px-w, y1: by, x2: px-2, y2: ty,
            stroke: INK_DARK, 'stroke-width': 0.7, 'stroke-opacity': 0.65, 'stroke-linecap': 'round' }));
        g.appendChild(_el('line', { x1: px+2, y1: ty, x2: px+w, y2: by,
            stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': 0.55, 'stroke-linecap': 'round' }));
        // Crater opening (concave arc)
        g.appendChild(_el('path', {
            d: `M${px-4},${ty+1} Q${px},${ty+4} ${px+4},${ty+1}`,
            fill: INK_DARK, 'fill-opacity': 0.2,
            stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': 0.6 }));
        // Dense left hatching
        for (let j = 0; j < 8; j++) {
            const t = 0.1 + j * 0.1;
            const hx = (px-w) + (px-2 - (px-w)) * t;
            const hy = by + (ty - by) * t;
            const hLen = ht * 0.12;
            g.appendChild(_el('line', { x1: hx, y1: hy, x2: hx+hLen*0.4, y2: hy+hLen,
                stroke: INK_DARK, 'stroke-width': 0.2, 'stroke-opacity': 0.28 }));
        }
        // Lava flow lines (wavy descending from crater)
        for (let i = 0; i < 2; i++) {
            const side = i === 0 ? -1 : 1;
            const lx = px + side * 2;
            g.appendChild(_el('path', {
                d: `M${lx},${ty+3} Q${lx+side*5},${ty+ht*0.3} ${lx+side*3},${ty+ht*0.5} Q${lx+side*7},${ty+ht*0.7} ${lx+side*4},${by-2}`,
                fill: 'none', stroke: INK, 'stroke-width': 0.5, 'stroke-opacity': 0.3,
            }));
        }
        // Smoke wisps (bolder, more dramatic)
        for (let i = 0; i < 4; i++) {
            const sx = px + (srand(seed+i*3)-0.5)*5;
            const sh = 10 + i * 6;
            const wobble = 3 + i * 2;
            g.appendChild(_el('path', {
                d: `M${sx},${ty} Q${sx+wobble},${ty-sh*0.3} ${sx-wobble*0.5},${ty-sh*0.6} Q${sx+wobble*0.8},${ty-sh*0.8} ${sx-wobble*0.3},${ty-sh}`,
                fill: 'none', stroke: INK, 'stroke-width': 0.5 - i*0.08, 'stroke-opacity': 0.25 - i*0.04,
            }));
        }
    }
}

// ── Cave — Rocky ground with scattered boulders, dark crevices, sparse entrance ──
function _drawCave(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;

        // Scattered boulders (irregular rounded shapes, not arches)
        for (let i = 0; i < 4; i++) {
            const bx = h.x + (srand(seed+i*7)-0.5)*28;
            const by = h.y + (srand(seed+i*7+3)-0.5)*14;
            const bsz = 3 + srand(seed+i*7+1)*4;
            const bPath = _organicBlob(bx, by, bsz, bsz * 0.7, seed+i*100, 6);
            g.appendChild(_el('path', { d: bPath,
                fill: INK_DARK, 'fill-opacity': 0.12,
                stroke: INK_DARK, 'stroke-width': 0.3, 'stroke-opacity': 0.28 }));
            // Shadow crescent on one side
            g.appendChild(_el('path', {
                d: `M${bx},${by-bsz*0.4} A${bsz*0.5},${bsz*0.5} 0 0 1 ${bx},${by+bsz*0.4}`,
                fill: INK_DARK, 'fill-opacity': 0.12, stroke: 'none',
            }));
        }

        // Ground crevice lines (dark cracks in rock)
        for (let i = 0; i < 3; i++) {
            const cx = h.x + (srand(seed+i*19+40)-0.5)*26;
            const cy = h.y + (srand(seed+i*19+41)-0.5)*12;
            const cLen = 6 + srand(seed+i*19+42)*8;
            const cAngle = (srand(seed+i*19+43)-0.5)*1.2;
            const ex = cx + Math.cos(cAngle)*cLen;
            const ey = cy + Math.sin(cAngle)*cLen;
            const mx = (cx+ex)/2 + (srand(seed+i*19+44)-0.5)*3;
            const my = (cy+ey)/2 + (srand(seed+i*19+45)-0.5)*2;
            g.appendChild(_el('path', {
                d: `M${cx},${cy} Q${mx},${my} ${ex},${ey}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': 0.35,
            }));
        }

        // Dense stipple (rocky ground texture)
        for (let i = 0; i < 16; i++) {
            const sx = h.x + (srand(seed+i*11)-0.5)*30;
            const sy = h.y + (srand(seed+i*11+3)-0.5)*16;
            g.appendChild(_el('circle', { cx: sx, cy: sy,
                r: 0.35 + srand(seed+i*11+1)*0.4,
                fill: INK_DARK, 'fill-opacity': 0.15 + srand(seed+i*11+2)*0.1 }));
        }

        // One cave entrance per hex (not every hex — only 60%)
        if (srand(seed+55) > 0.4) {
            const eW = 7 + srand(seed+56)*3;
            const eH = 5 + srand(seed+57)*3;
            const ex = h.x + (srand(seed+58)-0.5)*8;
            const ey = h.y + (srand(seed+59)-0.5)*4;
            // Dark filled entrance
            g.appendChild(_el('path', {
                d: `M${ex-eW},${ey+3} Q${ex-eW},${ey-eH} ${ex},${ey-eH-2} Q${ex+eW},${ey-eH} ${ex+eW},${ey+3}`,
                fill: INK_DARK, 'fill-opacity': 0.12,
                stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': 0.55,
            }));
            // Stalactites (3 thin lines hanging down)
            for (let j = 0; j < 3; j++) {
                const sx = ex + (j-1)*3 + (srand(seed+j*5+90)-0.5)*1.5;
                const sTop = ey - eH + Math.abs(j-1)*1.5;
                const sLen = 1.5 + srand(seed+j*5+91)*2;
                g.appendChild(_el('line', { x1: sx, y1: sTop, x2: sx, y2: sTop+sLen,
                    stroke: INK_DARK, 'stroke-width': 0.35, 'stroke-opacity': 0.4 }));
            }
        }
    }
}

// ── Graveyard — Tombstones + crosses + dead trees + fog ──
function _drawGraveyard(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        // Ground mounds (low bumps — spaced out)
        for (let i = 0; i < 2; i++) {
            const mx = h.x + (i === 0 ? -12 : 10) + (srand(seed+i*13)-0.5)*6;
            const my = h.y + 6 + srand(seed+i*13+1)*3;
            g.appendChild(_el('path', {
                d: `M${mx-5},${my} Q${mx},${my-2.5} ${mx+5},${my}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.4, 'stroke-opacity': 0.25,
            }));
        }
        // Graves — fewer, well-spaced using grid positions
        const graves = [
            [-14, -6], [0, -8], [14, -4],  // top row
            [-10, 4], [8, 6],               // bottom row
        ];
        for (let i = 0; i < graves.length; i++) {
            const [gox, goy] = graves[i];
            const tx = h.x + gox + (srand(seed+i*9)-0.5)*4;
            const ty = h.y + goy + (srand(seed+i*9+3)-0.5)*3;
            const th = 7 + srand(seed+i*9+1)*4;
            const tw = 2.5 + srand(seed+i*9+2)*1.5;
            const tilt = (srand(seed+i*9+5)-0.5)*8;
            if (i < 3) {
                // Tombstone
                g.appendChild(_el('path', {
                    d: `M${tx-tw},${ty+2} L${tx-tw},${ty-th+2} Q${tx},${ty-th-2} ${tx+tw},${ty-th+2} L${tx+tw},${ty+2} Z`,
                    fill: INK_DARK, 'fill-opacity': 0.12,
                    stroke: INK_DARK, 'stroke-width': 0.45, 'stroke-opacity': 0.55,
                    transform: `rotate(${tilt}, ${tx}, ${ty})`,
                }));
            } else {
                // Cross
                g.appendChild(_el('line', { x1: tx, y1: ty+2, x2: tx, y2: ty-th,
                    stroke: INK_DARK, 'stroke-width': 0.6, 'stroke-opacity': 0.6,
                    transform: `rotate(${tilt}, ${tx}, ${ty})` }));
                g.appendChild(_el('line', { x1: tx-tw-1, y1: ty-th*0.5, x2: tx+tw+1, y2: ty-th*0.5,
                    stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': 0.55,
                    transform: `rotate(${tilt}, ${tx}, ${ty})` }));
            }
        }
        // Dead tree (one per hex, offset to side)
        if (srand(seed + 60) > 0.3) {
            const dtx = h.x + 16 + (srand(seed+61)-0.5)*4;
            const dty = h.y - 2;
            g.appendChild(_el('line', { x1: dtx, y1: dty+3, x2: dtx-0.5, y2: dty-14,
                stroke: INK_DARK, 'stroke-width': 0.6, 'stroke-opacity': 0.55, 'stroke-linecap': 'round' }));
            const branches = [[dty-11, 6, -3], [dty-8, -5, -4], [dty-5, 4, -2]];
            for (const [by, bx, bey] of branches) {
                g.appendChild(_el('line', { x1: dtx, y1: by, x2: dtx+bx, y2: by+bey,
                    stroke: INK_DARK, 'stroke-width': 0.45 + srand(seed+by)*0.25 }));
            }
        }
    }
}

// ── Grassland — Curved grass blades ──
function _drawGrassland(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        for (let i = 0; i < 8; i++) {
            const gx = h.x + (srand(seed+i*5)-0.5)*32;
            const gy = h.y + (srand(seed+i*5+2)-0.5)*16;
            for (let b = 0; b < 3; b++) {
                const angle = -20 + b * 18 + (srand(seed+i*5+b)-0.5)*12;
                const bh = 4 + srand(seed+i*5+b+10)*4;
                const rad = angle * Math.PI / 180;
                g.appendChild(_el('path', {
                    d: `M${gx},${gy} Q${gx+Math.sin(rad)*bh*0.5},${gy-bh*0.7} ${gx+Math.sin(rad)*bh},${gy-Math.cos(rad)*bh}`,
                    fill: 'none', stroke: INK, 'stroke-width': 0.3,
                    'stroke-opacity': 0.22, 'stroke-linecap': 'round',
                }));
            }
        }
    }
}

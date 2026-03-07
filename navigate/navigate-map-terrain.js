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
        // Tiny stipple dots (undergrowth)
        for (let i = 0; i < 4; i++) {
            const bx = x + (srand(seed+i*7)-0.5)*HEX_W, by = y + (srand(seed+i*7+3)-0.5)*ROW_H;
            els.push(_el('circle', { cx: bx, cy: by, r: 0.5,
                fill: INK_DARK, 'fill-opacity': 0.12 }));
        }
    } else if (biome === 'mountain' || biome === 'cave') {
        // Small chevron marks ^
        for (let i = 0; i < 3; i++) {
            const rx = x + (srand(seed+i*9)-0.5)*HEX_W, ry = y + (srand(seed+i*9+3)-0.5)*ROW_H;
            const sz = 2 + srand(seed+i*9+1) * 1.5;
            els.push(_el('path', { d: `M${rx-sz},${ry+sz*0.5} L${rx},${ry-sz*0.5} L${rx+sz},${ry+sz*0.5}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.3, 'stroke-opacity': 0.15 }));
        }
    } else if (biome === 'snow') {
        // Nearly empty — snow = blank parchment. Just 1-2 tiny dots
        if (srand(seed) > 0.6) {
            els.push(_el('circle', { cx: x + (srand(seed+1)-0.5)*HEX_W, cy: y + (srand(seed+2)-0.5)*ROW_H,
                r: 0.4, fill: INK_LIGHT, 'fill-opacity': 0.08 }));
        }
    } else if (biome === 'desert') {
        // Horizontal dash marks (wind)
        for (let i = 0; i < 3; i++) {
            const dx = x + (srand(seed+i*6)-0.5)*HEX_W, dy = y + (srand(seed+i*6+3)-0.5)*ROW_H;
            const wl = 4 + srand(seed+i*6+1) * 5;
            els.push(_el('line', { x1: dx, y1: dy, x2: dx+wl, y2: dy - 0.3,
                stroke: INK, 'stroke-width': 0.25, 'stroke-opacity': 0.12, 'stroke-dasharray': '2 2' }));
        }
    } else if (biome === 'swamp') {
        // Wavy water lines
        if (srand(seed+500) > 0.35) {
            const wx = x + (srand(seed+501)-0.5)*20, wy = y + (srand(seed+502)-0.5)*12;
            els.push(_el('path', { d: `M${wx-6},${wy} Q${wx},${wy-2} ${wx+6},${wy}`,
                fill: 'none', stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.12 }));
        }
    } else if (biome === 'volcanic') {
        // Tiny dark dots (ash)
        for (let i = 0; i < 2; i++) {
            const vx = x + (srand(seed+i*8)-0.5)*HEX_W, vy = y + (srand(seed+i*8+3)-0.5)*ROW_H;
            els.push(_el('circle', { cx: vx, cy: vy, r: 0.4,
                fill: INK_DARK, 'fill-opacity': 0.10 }));
        }
    } else {
        // Plains — grass blade strokes
        for (let i = 0; i < 3; i++) {
            const gx = x + (srand(seed+i*7)-0.5)*HEX_W, gy = y + (srand(seed+i*7+3)-0.5)*ROW_H;
            const a = (srand(seed+i*7+5)-0.5)*50*Math.PI/180, l = 3+srand(seed+i*7+1)*3;
            els.push(_el('line', { x1: gx, y1: gy, x2: gx+Math.sin(a)*l, y2: gy-Math.cos(a)*l,
                stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.18, 'stroke-linecap': 'round' }));
        }
    }
    return els;
}

// ══════════════════════════════════════════════════════════
// TERRAIN REGIONS — Ink boundary lines only (no colored fills)
// ══════════════════════════════════════════════════════════

function renderTerrainRegions(svg, fogState) {
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);
    const regG = _el('g', { class: 'terrain-regions', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    const allHexes = [...TERRAIN_HEXES, ..._buildAutoFillHexes()];
    const regions = _buildBiomeRegions(allHexes);

    // Draw thin dashed ink boundary around each biome region
    for (const [biome, clusters] of Object.entries(regions)) {
        if (biome === 'plains') continue; // Plains don't need boundaries
        for (const cluster of clusters) {
            if (cluster.length < 3) continue; // Skip tiny regions
            let vis = 0;
            for (const h of cluster) {
                vis = Math.max(vis, _hexVisibility(h.col, h.row, knownSet, discoveredSet));
            }
            if (vis <= 0) continue;
            const hullD = _hullPath(cluster, 20 + srand(cluster[0].col * 100 + cluster[0].row) * 8, cluster[0].col * 77 + cluster[0].row * 33);
            regG.appendChild(_el('path', {
                d: hullD, fill: 'none',
                stroke: INK_DARK, 'stroke-width': 0.4,
                'stroke-opacity': vis * 0.12,
                'stroke-dasharray': '4 6',
            }));
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
// MOUNTAINS — Triangular peaks with left-side hatching
// ══════════════════════════════════════════════════════════

function _drawMountains(g, cluster) {
    const peaks = [];
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        const count = 2 + Math.floor(srand(seed) * 3);
        for (let i = 0; i < count; i++) {
            peaks.push({
                x: h.x + (i - (count-1)/2) * 14 + (srand(seed+i*10)-0.5) * 6,
                y: h.y + (srand(seed+i*10+5)-0.5) * 8,
                h: 14 + srand(seed+i*10+1) * 18,
                w: 8 + srand(seed+i*10+2) * 6,
                seed: seed + i * 10,
            });
        }
    }
    peaks.sort((a, b) => a.y - b.y); // Back-to-front

    // Ridge line connecting adjacent peaks in same cluster
    if (cluster.length >= 2) {
        let ridgeD = '';
        const sorted = [...cluster].sort((a, b) => a.col - b.col);
        for (let i = 0; i < sorted.length; i++) {
            const h = sorted[i];
            if (i === 0) ridgeD = `M${h.x},${h.y - 8}`;
            else {
                const prev = sorted[i-1];
                const mx = (prev.x + h.x) / 2 + (srand(h.col * 50 + h.row) - 0.5) * 10;
                const my = Math.min(prev.y, h.y) - 12 + (srand(h.col * 51 + h.row) - 0.5) * 6;
                ridgeD += ` Q${mx},${my} ${h.x},${h.y - 8}`;
            }
        }
        g.appendChild(_el('path', { d: ridgeD, fill: 'none', stroke: INK_DARK,
            'stroke-width': 0.4, 'stroke-opacity': 0.15, 'stroke-linecap': 'round' }));
    }

    for (const p of peaks) {
        const by = p.y + 4, ty = p.y - p.h;
        const lx = p.x - p.w, rx = p.x + p.w;
        const jit = (srand(p.seed + 77) - 0.5) * 2;

        // Left slope
        g.appendChild(_el('line', { x1: lx, y1: by, x2: p.x + jit, y2: ty,
            stroke: INK_DARK, 'stroke-width': 0.9, 'stroke-linecap': 'round' }));
        // Right slope (slightly thinner — light side)
        g.appendChild(_el('line', { x1: p.x + jit, y1: ty, x2: rx, y2: by,
            stroke: INK_DARK, 'stroke-width': 0.7, 'stroke-linecap': 'round' }));

        // Left-face hatching (4-5 diagonal lines)
        const hatchCount = 4 + Math.floor(srand(p.seed + 50) * 2);
        for (let j = 0; j < hatchCount; j++) {
            const t = 0.15 + j * (0.7 / hatchCount);
            // Interpolate along left slope
            const hx = lx + (p.x + jit - lx) * t;
            const hy = by + (ty - by) * t;
            const hLen = p.h * 0.12 * (1 - t * 0.3);
            g.appendChild(_el('line', {
                x1: hx, y1: hy,
                x2: hx + hLen * 0.4, y2: hy + hLen,
                stroke: INK_DARK, 'stroke-width': 0.35,
                'stroke-opacity': 0.45 * (1 - t * 0.2),
            }));
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
        const count = 5 + Math.floor(srand(seed) * 3);
        for (let i = 0; i < count; i++) {
            trees.push({
                x: h.x + (srand(seed+i*13)-0.5) * 32,
                y: h.y + (srand(seed+i*13+5)-0.5) * 20,
                sz: 3 + srand(seed+i*13+1) * 3,
                type: srand(seed+i*13+2) < 0.6 ? 'round' : 'conifer',
                seed: seed + i * 13,
            });
        }
    }
    trees.sort((a, b) => a.y - b.y); // Back-to-front

    for (const t of trees) {
        const trunkH = t.sz * 1.8;
        // Trunk
        g.appendChild(_el('line', {
            x1: t.x, y1: t.y + 2,
            x2: t.x + (srand(t.seed+99)-0.5)*0.8, y2: t.y + 2 - trunkH,
            stroke: INK_DARK, 'stroke-width': 0.7, 'stroke-linecap': 'round',
        }));

        if (t.type === 'round') {
            // Round canopy (stroke only — ink outline)
            const cy = t.y + 2 - trunkH - t.sz * 0.4;
            g.appendChild(_el('circle', {
                cx: t.x, cy,
                r: t.sz,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.6,
            }));
            // Optional: tiny highlight arc
            if (srand(t.seed + 200) > 0.5) {
                const arcR = t.sz * 0.6;
                g.appendChild(_el('path', {
                    d: `M${t.x - arcR},${cy - arcR * 0.3} A${arcR},${arcR} 0 0 1 ${t.x + arcR * 0.3},${cy - arcR}`,
                    fill: 'none', stroke: INK_DARK, 'stroke-width': 0.3, 'stroke-opacity': 0.3,
                }));
            }
        } else {
            // Conifer — two angled lines forming a triangle
            const topY = t.y + 2 - trunkH - t.sz * 1.2;
            const baseW = t.sz * 0.9;
            g.appendChild(_el('line', {
                x1: t.x - baseW, y1: t.y + 2 - trunkH + 1,
                x2: t.x, y2: topY,
                stroke: INK_DARK, 'stroke-width': 0.5,
            }));
            g.appendChild(_el('line', {
                x1: t.x, y1: topY,
                x2: t.x + baseW, y2: t.y + 2 - trunkH + 1,
                stroke: INK_DARK, 'stroke-width': 0.5,
            }));
        }
    }
}

// ══════════════════════════════════════════════════════════
// SNOW — Mountain peaks with stipple dots (snow)
// ══════════════════════════════════════════════════════════

function _drawSnow(g, cluster) {
    // Draw peaks (same style as mountains but lighter)
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        const count = 2 + Math.floor(srand(seed) * 2);
        for (let i = 0; i < count; i++) {
            const ox = (i-(count-1)/2)*16 + (srand(seed+i*11)-0.5)*6;
            const ht = 16 + srand(seed+i*11+1)*12;
            const w = 9 + srand(seed+i*11+2)*5;
            const px = h.x+ox, by = h.y+4, ty = h.y+4 - ht;
            // Slopes
            g.appendChild(_el('line', { x1: px-w, y1: by, x2: px, y2: ty,
                stroke: INK_DARK, 'stroke-width': 0.8, 'stroke-linecap': 'round' }));
            g.appendChild(_el('line', { x1: px, y1: ty, x2: px+w, y2: by,
                stroke: INK_DARK, 'stroke-width': 0.6, 'stroke-linecap': 'round' }));
            // Hatching (left face, fewer)
            for (let j = 0; j < 3; j++) {
                const t = 0.2 + j * 0.25;
                const hx = (px-w) + (px - (px-w)) * t;
                const hy = by + (ty - by) * t;
                g.appendChild(_el('line', { x1: hx, y1: hy, x2: hx+2, y2: hy + ht*0.08,
                    stroke: INK_DARK, 'stroke-width': 0.3, 'stroke-opacity': 0.35 }));
            }
            // Snow stipple on peak
            for (let j = 0; j < 4; j++) {
                const sx = px + (srand(seed+i*20+j)-0.5)*w*0.8;
                const sy = ty + srand(seed+i*20+j+10)*ht*0.25;
                g.appendChild(_el('circle', { cx: sx, cy: sy, r: 0.5,
                    fill: INK_LIGHT, 'fill-opacity': 0.25 }));
            }
        }
        // Snow drifts (horizontal ellipses, stroke only)
        for (let i = 0; i < 2; i++) {
            const dx = h.x + (srand(seed+i*41)-0.5)*22;
            const dy = h.y + 6 + srand(seed+i*41+1)*3;
            g.appendChild(_el('path', {
                d: `M${dx-6},${dy} Q${dx},${dy-2} ${dx+6},${dy}`,
                fill: 'none', stroke: INK_LIGHT, 'stroke-width': 0.4, 'stroke-opacity': 0.2,
            }));
        }
    }
}

// ── Swamp — Wavy lines + reeds ──
function _drawSwamp(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        // Horizontal wavy water lines
        for (let i = 0; i < 6; i++) {
            const wy = h.y - 8 + i * 3.5;
            const wj = (srand(seed+i*7)-0.5)*5;
            g.appendChild(_el('path', {
                d: `M${h.x-16+wj},${wy} Q${h.x+wj},${wy-2} ${h.x+16+wj},${wy}`,
                fill: 'none', stroke: INK, 'stroke-width': 0.5, 'stroke-opacity': 0.35,
            }));
        }
        // Reed/cattail stems
        for (let i = 0; i < 5; i++) {
            const rx = h.x + (i < 3 ? -12-i*4 : 8+(i-3)*5);
            const ry = h.y - 2 + (srand(seed+i*7+20)-0.5)*7;
            g.appendChild(_el('line', { x1: rx, y1: ry+6, x2: rx-0.5, y2: ry-10,
                stroke: INK_DARK, 'stroke-width': 0.6 }));
            // Cattail head (small oval)
            g.appendChild(_el('ellipse', { cx: rx-0.5, cy: ry-11, rx: 1.2, ry: 2.5,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.4 }));
        }
    }
}

// ── Desert — Crescent dune marks + stipple ──
function _drawDesert(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        // Crescent dune curves
        for (let d = 0; d < 3; d++) {
            const dy = -6 + d * 5, dOx = (srand(seed+d*17)-0.5)*8;
            g.appendChild(_el('path', {
                d: `M${h.x-18+dOx},${h.y+dy+3} Q${h.x+dOx},${h.y+dy-5} ${h.x+18+dOx},${h.y+dy+3}`,
                fill: 'none', stroke: INK, 'stroke-width': 0.5, 'stroke-opacity': 0.3,
            }));
        }
        // Sand stipple dots
        for (let i = 0; i < 10; i++) {
            const sx = h.x + (srand(seed+i*5)-0.5)*30;
            const sy = h.y + (srand(seed+i*5+3)-0.5)*16;
            g.appendChild(_el('circle', { cx: sx, cy: sy, r: 0.4,
                fill: INK, 'fill-opacity': 0.15 }));
        }
    }
}

// ── Volcanic — Mountain peak + crater + smoke wisps ──
function _drawVolcanic(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        const jx = (srand(seed)-0.5)*4;
        const ht = 20 + srand(seed+1)*10, w = 14 + srand(seed+2)*6;
        const px = h.x+jx, by = h.y+6, ty = by - ht;
        // Slopes
        g.appendChild(_el('line', { x1: px-w, y1: by, x2: px-2, y2: ty,
            stroke: INK_DARK, 'stroke-width': 0.9, 'stroke-linecap': 'round' }));
        g.appendChild(_el('line', { x1: px+2, y1: ty, x2: px+w, y2: by,
            stroke: INK_DARK, 'stroke-width': 0.7, 'stroke-linecap': 'round' }));
        // Crater opening (horizontal line at top)
        g.appendChild(_el('line', { x1: px-3, y1: ty+1, x2: px+3, y2: ty+1,
            stroke: INK_DARK, 'stroke-width': 0.8 }));
        // Left hatching
        for (let j = 0; j < 4; j++) {
            const t = 0.2 + j * 0.18;
            const hx = (px-w) + (px-2 - (px-w)) * t;
            const hy = by + (ty - by) * t;
            g.appendChild(_el('line', { x1: hx, y1: hy, x2: hx+2, y2: hy+ht*0.08,
                stroke: INK_DARK, 'stroke-width': 0.3, 'stroke-opacity': 0.4 }));
        }
        // Smoke wisps (wavy lines rising from crater)
        for (let i = 0; i < 3; i++) {
            const sx = px + (srand(seed+i*3)-0.5)*4;
            const sh = 8 + i * 5;
            g.appendChild(_el('path', {
                d: `M${sx},${ty} Q${sx+3+i*2},${ty-sh*0.5} ${sx-2-i},${ty-sh}`,
                fill: 'none', stroke: INK, 'stroke-width': 0.4, 'stroke-opacity': 0.15 - i*0.03,
            }));
        }
    }
}

// ── Cave — Stipple clusters + arch entrance ──
function _drawCave(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        // Rock stipple clusters
        for (let i = 0; i < 8; i++) {
            const rx = h.x + (srand(seed+i*7)-0.5)*28;
            const ry = h.y + (srand(seed+i*7+3)-0.5)*14;
            g.appendChild(_el('circle', { cx: rx, cy: ry,
                r: 0.5 + srand(seed+i*7+1)*0.6,
                fill: INK_DARK, 'fill-opacity': 0.25 }));
        }
        // Cave entrance arch (stroke only)
        if (srand(seed+55) > 0.3) {
            g.appendChild(_el('path', {
                d: `M${h.x-7},${h.y+6} Q${h.x-7},${h.y-5} ${h.x},${h.y-6} Q${h.x+7},${h.y-5} ${h.x+7},${h.y+6}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.7,
            }));
            // Dark interior stipple
            for (let j = 0; j < 5; j++) {
                const dx = h.x + (srand(seed+j*3+80)-0.5)*8;
                const dy = h.y + (srand(seed+j*3+81)-0.5)*6;
                g.appendChild(_el('circle', { cx: dx, cy: dy, r: 0.4,
                    fill: INK_DARK, 'fill-opacity': 0.3 }));
            }
        }
    }
}

// ── Graveyard — Tombstones + crosses (stroke only) ──
function _drawGraveyard(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        for (let i = 0; i < 5; i++) {
            const tx = h.x + (srand(seed+i*9)-0.5)*28;
            const ty = h.y + (srand(seed+i*9+3)-0.5)*12;
            const th = 7 + srand(seed+i*9+1)*5;
            const tw = 3 + srand(seed+i*9+2)*2;
            const tilt = (srand(seed+i*9+5)-0.5)*10;
            if (i < 3) {
                // Tombstone (outline only)
                g.appendChild(_el('path', {
                    d: `M${tx-tw},${ty+3} L${tx-tw},${ty-th+2} Q${tx},${ty-th-3} ${tx+tw},${ty-th+2} L${tx+tw},${ty+3}`,
                    fill: 'none', stroke: INK_DARK, 'stroke-width': 0.6,
                    transform: `rotate(${tilt}, ${tx}, ${ty})`,
                }));
            } else {
                // Cross
                g.appendChild(_el('line', { x1: tx, y1: ty+3, x2: tx, y2: ty-th-1,
                    stroke: INK_DARK, 'stroke-width': 1.0,
                    transform: `rotate(${tilt}, ${tx}, ${ty})` }));
                g.appendChild(_el('line', { x1: tx-tw-1, y1: ty-th*0.55, x2: tx+tw+1, y2: ty-th*0.55,
                    stroke: INK_DARK, 'stroke-width': 0.8,
                    transform: `rotate(${tilt}, ${tx}, ${ty})` }));
            }
        }
        // Dead tree (simple 3 strokes)
        g.appendChild(_el('line', { x1: h.x+12, y1: h.y+3, x2: h.x+12, y2: h.y-14,
            stroke: INK_DARK, 'stroke-width': 0.9, 'stroke-linecap': 'round' }));
        g.appendChild(_el('line', { x1: h.x+12, y1: h.y-11, x2: h.x+18, y2: h.y-15,
            stroke: INK_DARK, 'stroke-width': 0.5 }));
        g.appendChild(_el('line', { x1: h.x+12, y1: h.y-8, x2: h.x+7, y2: h.y-12,
            stroke: INK_DARK, 'stroke-width': 0.4 }));
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
                    fill: 'none', stroke: INK, 'stroke-width': 0.45,
                    'stroke-opacity': 0.35, 'stroke-linecap': 'round',
                }));
            }
        }
    }
}

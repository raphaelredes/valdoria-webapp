// ===============================================================
// NAVIGATE MAP — Terrain Rendering (Region-Based Architecture)
// Style: WoW world map / Inkarnate — painted biome zones with
// connected mountain ridgelines, merged forest canopy masses,
// cross-hatching, full coverage with NO empty parchment space.
// ===============================================================

// ── Utility: organic blob path ──
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

// ── Utility: smooth hull path around a set of points ──
function _hullPath(points, pad, seed) {
    if (points.length <= 1) {
        const p = points[0];
        return _organicBlob(p.x, p.y, pad, pad * 0.8, seed, 10);
    }
    // Simple convex hull (gift wrapping) then smooth
    const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const hull = [];
    // Lower hull
    for (const p of pts) {
        while (hull.length >= 2) {
            const a = hull[hull.length - 2], b = hull[hull.length - 1];
            if ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) <= 0) hull.pop();
            else break;
        }
        hull.push(p);
    }
    // Upper hull
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
    // Expand hull outward by pad
    const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
    const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
    const expanded = hull.map((p, i) => {
        const dx = p.x - cx, dy = p.y - cy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const wobble = (srand(seed + i * 17) - 0.5) * pad * 0.4;
        return { x: p.x + (dx / len) * (pad + wobble), y: p.y + (dy / len) * (pad + wobble) };
    });
    // Smooth bezier path
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

// ── Region builder: group adjacent hexes by biome into clusters ──
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
            // 6 hex neighbors (flat-top)
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

// ── Biome-aware ground cover texture ──
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
        for (let i = 0; i < 5; i++) {
            const bx = x + (srand(seed+i*7)-0.5)*HEX_W, by = y + (srand(seed+i*7+3)-0.5)*ROW_H;
            els.push(_el('circle', { cx: bx, cy: by, r: 0.8+srand(seed+i*7+1)*0.7,
                fill: '#1a3a10', 'fill-opacity': 0.15 }));
        }
    } else if (biome === 'mountain' || biome === 'cave') {
        for (let i = 0; i < 4; i++) {
            const rx = x + (srand(seed+i*9)-0.5)*HEX_W, ry = y + (srand(seed+i*9+3)-0.5)*ROW_H;
            els.push(_el('circle', { cx: rx, cy: ry, r: 0.4+srand(seed+i*9+1)*0.5,
                fill: '#3a3830', 'fill-opacity': 0.18 }));
        }
    } else if (biome === 'snow') {
        for (let i = 0; i < 3; i++) {
            const sx = x + (srand(seed+i*5)-0.5)*HEX_W, sy = y + (srand(seed+i*5+3)-0.5)*ROW_H;
            els.push(_el('circle', { cx: sx, cy: sy, r: 0.5, fill: '#a0a098', 'fill-opacity': 0.12 }));
        }
    } else if (biome === 'desert') {
        for (let i = 0; i < 4; i++) {
            const dx = x + (srand(seed+i*6)-0.5)*HEX_W, dy = y + (srand(seed+i*6+3)-0.5)*ROW_H;
            els.push(_el('circle', { cx: dx, cy: dy, r: 0.4, fill: '#8a7a48', 'fill-opacity': 0.12 }));
        }
    } else if (biome === 'swamp') {
        if (srand(seed+500) > 0.35) {
            const wx = x + (srand(seed+501)-0.5)*20, wy = y + (srand(seed+502)-0.5)*12;
            els.push(_el('path', { d: `M${wx-6},${wy} Q${wx},${wy-2} ${wx+6},${wy}`,
                fill: 'none', stroke: '#3a5a2a', 'stroke-width': 0.3, 'stroke-opacity': 0.12 }));
        }
    } else if (biome === 'volcanic') {
        for (let i = 0; i < 3; i++) {
            const vx = x + (srand(seed+i*8)-0.5)*HEX_W, vy = y + (srand(seed+i*8+3)-0.5)*ROW_H;
            els.push(_el('circle', { cx: vx, cy: vy, r: 0.4, fill: '#2a1a10', 'fill-opacity': 0.14 }));
        }
    } else {
        // Plains grass
        for (let i = 0; i < 3; i++) {
            const gx = x + (srand(seed+i*7)-0.5)*HEX_W, gy = y + (srand(seed+i*7+3)-0.5)*ROW_H;
            const a = (srand(seed+i*7+5)-0.5)*50*Math.PI/180, l = 3+srand(seed+i*7+1)*3;
            els.push(_el('line', { x1: gx, y1: gy, x2: gx+Math.sin(a)*l, y2: gy-Math.cos(a)*l,
                stroke: '#5a6a3a', 'stroke-width': 0.3, 'stroke-opacity': 0.14, 'stroke-linecap': 'round' }));
        }
    }
    return els;
}

// ══════════════════════════════════════════════════════════
// TERRAIN REGIONS — Strong painted biome zone fills
// ══════════════════════════════════════════════════════════

function renderTerrainRegions(svg, fogState) {
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);
    const regG = _el('g', { class: 'terrain-regions', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    const colors = {
        plains: '#4a5a30', forest: '#1a3a12', snow: '#6a7078',
        mountain: '#4a4448', desert: '#7a6a38', swamp: '#2a3a22',
        cave: '#2a2a30', graveyard: '#3a2a28', volcanic: '#5a2a18',
    };
    const allHexes = [...TERRAIN_HEXES, ..._buildAutoFillHexes()];
    const regions = _buildBiomeRegions(allHexes);

    // Draw large painted blobs per region cluster
    for (const [biome, clusters] of Object.entries(regions)) {
        for (const cluster of clusters) {
            // Max visibility for any hex in cluster
            let vis = 0;
            for (const h of cluster) {
                vis = Math.max(vis, _hexVisibility(h.col, h.row, knownSet, discoveredSet));
            }
            if (vis <= 0) continue;
            // Paint a large blob covering the whole cluster
            const hullD = _hullPath(cluster, 32 + srand(cluster[0].col * 100 + cluster[0].row) * 12, cluster[0].col * 77 + cluster[0].row * 33);
            regG.appendChild(_el('path', {
                d: hullD, fill: colors[biome] || colors.plains,
                'fill-opacity': vis * 0.55,
                filter: 'url(#terrain-soft)',
            }));
            // Inner gradient for depth
            if (cluster.length >= 3) {
                const cx = cluster.reduce((s, h) => s + h.x, 0) / cluster.length;
                const cy = cluster.reduce((s, h) => s + h.y, 0) / cluster.length;
                regG.appendChild(_el('path', {
                    d: _organicBlob(cx, cy, 25 + cluster.length * 6, 20 + cluster.length * 4, cluster[0].col * 43, 10),
                    fill: colors[biome] || colors.plains,
                    'fill-opacity': vis * 0.3,
                    filter: 'url(#terrain-soft)',
                }));
            }
        }
    }
    svg.appendChild(regG);
}

// ══════════════════════════════════════════════════════════
// TERRAIN DETAILS — Region-based connected features
// ══════════════════════════════════════════════════════════

function renderTerrainDetails(svg, fogState) {
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);
    const tG = _el('g', { class: 'terrain-illust', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    const allHexes = [...TERRAIN_HEXES, ..._buildAutoFillHexes()];
    const regions = _buildBiomeRegions(allHexes);

    // Draw connected terrain per biome region
    for (const [biome, clusters] of Object.entries(regions)) {
        for (const cluster of clusters) {
            // Sort by position for connected rendering
            cluster.sort((a, b) => a.row - b.row || a.col - b.col);
            // Per-hex visibility weighted average
            let totalVis = 0;
            for (const h of cluster) {
                h.vis = _hexVisibility(h.col, h.row, knownSet, discoveredSet);
                totalVis += h.vis;
            }
            if (totalVis <= 0) continue;
            const avgVis = totalVis / cluster.length;
            const g = _el('g', { opacity: Math.min(1, avgVis * 1.1) });

            if (biome === 'mountain') _drawConnectedMountains(g, cluster);
            else if (biome === 'forest') _drawConnectedForest(g, cluster);
            else if (biome === 'snow') _drawConnectedSnow(g, cluster);
            else if (biome === 'swamp') _drawConnectedSwamp(g, cluster);
            else if (biome === 'desert') _drawConnectedDesert(g, cluster);
            else if (biome === 'volcanic') _drawConnectedVolcanic(g, cluster);
            else if (biome === 'cave') _drawConnectedCave(g, cluster);
            else if (biome === 'graveyard') _drawConnectedGraveyard(g, cluster);
            else _drawConnectedGrassland(g, cluster);

            tG.appendChild(g);
        }
    }
    svg.appendChild(tG);
}

// ══════════════════════════════════════════════════════════
// CONNECTED MOUNTAIN RANGE — Continuous ridgeline
// ══════════════════════════════════════════════════════════

function _drawConnectedMountains(g, cluster) {
    // Draw peaks at each hex, but connect them with a ridgeline
    const peaks = [];
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        const count = 3 + Math.floor(srand(seed) * 3);
        for (let i = 0; i < count; i++) {
            peaks.push({
                x: h.x + (i - (count-1)/2) * 13 + (srand(seed+i*10)-0.5) * 6,
                y: h.y + (srand(seed+i*10+5)-0.5) * 7,
                h: 20 + srand(seed+i*10+1) * 26,
                w: 10 + srand(seed+i*10+2) * 8,
                seed: seed + i * 10,
            });
        }
    }
    peaks.sort((a, b) => a.h - b.h);

    // Base shadow under entire range
    if (cluster.length >= 2) {
        g.appendChild(_el('path', {
            d: _hullPath(cluster, 18, cluster[0].col * 999),
            fill: '#2a2018', 'fill-opacity': 0.1, filter: 'url(#terrain-soft)',
        }));
    }

    // Draw each peak
    for (const p of peaks) {
        const by = p.y + 5, lx = p.x - p.w, rx = p.x + p.w, ty = p.y - p.h;
        const jit = (srand(p.seed + 77) - 0.5) * 2.5;

        // Hump body
        g.appendChild(_el('path', {
            d: `M${lx},${by} Q${lx+p.w*0.12},${ty+p.h*0.2} ${p.x+jit},${ty} Q${rx-p.w*0.12},${ty+p.h*0.2} ${rx},${by} Z`,
            fill: '#585248', stroke: '#2a2420', 'stroke-width': 0.8, 'stroke-linejoin': 'round',
        }));

        // Left face hatching (10-14 lines)
        const hatchCount = 10 + Math.floor(srand(p.seed + 50) * 5);
        for (let j = 0; j < hatchCount; j++) {
            const t = 0.06 + j * (0.85 / hatchCount);
            const hx = lx + (p.x - lx) * t * 0.6;
            const hy = by + (ty - by) * t;
            const hLen = p.h * 0.13 * (1 - t * 0.2);
            g.appendChild(_el('line', { x1: hx, y1: hy, x2: hx + hLen * 0.3, y2: hy + hLen,
                stroke: '#1a1810', 'stroke-width': 0.4, 'stroke-opacity': 0.6 * (1 - t * 0.2) }));
        }

        // Right face lighter hatching
        for (let j = 0; j < 4; j++) {
            const t = 0.15 + j * 0.18;
            const hx = rx + (p.x - rx) * t * 0.45;
            const hy = by + (ty - by) * t;
            g.appendChild(_el('line', { x1: hx, y1: hy, x2: hx - 2, y2: hy + p.h * 0.06,
                stroke: '#6a6058', 'stroke-width': 0.3, 'stroke-opacity': 0.3 }));
        }

        // Cross-hatching on left
        for (let j = 0; j < 4; j++) {
            const t = 0.2 + j * 0.14;
            const hx = lx + (p.x - lx) * t * 0.5;
            const hy = by + (ty - by) * t * 0.75;
            g.appendChild(_el('line', { x1: hx, y1: hy, x2: hx + p.h * 0.06, y2: hy - p.h * 0.04,
                stroke: '#1a1810', 'stroke-width': 0.25, 'stroke-opacity': 0.35 }));
        }

        // Snow cap
        const cW = p.w * 0.5, cH = p.h * 0.22;
        g.appendChild(_el('path', {
            d: `M${p.x-cW+jit},${ty+cH} Q${p.x-cW*0.4+jit},${ty+cH*0.2} ${p.x+jit},${ty-1}
                Q${p.x+cW*0.4+jit},${ty+cH*0.2} ${p.x+cW+jit},${ty+cH+1}
                Q${p.x+cW*0.2+jit},${ty+cH*0.65} ${p.x+jit},${ty+cH*0.75}
                Q${p.x-cW*0.2+jit},${ty+cH*0.65} ${p.x-cW+jit},${ty+cH}`,
            fill: '#d8d0c0', stroke: '#a8a090', 'stroke-width': 0.3,
        }));

        // Ridge line
        g.appendChild(_el('line', { x1: p.x+jit-p.w*0.3, y1: ty+p.h*0.15, x2: p.x+jit+p.w*0.1, y2: ty+1,
            stroke: '#3a302a', 'stroke-width': 0.5, 'stroke-opacity': 0.4 }));
    }

    // Scree at base of each hex
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        for (let i = 0; i < 10; i++) {
            const sx = h.x + (srand(seed+i*31)-0.5) * 30, sy = h.y + 5 + srand(seed+i*31+1) * 6;
            g.appendChild(_el('circle', { cx: sx, cy: sy, r: 0.5+srand(seed+i*31+2)*0.6,
                fill: '#4a4038', 'fill-opacity': 0.35 }));
        }
    }
}

// ══════════════════════════════════════════════════════════
// CONNECTED FOREST — Merged canopy masses
// ══════════════════════════════════════════════════════════

function _drawConnectedForest(g, cluster) {
    // Large unified shadow under entire forest
    if (cluster.length >= 2) {
        g.appendChild(_el('path', {
            d: _hullPath(cluster, 22, cluster[0].col * 777),
            fill: '#0a1a08', 'fill-opacity': 0.15, filter: 'url(#terrain-soft)',
        }));
    }

    // Trunk layer (under canopy)
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        for (let i = 0; i < 5; i++) {
            const tx = h.x + (srand(seed+i*23)-0.5) * 28;
            const ty = h.y + 6 + srand(seed+i*23+1) * 5;
            g.appendChild(_el('line', { x1: tx, y1: ty, x2: tx + (srand(seed+i*23+2)-0.5)*2, y2: ty - 10,
                stroke: '#3a2810', 'stroke-width': 0.8, 'stroke-linecap': 'round' }));
        }
    }

    // Canopy blobs — draw per hex but with LARGE radius that overlaps adjacent hexes
    const allBlobs = [];
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        const count = 8 + Math.floor(srand(seed) * 6);
        for (let i = 0; i < count; i++) {
            allBlobs.push({
                bx: h.x + (srand(seed+i*13)-0.5) * 38,  // Large spread — overlaps neighbors
                by: h.y + (srand(seed+i*13+5)-0.5) * 22,
                rw: 5 + srand(seed+i*13+1) * 8,
                rh: 4 + srand(seed+i*13+2) * 6,
                seed: seed + i * 13,
            });
        }
    }
    allBlobs.sort((a, b) => a.by - b.by);

    // Also add "bridge" blobs between adjacent hexes to fill gaps
    for (let i = 0; i < cluster.length; i++) {
        for (let j = i + 1; j < cluster.length; j++) {
            const a = cluster[i], b = cluster[j];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist > HEX_W * 2) continue; // Only adjacent/near hexes
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            const bridgeSeed = a.col * 50 + b.col * 30 + a.row * 70;
            for (let k = 0; k < 4; k++) {
                allBlobs.push({
                    bx: mx + (srand(bridgeSeed + k * 11) - 0.5) * 20,
                    by: my + (srand(bridgeSeed + k * 11 + 3) - 0.5) * 14,
                    rw: 5 + srand(bridgeSeed + k * 11 + 1) * 6,
                    rh: 4 + srand(bridgeSeed + k * 11 + 2) * 5,
                    seed: bridgeSeed + k * 11,
                });
            }
        }
    }
    allBlobs.sort((a, b) => a.by - b.by);

    // Draw all canopy blobs
    for (const b of allBlobs) {
        // Deep shadow
        g.appendChild(_el('path', { d: _organicBlob(b.bx+0.5, b.by+b.rh*0.2, b.rw, b.rh*0.85, b.seed+99, 7),
            fill: '#0a2808', 'fill-opacity': 0.5, stroke: '#061a04', 'stroke-width': 0.5 }));
        // Main canopy
        g.appendChild(_el('path', { d: _organicBlob(b.bx, b.by, b.rw, b.rh, b.seed+1, 8),
            fill: '#1a4a12', 'fill-opacity': 0.9, stroke: '#0a2a08', 'stroke-width': 0.4 }));
        // Highlight
        g.appendChild(_el('ellipse', { cx: b.bx-b.rw*0.2, cy: b.by-b.rh*0.3,
            rx: b.rw*0.35, ry: b.rh*0.25, fill: '#2a7a1a', 'fill-opacity': 0.2 }));
    }

    // Undergrowth at edges
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        for (let i = 0; i < 4; i++) {
            const ux = h.x + (srand(seed+i*51)-0.5) * 30;
            const uy = h.y + 9 + srand(seed+i*51+3) * 5;
            g.appendChild(_el('path', { d: _organicBlob(ux, uy, 4, 2.5, seed+i*51+7, 5),
                fill: '#1a3a10', 'fill-opacity': 0.35 }));
        }
    }
}

// ══════════════════════════════════════════════════════════
// CONNECTED SNOW — Icy peaks with glacier bands
// ══════════════════════════════════════════════════════════

function _drawConnectedSnow(g, cluster) {
    // Snow drift base
    if (cluster.length >= 2) {
        g.appendChild(_el('path', {
            d: _hullPath(cluster, 20, cluster[0].col * 555),
            fill: '#b8b4ac', 'fill-opacity': 0.08, filter: 'url(#terrain-soft)',
        }));
    }
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        const count = 2 + Math.floor(srand(seed) * 2);
        for (let i = 0; i < count; i++) {
            const ox = (i-(count-1)/2)*16 + (srand(seed+i*11)-0.5)*6;
            const ht = 22 + srand(seed+i*11+1)*16, w = 12 + srand(seed+i*11+2)*7;
            const px = h.x+ox, py = h.y, ty = py - ht;
            // Peak
            g.appendChild(_el('path', { d: `M${px-w},${py+5} Q${px-w*0.12},${ty+ht*0.12} ${px},${ty} Q${px+w*0.12},${ty+ht*0.12} ${px+w},${py+5} Z`,
                fill: '#8a8890', stroke: '#5a5860', 'stroke-width': 0.6 }));
            // Left hatching
            for (let j = 0; j < 8; j++) {
                const t = 0.1+j*0.1;
                g.appendChild(_el('line', { x1: px-w+w*t*0.5, y1: py+5+(ty-py-5)*t,
                    x2: px-w+w*t*0.5+2.5, y2: py+5+(ty-py-5)*t+ht*0.08,
                    stroke: '#4a4860', 'stroke-width': 0.35, 'stroke-opacity': 0.45 }));
            }
            // Snow cap
            g.appendChild(_el('path', { d: `M${px-w*0.65},${ty+ht*0.35} Q${px},${ty-2} ${px+w*0.65},${ty+ht*0.35}`,
                fill: '#dcd8d0', stroke: '#b8b0a8', 'stroke-width': 0.35 }));
            // Glacier lines
            for (let j = 0; j < 4; j++) {
                const ly = ty + ht*(0.12+j*0.07), lw = w*(0.45-j*0.08);
                g.appendChild(_el('path', { d: `M${px-lw},${ly} Q${px},${ly-1.5} ${px+lw},${ly}`,
                    fill: 'none', stroke: '#e8e4dc', 'stroke-width': 0.35, 'stroke-opacity': 0.45 }));
            }
        }
        // Snow drifts
        for (let i = 0; i < 3; i++) {
            g.appendChild(_el('ellipse', { cx: h.x+(srand(seed+i*41)-0.5)*26, cy: h.y+6+srand(seed+i*41+1)*4,
                rx: 5+srand(seed+i*41+2)*4, ry: 1.8, fill: '#c8c4bc', 'fill-opacity': 0.22 }));
        }
    }
}

// ── Connected Swamp ──
function _drawConnectedSwamp(g, cluster) {
    // Water wash under region
    if (cluster.length >= 2) {
        g.appendChild(_el('path', { d: _hullPath(cluster, 18, cluster[0].col * 333),
            fill: '#1a2a18', 'fill-opacity': 0.12, filter: 'url(#terrain-soft)' }));
    }
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        g.appendChild(_el('path', { d: _organicBlob(h.x, h.y, 22, 14, seed+77, 9),
            fill: '#1a2a18', 'fill-opacity': 0.4, stroke: '#2a3a1a', 'stroke-width': 0.5 }));
        for (let i = 0; i < 6; i++) {
            const wy = h.y-8+i*3.5, wj = (srand(seed+i*7)-0.5)*5;
            g.appendChild(_el('path', { d: `M${h.x-16+wj},${wy} Q${h.x+wj},${wy-2} ${h.x+16+wj},${wy}`,
                fill: 'none', stroke: '#3a5a2a', 'stroke-width': 0.5, 'stroke-opacity': 0.45 }));
        }
        for (let i = 0; i < 5; i++) {
            const rx = h.x+(i<3?-12-i*4:8+(i-3)*5), ry = h.y-2+(srand(seed+i*7+20)-0.5)*7;
            g.appendChild(_el('line', { x1: rx, y1: ry+6, x2: rx-0.5, y2: ry-12, stroke: '#4a6a2a', 'stroke-width': 0.7 }));
            g.appendChild(_el('ellipse', { cx: rx-0.5, cy: ry-13, rx: 1.5, ry: 3, fill: '#5a4a20' }));
        }
        if (srand(seed+99) > 0.4) {
            const dx = h.x+16, dy = h.y-5;
            g.appendChild(_el('line', { x1: dx, y1: dy+7, x2: dx, y2: dy-10, stroke: '#3a3020', 'stroke-width': 1.2, 'stroke-linecap': 'round' }));
            g.appendChild(_el('line', { x1: dx, y1: dy-6, x2: dx+6, y2: dy-10, stroke: '#3a3020', 'stroke-width': 0.6 }));
        }
    }
}

// ── Connected Desert ──
function _drawConnectedDesert(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        for (let d = 0; d < 4; d++) {
            const dy = -8+d*5, dOx = (srand(seed+d*17)-0.5)*10;
            g.appendChild(_el('path', { d: `M${h.x-26+dOx},${h.y+dy+5} Q${h.x-8+dOx},${h.y+dy-8} ${h.x+2+dOx},${h.y+dy+3} Q${h.x+16+dOx},${h.y+dy-5} ${h.x+26+dOx},${h.y+dy+5}`,
                fill: '#7a6a38', 'fill-opacity': 0.1+d*0.06, stroke: '#6a5a2a', 'stroke-width': 0.45 }));
        }
        for (let i = 0; i < 7; i++) {
            const wy = h.y-4+i*3, wx = h.x-14+(srand(seed+i*9)-0.5)*8;
            g.appendChild(_el('line', { x1: wx, y1: wy, x2: wx+12+srand(seed+i*9+1)*8, y2: wy-0.5,
                stroke: '#9a8a4a', 'stroke-width': 0.35, 'stroke-dasharray': '2 3', 'stroke-opacity': 0.35 }));
        }
        for (let i = 0; i < 12; i++) {
            g.appendChild(_el('circle', { cx: h.x+(srand(seed+i*5)-0.5)*32, cy: h.y+(srand(seed+i*5+3)-0.5)*16,
                r: 0.45, fill: '#9a8a5a', 'fill-opacity': 0.3 }));
        }
    }
}

// ── Connected Volcanic ──
function _drawConnectedVolcanic(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        const jx = (srand(seed)-0.5)*4;
        g.appendChild(_el('path', { d: `M${h.x-20+jx},${h.y+8} Q${h.x-8+jx},${h.y-18} ${h.x+jx},${h.y-20} Q${h.x+8+jx},${h.y-18} ${h.x+20+jx},${h.y+8} Z`,
            fill: '#3a2218', stroke: '#2a1a0a', 'stroke-width': 0.8 }));
        for (let j = 0; j < 6; j++) { const t = 0.15+j*0.12;
            g.appendChild(_el('line', { x1: h.x-20+jx+10*t, y1: h.y+8+(h.y-20-h.y-8)*t,
                x2: h.x-20+jx+10*t+2, y2: h.y+8+(h.y-20-h.y-8)*t+4,
                stroke: '#1a0a08', 'stroke-width': 0.3, 'stroke-opacity': 0.4 })); }
        g.appendChild(_el('ellipse', { cx: h.x+jx, cy: h.y-19, rx: 7, ry: 3, fill: '#a04010', 'fill-opacity': 0.45 }));
        g.appendChild(_el('ellipse', { cx: h.x+jx, cy: h.y-19, rx: 4, ry: 1.8, fill: '#c06020', 'fill-opacity': 0.35 }));
        g.appendChild(_el('path', { d: `M${h.x+jx},${h.y-16} Q${h.x-3+jx},${h.y-6} ${h.x-8+jx},${h.y-1}`,
            fill: 'none', stroke: '#a04010', 'stroke-width': 0.6, 'stroke-opacity': 0.5 }));
        g.appendChild(_el('path', { d: `M${h.x+jx},${h.y-16} Q${h.x+4+jx},${h.y-4} ${h.x+7+jx},${h.y+2}`,
            fill: 'none', stroke: '#903810', 'stroke-width': 0.5, 'stroke-opacity': 0.4 }));
        for (let i = 0; i < 3; i++) {
            const sx = h.x+jx+(srand(seed+i*3)-0.5)*6, sh = 7+i*6;
            g.appendChild(_el('path', { d: `M${sx},${h.y-20} Q${sx+4+i*2},${h.y-20-sh} ${sx-3-i},${h.y-20-sh-5}`,
                fill: 'none', stroke: '#5a4a38', 'stroke-width': 0.5+i*0.15, 'stroke-opacity': 0.18-i*0.03 }));
        }
    }
}

// ── Connected Cave ──
function _drawConnectedCave(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        for (let i = 0; i < 6; i++) {
            const rx = h.x+(srand(seed+i*7)-0.5)*28, ry = h.y+(srand(seed+i*7+3)-0.5)*14;
            const rw = 5+srand(seed+i*7+1)*6, rh = 3+srand(seed+i*7+2)*4;
            g.appendChild(_el('path', { d: _organicBlob(rx, ry, rw, rh, seed+i*30, 6),
                fill: '#3a3430', stroke: '#2a2420', 'stroke-width': 0.6 }));
            g.appendChild(_el('line', { x1: rx-rw*0.3, y1: ry-rh*0.2, x2: rx+rw*0.4, y2: ry+rh*0.3,
                stroke: '#1a1810', 'stroke-width': 0.35, 'stroke-opacity': 0.5 }));
        }
        if (srand(seed+55) > 0.3) {
            g.appendChild(_el('path', { d: `M${h.x-8},${h.y+7} Q${h.x-8},${h.y-5} ${h.x},${h.y-6} Q${h.x+8},${h.y-5} ${h.x+8},${h.y+7}`,
                fill: '#1a1810', 'fill-opacity': 0.45, stroke: '#3a3028', 'stroke-width': 0.6 }));
        }
    }
}

// ── Connected Graveyard ──
function _drawConnectedGraveyard(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        for (let i = 0; i < 5; i++) {
            const tx = h.x+(srand(seed+i*9)-0.5)*28, ty = h.y+(srand(seed+i*9+3)-0.5)*12;
            const th = 7+srand(seed+i*9+1)*5, tw = 3+srand(seed+i*9+2)*2.5;
            const tilt = (srand(seed+i*9+5)-0.5)*10;
            if (i < 3) {
                g.appendChild(_el('path', { d: `M${tx-tw},${ty+3} L${tx-tw},${ty-th+2} Q${tx},${ty-th-3} ${tx+tw},${ty-th+2} L${tx+tw},${ty+3} Z`,
                    fill: '#4a4038', stroke: '#3a3028', 'stroke-width': 0.5,
                    transform: `rotate(${tilt}, ${tx}, ${ty})` }));
            } else {
                g.appendChild(_el('line', { x1: tx, y1: ty+3, x2: tx, y2: ty-th-1, stroke: '#4a4038', 'stroke-width': 1.3,
                    transform: `rotate(${tilt}, ${tx}, ${ty})` }));
                g.appendChild(_el('line', { x1: tx-tw-1, y1: ty-th*0.55, x2: tx+tw+1, y2: ty-th*0.55, stroke: '#4a4038', 'stroke-width': 1.1,
                    transform: `rotate(${tilt}, ${tx}, ${ty})` }));
            }
        }
        // Dead tree
        g.appendChild(_el('line', { x1: h.x+12, y1: h.y+3, x2: h.x+12, y2: h.y-16, stroke: '#3a2820', 'stroke-width': 1.2, 'stroke-linecap': 'round' }));
        g.appendChild(_el('line', { x1: h.x+12, y1: h.y-12, x2: h.x+19, y2: h.y-16, stroke: '#3a2820', 'stroke-width': 0.6 }));
        g.appendChild(_el('line', { x1: h.x+12, y1: h.y-9, x2: h.x+6, y2: h.y-14, stroke: '#3a2820', 'stroke-width': 0.5 }));
        // Mist
        for (let i = 0; i < 2; i++) {
            g.appendChild(_el('ellipse', { cx: h.x+(srand(seed+200+i)-0.5)*22, cy: h.y+5+srand(seed+201+i)*3,
                rx: 8, ry: 2, fill: '#5a5a5a', 'fill-opacity': 0.06 }));
        }
    }
}

// ── Connected Grassland ──
function _drawConnectedGrassland(g, cluster) {
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        for (let i = 0; i < 10; i++) {
            const gx = h.x+(srand(seed+i*5)-0.5)*34, gy = h.y+(srand(seed+i*5+2)-0.5)*18;
            for (let b = 0; b < 4; b++) {
                const angle = -25+b*16+(srand(seed+i*5+b)-0.5)*12;
                const bh = 5+srand(seed+i*5+b+10)*5;
                const rad = angle*Math.PI/180;
                g.appendChild(_el('path', { d: `M${gx},${gy} Q${gx+Math.sin(rad)*bh*0.5},${gy-bh*0.7} ${gx+Math.sin(rad)*bh},${gy-Math.cos(rad)*bh}`,
                    fill: 'none', stroke: '#5a7a3a', 'stroke-width': 0.55, 'stroke-opacity': 0.45, 'stroke-linecap': 'round' }));
            }
        }
        for (let i = 0; i < 4; i++) {
            if (srand(seed+90+i) > 0.35) {
                const fx = h.x+(srand(seed+70+i)-0.5)*26, fy = h.y+(srand(seed+71+i)-0.5)*14;
                g.appendChild(_el('circle', { cx: fx, cy: fy, r: 1.2,
                    fill: ['#8a6a8a','#8a8a5a','#aa7a5a','#7a8a6a','#aa8a6a'][i%5], 'fill-opacity': 0.35 }));
            }
        }
    }
}

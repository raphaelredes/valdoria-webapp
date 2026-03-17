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
// Cache: these are called 3x and 2x respectively but produce identical results
var _cachedAutoFillHexes = null;
var _cachedAllHexes = null;
var _cachedBiomeRegions = null;

function _getAllHexes() {
    if (_cachedAllHexes) return _cachedAllHexes;
    _cachedAllHexes = [...TERRAIN_HEXES, ..._buildAutoFillHexes()];
    return _cachedAllHexes;
}

function _getAllBiomeRegions() {
    if (_cachedBiomeRegions) return _cachedBiomeRegions;
    _cachedBiomeRegions = _buildBiomeRegions(_getAllHexes());
    return _cachedBiomeRegions;
}

function _invalidateTerrainCaches() {
    _cachedAutoFillHexes = null;
    _cachedAllHexes = null;
    _cachedBiomeRegions = null;
    _invalidateVisCache();
}

function _buildAutoFillHexes() {
    if (_cachedAutoFillHexes) return _cachedAutoFillHexes;
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
    _cachedAutoFillHexes = extra;
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

// ── Visibility helper (cached per render cycle) ──
var _visCache = null;
function _invalidateVisCache() { _visCache = null; }
function _hexVisibility(col, row, knownSet, discoveredSet) {
    if (!_visCache) _visCache = {};
    const key = col * 100 + row;
    if (_visCache[key] !== undefined) return _visCache[key];
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
    _visCache[key] = op;
    return op;
}

// ═══════════════════════════════════════════════════════
// TERRAIN RENDERING — REMOVED (now pre-rendered in map-static-2x.png)
// Kept: _hexVisibility, hex grid helpers (used by fog overlay)
// Build-time rendering: see build-map.html + build-map-extras.js
// ═══════════════════════════════════════════════════════

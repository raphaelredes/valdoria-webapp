// ===============================================================
// NAVIGATE MAP — Borders, roads, markers, compass, decorations
// Hand-drawn ink style — no fills, no glow, no drop shadows
// ===============================================================

// ── LABEL WRAPPING HELPER ──

function _wrapLabel(name, maxChars) {
    if (name.length <= maxChars) return [name];
    // Try to split at space nearest to middle
    const words = name.split(' ');
    if (words.length === 1) return [name]; // single long word, show full
    const lines = [];
    let current = '';
    for (const word of words) {
        if (current && (current + ' ' + word).length > maxChars) {
            lines.push(current);
            current = word;
        } else {
            current = current ? current + ' ' + word : word;
        }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [name];
}

// ── CONNECTION ROADS (ink paths) ──

function _buildRoadPath(aPx, bPx, seed) {
    // Multi-segment organic path with 3 waypoints (not a straight line)
    const dx = bPx.x - aPx.x, dy = bPx.y - aPx.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const px = -dy / len, py = dx / len; // perpendicular

    // 3 waypoints along the path at ~25%, 50%, 75%
    const pts = [];
    for (let i = 1; i <= 3; i++) {
        const t = i / 4;
        const bx = aPx.x + dx * t;
        const by = aPx.y + dy * t;
        // Perpendicular offset (organic wandering)
        const off = (srand(seed + i * 37) - 0.5) * Math.min(len * 0.15, 18);
        // Small tangent offset too (path doesn't follow straight line)
        const tOff = (srand(seed + i * 53) - 0.5) * 4;
        pts.push({ x: bx + px * off + (dx/len) * tOff, y: by + py * off + (dy/len) * tOff });
    }

    // Build cubic bezier through start → 3 waypoints → end
    const p0 = aPx, p1 = pts[0], p2 = pts[1], p3 = pts[2], p4 = bPx;
    return `M${p0.x},${p0.y} C${p1.x},${p1.y} ${p1.x},${p1.y} ${p2.x},${p2.y} S${p3.x},${p3.y} ${p4.x},${p4.y}`;
}

/** Point at t (0-1) along an SVG path — cached to avoid DOM thrashing */
var _cachedPathEl = null, _cachedPathD = null, _cachedPathLen = 0;
function _pointOnPath(pathD, t) {
    const svg = document.getElementById('map-svg');
    if (!svg) return { x: 0, y: 0 };
    if (pathD !== _cachedPathD) {
        if (_cachedPathEl && _cachedPathEl.parentNode) _cachedPathEl.parentNode.removeChild(_cachedPathEl);
        _cachedPathEl = document.createElementNS(NS, 'path');
        _cachedPathEl.setAttribute('d', pathD);
        _cachedPathEl.setAttribute('fill', 'none');
        _cachedPathEl.setAttribute('stroke', 'none');
        svg.appendChild(_cachedPathEl);
        _cachedPathD = pathD;
        _cachedPathLen = _cachedPathEl.getTotalLength();
    }
    const pt = _cachedPathEl.getPointAtLength(_cachedPathLen * t);
    return { x: pt.x, y: pt.y };
}
function _clearPathCache() {
    if (_cachedPathEl && _cachedPathEl.parentNode) _cachedPathEl.parentNode.removeChild(_cachedPathEl);
    _cachedPathEl = null; _cachedPathD = null; _cachedPathLen = 0;
}

function renderRoads(group, fogState) {/* Canvas */}

// ── LOCATION MARKERS (ink-drawn symbols) ──

function _drawSettlementIcon(g, x, y, sz) {/* Canvas */}

function _drawBiomeIcon(g, x, y, biome, sz, locName) {/* Canvas */}

function renderLocationMarkers(group, fogState) {/* Canvas */}

// ── BREADCRUMB TRAIL (dotted path through discovered locations) ──

function renderBreadcrumbTrail(svg) {/* Canvas */}

// ── PLAYER MARKER (simple pennant on pole) ──

function renderPlayerBanner(svg) {/* Canvas */}

// ── FOG WISPS ──

// renderFogWisps — REMOVED (replaced by _renderFogOverlay in navigate-map.js)
// renderCartographyDecor — REMOVED (now in pre-rendered static image)


// ── COMPASS ROSE (ink-drawn, no gradient fills) ──

function renderCompassRose() {
    const compassSvg = document.getElementById('compass-svg');
    if (!compassSvg) return;
    compassSvg.innerHTML = '';
    // Compass renders into its own fixed SVG (viewBox 0 0 90 90), centered at 45,45
    const cx = 45, cy = 45, r = 30;
    const g = _el('g', { class: 'compass-rose' });

    // Parchment background disc
    g.appendChild(_el('circle', { cx, cy, r: r + 12,
        fill: PARCHMENT, stroke: 'none' }));

    // Ornate outer rings
    g.appendChild(_el('circle', { cx, cy, r: r + 8, fill: 'none', stroke: INK_DARK, 'stroke-width': 1.8 }));
    g.appendChild(_el('circle', { cx, cy, r: r + 5, fill: 'none', stroke: INK, 'stroke-width': 0.5 }));
    g.appendChild(_el('circle', { cx, cy, r: r + 2, fill: 'none', stroke: INK_DARK, 'stroke-width': 1.2 }));
    g.appendChild(_el('circle', { cx, cy, r: r - 1, fill: 'none', stroke: INK, 'stroke-width': 0.4, 'stroke-dasharray': '1.5 2' }));

    // Decorative dots between rings
    for (let i = 0; i < 16; i++) {
        const a = (i * 22.5) * Math.PI / 180;
        const dr = r + 3.5;
        if (i % 4 !== 0) {
            g.appendChild(_el('circle', {
                cx: cx + Math.cos(a) * dr, cy: cy + Math.sin(a) * dr,
                r: 0.7, fill: INK_DARK, 'fill-opacity': 0.5,
            }));
        }
    }

    // Tick marks (32 points)
    for (let i = 0; i < 32; i++) {
        const a = (i * 11.25) * Math.PI / 180;
        const inner = i % 8 === 0 ? r + 2 : i % 4 === 0 ? r + 3 : r + 4;
        const outer = r + 7.5;
        const sw = i % 8 === 0 ? 1.2 : i % 4 === 0 ? 0.6 : 0.3;
        g.appendChild(_el('line', {
            x1: cx + Math.cos(a) * inner, y1: cy + Math.sin(a) * inner,
            x2: cx + Math.cos(a) * outer, y2: cy + Math.sin(a) * outer,
            stroke: INK_DARK, 'stroke-width': sw,
        }));
    }

    // 4 cardinal needles
    const needle = _el('g', { class: 'compass-needle' });
    const cards = [
        { a: -90, len: r - 2, w: 5.5, dark: true },
        { a: 90,  len: r - 4, w: 4.5, dark: false },
        { a: 0,   len: r - 5, w: 4,   dark: false },
        { a: 180, len: r - 5, w: 4,   dark: false },
    ];
    for (const c of cards) {
        const rad = c.a * Math.PI / 180;
        const tx = cx + Math.cos(rad) * c.len, ty = cy + Math.sin(rad) * c.len;
        const px1 = cx + Math.cos(rad + Math.PI / 2) * c.w, py1 = cy + Math.sin(rad + Math.PI / 2) * c.w;
        const px2 = cx + Math.cos(rad - Math.PI / 2) * c.w, py2 = cy + Math.sin(rad - Math.PI / 2) * c.w;
        needle.appendChild(_el('polygon', {
            points: `${tx},${ty} ${px1},${py1} ${cx},${cy}`,
            fill: INK_DARK, 'fill-opacity': c.dark ? 0.6 : 0.25,
            stroke: INK_DARK, 'stroke-width': 0.8,
        }));
        needle.appendChild(_el('polygon', {
            points: `${tx},${ty} ${cx},${cy} ${px2},${py2}`,
            fill: c.dark ? INK : PARCHMENT,
            'fill-opacity': c.dark ? 0.15 : 0.5,
            stroke: INK_DARK, 'stroke-width': 0.6,
        }));
    }

    // Intercardinal needles
    for (const a of [-45, 45, 135, -135]) {
        const rad = a * Math.PI / 180;
        const len = r * 0.55, w = 2.5;
        const tx = cx + Math.cos(rad) * len, ty = cy + Math.sin(rad) * len;
        const px1 = cx + Math.cos(rad + Math.PI / 2) * w, py1 = cy + Math.sin(rad + Math.PI / 2) * w;
        const px2 = cx + Math.cos(rad - Math.PI / 2) * w, py2 = cy + Math.sin(rad - Math.PI / 2) * w;
        needle.appendChild(_el('polygon', {
            points: `${tx},${ty} ${px1},${py1} ${cx},${cy}`,
            fill: INK_DARK, 'fill-opacity': 0.2, stroke: INK_DARK, 'stroke-width': 0.4,
        }));
        needle.appendChild(_el('polygon', {
            points: `${tx},${ty} ${cx},${cy} ${px2},${py2}`,
            fill: 'none', stroke: INK_DARK, 'stroke-width': 0.4,
        }));
    }

    // Center ornament
    needle.appendChild(_el('circle', { cx, cy, r: 5, fill: PARCHMENT, stroke: INK_DARK, 'stroke-width': 1.2 }));
    needle.appendChild(_el('circle', { cx, cy, r: 2.5, fill: INK_DARK, 'fill-opacity': 0.3, stroke: INK_DARK, 'stroke-width': 0.6 }));
    needle.appendChild(_el('circle', { cx, cy, r: 1, fill: INK_DARK, 'fill-opacity': 0.6 }));
    g.appendChild(needle);

    // Cardinal labels
    for (const l of [
        { ch: 'N', dx: 0, dy: -r - 11, sz: '11px', w: '700' },
        { ch: 'S', dx: 0, dy: r + 16,  sz: '9px',  w: '600' },
        { ch: 'L', dx: r + 12, dy: 4,  sz: '9px',  w: '600' },
        { ch: 'O', dx: -r - 12, dy: 4, sz: '9px',  w: '600' },
    ]) {
        const t = _el('text', { x: cx + l.dx, y: cy + l.dy, 'text-anchor': 'middle',
            'font-size': l.sz, 'font-family': "'Cinzel Decorative', 'Cinzel', serif",
            'font-weight': l.w, fill: INK_DARK, 'fill-opacity': '0.8' });
        t.textContent = l.ch;
        g.appendChild(t);
    }

    // Fleur-de-lis at North
    const ny = cy - r - 5;
    g.appendChild(_el('path', {
        d: `M${cx},${ny} L${cx-2},${ny+3} L${cx},${ny+1.5} L${cx+2},${ny+3} Z`,
        fill: INK_DARK, 'fill-opacity': 0.6, stroke: 'none',
    }));

    compassSvg.appendChild(g);
}

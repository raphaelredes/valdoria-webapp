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

/** Point at t (0-1) along an SVG path */
function _pointOnPath(pathD, t) {
    const tmp = document.createElementNS(NS, 'path');
    tmp.setAttribute('d', pathD);
    const svg = document.getElementById('map-svg');
    if (!svg) return { x: 0, y: 0 };
    svg.appendChild(tmp);
    const pt = tmp.getPointAtLength(tmp.getTotalLength() * t);
    svg.removeChild(tmp);
    return { x: pt.x, y: pt.y };
}

function renderRoads(group, fogState) {
    for (const [aId, bId] of CONNECTION_EDGES) {
        const af = fogState[aId], bf = fogState[bId];
        if (af === 'hidden' && bf === 'hidden') continue;
        const ac = LOCATION_COORDS[aId], bc = LOCATION_COORDS[bId];
        if (!ac || !bc) continue;

        const aPx = hexToPixel(ac.col, ac.row), bPx = hexToPixel(bc.col, bc.row);
        const bothExp = af === 'explored' && bf === 'explored';
        const anyExp = af === 'explored' || bf === 'explored';
        const isActive = (aId === S.currentLoc || bId === S.currentLoc) && bothExp;

        let lOp = 0.08, lW = 1.0, dash = '2 4';
        if (bothExp) { lOp = 0.45; lW = 1.8; dash = 'none'; }
        else if (anyExp) { lOp = 0.25; lW = 1.3; dash = '5 4'; }
        if (isActive) { lOp = 0.6; lW = 2.2; }
        if (af === 'frontier' || bf === 'frontier') lOp = Math.min(lOp, 0.06);

        // Organic multi-waypoint path
        const seed = ac.col * 31 + ac.row * 17 + bc.col * 13 + bc.row * 7;
        const pathD = _buildRoadPath(aPx, bPx, seed);

        // Main road (single ink line)
        const road = _el('path', { d: pathD, fill: 'none', class: `road-path${isActive ? ' active' : ''}`,
            'stroke-width': lW, 'stroke-opacity': lOp, 'stroke-linecap': 'round' });
        if (dash !== 'none') road.setAttribute('stroke-dasharray', dash);
        group.appendChild(road);

        // Distance badge on the curve midpoint
        if (anyExp) {
            const dist = getConnectionDistance(aId, bId);
            const mid = _pointOnPath(pathD, 0.5);
            const mx = mid.x + (srand(seed+99)-0.5)*4;
            const my = mid.y + (srand(seed+100)-0.5)*3;
            const txt = _el('text', { x: mx, y: my + 3, 'text-anchor': 'middle',
                'font-size': '8px', 'font-weight': '700', 'font-family': "'Cinzel', serif",
                fill: INK, 'fill-opacity': bothExp ? 0.45 : 0.25, 'pointer-events': 'none' });
            txt.textContent = dist;
            group.appendChild(txt);
        }
    }
}

// ── LOCATION MARKERS (ink-drawn symbols) ──

function _drawSettlementIcon(g, x, y, sz) {
    // Detailed castle: 2 towers with crenellations + center keep + gate
    const bw = sz * 0.9, bh = sz * 0.7;
    const tw = sz * 0.35, th = sz * 1.2;
    const sw = 0.5, so = 0.55; // pencil-soft stroke
    // Left tower body + roof
    g.appendChild(_el('rect', { x: x-bw-tw/2, y: y-th, width: tw, height: th,
        fill: INK_DARK, 'fill-opacity': 0.12, stroke: INK_DARK, 'stroke-width': sw, 'stroke-opacity': so }));
    g.appendChild(_el('path', { d: `M${x-bw-tw/2-2},${y-th} L${x-bw},${y-th-sz*0.45} L${x-bw+tw/2+2},${y-th}`,
        fill: INK_DARK, 'fill-opacity': 0.10, stroke: INK_DARK, 'stroke-width': sw*0.9, 'stroke-opacity': so }));
    // Left tower crenellations
    for (let c = 0; c < 3; c++) {
        const cx = x-bw-tw/2 + c * (tw/3);
        g.appendChild(_el('rect', { x: cx, y: y-th-1.5, width: tw/4, height: 1.5,
            fill: INK_DARK, 'fill-opacity': 0.18, stroke: 'none' }));
    }
    // Right tower body + roof
    g.appendChild(_el('rect', { x: x+bw-tw/2, y: y-th, width: tw, height: th,
        fill: INK_DARK, 'fill-opacity': 0.12, stroke: INK_DARK, 'stroke-width': sw, 'stroke-opacity': so }));
    g.appendChild(_el('path', { d: `M${x+bw-tw/2-2},${y-th} L${x+bw},${y-th-sz*0.45} L${x+bw+tw/2+2},${y-th}`,
        fill: INK_DARK, 'fill-opacity': 0.10, stroke: INK_DARK, 'stroke-width': sw*0.9, 'stroke-opacity': so }));
    // Right tower crenellations
    for (let c = 0; c < 3; c++) {
        const cx = x+bw-tw/2 + c * (tw/3);
        g.appendChild(_el('rect', { x: cx, y: y-th-1.5, width: tw/4, height: 1.5,
            fill: INK_DARK, 'fill-opacity': 0.18, stroke: 'none' }));
    }
    // Center keep (taller, with shadow)
    g.appendChild(_el('rect', { x: x-bw*0.4, y: y-bh, width: bw*0.8, height: bh,
        fill: INK_DARK, 'fill-opacity': 0.14, stroke: INK_DARK, 'stroke-width': sw*0.9, 'stroke-opacity': so }));
    // Wall between towers
    g.appendChild(_el('line', { x1: x-bw+tw/2, y1: y-bh*0.6, x2: x+bw-tw/2, y2: y-bh*0.6,
        stroke: INK_DARK, 'stroke-width': 0.3, 'stroke-opacity': 0.35 }));
    // Gate arch (larger, filled dark)
    g.appendChild(_el('path', { d: `M${x-2},${y} L${x-2},${y-bh*0.5} Q${x},${y-bh*0.7} ${x+2},${y-bh*0.5} L${x+2},${y}`,
        fill: INK_DARK, 'fill-opacity': 0.12, stroke: INK_DARK, 'stroke-width': 0.3, 'stroke-opacity': so }));
    // Flag on center keep
    g.appendChild(_el('line', { x1: x, y1: y-bh, x2: x, y2: y-bh-sz*0.4,
        stroke: INK_DARK, 'stroke-width': 0.25, 'stroke-opacity': 0.5 }));
    g.appendChild(_el('path', { d: `M${x},${y-bh-sz*0.4} L${x+sz*0.3},${y-bh-sz*0.3} L${x},${y-bh-sz*0.2}`,
        fill: INK_DARK, 'fill-opacity': 0.18, stroke: INK_DARK, 'stroke-width': 0.2, 'stroke-opacity': 0.4 }));
}

function _drawBiomeIcon(g, x, y, biome, sz, locName) {
    const nm = (locName || '').toLowerCase();
    const _sw = 0.5, _so = 0.55; // pencil-soft defaults

    // ── Name-based special icons (override biome) ──

    // Fort/stronghold
    if (nm.includes('forte') || nm.includes('fortaleza') || nm.includes('bastião')) {
        g.appendChild(_el('rect', { x: x-sz*0.6, y: y-sz*0.3, width: sz*1.2, height: sz*0.5,
            fill: INK_DARK, 'fill-opacity': 0.12, stroke: INK_DARK, 'stroke-width': _sw, 'stroke-opacity': _so }));
        g.appendChild(_el('rect', { x: x-sz*0.25, y: y-sz*1.1, width: sz*0.5, height: sz*1.3,
            fill: INK_DARK, 'fill-opacity': 0.14, stroke: INK_DARK, 'stroke-width': _sw, 'stroke-opacity': _so }));
        for (let c = 0; c < 3; c++) {
            g.appendChild(_el('rect', { x: x-sz*0.25 + c * sz*0.18, y: y-sz*1.2, width: sz*0.12, height: sz*0.12,
                fill: INK_DARK, 'fill-opacity': 0.18 }));
        }
        g.appendChild(_el('line', { x1: x, y1: y-sz*1.1, x2: x, y2: y-sz*1.5,
            stroke: INK_DARK, 'stroke-width': 0.25, 'stroke-opacity': 0.5 }));
        g.appendChild(_el('path', { d: `M${x},${y-sz*1.5} L${x+sz*0.35},${y-sz*1.4} L${x},${y-sz*1.3}`,
            fill: INK_DARK, 'fill-opacity': 0.15, stroke: INK_DARK, 'stroke-width': 0.2, 'stroke-opacity': 0.4 }));
        return;
    }
    // Ruins — broken columns with arch
    if (nm.includes('ruína') || nm.includes('ruinas') || nm.includes('ruínas')) {
        g.appendChild(_el('line', { x1: x-sz*0.5, y1: y+2, x2: x-sz*0.5, y2: y-sz*0.8,
            stroke: INK_DARK, 'stroke-width': 0.6, 'stroke-opacity': _so }));
        g.appendChild(_el('line', { x1: x+sz*0.5, y1: y+2, x2: x+sz*0.5, y2: y-sz*0.5,
            stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': _so }));
        g.appendChild(_el('path', { d: `M${x-sz*0.5},${y-sz*0.6} Q${x},${y-sz*1.2} ${x+sz*0.3},${y-sz*0.5}`,
            fill: 'none', stroke: INK_DARK, 'stroke-width': 0.35, 'stroke-opacity': 0.45, 'stroke-dasharray': '2 1.5' }));
        for (let i = 0; i < 4; i++) {
            g.appendChild(_el('circle', { cx: x + (srand(i*17)-0.5)*sz, cy: y+1+srand(i*23)*2,
                r: 0.6, fill: INK_DARK, 'fill-opacity': 0.25 }));
        }
        return;
    }
    // Underground passage — tunnel mouth with steps
    if (nm.includes('passagem') || nm.includes('túnel') || nm.includes('portal')) {
        g.appendChild(_el('path', { d: `M${x-sz*0.7},${y+2} Q${x-sz*0.7},${y-sz*0.6} ${x},${y-sz*0.8} Q${x+sz*0.7},${y-sz*0.6} ${x+sz*0.7},${y+2}`,
            fill: INK_DARK, 'fill-opacity': 0.15, stroke: INK_DARK, 'stroke-width': _sw, 'stroke-opacity': _so }));
        for (let i = 0; i < 3; i++) {
            const sy = y + 1 - i * 2;
            const sw = sz * (0.5 - i * 0.1);
            g.appendChild(_el('line', { x1: x-sw, y1: sy, x2: x+sw, y2: sy,
                stroke: INK_DARK, 'stroke-width': 0.4, 'stroke-opacity': 0.3 }));
        }
        return;
    }
    // Tower/lighthouse
    if (nm.includes('torre') || nm.includes('farol')) {
        g.appendChild(_el('rect', { x: x-sz*0.2, y: y-sz*1.3, width: sz*0.4, height: sz*1.5,
            fill: INK_DARK, 'fill-opacity': 0.12, stroke: INK_DARK, 'stroke-width': _sw, 'stroke-opacity': _so }));
        g.appendChild(_el('path', { d: `M${x-sz*0.35},${y-sz*1.3} L${x},${y-sz*1.7} L${x+sz*0.35},${y-sz*1.3}`,
            fill: INK_DARK, 'fill-opacity': 0.10, stroke: INK_DARK, 'stroke-width': _sw*0.9, 'stroke-opacity': _so }));
        return;
    }
    // Camp/tribe — tent with campfire
    if (nm.includes('acampamento') || nm.includes('tribo') || nm.includes('ninho')) {
        // Tent (triangular A-frame)
        g.appendChild(_el('path', {
            d: `M${x-sz*0.7},${y+2} L${x},${y-sz*0.9} L${x+sz*0.7},${y+2}`,
            fill: INK_DARK, 'fill-opacity': 0.12, stroke: INK_DARK, 'stroke-width': _sw, 'stroke-opacity': _so }));
        // Tent opening
        g.appendChild(_el('path', {
            d: `M${x-sz*0.2},${y+2} L${x},${y-sz*0.2} L${x+sz*0.2},${y+2}`,
            fill: INK_DARK, 'fill-opacity': 0.15, stroke: INK_DARK, 'stroke-width': 0.25, 'stroke-opacity': 0.4 }));
        // Small campfire to the side
        const fx = x + sz * 0.8, fy = y + 1;
        g.appendChild(_el('path', {
            d: `M${fx-1.5},${fy} Q${fx},${fy-3} ${fx+1.5},${fy}`,
            fill: 'none', stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': 0.5 }));
        // Smoke wisps
        g.appendChild(_el('path', {
            d: `M${fx},${fy-3} Q${fx+1},${fy-5} ${fx-0.5},${fy-6}`,
            fill: 'none', stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.3 }));
        return;
    }
    // Mountain pass — gap between two peaks
    if (nm.includes('passo') || nm.includes('desfiladeiro')) {
        // Left peak
        g.appendChild(_el('line', { x1: x-sz*1.2, y1: y+2, x2: x-sz*0.3, y2: y-sz*1.0,
            stroke: INK_DARK, 'stroke-width': 0.55, 'stroke-opacity': _so }));
        g.appendChild(_el('line', { x1: x-sz*0.3, y1: y-sz*1.0, x2: x-sz*0.1, y2: y-sz*0.2,
            stroke: INK_DARK, 'stroke-width': 0.4, 'stroke-opacity': _so }));
        // Right peak
        g.appendChild(_el('line', { x1: x+sz*0.1, y1: y-sz*0.2, x2: x+sz*0.4, y2: y-sz*1.1,
            stroke: INK_DARK, 'stroke-width': 0.55, 'stroke-opacity': _so }));
        g.appendChild(_el('line', { x1: x+sz*0.4, y1: y-sz*1.1, x2: x+sz*1.2, y2: y+2,
            stroke: INK_DARK, 'stroke-width': 0.4, 'stroke-opacity': _so }));
        // Pass gap (valley between)
        g.appendChild(_el('path', {
            d: `M${x-sz*0.1},${y-sz*0.2} Q${x},${y} ${x+sz*0.1},${y-sz*0.2}`,
            fill: 'none', stroke: INK_DARK, 'stroke-width': 0.4, 'stroke-opacity': 0.4 }));
        // Path through pass (dashed)
        g.appendChild(_el('line', { x1: x, y1: y+3, x2: x, y2: y-sz*0.1,
            stroke: INK_DARK, 'stroke-width': 0.4, 'stroke-dasharray': '1.5 1.5', 'stroke-opacity': 0.3 }));
        return;
    }
    // Field/plains (non-settlement open terrain)
    if (nm.includes('campo') || nm.includes('planície') || nm.includes('pradaria')) {
        // Wheat/grass stalks (3 curved blades)
        for (let i = -1; i <= 1; i++) {
            const gx = x + i * sz * 0.5;
            const gh = sz * 0.8 + Math.abs(i) * sz * 0.2;
            const lean = i * 1.5;
            g.appendChild(_el('path', {
                d: `M${gx},${y+2} Q${gx+lean*0.3},${y-gh*0.5} ${gx+lean},${y-gh}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.35, 'stroke-opacity': _so, 'stroke-linecap': 'round' }));
            // Seed head (small oval at tip)
            g.appendChild(_el('ellipse', { cx: gx+lean, cy: y-gh-1, rx: 0.8, ry: 1.8,
                fill: INK_DARK, 'fill-opacity': 0.18, stroke: INK_DARK, 'stroke-width': 0.2, 'stroke-opacity': 0.4 }));
        }
        // Ground line
        g.appendChild(_el('path', {
            d: `M${x-sz},${y+2} Q${x},${y+1} ${x+sz},${y+2}`,
            fill: 'none', stroke: INK_DARK, 'stroke-width': 0.3, 'stroke-opacity': 0.3 }));
        return;
    }
    // Crater/volcanic landmark
    if (nm.includes('cratera') || nm.includes('vulcã')) {
        // Wide crater rim
        g.appendChild(_el('ellipse', { cx: x, cy: y-sz*0.2, rx: sz*0.8, ry: sz*0.4,
            fill: INK_DARK, 'fill-opacity': 0.14, stroke: INK_DARK, 'stroke-width': _sw, 'stroke-opacity': _so }));
        // Inner darkness
        g.appendChild(_el('ellipse', { cx: x, cy: y-sz*0.2, rx: sz*0.5, ry: sz*0.25,
            fill: INK_DARK, 'fill-opacity': 0.15, stroke: 'none' }));
        // Rising smoke/heat
        for (let i = 0; i < 3; i++) {
            const sx = x + (i-1)*sz*0.3;
            g.appendChild(_el('path', {
                d: `M${sx},${y-sz*0.5} Q${sx+(i-1)*1.5},${y-sz*1.0} ${sx-(i-1)*0.5},${y-sz*1.4}`,
                fill: 'none', stroke: INK, 'stroke-width': 0.35, 'stroke-opacity': 0.3 }));
        }
        return;
    }
    // Frozen waste / icy terrain
    if (nm.includes('congelado') || nm.includes('ermo') || nm.includes('gelo') || nm.includes('gelado')) {
        // Icicle formation
        for (let i = -1; i <= 1; i++) {
            const ix = x + i * sz * 0.4;
            const ih = sz * (0.8 + Math.abs(i) * 0.3);
            g.appendChild(_el('polygon', {
                points: `${ix-sz*0.15},${y+1} ${ix},${y-ih} ${ix+sz*0.15},${y+1}`,
                fill: INK_LIGHT, 'fill-opacity': 0.15, stroke: INK_LIGHT, 'stroke-width': 0.5, 'stroke-opacity': 0.5 }));
        }
        // Frost crystal below
        const fy = y + 3;
        for (let a = 0; a < 3; a++) {
            const angle = a * Math.PI / 3;
            g.appendChild(_el('line', {
                x1: x - Math.cos(angle)*sz*0.3, y1: fy - Math.sin(angle)*sz*0.3,
                x2: x + Math.cos(angle)*sz*0.3, y2: fy + Math.sin(angle)*sz*0.3,
                stroke: INK_LIGHT, 'stroke-width': 0.3, 'stroke-opacity': 0.3 }));
        }
        return;
    }
    // Cemetery/graveyard
    if (nm.includes('cemitério') || nm.includes('catacumba') || nm.includes('necrópole')) {
        // Ground mound
        g.appendChild(_el('path', { d: `M${x-sz*0.6},${y+3} Q${x},${y+1} ${x+sz*0.6},${y+3}`,
            fill: 'none', stroke: INK_DARK, 'stroke-width': 0.25, 'stroke-opacity': 0.35 }));
        // Cross
        g.appendChild(_el('line', { x1: x, y1: y+2, x2: x, y2: y-sz*1.3,
            stroke: INK_DARK, 'stroke-width': 0.7, 'stroke-opacity': _so }));
        g.appendChild(_el('line', { x1: x-sz*0.5, y1: y-sz*0.6, x2: x+sz*0.5, y2: y-sz*0.6,
            stroke: INK_DARK, 'stroke-width': 0.6, 'stroke-opacity': _so }));
        return;
    }

    // ── Biome-based fallback icons ──
    switch (biome) {
        case 'forest':
            // Tree cluster (3 overlapping trees)
            for (let i = -1; i <= 1; i++) {
                const tx = x + i * sz * 0.5, tsz = sz * (i === 0 ? 0.7 : 0.5);
                g.appendChild(_el('line', { x1: tx, y1: y+2, x2: tx, y2: y-sz*0.8,
                    stroke: INK_DARK, 'stroke-width': 0.4, 'stroke-opacity': _so }));
                g.appendChild(_el('circle', { cx: tx, cy: y-sz*(i===0?1.2:1.0), r: tsz,
                    fill: INK_DARK, 'fill-opacity': 0.14, stroke: INK_DARK, 'stroke-width': 0.4, 'stroke-opacity': _so }));
            }
            break;
        case 'mountain':
            // Twin peaks with shadow
            g.appendChild(_el('polygon', { points: `${x-sz},${y+3} ${x-sz*0.2},${y-sz*1.3} ${x-sz*0.2},${y+3}`,
                fill: INK_DARK, 'fill-opacity': 0.14 }));
            g.appendChild(_el('line', { x1: x-sz, y1: y+3, x2: x-sz*0.2, y2: y-sz*1.3,
                stroke: INK_DARK, 'stroke-width': 0.65, 'stroke-opacity': _so }));
            g.appendChild(_el('line', { x1: x-sz*0.2, y1: y-sz*1.3, x2: x+sz, y2: y+3,
                stroke: INK_DARK, 'stroke-width': _sw, 'stroke-opacity': _so }));
            g.appendChild(_el('line', { x1: x+sz*0.2, y1: y+1, x2: x+sz*0.6, y2: y-sz*0.7,
                stroke: INK_DARK, 'stroke-width': 0.4, 'stroke-opacity': _so }));
            g.appendChild(_el('line', { x1: x+sz*0.6, y1: y-sz*0.7, x2: x+sz, y2: y+1,
                stroke: INK_DARK, 'stroke-width': 0.3, 'stroke-opacity': 0.45 }));
            break;
        case 'swamp':
            // Water lines + cypress stumps
            for (let i = 0; i < 3; i++) {
                const wy = y - 2 + i * 2.5;
                g.appendChild(_el('path', { d: `M${x-sz},${wy} Q${x},${wy-1.5} ${x+sz},${wy}`,
                    fill: 'none', stroke: INK_DARK, 'stroke-width': 0.3, 'stroke-opacity': 0.4 }));
            }
            // Cypress stump
            g.appendChild(_el('path', {
                d: `M${x-1},${y+2} L${x},${y-sz*0.6} L${x+1},${y+2}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.35, 'stroke-opacity': _so }));
            // Roots
            g.appendChild(_el('path', {
                d: `M${x},${y+1} Q${x-2.5},${y+2} ${x-3},${y+3}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.2, 'stroke-opacity': 0.4 }));
            g.appendChild(_el('path', {
                d: `M${x},${y+1} Q${x+2.5},${y+2} ${x+3},${y+3}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.2, 'stroke-opacity': 0.4 }));
            break;
        case 'cave':
            // Cave entrance with rocky surround
            g.appendChild(_el('path', {
                d: `M${x-sz*1.1},${y+3} L${x-sz*0.8},${y-sz*0.3} L${x-sz*0.4},${y-sz*0.9} L${x},${y-sz*1.2} L${x+sz*0.3},${y-sz*0.8} L${x+sz*0.7},${y-sz*0.2} L${x+sz*1.1},${y+3}`,
                fill: INK_DARK, 'fill-opacity': 0.10, stroke: INK_DARK, 'stroke-width': 0.4, 'stroke-opacity': _so }));
            g.appendChild(_el('path', {
                d: `M${x-sz*0.5},${y+3} Q${x-sz*0.5},${y-sz*0.3} ${x},${y-sz*0.5} Q${x+sz*0.5},${y-sz*0.3} ${x+sz*0.5},${y+3}`,
                fill: INK_DARK, 'fill-opacity': 0.15, stroke: INK_DARK, 'stroke-width': 0.35, 'stroke-opacity': _so }));
            g.appendChild(_el('line', { x1: x-sz*0.2, y1: y-sz*0.3, x2: x-sz*0.2, y2: y-sz*0.05,
                stroke: INK_DARK, 'stroke-width': 0.2, 'stroke-opacity': 0.35 }));
            g.appendChild(_el('line', { x1: x+sz*0.15, y1: y-sz*0.35, x2: x+sz*0.15, y2: y-sz*0.1,
                stroke: INK_DARK, 'stroke-width': 0.2, 'stroke-opacity': 0.35 }));
            break;
        case 'desert':
            // Dunes with wind marks
            g.appendChild(_el('path', { d: `M${x-sz*1.2},${y+2} Q${x-sz*0.3},${y-sz*0.5} ${x+sz*0.4},${y+2}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': _sw, 'stroke-opacity': _so }));
            g.appendChild(_el('path', { d: `M${x-sz*0.3},${y+2} Q${x+sz*0.5},${y-sz*0.3} ${x+sz*1.2},${y+2}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.35, 'stroke-opacity': 0.45 }));
            for (let i = 0; i < 3; i++) {
                const wx = x + (i-1)*sz*0.6, wy = y + 3 + i*0.5;
                g.appendChild(_el('line', { x1: wx-2, y1: wy, x2: wx+3, y2: wy,
                    stroke: INK_DARK, 'stroke-width': 0.2, 'stroke-opacity': 0.2 }));
            }
            break;
        case 'graveyard':
            g.appendChild(_el('path', { d: `M${x-sz*0.6},${y+3} Q${x},${y+1} ${x+sz*0.6},${y+3}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.25, 'stroke-opacity': 0.4 }));
            g.appendChild(_el('line', { x1: x, y1: y+2, x2: x, y2: y-sz*1.3,
                stroke: INK_DARK, 'stroke-width': 0.7, 'stroke-opacity': _so }));
            g.appendChild(_el('line', { x1: x-sz*0.5, y1: y-sz*0.6, x2: x+sz*0.5, y2: y-sz*0.6,
                stroke: INK_DARK, 'stroke-width': 0.6, 'stroke-opacity': _so }));
            break;
        case 'volcanic':
            // Volcano with smoke
            g.appendChild(_el('polygon', { points: `${x-sz*0.9},${y+3} ${x-1.5},${y-sz} ${x+1.5},${y-sz} ${x+sz*0.9},${y+3}`,
                fill: INK_DARK, 'fill-opacity': 0.12, stroke: INK_DARK, 'stroke-width': _sw, 'stroke-opacity': _so }));
            g.appendChild(_el('path', { d: `M${x-2},${y-sz} Q${x},${y-sz+2} ${x+2},${y-sz}`,
                fill: INK_DARK, 'fill-opacity': 0.18, stroke: INK_DARK, 'stroke-width': 0.3, 'stroke-opacity': 0.45 }));
            g.appendChild(_el('path', { d: `M${x},${y-sz} Q${x+2},${y-sz-3} ${x-1},${y-sz-6}`,
                fill: 'none', stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.25 }));
            break;
        case 'snow':
            // Ice crystal formation
            g.appendChild(_el('polygon', { points: `${x-sz*0.15},${y+1} ${x},${y-sz} ${x+sz*0.15},${y+1}`,
                fill: INK_LIGHT, 'fill-opacity': 0.12, stroke: INK_LIGHT, 'stroke-width': 0.3, 'stroke-opacity': 0.45 }));
            g.appendChild(_el('polygon', { points: `${x-sz*0.5},${y+1} ${x-sz*0.3},${y-sz*0.6} ${x-sz*0.15},${y+1}`,
                fill: INK_LIGHT, 'fill-opacity': 0.08, stroke: INK_LIGHT, 'stroke-width': 0.25, 'stroke-opacity': 0.4 }));
            g.appendChild(_el('polygon', { points: `${x+sz*0.15},${y+1} ${x+sz*0.35},${y-sz*0.5} ${x+sz*0.55},${y+1}`,
                fill: INK_LIGHT, 'fill-opacity': 0.08, stroke: INK_LIGHT, 'stroke-width': 0.25, 'stroke-opacity': 0.4 }));
            break;
        default:
            // Generic landmark: signpost
            g.appendChild(_el('line', { x1: x, y1: y+3, x2: x, y2: y-sz*1.0,
                stroke: INK_DARK, 'stroke-width': _sw, 'stroke-opacity': _so }));
            g.appendChild(_el('path', {
                d: `M${x},${y-sz*0.7} L${x+sz*0.6},${y-sz*0.8} L${x+sz*0.6},${y-sz*0.5} L${x},${y-sz*0.4}`,
                fill: INK_DARK, 'fill-opacity': 0.14, stroke: INK_DARK, 'stroke-width': 0.3, 'stroke-opacity': _so }));
    }
}

function renderLocationMarkers(group, fogState) {
    const currentAdj = new Set();
    for (const [a, b] of CONNECTION_EDGES) {
        if (a === S.currentLoc) currentAdj.add(b);
        if (b === S.currentLoc) currentAdj.add(a);
    }
    const R = 18;

    for (const [locId, coords] of Object.entries(LOCATION_COORDS)) {
        const fog = fogState[locId];
        if (fog === 'hidden') continue;
        const { x, y } = hexToPixel(coords.col, coords.row);
        const ld = S.locations[locId];
        const isCurr = locId === S.currentLoc;
        const isExp = fog === 'explored';
        const biome = ld?.b || 'plains';
        const name = ld?.n || '';
        const isSett = ld?.s || false;

        const ng = _el('g', { class: `loc-node ${fog}${isCurr ? ' current' : ''}`, 'data-loc': locId });

        // Invisible click target
        ng.appendChild(_el('circle', { cx: x, cy: y, r: R, fill: 'transparent', stroke: 'none' }));

        if (isCurr) {
            // Silhouette icon (larger) — no circle
            if (isSett) _drawSettlementIcon(ng, x, y + 4, 9);
            else _drawBiomeIcon(ng, x, y + 2, biome, 9, name);
        } else if (isExp) {
            // Silhouette icon — no circle
            if (isSett) _drawSettlementIcon(ng, x, y + 4, 8);
            else _drawBiomeIcon(ng, x, y + 2, biome, 8, name);
        } else if (fog === 'known_mapped') {
            // Faded silhouette
            ng.setAttribute('opacity', '0.45');
            if (isSett) _drawSettlementIcon(ng, x, y + 4, 7);
            else _drawBiomeIcon(ng, x, y + 2, biome, 7, name);
        } else if (fog === 'known_unmapped') {
            // Small ink mark
            ng.setAttribute('opacity', '0.3');
            ng.appendChild(_el('circle', { cx: x, cy: y, r: 2.5, fill: INK_DARK, 'fill-opacity': 0.35 }));
            ng.appendChild(_el('text', { x: x, y: y + 1.5, 'text-anchor': 'middle',
                'font-size': '6px', 'font-family': "'Cinzel', serif",
                fill: INK_DARK, 'fill-opacity': 0.5 })).textContent = '?';
        } else {
            // Frontier — tiny dot
            ng.setAttribute('opacity', '0.2');
            ng.appendChild(_el('circle', { cx: x, cy: y, r: 1.5, fill: INK_DARK, 'fill-opacity': 0.2 }));
        }

        // Label (multi-line for long names)
        if (isExp || isCurr) {
            const lines = _wrapLabel(name, 14);
            const lbl = _el('text', { x: x, y: y + R + 13, class: 'loc-label' });
            if (lines.length === 1) {
                lbl.textContent = lines[0];
            } else {
                for (let li = 0; li < lines.length; li++) {
                    const ts = _el('tspan', { x: x, dy: li === 0 ? '0' : '10' });
                    ts.textContent = lines[li];
                    lbl.appendChild(ts);
                }
            }
            ng.appendChild(lbl);
            // Decorative underline flourish
            const lastLine = lines[lines.length - 1];
            const lw = lastLine.length * 3.5;
            const uy = y + R + 16 + (lines.length - 1) * 10;
            ng.appendChild(_el('line', { x1: x - lw, y1: uy, x2: x + lw, y2: uy,
                stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.2 }));
            ng.appendChild(_el('line', { x1: x - lw, y1: uy - 1, x2: x - lw, y2: uy + 1,
                stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.15 }));
            ng.appendChild(_el('line', { x1: x + lw, y1: uy - 1, x2: x + lw, y2: uy + 1,
                stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.15 }));
        } else if (fog === 'known_mapped') {
            const lines = _wrapLabel(name, 14);
            const lbl = _el('text', { x: x, y: y + R + 11, class: 'loc-label', 'fill-opacity': 0.4 });
            if (lines.length === 1) {
                lbl.textContent = lines[0];
            } else {
                for (let li = 0; li < lines.length; li++) {
                    const ts = _el('tspan', { x: x, dy: li === 0 ? '0' : '10' });
                    ts.textContent = lines[li];
                    lbl.appendChild(ts);
                }
            }
            ng.appendChild(lbl);
        }

        // Click handler
        if (isExp || fog === 'known_mapped') {
            ng.addEventListener('click', e => { e.stopPropagation(); handleLocationTap(locId); });
        } else if (fog === 'known_unmapped' && currentAdj.has(locId)) {
            ng.style.cursor = 'pointer';
            ng.addEventListener('click', e => { e.stopPropagation(); handleLocationTap(locId); });
        }
        group.appendChild(ng);
    }
}

// ── PLAYER MARKER (simple pennant on pole) ──

function renderPlayerBanner(svg) {
    const coords = LOCATION_COORDS[S.currentLoc];
    if (!coords) return;
    const { x, y } = hexToPixel(coords.col, coords.row);
    const mg = _el('g', { class: 'player-marker' });

    const baseY = y - 3;
    const poleH = 26;
    const topY = baseY - poleH;

    // Thin pole
    mg.appendChild(_el('line', {
        x1: x, y1: baseY, x2: x, y2: topY,
        stroke: INK_DARK, 'stroke-width': 1.2, 'stroke-linecap': 'round',
    }));

    // Square flag with path morphing animation (cloth waving in wind)
    const flagG = _el('g', {});
    const fw = 13, fh = 10;
    const t = topY; // shorthand

    // 4 keyframe shapes: pole edge fixed, trailing edge morphs
    // Shape 1: resting (slight curve right)
    const d1 = `M${x},${t} L${x+fw},${t+1} C${x+fw+1},${t+fh*0.35} ${x+fw-1},${t+fh*0.65} ${x+fw},${t+fh} L${x},${t+fh} Z`;
    // Shape 2: wind pushes trailing edge right + wave
    const d2 = `M${x},${t} L${x+fw+3},${t+0} C${x+fw+4},${t+fh*0.3} ${x+fw+1},${t+fh*0.7} ${x+fw+2},${t+fh+1} L${x},${t+fh} Z`;
    // Shape 3: wind eases, trailing edge curves back
    const d3 = `M${x},${t} L${x+fw-1},${t+1} C${x+fw},${t+fh*0.4} ${x+fw-2},${t+fh*0.6} ${x+fw-1},${t+fh-1} L${x},${t+fh} Z`;
    // Shape 4: slight push again
    const d4 = `M${x},${t} L${x+fw+2},${t+1} C${x+fw+2},${t+fh*0.35} ${x+fw},${t+fh*0.65} ${x+fw+1},${t+fh} L${x},${t+fh} Z`;

    const flagPath = _el('path', {
        d: d1,
        fill: '#7b2020', 'fill-opacity': 0.85,
        stroke: INK_DARK, 'stroke-width': 0.6,
    });

    // Animate the 'd' attribute through keyframe shapes
    const morphAnim = _el('animate', {
        attributeName: 'd',
        values: `${d1};${d2};${d1};${d3};${d4};${d1}`,
        dur: '3s',
        repeatCount: 'indefinite',
        calcMode: 'spline',
        keySplines: '0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1',
    });
    flagPath.appendChild(morphAnim);
    flagG.appendChild(flagPath);

    mg.appendChild(flagG);
    svg.appendChild(mg);
}

// ── FOG WISPS ──

function renderFogWisps(svg, fogState) {
    const fG = _el('g', { class: 'fog-particles', 'pointer-events': 'none' });
    for (const [locId, state] of Object.entries(fogState)) {
        if (state !== 'known_mapped' && state !== 'known_unmapped' && state !== 'frontier') continue;
        const coords = LOCATION_COORDS[locId];
        if (!coords) continue;
        const { x, y } = hexToPixel(coords.col, coords.row);
        let cnt, bOp, fc;
        if (state === 'known_unmapped') { cnt = 5; bOp = 0.12; fc = INK_DARK; }
        else if (state === 'known_mapped') { cnt = 3; bOp = 0.06; fc = INK; }
        else { cnt = 4; bOp = 0.09; fc = INK_DARK; }

        for (let i = 0; i < cnt; i++) {
            const seed = coords.col * 1000 + coords.row * 100 + i;
            const cloud = _el('ellipse', {
                cx: x + (srand(seed) - 0.5) * 35, cy: y + (srand(seed + 50) - 0.5) * 22,
                rx: 14 + srand(seed + 100) * 12, ry: 7 + srand(seed + 150) * 6,
                fill: fc, 'fill-opacity': bOp + srand(seed + 200) * 0.05, class: 'fog-cloud',
            });
            cloud.style.animationDelay = `${(srand(seed + 300) * 6).toFixed(1)}s`;
            cloud.style.animationDuration = `${(6 + srand(seed + 400) * 5).toFixed(1)}s`;
            fG.appendChild(cloud);
        }
    }
    svg.appendChild(fG);
}

// ── CARTOGRAPHIC DECORATIONS ──

function renderCartographyDecor(svg, fogState) {
    const dG = _el('g', { class: 'deco-texts' });
    const texts = [
        { text: 'Aqui Ha Dragoes', col: 12, row: 14, size: 14, rot: -8 },
        { text: 'Terras Desconhecidas', col: 1, row: 2, size: 12, rot: 5 },
        { text: 'Perigo', col: 13, row: 6, size: 11, rot: -12 },
        { text: 'Confins do Mundo', col: 1, row: 14, size: 11, rot: 3 },
        { text: '~ mare incognitum ~', col: 7, row: 15, size: 10, rot: -2 },
        { text: 'Sombras Ancestrais', col: 8, row: 1, size: 11, rot: 6 },
    ];
    for (const t of texts) {
        const { x, y } = hexToPixel(t.col, t.row);
        const nearby = Object.entries(LOCATION_COORDS).filter(([, c]) => Math.abs(c.col - t.col) + Math.abs(c.row - t.row) <= 3);
        if (nearby.length > 0 && !nearby.every(([id]) => fogState[id] === 'hidden' || fogState[id] === 'frontier' || !fogState[id])) continue;
        const el = _el('text', { x, y, class: 'map-deco-text', 'font-size': t.size + 'px', transform: `rotate(${t.rot}, ${x}, ${y})` });
        el.textContent = t.text;
        dG.appendChild(el);
    }
    _drawSeaSerpent(dG, fogState);
    svg.appendChild(dG);
}

function _drawSeaSerpent(group, fogState) {
    const check = ['burning_crater', 'deep_swamp', 'valkrest'];
    if (!check.every(id => fogState[id] === 'hidden' || fogState[id] === 'frontier')) return;
    const sx = SVG_W - 90, sy = SVG_H - 100;
    const sg = _el('g', { opacity: '0.14' });
    sg.appendChild(_el('path', {
        d: `M${sx},${sy} C${sx + 10},${sy - 12} ${sx + 20},${sy - 8} ${sx + 25},${sy - 2}
            C${sx + 30},${sy + 5} ${sx + 38},${sy + 2} ${sx + 42},${sy - 6}
            C${sx + 48},${sy - 16} ${sx + 55},${sy - 18} ${sx + 62},${sy - 12}`,
        fill: 'none', stroke: INK, 'stroke-width': 3.5, 'stroke-linecap': 'round',
    }));
    sg.appendChild(_el('ellipse', { cx: sx + 63, cy: sy - 12, rx: 6, ry: 4, fill: INK, 'fill-opacity': 0.5 }));
    sg.appendChild(_el('circle', { cx: sx + 64.5, cy: sy - 13, r: 1.3, fill: INK_LIGHT }));
    sg.appendChild(_el('path', { d: `M${sx + 30},${sy - 6} L${sx + 28},${sy - 16} L${sx + 35},${sy - 8}`,
        fill: 'none', stroke: INK, 'stroke-width': 0.8 }));
    sg.appendChild(_el('path', { d: `M${sx},${sy} Q${sx - 5},${sy + 4} ${sx - 8},${sy - 2}`,
        fill: 'none', stroke: INK, 'stroke-width': 2, 'stroke-linecap': 'round' }));
    group.appendChild(sg);
}

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

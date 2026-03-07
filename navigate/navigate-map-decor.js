// ===============================================================
// NAVIGATE MAP — Borders, roads, markers, compass, decorations
// Hand-drawn ink style — no fills, no glow, no drop shadows
// ===============================================================

// ── ORNATE BORDER (ink manuscript frame) ──

function renderOrnamentBorder(svg) {
    const m = 12, c = INK;
    const g = _el('g', { class: 'border-ornament' });

    // Triple-line frame
    g.appendChild(_el('rect', { x: m, y: m, width: SVG_W - m * 2, height: SVG_H - m * 2,
        fill: 'none', stroke: c, 'stroke-width': 2.5, 'stroke-opacity': 0.3 }));
    g.appendChild(_el('rect', { x: m + 5, y: m + 5, width: SVG_W - m * 2 - 10, height: SVG_H - m * 2 - 10,
        fill: 'none', stroke: c, 'stroke-width': 0.6, 'stroke-opacity': 0.2 }));
    g.appendChild(_el('rect', { x: m + 8, y: m + 8, width: SVG_W - m * 2 - 16, height: SVG_H - m * 2 - 16,
        fill: 'none', stroke: c, 'stroke-width': 0.3, 'stroke-dasharray': '2 3', 'stroke-opacity': 0.15 }));

    // Corner flourishes (ink curls)
    const corners = [[m, m, 1, 1], [SVG_W - m, m, -1, 1], [m, SVG_H - m, 1, -1], [SVG_W - m, SVG_H - m, -1, -1]];
    for (const [cx, cy, dx, dy] of corners) {
        const curl1 = `M${cx},${cy} C${cx + 30 * dx},${cy} ${cx + 35 * dx},${cy + 15 * dy} ${cx + 28 * dx},${cy + 22 * dy}
            C${cx + 22 * dx},${cy + 28 * dy} ${cx + 12 * dx},${cy + 24 * dy} ${cx + 16 * dx},${cy + 18 * dy}`;
        g.appendChild(_el('path', { d: curl1, fill: 'none', stroke: c, 'stroke-width': 1.2, 'stroke-opacity': 0.25 }));
        const curl2 = `M${cx},${cy} C${cx},${cy + 30 * dy} ${cx + 15 * dx},${cy + 35 * dy} ${cx + 22 * dx},${cy + 28 * dy}
            C${cx + 28 * dx},${cy + 22 * dy} ${cx + 24 * dx},${cy + 12 * dy} ${cx + 18 * dx},${cy + 16 * dy}`;
        g.appendChild(_el('path', { d: curl2, fill: 'none', stroke: c, 'stroke-width': 1.2, 'stroke-opacity': 0.25 }));
        // Small ink dot at corner (instead of diamond jewel)
        g.appendChild(_el('circle', { cx: cx + 5 * dx, cy: cy + 5 * dy, r: 2,
            fill: c, 'fill-opacity': 0.2, stroke: c, 'stroke-width': 0.4, 'stroke-opacity': 0.3 }));
    }

    // Title cartouche (scroll banner at top, stroke only)
    const tcx = SVG_W / 2;
    const cartG = _el('g', { opacity: '0.4' });
    const bw = 110, bh = 18;
    const banner = `M${tcx - bw},${m + 3} Q${tcx - bw + 8},${m - 6} ${tcx - bw + 18},${m + 3}
        L${tcx + bw - 18},${m + 3} Q${tcx + bw - 8},${m - 6} ${tcx + bw},${m + 3}
        L${tcx + bw - 2},${m + bh} Q${tcx + bw - 10},${m + bh + 5} ${tcx + bw - 20},${m + bh}
        L${tcx - bw + 20},${m + bh} Q${tcx - bw + 10},${m + bh + 5} ${tcx - bw + 2},${m + bh} Z`;
    cartG.appendChild(_el('path', { d: banner, fill: OCEAN_BG, stroke: c, 'stroke-width': 1 }));
    const titleT = _el('text', { x: tcx, y: m + bh - 3, 'text-anchor': 'middle',
        'font-size': '11px', 'font-family': "'Cinzel Decorative', serif", 'font-weight': '700', fill: INK });
    titleT.textContent = 'VALDORIA';
    cartG.appendChild(titleT);
    g.appendChild(cartG);

    svg.appendChild(g);
}

// ── CONNECTION ROADS (ink paths) ──

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

        let lOp = 0.06, lW = 0.8, dash = '2 4';
        if (bothExp) { lOp = 0.3; lW = 1.5; dash = 'none'; }
        else if (anyExp) { lOp = 0.15; lW = 1.0; dash = '5 4'; }
        if (isActive) { lOp = 0.45; lW = 2.0; }
        if (af === 'frontier' || bf === 'frontier') lOp = Math.min(lOp, 0.05);

        // Organic curve
        const seed = ac.col * 31 + ac.row * 17 + bc.col * 13 + bc.row * 7;
        const mx = (aPx.x + bPx.x) / 2, my = (aPx.y + bPx.y) / 2;
        const dx = bPx.x - aPx.x, dy = bPx.y - aPx.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const px = -dy / len, py = dx / len;
        const jit = (srand(seed) - 0.5) * 12;
        const midX = mx + px * jit, midY = my + py * jit;
        const pathD = `M${aPx.x},${aPx.y} Q${midX},${midY} ${bPx.x},${bPx.y}`;

        // Main road (single ink line)
        const road = _el('path', { d: pathD, fill: 'none', class: `road-path${isActive ? ' active' : ''}`,
            'stroke-width': lW, 'stroke-opacity': lOp, 'stroke-linecap': 'round' });
        if (dash !== 'none') road.setAttribute('stroke-dasharray', dash);
        group.appendChild(road);

        // Distance badge (number only, no circle background)
        if (anyExp) {
            const dist = getConnectionDistance(aId, bId);
            const txt = _el('text', { x: midX, y: midY + 3, 'text-anchor': 'middle',
                'font-size': '8px', 'font-weight': '700', 'font-family': "'Cinzel', serif",
                fill: INK, 'fill-opacity': bothExp ? 0.4 : 0.25, 'pointer-events': 'none' });
            txt.textContent = dist;
            group.appendChild(txt);
        }
    }
}

// ── LOCATION MARKERS (ink-drawn symbols) ──

function _drawSettlementIcon(g, x, y, sz) {
    // Small castle: 2 towers + center building
    const bw = sz * 0.8, bh = sz * 0.6;
    const tw = sz * 0.3, th = sz * 1.0;
    // Left tower
    g.appendChild(_el('rect', { x: x-bw-tw/2, y: y-th, width: tw, height: th,
        fill: 'none', stroke: INK_DARK, 'stroke-width': 0.7 }));
    g.appendChild(_el('path', { d: `M${x-bw-tw/2-1},${y-th} L${x-bw},${y-th-sz*0.35} L${x-bw+tw/2+1},${y-th}`,
        fill: 'none', stroke: INK_DARK, 'stroke-width': 0.6 }));
    // Right tower
    g.appendChild(_el('rect', { x: x+bw-tw/2, y: y-th, width: tw, height: th,
        fill: 'none', stroke: INK_DARK, 'stroke-width': 0.7 }));
    g.appendChild(_el('path', { d: `M${x+bw-tw/2-1},${y-th} L${x+bw},${y-th-sz*0.35} L${x+bw+tw/2+1},${y-th}`,
        fill: 'none', stroke: INK_DARK, 'stroke-width': 0.6 }));
    // Center building
    g.appendChild(_el('rect', { x: x-bw*0.5, y: y-bh, width: bw, height: bh,
        fill: 'none', stroke: INK_DARK, 'stroke-width': 0.6 }));
    // Center door
    g.appendChild(_el('path', { d: `M${x-1.5},${y} L${x-1.5},${y-bh*0.4} Q${x},${y-bh*0.55} ${x+1.5},${y-bh*0.4} L${x+1.5},${y}`,
        fill: 'none', stroke: INK_DARK, 'stroke-width': 0.4 }));
}

function _drawBiomeIcon(g, x, y, biome, sz) {
    switch (biome) {
        case 'forest':
            // Larger tree
            g.appendChild(_el('line', { x1: x, y1: y+2, x2: x, y2: y-sz*1.2,
                stroke: INK_DARK, 'stroke-width': 0.8, 'stroke-linecap': 'round' }));
            g.appendChild(_el('circle', { cx: x, cy: y-sz*1.5, r: sz*0.6,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.7 }));
            break;
        case 'mountain':
            // Single prominent peak
            g.appendChild(_el('line', { x1: x-sz, y1: y+3, x2: x, y2: y-sz*1.3,
                stroke: INK_DARK, 'stroke-width': 1.0, 'stroke-linecap': 'round' }));
            g.appendChild(_el('line', { x1: x, y1: y-sz*1.3, x2: x+sz, y2: y+3,
                stroke: INK_DARK, 'stroke-width': 0.8, 'stroke-linecap': 'round' }));
            for (let j = 0; j < 3; j++) {
                const t = 0.25 + j * 0.2;
                g.appendChild(_el('line', { x1: x-sz+sz*t, y1: y+3+(y-sz*1.3-y-3)*t, x2: x-sz+sz*t+1.5, y2: y+3+(y-sz*1.3-y-3)*t+2,
                    stroke: INK_DARK, 'stroke-width': 0.3, 'stroke-opacity': 0.5 }));
            }
            break;
        case 'swamp':
            // Wavy lines
            for (let i = 0; i < 3; i++) {
                const wy = y - 3 + i * 3;
                g.appendChild(_el('path', { d: `M${x-sz},${wy} Q${x},${wy-2} ${x+sz},${wy}`,
                    fill: 'none', stroke: INK_DARK, 'stroke-width': 0.6, 'stroke-opacity': 0.6 }));
            }
            break;
        case 'cave':
            // Arch opening
            g.appendChild(_el('path', { d: `M${x-sz*0.7},${y+3} Q${x-sz*0.7},${y-sz*0.8} ${x},${y-sz} Q${x+sz*0.7},${y-sz*0.8} ${x+sz*0.7},${y+3}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.8 }));
            break;
        case 'desert':
            // Small tent
            g.appendChild(_el('path', { d: `M${x-sz},${y+2} L${x},${y-sz} L${x+sz},${y+2}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.7 }));
            g.appendChild(_el('line', { x1: x, y1: y-sz, x2: x, y2: y-sz-3,
                stroke: INK_DARK, 'stroke-width': 0.5 }));
            break;
        case 'graveyard':
            // Cross
            g.appendChild(_el('line', { x1: x, y1: y+3, x2: x, y2: y-sz*1.2,
                stroke: INK_DARK, 'stroke-width': 1.0 }));
            g.appendChild(_el('line', { x1: x-sz*0.5, y1: y-sz*0.5, x2: x+sz*0.5, y2: y-sz*0.5,
                stroke: INK_DARK, 'stroke-width': 0.8 }));
            break;
        case 'volcanic':
            // Smoking peak
            g.appendChild(_el('line', { x1: x-sz*0.8, y1: y+3, x2: x-1, y2: y-sz,
                stroke: INK_DARK, 'stroke-width': 0.8 }));
            g.appendChild(_el('line', { x1: x+1, y1: y-sz, x2: x+sz*0.8, y2: y+3,
                stroke: INK_DARK, 'stroke-width': 0.6 }));
            g.appendChild(_el('path', { d: `M${x},${y-sz} Q${x+2},${y-sz-4} ${x-1},${y-sz-7}`,
                fill: 'none', stroke: INK, 'stroke-width': 0.4, 'stroke-opacity': 0.4 }));
            break;
        case 'snow':
            // Small peak with dots
            g.appendChild(_el('line', { x1: x-sz*0.7, y1: y+2, x2: x, y2: y-sz,
                stroke: INK_DARK, 'stroke-width': 0.8 }));
            g.appendChild(_el('line', { x1: x, y1: y-sz, x2: x+sz*0.7, y2: y+2,
                stroke: INK_DARK, 'stroke-width': 0.6 }));
            for (let i = 0; i < 3; i++) {
                g.appendChild(_el('circle', { cx: x+(srand(x+i*3)-0.5)*sz, cy: y-sz+srand(x+i*3+1)*sz*0.3, r: 0.4,
                    fill: INK_LIGHT, 'fill-opacity': 0.3 }));
            }
            break;
        default:
            // Plains: small house
            g.appendChild(_el('rect', { x: x-sz*0.5, y: y-sz*0.4, width: sz, height: sz*0.6,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.6 }));
            g.appendChild(_el('path', { d: `M${x-sz*0.6},${y-sz*0.4} L${x},${y-sz} L${x+sz*0.6},${y-sz*0.4}`,
                fill: 'none', stroke: INK_DARK, 'stroke-width': 0.6 }));
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
            // Double ink circle around current location
            ng.appendChild(_el('circle', { cx: x, cy: y, r: R + 2, fill: 'none',
                stroke: INK, 'stroke-width': 1.5, 'stroke-opacity': 0.6 }));
            ng.appendChild(_el('circle', { cx: x, cy: y, r: R - 3, fill: 'none',
                stroke: INK, 'stroke-width': 0.6, 'stroke-opacity': 0.3, 'stroke-dasharray': '3 2' }));
            // Draw symbol
            if (isSett) _drawSettlementIcon(ng, x, y + 4, 7);
            else _drawBiomeIcon(ng, x, y + 2, biome, 7);
        } else if (isExp) {
            // Single ink circle
            ng.appendChild(_el('circle', { cx: x, cy: y, r: R - 2, fill: 'none',
                stroke: INK_DARK, 'stroke-width': 0.8, 'stroke-opacity': 0.5 }));
            // Draw symbol
            if (isSett) _drawSettlementIcon(ng, x, y + 4, 6);
            else _drawBiomeIcon(ng, x, y + 2, biome, 6);
        } else if (fog === 'known_mapped') {
            // Dashed circle + faded symbol
            ng.setAttribute('opacity', '0.5');
            ng.appendChild(_el('circle', { cx: x, cy: y, r: R - 4, fill: 'none',
                stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-dasharray': '3 3' }));
            if (isSett) _drawSettlementIcon(ng, x, y + 4, 5);
            else _drawBiomeIcon(ng, x, y + 2, biome, 5);
        } else if (fog === 'known_unmapped') {
            // Faded dot
            ng.setAttribute('opacity', '0.3');
            ng.appendChild(_el('circle', { cx: x, cy: y, r: 3, fill: INK_DARK, 'fill-opacity': 0.3 }));
        } else {
            // Frontier — tiny dot
            ng.setAttribute('opacity', '0.25');
            ng.appendChild(_el('circle', { cx: x, cy: y, r: 2, fill: INK_DARK, 'fill-opacity': 0.2 }));
        }

        // Label
        if (isExp || isCurr) {
            const short = name.length > 16 ? name.slice(0, 14) + '..' : name;
            const lbl = _el('text', { x: x, y: y + R + 13, class: 'loc-label' });
            lbl.textContent = short;
            ng.appendChild(lbl);
            // Decorative underline flourish
            const lw = short.length * 3.5;
            ng.appendChild(_el('line', { x1: x - lw, y1: y + R + 16, x2: x + lw, y2: y + R + 16,
                stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.2 }));
            // Small serif ticks at ends
            ng.appendChild(_el('line', { x1: x - lw, y1: y + R + 15, x2: x - lw, y2: y + R + 17,
                stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.15 }));
            ng.appendChild(_el('line', { x1: x + lw, y1: y + R + 15, x2: x + lw, y2: y + R + 17,
                stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.15 }));
        } else if (fog === 'known_mapped') {
            const lbl = _el('text', { x: x, y: y + R + 11, class: 'loc-label', 'fill-opacity': 0.4 });
            lbl.textContent = name.length > 16 ? name.slice(0, 14) + '..' : name;
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

// ── PLAYER BANNER (ink pennant) ──

function renderPlayerBanner(svg) {
    const coords = LOCATION_COORDS[S.currentLoc];
    if (!coords) return;
    const { x, y } = hexToPixel(coords.col, coords.row);
    const mg = _el('g', { class: 'player-marker' });
    // Pole
    const poleTop = y - 28;
    mg.appendChild(_el('line', { x1: x + 12, y1: y - 8, x2: x + 12, y2: poleTop,
        stroke: INK_DARK, 'stroke-width': 1.2, 'stroke-linecap': 'round' }));
    // Triangular pennant
    mg.appendChild(_el('path', {
        d: `M${x+12},${poleTop} L${x+24},${poleTop+5} L${x+12},${poleTop+10}`,
        fill: 'none', stroke: INK, 'stroke-width': 0.8,
    }));
    // Small X mark on pennant
    const cx = x + 17, cy = poleTop + 5;
    mg.appendChild(_el('line', { x1: cx-2, y1: cy-2, x2: cx+2, y2: cy+2,
        stroke: INK, 'stroke-width': 0.5, 'stroke-opacity': 0.6 }));
    mg.appendChild(_el('line', { x1: cx+2, y1: cy-2, x2: cx-2, y2: cy+2,
        stroke: INK, 'stroke-width': 0.5, 'stroke-opacity': 0.6 }));
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

function renderCompassRose(svg) {
    const cx = SVG_W - 55, cy = SVG_H - 55, r = 24;
    const g = _el('g', { class: 'compass-rose', opacity: '0.45' });

    // Outer rings (thicker ink)
    g.appendChild(_el('circle', { cx, cy, r: r + 6, fill: 'none', stroke: INK, 'stroke-width': 0.6 }));
    g.appendChild(_el('circle', { cx, cy, r: r + 3, fill: 'none', stroke: INK, 'stroke-width': 1.4 }));
    g.appendChild(_el('circle', { cx, cy, r: r, fill: 'none', stroke: INK, 'stroke-width': 0.5 }));

    // Tick marks (32 points)
    for (let i = 0; i < 32; i++) {
        const a = (i * 11.25) * Math.PI / 180;
        const inner = i % 8 === 0 ? r + 1 : i % 4 === 0 ? r + 2 : r + 2.5;
        const outer = r + 5;
        const sw = i % 8 === 0 ? 0.8 : 0.3;
        g.appendChild(_el('line', {
            x1: cx + Math.cos(a) * inner, y1: cy + Math.sin(a) * inner,
            x2: cx + Math.cos(a) * outer, y2: cy + Math.sin(a) * outer,
            stroke: INK, 'stroke-width': sw,
        }));
    }

    // 8-point star needles (flat ink, no depth shading)
    const needle = _el('g', { class: 'compass-needle' });
    const cards = [
        { a: -90, len: r, w: 6, col: INK, op: 0.8 },       // N
        { a: 90, len: r * 0.8, w: 5, col: INK_DARK, op: 0.5 }, // S
        { a: 0, len: r * 0.7, w: 4, col: INK, op: 0.4 },       // E
        { a: 180, len: r * 0.7, w: 4, col: INK, op: 0.4 },      // W
    ];
    for (const c of cards) {
        const rad = c.a * Math.PI / 180;
        const tx = cx + Math.cos(rad) * c.len, ty = cy + Math.sin(rad) * c.len;
        const px1 = cx + Math.cos(rad + Math.PI / 2) * c.w, py1 = cy + Math.sin(rad + Math.PI / 2) * c.w;
        const px2 = cx + Math.cos(rad - Math.PI / 2) * c.w, py2 = cy + Math.sin(rad - Math.PI / 2) * c.w;
        // Full needle (outline only for hand-drawn feel)
        needle.appendChild(_el('polygon', {
            points: `${tx},${ty} ${px1},${py1} ${px2},${py2}`,
            fill: 'none', stroke: c.col, 'stroke-width': 0.6, opacity: c.op,
        }));
    }
    // Intercardinals
    for (const a of [-45, 45, 135, -135]) {
        const rad = a * Math.PI / 180;
        const tx = cx + Math.cos(rad) * r * 0.5, ty = cy + Math.sin(rad) * r * 0.5;
        needle.appendChild(_el('polygon', {
            points: `${tx},${ty} ${cx + Math.cos(rad + 0.4) * 3.5},${cy + Math.sin(rad + 0.4) * 3.5} ${cx + Math.cos(rad - 0.4) * 3.5},${cy + Math.sin(rad - 0.4) * 3.5}`,
            fill: 'none', stroke: INK, 'stroke-width': 0.4, opacity: '0.3',
        }));
    }
    // Center (simple ink circle)
    needle.appendChild(_el('circle', { cx, cy, r: 3, fill: 'none', stroke: INK, 'stroke-width': 1.0 }));
    needle.appendChild(_el('circle', { cx, cy, r: 1, fill: INK_DARK }));
    g.appendChild(needle);

    // Labels
    for (const l of [{ ch: 'N', dx: 0, dy: -r - 10 }, { ch: 'S', dx: 0, dy: r + 14 }, { ch: 'L', dx: r + 10, dy: 3 }, { ch: 'O', dx: -r - 10, dy: 3 }]) {
        const t = _el('text', { x: cx + l.dx, y: cy + l.dy, 'text-anchor': 'middle',
            'font-size': '8px', 'font-family': "'Cinzel', serif", 'font-weight': '700', fill: INK, 'fill-opacity': '0.6' });
        t.textContent = l.ch;
        g.appendChild(t);
    }
    svg.appendChild(g);
}

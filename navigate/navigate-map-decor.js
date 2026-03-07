// ===============================================================
// NAVIGATE MAP — Borders, roads, markers, compass, decorations
// Medieval manuscript illumination + cartographic elements
// ===============================================================

// ── ORNATE BORDER (illuminated manuscript style) ──

function renderOrnamentBorder(svg) {
    const m = 12, c = '#704214';
    const g = _el('g', { class: 'border-ornament' });

    // Triple-line frame (outer thick, middle thin, inner dotted)
    g.appendChild(_el('rect', { x: m, y: m, width: SVG_W - m * 2, height: SVG_H - m * 2,
        fill: 'none', stroke: c, 'stroke-width': 2.5, 'stroke-opacity': 0.3 }));
    g.appendChild(_el('rect', { x: m + 5, y: m + 5, width: SVG_W - m * 2 - 10, height: SVG_H - m * 2 - 10,
        fill: 'none', stroke: c, 'stroke-width': 0.6, 'stroke-opacity': 0.2 }));
    g.appendChild(_el('rect', { x: m + 8, y: m + 8, width: SVG_W - m * 2 - 16, height: SVG_H - m * 2 - 16,
        fill: 'none', stroke: c, 'stroke-width': 0.3, 'stroke-dasharray': '2 3', 'stroke-opacity': 0.15 }));

    // Corner illuminations (ornate knotwork flourish)
    const corners = [[m, m, 1, 1], [SVG_W - m, m, -1, 1], [m, SVG_H - m, 1, -1], [SVG_W - m, SVG_H - m, -1, -1]];
    for (const [cx, cy, dx, dy] of corners) {
        // Main spiral curl
        const curl1 = `M${cx},${cy} C${cx + 30 * dx},${cy} ${cx + 35 * dx},${cy + 15 * dy} ${cx + 28 * dx},${cy + 22 * dy}
            C${cx + 22 * dx},${cy + 28 * dy} ${cx + 12 * dx},${cy + 24 * dy} ${cx + 16 * dx},${cy + 18 * dy}`;
        g.appendChild(_el('path', { d: curl1, fill: 'none', stroke: c, 'stroke-width': 1.2, 'stroke-opacity': 0.25 }));
        // Mirror curl (vertical)
        const curl2 = `M${cx},${cy} C${cx},${cy + 30 * dy} ${cx + 15 * dx},${cy + 35 * dy} ${cx + 22 * dx},${cy + 28 * dy}
            C${cx + 28 * dx},${cy + 22 * dy} ${cx + 24 * dx},${cy + 12 * dy} ${cx + 18 * dx},${cy + 16 * dy}`;
        g.appendChild(_el('path', { d: curl2, fill: 'none', stroke: c, 'stroke-width': 1.2, 'stroke-opacity': 0.25 }));
        // Center diamond jewel
        const jx = cx + 5 * dx, jy = cy + 5 * dy;
        g.appendChild(_el('polygon', {
            points: `${jx},${jy - 4 * dy} ${jx + 4 * dx},${jy} ${jx},${jy + 4 * dy} ${jx - 4 * dx},${jy}`,
            fill: '#c4953a', 'fill-opacity': 0.2, stroke: c, 'stroke-width': 0.5, 'stroke-opacity': 0.3,
        }));
    }

    // Title cartouche (scroll banner at top)
    const tcx = SVG_W / 2;
    const cartG = _el('g', { opacity: '0.4' });
    const bw = 110, bh = 18;
    // Scroll shape with curled ends
    const banner = `M${tcx - bw},${m + 3} Q${tcx - bw + 8},${m - 6} ${tcx - bw + 18},${m + 3}
        L${tcx + bw - 18},${m + 3} Q${tcx + bw - 8},${m - 6} ${tcx + bw},${m + 3}
        L${tcx + bw - 2},${m + bh} Q${tcx + bw - 10},${m + bh + 5} ${tcx + bw - 20},${m + bh}
        L${tcx - bw + 20},${m + bh} Q${tcx - bw + 10},${m + bh + 5} ${tcx - bw + 2},${m + bh} Z`;
    cartG.appendChild(_el('path', { d: banner, fill: '#2a2420', stroke: c, 'stroke-width': 1 }));
    const titleT = _el('text', { x: tcx, y: m + bh - 3, 'text-anchor': 'middle',
        'font-size': '11px', 'font-family': "'Cinzel Decorative', serif", 'font-weight': '700', fill: '#c4953a' });
    titleT.textContent = 'VALDORIA';
    cartG.appendChild(titleT);
    g.appendChild(cartG);

    svg.appendChild(g);
}

// ── CONNECTION ROADS (worn medieval paths) ──

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

        let lOp = 0.06, lW = 1.0, dash = '5 4';
        if (bothExp) { lOp = 0.35; lW = 2.0; dash = 'none'; }
        else if (anyExp) { lOp = 0.18; lW = 1.5; dash = '8 5'; }
        if (isActive) { lOp = 0.55; lW = 2.5; }
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

        // Road bed (wider, darker)
        if (bothExp) {
            group.appendChild(_el('path', { d: pathD, fill: 'none', stroke: '#1a1510',
                'stroke-width': lW + 2, 'stroke-opacity': lOp * 0.25, 'stroke-linecap': 'round' }));
        }

        // Main road
        const road = _el('path', { d: pathD, fill: 'none', class: `road-path${isActive ? ' active' : ''}`,
            'stroke-width': lW, 'stroke-opacity': lOp, 'stroke-linecap': 'round' });
        if (dash !== 'none') road.setAttribute('stroke-dasharray', dash);
        group.appendChild(road);

        // Worn path edge marks (dots along road for explored)
        if (bothExp) {
            for (let t = 0.15; t < 0.86; t += 0.35) {
                const tt = t + (srand(seed + t * 100) - 0.5) * 0.1;
                const ptX = aPx.x * (1 - tt) * (1 - tt) + 2 * midX * tt * (1 - tt) + bPx.x * tt * tt;
                const ptY = aPx.y * (1 - tt) * (1 - tt) + 2 * midY * tt * (1 - tt) + bPx.y * tt * tt;
                const side = (srand(seed + t * 200) > 0.5 ? 1 : -1) * (lW + 2);
                group.appendChild(_el('circle', {
                    cx: ptX + px * side, cy: ptY + py * side, r: 0.8,
                    fill: '#5a4a30', 'fill-opacity': lOp * 0.5,
                }));
            }
        }

        // Distance badge
        if (anyExp) {
            const dist = getConnectionDistance(aId, bId);
            group.appendChild(_el('circle', { cx: midX, cy: midY, r: 8,
                fill: '#2a2420', 'fill-opacity': 0.92, stroke: bothExp ? '#704214' : '#3a3028', 'stroke-width': 0.8 }));
            const txt = _el('text', { x: midX, y: midY + 3, 'text-anchor': 'middle',
                'font-size': '8px', 'font-weight': '700', 'font-family': "'Cinzel', serif",
                fill: bothExp ? '#8a7060' : '#5a4a3a', 'pointer-events': 'none' });
            txt.textContent = dist;
            group.appendChild(txt);
        }
    }
}

// ── LOCATION MARKERS (illustrated settlements & POIs) ──

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
        const bInfo = BIOME_INFO[biome] || BIOME_INFO.plains;
        const danger = ld?.d || 0;
        const icon = ld?.i || '?';
        const name = ld?.n || '';
        const isSett = ld?.s || false;

        const ng = _el('g', { class: `loc-node ${fog}${isCurr ? ' current' : ''}`, 'data-loc': locId });

        if (isCurr) {
            // Golden radiant glow
            ng.appendChild(_el('circle', { cx: x, cy: y, r: R + 14, fill: 'url(#current-glow)', 'pointer-events': 'none' }));
            ng.appendChild(_el('circle', { cx: x, cy: y, r: R + 3, fill: '#3a3028', stroke: '#c4953a', 'stroke-width': 2.5, filter: 'url(#marker-shadow)' }));
            ng.appendChild(_el('circle', { cx: x, cy: y, r: R - 2, fill: 'none', stroke: '#c4953a', 'stroke-width': 0.6, 'stroke-opacity': 0.35 }));
        } else if (isExp) {
            const bc = getDangerColor(danger);
            ng.appendChild(_el('circle', { cx: x, cy: y, r: R + 1, fill: bInfo.hexFill, stroke: bc, 'stroke-width': 1.8, filter: 'url(#marker-shadow)' }));
            if (isSett) {
                ng.appendChild(_el('circle', { cx: x, cy: y, r: R - 3, fill: 'none', stroke: '#c4953a', 'stroke-width': 0.7, 'stroke-dasharray': '3 2', 'stroke-opacity': 0.5 }));
            }
        } else if (fog === 'known_mapped') {
            ng.setAttribute('opacity', '0.6');
            ng.appendChild(_el('circle', { cx: x, cy: y, r: R - 2, fill: bInfo.hexFill, stroke: '#4a3a28', 'stroke-width': 1, 'fill-opacity': 0.45 }));
        } else if (fog === 'known_unmapped') {
            ng.setAttribute('filter', 'url(#fog-blur)');
            ng.setAttribute('opacity', '0.35');
            ng.appendChild(_el('circle', { cx: x, cy: y, r: R - 4, fill: '#2a2420', stroke: '#3a3028', 'stroke-width': 0.8 }));
        } else {
            ng.setAttribute('filter', 'url(#fog-blur)');
            ng.setAttribute('opacity', '0.3');
            ng.appendChild(_el('circle', { cx: x, cy: y, r: R - 6, fill: '#2a2420', stroke: '#3a3028', 'stroke-width': 0.7 }));
        }

        // Icon + label
        if (isExp || isCurr) {
            ng.appendChild(_el('text', { x: x, y: y + 1, class: 'loc-icon' })).textContent = icon;
            const short = name.length > 16 ? name.slice(0, 14) + '..' : name;
            // Label with decorative underline
            const lbl = _el('text', { x: x, y: y + R + 13, class: 'loc-label' });
            lbl.textContent = short;
            ng.appendChild(lbl);
            // Subtle underline flourish
            const lw = short.length * 4;
            ng.appendChild(_el('line', { x1: x - lw, y1: y + R + 16, x2: x + lw, y2: y + R + 16,
                stroke: '#704214', 'stroke-width': 0.4, 'stroke-opacity': 0.2 }));
        } else if (fog === 'known_mapped') {
            const ic = _el('text', { x: x, y: y + 1, class: 'loc-icon', 'fill-opacity': 0.55 });
            ic.textContent = icon;
            ng.appendChild(ic);
            const lbl = _el('text', { x: x, y: y + R + 11, class: 'loc-label', 'fill-opacity': 0.4 });
            lbl.textContent = name.length > 16 ? name.slice(0, 14) + '..' : name;
            ng.appendChild(lbl);
        } else {
            const qm = _el('text', { x: x, y: y + 2, class: 'loc-icon', 'fill-opacity': 0.25 });
            qm.textContent = '?';
            ng.appendChild(qm);
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

// ── PLAYER BANNER (animated presence marker) ──

function renderPlayerBanner(svg) {
    const coords = LOCATION_COORDS[S.currentLoc];
    if (!coords) return;
    const { x, y } = hexToPixel(coords.col, coords.row);
    const mg = _el('g', { class: 'player-marker' });
    mg.appendChild(_el('circle', { cx: x, cy: y, r: 30, fill: 'none', stroke: 'rgba(196,149,58,0.2)', 'stroke-width': 2, class: 'player-glow-ring' }));
    mg.appendChild(_el('circle', { cx: x, cy: y, r: 26, fill: 'none', stroke: 'rgba(196,149,58,0.1)', 'stroke-width': 1, class: 'player-glow-ring' }));
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
        if (state === 'known_unmapped') { cnt = 5; bOp = 0.12; fc = '#4a4030'; }
        else if (state === 'known_mapped') { cnt = 3; bOp = 0.06; fc = '#6a5a40'; }
        else { cnt = 4; bOp = 0.09; fc = '#5a4a30'; }

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
    // Detailed serpentine body with scales
    sg.appendChild(_el('path', {
        d: `M${sx},${sy} C${sx + 10},${sy - 12} ${sx + 20},${sy - 8} ${sx + 25},${sy - 2}
            C${sx + 30},${sy + 5} ${sx + 38},${sy + 2} ${sx + 42},${sy - 6}
            C${sx + 48},${sy - 16} ${sx + 55},${sy - 18} ${sx + 62},${sy - 12}`,
        fill: 'none', stroke: '#704214', 'stroke-width': 3.5, 'stroke-linecap': 'round',
    }));
    // Head detail
    sg.appendChild(_el('ellipse', { cx: sx + 63, cy: sy - 12, rx: 6, ry: 4, fill: '#704214' }));
    sg.appendChild(_el('circle', { cx: sx + 64.5, cy: sy - 13, r: 1.3, fill: '#c4953a' }));
    // Fin
    sg.appendChild(_el('path', { d: `M${sx + 30},${sy - 6} L${sx + 28},${sy - 16} L${sx + 35},${sy - 8}`,
        fill: '#704214', 'fill-opacity': 0.6 }));
    // Tail curl
    sg.appendChild(_el('path', { d: `M${sx},${sy} Q${sx - 5},${sy + 4} ${sx - 8},${sy - 2}`,
        fill: 'none', stroke: '#704214', 'stroke-width': 2, 'stroke-linecap': 'round' }));
    group.appendChild(sg);
}

// ── COMPASS ROSE (ornate medieval instrument) ──

function renderCompassRose(svg) {
    const cx = SVG_W - 55, cy = SVG_H - 55, r = 24;
    const g = _el('g', { class: 'compass-rose', opacity: '0.45' });

    // Outer rings
    g.appendChild(_el('circle', { cx, cy, r: r + 6, fill: 'none', stroke: '#704214', 'stroke-width': 0.5 }));
    g.appendChild(_el('circle', { cx, cy, r: r + 3, fill: 'none', stroke: '#704214', 'stroke-width': 1.2 }));
    g.appendChild(_el('circle', { cx, cy, r: r, fill: 'none', stroke: '#704214', 'stroke-width': 0.4 }));

    // Tick marks (32 points)
    for (let i = 0; i < 32; i++) {
        const a = (i * 11.25) * Math.PI / 180;
        const inner = i % 8 === 0 ? r + 1 : i % 4 === 0 ? r + 2 : r + 2.5;
        const outer = r + 5;
        const sw = i % 8 === 0 ? 0.8 : 0.3;
        g.appendChild(_el('line', {
            x1: cx + Math.cos(a) * inner, y1: cy + Math.sin(a) * inner,
            x2: cx + Math.cos(a) * outer, y2: cy + Math.sin(a) * outer,
            stroke: '#704214', 'stroke-width': sw,
        }));
    }

    // 8-point star needles
    const needle = _el('g', { class: 'compass-needle' });
    const cards = [
        { a: -90, len: r, w: 6, col: '#c4953a', op: 1 },     // N gold
        { a: 90, len: r * 0.8, w: 5, col: '#5a4020', op: 0.6 },  // S dark
        { a: 0, len: r * 0.7, w: 4, col: '#8a6a3a', op: 0.5 },   // E
        { a: 180, len: r * 0.7, w: 4, col: '#8a6a3a', op: 0.5 },  // W
    ];
    for (const c of cards) {
        const rad = c.a * Math.PI / 180;
        const tx = cx + Math.cos(rad) * c.len, ty = cy + Math.sin(rad) * c.len;
        const px1 = cx + Math.cos(rad + Math.PI / 2) * c.w, py1 = cy + Math.sin(rad + Math.PI / 2) * c.w;
        const px2 = cx + Math.cos(rad - Math.PI / 2) * c.w, py2 = cy + Math.sin(rad - Math.PI / 2) * c.w;
        needle.appendChild(_el('polygon', { points: `${tx},${ty} ${px1},${py1} ${px2},${py2}`, fill: c.col, opacity: c.op }));
        // Inner darker half for depth
        needle.appendChild(_el('polygon', { points: `${tx},${ty} ${cx},${cy} ${px2},${py2}`, fill: '#1a1510', 'fill-opacity': c.op * 0.3 }));
    }
    // Intercardinals
    for (const a of [-45, 45, 135, -135]) {
        const rad = a * Math.PI / 180;
        const tx = cx + Math.cos(rad) * r * 0.5, ty = cy + Math.sin(rad) * r * 0.5;
        needle.appendChild(_el('polygon', {
            points: `${tx},${ty} ${cx + Math.cos(rad + 0.4) * 3.5},${cy + Math.sin(rad + 0.4) * 3.5} ${cx + Math.cos(rad - 0.4) * 3.5},${cy + Math.sin(rad - 0.4) * 3.5}`,
            fill: '#6a5030', opacity: '0.4',
        }));
    }
    // Center jewel
    needle.appendChild(_el('circle', { cx, cy, r: 4, fill: '#c4953a' }));
    needle.appendChild(_el('circle', { cx, cy, r: 2, fill: '#2a2420' }));
    needle.appendChild(_el('circle', { cx, cy, r: 0.8, fill: '#c4953a' }));
    g.appendChild(needle);

    // Labels
    for (const l of [{ ch: 'N', dx: 0, dy: -r - 10 }, { ch: 'S', dx: 0, dy: r + 14 }, { ch: 'L', dx: r + 10, dy: 3 }, { ch: 'O', dx: -r - 10, dy: 3 }]) {
        const t = _el('text', { x: cx + l.dx, y: cy + l.dy, 'text-anchor': 'middle',
            'font-size': '8px', 'font-family': "'Cinzel', serif", 'font-weight': '700', fill: '#c4953a', 'fill-opacity': '0.75' });
        t.textContent = l.ch;
        g.appendChild(t);
    }
    svg.appendChild(g);
}

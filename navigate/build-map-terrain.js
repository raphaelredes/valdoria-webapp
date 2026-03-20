// ===============================================================
// BUILD-MAP TERRAIN — Terrain rendering functions for static PNG generation
// These functions are used ONLY by build-map.html to generate map-static-2x.png
// They were extracted from navigate-map-terrain.js (commit b38b874)
// NOT loaded at runtime — runtime uses the pre-rendered static PNG
// ===============================================================

function renderGroundCover(svg, insertBefore) {
    const gG = _el('g', { class: 'ground-cover', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    const biomeCache = new Map();
    const allHexes = _getAllHexes();
    for (const [c, r, b] of allHexes) biomeCache.set(`${c},${r}`, b);

    // Batched path data by rendering type
    const batches = {
        darkCircles: '',    // forest undergrowth, volcanic ash, mountain rock dots (INK_DARK fill, ~0.15 op)
        darkChevrons: '',   // mountain/cave chevrons (INK_DARK stroke, 0.2 op)
        lightLines: '',     // snow wind (INK_LIGHT stroke, 0.12 op)
        inkDashes: '',      // desert wind (INK stroke, 0.15 op, dashed)
        inkWaves: '',       // swamp water marks (INK stroke, 0.18 op)
        darkLines: '',      // volcanic cracks, graveyard grass (INK_DARK stroke, 0.15 op)
        grassLines: '',     // plains grass (INK stroke, 0.22 op)
    };

    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);
    for (let row = 0; row <= GRID_ROWS + 1; row++) {
        for (let col = 0; col <= GRID_COLS + 1; col++) {
            const { x, y } = hexToPixel(col, row);
            if (!_pointInLandmass(x, y)) continue;
            if (_hexVisibility(col, row, knownSet, discoveredSet) <= 0) continue;
            const seed = col * 97 + row * 53;
            const biome = biomeCache.get(`${col},${row}`) || 'plains';
            _groundCoverBatch(x, y, biome, seed, batches);
        }
    }

    // Emit batched paths (one per visual style)
    if (batches.darkCircles) gG.appendChild(_el('path', { d: batches.darkCircles, fill: INK_DARK, 'fill-opacity': 0.16, stroke: 'none' }));
    if (batches.darkChevrons) gG.appendChild(_el('path', { d: batches.darkChevrons, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.35, 'stroke-opacity': 0.2 }));
    if (batches.lightLines) gG.appendChild(_el('path', { d: batches.lightLines, fill: 'none', stroke: INK_LIGHT, 'stroke-width': 0.3, 'stroke-opacity': 0.12 }));
    if (batches.inkDashes) gG.appendChild(_el('path', { d: batches.inkDashes, fill: 'none', stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.15, 'stroke-dasharray': '2 2' }));
    if (batches.inkWaves) gG.appendChild(_el('path', { d: batches.inkWaves, fill: 'none', stroke: INK, 'stroke-width': 0.35, 'stroke-opacity': 0.18 }));
    if (batches.darkLines) gG.appendChild(_el('path', { d: batches.darkLines, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.25, 'stroke-opacity': 0.15 }));
    if (batches.grassLines) gG.appendChild(_el('path', { d: batches.grassLines, fill: 'none', stroke: INK, 'stroke-width': 0.35, 'stroke-opacity': 0.22, 'stroke-linecap': 'round' }));

    if (insertBefore) svg.insertBefore(gG, insertBefore);
    else svg.appendChild(gG);
}

function _groundCoverBatch(x, y, biome, seed, b) {
    if (biome === 'forest') {
        for (let i = 0; i < 5; i++) {
            const bx = x + (srand(seed+i*7)-0.5)*HEX_W, by = y + (srand(seed+i*7+3)-0.5)*ROW_H;
            const cr = 0.4 + srand(seed+i*7+1)*0.4;
            b.darkCircles += `M${bx-cr},${by}a${cr},${cr} 0 1,0 ${cr*2},0a${cr},${cr} 0 1,0 ${-cr*2},0`;
        }
    } else if (biome === 'mountain' || biome === 'cave') {
        for (let i = 0; i < 3; i++) {
            const rx = x + (srand(seed+i*9)-0.5)*HEX_W, ry = y + (srand(seed+i*9+3)-0.5)*ROW_H;
            const sz = 2 + srand(seed+i*9+1) * 2;
            b.darkChevrons += `M${rx-sz},${ry+sz*0.5}L${rx},${ry-sz*0.5}L${rx+sz},${ry+sz*0.5}`;
        }
        for (let i = 0; i < 2; i++) {
            const dx = x + (srand(seed+i*11+50)-0.5)*HEX_W, dy = y + (srand(seed+i*11+53)-0.5)*ROW_H;
            b.darkCircles += `M${dx-0.5},${dy}a0.5,0.5 0 1,0 1,0a0.5,0.5 0 1,0 -1,0`;
        }
    } else if (biome === 'snow') {
        if (srand(seed) > 0.5) {
            const wx = x + (srand(seed+1)-0.5)*HEX_W, wy = y + (srand(seed+2)-0.5)*ROW_H;
            b.lightLines += `M${wx-3},${wy}L${wx+3},${wy-0.3}`;
        }
    } else if (biome === 'desert') {
        for (let i = 0; i < 3; i++) {
            const dx = x + (srand(seed+i*6)-0.5)*HEX_W, dy = y + (srand(seed+i*6+3)-0.5)*ROW_H;
            const wl = 4 + srand(seed+i*6+1) * 6;
            b.inkDashes += `M${dx},${dy}L${dx+wl},${dy-0.3}`;
        }
    } else if (biome === 'swamp') {
        for (let i = 0; i < 2; i++) {
            const wx = x + (srand(seed+i*8+501)-0.5)*20, wy = y + (srand(seed+i*8+502)-0.5)*12;
            b.inkWaves += `M${wx-5},${wy}Q${wx},${wy-1.5} ${wx+5},${wy}`;
        }
    } else if (biome === 'volcanic') {
        for (let i = 0; i < 3; i++) {
            const vx = x + (srand(seed+i*8)-0.5)*HEX_W, vy = y + (srand(seed+i*8+3)-0.5)*ROW_H;
            b.darkCircles += `M${vx-0.4},${vy}a0.4,0.4 0 1,0 0.8,0a0.4,0.4 0 1,0 -0.8,0`;
        }
        if (srand(seed+100) > 0.6) {
            const cx = x + (srand(seed+101)-0.5)*HEX_W, cy = y + (srand(seed+102)-0.5)*ROW_H;
            b.darkLines += `M${cx-3},${cy}L${cx+3},${cy+1}`;
        }
    } else if (biome === 'graveyard') {
        for (let i = 0; i < 2; i++) {
            const gx = x + (srand(seed+i*7)-0.5)*HEX_W, gy = y + (srand(seed+i*7+3)-0.5)*ROW_H;
            b.darkLines += `M${gx},${gy}L${gx+(srand(seed+i*7+5)-0.5)*3},${gy-3}`;
        }
    } else {
        // Plains
        for (let i = 0; i < 3; i++) {
            const gx = x + (srand(seed+i*7)-0.5)*HEX_W, gy = y + (srand(seed+i*7+3)-0.5)*ROW_H;
            for (let bl = 0; bl < 2; bl++) {
                const a = (srand(seed+i*7+bl*3+5)-0.5)*60*Math.PI/180;
                const l = 3+srand(seed+i*7+bl*3+1)*3;
                b.grassLines += `M${gx+bl*1.5},${gy}L${gx+bl*1.5+Math.sin(a)*l},${gy-Math.cos(a)*l}`;
            }
        }
    }
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
    const regions = _getAllBiomeRegions();

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
                    'stroke-opacity': vis * 0.32,
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

function renderTerrainDetails(svg, fogState, insertBefore) {
    const knownSet = new Set(S.knownLocs);
    const discoveredSet = new Set(S.discoveredLocs || []);
    const tG = _el('g', { class: 'terrain-illust', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    const regions = _getAllBiomeRegions();

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
    if (insertBefore) svg.insertBefore(tG, insertBefore);
    else svg.appendChild(tG);
}

// ══════════════════════════════════════════════════════════
// MOUNTAINS — Filled solid bodies, varied sizes/shapes
// ══════════════════════════════════════════════════════════

function _drawMountains(g, cluster) {
    const peaks = [];
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        const count = 2 + Math.floor(srand(seed) * 2);
        for (let i = 0; i < count; i++) {
            const isBig = i === Math.floor(count / 2);
            const sizeRoll = srand(seed + i * 10 + 99);
            let height, width;
            if (isBig) { height = 22 + srand(seed+i*10+1) * 12; width = 10 + srand(seed+i*10+2) * 5; }
            else if (sizeRoll > 0.5) { height = 14 + srand(seed+i*10+1) * 10; width = 7 + srand(seed+i*10+2) * 4; }
            else { height = 8 + srand(seed+i*10+1) * 8; width = 5 + srand(seed+i*10+2) * 3; }
            const typeRand = srand(seed + i * 10 + 88);
            peaks.push({
                x: h.x + (i - (count-1)/2) * 18 + (srand(seed+i*10)-0.5) * 5,
                y: h.y + (srand(seed+i*10+5)-0.5) * 5,
                h: height, w: width, seed: seed + i * 10,
                type: typeRand < 0.4 ? 0 : typeRand < 0.7 ? 1 : 2,
            });
        }
    }
    peaks.sort((a, b) => (a.y - a.h * 0.5) - (b.y - b.h * 0.5));

    // Batched paths by visual layer (reduces DOM elements ~4x)
    let bodyD = '', shadowD = '', outlineD = '', detailD = '';

    for (const p of peaks) {
        const by = p.y + 4, ty = p.y + 4 - p.h;
        const lx = p.x - p.w, rx = p.x + p.w;
        const jit = (srand(p.seed + 77) - 0.5) * 1.5;
        const peakX = p.x + jit;

        if (p.type === 1) {
            bodyD += `M${lx},${by}Q${lx - p.w*0.05},${ty + p.h*0.12} ${peakX},${ty}Q${rx + p.w*0.05},${ty + p.h*0.12} ${rx},${by}Z`;
            shadowD += `M${lx},${by}Q${lx - p.w*0.05},${ty + p.h*0.12} ${peakX},${ty}L${peakX},${by}Z`;
            outlineD += `M${lx},${by}Q${lx - p.w*0.05},${ty + p.h*0.12} ${peakX},${ty}Q${rx + p.w*0.05},${ty + p.h*0.12} ${rx},${by}`;
            for (let j = 0; j < 2; j++) {
                const t = 0.35 + j * 0.22, cy = ty + p.h * t, cw = p.w * t * 0.55;
                detailD += `M${peakX - cw},${cy}Q${peakX - cw*0.3},${cy - 0.8} ${peakX},${cy + 0.3}`;
            }
        } else if (p.type === 2) {
            const flatW = p.w * (0.3 + srand(p.seed + 88) * 0.15);
            const flatL = peakX - flatW, flatR = peakX + flatW;
            bodyD += `M${lx},${by}L${flatL},${ty}L${flatR},${ty}L${rx},${by}Z`;
            shadowD += `M${lx},${by}L${flatL},${ty}L${peakX},${ty}L${peakX},${by}Z`;
            outlineD += `M${lx},${by}L${flatL},${ty}L${flatR},${ty}L${rx},${by}`;
            for (let j = 0; j < 2; j++) {
                const t = 0.3 + j * 0.25, sy = by + (ty - by) * t, slx = lx + (flatL - lx) * t;
                detailD += `M${slx + 1},${sy}L${peakX - 1},${sy}`;
            }
        } else {
            bodyD += `M${lx},${by}L${peakX},${ty}L${rx},${by}Z`;
            shadowD += `M${lx},${by}L${peakX},${ty}L${peakX},${by}Z`;
            outlineD += `M${lx},${by}L${peakX},${ty}M${peakX},${ty}L${rx},${by}`;
            for (let j = 0; j < 2; j++) {
                const t = 0.25 + j * 0.3, hx = lx + (peakX - lx) * t, hy = by + (ty - by) * t, hLen = p.h * 0.09;
                detailD += `M${hx},${hy}L${hx + hLen * 0.35},${hy + hLen}`;
            }
        }
    }
    // Emit 4 compound paths instead of 5-7 per peak
    if (bodyD) g.appendChild(_el('path', { d: bodyD, fill: INK_DARK, 'fill-opacity': 0.07, stroke: 'none' }));
    if (shadowD) g.appendChild(_el('path', { d: shadowD, fill: INK_DARK, 'fill-opacity': 0.2, stroke: 'none' }));
    if (outlineD) g.appendChild(_el('path', { d: outlineD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.6, 'stroke-linecap': 'round', 'stroke-opacity': 0.65 }));
    if (detailD) g.appendChild(_el('path', { d: detailD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.2, 'stroke-opacity': 0.18 }));
}

// ══════════════════════════════════════════════════════════
// FOREST — Individual tree symbols (trunk + canopy outline)
// ══════════════════════════════════════════════════════════

function _drawForest(g, cluster) {
    const trees = [];
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        const count = 3 + Math.floor(srand(seed) * 3);
        for (let i = 0; i < count; i++) {
            trees.push({
                x: h.x + (srand(seed+i*13)-0.5) * 34,
                y: h.y + (srand(seed+i*13+5)-0.5) * 22,
                sz: 2.5 + srand(seed+i*13+1) * 4.5,
                type: srand(seed+i*13+2) < 0.5 ? 'round' : 'conifer',
                seed: seed + i * 13,
            });
        }
    }
    trees.sort((a, b) => a.y - b.y);

    // Batched: canopy circles as arc sub-paths, trunks as line sub-paths, tiers as polygon sub-paths
    let canopyD = '', trunkD = '', tierD = '';

    for (const t of trees) {
        const trunkH = t.sz * 1.8;
        const trunkLean = (srand(t.seed+99)-0.5) * 1.2;

        if (t.type === 'round') {
            const cy = t.y + 2 - trunkH - t.sz * 0.2;
            const cx = t.x + trunkLean;
            const r = t.sz;
            // Circle as arc sub-path
            canopyD += `M${cx-r},${cy}a${r},${r} 0 1,0 ${r*2},0a${r},${r} 0 1,0 ${-r*2},0`;
            // Trunk as line sub-path
            trunkD += `M${t.x},${t.y + 2}L${cx},${cy + r * 0.7}`;
        } else {
            const topX = t.x + trunkLean;
            const topY = t.y + 2 - trunkH - t.sz * 1.2;
            const tiers = 2 + Math.floor(srand(t.seed + 160) * 2);
            trunkD += `M${topX},${topY + tiers * t.sz * 0.7 + 2}L${t.x},${t.y + 2}`;
            for (let ti = 0; ti < tiers; ti++) {
                const tierTop = topY + ti * t.sz * 0.5;
                const tierBot = topY + (ti + 1) * t.sz * 0.7;
                const tierW = t.sz * (0.35 + ti * 0.3);
                tierD += `M${topX},${tierTop}L${topX-tierW},${tierBot}L${topX+tierW},${tierBot}Z`;
            }
        }
    }
    // 3 compound paths instead of 2-4 per tree
    if (canopyD) g.appendChild(_el('path', { d: canopyD, fill: INK_DARK, 'fill-opacity': 0.22, stroke: INK_DARK, 'stroke-width': 0.45, 'stroke-opacity': 0.55 }));
    if (tierD) g.appendChild(_el('path', { d: tierD, fill: INK_DARK, 'fill-opacity': 0.19, stroke: INK_DARK, 'stroke-width': 0.35, 'stroke-opacity': 0.5 }));
    if (trunkD) g.appendChild(_el('path', { d: trunkD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': 0.6, 'stroke-linecap': 'round' }));
}

// ══════════════════════════════════════════════════════════
// SNOW — Frozen tundra: ice formations, frost crystals,
// cracked ice, snow drifts, frozen ground patterns
// ══════════════════════════════════════════════════════════

function _drawSnow(g, cluster) {
    let crackD = '', crystalFillD = '', crystalFacetD = '', driftD = '', frostD = '', windD = '', stippleD = '';
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        // Frozen ground — cracked ice (3 groups per hex)
        for (let i = 0; i < 3; i++) {
            const cx = h.x + (srand(seed+i*31)-0.5)*28;
            const cy = h.y + (srand(seed+i*31+1)-0.5)*16;
            const cracks = 3 + Math.floor(srand(seed+i*31+2)*3);
            for (let c = 0; c < cracks; c++) {
                const angle = (c / cracks) * Math.PI * 2 + (srand(seed+i*31+c*5)-0.5)*0.8;
                const len = 5 + srand(seed+i*31+c*5+1)*8;
                const midA = angle + (srand(seed+i*31+c*5+2)-0.5)*0.4;
                const mx = cx + Math.cos(midA) * len * 0.5, my = cy + Math.sin(midA) * len * 0.5;
                const ex = cx + Math.cos(angle) * len, ey = cy + Math.sin(angle) * len;
                crackD += `M${cx},${cy}Q${mx},${my} ${ex},${ey}`;
            }
        }
        // Ice crystals
        const crystalCount = 1 + Math.floor(srand(seed+50)*2);
        for (let i = 0; i < crystalCount; i++) {
            const ix = h.x + (srand(seed+i*17+60)-0.5)*20, iy = h.y + (srand(seed+i*17+61)-0.5)*10;
            const ih = 6 + srand(seed+i*17+62)*6, iw = 3 + srand(seed+i*17+63)*3;
            const tipX = ix + (srand(seed+i*17+64)-0.5)*2, tipY = iy - ih;
            const bl = ix - iw, br = ix + iw * 0.8;
            const midL = ix - iw * 0.6, midR = ix + iw * 0.4, midY = iy - ih * 0.4;
            crystalFillD += `M${bl},${iy}L${midL},${midY}L${tipX},${tipY}L${midR},${midY+1}L${br},${iy}Z`;
            crystalFacetD += `M${tipX},${tipY}L${ix},${iy}`;
        }
        // Snow drifts (3 per hex)
        for (let i = 0; i < 3; i++) {
            const dx = h.x + (srand(seed+i*41)-0.5)*26, dy = h.y + (srand(seed+i*41+1)-0.5)*14 + 2;
            const dw = 8 + srand(seed+i*41+2)*8;
            driftD += `M${dx-dw},${dy}Q${dx-dw*0.3},${dy-2.5} ${dx},${dy-1}Q${dx+dw*0.4},${dy-3} ${dx+dw},${dy}`;
        }
        // Frost crystals (3 per hex)
        for (let i = 0; i < 3; i++) {
            const fx = h.x + (srand(seed+i*23+100)-0.5)*30, fy = h.y + (srand(seed+i*23+101)-0.5)*18;
            const fr = 1.5 + srand(seed+i*23+102)*1.5;
            for (let a = 0; a < 3; a++) {
                const angle = a * Math.PI / 3 + (srand(seed+i*23+a+103)-0.5)*0.2;
                frostD += `M${fx-Math.cos(angle)*fr},${fy-Math.sin(angle)*fr}L${fx+Math.cos(angle)*fr},${fy+Math.sin(angle)*fr}`;
            }
        }
        // Wind streaks
        for (let i = 0; i < 3; i++) {
            const wx = h.x + (srand(seed+i*37+150)-0.5)*28, wy = h.y + (srand(seed+i*37+151)-0.5)*16;
            const wl = 10 + srand(seed+i*37+152)*12;
            windD += `M${wx},${wy}L${wx+wl},${wy-0.5}`;
        }
        // Stipple (5 per hex)
        for (let i = 0; i < 5; i++) {
            const sx = h.x + (srand(seed+i*13+200)-0.5)*32, sy = h.y + (srand(seed+i*13+201)-0.5)*18;
            const r = 0.3 + srand(seed+i*13+202)*0.3;
            stippleD += `M${sx-r},${sy}a${r},${r} 0 1,0 ${r*2},0a${r},${r} 0 1,0 ${-r*2},0`;
        }
    }
    if (crackD) g.appendChild(_el('path', { d: crackD, fill: 'none', stroke: INK_LIGHT, 'stroke-width': 0.4, 'stroke-opacity': 0.3 }));
    if (crystalFillD) g.appendChild(_el('path', { d: crystalFillD, fill: INK_LIGHT, 'fill-opacity': 0.14, stroke: INK_LIGHT, 'stroke-width': 0.5, 'stroke-opacity': 0.35 }));
    if (crystalFacetD) g.appendChild(_el('path', { d: crystalFacetD, fill: 'none', stroke: INK_LIGHT, 'stroke-width': 0.25, 'stroke-opacity': 0.2 }));
    if (driftD) g.appendChild(_el('path', { d: driftD, fill: 'none', stroke: INK_LIGHT, 'stroke-width': 0.5, 'stroke-opacity': 0.25 }));
    if (frostD) g.appendChild(_el('path', { d: frostD, fill: 'none', stroke: INK_LIGHT, 'stroke-width': 0.3, 'stroke-opacity': 0.25 }));
    if (windD) g.appendChild(_el('path', { d: windD, fill: 'none', stroke: INK_LIGHT, 'stroke-width': 0.25, 'stroke-opacity': 0.18, 'stroke-dasharray': '4 3' }));
    if (stippleD) g.appendChild(_el('path', { d: stippleD, fill: INK_LIGHT, 'fill-opacity': 0.15, stroke: 'none' }));
}

// ── Swamp — Standing water pools, lily pads, cypress knees, hanging moss ──
function _drawSwamp(g, cluster) {
    let poolFillD = '', rippleD = '', padFillD = '', padVeinD = '';
    let trunkThickD = '', trunkThinD = '', rootD = '', mossD = '', grassD = '', fogD = '';
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        // Standing water pools (3 per hex)
        for (let p = 0; p < 3; p++) {
            const px = h.x + (srand(seed+p*31)-0.5)*22, py = h.y + (srand(seed+p*31+1)-0.5)*12;
            const prx = 6 + srand(seed+p*31+2)*8, pry = 3 + srand(seed+p*31+3)*4;
            poolFillD += _organicBlob(px, py, prx, pry, seed+p*100, 7);
            for (let r = 0; r < 2; r++) {
                const ry2 = py - 1 + r * 2.5, rw = prx * (0.5 + srand(seed+p*31+r*7)*0.3);
                rippleD += `M${px-rw},${ry2}Q${px},${ry2-1} ${px+rw},${ry2}`;
            }
        }
        // Lily pads (3 per hex)
        for (let i = 0; i < 3; i++) {
            const lx = h.x + (srand(seed+i*17+50)-0.5)*28, ly = h.y + (srand(seed+i*17+51)-0.5)*14;
            const lr = 1.5 + srand(seed+i*17+52)*1.5;
            const notchAngle = srand(seed+i*17+53) * Math.PI * 2;
            const startA = notchAngle + 0.3, endA = notchAngle + Math.PI * 2 - 0.3;
            const x1 = lx + Math.cos(startA)*lr, y1 = ly + Math.sin(startA)*lr;
            const x2 = lx + Math.cos(endA)*lr, y2 = ly + Math.sin(endA)*lr;
            padFillD += `M${lx},${ly}L${x1},${y1}A${lr},${lr} 0 1 1 ${x2},${y2}Z`;
            const vx = lx + Math.cos(notchAngle + Math.PI)*lr*0.7;
            const vy = ly + Math.sin(notchAngle + Math.PI)*lr*0.7;
            padVeinD += `M${lx},${ly}L${vx},${vy}`;
        }
        // Cypress stumps (3 per hex)
        for (let i = 0; i < 3; i++) {
            const cx = h.x + (srand(seed+i*23+70)-0.5)*30, cy = h.y + (srand(seed+i*23+71)-0.5)*12;
            const th = 6 + srand(seed+i*23+72)*5, lean = (srand(seed+i*23+73)-0.5)*2;
            trunkThickD += `M${cx-1.5},${cy+3}Q${cx-1+lean*0.3},${cy-th*0.3} ${cx+lean},${cy-th}`;
            trunkThinD += `M${cx+1.5},${cy+3}Q${cx+1+lean*0.3},${cy-th*0.3} ${cx+lean},${cy-th}`;
            for (let r = 0; r < 3; r++) {
                const rDir = (r - 1) * 3.5 + (srand(seed+i*23+r*5+80)-0.5)*2;
                rootD += `M${cx},${cy+2}Q${cx+rDir*0.5},${cy+3} ${cx+rDir},${cy+4}`;
            }
            if (srand(seed+i*23+76) > 0.3) {
                for (let m = 0; m < 2; m++) {
                    const mx = cx + lean + (srand(seed+i*23+m*5+85)-0.5)*3, my = cy - th + 1;
                    const mLen = 3 + srand(seed+i*23+m*5+86)*3, mSway = (srand(seed+i*23+m*5+87)-0.5)*2;
                    mossD += `M${mx},${my}Q${mx+mSway},${my+mLen*0.6} ${mx+mSway*0.5},${my+mLen}`;
                }
            }
        }
        // Marsh grass (4 tufts per hex)
        for (let i = 0; i < 4; i++) {
            const gx = h.x + (srand(seed+i*13+100)-0.5)*30, gy = h.y + (srand(seed+i*13+101)-0.5)*14;
            for (let b = 0; b < 4; b++) {
                const angle = -30 + b * 20 + (srand(seed+i*13+b+102)-0.5)*15;
                const bh = 2 + srand(seed+i*13+b+110)*2.5;
                const rad = angle * Math.PI / 180;
                grassD += `M${gx},${gy}Q${gx+Math.sin(rad)*bh*0.5},${gy-bh*0.7} ${gx+Math.sin(rad)*bh},${gy-Math.cos(rad)*bh}`;
            }
        }
        // Fog stipple (6 per hex)
        for (let i = 0; i < 6; i++) {
            const fx = h.x + (srand(seed+i*19+200)-0.5)*32, fy = h.y + (srand(seed+i*19+201)-0.5)*18;
            const r = 0.3 + srand(seed+i*19+202)*0.4;
            fogD += `M${fx-r},${fy}a${r},${r} 0 1,0 ${r*2},0a${r},${r} 0 1,0 ${-r*2},0`;
        }
    }
    if (poolFillD) g.appendChild(_el('path', { d: poolFillD, fill: INK_DARK, 'fill-opacity': 0.12, stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.25 }));
    if (rippleD) g.appendChild(_el('path', { d: rippleD, fill: 'none', stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.2 }));
    if (padFillD) g.appendChild(_el('path', { d: padFillD, fill: INK_DARK, 'fill-opacity': 0.14, stroke: INK_DARK, 'stroke-width': 0.25, 'stroke-opacity': 0.3 }));
    if (padVeinD) g.appendChild(_el('path', { d: padVeinD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.15, 'stroke-opacity': 0.2 }));
    if (trunkThickD) g.appendChild(_el('path', { d: trunkThickD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.6, 'stroke-opacity': 0.6, 'stroke-linecap': 'round' }));
    if (trunkThinD) g.appendChild(_el('path', { d: trunkThinD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.35, 'stroke-opacity': 0.5, 'stroke-linecap': 'round' }));
    if (rootD) g.appendChild(_el('path', { d: rootD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': 0.5 }));
    if (mossD) g.appendChild(_el('path', { d: mossD, fill: 'none', stroke: INK, 'stroke-width': 0.25, 'stroke-opacity': 0.3 }));
    if (grassD) g.appendChild(_el('path', { d: grassD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.35, 'stroke-opacity': 0.35, 'stroke-linecap': 'round' }));
    if (fogD) g.appendChild(_el('path', { d: fogD, fill: INK, 'fill-opacity': 0.1, stroke: 'none' }));
}

// ── Desert — Crescent dunes with shading + stipple + wind marks ──
function _drawDesert(g, cluster) {
    let duneD = '', shadowD = '', stippleD = '', windD = '';
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        // Dunes (3 per hex)
        for (let d = 0; d < 3; d++) {
            const dy = -8 + d * 6, dOx = (srand(seed+d*17)-0.5)*10;
            const duneW = 16 + srand(seed+d*17+1)*8;
            duneD += `M${h.x-duneW+dOx},${h.y+dy+3}Q${h.x+dOx},${h.y+dy-5} ${h.x+duneW+dOx},${h.y+dy+3}`;
            for (let s = 0; s < 2; s++) {
                const sOff = 1.5 + s * 1.5;
                shadowD += `M${h.x-duneW*0.7+dOx},${h.y+dy+3+sOff}Q${h.x+dOx},${h.y+dy-2+sOff} ${h.x+duneW*0.7+dOx},${h.y+dy+3+sOff}`;
            }
        }
        // Sand stipple (10 per hex)
        for (let i = 0; i < 10; i++) {
            const sx = h.x + (srand(seed+i*5)-0.5)*32, sy = h.y + (srand(seed+i*5+3)-0.5)*18;
            const r = 0.35 + srand(seed+i*5+4)*0.3;
            stippleD += `M${sx-r},${sy}a${r},${r} 0 1,0 ${r*2},0a${r},${r} 0 1,0 ${-r*2},0`;
        }
        // Wind streaks
        for (let i = 0; i < 3; i++) {
            const wx = h.x + (srand(seed+i*19)-0.5)*28, wy = h.y + (srand(seed+i*19+1)-0.5)*14;
            const wl = 8 + srand(seed+i*19+2)*10;
            windD += `M${wx},${wy}L${wx+wl},${wy-0.5}`;
        }
    }
    if (duneD) g.appendChild(_el('path', { d: duneD, fill: 'none', stroke: INK, 'stroke-width': 0.7, 'stroke-opacity': 0.4 }));
    if (shadowD) g.appendChild(_el('path', { d: shadowD, fill: 'none', stroke: INK, 'stroke-width': 0.25, 'stroke-opacity': 0.18 }));
    if (stippleD) g.appendChild(_el('path', { d: stippleD, fill: INK, 'fill-opacity': 0.14, stroke: 'none' }));
    if (windD) g.appendChild(_el('path', { d: windD, fill: 'none', stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.15, 'stroke-dasharray': '3 2' }));
}

// ── Volcanic — Mountain peak + crater + lava flows + smoke ──
function _drawVolcanic(g, cluster) {
    let shadowFillD = '', slopeThickD = '', slopeThinD = '', craterD = '', hatchD = '', lavaD = '', smokeD = '';
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        const jx = (srand(seed)-0.5)*4;
        const ht = 22 + srand(seed+1)*12, w = 14 + srand(seed+2)*6;
        const px = h.x+jx, by = h.y+6, ty = by - ht;
        shadowFillD += `M${px-w},${by}L${px-2},${ty}L${px-2},${by}Z`;
        slopeThickD += `M${px-w},${by}L${px-2},${ty}`;
        slopeThinD += `M${px+2},${ty}L${px+w},${by}`;
        craterD += `M${px-4},${ty+1}Q${px},${ty+4} ${px+4},${ty+1}`;
        for (let j = 0; j < 6; j++) {
            const t = 0.1 + j * 0.13;
            const hx = (px-w) + (px-2 - (px-w)) * t, hy = by + (ty - by) * t;
            const hLen = ht * 0.12;
            hatchD += `M${hx},${hy}L${hx+hLen*0.4},${hy+hLen}`;
        }
        for (let i = 0; i < 2; i++) {
            const side = i === 0 ? -1 : 1, lx = px + side * 2;
            lavaD += `M${lx},${ty+3}Q${lx+side*5},${ty+ht*0.3} ${lx+side*3},${ty+ht*0.5}Q${lx+side*7},${ty+ht*0.7} ${lx+side*4},${by-2}`;
        }
        for (let i = 0; i < 3; i++) {
            const sx = px + (srand(seed+i*3)-0.5)*5, sh = 10 + i * 6, wobble = 3 + i * 2;
            smokeD += `M${sx},${ty}Q${sx+wobble},${ty-sh*0.3} ${sx-wobble*0.5},${ty-sh*0.6}Q${sx+wobble*0.8},${ty-sh*0.8} ${sx-wobble*0.3},${ty-sh}`;
        }
    }
    if (shadowFillD) g.appendChild(_el('path', { d: shadowFillD, fill: INK_DARK, 'fill-opacity': 0.15, stroke: 'none' }));
    if (slopeThickD) g.appendChild(_el('path', { d: slopeThickD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.7, 'stroke-opacity': 0.65, 'stroke-linecap': 'round' }));
    if (slopeThinD) g.appendChild(_el('path', { d: slopeThinD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': 0.55, 'stroke-linecap': 'round' }));
    if (craterD) g.appendChild(_el('path', { d: craterD, fill: INK_DARK, 'fill-opacity': 0.2, stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': 0.6 }));
    if (hatchD) g.appendChild(_el('path', { d: hatchD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.2, 'stroke-opacity': 0.28 }));
    if (lavaD) g.appendChild(_el('path', { d: lavaD, fill: 'none', stroke: INK, 'stroke-width': 0.5, 'stroke-opacity': 0.3 }));
    if (smokeD) g.appendChild(_el('path', { d: smokeD, fill: 'none', stroke: INK, 'stroke-width': 0.4, 'stroke-opacity': 0.2 }));
}

// ── Cave — Rocky ground with scattered boulders, dark crevices, sparse entrance ──
function _drawCave(g, cluster) {
    let boulderFillD = '', boulderShadowD = '', creviceD = '', stippleD = '', entranceFillD = '', stalactiteD = '';
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        // Boulders (3 per hex)
        for (let i = 0; i < 3; i++) {
            const bx = h.x + (srand(seed+i*7)-0.5)*28, by = h.y + (srand(seed+i*7+3)-0.5)*14;
            const bsz = 3 + srand(seed+i*7+1)*4;
            boulderFillD += _organicBlob(bx, by, bsz, bsz * 0.7, seed+i*100, 6);
            boulderShadowD += `M${bx},${by-bsz*0.4}A${bsz*0.5},${bsz*0.5} 0 0 1 ${bx},${by+bsz*0.4}`;
        }
        // Crevices
        for (let i = 0; i < 3; i++) {
            const cx = h.x + (srand(seed+i*19+40)-0.5)*26, cy = h.y + (srand(seed+i*19+41)-0.5)*12;
            const cLen = 6 + srand(seed+i*19+42)*8, cAngle = (srand(seed+i*19+43)-0.5)*1.2;
            const ex = cx + Math.cos(cAngle)*cLen, ey = cy + Math.sin(cAngle)*cLen;
            const mx = (cx+ex)/2 + (srand(seed+i*19+44)-0.5)*3, my = (cy+ey)/2 + (srand(seed+i*19+45)-0.5)*2;
            creviceD += `M${cx},${cy}Q${mx},${my} ${ex},${ey}`;
        }
        // Stipple (8 per hex)
        for (let i = 0; i < 8; i++) {
            const sx = h.x + (srand(seed+i*11)-0.5)*30, sy = h.y + (srand(seed+i*11+3)-0.5)*16;
            const r = 0.35 + srand(seed+i*11+1)*0.4;
            stippleD += `M${sx-r},${sy}a${r},${r} 0 1,0 ${r*2},0a${r},${r} 0 1,0 ${-r*2},0`;
        }
        // Cave entrance (60% chance)
        if (srand(seed+55) > 0.4) {
            const eW = 7 + srand(seed+56)*3, eH = 5 + srand(seed+57)*3;
            const ex = h.x + (srand(seed+58)-0.5)*8, ey = h.y + (srand(seed+59)-0.5)*4;
            entranceFillD += `M${ex-eW},${ey+3}Q${ex-eW},${ey-eH} ${ex},${ey-eH-2}Q${ex+eW},${ey-eH} ${ex+eW},${ey+3}`;
            for (let j = 0; j < 3; j++) {
                const sx = ex + (j-1)*3 + (srand(seed+j*5+90)-0.5)*1.5;
                const sTop = ey - eH + Math.abs(j-1)*1.5, sLen = 1.5 + srand(seed+j*5+91)*2;
                stalactiteD += `M${sx},${sTop}L${sx},${sTop+sLen}`;
            }
        }
    }
    if (boulderFillD) g.appendChild(_el('path', { d: boulderFillD, fill: INK_DARK, 'fill-opacity': 0.12, stroke: INK_DARK, 'stroke-width': 0.3, 'stroke-opacity': 0.28 }));
    if (boulderShadowD) g.appendChild(_el('path', { d: boulderShadowD, fill: INK_DARK, 'fill-opacity': 0.12, stroke: 'none' }));
    if (creviceD) g.appendChild(_el('path', { d: creviceD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': 0.35 }));
    if (stippleD) g.appendChild(_el('path', { d: stippleD, fill: INK_DARK, 'fill-opacity': 0.18, stroke: 'none' }));
    if (entranceFillD) g.appendChild(_el('path', { d: entranceFillD, fill: INK_DARK, 'fill-opacity': 0.12, stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': 0.55 }));
    if (stalactiteD) g.appendChild(_el('path', { d: stalactiteD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.35, 'stroke-opacity': 0.4 }));
}

// ── Graveyard — Tombstones + crosses + dead trees + fog ──
function _drawGraveyard(g, cluster) {
    let moundD = '', tombD = '', crossD = '', treeD = '';
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        // Ground mounds
        for (let i = 0; i < 2; i++) {
            const mx = h.x + (i === 0 ? -12 : 10) + (srand(seed+i*13)-0.5)*6;
            const my = h.y + 6 + srand(seed+i*13+1)*3;
            moundD += `M${mx-5},${my}Q${mx},${my-2.5} ${mx+5},${my}`;
        }
        // Graves (tombstones + crosses) — use transform via individual elements for rotation
        const graves = [[-14, -6], [0, -8], [14, -4], [-10, 4], [8, 6]];
        for (let i = 0; i < graves.length; i++) {
            const [gox, goy] = graves[i];
            const tx = h.x + gox + (srand(seed+i*9)-0.5)*4;
            const ty = h.y + goy + (srand(seed+i*9+3)-0.5)*3;
            const th = 7 + srand(seed+i*9+1)*4, tw = 2.5 + srand(seed+i*9+2)*1.5;
            const tilt = (srand(seed+i*9+5)-0.5)*8;
            // Pre-compute rotated coords (avoid per-element transform attr)
            const rad = tilt * Math.PI / 180;
            const cos = Math.cos(rad), sin = Math.sin(rad);
            const rot = (x, y) => { const dx = x-tx, dy = y-ty; return [tx+dx*cos-dy*sin, ty+dx*sin+dy*cos]; };
            if (i < 3) {
                const [ax,ay] = rot(tx-tw, ty+2), [bx,by] = rot(tx-tw, ty-th+2);
                const [cx,cy] = rot(tx, ty-th-2), [dx,dy] = rot(tx+tw, ty-th+2), [ex,ey] = rot(tx+tw, ty+2);
                tombD += `M${ax},${ay}L${bx},${by}Q${cx},${cy} ${dx},${dy}L${ex},${ey}Z`;
            } else {
                const [x1,y1] = rot(tx, ty+2), [x2,y2] = rot(tx, ty-th);
                crossD += `M${x1},${y1}L${x2},${y2}`;
                const [x3,y3] = rot(tx-tw-1, ty-th*0.5), [x4,y4] = rot(tx+tw+1, ty-th*0.5);
                crossD += `M${x3},${y3}L${x4},${y4}`;
            }
        }
        // Dead tree
        if (srand(seed + 60) > 0.3) {
            const dtx = h.x + 16 + (srand(seed+61)-0.5)*4, dty = h.y - 2;
            treeD += `M${dtx},${dty+3}L${dtx-0.5},${dty-14}`;
            const branches = [[dty-11, 6, -3], [dty-8, -5, -4], [dty-5, 4, -2]];
            for (const [by, bx, bey] of branches) {
                treeD += `M${dtx},${by}L${dtx+bx},${by+bey}`;
            }
        }
    }
    if (moundD) g.appendChild(_el('path', { d: moundD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.4, 'stroke-opacity': 0.25 }));
    if (tombD) g.appendChild(_el('path', { d: tombD, fill: INK_DARK, 'fill-opacity': 0.12, stroke: INK_DARK, 'stroke-width': 0.45, 'stroke-opacity': 0.55 }));
    if (crossD) g.appendChild(_el('path', { d: crossD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.55, 'stroke-opacity': 0.58 }));
    if (treeD) g.appendChild(_el('path', { d: treeD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.55, 'stroke-opacity': 0.55, 'stroke-linecap': 'round' }));
}

// ── Grassland — Curved grass blades ──
function _drawGrassland(g, cluster) {
    let grassD = '';
    for (const h of cluster) {
        const seed = h.col * 100 + h.row;
        for (let i = 0; i < 5; i++) {
            const gx = h.x + (srand(seed+i*5)-0.5)*32;
            const gy = h.y + (srand(seed+i*5+2)-0.5)*16;
            for (let b = 0; b < 3; b++) {
                const angle = -20 + b * 18 + (srand(seed+i*5+b)-0.5)*12;
                const bh = 4 + srand(seed+i*5+b+10)*4;
                const rad = angle * Math.PI / 180;
                grassD += `M${gx},${gy}Q${gx+Math.sin(rad)*bh*0.5},${gy-bh*0.7} ${gx+Math.sin(rad)*bh},${gy-Math.cos(rad)*bh}`;
            }
        }
    }
    if (grassD) g.appendChild(_el('path', { d: grassD, fill: 'none', stroke: INK, 'stroke-width': 0.3, 'stroke-opacity': 0.22, 'stroke-linecap': 'round' }));
}


// Build-only map rendering functions (from navigate-map.js @ b38b874)

function _renderRivers(svg) {
    const rG = _el('g', { class: 'rivers', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    for (const river of RIVER_PATHS) {
        const p = river.pts;
        // Build base path
        let d = `M${p[0][0]},${p[0][1]}`;
        for (let i = 1; i < p.length; i++) {
            const wobX = (srand(i * 37 + p[0][0]) - 0.5) * 8;
            const wobY = (srand(i * 41 + p[0][1]) - 0.5) * 6;
            d += ` Q${(p[i-1][0]+p[i][0])/2+wobX},${(p[i-1][1]+p[i][1])/2+wobY} ${p[i][0]},${p[i][1]}`;
        }
        // Center line
        rG.appendChild(_el('path', { d, fill: 'none', stroke: INK,
            'stroke-width': river.w * 0.5, 'stroke-opacity': 0.4, 'stroke-linecap': 'round' }));
        // Two parallel side lines (medieval river convention)
        for (const side of [-1, 1]) {
            let dSide = '';
            for (let i = 0; i < p.length; i++) {
                const prev = i > 0 ? p[i-1] : p[0];
                const curr = p[i];
                const dx = i < p.length-1 ? p[i+1][0] - curr[0] : curr[0] - prev[0];
                const dy = i < p.length-1 ? p[i+1][1] - curr[1] : curr[1] - prev[1];
                const len = Math.sqrt(dx*dx + dy*dy) || 1;
                const nx = -dy/len * side * 2.0;
                const ny = dx/len * side * 2.0;
                if (i === 0) dSide = `M${curr[0]+nx},${curr[1]+ny}`;
                else {
                    const wobX = (srand(i * 37 + p[0][0] + side*100) - 0.5) * 6;
                    const wobY = (srand(i * 41 + p[0][1] + side*100) - 0.5) * 5;
                    const mx = (prev[0]+curr[0])/2 + nx + wobX;
                    const my = (prev[1]+curr[1])/2 + ny + wobY;
                    dSide += ` Q${mx},${my} ${curr[0]+nx},${curr[1]+ny}`;
                }
            }
            rG.appendChild(_el('path', { d: dSide, fill: 'none', stroke: INK,
                'stroke-width': 0.35, 'stroke-opacity': 0.25, 'stroke-linecap': 'round' }));
        }
        // Source tick marks
        const s0 = p[0];
        rG.appendChild(_el('line', { x1: s0[0]-3, y1: s0[1], x2: s0[0]+3, y2: s0[1],
            stroke: INK, 'stroke-width': 0.4, 'stroke-opacity': 0.3 }));
    }
    svg.appendChild(rG);
}

// Fog state cache — invalidated by _invalidateMapCaches()
// _cachedFogState and _prevFogState declared in navigate-map.js


function _renderBackground(svg) {
    svg.appendChild(_el('rect', { x: 0, y: 0, width: SVG_W, height: SVG_H, fill: MAP_BG }));
}

// ===============================================================
// LANDMASS — Flat parchment, no gradient
// ===============================================================

function _renderLandmass(svg) {
    const path = _landmassPath();
    // Flat parchment fill
    svg.appendChild(_el('path', { d: path, fill: PARCHMENT, stroke: 'none' }));
    // Subtle stipple dots for texture — batched into single <path>
    let stipD = '';
    for (let i = 0; i < 30; i++) {
        const dx = srand(i * 73 + 11) * SVG_W;
        const dy = srand(i * 79 + 17) * SVG_H;
        if (!_pointInLandmass(dx, dy)) continue;
        const cr = 0.6 + srand(i * 83) * 0.5;
        stipD += `M${dx-cr},${dy}a${cr},${cr} 0 1,0 ${cr*2},0a${cr},${cr} 0 1,0 ${-cr*2},0`;
    }
    if (stipD) {
        svg.appendChild(_el('path', { d: stipD, fill: INK_DARK, 'fill-opacity': 0.05,
            'clip-path': 'url(#land-clip)', 'pointer-events': 'none' }));
    }
}

// ===============================================================
// WORN PARCHMENT EDGES — Torn, burnt, aged paper border
// ===============================================================

// Render worn edges into a target group (for deferred rendering)
function _renderWornEdgesInto(targetG) {
    _renderWornEdgesImpl(targetG);
}

function _renderWornEdges(svg) {
    const eG = _el('g', { class: 'worn-edges', 'pointer-events': 'none' });
    _renderWornEdgesImpl(eG);
    svg.appendChild(eG);
}

function _renderWornEdgesImpl(eG) {
    const path = _landmassPath();
    const p = LANDMASS_POINTS;

    // === Layer 1: Deep shadow under the paper (multi-stroke, no GPU filter) ===
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#0a0806',
        'stroke-width': 22, 'stroke-opacity': 0.10 }));
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#0a0806',
        'stroke-width': 16, 'stroke-opacity': 0.18 }));
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#1a1410',
        'stroke-width': 12, 'stroke-opacity': 0.22 }));
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#1a1410',
        'stroke-width': 8, 'stroke-opacity': 0.30 }));

    // === Layer 2: Burnt/darkened edge staining (multiple bands for depth) ===
    // Wide darkened band (deep age stain)
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#2a1808',
        'stroke-width': 14, 'stroke-opacity': 0.12 }));
    // Medium stain band
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#3a2810',
        'stroke-width': 8, 'stroke-opacity': 0.2 }));
    // Narrow dark edge
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#4a3820',
        'stroke-width': 4, 'stroke-opacity': 0.25 }));
    // Inner edge darkening (visible on parchment side)
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: '#3a2810',
        'stroke-width': 2, 'stroke-opacity': 0.15 }));

    // === Layer 3: Main border line (irregular, hand-drawn feel) ===
    eG.appendChild(_el('path', { d: path, fill: 'none', stroke: INK_DARK,
        'stroke-width': 2.0, 'stroke-opacity': 0.65 }));

    // === Layer 4: Paper fiber wisps — batched into 3 opacity-bucket <path>s ===
    const fiberBuckets = ['', '', '']; // low (0.12-0.17), mid (0.17-0.22), high (0.22-0.30)
    let strandD = '';
    for (let i = 0; i < p.length; i++) {
        const curr = p[i], next = p[(i + 1) % p.length];
        const dx = next[0] - curr[0], dy = next[1] - curr[1];
        const segLen = Math.sqrt(dx * dx + dy * dy);
        if (segLen < 1) continue;
        const nx = -dy / segLen, ny = dx / segLen;

        const fiberCount = 3 + Math.floor(srand(i * 67) * 4);
        for (let j = 0; j < fiberCount; j++) {
            const t = 0.05 + j * (0.9 / fiberCount) + (srand(i * 67 + j * 3) - 0.5) * 0.06;
            const bx = curr[0] + dx * t, by = curr[1] + dy * t;
            const fLen = 2 + srand(i * 100 + j) * 7;
            const fAngle = (srand(i * 53 + j * 7) - 0.5) * 0.8;
            const fnx = nx * Math.cos(fAngle) - ny * Math.sin(fAngle);
            const fny = nx * Math.sin(fAngle) + ny * Math.cos(fAngle);
            const op = 0.12 + srand(i * 83 + j) * 0.18;
            const bucket = op < 0.17 ? 0 : op < 0.22 ? 1 : 2;
            fiberBuckets[bucket] += `M${bx},${by}L${bx - fnx * fLen},${by - fny * fLen}`;
        }

        // Torn strands (reduced frequency)
        if (srand(i * 41) > 0.72) {
            const t = srand(i * 103) * 0.7 + 0.15;
            const bx = curr[0] + dx * t, by = curr[1] + dy * t;
            const sLen = 5 + srand(i * 107) * 10;
            const sAngle = (srand(i * 109) - 0.5) * 0.5;
            const snx = nx * Math.cos(sAngle) - ny * Math.sin(sAngle);
            const sny = nx * Math.sin(sAngle) + ny * Math.cos(sAngle);
            const mx = bx - snx * sLen * 0.5 + (srand(i * 111) - 0.5) * 4;
            const my = by - sny * sLen * 0.5 + (srand(i * 113) - 0.5) * 4;
            strandD += `M${bx},${by}Q${mx},${my} ${bx - snx * sLen},${by - sny * sLen}`;
        }
    }
    const fiberOps = [0.14, 0.19, 0.26];
    for (let b = 0; b < 3; b++) {
        if (fiberBuckets[b]) {
            eG.appendChild(_el('path', { d: fiberBuckets[b], fill: 'none', stroke: PARCHMENT,
                'stroke-width': 0.45, 'stroke-opacity': fiberOps[b], 'stroke-linecap': 'round' }));
        }
    }
    if (strandD) {
        eG.appendChild(_el('path', { d: strandD, fill: 'none', stroke: PARCHMENT,
            'stroke-width': 0.55, 'stroke-opacity': 0.14, 'stroke-linecap': 'round' }));
    }

    // === Layer 5: Edge stain dots + burn marks — batched into <path>s ===
    let foxingD = '', burnD = '';
    for (let i = 0; i < p.length; i++) {
        const curr = p[i], next = p[(i + 1) % p.length];
        const dx = next[0] - curr[0], dy = next[1] - curr[1];
        const segLen = Math.sqrt(dx * dx + dy * dy);
        if (segLen < 1) continue;
        const nx = -dy / segLen, ny = dx / segLen;

        if (srand(i * 91) > 0.35) {
            const t = srand(i * 103) * 0.8 + 0.1;
            const sx = curr[0] + dx * t + nx * (srand(i * 121) - 0.5) * 4;
            const sy = curr[1] + dy * t + ny * (srand(i * 123) - 0.5) * 4;
            const cr = 1.2 + srand(i * 107) * 2.5;
            foxingD += `M${sx-cr},${sy}a${cr},${cr} 0 1,0 ${cr*2},0a${cr},${cr} 0 1,0 ${-cr*2},0`;
        }
        if (srand(i * 131) > 0.8) {
            const t = srand(i * 133) * 0.6 + 0.2;
            const bkx = curr[0] + dx * t + nx * 3;
            const bky = curr[1] + dy * t + ny * 3;
            const cr = 2 + srand(i * 137) * 4;
            burnD += `M${bkx-cr},${bky}a${cr},${cr} 0 1,0 ${cr*2},0a${cr},${cr} 0 1,0 ${-cr*2},0`;
        }
    }
    if (foxingD) eG.appendChild(_el('path', { d: foxingD, fill: '#2a1a08', 'fill-opacity': 0.08, stroke: 'none' }));
    if (burnD) eG.appendChild(_el('path', { d: burnD, fill: '#1a0e04', 'fill-opacity': 0.05, stroke: 'none' }));

    // === Layer 6: Torn-away fragments (kept as polygons, reduced from 20 to 12) ===
    for (let i = 0; i < 12; i++) {
        const idx = Math.floor(srand(i * 137) * p.length);
        const curr = p[idx], next = p[(idx + 1) % p.length];
        const dx = next[0] - curr[0], dy = next[1] - curr[1];
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const t = 0.2 + srand(i * 149) * 0.6;
        const dist = 3 + srand(i * 151) * 8;
        const fx = curr[0] + dx * t - nx * dist;
        const fy = curr[1] + dy * t - ny * dist;
        const fr = 1.5 + srand(i * 163) * 3;
        const nVerts = 5 + Math.floor(srand(i * 165) * 3);
        const fpts = [];
        for (let k = 0; k < nVerts; k++) {
            const a = (k / nVerts) * Math.PI * 2;
            const rr = fr * (0.5 + srand(i * 100 + k * 31) * 1.0);
            fpts.push(`${fx + Math.cos(a) * rr},${fy + Math.sin(a) * rr}`);
        }
        eG.appendChild(_el('polygon', {
            points: fpts.join(' '),
            fill: PARCHMENT, 'fill-opacity': 0.08 + srand(i * 167) * 0.12,
            stroke: INK_DARK, 'stroke-width': 0.25, 'stroke-opacity': 0.12,
        }));
    }

    // === Layer 7: Corner wear — batched into single <path> ===
    const corners = [
        [p[0][0], p[0][1]],
        [p[Math.floor(p.length * 0.25)][0], p[Math.floor(p.length * 0.25)][1]],
        [p[Math.floor(p.length * 0.5)][0], p[Math.floor(p.length * 0.5)][1]],
        [p[Math.floor(p.length * 0.75)][0], p[Math.floor(p.length * 0.75)][1]],
    ];
    let cornerD = '';
    for (let ci = 0; ci < corners.length; ci++) {
        const [cx, cy] = corners[ci];
        for (let j = 0; j < 8; j++) {
            const sx = cx + (srand(ci * 200 + j * 7) - 0.5) * 25;
            const sy = cy + (srand(ci * 200 + j * 7 + 3) - 0.5) * 25;
            const cr = 0.8 + srand(ci * 200 + j * 7 + 5) * 2;
            cornerD += `M${sx-cr},${sy}a${cr},${cr} 0 1,0 ${cr*2},0a${cr},${cr} 0 1,0 ${-cr*2},0`;
        }
    }
    if (cornerD) eG.appendChild(_el('path', { d: cornerD, fill: '#2a1a08', 'fill-opacity': 0.05, stroke: 'none' }));

}

// ===============================================================
// AGING EFFECTS — Stipple clusters + crease lines
// ===============================================================

// Render aging effects into a target group (for deferred rendering)
function _renderAgingEffectsInto(targetG) {
    targetG.setAttribute('class', 'aging');
    targetG.setAttribute('pointer-events', 'none');
    targetG.setAttribute('clip-path', 'url(#land-clip)');
    _renderAgingEffectsImpl(targetG);
}

function _renderAgingEffects(svg) {
    const aG = _el('g', { class: 'aging', 'pointer-events': 'none', 'clip-path': 'url(#land-clip)' });
    _renderAgingEffectsImpl(aG);
    svg.appendChild(aG);
}

function _renderAgingEffectsImpl(aG) {
    // Stipple clusters (foxing spots) — batched into a single <path>
    const spots = [[80,60,15],[650,100,12],[200,650,18],[550,550,10],[400,200,8],[120,400,14],[600,350,11],[350,680,16],[500,80,9],[700,600,13]];
    let foxD = '';
    for (const [x, y, r] of spots) {
        for (let j = 0; j < 12; j++) {
            const sx = x + (srand(x * 7 + j * 13) - 0.5) * r * 2;
            const sy = y + (srand(y * 11 + j * 17) - 0.5) * r * 2;
            const cr = 0.4 + srand(x * 3 + j) * 0.5;
            foxD += `M${sx-cr},${sy}a${cr},${cr} 0 1,0 ${cr*2},0a${cr},${cr} 0 1,0 ${-cr*2},0`;
        }
    }
    if (foxD) aG.appendChild(_el('path', { d: foxD, fill: INK_DARK, 'fill-opacity': 0.04, stroke: 'none' }));

    // Crease lines — batched into a single <path>
    const creases = [
        [60, SVG_H * 0.35, SVG_W - 60, SVG_H * 0.38, 0.10],
        [SVG_W * 0.6, 40, SVG_W * 0.58, SVG_H - 40, 0.07],
        [100, SVG_H * 0.65, SVG_W - 100, SVG_H * 0.62, 0.06],
        [SVG_W * 0.3, 60, SVG_W * 0.32, SVG_H - 60, 0.05],
    ];
    let creaseD = '';
    for (const [x1, y1, x2, y2] of creases) {
        creaseD += `M${x1},${y1}L${x2},${y2}`;
    }
    if (creaseD) aG.appendChild(_el('path', { d: creaseD, fill: 'none', stroke: INK_DARK, 'stroke-width': 0.5, 'stroke-opacity': 0.07 }));
}

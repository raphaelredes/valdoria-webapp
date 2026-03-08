// ═══════════════════════════════════════════════════════
// PROCEDURAL TILE ART — per-biome decorations on hex faces
// ═══════════════════════════════════════════════════════

// Biome color palettes (base fill color per tile char)
const BIOME_COLORS = {
    forest:   {'.':'#5a3d2b','T':'#1a4a1a','g':'#2d5a2d','w':'#2a5a8a','r':'#5a5a5a','R':'#6a5a4a','p':'#6a5040','#':'#0d2e0d','W':'#1a3a6a','M':'#4a4a4a','b':'#4a3a3a','s':'#5a3d2b','m':'#3a2a1a','i':'#7aa0b0','v':'#5a3a1a','L':'#8a2a0a'},
    plains:   {'.':'#5a4a30','T':'#3a6a2a','g':'#6a8a3a','w':'#2a5a8a','r':'#6a6a5a','R':'#5a4a3a','p':'#6a5a40','#':'#5a5a4a','W':'#1a3a6a','M':'#4a4a4a','b':'#4a3a3a','s':'#5a4a30','m':'#3a2a1a','i':'#7aa0b0','v':'#5a3a1a','L':'#8a2a0a'},
    swamp:    {'.':'#3a3a2a','T':'#2a4a2a','g':'#3a5a2a','w':'#2a4a5a','r':'#4a4a3a','R':'#5a4a3a','p':'#4a3a2a','#':'#1a3a1a','W':'#1a3a4a','M':'#3a3a3a','m':'#3a2a1a','b':'#3a3030','s':'#3a3a2a','i':'#5a8090','v':'#4a2a1a','L':'#7a2a0a'},
    cave:     {'.':'#1a1a2a','T':'#2a2a2a','g':'#1a1a1a','w':'#1a2a4a','r':'#3a3a3a','R':'#4a3a2a','p':'#2a2a2a','#':'#0a0a0a','W':'#0a1a3a','M':'#1a1a1a','b':'#2a1a1a','s':'#1a1a2a','m':'#1a1010','i':'#4a6a7a','v':'#3a1a0a','L':'#6a1a0a'},
    desert:   {'.':'#8a7a4a','T':'#4a6a2a','g':'#8a7a50','w':'#2a5a8a','r':'#7a6a5a','R':'#6a5a4a','p':'#8a7a50','#':'#6a5a4a','W':'#1a3a6a','M':'#5a4a3a','s':'#9a8a5a','b':'#6a5a4a','m':'#5a4020','i':'#9abac0','v':'#7a4a1a','L':'#9a3a0a'},
    mountain: {'.':'#5a4a3a','T':'#2a4a2a','g':'#3a5a3a','w':'#2a5a8a','r':'#6a6a6a','R':'#5a4a3a','p':'#5a4a3a','#':'#3a3a3a','W':'#1a3a6a','M':'#4a4a5a','b':'#4a3a3a','s':'#5a4a3a','m':'#3a2a1a','i':'#7a9aaa','v':'#5a3a1a','L':'#8a2a0a'},
    snow:     {'.':'#c0c8d0','T':'#2a5a3a','g':'#b0b8c0','w':'#3a6a9a','r':'#7a7a8a','R':'#6a6a7a','p':'#b0b0b8','#':'#8a8a9a','W':'#2a4a7a','M':'#6a6a7a','i':'#9ab0c0','b':'#8a8090','s':'#c0c8d0','m':'#7a7080','v':'#8a5a3a','L':'#8a3a1a'},
    volcanic: {'.':'#3a2a1a','T':'#2a2a2a','g':'#3a2a1a','w':'#2a3a5a','r':'#4a3a2a','R':'#5a3a2a','p':'#3a2a1a','#':'#2a1a0a','W':'#1a2a4a','M':'#3a2a1a','v':'#6a3a1a','L':'#8a2a0a','b':'#3a2020','s':'#3a2a1a','m':'#2a1a0a','i':'#5a7080'},
    graveyard:{'.':'#3a3a3a','T':'#1a3a1a','g':'#2a3a2a','w':'#2a3a5a','r':'#4a4a4a','R':'#4a3a3a','p':'#3a3a3a','#':'#2a2a2a','W':'#1a2a4a','M':'#3a3a3a','b':'#4a3a3a','s':'#3a3a3a','m':'#2a2020','i':'#6a8090','v':'#4a2a1a','L':'#7a2a0a'},
};

// Seeded random for deterministic decoration placement per tile
function tileRand(col, row, seed) {
    let h = (col * 374761 + row * 668265 + seed * 982451) & 0x7fffffff;
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = (h >> 16) ^ h;
    return (h & 0xffff) / 0x10000;
}

// ═══════════════════════════════════════════
// HELPER: draw a single small tree (reusable)
// ═══════════════════════════════════════════
function _drawConifer(ctx, tx, ty, scale, darkColor, lightColor) {
    const s = scale || 1;
    // Trunk
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(tx - 1 * s, ty - 2 * s, 2 * s, 5 * s);
    // Canopy
    ctx.beginPath();
    ctx.moveTo(tx, ty - 12 * s);
    ctx.lineTo(tx + 5 * s, ty - 1 * s);
    ctx.lineTo(tx - 5 * s, ty - 1 * s);
    ctx.closePath();
    ctx.fillStyle = darkColor || '#1a4a1a';
    ctx.fill();
    // Second layer
    ctx.beginPath();
    ctx.moveTo(tx, ty - 14 * s);
    ctx.lineTo(tx + 3.5 * s, ty - 7 * s);
    ctx.lineTo(tx - 3.5 * s, ty - 7 * s);
    ctx.closePath();
    ctx.fillStyle = lightColor || '#2a5a2a';
    ctx.fill();
}

function _drawBush(ctx, bx, by, size, color) {
    ctx.fillStyle = color || '#2a5a1a';
    ctx.beginPath();
    ctx.arc(bx, by, size, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.arc(bx - size * 0.2, by - size * 0.3, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

// Shadow projected under decorations (isometric light from top-left)
function _drawDecorationShadow(ctx, cx, cy, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy + 2, w, h, 0.1, 0, Math.PI * 2);
    ctx.fill();
}

// Biomes where wind animates vegetation (outdoor environments)
const WIND_BIOMES = new Set(['forest', 'plains', 'swamp', 'mountain', 'graveyard']);

// ═══════════════════════════════════════════
// DECORATION DRAWING FUNCTIONS
// ═══════════════════════════════════════════

function drawTreeDecoration(ctx, cx, cy, biome, col, row) {
    // Isometric shadow under tree cluster
    _drawDecorationShadow(ctx, cx, cy, 11, 4);
    const r1 = tileRand(col, row, 1);
    const r2 = tileRand(col, row, 2);
    const r3 = tileRand(col, row, 3);
    const r4 = tileRand(col, row, 4);
    const r5 = tileRand(col, row, 5);

    if (biome === 'desert') {
        // Cactus cluster
        const tx = cx + (r1 - 0.5) * 8;
        const ty = cy + (r2 - 0.5) * 4;
        ctx.fillStyle = '#3a6a2a';
        ctx.fillRect(tx - 2, ty - 10, 4, 14);
        ctx.fillRect(tx - 6, ty - 6, 4, 3);
        ctx.fillRect(tx + 2, ty - 8, 4, 3);
        // Second smaller cactus
        if (r3 > 0.35) {
            const tx2 = cx + (r3 - 0.5) * 14;
            const ty2 = cy + (r4 - 0.5) * 5;
            ctx.fillStyle = '#2a5a1a';
            ctx.fillRect(tx2 - 1.5, ty2 - 6, 3, 8);
        }
        // Small rocks at base
        ctx.fillStyle = '#7a6a4a';
        ctx.beginPath();
        ctx.arc(tx + 5, ty + 2, 1.5, 0, Math.PI * 2);
        ctx.arc(tx - 4, ty + 1, 1, 0, Math.PI * 2);
        ctx.fill();

    } else if (biome === 'swamp') {
        // Droopy mangrove cluster
        const tx = cx + (r1 - 0.5) * 6;
        const ty = cy + (r2 - 0.5) * 3;
        // Main tree
        ctx.fillStyle = '#1a3a16';
        ctx.fillRect(tx - 1.5, ty - 6, 3, 10);
        ctx.beginPath();
        ctx.arc(tx, ty - 7, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#2a4a1a';
        ctx.fill();
        // Hanging vines
        ctx.strokeStyle = '#1a3a16';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(tx - 4, ty - 4);
        ctx.lineTo(tx - 5, ty + 2);
        ctx.moveTo(tx + 3, ty - 5);
        ctx.lineTo(tx + 4, ty + 1);
        ctx.moveTo(tx - 1, ty - 2);
        ctx.lineTo(tx - 2, ty + 3);
        ctx.stroke();
        // Second smaller tree
        if (r3 > 0.3) {
            const tx2 = cx + (r3 - 0.2) * 10;
            const ty2 = cy + (r4 - 0.4) * 4;
            ctx.fillStyle = '#1a3016';
            ctx.fillRect(tx2 - 1, ty2 - 4, 2, 7);
            ctx.beginPath();
            ctx.arc(tx2, ty2 - 5, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#1a3a16';
            ctx.fill();
        }
        // Mushrooms
        ctx.fillStyle = '#6a5a3a';
        ctx.beginPath();
        ctx.arc(cx + 6, cy + 3, 1.5, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(cx + 5.5, cy + 3, 1, 2);

    } else if (biome === 'snow') {
        // Snow-capped pine cluster (2-3 trees)
        const trees = r5 > 0.5 ? 3 : 2;
        const positions = [
            [cx + (r1 - 0.5) * 6, cy + (r2 - 0.5) * 3, 1],
            [cx + (r3 - 0.5) * 12, cy + (r4 - 0.3) * 5, 0.75],
            [cx + (r5 - 0.5) * 10, cy + (r1 * 0.5 - 0.2) * 4, 0.6],
        ];
        for (let i = 0; i < trees; i++) {
            const [tx, ty, s] = positions[i];
            ctx.fillStyle = '#3a2a1a';
            ctx.fillRect(tx - 1 * s, ty - 2 * s, 2 * s, 6 * s);
            // Pine triangle
            ctx.beginPath();
            ctx.moveTo(tx, ty - 12 * s);
            ctx.lineTo(tx + 6 * s, ty - 1 * s);
            ctx.lineTo(tx - 6 * s, ty - 1 * s);
            ctx.closePath();
            ctx.fillStyle = '#1a4a2a';
            ctx.fill();
            // Snow cap
            ctx.beginPath();
            ctx.moveTo(tx, ty - 12 * s);
            ctx.lineTo(tx + 3 * s, ty - 8 * s);
            ctx.lineTo(tx - 3 * s, ty - 8 * s);
            ctx.closePath();
            ctx.fillStyle = '#e0e8f0';
            ctx.fill();
        }
        // Snow mound
        ctx.fillStyle = 'rgba(230,240,250,0.15)';
        ctx.beginPath();
        ctx.ellipse(cx + 3, cy + 3, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();

    } else if (biome === 'plains') {
        // Rounded deciduous trees (2-3)
        const trees = r5 > 0.4 ? 3 : 2;
        const positions = [
            [cx + (r1 - 0.5) * 6, cy + (r2 - 0.5) * 3, 1],
            [cx + (r3 - 0.5) * 12, cy + (r4 - 0.3) * 5, 0.8],
            [cx + (r5 - 0.6) * 10, cy + (r2 * 0.4) * 4, 0.65],
        ];
        for (let i = 0; i < trees; i++) {
            const [tx, ty, s] = positions[i];
            ctx.fillStyle = '#4a3020';
            ctx.fillRect(tx - 1.5 * s, ty - 3 * s, 3 * s, 7 * s);
            ctx.beginPath();
            ctx.arc(tx, ty - 6 * s, 6 * s, 0, Math.PI * 2);
            ctx.fillStyle = i === 0 ? '#3a7a2a' : '#2a6a1a';
            ctx.fill();
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.beginPath();
            ctx.arc(tx - 1 * s, ty - 7 * s, 3 * s, 0, Math.PI * 2);
            ctx.fill();
        }
        // Flowers
        if (r4 > 0.5) {
            ctx.fillStyle = '#c87a30';
            ctx.beginPath();
            ctx.arc(cx - 7, cy + 2, 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#d44a60';
            ctx.beginPath();
            ctx.arc(cx + 8, cy - 1, 1, 0, Math.PI * 2);
            ctx.fill();
        }

    } else {
        // Default conifer cluster (forest, mountain, cave, graveyard, volcanic)
        const darkGreen = biome === 'graveyard' ? '#1a2a1a' : biome === 'volcanic' ? '#1a2a1a' : '#1a4a1a';
        const lightGreen = biome === 'graveyard' ? '#0d200d' : '#0d3a0d';

        // Main tree (always)
        const tx1 = cx + (r1 - 0.5) * 6;
        const ty1 = cy + (r2 - 0.5) * 3;
        _drawConifer(ctx, tx1, ty1, 1, darkGreen, darkGreen);

        // Second tree (always)
        const tx2 = cx + (r3 - 0.5) * 12;
        const ty2 = cy + (r4 - 0.3) * 5;
        _drawConifer(ctx, tx2, ty2, 0.7, lightGreen, lightGreen);

        // Third tree (60% chance)
        if (r5 > 0.4) {
            const tx3 = cx + (r5 - 0.6) * 10;
            const ty3 = cy + (r1 * 0.4 + 0.1) * 4;
            _drawConifer(ctx, tx3, ty3, 0.55, darkGreen, lightGreen);
        }

        // Underbrush (small bushes)
        if (biome === 'forest') {
            _drawBush(ctx, cx + 7, cy + 3, 2.5, '#1a3a10');
            if (r4 > 0.5) _drawBush(ctx, cx - 6, cy + 2, 2, '#1a3a10');
        }
    }
}

function drawMountainDecoration(ctx, cx, cy, col, row) {
    _drawDecorationShadow(ctx, cx, cy, 13, 5);
    const r1 = tileRand(col, row, 10);
    const r2 = tileRand(col, row, 11);
    // Main peak
    const peakH = 14 + r1 * 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - peakH);
    ctx.lineTo(cx + 10, cy + 2);
    ctx.lineTo(cx - 10, cy + 2);
    ctx.closePath();
    ctx.fillStyle = '#5a5a6a';
    ctx.fill();
    // Dark face (left side)
    ctx.beginPath();
    ctx.moveTo(cx, cy - peakH);
    ctx.lineTo(cx - 10, cy + 2);
    ctx.lineTo(cx, cy + 2);
    ctx.closePath();
    ctx.fillStyle = '#4a4a5a';
    ctx.fill();
    // Snow cap
    ctx.beginPath();
    ctx.moveTo(cx, cy - peakH);
    ctx.lineTo(cx + 4, cy - peakH + 6);
    ctx.lineTo(cx - 4, cy - peakH + 6);
    ctx.closePath();
    ctx.fillStyle = '#e8e8f0';
    ctx.fill();
    // Secondary peak (70% chance)
    if (r2 > 0.3) {
        const ox = (r2 - 0.5) * 12;
        const h2 = peakH * 0.6;
        ctx.beginPath();
        ctx.moveTo(cx + ox, cy - h2);
        ctx.lineTo(cx + ox + 6, cy + 1);
        ctx.lineTo(cx + ox - 6, cy + 1);
        ctx.closePath();
        ctx.fillStyle = '#4a4a5a';
        ctx.fill();
        // Small snow cap on secondary
        ctx.beginPath();
        ctx.moveTo(cx + ox, cy - h2);
        ctx.lineTo(cx + ox + 2, cy - h2 + 3);
        ctx.lineTo(cx + ox - 2, cy - h2 + 3);
        ctx.closePath();
        ctx.fillStyle = '#dde0e8';
        ctx.fill();
    }
    // Rocks at base
    ctx.fillStyle = '#6a6a6a';
    ctx.beginPath();
    ctx.arc(cx - 7, cy + 1, 1.5, 0, Math.PI * 2);
    ctx.arc(cx + 8, cy, 1.2, 0, Math.PI * 2);
    ctx.fill();
}

function drawRockDecoration(ctx, cx, cy, col, row) {
    _drawDecorationShadow(ctx, cx, cy, 8, 3);
    const r1 = tileRand(col, row, 20);
    // 2-3 angular rocks
    for (let i = 0; i < 2 + (r1 > 0.5 ? 1 : 0); i++) {
        const rx = cx + (tileRand(col, row, 22 + i) - 0.5) * 14;
        const ry = cy + (tileRand(col, row, 25 + i) - 0.5) * 8;
        const size = 3 + tileRand(col, row, 28 + i) * 3;
        ctx.beginPath();
        ctx.moveTo(rx, ry - size);
        ctx.lineTo(rx + size, ry);
        ctx.lineTo(rx + size * 0.3, ry + size * 0.5);
        ctx.lineTo(rx - size * 0.7, ry + size * 0.3);
        ctx.closePath();
        ctx.fillStyle = `rgb(${80 + i * 15},${80 + i * 15},${80 + i * 15})`;
        ctx.fill();
        // Highlight edge
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(rx, ry - size);
        ctx.lineTo(rx + size, ry);
        ctx.stroke();
    }
}

function drawWaterDecoration(ctx, cx, cy, timestamp, deep) {
    const t = (timestamp || 0) * 0.001;
    const alpha = deep ? 0.12 : 0.18;
    ctx.strokeStyle = `rgba(180,220,255,${alpha})`;
    ctx.lineWidth = 0.8;
    // 2-3 wave lines
    for (let i = 0; i < (deep ? 3 : 3); i++) {
        const y = cy - 4 + i * 4;
        ctx.beginPath();
        for (let x = cx - 14; x <= cx + 14; x += 2) {
            const wy = y + Math.sin((x + t * 40 + i * 30) * 0.15) * 2;
            if (x === cx - 14) ctx.moveTo(x, wy);
            else ctx.lineTo(x, wy);
        }
        ctx.stroke();
    }
    // Sparkle on shallow water
    if (!deep) {
        const sparkleX = cx + Math.sin(t * 1.5) * 8;
        const sparkleY = cy + Math.cos(t * 2) * 4;
        ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.sin(t * 4) * 0.1})`;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, 1, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawLavaDecoration(ctx, cx, cy, timestamp) {
    const t = (timestamp || 0) * 0.001;
    // Glowing cracks
    ctx.strokeStyle = `rgba(255,200,50,${0.4 + Math.sin(t * 2) * 0.2})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 2);
    ctx.lineTo(cx - 2, cy + 1);
    ctx.lineTo(cx + 3, cy - 3);
    ctx.lineTo(cx + 9, cy + 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + 4);
    ctx.lineTo(cx + 2, cy + 2);
    ctx.lineTo(cx + 7, cy + 5);
    ctx.stroke();
    // Bubbles
    const bubbleX = cx + Math.sin(t * 1.3) * 5;
    const bubbleY = cy + Math.cos(t * 1.7) * 3;
    ctx.fillStyle = `rgba(255,150,50,${0.3 + Math.sin(t * 5) * 0.15})`;
    ctx.beginPath();
    ctx.arc(bubbleX, bubbleY, 1.5 + Math.sin(t * 3) * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Glow halo
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
    grad.addColorStop(0, `rgba(255,100,0,${0.08 + Math.sin(t * 3) * 0.04})`);
    grad.addColorStop(1, 'rgba(255,100,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - 18, cy - 18, 36, 36);
}

function drawRuinsDecoration(ctx, cx, cy, col, row) {
    _drawDecorationShadow(ctx, cx, cy, 9, 3.5);
    const r1 = tileRand(col, row, 30);
    // Broken pillars
    for (let i = 0; i < 2; i++) {
        const rx = cx + (tileRand(col, row, 31 + i) - 0.5) * 12;
        const ry = cy + (tileRand(col, row, 33 + i) - 0.5) * 6;
        const h = 4 + tileRand(col, row, 35 + i) * 5;
        ctx.fillStyle = '#7a6a5a';
        ctx.fillRect(rx - 2, ry - h, 4, h);
        // Broken top
        ctx.fillStyle = '#8a7a6a';
        ctx.beginPath();
        ctx.moveTo(rx - 3, ry - h);
        ctx.lineTo(rx + 1, ry - h - 2);
        ctx.lineTo(rx + 3, ry - h);
        ctx.closePath();
        ctx.fill();
    }
    // Rubble
    ctx.fillStyle = '#6a5a4a';
    ctx.beginPath();
    ctx.arc(cx + 4, cy + 2, 1.5, 0, Math.PI * 2);
    ctx.arc(cx - 3, cy + 3, 1, 0, Math.PI * 2);
    ctx.arc(cx + 7, cy + 1, 0.8, 0, Math.PI * 2);
    ctx.fill();
}

function drawBonesDecoration(ctx, cx, cy, col, row, biome) {
    _drawDecorationShadow(ctx, cx, cy, 7, 2.5);
    const color = biome === 'graveyard' ? '#9a8a7a' : '#c0b8a8';
    for (let i = 0; i < 2; i++) {
        const bx = cx + (tileRand(col, row, 40 + i) - 0.5) * 12;
        const by = cy + (tileRand(col, row, 42 + i) - 0.5) * 6;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        // Cross shape
        ctx.beginPath();
        ctx.moveTo(bx - 3, by);
        ctx.lineTo(bx + 3, by);
        ctx.moveTo(bx, by - 3);
        ctx.lineTo(bx, by + 3);
        ctx.stroke();
    }
    if (biome === 'graveyard') {
        // Tombstone (3D-ish)
        const gx = cx + (tileRand(col, row, 45) - 0.5) * 6;
        const gy = cy + (tileRand(col, row, 46) - 0.5) * 4;
        // Side (darker)
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(gx - 3, gy - 5, 6, 8);
        // Front face
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(gx - 3, gy - 6, 6, 7);
        ctx.beginPath();
        ctx.arc(gx, gy - 6, 3, Math.PI, 0);
        ctx.fill();
        // Cross on tombstone
        ctx.strokeStyle = '#7a7a7a';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(gx, gy - 7);
        ctx.lineTo(gx, gy - 3);
        ctx.moveTo(gx - 1.5, gy - 5.5);
        ctx.lineTo(gx + 1.5, gy - 5.5);
        ctx.stroke();
    }
}

function drawPathDecoration(ctx, cx, cy, col, row) {
    const r1 = tileRand(col, row, 50);
    ctx.strokeStyle = 'rgba(180,160,120,0.3)';
    ctx.lineWidth = 2;
    // Two parallel worn lines
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 1 + r1 * 2);
    ctx.lineTo(cx + 12, cy - 1 + r1 * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 3 + r1 * 2);
    ctx.lineTo(cx + 12, cy + 3 + r1 * 2);
    ctx.stroke();
    // Small pebbles along path
    ctx.fillStyle = 'rgba(160,140,100,0.2)';
    for (let i = 0; i < 3; i++) {
        const px = cx + (tileRand(col, row, 52 + i) - 0.5) * 18;
        const py = cy + r1 * 2 + 1;
        ctx.beginPath();
        ctx.arc(px, py, 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawIceDecoration(ctx, cx, cy, col, row) {
    // Shine lines
    ctx.strokeStyle = 'rgba(220,240,255,0.3)';
    ctx.lineWidth = 1;
    const r1 = tileRand(col, row, 60);
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 2 + r1 * 3);
    ctx.lineTo(cx + 8, cy - 2 + r1 * 3);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220,240,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 2 + r1 * 2);
    ctx.lineTo(cx + 10, cy + 2 + r1 * 2);
    ctx.stroke();
    // Ice crystal sparkle
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(cx + 3, cy - 1, 1, 0, Math.PI * 2);
    ctx.fill();
}

function drawWallDecoration(ctx, cx, cy, heightPx, col, row) {
    // Brick lines on the right side face
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    const hh = HEX_H / 2;
    for (let i = 1; i < Math.floor(heightPx / 4); i++) {
        const y = cy + hh + i * 4;
        ctx.beginPath();
        ctx.moveTo(cx - 2, y);
        ctx.lineTo(cx + HEX_W / 2 - 2, y - 2);
        ctx.stroke();
    }
}

function drawSandDecoration(ctx, cx, cy, col, row) {
    // Sand ripples (wind patterns)
    ctx.strokeStyle = 'rgba(200,180,120,0.15)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 3; i++) {
        const y = cy - 3 + i * 4;
        ctx.beginPath();
        for (let x = cx - 10; x <= cx + 10; x += 3) {
            const wy = y + Math.sin(x * 0.3 + i) * 1;
            if (x === cx - 10) ctx.moveTo(x, wy);
            else ctx.lineTo(x, wy);
        }
        ctx.stroke();
    }
    // Sand grain dots
    ctx.fillStyle = 'rgba(200,180,120,0.15)';
    for (let i = 0; i < 3; i++) {
        const sx = cx + (tileRand(col, row, 70 + i) - 0.5) * 16;
        const sy = cy + (tileRand(col, row, 75 + i) - 0.5) * 10;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawMudDecoration(ctx, cx, cy) {
    // Wet reflection
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.ellipse(cx - 2, cy - 1, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bubbles
    ctx.fillStyle = 'rgba(100,90,60,0.2)';
    ctx.beginPath();
    ctx.arc(cx + 3, cy + 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 2, 1, 0, Math.PI * 2);
    ctx.fill();
}

function drawVolcanicDecoration(ctx, cx, cy, col, row) {
    const r1 = tileRand(col, row, 80);
    // Cracked surface pattern
    ctx.strokeStyle = 'rgba(200,80,20,0.2)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 3);
    ctx.lineTo(cx + r1 * 4, cy + 1);
    ctx.lineTo(cx + 8, cy + 3);
    ctx.stroke();
    // Smaller cracks
    ctx.strokeStyle = 'rgba(200,80,20,0.12)';
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy + 2);
    ctx.lineTo(cx + 4, cy - 1);
    ctx.stroke();
    // Warm glow between cracks
    ctx.fillStyle = 'rgba(255,100,20,0.04)';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
}

function drawGrassDecoration(ctx, cx, cy, col, row, biome) {
    const grassColor = biome === 'snow' ? '#8a9a8a' : biome === 'swamp' ? '#3a5a2a' : '#4a7a3a';
    ctx.strokeStyle = grassColor;
    ctx.lineWidth = 0.7;
    // Grass tufts (4-5)
    for (let i = 0; i < 4; i++) {
        const gx = cx + (tileRand(col, row, 90 + i) - 0.5) * 14;
        const gy = cy + (tileRand(col, row, 93 + i) - 0.5) * 8;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx - 2, gy - 4);
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + 1, gy - 3.5);
        ctx.moveTo(gx + 0.5, gy);
        ctx.lineTo(gx + 2.5, gy - 3);
        ctx.stroke();
    }
    // Small bush in forest/plains
    if ((biome === 'forest' || biome === 'plains') && tileRand(col, row, 97) > 0.5) {
        _drawBush(ctx, cx + (tileRand(col, row, 98) - 0.5) * 10, cy + 1, 2.5,
            biome === 'forest' ? '#1a3a10' : '#3a6a20');
    }
    // Flowers in plains
    if (biome === 'plains' && tileRand(col, row, 99) > 0.4) {
        const colors = ['#d44a60', '#c87a30', '#8a5aaa', '#4a8ac0'];
        for (let i = 0; i < 2; i++) {
            ctx.fillStyle = colors[Math.floor(tileRand(col, row, 110 + i) * colors.length)];
            const fx = cx + (tileRand(col, row, 112 + i) - 0.5) * 12;
            const fy = cy + (tileRand(col, row, 114 + i) - 0.5) * 6;
            ctx.beginPath();
            ctx.arc(fx, fy, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawGroundTexture(ctx, cx, cy, col, row, biome) {
    // Subtle noise dots for texture
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < 4; i++) {
        const dx = cx + (tileRand(col, row, 100 + i) - 0.5) * 16;
        const dy = cy + (tileRand(col, row, 104 + i) - 0.5) * 10;
        ctx.beginPath();
        ctx.arc(dx, dy, 0.6 + tileRand(col, row, 108 + i) * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }

    // Biome-specific ambient details on ground tiles
    if (biome === 'forest') {
        // Small undergrowth/fallen leaves
        if (tileRand(col, row, 120) > 0.5) {
            _drawBush(ctx, cx + (tileRand(col, row, 121) - 0.5) * 10, cy + 2, 2, '#1a3a10');
        }
        // Tiny mushroom
        if (tileRand(col, row, 123) > 0.7) {
            const mx = cx + (tileRand(col, row, 124) - 0.5) * 12;
            const my = cy + (tileRand(col, row, 125) - 0.5) * 6;
            ctx.fillStyle = '#8a5a3a';
            ctx.beginPath();
            ctx.arc(mx, my - 1.5, 2, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(mx - 0.5, my - 1, 1, 2);
        }
    } else if (biome === 'plains') {
        // Wildflowers
        if (tileRand(col, row, 120) > 0.6) {
            const colors = ['#d44a60', '#c87a30', '#6a8a3a'];
            const fx = cx + (tileRand(col, row, 121) - 0.5) * 12;
            const fy = cy + (tileRand(col, row, 122) - 0.5) * 6;
            ctx.fillStyle = colors[Math.floor(tileRand(col, row, 123) * colors.length)];
            ctx.beginPath();
            ctx.arc(fx, fy, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (biome === 'swamp') {
        // Puddle
        if (tileRand(col, row, 120) > 0.6) {
            ctx.fillStyle = 'rgba(40,60,50,0.2)';
            ctx.beginPath();
            ctx.ellipse(cx + 2, cy + 1, 5, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (biome === 'desert') {
        // Small rock or bone
        if (tileRand(col, row, 120) > 0.7) {
            ctx.fillStyle = '#9a8a6a';
            const rx = cx + (tileRand(col, row, 121) - 0.5) * 10;
            const ry = cy + (tileRand(col, row, 122) - 0.5) * 6;
            ctx.beginPath();
            ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (biome === 'snow') {
        // Snow drift
        if (tileRand(col, row, 120) > 0.5) {
            ctx.fillStyle = 'rgba(230,240,250,0.1)';
            ctx.beginPath();
            ctx.ellipse(cx + 3, cy + 1, 6, 2, 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Exit tile portal glow
function drawExitDecoration(ctx, cx, cy, timestamp) {
    const t = (timestamp || 0) * 0.001;
    const pulse = 0.4 + Math.sin(t * 2) * 0.15;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14);
    grad.addColorStop(0, `rgba(74,214,128,${pulse})`);
    grad.addColorStop(0.6, `rgba(74,214,128,${pulse * 0.3})`);
    grad.addColorStop(1, 'rgba(74,214,128,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    // Door icon (3D-ish)
    ctx.fillStyle = `rgba(74,214,128,${0.5 + Math.sin(t * 2) * 0.2})`;
    ctx.fillRect(cx - 3, cy - 6, 6, 11);
    ctx.fillStyle = `rgba(50,180,100,${0.5 + Math.sin(t * 2) * 0.2})`;
    ctx.fillRect(cx - 3, cy - 6, 2, 11);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(cx + 1, cy, 1, 0, Math.PI * 2);
    ctx.fill();
}

// POI marker (floating exclamation with bounce)
function drawPOIMarker(ctx, cx, cy, icon, timestamp) {
    const t = (timestamp || 0) * 0.001;
    const bounce = Math.sin(t * 3) * 3;
    const my = cy - 18 + bounce;
    // Gold glow
    const grad = ctx.createRadialGradient(cx, my, 0, cx, my, 10);
    grad.addColorStop(0, 'rgba(196,149,58,0.4)');
    grad.addColorStop(1, 'rgba(196,149,58,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, my, 10, 0, Math.PI * 2);
    ctx.fill();
    // Marker circle
    ctx.beginPath();
    ctx.arc(cx, my, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#c4953a';
    ctx.fill();
    // Icon
    ctx.font = 'bold 8px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('!', cx, my);
}

// ═══════════════════════════════════════════
// WIND-ANIMATED VEGETATION (dynamic pass)
// ═══════════════════════════════════════════

// Conifer helper with wind sway on tips (ref: navigate banner oscillation)
function _drawConiferWind(ctx, tx, ty, scale, darkColor, lightColor, wind) {
    const s = scale || 1;
    const w = wind || 0;
    // Trunk (stays fixed)
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(tx - 1 * s, ty - 2 * s, 2 * s, 5 * s);
    // Canopy — tip sways with wind via quadraticCurveTo
    ctx.beginPath();
    ctx.moveTo(tx + w * s, ty - 12 * s);
    ctx.quadraticCurveTo(tx + w * 0.5 * s + 2.5 * s, ty - 6 * s, tx + 5 * s, ty - 1 * s);
    ctx.lineTo(tx - 5 * s, ty - 1 * s);
    ctx.quadraticCurveTo(tx + w * 0.5 * s - 2.5 * s, ty - 6 * s, tx + w * s, ty - 12 * s);
    ctx.closePath();
    ctx.fillStyle = darkColor || '#1a4a1a';
    ctx.fill();
    // Second layer
    ctx.beginPath();
    ctx.moveTo(tx + w * 0.8 * s, ty - 14 * s);
    ctx.quadraticCurveTo(tx + w * 0.4 * s + 1.5 * s, ty - 10 * s, tx + 3.5 * s, ty - 7 * s);
    ctx.lineTo(tx - 3.5 * s, ty - 7 * s);
    ctx.quadraticCurveTo(tx + w * 0.4 * s - 1.5 * s, ty - 10 * s, tx + w * 0.8 * s, ty - 14 * s);
    ctx.closePath();
    ctx.fillStyle = lightColor || '#2a5a2a';
    ctx.fill();
}

// Wind-animated tree decoration (4-phase oscillation like navigate banner)
function drawTreeDecorationWind(ctx, cx, cy, biome, col, row, timestamp) {
    const r1 = tileRand(col, row, 1);
    const r2 = tileRand(col, row, 2);
    const r3 = tileRand(col, row, 3);
    const r4 = tileRand(col, row, 4);
    const r5 = tileRand(col, row, 5);
    const seed = col * 7 + row * 13;
    const wind = Math.sin(timestamp * 0.0012 + seed) * 2;
    const wind2 = Math.sin(timestamp * 0.0015 + seed * 1.3) * 1.5;

    // Isometric shadow (static)
    _drawDecorationShadow(ctx, cx, cy, 11, 4);

    if (biome === 'swamp') {
        const tx = cx + (r1 - 0.5) * 6;
        const ty = cy + (r2 - 0.5) * 3;
        ctx.fillStyle = '#1a3a16';
        ctx.fillRect(tx - 1.5, ty - 6, 3, 10);
        // Canopy sways
        ctx.beginPath();
        ctx.arc(tx + wind * 0.6, ty - 7, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#2a4a1a';
        ctx.fill();
        // Swaying vines with bezier curves
        ctx.strokeStyle = '#1a3a16';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(tx - 4, ty - 4);
        ctx.quadraticCurveTo(tx - 4.5 + wind * 0.8, ty - 1, tx - 5 + wind, ty + 2);
        ctx.moveTo(tx + 3, ty - 5);
        ctx.quadraticCurveTo(tx + 3.5 + wind * 0.6, ty - 2, tx + 4 + wind * 0.8, ty + 1);
        ctx.moveTo(tx - 1, ty - 2);
        ctx.quadraticCurveTo(tx - 1.5 + wind * 0.4, ty + 0.5, tx - 2 + wind * 0.6, ty + 3);
        ctx.stroke();
        if (r3 > 0.3) {
            const tx2 = cx + (r3 - 0.2) * 10;
            const ty2 = cy + (r4 - 0.4) * 4;
            ctx.fillStyle = '#1a3016';
            ctx.fillRect(tx2 - 1, ty2 - 4, 2, 7);
            ctx.beginPath();
            ctx.arc(tx2 + wind2 * 0.4, ty2 - 5, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#1a3a16';
            ctx.fill();
        }
        ctx.fillStyle = '#6a5a3a';
        ctx.beginPath();
        ctx.arc(cx + 6, cy + 3, 1.5, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(cx + 5.5, cy + 3, 1, 2);

    } else if (biome === 'plains') {
        const trees = r5 > 0.4 ? 3 : 2;
        const positions = [
            [cx + (r1 - 0.5) * 6, cy + (r2 - 0.5) * 3, 1],
            [cx + (r3 - 0.5) * 12, cy + (r4 - 0.3) * 5, 0.8],
            [cx + (r5 - 0.6) * 10, cy + (r2 * 0.4) * 4, 0.65],
        ];
        for (let i = 0; i < trees; i++) {
            const [tx, ty, s] = positions[i];
            const w = wind * s;
            ctx.fillStyle = '#4a3020';
            ctx.fillRect(tx - 1.5 * s, ty - 3 * s, 3 * s, 7 * s);
            // Canopy sways with wind
            ctx.beginPath();
            ctx.arc(tx + w * 0.5, ty - 6 * s, 6 * s, 0, Math.PI * 2);
            ctx.fillStyle = i === 0 ? '#3a7a2a' : '#2a6a1a';
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.beginPath();
            ctx.arc(tx + w * 0.5 - 1 * s, ty - 7 * s, 3 * s, 0, Math.PI * 2);
            ctx.fill();
        }
        if (r4 > 0.5) {
            ctx.fillStyle = '#c87a30';
            ctx.beginPath();
            ctx.arc(cx - 7, cy + 2, 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#d44a60';
            ctx.beginPath();
            ctx.arc(cx + 8, cy - 1, 1, 0, Math.PI * 2);
            ctx.fill();
        }

    } else {
        // Default conifer with swaying tips (forest, mountain, graveyard)
        const darkGreen = biome === 'graveyard' ? '#1a2a1a' : '#1a4a1a';
        const lightGreen = biome === 'graveyard' ? '#0d200d' : '#0d3a0d';

        const tx1 = cx + (r1 - 0.5) * 6;
        const ty1 = cy + (r2 - 0.5) * 3;
        _drawConiferWind(ctx, tx1, ty1, 1, darkGreen, darkGreen, wind);

        const tx2 = cx + (r3 - 0.5) * 12;
        const ty2 = cy + (r4 - 0.3) * 5;
        _drawConiferWind(ctx, tx2, ty2, 0.7, lightGreen, lightGreen, wind2);

        if (r5 > 0.4) {
            const tx3 = cx + (r5 - 0.6) * 10;
            const ty3 = cy + (r1 * 0.4 + 0.1) * 4;
            _drawConiferWind(ctx, tx3, ty3, 0.55, darkGreen, lightGreen, wind * 0.7);
        }

        if (biome === 'forest') {
            _drawBush(ctx, cx + 7, cy + 3, 2.5, '#1a3a10');
            if (r4 > 0.5) _drawBush(ctx, cx - 6, cy + 2, 2, '#1a3a10');
        }
    }
}

// Wind-animated grass decoration
function drawGrassDecorationWind(ctx, cx, cy, col, row, biome, timestamp) {
    const seed = col * 7 + row * 13;
    const wind = Math.sin(timestamp * 0.0015 + seed) * 1.5;
    const wind2 = Math.sin(timestamp * 0.0018 + seed * 1.7) * 1;

    const grassColor = biome === 'snow' ? '#8a9a8a' : biome === 'swamp' ? '#3a5a2a' : '#4a7a3a';
    ctx.strokeStyle = grassColor;
    ctx.lineWidth = 0.7;
    // Grass tufts with swaying tips via quadraticCurveTo
    for (let i = 0; i < 4; i++) {
        const gx = cx + (tileRand(col, row, 90 + i) - 0.5) * 14;
        const gy = cy + (tileRand(col, row, 93 + i) - 0.5) * 8;
        const w = (i % 2 === 0) ? wind : wind2;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.quadraticCurveTo(gx - 1 + w * 0.5, gy - 2, gx - 2 + w, gy - 4);
        ctx.moveTo(gx, gy);
        ctx.quadraticCurveTo(gx + 0.5 + w * 0.5, gy - 1.8, gx + 1 + w * 0.8, gy - 3.5);
        ctx.moveTo(gx + 0.5, gy);
        ctx.quadraticCurveTo(gx + 1.5 + w * 0.3, gy - 1.5, gx + 2.5 + w * 0.6, gy - 3);
        ctx.stroke();
    }
    // Bushes (heavy, minimal sway)
    if ((biome === 'forest' || biome === 'plains') && tileRand(col, row, 97) > 0.5) {
        _drawBush(ctx, cx + (tileRand(col, row, 98) - 0.5) * 10, cy + 1, 2.5,
            biome === 'forest' ? '#1a3a10' : '#3a6a20');
    }
    // Flowers in plains
    if (biome === 'plains' && tileRand(col, row, 99) > 0.4) {
        const colors = ['#d44a60', '#c87a30', '#8a5aaa', '#4a8ac0'];
        for (let i = 0; i < 2; i++) {
            ctx.fillStyle = colors[Math.floor(tileRand(col, row, 110 + i) * colors.length)];
            const fx = cx + (tileRand(col, row, 112 + i) - 0.5) * 12;
            const fy = cy + (tileRand(col, row, 114 + i) - 0.5) * 6;
            ctx.beginPath();
            ctx.arc(fx, fy, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Dispatch decoration drawing based on tile char and biome
function drawTileDecoration(ctx, cx, cy, tile, biome, col, row, timestamp) {
    switch (tile) {
        case 'T': drawTreeDecoration(ctx, cx, cy, biome, col, row); break;
        case 'M': drawMountainDecoration(ctx, cx, cy, col, row); break;
        case 'r': drawRockDecoration(ctx, cx, cy, col, row); break;
        case 'w': drawWaterDecoration(ctx, cx, cy, timestamp, false); break;
        case 'W': drawWaterDecoration(ctx, cx, cy, timestamp, true); break;
        case 'L': drawLavaDecoration(ctx, cx, cy, timestamp); break;
        case 'R': drawRuinsDecoration(ctx, cx, cy, col, row); break;
        case 'b': drawBonesDecoration(ctx, cx, cy, col, row, biome); break;
        case 'p': drawPathDecoration(ctx, cx, cy, col, row); break;
        case 'i': drawIceDecoration(ctx, cx, cy, col, row); break;
        case 's': drawSandDecoration(ctx, cx, cy, col, row); break;
        case 'm': drawMudDecoration(ctx, cx, cy); break;
        case 'v': drawVolcanicDecoration(ctx, cx, cy, col, row); break;
        case 'g': drawGrassDecoration(ctx, cx, cy, col, row, biome); break;
        case '.': drawGroundTexture(ctx, cx, cy, col, row, biome); break;
    }
}

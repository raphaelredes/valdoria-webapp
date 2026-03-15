// ═══════════════════════════════════════════════════════
// PROCEDURAL TILE ART — per-biome decorations on hex faces
// ═══════════════════════════════════════════════════════

// Biome color palettes (base fill color per tile char)
const BIOME_COLORS = {
    forest:   {'.':'#5a3d2b','T':'#1a4a1a','g':'#2d5a2d','w':'#2a5a8a','r':'#5a5a5a','R':'#6a5a4a','p':'#6a5040','#':'#0d2e0d','W':'#1a3a6a','M':'#4a4a4a','b':'#4a3a3a','s':'#5a3d2b','m':'#3a2a1a','i':'#7aa0b0','v':'#5a3a1a','L':'#8a2a0a','C':'#6a4a2a'},
    plains:   {'.':'#5a4a30','T':'#3a6a2a','g':'#6a8a3a','w':'#2a5a8a','r':'#6a6a5a','R':'#5a4a3a','p':'#6a5a40','#':'#5a5a4a','W':'#1a3a6a','M':'#4a4a4a','b':'#4a3a3a','s':'#5a4a30','m':'#3a2a1a','i':'#7aa0b0','v':'#5a3a1a','L':'#8a2a0a','C':'#7a5a3a'},
    swamp:    {'.':'#3a3a2a','T':'#2a4a2a','g':'#3a5a2a','w':'#2a4a5a','r':'#4a4a3a','R':'#5a4a3a','p':'#4a3a2a','#':'#1a3a1a','W':'#1a3a4a','M':'#3a3a3a','m':'#3a2a1a','b':'#3a3030','s':'#3a3a2a','i':'#5a8090','v':'#4a2a1a','L':'#7a2a0a','C':'#5a4a2a'},
    cave:     {'.':'#1a1a2a','T':'#2a2a2a','g':'#1a1a1a','w':'#1a2a4a','r':'#3a3a3a','R':'#4a3a2a','p':'#2a2a2a','#':'#0a0a0a','W':'#0a1a3a','M':'#1a1a1a','b':'#2a1a1a','s':'#1a1a2a','m':'#1a1010','i':'#4a6a7a','v':'#3a1a0a','L':'#6a1a0a','C':'#4a3a2a'},
    desert:   {'.':'#8a7a4a','T':'#4a6a2a','g':'#8a7a50','w':'#2a5a8a','r':'#7a6a5a','R':'#6a5a4a','p':'#8a7a50','#':'#6a5a4a','W':'#1a3a6a','M':'#5a4a3a','s':'#9a8a5a','b':'#6a5a4a','m':'#5a4020','i':'#9abac0','v':'#7a4a1a','L':'#9a3a0a','C':'#7a6a4a'},
    mountain: {'.':'#5a4a3a','T':'#2a4a2a','g':'#3a5a3a','w':'#2a5a8a','r':'#6a6a6a','R':'#5a4a3a','p':'#5a4a3a','#':'#3a3a3a','W':'#1a3a6a','M':'#4a4a5a','b':'#4a3a3a','s':'#5a4a3a','m':'#3a2a1a','i':'#7a9aaa','v':'#5a3a1a','L':'#8a2a0a','C':'#5a4a3a'},
    snow:     {'.':'#c0c8d0','T':'#2a5a3a','g':'#b0b8c0','w':'#3a6a9a','r':'#7a7a8a','R':'#6a6a7a','p':'#b0b0b8','#':'#8a8a9a','W':'#2a4a7a','M':'#6a6a7a','i':'#9ab0c0','b':'#8a8090','s':'#c0c8d0','m':'#7a7080','v':'#8a5a3a','L':'#8a3a1a','C':'#6a5a4a'},
    volcanic: {'.':'#3a2a1a','T':'#2a2a2a','g':'#3a2a1a','w':'#2a3a5a','r':'#4a3a2a','R':'#5a3a2a','p':'#3a2a1a','#':'#2a1a0a','W':'#1a2a4a','M':'#3a2a1a','v':'#6a3a1a','L':'#8a2a0a','b':'#3a2020','s':'#3a2a1a','m':'#2a1a0a','i':'#5a7080','C':'#5a3a2a'},
    graveyard:{'.':'#3a3a3a','T':'#1a3a1a','g':'#2a3a2a','w':'#2a3a5a','r':'#4a4a4a','R':'#4a3a3a','p':'#3a3a3a','#':'#2a2a2a','W':'#1a2a4a','M':'#3a3a3a','b':'#4a3a3a','s':'#3a3a3a','m':'#2a2020','i':'#6a8090','v':'#4a2a1a','L':'#7a2a0a','C':'#4a3a3a'},
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
const WIND_BIOMES = new Set(['forest', 'plains', 'swamp', 'mountain', 'graveyard', 'ruins']);

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

    } else if (biome === 'cave') {
        // Cave: stalactites, glowing crystals, bioluminescent fungi
        // Stalactites hanging from above (2-3)
        for (let i = 0; i < 3; i++) {
            const sx = cx + (tileRand(col, row, 60 + i) - 0.5) * 18;
            const sy = cy + (tileRand(col, row, 63 + i) - 0.5) * 6;
            const sLen = 5 + tileRand(col, row, 66 + i) * 7;
            ctx.fillStyle = '#2a2a3a';
            ctx.beginPath();
            ctx.moveTo(sx - 2, sy - sLen);
            ctx.lineTo(sx + 2, sy - sLen);
            ctx.lineTo(sx + 0.5, sy);
            ctx.lineTo(sx - 0.5, sy);
            ctx.closePath();
            ctx.fill();
            // Highlight edge
            ctx.fillStyle = 'rgba(100,100,140,0.3)';
            ctx.beginPath();
            ctx.moveTo(sx - 2, sy - sLen);
            ctx.lineTo(sx - 0.5, sy - sLen);
            ctx.lineTo(sx - 0.2, sy);
            ctx.lineTo(sx - 0.5, sy);
            ctx.closePath();
            ctx.fill();
        }
        // Glowing crystal cluster (1-2)
        const crystals = r5 > 0.4 ? 2 : 1;
        const crystalColors = ['rgba(80,140,200,0.6)', 'rgba(120,60,180,0.5)', 'rgba(60,180,140,0.5)'];
        const glowColors = ['rgba(80,140,200,0.12)', 'rgba(120,60,180,0.10)', 'rgba(60,180,140,0.10)'];
        for (let i = 0; i < crystals; i++) {
            const cx2 = cx + (tileRand(col, row, 70 + i) - 0.5) * 14;
            const cy2 = cy + (tileRand(col, row, 72 + i) - 0.3) * 5;
            const cIdx = Math.floor(tileRand(col, row, 74 + i) * 3);
            const cH = 4 + tileRand(col, row, 76 + i) * 4;
            // Glow
            ctx.fillStyle = glowColors[cIdx];
            ctx.beginPath();
            ctx.arc(cx2, cy2 - cH * 0.5, cH * 1.5, 0, Math.PI * 2);
            ctx.fill();
            // Crystal body (angled triangle)
            ctx.fillStyle = crystalColors[cIdx];
            ctx.beginPath();
            ctx.moveTo(cx2 - 1.5, cy2);
            ctx.lineTo(cx2 + 0.5, cy2 - cH);
            ctx.lineTo(cx2 + 2, cy2);
            ctx.closePath();
            ctx.fill();
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.moveTo(cx2 - 0.5, cy2);
            ctx.lineTo(cx2 + 0.5, cy2 - cH);
            ctx.lineTo(cx2 + 0.8, cy2 - cH * 0.3);
            ctx.closePath();
            ctx.fill();
        }
        // Bioluminescent mushrooms (2-3 small)
        for (let i = 0; i < 2 + (r3 > 0.5 ? 1 : 0); i++) {
            const mx = cx + (tileRand(col, row, 80 + i) - 0.5) * 16;
            const my = cy + (tileRand(col, row, 82 + i) * 0.4 + 0.1) * 6;
            const mSize = 1.5 + tileRand(col, row, 84 + i) * 1.5;
            // Stem
            ctx.fillStyle = '#3a3a4a';
            ctx.fillRect(mx - 0.4, my, 0.8, mSize * 1.5);
            // Cap (glowing)
            ctx.fillStyle = 'rgba(80,200,120,0.5)';
            ctx.beginPath();
            ctx.ellipse(mx, my, mSize, mSize * 0.5, 0, Math.PI, 0);
            ctx.fill();
            // Glow
            ctx.fillStyle = 'rgba(80,200,120,0.08)';
            ctx.beginPath();
            ctx.arc(mx, my, mSize * 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

    } else if (biome === 'graveyard') {
        // Graveyard: dead twisted trees, more tombstones, scattered skulls
        // Dead tree (bare branches, no leaves)
        const tx = cx + (r1 - 0.5) * 6;
        const ty = cy + (r2 - 0.5) * 3;
        // Trunk (gnarled)
        ctx.strokeStyle = '#2a1a1a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty + 3);
        ctx.quadraticCurveTo(tx - 1, ty - 4, tx + 1, ty - 10);
        ctx.stroke();
        // Branches (bare, twisted)
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(tx + 1, ty - 8);
        ctx.quadraticCurveTo(tx + 5, ty - 10, tx + 8, ty - 12);
        ctx.moveTo(tx, ty - 9);
        ctx.quadraticCurveTo(tx - 4, ty - 12, tx - 7, ty - 11);
        ctx.moveTo(tx + 1, ty - 6);
        ctx.quadraticCurveTo(tx + 3, ty - 8, tx + 6, ty - 7);
        ctx.stroke();
        // Thin twigs
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = '#3a2a2a';
        ctx.beginPath();
        ctx.moveTo(tx + 8, ty - 12);
        ctx.lineTo(tx + 10, ty - 14);
        ctx.moveTo(tx - 7, ty - 11);
        ctx.lineTo(tx - 9, ty - 13);
        ctx.moveTo(tx + 6, ty - 7);
        ctx.lineTo(tx + 7, ty - 9);
        ctx.stroke();
        // Second dead tree (smaller, 70% chance)
        if (r3 > 0.3) {
            const tx2 = cx + (r3 - 0.2) * 12;
            const ty2 = cy + (r4 - 0.4) * 4;
            ctx.strokeStyle = '#2a1a1a';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(tx2, ty2 + 2);
            ctx.quadraticCurveTo(tx2 + 1, ty2 - 3, tx2 - 1, ty2 - 7);
            ctx.stroke();
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(tx2 - 1, ty2 - 5);
            ctx.lineTo(tx2 - 4, ty2 - 8);
            ctx.moveTo(tx2 - 1, ty2 - 6);
            ctx.lineTo(tx2 + 3, ty2 - 9);
            ctx.stroke();
        }
        // Extra tombstones (varied shapes)
        const tombX = cx + (r5 - 0.5) * 10;
        const tombY = cy + (r4 * 0.3 + 0.2) * 5;
        // Rounded tombstone
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(tombX - 2.5, tombY - 4, 5, 6);
        ctx.beginPath();
        ctx.arc(tombX, tombY - 4, 2.5, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(tombX - 2.5, tombY - 3.5, 5, 5);
        ctx.beginPath();
        ctx.arc(tombX, tombY - 3.5, 2.5, Math.PI, 0);
        ctx.fill();
        // RIP text (tiny line)
        ctx.strokeStyle = '#6a6a6a';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(tombX - 1.5, tombY - 1.5);
        ctx.lineTo(tombX + 1.5, tombY - 1.5);
        ctx.stroke();
        // Tilted cross (different spot)
        if (r1 > 0.4) {
            const crx = cx + (r2 - 0.6) * 14;
            const cry = cy + (r5 * 0.3) * 4;
            ctx.save();
            ctx.translate(crx, cry);
            ctx.rotate(-0.15);
            ctx.strokeStyle = '#4a3a3a';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.lineTo(0, 2);
            ctx.moveTo(-2.5, -4);
            ctx.lineTo(2.5, -4);
            ctx.stroke();
            ctx.restore();
        }

    } else if (biome === 'ruins') {
        // Ruins: broken pillars with overgrown vines, crumbled stones
        const px = cx + (r1 - 0.5) * 6;
        const py = cy + (r2 - 0.5) * 3;
        // Main broken pillar (tall, jagged top)
        ctx.fillStyle = '#5a5040';
        ctx.fillRect(px - 3, py - 10, 6, 13);
        // Jagged broken top
        ctx.fillStyle = '#6a5a48';
        ctx.beginPath();
        ctx.moveTo(px - 3, py - 10);
        ctx.lineTo(px - 1, py - 13);
        ctx.lineTo(px + 1, py - 11);
        ctx.lineTo(px + 3, py - 14);
        ctx.lineTo(px + 3, py - 10);
        ctx.closePath();
        ctx.fill();
        // Pillar shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(px - 3, py - 10, 2, 13);
        // Cracks
        ctx.strokeStyle = '#3a3028';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px - 1, py - 6);
        ctx.lineTo(px + 1, py - 2);
        ctx.moveTo(px + 2, py - 8);
        ctx.lineTo(px, py - 5);
        ctx.stroke();
        // Vines growing up the pillar
        ctx.strokeStyle = '#2a5a1a';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(px - 3, py);
        ctx.quadraticCurveTo(px - 4, py - 5, px - 2, py - 9);
        ctx.stroke();
        // Vine leaves (small circles)
        ctx.fillStyle = '#3a6a2a';
        ctx.beginPath();
        ctx.arc(px - 3.5, py - 3, 1.5, 0, Math.PI * 2);
        ctx.arc(px - 3, py - 6, 1.2, 0, Math.PI * 2);
        ctx.arc(px - 2.5, py - 8, 1, 0, Math.PI * 2);
        ctx.fill();
        // Second smaller broken pillar (70%)
        if (r3 > 0.3) {
            const px2 = cx + (r3 - 0.2) * 12;
            const py2 = cy + (r4 - 0.4) * 4;
            ctx.fillStyle = '#4a4538';
            ctx.fillRect(px2 - 2, py2 - 5, 4, 7);
            // Jagged top
            ctx.beginPath();
            ctx.moveTo(px2 - 2, py2 - 5);
            ctx.lineTo(px2, py2 - 7);
            ctx.lineTo(px2 + 2, py2 - 5);
            ctx.closePath();
            ctx.fill();
        }
        // Scattered rubble
        ctx.fillStyle = '#5a5040';
        ctx.beginPath();
        ctx.arc(cx + 7, cy + 2, 1.5, 0, Math.PI * 2);
        ctx.arc(cx + 5, cy + 3, 1, 0, Math.PI * 2);
        ctx.arc(cx - 5, cy + 1, 1.2, 0, Math.PI * 2);
        ctx.fill();

    } else if (biome === 'mountain') {
        // Mountain: alpine pines (shorter, wind-bent) + boulder clusters
        const tx = cx + (r1 - 0.5) * 6;
        const ty = cy + (r2 - 0.5) * 3;
        // Wind-bent alpine pine (main)
        ctx.fillStyle = '#3a2a18';
        ctx.fillRect(tx - 1, ty - 3, 2, 7);
        // Asymmetric canopy (wind-bent right)
        ctx.beginPath();
        ctx.moveTo(tx - 1, ty - 10);
        ctx.lineTo(tx + 6, ty - 2);
        ctx.lineTo(tx - 5, ty - 2);
        ctx.closePath();
        ctx.fillStyle = '#1a4028';
        ctx.fill();
        // Smaller pine
        if (r3 > 0.35) {
            const tx2 = cx + (r3 - 0.3) * 10;
            const ty2 = cy + (r4 - 0.4) * 4;
            ctx.fillStyle = '#3a2a18';
            ctx.fillRect(tx2 - 0.8, ty2 - 2, 1.6, 5);
            ctx.beginPath();
            ctx.moveTo(tx2, ty2 - 7);
            ctx.lineTo(tx2 + 4, ty2 - 1);
            ctx.lineTo(tx2 - 3.5, ty2 - 1);
            ctx.closePath();
            ctx.fillStyle = '#1a3a22';
            ctx.fill();
        }
        // Boulder cluster
        ctx.fillStyle = '#5a5a5a';
        ctx.beginPath();
        ctx.ellipse(cx + 6, cy + 2, 3, 2, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a4a4a';
        ctx.beginPath();
        ctx.ellipse(cx + 4, cy + 3, 2, 1.5, -0.1, 0, Math.PI * 2);
        ctx.fill();
        // Stone highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.ellipse(cx + 5, cy + 1.5, 2, 1, 0.2, 0, Math.PI * 2);
        ctx.fill();

    } else {
        // Default conifer cluster (forest, volcanic)
        const darkGreen = biome === 'volcanic' ? '#1a2a1a' : '#1a4a1a';
        const lightGreen = '#0d3a0d';

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

    // Reflective sheen (gradient overlay — subtle surface reflection)
    var reflAlpha = deep ? 0.06 : 0.1;
    var reflGrad = ctx.createLinearGradient(cx - 10, cy - 6, cx + 10, cy + 4);
    reflGrad.addColorStop(0, 'rgba(140,200,255,' + reflAlpha + ')');
    reflGrad.addColorStop(0.5, 'rgba(200,240,255,' + (reflAlpha * 0.4) + ')');
    reflGrad.addColorStop(1, 'rgba(100,180,240,' + (reflAlpha * 0.3) + ')');
    ctx.fillStyle = reflGrad;
    ctx.fillRect(cx - 14, cy - 8, 28, 16);

    // Wave lines (3-4 for more coverage)
    var waveCount = deep ? 4 : 3;
    var alpha = deep ? 0.15 : 0.22;
    for (var i = 0; i < waveCount; i++) {
        ctx.strokeStyle = 'rgba(180,220,255,' + (alpha - i * 0.03) + ')';
        ctx.lineWidth = deep ? 0.6 : 0.8;
        var y = cy - 5 + i * 3.5;
        ctx.beginPath();
        for (var x = cx - 14; x <= cx + 14; x += 2) {
            var wy = y + Math.sin((x + t * 40 + i * 30) * 0.15) * (deep ? 2 : 3);
            if (x === cx - 14) ctx.moveTo(x, wy);
            else ctx.lineTo(x, wy);
        }
        ctx.stroke();
    }

    // Sparkles (2 on shallow, 1 on deep)
    var sparkleCount = deep ? 1 : 2;
    for (var si = 0; si < sparkleCount; si++) {
        var sPhase = t * (1.5 + si * 0.7) + si * 2;
        var sparkleX = cx + Math.sin(sPhase) * (6 + si * 3);
        var sparkleY = cy + Math.cos(sPhase * 1.3) * 3;
        var sAlpha = 0.2 + Math.sin(t * 4 + si) * 0.15;
        if (sAlpha > 0.1) {
            ctx.fillStyle = 'rgba(255,255,255,' + sAlpha.toFixed(2) + ')';
            ctx.beginPath();
            ctx.arc(sparkleX, sparkleY, deep ? 0.8 : 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Ripple ring (slow expanding circle on shallow water)
    if (!deep) {
        var ripplePhase = (t * 0.5) % 1;
        var rippleR = 2 + ripplePhase * 8;
        var rippleA = (1 - ripplePhase) * 0.12;
        ctx.strokeStyle = 'rgba(200,230,255,' + rippleA.toFixed(2) + ')';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.arc(cx + 3, cy - 1, rippleR, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawLavaDecoration(ctx, cx, cy, timestamp) {
    const t = (timestamp || 0) * 0.001;
    var pulse = 0.5 + Math.sin(t * 2) * 0.25;

    // Outer heat glow (larger, more dramatic)
    var heatGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22);
    heatGrad.addColorStop(0, 'rgba(255,120,20,' + (0.15 + Math.sin(t * 2.5) * 0.08).toFixed(2) + ')');
    heatGrad.addColorStop(0.5, 'rgba(255,80,0,' + (0.06 + Math.sin(t * 3) * 0.03).toFixed(2) + ')');
    heatGrad.addColorStop(1, 'rgba(255,50,0,0)');
    ctx.fillStyle = heatGrad;
    ctx.fillRect(cx - 22, cy - 22, 44, 44);

    // Crusted dark edges (cooled lava border)
    ctx.strokeStyle = 'rgba(40,20,10,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Glowing cracks (brighter, more complex pattern)
    ctx.strokeStyle = 'rgba(255,200,50,' + pulse.toFixed(2) + ')';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 2);
    ctx.lineTo(cx - 2, cy + 1);
    ctx.lineTo(cx + 3, cy - 3);
    ctx.lineTo(cx + 9, cy + 2);
    ctx.stroke();
    // Secondary cracks (dimmer)
    ctx.strokeStyle = 'rgba(255,180,40,' + (pulse * 0.6).toFixed(2) + ')';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + 4);
    ctx.lineTo(cx + 2, cy + 2);
    ctx.lineTo(cx + 7, cy + 5);
    ctx.moveTo(cx - 6, cy - 4);
    ctx.lineTo(cx - 1, cy - 5);
    ctx.stroke();

    // Bright core glow (inner hot spot)
    ctx.fillStyle = 'rgba(255,220,100,' + (0.2 + Math.sin(t * 4) * 0.1).toFixed(2) + ')';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Bubbles (2 with different phases)
    for (var bi = 0; bi < 2; bi++) {
        var bPhase = t * (1.3 + bi * 0.5) + bi * 3;
        var bubbleX = cx + Math.sin(bPhase) * (4 + bi * 2);
        var bubbleY = cy + Math.cos(bPhase * 1.3) * (2 + bi);
        var bSize = 1.5 + Math.sin(t * 3 + bi * 2) * 0.7;
        ctx.fillStyle = 'rgba(255,150,50,' + (0.3 + Math.sin(t * 5 + bi) * 0.2).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, bSize, 0, Math.PI * 2);
        ctx.fill();
    }
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
    const hh = HEX_H / 2;
    const brickRows = Math.floor(heightPx / 4);
    const seed = col * 7 + row * 13;

    // Horizontal mortar lines (brick rows)
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < brickRows; i++) {
        const y = cy + hh + i * 4;
        ctx.beginPath();
        ctx.moveTo(cx - 2, y);
        ctx.lineTo(cx + HEX_W / 2 - 2, y - 2);
        ctx.stroke();
    }

    // Vertical mortar joints (staggered per row for realistic brick pattern)
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 0.4;
    for (var vi = 0; vi < brickRows - 1; vi++) {
        var vY = cy + hh + vi * 4;
        // 2-3 vertical joints per row, offset alternating
        var numJoints = 2 + ((seed + vi) % 2);
        var jointOffset = (vi % 2) * 4; // Stagger
        for (var vj = 0; vj < numJoints; vj++) {
            var vX = cx + 2 + jointOffset + vj * 7;
            if (vX > cx + HEX_W / 2 - 4) break;
            ctx.beginPath();
            ctx.moveTo(vX, vY);
            ctx.lineTo(vX, vY + 4);
            ctx.stroke();
        }
    }

    // Random stone variation (lighter/darker blocks for depth)
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (var si = 0; si < Math.min(brickRows, 5); si++) {
        var sIdx = (seed + si * 31) % 7;
        if (sIdx < 3) {
            var sY = cy + hh + si * 4 + 1;
            var sX = cx + ((seed + si * 17) % 8);
            ctx.fillRect(sX, sY, 5, 3);
        }
    }
    // Darker blocks for shadow variation
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (var di = 1; di < Math.min(brickRows, 4); di++) {
        var dIdx = (seed + di * 23) % 5;
        if (dIdx < 2) {
            var dY = cy + hh + di * 4 + 1;
            var dX = cx + ((seed + di * 11 + 3) % 10);
            ctx.fillRect(dX, dY, 4, 3);
        }
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
    } else if (biome === 'cave') {
        // Small cave fungi clusters + tiny stones
        if (tileRand(col, row, 120) > 0.6) {
            var gx = cx + (tileRand(col, row, 121) - 0.5) * 10;
            var gy = cy + (tileRand(col, row, 122) - 0.5) * 5;
            ctx.fillStyle = 'rgba(60,160,100,0.15)';
            ctx.beginPath();
            ctx.arc(gx, gy, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(60,160,100,0.3)';
            ctx.beginPath();
            ctx.arc(gx, gy, 1, 0, Math.PI * 2);
            ctx.fill();
        }
        // Tiny pebbles
        if (tileRand(col, row, 125) > 0.5) {
            ctx.fillStyle = 'rgba(60,60,70,0.3)';
            ctx.beginPath();
            ctx.arc(cx + 5, cy - 1, 0.8, 0, Math.PI * 2);
            ctx.arc(cx - 4, cy + 2, 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (biome === 'mountain') {
        // Alpine rocks + sparse tiny flowers
        if (tileRand(col, row, 120) > 0.5) {
            ctx.fillStyle = '#5a5a60';
            var rx = cx + (tileRand(col, row, 121) - 0.5) * 12;
            var ry = cy + (tileRand(col, row, 122) - 0.5) * 5;
            ctx.beginPath();
            ctx.ellipse(rx, ry, 2, 1.2, 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        // Tiny alpine flower (20%)
        if (tileRand(col, row, 126) > 0.8) {
            ctx.fillStyle = '#a0a0d0';
            ctx.beginPath();
            ctx.arc(cx + 6, cy - 1, 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (biome === 'volcanic') {
        // Scorched earth cracks + ash drifts
        if (tileRand(col, row, 120) > 0.5) {
            ctx.strokeStyle = 'rgba(100,40,10,0.2)';
            ctx.lineWidth = 0.4;
            var crx = cx + (tileRand(col, row, 121) - 0.5) * 12;
            var cry = cy + (tileRand(col, row, 122) - 0.5) * 6;
            ctx.beginPath();
            ctx.moveTo(crx - 3, cry);
            ctx.lineTo(crx + 3, cry + 1);
            ctx.moveTo(crx, cry - 2);
            ctx.lineTo(crx + 1, cry + 2);
            ctx.stroke();
        }
        // Ash drift
        if (tileRand(col, row, 127) > 0.7) {
            ctx.fillStyle = 'rgba(50,40,30,0.12)';
            ctx.beginPath();
            ctx.ellipse(cx - 3, cy + 2, 4, 1.5, -0.2, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (biome === 'ruins') {
        // Stone shards + moss patches
        if (tileRand(col, row, 120) > 0.5) {
            ctx.fillStyle = '#5a5040';
            var sx = cx + (tileRand(col, row, 121) - 0.5) * 12;
            var sy = cy + (tileRand(col, row, 122) - 0.5) * 6;
            ctx.fillRect(sx - 1.5, sy - 0.5, 3, 1);
            ctx.fillRect(sx + 3, sy + 1, 2, 0.8);
        }
        // Moss patch
        if (tileRand(col, row, 126) > 0.6) {
            ctx.fillStyle = 'rgba(60,100,40,0.12)';
            ctx.beginPath();
            ctx.ellipse(cx - 4, cy + 1, 3, 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (biome === 'graveyard') {
        // Bone fragments + dead grass
        if (tileRand(col, row, 120) > 0.7) {
            ctx.fillStyle = '#7a7a6a';
            var bx = cx + (tileRand(col, row, 121) - 0.5) * 10;
            var by = cy + (tileRand(col, row, 122) - 0.5) * 5;
            ctx.fillRect(bx - 2, by, 4, 0.6);
            ctx.fillRect(bx + 1, by - 1, 0.6, 2.5);
        }
        // Dead grass tuft
        if (tileRand(col, row, 128) > 0.6) {
            ctx.strokeStyle = '#4a4a3a';
            ctx.lineWidth = 0.5;
            var gx2 = cx + (tileRand(col, row, 129) - 0.5) * 12;
            var gy2 = cy + 2;
            ctx.beginPath();
            ctx.moveTo(gx2, gy2);
            ctx.lineTo(gx2 - 1.5, gy2 - 3);
            ctx.moveTo(gx2 + 1, gy2);
            ctx.lineTo(gx2 + 2, gy2 - 2.5);
            ctx.moveTo(gx2 - 0.5, gy2);
            ctx.lineTo(gx2 - 2, gy2 - 2);
            ctx.stroke();
        }
    }
}

// Exit tile portal — large glowing archway with particle effects
function drawExitDecoration(ctx, cx, cy, timestamp) {
    const t = (timestamp || 0) * 0.001;
    const pulse = 0.5 + Math.sin(t * 2) * 0.2;
    const pulse2 = 0.4 + Math.sin(t * 1.5 + 1) * 0.15;

    // Outer glow ring (large, visible from distance)
    const outerGrad = ctx.createRadialGradient(cx, cy - 2, 4, cx, cy - 2, 22);
    outerGrad.addColorStop(0, 'rgba(74,214,128,' + (pulse * 0.6) + ')');
    outerGrad.addColorStop(0.4, 'rgba(74,214,128,' + (pulse * 0.25) + ')');
    outerGrad.addColorStop(0.7, 'rgba(74,214,128,' + (pulse * 0.08) + ')');
    outerGrad.addColorStop(1, 'rgba(74,214,128,0)');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 22, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright glow
    const innerGrad = ctx.createRadialGradient(cx, cy - 2, 1, cx, cy - 2, 12);
    innerGrad.addColorStop(0, 'rgba(120,255,160,' + (pulse * 0.7) + ')');
    innerGrad.addColorStop(0.5, 'rgba(74,214,128,' + (pulse * 0.4) + ')');
    innerGrad.addColorStop(1, 'rgba(74,214,128,0)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 12, 0, Math.PI * 2);
    ctx.fill();

    // Portal archway frame (stone arch)
    ctx.fillStyle = 'rgba(80,60,40,' + (0.7 + pulse2 * 0.2) + ')';
    // Left pillar
    ctx.fillRect(cx - 6, cy - 10, 3, 14);
    // Right pillar
    ctx.fillRect(cx + 3, cy - 10, 3, 14);
    // Arch top
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 6, Math.PI, 0);
    ctx.fill();

    // Portal interior (bright green energy)
    ctx.fillStyle = 'rgba(74,214,128,' + (0.5 + Math.sin(t * 3) * 0.2) + ')';
    ctx.fillRect(cx - 3, cy - 8, 6, 11);

    // Swirling energy lines inside portal
    ctx.strokeStyle = 'rgba(180,255,200,' + (0.3 + Math.sin(t * 4) * 0.15) + ')';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - 6 + Math.sin(t * 3) * 3);
    ctx.quadraticCurveTo(cx, cy - 2 + Math.cos(t * 2.5) * 2, cx + 2, cy + 1 + Math.sin(t * 3.5) * 2);
    ctx.stroke();

    // Light pillar effect (vertical beam above portal)
    const beamGrad = ctx.createLinearGradient(cx, cy - 20, cx, cy - 8);
    beamGrad.addColorStop(0, 'rgba(74,214,128,0)');
    beamGrad.addColorStop(0.5, 'rgba(74,214,128,' + (pulse2 * 0.15) + ')');
    beamGrad.addColorStop(1, 'rgba(120,255,160,' + (pulse2 * 0.25) + ')');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(cx - 4, cy - 20, 8, 12);

    // Floating sparkle particles
    for (var sp = 0; sp < 4; sp++) {
        var angle = t * (1.2 + sp * 0.3) + sp * 1.57;
        var radius = 10 + Math.sin(t * 0.8 + sp) * 4;
        var px = cx + Math.cos(angle) * radius;
        var py = cy - 4 + Math.sin(angle) * radius * 0.5;
        var sparkAlpha = 0.3 + Math.sin(t * 2 + sp * 2) * 0.25;
        if (sparkAlpha > 0.1) {
            ctx.fillStyle = 'rgba(180,255,200,' + sparkAlpha + ')';
            ctx.beginPath();
            ctx.arc(px, py, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Door handle glow
    ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + Math.sin(t * 2.5) * 0.2) + ')';
    ctx.beginPath();
    ctx.arc(cx + 1, cy - 1, 1.2, 0, Math.PI * 2);
    ctx.fill();
}

// POI marker with contextual icon based on type
function drawPOIMarker(ctx, cx, cy, icon, timestamp, poiType) {
    const t = (timestamp || 0) * 0.001;
    const bounce = Math.sin(t * 3) * 2.5;
    const my = cy - 16 + bounce;

    // Type-specific colors and symbols
    const typeConfig = {
        dis: { color: '#c4953a', glow: 'rgba(196,149,58,', symbol: '*', r: 8 },
        sea: { color: '#8a9a5a', glow: 'rgba(138,154,90,', symbol: '?', r: 7 },
        dan: { color: '#c44a2a', glow: 'rgba(196,74,42,',  symbol: '!', r: 8 },
        mys: { color: '#8a6aaa', glow: 'rgba(138,106,170,', symbol: '~', r: 9 },
        npc: { color: '#5a9a6a', glow: 'rgba(90,154,106,', symbol: 'o', r: 8 },
    };
    const cfg = typeConfig[poiType] || typeConfig.dis;

    // Outer glow (type-colored)
    const pulse = Math.sin(t * 2) * 0.15 + 0.85;
    const grad = ctx.createRadialGradient(cx, my, 0, cx, my, cfg.r + 4);
    grad.addColorStop(0, cfg.glow + (0.35 * pulse) + ')');
    grad.addColorStop(0.6, cfg.glow + (0.1 * pulse) + ')');
    grad.addColorStop(1, cfg.glow + '0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, my, cfg.r + 4, 0, Math.PI * 2);
    ctx.fill();

    // Inner disc
    ctx.beginPath();
    ctx.arc(cx, my, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = cfg.color;
    ctx.fill();

    // Symbol (type-specific)
    ctx.font = 'bold 7px MedievalSharp, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';

    if (cfg.symbol === 'o') {
        // NPC — draw tiny head silhouette instead of text
        ctx.beginPath();
        ctx.arc(cx, my - 1, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.fillRect(cx - 1.5, my + 0.5, 3, 2);
    } else if (cfg.symbol === '~') {
        // Mystery — draw swirl
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, my, 2.5, 0, Math.PI * 1.5);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx + 2.2, my - 1, 0.6, 0, Math.PI * 2);
        ctx.fill();
    } else if (cfg.symbol === '*') {
        // Discovery — draw sparkle
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx, my - 3); ctx.lineTo(cx, my + 3);
        ctx.moveTo(cx - 3, my); ctx.lineTo(cx + 3, my);
        ctx.moveTo(cx - 2, my - 2); ctx.lineTo(cx + 2, my + 2);
        ctx.moveTo(cx + 2, my - 2); ctx.lineTo(cx - 2, my + 2);
        ctx.stroke();
    } else {
        // Default text symbol (! or ?)
        ctx.fillText(cfg.symbol, cx, my);
    }

    // Ground shadow indicator
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1, 4, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
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

    } else if (biome === 'cave') {
        // Cave animated: crystals with subtle pulsing glow
        const pulse = Math.sin(timestamp * 0.002) * 0.15 + 0.85;
        // Stalactites (static)
        for (let i = 0; i < 3; i++) {
            const sx = cx + (tileRand(col, row, 60 + i) - 0.5) * 18;
            const sy = cy + (tileRand(col, row, 63 + i) - 0.5) * 6;
            const sLen = 5 + tileRand(col, row, 66 + i) * 7;
            ctx.fillStyle = '#2a2a3a';
            ctx.beginPath();
            ctx.moveTo(sx - 2, sy - sLen);
            ctx.lineTo(sx + 2, sy - sLen);
            ctx.lineTo(sx + 0.5, sy);
            ctx.lineTo(sx - 0.5, sy);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(100,100,140,0.3)';
            ctx.beginPath();
            ctx.moveTo(sx - 2, sy - sLen);
            ctx.lineTo(sx - 0.5, sy - sLen);
            ctx.lineTo(sx - 0.2, sy);
            ctx.lineTo(sx - 0.5, sy);
            ctx.closePath();
            ctx.fill();
        }
        // Pulsing crystals
        const crystals = r5 > 0.4 ? 2 : 1;
        const crystalColors = ['rgba(80,140,200,VAL)', 'rgba(120,60,180,VAL)', 'rgba(60,180,140,VAL)'];
        const glowColors = ['rgba(80,140,200,GVAL)', 'rgba(120,60,180,GVAL)', 'rgba(60,180,140,GVAL)'];
        for (let i = 0; i < crystals; i++) {
            const cx2 = cx + (tileRand(col, row, 70 + i) - 0.5) * 14;
            const cy2 = cy + (tileRand(col, row, 72 + i) - 0.3) * 5;
            const cIdx = Math.floor(tileRand(col, row, 74 + i) * 3);
            const cH = 4 + tileRand(col, row, 76 + i) * 4;
            const alpha = 0.5 * pulse + 0.1;
            const gAlpha = 0.10 * pulse + 0.02;
            // Glow (animated)
            ctx.fillStyle = glowColors[cIdx].replace('GVAL', gAlpha.toFixed(2));
            ctx.beginPath();
            ctx.arc(cx2, cy2 - cH * 0.5, cH * 1.5 * (0.9 + pulse * 0.1), 0, Math.PI * 2);
            ctx.fill();
            // Crystal body
            ctx.fillStyle = crystalColors[cIdx].replace('VAL', alpha.toFixed(2));
            ctx.beginPath();
            ctx.moveTo(cx2 - 1.5, cy2);
            ctx.lineTo(cx2 + 0.5, cy2 - cH);
            ctx.lineTo(cx2 + 2, cy2);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.moveTo(cx2 - 0.5, cy2);
            ctx.lineTo(cx2 + 0.5, cy2 - cH);
            ctx.lineTo(cx2 + 0.8, cy2 - cH * 0.3);
            ctx.closePath();
            ctx.fill();
        }
        // Fungi (subtle glow pulse)
        for (let i = 0; i < 2 + (r3 > 0.5 ? 1 : 0); i++) {
            const mx = cx + (tileRand(col, row, 80 + i) - 0.5) * 16;
            const my = cy + (tileRand(col, row, 82 + i) * 0.4 + 0.1) * 6;
            const mSize = 1.5 + tileRand(col, row, 84 + i) * 1.5;
            ctx.fillStyle = '#3a3a4a';
            ctx.fillRect(mx - 0.4, my, 0.8, mSize * 1.5);
            ctx.fillStyle = 'rgba(80,200,120,' + (0.4 * pulse + 0.1).toFixed(2) + ')';
            ctx.beginPath();
            ctx.ellipse(mx, my, mSize, mSize * 0.5, 0, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = 'rgba(80,200,120,' + (0.06 * pulse + 0.02).toFixed(2) + ')';
            ctx.beginPath();
            ctx.arc(mx, my, mSize * 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

    } else if (biome === 'graveyard') {
        // Graveyard animated: dead trees with gentle sway + tombstones
        const tx = cx + (r1 - 0.5) * 6;
        const ty = cy + (r2 - 0.5) * 3;
        const sway = wind * 0.4; // Very subtle sway for dead branches
        // Trunk
        ctx.strokeStyle = '#2a1a1a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty + 3);
        ctx.quadraticCurveTo(tx - 1, ty - 4, tx + 1, ty - 10);
        ctx.stroke();
        // Branches with wind sway
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(tx + 1, ty - 8);
        ctx.quadraticCurveTo(tx + 5 + sway, ty - 10, tx + 8 + sway * 1.5, ty - 12);
        ctx.moveTo(tx, ty - 9);
        ctx.quadraticCurveTo(tx - 4 + sway * 0.5, ty - 12, tx - 7 + sway, ty - 11);
        ctx.moveTo(tx + 1, ty - 6);
        ctx.quadraticCurveTo(tx + 3 + sway * 0.8, ty - 8, tx + 6 + sway, ty - 7);
        ctx.stroke();
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = '#3a2a2a';
        ctx.beginPath();
        ctx.moveTo(tx + 8 + sway * 1.5, ty - 12);
        ctx.lineTo(tx + 10 + sway * 2, ty - 14);
        ctx.moveTo(tx - 7 + sway, ty - 11);
        ctx.lineTo(tx - 9 + sway * 1.5, ty - 13);
        ctx.stroke();
        // Second dead tree
        if (r3 > 0.3) {
            const tx2 = cx + (r3 - 0.2) * 12;
            const ty2 = cy + (r4 - 0.4) * 4;
            ctx.strokeStyle = '#2a1a1a';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(tx2, ty2 + 2);
            ctx.quadraticCurveTo(tx2 + 1, ty2 - 3, tx2 - 1, ty2 - 7);
            ctx.stroke();
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(tx2 - 1, ty2 - 5);
            ctx.lineTo(tx2 - 4 + sway * 0.5, ty2 - 8);
            ctx.moveTo(tx2 - 1, ty2 - 6);
            ctx.lineTo(tx2 + 3 + sway * 0.5, ty2 - 9);
            ctx.stroke();
        }
        // Tombstones (static)
        const tombX = cx + (r5 - 0.5) * 10;
        const tombY = cy + (r4 * 0.3 + 0.2) * 5;
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(tombX - 2.5, tombY - 4, 5, 6);
        ctx.beginPath();
        ctx.arc(tombX, tombY - 4, 2.5, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(tombX - 2.5, tombY - 3.5, 5, 5);
        ctx.beginPath();
        ctx.arc(tombX, tombY - 3.5, 2.5, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = '#6a6a6a';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(tombX - 1.5, tombY - 1.5);
        ctx.lineTo(tombX + 1.5, tombY - 1.5);
        ctx.stroke();
        // Tilted cross
        if (r1 > 0.4) {
            const crx = cx + (r2 - 0.6) * 14;
            const cry = cy + (r5 * 0.3) * 4;
            ctx.save();
            ctx.translate(crx, cry);
            ctx.rotate(-0.15);
            ctx.strokeStyle = '#4a3a3a';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.lineTo(0, 2);
            ctx.moveTo(-2.5, -4);
            ctx.lineTo(2.5, -4);
            ctx.stroke();
            ctx.restore();
        }

    } else if (biome === 'mountain') {
        // Mountain: wind-bent alpine pine with sway
        const tx = cx + (r1 - 0.5) * 6;
        const ty = cy + (r2 - 0.5) * 3;
        ctx.fillStyle = '#3a2a18';
        ctx.fillRect(tx - 1, ty - 3, 2, 7);
        // Wind-bent canopy (sways more)
        ctx.beginPath();
        ctx.moveTo(tx - 1 + wind * 0.3, ty - 10);
        ctx.lineTo(tx + 6 + wind * 0.8, ty - 2);
        ctx.lineTo(tx - 5, ty - 2);
        ctx.closePath();
        ctx.fillStyle = '#1a4028';
        ctx.fill();
        // Smaller pine with wind
        if (r3 > 0.35) {
            const tx2 = cx + (r3 - 0.3) * 10;
            const ty2 = cy + (r4 - 0.4) * 4;
            ctx.fillStyle = '#3a2a18';
            ctx.fillRect(tx2 - 0.8, ty2 - 2, 1.6, 5);
            ctx.beginPath();
            ctx.moveTo(tx2 + wind2 * 0.2, ty2 - 7);
            ctx.lineTo(tx2 + 4 + wind2 * 0.6, ty2 - 1);
            ctx.lineTo(tx2 - 3.5, ty2 - 1);
            ctx.closePath();
            ctx.fillStyle = '#1a3a22';
            ctx.fill();
        }
        // Boulders (static)
        ctx.fillStyle = '#5a5a5a';
        ctx.beginPath();
        ctx.ellipse(cx + 6, cy + 2, 3, 2, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a4a4a';
        ctx.beginPath();
        ctx.ellipse(cx + 4, cy + 3, 2, 1.5, -0.1, 0, Math.PI * 2);
        ctx.fill();

    } else if (biome === 'ruins') {
        // Ruins: pillars (static) + vine sway in wind
        const px = cx + (r1 - 0.5) * 6;
        const py = cy + (r2 - 0.5) * 3;
        // Pillar (static)
        ctx.fillStyle = '#5a5040';
        ctx.fillRect(px - 3, py - 10, 6, 13);
        ctx.fillStyle = '#6a5a48';
        ctx.beginPath();
        ctx.moveTo(px - 3, py - 10);
        ctx.lineTo(px - 1, py - 13);
        ctx.lineTo(px + 1, py - 11);
        ctx.lineTo(px + 3, py - 14);
        ctx.lineTo(px + 3, py - 10);
        ctx.closePath();
        ctx.fill();
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(px - 3, py - 10, 2, 13);
        // Cracks
        ctx.strokeStyle = '#3a3028';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px - 1, py - 6);
        ctx.lineTo(px + 1, py - 2);
        ctx.stroke();
        // Vine with wind sway (living animation!)
        ctx.strokeStyle = '#2a5a1a';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(px - 3, py);
        ctx.quadraticCurveTo(px - 4 + wind * 0.3, py - 5, px - 2 + wind * 0.5, py - 9);
        ctx.stroke();
        // Vine leaves sway
        ctx.fillStyle = '#3a6a2a';
        ctx.beginPath();
        ctx.arc(px - 3.5 + wind * 0.2, py - 3, 1.5, 0, Math.PI * 2);
        ctx.arc(px - 3 + wind * 0.3, py - 6, 1.2, 0, Math.PI * 2);
        ctx.arc(px - 2.5 + wind * 0.4, py - 8, 1, 0, Math.PI * 2);
        ctx.fill();
        // Second pillar
        if (r3 > 0.3) {
            const px2 = cx + (r3 - 0.2) * 12;
            const py2 = cy + (r4 - 0.4) * 4;
            ctx.fillStyle = '#4a4538';
            ctx.fillRect(px2 - 2, py2 - 5, 4, 7);
            ctx.beginPath();
            ctx.moveTo(px2 - 2, py2 - 5);
            ctx.lineTo(px2, py2 - 7);
            ctx.lineTo(px2 + 2, py2 - 5);
            ctx.closePath();
            ctx.fill();
        }
        // Rubble (static)
        ctx.fillStyle = '#5a5040';
        ctx.beginPath();
        ctx.arc(cx + 7, cy + 2, 1.5, 0, Math.PI * 2);
        ctx.arc(cx - 5, cy + 1, 1.2, 0, Math.PI * 2);
        ctx.fill();

    } else {
        // Default conifer with swaying tips (forest)
        const darkGreen = '#1a4a1a';
        const lightGreen = '#0d3a0d';

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

// ── Door decoration ──────────────────────────────────────
function drawDoorDecoration(ctx, cx, cy, col, row) {
    var hw = HEX_W * 0.35;
    var hh = HEX_H * 0.4;

    // Door frame (stone archway)
    ctx.fillStyle = '#4a4040';
    ctx.fillRect(cx - hw - 2, cy - hh - 1, hw * 2 + 4, hh * 2 + 2);
    // Arched top of frame
    ctx.beginPath();
    ctx.arc(cx, cy - hh - 1, hw + 2, Math.PI, 0);
    ctx.fill();

    // Wooden door body
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(cx - hw, cy - hh, hw * 2, hh * 2);
    // Arched top of door
    ctx.beginPath();
    ctx.arc(cx, cy - hh, hw, Math.PI, 0);
    ctx.fillStyle = '#5a3a1a';
    ctx.fill();

    // Wood grain (vertical plank lines)
    ctx.strokeStyle = '#3a2a0a';
    ctx.lineWidth = 0.6;
    for (var pi = -1; pi <= 1; pi++) {
        ctx.beginPath();
        ctx.moveTo(cx + pi * hw * 0.5, cy - hh);
        ctx.lineTo(cx + pi * hw * 0.5, cy + hh);
        ctx.stroke();
    }

    // Iron bands (horizontal)
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy - hh * 0.5);
    ctx.lineTo(cx + hw, cy - hh * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy + hh * 0.5);
    ctx.lineTo(cx + hw, cy + hh * 0.5);
    ctx.stroke();

    // Iron studs (4 rivets on bands)
    ctx.fillStyle = '#5a5a5a';
    for (var si = -1; si <= 1; si += 2) {
        ctx.beginPath();
        ctx.arc(cx + si * hw * 0.6, cy - hh * 0.5, 1, 0, Math.PI * 2);
        ctx.arc(cx + si * hw * 0.6, cy + hh * 0.5, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Handle (iron ring)
    ctx.strokeStyle = '#6a5a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx + hw * 0.4, cy + 1, 2, 0, Math.PI * 2);
    ctx.stroke();
    // Handle pin
    ctx.fillStyle = '#5a5a5a';
    ctx.beginPath();
    ctx.arc(cx + hw * 0.4, cy - 1, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Keyhole (tiny dark slit below handle)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(cx + hw * 0.38, cy + 3, 1.5, 2);
}

// ── Enhanced wall decoration (cracks, moss, torch sconces) ──
function drawWallEnhanced(ctx, cx, cy, col, row, biome) {
    const seed = col * 7 + row * 13;
    const hw = HEX_W * 0.38;
    const hh = HEX_H * 0.38;

    // Brick pattern (existing)
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
        const y = cy - hh + (i + 1) * hh * 0.5;
        const xOff = (i % 2 === 0) ? 0 : hw * 0.4;
        ctx.beginPath();
        ctx.moveTo(cx - hw + xOff, y);
        ctx.lineTo(cx + hw - (hw * 0.4 - xOff), y);
        ctx.stroke();
    }

    // Cracks (seeded, ~30% of walls)
    if ((seed % 10) < 3) {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 0.6;
        const crackX = cx + ((seed % 5) - 2) * hw * 0.3;
        const crackY = cy + ((seed % 7) - 3) * hh * 0.2;
        ctx.beginPath();
        ctx.moveTo(crackX, crackY - hh * 0.3);
        ctx.lineTo(crackX + hw * 0.1, crackY);
        ctx.lineTo(crackX - hw * 0.05, crackY + hh * 0.25);
        ctx.stroke();
    }

    // Moss (green patches, ~20% of walls, cave/graveyard only)
    if (biome === 'cave' || biome === 'graveyard') {
        if ((seed % 10) >= 6 && (seed % 10) < 8) {
            ctx.fillStyle = 'rgba(40,80,30,0.3)';
            const mx = cx + ((seed % 3) - 1) * hw * 0.5;
            const my = cy + hh * 0.3;
            ctx.beginPath();
            ctx.arc(mx, my, HEX_W * 0.06, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(mx + hw * 0.15, my - hh * 0.1, HEX_W * 0.04, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ── Torch sconce on wall ──────────────────────────────────
function drawTorchOnWall(ctx, cx, cy, timestamp) {
    // Bracket
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - HEX_H * 0.15);
    ctx.lineTo(cx, cy - HEX_H * 0.3);
    ctx.stroke();

    // Flame (animated)
    const flicker = Math.sin(timestamp * 0.008 + cx * 0.5) * 0.15 + 0.85;
    const flameH = HEX_H * 0.2 * flicker;
    const grad = ctx.createRadialGradient(
        cx, cy - HEX_H * 0.35, 0,
        cx, cy - HEX_H * 0.35, HEX_W * 0.12
    );
    grad.addColorStop(0, `rgba(255,200,50,${0.9 * flicker})`);
    grad.addColorStop(0.5, `rgba(255,120,20,${0.6 * flicker})`);
    grad.addColorStop(1, 'rgba(255,60,10,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - HEX_H * 0.35, HEX_W * 0.08, flameH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Light glow
    const glowGrad = ctx.createRadialGradient(
        cx, cy - HEX_H * 0.3, 0,
        cx, cy - HEX_H * 0.3, HEX_W * 0.5
    );
    glowGrad.addColorStop(0, `rgba(255,180,50,${0.15 * flicker})`);
    glowGrad.addColorStop(1, 'rgba(255,180,50,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy - HEX_H * 0.3, HEX_W * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

// ── Trap mark on floor ──────────────────────────────────
function drawTrapMark(ctx, cx, cy, col, row) {
    // Subtle pressure plate pattern
    const s = HEX_W * 0.15;
    ctx.strokeStyle = 'rgba(120,80,40,0.25)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(cx - s, cy - s * 0.6, s * 2, s * 1.2);
    ctx.setLineDash([]);
    // Small dot in center
    ctx.fillStyle = 'rgba(120,80,40,0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, HEX_W * 0.03, 0, Math.PI * 2);
    ctx.fill();
}

// ── Secret wall crack hint ──────────────────────────────
function drawSecretWallHint(ctx, cx, cy) {
    // Very subtle crack pattern suggesting a hidden passage
    ctx.strokeStyle = 'rgba(60,40,20,0.3)';
    ctx.lineWidth = 0.7;
    ctx.setLineDash([1, 3]);
    const hw = HEX_W * 0.2;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy - HEX_H * 0.1);
    ctx.lineTo(cx, cy + HEX_H * 0.05);
    ctx.lineTo(cx + hw * 0.5, cy - HEX_H * 0.15);
    ctx.stroke();
    ctx.setLineDash([]);
}


// Wall tile (#) decoration — cracks, moss, stone texture
function drawWallTileDecoration(ctx, cx, cy, col, row, biome) {
    const seed = (col * 7 + row * 13) % 100;
    // Stone cracks
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5;
    if (seed % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 2);
        ctx.lineTo(cx - 1, cy + 1);
        ctx.lineTo(cx + 3, cy - 1);
        ctx.stroke();
    }
    if (seed % 5 < 2) {
        ctx.beginPath();
        ctx.moveTo(cx + 2, cy + 3);
        ctx.lineTo(cx + 5, cy + 1);
        ctx.stroke();
    }
    // Moss patches (cave/graveyard only)
    if (biome === 'cave' || biome === 'graveyard') {
        if (seed % 4 === 0) {
            ctx.fillStyle = 'rgba(40,80,30,0.15)';
            ctx.beginPath();
            ctx.arc(cx - 3, cy + 4, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        if (seed % 7 < 2) {
            ctx.fillStyle = 'rgba(50,90,40,0.12)';
            ctx.beginPath();
            ctx.arc(cx + 4, cy - 2, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // Stone texture dots
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 3; i++) {
        const dx = ((seed + i * 17) % 12) - 6;
        const dy = ((seed + i * 23) % 10) - 5;
        ctx.fillRect(cx + dx, cy + dy, 1, 1);
    }
}


// Chest tile — wooden treasure chest with gold trim and glow
function drawChestDecoration(ctx, cx, cy, col, row, timestamp) {
    const t = (timestamp || 0) * 0.001;
    const pulse = 0.3 + Math.sin(t * 1.5) * 0.1;

    // Shadow under chest
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx + 1, cy + 2, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chest body (dark wood)
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(cx - 5, cy - 4, 10, 7);

    // Chest lid (lighter wood, slightly raised)
    ctx.fillStyle = '#7a5a2a';
    ctx.fillRect(cx - 6, cy - 7, 12, 4);

    // Lid top bevel
    ctx.fillStyle = '#8a6a3a';
    ctx.fillRect(cx - 5, cy - 8, 10, 2);

    // Gold trim bands
    ctx.fillStyle = '#c4953a';
    ctx.fillRect(cx - 6, cy - 4, 12, 1);  // Middle band
    ctx.fillRect(cx - 6, cy - 7, 12, 1);  // Top band

    // Lock/clasp (gold circle)
    ctx.fillStyle = '#daa520';
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Subtle golden glow around chest
    const grad = ctx.createRadialGradient(cx, cy - 3, 2, cx, cy - 3, 12);
    grad.addColorStop(0, 'rgba(196,149,58,' + pulse + ')');
    grad.addColorStop(0.5, 'rgba(196,149,58,' + (pulse * 0.2) + ')');
    grad.addColorStop(1, 'rgba(196,149,58,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy - 3, 12, 0, Math.PI * 2);
    ctx.fill();

    // Sparkle particles (2 random positions)
    const r1 = tileRand(col, row, 7);
    const r2 = tileRand(col, row, 8);
    const sparkle = Math.sin(t * 3 + r1 * 6) * 0.5 + 0.5;
    if (sparkle > 0.6) {
        ctx.fillStyle = 'rgba(255,215,0,' + (sparkle * 0.6) + ')';
        ctx.beginPath();
        ctx.arc(cx + (r1 - 0.5) * 14, cy - 8 + (r2 - 0.5) * 6, 1, 0, Math.PI * 2);
        ctx.fill();
    }
    const sparkle2 = Math.sin(t * 2.5 + r2 * 4) * 0.5 + 0.5;
    if (sparkle2 > 0.65) {
        ctx.fillStyle = 'rgba(255,215,0,' + (sparkle2 * 0.5) + ')';
        ctx.beginPath();
        ctx.arc(cx + (r2 - 0.5) * 12, cy - 6 + (r1 - 0.5) * 8, 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
}

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
        case 'D': drawDoorDecoration(ctx, cx, cy, col, row); break;
        case '#': drawWallTileDecoration(ctx, cx, cy, col, row, biome); break;
        case 'C': drawChestDecoration(ctx, cx, cy, col, row, timestamp); break;
    }
}

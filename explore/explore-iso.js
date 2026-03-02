// ═══════════════════════════════════════════════════════
// ISOMETRIC GEOMETRY — dynamic hex sizing + coordinate conversions
// ═══════════════════════════════════════════════════════

// Hex dimensions — calculated dynamically to fit viewport width
let HEX_W = 44;
let HEX_H = 26;
let UNIT_PX = 7;
let ROW_STEP = HEX_H * 0.75;

// Map offset (to center the hex grid within the canvas)
let MAP_OFFSET_X = 0;
let MAP_OFFSET_Y = 0;

// Tile height map (in height units)
const TILE_HEIGHT = {
    '.': 1,   'g': 1,   'p': 1,   's': 1,   'b': 1,
    'm': 0.5,
    'R': 1.5, 'r': 1.5,
    'T': 2,
    'i': 1,   'v': 1,
    'w': 0,   'W': -0.5,
    'M': 3,   '#': 2.5,
    'L': 0,
    '@': 1,   'E': 1,
};

// Scale multiplier — 1.5x makes hexes ~50px wide on a 390px viewport
const MAP_SCALE = 1.5;

// Calculate hex dimensions scaled up from viewport-fit baseline
function calcHexSizeForViewport(viewportW, viewportH, cols, rows) {
    const padX = 8;

    // Base hex width to fit viewport, then scale up
    const baseHexW = (viewportW - padX * 2) / (cols + 0.5);
    HEX_W = Math.floor(baseHexW * MAP_SCALE);
    HEX_H = Math.round(HEX_W * 0.6);
    UNIT_PX = Math.max(4, Math.round(HEX_W * 0.16));
    ROW_STEP = HEX_H * 0.75;

    // Calculate map dimensions (canvas is larger than viewport)
    const maxTileH = Math.max(...Object.values(TILE_HEIGHT)) * UNIT_PX;
    const mapW = cols * HEX_W + HEX_W / 2 + padX * 2;
    const mapH = (rows - 1) * ROW_STEP + HEX_H + maxTileH + 20;

    const canvasW = Math.max(mapW, viewportW);
    const canvasH = Math.max(mapH, viewportH);

    MAP_OFFSET_X = Math.max(padX, (canvasW - (cols * HEX_W + HEX_W / 2)) / 2);
    MAP_OFFSET_Y = Math.max(10, maxTileH + 10);

    return { w: canvasW, h: canvasH };
}

// Convert grid (col, row) to screen center
function hexToScreen(col, row) {
    const offset = (row % 2 === 1) ? HEX_W / 2 : 0;
    const px = col * HEX_W + offset + MAP_OFFSET_X + HEX_W / 2;
    const py = row * ROW_STEP + MAP_OFFSET_Y + HEX_H / 2;
    return { x: px, y: py };
}

// Get the 6 vertices of the isometric hex top face centered at (cx, cy)
function hexTopVertices(cx, cy) {
    const hw = HEX_W / 2;
    const hh = HEX_H / 2;
    return [
        { x: cx,      y: cy - hh },
        { x: cx + hw,  y: cy - hh / 2 },
        { x: cx + hw,  y: cy + hh / 2 },
        { x: cx,      y: cy + hh },
        { x: cx - hw,  y: cy + hh / 2 },
        { x: cx - hw,  y: cy - hh / 2 },
    ];
}

function hexLeftSideVertices(cx, cy, heightPx) {
    const hw = HEX_W / 2;
    const hh = HEX_H / 2;
    return [
        { x: cx - hw,  y: cy - hh / 2 },
        { x: cx,      y: cy + hh },
        { x: cx,      y: cy + hh + heightPx },
        { x: cx - hw,  y: cy - hh / 2 + heightPx },
    ];
}

function hexRightSideVertices(cx, cy, heightPx) {
    const hw = HEX_W / 2;
    const hh = HEX_H / 2;
    return [
        { x: cx + hw,  y: cy + hh / 2 },
        { x: cx,      y: cy + hh },
        { x: cx,      y: cy + hh + heightPx },
        { x: cx + hw,  y: cy + hh / 2 + heightPx },
    ];
}

function hexFrontSideVertices(cx, cy, heightPx) {
    const hw = HEX_W / 2;
    const hh = HEX_H / 2;
    return [
        { x: cx - hw, y: cy + hh / 2 },
        { x: cx,      y: cy + hh },
        { x: cx,      y: cy + hh + heightPx },
        { x: cx - hw, y: cy + hh / 2 + heightPx },
    ];
}

// Convert screen click coordinates to grid (col, row)
function screenToHex(sx, sy, grid, rows, cols) {
    const approxRow = Math.round((sy - MAP_OFFSET_Y - HEX_H / 2) / ROW_STEP);
    const offset = (approxRow % 2 === 1) ? HEX_W / 2 : 0;
    const approxCol = Math.round((sx - MAP_OFFSET_X - HEX_W / 2 - offset) / HEX_W);

    let bestDist = Infinity, bestCol = -1, bestRow = -1;
    const candidates = [[approxCol, approxRow]];

    const offsets = approxRow % 2 === 0
        ? [[-1,-1],[0,-1],[-1,0],[1,0],[-1,1],[0,1]]
        : [[0,-1],[1,-1],[-1,0],[1,0],[0,1],[1,1]];
    for (const [dc, dr] of offsets) {
        candidates.push([approxCol + dc, approxRow + dr]);
    }

    for (const [c, r] of candidates) {
        if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
        const center = hexToScreen(c, r);
        const tile = grid[r] && grid[r][c] ? grid[r][c] : '.';
        const h = (TILE_HEIGHT[tile] || 1) * UNIT_PX;
        const dist = Math.hypot(sx - center.x, sy - (center.y - h));
        if (dist < bestDist) {
            bestDist = dist;
            bestCol = c;
            bestRow = r;
        }
    }

    return { col: bestCol, row: bestRow };
}

// Draw a filled polygon from vertex array
function fillPoly(ctx, verts, color) {
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) {
        ctx.lineTo(verts[i].x, verts[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

// Darken a hex color by a factor (0-1, lower = darker)
function darken(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.round(r * factor);
    const ng = Math.round(g * factor);
    const nb = Math.round(b * factor);
    return `rgb(${nr},${ng},${nb})`;
}

function lighten(hex, amount) {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
    return `rgb(${r},${g},${b})`;
}

// ═══════════════════════════════════════════════════════
// MAP LAYOUT — Static data for the world hex map
// ═══════════════════════════════════════════════════════

// Hex geometry (flat-top orientation)
const HEX_RADIUS = 20;
const HEX_W = HEX_RADIUS * Math.sqrt(3);  // ~34.6
const HEX_H = HEX_RADIUS * 2;             // 40
const ROW_H = HEX_H * 0.75;               // 30

// Grid dimensions
const GRID_COLS = 14;
const GRID_ROWS = 16;

// SVG margins
const MAP_PAD_X = 30;
const MAP_PAD_Y = 25;

// Total SVG size
const SVG_W = MAP_PAD_X * 2 + GRID_COLS * HEX_W + HEX_W / 2;
const SVG_H = MAP_PAD_Y * 2 + GRID_ROWS * ROW_H + HEX_RADIUS;

// ── Location coordinates (col, row) on the hex grid ──
// Arranged geographically: North=top, South=bottom, West=left, East=right
const LOCATION_COORDS = {
    // Far North — Snow
    frozen_waste:        { col: 6,  row: 1 },
    // North — Forest
    goblin_nest:         { col: 3,  row: 3 },
    elven_ruins:         { col: 4,  row: 5 },
    // North-East — Mountain
    troll_cave:          { col: 10, row: 3 },
    stone_peaks:         { col: 9,  row: 5 },
    korthag:             { col: 11, row: 5 },
    // Mid — Forest/Mountain
    whispering_woods:    { col: 3,  row: 7 },
    dragon_pass:         { col: 11, row: 7 },
    // Central row — Main hubs
    orc_tribe:           { col: 2,  row: 9 },
    green_fields:        { col: 4,  row: 9 },
    city_gates:          { col: 6,  row: 9 },
    underground_passage: { col: 8,  row: 9 },
    misty_marshes:       { col: 10, row: 9 },
    // East — Volcanic settlements
    valkrest:            { col: 12, row: 8 },
    // South
    bandit_fortress:     { col: 3,  row: 12 },
    ancient_cemetery:    { col: 9,  row: 11 },
    golden_sands:        { col: 5,  row: 13 },
    deep_swamp:          { col: 10, row: 12 },
    // Far South-East — Volcanic
    burning_crater:      { col: 12, row: 13 },
};

// ── Connection edges (unique pairs) ──
const CONNECTION_EDGES = [
    ['city_gates', 'green_fields'],
    ['city_gates', 'whispering_woods'],
    ['city_gates', 'misty_marshes'],
    ['city_gates', 'golden_sands'],
    ['city_gates', 'underground_passage'],
    ['green_fields', 'orc_tribe'],
    ['green_fields', 'stone_peaks'],
    ['green_fields', 'bandit_fortress'],
    ['whispering_woods', 'goblin_nest'],
    ['whispering_woods', 'elven_ruins'],
    ['whispering_woods', 'frozen_waste'],
    ['elven_ruins', 'frozen_waste'],
    ['misty_marshes', 'ancient_cemetery'],
    ['misty_marshes', 'deep_swamp'],
    ['underground_passage', 'ancient_cemetery'],
    ['underground_passage', 'korthag'],
    ['stone_peaks', 'troll_cave'],
    ['stone_peaks', 'frozen_waste'],
    ['stone_peaks', 'dragon_pass'],
    ['stone_peaks', 'korthag'],
    ['dragon_pass', 'burning_crater'],
    ['dragon_pass', 'valkrest'],
    ['golden_sands', 'bandit_fortress'],
    ['golden_sands', 'burning_crater'],
    ['deep_swamp', 'burning_crater'],
    ['burning_crater', 'valkrest'],
];

// ── Biome display info ──
const BIOME_INFO = {
    plains:   { label: 'Planícies',       color: '#5a7a3a', hexFill: '#4a6030' },
    forest:   { label: 'Floresta',        color: '#1a5a1a', hexFill: '#1a4a1a' },
    swamp:    { label: 'Pântano',         color: '#3a5a2a', hexFill: '#2a3a20' },
    cave:     { label: 'Caverna',         color: '#3a3a5a', hexFill: '#2a2a3a' },
    graveyard:{ label: 'Cemitério',       color: '#4a3a3a', hexFill: '#3a2a2a' },
    desert:   { label: 'Deserto',         color: '#8a7a4a', hexFill: '#7a6a3a' },
    mountain: { label: 'Montanha',        color: '#5a5a6a', hexFill: '#4a4a5a' },
    snow:     { label: 'Neve',            color: '#8a9aaa', hexFill: '#7a8a9a' },
    volcanic: { label: 'Vulcânico',       color: '#6a3a1a', hexFill: '#5a2a1a' },
};

// Danger level color mapping
function getDangerColor(level) {
    if (level <= 1) return '#6a8a5a';  // Safe green
    if (level <= 3) return '#8a8a4a';  // Moderate yellow
    if (level <= 5) return '#8a6a3a';  // Warning orange
    if (level <= 7) return '#8a4a3a';  // Danger red
    return '#8a2a2a';                   // Extreme dark red
}

function getDangerLabel(level) {
    if (level <= 1) return 'Seguro';
    if (level <= 3) return 'Moderado';
    if (level <= 5) return 'Perigoso';
    if (level <= 7) return 'Muito Perigoso';
    return 'Extremo';
}

// ── Terrain fill hexes (decorative, between locations) ──
// Each entry: [col, row, biomeHint]
// These fill the visual gaps with themed terrain
const TERRAIN_HEXES = [
    // Plains region (west)
    [3, 10, 'plains'], [5, 10, 'plains'], [3, 11, 'plains'],
    [2, 10, 'plains'], [4, 11, 'plains'],
    // Forest region (north)
    [4, 4, 'forest'], [3, 5, 'forest'], [2, 6, 'forest'],
    [3, 6, 'forest'], [4, 7, 'forest'], [5, 6, 'forest'],
    [4, 3, 'forest'], [2, 4, 'forest'],
    // Snow region (far north)
    [5, 1, 'snow'], [7, 1, 'snow'], [6, 2, 'snow'],
    [7, 2, 'snow'], [8, 2, 'snow'],
    // Mountain region (northeast)
    [9, 4, 'mountain'], [10, 4, 'mountain'], [10, 5, 'mountain'],
    [11, 6, 'mountain'], [10, 6, 'mountain'], [9, 6, 'mountain'],
    [8, 4, 'mountain'],
    // Desert region (south)
    [4, 13, 'desert'], [6, 13, 'desert'], [5, 14, 'desert'],
    [4, 14, 'desert'], [6, 12, 'desert'],
    // Swamp region (east)
    [10, 10, 'swamp'], [9, 10, 'swamp'], [10, 11, 'swamp'],
    [11, 10, 'swamp'],
    // Cave/graveyard (center-east)
    [8, 10, 'cave'], [9, 12, 'graveyard'],
    // Volcanic (far east)
    [12, 10, 'volcanic'], [12, 11, 'volcanic'], [11, 12, 'volcanic'],
    [12, 12, 'volcanic'], [13, 12, 'volcanic'], [11, 13, 'volcanic'],
    // Central area around Eldoria
    [5, 8, 'plains'], [7, 8, 'plains'], [6, 8, 'plains'],
    [5, 9, 'plains'], [7, 9, 'plains'],
    [7, 10, 'plains'],
];

// ── Hex geometry utilities ──

/**
 * Convert hex grid coords to pixel center (flat-top hex).
 * Odd rows are shifted right by half a hex width.
 */
function hexToPixel(col, row) {
    const x = MAP_PAD_X + col * HEX_W + (row % 2 === 1 ? HEX_W / 2 : 0);
    const y = MAP_PAD_Y + row * ROW_H;
    return { x, y };
}

/**
 * Generate SVG polygon points for a flat-top hex at (cx, cy).
 */
function hexPoints(cx, cy, radius) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i);
        pts.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
    }
    return pts.join(' ');
}

/**
 * BFS shortest distance between two location IDs using known connections.
 */
function bfsDistance(fromId, toId, connections) {
    if (fromId === toId) return 0;
    const visited = new Set([fromId]);
    const queue = [[fromId, 0]];
    while (queue.length > 0) {
        const [current, dist] = queue.shift();
        const neighbors = connections[current] || [];
        for (const nb of neighbors) {
            if (nb === toId) return dist + 1;
            if (!visited.has(nb)) {
                visited.add(nb);
                queue.push([nb, dist + 1]);
            }
        }
    }
    return -1; // unreachable
}

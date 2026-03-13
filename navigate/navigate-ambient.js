// ═══════════════════════════════════════════════════════
// NAVIGATE AMBIENT — Biome particles & cloud drift
// Lightweight SVG particles with CSS animations (GPU)
// ═══════════════════════════════════════════════════════

// Biome → particle config
const BIOME_PARTICLES = {
    volcanic: { type: 'rise',   color: '#d46030', count: 3, sizeMin: 1.5, sizeMax: 3 },
    snow:     { type: 'fall',   color: '#c8d8e8', count: 3, sizeMin: 1,   sizeMax: 2.5 },
    forest:   { type: 'pulse',  color: '#6aaa4a', count: 3, sizeMin: 1.5, sizeMax: 2.5 },
    swamp:    { type: 'breath', color: '#5a7a4a', count: 2, sizeMin: 3,   sizeMax: 5 },
    desert:   { type: 'drift',  color: '#c4a060', count: 2, sizeMin: 1,   sizeMax: 2 },
    graveyard:{ type: 'pulse',  color: '#7a6a7a', count: 2, sizeMin: 2,   sizeMax: 3.5 },
    cave:     { type: 'pulse',  color: '#5a6a8a', count: 2, sizeMin: 1.5, sizeMax: 2.5 },
    mountain: { type: 'drift',  color: '#8a8a9a', count: 2, sizeMin: 1,   sizeMax: 2 },
};

const MAX_PARTICLES = 40;
let _ambientGroup = null;
let _particleCount = 0;

function initAmbientParticles() {
    const svg = document.getElementById('map-svg');
    if (!svg) return;
    // Remove old layer
    if (_ambientGroup) _ambientGroup.remove();
    _particleCount = 0;

    _ambientGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    _ambientGroup.setAttribute('class', 'ambient-layer');
    _ambientGroup.setAttribute('pointer-events', 'none');
    svg.appendChild(_ambientGroup);

    // Spawn biome particles at explored locations
    const discoveredSet = new Set(S.discoveredLocs || []);
    for (const [locId, coords] of Object.entries(LOCATION_COORDS)) {
        if (_particleCount >= MAX_PARTICLES) break;
        if (!discoveredSet.has(locId)) continue;
        const ld = S.locations[locId];
        if (!ld) continue;
        const biome = ld.b || 'plains';
        const cfg = BIOME_PARTICLES[biome];
        if (!cfg) continue;
        const { x, y } = hexToPixel(coords.col, coords.row);
        _spawnBiomeParticles(x, y, cfg);
    }

    // Spawn drifting clouds (only 3-4, large, slow)
    _spawnClouds();
}

function _spawnBiomeParticles(cx, cy, cfg) {
    const count = Math.min(cfg.count, MAX_PARTICLES - _particleCount);
    for (let i = 0; i < count; i++) {
        if (_particleCount >= MAX_PARTICLES) break;
        const r = cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin);
        // Random offset from center
        const ox = (Math.random() - 0.5) * 24;
        const oy = (Math.random() - 0.5) * 20;
        const px = cx + ox;
        const py = cy + oy;
        const delay = (Math.random() * 4).toFixed(1);
        const dur = (3 + Math.random() * 4).toFixed(1);

        const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        el.setAttribute('cx', px);
        el.setAttribute('cy', py);
        el.setAttribute('r', r);
        el.setAttribute('fill', cfg.color);
        el.setAttribute('class', `amb-particle amb-${cfg.type}`);
        el.style.animationDelay = `${delay}s`;
        el.style.animationDuration = `${dur}s`;
        _ambientGroup.appendChild(el);
        _particleCount++;
    }
}

function _spawnClouds() {
    const cloudCount = 4;
    const svgW = SVG_W || 733;
    const svgH = SVG_H || 720;
    for (let i = 0; i < cloudCount; i++) {
        if (_particleCount >= MAX_PARTICLES) break;
        const cx = Math.random() * svgW;
        const cy = 40 + Math.random() * (svgH - 80);
        const rx = 30 + Math.random() * 40;
        const ry = 8 + Math.random() * 12;
        const delay = (i * 8 + Math.random() * 5).toFixed(1);
        const dur = (35 + Math.random() * 25).toFixed(1);

        const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        el.setAttribute('cx', cx);
        el.setAttribute('cy', cy);
        el.setAttribute('rx', rx);
        el.setAttribute('ry', ry);
        el.setAttribute('fill', '#d4c8b0');
        el.setAttribute('class', 'amb-cloud');
        el.style.animationDelay = `${delay}s`;
        el.style.animationDuration = `${dur}s`;
        _ambientGroup.appendChild(el);
        _particleCount++;
    }
}

// Re-init when fog state changes (new locations discovered)
function refreshAmbientParticles() {
    initAmbientParticles();
}

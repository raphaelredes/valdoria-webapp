// ═══════════════════════════════════════════════════════
// BIOME AMBIENT PARTICLES — CSS-animated, no canvas
// ═══════════════════════════════════════════════════════

const BIOME_PARTICLES = {
    forest:   [{ text: '🍃', cls: 'leaf', n: 3 }, { text: '🍂', cls: 'leaf', n: 2 }],
    plains:   [{ text: '🌾', cls: 'leaf', n: 2 }],
    snow:     [{ text: '❄', cls: 'snowflake', n: 4 }],
    desert:   [{ cls: 'sand-wisp', n: 3 }],
    volcanic: [{ cls: 'ember', n: 4 }],
    swamp:    [{ cls: 'mist', n: 3 }],
    graveyard:[{ cls: 'mist', n: 3 }],
    cave:     [{ cls: 'mist', n: 2 }],
    mountain: [{ cls: 'mist', n: 2 }, { text: '🍃', cls: 'leaf', n: 1 }],
};

function initBiomeParticles(biome) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const viewport = document.getElementById('map-viewport');
    if (!viewport) return;

    const groups = BIOME_PARTICLES[biome] || [];
    groups.forEach(group => {
        for (let i = 0; i < group.n; i++) {
            const p = document.createElement('div');
            p.className = 'biome-particle particle-' + group.cls;
            if (group.text) p.textContent = group.text;
            p.style.left = (Math.random() * 90 + 5) + '%';
            p.style.top = (Math.random() * 80) + '%';
            p.style.animationDelay = (Math.random() * 8).toFixed(1) + 's';
            p.style.animationDuration = (6 + Math.random() * 6).toFixed(1) + 's';
            viewport.appendChild(p);
        }
    });
}

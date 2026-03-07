// ═══════════════════════════════════════════════════════
// TRAVEL ANIMATION — cinematic parallax journey to destination
// ═══════════════════════════════════════════════════════

// Per-biome visual config
const TRAVEL_CONFIG = {
    forest:   { bg: ['#0d2e0d','#1a4a1a'], ground: '#2d3d1d', midColor: '#1a3a1a', farColor: '#0a2a0a', silhouette: 'conifers',   icon: '' },
    plains:   { bg: ['#3a3a18','#5a5a28'], ground: '#5a4a30', midColor: '#4a4a20', farColor: '#3a3a15', silhouette: 'hills',      icon: '' },
    swamp:    { bg: ['#1a2a1a','#2a3a2a'], ground: '#3a3a2a', midColor: '#2a3a25', farColor: '#1a2a18', silhouette: 'deadTrees',  icon: '' },
    cave:     { bg: ['#0a0a14','#1a1a2a'], ground: '#1a1a2a', midColor: '#15152a', farColor: '#0a0a18', silhouette: 'rocks',      icon: '' },
    desert:   { bg: ['#6a5a30','#8a7a4a'], ground: '#8a7a4a', midColor: '#7a6a3a', farColor: '#5a4a28', silhouette: 'dunes',      icon: '' },
    mountain: { bg: ['#3a3a4a','#5a5a6a'], ground: '#5a4a3a', midColor: '#4a4a5a', farColor: '#2a2a3a', silhouette: 'peaks',      icon: '' },
    snow:     { bg: ['#8a8a9a','#b0b8c0'], ground: '#c0c8d0', midColor: '#9a9aaa', farColor: '#7a7a8a', silhouette: 'peaks',      icon: '' },
    volcanic: { bg: ['#2a1a0a','#3a2a1a'], ground: '#3a2a1a', midColor: '#3a2010', farColor: '#1a0a00', silhouette: 'rocks',      icon: '' },
    graveyard:{ bg: ['#1a1a20','#2a2a30'], ground: '#3a3a3a', midColor: '#252530', farColor: '#15151a', silhouette: 'tombstones', icon: '' },
    // Dungeon variants — darker, more menacing
    dungeon_cave:     { bg: ['#050510','#0a0a18'], ground: '#0f0f1a', midColor: '#0a0a15', farColor: '#050508', silhouette: 'rocks',      icon: '' },
    dungeon_graveyard:{ bg: ['#0a0a10','#15151a'], ground: '#1a1a20', midColor: '#101018', farColor: '#08080c', silhouette: 'tombstones', icon: '' },
    dungeon_volcanic: { bg: ['#1a0a00','#2a1508'], ground: '#2a1a0a', midColor: '#200a00', farColor: '#100500', silhouette: 'rocks',      icon: '' },
    dungeon_forest:   { bg: ['#050a05','#0a150a'], ground: '#0a1a0a', midColor: '#081208', farColor: '#040a04', silhouette: 'conifers',   icon: '' },
    dungeon_swamp:    { bg: ['#0a100a','#151a15'], ground: '#1a1a15', midColor: '#121812', farColor: '#080a08', silhouette: 'deadTrees',  icon: '' },
    dungeon_mountain: { bg: ['#1a1a20','#2a2a35'], ground: '#2a2020', midColor: '#202030', farColor: '#151520', silhouette: 'peaks',      icon: '' },
    dungeon_snow:     { bg: ['#4a4a55','#6a6a75'], ground: '#5a5a65', midColor: '#555560', farColor: '#404048', silhouette: 'peaks',      icon: '' },
};

// Particle configs per biome
const TRAVEL_PARTICLES = {
    forest:   { type: 'leaf',  n: 8,  color: 'rgba(80,140,40,0.6)' },
    plains:   { type: 'leaf',  n: 5,  color: 'rgba(160,140,60,0.5)' },
    swamp:    { type: 'mist',  n: 6,  color: 'rgba(150,170,140,0.12)' },
    cave:     { type: 'mist',  n: 4,  color: 'rgba(100,100,140,0.08)' },
    desert:   { type: 'wisp',  n: 6,  color: 'rgba(180,160,100,0.3)' },
    mountain: { type: 'mist',  n: 4,  color: 'rgba(180,180,200,0.1)' },
    snow:     { type: 'snow',  n: 10, color: 'rgba(220,230,255,0.7)' },
    volcanic: { type: 'ember', n: 8,  color: 'rgba(255,100,0,0.8)' },
    graveyard:{ type: 'mist',  n: 5,  color: 'rgba(140,140,160,0.1)' },
    // Dungeon variants
    dungeon_cave:     { type: 'mist',  n: 5,  color: 'rgba(60,60,80,0.1)' },
    dungeon_graveyard:{ type: 'mist',  n: 6,  color: 'rgba(80,80,100,0.08)' },
    dungeon_volcanic: { type: 'ember', n: 10, color: 'rgba(255,60,0,0.9)' },
    dungeon_forest:   { type: 'mist',  n: 4,  color: 'rgba(40,60,40,0.1)' },
    dungeon_swamp:    { type: 'mist',  n: 7,  color: 'rgba(80,100,70,0.1)' },
    dungeon_mountain: { type: 'mist',  n: 4,  color: 'rgba(100,100,120,0.08)' },
    dungeon_snow:     { type: 'snow',  n: 6,  color: 'rgba(180,190,200,0.5)' },
};

let _travelRaf = 0;

/**
 * Play the travel cinematic animation.
 * @param {string} biome - Biome ID (forest, swamp, dungeon_cave, etc.)
 * @param {string} regionName - Display name ("Pântano Nebuloso")
 * @param {Function} onComplete - Called when animation ends or is skipped
 */
function playTravelAnimation(biome, regionName, onComplete) {
    // Skip for reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        onComplete();
        return;
    }

    const overlay = document.getElementById('travel-overlay');
    const canvas = document.getElementById('travel-canvas');
    const skipBtn = document.getElementById('travel-skip-btn');
    const ctx = canvas.getContext('2d');

    // Size canvas to viewport
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    const cfg = TRAVEL_CONFIG[biome] || TRAVEL_CONFIG.forest;
    const pcfg = TRAVEL_PARTICLES[biome] || TRAVEL_PARTICLES.forest;

    // Generate particles
    const particles = [];
    for (let i = 0; i < pcfg.n; i++) {
        particles.push(_createTravelParticle(pcfg, w, h));
    }

    // Generate terrain features
    const farFeatures = _generateFeatures(cfg.silhouette, w, 12);
    const midFeatures = _generateFeatures(cfg.silhouette, w, 8);

    // Player walk cycle state
    let walkFrame = 0;

    overlay.classList.add('active');

    let _done = false;
    const startTime = performance.now();
    const DURATION = 3000;

    const finish = () => {
        if (_done) return;
        _done = true;
        cancelAnimationFrame(_travelRaf);
        skipBtn.classList.remove('visible');
        skipBtn.onclick = null;
        overlay.classList.remove('active');
        onComplete();
    };

    // Skip button appears after 500ms
    setTimeout(() => {
        if (!_done) {
            skipBtn.classList.add('visible');
            skipBtn.onclick = finish;
        }
    }, 500);

    // Auto-complete after duration
    setTimeout(finish, DURATION);

    // Animation loop
    function frame(timestamp) {
        if (_done) return;

        const elapsed = timestamp - startTime;
        const progress = Math.min(1, elapsed / DURATION);

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, cfg.bg[0]);
        grad.addColorStop(0.6, cfg.bg[1]);
        grad.addColorStop(1, cfg.ground);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Far terrain layer (slow parallax)
        const farOffset = elapsed * 0.015;
        _drawTerrainLayer(ctx, farFeatures, w, h, 0.45, cfg.farColor, farOffset, cfg.silhouette);

        // Mid terrain layer (medium parallax)
        const midOffset = elapsed * 0.04;
        _drawTerrainLayer(ctx, midFeatures, w, h, 0.62, cfg.midColor, midOffset, cfg.silhouette);

        // Ground
        const groundY = h * 0.75;
        ctx.fillStyle = cfg.ground;
        ctx.fillRect(0, groundY, w, h - groundY);

        // Ground line
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(w, groundY);
        ctx.stroke();

        // Biome-specific ground details
        _drawGroundDetails(ctx, biome, w, h, groundY, elapsed);

        // Walking player (center)
        walkFrame = Math.floor(elapsed / 200) % 4;
        _drawWalkingFigure(ctx, w * 0.5, groundY, walkFrame, elapsed);

        // Particles
        _updateTravelParticles(ctx, particles, pcfg, w, h, elapsed);

        // Text (fade in first 400ms)
        const textAlpha = Math.min(1, elapsed / 400);
        _drawTravelText(ctx, regionName, cfg.icon, w, h, textAlpha);

        // Fade out last 400ms
        if (progress > 0.85) {
            const fadeOut = (progress - 0.85) / 0.15;
            ctx.fillStyle = `rgba(26,21,32,${fadeOut})`;
            ctx.fillRect(0, 0, w, h);
        }

        _travelRaf = requestAnimationFrame(frame);
    }

    _travelRaf = requestAnimationFrame(frame);
}


// ═══════════════════════════════════════════
// TERRAIN GENERATION
// ═══════════════════════════════════════════

function _generateFeatures(type, canvasW, count) {
    const features = [];
    const spacing = (canvasW * 2) / count;
    for (let i = 0; i < count; i++) {
        features.push({
            x: i * spacing + (Math.random() - 0.5) * spacing * 0.5,
            height: 0.3 + Math.random() * 0.7,
            width: 0.6 + Math.random() * 0.6,
            variant: Math.floor(Math.random() * 3),
        });
    }
    return features;
}

function _drawTerrainLayer(ctx, features, w, h, yRatio, color, offset, silhouetteType) {
    const baseY = h * yRatio;
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.moveTo(0, h);

    for (const f of features) {
        const x = ((f.x - offset) % (w * 2) + w * 2) % (w * 2) - w * 0.3;
        const fh = f.height * h * 0.18;
        const fw = f.width * 40;
        _drawSilhouette(ctx, silhouetteType, x, baseY, fh, fw, f.variant);
    }

    ctx.lineTo(w + 10, baseY);
    ctx.lineTo(w + 10, h);
    ctx.closePath();
    ctx.fill();
}

/**
 * Draw a single silhouette shape based on biome type.
 * Each type produces a visually distinct outline.
 */
function _drawSilhouette(ctx, type, x, baseY, fh, fw, variant) {
    switch (type) {
        case 'conifers':
            // Triangular pine trees — pointy evergreen shapes
            ctx.lineTo(x - fw * 0.5, baseY);
            ctx.lineTo(x - fw * 0.4, baseY - fh * 0.3);
            ctx.lineTo(x - fw * 0.5, baseY - fh * 0.28);
            ctx.lineTo(x - fw * 0.3, baseY - fh * 0.6);
            ctx.lineTo(x - fw * 0.4, baseY - fh * 0.58);
            ctx.lineTo(x, baseY - fh);
            ctx.lineTo(x + fw * 0.4, baseY - fh * 0.58);
            ctx.lineTo(x + fw * 0.3, baseY - fh * 0.6);
            ctx.lineTo(x + fw * 0.5, baseY - fh * 0.28);
            ctx.lineTo(x + fw * 0.4, baseY - fh * 0.3);
            ctx.lineTo(x + fw * 0.5, baseY);
            break;

        case 'deadTrees':
            // Thin trunks with bare branching limbs
            ctx.lineTo(x - fw * 0.1, baseY);
            ctx.lineTo(x - fw * 0.08, baseY - fh * 0.5);
            // Left branch
            ctx.lineTo(x - fw * 0.5, baseY - fh * 0.8);
            ctx.lineTo(x - fw * 0.35, baseY - fh * 0.65);
            // Right sub-branch
            ctx.lineTo(x - fw * 0.15, baseY - fh * 0.7);
            ctx.lineTo(x - fw * 0.3, baseY - fh * 0.95);
            ctx.lineTo(x - fw * 0.1, baseY - fh * 0.75);
            // Top
            ctx.lineTo(x, baseY - fh);
            // Right branch
            ctx.lineTo(x + fw * 0.1, baseY - fh * 0.75);
            ctx.lineTo(x + fw * 0.4, baseY - fh * 0.9);
            ctx.lineTo(x + fw * 0.2, baseY - fh * 0.65);
            ctx.lineTo(x + fw * 0.45, baseY - fh * 0.7);
            ctx.lineTo(x + fw * 0.08, baseY - fh * 0.5);
            ctx.lineTo(x + fw * 0.1, baseY);
            break;

        case 'rocks':
            // Angular irregular blocks — stalactites/boulders
            if (variant === 0) {
                ctx.lineTo(x - fw * 0.6, baseY);
                ctx.lineTo(x - fw * 0.5, baseY - fh * 0.3);
                ctx.lineTo(x - fw * 0.3, baseY - fh * 0.7);
                ctx.lineTo(x - fw * 0.1, baseY - fh);
                ctx.lineTo(x + fw * 0.15, baseY - fh * 0.6);
                ctx.lineTo(x + fw * 0.3, baseY - fh * 0.8);
                ctx.lineTo(x + fw * 0.5, baseY - fh * 0.35);
                ctx.lineTo(x + fw * 0.6, baseY);
            } else if (variant === 1) {
                ctx.lineTo(x - fw * 0.5, baseY);
                ctx.lineTo(x - fw * 0.45, baseY - fh * 0.5);
                ctx.lineTo(x - fw * 0.2, baseY - fh * 0.4);
                ctx.lineTo(x - fw * 0.1, baseY - fh * 0.9);
                ctx.lineTo(x + fw * 0.1, baseY - fh);
                ctx.lineTo(x + fw * 0.25, baseY - fh * 0.5);
                ctx.lineTo(x + fw * 0.4, baseY - fh * 0.6);
                ctx.lineTo(x + fw * 0.5, baseY);
            } else {
                ctx.lineTo(x - fw * 0.4, baseY);
                ctx.lineTo(x - fw * 0.35, baseY - fh * 0.6);
                ctx.lineTo(x - fw * 0.05, baseY - fh * 0.85);
                ctx.lineTo(x + fw * 0.2, baseY - fh);
                ctx.lineTo(x + fw * 0.35, baseY - fh * 0.55);
                ctx.lineTo(x + fw * 0.4, baseY);
            }
            break;

        case 'dunes':
            // Smooth undulating sand dune curves
            ctx.lineTo(x - fw * 0.8, baseY);
            ctx.quadraticCurveTo(x - fw * 0.4, baseY - fh * 0.7, x, baseY - fh * 0.5);
            ctx.quadraticCurveTo(x + fw * 0.3, baseY - fh * 0.35, x + fw * 0.5, baseY - fh * 0.6);
            ctx.quadraticCurveTo(x + fw * 0.7, baseY - fh * 0.8, x + fw * 0.9, baseY);
            break;

        case 'peaks':
            // Sharp jagged mountain peaks with ridgelines
            ctx.lineTo(x - fw * 0.7, baseY);
            ctx.lineTo(x - fw * 0.5, baseY - fh * 0.4);
            ctx.lineTo(x - fw * 0.35, baseY - fh * 0.35);
            ctx.lineTo(x - fw * 0.2, baseY - fh * 0.85);
            ctx.lineTo(x - fw * 0.05, baseY - fh * 0.7);
            ctx.lineTo(x + fw * 0.1, baseY - fh);
            ctx.lineTo(x + fw * 0.25, baseY - fh * 0.6);
            ctx.lineTo(x + fw * 0.4, baseY - fh * 0.75);
            ctx.lineTo(x + fw * 0.55, baseY - fh * 0.3);
            ctx.lineTo(x + fw * 0.7, baseY);
            break;

        case 'tombstones':
            // Upright rectangular gravestones with rounded/pointed tops
            if (variant === 0) {
                // Rounded-top tombstone
                ctx.lineTo(x - fw * 0.2, baseY);
                ctx.lineTo(x - fw * 0.2, baseY - fh * 0.7);
                ctx.arc(x, baseY - fh * 0.7, fw * 0.2, Math.PI, 0);
                ctx.lineTo(x + fw * 0.2, baseY);
            } else if (variant === 1) {
                // Cross-shaped grave marker
                ctx.lineTo(x - fw * 0.06, baseY);
                ctx.lineTo(x - fw * 0.06, baseY - fh * 0.55);
                ctx.lineTo(x - fw * 0.25, baseY - fh * 0.55);
                ctx.lineTo(x - fw * 0.25, baseY - fh * 0.7);
                ctx.lineTo(x - fw * 0.06, baseY - fh * 0.7);
                ctx.lineTo(x - fw * 0.06, baseY - fh);
                ctx.lineTo(x + fw * 0.06, baseY - fh);
                ctx.lineTo(x + fw * 0.06, baseY - fh * 0.7);
                ctx.lineTo(x + fw * 0.25, baseY - fh * 0.7);
                ctx.lineTo(x + fw * 0.25, baseY - fh * 0.55);
                ctx.lineTo(x + fw * 0.06, baseY - fh * 0.55);
                ctx.lineTo(x + fw * 0.06, baseY);
            } else {
                // Pointed obelisk
                ctx.lineTo(x - fw * 0.15, baseY);
                ctx.lineTo(x - fw * 0.15, baseY - fh * 0.75);
                ctx.lineTo(x, baseY - fh);
                ctx.lineTo(x + fw * 0.15, baseY - fh * 0.75);
                ctx.lineTo(x + fw * 0.15, baseY);
            }
            break;

        case 'hills':
            // Gentle rolling hillside curves
            ctx.lineTo(x - fw * 0.9, baseY);
            ctx.quadraticCurveTo(x - fw * 0.4, baseY - fh * 0.5, x, baseY - fh * 0.4);
            ctx.quadraticCurveTo(x + fw * 0.4, baseY - fh * 0.25, x + fw * 0.9, baseY);
            break;

        default:
            // Fallback — generic mountain shape
            ctx.lineTo(x - fw, baseY);
            ctx.lineTo(x - fw * 0.6, baseY - fh * 0.4);
            ctx.lineTo(x - fw * 0.2, baseY - fh);
            ctx.lineTo(x + fw * 0.1, baseY - fh * 0.85);
            ctx.lineTo(x + fw * 0.5, baseY - fh * 0.3);
            ctx.lineTo(x + fw, baseY);
            break;
    }
}


// ═══════════════════════════════════════════
// GROUND DETAILS
// ═══════════════════════════════════════════

function _drawGroundDetails(ctx, biome, w, h, groundY, elapsed) {
    const scrollX = elapsed * 0.08;
    // Strip dungeon_ prefix for ground detail matching
    const baseBiome = biome.startsWith('dungeon_') ? biome.slice(8) : biome;

    if (baseBiome === 'swamp') {
        // Puddles / murky water
        ctx.fillStyle = 'rgba(40,60,50,0.3)';
        for (let i = 0; i < 6; i++) {
            const px = ((i * 80 + 20 - scrollX) % (w + 60)) - 30;
            ctx.beginPath();
            ctx.ellipse(px, groundY + 20 + i * 8, 25, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (baseBiome === 'desert') {
        // Sand ripples
        ctx.strokeStyle = 'rgba(160,140,80,0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const rx = ((i * 90 - scrollX * 0.5) % (w + 100)) - 50;
            ctx.beginPath();
            ctx.moveTo(rx, groundY + 15 + i * 10);
            ctx.quadraticCurveTo(rx + 30, groundY + 10 + i * 10, rx + 60, groundY + 15 + i * 10);
            ctx.stroke();
        }
    } else if (baseBiome === 'snow') {
        // Snow mounds
        ctx.fillStyle = 'rgba(200,210,220,0.15)';
        for (let i = 0; i < 5; i++) {
            const sx = ((i * 100 + 30 - scrollX * 0.3) % (w + 80)) - 40;
            ctx.beginPath();
            ctx.arc(sx, groundY + 15, 20, Math.PI, 0);
            ctx.fill();
        }
    } else if (baseBiome === 'volcanic') {
        // Lava cracks
        ctx.strokeStyle = 'rgba(255,80,0,0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const lx = ((i * 110 - scrollX * 0.6) % (w + 100)) - 50;
            ctx.beginPath();
            ctx.moveTo(lx, groundY + 8);
            ctx.lineTo(lx + 15, groundY + 18);
            ctx.lineTo(lx + 30, groundY + 12);
            ctx.stroke();
        }
    } else if (baseBiome === 'cave') {
        // Scattered rubble / small rocks
        ctx.fillStyle = 'rgba(80,80,100,0.2)';
        for (let i = 0; i < 6; i++) {
            const rx = ((i * 70 + 15 - scrollX * 0.4) % (w + 60)) - 30;
            ctx.beginPath();
            ctx.moveTo(rx, groundY + 5);
            ctx.lineTo(rx + 5, groundY + 2);
            ctx.lineTo(rx + 10, groundY + 4);
            ctx.lineTo(rx + 8, groundY + 8);
            ctx.lineTo(rx + 2, groundY + 8);
            ctx.closePath();
            ctx.fill();
        }
    } else if (baseBiome === 'graveyard') {
        // Sparse dead grass + ground cracks
        ctx.strokeStyle = 'rgba(100,100,80,0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const gx = ((i * 65 + 10 - scrollX * 0.5) % (w + 50)) - 25;
            ctx.beginPath();
            ctx.moveTo(gx, groundY + 3);
            ctx.lineTo(gx - 2, groundY - 5);
            ctx.moveTo(gx + 4, groundY + 3);
            ctx.lineTo(gx + 6, groundY - 4);
            ctx.stroke();
        }
    } else if (baseBiome === 'mountain') {
        // Loose gravel / pebble path
        ctx.fillStyle = 'rgba(120,110,100,0.2)';
        for (let i = 0; i < 8; i++) {
            const mx = ((i * 50 + 8 - scrollX * 0.6) % (w + 40)) - 20;
            ctx.beginPath();
            ctx.arc(mx, groundY + 6 + (i % 3) * 4, 2 + (i % 2), 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // Generic grass tufts (plains, forest)
        ctx.strokeStyle = 'rgba(80,120,40,0.25)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) {
            const gx = ((i * 55 + 10 - scrollX) % (w + 40)) - 20;
            ctx.beginPath();
            ctx.moveTo(gx, groundY + 2);
            ctx.lineTo(gx - 3, groundY - 6);
            ctx.moveTo(gx + 2, groundY + 2);
            ctx.lineTo(gx + 5, groundY - 5);
            ctx.stroke();
        }
    }
}


// ═══════════════════════════════════════════
// WALKING FIGURE
// ═══════════════════════════════════════════

function _drawWalkingFigure(ctx, cx, groundY, frame, elapsed) {
    const y = groundY;
    const bob = Math.sin(elapsed * 0.012) * 2;
    const s = 1.2; // scale

    ctx.save();
    ctx.translate(cx, y + bob);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs (alternating walk frames)
    ctx.fillStyle = '#3a3040';
    const legSwing = Math.sin(elapsed * 0.01) * 4;
    // Left leg
    ctx.beginPath();
    ctx.moveTo(-3 * s, -2 * s);
    ctx.lineTo((-3 + legSwing * 0.5) * s, -12 * s);
    ctx.lineTo((-1 + legSwing * 0.5) * s, -12 * s);
    ctx.lineTo(-1 * s, -2 * s);
    ctx.fill();
    // Right leg
    ctx.beginPath();
    ctx.moveTo(1 * s, -2 * s);
    ctx.lineTo((1 - legSwing * 0.5) * s, -12 * s);
    ctx.lineTo((3 - legSwing * 0.5) * s, -12 * s);
    ctx.lineTo(3 * s, -2 * s);
    ctx.fill();

    // Torso
    ctx.fillStyle = '#4a3a50';
    ctx.beginPath();
    ctx.moveTo(-5 * s, -12 * s);
    ctx.lineTo(-6 * s, -24 * s);
    ctx.lineTo(6 * s, -24 * s);
    ctx.lineTo(5 * s, -12 * s);
    ctx.closePath();
    ctx.fill();

    // Cloak / back detail
    ctx.fillStyle = '#3a2a40';
    ctx.beginPath();
    ctx.moveTo(-4 * s, -20 * s);
    ctx.lineTo(-7 * s, -8 * s + legSwing);
    ctx.lineTo(0, -10 * s);
    ctx.closePath();
    ctx.fill();

    // Arms swinging
    const armSwing = Math.sin(elapsed * 0.01) * 3;
    ctx.strokeStyle = '#3a3040';
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(-6 * s, -22 * s);
    ctx.lineTo((-5 - armSwing) * s, -14 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6 * s, -22 * s);
    ctx.lineTo((5 + armSwing) * s, -14 * s);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#d4b896';
    ctx.beginPath();
    ctx.arc(0, -27 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();

    // Hood / hair
    ctx.fillStyle = '#3a2a30';
    ctx.beginPath();
    ctx.arc(0, -28 * s, 4.5 * s, Math.PI, 0);
    ctx.fill();

    // Gold aura pulse
    const auraPulse = 0.3 + Math.sin(elapsed * 0.003) * 0.15;
    ctx.strokeStyle = `rgba(196,149,58,${auraPulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -15 * s, 10 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}


// ═══════════════════════════════════════════
// PARTICLES
// ═══════════════════════════════════════════

function _createTravelParticle(cfg, w, h) {
    const p = {
        x: Math.random() * w * 1.2 - w * 0.1,
        y: Math.random() * h,
        size: 2 + Math.random() * 3,
        speed: 10 + Math.random() * 20,
        phase: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        type: cfg.type,
        color: cfg.color,
    };
    return p;
}

function _updateTravelParticles(ctx, particles, cfg, w, h, elapsed) {
    const dt = 0.016; // ~60fps
    for (const p of particles) {
        switch (p.type) {
            case 'leaf':
                p.x -= p.speed * dt * 2;
                p.y += p.speed * dt;
                p.rotation += dt * 2;
                if (p.y > h || p.x < -20) {
                    p.x = w + 20;
                    p.y = Math.random() * h * 0.6;
                }
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                break;

            case 'snow':
                p.x += Math.sin(elapsed * 0.001 + p.phase) * 0.5;
                p.y += p.speed * dt;
                if (p.y > h) {
                    p.y = -5;
                    p.x = Math.random() * w;
                }
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'ember':
                p.x += (Math.random() - 0.5) * 2;
                p.y -= p.speed * dt * 0.8;
                if (p.y < 0) {
                    p.y = h * 0.8 + Math.random() * h * 0.2;
                    p.x = Math.random() * w;
                }
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'wisp':
                p.x -= p.speed * dt * 1.5;
                p.y += Math.sin(elapsed * 0.001 + p.phase) * 0.3;
                if (p.x < -30) {
                    p.x = w + 30;
                    p.y = h * 0.5 + Math.random() * h * 0.3;
                }
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, p.size * 3, p.size, 0, 0, Math.PI * 2);
                ctx.fill();
                break;

            default: // mist
                p.x -= p.speed * dt * 0.3;
                if (p.x < -60) {
                    p.x = w + 60;
                    p.y = Math.random() * h;
                }
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, p.size * 8, p.size * 4, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    }
}


// ═══════════════════════════════════════════
// TEXT OVERLAY
// ═══════════════════════════════════════════

function _drawTravelText(ctx, regionName, icon, w, h, alpha) {
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Region icon
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(icon, w / 2, h * 0.18);

    // Region name
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#c4953a';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(regionName, w / 2, h * 0.25);

    // Subtitle
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#8a8090';
    ctx.shadowBlur = 4;
    ctx.fillText('Viajando...', w / 2, h * 0.30);

    ctx.restore();
}

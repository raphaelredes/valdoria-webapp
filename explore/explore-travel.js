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

    // Generate terrain features (3 layers for deep parallax)
    const farFeatures = _generateFeatures(cfg.silhouette, w, 14);
    const midFeatures = _generateFeatures(cfg.silhouette, w, 10);
    const nearFeatures = _generateFeatures(cfg.silhouette, w, 6);

    // Generate footprint trail positions
    const footprints = [];
    for (let i = 0; i < 8; i++) {
        footprints.push({
            baseX: w * 0.5 - (i + 1) * 28 + (i % 2 === 0 ? 4 : -4),
            y: 0, // set per frame
            alpha: 0.5 - i * 0.06,
            side: i % 2, // alternating left/right
        });
    }

    // Player walk cycle state
    let walkFrame = 0;

    overlay.classList.add('active');

    let _done = false;
    const startTime = performance.now();
    const DURATION = 3500;

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

        // Background gradient (sky → horizon → ground)
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, cfg.bg[0]);
        grad.addColorStop(0.45, cfg.bg[1]);
        grad.addColorStop(0.7, cfg.ground);
        grad.addColorStop(1, cfg.ground);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Far terrain layer (very slow parallax — distant mountains/trees)
        const farOffset = elapsed * 0.012;
        _drawTerrainLayer(ctx, farFeatures, w, h, 0.40, cfg.farColor, farOffset, cfg.silhouette);

        // Mid terrain layer (medium parallax)
        const midOffset = elapsed * 0.035;
        _drawTerrainLayer(ctx, midFeatures, w, h, 0.55, cfg.midColor, midOffset, cfg.silhouette);

        // Near terrain layer (fast parallax — closest vegetation)
        const nearOffset = elapsed * 0.07;
        const nearColor = _blendColor(cfg.midColor, cfg.ground, 0.5);
        _drawTerrainLayer(ctx, nearFeatures, w, h, 0.68, nearColor, nearOffset, cfg.silhouette);

        // Ground plane
        const groundY = h * 0.72;
        ctx.fillStyle = cfg.ground;
        ctx.fillRect(0, groundY, w, h - groundY);

        // Scrolling road/path under character
        _drawRoadPath(ctx, w, h, groundY, elapsed, biome);

        // Ground line (horizon)
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(w, groundY);
        ctx.stroke();

        // Biome-specific ground details
        _drawGroundDetails(ctx, biome, w, h, groundY, elapsed);

        // Footprint trail behind character
        _drawFootprints(ctx, footprints, groundY, elapsed, biome);

        // Torch/lantern glow around character
        _drawCharacterGlow(ctx, w * 0.5, groundY, elapsed, biome);

        // Walking player (center, larger)
        walkFrame = Math.floor(elapsed / 200) % 4;
        _drawWalkingFigure(ctx, w * 0.5, groundY, walkFrame, elapsed);

        // Particles
        _updateTravelParticles(ctx, particles, pcfg, w, h, elapsed);

        // Text (fade in first 400ms) — medieval fonts
        const textAlpha = Math.min(1, elapsed / 400);
        _drawTravelText(ctx, regionName, cfg.icon, w, h, textAlpha);

        // Travel progress bar
        _drawProgressBar(ctx, w, h, progress);

        // Fade out last 400ms
        if (progress > 0.88) {
            const fadeOut = (progress - 0.88) / 0.12;
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

// Hood physics state (verlet cloth simulation)
const _hood = { pts: null, prevAnchorX: 0, prevAnchorY: 0 };
const HOOD_N = 10;
const HOOD_SEG = 7;  // segment length in px

function _updateHood(anchorX, anchorY, wind, bob) {
    // Initialize chain on first call
    if (!_hood.pts) {
        _hood.pts = [];
        for (let i = 0; i < HOOD_N; i++) {
            const x = anchorX - i * HOOD_SEG * 0.8;
            const y = anchorY + i * HOOD_SEG * 0.3;
            _hood.pts.push({ x, y, ox: x, oy: y });
        }
        _hood.prevAnchorX = anchorX;
        _hood.prevAnchorY = anchorY;
    }

    // Head movement delta → inertia on free points
    const hdx = anchorX - _hood.prevAnchorX;
    const hdy = anchorY - _hood.prevAnchorY;
    _hood.prevAnchorX = anchorX;
    _hood.prevAnchorY = anchorY;

    // Pin anchor (back-top of head)
    const p0 = _hood.pts[0];
    p0.x = anchorX; p0.y = anchorY;
    p0.ox = anchorX; p0.oy = anchorY;

    // Verlet integration for free points
    for (let i = 1; i < HOOD_N; i++) {
        const pt = _hood.pts[i];
        let vx = (pt.x - pt.ox) * 0.965; // damping
        let vy = (pt.y - pt.oy) * 0.965;
        pt.ox = pt.x;
        pt.oy = pt.y;
        // Gravity (pulls hood down)
        vy += 0.12;
        // Wind (same as cape/environment wind)
        vx += wind * 0.025;
        // Inertia from walking (opposite to head movement)
        vx -= hdx * 0.4;
        vy -= hdy * 0.15;
        // Tiny turbulence for organic feel
        vx += (Math.random() - 0.5) * 0.15;
        pt.x += vx;
        pt.y += vy;
    }

    // Distance constraints (Jakobsen method)
    for (let iter = 0; iter < 6; iter++) {
        for (let i = 0; i < HOOD_N - 1; i++) {
            const a = _hood.pts[i], b = _hood.pts[i + 1];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
            const diff = (dist - HOOD_SEG) / dist;
            if (i === 0) {
                // Anchor is fixed — only move b
                b.x -= dx * diff;
                b.y -= dy * diff;
            } else {
                const h = diff * 0.5;
                a.x += dx * h; a.y += dy * h;
                b.x -= dx * h; b.y -= dy * h;
            }
        }
    }

    return _hood.pts;
}

function _drawHood(ctx, headCX, headCY, headR, pts, s) {
    const cHood = '#4a2030';
    const cHoodDark = '#3a1525';

    // --- Static hood covering head (top + back arc) ---
    ctx.fillStyle = cHood;
    ctx.beginPath();
    // Start at forehead
    ctx.moveTo(headCX + headR * 0.5, headCY);
    // Arc over the top of head
    ctx.arc(headCX, headCY, headR + 2 * s, -0.3, -Math.PI + 0.1, true);
    // Down to first chain point
    ctx.lineTo(pts[0].x, pts[0].y);
    // Back up to the ear area
    ctx.lineTo(headCX - headR * 0.2, headCY + headR * 0.3);
    ctx.closePath();
    ctx.fill();

    // --- Physics-driven hood tail (tapered shape along chain) ---
    if (pts.length < 3) return;

    // Outer edge (wider)
    const outerPts = [];
    for (let i = 0; i < pts.length; i++) {
        const t = i / (pts.length - 1); // 0→1
        const width = (1 - t * 0.7) * 5 * s; // tapers from 10px to 3px
        // Perpendicular offset
        const nx = (i < pts.length - 1) ? pts[i + 1].y - pts[i].y : pts[i].y - pts[i - 1].y;
        const ny = (i < pts.length - 1) ? -(pts[i + 1].x - pts[i].x) : -(pts[i].x - pts[i - 1].x);
        const len = Math.sqrt(nx * nx + ny * ny) || 1;
        outerPts.push({ x: pts[i].x + (nx / len) * width, y: pts[i].y + (ny / len) * width });
    }

    // Inner edge (narrower)
    const innerPts = [];
    for (let i = 0; i < pts.length; i++) {
        const t = i / (pts.length - 1);
        const width = (1 - t * 0.7) * 2.5 * s; // narrower inner edge
        const nx = (i < pts.length - 1) ? pts[i + 1].y - pts[i].y : pts[i].y - pts[i - 1].y;
        const ny = (i < pts.length - 1) ? -(pts[i + 1].x - pts[i].x) : -(pts[i].x - pts[i - 1].x);
        const len = Math.sqrt(nx * nx + ny * ny) || 1;
        innerPts.push({ x: pts[i].x - (nx / len) * width, y: pts[i].y - (ny / len) * width });
    }

    // Draw tail as filled shape
    ctx.fillStyle = cHood;
    ctx.beginPath();
    ctx.moveTo(outerPts[0].x, outerPts[0].y);
    for (let i = 1; i < outerPts.length; i++) {
        ctx.lineTo(outerPts[i].x, outerPts[i].y);
    }
    // Tip
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    // Inner edge (reverse)
    for (let i = innerPts.length - 1; i >= 0; i--) {
        ctx.lineTo(innerPts[i].x, innerPts[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Darker inner stripe for depth
    ctx.fillStyle = cHoodDark;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    for (let i = innerPts.length - 1; i >= 0; i--) ctx.lineTo(innerPts[i].x, innerPts[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;
}

// Helper: draw a tapered limb segment with bezier contour + gradient
function _taperedLimb(ctx, x1, y1, x2, y2, w1, w2, baseColor, highlightColor) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // Perpendicular unit vector
    const px = -dy / len, py = dx / len;
    // Four corners of tapered quad
    const ax = x1 + px * w1, ay = y1 + py * w1;
    const bx = x1 - px * w1, by = y1 - py * w1;
    const cx2 = x2 + px * w2, cy2 = y2 + py * w2;
    const dx2 = x2 - px * w2, dy2 = y2 - py * w2;
    // Midpoints for bezier control (slight outward bow for organic shape)
    const mx = (x1 + x2) * 0.5, my = (y1 + y2) * 0.5;
    const bow = 0.8; // subtle curve outward

    // Gradient across the limb width for volume
    const grad = ctx.createLinearGradient(
        mx + px * w1, my + py * w1,
        mx - px * w1, my - py * w1
    );
    grad.addColorStop(0, highlightColor);
    grad.addColorStop(0.5, baseColor);
    grad.addColorStop(1, highlightColor);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(mx + px * bow, my + py * bow, cx2, cy2);
    ctx.lineTo(dx2, dy2);
    ctx.quadraticCurveTo(mx - px * bow, my - py * bow, bx, by);
    ctx.closePath();
    ctx.fill();
}

// Helper: draw a boot shape
function _drawBoot(ctx, ax, ay, footH, s, angle, lifting) {
    ctx.save();
    ctx.translate(ax, ay);
    if (lifting) ctx.rotate(angle);
    const bw = 5 * s, bh = footH;
    // Boot shape: heel, sole, toe cap
    ctx.fillStyle = '#2a1e14';
    ctx.beginPath();
    ctx.moveTo(-2 * s, 0);                          // top back
    ctx.lineTo(-2.5 * s, bh * 0.3);                 // heel bump
    ctx.lineTo(-2 * s, bh);                          // sole back
    ctx.lineTo(bw + 1 * s, bh);                      // sole front
    ctx.quadraticCurveTo(bw + 3 * s, bh * 0.5, bw, 0); // toe cap (rounded)
    ctx.closePath();
    ctx.fill();
    // Sole highlight
    ctx.strokeStyle = '#1a1208';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2 * s, bh);
    ctx.lineTo(bw + 1 * s, bh);
    ctx.stroke();
    // Leather sheen
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.quadraticCurveTo(bw * 0.5, -1, bw, 1);
    ctx.stroke();
    ctx.restore();
}

function _drawWalkingFigure(ctx, cx, groundY, frame, elapsed) {
    const s = 2.0;
    const headR = 8 * s, torsoH = 30 * s, thighL = 22 * s, shinL = 20 * s;
    const footH = 4 * s, armLen = 20 * s;
    const hipY = -(footH + shinL + thighL);
    const shY  = hipY - torsoH;
    const hdY  = shY - 3 * s - headR;

    // Walk cycle (UNTOUCHED)
    const p = elapsed * 0.006;
    const bob = Math.sin(p * 2) * 1.0;
    const rN = Math.sin(p), rF = Math.sin(p + Math.PI);
    const sw = 0.38;
    const lN = rN * sw, lF = rF * sw;
    const kN = rN < -0.1 ? -Math.pow(Math.abs(rN), 1.2) * 0.6 : 0;
    const kF = rF < -0.1 ? -Math.pow(Math.abs(rF), 1.2) * 0.6 : 0;
    const aN = Math.sin(p + Math.PI) * 0.22, aF = Math.sin(p) * 0.22;
    const wind = Math.sin(elapsed * 0.002) * 2;

    ctx.save();
    ctx.translate(cx, groundY + bob);

    // Colors
    const cN = '#5a4535', cNhi = '#6b5645';  // near + highlight
    const cF = '#443525', cFhi = '#554535';  // far + highlight

    // Head Y (with micro-bob)
    const hy = hdY + Math.sin(p * 2 - 0.3) * 0.5;

    // Update hood physics
    const hoodAnchorX = -headR * 0.65;
    const hoodAnchorY = hy - headR * 0.55;
    const hoodPts = _updateHood(hoodAnchorX, hoodAnchorY, wind, bob);

    // === SHADOW ===
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 16 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // === LEG HELPER (tapered limbs + shaped boots) ===
    function leg(a, kb, baseC, hiC, isFar) {
        const kx = Math.sin(a) * thighL, ky = hipY + Math.cos(a) * thighL;
        const sa = a + kb;
        const ax = kx + Math.sin(sa) * shinL, ay = ky + Math.cos(sa) * shinL;
        // Thigh (wider at hip, narrower at knee)
        const tw1 = isFar ? 4.5 * s : 5 * s;
        const tw2 = isFar ? 3 * s : 3.5 * s;
        _taperedLimb(ctx, 0, hipY, kx, ky, tw1 * 0.5, tw2 * 0.5, baseC, hiC);
        // Shin (wider at knee, narrower at ankle)
        _taperedLimb(ctx, kx, ky, ax, ay, tw2 * 0.5, 2 * s * 0.5, baseC, hiC);
        // Boot
        const lifting = a < 0;
        _drawBoot(ctx, ax, ay, footH, s, lifting ? Math.abs(kb) * 0.5 : 0, lifting);
    }

    // === CAPE (multi-layer flowing cloak behind everything) ===
    // Outer cloak layer
    ctx.fillStyle = '#4a2030';
    ctx.beginPath();
    ctx.moveTo(-2 * s, shY + 2 * s);  // upper back
    ctx.bezierCurveTo(
        (-10 + wind * 0.5) * s, shY + torsoH * 0.4,
        (-12 + wind) * s, hipY + thighL * 0.2,
        (-6 + wind) * s, hipY + thighL * 0.5
    );
    ctx.lineTo((-3 + wind * 0.3) * s, hipY + thighL * 0.55);
    ctx.bezierCurveTo(
        (-8 + wind * 0.3) * s, hipY,
        -3 * s, shY + torsoH * 0.6,
        -1 * s, shY + 4 * s
    );
    ctx.closePath();
    ctx.fill();
    // Inner lining (visible at edge)
    ctx.fillStyle = '#5a2838';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(-1 * s, shY + 6 * s);
    ctx.bezierCurveTo(
        -5 * s, hipY * 0.7,
        (-7 + wind * 0.5) * s, hipY + thighL * 0.1,
        (-4 + wind * 0.5) * s, hipY + thighL * 0.45
    );
    ctx.lineTo(-2 * s, hipY + thighL * 0.3);
    ctx.bezierCurveTo(-4 * s, hipY, -2 * s, shY + torsoH * 0.5, -1 * s, shY + 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // === HOOD TAIL (behind head, in front of cape) ===
    _drawHood(ctx, 0, hy, headR, hoodPts, s);

    // === FAR LEG ===
    leg(lF, kF, cF, cFhi, true);

    // === FAR ARM (tapered) ===
    const afx = Math.sin(aF) * armLen, afy = shY + 2 * s + Math.cos(aF) * armLen;
    _taperedLimb(ctx, 0, shY + 2 * s, afx, afy, 2.5 * s * 0.5, 1.8 * s * 0.5, cF, cFhi);
    // Far hand
    ctx.fillStyle = '#3e2e1e';
    ctx.beginPath(); ctx.arc(afx, afy, 1.5 * s, 0, Math.PI * 2); ctx.fill();

    // === TORSO (shaped tunic with gradient) ===
    const tGrad = ctx.createLinearGradient(0, shY, 0, shY + torsoH);
    tGrad.addColorStop(0, '#6b5645');    // lighter at shoulders
    tGrad.addColorStop(0.5, '#5a4535');  // base mid
    tGrad.addColorStop(1, '#4a3525');    // darker at waist
    ctx.fillStyle = tGrad;
    ctx.beginPath();
    const shoulderW = 6 * s, waistW = 4.5 * s, hipW = 5.5 * s;
    ctx.moveTo(-shoulderW, shY);                                    // left shoulder
    ctx.lineTo(shoulderW, shY);                                     // right shoulder
    ctx.bezierCurveTo(shoulderW, shY + torsoH * 0.3,               // taper to waist
        waistW, shY + torsoH * 0.5,
        waistW, shY + torsoH * 0.5);
    ctx.bezierCurveTo(waistW, shY + torsoH * 0.7,                  // flare to hip
        hipW, shY + torsoH * 0.9,
        hipW, shY + torsoH);
    ctx.lineTo(-hipW, shY + torsoH);                                // bottom left
    ctx.bezierCurveTo(-hipW, shY + torsoH * 0.9,                   // flare
        -waistW, shY + torsoH * 0.7,
        -waistW, shY + torsoH * 0.5);
    ctx.bezierCurveTo(-waistW, shY + torsoH * 0.5,                 // taper
        -shoulderW, shY + torsoH * 0.3,
        -shoulderW, shY);
    ctx.closePath();
    ctx.fill();
    // Belt
    const beltY = shY + torsoH * 0.55;
    ctx.strokeStyle = '#6a4a20';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(-waistW + 1, beltY);
    ctx.lineTo(waistW - 1, beltY);
    ctx.stroke();
    // Belt buckle
    ctx.fillStyle = '#c4953a';
    ctx.beginPath();
    ctx.arc(0, beltY, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    // Volume shading (darker on far side)
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.moveTo(-shoulderW, shY);
    ctx.lineTo(-waistW * 0.3, shY);
    ctx.bezierCurveTo(-waistW * 0.3, shY + torsoH * 0.5,
        -hipW * 0.3, shY + torsoH * 0.9,
        -hipW * 0.3, shY + torsoH);
    ctx.lineTo(-hipW, shY + torsoH);
    ctx.bezierCurveTo(-hipW, shY + torsoH * 0.9,
        -waistW, shY + torsoH * 0.7,
        -waistW, shY + torsoH * 0.5);
    ctx.bezierCurveTo(-waistW, shY + torsoH * 0.5,
        -shoulderW, shY + torsoH * 0.3,
        -shoulderW, shY);
    ctx.closePath();
    ctx.fill();

    // === NEAR LEG ===
    leg(lN, kN, cN, cNhi, false);

    // === NEAR ARM + STAFF ===
    const ahx = Math.sin(aN) * armLen, ahy = shY + 2 * s + Math.cos(aN) * armLen;
    _taperedLimb(ctx, 0, shY + 2 * s, ahx, ahy, 3 * s * 0.5, 2 * s * 0.5, cN, cNhi);

    // Staff (tapered with wood grain)
    const staffTopX = ahx + 1 * s, staffTopY = ahy - 4 * s;
    const staffBotX = ahx + 3 * s, staffBotY = 4 * s;
    const sGrad = ctx.createLinearGradient(staffTopX, staffTopY, staffBotX, staffBotY);
    sGrad.addColorStop(0, '#8a6a30');
    sGrad.addColorStop(0.3, '#6a4a20');
    sGrad.addColorStop(0.7, '#5a3a18');
    sGrad.addColorStop(1, '#7a5a28');
    // Tapered staff body
    _taperedLimb(ctx, staffTopX, staffTopY, staffBotX, staffBotY,
        1.2 * s * 0.5, 1.8 * s * 0.5, '#6a4a20', '#8a6a30');

    // Staff orb (radial gradient + glow)
    const gl = 0.4 + Math.sin(elapsed * 0.005) * 0.2;
    ctx.save();
    ctx.shadowColor = `rgba(196,149,58,${gl * 0.8})`;
    ctx.shadowBlur = 6 * s;
    const orbGrad = ctx.createRadialGradient(
        staffTopX, staffTopY, 0,
        staffTopX, staffTopY, 2.5 * s
    );
    orbGrad.addColorStop(0, `rgba(255,220,120,${gl + 0.2})`);
    orbGrad.addColorStop(0.5, `rgba(196,149,58,${gl})`);
    orbGrad.addColorStop(1, `rgba(196,149,58,0)`);
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(staffTopX, staffTopY, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Near hand (gripping staff)
    ctx.fillStyle = '#4a3828';
    ctx.beginPath(); ctx.arc(ahx, ahy, 1.8 * s, 0, Math.PI * 2); ctx.fill();

    // === HEAD ===
    ctx.fillStyle = '#3e2e1e';
    ctx.beginPath(); ctx.arc(0, hy, headR, 0, Math.PI * 2); ctx.fill();

    // === HOOD COVERING (on top of head) ===
    const cHood = '#4a2030';
    ctx.fillStyle = cHood;
    ctx.beginPath();
    ctx.moveTo(headR * 0.55, hy + headR * 0.15);
    ctx.arc(0, hy, headR + 2 * s, -0.15, -Math.PI + 0.15, true);
    ctx.lineTo(hoodPts[0].x, hoodPts[0].y);
    ctx.lineTo(-headR * 0.15, hy + headR * 0.35);
    ctx.closePath();
    ctx.fill();

    // Hood depth shadow (dark interior)
    const hoodShadow = ctx.createRadialGradient(
        headR * 0.2, hy, headR * 0.2,
        headR * 0.2, hy, headR * 0.9
    );
    hoodShadow.addColorStop(0, 'rgba(10,5,2,0.6)');
    hoodShadow.addColorStop(1, 'rgba(10,5,2,0)');
    ctx.fillStyle = hoodShadow;
    ctx.beginPath();
    ctx.arc(headR * 0.1, hy + headR * 0.05, headR * 0.8, -0.5, 0.8);
    ctx.arc(headR * 0.1, hy + headR * 0.05, headR * 0.2, 0.8, -0.5, true);
    ctx.closePath();
    ctx.fill();

    // Hood brim shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(0, hy, headR + 2 * s, -0.15, -0.9, true);
    ctx.arc(0, hy, headR, -0.9, -0.15, false);
    ctx.closePath();
    ctx.fill();

    // Hood brim highlight (material thickness)
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, hy, headR + 2.5 * s, -0.2, -Math.PI + 0.2, true);
    ctx.stroke();

    // Eyes (two glowing dots under hood)
    ctx.save();
    const eyeGlow = 0.35 + Math.sin(elapsed * 0.004) * 0.15;
    ctx.shadowColor = `rgba(196,149,58,${eyeGlow * 0.6})`;
    ctx.shadowBlur = 3 * s;
    ctx.fillStyle = `rgba(196,149,58,${eyeGlow})`;
    ctx.beginPath();
    ctx.arc(headR * 0.25, hy + headR * 0.0, 1.1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headR * 0.55, hy + headR * 0.05, 1.0 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Chin/jaw hint (subtle)
    ctx.strokeStyle = 'rgba(62,46,30,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(headR * 0.3, hy + headR * 0.5, headR * 0.45, 0.3, 1.8);
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

    // Region name — medieval display font
    ctx.font = "700 22px 'Cinzel', 'MedievalSharp', serif";
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c4953a';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 10;
    ctx.fillText(regionName, w / 2, h * 0.22);

    // Decorative divider under name
    ctx.shadowBlur = 0;
    const dw = Math.min(180, ctx.measureText(regionName).width + 40);
    const dy = h * 0.25;
    ctx.strokeStyle = 'rgba(196,149,58,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - dw / 2, dy);
    ctx.lineTo(w / 2 - 8, dy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w / 2 + 8, dy);
    ctx.lineTo(w / 2 + dw / 2, dy);
    ctx.stroke();
    // Center diamond
    ctx.fillStyle = 'rgba(196,149,58,0.5)';
    ctx.beginPath();
    ctx.moveTo(w / 2, dy - 3);
    ctx.lineTo(w / 2 + 4, dy);
    ctx.lineTo(w / 2, dy + 3);
    ctx.lineTo(w / 2 - 4, dy);
    ctx.closePath();
    ctx.fill();

    // Subtitle — italic medieval
    ctx.font = "italic 13px 'MedievalSharp', 'Cinzel', serif";
    ctx.fillStyle = 'rgba(212,200,176,0.6)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;
    ctx.fillText('Viajando...', w / 2, h * 0.29);

    ctx.restore();
}


// ═══════════════════════════════════════════
// NEW VISUAL SYSTEMS
// ═══════════════════════════════════════════

// Blend two hex colors
function _blendColor(hex1, hex2, factor) {
    const r1 = parseInt(hex1.slice(1, 3), 16), g1 = parseInt(hex1.slice(3, 5), 16), b1 = parseInt(hex1.slice(5, 7), 16);
    const r2 = parseInt(hex2.slice(1, 3), 16), g2 = parseInt(hex2.slice(3, 5), 16), b2 = parseInt(hex2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    return `rgb(${r},${g},${b})`;
}

// Scrolling road/path under the character
function _drawRoadPath(ctx, w, h, groundY, elapsed, biome) {
    const baseBiome = biome.startsWith('dungeon_') ? biome.slice(8) : biome;
    const scrollX = elapsed * 0.08;
    const pathY = groundY + 4;

    ctx.save();

    if (baseBiome === 'desert') {
        // Sandy trail — subtle tire-width marks
        ctx.fillStyle = 'rgba(180,160,100,0.12)';
        ctx.fillRect(0, pathY - 2, w, 18);
        ctx.strokeStyle = 'rgba(140,120,70,0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 12; i++) {
            const sx = ((i * 50 - scrollX) % (w + 60)) - 30;
            ctx.beginPath();
            ctx.moveTo(sx, pathY + 3);
            ctx.lineTo(sx + 20, pathY + 5);
            ctx.stroke();
        }
    } else if (baseBiome === 'snow') {
        // Snow-packed trail
        ctx.fillStyle = 'rgba(200,210,225,0.08)';
        ctx.fillRect(0, pathY - 1, w, 16);
        // Boot prints in snow
        ctx.fillStyle = 'rgba(160,170,185,0.12)';
        for (let i = 0; i < 8; i++) {
            const bx = ((i * 55 + (i % 2) * 8 - scrollX) % (w + 60)) - 30;
            ctx.beginPath();
            ctx.ellipse(bx, pathY + 7, 4, 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (baseBiome === 'volcanic') {
        // Cracked obsidian path
        ctx.fillStyle = 'rgba(60,30,10,0.2)';
        ctx.fillRect(0, pathY - 1, w, 14);
        ctx.strokeStyle = 'rgba(255,60,0,0.12)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 6; i++) {
            const cx = ((i * 70 - scrollX * 0.7) % (w + 80)) - 40;
            ctx.beginPath();
            ctx.moveTo(cx, pathY + 2);
            ctx.lineTo(cx + 12, pathY + 8);
            ctx.lineTo(cx + 25, pathY + 5);
            ctx.stroke();
        }
    } else if (baseBiome === 'cave') {
        // Stone floor path
        ctx.fillStyle = 'rgba(60,60,80,0.15)';
        ctx.fillRect(0, pathY - 1, w, 14);
    } else {
        // Default: worn dirt path with grass edges
        ctx.fillStyle = 'rgba(100,80,50,0.15)';
        ctx.fillRect(0, pathY - 2, w, 18);
        // Path edge stones
        ctx.fillStyle = 'rgba(80,70,50,0.12)';
        for (let i = 0; i < 10; i++) {
            const sx = ((i * 45 + 10 - scrollX * 0.6) % (w + 50)) - 25;
            ctx.beginPath();
            ctx.arc(sx, pathY - 1, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sx + 8, pathY + 17, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

// Footprint trail behind the character
function _drawFootprints(ctx, footprints, groundY, elapsed, biome) {
    const scrollX = elapsed * 0.08;
    const baseBiome = biome.startsWith('dungeon_') ? biome.slice(8) : biome;

    // Skip footprints on certain biomes
    if (baseBiome === 'volcanic' || baseBiome === 'cave') return;

    ctx.save();
    for (const fp of footprints) {
        const x = fp.baseX - (scrollX % 28) * 0.3;
        const y = groundY + 8 + fp.side * 3;
        const a = fp.alpha * (0.5 + Math.sin(elapsed * 0.001) * 0.1);
        if (a <= 0.02) continue;

        if (baseBiome === 'snow') {
            ctx.fillStyle = `rgba(180,190,200,${a * 0.6})`;
        } else if (baseBiome === 'desert') {
            ctx.fillStyle = `rgba(160,140,90,${a * 0.5})`;
        } else if (baseBiome === 'swamp') {
            ctx.fillStyle = `rgba(60,80,50,${a * 0.4})`;
        } else {
            ctx.fillStyle = `rgba(80,60,40,${a * 0.5})`;
        }

        ctx.beginPath();
        ctx.ellipse(x, y, 3.5, 1.8, fp.side ? 0.15 : -0.15, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// Torch/lantern ambient glow around the character
function _drawCharacterGlow(ctx, cx, groundY, elapsed, biome) {
    const baseBiome = biome.startsWith('dungeon_') ? biome.slice(8) : biome;
    const isDungeon = biome.startsWith('dungeon_');

    // Stronger glow in dark biomes
    let glowAlpha, glowRadius, glowColor;
    if (isDungeon || baseBiome === 'cave') {
        glowAlpha = 0.2 + Math.sin(elapsed * 0.004) * 0.06;
        glowRadius = 80;
        glowColor = '196,149,58';
    } else if (baseBiome === 'graveyard') {
        glowAlpha = 0.12 + Math.sin(elapsed * 0.003) * 0.04;
        glowRadius = 60;
        glowColor = '160,180,200';
    } else if (baseBiome === 'volcanic') {
        glowAlpha = 0.15 + Math.sin(elapsed * 0.005) * 0.05;
        glowRadius = 70;
        glowColor = '255,120,40';
    } else {
        glowAlpha = 0.08 + Math.sin(elapsed * 0.003) * 0.03;
        glowRadius = 50;
        glowColor = '196,149,58';
    }

    const cy = groundY - 20;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    grad.addColorStop(0, `rgba(${glowColor},${glowAlpha})`);
    grad.addColorStop(0.5, `rgba(${glowColor},${glowAlpha * 0.4})`);
    grad.addColorStop(1, `rgba(${glowColor},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, glowRadius, glowRadius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
}

// Travel progress bar at the bottom (above skip button area)
function _drawProgressBar(ctx, w, h, progress) {
    const barW = w * 0.5;
    const barH = 3;
    const barX = (w - barW) / 2;
    // Position above the skip button (which sits at bottom: 40px, ~76px tall)
    const barY = h - 130;

    ctx.save();

    // Background track
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 2);
    ctx.fill();

    // Filled portion
    const fillW = barW * progress;
    if (fillW > 0) {
        const grad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
        grad.addColorStop(0, 'rgba(196,149,58,0.5)');
        grad.addColorStop(1, 'rgba(196,149,58,0.8)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(barX, barY, fillW, barH, 2);
        ctx.fill();
    }

    // Leading dot
    if (fillW > 2) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(barX + fillW, barY + barH / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

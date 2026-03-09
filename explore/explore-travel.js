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

function _drawWalkingFigure(ctx, cx, groundY, frame, elapsed) {
    // ═══════════════════════════════════════════════════════════
    // SIDE-VIEW walk cycle — based on wang-hoyer wireframe anatomy:
    // Rectangular body segments, articulated joints, wide stride.
    // Proportions: head ~12%, torso ~30%, legs ~50%, feet ~8%
    // ═══════════════════════════════════════════════════════════

    const s = 2.0; // scale factor

    // ── Proportions (wang-hoyer wireframe) ──
    const headW    = 12 * s;   // head width (side profile — prominent!)
    const headH    = 14 * s;   // head height (prominent!)
    const neckH    = 3 * s;
    const torsoH   = 28 * s;   // shoulder to hip (tall rectangle)
    const torsoW   = 14 * s;   // torso width (side profile — narrow)
    const pelvisH  = 6 * s;    // pelvis block height
    const pelvisW  = 16 * s;   // pelvis wider than torso
    const thighLen = 22 * s;   // hip to knee
    const shinLen  = 20 * s;   // knee to ankle
    const footW    = 14 * s;   // foot length
    const footH    = 5 * s;    // foot/boot height
    const upperArm = 14 * s;   // shoulder to elbow
    const foreArm  = 12 * s;   // elbow to wrist

    // Key Y positions (ground = 0, up = negative)
    const hipY      = -(footH + shinLen + thighLen);
    const shoulderY = hipY - pelvisH - torsoH;
    const headY     = shoulderY - neckH - headH * 0.5;

    // ── Walk cycle timing ──
    const walkPhase = elapsed * 0.006;

    // ── Vertical bob (triangle wave — 2 bounces per stride) ──
    const rawBob = Math.sin(walkPhase * 2);
    const bob = -Math.sign(rawBob) * Math.pow(Math.abs(rawBob), 0.7) * 4 * s;

    // ── Torso lean (very slight forward tilt) ──
    const torsoLean = -0.03 + Math.sin(walkPhase * 2) * 0.012;

    // ── Hip roll (pelvis rotates with stride) ──
    const hipRoll = Math.sin(walkPhase) * 0.04;

    // ── Leg angles ──
    const rawNear = Math.sin(walkPhase);
    const rawFar  = Math.sin(walkPhase + Math.PI);
    const hipSwing = 0.55; // wide stride like wireframe
    const legAngleNear = rawNear * hipSwing;
    const legAngleFar  = rawFar  * hipSwing;
    // Knee bends on BACK leg (push-off phase: angle < 0)
    const kneeBendNear = rawNear < -0.1 ? Math.pow(Math.abs(rawNear), 1.3) * 0.85 : 0;
    const kneeBendFar  = rawFar  < -0.1 ? Math.pow(Math.abs(rawFar),  1.3) * 0.85 : 0;

    // ── Arms counter-swing ──
    const armSwingNear = Math.sin(walkPhase + Math.PI + 0.15) * 0.38;
    const armSwingFar  = Math.sin(walkPhase + 0.15) * 0.38;

    // ── Cape wind ──
    const wind = Math.sin(elapsed * 0.002) * 2 + Math.sin(elapsed * 0.005) * 1;

    // ── Head bob (trails body slightly) ──
    const headBob = Math.sin(walkPhase * 2 - 0.3) * 1.5 * s;

    ctx.save();
    ctx.translate(cx, groundY + bob);

    // Colors — medieval adventurer, warm tones with enough contrast
    const cSkin     = '#b08060';
    const cTunic    = '#5a4030';   // main torso
    const cTunicLt  = '#6a4a38';   // lighter torso (near side)
    const cLegs     = '#3e2e20';   // leather pants (far)
    const cLegsLt   = '#4a3628';   // leather pants (near)
    const cBoot     = '#2a1e14';
    const cBootSole = '#1a1210';
    const cCape     = '#4a2030';   // burgundy cape
    const cCapeLt   = '#5a2a38';
    const cBelt     = '#8a6a30';
    const cHood     = '#4a3020';
    const cHoodDk   = '#352418';

    // ── Ground shadow ──
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 22 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // ═══ Helper: articulated leg ═══
    function _leg(angle, kneeBend, color, lw) {
        const kneeX = Math.sin(angle) * thighLen;
        const kneeY = hipY + Math.cos(angle) * thighLen;
        const shinAngle = angle + kneeBend;
        const ankleX = kneeX + Math.sin(shinAngle) * shinLen;
        const ankleY = kneeY + Math.cos(shinAngle) * shinLen;

        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        // Thigh
        ctx.beginPath();
        ctx.moveTo(0, hipY);
        ctx.lineTo(kneeX, kneeY);
        ctx.stroke();
        // Knee joint
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(kneeX, kneeY, lw * 0.35, 0, Math.PI * 2);
        ctx.fill();
        // Shin
        ctx.lineWidth = lw * 0.9;
        ctx.beginPath();
        ctx.moveTo(kneeX, kneeY);
        ctx.lineTo(ankleX, ankleY);
        ctx.stroke();

        // Boot — rectangular block
        const planted = angle > 0;
        ctx.fillStyle = cBoot;
        if (planted) {
            ctx.fillRect(ankleX - 4 * s, ankleY, footW, footH);
            ctx.fillStyle = cBootSole;
            ctx.fillRect(ankleX - 4 * s, ankleY + footH - 1.5 * s, footW, 1.5 * s);
        } else {
            // Lifted — angled slightly
            ctx.save();
            ctx.translate(ankleX, ankleY);
            ctx.rotate(kneeBend * 0.4);
            ctx.fillRect(-3 * s, 0, footW * 0.9, footH * 0.85);
            ctx.fillStyle = cBootSole;
            ctx.fillRect(-3 * s, footH * 0.85 - 1.5 * s, footW * 0.9, 1.5 * s);
            ctx.restore();
        }
    }

    // ═══ Helper: articulated arm ═══
    function _arm(sx, sy, swing, color, lw) {
        const elbowX = sx + Math.sin(swing) * upperArm;
        const elbowY = sy + Math.cos(swing) * upperArm;
        const foreAngle = swing * 0.5 + 0.25;
        const handX = elbowX + Math.sin(foreAngle) * foreArm;
        const handY = elbowY + Math.cos(foreAngle) * foreArm;

        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        // Upper arm
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(elbowX, elbowY);
        ctx.stroke();
        // Elbow
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(elbowX, elbowY, lw * 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Forearm
        ctx.lineWidth = lw * 0.85;
        ctx.beginPath();
        ctx.moveTo(elbowX, elbowY);
        ctx.lineTo(handX, handY);
        ctx.stroke();
        // Hand
        ctx.fillStyle = cSkin;
        ctx.beginPath();
        ctx.arc(handX, handY, lw * 0.35, 0, Math.PI * 2);
        ctx.fill();

        return { handX, handY };
    }

    // ═══ DRAW ORDER (painter's: back → front) ═══

    // 1. Cape (behind everything)
    ctx.save();
    ctx.rotate(torsoLean);
    ctx.fillStyle = cCape;
    ctx.beginPath();
    ctx.moveTo(-2 * s, shoulderY);
    ctx.bezierCurveTo(
        (-10 + wind * 0.4) * s, shoulderY + torsoH * 0.4,
        (-14 + wind * 0.6) * s, hipY + 6 * s,
        (-10 + wind * 0.5) * s, hipY + thighLen * 0.5
    );
    ctx.lineTo(-3 * s, hipY + thighLen * 0.35);
    ctx.lineTo(-2 * s, hipY);
    ctx.closePath();
    ctx.fill();
    // Cape highlight
    ctx.fillStyle = cCapeLt;
    ctx.beginPath();
    ctx.moveTo(-2 * s, shoulderY + 4 * s);
    ctx.bezierCurveTo(
        (-7 + wind * 0.3) * s, shoulderY + torsoH * 0.4,
        (-10 + wind * 0.4) * s, hipY + 8 * s,
        (-7 + wind * 0.3) * s, hipY + thighLen * 0.35
    );
    ctx.lineTo(-3 * s, hipY + 6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2. Far leg (darker, behind body)
    _leg(legAngleFar, kneeBendFar, cLegs, 5 * s);

    // 3. Far arm
    ctx.save();
    ctx.rotate(torsoLean);
    _arm(1 * s, shoulderY + 3 * s, armSwingFar, cTunic, 3.5 * s);
    ctx.restore();

    // 4. Torso block (narrow rectangle in side view)
    ctx.save();
    ctx.rotate(torsoLean);
    const tw = torsoW * 0.5;
    // Main tunic
    ctx.fillStyle = cTunicLt;
    ctx.beginPath();
    ctx.moveTo(-tw * 0.9, hipY);
    ctx.lineTo(-tw * 0.8, hipY - torsoH * 0.5);
    ctx.lineTo(-tw * 0.9, shoulderY);
    ctx.lineTo(tw, shoulderY);
    ctx.lineTo(tw * 0.9, hipY - torsoH * 0.5);
    ctx.lineTo(tw * 0.8, hipY);
    ctx.closePath();
    ctx.fill();
    // Pelvis block (slightly wider)
    ctx.save();
    ctx.rotate(hipRoll);
    ctx.fillStyle = cTunic;
    const pw = pelvisW * 0.5;
    ctx.fillRect(-pw * 0.7, hipY - pelvisH, pelvisW * 0.7, pelvisH);
    ctx.restore();
    // Belt
    ctx.fillStyle = cBelt;
    const beltY = hipY - pelvisH + 1 * s;
    ctx.fillRect(-tw * 0.9, beltY, torsoW * 0.9, 2.5 * s);
    // Belt buckle
    ctx.fillStyle = '#c4953a';
    ctx.beginPath();
    ctx.arc(tw * 0.5, beltY + 1.25 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    // Shoulder cap
    ctx.fillStyle = cTunicLt;
    ctx.beginPath();
    ctx.ellipse(0, shoulderY, tw * 1.2, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tunic hem
    ctx.fillStyle = cTunic;
    ctx.beginPath();
    ctx.moveTo(-pw * 0.8, hipY);
    ctx.quadraticCurveTo(0, hipY + 5 * s, pw * 0.8, hipY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 5. Near leg (brighter, in front)
    _leg(legAngleNear, kneeBendNear, cLegsLt, 5.5 * s);

    // 6. Near arm + staff
    ctx.save();
    ctx.rotate(torsoLean);
    const hand = _arm(-1 * s, shoulderY + 3 * s, armSwingNear, cTunicLt, 4 * s);
    // Walking staff
    const stX = hand.handX;
    const stY = hand.handY - 3 * s;
    const stBotX = stX + 3 * s;
    const stBotY = 4 * s + bob;
    ctx.strokeStyle = '#6a4a20';
    ctx.lineWidth = 2.5 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(stX, stY);
    ctx.lineTo(stBotX, stBotY);
    ctx.stroke();
    // Staff wraps
    ctx.strokeStyle = '#8a6a30';
    ctx.lineWidth = 0.8 * s;
    const sdx = stBotX - stX, sdy = stBotY - stY;
    for (let i = 0; i < 3; i++) {
        const t = 0.1 + i * 0.1;
        ctx.beginPath();
        ctx.moveTo(stX + sdx * t - 1.5 * s, stY + sdy * t);
        ctx.lineTo(stX + sdx * t + 1.5 * s, stY + sdy * t - s);
        ctx.stroke();
    }
    // Staff knob + gem
    ctx.fillStyle = '#6a4a20';
    ctx.beginPath();
    ctx.arc(stX, stY, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();
    const glow = 0.5 + Math.sin(elapsed * 0.005) * 0.2;
    ctx.fillStyle = `rgba(196,149,58,${glow})`;
    ctx.beginPath();
    ctx.arc(stX, stY, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(196,149,58,${glow * 0.12})`;
    ctx.beginPath();
    ctx.arc(stX, stY, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 7. Head (hooded, profile facing right)
    ctx.save();
    ctx.rotate(torsoLean);
    ctx.translate(0, headBob);
    const hY = headY;
    const hw = headW * 0.5;
    const hh = headH * 0.5;
    // Hood — large, blocky shape matching wireframe's prominent head block
    // Back fill (larger, creates the hood volume)
    ctx.fillStyle = cHood;
    ctx.beginPath();
    ctx.moveTo(-hw * 1.1, hY + hh);             // lower back
    ctx.lineTo(-hw * 1.3, hY - hh * 0.5);       // back side
    ctx.quadraticCurveTo(-hw * 1.2, hY - hh * 1.3, 0, hY - hh * 1.4); // top back curve
    ctx.quadraticCurveTo(hw * 0.8, hY - hh * 1.3, hw * 1.0, hY - hh * 0.8); // top front
    ctx.lineTo(hw * 1.2, hY + hh * 0.3);        // front brow
    ctx.lineTo(hw * 0.6, hY + hh);              // chin
    ctx.closePath();
    ctx.fill();
    // Hood front panel (darker, creates depth)
    ctx.fillStyle = cHoodDk;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.8, hY + hh);
    ctx.lineTo(-hw * 1.0, hY - hh * 0.3);
    ctx.quadraticCurveTo(-hw * 0.9, hY - hh * 1.2, 0, hY - hh * 1.3);
    ctx.quadraticCurveTo(hw * 0.6, hY - hh * 1.2, hw * 0.9, hY - hh * 0.7);
    ctx.lineTo(hw * 1.1, hY + hh * 0.2);
    ctx.lineTo(hw * 0.5, hY + hh);
    ctx.closePath();
    ctx.fill();
    // Face shadow (dark opening inside hood)
    ctx.fillStyle = '#1a1210';
    ctx.beginPath();
    ctx.moveTo(hw * 0.3, hY + hh * 0.7);
    ctx.quadraticCurveTo(hw * 1.3, hY, hw * 1.1, hY - hh * 0.5);
    ctx.quadraticCurveTo(hw * 0.7, hY - hh * 0.7, hw * 0.2, hY - hh * 0.1);
    ctx.quadraticCurveTo(hw * 0.1, hY + hh * 0.4, hw * 0.3, hY + hh * 0.7);
    ctx.closePath();
    ctx.fill();
    // Skin visible (profile — nose, chin)
    ctx.fillStyle = cSkin;
    ctx.beginPath();
    ctx.arc(hw * 0.9, hY + hh * 0.1, 3 * s, -0.4, 1.0);
    ctx.fill();
    // Eye glow
    const eyeGlow = 0.4 + Math.sin(elapsed * 0.004) * 0.15;
    ctx.fillStyle = `rgba(196,149,58,${eyeGlow})`;
    ctx.beginPath();
    ctx.arc(hw * 0.9, hY - hh * 0.1, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    // Hood edge highlight
    ctx.strokeStyle = 'rgba(100,70,40,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-hw * 1.1, hY + hh);
    ctx.lineTo(-hw * 1.3, hY - hh * 0.5);
    ctx.quadraticCurveTo(-hw * 1.2, hY - hh * 1.3, 0, hY - hh * 1.4);
    ctx.quadraticCurveTo(hw * 0.8, hY - hh * 1.3, hw * 1.0, hY - hh * 0.8);
    ctx.lineTo(hw * 1.2, hY + hh * 0.3);
    ctx.stroke();
    // Hood drape connecting to neck/shoulders
    ctx.fillStyle = cHood;
    ctx.beginPath();
    ctx.moveTo(-hw * 1.1, hY + hh);
    ctx.quadraticCurveTo(-hw * 0.5, hY + hh * 1.4, 0, shoulderY + neckH);
    ctx.quadraticCurveTo(hw * 0.3, hY + hh * 1.4, hw * 0.6, hY + hh);
    ctx.closePath();
    ctx.fill();
    ctx.restore(); // end head

    ctx.restore(); // end figure translate
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

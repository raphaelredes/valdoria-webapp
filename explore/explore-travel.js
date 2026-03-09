// ═══════════════════════════════════════════════════════
// TRAVEL ANIMATION — cinematic parallax journey to destination
// ═══════════════════════════════════════════════════════

// Per-biome visual config
const TRAVEL_CONFIG = {
    forest:   { bg: ['#0d2e0d','#1a4a1a'], ground: '#2d3d1d', midColor: '#1a3a1a', farColor: '#0a2a0a', silhouette: 'conifers',   icon: '', horizonGlow: '196,149,58',  stars: false, celestial: 'sun',  cloud: 'thin',  sway: true },
    plains:   { bg: ['#3a3a18','#5a5a28'], ground: '#5a4a30', midColor: '#4a4a20', farColor: '#3a3a15', silhouette: 'hills',      icon: '', horizonGlow: '196,149,58',  stars: false, celestial: 'sun',  cloud: 'thin',  sway: false },
    swamp:    { bg: ['#1a2a1a','#2a3a2a'], ground: '#3a3a2a', midColor: '#2a3a25', farColor: '#1a2a18', silhouette: 'deadTrees',  icon: '', horizonGlow: '100,140,80',  stars: true,  celestial: 'moon', cloud: 'fog',   sway: false },
    cave:     { bg: ['#0a0a14','#1a1a2a'], ground: '#1a1a2a', midColor: '#15152a', farColor: '#0a0a18', silhouette: 'rocks',      icon: '', horizonGlow: '100,100,160', stars: true,  celestial: null,   cloud: null,    sway: false },
    desert:   { bg: ['#6a5a30','#8a7a4a'], ground: '#8a7a4a', midColor: '#7a6a3a', farColor: '#5a4a28', silhouette: 'dunes',      icon: '', horizonGlow: '220,180,80',  stars: false, celestial: 'sun',  cloud: null,    sway: false },
    mountain: { bg: ['#3a3a4a','#5a5a6a'], ground: '#5a4a3a', midColor: '#4a4a5a', farColor: '#2a2a3a', silhouette: 'peaks',      icon: '', horizonGlow: '160,160,200', stars: true,  celestial: 'moon', cloud: 'thin',  sway: false },
    snow:     { bg: ['#8a8a9a','#b0b8c0'], ground: '#c0c8d0', midColor: '#9a9aaa', farColor: '#7a7a8a', silhouette: 'peaks',      icon: '', horizonGlow: '140,180,220', stars: false, celestial: null,   cloud: 'heavy', sway: false },
    volcanic: { bg: ['#2a1a0a','#3a2a1a'], ground: '#3a2a1a', midColor: '#3a2010', farColor: '#1a0a00', silhouette: 'rocks',      icon: '', horizonGlow: '255,100,30',  stars: true,  celestial: 'moon', cloud: 'smoke', sway: false },
    graveyard:{ bg: ['#1a1a20','#2a2a30'], ground: '#3a3a3a', midColor: '#252530', farColor: '#15151a', silhouette: 'tombstones', icon: '', horizonGlow: '120,120,160', stars: true,  celestial: 'moon', cloud: 'dark',  sway: false },
    // Dungeon variants — darker, more menacing
    dungeon_cave:     { bg: ['#050510','#0a0a18'], ground: '#0f0f1a', midColor: '#0a0a15', farColor: '#050508', silhouette: 'rocks',      icon: '', horizonGlow: '80,80,140',   stars: true,  celestial: null,   cloud: null,    sway: false },
    dungeon_graveyard:{ bg: ['#0a0a10','#15151a'], ground: '#1a1a20', midColor: '#101018', farColor: '#08080c', silhouette: 'tombstones', icon: '', horizonGlow: '100,80,140',  stars: true,  celestial: 'moon', cloud: 'dark',  sway: false },
    dungeon_volcanic: { bg: ['#1a0a00','#2a1508'], ground: '#2a1a0a', midColor: '#200a00', farColor: '#100500', silhouette: 'rocks',      icon: '', horizonGlow: '255,60,0',    stars: true,  celestial: null,   cloud: 'smoke', sway: false },
    dungeon_forest:   { bg: ['#050a05','#0a150a'], ground: '#0a1a0a', midColor: '#081208', farColor: '#040a04', silhouette: 'conifers',   icon: '', horizonGlow: '60,100,60',   stars: true,  celestial: 'moon', cloud: 'fog',   sway: true },
    dungeon_swamp:    { bg: ['#0a100a','#151a15'], ground: '#1a1a15', midColor: '#121812', farColor: '#080a08', silhouette: 'deadTrees',  icon: '', horizonGlow: '80,100,60',   stars: true,  celestial: null,   cloud: 'fog',   sway: false },
    dungeon_mountain: { bg: ['#1a1a20','#2a2a35'], ground: '#2a2020', midColor: '#202030', farColor: '#151520', silhouette: 'peaks',      icon: '', horizonGlow: '120,100,160', stars: true,  celestial: 'moon', cloud: 'thin',  sway: false },
    dungeon_snow:     { bg: ['#4a4a55','#6a6a75'], ground: '#5a5a65', midColor: '#555560', farColor: '#404048', silhouette: 'peaks',      icon: '', horizonGlow: '140,150,180', stars: true,  celestial: null,   cloud: 'heavy', sway: false },
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

    // Generate particles with depth layers for parallax
    const particles = [];
    for (let i = 0; i < pcfg.n; i++) {
        const p = _createTravelParticle(pcfg, w, h);
        p.depth = 0.4 + Math.random() * 0.6; // 0.4 = far, 1.0 = near
        particles.push(p);
    }

    // Generate terrain features (3 layers for deep parallax)
    const farFeatures = _generateFeatures(cfg.silhouette, w, 14);
    const midFeatures = _generateFeatures(cfg.silhouette, w, 10);
    const nearFeatures = _generateFeatures(cfg.silhouette, w, 6);

    // Generate stars (static positions, reused every frame)
    const stars = cfg.stars ? _generateStars(w, h) : [];

    // Generate shooting stars (1-2 during the trip, only on star biomes)
    const shootingStars = cfg.stars ? _generateShootingStars(w, h) : [];

    // Generate clouds
    const clouds = cfg.cloud ? _generateClouds(w, h, cfg.cloud) : [];

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

        // Subtle zoom-in camera effect (1.0 → 1.03)
        const zoom = 1.0 + progress * 0.03;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-w / 2, -h / 2);

        // Clear
        ctx.clearRect(-10, -10, w + 20, h + 20);

        // Background gradient (sky → horizon → ground)
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, cfg.bg[0]);
        grad.addColorStop(0.45, cfg.bg[1]);
        grad.addColorStop(0.7, cfg.ground);
        grad.addColorStop(1, cfg.ground);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Celestial body (moon/sun) — behind everything
        if (cfg.celestial) {
            _drawCelestial(ctx, w, h, elapsed, cfg.celestial);
        }

        // Stars (twinkling, drawn before terrain so they peek through gaps)
        if (stars.length > 0) {
            _drawStars(ctx, stars, elapsed);
            _drawShootingStars(ctx, shootingStars, elapsed);
        }

        // Clouds (slow parallax in the sky)
        if (clouds.length > 0) {
            _drawClouds(ctx, clouds, w, elapsed);
        }

        // Far terrain layer (very slow parallax — distant mountains/trees)
        const farOffset = elapsed * 0.012;
        _drawTerrainLayer(ctx, farFeatures, w, h, 0.40, cfg.farColor, farOffset, cfg.silhouette);

        // Horizon ambient glow (between far and mid terrain)
        _drawHorizonGlow(ctx, w, h, elapsed, cfg.horizonGlow);

        // Mid terrain layer (medium parallax)
        const midOffset = elapsed * 0.035;
        _drawTerrainLayer(ctx, midFeatures, w, h, 0.55, cfg.midColor, midOffset, cfg.silhouette, cfg.sway ? elapsed : 0);

        // Near terrain layer (fast parallax — closest vegetation)
        const nearOffset = elapsed * 0.07;
        const nearColor = _blendColor(cfg.midColor, cfg.ground, 0.5);
        _drawTerrainLayer(ctx, nearFeatures, w, h, 0.68, nearColor, nearOffset, cfg.silhouette, cfg.sway ? elapsed : 0);

        // Ground plane
        const groundY = h * 0.72;
        ctx.fillStyle = cfg.ground;
        ctx.fillRect(0, groundY, w, h - groundY);

        // Scrolling road/path
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

        // Particles with depth-based parallax
        _updateTravelParticles(ctx, particles, pcfg, w, h, elapsed);

        // Text (fade in first 400ms, slow vertical drift upward)
        const textAlpha = Math.min(1, elapsed / 400);
        const textDrift = progress * 18; // pixels upward over full duration
        _drawTravelText(ctx, regionName, cfg.icon, w, h, textAlpha, textDrift);

        // Travel progress bar
        _drawProgressBar(ctx, w, h, progress);

        // Cinematic vignette (darkened edges)
        _drawVignette(ctx, w, h);

        // Restore zoom transform
        ctx.restore();

        // Fade-in (first 400ms) — drawn OUTSIDE zoom so it covers full canvas
        if (progress < 0.115) {
            const fadeIn = 1 - (progress / 0.115);
            ctx.fillStyle = `rgba(26,21,32,${fadeIn})`;
            ctx.fillRect(0, 0, w, h);
        }

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
// STARS
// ═══════════════════════════════════════════

function _generateStars(w, h) {
    const stars = [];
    const skyH = h * 0.45; // only in the sky portion
    const count = 40 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
        stars.push({
            x: Math.random() * w,
            y: Math.random() * skyH,
            size: 0.5 + Math.random() * 1.5,
            phase: Math.random() * Math.PI * 2,
            speed: 0.8 + Math.random() * 2.0, // twinkle speed
            brightness: 0.4 + Math.random() * 0.6,
        });
    }
    return stars;
}

function _drawStars(ctx, stars, elapsed) {
    for (const s of stars) {
        const twinkle = s.brightness * (0.5 + 0.5 * Math.sin(elapsed * 0.001 * s.speed + s.phase));
        if (twinkle < 0.1) continue;
        ctx.fillStyle = `rgba(255,255,240,${twinkle})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
    }
}


// ═══════════════════════════════════════════
// HORIZON GLOW
// ═══════════════════════════════════════════

function _drawHorizonGlow(ctx, w, h, elapsed, glowRGB) {
    const cy = h * 0.48; // just above the ground line
    const pulse = 0.06 + Math.sin(elapsed * 0.0015) * 0.025;
    const grad = ctx.createRadialGradient(w * 0.5, cy, 0, w * 0.5, cy, w * 0.6);
    grad.addColorStop(0, `rgba(${glowRGB},${pulse})`);
    grad.addColorStop(0.5, `rgba(${glowRGB},${pulse * 0.4})`);
    grad.addColorStop(1, `rgba(${glowRGB},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, cy - h * 0.2, w, h * 0.4);
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

function _drawTerrainLayer(ctx, features, w, h, yRatio, color, offset, silhouetteType, swayTime) {
    const baseY = h * yRatio;
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.moveTo(0, h);

    for (const f of features) {
        const x = ((f.x - offset) % (w * 2) + w * 2) % (w * 2) - w * 0.3;
        const fh = f.height * h * 0.18;
        const fw = f.width * 40;
        // Wind sway for conifers/deadTrees — gentle lean based on time
        if (swayTime && (silhouetteType === 'conifers' || silhouetteType === 'deadTrees')) {
            const lean = Math.sin(swayTime * 0.0015 + f.x * 0.01) * 3 * f.height;
            ctx.save();
            ctx.translate(x, baseY);
            ctx.transform(1, 0, lean / (fh || 1), 1, 0, 0); // horizontal shear
            _drawSilhouette(ctx, silhouetteType, 0, 0, fh, fw, f.variant);
            ctx.restore();
            // Reconnect path after restore — move to last tree base
            ctx.moveTo(x + fw * 0.5, baseY);
        } else {
            _drawSilhouette(ctx, silhouetteType, x, baseY, fh, fw, f.variant);
        }
    }

    ctx.lineTo(w + 10, baseY);
    ctx.lineTo(w + 10, h);
    ctx.closePath();
    ctx.fill();
}

/**
 * Draw a single silhouette shape based on biome type.
 */
function _drawSilhouette(ctx, type, x, baseY, fh, fw, variant) {
    switch (type) {
        case 'conifers':
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
            ctx.lineTo(x - fw * 0.1, baseY);
            ctx.lineTo(x - fw * 0.08, baseY - fh * 0.5);
            ctx.lineTo(x - fw * 0.5, baseY - fh * 0.8);
            ctx.lineTo(x - fw * 0.35, baseY - fh * 0.65);
            ctx.lineTo(x - fw * 0.15, baseY - fh * 0.7);
            ctx.lineTo(x - fw * 0.3, baseY - fh * 0.95);
            ctx.lineTo(x - fw * 0.1, baseY - fh * 0.75);
            ctx.lineTo(x, baseY - fh);
            ctx.lineTo(x + fw * 0.1, baseY - fh * 0.75);
            ctx.lineTo(x + fw * 0.4, baseY - fh * 0.9);
            ctx.lineTo(x + fw * 0.2, baseY - fh * 0.65);
            ctx.lineTo(x + fw * 0.45, baseY - fh * 0.7);
            ctx.lineTo(x + fw * 0.08, baseY - fh * 0.5);
            ctx.lineTo(x + fw * 0.1, baseY);
            break;

        case 'rocks':
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
            ctx.lineTo(x - fw * 0.8, baseY);
            ctx.quadraticCurveTo(x - fw * 0.4, baseY - fh * 0.7, x, baseY - fh * 0.5);
            ctx.quadraticCurveTo(x + fw * 0.3, baseY - fh * 0.35, x + fw * 0.5, baseY - fh * 0.6);
            ctx.quadraticCurveTo(x + fw * 0.7, baseY - fh * 0.8, x + fw * 0.9, baseY);
            break;

        case 'peaks':
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
            if (variant === 0) {
                ctx.lineTo(x - fw * 0.2, baseY);
                ctx.lineTo(x - fw * 0.2, baseY - fh * 0.7);
                ctx.arc(x, baseY - fh * 0.7, fw * 0.2, Math.PI, 0);
                ctx.lineTo(x + fw * 0.2, baseY);
            } else if (variant === 1) {
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
                ctx.lineTo(x - fw * 0.15, baseY);
                ctx.lineTo(x - fw * 0.15, baseY - fh * 0.75);
                ctx.lineTo(x, baseY - fh);
                ctx.lineTo(x + fw * 0.15, baseY - fh * 0.75);
                ctx.lineTo(x + fw * 0.15, baseY);
            }
            break;

        case 'hills':
            ctx.lineTo(x - fw * 0.9, baseY);
            ctx.quadraticCurveTo(x - fw * 0.4, baseY - fh * 0.5, x, baseY - fh * 0.4);
            ctx.quadraticCurveTo(x + fw * 0.4, baseY - fh * 0.25, x + fw * 0.9, baseY);
            break;

        default:
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
    const baseBiome = biome.startsWith('dungeon_') ? biome.slice(8) : biome;

    if (baseBiome === 'swamp') {
        ctx.fillStyle = 'rgba(40,60,50,0.3)';
        for (let i = 0; i < 6; i++) {
            const px = ((i * 80 + 20 - scrollX) % (w + 60)) - 30;
            ctx.beginPath();
            ctx.ellipse(px, groundY + 20 + i * 8, 25, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (baseBiome === 'desert') {
        ctx.strokeStyle = 'rgba(200,180,120,0.15)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 10; i++) {
            const rx = ((i * 50 - scrollX * 0.7) % (w + 60)) - 30;
            ctx.beginPath();
            ctx.moveTo(rx, groundY + 10);
            ctx.quadraticCurveTo(rx + 15, groundY + 6, rx + 30, groundY + 10);
            ctx.stroke();
        }
    } else if (baseBiome === 'snow') {
        ctx.fillStyle = 'rgba(200,210,230,0.15)';
        for (let i = 0; i < 5; i++) {
            const sx = ((i * 90 + 30 - scrollX * 0.5) % (w + 80)) - 40;
            ctx.beginPath();
            ctx.ellipse(sx, groundY + 15, 35, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (baseBiome === 'volcanic') {
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
        ctx.fillStyle = 'rgba(120,110,100,0.2)';
        for (let i = 0; i < 8; i++) {
            const mx = ((i * 50 + 8 - scrollX * 0.6) % (w + 40)) - 20;
            ctx.beginPath();
            ctx.arc(mx, groundY + 6 + (i % 3) * 4, 2 + (i % 2), 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
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
// PARTICLES (with depth-based parallax)
// ═══════════════════════════════════════════

function _createTravelParticle(cfg, w, h) {
    return {
        x: Math.random() * w * 1.2 - w * 0.1,
        y: Math.random() * h,
        size: 2 + Math.random() * 3,
        speed: 10 + Math.random() * 20,
        phase: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        type: cfg.type,
        color: cfg.color,
        depth: 0.4 + Math.random() * 0.6,
    };
}

function _updateTravelParticles(ctx, particles, cfg, w, h, elapsed) {
    const dt = 0.016; // ~60fps
    for (const p of particles) {
        const depthFactor = p.depth; // 0.4 (far/slow) → 1.0 (near/fast)
        const depthAlpha = 0.3 + depthFactor * 0.7; // far = dimmer
        const depthSize = 0.5 + depthFactor * 0.5;  // far = smaller

        switch (p.type) {
            case 'leaf':
                p.x -= p.speed * dt * 2 * depthFactor;
                p.y += p.speed * dt * depthFactor;
                p.rotation += dt * 2;
                if (p.y > h || p.x < -20) {
                    p.x = w + 20;
                    p.y = Math.random() * h * 0.6;
                }
                ctx.save();
                ctx.globalAlpha = depthAlpha;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size * depthSize, p.size * 0.4 * depthSize, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                break;

            case 'snow':
                p.x += Math.sin(elapsed * 0.001 + p.phase) * 0.5 * depthFactor;
                p.y += p.speed * dt * depthFactor;
                if (p.y > h) {
                    p.y = -5;
                    p.x = Math.random() * w;
                }
                ctx.save();
                ctx.globalAlpha = depthAlpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.6 * depthSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                break;

            case 'ember':
                p.x += (Math.random() - 0.5) * 2 * depthFactor;
                p.y -= p.speed * dt * 0.8 * depthFactor;
                if (p.y < 0) {
                    p.y = h * 0.8 + Math.random() * h * 0.2;
                    p.x = Math.random() * w;
                }
                ctx.save();
                ctx.globalAlpha = depthAlpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.5 * depthSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                break;

            case 'wisp':
                p.x -= p.speed * dt * 1.5 * depthFactor;
                p.y += Math.sin(elapsed * 0.001 + p.phase) * 0.3;
                if (p.x < -30) {
                    p.x = w + 30;
                    p.y = h * 0.5 + Math.random() * h * 0.3;
                }
                ctx.save();
                ctx.globalAlpha = depthAlpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, p.size * 3 * depthSize, p.size * depthSize, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                break;

            default: // mist
                p.x -= p.speed * dt * 0.3 * depthFactor;
                if (p.x < -60) {
                    p.x = w + 60;
                    p.y = Math.random() * h;
                }
                ctx.save();
                ctx.globalAlpha = depthAlpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, p.size * 8 * depthSize, p.size * 4 * depthSize, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                break;
        }
    }
}


// ═══════════════════════════════════════════
// TEXT OVERLAY
// ═══════════════════════════════════════════

function _drawTravelText(ctx, regionName, icon, w, h, alpha, drift) {
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    // Slow vertical drift upward (cinematic crawl)
    ctx.translate(0, -drift);

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
// CELESTIAL BODIES
// ═══════════════════════════════════════════

function _drawCelestial(ctx, w, h, elapsed, type) {
    ctx.save();
    // Slow drift rightward to simulate sky movement
    const drift = elapsed * 0.003;

    if (type === 'moon') {
        const mx = w * 0.78 + drift, my = h * 0.1;
        const r = 18;
        // Moon glow
        const glow = ctx.createRadialGradient(mx, my, r * 0.5, mx, my, r * 4);
        glow.addColorStop(0, 'rgba(200,210,230,0.12)');
        glow.addColorStop(0.5, 'rgba(180,190,210,0.04)');
        glow.addColorStop(1, 'rgba(180,190,210,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(mx - r * 4, my - r * 4, r * 8, r * 8);
        // Moon disc
        ctx.fillStyle = 'rgba(220,225,240,0.9)';
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fill();
        // Crescent shadow (overlapping darker circle)
        ctx.fillStyle = 'rgba(15,15,25,0.92)';
        ctx.beginPath();
        ctx.arc(mx + r * 0.45, my - r * 0.15, r * 0.85, 0, Math.PI * 2);
        ctx.fill();
    } else if (type === 'sun') {
        const sx = w * 0.8 + drift, sy = h * 0.12;
        const r = 16;
        // Sun glow (warm, larger)
        const glow = ctx.createRadialGradient(sx, sy, r * 0.3, sx, sy, r * 5);
        glow.addColorStop(0, 'rgba(255,220,120,0.18)');
        glow.addColorStop(0.3, 'rgba(255,200,80,0.08)');
        glow.addColorStop(0.7, 'rgba(255,180,60,0.02)');
        glow.addColorStop(1, 'rgba(255,180,60,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(sx - r * 5, sy - r * 5, r * 10, r * 10);
        // Sun disc
        ctx.fillStyle = 'rgba(255,230,150,0.85)';
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        // Inner bright core
        ctx.fillStyle = 'rgba(255,245,200,0.5)';
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}


// ═══════════════════════════════════════════
// SHOOTING STARS
// ═══════════════════════════════════════════

function _generateShootingStars(w, h) {
    const count = 1 + Math.floor(Math.random() * 2); // 1-2
    const stars = [];
    for (let i = 0; i < count; i++) {
        stars.push({
            startX: w * 0.2 + Math.random() * w * 0.6,
            startY: Math.random() * h * 0.25,
            angle: 0.4 + Math.random() * 0.4, // 23-46 degrees downward
            speed: 280 + Math.random() * 120,
            length: 40 + Math.random() * 30,
            triggerTime: 800 + Math.random() * 2200, // when it appears (ms)
            duration: 350 + Math.random() * 200,
        });
    }
    return stars;
}

function _drawShootingStars(ctx, shootingStars, elapsed) {
    for (const s of shootingStars) {
        const t = elapsed - s.triggerTime;
        if (t < 0 || t > s.duration) continue;

        const progress = t / s.duration;
        const alpha = progress < 0.3 ? progress / 0.3 : 1 - ((progress - 0.3) / 0.7);
        const dist = progress * s.speed;
        const dx = Math.cos(s.angle) * dist;
        const dy = Math.sin(s.angle) * dist;
        const headX = s.startX + dx;
        const headY = s.startY + dy;
        const tailX = headX - Math.cos(s.angle) * s.length;
        const tailY = headY - Math.sin(s.angle) * s.length;

        const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
        grad.addColorStop(0, `rgba(255,255,240,0)`);
        grad.addColorStop(0.7, `rgba(255,255,240,${alpha * 0.4})`);
        grad.addColorStop(1, `rgba(255,255,255,${alpha * 0.9})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();

        // Bright head dot
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(headX, headY, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
}


// ═══════════════════════════════════════════
// CLOUDS
// ═══════════════════════════════════════════

function _generateClouds(w, h, type) {
    const clouds = [];
    let count, yRange, alphaBase, sizeBase;

    switch (type) {
        case 'thin':    count = 3; yRange = [0.05, 0.2];  alphaBase = 0.06; sizeBase = 60;  break;
        case 'heavy':   count = 5; yRange = [0.03, 0.25]; alphaBase = 0.12; sizeBase = 80;  break;
        case 'dark':    count = 4; yRange = [0.05, 0.22]; alphaBase = 0.10; sizeBase = 70;  break;
        case 'fog':     count = 5; yRange = [0.20, 0.45]; alphaBase = 0.07; sizeBase = 100; break;
        case 'smoke':   count = 4; yRange = [0.10, 0.35]; alphaBase = 0.10; sizeBase = 70;  break;
        default:        count = 3; yRange = [0.05, 0.2];  alphaBase = 0.06; sizeBase = 60;  break;
    }

    for (let i = 0; i < count; i++) {
        const depth = 0.3 + Math.random() * 0.7; // parallax depth
        clouds.push({
            x: Math.random() * w * 1.5 - w * 0.25,
            y: h * (yRange[0] + Math.random() * (yRange[1] - yRange[0])),
            w: sizeBase + Math.random() * sizeBase * 0.8,
            h: 8 + Math.random() * 12,
            alpha: alphaBase + Math.random() * alphaBase * 0.5,
            depth: depth,
            type: type,
        });
    }
    return clouds;
}

function _drawClouds(ctx, clouds, canvasW, elapsed) {
    ctx.save();
    for (const c of clouds) {
        const speed = 0.008 * c.depth;
        const cx = ((c.x - elapsed * speed) % (canvasW + c.w * 2)) ;
        // Wrap around
        const drawX = cx < -c.w ? cx + canvasW + c.w * 2 : cx;

        let color;
        if (c.type === 'smoke') {
            color = `rgba(80,40,20,${c.alpha})`;
        } else if (c.type === 'dark') {
            color = `rgba(30,30,40,${c.alpha})`;
        } else if (c.type === 'fog') {
            color = `rgba(140,150,130,${c.alpha})`;
        } else {
            color = `rgba(200,200,210,${c.alpha})`;
        }

        ctx.fillStyle = color;
        // Cloud shape: multiple overlapping ellipses
        ctx.beginPath();
        ctx.ellipse(drawX, c.y, c.w * 0.5, c.h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(drawX - c.w * 0.2, c.y + c.h * 0.3, c.w * 0.35, c.h * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(drawX + c.w * 0.25, c.y - c.h * 0.2, c.w * 0.3, c.h * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}


// ═══════════════════════════════════════════
// VIGNETTE
// ═══════════════════════════════════════════

function _drawVignette(ctx, w, h) {
    const cx = w / 2, cy = h / 2;
    const outerR = Math.sqrt(cx * cx + cy * cy);
    const grad = ctx.createRadialGradient(cx, cy, outerR * 0.45, cx, cy, outerR);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
}


// ═══════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════

function _blendColor(hex1, hex2, factor) {
    const r1 = parseInt(hex1.slice(1, 3), 16), g1 = parseInt(hex1.slice(3, 5), 16), b1 = parseInt(hex1.slice(5, 7), 16);
    const r2 = parseInt(hex2.slice(1, 3), 16), g2 = parseInt(hex2.slice(3, 5), 16), b2 = parseInt(hex2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    return `rgb(${r},${g},${b})`;
}

// Scrolling road/path
function _drawRoadPath(ctx, w, h, groundY, elapsed, biome) {
    const baseBiome = biome.startsWith('dungeon_') ? biome.slice(8) : biome;
    const scrollX = elapsed * 0.08;
    const pathY = groundY + 4;

    ctx.save();

    if (baseBiome === 'desert') {
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
        ctx.fillStyle = 'rgba(200,210,225,0.08)';
        ctx.fillRect(0, pathY - 1, w, 16);
        ctx.fillStyle = 'rgba(160,170,185,0.12)';
        for (let i = 0; i < 8; i++) {
            const bx = ((i * 55 + (i % 2) * 8 - scrollX) % (w + 60)) - 30;
            ctx.beginPath();
            ctx.ellipse(bx, pathY + 7, 4, 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (baseBiome === 'volcanic') {
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
        ctx.fillStyle = 'rgba(60,60,80,0.15)';
        ctx.fillRect(0, pathY - 1, w, 14);
    } else {
        ctx.fillStyle = 'rgba(100,80,50,0.15)';
        ctx.fillRect(0, pathY - 2, w, 18);
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

// Travel progress bar at the bottom
function _drawProgressBar(ctx, w, h, progress) {
    const barW = w * 0.5;
    const barH = 3;
    const barX = (w - barW) / 2;
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

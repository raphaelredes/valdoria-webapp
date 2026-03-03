// ═══════════════════════════════════════════════════════
// TRAVEL ANIMATION — cinematic parallax journey to destination
// ═══════════════════════════════════════════════════════

// Per-biome visual config
const TRAVEL_CONFIG = {
    forest:   { bg: ['#0d2e0d','#1a4a1a'], ground: '#2d3d1d', midColor: '#1a3a1a', farColor: '#0a2a0a', silhouette: 'conifers', icon: '🌲' },
    plains:   { bg: ['#3a3a18','#5a5a28'], ground: '#5a4a30', midColor: '#4a4a20', farColor: '#3a3a15', silhouette: 'hills',    icon: '🌾' },
    swamp:    { bg: ['#1a2a1a','#2a3a2a'], ground: '#3a3a2a', midColor: '#2a3a25', farColor: '#1a2a18', silhouette: 'deadTrees',icon: '🌿' },
    cave:     { bg: ['#0a0a14','#1a1a2a'], ground: '#1a1a2a', midColor: '#15152a', farColor: '#0a0a18', silhouette: 'rocks',    icon: '🕳️' },
    desert:   { bg: ['#6a5a30','#8a7a4a'], ground: '#8a7a4a', midColor: '#7a6a3a', farColor: '#5a4a28', silhouette: 'dunes',    icon: '🏜️' },
    mountain: { bg: ['#3a3a4a','#5a5a6a'], ground: '#5a4a3a', midColor: '#4a4a5a', farColor: '#2a2a3a', silhouette: 'peaks',    icon: '⛰️' },
    snow:     { bg: ['#8a8a9a','#b0b8c0'], ground: '#c0c8d0', midColor: '#9a9aaa', farColor: '#7a7a8a', silhouette: 'peaks',    icon: '❄️' },
    volcanic: { bg: ['#2a1a0a','#3a2a1a'], ground: '#3a2a1a', midColor: '#3a2010', farColor: '#1a0a00', silhouette: 'rocks',    icon: '🌋' },
    graveyard:{ bg: ['#1a1a20','#2a2a30'], ground: '#3a3a3a', midColor: '#252530', farColor: '#15151a', silhouette: 'tombstones',icon:'⚰️' },
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
};

let _travelRaf = 0;

/**
 * Play the travel cinematic animation.
 * @param {string} biome - Biome ID (forest, swamp, etc.)
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

    // Generate terrain features (seeded for consistency)
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
        _drawTerrainLayer(ctx, farFeatures, w, h, 0.45, cfg.farColor, farOffset);

        // Mid terrain layer (medium parallax)
        const midOffset = elapsed * 0.04;
        _drawTerrainLayer(ctx, midFeatures, w, h, 0.62, cfg.midColor, midOffset);

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

function _drawTerrainLayer(ctx, features, w, h, yRatio, color, offset) {
    const baseY = h * yRatio;
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.moveTo(0, h);

    for (const f of features) {
        const x = ((f.x - offset) % (w * 2) + w * 2) % (w * 2) - w * 0.3;
        const fh = f.height * h * 0.18;
        const fw = f.width * 40;

        // Silhouette shapes
        ctx.lineTo(x - fw, baseY);
        ctx.lineTo(x - fw * 0.6, baseY - fh * 0.4);
        ctx.lineTo(x - fw * 0.2, baseY - fh);
        ctx.lineTo(x + fw * 0.1, baseY - fh * 0.85);
        ctx.lineTo(x + fw * 0.5, baseY - fh * 0.3);
        ctx.lineTo(x + fw, baseY);
    }

    ctx.lineTo(w + 10, baseY);
    ctx.lineTo(w + 10, h);
    ctx.closePath();
    ctx.fill();
}


// ═══════════════════════════════════════════
// GROUND DETAILS
// ═══════════════════════════════════════════

function _drawGroundDetails(ctx, biome, w, h, groundY, elapsed) {
    const scrollX = elapsed * 0.08;

    if (biome === 'swamp') {
        // Puddles / murky water
        ctx.fillStyle = 'rgba(40,60,50,0.3)';
        for (let i = 0; i < 6; i++) {
            const px = ((i * 80 + 20 - scrollX) % (w + 60)) - 30;
            ctx.beginPath();
            ctx.ellipse(px, groundY + 20 + i * 8, 25, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (biome === 'desert') {
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
    } else if (biome === 'snow') {
        // Snow mounds
        ctx.fillStyle = 'rgba(200,210,220,0.15)';
        for (let i = 0; i < 5; i++) {
            const sx = ((i * 100 + 30 - scrollX * 0.3) % (w + 80)) - 40;
            ctx.beginPath();
            ctx.arc(sx, groundY + 15, 20, Math.PI, 0);
            ctx.fill();
        }
    } else if (biome === 'volcanic') {
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
    } else {
        // Generic grass tufts
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

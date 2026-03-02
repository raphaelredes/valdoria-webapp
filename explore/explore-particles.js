// ═══════════════════════════════════════════════════════
// BIOME AMBIENT PARTICLES — Canvas-based particle system
// ═══════════════════════════════════════════════════════

const BIOME_PARTICLE_CONFIGS = {
    forest:   [{ type: 'leaf', n: 4, color: 'rgba(80,140,40,0.5)', color2: 'rgba(140,100,30,0.4)' }],
    plains:   [{ type: 'leaf', n: 3, color: 'rgba(160,140,60,0.4)', color2: 'rgba(120,160,50,0.3)' }],
    snow:     [{ type: 'snow', n: 6, color: 'rgba(220,230,255,0.6)' }],
    desert:   [{ type: 'wisp', n: 3, color: 'rgba(180,160,100,0.25)' }],
    volcanic: [{ type: 'ember', n: 5, color: 'rgba(255,100,0,0.7)', color2: 'rgba(255,200,50,0.5)' }],
    swamp:    [{ type: 'mist', n: 3, color: 'rgba(150,170,140,0.08)' }],
    graveyard:[{ type: 'mist', n: 3, color: 'rgba(140,140,160,0.06)' }],
    cave:     [{ type: 'mist', n: 2, color: 'rgba(100,100,120,0.05)' }],
    mountain: [{ type: 'mist', n: 2, color: 'rgba(180,180,200,0.06)' }, { type: 'leaf', n: 1, color: 'rgba(80,120,40,0.3)' }],
};

let _particles = [];
let _particlesInited = false;

function initBiomeParticles(biome) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    _particles = [];
    _particlesInited = true;

    const configs = BIOME_PARTICLE_CONFIGS[biome] || [];
    for (const cfg of configs) {
        for (let i = 0; i < cfg.n; i++) {
            _particles.push(createParticle(cfg));
        }
    }
}

function createParticle(cfg) {
    const p = {
        type: cfg.type,
        x: Math.random() * _canvasLogicalW,
        y: Math.random() * _canvasLogicalH,
        life: Math.random(), // 0-1 cycle position
        speed: 0,
        vx: 0, vy: 0,
        size: 0,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 2,
        color: cfg.color,
        color2: cfg.color2 || cfg.color,
        cfg: cfg,
    };

    switch (cfg.type) {
        case 'leaf':
            p.speed = 15 + Math.random() * 20;
            p.vx = (Math.random() - 0.3) * 12;
            p.vy = p.speed;
            p.size = 4 + Math.random() * 3;
            break;
        case 'snow':
            p.speed = 10 + Math.random() * 15;
            p.vx = (Math.random() - 0.5) * 6;
            p.vy = p.speed;
            p.size = 2 + Math.random() * 2;
            break;
        case 'ember':
            p.speed = 20 + Math.random() * 30;
            p.vx = (Math.random() - 0.5) * 8;
            p.vy = -p.speed; // Rise upward
            p.size = 1.5 + Math.random() * 2;
            break;
        case 'wisp':
            p.speed = 8 + Math.random() * 12;
            p.vx = p.speed;
            p.vy = (Math.random() - 0.7) * 6;
            p.size = 20 + Math.random() * 20;
            break;
        case 'mist':
            p.speed = 3 + Math.random() * 5;
            p.vx = p.speed;
            p.vy = (Math.random() - 0.5) * 2;
            p.size = 40 + Math.random() * 30;
            break;
    }
    return p;
}

function updateParticles(dt) {
    if (!_particlesInited || _particles.length === 0) return false;

    for (const p of _particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotSpeed * dt;
        p.life += dt * 0.12;

        // Wrap around when off-screen
        const margin = p.size * 2;
        if (p.y > _canvasLogicalH + margin) { p.y = -margin; p.x = Math.random() * _canvasLogicalW; }
        if (p.y < -margin && p.vy < 0) { p.y = _canvasLogicalH + margin; p.x = Math.random() * _canvasLogicalW; }
        if (p.x > _canvasLogicalW + margin) { p.x = -margin; p.y = Math.random() * _canvasLogicalH; }
        if (p.x < -margin && p.vx < 0) { p.x = _canvasLogicalW + margin; }
    }
    return true; // Always animate
}

function drawParticles(ctx, timestamp) {
    if (!_particlesInited) return;

    for (const p of _particles) {
        // Fade based on life cycle
        const fade = Math.sin(p.life * Math.PI);
        if (fade <= 0.01) continue;

        ctx.save();
        ctx.globalAlpha = fade;

        switch (p.type) {
            case 'leaf':
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.life % 0.5 > 0.25 ? p.color : p.color2;
                // Leaf shape: two curved arcs
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'snow':
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'ember':
                ctx.fillStyle = p.life % 0.3 > 0.15 ? p.color : p.color2;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * fade, 0, Math.PI * 2);
                ctx.fill();
                // Tiny glow
                ctx.fillStyle = 'rgba(255,200,50,0.15)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 3 * fade, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'wisp':
                const wGrad = ctx.createLinearGradient(p.x - p.size, p.y, p.x + p.size, p.y);
                wGrad.addColorStop(0, 'rgba(0,0,0,0)');
                wGrad.addColorStop(0.3, p.color);
                wGrad.addColorStop(0.7, p.color);
                wGrad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = wGrad;
                ctx.fillRect(p.x - p.size, p.y - 1, p.size * 2, 2);
                break;

            case 'mist':
                const mGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                mGrad.addColorStop(0, p.color);
                mGrad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = mGrad;
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
        }

        ctx.restore();
    }
}

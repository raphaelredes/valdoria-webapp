/**
 * Combat VFX Engine — Canvas2D particle & projectile system
 * Lendas de Valdoria — Medieval Fantasy RPG
 *
 * Provides damage-type-specific visual effects for combat:
 * projectiles, impacts, misses, kills, heals, screen flashes.
 *
 * Zero external dependencies. Pure Canvas2D, RAF auto-managed.
 */

/* ─── DAMAGE TYPE PROFILES (scaled for 390px smartphone) ─── */
const VFX_PROFILES = {
    fire: {
        colors: ['#ff6020', '#ff9040', '#ffe060'],
        trail: { count: 4, decay: 0.92, size: 8 },
        head: { size: 20, glow: 26, shape: 'circle' },
        impact: { count: 24, speed: 4, gravity: 0.04, life: 800, shapes: ['circle', 'circle', 'triangle'] },
        extra: 'flame_ring',
        path: 'arc',
        duration: 500,
        flashColor: 'rgba(255,100,30,0.38)',
    },
    cold: {
        colors: ['#80c0ff', '#a0e0ff', '#ffffff'],
        trail: { count: 3, decay: 0.88, size: 6 },
        head: { size: 15, glow: 20, shape: 'diamond' },
        impact: { count: 20, speed: 3.5, gravity: 0.01, life: 900, shapes: ['diamond', 'diamond', 'circle'] },
        extra: 'ice_shatter',
        path: 'linear',
        duration: 450,
        flashColor: 'rgba(128,200,255,0.30)',
    },
    lightning: {
        colors: ['#ffe040', '#ffffff', '#ffe890'],
        trail: { count: 2, decay: 0.95, size: 4 },
        head: { size: 12, glow: 30, shape: 'circle' },
        impact: { count: 18, speed: 5.5, gravity: 0, life: 550, shapes: ['line', 'line', 'circle'] },
        extra: 'electric_arcs',
        path: 'jagged',
        duration: 300,
        flashColor: 'rgba(255,230,80,0.42)',
    },
    necrotic: {
        colors: ['#9040c0', '#604080', '#200840'],
        trail: { count: 4, decay: 0.9, size: 7 },
        head: { size: 18, glow: 22, shape: 'circle' },
        impact: { count: 18, speed: 2.5, gravity: -0.02, life: 1000, shapes: ['circle', 'circle'] },
        extra: 'implosion',
        path: 'linear',
        duration: 550,
        flashColor: 'rgba(140,60,200,0.30)',
    },
    radiant: {
        colors: ['#ffe080', '#ffffff', '#ffcc40'],
        trail: { count: 3, decay: 0.85, size: 7 },
        head: { size: 18, glow: 32, shape: 'star' },
        impact: { count: 26, speed: 4.5, gravity: -0.01, life: 800, shapes: ['star', 'circle', 'circle'] },
        extra: 'light_burst',
        path: 'linear',
        duration: 400,
        flashColor: 'rgba(255,220,100,0.35)',
    },
    slashing: {
        colors: ['#c0c0c0', '#ffffff', '#e0d0b0'],
        trail: { count: 2, decay: 0.9, size: 4 },
        head: { size: 14, glow: 12, shape: 'line' },
        impact: { count: 14, speed: 4.5, gravity: 0.06, life: 550, shapes: ['triangle', 'triangle', 'circle'] },
        extra: null,
        path: 'linear',
        duration: 350,
        flashColor: 'rgba(200,200,200,0.22)',
    },
    piercing: {
        colors: ['#c0c0c0', '#e0d0b0', '#ffffff'],
        trail: { count: 1, decay: 0.93, size: 3 },
        head: { size: 12, glow: 10, shape: 'triangle' },
        impact: { count: 12, speed: 5.5, gravity: 0.08, life: 450, shapes: ['triangle', 'circle'] },
        extra: null,
        path: 'linear',
        duration: 300,
        flashColor: 'rgba(200,200,200,0.18)',
    },
    bludgeoning: {
        colors: ['#d0b888', '#ffffff', '#a09070'],
        trail: { count: 2, decay: 0.88, size: 7 },
        head: { size: 20, glow: 16, shape: 'circle' },
        impact: { count: 16, speed: 3.5, gravity: 0.05, life: 700, shapes: ['circle', 'ring'] },
        extra: 'shockwave',
        path: 'linear',
        duration: 400,
        flashColor: 'rgba(180,160,120,0.26)',
    },
    poison: {
        colors: ['#60c040', '#80e040', '#40a020'],
        trail: { count: 4, decay: 0.9, size: 7 },
        head: { size: 16, glow: 16, shape: 'circle' },
        impact: { count: 18, speed: 2.5, gravity: -0.02, life: 1000, shapes: ['circle', 'circle'] },
        extra: null,
        path: 'arc',
        duration: 550,
        flashColor: 'rgba(80,200,60,0.28)',
    },
    acid: {
        colors: ['#60d040', '#c0ff40', '#80e060'],
        trail: { count: 3, decay: 0.88, size: 5 },
        head: { size: 14, glow: 14, shape: 'circle' },
        impact: { count: 16, speed: 3.5, gravity: 0.06, life: 800, shapes: ['circle', 'circle'] },
        extra: null,
        path: 'arc',
        duration: 480,
        flashColor: 'rgba(100,210,60,0.26)',
    },
    force: {
        colors: ['#60c0ff', '#a0e0ff', '#ffffff'],
        trail: { count: 2, decay: 0.92, size: 5 },
        head: { size: 14, glow: 24, shape: 'circle' },
        impact: { count: 16, speed: 4.5, gravity: 0, life: 700, shapes: ['ring', 'circle'] },
        extra: 'shockwave',
        path: 'linear',
        duration: 350,
        flashColor: 'rgba(80,190,255,0.30)',
    },
    psychic: {
        colors: ['#e080ff', '#c060d0', '#8040a0'],
        trail: { count: 3, decay: 0.85, size: 5 },
        head: { size: 14, glow: 20, shape: 'circle' },
        impact: { count: 14, speed: 3, gravity: -0.01, life: 900, shapes: ['ring', 'circle'] },
        extra: null,
        path: 'wave',
        duration: 500,
        flashColor: 'rgba(220,120,255,0.28)',
    },
    thunder: {
        colors: ['#a0a0e0', '#ffffff', '#8080c0'],
        trail: { count: 2, decay: 0.9, size: 4 },
        head: { size: 16, glow: 20, shape: 'ring' },
        impact: { count: 18, speed: 4.5, gravity: 0, life: 700, shapes: ['ring', 'ring', 'circle'] },
        extra: 'shockwave',
        path: 'linear',
        duration: 400,
        flashColor: 'rgba(160,160,230,0.32)',
    },
    magic: {
        colors: ['#c060ff', '#60c0ff', '#ffffff'],
        trail: { count: 3, decay: 0.9, size: 5 },
        head: { size: 14, glow: 22, shape: 'star' },
        impact: { count: 18, speed: 4, gravity: 0, life: 750, shapes: ['star', 'circle'] },
        extra: null,
        path: 'linear',
        duration: 420,
        flashColor: 'rgba(190,90,255,0.28)',
    },
};

/* ─── EASING ─── */
function _easeOutQuad(t) { return t * (2 - t); }
function _easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function _easeInQuad(t) { return t * t; }

/* ─── COMBAT VFX CLASS ─── */
class CombatVFX {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.projectiles = [];
        this.flashes = [];
        this.extras = [];
        this._raf = null;
        this._running = false;
        this._lite = (window._valdoriaMinLoadFactor || 1) < 1 || !!window.vReducedMotion;
        this._dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (!this.canvas) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.canvas.width = w * this._dpr;
        this.canvas.height = h * this._dpr;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    }

    _center(el) {
        if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    _ensureRunning() {
        if (this._running) return;
        this._running = true;
        const tick = () => {
            if (!this._running) return;
            this._tick();
            if (this.particles.length || this.projectiles.length || this.flashes.length || this.extras.length) {
                this._raf = requestAnimationFrame(tick);
            } else {
                this._running = false;
            }
        };
        this._raf = requestAnimationFrame(tick);
    }

    _tick() {
        const ctx = this.ctx;
        const w = window.innerWidth;
        const h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);
        const now = performance.now();

        // Flashes (full-screen color overlay)
        for (let i = this.flashes.length - 1; i >= 0; i--) {
            const f = this.flashes[i];
            const t = (now - f.start) / f.duration;
            if (t >= 1) { this.flashes.splice(i, 1); continue; }
            ctx.save();
            ctx.globalAlpha = (1 - _easeOutCubic(t)) * f.alpha;
            ctx.fillStyle = f.color;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }

        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const t = Math.min((now - p.start) / p.duration, 1);
            if (t >= 1) {
                if (p.onImpact) p.onImpact();
                this.projectiles.splice(i, 1);
                continue;
            }
            const pos = this._getProjectilePos(p, t);
            // Trail particles
            const _trailCount = this._lite ? Math.ceil(p.prof.trail.count / 2) : p.prof.trail.count;
            if (_trailCount > 0 && Math.random() < 0.7) {
                for (let j = 0; j < _trailCount; j++) {
                    this._spawnTrailParticle(pos, p.prof);
                }
            }
            // Head
            this._drawHead(ctx, pos, p.prof, p.crit, t);
        }

        // Extra effects (rings, arcs, etc.)
        for (let i = this.extras.length - 1; i >= 0; i--) {
            const e = this.extras[i];
            const t = (now - e.start) / e.duration;
            if (t >= 1) { this.extras.splice(i, 1); continue; }
            e.draw(ctx, e.x, e.y, t, e);
        }

        // Particles
        const MAX_PARTICLES = this._lite ? 80 : 200;
        if (this.particles.length > MAX_PARTICLES) {
            this.particles.splice(0, this.particles.length - MAX_PARTICLES);
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            const age = now - p.born;
            if (age >= p.life) { this.particles.splice(i, 1); continue; }
            const t = age / p.life;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= p.friction;
            p.vy *= p.friction;
            const alpha = 1 - _easeInQuad(t);
            const size = p.size * (1 - t * 0.4);
            ctx.save();
            ctx.globalAlpha = alpha;
            if (p.glow && !this._lite) {
                ctx.globalCompositeOperation = 'lighter';
            }
            ctx.fillStyle = p.color;
            ctx.strokeStyle = p.color;
            this._drawShape(ctx, p.x, p.y, size, p.shape, p.angle + age * p.spin);
            ctx.restore();
        }
    }

    _drawShape(ctx, x, y, size, shape, angle) {
        switch (shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'triangle': {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle || 0);
                ctx.beginPath();
                ctx.moveTo(0, -size);
                ctx.lineTo(-size * 0.866, size * 0.5);
                ctx.lineTo(size * 0.866, size * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
                break;
            }
            case 'diamond': {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle || 0);
                ctx.beginPath();
                ctx.moveTo(0, -size);
                ctx.lineTo(size * 0.6, 0);
                ctx.lineTo(0, size);
                ctx.lineTo(-size * 0.6, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
                break;
            }
            case 'star': {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle || 0);
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                    const r = i === 0 ? size : size;
                    ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
                    const innerA = a + (2 * Math.PI) / 10;
                    ctx.lineTo(Math.cos(innerA) * size * 0.4, Math.sin(innerA) * size * 0.4);
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();
                break;
            }
            case 'ring':
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.lineWidth = Math.max(1, size * 0.3);
                ctx.stroke();
                break;
            case 'line': {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle || 0);
                ctx.lineWidth = Math.max(1, size * 0.4);
                ctx.beginPath();
                ctx.moveTo(-size, 0);
                ctx.lineTo(size, 0);
                ctx.stroke();
                ctx.restore();
                break;
            }
        }
    }

    _drawHead(ctx, pos, prof, isCrit, t) {
        const size = isCrit ? prof.head.size * 1.4 : prof.head.size;
        ctx.save();
        if (this._lite) {
            // Lite: no shadowBlur, just a filled circle + core
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.6 * (1 - t * 0.3);
            ctx.fillStyle = prof.colors[0];
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size * 0.8, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const glow = isCrit ? prof.head.glow * 1.5 : prof.head.glow;
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.5 * (1 - t * 0.3);
            ctx.shadowColor = prof.colors[0];
            ctx.shadowBlur = glow;
            ctx.fillStyle = prof.colors[0];
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        // Core
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = prof.colors[1] || prof.colors[0];
        this._drawShape(ctx, pos.x, pos.y, size * 0.5, prof.head.shape, t * 6);
        ctx.restore();
    }

    _spawnTrailParticle(pos, prof) {
        const color = prof.colors[Math.floor(Math.random() * prof.colors.length)];
        this.particles.push({
            x: pos.x + (Math.random() - 0.5) * 6,
            y: pos.y + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            gravity: 0.02,
            friction: prof.trail.decay,
            size: prof.trail.size * (0.6 + Math.random() * 0.4),
            life: 350 + Math.random() * 200,
            born: performance.now(),
            color,
            shape: 'circle',
            glow: true,
            angle: Math.random() * Math.PI * 2,
            spin: 0,
        });
    }

    _getProjectilePos(proj, t) {
        const et = _easeOutQuad(t);
        const x = proj.sx + (proj.tx - proj.sx) * et;
        let y = proj.sy + (proj.ty - proj.sy) * et;

        switch (proj.pathType) {
            case 'arc': {
                const arcHeight = Math.abs(proj.ty - proj.sy) * 0.5 + 40;
                y -= Math.sin(t * Math.PI) * arcHeight;
                break;
            }
            case 'jagged': {
                const jitter = (1 - t) * 20;
                const perpX = -(proj.ty - proj.sy);
                const perpY = proj.tx - proj.sx;
                const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
                const offset = Math.sin(t * 30) * jitter;
                return {
                    x: x + (perpX / len) * offset,
                    y: y + (perpY / len) * offset,
                };
            }
            case 'wave': {
                const perpX = -(proj.ty - proj.sy);
                const perpY = proj.tx - proj.sx;
                const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
                const offset = Math.sin(t * Math.PI * 4) * 15 * (1 - t);
                return {
                    x: x + (perpX / len) * offset,
                    y: y + (perpY / len) * offset,
                };
            }
        }
        return { x, y };
    }

    /* ─── PUBLIC API ─── */

    projectile(fromEl, toEl, damageType, opts) {
        if (!this.canvas) return;
        opts = opts || {};
        const from = this._center(fromEl);
        const to = this._center(toEl);
        const prof = VFX_PROFILES[damageType] || VFX_PROFILES.slashing;
        const duration = opts.crit ? prof.duration * 0.75 : prof.duration;
        this.projectiles.push({
            sx: from.x, sy: from.y, tx: to.x, ty: to.y,
            start: performance.now(), duration,
            prof, crit: !!opts.crit,
            pathType: prof.path,
            onImpact: () => {
                this._doImpact(to.x, to.y, prof, !!opts.crit);
                this.flash(prof.flashColor, 350);
            },
        });
        this._ensureRunning();
    }

    impact(targetEl, damageType, opts) {
        if (!this.canvas) return;
        opts = opts || {};
        const pos = this._center(targetEl);
        const prof = VFX_PROFILES[damageType] || VFX_PROFILES.slashing;
        this._doImpact(pos.x, pos.y, prof, !!opts.crit);
        this._ensureRunning();
    }

    miss(fromEl, toEl, damageType) {
        if (!this.canvas) return;
        const from = this._center(fromEl);
        const to = this._center(toEl);
        const prof = VFX_PROFILES[damageType] || VFX_PROFILES.slashing;
        // Projectile veers to the right of the target
        const offsetX = 50 + Math.random() * 30;
        const offsetY = -20 + Math.random() * 40;
        this.projectiles.push({
            sx: from.x, sy: from.y,
            tx: to.x + offsetX, ty: to.y + offsetY,
            start: performance.now(), duration: prof.duration,
            prof, crit: false,
            pathType: prof.path,
            onImpact: () => {
                // Small puff on miss — fewer particles, less dramatic
                const count = 5;
                for (let i = 0; i < count; i++) {
                    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
                    const speed = 1.5 + Math.random() * 1.5;
                    this.particles.push({
                        x: to.x + offsetX, y: to.y + offsetY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        gravity: 0.03, friction: 0.95,
                        size: 3 + Math.random() * 2,
                        life: 300 + Math.random() * 200,
                        born: performance.now(),
                        color: prof.colors[0],
                        shape: 'circle', glow: false,
                        angle: 0, spin: 0,
                    });
                }
            },
        });
        this._ensureRunning();
    }

    kill(targetEl, damageType) {
        if (!this.canvas) return;
        const rect = targetEl.getBoundingClientRect();
        const prof = VFX_PROFILES[damageType] || VFX_PROFILES.slashing;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const count = this._lite ? 20 : 40;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const speed = 2.5 + Math.random() * 5;
            const shape = prof.impact.shapes[Math.floor(Math.random() * prof.impact.shapes.length)];
            const color = prof.colors[Math.floor(Math.random() * prof.colors.length)];
            this.particles.push({
                x: cx + (Math.random() - 0.5) * rect.width * 0.8,
                y: cy + (Math.random() - 0.5) * rect.height * 0.5,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                gravity: -0.01, friction: 0.97,
                size: 5 + Math.random() * 6,
                life: 900 + Math.random() * 600,
                born: performance.now(),
                color, shape,
                glow: true,
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.08,
            });
        }
        this.flash(prof.flashColor, 500);
        this._ensureRunning();
    }

    heal(targetEl) {
        if (!this.canvas) return;
        const pos = this._center(targetEl);
        const colors = ['#40e060', '#80ff80', '#ffe080', '#ffffff'];
        const count = this._lite ? 10 : 20;
        for (let i = 0; i < count; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.particles.push({
                x: pos.x + (Math.random() - 0.5) * 50,
                y: pos.y + Math.random() * 10,
                vx: (Math.random() - 0.5) * 1,
                vy: -2 - Math.random() * 2.5,
                gravity: -0.01, friction: 0.98,
                size: 4 + Math.random() * 5,
                life: 800 + Math.random() * 400,
                born: performance.now(),
                color, shape: Math.random() > 0.5 ? 'star' : 'circle',
                glow: true,
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.03,
            });
        }
        // Soft golden center glow
        this.extras.push({
            x: pos.x, y: pos.y,
            start: performance.now(), duration: 600,
            draw: (ctx, x, y, t) => {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.4 * (1 - t);
                const r = 28 + t * 40;
                const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
                grad.addColorStop(0, '#ffe080');
                grad.addColorStop(1, 'rgba(255,224,128,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            },
        });
        this._ensureRunning();
    }

    buff(targetEl) {
        if (!this.canvas) return;
        const pos = this._center(targetEl);
        const colors = ['#ffd700', '#ffe680', '#ffffff', '#c4953a'];
        // Upward golden sparkles — shield/blessing effect
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const dist = 20 + Math.random() * 20;
            this.particles.push({
                x: pos.x + Math.cos(angle) * dist,
                y: pos.y + Math.sin(angle) * dist,
                vx: Math.cos(angle) * 0.5,
                vy: -1.5 - Math.random() * 2,
                gravity: -0.02, friction: 0.97,
                size: 3 + Math.random() * 4,
                life: 700 + Math.random() * 400,
                born: performance.now(),
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: Math.random() > 0.4 ? 'star' : 'diamond',
                glow: true,
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.04,
            });
        }
        // Golden ring expanding outward
        this.extras.push({
            x: pos.x, y: pos.y,
            start: performance.now(), duration: 500,
            draw: (ctx, x, y, t) => {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.5 * (1 - t);
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 2.5 * (1 - t);
                ctx.beginPath();
                ctx.arc(x, y, 10 + t * 50, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            },
        });
        this._ensureRunning();
    }

    debuff(targetEl) {
        if (!this.canvas) return;
        const pos = this._center(targetEl);
        const colors = ['#9040c0', '#c060e0', '#ff4060', '#802060'];
        // Inward-collapsing dark particles — curse/poison effect
        for (let i = 0; i < 14; i++) {
            const angle = (i / 14) * Math.PI * 2;
            const dist = 40 + Math.random() * 15;
            this.particles.push({
                x: pos.x + Math.cos(angle) * dist,
                y: pos.y + Math.sin(angle) * dist,
                vx: -Math.cos(angle) * 1.5,
                vy: -Math.sin(angle) * 1.5,
                gravity: 0, friction: 0.95,
                size: 3 + Math.random() * 3,
                life: 600 + Math.random() * 300,
                born: performance.now(),
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: Math.random() > 0.5 ? 'triangle' : 'circle',
                glow: true,
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.06,
            });
        }
        // Dark implosion pulse
        this.extras.push({
            x: pos.x, y: pos.y,
            start: performance.now(), duration: 400,
            draw: (ctx, x, y, t) => {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.35 * (1 - t);
                const r = 40 * (1 - t) + 5;
                const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
                grad.addColorStop(0, 'rgba(160,60,200,0.4)');
                grad.addColorStop(1, 'rgba(160,60,200,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            },
        });
        this._ensureRunning();
    }

    flash(color, duration) {
        if (!this.canvas) return;
        duration = duration || 350;
        this.flashes.push({
            color: color || 'rgba(255,60,30,0.3)',
            start: performance.now(),
            duration,
            alpha: 1,
        });
        this._ensureRunning();
    }

    /* ─── IMPACT GENERATOR ─── */

    _doImpact(x, y, prof, isCrit) {
        let count = isCrit ? Math.floor(prof.impact.count * 1.5) : prof.impact.count;
        if (this._lite) count = Math.ceil(count * 0.5);
        const speedMul = isCrit ? 1.3 : 1;

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
            const speed = (prof.impact.speed + Math.random() * 1.5) * speedMul;
            const shape = prof.impact.shapes[Math.floor(Math.random() * prof.impact.shapes.length)];
            const color = prof.colors[Math.floor(Math.random() * prof.colors.length)];
            this.particles.push({
                x: x + (Math.random() - 0.5) * 12,
                y: y + (Math.random() - 0.5) * 12,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: prof.impact.gravity,
                friction: 0.96,
                size: (isCrit ? 7 : 5) + Math.random() * 4,
                life: prof.impact.life + Math.random() * 200,
                born: performance.now(),
                color, shape,
                glow: true,
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.06,
            });
        }

        // Extra effects (disabled in lite mode — too many canvas draw calls)
        if (prof.extra && !this._lite) {
            this._spawnExtra(x, y, prof.extra, prof, isCrit);
        }
    }

    _spawnExtra(x, y, type, prof, isCrit) {
        const scale = isCrit ? 1.6 : 1.2;
        switch (type) {
            case 'flame_ring':
                this.extras.push({
                    x, y, start: performance.now(), duration: 600,
                    draw: (ctx, ex, ey, t) => {
                        ctx.save();
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.globalAlpha = 0.6 * (1 - t);
                        ctx.strokeStyle = prof.colors[0];
                        ctx.lineWidth = Math.max(1.5, (5 - t * 4) * scale);
                        ctx.beginPath();
                        ctx.arc(ex, ey, (14 + t * 70) * scale, 0, Math.PI * 2);
                        ctx.stroke();
                        // Inner ring
                        ctx.globalAlpha = 0.35 * (1 - t);
                        ctx.strokeStyle = prof.colors[1];
                        ctx.lineWidth = Math.max(1, (3 - t * 2.5) * scale);
                        ctx.beginPath();
                        ctx.arc(ex, ey, (8 + t * 45) * scale, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();
                    },
                });
                break;

            case 'ice_shatter':
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI * 2 * i) / 6;
                    const s = performance.now();
                    this.extras.push({
                        x, y, start: s, duration: 500,
                        _angle: angle, _scale: scale,
                        draw: (ctx, ex, ey, t, e) => {
                            ctx.save();
                            ctx.globalAlpha = 1 - _easeInQuad(t);
                            ctx.fillStyle = '#a0e0ff';
                            const dist = t * 55 * e._scale;
                            const px = ex + Math.cos(e._angle) * dist;
                            const py = ey + Math.sin(e._angle) * dist;
                            ctx.translate(px, py);
                            ctx.rotate(e._angle + t * 2);
                            const sz = 9 * e._scale * (1 - t * 0.5);
                            ctx.beginPath();
                            ctx.moveTo(0, -sz);
                            ctx.lineTo(sz * 0.5, 0);
                            ctx.lineTo(0, sz);
                            ctx.lineTo(-sz * 0.5, 0);
                            ctx.closePath();
                            ctx.fill();
                            ctx.restore();
                        },
                    });
                }
                break;

            case 'electric_arcs':
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 * i) / 5 + (Math.random() - 0.5) * 0.5;
                    const len = (40 + Math.random() * 30) * scale;
                    const segments = [];
                    const segCount = 5;
                    for (let s = 0; s <= segCount; s++) {
                        const st = s / segCount;
                        segments.push({
                            x: Math.cos(angle) * len * st + (Math.random() - 0.5) * 10,
                            y: Math.sin(angle) * len * st + (Math.random() - 0.5) * 10,
                        });
                    }
                    this.extras.push({
                        x, y, start: performance.now(), duration: 400,
                        _segs: segments,
                        draw: (ctx, ex, ey, t, e) => {
                            ctx.save();
                            ctx.globalCompositeOperation = 'lighter';
                            ctx.globalAlpha = (1 - t) * 0.8;
                            ctx.strokeStyle = '#ffe040';
                            ctx.lineWidth = Math.max(1.5, 3 * (1 - t));
                            ctx.beginPath();
                            ctx.moveTo(ex, ey);
                            e._segs.forEach(s => ctx.lineTo(ex + s.x, ey + s.y));
                            ctx.stroke();
                            // Bright core
                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = Math.max(1, 1.5 * (1 - t));
                            ctx.beginPath();
                            ctx.moveTo(ex, ey);
                            e._segs.forEach(s => ctx.lineTo(ex + s.x, ey + s.y));
                            ctx.stroke();
                            ctx.restore();
                        },
                    });
                }
                break;

            case 'shockwave':
                this.extras.push({
                    x, y, start: performance.now(), duration: 500,
                    draw: (ctx, ex, ey, t) => {
                        ctx.save();
                        ctx.globalAlpha = 0.5 * (1 - t);
                        ctx.strokeStyle = prof.colors[0];
                        ctx.lineWidth = Math.max(1.5, 4 * (1 - t) * scale);
                        ctx.beginPath();
                        ctx.arc(ex, ey, (12 + t * 80) * scale, 0, Math.PI * 2);
                        ctx.stroke();
                        // Second ring
                        ctx.globalAlpha = 0.35 * (1 - t);
                        ctx.lineWidth = Math.max(1, 2.5 * (1 - t) * scale);
                        ctx.beginPath();
                        ctx.arc(ex, ey, (6 + t * 55) * scale, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();
                    },
                });
                break;

            case 'implosion': {
                // Phase 1: particles rush inward (0-0.5), Phase 2: burst outward (0.5-1)
                this.extras.push({
                    x, y, start: performance.now(), duration: 600,
                    draw: (ctx, ex, ey, t) => {
                        ctx.save();
                        ctx.globalCompositeOperation = 'lighter';
                        if (t < 0.5) {
                            // Inward collapse
                            const it = t / 0.5;
                            ctx.globalAlpha = 0.4 * (1 - it);
                            ctx.fillStyle = prof.colors[0];
                            const r = (55 - it * 48) * scale;
                            ctx.beginPath();
                            ctx.arc(ex, ey, r, 0, Math.PI * 2);
                            ctx.fill();
                        } else {
                            // Outward burst
                            const bt = (t - 0.5) / 0.5;
                            ctx.globalAlpha = 0.6 * (1 - bt);
                            ctx.strokeStyle = prof.colors[1] || prof.colors[0];
                            ctx.lineWidth = Math.max(1.5, 4 * (1 - bt) * scale);
                            ctx.beginPath();
                            ctx.arc(ex, ey, bt * 70 * scale, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                        ctx.restore();
                    },
                });
                break;
            }

            case 'light_burst':
                this.extras.push({
                    x, y, start: performance.now(), duration: 500,
                    draw: (ctx, ex, ey, t) => {
                        ctx.save();
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.globalAlpha = 0.6 * (1 - _easeOutCubic(t));
                        const r = (8 + t * 70) * scale;
                        const grad = ctx.createRadialGradient(ex, ey, 0, ex, ey, r);
                        grad.addColorStop(0, '#ffffff');
                        grad.addColorStop(0.4, '#ffe080');
                        grad.addColorStop(1, 'rgba(255,224,128,0)');
                        ctx.fillStyle = grad;
                        ctx.beginPath();
                        ctx.arc(ex, ey, r, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    },
                });
                break;
        }
    }

    destroy() {
        if (this._raf) cancelAnimationFrame(this._raf);
        this._running = false;
        this.particles = [];
        this.projectiles = [];
        this.flashes = [];
        this.extras = [];
    }
}

/* ─── AUTO-INIT ─── */
window._combatVfx = null;
document.addEventListener('DOMContentLoaded', () => {
    const c = document.getElementById('vfxCanvas');
    if (c) window._combatVfx = new CombatVFX('vfxCanvas');
});

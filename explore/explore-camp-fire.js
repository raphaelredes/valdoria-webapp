/**
 * explore-camp-fire.js — Canvas 2D particle fire system
 *
 * Renders an additive-blended campfire using a configurable particle count
 * that respects the device performance tier (lite / medium / full).
 *
 * Usage:
 *   CampFire.init(canvasElement);   // starts animation
 *   CampFire.destroy();             // stops and cleans up
 *
 * Exported on window.CampFire.
 */

(function () {
    'use strict';

    // ── Performance tier particle counts ─────────────────────────────────
    // X-6.5.51BS (2026-05-15): density +40% pra base mais densa de chama
    // (user reportou "falta mais chama na base"). 55→78, 35→50, 20→30.
    var TIER_COUNTS = { full: 78, medium: 50, lite: 30 };

    // ── Internal state ───────────────────────────────────────────────────
    var _canvas = null;
    var _ctx = null;
    var _rafId = null;
    var _particles = [];
    var _W = 160;
    var _H = 160;
    var _baseSize = 0;

    // ── Particle constructor ─────────────────────────────────────────────

    /**
     * A single fire particle.  Born at the bottom-centre of the canvas
     * inside an elliptical spawn zone and rises with random horizontal drift.
     *
     * @param {number}  W         Canvas width
     * @param {number}  H         Canvas height
     * @param {number}  baseSize  Reference radius (derived from canvas size)
     * @param {boolean} init      true → randomise life so particles stagger
     */
    function Particle(W, H, baseSize, init) {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 0;
        this.maxLife = 0;
        this.size = 0;
        this.windX = 0;
        this.reset(W, H, baseSize, init);
    }

    Particle.prototype.reset = function (W, H, baseSize, init) {
        // X-6.5.51BS (2026-05-15): zona de spawn AMPLIADA pra base mais larga
        // de chama (user pediu "mais chama na base"). 0.14 → 0.22 raio elíptico.
        var angle = Math.random() * Math.PI * 2;
        var rx = Math.random() * (W * 0.22);          // antes 0.14
        this.x = W * 0.5 + Math.cos(angle) * rx;
        this.y = H - (H * 0.11) + Math.random() * (H * 0.04);
        this.x0 = this.x;

        // X-6.5.51BS: velocidades reduzidas AINDA MAIS (user ainda reportou
        // "muito rápido"). vy total -33% da versão anterior; maxLife +50%.
        // Velocity — mostly upward with slight drift
        this.vx = (Math.random() - 0.5) * 0.20;       // antes 0.30
        this.vy = -(Math.random() * 0.55 + 0.20);     // antes -(0.85+0.35); range -0.20 a -0.75

        // Life: stagger on first spawn so they don't all appear at once
        this.life = init ? Math.random() * 110 : 0;   // antes *70
        this.maxLife = 110 + Math.random() * 60;      // antes 70+*40; range 110-170

        // X-6.5.51BS: TAMANHO BASE MAIOR pras partículas novas (mais densidade
        // de chama na base). Curva 1.3-2.6 baseSize → muito mais "corpo".
        this.size = baseSize * (1.3 + Math.random() * 1.3);

        // Persistent micro-wind per particle (turbulência reduzida)
        this.windX = (Math.random() - 0.5) * 0.018;    // antes 0.025

        // Sway sinusoidal — frequência reduzida pra movimento mais calmo
        this.swayAmp = 0.4 + Math.random() * 0.6;
        this.swayFreq = 0.04 + Math.random() * 0.03;   // antes 0.06+0.04 (mais lento)
        this.swayPhase = Math.random() * Math.PI * 2;
    };

    // ── Pre-rendered soft flame textures (zero GC overhead in animation loop) ──
    var _spriteCore = null;
    var _spriteFlame = null;
    var _spriteEmber = null;

    function _buildSprites() {
        var sz = 64;
        var half = sz * 0.5;

        // 1. Core Sprite: Núcleo incandescente branco -> ouro
        var c1 = document.createElement('canvas');
        c1.width = sz; c1.height = sz;
        var ctx1 = c1.getContext('2d');
        var g1 = ctx1.createRadialGradient(half, half, 0, half, half, half);
        g1.addColorStop(0, 'rgba(255, 255, 245, 1.0)');
        g1.addColorStop(0.2, 'rgba(255, 235, 140, 0.9)');
        g1.addColorStop(0.5, 'rgba(255, 150, 20, 0.45)');
        g1.addColorStop(0.8, 'rgba(230, 60, 0, 0.12)');
        g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx1.fillStyle = g1;
        ctx1.fillRect(0, 0, sz, sz);
        _spriteCore = c1;

        // 2. Flame Sprite: Ouro brilhante -> laranja vivo -> rubro
        var c2 = document.createElement('canvas');
        c2.width = sz; c2.height = sz;
        var ctx2 = c2.getContext('2d');
        var g2 = ctx2.createRadialGradient(half, half, 0, half, half, half);
        g2.addColorStop(0, 'rgba(255, 205, 50, 0.95)');
        g2.addColorStop(0.25, 'rgba(255, 120, 15, 0.7)');
        g2.addColorStop(0.6, 'rgba(215, 45, 0, 0.25)');
        g2.addColorStop(0.85, 'rgba(130, 15, 0, 0.06)');
        g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx2.fillStyle = g2;
        ctx2.fillRect(0, 0, sz, sz);
        _spriteFlame = c2;

        // 3. Ember Sprite: Vermelho rubro -> brasa residual
        var c3 = document.createElement('canvas');
        c3.width = sz; c3.height = sz;
        var ctx3 = c3.getContext('2d');
        var g3 = ctx3.createRadialGradient(half, half, 0, half, half, half);
        g3.addColorStop(0, 'rgba(255, 100, 15, 0.7)');
        g3.addColorStop(0.35, 'rgba(190, 30, 0, 0.35)');
        g3.addColorStop(0.7, 'rgba(90, 10, 0, 0.1)');
        g3.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx3.fillStyle = g3;
        ctx3.fillRect(0, 0, sz, sz);
        _spriteEmber = c3;
    }

    /**
     * Advance one frame. Returns true when the particle has expired.
     */
    Particle.prototype.update = function () {
        this.x += this.vx;
        this.y += this.vy;
        this.vx += this.windX + (Math.random() - 0.5) * 0.02;
        this.vy -= 0.003;
        // Sway sinusoidal suave para ondulação natural e fluida
        this.x += Math.sin(this.life * this.swayFreq + this.swayPhase) * this.swayAmp * 0.15;
        this.life++;
        return this.life >= this.maxLife;
    };

    /**
     * Renderiza a partícula usando textura pré-renderizada e blend aditivo.
     * 100% fluído a 60 FPS, sem círculos toscos e com fusão orgânica de calor.
     */
    Particle.prototype.draw = function (ctx) {
        var t = this.life / this.maxLife;
        var sizeCurve;
        if (t < 0.1) sizeCurve = 0.9 + t * 2.0;
        else sizeCurve = 1.1 - Math.pow((t - 0.1) / 0.9, 1.5) * 0.85;
        var r = this.size * sizeCurve;
        if (r < 0.6) return;

        var alpha;
        if (t < 0.08) {
            alpha = 0.4 + (t / 0.08) * 0.55;
        } else if (t < 0.35) {
            alpha = 0.95 - (t - 0.08) * 0.4;
        } else {
            var fadeT = (t - 0.35) / 0.65;
            alpha = 0.84 * (1 - fadeT * fadeT);
        }
        if (alpha <= 0.005) return;

        // Ondulação de calor ascendente sutil
        var heatPos = (this.y / _H);
        var heatDx = Math.sin(this.life * 0.07 + this.swayPhase) * (1 - heatPos) * 1.1;
        var drawX = this.x + heatDx;

        // Alongamento vertical suave da chama
        var stretch = 1.6 + (1 - t) * 0.7;
        var w = r * 1.7;
        var h = r * stretch * 1.7;

        // Transição de sprites por estágio de combustão
        var sprite;
        if (t < 0.22) {
            sprite = _spriteCore;
        } else if (t < 0.65) {
            sprite = _spriteFlame;
        } else {
            sprite = _spriteEmber;
        }

        ctx.globalAlpha = Math.min(1, alpha);
        ctx.drawImage(sprite, drawX - w * 0.5, this.y - h * 0.5, w, h);
    };

    // ── Animation loop ───────────────────────────────────────────────────

    function _frame() {
        if (!_ctx) return;

        // Clear canvas
        _ctx.clearRect(0, 0, _W, _H);

        // Additive blending: partículas sobrepostas criam núcleo quente brilhante
        _ctx.globalCompositeOperation = 'lighter';

        // Brilho quente basal sutil na fogueira
        var time = performance.now() * 0.0025;
        var baseCenterX = _W * 0.5;
        var baseCenterY = _H - (_H * 0.12);
        var basePulse = 1.0 + Math.sin(time * 3.2) * 0.08;
        if (_spriteCore) {
            _ctx.globalAlpha = 0.45 * basePulse;
            var bW = 60 * basePulse;
            var bH = 26 * basePulse;
            _ctx.drawImage(_spriteFlame, baseCenterX - bW * 0.5, baseCenterY - bH * 0.5, bW, bH);
        }

        var i, dead;
        for (i = 0; i < _particles.length; i++) {
            dead = _particles[i].update();
            if (dead) {
                _particles[i].reset(_W, _H, _baseSize, false);
            }
            _particles[i].draw(_ctx);
        }

        // Restaura transparência padrão
        _ctx.globalAlpha = 1.0;
        _ctx.globalCompositeOperation = 'source-over';

        _rafId = requestAnimationFrame(_frame);
    }

    // ── Resolve particle count from performance tier ─────────────────────

    function _getParticleCount() {
        var tier = window._valdoriaPerformanceTier || 'full';
        var count = TIER_COUNTS[tier];
        if (typeof count !== 'number') {
            count = TIER_COUNTS.full;
        }
        return count;
    }

    // ── Public API ───────────────────────────────────────────────────────

    /**
     * Initialise the campfire on the given <canvas> element.
     * Reads the canvas width/height for layout and starts the
     * requestAnimationFrame loop.
     *
     * @param {HTMLCanvasElement} canvas
     */
    function init(canvas) {
        if (!canvas || !canvas.getContext) {
            console.error('[CAMP-FIRE] init called without a valid canvas element');
            return;
        }

        // Clean up any previous instance
        destroy();

        _canvas = canvas;
        _ctx = _canvas.getContext('2d');
        _W = _canvas.width || 160;
        _H = _canvas.height || 160;

        if (!_spriteCore) {
            _buildSprites();
        }

        // Base particle size scales with canvas (reference: 160px → ~3.5)
        _baseSize = Math.max(1.5, (_W / 160) * 3.5);

        var count = _getParticleCount();
        _particles = [];
        for (var i = 0; i < count; i++) {
            _particles.push(new Particle(_W, _H, _baseSize, true));
        }

        console.log('[CAMP-FIRE] init — tier=%s particles=%s canvas=%sx%s',
            window._valdoriaPerformanceTier || 'full', count, _W, _H);

        _rafId = requestAnimationFrame(_frame);
    }

    /**
     * Stop the animation loop and release all references.
     */
    function destroy() {
        if (_rafId !== null) {
            cancelAnimationFrame(_rafId);
            _rafId = null;
        }
        _particles = [];
        _ctx = null;
        _canvas = null;
    }

    // ── Export ────────────────────────────────────────────────────────────
    window.CampFire = {
        init: init,
        destroy: destroy
    };

})();

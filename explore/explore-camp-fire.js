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
    var TIER_COUNTS = { full: 55, medium: 35, lite: 20 };

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
        // Elliptical spawn at bottom centre
        var angle = Math.random() * Math.PI * 2;
        var rx = Math.random() * (W * 0.14);
        this.x = W * 0.5 + Math.cos(angle) * rx;
        this.y = H - (H * 0.11) + Math.random() * (H * 0.04);
        // Spawn x reference pra sway sinusoidal (X-6.5.51BQ 2026-05-15)
        this.x0 = this.x;

        // X-6.5.51BQ (2026-05-15): velocidades reduzidas pra animação mais
        // realista (user reportou "muito acelerado"). vy ~50% mais lenta,
        // maxLife ~2x maior — partícula sobe mais devagar e vive mais.
        // Velocity — mostly upward with slight drift
        this.vx = (Math.random() - 0.5) * 0.30;       // antes 0.6
        this.vy = -(Math.random() * 0.85 + 0.35);     // antes -(1.8+0.6); range -0.35 a -1.20

        // Life: stagger on first spawn so they don't all appear at once
        this.life = init ? Math.random() * 70 : 0;    // antes *40
        this.maxLife = 70 + Math.random() * 40;       // antes 32 + *22; range 70-110

        // Size proportional to canvas
        this.size = baseSize + Math.random() * (baseSize * 1.4);

        // Persistent micro-wind per particle
        this.windX = (Math.random() - 0.5) * 0.025;    // antes 0.05

        // X-6.5.51BQ: sway sinusoidal (oscilação horizontal natural).
        // Fase e amplitude aleatórias por partícula pra organicidade.
        this.swayAmp = 0.4 + Math.random() * 0.6;     // amplitude em pixels
        this.swayFreq = 0.06 + Math.random() * 0.04;  // freq (rad/frame)
        this.swayPhase = Math.random() * Math.PI * 2;
    };

    /**
     * Advance one frame.  Returns true when the particle has expired and
     * needs to be reset.
     *
     * X-6.5.51BQ: vy decay reduzido pra metade (0.004 vs 0.008) — acelera
     * MUITO devagar conforme sobe (vela acendida natural). Sway horizontal
     * sin-based pra movimento orgânico de flame.
     */
    Particle.prototype.update = function () {
        this.x += this.vx;
        this.y += this.vy;
        this.vx += this.windX + (Math.random() - 0.5) * 0.05;  // antes 0.12 (turbulência reduzida)
        this.vy -= 0.004;                                       // antes 0.008
        // Sway sinusoidal — adiciona oscilação horizontal sem afetar vx persistente
        this.x += Math.sin(this.life * this.swayFreq + this.swayPhase) * this.swayAmp * 0.15;
        this.life++;
        return this.life >= this.maxLife;
    };

    /**
     * X-6.5.51BQ (2026-05-15): paleta refinada — núcleo mais brilhante
     * (quase branco puro), transição mais suave entre estágios, brasas
     * mais escuras no fim pra contraste. Curva de alpha não-linear pra
     * pico de brilho próximo do nascimento e fade gradual.
     *
     *   0–10 %  branco puro     (núcleo hot — incandescente)
     *  10–30 %  branco → ouro   (transição rápida)
     *  30–55 %  ouro → laranja vivo
     *  55–80 %  laranja → vermelho rubro
     *  80–100% vermelho escuro → preto-cinza (cinza/smoke)
     */
    Particle.prototype.draw = function (ctx) {
        var t = this.life / this.maxLife;
        // Tamanho com curva mais natural — pico no meio, encolhe no fim.
        var sizeCurve = 1 - Math.pow(t, 2.2) * 0.78;
        var r = this.size * sizeCurve;
        if (r < 0.5) return;

        // Alpha — não-linear: brilho cresce rápido até t=0.1, depois fade longo.
        var alpha;
        if (t < 0.1) {
            alpha = 0.6 + t * 1.5;  // 0.6 → 0.75 (forte e crescendo)
        } else {
            // Fade quadrático a partir de t=0.1
            var fadeT = (t - 0.1) / 0.9;
            alpha = 0.75 * (1 - fadeT * fadeT);
        }
        var cr, cg, cb;

        if (t < 0.10) {
            // Núcleo branco puro incandescente
            cr = 255;
            cg = 252 - t * 100;        // 252 → 242
            cb = 230 - t * 600;        // 230 → 170
        } else if (t < 0.30) {
            // Branco → ouro brilhante
            var p1 = (t - 0.10) / 0.20;
            cr = 255;
            cg = Math.max(190, 240 - p1 * 60);   // 240 → 190
            cb = Math.max(70, 170 - p1 * 110);   // 170 → 70
        } else if (t < 0.55) {
            // Ouro → laranja vivo
            var p2 = (t - 0.30) / 0.25;
            cr = 255;
            cg = Math.max(90, 190 - p2 * 110);   // 190 → 90
            cb = Math.max(20, 70 - p2 * 60);     // 70 → 20
        } else if (t < 0.80) {
            // Laranja → vermelho rubro
            var p3 = (t - 0.55) / 0.25;
            cr = Math.max(160, 255 - p3 * 80);   // 255 → 160
            cg = Math.max(30, 90 - p3 * 60);     // 90 → 30
            cb = Math.max(10, 20 - p3 * 15);     // 20 → 10
        } else {
            // Vermelho rubro → cinza-preto (smoke residual)
            var p4 = (t - 0.80) / 0.20;
            cr = Math.max(40, 160 - p4 * 110);   // 160 → 40
            cg = Math.max(20, 30 - p4 * 12);     // 30 → 20
            cb = Math.max(15, 10 + p4 * 8);      // 10 → 18 (toque azulado de smoke)
            alpha *= (1 - p4 * 0.8);
        }

        ctx.fillStyle = 'rgba(' + ~~cr + ',' + ~~cg + ',' + ~~cb + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fill();
    };

    // ── Animation loop ───────────────────────────────────────────────────

    function _frame() {
        if (!_ctx) return;

        // Clear canvas (full transparent)
        _ctx.clearRect(0, 0, _W, _H);

        // Additive blending for fire glow
        _ctx.globalCompositeOperation = 'lighter';

        var i, dead;
        for (i = 0; i < _particles.length; i++) {
            dead = _particles[i].update();
            if (dead) {
                _particles[i].reset(_W, _H, _baseSize, false);
            }
            _particles[i].draw(_ctx);
        }

        // Restore default composite mode
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

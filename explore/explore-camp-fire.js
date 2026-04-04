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

        // Velocity — mostly upward with slight drift
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = -(Math.random() * 1.8 + 0.6);

        // Life: stagger on first spawn so they don't all appear at once
        this.life = init ? Math.random() * 40 : 0;
        this.maxLife = 32 + Math.random() * 22;

        // Size proportional to canvas
        this.size = baseSize + Math.random() * (baseSize * 1.4);

        // Persistent micro-wind per particle
        this.windX = (Math.random() - 0.5) * 0.05;
    };

    /**
     * Advance one frame.  Returns true when the particle has expired and
     * needs to be reset.
     */
    Particle.prototype.update = function () {
        this.x += this.vx;
        this.y += this.vy;
        this.vx += this.windX + (Math.random() - 0.5) * 0.12;
        this.vy -= 0.008;
        this.life++;
        return this.life >= this.maxLife;
    };

    /**
     * Draw the particle with a colour gradient that moves through its life:
     *   0–15 %  white-gold  (young / hot core)
     *  15–40 %  gold → orange
     *  40–70 %  orange → dark red
     *  70–100%  dark red → fade out
     */
    Particle.prototype.draw = function (ctx) {
        var t = this.life / this.maxLife;
        var r = this.size * (1 - t * 0.75);
        if (r < 0.5) return;

        var alpha = Math.max(0, (1 - t) * 0.55);
        var cr, cg, cb;

        if (t < 0.15) {
            // White-gold core
            cr = 255;
            cg = 240 - t * 400;
            cb = 200 - t * 1000;
        } else if (t < 0.4) {
            // Gold → orange
            var p1 = (t - 0.15) / 0.25;
            cr = 255;
            cg = Math.max(60, 180 - p1 * 150);
            cb = Math.max(0, 50 - p1 * 60);
        } else if (t < 0.7) {
            // Orange → dark red
            var p2 = (t - 0.4) / 0.3;
            cr = Math.max(100, 255 - p2 * 120);
            cg = Math.max(20, 60 - p2 * 50);
            cb = 0;
        } else {
            // Dark red → fade out
            var p3 = (t - 0.7) / 0.3;
            cr = Math.max(60, 135 - p3 * 80);
            cg = Math.max(5, 20 - p3 * 20);
            cb = 0;
            alpha *= (1 - p3);
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

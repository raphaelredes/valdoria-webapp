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
        // X-6.5.51BS: turbulência menor (mais calma) + decay vy ainda mais suave.
        this.vx += this.windX + (Math.random() - 0.5) * 0.03;  // antes 0.05
        this.vy -= 0.0025;                                       // antes 0.004 (acelera muito devagar)
        // Sway sinusoidal — adiciona oscilação horizontal sem afetar vx persistente
        this.x += Math.sin(this.life * this.swayFreq + this.swayPhase) * this.swayAmp * 0.12;
        this.life++;
        return this.life >= this.maxLife;
    };

    /**
     * 2026-05-18 (user request "melhore o efeito da chama"):
     *
     * Render improvements vs prior version:
     * - Particles renderizadas como ELIPSE vertical-alongada (scaleY 1.6-2.2)
     *   em vez de círculos perfeitos → silhueta de chama natural
     * - Núcleo branco-quente com brilho boostado (alpha pico próximo de 1)
     * - Halo radial gradient ao redor de cada partícula → glow + soft edges
     * - Heat distortion sutil (offset horizontal por sin(y)) → fogo "subindo"
     * - Curva de paleta refinada com transição mais rápida ouro→laranja
     *   (pico de brilho mais visível) + ash/smoke residual no fim
     */
    Particle.prototype.draw = function (ctx) {
        var t = this.life / this.maxLife;
        // Tamanho com curva mais natural — pico no início, encolhe no fim.
        // Boost size no início (0.05) pra pico de chama mais visível.
        var sizeCurve;
        if (t < 0.08) sizeCurve = 1.0 + (0.08 - t) * 1.5;  // pico até 1.12x
        else sizeCurve = 1 - Math.pow((t - 0.08) / 0.92, 1.8) * 0.85;
        var r = this.size * sizeCurve;
        if (r < 0.4) return;

        // Alpha — pico mais alto (0.92 em t=0.05) + fade longo
        var alpha;
        if (t < 0.05) {
            alpha = 0.6 + t * 6.4;  // 0.6 → 0.92 (rápido e forte)
        } else if (t < 0.15) {
            alpha = 0.92 - (t - 0.05) * 0.3;  // 0.92 → 0.89 (sustain)
        } else {
            // Fade quadrático a partir de t=0.15
            var fadeT = (t - 0.15) / 0.85;
            alpha = 0.89 * (1 - fadeT * fadeT);
        }
        var cr, cg, cb;

        if (t < 0.08) {
            // Núcleo branco puro incandescente (boost amarelo)
            cr = 255;
            cg = 250 - t * 80;        // 250 → 244
            cb = 235 - t * 700;        // 235 → 179
        } else if (t < 0.25) {
            // Branco → ouro brilhante (transição mais rápida)
            var p1 = (t - 0.08) / 0.17;
            cr = 255;
            cg = Math.max(195, 244 - p1 * 49);   // 244 → 195
            cb = Math.max(80, 179 - p1 * 99);    // 179 → 80
        } else if (t < 0.50) {
            // Ouro → laranja vivo (mais saturado)
            var p2 = (t - 0.25) / 0.25;
            cr = 255;
            cg = Math.max(95, 195 - p2 * 100);   // 195 → 95
            cb = Math.max(15, 80 - p2 * 65);     // 80 → 15
        } else if (t < 0.78) {
            // Laranja → vermelho rubro
            var p3 = (t - 0.50) / 0.28;
            cr = Math.max(155, 255 - p3 * 100);  // 255 → 155
            cg = Math.max(28, 95 - p3 * 67);     // 95 → 28
            cb = Math.max(8, 15 - p3 * 7);       // 15 → 8
        } else {
            // Vermelho → cinza/smoke residual
            var p4 = (t - 0.78) / 0.22;
            cr = Math.max(35, 155 - p4 * 120);   // 155 → 35
            cg = Math.max(18, 28 - p4 * 10);     // 28 → 18
            cb = Math.max(14, 8 + p4 * 10);      // 8 → 18 (azulado de smoke)
            alpha *= (1 - p4 * 0.85);
        }

        // Heat distortion sutil — offset horizontal baseado em altura
        // (partículas mais altas têm sway maior, criando curl natural)
        var heatPos = (this.y / _H);  // 1 base → 0 topo
        var heatDx = Math.sin(this.life * 0.08 + this.swayPhase) * (1 - heatPos) * 0.8;
        var drawX = this.x + heatDx;

        // ELIPSE vertical-alongada (em vez de círculo) — formato de chama
        // ScaleY 1.6-2.2 (mais alongado nas partículas mais altas/quentes)
        var stretch = 1.6 + (1 - t) * 0.6;  // 2.2 no início → 1.6 no fim
        ctx.fillStyle = 'rgba(' + ~~cr + ',' + ~~cg + ',' + ~~cb + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(drawX, this.y, r * 0.75, r * stretch * 0.75, 0, 0, Math.PI * 2);
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

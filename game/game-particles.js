/* ═══════════════════════════════════════════════════════════════
   GAME HUB — Ambient Particle System (Canvas)
   Lightweight particles per location context. Max 15 particles.
   ═══════════════════════════════════════════════════════════════ */

let _particleCanvas = null;
let _particleCtx = null;
let _particles = [];
let _particleRafId = null;
let _particleTheme = null;

// Particle themes per location keyword
const PARTICLE_THEMES = {
    cidade:   { color: [196, 149, 58], count: 10, speed: 0.3, size: [1, 2.5], drift: 0.15, glow: true },
    taverna:  { color: [220, 140, 50], count: 12, speed: 0.5, size: [1.5, 3], drift: 0.1, glow: true },
    templo:   { color: [220, 200, 120], count: 8, speed: 0.2, size: [1, 2], drift: 0.2, glow: true },
    mercado:  { color: [196, 149, 58], count: 8, speed: 0.25, size: [1, 2], drift: 0.3, glow: false },
    combat:   {
    // backward compat alias
    arena:    { color: [180, 60, 60], count: 10, speed: 0.6, size: [1, 2.5], drift: 0.05, glow: true },
    guilda:   { color: [160, 140, 100], count: 8, speed: 0.3, size: [1, 2], drift: 0.15, glow: false },
    banco:    { color: [196, 169, 88], count: 6, speed: 0.15, size: [1, 1.5], drift: 0.1, glow: true },
    floresta: { color: [80, 160, 80], count: 10, speed: 0.2, size: [1, 2], drift: 0.25, glow: false },
    default:  { color: [196, 149, 58], count: 6, speed: 0.2, size: [1, 2], drift: 0.15, glow: false },
};

function initParticles() {
    _particleCanvas = document.getElementById('ambient-particles');
    if (!_particleCanvas) return;
    _particleCtx = _particleCanvas.getContext('2d');
    _resizeParticleCanvas();
    window.addEventListener('resize', _resizeParticleCanvas);
}

function _resizeParticleCanvas() {
    if (!_particleCanvas) return;
    _particleCanvas.width = Math.min(430, window.innerWidth);
    _particleCanvas.height = window.innerHeight;
}

function updateParticleTheme(screenText) {
    if (!_particleCtx) return;

    const text = (screenText || '').toLowerCase();
    let theme = null;

    // Match location keywords
    for (const [key, t] of Object.entries(PARTICLE_THEMES)) {
        if (key !== 'default' && text.includes(key)) {
            theme = t;
            break;
        }
    }
    if (!theme) theme = PARTICLE_THEMES.default;

    // Only restart if theme changed
    const themeKey = JSON.stringify(theme.color) + theme.count;
    if (themeKey === _particleTheme) return;
    _particleTheme = themeKey;

    // Create particles
    _particles = [];
    const w = _particleCanvas.width;
    const h = _particleCanvas.height;

    for (let i = 0; i < theme.count; i++) {
        _particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * theme.drift,
            vy: -theme.speed * (0.5 + Math.random() * 0.5),
            size: theme.size[0] + Math.random() * (theme.size[1] - theme.size[0]),
            alpha: 0.1 + Math.random() * 0.3,
            alphaDir: Math.random() > 0.5 ? 0.003 : -0.003,
            color: theme.color,
            glow: theme.glow,
        });
    }

    // Start animation loop if not running
    if (!_particleRafId) {
        _particleLoop();
    }
}

function _particleLoop() {
    if (!_particleCtx || _particles.length === 0) {
        _particleRafId = null;
        return;
    }

    const w = _particleCanvas.width;
    const h = _particleCanvas.height;
    _particleCtx.clearRect(0, 0, w, h);

    for (const p of _particles) {
        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Oscillate alpha
        p.alpha += p.alphaDir;
        if (p.alpha > 0.45) p.alphaDir = -Math.abs(p.alphaDir);
        if (p.alpha < 0.08) p.alphaDir = Math.abs(p.alphaDir);

        // Wrap around
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        // Draw
        const [r, g, b] = p.color;
        _particleCtx.beginPath();
        _particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        _particleCtx.fillStyle = `rgba(${r},${g},${b},${p.alpha.toFixed(2)})`;
        _particleCtx.fill();

        if (p.glow) {
            _particleCtx.beginPath();
            _particleCtx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            _particleCtx.fillStyle = `rgba(${r},${g},${b},${(p.alpha * 0.15).toFixed(3)})`;
            _particleCtx.fill();
        }
    }

    _particleRafId = requestAnimationFrame(_particleLoop);
}

function stopParticles() {
    if (_particleRafId) {
        cancelAnimationFrame(_particleRafId);
        _particleRafId = null;
    }
    _particles = [];
    if (_particleCtx && _particleCanvas) {
        _particleCtx.clearRect(0, 0, _particleCanvas.width, _particleCanvas.height);
    }
}

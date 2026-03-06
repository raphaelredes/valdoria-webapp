// ═══════════════════════════════════════════════════════════════
// DUNGEON UI — Event overlay, boss reveal, particles
// ═══════════════════════════════════════════════════════════════

// ── Event overlay ──
function showEvent(node) {
    const overlay = document.getElementById('event-overlay');
    const icon = NODE_ICONS[node.type] || '❓';

    document.getElementById('event-icon').textContent = icon;
    document.getElementById('event-title').textContent = node.label || _roomTitle(node.type);
    document.getElementById('event-desc').textContent = _roomDesc(node.type);

    const actions = document.getElementById('event-actions');
    actions.innerHTML = '';

    // Primary action button
    const enterBtn = document.createElement('button');
    enterBtn.className = 'event-btn event-btn-primary';
    enterBtn.textContent = _roomAction(node.type);
    enterBtn.addEventListener('click', () => {
        enterBtn.style.pointerEvents = 'none';
        enterBtn.style.opacity = '0.5';
        // Animate transition then send action
        animateNodeTransition(S.currentNode, node.id, () => {
            sendAction('enter', node.id);
        });
    });
    actions.appendChild(enterBtn);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'event-btn';
    closeBtn.textContent = 'Voltar';
    closeBtn.addEventListener('click', closeEvent);
    actions.appendChild(closeBtn);

    overlay.classList.add('open');
}

function closeEvent() {
    document.getElementById('event-overlay').classList.remove('open');
}

function _roomTitle(type) {
    const titles = {
        combat: 'Encontro Hostil', treasure: 'Bau do Tesouro',
        campfire: 'Fogueira', boss: 'Chefe da Masmorra',
        mystery: 'Sala Misteriosa', trap: 'Armadilha',
        shrine: 'Santuario', lore: 'Inscricoes Antigas',
        entrance: 'Entrada', empty: 'Sala Vazia',
    };
    return titles[type] || 'Sala Desconhecida';
}

function _roomDesc(type) {
    const descs = {
        combat: 'Voces de criaturas ecoam das sombras. Prepare-se para lutar.',
        treasure: 'Um bau antigo repousa no centro da sala, coberto de poeira.',
        campfire: 'Uma fogueira crepita suavemente. Um momento de descanso.',
        mystery: 'A sala esta envolta em uma aura estranha. O que aguarda dentro?',
        trap: 'Algo parece errado neste corredor. Cuidado onde pisa.',
        shrine: 'Uma energia mistica emana de um altar de pedra.',
        lore: 'Paredes cobertas de inscricoes antigas contam historias esquecidas.',
        entrance: 'A entrada da masmorra. Nao ha como voltar atras.',
        empty: 'Uma sala vazia e silenciosa.',
    };
    return descs[type] || 'Uma sala desconhecida aguarda.';
}

function _roomAction(type) {
    const actions = {
        combat: '⚔️ Entrar em Combate',
        treasure: '💎 Abrir o Bau',
        campfire: '🔥 Descansar',
        mystery: '❓ Investigar',
        trap: '⚠️ Prosseguir com Cautela',
        shrine: '✨ Examinar o Altar',
        lore: '📜 Ler as Inscricoes',
        entrance: '🚪 Adentrar',
        empty: '🚶 Prosseguir',
    };
    return actions[type] || 'Entrar';
}

// ── Boss reveal ──
function showBossReveal(node) {
    const overlay = document.getElementById('boss-overlay');

    document.getElementById('boss-icon').textContent = '💀';
    document.getElementById('boss-name').textContent = node.label || 'Chefe da Masmorra';
    document.getElementById('boss-subtitle').textContent = 'Um inimigo terrivel guarda esta sala';

    // Reset animations
    const icon = document.getElementById('boss-icon');
    const name = document.getElementById('boss-name');
    const sub = document.getElementById('boss-subtitle');
    const btn = document.getElementById('boss-btn');

    icon.style.animation = 'none'; icon.offsetHeight; icon.style.animation = '';
    name.style.animation = 'none'; name.offsetHeight; name.style.animation = '';
    sub.style.animation = 'none'; sub.offsetHeight; sub.style.animation = '';
    btn.style.animation = 'none'; btn.offsetHeight; btn.style.animation = '';

    // Darken background
    overlay.style.animation = 'bossOverlayDarken 0.5s ease forwards';
    overlay.classList.add('open');

    try { tg?.HapticFeedback?.impactOccurred('heavy'); } catch (e) { }

    btn.onclick = () => {
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.5';
        animateNodeTransition(S.currentNode, node.id, () => {
            sendAction('enter', node.id);
        });
    };
}

function closeBossReveal() {
    document.getElementById('boss-overlay').classList.remove('open');
}

// ── Dungeon ambient particles ──
let _dPartCanvas = null;
let _dPartCtx = null;
let _dParticles = [];
let _dPartRaf = null;

const BIOME_PARTICLES = {
    cave:     { color: [140, 130, 120], count: 12, speed: 0.15, size: [1, 2] },
    swamp:    { color: [80, 120, 80],   count: 10, speed: 0.1, size: [1, 2.5] },
    volcanic: { color: [220, 120, 40],  count: 14, speed: 0.5, size: [1.5, 3] },
    crypt:    { color: [100, 80, 120],  count: 8,  speed: 0.1, size: [1, 1.5] },
    ruins:    { color: [160, 140, 100], count: 10, speed: 0.2, size: [1, 2] },
};

function initDungeonParticles() {
    _dPartCanvas = document.getElementById('dungeon-particles');
    if (!_dPartCanvas) return;
    _dPartCtx = _dPartCanvas.getContext('2d');
    _dPartCanvas.width = Math.min(430, window.innerWidth);
    _dPartCanvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        if (_dPartCanvas) {
            _dPartCanvas.width = Math.min(430, window.innerWidth);
            _dPartCanvas.height = window.innerHeight;
        }
    });

    const theme = BIOME_PARTICLES[S.biome] || BIOME_PARTICLES.cave;
    const w = _dPartCanvas.width, h = _dPartCanvas.height;

    _dParticles = [];
    for (let i = 0; i < theme.count; i++) {
        _dParticles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.2,
            vy: S.biome === 'volcanic' ? -theme.speed * (0.5 + Math.random()) : (Math.random() - 0.5) * theme.speed,
            size: theme.size[0] + Math.random() * (theme.size[1] - theme.size[0]),
            alpha: 0.1 + Math.random() * 0.25,
            alphaDir: Math.random() > 0.5 ? 0.002 : -0.002,
            color: theme.color,
        });
    }

    _dPartLoop();
}

function _dPartLoop() {
    if (!_dPartCtx || _dParticles.length === 0) { _dPartRaf = null; return; }

    const w = _dPartCanvas.width, h = _dPartCanvas.height;
    _dPartCtx.clearRect(0, 0, w, h);

    for (const p of _dParticles) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += p.alphaDir;
        if (p.alpha > 0.4) p.alphaDir = -Math.abs(p.alphaDir);
        if (p.alpha < 0.05) p.alphaDir = Math.abs(p.alphaDir);

        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        const [r, g, b] = p.color;
        _dPartCtx.beginPath();
        _dPartCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        _dPartCtx.fillStyle = `rgba(${r},${g},${b},${p.alpha.toFixed(2)})`;
        _dPartCtx.fill();

        // Glow for volcanic
        if (S.biome === 'volcanic') {
            _dPartCtx.beginPath();
            _dPartCtx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            _dPartCtx.fillStyle = `rgba(${r},${g},${b},${(p.alpha * 0.12).toFixed(3)})`;
            _dPartCtx.fill();
        }
    }

    _dPartRaf = requestAnimationFrame(_dPartLoop);
}

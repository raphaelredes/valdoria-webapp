/* ═══════════════════════════════════════════════════════════════
   INN SLEEP ANIMATION — Client-side cinematic rest sequence
   Renders multi-frame sleep animation with recovery bars,
   dream sequences, ally events, floating particles, and
   staggered text reveal. Triggered by inn_animation data
   from the Game Hub API response.
   ═══════════════════════════════════════════════════════════════ */

// ─── Reading Time Calculator ───
function _calcInnDelay(lines, category) {
    const text = (Array.isArray(lines) ? lines.join(' ') : lines || '');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const base = words * 0.35;
    const ranges = {
        narrative: { min: 3.5, max: 6.0 },
        data:      { min: 4.0, max: 6.5 },
        dream:     { min: 3.5, max: 5.0 },
        result:    { min: 5.0, max: 7.0 },
    };
    const r = ranges[category] || ranges.narrative;
    return Math.max(r.min, Math.min(r.max, base)) * 1000;
}

// ─── Frame Templates ───
const _INN_FRAMES = {
    poor: [
        {
            title: 'NOITE NO ESTÁBULO',
            icons: '🐴  🕯️  🌾',
            lines: [
                'O chão de palha range sob seu peso.',
                'O cheiro de feno mistura-se com esterco.',
                '{name} se deita entre os fardos...',
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #1a1a0a 0%, #0a0805 100%)',
            category: 'narrative',
            recovery: 0,
        },
        {
            title: 'SONO INQUIETO',
            icons: '💤 · · · 💤 · · 💤',
            lines: [
                'Você acorda. Vira. Dorme de novo.',
                'Algo mordisca seu dedo — um rato.',
                'O vento frio entra pelas frestas...',
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #0a0a08 0%, #050505 100%)',
            category: 'data',
            recovery: 0.6,
        },
        {
            title: 'AMANHECER CRU',
            icons: '🐓 ☀️ 🌾',
            lines: [
                'O galo canta. Suas costas protestam.',
                'A luz fraca do amanhecer entra',
                'pelo buraco na parede.',
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #2a1a0a 0%, #1a1008 100%)',
            category: 'data',
            recovery: 1.0,
        },
    ],
    modest: [
        {
            title: 'ANOITECER',
            icons: '🕯️  🚪  🛏️',
            lines: [
                'A porta tranca com um click satisfatório.',
                'Lençóis limpos. Travesseiro de pena.',
                '{name} apaga a chama e fecha os olhos.',
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #0a0a2e 0%, #050510 100%)',
            category: 'narrative',
            recovery: 0,
        },
        {
            title: 'SONO RESTAURADOR',
            icons: '💤  💤  💤  💤  💤',
            lines: [
                'Sono profundo. Sem sonhos, sem dor.',
                'A energia vital flui pelo corpo,',
                'reparando músculos e restaurando vigor.',
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #080810 0%, #050508 100%)',
            category: 'data',
            recovery: 0.6,
        },
        {
            title: 'NOVO AMANHECER',
            icons: '🌅  🕊️  ☀️',
            lines: [
                'A luz dourada da manhã entra pela janela.',
                'Você se espreguiça lentamente.',
                '{name} está renovado.',
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #3a2a00 0%, #2a1a00 100%)',
            category: 'data',
            recovery: 1.0,
        },
    ],
    wealthy: [
        {
            title: 'BANHO QUENTE',
            icons: '♨️  🫧  🪷',
            lines: [
                'Vapor sobe de uma banheira de cobre.',
                'Óleos aromáticos de lavanda e cedro',
                'dissolvem a tensão de cada músculo.',
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #2a0a0a 0%, #1a0505 100%)',
            category: 'narrative',
            recovery: 0,
        },
        {
            title: 'NOITE MÁGICA',
            icons: '✦ · ★ · ✧ · ★ · ✦',
            lines: [
                'A noite é cristalina.',
                'Estrelas pulsam com energia arcana.',
                'Há algo mágico no ar esta noite.',
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #0a0a20 0%, #050510 100%)',
            category: 'data',
            recovery: 0.3,
        },
        {
            title: 'RESTAURAÇÃO',
            icons: '✨ 💤 ✨ 💤 ✨ 💤 ✨',
            lines: [
                'Sono profundo e restaurador.',
                'Cada fibra se regenera, cada ferida se fecha.',
                'Corpo, mente e espírito em harmonia.',
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #080810 0%, #050508 100%)',
            category: 'data',
            recovery: 0.8,
        },
        {
            title: 'AMANHECER DOURADO',
            icons: '☀️  🕊️  👑  🕊️  ☀️',
            lines: [
                'A luz do amanhecer banha o quarto em ouro.',
                'Café quente, frutas e pão de mel',
                'esperam sobre a mesa de carvalho.',
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #3a2800 0%, #2a1a00 100%)',
            category: 'data',
            recovery: 1.0,
        },
    ],
};

// ─── Night Progress Icons ───
function _nightIcon(pct) {
    if (pct < 0.15) return '🌆';
    if (pct < 0.35) return '🌃';
    if (pct < 0.65) return '🌌';
    if (pct < 0.85) return '🌅';
    return '☀️';
}

function _nightBar(phase, total) {
    const pct = phase / Math.max(total - 1, 1);
    const filled = Math.round(pct * 10);
    const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled);
    const left = _nightIcon(pct);
    const right = pct >= 0.85 ? '☀️' : '🌙';
    return left + ' ' + bar + ' ' + right;
}

// ─── Floating Particles ───
function _createParticles(container, tier) {
    container.innerHTML = '';
    const starCount = tier === 'wealthy' ? 18 : (tier === 'modest' ? 15 : 10);
    for (let i = 0; i < starCount; i++) {
        const p = document.createElement('div');
        p.className = 'inn-particle star';
        p.style.left = (Math.random() * 100) + '%';
        p.style.top = (Math.random() * 70) + '%';
        p.style.setProperty('--dur', (2 + Math.random() * 4) + 's');
        p.style.setProperty('--delay', (Math.random() * 3) + 's');
        container.appendChild(p);
    }
    const emberCount = tier === 'poor' ? 3 : (tier === 'wealthy' ? 8 : 5);
    for (let i = 0; i < emberCount; i++) {
        const p = document.createElement('div');
        p.className = 'inn-particle ember';
        p.style.left = (10 + Math.random() * 80) + '%';
        p.style.bottom = (Math.random() * 30) + '%';
        p.style.setProperty('--dur', (4 + Math.random() * 4) + 's');
        p.style.setProperty('--delay', (Math.random() * 5) + 's');
        container.appendChild(p);
    }
    if (tier === 'wealthy') {
        for (let i = 0; i < 5; i++) {
            const p = document.createElement('div');
            p.className = 'inn-particle firefly';
            p.style.left = (15 + Math.random() * 70) + '%';
            p.style.top = (20 + Math.random() * 50) + '%';
            p.style.setProperty('--dur', (5 + Math.random() * 4) + 's');
            p.style.setProperty('--delay', (Math.random() * 4) + 's');
            container.appendChild(p);
        }
    }
}

// ─── Smooth Recovery Bars ───
function _barHTML(emoji, current, max, type, isFull, sizeClass) {
    const pct = max > 0 ? Math.round((current / max) * 100) : 0;
    const fullClass = isFull ? ' full' : '';
    const spark = isFull ? ' ✨' : '';
    const wrapClass = sizeClass ? 'inn-bar-wrap ' + sizeClass : 'inn-bar-wrap';
    return '<div class="' + wrapClass + '">' +
        '<div class="inn-bar-track"><div class="inn-bar-fill ' + type + fullClass + '" data-target="' + pct + '" style="width:0%"></div></div>' +
        '<span class="inn-bar-label">' + emoji + ' ' + current + '/' + max + spark + '</span>' +
    '</div>';
}

function _recoveryHTML(data, pct) {
    const finalHp = data.final_hp !== undefined ? data.final_hp : data.max_hp;
    const finalMp = data.final_mp !== undefined ? data.final_mp : data.max_mp;
    const hp = Math.min(Math.round(data.start_hp + (finalHp - data.start_hp) * pct), data.max_hp);
    const mp = Math.min(Math.round(data.start_mp + (finalMp - data.start_mp) * pct), data.max_mp);
    const resEmoji = data.res_emoji || '💧';
    const isFull = pct >= 1.0;

    let html = _barHTML('❤️', hp, data.max_hp, 'hp', isFull) +
               _barHTML(resEmoji, mp, data.max_mp, 'mp', isFull);

    if (data.allies && data.allies.length > 0) {
        html += '<div class="inn-allies-divider">─ ◆ GRUPO ◆ ─</div>';
        for (const a of data.allies) {
            const aFinalHp = a.final_hp !== undefined ? a.final_hp : a.max_hp;
            const aHp = Math.min(Math.round(a.start_hp + (aFinalHp - a.start_hp) * pct), a.max_hp);
            const aResEmoji = a.res_emoji || '💧';
            html += '<div class="inn-ally-name">' + (a.icon || '👤') + ' ' + a.name + '</div>';
            html += _barHTML('❤️', aHp, a.max_hp, 'hp', isFull, 'small');
            if (a.max_mp > 0) {
                const aFinalMp = a.final_mp !== undefined ? a.final_mp : a.max_mp;
                const aMp = Math.min(Math.round(a.start_mp + (aFinalMp - a.start_mp) * pct), a.max_mp);
                html += _barHTML(aResEmoji, aMp, a.max_mp, 'mp', isFull, 'small');
            }
        }
    }

    return html;
}

function _animateBarFills(container) {
    requestAnimationFrame(() => {
        const fills = container.querySelectorAll('.inn-bar-fill[data-target]');
        fills.forEach((el, i) => {
            setTimeout(() => {
                el.style.width = el.dataset.target + '%';
            }, i * 200);
        });
    });
}

function _restartAnimation(el, animName) {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = '';
}

// ─── Build Frame List ───
function _buildFrames(data) {
    const tier = data.tier || 'modest';
    const templateFrames = _INN_FRAMES[tier] || _INN_FRAMES.modest;

    const frames = templateFrames.map(f => ({
        ...f,
        lines: f.lines.map(l => l.replace('{name}', data.player_name || 'Aventureiro')),
        delay: _calcInnDelay(f.lines, f.category),
    }));

    if (data.dream) {
        const dreamConfig = {
            poor: {
                title: 'SONHO AGITADO',
                icons: '💭  · · ·  💭',
                bg: 'radial-gradient(ellipse at 50% 40%, #1a100a 0%, #0a0805 100%)',
                recovery: 0.8,
            },
            modest: {
                title: 'MUNDO ONÍRICO',
                icons: '💭  🔮  ✨',
                bg: 'radial-gradient(ellipse at 50% 40%, #1a0a2e 0%, #0a0518 100%)',
                recovery: 0.85,
            },
            wealthy: {
                title: 'VISÃO ETÉREA',
                icons: '🔮  💭  ⚜️',
                bg: 'radial-gradient(ellipse at 50% 40%, #2a0a2e 0%, #150518 100%)',
                recovery: 0.9,
            },
        };
        const dc = dreamConfig[tier] || dreamConfig.modest;
        const dreamLines = ['"' + data.dream + '"'];
        const dreamFrame = {
            ...dc,
            lines: dreamLines,
            delay: _calcInnDelay(dreamLines, 'dream'),
            isDream: true,
        };
        frames.splice(frames.length - 1, 0, dreamFrame);
    }

    if (data.ally_event) {
        const ae = data.ally_event;
        const allyLines = [ae.text];
        const allyFrame = {
            title: ae.title,
            icons: ae.icon + '  🌙',
            lines: allyLines,
            bg: 'radial-gradient(ellipse at 50% 40%, #0a0a15 0%, #050508 100%)',
            delay: _calcInnDelay(allyLines, 'narrative'),
            recovery: tier === 'poor' ? 0.8 : (frames.length > 4 ? 0.5 : 0.4),
        };
        const insertIdx = tier === 'poor' ? frames.length - 1 : frames.length - 2;
        frames.splice(insertIdx, 0, allyFrame);
    }

    return frames;
}

// ─── Main Animation Function ───
// Resolves with { skipped: boolean } so caller can decide on dream insight
function playInnAnimation(data, onDone) {
    const overlay = document.getElementById('inn-overlay');
    const frameEl = document.getElementById('inn-frame');
    const titleEl = document.getElementById('inn-title');
    const iconsEl = document.getElementById('inn-icons');
    const dividerEl = document.getElementById('inn-divider');
    const textEl = document.getElementById('inn-text');
    const nightBarEl = document.getElementById('inn-night-bar');
    const recoveryEl = document.getElementById('inn-recovery');
    const skipBtn = document.getElementById('inn-skip-btn');

    if (!overlay || !frameEl) {
        console.error('[INN] Overlay elements not found');
        onDone({ skipped: true });
        return;
    }

    let frames = _buildFrames(data);
    const restCount = data.rest_count || 0;
    const totalFrames = frames.length;
    let _done = false;
    let _skipped = false;
    let _frameTimer = null;

    // Haptic on start
    try {
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    } catch (e) { /* */ }

    const finish = (wasSkipped) => {
        if (_done) return;
        _done = true;
        _skipped = wasSkipped;
        if (_frameTimer) clearTimeout(_frameTimer);
        skipBtn.onclick = null;
        skipBtn.style.display = 'none';

        overlay.classList.add('hiding');
        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.classList.remove('hiding');
            frameEl.classList.remove('active');
            titleEl.classList.remove('shimmer');
            const particlesEl = overlay.querySelector('.inn-particles');
            if (particlesEl) particlesEl.innerHTML = '';
            const panel = document.getElementById('bottom-panel');
            if (panel) panel.style.display = '';
            onDone({ skipped: _skipped });
        }, 400);
    };

    // Skip button: after 3+ rests show immediately, otherwise after 2.5s
    const skipDelay = restCount >= 3 ? 300 : 2500;
    // Show dream insight hint on skip button if available
    const hasDreamInsight = data.dream_insight && data.dream;
    const skipLabel = hasDreamInsight ? 'Pular (sem bônus do sonho)' : 'Acordar »';
    setTimeout(() => {
        if (!_done) {
            skipBtn.textContent = skipLabel;
            skipBtn.style.display = '';
            skipBtn.onclick = () => finish(true);
        }
    }, skipDelay);

    // Show overlay
    overlay.style.display = '';
    overlay.classList.remove('hiding');

    let particlesEl = overlay.querySelector('.inn-particles');
    if (!particlesEl) {
        particlesEl = document.createElement('div');
        particlesEl.className = 'inn-particles';
        overlay.insertBefore(particlesEl, overlay.firstChild);
    }
    _createParticles(particlesEl, data.tier || 'modest');

    const panelEl = document.getElementById('bottom-panel');
    if (panelEl) panelEl.style.display = 'none';

    function showFrame(idx) {
        if (_done || idx >= totalFrames) {
            if (!_done) finish(false);
            return;
        }
        const frame = frames[idx];

        frameEl.classList.remove('active');

        setTimeout(() => {
            if (_done) return;

            overlay.style.background = frame.bg;
            nightBarEl.textContent = _nightBar(idx, totalFrames);

            titleEl.textContent = frame.title;
            if (frame.recovery >= 1.0) {
                titleEl.classList.add('shimmer');
            } else {
                titleEl.classList.remove('shimmer');
            }

            iconsEl.textContent = frame.icons;

            if (dividerEl) {
                dividerEl.style.display = frame.isDream ? 'none' : '';
            }

            const lineClass = frame.isDream ? 'inn-line dream' : 'inn-line';
            textEl.innerHTML = frame.lines.map(l =>
                '<div class="' + lineClass + '">' + l + '</div>'
            ).join('');

            if (frame.recovery > 0) {
                recoveryEl.innerHTML = _recoveryHTML(data, frame.recovery);
                recoveryEl.style.display = '';
                _restartAnimation(recoveryEl, 'innRecoveryFadeIn');
                _animateBarFills(recoveryEl);
            } else {
                recoveryEl.style.display = 'none';
            }

            frameEl.classList.add('active');

            try {
                if (window.Telegram && Telegram.WebApp) {
                    const hf = Telegram.WebApp.HapticFeedback;
                    if (frame.recovery >= 1.0) {
                        hf.notificationOccurred('success');
                    } else if (frame.isDream) {
                        hf.impactOccurred('medium');
                    } else if (idx > 0) {
                        hf.impactOccurred('light');
                    }
                }
            } catch (e) { /* */ }

            _frameTimer = setTimeout(() => showFrame(idx + 1), frame.delay);
        }, idx === 0 ? 50 : 500);
    }

    showFrame(0);
}

/* ═══════════════════════════════════════════════════════════════
   INN SLEEP ANIMATION — Client-side cinematic rest sequence
   Renders multi-frame sleep animation with recovery bars,
   dream sequences, ally events, floating particles, and
   staggered text reveal. Triggered by inn_animation data
   from the Game Hub API response.
   ═══════════════════════════════════════════════════════════════ */

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
            delay: 2500,
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
            delay: 2500,
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
            delay: 2000,
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
            delay: 2200,
            recovery: 0,
        },
        {
            title: 'NOITE ESTRELADA',
            icons: '✦ · ✧ · ★ · ✦ · ✧',
            lines: [
                'Pela janela, estrelas cintilam.',
                'O silêncio é quebrado apenas pelo crepitar',
                'distante da lareira no salão.',
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #080820 0%, #050515 100%)',
            delay: 2200,
            recovery: 0.3,
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
            delay: 2200,
            recovery: 0.7,
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
            delay: 2000,
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
            delay: 2300,
            recovery: 0,
        },
        {
            title: 'LENÇÓIS DE SEDA',
            icons: '👑  🛏️  🕯️',
            lines: [
                'A cama é uma nuvem de penas de ganso.',
                'Seda cor de vinho acaricia sua pele.',
                'O mundo lá fora deixa de existir.',
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #1a0a2a 0%, #0a0518 100%)',
            delay: 2300,
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
            delay: 2300,
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
            delay: 2500,
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
            delay: 2000,
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
    // Stars: 12-18 depending on tier
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
    // Embers: 4-8 warm drifting dots
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
    // Fireflies: wealthy only
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

// ─── Smooth Recovery Bars (HTML/CSS) ───
function _barHTML(emoji, current, max, type, isFull) {
    const pct = max > 0 ? Math.round((current / max) * 100) : 0;
    const fullClass = isFull ? ' full' : '';
    const spark = isFull ? ' ✨' : '';
    return '<div class="inn-bar-wrap">' +
        '<div class="inn-bar-track"><div class="inn-bar-fill ' + type + fullClass + '" style="width:' + pct + '%"></div></div>' +
        '<span class="inn-bar-label">' + emoji + ' ' + current + '/' + max + spark + '</span>' +
    '</div>';
}

function _recoveryHTML(data, pct) {
    const hp = Math.min(Math.round(data.start_hp + (data.max_hp - data.start_hp) * pct), data.max_hp);
    const mp = Math.min(Math.round(data.start_mp + (data.max_mp - data.start_mp) * pct), data.max_mp);
    const resEmoji = data.res_emoji || '💧';
    const isFull = pct >= 1.0;

    let html = _barHTML('❤️', hp, data.max_hp, 'hp', isFull) +
               _barHTML(resEmoji, mp, data.max_mp, 'mp', isFull);

    // Ally recovery bars
    if (data.allies && data.allies.length > 0) {
        html += '<div class="inn-allies-divider">━ GRUPO ━</div>';
        for (const a of data.allies) {
            const aHp = Math.min(Math.round(a.start_hp + (a.final_hp - a.start_hp) * pct), a.max_hp);
            const aResEmoji = a.res_emoji || '💧';
            html += '<div class="inn-ally-name">' + (a.icon || '👤') + ' ' + a.name + '</div>';
            html += '<div class="inn-bar-wrap small">' +
                '<div class="inn-bar-track"><div class="inn-bar-fill hp' + (isFull ? ' full' : '') + '" style="width:' + (a.max_hp > 0 ? Math.round(aHp / a.max_hp * 100) : 0) + '%"></div></div>' +
                '<span class="inn-bar-label">❤️ ' + aHp + '/' + a.max_hp + (isFull ? ' ✨' : '') + '</span>' +
            '</div>';
            if (a.max_mp > 0) {
                const aMp = Math.min(Math.round(a.start_mp + (a.final_mp - a.start_mp) * pct), a.max_mp);
                html += '<div class="inn-bar-wrap small">' +
                    '<div class="inn-bar-track"><div class="inn-bar-fill mp' + (isFull ? ' full' : '') + '" style="width:' + Math.round(aMp / a.max_mp * 100) + '%"></div></div>' +
                    '<span class="inn-bar-label">' + aResEmoji + ' ' + aMp + '/' + a.max_mp + (isFull ? ' ✨' : '') + '</span>' +
                '</div>';
            }
        }
    }

    return html;
}

// ─── Build Frame List ───
function _buildFrames(data) {
    const tier = data.tier || 'modest';
    const templateFrames = _INN_FRAMES[tier] || _INN_FRAMES.modest;

    const frames = templateFrames.map(f => ({
        ...f,
        lines: f.lines.map(l => l.replace('{name}', data.player_name || 'Aventureiro')),
    }));

    // Insert dream frame before last (modest/wealthy)
    if (data.dream && tier !== 'poor') {
        const dreamFrame = {
            title: tier === 'wealthy' ? 'VISÃO ETÉREA' : 'MUNDO ONÍRICO',
            icons: tier === 'wealthy' ? '🔮  💭  ⚜️' : '💭  🔮  ✨',
            lines: ['"' + data.dream + '"'],
            bg: tier === 'wealthy'
                ? 'radial-gradient(ellipse at 50% 40%, #2a0a2e 0%, #150518 100%)'
                : 'radial-gradient(ellipse at 50% 40%, #1a0a2e 0%, #0a0518 100%)',
            delay: 2500,
            recovery: tier === 'wealthy' ? 0.9 : 0.85,
        };
        frames.splice(frames.length - 1, 0, dreamFrame);
    }

    // Insert ally event frame
    if (data.ally_event) {
        const ae = data.ally_event;
        const allyFrame = {
            title: ae.title,
            icons: ae.icon + '  🌙',
            lines: [ae.text],
            bg: 'radial-gradient(ellipse at 50% 40%, #0a0a15 0%, #050508 100%)',
            delay: 2800,
            recovery: tier === 'poor' ? 0.8 : (frames.length > 4 ? 0.5 : 0.4),
        };
        const insertIdx = tier === 'poor' ? frames.length - 1 : frames.length - 2;
        frames.splice(insertIdx, 0, allyFrame);
    }

    return frames;
}

// ─── Main Animation Function ───
function playInnAnimation(data, onDone) {
    const overlay = document.getElementById('inn-overlay');
    const frameEl = document.getElementById('inn-frame');
    const titleEl = document.getElementById('inn-title');
    const iconsEl = document.getElementById('inn-icons');
    const textEl = document.getElementById('inn-text');
    const nightBarEl = document.getElementById('inn-night-bar');
    const recoveryEl = document.getElementById('inn-recovery');
    const skipBtn = document.getElementById('inn-skip-btn');

    if (!overlay || !frameEl) {
        console.error('[INN] Overlay elements not found');
        onDone();
        return;
    }

    const frames = _buildFrames(data);
    const totalFrames = frames.length;
    let _done = false;
    let _frameTimer = null;

    // Haptic on start
    try {
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    } catch (e) { /* */ }

    const finish = () => {
        if (_done) return;
        _done = true;
        if (_frameTimer) clearTimeout(_frameTimer);
        skipBtn.onclick = null;
        skipBtn.style.display = 'none';

        // Fade out overlay
        overlay.classList.add('hiding');
        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.classList.remove('hiding');
            frameEl.classList.remove('active');
            // Clean up particles
            const particlesEl = overlay.querySelector('.inn-particles');
            if (particlesEl) particlesEl.innerHTML = '';
            onDone();
        }, 400);
    };

    // Show skip button after 2s
    setTimeout(() => {
        if (!_done) {
            skipBtn.style.display = '';
            skipBtn.onclick = finish;
        }
    }, 2000);

    // Show overlay
    overlay.style.display = '';
    overlay.classList.remove('hiding');

    // Create particles container if needed
    let particlesEl = overlay.querySelector('.inn-particles');
    if (!particlesEl) {
        particlesEl = document.createElement('div');
        particlesEl.className = 'inn-particles';
        overlay.insertBefore(particlesEl, overlay.firstChild);
    }
    _createParticles(particlesEl, data.tier || 'modest');

    // Hide bottom panel
    const panelEl = document.getElementById('bottom-panel');
    if (panelEl) panelEl.style.display = 'none';

    function showFrame(idx) {
        if (_done || idx >= totalFrames) {
            if (!_done) finish();
            return;
        }
        const frame = frames[idx];

        // Fade out current frame
        frameEl.classList.remove('active');

        setTimeout(() => {
            if (_done) return;

            // Update background (smooth CSS transition handles the blend)
            overlay.style.background = frame.bg;

            // Night progress bar
            nightBarEl.textContent = _nightBar(idx, totalFrames);

            // Title
            titleEl.textContent = frame.title;

            // Icons
            iconsEl.textContent = frame.icons;

            // Narration text — lines appear staggered via CSS animation
            textEl.innerHTML = frame.lines.map(l =>
                '<div class="inn-line">' + l + '</div>'
            ).join('');

            // Recovery bars (smooth CSS fill via width transition)
            if (frame.recovery > 0) {
                recoveryEl.innerHTML = _recoveryHTML(data, frame.recovery);
                recoveryEl.style.display = '';
            } else {
                recoveryEl.style.display = 'none';
            }

            // Fade in frame
            frameEl.classList.add('active');

            // Haptic on full recovery
            if (frame.recovery >= 1.0) {
                try {
                    if (window.Telegram && Telegram.WebApp) {
                        Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                    }
                } catch (e) { /* */ }
            }

            // Schedule next frame
            _frameTimer = setTimeout(() => showFrame(idx + 1), frame.delay);
        }, idx === 0 ? 50 : 500);
    }

    // Start animation
    showFrame(0);
}

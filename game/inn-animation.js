/* ═══════════════════════════════════════════════════════════════
   INN SLEEP ANIMATION v2 — Professional cinematic rest sequence
   Cross-dissolve transitions, tier-specific ambient effects,
   narrative variety, golden celebration burst, and smooth
   recovery bar animations. Matches loading screen quality.
   ═══════════════════════════════════════════════════════════════ */

// Set performance tier class on body for CSS particle reduction
    var _perfTier = window._valdoriaPerformanceTier || 'full';
    if (_perfTier !== 'full') document.body.classList.add('perf-' + _perfTier);

// ─── Utility: pick random from array ───
function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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

// ─── Thematic Dividers per tier ───
var _DIVIDERS = {
    poor:    { night: '\u00b7 \u2726 \u00b7 \u2726 \u00b7 \u2726 \u00b7', sleep: '\u00b7 \u00b7 \u2727 \u00b7 \u00b7 \u2727 \u00b7 \u00b7', dawn: '\u00b7 \u2600 \u00b7 \u2600 \u00b7 \u2600 \u00b7' },
    modest:  { night: '\u00b7 \u2726 \u00b7 \u2726 \u00b7 \u2726 \u00b7 \u2726 \u00b7', sleep: '\u00b7 \u00b7 \u2727 \u00b7 \u00b7 \u2727 \u00b7 \u00b7 \u2727 \u00b7 \u00b7', dawn: '\u00b7 \u2600 \u00b7 \u2600 \u00b7 \u2600 \u00b7 \u2600 \u00b7', dream: '\u2727 \u00b7 \u2727 \u00b7 \u2727 \u00b7 \u2727 \u00b7 \u2727' },
    wealthy: { night: '\u2726 \u00b7 \u2605 \u00b7 \u2727 \u00b7 \u2605 \u00b7 \u2726', sleep: '\u00b7 \u00b7 \u2727 \u00b7 \u00b7 \u2727 \u00b7 \u00b7 \u2727 \u00b7 \u00b7', dawn: '\u00b7 \u2600 \u00b7 \u2600 \u00b7 \u2600 \u00b7 \u2600 \u00b7', dream: '\u2727 \u00b7 \u2727 \u00b7 \u2727 \u00b7 \u2727 \u00b7 \u2727', bath: '~ \u00b7 ~ \u00b7 \u2668 \u00b7 ~ \u00b7 ~' },
};

// ─── Frame Templates with Narrative Variety ───
var _INN_FRAMES = {
    poor: [
        {
            title: 'NOITE NO EST\u00c1BULO',
            icons: ['\ud83d\udc34  \ud83d\udd6f\ufe0f  \ud83c\udf3e', '\ud83d\udca8  \ud83d\udc34  \ud83c\udf19', '\ud83c\udf3e  \ud83d\udd6f\ufe0f  \ud83d\udc2d'],
            variants: [
                ['O ch\u00e3o de palha range sob seu peso.', 'O cheiro de feno mistura-se com esterco.', '{name} se deita entre os fardos...'],
                ['A palha est\u00e1 \u00famida nos cantos.', 'Teias de aranha decoram as vigas.', 'Pelo menos \u00e9 melhor que ao relento...'],
                ['Ratos correm pelas bordas da parede.', 'O vento assobia pelas t\u00e1buas soltas.', 'Um gato magro observa de cima do fardo.'],
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #1a1a0a 0%, #0a0805 100%)',
            category: 'narrative',
            recovery: 0,
            divider: 'night',
        },
        {
            title: 'SONO INQUIETO',
            icons: ['\ud83d\udca4 \u00b7 \u00b7 \u00b7 \ud83d\udca4 \u00b7 \u00b7 \ud83d\udca4'],
            variants: [
                ['Voc\u00ea acorda. Vira. Dorme de novo.', 'Algo mordisca seu dedo \u2014 um rato.', 'O vento frio entra pelas frestas...'],
                ['Um relincho alto te acorda.', 'Seu pesco\u00e7o est\u00e1 travado da posi\u00e7\u00e3o.', 'A palha co\u00e7a em cada cent\u00edmetro de pele...'],
                ['Voc\u00ea sonha que est\u00e1 caindo \u2014 e acorda.', 'O fardo desmoronou sobre suas pernas.', 'L\u00e1 fora, um c\u00e3o uiva para a lua...'],
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #0a0a08 0%, #050505 100%)',
            category: 'data',
            recovery: 0.6,
            divider: 'sleep',
        },
        {
            title: 'AMANHECER CRU',
            icons: ['\ud83d\udc13 \u2600\ufe0f \ud83c\udf3e'],
            variants: [
                ['O galo canta. Suas costas protestam.', 'A luz fraca do amanhecer entra', 'pelo buraco na parede.'],
                ['Um raio de sol atinge seu rosto.', 'Voc\u00ea desperta com palha no cabelo.', 'Mas o corpo responde \u2014 est\u00e1 vivo.'],
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #2a1a0a 0%, #1a1008 100%)',
            category: 'data',
            recovery: 1.0,
            divider: 'dawn',
        },
    ],
    modest: [
        {
            title: 'ANOITECER',
            icons: ['\ud83d\udd6f\ufe0f  \ud83d\udeaa  \ud83d\udecf\ufe0f', '\ud83c\udf19  \ud83d\udecf\ufe0f  \ud83d\udd6f\ufe0f'],
            variants: [
                ['A porta tranca com um click satisfat\u00f3rio.', 'Len\u00e7\u00f3is limpos. Travesseiro de pena.', '{name} apaga a chama e fecha os olhos.'],
                ['O quarto \u00e9 simples, mas aconchegante.', 'T\u00e1buas de madeira rangem suavemente.', 'O murm\u00fario da taverna embala a noite.'],
                ['Uma janela entreaberta traz brisa fresca.', 'O colch\u00e3o cede com um suspiro.', 'Cheiro de lenha queimada sobe do sal\u00e3o.'],
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #0a0a2e 0%, #050510 100%)',
            category: 'narrative',
            recovery: 0,
            divider: 'night',
        },
        {
            title: 'SONO RESTAURADOR',
            icons: ['\ud83d\udca4  \ud83d\udca4  \ud83d\udca4  \ud83d\udca4  \ud83d\udca4'],
            variants: [
                ['Sono profundo. Sem sonhos, sem dor.', 'A energia vital flui pelo corpo,', 'reparando m\u00fasculos e restaurando vigor.'],
                ['O sil\u00eancio do quarto \u00e9 perfeito.', 'Cada respira\u00e7\u00e3o profunda traz al\u00edvio.', 'O corpo finalmente relaxa por completo.'],
                ['As horas passam como segundos.', 'Seu corpo afunda no colch\u00e3o macio.', 'Feridas se fecham, dores se dissolvem.'],
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #080810 0%, #050508 100%)',
            category: 'data',
            recovery: 0.6,
            divider: 'sleep',
        },
        {
            title: 'NOVO AMANHECER',
            icons: ['\ud83c\udf05  \ud83d\udd4a\ufe0f  \u2600\ufe0f'],
            variants: [
                ['A luz dourada da manh\u00e3 entra pela janela.', 'Voc\u00ea se espreguia lentamente.', '{name} est\u00e1 renovado.'],
                ['P\u00e1ssaros cantam l\u00e1 fora.', 'A luz matinal aquece o quarto.', 'Seu corpo responde \u00e1gil ao se levantar.'],
                ['O sino da cidade anuncia a manh\u00e3.', 'Voc\u00ea desperta naturalmente, sem pressa.', 'O aroma de caf\u00e9 atravessa a porta.'],
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #3a2a00 0%, #2a1a00 100%)',
            category: 'data',
            recovery: 1.0,
            divider: 'dawn',
        },
    ],
    wealthy: [
        {
            title: 'BANHO QUENTE',
            icons: ['\u2668\ufe0f  \ud83e\udee7  \ud83e\udeb7'],
            variants: [
                ['Vapor sobe de uma banheira de cobre.', '\u00d3leos arom\u00e1ticos de lavanda e cedro', 'dissolvem a tens\u00e3o de cada m\u00fasculo.'],
                ['A \u00e1gua quente envolve como um abra\u00e7o.', 'P\u00e9talas de rosa flutuam na superf\u00edcie.', 'Uma vida inteira de cansa\u00e7o se dissolve.'],
                ['Espuma perfumada, vapor arom\u00e1tico.', 'Cada cicatriz parece mais leve na \u00e1gua.', 'O mundo l\u00e1 fora deixa de existir.'],
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #2a0a0a 0%, #1a0505 100%)',
            category: 'narrative',
            recovery: 0,
            divider: 'bath',
        },
        {
            title: 'NOITE M\u00c1GICA',
            icons: ['\u2726 \u00b7 \u2605 \u00b7 \u2727 \u00b7 \u2605 \u00b7 \u2726'],
            variants: [
                ['A noite sobre Eldoria \u00e9 cristalina.', 'Estrelas pulsam com energia arcana.', 'H\u00e1 algo m\u00e1gico no ar esta noite.'],
                ['Da varanda da su\u00edte, o c\u00e9u \u00e9 infinito.', 'Constela\u00e7\u00f5es se desenham com nitidez rara.', 'A brisa noturna carrega sussurros antigos.'],
                ['Len\u00e7\u00f3is de seda, travesseiros de pluma.', 'A lareira crepita em um ritmo hipn\u00f3tico.', 'O luxo imperial abra\u00e7a seu descanso.'],
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #0a0a20 0%, #050510 100%)',
            category: 'data',
            recovery: 0.3,
            divider: 'night',
        },
        {
            title: 'RESTAURA\u00c7\u00c3O',
            icons: ['\u2728 \ud83d\udca4 \u2728 \ud83d\udca4 \u2728 \ud83d\udca4 \u2728'],
            variants: [
                ['Sono profundo e restaurador.', 'Cada fibra se regenera, cada ferida se fecha.', 'Corpo, mente e esp\u00edrito em harmonia.'],
                ['A escurid\u00e3o aveludada \u00e9 perfeita.', 'Energia vital flui como um rio dourado.', 'At\u00e9 os ossos suspiram de gratid\u00e3o.'],
                ['O tempo parece parar no luxo da su\u00edte.', 'Cada hora de sono vale por tr\u00eas.', 'O corpo se reconstr\u00f3i com perfei\u00e7\u00e3o.'],
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #080810 0%, #050508 100%)',
            category: 'data',
            recovery: 0.8,
            divider: 'sleep',
        },
        {
            title: 'AMANHECER DOURADO',
            icons: ['\u2600\ufe0f  \ud83d\udd4a\ufe0f  \ud83d\udc51  \ud83d\udd4a\ufe0f  \u2600\ufe0f'],
            variants: [
                ['A luz do amanhecer banha o quarto em ouro.', 'Caf\u00e9 quente, frutas e p\u00e3o de mel', 'esperam sobre a mesa de carvalho.'],
                ['O sol nasce como uma coroa sobre Eldoria.', 'Uma bandeja de prata com desjejum real', 'aparece silenciosamente \u00e0 sua porta.'],
                ['Cortinas de veludo se abrem sozinhas.', 'A cidade desperta l\u00e1 embaixo, dourada.', 'O aroma de canela e mel invade o quarto.'],
            ],
            bg: 'radial-gradient(ellipse at 50% 40%, #3a2800 0%, #2a1a00 100%)',
            category: 'data',
            recovery: 1.0,
            divider: 'dawn',
        },
    ],
};

// ─── Night Progress Icons ───
function _nightIcon(pct) {
    if (pct < 0.15) return '\ud83c\udf06';
    if (pct < 0.35) return '\ud83c\udf03'; // noqa: preflight
    if (pct < 0.65) return '\ud83c\udf0c';
    if (pct < 0.85) return '\ud83c\udf05';
    return '\u2600\ufe0f';
}
function _nightBar(phase, total) {
    const pct = phase / Math.max(total - 1, 1);
    const filled = Math.round(pct * 10);
    const bar = '\u2593'.repeat(filled) + '\u2591'.repeat(10 - filled);
    return _nightIcon(pct) + ' ' + bar + ' ' + (pct >= 0.85 ? '\u2600\ufe0f' : '\ud83c\udf19');
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
    const emberCount = tier === 'poor' ? 4 : (tier === 'wealthy' ? 8 : 5);
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
        // Arcane orbs for wealthy
        for (let i = 0; i < 3; i++) {
            const p = document.createElement('div');
            p.className = 'inn-particle arcane';
            p.style.left = (20 + Math.random() * 60) + '%';
            p.style.top = (15 + Math.random() * 60) + '%';
            p.style.setProperty('--dur', (6 + Math.random() * 6) + 's');
            p.style.setProperty('--delay', (Math.random() * 5) + 's');
            p.style.setProperty('--dx', (10 + Math.random() * 20) + 'px');
            p.style.setProperty('--dy', (-10 - Math.random() * 30) + 'px');
            container.appendChild(p);
        }
    }
}

// ─── Tier-Specific Ambient Elements ───
function _createAmbient(overlay, tier) {
    let amb = overlay.querySelector('.inn-ambient');
    if (!amb) {
        amb = document.createElement('div');
        amb.className = 'inn-ambient';
        overlay.insertBefore(amb, overlay.firstChild);
    }
    amb.innerHTML = '';
    if (tier === 'poor') {
        const candle = document.createElement('div');
        candle.className = 'inn-ambient-candle';
        amb.appendChild(candle);
    } else if (tier === 'modest') {
        const moon = document.createElement('div');
        moon.className = 'inn-ambient-moon';
        const beam = document.createElement('div');
        beam.className = 'inn-ambient-moonbeam';
        amb.appendChild(moon);
        amb.appendChild(beam);
    } else {
        const aura = document.createElement('div');
        aura.className = 'inn-ambient-aura';
        const inner = document.createElement('div');
        inner.className = 'inn-ambient-aura-inner';
        amb.appendChild(aura);
        amb.appendChild(inner);
    }
}

// ─── Golden Burst Effect (final frame) ───
function _goldenBurst(overlay, particlesEl) {
    // Flash
    const flash = document.createElement('div');
    flash.className = 'inn-flash';
    overlay.appendChild(flash);
    setTimeout(() => flash.remove(), 700);
    // Expanding burst
    const burst = document.createElement('div');
    burst.className = 'inn-burst';
    overlay.appendChild(burst);
    setTimeout(() => burst.remove(), 1300);
    // Spark shower
    for (let i = 0; i < 6; i++) {
        const p = document.createElement('div');
        p.className = 'inn-particle spark';
        p.style.left = (30 + Math.random() * 40) + '%';
        p.style.top = (35 + Math.random() * 30) + '%';
        p.style.setProperty('--dur', (1.5 + Math.random() * 2) + 's');
        p.style.setProperty('--delay', (Math.random() * 0.5) + 's');
        p.style.setProperty('--drift-x', (-40 + Math.random() * 80) + 'px');
        p.style.setProperty('--drift-y', (40 + Math.random() * 80) + 'px');
        particlesEl.appendChild(p);
    }
}

// ─── Smooth Recovery Bars ───
function _barHTML(emoji, current, max, type, isFull, sizeClass) {
    const pct = max > 0 ? Math.round((current / max) * 100) : 0;
    const fullClass = isFull ? ' full' : '';
    const spark = isFull ? ' \u2728' : '';
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
    const resEmoji = data.res_emoji || '\ud83d\udca7';
    const isFull = pct >= 1.0;

    let html = _barHTML('\u2764\ufe0f', hp, data.max_hp, 'hp', isFull) +
               _barHTML(resEmoji, mp, data.max_mp, 'mp', isFull);

    if (data.allies && data.allies.length > 0) {
        html += '<div class="inn-allies-divider">\u2500 \u25c6 GRUPO \u25c6 \u2500</div>';
        for (const a of data.allies) {
            const aFinalHp = a.final_hp !== undefined ? a.final_hp : a.max_hp;
            const aHp = Math.min(Math.round(a.start_hp + (aFinalHp - a.start_hp) * pct), a.max_hp);
            html += '<div class="inn-ally-name">' + (a.icon || '\ud83d\udc64') + ' ' + a.name + '</div>';
            html += _barHTML('\u2764\ufe0f', aHp, a.max_hp, 'hp', isFull, 'small');
            if (a.max_mp > 0) {
                const aFinalMp = a.final_mp !== undefined ? a.final_mp : a.max_mp;
                const aMp = Math.min(Math.round(a.start_mp + (aFinalMp - a.start_mp) * pct), a.max_mp);
                html += _barHTML(a.res_emoji || '\ud83d\udca7', aMp, a.max_mp, 'mp', isFull, 'small');
            }
        }
    }
    return html;
}

function _animateBarFills(container) {
    requestAnimationFrame(() => {
        const fills = container.querySelectorAll('.inn-bar-fill[data-target]');
        fills.forEach((el, i) => {
            setTimeout(() => { el.style.width = el.dataset.target + '%'; }, i * 200);
        });
    });
}

// ─── Build Frame List ───
function _buildFrames(data) {
    const tier = data.tier || 'modest';
    const templateFrames = _INN_FRAMES[tier] || _INN_FRAMES.modest;
    const dividers = _DIVIDERS[tier] || _DIVIDERS.modest;

    const frames = templateFrames.map(f => {
        const chosenLines = _pick(f.variants).map(l => l.replace('{name}', data.player_name || 'Aventureiro'));
        return {
            title: f.title,
            icons: _pick(f.icons),
            lines: chosenLines,
            bg: f.bg,
            category: f.category,
            recovery: f.recovery,
            delay: _calcInnDelay(chosenLines, f.category),
            divider: dividers[f.divider] || dividers.night || '',
        };
    });

    // Insert dream frame before last
    if (data.dream) {
        const dreamConfig = {
            poor:    { title: 'SONHO AGITADO',   icons: '\ud83d\udcad  \u00b7 \u00b7 \u00b7  \ud83d\udcad', bg: 'radial-gradient(ellipse at 50% 40%, #1a100a 0%, #0a0805 100%)', recovery: 0.8 },
            modest:  { title: 'MUNDO ON\u00cdRICO',  icons: '\ud83d\udcad  \ud83d\udd2e  \u2728', bg: 'radial-gradient(ellipse at 50% 40%, #1a0a2e 0%, #0a0518 100%)', recovery: 0.85 },
            wealthy: { title: 'VIS\u00c3O ET\u00c9REA',   icons: '\ud83d\udd2e  \ud83d\udcad  \u269c\ufe0f', bg: 'radial-gradient(ellipse at 50% 40%, #2a0a2e 0%, #150518 100%)', recovery: 0.9 },
        };
        const dc = dreamConfig[tier] || dreamConfig.modest;
        const dreamLines = ['\u201c' + data.dream + '\u201d'];
        const dreamFrame = {
            ...dc,
            lines: dreamLines,
            delay: _calcInnDelay(dreamLines, 'dream'),
            isDream: true,
            divider: dividers.dream || dividers.sleep || '',
        };
        frames.splice(frames.length - 1, 0, dreamFrame);
    }

    // Insert ally event frame
    if (data.ally_event) {
        const ae = data.ally_event;
        const allyLines = [ae.text];
        const allyFrame = {
            title: ae.title,
            icons: ae.icon + '  \ud83c\udf19',
            lines: allyLines,
            bg: 'radial-gradient(ellipse at 50% 40%, #0a0a15 0%, #050508 100%)',
            delay: _calcInnDelay(allyLines, 'narrative'),
            recovery: tier === 'poor' ? 0.8 : (frames.length > 4 ? 0.5 : 0.4),
            divider: dividers.night || '',
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
    const dividerEl = document.getElementById('inn-divider');
    const textEl = document.getElementById('inn-text');
    const nightBarEl = document.getElementById('inn-night-bar');
    const recoveryEl = document.getElementById('inn-recovery');
    const skipBtn = document.getElementById('inn-skip-btn');
    const advanceBtn = document.getElementById('inn-advance-btn');

    if (!overlay || !frameEl) {
        console.error('[INN] Overlay elements not found');
        onDone({ skipped: true });
        return;
    }

    const tier = data.tier || 'modest';
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
        advanceBtn.onclick = null;
        advanceBtn.style.display = 'none';

        overlay.classList.add('hiding');
        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.classList.remove('hiding');
            frameEl.classList.remove('active', 'exiting');
            titleEl.classList.remove('shimmer');
            const particlesEl = overlay.querySelector('.inn-particles');
            if (particlesEl) particlesEl.innerHTML = '';
            const ambEl = overlay.querySelector('.inn-ambient');
            if (ambEl) ambEl.innerHTML = '';
            const panel = document.getElementById('bottom-panel');
            if (panel) panel.style.display = '';
            onDone({ skipped: _skipped });
        }, 500);
    };

    // Skip button timing
    const skipDelay = restCount >= 3 ? 300 : 2500;
    const hasDreamInsight = data.dream_insight && data.dream;
    const skipLabel = hasDreamInsight ? 'Pular (sem b\u00f4nus do sonho)' : 'Acordar \u00bb';
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

    // Create particles
    let particlesEl = overlay.querySelector('.inn-particles');
    if (!particlesEl) {
        particlesEl = document.createElement('div');
        particlesEl.className = 'inn-particles';
        overlay.insertBefore(particlesEl, overlay.firstChild);
    }
    _createParticles(particlesEl, tier);

    // Create tier-specific ambient element
    _createAmbient(overlay, tier);

    // Hide game panel
    const panelEl = document.getElementById('bottom-panel');
    if (panelEl) panelEl.style.display = 'none';

    // ─── Frame Sequence with Cross-Dissolve ───
    function showFrame(idx) {
        if (_done || idx >= totalFrames) {
            if (!_done) finish(false);
            return;
        }
        const frame = frames[idx];
        const isLast = idx === totalFrames - 1;

        // Exit current frame with blur-dissolve
        if (idx > 0) {
            frameEl.classList.add('exiting');
        }

        const enterDelay = idx === 0 ? 50 : 550;

        setTimeout(() => {
            if (_done) return;

            frameEl.classList.remove('active', 'exiting');

            // Update background
            overlay.style.background = frame.bg;

            // Night bar
            nightBarEl.textContent = _nightBar(idx, totalFrames);

            // Title
            titleEl.textContent = frame.title;
            if (frame.recovery >= 1.0) {
                titleEl.classList.add('shimmer');
            } else {
                titleEl.classList.remove('shimmer');
            }

            // Icons
            iconsEl.textContent = frame.icons;

            // Thematic divider
            if (dividerEl) {
                if (frame.isDream) {
                    dividerEl.style.display = 'none';
                } else {
                    dividerEl.textContent = frame.divider || '';
                    dividerEl.style.display = frame.divider ? '' : 'none';
                }
            }

            // Text lines
            const lineClass = frame.isDream ? 'inn-line dream' : 'inn-line';
            textEl.innerHTML = frame.lines.map(l =>
                '<div class="' + lineClass + '">' + l + '</div>'
            ).join('');

            // Recovery bars
            if (frame.recovery > 0) {
                recoveryEl.innerHTML = _recoveryHTML(data, frame.recovery);
                recoveryEl.style.display = '';
                recoveryEl.style.animation = 'none';
                recoveryEl.offsetHeight;
                recoveryEl.style.animation = '';
                _animateBarFills(recoveryEl);
            } else {
                recoveryEl.style.display = 'none';
            }

            // Golden burst on final frame
            if (isLast && frame.recovery >= 1.0) {
                _goldenBurst(overlay, particlesEl);
            }

            // Activate frame (fade in)
            frameEl.classList.add('active');

            // Haptic feedback
            try {
                if (window.Telegram && Telegram.WebApp) {
                    const hf = Telegram.WebApp.HapticFeedback;
                    if (isLast && frame.recovery >= 1.0) {
                        hf.notificationOccurred('success');
                    } else if (frame.isDream) {
                        hf.impactOccurred('medium');
                    } else if (idx > 0) {
                        hf.impactOccurred('light');
                    }
                }
            } catch (e) { /* */ }

            // Show advance button for non-last frames
            if (!isLast && advanceBtn) {
                advanceBtn.style.display = '';
                advanceBtn.textContent = 'Avançar ›';
                advanceBtn.onclick = function() {
                    if (_done) return;
                    if (_frameTimer) clearTimeout(_frameTimer);
                    advanceBtn.style.display = 'none';
                    showFrame(idx + 1);
                };
            } else if (advanceBtn) {
                advanceBtn.style.display = 'none';
            }

            _frameTimer = setTimeout(() => {
                if (advanceBtn) advanceBtn.style.display = 'none';
                showFrame(idx + 1);
            }, frame.delay);
        }, enterDelay);
    }

    showFrame(0);
}

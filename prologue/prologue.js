/* Prologue WebApp — State machine + screen renderers
   Lendas de Valdoria (D&D 5e RPG via Telegram) */

// ═══════════════════════════════════════════════════════
// INIT & PARAMS
// ═══════════════════════════════════════════════════════

const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready(); tg.expand();
    if (tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            try { tg.close(); } catch (e) { console.warn('[PROLOGUE] tg.close:', e); }
        });
    }
}

const params = new URLSearchParams(location.search);
const TOKEN = params.get('token') || '';
const API_BASE = (params.get('api') || '').replace(/\/$/, '');
const USER_ID = parseInt(params.get('uid') || '0', 10);
const MODE = params.get('mode') || 'full';
const SHOW_PREFACE = params.get('preface') === '1';

// ── Shared Error Reporter ──
if (window.ValdoriaErrors) {
    ValdoriaErrors.init({
        appName: 'PROLOGUE',
        apiBase: API_BASE,
        token: TOKEN,
        uid: USER_ID,
    });
}

let DATA = null;       // Full prologue data from /api/prologue/init
let screenIdx = 0;     // Current screen index in the track
let choices = {};       // Accumulated player choices
let rerollsLeft = 5;

function haptic(type) {
    try { tg?.HapticFeedback?.impactOccurred?.(type || 'light'); } catch (_) { }
}

// ═══════════════════════════════════════════════════════
// API COMMUNICATION
// ═══════════════════════════════════════════════════════

async function apiCall(endpoint, body = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
    };
    if (window.Telegram?.WebApp?.initData) {
        headers['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
    }
    headers['ngrok-skip-browser-warning'] = '1';
    // Idempotency key for mutating endpoints
    if (endpoint.includes('/reroll') || endpoint.includes('/fight') || endpoint.includes('/complete') || endpoint.includes('/distract')) {
        headers['X-Idempotency-Key'] = crypto.randomUUID();
    }
    const resp = await fetchT(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_id: USER_ID, ...body }),
    });
    if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${resp.status}`);
    }
    return resp.json();
}

// ═══════════════════════════════════════════════════════
// ERROR HANDLING — provided by shared/error-reporter.js
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// SCREEN NAVIGATION
// ═══════════════════════════════════════════════════════

const track = document.getElementById('track');

function addScreen(html) {
    const div = document.createElement('div');
    div.className = 'screen fade-in';
    div.innerHTML = html;
    track.appendChild(div);
    return track.children.length - 1;
}

function goToScreen(idx) {
    screenIdx = idx;
    track.style.transform = `translateX(-${idx * 100}%)`;
}

function nextScreen(html) {
    const idx = addScreen(html);
    setTimeout(() => goToScreen(idx), 50);
}

// ═══════════════════════════════════════════════════════
// SCREEN RENDERERS
// ═══════════════════════════════════════════════════════

function renderPreface() {
    const text = DATA.preface_text || 'Boas vindas a Eldoria!';
    return `
        <div class="screen-title">Boas-Vindas a Eldoria</div>
        <div class="prologue-text">${text}</div>
        <button class="hero-btn" onclick="haptic('medium'); onPrefaceDone()">Entendido!</button>
    `;
}

function renderIntro() {
    const c = DATA.character || {};
    const l = DATA.lore || {};
    const fullName = `${c.name || ''} ${c.surname || ''}`.trim();
    const rerollLabel = rerollsLeft > 0 ? `🎲 Sortear Outra (${rerollsLeft})` : '🎲 Limite atingido';
    return `
        <div class="screen-title">A Jornada de ${fullName.toUpperCase()}</div>
        <div class="char-badge">
            <span class="char-badge-icon">${c.class_icon || '⚔️'}</span>
            <div class="char-badge-info">
                <div class="char-badge-name">${fullName}</div>
                <div class="char-badge-details">${c.class_label || ''} ${c.race || ''} · Nível ${c.level || 1}</div>
            </div>
        </div>
        <div class="lore-card">
            <div class="lore-card-title">${l.title || 'Sua Origem'}</div>
            <div class="lore-card-desc">${l.description || ''}</div>
        </div>
        <div class="screen-subtitle">As origens criam escolhas e eventos diferentes durante a jornada.</div>
        <div class="btn-row">
            <button class="outline-btn" onclick="haptic(); openLoreOverlay()">📜 Ver Origem</button>
            <button class="outline-btn" id="rerollBtn" onclick="haptic(); doReroll()" ${rerollsLeft <= 0 ? 'disabled' : ''}>${rerollLabel}</button>
        </div>
        <button class="hero-btn" onclick="haptic('medium'); onIntroDone()">Continuar ▸</button>
    `;
}

function renderGate() {
    const inter = DATA.interaction || {};
    const title = inter.title || 'EVENTO';
    const text = inter.text || '';
    const options = inter.options || [];
    let choicesHtml = options.map(o =>
        `<button class="choice-btn" onclick="haptic('medium'); onGateChoice('${o.key}')">${o.label}</button>`
    ).join('');
    return `
        <div class="screen-title">${title}</div>
        <div class="prologue-text">${text}</div>
        <div class="choice-list">${choicesHtml}</div>
    `;
}

function renderRoad() {
    const road = DATA.road || {};
    const text = road.text || '';
    return `
        <div class="screen-title">Emboscada na Estrada</div>
        <div class="prologue-text">${text}</div>
        <div class="choice-list">
            <button class="choice-btn" onclick="haptic('heavy'); onRoadChoice('fight')">⚔️ Lutar!</button>
            <button class="choice-btn" onclick="haptic('medium'); onRoadChoice('distract')">🛡️ Criar distração</button>
        </div>
    `;
}

function renderAftermath() {
    const text = DATA.aftermath_text || '';
    return `
        <div class="screen-title">Thorne, o Ferreiro</div>
        <div class="prologue-text">${text}</div>
        <button class="hero-btn" onclick="haptic('heavy'); onEnterCity()">🏘️ Entrar em Eldoria</button>
    `;
}

// ═══════════════════════════════════════════════════════
// LORE SUB-SCREEN OVERLAY
// ═══════════════════════════════════════════════════════

function openLoreOverlay() {
    const l = DATA.lore || {};
    const c = DATA.character || {};
    const fullName = `${c.name || ''} ${c.surname || ''}`.trim();
    const body = document.getElementById('loreOverlayBody');
    body.innerHTML = `
        <div class="screen-title" style="text-align:left;margin-bottom:12px">📜 ${fullName}</div>
        <div style="line-height:1.7">${l.intro_text || 'Nenhuma história disponível.'}</div>
    `;
    document.getElementById('loreOverlay').classList.add('active');
}

function closeLoreOverlay() {
    haptic();
    document.getElementById('loreOverlay').classList.remove('active');
}

// ═══════════════════════════════════════════════════════
// DICE ANIMATION (distract skill check)
// ═══════════════════════════════════════════════════════

let _prologueDice = null;

function showDiceRoll(result) {
    const overlay = document.getElementById('diceOverlay');
    const canvas = document.getElementById('prologueDice3dCanvas');
    const breakdown = document.getElementById('diceBreakdown');
    const resultLabel = document.getElementById('diceResultLabel');
    const narrative = document.getElementById('diceNarrative');
    const actions = document.getElementById('diceActions');

    breakdown.textContent = '';
    resultLabel.textContent = '';
    narrative.textContent = '';
    actions.innerHTML = '';
    overlay.classList.add('active');

    // Initialize Dice3D for d20
    try {
        if (_prologueDice) { _prologueDice.dispose(); _prologueDice = null; }
        _prologueDice = new Dice3D(canvas, { size: 160, dieType: 'd20', duration: 1200 });
    } catch (e) {
        console.warn('[PROLOGUE] Dice3D init failed, fallback:', e);
        _showDiceRollFallback(result);
        return;
    }

    const natural = result.natural;
    const mod = result.modifier;
    const total = result.total;
    const dc = result.dc;
    const success = result.success;

    _prologueDice.roll(natural, function () {
        const modSign = mod >= 0 ? '+' : '';
        breakdown.textContent = `1d20 (${natural}) ${modSign}${mod} = ${total} vs DC ${dc}`;
        resultLabel.textContent = success ? 'SUCESSO!' : 'FALHA!';
        resultLabel.style.color = success ? 'var(--v-success)' : 'var(--v-danger)';

        if (success) {
            narrative.innerHTML = (
                'Você pega uma tocha da carroça tombada e a balança na direção dos lobos, ' +
                'gritando e batendo em um escudo improvisado. O fogo e o barulho os assustam — ' +
                'os predadores recuam entre os arbustos, ganindo.<br><br>' +
                '<span style="color:var(--v-success);font-weight:700">✨ +50 XP</span>'
            );
            actions.innerHTML = `<button class="hero-btn" onclick="haptic('medium'); onDistractSuccess()">🗣️ Falar com o ferreiro</button>`;
        } else {
            narrative.innerHTML = (
                'Você tenta assustar os lobos, mas o líder da matilha não se intimida. ' +
                'Ele rosna e avança! Não há outra opção — é lutar ou morrer!'
            );
            actions.innerHTML = `<button class="hero-btn" onclick="haptic('heavy'); onDistractFail()">⚔️ Lutar!</button>`;
        }

        try { if (tg) tg.HapticFeedback.notificationOccurred(success ? 'success' : 'error'); } catch (e) {}
    });
}

// Fallback if Dice3D/THREE.js fails to load
function _showDiceRollFallback(result) {
    const d20 = document.getElementById('diceD20');
    d20.style.display = '';
    d20.className = 'dice-d20 rolling';
    d20.textContent = '?';
    let rollInterval = setInterval(() => {
        d20.textContent = Math.floor(Math.random() * 20) + 1;
    }, 80);
    setTimeout(() => {
        clearInterval(rollInterval);
        d20.textContent = result.natural;
        d20.className = 'dice-d20 ' + (result.success ? 'success' : 'fail');
        const modSign = result.modifier >= 0 ? '+' : '';
        document.getElementById('diceBreakdown').textContent =
            `1d20 (${result.natural}) ${modSign}${result.modifier} = ${result.total} vs DC ${result.dc}`;
        document.getElementById('diceResultLabel').textContent = result.success ? 'SUCESSO!' : 'FALHA!';
        document.getElementById('diceResultLabel').style.color = result.success ? 'var(--v-success)' : 'var(--v-danger)';
        const narrative = document.getElementById('diceNarrative');
        const actions = document.getElementById('diceActions');
        if (result.success) {
            narrative.innerHTML = 'Você pega uma tocha da carroça tombada e a balança na direção dos lobos, ' +
                'gritando e batendo em um escudo improvisado. O fogo e o barulho os assustam — ' +
                'os predadores recuam entre os arbustos, ganindo.<br><br>' +
                '<span style="color:var(--v-success);font-weight:700">✨ +50 XP</span>';
            actions.innerHTML = `<button class="hero-btn" onclick="haptic('medium'); onDistractSuccess()">🗣️ Falar com o ferreiro</button>`;
        } else {
            narrative.innerHTML = 'Você tenta assustar os lobos, mas o líder da matilha não se intimida. ' +
                'Ele rosna e avança! Não há outra opção — é lutar ou morrer!';
            actions.innerHTML = `<button class="hero-btn" onclick="haptic('heavy'); onDistractFail()">⚔️ Lutar!</button>`;
        }
    }, 1200);
}

// ═══════════════════════════════════════════════════════
// RESULT OVERLAY (timed, gate/lore interaction outcome)
// ═══════════════════════════════════════════════════════

function showGateResult(outcomeText, effectText, callback) {
    const overlay = document.getElementById('resultOverlay');
    const textEl = document.getElementById('resultText');
    const effectsEl = document.getElementById('resultEffects');
    const skipBtn = document.getElementById('resultSkip');

    textEl.innerHTML = outcomeText;

    // Determine badge type from effect text
    let badgeClass = 'neutral';
    if (effectText.includes('Penalidade') || effectText.includes('-')) badgeClass = 'negative';
    else if (effectText.includes('Bônus') || effectText.includes('+')) badgeClass = 'positive';

    effectsEl.innerHTML = effectText ? `<div class="effect-badge ${badgeClass}">${effectText}</div>` : '';

    overlay.classList.add('active');

    // Timed transition: 2500ms + skip after 500ms (mandatory rule)
    let _done = false;
    const finish = () => {
        if (_done) return;
        _done = true;
        skipBtn.classList.remove('visible');
        skipBtn.onclick = null;
        overlay.classList.remove('active');
        callback();
    };
    setTimeout(() => {
        if (!_done) {
            skipBtn.classList.add('visible');
            skipBtn.onclick = finish;
        }
    }, 500);
    setTimeout(finish, 2500);
}

// ═══════════════════════════════════════════════════════
// EVENT HANDLERS (screen transitions)
// ═══════════════════════════════════════════════════════

function onPrefaceDone() {
    nextScreen(renderIntro());
}

function onIntroDone() {
    closeLoreOverlay();
    nextScreen(renderGate());
}

async function doReroll() {
    if (rerollsLeft <= 0) return;
    const btn = document.getElementById('rerollBtn');
    if (btn) { btn.disabled = true; btn.textContent = '🎲 Sorteando...'; }

    try {
        const result = await apiCall('/api/prologue/reroll');
        DATA.lore = result.lore;
        DATA.interaction = result.interaction;
        rerollsLeft = result.rerolls_left ?? (rerollsLeft - 1);

        // Re-render intro screen in place
        const screens = track.querySelectorAll('.screen');
        const currentScreen = screens[screenIdx];
        if (currentScreen) {
            currentScreen.innerHTML = renderIntro();
        }
    } catch (e) {
        showError('Erro ao sortear nova origem.', e);
    }
}

function onGateChoice(key) {
    choices.gate_choice = key;
    choices.interaction_type = DATA.interaction?.type || 'gate';

    // Compute outcome text client-side for display
    const inter = DATA.interaction || {};
    let outcomeText = '';
    let effectText = '';

    if (inter.type === 'lore' && inter.outcomes) {
        const outcome = inter.outcomes[key] || {};
        outcomeText = outcome.text || 'Você avança para a cidade.';
        if (outcome.gold) {
            const sign = outcome.gold > 0 ? '+' : '';
            effectText = `${sign}${outcome.gold} GP`;
        }
    } else {
        // Gate guard — simplified display text (effects applied server-side)
        const gateTexts = {
            refuge: {
                text: 'O guarda te analisa de cima a baixo e te deixa passar, mas não sem uma inspeção.',
                effect: '⚠️ Inspeção nos portões'
            },
            bribe: {
                text: 'O guarda pega as moedas rapidamente. "Um cidadão exemplar. A cidade lhe dá as boas-vindas."',
                effect: '💰 Taxa de entrada paga'
            },
            intimidate: {
                text: 'O guarda mais velho não hesita — a coronha da lança acerta seu estômago. A dor acende algo dentro de você.',
                effect: '⚡ Entrada pela força'
            },
        };
        const g = gateTexts[key] || { text: 'Você entra na cidade.', effect: '' };
        outcomeText = g.text;
        effectText = g.effect;
    }

    showGateResult(outcomeText, effectText, () => {
        // Bridge text + road encounter
        nextScreen(renderRoad());
    });
}

async function onRoadChoice(key) {
    choices.road_choice = key;

    if (key === 'fight') {
        await doFight();
    } else {
        await doDistract();
    }
}

async function doDistract() {
    try {
        const result = await apiCall('/api/prologue/distract');
        choices.distract = result;
        showDiceRoll(result);
    } catch (e) {
        showError('Erro no teste de habilidade.', e);
    }
}

function onDistractSuccess() {
    document.getElementById('diceOverlay').classList.remove('active');
    nextScreen(renderAftermath());
}

async function onDistractFail() {
    document.getElementById('diceOverlay').classList.remove('active');
    await doFight();
}

async function doFight() {
    try {
        // Show loading while staging combat
        document.getElementById('loading').style.display = 'flex';
        document.querySelector('#loading p').textContent = 'Preparando combate...';

        const result = await apiCall('/api/prologue/fight', {
            gate_choice: choices.gate_choice || '',
            interaction_type: choices.interaction_type || 'gate',
        });

        if (result.combat_url || result.arena_url) {
            // Navigate to arena WebApp
            window.location.replace(result.combat_url || result.arena_url);
        } else {
            showError('Erro ao iniciar combate.');
        }
    } catch (e) {
        showError('Erro ao iniciar combate.', e);
    }
}

async function onEnterCity() {
    try {
        document.getElementById('loading').style.display = 'flex';
        document.querySelector('#loading p').textContent = 'Entrando em Eldoria...';

        const body = {
            gate_choice: choices.gate_choice || '',
            interaction_type: choices.interaction_type || 'gate',
            aftermath_only: MODE === 'aftermath',
        };
        if (choices.distract) {
            body.distract = choices.distract;
        }

        const result = await apiCall('/api/prologue/complete', body);

        // Redirect to Game Hub (stays in WebApp)
        if (result && result.game_url) {
            window.location.replace(result.game_url);
        } else {
            // Fallback: close WebApp and let user tap JOGAR from Telegram
            // (prologue token is not valid for Game Hub sessions)
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.close();
            }
        }
    } catch (e) {
        showError('Erro ao entrar na cidade.', e);
    }
}

// ═══════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════

async function boot() {
    if (!TOKEN || !API_BASE || !USER_ID) {
        showError('Parâmetros inválidos. Feche e tente novamente.');
        return;
    }

    try {
        DATA = await apiCall('/api/prologue/init');

        document.getElementById('loading').style.display = 'none';

        if (DATA.mode === 'aftermath') {
            // Post-combat: show aftermath directly
            addScreen(renderAftermath());
            goToScreen(0);
            return;
        }

        // Full prologue flow
        if (DATA.show_preface) {
            addScreen(renderPreface());
        } else {
            addScreen(renderIntro());
        }
        goToScreen(0);
    } catch (e) {
        showError('Erro ao carregar prólogo. Feche e tente novamente.', e);
    }
}

boot();

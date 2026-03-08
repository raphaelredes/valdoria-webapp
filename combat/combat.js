/* ═══════════════════════════════════════════════
   COMBATE - Lendas de Valdoria
   Fixed-viewport combat webapp with compact UI
   Supports API mode (persistent) and sendData fallback
   ═══════════════════════════════════════════════ */

// ─── INIT ───
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const params = new URLSearchParams(window.location.search);
const token = params.get('token') || '';
const apiBase = params.get('api') || '';
const userId = parseInt(params.get('uid') || '0');
const rawData = params.get('data');
const originApp = params.get('origin') || (apiBase ? 'game' : '');
const isApiMode = !!apiBase;
let currentState = null;
let _lastAnimatedRoll = null; // Dedup: prevents replaying same dice animation on re-render
let _initDiceAnimated = false; // Dedup: prevents replaying initiative dice on poll re-render

// ─── IMMERSION FEATURES STATE ───
const _prevHpState = new Map(); // Feature 1: HP bar animation tracking
let _prevPlayerHp = 0;          // Feature 2: detect player damage for shake
let _audioCtx = null;           // Feature 8: Web Audio (lazy init)
let _audioUnlocked = false;     // Feature 8: requires user gesture to unlock
let _currentPositions = null;   // Feature 9: combat positions
let _cinematicInProgress = false; // Blocks re-render during action cinematic
let _lastRenderedPhase = null;  // Phase transition tracking
let _hitStreak = 0;               // P2-G: Combo streak counter
let _initDice3d = null;           // THREE.js Dice3D instance for initiative screen
let _dmgDice3d = null;            // THREE.js Dice3D instance for damage rolls

// ─── TIMER / POLLING / HEARTBEAT STATE ───
let _timerInterval = null;
let _timerRemaining = 0;
let _timerMax = 0;
let _pollInterval = null;
let _heartbeatInterval = null;

// ─── COMBAT API (persistent fetch mode) ───
class CombatAPI {
    constructor(base, tok, uid) {
        this.base = base.replace(/\/$/, '');
        this.token = tok;
        this.userId = uid;
    }
    _baseHeaders() {
        const h = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` };
        if (window.Telegram?.WebApp?.initData) {
            h['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
        }
        h['ngrok-skip-browser-warning'] = '1';
        return h;
    }
    async getState() {
        const r = await fetchT(`${this.base}/api/combat/state`, {
            method: 'POST',
            headers: this._baseHeaders(),
            body: JSON.stringify({ user_id: this.userId }),
        });
        if (!r.ok) {
            const body = await r.json().catch(() => ({}));
            const err = new Error(body.error || `API ${r.status}`);
            err.status = r.status;
            throw err;
        }
        return r.json();
    }
    async checkHealth() {
        try {
            const r = await fetchT(`${this.base}/api/combat/health`, { method: 'GET' });
            if (!r.ok) return { status: 'unreachable' };
            return r.json();
        } catch (e) {
            return { status: 'unreachable' };
        }
    }
    async sendAction(data) {
        const h = this._baseHeaders();
        h['X-Idempotency-Key'] = crypto.randomUUID();
        const r = await fetchT(`${this.base}/api/combat/action`, {
            method: 'POST',
            headers: h,
            body: JSON.stringify({ user_id: this.userId, ...data }),
        });
        if (!r.ok) {
            const body = await r.json().catch(() => ({}));
            const err = new Error(body.error || `API ${r.status}`);
            err.status = r.status;
            throw err;
        }
        return r.json();
    }
}
const api = isApiMode ? new CombatAPI(apiBase, token, userId) : null;

function b64Decode(str) {
    const std = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = std.length % 4;
    const padded = pad ? std + '='.repeat(4 - pad) : std;
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
}

// ─── CONSTANTS ───
const BIOME_NAMES = {
    forest: 'Floresta', cave: 'Caverna', graveyard: 'Cemiterio', swamp: 'Pantano',
    volcanic: 'Vulcanico', snow: 'Neve', desert: 'Deserto', mountain: 'Montanha',
    plains: 'Planicie', dungeon: 'Masmorra', city: 'Cidade', ruins: 'Ruinas',
};

const STATUS_ICONS = {
    poisoned: '🧪', blinded: '🌑', paralyzed: '⚡', prone: '🦶', restrained: '🕸️',
    frightened: '😱', stunned: '💫', grappled: '👐', petrified: '🪨', exhausted: '😫',
    marked: '🎯', blessed: '✨', hexed: '👁️', burning: '🔥', frozen: '❄️',
    sleeping: '💤', charmed: '💖', deafened: '🔇', incapacitated: '🚫',
    invisible: '👻', surprised: '❗', exposed: '🎯', inspired: '🎵',
    concentrated: '🔮', raging: '💢', wild_shaped: '🐾',
};

const DMG_ICONS = {
    slashing: '🗡️', piercing: '🏹', bludgeoning: '🔨', fire: '🔥', cold: '❄️',
    lightning: '⚡', necrotic: '💀', radiant: '✨', psychic: '🧠', thunder: '💥',
    poison: '🧪', acid: '🟢', force: '💠',
};

const ATK_TYPE_LABELS = { melee: 'Corpo a corpo', ranged: 'A distancia', magic: 'Magico' };

const RES_CLASS_MAP = {
    'Mana': 'mp', 'Ki': 'ki', 'Fúria': 'fury', 'Vigor': 'vigor',
    'Inspiração': 'inspiration', 'Pacto': 'pact', 'Energia': 'energy',
};

const RES_ICON_MAP = {
    'Mana': '💧', 'Ki': '⚡', 'Fúria': '💢', 'Vigor': '💪',
    'Inspiração': '🎵', 'Pacto': '👁️', 'Energia': '⚡',
};

// ─── STARTUP ───
if (isApiMode) {
    loadCombatState();
} else if (rawData) {
    try {
        const state = JSON.parse(b64Decode(rawData));
        currentState = state;
        renderArena(state);
    } catch (e) {
        console.error('[COMBAT]', 'Dados corrompidos', e);
        document.getElementById('app').innerHTML = '<div class="no-data"><h2>Erro</h2><p>Dados de combate corrompidos.</p></div>';
    }
} else {
    document.getElementById('app').innerHTML = '<div class="no-data"><h2>Combate</h2><p>Nenhum dado recebido.</p></div>';
}

async function loadCombatState() {
    try {
        const state = await api.getState();
        if (state.error === 'no_combat' || state.phase === 'ended') { showCombatEnded(); return; }
        currentState = state;
        if (state.phase && !state.ph) state.ph = state.phase;
        renderArena(state);
        startHeartbeat();
    } catch (e) {
        console.error('[COMBAT]', 'Erro ao carregar', e);
        // Distinguish "server down" from "session invalid" via health check
        const health = await api.checkHealth();
        if (health.status === 'unreachable') {
            document.getElementById('app').innerHTML = '<div class="no-data"><h2>Servidor Indisponível</h2><p>O servidor de combate não está respondendo. Tente novamente em alguns segundos.</p></div>';
        } else if (e.status === 401) {
            document.getElementById('app').innerHTML = '<div class="no-data"><h2>Sessão Expirada</h2><p>Feche esta janela e reabra o combate no Telegram.</p></div>';
        } else {
            document.getElementById('app').innerHTML = '<div class="no-data"><h2>Erro de Conexão</h2><p>Não foi possível carregar o combate.</p></div>';
        }
    }
}

function showCombatEnded() {
    stopAllIntervals();
    document.getElementById('app').innerHTML = '<div class="no-data"><h2>Combate Encerrado</h2><p>Este combate já foi finalizado.</p></div>';
    if (isApiMode && originApp) {
        setTimeout(() => transitionFromArena('ended'), 1500);
    } else {
        setTimeout(() => { try { if (tg) tg.close(); } catch (e) { console.warn('[COMBAT] tg.close() failed', e); } }, 2000);
    }
}

function closeCombat(result) {
    stopAllIntervals();
    // API mode: always transition (originApp defaults to 'game' when empty)
    if (isApiMode && originApp) {
        transitionFromArena(result);
        return;
    }
    // sendData fallback (non-API mode)
    if (tg) {
        tg.sendData(JSON.stringify({ action: 'combat_close', token: token, result: result }));
        setTimeout(() => { try { tg.close(); } catch (e) { console.warn('[COMBAT] tg.close() failed', e); } }, 300);
    }
}

async function transitionFromArena(result) {
    const body = {
        from: 'combat', to: originApp,
        user_id: userId,
        payload: { result: result }
    };
    const _th = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    if (window.Telegram?.WebApp?.initData) { _th['X-Telegram-Init-Data'] = Telegram.WebApp.initData; }
    _th['ngrok-skip-browser-warning'] = '1';
    _th['X-Idempotency-Key'] = crypto.randomUUID();

    try {
        const resp = await fetchT(`${apiBase}/api/webapp/transition`, {
            method: 'POST',
            headers: _th,
            body: JSON.stringify(body)
        });

        if (resp.ok) {
            const data = await resp.json();
            if (data.url) {
                window.location.replace(data.url);
                return;
            }
        }
        console.error('[COMBAT] Transition back failed, closing');
    } catch (e) {
        console.error('[COMBAT] Transition error:', e);
    }

    // Fallback: close WebApp and let user tap JOGAR from Telegram
    // (combat token is not valid for Game Hub sessions)
    showError('Erro na transição. Fechando...');
    setTimeout(() => { try { if (tg) tg.close(); } catch (e) { console.warn('[COMBAT] tg.close() failed', e); } }, 2000);
}

async function transitionToLevelup() {
    const body = {
        from: 'combat', to: 'levelup',
        user_id: userId,
        payload: {}
    };
    const _th = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    if (window.Telegram?.WebApp?.initData) { _th['X-Telegram-Init-Data'] = Telegram.WebApp.initData; }
    _th['ngrok-skip-browser-warning'] = '1';
    _th['X-Idempotency-Key'] = crypto.randomUUID();

    try {
        const resp = await fetchT(`${apiBase}/api/webapp/transition`, {
            method: 'POST',
            headers: _th,
            body: JSON.stringify(body)
        });

        if (resp.ok) {
            const data = await resp.json();
            if (data.url) {
                window.location.replace(data.url);
                return;
            }
        }
        console.error('[COMBAT] Transition to levelup failed');
    } catch (e) {
        console.error('[COMBAT] Transition to levelup error:', e);
    }

    // Fallback: continue normally (close or go back to explore)
    closeCombat('victory');
}

async function transitionToInventoryFromArena() {
    const body = {
        from: 'combat', to: 'inventory',
        user_id: userId,
        payload: {}
    };
    const _th = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    if (window.Telegram?.WebApp?.initData) { _th['X-Telegram-Init-Data'] = Telegram.WebApp.initData; }
    _th['ngrok-skip-browser-warning'] = '1';
    _th['X-Idempotency-Key'] = crypto.randomUUID();

    try {
        const resp = await fetchT(`${apiBase}/api/webapp/transition`, {
            method: 'POST',
            headers: _th,
            body: JSON.stringify(body)
        });

        if (resp.ok) {
            const data = await resp.json();
            if (data.url) {
                window.location.replace(data.url);
                return;
            }
        }
        console.error('[COMBAT] Transition to inventory failed');
    } catch (e) {
        console.error('[COMBAT] Transition to inventory error:', e);
    }
}

function renderResolution(state) {
    stopAllIntervals();
    const isVictory = state.phase === 'victory';
    const rawText = state.result_text || state.action_result_text || '';
    const app = document.getElementById('app');

    // Build rewards from structured data (preferred) or parse from text (fallback)
    let rewardsHtml = '';
    let narrativeLines = [];

    const rewards = state.rewards;
    if (rewards && isVictory) {
        // Structured reward data from API
        if (rewards.xp > 0) {
            rewardsHtml += `<div class="res-reward"><span class="res-icon">⭐</span><span>+${rewards.xp} XP</span></div>`;
        }
        if (rewards.gold > 0) {
            rewardsHtml += `<div class="res-reward"><span class="res-icon">🪙</span><span>+${rewards.gold} GP</span></div>`;
        }
        if (rewards.loot) {
            rewards.loot.split('\n').filter(l => l.trim()).forEach(item => {
                rewardsHtml += `<div class="res-reward"><span class="res-icon">🎁</span><span>${escHtml(item.trim())}</span></div>`;
            });
        }
    } else {
        // Fallback: parse from raw text
        const lines = rawText.split('\n').filter(l => l.trim());
        lines.forEach(line => {
            const trimmed = line.trim();
            if (/\+\d+\s*(XP|xp|EXP)/i.test(trimmed)) {
                const match = trimmed.match(/\+?(\d+)\s*(XP|xp|EXP)/i);
                rewardsHtml += `<div class="res-reward"><span class="res-icon">⭐</span><span>${match[1]} XP</span></div>`;
            } else if (/\d+\s*(GP|gp|gold|ouro)/i.test(trimmed)) {
                const match = trimmed.match(/(\d+)\s*(GP|gp|gold|ouro)/i);
                rewardsHtml += `<div class="res-reward"><span class="res-icon">🪙</span><span>${match[1]} GP</span></div>`;
            } else if (/nível|level.*up|subiu/i.test(trimmed)) {
                rewardsHtml += `<div class="res-reward res-levelup"><span class="res-icon">🎉</span><span>${escHtml(trimmed)}</span></div>`;
            } else if (/ganhou|obteve|recebeu|encontrou|drop/i.test(trimmed)) {
                rewardsHtml += `<div class="res-reward"><span class="res-icon">🎁</span><span>${escHtml(trimmed)}</span></div>`;
            } else {
                narrativeLines.push(trimmed);
            }
        });
    }

    // Extract narrative from raw text if not already parsed
    if (!narrativeLines.length && rawText) {
        rawText.split('\n').filter(l => l.trim()).forEach(line => {
            const t = line.trim();
            if (!/\+\d+\s*(XP|GP)/i.test(t)) narrativeLines.push(t);
        });
    }

    const narrativeHtml = narrativeLines.length > 0
        ? `<div class="res-narrative">${narrativeLines.map(l => escHtml(l)).join('<br>')}</div>`
        : '';
    const rewardsBlock = rewardsHtml
        ? `<div class="res-rewards">${rewardsHtml}</div>`
        : '';

    // Level-up transition button (when player leveled up with pending choices)
    const hasLevelUp = isVictory && state.leveled_up && isApiMode;
    const buttonsHtml = hasLevelUp
        ? `<button class="action-btn primary res-continue res-levelup-btn" onclick="transitionToLevelup()">
               ⬆️ Distribuir Pontos!
           </button>
           <button class="action-btn secondary res-continue" onclick="closeCombat('${state.phase}')" style="margin-top:8px;opacity:0.7">
               🏕️ Pular
           </button>`
        : `<button class="action-btn primary res-continue" onclick="closeCombat('${state.phase}')">
               ${isVictory ? '🏕️ Continuar Aventura' : '💫 Continuar'}
           </button>`;

    app.innerHTML = `<div class="resolution-screen">
        <div class="res-header ${isVictory ? 'victory' : 'defeat'}">
            <div class="res-title">${isVictory ? '🏆 VITÓRIA!' : '💀 DERROTA'}</div>
        </div>
        ${narrativeHtml}
        ${rewardsBlock}
        ${buttonsHtml}
    </div>`;

    // Sequential reveal: stagger each reward item appearance
    const rewardEls = app.querySelectorAll('.res-reward');
    const continueBtn = app.querySelector('.res-continue');
    if (rewardEls.length > 0) {
        rewardEls.forEach((el, i) => {
            el.classList.add('reward-hidden');
            setTimeout(() => {
                el.classList.remove('reward-hidden');
                el.classList.add('reward-reveal');
                hapticSelect();
            }, 400 + i * 500);
        });
        // Show continue button after all rewards revealed
        if (continueBtn) {
            continueBtn.classList.add('reward-hidden');
            setTimeout(() => {
                continueBtn.classList.remove('reward-hidden');
                continueBtn.classList.add('reward-reveal');
            }, 400 + rewardEls.length * 500 + 300);
        }
    }
}


// ─── MAIN RENDER ───
function renderArena(s) {
    const app = document.getElementById('app');

    // P0-C: Phase transition fade (intro->init->active)
    const newPh = s.ph || s.phase || 'intro';
    if (_lastRenderedPhase && _lastRenderedPhase !== newPh && !_cinematicInProgress) {
        app.classList.add('phase-fade-out');
        setTimeout(() => {
            app.classList.remove('phase-fade-out');
            app.classList.add('phase-fade-in');
            _lastRenderedPhase = newPh;
            _renderArenaInner(s);
            setTimeout(() => app.classList.remove('phase-fade-in'), 200);
        }, 200);
        return;
    }
    _lastRenderedPhase = newPh;
    _renderArenaInner(s);
}

function _renderArenaInner(s) {
    // Dispose 3D dice when leaving intro phase
    if (_initDice3d && (s.ph || s.phase || 'intro') !== 'intro') {
        _initDice3d.dispose(); _initDice3d = null;
    }
    // Dispose damage 3D dice on re-render
    if (_dmgDice3d) { _dmgDice3d.dispose(); _dmgDice3d = null; }
    const app = document.getElementById('app');
    // Clear previous biome classes before applying new one
    document.body.className = document.body.className.replace(/\bbiome-\S+/g, '').trim();
    document.body.classList.add('biome-' + (s.bio || 'forest'));

    const biomeName = BIOME_NAMES[s.bio] || s.bio || 'Desconhecido';
    const weatherStr = s.w ? `${s.w.ico} ${s.w.l}` : '☀️ Limpo';

    const activeTurn = s.to && s.to[0] ? s.to[0] : null;
    _currentPositions = s.positions || null; // Feature 9

    const ph = s.ph || s.phase || 'intro';

    let html = '';

    // Header (dynamic title based on biome)
    const biomeTitle = s.bio === 'arena' ? 'Arena de Combate' :
        s.bio === 'dungeon' ? 'Combate na Masmorra' :
            s.bio === 'cave' ? 'Combate na Caverna' :
                s.bio === 'city' ? 'Combate na Cidade' : 'Combate';
    html += `<div class="arena-header">
        <div class="arena-title">${biomeTitle}</div>
        <div class="arena-subtitle">Rodada ${s.rn || 1} · ${biomeName} · ${weatherStr}</div>
    </div>`;

    // Enemy Zone — TOP (opponents on the far side of the arena)
    html += '<div class="zone zone-enemies"><div class="zone-label">Inimigos</div>';
    if (s.e && s.e.length > 0) {
        s.e.forEach((e, i) => {
            const isActive = activeTurn && activeTurn.t === 'e' && activeTurn.n === e.n;
            html += renderEntity(e, 'enemy', i, isActive);
        });
    }
    html += '</div>';

    // Battlefield — CENTER (arena where dice roll between combatants)
    const isNarrative = s.vm === 'simple';
    html += '<div class="battlefield">';
    if (ph === 'intro') {
        // Immersive initiative area with real 3D d20 (THREE.js Dice3D)
        html += '<div id="init-hero-area" class="init-hero-area">';
        html += '<div class="init-dice3d-wrap" id="initDice3dWrap"><div class="init-dice3d-particles" id="initDice3dParticles"></div><div class="init-dice3d-canvas" id="initDice3dCanvas"></div></div>';
        html += '<div class="init-hero-result" id="initHeroResult"></div>';
        html += '<button class="init-hero-btn" id="initHeroBtn" data-action="initiative">ROLAR INICIATIVA</button>';
        html += '<div class="init-hero-subtitle">Toque para determinar a ordem de combate</div>';
        html += '</div>';
    } else {
        html += renderTurnTimeline(s.to);
        const diceDisplay = (ph === 'init' || isNarrative) ? 'display:none;' : '';
        html += `<div class="dice-row" style="${diceDisplay}">
            <div class="dice-box-compact"><div class="dice-emoji" id="dice1">🎲</div><div><div class="dice-result" id="diceResult1"></div><div class="dice-label" id="diceLabel1">d20</div></div></div>
            <div class="dice-box-compact"><div class="dice-emoji" id="dice2">🎲</div><div><div class="dice-result" id="diceResult2"></div><div class="dice-label" id="diceLabel2">dano</div></div></div>
        </div>
        <div class="dice-formula" id="diceFormula" style="${diceDisplay}"></div>
        <div class="dice-narration" id="diceNarration" style="${diceDisplay}"></div>`;
        // 3D damage dice overlay (appears during damage roll animation)
        html += '<div class="dmg-dice3d-overlay" id="dmgDice3dOverlay" style="display:none"><div class="dmg-dice3d-particles" id="dmgDice3dParticles"></div><div class="dmg-dice3d-canvas" id="dmgDice3dCanvas"></div><div class="dmg-dice3d-label" id="dmgDice3dLabel"></div><button class="dmg-dice3d-skip" id="dmgDice3dSkip">Pular</button></div>';
    }
    if (s.feed && s.feed.length > 0) {
        const total = s.feed.length;
        const visibleCount = isNarrative ? 6 : 3;
        const recentFeed = s.feed.slice(-visibleCount);
        const narrativeCls = isNarrative ? ' combat-feed-narrative' : '';
        html += `<div class="combat-feed${narrativeCls}" id="combatFeed">`;
        if (total > visibleCount) {
            const older = s.feed.slice(0, -visibleCount);
            older.forEach(f => { html += `<div class="feed-entry feed-hidden">${escHtml(f)}</div>`; });
        }
        recentFeed.forEach(f => { html += `<div class="feed-entry">${escHtml(f)}</div>`; });
        if (total > visibleCount) {
            html += `<div class="feed-toggle" id="feedToggle">▲ Mostrar +${total - visibleCount} anteriores</div>`;
        }
        html += '</div>';
    }
    html += '</div>';

    // Player Zone — BOTTOM (your side of the arena)
    html += '<div class="zone zone-player"><div class="zone-label">Seu Personagem</div>';
    html += renderPlayerCard(s.p, ph === 'init' || ph === 'intro');
    html += '</div>';

    // Allies Zone — BOTTOM (beside you)
    if (s.a && s.a.length > 0) {
        html += '<div class="zone zone-allies"><div class="zone-label">Aliados</div>';
        s.a.forEach((a, i) => {
            const isActive = activeTurn && activeTurn.t === 'a' && activeTurn.n === a.n;
            html += renderEntity(a, 'ally', i, isActive);
        });
        html += '</div>';
    }

    // Action Bar — phase-dependent (with D&D 5e sub-phase support)
    const subPh = s.sub_phase || '';
    const isUnconscious = s.unconscious || (s.p && s.p.hp <= 0);
    if (ph === 'active' && isUnconscious) {
        // Spectator mode: player is unconscious, allies fight on
        html += `<div class="action-bar spectator-bar">
            <div class="spectator-msg">💀 <b>Inconsciente</b> — seus aliados continuam a luta</div>
        </div>`;
    } else if (ph === 'active' && subPh === 'bonus_action') {
        html += renderTimerBar(s);
        html += renderBonusActionBar(s.acts, s.e, s.p);
    } else if (ph === 'active' && subPh === 'reaction') {
        html += renderTimerBar(s);
        html += renderReactionBar(s.acts, s.p);
    } else if (ph === 'active') {
        html += renderTimerBar(s);
        html += renderActionBar(s.acts, s.e, s.p);
    } else if (ph === 'intro' && isApiMode) {
        // Initiative button is in the battlefield center (immersive hero button)
        if (s.can_restore) {
            html += `<div class="action-bar"><button class="action-btn primary full-width" data-action="restore" style="font-size:14px;padding:12px">🔄 Restaurar Combate</button></div>`;
        }
    } else if (ph === 'init') {
        // Initiative rolled — animated dice + proceed button
        html += '<div id="init-dice-area"></div>';
        if (isApiMode) {
            html += `<div class="action-bar" id="init-proceed-bar" style="display:none"><button class="action-btn primary full-width" data-action="proceed" style="font-size:14px;padding:12px">⚔️ Prosseguir para o Combate</button></div>`;
        } else {
            html += `<div class="action-bar"><div style="text-align:center;color:var(--v-text-dim);font-size:12px;padding:8px">⚔️ Aguardando inicio do combate...</div></div>`;
        }
    } else {
        // Legacy intro or unknown phase
        html += `<div class="action-bar"><div class="action-loading"><div class="loading-d20-icon"></div><span>Definindo iniciativa<span class="loading-dots"></span></span></div></div>`;
    }

    // Fade transition on state change
    app.classList.remove('fade-in');
    app.innerHTML = html;
    void app.offsetWidth; // force reflow
    app.classList.add('fade-in');

    // Init dice animation (combat attack rolls)
    initDice(s.lr);

    // Initiative dice animation (DiceRoller component)
    _triggerInitiativeDice(s);

    // Immersive initiative: create 3D d20 + bind button (intro phase)
    const heroBtn = document.getElementById('initHeroBtn');
    if (heroBtn) {
        // Init Dice3D (idle floating d20)
        const d3dCanvas = document.getElementById('initDice3dCanvas');
        const d3dPart = document.getElementById('initDice3dParticles');
        if (d3dCanvas && typeof Dice3D !== 'undefined') {
            if (_initDice3d) { _initDice3d.dispose(); _initDice3d = null; }
            try { _initDice3d = new Dice3D(d3dCanvas, { size: 200, particlesContainer: d3dPart }); }
            catch(e) { console.warn('[COMBAT] Dice3D init failed:', e); }
        }
        heroBtn.addEventListener('click', () => { _animateInitiativeHero(); });
    }

    // Bind action button events
    bindActions(s);

    // Bind expand/collapse on entity cards
    bindExpandCollapse();
    bindFeedToggle();

    // Immersion features: HP bar animation + player shake detection
    _animateHpBars(s);
    _checkPlayerDamage(s);

    // Auto-expand enemy cards:
    // - When it's an enemy's turn: expand that specific enemy
    // - When it's the player's turn: expand all enemies (target info)
    if (activeTurn && ph !== 'init' && ph !== 'intro') {
        if (activeTurn.t === 'p') {
            document.querySelectorAll('.entity.enemy').forEach(el => el.classList.add('expanded'));
        } else {
            const activeEl = document.querySelector('.entity.active-turn');
            if (activeEl) activeEl.classList.add('expanded');
        }
    }

    // Start timer countdown if active phase
    if (ph === 'active' && s.timer > 0) {
        startTimer(s.timer);
    } else {
        stopTimer();
    }

    // Start polling in API mode during active combat
    if (isApiMode && (ph === 'active' || ph === 'init' || ph === 'intro')) {
        startPolling();
    } else {
        stopPolling();
    }
}

// ─── TURN TIMER ───
function renderTimerBar(s) {
    if (!s.timer || s.timer <= 0) return '';
    return `<div class="turn-timer">
        <div class="timer-bar" id="timerBar" style="width:100%"></div>
        <span class="timer-text" id="timerText">${Math.ceil(s.timer)}s</span>
    </div>`;
}

function startTimer(seconds) {
    stopTimer();
    _timerMax = seconds;
    _timerRemaining = seconds;

    _timerInterval = setInterval(() => {
        _timerRemaining -= 1;

        const bar = document.getElementById('timerBar');
        const text = document.getElementById('timerText');
        if (!bar || !text) { stopTimer(); return; }

        if (_timerRemaining <= 0) {
            bar.style.width = '0%';
            text.textContent = '⏳ Turno perdido';
            bar.classList.add('critical');
            // Show toast feedback
            _showTimerExpiredToast();
            stopTimer();
            // Trigger immediate poll to pick up server-side penalty turn result
            if (isApiMode && api) {
                setTimeout(() => { _pollForTimerResult(); }, 1500);
            }
            return;
        }

        const pct = Math.max(0, (_timerRemaining / _timerMax) * 100);
        bar.style.width = pct + '%';
        text.textContent = Math.ceil(_timerRemaining) + 's';

        if (_timerRemaining <= 5) {
            bar.classList.add('critical');
        }
        // Heartbeat: tick sound + haptic in last 3 seconds (avoids auditory fatigue)
        if (_timerRemaining <= 3 && _timerRemaining > 0) {
            sfxTimerTick();
            haptic('light');
        }
    }, 1000);
}

function stopTimer() {
    if (_timerInterval) {
        clearInterval(_timerInterval);
        _timerInterval = null;
    }
}

function _showTimerExpiredToast() {
    const el = document.createElement('div');
    el.className = 'timer-toast';
    el.textContent = '⏳ Tempo esgotado — turno perdido!';
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('visible'), 50);
    setTimeout(() => { el.classList.remove('visible'); setTimeout(() => el.remove(), 300); }, 2500);
}

// Aggressive polling after timer expiry to pick up server penalty turn
async function _pollForTimerResult() {
    if (!isApiMode || !api) return;
    const maxRetries = 5;
    const interval = 2000; // 2s between retries
    for (let i = 0; i < maxRetries; i++) {
        try {
            const state = await api.getState();
            if (!state || state.error) {
                if (state && (state.error === 'no_combat' || state.phase === 'ended')) {
                    showCombatEnded();
                    return;
                }
                await new Promise(r => setTimeout(r, interval));
                continue;
            }
            const newPh = state.ph || state.phase || '';
            const newTc = state.tc || 0;
            const oldTc = currentState ? (currentState.tc || 0) : 0;
            // State changed (turn count advanced = penalty processed)
            if (newTc !== oldTc || newPh === 'victory' || newPh === 'defeat') {
                currentState = state;
                if (newPh === 'victory' || newPh === 'defeat' || newPh === 'ended') {
                    renderResolution(state);
                } else {
                    renderArena(state);
                }
                startPolling(); // Resume normal polling
                return;
            }
        } catch (e) {
            console.warn('[COMBAT] Timer poll retry', i, e.message);
        }
        await new Promise(r => setTimeout(r, interval));
    }
    // Fallback: resume normal polling after max retries
    startPolling();
}

// ─── STATE POLLING (adaptive interval) ───
function _getPollInterval() {
    // Faster polling when it's NOT the player's turn (waiting for server to advance)
    if (!currentState || !currentState.active_turn) return 5000;
    // Unconscious: fast polling to see ally/enemy turns resolve
    if (currentState.unconscious || (currentState.p && currentState.p.hp <= 0)) return 2000;
    return currentState.active_turn.type === 'player' ? 8000 : 2000;
}

function startPolling() {
    stopPolling();
    if (!isApiMode || !api) return;

    const poll = async () => {
        try {
            const state = await api.getState();
            if (!state || state.error) {
                if (state && state.error === 'invalid_session') {
                    showError('Sessão expirada — feche e reabra o combate');
                    stopPolling();
                    return;
                }
                if (state && (state.error === 'no_combat' || state.phase === 'ended')) {
                    showCombatEnded();
                }
                _pollInterval = setTimeout(poll, _getPollInterval());
                return;
            }

            // Compare: re-render only if state actually changed
            const newPh = state.ph || state.phase || '';
            const oldPh = currentState ? (currentState.ph || currentState.phase || '') : '';
            const newRn = state.rn || 0;
            const oldRn = currentState ? (currentState.rn || 0) : 0;
            const newTc = state.tc || 0;
            const oldTc = currentState ? (currentState.tc || 0) : 0;
            // Also detect HP changes (biome risk, persistent effects mid-turn)
            const hpHash = (s) => {
                if (!s) return '';
                const ph = s.p ? s.p.hp : 0;
                const eh = (s.e || []).map(e => e.hp).join(',');
                return `${ph}:${eh}`;
            };
            const newHp = hpHash(state);
            const oldHp = hpHash(currentState);

            if (newPh !== oldPh || newRn !== oldRn || newTc !== oldTc || newHp !== oldHp) {
                // Don't update during cinematic animation
                if (_cinematicInProgress) {
                    _pollInterval = setTimeout(poll, _getPollInterval());
                    return;
                }

                // Detect turn change for announcement banner
                const oldTurn = currentState?.to?.[0];
                const newTurn = state.to?.[0];
                const turnChanged = oldTurn && newTurn && (oldTurn.n !== newTurn.n || oldTurn.t !== newTurn.t);

                if (turnChanged) {
                    // Enemy banner shows action description from last roll
                    let actionVerb = '';
                    if (newTurn.t === 'e' && state.lr) {
                        actionVerb = state.lr.t === 'skill' ? ' conjura!' : ' ataca!';
                    }
                    const bannerText = newTurn.t === 'p' ? '⚔️ Seu Turno!' :
                        newTurn.t === 'e' ? `🎯 ${newTurn.n}${actionVerb}` : `🛡️ ${newTurn.n}`;
                    const bannerType = newTurn.t === 'p' ? 'player' : newTurn.t === 'e' ? 'enemy' : 'ally';
                    _showTurnBanner(bannerText, bannerType);
                }

                // P0-B: Cinematic enemy dice — animate enemy rolls before state update
                const hasEnemyRoll = state.lr && state.lr.r && newTurn && newTurn.t !== 'p';
                const rollSig = state.lr ? `${state.lr.r}-${state.lr.d}-${state.lr.miss||0}` : '';
                if (hasEnemyRoll && rollSig !== _lastAnimatedRoll) {
                    _cinematicInProgress = true;
                    initDice(state.lr);
                    if (!state.lr.miss && state.lr.d > 0) {
                        setTimeout(() => _showDamageFloat(state.lr.d, state.lr.dt, '.entity.player'), 2700);
                    }
                    // 3D dice: 1200 + 1500 + 1200 + 200 = 4100ms for hits
                    const enemyDelay = (state.lr.miss || state.lr.d <= 0) ? 1800 : 4100;
                    setTimeout(() => {
                        _cinematicInProgress = false;
                        currentState = state;
                        if (newPh === 'victory' || newPh === 'defeat' || newPh === 'ended') {
                            renderResolution(state);
                        } else {
                            renderArena(state);
                        }
                    }, enemyDelay);
                    _pollInterval = setTimeout(poll, _getPollInterval());
                    return;
                }

                _showPollUpdateIndicator();
                currentState = state;
                if (newPh === 'victory' || newPh === 'defeat' || newPh === 'ended') {
                    renderResolution(state);
                } else {
                    renderArena(state);
                }
            }
        } catch (e) {
            if (e.status === 401 || (e.message && e.message.includes('401'))) {
                showError('Sessão expirada — feche e reabra o combate');
                stopPolling();
                return;
            }
            // Silently ignore other poll errors — don't spam user with toasts
            console.warn('[COMBAT] Poll error (silent)', e.message);
        }
        _pollInterval = setTimeout(poll, _getPollInterval());
    };

    _pollInterval = setTimeout(poll, _getPollInterval());
}

function stopPolling() {
    if (_pollInterval) {
        clearTimeout(_pollInterval);
        _pollInterval = null;
    }
}

// ─── POLL UPDATE INDICATOR (U5) ───
function _showPollUpdateIndicator() {
    const el = document.createElement('div');
    el.className = 'poll-update-indicator';
    el.textContent = '🔄 Estado atualizado';
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('visible'), 20);
    setTimeout(() => { el.classList.remove('visible'); setTimeout(() => el.remove(), 300); }, 1500);
}

// ─── SESSION HEARTBEAT ───
function startHeartbeat() {
    stopHeartbeat();
    if (!isApiMode || !api) return;

    _heartbeatInterval = setInterval(async () => {
        try {
            const state = await api.getState();
            if (state && state.error === 'invalid_session') {
                showError('Sessão expirada — feche e reabra o combate');
                stopHeartbeat();
            }
        } catch (e) {
            if (e.message && e.message.includes('401')) {
                showError('Sessão expirada — feche e reabra o combate');
                stopHeartbeat();
            }
        }
    }, 600000); // 10 minutes
}

function stopHeartbeat() {
    if (_heartbeatInterval) {
        clearInterval(_heartbeatInterval);
        _heartbeatInterval = null;
    }
}

function stopAllIntervals() {
    stopTimer();
    stopPolling();
    stopHeartbeat();
}

// ─── ENTITY CARD (COMPACT + EXPANDABLE) ───
function renderEntity(e, type, idx, isActiveTurn) {
    const pct = e.mhp > 0 ? (e.hp / e.mhp) : 0;
    const hpClass = pct > 0.75 ? 'hp-high' : pct > 0.40 ? 'hp-mid' : 'hp-low';

    // Compact status icons
    let statusIcons = '';
    if (e.se && e.se.length > 0) {
        statusIcons = e.se.map(s => STATUS_ICONS[s] || '').join('');
    }

    // Build expanded details
    let detailsHtml = '';
    if (type === 'enemy') {
        const atkLabel = ATK_TYPE_LABELS[e.at] || e.at || '';
        const dmgIcon = DMG_ICONS[e.dt] || '';

        detailsHtml += `<div class="bar-container">
            <div class="bar-label"><span>❤️ HP</span><span>${e.hp}/${e.mhp}</span></div>
            <div class="bar-track"><div class="bar-fill ${hpClass}" style="width:${pct * 100}%"></div></div>
        </div>`;
        detailsHtml += `<div class="stats-row">
            <span class="stat-item">🛡️ CA ${e.ac}</span>
            <span class="stat-item">⚔️ +${e.atk}</span>
            <span class="stat-item">${dmgIcon} ${e.dmg}</span>
            <span class="entity-badge-sm">${atkLabel}</span>
        </div>`;

        if (e.leg) {
            detailsHtml += '<div class="legendary-row">';
            detailsHtml += '<span>👑 Boss</span>';
            if (e.leg.lrm > 0) detailsHtml += `<span>🛡️ Resist. ${e.leg.lr}/${e.leg.lrm}</span>`;
            if (e.leg.lam > 0) detailsHtml += `<span>⚡ Ações ${e.leg.la}/${e.leg.lam}</span>`;
            detailsHtml += '</div>';
        }

        if (e.se && e.se.length > 0) {
            detailsHtml += '<div class="status-pills">' + e.se.map(s => `<span class="status-pill">${STATUS_ICONS[s] || ''} ${s}</span>`).join('') + '</div>';
        }
    } else {
        // Ally expanded
        detailsHtml += `<div class="bar-container">
            <div class="bar-label"><span>❤️ HP</span><span>${e.hp}/${e.mhp}</span></div>
            <div class="bar-track"><div class="bar-fill ${hpClass}" style="width:${pct * 100}%"></div></div>
        </div>`;
        if (e.ac) {
            detailsHtml += `<div class="stats-row"><span class="stat-item">🛡️ CA ${e.ac}</span></div>`;
        }
        if (e.se && e.se.length > 0) {
            detailsHtml += '<div class="status-pills">' + e.se.map(s => `<span class="status-pill">${STATUS_ICONS[s] || ''} ${s}</span>`).join('') + '</div>';
        }
    }

    const activeClass = isActiveTurn ? ' active-turn' : '';
    const dataAttr = type === 'enemy' ? ` data-enemy-idx="${idx}"` : '';

    // Feature 9: Position badge
    let posBadge = '';
    if (type === 'enemy' && _currentPositions) {
        const pPos = _currentPositions['player'];
        const ePos = _currentPositions[`enemy_${idx}`];
        if (pPos && ePos) {
            const dx = (pPos.x || 0) - (ePos.x || 0), dy = (pPos.y || 0) - (ePos.y || 0);
            const near = Math.sqrt(dx * dx + dy * dy) <= 1.5;
            posBadge = `<span class="pos-badge ${near ? 'near' : 'far'}">${near ? '⚔ Perto' : '🏹 Longe'}</span>`;
        }
    }

    return `<div class="entity ${type}${activeClass}"${dataAttr}>
        <div class="entity-header">
            <span class="entity-icon">${e.ico || (type === 'enemy' ? '👹' : '🛡️')}</span>
            <span class="compact-name">${escHtml(e.n)}</span>
            <div class="hp-mini"><div class="hp-mini-fill ${hpClass}" style="width:${pct * 100}%"></div></div>
            <span class="hp-text-compact">${e.hp}/${e.mhp}</span>
            ${statusIcons ? `<span class="status-icons-compact">${statusIcons}</span>` : ''}
            ${posBadge}
            <span class="expand-arrow">▸</span>
        </div>
        <div class="entity-details">${detailsHtml}</div>
    </div>`;
}

// ─── PLAYER CARD (always shows HP + resource bars unless compact) ───
function renderPlayerCard(p, isCompact = false) {
    const hpPct = p.mhp > 0 ? (p.hp / p.mhp) : 0;
    const hpClass = hpPct > 0.75 ? 'hp-high' : hpPct > 0.40 ? 'hp-mid' : 'hp-low';
    const mpPct = p.mmp > 0 ? (p.mp / p.mmp) : 0;
    const resClass = RES_CLASS_MAP[p.res] || 'mp';
    const resIcon = RES_ICON_MAP[p.res] || '💧';

    // Compact badges for status, cover, concentration
    const badges = [];
    if (p.se && p.se.length > 0) {
        p.se.forEach(s => badges.push(`<span class="mini-badge status">${STATUS_ICONS[s] || ''} ${s}</span>`));
    }
    if (p.cov) {
        badges.push(`<span class="mini-badge cover">${p.cov.ico} +${p.cov.ac} CA</span>`);
    }
    if (p.conc) {
        badges.push(`<span class="mini-badge conc">🔮 ${escHtml(p.conc)}</span>`);
    }
    const badgesHtml = badges.length > 0 ? `<div class="player-badge-row">${badges.join('')}</div>` : '';

    const concClass = p.conc ? ' concentrating' : '';
    return `<div class="entity player${concClass}">
        <div class="entity-header">
            <span class="entity-icon">${p.ico || '👤'}</span>
            <span class="compact-name">${escHtml(p.n)}</span>
            <span class="hp-text-compact" style="color:var(--v-gold-dim);font-size:10px">${escHtml(p.c)} Lv.${p.l}</span>
        </div>
        <div class="player-bars" style="${isCompact ? 'display:none;' : ''}">
            <div class="bar-row">
                <span class="bar-icon">❤️</span>
                <div class="bar-track"><div class="bar-fill ${hpClass}" style="width:${hpPct * 100}%"></div></div>
                <span class="bar-val">${p.hp}/${p.mhp}</span>
            </div>
            <div class="bar-row">
                <span class="bar-icon">${resIcon}</span>
                <div class="bar-track"><div class="bar-fill ${resClass}" style="width:${mpPct * 100}%"></div></div>
                <span class="bar-val">${p.mp}/${p.mmp}</span>
            </div>
            <div class="player-quick-stats">
                <span class="stat-item">🛡️${p.ac}</span>
                <span class="stat-item">⚔️+${p.atk}</span>
                <span class="stat-item">🗡️${p.dmg}</span>
            </div>
            ${badgesHtml}
        </div>
    </div>`;
}

// ─── TURN TIMELINE ───
function renderTurnTimeline(to) {
    if (!to || to.length === 0) return '';
    let html = '<div class="turn-timeline">';
    to.forEach((entry, i) => {
        const isFirst = i === 0;
        const tCls = entry.t === 'p' ? 't-player' : entry.t === 'a' ? 't-ally' : 't-enemy';
        if (i > 0) html += '<div class="turn-arrow">▸</div>';
        html += `<div class="turn-entry ${isFirst ? 'active' : ''} ${tCls}">
            <span class="turn-val">${entry.v}</span>
            <span class="turn-name">${escHtml(entry.n)}</span>
        </div>`;
    });
    html += '</div>';
    return html;
}

// ─── IMMERSIVE INITIATIVE HERO BUTTON ANIMATION (uses Dice3D d20) ───
function _animateInitiativeHero() {
    const area = document.getElementById('init-hero-area');
    if (!area) return;
    const btn = document.getElementById('initHeroBtn');
    if (btn) btn.disabled = true;

    // Phase 1: Button + subtitle fade out
    area.classList.add('rolling');

    const fakeRoll = Math.floor(Math.random() * 20) + 1;

    // Phase 2: Roll the real 3D d20
    if (_initDice3d) {
        const duration = _initDice3d.roll(fakeRoll, () => {
            // Phase 3: Dice landed — send action after brief pause
            setTimeout(() => { sendAction({type: 'initiative'}); }, 600);
        });
    } else {
        // Fallback: no THREE.js — send immediately
        setTimeout(() => { sendAction({type: 'initiative'}); }, 1200);
    }
}

// ─── INITIATIVE DICE ANIMATION (uses shared DiceRoller component) ───
function _triggerInitiativeDice(s) {
    const area = document.getElementById('init-dice-area');
    if (!area || !s.to || s.to.length === 0) return;

    const ph = s.ph || s.phase || '';
    if (ph !== 'init') return;

    // Build items for DiceRoller
    const items = s.to.map(entry => ({
        sides: 20,
        result: entry.v,
        label: entry.n,
        type: entry.t === 'p' ? 'player' : entry.t === 'a' ? 'ally' : 'enemy',
        icon: entry.ico || (entry.t === 'p' ? '\u{1F464}' : entry.t === 'a' ? '\u{1F6E1}' : '\u{1F479}'),
        formula: entry.f || '',
    }));

    const init = s.initiative || {};

    if (_initDiceAnimated) {
        // Already animated — show static results (on poll re-render)
        _showInitiativeStatic(area, items, init);
        _showProceedBar();
        return;
    }

    // First render: animate!
    _initDiceAnimated = true;
    if (typeof DiceRoller !== 'undefined') {
        DiceRoller.rollSequence(items, {
            container: area,
            title: '\u{1F4DC} ORDEM DE COMBATE',
            onComplete: () => {
                _appendSurpriseInfo(area, init);
                _showProceedBar();
            },
        });

        // Skip button
        setTimeout(() => {
            const bar = document.getElementById('init-proceed-bar');
            if (bar && bar.style.display === 'none') {
                const skipBtn = document.createElement('button');
                skipBtn.className = 'v-skip-btn visible';
                skipBtn.textContent = 'Pular \u{25B8}';
                skipBtn.style.cssText = 'position:relative; z-index:10; margin:8px auto;display:block;padding:6px 16px;font-size:12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#aaa;cursor:pointer; clear:both;';
                skipBtn.onclick = () => {
                    // Skip triggers immediate reveal via DiceRoller internals (safety net)
                    _showInitiativeStatic(area, items, init);
                    _showProceedBar();
                    skipBtn.remove();
                };
                area.appendChild(skipBtn);
            }
        }, 800);
    } else {
        // Fallback: no DiceRoller loaded — show static
        _showInitiativeStatic(area, items, init);
        _showProceedBar();
    }
}

function _showInitiativeStatic(area, items, init) {
    let html = '<div style="padding:4px 10px;font-size:11px;color:var(--v-text-dim)">';
    html += '<div style="font-weight:700;color:var(--v-gold);font-size:12px;margin-bottom:4px">\u{1F4DC} ORDEM DE COMBATE</div>';
    items.forEach((entry, i) => {
        const tColor = entry.type === 'player' ? 'var(--v-gold)' : entry.type === 'ally' ? 'var(--v-silver)' : 'var(--v-crimson)';
        const formula = entry.formula ? ` (${entry.formula})` : '';
        html += `<div style="padding:2px 0;color:${tColor}">
            ${i + 1}. ${entry.icon} <b>${escHtml(entry.label)}</b>: ${entry.result}${formula}
        </div>`;
    });
    _appendSurpriseHtml(html, init);
    html += '</div>';
    area.innerHTML = html;
}

function _appendSurpriseInfo(area, init) {
    if (!init.player_surprised && !init.enemies_surprised) return;
    const div = document.createElement('div');
    div.style.cssText = 'padding:0 10px;font-size:11px';
    if (init.player_surprised) div.innerHTML += '<div style="color:var(--v-crimson);margin-top:4px">\u2757 Você foi pego desprevenido!</div>';
    if (init.enemies_surprised) div.innerHTML += '<div style="color:var(--v-gold);margin-top:4px">\u2728 Inimigos surpreendidos!</div>';
    area.appendChild(div);
}

function _appendSurpriseHtml(html, init) {
    if (init.player_surprised) html += '<div style="color:var(--v-crimson);margin-top:4px">\u2757 Você foi pego desprevenido!</div>';
    if (init.enemies_surprised) html += '<div style="color:var(--v-gold);margin-top:4px">\u2728 Inimigos surpreendidos!</div>';
}

function _showProceedBar() {
    const bar = document.getElementById('init-proceed-bar');
    if (bar) bar.style.display = '';
}

// ─── ACTION BAR ───
function renderActionBar(acts, enemies, player) {
    if (!acts) return '';
    const hitChance = acts.hit || 50;
    const fleeChance = acts.flee || 50;
    const hasSkills = acts.skills && acts.skills.length > 0;
    const itemCount = acts.items || 0;

    let skillBtnText = '🧠 Habilidade';
    if (hasSkills && acts.skills.length === 1) {
        const sk = acts.skills[0];
        skillBtnText = `🧠 ${sk.n} (${sk.ch}%)`;
    } else if (!hasSkills) {
        skillBtnText = `🚫 Sem ${player.res || 'Mana'}`;
    }

    return `<div class="action-bar"><div class="action-grid">
        <button class="action-btn primary" data-action="attack">⚔️ Atacar <span class="action-chance">${hitChance}%</span></button>
        <button class="action-btn ${hasSkills ? '' : 'disabled'}" data-action="skill">${skillBtnText}</button>
        <button class="action-btn ${itemCount > 0 ? '' : 'disabled'}" data-action="items">🎒 Itens <span class="action-chance">(${itemCount})</span></button>
        <button class="action-btn danger" data-action="flee">🏃 Fugir <span class="action-chance">${fleeChance}%</span></button>
        <button class="action-btn full-width" data-action="pass">⏭️ Passar Turno</button>
    </div></div>`;
}

// ─── BONUS ACTION BAR (D&D 5e PHB p.189) ───
function renderBonusActionBar(acts, enemies, player) {
    if (!acts) return '';
    const hasSkills = acts.skills && acts.skills.length > 0;
    const resName = player.res || 'Mana';

    let skillsHtml = '';
    if (hasSkills) {
        if (acts.skills.length === 1) {
            const sk = acts.skills[0];
            skillsHtml = `<button class="action-btn ba-btn" data-action="bonus_use_single" data-skill-id="${sk.id}" data-tg="${sk.tg || 'single'}">⚡ ${escHtml(sk.n)} <span class="action-chance">${sk.c} ${resName} · ${sk.ch}%</span></button>`;
        } else {
            skillsHtml = `<button class="action-btn ba-btn" data-action="bonus_skill_pick">⚡ Habilidade Bonus <span class="action-chance">(${acts.skills.length})</span></button>`;
        }
    }

    return `<div class="action-bar"><div class="ba-header">
        <div class="ba-label">⚡ AÇÃO BÔNUS</div>
        <div class="ba-hint">Use uma habilidade bônus ou pule.</div>
    </div><div class="action-grid">
        ${skillsHtml}
        <button class="action-btn" data-action="bonus_skip">⏭️ Pular</button>
    </div></div>`;
}

// ─── REACTION BAR (D&D 5e PHB p.190) ───
function renderReactionBar(acts, player) {
    if (!acts) return '';
    const hasSkills = acts.skills && acts.skills.length > 0;
    const dmg = acts.damage_taken || 0;
    const resName = player.res || 'Mana';

    let skillsHtml = '';
    if (hasSkills) {
        acts.skills.forEach(sk => {
            const ico = sk.ico || '⚡';
            const effText = sk.eff ? ` · ${escHtml(sk.eff)}` : '';
            skillsHtml += `<button class="action-btn reaction-btn" data-action="reaction_use" data-skill-id="${sk.id}">${ico} ${escHtml(sk.n)} <span class="action-chance">${sk.c} ${resName}${effText}</span></button>`;
        });
    }

    return `<div class="action-bar"><div class="ba-header reaction-header">
        <div class="ba-label">⚡ REAÇÃO</div>
        <div class="ba-hint">Você recebeu ${dmg} de dano. Reagir?</div>
    </div><div class="action-grid">
        ${skillsHtml}
        <button class="action-btn" data-action="reaction_skip">⏭️ Não reagir</button>
    </div></div>`;
}

// ─── EXPAND / COLLAPSE (accordion) ───
function bindExpandCollapse() {
    document.querySelectorAll('.entity:not(.player)').forEach(el => {
        el.addEventListener('click', (ev) => {
            if (ev.target.closest('.action-btn')) return;
            const wasExpanded = el.classList.contains('expanded');
            document.querySelectorAll('.entity.expanded').forEach(e => e.classList.remove('expanded'));
            if (!wasExpanded) el.classList.add('expanded');
        });
    });
}

// ─── FEED TOGGLE ───
function bindFeedToggle() {
    const toggle = document.getElementById('feedToggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
        const feed = document.getElementById('combatFeed');
        if (!feed) return;
        const expanded = feed.classList.toggle('feed-expanded');
        toggle.textContent = expanded ? '▼ Recolher' : toggle.dataset.label || '▲ Mostrar mais';
    });
    toggle.dataset.label = toggle.textContent;
}

// ─── BIND ACTIONS ───
function bindActions(state) {
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Feature 4+8: Haptic + audio unlock on user gesture
            hapticSelect();
            if (!_audioUnlocked) {
                _audioUnlocked = true;
                if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume().catch(() => { });
            }
            const action = btn.dataset.action;
            if (btn.classList.contains('disabled')) return;

            const enemies = state.e || [];
            const skills = state.acts?.skills || [];

            if (action === 'attack') {
                if (enemies.length > 1) {
                    showTargetPicker(enemies, 'attack');
                } else {
                    sendAction({ type: 'attack', target: 0 });
                }
            } else if (action === 'skill') {
                if (skills.length === 1) {
                    if (enemies.length > 1) {
                        showTargetPicker(enemies, 'skill', skills[0].id);
                    } else {
                        sendAction({ type: 'skill', skill_id: skills[0].id, target: 0 });
                    }
                } else if (skills.length > 1) {
                    showSkillPicker(skills, enemies, 'skill');
                }
            } else if (action === 'flee') {
                sendAction({ type: 'flee' });
            } else if (action === 'pass') {
                sendAction({ type: 'pass' });
            } else if (action === 'items') {
                const items = state.acts?.item_list || [];
                if (items.length > 0) {
                    showItemPicker(items, enemies, state.a || []);
                }
            } else if (action === 'initiative') {
                sendAction({ type: 'initiative' });
            } else if (action === 'proceed') {
                sendAction({ type: 'proceed' });
            } else if (action === 'restore') {
                sendAction({ type: 'restore' });
            }
            // D&D 5e: Bonus Action actions
            else if (action === 'bonus_skip') {
                sendAction({ type: 'bonus_skip' });
            } else if (action === 'bonus_use_single') {
                const skillId = btn.dataset.skillId;
                const tg = btn.dataset.tg || 'single';
                if (tg === 'all' || tg === 'self') {
                    sendAction({ type: 'bonus_use', skill_id: skillId, target: 0 });
                } else if (enemies.length > 1) {
                    showTargetPicker(enemies, 'bonus_use', skillId);
                } else {
                    sendAction({ type: 'bonus_use', skill_id: skillId, target: 0 });
                }
            } else if (action === 'bonus_skill_pick') {
                showSkillPicker(skills, enemies, 'bonus_use');
            }
            // D&D 5e: Reaction actions
            else if (action === 'reaction_skip') {
                sendAction({ type: 'reaction_skip' });
            } else if (action === 'reaction_use') {
                const skillId = btn.dataset.skillId;
                sendAction({ type: 'reaction_use', skill_id: skillId });
            }
        });
    });
}

// ─── LOADING INDICATOR (CSS d20 spin — lightweight, no WebGL) ───
function _showActionLoading(show) {
    let el = document.getElementById('actionLoading');
    if (show) {
        if (!el) {
            el = document.createElement('div');
            el.id = 'actionLoading';
            el.className = 'action-loading';
            el.innerHTML = '<div class="loading-d20-icon"></div><span>Resolvendo<span class="loading-dots"></span></span>';
            const bar = document.querySelector('.action-bar');
            if (bar) bar.prepend(el);
        }
        el.style.display = 'flex';
    } else if (el) {
        el.remove();
    }
}

// ─── SEND ACTION ───
let _actionSent = false;
async function sendAction(actionData) {
    if (_actionSent || _cinematicInProgress) return;
    _actionSent = true;
    _lastAnimatedRoll = null; // Reset dedup — next render will animate dice
    _initDiceAnimated = false; // Reset initiative dice animation for new combat
    document.querySelectorAll('.action-btn').forEach(b => b.classList.add('disabled'));
    _showActionLoading(true);
    stopTimer();
    stopPolling();

    if (isApiMode && api) {
        try {
            const result = await api.sendAction(actionData);
            _showActionLoading(false);
            _actionSent = false;
            if (!result) { showError('Sem resposta do servidor.'); return; }
            _playCinematicResult(result, actionData.type);
        } catch (e) {
            _showActionLoading(false);
            _actionSent = false;
            console.error('[COMBAT] API sendAction error', e);
            const msg = e.status === 401 ? 'Sessão expirada.'
                : e.status === 429 ? 'Muitas ações. Aguarde um momento.'
                    : 'Erro de conexão. Tente novamente.';
            showError(msg);
            startPolling();
        }
    } else {
        if (!tg) { console.log('No Telegram WebApp', actionData); _actionSent = false; return; }
        const payload = {
            action: 'combat_action',
            token: token,
            ...actionData,
        };
        tg.sendData(JSON.stringify(payload));
        setTimeout(() => { try { tg.close(); } catch (e) { console.warn('[COMBAT] tg.close() failed', e); } }, 300);
    }
}

// ─── CINEMATIC ACTION RESULT ───
// Delays state render so the player can watch dice animations unfold
function _playCinematicResult(result, actionType) {
    const isResolution = result.phase === 'victory' || result.phase === 'defeat' || result.phase === 'ended';
    const hasRoll = result.lr && result.lr.r;
    const isNonCombatAction = actionType === 'initiative' || actionType === 'proceed' || actionType === 'restore';
    const oldPhase = currentState?.ph || currentState?.phase || '';

    // No cinematic for: initiative actions, no dice roll, or not in active combat
    if (!hasRoll || isNonCombatAction || oldPhase !== 'active') {
        currentState = result;
        if (isResolution) { renderResolution(result); }
        else { renderArena(result); }
        return;
    }

    _cinematicInProgress = true;

    // Phase 0: Anticipation text (350ms) — "⚔️ Kalfin avança!"
    const attackerName = currentState?.p?.n || 'Herói';
    const anticipationText = result.lr.t === 'skill' ? `✨ ${attackerName} conjura!` : `⚔️ ${attackerName} avança!`;
    _showAnticipation(anticipationText);

    // Phase 1: Animate dice on CURRENT DOM after anticipation (350ms delay)
    setTimeout(() => {
        initDice(result.lr);

        // Phase 2: Show floating damage after 3D dice lands (+2700ms = 1200 delay + 1500 roll)
        if (!result.lr.miss && result.lr.d > 0) {
            setTimeout(() => _showDamageFloat(result.lr.d, result.lr.dt, '.entity.enemy'), 2700);
        }

        // Phase 3: After full animation, check for kills then render new state
        // Hit: 1200 (delay) + 1500 (3D roll) + 1200 (result hold) + 200 (buffer) = 4100ms
        const baseDelay = (result.lr.miss || result.lr.d <= 0) ? 1500 : 4100;
        const hasKill = result.lr.kill;
        const totalDelay = hasKill ? baseDelay + 600 : baseDelay;

        // Death animation: fade+shake on killed enemy before re-render
        if (hasKill) {
            setTimeout(() => {
                const enemyCards = document.querySelectorAll('.entity.enemy');
                enemyCards.forEach(card => card.classList.add('death-anim'));
            }, baseDelay);
        }

        setTimeout(() => {
            _cinematicInProgress = false;
            currentState = result;
            if (isResolution) { renderResolution(result); }
            else { renderArena(result); }
        }, totalDelay);
    }, 350);
}

// ─── TURN ANNOUNCEMENT BANNER ───
function _showTurnBanner(text, type) {
    document.querySelectorAll('.turn-banner').forEach(b => b.remove());
    const el = document.createElement('div');
    el.className = `turn-banner ${type || ''}`;
    el.innerHTML = `<span class="turn-banner-text">${text}</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('visible'));
    });
    setTimeout(() => {
        el.classList.remove('visible');
        setTimeout(() => el.remove(), 400);
    }, 1000);
}

// ─── COMBO STREAK COUNTER (P2-G) ───
function _showComboCounter(count) {
    let el = document.getElementById('comboCounter');
    if (!el) {
        el = document.createElement('div');
        el.id = 'comboCounter';
        el.className = 'combo-counter';
        document.body.appendChild(el);
    }
    el.textContent = `x${count}`;
    el.classList.remove('combo-pop');
    void el.offsetWidth;
    el.classList.add('combo-pop');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove('combo-pop'), 3000);
}

// ─── ANTICIPATION OVERLAY ───
function _showAnticipation(text) {
    const el = document.createElement('div');
    el.className = 'anticipation-overlay';
    el.innerHTML = `<span class="anticipation-text">${text}</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('visible'));
    });
    setTimeout(() => {
        el.classList.remove('visible');
        setTimeout(() => el.remove(), 200);
    }, 350);
}

// ─── FLOATING DAMAGE NUMBER ───
function _showDamageFloat(damage, damageType, targetSelector) {
    const target = document.querySelector(targetSelector || '.entity.enemy');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'damage-float';
    el.textContent = `-${damage}`;
    const colors = { fire: '#ff6020', cold: '#80c0ff', lightning: '#ffe040', necrotic: '#9040c0', radiant: '#ffe080', poison: '#60c040', acid: '#60d040' };
    el.style.color = colors[damageType] || '#ff4444';
    el.style.left = (rect.left + rect.width / 2) + 'px';
    el.style.top = rect.top + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

// ─── SKILL PICKER ───
function showSkillPicker(skills, enemies, actionType) {
    actionType = actionType || 'skill';
    const panel = document.getElementById('skillPanel');
    const overlay = document.getElementById('skillOverlay');
    const title = actionType === 'bonus_use' ? '⚡ Ação Bônus' : 'Habilidades';
    let html = `<div class="skill-panel-title">${title}</div>`;
    skills.forEach(sk => {
        const typeBadge = sk.tp === 'saving_throw' ? ' · <span class="sk-type">ST</span>' :
            sk.tp === 'auto' ? ' · <span class="sk-type">Auto</span>' :
                sk.tp === 'heal' ? ' · <span class="sk-type">Cura</span>' : '';
        const tgtBadge = sk.tg === 'all' ? ' · <span class="sk-aoe">AOE</span>' :
            sk.tg === 'self' ? ' · <span class="sk-aoe">Self</span>' : '';
        const effLine = sk.eff ? `<div class="skill-effect">${escHtml(sk.eff)}</div>` : '';
        html += `<div class="skill-item" data-skill-id="${sk.id}" data-tg="${sk.tg || 'single'}">
            <div>
                <div class="skill-name">${escHtml(sk.n)}</div>
                ${effLine}
                <div class="skill-meta">Custo: ${sk.c} · Chance: ${sk.ch}%${typeBadge}${tgtBadge}</div>
            </div>
        </div>`;
    });
    html += '<div class="skill-close" id="skillClose">Cancelar</div>';
    panel.innerHTML = html;
    overlay.classList.add('active');

    panel.querySelectorAll('.skill-item').forEach(item => {
        item.addEventListener('click', () => {
            const skillId = item.dataset.skillId;
            const tg = item.dataset.tg || 'single';
            overlay.classList.remove('active');
            // AOE/self skills skip target picker
            if (tg === 'all' || tg === 'self') {
                sendAction({ type: actionType, skill_id: skillId, target: 0 });
            } else if (enemies.length > 1) {
                showTargetPicker(enemies, actionType, skillId);
            } else {
                sendAction({ type: actionType, skill_id: skillId, target: 0 });
            }
        });
    });
    document.getElementById('skillClose').addEventListener('click', () => {
        overlay.classList.remove('active');
    });
    // Use onclick to avoid accumulating duplicate listeners on persistent overlay
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    };
}

// ─── TARGET PICKER ───
function showTargetPicker(enemies, actionType, skillId) {
    const panel = document.getElementById('targetPanel');
    const overlay = document.getElementById('targetOverlay');
    let html = '<div class="skill-panel-title">Escolher Alvo</div>';
    enemies.forEach((e, i) => {
        const pct = e.mhp > 0 ? Math.round((e.hp / e.mhp) * 100) : 0;
        // Feature 6: Damage preview
        let previewHtml = '';
        const acts = currentState && currentState.acts;
        if (acts) {
            let chText = '', dmgText = '';
            if (actionType === 'attack') {
                chText = `${acts.hit || '?'}%`;
                dmgText = currentState.p ? currentState.p.dmg : '';
            } else if ((actionType === 'skill' || actionType === 'bonus_use') && skillId && acts.skills) {
                const sk = acts.skills.find(s => s.id === skillId);
                if (sk) { chText = `${sk.ch}%`; dmgText = sk.eff || ''; }
            }
            if (chText) {
                const good = parseInt(chText) >= 60;
                previewHtml = `<div class="target-preview"><span class="${good ? 'prev-hit' : 'prev-miss'}">${chText} chance</span>${dmgText ? ` · ${escHtml(dmgText)}` : ''}</div>`;
            }
        }
        html += `<div class="target-item" data-target="${i}">
            <div><span>${e.ico || '👹'}</span> <b>${escHtml(e.n)}</b>${previewHtml}</div>
            <div class="skill-meta">${e.hp}/${e.mhp} HP (${pct}%)</div>
        </div>`;
    });
    html += '<div class="skill-close" id="targetClose">Cancelar</div>';
    panel.innerHTML = html;
    overlay.classList.add('active');

    panel.querySelectorAll('.target-item').forEach(item => {
        item.addEventListener('click', () => {
            const target = parseInt(item.dataset.target);
            overlay.classList.remove('active');
            if (actionType === 'skill' || actionType === 'bonus_use') {
                sendAction({ type: actionType, skill_id: skillId, target: target });
            } else {
                sendAction({ type: 'attack', target: target });
            }
        });
    });
    document.getElementById('targetClose').addEventListener('click', () => {
        overlay.classList.remove('active');
    });
    // Use onclick to avoid accumulating duplicate listeners on persistent overlay
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    };
}

// ─── ITEM PICKER ───
function showItemPicker(items, enemies, allies) {
    const panel = document.getElementById('itemPanel');
    const overlay = document.getElementById('itemOverlay');
    let html = '<div class="skill-panel-title">🎒 Itens de Combate</div>';
    items.forEach(it => {
        const isThrown = !!it.tdmg;
        const effText = isThrown ? `${it.tdmg} ${it.ttype || ''}` : (it.heal ? `Cura ${it.heal}` : '');
        const typeBadge = isThrown ? '<span class="sk-aoe">Arremesso</span>' : '<span class="sk-type">Cura</span>';
        html += `<div class="skill-item item-entry" data-item="${escHtml(it.n)}" data-thrown="${isThrown}">
            <div>
                <div class="skill-name">${it.ico} ${escHtml(it.n)} <span class="action-chance">x${it.q}</span></div>
                <div class="skill-meta">${effText} · ${typeBadge}</div>
            </div>
        </div>`;
    });
    // Full inventory access via transition (API mode only)
    if (isApiMode) {
        html += '<div class="skill-item" id="itemFullInventory" style="text-align:center;color:var(--v-gold);font-size:12px;padding:10px;cursor:pointer;opacity:0.8">📦 Ver Mochila Completa</div>';
    }
    html += '<div class="skill-close" id="itemClose">Cancelar</div>';
    panel.innerHTML = html;
    overlay.classList.add('active');

    panel.querySelectorAll('.item-entry').forEach(el => {
        el.addEventListener('click', () => {
            const itemName = el.dataset.item;
            const isThrown = el.dataset.thrown === 'true';
            overlay.classList.remove('active');
            if (isThrown) {
                // Thrown items always target enemy — target -2 means first enemy
                sendAction({ type: 'use_item', item_key: itemName, item_target: -2 });
            } else {
                // Healing items: target self (-1) directly
                sendAction({ type: 'use_item', item_key: itemName, item_target: -1 });
            }
        });
    });
    const fullInvBtn = document.getElementById('itemFullInventory');
    if (fullInvBtn) {
        fullInvBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
            transitionToInventoryFromArena();
        });
    }
    document.getElementById('itemClose').addEventListener('click', () => {
        overlay.classList.remove('active');
    });
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    };
}

// ─── DICE ANIMATION — Cinematic multi-phase ───
function initDice(lr) {
    if (!lr || !lr.r) return;
    // Narrative mode: skip dice animation (dice area is hidden)
    if (currentState && currentState.vm === 'simple') return;

    // Dedup — don't replay the same roll on polling re-renders
    const sig = `${lr.r}-${lr.d}-${lr.t}-${lr.crit || 0}-${lr.miss || 0}`;
    if (sig === _lastAnimatedRoll) { _showDiceStatic(lr); return; }
    _lastAnimatedRoll = sig;

    const d1 = document.getElementById('dice1');
    const d2 = document.getElementById('dice2');
    const r1 = document.getElementById('diceResult1');
    const l1 = document.getElementById('diceLabel1');
    const r2 = document.getElementById('diceResult2');
    const l2 = document.getElementById('diceLabel2');
    const formula = document.getElementById('diceFormula');
    if (!d1 || !r1) return;

    // ── Phase 1: D20 Rolling (0→900ms) with easing deceleration ──
    d1.textContent = '🎲';
    d1.classList.add('shaking');
    r1.className = 'dice-result cycling';
    l1.textContent = 'rolando...';
    l1.className = 'dice-label rolling-label';
    haptic('light'); sfxDiceRoll(); // Feature 4+8
    let _d20CycleActive = true;
    const _d20Ease = (step) => {
        if (!_d20CycleActive) return;
        r1.textContent = Math.floor(Math.random() * 19) + 2;
        // Decelerate: 60ms -> 80 -> 100 -> 130 -> 170 -> 220 -> 280ms
        const nextDelay = Math.min(60 + step * step * 5, 300);
        setTimeout(() => _d20Ease(step + 1), nextDelay);
    };
    _d20Ease(0);

    // ── Phase 2: D20 Reveal (at 900ms) ──
    setTimeout(() => {
        _d20CycleActive = false;
        d1.classList.remove('shaking');
        r1.className = 'dice-result';
        r1.textContent = lr.r;
        d1.classList.add('slamming');
        setTimeout(() => d1.classList.remove('slamming'), 300);

        if (lr.crit || lr.r === 20) {
            d1.textContent = '🌟';
            r1.classList.add('crit');
            l1.textContent = 'CRÍTICO!';
            l1.className = 'dice-label crit';
            d1.classList.add('crit-glow');
            const app = document.getElementById('app');
            if (app) app.classList.add('screen-shake');
            setTimeout(() => {
                if (app) app.classList.remove('screen-shake');
                d1.classList.remove('crit-glow');
            }, 500);
            haptic('heavy'); hapticNotify('success'); sfxCrit(); // Feature 4+8
            showNarration(_pick(_NARR_CRIT), 'crit'); // Feature 7
            _hitStreak++; if (_hitStreak >= 2) _showComboCounter(_hitStreak);
        } else if (lr.r === 1) {
            d1.textContent = '💀';
            r1.classList.add('miss');
            l1.textContent = 'FALHA CRÍTICA!';
            l1.className = 'dice-label miss';
            hapticNotify('error'); // Feature 4
            showNarration(_pick(_NARR_NAT1), 'nat1'); // Feature 7
            _hitStreak = 0;
        } else if (lr.miss) {
            r1.classList.add('miss');
            l1.textContent = 'errou';
            l1.className = 'dice-label miss';
            haptic('light'); sfxMiss(); // Feature 4+8
            showNarration(_pick(_NARR_MISS), 'miss'); // Feature 7
            // P1-F: Dodge flash on enemy when miss
            const dodgeTarget = document.querySelector('.entity.enemy');
            if (dodgeTarget) {
                dodgeTarget.classList.add('dodge-flash');
                setTimeout(() => dodgeTarget.classList.remove('dodge-flash'), 400);
            }
            _hitStreak = 0;
        } else {
            r1.classList.add('hit');
            l1.textContent = lr.t === 'skill' ? 'habilidade' : 'acerto';
            l1.className = 'dice-label hit';
            haptic('medium'); sfxHit(); // Feature 4+8
            // P2-G: Increment hit streak on successful hit
            _hitStreak++;
            if (_hitStreak >= 2) _showComboCounter(_hitStreak);
        }

        // Formula: "25 vs CA 16"
        if (formula && lr.ac) {
            const total = lr.total || lr.r;
            formula.textContent = `${total} vs CA ${lr.ac}`;
            formula.className = 'dice-formula visible ' + (lr.crit ? 'crit' : lr.miss ? 'miss' : 'hit');
        }
    }, 900);

    // ── Phase 3: Miss/no-damage → shield on damage die ──
    if (lr.miss || lr.d <= 0) {
        setTimeout(() => {
            if (d2) d2.textContent = '🛡️';
            if (r2) { r2.textContent = '—'; r2.className = 'dice-result miss'; }
            if (l2) { l2.textContent = 'bloqueado'; l2.className = 'dice-label miss'; }
        }, 1100);
        return;
    }

    // ── Phase 4: Damage Roll — 3D Multi-Dice with Fusion ──
    const DMG_ROLL_MS = 1500;
    const DMG_FUSION_HOLD = 400;   // Hold individual results before fusion
    const DMG_RESULT_HOLD = 1200;  // Hold final result for reading
    setTimeout(() => {
        if (!d2 || !r2) return;

        const parsed = _parseDiceFormula(lr.df);
        const dieType = parsed.type;
        const dieCount = parsed.count;

        // Get individual die results from backend, or synthesize
        let individualResults;
        if (lr.dr && lr.dr.length >= dieCount) {
            individualResults = lr.dr.slice(0, dieCount);
        } else {
            const diceOnly = Math.max(1, lr.d - parsed.modifier);
            individualResults = _distributeTotal(diceOnly, dieCount, parsed.sides);
        }

        const overlay = document.getElementById('dmgDice3dOverlay');
        const canvas = document.getElementById('dmgDice3dCanvas');
        const particles = document.getElementById('dmgDice3dParticles');
        const label3d = document.getElementById('dmgDice3dLabel');
        const skipBtn = document.getElementById('dmgDice3dSkip');

        d2.style.visibility = 'hidden';
        r2.style.visibility = 'hidden';
        l2.style.visibility = 'hidden';

        if (overlay && canvas && typeof Dice3D !== 'undefined') {
            if (_dmgDice3d) { _dmgDice3d.dispose(); _dmgDice3d = null; }

            // Wider canvas for multi-dice
            if (dieCount >= 2) canvas.classList.add('multi');
            else canvas.classList.remove('multi');

            overlay.style.display = 'flex';
            if (label3d) { label3d.textContent = lr.df || 'dano'; label3d.className = 'dmg-dice3d-label rolling'; }
            if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }

            let _dmgDone = false;
            const finishDmgOverlay = () => {
                if (_dmgDone) return;
                _dmgDone = true;
                if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
                overlay.style.display = 'none';
                canvas.classList.remove('multi');
                if (_dmgDice3d) { _dmgDice3d.dispose(); _dmgDice3d = null; }
                _revealDamageResult(d2, r2, l2, lr);
            };

            try {
                const canvasSize = dieCount >= 2 ? 180 : 140;
                _dmgDice3d = new Dice3D(canvas, {
                    size: canvasSize, dieType: dieType, duration: DMG_ROLL_MS,
                    particlesContainer: particles
                });

                if (dieCount >= 2) {
                    // ── MULTI-DICE: roll N dice simultaneously ──
                    const configs = individualResults.map(v => ({ value: v }));

                    _dmgDice3d.rollMultiple(configs, () => {
                        // All dice landed — show individual results
                        if (label3d) {
                            const rollsText = individualResults.join(' + ');
                            const modText = parsed.modifier ? ` + ${parsed.modifier}` : '';
                            label3d.textContent = rollsText + modText;
                            label3d.className = 'dmg-dice3d-label hit';
                        }

                        // Hold individual results, then fusion
                        setTimeout(() => {
                            if (_dmgDone) return;
                            if (label3d) { label3d.textContent = ''; label3d.className = 'dmg-dice3d-label rolling'; }

                            _dmgDice3d.fusionTo(lr.d, () => {
                                // Fusion complete — show total
                                if (label3d) {
                                    label3d.textContent = `${lr.d} dano`;
                                    label3d.className = 'dmg-dice3d-label ' + (lr.crit ? 'crit' : 'hit');
                                }

                                setTimeout(() => {
                                    if (!_dmgDone && skipBtn) {
                                        skipBtn.classList.add('visible');
                                        skipBtn.onclick = finishDmgOverlay;
                                    }
                                }, 500);
                                setTimeout(finishDmgOverlay, DMG_RESULT_HOLD);
                            });
                        }, DMG_FUSION_HOLD);
                    });
                } else {
                    // ── SINGLE DIE: original behavior ──
                    const dieMax = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 }[dieType] || 6;
                    const faceValue = Math.min(lr.d, dieMax) || (Math.floor(Math.random() * dieMax) + 1);

                    _dmgDice3d.roll(faceValue, () => {
                        if (label3d) {
                            label3d.textContent = `${lr.d} dano`;
                            label3d.className = 'dmg-dice3d-label ' + (lr.crit ? 'crit' : 'hit');
                        }
                        setTimeout(() => {
                            if (!_dmgDone && skipBtn) {
                                skipBtn.classList.add('visible');
                                skipBtn.onclick = finishDmgOverlay;
                            }
                        }, 500);
                        setTimeout(finishDmgOverlay, DMG_RESULT_HOLD);
                    });
                }
            } catch (e) {
                console.warn('[COMBAT] Dice3D damage roll failed:', e);
                overlay.style.display = 'none';
                canvas.classList.remove('multi');
                d2.style.visibility = '';
                r2.style.visibility = '';
                l2.style.visibility = '';
                _fallbackDamageRoll(d2, r2, l2, lr);
            }
        } else {
            d2.style.visibility = '';
            r2.style.visibility = '';
            l2.style.visibility = '';
            _fallbackDamageRoll(d2, r2, l2, lr);
        }
    }, 1200);
}

// Parse dice formula into structured data
// "2d6+3" → { count:2, type:'d6', sides:6, modifier:3 }
// "1d8"   → { count:1, type:'d8', sides:8, modifier:0 }
function _parseDiceFormula(formula) {
    if (!formula) return { count: 1, type: 'd6', sides: 6, modifier: 0 };
    const m = formula.match(/(\d*)d(\d+)/i);
    if (!m) return { count: 1, type: 'd6', sides: 6, modifier: 0 };
    const count = parseInt(m[1]) || 1;
    const sides = parseInt(m[2]);
    const valid = [4, 6, 8, 10, 12, 20];
    const type = valid.includes(sides) ? `d${sides}` : 'd6';
    const actualSides = valid.includes(sides) ? sides : 6;
    const rest = formula.slice(m.index + m[0].length);
    const modMatch = rest.match(/([+-]\d+)/);
    const modifier = modMatch ? parseInt(modMatch[1]) : 0;
    return { count: Math.min(count, 5), type, sides: actualSides, modifier };
}

// Legacy compat wrapper
function _parseDieType(formula) {
    return _parseDiceFormula(formula).type;
}

// Distribute a total across N dice when backend doesn't send individual rolls
function _distributeTotal(diceTotal, count, sides) {
    const results = [];
    let remaining = Math.max(count, Math.min(diceTotal, count * sides));
    for (let i = 0; i < count - 1; i++) {
        const minNeeded = count - i - 1;
        const maxAllowed = remaining - minNeeded;
        const value = Math.min(sides, Math.max(1,
            Math.floor(Math.random() * Math.min(sides, maxAllowed)) + 1));
        results.push(value);
        remaining -= value;
    }
    results.push(Math.min(sides, Math.max(1, remaining)));
    return results;
}

// Fallback damage roll animation (emoji cycling — original behavior)
function _fallbackDamageRoll(d2, r2, l2, lr) {
    d2.textContent = '🎲';
    d2.classList.add('shaking');
    r2.className = 'dice-result cycling';
    l2.textContent = 'rolando...';
    l2.className = 'dice-label rolling-label';
    const maxCycle = Math.max(lr.d, 6);
    let _dmgCycleActive = true;
    const _dmgEase = (step) => {
        if (!_dmgCycleActive) return;
        r2.textContent = Math.floor(Math.random() * maxCycle) + 1;
        const nextDelay = Math.min(60 + step * step * 6, 280);
        setTimeout(() => _dmgEase(step + 1), nextDelay);
    };
    _dmgEase(0);
    setTimeout(() => {
        _dmgCycleActive = false;
        _revealDamageResult(d2, r2, l2, lr);
    }, 700);
}

// Reveal final damage result on emoji dice + trigger impact effects
function _revealDamageResult(d2, r2, l2, lr) {
    d2.classList.remove('shaking');
    d2.textContent = '⚔️';
    r2.textContent = lr.d;
    r2.className = 'dice-result hit';
    d2.classList.add('slamming');
    setTimeout(() => d2.classList.remove('slamming'), 300);
    l2.textContent = lr.df || 'dano';
    l2.className = 'dice-label hit';

    // ── HIT-STOP: Freeze frame 120ms at impact ──
    const app = document.getElementById('app');
    if (app) app.classList.add('hit-stop');
    haptic('heavy');

    setTimeout(() => {
        if (app) app.classList.remove('hit-stop');

        // Flash enemy card on damage
        const enemies = document.querySelectorAll('.entity.enemy');
        if (enemies.length > 0) {
            enemies[0].classList.add('dmg-flash');
            setTimeout(() => enemies[0].classList.remove('dmg-flash'), 400);
        }

        // Feature 3: Particles on damage impact
        spawnParticles(lr.crit, lr.dt || 'slashing');

        // Feature 7: Kill narration with enemy name
        if (lr.kill) {
            const killName = (currentState?.e && currentState.e[0]?.n) || 'O inimigo';
            showNarration(_pick(_NARR_KILL).replace('{name}', killName), 'crit');
        }
    }, 120);
}

// Static dice display (for polling re-renders — no animation)
function _showDiceStatic(lr) {
    const d1 = document.getElementById('dice1');
    const r1 = document.getElementById('diceResult1');
    const l1 = document.getElementById('diceLabel1');
    const d2 = document.getElementById('dice2');
    const r2 = document.getElementById('diceResult2');
    const l2 = document.getElementById('diceLabel2');
    const formula = document.getElementById('diceFormula');
    if (!d1 || !r1) return;

    const isCrit = lr.crit || lr.r === 20;
    const isFail = lr.r === 1;
    const isMiss = lr.miss || lr.d <= 0;
    const cls = isCrit ? 'crit' : isMiss ? 'miss' : 'hit';

    d1.textContent = isCrit ? '🌟' : isFail ? '💀' : '🎲';
    r1.textContent = lr.r;
    r1.className = 'dice-result ' + cls;
    l1.textContent = isCrit ? 'CRÍTICO!' : isFail ? 'FALHA CRÍTICA!' : isMiss ? 'errou' : (lr.t === 'skill' ? 'habilidade' : 'acerto');
    l1.className = 'dice-label ' + cls;

    if (lr.d > 0) {
        if (d2) d2.textContent = '⚔️';
        if (r2) { r2.textContent = lr.d; r2.className = 'dice-result hit'; }
        if (l2) { l2.textContent = lr.df || 'dano'; l2.className = 'dice-label hit'; }
    } else {
        if (d2) d2.textContent = '🛡️';
        if (r2) { r2.textContent = '—'; r2.className = 'dice-result miss'; }
        if (l2) { l2.textContent = 'bloqueado'; l2.className = 'dice-label miss'; }
    }

    if (formula && lr.ac) {
        const total = lr.total || lr.r;
        formula.textContent = `${total} vs CA ${lr.ac}`;
        formula.className = 'dice-formula visible ' + (isCrit ? 'crit' : isMiss ? 'miss' : 'hit');
    }
}

// ─── UTILS ───
// ─── ERROR DISPLAY ───
function showError(msg, err = null) {
    console.error('[COMBAT]', msg, err || '');
    const app = document.getElementById('app');
    if (!app) return;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#7b2020;color:#fff;padding:10px 20px;border-radius:8px;z-index:999;font-size:13px;text-align:center;max-width:90%;';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
    _actionSent = false;
    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('disabled'));
}

function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════════════════
// ─── IMMERSION FEATURES ───
// ═══════════════════════════════════════════════════

// ─── FEATURE 4: HAPTIC FEEDBACK ───
function haptic(type) { try { tg?.HapticFeedback?.impactOccurred(type || 'light'); } catch (e) { console.warn('[COMBAT] haptic:', e); } }
function hapticNotify(type) { try { tg?.HapticFeedback?.notificationOccurred(type || 'success'); } catch (e) { console.warn('[COMBAT] haptic:', e); } }
function hapticSelect() { try { tg?.HapticFeedback?.selectionChanged(); } catch (e) { console.warn('[COMBAT] haptic:', e); } }

// ─── FEATURE 8: PROCEDURAL SFX (Web Audio API) ───
function _ensureAudio() {
    if (_audioCtx) return _audioCtx;
    try {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return _audioCtx;
    } catch (e) { console.warn('[COMBAT] AudioContext unavailable', e); return null; }
}

function _sfxNoise(dur, vol) {
    const ctx = _ensureAudio();
    if (!ctx || !_audioUnlocked) return;
    try {
        const bufSize = ctx.sampleRate * dur;
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        src.connect(gain); gain.connect(ctx.destination);
        src.start(); src.stop(ctx.currentTime + dur);
    } catch (e) { console.warn('[COMBAT] sfxNoise', e); }
}

function _sfxTone(freq, dur, vol, type) {
    const ctx = _ensureAudio();
    if (!ctx || !_audioUnlocked) return;
    try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + dur);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + dur);
    } catch (e) { console.warn('[COMBAT] sfxTone', e); }
}

function sfxDiceRoll() { _sfxNoise(0.15, 0.08); }
function sfxHit() { _sfxTone(120, 0.25, 0.12, 'sawtooth'); }
function sfxCrit() { _sfxTone(220, 0.4, 0.18, 'sawtooth'); setTimeout(() => _sfxTone(330, 0.3, 0.12, 'sine'), 80); }
function sfxMiss() { _sfxTone(300, 0.2, 0.06, 'sine'); }
function sfxPlayerHit() { _sfxTone(80, 0.3, 0.15, 'sawtooth'); }
function sfxTimerTick() { _sfxTone(600, 0.08, 0.1, 'square'); }

// ─── FEATURE 3: PARTICLE EFFECTS ───
const _PARTICLE_COLORS = {
    slashing: ['#e0e0e0', '#d4c060'],
    piercing: ['#b0c8e0', '#d4c060'],
    bludgeoning: ['#c0b080', '#e0d080'],
    fire: ['#ff6020', '#ff9020', '#ffd040'],
    cold: ['#80c0ff', '#c0e8ff'],
    lightning: ['#e0e060', '#ffffff'],
    necrotic: ['#9040c0', '#604080'],
    radiant: ['#ffe080', '#ffffff'],
    psychic: ['#e080ff', '#c060d0'],
    thunder: ['#a0a0e0', '#ffffff'],
    poison: ['#60c040', '#80e040'],
    acid: ['#60d040', '#c0ff40'],
    force: ['#60c0ff', '#a0e0ff'],
    magic: ['#c060ff', '#60c0ff'],
};

function spawnParticles(isCrit, damageType) {
    const colors = _PARTICLE_COLORS[damageType] || _PARTICLE_COLORS['slashing'];
    const count = isCrit ? 12 : 7;
    const anchor = document.getElementById('dice2');
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'hit-particle';
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
        const dist = 30 + Math.random() * (isCrit ? 60 : 40);
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist - 20;
        const dur = 0.4 + Math.random() * 0.3;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = isCrit ? 8 : 5;
        p.style.cssText = `left:${cx}px;top:${cy}px;background:${color};--p-tx:${tx}px;--p-ty:${ty}px;--p-dur:${dur}s;width:${size}px;height:${size}px;`;
        document.body.appendChild(p);
        setTimeout(() => p.remove(), dur * 1000 + 100);
    }
}

// ─── FEATURE 7: DM NARRATION ───
const _NARR_CRIT = [
    'A lâmina encontra uma brecha mortal!',
    'Golpe devastador! O inimigo recua.',
    'Perfeito! Um acerto certeiro e brutal.',
    'A armadura não resiste ao impacto!',
    'Um golpe magistral! Impressionante.',
    'Com precisão letal, o golpe atinge em cheio!',
    'Nenhum escudo poderia parar esse golpe.',
    'O inimigo não tinha como evitar.',
    'Atingido com força avassaladora!',
    'Vulnerabilidade exposta — golpe crítico!',
];
const _NARR_NAT1 = [
    'O golpe passa vergonhosamente longe!',
    'Tropeça e perde o equilíbrio por um instante.',
    'A arma escorrega da mão por um segundo.',
    'Uma distração fatal arruína o ataque.',
    'O inimigo se esquiva com facilidade.',
    'Um erro de julgamento custoso.',
    'O golpe raspa o ar sem causar dano.',
    'Uma falha imperdoável no momento crucial.',
    'O peso da arma desequilibra o atacante.',
    'Nem perto — o inimigo mal precisou se mover.',
];
const _NARR_MISS = [
    'O inimigo desvia no último instante.',
    'O ataque é bloqueado pela armadura.',
    'Rápido demais — o golpe não conecta.',
    'A defesa do inimigo resiste.',
    'Sem efeito — o inimigo esquiva com destreza.',
];
// P1-E: Kill narrations with enemy name template ({name} is replaced at call site)
const _NARR_KILL = [
    '{name} tomba derrotado!',
    'Sem mais vida — {name} cai.',
    'O golpe final abate {name}.',
    'Derrota inevitável — {name} sucumbe.',
    '{name} não se levanta mais.',
];

function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function showNarration(text, cssClass) {
    const el = document.getElementById('diceNarration');
    if (!el) return;
    el.textContent = text;
    el.className = 'dice-narration ' + (cssClass || '');
    void el.offsetWidth;
    el.classList.add('visible');
}

// ─── FEATURE 1: HP BAR ANIMATED TRANSITION ───
function _animateHpBars(state) {
    const current = new Map();
    if (state.p) current.set('player', { hp: state.p.hp, mhp: state.p.mhp });
    (state.e || []).forEach((e, i) => current.set(`e${i}_${e.n}`, { hp: e.hp, mhp: e.mhp }));
    (state.a || []).forEach((a, i) => current.set(`a${i}_${a.n}`, { hp: a.hp, mhp: a.mhp }));

    current.forEach((cur, key) => {
        const prev = _prevHpState.get(key);
        if (!prev || prev.hp === cur.hp) return;

        const oldPct = prev.mhp > 0 ? (prev.hp / prev.mhp) * 100 : 0;
        const newPct = cur.mhp > 0 ? (cur.hp / cur.mhp) * 100 : 0;

        let fillEl = null;
        if (key === 'player') {
            fillEl = document.querySelector('.zone-player .bar-fill');
        } else if (key.startsWith('e')) {
            const idx = parseInt(key.charAt(1));
            const els = document.querySelectorAll('.zone-enemies .hp-mini-fill');
            if (els[idx]) fillEl = els[idx];
        } else if (key.startsWith('a')) {
            const idx = parseInt(key.charAt(1));
            const els = document.querySelectorAll('.zone-allies .hp-mini-fill');
            if (els[idx]) fillEl = els[idx];
        }
        if (!fillEl) return;

        fillEl.style.transition = 'none';
        fillEl.style.width = oldPct + '%';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                fillEl.style.transition = 'width 0.65s ease-out';
                fillEl.style.width = newPct + '%';
            });
        });
    });

    current.forEach((v, k) => _prevHpState.set(k, v));
}

// ─── FEATURE 2: PLAYER SHAKE ON DAMAGE + VIEWPORT FLASH + FLOAT ───
function _checkPlayerDamage(state) {
    if (!state.p) return;
    const curHp = state.p.hp;
    if (_prevPlayerHp > 0 && curHp < _prevPlayerHp) {
        const dmgTaken = _prevPlayerHp - curHp;
        const playerEl = document.querySelector('.entity.player');
        if (playerEl) {
            playerEl.classList.remove('dmg-shake');
            void playerEl.offsetWidth;
            playerEl.classList.add('dmg-shake');
            setTimeout(() => playerEl.classList.remove('dmg-shake'), 500);
            haptic('heavy');
            sfxPlayerHit();

            // Floating damage on player
            _showDamageFloat(dmgTaken, null, '.entity.player');
        }

        // Viewport damage flash (red overlay)
        _showViewportFlash();
    }
    _prevPlayerHp = curHp;
}

function _showViewportFlash() {
    let flash = document.getElementById('viewportFlash');
    if (!flash) {
        flash = document.createElement('div');
        flash.id = 'viewportFlash';
        flash.className = 'viewport-flash';
        document.body.appendChild(flash);
    }
    flash.classList.remove('active');
    void flash.offsetWidth;
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 400);
}

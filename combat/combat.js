/* ═══════════════════════════════════════════════
   COMBATE - Lendas de Valdoria
   Fixed-viewport combat webapp with compact UI
   Supports API mode (persistent) and sendData fallback
   ═══════════════════════════════════════════════ */

// ─── INIT ───
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready(); tg.expand();
    // BackButton — always available for closing the WebApp
    if (tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            // If no combat state loaded (server down / error screen), close immediately
            if (!currentState) {
                stopAllIntervals();
                try { tg.close(); } catch (e) { console.warn('[COMBAT] tg.close() failed', e); }
                return;
            }
            closeCombat('back');
        });
    }
}

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
let _initAnimationInProgress = false; // Blocks poll re-render during initiative animation

// ─── IMMERSION FEATURES STATE ───
const _prevHpState = new Map(); // Feature 1: HP bar animation tracking
const _prevStatusState = new Map(); // Status change detection for VFX
let _prevPlayerHp = 0;          // Feature 2: detect player damage for shake
let _lastEnemyDmgType = 'slashing'; // Track enemy damage type for VFX
let _audioCtx = null;           // Feature 8: Web Audio (lazy init)
let _audioUnlocked = false;     // Feature 8: requires user gesture to unlock
let _currentPositions = null;   // Feature 9: combat positions
let _cinematicInProgress = false; // Blocks re-render during action cinematic
let _cinematicWarnTimer = null;     // Warn toast timer during cinematic
let _overlayOpen = false;          // Blocks poll re-render while target/skill overlay is open
let _bonusHapticFired = false;     // Haptic fired for bonus_action sub-phase
let _reactionHapticFired = false;  // Haptic fired for reaction sub-phase
let _reactionAutoTimer = null;     // 10s auto-skip timer for reactions
let _lastRenderedPhase = null;  // Phase transition tracking
let _hitStreak = 0;               // P2-G: Combo streak counter
let _initDice3d = null;           // THREE.js Dice3D instance for initiative screen
let _dmgDice3d = null;            // THREE.js Dice3D instance for damage rolls


// ─── ANIMATION TIMING CONSTANTS ───
const TIMING = {
    D20_ROLL: 1200,           // Duration of d20 3D roll animation (ms)
    D20_HOLD: 800,            // Hold time after d20 lands before damage phase (ms)
    MISS_HOLD: 2400,          // Hold time on miss result before closing overlay (ms)
    SKIP_DELAY: 500,          // Delay before skip button appears (ms)
    CINEMATIC_WARN: 5000,     // Show "processing" toast after this delay (ms)
    CINEMATIC_MAX: 20000,     // Force-reset cinematic after this timeout (ms)
    POLL_ACTIVE: 2000,        // Poll interval during active combat (ms)
    POLL_ENEMY: 3000,         // Poll interval during enemy turn (ms)
    POLL_IDLE: 8000,          // Poll interval during idle phases (ms)
};

// ─── SHAKE HELPER — shake-light or shake-heavy on #app ───
function _shakeApp(intensity) {
    const app = document.getElementById('app');
    if (!app) return;
    const cls = intensity === 'heavy' ? 'shake-heavy' : 'shake-light';
    const dur = intensity === 'heavy' ? 450 : 300;
    app.classList.remove('shake-light', 'shake-heavy');
    void app.offsetWidth;
    app.classList.add(cls);
    setTimeout(() => app.classList.remove(cls), dur);
}

// ─── IMPACT FLASH — radial flash at a target element's center ───
function _showImpactFlash(targetEl, isCrit) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const flash = document.createElement('div');
    flash.className = 'impact-flash' + (isCrit ? ' crit' : '');
    flash.style.left = (rect.left + rect.width / 2 - (isCrit ? 35 : 25)) + 'px';
    flash.style.top = (rect.top + rect.height / 2 - (isCrit ? 35 : 25)) + 'px';
    flash.style.position = 'fixed';
    document.body.appendChild(flash);
    flash.addEventListener('animationend', () => flash.remove());
}

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
            if (body.status === 'displaced' && window.SessionHeartbeat) {
                SessionHeartbeat.handleDisplaced(body.device || '');
                throw new Error('displaced');
            }
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
            if (body.status === 'displaced' && window.SessionHeartbeat) {
                SessionHeartbeat.handleDisplaced(body.device || '');
                throw new Error('displaced');
            }
            const err = new Error(body.error || `API ${r.status}`);
            err.status = r.status;
            throw err;
        }
        return r.json();
    }
}
const api = isApiMode ? new CombatAPI(apiBase, token, userId) : null;

// Auto-discover new tunnel URL if current one dies
if (apiBase && window.ApiDiscovery) {
    ApiDiscovery.init(apiBase, function(newUrl) {
        if (api) api.base = newUrl;
    });
}

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

// PT-BR translations for status effect keys from backend
const STATUS_PT = {
    poisoned: 'Envenenado', blinded: 'Cego', paralyzed: 'Paralisado', prone: 'Derrubado',
    restrained: 'Preso', frightened: 'Amedrontado', stunned: 'Atordoado', grappled: 'Agarrado',
    petrified: 'Petrificado', exhausted: 'Exausto', marked: 'Marcado', blessed: 'Abençoado',
    hexed: 'Amaldiçoado', burning: 'Queimando', frozen: 'Congelado', sleeping: 'Dormindo',
    charmed: 'Encantado', deafened: 'Surdo', incapacitated: 'Incapacitado',
    invisible: 'Invisível', surprised: 'Surpreso', exposed: 'Exposto', inspired: 'Inspirado',
    concentrated: 'Concentrado', raging: 'Furioso', wild_shaped: 'Forma Selvagem',
    weakened: 'Enfraquecido', cursed: 'Amaldiçoado', corroded: 'Corroído',
    mocked: 'Provocado', enraged: 'Enfurecido', regenerating: 'Regenerando',
    slowed: 'Lento', pushed: 'Empurrado',
};
// Buff vs debuff classification (buffs get green styling, debuffs get red)
const STATUS_BUFFS = new Set([
    'blessed', 'inspired', 'invisible', 'raging', 'wild_shaped',
    'concentrated', 'regenerating',
]);

const DMG_ICONS = {
    slashing: '🗡️', piercing: '🏹', bludgeoning: '🔨', fire: '🔥', cold: '❄️',
    lightning: '⚡', necrotic: '💀', radiant: '✨', psychic: '🧠', thunder: '💥',
    poison: '🧪', acid: '🟢', force: '💠',
};

const ATK_TYPE_LABELS = { melee: 'Corpo a corpo', ranged: 'À distância', magic: 'Mágico' };

const RES_CLASS_MAP = {
    'Mana': 'mp', 'Ki': 'ki', 'Fúria': 'fury', 'Vigor': 'vigor',
    'Inspiração': 'inspiration', 'Pacto': 'pact', 'Energia': 'energy',
};

const RES_ICON_MAP = {
    'Mana': '💧', 'Ki': '⚡', 'Fúria': '💢', 'Vigor': '💪',
    'Inspiração': '🎵', 'Pacto': '👁️', 'Energia': '⚡',
};

// ─── Error Reporter Init ───
if (window.ValdoriaErrors) {
    ValdoriaErrors.init({
        appName: 'COMBAT',
        apiBase: apiBase,
        token: token,
        uid: userId,
    });
}

// ─── Device displacement heartbeat ───
if (window.SessionHeartbeat && apiBase && token && userId) {
    SessionHeartbeat.init({ apiBase: apiBase, token: token, uid: userId });
}

// ─── STARTUP ───
if (isApiMode) {
    loadCombatState();
} else if (rawData) {
    try {
        const state = JSON.parse(b64Decode(rawData));
        currentState = state;
        renderArena(state);
        if (window._combatLoadingCtrl) window._combatLoadingCtrl.hide();
    } catch (e) {
        console.error('[COMBAT]', 'Dados corrompidos', e);
        document.getElementById('app').innerHTML = '<div class="no-data"><h2>Erro</h2><p>Dados de combate corrompidos.</p></div>';
        var lo = document.getElementById('combatLoading');
        if (lo) { lo.classList.add('exit-cinematic'); setTimeout(function() { lo.classList.add('hidden'); }, 950); }
    }
} else {
    document.getElementById('app').innerHTML = '<div class="no-data"><h2>Combate</h2><p>Nenhum dado recebido.</p></div>';
    var lo = document.getElementById('combatLoading');
    if (lo) { lo.classList.add('exit-cinematic'); setTimeout(function() { lo.classList.add('hidden'); }, 950); }
}

async function loadCombatState() {
    try {
        const state = await api.getState();
        if (state.error === 'no_combat' || state.phase === 'ended') { showCombatEnded(); return; }
        currentState = state;
        if (state.phase && !state.ph) state.ph = state.phase;
        renderArena(state);
        startHeartbeat();
        if (window._combatLoadingCtrl) window._combatLoadingCtrl.hide();
    } catch (e) {
        console.error('[COMBAT]', 'Erro ao carregar', e);
        // Distinguish "server down" from "session invalid" via health check
        const health = await api.checkHealth();
        // Detect tunnel URL change — update in memory (reload would break initData)
        if (health.api && health.api !== api.base) {
            console.log('[COMBAT] Tunnel URL changed, updating apiBase in memory');
            api.base = health.api;
            if (window.ApiDiscovery) ApiDiscovery.updateBase(health.api);
        }
        if (health.status === 'unreachable') {
            document.getElementById('app').innerHTML = '<div class="no-data"><h2>Servidor Indisponível</h2><p>O servidor de combate não está respondendo. Tente novamente em alguns segundos.</p></div>';
        } else if (e.status === 401 || e.status === 403) {
            document.getElementById('app').innerHTML = '<div class="no-data"><h2>Sessão Expirada</h2><p>Feche esta janela e reabra o combate no Telegram.</p></div>';
        } else {
            document.getElementById('app').innerHTML = '<div class="no-data"><h2>Erro de Conexão</h2><p>Não foi possível carregar o combate.</p></div>';
        }
        // Hide loading immediately on error
        var lo = document.getElementById('combatLoading');
        if (lo) { lo.classList.add('exit-cinematic'); setTimeout(function() { lo.classList.add('hidden'); }, 950); }
    }
}

function showCombatEnded() {
    stopAllIntervals();
    if (typeof _clearStatusTracking === 'function') _clearStatusTracking();
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
        const errMsg = resp.status === 401 ? 'Sessão expirada — reabra o jogo'
            : resp.status >= 500 ? 'Servidor indisponível — tente novamente'
            : 'Erro ao sair do combate';
        console.error('[COMBAT] Transition failed:', resp.status, errMsg);
        showError(errMsg + '. Fechando...');
        return;
    } catch (e) {
        console.error('[COMBAT] Transition error:', e);
    }

    // Fallback: close WebApp and let user tap JOGAR from Telegram
    // (combat token is not valid for Game Hub sessions)
    showError('Erro de conexão. Fechando...');
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
    const isFled = state.phase === 'fled';
    const rawText = state.result_text || state.action_result_text || '';
    const app = document.getElementById('app');

    // Build rewards from structured data (preferred) or parse from text (fallback)
    let rewardsHtml = '';
    let narrativeLines = [];

    const rewards = state.rewards;
    if (rewards && isVictory && !isFled) {
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
        : (isVictory ? '<div class="res-rewards"><div class="res-reward"><span class="res-icon">\u2694\uFE0F</span><span>Combate encerrado</span></div></div>'
            : (narrativeLines.length > 0 ? '' : '<div class="res-rewards"><div class="res-reward"><span class="res-icon">\u{1F4AB}</span><span>Você caiu em combate</span></div></div>'));

    // Level-up transition button (when player leveled up with pending choices)
    const hasLevelUp = isVictory && !isFled && state.leveled_up && isApiMode;
    let btnLabel = isVictory ? '🏕️ Continuar Aventura' : '💫 Continuar';
    if (isFled) btnLabel = '🏕️ Continuar Aventura';
    const buttonsHtml = hasLevelUp
        ? `<button class="action-btn primary res-continue res-levelup-btn" onclick="transitionToLevelup()">
               ⬆️ Distribuir Pontos!
           </button>
           <button class="action-btn secondary res-continue" onclick="closeCombat('${state.phase}')" style="margin-top:8px;opacity:0.7">
               🏕️ Pular
           </button>`
        : `<button class="action-btn primary res-continue" onclick="closeCombat('${state.phase}')">
               ${btnLabel}
           </button>`;

    app.innerHTML = `<div class="resolution-screen">
        <div class="res-header ${isFled ? 'victory' : (isVictory ? 'victory' : 'defeat')}">
            <div class="res-title">${isFled ? '🏃 FUGA!' : (isVictory ? '🏆 VITÓRIA!' : '💀 DERROTA')}</div>
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
    } else if (continueBtn) {
        // No rewards — still animate the button entrance
        continueBtn.classList.add('reward-hidden');
        setTimeout(() => {
            continueBtn.classList.remove('reward-hidden');
            continueBtn.classList.add('reward-reveal');
        }, 600);
    }

    // VFX + SFX for resolution screens
    if (window._combatVfx) {
        const headerEl = app.querySelector('.res-header');
        if (isVictory || isFled) {
            // Victory: golden burst from header + triumphant flash
            if (headerEl) {
                window._combatVfx.buff(headerEl);
                setTimeout(() => window._combatVfx.buff(headerEl), 400);
            }
            window._combatVfx.flash('rgba(255,215,0,0.25)', 600);
            hapticBurst('crit');
            sfxCrit(); // Triumphant chord
        } else {
            // Defeat: red vignette + somber flash
            window._combatVfx.flash('rgba(120,20,20,0.35)', 800);
            setTimeout(() => window._combatVfx.flash('rgba(80,10,10,0.2)', 600), 500);
            haptic('heavy');
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
    // Dispose damage 3D dice on re-render — but NOT during active action/cinematic
    if (!_cinematicInProgress && !_actionSent) {
        if (_dmgDice3d) { _dmgDice3d.dispose(); _dmgDice3d = null; }
        const existingOverlay = document.getElementById('dmgDice3dOverlay');
        if (existingOverlay) existingOverlay.style.display = 'none';
    }
    const app = document.getElementById('app');
    // Clear previous biome classes before applying new one
    document.body.className = document.body.className.replace(/\bbiome-\S+/g, '').trim();
    document.body.classList.add('biome-' + (s.bio || 'forest'));

    const biomeName = BIOME_NAMES[s.bio] || s.bio || 'Desconhecido';
    const wLabel = s.w ? s.w.l : 'Limpo';
    const wIco = s.w ? s.w.ico : '☀️';
    const wCls = s.w ? _weatherClass(wLabel) : 'w-clear';
    const weatherStr = `<span class="weather-badge ${wCls}">${wIco} ${wLabel}</span>`;

    const activeTurn = s.to && s.to[0] ? s.to[0] : null;
    _currentPositions = s.positions || null; // Feature 9

    const ph = s.ph || s.phase || 'intro';

    let html = '';

    // Header (dynamic title based on biome — show "Iniciativa" during init/intro phases)
    const biomeTitle = (ph === 'init' || ph === 'intro') ? 'Iniciativa' :
        s.bio === 'arena' ? 'Arena de Combate' :
        s.bio === 'dungeon' ? 'Combate na Masmorra' :
            s.bio === 'cave' ? 'Combate na Caverna' :
                s.bio === 'city' ? 'Combate na Cidade' : 'Combate';
    html += `<div class="arena-header">
        <div class="arena-title">${biomeTitle}</div>
        <div class="arena-subtitle"><span class="round-badge">R${s.rn || 1}</span> ${biomeName} · ${weatherStr}</div>
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
        // (Dead inline dice HTML removed — using 3D overlay dice system)
    }
    if (s.feed && s.feed.length > 0) {
        const total = s.feed.length;
        const visibleCount = isNarrative ? 6 : 3;
        const recentFeed = s.feed.slice(-visibleCount);
        const narrativeCls = isNarrative ? ' combat-feed-narrative' : '';
        // Auto-expand feed when latest entry is a crit or kill (epic moments)
        const lastFeedClass = _classifyFeed(s.feed[s.feed.length - 1]);
        const autoExpand = total > visibleCount && (lastFeedClass === 'feed-crit' || lastFeedClass === 'feed-kill');
        html += `<div class="combat-feed${narrativeCls}${autoExpand ? ' feed-expanded' : ''}" id="combatFeed">`;
        if (total > visibleCount) {
            const older = s.feed.slice(0, -visibleCount);
            older.forEach(f => { html += `<div class="feed-entry feed-hidden ${_classifyFeed(f)}">${escHtml(f)}</div>`; });
        }
        recentFeed.forEach(f => { html += `<div class="feed-entry ${_classifyFeed(f)}">${escHtml(f)}</div>`; });
        if (total > visibleCount) {
            const toggleLabel = autoExpand ? '▼ Recolher' : `▲ Mostrar +${total - visibleCount} anteriores`;
            html += `<div class="feed-toggle" id="feedToggle">${toggleLabel}</div>`;
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

    // Build action toast HTML (will be placed inside action bar)
    let _actionToastHtml = '';
    if (s.feed && s.feed.length > 0 && ph === 'active') {
        const lastFeed = s.feed[s.feed.length - 1];
        const cls = _classifyFeed(lastFeed);
        _actionToastHtml = `<div class="action-toast ${cls}" id="actionToast">${escHtml(lastFeed)}</div>`;
    }

    // Action Bar — phase-dependent (with D&D 5e sub-phase support)
    const subPh = s.sub_phase || '';
    // Reset sub-phase haptic flags when phase/sub-phase changes
    if (subPh !== 'bonus_action') _bonusHapticFired = false;
    if (subPh !== 'reaction') { _reactionHapticFired = false; if (_reactionAutoTimer) { clearTimeout(_reactionAutoTimer); _reactionAutoTimer = null; } }
    const isUnconscious = s.unconscious || (s.p && s.p.hp <= 0);
    if (ph === 'active' && isUnconscious) {
        // Spectator mode: player is unconscious, allies fight on
        // D&D 5e PHB p.197: Death Saving Throws — show status + advance button
        const ds = s.ds || { s: 0, f: 0 };
        const dsMarks = '✅'.repeat(ds.s) + '⬜'.repeat(3 - ds.s) + '  ' + '❌'.repeat(ds.f) + '⬜'.repeat(3 - ds.f);
        const dsLegend = '<div class="spectator-legend">3 \u2705 = Estabilizado \u00b7 3 \u274c = Morte</div>';
        const stab = ds.stab ? '<div class="spectator-detail">🩹 Estabilizado — aguardando socorro</div>' : '';
        html += `<div class="action-bar spectator-bar">
            <div class="spectator-msg">💀 <b>Inconsciente</b> — Teste contra a Morte</div>
            <div class="spectator-saves">${dsMarks}</div>
            ${stab}
            ${dsLegend}
            <button class="action-btn primary full-width" data-action="continue_spectator" style="margin-top:6px">⏭️ Próximo Round</button>
        </div>`;
    } else if (ph === 'active' && subPh === 'bonus_action') {
        if (!_bonusHapticFired) { _bonusHapticFired = true; haptic('medium'); }
        html += renderTimerBar(s);
        html += renderBonusActionBar(s.acts, s.e, s.p, _actionToastHtml);
    } else if (ph === 'active' && subPh === 'reaction') {
        if (!_reactionHapticFired) {
            _reactionHapticFired = true;
            hapticNotify('warning');
            // D&D 5e: Reactions are quick decisions - auto-skip after 10s
            if (_reactionAutoTimer) clearTimeout(_reactionAutoTimer);
            _reactionAutoTimer = setTimeout(() => {
                if (currentState && (currentState.sub_phase || '') === 'reaction') {
                    sendAction({ type: 'reaction_skip' });
                }
            }, 10000);
        }
        html += renderTimerBar(s);
        html += renderReactionBar(s.acts, s.p, _actionToastHtml);
    } else if (ph === 'active') {
        html += renderTimerBar(s);
        html += renderActionBar(s.acts, s.e, s.p, _actionToastHtml);
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

    // Ensure full-screen 3D dice overlay exists (persistent, outside #app)
    _ensureDiceOverlay();

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
    // Close any open overlay when state re-renders (prevents blocking)
    if (_overlayOpen) {
        document.querySelectorAll('.skill-overlay, .target-overlay, .item-overlay').forEach(o => o.classList.remove('active'));
        _overlayOpen = false;
    }
    bindExpandCollapse();
    bindFeedToggle();
    // Auto-scroll turn timeline to active entry
    _scrollTimelineToActive();
    // Auto-scroll combat feed to latest entry
    const _feed = document.getElementById('combatFeed');
    if (_feed) _feed.scrollTop = _feed.scrollHeight;

    // Immersion features: HP bar animation + player shake detection
    _animateHpBars(s);
    _checkPlayerDamage(s);
    _checkStatusChanges(s);

    // Auto-expand: ONLY the active-turn entity (never dead, never all enemies)
    // On player turn: enemies stay collapsed (tap to expand) — saves ~160px
    if (activeTurn && ph !== 'init' && ph !== 'intro') {
        if (activeTurn.t !== 'p') {
            const activeEl = document.querySelector('.entity.active-turn');
            if (activeEl && !activeEl.classList.contains('dead')) activeEl.classList.add('expanded');
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

let _timerDeadline = 0; // Absolute timestamp (ms) when timer expires

function startTimer(seconds) {
    stopTimer();
    _timerMax = seconds;
    _timerRemaining = seconds;
    _timerDeadline = Date.now() + seconds * 1000;

    _timerInterval = setInterval(() => {
        // Use absolute deadline instead of decrement to survive tab switches
        _timerRemaining = Math.max(0, (_timerDeadline - Date.now()) / 1000);

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

        // Multi-stage visual warnings
        if (_timerRemaining <= 5) {
            bar.classList.remove('warning');
            bar.classList.add('critical');
            text.classList.add('critical');
        } else if (pct <= 40) {
            bar.classList.add('warning');
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

// Resync timer display when player returns from another app/tab
function _onVisibilityChange() {
    if (document.hidden || !_timerInterval || !_timerDeadline) return;
    const remaining = Math.max(0, (_timerDeadline - Date.now()) / 1000);
    _timerRemaining = remaining;
    if (remaining <= 0) {
        // Timer expired while tab was hidden — trigger expired flow
        const bar = document.getElementById('timerBar');
        const text = document.getElementById('timerText');
        if (bar) { bar.style.width = '0%'; bar.classList.add('critical'); }
        if (text) { text.textContent = '⏳ Turno perdido'; }
        _showTimerExpiredToast();
        stopTimer();
        if (isApiMode && api) {
            setTimeout(() => { _pollForTimerResult(); }, 500);
        }
    }
}
document.addEventListener('visibilitychange', _onVisibilityChange);

function _showTimerExpiredToast() {
    hapticNotify('error');
    _shakeApp('light');
    const el = document.createElement('div');
    el.className = 'timer-toast';
    const msg = '⏳ Tempo esgotado — turno perdido!';
    el.textContent = msg;
    document.body.appendChild(el);
    const dur = (typeof calcReadTime === 'function') ? calcReadTime(msg, 'toast-warn') : 3000;
    setTimeout(() => el.classList.add('visible'), 50);
    setTimeout(() => { el.classList.remove('visible'); setTimeout(() => el.remove(), 300); }, dur);
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
                    renderArena(state); // renderArena already calls startPolling
                }
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

let _pollFailures = 0;

function startPolling() {
    stopPolling();
    if (!isApiMode || !api) return;

    const poll = async () => {
        try {
            const state = await api.getState();
            _pollFailures = 0; // Reset on successful fetch
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
            if (!state) { _pollInterval = setTimeout(poll, 8000); return; }
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

            // Detect server-side timer expiry (timer ran out before client noticed)
            if (state.timer_expired && !currentState?.timer_expired) {
                _showTimerExpiredToast();
            }
            if (newPh !== oldPh || newRn !== oldRn || newTc !== oldTc || newHp !== oldHp) {
                // Don't update during cinematic, initiative animation, or overlay open
                if (_cinematicInProgress || _initAnimationInProgress || _overlayOpen || _actionSent) {
                    _pollInterval = setTimeout(poll, _getPollInterval());
                    return;
                }

                // Detect turn change for announcement banner
                const oldTurn = currentState?.to?.[0];
                const newTurn = state.to?.[0];
                const turnChanged = oldTurn && newTurn && (oldTurn.n !== newTurn.n || oldTurn.t !== newTurn.t);

                if (turnChanged) {
                    // Enemy/ally banner shows skill name from last roll
                    let actionDesc = '';
                    if ((newTurn.t === 'e' || newTurn.t === 'a') && state.lr) {
                        const sn = state.lr.sn;
                        if (sn) {
                            actionDesc = ` usa ${sn}!`;
                        } else {
                            actionDesc = state.lr.t === 'skill' || state.lr.t === 'save' ? ' conjura!' : ' ataca!';
                        }
                    }
                    const bannerText = newTurn.t === 'p' ? '⚔️ Seu Turno!' :
                        newTurn.t === 'e' ? `🎯 ${newTurn.n}${actionDesc}` :
                        `🛡️ ${newTurn.n}${actionDesc}`;
                    const bannerType = newTurn.t === 'p' ? 'player' : newTurn.t === 'e' ? 'enemy' : 'ally';
                    _showTurnBanner(bannerText, bannerType);
                }

                // Round transition announcement
                if (newRn > oldRn && newRn > 1) {
                    setTimeout(() => _showRoundBanner(newRn), turnChanged ? 1600 : 200);
                }

                // P0-B: Cinematic enemy dice — animate enemy rolls before state update
                const hasEnemyRoll = state.lr && (state.lr.r || state.lr.d) && newTurn && newTurn.t !== 'p';
                const rollSig = state.lr ? `${state.lr.t||'a'}-${state.lr.r||0}-${state.lr.d||0}-${state.lr.miss||0}-${state.lr.crit||0}-${state.lr.dc||0}-${state.lr.adv||0}-${state.lr.ac||0}` : '';
                if (hasEnemyRoll && rollSig !== _lastAnimatedRoll) {
                    _cinematicInProgress = true;
    _cinematicWarnTimer = setTimeout(() => {
        if (_cinematicInProgress) showCombatToast('Processando...');
    }, TIMING.CINEMATIC_WARN);
                    const _eLr = state.lr;
                    const _isAllyTurn = newTurn && newTurn.t === 'a';
                    // Track enemy damage type for player damage VFX
                    if (!_isAllyTurn && _eLr.dt) _lastEnemyDmgType = _eLr.dt;
                    initDice(_eLr);

                    if (_eLr.miss || _eLr.d <= 0) {
                        // Miss — dodge feedback on the TARGET (enemy dodges ally, player dodges enemy)
                        setTimeout(() => {
                            const dodgeTarget = _isAllyTurn
                                ? document.querySelector('.entity.enemy')
                                : document.querySelector('.entity.player');
                            if (dodgeTarget) {
                                dodgeTarget.classList.remove('dodge-flash');
                                void dodgeTarget.offsetWidth;
                                dodgeTarget.classList.add('dodge-flash');
                                setTimeout(() => dodgeTarget.classList.remove('dodge-flash'), 400);
                            }
                            _showMissFloat(_isAllyTurn ? '.entity.enemy' : '.entity.player');
                            if (window._combatVfx) {
                                const fromEl = _isAllyTurn
                                    ? (document.querySelector('.entity.ally') || document.querySelector('.entity.player'))
                                    : document.querySelector('.entity.enemy');
                                if (fromEl && dodgeTarget) window._combatVfx.miss(fromEl, dodgeTarget, _eLr.dt || 'slashing');
                            }
                            showNarration(_pick(_isAllyTurn ? _NARR_ALLY_MISS : _NARR_ENEMY_MISS).replace('{name}', newTurn.n), 'miss');
                            if (_isAllyTurn) hapticBurst('miss');
                        }, 1800);
                    } else {
                        // Hit — damage float on the TARGET (enemy takes ally damage, player takes enemy damage)
                        const dmgTarget = _isAllyTurn ? '.entity.enemy' : '.entity.player';
                        setTimeout(() => _showDamageFloat(_eLr.d, _eLr.dt, dmgTarget, !!_eLr.crit), 2700);

                        // VFX projectile for ally hits
                        if (_isAllyTurn && window._combatVfx) {
                            setTimeout(() => {
                                const allyEl = document.querySelector('.entity.ally') || document.querySelector('.entity.player');
                                const enemyEl = document.querySelector('.entity.enemy');
                                if (allyEl && enemyEl) window._combatVfx.projectile(allyEl, enemyEl, _eLr.dt || 'slashing', { crit: !!_eLr.crit });
                            }, 1600);
                        }
                        // VFX projectile for enemy hits
                        if (!_isAllyTurn && window._combatVfx) {
                            setTimeout(() => {
                                const enemyEl = document.querySelector('.entity.enemy');
                                const playerEl = document.querySelector('.entity.player');
                                if (enemyEl && playerEl) window._combatVfx.projectile(enemyEl, playerEl, _eLr.dt || 'slashing', { crit: !!_eLr.crit });
                            }, 1600);
                        }

                        // Narration after dice settles
                        setTimeout(() => {
                            if (_isAllyTurn && _eLr.crit) {
                                showNarration(_pick(_NARR_ALLY_CRIT).replace('{name}', newTurn.n), 'crit');
                                _shakeApp('heavy');
                                hapticBurst('crit');
                            } else if (_isAllyTurn) {
                                showNarration(_pick(_NARR_ALLY_HIT).replace('{name}', newTurn.n), '');
                                haptic('medium');
                            } else if (_eLr.crit) {
                                showNarration(_pick(_NARR_ENEMY_CRIT), 'crit');
                                _shakeApp('heavy');
                                haptic('heavy');
                                hapticNotify('error');
                            } else {
                                showNarration(_pick(_NARR_ENEMY_HIT), '');
                            }
                        }, 2200);
                    }

                    // 3D dice: 1200 + 1500 + 1200 + 200 = 4100ms for hits
                    const enemyDelay = (_eLr.miss || _eLr.d <= 0) ? 2400 : 4100;
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
                // Reset init animation state on phase transition
                if (oldPh === 'init' && newPh !== 'init') {
                    _initDiceAnimated = false;
                    _initAnimationInProgress = false;
                }
                currentState = state;
                if (newPh === 'victory' || newPh === 'defeat' || newPh === 'ended') {
                    renderResolution(state);
                } else {
                    renderArena(state);
                }
            }
        } catch (e) {
            if (e.status === 401 || e.status === 403 || (e.message && e.message.includes('401'))) {
                showError('Sessão expirada — feche e reabra o combate');
                stopPolling();
                return;
            }
            // Track consecutive failures — trigger health check after 3
            console.warn('[COMBAT] Poll error (silent)', e.message);
            _pollFailures++;
            if (_pollFailures >= 3) {
                console.warn('[COMBAT] 3+ consecutive poll failures — checking health');
                try {
                    const health = await api.checkHealth();
                    if (health.api && health.api !== api.base) {
                        console.log('[COMBAT] Tunnel URL changed, updating apiBase in memory');
                        api.base = health.api;
                        if (window.ApiDiscovery) ApiDiscovery.updateBase(health.api);
                        _pollFailures = 0; // reset — new URL may work
                    }
                    if (health.status === 'unreachable') {
                        showError('Servidor indisponível. Tente novamente.');
                    }
                } catch (he) {
                    console.warn('[COMBAT] Health check also failed', he.message);
                }
                _pollFailures = 0; // reset after health check attempt
            }
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
    if (_reactionAutoTimer) { clearTimeout(_reactionAutoTimer); _reactionAutoTimer = null; }
    if (_cinematicWarnTimer) { clearTimeout(_cinematicWarnTimer); _cinematicWarnTimer = null; }
    _initAnimationInProgress = false;
    _cinematicInProgress = false;
    // Cleanup global listeners to prevent memory leaks
    document.removeEventListener('visibilitychange', _onVisibilityChange);
}

// ─── TURN TIMELINE ───
function renderTurnTimeline(to) {
    if (!to || to.length === 0) return '';
    let html = '<div class="turn-timeline">';
    to.forEach((entry, i) => {
        const isFirst = i === 0;
        const tCls = entry.t === 'p' ? 't-player' : entry.t === 'a' ? 't-ally' : 't-enemy';
        const isDead = entry.hp !== undefined && entry.hp <= 0;
        const deadCls = isDead ? ' dead' : '';
        if (i > 0) html += '<div class="turn-arrow">·</div>';
        const ico = entry.ico || (entry.t === 'p' ? '⚔️' : entry.t === 'a' ? '🛡️' : '👹');
        // Legendary actions: show star entries when boss has legendary_actions
        if (entry.t !== 'e' && i < to.length - 1) {
            const nextE = to[i + 1];
            const _legCount = nextE ? (parseInt(nextE.leg) || 0) : 0;
            if (_legCount > 0) {
                for (let li = 0; li < Math.min(_legCount, 5); li++) {
                    html += '<div class="turn-arrow">\u00b7</div>';
                    html += '<div class="turn-entry t-legendary"><span class="turn-ico">\u2B50</span></div>';
                }
            }
        }
        html += `<div class="turn-entry ${isFirst ? 'active' : ''} ${tCls}${deadCls}">
            <span class="turn-ico">${ico}</span>
        </div>`;
    });
    html += '</div>';
    return html;
}

// ─── AUTO-SCROLL TIMELINE TO ACTIVE ENTRY ───
function _scrollTimelineToActive() {
    const timeline = document.querySelector('.turn-timeline');
    const active = timeline && timeline.querySelector('.turn-entry.active');
    if (active && timeline) {
        const tl = timeline.getBoundingClientRect();
        const ac = active.getBoundingClientRect();
        const offset = ac.left - tl.left - (tl.width / 2) + (ac.width / 2);
        timeline.scrollBy({ left: offset, behavior: 'smooth' });
    }
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
    _initAnimationInProgress = true;
    if (typeof DiceRoller !== 'undefined') {
        DiceRoller.rollSequence(items, {
            container: area,
            title: '\u{1F4DC} ORDEM DE COMBATE',
            onComplete: () => {
                _initAnimationInProgress = false;
                _appendSurpriseInfo(area, init);
                _showProceedBar();
            },
        });

        // Skip button — validates DOM is still intact before appending
        setTimeout(() => {
            const bar = document.getElementById('init-proceed-bar');
            const currentArea = document.getElementById('init-dice-area');
            if (bar && bar.style.display === 'none' && currentArea) {
                const skipBtn = document.createElement('button');
                skipBtn.className = 'v-skip-btn visible';
                skipBtn.textContent = 'Pular \u{25B8}';
                skipBtn.style.cssText = 'position:relative; z-index:10; margin:8px auto;display:block;padding:6px 16px;font-size:12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#aaa;cursor:pointer; clear:both;';
                skipBtn.onclick = () => {
                    _initAnimationInProgress = false;
                    _showInitiativeStatic(currentArea, items, init);
                    _showProceedBar();
                    skipBtn.remove();
                };
                currentArea.appendChild(skipBtn);
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

// ─── DAMAGE-TYPE FLASH CLASS HELPER ───
const _DMG_FLASH_TYPES = new Set(['fire','cold','lightning','necrotic','radiant','poison','acid','psychic','thunder']);

// ─── UTILS ───
// ─── ERROR DISPLAY ───
// showError provided by shared/error-reporter.js — keep combat-specific cleanup
const _origShowError = window.showError;
window.showError = function (msg, err) {
    _actionSent = false;
    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('disabled'));
    if (_origShowError) _origShowError(msg, err);
};


// ═══════════════════════════════════════════════════
// ─── IMMERSION FEATURES ───
// ═══════════════════════════════════════════════════


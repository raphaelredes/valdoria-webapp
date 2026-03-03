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
const isApiMode = !!apiBase;
let currentState = null;

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
    async getState() {
        const r = await fetch(`${this.base}/api/combat/state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
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
    async sendAction(data) {
        const r = await fetch(`${this.base}/api/combat/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
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

// ─── STARTUP ───
if (isApiMode) {
    loadCombatState();
} else if (rawData) {
    try {
        const state = JSON.parse(b64Decode(rawData));
        currentState = state;
        renderArena(state);
    } catch(e) {
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
    } catch(e) {
        console.error('[COMBAT]', 'Erro ao carregar', e);
        document.getElementById('app').innerHTML = '<div class="no-data"><h2>Erro de Conexão</h2><p>Não foi possível carregar o combate.</p></div>';
    }
}

function showCombatEnded() {
    stopAllIntervals();
    document.getElementById('app').innerHTML = '<div class="no-data"><h2>Combate Encerrado</h2><p>Este combate já foi finalizado.</p></div>';
    setTimeout(() => { try { if (tg) tg.close(); } catch(e) { console.warn('[ARENA] tg.close() failed', e); } }, 2000);
}

function closeCombat(result) {
    stopAllIntervals();
    if (tg) {
        tg.sendData(JSON.stringify({ action: 'combat_close', token: token, result: result }));
        setTimeout(() => { try { tg.close(); } catch(e) { console.warn('[ARENA] tg.close() failed', e); } }, 300);
    }
}

function renderResolution(state) {
    stopAllIntervals();
    const isVictory = state.phase === 'victory';
    const app = document.getElementById('app');
    app.innerHTML = `<div class="no-data" style="padding:20px">
        <h2 style="font-size:24px;margin-bottom:16px">${isVictory ? '🏆 VITÓRIA!' : '💀 DERROTA'}</h2>
        <p style="color:var(--v-text);font-size:13px;margin-bottom:20px;white-space:pre-line">${escHtml(state.result_text || state.action_result_text || '')}</p>
        <button class="action-btn primary" style="padding:14px 24px;font-size:14px;width:100%;max-width:280px" onclick="closeCombat('${state.phase}')">
            ${isVictory ? '🏕️ Continuar' : '💫 Continuar'}
        </button>
    </div>`;
}

// ─── CONSTANTS ───
const BIOME_NAMES = {
    forest:'Floresta', cave:'Caverna', graveyard:'Cemiterio', swamp:'Pantano',
    volcanic:'Vulcanico', snow:'Neve', desert:'Deserto', mountain:'Montanha',
    plains:'Planicie', dungeon:'Masmorra', city:'Cidade', ruins:'Ruinas',
};

const STATUS_ICONS = {
    poisoned:'🧪', blinded:'🌑', paralyzed:'⚡', prone:'🦶', restrained:'🕸️',
    frightened:'😱', stunned:'💫', grappled:'👐', petrified:'🪨', exhausted:'😫',
    marked:'🎯', blessed:'✨', hexed:'👁️', burning:'🔥', frozen:'❄️',
    sleeping:'💤', charmed:'💖', deafened:'🔇', incapacitated:'🚫',
    invisible:'👻', surprised:'❗', exposed:'🎯', inspired:'🎵',
    concentrated:'🔮', raging:'💢', wild_shaped:'🐾',
};

const DMG_ICONS = {
    slashing:'🗡️', piercing:'🏹', bludgeoning:'🔨', fire:'🔥', cold:'❄️',
    lightning:'⚡', necrotic:'💀', radiant:'✨', psychic:'🧠', thunder:'💥',
    poison:'🧪', acid:'🟢', force:'💠',
};

const ATK_TYPE_LABELS = { melee:'Corpo a corpo', ranged:'A distancia', magic:'Magico' };

const RES_CLASS_MAP = {
    'Mana':'mp', 'Ki':'ki', 'Fúria':'fury', 'Vigor':'vigor',
    'Inspiração':'inspiration', 'Pacto':'pact', 'Energia':'energy',
};

const RES_ICON_MAP = {
    'Mana':'💧', 'Ki':'⚡', 'Fúria':'💢', 'Vigor':'💪',
    'Inspiração':'🎵', 'Pacto':'👁️', 'Energia':'⚡',
};

// ─── MAIN RENDER ───
function renderArena(s) {
    const app = document.getElementById('app');
    // Clear previous biome classes before applying new one
    document.body.className = document.body.className.replace(/\bbiome-\S+/g, '').trim();
    document.body.classList.add('biome-' + (s.bio || 'forest'));

    const biomeName = BIOME_NAMES[s.bio] || s.bio || 'Desconhecido';
    const weatherStr = s.w ? `${s.w.ico} ${s.w.l}` : '☀️ Limpo';

    // Determine active turn entity
    const activeTurn = s.to && s.to[0] ? s.to[0] : null;

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

    // Enemy Zone (compact rows, expandable)
    html += '<div class="zone"><div class="zone-label">Inimigos</div>';
    if (s.e && s.e.length > 0) {
        s.e.forEach((e, i) => {
            const isActive = activeTurn && activeTurn.t === 'e' && activeTurn.n === e.n;
            html += renderEntity(e, 'enemy', i, isActive);
        });
    }
    html += '</div>';

    // Player Zone (always shows HP + resource bars)
    html += '<div class="zone"><div class="zone-label">Seu Personagem</div>';
    html += renderPlayerCard(s.p);
    html += '</div>';

    // Allies Zone (compact rows, expandable)
    if (s.a && s.a.length > 0) {
        html += '<div class="zone"><div class="zone-label">Aliados</div>';
        s.a.forEach((a, i) => {
            const isActive = activeTurn && activeTurn.t === 'a' && activeTurn.n === a.n;
            html += renderEntity(a, 'ally', i, isActive);
        });
        html += '</div>';
    }

    // Battlefield (flexible — takes remaining space)
    html += '<div class="battlefield">';
    html += '<div class="bf-label">Campo de Batalha</div>';
    html += renderTurnTimeline(s.to);
    html += `<div class="dice-row">
        <div class="dice-box-compact"><div class="dice-emoji" id="dice1">🎲</div><div><div class="dice-result" id="diceResult1"></div><div class="dice-label" id="diceLabel1">d20</div></div></div>
        <div class="dice-box-compact"><div class="dice-emoji" id="dice2">🎲</div><div><div class="dice-result" id="diceResult2"></div><div class="dice-label" id="diceLabel2">dano</div></div></div>
    </div>`;
    if (s.feed && s.feed.length > 0) {
        const recentFeed = s.feed.slice(-3);
        html += '<div class="combat-feed">';
        recentFeed.forEach(f => { html += `<div class="feed-entry">${escHtml(f)}</div>`; });
        html += '</div>';
    }
    html += '</div>';

    // Action Bar — phase-dependent (with D&D 5e sub-phase support)
    const ph = s.ph || s.phase || 'intro';
    const subPh = s.sub_phase || '';
    if (ph === 'active' && subPh === 'bonus_action') {
        html += renderTimerBar(s);
        html += renderBonusActionBar(s.acts, s.e, s.p);
    } else if (ph === 'active' && subPh === 'reaction') {
        html += renderTimerBar(s);
        html += renderReactionBar(s.acts, s.p);
    } else if (ph === 'active') {
        html += renderTimerBar(s);
        html += renderActionBar(s.acts, s.e, s.p);
    } else if (ph === 'intro' && isApiMode) {
        // API mode: interactive initiative button
        html += `<div class="action-bar"><button class="action-btn primary full-width" data-action="initiative" style="font-size:14px;padding:12px">⚔️ ROLAR INICIATIVA</button></div>`;
    } else if (ph === 'init') {
        // Initiative rolled — show results + proceed button
        html += renderInitiativeResults(s);
        if (isApiMode) {
            html += `<div class="action-bar"><button class="action-btn primary full-width" data-action="proceed" style="font-size:14px;padding:12px">⚔️ Prosseguir para o Combate</button></div>`;
        } else {
            html += `<div class="action-bar"><div style="text-align:center;color:var(--v-text-dim);font-size:12px;padding:8px">⚔️ Aguardando inicio do combate...</div></div>`;
        }
    } else {
        // Legacy intro or unknown phase
        html += `<div class="action-bar"><div style="text-align:center;color:var(--v-text-dim);font-size:12px;padding:8px">🎲 Role iniciativa no Telegram</div></div>`;
    }

    app.innerHTML = html;

    // Init dice animation
    initDice(s.lr);

    // Bind action button events
    bindActions(s);

    // Bind expand/collapse on entity cards
    bindExpandCollapse();

    // Auto-expand active turn entity (if not player)
    if (activeTurn && activeTurn.t !== 'p') {
        const activeEl = document.querySelector('.entity.active-turn');
        if (activeEl) activeEl.classList.add('expanded');
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
            text.textContent = '⏳';
            bar.classList.add('critical');
            stopTimer();
            return;
        }

        const pct = Math.max(0, (_timerRemaining / _timerMax) * 100);
        bar.style.width = pct + '%';
        text.textContent = Math.ceil(_timerRemaining) + 's';

        if (_timerRemaining <= 5) {
            bar.classList.add('critical');
        }
    }, 1000);
}

function stopTimer() {
    if (_timerInterval) {
        clearInterval(_timerInterval);
        _timerInterval = null;
    }
}

// ─── STATE POLLING ───
function startPolling() {
    stopPolling();
    if (!isApiMode || !api) return;

    _pollInterval = setInterval(async () => {
        try {
            const state = await api.getState();
            if (!state || state.error) {
                if (state && (state.error === 'no_combat' || state.phase === 'ended')) {
                    showCombatEnded();
                }
                return;
            }

            // Compare: re-render only if state actually changed
            const newPh = state.ph || state.phase || '';
            const oldPh = currentState ? (currentState.ph || currentState.phase || '') : '';
            const newRn = state.rn || 0;
            const oldRn = currentState ? (currentState.rn || 0) : 0;
            const newTc = state.tc || 0;
            const oldTc = currentState ? (currentState.tc || 0) : 0;

            if (newPh !== oldPh || newRn !== oldRn || newTc !== oldTc) {
                currentState = state;
                if (newPh === 'victory' || newPh === 'defeat' || newPh === 'ended') {
                    renderResolution(state);
                } else {
                    renderArena(state);
                }
            }
        } catch(e) {
            // Silently ignore poll errors — don't spam user with toasts
            console.warn('[ARENA] Poll error (silent)', e.message);
        }
    }, 5000);
}

function stopPolling() {
    if (_pollInterval) {
        clearInterval(_pollInterval);
        _pollInterval = null;
    }
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
        } catch(e) {
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
            <div class="bar-track"><div class="bar-fill ${hpClass}" style="width:${pct*100}%"></div></div>
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
            detailsHtml += '<div class="status-pills">' + e.se.map(s => `<span class="status-pill">${STATUS_ICONS[s]||''} ${s}</span>`).join('') + '</div>';
        }
    } else {
        // Ally expanded
        detailsHtml += `<div class="bar-container">
            <div class="bar-label"><span>❤️ HP</span><span>${e.hp}/${e.mhp}</span></div>
            <div class="bar-track"><div class="bar-fill ${hpClass}" style="width:${pct*100}%"></div></div>
        </div>`;
        if (e.ac) {
            detailsHtml += `<div class="stats-row"><span class="stat-item">🛡️ CA ${e.ac}</span></div>`;
        }
        if (e.se && e.se.length > 0) {
            detailsHtml += '<div class="status-pills">' + e.se.map(s => `<span class="status-pill">${STATUS_ICONS[s]||''} ${s}</span>`).join('') + '</div>';
        }
    }

    const activeClass = isActiveTurn ? ' active-turn' : '';
    const dataAttr = type === 'enemy' ? ` data-enemy-idx="${idx}"` : '';

    return `<div class="entity ${type}${activeClass}"${dataAttr}>
        <div class="entity-header">
            <span class="entity-icon">${e.ico || (type === 'enemy' ? '👹' : '🛡️')}</span>
            <span class="compact-name">${escHtml(e.n)}</span>
            <div class="hp-mini"><div class="hp-mini-fill ${hpClass}" style="width:${pct*100}%"></div></div>
            <span class="hp-text-compact">${e.hp}/${e.mhp}</span>
            ${statusIcons ? `<span class="status-icons-compact">${statusIcons}</span>` : ''}
            <span class="expand-arrow">▸</span>
        </div>
        <div class="entity-details">${detailsHtml}</div>
    </div>`;
}

// ─── PLAYER CARD (always shows HP + resource bars) ───
function renderPlayerCard(p) {
    const hpPct = p.mhp > 0 ? (p.hp / p.mhp) : 0;
    const hpClass = hpPct > 0.75 ? 'hp-high' : hpPct > 0.40 ? 'hp-mid' : 'hp-low';
    const mpPct = p.mmp > 0 ? (p.mp / p.mmp) : 0;
    const resClass = RES_CLASS_MAP[p.res] || 'mp';
    const resIcon = RES_ICON_MAP[p.res] || '💧';

    // Compact badges for status, cover, concentration
    const badges = [];
    if (p.se && p.se.length > 0) {
        p.se.forEach(s => badges.push(`<span class="mini-badge status">${STATUS_ICONS[s]||''} ${s}</span>`));
    }
    if (p.cov) {
        badges.push(`<span class="mini-badge cover">${p.cov.ico} +${p.cov.ac} CA</span>`);
    }
    if (p.conc) {
        badges.push(`<span class="mini-badge conc">🔮 ${escHtml(p.conc)}</span>`);
    }
    const badgesHtml = badges.length > 0 ? `<div class="player-badge-row">${badges.join('')}</div>` : '';

    return `<div class="entity player">
        <div class="entity-header">
            <span class="entity-icon">${p.ico||'👤'}</span>
            <span class="compact-name">${escHtml(p.n)}</span>
            <span class="hp-text-compact" style="color:var(--v-gold-dim);font-size:10px">${escHtml(p.c)} Lv.${p.l}</span>
        </div>
        <div class="player-bars">
            <div class="bar-row">
                <span class="bar-icon">❤️</span>
                <div class="bar-track"><div class="bar-fill ${hpClass}" style="width:${hpPct*100}%"></div></div>
                <span class="bar-val">${p.hp}/${p.mhp}</span>
            </div>
            <div class="bar-row">
                <span class="bar-icon">${resIcon}</span>
                <div class="bar-track"><div class="bar-fill ${resClass}" style="width:${mpPct*100}%"></div></div>
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
        html += `<div class="turn-entry ${isFirst?'active':''} ${tCls}">
            <span class="turn-val">${entry.v}</span>
            <span class="turn-name">${escHtml(entry.n)}</span>
        </div>`;
    });
    html += '</div>';
    return html;
}

// ─── INITIATIVE RESULTS (shown in 'init' phase) ───
function renderInitiativeResults(s) {
    if (!s.to || s.to.length === 0) return '';
    const init = s.initiative || {};
    let html = '<div style="padding:4px 10px;font-size:11px;color:var(--v-text-dim)">';
    html += '<div style="font-weight:700;color:var(--v-gold);font-size:12px;margin-bottom:4px">📜 ORDEM DE COMBATE</div>';
    s.to.forEach((entry, i) => {
        const tColor = entry.t === 'p' ? 'var(--v-gold)' : entry.t === 'a' ? 'var(--v-silver)' : 'var(--v-crimson)';
        const icon = entry.ico || (entry.t === 'p' ? '👤' : entry.t === 'a' ? '🛡️' : '👹');
        const formula = entry.f ? ` (${entry.f})` : '';
        html += `<div style="padding:2px 0;color:${tColor}">
            ${i+1}. ${icon} <b>${escHtml(entry.n)}</b>: ${entry.v}${formula}
        </div>`;
    });
    if (init.player_surprised) html += '<div style="color:var(--v-crimson);margin-top:4px">❗ Você foi pego desprevenido!</div>';
    if (init.enemies_surprised) html += '<div style="color:var(--v-gold);margin-top:4px">✨ Inimigos surpreendidos!</div>';
    html += '</div>';
    return html;
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
        <button class="action-btn ${hasSkills?'':'disabled'}" data-action="skill">${skillBtnText}</button>
        <button class="action-btn ${itemCount>0?'':'disabled'}" data-action="items">🎒 Itens <span class="action-chance">(${itemCount})</span></button>
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
            skillsHtml = `<button class="action-btn ba-btn" data-action="bonus_use_single" data-skill-id="${sk.id}" data-tg="${sk.tg||'single'}">⚡ ${escHtml(sk.n)} <span class="action-chance">${sk.c} ${resName} · ${sk.ch}%</span></button>`;
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

// ─── BIND ACTIONS ───
function bindActions(state) {
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
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

// ─── LOADING INDICATOR ───
function _showActionLoading(show) {
    let el = document.getElementById('actionLoading');
    if (show) {
        if (!el) {
            el = document.createElement('div');
            el.id = 'actionLoading';
            el.className = 'action-loading';
            el.innerHTML = '<div class="loading-spinner"></div><span>Enviando...</span>';
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
    if (_actionSent) return;
    _actionSent = true;
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
            if (result.phase === 'victory' || result.phase === 'defeat' || result.phase === 'ended') {
                renderResolution(result);
                return;
            }
            currentState = result;
            renderArena(result);
        } catch(e) {
            _showActionLoading(false);
            _actionSent = false;
            console.error('[ARENA] API sendAction error', e);
            const msg = e.status === 401 ? 'Sessão expirada.' : 'Erro de conexão. Tente novamente.';
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
        setTimeout(() => { try { tg.close(); } catch(e) { console.warn('[ARENA] tg.close() failed', e); } }, 300);
    }
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
        html += `<div class="skill-item" data-skill-id="${sk.id}" data-tg="${sk.tg||'single'}">
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
        const pct = e.mhp > 0 ? Math.round((e.hp/e.mhp)*100) : 0;
        html += `<div class="target-item" data-target="${i}">
            <div><span>${e.ico||'👹'}</span> <b>${escHtml(e.n)}</b></div>
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
        const effText = isThrown ? `${it.tdmg} ${it.ttype||''}` : (it.heal ? `Cura ${it.heal}` : '');
        const typeBadge = isThrown ? '<span class="sk-aoe">Arremesso</span>' : '<span class="sk-type">Cura</span>';
        html += `<div class="skill-item item-entry" data-item="${escHtml(it.n)}" data-thrown="${isThrown}">
            <div>
                <div class="skill-name">${it.ico} ${escHtml(it.n)} <span class="action-chance">x${it.q}</span></div>
                <div class="skill-meta">${effText} · ${typeBadge}</div>
            </div>
        </div>`;
    });
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
    document.getElementById('itemClose').addEventListener('click', () => {
        overlay.classList.remove('active');
    });
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    };
}

// ─── DICE ANIMATION ───
function initDice(lastRoll) {
    const d1 = document.getElementById('dice1');
    const d2 = document.getElementById('dice2');
    if (!d1 || !d2) return;

    if (lastRoll && lastRoll.r) {
        d1.style.animation = 'none';
        void d1.offsetHeight;
        d1.classList.add('rolling');
        setTimeout(() => {
            d1.classList.remove('rolling');
            d1.textContent = lastRoll.r === 20 ? '🌟' : lastRoll.r === 1 ? '💀' : '🎲';
            const r1 = document.getElementById('diceResult1');
            const l1 = document.getElementById('diceLabel1');
            r1.textContent = lastRoll.r;
            if (lastRoll.r === 20) {
                r1.classList.add('crit');
                l1.textContent = 'CRÍTICO!';
                l1.classList.add('crit');
            } else if (lastRoll.r === 1) {
                r1.classList.add('miss');
                l1.textContent = 'FALHA!';
                l1.classList.add('miss');
            } else {
                l1.textContent = lastRoll.t === 'skill' ? 'habilidade' : 'ataque';
                l1.classList.add('hit');
            }
        }, 700);

        if (lastRoll.d) {
            d2.style.animation = 'none';
            void d2.offsetHeight;
            setTimeout(() => {
                d2.classList.add('rolling');
                setTimeout(() => {
                    d2.classList.remove('rolling');
                    d2.textContent = lastRoll.d > 0 ? '⚔️' : '🛡️';
                    document.getElementById('diceResult2').textContent = lastRoll.d;
                    document.getElementById('diceLabel2').textContent = 'dano';
                }, 700);
            }, 300);
        }
    }
}

// ─── UTILS ───
// ─── ERROR DISPLAY ───
function showError(msg, err = null) {
    console.error('[ARENA]', msg, err || '');
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
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

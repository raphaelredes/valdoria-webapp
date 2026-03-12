/* ═══════════════════════════════════════════════════════════════
   GAME HUB — UI Components
   Toast, loading, error, timer overlays, screen transitions.
   ═══════════════════════════════════════════════════════════════ */

// ─── Loading (with cycling tips, ring acceleration, gem phases, cinematic exit) ───
const _LOADING_TIPS = [
    // Narrativas imersivas — cidade
    'As muralhas de pedra se erguem enquanto os portões rangem ao abrir...',
    'O som de bigornas e o aroma de pão fresco preenchem as ruas empedradas...',
    'Guardas patrulham as ameias enquanto comerciantes montam suas barracas...',
    'O vento traz murmúrios da taverna e risos de crianças brincando na praça...',
    'Tochas acesas iluminam os brasões entalhados nos portais da cidade...',
    'O sino do templo ecoa pela manhã, despertando a cidade de seu sono...',
    'Mercadores ajustam suas bancas, exibindo relíquias de terras distantes...',
    'O cheiro de cerveja e carne assada escapa pelas portas da estalagem...',
    // Dicas D&D intercaladas
    '⚔️ Dica: Rolagens de ataque 20 são acertos críticos — dano dobrado!',
    '🛡️ Dica: Descansar na estalagem recupera todos os dados de vida.',
    '💰 Dica: Venda itens que não usa no mercado da cidade.',
    '📜 Dica: Converse com NPCs para descobrir quests escondidas.',
    '🏰 Dica: A Guilda de Aventureiros oferece missões com boas recompensas.',
    '🧪 Dica: Poções podem ser usadas durante o combate como ação bônus.',
    '⭐ Dica: Suba de nível para desbloquear novas habilidades de classe.',
    '🐉 Dica: Inimigos mais fortes concedem mais XP e ouro.',
];
let _loadingTipTimer = null;
let _loadingTipIndex = 0;
let _loadingProgressTimer = null;
let _loadingProgress = 0;
let _loadingStartTime = 0;

let _isRetryLoading = false;
let _loadingSlowTimer = null;

function showLoading(isRetry = false) {
    const el = document.getElementById('loading');
    if (el) {
        el.style.display = '';
        el.classList.remove('exit-cinematic', 'hidden');
        el.style.opacity = '';
        el.style.transition = '';
        el.removeAttribute('data-phase');
    }
    // Reset ring speeds to canonical values
    const circle = el ? el.querySelector('.magic-circle') : null;
    if (circle) {
        circle.style.removeProperty('--ring-outer');
        circle.style.removeProperty('--ring-mid');
        circle.style.removeProperty('--ring-inner');
    }
    _isRetryLoading = isRetry;
    _loadingStartTime = Date.now();
    _startLoadingProgress();
    _startLoadingTimeout();
    _startSlowWarning();

    if (isRetry) {
        _stopLoadingTips();
        const tipEl = document.getElementById('loading-tip');
        if (tipEl) tipEl.textContent = '🔄 Reconectando ao servidor...';
    } else {
        _startLoadingTips();
    }
}

function hideLoading() {
    const el = document.getElementById('loading');
    if (!el || el.style.display === 'none') return;

    // Fill progress to 100%
    const bar = document.getElementById('loading-progress');
    if (bar) bar.style.width = '100%';
    _loadingProgress = 100;
    _updateLoadingPhase(100);

    _stopLoadingProgress();
    _stopLoadingTimeout();
    _stopSlowWarning();
    _isRetryLoading = false;

    // Trigger completion pulse + haptic
    _triggerCompletionPulse(el);

    // Exit animation: lite mode = fast fade (400ms), normal = cinematic (950ms)
    const isLite = el.classList.contains('loading-lite');
    const exitMs = isLite ? 400 : 950;
    setTimeout(() => {
        el.classList.add('exit-cinematic');
        _stopLoadingTips();
        setTimeout(() => {
            el.style.display = 'none';
            el.classList.remove('exit-cinematic');
            el.style.opacity = '';
            el.style.transition = '';
            // Reset ring speeds
            const circle = el.querySelector('.magic-circle');
            if (circle) {
                circle.style.removeProperty('--ring-outer');
                circle.style.removeProperty('--ring-mid');
                circle.style.removeProperty('--ring-inner');
            }
            el.removeAttribute('data-phase');
        }, exitMs);
    }, isLite ? 50 : 150);

    // Safety net: force-hide after exit + buffer
    setTimeout(() => {
        if (el.style.display !== 'none') {
            console.warn('[GAME] Loading force-hidden after safety net');
            el.style.display = 'none';
            el.classList.remove('exit-cinematic');
            el.removeAttribute('data-phase');
        }
    }, exitMs + 500);
}

// ── Minimum loading delay (narrative immersion) ──
async function hideLoadingWithDelay() {
    const elapsed = Date.now() - _loadingStartTime;
    const remaining = MIN_LOADING_MS - elapsed;
    if (remaining > 0) await sleep(remaining);
    hideLoading();
}

// ── Ring acceleration: lerp speed based on progress ──
// At 0%: canonical (60s/35s/45s). At 100%: 2.5x faster (24s/14s/18s).
// Guard enforces min: outer≥25s, mid≥15s, inner≥20s
function _updateRingSpeed(pct) {
    const el = document.getElementById('loading');
    const circle = el ? el.querySelector('.magic-circle') : null;
    if (!circle) return;
    const factor = 1 - (pct / 100) * 0.6; // 1.0 → 0.4 (gentler than explore's 0.25)
    circle.style.setProperty('--ring-outer', (60 * factor) + 's');
    circle.style.setProperty('--ring-mid', (35 * factor) + 's');
    circle.style.setProperty('--ring-inner', (45 * factor) + 's');
}

// ── Gem phase: 0 (ruby) → 1 (amber at 50%) → 2 (bright gold at 90%) ──
function _updateLoadingPhase(pct) {
    const el = document.getElementById('loading');
    if (!el) return;
    if (pct >= 90) el.setAttribute('data-phase', '2');
    else if (pct >= 50) el.setAttribute('data-phase', '1');
    else el.removeAttribute('data-phase');
    _updateRingSpeed(pct);
}

// ── Completion pulse at 100% + haptic ──
function _triggerCompletionPulse(overlay) {
    if (!overlay) return;
    const waves = overlay.querySelectorAll('.mc-completion-wave');
    waves.forEach(w => w.classList.add('active'));
    try {
        if (window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
            Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
        }
    } catch (_) { /* older clients */ }
}

function _startLoadingProgress() {
    _stopLoadingProgress();
    _loadingProgress = 0;
    const bar = document.getElementById('loading-progress');
    if (bar) bar.style.width = '0%';
    _loadingProgressTimer = setInterval(() => {
        const remaining = 90 - _loadingProgress;
        _loadingProgress += remaining * 0.06;
        if (bar) bar.style.width = _loadingProgress + '%';
        _updateLoadingPhase(_loadingProgress);
    }, 200);
}

function _stopLoadingProgress() {
    if (_loadingProgressTimer) {
        clearInterval(_loadingProgressTimer);
        _loadingProgressTimer = null;
    }
}

function _startLoadingTips() {
    _stopLoadingTips();
    // Start at random index so tip varies each load
    _loadingTipIndex = Math.floor(Math.random() * _LOADING_TIPS.length);
    const tipEl = document.getElementById('loading-tip');
    if (tipEl) tipEl.textContent = _LOADING_TIPS[_loadingTipIndex];
    _loadingTipTimer = setInterval(() => {
        _loadingTipIndex = (_loadingTipIndex + 1) % _LOADING_TIPS.length;
        const tipEl = document.getElementById('loading-tip');
        if (tipEl) {
            // Crossfade transition (matching explore loading)
            tipEl.classList.add('tip-exit');
            setTimeout(() => {
                tipEl.textContent = _LOADING_TIPS[_loadingTipIndex];
                tipEl.classList.remove('tip-exit');
                tipEl.classList.add('tip-enter');
                setTimeout(() => tipEl.classList.remove('tip-enter'), 350);
            }, 300);
        }
    }, 4500);
}

function _stopLoadingTips() {
    if (_loadingTipTimer) {
        clearInterval(_loadingTipTimer);
        _loadingTipTimer = null;
    }
}

// ── Gem tap burst interaction ──
(function _initGemTap() {
    function setup() {
        const gemEl = document.getElementById('mc-gem');
        if (!gemEl) return;
        let cooldown = false;
        gemEl.addEventListener('click', () => {
            if (cooldown) return;
            cooldown = true;
            gemEl.classList.add('tapped');
            const burst = document.createElement('div');
            burst.className = 'mc-gem-burst';
            gemEl.appendChild(burst);
            try {
                if (window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
                    Telegram.WebApp.HapticFeedback.impactOccurred('light');
                }
            } catch (_) { /* */ }
            setTimeout(() => {
                gemEl.classList.remove('tapped');
                if (burst.parentNode) burst.parentNode.removeChild(burst);
                cooldown = false;
            }, 600);
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }
})();

// ─── Loading Timeout (prevents infinite loading screen) ───
function _startLoadingTimeout() {
    _stopLoadingTimeout();
    if (typeof LOADING_TIMEOUT_MS === 'undefined') return;
    _loadingTimeoutId = setTimeout(() => {
        const el = document.getElementById('loading');
        if (el && el.style.display !== 'none') {
            console.error('[GAME] Loading timeout — server did not respond in time');
            hideLoading();
            showError('O servidor demorou demais para responder. Tente novamente.');
        }
    }, LOADING_TIMEOUT_MS);
}

function _stopLoadingTimeout() {
    if (typeof _loadingTimeoutId !== 'undefined' && _loadingTimeoutId) {
        clearTimeout(_loadingTimeoutId);
        _loadingTimeoutId = null;
    }
}

// ─── Loading Slow Warning (visual cue after 10s) ───
function _startSlowWarning() {
    _stopSlowWarning();
    _loadingSlowTimer = setTimeout(() => {
        const el = document.getElementById('loading');
        if (el && el.style.display !== 'none') {
            const tipEl = document.getElementById('loading-tip');
            if (tipEl) {
                tipEl.style.opacity = '0';
                setTimeout(() => {
                    tipEl.textContent = _isRetryLoading
                        ? '⏳ Servidor demorando para responder...'
                        : '⏳ Carregamento demorando mais que o normal...';
                    tipEl.style.opacity = '';
                    tipEl.classList.add('loading-tip-slow');
                }, 300);
            }
        }
    }, 10000);
}

function _stopSlowWarning() {
    if (_loadingSlowTimer) {
        clearTimeout(_loadingSlowTimer);
        _loadingSlowTimer = null;
    }
    const tipEl = document.getElementById('loading-tip');
    if (tipEl) tipEl.classList.remove('loading-tip-slow');
}

// ─── Toast Notification ───
let _toastTimeout = null;

function showToast(text, duration) {
    const el = document.getElementById('toast');
    if (!el) return;

    if (_toastTimeout) clearTimeout(_toastTimeout);

    // Calculate reading time if no explicit duration provided
    if (duration === undefined || duration === null) {
        duration = (typeof calcReadTime === 'function')
            ? calcReadTime(text, 'toast')
            : Math.max(1500, Math.min(4000, (text || '').split(/\s+/).length * 250));
    }

    el.textContent = text;
    el.classList.remove('hiding');
    el.style.display = '';

    _toastTimeout = setTimeout(() => {
        el.classList.add('hiding');
        setTimeout(() => { el.style.display = 'none'; el.classList.remove('hiding'); }, 300);
    }, duration);
}

// ─── Error Overlay — provided by shared/error-reporter.js ───
// showError(), hideError(), showToast() are injected by ValdoriaErrors.init()

// ─── Screen Transition Animation ───
// direction: 'forward' (slide right→left), 'back' (slide left→right)
function animateScreenTransition(renderFn, direction) {
    const screenEl = document.getElementById('screen');
    const panelEl = document.getElementById('bottom-panel');
    if (!screenEl) { renderFn(); return; }

    const isBack = direction === 'back';
    const outClass = isBack ? 'slide-back-out' : 'fade-out';
    const inClass  = isBack ? 'slide-back-in'  : 'fade-in';

    // Content fades/slides out
    screenEl.classList.add(outClass);
    // Bottom panel dims subtly (stays present, acknowledges change)
    if (panelEl) {
        panelEl.style.opacity = '0.7';
        panelEl.style.transition = 'opacity 0.2s ease';
    }

    setTimeout(() => {
        renderFn();
        screenEl.classList.remove(outClass);
        screenEl.classList.add(inClass);
        if (panelEl) {
            panelEl.style.opacity = '1';
            panelEl.style.transition = 'opacity 0.25s ease';
        }
        setTimeout(() => {
            screenEl.classList.remove(inClass);
            if (panelEl) panelEl.style.transition = '';
        }, 300);
    }, 250);
}

// ─── Timer Overlay ───
let _timerInterval = null;
let _timerDone = false;

function showTimerOverlay(timer) {
    if (!timer) return;

    const overlay = document.getElementById('timer-overlay');
    const secondsEl = document.getElementById('timer-seconds');
    const labelEl = document.getElementById('timer-label');
    const arcEl = document.getElementById('timer-arc');
    const skipBtn = document.getElementById('timer-skip');

    if (!overlay) return;

    _timerDone = false;
    let remaining = timer.seconds;
    const total = timer.seconds;
    const circumference = 2 * Math.PI * 36; // r=36

    secondsEl.textContent = remaining;
    labelEl.textContent = timer.type === 'reaction' ? 'Reação!' : 'Decidir!';
    arcEl.style.strokeDashoffset = '0';
    overlay.style.display = '';
    skipBtn.style.display = 'none';
    skipBtn.classList.remove('visible');

    const finishTimer = () => {
        if (_timerDone) return;
        _timerDone = true;
        clearInterval(_timerInterval);
        overlay.style.display = 'none';
        skipBtn.onclick = null;
        skipBtn.classList.remove('visible');
        // Auto-submit timeout action
        if (timer.timeout_cb) {
            doAction(timer.timeout_cb);
        }
    };

    // Show skip button after 500ms (mandatory rule)
    setTimeout(() => {
        if (!_timerDone) {
            skipBtn.style.display = '';
            skipBtn.classList.add('visible');
            skipBtn.onclick = finishTimer;
        }
    }, 500);

    // Countdown
    _timerInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            finishTimer();
            return;
        }
        secondsEl.textContent = remaining;
        const offset = circumference * (1 - remaining / total);
        arcEl.style.strokeDashoffset = offset.toString();
    }, 1000);
}

function hideTimerOverlay() {
    _timerDone = true;
    if (_timerInterval) clearInterval(_timerInterval);
    const overlay = document.getElementById('timer-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ─── Location Transition Overlay (immersive 2s travel screen) ───
const _LOC_TRANSITIONS = {
    // City locations
    city_tavern:     { icon: '🍺', text: 'Caminhando até a Taverna...' },
    city_temple:     { icon: '⛪', text: 'Seguindo ao Templo...' },
    city_market:     { icon: '🏪', text: 'Indo ao Mercado...' },
    city_bank:       { icon: '🏦', text: 'Entrando no Banco...' },
    city_guild:      { icon: '⚔️', text: 'Chegando na Guilda...' },
    city_arena:      { icon: '🏟️', text: 'Entrando na Arena...' },
    city_locations:  { icon: '🏰', text: 'Explorando a cidade...' },
    // Travel / exploration
    depart:          { icon: '🗺️', text: 'Partindo para aventura...' },
    action_depart:   { icon: '🗺️', text: 'Partindo para aventura...' },
    trail_:          { icon: '🥾', text: 'Seguindo a trilha...' },
    explore_:        { icon: '🧭', text: 'Explorando o caminho...' },
    // Return / Arrival
    action_city_entry: { icon: '🏰', text: 'Avistando os portões de Eldoria...' },
    action_enter_city: { icon: '🏰', text: 'Entrando em Eldoria...' },
    return_city:     { icon: '🏰', text: 'Retornando à cidade...' },
    action_return:   { icon: '🏰', text: 'Retornando à cidade...' },
    city_back:       { icon: '🏰', text: 'Voltando à praça central...' },
    // Combat end
    combat_end:      { icon: '⚔️', text: 'Recolhendo espólios...' },
    // Rest
    rest:            { icon: '🏕️', text: 'Descansando...' },
    long_rest:       { icon: '🛏️', text: 'Descansando na estalagem...' },
};
// Callbacks that should NOT trigger location transition (UI panels, not travel)
const _NO_TRANSITION = /^(inv|char|status|help|settings|quest_view|action_universal_back|menu|equip|unequip|use_|sell_|buy_|deposit|withdraw|donate|skill_|feat_|spell_|npc_talk|dialogue|gossip|quest_accept|quest_deliver|shop_|inn_pay_)/;

const LOC_TRANSITION_MS = 1500;
let _locTransitionActive = false;

function _detectLocationTransition(cb) {
    if (!cb || _NO_TRANSITION.test(cb)) return null;
    // Exact match first
    if (_LOC_TRANSITIONS[cb]) return _LOC_TRANSITIONS[cb];
    // Prefix match
    for (const [prefix, ctx] of Object.entries(_LOC_TRANSITIONS)) {
        if (prefix.endsWith('_') && cb.startsWith(prefix)) return ctx;
    }
    return null;
}

function showLocationTransition(ctx) {
    const el = document.getElementById('loc-transition');
    if (!el) return;
    _locTransitionActive = true;
    el.classList.remove('hiding');
    el.style.display = '';
    const iconEl = document.getElementById('loc-icon');
    const textEl = document.getElementById('loc-text');
    if (iconEl) iconEl.textContent = ctx.icon || '🗺️';
    if (textEl) textEl.textContent = ctx.text || 'Viajando...';
    haptic('medium');
}

function hideLocationTransition() {
    const el = document.getElementById('loc-transition');
    if (!el || !_locTransitionActive) return;
    _locTransitionActive = false;
    el.classList.add('hiding');
    setTimeout(() => { el.style.display = 'none'; el.classList.remove('hiding'); }, 400);
}

// ─── Immersive Mode (collapsible bottom panel) ───
let _immersiveCollapsed = false;
let _immersiveEligible = false;
const IMMERSIVE_KEY = 'valdoria_immersive';

function initImmersive() {
    try {
        _immersiveCollapsed = localStorage.getItem(IMMERSIVE_KEY) === '1';
    } catch (e) { _immersiveCollapsed = false; }

    const toggleBtn = document.getElementById('immersive-toggle');
    const restoreBtn = document.getElementById('immersive-restore');

    if (toggleBtn) {
        toggleBtn.onclick = () => {
            haptic('light');
            _setImmersive(true);
        };
    }
    if (restoreBtn) {
        restoreBtn.onclick = () => {
            haptic('light');
            _setImmersive(false);
        };
    }
}

function _setImmersive(collapsed) {
    _immersiveCollapsed = collapsed;
    try { localStorage.setItem(IMMERSIVE_KEY, collapsed ? '1' : '0'); } catch (e) { /* */ }
    _applyImmersive();
}

function _applyImmersive() {
    const toggle = document.getElementById('immersive-toggle');
    const restore = document.getElementById('immersive-restore');
    const panel = document.getElementById('bottom-panel');
    const screen = document.getElementById('screen');

    if (!_immersiveEligible) {
        // Not immersive — hide controls, ensure panel visible
        if (toggle) toggle.style.display = 'none';
        if (restore) restore.style.display = 'none';
        if (panel) panel.classList.remove('immersive-collapsed');
        if (screen) screen.classList.remove('immersive-full');
        updateBottomPadding();
        return;
    }

    if (_immersiveCollapsed) {
        if (toggle) toggle.style.display = 'none';
        if (panel) panel.classList.add('immersive-collapsed');
        if (restore) restore.style.display = '';
        if (screen) screen.classList.add('immersive-full');
    } else {
        if (panel) panel.classList.remove('immersive-collapsed');
        if (toggle) toggle.style.display = '';
        if (restore) restore.style.display = 'none';
        if (screen) screen.classList.remove('immersive-full');
        updateBottomPadding();
    }
}

function updateImmersiveEligibility(screen) {
    _immersiveEligible = !!(screen && screen.immersive);

    // Auto-expand if text input is active (need to see input field)
    if (screen && screen.waiting_for_text && _immersiveCollapsed && _immersiveEligible) {
        _immersiveCollapsed = false;
    }

    // Auto-collapse removed — default is always expanded for better discoverability.
    // Players can manually collapse via the · toggle for immersion.

    _applyImmersive();
}

// ─── Font Picker (settings screen) ───
const FONT_OPTIONS = [
    { id: 'medievalsharp', name: 'MedievalSharp', family: "'MedievalSharp', serif" },
    { id: 'cinzel',        name: 'Cinzel',        family: "'Cinzel', serif" },
    { id: 'imfell',        name: 'IM Fell English', family: "'IM Fell English', serif" },
    { id: 'pirataone',     name: 'Pirata One',    family: "'Pirata One', cursive" },
    { id: 'almendra',      name: 'Almendra',      family: "'Almendra', serif" },
    { id: 'metamorphous',  name: 'Metamorphous',  family: "'Metamorphous', serif" },
];
const FONT_KEY = 'valdoria_font';

function getSelectedFont() {
    try {
        let id = localStorage.getItem(FONT_KEY) || 'medievalsharp';
        if (id === 'uncial') { id = 'medievalsharp'; localStorage.setItem(FONT_KEY, id); }
        return id;
    } catch (e) { return 'medievalsharp'; }
}

function applyGameFont() {
    const id = getSelectedFont();
    const opt = FONT_OPTIONS.find(f => f.id === id);
    if (!opt) return;
    document.body.style.setProperty('--user-font', opt.family);
    document.body.dataset.font = id;
    document.body.style.fontFamily = opt.family;
}

function selectGameFont(fontId) {
    const opt = FONT_OPTIONS.find(f => f.id === fontId);
    if (!opt) return;
    try { localStorage.setItem(FONT_KEY, fontId); } catch (e) { /* */ }
    applyGameFont();
    document.querySelectorAll('.font-pick-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.fontId === fontId);
    });
    haptic('light');
}

/**
 * Inject font picker HTML into settings screen content.
 * Called by renderScreen() when screen_id is 'city.settings'.
 */
function injectFontPicker(contentEl) {
    const section = document.createElement('div');
    section.className = 'font-picker-section';

    const label = document.createElement('div');
    label.className = 'font-picker-label';
    label.textContent = '🔤 Fonte do Jogo';
    section.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'font-picker-grid';

    const currentId = getSelectedFont();
    for (const f of FONT_OPTIONS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'font-pick-btn' + (f.id === currentId ? ' active' : '');
        btn.style.fontFamily = f.family;
        btn.dataset.fontId = f.id;

        const nameSpan = document.createElement('span');
        nameSpan.textContent = f.name;
        btn.appendChild(nameSpan);

        const check = document.createElement('span');
        check.className = 'font-check';
        check.textContent = '✓';
        btn.appendChild(check);

        btn.onclick = () => selectGameFont(f.id);
        grid.appendChild(btn);
    }

    section.appendChild(grid);
    contentEl.appendChild(section);
}

// ─── Button Bounce-Back — now in shared/bounce-back.js ───

// ─── Floating Reward Popup ───
// Shows a "+gold", "+XP", "+item" text that floats up and fades.
function showFloatPopup(container, text, x, y, color) {
    const el = document.createElement('div');
    el.className = 'v-float-popup';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    if (color) el.style.color = color;
    (container || document.body).appendChild(el);
    el.addEventListener('animationend', () => el.remove());
}

// ─── Animated Counter ───
// Counts from `from` to `to` with ease-out deceleration.
function animateCounter(el, from, to, duration) {
    if (!el || from === to) { if (el) el.textContent = to; return; }
    duration = duration || 600;
    const start = performance.now();
    const diff = to - from;
    const step = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
        el.textContent = Math.round(from + diff * ease);
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

// Font is applied on load by shared/font-apply.js (included in index.html)


// ─── Session Expiry Warning ───
let _sessionExpiryTimer = null;
function initSessionExpiry(ttlSeconds) {
    if (_sessionExpiryTimer) clearTimeout(_sessionExpiryTimer);
    if (!ttlSeconds || ttlSeconds <= 0) return;
    var warnAt = Math.max(0, (ttlSeconds - 900)) * 1000;
    _sessionExpiryTimer = setTimeout(function() {
        showToast('\u23F0 Sua sess\u00E3o expira em 15 minutos.', 5000);
        _sessionExpiryTimer = setTimeout(function() {
            showToast('\u26A0\uFE0F Sess\u00E3o expira em 5 minutos!', 5000);
        }, 600000);
    }, warnAt);
}

// ─── Offline Indicator ───
function _showOfflineBadge() {
    var badge = document.getElementById('offline-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'offline-badge';
        badge.className = 'offline-badge';
        badge.textContent = '\uD83C\uDF10 Sem conex\u00E3o';
        document.body.appendChild(badge);
    }
    badge.style.display = '';
}
function _hideOfflineBadge() {
    var badge = document.getElementById('offline-badge');
    if (badge) badge.style.display = 'none';
}
window.addEventListener('offline', function() { _showOfflineBadge(); });
window.addEventListener('online', function() {
    _hideOfflineBadge();
    showToast('\u2705 Conex\u00E3o restaurada', 2500);
});

// ─── Immersive Toggle Tooltip (first visit) ───
function showImmersiveTooltip() {
    if (localStorage.getItem('valdoria_immersive_tip')) return;
    var toggle = document.getElementById('immersive-toggle');
    if (!toggle || toggle.style.display === 'none') return;
    var tip = document.createElement('div');
    tip.textContent = 'Toque para recolher o menu';
    tip.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#d4c8b0;padding:6px 12px;border-radius:8px;font-size:12px;z-index:15;pointer-events:none;animation:valdoriaFadeIn 0.3s ease;';
    document.body.appendChild(tip);
    setTimeout(function() {
        if (tip.parentElement) tip.parentElement.removeChild(tip);
        localStorage.setItem('valdoria_immersive_tip', '1');
    }, 4000);
}

// ─── Swipe-Right to Go Back (mobile gesture) ───
(function initSwipeBack() {
    let _swStartX = 0, _swStartY = 0, _swActive = false;
    const MIN_DX = 70;     // minimum horizontal distance (px)
    const MAX_DY_RATIO = 0.5; // max vertical/horizontal ratio (prevents diagonal)
    const EDGE_ZONE = 60;  // only trigger from left edge (px)

    document.addEventListener('touchstart', function(e) {
        if (S.transitioning) return;
        const t = e.touches[0];
        // Only start from left edge to avoid interfering with scrolling
        if (t.clientX > EDGE_ZONE) return;
        _swStartX = t.clientX;
        _swStartY = t.clientY;
        _swActive = true;
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
        if (!_swActive) return;
        _swActive = false;
        const t = e.changedTouches[0];
        const dx = t.clientX - _swStartX;
        const dy = Math.abs(t.clientY - _swStartY);
        // Must swipe right with enough distance and mostly horizontal
        if (dx >= MIN_DX && dy / dx < MAX_DY_RATIO) {
            // Find the back button in current screen
            if (typeof doAction === 'function') {
                haptic('light');
                doAction('action_universal_back');
            }
        }
    }, { passive: true });
})();
// ─── Swipe-back hint (show gold edge glow on first visit) ───
function showSwipeBackHint() {
    if (localStorage.getItem('valdoria_swipe_hint')) return;
    var hint = document.createElement('div');
    hint.className = 'swipe-edge-hint';
    document.body.appendChild(hint);
    setTimeout(function() {
        if (hint.parentElement) hint.parentElement.removeChild(hint);
        localStorage.setItem('valdoria_swipe_hint', '1');
    }, 6000);
}

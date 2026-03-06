/* ═══════════════════════════════════════════════════════════════
   GAME HUB — Core API Client & State Management
   Communicates with /api/game/* endpoints on the bot server.
   ═══════════════════════════════════════════════════════════════ */

// Global state
const S = {
    token: '',
    apiBase: '',
    uid: 0,
    currentScreen: null,
    transitioning: false,
    lastActionTime: 0,
};

const DEBOUNCE_MS = 200;
const RETRY_MAX = 4;
const RETRY_BASE_MS = 1000;
const FETCH_TIMEOUT_MS = 12000; // 12s per fetch attempt (AbortController)
const HEALTH_TIMEOUT_MS = 5000; // 5s for health check
const LOADING_TIMEOUT_MS = 25000; // 25s max loading screen before auto-error
const SCREEN_CACHE_KEY = 'valdoria_game_screen';
const SCREEN_CACHE_TTL = 300000; // 5 minutes

let _loadingTimeoutId = null;

// ─── Initialization ───
async function init() {
    const params = new URLSearchParams(window.location.search);
    S.token = params.get('token') || '';
    S.apiBase = (params.get('api') || '').replace(/\/$/, '');
    S.uid = parseInt(params.get('uid') || '0', 10);
    S.charId = params.get('char') || '';  // Character ID from menu (for char switch)

    // Immersive mode (collapsible bottom panel) — init before auth check
    if (typeof initImmersive === 'function') initImmersive();

    if (!S.token || !S.uid || !S.apiBase) {
        showError('Parâmetros de sessão inválidos. Feche e toque em JOGAR novamente.');
        return;
    }

    // Telegram WebApp setup
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
        try { Telegram.WebApp.disableVerticalSwipes(); } catch (e) { /* older clients */ }

        // Back button integration
        Telegram.WebApp.BackButton.onClick(() => {
            doAction('action_universal_back');
        });
    }

    // Visibility change — refresh state when returning to app
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && S.currentScreen) {
            // Soft refresh — don't show loading, just update if stale
            fetchState(true);
        }
    });

    // Health check — verify API is reachable before loading game
    const healthy = await checkHealth();
    if (!healthy) {
        showError('Servidor indisponível. Tente novamente em alguns segundos.');
        return;
    }

    // Check if returning from another WebApp (arena, explore, etc.)
    const isReturn = params.get('return') === 'game';

    if (isReturn) {
        // Returning from specialized WebApp — refresh state
        returnFromWebApp();
    } else if (S.charId) {
        // Opening from character selection — use /start to activate char
        startGame();
    } else {
        // Try cached screen for instant render, then refresh from server
        const cached = loadCachedScreen();
        if (cached) {
            renderScreen(cached);
            fetchState(true); // silent refresh in background
        } else {
            fetchState(false);
        }
    }
}

// ─── Health Check ───
async function checkHealth() {
    const url = `${S.apiBase}/api/game/health`;
    try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
        const resp = await fetch(url, {
            method: 'GET',
            headers: { 'ngrok-skip-browser-warning': '1' },
            signal: controller.signal,
        });
        clearTimeout(tid);
        if (!resp.ok) {
            console.error('[GAME] Health check failed:', resp.status);
            return false;
        }
        const data = await resp.json();
        if (data.status === 'ok' && data.engine) {
            return true;
        }
        console.warn('[GAME] Engine not ready:', data);
        return false;
    } catch (e) {
        console.error('[GAME] Health check unreachable:', e.message);
        return false;
    }
}

// ─── API Methods ───
async function apiCall(endpoint, body = {}, retries = RETRY_MAX) {
    const url = `${S.apiBase}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${S.token}`,
    };
    if (window.Telegram?.WebApp?.initData) {
        headers['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
    }
    headers['ngrok-skip-browser-warning'] = '1';
    // Idempotency key for mutating endpoints — generated ONCE, shared across retries
    if (endpoint.includes('/action') || endpoint.includes('/text') || endpoint.includes('/transition')) {
        headers['X-Idempotency-Key'] = crypto.randomUUID();
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            // AbortController timeout — prevents infinite hang
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

            const resp = await fetch(url, {
                method: endpoint.includes('/image/') ? 'GET' : 'POST',
                headers,
                body: endpoint.includes('/image/') ? undefined : JSON.stringify({ user_id: S.uid, ...body }),
                signal: controller.signal,
            });
            clearTimeout(tid);

            if (resp.status === 429) {
                // Rate limited — wait and retry
                await sleep(2000);
                continue;
            }

            if (resp.status === 401) {
                showError('Sessão expirada. Feche e toque em JOGAR novamente.');
                return null;
            }

            const data = await resp.json();

            if (resp.ok) {
                return data;
            }

            console.error('[GAME] API error:', resp.status, data);
            if (attempt === retries) {
                const msg = data && data.error === 'player_not_found'
                    ? 'Personagem não encontrado. Feche e selecione novamente.'
                    : 'Erro no servidor. Tente novamente.';
                showError(msg);
                return null;
            }
        } catch (e) {
            const isTimeout = e.name === 'AbortError';
            console.error('[GAME] fetch error:', isTimeout ? 'timeout' : e);
            if (attempt === retries) {
                // Try to show cached screen instead of blank error
                const cached = loadCachedScreen();
                if (cached && !S.currentScreen) {
                    renderScreen(cached);
                    showToast('🔌 Reconectando...', 3000);
                }
                showError(isTimeout
                    ? 'Servidor não respondeu a tempo. Tente novamente.'
                    : 'Sem conexão. Verifique sua internet.');
                return null;
            }
            // Exponential backoff with jitter
            const backoff = RETRY_BASE_MS * Math.pow(2, attempt);
            const jitter = Math.random() * 500;
            await sleep(backoff + jitter);
        }
    }
    return null;
}

async function startGame() {
    showLoading();
    const startBody = S.charId ? { char_id: S.charId } : {};
    const data = await apiCall('/api/game/start', startBody);
    hideLoading();
    if (data && !data.error) {
        renderScreen(data);
    } else if (data && data.error) {
        // apiCall already shows error for null; handle known server errors
        if (data.error === 'invalid_session') {
            showError('Sessão expirada. Feche e toque em JOGAR novamente.');
        }
        // Other errors already handled by apiCall
    }
}

async function fetchState(silent) {
    if (!silent) showLoading();
    const data = await apiCall('/api/game/state');
    if (!silent) hideLoading();

    if (data && !data.error) {
        // Check for transition (player is in combat/explore)
        if (data.transition) {
            handleTransition(data.transition);
        } else {
            renderScreen(data);
        }
    } else if (!silent && !data) {
        // First time or server unreachable — apiCall already showed error
        // Nothing to do, error overlay has retry button
    }
}

async function doAction(callbackData) {
    if (S.transitioning) return;

    // Debounce
    const now = Date.now();
    if (now - S.lastActionTime < DEBOUNCE_MS) return;
    S.lastActionTime = now;

    // Haptic feedback
    haptic('light');

    const data = await apiCall('/api/game/action', { cb: callbackData });
    if (!data) return;

    if (data.error === 'no_response') return;

    // Handle transitions to specialized WebApps
    // Only auto-transition if there is NO text to display
    if (data.transition && !data.text) {
        handleTransition(data.transition);
        return;
    }

    // Handle toasts/alerts
    if (data.toast) showToast(data.toast);
    if (data.alert) showToast(data.alert, 3000);

    // Handle timer
    if (data.timer) {
        showTimerOverlay(data.timer);
    }

    // Render the new screen (only if there's content to render)
    if (data.text || data.buttons) {
        animateScreenTransition(() => renderScreen(data));

        // If there's a transition AND we rendered a screen,
        // it means the button is just there (like Mochila), so don't auto-redirect.
        if (data.transition && data.text) {
            console.log('[GAME] Screen has WebApp link:', data.transition.to);
        }
    }
}

async function doText(text) {
    if (S.transitioning || !text.trim()) return;
    S.lastActionTime = Date.now();
    haptic('light');

    const data = await apiCall('/api/game/text', { text: text.trim() });
    if (data && !data.error) {
        animateScreenTransition(() => renderScreen(data));
    }
}

// ─── Screen Cache (localStorage — survives WebView lifecycle) ───
function cacheScreen(screen) {
    try {
        // Don't cache screens with active text input or timers — stale state on reload
        if (screen && (screen.waiting_for_text || screen.timer)) return;
        localStorage.setItem(SCREEN_CACHE_KEY, JSON.stringify({
            uid: S.uid, ts: Date.now(), screen,
        }));
    } catch (e) { /* quota exceeded — ignore */ }
}

function loadCachedScreen() {
    try {
        const raw = localStorage.getItem(SCREEN_CACHE_KEY);
        if (!raw) return null;
        const { uid, ts, screen } = JSON.parse(raw);
        // Validate by user ID (not token — token changes each session)
        if (uid !== S.uid || Date.now() - ts > SCREEN_CACHE_TTL) {
            localStorage.removeItem(SCREEN_CACHE_KEY);
            return null;
        }
        return screen;
    } catch (e) { return null; }
}

// ─── Helpers ───
function haptic(style) {
    try {
        if (window.Telegram && Telegram.WebApp.HapticFeedback) {
            Telegram.WebApp.HapticFeedback.impactOccurred(style);
        }
    } catch (e) { console.warn('[GAME] haptic failed:', e); }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Bootstrap ───
document.addEventListener('DOMContentLoaded', init);

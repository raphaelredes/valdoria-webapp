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
const HEALTH_TIMEOUT_MS = 8000; // 8s for health check (ngrok can be slow)
const HEALTH_RETRIES = 3;       // retry health check up to 3 times
const HEALTH_RETRY_MS = 2000;   // 2s between health retries
const LOADING_TIMEOUT_MS = 25000; // 25s max loading screen before auto-error
const SCREEN_CACHE_KEY = 'valdoria_game_screen';
const SCREEN_CACHE_TTL = 300000; // 5 minutes

let _loadingTimeoutId = null;

// ─── Initialization ───
async function init() {
    console.log('[GAME] init() started');
    console.log('[GAME] URL:', window.location.href);

    const params = new URLSearchParams(window.location.search);
    S.token = params.get('token') || '';
    S.apiBase = (params.get('api') || '').replace(/\/$/, '');
    S.uid = parseInt(params.get('uid') || '0', 10);
    S.charId = params.get('char') || '';  // Character ID from menu (for char switch)

    console.log('[GAME] Params: token=' + (S.token ? S.token.substring(0, 8) + '...' : 'MISSING') +
        ' api=' + (S.apiBase || 'MISSING') +
        ' uid=' + S.uid +
        ' char=' + (S.charId || 'none'));

    // Immersive mode (collapsible bottom panel) — init before auth check
    if (typeof initImmersive === 'function') initImmersive();

    if (!S.token || !S.uid || !S.apiBase) {
        console.error('[GAME] Missing required params - token:', !!S.token, 'uid:', S.uid, 'apiBase:', !!S.apiBase);
        showError('Parâmetros de sessão inválidos. Feche e toque em JOGAR novamente.');
        return;
    }

    // Telegram WebApp setup
    if (window.Telegram && Telegram.WebApp) {
        console.log('[GAME] Telegram WebApp detected, version:', Telegram.WebApp.version || 'unknown');
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
        try { Telegram.WebApp.disableVerticalSwipes(); } catch (e) { /* older clients */ }

        // Back button integration
        Telegram.WebApp.BackButton.onClick(() => {
            doAction('action_universal_back');
        });
    } else {
        console.warn('[GAME] Telegram WebApp NOT detected - running outside Telegram?');
    }

    // Visibility change — refresh state when returning to app
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && S.currentScreen) {
            // Soft refresh — don't show loading, just update if stale
            fetchState(true);
        }
    });

    // Health check — verify API is reachable before loading game
    console.log('[GAME] Starting health check to:', S.apiBase + '/api/game/health');
    const healthy = await checkHealth();
    console.log('[GAME] Health check result:', healthy);
    if (!healthy) {
        showError('Servidor indisponível. Tente novamente em alguns segundos.');
        return;
    }

    // Check if returning from another WebApp (arena, explore, etc.)
    const isReturn = params.get('return') === 'game';
    console.log('[GAME] Route: isReturn=' + isReturn + ' hasCharId=' + !!S.charId);

    if (isReturn) {
        // Returning from specialized WebApp — refresh state
        console.log('[GAME] -> returnFromWebApp()');
        returnFromWebApp();
    } else if (S.charId) {
        // Opening from character selection — use /start to activate char
        console.log('[GAME] -> startGame() with charId=' + S.charId);
        startGame();
    } else {
        // Try cached screen for instant render, then refresh from server
        const cached = loadCachedScreen();
        console.log('[GAME] -> fetchState() cached=' + !!cached);
        if (cached) {
            renderScreen(cached);
            fetchState(true); // silent refresh in background
        } else {
            fetchState(false);
        }
    }
}

// ─── Health Check (with retries) ───
async function checkHealth() {
    const url = `${S.apiBase}/api/game/health`;

    for (let attempt = 0; attempt <= HEALTH_RETRIES; attempt++) {
        if (attempt > 0) {
            console.log('[GAME] Health retry', attempt, '/', HEALTH_RETRIES, '- waiting', HEALTH_RETRY_MS + 'ms');
            await sleep(HEALTH_RETRY_MS);
        }
        console.log('[GAME] checkHealth() attempt', attempt, 'url:', url);
        try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
            const resp = await fetch(url, {
                method: 'GET',
                headers: { 'ngrok-skip-browser-warning': '1' },
                signal: controller.signal,
            });
            clearTimeout(tid);
            console.log('[GAME] Health response status:', resp.status);
            if (!resp.ok) {
                console.error('[GAME] Health check failed:', resp.status, resp.statusText);
                continue; // retry
            }
            const data = await resp.json();
            console.log('[GAME] Health data:', JSON.stringify(data));
            if (data.status === 'ok' && data.engine) {
                return true;
            }
            // Engine starting — worth retrying
            console.warn('[GAME] Engine not ready:', data);
            continue;
        } catch (e) {
            console.error('[GAME] Health check error:', e.name, e.message);
            // continue to next retry
        }
    }
    console.error('[GAME] Health check failed after', HEALTH_RETRIES + 1, 'attempts');
    return false;
}

// ─── API Methods ───
async function apiCall(endpoint, body = {}, retries = RETRY_MAX) {
    const url = `${S.apiBase}${endpoint}`;
    console.log('[GAME] apiCall:', endpoint, 'body:', JSON.stringify(body).substring(0, 200));
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
            if (attempt > 0) console.log('[GAME] apiCall retry', attempt, '/', retries, 'for', endpoint);
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

            console.log('[GAME] apiCall response:', endpoint, 'status:', resp.status);

            if (resp.status === 429) {
                console.warn('[GAME] Rate limited on', endpoint, '- waiting 2s');
                // Rate limited — wait and retry
                await sleep(2000);
                continue;
            }

            if (resp.status === 401) {
                console.error('[GAME] Session expired (401) for', endpoint);
                showError('Sessão expirada. Feche e toque em JOGAR novamente.');
                return null;
            }

            let data;
            try {
                data = await resp.json();
            } catch (jsonErr) {
                console.error('[GAME] Failed to parse JSON response for', endpoint, ':', jsonErr);
                const rawText = await resp.text().catch(() => '(could not read body)');
                console.error('[GAME] Raw response body:', rawText.substring(0, 500));
                if (attempt === retries) {
                    showError('Resposta inválida do servidor.');
                    return null;
                }
                continue;
            }

            if (resp.ok) {
                console.log('[GAME] apiCall OK:', endpoint,
                    'keys:', Object.keys(data).join(','),
                    'text_len:', (data.text || '').length,
                    'buttons:', (data.buttons || []).length,
                    'transition:', data.transition ? JSON.stringify(data.transition).substring(0, 80) : 'none');
                return data;
            }

            console.error('[GAME] API error:', resp.status, JSON.stringify(data).substring(0, 300));
            if (attempt === retries) {
                const msg = data && data.error === 'player_not_found'
                    ? 'Personagem não encontrado. Feche e selecione novamente.'
                    : 'Erro no servidor. Tente novamente.';
                showError(msg);
                return null;
            }
        } catch (e) {
            const isTimeout = e.name === 'AbortError';
            console.error('[GAME] fetch error on', endpoint, ':', isTimeout ? 'TIMEOUT after ' + FETCH_TIMEOUT_MS + 'ms' : e.name + ': ' + e.message);
            if (attempt === retries) {
                // Try to show cached screen instead of blank error
                const cached = loadCachedScreen();
                if (cached && !S.currentScreen) {
                    renderScreen(cached);
                    showToast('Reconectando...', 3000);
                }
                showError(isTimeout
                    ? 'Servidor não respondeu a tempo. Tente novamente.'
                    : 'Sem conexão. Verifique sua internet.');
                return null;
            }
            // Exponential backoff with jitter
            const backoff = RETRY_BASE_MS * Math.pow(2, attempt);
            const jitter = Math.random() * 500;
            console.log('[GAME] Backoff:', Math.round(backoff + jitter) + 'ms before retry', (attempt + 1));
            await sleep(backoff + jitter);
        }
    }
    return null;
}

async function startGame() {
    console.log('[GAME] startGame() called, charId:', S.charId || 'none');
    showLoading();
    const startBody = S.charId ? { char_id: S.charId } : {};
    const data = await apiCall('/api/game/start', startBody);
    hideLoading();
    if (data && !data.error) {
        console.log('[GAME] startGame() success, rendering screen');
        renderScreen(data);
    } else if (data && data.error) {
        console.error('[GAME] startGame() server error:', data.error);
        // apiCall already shows error for null; handle known server errors
        if (data.error === 'invalid_session') {
            showError('Sessão expirada. Feche e toque em JOGAR novamente.');
        }
        // Other errors already handled by apiCall
    } else {
        console.error('[GAME] startGame() returned null/empty data');
    }
}

async function fetchState(silent) {
    console.log('[GAME] fetchState() silent:', silent);
    if (!silent) showLoading();
    const data = await apiCall('/api/game/state');
    if (!silent) hideLoading();

    if (data && !data.error) {
        // Check for transition (player is in combat/explore)
        if (data.transition) {
            console.log('[GAME] fetchState() got transition:', JSON.stringify(data.transition).substring(0, 100));
            handleTransition(data.transition);
        } else {
            console.log('[GAME] fetchState() rendering screen, text_len:', (data.text || '').length);
            renderScreen(data);
        }
    } else if (data && data.error) {
        console.error('[GAME] fetchState() server error:', data.error);
    } else if (!silent && !data) {
        console.error('[GAME] fetchState() returned null - apiCall already showed error');
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

// ─── Server Log Relay ───
// Intercepts console.log/warn/error and sends [GAME] entries to the server
// so they appear in the GUI server window alongside backend logs.
const _logQueue = [];
let _logFlushTimer = null;
const _LOG_FLUSH_INTERVAL = 2000; // Send batch every 2s
const _LOG_MAX_QUEUE = 50;

const _origLog = console.log.bind(console);
const _origWarn = console.warn.bind(console);
const _origError = console.error.bind(console);

function _queueLog(level, args) {
    const msg = Array.from(args).map(a =>
        typeof a === 'object' ? JSON.stringify(a).substring(0, 200) : String(a)
    ).join(' ');
    // Only relay [GAME] tagged messages to avoid noise
    if (!msg.includes('[GAME]')) return;
    _logQueue.push({ level, msg: msg.substring(0, 500) });
    if (_logQueue.length >= _LOG_MAX_QUEUE) _flushLogs();
}

console.log = function () { _origLog.apply(console, arguments); _queueLog('info', arguments); };
console.warn = function () { _origWarn.apply(console, arguments); _queueLog('warn', arguments); };
console.error = function () { _origError.apply(console, arguments); _queueLog('error', arguments); };

function _flushLogs() {
    if (!_logQueue.length || !S.apiBase) return;
    const entries = _logQueue.splice(0, _LOG_MAX_QUEUE);
    fetch(`${S.apiBase}/api/game/log`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': '1',
        },
        body: JSON.stringify({ entries }),
    }).catch(() => { /* fire and forget */ });
}

// Start periodic flush
_logFlushTimer = setInterval(_flushLogs, _LOG_FLUSH_INTERVAL);
// Flush on page unload
window.addEventListener('beforeunload', _flushLogs);

// ─── Global Error Handlers ───
window.addEventListener('error', (e) => {
    console.error('[GAME] UNCAUGHT ERROR:', e.message, 'at', e.filename + ':' + e.lineno + ':' + e.colno);
});
window.addEventListener('unhandledrejection', (e) => {
    console.error('[GAME] UNHANDLED PROMISE REJECTION:', e.reason);
});

// ─── Bootstrap ───
document.addEventListener('DOMContentLoaded', () => {
    console.log('[GAME] DOMContentLoaded fired, starting init...');
    init().catch(e => {
        console.error('[GAME] init() CRASHED:', e.message);
        if (typeof showError === 'function') {
            showError('Erro ao iniciar o jogo: ' + e.message, e);
        }
    });
});

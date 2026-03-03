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
const RETRY_MAX = 3;
const RETRY_BASE_MS = 1000;

// ─── Initialization ───
function init() {
    const params = new URLSearchParams(window.location.search);
    S.token = params.get('token') || '';
    S.apiBase = (params.get('api') || '').replace(/\/$/, '');
    S.uid = parseInt(params.get('uid') || '0', 10);

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
            doAction('universal_back');
        });
    }

    // Visibility change — refresh state when returning to app
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && S.currentScreen) {
            // Soft refresh — don't show loading, just update if stale
            fetchState(true);
        }
    });

    // Always fetch current state — handles both first-time and reconnection.
    // The server defaults to city hub if no prior state exists.
    fetchState(false);
}

// ─── API Methods ───
async function apiCall(endpoint, body = {}, retries = RETRY_MAX) {
    const url = `${S.apiBase}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${S.token}`,
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const resp = await fetch(url, {
                method: endpoint.includes('/image/') ? 'GET' : 'POST',
                headers,
                body: endpoint.includes('/image/') ? undefined : JSON.stringify({ user_id: S.uid, ...body }),
            });

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
            console.error('[GAME] fetch error:', e);
            if (attempt === retries) {
                showError('Sem conexão. Verifique sua internet.');
                return null;
            }
            await sleep(RETRY_BASE_MS * (attempt + 1));
        }
    }
    return null;
}

async function startGame() {
    showLoading();
    const data = await apiCall('/api/game/start');
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
    if (data.transition) {
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

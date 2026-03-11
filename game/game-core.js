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
    screenVersion: 0,  // Server screen version for anti-double-action guard
};

const DEBOUNCE_MS = 200;
const RETRY_MAX = 2;
const RETRY_BASE_MS = 1000;
const FETCH_TIMEOUT_MS = 12000; // 12s per fetch attempt (AbortController)
const HEALTH_TIMEOUT_MS = 3000; // 3s timeout — fast fail for instant reconnect
const HEALTH_RETRIES = 1;       // 1 retry only — fast fail for instant reconnect
const HEALTH_RETRY_MS = 1000;   // 1s between retries
const LOADING_TIMEOUT_MS = 15000; // 15s max loading screen before auto-error
const MIN_LOADING_MS = Math.round(4000 * (window._valdoriaMinLoadFactor || 1)); // scaled for device performance
const SCREEN_CACHE_KEY = 'valdoria_game_screen';
const SCREEN_CACHE_TTL = 1800000; // 30 minutes

let _loadingTimeoutId = null;

// ─── Connection logging alias (provided by shared/error-reporter.js) ───
function _clog(msg) {
    if (window.ValdoriaErrors) ValdoriaErrors.log(msg);
}

// ─── Initialization ───
async function init() {
    console.log('[GAME] init() started');
    console.log('[GAME] URL:', window.location.href);

    const params = new URLSearchParams(window.location.search);
    S.token = params.get('token') || '';
    // Use ?api= param if provided, otherwise use same-origin (webapp + API share the same server)
    S.apiBase = (params.get('api') || window.location.origin || '').replace(/\/$/, '');
    S.uid = parseInt(params.get('uid') || '0', 10);
    S.charId = params.get('char') || '';  // Character ID from menu (for char switch)

    // Periodic auto-discovery: detect tunnel URL changes during session
    if (S.apiBase && window.ApiDiscovery) {
        ApiDiscovery.init(S.apiBase, function(newUrl) {
            S.apiBase = newUrl;
            if (window.ValdoriaErrors && ValdoriaErrors.updateApiBase) {
                ValdoriaErrors.updateApiBase(newUrl);
            }
        });
    }

    console.log('[GAME] Params: token=' + (S.token ? S.token.substring(0, 8) + '...' : 'MISSING') +
        ' api=' + (S.apiBase || 'MISSING') +
        ' uid=' + S.uid +
        ' char=' + (S.charId || 'none'));

    // Immersive mode (collapsible bottom panel) — init before auth check
    if (typeof initImmersive === 'function') initImmersive();
    // Ambient particle system — init canvas
    if (typeof initParticles === 'function') initParticles();

    // Initialize shared error reporter
    if (window.ValdoriaErrors) {
        ValdoriaErrors.init({
            appName: 'GAME',
            apiBase: S.apiBase,
            token: S.token,
            uid: S.uid,
            getScreenId: () => S.currentScreen ? S.currentScreen.screen_id || '' : '',
            onRetry: async () => {
                showLoading(true);
                _clog('RETRY health check...');
                const ok = await checkHealth();
                if (!ok) { _clog('RETRY health FAILED'); hideLoading(); showError('Servidor indisponível. Tente novamente em alguns segundos.'); return; }
                _clog('RETRY health OK → loading state');
                if (S.currentScreen) { fetchState(false); } else { startGame(); }
            },
        });
    }

    if (!S.token || !S.uid || !S.apiBase) {
        console.error('[GAME] Missing required params - token:', !!S.token, 'uid:', S.uid, 'apiBase:', !!S.apiBase);
        showError('Parâmetros de sessão inválidos. Feche e selecione seu personagem novamente.');
        return;
    }

    // Telegram WebApp setup
    if (window.Telegram && Telegram.WebApp) {
        console.log('[GAME] Telegram WebApp detected, version:', Telegram.WebApp.version || 'unknown');
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
        try { Telegram.WebApp.disableVerticalSwipes(); } catch (e) { /* older clients */ }

        // Back button: notify server then close WebApp
        Telegram.WebApp.BackButton.show();
        Telegram.WebApp.BackButton.onClick(() => { _closeGameHub(); });
    } else {
        console.warn('[GAME] Telegram WebApp NOT detected - running outside Telegram?');
    }

    // ─── Browser Back Button Trap ───
    // Push a history entry so the phone's physical back button triggers popstate
    // instead of navigating away from the WebApp entirely.
    history.replaceState({ screen: 'init' }, '');
    history.pushState({ screen: 'game' }, '');
    window.addEventListener('popstate', (e) => {
        // Re-push so the trap stays active for subsequent presses
        history.pushState({ screen: 'game' }, '');
        // Close the WebApp (same as Telegram's header back button)
        if (window.Telegram && Telegram.WebApp) { _closeGameHub(); }
    });

    // Visibility change — refresh state when returning to app
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        // If error overlay is showing, trigger health check + retry
        const errOverlay = document.getElementById('v-err-overlay');
        if (errOverlay && errOverlay.style.display !== 'none') {
            _clog('VISIBILITY → visible with error overlay, retrying...');
            const retryBtn = document.getElementById('v-err-retry');
            if (retryBtn && retryBtn.onclick) {
                setTimeout(() => retryBtn.onclick(), 500);
            }
            return;
        }
        if (S.currentScreen) {
            // Soft refresh — don't show loading, just update if stale
            fetchState(true);
        }
    });

    // Online/offline detection — auto-retry when network returns
    window.addEventListener('offline', () => {
        _clog('NETWORK → OFFLINE');
        console.warn('[GAME] Network went offline');
    });
    window.addEventListener('online', () => {
        _clog('NETWORK → ONLINE');
        console.log('[GAME] Network back online');
        // If error overlay is showing a connection error, auto-retry
        const errOverlay = document.getElementById('v-err-overlay');
        const errMsg = document.getElementById('v-err-msg');
        if (errOverlay && errOverlay.style.display !== 'none' && errMsg) {
            const msg = errMsg.textContent || '';
            if (msg.includes('Sem conexão') || msg.includes('indisponível')) {
                _clog('NETWORK → auto-retry after coming online');
                if (typeof showToast === 'function') showToast('Conexão restaurada, reconectando...');
                setTimeout(() => {
                    const retryBtn = document.getElementById('v-err-retry');
                    if (retryBtn && retryBtn.onclick) retryBtn.onclick();
                }, 1500);
            }
        }
    });

    // Health check — verify API is reachable before loading game.
    // If it fails, keep polling silently (player just sees loading screen).
    _clog('INIT health check → ' + S.apiBase + '/api/game/health');
    console.log('[GAME] Starting health check to:', S.apiBase + '/api/game/health');
    showLoading(); // Show loading screen immediately during health check
    const healthy = await _waitForHealthy();
    if (!healthy) return; // _waitForHealthy already handled error/sendData

    // Start device displacement heartbeat
    if (window.SessionHeartbeat) {
        SessionHeartbeat.init({ apiBase: S.apiBase, token: S.token, uid: S.uid });
    }

    // Listen for session-reopened event (user clicked "Reabrir aqui" on displacement overlay)
    window.addEventListener('session-reopened', function (e) {
        console.log('[GAME] Session reopened, reloading screen');
        var data = e.detail;
        if (data && data.text) {
            if (data.sv !== undefined) S.screenVersion = data.sv;
            renderScreen(data);
        } else if (data && data.transition) {
            handleTransition(data.transition);
        } else {
            // Fallback: call startGame to get fresh state
            startGame();
        }
    });

    // Check if returning from another WebApp (combat, explore, etc.)
    const isReturn = params.get('return') === 'game';
    console.log('[GAME] Route: isReturn=' + isReturn + ' hasCharId=' + !!S.charId);

    try {
        if (isReturn) {
            // Returning from specialized WebApp — refresh state
            console.log('[GAME] -> returnFromWebApp()');
            await returnFromWebApp();
        } else if (S.charId) {
            // Opening with specific character — use /start to activate char
            console.log('[GAME] -> startGame() with charId=' + S.charId);
            await startGame();
        } else {
            // No character specified — show character selection screen
            console.log('[GAME] -> showCharacterSelect()');
            await showCharacterSelect();
        }
    } catch (routeError) {
        console.error('[GAME] Route error:', routeError);
        hideLoading();
        showError('Erro ao carregar o jogo. Feche e tente novamente.');
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
        _clog(`HEALTH attempt ${attempt}/${HEALTH_RETRIES}`);
        console.log('[GAME] checkHealth() attempt', attempt, 'url:', url);
        try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
            const t0 = Date.now();
            const resp = await fetch(url, {
                method: 'GET',
                headers: {},
                signal: controller.signal,
            });
            clearTimeout(tid);
            const elapsed = Date.now() - t0;
            _clog(`HEALTH response: ${resp.status} ${resp.statusText} (${elapsed}ms)`);
            console.log('[GAME] Health response status:', resp.status);
            if (!resp.ok) {
                _clog(`HEALTH FAIL: HTTP ${resp.status} ${resp.statusText}`);
                console.error('[GAME] Health check failed:', resp.status, resp.statusText);
                continue; // retry
            }
            const data = await resp.json();
            _clog(`HEALTH data: ${JSON.stringify(data)}`);
            console.log('[GAME] Health data:', JSON.stringify(data));
            if (data.status === 'ok' && data.engine) {
                // Detect tunnel URL change — server reports a different API base
                if (data.api && S.apiBase && data.api !== S.apiBase) {
                    _clog(`HEALTH: tunnel URL changed! ${S.apiBase} -> ${data.api}`);
                    console.log('[GAME] Tunnel URL changed, updating apiBase in memory');
                    S.apiBase = data.api;
                    if (window.ApiDiscovery) ApiDiscovery.updateBase(data.api);
                    if (window.ValdoriaErrors && ValdoriaErrors.updateApiBase) ValdoriaErrors.updateApiBase(data.api);
                }
                return true;
            }
            // Engine starting — worth retrying
            _clog('HEALTH engine not ready: ' + JSON.stringify(data));
            console.warn('[GAME] Engine not ready:', data);
            continue;
        } catch (e) {
            _clog(`HEALTH ERROR: ${e.name}: ${e.message}`);
            console.error('[GAME] Health check error:', e.name, e.message);
            // CORS block = dead tunnel (Cloudflare 530 without CORS headers)
            // No point retrying the same dead URL — fail fast
            if (e.name === 'TypeError') {
                _clog('HEALTH: tunnel dead (CORS/network) — fast fail');
                return false;
            }
            // Timeout or other error — worth retrying
        }
    }
    _clog(`HEALTH EXHAUSTED after ${HEALTH_RETRIES + 1} attempts`);
    console.error('[GAME] Health check failed after', HEALTH_RETRIES + 1, 'attempts');
    return false;
}

// ─── API URL Discovery (auto-resolve stale tunnel URLs) ───
const API_URL_DISCOVERY = '../api-url.json';

async function _discoverApiUrl() {
    // Fetch api-url.json from GitHub Pages (same origin, no CORS issues)
    // Cache-bust to avoid stale CDN responses
    try {
        const resp = await fetch(API_URL_DISCOVERY + '?t=' + Date.now(), {
            cache: 'no-store',
            signal: AbortSignal.timeout(4000),
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        const url = (data.url || '').replace(/\/$/, '');
        if (url && url !== S.apiBase) {
            _clog('DISCOVERY: found new API URL: ' + url);
            console.log('[GAME] Discovered new API URL:', url);
            return url;
        }
    } catch (e) {
        _clog('DISCOVERY failed: ' + (e.message || e));
    }
    return null;
}

// ─── Health Poller (transparent retry — player sees loading, never error) ───
const HEALTH_POLL_INTERVAL = 2000;   // 2s between polls
const HEALTH_POLL_MAX = 3;           // Max 6s of polling before discovery attempt

async function _waitForHealthy() {
    // First try: direct health check with current ?api= URL
    let ok = await checkHealth();
    if (ok) return true;

    // Poll for a bit (server might be restarting)
    _clog('INIT health failed — starting silent poll (player sees loading)');
    console.log('[GAME] Health failed, polling silently...');

    for (let i = 1; i <= HEALTH_POLL_MAX; i++) {
        await sleep(HEALTH_POLL_INTERVAL);
        ok = await checkHealth();
        if (ok) {
            _clog(`INIT health poll ${i} OK`);
            return true;
        }
        _clog(`INIT health poll ${i}/${HEALTH_POLL_MAX} failed`);
    }

    // Polls failed — try discovering the new tunnel URL from api-url.json
    _clog('Attempting API URL discovery...');
    const newUrl = await _discoverApiUrl();
    if (newUrl) {
        S.apiBase = newUrl;
        // Update error reporter API base
        if (window.ValdoriaErrors && ValdoriaErrors.updateApiBase) {
            ValdoriaErrors.updateApiBase(newUrl);
        }
        // Retry health with the discovered URL
        ok = await checkHealth();
        if (ok) {
            _clog('DISCOVERY: health OK with new URL');
            return true;
        }
    }

    // All attempts failed — sendData to close WebApp, bot sends fresh menu
    return _sendDataReconnect();
}

function _sendDataReconnect() {
    _clog('sendData reconnect — bot will send fresh menu');
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.sendData) {
        try {
            tg.sendData(JSON.stringify({ action: 'webapp_reconnect', webapp: 'GAME' }));
            return false;
        } catch (e) { _clog('sendData failed: ' + e.message); }
    }
    hideLoading();
    showError('Servidor indisponível. Feche e tente novamente.');
    return false;
}

// ─── API Methods ───
async function apiCall(endpoint, body = {}, retries = RETRY_MAX) {
    const url = `${S.apiBase}${endpoint}`;
    _clog(`API → ${endpoint}`);
    console.log('[GAME] apiCall:', endpoint, 'body:', JSON.stringify(body).substring(0, 200));
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${S.token}`,
    };
    if (window.Telegram?.WebApp?.initData) {
        headers['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
    }
    // Idempotency key for mutating endpoints — generated ONCE, shared across retries
    if (endpoint.includes('/action') || endpoint.includes('/text') || endpoint.includes('/transition')) {
        headers['X-Idempotency-Key'] = crypto.randomUUID();
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            if (attempt > 0) {
                _clog(`API ${endpoint} retry ${attempt}/${retries}`);
                console.log('[GAME] apiCall retry', attempt, '/', retries, 'for', endpoint);
            }
            // AbortController timeout — prevents infinite hang
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
            const t0 = Date.now();

            const resp = await fetch(url, {
                method: endpoint.includes('/image/') ? 'GET' : 'POST',
                headers,
                body: endpoint.includes('/image/') ? undefined : JSON.stringify({ user_id: S.uid, ...body }),
                signal: controller.signal,
            });
            clearTimeout(tid);
            const elapsed = Date.now() - t0;

            console.log('[GAME] apiCall response:', endpoint, 'status:', resp.status, `(${elapsed}ms)`);

            if (resp.status === 429) {
                _clog(`API ${endpoint} → 429 RATE LIMITED`);
                console.warn('[GAME] Rate limited on', endpoint, '- waiting 2s');
                // Rate limited — wait and retry
                await sleep(2000);
                continue;
            }

            if (resp.status === 401 || resp.status === 403) {
                const reason = resp.status === 401 ? 'session_expired' : 'invalid_init_data';
                _clog(`API ${endpoint} → ${resp.status} ${reason.toUpperCase()}`);
                console.error('[GAME]', reason, `(${resp.status}) for`, endpoint);
                // Auto-close and notify bot to show menu (user doesn't need to do anything)
                try {
                    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.sendData) {
                        Telegram.WebApp.sendData(JSON.stringify({
                            action: 'webapp_error_close',
                            webapp: 'GAME',
                            reason,
                        }));
                        return null; // sendData auto-closes
                    }
                } catch (e) { console.warn('[GAME] sendData failed on ' + resp.status + ':', e); }
                showError('Sessão expirada. Feche e selecione seu personagem novamente.');
                return null;
            }

            let data;
            try {
                data = await resp.json();
            } catch (jsonErr) {
                _clog(`API ${endpoint} → JSON PARSE ERROR: ${jsonErr.message}`);
                console.error('[GAME] Failed to parse JSON response for', endpoint, ':', jsonErr);
                const rawText = await resp.text().catch(() => '(could not read body)');
                _clog(`API ${endpoint} → raw body: ${rawText.substring(0, 150)}`);
                console.error('[GAME] Raw response body:', rawText.substring(0, 500));
                if (attempt === retries) {
                    showError('Resposta inválida do servidor.');
                    return null;
                }
                continue;
            }

            if (resp.ok) {
                _clog(`API ${endpoint} → OK (${elapsed}ms)`);
                console.log('[GAME] apiCall OK:', endpoint,
                    'keys:', Object.keys(data).join(','),
                    'text_len:', (data.text || '').length,
                    'buttons:', (data.buttons || []).length,
                    'transition:', data.transition ? JSON.stringify(data.transition).substring(0, 80) : 'none');
                return data;
            }

            _clog(`API ${endpoint} → ERROR ${resp.status} (${elapsed}ms): ${JSON.stringify(data).substring(0, 200)}`);
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
            const isCorsBlock = e.name === 'TypeError';
            _clog(`API ${endpoint} → ${isTimeout ? 'TIMEOUT ' + FETCH_TIMEOUT_MS + 'ms' : e.name + ': ' + e.message}`);
            console.error('[GAME] fetch error on', endpoint, ':', isTimeout ? 'TIMEOUT after ' + FETCH_TIMEOUT_MS + 'ms' : e.name + ': ' + e.message);

            // CORS block = tunnel died mid-session → try discovery before giving up
            if (isCorsBlock) {
                _clog('API: tunnel dead mid-session — trying discovery');
                const newUrl = await _discoverApiUrl();
                if (newUrl) {
                    S.apiBase = newUrl;
                    if (window.ValdoriaErrors && ValdoriaErrors.updateApiBase) ValdoriaErrors.updateApiBase(newUrl);
                    _clog('API: recovered with new URL: ' + newUrl);
                    continue; // retry the API call with new URL
                }
                _clog('API: discovery failed — sendData reconnect');
                _sendDataReconnect();
                return null;
            }

            if (attempt === retries) {
                // Try to show cached screen instead of blank error
                const cached = loadCachedScreen();
                if (cached && !S.currentScreen) {
                    renderScreen(cached);
                    showToast('Reconectando...');
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
    // Send device platform for displacement tracking
    const tgPlatform = (window.Telegram && Telegram.WebApp && Telegram.WebApp.platform) || '';
    if (tgPlatform) startBody.platform = tgPlatform;
    const data = await apiCall('/api/game/start', startBody);
    await hideLoadingWithDelay();
    if (data && !data.error) {
        if (data.sv !== undefined) S.screenVersion = data.sv;
        // Handle transition responses (prologue, level-up, explore, combat)
        // Only redirect if there's no screen text (pure transition signal).
        if (data.transition && !data.text) {
            console.log('[GAME] startGame() got transition:', JSON.stringify(data.transition).substring(0, 100));
            handleTransition(data.transition);
        } else {
            console.log('[GAME] startGame() success, rendering screen');
            renderScreen(data);
        }
    } else if (data && data.error) {
        console.error('[GAME] startGame() server error:', data.error);
        // apiCall already shows error for null; handle known server errors
        if (data.error === 'invalid_session') {
            showError('Sessão expirada. Feche e selecione seu personagem novamente.');
        }
        // Other errors already handled by apiCall
    } else {
        console.error('[GAME] startGame() returned null/empty data');
        // apiCall() already tried sendData for 401 — if we're still here, show error
        showError('Não foi possível conectar ao servidor. Feche e tente novamente.');
    }
}

async function fetchState(silent) {
    console.log('[GAME] fetchState() silent:', silent);
    if (!silent) showLoading();
    const data = await apiCall('/api/game/state');
    if (!silent) await hideLoadingWithDelay();

    if (data && !data.error) {
        if (data.sv !== undefined) S.screenVersion = data.sv;
        // Check for transition (player is in combat/explore)
        // Only auto-redirect if the response has ONLY a transition (no text/buttons).
        // If text is present, the transition is just a WebApp button on a normal screen
        // (e.g. Mochila on city hub) — render the screen, don't redirect.
        if (data.transition && !data.text) {
            console.log('[GAME] fetchState() got transition:', JSON.stringify(data.transition).substring(0, 100));
            handleTransition(data.transition);
        } else {
            // Skip re-render if screen is identical to current (silent refresh optimization)
            if (silent && S.currentScreen && data.text === S.currentScreen.text
                && data.screen_id === S.currentScreen.screen_id) {
                console.log('[GAME] fetchState() silent — screen unchanged, skip re-render');
                return;
            }
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

// ─── Close Game Hub ───
// Notify server to update the underlying Telegram message, then close the WebApp.
async function _closeGameHub() {
    if (window.SessionHeartbeat) SessionHeartbeat.stop();
    try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 2000);
        await fetch(S.apiBase + '/api/game/close', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + S.token },
            body: JSON.stringify({ user_id: S.uid }),
            signal: controller.signal,
        }).catch(() => {});
        clearTimeout(tid);
    } catch (e) { /* never block close */ }
    try { Telegram.WebApp.close(); } catch (e) { console.warn('[GAME] tg.close:', e); }
}

async function doAction(callbackData) {
    if (S.transitioning) return;

    // Footer toggle is client-side only — never send to server
    if (callbackData === 'action_toggle_footer') return;

    // Debounce
    const now = Date.now();
    if (now - S.lastActionTime < DEBOUNCE_MS) return;
    S.lastActionTime = now;

    // Haptic feedback
    haptic('light');

    // Detect if this is a location change (show immersive travel screen)
    const locCtx = (typeof _detectLocationTransition === 'function')
        ? _detectLocationTransition(callbackData) : null;
    if (locCtx) showLocationTransition(locCtx);
    const t0 = Date.now();

    const data = await apiCall('/api/game/action', { cb: callbackData, sv: S.screenVersion });
    if (!data) { hideLocationTransition(); return; }

    // Store screen version from server response
    if (data.sv !== undefined) S.screenVersion = data.sv;

    if (data.error === 'no_response') {
        hideLocationTransition();
        if (typeof showToast === 'function') showToast('Ação não processada. Tente novamente.');
        return;
    }

    // Server rejected duplicate/stale action — silently ignore
    if (data.error === 'action_rejected') {
        hideLocationTransition();
        console.log('[GAME] Action rejected by server:', data.reason);
        return;
    }

    // Server says to close WebApp (e.g. main_menu action)
    // Server says to close WebApp — close it
    if (data.close) {
        hideLocationTransition();
        try { Telegram.WebApp.close(); } catch (e) { console.warn('[GAME] tg.close:', e); }
        return;
    }

    // Server says to show character selection (main_menu / char_selection)
    if (data.char_select) {
        hideLocationTransition();
        if (typeof showCharacterSelect === 'function') showCharacterSelect();
        return;
    }

    // Handle transitions to specialized WebApps
    // Only auto-transition if there is NO text to display
    if (data.transition && !data.text) {
        // Wait remaining transition time before redirect
        const elapsed = Date.now() - t0;
        const remaining = locCtx ? Math.max(0, LOC_TRANSITION_MS - elapsed) : 0;
        if (remaining > 0) await sleep(remaining);
        hideLocationTransition();
        handleTransition(data.transition);
        return;
    }

    // Handle toasts/alerts
    if (data.toast) showToast(data.toast);
    if (data.alert) {
        const alertDur = (typeof calcReadTime === 'function') ? calcReadTime(data.alert, 'toast-warn') : 3000;
        showToast(data.alert, alertDur);
    }

    // Handle timer
    if (data.timer) {
        showTimerOverlay(data.timer);
    }

    // Inn sleep animation — play cinematic overlay before rendering result
    if (data.inn_animation && typeof playInnAnimation === 'function') {
        hideLocationTransition();
        const result = await new Promise(resolve => playInnAnimation(data.inn_animation, resolve));
        // Apply dream insight buff if player watched full animation (didn't skip)
        if (!result?.skipped && data.inn_animation.dream_insight) {
            try {
                const diRes = await apiCall('/api/game/action', { cb: 'inn_dream_insight' });
                if (diRes?.toast) showToast(diRes.toast);
            } catch(e) { console.warn('[GAME] dream insight action failed', e); }
        }
        if (data.text || data.buttons) {
            renderScreen(data);
        }
        return;
    }

    // Render the new screen (only if there's content to render)
    if (data.text || data.buttons) {
        // Wait remaining transition time before rendering
        const elapsed = Date.now() - t0;
        const remaining = locCtx ? Math.max(0, LOC_TRANSITION_MS - elapsed) : 0;
        if (remaining > 0) await sleep(remaining);
        hideLocationTransition();

        // Detect back navigation for directional slide
        const isBack = /^(action_universal_back|city_back|back|voltar)/.test(callbackData);
        animateScreenTransition(() => renderScreen(data), isBack ? 'back' : 'forward');

        // If there's a transition AND we rendered a screen,
        // it means the button is just there (like Mochila), so don't auto-redirect.
        if (data.transition && data.text) {
            console.log('[GAME] Screen has WebApp link:', data.transition.to);
        }
    } else {
        hideLocationTransition();
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
},
        body: JSON.stringify({ entries }),
    }).catch(() => { /* fire and forget */ });
}

// Start periodic flush
_logFlushTimer = setInterval(_flushLogs, _LOG_FLUSH_INTERVAL);
// Flush on page unload
window.addEventListener('beforeunload', () => {
    _flushLogs();
    // Best-effort notify server that WebApp is closing
    if (S.apiBase && S.token && S.uid) {
        try {
            navigator.sendBeacon(
                S.apiBase + '/api/game/close',
                JSON.stringify({ user_id: S.uid, token: S.token })
            );
        } catch (e) { console.warn('[GAME] sendBeacon close:', e); }
    }
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

/* ═══════════════════════════════════════════════════════════════
   GAME HUB — Cross-WebApp Transitions
   Handles navigation between the Game Hub and specialized WebApps
   (combat, explore, inventory, levelup, market, navigate).
   ═══════════════════════════════════════════════════════════════ */

/**
 * Handle a transition signal from the server.
 * Redirects to the target WebApp URL.
 * @param {Object} transition - {to: string, url: string, text?: string}
 */
// Themed transition map: target webapp -> CSS theme class + duration
const _TRANSITION_THEMES = {
    explore:  { theme: 'theme-leaves', duration: 500 },
    combat:   { theme: 'theme-combat', duration: 400 },
    arena:    { theme: 'theme-combat', duration: 400 },  // backward compat
    navigate: { theme: 'theme-scroll', duration: 500 },
    dungeon:  { theme: 'theme-portal', duration: 500 },
    default:  { theme: '', duration: 350 },
};

// Cross-webapp location labels for immersive transition
const _WEBAPP_LOC_LABELS = {
    explore:  { icon: '🧭', text: 'Partindo para exploração...' },
    combat:   { icon: '⚔️', text: 'Entrando em combate...' },
    arena:    { icon: '⚔️', text: 'Entrando em combate...' },  // backward compat
    navigate: { icon: '🗺️', text: 'Abrindo o mapa...' },
    dungeon:  { icon: '🏚️', text: 'Adentrando a masmorra...' },
    inventory: { icon: '🎒', text: 'Abrindo a mochila...' },
    market:   { icon: '🏪', text: 'Entrando no mercado...' },
    levelup:  { icon: '⭐', text: 'Preparando evolução...' },
};

// Detect WebApp target from URL (mirrors backend _detect_webapp_target)
function _detect_webapp_target_js(url) {
    const u = url.toLowerCase();
    if (u.includes('/combat/') || u.includes('/arena/')) return 'combat';
    if (u.includes('/explore/')) return 'explore';
    if (u.includes('/inventory/')) return 'inventory';
    if (u.includes('/levelup/')) return 'levelup';
    if (u.includes('/market/')) return 'market';
    if (u.includes('/navigate/')) return 'navigate';
    if (u.includes('/character_creator/')) return 'character_creator';
    if (u.includes('/dice/')) return 'dice';
    if (u.includes('/workstation/') || u.includes('/crafting/')) return 'workstation';
    if (u.includes('/pix/')) return 'pix';
    if (u.includes('/prologue/')) return 'prologue';
    if (u.includes('/game/')) return 'game';
    return 'unknown';
}

function handleTransition(transition) {
    if (!transition) { console.warn('[GAME] handleTransition() called with null transition'); return; }
    if (!transition.url) { console.warn('[GAME] handleTransition() missing url:', JSON.stringify(transition)); S.transitioning = false; return; }

    S.transitioning = true;
    console.log('[GAME] Transition to:', transition.to, transition.url);

    // Stop ambient particles during transition
    if (typeof stopParticles === 'function') stopParticles();

    // Skip location transition for WebApps that have their own loading screen
    // (navigate, combat, explore, dungeon all show a magic circle on open)
    const _HAS_OWN_LOADING = { navigate: 1, combat: 1, arena: 1, explore: 1, dungeon: 1 };
    const locLabel = _HAS_OWN_LOADING[transition.to] ? null : _WEBAPP_LOC_LABELS[transition.to];
    if (locLabel && typeof showLocationTransition === 'function') {
        showLocationTransition(locLabel);
    }

    // Get themed transition
    const transConfig = _TRANSITION_THEMES[transition.to] || _TRANSITION_THEMES.default;

    // Show transition overlay with theme (on top of loc-transition)
    const overlay = document.getElementById('transition-overlay');
    if (overlay) {
        overlay.className = 'transition-overlay';
        if (transConfig.theme) overlay.classList.add(transConfig.theme);
        overlay.style.display = '';
        requestAnimationFrame(() => overlay.classList.add('active'));
    }

    // Fast redirect for WebApps with own loading; full transition for others
    const delay = locLabel ? Math.max(LOC_TRANSITION_MS, transConfig.duration) : transConfig.duration;
    setTimeout(() => {
        window.location.replace(transition.url);
    }, delay);

    // Safety net: reset transitioning flag after 10s in case redirect fails
    setTimeout(() => {
        if (S.transitioning) {
            console.warn('[GAME] Transition safety timeout — resetting flag');
            S.transitioning = false;
            if (overlay) { overlay.style.display = 'none'; overlay.classList.remove('active'); }
            if (typeof hideLocationTransition === 'function') hideLocationTransition();
        }
    }, delay + 10000);
}

/**
 * Build the return URL for the Game Hub.
 * Called by specialized WebApps when they want to return here.
 * @returns {string} URL with return=game parameter
 */
function buildReturnUrl() {
    const params = new URLSearchParams({
        token: S.token,
        api: S.apiBase,
        uid: S.uid.toString(),
        return: 'game',
        v: '1',
    });
    const base = window.location.origin + window.location.pathname;
    return `${base}?${params.toString()}`;
}

/**
 * Handle return from a specialized WebApp via the transition API.
 * Called when the URL contains ?return=game.
 * This triggers a state refresh to show the current game screen.
 */
async function returnFromWebApp() {
    console.log('[GAME] returnFromWebApp() called');
    showLoading();
    const data = await apiCall('/api/game/state');
    await hideLoadingWithDelay();

    if (data && !data.error) {
        if (data.transition && !data.text) {
            console.log('[GAME] returnFromWebApp() -> transition:', JSON.stringify(data.transition).substring(0, 100));
            // Still in a specialized state — redirect again
            handleTransition(data.transition);
        } else {
            console.log('[GAME] returnFromWebApp() -> renderScreen, text_len:', (data.text || '').length);
            renderScreen(data);
        }
    } else {
        console.error('[GAME] returnFromWebApp() failed, data:', data ? JSON.stringify(data).substring(0, 200) : 'null');
        showError('Não foi possível restaurar o jogo. Feche e selecione seu personagem novamente.');
    }
}

/**
 * Request a transition to a specific WebApp via the transition API.
 * @param {string} toApp - Target app name (explore, combat, inventory, etc.)
 * @param {Object} payload - Optional payload for the transition
 */
async function requestTransition(toApp, payload = {}) {
    if (S.transitioning) return;
    S.transitioning = true;

    const url = `${S.apiBase}/api/webapp/transition`;
    const _headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${S.token}`,
    };
    if (window.Telegram?.WebApp?.initData) {
        _headers['X-Telegram-Init-Data'] = Telegram.WebApp.initData;
    }
    _headers['X-Idempotency-Key'] = crypto.randomUUID();
    const MAX_RETRIES = 2;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 12000);
            const resp = await fetch(url, {
                method: 'POST',
                headers: _headers,
                signal: controller.signal,
                body: JSON.stringify({
                    from: 'game',
                    to: toApp,
                    user_id: S.uid,
                    payload,
                }),
            });
            clearTimeout(tid);

            // Auth errors — don't retry, close WebApp
            if (resp.status === 401 || resp.status === 403) {
                S.transitioning = false;
                console.error('[GAME] Transition auth error:', resp.status);
                try {
                    if (window.Telegram?.WebApp?.sendData) {
                        Telegram.WebApp.sendData(JSON.stringify({
                            action: 'webapp_error_close', webapp: 'GAME',
                            reason: resp.status === 401 ? 'session_expired' : 'invalid_init_data',
                        }));
                        return;
                    }
                } catch (_) {}
                showToast('Sessão expirada. Feche e reabra.');
                return;
            }
            // Retry on 5xx / 429
            if ((resp.status >= 500 || resp.status === 429) && attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
                continue;
            }

            let data;
            try { data = await resp.json(); } catch (_) { data = {}; }

            if (data.url) {
                handleTransition({ to: toApp, url: data.url });
                return;
            }
            S.transitioning = false;
            if (data.error) {
                console.error('[GAME] Transition error:', data.error);
                if (data.fallback === 'close') {
                    showToast('Não disponível no momento');
                } else {
                    showError('Transição falhou: ' + (data.error || 'erro desconhecido'));
                }
            } else {
                showError('Transição falhou: resposta inesperada do servidor.');
            }
            return;
        } catch (e) {
            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
                continue;
            }
            console.error('[GAME] Transition fetch error:', e);
            S.transitioning = false;
            showError(e.name === 'AbortError' ? 'Timeout na transição. Tente novamente.' : 'Erro de conexão na transição.');
        }
    }
}

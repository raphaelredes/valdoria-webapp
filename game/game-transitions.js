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

function handleTransition(transition) {
    if (!transition) { console.warn('[GAME] handleTransition() called with null transition'); return; }
    if (!transition.url) { console.warn('[GAME] handleTransition() missing url:', JSON.stringify(transition)); S.transitioning = false; return; }

    S.transitioning = true;
    console.log('[GAME] Transition to:', transition.to, transition.url);

    // Stop ambient particles during transition
    if (typeof stopParticles === 'function') stopParticles();

    // Show immersive location transition for cross-webapp navigation
    const locLabel = _WEBAPP_LOC_LABELS[transition.to];
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

    // Redirect after immersive transition (min 2s for location feel)
    const delay = locLabel ? Math.max(LOC_TRANSITION_MS, transConfig.duration) : transConfig.duration;
    setTimeout(() => {
        window.location.replace(transition.url);
    }, delay);
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
    hideLoading();

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
        showError('Não foi possível restaurar o jogo. Feche e toque em JOGAR novamente.');
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
                    showToast('Não disponível no momento', 2000);
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

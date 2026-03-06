/* ═══════════════════════════════════════════════════════════════
   GAME HUB — Cross-WebApp Transitions
   Handles navigation between the Game Hub and specialized WebApps
   (arena, explore, inventory, levelup, market, navigate).
   ═══════════════════════════════════════════════════════════════ */

/**
 * Handle a transition signal from the server.
 * Redirects to the target WebApp URL.
 * @param {Object} transition - {to: string, url: string, text?: string}
 */
// Themed transition map: target webapp -> CSS theme class + duration
const _TRANSITION_THEMES = {
    explore:  { theme: 'theme-leaves', duration: 500 },
    arena:    { theme: 'theme-combat', duration: 400 },
    navigate: { theme: 'theme-scroll', duration: 500 },
    dungeon:  { theme: 'theme-portal', duration: 500 },
    default:  { theme: '', duration: 350 },
};

function handleTransition(transition) {
    if (!transition) { console.warn('[GAME] handleTransition() called with null transition'); return; }
    if (!transition.url) { console.warn('[GAME] handleTransition() missing url:', JSON.stringify(transition)); return; }
    if (S.transitioning) { console.warn('[GAME] handleTransition() blocked - already transitioning'); return; }

    S.transitioning = true;
    console.log('[GAME] Transition to:', transition.to, transition.url);

    // Stop ambient particles during transition
    if (typeof stopParticles === 'function') stopParticles();

    // Get themed transition
    const transConfig = _TRANSITION_THEMES[transition.to] || _TRANSITION_THEMES.default;

    // Show transition overlay with theme
    const overlay = document.getElementById('transition-overlay');
    if (overlay) {
        overlay.className = 'transition-overlay';
        if (transConfig.theme) overlay.classList.add(transConfig.theme);
        overlay.style.display = '';
        requestAnimationFrame(() => overlay.classList.add('active'));
    }

    // Redirect after themed animation
    setTimeout(() => {
        window.location.replace(transition.url);
    }, transConfig.duration);
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
 * @param {string} toApp - Target app name (explore, arena, inventory, etc.)
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
    _headers['ngrok-skip-browser-warning'] = '1';
    _headers['X-Idempotency-Key'] = crypto.randomUUID();
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: _headers,
            body: JSON.stringify({
                from: 'game',
                to: toApp,
                user_id: S.uid,
                payload,
            }),
        });

        const data = await resp.json();

        if (data.url) {
            handleTransition({ to: toApp, url: data.url });
        } else if (data.error) {
            console.error('[GAME] Transition error:', data.error);
            S.transitioning = false;

            if (data.fallback === 'close') {
                showToast('Não disponível no momento', 2000);
            } else {
                showError('Transição falhou: ' + (data.error || 'erro desconhecido'));
            }
        }
    } catch (e) {
        console.error('[GAME] Transition fetch error:', e);
        S.transitioning = false;
        showError('Erro de conexão na transição.');
    }
}

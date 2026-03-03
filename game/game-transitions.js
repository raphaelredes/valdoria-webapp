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
function handleTransition(transition) {
    if (!transition || !transition.url || S.transitioning) return;

    S.transitioning = true;
    console.log('[GAME] Transition to:', transition.to, transition.url);

    // Show transition overlay
    const overlay = document.getElementById('transition-overlay');
    if (overlay) {
        overlay.style.display = '';
        requestAnimationFrame(() => overlay.classList.add('active'));
    }

    // Redirect after brief animation
    setTimeout(() => {
        window.location.href = transition.url;
    }, 350);
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
    showLoading();
    const data = await apiCall('/api/game/state');
    hideLoading();

    if (data && !data.error) {
        if (data.transition) {
            // Still in a specialized state — redirect again
            handleTransition(data.transition);
        } else {
            renderScreen(data);
        }
    } else {
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
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${S.token}`,
            },
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

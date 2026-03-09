// ═══════════════════════════════════════════════════════════════
// SHARED TRANSITION SAFETY — Error fallback for WebApp transitions
// ═══════════════════════════════════════════════════════════════
// Fundamentacao: Nielsen Heuristic #1 (Visibility of System Status)
//                Nielsen Heuristic #9 (Help Users Recover from Errors)
// See: docs/sistemas/navegacao-estudo.md

/**
 * Safely navigate to a WebApp transition URL with error handling.
 * If the navigation fails (404, timeout, etc.), shows an error overlay
 * and offers a "Return to Game Hub" fallback.
 *
 * @param {string} url - The destination WebApp URL
 * @param {object} opts - Optional: { timeout: 10000, fallbackUrl: '...' }
 */
function safeTransition(url, opts = {}) {
    const timeout = opts.timeout || 10000;
    const webappName = opts.webappName || 'TRANSITION';

    if (!url) {
        console.error('[' + webappName + '] safeTransition called without URL');
        _showTransitionError('URL de destino inválida', webappName);
        return;
    }

    console.log('[' + webappName + '] Transitioning to:', url);

    // Set a timeout to detect if navigation failed (page didn't unload)
    const failTimer = setTimeout(function() {
        // If we're still here after timeout, navigation likely failed
        console.warn('[' + webappName + '] Transition timeout after ' + timeout + 'ms');
        // Don't show error — browser may still be loading
    }, timeout);

    // Use window.location for same-origin transitions
    try {
        window.location.href = url;
    } catch (e) {
        clearTimeout(failTimer);
        console.error('[' + webappName + '] Transition failed:', e);
        _showTransitionError('Falha na transição: ' + e.message, webappName);
    }
}

/**
 * Handle transition response from the API.
 * If response has a transition URL, navigate safely.
 * If response has an error, show it.
 *
 * @param {object} data - API response with { transition: { url, to } } or { error: '...' }
 * @param {object} opts - Options passed to safeTransition
 * @returns {boolean} - true if transition was handled, false otherwise
 */
function handleTransitionResponse(data, opts = {}) {
    if (!data) return false;

    if (data.error) {
        console.error('[TRANSITION] API error:', data.error);
        _showTransitionError(data.error, opts.webappName || 'TRANSITION');
        return true;
    }

    if (data.transition && data.transition.url) {
        safeTransition(data.transition.url, opts);
        return true;
    }

    if (data.url) {
        safeTransition(data.url, opts);
        return true;
    }

    return false;
}

/**
 * Show a transition error overlay with a "Return to Game" button.
 * @param {string} msg - Error message
 * @param {string} tag - WebApp name for logging
 */
function _showTransitionError(msg, tag) {
    console.error('[' + tag + '] Transition error:', msg);

    // Check if overlay already exists
    let overlay = document.getElementById('transition-error-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'transition-error-overlay';
        overlay.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:9999',
            'background:rgba(42,36,32,0.95)',
            'display:flex', 'flex-direction:column',
            'align-items:center', 'justify-content:center',
            'padding:24px', 'font-family:MedievalSharp,Cinzel,serif',
            'color:#d4c8b0',
        ].join(';');
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = [
        '<div style="text-align:center;max-width:320px">',
        '<div style="font-size:32px;margin-bottom:16px">⚔️</div>',
        '<h3 style="color:#c4953a;margin:0 0 12px;font-size:18px">Falha na Navegação</h3>',
        '<p style="font-size:14px;line-height:1.6;margin:0 0 24px;color:#a09484">' + msg + '</p>',
        '<button onclick="_returnToGame()" style="',
            'background:linear-gradient(135deg,#c4953a,#8b6914);',
            'color:#fff;border:none;border-radius:8px;',
            'padding:14px 32px;font-size:16px;cursor:pointer;',
            'font-family:MedievalSharp,Cinzel,serif;',
            'width:100%;max-width:280px',
        '">Voltar ao Jogo</button>',
        '</div>',
    ].join('');
    overlay.style.display = 'flex';
}

/**
 * Return to Game Hub after transition failure.
 */
function _returnToGame() {
    try {
        // Try Telegram WebApp close first
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.close();
            return;
        }
    } catch (e) { /* ignore */ }

    // Fallback: navigate to game hub
    try {
        var base = window._apiBase || window.API_BASE || '';
        if (base) {
            var gameUrl = base.replace(/\/api\/.*/, '/game/');
            window.location.href = gameUrl;
            return;
        }
    } catch (e) { /* ignore */ }

    // Last resort: go back in history
    window.history.back();
}

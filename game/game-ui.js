/* ═══════════════════════════════════════════════════════════════
   GAME HUB — UI Components
   Toast, loading, error, timer overlays, screen transitions.
   ═══════════════════════════════════════════════════════════════ */

// ─── Loading ───
function showLoading() {
    const el = document.getElementById('loading');
    if (el) el.style.display = '';
}

function hideLoading() {
    const el = document.getElementById('loading');
    if (el) el.style.display = 'none';
}

// ─── Toast Notification ───
let _toastTimeout = null;

function showToast(text, duration = 2000) {
    const el = document.getElementById('toast');
    if (!el) return;

    if (_toastTimeout) clearTimeout(_toastTimeout);

    el.textContent = text;
    el.classList.remove('hiding');
    el.style.display = '';

    _toastTimeout = setTimeout(() => {
        el.classList.add('hiding');
        setTimeout(() => { el.style.display = 'none'; el.classList.remove('hiding'); }, 300);
    }, duration);
}

// ─── Error Overlay ───
function showError(msg, err = null) {
    console.error('[GAME]', msg, err || '');

    const overlay = document.getElementById('error-overlay');
    const msgEl = document.getElementById('error-msg');
    const retryBtn = document.getElementById('error-retry');
    const fallbackBtn = document.getElementById('error-fallback');

    if (!overlay || !msgEl) return;

    msgEl.textContent = msg;
    overlay.style.display = '';

    // Hide loading
    hideLoading();

    retryBtn.onclick = () => {
        overlay.style.display = 'none';
        // Try to reconnect
        if (S.currentScreen) {
            fetchState(false);
        } else {
            startGame();
        }
    };

    // Show "Jogar pelo Chat" fallback for connection errors
    if (fallbackBtn) {
        const isConnectionError = msg.includes('Sem conexão') || msg.includes('Erro no servidor');
        fallbackBtn.style.display = isConnectionError ? '' : 'none';
        fallbackBtn.onclick = isConnectionError ? () => {
            fallbackBtn.disabled = true;
            try {
                Telegram.WebApp.sendData(JSON.stringify({
                    action: 'game_hub_fallback',
                    char_id: S.charId || '',
                }));
            } catch (e) {
                console.error('[GAME] sendData fallback failed:', e);
                Telegram.WebApp.close();
            }
        } : null;
    }
}

function hideError() {
    const el = document.getElementById('error-overlay');
    if (el) el.style.display = 'none';
}

// ─── Screen Transition Animation ───
function animateScreenTransition(renderFn) {
    const screenEl = document.getElementById('screen');
    const panelEl = document.getElementById('bottom-panel');
    if (!screenEl) { renderFn(); return; }

    // Content fades out fully
    screenEl.classList.add('fade-out');
    // Bottom panel dims subtly (stays present, acknowledges change)
    if (panelEl) {
        panelEl.style.opacity = '0.5';
        panelEl.style.transition = 'opacity 0.1s ease';
    }

    setTimeout(() => {
        renderFn();
        screenEl.classList.remove('fade-out');
        screenEl.classList.add('fade-in');
        if (panelEl) {
            panelEl.style.opacity = '1';
            panelEl.style.transition = 'opacity 0.15s ease';
        }
        setTimeout(() => {
            screenEl.classList.remove('fade-in');
            if (panelEl) panelEl.style.transition = '';
        }, 200);
    }, 150);
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
    labelEl.textContent = timer.type === 'reaction' ? 'Reação!' : 'Sua vez!';
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

    _applyImmersive();
}

/* ═══════════════════════════════════════════════════════════════
   GAME HUB — UI Components
   Toast, loading, error, timer overlays, screen transitions.
   ═══════════════════════════════════════════════════════════════ */

// ─── Loading (with cycling tips) ───
const _LOADING_TIPS = [
    'Preparando sua aventura...',
    '⚔️ Dica: Combine ataques com aliados para dano extra!',
    '🛡️ Dica: Descansar na estalagem recupera todos os dados de vida.',
    '🎲 Dica: Rolagens de ataque 20 são acertos críticos — dano dobrado!',
    '💰 Dica: Venda itens que não usa no mercado da cidade.',
    '📜 Dica: Converse com NPCs para descobrir quests escondidas.',
    '🏰 Dica: A Guilda de Aventureiros oferece missões com boas recompensas.',
    '🧪 Dica: Poções podem ser usadas durante o combate como ação bônus.',
    '⭐ Dica: Suba de nível para desbloquear novas habilidades de classe.',
    '🐉 Dica: Inimigos mais fortes concedem mais XP e ouro.',
];
let _loadingTipTimer = null;
let _loadingTipIndex = 0;
let _loadingProgressTimer = null;
let _loadingProgress = 0;

function showLoading() {
    const el = document.getElementById('loading');
    if (el) el.style.display = '';
    _startLoadingTips();
    _startLoadingProgress();
    _startLoadingTimeout();
}

function hideLoading() {
    const el = document.getElementById('loading');
    // Fill progress to 100% before hiding
    const bar = document.getElementById('loading-progress');
    if (bar) bar.style.width = '100%';
    _stopLoadingProgress();
    _stopLoadingTimeout();

    setTimeout(() => {
        if (el) {
            el.style.opacity = '1';
            el.style.transition = 'opacity 0.4s ease';
            el.style.opacity = '0';
            setTimeout(() => { el.style.display = 'none'; el.style.opacity = ''; el.style.transition = ''; }, 400);
        }
        _stopLoadingTips();
    }, 200);
}

function _startLoadingProgress() {
    _stopLoadingProgress();
    _loadingProgress = 0;
    const bar = document.getElementById('loading-progress');
    if (bar) bar.style.width = '0%';
    _loadingProgressTimer = setInterval(() => {
        // Asymptotic progress — slows as it approaches 90%
        const remaining = 90 - _loadingProgress;
        _loadingProgress += remaining * 0.06;
        if (bar) bar.style.width = _loadingProgress + '%';
    }, 200);
}

function _stopLoadingProgress() {
    if (_loadingProgressTimer) {
        clearInterval(_loadingProgressTimer);
        _loadingProgressTimer = null;
    }
}

function _startLoadingTips() {
    _stopLoadingTips();
    _loadingTipIndex = 0;
    const tipEl = document.getElementById('loading-tip');
    if (tipEl) tipEl.textContent = _LOADING_TIPS[0];
    _loadingTipTimer = setInterval(() => {
        _loadingTipIndex = (_loadingTipIndex + 1) % _LOADING_TIPS.length;
        const tipEl = document.getElementById('loading-tip');
        if (tipEl) {
            tipEl.style.opacity = '0';
            setTimeout(() => {
                tipEl.textContent = _LOADING_TIPS[_loadingTipIndex];
                tipEl.style.opacity = '';
            }, 300);
        }
    }, 3500);
}

function _stopLoadingTips() {
    if (_loadingTipTimer) {
        clearInterval(_loadingTipTimer);
        _loadingTipTimer = null;
    }
}

// ─── Loading Timeout (prevents infinite loading screen) ───
function _startLoadingTimeout() {
    _stopLoadingTimeout();
    if (typeof LOADING_TIMEOUT_MS === 'undefined') return;
    _loadingTimeoutId = setTimeout(() => {
        const el = document.getElementById('loading');
        if (el && el.style.display !== 'none') {
            console.error('[GAME] Loading timeout — server did not respond in time');
            hideLoading();
            showError('O servidor demorou demais para responder. Tente novamente.');
        }
    }, LOADING_TIMEOUT_MS);
}

function _stopLoadingTimeout() {
    if (typeof _loadingTimeoutId !== 'undefined' && _loadingTimeoutId) {
        clearTimeout(_loadingTimeoutId);
        _loadingTimeoutId = null;
    }
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
let _errorAutoRetryTimer = null;
let _errorRetryAttempt = 0;
const _ERROR_RETRY_BASE = 5;    // seconds
const _ERROR_RETRY_CAP = 40;    // max seconds between retries
const _ERROR_RETRY_MAX = 6;     // give up after this many auto-retries

function showError(msg, err = null) {
    console.error('[GAME]', msg, err || '');

    const overlay = document.getElementById('error-overlay');
    const msgEl = document.getElementById('error-msg');
    const retryBtn = document.getElementById('error-retry');
    const recoverBtn = document.getElementById('error-recover');

    if (!overlay || !msgEl) return;

    msgEl.textContent = msg;
    overlay.style.display = '';

    // Hide loading
    hideLoading();

    // Clear previous auto-retry timer
    if (_errorAutoRetryTimer) {
        clearInterval(_errorAutoRetryTimer);
        _errorAutoRetryTimer = null;
    }

    const doRetry = async () => {
        if (_errorAutoRetryTimer) {
            clearInterval(_errorAutoRetryTimer);
            _errorAutoRetryTimer = null;
        }
        overlay.style.display = 'none';
        retryBtn.textContent = 'Tentar Novamente';

        // Always re-check health before retrying — server may have restarted
        const healthy = await checkHealth();
        if (!healthy) {
            showError('Servidor indisponível. Tente novamente em alguns segundos.');
            return;
        }

        if (S.currentScreen) {
            fetchState(false);
        } else {
            startGame();
        }
    };

    retryBtn.onclick = () => {
        _errorRetryAttempt = 0; // manual retry resets counter
        doRetry();
    };

    // Recovery button: close the WebApp and return to Telegram chat
    // The user can then re-select a character and tap JOGAR again
    if (recoverBtn) {
        recoverBtn.onclick = () => {
            if (window.Telegram?.WebApp?.close) {
                Telegram.WebApp.close();
            } else {
                window.close();
            }
        };
    }

    // Auto-retry with exponential backoff for connection errors
    const isConnectionError = msg.includes('Sem conexão') || msg.includes('Erro no servidor')
        || msg.includes('indisponível') || msg.includes('não respondeu');
    if (isConnectionError && _errorRetryAttempt < _ERROR_RETRY_MAX) {
        _errorRetryAttempt++;
        // Exponential backoff with jitter: ~5s, ~10s, ~20s, ~40s...
        // Jitter prevents synchronized retries from multiple clients
        const base = Math.min(_ERROR_RETRY_BASE * Math.pow(2, _errorRetryAttempt - 1), _ERROR_RETRY_CAP);
        const jitter = Math.random() * 2 - 1; // -1 to +1 second
        const delaySec = Math.max(2, Math.round(base + jitter));
        let countdown = delaySec;
        retryBtn.textContent = `Tentando novamente em ${countdown}s... (${_errorRetryAttempt}/${_ERROR_RETRY_MAX})`;
        _errorAutoRetryTimer = setInterval(() => {
            countdown--;
            if (countdown <= 0) {
                doRetry();
            } else {
                retryBtn.textContent = `Tentando novamente em ${countdown}s... (${_errorRetryAttempt}/${_ERROR_RETRY_MAX})`;
            }
        }, 1000);
    } else if (isConnectionError) {
        // All retries exhausted — auto-close and notify bot to refresh session
        _autoReconnect(overlay, msgEl, retryBtn);
    }
}

function _autoReconnect(overlay, msgEl, retryBtn) {
    // All retries failed — notify backend via API to refresh Telegram message,
    // then close the WebApp. sendData() only works with KeyboardButton Mini Apps,
    // so we use a fetch() call to /api/game/reconnect instead.
    console.warn('[GAME] Auto-reconnect: all retries exhausted, closing WebApp');
    msgEl.textContent = 'Reconectando... O mini app sera fechado automaticamente.';
    retryBtn.style.display = 'none';
    const recoverBtn = document.getElementById('error-recover');
    if (recoverBtn) recoverBtn.style.display = 'none';

    const closeApp = () => {
        if (window.Telegram?.WebApp?.close) {
            Telegram.WebApp.close();
        } else {
            window.close();
        }
    };

    // Try to notify the backend to re-send character selection
    if (S.apiBase && S.token) {
        fetch(S.apiBase + '/api/game/reconnect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': '1',
            },
            body: JSON.stringify({ token: S.token }),
        })
        .then(r => { console.log('[GAME] Reconnect API:', r.status); })
        .catch(e => { console.warn('[GAME] Reconnect API failed:', e.message); })
        .finally(() => { setTimeout(closeApp, 1500); });
    } else {
        // No API available — just close after delay
        setTimeout(closeApp, 2000);
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

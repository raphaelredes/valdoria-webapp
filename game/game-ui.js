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

let _isRetryLoading = false;
let _loadingSlowTimer = null;

function showLoading(isRetry = false) {
    const el = document.getElementById('loading');
    if (el) el.style.display = '';
    _isRetryLoading = isRetry;
    _startLoadingProgress();
    _startLoadingTimeout();
    _startSlowWarning();

    if (isRetry) {
        // During retry: show fixed "Reconectando..." — don't cycle tips
        _stopLoadingTips();
        const tipEl = document.getElementById('loading-tip');
        if (tipEl) tipEl.textContent = '🔄 Reconectando ao servidor...';
    } else {
        _startLoadingTips();
    }
}

function hideLoading() {
    const el = document.getElementById('loading');
    // Fill progress to 100% before hiding
    const bar = document.getElementById('loading-progress');
    if (bar) bar.style.width = '100%';
    _stopLoadingProgress();
    _stopLoadingTimeout();
    _stopSlowWarning();
    _isRetryLoading = false;

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

// ─── Loading Slow Warning (visual cue after 10s) ───
function _startSlowWarning() {
    _stopSlowWarning();
    _loadingSlowTimer = setTimeout(() => {
        const el = document.getElementById('loading');
        if (el && el.style.display !== 'none') {
            const tipEl = document.getElementById('loading-tip');
            if (tipEl) {
                tipEl.style.opacity = '0';
                setTimeout(() => {
                    tipEl.textContent = _isRetryLoading
                        ? '⏳ Servidor demorando para responder...'
                        : '⏳ Carregamento demorando mais que o normal...';
                    tipEl.style.opacity = '';
                    tipEl.classList.add('loading-tip-slow');
                }, 300);
            }
        }
    }, 10000);
}

function _stopSlowWarning() {
    if (_loadingSlowTimer) {
        clearTimeout(_loadingSlowTimer);
        _loadingSlowTimer = null;
    }
    const tipEl = document.getElementById('loading-tip');
    if (tipEl) tipEl.classList.remove('loading-tip-slow');
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

    // Context-aware error icon
    const iconEl = overlay.querySelector('.error-icon');
    if (iconEl) {
        if (msg.includes('Sem conexão') || msg.includes('internet'))
            iconEl.textContent = '📡';
        else if (msg.includes('não respondeu') || msg.includes('demorou'))
            iconEl.textContent = '⏳';
        else if (msg.includes('expirada') || msg.includes('Sessão'))
            iconEl.textContent = '🔒';
        else if (msg.includes('Personagem não encontrado'))
            iconEl.textContent = '👤';
        else
            iconEl.textContent = '⚠️';
    }

    // Show network status badge
    _updateNetworkBadge();

    // Populate debug log panel
    _populateDebugLog(err);

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

        // Show loading overlay during health check (prevents blank screen)
        showLoading(true); // isRetry = true → shows "Reconectando..."
        if (typeof _clog === 'function') _clog('RETRY health check...');

        // Always re-check health before retrying — server may have restarted
        const healthy = await checkHealth();
        if (!healthy) {
            if (typeof _clog === 'function') _clog('RETRY health FAILED');
            hideLoading();
            showError('Servidor indisponível. Tente novamente em alguns segundos.');
            return;
        }
        if (typeof _clog === 'function') _clog('RETRY health OK → loading state');

        // Loading will be hidden by startGame()/fetchState()
        if (S.currentScreen) {
            fetchState(false);
        } else {
            startGame();
        }
    };

    retryBtn.onclick = () => {
        _errorRetryAttempt = 0; // manual retry resets counter
        const pb = document.getElementById('error-retry-progress');
        if (pb) { pb.style.transition = 'none'; pb.style.width = '0%'; }
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
        || msg.includes('indisponível') || msg.includes('não respondeu')
        || msg.includes('demorou demais');
    if (isConnectionError && _errorRetryAttempt < _ERROR_RETRY_MAX) {
        _errorRetryAttempt++;
        if (typeof _clog === 'function') _clog(`AUTO-RETRY ${_errorRetryAttempt}/${_ERROR_RETRY_MAX}: ${msg}`);
        // Exponential backoff with jitter: ~5s, ~10s, ~20s, ~40s...
        // Jitter prevents synchronized retries from multiple clients
        const base = Math.min(_ERROR_RETRY_BASE * Math.pow(2, _errorRetryAttempt - 1), _ERROR_RETRY_CAP);
        const jitter = Math.random() * 2 - 1; // -1 to +1 second
        const delaySec = Math.max(2, Math.round(base + jitter));
        let countdown = delaySec;
        retryBtn.textContent = `Tentando novamente em ${countdown}s... (${_errorRetryAttempt}/${_ERROR_RETRY_MAX})`;

        // Animate progress bar under retry button
        const progBar = document.getElementById('error-retry-progress');
        if (progBar) {
            progBar.style.transition = 'none';
            progBar.style.width = '0%';
            // Force reflow then animate
            progBar.offsetHeight;
            progBar.style.transition = `width ${delaySec}s linear`;
            progBar.style.width = '100%';
        }

        _errorAutoRetryTimer = setInterval(() => {
            countdown--;
            if (countdown <= 0) {
                if (progBar) { progBar.style.transition = 'none'; progBar.style.width = '0%'; }
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
    if (typeof _clog === 'function') _clog(`AUTO-RECONNECT: all ${_ERROR_RETRY_MAX} retries exhausted, closing WebApp`);
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

// ─── Network Status Badge ───
let _networkBadgeListening = false;

function _updateNetworkBadge() {
    const badge = document.getElementById('error-network-badge');
    if (!badge) return;
    const online = navigator.onLine;
    badge.style.display = '';
    badge.className = 'error-network-badge ' + (online ? 'online' : 'offline');
    badge.textContent = online ? '🟢 Conectado à internet' : '🔴 Sem conexão com a internet';

    // Live updates while error overlay is open
    if (!_networkBadgeListening) {
        _networkBadgeListening = true;
        const handler = () => {
            const overlay = document.getElementById('error-overlay');
            if (overlay && overlay.style.display !== 'none') {
                _updateNetworkBadge();
            }
        };
        window.addEventListener('online', handler);
        window.addEventListener('offline', handler);
    }
}

// ─── Debug Log Panel (inside error overlay) ───
let _debugPanelReady = false;

function _populateDebugLog(err) {
    const logEl = document.getElementById('error-debug-log');
    const wrapEl = document.getElementById('error-debug-wrap');
    const toggleBtn = document.getElementById('error-debug-toggle');
    const copyBtn = document.getElementById('error-debug-copy');
    if (!logEl || !wrapEl || !toggleBtn) return;

    // Build log text
    const logText = typeof getConnectionLog === 'function'
        ? getConnectionLog() + (err ? '\n\nERROR: ' + (err.stack || err.message || err) : '')
        : 'Log indisponível' + (err ? '\n' + (err.stack || err.message || err) : '');
    logEl.textContent = logText;

    // Reset panel state
    wrapEl.style.display = 'none';
    toggleBtn.textContent = '📋 Ver detalhes técnicos ▸';

    if (!_debugPanelReady) {
        _debugPanelReady = true;
        toggleBtn.onclick = () => {
            const visible = wrapEl.style.display !== 'none';
            wrapEl.style.display = visible ? 'none' : '';
            toggleBtn.textContent = visible
                ? '📋 Ver detalhes técnicos ▸'
                : '📋 Ocultar detalhes ▾';
        };
        if (copyBtn) {
            copyBtn.onclick = () => {
                const text = logEl.textContent || '';
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(() => {
                        copyBtn.textContent = '✅ Copiado!';
                        setTimeout(() => { copyBtn.textContent = '📋 Copiar log'; }, 2000);
                    }).catch(() => _fallbackCopy(text, copyBtn));
                } else {
                    _fallbackCopy(text, copyBtn);
                }
            };
        }
    }
}

function _fallbackCopy(text, btn) {
    // Fallback for environments without clipboard API
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        btn.textContent = '✅ Copiado!';
        setTimeout(() => { btn.textContent = '📋 Copiar log'; }, 2000);
    } catch (e) {
        btn.textContent = '❌ Falha ao copiar';
        setTimeout(() => { btn.textContent = '📋 Copiar log'; }, 2000);
    }
    document.body.removeChild(ta);
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
    labelEl.textContent = timer.type === 'reaction' ? 'Reação!' : 'Decidir!';
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

// ─── Location Transition Overlay (immersive 2s travel screen) ───
const _LOC_TRANSITIONS = {
    // City locations
    city_tavern:     { icon: '🍺', text: 'Caminhando até a Taverna...' },
    city_temple:     { icon: '⛪', text: 'Seguindo ao Templo...' },
    city_market:     { icon: '🏪', text: 'Indo ao Mercado...' },
    city_bank:       { icon: '🏦', text: 'Entrando no Banco...' },
    city_guild:      { icon: '⚔️', text: 'Chegando na Guilda...' },
    city_arena:      { icon: '🏟️', text: 'Entrando na Arena...' },
    city_locations:  { icon: '🏰', text: 'Explorando a cidade...' },
    // Travel / exploration
    depart:          { icon: '🗺️', text: 'Partindo para aventura...' },
    action_depart:   { icon: '🗺️', text: 'Partindo para aventura...' },
    trail_:          { icon: '🥾', text: 'Seguindo a trilha...' },
    explore_:        { icon: '🧭', text: 'Explorando o caminho...' },
    // Return / Arrival
    action_city_entry: { icon: '🏰', text: 'Avistando os portões de Eldoria...' },
    action_enter_city: { icon: '🏰', text: 'Entrando em Eldoria...' },
    return_city:     { icon: '🏰', text: 'Retornando à cidade...' },
    action_return:   { icon: '🏰', text: 'Retornando à cidade...' },
    city_back:       { icon: '🏰', text: 'Voltando à praça central...' },
    // Combat end
    combat_end:      { icon: '⚔️', text: 'Recolhendo espólios...' },
    // Rest
    rest:            { icon: '🏕️', text: 'Descansando...' },
    long_rest:       { icon: '🛏️', text: 'Descansando na estalagem...' },
};
// Callbacks that should NOT trigger location transition (UI panels, not travel)
const _NO_TRANSITION = /^(inv|char|status|help|settings|quest_view|action_universal_back|menu|equip|unequip|use_|sell_|buy_|deposit|withdraw|donate|skill_|feat_|spell_|npc_talk|dialogue|gossip|quest_accept|quest_deliver|shop_)/;

const LOC_TRANSITION_MS = 2000;
let _locTransitionActive = false;

function _detectLocationTransition(cb) {
    if (!cb || _NO_TRANSITION.test(cb)) return null;
    // Exact match first
    if (_LOC_TRANSITIONS[cb]) return _LOC_TRANSITIONS[cb];
    // Prefix match
    for (const [prefix, ctx] of Object.entries(_LOC_TRANSITIONS)) {
        if (prefix.endsWith('_') && cb.startsWith(prefix)) return ctx;
    }
    return null;
}

function showLocationTransition(ctx) {
    const el = document.getElementById('loc-transition');
    if (!el) return;
    _locTransitionActive = true;
    el.classList.remove('hiding');
    el.style.display = '';
    const iconEl = document.getElementById('loc-icon');
    const textEl = document.getElementById('loc-text');
    if (iconEl) iconEl.textContent = ctx.icon || '🗺️';
    if (textEl) textEl.textContent = ctx.text || 'Viajando...';
    haptic('medium');
}

function hideLocationTransition() {
    const el = document.getElementById('loc-transition');
    if (!el || !_locTransitionActive) return;
    _locTransitionActive = false;
    el.classList.add('hiding');
    setTimeout(() => { el.style.display = 'none'; el.classList.remove('hiding'); }, 400);
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

    // Auto-collapse on text-heavy screens (narrative events, long descriptions)
    // so the player can read the full story without the menu taking space
    if (screen && _immersiveEligible && !_immersiveCollapsed && !screen.waiting_for_text) {
        const textLen = (screen.text || '').length;
        const isDialogue = !!screen.dialogue;
        if (textLen > 280 || isDialogue) {
            _immersiveCollapsed = true;
            // Don't persist to localStorage — this is a per-screen auto-collapse
        }
    }

    _applyImmersive();
}

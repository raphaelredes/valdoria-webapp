/* ═══════════════════════════════════════════════════════════════
   VALDORIA ERROR REPORTER — Shared across all WebApps
   Connection debug log, error overlay, admin reporting, offline queue.
   Usage: ValdoriaErrors.init({ appName, apiBase, token, uid, ... })
   ═══════════════════════════════════════════════════════════════ */

/* global Telegram */
// eslint-disable-next-line no-unused-vars
var ValdoriaErrors = (function () {
    'use strict';

    // ─── Config ───
    var _cfg = {
        appName: 'APP',
        apiBase: '',
        token: '',
        uid: 0,
        getScreenId: function () { return ''; },
        onRetry: null,
        onClose: null,
    };
    var _initialized = false;

    // ─── Connection Debug Log (ring buffer + localStorage) ───
    var _connLog = [];
    var _CONN_LOG_MAX = 30;
    var _CONN_LOG_LS_KEY = 'valdoria_conn_log';
    var _clogFlushTimer = null;
    var _sessionStartTime = Date.now();
    var _jsErrorCount = 0;
    var _retryAttempt = 0;

    function _clog(msg) {
        var ts = new Date().toISOString().substring(11, 23);
        _connLog.push('[' + ts + '] ' + msg);
        if (_connLog.length > _CONN_LOG_MAX) _connLog.shift();
        if (!_clogFlushTimer) {
            _clogFlushTimer = setTimeout(function () {
                _clogFlushTimer = null;
                try { localStorage.setItem(_CONN_LOG_LS_KEY, JSON.stringify(_connLog)); } catch (e) { /* quota */ }
            }, 500);
        }
    }

    // Restore from previous session
    try {
        var prev = JSON.parse(localStorage.getItem(_CONN_LOG_LS_KEY) || '[]');
        if (prev.length) {
            _connLog.push('── previous session ──');
            for (var i = Math.max(0, prev.length - 8); i < prev.length; i++) _connLog.push(prev[i]);
            _connLog.push('── current session ──');
        }
    } catch (e) { /* */ }

    // Flush on unload
    window.addEventListener('beforeunload', function () {
        try { localStorage.setItem(_CONN_LOG_LS_KEY, JSON.stringify(_connLog)); } catch (e) { /* */ }
    });

    // ─── Device & Network Info ───
    function _getDeviceInfo() {
        var tg = window.Telegram && window.Telegram.WebApp;
        var parts = [];
        if (tg && tg.platform) parts.push('platform:' + tg.platform);
        parts.push(screen.width + 'x' + screen.height);
        parts.push('vp:' + window.innerWidth + 'x' + window.innerHeight);
        if (tg && tg.colorScheme) parts.push(tg.colorScheme);
        return parts.join(' ') || 'N/A';
    }

    function _getNetworkInfo() {
        var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!conn) return 'N/A';
        var parts = [];
        if (conn.effectiveType) parts.push(conn.effectiveType);
        if (conn.downlink) parts.push(conn.downlink + 'Mbps');
        if (conn.rtt) parts.push('rtt:' + conn.rtt + 'ms');
        if (conn.saveData) parts.push('save-data');
        return parts.join(' ') || 'N/A';
    }

    function _classifyError(msg) {
        if (!msg) return 'unknown';
        if (msg.indexOf('Sem conexão') >= 0 || msg.indexOf('internet') >= 0 || msg.indexOf('offline') >= 0) return 'network';
        if (msg.indexOf('não respondeu') >= 0 || msg.indexOf('demorou') >= 0 || msg.indexOf('timeout') >= 0) return 'timeout';
        if (msg.indexOf('expirada') >= 0 || msg.indexOf('Sessão') >= 0 || msg.indexOf('401') >= 0) return 'session';
        if (msg.indexOf('Personagem não encontrado') >= 0 || msg.indexOf('player_not_found') >= 0) return 'player';
        if (msg.indexOf('indisponível') >= 0 || msg.indexOf('500') >= 0 || msg.indexOf('Erro no servidor') >= 0) return 'server';
        return 'unknown';
    }

    function _getConnectionLog() {
        var sec = Math.round((Date.now() - _sessionStartTime) / 1000);
        var dur = sec < 60 ? sec + 's' : Math.floor(sec / 60) + 'm' + (sec % 60) + 's';
        var header = [
            '── Valdoria Debug [' + _cfg.appName + '] ──',
            'Time: ' + new Date().toISOString(),
            'API: ' + (_cfg.apiBase || '(not set)'),
            'UID: ' + (_cfg.uid || 0),
            'Token: ' + (_cfg.token ? _cfg.token.substring(0, 8) + '...' : '(missing)'),
            'Screen: ' + _cfg.getScreenId(),
            'Device: ' + _getDeviceInfo(),
            'UA: ' + navigator.userAgent.substring(0, 80),
            'Online: ' + navigator.onLine + '  Network: ' + _getNetworkInfo(),
            'TG: ' + ((window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.version) || 'N/A'),
            'Session: ' + dur + '  Retries: ' + _retryAttempt + '  JS Errors: ' + _jsErrorCount,
            '─────────────────────────────',
        ];
        return header.concat(_connLog).join('\n');
    }

    // ─── Error Overlay HTML Template ───
    var _OVERLAY_HTML =
        '<div id="v-err-overlay" class="v-err-overlay" style="display:none">' +
            '<div class="v-err-content">' +
                '<div id="v-err-icon" class="v-err-icon">⚠️</div>' +
                '<div id="v-err-network" class="v-err-network" style="display:none"></div>' +
                '<div id="v-err-msg" class="v-err-msg"></div>' +
                '<div id="v-err-hint" class="v-err-hint"></div>' +
                '<div class="v-err-retry-wrap">' +
                    '<button id="v-err-retry" class="v-err-btn" style="display:none">Tentar Novamente</button>' +
                    '<div id="v-err-retry-progress" class="v-err-retry-progress" style="width:0"></div>' +
                '</div>' +
                '<button id="v-err-close" class="v-err-btn v-err-btn-secondary" style="display:none">' +
                    '🔙 Fechar e Voltar ao Chat</button>' +
                '<div id="v-err-auto-report" class="v-err-auto-report" style="display:none">' +
                    '📡 Erro registrado — será enviado automaticamente</div>' +
            '</div>' +
        '</div>';

    // ─── Show Error (full overlay) ───
    var _autoRetryTimer = null;
    var _RETRY_BASE = 2;       // Faster retry cycle
    var _RETRY_CAP = 8;        // Quick escalation to auto-reconnect
    var _RETRY_MAX = 3;   // Fast fail: 3 retries then auto-reconnect via sendData

    // ─── Cached DOM refs (populated once after init) ───
    var _els = {};
    function _cacheEls() {
        if (_els.overlay) return;
        _els.overlay = document.getElementById('v-err-overlay');
        _els.msg = document.getElementById('v-err-msg');
        _els.retry = document.getElementById('v-err-retry');
        _els.close = document.getElementById('v-err-close');
        _els.icon = document.getElementById('v-err-icon');
        _els.hint = document.getElementById('v-err-hint');
        _els.network = document.getElementById('v-err-network');
        _els.progress = document.getElementById('v-err-retry-progress');
        _els.autoReport = document.getElementById('v-err-auto-report');
    }

    var _lastReportedMsg = '';

    function showError(msg, err) {
        console.error('[' + _cfg.appName + ']', msg, err || '');
        _clog('ERROR: ' + msg);

        _cacheEls();
        if (!_els.overlay) return;
        var retryBtn = _els.retry;
        var closeBtn = _els.close;

        _els.msg.textContent = msg;
        _els.overlay.style.display = '';

        // Context-aware icon
        var iconEl = _els.icon;
        if (iconEl) {
            if (msg.indexOf('Sem conexão') >= 0 || msg.indexOf('internet') >= 0) iconEl.textContent = '📡';
            else if (msg.indexOf('não respondeu') >= 0 || msg.indexOf('demorou') >= 0) iconEl.textContent = '⏳';
            else if (msg.indexOf('expirada') >= 0 || msg.indexOf('Sessão') >= 0) iconEl.textContent = '🔒';
            else if (msg.indexOf('Personagem não encontrado') >= 0) iconEl.textContent = '👤';
            else iconEl.textContent = '⚠️';
        }

        // Actionable hint
        var hintEl = _els.hint;
        if (hintEl) {
            if (msg.indexOf('Sem conexão') >= 0 || msg.indexOf('internet') >= 0) {
                if (navigator.onLine)
                    hintEl.textContent = 'Sua internet parece normal. O servidor pode estar temporariamente indisponível.';
                else
                    hintEl.textContent = 'Verifique se o Wi-Fi ou dados móveis estão ativos.';
            }
            else if (msg.indexOf('não respondeu') >= 0 || msg.indexOf('demorou') >= 0)
                hintEl.textContent = 'O servidor pode estar sobrecarregado. Tentaremos reconectar automaticamente.';
            else if (msg.indexOf('indisponível') >= 0)
                hintEl.textContent = 'O servidor está em manutenção ou reiniciando. Tente novamente em alguns instantes.';
            else if (msg.indexOf('expirada') >= 0 || msg.indexOf('Sessão') >= 0)
                hintEl.textContent = 'Feche o mini app e selecione seu personagem novamente.';
            else if (msg.indexOf('Personagem não encontrado') >= 0)
                hintEl.textContent = 'Feche o mini app e selecione um personagem novamente.';
            else if (msg.indexOf('Resposta inválida') >= 0)
                hintEl.textContent = 'Resposta inesperada do servidor. O erro foi registrado e será analisado.';
            else
                hintEl.textContent = '';
        }

        // Network badge
        _updateNetworkBadge();

        // Hide any loading overlay (different IDs across WebApps)
        var loadIds = ['loading', 'loadingOverlay'];
        for (var li = 0; li < loadIds.length; li++) {
            var loadEl = document.getElementById(loadIds[li]);
            if (loadEl) { loadEl.style.display = 'none'; loadEl.classList.remove('active'); }
        }

        // Clear previous auto-retry
        if (_autoRetryTimer) { clearInterval(_autoRetryTimer); _autoRetryTimer = null; }

        var hasApi = !!_cfg.apiBase;

        // Retry button (API tier only, or if custom onRetry provided)
        if (retryBtn) {
            if (hasApi || _cfg.onRetry) {
                retryBtn.style.display = '';
                retryBtn.textContent = 'Tentar Novamente';
                retryBtn.disabled = false;
                retryBtn.onclick = function () {
                    _retryAttempt = 0;
                    if (_els.progress) { _els.progress.style.transition = 'none'; _els.progress.style.width = '0%'; }
                    _doRetry();
                };
            } else {
                retryBtn.style.display = 'none';
            }
        }

        // Close button (always shown) — sends data to bot so it can show the menu
        if (closeBtn) {
            closeBtn.style.display = '';
            closeBtn.onclick = function () {
                if (_cfg.onClose) return _cfg.onClose();
                _sendCloseAndReturn();
            };
        }

        // Auto-report: queue error report automatically (dedup: skip if same msg)
        if (hasApi && msg !== _lastReportedMsg) {
            _lastReportedMsg = msg;
            _reportError().catch(function () { /* queued offline */ });
        }
        if (_els.autoReport) _els.autoReport.style.display = hasApi ? '' : 'none';

        // Auto-retry with exponential backoff (connection errors, API tier)
        var isConnectionError = msg.indexOf('Sem conexão') >= 0 || msg.indexOf('Erro no servidor') >= 0
            || msg.indexOf('indisponível') >= 0 || msg.indexOf('não respondeu') >= 0
            || msg.indexOf('demorou demais') >= 0;

        if (isConnectionError && (hasApi || _cfg.onRetry) && _retryAttempt < _RETRY_MAX) {
            _retryAttempt++;
            _clog('AUTO-RETRY ' + _retryAttempt + '/' + _RETRY_MAX + ': ' + msg);
            var base = Math.min(_RETRY_BASE * Math.pow(2, _retryAttempt - 1), _RETRY_CAP);
            var jitter = Math.random() * 2 - 1;
            var delaySec = Math.max(2, Math.round(base + jitter));
            var countdown = delaySec;
            if (retryBtn) retryBtn.textContent = 'Tentando novamente em ' + countdown + 's... (' + _retryAttempt + '/' + _RETRY_MAX + ')';

            var progBar = _els.progress;
            if (progBar) {
                progBar.style.transition = 'none';
                progBar.style.width = '0%';
                progBar.offsetHeight; // force reflow
                progBar.style.transition = 'width ' + delaySec + 's linear';
                progBar.style.width = '100%';
            }

            _autoRetryTimer = setInterval(function () {
                countdown--;
                if (countdown <= 0) {
                    if (progBar) { progBar.style.transition = 'none'; progBar.style.width = '0%'; }
                    _doRetry();
                } else if (retryBtn) {
                    retryBtn.textContent = 'Tentando novamente em ' + countdown + 's... (' + _retryAttempt + '/' + _RETRY_MAX + ')';
                }
            }, 1000);
        } else if (isConnectionError && (hasApi || _cfg.onRetry)) {
            // All retries exhausted
            _autoReconnect();
        }
    }

    function _doRetry() {
        if (_autoRetryTimer) { clearInterval(_autoRetryTimer); _autoRetryTimer = null; }
        _clog('RETRY attempt...');

        // Before retrying, check health to detect tunnel URL changes
        var url = _cfg.apiBase + '/api/game/health';
        _clog('RETRY health check...');
        _checkHealthForUrlChange(url).then(function (changed) {
            if (changed) return; // _reloadWithNewApi already handled
            if (_els.overlay) _els.overlay.style.display = 'none';
            if (_cfg.onRetry) {
                _cfg.onRetry();
            } else {
                _sendCloseAndReturn();
            }
        });
    }

    function _checkHealthForUrlChange(url) {
        return fetch(url, { method: 'GET' }).then(function (resp) {
            if (!resp.ok) return false;
            return resp.json().then(function (data) {
                if (data && data.api && _cfg.apiBase && data.api !== _cfg.apiBase) {
                    _clog('RETRY: tunnel URL changed! ' + _cfg.apiBase + ' -> ' + data.api);
                    _reloadWithNewApi(data.api);
                    return true;
                }
                return false;
            });
        }).catch(function () { return false; });
    }

    var _bgHealthTimer = null;
    var _bgHealthCount = 0;
    var _BG_HEALTH_INTERVAL = 15000; // 15s background poll after exhaustion
    var _BG_HEALTH_MAX_POLLS = 12;   // 12 * 15s = 3 min then give up (tunnel URL likely changed)

    function _reloadWithNewApi(newApi) {
        // Update apiBase in memory — never reload (breaks Telegram initData HMAC)
        _clog('API URL updated in memory: ' + _cfg.apiBase + ' -> ' + newApi);
        _cfg.apiBase = newApi;
        if (window.ApiDiscovery) ApiDiscovery.updateBase(newApi);
        // Hide error overlay and retry with new URL
        _retryAttempt = 0;
        if (_els.overlay) _els.overlay.style.display = 'none';
        if (_cfg.onRetry) _cfg.onRetry();
    }

    function _autoReconnect() {
        _clog('AUTO-RECONNECT: all ' + _RETRY_MAX + ' retries exhausted');

        // Try to auto-reconnect via sendData — bot will send a fresh menu
        // with the correct tunnel URL.
        var tg = window.Telegram && window.Telegram.WebApp;
        if (tg && tg.sendData) {
            _clog('AUTO-RECONNECT: sending webapp_reconnect via sendData');
            if (_els.msg) _els.msg.textContent = 'Reconectando ao servidor...';
            if (_els.hint) _els.hint.textContent = 'Abrindo menu do jogo automaticamente.';

            try {
                tg.sendData(JSON.stringify({
                    action: 'webapp_reconnect',
                    webapp: _cfg.appName,
                }));
                // sendData may not close from InlineKeyboardButton — close as safety net
                setTimeout(function () {
                    if (tg && tg.close) tg.close();
                }, 1000);
                return;
            } catch (e) {
                _clog('AUTO-RECONNECT: sendData failed: ' + e.message);
                // Fall through to background health polling
                _startBgHealthFallback();
            }
            return;
        }

        // Fallback for non-Telegram contexts (dev, etc): background health poll
        _startBgHealthFallback();
    }

    function _startBgHealthFallback() {
        if (_els.msg) _els.msg.textContent = 'Servidor indisponível. Aguardando retorno...';
        if (_els.hint) _els.hint.textContent = 'Reconecte agora ou aguarde a tentativa autom\u00e1tica a cada 15 segundos.';

        // Show manual reconnect button
        var retryBtn = _els.retry;
        if (retryBtn) {
            retryBtn.style.display = '';
            retryBtn.textContent = 'Reconectar';
            retryBtn.disabled = false;
            retryBtn.onclick = function () {
                _retryAttempt = 0;
                _stopBgHealth();
                if (_els.progress) { _els.progress.style.transition = 'none'; _els.progress.style.width = '0%'; }
                _doRetry();
            };
        }

        // Start background health poll
        _startBgHealth();
    }

    function _startBgHealth() {
        _stopBgHealth();
        _bgHealthCount = 0;
        _bgHealthTimer = setInterval(function () {
            if (!_cfg.apiBase) return;
            _bgHealthCount++;

            // After 3 min of polling, the tunnel URL likely changed on restart.
            // Close WebApp so user gets a fresh button with the new URL.
            if (_bgHealthCount > _BG_HEALTH_MAX_POLLS) {
                _clog('BG-HEALTH: gave up after ' + _bgHealthCount + ' polls, closing...');
                _stopBgHealth();
                if (_els.msg) _els.msg.textContent = 'Retornando ao menu...';
                setTimeout(function () { _sendCloseAndReturn(); }, 2000);
                return;
            }

            var remaining = _BG_HEALTH_MAX_POLLS - _bgHealthCount;
            var minutesLeft = Math.ceil((remaining * _BG_HEALTH_INTERVAL) / 60000);
            if (_els.hint) _els.hint.textContent = 'Verificando automaticamente... (~' + minutesLeft + ' min restantes)';

            var url = _cfg.apiBase + '/api/game/health';
            fetch(url, { method: 'GET' }).then(function (resp) {
                if (!resp.ok) return;
                return resp.json();
            }).then(function (data) {
                if (data && data.status === 'ok' && data.engine) {
                    // Detect tunnel URL change — if server reports a different API base,
                    // reload the page with the new URL so all future requests go to the right place.
                    if (data.api && _cfg.apiBase && data.api !== _cfg.apiBase) {
                        _clog('BG-HEALTH: tunnel URL changed! ' + _cfg.apiBase + ' -> ' + data.api);
                        _stopBgHealth();
                        _reloadWithNewApi(data.api);
                        return;
                    }
                    _clog('BG-HEALTH: server restored!');
                    _stopBgHealth();
                    _retryAttempt = 0;
                    if (_els.overlay) _els.overlay.style.display = 'none';
                    if (_cfg.onRetry) { _cfg.onRetry(); }
                    else { _sendCloseAndReturn(); }
                }
            }).catch(function () { /* still down */ });
        }, _BG_HEALTH_INTERVAL);
    }

    function _stopBgHealth() {
        if (_bgHealthTimer) { clearInterval(_bgHealthTimer); _bgHealthTimer = null; }
    }

    // ─── Show Toast (non-fatal, lightweight) ───
    function showToast(text, duration) {
        if (!duration) {
            duration = (typeof window.calcReadTime === 'function')
                ? window.calcReadTime(text, 'toast-warn')
                : 2500;
        }
        var el = document.getElementById('v-err-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'v-err-toast';
            el.className = 'v-toast v-toast-error';
            document.body.appendChild(el);
        }
        el.textContent = text;
        el.style.display = '';
        el.style.animation = 'none';
        el.offsetHeight; // reflow
        el.style.animation = '';
        setTimeout(function () { el.style.display = 'none'; }, duration);
    }

    // ─── Network Badge ───
    var _networkListening = false;

    function _updateNetworkBadge() {
        _cacheEls();
        var badge = _els.network;
        if (!badge) return;
        var online = navigator.onLine;
        badge.style.display = '';
        badge.className = 'v-err-network ' + (online ? 'online' : 'offline');
        badge.textContent = online ? '🟢 Conectado à internet' : '🔴 Sem conexão com a internet';

        if (!_networkListening) {
            _networkListening = true;
            var handler = function () {
                if (_els.overlay && _els.overlay.style.display !== 'none') _updateNetworkBadge();
            };
            window.addEventListener('online', handler);
            window.addEventListener('offline', handler);
        }
    }

    // ─── Report Error to Admin ───
    var _REPORT_QUEUE_KEY = 'valdoria_report_queue';

    function _reportError() {
        var log = _getConnectionLog();
        var errMsgEl = _els.msg || document.getElementById('v-err-msg');
        var errorMsg = errMsgEl ? errMsgEl.textContent || '' : '';
        var errorType = _classifyError(errorMsg);

        var payload = {
            user_id: _cfg.uid,
            log: log,
            screen_id: _cfg.getScreenId(),
            error_msg: errorMsg,
            error_type: errorType,
            device: _getDeviceInfo(),
            retries: _retryAttempt,
            webapp: _cfg.appName,
        };

        if (!_cfg.apiBase || !navigator.onLine) {
            _queueReport(payload);
            return Promise.resolve({ ok: true, sent: false, queued: true });
        }

        var rh = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + _cfg.token,
};
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
            rh['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData;
        }

        return fetch(_cfg.apiBase + '/api/game/report-error', {
            method: 'POST',
            headers: rh,
            body: JSON.stringify(payload),
        }).then(function (resp) {
            return resp.json().then(function (data) {
                if (resp.status === 429 && data.retry_after) {
                    return { ok: false, error: 'cooldown', retry_after: data.retry_after };
                }
                _flushReportQueue();
                return data;
            });
        }).catch(function (e) {
            console.error('[' + _cfg.appName + '] reportError failed:', e.message);
            _queueReport(payload);
            return { ok: true, sent: false, queued: true };
        });
    }

    function _queueReport(payload) {
        try {
            var queue = JSON.parse(localStorage.getItem(_REPORT_QUEUE_KEY) || '[]');
            payload.queued_at = new Date().toISOString();
            queue.push(payload);
            while (queue.length > 5) queue.shift();
            localStorage.setItem(_REPORT_QUEUE_KEY, JSON.stringify(queue));
        } catch (e) { /* quota */ }
    }

    function _flushReportQueue() {
        try {
            var queue = JSON.parse(localStorage.getItem(_REPORT_QUEUE_KEY) || '[]');
            if (!queue.length || !_cfg.apiBase) return;
            localStorage.removeItem(_REPORT_QUEUE_KEY);
            var now = Date.now();
            var MAX_AGE = 24 * 60 * 60 * 1000;
            var delay = 0;
            for (var i = 0; i < queue.length; i++) {
                var p = queue[i];
                if (p.queued_at && (now - new Date(p.queued_at).getTime()) > MAX_AGE) continue;
                p.was_queued = true;
                // Stagger sends by 800ms to avoid burst on low-end phones
                (function (payload, d) {
                    setTimeout(function () {
                        var fh = {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + _cfg.token,
                        };
                        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
                            fh['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData;
                        }
                        fetch(_cfg.apiBase + '/api/game/report-error', {
                            method: 'POST',
                            headers: fh,
                            body: JSON.stringify(payload),
                        }).catch(function () { /* fire and forget */ });
                    }, d);
                })(p, delay);
                delay += 800;
            }
        } catch (e) { /* */ }
    }

    // Flush on reconnect
    window.addEventListener('online', function () { setTimeout(_flushReportQueue, 3000); });

    // ─── Global Error Handlers ───
    window.addEventListener('error', function (e) {
        _jsErrorCount++;
        var loc = (e.filename || '').split('/').pop() + ':' + e.lineno;
        _clog('JS ERROR: ' + e.message + ' @ ' + loc);
    });
    window.addEventListener('unhandledrejection', function (e) {
        _jsErrorCount++;
        var reason = e.reason ? (e.reason.message || String(e.reason)).substring(0, 100) : 'unknown';
        _clog('PROMISE REJECT: ' + reason);
    });

    // ─── Send Close & Return (notify bot to show menu) ───
    function _sendCloseAndReturn() {
        var tg = window.Telegram && window.Telegram.WebApp;
        // Try sendData first (works from reply keyboard WebApps)
        if (tg && tg.sendData) {
            try {
                tg.sendData(JSON.stringify({
                    action: 'webapp_error_close',
                    webapp: _cfg.appName,
                }));
                // sendData may auto-close — but from InlineKeyboardButton it won't,
                // so schedule tg.close() as safety net
            } catch (e) {
                _clog('sendData failed: ' + e.message);
            }
        }
        // Always close the WebApp (sendData alone doesn't close from inline buttons)
        setTimeout(function () {
            if (tg && tg.close) {
                tg.close();
            } else {
                window.close();
            }
        }, 1000);
    }

    // ─── Hide Error ───
    function hideError() {
        if (_els.overlay) _els.overlay.style.display = 'none';
        if (_autoRetryTimer) { clearInterval(_autoRetryTimer); _autoRetryTimer = null; }
        _stopBgHealth();
    }

    // ─── Init ───
    function init(config) {
        if (_initialized) return;
        _initialized = true;

        _cfg.appName = config.appName || 'APP';
        _cfg.apiBase = (config.apiBase || '').replace(/\/$/, '');
        _cfg.token = config.token || '';
        _cfg.uid = config.uid || 0;
        if (config.getScreenId) _cfg.getScreenId = config.getScreenId;
        if (config.onRetry) _cfg.onRetry = config.onRetry;
        if (config.onClose) _cfg.onClose = config.onClose;

        _clog('INIT ' + _cfg.appName + ' api=' + (_cfg.apiBase || 'none') + ' uid=' + _cfg.uid);

        // Inject overlay HTML
        if (!document.getElementById('v-err-overlay')) {
            var wrapper = document.createElement('div');
            wrapper.innerHTML = _OVERLAY_HTML;
            document.body.appendChild(wrapper.firstElementChild);
        }

        // Patch global showError
        window.showError = showError;
        window.showFatalError = showError; // alias for webapps that use showFatalError
        window.hideError = hideError;

        // Expose log getter as global for compatibility
        window.getConnectionLog = _getConnectionLog;

        // Flush queued reports if API available
        if (_cfg.apiBase) {
            setTimeout(_flushReportQueue, 2000);
        }
    }

    // ─── Public API ───
    function updateApiBase(newApi) {
        _cfg.apiBase = (newApi || '').replace(/\/$/, '');
        _clog('API_BASE updated to: ' + _cfg.apiBase);
    }

    return {
        init: init,
        updateApiBase: updateApiBase,
        showError: showError,
        showToast: showToast,
        hideError: hideError,
        log: _clog,
        getConnectionLog: _getConnectionLog,
    };
})();

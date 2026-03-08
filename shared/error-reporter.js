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
    var _CONN_LOG_MAX = 80;
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
            for (var i = Math.max(0, prev.length - 20); i < prev.length; i++) _connLog.push(prev[i]);
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
                '<button id="v-err-report" class="v-err-btn v-err-btn-secondary" style="display:none">' +
                    '📨 Reportar Problema</button>' +
                '<div class="v-err-debug">' +
                    '<button id="v-err-debug-toggle" class="v-err-debug-toggle">📋 Ver detalhes técnicos ▸</button>' +
                    '<div id="v-err-debug-wrap" style="display:none">' +
                        '<div class="v-err-log-wrap">' +
                            '<div id="v-err-log" class="v-err-log"></div>' +
                        '</div>' +
                        '<button id="v-err-copy" class="v-err-copy">📋 Copiar log</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

    // ─── Haptic Helper ───
    function _haptic(type) {
        try {
            var tg = window.Telegram && window.Telegram.WebApp;
            if (tg && tg.HapticFeedback) {
                if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
                else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
                else tg.HapticFeedback.impactOccurred('light');
            }
        } catch (e) { /* */ }
    }

    // ─── Show Error (full overlay) ───
    var _autoRetryTimer = null;
    var _RETRY_BASE = 3;
    var _RETRY_CAP = 40;
    var _RETRY_MAX = 6;

    function showError(msg, err) {
        console.error('[' + _cfg.appName + ']', msg, err || '');
        _clog('ERROR: ' + msg);

        var overlay = document.getElementById('v-err-overlay');
        if (!overlay) return;
        var msgEl = document.getElementById('v-err-msg');
        var retryBtn = document.getElementById('v-err-retry');
        var closeBtn = document.getElementById('v-err-close');
        var reportBtn = document.getElementById('v-err-report');

        msgEl.textContent = msg;
        overlay.style.display = '';

        // Context-aware icon
        var iconEl = document.getElementById('v-err-icon');
        if (iconEl) {
            if (msg.indexOf('Sem conexão') >= 0 || msg.indexOf('internet') >= 0) iconEl.textContent = '📡';
            else if (msg.indexOf('não respondeu') >= 0 || msg.indexOf('demorou') >= 0) iconEl.textContent = '⏳';
            else if (msg.indexOf('expirada') >= 0 || msg.indexOf('Sessão') >= 0) iconEl.textContent = '🔒';
            else if (msg.indexOf('Personagem não encontrado') >= 0) iconEl.textContent = '👤';
            else iconEl.textContent = '⚠️';
        }

        // Actionable hint
        var hintEl = document.getElementById('v-err-hint');
        if (hintEl) {
            if (msg.indexOf('Sem conexão') >= 0 || msg.indexOf('internet') >= 0)
                hintEl.textContent = 'Verifique se o Wi-Fi ou dados móveis estão ativos.';
            else if (msg.indexOf('não respondeu') >= 0 || msg.indexOf('demorou') >= 0)
                hintEl.textContent = 'O servidor pode estar sobrecarregado. Tentaremos reconectar automaticamente.';
            else if (msg.indexOf('indisponível') >= 0)
                hintEl.textContent = 'O servidor está em manutenção ou reiniciando. Tente novamente em alguns instantes.';
            else if (msg.indexOf('expirada') >= 0 || msg.indexOf('Sessão') >= 0)
                hintEl.textContent = 'Feche o mini app e toque em JOGAR para iniciar uma nova sessão.';
            else if (msg.indexOf('Personagem não encontrado') >= 0)
                hintEl.textContent = 'Feche o mini app e selecione um personagem novamente.';
            else if (msg.indexOf('Resposta inválida') >= 0)
                hintEl.textContent = 'Resposta inesperada do servidor. Toque em Reportar Problema para nos ajudar a corrigir.';
            else
                hintEl.textContent = '';
        }

        // Network badge
        _updateNetworkBadge();

        // Debug panel
        var isConnErr = msg.indexOf('Sem conexão') >= 0 || msg.indexOf('indisponível') >= 0
            || msg.indexOf('não respondeu') >= 0 || msg.indexOf('demorou') >= 0;
        _populateDebugLog(err, isConnErr);

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
                    var pb = document.getElementById('v-err-retry-progress');
                    if (pb) { pb.style.transition = 'none'; pb.style.width = '0%'; }
                    _doRetry();
                };
            } else {
                retryBtn.style.display = 'none';
            }
        }

        // Close button (always shown)
        if (closeBtn) {
            closeBtn.style.display = '';
            closeBtn.onclick = function () {
                if (_cfg.onClose) return _cfg.onClose();
                if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.close) {
                    window.Telegram.WebApp.close();
                } else {
                    window.close();
                }
            };
        }

        // Report button (API tier only)
        if (reportBtn) {
            if (hasApi) {
                reportBtn.style.display = '';
                reportBtn.disabled = false;
                reportBtn.textContent = '📨 Reportar Problema';
                reportBtn.onclick = function () { _handleReport(reportBtn); };
            } else {
                reportBtn.style.display = 'none';
            }
        }

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

            var progBar = document.getElementById('v-err-retry-progress');
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
        var overlay = document.getElementById('v-err-overlay');
        if (overlay) overlay.style.display = 'none';
        _clog('RETRY attempt...');

        if (_cfg.onRetry) {
            _cfg.onRetry();
        } else {
            // Default: reload the page
            window.location.reload();
        }
    }

    function _autoReconnect() {
        _clog('AUTO-RECONNECT: all ' + _RETRY_MAX + ' retries exhausted');
        // Auto-send error report
        if (_cfg.apiBase) {
            _reportError().catch(function () { /* */ });
            var reportBtn = document.getElementById('v-err-report');
            if (reportBtn) { reportBtn.textContent = '✅ Enviado automaticamente'; reportBtn.disabled = true; }
        }

        var msgEl = document.getElementById('v-err-msg');
        var retryBtn = document.getElementById('v-err-retry');
        if (msgEl) msgEl.textContent = 'Reconectando... O mini app será fechado automaticamente.';
        if (retryBtn) retryBtn.style.display = 'none';
        var closeBtn = document.getElementById('v-err-close');
        if (closeBtn) closeBtn.style.display = 'none';

        setTimeout(function () {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.close) {
                window.Telegram.WebApp.close();
            } else {
                window.close();
            }
        }, 2500);
    }

    // ─── Show Toast (non-fatal, lightweight) ───
    function showToast(text, duration) {
        duration = duration || 2500;
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
        var badge = document.getElementById('v-err-network');
        if (!badge) return;
        var online = navigator.onLine;
        badge.style.display = '';
        badge.className = 'v-err-network ' + (online ? 'online' : 'offline');
        badge.textContent = online ? '🟢 Conectado à internet' : '🔴 Sem conexão com a internet';

        if (!_networkListening) {
            _networkListening = true;
            var handler = function () {
                var overlay = document.getElementById('v-err-overlay');
                if (overlay && overlay.style.display !== 'none') _updateNetworkBadge();
            };
            window.addEventListener('online', handler);
            window.addEventListener('offline', handler);
        }
    }

    // ─── Debug Panel ───
    var _debugReady = false;

    function _populateDebugLog(err, isConnErr) {
        var logEl = document.getElementById('v-err-log');
        var wrapEl = document.getElementById('v-err-debug-wrap');
        var toggleBtn = document.getElementById('v-err-debug-toggle');
        var copyBtn = document.getElementById('v-err-copy');
        if (!logEl || !wrapEl || !toggleBtn) return;

        var logText = _getConnectionLog() + (err ? '\n\nERROR: ' + (err.stack || err.message || err) : '');
        logEl.textContent = logText;

        if (isConnErr) {
            wrapEl.style.display = '';
            toggleBtn.textContent = '📋 Ocultar detalhes ▾';
        } else {
            wrapEl.style.display = 'none';
            toggleBtn.textContent = '📋 Ver detalhes técnicos ▸';
        }

        if (!_debugReady) {
            _debugReady = true;
            toggleBtn.onclick = function () {
                var visible = wrapEl.style.display !== 'none';
                wrapEl.style.display = visible ? 'none' : '';
                toggleBtn.textContent = visible ? '📋 Ver detalhes técnicos ▸' : '📋 Ocultar detalhes ▾';
            };
            if (copyBtn) {
                copyBtn.onclick = function () {
                    var text = logEl.textContent || '';
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text).then(function () {
                            copyBtn.textContent = '✅ Copiado!';
                            setTimeout(function () { copyBtn.textContent = '📋 Copiar log'; }, 2000);
                        }).catch(function () { _fallbackCopy(text, copyBtn); });
                    } else {
                        _fallbackCopy(text, copyBtn);
                    }
                };
            }
        }
    }

    function _fallbackCopy(text, btn) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            btn.textContent = '✅ Copiado!';
        } catch (e) {
            btn.textContent = '❌ Falha ao copiar';
        }
        setTimeout(function () { btn.textContent = '📋 Copiar log'; }, 2000);
        document.body.removeChild(ta);
    }

    // ─── Report Error to Admin ───
    var _REPORT_QUEUE_KEY = 'valdoria_report_queue';

    function _reportError() {
        var log = _getConnectionLog();
        var errMsgEl = document.getElementById('v-err-msg');
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

    function _handleReport(btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Enviando...';
        _haptic('light');
        _reportError().then(function (result) {
            if (result.ok && result.sent) {
                btn.textContent = '✅ Enviado!';
                _haptic('success');
            } else if (result.queued) {
                btn.textContent = '📦 Salvo (enviará quando conectar)';
            } else if (result.error === 'cooldown') {
                var secs = result.retry_after || 60;
                btn.textContent = '⏳ Aguarde ' + secs + 's';
                setTimeout(function () { btn.textContent = '📨 Reportar Problema'; btn.disabled = false; }, secs * 1000);
                return;
            } else if (result.ok && !result.sent) {
                btn.textContent = '⚠️ Admins não configurados';
            } else {
                btn.textContent = '❌ Falha ao enviar';
            }
            setTimeout(function () { btn.textContent = '📨 Reportar Problema'; btn.disabled = false; }, 5000);
        }).catch(function () {
            btn.textContent = '❌ Falha ao enviar';
            setTimeout(function () { btn.textContent = '📨 Reportar Problema'; btn.disabled = false; }, 5000);
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
            for (var i = 0; i < queue.length; i++) {
                var p = queue[i];
                if (p.queued_at && (now - new Date(p.queued_at).getTime()) > MAX_AGE) continue;
                p.was_queued = true;
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
                    body: JSON.stringify(p),
                }).catch(function () { /* fire and forget */ });
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

    // ─── Hide Error ───
    function hideError() {
        var el = document.getElementById('v-err-overlay');
        if (el) el.style.display = 'none';
        if (_autoRetryTimer) { clearInterval(_autoRetryTimer); _autoRetryTimer = null; }
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

        // Expose log and report as globals for compatibility
        window.getConnectionLog = _getConnectionLog;
        window.reportError = _reportError;

        // Flush queued reports if API available
        if (_cfg.apiBase) {
            setTimeout(_flushReportQueue, 2000);
        }
    }

    // ─── Public API ───
    return {
        init: init,
        showError: showError,
        showToast: showToast,
        hideError: hideError,
        log: _clog,
        getConnectionLog: _getConnectionLog,
        reportError: _reportError,
    };
})();

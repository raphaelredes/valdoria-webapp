/* ═══════════════════════════════════════════════════════════════
   SESSION HEARTBEAT — Device displacement detection
   Polls /api/game/heartbeat to detect when another device takes
   over the session. Shows a displacement overlay with options to reopen here or close.
   Usage: SessionHeartbeat.init({ apiBase, token, uid })
   ═══════════════════════════════════════════════════════════════ */

/* global Telegram */
// eslint-disable-next-line no-unused-vars
var SessionHeartbeat = (function () {
    'use strict';

    var _timer = null;
    var _displaced = false;
    var _cfg = { apiBase: '', token: '', uid: 0, interval: 7000 };

    function init(cfg) {
        _cfg.apiBase = cfg.apiBase || '';
        _cfg.token = cfg.token || '';
        _cfg.uid = cfg.uid || 0;
        _cfg.interval = cfg.interval || 7000;
        _displaced = false;
        if (_timer) clearInterval(_timer);
        if (!_cfg.apiBase || !_cfg.token || !_cfg.uid) return;
        _timer = setInterval(_poll, _cfg.interval);
    }

    function stop() {
        if (_timer) { clearInterval(_timer); _timer = null; }
    }

    async function _poll() {
        if (_displaced) return;
        // Don't poll when tab is hidden (saves bandwidth)
        if (document.visibilityState === 'hidden') return;
        try {
            var resp = await fetch(
                _cfg.apiBase + '/api/game/heartbeat?uid=' + _cfg.uid,
                {
                    headers: { 'Authorization': 'Bearer ' + _cfg.token },
                    signal: AbortSignal.timeout(3000),
                }
            );
            if (!resp.ok) return; // 401 etc handled by main API layer
            var data = await resp.json();
            if (data.status === 'displaced') {
                _displaced = true;
                stop();
                _showDisplacedOverlay(data.device || 'Outro dispositivo', data.from_device || '');
            }
        } catch (e) {
            // Silent — heartbeat errors should not disrupt gameplay.
            // Connectivity issues are handled by the main API error reporter.
        }
    }

    /**
     * Also callable from apiCall() when a regular API response returns
     * {status: 'displaced'}. This avoids waiting for the next heartbeat.
     */
    function handleDisplaced(deviceLabel, fromDevice) {
        if (_displaced) return;
        _displaced = true;
        stop();
        _showDisplacedOverlay(deviceLabel || 'Outro dispositivo', fromDevice || '');
    }

    function _showDisplacedOverlay(deviceLabel, fromDevice) {
        console.warn('[HEARTBEAT] Session displaced by:', deviceLabel, 'from:', fromDevice);

        // Haptic feedback
        try {
            var tg = window.Telegram && Telegram.WebApp;
            if (tg && tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('warning');
            }
        } catch (e) { /* ignore */ }

        // Create overlay
        // Detect current device for context
        var currentDevice = '';
        try {
            var _tg = window.Telegram && Telegram.WebApp;
            if (_tg && _tg.platform) {
                var _pLabels = {
                    'android': 'Celular (Android)', 'ios': 'Celular (iOS)',
                    'tdesktop': 'Computador (Windows/Linux)', 'macos': 'Computador (macOS)',
                    'web': 'Navegador Web',
                };
                currentDevice = _pLabels[_tg.platform] || '';
            }
        } catch (e) { /* */ }

        var overlay = document.createElement('div');
        overlay.className = 'displaced-overlay';

        // Show where the session moved TO (the displacing device)
        var bodyText = 'Sua sessão foi transferida para:';
        var badgeHtml = '<div class="displaced-device-badge">' + _escHtml(deviceLabel) + '</div>';

        overlay.innerHTML =
            '<div class="displaced-content">' +
                '<div class="displaced-icon">📱</div>' +
                '<div class="displaced-title">Sessão transferida</div>' +
                '<div class="displaced-text">' + bodyText + '</div>' +
                badgeHtml +
                '<div class="displaced-actions">' +
                    '<button class="displaced-reopen-btn" id="displaced-reopen">Reabrir aqui</button>' +
                    '<button class="displaced-close-btn" id="displaced-close">Fechar</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        // Force reflow then add visible class for animation
        overlay.offsetHeight; // eslint-disable-line no-unused-expressions
        overlay.classList.add('displaced-visible');

        // Reopen button — re-registers this device as active
        var reopenBtn = document.getElementById('displaced-reopen');
        if (reopenBtn) {
            reopenBtn.addEventListener('click', function () { _reopen(overlay); });
        }

        // Close button
        var closeBtn = document.getElementById('displaced-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () { _close(); });
        }

        // No auto-close — let the user choose
    }

    async function _reopen(overlay) {
        var reopenBtn = document.getElementById('displaced-reopen');
        if (reopenBtn) {
            reopenBtn.disabled = true;
            reopenBtn.textContent = 'Reconectando...';
        }

        try {
            // Call /start to re-register this device (clears displacement)
            var platform = '';
            try {
                var tg = window.Telegram && Telegram.WebApp;
                if (tg) platform = tg.platform || '';
            } catch (e) { /* ignore */ }

            var resp = await fetch(_cfg.apiBase + '/api/game/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + _cfg.token,
                },
                body: JSON.stringify({
                    user_id: _cfg.uid,
                    platform: platform,
                }),
                signal: AbortSignal.timeout(8000),
            });

            if (!resp.ok) {
                console.error('[HEARTBEAT] Reopen failed, status:', resp.status);
                _showReopenError(overlay);
                return;
            }

            var data = await resp.json();
            console.info('[HEARTBEAT] Session reopened successfully');

            // Remove overlay
            if (overlay && overlay.parentNode) overlay.remove();

            // Reset displaced flag and restart heartbeat
            _displaced = false;
            _timer = setInterval(_poll, _cfg.interval);

            // Dispatch event so the WebApp can reload the screen
            window.dispatchEvent(new CustomEvent('session-reopened', { detail: data }));

        } catch (e) {
            console.error('[HEARTBEAT] Reopen error:', e);
            _showReopenError(overlay);
        }
    }

    function _showReopenError(overlay) {
        var reopenBtn = document.getElementById('displaced-reopen');
        if (reopenBtn) {
            reopenBtn.textContent = 'Reabrir aqui';
            reopenBtn.disabled = false;
        }
        // Show error hint
        var existing = overlay.querySelector('.displaced-error');
        if (!existing) {
            var errEl = document.createElement('div');
            errEl.className = 'displaced-text displaced-error';
            errEl.textContent = 'Falha ao reconectar. Tente novamente.';
            var actions = overlay.querySelector('.displaced-actions');
            if (actions) actions.parentNode.insertBefore(errEl, actions);
        }
    }

    function _close() {
        try {
            var tg = window.Telegram && Telegram.WebApp;
            if (tg && tg.close) {
                tg.close();
            }
        } catch (e) {
            // Fallback: just hide overlay
            var el = document.querySelector('.displaced-overlay');
            if (el) el.remove();
        }
    }

    function _escHtml(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    return {
        init: init,
        stop: stop,
        handleDisplaced: handleDisplaced,
    };
})();

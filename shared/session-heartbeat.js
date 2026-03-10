/* ═══════════════════════════════════════════════════════════════
   SESSION HEARTBEAT — Device displacement detection
   Polls /api/game/heartbeat to detect when another device takes
   over the session. Shows a displacement overlay and closes.
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
                _showDisplacedOverlay(data.device || 'Outro dispositivo');
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
    function handleDisplaced(deviceLabel) {
        if (_displaced) return;
        _displaced = true;
        stop();
        _showDisplacedOverlay(deviceLabel || 'Outro dispositivo');
    }

    function _showDisplacedOverlay(deviceLabel) {
        console.warn('[HEARTBEAT] Session displaced by:', deviceLabel);

        // Haptic feedback
        try {
            var tg = window.Telegram && Telegram.WebApp;
            if (tg && tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('warning');
            }
        } catch (e) { /* ignore */ }

        // Create overlay
        var overlay = document.createElement('div');
        overlay.className = 'displaced-overlay';
        overlay.innerHTML =
            '<div class="displaced-content">' +
                '<div class="displaced-icon">📱</div>' +
                '<div class="displaced-title">Sessão transferida</div>' +
                '<div class="displaced-text">O jogo foi aberto em outro dispositivo:</div>' +
                '<div class="displaced-device-badge">' + _escHtml(deviceLabel) + '</div>' +
                '<div class="displaced-text displaced-sub">Esta janela será fechada.</div>' +
                '<button class="displaced-close-btn" id="displaced-close">Fechar</button>' +
            '</div>';

        document.body.appendChild(overlay);

        // Force reflow then add visible class for animation
        overlay.offsetHeight; // eslint-disable-line no-unused-expressions
        overlay.classList.add('displaced-visible');

        // Close button
        var btn = document.getElementById('displaced-close');
        if (btn) {
            btn.addEventListener('click', function () { _close(); });
        }

        // Auto-close after 8 seconds
        setTimeout(function () { _close(); }, 8000);
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

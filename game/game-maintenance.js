/* global vToast, S */
/* game-maintenance.js — Maintenance screen + warning toasts for Game Hub */

var _maintWarnInterval = null;
var _maintPollInterval = null;
var _maintCountdownInterval = null;
var _maintStartTime = null;
var _maintEtaMin = 0;

/**
 * Escape HTML to prevent XSS from user-provided strings (reason).
 * Uses textContent trick for safe escaping.
 */
function _maintEscHtml(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

/**
 * Main entry point — checks API response for maintenance fields.
 * Returns true if maintenance screen was shown (caller should skip normal rendering).
 */
function checkMaintenance(data) {
    if (!data) return false;

    /* Active maintenance — show full-screen maintenance mode */
    if (data.maintenance && data.maintenance.active) {
        _stopMaintWarn();
        _showMaintenanceScreen(data.maintenance);
        return true;
    }

    /* Approaching maintenance — show warning toast */
    if (data.maint_warn && data.maint_warn.eta_minutes !== undefined) {
        _startMaintWarn(data.maint_warn);
    } else {
        _stopMaintWarn();
    }

    return false;
}

/**
 * Show a warning toast immediately and set up a recurring reminder every 60s.
 */
function _startMaintWarn(warn) {
    var eta = warn.eta_minutes || 0;
    var reason = warn.reason || '';
    var msg = '\u2692\uFE0F Manuten\u00E7\u00E3o em ' + eta + ' min';
    if (reason) msg += ': ' + reason;

    /* Show immediate toast */
    if (typeof vToast === 'function') {
        vToast(msg, 'warn', 4000);
    }

    /* Clear existing interval before starting a new one */
    _stopMaintWarn();

    /* Recurring reminder every 60s */
    _maintWarnInterval = setInterval(function () {
        if (typeof vToast === 'function') {
            vToast('\u2692\uFE0F Manuten\u00E7\u00E3o se aproximando...', 'warn', 3000);
        }
    }, 60000);
}

/**
 * Stop the maintenance warning interval.
 */
function _stopMaintWarn() {
    if (_maintWarnInterval) {
        clearInterval(_maintWarnInterval);
        _maintWarnInterval = null;
    }
}

/**
 * Build and show the full maintenance screen using safe DOM methods.
 * Hides bottom-panel and banner, starts auto-polling for maintenance end.
 */
function _showMaintenanceScreen(maint) {
    _stopMaintPoll();
    _stopMaintCountdown();

    /* Parse start_time (HH:MM) into a Date for today */
    _maintStartTime = null;
    _maintEtaMin = 0;
    if (maint.start_time) {
        var parts = maint.start_time.split(':');
        if (parts.length >= 2) {
            var now = new Date();
            _maintStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                parseInt(parts[0], 10), parseInt(parts[1], 10), 0);
        }
    }
    /* Parse ETA from string like "15 min" or numeric minutes */
    if (typeof maint.eta === 'number') {
        _maintEtaMin = maint.eta;
    } else if (typeof maint.eta === 'string') {
        var match = maint.eta.match(/(\d+)/);
        if (match) _maintEtaMin = parseInt(match[1], 10);
    }

    var reasonText = maint.reason || 'Atualiza\u00E7\u00E3o do sistema';
    var etaText = _maintEtaMin > 0 ? ('Previs\u00E3o: ~' + _maintEtaMin + ' minutos') : 'Em andamento...';

    /* Hide banner and bottom panel */
    var bannerEl = document.getElementById('banner');
    if (bannerEl) bannerEl.style.display = 'none';
    var panelEl = document.getElementById('bottom-panel');
    if (panelEl) panelEl.style.display = 'none';
    var toggleEl = document.getElementById('immersive-toggle');
    if (toggleEl) toggleEl.style.display = 'none';
    var restoreEl = document.getElementById('immersive-restore');
    if (restoreEl) restoreEl.style.display = 'none';

    /* Show screen container */
    var screenEl = document.getElementById('screen');
    if (screenEl) screenEl.style.display = '';

    /* Build maintenance screen using safe DOM methods */
    var contentEl = document.getElementById('content');
    if (!contentEl) return;

    /* Clear previous content */
    contentEl.textContent = '';

    var wrapper = document.createElement('div');
    wrapper.className = 'maint-screen';

    var icon = document.createElement('div');
    icon.className = 'maint-icon';
    icon.textContent = '\u2692\uFE0F';
    wrapper.appendChild(icon);

    var title = document.createElement('div');
    title.className = 'maint-title';
    title.textContent = 'Manuten\u00E7\u00E3o em Andamento';
    wrapper.appendChild(title);

    var reason = document.createElement('div');
    reason.className = 'maint-reason';
    reason.textContent = reasonText;
    wrapper.appendChild(reason);

    var progressWrap = document.createElement('div');
    progressWrap.className = 'maint-progress-wrap';
    var progressBar = document.createElement('div');
    progressBar.className = 'maint-progress-bar';
    var progressFill = document.createElement('div');
    progressFill.className = 'maint-progress-fill';
    progressFill.id = 'maint-progress-fill';
    progressFill.style.width = '0%';
    progressBar.appendChild(progressFill);
    progressWrap.appendChild(progressBar);
    wrapper.appendChild(progressWrap);

    var countdown = document.createElement('div');
    countdown.className = 'maint-countdown';
    countdown.id = 'maint-countdown';
    countdown.textContent = etaText;
    wrapper.appendChild(countdown);

    var retryBtn = document.createElement('button');
    retryBtn.className = 'maint-retry-btn maint-retry-pulse';
    retryBtn.id = 'maint-retry-btn';
    retryBtn.textContent = '\uD83D\uDD04 Verificar Novamente';
    retryBtn.addEventListener('click', function () {
        _pollMaintenanceStatus();
    });
    wrapper.appendChild(retryBtn);

    contentEl.appendChild(wrapper);

    /* Start countdown updater (every 1s) */
    _updateMaintenanceProgress();
    _maintCountdownInterval = setInterval(_updateMaintenanceProgress, 1000);

    /* Start auto-polling (every 30s) */
    _maintPollInterval = setInterval(_pollMaintenanceStatus, 30000);
}

/**
 * Update progress bar width and countdown text based on elapsed time.
 */
function _updateMaintenanceProgress() {
    if (!_maintStartTime || !_maintEtaMin) return;

    var now = new Date();
    var elapsedMs = now.getTime() - _maintStartTime.getTime();
    var totalMs = _maintEtaMin * 60 * 1000;

    /* Cap progress at 95% — only 100% when server confirms maintenance ended */
    var pct = Math.min(95, Math.max(0, (elapsedMs / totalMs) * 100));

    var fillEl = document.getElementById('maint-progress-fill');
    if (fillEl) fillEl.style.width = pct.toFixed(1) + '%';

    var remainMs = Math.max(0, totalMs - elapsedMs);
    var remainMin = Math.ceil(remainMs / 60000);

    var countdownEl = document.getElementById('maint-countdown');
    if (countdownEl) {
        if (remainMs <= 0) {
            countdownEl.textContent = 'Finalizando...';
        } else if (remainMin === 1) {
            countdownEl.textContent = 'Falta ~1 minuto';
        } else {
            countdownEl.textContent = 'Faltam ~' + remainMin + ' minutos';
        }
    }
}

/**
 * Poll the server to check if maintenance has ended.
 * If ended, reload the page to restore normal game state.
 */
function _pollMaintenanceStatus() {
    if (!S || !S.apiBase || !S.token) return;

    fetch(S.apiBase + '/api/game/status', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + S.token,
            'Cache-Control': 'no-store'
        }
    })
    .then(function (resp) { return resp.json(); })
    .then(function (data) {
        if (data && data.maintenance === false) {
            _stopMaintPoll();
            _stopMaintCountdown();
            window.location.reload();
        }
    })
    .catch(function (err) {
        console.warn('[GAME] maintenance poll failed:', err);
    });
}

/**
 * Stop the auto-poll interval.
 */
function _stopMaintPoll() {
    if (_maintPollInterval) {
        clearInterval(_maintPollInterval);
        _maintPollInterval = null;
    }
}

/**
 * Stop the countdown updater interval.
 */
function _stopMaintCountdown() {
    if (_maintCountdownInterval) {
        clearInterval(_maintCountdownInterval);
        _maintCountdownInterval = null;
    }
}

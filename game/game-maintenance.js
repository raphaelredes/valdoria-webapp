/* global vToast, S, CampFire */
/* game-maintenance.js — Bonfire maintenance screen + warning toasts for Game Hub */

var _maintWarnInterval = null;
var _maintPollInterval = null;
var _maintCountdownInterval = null;
var _maintTipInterval = null;
var _maintStartTime = null;
var _maintEtaMin = 0;
var _maintTipIdx = 0;

var _MAINT_TIPS = [
    '\u2694\uFE0F Dica: Rolagens de ataque 20 s\u00E3o acertos cr\u00EDticos \u2014 dano dobrado!',
    '\uD83D\uDEE1\uFE0F Dica: Descansar na estalagem recupera todos os dados de vida.',
    '\uD83D\uDCB0 Dica: Venda itens que n\u00E3o usa no mercado da cidade.',
    '\uD83D\uDCDC Dica: Converse com NPCs para descobrir quests escondidas.',
    '\uD83C\uDFF0 Dica: A Guilda de Aventureiros oferece miss\u00F5es com boas recompensas.',
    '\uD83E\uDDEA Dica: Po\u00E7\u00F5es podem ser usadas durante o combate como a\u00E7\u00E3o b\u00F4nus.',
    '\u2B50 Dica: Suba de n\u00EDvel para desbloquear novas habilidades de classe.',
    '\uD83C\uDFAF Dica: Advantage dobra suas chances \u2014 posicione-se bem!',
    '\uD83E\uDDEA Dica: Po\u00E7\u00F5es de cura restauram 2d4+2 pontos de vida.',
    '\uD83D\uDEE1\uFE0F Dica: Classe de Armadura (CA) determina se ataques acertam voc\u00EA.',
    '\uD83D\uDD2E Dica: Magias de concentra\u00E7\u00E3o se perdem ao receber dano.',
    '\uD83D\uDDFA\uFE0F Dica: Explore cada localiza\u00E7\u00E3o \u2014 segredos est\u00E3o por toda parte.',
    '\uD83D\uDCA0 Dica: Cada classe tem recursos \u00FAnicos \u2014 conhe\u00E7a os seus!',
    '\uD83C\uDFF0 Dica: O ferreiro pode forjar equipamentos poderosos.',
];

/**
 * Main entry point — checks API response for maintenance fields.
 * Returns true if maintenance screen was shown (caller should skip normal rendering).
 */
function checkMaintenance(data) {
    if (!data) return false;

    /* Active maintenance — show bonfire maintenance screen */
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
 * Build and show the bonfire maintenance screen using safe DOM methods.
 * Hides hub elements, creates camp scene with CampFire particles.
 */
function _showMaintenanceScreen(maint) {
    _cleanup();

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

    /* Hide hub elements */
    var hideIds = ['banner', 'bottom-panel', 'immersive-toggle', 'immersive-restore', 'screen'];
    for (var h = 0; h < hideIds.length; h++) {
        var el = document.getElementById(hideIds[h]);
        if (el) el.style.display = 'none';
    }

    /* Remove any existing maintenance screen */
    var existing = document.getElementById('maint-bonfire');
    if (existing) existing.remove();

    /* ── Root container ── */
    var root = document.createElement('div');
    root.className = 'maint-screen';
    root.id = 'maint-bonfire';

    /* ── Scene (camp fire area) ── */
    var scene = document.createElement('div');
    scene.className = 'maint-scene';

    /* Sky + stars */
    var sky = document.createElement('div');
    sky.className = 'camp-sky';
    for (var s = 0; s < 6; s++) {
        var star = document.createElement('div');
        star.className = 'camp-star';
        sky.appendChild(star);
    }
    scene.appendChild(sky);

    /* Moon */
    var moon = document.createElement('div');
    moon.className = 'camp-moon';
    scene.appendChild(moon);

    /* Fire area */
    var fireArea = document.createElement('div');
    fireArea.className = 'camp-fire-area';

    var groundGlow = document.createElement('div');
    groundGlow.className = 'camp-ground-glow';
    fireArea.appendChild(groundGlow);

    /* Logs */
    var logs = document.createElement('div');
    logs.className = 'camp-logs';
    for (var l = 0; l < 3; l++) {
        var log = document.createElement('div');
        log.className = 'camp-log';
        logs.appendChild(log);
    }
    var logEmber = document.createElement('div');
    logEmber.className = 'camp-log-ember';
    logs.appendChild(logEmber);
    fireArea.appendChild(logs);

    /* Fire canvas */
    var canvas = document.createElement('canvas');
    canvas.className = 'camp-fire-canvas';
    canvas.width = 160;
    canvas.height = 160;
    fireArea.appendChild(canvas);

    /* Ember sparks */
    var embers = document.createElement('div');
    embers.className = 'camp-embers';
    for (var e = 0; e < 6; e++) {
        var spark = document.createElement('div');
        spark.className = 'camp-spark';
        embers.appendChild(spark);
    }
    fireArea.appendChild(embers);

    scene.appendChild(fireArea);
    root.appendChild(scene);

    /* ── Content zone ── */
    var content = document.createElement('div');
    content.className = 'maint-content';

    /* Title */
    var title = document.createElement('div');
    title.className = 'maint-title';
    title.textContent = 'Descanso Obrigat\u00F3rio';
    content.appendChild(title);

    /* Reason */
    var reason = document.createElement('div');
    reason.className = 'maint-reason';
    reason.textContent = maint.reason || 'O mundo est\u00E1 se transformando\u2026 Aguarde enquanto os pergaminhos s\u00E3o reescritos.';
    content.appendChild(reason);

    /* Countdown */
    var countdown = document.createElement('div');
    countdown.className = 'maint-countdown';
    countdown.id = 'maint-countdown';
    countdown.textContent = _formatCountdown();
    content.appendChild(countdown);

    /* Countdown label */
    var countdownLabel = document.createElement('div');
    countdownLabel.className = 'maint-countdown-label';
    countdownLabel.textContent = 'At\u00E9 a Pr\u00F3xima Jornada';
    content.appendChild(countdownLabel);

    /* Tip box */
    var tip = document.createElement('div');
    tip.className = 'maint-tip';

    var tipLabel = document.createElement('div');
    tipLabel.className = 'maint-tip-label';
    tipLabel.textContent = '\u25C6 Dica do Mestre';
    tip.appendChild(tipLabel);

    _maintTipIdx = Math.floor(Math.random() * _MAINT_TIPS.length);
    var tipText = document.createElement('div');
    tipText.className = 'maint-tip-text';
    tipText.id = 'maint-tip-text';
    tipText.textContent = _MAINT_TIPS[_maintTipIdx];
    tip.appendChild(tipText);

    content.appendChild(tip);

    /* Retry button */
    var retryBtn = document.createElement('button');
    retryBtn.className = 'maint-retry-btn maint-retry-pulse';
    retryBtn.textContent = '\uD83D\uDD04 Verificar Novamente';
    retryBtn.addEventListener('click', function () {
        _pollMaintenanceStatus();
    });
    content.appendChild(retryBtn);

    /* Safe message */
    var safe = document.createElement('div');
    safe.className = 'maint-safe';
    safe.textContent = '\uD83D\uDEE1\uFE0F Dados seguros \u00B7 A aventura retomar\u00E1 automaticamente';
    content.appendChild(safe);

    root.appendChild(content);
    document.body.appendChild(root);

    /* ── Start CampFire particles ── */
    if (typeof CampFire !== 'undefined' && CampFire.init) {
        CampFire.init(canvas);
    } else {
        console.warn('[MAINT] CampFire not available — fire particles skipped');
    }

    /* ── Start intervals ── */
    _maintCountdownInterval = setInterval(_updateCountdown, 1000);
    _maintPollInterval = setInterval(_pollMaintenanceStatus, 30000);
    _maintTipInterval = setInterval(_rotateTip, 8000);
}

/**
 * Format remaining time as HH:MM:SS from start_time + eta.
 */
function _formatCountdown() {
    if (!_maintStartTime || !_maintEtaMin) return 'Em andamento\u2026';

    var endTime = new Date(_maintStartTime.getTime() + _maintEtaMin * 60 * 1000);
    var now = new Date();
    var remainMs = endTime.getTime() - now.getTime();

    if (remainMs <= 0) return 'Finalizando\u2026';

    var totalSec = Math.floor(remainMs / 1000);
    var hh = Math.floor(totalSec / 3600);
    var mm = Math.floor((totalSec % 3600) / 60);
    var ss = totalSec % 60;

    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
}

/**
 * Update countdown display every second.
 */
function _updateCountdown() {
    var el = document.getElementById('maint-countdown');
    if (!el) return;
    el.textContent = _formatCountdown();
}

/**
 * Rotate tip text with fade transition.
 */
function _rotateTip() {
    var el = document.getElementById('maint-tip-text');
    if (!el) return;

    /* Fade out */
    el.style.opacity = '0';

    setTimeout(function () {
        /* Advance to next tip */
        _maintTipIdx = (_maintTipIdx + 1) % _MAINT_TIPS.length;
        el.textContent = _MAINT_TIPS[_maintTipIdx];
        /* Fade in */
        el.style.opacity = '1';
    }, 400);
}

/**
 * Poll the server to check if maintenance has ended.
 * If ended, cleanup and reload.
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
            _cleanup();
            window.location.reload();
        }
    })
    .catch(function (err) {
        console.warn('[MAINT] maintenance poll failed:', err);
    });
}

/**
 * Clean up all intervals, CampFire, and remove the maintenance DOM.
 */
function _cleanup() {
    if (_maintCountdownInterval) {
        clearInterval(_maintCountdownInterval);
        _maintCountdownInterval = null;
    }
    if (_maintPollInterval) {
        clearInterval(_maintPollInterval);
        _maintPollInterval = null;
    }
    if (_maintTipInterval) {
        clearInterval(_maintTipInterval);
        _maintTipInterval = null;
    }
    if (typeof CampFire !== 'undefined' && CampFire.destroy) {
        CampFire.destroy();
    }
    var el = document.getElementById('maint-bonfire');
    if (el) el.remove();
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

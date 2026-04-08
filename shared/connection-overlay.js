/**
 * Connection Overlay v1.4
 * Semi-transparent overlay for temporary connection losses.
 * API: vConnection.show(opts), vConnection.hide(), vConnection.isActive()
 *
 * v1.3: Apply health payload `api` for tunnel URL migration; optional
 * /api/game/status probe when health fails (maintenance vs rede);
 * clearer PT-BR hints for Failed to fetch / timeout.
 * v1.4: Reset maintenance park on each health check so \u201cTentar Agora\u201d
 * re-runs probe and retries (no dead-end after manuten\u00e7\u00e3o UI).
 */
(function() {
'use strict';

var _RETRY_DELAYS = [2000, 4000, 6000, 8000, 8000, 8000];
var _BG_INTERVAL = 15000;
var _BG_MAX = 48; // ~12 minutes max bg polling before giving up

var _el, _statusEl, _detailEl, _fillEl, _retryBtn, _closeBtn;
var _retryIdx = 0;
var _retryTimer = null;
var _countTimer = null;
var _bgTimer = null;
var _bgCount = 0;
var _opts = {};
var _active = false;
var _maintenanceParked = false;

function _log(msg) {
    console.warn('[CONN]', msg);
    if (window.ValdoriaErrors && ValdoriaErrors.log) {
        ValdoriaErrors.log('CONN: ' + msg);
    }
}

var _RUNE_SVG = '<svg class="v-conn-rune" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">'
  + '<circle cx="32" cy="32" r="28" fill="none" stroke="var(--v-gold-25,rgba(196,149,58,0.25))" stroke-width="2"/>'
  + '<circle cx="32" cy="32" r="28" fill="none" stroke="var(--v-gold,#c4953a)" stroke-width="2" stroke-dasharray="20 156" stroke-linecap="round"/>'
  + '</svg>';

function _buildHTML() {
    return '<div id="v-conn-overlay" class="v-conn-overlay">'
      + '<div class="v-conn-content">'
      + '<div class="v-conn-icon">' + _RUNE_SVG + '<div class="v-conn-orb"><div class="v-conn-orb-core"></div></div></div>'
      + '<div class="v-conn-status" id="v-conn-status">Reconectando...</div>'
      + '<div class="v-conn-detail" id="v-conn-detail"></div>'
      + '<div class="v-conn-progress"><div class="v-conn-progress-fill" id="v-conn-fill"></div></div>'
      + '<button class="v-conn-btn" id="v-conn-retry">Tentar Agora</button>'
      + '<button class="v-conn-btn v-conn-btn--secondary" id="v-conn-close">\uD83D\uDD19 Fechar</button>'
      + '</div></div>';
}

function _ensureDOM() {
    if (_el) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = _buildHTML();
    _el = wrap.firstChild;
    document.body.appendChild(_el);
    _statusEl = document.getElementById('v-conn-status');
    _detailEl = document.getElementById('v-conn-detail');
    _fillEl   = document.getElementById('v-conn-fill');
    _retryBtn = document.getElementById('v-conn-retry');
    _closeBtn = document.getElementById('v-conn-close');
    _retryBtn.addEventListener('click', function() {
        _log('manual retry clicked (attempt ' + (_retryIdx + 1) + ')');
        _retryBtn.classList.remove('visible');
        _checkHealth();
    });
    _closeBtn.addEventListener('click', function() {
        _log('user gave up (closed overlay)');
        _clearTimers();
        hide();
        if (_opts.onGiveUp) _opts.onGiveUp();
    });
}

function _clearTimers() {
    if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null; }
    if (_countTimer) { clearInterval(_countTimer); _countTimer = null; }
    if (_bgTimer)    { clearInterval(_bgTimer);    _bgTimer = null; }
}

function _fetchT(url, ms, withAuth) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var tid = ctrl ? setTimeout(function() { ctrl.abort(); }, ms) : null;
    var opts = { method: 'GET', cache: 'no-store' };
    if (ctrl) opts.signal = ctrl.signal;
    if (withAuth !== false && _opts.token) {
        opts.headers = { 'Authorization': 'Bearer ' + _opts.token };
    }
    return fetch(url, opts).finally(function() { if (tid) clearTimeout(tid); });
}

/** Lightweight maintenance probe — no auth (same CORS rules as health). */
function _probeMaintenanceStatus(cb) {
    var base = (_opts.apiBase || '').replace(/\/$/, '');
    if (!base) {
        cb(false, null);
        return;
    }
    var url = base + '/api/game/status';
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var tid = ctrl ? setTimeout(function() { ctrl.abort(); }, 4000) : null;
    var opts = { method: 'GET', cache: 'no-store' };
    if (ctrl) opts.signal = ctrl.signal;
    fetch(url, opts)
        .then(function(r) {
            if (!r.ok) return null;
            return r.json();
        })
        .then(function(data) {
            if (tid) clearTimeout(tid);
            if (data && data.maintenance === true) {
                cb(true, data);
            } else {
                cb(false, data);
            }
        })
        .catch(function() {
            if (tid) clearTimeout(tid);
            cb(false, null);
        });
}

function _applyHealthPayload(data, prevBase) {
    if (!data || typeof data !== 'object') return;
    var nb = data.api || data.new_base_url;
    if (nb && typeof nb === 'string') {
        nb = nb.replace(/\/$/, '');
        if (nb && nb !== prevBase) {
            _log('API URL changed: ' + prevBase + ' -> ' + nb);
            _opts.apiBase = nb;
            if (window.ValdoriaErrors && ValdoriaErrors.updateApiBase) {
                ValdoriaErrors.updateApiBase(nb);
            }
            if (window.ApiDiscovery && ApiDiscovery.updateBase) {
                ApiDiscovery.updateBase(nb);
            }
        }
    }
}

function _networkHint(errType, errMsg) {
    var m = (errMsg || '').toLowerCase();
    if (errType === 'AbortError' || m.indexOf('aborted') >= 0) {
        return 'O servidor demorou para responder. Verifique sua internet ou tente outra rede (Wi-Fi/dados).';
    }
    if (m.indexOf('failed to fetch') >= 0 || m.indexOf('networkerror') >= 0) {
        return 'Sem resposta do servidor. Confira sua conex\u00e3o. Se o problema continuar, feche o jogo e abra de novo pelo Telegram.';
    }
    if (m.indexOf('http 5') >= 0 || m.indexOf('503') >= 0 || m.indexOf('502') >= 0) {
        return 'O servidor pode estar reiniciando ou sobrecarregado. Aguarde um minuto e use \u201cTentar Agora\u201d.';
    }
    return '';
}

function _parkMaintenanceUi(info) {
    _maintenanceParked = true;
    _clearTimers();
    _statusEl.textContent = 'Servidor em manuten\u00e7\u00e3o';
    var lines = ['O jogo est\u00e1 temporariamente indispon\u00edvel (manuten\u00e7\u00e3o ou atualiza\u00e7\u00e3o).'];
    if (info && info.eta) lines.push('Previs\u00e3o: ~' + info.eta + '.');
    if (info && info.start_time) lines.push('In\u00edcio: ' + info.start_time + '.');
    if (info && info.reason) lines.push(info.reason);
    lines.push('Feche esta tela e tente de novo pelo menu do Telegram em alguns minutos.');
    _detailEl.textContent = lines.join(' ');
    _fillEl.style.width = '100%';
    _retryBtn.classList.add('visible');
    _closeBtn.classList.add('visible');
}

function _continueRetryAfterFailure(errType, errMsg) {
    var hint = _networkHint(errType, errMsg);
    if (hint && _detailEl) _detailEl.textContent = hint;

    function bumpRetry() {
        _retryIdx++;
        if (_retryIdx < _RETRY_DELAYS.length) {
            _startRetryLoop();
        } else {
            _log('all ' + _RETRY_DELAYS.length + ' retries exhausted - switching to bg polling');
            _startBgPolling();
        }
    }

    if (_retryIdx >= 2 && !_maintenanceParked) {
        _probeMaintenanceStatus(function(active, data) {
            if (active) {
                _parkMaintenanceUi(data || {});
                return;
            }
            bumpRetry();
        });
        return;
    }
    bumpRetry();
}

function _checkHealth() {
    _maintenanceParked = false;
    var base = (_opts.apiBase || '').replace(/\/$/, '');
    var url = base + '/api/game/health';
    if (_opts.uid) url += '?uid=' + _opts.uid;

    _log('health check start url=' + url + ' online=' + navigator.onLine);
    _statusEl.textContent = 'Verificando conex\u00e3o...';
    _detailEl.textContent = '';

    _fetchT(url, 5000, true).then(function(r) {
        _log('health response status=' + r.status);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
    }).then(function(data) {
        _log('health OK data=' + JSON.stringify(data).substring(0, 120));
        _applyHealthPayload(data, base);
        _onSuccess();
    }).catch(function(err) {
        var errType = err ? (err.name || 'Unknown') : 'Unknown';
        var errMsg = err ? (err.message || '') : '';
        console.error('[CONN] health check failed:', errType, errMsg, 'url=' + url);
        if (window.ValdoriaErrors && ValdoriaErrors.log) {
            ValdoriaErrors.log('CONN health fail: ' + errType + ' ' + errMsg + ' url=' + url);
        }
        if (_bgTimer) {
            _bgCount++;
            _log('bg poll ' + _bgCount + '/' + _BG_MAX + ' failed');
            if (_bgCount >= _BG_MAX) {
                _log('bg polling gave up after ' + _bgCount + ' attempts (~' + Math.round(_bgCount * _BG_INTERVAL / 60000) + 'min)');
                _clearTimers();
                _statusEl.textContent = 'Servidor indisponível';
                _detailEl.textContent = 'Não foi possível reconectar. Feche e reabra o jogo pelo Telegram.';
                _retryBtn.classList.remove('visible');
                _closeBtn.classList.add('visible');
                return;
            }
            if (_bgCount <= 4) {
                _detailEl.textContent = 'Aguardando servidor... (tentativa ' + _bgCount + ')';
            } else {
                _detailEl.textContent = 'O servidor pode estar reiniciando. Isso pode levar até 2 minutos.';
            }
        } else {
            _continueRetryAfterFailure(errType, errMsg);
        }
    });
}

function _onSuccess() {
    _log('connection restored after ' + _retryIdx + ' retries');
    _clearTimers();
    _statusEl.textContent = 'Conex\u00e3o restaurada!';
    _detailEl.textContent = '';
    _fillEl.style.width = '100%';
    _fillEl.style.transition = 'width 0.3s ease';
    _retryBtn.classList.remove('visible');
    _closeBtn.classList.remove('visible');

    setTimeout(function() {
        hide();
        if (window.vToast) vToast('Conex\u00e3o restaurada!', 'success');
        if (_opts.onReconnect) _opts.onReconnect();
    }, 600);
}

function _startRetryLoop() {
    var delay = _RETRY_DELAYS[_retryIdx] || 8000;
    var total = _RETRY_DELAYS.length;
    var secs = Math.ceil(delay / 1000);
    var remaining = secs;

    _log('retry ' + (_retryIdx + 1) + '/' + total + ' in ' + secs + 's');
    _statusEl.textContent = 'Reconectando...';
    _detailEl.textContent = 'Tentativa ' + (_retryIdx + 1) + '/' + total + ' \u2014 pr\u00f3xima em ' + remaining + 's';
    _fillEl.style.transition = 'width ' + delay + 'ms linear';
    _fillEl.style.width = ((_retryIdx + 1) / total * 100) + '%';

    if (_retryIdx >= 2) _retryBtn.classList.add('visible');

    _countTimer = setInterval(function() {
        remaining--;
        if (remaining > 0) {
            _detailEl.textContent = 'Tentativa ' + (_retryIdx + 1) + '/' + total + ' \u2014 pr\u00f3xima em ' + remaining + 's';
        }
    }, 1000);

    _retryTimer = setTimeout(function() {
        if (_countTimer) { clearInterval(_countTimer); _countTimer = null; }
        _checkHealth();
    }, delay);
}

function _startBgPolling() {
    _bgCount = 0;
    _log('starting bg polling (interval=' + (_BG_INTERVAL/1000) + 's, unlimited)');
    _statusEl.textContent = 'Servidor indispon\u00edvel';
    _detailEl.textContent = 'Tentando reconectar em segundo plano...';
    _fillEl.style.width = '100%';
    _retryBtn.classList.add('visible');
    _closeBtn.classList.add('visible');

    _bgTimer = setInterval(function() {
        _checkHealth();
    }, _BG_INTERVAL);
}

function show(opts) {
    _opts = opts || {};
    _active = true;
    _retryIdx = 0;
    _bgCount = 0;
    _maintenanceParked = false;
    _ensureDOM();
    _clearTimers();

    _log('show overlay api=' + (_opts.apiBase || '(none)') + ' uid=' + (_opts.uid || 0) + ' msg=' + (_opts.message || 'default'));

    if (window.vProcessing && vProcessing.isActive()) vProcessing.hide();

    _statusEl.textContent = _opts.message || 'Reconectando...';
    _detailEl.textContent = '';
    _fillEl.style.width = '0';
    _fillEl.style.transition = 'none';
    _retryBtn.classList.remove('visible');
    _closeBtn.classList.remove('visible');

    _el.classList.remove('hiding');
    _el.classList.add('active');

    _startRetryLoop();
}

function hide() {
    if (!_el) return;
    _log('hide overlay');
    _active = false;
    _el.classList.add('hiding');
    _el.classList.remove('active');
}

function isActive() { return _active; }

window.vConnection = { show: show, hide: hide, isActive: isActive };
})();

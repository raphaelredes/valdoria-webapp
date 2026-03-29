/**
 * Connection Overlay v1.0
 * Semi-transparent overlay for temporary connection losses.
 * API: vConnection.show(opts), vConnection.hide(), vConnection.isActive()
 */
(function() {
'use strict';

var _RETRY_DELAYS = [2000, 4000, 6000, 8000, 8000, 8000];
var _BG_INTERVAL = 15000;
var _BG_MAX = 12;

var _el, _statusEl, _detailEl, _fillEl, _retryBtn, _closeBtn;
var _retryIdx = 0;
var _retryTimer = null;
var _countTimer = null;
var _bgTimer = null;
var _bgCount = 0;
var _opts = {};
var _active = false;

var _RUNE_SVG = '<svg class="v-conn-rune" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">'
  + '<circle cx="32" cy="32" r="28" fill="none" stroke="var(--v-gold-25,rgba(196,149,58,0.25))" stroke-width="2"/>'
  + '<circle cx="32" cy="32" r="28" fill="none" stroke="var(--v-gold,#c4953a)" stroke-width="2" stroke-dasharray="20 156" stroke-linecap="round"/>'
  + '</svg>';

function _buildHTML() {
    return '<div id="v-conn-overlay" class="v-conn-overlay">'
      + '<div class="v-conn-content">'
      + '<div class="v-conn-icon">' + _RUNE_SVG + '<span class="v-conn-gem">\u25C6</span></div>'
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
        _retryBtn.classList.remove('visible');
        _checkHealth();
    });
    _closeBtn.addEventListener('click', function() {
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

function _fetchT(url, ms) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var tid = ctrl ? setTimeout(function() { ctrl.abort(); }, ms) : null;
    var opts = { method: 'GET', cache: 'no-store' };
    if (ctrl) opts.signal = ctrl.signal;
    if (_opts.token) opts.headers = { 'Authorization': 'Bearer ' + _opts.token };
    return fetch(url, opts).finally(function() { if (tid) clearTimeout(tid); });
}

function _checkHealth() {
    var base = _opts.apiBase || '';
    var url = base + '/api/game/health';
    if (_opts.uid) url += '?uid=' + _opts.uid;

    _statusEl.textContent = 'Verificando conex\u00e3o...';
    _detailEl.textContent = '';

    _fetchT(url, 5000).then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
    }).then(function(data) {
        if (data && data.new_base_url && data.new_base_url !== base) {
            _opts.apiBase = data.new_base_url;
        }
        _onSuccess();
    }).catch(function() {
        if (_bgTimer) {
            _bgCount++;
            _detailEl.textContent = 'Aguardando servidor... (' + _bgCount + '/' + _BG_MAX + ')';
            if (_bgCount >= _BG_MAX) {
                _clearTimers();
                hide();
                if (_opts.onGiveUp) _opts.onGiveUp();
            }
        } else {
            _retryIdx++;
            if (_retryIdx < _RETRY_DELAYS.length) {
                _startRetryLoop();
            } else {
                _startBgPolling();
            }
        }
    });
}

function _onSuccess() {
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
    _ensureDOM();
    _clearTimers();

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
    _active = false;
    _el.classList.add('hiding');
    _el.classList.remove('active');
}

function isActive() { return _active; }

window.vConnection = { show: show, hide: hide, isActive: isActive };
})();

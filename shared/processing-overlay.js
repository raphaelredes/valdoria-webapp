/**
 * Processing Overlay v1.0 — Runa Giratoria
 * Lightweight loading overlay for in-game transitions and API calls.
 * API: vProcessing.show(opts), vProcessing.hide(), vProcessing.isActive(), vProcessing.setText(text)
 */
(function() {
'use strict';

var _timers = {};
var _onRetry = null;
var _overlayEl = null;
var _textEl = null;
var _retryEl = null;
var _originalText = '';

// Elder Futhark runes for the ring
var RUNES = '\u16A0 \u16A2 \u16A6 \u16A8 \u16B1 \u16B2 \u16B7 \u16B9 \u16BA \u16BE \u16C1 \u16C3 \u16C7 \u16C8 \u16C9 \u16CA \u16CF \u16D2';

function _buildHTML() {
    var h = '<div id="v-processing" class="v-processing" style="display:none">'
      + '<div class="v-processing-icon">'
      + '<svg class="v-processing-rune" viewBox="0 0 200 200">'
      + '<defs><path id="vpRunePath" d="M100,100 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0"/></defs>'
      + '<circle cx="100" cy="100" r="80" fill="none" stroke="rgba(196,149,58,0.12)" stroke-width="1"/>'
      + '<circle cx="100" cy="100" r="82" fill="none" stroke="rgba(196,149,58,0.06)" stroke-width="0.5" stroke-dasharray="3 6"/>'
      + '<text fill="rgba(196,149,58,0.5)" font-size="11" letter-spacing="3"><textPath href="#vpRunePath" startOffset="0%">' + RUNES + '</textPath></text>'
      + '</svg>'
      + '<div class="v-processing-gem">\u25C6</div>'
      + '</div>'
      + '<div id="v-processing-text" class="v-processing-text">Carregando...</div>'
      + '<button id="v-processing-retry" class="v-processing-retry">Tentar novamente</button>'
      + '</div>';
    return h;
}

function _ensureDOM() {
    if (_overlayEl) return;
    var container = document.createElement('div');
    container.innerHTML = _buildHTML();
    var el = container.firstChild;
    document.body.appendChild(el);
    _overlayEl = el;
    _textEl = document.getElementById('v-processing-text');
    _retryEl = document.getElementById('v-processing-retry');
    _retryEl.addEventListener('click', function() {
        if (typeof haptic === 'function') haptic('light');
        if (_onRetry) _onRetry();
    });
}

function _clearTimers() {
    for (var k in _timers) {
        if (_timers[k]) { clearTimeout(_timers[k]); _timers[k] = null; }
    }
}

function show(opts) {
    opts = opts || {};
    _ensureDOM();
    _clearTimers();

    _originalText = opts.text || 'Carregando...';
    _onRetry = opts.onRetry || null;
    var timeoutMs = opts.timeoutMs || 15000;

    _textEl.textContent = _originalText;
    _textEl.className = 'v-processing-text';
    _retryEl.classList.remove('visible');
    _overlayEl.classList.remove('hiding');
    _overlayEl.style.display = 'flex';

    // Force reflow then add active
    void _overlayEl.offsetWidth;
    _overlayEl.classList.add('active');

    // Slow connection warning at 8s
    _timers.slow = setTimeout(function() {
        if (_textEl) {
            _textEl.textContent = 'Demorando um pouco...';
            _textEl.classList.add('v-processing-text--slow');
        }
    }, 8000);

    // Retry button at 12s
    _timers.retry = setTimeout(function() {
        if (_retryEl && _onRetry) _retryEl.classList.add('visible');
    }, 12000);

    // Timeout at configured time — auto-hide if no callback
    _timers.timeout = setTimeout(function() {
        if (opts.onTimeout) {
            opts.onTimeout();
        } else {
            console.warn('[PROCESSING] auto-hide after timeout (' + timeoutMs + 'ms)');
            hide();
        }
    }, timeoutMs);
}

function hide() {
    if (!_overlayEl) return;
    _clearTimers();
    _overlayEl.classList.remove('active');
    _overlayEl.classList.add('hiding');
    setTimeout(function() {
        if (_overlayEl && !_overlayEl.classList.contains('active')) {
            _overlayEl.style.display = 'none';
            _overlayEl.classList.remove('hiding');
        }
    }, 200);
}

function isActive() {
    return _overlayEl ? _overlayEl.classList.contains('active') : false;
}

function setText(text) {
    if (_textEl) _textEl.textContent = text;
}

window.vProcessing = { show: show, hide: hide, isActive: isActive, setText: setText };

})();

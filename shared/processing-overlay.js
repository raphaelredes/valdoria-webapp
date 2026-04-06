/**
 * Processing Overlay v2.0 — Runa Giratoria (Content-Aware)
 * Lightweight loading overlay for in-game transitions and API calls.
 * Now with content detection polling and comprehensive logging.
 *
 * API:
 *   vProcessing.show(opts)   — opts: { text, contentCheck, onRetry, onTimeout, timeoutMs }
 *   vProcessing.hide()       — hide with 200ms fade
 *   vProcessing.isActive()   — check if showing
 *   vProcessing.setText(text) — update text mid-load
 *
 * contentCheck (NEW in v2.0):
 *   CSS selector string or function returning truthy when content is ready.
 *   Polls every 300ms and auto-hides when content detected.
 *   Example: vProcessing.show({ text: 'Loading...', contentCheck: '#my-canvas' })
 */
(function() {
'use strict';

var _timers = {};
var _onRetry = null;
var _overlayEl = null;
var _textEl = null;
var _retryEl = null;
var _originalText = '';
var _showTime = 0;
var _contentCheckDesc = '';

// Elder Futhark runes for the ring
var RUNES = '\u16A0 \u16A2 \u16A6 \u16A8 \u16B1 \u16B2 \u16B7 \u16B9 \u16BA \u16BE \u16C1 \u16C3 \u16C7 \u16C8 \u16C9 \u16CA \u16CF \u16D2';

function _elapsed() {
    return _showTime ? (Date.now() - _showTime) : 0;
}

function _log(level, msg) {
    var prefix = '[PROCESSING] +' + _elapsed() + 'ms ';
    if (level === 'warn') console.warn(prefix + msg);
    else if (level === 'error') console.error(prefix + msg);
    else console.info(prefix + msg);
}

function _buildOverlay() {
    var el = document.createElement('div');
    el.id = 'v-processing';
    el.className = 'v-processing';
    el.style.display = 'none';

    var icon = document.createElement('div');
    icon.className = 'v-processing-icon';

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'v-processing-rune');
    svg.setAttribute('viewBox', '0 0 200 200');

    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('id', 'vpRunePath');
    path.setAttribute('d', 'M100,100 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0');
    defs.appendChild(path);
    svg.appendChild(defs);

    var c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c1.setAttribute('cx', '100'); c1.setAttribute('cy', '100'); c1.setAttribute('r', '80');
    c1.setAttribute('fill', 'none'); c1.setAttribute('stroke', 'rgba(196,149,58,0.12)'); c1.setAttribute('stroke-width', '1');
    svg.appendChild(c1);

    var c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c2.setAttribute('cx', '100'); c2.setAttribute('cy', '100'); c2.setAttribute('r', '82');
    c2.setAttribute('fill', 'none'); c2.setAttribute('stroke', 'rgba(196,149,58,0.06)');
    c2.setAttribute('stroke-width', '0.5'); c2.setAttribute('stroke-dasharray', '3 6');
    svg.appendChild(c2);

    var txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('fill', 'rgba(196,149,58,0.5)'); txt.setAttribute('font-size', '11'); txt.setAttribute('letter-spacing', '3');
    var tp = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
    tp.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#vpRunePath');
    tp.setAttribute('startOffset', '0%');
    tp.textContent = RUNES;
    txt.appendChild(tp);
    svg.appendChild(txt);

    icon.appendChild(svg);

    /* Mini Orb of Valdoria (replaces ◆ gem) */
    var orbWrap = document.createElement('div');
    orbWrap.className = 'v-processing-orb';
    var orbShell = document.createElement('div');
    orbShell.className = 'vpo-shell';
    var orbNeb = document.createElement('div');
    orbNeb.className = 'vpo-nebula';
    var nebClasses = ['vpo-n1','vpo-n2','vpo-n3'];
    for (var ni = 0; ni < nebClasses.length; ni++) {
        var nd = document.createElement('div');
        nd.className = nebClasses[ni];
        orbNeb.appendChild(nd);
    }
    orbShell.appendChild(orbNeb);
    var orbCore = document.createElement('div');
    orbCore.className = 'vpo-core';
    orbShell.appendChild(orbCore);
    var orbFresnel = document.createElement('div');
    orbFresnel.className = 'vpo-fresnel';
    orbShell.appendChild(orbFresnel);
    var orbHighlight = document.createElement('div');
    orbHighlight.className = 'vpo-highlight';
    orbShell.appendChild(orbHighlight);
    orbWrap.appendChild(orbShell);
    icon.appendChild(orbWrap);

    el.appendChild(icon);

    var textDiv = document.createElement('div');
    textDiv.id = 'v-processing-text';
    textDiv.className = 'v-processing-text';
    textDiv.textContent = 'Carregando...';
    el.appendChild(textDiv);

    var retryBtn = document.createElement('button');
    retryBtn.id = 'v-processing-retry';
    retryBtn.className = 'v-processing-retry';
    retryBtn.textContent = 'Tentar novamente';
    el.appendChild(retryBtn);

    return el;
}

function _ensureDOM() {
    if (_overlayEl) return;
    var el = _buildOverlay();
    document.body.appendChild(el);
    _overlayEl = el;
    _textEl = document.getElementById('v-processing-text');
    _retryEl = document.getElementById('v-processing-retry');
    _retryEl.addEventListener('click', function() {
        if (typeof haptic === 'function') haptic('light');
        _log('info', 'retry clicked');
        if (_onRetry) _onRetry();
    });
}

function _clearTimers() {
    for (var k in _timers) {
        if (_timers[k]) {
            if (k === 'content') clearInterval(_timers[k]);
            else clearTimeout(_timers[k]);
            _timers[k] = null;
        }
    }
}

function _captureDOMState(selector, timeoutMs) {
    try {
        var el = typeof selector === 'string' ? document.querySelector(selector) : null;
        var state = {
            selector: selector,
            exists: !!el,
            display: el ? getComputedStyle(el).display : 'N/A',
            height: el ? el.offsetHeight : 0,
            visible: el ? (el.offsetHeight > 0 && getComputedStyle(el).visibility !== 'hidden') : false,
        };
        // Capture top-level visible elements for context
        var bodyChildren = [];
        var kids = document.body.children;
        for (var i = 0; i < Math.min(kids.length, 15); i++) {
            var kid = kids[i];
            if (kid.id === 'v-processing') continue;
            var tag = kid.tagName.toLowerCase();
            var id = kid.id ? '#' + kid.id : '';
            var cls = kid.className ? '.' + String(kid.className).split(' ')[0] : '';
            var h = kid.offsetHeight;
            bodyChildren.push(tag + id + cls + '(' + h + 'px)');
        }
        state.bodyChildren = bodyChildren.join(', ');
        // Check for JS errors that might have prevented content rendering
        var errBuf = window.__valdoria_getConsoleBuffer ? window.__valdoria_getConsoleBuffer() : [];
        var recentErrors = errBuf.filter(function(e) { return e.level === 'E'; }).slice(-3);
        if (recentErrors.length) {
            state.recentErrors = recentErrors.map(function(e) { return e.msg; }).join(' | ');
        }
        console.error('[PROCESSING] TIMEOUT DIAGNOSTICS after ' + timeoutMs + 'ms: '
            + JSON.stringify(state));
    } catch (e) {
        console.error('[PROCESSING] failed to capture DOM state: ' + e.message);
    }
}

function show(opts) {
    opts = opts || {};
    _ensureDOM();
    _clearTimers();

    _showTime = Date.now();
    _originalText = opts.text || 'Carregando...';
    _onRetry = opts.onRetry || null;
    var timeoutMs = opts.timeoutMs || 8000;
    _contentCheckDesc = '';

    _textEl.textContent = _originalText;
    _textEl.className = 'v-processing-text';
    _retryEl.classList.remove('visible');
    _overlayEl.classList.remove('hiding');
    _overlayEl.style.display = 'flex';

    // Force reflow then add active
    void _overlayEl.offsetWidth;
    _overlayEl.classList.add('active');

    // Log show
    if (opts.contentCheck) {
        _contentCheckDesc = typeof opts.contentCheck === 'string' ? opts.contentCheck : 'fn()';
    }
    console.info('[PROCESSING] show text="' + _originalText + '"'
        + (_contentCheckDesc ? ' contentCheck=' + _contentCheckDesc : '')
        + ' timeout=' + timeoutMs + 'ms');

    // Content polling (NEW in v2.0)
    if (opts.contentCheck) {
        var _checkFn = typeof opts.contentCheck === 'function'
            ? opts.contentCheck
            : function() {
                var el = document.querySelector(opts.contentCheck);
                return el && el.offsetHeight > 0;
            };
        var _pollCount = 0;
        _timers.content = setInterval(function() {
            _pollCount++;
            try {
                if (_checkFn()) {
                    _log('info', 'content ready via ' + _contentCheckDesc + ' (poll #' + _pollCount + ') — auto-hiding');
                    _clearTimers();
                    hide();
                }
            } catch (e) {
                _log('error', 'contentCheck error: ' + e.message);
            }
        }, 300);
    }

    // Slow connection warning at 12s
    _timers.slow = setTimeout(function() {
        _log('warn', 'still loading — showing slow warning');
        if (_textEl) {
            _textEl.textContent = 'Demorando um pouco...';
            _textEl.classList.add('v-processing-text--slow');
        }
    }, 12000);

    // Retry button at 18s
    _timers.retry = setTimeout(function() {
        if (_retryEl && _onRetry) {
            _log('warn', 'showing retry button');
            _retryEl.classList.add('visible');
        }
    }, 18000);

    // Timeout at configured time — auto-hide if no callback
    _timers.timeout = setTimeout(function() {
        // Capture DOM state for diagnostics when content never appeared
        if (_contentCheckDesc) {
            _captureDOMState(_contentCheckDesc, timeoutMs);
        }
        if (opts.onTimeout) {
            _log('warn', 'timeout reached (' + timeoutMs + 'ms) — calling onTimeout callback');
            opts.onTimeout();
        } else {
            _log('warn', 'timeout reached (' + timeoutMs + 'ms) — auto-hiding'
                + (_contentCheckDesc ? ' (content ' + _contentCheckDesc + ' never appeared)' : ''));
            hide();
        }
    }, timeoutMs);
}

function hide() {
    if (!_overlayEl) return;
    var duration = _elapsed();
    var wasActive = _overlayEl.classList.contains('active');
    if (wasActive) {
        console.info('[PROCESSING] hide after ' + duration + 'ms');
    }
    _clearTimers();
    _showTime = 0;
    _contentCheckDesc = '';
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
    if (_showTime) {
        _log('info', 'setText="' + text + '"');
    }
    if (_textEl) _textEl.textContent = text;
}

window.vProcessing = { show: show, hide: hide, isActive: isActive, setText: setText };

})();

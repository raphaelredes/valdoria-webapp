/**
 * Processing Overlay v4.0 — Padrão Canônico Anel Dourado Duplo + Losango + Fagulhas
 * Carregamento prévio padronizado de telas e ações em todo o projeto,
 * podendo informar instabilidade de conexão mantendo a animação ativa no centro.
 *
 * API:
 *   vProcessing.show(opts)   — opts: { text, tip, contentCheck, onRetry, onTimeout, timeoutMs }
 *   vProcessing.hide()       — hide with 200ms fade
 *   vProcessing.isActive()   — check if showing
 *   vProcessing.setText(text) — update text mid-load
 *   vProcessing.showInstability(opts) — switch text to instability notice while keeping animation
 */
(function() {
'use strict';

var _timers = {};
var _onRetry = null;
var _overlayEl = null;
var _textEl = null;
var _subEl = null;
var _hintEl = null;
var _retryEl = null;
var _originalText = '';
var _showTime = 0;
var _contentCheckDesc = '';

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
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML =
        '<div class="v-processing-glow"></div>' +
        '<div class="v-processing-ring-cw"></div>' +
        '<div class="v-processing-ring-ccw"></div>' +
        '<div class="v-processing-core">&#9670;</div>' +
        '<div class="v-processing-ember-1"></div>' +
        '<div class="v-processing-ember-2"></div>' +
        '<div class="v-processing-ember-3"></div>';
    el.appendChild(icon);

    var textDiv = document.createElement('div');
    textDiv.id = 'v-processing-text';
    textDiv.className = 'v-processing-text';
    textDiv.textContent = 'Entrando em Valdória…';
    el.appendChild(textDiv);

    var subDiv = document.createElement('div');
    subDiv.id = 'vp-tip';
    subDiv.className = 'v-processing-sub';
    subDiv.textContent = 'Preparando sua aventura…';
    el.appendChild(subDiv);

    var hintDiv = document.createElement('div');
    hintDiv.id = 'vp-hint';
    hintDiv.className = 'v-processing-hint';
    hintDiv.textContent = 'Aguarde alguns minutos e tente novamente.';
    el.appendChild(hintDiv);

    var retryBtn = document.createElement('button');
    retryBtn.id = 'v-processing-retry';
    retryBtn.type = 'button';
    retryBtn.className = 'v-processing-retry';
    retryBtn.textContent = 'Tentar Novamente';
    el.appendChild(retryBtn);

    return el;
}

function _ensureDOM() {
    if (_overlayEl) return;
    var el = _buildOverlay();
    document.body.appendChild(el);
    _overlayEl = el;
    _textEl = el.querySelector('#v-processing-text');
    _subEl = el.querySelector('#vp-tip');
    _hintEl = el.querySelector('#vp-hint');
    _retryEl = el.querySelector('#v-processing-retry');
    if (_retryEl) {
        _retryEl.addEventListener('click', function() {
            if (typeof haptic === 'function') haptic('light');
            _log('info', 'retry clicked');
            if (_onRetry) {
                _onRetry();
            } else {
                try {
                    var u = new URL(window.location.href);
                    u.searchParams.set('_cb', String(Date.now()));
                    window.location.replace(u.toString());
                } catch (_e) {
                    window.location.reload();
                }
            }
        });
    }
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

function _elementContentReady(el) {
    if (!el) return false;
    try {
        var cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') {
            return false;
        }
    } catch (e) {
        return false;
    }
    if (el.offsetHeight > 0 || el.offsetWidth > 0) return true;
    try {
        var rect = el.getBoundingClientRect();
        if (rect.width >= 2 && rect.height >= 2) return true;
    } catch (e2) { /* intentionally silent */ }
    var scoped = el.querySelectorAll('canvas, img, picture > img, svg');
    for (var i = 0; i < scoped.length; i++) {
        var node = scoped[i];
        try {
            var ncs = getComputedStyle(node);
            if (ncs.display === 'none' || ncs.visibility === 'hidden') continue;
        } catch (e3) { continue; }
        if (node.offsetHeight > 0 && node.offsetWidth > 0) return true;
        try {
            var nr = node.getBoundingClientRect();
            if (nr.width >= 2 && nr.height >= 2) return true;
        } catch (e4) { /* intentionally silent */ }
    }
    return false;
}

function _captureDOMState(selector, timeoutMs) {
    try {
        var el = typeof selector === 'string' ? document.querySelector(selector) : null;
        var state = {
            selector: selector,
            exists: !!el,
            display: el ? getComputedStyle(el).display : 'N/A',
            height: el ? el.offsetHeight : 0,
            visible: el ? _elementContentReady(el) : false,
        };
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

function showInstability(opts) {
    opts = opts || {};
    _ensureDOM();
    _clearTimers();
    if (_textEl) {
        _textEl.textContent = opts.title || 'Não foi possível carregar o jogo';
        _textEl.classList.add('v-processing-text--slow');
    }
    if (_subEl) {
        _subEl.textContent = opts.subtitle || 'Instabilidade momentânea na conexão com o servidor.';
        _subEl.style.display = 'block';
    }
    if (_hintEl) {
        _hintEl.textContent = opts.hint != null ? opts.hint : 'Aguarde alguns minutos e tente novamente.';
        _hintEl.classList.add('visible');
    }
    if (opts.onRetry) _onRetry = opts.onRetry;
    if (_retryEl) _retryEl.classList.add('visible');
    _overlayEl.classList.remove('hiding');
    _overlayEl.style.display = 'flex';
    void _overlayEl.offsetWidth;
    _overlayEl.classList.add('active');
}

function show(opts) {
    opts = opts || {};
    _ensureDOM();
    _clearTimers();

    _showTime = Date.now();
    _originalText = opts.text || 'Entrando em Valdória…';
    _onRetry = opts.onRetry || null;
    var timeoutMs = opts.timeoutMs || 8000;
    _contentCheckDesc = '';

    _textEl.textContent = _originalText;
    _textEl.className = 'v-processing-text';
    if (_subEl) {
        _subEl.textContent = opts.tip || 'Preparando sua aventura…';
        _subEl.style.display = 'block';
    }
    if (_hintEl) {
        _hintEl.classList.remove('visible');
    }
    if (_retryEl) {
        _retryEl.classList.remove('visible');
    }
    _overlayEl.classList.remove('hiding');
    _overlayEl.style.display = 'flex';

    void _overlayEl.offsetWidth;
    _overlayEl.classList.add('active');

    if (opts.contentCheck) {
        _contentCheckDesc = typeof opts.contentCheck === 'string' ? opts.contentCheck : 'fn()';
    }
    console.info('[PROCESSING] show text="' + _originalText + '"'
        + (_contentCheckDesc ? ' contentCheck=' + _contentCheckDesc : '')
        + ' timeout=' + timeoutMs + 'ms');

    if (opts.contentCheck) {
        var _checkFn = typeof opts.contentCheck === 'function'
            ? opts.contentCheck
            : function() {
                var el = document.querySelector(opts.contentCheck);
                return _elementContentReady(el);
            };
        var _pollCount = 0;
        var _pollMs = 100;
        function _contentPollTick() {
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
        }
        _contentPollTick();
        _timers.content = setInterval(_contentPollTick, _pollMs);
    }

    // Slow connection warning at 8s
    _timers.slow = setTimeout(function() {
        _log('warn', 'still loading — showing slow warning');
        if (_textEl) {
            _textEl.classList.add('v-processing-text--slow');
        }
        if (_subEl) {
            _subEl.textContent = 'Instabilidade momentânea detectada. Sincronizando…';
        }
    }, 8000);

    // Retry button + instability notice at 15s
    _timers.retry = setTimeout(function() {
        _log('warn', 'showing instability notice and retry button');
        if (_subEl) {
            _subEl.textContent = 'Instabilidade momentânea na conexão com o servidor.';
        }
        if (_hintEl) {
            _hintEl.classList.add('visible');
        }
        if (_retryEl) {
            _retryEl.classList.add('visible');
        }
    }, 15000);

    // Timeout at configured time — auto-hide if no callback
    _timers.timeout = setTimeout(function() {
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

function setText(text, subText) {
    if (_showTime) {
        _log('info', 'setText="' + text + '"');
    }
    if (_textEl && text) _textEl.textContent = text;
    if (_subEl && subText != null) _subEl.textContent = subText;
}

window.vProcessing = {
    show: show,
    hide: hide,
    isActive: isActive,
    setText: setText,
    showInstability: showInstability
};

})();

/**
 * DEV Debug Panel v1.0
 * Lateral debug panel shown to the RIGHT of the 430px game frame.
 * Browser console tab + Server SSE log tab.
 *
 * Activates when: URL has ?env=dev AND (html.web-standalone OR path has /web/)
 * Uses var (project convention). Pure DOM manipulation (textContent + createElement).
 */
(function() {
'use strict';

var MAX_LINES = 500;
var SSE_RETRY_MS = 5000;
var LEVELS = ['error', 'warn', 'info', 'debug'];

var _active = false;
var _tab = 'browser';
var _paused = false;
var _filter = '';
var _hiddenLevels = {};
var _browserLines = [];
var _serverLines = [];
var _sseSource = null;
var _sseRetryTimer = null;

var _panel = null;
var _scrollEl = null;
var _sseStatusEl = null;
var _filterInput = null;
var _pauseBtn = null;
var _tabBtns = {};
var _lvlBtns = {};

function _shouldActivate() {
    try {
        var s = window.location.search || '';
        if (!/[?&]env=dev(?:&|$)/.test(s)) return false;
        return document.documentElement.classList.contains('web-standalone')
            || /\/web\//.test(window.location.pathname);
    } catch (e) { return false; }
}

function _ts() {
    var n = new Date();
    return [n.getHours(), n.getMinutes(), n.getSeconds()].map(function(x) {
        return x.toString().padStart(2, '0');
    }).join(':') + '.' + n.getMilliseconds().toString().padStart(3, '0');
}

function _clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
}

function _buildPanel() {
    var panel = document.createElement('div');
    panel.id = 'dev-log-panel';

    var header = document.createElement('div');
    header.className = 'dev-panel-header';

    ['browser', 'server'].forEach(function(t) {
        var btn = document.createElement('button');
        btn.className = 'dev-tab-btn' + (t === 'browser' ? ' active' : '');
        btn.textContent = t[0].toUpperCase() + t.slice(1);
        btn.setAttribute('data-tab', t);
        btn.addEventListener('click', function() { _switchTab(t); });
        _tabBtns[t] = btn;
        header.appendChild(btn);
    });

    var dot = document.createElement('span');
    dot.id = 'dev-sse-status';
    dot.className = 'dev-sse-status';
    dot.title = 'SSE connection status';
    _sseStatusEl = dot;
    header.appendChild(dot);

    var sp = document.createElement('span');
    sp.className = 'dev-panel-spacer';
    header.appendChild(sp);

    var pb = document.createElement('button');
    pb.className = 'dev-ctrl-btn';
    pb.textContent = 'Pause';
    pb.addEventListener('click', _togglePause);
    _pauseBtn = pb;
    header.appendChild(pb);

    var cb = document.createElement('button');
    cb.className = 'dev-ctrl-btn';
    cb.textContent = 'Clear';
    cb.addEventListener('click', _clear);
    header.appendChild(cb);

    panel.appendChild(header);

    var fb = document.createElement('div');
    fb.className = 'dev-panel-filter';

    var fi = document.createElement('input');
    fi.id = 'dev-log-filter';
    fi.type = 'text';
    fi.placeholder = 'filter...';
    fi.addEventListener('input', function() {
        _filter = fi.value.toLowerCase();
        _rerender();
    });
    _filterInput = fi;
    fb.appendChild(fi);

    LEVELS.forEach(function(level) {
        var b = document.createElement('button');
        b.className = 'dev-lvl-btn';
        b.setAttribute('data-level', level);
        b.textContent = level[0].toUpperCase();
        b.title = level;
        b.addEventListener('click', function() { _toggleLevel(level); });
        _lvlBtns[level] = b;
        fb.appendChild(b);
    });

    panel.appendChild(fb);

    var sc = document.createElement('div');
    sc.id = 'dev-log-scroll';
    sc.className = 'dev-log-scroll';
    _scrollEl = sc;
    panel.appendChild(sc);

    return panel;
}

function _addLine(tab, level, msg) {
    var entry = { ts: _ts(), level: level, msg: msg };
    var buf = tab === 'server' ? _serverLines : _browserLines;
    buf.push(entry);
    if (buf.length > MAX_LINES) {
        buf.splice(0, buf.length - MAX_LINES);
        if (tab === _tab) { _rerender(); return; }
    }
    if (tab === _tab) { _appendDOM(entry); }
}

function _appendDOM(entry) {
    if (!_scrollEl) return;
    if (_hiddenLevels[entry.level]) return;
    if (_filter && entry.msg.toLowerCase().indexOf(_filter) === -1) return;
    var el = _buildLineEl(entry);
    var em = _scrollEl.querySelector('.dev-log-empty');
    if (em) _scrollEl.removeChild(em);
    _scrollEl.appendChild(el);
    if (!_paused) _scrollEl.scrollTop = _scrollEl.scrollHeight;
}

function _buildLineEl(entry) {
    var div = document.createElement('div');
    div.className = 'dev-log-line';
    div.setAttribute('data-level', entry.level);
    if (_hiddenLevels[entry.level]) div.classList.add('level-hidden');

    var ts = document.createElement('span');
    ts.className = 'dev-log-ts';
    ts.textContent = entry.ts + ' ';

    var lv = document.createElement('span');
    lv.className = 'dev-log-lvl';
    lv.textContent = '[' + entry.level.toUpperCase() + '] ';

    /* Use textContent — safe plain-text display, no XSS risk */
    var mg = document.createElement('span');
    mg.textContent = entry.msg;

    div.appendChild(ts);
    div.appendChild(lv);
    div.appendChild(mg);
    return div;
}

function _emptyMsg() {
    var em = document.createElement('div');
    em.className = 'dev-log-empty';
    em.textContent = 'Sem logs.';
    return em;
}

function _rerender() {
    if (!_scrollEl) return;
    _clearChildren(_scrollEl);
    var buf = _tab === 'server' ? _serverLines : _browserLines;
    if (!buf.length) { _scrollEl.appendChild(_emptyMsg()); return; }
    buf.forEach(function(entry) {
        if (_hiddenLevels[entry.level]) return;
        if (_filter && entry.msg.toLowerCase().indexOf(_filter) === -1) return;
        _scrollEl.appendChild(_buildLineEl(entry));
    });
    if (!_paused) _scrollEl.scrollTop = _scrollEl.scrollHeight;
}

function _switchTab(tab) {
    _tab = tab;
    Object.keys(_tabBtns).forEach(function(t) {
        if (_tabBtns[t]) _tabBtns[t].classList.toggle('active', t === tab);
    });
    _rerender();
}

function _clear() {
    if (_tab === 'server') _serverLines = []; else _browserLines = [];
    if (!_scrollEl) return;
    _clearChildren(_scrollEl);
    _scrollEl.appendChild(_emptyMsg());
}

function _togglePause() {
    _paused = !_paused;
    if (_pauseBtn) {
        _pauseBtn.textContent = _paused ? 'Resume' : 'Pause';
        _pauseBtn.classList.toggle('active', _paused);
        if (!_paused && _scrollEl) _scrollEl.scrollTop = _scrollEl.scrollHeight;
    }
}

function _toggleLevel(level) {
    _hiddenLevels[level] = !_hiddenLevels[level];
    if (_lvlBtns[level]) _lvlBtns[level].classList.toggle('hidden-level', !!_hiddenLevels[level]);
    if (_scrollEl) {
        var lines = _scrollEl.querySelectorAll('.dev-log-line[data-level="' + level + '"]');
        for (var i = 0; i < lines.length; i++) {
            lines[i].classList.toggle('level-hidden', !!_hiddenLevels[level]);
        }
    }
}

function _fmtArgs(args) {
    var parts = [];
    for (var i = 0; i < args.length; i++) {
        var a = args[i];
        if (a === null) parts.push('null');
        else if (typeof a === 'undefined') parts.push('undefined');
        else if (typeof a === 'object') { try { parts.push(JSON.stringify(a)); } catch (e2) { parts.push(String(a)); } }
        else parts.push(String(a));
    }
    return parts.join(' ');
}

function _interceptConsole() {
    var origLog   = console.log.bind(console);
    var origInfo  = console.info.bind(console);
    var origWarn  = console.warn.bind(console);
    var origError = console.error.bind(console);

    console.log   = function() { origLog.apply(console, arguments);   _addLine('browser', 'debug', _fmtArgs(arguments)); };
    console.info  = function() { origInfo.apply(console, arguments);  _addLine('browser', 'info',  _fmtArgs(arguments)); };
    console.warn  = function() { origWarn.apply(console, arguments);  _addLine('browser', 'warn',  _fmtArgs(arguments)); };
    console.error = function() { origError.apply(console, arguments); _addLine('browser', 'error', _fmtArgs(arguments)); };

    window.addEventListener('error', function(evt) {
        var msg = '[UncaughtError] ' + (evt.message || 'unknown');
        if (evt.filename) msg += ' @ ' + evt.filename;
        if (evt.lineno)   msg += ':' + evt.lineno;
        _addLine('browser', 'error', msg);
    });

    window.addEventListener('unhandledrejection', function(evt) {
        var r = evt.reason;
        var msg = '[UnhandledRejection] ';
        if (r && r.message) { msg += r.message; if (r.stack) msg += ' | ' + r.stack; }
        else { try { msg += JSON.stringify(r); } catch (e2) { msg += String(r); } }
        _addLine('browser', 'error', msg);
    });
}

/* SSE — server log stream.
 * Pattern: "2026-04-05 12:34:56,789 - ENV - module - LEVEL - message"
 */
var _LOG_RE = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+-\s+\S+\s+-\s+\S+\s+-\s+(\w+)\s+-\s+(.*)$/;

function _lvlFromStr(s) {
    s = (s || '').toUpperCase();
    if (s === 'ERROR' || s === 'CRITICAL') return 'error';
    if (s === 'WARNING' || s === 'WARN')   return 'warn';
    if (s === 'INFO')                      return 'info';
    return 'debug';
}

function _connectSSE() {
    var tok = null, api = null;
    try {
        tok = localStorage.getItem('valdoria_web_token');
        api = localStorage.getItem('valdoria_api_base');
    } catch (e) {}
    if (!tok || !api) { _sseRetryTimer = setTimeout(_connectSSE, SSE_RETRY_MS); return; }
    if (_sseSource) { try { _sseSource.close(); } catch (e) {} _sseSource = null; }
    var url = api + '/api/game/logs/stream?token=' + encodeURIComponent(tok);
    try {
        var src = new EventSource(url); /* noqa: security */
        src.onopen = function() {
            if (_sseStatusEl) {
                _sseStatusEl.className = 'dev-sse-status connected';
                _sseStatusEl.title = 'SSE: connected';
            }
            _addLine('server', 'info', '[SSE] Connected to ' + api);
        };
        src.onmessage = function(evt) {
            var raw = evt.data;
            if (!raw) return;
            var level = 'info', text = raw;
            try {
                var p = JSON.parse(raw);
                if (p && p.message) { level = _lvlFromStr(p.level || 'INFO'); text = p.message; }
            } catch (e) {
                var m = raw.match(_LOG_RE);
                if (m) { level = _lvlFromStr(m[1]); text = m[2]; }
            }
            _addLine('server', level, text);
        };
        src.onerror = function() {
            if (_sseStatusEl) {
                _sseStatusEl.className = 'dev-sse-status error';
                _sseStatusEl.title = 'SSE: disconnected';
            }
            try { src.close(); } catch (e) {}
            _sseSource = null;
            _sseRetryTimer = setTimeout(_connectSSE, SSE_RETRY_MS);
        };
        _sseSource = src;
    } catch (e) {
        if (_sseStatusEl) {
            _sseStatusEl.className = 'dev-sse-status error';
            _sseStatusEl.title = 'SSE error: ' + e.message;
        }
        _sseRetryTimer = setTimeout(_connectSSE, SSE_RETRY_MS);
    }
}

function _init() {
    if (!_shouldActivate()) return;
    _active = true;
    _panel = _buildPanel();
    document.body.appendChild(_panel);
    document.documentElement.classList.add('dev-panel-active');
    _addLine('browser', 'info', '[DEV Panel] Activated');
    _interceptConsole();
    _connectSSE();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
} else {
    _init();
}

window.vDevPanel = {
    addLine:   _addLine,
    switchTab: _switchTab,
    clear:     _clear,
    isActive:  function() { return _active; }
};

})();

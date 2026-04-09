/**
 * DEV Debug Panel v3.0 — Iframe Architecture
 * The game runs inside an <iframe> with a real 430px viewport.
 * The debug panel sits beside the iframe in the parent window.
 *
 * Activation: URL has ?env=dev AND (html.web-standalone OR path has /web/)
 *             AND URL does NOT have &nodevpanel=1
 *
 * Console capture: same-origin monkey-patch on iframe.contentWindow.console
 * Server logs: SSE stream from /api/game/logs/stream (unchanged)
 *
 * Uses var (project convention). Pure DOM manipulation (textContent + createElement).
 */
(function() {
'use strict';

var MAX_LINES = 500;
var LEVELS = ['error', 'warn', 'info', 'debug'];

var _active = false;
var _paused = false;
var _filter = '';
var _hiddenLevels = {};
var _browserLines = [];
var _serverLines = [];

var _panel = null;
var _iframe = null;
var _scrollBrowser = null;
var _scrollServer = null;
var _sseStatusEl = null;
var _filterInput = null;
var _pauseBtn = null;
var _lvlBtns = {};

/* ── Activation check ── */

function _shouldActivate() {
    try {
        var s = window.location.search || '';
        if (!/[?&]env=dev(?:&|$)/.test(s)) return false;
        /* nodevpanel=1 means we are INSIDE the iframe — don't activate */
        if (/[?&]nodevpanel=1/.test(s)) return false;
        return document.documentElement.classList.contains('web-standalone')
            || /\/web\//.test(window.location.pathname);
    } catch (e) { return false; }
}

/* ── Helpers ── */

function _ts() {
    var n = new Date();
    return [n.getHours(), n.getMinutes(), n.getSeconds()].map(function(x) {
        return x.toString().padStart(2, '0');
    }).join(':') + '.' + n.getMilliseconds().toString().padStart(3, '0');
}

function _clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
}

/* ── Build UI ── */

function _buildPane(tabName, scrollId) {
    var pane = document.createElement('div');
    pane.className = 'dev-log-pane';

    var lbl = document.createElement('div');
    lbl.className = 'dev-pane-label';
    lbl.textContent = tabName.toUpperCase();

    if (tabName === 'server') {
        var dot = document.createElement('span');
        dot.id = 'dev-sse-status';
        dot.className = 'dev-sse-status';
        dot.title = 'SSE connection status';
        _sseStatusEl = dot;
        lbl.appendChild(dot);
    }

    var sc = document.createElement('div');
    sc.id = scrollId;
    sc.className = 'dev-log-scroll';
    sc.appendChild(_emptyMsg());

    pane.appendChild(lbl);
    pane.appendChild(sc);
    return pane;
}

function _buildPanel() {
    var panel = document.createElement('div');
    panel.id = 'dev-log-panel';

    var header = document.createElement('div');
    header.className = 'dev-panel-header';

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

    var split = document.createElement('div');
    split.className = 'dev-log-split';

    var browserPane = _buildPane('browser', 'dev-log-scroll-browser');
    _scrollBrowser = browserPane.querySelector('#dev-log-scroll-browser');

    var serverPane = _buildPane('server', 'dev-log-scroll-server');
    _scrollServer = serverPane.querySelector('#dev-log-scroll-server');

    split.appendChild(browserPane);
    split.appendChild(serverPane);
    panel.appendChild(split);

    return panel;
}

/* ── Log management ── */

function _scrollElForTab(tab) {
    return tab === 'server' ? _scrollServer : _scrollBrowser;
}

function _addLine(tab, level, msg) {
    var entry = { ts: _ts(), level: level, msg: msg };
    var buf = tab === 'server' ? _serverLines : _browserLines;
    buf.push(entry);
    if (buf.length > MAX_LINES) {
        buf.splice(0, buf.length - MAX_LINES);
        _rerenderPane(tab);
        return;
    }
    _appendDOM(tab, entry);
}

function _appendDOM(tab, entry) {
    var sc = _scrollElForTab(tab);
    if (!sc) return;
    if (_hiddenLevels[entry.level]) return;
    if (_filter && entry.msg.toLowerCase().indexOf(_filter) === -1) return;
    var el = _buildLineEl(entry);
    var em = sc.querySelector('.dev-log-empty');
    if (em) sc.removeChild(em);
    sc.appendChild(el);
    if (!_paused) sc.scrollTop = sc.scrollHeight;
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

function _rerenderPane(tab) {
    var sc = _scrollElForTab(tab);
    if (!sc) return;
    _clearChildren(sc);
    var buf = tab === 'server' ? _serverLines : _browserLines;
    if (!buf.length) { sc.appendChild(_emptyMsg()); return; }
    buf.forEach(function(entry) {
        if (_hiddenLevels[entry.level]) return;
        if (_filter && entry.msg.toLowerCase().indexOf(_filter) === -1) return;
        sc.appendChild(_buildLineEl(entry));
    });
    if (!_paused) sc.scrollTop = sc.scrollHeight;
}

function _rerender() {
    _rerenderPane('browser');
    _rerenderPane('server');
}

function _clear() {
    _browserLines = [];
    _serverLines = [];
    ['browser', 'server'].forEach(function(tab) {
        var sc = _scrollElForTab(tab);
        if (!sc) return;
        _clearChildren(sc);
        sc.appendChild(_emptyMsg());
    });
}

function _togglePause() {
    _paused = !_paused;
    if (_pauseBtn) {
        _pauseBtn.textContent = _paused ? 'Resume' : 'Pause';
        _pauseBtn.classList.toggle('active', _paused);
        if (!_paused) {
            if (_scrollBrowser) _scrollBrowser.scrollTop = _scrollBrowser.scrollHeight;
            if (_scrollServer)  _scrollServer.scrollTop  = _scrollServer.scrollHeight;
        }
    }
}

function _toggleLevel(level) {
    _hiddenLevels[level] = !_hiddenLevels[level];
    if (_lvlBtns[level]) _lvlBtns[level].classList.toggle('hidden-level', !!_hiddenLevels[level]);
    [_scrollBrowser, _scrollServer].forEach(function(sc) {
        if (!sc) return;
        var lines = sc.querySelectorAll('.dev-log-line[data-level="' + level + '"]');
        for (var i = 0; i < lines.length; i++) {
            lines[i].classList.toggle('level-hidden', !!_hiddenLevels[level]);
        }
    });
}

/* ── Format args for console capture ── */

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

/* ── Console capture via same-origin contentWindow ── */

function _interceptIframeConsole(win) {
    try {
        /* Guard: don't double-patch — causes duplicate log lines */
        if (win.__devPanelPatched) return;
        win.__devPanelPatched = true;

        var origLog   = win.console.log.bind(win.console);
        var origInfo  = win.console.info.bind(win.console);
        var origWarn  = win.console.warn.bind(win.console);
        var origError = win.console.error.bind(win.console);

        win.console.log   = function() { origLog.apply(win.console, arguments);   _addLine('browser', 'debug', _fmtArgs(arguments)); };
        win.console.info  = function() { origInfo.apply(win.console, arguments);  _addLine('browser', 'info',  _fmtArgs(arguments)); };
        win.console.warn  = function() { origWarn.apply(win.console, arguments);  _addLine('browser', 'warn',  _fmtArgs(arguments)); };
        win.console.error = function() { origError.apply(win.console, arguments); _addLine('browser', 'error', _fmtArgs(arguments)); };

        win.addEventListener('error', function(evt) {
            var msg = '[UncaughtError] ' + (evt.message || 'unknown');
            if (evt.filename) msg += ' @ ' + evt.filename;
            if (evt.lineno)   msg += ':' + evt.lineno;
            _addLine('browser', 'error', msg);
        });

        win.addEventListener('unhandledrejection', function(evt) {
            var r = evt.reason;
            var msg = '[UnhandledRejection] ';
            if (r && r.message) { msg += r.message; if (r.stack) msg += ' | ' + r.stack; }
            else { try { msg += JSON.stringify(r); } catch (e2) { msg += String(r); } }
            _addLine('browser', 'error', msg);
        });

        _addLine('browser', 'info', '[DEV Panel] Console capture attached to iframe');
    } catch (e) {
        _addLine('browser', 'error', '[DEV Panel] Failed to attach console: ' + e.message);
    }
}

/* ── Re-attach console on iframe navigation ── */

function _watchIframeNavigation() {
    if (!_iframe) return;
    /* When iframe navigates (cross-WebApp transitions), we need to re-attach
       console capture. MutationObserver on contentWindow is not reliable,
       so poll the contentWindow.location and re-attach when it changes. */
    var _lastHref = '';
    setInterval(function() {
        try {
            var href = _iframe.contentWindow.location.href;
            if (href !== _lastHref) {
                _lastHref = href;
                /* Small delay to let the new page initialize its console */
                setTimeout(function() {
                    _interceptIframeConsole(_iframe.contentWindow);
                }, 300);
            }
        } catch (e) { /* cross-origin or iframe not ready — ignore */ }
    }, 500);
}

/* ── SSE — server log stream ── */

var _LOG_RE = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+-\s+\S+\s+-\s+\S+\s+-\s+(\w+)\s+-\s+(.*)$/;

function _lvlFromStr(s) {
    s = (s || '').toUpperCase();
    if (s === 'ERROR' || s === 'CRITICAL') return 'error';
    if (s === 'WARNING' || s === 'WARN')   return 'warn';
    if (s === 'INFO')                      return 'info';
    return 'debug';
}

/* ── Server log polling (SSE fails through Cloudflare tunnel) ── */

var _pollTimer = null;
var _pollPos = 0;
var POLL_INTERVAL_MS = 2000;

function _parseLine(raw) {
    var level = 'info', text = raw;
    var m = raw.match(_LOG_RE);
    if (m) { level = _lvlFromStr(m[1]); text = m[2]; }
    return { level: level, text: text };
}

function _startPolling() {
    var tok = null, api = null;
    try {
        tok = localStorage.getItem(ValdoriaEnv.getEnvKey('valdoria_web_token'));
        api = localStorage.getItem(ValdoriaEnv.getEnvKey('valdoria_api_base'));
    } catch (e) {}
    if (!tok || !api) { _pollTimer = setTimeout(_startPolling, POLL_INTERVAL_MS); return; }
    var uid = localStorage.getItem(ValdoriaEnv.getEnvKey('valdoria_web_user_id')) || '';

    if (_sseStatusEl) {
        _sseStatusEl.className = 'dev-sse-status connected';
        _sseStatusEl.title = 'Polling: active';
    }
    _addLine('server', 'info', '[POLL] Polling logs from ' + api);

    function _poll() {
        var url = api + '/api/game/logs/tail?token=' + encodeURIComponent(tok)
            + '&user_id=' + encodeURIComponent(uid)
            + '&since=' + _pollPos;
        fetch(url).then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        }).then(function(data) {
            if (_sseStatusEl && _sseStatusEl.className !== 'dev-sse-status connected') {
                _sseStatusEl.className = 'dev-sse-status connected';
                _sseStatusEl.title = 'Polling: active';
            }
            if (data.pos) _pollPos = data.pos;
            var lines = data.lines || [];
            for (var i = 0; i < lines.length; i++) {
                var parsed = _parseLine(lines[i]);
                _addLine('server', parsed.level, parsed.text);
            }
        }).catch(function(e) {
            if (_sseStatusEl) {
                _sseStatusEl.className = 'dev-sse-status error';
                _sseStatusEl.title = 'Polling error: ' + e.message;
            }
        }).finally(function() {
            _pollTimer = setTimeout(_poll, POLL_INTERVAL_MS);
        });
    }

    _poll();
}

/* ── Iframe host mode: replace page content with iframe + panel ── */

function _buildIframeUrl() {
    /* Pass all current URL params to the iframe, adding nodevpanel=1 */
    var params = new URLSearchParams(window.location.search);
    params.set('nodevpanel', '1');
    return 'app.html?' + params.toString();
}

function _initAsHost() {
    /* Stop all normal page loading — this page becomes the host shell */
    /* Remove all body content (loading overlay, route-root, scripts) */
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }

    /* Inject host layout CSS */
    var s = document.createElement('style');
    s.id = 'dev-panel-host-css';
    s.textContent = [
        'html.dev-panel-active{max-width:none!important;margin:0!important;height:100dvh!important;overflow:hidden!important}',
        'html.dev-panel-active body{display:flex!important;flex-direction:row!important;height:100dvh!important;margin:0!important;padding:0!important;overflow:hidden!important;background:#0f0d0a!important}',
        '#dev-game-iframe{width:430px;min-width:430px;max-width:430px;height:100dvh;border:none;flex-shrink:0;background:#1a1510}',
    ].join('\n');
    document.head.appendChild(s);

    document.documentElement.classList.add('dev-panel-active');

    /* Create iframe */
    _iframe = document.createElement('iframe');
    _iframe.id = 'dev-game-iframe';
    _iframe.src = _buildIframeUrl();
    _iframe.setAttribute('allow', 'autoplay; fullscreen');
    document.body.appendChild(_iframe);

    /* Create debug panel */
    _panel = _buildPanel();
    document.body.appendChild(_panel);

    _addLine('browser', 'info', '[DEV Panel] v3.0 — Iframe host mode activated');

    /* Attach console capture when iframe loads */
    _iframe.addEventListener('load', function() {
        _interceptIframeConsole(_iframe.contentWindow);
        _addLine('browser', 'info', '[DEV Panel] Iframe loaded: ' + _iframe.contentWindow.location.href);
    });

    /* Watch for iframe navigations (cross-WebApp transitions) */
    _watchIframeNavigation();

    /* Poll server logs (SSE fails through Cloudflare tunnel) */
    _startPolling();
}

/* ── Init ── */

function _init() {
    if (!_shouldActivate()) return;
    _active = true;
    _initAsHost();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
} else {
    _init();
}

window.vDevPanel = {
    addLine:  _addLine,
    clear:    _clear,
    isActive: function() { return _active; }
};

})();

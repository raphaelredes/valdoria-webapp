/**
 * Log Relay v1.0 — Server-Side Console Forwarding
 * Captures tagged console messages ([TAG] pattern) from ALL WebApps
 * and relays them to /api/game/log for server-side persistence.
 *
 * Load EARLY in script order (right after webapp-init.js).
 * If game-core.js loads later, it checks _valdoriaWrapped and skips its own wrapping.
 *
 * API: window._logRelay.flush() — force flush queued logs
 */
(function() {
'use strict';

// Skip if already wrapped (e.g., game-core.js loaded first)
if (console.log && console.log._valdoriaWrapped) return;

var _queue = [];
var _flushTimer = null;
var _FLUSH_INTERVAL = 3000;
var _MAX_QUEUE = 30;
var _apiBase = '';

// Matches [TAG] at start: [PROCESSING], [EXPLORE], [GAME], [COMBAT], etc.
var _TAG_RE = /^\[([A-Z][A-Z0-9_-]*)\]/;

function _getApiBase() {
    if (_apiBase) return _apiBase;
    // Try global state objects used by various WebApps
    if (window.S && window.S.apiBase) { _apiBase = window.S.apiBase; return _apiBase; }
    // Try URL params (common pattern across all WebApps)
    try {
        var params = new URLSearchParams(window.location.search);
        var api = params.get('api');
        if (api) { _apiBase = api; return _apiBase; }
    } catch (e) { /* URLSearchParams not supported */ }
    return '';
}

function _queueMsg(level, args) {
    var msg = Array.from(args).map(function(a) {
        if (a instanceof Error) return a.message + (a.stack ? ' ' + a.stack.substring(0, 200) : '');
        if (typeof a === 'object') {
            try { return JSON.stringify(a).substring(0, 200); } catch (e) { return String(a); }
        }
        return String(a);
    }).join(' ');

    // Only queue tagged messages to avoid flooding
    if (!_TAG_RE.test(msg)) return;

    _queue.push({ level: level, msg: msg.substring(0, 500) });
    if (_queue.length >= _MAX_QUEUE) _flush();
}

function _flush() {
    if (!_queue.length) return;
    var base = _getApiBase();
    if (!base) return;
    // Skip flush if page hidden (save bandwidth) unless queue is large
    if (document.visibilityState === 'hidden' && _queue.length < _MAX_QUEUE) return;

    var entries = _queue.splice(0, _MAX_QUEUE);
    fetch(base + '/api/game/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: entries })
    }).catch(function() {
        // Put entries back if fetch failed (will retry next interval)
        if (_queue.length < _MAX_QUEUE * 2) {
            _queue.unshift.apply(_queue, entries);
        }
    });
}

// Wrap console methods
var _origLog = console.log.bind(console);
var _origInfo = console.info.bind(console);
var _origWarn = console.warn.bind(console);
var _origError = console.error.bind(console);

console.log = function() { _origLog.apply(console, arguments); _queueMsg('info', arguments); };
console.log._valdoriaWrapped = true;
console.info = function() { _origInfo.apply(console, arguments); _queueMsg('info', arguments); };
console.info._valdoriaWrapped = true;
console.warn = function() { _origWarn.apply(console, arguments); _queueMsg('warn', arguments); };
console.warn._valdoriaWrapped = true;
console.error = function() { _origError.apply(console, arguments); _queueMsg('error', arguments); };
console.error._valdoriaWrapped = true;

// Periodic flush
_flushTimer = setInterval(_flush, _FLUSH_INTERVAL);

// Reliable flush on page unload via sendBeacon
window.addEventListener('pagehide', function() {
    if (!_queue.length) return;
    var base = _getApiBase();
    if (!base) return;
    var entries = _queue.splice(0, _MAX_QUEUE);
    try {
        navigator.sendBeacon(
            base + '/api/game/log',
            new Blob([JSON.stringify({ entries: entries })], { type: 'application/json' })
        );
    } catch (e) { /* sendBeacon not supported */ }
});

// Cleanup hook for SPA router
if (!window._spaCleanupFns) window._spaCleanupFns = [];
window._spaCleanupFns.push(function() {
    if (_flushTimer) { clearInterval(_flushTimer); _flushTimer = null; }
    _flush();
});

window._logRelay = { flush: _flush };

})();

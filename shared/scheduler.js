/**
 * scheduler.js — vScheduler central (Sessão #38, 2026-05-26)
 *
 * Endereça gap apontado pela auditoria de performance:
 *   "7+ intervals concorrentes em exploracao.html" (sparkTimer, lockTimer,
 *   weatherWatchdog, fsmWatchdog, ambientWatchdog, audioWatchdog).
 *
 * Cada setInterval acorda o JS thread independentemente, causando jitter +
 * gasto de bateria. vScheduler multiplexa N callbacks em 1 rAF master que
 * dispara em document.hidden=false e pausa quando aba está em background.
 *
 * API canonical:
 *   vScheduler.add(name, intervalMs, callback, opts?)  // registra tick
 *   vScheduler.remove(name)                            // cancela
 *   vScheduler.pauseAll() / resumeAll()                // global pause
 *   vScheduler.size()                                  // debug
 *
 * opts:
 *   { runInBackground: bool }  // se true, continua rodando em hidden tab
 *
 * Doc canonical: docs/auditoria-performance-rendering.md (Fase 3.4)
 */
(function () {
    'use strict';
    if (typeof window === 'undefined') return;
    if (window.vScheduler && window.vScheduler.__canonical) return;

    var _tasks = {};   // name → { interval, cb, lastRun, runInBackground }
    var _rafId = null;
    var _paused = false;
    var _hidden = false;

    function _tick() {
        _rafId = null;
        if (_paused) return;
        if (_hidden) {
            // Skip background tasks unless explicitly opted in
            var nowH = performance.now();
            for (var k in _tasks) {
                var t = _tasks[k];
                if (!t.runInBackground) continue;
                if (nowH - t.lastRun >= t.interval) {
                    try { t.cb(); } catch (e) {
                        try { console.warn('[vScheduler]', k, e && e.message); } catch (_) { }
                    }
                    t.lastRun = nowH;
                }
            }
            _schedule();
            return;
        }
        var now = performance.now();
        for (var key in _tasks) {
            var task = _tasks[key];
            if (now - task.lastRun >= task.interval) {
                try { task.cb(); } catch (e) {
                    try { console.warn('[vScheduler]', key, e && e.message); } catch (_) { }
                }
                task.lastRun = now;
            }
        }
        _schedule();
    }

    function _schedule() {
        if (_rafId !== null) return;
        if (Object.keys(_tasks).length === 0) return;  // nothing to do
        _rafId = requestAnimationFrame(_tick);
    }

    function _add(name, intervalMs, cb, opts) {
        if (!name || typeof cb !== 'function' || !intervalMs) return;
        _tasks[name] = {
            interval: intervalMs,
            cb: cb,
            lastRun: performance.now(),
            runInBackground: !!(opts && opts.runInBackground),
        };
        _schedule();
    }

    function _remove(name) {
        delete _tasks[name];
        if (Object.keys(_tasks).length === 0 && _rafId !== null) {
            cancelAnimationFrame(_rafId);
            _rafId = null;
        }
    }

    function _pauseAll() { _paused = true; }
    function _resumeAll() { _paused = false; _schedule(); }
    function _size() { return Object.keys(_tasks).length; }

    window.vScheduler = {
        __canonical: true,
        add: _add,
        remove: _remove,
        pauseAll: _pauseAll,
        resumeAll: _resumeAll,
        size: _size,
    };

    // Pause when tab hidden (saves bateria + CPU)
    try {
        document.addEventListener('visibilitychange', function () {
            _hidden = document.hidden;
            if (!_hidden) _schedule();
        });
    } catch (_) { /* silent */ }
})();

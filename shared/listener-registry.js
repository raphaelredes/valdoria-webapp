/**
 * listener-registry.js — vListen canonical (Sessão #38, 2026-05-26)
 *
 * Endereça gap apontado pela auditoria de performance:
 *   "869 addEventListener vs 59 removeEventListener (ratio 14.7:1)"
 *
 * Listeners adicionados sem cleanup vazam entre rotas SPA — memória cresce
 * a cada navegação até Telegram WebView matar o tab.
 *
 * API canonical:
 *   vListen(el, evt, fn, opts)         // registra + auto-cleanup
 *   vListen.removeAll()                // cleanup todos imediatamente
 *   vListen.scope(name, fn)            // listeners criados dentro de fn
 *                                      // são removidos via removeScope(name)
 *   vListen.removeScope(name)          // remove todos de um scope
 *
 * Integração SPA: se window._spaCleanupFns existir, vListen registra cleanup
 * lá automaticamente. Em pagehide, removeAll() é chamado defensivamente.
 *
 * Doc canonical: docs/auditoria-performance-rendering.md (Fase 3.3)
 */
(function () {
    'use strict';
    if (typeof window === 'undefined') return;
    if (window.vListen && window.vListen.__canonical) return;  // idempotent

    var _all = [];          // [{ el, evt, fn, opts, scope }]
    var _scopeStack = [];   // nested scope tracker

    function _record(el, evt, fn, opts) {
        var scope = _scopeStack.length > 0 ? _scopeStack[_scopeStack.length - 1] : null;
        _all.push({ el: el, evt: evt, fn: fn, opts: opts, scope: scope });
        // Hook in SPA cleanup if available
        if (Array.isArray(window._spaCleanupFns)) {
            window._spaCleanupFns.push(function () {
                _removeEntry(el, evt, fn, opts);
            });
        }
    }

    function _removeEntry(el, evt, fn, opts) {
        try {
            if (el && el.removeEventListener) {
                el.removeEventListener(evt, fn, opts);
            }
        } catch (e) {
            try { console.warn('[vListen] remove failed:', e && e.message); } catch (_) { }
        }
        // Remove from registry
        for (var i = _all.length - 1; i >= 0; i--) {
            var e = _all[i];
            if (e.el === el && e.evt === evt && e.fn === fn) {
                _all.splice(i, 1);
                break;
            }
        }
    }

    function vListen(el, evt, fn, opts) {
        if (!el || !el.addEventListener || !fn) return fn;
        try {
            el.addEventListener(evt, fn, opts);
            _record(el, evt, fn, opts);
        } catch (e) {
            try { console.warn('[vListen] add failed:', e && e.message); } catch (_) { }
        }
        return fn;
    }

    vListen.__canonical = true;

    vListen.removeAll = function () {
        var arr = _all.slice();
        _all = [];
        for (var i = 0; i < arr.length; i++) {
            var e = arr[i];
            try {
                if (e.el && e.el.removeEventListener) {
                    e.el.removeEventListener(e.evt, e.fn, e.opts);
                }
            } catch (_) { /* silent */ }
        }
    };

    vListen.removeScope = function (name) {
        for (var i = _all.length - 1; i >= 0; i--) {
            var e = _all[i];
            if (e.scope === name) {
                try {
                    if (e.el && e.el.removeEventListener) {
                        e.el.removeEventListener(e.evt, e.fn, e.opts);
                    }
                } catch (_) { /* silent */ }
                _all.splice(i, 1);
            }
        }
    };

    vListen.scope = function (name, fn) {
        if (typeof fn !== 'function') return;
        _scopeStack.push(name);
        try { fn(); }
        finally { _scopeStack.pop(); }
    };

    vListen.size = function () { return _all.length; };

    window.vListen = vListen;

    // Defensive cleanup on pagehide
    try {
        window.addEventListener('pagehide', function () { vListen.removeAll(); });
    } catch (_) { /* silent */ }
})();

/**
 * overlay-registry.js — vOverlay canonical (Sessão #38, 2026-05-26)
 *
 * Criado para satisfazer CLAUDE.md "SPA Cleanup via vOverlay — MANDATORY RULE":
 *   "Todo elemento appended ao <body> em WebApp DEVE ser criado via
 *    vOverlay.add(el)"
 *
 * Antes: 16+ overlays em cidade/explore/combat criados via
 * `document.body.appendChild()` direto. Sem cleanup centralizado, elementos
 * vazavam entre rotas SPA (encounter-overlay, vDailyFadeIn overlay, etc.).
 *
 * API canonical:
 *   vOverlay.add(el)                    // appende ao body + registra cleanup
 *   vOverlay.addEphemeral(el, ttlMs)    // appende + auto-remove após ttlMs
 *   vOverlay.remove(el)                 // remove imediatamente
 *   vOverlay.clear()                    // remove todos registrados
 *   vOverlay.size()                     // contagem (debug)
 *
 * Cleanup automático:
 *   - SPA route change: window._spaCleanupFns registry (vOverlay registra)
 *   - pagehide: clear() chamado se runtime estiver vivo
 *
 * Idempotência: add(el) chamado 2x com mesmo elemento = no-op (não duplica
 * registro). remove(el) em elemento não registrado = no-op silencioso.
 *
 * Doc canonical: CLAUDE.md "SPA Cleanup via vOverlay — MANDATORY RULE"
 */
(function () {
    'use strict';
    if (typeof window === 'undefined') return;
    if (window.vOverlay && window.vOverlay.__canonical) return;  // idempotent

    var _tracked = new Set();
    var _ephemeralTimers = new WeakMap();

    function _add(el) {
        if (!el || _tracked.has(el)) return el;
        try {
            if (!el.parentNode) document.body.appendChild(el);
            _tracked.add(el);
            // Register cleanup hook with SPA router if available
            if (Array.isArray(window._spaCleanupFns)) {
                window._spaCleanupFns.push(function () { _remove(el); });
            }
        } catch (e) {
            try { console.warn('[vOverlay] add failed:', e && e.message); } catch (_) { }
        }
        return el;
    }

    function _addEphemeral(el, ttlMs) {
        _add(el);
        if (typeof ttlMs === 'number' && ttlMs > 0) {
            var t = setTimeout(function () { _remove(el); }, ttlMs);
            _ephemeralTimers.set(el, t);
        }
        return el;
    }

    function _remove(el) {
        if (!el) return;
        try {
            var t = _ephemeralTimers.get(el);
            if (t) { clearTimeout(t); _ephemeralTimers.delete(el); }
            if (el.parentNode) el.parentNode.removeChild(el);
        } catch (e) {
            try { console.warn('[vOverlay] remove failed:', e && e.message); } catch (_) { }
        }
        _tracked.delete(el);
    }

    function _clear() {
        var arr = Array.from(_tracked);
        for (var i = 0; i < arr.length; i++) _remove(arr[i]);
        _tracked.clear();
    }

    function _size() { return _tracked.size; }

    window.vOverlay = {
        __canonical: true,
        add: _add,
        addEphemeral: _addEphemeral,
        remove: _remove,
        clear: _clear,
        size: _size,
    };

    // Auto-clear on pagehide (defensive — SPA route change should already cover)
    try {
        window.addEventListener('pagehide', function () { _clear(); });
    } catch (_) { /* silent */ }
})();

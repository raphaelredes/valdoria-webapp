/* vOverlay — registry compartilhado de overlays appended ao body.
 *
 * Motivacao: o router SPA (spa/router.js) troca o conteudo do route root
 * ao navegar, mas elementos appended a document.body sobrevivem. Sem
 * cleanup manual em _spaCleanupFns o WebApp vaza overlays para a proxima
 * tela (bug real 2026-04-14: hp-warn do navigate vazando sob o combate).
 *
 * Uso obrigatorio em TODOS os WebApps que precisam criar overlays no
 * body (popups, modals, toasts, floats, banners). O helper appende ao
 * body E registra cleanup automaticamente — impossivel esquecer.
 *
 * Regra IMUTAVEL: NUNCA usar document.body.appendChild() direto em
 * WebApps. Sempre via vOverlay.
 *
 * API:
 *   vOverlay.add(el)            — appende ao body, registra cleanup
 *   vOverlay.addEphemeral(el,ms) — appende, auto-remove em ms
 *   vOverlay.remove(el)         — remove imediatamente (cleanup tambem)
 *   vOverlay.clear()            — remove todos os registrados
 *
 * Seguro para chamar antes do spa/router.js (registra lazy em
 * window._spaCleanupFns). Idempotente: re-chamar add() no mesmo
 * elemento nao duplica.
 */
(function () {
    'use strict';

    var _tracked = new Set();
    var _cleanupRegistered = false;

    function _registerCleanup() {
        if (_cleanupRegistered) return;
        if (!window._spaCleanupFns) window._spaCleanupFns = [];
        window._spaCleanupFns.push(function () {
            _tracked.forEach(function (el) {
                if (el && el.parentNode) el.parentNode.removeChild(el);
            });
            _tracked.clear();
            _cleanupRegistered = false;
        });
        _cleanupRegistered = true;
    }

    var vOverlay = {
        add: function (el) {
            if (!el || !(el instanceof HTMLElement)) {
                console.warn('[vOverlay] add() called with invalid element', el);
                return el;
            }
            if (_tracked.has(el)) return el;
            _tracked.add(el);
            _registerCleanup();
            if (!el.parentNode) document.body.appendChild(el);
            return el;
        },

        addEphemeral: function (el, ttlMs) {
            vOverlay.add(el);
            setTimeout(function () { vOverlay.remove(el); }, ttlMs || 1500);
            return el;
        },

        remove: function (el) {
            if (!el) return;
            _tracked.delete(el);
            if (el.parentNode) el.parentNode.removeChild(el);
        },

        clear: function () {
            _tracked.forEach(function (el) {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
            _tracked.clear();
        },

        count: function () { return _tracked.size; },
    };

    window.vOverlay = vOverlay;
})();

// ═══════════════════════════════════════════════════════════
//  Motion Preferences — Shared Utility
//  Respects prefers-reduced-motion OS setting (WCAG 2.3.3)
//  Usage: if (ValdoriaMotion.prefersReduced()) { skipAnimation(); }
// ═══════════════════════════════════════════════════════════

var ValdoriaMotion = (function() {
    'use strict';

    var _mql = null;
    var _reduced = false;

    function init() {
        if (typeof window.matchMedia !== 'function') return;
        _mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        _reduced = _mql.matches;
        // Listen for changes (user toggles setting while app is open)
        try {
            _mql.addEventListener('change', function(e) { _reduced = e.matches; });
        } catch (_) {
            // Safari <14 fallback
            _mql.addListener(function(e) { _reduced = e.matches; });
        }
    }

    /**
     * @returns {boolean} true if user prefers reduced motion
     */
    function prefersReduced() {
        return _reduced;
    }

    /**
     * Returns animation duration respecting user preference.
     * @param {number} normalMs - Duration in ms for normal mode
     * @param {number} [reducedMs=0] - Duration in ms for reduced mode (default: instant)
     * @returns {number}
     */
    function duration(normalMs, reducedMs) {
        return _reduced ? (reducedMs || 0) : normalMs;
    }

    // Auto-init on load
    if (typeof document !== 'undefined') {
        init();
    }

    return {
        prefersReduced: prefersReduced,
        duration: duration
    };
})();

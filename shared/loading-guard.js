/* ═══════════════════════════════════════════════════════════════
   LOADING ANIMATION SPEED GUARD — IMMUTABLE
   ═══════════════════════════════════════════════════════════════
   This guard enforces minimum animation durations on the magic
   summoning circle loading screen. It prevents accidental or
   programmatic changes that would make the animation too fast.

   CANONICAL SPEEDS (NEVER CHANGE):
     Outer ring (CW):  60s  — min: 25s
     Mid ring (CCW):   35s  — min: 15s
     Inner ring (CW):  45s  — min: 20s
     Aura pulse:        5s  — min: 3s
     Energy flow:       8s  — min: 5s
     Magic pulse:       6s  — min: 4s

   HOW IT WORKS:
   1. On DOMContentLoaded, validates all loading animation durations
   2. MutationObserver watches for style/class changes on .magic-circle
   3. If any duration is below minimum, forces it to canonical value
   4. Logs warnings to console for debugging

   INCLUDE: Add <script src="../shared/loading-guard.js"></script>
   in every HTML that has the loading overlay.
   ═══════════════════════════════════════════════════════════════ */

(function() {
    'use strict';

    // ── Canonical durations (seconds) — NEVER CHANGE THESE ──
    var CANONICAL = {
        '.mc-outer':  { prop: 'animationDuration', min: 25, canonical: 60 },
        '.mc-mid':    { prop: 'animationDuration', min: 15, canonical: 35 },
        '.mc-inner':  { prop: 'animationDuration', min: 20, canonical: 45 },
    };

    // ── CSS variable minimums (for loading.css that uses --ring-* vars) ──
    var VAR_MINIMUMS = {
        '--ring-outer': 25,
        '--ring-mid':   15,
        '--ring-inner': 20,
    };

    function parseDuration(val) {
        if (!val) return 0;
        val = String(val).trim();
        if (val.endsWith('ms')) return parseFloat(val) / 1000;
        if (val.endsWith('s')) return parseFloat(val);
        return parseFloat(val);
    }

    function validateElement(selector, rule) {
        var el = document.querySelector(selector);
        if (!el) return;
        var computed = getComputedStyle(el);
        var duration = parseDuration(computed.animationDuration);
        if (duration > 0 && duration < rule.min) {
            console.warn('[LOADING-GUARD] ' + selector + ' animation too fast: ' +
                duration.toFixed(1) + 's (min: ' + rule.min + 's). Forcing to ' +
                rule.canonical + 's.');
            el.style.animationDuration = rule.canonical + 's';
            return true; // was corrected
        }
        return false;
    }

    function validateCSSVariables() {
        var circle = document.querySelector('.magic-circle');
        if (!circle) return;
        var style = circle.style;
        var corrected = false;
        for (var varName in VAR_MINIMUMS) {
            var val = style.getPropertyValue(varName);
            if (val) {
                var seconds = parseDuration(val);
                if (seconds > 0 && seconds < VAR_MINIMUMS[varName]) {
                    console.warn('[LOADING-GUARD] CSS var ' + varName + ' too fast: ' +
                        seconds.toFixed(1) + 's (min: ' + VAR_MINIMUMS[varName] + 's). Removing override.');
                    style.removeProperty(varName);
                    corrected = true;
                }
            }
        }
        return corrected;
    }

    function validateAll() {
        var corrected = false;
        for (var selector in CANONICAL) {
            if (validateElement(selector, CANONICAL[selector])) corrected = true;
        }
        if (validateCSSVariables()) corrected = true;
        return corrected;
    }

    // ── MutationObserver: watch .magic-circle for style changes ──
    function observeCircle() {
        var circle = document.querySelector('.magic-circle');
        if (!circle) return;

        var observer = new MutationObserver(function(mutations) {
            // Debounce: only validate once per batch
            var needsCheck = false;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === 'attributes' &&
                    (m.attributeName === 'style' || m.attributeName === 'class')) {
                    needsCheck = true;
                    break;
                }
            }
            if (needsCheck) {
                // Also check children (the ring elements)
                validateAll();
            }
        });

        // Watch the circle and all ring children
        observer.observe(circle, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            subtree: true,
        });
    }

    // ── Init on DOMContentLoaded ──
    function init() {
        // Initial validation
        validateAll();
        // Start observing for changes
        observeCircle();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Also validate when loading overlay is shown (re-validate periodically)
    var _guardInterval = null;
    var _origShowLoading = window.showLoading;

    // Patch showLoading if it exists (game-ui.js defines it)
    Object.defineProperty(window, '_loadingGuardActive', {
        get: function() { return !!_guardInterval; },
    });

    // Hook into showLoading/hideLoading when they become available
    function patchShowHide() {
        if (typeof window.showLoading === 'function' && !window.showLoading._guarded) {
            var orig = window.showLoading;
            window.showLoading = function() {
                orig.apply(this, arguments);
                // Validate immediately and every 2s while loading is visible
                validateAll();
                if (_guardInterval) clearInterval(_guardInterval);
                _guardInterval = setInterval(validateAll, 2000);
            };
            window.showLoading._guarded = true;
        }
        if (typeof window.hideLoading === 'function' && !window.hideLoading._guarded) {
            var origHide = window.hideLoading;
            window.hideLoading = function() {
                origHide.apply(this, arguments);
                if (_guardInterval) {
                    clearInterval(_guardInterval);
                    _guardInterval = null;
                }
            };
            window.hideLoading._guarded = true;
        }
    }

    // Try patching now and after a small delay (scripts may load after this)
    patchShowHide();
    setTimeout(patchShowHide, 100);
    setTimeout(patchShowHide, 500);
})();

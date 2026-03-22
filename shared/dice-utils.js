/**
 * ValdoriaDice — Shared dice utilities for all WebApps.
 * Centralizes duplicated logic: distributeTotal, parseDiceFormula, textFallback.
 * Also provides standardized constants for canvas sizing and animation timing.
 */
var ValdoriaDice = (function () {
    'use strict';

    /* -- Constants -- */

    /** Recommended canvas sizes by die count */
    var CANVAS_SIZES = { 1: 180, 2: 220, 3: 260, 4: 300, 5: 340 };

    /** Standardized animation timing (ms) */
    var TIMING = {
        FUSION_HOLD: 600,
        RESULT_HOLD: 2000,
        SKIP_DELAY: 500
    };

    /* -- distributeTotal -- */

    /**
     * Split a known dice total into individual die values.
     * Each value is between 1 and sides, and they sum to diceTotal.
     * @param {number} diceTotal - Sum to distribute
     * @param {number} count - Number of dice
     * @param {number} sides - Sides per die (4,6,8,10,12,20)
     * @returns {number[]} Array of individual die values
     */
    function distributeTotal(diceTotal, count, sides) {
        var results = [];
        var remaining = Math.max(count, Math.min(diceTotal, count * sides));
        for (var i = 0; i < count - 1; i++) {
            var minNeeded = count - i - 1;
            var maxAllowed = remaining - minNeeded;
            var value = Math.min(sides, Math.max(1, Math.floor(Math.random() * Math.min(sides, maxAllowed)) + 1));
            results.push(value);
            remaining -= value;
        }
        results.push(Math.min(sides, Math.max(1, remaining)));
        return results;
    }

    /* -- parseDiceFormula -- */

    /**
     * Parse a D&D dice formula string into components.
     * Supports: "2d6+3", "1d20", "d8-1", "3d10"
     * @param {string} formula
     * @returns {{ count: number, type: string, sides: number, modifier: number }}
     */
    function parseDiceFormula(formula) {
        if (!formula) return { count: 1, type: 'd6', sides: 6, modifier: 0 };
        var m = formula.match(/(\d*)d(\d+)/i);
        if (!m) return { count: 1, type: 'd6', sides: 6, modifier: 0 };
        var count = parseInt(m[1]) || 1;
        var sides = parseInt(m[2]);
        var valid = [4, 6, 8, 10, 12, 20];
        var type = valid.indexOf(sides) !== -1 ? 'd' + sides : 'd6';
        var actualSides = valid.indexOf(sides) !== -1 ? sides : 6;
        var rest = formula.slice(m.index + m[0].length);
        var modMatch = rest.match(/([+-]\d+)/);
        var modifier = modMatch ? parseInt(modMatch[1]) : 0;
        return { count: Math.min(count, 5), type: type, sides: actualSides, modifier: modifier };
    }

    /* -- textFallback -- */

    /**
     * Generic text fallback when Dice3D/THREE.js is unavailable.
     * Shows a floating overlay with emoji + value + optional label.
     * @param {number|string} value - The dice result value
     * @param {string} [label] - Optional label
     * @param {Function} [onDone] - Callback after auto-dismiss
     * @param {number} [delayMs=800] - Display duration
     */
    function textFallback(value, label, onDone, delayMs) {
        delayMs = delayMs || 800;
        var fb = document.createElement('div');
        fb.className = 'dice-text-fallback';
        fb.innerHTML = '<div class="dice-fb-icon">\uD83C\uDFB2</div>'
            + '<div class="dice-fb-value">' + (value != null ? value : '?') + '</div>'
            + (label ? '<div class="dice-fb-label">' + label + '</div>' : '');
        document.body.appendChild(fb);
        requestAnimationFrame(function () { fb.style.opacity = '1'; });
        setTimeout(function () {
            fb.style.opacity = '0';
            setTimeout(function () {
                if (fb.parentNode) fb.parentNode.removeChild(fb);
                if (typeof onDone === 'function') onDone();
            }, 200);
        }, delayMs);
    }

    /* -- Public API -- */

    return {
        distributeTotal: distributeTotal,
        parseDiceFormula: parseDiceFormula,
        textFallback: textFallback,
        CANVAS_SIZES: CANVAS_SIZES,
        TIMING: TIMING
    };
})();

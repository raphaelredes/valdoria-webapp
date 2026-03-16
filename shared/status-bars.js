/* status-bars.js — Canonical HP threshold function for ALL WebApps
   Single source of truth: >60% green, 26-60% orange, ≤25% red
   Import: document.write('<script src="../shared/status-bars.js?v=' + v + '"><\/script>');
*/

/**
 * Returns the canonical CSS class for an HP bar fill.
 * Thresholds: >60% = 'hp' (green), 26-60% = 'hp-warn' (orange), ≤25% = 'hp-crit' (red)
 * @param {number} current - Current HP
 * @param {number} max - Maximum HP
 * @returns {string} CSS class name: 'hp', 'hp-warn', or 'hp-crit'
 */
function vBarHpClass(current, max) {
    var pct = max > 0 ? (current / max) : 1;
    if (pct > 0.60) return 'hp';
    if (pct > 0.25) return 'hp-warn';
    return 'hp-crit';
}

/**
 * Returns the flat color hex for an HP value (for inline styles, canvas, etc.)
 * @param {number} current - Current HP
 * @param {number} max - Maximum HP
 * @returns {string} Hex color: '#4caf50', '#f97316', or '#ef4444'
 */
function vBarHpColor(current, max) {
    var pct = max > 0 ? (current / max) : 1;
    if (pct > 0.60) return '#4caf50';
    if (pct > 0.25) return '#f97316';
    return '#ef4444';
}

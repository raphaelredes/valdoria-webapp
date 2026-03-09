// ═══════════════════════════════════════════════════════
// TEXT TIMING — Human Reading Time calculator
// Universal helper for all Valdoria WebApps
// ═══════════════════════════════════════════════════════

/**
 * Calculate how long text should remain visible for a human to read it.
 *
 * Categories & ranges (ms):
 *   toast       → [1500, 4000]  info toasts, reward badges
 *   toast-warn  → [2000, 5000]  errors, warnings, important status
 *   overlay     → [2000, 5000]  blocking overlays (dice, combat warnings)
 *   summary     → [2500, 6000]  victory/defeat, quest complete, level up
 *   narrative   → [2500, 5000]  cinematic frames, flavor, atmosphere
 *   data        → [3000, 5500]  HP/MP bars, recovery stats (+800ms/element)
 *   result      → [4000, 6000]  effects summary, final outcomes
 *   dm          → [2000, 8000]  DM narration, event descriptions
 *   combat      → [1500, 4000]  hit/miss descriptions, damage text
 *
 * @param {string} text - The text content (HTML tags are stripped)
 * @param {string} [category='overlay'] - Content category (see table above)
 * @param {number} [dataElements=0] - Number of data elements (bars, stats) for 'data' category
 * @returns {number} Duration in milliseconds
 */
function calcReadTime(text, category, dataElements) {
    category = category || 'overlay';
    dataElements = dataElements || 0;

    // Strip HTML tags and count words
    var clean = (text || '').replace(/<[^>]*>/g, '').trim();
    var words = clean.split(/\s+/).filter(Boolean).length;
    var base = words * 250; // 250ms per word (~240 WPM)

    var ranges = {
        'toast':      { min: 1500, max: 4000, bonus: 0 },
        'toast-warn': { min: 2000, max: 5000, bonus: 0 },
        'overlay':    { min: 2000, max: 5000, bonus: 0 },
        'summary':    { min: 2500, max: 6000, bonus: 1500 },
        'narrative':  { min: 2500, max: 5000, bonus: 0 },
        'data':       { min: 3000, max: 5500, bonus: dataElements * 800 },
        'result':     { min: 4000, max: 6000, bonus: 1500 },
        'dm':         { min: 2000, max: 8000, bonus: 0 },
        'combat':     { min: 1500, max: 4000, bonus: 0 },
    };

    var r = ranges[category] || ranges['overlay'];
    return Math.max(r.min, Math.min(r.max, base + r.bonus));
}

// Export for ES module or global scope
if (typeof window !== 'undefined') window.calcReadTime = calcReadTime;

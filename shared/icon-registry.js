// =====================================================
// VALDORIA ICON REGISTRY — Medieval SVG Icon System
// =====================================================
// Maps emoji strings to inline SVG for consistent rendering
// across all platforms. Replaces Unicode 13+ emoji that
// show as broken squares on older devices.
//
// Style: Line art medieval (woodcut/illuminated manuscript)
// ViewBox: 0 0 24 24 (uniform)
// Strokes: currentColor, 1.5px, round caps/joins
// Semantic accents: subtle colors for key elements
// =====================================================

const ICON_REGISTRY = {

    // ── TRAP / ARMADILHA ──────────────────────────────
    // Bear trap with jagged jaws and trigger plate
    '\u{1FAA4}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M4 14 L7 8 L9 12 L11 7 L13 12 L15 8 L17 12 L20 8"/>'
        + '<path d="M4 14 L7 18 L9 14 L11 19 L13 14 L15 18 L17 14 L20 18"/>'
        + '<circle cx="12" cy="13" r="1.5" fill="#7b2020" stroke="#7b2020" stroke-width="1"/>'
        + '<path d="M3 14 L21 14" stroke-width="2"/>'
        + '<path d="M10 4 L12 6 L14 4" stroke-width="1" opacity="0.5"/>'
        + '</svg>',

    // ── TROLL ─────────────────────────────────────────
    // Brutish hunched figure with club and horns
    '\u{1F9CC}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<circle cx="12" cy="6" r="3.5"/>'
        + '<path d="M9 3 L7 1"/><path d="M15 3 L17 1"/>'
        + '<circle cx="10.5" cy="5.5" r="0.7" fill="currentColor"/>'
        + '<circle cx="13.5" cy="5.5" r="0.7" fill="currentColor"/>'
        + '<path d="M10 8 L14 8" stroke-width="1"/>'
        + '<path d="M12 9.5 L12 16"/>'
        + '<path d="M12 12 L8 15"/><path d="M12 12 L16 10"/>'
        + '<path d="M16 10 L19 8 L20 10" stroke-width="2"/>'
        + '<path d="M12 16 L9 22"/><path d="M12 16 L15 22"/>'
        + '<path d="M8 15 L6 17" stroke-width="1"/>'
        + '</svg>',

    // ── OOZE / GOSMA ─────────────────────────────────
    // Amorphous blob with bubbles
    '\u{1FAE7}': '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M5 16 Q3 12 6 10 Q8 8 10 9 Q11 7 14 8 Q17 7 19 10 Q21 13 19 16 Q17 19 14 18 Q12 20 10 18 Q7 19 5 16Z" stroke="#4a8a4a" fill="rgba(74,138,74,0.15)"/>'
        + '<circle cx="9" cy="13" r="1.2" stroke="#4a8a4a" fill="rgba(74,138,74,0.1)"/>'
        + '<circle cx="14" cy="11" r="0.8" stroke="#4a8a4a" fill="rgba(74,138,74,0.1)"/>'
        + '<circle cx="12" cy="15" r="0.6" stroke="#4a8a4a" fill="rgba(74,138,74,0.1)"/>'
        + '<circle cx="16" cy="14" r="1" stroke="#4a8a4a" fill="rgba(74,138,74,0.1)"/>'
        + '<path d="M7 17 Q6 20 8 20" stroke="#4a8a4a" stroke-width="1" opacity="0.5"/>'
        + '<path d="M15 17 Q16 20 14 19" stroke="#4a8a4a" stroke-width="1" opacity="0.5"/>'
        + '</svg>',

    // ── BEETLE / ANKHEG / RUST MONSTER ────────────────
    // Armored insect with mandibles and segmented body
    '\u{1FAB2}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<ellipse cx="12" cy="10" rx="5" ry="3.5"/>'
        + '<ellipse cx="12" cy="16" rx="4" ry="3"/>'
        + '<path d="M12 6.5 L12 3"/>'
        + '<path d="M10 7 L8 4 L6 3"/><path d="M14 7 L16 4 L18 3"/>'
        + '<line x1="7" y1="10" x2="4" y2="8"/><line x1="17" y1="10" x2="20" y2="8"/>'
        + '<line x1="7" y1="12" x2="4" y2="13"/><line x1="17" y1="12" x2="20" y2="13"/>'
        + '<line x1="8" y1="16" x2="5" y2="18"/><line x1="16" y1="16" x2="19" y2="18"/>'
        + '<path d="M9 10 L12 10 L15 10" stroke-width="1" opacity="0.4"/>'
        + '<circle cx="10" cy="8" r="0.6" fill="currentColor"/>'
        + '<circle cx="14" cy="8" r="0.6" fill="currentColor"/>'
        + '</svg>',

    // ── ROCKFALL / QUEDA DE PEDRAS ────────────────────
    // Falling rocks with motion lines
    '\u{1FAA8}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<polygon points="10,11 14,9 16,13 13,15 9,14" fill="rgba(138,122,104,0.2)"/>'
        + '<polygon points="15,15 19,14 20,18 16,19" fill="rgba(138,122,104,0.15)"/>'
        + '<polygon points="4,16 8,15 9,19 5,20" fill="rgba(138,122,104,0.15)"/>'
        + '<polygon points="10,11 14,9 16,13 13,15 9,14" />'
        + '<polygon points="15,15 19,14 20,18 16,19"/>'
        + '<polygon points="4,16 8,15 9,19 5,20"/>'
        + '<path d="M11 4 L11 7" stroke-width="1" opacity="0.5"/>'
        + '<path d="M16 3 L16 6" stroke-width="1" opacity="0.5"/>'
        + '<path d="M7 6 L7 9" stroke-width="1" opacity="0.5"/>'
        + '<path d="M12 7 L10 11" stroke-width="1" stroke-dasharray="1.5 1.5" opacity="0.3"/>'
        + '<path d="M17 6 L16 14" stroke-width="1" stroke-dasharray="1.5 1.5" opacity="0.3"/>'
        + '</svg>',

    // ── HEAT / CALOR ──────────────────────────────────
    // Thermometer with heat waves
    '\u{1F321}\uFE0F': '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M12 3 L12 14" stroke="currentColor"/>'
        + '<rect x="10" y="3" width="4" height="13" rx="2" stroke="currentColor" fill="none"/>'
        + '<circle cx="12" cy="18" r="3" stroke="#c44a32" fill="rgba(196,74,50,0.2)"/>'
        + '<rect x="10.5" y="10" width="3" height="6" rx="1" fill="rgba(196,74,50,0.4)" stroke="none"/>'
        + '<path d="M18 7 Q20 9 18 11" stroke="#c44a32" stroke-width="1" fill="none" opacity="0.6"/>'
        + '<path d="M20 5 Q22 8 20 11" stroke="#c44a32" stroke-width="1" fill="none" opacity="0.4"/>'
        + '<path d="M4 8 Q6 10 4 12" stroke="#c44a32" stroke-width="1" fill="none" opacity="0.6"/>'
        + '</svg>',

    // Also map the bare thermometer (without variation selector)
    '\u{1F321}': null, // will be filled below

    // ── LOG / TRONCO ──────────────────────────────────
    // Wooden log with bark texture and cross-section rings
    '\u{1FAB5}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<ellipse cx="18" cy="12" rx="3" ry="5" fill="rgba(138,122,104,0.15)"/>'
        + '<ellipse cx="18" cy="12" rx="3" ry="5"/>'
        + '<ellipse cx="18" cy="12" rx="1.5" ry="2.5" stroke-width="1" opacity="0.5"/>'
        + '<ellipse cx="18" cy="12" rx="0.5" ry="1" stroke-width="0.8" opacity="0.3"/>'
        + '<path d="M18 7 L6 7 Q3 7 3 12 Q3 17 6 17 L18 17"/>'
        + '<path d="M5 9 Q4 12 5 15" stroke-width="1" opacity="0.3"/>'
        + '<path d="M8 8 L8 16" stroke-width="0.8" opacity="0.2"/>'
        + '<path d="M12 7.5 L12 16.5" stroke-width="0.8" opacity="0.2"/>'
        + '</svg>',

    // ── AXE / MACHADO ─────────────────────────────────
    // Single-headed woodcutting axe
    '\u{1FA93}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<line x1="6" y1="20" x2="16" y2="6"/>'
        + '<path d="M13 9 Q10 5 12 2 Q17 3 19 7 Q20 10 16 9 Z" fill="rgba(138,122,104,0.2)"/>'
        + '<path d="M13 9 Q10 5 12 2 Q17 3 19 7 Q20 10 16 9"/>'
        + '<path d="M14.5 5.5 L17 8" stroke-width="1" opacity="0.4"/>'
        + '</svg>',

    // ── PIT / BURACO ──────────────────────────────────
    // Dark pit/hole in the ground with rough edges
    '\u{1F573}\uFE0F': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<ellipse cx="12" cy="13" rx="8" ry="4" fill="rgba(42,36,32,0.6)"/>'
        + '<ellipse cx="12" cy="13" rx="8" ry="4"/>'
        + '<path d="M5 11 Q4 9 6 8 L8 9" stroke-width="1" opacity="0.5"/>'
        + '<path d="M19 11 Q20 9 18 8 L16 9" stroke-width="1" opacity="0.5"/>'
        + '<path d="M9 9 L10 10" stroke-width="1" opacity="0.4"/>'
        + '<path d="M14 9 L15 10" stroke-width="1" opacity="0.4"/>'
        + '<path d="M12 17 L12 19" stroke-width="1" opacity="0.3"/>'
        + '<path d="M9 16 L8 18" stroke-width="1" opacity="0.3"/>'
        + '<path d="M15 16 L16 18" stroke-width="1" opacity="0.3"/>'
        + '</svg>',

    // Also map without variation selector
    '\u{1F573}': null, // will be filled below

    // ── ICE / GELO ────────────────────────────────────
    // Crystal ice shard / frozen chunk
    '\u{1F9CA}': '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<polygon points="12,2 17,8 19,16 14,22 8,20 5,12 7,6" stroke="#6a8aaa" fill="rgba(106,138,170,0.1)"/>'
        + '<path d="M12 2 L14 10 L19 16" stroke="#6a8aaa" stroke-width="1" opacity="0.5"/>'
        + '<path d="M7 6 L14 10 L14 22" stroke="#6a8aaa" stroke-width="1" opacity="0.5"/>'
        + '<path d="M5 12 L14 10" stroke="#6a8aaa" stroke-width="1" opacity="0.4"/>'
        + '<path d="M8 20 L14 10" stroke="#6a8aaa" stroke-width="1" opacity="0.3"/>'
        + '</svg>',

    // ── CLIMB / ESCALADA ──────────────────────────────
    // Figure climbing a rope/wall
    '\u{1F9D7}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M17 2 L17 22" stroke-width="1" opacity="0.3" stroke-dasharray="2 2"/>'
        + '<circle cx="12" cy="6" r="2"/>'
        + '<path d="M12 8 L12 15"/>'
        + '<path d="M12 10 L16 8" /><path d="M16 8 L17 6" stroke-width="1.2"/>'
        + '<path d="M12 11 L8 13"/>'
        + '<path d="M12 15 L15 19"/><path d="M15 19 L17 18" stroke-width="1.2"/>'
        + '<path d="M12 15 L9 19"/>'
        + '</svg>',

    // ── BRAIN / CEREBRO ───────────────────────────────
    // Stylized brain with folds
    '\u{1F9E0}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M12 4 Q8 4 6 7 Q4 10 5 13 Q4 16 6 18 Q8 21 12 20 Q16 21 18 18 Q20 16 19 13 Q20 10 18 7 Q16 4 12 4Z"/>'
        + '<path d="M12 4 L12 20" stroke-width="1" opacity="0.4"/>'
        + '<path d="M8 7 Q10 9 8 12" stroke-width="1" opacity="0.5"/>'
        + '<path d="M16 7 Q14 9 16 12" stroke-width="1" opacity="0.5"/>'
        + '<path d="M7 14 Q10 13 12 15" stroke-width="1" opacity="0.4"/>'
        + '<path d="M17 14 Q14 13 12 15" stroke-width="1" opacity="0.4"/>'
        + '<path d="M6 10 Q9 11 12 9" stroke-width="1" opacity="0.3"/>'
        + '<path d="M18 10 Q15 11 12 9" stroke-width="1" opacity="0.3"/>'
        + '</svg>',

    // ── COMPASS / BUSSOLA ─────────────────────────────
    // Medieval compass rose with cardinal points
    '\u{1F9ED}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<circle cx="12" cy="12" r="9"/>'
        + '<circle cx="12" cy="12" r="1" fill="currentColor"/>'
        + '<polygon points="12,3.5 13.5,10 12,11 10.5,10" fill="rgba(196,74,50,0.4)" stroke="#c44a32" stroke-width="1"/>'
        + '<polygon points="12,20.5 10.5,14 12,13 13.5,14" fill="rgba(138,122,104,0.3)" stroke="currentColor" stroke-width="1"/>'
        + '<polygon points="3.5,12 10,10.5 11,12 10,13.5" fill="rgba(138,122,104,0.2)" stroke="currentColor" stroke-width="1"/>'
        + '<polygon points="20.5,12 14,13.5 13,12 14,10.5" fill="rgba(138,122,104,0.2)" stroke="currentColor" stroke-width="1"/>'
        + '<text x="12" y="3" text-anchor="middle" font-size="3" fill="currentColor" stroke="none" font-weight="bold">N</text>'
        + '</svg>',

    // ── BLINK DOG (ZWJ sequence) ──────────────────────
    // Spectral/ethereal canine with teleport shimmer
    '\u{1F415}\u200D\u{1F9BA}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M7 10 Q5 7 7 5 L9 5 L10 7" />'
        + '<path d="M13 10 Q15 7 17 5 L19 6 L17 8"/>'
        + '<ellipse cx="13" cy="13" rx="6" ry="4"/>'
        + '<circle cx="10" cy="11" r="0.7" fill="currentColor"/>'
        + '<circle cx="14" cy="10.5" r="0.7" fill="currentColor"/>'
        + '<path d="M7 13 L5 17 L6 18"/>'
        + '<path d="M9 16 L8 20 L9 21"/>'
        + '<path d="M15 16 L16 20 L17 21"/>'
        + '<path d="M18 14 L20 17 L21 17"/>'
        + '<path d="M19 13 Q21 12 22 14" stroke-width="1"/>'
        + '<path d="M3 9 L4 11" stroke-width="1" opacity="0.3" stroke-dasharray="1 1"/>'
        + '<path d="M2 13 L4 13" stroke-width="1" opacity="0.3" stroke-dasharray="1 1"/>'
        + '<path d="M3 16 L4 15" stroke-width="1" opacity="0.3" stroke-dasharray="1 1"/>'
        + '</svg>',

    // ── UNDEAD / MORTO-VIVO ───────────────────────────
    // Skeletal/zombie figure with tattered shroud
    '\u{1F9DF}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<circle cx="12" cy="5" r="3"/>'
        + '<circle cx="10.5" cy="4.5" r="1" fill="rgba(74,138,74,0.3)" stroke="currentColor" stroke-width="0.8"/>'
        + '<circle cx="13.5" cy="4.5" r="1" fill="rgba(74,138,74,0.3)" stroke="currentColor" stroke-width="0.8"/>'
        + '<path d="M10 7 L14 7"/>'
        + '<path d="M12 8 L12 16"/>'
        + '<path d="M12 10 L7 14"/><path d="M12 10 L17 13"/>'
        + '<path d="M7 14 L5 16" stroke-width="1"/>'
        + '<path d="M17 13 L19 11" stroke-width="1"/>'
        + '<path d="M12 16 L9 22"/><path d="M12 16 L15 22"/>'
        + '<path d="M8 9 Q6 12 9 14" stroke-width="0.8" opacity="0.3" stroke-dasharray="2 1"/>'
        + '<path d="M16 9 Q18 11 16 14" stroke-width="0.8" opacity="0.3" stroke-dasharray="2 1"/>'
        + '</svg>',
};

// Fill aliases (bare emoji without variation selectors)
ICON_REGISTRY['\u{1F321}'] = ICON_REGISTRY['\u{1F321}\uFE0F'];
ICON_REGISTRY['\u{1F573}'] = ICON_REGISTRY['\u{1F573}\uFE0F'];

// ZWJ variants for zombie/undead
ICON_REGISTRY['\u{1F9DF}\u200D\u2642\uFE0F'] = ICON_REGISTRY['\u{1F9DF}']; // male zombie
ICON_REGISTRY['\u{1F9DF}\u200D\u2640\uFE0F'] = ICON_REGISTRY['\u{1F9DF}']; // female zombie

// ── PUBLIC API ────────────────────────────────────────

/**
 * Get SVG HTML string for an emoji, or null if not mapped.
 * @param {string} emoji - The emoji character(s)
 * @param {number} [size=24] - Icon size in pixels
 * @returns {string|null} SVG wrapped in a span, or null
 */
function getIconSVG(emoji, size) {
    const svg = ICON_REGISTRY[emoji];
    if (!svg) return null;
    const s = size || 24;
    return '<span class="v-icon" style="width:' + s + 'px;height:' + s + 'px">' + svg + '</span>';
}

// Canvas image cache: emoji -> HTMLImageElement
const _canvasIconCache = {};

/**
 * Get a cached HTMLImageElement for drawing on canvas.
 * Returns null if emoji is not in registry or image not yet loaded.
 * @param {string} emoji
 * @returns {HTMLImageElement|null}
 */
function getIconForCanvas(emoji) {
    if (_canvasIconCache[emoji]) {
        return _canvasIconCache[emoji].complete ? _canvasIconCache[emoji] : null;
    }
    const svg = ICON_REGISTRY[emoji];
    if (!svg) return null;

    // Encode SVG as data URI for canvas rendering
    // Replace currentColor with parchment for canvas (no CSS inheritance)
    const canvasSvg = svg.replace(/currentColor/g, '#d4c8b0');
    const blob = new Blob([canvasSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.src = url;
    _canvasIconCache[emoji] = img;
    return img.complete ? img : null;
}

/**
 * Pre-warm the canvas icon cache for a list of emoji.
 * Call during loading screen before map rendering.
 * @param {string[]} emojis
 */
function warmCanvasIcons(emojis) {
    (emojis || []).forEach(function(e) { getIconForCanvas(e); });
}

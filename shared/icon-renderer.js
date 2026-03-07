// =====================================================
// VALDORIA ICON RENDERER — DOM + Canvas rendering
// =====================================================
// Utilities to replace emoji textContent with SVG icons
// from ICON_REGISTRY. Falls back to original emoji if
// no SVG mapping exists.
//
// Requires: icon-registry.js loaded first
// =====================================================

/**
 * Render an icon into a DOM element.
 * Replaces textContent with inline SVG, or falls back to emoji.
 * @param {HTMLElement} el - Container element (e.g., .dm-icon span)
 * @param {string} emoji - The emoji string to render
 * @param {number} [size=24] - Icon size in pixels
 */
function renderIcon(el, emoji, size) {
    if (!el) return;
    const svg = getIconSVG(emoji, size);
    if (svg) {
        el.innerHTML = svg;
        el.classList.add('has-svg-icon');
    } else {
        el.textContent = emoji;
        el.classList.remove('has-svg-icon');
    }
}

/**
 * Return HTML string for a choice button icon.
 * Used in innerHTML templates: `<span class="choice-icon">${renderChoiceIcon(emoji)}</span>`
 * @param {string} emoji - The emoji string
 * @returns {string} SVG HTML or emoji text
 */
function renderChoiceIcon(emoji) {
    const svg = getIconSVG(emoji, 18);
    return svg || emoji;
}

/**
 * Draw an icon on a canvas context.
 * Falls back to fillText with emoji if no SVG available.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} emoji
 * @param {number} x - Center X
 * @param {number} y - Center Y
 * @param {number} size - Icon size in pixels
 */
function renderCanvasIcon(ctx, emoji, x, y, size) {
    const img = getIconForCanvas(emoji);
    if (img && img.complete && img.naturalWidth > 0) {
        const half = size / 2;
        ctx.drawImage(img, x - half, y - half, size, size);
    } else {
        // Fallback: draw emoji text
        ctx.font = 'bold ' + size + 'px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, x, y);
    }
}

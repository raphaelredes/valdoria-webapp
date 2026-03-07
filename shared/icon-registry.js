// =====================================================
// VALDORIA ICON REGISTRY — Medieval SVG Icon System v2
// =====================================================
// Maps emoji strings to inline SVG for consistent rendering
// across all platforms. Replaces Unicode 13+ emoji that
// show as broken squares on older devices.
//
// Style: Detailed fantasy line art inspired by D&D bestiary
//        illustrations and medieval woodcuts. Multi-layer
//        strokes with hatching, shading, and anatomical detail.
// ViewBox: 0 0 24 24 (uniform)
// =====================================================

const ICON_REGISTRY = {

    // ── TRAP / ARMADILHA ──────────────────────────────
    // Detailed bear trap: steel jaws with rivets, chain,
    // pressure plate, and worn metal texture
    '\u{1FAA4}': '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">'
        // Base plate with worn metal texture
        + '<path d="M3 13.5 L21 13.5" stroke="#8a7a68" stroke-width="2.5"/>'
        + '<path d="M4 13.5 L20 13.5" stroke="currentColor" stroke-width="1.8"/>'
        // Upper jaw — sharp jagged teeth
        + '<path d="M4 13 L5.5 8.5 L7 11 L8.5 7 L10 11.5 L12 6 L14 11.5 L15.5 7 L17 11 L18.5 8.5 L20 13" stroke="currentColor" stroke-width="1.3" fill="none"/>'
        + '<path d="M5.5 8.5 L7 11 L8.5 7 L10 11.5 L12 6 L14 11.5 L15.5 7 L17 11 L18.5 8.5" stroke="currentColor" stroke-width="0.6" opacity="0.4"/>'
        // Lower jaw — mirrored teeth
        + '<path d="M4 14 L5.5 18.5 L7 16 L8.5 20 L10 15.5 L12 21 L14 15.5 L15.5 20 L17 16 L18.5 18.5 L20 14" stroke="currentColor" stroke-width="1.3" fill="none"/>'
        + '<path d="M5.5 18.5 L7 16 L8.5 20 L10 15.5 L12 21 L14 15.5 L15.5 20 L17 16 L18.5 18.5" stroke="currentColor" stroke-width="0.6" opacity="0.4"/>'
        // Pressure plate center
        + '<ellipse cx="12" cy="13.5" rx="2.5" ry="1" fill="rgba(123,32,32,0.25)" stroke="#7b2020" stroke-width="1"/>'
        + '<circle cx="12" cy="13.5" r="0.5" fill="#7b2020"/>'
        // Rivets on the bar
        + '<circle cx="5" cy="13.5" r="0.5" fill="currentColor" opacity="0.6"/>'
        + '<circle cx="8" cy="13.5" r="0.4" fill="currentColor" opacity="0.5"/>'
        + '<circle cx="16" cy="13.5" r="0.4" fill="currentColor" opacity="0.5"/>'
        + '<circle cx="19" cy="13.5" r="0.5" fill="currentColor" opacity="0.6"/>'
        // Chain links at base
        + '<path d="M11 3 Q10 4 11 5 Q12 4 11 3Z" stroke="currentColor" stroke-width="0.7" fill="none" opacity="0.5"/>'
        + '<path d="M13 4 Q12 5 13 6 Q14 5 13 4Z" stroke="currentColor" stroke-width="0.7" fill="none" opacity="0.5"/>'
        + '<path d="M12 1.5 L11 3" stroke="currentColor" stroke-width="0.7" opacity="0.4"/>'
        + '<path d="M13 6 L12 7.5" stroke="currentColor" stroke-width="0.7" opacity="0.4"/>'
        + '</svg>',

    // ── TROLL ─────────────────────────────────────────
    // Massive hunched creature: thick neck, long arms,
    // bulging muscles, warty skin, crude club, tusks
    '\u{1F9CC}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
        // Head — large misshapen skull
        + '<path d="M9.5 6.5 Q9 3.5 10.5 2.5 Q12 1.8 13.5 2.5 Q15 3.5 14.5 6.5 Q14 8 12 8.5 Q10 8 9.5 6.5Z" stroke-width="1.3" fill="rgba(138,122,104,0.1)"/>'
        // Horns/brow ridges
        + '<path d="M9.8 3.5 L7.5 1.5" stroke-width="1.5"/>'
        + '<path d="M14.2 3.5 L16.5 1.5" stroke-width="1.5"/>'
        // Face details — deep-set eyes, heavy brow, fangs
        + '<path d="M9.5 4 L10.5 4.2" stroke-width="1.2"/>'
        + '<path d="M13.5 4.2 L14.5 4" stroke-width="1.2"/>'
        + '<circle cx="11" cy="4.5" r="0.5" fill="currentColor"/>'
        + '<circle cx="13" cy="4.5" r="0.5" fill="currentColor"/>'
        + '<path d="M11 6.5 L11.5 7.5" stroke-width="0.8"/>'
        + '<path d="M13 6.5 L12.5 7.5" stroke-width="0.8"/>'
        + '<path d="M10.5 6 Q12 6.8 13.5 6" stroke-width="0.8"/>'
        // Massive torso — hunched
        + '<path d="M10 8.5 Q8 9.5 7 12 Q6 14.5 7.5 16.5" stroke-width="1.5"/>'
        + '<path d="M14 8.5 Q16 9.5 17 12 Q18 14.5 16.5 16.5" stroke-width="1.5"/>'
        + '<path d="M7.5 16.5 Q10 18 12 17.5 Q14 18 16.5 16.5" stroke-width="1.3"/>'
        // Shoulder muscle bulk
        + '<path d="M8 10 Q7 10 6 11" stroke-width="1" opacity="0.4"/>'
        + '<path d="M16 10 Q17 10 18 11" stroke-width="1" opacity="0.4"/>'
        // Left arm — long, reaching down, thick
        + '<path d="M7 12 Q5 14 4 16 Q3.5 17 4 18.5" stroke-width="1.8"/>'
        + '<path d="M4 18.5 L3 19.5 L4.5 20 L5 19" stroke-width="1" fill="rgba(138,122,104,0.1)"/>'
        // Right arm with club
        + '<path d="M17 12 Q18.5 13 19 14.5 Q19.5 15.5 19 16.5" stroke-width="1.8"/>'
        // Club — crude, knotted
        + '<path d="M18.5 15 L20.5 9 Q21 7.5 20.5 6.5 Q19.5 5.5 20.5 5 Q21.5 5.5 21.5 7 L21 8" stroke-width="2.2"/>'
        + '<path d="M20 7 L21 7.5" stroke-width="0.7" opacity="0.5"/>'
        + '<path d="M20.5 6 Q21.2 6 21.3 6.8" stroke-width="0.7" opacity="0.4"/>'
        // Legs — short, thick, bowed
        + '<path d="M9 17 Q8 19.5 7.5 21 L6.5 22.5" stroke-width="1.8"/>'
        + '<path d="M15 17 Q16 19.5 16.5 21 L17.5 22.5" stroke-width="1.8"/>'
        + '<path d="M6.5 22.5 L5.5 23" stroke-width="1.3"/>'
        + '<path d="M17.5 22.5 L18.5 23" stroke-width="1.3"/>'
        // Skin texture — warty bumps
        + '<circle cx="8" cy="13" r="0.3" fill="currentColor" opacity="0.3"/>'
        + '<circle cx="15" cy="11" r="0.3" fill="currentColor" opacity="0.3"/>'
        + '<circle cx="10" cy="15" r="0.3" fill="currentColor" opacity="0.25"/>'
        + '<circle cx="14" cy="14" r="0.3" fill="currentColor" opacity="0.25"/>'
        + '</svg>',

    // ── OOZE / GOSMA ─────────────────────────────────
    // Corrosive amorphous mass: irregular blobby form with
    // dissolved bones visible inside, dripping acid tendrils,
    // multiple internal bubbles of varying size
    '\u{1FAE7}': '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">'
        // Main body — irregular amorphous blob
        + '<path d="M4 15 Q2.5 12 4 9.5 Q5.5 7.5 8 8 Q9 6 11.5 6.5 Q13 5.5 15 6.5 Q17.5 6 19.5 8.5 Q21.5 11 20 14.5 Q19 17 16.5 17.5 Q15 19 12 18.5 Q9 19.5 7 18 Q5 17.5 4 15Z" stroke="#4a8a4a" stroke-width="1.4" fill="rgba(74,138,74,0.12)"/>'
        // Internal structure — dissolved skeleton fragments
        + '<path d="M10 12 L10 14.5" stroke="#4a8a4a" stroke-width="0.7" opacity="0.4"/>'
        + '<path d="M9.5 12.5 L10.5 12.5" stroke="#4a8a4a" stroke-width="0.6" opacity="0.3"/>'
        + '<circle cx="10" cy="11.5" r="0.8" stroke="#4a8a4a" stroke-width="0.6" fill="rgba(74,138,74,0.08)" opacity="0.5"/>'
        // Large bubbles
        + '<circle cx="8" cy="12" r="1.8" stroke="#4a8a4a" stroke-width="0.8" fill="rgba(74,138,74,0.06)"/>'
        + '<circle cx="15" cy="10.5" r="1.5" stroke="#4a8a4a" stroke-width="0.8" fill="rgba(74,138,74,0.06)"/>'
        + '<circle cx="13" cy="14" r="1.3" stroke="#4a8a4a" stroke-width="0.7" fill="rgba(74,138,74,0.05)"/>'
        // Small bubbles
        + '<circle cx="17" cy="13" r="0.7" stroke="#4a8a4a" stroke-width="0.5" fill="rgba(74,138,74,0.08)"/>'
        + '<circle cx="6.5" cy="14" r="0.6" stroke="#4a8a4a" stroke-width="0.5" fill="rgba(74,138,74,0.08)"/>'
        + '<circle cx="11" cy="8.5" r="0.5" stroke="#4a8a4a" stroke-width="0.5" fill="rgba(74,138,74,0.1)"/>'
        + '<circle cx="16.5" cy="8" r="0.4" stroke="#4a8a4a" stroke-width="0.4" fill="rgba(74,138,74,0.1)"/>'
        // Dripping acid tendrils
        + '<path d="M6 17 Q5.5 19.5 6.5 21" stroke="#4a8a4a" stroke-width="0.9" opacity="0.5"/>'
        + '<path d="M6.5 21 Q6.8 22 6.5 22.5" stroke="#4a8a4a" stroke-width="0.6" opacity="0.3"/>'
        + '<path d="M15 18 Q15.5 20 14.5 21.5" stroke="#4a8a4a" stroke-width="0.8" opacity="0.45"/>'
        + '<path d="M10 18.5 Q10 20 10.5 20.8" stroke="#4a8a4a" stroke-width="0.7" opacity="0.35"/>'
        // Surface sheen — highlight arc
        + '<path d="M7 9 Q9 7.5 11 8" stroke="#4a8a4a" stroke-width="0.5" opacity="0.25"/>'
        + '<path d="M15 7 Q17 7.5 18.5 9" stroke="#4a8a4a" stroke-width="0.5" opacity="0.2"/>'
        + '</svg>',

    // ── BEETLE / ANKHEG / RUST MONSTER ────────────────
    // Armored burrowing insect: chitinous segmented plates,
    // large mandibles, compound eyes, six jointed legs,
    // textured carapace with ridges
    '\u{1FAB2}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
        // Head with mandibles
        + '<path d="M10 7 Q10 5 9 3.5 L8 2" stroke-width="1.5"/>'
        + '<path d="M14 7 Q14 5 15 3.5 L16 2" stroke-width="1.5"/>'
        + '<path d="M8 2 Q7 1.5 6.5 2" stroke-width="1" opacity="0.7"/>'
        + '<path d="M16 2 Q17 1.5 17.5 2" stroke-width="1" opacity="0.7"/>'
        // Head plate
        + '<path d="M9 8 Q10 6.5 12 6.5 Q14 6.5 15 8" stroke-width="1.3" fill="rgba(138,122,104,0.1)"/>'
        // Compound eyes
        + '<ellipse cx="10" cy="7" rx="0.8" ry="0.6" fill="currentColor" opacity="0.7"/>'
        + '<ellipse cx="14" cy="7" rx="0.8" ry="0.6" fill="currentColor" opacity="0.7"/>'
        // Antennae
        + '<path d="M10 6.5 Q8 4 6 3.5" stroke-width="0.7" opacity="0.6"/>'
        + '<path d="M14 6.5 Q16 4 18 3.5" stroke-width="0.7" opacity="0.6"/>'
        // Thorax — armored plate
        + '<ellipse cx="12" cy="10.5" rx="5" ry="3" fill="rgba(138,122,104,0.08)" stroke-width="1.4"/>'
        // Carapace ridges
        + '<path d="M12 7.5 L12 13.5" stroke-width="0.6" opacity="0.3"/>'
        + '<path d="M8 9 Q10 10.5 8 12" stroke-width="0.5" opacity="0.25"/>'
        + '<path d="M16 9 Q14 10.5 16 12" stroke-width="0.5" opacity="0.25"/>'
        // Abdomen — segmented
        + '<ellipse cx="12" cy="16" rx="4" ry="3.5" fill="rgba(138,122,104,0.06)" stroke-width="1.3"/>'
        + '<path d="M8.5 14.5 Q12 14 15.5 14.5" stroke-width="0.5" opacity="0.3"/>'
        + '<path d="M8.2 16 Q12 15.5 15.8 16" stroke-width="0.5" opacity="0.25"/>'
        + '<path d="M8.5 17.5 Q12 17 15.5 17.5" stroke-width="0.5" opacity="0.2"/>'
        // Legs — 3 pairs, jointed
        + '<path d="M8 9.5 L5 7.5 L3.5 8.5" stroke-width="1.1"/>'
        + '<path d="M16 9.5 L19 7.5 L20.5 8.5" stroke-width="1.1"/>'
        + '<path d="M7.5 11.5 L4.5 12 L3.5 13.5" stroke-width="1.1"/>'
        + '<path d="M16.5 11.5 L19.5 12 L20.5 13.5" stroke-width="1.1"/>'
        + '<path d="M8.5 15.5 L5.5 17 L4.5 19" stroke-width="1.1"/>'
        + '<path d="M15.5 15.5 L18.5 17 L19.5 19" stroke-width="1.1"/>'
        // Leg joints
        + '<circle cx="5" cy="7.5" r="0.4" fill="currentColor" opacity="0.4"/>'
        + '<circle cx="19" cy="7.5" r="0.4" fill="currentColor" opacity="0.4"/>'
        + '<circle cx="4.5" cy="12" r="0.4" fill="currentColor" opacity="0.4"/>'
        + '<circle cx="19.5" cy="12" r="0.4" fill="currentColor" opacity="0.4"/>'
        + '</svg>',

    // ── ROCKFALL / QUEDA DE PEDRAS ────────────────────
    // Tumbling boulders and debris: irregular rocks with
    // crack lines, dust cloud, motion streaks, impact area
    '\u{1FAA8}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
        // Large rock — angular with crack detail
        + '<path d="M8 10 L12 7.5 L16 9 L17 13 L14 15.5 L9 14.5Z" stroke-width="1.3" fill="rgba(138,122,104,0.15)"/>'
        + '<path d="M12 7.5 L13 11 L17 13" stroke-width="0.6" opacity="0.35"/>'
        + '<path d="M9 14.5 L13 11 L14 15.5" stroke-width="0.6" opacity="0.3"/>'
        + '<path d="M10 9 L11 10.5" stroke-width="0.5" opacity="0.25"/>'
        // Medium rock
        + '<path d="M16 16 L19.5 15 L21 17.5 L19 19.5 L16 18.5Z" stroke-width="1.2" fill="rgba(138,122,104,0.12)"/>'
        + '<path d="M19.5 15 L18.5 17.5 L21 17.5" stroke-width="0.5" opacity="0.3"/>'
        // Small rock
        + '<path d="M3 16.5 L6 15.5 L7.5 17.5 L6 19.5 L3.5 19Z" stroke-width="1.1" fill="rgba(138,122,104,0.1)"/>'
        + '<path d="M6 15.5 L5.5 18" stroke-width="0.5" opacity="0.25"/>'
        // Small debris fragments
        + '<path d="M14 3 L15.5 4 L14.5 5 L13.5 4Z" stroke-width="0.7" fill="rgba(138,122,104,0.08)"/>'
        + '<path d="M5 8 L6.5 7.5 L7 9 L5.5 9Z" stroke-width="0.7" fill="rgba(138,122,104,0.08)"/>'
        // Motion streaks — falling
        + '<path d="M12 2 L11 5.5" stroke-width="0.7" opacity="0.35" stroke-dasharray="1.5 1"/>'
        + '<path d="M17 3 L16.5 7" stroke-width="0.7" opacity="0.3" stroke-dasharray="1.5 1"/>'
        + '<path d="M7 4 L7.5 7.5" stroke-width="0.6" opacity="0.3" stroke-dasharray="1.5 1"/>'
        + '<path d="M20 8 L19.5 12" stroke-width="0.6" opacity="0.25" stroke-dasharray="1.2 1"/>'
        // Dust cloud at impact
        + '<path d="M4 20 Q6 19 8 20 Q10 21 12 20.5 Q14 21 16 20 Q18 20.5 20 21" stroke-width="0.7" opacity="0.25"/>'
        + '<path d="M6 21.5 Q9 21 12 21.5 Q15 21 18 21.5" stroke-width="0.5" opacity="0.15"/>'
        + '</svg>',

    // ── HEAT / CALOR ──────────────────────────────────
    // Ornate thermometer: mercury bulb, graduated tube,
    // radiating heat waves, shimmer effect
    '\u{1F321}\uFE0F': '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">'
        // Tube body — glass with frame
        + '<rect x="10" y="2" width="4" height="14" rx="2" stroke="currentColor" stroke-width="1.3" fill="rgba(138,122,104,0.05)"/>'
        // Graduation marks
        + '<path d="M10.3 5 L11 5" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>'
        + '<path d="M10.3 7 L11.5 7" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>'
        + '<path d="M10.3 9 L11 9" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>'
        + '<path d="M10.3 11 L11.5 11" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>'
        // Mercury column — rising
        + '<rect x="11" y="8" width="2" height="8.5" rx="0.8" fill="rgba(196,74,50,0.5)" stroke="none"/>'
        // Mercury bulb — large bottom sphere
        + '<circle cx="12" cy="18.5" r="3.5" stroke="#c44a32" stroke-width="1.3" fill="rgba(196,74,50,0.2)"/>'
        + '<circle cx="12" cy="18.5" r="2" fill="rgba(196,74,50,0.35)" stroke="none"/>'
        // Glass highlight
        + '<path d="M10.5 3 L10.5 13" stroke="currentColor" stroke-width="0.4" opacity="0.2"/>'
        // Heat waves — radiating left
        + '<path d="M5 8 Q3.5 10 5 12" stroke="#c44a32" stroke-width="1" opacity="0.5"/>'
        + '<path d="M3.5 6.5 Q1.5 9.5 3.5 12.5" stroke="#c44a32" stroke-width="0.8" opacity="0.3"/>'
        // Heat waves — radiating right
        + '<path d="M19 8 Q20.5 10 19 12" stroke="#c44a32" stroke-width="1" opacity="0.5"/>'
        + '<path d="M20.5 6.5 Q22.5 9.5 20.5 12.5" stroke="#c44a32" stroke-width="0.8" opacity="0.3"/>'
        // Shimmer dots
        + '<circle cx="7" cy="6" r="0.4" fill="#c44a32" opacity="0.3"/>'
        + '<circle cx="17" cy="7" r="0.4" fill="#c44a32" opacity="0.25"/>'
        + '<circle cx="6" cy="14" r="0.3" fill="#c44a32" opacity="0.2"/>'
        + '</svg>',

    '\u{1F321}': null, // filled below

    // ── LOG / TRONCO ──────────────────────────────────
    // Sawn timber log: visible growth rings on cross-section,
    // rough bark texture, knotholes, moss patches
    '\u{1FAB5}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
        // Cross-section face — growth rings
        + '<ellipse cx="19" cy="12" rx="3.2" ry="5.5" stroke-width="1.3" fill="rgba(138,122,104,0.12)"/>'
        + '<ellipse cx="19" cy="12" rx="2.2" ry="4" stroke-width="0.6" opacity="0.4"/>'
        + '<ellipse cx="19" cy="12" rx="1.3" ry="2.5" stroke-width="0.5" opacity="0.3"/>'
        + '<ellipse cx="19" cy="12" rx="0.5" ry="1" stroke-width="0.4" opacity="0.25"/>'
        + '<circle cx="19" cy="12" r="0.3" fill="currentColor" opacity="0.3"/>'
        // Bark body — top and bottom arcs
        + '<path d="M19 6.5 L8 6.5 Q4 6.5 3.5 9 Q3 10.5 3.5 12 Q3 13.5 3.5 15 Q4 17.5 8 17.5 L19 17.5" stroke-width="1.3"/>'
        // Bark texture — vertical hash lines
        + '<path d="M7 7 L7.2 17" stroke-width="0.5" opacity="0.2"/>'
        + '<path d="M10 6.8 L10.2 17.2" stroke-width="0.5" opacity="0.18"/>'
        + '<path d="M13 6.6 L13 17.4" stroke-width="0.5" opacity="0.15"/>'
        + '<path d="M16 6.5 L16 17.5" stroke-width="0.5" opacity="0.12"/>'
        // Bark rough patches
        + '<path d="M5 9 Q4.5 10.5 5 12" stroke-width="0.7" opacity="0.3"/>'
        + '<path d="M5 13.5 Q4.5 14.5 5 15.5" stroke-width="0.6" opacity="0.25"/>'
        // Knothole
        + '<ellipse cx="9" cy="11.5" rx="0.8" ry="1" fill="rgba(42,36,32,0.3)" stroke-width="0.5" opacity="0.5"/>'
        // Moss patch
        + '<path d="M5 7 Q6 6 7.5 6.8" stroke="#4a8a4a" stroke-width="0.7" opacity="0.35"/>'
        + '<path d="M4 8 Q5 7 6 7.5" stroke="#4a8a4a" stroke-width="0.5" opacity="0.25"/>'
        + '</svg>',

    // ── AXE / MACHADO ─────────────────────────────────
    // Battle axe: curved blade with fuller groove, wrapped
    // leather handle grip, pommel, blade edge sheen
    '\u{1FA93}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
        // Handle — long with wrapped grip
        + '<line x1="5" y1="21.5" x2="15" y2="7" stroke-width="1.8"/>'
        + '<line x1="5.3" y1="21.2" x2="15.3" y2="7.2" stroke-width="0.4" opacity="0.2"/>'
        // Grip wrapping
        + '<path d="M7 18.5 L8 17.5" stroke-width="0.7" opacity="0.5"/>'
        + '<path d="M7.8 17.5 L8.8 16.5" stroke-width="0.7" opacity="0.45"/>'
        + '<path d="M8.6 16.5 L9.6 15.5" stroke-width="0.7" opacity="0.4"/>'
        + '<path d="M9.4 15.5 L10.4 14.5" stroke-width="0.7" opacity="0.35"/>'
        + '<path d="M10.2 14.5 L11.2 13.5" stroke-width="0.7" opacity="0.3"/>'
        // Pommel
        + '<circle cx="4.5" cy="22" r="0.8" fill="rgba(138,122,104,0.2)" stroke-width="1"/>'
        // Axe head — curved broad blade
        + '<path d="M13 9 Q10 5.5 11 2 Q12 1 13.5 1.5 Q16 2.5 18.5 5 Q20.5 7.5 20 9.5 Q19.5 10.5 18 10 Q16 9.5 15 8.5" stroke-width="1.4" fill="rgba(138,122,104,0.1)"/>'
        // Blade edge — sharpened line with sheen
        + '<path d="M11 2 Q14 4 18.5 5 Q20.5 7.5 20 9.5" stroke-width="0.5" opacity="0.6"/>'
        // Fuller groove
        + '<path d="M13.5 3 Q16 5 18 7.5" stroke-width="0.6" opacity="0.3"/>'
        // Cheek detail
        + '<path d="M14 5 Q15.5 6 16.5 8" stroke-width="0.4" opacity="0.2"/>'
        + '</svg>',

    // ── PIT / BURACO ──────────────────────────────────
    // Dark chasm: rough stone edges, crumbling rim,
    // depth gradient, scattered pebbles, cracks in ground
    '\u{1F573}\uFE0F': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
        // Pit opening — irregular ellipse
        + '<path d="M4 12 Q4 9 7 8 Q9 7.5 12 8 Q15 7.5 17 8 Q20 9 20 12 Q20 15 17 16 Q15 16.5 12 16 Q9 16.5 7 16 Q4 15 4 12Z" fill="rgba(20,16,14,0.7)" stroke-width="1.3"/>'
        // Inner shadow ring (depth)
        + '<path d="M6 11.5 Q6 10 8.5 9.5 Q12 9 15.5 9.5 Q18 10 18 11.5 Q18 13.5 15.5 14 Q12 14.5 8.5 14 Q6 13.5 6 11.5Z" fill="rgba(10,8,6,0.5)" stroke="none"/>'
        // Deepest center
        + '<ellipse cx="12" cy="12" rx="4" ry="2" fill="rgba(5,4,3,0.6)" stroke="none"/>'
        // Rough edge details — crumbling stone
        + '<path d="M5.5 9 Q4 8 5 7 L7 7.5" stroke-width="0.8" opacity="0.6"/>'
        + '<path d="M18.5 9 Q20 8 19 7 L17 7.5" stroke-width="0.8" opacity="0.6"/>'
        + '<path d="M9 7.5 L8.5 6.5 L10 6.8" stroke-width="0.7" opacity="0.5"/>'
        + '<path d="M15 7.5 L15.5 6.5 L14 6.8" stroke-width="0.7" opacity="0.5"/>'
        // Pebbles around edge
        + '<circle cx="6" cy="7" r="0.5" fill="rgba(138,122,104,0.3)" stroke-width="0.4" opacity="0.5"/>'
        + '<circle cx="18" cy="7.5" r="0.4" fill="rgba(138,122,104,0.3)" stroke-width="0.4" opacity="0.45"/>'
        + '<circle cx="10" cy="6.5" r="0.3" fill="rgba(138,122,104,0.25)" stroke-width="0.3" opacity="0.4"/>'
        // Ground cracks radiating outward
        + '<path d="M7 16.5 L6 18.5" stroke-width="0.6" opacity="0.3"/>'
        + '<path d="M12 16 L12 18" stroke-width="0.5" opacity="0.25"/>'
        + '<path d="M17 16.5 L18 18.5" stroke-width="0.6" opacity="0.3"/>'
        + '<path d="M5 14 L3 15.5" stroke-width="0.5" opacity="0.2"/>'
        + '<path d="M19 14 L21 15.5" stroke-width="0.5" opacity="0.2"/>'
        + '</svg>',

    '\u{1F573}': null, // filled below

    // ── ICE / GELO ────────────────────────────────────
    // Jagged ice crystal cluster: multiple faceted shards
    // growing from a base, with internal refraction lines,
    // frost sparkles, translucent facets
    '\u{1F9CA}': '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">'
        // Main crystal — tall center shard
        + '<polygon points="12,1 15,7 16,15 13,21 11,21 8,15 9,7" stroke="#6a8aaa" stroke-width="1.2" fill="rgba(106,138,170,0.08)"/>'
        // Left crystal shard
        + '<polygon points="7,5 9,7 9,15 7,18 5,16 4,10" stroke="#6a8aaa" stroke-width="1" fill="rgba(106,138,170,0.06)"/>'
        // Right crystal shard
        + '<polygon points="17,5 19,9 20,14 18,18 15,15 15,7" stroke="#6a8aaa" stroke-width="1" fill="rgba(106,138,170,0.06)"/>'
        // Small shard left
        + '<polygon points="3,11 5,9 5,15 3,14" stroke="#6a8aaa" stroke-width="0.7" fill="rgba(106,138,170,0.05)"/>'
        // Small shard right
        + '<polygon points="21,10 20,8 21,14 20,15" stroke="#6a8aaa" stroke-width="0.7" fill="rgba(106,138,170,0.05)"/>'
        // Internal refraction lines — main crystal
        + '<path d="M12 1 L12 10 L16 15" stroke="#6a8aaa" stroke-width="0.5" opacity="0.35"/>'
        + '<path d="M9 7 L12 10 L11 21" stroke="#6a8aaa" stroke-width="0.5" opacity="0.3"/>'
        + '<path d="M8 15 L12 10 L13 21" stroke="#6a8aaa" stroke-width="0.4" opacity="0.25"/>'
        // Refraction — side crystals
        + '<path d="M7 5 L7 12 L5 16" stroke="#6a8aaa" stroke-width="0.4" opacity="0.25"/>'
        + '<path d="M17 5 L18 11 L18 18" stroke="#6a8aaa" stroke-width="0.4" opacity="0.25"/>'
        // Frost sparkle points
        + '<path d="M11.5 3 L12.5 3" stroke="#6a8aaa" stroke-width="0.5" opacity="0.5"/>'
        + '<path d="M12 2.5 L12 3.5" stroke="#6a8aaa" stroke-width="0.5" opacity="0.5"/>'
        + '<path d="M6 8 L6.5 8" stroke="#6a8aaa" stroke-width="0.4" opacity="0.4"/>'
        + '<path d="M6.25 7.75 L6.25 8.25" stroke="#6a8aaa" stroke-width="0.4" opacity="0.4"/>'
        + '<path d="M18 7 L18.5 7" stroke="#6a8aaa" stroke-width="0.4" opacity="0.35"/>'
        // Base frost
        + '<path d="M5 20 Q8 19 12 20 Q16 19 19 20" stroke="#6a8aaa" stroke-width="0.6" opacity="0.2"/>'
        + '</svg>',

    // ── CLIMB / ESCALADA ──────────────────────────────
    // Adventurer climbing a cliff face: muscular figure,
    // detailed hand grips, rope with knots, cliff texture,
    // determination in pose
    '\u{1F9D7}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
        // Cliff wall — textured surface on right
        + '<path d="M19 0 L19 24" stroke-width="2" opacity="0.15"/>'
        + '<path d="M20 0 L20 24" stroke-width="3" opacity="0.1"/>'
        + '<path d="M19.5 3 L21 4" stroke-width="0.6" opacity="0.2"/>'
        + '<path d="M19.5 9 L21 10" stroke-width="0.6" opacity="0.2"/>'
        + '<path d="M19.5 15 L21.5 16" stroke-width="0.6" opacity="0.2"/>'
        + '<path d="M19 6 L20 5.5" stroke-width="0.5" opacity="0.15"/>'
        + '<path d="M19 12 L20.5 12.5" stroke-width="0.5" opacity="0.15"/>'
        // Rope — hanging from above with knots
        + '<path d="M17 1 L17 22" stroke-width="1" opacity="0.35"/>'
        + '<path d="M16.5 4 Q17 4.5 17.5 4" stroke-width="0.7" opacity="0.3"/>'
        + '<path d="M16.5 10 Q17 10.5 17.5 10" stroke-width="0.7" opacity="0.3"/>'
        + '<path d="M16.5 16 Q17 16.5 17.5 16" stroke-width="0.7" opacity="0.3"/>'
        // Head
        + '<circle cx="11" cy="5.5" r="2" stroke-width="1.3"/>'
        + '<path d="M10 4.5 L10 5" stroke-width="0.6" opacity="0.5"/>'
        // Torso — angled, reaching up
        + '<path d="M11 7.5 L10 12 L11 14.5" stroke-width="1.5"/>'
        // Right arm — reaching up to grip rope
        + '<path d="M11 8 Q13 6 15 5 Q16 4.5 17 4.5" stroke-width="1.4"/>'
        + '<path d="M17 4.5 L17 5" stroke-width="1" opacity="0.6"/>'
        // Left arm — gripping lower
        + '<path d="M10.5 10 Q8 11 7 12 Q6.5 13 7 13.5" stroke-width="1.3"/>'
        // Right leg — bent, foot on ledge
        + '<path d="M11 14.5 Q13 16 15 17 Q17 17.5 18 17" stroke-width="1.4"/>'
        + '<path d="M18 17 L18.5 17.5" stroke-width="1"/>'
        // Left leg — dangling, bent
        + '<path d="M10.5 14 Q9 16 8 18 Q7.5 19 7.5 20" stroke-width="1.3"/>'
        + '<path d="M7.5 20 L7 20.5" stroke-width="1"/>'
        // Ledge/handhold detail
        + '<path d="M17.5 17 L19.5 17" stroke-width="1.2" opacity="0.4"/>'
        + '</svg>',

    // ── BRAIN / CEREBRO ───────────────────────────────
    // Anatomical brain: detailed gyri and sulci folds,
    // cerebellum at base, brain stem, hemispheric split,
    // organic texture with depth
    '\u{1F9E0}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
        // Outer shape — organic brain silhouette
        + '<path d="M12 3 Q8 2.5 6 5 Q4 7.5 4 10 Q3.5 12.5 4.5 14.5 Q4 16.5 5.5 18 Q7 20 10 20 L14 20 Q17 20 18.5 18 Q20 16.5 19.5 14.5 Q20.5 12.5 20 10 Q20 7.5 18 5 Q16 2.5 12 3Z" stroke-width="1.3" fill="rgba(138,122,104,0.06)"/>'
        // Central fissure (hemispheric split)
        + '<path d="M12 3 Q11.5 7 12 10 Q12.5 14 12 18 L12 20" stroke-width="0.8" opacity="0.4"/>'
        // Left hemisphere — gyri folds
        + '<path d="M6 5.5 Q8 5 9.5 6 Q11 7 10.5 9" stroke-width="0.8" opacity="0.5"/>'
        + '<path d="M4.5 8 Q6 7 8 8 Q10 9 9 11" stroke-width="0.7" opacity="0.45"/>'
        + '<path d="M4 11 Q6 10 8 11 Q10 12 9.5 14" stroke-width="0.7" opacity="0.4"/>'
        + '<path d="M5 14 Q7 13.5 8.5 15 Q9.5 16 9 17.5" stroke-width="0.7" opacity="0.35"/>'
        + '<path d="M6 17.5 Q8 17 9.5 18.5" stroke-width="0.6" opacity="0.3"/>'
        // Right hemisphere — gyri folds (mirror)
        + '<path d="M18 5.5 Q16 5 14.5 6 Q13 7 13.5 9" stroke-width="0.8" opacity="0.5"/>'
        + '<path d="M19.5 8 Q18 7 16 8 Q14 9 15 11" stroke-width="0.7" opacity="0.45"/>'
        + '<path d="M20 11 Q18 10 16 11 Q14 12 14.5 14" stroke-width="0.7" opacity="0.4"/>'
        + '<path d="M19 14 Q17 13.5 15.5 15 Q14.5 16 15 17.5" stroke-width="0.7" opacity="0.35"/>'
        + '<path d="M18 17.5 Q16 17 14.5 18.5" stroke-width="0.6" opacity="0.3"/>'
        // Cerebellum — textured base
        + '<path d="M9 19.5 Q10 21 12 21 Q14 21 15 19.5" stroke-width="0.9" opacity="0.5"/>'
        + '<path d="M10 20 L10.5 21" stroke-width="0.4" opacity="0.3"/>'
        + '<path d="M12 20 L12 21.5" stroke-width="0.4" opacity="0.3"/>'
        + '<path d="M14 20 L13.5 21" stroke-width="0.4" opacity="0.3"/>'
        // Brain stem
        + '<path d="M12 21 L12 23" stroke-width="1" opacity="0.45"/>'
        + '</svg>',

    // ── COMPASS / BUSSOLA ─────────────────────────────
    // Ornate medieval compass: decorative outer ring with
    // degree markings, fleur-de-lis at N, detailed needle,
    // cardinal points with serifs, inner rose pattern
    '\u{1F9ED}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
        // Outer ring — ornate double circle
        + '<circle cx="12" cy="12" r="10.5" stroke-width="1.2"/>'
        + '<circle cx="12" cy="12" r="9" stroke-width="0.6" opacity="0.4"/>'
        // Degree tick marks (every 30 degrees)
        + '<line x1="12" y1="1.8" x2="12" y2="3.2" stroke-width="0.7" opacity="0.5"/>'
        + '<line x1="17.1" y1="3.5" x2="16.4" y2="4.6" stroke-width="0.5" opacity="0.4"/>'
        + '<line x1="20.5" y1="7" x2="19.3" y2="7.6" stroke-width="0.5" opacity="0.4"/>'
        + '<line x1="22.2" y1="12" x2="20.8" y2="12" stroke-width="0.7" opacity="0.5"/>'
        + '<line x1="20.5" y1="17" x2="19.3" y2="16.4" stroke-width="0.5" opacity="0.4"/>'
        + '<line x1="17.1" y1="20.5" x2="16.4" y2="19.4" stroke-width="0.5" opacity="0.4"/>'
        + '<line x1="12" y1="22.2" x2="12" y2="20.8" stroke-width="0.7" opacity="0.5"/>'
        + '<line x1="6.9" y1="20.5" x2="7.6" y2="19.4" stroke-width="0.5" opacity="0.4"/>'
        + '<line x1="3.5" y1="17" x2="4.7" y2="16.4" stroke-width="0.5" opacity="0.4"/>'
        + '<line x1="1.8" y1="12" x2="3.2" y2="12" stroke-width="0.7" opacity="0.5"/>'
        + '<line x1="3.5" y1="7" x2="4.7" y2="7.6" stroke-width="0.5" opacity="0.4"/>'
        + '<line x1="6.9" y1="3.5" x2="7.6" y2="4.6" stroke-width="0.5" opacity="0.4"/>'
        // Compass needle — North (red)
        + '<polygon points="12,3.5 13.2,10.5 12,11.5 10.8,10.5" fill="rgba(196,74,50,0.45)" stroke="#c44a32" stroke-width="0.8"/>'
        // Compass needle — South
        + '<polygon points="12,20.5 10.8,13.5 12,12.5 13.2,13.5" fill="rgba(138,122,104,0.25)" stroke="currentColor" stroke-width="0.8"/>'
        // East-West diamond arms
        + '<polygon points="3.5,12 10.5,10.8 11.5,12 10.5,13.2" fill="rgba(138,122,104,0.15)" stroke="currentColor" stroke-width="0.6"/>'
        + '<polygon points="20.5,12 13.5,13.2 12.5,12 13.5,10.8" fill="rgba(138,122,104,0.15)" stroke="currentColor" stroke-width="0.6"/>'
        // Center pivot
        + '<circle cx="12" cy="12" r="1.2" fill="rgba(196,149,58,0.3)" stroke="#c4953a" stroke-width="0.8"/>'
        + '<circle cx="12" cy="12" r="0.4" fill="#c4953a"/>'
        // Cardinal letters
        + '<text x="12" y="2.8" text-anchor="middle" font-size="2.5" fill="#c44a32" stroke="none" font-weight="bold" font-family="serif">N</text>'
        + '<text x="12" y="23" text-anchor="middle" font-size="2" fill="currentColor" stroke="none" opacity="0.5" font-family="serif">S</text>'
        + '<text x="23" y="12.8" text-anchor="middle" font-size="2" fill="currentColor" stroke="none" opacity="0.5" font-family="serif">E</text>'
        + '<text x="1" y="12.8" text-anchor="middle" font-size="2" fill="currentColor" stroke="none" opacity="0.5" font-family="serif">W</text>'
        + '</svg>',

    // ── BLINK DOG (ZWJ sequence) ──────────────────────
    // Ethereal canine: muscular dog form with spectral
    // shimmer, teleport afterimage trails, glowing eyes,
    // fey energy particles
    '\u{1F415}\u200D\u{1F9BA}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
        // Main body — athletic canine form
        + '<path d="M8 11 Q7 9 8 7.5 Q9 6.5 11 7 Q13 6 15 7 Q17 8 17 10 Q18 11 17.5 13 Q17 15 15 15.5 Q13 16.5 10 16 Q8 15.5 7.5 14 Q7 12.5 8 11Z" stroke-width="1.3" fill="rgba(138,122,104,0.06)"/>'
        // Head detail
        + '<path d="M8 8 Q7 6.5 6 5.5 Q5.5 5 5.5 4.5" stroke-width="1.2"/>'
        + '<path d="M10 7.5 Q10.5 5.5 12 4.5 Q12.5 4.5 12.5 5" stroke-width="1.2"/>'
        // Pointed ears
        + '<path d="M6 5.5 L5 3.5 L7 4.5" stroke-width="1"/>'
        + '<path d="M11 5 L10.5 3 L12 4" stroke-width="1"/>'
        // Muzzle
        + '<path d="M6 7 Q5 7.5 4.5 7 Q4 6.5 4.5 6" stroke-width="1"/>'
        // Eyes — glowing
        + '<circle cx="7" cy="6.5" r="0.6" fill="#c4953a" stroke="#c4953a" stroke-width="0.3"/>'
        + '<circle cx="9.5" cy="6" r="0.5" fill="#c4953a" stroke="#c4953a" stroke-width="0.3"/>'
        // Legs
        + '<path d="M9 15.5 L8 19 L7.5 20.5" stroke-width="1.3"/>'
        + '<path d="M11.5 16 L11 19 L10.5 20.5" stroke-width="1.2"/>'
        + '<path d="M14 15.5 L14.5 19 L15 20.5" stroke-width="1.2"/>'
        + '<path d="M16 14.5 L17 18 L17.5 20" stroke-width="1.1"/>'
        // Paws
        + '<path d="M7 20.5 L7.5 21 L8 20.5" stroke-width="0.7"/>'
        + '<path d="M10 20.5 L10.5 21 L11 20.5" stroke-width="0.7"/>'
        // Tail — bushy, upright
        + '<path d="M17.5 13 Q19 11 20 9 Q20.5 8 20 7" stroke-width="1.3"/>'
        + '<path d="M20 7 Q19.5 7.5 20 8.5" stroke-width="0.6" opacity="0.3"/>'
        // Teleport shimmer — afterimage ghost (shifted left)
        + '<path d="M4 12 Q3 10 4 8.5 Q5 7.5 6 8" stroke-width="0.7" opacity="0.2" stroke-dasharray="1.5 1"/>'
        + '<path d="M3 14 Q2.5 12 3.5 10" stroke-width="0.6" opacity="0.15" stroke-dasharray="1 1"/>'
        // Fey energy particles
        + '<circle cx="2.5" cy="9" r="0.4" fill="#c4953a" opacity="0.3"/>'
        + '<circle cx="3" cy="12" r="0.3" fill="#c4953a" opacity="0.25"/>'
        + '<circle cx="2" cy="14.5" r="0.35" fill="#c4953a" opacity="0.2"/>'
        + '<circle cx="21" cy="6" r="0.3" fill="#c4953a" opacity="0.25"/>'
        + '</svg>',

    // ── UNDEAD / MORTO-VIVO ───────────────────────────
    // Risen corpse: visible rib cage, exposed skull with
    // hollow eye sockets, tattered shroud/wrappings,
    // bony grasping hands, eerie glow in eyes
    '\u{1F9DF}': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
        // Skull — anatomical with hollow features
        + '<path d="M9 6.5 Q9 3 10.5 2 Q12 1.2 13.5 2 Q15 3 15 6.5 Q15 8 13 8.5 L11 8.5 Q9 8 9 6.5Z" stroke-width="1.2" fill="rgba(138,122,104,0.06)"/>'
        // Eye sockets — hollow, dark
        + '<ellipse cx="10.8" cy="5" rx="1" ry="1.2" fill="rgba(74,138,74,0.35)" stroke="currentColor" stroke-width="0.7"/>'
        + '<ellipse cx="13.2" cy="5" rx="1" ry="1.2" fill="rgba(74,138,74,0.35)" stroke="currentColor" stroke-width="0.7"/>'
        // Eerie glow in eyes
        + '<circle cx="10.8" cy="5" r="0.35" fill="#4a8a4a" opacity="0.6"/>'
        + '<circle cx="13.2" cy="5" r="0.35" fill="#4a8a4a" opacity="0.6"/>'
        // Nasal cavity
        + '<path d="M11.5 6.2 L12 7 L12.5 6.2" stroke-width="0.6" fill="rgba(42,36,32,0.3)"/>'
        // Jaw — skeletal teeth line
        + '<path d="M10 8 Q12 9 14 8" stroke-width="0.7"/>'
        + '<path d="M10.5 8 L10.5 8.5" stroke-width="0.4" opacity="0.5"/>'
        + '<path d="M11.5 8.2 L11.5 8.7" stroke-width="0.4" opacity="0.5"/>'
        + '<path d="M12.5 8.2 L12.5 8.7" stroke-width="0.4" opacity="0.5"/>'
        + '<path d="M13.5 8 L13.5 8.5" stroke-width="0.4" opacity="0.5"/>'
        // Spine / torso — visible ribs
        + '<path d="M12 9 L12 17" stroke-width="1.2" opacity="0.6"/>'
        // Rib cage
        + '<path d="M12 10 Q9 10.5 8 11.5" stroke-width="0.8" opacity="0.5"/>'
        + '<path d="M12 10 Q15 10.5 16 11.5" stroke-width="0.8" opacity="0.5"/>'
        + '<path d="M12 11.5 Q9.5 12 8.5 13" stroke-width="0.7" opacity="0.4"/>'
        + '<path d="M12 11.5 Q14.5 12 15.5 13" stroke-width="0.7" opacity="0.4"/>'
        + '<path d="M12 13 Q10 13.5 9 14" stroke-width="0.6" opacity="0.35"/>'
        + '<path d="M12 13 Q14 13.5 15 14" stroke-width="0.6" opacity="0.35"/>'
        // Arms — bony, grasping
        + '<path d="M8 11.5 Q6 13 5 15 Q4.5 16 4 16.5" stroke-width="1.2"/>'
        + '<path d="M4 16.5 L3 16 L3.5 17.5 L4.5 17" stroke-width="0.7"/>'
        + '<path d="M16 11.5 Q18 13 19 14.5 Q19.5 15.5 20 16" stroke-width="1.2"/>'
        + '<path d="M20 16 L21 15.5 L20.5 17 L19.5 16.5" stroke-width="0.7"/>'
        // Legs — skeletal
        + '<path d="M11 17 Q10 19 9 21 L8 22.5" stroke-width="1.2"/>'
        + '<path d="M13 17 Q14 19 15 21 L16 22.5" stroke-width="1.2"/>'
        // Feet bones
        + '<path d="M8 22.5 L7 23" stroke-width="0.8"/>'
        + '<path d="M16 22.5 L17 23" stroke-width="0.8"/>'
        // Tattered shroud — wispy cloth
        + '<path d="M9 9 Q7 10 6.5 12 Q6 13 7 14" stroke-width="0.6" opacity="0.25" stroke-dasharray="2 1.5"/>'
        + '<path d="M15 9 Q17 10 17.5 12 Q18 13.5 17 15" stroke-width="0.6" opacity="0.25" stroke-dasharray="2 1.5"/>'
        + '<path d="M10 17 Q9 18 8.5 20" stroke-width="0.5" opacity="0.2" stroke-dasharray="1.5 1.5"/>'
        + '<path d="M14 17 Q15 18 15.5 20" stroke-width="0.5" opacity="0.2" stroke-dasharray="1.5 1.5"/>'
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

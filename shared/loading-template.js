/**
 * ValdoriaLoadingTemplate v1.1 — Single source of truth for loading overlay HTML
 *
 * Eliminates ~100 lines of duplicated HTML across 10+ WebApps.
 * Each WebApp calls: document.write(ValdoriaLoadingHTML({ ... }));
 *
 * Options:
 *   overlayId    — DOM id for the overlay (default: 'loading')
 *   title        — Title text (default: 'LENDAS DE VALDORIA')
 *   particleSet  — 'full' (21), 'standard' (15), 'lite' (9)  (default: 'standard')
 *   progressId   — DOM id for progress bar fill (default: 'loading-progress')
 *   stageId      — DOM id for stage text (default: 'loading-stage')
 *   tipId        — DOM id for tip text (default: 'loading-tip')
 *   retryId      — DOM id for retry button (default: 'loading-retry')
 *   defaultTip   — Initial tip text (default: 'Preparando sua aventura...')
 *   hasRetry     — Include retry button in HTML (default: true)
 *   hasStage     — Include stage text element (default: true)
 *   icon         — 'magic-circle' (default), 'backpack', or 'emoji'
 *   iconEmoji    — Emoji character when icon='emoji' (default: '◆')
 */
window.ValdoriaLoadingHTML = function(opts) {
    'use strict';
    opts = opts || {};

    var id = opts.overlayId || 'loading';
    var title = opts.title || 'LENDAS DE VALDORIA';
    var pSet = opts.particleSet || 'standard';
    var progressId = opts.progressId || 'loading-progress';
    var stageId = opts.stageId || 'loading-stage';
    var tipId = opts.tipId || 'loading-tip';
    var retryId = opts.retryId || 'loading-retry';
    var defaultTip = opts.defaultTip || 'Preparando sua aventura...';
    var hasRetry = opts.hasRetry !== false;
    var hasStage = opts.hasStage !== false;
    var icon = opts.icon || 'magic-circle';
    var iconEmoji = opts.iconEmoji || '◆';

    // ── Icon content ──
    var iconHTML = '';

    if (icon === 'backpack') {
        // Backpack SVG (same as inventory/guild loading)
        iconHTML = '<div class="backpack-anim">'
          + '<div class="bp-glow"></div>'
          + '<svg class="bp-icon" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">'
          + '<path d="M35 10 Q35 2 50 2 Q65 2 65 10" stroke="rgba(196,149,58,0.5)" stroke-width="2" fill="none"/>'
          + '<rect x="20" y="25" width="60" height="70" rx="8" fill="rgba(80,50,25,0.6)" stroke="rgba(196,149,58,0.4)" stroke-width="1.5"/>'
          + '<path class="bp-flap" d="M20 40 Q20 25 50 20 Q80 25 80 40" fill="rgba(100,60,30,0.7)" stroke="rgba(196,149,58,0.5)" stroke-width="1.5"/>'
          + '<rect x="44" y="42" width="12" height="8" rx="2" fill="rgba(196,149,58,0.3)" stroke="rgba(196,149,58,0.5)" stroke-width="1"/>'
          + '<rect x="32" y="60" width="36" height="20" rx="4" fill="rgba(60,40,20,0.5)" stroke="rgba(196,149,58,0.2)" stroke-width="1"/>'
          + '<circle class="bp-sparkle s1" cx="40" cy="30" r="2" fill="rgba(196,149,58,0.8)"/>'
          + '<circle class="bp-sparkle s2" cx="60" cy="28" r="1.5" fill="rgba(196,149,58,0.6)"/>'
          + '<circle class="bp-sparkle s3" cx="50" cy="22" r="2.5" fill="rgba(196,149,58,0.7)"/>'
          + '<circle class="bp-sparkle s4" cx="35" cy="25" r="1" fill="rgba(255,220,120,0.8)"/>'
          + '<circle class="bp-sparkle s5" cx="65" cy="24" r="1.5" fill="rgba(255,220,120,0.6)"/>'
          + '</svg>'
          + '</div>';
    } else if (icon === 'emoji') {
        // Simple emoji icon
        iconHTML = '<div class="loading-content">'
          + '<div class="loading-icon">' + iconEmoji + '</div>'
          + '</div>';
    } else {
        // ── Magic circle (default) — particles + rune circles + gem ──

        // ── Particle sets ──
        // Full (21): Game Hub — all particle types at max count
        // Standard (15): Most WebApps — good visual with less DOM
        // Lite (9): Lightweight WebApps — minimal particles
        var particles = '';
        var i;

        // Embers (gold sparks rising)
        var emberCount = pSet === 'full' ? 6 : pSet === 'standard' ? 4 : 3;
        for (i = 1; i <= emberCount; i++) particles += '<div class="particle ember p' + i + '"></div>';

        // Sparks (white sparkles)
        var sparkCount = pSet === 'full' ? 4 : pSet === 'standard' ? 3 : 2;
        for (i = 1; i <= sparkCount; i++) particles += '<div class="particle spark s' + i + '"></div>';

        // Motes (crimson drift)
        var moteCount = pSet === 'full' ? 2 : pSet === 'standard' ? 2 : 1;
        for (i = 1; i <= moteCount; i++) particles += '<div class="particle mote m' + i + '"></div>';

        // Elemental particles (only in full and standard sets)
        if (pSet === 'full' || pSet === 'standard') {
            var flameCount = pSet === 'full' ? 3 : 2;
            for (i = 1; i <= flameCount; i++) particles += '<div class="particle flame fl' + i + '"></div>';

            var frostCount = pSet === 'full' ? 3 : 1;
            for (i = 1; i <= frostCount; i++) particles += '<div class="particle frost fr' + i + '"></div>';

            var lightningCount = pSet === 'full' ? 2 : 1;
            for (i = 1; i <= lightningCount; i++) particles += '<div class="particle lightning lt' + i + '"></div>';
        }

        // Arcane (purple orbs) — present in all sets
        var arcaneCount = pSet === 'full' ? 3 : 2;
        for (i = 1; i <= arcaneCount; i++) particles += '<div class="particle arcane ar' + i + '"></div>';

        // ── Rune characters (Elder Futhark) ──
        var runes = '\u16A0 \u16A2 \u16A6 \u16A8 \u16B1 \u16B2 \u16B7 \u16B9 \u16BA \u16BE \u16C1 \u16C3 \u16C7 \u16C8 \u16C9 \u16CA \u16CF \u16D2 \u16D6 \u16D8 \u16DA \u16DC \u16DD \u16DF';

        iconHTML = '<div class="loading-particles">' + particles + '</div>'
          + '<div class="magic-circle">'
          + '<div class="mc-aura"></div><div class="mc-aura mc-aura-2"></div>'
          // Outer rune ring
          + '<svg class="mc-ring mc-outer" viewBox="0 0 300 300">'
          + '<defs><path id="runeOuter" d="M150,150 m-125,0 a125,125 0 1,1 250,0 a125,125 0 1,1 -250,0"/></defs>'
          + '<circle cx="150" cy="150" r="125" fill="none" stroke="rgba(196,149,58,0.06)" stroke-width="1"/>'
          + '<circle cx="150" cy="150" r="127" fill="none" stroke="rgba(196,149,58,0.04)" stroke-width="0.5" stroke-dasharray="4 8"/>'
          + '<text class="mc-rune-text" fill="rgba(196,149,58,0.5)"><textPath href="#runeOuter" startOffset="0%">' + runes + '</textPath></text>'
          + '</svg>'
          // Mid energy ring
          + '<svg class="mc-ring mc-mid" viewBox="0 0 300 300">'
          + '<circle cx="150" cy="150" r="102" fill="none" stroke="rgba(196,149,58,0.05)" stroke-width="0.5"/>'
          + '<circle class="mc-energy-arc mc-arc-1" cx="150" cy="150" r="102" fill="none" stroke="rgba(196,149,58,0.6)" stroke-width="1.5" stroke-linecap="round"/>'
          + '<circle class="mc-energy-arc mc-arc-2" cx="150" cy="150" r="96" fill="none" stroke="rgba(123,32,32,0.5)" stroke-width="1.5" stroke-linecap="round"/>'
          + '<g opacity="0.3" fill="none" stroke="rgba(196,149,58,0.6)" stroke-width="1">'
          + '<line x1="150" y1="44" x2="150" y2="54"/><line x1="150" y1="246" x2="150" y2="256"/>'
          + '<line x1="44" y1="150" x2="54" y2="150"/><line x1="246" y1="150" x2="256" y2="150"/>'
          + '<line x1="78" y1="78" x2="85" y2="85" opacity="0.5"/><line x1="222" y1="78" x2="215" y2="85" opacity="0.5"/>'
          + '<line x1="78" y1="222" x2="85" y2="215" opacity="0.5"/><line x1="222" y1="222" x2="215" y2="215" opacity="0.5"/>'
          + '</g></svg>'
          // Inner text ring
          + '<svg class="mc-ring mc-inner" viewBox="0 0 300 300">'
          + '<defs><path id="runeInner" d="M150,150 m-75,0 a75,75 0 1,1 150,0 a75,75 0 1,1 -150,0"/></defs>'
          + '<circle cx="150" cy="150" r="75" fill="none" stroke="rgba(196,149,58,0.06)" stroke-width="0.5"/>'
          + '<text class="mc-inner-text" fill="rgba(196,149,58,0.35)"><textPath href="#runeInner" startOffset="0%">\u25C6 VALDORIA \u25C6 LENDAS \u25C6 VALDORIA \u25C6 LENDAS </textPath></text>'
          + '</svg>'
          // Gem (central interactive element)
          + '<div class="mc-gem" id="mc-gem"><div class="mc-gem-flare"></div><div class="mc-gem-core">◆</div></div>'
          // Pulses
          + '<div class="mc-pulse"></div><div class="mc-pulse mc-pulse-2"></div>'
          + '<div class="mc-completion-wave"></div><div class="mc-completion-wave wave-2"></div>'
          + '</div>'; // .magic-circle
    } // end icon conditional

    // ── Build HTML ──
    var h = '<div id="' + id + '" class="loading-overlay" style="display:none;background:#1a1510" aria-busy="true">'
      + iconHTML;

    // Flash (only for magic-circle)
    if (icon === 'magic-circle') h += '<div class="loading-flash"></div>';

    // Brand
    h += '<div class="loading-brand"><div class="loading-title">' + title + '</div>'
      + '<div class="loading-divider"><span class="divider-rune">◆</span></div></div>'
      // Progress bar
      + '<div class="loading-progress-wrap"><div class="loading-progress-track">'
      + '<div id="' + progressId + '" class="loading-progress-fill"></div>'
      + '</div></div>';

    if (hasStage) h += '<div id="' + stageId + '" class="loading-stage"></div>';
    if (hasRetry) h += '<button id="' + retryId + '" class="loading-retry" style="display:none">Tentar novamente</button>';

    h += '<div class="loading-tip-area"><div id="' + tipId + '" class="loading-tip" role="status" aria-live="polite">' + defaultTip + '</div></div>';
    h += '</div>';

    return h;
};

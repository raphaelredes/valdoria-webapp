// ═══════════════════════════════════════════════════════════
//  Loading Overlay — Shared Component v1
//  Generates the magic summoning circle + particles + progress
//  Usage: ValdoriaLoading.inject({ id, title, particles, tip })
// ═══════════════════════════════════════════════════════════

var ValdoriaLoading = (function() {
    'use strict';

    var RUNES = '\u16A0 \u16A2 \u16A6 \u16A8 \u16B1 \u16B2 \u16B7 \u16B9 \u16BA \u16BE \u16C1 \u16C3 \u16C7 \u16C8 \u16C9 \u16CA \u16CF \u16D2 \u16D6 \u16D8 \u16DA \u16DC \u16DD \u16DF';

    // Particle configs: [className, count]
    var PARTICLES_FULL = [
        ['ember', 6], ['spark', 4], ['mote', 2],
        ['flame', 3], ['frost', 3], ['lightning', 2], ['arcane', 3]
    ];
    var PARTICLES_COMPACT = [
        ['ember', 4], ['spark', 2], ['mote', 1], ['flame', 1]
    ];

    function buildParticles(mode) {
        var list = mode === 'compact' ? PARTICLES_COMPACT : PARTICLES_FULL;
        var html = '<div class="loading-particles">';
        for (var i = 0; i < list.length; i++) {
            var cls = list[i][0], count = list[i][1];
            for (var j = 1; j <= count; j++) {
                html += '<div class="particle ' + cls + ' ' + cls.charAt(0) + j + '"></div>';
            }
        }
        html += '</div>';
        return html;
    }

    function buildMagicCircle(innerText) {
        return '' +
            '<div class="magic-circle">' +
                '<div class="mc-aura"></div>' +
                '<div class="mc-aura mc-aura-2"></div>' +
                '<svg class="mc-ring mc-outer" viewBox="0 0 300 300">' +
                    '<defs><path id="runeOuter" d="M150,150 m-125,0 a125,125 0 1,1 250,0 a125,125 0 1,1 -250,0"/></defs>' +
                    '<circle cx="150" cy="150" r="125" fill="none" stroke="rgba(196,149,58,0.06)" stroke-width="1"/>' +
                    '<circle cx="150" cy="150" r="127" fill="none" stroke="rgba(196,149,58,0.04)" stroke-width="0.5" stroke-dasharray="4 8"/>' +
                    '<text class="mc-rune-text" fill="rgba(196,149,58,0.5)"><textPath href="#runeOuter" startOffset="0%">' + RUNES + '</textPath></text>' +
                '</svg>' +
                '<svg class="mc-ring mc-mid" viewBox="0 0 300 300">' +
                    '<circle cx="150" cy="150" r="102" fill="none" stroke="rgba(196,149,58,0.05)" stroke-width="0.5"/>' +
                    '<circle class="mc-energy-arc mc-arc-1" cx="150" cy="150" r="102" fill="none" stroke="rgba(196,149,58,0.6)" stroke-width="1.5" stroke-linecap="round"/>' +
                    '<circle class="mc-energy-arc mc-arc-2" cx="150" cy="150" r="96" fill="none" stroke="rgba(123,32,32,0.5)" stroke-width="1.5" stroke-linecap="round"/>' +
                    '<g opacity="0.3" fill="none" stroke="rgba(196,149,58,0.6)" stroke-width="1">' +
                        '<line x1="150" y1="44" x2="150" y2="54"/><line x1="150" y1="246" x2="150" y2="256"/>' +
                        '<line x1="44" y1="150" x2="54" y2="150"/><line x1="246" y1="150" x2="256" y2="150"/>' +
                        '<line x1="78" y1="78" x2="85" y2="85" opacity="0.5"/><line x1="222" y1="78" x2="215" y2="85" opacity="0.5"/>' +
                        '<line x1="78" y1="222" x2="85" y2="215" opacity="0.5"/><line x1="222" y1="222" x2="215" y2="215" opacity="0.5"/>' +
                    '</g>' +
                '</svg>' +
                '<svg class="mc-ring mc-inner" viewBox="0 0 300 300">' +
                    '<defs><path id="runeInner" d="M150,150 m-75,0 a75,75 0 1,1 150,0 a75,75 0 1,1 -150,0"/></defs>' +
                    '<circle cx="150" cy="150" r="75" fill="none" stroke="rgba(196,149,58,0.06)" stroke-width="0.5"/>' +
                    '<text class="mc-inner-text" fill="rgba(196,149,58,0.35)"><textPath href="#runeInner" startOffset="0%">' +
                        '\u25C6 ' + innerText + ' \u25C6 LENDAS \u25C6 ' + innerText + ' \u25C6 LENDAS ' +
                    '</textPath></text>' +
                '</svg>' +
                '<div class="mc-pulse"></div><div class="mc-pulse mc-pulse-2"></div>' +
                '<div id="mc-gem" class="mc-gem"><div class="mc-gem-core"></div><div class="mc-gem-flare"></div></div>' +
                '<div class="mc-completion-wave"></div><div class="mc-completion-wave wave-2"></div>' +
            '</div>';
    }

    function buildBrand(title) {
        return '<div class="loading-brand">' +
            '<div class="loading-title">' + title + '</div>' +
            '<div class="loading-divider"><span class="divider-rune">\u25C6</span></div>' +
        '</div>';
    }

    function buildProgress() {
        return '<div class="loading-progress-wrap">' +
            '<div class="loading-progress-track">' +
                '<div id="loading-progress" class="loading-progress-fill"></div>' +
            '</div>' +
        '</div>';
    }

    function buildTip(defaultText) {
        return '<div class="loading-tip-area">' +
            '<div id="loading-tip" class="loading-tip">' + (defaultText || 'Preparando sua aventura...') + '</div>' +
        '</div>';
    }

    /**
     * Inject the loading overlay into the DOM.
     * @param {Object} config
     * @param {string} config.id - Element ID (default: 'loading')
     * @param {string} config.title - Brand title (default: 'LENDAS DE VALDORIA')
     * @param {string} config.innerText - Inner ring text (default: 'VALDORIA')
     * @param {string} config.particles - 'full' (23) or 'compact' (8) (default: 'full')
     * @param {string} config.tip - Default tip text
     * @param {string} config.insertBefore - CSS selector to insert before (default: first child of body)
     */
    function inject(config) {
        config = config || {};
        var id = config.id || 'loading';
        var title = config.title || 'LENDAS DE VALDORIA';
        var innerText = config.innerText || 'VALDORIA';
        var particles = config.particles || 'full';
        var tip = config.tip || 'Preparando sua aventura...';

        var html = '<div id="' + id + '" class="loading-overlay">' +
            buildParticles(particles) +
            buildMagicCircle(innerText) +
            '<div class="loading-flash"></div>' +
            buildBrand(title) +
            buildProgress() +
            buildTip(tip) +
        '</div>';

        var container = document.createElement('div');
        container.innerHTML = html;
        var overlay = container.firstChild;

        if (config.insertBefore) {
            var ref = document.querySelector(config.insertBefore);
            if (ref) {
                ref.parentNode.insertBefore(overlay, ref);
                return overlay;
            }
        }

        document.body.insertBefore(overlay, document.body.firstChild);
        return overlay;
    }

    return { inject: inject };
})();

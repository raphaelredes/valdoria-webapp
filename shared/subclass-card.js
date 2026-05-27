/* PADRAO_SUBCLASSE — canonical helper for subclass-choice screens
 *
 * Usage:
 *   vSubclass.renderGrid(container, items, {
 *       onClick: function(id) { ... }  // opens detail; receives clicked card id
 *   });
 *
 *   vSubclass.openDetail({
 *       id:         'champion',
 *       name:       'Campeão',
 *       imgSrc:     '/shared/img/levelup/subclasses/champion.webp',
 *       desc:       'Mestre da perfeição física em combate.',
 *       features:   [{ level: 3, name: 'Critical Improvido', desc: 'Critica em 19-20.' }, ...],
 *       confirmLabel: 'Escolher Campeão',
 *       onConfirm:  function(id) { ... }  // close + apply selection
 *   });
 *
 * `items` shape (renderGrid):
 *   [{ id, name, imgSrc, selected?: bool }]
 *
 * Cards are ALWAYS rendered 2-col with image + name only.
 * Description and features ONLY appear in the modal detail.
 *
 * See CLAUDE.md "PADRAO_SUBCLASSE" MANDATORY RULE.
 */
(function () {
    'use strict';

    var IMG_BASE = '/shared/img/levelup/subclasses/';

    function _haptic(kind) {
        if (typeof haptic === 'function') haptic(kind || 'light');
    }

    function renderGrid(container, items, opts) {
        if (!container || !Array.isArray(items)) return;
        opts = opts || {};
        var html = '<div class="v-subclass-grid">';
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            if (!it || !it.id) continue;
            var src = it.imgSrc || (IMG_BASE + it.id + '.webp');
            var sel = it.selected ? ' selected' : '';
            html += '<div class="v-subclass-card' + sel + '" data-sc-id="' + it.id + '">';
            html += '<img class="v-subclass-img" src="' + src + '" alt="' + (it.name || it.id) + '" loading="lazy">';
            html += '<div class="v-subclass-name">' + (it.name || it.id) + '</div>';
            html += '</div>';
        }
        html += '</div>';
        container.innerHTML = html;
        if (typeof opts.onClick === 'function') {
            var cards = container.querySelectorAll('.v-subclass-card');
            for (var j = 0; j < cards.length; j++) {
                (function (card) {
                    card.addEventListener('click', function () {
                        _haptic('light');
                        opts.onClick(card.getAttribute('data-sc-id'));
                    });
                })(cards[j]);
            }
        }
    }

    function _buildDetailBody(opts) {
        var src = opts.imgSrc || (IMG_BASE + opts.id + '.webp');
        var html = '<div class="v-subclass-detail-body">';
        html += '<img class="v-subclass-detail-hero" src="' + src + '" alt="' + (opts.name || '') + '">';
        if (opts.desc) {
            html += '<div class="v-subclass-detail-desc">' + opts.desc + '</div>';
        }
        if (Array.isArray(opts.features) && opts.features.length > 0) {
            html += '<div class="v-subclass-detail-features">';
            for (var i = 0; i < opts.features.length; i++) {
                var f = opts.features[i];
                if (!f) continue;
                html += '<div class="v-subclass-feature">';
                html += '<div class="v-subclass-feature-level">Nível ' + (f.level || '?') + '</div>';
                if (f.name) html += '<div class="v-subclass-feature-name">' + f.name + '</div>';
                if (f.desc) html += '<div class="v-subclass-feature-desc">' + f.desc + '</div>';
                html += '</div>';
            }
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    function openDetail(opts) {
        if (!opts || !opts.id) return;
        if (typeof window.vPopup === 'undefined' || !window.vPopup.show) {
            console.warn('[vSubclass] vPopup not available — cannot open detail');
            return;
        }
        var confirmLabel = opts.confirmLabel || 'Selecionar';
        var header = '<div style="font-size:var(--v-font-lg,16px);font-weight:700;color:var(--v-gold,#c4953a);text-align:center">' +
                     (opts.name || opts.id) + '</div>';
        window.vPopup.show({
            header: header,
            body: _buildDetailBody(opts),
            actions: [
                { label: confirmLabel, action: 'sc-confirm', cls: 'v-popup-btn v-popup-btn-primary' },
                { label: 'Voltar', action: 'cancel', cls: 'v-popup-btn' }
            ],
            onAction: function (action) {
                if (action === 'sc-confirm') {
                    window.vPopup.hide();
                    if (typeof opts.onConfirm === 'function') {
                        setTimeout(function () { opts.onConfirm(opts.id); }, 150);
                    }
                    return true;
                }
                return false;
            }
        });
    }

    window.vSubclass = {
        renderGrid: renderGrid,
        openDetail: openDetail,
        IMG_BASE: IMG_BASE
    };
})();

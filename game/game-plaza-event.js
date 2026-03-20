/* game-plaza-event.js — Popup imersivo para eventos da Praça Central */
(function() {
'use strict';

function _esc(t) {
    return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

window.showPlazaEventPopup = function(data) {
    if (typeof vPopup === 'undefined') return;
    if (data.phase === 'choices') _showChoices(data);
    else if (data.phase === 'result') _showResult(data);
    else if (data.phase === 'entry') _showEntry(data);
    else if (data.phase === 'cooldown') _showCooldown(data);
};

/* ── Phase: choices (investigation event with skill checks) ── */
function _showChoices(data) {
    var bodyHtml = '<div style="font-size:var(--v-font-body);color:var(--v-text);line-height:1.6;'
        + 'font-style:italic;padding:var(--v-space-sm) 0;">'
        + _esc(data.desc) + '</div>';

    var actionsHtml = '';
    for (var i = 0; i < data.choices.length; i++) {
        var c = data.choices[i];
        var label = _esc(c.label);
        if (c.stat_hint) {
            label += ' <span style="color:var(--v-text-dim);font-size:var(--v-font-sm);">('
                   + _esc(c.stat_hint) + ')</span>';
        }
        actionsHtml += '<button class="v-popup-btn" data-action="' + c.cb + '">'
                     + label + '</button>';
    }
    actionsHtml += '<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">'
                 + '\ud83d\udd19 Voltar \u00e0 Pra\u00e7a</button>';

    vPopup.show({
        id: 'plaza-event-overlay',
        header: data.title || '\ud83d\udd0d Investiga\u00e7\u00e3o',
        body: bodyHtml,
        actions: actionsHtml,
    });
}

/* ── Phase: result (after choosing — with rewards) ── */
function _showResult(data) {
    var bodyHtml = '';
    if (data.narrative) {
        bodyHtml += '<div style="font-size:var(--v-font-body);color:var(--v-text);line-height:1.6;'
            + 'font-style:italic;padding:var(--v-space-sm) 0;">'
            + _esc(data.narrative) + '</div>';
    }

    bodyHtml += _renderRewards(data.rewards);

    var actionsHtml = '<div class="v-popup-btn-row">'
        + '<button class="v-popup-btn" data-action="square_investigate">\ud83d\udd0e Investigar Novamente</button>'
        + '<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">\ud83d\udd19 Fechar</button>'
        + '</div>';

    vPopup.show({
        id: 'plaza-event-overlay',
        header: data.title || 'Resultado',
        headerClass: data.success ? 'v-popup-header--success' : 'v-popup-header--warning',
        body: bodyHtml,
        actions: actionsHtml,
    });
}

/* ── Phase: entry (passive event on square entry — no choices) ── */
function _showEntry(data) {
    var bodyHtml = '';
    if (data.narrative) {
        bodyHtml += '<div style="font-size:var(--v-font-body);color:var(--v-text);line-height:1.6;'
            + 'font-style:italic;padding:var(--v-space-sm) 0;text-align:center;">'
            + _esc(data.narrative) + '</div>';
    }

    bodyHtml += _renderRewards(data.rewards);

    var actionsHtml = '<button class="v-popup-btn" data-action="cancel">'
        + '\u27a1\ufe0f Continuar</button>';

    vPopup.show({
        id: 'plaza-event-overlay',
        header: data.title || 'Acontecimento',
        body: bodyHtml,
        actions: actionsHtml,
    });
}

/* ── Phase: cooldown ── */
function _showCooldown(data) {
    vPopup.show({
        id: 'plaza-event-overlay',
        header: '\ud83d\udd0d Investiga\u00e7\u00e3o',
        headerClass: 'v-popup-header--warning',
        body: '<div style="text-align:center;padding:var(--v-space-md);color:var(--v-text);'
            + 'font-size:var(--v-font-body);line-height:1.6;">'
            + _esc(data.message) + '</div>',
        actions: '<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">'
               + '\ud83d\udd19 Voltar \u00e0 Pra\u00e7a</button>',
    });
}

/* ── Shared: render rewards card ── */
function _renderRewards(rewards) {
    if (!rewards || rewards.length === 0) return '';
    var html = '<div style="margin-top:var(--v-space-sm);padding:var(--v-space-sm) var(--v-space-md);'
        + 'background:rgba(196,149,58,0.08);border-radius:var(--v-radius-sm);'
        + 'border:1px solid rgba(196,149,58,0.15);">';
    for (var i = 0; i < rewards.length; i++) {
        var r = rewards[i];
        html += '<div style="font-size:var(--v-font-sm);color:var(--v-text);padding:2px 0;">'
              + r.emoji + ' <b>' + _esc(r.text) + '</b></div>';
    }
    html += '</div>';
    return html;
}

})();

/* game-daily-challenge.js -- Rich daily challenge popup renderer */
(function() {
'use strict';

function _row(label, value, valueClass) {
    var row = document.createElement('div');
    row.className = 'v-popup-row';
    var lbl = document.createElement('span');
    lbl.className = 'v-popup-label';
    lbl.textContent = label;
    row.appendChild(lbl);
    var val = document.createElement('span');
    val.className = 'v-popup-value' + (valueClass ? ' ' + valueClass : '');
    val.textContent = value;
    row.appendChild(val);
    return row;
}

function _divider() {
    var el = document.createElement('div');
    el.className = 'v-popup-divider';
    return el;
}

function _section(text) {
    var el = document.createElement('div');
    el.className = 'v-popup-section-label';
    el.textContent = text;
    return el;
}

function _tip(text) {
    var el = document.createElement('div');
    el.className = 'v-popup-tip';
    el.textContent = text;
    return el;
}

function _highlight(text) {
    var el = document.createElement('div');
    el.className = 'v-popup-highlight';
    el.textContent = text;
    return el;
}

function _centerText(text) {
    var el = document.createElement('div');
    el.className = 'v-popup-center-text';
    el.textContent = text;
    return el;
}

function _buildAvailable(body, d, t) {
    var desc = document.createElement('div');
    desc.className = 'v-popup-desc';
    desc.textContent = t.subtitle || '';
    body.appendChild(desc);

    body.appendChild(_highlight(d.dungeon_name || ''));

    if (d.theme_label) {
        var themeRow = document.createElement('div');
        themeRow.className = 'v-popup-row';
        var dot = document.createElement('span');
        dot.className = 'v-popup-dot';
        dot.style.background = d.theme_color || '#8B7355';
        dot.style.boxShadow = '0 0 4px ' + (d.theme_color || '#8B7355');
        themeRow.appendChild(dot);
        var themeLbl = document.createElement('span');
        themeLbl.className = 'v-popup-label';
        themeLbl.textContent = (t.theme_label || 'Tipo') + ': ' + d.theme_label;
        themeLbl.style.marginLeft = '6px';
        themeRow.appendChild(themeLbl);
        body.appendChild(themeRow);
    }

    body.appendChild(_divider());

    body.appendChild(_section(t.rewards_section || 'Recompensas Estimadas'));
    body.appendChild(_row('✨ ' + (t.xp_label || 'XP'), '~' + (d.xp_est || 0)));
    body.appendChild(_row('💰 ' + (t.gold_label || 'GP'), '~' + (d.gold_est || 0) + ' GP'));

    body.appendChild(_divider());

    body.appendChild(_section(t.bonus_section || 'Bônus por Desempenho'));
    body.appendChild(_tip('❤️ ' + (t.bonus_hp_high || 'HP > 75%: +50% recompensas')));
    body.appendChild(_tip('🩹 ' + (t.bonus_hp_mid || 'HP > 50%: +25% recompensas')));
}

function _buildCompleted(body, d, t) {
    body.appendChild(_highlight(d.theme_icon || '🏰'));
    body.appendChild(_centerText(d.dungeon_name || ''));
    body.appendChild(_divider());

    body.appendChild(_section(t.completed_section_stats || 'Resultado'));
    body.appendChild(_row(t.completed_turns_label || 'Turnos', String(d.turns || '?')));
    body.appendChild(_row(t.completed_hp_label || 'HP Restante', String(d.hp_remaining || '?')));
    body.appendChild(_divider());

    body.appendChild(_row(t.completed_total_label || 'Total Completados', String(d.total_completed || 0), 'v-popup-gold'));
    body.appendChild(_tip(t.completed_return_msg || 'Volte amanhã para um novo desafio!'));
}

function _buildLocked(body, d, t) {
    body.appendChild(_highlight(d.theme_icon || '🏰'));

    var warn = document.createElement('div');
    warn.className = 'v-popup-warn-item';
    warn.textContent = t.level_too_low || 'Nível insuficiente para o desafio de hoje.';
    body.appendChild(warn);
    body.appendChild(_divider());

    body.appendChild(_row(t.level_required_label || 'Nível Mínimo', String(d.min_level || '?')));
    body.appendChild(_row(t.level_current_label || 'Seu Nível', String(d.player_level || '?')));
}

window._showDailyChallengePopup = function(data) {
    var d = data.daily_challenge;
    if (!d || typeof vPopup === 'undefined') return;

    var t = d.texts || {};
    var bodyEl = document.createElement('div');
    bodyEl.className = 'v-popup-body-inner';

    var header = '', headerClass = '', actionsHtml = '';

    if (d.state === 'completed') {
        _buildCompleted(bodyEl, d, t);
        header = '🏰 ' + vEsc(t.completed_title || 'Desafio Concluído!');
        headerClass = 'v-popup-header--success';
        actionsHtml = '<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">Fechar</button>';
    } else if (d.state === 'locked') {
        _buildLocked(bodyEl, d, t);
        header = '🏰 ' + vEsc(t.title || 'Desafio Diário');
        headerClass = 'v-popup-header--warning';
        actionsHtml = '<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">Fechar</button>';
    } else {
        _buildAvailable(bodyEl, d, t);
        header = (d.theme_icon || '🏰') + ' ' + vEsc(t.title || 'Desafio Diário');
        actionsHtml = '<button class="v-popup-btn v-popup-btn--primary" data-action="' +
            vEsc(d.start_cb || 'action_dungeon_enter') + '">' +
            vEsc(t.start_btn || '⚔️ Iniciar Desafio') + '</button>' +
            '<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">Fechar</button>';
    }

    vPopup.show({
        header: header,
        headerClass: headerClass,
        bodyEl: bodyEl,
        actions: actionsHtml,
        onAction: function(action) {
            if (action !== 'cancel' && typeof doAction === 'function') {
                doAction(action);
                return true;
            }
        }
    });

    if (typeof ValdoriaAudio !== 'undefined' && ValdoriaAudio.playSFX) ValdoriaAudio.playSFX('sfx_click');
};

})();

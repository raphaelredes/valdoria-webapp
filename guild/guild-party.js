/* guild-party.js -- Party (Grupo) tab */
(function(){
'use strict';

window.renderPartyTab = function() {
    var el = document.getElementById('guild-party-list');
    if (!el) return;
    var party = (G.data && G.data.party) || [];
    if (!party.length) {
        el.innerHTML = '<div class="guild-empty"><span class="guild-empty-icon">&#x1F6E1;</span>Seu grupo esta vazio.<br>Recrute aventureiros na aba Recrutar!</div>';
        return;
    }
    var html = '';
    for (var i = 0; i < party.length; i++) {
        var m = party[i];
        var tier = _approvalTier(m.approval || 0);
        var hpPct = m.hp_max ? Math.round((m.hp / m.hp_max) * 100) : 100;
        var hpCls = (typeof vBarHpClass === 'function') ? vBarHpClass(hpPct) : '';
        var hpColor = (typeof vBarHpColor === 'function') ? vBarHpColor(hpPct) : 'var(--v-gold)';
        html += '<div class="guild-card" onclick="showPartyMemberDetail(\'' + _esc(m.id) + '\')">';
        html += '<div class="guild-card-icon">' + (m.icon || '&#x2694;') + '</div>';
        html += '<div class="guild-card-info">';
        html += '<div class="guild-card-name">' + _esc(m.name) + '</div>';
        html += '<div class="guild-card-sub">' + _esc(m.class_name || '') + ' Nv.' + (m.level || 1);
        html += ' <span class="guild-approval-badge tier-' + tier.cls + '">' + tier.label + '</span></div>';
        html += '<div class="guild-card-hp">';
        html += '<div class="v-bar-track ' + hpCls + '"><div class="v-bar-fill" style="width:' + hpPct + '%;background:' + hpColor + '"></div></div>';
        html += '</div></div>';
        html += '<div class="guild-card-arrow">&#x25B8;</div></div>';
    }
    el.innerHTML = html;
};

window.showPartyMemberDetail = function(npcId) {
    guildAction('member_detail_' + npcId).then(function(resp) {
        if (!resp || resp.error) { showGuildError(resp && resp.msg || 'Erro ao carregar detalhes.'); return; }
        _renderMemberDetail(_mapNpc(resp));
    }).catch(function(e) { console.error('[GUILD]', e); });
};

function _renderMemberDetail(m) {
    var tier = _approvalTier(m.approval || 0);
    var hpPct = m.hp_max ? Math.round((m.hp / m.hp_max) * 100) : 100;
    var mpPct = m.mp_max ? Math.round((m.mp / m.mp_max) * 100) : 100;
    var hpColor = (typeof vBarHpColor === 'function') ? vBarHpColor(hpPct) : 'var(--v-gold)';

    var html = '';
    html += '<div class="guild-detail-header">';
    html += '<div class="guild-detail-icon">' + (m.icon || '&#x2694;') + '</div>';
    html += '<div class="guild-detail-name">' + _esc(m.name) + '</div>';
    html += '<div class="guild-detail-role">' + _esc(m.class_name || '') + ' - Nivel ' + (m.level || 1) + '</div></div>';

    html += '<div class="guild-detail-section"><div class="guild-detail-section-title">Vitalidade</div>';
    html += '<div style="margin-bottom:4px;font-size:var(--v-font-sm);color:var(--v-text-dim)">HP ' + (m.hp || 0) + '/' + (m.hp_max || 0) + '</div>';
    html += '<div class="v-bar-track"><div class="v-bar-fill" style="width:' + hpPct + '%;background:' + hpColor + '"></div></div>';
    if (m.mp_max) {
        html += '<div style="margin-top:6px;margin-bottom:4px;font-size:var(--v-font-sm);color:var(--v-text-dim)">MP ' + (m.mp || 0) + '/' + (m.mp_max || 0) + '</div>';
        html += '<div class="v-bar-track"><div class="v-bar-fill" style="width:' + mpPct + '%;background:var(--v-mp,#5577bb)"></div></div>';
    }
    html += '</div>';

    html += '<div class="guild-detail-section"><div class="guild-detail-section-title">Aprovacao</div>';
    html += '<span class="guild-approval-badge tier-' + tier.cls + '">' + tier.label + ' (' + (m.approval || 0) + ')</span>';
    html += '<div class="guild-approval-bar"><div class="guild-approval-fill" style="width:' + _approvalPct(m.approval) + '%;background:' + _approvalColor(tier.cls) + '"></div></div></div>';

    if (m.stats) {
        html += '<div class="guild-detail-section"><div class="guild-detail-section-title">Atributos</div>';
        html += '<div class="guild-stats-grid">';
        html += _statItem('FOR', m.stats.str || 10) + _statItem('DES', m.stats.dex || 10);
        html += _statItem('CON', m.stats.con || 10) + _statItem('INT', m.stats.int || 10);
        html += _statItem('SAB', m.stats.wis || 10) + _statItem('CAR', m.stats.cha || 10);
        html += '</div></div>';
    }

    if (m.slots && m.slots.length) {
        html += '<div class="guild-detail-section"><div class="guild-detail-section-title">Equipamento</div>';
        html += '<div class="guild-equip-grid">';
        for (var s = 0; s < m.slots.length; s++) {
            var sl = m.slots[s];
            var itemText = sl.item ? sl.item.n : 'Vazio';
            html += '<div class="guild-equip-slot"><span class="slot-label">' + (sl.emoji || '') + ' ' + _esc(sl.label) + '</span>' + _esc(itemText) + '</div>';
        }
        html += '</div></div>';
    }

    html += '<button class="guild-action-btn danger" onclick="_dismissMember(\'' + _esc(m.id) + '\',\'' + _esc(m.name) + '\')">Dispensar do Grupo</button>';
    showGuildDetail(html);
}

function _approvalColor(cls) {
    var map = { hostile: '#e05555', cold: '#d4935a', neutral: '#a09484', warm: '#7ab85a', loyal: '#5aa0d4', devoted: 'var(--v-gold)' };
    return map[cls] || 'var(--v-gold-dim)';
}

window._dismissMember = function(npcId, npcName) {
    if (typeof vPopup !== 'undefined') {
        vPopup.show({
            title: 'Dispensar Membro',
            body: 'Tem certeza que deseja dispensar <b>' + _esc(npcName) + '</b> do grupo?',
            confirm: 'Dispensar', cancel: 'Cancelar', danger: true,
            onConfirm: function() {
                guildAction('fire_' + npcId).then(function() { hideGuildDetail(); }).catch(function(e) { console.error('[GUILD]', e); });
            }
        });
    } else if (confirm('Dispensar ' + npcName + ' do grupo?')) {
        guildAction('fire_' + npcId).then(function() { hideGuildDetail(); }).catch(function(e) { console.error('[GUILD]', e); });
    }
};

})();

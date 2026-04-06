/* guild-recruit.js -- Recruit tab (fetches data per render) */
(function(){
'use strict';

var _recruitData = null;

window.renderRecruitTab = function() {
    guildAction('recruit_list', { page: G.page.recrutar || 0, filter: G.filter.recrutar || null }).then(function(resp) {
        if (!resp || resp.error) return;
        _recruitData = resp;
        _recruitData.items = _mapArray(resp.items || []);
        _renderRecruitList();
    }).catch(function(e) { console.error('[GUILD]', e); });
};

function _renderRecruitList() {
    var filtersEl = document.getElementById('guild-recruit-filters');
    var listEl = document.getElementById('guild-recruit-list');
    var pagEl = document.getElementById('guild-recruit-pagination');
    if (!filtersEl || !listEl || !_recruitData) return;

    var recruits = _recruitData.items || [];

    var classes = {};
    for (var i = 0; i < recruits.length; i++) {
        var cn = recruits[i].class_name || 'Outro';
        classes[cn] = (classes[cn] || 0) + 1;
    }
    var fHtml = '<button class="guild-filter-pill' + (!G.filter.recrutar ? ' active' : '') + '" onclick="_guildFilterRecruit(null)">Todos</button>';
    for (var cls in classes) {
        fHtml += '<button class="guild-filter-pill' + (G.filter.recrutar === cls ? ' active' : '') + '" onclick="_guildFilterRecruit(\'' + _esc(cls) + '\')">' + _esc(cls) + ' (' + classes[cls] + ')</button>';
    }
    filtersEl.innerHTML = fHtml;

    if (!recruits.length) {
        listEl.innerHTML = '<div class="guild-empty"><span class="guild-empty-icon">&#x1F4DC;</span>Nenhum aventureiro disponível.</div>';
        if (pagEl) pagEl.innerHTML = '';
        return;
    }

    var html = '';
    for (var j = 0; j < recruits.length; j++) {
        var r = recruits[j];
        html += '<div class="guild-card" onclick="showRecruitDetail(\'' + _esc(r.id) + '\')">';
        html += '<div class="guild-card-icon">' + (r.icon || '&#x1F9D1;') + '</div>';
        html += '<div class="guild-card-info">';
        html += '<div class="guild-card-name">' + _esc(r.name);
        if (r.hired) html += ' <span style="color:var(--v-gold-dim);font-size:var(--v-font-xs)">(no grupo)</span>';
        html += '</div>';
        html += '<div class="guild-card-sub">' + _esc(r.class_name || '') + ' Nv.' + (r.level || 1) + ' &middot; ' + (r.cost || 0) + ' 💰';
        if (r.rehire) html += ' <span style="color:var(--v-gold)">&#x267B; Recontratar</span>';
        html += '</div></div>';
        html += '<div class="guild-card-arrow">&#x25B8;</div></div>';
    }
    listEl.innerHTML = html;

    var page = _recruitData.page || 0;
    var pages = _recruitData.pages || 1;
    if (pagEl && pages > 1) {
        pagEl.innerHTML = '<button class="guild-page-btn" onclick="_guildRecruitPage(' + (page - 1) + ')"' + (page <= 0 ? ' disabled' : '') + '>&#x25C0;</button>'
            + '<span>' + (page + 1) + ' / ' + pages + '</span>'
            + '<button class="guild-page-btn" onclick="_guildRecruitPage(' + (page + 1) + ')"' + (page >= pages - 1 ? ' disabled' : '') + '>&#x25B6;</button>';
    } else if (pagEl) {
        pagEl.innerHTML = '';
    }
}

window._guildFilterRecruit = function(cls) {
    G.filter.recrutar = cls;
    G.page.recrutar = 0;
    renderRecruitTab();
};

window._guildRecruitPage = function(p) {
    G.page.recrutar = Math.max(0, p);
    renderRecruitTab();
};

window.showRecruitDetail = function(npcId) {
    var recruits = (_recruitData && _recruitData.items) || [];
    var r = null;
    for (var i = 0; i < recruits.length; i++) { if (recruits[i].id === npcId) { r = recruits[i]; break; } }
    if (!r) return;

    var html = '';
    html += '<div class="guild-detail-header">';
    html += '<div class="guild-detail-icon">' + (r.icon || '&#x1F9D1;') + '</div>';
    html += '<div class="guild-detail-name">' + _esc(r.name) + '</div>';
    html += '<div class="guild-detail-role">' + _esc(r.class_name || '') + ' - Nivel ' + (r.level || 1) + '</div></div>';

    html += '<div class="guild-detail-section"><div class="guild-detail-section-title">Custo de Recrutamento</div>';
    html += '<div style="font-size:var(--v-font-body);color:var(--v-gold)">' + (r.cost || 0) + ' 💰</div>';
    if (r.rehire) html += '<div style="font-size:var(--v-font-sm);color:var(--v-text-dim);margin-top:4px">Desconto por recontratacao</div>';
    html += '</div>';

    var gold = (G.data && G.data.gold) || 0;
    var canAfford = gold >= (r.cost || 0);
    var partyFull = (_recruitData.party_count || 0) >= (_recruitData.party_max || 3);
    var disabled = (!canAfford || partyFull || r.hired) ? ' disabled' : '';
    var reason = r.hired ? 'Ja no grupo' : (partyFull ? 'Grupo cheio (3/3)' : (!canAfford ? 'Ouro insuficiente' : ''));
    html += '<button class="guild-action-btn primary"' + disabled + ' onclick="_hireRecruit(\'' + _esc(r.id) + '\')">&#x1F4B0; Contratar (' + (r.cost || 0) + ' 💰)</button>';
    if (reason) html += '<div style="text-align:center;color:var(--v-text-dim);font-size:var(--v-font-sm);margin-top:var(--v-space-sm)">' + _esc(reason) + '</div>';

    showGuildDetail(html);
};

window._hireRecruit = function(npcId) {
    guildAction('hire_' + npcId).then(function(d) {
        if (d && d.ok) {
            hideGuildDetail();
            renderRecruitTab();
        }
    }).catch(function(e) { console.error('[GUILD]', e); });
};

})();

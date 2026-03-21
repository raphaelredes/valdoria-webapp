/* guild-quests.js -- Quest board tab */
(function(){
'use strict';

var _questData = null;

window.renderQuestsTab = function() {
    guildAction('quest_board').then(function(resp) {
        if (!resp || resp.error) return;
        _questData = resp;
        _renderQuestBoard();
    }).catch(function(e) { console.error('[GUILD]', e); });
};

function _renderQuestBoard() {
    var boardEl = document.getElementById('guild-quest-board');
    if (!boardEl || !_questData) return;

    var quests = _questData.quests || [];
    if (!quests.length) {
        boardEl.innerHTML = '<div class="guild-empty"><span class="guild-empty-icon">&#x1F4CB;</span>O quadro de missoes está vazio.<br>Volte mais tarde para novas oportunidades.</div>';
        return;
    }

    var html = '';
    if (_questData.daily_max) {
        html += '<div style="text-align:center;font-size:var(--v-font-sm);color:var(--v-text-dim);margin-bottom:var(--v-space-md)">Diarias: ' + (_questData.daily_done || 0) + '/' + _questData.daily_max + '</div>';
    }

    var catLabels = { daily: 'Diarias', side: 'Secundarias', story: 'Historia', guild: 'Da Guilda' };
    var groups = {};
    for (var i = 0; i < quests.length; i++) {
        var cat = quests[i].cat || 'guild';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(quests[i]);
    }

    var order = ['daily', 'guild', 'side', 'story'];
    for (var t = 0; t < order.length; t++) {
        var items = groups[order[t]];
        if (!items || !items.length) continue;
        html += '<div class="guild-quest-group-title">' + (catLabels[order[t]] || order[t]) + '</div>';
        for (var j = 0; j < items.length; j++) {
            var q = items[j];
            html += '<div class="guild-quest-card" onclick="showQuestDetail(\'' + _esc(q.id) + '\')">';
            html += '<div class="guild-quest-title">&#x1F4DC; ' + _esc(q.n) + '</div>';
            html += '<div class="guild-quest-meta">';
            var rw = q.rewards || {};
            if (rw.gold) html += rw.gold + ' GP';
            if (rw.xp) html += (rw.gold ? ' &middot; ' : '') + rw.xp + ' XP';
            if (q.diff) html += ' &middot; ' + _esc(q.diff);
            html += '</div></div>';
        }
    }
    boardEl.innerHTML = html;
}

window.showQuestDetail = function(qid) {
    var quests = (_questData && _questData.quests) || [];
    var q = null;
    for (var i = 0; i < quests.length; i++) { if (quests[i].id === qid) { q = quests[i]; break; } }
    if (!q) return;

    var html = '';
    html += '<div class="guild-detail-header">';
    html += '<div class="guild-detail-icon">&#x1F4DC;</div>';
    html += '<div class="guild-detail-name">' + _esc(q.n) + '</div>';
    html += '<div class="guild-detail-role">' + _esc(q.cat || 'Missao') + ' - Nv.' + (q.lvl || 1) + '</div></div>';

    if (q.desc) {
        html += '<div class="guild-detail-section"><div class="guild-detail-section-title">Descricao</div>';
        html += '<div style="font-size:var(--v-font-body);color:var(--v-text);line-height:1.6">' + _esc(q.desc) + '</div></div>';
    }

    var rw = q.rewards || {};
    html += '<div class="guild-detail-section"><div class="guild-detail-section-title">Recompensas</div>';
    html += '<div class="guild-stats-grid">';
    if (rw.gold) html += _statItem('Ouro', rw.gold + ' GP');
    if (rw.xp) html += _statItem('XP', rw.xp);
    if (rw.item) html += _statItem('Item', rw.item);
    html += '</div></div>';

    html += '<button class="guild-action-btn primary" onclick="_acceptQuest(\'' + _esc(q.id) + '\')">&#x2705; Aceitar Missao</button>';
    showGuildDetail(html);
};

window._acceptQuest = function(qid) {
    guildAction('quest_accept_' + qid).then(function(d) {
        if (d && d.ok) hideGuildDetail();
    }).catch(function(e) { console.error('[GUILD]', e); });
};

})();

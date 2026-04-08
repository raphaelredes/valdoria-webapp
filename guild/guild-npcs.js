/* guild-npcs.js -- NPCs tab (Braun & Tavira) */
(function(){
'use strict';

var _typewriterTimer = null;
var _braun = null;
var _tavira = null;

window.renderNpcsTab = function() {
    var el = document.getElementById('guild-npc-list');
    if (!el) return;

    var html = '';
    html += '<div class="guild-npc-card" onclick="_openBraun()">';
    html += '<div class="guild-npc-icon">&#x1F9D3;</div>';
    html += '<div class="guild-card-info"><div class="guild-npc-name">Braun</div><div class="guild-npc-role">Veterano da Guilda</div></div>';
    html += '<div class="guild-card-arrow">&#x25B8;</div></div>';

    html += '<div class="guild-npc-card" onclick="_openTavira()">';
    html += '<div class="guild-npc-icon">&#x1F5E1;</div>';
    html += '<div class="guild-card-info"><div class="guild-npc-name">Tavira</div><div class="guild-npc-role">Mestra de Recompensas</div></div>';
    html += '<div class="guild-card-arrow">&#x25B8;</div></div>';

    el.innerHTML = html;
};

window._openBraun = function() {
    guildAction('braun_menu').then(function(resp) {
        if (!resp || resp.error) return;
        _braun = resp;
        _renderBraunDetail();
    }).catch(function(e) { console.error('[GUILD]', e); });
};

function _renderBraunDetail() {
    if (!_braun) return;
    if (_typewriterTimer) { clearInterval(_typewriterTimer); _typewriterTimer = null; }

    var html = '';
    html += '<div class="guild-detail-header">';
    html += '<div class="guild-detail-icon">&#x1F9D3;</div>';
    html += '<div class="guild-detail-name">Braun</div>';
    html += '<div class="guild-detail-role">Veterano da Guilda &middot; ' + _esc(_braun.stage || '') + '</div></div>';

    html += '<div class="guild-npc-dialogue" id="npc-dialogue-box"></div>';
    html += '<div class="guild-detail-section"><div class="guild-detail-section-title">Histórias ouvidas: ' + (_braun.stories_heard || 0) + '</div></div>';

    showGuildDetail(html);
    setTimeout(function() { _typewriteText(_braun.greeting || 'Hmm... mais um aventureiro.'); }, 200);
}

window._openTavira = function() {
    guildAction('tavira_menu').then(function(resp) {
        if (!resp || resp.error) return;
        _tavira = resp;
        _renderTaviraDetail();
    }).catch(function(e) { console.error('[GUILD]', e); });
};

function _renderTaviraDetail() {
    if (!_tavira) return;
    if (_typewriterTimer) { clearInterval(_typewriterTimer); _typewriterTimer = null; }

    var html = '';
    html += '<div class="guild-detail-header">';
    html += '<div class="guild-detail-icon">&#x1F5E1;</div>';
    html += '<div class="guild-detail-name">Tavira</div>';
    html += '<div class="guild-detail-role">Mestra de Recompensas &middot; ' + _esc(_tavira.stage || '') + '</div></div>';

    html += '<div class="guild-npc-dialogue" id="npc-dialogue-box"></div>';

    if (_tavira.activities && _tavira.activities.length) {
        html += '<div class="guild-detail-section"><div class="guild-detail-section-title">Atividades</div>';
        for (var i = 0; i < _tavira.activities.length; i++) {
            var a = _tavira.activities[i];
            html += '<div class="guild-quest-card">';
            html += '<div class="guild-quest-title">' + _esc(a.n || a.name || '') + '</div>';
            html += '<div class="guild-quest-meta">' + _esc(a.desc || '') + '</div>';
            html += '</div>';
        }
        html += '</div>';
    }

    html += '<div class="guild-detail-section"><div class="guild-detail-section-title">Recompensas completadas: ' + (_tavira.bounties || 0) + '</div></div>';

    showGuildDetail(html);
    setTimeout(function() { _typewriteText(_tavira.greeting || 'Trabalho não falta por aqui.'); }, 200);
}

function _typewriteText(text) {
    var box = document.getElementById('npc-dialogue-box');
    if (!box) return;
    box.innerHTML = '<span class="typewriter-cursor"></span>';
    var idx = 0;
    _typewriterTimer = setInterval(function() {
        if (document.visibilityState === 'hidden') return;
        if (idx >= text.length) {
            clearInterval(_typewriterTimer);
            _typewriterTimer = null;
            box.innerHTML = _esc(text);
            return;
        }
        box.innerHTML = _esc(text.substring(0, idx + 1)) + '<span class="typewriter-cursor"></span>';
        idx++;
    }, 35);
}

})();

/**
 * game-social.js -- Popup Social Unificado
 * 4 abas: Praca (chat), Online, Recados (inbox), Vinculos (relacionamentos)
 */
(function() {
'use strict';

var _cachedData = null;
var _activeTab = 'chat';
var _pollTimer = null;
var _detailNpc = null;
var _detailData = null;
var _detailLoading = false;
var _sending = false;

function _esc(t) {
    if (!t) return '';
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _ago(ts) {
    if (!ts) return '';
    try {
        var d = new Date(ts);
        var diff = Math.floor((Date.now() - d.getTime()) / 60000);
        if (diff < 1) return 'agora';
        if (diff < 60) return 'h\u00e1 ' + diff + ' min';
        var h = Math.floor(diff / 60);
        if (h < 24) return 'h\u00e1 ' + h + 'h';
        return 'h\u00e1 ' + Math.floor(h / 24) + 'd';
    } catch (e) { return ''; }
}

function _fetchSocial(body) {
    if (!window.S || !S.apiBase || !S.token) return Promise.resolve(null);
    return fetch(S.apiBase + '/api/game/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + S.token },
        body: JSON.stringify(Object.assign({ user_id: S.uid }, body)),
    }).then(function(r) { return r.json(); }).catch(function(e) {
        console.error('[SOCIAL]', e); return null;
    });
}

function _startPoll() {
    _stopPoll();
    _pollTimer = setInterval(function() {
        if (_activeTab !== 'chat') { _stopPoll(); return; }
        var mc = (_cachedData && _cachedData.chat) ? _cachedData.chat.msg_count || 0 : 0;
        _fetchSocial({ action: 'chat_poll', msg_count: mc }).then(function(data) {
            if (!data || !data.messages) return;
            if (data.messages.length > 0 && _cachedData && _cachedData.chat) {
                _cachedData.chat.messages = _cachedData.chat.messages.concat(data.messages);
                if (_cachedData.chat.messages.length > 50) _cachedData.chat.messages = _cachedData.chat.messages.slice(-50);
                if (data.msg_count !== undefined) _cachedData.chat.msg_count = data.msg_count;
                _renderChatMessages();
            }
        });
    }, 7000);
}
function _stopPoll() { if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; } }

function _renderTabs() {
    var tabs = [
        { key: 'chat', label: '\ud83d\udcac Pra\u00e7a' },
        { key: 'online', label: '\ud83c\udf10 Online' },
        { key: 'inbox', label: '\ud83d\udce8 Recados' },
        { key: 'rel', label: '\ud83e\udd1d V\u00ednculos' },
    ];
    var ic = (_cachedData && _cachedData.inbox_count) ? _cachedData.inbox_count : 0;
    var h = '<div class="v-tabs-pill social-tabs">';
    for (var i = 0; i < tabs.length; i++) {
        var t = tabs[i];
        var cls = _activeTab === t.key ? ' active' : '';
        var label = t.label;
        if (t.key === 'inbox' && ic > 0) label += ' <span class="social-tab-badge">' + ic + '</span>';
        h += '<button class="v-tab' + cls + '" data-social-tab="' + t.key + '">' + label + '</button>';
    }
    h += '</div>';
    return h;
}

function _renderBody() {
    var h = _renderTabs();
    if (_activeTab === 'chat') h += _renderChat();
    else if (_activeTab === 'online') h += _renderOnline();
    else if (_activeTab === 'inbox') h += _renderInbox();
    else if (_activeTab === 'rel') h += _renderRel();
    return h;
}

function _renderChat() {
    var h = '<div class="social-chat-area" id="social-chat-area">' + _buildChatMessages() + '</div>';
    h += '<div class="social-emotes">';
    var em = [{k:'wave',i:'\ud83d\udc4b',a:'Acenar'},{k:'cheer',i:'\ud83c\udf7b',a:'Comemorar'},{k:'laugh',i:'\ud83d\ude02',a:'Rir'},{k:'bow',i:'\ud83d\ude47',a:'Reverenciar'}];
    for (var i = 0; i < em.length; i++) h += '<button class="social-emote-btn" data-emote="' + em[i].k + '" aria-label="' + em[i].a + '">' + em[i].i + '</button>';
    h += '</div>';
    h += '<div class="social-chat-input-wrap">';
    h += '<input type="text" id="social-chat-input" class="social-chat-input" placeholder="Escreva sua mensagem..." aria-label="Mensagem do chat" maxlength="200" autocomplete="off">';
    h += '<button class="social-send-btn" id="social-send-btn">\u27a4</button></div>';
    return h;
}

function _buildChatMessages() {
    var msgs = (_cachedData && _cachedData.chat && _cachedData.chat.messages) || [];
    if (msgs.length === 0) return '<div class="social-empty"><div class="social-empty-icon">\ud83d\udcac</div>A pra\u00e7a est\u00e1 silenciosa...</div>';
    var h = '';
    for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        if (m.system) { h += '<div class="social-msg social-msg--system">' + _esc(m.text) + '</div>'; }
        else {
            h += '<div class="social-msg"><span class="social-msg-meta">';
            if (m.time) h += '[' + _esc(m.time) + '] ';
            if (m.icon) h += m.icon + ' ';
            h += _esc(m.name);
            if (m.level) h += ' Nv' + m.level;
            h += '</span> <span class="social-msg-text">' + _esc(m.text) + '</span></div>';
        }
    }
    return h;
}

function _renderChatMessages() {
    var area = document.getElementById('social-chat-area');
    if (!area) return;
    area.innerHTML = _buildChatMessages();
    area.scrollTop = area.scrollHeight;
}

function _renderOnline() {
    var players = (_cachedData && _cachedData.online) || [];
    if (players.length === 0) return '<div class="social-empty"><div class="social-empty-icon">\ud83c\udf10</div>Nenhum viajante nas proximidades.</div><div style="font-size:var(--v-font-sm);color:var(--v-text-dim);margin-top:var(--v-space-xs);">Outros aventureiros aparecerão quando estiverem online.</div>';
    var h = '<div class="social-section-label">' + players.length + ' viajante' + (players.length !== 1 ? 's' : '') + ' online</div>';
    for (var i = 0; i < players.length; i++) {
        var p = players[i];
        var nd = (p.badge ? p.badge + ' ' : '') + _esc(p.name);
        h += '<div class="social-player"><span class="social-player-icon">' + (p.class_icon || '\ud83d\udc64') + '</span>';
        h += '<span class="social-player-info"><b>' + nd + '</b> <small>Nv.' + (p.level || '?') + '</small>';
        if (p.location) h += '<span class="social-player-loc">\ud83d\udccd ' + _esc(p.location) + '</span>';
        h += '</span><button class="social-interact-btn" data-target="' + p.user_id + '" title="Acenar">\ud83d\udc4b</button></div>';
    }
    return h;
}

function _renderInbox() {
    var items = (_cachedData && _cachedData.inbox) || [];
    if (items.length === 0) return '<div class="social-empty"><div class="social-empty-icon">\ud83d\udce8</div>Nenhuma intera\u00e7\u00e3o pendente.</div>';
    var h = '<div class="social-section-label">' + items.length + ' intera\u00e7\u00e3o(es) pendente(s)</div>';
    for (var i = 0; i < items.length; i++) {
        var r = items[i];
        h += '<div class="social-request"><div class="social-request-info">';
        h += '<span class="social-request-icon">' + (r.icon || '\ud83d\udce8') + '</span>';
        h += '<b>' + _esc(r.sender_name) + '</b> ' + _esc(r.desc);
        if (r.created_at) h += '<small class="social-request-age">' + _ago(r.created_at) + '</small>';
        h += '</div><div class="social-request-actions">';
        h += '<button class="v-popup-btn v-popup-btn--success social-req-btn" data-accept="' + _esc(r.request_id) + '">\u2705</button>';
        h += '<button class="v-popup-btn v-popup-btn--danger social-req-btn" data-decline="' + _esc(r.request_id) + '">\u274c</button>';
        h += '</div></div>';
    }
    return h;
}

function _renderRel() {
    if (_detailNpc) return _renderRelDetail();
    var npcs = (_cachedData && _cachedData.relationships) || [];
    if (npcs.length === 0) return '<div class="social-empty"><div class="social-empty-icon">\ud83e\udd1d</div>Voc\u00ea ainda n\u00e3o conhece ningu\u00e9m em Eldoria.</div>';
    var h = '<div class="social-section-label">' + npcs.length + ' v\u00ednculo' + (npcs.length !== 1 ? 's' : '') + '</div>';
    for (var i = 0; i < npcs.length; i++) {
        var n = npcs[i];
        h += '<div class="social-npc" data-npc="' + _esc(n.npc_id) + '">';
        h += '<span class="social-npc-mood">' + (n.mood_emoji || '\ud83d\ude10') + '</span>';
        h += '<span class="social-npc-info"><b>' + _esc(n.name) + '</b><small>' + _esc(n.role) + '</small></span>';
        h += '<div class="social-npc-bar"><div class="social-npc-bar-fill" style="width:' + Math.min(100, n.aff || 0) + '%"></div></div>';
        h += '<span class="social-npc-aff">' + (n.aff || 0) + '</span></div>';
    }
    return h;
}

function _renderRelDetail() {
    if (_detailLoading) return '<div class="social-empty"><div class="social-empty-icon">\u23f3</div>Carregando...</div>';
    if (!_detailData) return '<div class="social-empty"><div class="social-empty-icon">\u2753</div>NPC n\u00e3o encontrado.</div>';
    var d = _detailData;
    var h = '<div class="social-npc-detail-header">';
    h += '<div class="mood-big">' + (d.mood_emoji || '\ud83d\ude10') + '</div>';
    h += '<div style="font-size:var(--v-font-lg);color:var(--v-gold-light);font-weight:700;">' + _esc(d.name) + '</div>';
    h += '<div style="font-size:var(--v-font-sm);color:var(--v-text-dim);">' + _esc(d.role) + '</div>';
    h += '<div class="tier-badge">' + _esc(d.tier) + '</div></div>';
    h += '<div class="social-stat-row"><span>Afinidade</span>';
    h += '<div class="social-stat-bar"><div class="social-stat-bar-fill social-stat-bar-fill--aff" style="width:' + (d.aff||0) + '%"></div></div>';
    h += '<span>' + (d.aff||0) + '/100</span></div>';
    h += '<div class="social-stat-row"><span>Paci\u00eancia</span>';
    var pp = d.patience_max ? Math.round((d.patience/d.patience_max)*100) : 0;
    h += '<div class="social-stat-bar"><div class="social-stat-bar-fill social-stat-bar-fill--patience" style="width:' + pp + '%"></div></div>';
    h += '<span>' + (d.patience||0) + '/' + (d.patience_max||10) + '</span></div>';
    h += '<div class="social-stat-row"><span>Encontros</span><span>' + (d.encounters||0) + 'x</span></div>';
    h += '<div class="social-stat-row"><span>Humor</span><span>' + (d.mood_emoji||'\ud83d\ude10') + ' ' + _esc(d.mood) + '</span></div>';
    if (d.emotions && d.emotions.length > 0) {
        h += '<div class="social-section-label">Emo\u00e7\u00f5es</div>';
        for (var i = 0; i < d.emotions.length; i++) {
            var e = d.emotions[i];
            var pct = Math.round((e.value||0)*100);
            h += '<div class="social-emo-row"><span>' + _esc(e.label) + '</span>';
            h += '<div class="social-emo-bar"><div class="social-emo-bar-fill" style="width:' + pct + '%"></div></div>';
            h += '<span>' + (e.value||0).toFixed(2) + '</span></div>';
        }
    }
    if (d.memories && d.memories.length > 0) {
        h += '<div class="social-section-label">Lembran\u00e7as Recentes</div>';
        for (var j = 0; j < d.memories.length; j++) {
            var m = d.memories[j];
            h += '<div class="social-memory">\u2022 ' + _esc(m.summary);
            if (m.emotion && m.emotion !== 'neutral') h += ' <span class="social-memory-emo">(' + _esc(m.emotion) + ')</span>';
            h += '</div>';
        }
    }
    return h;
}

function _loadRelDetail(npcId) {
    _detailNpc = npcId; _detailData = null; _detailLoading = true;
    _render();
    _fetchSocial({ action: 'rel_detail', npc_id: npcId }).then(function(data) {
        _detailLoading = false;
        if (data && !data.error) _detailData = data;
        _render();
    });
}

function _renderActions() {
    var h = '';
    if (_activeTab === 'rel' && _detailNpc) h += '<button class="v-popup-btn" data-action="rel_back">\u2b05\ufe0f Voltar</button>';
    h += '<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">\ud83c\udfe0 Voltar</button>';
    return h;
}

function _render() {
    if (typeof vPopup === 'undefined') { console.warn('[SOCIAL] vPopup not loaded'); return; }
    vPopup.show({
        id: 'social-popup-overlay',
        header: '\ud83d\udc65 Social',
        body: _renderBody(),
        actions: _renderActions(),
        onAction: _handleAction,
        closeOnOutside: !_detailNpc,
        onHide: function() {
            _stopPoll();
            _detailNpc = null;
            _detailData = null;
            _fetchSocial({action: 'close'});
        },
    });
    _bindListeners();
    if (_activeTab === 'chat') {
        _startPoll();
        var area = document.getElementById('social-chat-area');
        if (area) area.scrollTop = area.scrollHeight;
    } else { _stopPoll(); }
}

function _handleAction(action) {
    if (action === 'rel_back') { _detailNpc = null; _detailData = null; _render(); return true; }
    return false;
}

function _bindListeners() {
    var tabs = document.querySelectorAll('.social-tabs .v-tab');
    for (var t = 0; t < tabs.length; t++) {
        tabs[t].addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            var tab = e.currentTarget.getAttribute('data-social-tab');
            if (tab && tab !== _activeTab) {
                _activeTab = tab; _detailNpc = null; _detailData = null;
                try { localStorage.setItem('valdoria_social_tab', tab); } catch (ex) {}
                _render();
            }
        });
    }
    var sendBtn = document.getElementById('social-send-btn');
    var chatInput = document.getElementById('social-chat-input');
    if (sendBtn) sendBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); if (chatInput) _chatSend(chatInput.value); });
    if (chatInput) chatInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); _chatSend(chatInput.value); } });
    var emBtns = document.querySelectorAll('.social-emote-btn');
    for (var i = 0; i < emBtns.length; i++) emBtns[i].addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); var em = e.currentTarget.getAttribute('data-emote'); if (em) _chatEmote(em); });
    var intBtns = document.querySelectorAll('.social-interact-btn');
    for (var j = 0; j < intBtns.length; j++) intBtns[j].addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); var uid = parseInt(e.currentTarget.getAttribute('data-target'), 10); if (uid) _socialSend(uid, 'wave'); });
    var accBtns = document.querySelectorAll('[data-accept]');
    for (var a = 0; a < accBtns.length; a++) accBtns[a].addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); var rid = e.currentTarget.getAttribute('data-accept'); if (rid) _socialAction('social_accept', rid); });
    var decBtns = document.querySelectorAll('[data-decline]');
    for (var dd = 0; dd < decBtns.length; dd++) decBtns[dd].addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); var rid = e.currentTarget.getAttribute('data-decline'); if (rid) _socialAction('social_decline', rid); });
    var npcCards = document.querySelectorAll('.social-npc');
    for (var n = 0; n < npcCards.length; n++) npcCards[n].addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); var nid = e.currentTarget.getAttribute('data-npc'); if (nid) _loadRelDetail(nid); });
}

function _chatSend(text) {
    if (!text || !text.trim() || _sending) return;
    _sending = true;
    var input = document.getElementById('social-chat-input');
    if (input) input.value = '';
    if (typeof haptic === 'function') haptic('light');
    _fetchSocial({ action: 'chat_send', text: text.trim() }).then(function(data) {
        _sending = false;
        if (data && data.ok) {
            var mc = (_cachedData && _cachedData.chat) ? _cachedData.chat.msg_count || 0 : 0;
            _fetchSocial({ action: 'chat_poll', msg_count: mc }).then(function(pd) {
                if (pd && pd.messages && _cachedData && _cachedData.chat) {
                    _cachedData.chat.messages = _cachedData.chat.messages.concat(pd.messages);
                    if (_cachedData.chat.messages.length > 50) _cachedData.chat.messages = _cachedData.chat.messages.slice(-50);
                    if (pd.msg_count !== undefined) _cachedData.chat.msg_count = pd.msg_count;
                    _renderChatMessages();
                }
            });
        } else if (data && data.error) {
            var msg = data.error === 'cooldown' ? '\u23f3 Aguarde um momento...' : data.error;
            if (typeof vToast === 'function') vToast(msg, 'warn');
        }
    }).catch(function() { _sending = false; });
}

function _chatEmote(key) {
    if (typeof haptic === 'function') haptic('light');
    _fetchSocial({ action: 'chat_emote', emote: key }).then(function(data) {
        if (data && data.ok) {
            var mc = (_cachedData && _cachedData.chat) ? _cachedData.chat.msg_count || 0 : 0;
            _fetchSocial({ action: 'chat_poll', msg_count: mc }).then(function(pd) {
                if (pd && pd.messages && _cachedData && _cachedData.chat) {
                    _cachedData.chat.messages = _cachedData.chat.messages.concat(pd.messages);
                    if (_cachedData.chat.messages.length > 50) _cachedData.chat.messages = _cachedData.chat.messages.slice(-50);
                    if (pd.msg_count !== undefined) _cachedData.chat.msg_count = pd.msg_count;
                    _renderChatMessages();
                }
            });
        } else if (data && data.error === 'cooldown') {
            if (typeof vToast === 'function') vToast('\u23f3 Aguarde um momento...', 'warn');
        }
    });
}

function _socialSend(targetUid, type) {
    if (typeof haptic === 'function') haptic('light');
    _fetchSocial({ action: 'social_send', target_uid: targetUid, type: type }).then(function(data) {
        if (data && data.ok) { if (typeof vToast === 'function') vToast(data.message || '\u2705 Enviado!', 'ok'); }
        else if (data && data.message) { if (typeof vToast === 'function') vToast('\u274c ' + data.message, 'err'); }
    });
}

function _socialAction(action, requestId) {
    if (typeof haptic === 'function') haptic('light');
    _fetchSocial({ action: action, request_id: requestId }).then(function(data) {
        if (data && data.ok) {
            if (typeof vToast === 'function') vToast(data.message || '\u2705', 'ok');
            _fetchSocial({ action: 'load' }).then(function(fd) { if (fd) { _cachedData = fd; _render(); } });
        } else if (data && data.message) {
            if (typeof vToast === 'function') vToast('\u274c ' + data.message, 'err');
        }
    });
}

window.showSocialPopup = function(data) {
    _cachedData = data || {};
    try { var sv = localStorage.getItem('valdoria_social_tab'); if (sv && ['chat','online','inbox','rel'].indexOf(sv) !== -1) _activeTab = sv; } catch (e) {}
    _detailNpc = null; _detailData = null;
    _render();
};

window.openSocialPopup = function() {
    if (typeof vPopup !== "undefined") {
        vPopup.show({
            id: "social-popup-overlay",
            header: "👥 Social",
            body: '<div class="social-empty"><div class="social-empty-icon">⏳</div><div>Carregando...</div></div>',
            actions: "",
            closeOnOutside: true,
            onHide: function() { _stopPoll(); _detailNpc = null; _detailData = null; _fetchSocial({action: "close"}); },
        });
    }
    _fetchSocial({ action: "load" }).then(function(data) {
        if (data && !data.error) {
            window.showSocialPopup(data);
        } else {
            console.error("[SOCIAL] Failed to load", data);
            if (typeof vToast === "function") vToast("Erro ao carregar social.", "err");
            if (typeof vPopup !== "undefined") vPopup.hide("social-popup-overlay");
        }
    });
};

window.hideSocialPopup = function() {
    if (typeof vPopup !== 'undefined') vPopup.hide('social-popup-overlay');
};

})();

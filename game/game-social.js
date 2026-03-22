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
var _selectedPlayer = null;
var _POLL_INTERVAL_MS = 7000;

function _idemKey() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }


function _rpFormat(t) {
    if (!t) return '';
    return vEsc(t).replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function _calcToastDuration(text) {
    var words = String(text || '').replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1500, Math.min(4000, words * 250));
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
    }).then(function(r) { if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }).catch(function(e) {
        console.error('[SOCIAL]', e); return null;
    });
}

function _startPoll() {
    _stopPoll();
    _pollTimer = setInterval(function() {
        if (document.visibilityState === 'hidden') return;
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
    }, _POLL_INTERVAL_MS);
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
    var h = '<div class="social-chat-area" id="social-chat-area" role="log" aria-live="polite">' + _buildChatMessages() + '</div>';
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
        if (m.system) { h += '<div class="social-msg social-msg--system">' + vEsc(m.text) + '</div>'; }
        else {
            h += '<div class="social-msg"><span class="social-msg-meta">';
            if (m.time) h += '[' + vEsc(m.time) + '] ';
            if (m.icon) h += vEsc(m.icon) + ' ';
            h += vEsc(m.name);
            if (m.level) h += ' Nv' + m.level;
            h += '</span> <span class="social-msg-text">' + _rpFormat(m.text) + '</span></div>';
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
    if (players.length === 0) return '<div class="social-empty"><div class="social-empty-icon">🌐</div>Nenhum viajante nas proximidades.</div><div style="font-size:var(--v-font-sm);color:var(--v-text-dim);margin-top:var(--v-space-xs);">Outros aventureiros aparecerão quando estiverem online.</div>';
    var h = '<div class="social-section-label">' + players.length + ' viajante' + (players.length !== 1 ? 's' : '') + ' online</div>';
    for (var i = 0; i < players.length; i++) {
        var p = players[i];
        var isSelected = _selectedPlayer === p.user_id;
        var nd = (p.badge ? p.badge + ' ' : '') + vEsc(p.name);
        h += '<div class="social-player' + (isSelected ? ' social-player--selected' : '') + '" data-player-uid="' + p.user_id + '">';
        h += '<span class="social-player-icon">' + (p.class_icon || '👤') + '</span>';
        h += '<span class="social-player-info"><b>' + nd + '</b> <small>Nv.' + (p.level || '?') + '</small>';
        if (p.location) h += '<span class="social-player-loc">📍 ' + vEsc(p.location) + '</span>';
        h += '</span><button class="social-interact-btn" data-target="' + p.user_id + '" title="Interações">✦</button></div>';
        if (isSelected) {
            h += '<div class="social-player-actions">';
            h += '<button class="social-action-btn" data-action-uid="' + p.user_id + '" data-action-type="wave">👋 Acenar</button>';
            h += '<button class="social-action-btn" data-action-uid="' + p.user_id + '" data-action-type="duel_challenge">⚔️ Duelo</button>';
            h += '<button class="social-action-btn" data-action-uid="' + p.user_id + '" data-action-type="trade_invite">🤝 Trocar</button>';
            h += '<button class="social-action-btn" data-action-uid="' + p.user_id + '" data-action-type="party_invite">🏠 Grupo</button>';
            h += '</div>';
        }
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
        h += '<b>' + vEsc(r.sender_name) + '</b> ' + vEsc(r.desc);
        if (r.created_at) h += '<small class="social-request-age">' + _ago(r.created_at) + '</small>';
        h += '</div><div class="social-request-actions">';
        h += '<button class="v-popup-btn v-popup-btn--success social-req-btn" data-accept="' + vEsc(r.request_id) + '">\u2705</button>';
        h += '<button class="v-popup-btn v-popup-btn--danger social-req-btn" data-decline="' + vEsc(r.request_id) + '">\u274c</button>';
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
        h += '<div class="social-npc" data-npc="' + vEsc(n.npc_id) + '">';
        h += '<span class="social-npc-mood">' + (n.mood_emoji || '\ud83d\ude10') + '</span>';
        h += '<span class="social-npc-info"><b>' + vEsc(n.name) + '</b><small>' + vEsc(n.role) + '</small></span>';
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
    h += '<div style="font-size:var(--v-font-lg);color:var(--v-gold-light);font-weight:700;">' + vEsc(d.name) + '</div>';
    h += '<div style="font-size:var(--v-font-sm);color:var(--v-text-dim);">' + vEsc(d.role) + '</div>';
    h += '<div class="tier-badge">' + vEsc(d.tier) + '</div></div>';
    h += '<div class="social-stat-row"><span>Afinidade</span>';
    h += '<div class="social-stat-bar"><div class="social-stat-bar-fill social-stat-bar-fill--aff" style="width:' + (d.aff||0) + '%"></div></div>';
    h += '<span>' + (d.aff||0) + '/100</span></div>';
    h += '<div class="social-stat-row"><span>Paci\u00eancia</span>';
    var pp = d.patience_max ? Math.round((d.patience/d.patience_max)*100) : 0;
    h += '<div class="social-stat-bar"><div class="social-stat-bar-fill social-stat-bar-fill--patience" style="width:' + pp + '%"></div></div>';
    h += '<span>' + (d.patience||0) + '/' + (d.patience_max||10) + '</span></div>';
    h += '<div class="social-stat-row"><span>Encontros</span><span>' + (d.encounters||0) + 'x</span></div>';
    h += '<div class="social-stat-row"><span>Humor</span><span>' + (d.mood_emoji||'\ud83d\ude10') + ' ' + vEsc(d.mood) + '</span></div>';
    if (d.emotions && d.emotions.length > 0) {
        h += '<div class="social-section-label">Emo\u00e7\u00f5es</div>';
        for (var i = 0; i < d.emotions.length; i++) {
            var e = d.emotions[i];
            var pct = Math.round((e.value||0)*100);
            h += '<div class="social-emo-row"><span>' + vEsc(e.label) + '</span>';
            h += '<div class="social-emo-bar"><div class="social-emo-bar-fill" style="width:' + pct + '%"></div></div>';
            h += '<span>' + (e.value||0).toFixed(2) + '</span></div>';
        }
    }
    if (d.memories && d.memories.length > 0) {
        h += '<div class="social-section-label">Lembran\u00e7as Recentes</div>';
        for (var j = 0; j < d.memories.length; j++) {
            var m = d.memories[j];
            h += '<div class="social-memory">\u2022 ' + vEsc(m.summary);
            if (m.emotion && m.emotion !== 'neutral') h += ' <span class="social-memory-emo">(' + vEsc(m.emotion) + ')</span>';
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
    }).catch(function(e) { _detailLoading = false; console.error("[SOCIAL] rel_detail", e); _render(); });
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
            _selectedPlayer = null;
            _fetchSocial({action: 'close'});
        },
    });
    _bindListeners();
    if (_activeTab === 'chat') {
        _startPoll();
        requestAnimationFrame(function() {
            var area = document.getElementById('social-chat-area');
            if (area) area.scrollTop = area.scrollHeight;
        });
    } else { _stopPoll(); }
}

function _handleAction(action) {
    if (action === 'rel_back') { _detailNpc = null; _detailData = null; _render(); return true; }
    return false;
}

var _delegateSet = false;
function _bindListeners() {
    if (_delegateSet) return;
    _delegateSet = true;
    document.addEventListener('click', function(e) {
        var t = e.target.closest('[data-social-tab]');
        if (t) { e.preventDefault(); e.stopPropagation(); var tab = t.getAttribute('data-social-tab'); if (tab && tab !== _activeTab) { _activeTab = tab; _detailNpc = null; _detailData = null; _selectedPlayer = null; try { localStorage.setItem('valdoria_social_tab', tab); } catch(ex){console.warn('[SOCIAL]',ex);} _render(); } return; }
        if (e.target.closest('#social-send-btn')) { e.preventDefault(); e.stopPropagation(); var inp = document.getElementById('social-chat-input'); if (inp) _chatSend(inp.value); return; }
        var em = e.target.closest('.social-emote-btn');
        if (em) { e.preventDefault(); e.stopPropagation(); var ek = em.getAttribute('data-emote'); if (ek) _chatEmote(ek); return; }
        // Action buttons in player interaction menu
        var actionBtn = e.target.closest('.social-action-btn');
        if (actionBtn) {
            e.preventDefault(); e.stopPropagation();
            var aUid = parseInt(actionBtn.getAttribute('data-action-uid'), 10);
            var aType = actionBtn.getAttribute('data-action-type');
            if (aUid && aType) _socialSend(aUid, aType);
            return;
        }
        // Toggle player interaction panel
        var ib = e.target.closest('.social-interact-btn');
        if (ib) {
            e.preventDefault(); e.stopPropagation();
            var uid = parseInt(ib.getAttribute('data-target'), 10);
            if (uid) {
                _selectedPlayer = (_selectedPlayer === uid) ? null : uid;
                _render();
            }
            return;
        }
        var ab = e.target.closest('[data-accept]');
        if (ab) { e.preventDefault(); e.stopPropagation(); var rid = ab.getAttribute('data-accept'); if (rid) _socialAction('social_accept', rid); return; }
        var db = e.target.closest('[data-decline]');
        if (db) { e.preventDefault(); e.stopPropagation(); var rid2 = db.getAttribute('data-decline'); if (rid2) _socialAction('social_decline', rid2); return; }
        var nc = e.target.closest('.social-npc[data-npc]');
        if (nc) { e.preventDefault(); e.stopPropagation(); var nid = nc.getAttribute('data-npc'); if (nid) _loadRelDetail(nid); return; }
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target && e.target.id === 'social-chat-input') { e.preventDefault(); _chatSend(e.target.value); }
    });
}

function _chatSend(text) {
    if (!text || !text.trim() || _sending) return;
    _sending = true;
    var input = document.getElementById('social-chat-input');
    if (input) { input.value = ''; input.focus(); }
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
            if (typeof vToast === 'function') vToast(msg, 'warn', _calcToastDuration(msg));
        }
    }).catch(function(err) { _sending = false; console.error('[SOCIAL] chatSend failed', err); if (typeof vToast === 'function') vToast('Erro ao enviar mensagem.', 'warn', 2500); });
}

function _chatEmote(key) {
    if (_sending) return;
    _sending = true;
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
            if (typeof vToast === 'function') vToast('\u23f3 Aguarde um momento...', 'warn', 2000);
        }
        _sending = false;
    }).catch(function(err) { _sending = false; console.error('[SOCIAL] chatEmote failed', err); if (typeof vToast === 'function') vToast('Erro ao enviar emote.', 'warn', 2000); });
}

function _socialSend(targetUid, type) {
    if (typeof haptic === 'function') haptic('light');
    _fetchSocial({ action: 'social_send', target_uid: targetUid, type: type, idem_key: _idemKey() }).then(function(data) {
        if (data && data.ok) {
            var msg = data.message || '\u2705 Enviado!';
            if (typeof vToast === 'function') vToast(msg, 'ok', _calcToastDuration(msg));
        } else if (data && data.message) {
            var errMsg = '\u274c ' + data.message;
            if (typeof vToast === 'function') vToast(errMsg, 'err', _calcToastDuration(errMsg));
        }
    });
}

function _socialAction(action, requestId) {
    if (typeof haptic === 'function') haptic('light');
    _fetchSocial({ action: action, request_id: requestId, idem_key: _idemKey() }).then(function(data) {
        if (data && data.ok) {
            var msg = data.message || '\u2705';
            if (typeof vToast === 'function') vToast(msg, 'ok', _calcToastDuration(msg));
            // If a session was started (duel/coop/trade), close popup
            if (data.started) {
                if (typeof vPopup !== 'undefined') vPopup.hide('social-popup-overlay');
                return;
            }
            _fetchSocial({ action: 'load' }).then(function(fd) { if (fd) { _cachedData = fd; _render(); } });
        } else if (data && data.message) {
            var errMsg = '\u274c ' + data.message;
            if (typeof vToast === 'function') vToast(errMsg, 'err', _calcToastDuration(errMsg));
        }
    });
}

window.showSocialPopup = function(data) {
    _cachedData = data || {};
    try { var sv = localStorage.getItem('valdoria_social_tab'); if (sv && ['chat','online','inbox','rel'].indexOf(sv) !== -1) _activeTab = sv; } catch(e){console.warn('[SOCIAL]',e);}
    _detailNpc = null; _detailData = null; _selectedPlayer = null;
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
            onHide: function() { _stopPoll(); _detailNpc = null; _detailData = null; _selectedPlayer = null; _fetchSocial({action: "close"}); },
        });
    }
    var _loadDone = false;
    var _loadTimeout = setTimeout(function() {
        if (!_loadDone) {
            _loadDone = true;
            console.error('[SOCIAL] Load timeout after 10s');
            if (typeof vToast === 'function') vToast('Erro: tempo esgotado ao carregar.', 'warn', 3000);
            if (typeof vPopup !== 'undefined') vPopup.hide('social-popup-overlay');
        }
    }, 10000);
    _fetchSocial({ action: "load" }).then(function(data) {
        if (_loadDone) return;
        _loadDone = true;
        clearTimeout(_loadTimeout);
        if (data && !data.error) {
            window.showSocialPopup(data);
        } else {
            console.error("[SOCIAL] Failed to load", data);
            if (typeof vToast === "function") vToast("Erro ao carregar social.", "err", 2500);
            if (typeof vPopup !== "undefined") vPopup.hide("social-popup-overlay");
        }
    });
};

window.hideSocialPopup = function() {
    if (typeof vPopup !== 'undefined') vPopup.hide('social-popup-overlay');
};

// Cleanup poll timer on page transitions (WebApp switch, close)
window.addEventListener('pagehide', function() { _stopPoll(); });

})();

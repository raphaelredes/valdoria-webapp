/* guild-core.js -- Core state, API, tabs, navigation */
(function() {
'use strict';

var G = {
    data: null,
    tab: localStorage.getItem('valdoria_guild_tab') || 'salao',
    page: { recrutar: 0 },
    filter: { recrutar: null },
    loading: false
};
window.G = G;

var _KEY_MAP = {
    n: 'name', c: 'class_name', l: 'level', ico: 'icon',
    mhp: 'hp_max', mmp: 'mp_max', apr: 'approval',
    xpn: 'xp_next', aff: 'affinity', arch: 'archetype'
};

function _mapNpc(raw) {
    if (!raw || typeof raw !== 'object') return raw;
    var out = {};
    for (var k in raw) {
        if (!raw.hasOwnProperty(k)) continue;
        out[_KEY_MAP[k] || k] = raw[k];
    }
    return out;
}
window._mapNpc = _mapNpc;

function _mapArray(arr) {
    if (!Array.isArray(arr)) return arr;
    var r = [];
    for (var i = 0; i < arr.length; i++) r.push(_mapNpc(arr[i]));
    return r;
}
window._mapArray = _mapArray;

function _mapGuildData(data) {
    if (!data) return data;
    if (data.party) data.party = _mapArray(data.party);
    if (data.items) data.items = _mapArray(data.items);
    return data;
}

var _TIERS = [
    { max: -50, cls: 'hostile', label: 'Hostil' },
    { max: -25, cls: 'cold',    label: 'Frio' },
    { max:  25, cls: 'neutral', label: 'Neutro' },
    { max:  50, cls: 'warm',    label: 'Amigavel' },
    { max:  75, cls: 'loyal',   label: 'Leal' }
];
function _approvalTier(v) {
    v = v != null ? v : 0;
    for (var i = 0; i < _TIERS.length; i++) if (v < _TIERS[i].max) return _TIERS[i];
    return { cls: 'devoted', label: 'Devoto' };
}
window._approvalTier = _approvalTier;

function _approvalPct(v) {
    v = v != null ? v : 0;
    return Math.max(0, Math.min(100, Math.round((v + 100) / 2)));
}
window._approvalPct = _approvalPct;

function _statItem(label, value) {
    return '<div class="guild-stat-item"><span class="guild-stat-label">' + vEsc(label) + '</span><span class="guild-stat-value">' + vEsc(value) + '</span></div>';
}
window._statItem = _statItem;

function guildFetch(endpoint, body) {
    var S = window.S || {};
    var url = (S.apiBase || '') + endpoint + (endpoint.indexOf('?') >= 0 ? '&' : '?') + 'token=' + encodeURIComponent(S.token || '');
    var headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (S.token || '') };
    if (body) {
        headers['X-Idempotency-Key'] = Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    }
    var opts = { method: 'POST', headers: headers, body: body ? JSON.stringify(body) : undefined };
    return fetchJSON(url, opts).catch(function(e) {
        console.warn('[GUILD] fetch failed:', endpoint, e.message || e);
        // Fallback: sendData when fetch fails (InlineKeyboardButton Mini Apps)
        var tg = window.Telegram && Telegram.WebApp;
        if (tg && tg.sendData) {
            try {
                var fallback = Object.assign({ endpoint: endpoint, webapp: 'GUILD' }, body || {});
                tg.sendData(JSON.stringify(fallback));
            } catch (se) { console.error('[GUILD] sendData fallback failed:', se); }
        }
        showGuildError('Falha na comunicação com o servidor.');
        return null;
    });
}
window.guildFetch = guildFetch;

function guildAction(action, body) {
    var payload = Object.assign({ action: action }, body || {});
    return guildFetch('/api/guild/action', payload).then(function(resp) {
        if (!resp) return resp;
        if (G.data && resp.gold != null) G.data.gold = resp.gold;
        if (G.data && resp.party) G.data.party = _mapArray(resp.party);
        if (resp.msg && typeof vToast === 'function') {
            vToast(resp.msg, resp.ok ? 'success' : (resp.error ? 'error' : 'info'));
        }
        return resp;
    });
}
window.guildAction = guildAction;

function showGuildError(msg) {
    console.error('[GUILD]', msg);
    if (typeof vToast === 'function') vToast(msg, 'error', Math.max(2000, Math.min(5000, msg.split(/\s+/).length * 250)));
}
window.showGuildError = showGuildError;

function _switchTab(tabId) {
    G.tab = tabId;
    try{localStorage.setItem('valdoria_guild_tab', tabId);}catch(e){console.warn('[GUILD]',e);}
    var tabs = document.querySelectorAll('.guild-tabs .v-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tabId);
    var panels = document.querySelectorAll('.v-tab-panel');
    for (var j = 0; j < panels.length; j++) {
        var on = panels[j].id === 'tab-' + tabId;
        panels[j].classList.toggle('active', on);
        panels[j].style.display = on ? '' : 'none';
    }
    renderCurrentTab();
}

function _initTabs() {
    var tabs = document.querySelectorAll('.guild-tabs .v-tab');
    for (var i = 0; i < tabs.length; i++) {
        (function(t) {
            t.addEventListener('click', function() {
                var id = t.getAttribute('data-tab');
                if (id) _switchTab(id);
                if (typeof vHaptic !== 'undefined' && vHaptic.impact) vHaptic.impact('light');
            });
        })(tabs[i]);
    }
    if (G.tab && G.tab !== 'salao') _switchTab(G.tab);
}

function renderCurrentTab() {
    if (!G.data) return;
    var map = { salao: 'renderPartyTab', recrutar: 'renderRecruitTab', missoes: 'renderQuestsTab', npcs: 'renderNpcsTab', treinar: 'renderTrainingTab' };
    var fn = window[map[G.tab] || 'renderPartyTab'];
    if (typeof fn === 'function') fn();
    var bp = document.getElementById('bottom-panel');
    if (bp) bp.style.display = '';
}
window.renderCurrentTab = renderCurrentTab;

function showGuildDetail(html) {
    var c = document.getElementById('guild-detail-content');
    if (!c) return;
    c.innerHTML = html;
    vDrawer.open('guild-detail-overlay');
    var bp = document.getElementById('bottom-panel');
    if (bp) bp.style.display = 'none';
}
window.showGuildDetail = showGuildDetail;

function hideGuildDetail() {
    vDrawer.close('guild-detail-overlay');
    var bp = document.getElementById('bottom-panel');
    if (bp) bp.style.display = '';
    renderCurrentTab();
}
window.hideGuildDetail = hideGuildDetail;

function initImmersive() {
    var toggle = document.getElementById('immersive-toggle');
    var panel = document.getElementById('bottom-panel');
    var restore = document.getElementById('immersive-restore');
    if (!toggle || !panel || !restore) return;
    function apply(c) {
        panel.classList.toggle('immersive-collapsed', c);
        toggle.style.display = c ? 'none' : '';
        restore.style.display = c ? '' : 'none';
    }
    apply(localStorage.getItem('valdoria_immersive') === '1');
    toggle.addEventListener('click', function() { try{localStorage.setItem('valdoria_immersive', '1');}catch(e){console.warn('[GUILD]',e);} apply(true); });
    restore.addEventListener('click', function() { try{localStorage.setItem('valdoria_immersive', '0');}catch(e){console.warn('[GUILD]',e);} apply(false); });
}

function _navTo(goto) {
    var S = window.S || {};
    if (S.apiBase && S.token) {
        window.__valdoria_transitioning = true;
        var url = S.apiBase.replace('/api', '') + '/game/?token=' + encodeURIComponent(S.token);
        if (goto) url += '&goto=' + goto;
        window.location.replace(url);
    } else if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.sendData(JSON.stringify({ action: 'guild_back' }));
        Telegram.WebApp.close();
    }
}
window.guildNavBack = function() { _navTo(null); };
window.guildNavCity = function() { _navTo('city'); };
window.guildNavSheet = function() { _navTo('sheet'); };

function _renderPlayerInfo() {
    var el = document.getElementById('guild-player-info');
    if (!el || !G.data) return;
    var h = '';
    if (G.data.gold != null) h += '<span class="guild-player-gold">' + G.data.gold + ' GP</span>';
    if (G.data.rep != null) h += ' <span class="guild-player-rep">Rep: ' + G.data.rep + '</span>';
    el.innerHTML = h;
}
window._renderPlayerInfo = _renderPlayerInfo;

function initGuild() {
    var S = window.S || {};
    if (!S.apiBase || !S.token) {
        console.error('[GUILD] Parametros de sessao ausentes.');
        showGuildError('Erro de sessao. Tente reabrir a guilda.');
        if (window._guildLoadingCtrl) window._guildLoadingCtrl.hide();
        return;
    }
    _initTabs();
    var cb = document.getElementById('guildDetailClose');
    if (cb) cb.addEventListener('click', hideGuildDetail);
    G.loading = true;
    guildFetch('/api/guild/start', {}).then(function(resp) {
        G.loading = false;
        G.data = resp ? _mapGuildData(resp) : {};
        _renderPlayerInfo();
        renderCurrentTab();
        initImmersive();
        if (window._guildLoadingCtrl) window._guildLoadingCtrl.hide();
    }).catch(function() {
        G.loading = false;
        if (window._guildLoadingCtrl) window._guildLoadingCtrl.hide();
    });
    if (typeof ValdoriaAudio !== 'undefined') ValdoriaAudio.play('city');
}
window.initGuild = initGuild;

if (!window.SpaRouter) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGuild);
    else initGuild();
}

})();

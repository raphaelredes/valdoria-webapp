/* Combat2 — frontend minimalista request-response.
 *
 * Fluxo: state fica em `_s`. Cada acao do player = 1 POST /api/combat2/action
 * -> atualiza _s -> render. Sem polling, sem cinematicos bloqueantes.
 *
 * DOM manipulation: usa createElement + textContent (zero innerHTML)
 * para evitar qualquer vetor XSS. Estrutura construida programaticamente.
 */
(function () {
    'use strict';

    var _s = null;
    var _token = null;
    var _apiBase = '';

    function $(id) { return document.getElementById(id); }
    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    function _getToken() {
        var u = new URLSearchParams(location.search);
        return u.get('token') || localStorage.getItem('valdoria_combat_token_dev') || '';
    }

    async function _call(path, opts) {
        opts = opts || {};
        opts.headers = Object.assign(
            { 'Authorization': 'Bearer ' + _token, 'Content-Type': 'application/json' },
            opts.headers || {}
        );
        var r = await fetch(_apiBase + path, opts);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
    }

    async function _fetchState() { return await _call('/api/combat2/state'); }
    async function _doAction(a) {
        return await _call('/api/combat2/action', { method: 'POST', body: JSON.stringify(a) });
    }

    function _hideLoading() { var l = $('loading'); if (l) l.style.display = 'none'; }

    function _renderUnit(parent, u, isActive, icon) {
        var cls = 'c2-unit' + (!u.alive ? ' dead' : '') + (isActive ? ' active' : '');
        var row = el('div', cls);
        row.appendChild(el('span', null, (icon || '') + ' ' + u.name));
        row.appendChild(el('span', 'c2-hp', u.hp + '/' + u.mhp));
        parent.appendChild(row);
        var pct = Math.max(0, (u.hp / u.mhp) * 100);
        var bar = el('div', 'c2-hp-bar');
        var fill = el('div', 'c2-hp-bar-fill' + (pct < 33 ? ' low' : ''));
        fill.style.width = pct + '%';
        bar.appendChild(fill);
        parent.appendChild(bar);
    }

    function render(s) {
        _s = s;
        var app = $('app');
        while (app.firstChild) app.removeChild(app.firstChild);

        app.appendChild(el('div', 'c2-phase', s.phase || '?'));
        app.appendChild(el('div', 'c2-round', 'Rodada ' + (s.rn || 1)));

        if (s.phase === 'victory' || s.phase === 'defeat' || s.phase === 'fled') {
            var label = { victory: 'VITORIA!', defeat: 'Derrota...', fled: 'Voce fugiu' }[s.phase];
            app.appendChild(el('div', 'c2-end ' + s.phase, label));
            return;
        }

        var activeT = s.active_turn || {};
        if (s.p) _renderUnit(app, s.p, activeT.t === 'p', '🗡️');
        (s.e || []).forEach(function (e) {
            _renderUnit(app, e, activeT.t === 'e' && activeT.n === e.name, e.icon || '👹');
        });
        (s.a || []).forEach(function (a) {
            if (a.alive) _renderUnit(app, a, activeT.t === 'a' && activeT.n === a.name, '🛡️');
        });

        if (s.log && s.log.length) {
            var log = el('div', 'c2-log');
            s.log.slice(-10).forEach(function (line) { log.appendChild(el('div', 'c2-log-line', line)); });
            app.appendChild(log);
        }

        var isPlayerTurn = activeT.t === 'p' && s.phase === 'active';
        var isInit = s.phase === 'init';
        var actions = el('div', 'c2-actions');
        if (isInit) {
            actions.appendChild(_btn('Iniciar Combate', 'primary', { act: 'start' }));
        } else if (isPlayerTurn) {
            var firstAliveEnemy = (s.e || []).findIndex(function (e) { return e.alive; });
            if (firstAliveEnemy >= 0) {
                var toIdx = -1;
                (s.to || []).forEach(function (t, i) {
                    if (t.t === 'e' && t.n === s.e[firstAliveEnemy].name) toIdx = i;
                });
                actions.appendChild(_btn('⚔️ Atacar', 'primary', { act: 'attack', tgt: toIdx }));
                actions.appendChild(_btn('Golpe Poderoso', '', { act: 'skill', skill: 'power_strike', tgt: toIdx }));
                actions.appendChild(_btn('Bola de Fogo', '', { act: 'skill', skill: 'fireball', tgt: toIdx }));
                actions.appendChild(_btn('Cura', '', { act: 'skill', skill: 'heal' }));
            }
            actions.appendChild(_btn('Fugir', '', { act: 'flee' }));
        } else {
            actions.appendChild(el('div', 'c2-banner', '⏳ Turno de ' + (activeT.n || '?') + '...'));
        }
        app.appendChild(actions);
    }

    function _btn(label, extraCls, data) {
        var b = el('button', 'c2-btn' + (extraCls ? ' ' + extraCls : ''), label);
        Object.keys(data).forEach(function (k) { b.dataset[k] = String(data[k]); });
        b.addEventListener('click', _onActionClick);
        return b;
    }

    async function _onActionClick(ev) {
        var b = ev.currentTarget;
        var a = { type: b.dataset.act };
        if (b.dataset.tgt) a.target = parseInt(b.dataset.tgt, 10);
        if (b.dataset.skill) a.skill_id = b.dataset.skill;
        try {
            var s = await _doAction(a);
            if (s.error) { console.error('[C2]', s.error); return; }
            render(s);
        } catch (e) {
            console.error('[C2] action failed', e);
        }
    }

    async function init() {
        _token = _getToken();
        var app = $('app');
        if (!_token) {
            app.appendChild(el('div', 'c2-banner', 'Token ausente.'));
            _hideLoading(); return;
        }
        try {
            if (window.ApiDiscovery) _apiBase = await window.ApiDiscovery.getBase();
            var s = await _fetchState();
            _hideLoading();
            render(s);
        } catch (e) {
            app.appendChild(el('div', 'c2-banner', 'Erro ao carregar combate.'));
            _hideLoading();
            console.error('[C2] init', e);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
})();

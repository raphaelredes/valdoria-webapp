/* Combat2 — frontend MINIMO.
 * Iniciativa + dado 3D + turno + ataque + HP + vitoria/derrota + fugir.
 * Request-response puro: cada acao = 1 POST. Sem polling.
 */
(function () {
    'use strict';

    var _s = null, _token = null, _base = '', _dice = null;

    function $(id) { return document.getElementById(id); }
    function el(tag, cls, txt) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
    }

    async function _call(method, body) {
        var o = { method: method, headers: { 'Authorization': 'Bearer ' + _token } };
        if (body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
        var r = await fetch(_base + '/api/combat2', o);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
    }

    function _row(c, active) {
        var container = el('div');
        var r = el('div', 'row' + (active ? ' active' : '') + (!c.alive ? ' dead' : ''));
        r.appendChild(el('span', null, (c.t === 'p' ? '🗡️ ' : '👹 ') + c.name));
        r.appendChild(el('span', null, c.hp + '/' + c.mhp));
        container.appendChild(r);
        var bar = el('div', 'bar');
        var fill = el('div', 'fill' + ((c.hp / c.mhp) < .33 ? ' low' : ''));
        fill.style.width = Math.max(0, (c.hp / c.mhp) * 100) + '%';
        bar.appendChild(fill);
        container.appendChild(bar);
        return container;
    }

    function _button(label, primary, onclick) {
        var b = el('button', 'btn' + (primary ? ' primary' : ''), label);
        b.addEventListener('click', onclick);
        return b;
    }

    function render(s) {
        _s = s;
        var app = $('app');
        while (app.firstChild) app.removeChild(app.firstChild);
        var wrap = el('div', 'c2');

        wrap.appendChild(el('div', 'phase', s.phase + ' · rodada ' + s.round));

        if (s.phase === 'victory' || s.phase === 'defeat' || s.phase === 'fled') {
            var label = { victory: 'VITORIA', defeat: 'DERROTA', fled: 'VOCE FUGIU' }[s.phase];
            wrap.appendChild(el('div', 'end ' + s.phase, label));
            app.appendChild(wrap);
            return;
        }

        // Iniciativa: tela de init lista a ordem rolada
        if (s.phase === 'init') {
            wrap.appendChild(el('div', 'phase', 'Iniciativa'));
            s.order.forEach(function (c) {
                var r = el('div', 'row');
                r.appendChild(el('span', null, (c.t === 'p' ? '🗡️ ' : '👹 ') + c.name));
                r.appendChild(el('span', null, 'd20 = ' + c.init));
                wrap.appendChild(r);
            });
            wrap.appendChild(_button('⚔️ Iniciar Combate', true, function () { _act({ type: 'start' }); }));
            app.appendChild(wrap);
            return;
        }

        // Fase active: renderiza todos
        s.order.forEach(function (c, i) {
            wrap.appendChild(_row(c, i === s.active_idx));
        });

        if (s.log && s.log.length) {
            var log = el('div', 'log');
            s.log.slice(-6).forEach(function (line) { log.appendChild(el('div', null, line)); });
            wrap.appendChild(log);
        }

        var actions = el('div', 'actions');
        var isPlayerTurn = s.active_idx === s.p_idx;
        if (isPlayerTurn) {
            var firstEnemyIdx = -1;
            s.order.forEach(function (c, i) { if (firstEnemyIdx < 0 && c.t === 'e' && c.alive) firstEnemyIdx = i; });
            if (firstEnemyIdx >= 0) {
                actions.appendChild(_button('⚔️ Atacar', true, function () { _act({ type: 'attack', target: firstEnemyIdx }); }));
            }
            actions.appendChild(_button('🏃 Fugir', false, function () { _act({ type: 'flee' }); }));
        } else {
            actions.appendChild(el('div', 'phase', '⏳ Turno de ' + (s.order[s.active_idx] ? s.order[s.active_idx].name : '?')));
        }
        wrap.appendChild(actions);

        app.appendChild(wrap);
    }

    function _showDice(result, cb) {
        // Usa dice-3d se disponivel, senao callback imediato
        if (!window.Dice3D) { cb && cb(); return; }
        var wrap = el('div', 'dice-wrap');
        var canvas = el('canvas'); canvas.id = 'dice-canvas'; canvas.width = 140; canvas.height = 140;
        wrap.appendChild(canvas);
        $('app').insertBefore(wrap, $('app').firstChild);
        try {
            _dice = new window.Dice3D(canvas, { sides: 20 });
            _dice.roll(result, function () {
                setTimeout(function () { wrap.remove(); cb && cb(); }, 600);
            });
        } catch (e) { wrap.remove(); cb && cb(); }
    }

    async function _act(action) {
        try {
            var prev = _s;
            var s = await _call('POST', action);
            if (s.error) { console.error('[C2]', s.error); return; }
            // Mostra dado 3D se houve ataque
            if (s.last && s.last.roll && (!prev || !prev.last || prev.last !== s.last)) {
                _showDice(s.last.roll, function () { render(s); });
            } else {
                render(s);
            }
        } catch (e) { console.error('[C2]', e); }
    }

    async function init() {
        var params = new URLSearchParams(location.search);
        _token = params.get('token') || '';
        if (!_token) { $('app').textContent = 'Token ausente.'; return; }
        try {
            if (window.ApiDiscovery) _base = await window.ApiDiscovery.getBase();
            var s = await _call('GET');
            if (s.error) { $('app').textContent = s.error; return; }
            render(s);
        } catch (e) { $('app').textContent = 'Erro: ' + e.message; }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

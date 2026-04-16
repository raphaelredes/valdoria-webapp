/* Combat2 WebApp — frontend real.
 *
 * Render copiado de simuladores/combate.html (mesma UI/animacoes).
 * Diferenca: em vez de logica mock JS, consome /api/combat2 do backend.
 * Backend retorna {state, events} — frontend anima events em sequencia
 * e sincroniza com state autoritativo ao final.
 *
 * Boot: carrega THREE -> dice-3d -> GET /api/combat2 -> render(state).
 */
(function () {
    'use strict';

    var BASE = 'https://jogo.lendasdevaldoria.com.br';
    var _qs = new URLSearchParams(location.search);
    var TOKEN = _qs.get('token') || '';
    var API_BASE = (_qs.get('api') || '').replace(/\/+$/, '');
    var ORIGIN_APP = (_qs.get('origin') || '').trim();
    if (!ORIGIN_APP && API_BASE) {
        ORIGIN_APP = 'game';
    }
    var USER_ID = parseInt(_qs.get('uid') || '0', 10);

    var currentState = null;
    var _selectingTarget = false;
    var _pendingSkill = null;
    var _activeDiceClose = null;
    var _skipInit = false;
    /** Quando true, interrompe replays de eventos do lote atual e aplica state final + resumo. */
    var _skipReplayBatch = false;
    var _leavingCombat = false;
    /** Ultima faixa BGM pedida (evita reiniciar combat em todo render). */
    var _combat2MusicKey = '';

    function tryValdoriaAudioInit() {
        try {
            if (typeof ValdoriaAudio !== 'undefined' && ValdoriaAudio.init) {
                ValdoriaAudio.init();
            }
        } catch (e) {}
    }

    function unlockCombat2OscFallback() {
        try {
            window._audioUnlocked = true;
        } catch (e) {}
    }

    function syncCombat2Music(s) {
        if (!s || typeof ValdoriaAudio === 'undefined' || !ValdoriaAudio.play) {
            return;
        }
        var ph = s.ph || '';
        if (ph === 'victory' || ph === 'defeat') {
            var k = ph === 'victory' ? 'victory' : 'defeat';
            if (_combat2MusicKey !== k) {
                _combat2MusicKey = k;
                ValdoriaAudio.play(k);
            }
            return;
        }
        if (ph === 'fled') {
            if (_combat2MusicKey !== 'fled') {
                _combat2MusicKey = 'fled';
                try {
                    ValdoriaAudio.playSFX('sfx_success');
                } catch (eF) {}
            }
            return;
        }
        if (ph === 'intro' || ph === 'init' || ph === 'init_done' || ph === 'active') {
            if (_combat2MusicKey !== 'combat') {
                _combat2MusicKey = 'combat';
                ValdoriaAudio.play('combat');
            }
        }
    }

    /* ============================================================
     * Sair do combate: mesma rota que combat.js (transition -> URL)
     * ============================================================ */
    async function leaveCombatToOrigin() {
        if (_leavingCombat) return;
        _leavingCombat = true;
        var tg = window.Telegram && window.Telegram.WebApp;
        var ph = (currentState && currentState.ph) || 'victory';
        var result = ph === 'defeat' ? 'defeat' : (ph === 'fled' ? 'fled' : 'victory');
        var origin = ORIGIN_APP || (API_BASE ? 'game' : '');
        if (!API_BASE || !TOKEN || !origin || USER_ID <= 0) {
            console.warn('[COMBAT2]', 'leaveCombat_missing_params', {
                hasApi: !!API_BASE,
                hasToken: !!TOKEN,
                origin: origin,
                uid: USER_ID
            });
            try { if (tg) tg.close(); } catch (e0) {}
            return;
        }
        var headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + TOKEN
        };
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
            headers['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData;
        }
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            headers['X-Idempotency-Key'] = window.crypto.randomUUID();
        }
        var url = API_BASE + '/api/webapp/transition';
        var body = JSON.stringify({
            from: 'combat',
            to: origin,
            user_id: USER_ID,
            payload: { result: result }
        });
        try {
            var resp = await fetch(url, { method: 'POST', headers: headers, body: body });
            var data = {};
            try { data = await resp.json(); } catch (eJson) {}
            if (data.url) {
                try {
                    if (data.toast) {
                        localStorage.setItem('valdoria_pending_toast', data.toast);
                    }
                } catch (eLs) {}
                window.__valdoria_transitioning = true;
                window.location.replace(data.url);
                return;
            }
            if (data.fallback === 'close') {
                window.__valdoria_transitioning = true;
                try { if (tg) tg.close(); } catch (e1) {}
                return;
            }
            console.error('[COMBAT2]', 'leaveCombat_unexpected', resp.status, data);
        } catch (eNet) {
            console.error('[COMBAT2]', 'leaveCombat_fetch', eNet);
        }
        window.__valdoria_transitioning = true;
        try { if (tg) tg.close(); } catch (e2) {}
    }

    /* ============================================================
     * API CLIENT
     * ============================================================ */
    async function apiCall(method, body) {
        var opts = {
            method: method,
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        };
        if (body) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        var url = API_BASE + '/api/combat2';
        var r;
        try {
            r = await fetch(url, opts);
        } catch (netErr) {
            console.error('[COMBAT2]', 'fetch_network', {
                method: method,
                apiHost: (function () {
                    try { return new URL(API_BASE || location.origin).host; } catch (e) { return ''; }
                })(),
                message: netErr && netErr.message
            }, netErr || '');
            throw netErr;
        }
        if (!r.ok) {
            var errDetail = '';
            var errObj = null;
            var rawText = '';
            try {
                rawText = await r.clone().text();
                errObj = JSON.parse(rawText);
                errDetail = (errObj.detail || errObj.error || errObj.hint || '').toString();
            } catch (parseEx) {
                errDetail = (rawText || r.statusText || '').slice(0, 200);
            }
            console.error('[COMBAT2]', 'api_http_error', {
                method: method,
                status: r.status,
                statusText: r.statusText,
                urlPath: '/api/combat2',
                apiBaseLen: (API_BASE || '').length,
                bodyError: errObj && errObj.error,
                bodyDetail: errObj && errObj.detail,
                bodyHint: errObj && errObj.hint
            });
            var human = 'HTTP ' + r.status;
            if (errDetail) human += ' — ' + errDetail;
            if (r.status === 503 && errObj && errObj.hint) human += ' (' + errObj.hint + ')';
            throw new Error(human);
        }
        return await r.json();
    }

    async function fetchState() { return apiCall('GET'); }
    async function dispatchAction(action) { return apiCall('POST', action); }

    /* ============================================================
     * HTML HELPERS
     * ============================================================ */
    function setHTML(node, html) {
        while (node.firstChild) node.removeChild(node.firstChild);
        var range = document.createRange();
        range.selectNodeContents(node);
        var frag = range.createContextualFragment(html);
        node.appendChild(frag);
    }

    function escHtml(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    /** Combate com 5+ participantes: oferece pular animações do lote de eventos (vários inimigos). */
    function shouldOfferBatchSkip() {
        return !!(currentState && currentState.order && currentState.order.length > 4 && currentState.ph === 'active');
    }

    function syncAttackOutcomeFromEvent(ev) {
        if (!currentState || !ev) return;
        var target = currentState.order[ev.tIdx];
        if (!target) return;
        if (ev.hit && ev.newHp != null) {
            target.hp = ev.newHp;
            target.alive = ev.newHp > 0;
            render(currentState);
            var uid = ev.tIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.tIdx;
            arenaStrikeFromEvent(ev);
        } else {
            render(currentState);
        }
    }

    function buildBatchSummaryHtml(events) {
        var parts = ['<div class="c2-sum-title">Resumo da sequência</div><div class="c2-sum-list">'];
        var any = false;
        for (var i = 0; i < events.length; i++) {
            var ev = events[i];
            if (!ev) continue;
            if (ev.kind === 'attack' || ev.kind === 'oa') {
                any = true;
                var oa = ev.kind === 'oa';
                var an = escHtml(ev.actorName || '');
                var tn = escHtml(ev.targetName || '');
                if (!ev.hit) {
                    var why = ev.miss_reason === 'falha_critica' ? 'Falha crítica (1 natural)' : 'Não acertou';
                    parts.push('<div class="c2-sum-row miss"><span class="c2-sum-ico">🛡</span><div class="c2-sum-body"><div class="c2-sum-line">' +
                        (oa ? 'Ataque de oportunidade: ' : '') + an + ' → ' + tn + '</div><div class="c2-sum-sub">' + escHtml(why) +
                        ' · d20+' + (ev.atk != null ? ev.atk : '?') + ' vs CA ' + (ev.ac != null ? ev.ac : '?') + '</div></div></div>');
                } else {
                    var dmg = ev.dmgTotal != null ? ev.dmgTotal : '?';
                    var dead = ev.newHp != null && ev.newHp <= 0;
                    var tags = [];
                    if (ev.crit) tags.push('Crítico');
                    if (dead) tags.push('Eliminado');
                    parts.push('<div class="c2-sum-row hit' + (dead ? ' fallen' : '') + '"><span class="c2-sum-ico">' + (dead ? '💀' : '⚔') +
                        '</span><div class="c2-sum-body"><div class="c2-sum-line">' + (oa ? 'Oportunidade: ' : '') + an + ' → ' + tn +
                        '</div><div class="c2-sum-sub">−' + dmg + ' PV' + (tags.length ? ' · ' + escHtml(tags.join(' · ')) : '') +
                        (ev.oldHp != null && ev.newHp != null ? ' · PV ' + ev.oldHp + ' → ' + ev.newHp : '') + '</div></div></div>');
                }
            } else if (ev.kind === 'flee') {
                any = true;
                parts.push('<div class="c2-sum-row flee"><span class="c2-sum-ico">🏃</span><div class="c2-sum-body"><div class="c2-sum-line">' +
                    (ev.success ? 'Fuga bem-sucedida' : 'Falha na fuga') + '</div><div class="c2-sum-sub">Teste ' +
                    (ev.d20 != null ? 'd20=' + ev.d20 : '') + (ev.mod != null ? ' + ' + ev.mod : '') +
                    (ev.total != null ? ' = ' + ev.total : '') + ' vs DC ' + (ev.dc != null ? ev.dc : '') + '</div></div></div>');
            } else if (ev.kind === 'round') {
                parts.push('<div class="c2-sum-row round"><span class="c2-sum-ico">🔄</span><div class="c2-sum-body"><div class="c2-sum-line">Rodada ' +
                    escHtml(String(ev.rn != null ? ev.rn : '')) + '</div></div></div>');
            }
        }
        if (!any) {
            parts.push('<div class="c2-sum-empty">Nenhum ataque nesta ação — apenas atualização de estado.</div>');
        }
        parts.push('</div>');
        return parts.join('');
    }

    function showBatchSummaryPopup(events) {
        if (!events || !events.length) return;
        var existing = document.getElementById('c2-batch-summary');
        if (existing) existing.remove();
        var ov = document.createElement('div');
        ov.id = 'c2-batch-summary';
        ov.className = 'c2-batch-summary-overlay';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        var card = document.createElement('div');
        card.className = 'c2-batch-summary-card';
        setHTML(card, buildBatchSummaryHtml(events));
        var foot = document.createElement('div');
        foot.className = 'c2-batch-summary-foot';
        var ok = document.createElement('button');
        ok.type = 'button';
        ok.className = 'c2-batch-summary-ok';
        ok.textContent = 'Entendi';
        ok.addEventListener('click', function () { ov.remove(); });
        foot.appendChild(ok);
        card.appendChild(foot);
        ov.appendChild(card);
        document.body.appendChild(ov);
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    }

    /* ============================================================
     * RENDER (copiado do simulador, tudo via currentState do backend)
     * ============================================================ */
    function buildTurnQueue(s) {
        if (!s.order || !s.order.length) return '';
        var list;
        if (s.ph === 'init') {
            list = s.order.filter(function (c) { return c.initRevealed; });
            list.sort(function (a, b) { return b.init - a.init || (a.t === 'p' ? -1 : 1); });
        } else { list = s.order.slice(); }
        var parts = ['<div class="turn-queue" id="turn-queue">'];
        parts.push('<span class="tl-round">R' + s.rn + '</span>');
        for (var i = 0; i < list.length; i++) {
            var entry = list[i];
            var origIdx = s.order.indexOf(entry);
            var cls = 'tl-node';
            if (entry.t === 'e') cls += ' t-enemy';
            else if (entry.t === 'a') cls += ' t-ally';
            if (origIdx === s.active_idx && s.ph === 'active') cls += ' active';
            else if (s.ph === 'active') cls += ' forecast';
            if (!entry.alive) cls += ' dead';
            var id = 'tq-' + entry.n.replace(/[^a-zA-Z0-9]/g, '_');
            parts.push('<div class="' + cls + '" id="' + id + '" title="' + escHtml(entry.n) + '"><div class="tl-ico">' + escHtml(entry.ico) + '</div></div>');
        }
        parts.push('</div>');
        return parts.join('');
    }

    function captureQueueRects() {
        var rects = {};
        document.querySelectorAll('#turn-queue .tl-node').forEach(function (el) { rects[el.id] = el.getBoundingClientRect(); });
        return rects;
    }

    function animateQueueTransition(oldRects) {
        requestAnimationFrame(function () {
            document.querySelectorAll('#turn-queue .tl-node').forEach(function (el) {
                var newRect = el.getBoundingClientRect();
                var old = oldRects[el.id];
                if (old) {
                    var dx = old.left - newRect.left;
                    if (Math.abs(dx) > 2) {
                        el.style.transition = 'none';
                        el.style.transform = 'translateX(' + dx + 'px)';
                        requestAnimationFrame(function () {
                            el.style.transition = 'transform .55s cubic-bezier(.34,1.56,.64,1)';
                            el.style.transform = '';
                        });
                    }
                } else { el.classList.add('tq-enter'); }
            });
        });
    }

    function buildBattlefield(s) {
        var ROW_LABELS = ['retaguarda inimiga', 'frente inimiga', 'frente aliada', 'retaguarda aliada'];
        var grid = [[null, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]];
        function findCol(row) {
            var order = [1, 2, 0, 3];
            for (var i = 0; i < order.length; i++) if (grid[row][order[i]] === null) return order[i];
            return -1;
        }
        s.order.forEach(function (c, idx) {
            if (c.t === 'e') {
                var col = findCol(1);
                if (col !== -1) grid[1][col] = { uid: 'enemy_' + idx, utype: 'enemy', u: c };
            }
        });
        var p = s.order[s.p_idx];
        var pcol = findCol(2);
        if (pcol !== -1) grid[2][pcol] = { uid: 'player', utype: 'player', u: p };
        var activeId = null;
        var active = s.order[s.active_idx];
        if (active) activeId = active.t === 'p' ? 'player' : 'enemy_' + s.active_idx;
        var html = '<div class="battlefield">';
        for (var row = 0; row < 4; row++) {
            var zoneClass = row < 2 ? ' enemy-zone' : ' ally-zone';
            html += '<div class="row-label' + zoneClass + '">' + escHtml(ROW_LABELS[row]) + '</div>';
            html += '<div class="bf-row">';
            for (var col = 0; col < 4; col++) html += buildCell(grid[row][col], activeId);
            html += '</div>';
            if (row === 1) html += '<div class="bf-divider"></div>';
        }
        html += '</div>';
        return html;
    }

    function buildCell(cell, activeId) {
        if (!cell) return '<div class="cell"></div>';
        var u = cell.u, utype = cell.utype, uid = cell.uid;
        var classes = 'cell occupied ' + utype;
        if (uid === activeId) {
            classes += ' active-turn';
            if (utype === 'player' && currentState && currentState.ph === 'active') classes += ' player-turn-active';
        }
        if (u.initRolling) classes += ' init-rolling';
        if (!u.alive) classes += ' dead';
        if (_selectingTarget && utype === 'enemy' && u.alive) classes += ' selectable';

        var inner = '';
        var showInitBadge = currentState && (currentState.ph === 'intro' || currentState.ph === 'init' || currentState.ph === 'init_done');
        if (showInitBadge) {
            if (u.initRevealed) inner += '<div class="cell-init">🎲' + u.init + '</div>';
            else if (u.init !== undefined) inner += '<div class="cell-init pending">?</div>';
        }
        if (u.ac !== undefined) inner += '<div class="cell-ac">' + escHtml(u.ac) + '</div>';
        if (utype === 'enemy' && u.it) {
            var it = (u.it.ic || '') + (u.it.lb ? ' ' + u.it.lb : '');
            inner += '<div class="intent">' + escHtml(it) + '</div>';
        }
        inner += '<div class="unit-row"><div class="unit-side left"></div><div class="unit-ico">' + escHtml(u.ico) + '</div><div class="unit-side right"></div></div>';
        inner += '<div class="cell-bars">';
        var hpPct = Math.max(0, Math.min(100, Math.round((u.hp / u.mhp) * 100)));
        var hpCls = hpPct > 60 ? 'hp-high' : (hpPct > 25 ? 'hp-mid' : 'hp-low');
        var fillCls = hpPct > 60 ? 'fill-hp-high' : (hpPct > 25 ? 'fill-hp-mid' : 'fill-hp-low');
        inner += '<div class="bar-row"><div class="mini-bar"><div class="fill ' + fillCls + '" style="width:' + hpPct + '%"></div></div><div class="bar-num ' + hpCls + '">' + u.hp + '/' + u.mhp + '</div></div>';
        if (u.res && u.res.max > 0) {
            var rPct = Math.max(0, Math.min(100, Math.round((u.res.value / u.res.max) * 100)));
            var rCls = u.res.type === 'mp' ? 'fill-res-mp' : (u.res.type === 'energia' ? 'fill-res-energia' : 'fill-res-vigor');
            inner += '<div class="bar-row"><div class="mini-bar"><div class="fill ' + rCls + '" style="width:' + rPct + '%"></div></div><div class="bar-num res ' + u.res.type + '">' + u.res.ico + ' ' + u.res.value + '/' + u.res.max + '</div></div>';
        }
        inner += '</div>';
        return '<div class="' + classes + '" data-unit-id="' + uid + '" data-clickable="1">' + inner + '</div>';
    }

    function render(s) {
        currentState = s;
        try {
            syncCombat2Music(s);
        } catch (eM) {}
        var app = document.getElementById('app');
        var ph = s.ph;
        var html = '';

        if (ph === 'victory' || ph === 'defeat' || ph === 'fled') {
            var title = { victory: 'VITÓRIA', defeat: 'DERROTA', fled: 'FUGIU' }[ph];
            var narr = { victory: 'Todos os inimigos caíram por suas mãos.', defeat: 'Você cai inconsciente no chão...', fled: 'Você escapa para longe da ameaça.' }[ph];
            html = '<div class="resolution ' + ph + '"><div class="res-title">' + title + '</div>';
            html += '<div class="res-narr">' + narr + '</div>';
            /* Bloco de recompensas — apenas em vitoria */
            if (ph === 'victory' && s.rewards) {
                var r = s.rewards;
                var xpPct = Math.min(100, Math.round((r.newXp / r.threshold) * 100));
                html += '<div class="res-rewards">';
                html += '<div class="rr-section-title">Recompensas</div>';
                html += '<div class="rr-xp"><div class="rr-xp-row">';
                html += '<span class="rr-xp-lbl">Experiência</span><span class="rr-xp-val">+' + r.xp + ' XP</span>';
                html += '</div><div class="rr-xp-bar"><div class="rr-xp-fill" data-to="' + xpPct + '" style="width:0%"></div></div>';
                html += '<div class="rr-xp-meta">Nível ' + r.oldLvl + ' · ' + r.newXp + ' / ' + r.threshold + ' XP</div>';
                html += '</div>';
                if (r.levelUp) html += '<div class="rr-levelup">⭐ NÍVEL ' + r.newLvl + ' ALCANÇADO ⭐</div>';
                html += '<div class="rr-loot-row gold"><span class="rr-ico"><span class="vi vi-coin sm" aria-hidden="true"></span></span><span class="rr-name">Valdoritas</span><span class="rr-qty">+' + r.gold + '</span></div>';
                (r.items || []).forEach(function (it, i) {
                    html += '<div class="rr-loot-row" style="animation-delay:' + (1.4 + i * 0.15) + 's"><span class="rr-ico">' + escHtml(it.ico || '🎁') + '</span><span class="rr-name">' + escHtml(it.n) + '</span><span class="rr-qty rare-' + escHtml(it.rare || 'comum') + '">' + escHtml(it.rare || 'comum') + '</span></div>';
                });
                if (!(r.items || []).length) html += '<div class="rr-loot-empty">Nenhum item caiu desta vez.</div>';
                html += '</div>';
            } else {
                html += '<div class="res-log">';
                (s.log || []).slice(-8).forEach(function (line) { html += '<div>' + escHtml(line) + '</div>'; });
                html += '</div>';
            }
            html += '<div class="action-bar"><button class="action-btn primary full-width" data-act="close">✓ Continuar</button></div>';
            html += '</div>';
            setHTML(app, html);
            bindActions();
            /* Anima a barra de XP */
            if (ph === 'victory' && s.rewards) {
                var xpFill = document.querySelector('.rr-xp-fill');
                if (xpFill) setTimeout(function () { xpFill.style.width = xpFill.getAttribute('data-to') + '%'; }, 700);
            }
            return;
        }

        if (ph === 'intro' || ph === 'init' || ph === 'init_done') {
            if (ph === 'intro') {
                html += '<div class="epic-banner"><div class="epic-title">⚔ COMBATE INICIADO ⚔</div><div class="epic-sub">Prepare-se para a batalha</div></div>';
            } else { html += buildTurnQueue(s); }
            html += '<div class="arena-header compact-header"><div class="arena-subtitle">' +
                (ph === 'intro' ? 'Posicionamento' : ph === 'init' ? 'Rolando Iniciativa...' : 'Ordem de Combate') +
                '</div></div>';
            html += buildBattlefield(s);
            if (ph === 'intro') {
                html += '<div class="epic-cta-overlay"><button class="epic-cta-btn" data-act="next"><div class="epic-cta-d3d" id="ctaDiceMount"></div><span class="epic-cta-text">Começar Rolagens<br/>de Iniciativa</span></button></div>';
            } else if (ph === 'init') {
                html += '<div class="epic-cta-overlay"><button class="epic-cta-btn" data-act="skip-init"><span class="epic-cta-icon">⏭️</span><span class="epic-cta-text">Pular<br/>Rolagens</span></button></div>';
            } else {
                html += '<div class="epic-cta-overlay"><button class="epic-cta-btn" data-act="start"><span class="epic-cta-icon">⚔️</span><span class="epic-cta-text">Começar<br/>Combate</span></button></div>';
            }
            setHTML(app, html);
            bindActions();
            return;
        }

        /* Active */
        html += buildTurnQueue(s);
        var activeNow = s.order[s.active_idx];
        var isPlayerTurn = s.active_idx === s.p_idx;
        if (activeNow) {
            if (isPlayerTurn) html += '<div class="current-turn player-turn"><span class="ct-chevron">▸</span><span class="ct-text">SEU TURNO</span><span class="ct-chevron">◂</span></div>';
            else html += '<div class="current-turn"><span class="ct-ico">' + escHtml(activeNow.ico) + '</span><span class="ct-label">Turno de</span><span class="ct-name">' + escHtml(activeNow.n) + '</span></div>';
        }
        html += '<div class="arena-header compact-header"><div class="arena-subtitle"><span class="round-badge">R' + s.rn + '</span> ' + (s.biome || 'Arena') + '</div></div>';
        html += buildBattlefield(s);

        if (isPlayerTurn) {
            if (_selectingTarget) {
                html += '<div class="action-bar"><div class="action-btns-row"><button class="action-btn" data-act="cancel-target">✕ Cancelar Ataque</button></div></div>';
            } else {
                html += '<div class="action-bar"><div class="action-btns-grid">';
                html += '<button class="action-btn primary" data-act="attack">⚔️ Atacar</button>';
                html += '<button class="action-btn" data-act="skills">✨ Habilidades</button>';
                html += '<button class="action-btn" data-act="bag">🎒 Mochila</button>';
                html += '<button class="action-btn" data-act="flee">🏃 Fugir</button>';
                html += '</div>';
                html += '<div class="action-btns-grid action-btns-sub">';
                html += '<button type="button" class="action-btn secondary" data-act="dodge">🛡️ Esquivar</button>';
                html += '<button type="button" class="action-btn secondary" data-act="disengage">➡️ Desengajar</button>';
                html += '<button type="button" class="action-btn secondary" data-act="pass">⏭ Pular</button>';
                html += '<button type="button" class="action-btn secondary" data-act="log">📜 Log</button>';
                html += '</div></div>';
            }
        }

        setHTML(app, html);
        bindActions();
    }

    /* ============================================================
     * BINDING
     * ============================================================ */
    function bindActions() {
        document.querySelectorAll('[data-act]').forEach(function (b) { b.addEventListener('click', onBtnClick); });
        /* Cards clicaveis */
        document.querySelectorAll('[data-clickable="1"]').forEach(function (c) {
            c.addEventListener('click', function (ev) {
                if (ev.target.closest('button')) return;
                var uid = this.getAttribute('data-unit-id');
                if (_selectingTarget && uid && uid.indexOf('enemy_') === 0) {
                    showTargetConfirm(parseInt(uid.slice(6), 10));
                    return;
                }
                openUnitDetail(uid);
            });
        });
        /* Mini Dice3D no CTA intro */
        var ctaMount = document.getElementById('ctaDiceMount');
        if (ctaMount && window.Dice3D && !ctaMount._d3d) {
            try {
                var dCta = new Dice3D(ctaMount, { size: 56, dieType: 'd20', duration: 2400 });
                ctaMount._d3d = dCta;
                (function loopCta() {
                    if (!document.body.contains(ctaMount)) { try { dCta.dispose(); } catch (e) {} return; }
                    dCta.roll(1 + Math.floor(Math.random() * 20), function () { setTimeout(loopCta, 600); });
                })();
            } catch (e) { console.warn('[C2] CTA dice failed', e); }
        }
    }

    async function onBtnClick(ev) {
        tryValdoriaAudioInit();
        unlockCombat2OscFallback();
        var b = ev.currentTarget;
        var act = b.dataset.act;
        if (act === 'close') {
            await leaveCombatToOrigin();
            return;
        }
        if (act === 'cancel-target') { _selectingTarget = false; _pendingSkill = null; render(currentState); return; }
        if (act === 'skills') { openSkillsPanel(); return; }
        if (act === 'bag') { openBagPanel(); return; }
        if (act === 'attack') {
            _pendingSkill = null;
            var aliveIdxs = [];
            if (currentState && currentState.order) {
                for (var ai = 0; ai < currentState.order.length; ai++) {
                    var oc = currentState.order[ai];
                    if (oc && oc.t === 'e' && oc.alive) aliveIdxs.push(ai);
                }
            }
            if (aliveIdxs.length === 1) { showTargetConfirm(aliveIdxs[0]); return; }
            _selectingTarget = true;
            render(currentState);
            return;
        }
        if (act === 'next') { await remoteAction({ type: 'next' }); animInitFromBackend(); return; }
        if (act === 'skip-init') {
            _skipInit = true;
            if (_activeDiceClose) _activeDiceClose();
            return;
        }
        if (act === 'start') { closeInitiativeOrderPopup(); await remoteAction({ type: 'start' }); return; }
        if (act === 'flee') { await remoteAction({ type: 'flee' }); return; }
        if (act === 'pass') { await remoteAction({ type: 'pass' }); return; }
        if (act === 'dodge') { await remoteAction({ type: 'dodge' }); return; }
        if (act === 'disengage') { await remoteAction({ type: 'disengage' }); return; }
        if (act === 'log') { openCombatLog(); return; }
    }

    async function confirmAndAttack(tgtIdx) {
        _selectingTarget = false;
        _pendingSkill = null;
        render(currentState);
        await remoteAction({ type: 'attack', target: tgtIdx });
    }

    /* ============================================================
     * ACTIONS: POST /api/combat2 + replay events
     * ============================================================ */
    async function remoteAction(action) {
        try {
            var resp = await dispatchAction(action);
            if (resp.error) { console.warn('[C2]', resp.error); return; }
            var evs = resp.events || [];
            var offerSkip = shouldOfferBatchSkip();
            _skipReplayBatch = false;
            if (evs.length) {
                for (var i = 0; i < evs.length; i++) {
                    if (_skipReplayBatch) {
                        currentState = resp.state;
                        render(currentState);
                        showBatchSummaryPopup(evs);
                        _skipReplayBatch = false;
                        break;
                    }
                    await playEvent(evs[i], offerSkip);
                }
            }
            currentState = resp.state;
            render(currentState);
            if (currentState.ph === 'init_done') showInitiativeOrderPopup();
        } catch (e) { console.error('[C2] action failed', e); }
    }

    async function playEvent(ev, offerSkip) {
        if (ev.kind === 'attack' || ev.kind === 'oa') return animateAttackEvent(ev, offerSkip);
        if (ev.kind === 'flee') return animateFleeEvent(ev, offerSkip);
        if (ev.kind === 'round') {
            currentState.rn = ev.rn;
            render(currentState);
            if (_skipReplayBatch) return;
            await sleep(400);
        }
    }

    async function animateAttackEvent(ev, offerSkip) {
        if (_skipReplayBatch) {
            syncAttackOutcomeFromEvent(ev);
            return;
        }
        var actor = currentState.order[ev.aIdx];
        var target = currentState.order[ev.tIdx];
        if (!actor || !target) return;
        /* Ajusta HP local para o antes-do-evento (backend ja aplicou no state final) */
        if (ev.hit) target.hp = ev.oldHp;
        render(currentState);
        if (_skipReplayBatch) {
            syncAttackOutcomeFromEvent(ev);
            return;
        }
        await sleep(200);
        if (_skipReplayBatch) {
            syncAttackOutcomeFromEvent(ev);
            return;
        }
        var actionLabel = ev.kind === 'oa' ? 'Ataque de oportunidade → ' + target.n : 'Ataca ' + target.n + ' (CA ' + target.ac + ')';

        /* Overlay 1: d20 */
        await new Promise(function (x) {
            showDice(ev.d20, x, actor, actionLabel, {
                offerBatchSkip: !!offerSkip,
                postResult: function () {
                    if (ev.crit) return { title: '⚡ ACERTO CRÍTICO', sub: 'd20 = 20 — dano em dobro', cls: 'crit' };
                    if (ev.hit) return { title: '✅ ACERTOU', sub: ev.d20 + ' + ' + ev.atk + ' = ' + ev.total + ' ≥ CA ' + ev.ac, cls: 'hit' };
                    if (ev.miss_reason === 'falha_critica') return { title: '⚠ FALHA CRÍTICA', sub: 'd20 = 1 — escapa do alvo', cls: 'miss' };
                    return { title: '🛡 ' + target.n.toUpperCase() + ' DEFENDEU', sub: ev.d20 + ' + ' + ev.atk + ' = ' + ev.total + ' < CA ' + ev.ac, cls: 'miss' };
                },
                onAttackRollResolved: function () {
                    try {
                        if (ev.crit && typeof sfxCrit === 'function') {
                            sfxCrit();
                        } else if (ev.hit && typeof sfxHit === 'function') {
                            sfxHit();
                        } else if (typeof sfxMiss === 'function') {
                            sfxMiss();
                        }
                    } catch (eSfx) {}
                }
            });
        });

        if (_skipReplayBatch) {
            syncAttackOutcomeFromEvent(ev);
            return;
        }
        if (!ev.hit) return;

        /* Overlay 2: dado de dano + card animado */
        await showDamageDice(ev.dmgRolls, actor.die, ev.crit, actor, target, ev.oldHp, ev.newHp, ev.dmgMod, {
            offerBatchSkip: !!offerSkip,
            dmgType: ev.dmgType || 'slashing'
        });

        if (_skipReplayBatch) {
            syncAttackOutcomeFromEvent(ev);
            return;
        }
        /* Sincroniza HP local para o depois-do-evento */
        target.hp = ev.newHp;
        target.alive = ev.newHp > 0;
        render(currentState);
        var uid = ev.tIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.tIdx;
        arenaStrikeFromEvent(ev);
        await sleep(120);
    }

    async function animateFleeEvent(ev, offerSkip) {
        if (_skipReplayBatch) return;
        var p = currentState.order[currentState.p_idx];
        await showMessage('🏃 TENTANDO FUGIR', 'pre-npc', 'Teste de Acrobacia (DEX) DC ' + ev.dc, { offerBatchSkip: !!offerSkip });
        if (_skipReplayBatch) return;
        await new Promise(function (x) { showDice(ev.d20, x, p, 'Fuga · DC ' + ev.dc, { offerBatchSkip: !!offerSkip }); });
        if (_skipReplayBatch) return;
        if (ev.success) {
            try {
                if (typeof ValdoriaAudio !== 'undefined' && ValdoriaAudio.playSFX) {
                    ValdoriaAudio.playSFX('sfx_success');
                }
            } catch (eOk) {}
            await showMessage('💨 ESCAPOU!', 'hit', 'Total ' + ev.total + ' ≥ DC ' + ev.dc, { offerBatchSkip: !!offerSkip });
        } else {
            try {
                if (typeof sfxMiss === 'function') {
                    sfxMiss();
                } else if (typeof ValdoriaAudio !== 'undefined' && ValdoriaAudio.playSFX) {
                    ValdoriaAudio.playSFX('sfx_miss');
                }
            } catch (eMs) {}
            await showMessage('⚠ FALHOU', 'miss', 'Ataques de oportunidade dos inimigos!', { offerBatchSkip: !!offerSkip });
        }
    }

    /* ============================================================
     * INITIATIVE ANIMATION (client-only, usa init do backend)
     * ============================================================ */
    async function animInitFromBackend() {
        var s = currentState;
        s.ph = 'init';
        _skipInit = false;
        /* Marca todos como nao revelados inicialmente */
        s.order.forEach(function (c) { c.initRevealed = false; c.initRolling = false; });
        render(s);
        for (var i = 0; i < s.order.length; i++) {
            if (_skipInit) break;
            var c = s.order[i];
            c.initRolling = true;
            render(s);
            await sleep(i === 0 ? 600 : 2000);
            if (_skipInit) { c.initRolling = false; break; }
            var d20 = c.init - Math.floor((c.dex - 10) / 2);
            if (d20 < 1) d20 = 1; if (d20 > 20) d20 = 20;
            await new Promise(function (r) { showDice(d20, r, c, 'Iniciativa', { initiativeSequence: true }); });
            c.initRolling = false;
            c.initRevealed = true;
            if (_skipInit) break;
            var oldRects = captureQueueRects();
            render(s);
            animateQueueTransition(oldRects);
        }
        finishInit();
    }

    function finishInit() {
        var s = currentState;
        s.order.forEach(function (c) { c.initRevealed = true; c.initRolling = false; });
        s.order.sort(function (a, b) { return b.init - a.init || (a.t === 'p' ? -1 : 1); });
        s.p_idx = s.order.findIndex(function (c) { return c.t === 'p'; });
        s.ph = 'init_done';
        render(s);
        showInitiativeOrderPopup();
    }

    function showInitiativeOrderPopup() {
        if (document.getElementById('init-order-popup')) return;
        var ov = document.createElement('div');
        ov.id = 'init-order-popup';
        ov.className = 'iop-overlay';
        var card = document.createElement('div');
        card.className = 'iop-card';
        var html = '<div class="iop-title">⚔ Ordem de Iniciativa</div>';
        html += '<div class="iop-sub">Combate começa pelo topo</div>';
        html += '<div class="iop-list">';
        currentState.order.forEach(function (c, i) {
            var isPlayer = c.t === 'p';
            html += '<div class="iop-row' + (isPlayer ? ' player' : '') + '">';
            html += '<span class="iop-pos">' + (i + 1) + '</span>';
            html += '<span class="iop-ico">' + c.ico + '</span>';
            html += '<span class="iop-name">' + escHtml(c.n) + '</span>';
            html += '<span class="iop-roll">🎲 ' + c.init + '</span>';
            html += '</div>';
        });
        html += '</div>';
        setHTML(card, html);
        ov.appendChild(card);
        document.body.appendChild(ov);
    }

    function closeInitiativeOrderPopup() {
        var el = document.getElementById('init-order-popup');
        if (el) el.remove();
    }

    /* ============================================================
     * DICE OVERLAYS (copiado do simulador)
     * ============================================================ */
    function showDice(value, cb, actor, context, opts) {
        opts = opts || {};
        if (!window.Dice3D) { cb && cb(); return; }
        var isPlayer = actor && actor.t === 'p';
        var initiativeSequence = !!(opts && opts.initiativeSequence);
        var manualPlayerDice = isPlayer && !initiativeSequence;
        var duration = manualPlayerDice ? 5000 : (1500 + Math.floor(Math.random() * 1500));
        var INTERACT_MAX = 0.70;
        var ov = document.createElement('div');
        ov.className = 'dice-overlay';
        if (currentState && currentState.ph === 'active' && currentState.rn) {
            var rb = document.createElement('div');
            rb.className = 'dice-round-badge';
            rb.textContent = 'Rodada ' + currentState.rn;
            ov.appendChild(rb);
        }
        if (actor) {
            var hdr = document.createElement('div');
            hdr.className = 'dice-actor-label';
            hdr.textContent = actor.ico + ' ' + actor.n + ' — ' + (context || 'Rolando');
            ov.appendChild(hdr);
        }
        var container = document.createElement('div');
        container.className = 'dice-canvas-holder' + (manualPlayerDice ? ' clickable pulse-idle' : '');
        ov.appendChild(container);
        var resultEl = document.createElement('div');
        resultEl.className = 'dice-result-label';
        ov.appendChild(resultEl);
        var hint = document.createElement('div');
        hint.className = 'dice-hint';
        ov.appendChild(hint);
        var continueBtn = document.createElement('button');
        continueBtn.className = 'dice-continue-btn';
        continueBtn.textContent = 'Continuar →';
        continueBtn.style.display = 'none';
        var actionsWrap = document.createElement('div');
        actionsWrap.className = 'dice-actions-stack';
        actionsWrap.appendChild(continueBtn);
        if (opts.offerBatchSkip && shouldOfferBatchSkip()) {
            var skipAllBtn = document.createElement('button');
            skipAllBtn.type = 'button';
            skipAllBtn.className = 'dice-skip-batch-btn';
            skipAllBtn.textContent = 'Pular animações restantes';
            skipAllBtn.addEventListener('click', function (evClick) {
                evClick.stopPropagation();
                _skipReplayBatch = true;
                close();
            });
            actionsWrap.appendChild(skipAllBtn);
        }
        ov.appendChild(actionsWrap);
        document.body.appendChild(ov);
        var d, closed = false, started = false, lockTimer = null;
        function close() {
            if (closed) return; closed = true;
            if (lockTimer) clearInterval(lockTimer);
            try { d && d.dispose(); } catch (e) {}
            ov.remove();
            if (_activeDiceClose === close) _activeDiceClose = null;
            cb && cb();
        }
        _activeDiceClose = close;
        continueBtn.addEventListener('click', close);
        function startRoll() {
            if (started || !d) return;
            started = true;
            tryValdoriaAudioInit();
            unlockCombat2OscFallback();
            try {
                if (typeof sfxDiceRoll === 'function') {
                    sfxDiceRoll();
                }
            } catch (eDice) {}
            container.classList.remove('pulse-idle');
            hint.textContent = manualPlayerDice ? '⚡ Toque no dado para acelerar o giro' : '';
            d.roll(value, function () {
                container.classList.remove('clickable', 'locked');
                if (lockTimer) { clearInterval(lockTimer); lockTimer = null; }
                var info = opts.postResult ? opts.postResult() : null;
                if (info) {
                    while (resultEl.firstChild) resultEl.removeChild(resultEl.firstChild);
                    var big = document.createElement('div');
                    big.className = 'drl-big';
                    big.textContent = info.title;
                    resultEl.appendChild(big);
                    if (info.sub) {
                        var sub = document.createElement('div');
                        sub.className = 'drl-sub';
                        sub.textContent = info.sub;
                        resultEl.appendChild(sub);
                    }
                    resultEl.className = 'dice-result-label visible ' + (info.cls || '');
                } else {
                    resultEl.textContent = 'd20 = ' + value;
                    resultEl.classList.add('visible');
                }
                if (opts.onAttackRollResolved && typeof opts.onAttackRollResolved === 'function') {
                    try {
                        opts.onAttackRollResolved(value, info);
                    } catch (eAr) {}
                }
                hint.textContent = '';
                continueBtn.style.display = '';
            });
            if (manualPlayerDice) {
                lockTimer = setInterval(function () {
                    if (!d || !d._rolling) { clearInterval(lockTimer); lockTimer = null; return; }
                    var elapsed = performance.now() - d._rollStart;
                    if (elapsed / d._rollDuration >= INTERACT_MAX) {
                        container.classList.add('locked');
                        container.classList.remove('clickable');
                        hint.textContent = '🎲 Aguarde o resultado...';
                        clearInterval(lockTimer); lockTimer = null;
                    }
                }, 80);
            }
        }
        try {
            d = new Dice3D(container, { size: 180, dieType: 'd20', duration: duration });
            if (manualPlayerDice) {
                hint.textContent = '🎲 Toque no dado para começar a rolar';
                container.addEventListener('click', function () {
                    if (!started) { startRoll(); return; }
                    if (!d || !d._rolling) return;
                    var elapsed = performance.now() - d._rollStart;
                    if (elapsed / d._rollDuration >= INTERACT_MAX) return;
                    var m = d._dieMesh;
                    if (!m) return;
                    if (!d._spinDir) d._spinDir = { x: d._endEuler.x >= d._startEuler.x ? 1 : -1, y: d._endEuler.y >= d._startEuler.y ? 1 : -1, z: d._endEuler.z >= d._startEuler.z ? 1 : -1 };
                    d._startEuler.x = m.rotation.x; d._startEuler.y = m.rotation.y; d._startEuler.z = m.rotation.z;
                    d._endEuler.x += Math.PI * 4 * d._spinDir.x;
                    d._endEuler.y += Math.PI * 4 * d._spinDir.y;
                    d._endEuler.z += Math.PI * 2 * d._spinDir.z;
                    d._rollStart = performance.now();
                    d._rollDuration = 2000;
                    hint.textContent = '⚡ Acelerado! Solte para desacelerar';
                    hint.classList.remove('pulse'); void hint.offsetWidth; hint.classList.add('pulse');
                });
            } else { startRoll(); }
        } catch (e) { close(); }
    }

    function showMessage(text, cls, sub, msgOpts) {
        msgOpts = msgOpts || {};
        return new Promise(function (resolve) {
            var ov = document.createElement('div');
            ov.className = 'combat-msg-overlay';
            var card = document.createElement('div');
            card.className = 'combat-msg-card ' + (cls || '');
            var txt = document.createElement('div');
            txt.className = 'combat-msg-text';
            txt.textContent = text;
            card.appendChild(txt);
            if (sub) {
                var s = document.createElement('div');
                s.className = 'combat-msg-sub';
                s.textContent = sub;
                card.appendChild(s);
            }
            var btn = document.createElement('button');
            btn.className = 'dice-continue-btn';
            btn.textContent = 'Continuar →';
            btn.style.display = 'none';
            card.appendChild(btn);
            if (msgOpts.offerBatchSkip && shouldOfferBatchSkip()) {
                var skipB = document.createElement('button');
                skipB.type = 'button';
                skipB.className = 'dice-skip-batch-btn dice-skip-batch-btn--in-card';
                skipB.textContent = 'Pular animações restantes';
                skipB.addEventListener('click', function () {
                    _skipReplayBatch = true;
                    ov.remove();
                    resolve();
                });
                card.appendChild(skipB);
            }
            ov.appendChild(card);
            document.body.appendChild(ov);
            setTimeout(function () { btn.style.display = ''; }, 1000);
            btn.addEventListener('click', function () { ov.remove(); resolve(); });
        });
    }

    function showDamageDice(rolls, die, crit, actor, target, oldHp, newHp, dmgMod, dmgOpts) {
        dmgOpts = dmgOpts || {};
        dmgMod = dmgMod || 0;
        return new Promise(function (resolve) {
            if (!window.Dice3D) { resolve(); return; }
            var dieType = 'd' + die;
            var diceSum = rolls.reduce(function (a, b) { return a + b; }, 0);
            var total = Math.max(1, diceSum + dmgMod);
            var ov = document.createElement('div');
            ov.className = 'dice-overlay';
            if (currentState && currentState.rn) {
                var rb = document.createElement('div');
                rb.className = 'dice-round-badge';
                rb.textContent = 'Rodada ' + currentState.rn;
                ov.appendChild(rb);
            }
            var hdr = document.createElement('div');
            hdr.className = 'dice-actor-label';
            hdr.textContent = actor.ico + ' ' + actor.n + ' → ' + target.n + (crit ? ' (crítico)' : '');
            ov.appendChild(hdr);
            var container = document.createElement('div');
            container.className = 'dice-canvas-holder';
            ov.appendChild(container);
            var resultEl = document.createElement('div');
            resultEl.className = 'dice-result-label';
            ov.appendChild(resultEl);
            var continueBtn = document.createElement('button');
            continueBtn.className = 'dice-continue-btn';
            continueBtn.textContent = 'Continuar →';
            continueBtn.style.display = 'none';
            var dmgActionsWrap = document.createElement('div');
            dmgActionsWrap.className = 'dice-actions-stack';
            dmgActionsWrap.appendChild(continueBtn);
            if (dmgOpts.offerBatchSkip && shouldOfferBatchSkip()) {
                var skipDmg = document.createElement('button');
                skipDmg.type = 'button';
                skipDmg.className = 'dice-skip-batch-btn';
                skipDmg.textContent = 'Pular animações restantes';
                skipDmg.addEventListener('click', function (evClick) {
                    evClick.stopPropagation();
                    _skipReplayBatch = true;
                    close();
                });
                dmgActionsWrap.appendChild(skipDmg);
            }
            ov.appendChild(dmgActionsWrap);
            document.body.appendChild(ov);
            var d;
            function close() { try { d && d.dispose(); } catch (e) {} ov.remove(); if (_activeDiceClose === close) _activeDiceClose = null; resolve(); }
            _activeDiceClose = close;
            continueBtn.addEventListener('click', close);
            try {
                d = new Dice3D(container, { size: 180, dieType: dieType, duration: 1800 });
                function rollOne(i) {
                    if (i >= rolls.length) {
                        /* Resumo numerico apenas — barra HP e impacto ficam na arena (ver arenaStrikeFromEvent). */
                        while (resultEl.firstChild) resultEl.removeChild(resultEl.firstChild);
                        resultEl.className = 'dice-result-label visible';
                        var big = document.createElement('div');
                        big.className = 'drl-big';
                        big.textContent = '−' + total + ' PV' + (crit ? ' · Crítico' : '');
                        resultEl.appendChild(big);
                        var sub = document.createElement('div');
                        sub.className = 'drl-sub';
                        sub.textContent = target.ico + ' ' + target.n + ' · PV ' + oldHp + ' → ' + newHp;
                        resultEl.appendChild(sub);
                        try {
                            if (typeof sfxDamageType === 'function') {
                                sfxDamageType((dmgOpts && dmgOpts.dmgType) || 'slashing');
                            }
                        } catch (eDt) {}
                        setTimeout(function () { continueBtn.style.display = ''; }, 550);
                        return;
                    }
                    try {
                        if (typeof sfxDiceRoll === 'function') {
                            sfxDiceRoll();
                        }
                    } catch (eDr) {}
                    d.roll(rolls[i], function () {
                        if (rolls.length > 1 || dmgMod > 0) {
                            var partial = rolls.slice(0, i + 1).join(' + ');
                            if (i === rolls.length - 1 && dmgMod > 0) partial += ' + ' + dmgMod + ' (' + (actor.attr || 'mod') + ')';
                            resultEl.textContent = partial;
                            resultEl.classList.add('visible');
                        }
                        setTimeout(function () { resultEl.classList.remove('visible'); rollOne(i + 1); }, 500);
                    });
                }
                rollOne(0);
            } catch (e) { close(); }
        });
    }

    /* ============================================================
     * VFX — canvas CombatVFX (shared/combat-vfx.js) + flash no card
     * (espelha combat.js / combat-vfx.js do combate anterior).
     * ============================================================ */
    function ensureCombatVfxRuntime() {
        if (window._combatVfx || typeof CombatVFX === 'undefined') return;
        var c = document.getElementById('vfxCanvas');
        if (c) {
            try {
                window._combatVfx = new CombatVFX('vfxCanvas');
            } catch (e) {
                console.warn('[COMBAT2]', 'CombatVFX_init_failed', e || '');
            }
        }
    }

    function _shakeAppCombat2(intensity) {
        var app = document.getElementById('app');
        if (!app) return;
        var cls = intensity === 'heavy' ? 'shake-heavy' : 'shake-light';
        var dur = intensity === 'heavy' ? 450 : 300;
        app.classList.remove('shake-light', 'shake-heavy');
        void app.offsetWidth;
        app.classList.add(cls);
        var ms = (typeof ValdoriaMotion !== 'undefined' && ValdoriaMotion.duration)
            ? ValdoriaMotion.duration(dur, 0) : dur;
        setTimeout(function () { app.classList.remove(cls); }, ms);
    }

    function _showImpactFlashC2(targetEl, isCrit) {
        if (!targetEl) return;
        var rect = targetEl.getBoundingClientRect();
        var flash = document.createElement('div');
        flash.className = 'impact-flash' + (isCrit ? ' crit' : '');
        flash.style.left = (rect.left + rect.width / 2 - (isCrit ? 35 : 25)) + 'px';
        flash.style.top = (rect.top + rect.height / 2 - (isCrit ? 35 : 25)) + 'px';
        flash.style.position = 'fixed';
        document.body.appendChild(flash);
        flash.addEventListener('animationend', function () { flash.remove(); });
    }

    function _dmgFlashClassForCell(dt) {
        var allowed = {
            fire: 1, cold: 1, lightning: 1, necrotic: 1, radiant: 1, poison: 1, acid: 1,
            psychic: 1, thunder: 1, force: 1, slashing: 1, piercing: 1, bludgeoning: 1
        };
        return (dt && allowed[dt]) ? 'dmg-flash-' + dt : 'dmg-flash';
    }

    function _stripCellFlashClasses(el) {
        var rm = [
            'dmg-flash', 'dmg-flash-fire', 'dmg-flash-cold', 'dmg-flash-lightning', 'dmg-flash-necrotic',
            'dmg-flash-radiant', 'dmg-flash-poison', 'dmg-flash-acid', 'dmg-flash-psychic', 'dmg-flash-thunder',
            'dmg-flash-force', 'dmg-flash-slashing', 'dmg-flash-piercing', 'dmg-flash-bludgeoning',
            'dmg-shake', 'enemy-hit-heavy'
        ];
        rm.forEach(function (c) { el.classList.remove(c); });
    }

    function flashTargetCell(el, damageType, isCrit) {
        if (!el || !document.body.contains(el)) return;
        var flashCls = _dmgFlashClassForCell(damageType || 'slashing');
        _stripCellFlashClasses(el);
        void el.offsetWidth;
        el.classList.add(flashCls);
        var rmFlash = (typeof ValdoriaMotion !== 'undefined' && ValdoriaMotion.duration)
            ? ValdoriaMotion.duration(400, 0) : 400;
        setTimeout(function () { el.classList.remove(flashCls); }, rmFlash);
        var shakeCls = isCrit ? 'enemy-hit-heavy' : 'dmg-shake';
        el.classList.add(shakeCls);
        var rmShake = (typeof ValdoriaMotion !== 'undefined' && ValdoriaMotion.duration)
            ? ValdoriaMotion.duration(isCrit ? 600 : 500, 0) : (isCrit ? 600 : 500);
        setTimeout(function () { el.classList.remove(shakeCls); }, rmShake);
        _showImpactFlashC2(el, !!isCrit);
        if (isCrit) { _shakeAppCombat2('heavy'); } else { _shakeAppCombat2('light'); }
    }

    /**
     * Dano aplicado na arena: projétil do atacante ao alvo (canvas), depois flash na célula.
     * Ver docs/sistemas/combat2-vfx-pipeline.md (fases B/C/D: transicao, AoE, buffs).
     */
    function arenaStrikeFromEvent(ev) {
        if (!currentState || !ev) return;
        var dt = ev.dmgType || 'slashing';
        var fromUid = ev.aIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.aIdx;
        var toUid = ev.tIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.tIdx;
        var fromEl = document.querySelector('[data-unit-id="' + fromUid + '"]');
        var toEl = document.querySelector('[data-unit-id="' + toUid + '"]');
        ensureCombatVfxRuntime();
        if (window._combatVfx && fromEl && toEl) {
            try {
                window._combatVfx.projectile(fromEl, toEl, dt, { crit: !!ev.crit });
            } catch (eProj) {
                console.warn('[COMBAT2]', 'vfx_projectile_failed', eProj || '');
            }
        } else if (window._combatVfx && toEl) {
            try {
                window._combatVfx.impact(toEl, dt, { crit: !!ev.crit });
            } catch (eImp) {
                console.warn('[COMBAT2]', 'vfx_impact_fallback_failed', eImp || '');
            }
        }
        var impactDelay = ev.crit ? 380 : 440;
        setTimeout(function () {
            if (toEl && document.body.contains(toEl)) {
                flashTargetCell(toEl, dt, !!ev.crit);
            }
            if (ev.newHp != null && ev.newHp <= 0 && toUid.indexOf('enemy_') === 0) {
                try {
                    if (typeof ValdoriaAudio !== 'undefined' && ValdoriaAudio.playSFX) {
                        ValdoriaAudio.playSFX('sfx_enemy_death');
                    }
                } catch (eS) {}
                if (window._combatVfx && toEl) {
                    try {
                        window._combatVfx.kill(toEl, dt);
                    } catch (eK) {}
                }
            }
        }, impactDelay);
    }

    /* ============================================================
     * POPUPS (target confirm, unit detail, skills, bag)
     * Reduzidos ao essencial — detalhes completos copiados do simulador
     * quando o backend suportar skills/bag reais.
     * ============================================================ */
    function showTargetConfirm(tgtIdx) {
        var s = currentState;
        var p = s.order[s.p_idx];
        var u = s.order[tgtIdx];
        if (!u || !u.alive) return;
        var ov = document.createElement('div');
        ov.className = 'target-confirm-overlay';
        var card = document.createElement('div');
        card.className = 'target-confirm-card';
        var hpPct = Math.round((u.hp / u.mhp) * 100);
        var hpCls = hpPct > 60 ? 'hp-high' : (hpPct > 25 ? 'hp-mid' : 'hp-low');
        var die = p.die, mod = p.dmgMod || 0, attr = p.attr ? ' (' + p.attr + ')' : '';
        var modStr = mod > 0 ? ' + ' + mod + attr : '';
        var html = '<div class="tcc-title">Atacar este alvo?</div>';
        html += '<div class="tcc-preview"><div class="tcc-ico">' + escHtml(u.ico) + '</div><div class="tcc-info"><div class="tcc-name">' + escHtml(u.n) + '</div><div class="tcc-stats">CA ' + u.ac + ' · <span class="' + hpCls + '">' + u.hp + '/' + u.mhp + ' HP</span></div></div></div>';
        html += '<div class="tcc-dmg">';
        html += '<div class="tcc-dmg-row"><span class="tcc-dmg-lbl">Ataque</span><span class="tcc-dmg-val">d20 + ' + p.atk + ' vs CA ' + u.ac + '</span></div>';
        html += '<div class="tcc-dmg-row"><span class="tcc-dmg-lbl">Dano</span><span class="tcc-dmg-val">1d' + die + modStr + ' (' + (1 + mod) + '–' + (die + mod) + ')</span></div>';
        html += '<div class="tcc-dmg-row crit"><span class="tcc-dmg-lbl">Crítico (nat 20)</span><span class="tcc-dmg-val">2d' + die + modStr + ' (' + (2 + mod) + '–' + (2 * die + mod) + ')</span></div>';
        html += '</div>';
        html += '<div class="tcc-actions"><button class="action-btn" data-tcc="cancel">✕ Cancelar</button><button class="action-btn primary" data-tcc="confirm">⚔ Confirmar</button></div>';
        setHTML(card, html);
        ov.appendChild(card);
        document.body.appendChild(ov);
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
        card.querySelector('[data-tcc="cancel"]').addEventListener('click', function () { ov.remove(); });
        card.querySelector('[data-tcc="confirm"]').addEventListener('click', function () { ov.remove(); confirmAndAttack(tgtIdx); });
    }

    function openUnitDetail(uid) {
        if (!currentState) return;
        var u = null;
        if (uid === 'player') u = currentState.order[currentState.p_idx];
        else if (uid && uid.indexOf('enemy_') === 0) u = currentState.order[parseInt(uid.slice(6), 10)];
        if (!u) return;
        var ov = document.createElement('div');
        ov.className = 'unit-detail-overlay';
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
        var card = document.createElement('div');
        card.className = 'unit-detail-card';
        var html = '<button class="udc-close" aria-label="Fechar">×</button>';
        html += '<div class="udc-header"><div class="udc-ico">' + escHtml(u.ico) + '</div><div class="udc-id">';
        html += '<div class="udc-name">' + escHtml(u.n) + '</div>';
        if (u.t === 'p') html += '<div class="udc-sub">' + escHtml(u.cls || 'Aventureiro') + ' · Nível ' + (u.lvl || 1) + '</div>';
        else html += '<div class="udc-sub">' + escHtml(u.species || 'Criatura') + ' · Nível sugerido ' + (u.sugLvl || 1) + '</div>';
        html += '</div></div>';
        html += '<div class="udc-section"><div class="udc-section-title">Status</div><div class="udc-stats">';
        var hpPct = Math.round((u.hp / u.mhp) * 100);
        var hpCls = hpPct > 60 ? 'hp-high' : (hpPct > 25 ? 'hp-mid' : 'hp-low');
        html += '<div class="udc-stat"><span class="udc-stat-lbl">PV</span><span class="udc-stat-val ' + hpCls + '">' + u.hp + ' / ' + u.mhp + '</span></div>';
        if (u.res && u.res.max) html += '<div class="udc-stat"><span class="udc-stat-lbl">' + escHtml(u.res.name) + '</span><span class="udc-stat-val res ' + u.res.type + '">' + u.res.ico + ' ' + u.res.value + ' / ' + u.res.max + '</span></div>';
        html += '<div class="udc-stat"><span class="udc-stat-lbl">CA</span><span class="udc-stat-val">' + u.ac + '</span></div>';
        html += '<div class="udc-stat"><span class="udc-stat-lbl">Ataque</span><span class="udc-stat-val">+' + u.atk + '</span></div>';
        html += '<div class="udc-stat"><span class="udc-stat-lbl">Dano</span><span class="udc-stat-val">1d' + u.die + (u.dmgMod ? '+' + u.dmgMod : '') + '</span></div>';
        html += '<div class="udc-stat"><span class="udc-stat-lbl">DEX</span><span class="udc-stat-val">' + u.dex + '</span></div>';
        html += '</div></div>';
        html += '<div class="udc-section"><div class="udc-section-title">Habilidades</div>';
        var skills = u.skills || (u.t === 'e' ? ['Ataque corpo a corpo'] : []);
        if (skills.length) { html += '<ul class="udc-skills">'; skills.forEach(function (sk) { html += '<li>' + escHtml(typeof sk === 'string' ? sk : sk.n) + '</li>'; }); html += '</ul>'; }
        else html += '<div class="udc-empty">— sem habilidades especiais —</div>';
        html += '</div>';
        setHTML(card, html);
        card.querySelector('.udc-close').addEventListener('click', function () { ov.remove(); });
        ov.appendChild(card);
        document.body.appendChild(ov);
    }

    function openSkillsPanel() {
        var p = currentState.order[currentState.p_idx];
        if (!p || !p.skills || !p.skills.length) return;
        var ov = document.createElement('div');
        ov.className = 'list-panel-overlay';
        var card = document.createElement('div');
        card.className = 'list-panel-card';
        var html = '<div class="lp-title">✨ Habilidades</div>';
        html += '<div class="lp-sub">' + (p.res ? escHtml(p.res.ico) + ' ' + p.res.value + '/' + p.res.max + ' ' + escHtml(p.res.name) : '') + '</div>';
        html += '<div class="lp-sub lp-hint">Uso em combate: em integração com a API (cada classe será validada no simulador).</div>';
        html += '<div class="lp-list">';
        p.skills.forEach(function (sk) {
            var skName = typeof sk === 'string' ? sk : sk.n;
            html += '<button type="button" class="lp-item disabled" disabled><div class="lp-item-ico">✨</div><div class="lp-item-body"><div class="lp-item-name">' + escHtml(skName) + '</div><div class="lp-item-desc">em breve</div></div></button>';
        });
        html += '</div><button type="button" class="lp-close" data-close="1">Fechar</button>';
        setHTML(card, html);
        ov.appendChild(card);
        document.body.appendChild(ov);
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
        card.querySelector('[data-close]').addEventListener('click', function () { ov.remove(); });
    }

    function openCombatLog() {
        if (!currentState) return;
        var s = currentState;
        var ov = document.createElement('div');
        ov.className = 'list-panel-overlay';
        var card = document.createElement('div');
        card.className = 'list-panel-card list-panel-card--log';
        var lines = (s.log || []).slice().reverse();
        var html = '<div class="lp-title">📜 Log do combate</div><div class="lp-sub">Últimas entradas</div>';
        html += '<div class="lp-log-scroll">';
        if (!lines.length) html += '<div class="lp-empty">Sem entradas ainda.</div>';
        else lines.forEach(function (ln) { html += '<div class="lp-log-line">' + escHtml(ln) + '</div>'; });
        html += '</div><button type="button" class="lp-close" data-close="1">Fechar</button>';
        setHTML(card, html);
        ov.appendChild(card);
        document.body.appendChild(ov);
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
        card.querySelector('[data-close]').addEventListener('click', function () { ov.remove(); });
    }

    function openBagPanel() {
        var p = currentState.order[currentState.p_idx];
        if (!p) return;
        var bag = p.bag || [];
        var ov = document.createElement('div');
        ov.className = 'list-panel-overlay';
        var card = document.createElement('div');
        card.className = 'list-panel-card';
        var html = '<div class="lp-title">🎒 Mochila</div>';
        html += '<div class="lp-sub">' + bag.length + ' tipo(s) de item</div>';
        html += '<div class="lp-list">';
        if (!bag.length) html += '<div class="lp-empty">Mochila vazia</div>';
        bag.forEach(function (it, i) {
            var canUse = (it.qty || 0) > 0;
            html += '<button type="button" class="lp-item' + (canUse ? '' : ' disabled') + '" data-item="' + i + '"' + (canUse ? '' : ' disabled') + '>';
            html += '<div class="lp-item-ico">' + escHtml(it.ico || '') + '</div>';
            html += '<div class="lp-item-body"><div class="lp-item-name">' + escHtml(it.n || '') + '</div>';
            html += '<div class="lp-item-desc">' + escHtml(it.desc || '') + '</div></div>';
            html += '<div class="lp-item-cost qty">x' + (it.qty || 0) + '</div></button>';
        });
        html += '</div><button type="button" class="lp-close" data-close="1">Fechar</button>';
        setHTML(card, html);
        ov.appendChild(card);
        document.body.appendChild(ov);
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
        card.querySelector('[data-close]').addEventListener('click', function () { ov.remove(); });
        card.querySelectorAll('[data-item]').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                if (btn.hasAttribute('disabled')) return;
                var idx = parseInt(btn.getAttribute('data-item'), 10);
                ov.remove();
                try {
                    await remoteAction({ type: 'use_item', slot: idx });
                } catch (e2) {
                    console.error('[COMBAT2]', 'use_item failed', e2 || '');
                }
            });
        });
    }

    /* ============================================================
     * BOOT
     * ============================================================ */
    function loadScript(src, cb) {
        var s = document.createElement('script');
        s.src = src; s.async = false;
        s.onload = cb; s.onerror = cb;
        document.body.appendChild(s);
    }

    async function init() {
        if (!TOKEN) {
            document.getElementById('app').innerHTML = '<div class="loading-msg" style="color:#c06a3a">Token ausente. Abra via bot.</div>';
            return;
        }
        try {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.ready();
                window.Telegram.WebApp.expand();
            }
        } catch (e) {}
        tryValdoriaAudioInit();
        loadScript('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js', function () {
            loadScript(BASE + '/shared/dice-3d.js?v=' + Date.now(), async function () {
                try {
                    var resp = await fetchState();
                    if (resp.error) {
                        document.getElementById('app').innerHTML = '<div class="loading-msg" style="color:#c06a3a">' + resp.error + '</div>';
                        return;
                    }
                    currentState = resp.state || resp;
                    ensureCombatVfxRuntime();
                    render(currentState);
                } catch (e) {
                    console.error('[COMBAT2]', 'init_failed', {
                        tokenLen: (TOKEN || '').length,
                        apiBaseLen: (API_BASE || '').length,
                        apiHost: (function () {
                            try { return new URL(API_BASE || location.origin).host; } catch (e2) { return ''; }
                        })()
                    }, e || '');
                    document.getElementById('app').innerHTML = '<div class="loading-msg" style="color:#c06a3a">Erro ao carregar combate: ' + (e && e.message ? e.message : String(e)) + '</div>';
                }
            });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

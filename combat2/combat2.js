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

    var currentState = null;
    var _selectingTarget = false;
    var _pendingSkill = null;
    var _activeDiceClose = null;

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
                html += '<div class="rr-loot-row gold"><span class="rr-ico">🪙</span><span class="rr-name">Valdoritas</span><span class="rr-qty">+' + r.gold + '</span></div>';
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
            html += '<div class="action-bar"><button class="action-btn primary full-width" data-act="close">✓ Fechar</button></div>';
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
                html += '<button class="action-btn" data-act="skills">🎯 Habilidades</button>';
                html += '<button class="action-btn" data-act="bag">🎒 Mochila</button>';
                html += '<button class="action-btn" data-act="flee">🏃 Fugir</button>';
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
        var b = ev.currentTarget;
        var act = b.dataset.act;
        if (act === 'close') {
            try { if (window.Telegram && window.Telegram.WebApp) window.Telegram.WebApp.close(); } catch (e) {}
            return;
        }
        if (act === 'cancel-target') { _selectingTarget = false; _pendingSkill = null; render(currentState); return; }
        if (act === 'skills') { openSkillsPanel(); return; }
        if (act === 'bag') { openBagPanel(); return; }
        if (act === 'attack') { _selectingTarget = true; _pendingSkill = null; render(currentState); return; }
        if (act === 'next') { await remoteAction({ type: 'next' }); animInitFromBackend(); return; }
        if (act === 'skip-init') { /* sem backend — visual only */ finishInit(); return; }
        if (act === 'start') { closeInitiativeOrderPopup(); await remoteAction({ type: 'start' }); return; }
        if (act === 'flee') { await remoteAction({ type: 'flee' }); return; }
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
            /* Replay events (mutando currentState local para animar HPs intermedios) */
            if (resp.events && resp.events.length) {
                for (var i = 0; i < resp.events.length; i++) {
                    await playEvent(resp.events[i]);
                }
            }
            /* Sync autoritativo com o state final do backend */
            currentState = resp.state;
            render(currentState);
            if (currentState.ph === 'init_done') showInitiativeOrderPopup();
        } catch (e) { console.error('[C2] action failed', e); }
    }

    async function playEvent(ev) {
        if (ev.kind === 'attack' || ev.kind === 'oa') return animateAttackEvent(ev);
        if (ev.kind === 'flee') return animateFleeEvent(ev);
        if (ev.kind === 'round') {
            currentState.rn = ev.rn;
            render(currentState);
            await sleep(400);
        }
    }

    async function animateAttackEvent(ev) {
        var actor = currentState.order[ev.aIdx];
        var target = currentState.order[ev.tIdx];
        if (!actor || !target) return;
        /* Ajusta HP local para o antes-do-evento (backend ja aplicou no state final) */
        if (ev.hit) target.hp = ev.oldHp;
        render(currentState);
        await sleep(200);
        var actionLabel = ev.kind === 'oa' ? 'Ataque de oportunidade → ' + target.n : 'Ataca ' + target.n + ' (CA ' + target.ac + ')';

        /* Overlay 1: d20 */
        await new Promise(function (x) {
            showDice(ev.d20, x, actor, actionLabel, {
                postResult: function () {
                    if (ev.crit) return { title: '⚡ ACERTO CRÍTICO', sub: 'd20 = 20 — dano em dobro', cls: 'crit' };
                    if (ev.hit) return { title: '✅ ACERTOU', sub: ev.d20 + ' + ' + ev.atk + ' = ' + ev.total + ' ≥ CA ' + ev.ac, cls: 'hit' };
                    if (ev.miss_reason === 'falha_critica') return { title: '⚠ FALHA CRÍTICA', sub: 'd20 = 1 — escapa do alvo', cls: 'miss' };
                    return { title: '🛡 ' + target.n.toUpperCase() + ' DEFENDEU', sub: ev.d20 + ' + ' + ev.atk + ' = ' + ev.total + ' < CA ' + ev.ac, cls: 'miss' };
                }
            });
        });

        if (!ev.hit) return;

        /* Overlay 2: dado de dano + card animado */
        await showDamageDice(ev.dmgRolls, actor.die, ev.crit, actor, target, ev.oldHp, ev.newHp, ev.dmgMod);

        /* Sincroniza HP local para o depois-do-evento */
        target.hp = ev.newHp;
        target.alive = ev.newHp > 0;
        render(currentState);
        var uid = ev.tIdx === currentState.p_idx ? 'player' : 'enemy_' + ev.tIdx;
        playHitVFX(uid, ev.crit);
        await sleep(200);
    }

    async function animateFleeEvent(ev) {
        var p = currentState.order[currentState.p_idx];
        await showMessage('🏃 TENTANDO FUGIR', 'pre-npc', 'Teste de Acrobacia (DEX) DC ' + ev.dc);
        await new Promise(function (x) { showDice(ev.d20, x, p, 'Fuga · DC ' + ev.dc); });
        if (ev.success) {
            await showMessage('💨 ESCAPOU!', 'hit', 'Total ' + ev.total + ' ≥ DC ' + ev.dc);
        } else {
            await showMessage('⚠ FALHOU', 'miss', 'Ataques de oportunidade dos inimigos!');
        }
    }

    /* ============================================================
     * INITIATIVE ANIMATION (client-only, usa init do backend)
     * ============================================================ */
    async function animInitFromBackend() {
        var s = currentState;
        s.ph = 'init';
        /* Marca todos como nao revelados inicialmente */
        s.order.forEach(function (c) { c.initRevealed = false; c.initRolling = false; });
        render(s);
        for (var i = 0; i < s.order.length; i++) {
            var c = s.order[i];
            c.initRolling = true;
            render(s);
            await sleep(i === 0 ? 600 : 2000);
            var d20 = c.init - Math.floor((c.dex - 10) / 2);
            if (d20 < 1) d20 = 1; if (d20 > 20) d20 = 20;
            await new Promise(function (r) { showDice(d20, r, c, 'Iniciativa'); });
            var oldRects = captureQueueRects();
            c.initRolling = false;
            c.initRevealed = true;
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
        var duration = isPlayer ? 5000 : (1500 + Math.floor(Math.random() * 1500));
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
        container.className = 'dice-canvas-holder' + (isPlayer ? ' clickable pulse-idle' : '');
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
        ov.appendChild(continueBtn);
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
            container.classList.remove('pulse-idle');
            hint.textContent = isPlayer ? '⚡ Toque no dado para acelerar o giro' : '';
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
                hint.textContent = '';
                continueBtn.style.display = '';
            });
            if (isPlayer) {
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
            if (isPlayer) {
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

    function showMessage(text, cls, sub) {
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
            ov.appendChild(card);
            document.body.appendChild(ov);
            setTimeout(function () { btn.style.display = ''; }, 1000);
            btn.addEventListener('click', function () { ov.remove(); resolve(); });
        });
    }

    function showDamageDice(rolls, die, crit, actor, target, oldHp, newHp, dmgMod) {
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
            ov.appendChild(continueBtn);
            document.body.appendChild(ov);
            var d;
            function close() { try { d && d.dispose(); } catch (e) {} ov.remove(); if (_activeDiceClose === close) _activeDiceClose = null; resolve(); }
            _activeDiceClose = close;
            continueBtn.addEventListener('click', close);
            try {
                d = new Dice3D(container, { size: 180, dieType: dieType, duration: 1800 });
                function rollOne(i) {
                    if (i >= rolls.length) {
                        /* Card animado do alvo */
                        while (resultEl.firstChild) resultEl.removeChild(resultEl.firstChild);
                        resultEl.className = 'dice-result-label visible';
                        var card = document.createElement('div');
                        card.className = 'dmg-target-card' + (crit ? ' crit' : '') + (newHp <= 0 ? ' defeated' : '');
                        var hdr2 = document.createElement('div'); hdr2.className = 'dtc-header';
                        var ic = document.createElement('span'); ic.className = 'dtc-ico'; ic.textContent = target.ico;
                        var nm = document.createElement('span'); nm.className = 'dtc-name'; nm.textContent = target.n;
                        var dmgBadge = document.createElement('span'); dmgBadge.className = 'dtc-dmg';
                        dmgBadge.textContent = '-' + total + (crit ? ' CRIT' : '');
                        hdr2.appendChild(ic); hdr2.appendChild(nm); hdr2.appendChild(dmgBadge);
                        card.appendChild(hdr2);
                        var oldPct = Math.max(0, Math.min(100, Math.round((oldHp / target.mhp) * 100)));
                        var newPct = Math.max(0, Math.min(100, Math.round((newHp / target.mhp) * 100)));
                        var endFillCls = newPct > 60 ? 'fill-hp-high' : (newPct > 25 ? 'fill-hp-mid' : 'fill-hp-low');
                        var bar = document.createElement('div'); bar.className = 'dtc-bar';
                        var fill = document.createElement('div'); fill.className = 'dtc-bar-fill ' + endFillCls;
                        fill.style.width = oldPct + '%';
                        bar.appendChild(fill);
                        card.appendChild(bar);
                        var hpTxt = document.createElement('div'); hpTxt.className = 'dtc-hp';
                        hpTxt.textContent = oldHp + ' / ' + target.mhp + ' HP';
                        card.appendChild(hpTxt);
                        resultEl.appendChild(card);
                        setTimeout(function () {
                            fill.style.width = newPct + '%';
                            var startMs = performance.now(), dur = 800;
                            (function tick(t) {
                                var p = Math.min(1, (t - startMs) / dur);
                                hpTxt.textContent = Math.round(oldHp - (oldHp - newHp) * p) + ' / ' + target.mhp + ' HP';
                                if (p < 1) requestAnimationFrame(tick);
                                else if (newHp <= 0) hpTxt.classList.add('fallen');
                            })(performance.now());
                        }, 200);
                        setTimeout(function () { continueBtn.style.display = ''; }, 1100);
                        return;
                    }
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
     * VFX
     * ============================================================ */
    function playHitVFX(uid, crit) {
        var el = document.querySelector('[data-unit-id="' + uid + '"]');
        if (!el) return;
        el.classList.add('hit-shake');
        setTimeout(function () { el.classList.remove('hit-shake'); }, 400);
        var rect = el.getBoundingClientRect();
        for (var i = 0; i < (crit ? 10 : 6); i++) {
            var p = document.createElement('div');
            p.className = 'hit-particle' + (crit ? ' crit' : '');
            p.style.left = (rect.left + rect.width / 2) + 'px';
            p.style.top = (rect.top + rect.height / 2) + 'px';
            var ang = Math.random() * Math.PI * 2;
            var dist = 25 + Math.random() * 30;
            p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
            p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
            document.body.appendChild(p);
            setTimeout((function (e) { return function () { e.remove(); }; })(p), 700);
        }
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
        /* Stub: backend ainda nao suporta usar skills. Mostra a lista read-only. */
        var p = currentState.order[currentState.p_idx];
        if (!p || !p.skills || !p.skills.length) return;
        var ov = document.createElement('div');
        ov.className = 'list-panel-overlay';
        var card = document.createElement('div');
        card.className = 'list-panel-card';
        var html = '<div class="lp-title">🎯 Habilidades</div>';
        html += '<div class="lp-sub">' + (p.res ? p.res.ico + ' ' + p.res.value + '/' + p.res.max + ' ' + p.res.name : '') + '</div>';
        html += '<div class="lp-list">';
        p.skills.forEach(function (sk) {
            var skName = typeof sk === 'string' ? sk : sk.n;
            html += '<button class="lp-item disabled" disabled><div class="lp-item-ico">✨</div><div class="lp-item-body"><div class="lp-item-name">' + escHtml(skName) + '</div><div class="lp-item-desc">em breve</div></div></button>';
        });
        html += '</div><button class="lp-close" data-close="1">Fechar</button>';
        setHTML(card, html);
        ov.appendChild(card);
        document.body.appendChild(ov);
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
        card.querySelector('[data-close]').addEventListener('click', function () { ov.remove(); });
    }

    function openBagPanel() {
        /* Stub: backend ainda nao popula bag com items reais. */
        var p = currentState.order[currentState.p_idx];
        var ov = document.createElement('div');
        ov.className = 'list-panel-overlay';
        var card = document.createElement('div');
        card.className = 'list-panel-card';
        var html = '<div class="lp-title">🎒 Mochila</div><div class="lp-sub">— vazia —</div>';
        html += '<div class="lp-empty">Integração de inventário em breve</div>';
        html += '<button class="lp-close" data-close="1">Fechar</button>';
        setHTML(card, html);
        ov.appendChild(card);
        document.body.appendChild(ov);
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
        card.querySelector('[data-close]').addEventListener('click', function () { ov.remove(); });
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
        loadScript('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js', function () {
            loadScript(BASE + '/shared/dice-3d.js?v=' + Date.now(), async function () {
                try {
                    var resp = await fetchState();
                    if (resp.error) {
                        document.getElementById('app').innerHTML = '<div class="loading-msg" style="color:#c06a3a">' + resp.error + '</div>';
                        return;
                    }
                    currentState = resp.state || resp;
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

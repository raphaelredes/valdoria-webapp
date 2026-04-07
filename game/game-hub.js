/* ============================================================
   game-hub.js — Renderizador dedicado do City Hub
   Constroi o layout do hub principal da cidade dentro do
   content area fornecido pelo game-renderer.js.
   ============================================================ */
'use strict';

/* ── Helpers DOM ─────────────────────────────────────────────── */

function _hubDiv(cls) {
    var d = document.createElement('div');
    if (cls) d.className = cls;
    return d;
}

function _hubSpan(cls, text) {
    var s = document.createElement('span');
    if (cls) s.className = cls;
    if (text) s.textContent = text;
    return s;
}

function _hubBtn(cls, text, cb) {
    var b = document.createElement('button');
    b.className = cls || '';
    b.textContent = text || '';
    if (cb) {
        b.addEventListener('click', function () {
            if (typeof haptic === 'function') haptic('medium');
            if (typeof doAction === 'function') doAction(cb);
        });
    }
    return b;
}

/** HTML-safe escaping */
function _hubEsc(s) {
    if (typeof vEsc === 'function') return vEsc(s);
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
}

/* ── Location Mapping ────────────────────────────────────────── */

var _LOC_MAP = {
    'tavern':           { ico: '\uD83C\uDF7A', nm: 'Taverna' },
    'taverna':          { ico: '\uD83C\uDF7A', nm: 'Taverna' },
    'inn':              { ico: '\uD83D\uDECF\uFE0F', nm: 'Estalagem' },
    'estalagem':        { ico: '\uD83D\uDECF\uFE0F', nm: 'Estalagem' },
    'open_inn':         { ico: '\uD83D\uDECF\uFE0F', nm: 'Estalagem' },
    'arena':            { ico: '\u2694\uFE0F',        nm: 'Arena' },
    'arena_main':       { ico: '\u2694\uFE0F',        nm: 'Arena' },
    'market':           { ico: '\uD83C\uDFEA',        nm: 'Mercado' },
    'mercado':          { ico: '\uD83C\uDFEA',        nm: 'Mercado' },
    'city_locations':   { ico: '\uD83C\uDFEA',        nm: 'Mercado' },
    'action_city_locations': { ico: '\uD83C\uDFEA',   nm: 'Locais' },
    'guild':            { ico: '\uD83C\uDFDB\uFE0F',  nm: 'Guilda' },
    'guilda':           { ico: '\uD83C\uDFDB\uFE0F',  nm: 'Guilda' },
    'temple':           { ico: '\u26EA',               nm: 'Templo' },
    'templo':           { ico: '\u26EA',               nm: 'Templo' },
    'gates':            { ico: '\uD83D\uDEAA',         nm: 'Port\u00f5es' },
    'portoes':          { ico: '\uD83D\uDEAA',         nm: 'Port\u00f5es' },
    'square':           { ico: '\u26F2',               nm: 'Pra\u00e7a' },
    'praca':            { ico: '\u26F2',               nm: 'Pra\u00e7a' },
    'bank':             { ico: '\uD83C\uDFE6',         nm: 'Banco' },
    'banco':            { ico: '\uD83C\uDFE6',         nm: 'Banco' },
    'action_quests':    { ico: '\uD83D\uDCDC',         nm: 'Miss\u00f5es' },
    'quests':           { ico: '\uD83D\uDCDC',         nm: 'Miss\u00f5es' },
    'daily_challenge':  { ico: '\uD83D\uDC3A',         nm: 'Desafio' },
    'action_codex':     { ico: '\uD83D\uDCD6',         nm: 'Comp\u00eandio' },
    'codex':            { ico: '\uD83D\uDCD6',         nm: 'Comp\u00eandio' }
};

/** Classifica um callback de botao como localizacao conhecida */
function _matchLocation(cb) {
    if (!cb) return null;
    var lower = cb.toLowerCase();
    for (var key in _LOC_MAP) {
        if (lower.indexOf(key) >= 0) return _LOC_MAP[key];
    }
    return null;
}

/** Extrai badge numerico do texto do botao, ex: "Missoes (3)" -> 3 */
function _extractBadge(text) {
    var m = (text || '').match(/\((\d+)\)\s*$/);
    return m ? parseInt(m[1], 10) : 0;
}

/** Verifica se um botao e o CTA de aventura */
function _isCTA(btn) {
    var t = (btn.text || '').toUpperCase();
    var c = (btn.cb || '').toLowerCase();
    return t.indexOf('PARTIR') >= 0
        || t.indexOf('AVENTURA') >= 0
        || c.indexOf('explore') >= 0
        || c.indexOf('partir') >= 0;
}

/* ── Coin icon wrapper (usa vCity.coin de game-city-shared.js) ── */

function _hubCoin(size) {
    if (typeof vCity !== 'undefined' && vCity.coin) return vCity.coin(size);
    /* Fallback manual caso vCity nao carregou */
    var c = document.createElement('span');
    c.className = 'vi vi-coin' + (size ? ' ' + size : '');
    return c;
}


/* ================================================================
   RENDERIZADOR PRINCIPAL
   ================================================================ */

/**
 * Renderiza o conteudo do City Hub dentro do elemento fornecido.
 * Chamado pelo game-renderer.js quando a tela e o hub da cidade.
 *
 * @param {HTMLElement} el  — container de conteudo (o #content)
 * @param {Object} screen   — dados completos da tela do serializer
 */
function renderHubScreen(el, screen) {
    el.className = 'hub-screen';
    var frag = document.createDocumentFragment();

    /* Flatten all buttons from rows into a single list */
    var allBtns = [];
    var rows = screen.buttons || [];
    for (var ri = 0; ri < rows.length; ri++) {
        var row = rows[ri];
        if (!row) continue;
        for (var bi = 0; bi < row.length; bi++) {
            if (row[bi]) allBtns.push(row[bi]);
        }
    }

    /* ── 1. Suggested Action ─────────────────────────────────── */
    var sa = screen.suggested_action;
    if (sa && sa.text) {
        var suggestEl = _hubDiv('hub-suggest');
        suggestEl.textContent = sa.text;
        suggestEl.style.cursor = 'pointer';
        suggestEl.addEventListener('click', function () {
            if (typeof haptic === 'function') haptic('medium');
            if (sa.cb && typeof doAction === 'function') doAction(sa.cb);
        });
        frag.appendChild(suggestEl);
    }

    /* ── 2. CTA — "PARTIR PARA AVENTURA" ─────────────────────── */
    var ctaBtn = null;
    for (var ci = 0; ci < allBtns.length; ci++) {
        if (_isCTA(allBtns[ci])) { ctaBtn = allBtns[ci]; break; }
    }
    if (ctaBtn) {
        var ctaEl = _hubBtn('hub-cta', ctaBtn.text || '\u2694\uFE0F PARTIR PARA AVENTURA', ctaBtn.cb);
        frag.appendChild(ctaEl);
    }

    /* ── 3. Alert (HP/rest warning) ──────────────────────────── */
    var notifs = screen.notifications || [];
    for (var ni = 0; ni < notifs.length; ni++) {
        var n = notifs[ni];
        var nType = (n.type || '').toLowerCase();
        var nText = (n.text || '').toLowerCase();
        if (nType.indexOf('warn') >= 0 || nText.indexOf('hp') >= 0
            || nText.indexOf('descansar') >= 0 || nText.indexOf('ferida') >= 0
            || nText.indexOf('critico') >= 0 || nText.indexOf('cr\u00edtico') >= 0) {
            var alertEl = _hubDiv('hub-alert');
            alertEl.textContent = '\u26A0\uFE0F ' + n.text;
            frag.appendChild(alertEl);
            break; /* mostra apenas o primeiro alerta */
        }
    }

    /* ── 4. Party Section ────────────────────────────────────── */
    var allies = screen.allies || [];
    if (allies.length > 0) {
        var partyLabel = _hubDiv('hub-section-label');
        partyLabel.textContent = 'Grupo';
        frag.appendChild(partyLabel);

        var partyGrid = _hubDiv('hub-party');
        for (var ai = 0; ai < allies.length; ai++) {
            partyGrid.appendChild(_buildHubAlly(allies[ai]));
        }
        /* Se o grupo tem espaco vazio (menos de 4 membros e mais de 1), mostra slot de recrutamento */
        if (allies.length > 1 && allies.length < 4) {
            var emptySlot = _hubDiv('hub-ally--empty');
            emptySlot.textContent = 'Recrute na Guilda';
            emptySlot.style.cursor = 'pointer';
            emptySlot.addEventListener('click', function () {
                if (typeof haptic === 'function') haptic('light');
                if (typeof doAction === 'function') doAction('guild_recruit');
            });
            partyGrid.appendChild(emptySlot);
        }
        frag.appendChild(partyGrid);
    }

    /* ── 5. Ornamental Divider ───────────────────────────────── */
    var divEl = _hubDiv('hub-div');
    var gemEl = _hubSpan('gem', '\u25C6');
    divEl.appendChild(gemEl);
    frag.appendChild(divEl);

    /* ── 6. Location Grid (4 colunas) ────────────────────────── */
    var locGrid = _hubDiv('hub-loc-grid');
    var locCount = 0;
    for (var li = 0; li < allBtns.length; li++) {
        var btn = allBtns[li];
        if (_isCTA(btn)) continue; /* CTA ja renderizado acima */
        var loc = _matchLocation(btn.cb);
        if (!loc) continue;
        locGrid.appendChild(_buildLocCell(loc.ico, loc.nm, btn));
        locCount++;
    }
    if (locCount > 0) {
        frag.appendChild(locGrid);
    }

    /* ── 7. Quest Mini Tracker ───────────────────────────────── */
    var qt = screen.quest_tracker;
    if (qt && qt.quests && qt.quests.length > 0) {
        for (var qi = 0; qi < qt.quests.length; qi++) {
            frag.appendChild(_buildQuestRow(qt.quests[qi]));
        }
    }

    /* ── 8. Progress Strip ───────────────────────────────────── */
    var ps = screen.progress_strip;
    var pStats = screen.player_stats;
    if (ps || (pStats && pStats.kills > 0)) {
        var progRow = _hubDiv('hub-prog');

        if (ps) {
            /* Liga */
            var leagueCard = _hubDiv('hub-prog-card');
            leagueCard.style.cursor = 'pointer';
            leagueCard.addEventListener('click', function () {
                if (typeof haptic === 'function') haptic('light');
                if (ps.league_cb && typeof doAction === 'function') doAction(ps.league_cb);
            });
            var leagueVal = _hubDiv('hp-val');
            leagueVal.textContent = (ps.league_icon || '') + ' ' + (ps.league_xp || 0).toLocaleString('pt-BR');
            leagueCard.appendChild(leagueVal);
            var leagueLbl = _hubDiv('hp-lbl');
            leagueLbl.textContent = ps.league_name || 'Liga';
            leagueCard.appendChild(leagueLbl);
            progRow.appendChild(leagueCard);

            /* Conquistas */
            var achCard = _hubDiv('hub-prog-card');
            achCard.style.cursor = 'pointer';
            achCard.addEventListener('click', function () {
                if (typeof haptic === 'function') haptic('light');
                if (ps.ach_cb && typeof doAction === 'function') doAction(ps.ach_cb);
            });
            var achVal = _hubDiv('hp-val');
            achVal.textContent = '\uD83C\uDFC6 ' + (ps.ach_unlocked || 0) + '/' + (ps.ach_total || 0);
            achCard.appendChild(achVal);
            var achLbl = _hubDiv('hp-lbl');
            achLbl.textContent = 'Conquistas';
            achCard.appendChild(achLbl);
            progRow.appendChild(achCard);
        }

        /* Kill streak (from _player_stats) */
        if (pStats && pStats.kills > 0) {
            var killCard = _hubDiv('hub-prog-card');
            var killVal = _hubDiv('hp-val');
            killVal.textContent = '\u2694\uFE0F ' + pStats.kills;
            killCard.appendChild(killVal);
            var killLbl = _hubDiv('hp-lbl');
            killLbl.textContent = 'Abates';
            killCard.appendChild(killLbl);
            progRow.appendChild(killCard);
        }

        frag.appendChild(progRow);
    }

    /* ── 9. DM Tip ───────────────────────────────────────────── */
    var tip = screen.dm_tip;
    if (tip) {
        var dmEl = _hubDiv('hub-dm');
        var dmIco = _hubSpan('hub-dm-ico', '\uD83D\uDCDC');
        dmEl.appendChild(dmIco);
        var dmText = document.createTextNode(' ' + tip);
        dmEl.appendChild(dmText);
        frag.appendChild(dmEl);
    }

    /* Append everything to the container */
    el.appendChild(frag);
}


/* ================================================================
   SUB-COMPONENTES
   ================================================================ */

/**
 * Constroi um card de aliado compacto para o grid do hub.
 * @param {Object} a — dados do aliado {n, c, ico, l, hp, mhp, mp, mmp, type, dead, ...}
 * @returns {HTMLElement}
 */
function _buildHubAlly(a) {
    var card = _hubDiv('hub-ally');
    if (a.type === 'player') card.classList.add('player');
    if (a.dead) card.classList.add('dead');

    /* Emoji icon */
    var ico = _hubSpan('ha-ico', a.ico || '\u2694\uFE0F');
    card.appendChild(ico);

    /* Info column: name + bars */
    var info = _hubDiv('ha-info');

    /* Name */
    var nameEl = _hubDiv('ha-name');
    nameEl.textContent = a.n || '';
    info.appendChild(nameEl);

    /* HP bar (3px) */
    if (a.mhp > 0 && !a.dead) {
        var hpPct = Math.min(100, Math.max(0, Math.round((a.hp / a.mhp) * 100)));
        info.appendChild(_hubMiniBar('hp', hpPct));
    } else if (a.dead) {
        var deadLbl = _hubDiv('ha-dead');
        deadLbl.textContent = '\uD83D\uDC80';
        info.appendChild(deadLbl);
    }

    /* MP bar (3px) — only if ally has mana */
    if (a.mmp > 0 && !a.dead) {
        var mpPct = Math.min(100, Math.max(0, Math.round((a.mp / a.mmp) * 100)));
        info.appendChild(_hubMiniBar('mp', mpPct));
    }

    card.appendChild(info);
    return card;
}

/**
 * Cria uma mini barra de HP ou MP (3px de altura).
 * @param {string} type — 'hp' ou 'mp'
 * @param {number} pct  — percentual 0-100
 * @returns {HTMLElement}
 */
function _hubMiniBar(type, pct) {
    var track = _hubDiv('ha-bar');
    var fill = _hubDiv('fill ' + type);
    /* Anima de 0 para o valor real */
    fill.style.width = '0%';
    requestAnimationFrame(function () {
        fill.style.width = pct + '%';
    });
    track.appendChild(fill);
    return track;
}

/**
 * Constroi uma celula de localizacao para o grid 4 colunas.
 * @param {string} ico   — emoji do local
 * @param {string} name  — nome curto do local
 * @param {Object} btn   — {text, cb} do botao original
 * @returns {HTMLElement}
 */
function _buildLocCell(ico, name, btn) {
    var cell = _hubDiv('hub-loc');

    /* Emoji icon */
    var icoEl = _hubDiv('hl-ico');
    icoEl.textContent = ico;
    cell.appendChild(icoEl);

    /* Label */
    var nmEl = _hubDiv('hl-nm');
    nmEl.textContent = name;
    cell.appendChild(nmEl);

    /* Badge (se o texto do botao tem "(N)") */
    var badgeCount = _extractBadge(btn.text);
    if (badgeCount > 0) {
        var badge = _hubDiv('hl-badge');
        badge.textContent = String(badgeCount);
        cell.appendChild(badge);
    }

    /* Click handler */
    if (btn.cb) {
        cell.addEventListener('click', function () {
            if (typeof haptic === 'function') haptic('medium');
            if (typeof doAction === 'function') doAction(btn.cb);
        });
    }

    return cell;
}

/**
 * Constroi uma linha do mini quest tracker.
 * @param {Object} q — {title, stage, total, ready, cb, obj}
 * @returns {HTMLElement}
 */
function _buildQuestRow(q) {
    var row = _hubDiv('hub-quest');
    row.style.cursor = 'pointer';

    /* Icon */
    var icoEl = _hubSpan('hq-ico', '\uD83D\uDCDC');
    row.appendChild(icoEl);

    /* Title text */
    var textEl = _hubSpan('hq-text');
    textEl.textContent = q.title || '';
    row.appendChild(textEl);

    /* Status indicator */
    var statusEl = _hubSpan('hq-status');
    if (q.ready) {
        statusEl.textContent = '\u2705'; /* check mark — pronta para entregar */
    } else {
        statusEl.textContent = (q.stage || 0) + '/' + (q.total || 0);
    }
    row.appendChild(statusEl);

    /* Click -> quest detail */
    if (q.cb) {
        row.addEventListener('click', function () {
            if (typeof haptic === 'function') haptic('light');
            if (typeof doAction === 'function') doAction(q.cb);
        });
    }

    return row;
}


/* ── Nota ────────────────────────────────────────────────────── */
/* .hub-section-label e .ha-dead estilizados em game-hub.css    */

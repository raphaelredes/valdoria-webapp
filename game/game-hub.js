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

// === SYNC_REGION: _LOC_MAP BEGIN ===
var _LOC_MAP = (function(){
    function S(id) { return '<svg viewBox="0 0 120 120"><use href="#' + id + '"/></svg>'; }
    return {
        'tavern':           { ico: S('ic-taverna'), nm: 'Taverna' },
        'taverna':          { ico: S('ic-taverna'), nm: 'Taverna' },
        'inn':              { ico: S('ic-estalagem'), nm: 'Estalagem' },
        'estalagem':        { ico: S('ic-estalagem'), nm: 'Estalagem' },
        'open_inn':         { ico: S('ic-estalagem'), nm: 'Estalagem' },
        'arena':            { ico: S('ic-arena'),    nm: 'Arena' },
        'arena_main':       { ico: S('ic-arena'),    nm: 'Arena' },
        'market':           { ico: S('ic-mercado'),  nm: 'Mercado' },
        'mercado':          { ico: S('ic-mercado'),  nm: 'Mercado' },
        'city_locations':   { ico: S('ic-portoes'),  nm: 'Cidade' },
        'action_city_locations': { ico: S('ic-portoes'), nm: 'Cidade' },
        'guild':            { ico: S('ic-paladino'), nm: 'Guilda' },
        'guilda':           { ico: S('ic-paladino'), nm: 'Guilda' },
        'temple':           { ico: S('ic-templo'),   nm: 'Templo' },
        'templo':           { ico: S('ic-templo'),   nm: 'Templo' },
        'gates':            { ico: S('ic-portoes'),  nm: 'Portões' },
        'portoes':          { ico: S('ic-portoes'),  nm: 'Portões' },
        'sewer':            { ico: S('ic-portoes'),  nm: 'Esgoto' },
        'square':           { ico: S('ic-praca'),    nm: 'Praça' },
        'praca':            { ico: S('ic-praca'),    nm: 'Praça' },
        'bank':             { ico: S('ic-banco'),    nm: 'Banco' },
        'banco':            { ico: S('ic-banco'),    nm: 'Banco' },
        'action_quests':    { ico: S('ic-missões'),  nm: 'Missões' },
        'quests':           { ico: S('ic-missões'),  nm: 'Missões' },
        'daily_challenge':  { ico: S('ic-desafio'),  nm: 'Desafio' },
        'action_codex':     { ico: S('ic-compendio'),nm: 'Compêndio' },
        'codex':            { ico: S('ic-compendio'),nm: 'Compêndio' },
        'festival':         { ico: S('ic-festival'), nm: 'Festival' },
        'league_':          { ico: S('ic-desafio'),  nm: 'Liga' },
        'manage_':          { ico: S('ic-grupo'),    nm: 'Contas' },
        'open_workshop':    { ico: S('ic-oficina'),  nm: 'Oficina' },
        'rel_':             { ico: S('ic-vínculos'), nm: 'Vínculos' },
        'rune_scribe':      { ico: S('ic-runas'),    nm: 'Runas' },
        'shadow_alley':     { ico: S('ic-portoes'),  nm: 'Beco' },
        'workshop_':        { ico: S('ic-oficina'),  nm: 'Oficina' },
        'cartografia':      { ico: S('ic-cartografia'), nm: 'Mapa' },
        'travel':           { ico: S('ic-cartografia'), nm: 'Viajar' },
        'druid':            { ico: S('ic-druida'),   nm: 'Druida' },
        'ach_':             { ico: S('ic-desafio'),  nm: 'Conquistas' }
    };
})();
// === SYNC_REGION END ===

/** Classifica um callback de botao como localizacao conhecida.
 *  Exact match first, then substring — prevents greedy substring
 *  from shadowing more-specific keys (e.g. 'city_locations' matching
 *  before 'action_city_locations'). */
function _matchLocation(cb) {
    if (!cb) return null;
    var lower = cb.toLowerCase();
    /* 1. Exact match (highest priority) */
    if (_LOC_MAP.hasOwnProperty(lower)) return _LOC_MAP[lower];
    /* 2. Longest substring match — iterate by key length descending
       so 'action_city_locations' beats 'city_locations' beats 'action_' */
    var bestKey = null;
    var bestLen = 0;
    for (var key in _LOC_MAP) {
        if (key.length > bestLen && lower.indexOf(key) >= 0) {
            bestKey = key;
            bestLen = key.length;
        }
    }
    return bestKey ? _LOC_MAP[bestKey] : null;
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
// === SYNC_REGION: renderHubScreen BEGIN ===
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
        var ctaEl = _hubBtn('hub-cta', ctaBtn.text || 'PARTIR PARA AVENTURA', ctaBtn.cb);
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
            alertEl.textContent = n.text;
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
    var _seenCb = {}; /* Deduplicate by callback — prevents duplicate entries from shortcuts + action_btns */
    /* Skip non-location callbacks that leak from footer/nav into allBtns */
    var _skipCb = {'action_universal_back':1,'action_settings':1,'action_toggle_footer':1,'main_menu':1,
        'action_inventory':1,'action_status':1,'action_explore_party':1,'action_inventory_popup':1};
    for (var li = 0; li < allBtns.length; li++) {
        var btn = allBtns[li];
        if (_isCTA(btn)) continue; /* CTA ja renderizado acima */
        if (_skipCb[btn.cb] || btn.is_back) continue; /* Non-location button */
        if (_seenCb[btn.cb]) continue; /* Duplicate callback — skip */
        var loc = _matchLocation(btn.cb);
        if (!loc) continue;
        _seenCb[btn.cb] = true;
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
            // ps.league_icon agora é ID heráldico (ic-liga-bronze/prata/ouro/...)
            var leagueIconId = ps.league_icon || 'ic-liga-bronze';
            var leagueColor = ps.league_color || '#cd7f32';
            var leagueVal = _hubDiv('hp-val');
            leagueVal.innerHTML = '<svg viewBox="0 0 120 120" style="width:14px;height:14px;vertical-align:middle;margin-right:3px;color:' + leagueColor + ';"><use href="#' + leagueIconId + '"/></svg>' + (ps.league_xp || 0).toLocaleString('pt-BR');
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
            achVal.innerHTML = '<svg viewBox="0 0 120 120" style="width:14px;height:14px;vertical-align:middle;margin-right:3px;color:' + (HERALDIC_COLORS['ic-trofeu'] || '#e8d878') + ';"><use href="#ic-trofeu"/></svg>' + (ps.ach_unlocked || 0) + '/' + (ps.ach_total || 0);
            achCard.appendChild(achVal);
            var achLbl = _hubDiv('hp-lbl');
            achLbl.textContent = 'Conquistas';
            achCard.appendChild(achLbl);
            progRow.appendChild(achCard);
        }

        /* Combat stats (from _player_stats) */
        if (pStats && pStats.kills > 0) {
            var killCard = _hubDiv('hub-prog-card');
            killCard.style.cursor = 'pointer';
            killCard.addEventListener('click', function () {
                if (typeof haptic === 'function') haptic('light');
                if (typeof doAction === 'function') doAction(pStats.kills_cb || 'kills_log');
            });
            var killVal = _hubDiv('hp-val');
            killVal.innerHTML = '<svg viewBox="0 0 120 120" style="width:14px;height:14px;vertical-align:middle;margin-right:3px;color:' + (HERALDIC_COLORS['ic-ach-algoz'] || '#c43020') + ';"><use href="#ic-ach-algoz"/></svg>' + pStats.kills;
            killCard.appendChild(killVal);
            var killLbl = _hubDiv('hp-lbl');
            killLbl.textContent = 'Abates';
            killCard.appendChild(killLbl);
            progRow.appendChild(killCard);
        }
        if (pStats && pStats.streak > 0) {
            var streakCard = _hubDiv('hub-prog-card');
            streakCard.style.cursor = 'pointer';
            streakCard.addEventListener('click', function () {
                if (typeof haptic === 'function') haptic('light');
                if (typeof doAction === 'function') doAction(pStats.streak_cb || 'streak_log');
            });
            var streakVal = _hubDiv('hp-val');
            streakVal.innerHTML = '<svg viewBox="0 0 120 120" style="width:14px;height:14px;vertical-align:middle;margin-right:3px;color:#ff8a4a;"><use href="#ic-ach-indomavel"/></svg>' + pStats.streak;
            streakCard.appendChild(streakVal);
            var streakLbl = _hubDiv('hp-lbl');
            streakLbl.textContent = 'Sequência';
            streakCard.appendChild(streakLbl);
            progRow.appendChild(streakCard);
        }

        frag.appendChild(progRow);
    }

    /* ── 8b. Daily Challenge Badge ──────────────────────────── */
    var dcb = screen.daily_challenge_badge;
    if (dcb && !dcb.completed && dcb.dungeon_name) {
        var dcEl = _hubDiv('hub-dc-badge');
        dcEl.style.cursor = 'pointer';
        dcEl.addEventListener('click', function () {
            if (typeof haptic === 'function') haptic('light');
            if (typeof doAction === 'function') doAction('daily_challenge_main');
        });
        /* Sess\u00E3o #64 (2026-05-30): sem emoji de lobo \u2014 user pediu s\u00F3 texto. */
        dcEl.textContent = 'Desafio: ' + dcb.dungeon_name;
        frag.appendChild(dcEl);
    }

    /* ── 9. DM Tip ───────────────────────────────────────────── */
    /* DM Tip REMOVIDO 2026-05-08 (X-6.5.51AQ): irrelevante, jogador n\u00E3o l\u00EA,
       ocupava espa\u00E7o no hub. Conte\u00FAdo `_dm_tip` do backend \u00E9 ignorado. */

    /* Append everything to the container */
    el.appendChild(frag);
}
// === SYNC_REGION END ===


/* ================================================================
   SUB-COMPONENTES
   ================================================================ */

/**
 * Constroi um card de aliado compacto para o grid do hub.
 * @param {Object} a — dados do aliado {n, c, ico, l, hp, mhp, mp, mmp, type, dead, ...}
 * @returns {HTMLElement}
 */
// === SYNC_REGION: _buildHubAlly BEGIN ===
function _buildHubAlly(a) {
    var card = _hubDiv('hub-ally');
    if (a.type === 'player') card.classList.add('player');
    if (a.dead) card.classList.add('dead');

    /* Emoji icon */
    var ico = _hubSpan('ha-ico', a.ico || '');
    card.appendChild(ico);

    /* Info column: name + bars */
    var info = _hubDiv('ha-info');

    /* Name + Level */
    var nameEl = _hubDiv('ha-name');
    nameEl.textContent = a.n || '';
    if (a.l > 0) {
        var lvlEl = _hubSpan('ha-lvl', ' Nv' + a.l);
        nameEl.appendChild(lvlEl);
    }
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
// === SYNC_REGION END ===

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
// === SYNC_REGION: _buildLocCell BEGIN ===
/* 2026-05-16: city location PNG map — generated by scripts/generate_city_icons.py.
   16 locais × 4 setores. Keyed por callback (loc.cb em CITY_LOCATIONS). */
var CITY_LOC_PNG_AVAILABLE = {
    'tavern': 1, 'inn': 1, 'rel_main': 1, 'action_quests': 1,
    'market': 1, 'bank': 1, 'open_workshop': 1, 'rune_scribe': 1,
    'guild': 1, 'gates': 1, 'arena': 1, 'daily_challenge': 1,
    'temple': 1, 'square': 1, 'action_codex': 1, 'festival': 1
};
function _cityLocIconHTML(cb, fallbackIco) {
    if (cb && CITY_LOC_PNG_AVAILABLE[cb]) {
        var base = '../valdoria-webapp/shared/img/city/';
        var loc = (typeof location !== 'undefined') ? location.href : '';
        if (loc.indexOf('file://') === 0) {
            base = '../valdoria-webapp/shared/img/city/';
        }
        /* Sessão #28 (2026-05-24): ?v=<bundle-hash> força cache bust pra browsers
           que tinham as PNGs com Cache-Control:immutable do header anterior.
           Sem isso, browsers servem versão velha (1.5MB) por até 1 ano sem nem
           consultar o servidor. Tier C (no-cache + ETag) só pega efeito em URLs
           novas — daí o sufixo. Date.now() fallback se bundle hash falhar.
           Sessão #56 (2026-05-28): FIX P0 cidade images — formato dos arquivos
           é .webp (gerado via OpenAI + Pillow + save_optimized kind='scenery'),
           NÃO .png. Antes o <img src="...tavern.png"> 404ava + onerror sumia o
           elemento. User reportou: "imagens taverna/missões/mercado/templo não
           aparecem". Fix: src usa .webp matching o filesystem. */
        var v = (typeof window !== 'undefined' && window.VBUNDLE_HASH) || Date.now();
        return '<img class="hl-ico-img" src="' + base + cb + '.webp?v=' + v + '" ' +
               'alt="" loading="lazy" ' +
               'onerror="this.onerror=null;this.outerHTML=\'\'">';
    }
    if (typeof fallbackIco === 'string' && fallbackIco.indexOf('<svg') === 0) {
        return fallbackIco;
    }
    return fallbackIco || '';
}
function _buildLocCell(ico, name, btn) {
    var cell = _hubDiv('hub-loc');

    /* USER REQUEST 2026-05-05: data-cb pra CSS aplicar cor temática por local
       (evita "tudo gold" — cada local tem sua cor heráldica natural). */
    if (btn && btn.cb) cell.setAttribute('data-cb', btn.cb);

    /* Sessão #63 (2026-05-30) — User pediu as IMAGENS geradas dos locais de
       volta, EM DESTAQUE no topo do card. Histórico: #56 mostrava como
       iconezinho 36px lateral; #62 removeu (user achou "ícone ao lado do nome"
       poluído); agora user quer as ilustrações .webp visíveis como thumbnail
       proeminente. _cityLocIconHTML retorna <img .webp> p/ locais em
       CITY_LOC_PNG_AVAILABLE; layout via .hl-thumb (CSS no <style> inline).
       Só adiciona se há imagem real (.webp) — fallback SVG/vazio = só nome. */
    var thumbHtml = (typeof _cityLocIconHTML === 'function') ? _cityLocIconHTML(btn && btn.cb, ico) : '';
    if (thumbHtml && thumbHtml.indexOf('<img') === 0) {
        var thumb = _hubDiv('hl-thumb');
        thumb.innerHTML = thumbHtml;
        cell.appendChild(thumb);
    }

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
// === SYNC_REGION END ===

/**
 * Constroi uma linha do mini quest tracker.
 * @param {Object} q — {title, stage, total, ready, cb, obj}
 * @returns {HTMLElement}
 */
// === SYNC_REGION: _buildQuestRow BEGIN ===
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
        statusEl.textContent = '\u2713'; /* check mark — pronta para entregar */
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
// === SYNC_REGION END ===


/* ── Nota ────────────────────────────────────────────────────── */
/* .hub-section-label e .ha-dead estilizados em game-hub.css    */

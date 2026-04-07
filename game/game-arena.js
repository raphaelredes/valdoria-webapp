/* ═══════════════════════════════════════════════════════════════
   Arena de Combate — Renderer dedicado
   Interceptado por game-popup-unified.js via arena_screen
   Nota: innerHTML usado com dados do servidor proprio (nao user input)
   ═══════════════════════════════════════════════════════════════ */

var _ARENA_MEDALS = {1: '\uD83E\uDD47', 2: '\uD83E\uDD48', 3: '\uD83E\uDD49'};

/**
 * Renders the Arena screen inside a popup body element.
 * @param {HTMLElement} el - Container element (popup body)
 * @param {Object} data - arena_screen structured data from backend
 */
function renderArenaScreen(el, data) {
    el.className = 'arena-screen';
    var type = data.type;
    if (type === 'main')        _renderArenaMain(el, data);
    else if (type === 'hp_warning') _renderArenaHpWarning(el, data);
    else if (type === 'result')     _renderArenaResult(el, data);
    else if (type === 'leaderboard') _renderArenaLeaderboard(el, data);
    else {
        el.textContent = 'Erro: tipo de tela desconhecido.';
    }
}

/* ── Coin icon helper ──────────────────────────────────────── */
function _arenaCoin() { return '<span class="vi vi-coin sm"></span>'; }

/* ── Main Screen ───────────────────────────────────────────── */
function _renderArenaMain(el, d) {
    var tier = d.tier || {};
    var stats = d.stats || {};
    var ch = d.challenger || {};
    var reward = d.reward || {};

    /* Build DOM via createElement for safety */
    var frag = document.createDocumentFragment();

    /* Tier header */
    var tierHeader = _div('arena-tier-header');
    var badge = _div('arena-tier-badge');
    badge.setAttribute('data-tier', tier.id || 'iron');
    badge.textContent = '\uD83C\uDFDF\uFE0F Tier ' + (tier.name || 'Ferro');
    tierHeader.appendChild(badge);
    var range = _div('arena-tier-range');
    range.textContent = 'N\u00edvel ' + (tier.min || 1) + ' \u2013 ' + (tier.max || 4);
    tierHeader.appendChild(range);
    frag.appendChild(tierHeader);

    /* Stats row */
    var statsRow = _div('arena-stats-row');
    statsRow.appendChild(_statBadgeEl(stats.wins || 0, 'Vit\u00f3rias', 'stat-wins'));
    statsRow.appendChild(_statBadgeEl(stats.losses || 0, 'Derrotas', 'stat-losses'));
    statsRow.appendChild(_statBadgeEl(stats.streak || 0, 'Sequ\u00eancia', 'stat-streak'));
    frag.appendChild(statsRow);

    /* Daily wins */
    var daily = _div('arena-daily-wins');
    daily.textContent = '\uD83D\uDCC5 Vit\u00f3rias hoje: ' + (stats.daily_wins || 0);
    frag.appendChild(daily);

    /* Challenger card */
    var card = _div('arena-challenger-card');
    var icon = _div('arena-challenger-icon');
    icon.textContent = ch.icon || '\u2694\uFE0F';
    card.appendChild(icon);
    var name = _div('arena-challenger-name');
    name.textContent = ch.name || '???';
    card.appendChild(name);
    var cls = document.createElement('span');
    cls.className = 'arena-challenger-class';
    cls.textContent = ch.cls || 'Guerreiro';
    card.appendChild(cls);
    if (ch.flavor) {
        var flavor = _div('arena-challenger-flavor');
        flavor.textContent = ch.flavor;
        card.appendChild(flavor);
    }
    var cStats = _div('arena-challenger-stats');
    cStats.appendChild(_cStat('\u2764\uFE0F ' + (ch.hp || 0)));
    cStats.appendChild(_cStat('\uD83D\uDEE1\uFE0F AC ' + (ch.ac || 0)));
    cStats.appendChild(_cStat('\u2694\uFE0F +' + (ch.atk || 0)));
    card.appendChild(cStats);
    frag.appendChild(card);

    /* Reward info — uses innerHTML for coin icon (server-controlled data) */
    var rewardInfo = _div('arena-reward-info');
    var goldRange = (reward.gold && reward.gold.length === 2) ? reward.gold[0] + '\u2013' + reward.gold[1] : '?';
    var r1 = document.createElement('span');
    r1.className = 'reward-item';
    r1.innerHTML = _arenaCoin() + ' ' + _esc(goldRange) + ' Valdoritas'; /* noqa: safe — server data only */
    rewardInfo.appendChild(r1);
    var r2 = document.createElement('span');
    r2.className = 'reward-item';
    r2.textContent = '\u2728 ' + (reward.xp || 0) + ' XP';
    rewardInfo.appendChild(r2);
    frag.appendChild(rewardInfo);

    /* Fee */
    var fee = _div('arena-fee');
    fee.innerHTML = 'Inscri\u00e7\u00e3o: ' + _arenaCoin() + ' ' + _esc(String(d.fee || 0)) + ' Valdoritas'; /* noqa: safe — server data only */
    frag.appendChild(fee);

    /* Actions */
    var actions = _div('arena-actions');
    if (d.cooldown > 0) {
        var cd = _div('arena-cooldown');
        cd.textContent = '\u23F3 Pr\u00f3ximo combate em ' + d.cooldown + ' turno(s)';
        actions.appendChild(cd);
    } else if (!d.can_afford) {
        var ins = _div('arena-insufficient');
        ins.textContent = '\u274C Valdoritas insuficientes';
        actions.appendChild(ins);
    } else {
        var feeText = '\u2694\uFE0F Desafiar! (-' + (d.fee || 0) + ' Valdoritas)';
        actions.appendChild(_makeBtn(feeText, 'arena_challenge', 'arena-btn--challenge'));
    }
    actions.appendChild(_makeBtn('\uD83C\uDFC6 Ranking do Dia', 'arena_daily_board', 'arena-btn--ranking'));
    frag.appendChild(actions);

    el.appendChild(frag);
}

/* ── HP Warning ────────────────────────────────────────────── */
function _renderArenaHpWarning(el, d) {
    var pct = d.hp_pct || 0;
    var barClass = pct <= 25 ? 'hp-crit' : 'hp-warn';
    var frag = document.createDocumentFragment();
    var wrap = _div('arena-hp-warning');

    /* Status panel: heart + bar + text */
    var panel = _div('arena-hp-status-panel');

    var heartIcon = document.createElement('div');
    heartIcon.textContent = '\u2764\uFE0F';
    heartIcon.style.fontSize = '36px';
    heartIcon.style.lineHeight = '1';
    panel.appendChild(heartIcon);

    var barWrap = _div('arena-hp-bar-wrap');
    var bar = _div('arena-hp-bar');
    var fill = _div('arena-hp-bar-fill ' + barClass);
    fill.style.width = Math.max(2, pct) + '%';
    bar.appendChild(fill);
    barWrap.appendChild(bar);
    panel.appendChild(barWrap);

    var hpText = _div('arena-hp-text');
    hpText.textContent = (d.hp || 0) + '/' + (d.max_hp || 0) + ' (' + pct + '%)';
    panel.appendChild(hpText);

    wrap.appendChild(panel);

    /* Message */
    var msg = _div('arena-hp-msg');
    msg.textContent = 'Entrar na arena com pouca vida \u00e9 arriscado! Considere se recuperar antes do combate.';
    wrap.appendChild(msg);

    /* Choice cards */
    var choices = _div('arena-hp-choices');

    if (d.has_potion) {
        var potionSub = d.potion_count ? d.potion_count + ' dispon\u00edvel(is)' : 'Recuperar HP';
        choices.appendChild(_makeChoiceCard(
            '\uD83E\uDDEA', 'Usar Po\u00e7\u00e3o de Cura', potionSub,
            'action_use_potion_heal', 'choice-potion'
        ));
    }

    choices.appendChild(_makeChoiceCard(
        '\uD83C\uDFE8', 'Ir para Estalagem', 'Descansar e recuperar HP',
        'open_inn', 'choice-inn'
    ));

    choices.appendChild(_makeChoiceCard(
        '\u2694\uFE0F', 'Lutar Mesmo Assim!', 'Alto risco - HP baixo',
        'arena_force_fight', 'choice-fight risky'
    ));

    wrap.appendChild(choices);

    /* Back button */
    wrap.appendChild(_makeBtn('\u2B05\uFE0F Voltar', 'arena_main', 'arena-btn--back'));

    frag.appendChild(wrap);
    el.appendChild(frag);
}

/* ── Result Screen ─────────────────────────────────────────── */
function _renderArenaResult(el, d) {
    var victory = d.victory;
    var ch = d.challenger || {};
    var rewards = d.rewards || {};
    var stats = d.stats || {};
    var frag = document.createDocumentFragment();
    var wrap = _div('arena-result');

    /* Crown — standalone emoji for independent CSS animation */
    var crown = _div('arena-result-crown');
    crown.textContent = victory ? '\uD83C\uDFC6' : '\uD83D\uDC80';
    wrap.appendChild(crown);

    /* Header with victory/defeat class — text only, no emoji */
    var header = _div('arena-result-header ' + (victory ? 'victory' : 'defeat'));
    var titleSpan = document.createElement('span');
    titleSpan.className = 'arena-result-title';
    titleSpan.textContent = victory ? 'VIT\u00d3RIA!' : 'DERROTA';
    header.appendChild(titleSpan);
    wrap.appendChild(header);

    /* Opponent */
    if (ch && ch.name) {
        var opLabel = victory ? 'Oponente derrotado: ' : 'Derrotado por: ';
        var op = _div('arena-result-opponent');
        op.textContent = opLabel + (ch.icon || '\u2694\uFE0F') + ' ' + ch.name;
        wrap.appendChild(op);
    }

    /* Flavor */
    if (d.flavor) {
        var flav = _div('arena-result-flavor');
        flav.textContent = d.flavor;
        wrap.appendChild(flav);
    }

    /* Rewards (victory only) */
    if (victory) {
        var list = _div('arena-rewards-list');

        /* Gold */
        var goldCard = _div('arena-reward-card');
        var goldText = _arenaCoin() + ' +' + _esc(String(rewards.gold || 0)) + ' Valdoritas';
        if (rewards.streak_bonus_gold > 0) {
            goldText += ' <span class="arena-reward-bonus">+' + _esc(String(rewards.streak_bonus_gold)) + ' b\u00f4nus</span>';
        }
        goldCard.innerHTML = goldText; /* noqa: safe — server data only */
        list.appendChild(goldCard);

        /* XP */
        var xpCard = _div('arena-reward-card');
        xpCard.textContent = '\u2728 +' + (rewards.xp || 0) + ' XP';
        if (rewards.streak_bonus_xp > 0) {
            var xpBonus = document.createElement('span');
            xpBonus.className = 'arena-reward-bonus';
            xpBonus.textContent = '+' + rewards.streak_bonus_xp + ' b\u00f4nus';
            xpCard.appendChild(xpBonus);
        }
        list.appendChild(xpCard);

        /* Streak */
        if (stats.streak > 0) {
            var streakCard = _div('arena-reward-card streak');
            streakCard.textContent = '\uD83D\uDD25 Sequ\u00eancia: ' + stats.streak;
            list.appendChild(streakCard);
        }

        /* Daily wins */
        var dailyCard = _div('arena-reward-card');
        dailyCard.textContent = '\uD83D\uDCC5 Vit\u00f3rias hoje: ' + (stats.daily_wins || 0);
        list.appendChild(dailyCard);

        wrap.appendChild(list);
    }

    /* Buttons */
    var actions = _div('arena-actions');
    actions.appendChild(_makeBtn('\uD83C\uDFDF\uFE0F Arena', 'arena_main', 'arena-btn--challenge'));
    actions.appendChild(_makeBtn('\uD83C\uDFD8\uFE0F Cidade', 'action_city_hub', 'arena-btn--city'));
    wrap.appendChild(actions);

    frag.appendChild(wrap);
    el.appendChild(frag);
}

/* ── Leaderboard ───────────────────────────────────────────── */
function _renderArenaLeaderboard(el, d) {
    var entries = d.entries || [];
    var frag = document.createDocumentFragment();
    var wrap = _div('arena-leaderboard');

    /* Date */
    var dateEl = _div('arena-lb-date');
    dateEl.textContent = 'Vit\u00f3rias na arena hoje (' + (d.date || '') + ')';
    wrap.appendChild(dateEl);

    if (entries.length === 0) {
        var empty = _div('arena-lb-empty');
        empty.textContent = 'Nenhuma vit\u00f3ria registrada hoje. Seja o primeiro!';
        wrap.appendChild(empty);
    } else {
        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            var medal = _ARENA_MEDALS[e.rank] || '';
            var row = _div('arena-lb-entry' + (e.is_player ? ' is-player' : ''));

            if (medal) {
                var mEl = document.createElement('span');
                mEl.className = 'arena-lb-medal';
                mEl.textContent = medal;
                row.appendChild(mEl);
            } else {
                var rEl = document.createElement('span');
                rEl.className = 'arena-lb-rank';
                rEl.textContent = e.rank + '.';
                row.appendChild(rEl);
            }

            var nEl = document.createElement('span');
            nEl.className = 'arena-lb-name';
            nEl.textContent = (e.is_player ? '\u25BA ' : '') + (e.name || '???');
            row.appendChild(nEl);

            var lEl = document.createElement('span');
            lEl.className = 'arena-lb-level';
            lEl.textContent = 'Nv.' + (e.level || 1);
            row.appendChild(lEl);

            var wEl = document.createElement('span');
            wEl.className = 'arena-lb-wins';
            wEl.textContent = String(e.wins || 0);
            row.appendChild(wEl);

            wrap.appendChild(row);
        }
    }

    /* Player outside top 10 */
    if (entries.length > 0 && d.player_rank > 0) {
        wrap.appendChild(document.createElement('hr')).className = 'arena-lb-separator';
        var pRow = _div('arena-lb-entry is-player');
        var pRank = document.createElement('span');
        pRank.className = 'arena-lb-rank';
        pRank.textContent = '#' + d.player_rank;
        pRow.appendChild(pRank);
        var pName = document.createElement('span');
        pName.className = 'arena-lb-name';
        pName.textContent = '\u25BA ' + (d.player_name || '');
        pRow.appendChild(pName);
        var pWins = document.createElement('span');
        pWins.className = 'arena-lb-wins';
        pWins.textContent = String(d.player_wins || 0);
        pRow.appendChild(pWins);
        wrap.appendChild(pRow);
    } else if (entries.length > 0 && d.player_wins === 0) {
        var noWin = _div('arena-lb-empty');
        noWin.textContent = 'Voc\u00ea ainda n\u00e3o venceu hoje.';
        wrap.appendChild(noWin);
    }

    /* Button */
    var actions = _div('arena-actions');
    actions.style.marginTop = 'var(--v-space-md, 8px)';
    actions.appendChild(_makeBtn('\uD83C\uDFDF\uFE0F Arena', 'arena_main', ''));
    wrap.appendChild(actions);

    frag.appendChild(wrap);
    el.appendChild(frag);
}

/* ── DOM Helpers ───────────────────────────────────────────── */
function _div(cls) {
    var d = document.createElement('div');
    d.className = cls;
    return d;
}

function _statBadgeEl(value, label, cls) {
    var d = _div('arena-stat-badge ' + (cls || ''));
    var v = document.createElement('span');
    v.className = 'stat-value';
    v.textContent = String(value);
    d.appendChild(v);
    var l = document.createElement('span');
    l.className = 'stat-label';
    l.textContent = label;
    d.appendChild(l);
    return d;
}

function _cStat(text) {
    var s = document.createElement('span');
    s.className = 'c-stat';
    s.textContent = text;
    return s;
}

function _makeBtn(text, cb, extraClass) {
    var btn = document.createElement('button');
    btn.className = 'arena-btn' + (extraClass ? ' ' + extraClass : '');
    btn.textContent = text;
    btn.onclick = function() {
        if (typeof haptic === 'function') haptic('medium');
        if (typeof doAction === 'function') doAction(cb);
    };
    return btn;
}

function _makeChoiceCard(icon, title, subtitle, cb, extraCls) {
    var card = document.createElement('button');
    card.className = 'arena-hp-choice' + (extraCls ? ' ' + extraCls : '');
    var icoEl = _div('arena-hp-choice-icon');
    icoEl.textContent = icon;
    var textEl = _div('arena-hp-choice-text');
    var titleEl = document.createElement('div');
    titleEl.textContent = title;
    var subEl = document.createElement('div');
    subEl.textContent = subtitle;
    textEl.appendChild(titleEl);
    textEl.appendChild(subEl);
    card.appendChild(icoEl);
    card.appendChild(textEl);
    card.addEventListener('click', function() {
        if (typeof haptic === 'function') haptic('medium');
        if (typeof doAction === 'function') doAction(cb);
    });
    return card;
}

function _esc(s) {
    if (typeof vEsc === 'function') return vEsc(s);
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
}

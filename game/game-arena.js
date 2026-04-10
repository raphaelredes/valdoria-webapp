/* ═══════════════════════════════════════════════════════════════
   Arena de Combate — Gladiator/Coliseum Redesign (#41)
   Interceptado por game-popup-unified.js via arena_screen

   Design references aplicadas:
   - Game UI Database: tier badges que ficam mais imponentes a cada rank
   - Gladiator Arena assets: arches, columns, crowd silhouette, torches
   - Hipsters & Dragons: multiple tiers of bloodthirsty spectators
   - Medieval UI patterns: laurel wreaths, embossed gold, stone textures

   Safe DOM: todos os elementos construidos via createElement/textContent.
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
    if (type === 'main')             _renderArenaMain(el, data);
    else if (type === 'hp_warning')  _renderArenaHpWarning(el, data);
    else if (type === 'result')      _renderArenaResult(el, data);
    else if (type === 'leaderboard') _renderArenaLeaderboard(el, data);
    else {
        el.textContent = 'Erro: tipo de tela desconhecido.';
    }
}

/* ── Coin icon helper (safe DOM) ───────────────────────────── */
function _coinEl() {
    var s = document.createElement('span');
    s.className = 'vi vi-coin sm';
    return s;
}

/* ── Coliseum backdrop (shared decorative element) ────────── */
function _arenaBackdrop() {
    var back = _div('arena-backdrop');
    back.setAttribute('aria-hidden', 'true');
    back.appendChild(_div('arena-backdrop-crowd'));
    back.appendChild(_div('arena-backdrop-arch arch-left'));
    back.appendChild(_div('arena-backdrop-arch arch-right'));
    var torchL = _div('arena-backdrop-torch torch-left');
    torchL.appendChild(_div('torch-flame'));
    back.appendChild(torchL);
    var torchR = _div('arena-backdrop-torch torch-right');
    torchR.appendChild(_div('torch-flame'));
    back.appendChild(torchR);
    return back;
}

/* ── Main Screen ───────────────────────────────────────────── */
function _renderArenaMain(el, d) {
    var tier = d.tier || {};
    var stats = d.stats || {};
    var ch = d.challenger || {};
    var reward = d.reward || {};

    var frag = document.createDocumentFragment();

    /* Coliseum backdrop with torches + crowd silhouette */
    frag.appendChild(_arenaBackdrop());

    /* Hero tier badge — imposing laurel wreath */
    var tierWrap = _div('arena-tier-hero');
    var laurel = _div('arena-tier-laurel');
    var tierId = tier.id || 'iron';
    var badge = _div('arena-tier-medallion');
    badge.setAttribute('data-tier', tierId);
    var tierLabel = _div('arena-tier-label');
    tierLabel.textContent = 'TIER';
    badge.appendChild(tierLabel);
    var tierName = _div('arena-tier-name');
    tierName.textContent = (tier.name || 'Ferro').toUpperCase();
    badge.appendChild(tierName);
    var tierRange = _div('arena-tier-range');
    tierRange.textContent = 'N\u00edvel ' + (tier.min || 1) + '\u2013' + (tier.max || 4);
    badge.appendChild(tierRange);
    laurel.appendChild(badge);
    tierWrap.appendChild(laurel);
    frag.appendChild(tierWrap);

    /* Record tablet — wins / losses / streak */
    var tablet = _div('arena-record-tablet');
    var tabHeader = _div('arena-record-header');
    tabHeader.textContent = 'REGISTRO DE COMBATE';
    tablet.appendChild(tabHeader);
    var statsRow = _div('arena-stats-row');
    statsRow.appendChild(_statBadgeEl(stats.wins || 0, 'Vit\u00f3rias', 'stat-wins'));
    statsRow.appendChild(_statBadgeEl(stats.losses || 0, 'Derrotas', 'stat-losses'));
    statsRow.appendChild(_statBadgeEl(stats.streak || 0, 'Sequ\u00eancia', 'stat-streak'));
    tablet.appendChild(statsRow);
    var daily = _div('arena-daily-wins');
    var dailyPrefix = document.createElement('span');
    dailyPrefix.textContent = '\uD83D\uDCDC Vit\u00f3rias hoje: ';
    daily.appendChild(dailyPrefix);
    var dailyStrong = document.createElement('strong');
    dailyStrong.textContent = String(stats.daily_wins || 0);
    daily.appendChild(dailyStrong);
    tablet.appendChild(daily);
    frag.appendChild(tablet);

    /* Ornamental divider */
    frag.appendChild(_dividerEl());

    /* Challenger reveal card — portrait frame */
    var card = _div('arena-challenger-card');
    var cardLabel = _div('arena-challenger-label');
    cardLabel.textContent = '\u25C6 PR\u00d3XIMO DESAFIANTE \u25C6';
    card.appendChild(cardLabel);

    var portraitWrap = _div('arena-challenger-portrait');
    var portraitFrame = _div('arena-portrait-frame');
    var icon = _div('arena-challenger-icon');
    icon.textContent = ch.icon || '\u2694\uFE0F';
    portraitFrame.appendChild(icon);
    portraitWrap.appendChild(portraitFrame);
    card.appendChild(portraitWrap);

    var name = _div('arena-challenger-name');
    name.textContent = ch.name || '???';
    card.appendChild(name);
    var cls = document.createElement('span');
    cls.className = 'arena-challenger-class';
    cls.textContent = ch.cls || 'Guerreiro';
    card.appendChild(cls);
    if (ch.flavor) {
        var flavor = _div('arena-challenger-flavor');
        flavor.textContent = '\u201C' + ch.flavor + '\u201D';
        card.appendChild(flavor);
    }
    var cStats = _div('arena-challenger-stats');
    cStats.appendChild(_cStat('\u2764\uFE0F', ch.hp || 0, 'HP'));
    cStats.appendChild(_cStat('\uD83D\uDEE1\uFE0F', ch.ac || 0, 'CA'));
    cStats.appendChild(_cStat('\u2694\uFE0F', '+' + (ch.atk || 0), 'ATQ'));
    card.appendChild(cStats);
    frag.appendChild(card);

    /* Reward scroll — gold + xp preview */
    var rewardScroll = _div('arena-reward-scroll');
    var rewardHeader = _div('arena-reward-header');
    rewardHeader.textContent = 'RECOMPENSAS DA VIT\u00d3RIA';
    rewardScroll.appendChild(rewardHeader);
    var rewardRow = _div('arena-reward-row');
    var goldRange = (reward.gold && reward.gold.length === 2) ? reward.gold[0] + '\u2013' + reward.gold[1] : '?';
    var r1 = _div('reward-item reward-gold');
    r1.appendChild(_coinEl());
    var r1Range = document.createElement('strong');
    r1Range.textContent = ' ' + goldRange + ' ';
    r1.appendChild(r1Range);
    var r1Suffix = document.createElement('span');
    r1Suffix.textContent = 'Valdoritas';
    r1.appendChild(r1Suffix);
    rewardRow.appendChild(r1);
    var r2 = _div('reward-item reward-xp');
    r2.textContent = '\u2728 ' + (reward.xp || 0) + ' XP';
    rewardRow.appendChild(r2);
    rewardScroll.appendChild(rewardRow);
    var fee = _div('arena-fee');
    var feeLabel = document.createElement('span');
    feeLabel.className = 'fee-label';
    feeLabel.textContent = 'Inscri\u00e7\u00e3o';
    fee.appendChild(feeLabel);
    fee.appendChild(_coinEl());
    var feeAmount = document.createElement('strong');
    feeAmount.textContent = ' ' + (d.fee || 0) + ' ';
    fee.appendChild(feeAmount);
    var feeUnit = document.createElement('span');
    feeUnit.textContent = 'Valdoritas';
    fee.appendChild(feeUnit);
    rewardScroll.appendChild(fee);
    frag.appendChild(rewardScroll);

    /* Actions */
    var actions = _div('arena-actions');
    if (d.cooldown > 0) {
        var cd = _div('arena-cooldown');
        var cdIntro = document.createElement('span');
        cdIntro.textContent = '\u23F3 Pr\u00f3ximo combate em ';
        cd.appendChild(cdIntro);
        var cdTurns = document.createElement('strong');
        cdTurns.textContent = String(d.cooldown);
        cd.appendChild(cdTurns);
        var cdSuffix = document.createElement('span');
        cdSuffix.textContent = ' turno(s)';
        cd.appendChild(cdSuffix);
        actions.appendChild(cd);
    } else if (!d.can_afford) {
        var ins = _div('arena-insufficient');
        ins.textContent = '\u274C Valdoritas insuficientes para a taxa';
        actions.appendChild(ins);
    } else {
        var feeText = 'DESAFIAR \u2694 \u2212' + (d.fee || 0) + ' Valdoritas';
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

    /* Warning icon */
    var warnIcon = _div('arena-hp-warn-icon');
    warnIcon.textContent = pct <= 25 ? '\uD83D\uDC80' : '\u26A0\uFE0F';
    wrap.appendChild(warnIcon);

    var warnTitle = _div('arena-hp-warn-title');
    warnTitle.textContent = 'VIDA EM PERIGO';
    wrap.appendChild(warnTitle);

    /* Status panel: heart + bar + text */
    var panel = _div('arena-hp-status-panel');

    var heartIcon = _div('arena-hp-heart');
    heartIcon.textContent = '\u2764\uFE0F';
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
    msg.textContent = 'Entrar na arena com pouca vida \u00e9 arriscado. Os curandeiros n\u00e3o v\u00e3o te salvar no meio do combate.';
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
        '\u2694\uFE0F', 'Lutar Mesmo Assim', 'Alto risco \u2014 HP baixo',
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
    var wrap = _div('arena-result ' + (victory ? 'is-victory' : 'is-defeat'));

    /* Coliseum backdrop for drama */
    wrap.appendChild(_arenaBackdrop());

    /* Crown/Skull with radial glow */
    var crownWrap = _div('arena-result-crown-wrap');
    var crown = _div('arena-result-crown');
    crown.textContent = victory ? '\uD83C\uDFC6' : '\uD83D\uDC80';
    crownWrap.appendChild(crown);
    wrap.appendChild(crownWrap);

    /* Header with victory/defeat class */
    var header = _div('arena-result-header ' + (victory ? 'victory' : 'defeat'));
    var titleSpan = document.createElement('span');
    titleSpan.className = 'arena-result-title';
    titleSpan.textContent = victory ? 'VIT\u00d3RIA!' : 'DERROTA';
    header.appendChild(titleSpan);
    wrap.appendChild(header);

    /* Opponent */
    if (ch && ch.name) {
        var opLabel = victory ? 'Oponente derrotado' : 'Derrotado por';
        var op = _div('arena-result-opponent');
        var opLabelEl = _div('opponent-label');
        opLabelEl.textContent = opLabel;
        op.appendChild(opLabelEl);
        var opName = _div('opponent-name');
        opName.textContent = (ch.icon || '\u2694\uFE0F') + ' ' + ch.name;
        op.appendChild(opName);
        wrap.appendChild(op);
    }

    /* Flavor */
    if (d.flavor) {
        var flav = _div('arena-result-flavor');
        flav.textContent = '\u201C' + d.flavor + '\u201D';
        wrap.appendChild(flav);
    }

    /* Rewards (victory only) */
    if (victory) {
        var listHeader = _div('arena-rewards-header');
        listHeader.textContent = '\u25C6 ESP\u00d3LIOS DA ARENA \u25C6';
        wrap.appendChild(listHeader);

        var list = _div('arena-rewards-list');

        /* Gold */
        var goldCard = _div('arena-reward-card reward-gold');
        var goldIcon = _div('reward-icon');
        goldIcon.appendChild(_coinEl());
        goldCard.appendChild(goldIcon);
        var goldText = _div('reward-text');
        var goldMain = document.createElement('strong');
        goldMain.textContent = '+' + (rewards.gold || 0) + ' Valdoritas';
        goldText.appendChild(goldMain);
        if (rewards.streak_bonus_gold > 0) {
            var bonus = document.createElement('span');
            bonus.className = 'arena-reward-bonus';
            bonus.textContent = 'b\u00f4nus de sequ\u00eancia +' + rewards.streak_bonus_gold;
            goldText.appendChild(bonus);
        }
        goldCard.appendChild(goldText);
        list.appendChild(goldCard);

        /* XP */
        var xpCard = _div('arena-reward-card reward-xp');
        var xpIcon = _div('reward-icon');
        xpIcon.textContent = '\u2728';
        xpCard.appendChild(xpIcon);
        var xpText = _div('reward-text');
        var xpMain = document.createElement('strong');
        xpMain.textContent = '+' + (rewards.xp || 0) + ' XP';
        xpText.appendChild(xpMain);
        if (rewards.streak_bonus_xp > 0) {
            var xpBonus = document.createElement('span');
            xpBonus.className = 'arena-reward-bonus';
            xpBonus.textContent = 'b\u00f4nus de sequ\u00eancia +' + rewards.streak_bonus_xp;
            xpText.appendChild(xpBonus);
        }
        xpCard.appendChild(xpText);
        list.appendChild(xpCard);

        /* Streak */
        if (stats.streak > 0) {
            var streakCard = _div('arena-reward-card streak');
            var streakIcon = _div('reward-icon');
            streakIcon.textContent = '\uD83D\uDD25';
            streakCard.appendChild(streakIcon);
            var streakText = _div('reward-text');
            var streakStrong = document.createElement('strong');
            streakStrong.textContent = 'Sequ\u00eancia: ';
            streakText.appendChild(streakStrong);
            var streakVal = document.createElement('span');
            streakVal.textContent = String(stats.streak);
            streakText.appendChild(streakVal);
            streakCard.appendChild(streakText);
            list.appendChild(streakCard);
        }

        /* Daily wins */
        var dailyCard = _div('arena-reward-card');
        var dailyIcon = _div('reward-icon');
        dailyIcon.textContent = '\uD83D\uDCDC';
        dailyCard.appendChild(dailyIcon);
        var dailyText = _div('reward-text');
        var dailyStrong2 = document.createElement('strong');
        dailyStrong2.textContent = 'Vit\u00f3rias hoje: ';
        dailyText.appendChild(dailyStrong2);
        var dailyVal = document.createElement('span');
        dailyVal.textContent = String(stats.daily_wins || 0);
        dailyText.appendChild(dailyVal);
        dailyCard.appendChild(dailyText);
        list.appendChild(dailyCard);

        wrap.appendChild(list);
    }

    /* Buttons */
    var actions = _div('arena-actions');
    actions.appendChild(_makeBtn(victory ? '\u2694 NOVO COMBATE' : '\uD83C\uDFDF\uFE0F Voltar \u00e0 Arena', 'arena_main', 'arena-btn--challenge'));
    actions.appendChild(_makeBtn('\uD83C\uDFD8\uFE0F Cidade', 'action_city_hub', 'arena-btn--city'));
    wrap.appendChild(actions);

    frag.appendChild(wrap);
    el.appendChild(frag);

    /* Play fanfare on victory (audio manager is optional) */
    if (victory && typeof ValdoriaAudio !== 'undefined' && typeof ValdoriaAudio.playSFX === 'function') {
        try { ValdoriaAudio.playSFX('victory_fanfare'); } catch (e) { /* silent */ }
    }
}

/* ── Leaderboard ───────────────────────────────────────────── */
function _renderArenaLeaderboard(el, d) {
    var entries = d.entries || [];
    var frag = document.createDocumentFragment();
    var wrap = _div('arena-leaderboard');

    /* Header with trophy */
    var header = _div('arena-lb-header');
    var trophy = _div('arena-lb-trophy');
    trophy.textContent = '\uD83C\uDFC6';
    header.appendChild(trophy);
    var title = _div('arena-lb-title');
    title.textContent = 'HALL DOS CAMPE\u00d5ES';
    header.appendChild(title);
    var dateEl = _div('arena-lb-date');
    dateEl.textContent = 'Vit\u00f3rias de hoje \u00b7 ' + (d.date || '');
    header.appendChild(dateEl);
    wrap.appendChild(header);

    if (entries.length === 0) {
        var empty = _div('arena-lb-empty');
        var emptyIcon = _div('arena-lb-empty-icon');
        emptyIcon.textContent = '\uD83C\uDFDF\uFE0F';
        empty.appendChild(emptyIcon);
        var emptyText = document.createElement('div');
        emptyText.textContent = 'Nenhuma vit\u00f3ria registrada hoje.';
        empty.appendChild(emptyText);
        var emptySub = document.createElement('div');
        emptySub.className = 'empty-sub';
        emptySub.textContent = 'Seja o primeiro a entrar na arena!';
        empty.appendChild(emptySub);
        wrap.appendChild(empty);
    } else {
        /* Podium for top 3 */
        var topThree = entries.slice(0, 3);
        if (topThree.length > 0) {
            var podium = _div('arena-lb-podium');
            /* Order: 2nd, 1st, 3rd for visual podium effect */
            var podiumOrder = [];
            if (topThree[1]) podiumOrder.push({e: topThree[1], pos: 2});
            if (topThree[0]) podiumOrder.push({e: topThree[0], pos: 1});
            if (topThree[2]) podiumOrder.push({e: topThree[2], pos: 3});
            for (var i = 0; i < podiumOrder.length; i++) {
                var p = podiumOrder[i];
                var step = _div('arena-lb-podium-step podium-' + p.pos + (p.e.is_player ? ' is-player' : ''));
                var medal = _div('arena-lb-podium-medal');
                medal.textContent = _ARENA_MEDALS[p.pos] || '';
                step.appendChild(medal);
                var pName = _div('arena-lb-podium-name');
                pName.textContent = (p.e.is_player ? '\u25BA ' : '') + (p.e.name || '???');
                step.appendChild(pName);
                var pLv = _div('arena-lb-podium-level');
                pLv.textContent = 'Nv.' + (p.e.level || 1);
                step.appendChild(pLv);
                var pWins = _div('arena-lb-podium-wins');
                pWins.textContent = (p.e.wins || 0) + ' vit.';
                step.appendChild(pWins);
                var base = _div('arena-lb-podium-base');
                base.setAttribute('data-pos', String(p.pos));
                step.appendChild(base);
                podium.appendChild(step);
            }
            wrap.appendChild(podium);
        }

        /* Remaining entries (4-10) */
        var rest = entries.slice(3);
        if (rest.length > 0) {
            var restHeader = _div('arena-lb-rest-header');
            restHeader.textContent = '\u25C6 Demais Gladiadores \u25C6';
            wrap.appendChild(restHeader);

            var restList = _div('arena-lb-list');
            for (var j = 0; j < rest.length; j++) {
                var e = rest[j];
                var row = _div('arena-lb-entry' + (e.is_player ? ' is-player' : ''));

                var rEl = document.createElement('span');
                rEl.className = 'arena-lb-rank';
                rEl.textContent = String(e.rank);
                row.appendChild(rEl);

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

                restList.appendChild(row);
            }
            wrap.appendChild(restList);
        }
    }

    /* Player outside top 10 */
    if (entries.length > 0 && d.player_rank > 0) {
        var sep = document.createElement('hr');
        sep.className = 'arena-lb-separator';
        wrap.appendChild(sep);
        var pRow = _div('arena-lb-entry is-player');
        var pRank = document.createElement('span');
        pRank.className = 'arena-lb-rank';
        pRank.textContent = '#' + d.player_rank;
        pRow.appendChild(pRank);
        var pName2 = document.createElement('span');
        pName2.className = 'arena-lb-name';
        pName2.textContent = '\u25BA ' + (d.player_name || '');
        pRow.appendChild(pName2);
        var pWins2 = document.createElement('span');
        pWins2.className = 'arena-lb-wins';
        pWins2.textContent = String(d.player_wins || 0);
        pRow.appendChild(pWins2);
        wrap.appendChild(pRow);
    } else if (entries.length > 0 && d.player_wins === 0) {
        var noWin = _div('arena-lb-empty arena-lb-noplayer');
        noWin.textContent = 'Voc\u00ea ainda n\u00e3o venceu hoje. Entre na arena!';
        wrap.appendChild(noWin);
    }

    /* Button */
    var actions = _div('arena-actions');
    actions.appendChild(_makeBtn('\u2B05\uFE0F Voltar \u00e0 Arena', 'arena_main', 'arena-btn--back-main'));
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

function _dividerEl() {
    var d = _div('arena-divider');
    d.appendChild(_div('arena-divider-line'));
    var gem = _div('arena-divider-gem');
    gem.textContent = '\u25C6';
    d.appendChild(gem);
    d.appendChild(_div('arena-divider-line'));
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

function _cStat(icon, value, label) {
    var s = document.createElement('div');
    s.className = 'c-stat';
    var iconEl = document.createElement('span');
    iconEl.className = 'c-stat-icon';
    iconEl.textContent = icon;
    s.appendChild(iconEl);
    var valEl = document.createElement('span');
    valEl.className = 'c-stat-value';
    valEl.textContent = String(value);
    s.appendChild(valEl);
    var lblEl = document.createElement('span');
    lblEl.className = 'c-stat-label';
    lblEl.textContent = label;
    s.appendChild(lblEl);
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

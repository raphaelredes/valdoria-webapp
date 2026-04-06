/**
 * game-tavern-games.js — Professional renderers for tavern gambling games
 *
 * Intercepts _tavern_game from server and renders structured no-scroll cards
 * inside unified popups (all city screens are mandatory popups).
 * Types: pit_fight_menu, pit_fight_result, dice_menu, dice_result,
 *        bones_phase, bones_result, xgte_result, challenge_result,
 *        drinking_round, drinking_result, tournament_status, bet_menu, cooldown
 */

/* -- Shared Helpers -- */

function _tgEl(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text) el.textContent = text;
    return el;
}

function _tgBtn(label, action, cls) {
    var btn = document.createElement('button');
    btn.className = cls || 'tg-bet-btn';
    btn.textContent = label;
    btn.setAttribute('data-action', action);
    return btn;
}

function _tgOutcomeCls(outcome) {
    if (!outcome) return '';
    if (outcome.indexOf('win') >= 0 || outcome.indexOf('victory') >= 0 || outcome === 'perfect' || outcome === 'jackpot' || outcome === 'crushing' || outcome === 'champion') return 'tg-outcome--win';
    if (outcome.indexOf('loss') >= 0 || outcome.indexOf('defeat') >= 0 || outcome === 'eliminated' || outcome === 'brawl' || outcome === 'poisoned') return 'tg-outcome--loss';
    return 'tg-outcome--draw';
}

var _OUTCOME_TITLES = {
    'loss_total': '\ud83d\udc80 Derrota Humilhante',
    'loss_half': '\ud83d\udc4e Derrota',
    'win': '\ud83c\udfc6 Vit\u00f3ria!',
    'win_perfect': '\ud83c\udf1f Vit\u00f3ria Perfeita!',
    'jackpot': '\ud83c\udf1f Jackpot!',
    'crushing': '\u2694\ufe0f Vit\u00f3ria Esmagadora!',
    'draw': '\ud83e\udd1d Empate',
    'brawl': '\ud83e\udd4a Briga!',
    'champion': '\ud83d\udc51 Campe\u00e3o!',
    'eliminated': '\ud83d\udc80 Eliminado',
    'poisoned': '\ud83e\udd22 Envenenado'
};

/* -- Main Entry Point -- */

window.renderTavernGame = function(el, data) {
    if (!data || !data.type) return false;
    el.textContent = '';
    el.classList.add('tg-card');
    var fn = _RENDERERS[data.type];
    if (fn) { fn(el, data); return true; }
    return false;
};

/* -- Pit Fight -- */

function _renderPitFightResult(el, d) {
    /* Opponent badge */
    var opp = _tgEl('div', 'tg-opponent');
    var oppName = _tgEl('span', 'tg-opponent-name', 'vs ' + (d.opponent || '???'));
    var oppDc = _tgEl('span', 'tg-dc', 'DC ' + (d.dc || '?'));
    opp.appendChild(oppName);
    opp.appendChild(oppDc);
    el.appendChild(opp);

    /* Check results grid (3 columns) */
    var checks = d.checks || [];
    var grid = _tgEl('div', 'tg-checks');
    for (var i = 0; i < checks.length; i++) {
        var c = checks[i];
        var cell = _tgEl('div', 'tg-check ' + (c.success ? 'tg-check--pass' : 'tg-check--fail'));
        cell.appendChild(_tgEl('div', 'tg-check-stat', c.stat || c.skill));
        cell.appendChild(_tgEl('div', 'tg-check-roll', String(c.total || 0)));
        cell.appendChild(_tgEl('div', 'tg-check-icon', c.success ? '\u2713' : '\u2717'));
        grid.appendChild(cell);
    }
    el.appendChild(grid);

    /* Outcome badge */
    var oc = _tgEl('div', 'tg-outcome ' + _tgOutcomeCls(d.outcome));
    oc.appendChild(_tgEl('div', 'tg-outcome-title', _OUTCOME_TITLES[d.outcome] || d.outcome_text || ''));
    var detail = (d.successes !== undefined ? d.successes + '/3 sucessos' : '');
    if (detail) oc.appendChild(_tgEl('div', 'tg-outcome-detail', detail));
    el.appendChild(oc);

    /* Payout line */
    var pay = _tgEl('div', 'tg-payout');
    var amount = d.payout || 0;
    var payText = amount >= 0 ? '+' + amount + ' 💰' : amount + ' 💰';
    pay.appendChild(_tgEl('span', amount >= 0 ? 'tg-payout-gain' : 'tg-payout-loss', payText));
    if (d.injury) pay.appendChild(_tgEl('span', 'tg-injury', ' \u00b7 -1 HP'));
    if (d.reputation) pay.appendChild(_tgEl('span', 'tg-rep', ' \u00b7 +Reputa\u00e7\u00e3o'));
    el.appendChild(pay);
}

function _renderPitFightMenu(el, d) {
    /* Compact rules */
    var info = _tgEl('div', 'tg-info', 'Taxa: ' + (d.entry_fee || 25) + ' GP + aposta \u00b7 3 testes: FOR \u00b7 DES \u00b7 CON vs DC sorteado');
    el.appendChild(info);

    /* Bet grid */
    _appendBetGrid(el, d);
}

function _renderCooldown(el, d) {
    var cd = _tgEl('div', 'tg-cooldown', '\u23f3 Recuperando-se da \u00faltima luta. Volte em ' + (d.remaining || 0) + ' turnos.');
    el.appendChild(cd);
}

/* -- Dice Game -- */

function _renderDiceResult(el, d) {
    /* VS comparison */
    var vs = _tgEl('div', 'tg-versus');
    _appendRollBox(vs, 'Voc\u00ea', d.player_roll, d.player_wins);
    vs.appendChild(_tgEl('div', 'tg-vs-text', 'vs'));
    _appendRollBox(vs, 'Oponente', d.opponent_roll, !d.player_wins && !d.draw);
    el.appendChild(vs);

    if (d.roll_detail) el.appendChild(_tgEl('div', 'tg-info', d.roll_detail));

    /* Outcome */
    var oc = _tgEl('div', 'tg-outcome ' + _tgOutcomeCls(d.outcome));
    oc.appendChild(_tgEl('div', 'tg-outcome-title', _OUTCOME_TITLES[d.outcome] || d.outcome_text || ''));
    el.appendChild(oc);

    /* Payout */
    _appendPayout(el, d.payout, d.draw ? 'Empate \u2014 aposta devolvida' : null);

    /* Streak */
    if (d.streak && d.streak > 0) {
        var s = _tgEl('div', 'tg-payout');
        s.appendChild(_tgEl('span', 'tg-streak', '\ud83d\udd25 Streak: ' + d.streak));
        el.appendChild(s);
    }
}

function _renderDiceMenu(el, d) {
    var info = _tgEl('div', 'tg-info', 'd20 + Persuas\u00e3o vs Oponente d20 \u00b7 Nat 20 = 3x \u00b7 Margem \u226510 = 2.5x');
    el.appendChild(info);

    if (d.streak && d.streak > 0) {
        var s = _tgEl('div', 'tg-payout');
        s.appendChild(_tgEl('span', 'tg-streak', '\ud83d\udd25 Streak: ' + d.streak));
        el.appendChild(s);
    }

    _appendBetGrid(el, d);
}

/* -- Bones (Dragon's Bones) -- */

function _renderBonesPhase(el, d) {
    _appendPhase(el, d.round || 1, d.max_rounds || 2);

    /* Dice row */
    var row = _tgEl('div', 'tg-dice-row');
    var dice = d.dice || [];
    for (var j = 0; j < dice.length; j++) {
        var cls = 'tg-die' + (dice[j].held ? ' tg-die--held' : '') + (dice[j].value === 0 ? ' tg-die--bust' : '');
        var die = _tgEl('div', cls, dice[j].value === 0 ? '\ud83d\udc80' : String(dice[j].value));
        if (dice[j].action) die.setAttribute('data-action', dice[j].action);
        row.appendChild(die);
    }
    el.appendChild(row);

    el.appendChild(_tgEl('div', 'tg-info', d.instruction || 'Toque nos dados para manter'));
}

function _renderBonesResult(el, d) {
    var vs = _tgEl('div', 'tg-versus');
    _appendRollBox(vs, 'Seus dados', d.player_total, d.player_wins);
    vs.appendChild(_tgEl('div', 'tg-vs-text', 'vs'));
    _appendRollBox(vs, 'Oponente', d.opponent_total, !d.player_wins && !d.draw);
    el.appendChild(vs);

    var oc = _tgEl('div', 'tg-outcome ' + _tgOutcomeCls(d.outcome));
    oc.appendChild(_tgEl('div', 'tg-outcome-title', _OUTCOME_TITLES[d.outcome] || d.outcome_text || ''));
    if (d.multiplier) oc.appendChild(_tgEl('div', 'tg-outcome-detail', d.multiplier + 'x'));
    el.appendChild(oc);

    _appendPayout(el, d.payout);
}

/* -- XGtE Cards -- */

function _renderXgteResult(el, d) {
    var checks = d.checks || [];
    var grid = _tgEl('div', 'tg-checks tg-checks--single');
    for (var i = 0; i < checks.length; i++) {
        var c = checks[i];
        var cell = _tgEl('div', 'tg-check ' + (c.success ? 'tg-check--pass' : 'tg-check--fail'));
        cell.appendChild(_tgEl('div', 'tg-check-stat', c.skill + ' \u2014 ' + (c.total || 0) + ' vs DC ' + (c.dc || '?')));
        cell.appendChild(_tgEl('div', 'tg-check-icon', c.success ? '\u2713 Sucesso' : '\u2717 Falha'));
        grid.appendChild(cell);
    }
    el.appendChild(grid);

    var oc = _tgEl('div', 'tg-outcome ' + _tgOutcomeCls(d.outcome));
    oc.appendChild(_tgEl('div', 'tg-outcome-title', _OUTCOME_TITLES[d.outcome] || d.outcome_text || ''));
    if (d.successes !== undefined) oc.appendChild(_tgEl('div', 'tg-outcome-detail', d.successes + '/3 sucessos'));
    el.appendChild(oc);

    _appendPayout(el, d.payout);

    if (d.debt && d.debt > 0) {
        el.appendChild(_tgEl('div', 'tg-injury', '\u26a0 D\u00edvida: ' + d.debt + ' 💰'));
    }
}

/* -- Challenge Result -- */

function _renderChallengeResult(el, d) {
    var vs = _tgEl('div', 'tg-versus');
    _appendRollBox(vs, d.skill || 'Voc\u00ea', d.player_roll, d.player_wins);
    vs.appendChild(_tgEl('div', 'tg-vs-text', 'vs'));
    _appendRollBox(vs, 'Oponente', d.opponent_roll, !d.player_wins && !d.draw);
    el.appendChild(vs);

    var oc = _tgEl('div', 'tg-outcome ' + _tgOutcomeCls(d.outcome));
    oc.appendChild(_tgEl('div', 'tg-outcome-title', _OUTCOME_TITLES[d.outcome] || d.outcome_text || ''));
    el.appendChild(oc);

    _appendPayout(el, d.payout);
}

/* -- Drinking Contest -- */

function _renderDrinkingRound(el, d) {
    _appendPhase(el, d.round || 1, null, d.fails || 0, d.fails_max || 3);

    var check = _tgEl('div', 'tg-check ' + (d.success ? 'tg-check--pass' : 'tg-check--fail'));
    check.appendChild(_tgEl('div', 'tg-check-stat', 'CON Save \u00b7 DC ' + (d.dc || '?')));
    check.appendChild(_tgEl('div', 'tg-check-roll', String(d.total || 0)));
    check.appendChild(_tgEl('div', 'tg-check-icon', d.success ? '\u2713 Aguenta!' : '\u2717 Falha ' + (d.fails || 0) + '/' + (d.fails_max || 3)));
    el.appendChild(check);

    if (d.flavor) el.appendChild(_tgEl('div', 'tg-info', d.flavor));
}

function _renderDrinkingResult(el, d) {
    var oc = _tgEl('div', 'tg-outcome ' + _tgOutcomeCls(d.outcome));
    oc.appendChild(_tgEl('div', 'tg-outcome-title', _OUTCOME_TITLES[d.outcome] || d.outcome_text || ''));
    if (d.rounds) oc.appendChild(_tgEl('div', 'tg-outcome-detail', d.rounds + ' rodadas'));
    el.appendChild(oc);

    _appendPayout(el, d.payout);

    if (d.poisoned) el.appendChild(_tgEl('div', 'tg-injury', '\ud83e\udd22 Condi\u00e7\u00e3o: Envenenado'));
}

/* -- Tournament -- */

function _renderTournamentStatus(el, d) {
    _appendPhase(el, d.round || 1, 3);

    if (d.tier_name) {
        el.appendChild(_tgEl('div', 'tg-opponent', d.tier_name));
    }
    if (d.challenge) {
        el.appendChild(_tgEl('div', 'tg-info', d.challenge));
    }
    if (d.wins !== undefined) {
        el.appendChild(_tgEl('div', 'tg-info', 'Vit\u00f3rias: ' + d.wins + '/3'));
    }
}

/* -- Bet Menu (shared) -- */

function _renderBetMenu(el, d) {
    if (d.info) el.appendChild(_tgEl('div', 'tg-info', d.info));
    _appendBetGrid(el, d);
}

/* -- Shared Builders -- */

function _appendBetGrid(el, d) {
    var bets = _tgEl('div', 'tg-bets');
    var tiers = d.tiers || [];
    for (var i = 0; i < tiers.length; i++) {
        var t = tiers[i];
        var btn = _tgBtn((t.icon || '') + ' ' + t.label, t.action);
        if (t.locked) { btn.disabled = true; btn.classList.add('tg-bet-btn--locked'); }
        bets.appendChild(btn);
    }
    el.appendChild(bets);
    el.appendChild(_tgEl('div', 'tg-gold', '\ud83d\udcb0 ' + (d.gold || 0) + ' GP dispon\u00edvel'));
}

function _appendRollBox(parent, label, value, isWinner) {
    var box = _tgEl('div', 'tg-roll-box');
    box.appendChild(_tgEl('div', 'tg-roll-label', label));
    var cls = 'tg-roll-value' + (isWinner ? ' tg-roll-value--win' : ' tg-roll-value--loss');
    box.appendChild(_tgEl('div', cls, String(value || '?')));
    parent.appendChild(box);
}

function _appendPayout(el, amount, neutralText) {
    var pay = _tgEl('div', 'tg-payout');
    if (neutralText && (amount === 0 || amount === undefined)) {
        pay.appendChild(_tgEl('span', 'tg-payout-neutral', neutralText));
    } else {
        var a = amount || 0;
        pay.appendChild(_tgEl('span', a >= 0 ? 'tg-payout-gain' : 'tg-payout-loss',
            a >= 0 ? '+' + a + ' 💰' : a + ' 💰'));
    }
    el.appendChild(pay);
}

function _appendPhase(el, round, maxRounds, fails, failsMax) {
    var label = 'Rodada ' + round + (maxRounds ? '/' + maxRounds : '');
    var phase = _tgEl('div', 'tg-phase', label);
    var count = maxRounds || failsMax || 3;
    var dots = _tgEl('div', 'tg-phase-dots');
    for (var i = 1; i <= count; i++) {
        var dotCls = 'tg-phase-dot';
        if (failsMax) {
            dotCls += (i <= (fails || 0)) ? ' tg-phase-dot--done' : '';
        } else {
            dotCls += (i < round) ? ' tg-phase-dot--done' : (i === round ? ' tg-phase-dot--active' : '');
        }
        dots.appendChild(_tgEl('div', dotCls));
    }
    phase.appendChild(dots);
    el.appendChild(phase);
}

/* -- Registry -- */

var _RENDERERS = {
    'pit_fight_menu': _renderPitFightMenu,
    'pit_fight_result': _renderPitFightResult,
    'pit_fight_cooldown': _renderCooldown,
    'dice_menu': _renderDiceMenu,
    'dice_result': _renderDiceResult,
    'bones_phase': _renderBonesPhase,
    'bones_result': _renderBonesResult,
    'xgte_result': _renderXgteResult,
    'challenge_result': _renderChallengeResult,
    'drinking_round': _renderDrinkingRound,
    'drinking_result': _renderDrinkingResult,
    'tournament_status': _renderTournamentStatus,
    'bet_menu': _renderBetMenu,
    'cooldown': _renderCooldown
};

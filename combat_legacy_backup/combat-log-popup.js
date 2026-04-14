/* combat-log-popup.js — Combat Log Popup (D&D roll details). Timer pausa via _syncCombatOverlaysWithTimer (vPopup). */

function openCombatLog() {
    var state = (typeof currentState !== 'undefined') ? currentState : null;
    if (!state) return;

    /* Timer do turno pausa enquanto qualquer overlay de combate estiver ativo (incl. este popup). */
    var timerBadge = '<div class="log-timer-info"><span class="log-badge-paused">⏸ Timer do turno pausado com o registro aberto</span></div>';

    var entries = _buildLogEntries(state);

    vPopup.show({
        header: '📜 Registro de Combate',
        body: timerBadge + '<div class="log-entries">' + entries + '</div>',
        actions: [{ label: 'Fechar', action: 'close' }],
        onHide: closeCombatLog,
        closeOnOutside: true
    });
}

function closeCombatLog() {
    /* Pausa/retoma é centralizada em combat.js (_syncCombatOverlaysWithTimer). */
}

function _buildLogEntries(state) {
    var feed = (state.feed && Array.isArray(state.feed)) ? state.feed : [];
    var fd = (state.fd && Array.isArray(state.fd)) ? state.fd : [];
    var roundNumbers = (state.rn && Array.isArray(state.rn)) ? state.rn : [];

    if (feed.length === 0) {
        return '<div class="log-entry log-current"><span class="log-action">Nenhuma ação registrada ainda.</span></div>';
    }

    var html = '';
    /* Combat audit 7.3: feed pagination hint. When the server trims entries
     * from the in-memory feed (MAX_FEED_ENTRIES=100), state.feed_total
     * reports the TRUE count. Show a truncation notice at the top so the
     * player knows older entries exist only in server-side combat_logs. */
    if (typeof state.feed_total === 'number' && state.feed_total > feed.length) {
        var dropped = state.feed_total - feed.length;
        html += '<div class="log-round-sep log-truncated">' +
                '(+' + dropped + ' entradas antigas omitidas — registro completo no servidor)' +
                '</div>';
    }
    var lastRound = -1;

    for (var i = 0; i < feed.length; i++) {
        var text = feed[i] || '';

        // Insert round separator when round changes
        var round = (roundNumbers[i] !== undefined) ? roundNumbers[i] : null;
        if (round !== null && round !== lastRound) {
            lastRound = round;
            html += '<div class="log-round-sep">Rodada ' + escHtml(String(round)) + '</div>';
        }

        // Classify entry type by emoji content
        var entryClass = 'player-action';
        if (/👹|🏹|🐺/.test(text)) {
            entryClass = 'enemy-action';
        } else if (/🧙/.test(text)) {
            entryClass = 'ally-action';
        } else if (/⚔️/.test(text)) {
            entryClass = 'player-action';
        }

        html += '<div class="log-entry ' + entryClass + '">';
        html += '<span class="log-action">' + escHtml(text) + '</span>';

        // Detail object (roll breakdown)
        var detail = fd[i];
        if (detail && typeof detail === 'object') {
            // Roll line: "d20+mod = total vs AC — Acerto/Erro"
            var rollLine = '';
            if (detail.d20 !== undefined) {
                rollLine += 'd20';
                if (detail.mod !== undefined && detail.mod !== 0) {
                    rollLine += (detail.mod >= 0 ? '+' : '') + detail.mod;
                }
                rollLine += ' = ' + (detail.tot || detail.d20);
                if (detail.ac !== undefined) {
                    rollLine += ' vs CA ' + detail.ac;
                }
                if (detail.crit) {
                    rollLine += ' — <span class="log-crit">CRÍTICO!</span>';
                } else if (detail.hit !== undefined) {
                    rollLine += ' — <span class="' + (detail.hit ? 'log-hit' : 'log-miss') + '">' +
                        (detail.hit ? 'Acerto' : 'Erro') + '</span>';
                }
                html += '<span class="log-roll">' + rollLine + '</span>';
            }

            // Damage line
            if (detail.dt !== undefined && detail.dt !== null) {
                var dtype = detail.dtp || 'slashing';
                var dcolor = _dmgTypeColor(dtype);
                var dicon = _dmgTypeIcon(dtype);
                var dmgFormula = '';
                if (detail.df) {
                    dmgFormula = escHtml(detail.df) + ' = ';
                }
                html += '<span class="log-dmg" style="color:' + dcolor + '">' +
                    dicon + ' ' + dmgFormula + detail.dt + ' de dano (' +
                    escHtml(dtype) + ')</span>';
            }

            // Extra notes (conditions, effects, saves)
            if (detail.extra) {
                html += '<span class="log-extra">' + escHtml(detail.extra) + '</span>';
            }
        }

        html += '</div>';
    }

    /* Dica de turno (não é botão — evita parecer CTA desativado) */
    html += '<div class="log-turn-hint" role="note"><span class="log-turn-hint-text">Seu turno — toque em <strong>⚔ Ações</strong> na barra do combate para atacar ou usar habilidades.</span></div>';

    return html;
}

function _dmgTypeColor(type) {
    var t = (type || '').toLowerCase();
    var map = {
        'fire': '#ff6020',
        'cold': '#80c0ff',
        'lightning': '#ffe040',
        'necrotic': '#a060c0',
        'radiant': '#ffe8a0',
        'poison': '#50b040',
        'slashing': '#d4c8b0',
        'piercing': '#d4c8b0',
        'bludgeoning': '#d4c8b0'
    };
    return map[t] || '#d4c8b0';
}

function _dmgTypeIcon(type) {
    var t = (type || '').toLowerCase();
    var map = {
        'fire': '🔥',
        'cold': '❄️',
        'lightning': '⚡',
        'necrotic': '💀',
        'radiant': '✨',
        'poison': '🧪',
        'slashing': '🗡️',
        'piercing': '🏹',
        'bludgeoning': '🔨'
    };
    return map[t] || '⚔️';
}

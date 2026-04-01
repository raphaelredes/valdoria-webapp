/* combat-log-popup.js — Combat Log Popup (D&D roll details, timer pause 1x/turn) */

var _logPauseUsed = false;
var _logTimerPaused = false;
var _lastLogTurnCount = -1;

function openCombatLog() {
    var state = (typeof currentState !== 'undefined') ? currentState : null;
    if (!state) return;

    // Reset pause flag on new turn
    var tc = (state.tc !== undefined && state.tc !== null) ? state.tc : -1;
    if (tc !== _lastLogTurnCount) {
        _logPauseUsed = false;
        _lastLogTurnCount = tc;
    }

    // Timer pause logic — only first open per turn pauses
    if (!_logPauseUsed) {
        _logPauseUsed = true;
        if (typeof pauseTimer === 'function') pauseTimer();
        _logTimerPaused = true;
    } else {
        _logTimerPaused = false;
    }

    // Timer badge HTML
    var timerBadge;
    if (_logTimerPaused) {
        timerBadge = '<div class="log-timer-info"><span class="log-badge-paused">⏸ Timer pausado</span></div>';
    } else {
        timerBadge = '<div class="log-timer-info"><span class="log-badge-running">⏳ Timer continua contando</span></div>';
    }

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
    if (_logTimerPaused) {
        if (typeof resumeTimer === 'function') resumeTimer();
        _logTimerPaused = false;
    }
}

function _buildLogEntries(state) {
    var feed = (state.feed && Array.isArray(state.feed)) ? state.feed : [];
    var fd = (state.fd && Array.isArray(state.fd)) ? state.fd : [];
    var roundNumbers = (state.rn && Array.isArray(state.rn)) ? state.rn : [];

    if (feed.length === 0) {
        return '<div class="log-entry log-current"><span class="log-action">Nenhuma ação registrada ainda.</span></div>';
    }

    var html = '';
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
            if (detail.roll !== undefined) {
                rollLine += 'd20';
                if (detail.mod !== undefined && detail.mod !== 0) {
                    rollLine += (detail.mod >= 0 ? '+' : '') + detail.mod;
                }
                rollLine += ' = ' + detail.roll;
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
            if (detail.dmg !== undefined && detail.dmg !== null) {
                var dtype = detail.dtype || 'slashing';
                var dcolor = _dmgTypeColor(dtype);
                var dicon = _dmgTypeIcon(dtype);
                var dmgFormula = '';
                if (detail.dmgFormula) {
                    dmgFormula = escHtml(detail.dmgFormula) + ' = ';
                }
                html += '<span class="log-dmg" style="color:' + dcolor + '">' +
                    dicon + ' ' + dmgFormula + detail.dmg + ' de dano (' +
                    escHtml(dtype) + ')</span>';
            }

            // Extra notes (conditions, effects, saves)
            if (detail.extra) {
                html += '<span class="log-extra">' + escHtml(detail.extra) + '</span>';
            }
        }

        html += '</div>';
    }

    // Current turn indicator
    html += '<div class="log-entry log-current"><span class="log-action">Seu turno — escolha uma ação</span></div>';

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

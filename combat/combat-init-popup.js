/* combat-init-popup.js — Initiative popup with 3D dice (Layout 1)
 * Replaces the old initiative overlay with an animated popup showing
 * each participant rolling d20 sequentially, then ordered results.
 *
 * API: showInitiativePopup(turnOrder, initiative, onProceed)
 *   turnOrder: [{t:'p'|'e'|'a', n:name, v:total, f:formula, ico:emoji}, ...]
 *   initiative: {winner, player_surprised, enemies_surprised, player_pos}
 *   onProceed: callback when user clicks "Iniciar Combate"
 */
(function() {
'use strict';

var _overlay = null;
var _active = false;

function _el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
}

function _typeLabel(t) {
    return t === 'p' ? 'player' : t === 'a' ? 'ally' : 'enemy';
}

function _typeColor(t) {
    return t === 'p' ? 'var(--v-gold-light, #dbb668)' : t === 'a' ? '#8ab4d0' : '#e07070';
}

function _parseMod(f) {
    if (!f) return 0;
    var m = f.match(/1d20\+?(-?\d+)?/);
    return m && m[1] ? parseInt(m[1], 10) : 0;
}

/* Prompt overlay — immersive "Combate Iminente" with 3D idle dice.
 * Player clicks "Rolar Iniciativa" → server resolves → transitions to results popup. */
window.showInitiativePrompt = function(onRoll, onProceed) {
    if (_active) return;
    _active = true;

    _overlay = _el('div', 'init-popup-overlay');
    _overlay.setAttribute('aria-modal', 'true');

    var card = _el('div', 'init-popup-card');
    card.classList.add('init-prompt-card');

    /* Header with ornament */
    var header = _el('div', 'init-popup-header');
    header.textContent = '\u2694\uFE0F Combate Iminente';
    card.appendChild(header);

    var orn = _el('div', 'init-popup-sub');
    orn.style.cssText = 'color:rgba(196,149,58,0.3);font-size:10px;letter-spacing:6px;text-align:center;padding:4px 0';
    orn.textContent = '\u25C6 \u2500\u2500\u2500 \u25C6 \u2500\u2500\u2500 \u25C6';
    card.appendChild(orn);

    var sub = _el('div', 'init-popup-sub');
    sub.textContent = 'Rolagem de iniciativa determina a ordem dos turnos.';
    card.appendChild(sub);

    /* 3D Dice area — real Dice3D spinning idle */
    var diceArea = _el('div', 'init-popup-dice-area');
    var diceCanvas = _el('div', 'init-popup-dice-canvas');
    diceCanvas.id = 'init-prompt-dice-canvas';
    diceArea.appendChild(diceCanvas);
    card.appendChild(diceArea);

    /* Flavor text */
    var flavor = _el('div', 'init-popup-sub');
    flavor.style.cssText = 'font-style:italic;padding:0 20px 12px;text-align:center';
    flavor.textContent = 'O destino aguarda o lan\u00e7ar dos dados...';
    card.appendChild(flavor);

    /* Footer with button */
    var footer = _el('div', 'init-popup-footer');
    var rollBtn = _el('button', 'init-popup-proceed');
    rollBtn.textContent = '\uD83C\uDFB2 Rolar Iniciativa';

    var _rolling = false;
    var _promptDice = null;

    rollBtn.addEventListener('click', function() {
        if (_rolling) return;
        _rolling = true;
        rollBtn.disabled = true;
        rollBtn.style.opacity = '0.6';
        rollBtn.textContent = 'Rolando...';
        try { if (window.Telegram && Telegram.WebApp) Telegram.WebApp.HapticFeedback.impactOccurred('medium'); } catch(e) { /* noop */ }

        /* Roll the 3D die to a random value for visual feedback */
        var previewVal = Math.floor(Math.random() * 20) + 1;
        if (_promptDice) {
            try { _promptDice.roll(previewVal, function() {}); } catch(e) { /* noop */ }
        }

        onRoll(function(resp) {
            /* Dispose prompt dice */
            if (_promptDice) { try { _promptDice.dispose(); } catch(e) { /* noop */ } _promptDice = null; }
            /* Remove prompt overlay */
            if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
            _overlay = null;
            _active = false;

            if (resp && resp.to && resp.to.length > 0) {
                window.showInitiativePopup(resp.to, resp.initiative || {}, function() {
                    onProceed(resp);
                });
            } else {
                onProceed(resp);
            }
        });
    });

    footer.appendChild(rollBtn);
    card.appendChild(footer);

    _overlay.appendChild(card);
    document.body.appendChild(_overlay);
    void _overlay.offsetWidth;
    _overlay.classList.add('active');

    /* Initialize 3D dice after DOM is in place */
    setTimeout(function() {
        var canvasEl = document.getElementById('init-prompt-dice-canvas');
        if (canvasEl && typeof Dice3D !== 'undefined') {
            try {
                _promptDice = new Dice3D(canvasEl, { size: 160 });
                console.info('[INIT-POPUP] 3D dice initialized for prompt');
            } catch(e) {
                console.warn('[INIT-POPUP] Dice3D init failed:', e);
            }
        }
    }, 100);
};

window.showInitiativePopup = function(turnOrder, initiative, onProceed) {
    if (_active) return;
    _active = true;

    _overlay = _el('div', 'init-popup-overlay');
    _overlay.setAttribute('aria-modal', 'true');

    var card = _el('div', 'init-popup-card');

    var header = _el('div', 'init-popup-header');
    header.textContent = '\u2694\uFE0F Ordem de Combate';
    card.appendChild(header);

    var sub = _el('div', 'init-popup-sub');
    sub.textContent = 'Todos rolam d20 + modificador de Destreza';
    card.appendChild(sub);

    var diceArea = _el('div', 'init-popup-dice-area');
    diceArea.id = 'init-popup-dice-area';
    var canvas = _el('div', 'init-popup-dice-canvas');
    canvas.id = 'init-popup-dice-canvas';
    diceArea.appendChild(canvas);
    var diceLabel = _el('div', 'init-popup-dice-label');
    diceLabel.id = 'init-popup-dice-label';
    diceLabel.textContent = 'Preparando...';
    diceArea.appendChild(diceLabel);
    card.appendChild(diceArea);

    var resultsList = _el('div', 'init-popup-results');
    resultsList.id = 'init-popup-results';
    resultsList.style.display = 'none';
    card.appendChild(resultsList);

    var footer = _el('div', 'init-popup-footer');
    footer.id = 'init-popup-footer';
    footer.style.display = 'none';
    var proceedBtn = _el('button', 'init-popup-proceed');
    proceedBtn.textContent = '\u2694\uFE0F INICIAR COMBATE';
    proceedBtn.onclick = function() {
        _hide();
        if (onProceed) onProceed();
    };
    footer.appendChild(proceedBtn);

    if (initiative && (initiative.player_surprised || initiative.enemies_surprised)) {
        var surpriseEl = _el('div', 'init-popup-surprise');
        if (initiative.enemies_surprised) {
            surpriseEl.textContent = '\u26A1 Inimigos surpreendidos! Seu grupo age primeiro.';
            surpriseEl.classList.add('init-surprise-good');
        } else {
            surpriseEl.textContent = '\u26A0\uFE0F Voc\u00ea foi surpreendido! Inimigos agem primeiro.';
            surpriseEl.classList.add('init-surprise-bad');
        }
        footer.appendChild(surpriseEl);
    }

    card.appendChild(footer);
    _overlay.appendChild(card);
    document.body.appendChild(_overlay);
    _overlay.offsetHeight;
    _overlay.classList.add('active');

    _rollSequence(turnOrder, initiative);
};

function _rollSequence(turnOrder, initiative) {
    var sorted = (turnOrder || []).slice().sort(function(a, b) { return b.v - a.v; });
    var idx = 0;
    var diceLabel = document.getElementById('init-popup-dice-label');
    var canvasEl = document.getElementById('init-popup-dice-canvas');
    var resultsEl = document.getElementById('init-popup-results');
    var footerEl = document.getElementById('init-popup-footer');
    var diceAreaEl = document.getElementById('init-popup-dice-area');

    function rollNext() {
        if (idx >= sorted.length) {
            if (diceAreaEl) diceAreaEl.style.display = 'none';
            _buildResultsList(resultsEl, sorted, initiative);
            if (resultsEl) resultsEl.style.display = '';
            if (footerEl) footerEl.style.display = '';
            return;
        }

        var entry = sorted[idx];
        var mod = _parseMod(entry.f);
        var rollVal = Math.max(1, Math.min(20, entry.v - mod));

        if (diceLabel) {
            diceLabel.textContent = (entry.ico || '') + ' ' + entry.n + '...';
            diceLabel.style.color = _typeColor(entry.t);
        }

        if (typeof dice !== 'undefined' && dice.roll && canvasEl) {
            canvasEl.style.display = '';
            if (!canvasEl.querySelector('canvas')) {
                try { dice = new DiceRoller(canvasEl, { size: 140 }); } catch(e) { /* fallback */ }
            }
            try {
                dice.roll(rollVal, function() {
                    if (diceLabel) {
                        diceLabel.textContent = (entry.ico || '') + ' ' + entry.n + ': ' + entry.v + ' (d20=' + rollVal + ' +' + mod + ')';
                    }
                    idx++;
                    setTimeout(rollNext, 600);
                });
            } catch(e) {
                idx++;
                setTimeout(rollNext, 400);
            }
        } else {
            if (diceLabel) diceLabel.textContent = (entry.ico || '') + ' ' + entry.n + ': ' + entry.v;
            idx++;
            setTimeout(rollNext, 500);
        }
    }

    setTimeout(rollNext, 800);
}

function _buildResultsList(container, sorted, initiative) {
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    for (var i = 0; i < sorted.length; i++) {
        var e = sorted[i];
        var type = _typeLabel(e.t);
        var mod = _parseMod(e.f);
        var rollVal = Math.max(1, Math.min(20, e.v - mod));

        var row = _el('div', 'init-popup-row init-popup-row--' + type);
        row.style.animationDelay = (i * 0.08) + 's';

        var pos = _el('div', 'init-popup-pos init-popup-pos--p' + Math.min(i + 1, 4));
        pos.textContent = String(i + 1);
        row.appendChild(pos);

        var icon = _el('div', 'init-popup-icon');
        icon.textContent = e.ico || '\u2694\uFE0F';
        row.appendChild(icon);

        var info = _el('div', 'init-popup-info');
        var name = _el('div', 'init-popup-name');
        name.textContent = e.n;
        name.style.color = _typeColor(e.t);
        info.appendChild(name);
        var detail = _el('div', 'init-popup-detail');
        detail.textContent = 'd20(' + rollVal + ') + ' + mod;
        info.appendChild(detail);
        row.appendChild(info);

        var total = _el('div', 'init-popup-total');
        total.textContent = String(e.v);
        total.style.color = _typeColor(e.t);
        row.appendChild(total);

        container.appendChild(row);
    }

    if (initiative && sorted.length > 0) {
        var announce = _el('div', 'init-popup-announce');
        var first = sorted[0];
        announce.textContent = (first.ico || '\u2694\uFE0F') + ' ' + first.n + ' abre o combate!';
        container.appendChild(announce);
    }
}

function _hide() {
    _active = false;
    if (_overlay) {
        _overlay.classList.remove('active');
        _overlay.classList.add('hiding');
        setTimeout(function() {
            if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
            _overlay = null;
        }, 300);
    }
}

window.isInitiativePopupActive = function() { return _active; };

})();

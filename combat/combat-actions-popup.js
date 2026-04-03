/* combat-actions-popup.js — Actions trigger + 4x2 grid popup */

/* ── HTML template ───────────────────────────────────────── */

/**
 * Returns the HTML string for the actions row:
 * a trigger button + a hidden popup container.
 * Caller must inject this into the DOM, then wire up toggleActionsPopup().
 */
function renderActionsButton() {
    return (
        '<div class="actions-row">' +
            '<button class="actions-trigger" onclick="toggleActionsPopup()" aria-label="Abrir ações de combate">' +
                '&#9876; A&ccedil;&otilde;es' +
            '</button>' +
            '<div class="actions-popup hidden" id="actionsPopup"></div>' +
        '</div>'
    );
}

/* ── Toggle ──────────────────────────────────────────────── */

/**
 * Toggles the actions popup open/closed.
 * When opening, rebuilds the grid from currentState.
 */
function toggleActionsPopup() {
    var popup = document.getElementById('actionsPopup');
    if (!popup) return;

    var isHidden = popup.classList.contains('hidden');
    if (isHidden) {
        _buildActionsGrid(popup);
        popup.classList.remove('hidden');
    } else {
        popup.classList.add('hidden');
    }
}

/* ── Grid builder ────────────────────────────────────────── */

/**
 * Builds the 4-column × 2-row actions grid inside the popup.
 * Uses DOM methods (no innerHTML with user data) for XSS safety.
 *
 * Row 1 (from currentState.acts): Attack, Skills, Items, Flee
 * Row 2 (static D&D actions): Dodge, Disengage, Pass, Log
 *
 * Each act in currentState.acts: { t: string, l: string, ch: number|null }
 */
function _buildActionsGrid(popup) {
    // Clear previous content safely
    while (popup.firstChild) {
        popup.removeChild(popup.firstChild);
    }

    var grid = document.createElement('div');
    grid.className = 'ap-grid';

    // ── Row 1: dynamic actions from server state ──────────
    var acts = (currentState && currentState.acts) ? currentState.acts : [];

    // Canonical slot order for row 1
    var row1Slots = [
        { t: 'attack', ico: '⚔️',  label: 'Atacar',     primary: true  },
        { t: 'skill',  ico: '✨',  label: 'Habilidades', primary: false },
        { t: 'item',   ico: '🎒',  label: 'Itens',       primary: false },
        { t: 'flee',   ico: '🏃',  label: 'Fugir',       primary: false }
    ];

    row1Slots.forEach(function(slot) {
        // Find matching act from server for chance%
        var act = null;
        for (var i = 0; i < acts.length; i++) {
            if (acts[i].t === slot.t) { act = acts[i]; break; }
        }

        var btn = _makeActBtn(
            slot.ico,
            act ? escHtml(act.l) : slot.label,
            act ? act.ch : null,
            slot.t,
            slot.primary
        );
        grid.appendChild(btn);
    });

    // ── Row 2: static D&D bonus/free actions ─────────────
    var row2 = [
        { ico: '🛡️', label: 'Esquivar',    t: 'dodge',     primary: false },
        { ico: '➡️', label: 'Desengajar',  t: 'disengage', primary: false },
        { ico: '⏭',  label: 'Pular',       t: 'pass',      primary: false },
        { ico: '📜', label: 'Log',          t: 'log',       primary: false }
    ];

    row2.forEach(function(def) {
        var btn = _makeActBtn(def.ico, def.label, null, def.t, def.primary);

        if (def.t === 'log') {
            btn.addEventListener('click', function() {
                toggleActionsPopup();
                if (typeof openCombatLog === 'function') {
                    openCombatLog();
                }
            });
        }

        grid.appendChild(btn);
    });

    popup.appendChild(grid);
}

/* ── Button factory ──────────────────────────────────────── */

/**
 * Creates a single action button element.
 * @param {string}      ico      — Emoji icon
 * @param {string}      label    — Already-escaped display label
 * @param {number|null} chance   — Hit/flee chance percentage, or null
 * @param {string}      actType  — Action type key (data-act attribute)
 * @param {boolean}     primary  — Whether to apply ap-primary styling
 * @returns {HTMLButtonElement}
 */
function _makeActBtn(ico, label, chance, actType, primary) {
    var btn = document.createElement('button');
    btn.className = 'ap-btn' + (primary ? ' ap-primary' : '');
    btn.setAttribute('data-act', actType);

    // Icon
    var icoEl = document.createElement('span');
    icoEl.className = 'ap-ico';
    icoEl.textContent = ico;
    btn.appendChild(icoEl);

    // Label
    var labelEl = document.createElement('span');
    labelEl.className = 'ap-label';
    labelEl.textContent = label;
    btn.appendChild(labelEl);

    // Chance % (only when provided and not log/pass)
    if (chance !== null && chance !== undefined && actType !== 'log' && actType !== 'pass') {
        var chanceEl = document.createElement('span');
        chanceEl.className = 'ap-chance';
        chanceEl.textContent = chance + '%';
        btn.appendChild(chanceEl);
    }

    return btn;
}

/* ── Outside-click dismissal ─────────────────────────────── */

document.addEventListener('click', function(e) {
    var popup = document.getElementById('actionsPopup');
    if (!popup || popup.classList.contains('hidden')) return;

    var trigger = document.querySelector('.actions-trigger');

    // Close if click is outside both the popup and its trigger
    var insidePopup   = popup.contains(e.target);
    var insideTrigger = trigger && trigger.contains(e.target);

    if (!insidePopup && !insideTrigger) {
        popup.classList.add('hidden');
    }
});

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

    var s = (typeof currentState !== 'undefined') ? currentState : null;
    var sp = (s && s.sub_phase) ? s.sub_phase : '';
    if (sp === 'bonus_action' || sp === 'reaction') {
        if (typeof vToast === 'function') {
            vToast(
                sp === 'reaction'
                    ? 'Termine a reação antes de abrir o painel de ações.'
                    : 'Termine a ação bônus antes de abrir o painel de ações.',
                'warn'
            );
        }
        return;
    }

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
 * Server sends `acts` as a dict (hit, flee, skills, item_list, items) from _build_actions().
 * Legacy/alternate format: array of { t, l, ch }. Normalize to the latter for the grid.
 */
function _normalizeActsForGrid(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== 'object') return [];
    var out = [];
    if (typeof raw.hit === 'number') {
        out.push({ t: 'attack', l: 'Atacar', ch: raw.hit });
    }
    if (raw.skills && raw.skills.length) {
        var maxCh = raw.skills.reduce(function (m, sk) {
            return Math.max(m, typeof sk.ch === 'number' ? sk.ch : 0);
        }, 0);
        var singleSkill = raw.skills.length === 1;
        out.push({
            t: 'skill',
            l: 'Habilidades',
            ch: singleSkill && maxCh > 0 ? maxCh : null,
        });
    }
    var itemCount = typeof raw.items === 'number' ? raw.items : 0;
    var hasItems = itemCount > 0 || (raw.item_list && raw.item_list.length > 0);
    if (hasItems) {
        out.push({
            t: 'item',
            l: itemCount > 0 ? 'Itens (' + itemCount + ')' : 'Itens',
            ch: null,
        });
    }
    if (typeof raw.flee === 'number') {
        out.push({ t: 'flee', l: 'Fugir', ch: raw.flee });
    }
    return out;
}

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
    var acts = _normalizeActsForGrid(currentState && currentState.acts);

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
        // Wire click to action dispatch
        (function(actionType) {
            btn.addEventListener('click', function() {
                toggleActionsPopup();
                _dispatchAction(actionType);
            });
        })(slot.t);
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
        } else {
            (function(actionType) {
                btn.addEventListener('click', function() {
                    toggleActionsPopup();
                    _dispatchAction(actionType);
                });
            })(def.t);
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
    /* data-action espelha data-act — bindActions usa .action-btn; walker/tests usam [data-action] */
    btn.setAttribute('data-action', actType);

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

/* ── Action dispatch ─────────────────────────────────────── */

/**
 * Dispatches a combat action from the popup buttons.
 * Mirrors the logic in bindActions (combat-ui.js) but for .ap-btn elements.
 */
function _dispatchAction(actType) {
    if (typeof _actionSent !== 'undefined' && _actionSent) return;
    if (typeof _cinematicInProgress !== 'undefined' && _cinematicInProgress) return;
    if (typeof vHaptic !== 'undefined') vHaptic.select();

    var s = (typeof currentState !== 'undefined') ? currentState : null;
    if (!s) return;
    var sp = s.sub_phase || '';
    if (sp === 'bonus_action' || sp === 'reaction') {
        if (typeof vToast === 'function') {
            vToast(
                sp === 'reaction'
                    ? 'Termine a reação antes de usar o painel de ações.'
                    : 'Termine a ação bônus antes de usar o painel de ações.',
                'warn'
            );
        }
        return;
    }

    var enemies = s.e || [];
    var skills = (s.acts && s.acts.skills) ? s.acts.skills : [];
    var items = (s.acts && s.acts.item_list) ? s.acts.item_list : [];
    var allies = s.a || [];

    console.info('[COMBAT:POPUP] action=%s enemies=%d skills=%d items=%d', actType, enemies.length, skills.length, items.length);

    switch (actType) {
        case 'attack':
            if (enemies.length > 1) showTargetPicker(enemies, 'attack');
            else sendAction({type: 'attack', target: 0});
            break;
        case 'skill':
            if (skills.length === 1) {
                if (enemies.length > 1) showTargetPicker(enemies, 'skill', skills[0].id);
                else sendAction({type: 'skill', skill_id: skills[0].id, target: 0});
            } else if (skills.length > 1) {
                showSkillPicker(skills, enemies, 'skill');
            } else {
                vToast('Sem recurso suficiente para habilidades', 'warn');
            }
            break;
        case 'item':
            if (items.length > 0) showItemPicker(items, enemies, allies);
            else vToast('Nenhum item utilizável em combate', 'warn');
            break;
        case 'flee':
            sendAction({type: 'flee'});
            break;
        case 'dodge':
            sendAction({type: 'dodge'});
            break;
        case 'disengage':
            sendAction({type: 'disengage'});
            break;
        case 'pass':
            sendAction({type: 'pass'});
            break;
    }
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

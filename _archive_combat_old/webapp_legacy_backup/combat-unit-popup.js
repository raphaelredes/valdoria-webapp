/* combat-unit-popup.js — Unit detail popup for combat grid cells
 * Globals used: currentState (combat state), escHtml (sanitizer)
 * Requires: #unitPopup element in index.html with class "ud-overlay hidden"
 * Requires: combat-unit-popup.css loaded
 * All user-derived strings use textContent — no dynamic HTML injection.
 */
/* global currentState, escHtml */

(function () {
    'use strict';

    // ── Border colors by role ──────────────────────────────────────────────
    var ROLE_BORDER = {
        player: 'rgba(196,149,58,0.5)',
        ally:   'rgba(100,140,180,0.5)',
        enemy:  'rgba(123,32,32,0.4)'
    };

    // ── HP fill class based on percentage ─────────────────────────────────
    function _hpFillClass(hp, mhp) {
        if (!mhp || mhp <= 0) return 'fill-hp-high';
        var pct = hp / mhp;
        if (pct > 0.5) return 'fill-hp-high';
        if (pct > 0.25) return 'fill-hp-mid';
        return 'fill-hp-low';
    }

    // ── Extract unit descriptor from currentState ──────────────────────────
    function _extractUnit(unitId) {
        var s = currentState;
        if (!s) return null;

        if (unitId === 'player') {
            var p = s.p;
            if (!p) return null;
            return {
                role: 'player',
                n:    p.n   || 'Personagem',
                ico:  p.ico || '🧙',
                type: (p.c || '') + (p.l ? ' Nv.' + p.l : ''),
                hp:   p.hp  != null ? p.hp  : p.mhp || 0,
                mhp:  p.mhp || 0,
                mp:   p.mp  != null ? p.mp  : p.mmp || 0,
                mmp:  p.mmp || 0,
                ac:   p.ac  || 0,
                atk:  p.atk != null ? (p.atk >= 0 ? '+' + p.atk : '' + p.atk) : null,
                dmg:  p.dmg || '',
                multi: p.multi || null,
                se:   Array.isArray(p.se) ? p.se : [],
                intent: null
            };
        }

        // enemy_0, enemy_1, …
        var enemyMatch = unitId.match(/^enemy_(\d+)$/);
        if (enemyMatch) {
            var idx = parseInt(enemyMatch[1], 10);
            var enemies = s.e || [];
            var e = enemies[idx];
            if (!e) return null;
            // intent: s.e[N].it — backend (combat_intent.py) sends {tp, ic, lb, dmg}
            var intentText = null;
            if (e.it) {
                if (typeof e.it === 'string') {
                    intentText = e.it;
                } else if (e.it.lb || e.it.ic) {
                    intentText = (e.it.ic ? e.it.ic + ' ' : '') + (e.it.lb || '');
                }
            }
            return {
                role:   'enemy',
                n:      e.n   || 'Inimigo',
                ico:    e.ico || '👹',
                type:   (e.t || e.type || '') + (e.l ? ' Nv.' + e.l : ''),
                hp:     e.hp  != null ? e.hp  : e.mhp || 0,
                mhp:    e.mhp || 0,
                mp:     (e.mp !== undefined ? e.mp : 0),
                mmp:    e.mmp || 0,
                ac:     e.ac  || 0,
                atk:    e.atk != null ? (e.atk >= 0 ? '+' + e.atk : '' + e.atk) : null,
                dmg:    e.dmg || '',
                multi:  e.multi || null,
                se:     Array.isArray(e.se) ? e.se : [],
                intent: intentText
            };
        }

        // ally_0, ally_1, …
        var allyMatch = unitId.match(/^ally_(\d+)$/);
        if (allyMatch) {
            var ai = parseInt(allyMatch[1], 10);
            var allies = s.a || [];
            var a = allies[ai];
            if (!a) return null;
            return {
                role:  'ally',
                n:     a.n   || 'Aliado',
                ico:   a.ico || '🛡️',
                type:  (a.t || a.type || '') + (a.l ? ' Nv.' + a.l : ''),
                hp:    a.hp  != null ? a.hp  : a.mhp || 0,
                mhp:   a.mhp || 0,
                mp:    a.mp  != null ? a.mp  : a.mmp || 0,
                mmp:   a.mmp || 0,
                ac:    a.ac  || 0,
                atk:   a.atk != null ? (a.atk >= 0 ? '+' + a.atk : '' + a.atk) : null,
                dmg:   a.dmg || '',
                multi: a.multi || null,
                se:    Array.isArray(a.se) ? a.se : [],
                intent: null
            };
        }

        return null;
    }

    // ── Build a bar row element ────────────────────────────────────────────
    function _makeBarRow(labelText, fillClass, current, max) {
        var row = document.createElement('div');
        row.className = 'ud-bar-row';

        var lbl = document.createElement('span');
        lbl.className = 'ud-bar-label';
        lbl.textContent = labelText;

        var track = document.createElement('div');
        track.className = 'ud-bar';

        var fill = document.createElement('div');
        fill.className = 'fill ' + fillClass;
        var pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
        fill.style.width = pct.toFixed(1) + '%';

        track.appendChild(fill);

        var val = document.createElement('span');
        val.className = 'ud-bar-val';
        val.textContent = current + '/' + max;

        row.appendChild(lbl);
        row.appendChild(track);
        row.appendChild(val);
        return row;
    }

    // ── Build a stat cell element ──────────────────────────────────────────
    function _makeStatCell(icon, labelText, valueText) {
        var cell = document.createElement('div');
        cell.className = 'ud-stat';

        var ico = document.createElement('span');
        ico.textContent = icon;

        var lbl = document.createElement('span');
        lbl.textContent = labelText + ' ';

        var val = document.createElement('span');
        val.className = 'ud-stat-val';
        val.textContent = valueText != null ? String(valueText) : '—';

        cell.appendChild(ico);
        cell.appendChild(lbl);
        cell.appendChild(val);
        return cell;
    }

    // ── Build status effect pills ──────────────────────────────────────────
    function _buildStatus(container, seList) {
        if (!seList || seList.length === 0) {
            var none = document.createElement('span');
            none.className = 'ud-no-effect';
            none.textContent = 'Sem efeitos ativos';
            container.appendChild(none);
            return;
        }
        seList.forEach(function (se) {
            var pill = document.createElement('div');
            pill.className = 'ud-status-pill';

            // se may be string or {ico, n, l} (label)
            if (typeof se === 'string') {
                pill.textContent = se;
            } else {
                if (se.ico) {
                    var ico = document.createElement('span');
                    ico.textContent = se.ico;
                    pill.appendChild(ico);
                }
                var name = document.createElement('span');
                name.textContent = se.n || se.l || String(se);
                pill.appendChild(name);
            }
            container.appendChild(pill);
        });
    }

    // ── Public: showUnit(unitId) ───────────────────────────────────────────
    window.showUnit = function showUnit(unitId) {
        var unit = _extractUnit(unitId);
        if (!unit) return;

        var overlay = document.getElementById('unitPopup');
        if (!overlay) return;

        // Clear previous card children safely
        while (overlay.firstChild) {
            overlay.removeChild(overlay.firstChild);
        }

        // Build card, set border color per role
        var card = document.createElement('div');
        card.className = 'ud-card';
        card.style.borderColor = ROLE_BORDER[unit.role] || ROLE_BORDER.enemy;

        // ── Header ────────────────────────────────────────────────────────
        var header = document.createElement('div');
        header.className = 'ud-header';

        var icoEl = document.createElement('div');
        icoEl.className = 'ud-ico';
        icoEl.textContent = unit.ico;

        var infoEl = document.createElement('div');
        infoEl.className = 'ud-info';

        var nameEl = document.createElement('div');
        nameEl.className = 'ud-name';
        nameEl.textContent = unit.n;

        var typeEl = document.createElement('div');
        typeEl.className = 'ud-type';
        typeEl.textContent = unit.type;

        infoEl.appendChild(nameEl);
        infoEl.appendChild(typeEl);

        var closeBtn = document.createElement('button');
        closeBtn.className = 'ud-close';
        closeBtn.setAttribute('aria-label', 'Fechar');
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', function () { window.closeUnit(); });

        header.appendChild(icoEl);
        header.appendChild(infoEl);
        header.appendChild(closeBtn);
        card.appendChild(header);

        // ── Bars ──────────────────────────────────────────────────────────
        var bars = document.createElement('div');
        bars.className = 'ud-bars';
        bars.appendChild(_makeBarRow('HP', _hpFillClass(unit.hp, unit.mhp), unit.hp, unit.mhp));

        // MP bar: any entity with magic resources (mmp > 0)
        if (unit.mmp > 0) {
            bars.appendChild(_makeBarRow('MP', 'fill-mp', unit.mp, unit.mmp));
        }
        card.appendChild(bars);

        // ── Stats grid ────────────────────────────────────────────────────
        var stats = document.createElement('div');
        stats.className = 'ud-stats';

        stats.appendChild(_makeStatCell('🛡️', 'CA', unit.ac));
        if (unit.atk != null) {
            stats.appendChild(_makeStatCell('⚔️', 'Atq', unit.atk));
        }
        if (unit.dmg) {
            stats.appendChild(_makeStatCell('💥', 'Dano', unit.dmg));
        }
        if (unit.multi != null) {
            stats.appendChild(_makeStatCell('🎯', 'Multi', unit.multi));
        }

        card.appendChild(stats);

        // ── Status effects ─────────────────────────────────────────────────
        var statusEl = document.createElement('div');
        statusEl.className = 'ud-status';
        _buildStatus(statusEl, unit.se);
        card.appendChild(statusEl);

        // ── Intent row (enemies only) ──────────────────────────────────────
        if (unit.role === 'enemy' && unit.intent) {
            var intentRow = document.createElement('div');
            intentRow.className = 'ud-intent-row';

            var intentLbl = document.createElement('span');
            intentLbl.className = 'ud-intent-label';
            intentLbl.textContent = 'Inten\u00e7\u00e3o:';

            var intentTxt = document.createElement('span');
            intentTxt.textContent = unit.intent;

            intentRow.appendChild(intentLbl);
            intentRow.appendChild(intentTxt);
            card.appendChild(intentRow);
        }

        overlay.appendChild(card);
        overlay.classList.remove('hidden');

        // Close on background click (not on card itself)
        overlay.addEventListener('click', function _bgClick(ev) {
            if (ev.target === overlay) {
                window.closeUnit();
                overlay.removeEventListener('click', _bgClick);
            }
        });
    };

    // ── Public: closeUnit() ────────────────────────────────────────────────
    window.closeUnit = function closeUnit() {
        var overlay = document.getElementById('unitPopup');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    };

}());

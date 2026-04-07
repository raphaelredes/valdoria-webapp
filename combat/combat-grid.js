/* combat-grid.js — 4x4 Tactical Battlefield Grid Renderer */

/**
 * renderBattlefieldGrid(s)
 *
 * Renders a 4x4 tactical grid into #battlefield-grid.
 *
 * @param {object} s - Combat state
 *   s.e        {array}  - Enemies: [{ico, n, hp, mhp, ac, atk, dmg, se:[], it:{ico,l,d}, at, ma}]
 *   s.a        {array}  - Allies:  [{ico, n, hp, mhp, mp, mmp, ac, se:[]}]
 *   s.p        {object} - Player:  {ico, n, hp, mhp, mp, mmp, ac, se:[], res}
 *   s.positions {object} - Maps unit keys to rank numbers
 *                          'enemy_N' rank 2->row1(front), rank 3->row0(back); default row1
 *                          'player'  rank 0->row2(front), rank 1->row3(back); default row2
 *                          'ally_N'  rank 0->row2(front), rank 1->row3(back); default row3
 *   s.active_turn {object} - {type:'enemy'|'player'|'ally', name:string}
 */
function renderBattlefieldGrid(s) {
    var container = document.getElementById('battlefield-grid');
    if (!container) return;

    var ROW_LABELS = [
        'retaguarda inimiga',
        'frente inimiga',
        'frente aliada',
        'retaguarda aliada'
    ];

    // Build a 4x4 grid: grid[row][col] = null | {unitId, unitType, unitData}
    var grid = [
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null]
    ];

    var positions = s.positions || {};

    // Place enemies (rows 0-1; row 0=back, row 1=front)
    if (s.e && s.e.length) {
        for (var ei = 0; ei < s.e.length; ei++) {
            var eKey = 'enemy_' + ei;
            var eRank = (positions[eKey] !== undefined) ? positions[eKey] : null;
            // rank 2 -> row 1 (front), rank 3 -> row 0 (back)
            var eRow = (eRank === 3) ? 0 : 1;
            var eCol = _findEmptyCol(grid, eRow);
            if (eCol !== -1) {
                grid[eRow][eCol] = { unitId: eKey, unitType: 'enemy', unitData: s.e[ei] };
            }
        }
    }

    // Place player (rows 2-3; row 2=front, row 3=back)
    if (s.p) {
        var pRank = (positions['player'] !== undefined) ? positions['player'] : null;
        // rank 1 -> row 3 (back), rank 0 / default -> row 2 (front)
        var pRow = (pRank === 1) ? 3 : 2;
        var pCol = _findEmptyCol(grid, pRow);
        if (pCol !== -1) {
            grid[pRow][pCol] = { unitId: 'player', unitType: 'player', unitData: s.p };
        }
    }

    // Place allies (rows 2-3; row 2=front, row 3=back)
    if (s.a && s.a.length) {
        for (var ai = 0; ai < s.a.length; ai++) {
            var aKey = 'ally_' + ai;
            var aRank = (positions[aKey] !== undefined) ? positions[aKey] : null;
            // rank 0 -> row 2 (front), rank 1 / default -> row 3 (back)
            var aRow = (aRank === 0) ? 2 : 3;
            var aCol = _findEmptyCol(grid, aRow);
            if (aCol !== -1) {
                grid[aRow][aCol] = { unitId: aKey, unitType: 'ally', unitData: s.a[ai] };
            }
        }
    }

    // Determine active turn unit id
    var activeTurnId = null;
    if (s.active_turn) {
        var at = s.active_turn;
        if (at.type === 'player') {
            activeTurnId = 'player';
        } else if (at.type === 'enemy' && s.e) {
            for (var aei = 0; aei < s.e.length; aei++) {
                if (s.e[aei].n === at.name) { activeTurnId = 'enemy_' + aei; break; }
            }
            if (!activeTurnId && s.e.length > 0) activeTurnId = 'enemy_0';
        } else if (at.type === 'ally' && s.a) {
            for (var aai = 0; aai < s.a.length; aai++) {
                if (s.a[aai].n === at.name) { activeTurnId = 'ally_' + aai; break; }
            }
            if (!activeTurnId && s.a.length > 0) activeTurnId = 'ally_0';
        }
    }

    // Build HTML
    var html = '<div class="battlefield">';

    for (var row = 0; row < 4; row++) {
        var _zoneClass = row < 2 ? ' enemy-zone' : ' ally-zone';
        html += '<div class="row-label' + _zoneClass + '">' + escHtml(ROW_LABELS[row]) + '</div>';
        html += '<div class="bf-row">';
        for (var col = 0; col < 4; col++) {
            html += _buildCell(grid[row][col], activeTurnId);
        }
        html += '</div>';

        // Divider between enemy front (row 1) and ally front (row 2)
        if (row === 1) {
            html += '<div class="bf-divider"></div>';
        }
    }

    html += '</div>'; // .battlefield

    container.innerHTML = html; /* noqa: preflight — all dynamic content via escHtml() */
}

// Find first empty column using center-first order: 1, 2, 0, 3
function _findEmptyCol(grid, row) {
    var ORDER = [1, 2, 0, 3];
    for (var i = 0; i < ORDER.length; i++) {
        if (grid[row][ORDER[i]] === null) return ORDER[i];
    }
    return -1;
}

// Build HTML for a single grid cell
function _buildCell(cell, activeTurnId) {
    if (!cell) return '<div class="cell"></div>';

    var uid = cell.unitId;
    var utype = cell.unitType;
    var u = cell.unitData;

    var classes = 'cell occupied ' + utype;
    if (uid === activeTurnId) classes += ' active-turn';

    var inner = '';

    // AC badge (top-left)
    if (u.ac !== undefined && u.ac !== null) {
        inner += '<div class="cell-ac">' + escHtml(String(u.ac)) + '</div>';
    }

    // Intent badge (enemies only, top-right)
    if (utype === 'enemy' && u.it) {
        var intentText = (u.it.ico || '') + (u.it.l || '');
        inner += '<div class="intent">' + escHtml(intentText) + '</div>';
    }

    // Status effect pips — alternate left/right sides, max 4 shown
    var se = (u.se && u.se.length) ? u.se : [];
    var leftPips = [];
    var rightPips = [];
    var maxPips = Math.min(se.length, 4);
    for (var pi = 0; pi < maxPips; pi++) {
        var pip = se[pi];
        var pipText = (pip.ico || pip.e || '') + (pip.d !== undefined ? pip.d : '');
        if (pi % 2 === 0) { leftPips.push(pipText); } else { rightPips.push(pipText); }
    }

    // Unit icon row with status pips on left/right
    inner += '<div class="unit-row">';

    inner += '<div class="unit-side left">';
    for (var li = 0; li < leftPips.length; li++) {
        inner += '<div class="s-pip">' + escHtml(leftPips[li]) + '</div>';
    }
    inner += '</div>';

    inner += '<div class="unit-ico">' + escHtml(u.ico || '?') + '</div>';

    inner += '<div class="unit-side right">';
    for (var ri = 0; ri < rightPips.length; ri++) {
        inner += '<div class="s-pip">' + escHtml(rightPips[ri]) + '</div>';
    }
    inner += '</div>';

    inner += '</div>'; // .unit-row

    // Resource bars
    inner += '<div class="cell-bars">';

    // HP bar (all units)
    if (u.hp !== undefined && u.mhp) {
        var hpPct = Math.max(0, Math.min(100, Math.round((u.hp / u.mhp) * 100)));
        var hpCls = _hpClass(hpPct);
        var fillCls = _hpFillClass(hpPct);
        inner += '<div class="bar-row">';
        inner += '<div class="mini-bar"><div class="fill ' + fillCls + '" style="width:' + hpPct + '%"></div></div>';
        inner += '<div class="bar-num ' + hpCls + '">' + escHtml(String(u.hp)) + '</div>';
        inner += '</div>';
    }

    // MP bar (player and allies only)
    if ((utype === 'player' || utype === 'ally') && u.mp !== undefined && u.mmp) {
        var mpPct = Math.max(0, Math.min(100, Math.round((u.mp / u.mmp) * 100)));
        inner += '<div class="bar-row">';
        inner += '<div class="mini-bar"><div class="fill fill-mp" style="width:' + mpPct + '%"></div></div>';
        inner += '<div class="bar-num mp">' + escHtml(String(u.mp)) + '</div>';
        inner += '</div>';
    }

    inner += '</div>'; // .cell-bars

    return '<div class="' + classes + '" data-unit-id="' + escHtml(uid) + '" onclick="showUnit(\'' + escHtml(uid) + '\')">' + inner + '</div>';
}

// HP color class for bar number text
function _hpClass(pct) {
    if (pct > 60) return 'hp-high';
    if (pct > 25) return 'hp-mid';
    return 'hp-low';
}

// HP fill gradient class for bar fill
function _hpFillClass(pct) {
    if (pct > 60) return 'fill-hp-high';
    if (pct > 25) return 'fill-hp-mid';
    return 'fill-hp-low';
}

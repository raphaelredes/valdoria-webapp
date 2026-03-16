/* game-travel-prep.js — Travel Preparation Overlay for Game Hub */
/* Shows an overlay on top of the city screen when player lacks supplies */

(function () {
    'use strict';

    var _overlay = null;
    var _currentData = null;
    var _busy = false;

    function _el(id) { return document.getElementById(id); }

    // --- Status helpers ---
    function _dotCls(status) {
        return 'tp-dot tp-dot-' + status;
    }

    function _pctStatus(pct, good, warn) {
        if (pct >= good) return 'ok';
        if (pct >= warn) return 'warn';
        return 'crit';
    }

    function _bar(pct, cls) {
        return '<div class="tp-bar-wrap">' +
            '<div class="tp-bar-fill tp-bar-' + cls + '" style="width:' + Math.max(2, pct) + '%"></div>' +
            '</div>';
    }

    // --- Build overlay body ---
    function _renderBody(d) {
        var h = '';

        // HP
        h += '<div class="tp-row">';
        h += '<span class="' + _dotCls(_pctStatus(d.hp.pct, 60, 30)) + '"></span>';
        h += '<span class="tp-label">HP</span>';
        h += '<span class="tp-value">' + d.hp.current + '/' + d.hp.max + '</span>';
        h += '</div>';
        h += _bar(d.hp.pct, 'hp');

        // MP (if caster)
        if (d.mp) {
            h += '<div class="tp-row">';
            h += '<span class="' + _dotCls(_pctStatus(d.mp.pct, 50, 25)) + '"></span>';
            h += '<span class="tp-label">MP</span>';
            h += '<span class="tp-value">' + d.mp.current + '/' + d.mp.max + '</span>';
            h += '</div>';
            h += _bar(d.mp.pct, 'mp');
        }

        h += '<div class="tp-divider"></div>';

        // Supplies
        var foodSt = d.food.count >= d.food.recommended ? 'ok' : (d.food.count > 0 ? 'warn' : 'crit');
        var foodLbl = d.party_size > 1 ? d.food.count + '/' + d.food.recommended : '' + d.food.count;
        h += '<div class="tp-row">';
        h += '<span class="' + _dotCls(foodSt) + '"></span>';
        h += '<span class="tp-label">\uD83C\uDF5E Ra\u00e7\u00f5es</span>';
        h += '<span class="tp-value">' + foodLbl + '</span>';
        h += '</div>';

        h += '<div class="tp-row">';
        h += '<span class="' + _dotCls(d.tent ? 'ok' : 'crit') + '"></span>';
        h += '<span class="tp-label">\u26FA Barraca</span>';
        h += '<span class="tp-value">' + (d.tent ? 'Sim' : 'N\u00e3o') + '</span>';
        h += '</div>';

        var potSt = d.potions >= 2 ? 'ok' : (d.potions > 0 ? 'warn' : 'crit');
        h += '<div class="tp-row">';
        h += '<span class="' + _dotCls(potSt) + '"></span>';
        h += '<span class="tp-label">\uD83E\uDDEA Po\u00e7\u00f5es</span>';
        h += '<span class="tp-value">' + d.potions + '</span>';
        h += '</div>';

        h += '<div class="tp-row">';
        h += '<span class="' + _dotCls('ok') + '"></span>';
        h += '<span class="tp-label">\uD83D\uDCB0 Ouro</span>';
        h += '<span class="tp-value">' + d.gold + ' PO</span>';
        h += '</div>';

        if (d.party_size > 1) {
            h += '<div class="tp-row">';
            h += '<span class="' + _dotCls('ok') + '"></span>';
            h += '<span class="tp-label">\uD83D\uDC64 Grupo</span>';
            h += '<span class="tp-value">' + d.party_size + ' membros</span>';
            h += '</div>';
        }

        // Field gear
        if (d.field_gear && d.field_gear.length > 0) {
            h += '<div class="tp-divider"></div>';
            h += '<div class="tp-section-label">Equipamento de Campo</div>';
            for (var i = 0; i < d.field_gear.length; i++) {
                var g = d.field_gear[i];
                var gSt = g.has ? 'ok' : (g.relevant ? 'warn' : 'dim');
                var star = (g.relevant && !g.has) ? ' \u2B50' : '';
                h += '<div class="tp-row tp-row-gear">';
                h += '<span class="' + _dotCls(gSt) + '"></span>';
                h += '<span class="tp-label">' + g.emoji + ' ' + g.name + star + '</span>';
                if (g.has) h += '<span class="tp-value tp-value-dim">' + g.bonus + '</span>';
                h += '</div>';
            }
        }

        // Biome tip
        if (d.biome_tip) {
            h += '<div class="tp-tip">' + d.biome_tip.emoji + ' <em>' + d.biome_tip.text + '</em></div>';
        }

        // Warnings
        if (d.warnings && d.warnings.length > 0) {
            h += '<div class="tp-divider"></div>';
            h += '<div class="tp-warnings">';
            var wm = {
                'low_hp': '\uD83E\uDE78 HP perigosamente baixo \u2014 um golpe pode ser fatal',
                'no_food': '\uD83C\uDF5E Sem ra\u00e7\u00f5es \u2014 imposs\u00edvel Descanso Longo no campo',
                'low_food': '\uD83C\uDF5E Poucas ra\u00e7\u00f5es \u2014 podem acabar r\u00e1pido',
                'no_tent': '\u26FA Sem barraca \u2014 imposs\u00edvel Descanso Longo no campo',
                'no_potions': '\uD83E\uDDEA Sem po\u00e7\u00f5es de cura \u2014 sem recupera\u00e7\u00e3o em emerg\u00eancia'
            };
            for (var w = 0; w < d.warnings.length; w++) {
                h += '<div class="tp-warn-item">' + (wm[d.warnings[w]] || d.warnings[w]) + '</div>';
            }
            h += '</div>';
        }

        // Quick equip info
        if (d.quick_equip && d.quick_equip.available) {
            h += '<div class="tp-divider"></div>';
            h += '<div class="tp-equip-info">';
            h += '\uD83D\uDED2 Kit r\u00e1pido: <strong>' + d.quick_equip.cost + ' PO</strong>';
            var parts = [];
            for (var q = 0; q < d.quick_equip.items.length; q++) {
                var it = d.quick_equip.items[q];
                parts.push(it.name + (it.qty > 1 ? ' x' + it.qty : '') + ' ' + it.cost + ' PO');
            }
            h += '<div class="tp-equip-detail">' + parts.join(' + ') + '</div>';
            if (!d.quick_equip.affordable) {
                h += '<div class="tp-equip-short">\u26A0\uFE0F Faltam ' + d.quick_equip.shortfall + ' PO</div>';
            }
            h += '</div>';
        }

        return h;
    }

    // --- Build action buttons ---
    function _renderActions(d) {
        var h = '';
        var isLowHp = d.warnings && d.warnings.indexOf('low_hp') !== -1;

        // Quick equip
        if (d.quick_equip && d.quick_equip.available && d.quick_equip.affordable) {
            h += '<button class="tp-btn tp-btn-equip" data-action="quick_equip">';
            h += '\uD83D\uDED2 Equipar-se R\u00e1pido (' + d.quick_equip.cost + ' PO)';
            h += '</button>';
        }

        // Shop shortcuts
        var shops = '';
        if (d.warnings && (d.warnings.indexOf('no_food') !== -1 || d.warnings.indexOf('low_food') !== -1 || d.warnings.indexOf('no_tent') !== -1)) {
            shops += '<button class="tp-btn tp-btn-shop" data-action="market_interact_menu_tentmaker">\u26FA Bjorn (Seleiro)</button>';
        }
        if (d.warnings && d.warnings.indexOf('no_potions') !== -1) {
            shops += '<button class="tp-btn tp-btn-shop" data-action="market_interact_menu_alchemist">\uD83E\uDDEA Mirena (Alquimista)</button>';
        }
        if (shops) h += '<div class="tp-btn-row">' + shops + '</div>';

        // Low HP actions
        if (isLowHp) {
            var hpBtns = '';
            if (d.has_healing_potion) {
                hpBtns += '<button class="tp-btn tp-btn-heal" data-action="action_quick_potion">\uD83E\uDDEA Beber Po\u00e7\u00e3o</button>';
            }
            if (d.has_hit_dice) {
                hpBtns += '<button class="tp-btn tp-btn-heal" data-action="action_field_rest">\uD83D\uDCA4 Descanso Curto</button>';
            }
            if (hpBtns) h += '<div class="tp-btn-row">' + hpBtns + '</div>';
            h += '<button class="tp-btn tp-btn-shop" data-action="open_inn">\uD83C\uDFE8 Ir para Estalagem</button>';
        }

        // Main actions
        h += '<div class="tp-divider"></div>';
        h += '<button class="tp-btn tp-btn-proceed" data-action="proceed">\u2694\uFE0F Prosseguir Mesmo Assim</button>';
        h += '<button class="tp-btn tp-btn-cancel" data-action="cancel">\uD83C\uDFD8\uFE0F Voltar para Eld\u00f3ria</button>';

        return h;
    }

    // --- Show overlay ---
    window.showTravelPrep = function (data) {
        _currentData = data;
        _overlay = _el('travel-prep-overlay');
        if (!_overlay) return;

        var body = _el('tp-body');
        var actions = _el('tp-actions');
        var header = _overlay.querySelector('.tp-header');

        // Header style based on state
        if (data.equip_result === 'success') {
            header.innerHTML = '\u2705 Equipado para a Viagem!';
            header.className = 'tp-header tp-header-success';
        } else if (data.equip_result === 'insufficient') {
            header.innerHTML = '\uD83D\uDCB0 Ouro Insuficiente';
            header.className = 'tp-header tp-header-error';
        } else {
            var hasLowHp = data.warnings && data.warnings.indexOf('low_hp') !== -1;
            header.innerHTML = '\u26A0\uFE0F Prepara\u00e7\u00e3o de Viagem';
            header.className = 'tp-header' + (hasLowHp ? ' tp-header-danger' : '');
        }

        body.innerHTML = _renderBody(data);
        actions.innerHTML = _renderActions(data);

        // Show
        _overlay.style.display = 'flex';
        _overlay.classList.remove('hiding');
        _overlay.classList.add('active');
        _busy = false;

        // Bind clicks
        var allBtns = _overlay.querySelectorAll('[data-action]');
        for (var i = 0; i < allBtns.length; i++) {
            allBtns[i].addEventListener('click', _handleAction);
        }
    };

    // --- Hide overlay ---
    window.hideTravelPrep = function () {
        if (!_overlay) return;
        _overlay.classList.add('hiding');
        _overlay.classList.remove('active');
        setTimeout(function () {
            if (_overlay) _overlay.style.display = 'none';
            _overlay = null;
            _currentData = null;
            _busy = false;
        }, 300);
    };

    // --- Handle actions ---
    function _handleAction(e) {
        if (_busy) return;
        var action = e.currentTarget.getAttribute('data-action');
        if (!action) return;
        if (typeof haptic === 'function') haptic('light');

        if (action === 'cancel') { hideTravelPrep(); return; }

        if (action === 'proceed') {
            hideTravelPrep();
            setTimeout(function () {
                if (typeof doAction === 'function') doAction('action_explore_confirmed');
            }, 150);
            return;
        }

        if (action === 'quick_equip') {
            _doQuickEquip(e.currentTarget);
            return;
        }

        // Other actions (shop, inn, potion, rest) — close overlay and dispatch
        hideTravelPrep();
        setTimeout(function () {
            if (typeof doAction === 'function') doAction(action);
        }, 150);
    }

    // --- Quick equip API call ---
    async function _doQuickEquip(btn) {
        if (_busy) return;
        _busy = true;
        btn.disabled = true;
        btn.textContent = 'Comprando...';

        try {
            var data = await apiCall('/api/game/action', { cb: 'action_quick_equip', sv: S.screenVersion });
            if (!data) {
                _busy = false;
                btn.disabled = false;
                btn.textContent = '\uD83D\uDED2 Tentar Novamente';
                return;
            }
            if (data.sv !== undefined) S.screenVersion = data.sv;

            if (data.travel_prep) {
                _busy = false;
                showTravelPrep(data.travel_prep);
                if (data.travel_prep.equip_result === 'success') {
                    if (typeof showToast === 'function') showToast('\u2705 Itens adquiridos!', 2000);
                } else if (data.travel_prep.equip_result === 'insufficient') {
                    if (typeof showToast === 'function') showToast('\uD83D\uDCB0 Ouro insuficiente!', 2500);
                }
                return;
            }

            // Fallback
            _busy = false;
            hideTravelPrep();
            if (data.text || data.buttons) {
                if (typeof renderScreen === 'function') renderScreen(data);
            }
        } catch (err) {
            console.error('[TRAVEL_PREP] quick equip error:', err);
            _busy = false;
            btn.disabled = false;
            btn.textContent = '\uD83D\uDED2 Tentar Novamente';
        }
    }

})();

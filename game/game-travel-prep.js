(function () {
  'use strict';

  var _currentData = null;
  var _activeTab = 'status';

  function _dotCls(st) {
    return 'v-popup-dot v-popup-dot--' + st;
  }

  function _pctStatus(pct, good, warn) {
    if (pct >= good) return 'ok';
    if (pct >= warn) return 'warn';
    return 'crit';
  }

  /* ------ Tab 1: Status ------ */
  function _renderStatusTab(d) {
    var h = '';
    var warnings = d.warnings || [];

    /* HP row */
    var hpPct = d.hp.pct || 0;
    var hpSt = _pctStatus(hpPct, 60, 30);
    h += '<div class="v-popup-row">';
    h += '<span class="v-popup-label"><span class="' + _dotCls(hpSt) + '"></span>HP</span>';
    h += '<span class="v-popup-value">' + d.hp.current + ' / ' + d.hp.max + '</span>';
    h += '</div>';
    h += '<div class="v-popup-bar-wrap"><div class="v-popup-bar-fill v-popup-bar--hp" style="width:' + hpPct + '%"></div></div>';

    /* MP row (optional) */
    if (d.mp) {
      var mpPct = d.mp.pct || 0;
      var mpSt = _pctStatus(mpPct, 50, 20);
      h += '<div class="v-popup-row">';
      h += '<span class="v-popup-label"><span class="' + _dotCls(mpSt) + '"></span>MP</span>';
      h += '<span class="v-popup-value">' + d.mp.current + ' / ' + d.mp.max + '</span>';
      h += '</div>';
      h += '<div class="v-popup-bar-wrap"><div class="v-popup-bar-fill v-popup-bar--mp" style="width:' + mpPct + '%"></div></div>';
    }

    /* Warnings as compact badges */
    if (warnings.length > 0) {
      var warnMap = {
        low_hp: '\u2764\ufe0f HP baixo',
        no_food: '\ud83c\udf56 Sem rações',
        low_food: '\ud83c\udf56 Poucas rações',
        no_tent: '\u26fa Sem barraca',
        no_potions: '\ud83e\uddea Sem poções'
      };
      h += '<div class="prep-warn-badges">';
      for (var w = 0; w < warnings.length; w++) {
        var msg = warnMap[warnings[w]] || warnings[w];
        h += '<span class="prep-warn-badge">' + msg + '</span>';
      }
      h += '</div>';
    }

    /* Low HP recovery actions */
    if (warnings.indexOf('low_hp') !== -1) {
      h += '<div class="v-popup-divider"></div>';
      h += '<div class="v-popup-section-label">Recuperar HP</div>';
      if (d.has_healing_potion) {
        h += '<div class="v-popup-row" data-action="action_quick_potion" role="button">';
        h += '<span class="v-popup-label">\ud83e\uddea Beber Poção</span>';
        h += '</div>';
      }
      if (d.has_hit_dice) {
        h += '<div class="v-popup-row" data-action="action_field_rest" role="button">';
        h += '<span class="v-popup-label">\ud83d\udca4 Descanso Curto</span>';
        h += '</div>';
      }
      h += '<div class="v-popup-row" data-action="open_inn" role="button">';
      h += '<span class="v-popup-label">\ud83c\udfe8 Ir para Estalagem</span>';
      h += '</div>';
    }

    /* Biome tip */
    if (d.biome_tip) {
      h += '<div class="v-popup-divider"></div>';
      h += '<div class="v-popup-tip">' + (d.biome_tip.emoji || '') + ' ' + (d.biome_tip.text || d.biome_tip) + '</div>';
    }

    return h;
  }

  /* ------ Tab 2: Suprimentos ------ */
  function _renderSuppliesTab(d) {
    var h = '';
    var qe = d.quick_equip || {};
    var items = qe.items || [];

    /* Supply grid */
    h += '<div class="prep-supply-grid">';

    /* Food */
    var foodSt = d.food.count >= d.food.recommended ? 'ok' : (d.food.count > 0 ? 'warn' : 'crit');
    h += '<div class="prep-supply-item">';
    h += '<span class="prep-supply-icon">\ud83c\udf56</span>';
    h += '<span class="prep-supply-name">Rações</span>';
    h += '<span class="prep-supply-qty"><span class="' + _dotCls(foodSt) + '"></span>' + d.food.count + '/' + d.food.recommended + '</span>';
    h += '</div>';

    /* Tent */
    var tentSt = d.tent ? 'ok' : 'crit';
    h += '<div class="prep-supply-item">';
    h += '<span class="prep-supply-icon">\u26fa</span>';
    h += '<span class="prep-supply-name">Barraca</span>';
    h += '<span class="prep-supply-qty"><span class="' + _dotCls(tentSt) + '"></span>' + (d.tent ? 'Sim' : 'N\u00e3o') + '</span>';
    h += '</div>';

    /* Potions */
    var potSt = d.potions >= 2 ? 'ok' : (d.potions > 0 ? 'warn' : 'crit');
    h += '<div class="prep-supply-item">';
    h += '<span class="prep-supply-icon">\ud83e\uddea</span>';
    h += '<span class="prep-supply-name">Poções</span>';
    h += '<span class="prep-supply-qty"><span class="' + _dotCls(potSt) + '"></span>' + d.potions + '</span>';
    h += '</div>';

    /* Gold */
    h += '<div class="prep-supply-item">';
    h += '<span class="prep-supply-icon">\ud83e\ude99</span>';
    h += '<span class="prep-supply-name">Ouro</span>';
    h += '<span class="prep-supply-qty v-popup-gold">' + d.gold + ' PO</span>';
    h += '</div>';

    h += '</div>'; /* close prep-supply-grid */

    /* Quick buy list */
    if (qe.available && items.length > 0) {
      h += '<div class="v-popup-divider"></div>';
      h += '<div class="v-popup-section-label">Compra Rápida</div>';
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var unaffordable = d.gold < it.cost;
        h += '<div class="v-popup-row';
        if (unaffordable) h += ' v-popup-unaffordable';
        h += '" data-action="prep_buy_' + i + '" role="button">';
        var lbl = it.name;
        if (it.qty && it.qty > 1) lbl += ' x' + it.qty;
        h += '<span class="v-popup-label">' + lbl + '</span>';
        h += '<span class="v-popup-value v-popup-gold">' + it.cost + ' PO</span>';
        h += '</div>';
      }
      if (qe.shortfall > 0) {
        h += '<div class="v-popup-tip">Faltam ' + qe.shortfall + ' PO para comprar tudo</div>';
      }
    }

    /* Equip result toast */
    if (d.equip_result === 'success') {
      h += '<div class="v-popup-success-msg v-popup-center-text">\u2705 Item comprado!</div>';
    } else if (d.equip_result === 'insufficient') {
      h += '<div class="v-popup-error-msg v-popup-center-text">\u274c Ouro insuficiente!</div>';
    }

    return h;
  }

  /* ------ Tab 3: Equipamento ------ */
  function _renderGearTab(d) {
    var h = '';
    var gear = d.field_gear || [];

    if (gear.length === 0) {
      h += '<div class="v-popup-tip">Nenhum equipamento de campo registrado.</div>';
      return h;
    }

    h += '<div class="prep-gear-list">';
    for (var g = 0; g < gear.length; g++) {
      var gi = gear[g];
      var checkmark = gi.has ? '\u2705' : '\u274c';
      var rowCls = 'prep-gear-row';
      if (!gi.has && gi.relevant) rowCls += ' prep-gear-missing';
      h += '<div class="' + rowCls + '">';
      h += '<span class="prep-gear-check">' + checkmark + '</span>';
      h += '<span class="prep-gear-name">' + (gi.emoji || '') + ' ' + gi.name + '</span>';
      if (gi.relevant) h += '<span class="prep-gear-relevant">\u2b50</span>';
      h += '</div>';
    }
    h += '</div>';

    return h;
  }

  /* ------ Build full tabbed body ------ */
  function _renderBody(d) {
    var el = document.createElement('div');
    el.className = 'prep-tabbed-body';

    /* Tab bar — using shared v-tabs system */
    var h = '<div class="v-tabs prep-tabs">';
    h += '<button class="v-tab' + (_activeTab === 'status' ? ' active' : '') + '" data-prep-tab="status">\u2694 Status</button>';
    h += '<button class="v-tab' + (_activeTab === 'supplies' ? ' active' : '') + '" data-prep-tab="supplies">\ud83c\udf92 Suprimentos</button>';
    h += '<button class="v-tab' + (_activeTab === 'gear' ? ' active' : '') + '" data-prep-tab="gear">\u2699 Equipamento</button>';
    h += '</div>';

    /* Tab panels — using shared v-tab-panel system */
    h += '<div class="v-tab-panel' + (_activeTab === 'status' ? ' active' : '') + '" id="prep-status">';
    h += _renderStatusTab(d);
    h += '</div>';

    h += '<div class="v-tab-panel' + (_activeTab === 'supplies' ? ' active' : '') + '" id="prep-supplies">';
    h += _renderSuppliesTab(d);
    h += '</div>';

    h += '<div class="v-tab-panel' + (_activeTab === 'gear' ? ' active' : '') + '" id="prep-gear">';
    h += _renderGearTab(d);
    h += '</div>';

    el.innerHTML = h;
    return el;
  }

  function _bindTabs(overlay) {
    var tabs = overlay.querySelectorAll('[data-prep-tab]');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        var target = this.getAttribute('data-prep-tab');
        if (target === _activeTab) return;
        _activeTab = target;
        console.log('[TRAVEL_PREP] tab_switch tab=' + target);

        /* Toggle tab buttons */
        var allTabs = overlay.querySelectorAll('[data-prep-tab]');
        for (var t = 0; t < allTabs.length; t++) allTabs[t].classList.remove('active');
        this.classList.add('active');

        /* Toggle panels */
        var panels = overlay.querySelectorAll('.v-tab-panel');
        for (var p = 0; p < panels.length; p++) {
          panels[p].classList.remove('active', 'tab-entering');
        }
        var panel = document.getElementById('prep-' + target);
        if (panel) {
          panel.classList.add('active', 'tab-entering');
        }
      });
    }
  }

  function _renderActions(d) {
    var actions = [];
    var qe = d.quick_equip || {};
    var items = qe.items || [];
    var warnings = d.warnings || [];

    /* Buy all button */
    if (qe.available && qe.affordable && items.length > 1) {
      actions.push({
        label: 'Comprar Tudo (' + (qe.cost || 0) + ' PO)',
        action: 'action_quick_equip',
        cls: 'v-popup-btn v-popup-btn--equip'
      });
    }

    /* Primary action */
    actions.push({
      label: warnings.length > 0 ? 'Prosseguir Mesmo Assim' : 'Partir para Aventura',
      action: 'action_explore_confirmed',
      cls: 'v-popup-btn v-popup-btn--primary'
    });

    /* Cancel */
    actions.push({
      label: 'Voltar para Eld\u00f3ria',
      action: 'action_city_entry',
      cls: 'v-popup-btn v-popup-btn--cancel'
    });

    return actions;
  }

  function _onAction(action, el) {
    if (action.indexOf('prep_buy_') === 0) {
      var idx = parseInt(action.replace('prep_buy_', ''), 10);
      _doBuyItem(el, idx);
      return true;
    }
    if (action === 'action_quick_potion' || action === 'action_field_rest' || action === 'open_inn') {
      if (typeof vPopup !== 'undefined') vPopup.hide();
      setTimeout(function () {
        if (typeof doAction === 'function') doAction(action);
      }, 200);
      return true;
    }
    return false;
  }

  function _doBuyItem(el, idx) {
    /* Disable ALL buy rows to prevent race conditions */
    var popup = document.getElementById('travel-prep-overlay');
    var rows = popup ? popup.querySelectorAll('[data-action^="prep_buy_"]') : [];
    for (var r = 0; r < rows.length; r++) rows[r].classList.add('v-popup-disabled');
    if (el) el.classList.add('v-popup-disabled');

    console.log('[TRAVEL_PREP] buy_item idx=' + idx);
    var cb = 'action_quick_equip_item_' + idx;
    if (typeof apiCall === 'function') {
      apiCall('/api/game/action', { cb: cb }).then(function (resp) {
        if (!resp) return;
        var prep = resp.travel_prep || (resp.screen ? resp.screen.travel_prep : null);
        if (prep) {
          console.log('[TRAVEL_PREP] buy_item_success idx=' + idx);
          showTravelPrep(prep);
        }
      }).catch(function (err) {
        console.error('[TRAVEL_PREP] buy_item_error idx=' + idx, err);
        for (var r = 0; r < rows.length; r++) rows[r].classList.remove('v-popup-disabled');
        if (typeof vToast === 'function') vToast('Erro ao comprar item. Tente novamente.', 'error');
      });
    } else if (typeof doAction === 'function') {
      if (typeof vPopup !== 'undefined') vPopup.hide();
      setTimeout(function () { doAction(cb); }, 200);
    }
  }

  window.showTravelPrep = function (data) {
    if (!data || typeof vPopup === 'undefined') return;
    console.log('[TRAVEL_PREP] show warnings=' + ((data.warnings || []).length));
    _currentData = data;
    var bodyEl = _renderBody(data);
    var actions = _renderActions(data);
    var warnings = data.warnings || [];
    vPopup.show({
      id: 'travel-prep-overlay',
      header: 'Preparação de Viagem',
      headerClass: warnings.length > 0 ? 'v-popup-header--warning' : '',
      bodyEl: bodyEl,
      actions: actions,
      onAction: _onAction,
      closeOnOutside: false,
      onReady: function (overlay) {
        _bindTabs(overlay);
      }
    });
  };
})();

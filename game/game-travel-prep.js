(function () {
  'use strict';

  var _currentData = null;

  function _dotCls(st) {
    return 'v-popup-dot v-popup-dot--' + st;
  }

  function _pctStatus(pct, good, warn) {
    if (pct >= good) return 'ok';
    if (pct >= warn) return 'warn';
    return 'crit';
  }

  function _renderBody(d) {
    var el = document.createElement('div');
    el.className = 'v-popup-body-inner';
    var h = '';

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

    /* Suprimentos */
    h += '<div class="v-popup-divider"></div>';
    h += '<div class="v-popup-section-label">Suprimentos</div>';

    /* Food */
    var foodSt = d.food.count >= d.food.recommended ? 'ok' : (d.food.count > 0 ? 'warn' : 'crit');
    h += '<div class="v-popup-row">';
    h += '<span class="v-popup-label"><span class="' + _dotCls(foodSt) + '"></span>Rações</span>';
    h += '<span class="v-popup-value">' + d.food.count + ' / ' + d.food.recommended + '</span>';
    h += '</div>';

    /* Tent */
    var tentSt = d.tent ? 'ok' : 'crit';
    h += '<div class="v-popup-row">';
    h += '<span class="v-popup-label"><span class="' + _dotCls(tentSt) + '"></span>Barraca</span>';
    h += '<span class="v-popup-value">' + (d.tent ? 'Sim' : 'Não') + '</span>';
    h += '</div>';

    /* Potions */
    var potSt = d.potions >= 2 ? 'ok' : (d.potions > 0 ? 'warn' : 'crit');
    h += '<div class="v-popup-row">';
    h += '<span class="v-popup-label"><span class="' + _dotCls(potSt) + '"></span>Poções</span>';
    h += '<span class="v-popup-value">' + d.potions + '</span>';
    h += '</div>';

    /* Gold */
    h += '<div class="v-popup-row">';
    h += '<span class="v-popup-label">Ouro</span>';
    h += '<span class="v-popup-value">' + d.gold + ' PO</span>';
    h += '</div>';

    /* Quick buy */
    var qe = d.quick_equip || {};
    var items = qe.items || [];
    if (qe.available && items.length > 0) {
      h += '<div class="v-popup-divider"></div>';
      h += '<div class="v-popup-section-label">Compra Rápida</div>';
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var unaffordable = d.gold < it.cost;
        h += '<div class="v-popup-row ';
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

    /* Biome tip */
    if (d.biome_tip) {
      h += '<div class="v-popup-divider"></div>';
      h += '<div class="v-popup-tip">' + (d.biome_tip.emoji || '') + ' ' + (d.biome_tip.text || d.biome_tip) + '</div>';
    }

    /* Field gear */
    var gear = d.field_gear || [];
    if (gear.length > 0) {
      h += '<div class="v-popup-divider"></div>';
      h += '<div class="v-popup-section-label">Equipamento de Campo</div>';
      for (var g = 0; g < gear.length; g++) {
        var gi = gear[g];
        var gSt = gi.has ? 'ok' : (gi.relevant ? 'crit' : 'warn');
        var gCls = 'v-popup-row';
        if (!gi.has && gi.relevant) gCls += ' v-popup-warn-item';
        h += '<div class="' + gCls + '">';
        h += '<span class="v-popup-label"><span class="' + _dotCls(gSt) + '"></span>' + (gi.emoji || '') + ' ' + gi.name + '</span>';
        h += '<span class="v-popup-value">' + (gi.has ? 'Sim' : 'N' + String.fromCharCode(227) + 'o') + (gi.relevant ? ' ' + String.fromCharCode(11088) : '') + '</span>';
        h += '</div>';
      }
    }

    /* Warnings */
    var warnings = d.warnings || [];
    if (warnings.length > 0) {
      var warnMap = {
        low_hp: 'HP baixo — considere descansar ou beber poção',
        no_food: 'Sem rações! Fome causa Exaustão',
        low_food: 'Poucas rações para o grupo',
        no_tent: 'Sem barraca — descanso longo impossível',
        no_potions: 'Sem poções de cura'
      };
      h += '<div class="v-popup-divider"></div>';
      for (var w = 0; w < warnings.length; w++) {
        var msg = warnMap[warnings[w]] || warnings[w];
        h += '<div class="v-popup-warn-item">⚠️ ' + msg + '</div>';
      }
    }

    /* Low HP actions */
    if (warnings.indexOf('low_hp') !== -1) {
      h += '<div class="v-popup-divider"></div>';
      h += '<div class="v-popup-section-label">Recuperar HP</div>';
      if (d.has_healing_potion) {
        h += '<div class="v-popup-row" data-action="action_quick_potion" role="button">';
        h += '<span class="v-popup-label">🧪 Beber Poção</span>';
        h += '</div>';
      }
      if (d.has_hit_dice) {
        h += '<div class="v-popup-row" data-action="action_field_rest" role="button">';
        h += '<span class="v-popup-label">💤 Descanso Curto</span>';
        h += '</div>';
      }
      h += '<div class="v-popup-row" data-action="open_inn" role="button">';
      h += '<span class="v-popup-label">🏨 Ir para Estalagem</span>';
      h += '</div>';
    }

    /* Equip result toast */
    if (d.equip_result === 'success') {
      h += '<div class="v-popup-divider"></div>';
      h += '<div class="v-popup-success-msg v-popup-center-text">✅ Item comprado!</div>';
    } else if (d.equip_result === 'insufficient') {
      h += '<div class="v-popup-divider"></div>';
      h += '<div class="v-popup-error-msg v-popup-center-text">❌ Ouro insuficiente!</div>';
    }

    el.innerHTML = h;
    return el;
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
      label: 'Voltar para Eldória',
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

    var cb = 'action_quick_equip_item_' + idx;
    if (typeof apiCall === 'function') {
      apiCall('/api/game/action', { cb: cb }).then(function (resp) {
        if (!resp) return;
        var prep = resp.travel_prep || (resp.screen ? resp.screen.travel_prep : null);
        if (prep) showTravelPrep(prep);
      }).catch(function (err) {
        console.error('[TRAVEL-PREP] buy item error', err);
        for (var r = 0; r < rows.length; r++) rows[r].classList.remove('v-popup-disabled');
      });
    } else if (typeof doAction === 'function') {
      if (typeof vPopup !== 'undefined') vPopup.hide();
      setTimeout(function () { doAction(cb); }, 200);
    }
  }

  window.showTravelPrep = function (data) {
    if (!data || typeof vPopup === 'undefined') return;
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
      closeOnOutside: false
    });
  };
})();

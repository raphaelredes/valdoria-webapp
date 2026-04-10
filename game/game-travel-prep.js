/* Travel Prep — Minimalist no-scroll design (demand #33)
 * Main popup: HP/MP bars + warnings + biome tip + primary actions (no scroll)
 * Nested detail popups: Suprimentos, Equipamento, Recuperar HP
 */
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

  /* ------ Main popup body: compact vitals + warnings + biome tip ------ */
  function _renderMainBody(d) {
    var h = '';
    var warnings = d.warnings || [];

    h += '<div class="prep-vitals">';

    /* HP row */
    var hpPct = d.hp.pct || 0;
    var hpSt = _pctStatus(hpPct, 60, 30);
    h += '<div class="prep-vital-row">';
    h += '<span class="prep-vital-label"><span class="' + _dotCls(hpSt) + '"></span>HP</span>';
    h += '<span class="prep-vital-value">' + d.hp.current + ' / ' + d.hp.max + '</span>';
    h += '</div>';
    h += '<div class="v-popup-bar-wrap"><div class="v-popup-bar-fill v-popup-bar--hp" style="width:' + hpPct + '%"></div></div>';

    /* MP row (optional) */
    if (d.mp) {
      var mpPct = d.mp.pct || 0;
      var mpSt = _pctStatus(mpPct, 50, 20);
      h += '<div class="prep-vital-row">';
      h += '<span class="prep-vital-label"><span class="' + _dotCls(mpSt) + '"></span>MP</span>';
      h += '<span class="prep-vital-value">' + d.mp.current + ' / ' + d.mp.max + '</span>';
      h += '</div>';
      h += '<div class="v-popup-bar-wrap"><div class="v-popup-bar-fill v-popup-bar--mp" style="width:' + mpPct + '%"></div></div>';
    }

    h += '</div>'; /* end prep-vitals */

    /* Warning chips — max 4 inline, trimmed */
    if (warnings.length > 0) {
      var warnMap = {
        low_hp: '\u2764\ufe0f HP baixo',
        no_food: '\ud83c\udf56 Sem rações',
        low_food: '\ud83c\udf56 Poucas rações',
        no_tent: '\u26fa Sem barraca',
        no_potions: '\ud83e\uddea Sem poções',
        exhaustion: '\ud83d\udca4 Exausto',
        high_exhaustion: '\ud83d\udca4 Exausto!'
      };
      h += '<div class="prep-warn-chip-row">';
      for (var w = 0; w < warnings.length && w < 4; w++) {
        var msg = warnMap[warnings[w]] || warnings[w];
        h += '<span class="prep-warn-chip">' + msg + '</span>';
      }
      h += '</div>';
    }

    /* Biome tip (single discreet line) */
    if (d.biome_tip) {
      var tipEmoji = d.biome_tip.emoji || '';
      var tipText = d.biome_tip.text || d.biome_tip;
      h += '<div class="prep-biome-tip">' + tipEmoji + ' ' + tipText + '</div>';
    }

    return h;
  }

  /* ------ Supplies detail popup body (nested) ------ */
  function _renderSuppliesBody(d) {
    var h = '';

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
    h += '<span class="prep-supply-qty"><span class="' + _dotCls(tentSt) + '"></span>' + (d.tent ? 'Sim' : 'Não') + '</span>';
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
    h += '<span class="prep-supply-qty v-popup-gold">' + d.gold + '</span>';
    h += '</div>';

    h += '</div>'; /* end prep-supply-grid */

    /* Quick buy list */
    var qe = d.quick_equip || {};
    var items = qe.items || [];
    if (qe.available && items.length > 0) {
      h += '<div class="v-popup-divider"></div>';
      h += '<div class="v-popup-section-label">Compra Rápida</div>';
      h += '<div class="prep-buylist">';
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var unaffordable = d.gold < it.cost;
        h += '<div class="v-popup-row';
        if (unaffordable) h += ' v-popup-unaffordable';
        h += '" data-action="prep_buy_' + i + '" role="button">';
        var lbl = it.name;
        if (it.qty && it.qty > 1) lbl += ' x' + it.qty;
        h += '<span class="v-popup-label">' + lbl + '</span>';
        h += '<span class="v-popup-value v-popup-gold">' + it.cost + ' V</span>';
        h += '</div>';
      }
      h += '</div>';
      if (qe.shortfall > 0) {
        h += '<div class="prep-shortfall-tip">Faltam ' + qe.shortfall + ' Valdoritas</div>';
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

  /* ------ Gear detail popup body (nested) ------ */
  function _renderGearBody(d) {
    var h = '';
    var gear = d.field_gear || [];

    if (gear.length === 0) {
      return '<div class="v-popup-tip v-popup-center-text">Nenhum equipamento de campo registrado.</div>';
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
      if (gi.relevant) h += '<span class="prep-gear-relevant" title="Relevante para o bioma">\u2b50</span>';
      h += '</div>';
    }
    h += '</div>';

    return h;
  }

  /* ------ Recover HP detail popup body (nested) ------ */
  function _renderRecoverBody(d) {
    var h = '';
    h += '<div class="v-popup-tip v-popup-center-text">Escolha como restaurar sua saúde antes de partir.</div>';
    h += '<div class="prep-recover-options">';
    if (d.has_healing_potion) {
      h += '<div class="v-popup-row" data-action="action_quick_potion" role="button">';
      h += '<span class="v-popup-label">\ud83e\uddea Beber Poção de Cura</span>';
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
    h += '</div>';
    return h;
  }

  /* ------ Main popup actions: minimalist, 3-4 primary buttons ------ */
  function _renderMainActions(d) {
    var warnings = d.warnings || [];
    /* Return action objects; we render them via _mainActionsToHtml */
    var actions = [];

    /* Row with two detail buttons (rendered as raw html in single row) */
    var detailRow = '<div class="v-popup-btn-row">';
    detailRow += '<button class="v-popup-btn v-popup-btn--dim" data-action="prep_show_supplies">\ud83c\udf92 Suprimentos</button>';
    detailRow += '<button class="v-popup-btn v-popup-btn--dim" data-action="prep_show_gear">\u2699 Equipamento</button>';
    detailRow += '</div>';
    actions.push({ html: detailRow });

    /* Low HP recovery shortcut */
    if (warnings.indexOf('low_hp') !== -1) {
      actions.push({
        label: '\u2764\ufe0f Recuperar HP',
        action: 'prep_show_recover',
        cls: 'v-popup-btn v-popup-btn--dim'
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

  function _mainActionsToHtml(arr) {
    var h = '';
    for (var i = 0; i < arr.length; i++) {
      var a = arr[i];
      if (a.html) {
        h += a.html;
      } else {
        h += '<button class="' + (a.cls || 'v-popup-btn') + '" data-action="' + (a.action || 'cancel') + '">' + (a.label || '') + '</button>';
      }
    }
    return h;
  }

  /* ------ Nested popup openers ------ */
  function _openSuppliesPopup() {
    if (!_currentData || typeof vPopup === 'undefined') return;
    console.info('[TRAVEL-PREP] open_supplies_detail');
    var qe = _currentData.quick_equip || {};
    var items = qe.items || [];
    var subActions = [];
    if (qe.available && qe.affordable && items.length > 1) {
      subActions.push({
        label: 'Comprar Tudo (' + (qe.cost || 0) + ' V)',
        action: 'action_quick_equip',
        cls: 'v-popup-btn v-popup-btn--equip'
      });
    }
    subActions.push({
      label: 'Fechar',
      action: 'prep_close_detail',
      cls: 'v-popup-btn v-popup-btn--cancel'
    });
    vPopup.show({
      id: 'travel-prep-detail-overlay',
      header: '\ud83c\udf92 Suprimentos',
      body: _renderSuppliesBody(_currentData),
      actions: subActions,
      onAction: _onDetailAction,
      closeOnOutside: true
    });
  }

  function _openGearPopup() {
    if (!_currentData || typeof vPopup === 'undefined') return;
    console.info('[TRAVEL-PREP] open_gear_detail');
    vPopup.show({
      id: 'travel-prep-detail-overlay',
      header: '\u2699 Equipamento de Campo',
      body: _renderGearBody(_currentData),
      actions: [{
        label: 'Fechar',
        action: 'prep_close_detail',
        cls: 'v-popup-btn v-popup-btn--cancel'
      }],
      onAction: _onDetailAction,
      closeOnOutside: true
    });
  }

  function _openRecoverPopup() {
    if (!_currentData || typeof vPopup === 'undefined') return;
    console.info('[TRAVEL-PREP] open_recover_detail');
    vPopup.show({
      id: 'travel-prep-detail-overlay',
      header: '\u2764\ufe0f Recuperar HP',
      body: _renderRecoverBody(_currentData),
      actions: [{
        label: 'Fechar',
        action: 'prep_close_detail',
        cls: 'v-popup-btn v-popup-btn--cancel'
      }],
      onAction: _onDetailAction,
      closeOnOutside: true
    });
  }

  /* ------ Action handlers ------ */
  function _onMainAction(action, el) {
    if (action === 'prep_show_supplies') { _openSuppliesPopup(); return true; }
    if (action === 'prep_show_gear') { _openGearPopup(); return true; }
    if (action === 'prep_show_recover') { _openRecoverPopup(); return true; }
    return false;
  }

  function _onDetailAction(action, el) {
    if (action === 'prep_close_detail') {
      if (typeof vPopup !== 'undefined') vPopup.hide();
      return true;
    }
    if (action.indexOf('prep_buy_') === 0) {
      var idx = parseInt(action.replace('prep_buy_', ''), 10);
      _doBuyItem(el, idx);
      return true;
    }
    if (action === 'action_quick_potion' || action === 'action_field_rest' || action === 'open_inn') {
      console.info('[TRAVEL-PREP] recover_action action=' + action);
      if (typeof vPopup !== 'undefined') {
        vPopup.hide(); /* close detail */
        setTimeout(function () { vPopup.hide(); }, 80); /* close main */
      }
      setTimeout(function () {
        if (typeof doAction === 'function') doAction(action);
      }, 260);
      return true;
    }
    return false;
  }

  function _doBuyItem(el, idx) {
    /* Disable ALL buy rows to prevent race conditions */
    var popup = document.getElementById('travel-prep-detail-overlay');
    var rows = popup ? popup.querySelectorAll('[data-action^="prep_buy_"]') : [];
    for (var r = 0; r < rows.length; r++) rows[r].classList.add('v-popup-disabled');
    if (el) el.classList.add('v-popup-disabled');

    console.info('[TRAVEL-PREP] buy_item idx=' + idx);
    var cb = 'action_quick_equip_item_' + idx;
    if (typeof apiCall === 'function') {
      apiCall('/api/game/action', { cb: cb }).then(function (resp) {
        if (!resp) return;
        var prep = resp.travel_prep || (resp.screen ? resp.screen.travel_prep : null);
        if (prep) {
          console.info('[TRAVEL-PREP] buy_item_success idx=' + idx);
          _currentData = prep;
          /* Refresh supplies popup body in place */
          var detail = document.getElementById('travel-prep-detail-overlay');
          if (detail && detail.classList.contains('active')) {
            var body = detail.querySelector('.v-popup-body');
            if (body) {
              body.innerHTML = _renderSuppliesBody(prep);
              var newRows = body.querySelectorAll('[data-action^="prep_buy_"]');
              for (var nr = 0; nr < newRows.length; nr++) {
                (function (rowEl) {
                  rowEl.addEventListener('click', function () {
                    var act = rowEl.getAttribute('data-action');
                    var ridx = parseInt(act.replace('prep_buy_', ''), 10);
                    _doBuyItem(rowEl, ridx);
                  });
                })(newRows[nr]);
              }
            }
          }
          /* Also refresh main popup body + actions */
          _refreshMainPopup(prep);
        }
      }).catch(function (err) {
        console.error('[TRAVEL-PREP] buy_item_error idx=' + idx, err);
        for (var r = 0; r < rows.length; r++) rows[r].classList.remove('v-popup-disabled');
        if (typeof vToast === 'function') vToast('Erro ao comprar item. Tente novamente.', 'error');
      });
    } else if (typeof doAction === 'function') {
      if (typeof vPopup !== 'undefined') {
        vPopup.hide();
        setTimeout(function () { vPopup.hide(); }, 80);
      }
      setTimeout(function () { doAction(cb); }, 260);
    }
  }

  function _bindActions(container, onClickCustom) {
    var btns = container.querySelectorAll('[data-action]');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var act = btn.getAttribute('data-action');
          if (!act) return;
          if (typeof haptic === 'function') haptic('light');
          var handled = onClickCustom(act, btn);
          if (handled) return;
          /* Delegate to default close + doAction */
          if (typeof vPopup !== 'undefined') vPopup.hide();
          setTimeout(function () {
            if (typeof doAction === 'function') doAction(act);
          }, 150);
        });
      })(btns[i]);
    }
  }

  function _refreshMainPopup(prep) {
    var main = document.getElementById('travel-prep-overlay');
    if (!main) return;
    var body = main.querySelector('.v-popup-body');
    if (body) body.innerHTML = _renderMainBody(prep);
    var actions = main.querySelector('.v-popup-actions');
    if (actions) {
      actions.innerHTML = _mainActionsToHtml(_renderMainActions(prep));
      _bindActions(actions, _onMainAction);
    }
  }

  /* ------ Public entry ------ */
  window.showTravelPrep = function (data) {
    if (!data || typeof vPopup === 'undefined') return;
    var warnings = data.warnings || [];
    console.info('[TRAVEL-PREP] show warnings=' + warnings.length + ' hp_pct=' + (data.hp && data.hp.pct));
    _currentData = data;

    var bodyHtml = _renderMainBody(data);
    var actionsList = _renderMainActions(data);

    vPopup.show({
      id: 'travel-prep-overlay',
      header: 'Preparação de Viagem',
      headerClass: warnings.length > 0 ? 'v-popup-header--warning' : '',
      body: bodyHtml,
      actions: '', /* we render actions manually in onReady to support raw html row */
      onAction: _onMainAction,
      closeOnOutside: false,
      onReady: function (overlay) {
        var actionsEl = overlay.querySelector('.v-popup-actions');
        if (actionsEl) {
          actionsEl.innerHTML = _mainActionsToHtml(actionsList);
          _bindActions(actionsEl, _onMainAction);
        }
      }
    });
  };
})();

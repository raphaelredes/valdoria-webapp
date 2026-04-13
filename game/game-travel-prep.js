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

  /* ------ Item info data for mini popup ------ */
  var _ITEM_INFO = {
    rations: { icon: '\uD83C\uDF56', title: 'Rac\u00f5es de Viagem', body: 'Cada trecho da jornada consome <b>1 ra\u00e7\u00e3o por membro</b> do grupo. Sem ra\u00e7\u00f5es, o grupo sofre <b>1 n\u00edvel de exaust\u00e3o</b> por trecho sem alimento.' },
    tent: { icon: '\u26FA\uFE0F', title: 'Barraca', body: 'Permite <b>Descanso Longo</b> durante a explora\u00e7\u00e3o, recuperando <b>HP total e recursos</b>. Sem barraca, descanso longo \u00e9 imposs\u00edvel no campo.' },
    potions: { icon: '\uD83E\uDDEA', title: 'Po\u00e7\u00f5es de Cura', body: 'Cura <b>2d4+2 HP</b> instantaneamente. Podem ser usadas em combate (a\u00e7\u00e3o b\u00f4nus) ou durante descanso.' },
    hp: { icon: '\u2764\uFE0F', title: 'Pontos de Vida', body: 'Partir com <b>HP abaixo de 60%</b> aumenta o risco de derrota no primeiro encontro. Considere descansar na Estalagem ou usar po\u00e7\u00f5es.' },
    rope: { icon: '\uD83E\uDDF6', title: 'Corda de C\u00e2nhamo', body: 'Concede <b>+2 em testes de FOR e DES</b> contra perigos como abismos, quedas e armadilhas.' },
    lighter: { icon: '\uD83D\uDD25', title: 'Isqueiro', body: 'Concede <b>+2 SAB em cavernas</b> (contra escurid\u00e3o) e <b>+2 CON no frio</b> (contra congelamento).' },
    sleeping: { icon: '\uD83D\uDECF\uFE0F', title: 'Saco de Dormir', body: 'Concede <b>+1 HP extra</b> ao realizar Descanso Curto. Acumula com dados de vida.' },
    canteen: { icon: '\uD83D\uDCA7', title: 'Cantil de Couro', body: 'Concede <b>+2 CON contra calor</b>. Essencial em desertos e regi\u00f5es vulc\u00e2nicas.' }
  };

  function _showItemInfo(key) {
    var info = _ITEM_INFO[key];
    if (!info || typeof vPopup === 'undefined') return;
    vPopup.show({
      id: 'travel-prep-detail-overlay',
      size: 'mini',
      header: info.icon + ' ' + info.title,
      body: info.body,
      actions: [{ label: 'Entendi', action: 'cancel', cls: 'v-popup-btn' }],
      closeOnOutside: true
    });
  }

  /* ------ Main popup body: Design B — readiness + bars + checklist ------ */
  function _renderMainBody(d) {
    var h = '';
    var warnings = d.warnings || [];
    var warnCount = warnings.length;

    /* Readiness meter */
    var readiness = Math.max(0, Math.round(100 - warnCount * 12.5));
    var readCls = readiness >= 80 ? 'high' : readiness >= 50 ? 'mid' : 'low';
    var readColor = readiness >= 80 ? 'var(--v-success)' : readiness >= 50 ? 'var(--v-warning)' : 'var(--v-danger)';
    h += '<div class="prep-readiness">';
    h += '<div class="prep-readiness-label">Prontid\u00e3o: <b style="color:' + readColor + '">' + readiness + '%</b></div>';
    h += '<div class="prep-readiness-bar"><div class="prep-readiness-fill prep-readiness-fill--' + readCls + '" style="width:' + readiness + '%"></div></div>';
    if (warnCount > 0) h += '<div class="prep-readiness-text">' + warnCount + ' alerta' + (warnCount > 1 ? 's' : '') + ' ativo' + (warnCount > 1 ? 's' : '') + '</div>';
    h += '</div>';

    /* HP bar */
    var hpPct = d.hp.pct || 0;
    var hpSt = _pctStatus(hpPct, 60, 30);
    h += '<div class="prep-vitals">';
    h += '<div class="prep-vital-row">';
    h += '<span class="prep-vital-label"><span class="' + _dotCls(hpSt) + '"></span>HP</span>';
    h += '<span class="prep-vital-value">' + d.hp.current + ' / ' + d.hp.max + '</span>';
    h += '</div>';
    h += '<div class="v-popup-bar-wrap"><div class="v-popup-bar-fill v-popup-bar--hp" style="width:' + hpPct + '%"></div></div>';

    /* MP bar (optional) */
    if (d.mp) {
      var mpPct = d.mp.pct || 0;
      var mpSt = _pctStatus(mpPct, 50, 20);
      h += '<div class="prep-vital-row">';
      h += '<span class="prep-vital-label"><span class="' + _dotCls(mpSt) + '"></span>MP</span>';
      h += '<span class="prep-vital-value">' + d.mp.current + ' / ' + d.mp.max + '</span>';
      h += '</div>';
      h += '<div class="v-popup-bar-wrap"><div class="v-popup-bar-fill v-popup-bar--mp" style="width:' + mpPct + '%"></div></div>';
    }
    h += '</div>';

    h += '<div class="prep-sep"></div>';

    /* Checklist grid 2-col */
    var foodOk = d.food.count >= d.food.recommended;
    var gear = d.field_gear || [];
    var gearMap = {};
    for (var gi = 0; gi < gear.length; gi++) gearMap[gear[gi].name] = gear[gi];

    h += '<div class="prep-checklist-grid">';
    h += _checkItem(foodOk, 'Ra\u00e7\u00f5es (' + d.food.count + '/' + d.food.recommended + ')', 'rations');
    h += _checkItem(d.tent, 'Barraca', 'tent');
    h += _checkItem(d.potions > 0, 'Po\u00e7\u00f5es (' + d.potions + ')', 'potions');
    h += _checkItem(hpPct >= 60, 'HP ' + (hpPct >= 60 ? '\u2265' : '<') + ' 60%', 'hp');
    /* Field gear items */
    var gearKeys = [
      { name: 'Corda de C\u00e2nhamo (15m)', label: 'Corda', key: 'rope' },
      { name: 'Isqueiro', label: 'Isqueiro', key: 'lighter' },
      { name: 'Saco de Dormir', label: 'Saco de Dormir', key: 'sleeping' },
      { name: 'Cantil de Couro', label: 'Cantil', key: 'canteen' }
    ];
    for (var gk = 0; gk < gearKeys.length; gk++) {
      var gd = gearMap[gearKeys[gk].name];
      var has = gd ? gd.has : false;
      h += _checkItem(has, gearKeys[gk].label, gearKeys[gk].key);
    }
    h += '</div>';

    h += '<div class="prep-sep"></div>';

    /* Gold row with v-coin */
    h += '<div class="prep-gold-row">';
    h += '<span class="vi vi-coin"></span>';
    h += '<span class="prep-gold-val">' + (d.gold || 0) + '</span>';
    h += '</div>';

    /* Biome tip */
    if (d.biome_tip) {
      var tipEmoji = d.biome_tip.emoji || '';
      var tipText = d.biome_tip.text || d.biome_tip;
      h += '<div class="prep-biome-tip">' + tipEmoji + ' ' + tipText + '</div>';
    }

    /* Quick buy card */
    var qe = d.quick_equip || {};
    if (qe.available && qe.items && qe.items.length > 0) {
      var firstItem = qe.items[0];
      h += '<div class="prep-quickbuy" data-action="prep_show_supplies">';
      h += 'Compra r\u00e1pida: ' + firstItem.name + ' por <span class="vi vi-coin sm"></span> <b style="color:var(--v-gold)">' + firstItem.cost + '</b>';
      h += '</div>';
    }

    return h;
  }

  function _checkItem(ok, label, infoKey) {
    var dotCls = ok ? 'prep-check-dot prep-check-dot--ok' : 'prep-check-dot prep-check-dot--miss';
    return '<div class="prep-check-item" data-info="' + infoKey + '">' +
      '<span class="' + dotCls + '"></span>' + label +
      '<span class="prep-check-hint">\u2139</span></div>';
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

    /* Supplies detail button (gear is already in the checklist grid) */
    actions.push({
      label: '\ud83c\udf92 Suprimentos',
      action: 'prep_show_supplies',
      cls: 'v-popup-btn v-popup-btn--dim'
    });

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

    /* Cancel — just close popup, player is already in Eldoria */
    actions.push({
      label: 'Fechar',
      action: 'cancel',
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
    if (action === 'cancel' || action === 'dismiss') {
      if (typeof vPopup !== 'undefined') vPopup.hide();
      return true;
    }
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

    var actionsHtml = _mainActionsToHtml(actionsList);

    vPopup.show({
      id: 'travel-prep-overlay',
      header: 'Preparação de Viagem',
      headerClass: warnings.length > 0 ? 'v-popup-header--warning' : '',
      body: bodyHtml,
      actions: actionsHtml,
      onAction: _onMainAction,
      closeOnOutside: false,
      onReady: function (overlay) {
        var actionsEl = overlay.querySelector('.v-popup-actions');
        if (actionsEl) {
          _bindActions(actionsEl, _onMainAction);
        }
        /* Bind checklist item info clicks */
        var items = overlay.querySelectorAll('.prep-check-item[data-info]');
        for (var ci = 0; ci < items.length; ci++) {
          (function (el) {
            el.addEventListener('click', function () {
              if (typeof haptic === 'function') haptic('light');
              _showItemInfo(el.getAttribute('data-info'));
            });
          })(items[ci]);
        }
        /* Bind quick buy card click */
        var qb = overlay.querySelector('.prep-quickbuy[data-action]');
        if (qb) {
          qb.addEventListener('click', function () {
            if (typeof haptic === 'function') haptic('light');
            _openSuppliesPopup();
          });
        }
      }
    });
  };
})();

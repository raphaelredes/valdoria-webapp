/* game-temple.js — Temple popup renderer */
/* Uses vCity.* shared components */
'use strict';

function renderTempleHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-TEMPLE] renderTempleHub services=' + (data.services ? data.services.length : 0) + ' debt=' + (data.debt || 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'tmp-hub');

  /* Debt alert — statusAlert now handles v-coin token inline (fix 2026-04-11) */
  if (data.debt && data.debt > 0) {
    root.appendChild(vCity.statusAlert(
      'Dívida ativa: ' + data.debt + ' <span class="vi vi-coin sm"></span> — serviços bloqueados',
      'danger'
    ));
  }

  /* Pay Debt button — render ONLY special action buttons (fix 2026-04-11) */
  /* Backend sends data.buttons with all interactions (services + pay debt). */
  /* Services are already rendered by serviceGrid, so filter to special ones */
  /* (temple_confirm_debt, temple_pay_*) that don't have service cards. */
  if (data.buttons && Array.isArray(data.buttons) && data.buttons.length > 0) {
    var _SPECIAL_CBS = {
      'temple_confirm_debt': true,
      'temple_pay_debt': true,
    };
    var btnRow = null;
    for (var bi = 0; bi < data.buttons.length; bi++) {
      var b = data.buttons[bi];
      if (!b || !b.cb) continue;
      if (!_SPECIAL_CBS[b.cb]) continue; /* skip service interactions */
      if (!btnRow) btnRow = vCity.el('div', 'tmp-pay-debt-row');
      var btn = vCity.el('button', 'v-popup-btn v-popup-btn--primary tmp-pay-btn');
      var txt = b.text || '';
      var coinToken = '<span class="vi vi-coin sm"></span>';
      if (txt.indexOf(coinToken) >= 0) {
        var parts = txt.split(coinToken);
        for (var pi = 0; pi < parts.length; pi++) {
          if (parts[pi]) btn.appendChild(document.createTextNode(parts[pi]));
          if (pi < parts.length - 1) btn.appendChild(vCity.el('span', 'vi vi-coin sm'));
        }
      } else {
        btn.textContent = txt;
      }
      (function(cb) {
        btn.addEventListener('click', function() {
          if (typeof doAction === 'function') doAction(cb);
        });
      })(b.cb);
      btnRow.appendChild(btn);
    }
    if (btnRow) root.appendChild(btnRow);
  }

  /* Flavor text */
  if (data.flavor) {
    var flavor = vCity.el('div', 'tmp-flavor');
    flavor.textContent = vCity.stripTags(data.flavor);
    root.appendChild(flavor);
  }

  /* Services grid */
  if (data.services && data.services.length) {
    root.appendChild(vCity.sectionLabel('Servicos disponiveis'));
    root.appendChild(vCity.serviceGrid(data.services));
  }

  /* Downtime button */
  if (data.downtime) {
    root.appendChild(vCity.sectionLabel('Atividade'));
    var dtList = [data.downtime];
    root.appendChild(vCity.serviceGrid(dtList));
  }

  /* Wandering NPCs */
  if (data.wandering_npcs && data.wandering_npcs.length) {
    root.appendChild(vCity.sectionLabel('Viajantes'));
    root.appendChild(vCity.actionList(data.wandering_npcs));
  }

  /* Gold balance */
  if (data.gold !== undefined) {
    root.appendChild(vCity.goldBalance(data.gold));
  }

  container.appendChild(root);
}

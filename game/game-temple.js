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

  /* Pay Debt button — render inline buttons from data.buttons (fix 2026-04-11) */
  /* Backend sends "Pagar Dívida" button when debt > 0, but renderer ignored it */
  /* before this fix, leaving the player stuck (couldn't use services OR pay). */
  if (data.buttons && Array.isArray(data.buttons) && data.buttons.length > 0) {
    var btnRow = vCity.el('div', 'tmp-pay-debt-row');
    for (var bi = 0; bi < data.buttons.length; bi++) {
      var b = data.buttons[bi];
      if (!b || !b.cb) continue;
      var btn = vCity.el('button', 'v-popup-btn v-popup-btn--primary tmp-pay-btn');
      /* Parse text for v-coin token to render icon correctly */
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
    root.appendChild(btnRow);
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

/* game-trade-board.js — Trade Board hub renderer */
/* Uses vCity.* shared components */
'use strict';

function renderTradeBoard(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-TRADE] renderTradeBoard view=' + data.view);
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'trb-hub');

  /* Rules bar */
  var rules = vCity.el('div', 'trb-rules');
  rules.textContent = 'Max ' + data.max_offers + ' ofertas \u2022 Expira ' + data.expiry_hours + 'h \u2022 Max ' + data.max_gold + ' V';
  root.appendChild(rules);

  /* Gold display */
  var goldRow = vCity.el('div', 'trb-gold-row');
  goldRow.appendChild(vCity.coin('sm'));
  var goldVal = vCity.el('span', 'trb-gold-value');
  goldVal.textContent = ' ' + String(data.gold || 0);
  goldRow.appendChild(goldVal);
  root.appendChild(goldRow);

  /* Services grid */
  if (data.services && data.services.length) {
    root.appendChild(vCity.serviceGrid(data.services));
  }

  container.appendChild(root);
}

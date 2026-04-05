/* game-market-hub.js — Market popup renderer */
'use strict';

function renderMarketHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-MARKET] renderMarketHub type=' + (data.type || '?') + ' merchants=' + (data.merchants ? data.merchants.length : 0) + ' gold=' + (data.gold || 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  /* Mercado fechado (noite) */
  if (data.type === 'closed') {
    var closed = vCity.el('div', 'mkt-hub');
    closed.appendChild(vCity.statusAlert(data.message || 'Mercado fechado', 'warn'));
    if (data.extras && data.extras.length) {
      closed.appendChild(vCity.sectionLabel('Alternativas'));
      closed.appendChild(vCity.serviceGrid(data.extras));
    }
    container.appendChild(closed);
    return;
  }

  var root = vCity.el('div', 'mkt-hub');

  /* Gold + items */
  var stats = vCity.el('div', 'mkt-stats');
  var goldSpan = vCity.el('span', '');
  goldSpan.textContent = String(data.gold || 0) + ' ';
  goldSpan.appendChild(vCity.coin('sm'));
  stats.appendChild(goldSpan);
  var sep = document.createTextNode('  |  ');
  stats.appendChild(sep);
  var itemsSpan = vCity.el('span', '');
  itemsSpan.textContent = '\uD83C\uDF92 Itens: ' + (data.item_count || 0);
  stats.appendChild(itemsSpan);
  root.appendChild(stats);

  /* Merchants grid */
  if (data.merchants && data.merchants.length) {
    root.appendChild(vCity.sectionLabel('Mercadores'));
    root.appendChild(vCity.serviceGrid(data.merchants));
  }

  /* Extras (transient, rune scribe, sell, rumors) */
  if (data.extras && data.extras.length) {
    root.appendChild(vCity.serviceGrid(data.extras));
  }

  /* Wandering NPCs */
  if (data.wandering_npcs && data.wandering_npcs.length) {
    root.appendChild(vCity.sectionLabel('Viajantes'));
    root.appendChild(vCity.actionList(data.wandering_npcs));
  }

  container.appendChild(root);
}

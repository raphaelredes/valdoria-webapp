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

  /* X-6.5.51CB (2026-05-18): atmosfera AAA — flavor line do horário do dia.
     Renderizada como banner ornamentado pra integrar PADRAO_ALDRIC do hub
     do mercado (consistente com taverna/estalagem). */
  if (data.flavor) {
    var flavorDiv = vCity.el('div', 'mkt-atmosphere');
    flavorDiv.innerHTML = data.flavor;
    flavorDiv.style.cssText = 'font-style:italic;color:var(--v-text-dim,#a09484);text-align:center;padding:8px 12px;margin:4px 8px 8px;border-left:2px solid var(--v-gold,#c4953a);border-right:2px solid var(--v-gold,#c4953a);background:linear-gradient(90deg,transparent,rgba(196,149,58,0.06),transparent);font-size:var(--v-font-sm,12px);line-height:1.55;';
    root.appendChild(flavorDiv);
  }

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

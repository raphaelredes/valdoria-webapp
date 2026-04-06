/* game-tavern.js — Tavern popup renderer */
'use strict';

function renderTavernHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-TAVERN] renderTavernHub npcs=' + (data.npcs ? data.npcs.length : 0) + ' services=' + (data.services ? data.services.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'tav-hub');

  /* Flavor/gossip text */
  if (data.flavor) {
    var flavor = vCity.el('div', 'tav-flavor');
    flavor.innerHTML = data.flavor; /* noqa: innerHTML — server-controlled tavern flavor text, safe content */
    root.appendChild(flavor);
  }

  /* NPCs present (Grom + market NPCs + wandering) */
  if (data.npcs && data.npcs.length) {
    root.appendChild(vCity.sectionLabel('Presentes'));
    root.appendChild(vCity.actionList(data.npcs));
  }

  /* Services grid */
  if (data.services && data.services.length) {
    root.appendChild(vCity.sectionLabel('Servicos'));
    root.appendChild(vCity.serviceGrid(data.services));
  }

  container.appendChild(root);
}

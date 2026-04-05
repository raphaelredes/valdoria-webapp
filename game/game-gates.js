/* game-gates.js — City Gates popup renderer */
/* Uses vCity.* shared components */
'use strict';

function renderGatesHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-GATES] renderGatesHub actions=' + (data.actions ? data.actions.length : 0) + ' wnpcs=' + (data.wandering_npcs ? data.wandering_npcs.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'gts-hub');

  /* Flavor text (first visits only) */
  if (data.flavor) {
    var flavor = vCity.el('div', 'gts-flavor');
    flavor.textContent = data.flavor;
    root.appendChild(flavor);
  }

  /* Main actions (Guards, Surroundings) */
  if (data.actions && data.actions.length) {
    root.appendChild(vCity.serviceGrid(data.actions));
  }

  /* Wandering NPCs */
  if (data.wandering_npcs && data.wandering_npcs.length) {
    root.appendChild(vCity.sectionLabel('Viajantes'));
    root.appendChild(vCity.actionList(data.wandering_npcs));
  }

  container.appendChild(root);
}

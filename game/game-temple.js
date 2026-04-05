/* game-temple.js — Temple popup renderer */
/* Uses vCity.* shared components */
'use strict';

function renderTempleHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-TEMPLE] renderTempleHub services=' + (data.services ? data.services.length : 0) + ' debt=' + (data.debt || 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'tmp-hub');

  /* Debt alert */
  if (data.debt && data.debt > 0) {
    root.appendChild(vCity.statusAlert(
      'Divida ativa: ' + data.debt + ' GP — servicos bloqueados',
      'danger'
    ));
  }

  /* Flavor text */
  if (data.flavor) {
    var flavor = vCity.el('div', 'tmp-flavor');
    flavor.textContent = data.flavor;
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

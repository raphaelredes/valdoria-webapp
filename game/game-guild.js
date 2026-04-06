/* game-guild.js — Guild popup renderer */
'use strict';

function renderGuildHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-GUILD] renderGuildHub party=' + (data.party_count || 0) + '/' + (data.party_max || 3) + ' services=' + (data.services ? data.services.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'gld-hub');

  /* Flavor text (first visit) */
  if (data.flavor) {
    var flavor = vCity.el('div', 'gld-flavor');
    flavor.textContent = vCity.stripTags(data.flavor);
    root.appendChild(flavor);
  }

  /* Party status bar */
  var party = vCity.el('div', 'gld-party-row');
  var partyLabel = vCity.el('span', 'gld-party-label');
  partyLabel.textContent = '\uD83D\uDC65 Grupo: ' + (data.party_count || 0) + '/' + (data.party_max || 3);
  party.appendChild(partyLabel);
  if (data.fallen_count > 0) {
    var fallen = vCity.el('span', 'gld-fallen');
    fallen.textContent = ' \u00B7 \uD83D\uDC80 ' + data.fallen_count + ' caido(s)';
    party.appendChild(fallen);
  }
  root.appendChild(party);

  /* Gold */
  if (data.gold !== undefined) {
    root.appendChild(vCity.goldBalance(data.gold));
  }

  /* Services grid */
  if (data.services && data.services.length) {
    root.appendChild(vCity.serviceGrid(data.services));
  }

  container.appendChild(root);
}

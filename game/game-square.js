/* game-square.js — Town Square popup renderer */
'use strict';

function renderSquareHub(container, data) {
  if (!container || !data) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'sqr-hub');

  /* Flavor text */
  if (data.flavor) {
    var flavor = vCity.el('div', 'sqr-flavor');
    flavor.textContent = data.flavor;
    root.appendChild(flavor);
  }

  /* Reputation + buff */
  if (data.rep_label || data.buff) {
    var info = vCity.el('div', 'sqr-info');
    if (data.rep_label) info.textContent = data.rep_label;
    if (data.buff) info.textContent += (data.rep_label ? '  |  ' : '') + data.buff;
    root.appendChild(info);
  }

  /* Services grid */
  if (data.services && data.services.length) {
    root.appendChild(vCity.serviceGrid(data.services));
  }

  container.appendChild(root);
}

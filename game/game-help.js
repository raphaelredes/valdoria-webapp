/* game-help.js — Help screen renderer */
/* Uses vCity.* shared components */
'use strict';

function renderHelpScreen(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-HELP] renderHelpScreen context=' + data.context);
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'hlp-hub');

  /* Header */
  var header = vCity.el('div', 'hlp-header');
  var icon = vCity.el('span', 'hlp-header-icon');
  icon.textContent = '❓';
  header.appendChild(icon);
  var title = vCity.el('span', 'hlp-header-title');
  title.textContent = ' Guia';
  header.appendChild(title);
  root.appendChild(header);

  /* Body text — pre-formatted with line breaks */
  if (data.body) {
    var body = vCity.el('div', 'hlp-body');
    /* Split by double newline for paragraphs, single newline for lines */
    var paragraphs = data.body.split('\n\n');
    for (var p = 0; p < paragraphs.length; p++) {
      var para = vCity.el('div', 'hlp-paragraph');
      para.textContent = paragraphs[p].trim();
      if (para.textContent) root.appendChild(para);
    }
  }

  container.appendChild(root);
}

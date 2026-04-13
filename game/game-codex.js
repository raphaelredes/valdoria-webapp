/* game-codex.js — Compêndio popup renderer (Layout 5: Combinado) */
/* Uses vCity.* shared components */
'use strict';

var _codexActiveTab = null;
var _codexSearchTerm = '';

function renderCodexScreen(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-CODEX] renderCodexScreen unlocked=' + data.unlocked + '/' + data.total);
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'cdx-hub');

  /* Progress bar + percentage */
  var progRow = vCity.el('div', 'cdx-prog-row');
  var progBar = vCity.el('div', 'cdx-prog-bar');
  var progFill = vCity.el('div', 'cdx-prog-fill');
  progFill.style.width = Math.min(100, data.pct || 0) + '%';
  progBar.appendChild(progFill);
  progRow.appendChild(progBar);
  var progPct = vCity.el('div', 'cdx-prog-pct');
  progPct.textContent = Math.round(data.pct || 0) + '%';
  progRow.appendChild(progPct);
  root.appendChild(progRow);

  /* Category tabs */
  var cats = data.categories || [];
  if (cats.length) {
    var tabs = vCity.el('div', 'cdx-tabs');
    /* "All" tab */
    var allTab = vCity.el('button', 'cdx-tab cdx-tab--active');
    allTab.textContent = '\uD83D\uDCCB Todos';
    allTab.onclick = function() { _codexSwitchTab(null, tabs, entries, data); };
    tabs.appendChild(allTab);
    for (var c = 0; c < cats.length; c++) {
      (function(cat) {
        var tab = vCity.el('button', 'cdx-tab');
        tab.textContent = cat.icon + ' ' + cat.label;
        tab.setAttribute('data-cat', cat.key);
        tab.onclick = function() { _codexSwitchTab(cat.key, tabs, entries, data); };
        tabs.appendChild(tab);
      })(cats[c]);
    }
    root.appendChild(tabs);
  }

  /* Search */
  var search = vCity.el('div', 'cdx-search');
  var searchInput = vCity.el('input', 'cdx-search-input');
  searchInput.type = 'text';
  searchInput.placeholder = '\uD83D\uDD0D Filtrar entradas...';
  searchInput.oninput = function() {
    _codexSearchTerm = searchInput.value.toLowerCase();
    _codexFilterEntries(entries, data);
  };
  search.appendChild(searchInput);
  root.appendChild(search);

  /* Entries list */
  var entries = vCity.el('div', 'cdx-entries');
  var items = data.entries || [];
  for (var i = 0; i < items.length; i++) {
    var e = items[i];
    var card = vCity.el('div', 'cdx-entry' + (e.unlocked ? '' : ' cdx-entry--locked'));
    card.setAttribute('data-cat', e.category);
    card.setAttribute('data-name', (e.name || '').toLowerCase());

    /* Rarity border */
    if (e.unlocked && e.rarity) {
      var rarityColors = { common: '#8a8a8a', uncommon: '#4caf50', rare: '#2196f3', very_rare: '#9c27b0', legendary: '#ff9800' };
      card.style.borderLeftColor = rarityColors[e.rarity] || '#8a8a8a';
    }

    var icon = vCity.el('div', 'cdx-entry-icon');
    icon.textContent = e.icon || '\u2753';
    card.appendChild(icon);

    var info = vCity.el('div', 'cdx-entry-info');
    var name = vCity.el('div', 'cdx-entry-name');
    name.textContent = e.name || '???';
    info.appendChild(name);
    var meta = vCity.el('div', 'cdx-entry-meta');
    meta.textContent = e.meta || '';
    info.appendChild(meta);
    card.appendChild(info);

    entries.appendChild(card);
  }
  root.appendChild(entries);

  container.appendChild(root);
  _codexActiveTab = null;
}

function _codexSwitchTab(catKey, tabsEl, entriesEl, data) {
  _codexActiveTab = catKey;
  /* Update tab active state */
  var allTabs = tabsEl.querySelectorAll('.cdx-tab');
  for (var t = 0; t < allTabs.length; t++) {
    var isActive = catKey === null ? t === 0 : allTabs[t].getAttribute('data-cat') === catKey;
    allTabs[t].className = 'cdx-tab' + (isActive ? ' cdx-tab--active' : '');
  }
  _codexFilterEntries(entriesEl, data);
}

function _codexFilterEntries(entriesEl, data) {
  var cards = entriesEl.querySelectorAll('.cdx-entry');
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var catMatch = !_codexActiveTab || card.getAttribute('data-cat') === _codexActiveTab;
    var searchMatch = !_codexSearchTerm || (card.getAttribute('data-name') || '').indexOf(_codexSearchTerm) !== -1;
    card.style.display = (catMatch && searchMatch) ? '' : 'none';
  }
}

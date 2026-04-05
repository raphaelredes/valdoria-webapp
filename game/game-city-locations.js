/* game-city-locations.js — City locations popup renderer (structured data -> DOM) */
/* Renders the city locations hub as a grid of medieval-themed cards */
/* Follows game-inn.js pattern: _el() for DOM, _act() for callbacks */

'use strict';

/**
 * Main entry point called by game-popup-unified.js.
 * @param {HTMLElement} container - popup body element
 * @param {Object} data - _city_locations data from backend
 */
function renderCityLocations(container, data) {
  if (!container || !data) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  switch (data.type) {
    case 'hub': return _renderLocHub(container, data);
    default:    return _renderLocHub(container, data);
  }
}

/* ================================================================
   TYPE: hub — Main city locations grid
   ================================================================ */
function _renderLocHub(ct, d) {
  var root = _clEl('div', 'cloc-hub');

  /* Core locations grid (2 columns) */
  if (d.locations && d.locations.length) {
    var grid = _clEl('div', 'cloc-grid');
    for (var i = 0; i < d.locations.length; i++) {
      grid.appendChild(_buildLocCard(d.locations[i]));
    }
    root.appendChild(grid);
  }

  /* Extra locations section (conditional) */
  if (d.extra && d.extra.length) {
    var sep = _clEl('div', 'cloc-separator');
    root.appendChild(sep);

    var extraGrid = _clEl('div', 'cloc-grid');
    for (var j = 0; j < d.extra.length; j++) {
      extraGrid.appendChild(_buildLocCard(d.extra[j]));
    }
    root.appendChild(extraGrid);
  }

  ct.appendChild(root);
}

/* Single location card */
function _buildLocCard(loc) {
  var card = _clEl('div', 'cloc-card');

  /* Icon */
  var ico = _clEl('div', 'cloc-card-icon');
  ico.textContent = loc.icon || '';
  card.appendChild(ico);

  /* Info block */
  var info = _clEl('div', 'cloc-card-info');

  var name = _clEl('div', 'cloc-card-name');
  name.textContent = loc.label || '';
  info.appendChild(name);

  if (loc.desc) {
    var desc = _clEl('div', 'cloc-card-desc');
    desc.textContent = loc.desc;
    info.appendChild(desc);
  }

  card.appendChild(info);

  /* Quest indicator (gold dot) */
  if (loc.quest) {
    var quest = _clEl('span', 'cloc-badge-quest');
    card.appendChild(quest);
  }

  /* New badge */
  if (loc.is_new) {
    var newB = _clEl('span', 'cloc-badge-new');
    newB.textContent = '\u2728';
    card.appendChild(newB);
  }

  /* Count badge (for travelers, etc.) */
  if (loc.badge) {
    var badge = _clEl('span', 'cloc-badge-count');
    badge.textContent = loc.badge;
    card.appendChild(badge);
  }

  /* Click handler */
  if (loc.cb) {
    card.addEventListener('click', function () {
      if (typeof doAction === 'function') doAction(loc.cb);
    });
  }

  return card;
}

/* ================================================================
   UTILITIES — local helpers (prefixed to avoid collision with inn)
   ================================================================ */
function _clEl(tag, cls) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

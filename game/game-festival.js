/* game-festival.js — Festival hub renderer */
/* Uses vCity.* shared components */
'use strict';

function renderFestivalHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-FEST] renderFestivalHub name=' + data.fest_name + ' day=' + data.day_num);
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'fst-hub');

  /* Festival header */
  var header = vCity.el('div', 'fst-header');
  var icon = vCity.el('div', 'fst-header-icon');
  icon.textContent = data.fest_icon || '🎪';
  header.appendChild(icon);
  var name = vCity.el('div', 'fst-header-name');
  name.textContent = data.fest_name || 'Festival';
  header.appendChild(name);
  var day = vCity.el('div', 'fst-header-day');
  day.textContent = 'Dia ' + data.day_num + ' de ' + data.total_days;
  header.appendChild(day);
  root.appendChild(header);

  /* Intro text */
  if (data.fest_intro) {
    var intro = vCity.el('div', 'fst-intro');
    intro.textContent = data.fest_intro;
    root.appendChild(intro);
  }

  /* Gold */
  var goldRow = vCity.el('div', 'fst-gold-row');
  goldRow.appendChild(vCity.coin('sm'));
  var goldVal = vCity.el('span', 'fst-gold-value');
  goldVal.textContent = ' ' + String(data.gold || 0) + ' Valdoritas';
  goldRow.appendChild(goldVal);
  root.appendChild(goldRow);

  /* Events */
  if (data.events && data.events.length) {
    root.appendChild(vCity.sectionLabel('Atividades'));
    var grid = vCity.el('div', 'fst-events');
    for (var i = 0; i < data.events.length; i++) {
      var ev = data.events[i];
      var btn = vCity.el('button', 'fst-event-btn' + (ev.played ? ' fst-event-done' : ''));
      btn.setAttribute('data-action', ev.cb);

      var evIcon = vCity.el('span', 'fst-event-icon');
      evIcon.textContent = (ev.played ? '✅ ' : '') + ev.icon;
      btn.appendChild(evIcon);

      var evInfo = vCity.el('span', 'fst-event-info');
      var evName = vCity.el('span', 'fst-event-name');
      evName.textContent = ev.name;
      evInfo.appendChild(evName);
      if (!ev.played) {
        var evCost = vCity.el('span', 'fst-event-cost');
        evCost.textContent = ev.cost + ' V';
        evInfo.appendChild(evCost);
      }
      btn.appendChild(evInfo);

      grid.appendChild(btn);
    }

    /* Merchant button */
    var merch = vCity.el('button', 'fst-event-btn');
    merch.setAttribute('data-action', 'festival_merchant');
    var merchIcon = vCity.el('span', 'fst-event-icon');
    merchIcon.textContent = '🛒';
    merch.appendChild(merchIcon);
    var merchInfo = vCity.el('span', 'fst-event-info');
    var merchName = vCity.el('span', 'fst-event-name');
    merchName.textContent = 'Comerciante do Festival';
    merchInfo.appendChild(merchName);
    merch.appendChild(merchInfo);
    grid.appendChild(merch);

    root.appendChild(grid);
  }

  container.appendChild(root);
}

/* game-wandering-npc.js — Wandering NPC encounter renderer */
/* Uses vCity.* shared components */
'use strict';

function renderWanderingNpc(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-WNPC] renderWanderingNpc npc=' + data.npc_name + ' tier=' + data.tier);
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'wnpc-hub');

  /* NPC portrait area */
  var portrait = vCity.el('div', 'wnpc-portrait');
  var emoji = vCity.el('div', 'wnpc-portrait-icon');
  emoji.textContent = data.npc_emoji || '❓';
  portrait.appendChild(emoji);

  if (!data.is_stranger) {
    var name = vCity.el('div', 'wnpc-name');
    name.textContent = data.npc_name;
    portrait.appendChild(name);
    var info = vCity.el('div', 'wnpc-info');
    info.textContent = data.race + ' \u2022 ' + data.hero_class + ' Nv.' + data.level;
    portrait.appendChild(info);
  } else {
    var unk = vCity.el('div', 'wnpc-name');
    unk.textContent = 'Viajante Desconhecido';
    portrait.appendChild(unk);
  }

  /* Tier badge */
  var tierLabels = {
    stranger: 'Desconhecido', acquaintance: 'Conhecido', familiar: 'Familiar',
    friend: 'Amigo', close_friend: 'Amigo Proximo', confidant: 'Confidente'
  };
  var badge = vCity.el('span', 'wnpc-tier-badge wnpc-tier-' + data.tier);
  badge.textContent = tierLabels[data.tier] || data.tier;
  portrait.appendChild(badge);

  root.appendChild(portrait);

  /* Description */
  if (data.description) {
    var desc = vCity.el('div', 'wnpc-desc');
    desc.textContent = data.description;
    root.appendChild(desc);
  }

  /* Dialogue */
  if (data.dialogue) {
    var dlg = vCity.el('div', 'wnpc-dialogue');
    dlg.textContent = '\u201C' + data.dialogue + '\u201D';
    root.appendChild(dlg);
  }

  /* Action buttons */
  if (data.actions && data.actions.length) {
    var grid = vCity.el('div', 'wnpc-actions');
    for (var i = 0; i < data.actions.length; i++) {
      var a = data.actions[i];
      var btn = vCity.el('button', 'wnpc-action-btn');
      btn.setAttribute('data-action', a.cb);
      btn.textContent = a.label;
      grid.appendChild(btn);
    }
    root.appendChild(grid);
  }

  container.appendChild(root);
}

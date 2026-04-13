/* game-guard.js — City Guard dialogue renderer */
/* Uses vCity.* shared components */
'use strict';

function renderGuardScreen(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-GUARD] renderGuardScreen type=' + data.type);
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'grd-hub');

  /* NPC header */
  var npc = vCity.el('div', 'grd-npc');
  var npcIcon = vCity.el('div', 'grd-npc-icon');
  npcIcon.textContent = data.npc_emoji || '🛡️';
  npc.appendChild(npcIcon);
  var npcName = vCity.el('div', 'grd-npc-name');
  npcName.textContent = data.npc_name || 'Aldric';
  npc.appendChild(npcName);
  var npcRole = vCity.el('div', 'grd-npc-role');
  npcRole.textContent = data.npc_role || 'Guarda do Portao';
  npc.appendChild(npcRole);
  root.appendChild(npc);

  /* Dialogue text */
  if (data.dialogue) {
    var dlg = vCity.el('div', 'grd-dialogue');
    dlg.textContent = vCity.stripTags(data.dialogue);
    root.appendChild(dlg);
  }

  /* Action buttons */
  if (data.actions && data.actions.length) {
    var grid = vCity.el('div', 'grd-actions');
    for (var i = 0; i < data.actions.length; i++) {
      var a = data.actions[i];
      var btn = vCity.el('button', 'grd-action-btn');
      btn.setAttribute('data-action', a.cb);
      btn.textContent = a.label;
      grid.appendChild(btn);
    }
    root.appendChild(grid);
  }

  container.appendChild(root);
}

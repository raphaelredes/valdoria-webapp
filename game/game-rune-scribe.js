/* game-rune-scribe.js — Rune Scribe popup renderer */
/* Uses vCity.* shared components */
'use strict';

function renderRuneScribe(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-RUNE] renderRuneScribe type=' + data.type);
  while (container.firstChild) container.removeChild(container.firstChild);

  if (data.type === 'craft_menu') return _renderCraftMenu(container, data);
}

function _renderCraftMenu(container, data) {
  var root = vCity.el('div', 'rns-hub');

  /* NPC header */
  var npc = vCity.el('div', 'rns-npc');
  var npcIcon = vCity.el('div', 'rns-npc-icon');
  npcIcon.textContent = data.npc_emoji || '🔮';
  npc.appendChild(npcIcon);
  var npcName = vCity.el('div', 'rns-npc-name');
  npcName.textContent = data.npc_name || 'Eirik';
  npc.appendChild(npcName);
  var npcRole = vCity.el('div', 'rns-npc-role');
  npcRole.textContent = data.npc_role || 'Escriba Runico';
  npc.appendChild(npcRole);
  root.appendChild(npc);

  /* Recipe info */
  var recipe = vCity.el('div', 'rns-recipe');
  recipe.textContent = '📜 Receita: 3 fragmentos do mesmo tier = 1 runa aleatoria';
  root.appendChild(recipe);

  /* Tier cards */
  if (data.tiers && data.tiers.length) {
    root.appendChild(vCity.sectionLabel('Fragmentos'));
    for (var i = 0; i < data.tiers.length; i++) {
      var t = data.tiers[i];
      var card = vCity.el('div', 'rns-tier-card');

      var hdr = vCity.el('div', 'rns-tier-header');
      var emoji = vCity.el('span', 'rns-tier-emoji');
      emoji.textContent = t.frag_emoji;
      hdr.appendChild(emoji);
      var name = vCity.el('span', 'rns-tier-name');
      name.textContent = t.frag_name;
      hdr.appendChild(name);
      var badge = vCity.el('span', 'rns-tier-badge');
      badge.textContent = 'Tier ' + t.tier;
      hdr.appendChild(badge);
      card.appendChild(hdr);

      /* Progress */
      var progRow = vCity.el('div', 'rns-tier-progress');
      var progText = vCity.el('span', 'rns-tier-count');
      progText.textContent = t.count + '/' + t.cost;
      progRow.appendChild(progText);
      var progBar = vCity.el('div', 'rns-progress-wrap');
      var progFill = vCity.el('div', 'rns-progress-fill');
      progFill.style.width = Math.min(100, Math.floor(t.count / t.cost * 100)) + '%';
      if (t.can_craft) progFill.classList.add('rns-ready');
      progBar.appendChild(progFill);
      progRow.appendChild(progBar);
      card.appendChild(progRow);

      /* Craft button */
      var btn = vCity.el('button', 'rns-craft-btn');
      btn.setAttribute('data-action', t.cb);
      if (t.can_craft) {
        btn.textContent = '✅ Forjar Runa Tier ' + t.tier;
        btn.classList.add('rns-craft-ready');
      } else if (t.locked_level) {
        btn.textContent = '🔒 Nivel ' + t.min_level + ' necessario';
        btn.disabled = true;
        btn.classList.add('rns-craft-locked');
      } else {
        btn.textContent = '🔒 Faltam ' + Math.max(0, t.cost - t.count) + ' fragmentos';
        btn.disabled = true;
        btn.classList.add('rns-craft-locked');
      }
      card.appendChild(btn);

      root.appendChild(card);
    }
  }

  /* Quick actions */
  if (data.actions && data.actions.length) {
    var qRow = vCity.el('div', 'rns-actions-row');
    for (var a = 0; a < data.actions.length; a++) {
      var act = data.actions[a];
      var aBtn = vCity.el('button', 'rns-action-btn');
      aBtn.setAttribute('data-action', act.cb);
      aBtn.textContent = act.icon + ' ' + act.label;
      qRow.appendChild(aBtn);
    }
    root.appendChild(qRow);
  }

  container.appendChild(root);
}

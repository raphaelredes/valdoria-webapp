/* game-workshop.js — Workshop/Crafting popup renderer */
/* Uses vCity.* shared components */
'use strict';

function renderWorkshopHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-WORKSHOP] renderWorkshopHub type=' + data.type + ' tools=' + (data.tools ? data.tools.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'wks-hub');

  /* No tools — info message */
  if (data.type === 'no_tools' || !data.tools || !data.tools.length) {
    var empty = vCity.el('div', 'wks-empty');
    var emptyIcon = vCity.el('div', 'wks-empty-icon');
    emptyIcon.textContent = '🔨';
    empty.appendChild(emptyIcon);
    var emptyTitle = vCity.el('div', 'wks-empty-title');
    emptyTitle.textContent = 'Sem Proficiências';
    empty.appendChild(emptyTitle);
    var emptyDesc = vCity.el('div', 'wks-empty-desc');
    emptyDesc.textContent = 'Você não possui proficiência em nenhuma ferramenta artesanal. Proficiências podem ser obtidas através de Classe, Antecedente, ou Raça.';
    empty.appendChild(emptyDesc);
    root.appendChild(empty);
    container.appendChild(root);
    return;
  }

  /* Stats summary row */
  var stats = data.stats || {};
  var statsRow = vCity.el('div', 'wks-stats-row');

  var statRecipes = _wksStat('📜', String(stats.recipes_total || 0), 'Receitas');
  var statCraft = _wksStat('✅', String(stats.craftable || 0), 'Prontas');
  var statMats = _wksStat('📦', String(stats.materials || 0), 'Materiais');

  statsRow.appendChild(statRecipes);
  statsRow.appendChild(statCraft);
  statsRow.appendChild(statMats);
  root.appendChild(statsRow);

  /* Gold display */
  var goldRow = vCity.el('div', 'wks-gold-row');
  goldRow.appendChild(vCity.coin('sm'));
  var goldVal = vCity.el('span', 'wks-gold-value');
  goldVal.textContent = ' ' + String(data.gold || 0);
  goldRow.appendChild(goldVal);
  root.appendChild(goldRow);

  /* Tools section */
  root.appendChild(vCity.sectionLabel('Profissões'));
  var toolsGrid = vCity.el('div', 'wks-tools-grid');
  for (var i = 0; i < data.tools.length; i++) {
    var t = data.tools[i];
    var btn = vCity.el('button', 'wks-tool-btn');
    btn.setAttribute('data-action', t.cb);
    var btnIcon = vCity.el('span', 'wks-tool-icon');
    btnIcon.textContent = t.emoji || '🔧';
    btn.appendChild(btnIcon);
    var btnInfo = vCity.el('span', 'wks-tool-info');
    var btnName = vCity.el('span', 'wks-tool-name');
    btnName.textContent = t.name;
    btnInfo.appendChild(btnName);
    var btnCount = vCity.el('span', 'wks-tool-count');
    btnCount.textContent = t.recipe_count + ' receitas';
    btnInfo.appendChild(btnCount);
    btn.appendChild(btnInfo);
    toolsGrid.appendChild(btn);
  }
  root.appendChild(toolsGrid);

  /* Scribe button */
  if (data.scribe) {
    var scribeBtn = vCity.el('button', 'wks-scribe-btn');
    scribeBtn.setAttribute('data-action', 'workshop_scribe_menu');
    scribeBtn.textContent = data.scribe;
    root.appendChild(scribeBtn);
  }

  /* Quick actions */
  if (data.quick_actions && data.quick_actions.length) {
    var qRow = vCity.el('div', 'wks-quick-row');
    for (var q = 0; q < data.quick_actions.length; q++) {
      var qa = data.quick_actions[q];
      var qBtn = vCity.el('button', 'wks-quick-btn');
      qBtn.setAttribute('data-action', qa.cb);
      qBtn.textContent = qa.icon + ' ' + qa.label;
      qRow.appendChild(qBtn);
    }
    root.appendChild(qRow);
  }

  container.appendChild(root);
}

function _wksStat(icon, value, label) {
  var card = vCity.el('div', 'wks-stat-card');
  var ico = vCity.el('div', 'wks-stat-icon');
  ico.textContent = icon;
  card.appendChild(ico);
  var val = vCity.el('div', 'wks-stat-value');
  val.textContent = value;
  card.appendChild(val);
  var lbl = vCity.el('div', 'wks-stat-label');
  lbl.textContent = label;
  card.appendChild(lbl);
  return card;
}

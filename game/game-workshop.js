/* ============================================================================
 * game-workshop.js — Oficina da Bigorna (PADRAO_TAVERNA canonical)
 * ============================================================================
 *
 * Task #35 sessão #14 (2026-05-20) — REFATORADO p/ PADRAO_TAVERNA canonical.
 * NPC: Mestre Garrick (ferreiro, 44 anos de bigorna).
 * Source: simuladores/oficina-bigorna-final.html
 * ============================================================================ */
'use strict';

if (!window._SVC_CONFIG_WORKSHOP) {
  window._SVC_CONFIG_WORKSHOP = {
    faction: 'workshop',
    factionLabel: 'Oficina da Bigorna',
    reactions: {
      very_negative: 'Garrick larga o martelo no chão. <i>(sai sem te olhar)</i> "Sai da minha oficina."',
      negative: 'Garrick coça a barba ruiva. <i>(volta ao trabalho)</i> "Cada um com seus modos. Mas aqui é trabalho."',
      neutral: 'Garrick acena com o queixo. <i>(continua martelando)</i> "Hmm."',
      positive: 'Garrick interrompe o trabalho. <i>(dá uma palmada nos teus ombros)</i> "Cliente que respeita o ofício é cliente que volta."',
      very_positive: 'Garrick estende a mão calejada. <i>(rara mostra de afeto)</i> "Honraste a Bigorna. Próxima encomenda, abro o estoque especial."'
    },
    confirmMsgs: {
      narration: 'Garrick anota no caderno encharcado de fuligem. <i>(martela uma vez na bigorna pra selar)</i>',
      generic: '"Encomenda registrada. Volta em dois dias."'
    }
  };
}

var GARRICK_DIALOGUE = {
  npc: {
    name: 'Mestre Garrick',
    desc: 'Ferreiro · quarenta e quatro anos golpeando bigorna',
    portrait: '../shared/img/npcs/mestre-garrick.png'
  },
  script: [
    { type: 'narration', text: 'A oficina respira em fumaça e brasa. O forno central ruge — uma boca de ferro forjado com chamas alaranjadas dançando atrás de grade de aço. Ao lado, a bigorna principal: chumbo maciço, marcada por décadas de golpes, lustrosa onde o metal a beijou cem mil vezes.' },
    { type: 'speech', speaker: 'Mestre Garrick', text: 'Cuidado com o chão. <i>(martela uma vez, pausa pra olhar)</i> Tem prego solto, ferro caído, e brasa que pula da forja sem aviso. O que vais fazer aqui? Eu não vendo curiosidade — só trabalho.' },
    { type: 'speech', speaker: 'Mestre Garrick', text: 'Faço seis coisas. <i>(conta nos dedos calejados)</i> Forjo arma nova. Reparo dano. Aprimoro o que tu tem. Encanto se trouxeres a runa. Desconstruo se for desperdício. E faço comissão se pagares bem.' }
  ],
  choices: [
    // task #70 (2026-05-20): cb's alinhadas com backend canonical em crafting_ui.py.
    // Antes: 'workshop_forge'/'workshop_upgrade'/'workshop_repair' → não dispatched.
    // Agora: 'workshop_recipes' (lista receitas), 'workshop_materials' (materiais),
    // 'workshop_main' (hub geral). upgrade/repair caem no hub geral.
    { id: 'forge',    label: '🔨 "Quero forjar algo novo."', cb: 'workshop_recipes' },
    { id: 'materials', label: '📦 "Mostra meus materiais."', cb: 'workshop_materials' },
    { id: 'browse',   label: '🛠 "Mostra a oficina toda."', cb: 'workshop_main' },
    { id: 'leave',    label: '↩ "Volto outra hora, Mestre."', cb: 'close' }
  ]
};

function _wksEl(tag, cls, text) {
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  // task #70 review (2026-05-20): suporta HTML inline (e.g. badge com vi-coin).
  if (text != null) {
    if (typeof text === 'string' && /<(span|b|i|em|strong|br)\b[^>]*>/.test(text)) {
      el.innerHTML = text;
    } else {
      el.textContent = text;
    }
  }
  return el;
}

function renderWorkshopHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-WORKSHOP] renderWorkshopHub (PADRAO_TAVERNA) type=' + data.type + ' tools=' + (data.tools ? data.tools.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'wks-hub');

  /* === 1. Cenario canonical === */
  var cenarioEl = vCity.el('div', 'cenario');
  var bg = _wksEl('img', 'cenario-bg');
  bg.src = '../shared/img/oficina/oficina-banner.png';
  bg.loading = 'lazy';
  bg.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(bg);
  cenarioEl.appendChild(vCity.el('div', 'candle-glow l'));
  cenarioEl.appendChild(vCity.el('div', 'candle-glow r'));
  var crest = _wksEl('img', 'cenario-brasao');
  crest.src = '../shared/img/oficina/oficina-crest.png';
  crest.alt = 'Brasão da Oficina';
  crest.loading = 'lazy';
  crest.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(crest);
  var titulo = vCity.el('div', 'cenario-titulo');
  titulo.appendChild(_wksEl('div', 'name', 'Oficina da Bigorna'));
  titulo.appendChild(_wksEl('div', 'sub', 'Forja de Mestre Garrick · Bairro do Ferro'));
  cenarioEl.appendChild(titulo);
  root.appendChild(cenarioEl);

  /* === 2. Body container === */
  var body = vCity.el('div', 'wks-body');
  body.style.cssText = 'padding:8px 12px 0;display:flex;flex-direction:column;gap:7px;';

  /* === 2a. NPC row Garrick === */
  var npcRow = vCity.el('div', 'row-npc');
  var portraitWrap = vCity.el('div', 'npc-portrait');
  var img = _wksEl('img');
  img.src = '../shared/img/npcs/mestre-garrick.png';
  img.alt = 'Mestre Garrick';
  img.loading = 'lazy';
  img.onerror = function(){ this.style.display = 'none'; };
  portraitWrap.appendChild(img);
  npcRow.appendChild(portraitWrap);
  var info = vCity.el('div', 'npc-info');
  info.appendChild(_wksEl('div', 'name', 'Mestre Garrick'));
  info.appendChild(_wksEl('div', 'quote', '"Eu não vendo curiosidade — só trabalho."'));
  npcRow.appendChild(info);
  npcRow.appendChild(_wksEl('div', 'npc-chev', '›'));
  npcRow.addEventListener('click', function(){
    if (typeof window.vEncounter === 'object' && window.vEncounter.render) {
      window._SVC_CONFIG = window._SVC_CONFIG_WORKSHOP;
      window.vEncounter.render(GARRICK_DIALOGUE);
    }
  });
  body.appendChild(npcRow);

  /* === 2b. Rep bar === */
  var renown = (data.renown && typeof data.renown.workshop === 'number') ? data.renown.workshop : (window._PLAYER_RENOWN && window._PLAYER_RENOWN.workshop) || 0;
  var tierLbl = 'NEUTRO';
  if (renown >= 25) tierLbl = 'AMIGÁVEL';
  else if (renown >= 10) tierLbl = 'CORDIAL';
  else if (renown < 0 && renown >= -10) tierLbl = 'FRIO';
  else if (renown < -10) tierLbl = 'HOSTIL';
  var pct = Math.max(0, Math.min(100, Math.round((renown + 10) / 40 * 100)));
  var repBar = vCity.el('div', 'rep-bar');
  repBar.appendChild(_wksEl('span', 'label', 'Reputação'));
  var track = vCity.el('div', 'bar');
  var fill = vCity.el('div', 'fill');
  fill.style.width = pct + '%';
  track.appendChild(fill);
  repBar.appendChild(track);
  repBar.appendChild(_wksEl('span', 'value', tierLbl + ' · ' + renown));
  body.appendChild(repBar);

  /* === 2c. No tools — early exit === */
  if (data.type === 'no_tools' || !data.tools || !data.tools.length) {
    var empty = vCity.el('div', 'wks-empty');
    empty.style.cssText = 'text-align:center;padding:24px 12px;color:#a09484;';
    empty.appendChild(_wksEl('div', 'wks-empty-icon', '🔨'));
    var emptyTitle = _wksEl('div', 'wks-empty-title', 'Sem Proficiências');
    emptyTitle.style.cssText = 'font-family:Cinzel,serif;font-size:14px;color:#c4953a;margin:8px 0;';
    empty.appendChild(emptyTitle);
    var emptyDesc = _wksEl('div', 'wks-empty-desc', 'Você não possui proficiência em nenhuma ferramenta artesanal. Proficiências podem ser obtidas através de Classe, Antecedente, ou Raça.');
    emptyDesc.style.cssText = 'font-size:12px;line-height:1.5;font-style:italic;';
    empty.appendChild(emptyDesc);
    body.appendChild(empty);
    root.appendChild(body);
    container.appendChild(root);
    return;
  }

  /* === 2d. Stats summary === */
  var stats = data.stats || {};
  var statsRow = vCity.el('div', 'wks-stats');
  statsRow.style.cssText = 'display:flex;justify-content:space-around;padding:6px 0;font-size:12px;color:#a09484;border-top:1px solid rgba(196,149,58,0.15);border-bottom:1px solid rgba(196,149,58,0.15);';
  statsRow.appendChild(_wksEl('span', '', '📜 ' + (stats.recipes_total || 0) + ' receitas'));
  statsRow.appendChild(_wksEl('span', '', '✅ ' + (stats.craftable || 0) + ' prontas'));
  statsRow.appendChild(_wksEl('span', '', '📦 ' + (stats.materials || 0) + ' mat.'));
  statsRow.appendChild(_wksEl('span', '', '🪙 ' + (data.gold || 0) + ' V'));
  body.appendChild(statsRow);

  /* === 2e. Section: Profissões === */
  var sectionLbl = vCity.el('div', 'pt-section-label');
  sectionLbl.textContent = '⚜ Profissões ⚜';
  body.appendChild(sectionLbl);

  /* === 2f. Tools grid (.services + .svc canonical) === */
  var grid = vCity.el('div', 'services');
  for (var i = 0; i < data.tools.length; i++) {
    var t = data.tools[i];
    var card = vCity.el('div', 'svc');
    card.setAttribute('data-svc', t.cb || '');
    var ico = vCity.el('div', 'svc-ico');
    ico.innerHTML = t.emoji || '🔧';
    ico.style.cssText = 'font-size:20px;';
    card.appendChild(ico);
    var txt = vCity.el('div', 'svc-text');
    txt.appendChild(_wksEl('div', 'svc-name', t.name));
    txt.appendChild(_wksEl('div', 'svc-meta', t.recipe_count + ' receitas'));
    card.appendChild(txt);
    card.addEventListener('click', (function(cb){ return function(){ vCity.act(cb); }; })(t.cb));
    grid.appendChild(card);
  }
  body.appendChild(grid);

  /* === 2g. Scribe button === */
  if (data.scribe) {
    var scribeBtn = vCity.el('button', 'v-popup-btn');
    scribeBtn.style.cssText = 'margin-top:6px;';
    scribeBtn.textContent = data.scribe;
    scribeBtn.addEventListener('click', function(){ vCity.act('workshop_scribe_menu'); });
    body.appendChild(scribeBtn);
  }

  /* === 2h. Quick actions === */
  if (data.quick_actions && data.quick_actions.length) {
    var qRow = vCity.el('div', 'wks-quick-row');
    qRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;';
    for (var q = 0; q < data.quick_actions.length; q++) {
      var qa = data.quick_actions[q];
      var qBtn = vCity.el('button', 'v-popup-btn');
      qBtn.style.cssText = 'flex:1;font-size:11px;padding:6px 8px;';
      qBtn.innerHTML = qa.icon + ' ' + qa.label;
      qBtn.addEventListener('click', (function(cb){ return function(){ vCity.act(cb); }; })(qa.cb));
      qRow.appendChild(qBtn);
    }
    body.appendChild(qRow);
  }

  root.appendChild(body);
  container.appendChild(root);
}

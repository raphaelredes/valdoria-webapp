/* game-guild.js — Guild popup renderer
 *
 * V4 NPC Dialog redesign (2026-04-11):
 * NPC principal scene (Tavira, a Mestra) with speech bubble + dialogue
 * choices. Uses createElement/textContent only (no innerHTML) to
 * avoid XSS vectors with user-controlled quest names.
 *
 * Uses the Valdoria coin icon (.vi.vi-coin) for gold display —
 * NEVER the money-bag emoji.
 */
'use strict';

function _gldEl(tag, cls, text) {
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) { if (typeof text === 'string' && text.charAt(0) === '<') el.innerHTML = text; else el.textContent = text; }
  return el;
}

function _gldSpeech(partyCount, partyMax, available, rotationHours) {
  var vagas = Math.max(0, (partyMax || 3) - (partyCount || 0));
  var parts = [];
  if (vagas > 0) {
    parts.push('Bem-vindo de volta, aventureiro. Vejo que teu grupo ainda tem ' + vagas + ' vaga' + (vagas !== 1 ? 's' : '') + '.');
  } else {
    parts.push('Bem-vindo de volta, aventureiro. Teu grupo está completo — ' + partyCount + ' de ' + partyMax + '.');
  }
  if (available && available > 0) {
    parts.push(' Temos ' + available + ' aventureiro' + (available !== 1 ? 's' : '') + ' dispostos hoje');
    if (rotationHours) {
      parts.push(' — a lista se renova em ' + rotationHours + ' horas.');
    } else {
      parts.push('.');
    }
  }
  parts.push(' Em que posso te ajudar?');
  return parts.join('');
}

/* === PADRAO_TAVERNA canonical SVC config (task #33, 2026-05-20) === */
if (!window._SVC_CONFIG_GUILD) {
  window._SVC_CONFIG_GUILD = {
    faction: 'guild',
    factionLabel: 'Guilda dos Aventureiros',
    reactions: {
      very_negative: 'Tavira cruza os braços, olhar duro. <i>(suspira longo)</i> "A Guilda não tolera comportamento assim. Vai pensar antes de voltar."',
      negative: 'Tavira balança a cabeça. <i>(volta ao caderno)</i> "Cada um tem seu jeito. Mas a Guilda também."',
      neutral: 'Tavira anota algo no caderno. <i>(mantém o tom profissional)</i> "Registrado."',
      positive: 'Tavira ergue uma sobrancelha em aprovação. <i>(sorri de canto)</i> "Esse é o tipo de aventureiro que a Guilda precisa."',
      very_positive: 'Tavira inclina a cabeça em respeito. <i>(estende a mão)</i> "És dos melhores. A Guilda sempre lembra dos seus."'
    },
    confirmMsgs: {
      narration: 'Tavira anota o registro no livro da Guilda. <i>(passa a pena no tinteiro)</i>',
      generic: '"Registrado e selado." <i>(fecha o livro)</i> Que tua jornada honre o nome da Guilda.'
    }
  };
}

/* === TAVIRA_DIALOGUE (greeting principal — opens on NPC row click) ====== */
var TAVIRA_DIALOGUE = {
  npc: {
    name: 'Mestra Tavira',
    desc: 'Guardiã da Guilda · dezoito anos liderando o Salão dos Aventureiros',
    portrait: '../shared/img/npcs/mestra-tavira.png'
  },
  script: [
    { type: 'narration', text: 'O Salão dos Aventureiros respira lenta. Tochas de óleo pendem das vigas, iluminando o brasão da Guilda — espada cruzada com pena — entalhado no mármore atrás do balcão. Tavira ergue os olhos do registro, reconhece você, sorri de canto.' },
    { type: 'speech', speaker: 'Mestra Tavira', text: 'Bem-vindo de volta, aventureiro. <i>(fecha o livro com um clique seco)</i> O Salão sempre tem trabalho pra quem busca. Diz o que precisa.' }
  ],
  choices: [
    // task #70 (2026-05-20): cb's alinhadas com backend canonical em guild.py:151-178.
    // Antes: 'guild_quests'/'guild_recruit'/'guild_rest' → não dispatched (silent close).
    // Agora: backend handlers reais → abre quest board / recruit menu / party menu.
    { id: 'view_quests',  label: '📜 "Quero ver os contratos."', cb: 'guild_quest_board' },
    { id: 'recruit',      label: '⚔ "Vim recrutar aventureiros."', cb: 'guild_recruit_menu' },
    { id: 'manage_party', label: '👥 "Como gerencio meu grupo?"', cb: 'guild_party_menu' },
    { id: 'leave',        label: '↩ "Volto depois, Mestra."', cb: 'close' }
  ]
};

function renderGuildHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-GUILD] renderGuildHub (PADRAO_TAVERNA) party=' + (data.party_count || 0) + '/' + (data.party_max || 3) + ' services=' + (data.services ? data.services.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = _gldEl('div', 'gld-hub');

  /* === 1. Cenario canonical === */
  var cenarioEl = _gldEl('div', 'cenario');
  var bg = _gldEl('img', 'cenario-bg');
  bg.src = '../shared/img/guilda/guilda-banner.png';
  bg.alt = '';
  bg.loading = 'lazy';
  bg.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(bg);
  cenarioEl.appendChild(_gldEl('div', 'candle-glow l'));
  cenarioEl.appendChild(_gldEl('div', 'candle-glow r'));
  var crest = _gldEl('img', 'cenario-brasao');
  crest.src = '../shared/img/guilda/guilda-crest.png';
  crest.alt = 'Brasão da Guilda';
  crest.loading = 'lazy';
  crest.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(crest);
  var titulo = _gldEl('div', 'cenario-titulo');
  titulo.appendChild(_gldEl('div', 'name', 'Guilda dos Aventureiros'));
  titulo.appendChild(_gldEl('div', 'sub', 'Salão de Mestra Tavira · Coração de Eldoria'));
  cenarioEl.appendChild(titulo);
  root.appendChild(cenarioEl);

  /* === 2. Body container === */
  var body = _gldEl('div', 'gld-body');
  body.style.cssText = 'padding:8px 12px 0;display:flex;flex-direction:column;gap:7px;';

  /* === 2a. NPC row (Tavira main entry) === */
  var npcRow = _gldEl('div', 'row-npc');
  var portraitWrap = _gldEl('div', 'npc-portrait');
  var img = _gldEl('img');
  img.src = '../shared/img/npcs/mestra-tavira.png';
  img.alt = 'Mestra Tavira';
  img.loading = 'lazy';
  img.onerror = function(){ this.style.display = 'none'; };
  portraitWrap.appendChild(img);
  npcRow.appendChild(portraitWrap);
  var info = _gldEl('div', 'npc-info');
  info.appendChild(_gldEl('div', 'name', 'Mestra Tavira'));
  var vagasMsg = '';
  var vagas = Math.max(0, (data.party_max || 3) - (data.party_count || 0));
  if (vagas > 0) {
    vagasMsg = '"Teu grupo ainda tem ' + vagas + ' vaga' + (vagas !== 1 ? 's' : '') + '."';
  } else {
    vagasMsg = '"Teu grupo está completo — ' + (data.party_count || 0) + ' de ' + (data.party_max || 3) + '."';
  }
  info.appendChild(_gldEl('div', 'quote', vagasMsg));
  npcRow.appendChild(info);
  npcRow.appendChild(_gldEl('div', 'npc-chev', '›'));
  npcRow.addEventListener('click', function(){
    if (typeof window.vEncounter === 'object' && window.vEncounter.render) {
      window._SVC_CONFIG = window._SVC_CONFIG_GUILD;
      window.vEncounter.render(TAVIRA_DIALOGUE);
    }
  });
  body.appendChild(npcRow);

  /* === 2b. Reputation bar canonical === */
  var renown = 0;
  if (data.renown && typeof data.renown.guild === 'number') renown = data.renown.guild;
  else if (window._PLAYER_RENOWN && typeof window._PLAYER_RENOWN.guild === 'number') renown = window._PLAYER_RENOWN.guild;
  var tier = 'NEUTRO';
  if (renown >= 25) tier = 'AMIGÁVEL';
  else if (renown >= 10) tier = 'CORDIAL';
  else if (renown < 0 && renown >= -10) tier = 'FRIO';
  else if (renown < -10) tier = 'HOSTIL';
  var pct = Math.max(0, Math.min(100, Math.round((renown + 10) / 40 * 100)));
  var repBar = _gldEl('div', 'rep-bar');
  repBar.appendChild(_gldEl('span', 'label', 'Reputação'));
  var track = _gldEl('div', 'bar');
  var fill = _gldEl('div', 'fill');
  fill.style.width = pct + '%';
  track.appendChild(fill);
  repBar.appendChild(track);
  repBar.appendChild(_gldEl('span', 'value', tier + ' · ' + renown));
  body.appendChild(repBar);

  /* === 2c. Fallen ally warning === */
  if (data.fallen_count > 0) {
    var fallenBox = _gldEl('div', 'gld-fallen-warn');
    fallenBox.style.cssText = 'padding:8px 12px;background:rgba(180,40,40,0.15);border-left:3px solid #b42828;border-radius:4px;color:#e8b08c;font-size:12px;';
    fallenBox.textContent = '⚠ ' + data.fallen_count + ' aliado(s) caído(s) em teu grupo';
    body.appendChild(fallenBox);
  }

  /* === 2d. Status info (party / gold / rotation) === */
  var stats = _gldEl('div', 'gld-stats');
  stats.style.cssText = 'display:flex;justify-content:space-around;padding:6px 0;font-size:12px;color:#a09484;border-top:1px solid rgba(196,149,58,0.15);border-bottom:1px solid rgba(196,149,58,0.15);';
  stats.appendChild(_gldEl('span', '', '👥 Grupo: ' + (data.party_count || 0) + '/' + (data.party_max || 3)));
  var goldSpan = _gldEl('span', '');
  goldSpan.textContent = '🪙 ' + (data.gold || 0) + ' V';
  stats.appendChild(goldSpan);
  if (data.rotation_hours != null) {
    stats.appendChild(_gldEl('span', '', '⏰ ' + data.rotation_hours + 'h'));
  }
  body.appendChild(stats);

  /* === 2e. Section label === */
  var sectionLbl = _gldEl('div', 'pt-section-label');
  sectionLbl.textContent = '⚜ Serviços da Guilda ⚜';
  body.appendChild(sectionLbl);

  /* === 2f. Services grid (.services + .svc canonical) === */
  if (data.services && data.services.length) {
    var grid = _gldEl('div', 'services');
    data.services.forEach(function(svc) {
      var card = _gldEl('div', 'svc');
      if (svc.disabled) card.classList.add('disabled');
      card.setAttribute('data-svc', svc.cb || '');

      var ico = _gldEl('div', 'svc-ico');
      ico.textContent = svc.icon || '▸';
      ico.style.cssText = 'font-size:20px;';
      card.appendChild(ico);

      var txt = _gldEl('div', 'svc-text');
      txt.appendChild(_gldEl('div', 'svc-name', svc.label || ''));
      if (svc.desc) txt.appendChild(_gldEl('div', 'svc-meta', svc.desc));
      card.appendChild(txt);

      if (svc.badge) {
        var badge = _gldEl('div', 'svc-badge', svc.badge);
        card.appendChild(badge);
      }

      if (svc.cb && !svc.disabled) {
        card.addEventListener('click', function() {
          if (typeof doAction === 'function') doAction(svc.cb);
          else if (typeof vCity !== 'undefined' && typeof vCity.act === 'function') vCity.act(svc.cb);
        });
      }
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  /* === 2g. Recruit info (extras) === */
  if (data.recruit_available && data.recruit_available > 0) {
    var rec = _gldEl('div', 'gld-recruit-info');
    rec.style.cssText = 'text-align:center;padding:6px;color:#c4953a;font-size:11px;font-style:italic;';
    rec.textContent = '⚔ ' + data.recruit_available + ' aventureiro(s) disponível(eis) hoje';
    body.appendChild(rec);
  }

  root.appendChild(body);
  container.appendChild(root);
}

/* ============================================================
 * ADVENTURER DETAIL — V1 Retrato principal (2026-04-11)
 * Shows full NPC sheet with cenario scene, stats grid, HP/MP bars,
 * spells list, lore, and hire CTA. Uses DOM methods only, no
 * innerHTML. Money always via .vi.vi-coin.
 * ============================================================ */
function _gldClassSlug(cls) {
  if (!cls) return 'generic';
  var map = {
    'Guerreiro': 'guerreiro', 'Ladrão': 'ladrao', 'Ladino': 'ladrao',
    'Mago': 'mago', 'Clérigo': 'clerigo', 'Clerigo': 'clerigo',
    'Bárbaro': 'barbaro', 'Ranger': 'ranger', 'Feiticeiro': 'feiticeiro',
    'Bruxo': 'bruxo', 'Paladino': 'paladino', 'Monge': 'monge',
    'Bardo': 'bardo', 'Druida': 'druida'
  };
  return map[cls] || 'generic';
}

function renderGuildAdventurer(container, data) {
  if (!container || !data) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = _gldEl('div', 'gld-adv-v1');

  /* Cena principal: avatar (left) + text block (right) — horizontal compact */
  var cenario = _gldEl('div', 'gld-adv-cenario');
  var av = _gldEl('div', 'gld-adv-avatar ' + _gldClassSlug(data.class_name));
  av.innerHTML = data.class_icon || '⚔';
  cenario.appendChild(av);
  var cenarioTexto = _gldEl('div', 'gld-adv-cenario-texto');
  cenarioTexto.appendChild(_gldEl('div', 'gld-adv-name', data.name || ''));
  cenarioTexto.appendChild(_gldEl('div', 'gld-adv-cls', '✧ ' + (data.class_name || '') + ' ✧'));
  var chips = _gldEl('div', 'gld-adv-chips');
  chips.appendChild(_gldEl('span', 'gld-adv-chip', 'Nv. ' + (data.level || 1)));
  if (data.race) chips.appendChild(_gldEl('span', 'gld-adv-chip', data.race));
  cenarioTexto.appendChild(chips);
  cenario.appendChild(cenarioTexto);
  root.appendChild(cenario);

  /* Content body */
  var body = _gldEl('div', 'gld-adv-content');

  /* Attributes grid 3x2 */
  body.appendChild(_gldEl('div', 'gld-adv-section-title', 'Atributos'));
  var statsGrid = _gldEl('div', 'gld-adv-stats-grid');
  (data.attrs || []).forEach(function (a) {
    var stat = _gldEl('div', 'gld-adv-stat');
    stat.appendChild(_gldEl('div', 'gld-adv-stat-name', a.name));
    stat.appendChild(_gldEl('div', 'gld-adv-stat-val', String(a.val)));
    var modText = (a.mod >= 0 ? '+' : '') + a.mod;
    stat.appendChild(_gldEl('div', 'gld-adv-stat-mod', modText));
    statsGrid.appendChild(stat);
  });
  body.appendChild(statsGrid);

  /* HP/MP bars */
  var bars = _gldEl('div', 'gld-adv-bars');
  var hpMax = data.max_hp || 0;
  var mpMax = data.max_mp || 0;
  var hpRow = _gldEl('div', 'gld-adv-bar-row');
  hpRow.appendChild(_gldEl('span', 'gld-adv-bar-lbl', 'HP'));
  var hpTrack = _gldEl('div', 'gld-adv-bar-track');
  var hpFill = _gldEl('div', 'gld-adv-bar-fill hp');
  hpFill.style.width = '100%';
  hpTrack.appendChild(hpFill);
  hpRow.appendChild(hpTrack);
  hpRow.appendChild(_gldEl('span', 'gld-adv-bar-val', hpMax + ' / ' + hpMax));
  bars.appendChild(hpRow);

  if (mpMax > 0) {
    var mpRow = _gldEl('div', 'gld-adv-bar-row');
    mpRow.appendChild(_gldEl('span', 'gld-adv-bar-lbl', 'MP'));
    var mpTrack = _gldEl('div', 'gld-adv-bar-track');
    var mpFill = _gldEl('div', 'gld-adv-bar-fill mp');
    mpFill.style.width = '100%';
    mpTrack.appendChild(mpFill);
    mpRow.appendChild(mpTrack);
    mpRow.appendChild(_gldEl('span', 'gld-adv-bar-val', mpMax + ' / ' + mpMax));
    bars.appendChild(mpRow);
  }
  body.appendChild(bars);

  /* Spells list */
  if (data.spells && data.spells.length > 0) {
    body.appendChild(_gldEl('div', 'gld-adv-section-title', 'Magias Conhecidas'));
    var spellList = _gldEl('div', 'gld-adv-spells');
    data.spells.forEach(function (s) {
      var spell = _gldEl('div', 'gld-adv-spell');
      spell.appendChild(_gldEl('span', 'gld-adv-spell-ic', '◆'));
      spell.appendChild(_gldEl('span', 'gld-adv-spell-name', s));
      spellList.appendChild(spell);
    });
    body.appendChild(spellList);
  }

  /* Lore */
  if (data.lore) {
    body.appendChild(_gldEl('div', 'gld-adv-section-title', 'História'));
    body.appendChild(_gldEl('div', 'gld-adv-lore', '"' + data.lore + '"'));
  }

  root.appendChild(body);

  /* CTA */
  var cta = _gldEl('div', 'gld-adv-cta');
  var priceRow = _gldEl('div', 'gld-adv-price-row');
  priceRow.appendChild(_gldEl('span', 'gld-adv-price-lbl', 'Custo de Contratação'));
  var priceVal = _gldEl('span', 'gld-adv-price-val');
  priceVal.appendChild(_gldEl('span', 'vi vi-coin lg'));
  priceVal.appendChild(document.createTextNode(' ' + (data.cost || 0)));
  priceRow.appendChild(priceVal);
  cta.appendChild(priceRow);

  var btn = _gldEl('button', 'gld-adv-btn');
  if (data.party_full) {
    btn.textContent = '🚫 Grupo Completo (3/3)';
    btn.disabled = true;
    btn.classList.add('disabled');
  } else if (!data.can_afford) {
    btn.textContent = 'Valdoritas Insuficientes';
    btn.disabled = true;
    btn.classList.add('disabled');
  } else {
    btn.textContent = '◆ Contratar ' + (data.name || '').split(' ')[0];
    btn.addEventListener('click', function () {
      if (typeof doAction === 'function' && data.confirm_cb) doAction(data.confirm_cb);
    });
  }
  cta.appendChild(btn);
  root.appendChild(cta);

  container.appendChild(root);
}

/* ============================================================
 * HIRE CONFIRM — V2 Quick Confirm (2026-04-11)
 * Minimal modal focused on the decision with before/after balance.
 * ============================================================ */
function renderGuildHireConfirm(container, data) {
  if (!container || !data) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = _gldEl('div', 'gld-confirm-v2');
  var card = _gldEl('div', 'gld-confirm-card');

  var iconEl = _gldEl('div', 'gld-confirm-icon');
  iconEl.innerHTML = data.class_icon || '⚔';
  card.appendChild(iconEl);

  card.appendChild(_gldEl('div', 'gld-confirm-q', 'Contratar?'));

  var tgtEl = _gldEl('div', 'gld-confirm-target');
  tgtEl.appendChild(document.createTextNode('Você deseja contratar '));
  var nameB = _gldEl('b', null, data.name || '');
  tgtEl.appendChild(nameB);
  tgtEl.appendChild(document.createTextNode(
    ', ' + (data.class_name || '') + ' ' + (data.race || '') + ' de Nível ' + (data.level || 1) + '?'
  ));
  card.appendChild(tgtEl);

  var balance = _gldEl('div', 'gld-confirm-balance');
  function _mkRow(lbl, val, cls) {
    var row = _gldEl('div', 'gld-confirm-row');
    row.appendChild(_gldEl('span', 'gld-confirm-row-lbl', lbl));
    var vEl = _gldEl('span', 'gld-confirm-row-val' + (cls ? ' ' + cls : ''));
    if (typeof val === 'function') { val(vEl); } else { vEl.textContent = val; }
    row.appendChild(vEl);
    return row;
  }
  balance.appendChild(_mkRow('Saldo atual', function (el) {
    el.appendChild(_gldEl('span', 'vi vi-coin sm'));
    el.appendChild(document.createTextNode(' ' + (data.player_gold || 0)));
  }));
  balance.appendChild(_mkRow('Custo', function (el) {
    el.appendChild(document.createTextNode('− '));
    el.appendChild(_gldEl('span', 'vi vi-coin sm'));
    el.appendChild(document.createTextNode(' ' + (data.cost || 0)));
  }, 'cost'));
  balance.appendChild(_gldEl('div', 'gld-confirm-divider'));
  balance.appendChild(_mkRow('Após contratar', function (el) {
    el.appendChild(_gldEl('span', 'vi vi-coin sm'));
    el.appendChild(document.createTextNode(' ' + (data.after_gold || 0)));
  }, 'after'));
  card.appendChild(balance);

  var btns = _gldEl('div', 'gld-confirm-btns');
  var btnNo = _gldEl('button', 'gld-confirm-btn gld-confirm-btn-no', 'Cancelar');
  btnNo.addEventListener('click', function () {
    if (typeof doAction === 'function' && data.cancel_cb) doAction(data.cancel_cb);
  });
  var btnYes = _gldEl('button', 'gld-confirm-btn gld-confirm-btn-yes', 'Confirmar');
  btnYes.addEventListener('click', function () {
    if (typeof doAction === 'function' && data.hire_cb) doAction(data.hire_cb);
  });
  btns.appendChild(btnNo);
  btns.appendChild(btnYes);
  card.appendChild(btns);

  root.appendChild(card);
  container.appendChild(root);
}

/* ============================================================
 * HIRE SUCCESS — V2 NPC Welcome (2026-04-11)
 * Celebratory scene with Sia waving, speech bubble, transaction
 * summary, and two dialogue choices.
 * ============================================================ */
function renderGuildHireSuccess(container, data) {
  if (!container || !data) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = _gldEl('div', 'gld-success-v2');

  /* Scene: confetti + NPC + wave (horizontal compact layout) */
  var scene = _gldEl('div', 'gld-success-scene');
  scene.appendChild(_gldEl('div', 'gld-success-confetti'));
  var avWrap = _gldEl('div', 'gld-success-av-wrap');
  var av = _gldEl('div', 'gld-success-avatar ' + _gldClassSlug(data.class_name));
  av.innerHTML = data.class_icon || '⚔';
  avWrap.appendChild(av);
  avWrap.appendChild(_gldEl('span', 'gld-success-wave', '👋'));
  scene.appendChild(avWrap);
  var headerText = _gldEl('div', 'gld-success-header-text');
  headerText.appendChild(_gldEl('div', 'gld-success-title', '✓ Novo Aliado'));
  headerText.appendChild(_gldEl('div', 'gld-success-name', data.name || ''));
  headerText.appendChild(_gldEl('div', 'gld-success-sub', (data.class_name || '') + ' • ' + (data.race || '') + ' • Nv ' + (data.level || 1)));
  scene.appendChild(headerText);
  root.appendChild(scene);

  /* Content */
  var content = _gldEl('div', 'gld-success-content');

  /* Speech bubble with player_name bold */
  var speech = _gldEl('div', 'gld-success-speech');
  var speechText = _gldEl('div', 'gld-success-speech-text');
  var quote = data.welcome_quote || '';
  /* Inject bold player name if present in quote */
  var playerName = data.player_name || '';
  if (playerName && quote.indexOf(playerName) !== -1) {
    var parts = quote.split(playerName);
    speechText.appendChild(document.createTextNode(parts[0]));
    var b = _gldEl('b', null, playerName);
    speechText.appendChild(b);
    for (var i = 1; i < parts.length; i++) {
      speechText.appendChild(document.createTextNode(parts[i]));
    }
  } else {
    speechText.textContent = quote;
  }
  speech.appendChild(speechText);
  content.appendChild(speech);

  /* Transaction summary */
  var tx = _gldEl('div', 'gld-success-tx');
  tx.appendChild(_gldEl('div', 'gld-success-tx-hd', 'Resumo da Contratação'));

  function _sucRow(lbl, valBuilder, cls) {
    var row = _gldEl('div', 'gld-success-tx-row');
    row.appendChild(_gldEl('span', 'gld-success-tx-lbl', lbl));
    var vEl = _gldEl('span', 'gld-success-tx-val' + (cls ? ' ' + cls : ''));
    valBuilder(vEl);
    row.appendChild(vEl);
    return row;
  }
  tx.appendChild(_sucRow('Aliado contratado', function (el) {
    el.textContent = data.name || '';
  }));
  tx.appendChild(_sucRow('Custo', function (el) {
    el.appendChild(document.createTextNode('− '));
    el.appendChild(_gldEl('span', 'vi vi-coin sm'));
    el.appendChild(document.createTextNode(' ' + (data.cost || 0)));
  }, 'loss'));
  tx.appendChild(_sucRow('Saldo atual', function (el) {
    el.appendChild(_gldEl('span', 'vi vi-coin sm'));
    el.appendChild(document.createTextNode(' ' + (data.player_gold_after || 0)));
  }));
  tx.appendChild(_sucRow('Grupo', function (el) {
    el.textContent = (data.party_count || 0) + ' / ' + (data.party_max || 3);
  }));
  content.appendChild(tx);

  /* Dialogue choices */
  var choices = _gldEl('div', 'gld-success-choices');
  var continueBtn = _gldEl('button', 'gld-success-choice');
  continueBtn.textContent = data.party_count < data.party_max
    ? 'Continuar no quadro de aventureiros'
    : 'Ver meu grupo';
  continueBtn.addEventListener('click', function () {
    if (typeof doAction === 'function' && data.continue_cb) doAction(data.continue_cb);
  });
  choices.appendChild(continueBtn);

  var closeBtn = _gldEl('button', 'gld-success-choice');
  closeBtn.textContent = 'Voltar à Guilda';
  closeBtn.addEventListener('click', function () {
    if (typeof doAction === 'function' && data.close_cb) doAction(data.close_cb);
  });
  choices.appendChild(closeBtn);

  content.appendChild(choices);
  root.appendChild(content);
  container.appendChild(root);
}

/* game-guild.js — Guild popup renderer
 *
 * V4 NPC Dialog redesign (2026-04-11):
 * Hero NPC scene (Tavira, a Mestra) with speech bubble + dialogue
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
  if (text != null) el.textContent = text;
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

function renderGuildHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-GUILD] renderGuildHub party=' + (data.party_count || 0) + '/' + (data.party_max || 3) + ' services=' + (data.services ? data.services.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = _gldEl('div', 'gld-hub gld-hub-v4');

  /* ===== SCENE: NPC portrait + name ===== */
  var scene = _gldEl('div', 'gld-scene');
  scene.appendChild(_gldEl('div', 'gld-scene-banner', '✦ Salão dos Aventureiros ✦'));
  var npcAv = _gldEl('div', 'gld-npc-avatar');
  npcAv.textContent = '🧙‍♀️';
  scene.appendChild(npcAv);
  scene.appendChild(_gldEl('div', 'gld-npc-name', 'Tavira, a Mestra'));
  scene.appendChild(_gldEl('div', 'gld-npc-title', 'Guardiã da Guilda'));
  root.appendChild(scene);

  /* ===== DIALOGUE AREA ===== */
  var dlg = _gldEl('div', 'gld-dlg');

  /* Speech bubble */
  var speech = _gldEl('div', 'gld-dlg-speech');
  var speechText = _gldEl('div', 'gld-dlg-text');
  var speechContent = _gldSpeech(
    data.party_count || 0,
    data.party_max || 3,
    data.recruit_available || 0,
    data.rotation_hours || 12
  );
  speechText.textContent = speechContent;
  speech.appendChild(speechText);
  dlg.appendChild(speech);

  /* Show fallen ally warning if any */
  if (data.fallen_count > 0) {
    var fallenBox = _gldEl('div', 'gld-fallen-warn');
    fallenBox.textContent = '⚠ ' + data.fallen_count + ' aliado(s) caído(s) em teu grupo';
    dlg.appendChild(fallenBox);
  }

  /* Dialogue choices (from services list) */
  var choices = _gldEl('div', 'gld-choices');
  if (data.services && data.services.length) {
    data.services.forEach(function (svc) {
      var choice = _gldEl('button', 'gld-choice');
      choice.setAttribute('data-cb', svc.cb || '');
      choice.addEventListener('click', function () {
        if (typeof doAction === 'function' && svc.cb) doAction(svc.cb);
      });
      choice.appendChild(_gldEl('span', 'gld-choice-ic', svc.icon || '▸'));
      var txt = _gldEl('div', 'gld-choice-text');
      txt.appendChild(_gldEl('div', 'gld-choice-lbl', svc.label || ''));
      if (svc.desc) txt.appendChild(_gldEl('div', 'gld-choice-desc', svc.desc));
      choice.appendChild(txt);
      if (svc.badge) {
        var badge = _gldEl('span', 'gld-choice-badge', svc.badge);
        choice.appendChild(badge);
      }
      choices.appendChild(choice);
    });
  }
  dlg.appendChild(choices);
  root.appendChild(dlg);

  /* ===== STATUS BAR (bottom): Party / Gold / Rotation ===== */
  var statusBar = _gldEl('div', 'gld-status-bar');

  var statusParty = _gldEl('div', 'gld-status-item');
  statusParty.appendChild(_gldEl('div', 'gld-status-lbl', 'Grupo'));
  statusParty.appendChild(_gldEl('div', 'gld-status-val', (data.party_count || 0) + ' / ' + (data.party_max || 3)));
  statusBar.appendChild(statusParty);

  var statusGold = _gldEl('div', 'gld-status-item');
  statusGold.appendChild(_gldEl('div', 'gld-status-lbl', 'Valdoritas'));
  var goldVal = _gldEl('div', 'gld-status-val gld-status-gold');
  /* V-coin icon + number (NEVER money-bag emoji) */
  var coin = _gldEl('span', 'vi vi-coin sm');
  goldVal.appendChild(coin);
  goldVal.appendChild(document.createTextNode(' ' + (data.gold || 0)));
  statusGold.appendChild(goldVal);
  statusBar.appendChild(statusGold);

  if (data.rotation_hours != null) {
    var statusRot = _gldEl('div', 'gld-status-item');
    statusRot.appendChild(_gldEl('div', 'gld-status-lbl', 'Rotação'));
    statusRot.appendChild(_gldEl('div', 'gld-status-val', data.rotation_hours + 'h'));
    statusBar.appendChild(statusRot);
  }

  root.appendChild(statusBar);

  container.appendChild(root);
}

/* ============================================================
 * ADVENTURER DETAIL — V1 Hero Portrait (2026-04-11)
 * Shows full NPC sheet with hero scene, stats grid, HP/MP bars,
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

  /* Hero scene: avatar + name + class + chips */
  var hero = _gldEl('div', 'gld-adv-hero');
  var av = _gldEl('div', 'gld-adv-avatar ' + _gldClassSlug(data.class_name));
  av.textContent = data.class_icon || '⚔';
  hero.appendChild(av);
  hero.appendChild(_gldEl('div', 'gld-adv-name', data.name || ''));
  hero.appendChild(_gldEl('div', 'gld-adv-cls', '✧ ' + (data.class_name || '') + ' ✧'));
  var chips = _gldEl('div', 'gld-adv-chips');
  chips.appendChild(_gldEl('span', 'gld-adv-chip', 'Nv. ' + (data.level || 1)));
  if (data.race) chips.appendChild(_gldEl('span', 'gld-adv-chip', data.race));
  hero.appendChild(chips);
  root.appendChild(hero);

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
  iconEl.textContent = data.class_icon || '⚔';
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

  /* Scene: confetti + NPC + wave */
  var scene = _gldEl('div', 'gld-success-scene');
  scene.appendChild(_gldEl('div', 'gld-success-confetti'));
  var avWrap = _gldEl('div', 'gld-success-av-wrap');
  var av = _gldEl('div', 'gld-success-avatar ' + _gldClassSlug(data.class_name));
  av.textContent = data.class_icon || '⚔';
  avWrap.appendChild(av);
  avWrap.appendChild(_gldEl('span', 'gld-success-wave', '👋'));
  scene.appendChild(avWrap);
  scene.appendChild(_gldEl('div', 'gld-success-name', data.name || ''));
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

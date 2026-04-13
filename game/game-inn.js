/* game-inn.js — Inn redesign renderer (structured data -> DOM) */
/* Renders all inn screen types: hub, confirm, select, meal, result, relax */
/* All DOM creation via createElement/textContent — no innerHTML with variables */

'use strict';

/**
 * Main entry point called by game-popup-unified.js.
 * Dispatches to the correct renderer based on data.type.
 * @param {HTMLElement} container - popup body element
 * @param {Object} data - _inn_screen data from backend
 */
function renderInnConfirm(container, data) {
  if (!container || !data) return;
  console.info('[INN] render type=%s', data.type || 'confirm');
  /* Reset container (trusted backend data only) */
  container.textContent = ''; /* noqa: preflight */

  switch (data.type) {
    case 'hub':     return _renderHub(container, data);
    case 'confirm': return _renderConfirm(container, data);
    case 'select':  return _renderSelect(container, data);
    case 'meal':    return _renderMeal(container, data);
    case 'result':  return _renderResult(container, data);
    case 'relax':   return _renderRelax(container, data);
    default:        return _renderConfirm(container, data);
  }
}

/* ================================================================
   TYPE: hub — Main inn menu
   ================================================================ */
function _renderHub(ct, d) {
  var root = _el('div', 'inn-hub');

  /* Header: inn name + time */
  var hdr = _el('div', 'inn-hub-header');
  var title = _el('div', 'inn-hub-title');
  title.textContent = d.inn_name || 'Estalagem';
  hdr.appendChild(title);
  if (d.time_label) {
    var time = _el('div', 'inn-hub-time');
    time.textContent = d.time_label;
    hdr.appendChild(time);
  }
  root.appendChild(hdr);

  /* Martha NPC banner (clickable, no face emoji) */
  if (d.npc) {
    root.appendChild(_buildNpcBanner(d.npc));
  }

  /* Player block with HP/MP/exhaustion */
  if (d.player) {
    root.appendChild(_buildPlayerBlock(d.player));
  }

  /* Room grid */
  if (d.rooms && d.rooms.length) {
    var roomSec = _el('div', 'inn-section');
    var roomLbl = _el('div', 'inn-section-label');
    roomLbl.textContent = 'Acomodacao';
    roomSec.appendChild(roomLbl);
    roomSec.appendChild(_buildRoomGrid(d.rooms, d.has_allies));
    root.appendChild(roomSec);
  }

  /* Quest buttons */
  if (d.quest_buttons && d.quest_buttons.length) {
    root.appendChild(_buildActionList(d.quest_buttons));
  }

  /* Wandering NPCs */
  if (d.wandering_npcs && d.wandering_npcs.length) {
    root.appendChild(_buildActionList(d.wandering_npcs));
  }

  /* Quick actions grid (meal, relax, short rest, cellar) */
  if (d.quick_actions && d.quick_actions.length) {
    root.appendChild(_buildQuickActions(d.quick_actions));
  }

  ct.appendChild(root);
}

/* NPC banner */
function _buildNpcBanner(npc) {
  var banner = _el('div', 'inn-npc-banner');
  if (npc.cb) {
    banner.classList.add('clickable');
    banner.addEventListener('click', function () { _act(npc.cb); });
  }

  var left = _el('div', 'inn-npc-left');
  var nameRow = _el('div', 'inn-npc-name');
  nameRow.textContent = npc.name || '';
  left.appendChild(nameRow);

  if (npc.mood) {
    var mood = _el('div', 'inn-npc-mood');
    mood.textContent = npc.mood;
    left.appendChild(mood);
  }

  if (npc.greeting) {
    var greet = _el('div', 'inn-npc-greeting');
    greet.textContent = npc.greeting;
    left.appendChild(greet);
  }
  banner.appendChild(left);

  if (npc.cb) {
    var arrow = _el('div', 'inn-npc-arrow');
    arrow.textContent = '\u25B8';
    banner.appendChild(arrow);
  }

  return banner;
}

/* Room grid (3 columns) */
function _buildRoomGrid(rooms, hasAllies) {
  var grid = _el('div', 'inn-room-grid');

  for (var i = 0; i < rooms.length; i++) {
    (function (room) {
      var tile = _el('div', 'inn-room-tile');
      if (room.selected) tile.classList.add('selected');

      var ico = _el('div', 'inn-room-tile-icon');
      ico.textContent = room.icon || '';
      tile.appendChild(ico);

      var name = _el('div', 'inn-room-tile-name');
      name.textContent = room.name || '';
      tile.appendChild(name);

      var price = _el('div', 'inn-room-tile-price');
      if (room.cost === 0) {
        price.textContent = 'Gratis';
        price.classList.add('free');
      } else {
        price.textContent = String(room.cost) + ' ';
        price.appendChild(_coin('sm'));
      }
      tile.appendChild(price);

      tile.addEventListener('click', function () {
        if (hasAllies && room.cb_group) {
          _showRoomChoice(tile, room);
        } else if (room.cb_solo) {
          _act(room.cb_solo);
        }
      });

      grid.appendChild(tile);
    })(rooms[i]);
  }
  return grid;
}

/* Inline solo/group choice for room */
function _showRoomChoice(tile, room) {
  /* Remove any existing choice overlay */
  var existing = tile.querySelector('.inn-room-choice');
  if (existing) { existing.remove(); return; }

  var overlay = _el('div', 'inn-room-choice');

  var solo = _el('button', 'inn-room-choice-btn');
  solo.textContent = 'So eu';
  solo.addEventListener('click', function (e) {
    e.stopPropagation();
    _act(room.cb_solo);
  });
  overlay.appendChild(solo);

  var group = _el('button', 'inn-room-choice-btn');
  group.textContent = 'Grupo';
  group.addEventListener('click', function (e) {
    e.stopPropagation();
    _act(room.cb_group);
  });
  overlay.appendChild(group);

  tile.appendChild(overlay);
}

/* Quick actions (4-col grid) */
function _buildQuickActions(actions) {
  var grid = _el('div', 'inn-quick-grid');
  for (var i = 0; i < actions.length; i++) {
    (function (a) {
      var btn = _el('button', 'inn-quick-btn');
      var ico = _el('div', 'inn-quick-ico');
      ico.textContent = a.icon || '';
      btn.appendChild(ico);
      var lbl = _el('div', 'inn-quick-label');
      lbl.textContent = a.label || '';
      btn.appendChild(lbl);
      btn.addEventListener('click', function () { _act(a.cb); });
      grid.appendChild(btn);
    })(actions[i]);
  }
  return grid;
}

/* Generic action button list (quests, wandering NPCs) */
function _buildActionList(items) {
  var wrap = _el('div', 'inn-action-list');
  for (var i = 0; i < items.length; i++) {
    (function (item) {
      var btn = _el('button', 'inn-action-btn');
      if (item.icon) {
        var ico = _el('span', 'inn-action-ico');
        ico.textContent = item.icon;
        btn.appendChild(ico);
      }
      var txt = document.createTextNode(item.label || item.text || '');
      btn.appendChild(txt);
      btn.addEventListener('click', function () { _act(item.cb); });
      wrap.appendChild(btn);
    })(items[i]);
  }
  return wrap;
}

/* ================================================================
   TYPE: confirm — Rest confirmation (all 3 tiers)
   ================================================================ */
function _renderConfirm(ct, d) {
  var root = _el('div', 'inn-confirm');

  /* Room Header */
  root.appendChild(_buildRoomHeader(d));

  /* Benefits */
  if (d.benefits && d.benefits.length) {
    root.appendChild(_buildBenefits(d.benefits));
  }

  /* Warning (stable risks) */
  if (d.warning) {
    var warn = _el('div', 'inn-warning');
    warn.textContent = d.warning;
    root.appendChild(warn);
  }

  /* Player Status */
  if (d.player) {
    var slbl = _el('div', 'inn-section-label');
    slbl.textContent = 'Seu estado atual';
    root.appendChild(slbl);
    root.appendChild(_buildPlayerBlock(d.player));
  }

  /* Allies */
  if (d.allies && d.allies.length) {
    root.appendChild(_buildAllySection(d));
  }

  /* Cost Footer */
  root.appendChild(_buildCostFooter(d));

  /* CTA Button */
  root.appendChild(_buildCTA(d));

  ct.appendChild(root);
}

/* ================================================================
   TYPE: select — Member selection for group rest
   ================================================================ */
function _renderSelect(ct, d) {
  var root = _el('div', 'inn-select');

  /* Tier header */
  if (d.tier_name) {
    var hdr = _el('div', 'inn-select-header');
    if (d.tier_icon) {
      var ico = _el('span', 'inn-select-icon');
      ico.textContent = d.tier_icon;
      hdr.appendChild(ico);
    }
    var txt = document.createTextNode(d.tier_name);
    hdr.appendChild(txt);
    root.appendChild(hdr);
  }

  /* Ally toggles */
  if (d.allies && d.allies.length) {
    var list = _el('div', 'inn-select-list');
    for (var i = 0; i < d.allies.length; i++) {
      list.appendChild(_buildSelectAllyRow(d.allies[i]));
    }
    root.appendChild(list);
  }

  /* Cost info */
  if (d.base_cost !== undefined || d.ally_cost !== undefined) {
    var info = _el('div', 'inn-select-cost-info');
    if (d.base_cost !== undefined) {
      var base = _el('div', 'inn-select-cost-row');
      base.textContent = 'Base: ' + d.base_cost + ' ';
      base.appendChild(_coin('sm'));
      info.appendChild(base);
    }
    if (d.ally_cost !== undefined) {
      var ally = _el('div', 'inn-select-cost-row');
      ally.textContent = 'Por aliado: +' + d.ally_cost + ' ';
      ally.appendChild(_coin('sm'));
      info.appendChild(ally);
    }
    root.appendChild(info);
  }

  /* Gold balance */
  if (d.gold !== undefined) {
    root.appendChild(_buildGoldBalance(d.gold));
  }

  /* Cost footer + CTA */
  root.appendChild(_buildCostFooter(d));
  root.appendChild(_buildCTA(d));

  ct.appendChild(root);
}

/* Select ally row with toggle */
function _buildSelectAllyRow(a) {
  var row = _el('div', 'inn-select-ally' + (a.selected ? ' on' : ''));

  var chk = _el('div', 'inn-ally-check');
  chk.textContent = a.selected ? '\u2713' : '';
  row.appendChild(chk);

  var ico = _el('div', 'inn-ally-ico');
  ico.textContent = a.icon || '\u2694\uFE0F';
  row.appendChild(ico);

  var info = _el('div', 'inn-select-ally-info');
  var nameEl = _el('div', 'inn-ally-name');
  nameEl.textContent = a.name || '';
  info.appendChild(nameEl);

  /* Mini HP/MP bars */
  var bars = _el('div', 'inn-ally-bars');
  bars.appendChild(_buildMiniBar('HP', 'hp', a.hp, a.max_hp));
  bars.appendChild(_buildMiniBar('MP', 'mp', a.mp, a.max_mp));
  info.appendChild(bars);

  row.appendChild(info);

  /* Toggle callback */
  if (a.toggle_cb) {
    row.addEventListener('click', function () { _act(a.toggle_cb); });
  }

  return row;
}

/* ================================================================
   TYPE: meal — Meal menu
   ================================================================ */
function _renderMeal(ct, d) {
  var root = _el('div', 'inn-meal');

  /* Header */
  var hdr = _el('div', 'inn-meal-header');
  hdr.textContent = d.title || 'Cardapio do Dia';
  root.appendChild(hdr);

  /* Meal cards */
  if (d.meals && d.meals.length) {
    var cards = _el('div', 'inn-meal-cards');
    for (var i = 0; i < d.meals.length; i++) {
      cards.appendChild(_buildMealCard(d.meals[i]));
    }
    root.appendChild(cards);
  }

  /* Gold balance */
  if (d.gold !== undefined) {
    root.appendChild(_buildGoldBalance(d.gold));
  }

  /* Reputation bonus */
  if (d.rep_bonus) {
    var rep = _el('div', 'inn-meal-rep');
    rep.textContent = d.rep_bonus;
    root.appendChild(rep);
  }

  ct.appendChild(root);
}

/* Single meal card */
function _buildMealCard(m) {
  var card = _el('div', 'inn-meal-card');
  if (m.cb) {
    card.classList.add('clickable');
    card.addEventListener('click', function () { _act(m.cb); });
  }

  var top = _el('div', 'inn-meal-card-top');
  var ico = _el('div', 'inn-meal-card-icon');
  ico.textContent = m.icon || '';
  top.appendChild(ico);

  var info = _el('div', 'inn-meal-card-info');
  var name = _el('div', 'inn-meal-card-name');
  name.textContent = m.name || '';
  info.appendChild(name);

  if (m.desc) {
    var desc = _el('div', 'inn-meal-card-desc');
    desc.textContent = m.desc;
    info.appendChild(desc);
  }
  top.appendChild(info);
  card.appendChild(top);

  /* Bonuses */
  if (m.bonuses && m.bonuses.length) {
    var bonuses = _el('div', 'inn-meal-card-bonuses');
    for (var i = 0; i < m.bonuses.length; i++) {
      var b = _el('span', 'inn-meal-bonus');
      b.textContent = m.bonuses[i];
      bonuses.appendChild(b);
    }
    card.appendChild(bonuses);
  }

  /* Price */
  var price = _el('div', 'inn-meal-card-price');
  if (m.cost === 0) {
    price.textContent = 'Gratis';
    price.classList.add('free');
  } else {
    price.textContent = String(m.cost) + ' ';
    price.appendChild(_coin('sm'));
  }
  card.appendChild(price);

  return card;
}

/* ================================================================
   TYPE: result — Generic result screen
   ================================================================ */
function _renderResult(ct, d) {
  var restType = d.rest_type || (d.title || 'result');
  console.info('[INN] rest_complete type=%s', restType);
  var root = _el('div', 'inn-result');

  /* Icon + Title */
  var hdr = _el('div', 'inn-result-header');
  if (d.icon) {
    var ico = _el('div', 'inn-result-icon');
    ico.textContent = d.icon;
    hdr.appendChild(ico);
  }
  var title = _el('div', 'inn-result-title');
  title.textContent = d.title || '';
  hdr.appendChild(title);
  root.appendChild(hdr);

  /* Narrative message (backend sends HTML formatting) */
  if (d.message) {
    var msg = _el('div', 'inn-result-msg');
    msg.innerHTML = d.message;
    root.appendChild(msg);
  }

  /* Effects list */
  if (d.effects && d.effects.length) {
    var efx = _el('div', 'inn-result-effects');
    for (var i = 0; i < d.effects.length; i++) {
      var e = d.effects[i];
      var row = _el('div', 'inn-result-effect');
      var isGood = e.good || e.icon === '\u2713' || e.icon === '\u2728' || e.icon === '\uD83D\uDE0C';
      var sym = _el('span', 'inn-result-sym ' + (isGood ? 'good' : 'bad'));
      sym.textContent = e.icon || (isGood ? '\u2713' : '\u26A0\uFE0F');
      row.appendChild(sym);
      var txt = _el('span', '');
      txt.textContent = e.text || '';
      row.appendChild(txt);
      efx.appendChild(row);
    }
    root.appendChild(efx);
  }

  /* Player status (optional) */
  if (d.player) {
    root.appendChild(_buildPlayerBlock(d.player));
  }

  /* Back button */
  if (d.back_cb) {
    var btn = _el('button', 'inn-btn-back');
    btn.textContent = '\uD83C\uDFE8 Voltar para Estalagem';
    btn.addEventListener('click', function () { _act(d.back_cb); });
    root.appendChild(btn);
  }

  ct.appendChild(root);
}

/* ================================================================
   TYPE: relax — Relaxation menu
   ================================================================ */
function _renderRelax(ct, d) {
  var root = _el('div', 'inn-relax');

  /* Header */
  var hdr = _el('div', 'inn-relax-header');
  hdr.textContent = d.title || 'Relaxamento';
  root.appendChild(hdr);

  /* Cost */
  if (d.cost !== undefined) {
    var costRow = _el('div', 'inn-relax-cost');
    var costLbl = _el('span', '');
    costLbl.textContent = 'Custo: ' + String(d.cost) + ' ';
    costRow.appendChild(costLbl);
    costRow.appendChild(_coin('sm'));
    root.appendChild(costRow);
  }

  /* Removable conditions */
  if (d.conditions && d.conditions.length) {
    var condSec = _el('div', 'inn-relax-section');
    var condLbl = _el('div', 'inn-section-label');
    condLbl.textContent = 'Condicoes removiveis';
    condSec.appendChild(condLbl);
    var condList = _el('div', 'inn-relax-cond-list');
    for (var i = 0; i < d.conditions.length; i++) {
      var cond = _el('div', 'inn-relax-cond');
      cond.textContent = d.conditions[i];
      condList.appendChild(cond);
    }
    condSec.appendChild(condList);
    root.appendChild(condSec);
  }

  /* Stress indicator */
  if (d.stress !== undefined) {
    var stress = _el('div', 'inn-relax-indicator');
    var stressLbl = _el('span', 'inn-relax-ind-label');
    stressLbl.textContent = 'Estresse: ';
    stress.appendChild(stressLbl);
    var stressVal = _el('span', 'inn-relax-ind-value');
    stressVal.textContent = d.stress;
    stress.appendChild(stressVal);
    root.appendChild(stress);
  }

  /* Exhaustion */
  if (d.exhaustion !== undefined && d.exhaustion > 0) {
    root.appendChild(_buildExhaustion(d.exhaustion));
  }

  /* Gold balance */
  if (d.gold !== undefined) {
    root.appendChild(_buildGoldBalance(d.gold));
  }

  /* Confirm button */
  if (d.confirm_cb) {
    var btn = _el('button', 'inn-btn-rest');
    btn.textContent = '\uD83E\uDDFF Relaxar';
    if (d.cost > 0) {
      btn.textContent = '\uD83E\uDDFF Relaxar \u2014 ' + String(d.cost) + ' ';
      btn.appendChild(_coin());
    }
    btn.addEventListener('click', function () { _act(d.confirm_cb); });
    root.appendChild(btn);
  }

  ct.appendChild(root);
}

/* ================================================================
   SHARED BUILDERS (used by multiple types)
   ================================================================ */

/* Room Header (confirm screen) */
function _buildRoomHeader(d) {
  var hdr = _el('div', 'inn-room-header');

  var ico = _el('div', 'inn-room-icon');
  ico.textContent = d.tier_icon || '';
  hdr.appendChild(ico);

  var info = _el('div', 'inn-room-info');

  var name = _el('div', 'inn-room-name');
  name.textContent = d.tier_name || '';
  info.appendChild(name);

  var price = _el('div', 'inn-room-price' + (d.cost === 0 ? ' free' : ''));
  if (d.cost === 0) {
    price.textContent = d.cost_label || 'Gratis';
  } else {
    price.textContent = String(d.cost) + ' ';
    price.appendChild(_coin('sm'));
  }
  info.appendChild(price);

  hdr.appendChild(info);
  return hdr;
}

/* Benefits list */
function _buildBenefits(benefits) {
  var det = _el('div', 'inn-detail');
  for (var i = 0; i < benefits.length; i++) {
    var b = benefits[i];
    var row = _el('div', 'inn-detail-row');

    var chk = _el('div', 'inn-detail-check ' + (b.check ? 'yes' : 'no'));
    chk.textContent = b.check ? '\u2713' : '\u2014';
    row.appendChild(chk);

    var txt = _el('div', 'inn-detail-text' + (b.check ? '' : ' dim'));
    txt.textContent = b.text;
    row.appendChild(txt);

    det.appendChild(row);
  }
  return det;
}

/* Player block with HP/MP/exhaustion */
function _buildPlayerBlock(p) {
  var block = _el('div', 'inn-player-block');

  var hpPct = p.max_hp > 0 ? (p.hp / p.max_hp * 100) : 0;
  var mpPct = p.max_mp > 0 ? (p.mp / p.max_mp * 100) : 0;
  var hpClass = hpPct > 60 ? 'hp-high' : (hpPct > 25 ? 'hp-mid' : 'hp-low');

  /* Head: name + class */
  var head = _el('div', 'inn-player-head');
  var nameEl = _el('div', 'inn-player-name');
  nameEl.textContent = (p.class_icon || '') + ' ' + (p.name || '');
  head.appendChild(nameEl);
  var clsEl = _el('div', 'inn-player-class');
  clsEl.textContent = (p.class_name || '') + ' ' + (p.level || '');
  head.appendChild(clsEl);
  block.appendChild(head);

  /* HP bar */
  block.appendChild(_buildBar('HP', 'hp', hpClass, hpPct, p.hp, p.max_hp));
  /* MP bar */
  block.appendChild(_buildBar('MP', 'mp', 'mp-fill', mpPct, p.mp, p.max_mp));

  /* Exhaustion pips */
  var ex = p.exhaustion || 0;
  if (ex > 0) {
    block.appendChild(_buildExhaustion(ex));
  }

  return block;
}

/* Bar row helper */
function _buildBar(label, type, fillClass, pct, cur, max) {
  var row = _el('div', 'inn-bar-row');

  var lbl = _el('div', 'inn-bar-label ' + type);
  lbl.textContent = label;
  row.appendChild(lbl);

  var track = _el('div', 'inn-bar-track');
  var fill = _el('div', 'inn-bar-fill ' + fillClass);
  fill.style.width = pct.toFixed(0) + '%';
  track.appendChild(fill);
  row.appendChild(track);

  var val = _el('div', 'inn-bar-value');
  val.textContent = cur + ' / ' + max;
  row.appendChild(val);

  return row;
}

/* Mini bar for ally rows */
function _buildMiniBar(label, type, cur, max) {
  var grp = _el('div', 'inn-ally-bar-group');

  var lbl = _el('div', 'inn-ally-bar-lbl ' + type);
  lbl.textContent = label;
  grp.appendChild(lbl);

  var track = _el('div', 'inn-ally-bar-track');
  var pct = max > 0 ? (cur / max * 100) : 0;
  var fillClass = type === 'mp' ? 'mp-fill' : (pct > 60 ? 'hp-high' : (pct > 25 ? 'hp-mid' : 'hp-low'));
  var fill = _el('div', 'inn-ally-bar-fill ' + fillClass);
  fill.style.width = pct.toFixed(0) + '%';
  track.appendChild(fill);
  grp.appendChild(track);

  return grp;
}

/* Exhaustion pips (6 D&D levels) */
function _buildExhaustion(ex) {
  var wrap = _el('div', 'inn-exhaustion');

  var lbl = _el('div', 'inn-ex-label');
  lbl.textContent = 'Exaustao';
  wrap.appendChild(lbl);

  var pips = _el('div', 'inn-ex-pips');
  for (var i = 0; i < 6; i++) {
    var pip = _el('div', 'inn-ex-pip' + (i < ex ? ' on' : ''));
    pips.appendChild(pip);
  }
  wrap.appendChild(pips);

  var effects = [
    '', 'Desv. cheques', 'Velocidade/2', 'Desv. ataques',
    'HP max/2', 'Velocidade 0', 'Morte'
  ];
  var effectText = effects[Math.min(ex, 6)] || '';
  if (effectText) {
    var eff = _el('div', 'inn-ex-effect');
    eff.textContent = effectText;
    wrap.appendChild(eff);
  }

  return wrap;
}

/* Ally section for confirm screen */
function _buildAllySection(d) {
  var frag = document.createDocumentFragment();

  var albl = _el('div', 'inn-section-label');
  albl.textContent = 'Aliados';
  if (d.ally_cost > 0) {
    albl.textContent += ' \u2014 ' + d.ally_cost + ' ';
    albl.appendChild(_coin('sm'));
    albl.appendChild(document.createTextNode(' cada'));
  }
  frag.appendChild(albl);

  var alist = _el('div', 'inn-ally-list');
  for (var j = 0; j < d.allies.length; j++) {
    alist.appendChild(_buildAllyRow(d.allies[j]));
  }
  frag.appendChild(alist);

  return frag;
}

/* Ally row (confirm screen, with toggle + cost) */
function _buildAllyRow(a) {
  var row = _el('div', 'inn-ally-row' + (a.selected ? ' on' : ''));

  var hpPct = a.max_hp > 0 ? (a.hp / a.max_hp * 100) : 0;
  var mpPct = a.max_mp > 0 ? (a.mp / a.max_mp * 100) : 0;
  var hpClass = hpPct > 60 ? 'hp-high' : (hpPct > 25 ? 'hp-mid' : 'hp-low');
  var statusClass = hpPct < 30 ? 'warn' : 'ok';
  var statusText = hpPct < 30 ? 'HP baixo' : 'OK';

  var chk = _el('div', 'inn-ally-check');
  chk.textContent = a.selected ? '\u2713' : '';
  row.appendChild(chk);

  var ico = _el('div', 'inn-ally-ico');
  ico.textContent = a.icon || '\u2694\uFE0F';
  row.appendChild(ico);

  var info = _el('div', 'inn-ally-info');
  var nameRow = _el('div', 'inn-ally-name');
  nameRow.textContent = a.name || '';
  var badge = _el('span', 'inn-ally-status ' + statusClass);
  badge.textContent = statusText;
  nameRow.appendChild(badge);
  info.appendChild(nameRow);

  var bars = _el('div', 'inn-ally-bars');
  bars.appendChild(_buildMiniBar('HP', 'hp', a.hp, a.max_hp));
  bars.appendChild(_buildMiniBar('MP', 'mp', a.mp, a.max_mp));
  info.appendChild(bars);

  row.appendChild(info);

  var cost = _el('div', 'inn-ally-cost');
  if (a.cost > 0) {
    cost.textContent = '+' + a.cost + ' ';
    cost.appendChild(_coin('sm'));
  } else {
    cost.textContent = 'Gratis';
  }
  row.appendChild(cost);

  if (a.toggle_cb) {
    row.addEventListener('click', function () { _act(a.toggle_cb); });
  }

  return row;
}

/* Cost Footer */
function _buildCostFooter(d) {
  var footer = _el('div', 'inn-cost-footer');

  var left = _el('div', '');
  var lbl = _el('div', 'inn-cost-label');
  lbl.textContent = 'Total';
  left.appendChild(lbl);
  if (d.cost_detail) {
    var bd = _el('div', 'inn-cost-breakdown');
    bd.textContent = d.cost_detail;
    left.appendChild(bd);
  }
  footer.appendChild(left);

  var total = _el('div', 'inn-cost-total');
  if (d.total_cost === 0) {
    total.textContent = 'Gratis';
  } else {
    total.textContent = String(d.total_cost) + ' ';
    total.appendChild(_coin('lg'));
  }
  footer.appendChild(total);

  return footer;
}

/* CTA Button */
function _buildCTA(d) {
  var btn = _el('button', 'inn-btn-rest');
  if (d.total_cost === 0) {
    btn.textContent = '\uD83C\uDF19 Descansar';
  } else {
    btn.textContent = '\uD83C\uDF19 Descansar \u2014 ' + String(d.total_cost) + ' ';
    btn.appendChild(_coin());
  }
  btn.addEventListener('click', function () {
    if (d.confirm_cb) _act(d.confirm_cb);
  });
  return btn;
}

/* Gold balance row */
function _buildGoldBalance(gold) {
  var row = _el('div', 'inn-gold-balance');
  var lbl = _el('span', 'inn-gold-label');
  lbl.textContent = 'Seu ouro: ';
  row.appendChild(lbl);
  var val = _el('span', 'inn-gold-value');
  val.textContent = String(gold) + ' ';
  val.appendChild(_coin('sm'));
  row.appendChild(val);
  return row;
}

/* ================================================================
   UTILITIES
   ================================================================ */

/* Shorthand element creator */
function _el(tag, cls) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

/* Shorthand coin icon */
function _coin(size) {
  var c = document.createElement('span');
  c.className = 'vi vi-coin' + (size ? ' ' + size : '');
  return c;
}

/* Shorthand doAction caller */
function _act(cb) {
  if (typeof doAction === 'function' && cb) doAction(cb);
}

/**
 * game-city-shared.js — Componentes visuais reutilizaveis para telas da cidade
 *
 * API: window.vCity.{component}(data) -> HTMLElement
 *
 * Componentes:
 *   el(tag, cls)           — helper de criacao de DOM
 *   npcBanner(npc)         — banner de NPC clickavel (nome + mood + greeting)
 *   goldBalance(gold)      — linha "Seu ouro: X coin"
 *   serviceGrid(services)  — grid 2 colunas de servicos (icone + nome + preco)
 *   serviceCard(svc)       — card individual de servico
 *   statusAlert(text, type)— banner de alerta (info, warn, danger)
 *   playerBlock(player)    — bloco compacto HP/MP + exaustao
 *   actionList(items)      — lista de acoes clickaveis (quests, NPCs)
 *   sectionLabel(text)     — label de secao (uppercase, dim)
 *   badge(text, type)      — badge inline (count, quest, status)
 *   bar(label, type, pct, cur, max) — barra HP/MP
 *   coin(size)             — icone de moeda CSS
 *   act(cb)                — dispara doAction
 */
'use strict';

(function () {

/* ── Helpers ── */

function el(tag, cls) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function coin(size) {
  var c = document.createElement('span');
  c.className = 'vi vi-coin' + (size ? ' ' + size : '');
  return c;
}

function act(cb) {
  if (typeof doAction === 'function' && cb) doAction(cb);
}

/** Strip HTML tags from NPC text (backend sends <i>, <b> etc. for inline Telegram) */
function stripTags(str) {
  if (!str) return '';
  return String(str).replace(/<\/?[^>]+(>|$)/g, '');
}

/* ── NPC Banner ── */

function npcBanner(npc) {
  if (!npc) return el('div', '');
  var banner = el('div', 'vc-npc-banner');
  if (npc.cb) {
    banner.classList.add('clickable');
    banner.addEventListener('click', function () { act(npc.cb); });
  }

  var left = el('div', 'vc-npc-left');
  var nameRow = el('div', 'vc-npc-name');
  nameRow.textContent = npc.name || '';
  left.appendChild(nameRow);

  if (npc.mood) {
    var mood = el('div', 'vc-npc-mood');
    mood.textContent = npc.mood;
    left.appendChild(mood);
  }
  if (npc.greeting) {
    var greet = el('div', 'vc-npc-greeting');
    greet.textContent = npc.greeting;
    left.appendChild(greet);
  }
  banner.appendChild(left);

  if (npc.cb) {
    var arrow = el('div', 'vc-npc-arrow');
    arrow.textContent = '\u25B8';
    banner.appendChild(arrow);
  }
  return banner;
}

/* ── Gold Balance Row ── */

function goldBalance(gold) {
  var row = el('div', 'vc-gold-row');
  var lbl = el('span', 'vc-gold-label');
  lbl.textContent = 'Seu ouro: ';
  row.appendChild(lbl);
  var val = el('span', 'vc-gold-value');
  val.textContent = String(gold) + ' ';
  val.appendChild(coin('sm'));
  row.appendChild(val);
  return row;
}

/* ── Service Grid ── */

function serviceGrid(services) {
  if (!services || !services.length) return el('div', '');
  var grid = el('div', 'vc-service-grid');
  for (var i = 0; i < services.length; i++) {
    grid.appendChild(serviceCard(services[i]));
  }
  return grid;
}

function serviceCard(svc) {
  var card = el('div', 'vc-service-card');
  if (svc.disabled) card.classList.add('disabled');

  /* Icon */
  var ico = el('div', 'vc-service-icon');
  ico.textContent = svc.icon || '';
  card.appendChild(ico);

  /* Name */
  var name = el('div', 'vc-service-name');
  name.textContent = svc.label || '';
  card.appendChild(name);

  /* Price */
  if (svc.cost !== undefined && svc.cost !== null) {
    var price = el('div', 'vc-service-price');
    if (svc.cost === 0) {
      price.textContent = 'Gratis';
      price.classList.add('free');
    } else {
      price.textContent = String(svc.cost) + ' ';
      price.appendChild(coin('sm'));
    }
    card.appendChild(price);
  }

  /* Badge */
  if (svc.badge) {
    var bdg = el('span', 'vc-badge');
    bdg.textContent = svc.badge;
    card.appendChild(bdg);
  }

  /* Click */
  if (svc.cb && !svc.disabled) {
    card.addEventListener('click', function () { act(svc.cb); });
  }

  return card;
}

/* ── Status Alert ── */

function statusAlert(text, type) {
  var alert = el('div', 'vc-alert');
  if (type) alert.classList.add('vc-alert--' + type);
  alert.textContent = text;
  return alert;
}

/* ── Player Block (compact HP/MP) ── */

function playerBlock(p) {
  if (!p) return el('div', '');
  var block = el('div', 'vc-player-block');

  var hpPct = p.max_hp > 0 ? (p.hp / p.max_hp * 100) : 0;
  var mpPct = p.max_mp > 0 ? (p.mp / p.max_mp * 100) : 0;
  var hpCls = hpPct > 50 ? 'hp-high' : (hpPct > 25 ? 'hp-mid' : 'hp-low');

  /* Name + class */
  if (p.name) {
    var head = el('div', 'vc-player-head');
    head.textContent = (p.class_icon || '') + ' ' + p.name;
    if (p.class_name) head.textContent += ' \u2014 ' + p.class_name + ' ' + (p.level || '');
    block.appendChild(head);
  }

  /* HP bar */
  block.appendChild(bar('HP', 'hp', hpCls, hpPct, p.hp, p.max_hp));
  /* MP bar */
  block.appendChild(bar('MP', 'mp', 'mp-fill', mpPct, p.mp, p.max_mp));

  /* Exhaustion */
  if (p.exhaustion && p.exhaustion > 0) {
    block.appendChild(exhaustionPips(p.exhaustion));
  }

  return block;
}

/* ── Bar Row ── */

function bar(label, type, fillClass, pct, cur, max) {
  var row = el('div', 'vc-bar-row');
  var lbl = el('div', 'vc-bar-label ' + type);
  lbl.textContent = label;
  row.appendChild(lbl);
  var track = el('div', 'vc-bar-track');
  var fill = el('div', 'vc-bar-fill ' + fillClass);
  fill.style.width = Math.min(100, Math.max(0, pct)).toFixed(0) + '%';
  track.appendChild(fill);
  row.appendChild(track);
  var val = el('div', 'vc-bar-value');
  val.textContent = cur + ' / ' + max;
  row.appendChild(val);
  return row;
}

/* ── Exhaustion Pips ── */

function exhaustionPips(ex) {
  var wrap = el('div', 'vc-exhaustion');
  var lbl = el('div', 'vc-ex-label');
  lbl.textContent = 'Exaustao';
  wrap.appendChild(lbl);
  var pips = el('div', 'vc-ex-pips');
  for (var i = 0; i < 6; i++) {
    var pip = el('div', 'vc-ex-pip' + (i < ex ? ' on' : ''));
    pips.appendChild(pip);
  }
  wrap.appendChild(pips);
  return wrap;
}

/* ── Action List ── */

function actionList(items) {
  if (!items || !items.length) return el('div', '');
  var wrap = el('div', 'vc-action-list');
  for (var i = 0; i < items.length; i++) {
    (function (item) {
      var btn = el('button', 'vc-action-btn');
      if (item.icon) {
        var ico = el('span', 'vc-action-ico');
        ico.textContent = item.icon;
        btn.appendChild(ico);
      }
      var txt = document.createTextNode(item.label || item.text || '');
      btn.appendChild(txt);
      if (item.badge) {
        var bdg = el('span', 'vc-badge');
        bdg.textContent = item.badge;
        btn.appendChild(bdg);
      }
      btn.addEventListener('click', function () { act(item.cb); });
      wrap.appendChild(btn);
    })(items[i]);
  }
  return wrap;
}

/* ── Section Label ── */

function sectionLabel(text) {
  var lbl = el('div', 'vc-section-label');
  lbl.textContent = text;
  return lbl;
}

/* ── Badge ── */

function badgeEl(text, type) {
  var b = el('span', 'vc-badge');
  if (type) b.classList.add('vc-badge--' + type);
  b.textContent = text;
  return b;
}

/* ── Public API ── */

window.vCity = {
  el: el,
  coin: coin,
  act: act,
  stripTags: stripTags,
  npcBanner: npcBanner,
  goldBalance: goldBalance,
  serviceGrid: serviceGrid,
  serviceCard: serviceCard,
  statusAlert: statusAlert,
  playerBlock: playerBlock,
  actionList: actionList,
  sectionLabel: sectionLabel,
  badge: badgeEl,
  bar: bar,
  exhaustionPips: exhaustionPips,
};

})();

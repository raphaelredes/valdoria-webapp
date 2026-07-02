/**
 * game-city-shared.js — Componentes visuais reutilizaveis para telas da cidade
 *
 * API: window.vCity.{component}(data) -> HTMLElement
 *
 * Componentes:
 *   el(tag, cls)           — helper de criacao de DOM
 *   npcBanner(npc)         — banner de NPC clickavel (nome + mood + greeting)
 *   goldBalance(gold)      — linha "Suas Valdoritas: X coin"
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
  // A1.9 (auditoria #90): delega ao canônico shared/coin-utils.js (vCoin.el);
  // fallback local idêntico se coin-utils.js não tiver carregado.
  if (window.vCoin && typeof window.vCoin.el === 'function') return window.vCoin.el(size);
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
  lbl.textContent = 'Suas Valdoritas: ';
  row.appendChild(lbl);
  var val = el('span', 'vc-gold-value');
  val.textContent = String(gold) + ' ';
  val.appendChild(coin('sm'));
  row.appendChild(val);
  return row;
}

/* ── Service Grid ── */

/* P6 (2026-07-02, PADRAO_LOCAIS A6): badge "Novo!" quando um serviço TRANSICIONA
   de travado → liberado (ex.: subiu de nível e o card destravou). Snapshot dos
   cards vistos travados em localStorage (preferência de UI pura — permitido);
   o badge persiste até o jogador CLICAR o card (consumo). 1ª visita não polui:
   sem snapshot prévio → sem badge. */
var _SVC_LOCK_KEY = 'valdoria_ui_svc_locked';
function _svcLockSnap() {
  try { return JSON.parse(localStorage.getItem(_SVC_LOCK_KEY) || '{}'); }
  catch (_e) { return {}; }
}
function _svcLockSave(s) {
  try { localStorage.setItem(_SVC_LOCK_KEY, JSON.stringify(s)); } catch (_e) {}
}

function serviceGrid(services) {
  if (!services || !services.length) return el('div', '');
  var snap = _svcLockSnap(), dirty = false;
  for (var j = 0; j < services.length; j++) {
    var s = services[j];
    if (!s || !s.cb) continue;
    if (s.disabled) {
      if (!snap[s.cb]) { snap[s.cb] = 1; dirty = true; }
    } else if (snap[s.cb]) {
      s._isNew = true;  // destravou desde a última visita → fita "Novo!"
    }
  }
  if (dirty) _svcLockSave(snap);
  var grid = el('div', 'vc-service-grid');
  for (var i = 0; i < services.length; i++) {
    grid.appendChild(serviceCard(services[i]));
  }
  return grid;
}

function serviceCard(svc) {
  var card = el('div', 'vc-service-card');
  if (svc.disabled) card.classList.add('disabled');
  if (svc._isNew && !svc.disabled) {
    var nb = el('div', 'vc-service-new');
    nb.textContent = 'Novo!';
    card.appendChild(nb);
    card.addEventListener('click', (function(cb, badgeEl){ return function(){
      var s2 = _svcLockSnap(); delete s2[cb]; _svcLockSave(s2);
      if (badgeEl && badgeEl.parentNode) badgeEl.parentNode.removeChild(badgeEl);
    }; })(svc.cb, nb), { once: true });
  }

  /* Icon — suporta SVG heraldico, IMG portrait (innerHTML) ou emoji (textContent)
     2026-05-18 BUG FIX: <img> tag (merchant portraits AAA) era escapado como
     texto literal. Fix: detectar <svg OU <img — qualquer HTML marker. */
  var ico = el('div', 'vc-service-icon');
  var icoStr = svc.icon || '';
  if (icoStr.indexOf('<svg') >= 0 || icoStr.indexOf('<img') >= 0 || icoStr.indexOf('<span') >= 0) {
    ico.innerHTML = icoStr;
  } else {
    ico.textContent = icoStr;
  }
  card.appendChild(ico);

  /* Name — suporta HTML (label pode conter <span class="vi vi-coin">) */
  var name = el('div', 'vc-service-name');
  var lblStr = svc.label || '';
  if (lblStr.indexOf('<') >= 0) {
    name.innerHTML = lblStr;
  } else {
    name.textContent = lblStr;
  }
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

  /* Badge — 2026-05-11 (user request): auto-detect " V" trailing como
     valdoritas e substitui pelo icone .vi-coin (era textContent literal
     mostrando "V" letra). Aceita formats: "100 V", "10-50 V", "+5 V".
     2026-05-18 BUG FIX: badges com SVG inline (reputation tiers Aliado/
     Amigável/etc via _heralIco) eram renderizadas como texto literal
     "<svg viewBox..." porque textContent escape HTML. Detecta < no início
     ou ' <svg' interno e usa innerHTML (badges são canonical do código,
     não user input — XSS safe). */
  if (svc.badge) {
    var bdg = el('span', 'vc-badge');
    var bs = String(svc.badge);
    if (/\sV$/.test(bs)) {
      bdg.textContent = bs.slice(0, -2) + ' ';
      bdg.appendChild(coin('sm'));
    } else if (bs.indexOf('<svg') >= 0 || bs.indexOf('<span') >= 0) {
      bdg.innerHTML = bs;
    } else {
      bdg.textContent = bs;
    }
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
  /* BUG FIX 2026-04-11: support inline v-coin icon token in text */
  /* Splits on <span class="vi vi-coin sm"></span> and inserts real nodes */
  /* so the icon renders instead of appearing as literal HTML text. */
  var coinToken = '<span class="vi vi-coin sm"></span>';
  if (text && text.indexOf(coinToken) >= 0) {
    var parts = text.split(coinToken);
    for (var i = 0; i < parts.length; i++) {
      if (parts[i]) alert.appendChild(document.createTextNode(parts[i]));
      if (i < parts.length - 1) {
        alert.appendChild(el('span', 'vi vi-coin sm'));
      }
    }
  } else {
    alert.textContent = text;
  }
  return alert;
}

/* ── Player Block (compact HP/MP) ── */

function playerBlock(p) {
  if (!p) return el('div', '');
  var block = el('div', 'vc-player-block');

  var hpPct = p.max_hp > 0 ? (p.hp / p.max_hp * 100) : 0;
  var mpPct = p.max_mp > 0 ? (p.mp / p.max_mp * 100) : 0;
  var hpCls = vBarHpClass(hpPct);  // FASE 4 single-source (era 50%, agora 60/25 canonico)

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
        var icoStr = item.icon;
        /* 2026-05-18: detectar <img> + <span> alem de <svg> (portrait AAA) */
        if (icoStr.indexOf('<svg') >= 0 || icoStr.indexOf('<img') >= 0 || icoStr.indexOf('<span') >= 0) {
          ico.innerHTML = icoStr;
        } else {
          ico.textContent = icoStr;
        }
        btn.appendChild(ico);
      }
      /* Label — suporta HTML (vi-coin, italic flavor) ou texto puro */
      var lbl = item.label || item.text || '';
      if (lbl.indexOf('<') >= 0) {
        var span = el('span', '');
        span.innerHTML = lbl;
        btn.appendChild(span);
      } else {
        btn.appendChild(document.createTextNode(lbl));
      }
      if (item.badge) {
        var bdg = el('span', 'vc-badge');
        /* 2026-05-18 BUG FIX: same as vc-service-card — badges com SVG
           inline precisam de innerHTML, não textContent. */
        var bs = String(item.badge);
        if (bs.indexOf('<svg') >= 0 || bs.indexOf('<span') >= 0) {
          bdg.innerHTML = bs;
        } else {
          bdg.textContent = bs;
        }
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
  /* 2026-05-18 BUG FIX: badges with SVG markup need innerHTML to render. */
  var bs = String(text);
  if (bs.indexOf('<svg') >= 0 || bs.indexOf('<span') >= 0) {
    b.innerHTML = bs;
  } else {
    b.textContent = bs;
  }
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

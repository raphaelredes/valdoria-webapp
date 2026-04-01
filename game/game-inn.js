/* game-inn.js — Inn redesign renderer (structured data → DOM) */
/* Renders rich confirmation screens for inn rest tiers */
/* Note: innerHTML usage is safe here — all user-facing values go through _esc() */
/* which uses textContent assignment for XSS safety. Only static markup uses innerHTML. */

'use strict';

/**
 * Render inn confirmation screen inside popup container.
 * @param {HTMLElement} container - popup body element
 * @param {Object} d - _inn_screen data from backend
 */
function renderInnConfirm(container, d) {
  if (!container || !d) return;
  container.innerHTML = ''; /* noqa: preflight */

  var root = document.createElement('div');
  root.className = 'inn-confirm';

  /* ── Room Header ── */
  root.appendChild(_buildRoomHeader(d));

  /* ── Benefits ── */
  if (d.benefits && d.benefits.length) {
    root.appendChild(_buildBenefits(d.benefits));
  }

  /* ── Warning (stable-specific) ── */
  if (d.warning) {
    var warn = document.createElement('div');
    warn.className = 'inn-warning';
    warn.textContent = d.warning;
    root.appendChild(warn);
  }

  /* ── Player Status ── */
  if (d.player) {
    var slbl = document.createElement('div');
    slbl.className = 'inn-section-label';
    slbl.textContent = 'Seu estado atual';
    root.appendChild(slbl);
    root.appendChild(_buildPlayerBlock(d.player));
  }

  /* ── Allies ── */
  if (d.allies && d.allies.length) {
    root.appendChild(_buildAllySection(d));
  }

  /* ── Cost Footer ── */
  root.appendChild(_buildCostFooter(d));

  /* ── CTA Button ── */
  root.appendChild(_buildCTA(d));

  container.appendChild(root);
}

/* ── Room Header ── */
function _buildRoomHeader(d) {
  var hdr = document.createElement('div');
  hdr.className = 'inn-room-header';

  var ico = document.createElement('div');
  ico.className = 'inn-room-icon';
  ico.textContent = d.tier_icon || '';
  hdr.appendChild(ico);

  var info = document.createElement('div');
  info.className = 'inn-room-info';

  var name = document.createElement('div');
  name.className = 'inn-room-name';
  name.textContent = d.tier_name || '';
  info.appendChild(name);

  var price = document.createElement('div');
  price.className = 'inn-room-price' + (d.cost === 0 ? ' free' : '');
  if (d.cost === 0) {
    price.textContent = d.cost_label || 'Grátis';
  } else {
    price.textContent = String(d.cost) + ' ';
    var coin = document.createElement('span');
    coin.className = 'vi vi-coin sm';
    price.appendChild(coin);
  }
  info.appendChild(price);

  hdr.appendChild(info);
  return hdr;
}

/* ── Benefits list ── */
function _buildBenefits(benefits) {
  var det = document.createElement('div');
  det.className = 'inn-detail';
  for (var i = 0; i < benefits.length; i++) {
    var b = benefits[i];
    var row = document.createElement('div');
    row.className = 'inn-detail-row';

    var chk = document.createElement('div');
    chk.className = 'inn-detail-check ' + (b.check ? 'yes' : 'no');
    chk.textContent = b.check ? '✓' : '—';
    row.appendChild(chk);

    var txt = document.createElement('div');
    txt.className = 'inn-detail-text' + (b.check ? '' : ' dim');
    txt.textContent = b.text;
    row.appendChild(txt);

    det.appendChild(row);
  }
  return det;
}

/* ── Player block ── */
function _buildPlayerBlock(p) {
  var block = document.createElement('div');
  block.className = 'inn-player-block';

  var hpPct = p.max_hp > 0 ? (p.hp / p.max_hp * 100) : 0;
  var mpPct = p.max_mp > 0 ? (p.mp / p.max_mp * 100) : 0;
  var hpClass = hpPct > 50 ? 'hp-high' : (hpPct > 25 ? 'hp-mid' : 'hp-low');

  /* Head: name + class */
  var head = document.createElement('div');
  head.className = 'inn-player-head';
  var nameEl = document.createElement('div');
  nameEl.className = 'inn-player-name';
  nameEl.textContent = (p.class_icon || '') + ' ' + (p.name || '');
  head.appendChild(nameEl);
  var clsEl = document.createElement('div');
  clsEl.className = 'inn-player-class';
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

/* ── Bar row helper ── */
function _buildBar(label, type, fillClass, pct, cur, max) {
  var row = document.createElement('div');
  row.className = 'inn-bar-row';

  var lbl = document.createElement('div');
  lbl.className = 'inn-bar-label ' + type;
  lbl.textContent = label;
  row.appendChild(lbl);

  var track = document.createElement('div');
  track.className = 'inn-bar-track';
  var fill = document.createElement('div');
  fill.className = 'inn-bar-fill ' + fillClass;
  fill.style.width = pct.toFixed(0) + '%';
  track.appendChild(fill);
  row.appendChild(track);

  var val = document.createElement('div');
  val.className = 'inn-bar-value';
  val.textContent = cur + ' / ' + max;
  row.appendChild(val);

  return row;
}

/* ── Exhaustion pips ── */
function _buildExhaustion(ex) {
  var wrap = document.createElement('div');
  wrap.className = 'inn-exhaustion';

  var lbl = document.createElement('div');
  lbl.className = 'inn-ex-label';
  lbl.textContent = 'Exaustão';
  wrap.appendChild(lbl);

  var pips = document.createElement('div');
  pips.className = 'inn-ex-pips';
  for (var i = 0; i < 6; i++) {
    var pip = document.createElement('div');
    pip.className = 'inn-ex-pip' + (i < ex ? ' on' : '');
    pips.appendChild(pip);
  }
  wrap.appendChild(pips);

  var effects = ['', 'Desv. cheques', 'Velocidade/2', 'Desv. ataques', 'HP max/2', 'Velocidade 0', 'Morte'];
  var effectText = effects[Math.min(ex, 6)] || '';
  if (effectText) {
    var eff = document.createElement('div');
    eff.className = 'inn-ex-effect';
    eff.textContent = effectText;
    wrap.appendChild(eff);
  }

  return wrap;
}

/* ── Ally section ── */
function _buildAllySection(d) {
  var frag = document.createDocumentFragment();

  var albl = document.createElement('div');
  albl.className = 'inn-section-label';
  albl.textContent = 'Aliados';
  if (d.ally_cost > 0) {
    albl.textContent += ' — ' + d.ally_cost + ' ';
    var coin = document.createElement('span');
    coin.className = 'vi vi-coin sm';
    albl.appendChild(coin);
    var cada = document.createTextNode(' cada');
    albl.appendChild(cada);
  }
  frag.appendChild(albl);

  var alist = document.createElement('div');
  alist.className = 'inn-ally-list';
  for (var j = 0; j < d.allies.length; j++) {
    alist.appendChild(_buildAllyRow(d.allies[j]));
  }
  frag.appendChild(alist);

  return frag;
}

/* ── Ally row ── */
function _buildAllyRow(a) {
  var row = document.createElement('div');
  row.className = 'inn-ally-row' + (a.selected ? ' on' : '');

  var hpPct = a.max_hp > 0 ? (a.hp / a.max_hp * 100) : 0;
  var mpPct = a.max_mp > 0 ? (a.mp / a.max_mp * 100) : 0;
  var hpClass = hpPct > 50 ? 'hp-high' : (hpPct > 25 ? 'hp-mid' : 'hp-low');
  var statusClass = hpPct < 30 ? 'warn' : 'ok';
  var statusText = hpPct < 30 ? 'HP baixo' : 'OK';

  /* Check */
  var chk = document.createElement('div');
  chk.className = 'inn-ally-check';
  chk.textContent = a.selected ? '✓' : '';
  row.appendChild(chk);

  /* Icon */
  var ico = document.createElement('div');
  ico.className = 'inn-ally-ico';
  ico.textContent = a.icon || '⚔️';
  row.appendChild(ico);

  /* Info */
  var info = document.createElement('div');
  info.className = 'inn-ally-info';

  var nameRow = document.createElement('div');
  nameRow.className = 'inn-ally-name';
  nameRow.textContent = a.name || '';
  var badge = document.createElement('span');
  badge.className = 'inn-ally-status ' + statusClass;
  badge.textContent = statusText;
  nameRow.appendChild(badge);
  info.appendChild(nameRow);

  var bars = document.createElement('div');
  bars.className = 'inn-ally-bars';

  /* HP mini bar */
  var hpG = document.createElement('div');
  hpG.className = 'inn-ally-bar-group';
  var hpL = document.createElement('div');
  hpL.className = 'inn-ally-bar-lbl hp';
  hpL.textContent = 'HP';
  hpG.appendChild(hpL);
  var hpT = document.createElement('div');
  hpT.className = 'inn-ally-bar-track';
  var hpF = document.createElement('div');
  hpF.className = 'inn-ally-bar-fill ' + hpClass;
  hpF.style.width = hpPct.toFixed(0) + '%';
  hpT.appendChild(hpF);
  hpG.appendChild(hpT);
  bars.appendChild(hpG);

  /* MP mini bar */
  var mpG = document.createElement('div');
  mpG.className = 'inn-ally-bar-group';
  var mpL = document.createElement('div');
  mpL.className = 'inn-ally-bar-lbl mp';
  mpL.textContent = 'MP';
  mpG.appendChild(mpL);
  var mpT = document.createElement('div');
  mpT.className = 'inn-ally-bar-track';
  var mpF = document.createElement('div');
  mpF.className = 'inn-ally-bar-fill mp-fill';
  mpF.style.width = mpPct.toFixed(0) + '%';
  mpT.appendChild(mpF);
  mpG.appendChild(mpT);
  bars.appendChild(mpG);

  info.appendChild(bars);
  row.appendChild(info);

  /* Cost */
  var cost = document.createElement('div');
  cost.className = 'inn-ally-cost';
  if (a.cost > 0) {
    cost.textContent = '+' + a.cost + ' ';
    var coinEl = document.createElement('span');
    coinEl.className = 'vi vi-coin sm';
    cost.appendChild(coinEl);
  } else {
    cost.textContent = 'Grátis';
  }
  row.appendChild(cost);

  /* Toggle callback */
  if (a.toggle_cb) {
    row.addEventListener('click', function () {
      if (typeof doAction === 'function') doAction(a.toggle_cb);
    });
  }

  return row;
}

/* ── Cost Footer ── */
function _buildCostFooter(d) {
  var footer = document.createElement('div');
  footer.className = 'inn-cost-footer';

  var left = document.createElement('div');
  var lbl = document.createElement('div');
  lbl.className = 'inn-cost-label';
  lbl.textContent = 'Total';
  left.appendChild(lbl);
  if (d.cost_detail) {
    var bd = document.createElement('div');
    bd.className = 'inn-cost-breakdown';
    bd.textContent = d.cost_detail;
    left.appendChild(bd);
  }
  footer.appendChild(left);

  var total = document.createElement('div');
  total.className = 'inn-cost-total';
  if (d.total_cost === 0) {
    total.textContent = 'Grátis';
  } else {
    total.textContent = String(d.total_cost) + ' ';
    var coin = document.createElement('span');
    coin.className = 'vi vi-coin lg';
    total.appendChild(coin);
  }
  footer.appendChild(total);

  return footer;
}

/* ── CTA Button ── */
function _buildCTA(d) {
  var btn = document.createElement('button');
  btn.className = 'inn-btn-rest';
  if (d.total_cost === 0) {
    btn.textContent = '🌙 Descansar';
  } else {
    btn.textContent = '🌙 Descansar — ' + String(d.total_cost) + ' ';
    var coin = document.createElement('span');
    coin.className = 'vi vi-coin';
    btn.appendChild(coin);
  }
  btn.addEventListener('click', function () {
    if (typeof doAction === 'function' && d.confirm_cb) {
      doAction(d.confirm_cb);
    }
  });
  return btn;
}

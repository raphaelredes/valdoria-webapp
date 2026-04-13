/* game-bank-sub.js — Bank sub-screen renderers (insurance, loans, investments) */
/* Uses vCity.* shared components */
'use strict';

function renderBankSub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-BANK-SUB] renderBankSub type=' + data.type);
  while (container.firstChild) container.removeChild(container.firstChild);

  if (data.type === 'insurance') return _renderInsurance(container, data);
  if (data.type === 'loans') return _renderLoans(container, data);
  if (data.type === 'investments') return _renderInvestments(container, data);
}

/* ──── Insurance ──── */
function _renderInsurance(container, data) {
  var root = vCity.el('div', 'bsb-hub');

  /* Status card */
  var card = vCity.el('div', 'bsb-status-card');
  var icon = vCity.el('div', 'bsb-status-icon');
  icon.textContent = data.active ? '🛡️' : (data.expired ? '⏳' : '📋');
  card.appendChild(icon);

  var title = vCity.el('div', 'bsb-status-title');
  title.textContent = data.active ? 'Seguro Ativo' : (data.expired ? 'Seguro Expirado' : 'Seguro do Aventureiro');
  card.appendChild(title);

  if (data.active) {
    card.appendChild(_bsbProgressBar(data.progress_pct));
    var turns = vCity.el('div', 'bsb-status-detail');
    turns.textContent = data.turns_left + ' turnos restantes';
    card.appendChild(turns);
    if (data.premium_paid > 0) {
      var paid = vCity.el('div', 'bsb-status-sub');
      paid.textContent = 'Premio pago: ' + data.premium_paid + ' Valdoritas';
      card.appendChild(paid);
    }
  }
  root.appendChild(card);

  /* Coverage info */
  var info = vCity.el('div', 'bsb-info-block');
  var items = [
    'Derrota em combate: banco cobre a perda',
    'Cobertura maxima: seu saldo bancario',
    'Duracao: ' + data.duration + ' turnos',
    'Premio: ' + data.premium + ' Valdoritas'
  ];
  for (var i = 0; i < items.length; i++) {
    var li = vCity.el('div', 'bsb-info-item');
    li.textContent = '• ' + items[i];
    info.appendChild(li);
  }
  root.appendChild(info);

  /* Balance */
  root.appendChild(_bsbBalance(data.gold, data.bank_gold));

  /* Action button */
  if (data.action && data.action.label) {
    var btn = vCity.el('button', 'bsb-action-btn');
    btn.textContent = data.action.label;
    btn.setAttribute('data-action', data.action.cb);
    if (data.action.disabled) {
      btn.disabled = true;
      btn.classList.add('bsb-disabled');
    }
    root.appendChild(btn);
  }

  container.appendChild(root);
}

/* ──── Loans ──── */
function _renderLoans(container, data) {
  var root = vCity.el('div', 'bsb-hub');

  if (data.active_loan) {
    var loan = data.active_loan;
    var card = vCity.el('div', 'bsb-status-card');

    var icon = vCity.el('div', 'bsb-status-icon');
    icon.textContent = loan.overdue ? '⚠️' : '📋';
    card.appendChild(icon);

    var title = vCity.el('div', 'bsb-status-title');
    title.textContent = loan.overdue ? 'Emprestimo Vencido!' : 'Emprestimo Ativo';
    if (loan.overdue) title.classList.add('bsb-danger');
    card.appendChild(title);

    card.appendChild(_bsbProgressBar(loan.progress_pct));

    var grid = vCity.el('div', 'bsb-detail-grid');
    grid.appendChild(_bsbDetailItem('Emprestado', loan.amount + ' V'));
    grid.appendChild(_bsbDetailItem('Juros', loan.rate_pct + '%'));
    grid.appendChild(_bsbDetailItem('Total', loan.total_due + ' V'));
    grid.appendChild(_bsbDetailItem('Pago', loan.paid + ' V'));
    grid.appendChild(_bsbDetailItem('Restante', loan.debt + ' V'));
    grid.appendChild(_bsbDetailItem('Prazo', loan.turns_left + ' turnos'));
    card.appendChild(grid);

    root.appendChild(card);

    root.appendChild(_bsbBalance(data.gold, data.bank_gold));

    if (data.action && !data.action.disabled) {
      var btn = vCity.el('button', 'bsb-action-btn');
      btn.textContent = data.action.label;
      btn.setAttribute('data-action', data.action.cb);
      root.appendChild(btn);
    }
  } else {
    /* Tier list */
    root.appendChild(_bsbBalance(data.gold, data.bank_gold));
    root.appendChild(vCity.sectionLabel('Opcoes de Emprestimo'));

    for (var i = 0; i < data.tiers.length; i++) {
      var t = data.tiers[i];
      if (t.locked) continue;
      var tCard = vCity.el('button', 'bsb-tier-card');
      tCard.setAttribute('data-action', t.cb);

      var tHeader = vCity.el('div', 'bsb-tier-header');
      var tEmoji = vCity.el('span', 'bsb-tier-emoji');
      tEmoji.textContent = t.emoji;
      tHeader.appendChild(tEmoji);
      var tName = vCity.el('span', 'bsb-tier-name');
      tName.textContent = t.name;
      tHeader.appendChild(tName);
      tCard.appendChild(tHeader);

      var tDetails = vCity.el('div', 'bsb-tier-details');
      tDetails.textContent = t.amount + ' V • ' + t.rate_pct + '% juros • ' + t.due_turns + ' turnos';
      tCard.appendChild(tDetails);

      root.appendChild(tCard);
    }
  }

  container.appendChild(root);
}

/* ──── Investments ──── */
function _renderInvestments(container, data) {
  var root = vCity.el('div', 'bsb-hub');

  root.appendChild(_bsbBalance(data.gold, data.bank_gold));

  /* Slots indicator */
  var slots = vCity.el('div', 'bsb-slots');
  slots.textContent = '📈 Investimentos: ' + (data.max_slots - data.slots_left) + '/' + data.max_slots;
  root.appendChild(slots);

  if (data.has_mature) {
    root.appendChild(vCity.statusAlert('Investimentos prontos para coleta!', 'warn'));
  }

  /* Active investments */
  if (data.active && data.active.length) {
    root.appendChild(vCity.sectionLabel('Ativos'));
    for (var i = 0; i < data.active.length; i++) {
      var inv = data.active[i];
      var card = vCity.el('button', 'bsb-invest-card' + (inv.mature ? ' bsb-invest-mature' : ''));
      card.setAttribute('data-action', inv.cb);

      var hdr = vCity.el('div', 'bsb-invest-header');
      var emoji = vCity.el('span');
      emoji.textContent = inv.mature ? '✅' : inv.emoji;
      hdr.appendChild(emoji);
      var name = vCity.el('span', 'bsb-invest-name');
      name.textContent = ' ' + inv.tier_name + ' — ' + inv.amount + ' V';
      hdr.appendChild(name);
      card.appendChild(hdr);

      card.appendChild(_bsbProgressBar(inv.progress_pct));

      var detail = vCity.el('div', 'bsb-invest-detail');
      detail.textContent = inv.mature ? 'Pronto! +' + inv.profit + ' V lucro' : inv.turns_left + ' turnos restantes • +' + inv.profit + ' V';
      card.appendChild(detail);

      root.appendChild(card);
    }
  }

  /* Available tiers */
  if (data.tiers && data.tiers.length && data.slots_left > 0) {
    root.appendChild(vCity.sectionLabel('Novos Investimentos'));
    for (var t = 0; t < data.tiers.length; t++) {
      var tier = data.tiers[t];
      if (tier.locked) continue;
      var tBtn = vCity.el('button', 'bsb-tier-card');
      tBtn.setAttribute('data-action', tier.cb);

      var tHdr = vCity.el('div', 'bsb-tier-header');
      var tE = vCity.el('span', 'bsb-tier-emoji');
      tE.textContent = tier.emoji;
      tHdr.appendChild(tE);
      var tN = vCity.el('span', 'bsb-tier-name');
      tN.textContent = tier.name;
      tHdr.appendChild(tN);
      tBtn.appendChild(tHdr);

      var tD = vCity.el('div', 'bsb-tier-details');
      tD.textContent = 'Min ' + tier.min_amount + ' V • ' + tier.rate_pct + '% retorno • ' + tier.lock_turns + ' turnos';
      tBtn.appendChild(tD);

      root.appendChild(tBtn);
    }
  }

  container.appendChild(root);
}

/* ──── Shared helpers ──── */
function _bsbBalance(gold, bankGold) {
  var row = vCity.el('div', 'bsb-balance-row');

  var purse = vCity.el('div', 'bsb-balance-card');
  var pIcon = vCity.el('span', 'bsb-balance-icon');
  pIcon.textContent = '👛';
  purse.appendChild(pIcon);
  var pLbl = vCity.el('span', 'bsb-balance-label');
  pLbl.textContent = ' Bolsa: ';
  purse.appendChild(pLbl);
  var pVal = vCity.el('span', 'bsb-balance-value');
  pVal.textContent = String(gold || 0) + ' ';
  pVal.appendChild(vCity.coin('sm'));
  purse.appendChild(pVal);
  row.appendChild(purse);

  var safe = vCity.el('div', 'bsb-balance-card');
  var sIcon = vCity.el('span', 'bsb-balance-icon');
  sIcon.textContent = '🔒';
  safe.appendChild(sIcon);
  var sLbl = vCity.el('span', 'bsb-balance-label');
  sLbl.textContent = ' Cofre: ';
  safe.appendChild(sLbl);
  var sVal = vCity.el('span', 'bsb-balance-value');
  sVal.textContent = String(bankGold || 0) + ' ';
  sVal.appendChild(vCity.coin('sm'));
  safe.appendChild(sVal);
  row.appendChild(safe);

  return row;
}

function _bsbProgressBar(pct) {
  var wrap = vCity.el('div', 'bsb-progress-wrap');
  var fill = vCity.el('div', 'bsb-progress-fill');
  fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
  wrap.appendChild(fill);
  return wrap;
}

function _bsbDetailItem(label, value) {
  var item = vCity.el('div', 'bsb-detail-item');
  var lbl = vCity.el('span', 'bsb-detail-label');
  lbl.textContent = label;
  item.appendChild(lbl);
  var val = vCity.el('span', 'bsb-detail-value');
  val.textContent = value;
  item.appendChild(val);
  return item;
}

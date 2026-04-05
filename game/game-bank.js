/* game-bank.js — Bank popup renderer */
/* Uses vCity.* shared components */
'use strict';

function renderBankHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-BANK] renderBankHub gold=' + (data.gold || 0) + ' bank=' + (data.bank_gold || 0) + ' services=' + (data.services ? data.services.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'bnk-hub');

  /* Loan overdue alert */
  if (data.loan_overdue && data.loan_debt > 0) {
    root.appendChild(vCity.statusAlert(
      'Emprestimo vencido: ' + data.loan_debt + ' GP — servicos bloqueados',
      'danger'
    ));
  }

  /* NPC greeting */
  if (data.greeting) {
    var greet = vCity.el('div', 'bnk-greeting');
    greet.textContent = data.greeting;
    root.appendChild(greet);
  }

  /* Balance cards */
  var balances = vCity.el('div', 'bnk-balance-row');

  var purse = vCity.el('div', 'bnk-balance-card');
  var purseIcon = vCity.el('div', 'bnk-balance-icon');
  purseIcon.textContent = '\uD83D\uDCB0';
  purse.appendChild(purseIcon);
  var purseLbl = vCity.el('div', 'bnk-balance-label');
  purseLbl.textContent = 'Bolsa';
  purse.appendChild(purseLbl);
  var purseVal = vCity.el('div', 'bnk-balance-value');
  purseVal.textContent = String(data.gold || 0) + ' ';
  purseVal.appendChild(vCity.coin('sm'));
  purse.appendChild(purseVal);
  balances.appendChild(purse);

  var safe = vCity.el('div', 'bnk-balance-card');
  var safeIcon = vCity.el('div', 'bnk-balance-icon');
  safeIcon.textContent = '\uD83D\uDD12';
  safe.appendChild(safeIcon);
  var safeLbl = vCity.el('div', 'bnk-balance-label');
  safeLbl.textContent = 'Cofre';
  safe.appendChild(safeLbl);
  var safeVal = vCity.el('div', 'bnk-balance-value');
  safeVal.textContent = String(data.bank_gold || 0) + ' ';
  safeVal.appendChild(vCity.coin('sm'));
  safe.appendChild(safeVal);
  balances.appendChild(safe);

  root.appendChild(balances);

  /* Loan debt indicator */
  if (data.loan_debt > 0 && !data.loan_overdue) {
    root.appendChild(vCity.statusAlert(
      'Emprestimo ativo: ' + data.loan_debt + ' GP restantes',
      'warn'
    ));
  }

  /* Services grid */
  if (data.services && data.services.length) {
    root.appendChild(vCity.sectionLabel('Servicos'));
    root.appendChild(vCity.serviceGrid(data.services));
  }

  container.appendChild(root);
}

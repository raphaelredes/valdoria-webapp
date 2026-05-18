/* game-bank.js — Bank popup renderer (AAA epic — 2026-05-18) */
/* Uses vCity.* shared components */
'use strict';

function renderBankHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-BANK] renderBankHub gold=' + (data.gold || 0) + ' bank=' + (data.bank_gold || 0) + ' services=' + (data.services ? data.services.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'bnk-hub bnk-hub-aaa');

  /* Loan overdue alert */
  if (data.loan_overdue && data.loan_debt > 0) {
    root.appendChild(vCity.statusAlert(
      'Empréstimo vencido: ' + data.loan_debt + ' <span class="vi vi-coin sm"></span> — serviços bloqueados',
      'danger'
    ));
  }

  /* NPC greeting */
  if (data.greeting) {
    var greet = vCity.el('div', 'bnk-greeting');
    greet.textContent = vCity.stripTags(data.greeting);
    root.appendChild(greet);
  }

  /* Balance cards — AAA: usa PNG AI-generated (bnk-bolsa.png + bnk-cofre.png)
     2026-05-18: substituido SVG heraldic por imagens AAA via OpenAI gpt-image-2 */
  var balances = vCity.el('div', 'bnk-balance-row');

  var purse = vCity.el('div', 'bnk-balance-card bnk-card-purse');
  var purseIcon = vCity.el('div', 'bnk-balance-icon');
  purseIcon.innerHTML = '<img src="../shared/img/bank/bnk-bolsa.png" alt="Bolsa" loading="lazy" />';
  purse.appendChild(purseIcon);
  var purseLbl = vCity.el('div', 'bnk-balance-label');
  purseLbl.textContent = 'BOLSA';
  purse.appendChild(purseLbl);
  var purseVal = vCity.el('div', 'bnk-balance-value');
  purseVal.textContent = String(data.gold || 0) + ' ';
  purseVal.appendChild(vCity.coin('sm'));
  purse.appendChild(purseVal);
  balances.appendChild(purse);

  var safe = vCity.el('div', 'bnk-balance-card bnk-card-safe');
  var safeIcon = vCity.el('div', 'bnk-balance-icon');
  safeIcon.innerHTML = '<img src="../shared/img/bank/bnk-cofre.png" alt="Cofre" loading="lazy" />';
  safe.appendChild(safeIcon);
  var safeLbl = vCity.el('div', 'bnk-balance-label');
  safeLbl.textContent = 'COFRE';
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
      'Emprestimo ativo: ' + data.loan_debt + ' <span class="vi vi-coin sm"></span> restantes',
      'warn'
    ));
  }

  /* Services grid */
  if (data.services && data.services.length) {
    root.appendChild(vCity.sectionLabel('Serviços'));
    root.appendChild(vCity.serviceGrid(data.services));
  }

  container.appendChild(root);
}

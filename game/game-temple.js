/* game-temple.js — Temple popup renderer */
/* Uses vCity.* shared components */
'use strict';

function renderTempleHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-TEMPLE] renderTempleHub services=' + (data.services ? data.services.length : 0) + ' debt=' + (data.debt || 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'tmp-hub');

  /* Debt alert — statusAlert now handles v-coin token inline (fix 2026-04-11) */
  if (data.debt && data.debt > 0) {
    root.appendChild(vCity.statusAlert(
      'Dívida ativa: ' + data.debt + ' <span class="vi vi-coin sm"></span> — serviços bloqueados',
      'danger'
    ));
  }

  /* Pay Debt button — uses structured data.pay_debt (fix 2026-04-11) */
  /* Backend (temple.py) sends a dedicated `pay_debt` field on the */
  /* _temple_screen payload: {icon, label, cb, disabled, cost, primary}. */
  /* Previously the button was only in the InlineKeyboardMarkup fallback */
  /* at the top level (data.buttons), which renderTempleHub ignored — */
  /* players with debt were stuck (services disabled, no pay option). */
  if (data.pay_debt && data.pay_debt.cb) {
    var pd = data.pay_debt;
    var payBtn = vCity.el('button', 'v-popup-btn v-popup-btn--primary tmp-pay-btn');
    if (pd.disabled) payBtn.classList.add('disabled');
    if (pd.icon) {
      var iconSpan = vCity.el('span', 'tmp-pay-icon');
      iconSpan.textContent = pd.icon + ' ';
      payBtn.appendChild(iconSpan);
    }
    var labelSpan = vCity.el('span', 'tmp-pay-label');
    labelSpan.textContent = pd.label || 'Pagar Dívida';
    payBtn.appendChild(labelSpan);
    if (pd.disabled) {
      var warn = vCity.el('span', 'tmp-pay-warn');
      warn.textContent = ' — Ouro insuficiente';
      payBtn.appendChild(warn);
    }
    (function(cb, disabled) {
      payBtn.addEventListener('click', function() {
        if (disabled) return;
        if (typeof doAction === 'function') doAction(cb);
      });
    })(pd.cb, !!pd.disabled);
    var btnRow = vCity.el('div', 'tmp-pay-debt-row');
    btnRow.appendChild(payBtn);
    root.appendChild(btnRow);
  }

  /* Flavor text */
  if (data.flavor) {
    var flavor = vCity.el('div', 'tmp-flavor');
    flavor.textContent = vCity.stripTags(data.flavor);
    root.appendChild(flavor);
  }

  /* Services grid */
  if (data.services && data.services.length) {
    root.appendChild(vCity.sectionLabel('Servicos disponiveis'));
    root.appendChild(vCity.serviceGrid(data.services));
  }

  /* Downtime button */
  if (data.downtime) {
    root.appendChild(vCity.sectionLabel('Atividade'));
    var dtList = [data.downtime];
    root.appendChild(vCity.serviceGrid(dtList));
  }

  /* Wandering NPCs */
  if (data.wandering_npcs && data.wandering_npcs.length) {
    root.appendChild(vCity.sectionLabel('Viajantes'));
    root.appendChild(vCity.actionList(data.wandering_npcs));
  }

  /* Gold balance */
  if (data.gold !== undefined) {
    root.appendChild(vCity.goldBalance(data.gold));
  }

  container.appendChild(root);
}

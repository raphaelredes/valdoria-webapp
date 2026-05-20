/* game-bank.js — Bank popup renderer (AAA epic — 2026-05-18 / FASE B upgrade 2026-05-19) */
/* Uses vCity.* shared components + NPC Living System (shared/npc-living-system.js) */
'use strict';

/* === FASE B integration POC (sessão #13, Task #19, 2026-05-19) ============
 * Banco é o primeiro estabelecimento portado do mockup AAA pro renderer
 * canonical (regra: nunca fragmentar cidade em arquivos HTML separados;
 * upgrade INLINE no renderer que cidade/index.html já invoca).
 *
 * Upgrades nesta versão:
 *  - NPC panel com portrait de Aldwin (banqueiro.png) + role + Renown badge
 *  - Hook _npcMarkVisit('aldwin','enter_bank') quando renderiza
 *  - Mood tier label canonical (D&D 5e DMG p.22): hostile/cold/neutral/warm/friendly
 *  - Backward compat: tudo funciona se npc-living-system.js não estiver carregado
 *
 * TODO próxima sessão: SERVICE_DIALOGUES PADRAO_ALDRIC inline (8 svc dialogues
 * canonical do mockup banco-cofre-final.html) + cascade about_tavira/about_corvus
 * + dice checks. Por enquanto svc cards usam click handler existente.
 *
 * Doc canonical:
 *   memory/feedback_centralize_in_canonical_webapps.md (porting pattern)
 *   memory/reference_npc_personalities_canonical.md (Aldwin §2)
 *   memory/reference_npc_living_system.md (API)
 */

/* Renown tier label canonical (D&D 5e DMG p.22 + NPC Living mood tiers). */
function _bnkRenownLabel(num) {
  if (num >= 25) return 'AMIGÁVEL';
  if (num >= 10) return 'CORDIAL';
  if (num >= 0)  return 'NEUTRO';
  if (num >= -10) return 'FRIO';
  return 'HOSTIL';
}

/* Calcula Renown atual do personagem com facção Bank. Tenta:
 *  1. data.renown.bank (backend canonical)
 *  2. window._PLAYER_RENOWN.bank (svc-interactions mock)
 *  3. fallback 0 (neutral)
 */
function _bnkGetRenown(data) {
  if (data && data.renown && typeof data.renown.bank === 'number') return data.renown.bank;
  if (typeof window._PLAYER_RENOWN === 'object' && window._PLAYER_RENOWN
      && typeof window._PLAYER_RENOWN.bank === 'number') {
    return window._PLAYER_RENOWN.bank;
  }
  return 0;
}

/* Constrói NPC panel — portrait Aldwin + name + role + Renown badge. */
function _bnkBuildNpcPanel(data) {
  var panel = vCity.el('div', 'bnk-npc-panel');
  panel.style.cssText = [
    'display:flex',
    'align-items:center',
    'gap:12px',
    'padding:10px 12px',
    'margin-bottom:12px',
    'background:linear-gradient(180deg,rgba(196,149,58,0.10),rgba(196,149,58,0.02))',
    'border:1px solid rgba(196,149,58,0.28)',
    'border-radius:10px'
  ].join(';');

  /* Portrait Aldwin (canonical PNG banqueiro.png). */
  var portrait = vCity.el('img', 'bnk-npc-portrait');
  portrait.src = '../shared/img/npcs/banqueiro.png';
  portrait.alt = 'Aldwin de Tholram';
  portrait.loading = 'lazy';
  portrait.style.cssText = [
    'width:52px', 'height:52px',
    'border-radius:50%',
    'border:1.5px solid rgba(196,149,58,0.55)',
    'object-fit:cover',
    'background:#1a1510',
    'box-shadow:0 0 10px rgba(196,149,58,0.25)'
  ].join(';');
  portrait.onerror = function(){ this.style.display = 'none'; };
  panel.appendChild(portrait);

  /* Info column. */
  var info = vCity.el('div');
  info.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;';
  var nameEl = vCity.el('div');
  nameEl.textContent = 'Aldwin de Tholram';
  nameEl.style.cssText = 'font-weight:600;color:#d4c8b0;font-size:13px;letter-spacing:0.5px;';
  info.appendChild(nameEl);
  var roleEl = vCity.el('div');
  roleEl.textContent = 'Banqueiro · Casa de Tholram';
  roleEl.style.cssText = 'font-size:11px;color:#a09484;line-height:1.3;';
  info.appendChild(roleEl);
  panel.appendChild(info);

  /* Renown badge. */
  var renown = _bnkGetRenown(data);
  var renownLabel = _bnkRenownLabel(renown);
  var badge = vCity.el('div', 'bnk-npc-renown');
  badge.style.cssText = [
    'padding:5px 11px',
    'border-radius:14px',
    'background:rgba(196,149,58,0.16)',
    'border:1px solid rgba(196,149,58,0.42)',
    'text-align:center',
    'min-width:64px',
    'line-height:1.2'
  ].join(';');
  badge.innerHTML =
    '<div style="font-size:10px;font-weight:700;color:#f4d896;letter-spacing:1px;">' + renownLabel + '</div>'
    + '<div style="font-size:9px;color:#a09484;margin-top:1px;">Renown ' + renown + '</div>';
  panel.appendChild(badge);

  return panel;
}

function renderBankHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-BANK] renderBankHub gold=' + (data.gold || 0)
    + ' bank=' + (data.bank_gold || 0)
    + ' services=' + (data.services ? data.services.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  /* FASE B integration: registra visita do personagem ao Banco.
     _npcMarkVisit é opcional — funciona mesmo se npc-living-system.js falhou. */
  try {
    if (typeof window._npcMarkVisit === 'function') {
      window._npcMarkVisit('aldwin', 'enter_bank');
    }
  } catch (e) { console.warn('[CITY-BANK] _npcMarkVisit fail:', e); }

  var root = vCity.el('div', 'bnk-hub bnk-hub-aaa');

  /* NPC panel (portrait Aldwin + role + Renown badge) — FASE B upgrade. */
  root.appendChild(_bnkBuildNpcPanel(data));

  /* Loan overdue alert */
  if (data.loan_overdue && data.loan_debt > 0) {
    root.appendChild(vCity.statusAlert(
      'Empréstimo vencido: ' + data.loan_debt + ' <span class="vi vi-coin sm"></span> — serviços bloqueados',
      'danger'
    ));
  }

  /* NPC greeting (canonical Aldwin de bank.py / BANK_GREETINGS em cidade/index.html) */
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

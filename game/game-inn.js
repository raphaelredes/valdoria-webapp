/* ============================================================================
 * game-inn.js — Estalagem do Grifo Dourado (PADRAO_TAVERNA canonical)
 * ============================================================================
 *
 * Task #37 sessão #14 (2026-05-20) — NOVO arquivo (extraído de _renderInnHubAAA
 * inline em cidade/index.html linha 13929). Implementação canonical seguindo
 * pattern Banco POC com .cenario, .row-npc, .rep-bar, .services, .svc.
 *
 * NPC: Martha (estalajadeira, 28 anos atrás do balcão).
 * Source: simuladores/estalagem-grifo-final.html
 *
 * Dispatch: cidade/index.html linha 40080 (key === 'inn').
 * ============================================================================ */
'use strict';

if (!window._SVC_CONFIG_INN) {
  window._SVC_CONFIG_INN = {
    faction: 'inn',
    factionLabel: 'Estalagem Grifo Dourado',
    reactions: {
      very_negative: 'Martha vira o rosto. <i>(passa o pano pelo balcão com força)</i> "Procura outro lugar pra dormir."',
      negative: 'Martha suspira, paciente. <i>(continua enxugando os copos)</i> "Quem busca cama precisa de paz."',
      neutral: 'Martha acena com um aceno breve. <i>(volta às tarefas)</i> "Anotado."',
      positive: 'Martha sorri com gentileza. <i>(prepara uma caneca de chá quente)</i> "Boa alma. A Estalagem reserva o melhor pra ti."',
      very_positive: 'Martha dá um abraço discreto. <i>(rara mostra de afeto)</i> "És da família. Quarto real por conta da casa esta noite."'
    },
    confirmMsgs: {
      narration: 'Martha anota teu nome no livro de hóspedes. <i>(passa a pena no tinteiro)</i>',
      generic: '"Quarto preparado. Que tenhas sonhos tranquilos."'
    }
  };
}

var MARTHA_DIALOGUE = {
  npc: {
    name: 'Martha',
    desc: 'Estalajadeira · vinte e oito anos atrás do balcão do Grifo Dourado',
    portrait: '../shared/img/npcs/estalajadeira.png'
  },
  script: [
    { type: 'narration', text: 'A Estalagem do Grifo Dourado respira em calma. Lareira de pedra crepita ao fundo, lançando luz alaranjada sobre tapetes vermelhos. Martha está atrás do balcão de carvalho — vestido de linho azul-marinho, avental branco impecável, cabelo grisalho preso em coque. Ela ergue os olhos do livro de hóspedes e sorri maternal.' },
    { type: 'speech', speaker: 'Martha', text: 'Bem-vindo ao Grifo Dourado, aventureiro. <i>(fecha o livro de couro)</i> Aqui se descansa em paz, come-se bem, e ninguém pergunta de onde tu vens — só pra onde vais. O que te trouxe a esta hora?' }
  ],
  choices: [
    { id: 'sleep',   label: '🛏 "Preciso de um quarto."', cb: 'inn_sleep' },
    { id: 'meal',    label: '🍲 "Uma refeição quente."', cb: 'inn_meal' },
    { id: 'bath',    label: '🛁 "Banho quente, por favor."', cb: 'inn_bath' },
    { id: 'leave',   label: '↩ "Volto depois, Martha."', cb: 'close' }
  ]
};

function _innEl(tag, cls, text) {
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
}

function renderInnHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-INN] renderInnHub (PADRAO_TAVERNA) services=' + (data.services ? data.services.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'inn-hub');

  /* === 1. Cenario canonical === */
  var cenarioEl = vCity.el('div', 'cenario');
  var bg = _innEl('img', 'cenario-bg');
  bg.src = '../shared/img/estalagem/estalagem-banner.png';
  bg.loading = 'lazy';
  bg.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(bg);
  cenarioEl.appendChild(vCity.el('div', 'candle-glow l'));
  cenarioEl.appendChild(vCity.el('div', 'candle-glow r'));
  var crest = _innEl('img', 'cenario-brasao');
  crest.src = '../shared/img/estalagem/estalagem-crest.png';
  crest.alt = 'Brasão do Grifo Dourado';
  crest.loading = 'lazy';
  crest.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(crest);
  var titulo = vCity.el('div', 'cenario-titulo');
  titulo.appendChild(_innEl('div', 'name', 'Grifo Dourado'));
  titulo.appendChild(_innEl('div', 'sub', 'Estalagem de Martha · Praça Central'));
  cenarioEl.appendChild(titulo);
  root.appendChild(cenarioEl);

  /* === 2. Body container === */
  var body = vCity.el('div', 'inn-body');
  body.style.cssText = 'padding:8px 12px 0;display:flex;flex-direction:column;gap:7px;';

  /* === 2a. NPC row Martha === */
  var npcRow = vCity.el('div', 'row-npc');
  var portraitWrap = vCity.el('div', 'npc-portrait');
  var img = _innEl('img');
  img.src = '../shared/img/npcs/estalajadeira.png';
  img.alt = 'Martha';
  img.loading = 'lazy';
  img.onerror = function(){ this.style.display = 'none'; };
  portraitWrap.appendChild(img);
  npcRow.appendChild(portraitWrap);
  var info = vCity.el('div', 'npc-info');
  info.appendChild(_innEl('div', 'name', 'Martha'));
  info.appendChild(_innEl('div', 'quote', '"Aqui se descansa em paz."'));
  npcRow.appendChild(info);
  npcRow.appendChild(_innEl('div', 'npc-chev', '›'));
  npcRow.addEventListener('click', function(){
    if (typeof window.vEncounter === 'object' && window.vEncounter.render) {
      window._SVC_CONFIG = window._SVC_CONFIG_INN;
      window.vEncounter.render(MARTHA_DIALOGUE);
    }
  });
  body.appendChild(npcRow);

  /* === 2b. Rep bar === */
  var renown = (data.renown && typeof data.renown.inn === 'number') ? data.renown.inn : (window._PLAYER_RENOWN && window._PLAYER_RENOWN.inn) || 0;
  var tierLbl = 'NEUTRO';
  if (renown >= 25) tierLbl = 'AMIGÁVEL';
  else if (renown >= 10) tierLbl = 'CORDIAL';
  else if (renown < 0 && renown >= -10) tierLbl = 'FRIO';
  else if (renown < -10) tierLbl = 'HOSTIL';
  var pct = Math.max(0, Math.min(100, Math.round((renown + 10) / 40 * 100)));
  var repBar = vCity.el('div', 'rep-bar');
  repBar.appendChild(_innEl('span', 'label', 'Reputação'));
  var track = vCity.el('div', 'bar');
  var fill = vCity.el('div', 'fill');
  fill.style.width = pct + '%';
  track.appendChild(fill);
  repBar.appendChild(track);
  repBar.appendChild(_innEl('span', 'value', tierLbl + ' · ' + renown));
  body.appendChild(repBar);

  /* === 2c. Flavor === */
  if (data.flavor) {
    var flavor = vCity.el('div', 'inn-flavor');
    flavor.style.cssText = 'font-style:italic;font-size:12px;color:#a09484;padding:6px 10px;border-left:2px solid rgba(196,149,58,0.3);background:rgba(0,0,0,0.18);border-radius:4px;';
    flavor.innerHTML = data.flavor;
    body.appendChild(flavor);
  }

  /* === 2d. Section label === */
  var sectionLbl = vCity.el('div', 'pt-section-label');
  sectionLbl.textContent = '⚜ Serviços do Grifo ⚜';
  body.appendChild(sectionLbl);

  /* === 2e. Services grid (.services + .svc canonical) === */
  if (data.services && data.services.length) {
    var grid = vCity.el('div', 'services');
    for (var i = 0; i < data.services.length; i++) {
      var svc = data.services[i];
      var card = vCity.el('div', 'svc');
      if (svc.disabled) card.classList.add('disabled');
      card.setAttribute('data-svc', svc.cb || '');

      var ico = vCity.el('div', 'svc-ico');
      ico.innerHTML = svc.icon || '🛏';
      ico.style.cssText = 'font-size:20px;';
      card.appendChild(ico);

      var txt = vCity.el('div', 'svc-text');
      txt.appendChild(_innEl('div', 'svc-name', svc.label || ''));
      var metaText = svc.cost !== undefined ? (svc.cost === 0 ? 'Grátis' : String(svc.cost) + ' V') : '';
      if (svc.desc) metaText = svc.desc + (metaText ? ' · ' + metaText : '');
      txt.appendChild(_innEl('div', 'svc-meta', metaText));
      card.appendChild(txt);

      if (svc.badge) {
        var badge = _innEl('div', 'svc-badge', svc.badge);
        card.appendChild(badge);
      }

      if (svc.cb && !svc.disabled) {
        card.addEventListener('click', (function(cb){ return function(){
          if (typeof doAction === 'function') doAction(cb);
          else if (typeof vCity !== 'undefined' && typeof vCity.act === 'function') vCity.act(cb);
        }; })(svc.cb));
      }
      grid.appendChild(card);
    }
    body.appendChild(grid);
  }

  /* === 2f. Wandering NPCs === */
  if (data.wandering_npcs && data.wandering_npcs.length) {
    var wnLbl = vCity.el('div', 'pt-section-label');
    wnLbl.textContent = '🚶 Hóspedes';
    body.appendChild(wnLbl);
    body.appendChild(vCity.actionList(data.wandering_npcs));
  }

  /* === 2g. Gold balance === */
  if (data.gold !== undefined) {
    body.appendChild(vCity.goldBalance(data.gold));
  }

  root.appendChild(body);
  container.appendChild(root);
}

window.renderInnHub = renderInnHub;

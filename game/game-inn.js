/* ============================================================================
 * game-inn.js — Estalagem da Pena-Dourada (PADRAO_TAVERNA + PADRAO_SERVIDOR)
 * ============================================================================
 *
 * Task #37 sessão #14 (2026-05-20) — arquivo extraído de _renderInnHubAAA inline.
 * Sessão #71 (2026-06-02) — PADRAO_SERVIDOR: a narrativa da Martha foi movida
 *   para o SERVIDOR (src/game/city/inn_dialogue_data.py + city_dialogue_resolver.py).
 *   Este renderer só desenha o hub (cenário / rep-bar / grid de serviços) e ABRE o
 *   diálogo server-driven via window._openCityDialogue('inn', <node>). ZERO narrativa
 *   hardcoded aqui (regra No Hardcoded Content + SUPREME RULE #0).
 *   Doc: docs/sistemas/padrao-servidor.md
 *
 * NPC: Martha (estalajadeira). Render: cidade/index.html (dispatch key === 'inn').
 *
 * MAPA_IA:
 *   ~30  INN_SVC_META    — svc.cb -> PNG icon path canonical
 *   ~55  _INN_CARD_NODE  — svc.cb do grid -> node de diálogo (UX: card abre diálogo)
 *   ~70  _innEl(tag,cls,text) — helper (innerHTML se tag inline detectada)
 *   ~90  renderInnHub(container, data) — entry point (cenário + Martha row + grid)
 * ============================================================================ */
'use strict';

/* IIFE wrap (task #75): previne colisões de globais entre renderers.
   Apenas renderInnHub é exposto via window. */
(function() {

/* 2026-05-20 — INN_SVC_META map svc.cb -> PNG path canonical.
   Keys são os cb REAIS do backend (verificados via Chrome MCP DOM inspect).
   Sem class v-asset-png para evitar items-resolver auto-swap. */
var INN_SVC_META = {
  // === Menu principal Estalagem (cb reais backend) ===
  'nav:inn_rest':           { icon: '<img src="../shared/img/services/svc-dormir-comum.webp" alt="">' },
  'nav:inn_meals':          { icon: '<img src="../shared/img/services/svc-comer.webp" alt="">' },
  'inn_short_rest':         { icon: '<img src="../shared/img/services/svc-descanso-curto.webp" alt="">' },
  'inn_relaxation':         { icon: '<img src="../shared/img/services/svc-relaxar.webp" alt="">' },
  'inn_allies':             { icon: '<img src="../shared/img/services/svc-aliados.webp" alt="">' },
  'inn_cellar_quest':       { icon: '<img src="../shared/img/services/svc-investigar-adega.webp" alt="">' },
  /* legacy/sub-menu cb names (caso backend mude) */
  'inn_room_menu':          { icon: '<img src="../shared/img/services/svc-dormir-comum.webp" alt="">' },
  'inn_meal_menu':          { icon: '<img src="../shared/img/services/svc-comer.webp" alt="">' },
  'inn_relaxation_menu':    { icon: '<img src="../shared/img/services/svc-relaxar.webp" alt="">' },
  'inn_allies_menu':        { icon: '<img src="../shared/img/services/svc-aliados.webp" alt="">' },
  'inn_cellar_menu':        { icon: '<img src="../shared/img/services/svc-investigar-adega.webp" alt="">' },
  'inn_investigate_cellar': { icon: '<img src="../shared/img/services/svc-investigar-adega.webp" alt="">' },
  // === Tipos de quarto (sub-menu Quartos/Descanso) ===
  'inn_room_stable':        { icon: '<img src="../shared/img/services/svc-estabulo.webp" alt="">' },
  'inn_room_common':        { icon: '<img src="../shared/img/services/svc-dormir-comum.webp" alt="">' },
  'inn_room_modest':        { icon: '<img src="../shared/img/services/svc-dormir-confortavel.webp" alt="">' },
  'inn_room_wealthy':       { icon: '<img src="../shared/img/services/svc-dormir-confortavel.webp" alt="">' },
  'inn_room_royal':         { icon: '<img src="../shared/img/services/svc-dormir-real.webp" alt="">' },
  'inn_sleep_common':       { icon: '<img src="../shared/img/services/svc-dormir-comum.webp" alt="">' },
  'inn_sleep_private':      { icon: '<img src="../shared/img/services/svc-dormir-confortavel.webp" alt="">' },
  'inn_sleep_royal':        { icon: '<img src="../shared/img/services/svc-dormir-real.webp" alt="">' }
};

/* PADRAO_SERVIDOR (sessão #71) — UX: clicar num card abre o diálogo imersivo da
   Martha já no node daquele serviço. Mapeia o svc.cb do grid -> node server-side.
   cb não mapeado (ex.: inn_allies) cai no fallback doAction (comportamento legado). */
var _INN_CARD_NODE = {
  'nav:inn_rest': 'rooms', 'inn_room_menu': 'rooms',
  'nav:inn_meals': 'meal', 'inn_meal_menu': 'meal',
  'inn_relaxation': 'relax', 'inn_relaxation_menu': 'relax',
  'inn_short_rest': 'shortrest'
};

function _isRemote() {
  return !!(window.vCityServer && window.vCityServer.isRemote && window.vCityServer.isRemote());
}

function _innEl(tag, cls, text) {
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  // se text contém tag HTML inline, usar innerHTML (badge "10 <span vi-coin>" etc).
  if (text != null) {
    if (typeof text === 'string' && /<(span|b|i|em|strong|br)\b[^>]*>/.test(text)) {
      el.innerHTML = text;
    } else {
      el.textContent = text;
    }
  }
  return el;
}

function renderInnHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-INN] renderInnHub (PADRAO_SERVIDOR) services=' + (data.services ? data.services.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'inn-hub');

  /* === 1. Cenario canonical === */
  var cenarioEl = vCity.el('div', 'cenario');
  var bg = _innEl('img', 'cenario-bg');
  bg.src = '../shared/img/estalagem/estalagem-banner.webp';
  bg.loading = 'lazy';
  bg.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(bg);
  cenarioEl.appendChild(vCity.el('div', 'candle-glow l'));
  cenarioEl.appendChild(vCity.el('div', 'candle-glow r'));
  var crest = _innEl('img', 'cenario-brasao');
  crest.src = '../shared/img/estalagem/estalagem-crest.webp';
  crest.alt = 'Brasão da Pena-Dourada';
  crest.loading = 'lazy';
  crest.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(crest);
  var titulo = vCity.el('div', 'cenario-titulo');
  titulo.appendChild(_innEl('div', 'name', 'Pena-Dourada'));
  titulo.appendChild(_innEl('div', 'sub', 'Estalagem de Martha · Praça Central'));
  cenarioEl.appendChild(titulo);
  root.appendChild(cenarioEl);

  /* === 2. Body container === */
  var body = vCity.el('div', 'inn-body');
  body.style.cssText = 'padding:8px 12px 0;display:flex;flex-direction:column;gap:7px;';

  /* === 2a. NPC row Martha → abre diálogo server-driven === */
  var npcRow = vCity.el('div', 'row-npc');
  var portraitWrap = vCity.el('div', 'npc-portrait');
  var img = _innEl('img');
  img.src = '../shared/img/npcs/estalajadeira.webp';
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
    // PADRAO_SERVIDOR: o servidor monta o greeting da Martha (estado vivo) e resolve.
    if (typeof window._openCityDialogue === 'function' && _isRemote()) {
      window._openCityDialogue('inn', 'martha');
    } else if (typeof vToast === 'function') {
      vToast('Disponível no jogo.', 'info');
    }
  });
  body.appendChild(npcRow);

  /* === 2b. Rep bar === */
  var renome = (data.renome && typeof data.renome.inn === 'number') ? data.renome.inn : (window._PLAYER_RENOWN && window._PLAYER_RENOWN.inn) || 0;
  var tierLbl = 'NEUTRO';
  if (renome >= 25) tierLbl = 'AMIGÁVEL';
  else if (renome >= 10) tierLbl = 'CORDIAL';
  else if (renome < 0 && renome >= -10) tierLbl = 'FRIO';
  else if (renome < -10) tierLbl = 'HOSTIL';
  var pct = Math.max(0, Math.min(100, Math.round((renome + 10) / 40 * 100)));
  var repBar = vCity.el('div', 'rep-bar');
  repBar.appendChild(_innEl('span', 'label', 'Reputação'));
  var track = vCity.el('div', 'bar');
  var fill = vCity.el('div', 'fill');
  fill.style.width = pct + '%';
  track.appendChild(fill);
  repBar.appendChild(track);
  repBar.appendChild(_innEl('span', 'value', tierLbl + ' · ' + renome));
  body.appendChild(repBar);

  /* === 2c. Flavor === */
  if (data.flavor) {
    var flavor = vCity.el('div', 'inn-flavor');
    flavor.style.cssText = 'font-style:italic;font-size:calc(12px * var(--v-font-scale, 1));color:#a09484;padding:6px 10px;border-left:2px solid rgba(196,149,58,0.3);background:rgba(0,0,0,0.18);border-radius:4px;';
    flavor.innerHTML = data.flavor;
    body.appendChild(flavor);
  }

  /* === 2d. Section label === */
  /* P2 (2026-07-01, emoji ban): sem fleur-de-lis no texto — o ornamento vem
     das linhas douradas do ::before/::after do .pt-section-label. */
  var sectionLbl = vCity.el('div', 'pt-section-label');
  sectionLbl.textContent = 'Serviços da Pena-Dourada';
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
      var _innMeta = INN_SVC_META[svc.cb || ''];
      if (_innMeta && _innMeta.icon) {
        ico.innerHTML = _innMeta.icon;
        ico.style.cssText = 'width:42px;height:42px;display:flex;align-items:center;justify-content:center;';
        var _innMetaImg = ico.querySelector('img');
        if (_innMetaImg) _innMetaImg.style.cssText = 'width:38px;height:38px;object-fit:contain;';
      } else {
        ico.innerHTML = svc.icon || '';
        ico.style.cssText = 'font-size:calc(20px * var(--v-font-scale, 1));';
      }
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
          // PADRAO_SERVIDOR (UX: card abre diálogo imersivo da Martha no node do serviço).
          var node = _INN_CARD_NODE[cb];
          if (node && typeof window._openCityDialogue === 'function' && _isRemote()) {
            window._openCityDialogue('inn', node);
            return;
          }
          // Fallback (cb sem node, ex.: inn_allies/inn_cellar_quest, ou LOCAL): comportamento legado.
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
    wnLbl.textContent = 'Hóspedes';
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

})(); /* end IIFE task #75 */

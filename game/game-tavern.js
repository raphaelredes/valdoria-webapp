/* ============================================================================
 * game-tavern.js — Taverna do Javali Bêbado (PADRAO_TAVERNA + PADRAO_SERVIDOR)
 * ============================================================================
 *
 * Task #27 sessão #14 — refatorado p/ PADRAO_TAVERNA (cenário/rep-bar/services).
 * Sessão #71 (2026-06-02) — PADRAO_SERVIDOR: a narrativa do Grom foi movida para
 *   o SERVIDOR (src/game/city/tavern_dialogue_data.py + city_dialogue_resolver.py).
 *   Este renderer só desenha o hub e ABRE o diálogo server-driven via
 *   window._openCityDialogue('tavern', <node>). ZERO narrativa hardcoded aqui.
 *
 *   FIX importante: os ícones e diálogos antigos usavam cb do MOCKUP
 *   ('tavern_drinks_open' etc.) que NUNCA batiam com os cb reais do backend
 *   ('tavern_drink_menu' etc.) — em produção os cards ficavam SEM ícone e
 *   abriam o menu legado. Agora TAVERN_SVC_META + _TAVERN_CARD_NODE usam os cb
 *   REAIS do backend (tavern.py get_menu svc_structured).
 *
 * NPC: Grom Barba-Cinza. Doc: docs/sistemas/padrao-servidor.md
 *
 * MAPA_IA:
 *   ~30  TAVERN_SVC_META   — svc.cb REAL do backend -> PNG icon path
 *   ~50  _TAVERN_CARD_NODE — svc.cb REAL -> node de diálogo server-driven
 *   ~65  _tavBuildCenario / _tavBuildNpcRow / _tavBuildRepBar / _tavBuildServices
 *   ~200 renderTavernHub(container, data) — entry point
 * ============================================================================ */
'use strict';

(function() {

/* svc.cb REAL do backend (tavern.py:153-165) -> PNG icon canonical. */
var TAVERN_SVC_META = {
  'tavern_rumor':            { icon: '../shared/img/services/svc-rumores.webp',      meta: '5 V · pistas' },
  'tavern_drink_menu':       { icon: '../shared/img/services/svc-bebidas.webp',      meta: 'Recupera HP/MP' },
  'tavern_mercenaries_menu': { icon: '../shared/img/services/svc-mercenarios.webp',  meta: 'Contratar por dia' },
  'tavern_adventurers_menu': { icon: '../shared/img/services/svc-exploradores.webp', meta: 'Especialistas de campo' },
  'tavern_games_menu':       { icon: '../shared/img/services/svc-dados.webp',        meta: 'Apostar nos dados' },
  'tavern_carousing_menu':   { icon: '../shared/img/services/svc-socializar.webp',   meta: 'Fazer contatos' },
  'tavern_gather_menu':      { icon: '../shared/img/services/svc-informacoes.webp',  meta: 'Investigar boatos' },
  'tavern_pitfight_menu':    { icon: '../shared/img/services/svc-rinha.webp',        meta: 'Combate de aposta' },
  'tavern_board_menu':       { icon: '../shared/img/services/svc-mural.webp',        meta: 'Tarefas locais' },
  'tavern_bard_listen':      { icon: '../shared/img/services/svc-bardo.webp',        meta: 'Inspiração: +1d6' }
};

/* PADRAO_SERVIDOR (sessão #71) — svc.cb REAL do backend -> node de diálogo.
   Clicar num card abre o Grom em PADRAO_ALDRIC já no node daquele serviço. */
var _TAVERN_CARD_NODE = {
  'tavern_rumor': 'rumor',
  'tavern_drink_menu': 'drinks',
  'tavern_mercenaries_menu': 'mercenaries',
  'tavern_adventurers_menu': 'adventurers',
  'tavern_games_menu': 'games',
  'tavern_carousing_menu': 'carousing',
  'tavern_gather_menu': 'gather',
  'tavern_pitfight_menu': 'pitfight',
  'tavern_board_menu': 'bulletin',
  'tavern_bard_listen': 'bard'
};

function _isRemote() {
  return !!(window.vCityServer && window.vCityServer.isRemote && window.vCityServer.isRemote());
}

/* === Cenário canonical ============================================== */
function _tavBuildCenario(data) {
  var cenarioEl = vCity.el('div', 'cenario');
  var bg = vCity.el('img', 'cenario-bg');
  bg.src = '../shared/img/taverna/javali-negro-banner.webp';
  bg.alt = '';
  bg.loading = 'lazy';
  bg.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(bg);
  cenarioEl.appendChild(vCity.el('div', 'candle-glow l'));
  cenarioEl.appendChild(vCity.el('div', 'candle-glow r'));
  var crest = vCity.el('img', 'cenario-brasao');
  crest.src = '../shared/img/taverna/javali-negro-crest.webp';
  crest.alt = 'Brasão do Javali Bêbado';
  crest.loading = 'lazy';
  crest.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(crest);
  var titulo = vCity.el('div', 'cenario-titulo');
  var nameEl = vCity.el('div', 'name');
  nameEl.textContent = 'Taverna do Javali Bêbado';
  titulo.appendChild(nameEl);
  var subEl = vCity.el('div', 'sub');
  subEl.textContent = 'Estabelecimento de Grom Barba-Cinza · Bairro do Mercado';
  titulo.appendChild(subEl);
  cenarioEl.appendChild(titulo);
  return cenarioEl;
}

/* === NPC row — Grom → abre diálogo server-driven =========================== */
function _tavBuildNpcRow(data) {
  var row = vCity.el('div', 'row-npc');
  var portraitWrap = vCity.el('div', 'npc-portrait');
  var img = vCity.el('img');
  img.src = '../shared/img/npcs/taverneiro.webp';
  img.alt = 'Grom Barba-Cinza';
  img.loading = 'lazy';
  img.onerror = function(){ this.style.display = 'none'; };
  portraitWrap.appendChild(img);
  row.appendChild(portraitWrap);

  var info = vCity.el('div', 'npc-info');
  var name = vCity.el('div', 'name');
  name.textContent = 'Grom Barba-Cinza';
  info.appendChild(name);
  var quote = vCity.el('div', 'quote');
  quote.textContent = '"Senta antes que eu mude de ideia."';
  info.appendChild(quote);
  row.appendChild(info);

  var chev = vCity.el('div', 'npc-chev');
  chev.textContent = '›';
  row.appendChild(chev);

  row.addEventListener('click', function(){
    if (typeof window._openCityDialogue === 'function' && _isRemote()) {
      window._openCityDialogue('tavern', 'grom');
    } else if (typeof vToast === 'function') {
      vToast('Disponível no jogo.', 'info');
    }
  });
  return row;
}

/* === Reputation bar canonical (.rep-bar) ================================== */
function _tavBuildRepBar(data) {
  var renome = 0;
  if (data && data.renome && typeof data.renome.tavern === 'number') renome = data.renome.tavern;
  else if (window._PLAYER_RENOWN && typeof window._PLAYER_RENOWN.tavern === 'number') renome = window._PLAYER_RENOWN.tavern;

  var tier = 'NEUTRO';
  if (renome >= 25) tier = 'AMIGÁVEL';
  else if (renome >= 10) tier = 'CORDIAL';
  else if (renome < 0 && renome >= -10) tier = 'FRIO';
  else if (renome < -10) tier = 'HOSTIL';

  var pct = Math.max(0, Math.min(100, Math.round((renome + 10) / 40 * 100)));

  var bar = vCity.el('div', 'rep-bar');
  var lbl = vCity.el('span', 'label');
  lbl.textContent = 'Reputação';
  bar.appendChild(lbl);
  var track = vCity.el('div', 'bar');
  var fill = vCity.el('div', 'fill');
  fill.style.width = pct + '%';
  track.appendChild(fill);
  bar.appendChild(track);
  var val = vCity.el('span', 'value');
  val.textContent = tier + ' · ' + renome;
  bar.appendChild(val);
  return bar;
}

/* === Services canonical (.services + .svc) — card abre diálogo server-driven = */
function _tavBuildServices(services) {
  var grid = vCity.el('div', 'services');
  (services || []).forEach(function(svc) {
    var card = vCity.el('div', 'svc');
    if (svc.disabled) card.classList.add('disabled');
    card.setAttribute('data-svc', svc.cb || '');

    var meta = TAVERN_SVC_META[svc.cb] || {};

    if (svc.badge) {
      var badge = vCity.el('div', 'svc-badge');
      badge.textContent = svc.badge;
      card.appendChild(badge);
    }

    var ico = vCity.el('div', 'svc-ico');
    if (meta.icon) {
      var img = vCity.el('img');
      img.src = meta.icon;
      img.alt = '';
      img.loading = 'lazy';
      img.onerror = function(){ this.style.display = 'none'; };
      ico.appendChild(img);
    }
    card.appendChild(ico);

    var txt = vCity.el('div', 'svc-text');
    var name = vCity.el('div', 'svc-name');
    name.textContent = svc.label || '';
    txt.appendChild(name);
    var metaTxt = vCity.el('div', 'svc-meta');
    var costText = svc.cost !== undefined ? (svc.cost === 0 ? 'Grátis' : String(svc.cost) + ' V') : '';
    metaTxt.textContent = (meta.meta && costText) ? (costText + ' · ' + meta.meta) : (meta.meta || costText);
    txt.appendChild(metaTxt);
    card.appendChild(txt);

    if (svc.cb && !svc.disabled) {
      card.addEventListener('click', (function(cb){ return function(){
        // PADRAO_SERVIDOR: card abre o Grom no node do serviço.
        var node = _TAVERN_CARD_NODE[cb];
        if (node && typeof window._openCityDialogue === 'function' && _isRemote()) {
          window._openCityDialogue('tavern', node);
          return;
        }
        // Fallback (cb sem node ou LOCAL): comportamento legado.
        if (typeof vCity.act === 'function') vCity.act(cb);
        else if (typeof window.handleAction === 'function') window.handleAction(cb);
      }; })(svc.cb));
    }

    grid.appendChild(card);
  });
  return grid;
}

/* === renderTavernHub entry point ========================================== */
function renderTavernHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-TAVERN] renderTavernHub (PADRAO_SERVIDOR) services=' + (data.services ? data.services.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'tav-hub');
  root.appendChild(_tavBuildCenario(data));

  var body = vCity.el('div', 'tav-body');
  body.style.cssText = 'padding:8px 12px 0;display:flex;flex-direction:column;gap:7px;';

  body.appendChild(_tavBuildNpcRow(data));
  body.appendChild(_tavBuildRepBar(data));

  if (data.flavor) {
    var flavor = vCity.el('div', 'tav-flavor');
    flavor.style.cssText = 'font-style:italic;font-size:calc(12px * var(--v-font-scale, 1));color:#a09484;padding:6px 10px;border-left:2px solid rgba(196,149,58,0.3);background:rgba(0,0,0,0.18);border-radius:4px';
    flavor.textContent = vCity.stripTags(data.flavor);
    body.appendChild(flavor);
  }

  var sectionLbl = vCity.el('div', 'pt-section-label');
  sectionLbl.textContent = '⚜ No balcão e na sala ⚜';
  body.appendChild(sectionLbl);

  if (data.services && data.services.length) {
    body.appendChild(_tavBuildServices(data.services));
  }

  root.appendChild(body);
  container.appendChild(root);
}

window.renderTavernHub = renderTavernHub;

})();

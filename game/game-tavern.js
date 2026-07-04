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
 *   FIX (sessão #71): o HUB renderiza do _buildTavernMockData (cidade/index.html),
 *   cujos cb são 'tavern_<svc>_open'. Portanto TAVERN_SVC_META + _TAVERN_CARD_NODE
 *   são keyed NESSES cb (do mock builder) — NÃO nos '_menu' do process_action. Os
 *   cb reais de efeito/transição vivem DENTRO dos nodes (server-side).
 *
 *   Sessão #72: o boato simples ('tavern_rumor_buy' / node 'rumor') foi REMOVIDO —
 *   o boato canônico é a XGtE Gather Info ('tavern_gather_open' → node 'gather').
 *
 * NPC: Grom, o Caolho. Doc: docs/sistemas/padrao-servidor.md
 *
 * MAPA_IA:
 *   ~30  TAVERN_SVC_META   — svc.cb REAL do backend -> PNG icon path
 *   ~50  _TAVERN_CARD_NODE — svc.cb REAL -> node de diálogo server-driven
 *   ~65  _tavBuildCenario / _tavBuildNpcRow / _tavBuildRepBar / _tavBuildServices
 *   ~200 renderTavernHub(container, data) — entry point
 * ============================================================================ */
'use strict';

(function() {

/* svc.cb do hub (cidade/index.html _buildTavernMockData, replica tavern.py get_menu)
   -> PNG icon canonical. ATENÇÃO: o hub renderiza do MOCK builder, cujos cb são
   'tavern_<svc>_open' / 'tavern_drinks_open' — NÃO os '_menu' do process_action.
   Manter estes em sincronia com _buildTavernMockData. (Boato simples removido #72.) */
var TAVERN_SVC_META = {
  'tavern_drinks_open':      { icon: '../shared/img/services/svc-bebidas.webp',      meta: 'Recupera HP/MP' },
  'tavern_mercenaries_open': { icon: '../shared/img/services/svc-mercenarios.webp',  meta: 'Contratar por dia' },
  'tavern_adventurers_open': { icon: '../shared/img/services/svc-exploradores.webp', meta: 'Especialistas de campo' },
  'tavern_games_open':       { icon: '../shared/img/services/svc-dados.webp',        meta: 'Apostar nos dados' },
  'tavern_carousing_open':   { icon: '../shared/img/services/svc-socializar.webp',   meta: 'Fazer contatos' },
  'tavern_gather_open':      { icon: '../shared/img/services/svc-informacoes.webp',  meta: 'Investigar boatos' },
  'tavern_pitfight_open':    { icon: '../shared/img/services/svc-rinha.webp',        meta: 'Combate de aposta' },
  'tavern_bulletin_open':    { icon: '../shared/img/services/svc-mural.webp',        meta: 'Tarefas locais' },
  'tavern_bard_open':        { icon: '../shared/img/services/svc-bardo.webp',        meta: 'Inspiração: +1d6' }
};

/* PADRAO_SERVIDOR (sessão #71) — svc.cb do hub (tavern_*_open, do _buildTavernMockData)
   -> node de diálogo. Clicar num card abre o Grom em PADRAO_ALDRIC nesse node. Os cb
   reais de EFEITO/transição (tavern_buy_drink_*, tavern_games_menu) vivem DENTRO dos
   nodes (server-side) — aqui só mapeamos a cb do card -> node. */
var _TAVERN_CARD_NODE = {
  'tavern_drinks_open': 'drinks',
  'tavern_mercenaries_open': 'mercenaries',
  'tavern_adventurers_open': 'adventurers',
  'tavern_games_open': 'games',
  'tavern_carousing_open': 'carousing',
  'tavern_gather_open': 'gather',
  'tavern_pitfight_open': 'pitfight',
  'tavern_bulletin_open': 'bulletin',
  'tavern_bard_open': 'bard'
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
  subEl.textContent = 'Estabelecimento de Grom, o Caolho · Bairro do Mercado';
  titulo.appendChild(subEl);
  cenarioEl.appendChild(titulo);
  return cenarioEl;
}

/* === NPC row — Grom → abre diálogo server-driven =========================== */
function _tavBuildNpcRow(data) {
  var row = vCity.el('div', 'row-npc');
  var portraitWrap = vCity.el('div', 'npc-portrait');
  var img = vCity.el('img');
  img.src = '../shared/img/npcs/grom-o-caolho-v2.webp';  // retrato canônico do anão caolho (era o genérico taverneiro.webp)
  img.alt = 'Grom, o Caolho';
  img.loading = 'lazy';
  img.onerror = function(){ this.style.display = 'none'; };
  portraitWrap.appendChild(img);
  row.appendChild(portraitWrap);

  var info = vCity.el('div', 'npc-info');
  var name = vCity.el('div', 'name');
  name.textContent = 'Grom, o Caolho';
  info.appendChild(name);
  var quote = vCity.el('div', 'quote');
  // B1 (anti-repeat): teaser rotativo do Grom (o diálogo real é server-driven ao clicar).
  // Rotação por índice persistido — não repete a mesma linha em visitas seguidas.
  var _gromTeasers = [
    '"Senta antes que eu mude de ideia."',
    '"Bebida, boato ou briga? Escolhe um."',
    '"Fala logo. O caneco não enche sozinho."',
    '"Cara nova. Ou cara velha que eu esqueci."',
    '"Aqui ninguém bebe de graça, nem eu."'
  ];
  var _gt = (typeof window._gromTeaserIdx === 'number') ? (window._gromTeaserIdx + 1) : 0;
  window._gromTeaserIdx = _gt % _gromTeasers.length;
  quote.textContent = _gromTeasers[window._gromTeaserIdx];
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
    } else if (svc.icon) {
      ico.innerHTML = svc.icon; // fallback: ícone do mock builder (heráldico) se não há PNG meta
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
  sectionLbl.textContent = 'No balcão e na sala ';
  body.appendChild(sectionLbl);

  if (data.services && data.services.length) {
    body.appendChild(_tavBuildServices(data.services));
  }

  root.appendChild(body);
  container.appendChild(root);
}

window.renderTavernHub = renderTavernHub;

})();

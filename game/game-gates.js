/* ============================================================================
 * game-gates.js — Portões de Valdoria (PADRAO_LOCAIS + PADRAO_SERVIDOR)
 * ============================================================================
 *
 * P1 auditoria qualidade cidade (2026-07-01): era um renderer cru de 31 linhas
 * (sem cenário, sem NPC, sem rep-bar) — a ÚNICA tela hub NÃO CONFORME junto com
 * o Festival. Refatorado pro template canonical (game-tavern.js/game-inn.js):
 * cenário banner+crest WebP, NPC row Guarda Aldric (retrato guarda-aldric.webp,
 * clique abre diálogo server-driven via _openCityDialogue('gates','aldric')),
 * rep-bar, grid .services/.svc com ícones WebP e viajantes (wandering NPCs).
 * ZERO narrativa hardcoded aqui — a fala do Aldric vive no SERVIDOR
 * (src/game/city/gates_dialogue_data.py + city_dialogue_resolver).
 *
 * NPC: Guarda Aldric. Render: cidade/index.html (dispatch key === 'gates').
 *
 * MAPA_IA:
 *   ~30  GTS_SVC_META      — svc.cb -> WebP icon + meta desc
 *   ~45  _gtsBuildCenario  — banner portoes-banner.webp + crest + título
 *   ~70  _gtsBuildNpcRow   — Aldric → _openCityDialogue('gates','aldric')
 *   ~100 _gtsBuildRepBar   — renome.gates (tiers canonical)
 *   ~125 renderGatesHub(container, data) — entry point
 * ============================================================================ */
'use strict';

(function() {

/* svc.cb do hub (cidade/index.html _buildGatesMockData / backend gates_data)
   -> ícone WebP canonical + meta. 'Falar com Aldric' NÃO entra no grid — a
   NPC row cobre (mesmo padrão Martha/Grom). */
var GTS_SVC_META = {
  'gates_explore':        { icon: '../shared/img/services/svc-explorar.webp',    meta: 'Explorar os arredores' },
  'open_cartografia':     { icon: '../shared/img/services/svc-mapas.webp',       meta: 'Viajar pelo reino' },
  'open_daily_challenge': { icon: '../shared/img/services/svc-combate-solo.webp', meta: 'Prova de combate do dia' },
  'gates_prep_open':      { icon: '../shared/img/services/svc-mantimentos.webp', meta: 'Suprimentos de estrada' },
  'action_talk_guard':    { icon: '../shared/img/services/svc-informacoes.webp', meta: 'Novidades da guarda' },
  'action_explore_step':  { icon: '../shared/img/services/svc-explorar.webp',    meta: 'Explorar os arredores' }
};

function _gtsIsRemote() {
  return !!(window.vCityServer && window.vCityServer.isRemote && window.vCityServer.isRemote());
}

/* === Cenário canonical (banner + crest + título) ========================== */
function _gtsBuildCenario(data) {
  var cenarioEl = vCity.el('div', 'cenario');
  var bg = vCity.el('img', 'cenario-bg');
  bg.src = '../shared/img/portoes/portoes-banner.webp';
  bg.alt = '';
  bg.loading = 'lazy';
  bg.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(bg);
  cenarioEl.appendChild(vCity.el('div', 'candle-glow l'));
  cenarioEl.appendChild(vCity.el('div', 'candle-glow r'));
  var crest = vCity.el('img', 'cenario-brasao');
  crest.src = '../shared/img/portoes/portoes-crest.webp';
  crest.alt = 'Brasão da Guarda de Valdoria';
  crest.loading = 'lazy';
  crest.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(crest);
  var titulo = vCity.el('div', 'cenario-titulo');
  var nameEl = vCity.el('div', 'name');
  nameEl.textContent = 'Portões de Valdoria';
  titulo.appendChild(nameEl);
  var subEl = vCity.el('div', 'sub');
  subEl.textContent = 'Guarda da Muralha · Fronteira da cidade';
  titulo.appendChild(subEl);
  cenarioEl.appendChild(titulo);
  return cenarioEl;
}

/* === NPC row — Guarda Aldric → diálogo server-driven ====================== */
function _gtsBuildNpcRow(data) {
  var row = vCity.el('div', 'row-npc');
  var portraitWrap = vCity.el('div', 'npc-portrait');
  var img = vCity.el('img');
  img.src = '../shared/img/npcs/guarda-aldric.webp';
  img.alt = 'Guarda Aldric';
  img.loading = 'lazy';
  img.onerror = function(){ this.style.display = 'none'; };
  portraitWrap.appendChild(img);
  row.appendChild(portraitWrap);

  var info = vCity.el('div', 'npc-info');
  var name = vCity.el('div', 'name');
  name.textContent = 'Guarda Aldric';
  info.appendChild(name);
  var quote = vCity.el('div', 'quote');
  quote.textContent = '"Quem passa por aqui, passa contado."';
  info.appendChild(quote);
  row.appendChild(info);

  var chev = vCity.el('div', 'npc-chev');
  chev.textContent = '›';
  row.appendChild(chev);

  row.addEventListener('click', function(){
    // PADRAO_SERVIDOR: o servidor monta a saudação rotativa do Aldric e resolve.
    if (typeof window._openCityDialogue === 'function' && _gtsIsRemote()) {
      window._openCityDialogue('gates', 'aldric');
    } else if (typeof vToast === 'function') {
      vToast('Disponível no jogo.', 'info');
    }
  });
  return row;
}

/* === Reputation bar canonical (.rep-bar) ================================== */
function _gtsBuildRepBar(data) {
  var renome = 0;
  if (data && data.renome && typeof data.renome.gates === 'number') renome = data.renome.gates;
  else if (window._PLAYER_RENOWN && typeof window._PLAYER_RENOWN.gates === 'number') renome = window._PLAYER_RENOWN.gates;

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

/* === renderGatesHub entry point =========================================== */
function renderGatesHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-GATES] renderGatesHub (PADRAO_LOCAIS) actions=' + (data.actions ? data.actions.length : 0) + ' wnpcs=' + (data.wandering_npcs ? data.wandering_npcs.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'gts-hub');
  root.appendChild(_gtsBuildCenario(data));

  var body = vCity.el('div', 'gts-body');
  body.style.cssText = 'padding:8px 12px 0;display:flex;flex-direction:column;gap:7px;';

  body.appendChild(_gtsBuildNpcRow(data));
  body.appendChild(_gtsBuildRepBar(data));

  /* Flavor (primeiras visitas) */
  if (data.flavor) {
    var flavor = vCity.el('div', 'gts-flavor');
    flavor.style.cssText = 'font-style:italic;font-size:calc(12px * var(--v-font-scale, 1));color:#a09484;padding:6px 10px;border-left:2px solid rgba(196,149,58,0.3);background:rgba(0,0,0,0.18);border-radius:4px';
    flavor.textContent = vCity.stripTags(data.flavor);
    body.appendChild(flavor);
  }

  /* Section label + services grid (.services/.svc canonical) */
  /* Sem fleur-de-lis no texto (emoji ban 2026-06-24): o ornamento vem das
     linhas douradas do ::before/::after do .pt-section-label (padrao-taverna.css). */
  var sectionLbl = vCity.el('div', 'pt-section-label');
  sectionLbl.textContent = 'Na guarita';
  body.appendChild(sectionLbl);

  var actions = (data.actions || []).filter(function(a){
    // NPC row cobre o "Falar com Aldric" — não duplicar no grid
    return a && a.cb && a.cb.indexOf('gates_npc_') !== 0 && a.cb !== 'action_talk_guard';
  });
  if (actions.length) {
    var grid = vCity.el('div', 'services');
    actions.forEach(function(svc) {
      var card = vCity.el('div', 'svc');
      if (svc.disabled) card.classList.add('disabled');
      card.setAttribute('data-svc', svc.cb || '');

      var meta = GTS_SVC_META[svc.cb] || {};
      if (svc.quest) {
        var badge = vCity.el('div', 'svc-badge');
        badge.textContent = 'Missão';
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
      } else if (svc.icon && String(svc.icon).indexOf('<') === 0) {
        ico.innerHTML = svc.icon; // fallback: ícone heráldico do mock builder
      }
      card.appendChild(ico);

      var txt = vCity.el('div', 'svc-text');
      var name = vCity.el('div', 'svc-name');
      name.textContent = svc.label || '';
      txt.appendChild(name);
      var metaTxt = vCity.el('div', 'svc-meta');
      metaTxt.textContent = meta.meta || svc.desc || '';
      txt.appendChild(metaTxt);
      card.appendChild(txt);

      if (svc.cb && !svc.disabled) {
        card.addEventListener('click', (function(cb){ return function(){
          if (typeof vCity.act === 'function') vCity.act(cb);
          else if (typeof doAction === 'function') doAction(cb);
        }; })(svc.cb));
      }
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  /* Viajantes (wandering NPCs) */
  if (data.wandering_npcs && data.wandering_npcs.length) {
    var wnLbl = vCity.el('div', 'pt-section-label');
    wnLbl.textContent = 'Viajantes';
    body.appendChild(wnLbl);
    body.appendChild(vCity.actionList(data.wandering_npcs));
  }

  root.appendChild(body);
  container.appendChild(root);
}

window.renderGatesHub = renderGatesHub;

})();

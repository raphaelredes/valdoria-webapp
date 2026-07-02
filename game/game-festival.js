/* ============================================================================
 * game-festival.js — Festivais de Valdoria (PADRAO_LOCAIS + PADRAO_SERVIDOR)
 * ============================================================================
 *
 * P1 auditoria qualidade cidade (2026-07-01): era lista crua (header + botões,
 * emojis hardcoded, sem NPC anfitrião) — NÃO CONFORME junto com os Portões.
 * Refatorado pro template canonical (game-tavern.js/game-inn.js): cenário
 * banner+crest WebP, NPC row Olmiro o Festeiro (retrato olmiro-festeiro.webp,
 * clique abre diálogo server-driven via _openCityDialogue('festival','olmiro')),
 * rep-bar, grid .services/.svc das provas com ícones WebP + comerciante + saldo.
 * ZERO narrativa hardcoded aqui — a fala do Olmiro vive no SERVIDOR
 * (src/game/city/festival_dialogue_data.py + city_dialogue_resolver); as provas
 * seguem server-authoritative (service.festival_event via cb existente).
 *
 * NPC: Olmiro, o Festeiro. Render: cidade/index.html (dispatch key === 'festival').
 *
 * MAPA_IA:
 *   ~30  FST_EVENT_META    — event id -> WebP icon (svc-*)
 *   ~55  _fstBuildCenario  — banner + crest + nome do festival ativo + dia X de Y
 *   ~85  _fstBuildNpcRow   — Olmiro → _openCityDialogue('festival','olmiro')
 *   ~115 _fstBuildRepBar   — renome.festival (tiers canonical)
 *   ~140 renderFestivalHub(container, data) — entry point
 * ============================================================================ */
'use strict';

(function() {

/* event id (sufixo do cb 'festival_event_<id>') -> ícone WebP canonical.
   Cobre os 12 minigames dos 4 festivais (festival_data.py FESTIVAL_EVENTS). */
var FST_EVENT_META = {
  'arm_wrestling':    '../shared/img/services/svc-duelo.webp',
  'smithing_trivia':  '../shared/img/services/svc-forjar.webp',
  'iron_endurance':   '../shared/img/services/svc-treino.webp',
  'fortune_telling':  '../shared/img/services/svc-oraculo.webp',
  'star_riddles':     '../shared/img/services/svc-decifrar.webp',
  'dance_contest':    '../shared/img/services/svc-socializar.webp',
  'eating_contest':   '../shared/img/services/svc-comer.webp',
  'archery':          '../shared/img/services/svc-bestas.webp',
  'storytelling':     '../shared/img/services/svc-bardo.webp',
  'drinking_contest': '../shared/img/services/svc-bebidas.webp',
  'riddle_master':    '../shared/img/services/svc-decifrar.webp',
  'lantern_race':     '../shared/img/services/svc-torneio.webp'
};
var FST_MERCHANT_ICON = '../shared/img/services/svc-vendor-ambulante.webp';
var FST_FALLBACK_ICON = '../shared/img/services/svc-torneio.webp';

function _fstIsRemote() {
  return !!(window.vCityServer && window.vCityServer.isRemote && window.vCityServer.isRemote());
}

/* === Cenário canonical (banner + crest + festival ativo) =================== */
function _fstBuildCenario(data) {
  var cenarioEl = vCity.el('div', 'cenario');
  var bg = vCity.el('img', 'cenario-bg');
  bg.src = '../shared/img/festival/festival-banner.webp';
  bg.alt = '';
  bg.loading = 'lazy';
  bg.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(bg);
  cenarioEl.appendChild(vCity.el('div', 'candle-glow l'));
  cenarioEl.appendChild(vCity.el('div', 'candle-glow r'));
  var crest = vCity.el('img', 'cenario-brasao');
  crest.src = '../shared/img/festival/festival-crest.webp';
  crest.alt = 'Brasão dos Festivais de Valdoria';
  crest.loading = 'lazy';
  crest.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(crest);
  var titulo = vCity.el('div', 'cenario-titulo');
  var nameEl = vCity.el('div', 'name');
  nameEl.textContent = data.fest_name || 'Festival de Valdoria';
  titulo.appendChild(nameEl);
  var subEl = vCity.el('div', 'sub');
  var dayTxt = (data.day_num && data.total_days)
    ? ('Dia ' + data.day_num + ' de ' + data.total_days + ' · ') : '';
  subEl.textContent = dayTxt + 'Olmiro, o Festeiro · Praça Central';
  titulo.appendChild(subEl);
  cenarioEl.appendChild(titulo);
  return cenarioEl;
}

/* === NPC row — Olmiro → diálogo server-driven ============================= */
function _fstBuildNpcRow(data) {
  var row = vCity.el('div', 'row-npc');
  var portraitWrap = vCity.el('div', 'npc-portrait');
  var img = vCity.el('img');
  img.src = '../shared/img/npcs/olmiro-festeiro.webp';
  img.alt = 'Olmiro, o Festeiro';
  img.loading = 'lazy';
  img.onerror = function(){ this.style.display = 'none'; };
  portraitWrap.appendChild(img);
  row.appendChild(portraitWrap);

  var info = vCity.el('div', 'npc-info');
  var name = vCity.el('div', 'name');
  name.textContent = 'Olmiro, o Festeiro';
  info.appendChild(name);
  var quote = vCity.el('div', 'quote');
  quote.textContent = '"Toda festa desta Praça passa pelas minhas mãos."';
  info.appendChild(quote);
  row.appendChild(info);

  var chev = vCity.el('div', 'npc-chev');
  chev.textContent = '›';
  row.appendChild(chev);

  row.addEventListener('click', function(){
    // PADRAO_SERVIDOR: saudação rotativa do Olmiro (festival ativo OU preparativos).
    if (typeof window._openCityDialogue === 'function' && _fstIsRemote()) {
      window._openCityDialogue('festival', 'olmiro');
    } else if (typeof vToast === 'function') {
      vToast('Disponível no jogo.', 'info');
    }
  });
  return row;
}

/* === Reputation bar canonical (.rep-bar) ================================== */
function _fstBuildRepBar(data) {
  var renome = 0;
  if (data && data.renome && typeof data.renome.festival === 'number') renome = data.renome.festival;
  else if (window._PLAYER_RENOWN && typeof window._PLAYER_RENOWN.festival === 'number') renome = window._PLAYER_RENOWN.festival;

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

/* === Card .svc de prova/comerciante ======================================= */
function _fstBuildSvcCard(opts) {
  var card = vCity.el('div', 'svc');
  if (opts.done) card.classList.add('disabled');
  card.setAttribute('data-svc', opts.cb || '');

  if (opts.done) {
    var badge = vCity.el('div', 'svc-badge');
    badge.textContent = '✓ Feito';
    card.appendChild(badge);
  }

  var ico = vCity.el('div', 'svc-ico');
  var img = vCity.el('img');
  img.src = opts.icon;
  img.alt = '';
  img.loading = 'lazy';
  img.onerror = function(){ this.style.display = 'none'; };
  ico.appendChild(img);
  card.appendChild(ico);

  var txt = vCity.el('div', 'svc-text');
  var name = vCity.el('div', 'svc-name');
  name.textContent = opts.name || '';
  txt.appendChild(name);
  var metaTxt = vCity.el('div', 'svc-meta');
  if (opts.done) {
    metaTxt.textContent = 'Prova concluída neste festival';
  } else if (typeof opts.cost === 'number') {
    metaTxt.innerHTML = opts.cost + ' <span class="vi vi-coin sm"></span> · ' + (opts.meta || 'Prova do festival');
  } else {
    metaTxt.textContent = opts.meta || '';
  }
  txt.appendChild(metaTxt);
  card.appendChild(txt);

  if (opts.cb && !opts.done) {
    card.addEventListener('click', function(){
      if (typeof vCity.act === 'function') vCity.act(opts.cb);
      else if (typeof doAction === 'function') doAction(opts.cb);
    });
  }
  return card;
}

/* === renderFestivalHub entry point ======================================== */
function renderFestivalHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-FEST] renderFestivalHub (PADRAO_LOCAIS) name=' + data.fest_name + ' day=' + data.day_num);
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'fst-hub');
  root.appendChild(_fstBuildCenario(data));

  var body = vCity.el('div', 'fst-body');
  body.style.cssText = 'padding:8px 12px 0;display:flex;flex-direction:column;gap:7px;';

  body.appendChild(_fstBuildNpcRow(data));
  body.appendChild(_fstBuildRepBar(data));

  /* Intro do festival ativo */
  if (data.fest_intro) {
    var intro = vCity.el('div', 'fst-flavor');
    intro.style.cssText = 'font-style:italic;font-size:calc(12px * var(--v-font-scale, 1));color:#a09484;padding:6px 10px;border-left:2px solid rgba(196,149,58,0.3);background:rgba(0,0,0,0.18);border-radius:4px';
    intro.textContent = vCity.stripTags(data.fest_intro);
    body.appendChild(intro);
  }

  /* Provas do festival (.services/.svc canonical) */
  if (data.events && data.events.length) {
    /* Sem fleur-de-lis no texto (emoji ban 2026-06-24): ornamento via CSS. */
    var sectionLbl = vCity.el('div', 'pt-section-label');
    sectionLbl.textContent = 'Provas do Festival';
    body.appendChild(sectionLbl);

    var grid = vCity.el('div', 'services');
    for (var i = 0; i < data.events.length; i++) {
      var ev = data.events[i];
      var evId = ev.id || ((ev.cb || '').indexOf('festival_event_') === 0
        ? ev.cb.slice('festival_event_'.length) : '');
      grid.appendChild(_fstBuildSvcCard({
        cb: ev.played ? '' : ev.cb,
        icon: FST_EVENT_META[evId] || FST_FALLBACK_ICON,
        name: ev.name,
        cost: ev.cost,
        meta: 'Prova do festival',
        done: !!ev.played
      }));
    }
    /* Comerciante do Festival — raridades da semana */
    grid.appendChild(_fstBuildSvcCard({
      cb: 'festival_merchant',
      icon: FST_MERCHANT_ICON,
      name: 'Comerciante do Festival',
      meta: 'Raridades só nesta semana',
      done: false
    }));
    body.appendChild(grid);
  }

  /* Saldo */
  if (data.gold !== undefined) {
    body.appendChild(vCity.goldBalance(data.gold));
  }

  root.appendChild(body);
  container.appendChild(root);
}

window.renderFestivalHub = renderFestivalHub;

})();

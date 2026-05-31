/* game-square.js — Town Square popup renderer */
'use strict';

/* 2026-05-21 — SQUARE_SVC_META map cb -> PNG canonical (Praca Central).
   PNGs em valdoria-webapp/shared/img/services/ — 4 gerados via OpenAI
   _gen_misc_services_pngs.py (low quality, $0.04 cada). */
var SQUARE_SVC_META = {
  'square_bulletin_open':   { icon: '<img src="../shared/img/services/svc-mural.webp" alt="">' },
  'square_bulletin_claim':  { icon: '<img src="../shared/img/services/svc-missoes.webp" alt="">' },
  'square_bulletin_help':   { icon: '<img src="../shared/img/services/svc-informacoes.webp" alt="">' },
  'square_mural':           { icon: '<img src="../shared/img/services/svc-mural.webp" alt="">' },
  'square_gamble_open':     { icon: '<img src="../shared/img/services/svc-apostas.webp" alt="">' },
  'square_gamble':          { icon: '<img src="../shared/img/services/svc-apostas.webp" alt="">' },
  'square_vendor_open':     { icon: '<img src="../shared/img/services/svc-vendor-ambulante.webp" alt="">' },
  'square_vendor':          { icon: '<img src="../shared/img/services/svc-vendor-ambulante.webp" alt="">' },
  'square_explore':         { icon: '<img src="../shared/img/services/svc-explorar.webp" alt="">' },
  'square_investigate':     { icon: '<img src="../shared/img/services/svc-investigar.webp" alt="">' },
  'square_work_menu':       { icon: '<img src="../shared/img/services/svc-trabalho.webp" alt="">' },
  'square_work':            { icon: '<img src="../shared/img/services/svc-trabalho.webp" alt="">' }
};
window._SQUARE_SVC_META = SQUARE_SVC_META;

function renderSquareHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-SQUARE] renderSquareHub services=' + (data.services ? data.services.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'sqr-hub');

  /* Flavor text */
  if (data.flavor) {
    var flavor = vCity.el('div', 'sqr-flavor');
    flavor.textContent = vCity.stripTags(data.flavor);
    root.appendChild(flavor);
  }

  /* Reputation + buff */
  if (data.rep_label || data.buff) {
    var info = vCity.el('div', 'sqr-info');
    if (data.rep_label) info.textContent = data.rep_label;
    if (data.buff) info.textContent += (data.rep_label ? '  |  ' : '') + data.buff;
    root.appendChild(info);
  }

  /* Services grid — aplica SQUARE_SVC_META mapping antes de renderizar. */
  if (data.services && data.services.length) {
    var svcsWithPng = data.services.map(function(svc){
      var meta = SQUARE_SVC_META[svc.cb];
      if (meta && meta.icon) {
        var copy = {}; for (var k in svc) copy[k] = svc[k];
        copy.icon = meta.icon;
        return copy;
      }
      return svc;
    });
    root.appendChild(vCity.serviceGrid(svcsWithPng));
  }

  container.appendChild(root);
}

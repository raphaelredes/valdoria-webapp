/**
 * icons-resolver.js — Troca ícones heráldicos NÃO-item (`<svg><use href="#ic-X">`)
 * por <img> WebP gerado pela OpenAI. Espelha `items-resolver.js` (que cuida de
 * `ic-it-*`), mas para classes/raças/NPCs/glifos de nav/stats/conquistas.
 *
 * REGRA (CLAUDE.md "Tudo Visível é Imagem OpenAI, não SVG" — 2026-06-12 rev.2):
 *   TODO SVG visível do jogo vira imagem OpenAI via <img>. Única exceção: a
 *   Esfera Dourada (logo/favicon, incl. 3D) e os dados 3D (THREE.js). Este
 *   módulo elimina os ícones heráldicos `ic-*` (não-item) das telas do jogador.
 *
 * Como funciona (igual ao items-resolver):
 *   - MutationObserver varre o DOM e substitui todo `<svg><use href="#ic-X">`
 *     (onde X está em ICON_MAP) por `<img src=".../X.webp">`.
 *   - Pula entradas dentro de `<defs>` (as definições `<symbol>` ficam, inertes).
 *   - Não toca em `ic-it-*` (delegado ao items-resolver).
 *
 * API:
 *   vIcons.upgrade(rootEl?)   — varre e troca SVG→IMG (retorna nº trocado)
 *   vIcons.iconHTML(slug,alt) — string `<img>` pronta (ou '' se slug desconhecido)
 *   vIcons.has(slug)          — true se o ícone tem WebP mapeado
 */
(function (global) {
  'use strict';

  var SPRITE_PREFIX = 'ic-';

  /* slug (sem o `ic-`) → subpath sob shared/img/. Todos já existem como WebP
     gerado pela OpenAI (verificado 2026-06-12: 32/32). */
  var ICON_MAP = {
    // Classes (retrato de combate)
    'mago': 'combat/mago.webp',
    'clerigo': 'combat/clerigo.webp',
    'guerreiro': 'combat/guerreiro.webp',
    'ladino': 'combat/ladino.webp',
    'bardo': 'combat/bardo.webp',
    'bruxo': 'combat/bruxo.webp',
    'druida': 'combat/druida.webp',
    'patrulheiro': 'combat/patrulheiro.webp',
    // Raças
    'anao': 'ui/anao.webp',
    'elfo': 'ui/elfo.webp',
    // NPCs / profissões
    'aldeao': 'npcs/aldeao.webp',
    'alquimista': 'npcs/alquimista.webp',
    'banqueiro': 'npcs/banqueiro.webp',
    'escriba': 'npcs/escriba.webp',
    'estalajadeira': 'npcs/estalajadeira.webp',
    'ferreiro': 'npcs/ferreiro.webp',
    'joalheiro': 'npcs/joalheiro.webp',
    'taverneiro': 'npcs/taverneiro.webp',
    // Glifos de navegação / UI
    'acampamento': 'ui/acampamento.webp',
    'cartografia': 'ui/cartografia.webp',
    'festival': 'city/festival.webp',
    'grupo': 'ui/grupo.webp',
    'mochila': 'items/mochila.webp',
    'tochas': 'ui/tochas.webp',
    'trofeu': 'achievements/trofeu.webp',
    // Stats
    'stat-attack': 'ui/stat-attack.webp',
    'stat-hp': 'ui/stat-hp.webp',
    'stat-mp': 'ui/stat-mp.webp',
    // Conquistas
    'ach-algoz': 'achievements/ach-algoz.webp',
    'ach-colecionador': 'achievements/ach-colecionador.webp',
    'ach-forjador': 'achievements/ach-forjador.webp',
    'ach-indomavel': 'achievements/ach-indomavel.webp',
  };

  var _currentScript = (typeof document !== 'undefined' && document.currentScript) || null;

  function detectScriptBase() {
    if (_currentScript && _currentScript.src) {
      var clean = _currentScript.src.split('?')[0];
      var idx = clean.indexOf('/shared/icons-resolver.js');
      if (idx >= 0) return clean.substring(0, idx + 1);
    }
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      if (src.indexOf('icons-resolver.js') !== -1) {
        var c2 = src.split('?')[0];
        var i2 = c2.indexOf('/shared/icons-resolver.js');
        if (i2 >= 0) return c2.substring(0, i2 + 1);
      }
    }
    if (typeof location !== 'undefined' && location.origin) return location.origin + '/';
    return '';
  }

  var scriptBase = detectScriptBase();
  var imgBase = scriptBase + 'shared/img/';

  function has(slug) {
    return Object.prototype.hasOwnProperty.call(ICON_MAP, slug);
  }

  function buildImg(slug, altText) {
    var img = new Image();
    img.src = imgBase + ICON_MAP[slug];
    img.alt = altText || slug;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.loading = 'lazy';
    img.setAttribute('data-icon-slug', slug);
    return img;
  }

  /* Substitui um <use href="#ic-X"> por <img> WebP, se X estiver no ICON_MAP.
     Pula ic-it-* (items-resolver) e entradas em <defs>. */
  function swapUse(useEl) {
    var href = useEl.getAttribute('href') || useEl.getAttribute('xlink:href') || '';
    if (href.indexOf('#' + SPRITE_PREFIX) !== 0) return false;
    var slug = href.substring(1 + SPRITE_PREFIX.length); // strip "#ic-"
    if (slug.indexOf('it-') === 0) return false;          // item → items-resolver
    if (!has(slug)) return false;
    var svgEl = useEl.closest('svg');
    if (!svgEl || svgEl.closest('defs')) return false;    // não trocar as defs
    if (svgEl.getAttribute('data-icon-swapped') === '1') return false;
    var img = buildImg(slug, slug);
    // Preserva classes do <svg> original (ex.: .ic-icon) no <img>.
    if (svgEl.className && svgEl.getAttribute('class')) {
      img.setAttribute('class', svgEl.getAttribute('class'));
    }
    img.onload = function () {
      svgEl.setAttribute('data-icon-swapped', '1');
      if (svgEl.parentNode) svgEl.parentNode.replaceChild(img, svgEl);
    };
    img.onerror = function () { /* mantém SVG como último recurso */ };
    return true;
  }

  function upgrade(rootEl) {
    rootEl = rootEl || document;
    var uses = rootEl.querySelectorAll ? rootEl.querySelectorAll('svg use') : [];
    var n = 0;
    for (var i = 0; i < uses.length; i++) {
      if (swapUse(uses[i])) n++;
    }
    if (n) console.info('[icons-resolver]', n, 'ic-* heráldicos trocados por WebP');
    return n;
  }

  function iconHTML(slug, altText) {
    if (!has(slug)) return '';
    var alt = (altText || slug).replace(/"/g, '&quot;');
    return '<img src="' + imgBase + ICON_MAP[slug] + '" alt="' + alt +
      '" style="width:100%;height:100%;object-fit:contain" loading="lazy" data-icon-slug="' + slug + '">';
  }

  global.vIcons = { upgrade: upgrade, iconHTML: iconHTML, has: has, _map: ICON_MAP };

  /* Auto-swap via MutationObserver — captura ícones adicionados dinamicamente. */
  function tryNode(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName === 'USE' || node.localName === 'use') { swapUse(node); return; }
    var uses = node.querySelectorAll && node.querySelectorAll('svg use');
    if (uses && uses.length) for (var i = 0; i < uses.length; i++) swapUse(uses[i]);
  }

  function start() {
    if (typeof MutationObserver === 'undefined' || !document.body) {
      if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
      }
      return;
    }
    tryNode(document.body);
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.addedNodes && m.addedNodes.length) {
          for (var j = 0; j < m.addedNodes.length; j++) tryNode(m.addedNodes[j]);
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    global.vIcons._observer = obs;
    console.info('[icons-resolver] MutationObserver auto-swap active (' +
      Object.keys(ICON_MAP).length + ' ícones)');
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }
})(typeof window !== 'undefined' ? window : this);

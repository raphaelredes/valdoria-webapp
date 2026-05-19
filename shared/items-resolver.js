/**
 * items-resolver.js — Resolve item slug to image source (PNG > SVG fallback).
 *
 * Uso:
 *   1. Inclua este script: <script src="/shared/items-resolver.js"></script>
 *   2. Chame na inicialização: vItems.upgrade();
 *      → Substitui todos <svg><use href="#ic-it-{slug}"/></svg> dentro de
 *        elements com class .item-icon que tiverem data-name no parent .item-card
 *        por <img> apontando para o PNG AI-generated quando disponível.
 *
 * API:
 *   vItems.upgrade(rootEl?)              — varre o DOM e substitui SVG→IMG
 *   vItems.resolve(slug, callback)       — retorna 'png' | 'svg' para um slug
 *   vItems.preloadManifest()             — força carregamento antecipado do manifest
 *   vItems.has(slug)                     — true se slug tem PNG disponível
 *   vItems.iconHTML(slug, name)          — retorna HTML pronto (img ou svg use)
 *
 * O módulo carrega manifest.json uma vez e cacheia em window.vItemsManifest.
 */
(function (global) {
  'use strict';

  var SVG_SPRITE_PREFIX = 'ic-it-';

  // Detect base via script src. Captured immediately on parse via
  // document.currentScript (reliable across HTTP and file://). Fallback
  // scans all script tags by name.
  var _currentScript = (typeof document !== 'undefined' && document.currentScript) || null;

  function detectScriptBase() {
    // Approach 1: document.currentScript (most reliable)
    if (_currentScript && _currentScript.src) {
      var clean = _currentScript.src.split('?')[0];
      var idx = clean.indexOf('/shared/items-resolver.js');
      if (idx >= 0) return clean.substring(0, idx + 1);
    }
    // Approach 2: scan all script tags (fallback if currentScript unavailable)
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      if (src.indexOf('items-resolver.js') !== -1) {
        var clean2 = src.split('?')[0];
        var idx2 = clean2.indexOf('/shared/items-resolver.js');
        if (idx2 >= 0) return clean2.substring(0, idx2 + 1);
      }
    }
    // Approach 3: hardcoded fallback for HTTP deployments
    if (typeof location !== 'undefined' && location.origin) {
      return location.origin + '/';
    }
    return '';
  }

  var cfg = (typeof window !== 'undefined' && window.vItemsConfig) || {};
  var scriptBase = detectScriptBase();
  var manifestUrl = cfg.manifestUrl || (scriptBase + 'shared/img/items/manifest.json');
  var pngBase = cfg.pngBase || (scriptBase + 'shared/img/items/');

  var manifestState = {
    loaded: false,
    loading: null, // Promise while loading
    slugs: {},     // {slug: true}
    error: null,
  };

  /* ============================================================
   * BASE_TO_SLUG (2026-05-19): mapping de SVG IDs `base-*` do
   * design system para slugs reais do manifest. Resolve gap:
   * código usa `<svg><use href="#ic-it-base-longsword">` mas o
   * PNG está como `espada-longa.png`. Sem isso, items-resolver
   * não substitui SVG por PNG.
   *
   * 89 mapeamentos pra items que JA TEM PNG + 10 truly missing
   * gerados via _gen_base_templates.py.
   * ============================================================ */
  var BASE_TO_SLUG = {
    // Espadas
    'base-longsword': 'espada-longa',
    'base-shortsword': 'espada-curta',
    'base-greatsword': 'espada-elfica',
    'base-training-sword': 'espada-de-treino',
    // Adagas/Punhais
    'base-dagger': 'adaga',
    'base-cerimonial-dagger': 'adaga',
    'base-rapier': 'florete',
    'base-scimitar': 'cimitarra',
    // Maças/Martelos
    'base-mace': 'maca',
    'base-warhammer': 'martelo-de-guerra',
    'base-light-hammer': 'martelo-de-guerra',
    'base-maul': 'marreta',
    'base-flail': 'mangual',
    'base-morningstar': 'mangual-estrela',
    // Machados
    'base-handaxe': 'machadinha',
    'base-battleaxe': 'machado-de-batalha',
    'base-greataxe': 'machado-grande',
    // Outras armas brancas
    'base-whip': 'foice',
    'base-sickle': 'foice',
    'base-pike': 'lanca',
    'base-spear': 'lanca',
    'base-trident': 'tridente',
    'base-glaive': 'glaive',
    'base-halberd': 'alabarda',
    'base-warpick': 'picareta-mineiro',
    // Distancia
    'base-shortbow': 'arco-curto',
    'base-longbow': 'arco-longo',
    'base-light-crossbow': 'besta-leve',
    'base-heavy-crossbow': 'besta-pesada',
    'base-hand-crossbow': 'besta-leve',
    'base-sling': 'dardo',
    'base-dart': 'dardo',
    'base-broken-arrow': 'flecha-quebrada',
    // Cajados/Focos magicos
    'base-quarterstaff': 'cajado-de-aprendiz',
    'base-mage-staff': 'bordao',
    'base-willow-staff': 'cajado-de-salgueiro',
    'base-wand': 'varinha-de-mago-de-guerra-+1',
    'base-orb': 'orbe-arcano-+1',
    'base-druid-totem': 'totem-druidico',
    // Armaduras
    'base-padded-armor': 'armadura-acolchoada',
    'base-leather-chest': 'armadura-de-couro',
    'base-studded-leather': 'couro-batido',
    'base-hide-armor': 'gibao-de-peles',
    'base-chainmail-tunic': 'cota-de-malha',
    'base-scale-mail': 'cota-de-escamas',
    'base-breastplate': 'peitoral-de-couro',
    'base-splint-mail': 'cota-de-escamas',
    'base-full-plate': 'placa-completa',
    // Escudos/Elmos/Vestuario
    'base-shield-buckler': 'escudo-pequeno',
    'base-shield-round': 'escudo',
    'base-shield-heater': 'escudo-de-aco',
    'base-iron-helm': 'elmo-de-ferro-bruto',
    'base-leather-cap': 'elmo-de-couro',
    'base-cloak': 'capa-da-confianca',
    'base-boot': 'botas-de-couro',
    'base-bracer': 'braceletes-de-defesa',
    // Acessorios
    'base-amulet': 'amuleto-da-sorte',
    'base-ring-gem': 'anel-de-ouro',
    'base-belt': 'cinto-de-ferro',
    'base-coin-pouch': 'bolsa-de-moedas-falsa',
    'base-holy-symbol': 'simbolo-sagrado-+1',
    // Pocoes/Frascos
    'base-potion-bottle': 'pocao-de-cura',
    'base-potion-vial': 'pocao-de-cura',
    'base-thrown-flask': 'pocao-de-cura',
    'base-poison-bottle': 'pseudopode-preservado',
    'base-powder-jar': 'pote-de-po-magico',
    'base-honey-jar': 'pocao-de-cura',
    // Comida/Provisoes
    'base-meal-bowl': 'racoes-de-7-dias',
    'base-meat-cooked': 'racoes-de-7-dias',
    'base-mushroom': 'cogumelos-selvagens',
    'base-mug': 'racoes-de-7-dias',
    'base-bag-rations': 'racoes-de-7-dias',
    // Acampamento/Utilidades
    'base-torch': 'tochas-5',
    'base-candle': 'vela',
    'base-lantern': 'tochas-5',
    'base-rope': 'corda-de-canhamo-(15m)',
    'base-mining-pick': 'picareta-mineiro',
    'base-lockpick': 'gazua',
    'base-bandage': 'ataduras-medicinais',
    'base-leather-roll': 'rolo-de-couro',
    // Truques/Trinkets
    'base-caltrop': 'estrepes',
    'base-spike': 'espigao-de-ferro',
    'base-smoke-bomb': 'pote-de-po-magico',
    'base-sticky-blob': 'goma-grude',
    'base-bone': 'osso',
    'base-eye': 'olho-de-bruxa-verde',
    'base-pelt': 'pele-de-lobo',
    'base-ingot': 'ferro-bruto',
    'base-gear': 'engrenagem',
    'base-gem-faceted': 'esmeralda',
    'base-gem-pearl': 'perola',
    'base-crystal-raw': 'cristal-bruto',
    'base-essence': 'essencia-arcana',
    'base-leaf-magic': 'folha-magica',
    'base-coal': 'carvao',
    // Documentos/Musica
    'base-scroll': 'pergaminho-antigo',
    'base-tome': 'tomo-de-conhecimento',
    'base-music-sheet': 'alaude-do-canto-estelar',
    'base-lute': 'alaude-do-canto-estelar',
  };

  /* Resolve `ic-it-{X}` (X pode ser base-Y ou slug direto) ao slug real. */
  function resolveSlug(rawSlug) {
    if (!rawSlug) return null;
    var s = String(rawSlug);
    if (BASE_TO_SLUG.hasOwnProperty(s)) return BASE_TO_SLUG[s];
    return s;
  }

  function loadManifest() {
    if (manifestState.loaded || manifestState.loading) {
      return manifestState.loading || Promise.resolve();
    }
    manifestState.loading = fetch(manifestUrl + '?t=' + Date.now())
      .then(function (r) {
        if (!r.ok) throw new Error('manifest not found: ' + r.status);
        return r.json();
      })
      .then(function (json) {
        var gen = (json && json.generated) || {};
        Object.keys(gen).forEach(function (slug) { manifestState.slugs[slug] = true; });
        manifestState.loaded = true;
        manifestState.loading = null;
        console.info('[items-resolver] manifest loaded:', Object.keys(manifestState.slugs).length, 'PNG items');
      })
      .catch(function (err) {
        manifestState.error = err.message;
        manifestState.loaded = true; // Mark as loaded with no items (fallback)
        manifestState.loading = null;
        console.warn('[items-resolver] manifest not reachable — SVG fallback for all:', err.message);
      });
    return manifestState.loading;
  }

  function hasManifestSlug(slug) {
    return !!manifestState.slugs[slug];
  }

  function buildImg(slug, altText) {
    var img = new Image();
    img.src = pngBase + slug + '.png';
    img.alt = altText || slug;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.imageRendering = 'auto';
    img.loading = 'lazy';
    img.setAttribute('data-item-slug', slug);
    return img;
  }

  function buildSvgUse(slug, viewBox) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', viewBox || '0 0 120 120');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#' + SVG_SPRITE_PREFIX + slug);
    svg.appendChild(use);
    return svg;
  }

  function swapCardToPng(card) {
    var rawSlug = card.getAttribute('data-name') || card.getAttribute('data-slug');
    if (!rawSlug) return false;
    /* 2026-05-19: aplica BASE_TO_SLUG antes de testar manifest. */
    var slug = resolveSlug(rawSlug);
    if (!hasManifestSlug(slug)) return false;

    var iconDiv = card.querySelector('.item-icon');
    if (!iconDiv) return false;
    if (iconDiv.querySelector('img[data-item-slug]')) return false; // Already swapped

    var nameEl = card.querySelector('.item-name');
    var altText = nameEl ? nameEl.textContent : slug;
    var img = buildImg(slug, altText);
    img.onload = function () {
      iconDiv.innerHTML = '';
      iconDiv.appendChild(img);
      card.setAttribute('data-img-source', 'png');
    };
    img.onerror = function () {
      card.setAttribute('data-img-source', 'svg-fallback');
    };
    return true;
  }

  /* ============================================================
   * 2026-05-19: swapSvgUseToPng — substitui <svg><use href="#ic-it-X">
   * direto por <img> PNG quando X (ou seu BASE_TO_SLUG resolvido) tem
   * PNG no manifest. Cobre casos onde o codigo NAO usa .item-card +
   * data-name (mercado/inventario inline em cidade/exploracao/combate).
   * ============================================================ */
  function swapSvgUseToPng(useEl) {
    var href = useEl.getAttribute('href') || useEl.getAttribute('xlink:href') || '';
    if (href.indexOf('#' + SVG_SPRITE_PREFIX) !== 0) return false;
    var rawSlug = href.substring(1 + SVG_SPRITE_PREFIX.length); // strip "#ic-it-"
    var slug = resolveSlug(rawSlug);
    if (!hasManifestSlug(slug)) return false;
    var svgEl = useEl.closest('svg');
    if (!svgEl || svgEl.closest('defs')) return false; // skip defs entries
    if (svgEl.getAttribute('data-img-swapped') === '1') return false;
    var img = buildImg(slug, rawSlug);
    img.onload = function () {
      svgEl.setAttribute('data-img-swapped', '1');
      if (svgEl.parentNode) svgEl.parentNode.replaceChild(img, svgEl);
    };
    img.onerror = function () { /* keep SVG fallback */ };
    return true;
  }

  function upgrade(rootEl) {
    rootEl = rootEl || document;
    return loadManifest().then(function () {
      if (Object.keys(manifestState.slugs).length === 0) return 0;
      var cards = rootEl.querySelectorAll('article.item-card, [data-item-card]');
      var swapped = 0;
      cards.forEach(function (card) {
        if (swapCardToPng(card)) swapped++;
      });
      /* 2026-05-19: tambem varre <svg><use href="#ic-it-..."> diretos. */
      var uses = rootEl.querySelectorAll('svg use');
      var directSwaps = 0;
      uses.forEach(function (u) {
        if (swapSvgUseToPng(u)) directSwaps++;
      });
      console.info('[items-resolver] upgrade:', swapped, 'cards +', directSwaps, 'svg-use direct swapped to PNG');
      return swapped + directSwaps;
    });
  }

  function iconHTML(slug, altText, viewBox) {
    // Synchronous: requires manifest already loaded.
    // Returns the right HTML string (img or svg-use) for embedding.
    // Auto-detects player gender from window.vPlayerGender (set by game).
    // If F and {slug}-f.png exists in manifest, uses female version.
    if (manifestState.loaded) {
      var alt = (altText || slug).replace(/"/g, '&quot;');
      // Try female variant if player is female
      var gender = (typeof window !== 'undefined' && window.vPlayerGender) || 'M';
      if (gender === 'F' && hasManifestSlug(slug + '-f')) {
        return '<img src="' + pngBase + slug + '-f.png" alt="' + alt +
               '" style="width:100%;height:100%;object-fit:contain" loading="lazy" data-item-slug="' + slug + '-f">';
      }
      // Fallback to default (masculine) version
      if (hasManifestSlug(slug)) {
        return '<img src="' + pngBase + slug + '.png" alt="' + alt +
               '" style="width:100%;height:100%;object-fit:contain" loading="lazy" data-item-slug="' + slug + '">';
      }
    }
    return '<svg viewBox="' + (viewBox || '0 0 120 120') +
           '"><use href="#' + SVG_SPRITE_PREFIX + slug + '"/></svg>';
  }

  function resolve(slug, callback) {
    loadManifest().then(function () {
      callback(hasManifestSlug(slug) ? 'png' : 'svg');
    });
  }

  global.vItems = {
    upgrade: upgrade,
    resolve: resolve,
    has: hasManifestSlug,
    iconHTML: iconHTML,
    preloadManifest: loadManifest,
    _state: manifestState, // for debugging
  };

  // Auto-preload manifest on script load so iconHTML() returns PNG
  // on first inventory open without delay. Non-blocking — async fetch.
  loadManifest();
})(typeof window !== 'undefined' ? window : this);

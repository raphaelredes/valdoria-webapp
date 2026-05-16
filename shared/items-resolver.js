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
    var slug = card.getAttribute('data-name') || card.getAttribute('data-slug');
    if (!slug || !hasManifestSlug(slug)) return false;

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

  function upgrade(rootEl) {
    rootEl = rootEl || document;
    return loadManifest().then(function () {
      if (Object.keys(manifestState.slugs).length === 0) return 0;
      var cards = rootEl.querySelectorAll('article.item-card, [data-item-card]');
      var swapped = 0;
      cards.forEach(function (card) {
        if (swapCardToPng(card)) swapped++;
      });
      console.info('[items-resolver] upgrade:', swapped, 'of', cards.length, 'cards swapped to PNG');
      return swapped;
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

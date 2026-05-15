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

  var MANIFEST_URL = '/shared/img/items/manifest.json';
  var PNG_BASE = '/shared/img/items/';
  var SVG_SPRITE_PREFIX = 'ic-it-';

  // Auto-detect base path if not on root (e.g. character_creator/, combat2/)
  function detectBase() {
    var path = location.pathname;
    var depth = (path.match(/\//g) || []).length - 1;
    if (depth <= 1) return ''; // Already at root
    var prefix = '';
    for (var i = 0; i < depth - 1; i++) prefix += '../';
    return prefix;
  }

  var basePath = detectBase();
  var manifestUrl = basePath + 'shared/img/items/manifest.json';
  var pngBase = basePath + 'shared/img/items/';

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
    if (manifestState.loaded && hasManifestSlug(slug)) {
      var alt = (altText || slug).replace(/"/g, '&quot;');
      return '<img src="' + pngBase + slug + '.png" alt="' + alt +
             '" style="width:100%;height:100%;object-fit:contain" loading="lazy" data-item-slug="' + slug + '">';
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
})(typeof window !== 'undefined' ? window : this);

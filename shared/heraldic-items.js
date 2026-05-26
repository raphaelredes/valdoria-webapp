/**
 * HeraldicItems - API helper que retorna <img> PNG ao inves de SVG sprite.
 *
 * 2026-05-19: REWRITE. Antes carregava heraldic-items-sprite.js (1.4MB) e
 * retornava `<svg><use href="#ic-it-X">`. Agora retorna `<img src=".../X.webp">` (Sessão #38)
 * direto, usando items-resolver.js (vItems) pra checar disponibilidade.
 *
 * USAGE:
 *   if (HeraldicItems.ready()) {
 *     var html = HeraldicItems.iconSvg("Adaga", "32px");
 *   } else {
 *     HeraldicItems.onReady(function () { ... });
 *   }
 *
 * Mapeamento name -> slug PNG:
 *   _slug("Adaga")        -> "adaga"            -> /shared/img/items/adaga.webp
 *   _slug("Pocao de Cura") -> "pocao-de-cura"    -> /shared/img/items/pocao-de-cura.webp
 *
 * Se vItems nao estiver carregado, retorna "" (caller faz fallback emoji).
 */
(function (global) {
    "use strict";
    if (global.HeraldicItems) return;

    /* Slugify pt-BR: lowercase, remove acentos, espacos/punctos -> hifen. */
    function _slug(name) {
        if (!name) return "";
        var s = String(name).toLowerCase();
        try { s = s.normalize("NFKD").replace(/[̀-ͯ]/g, ""); } catch (_) {}
        s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        return s;
    }

    /* Detecta o base path via script src (mesma logica do items-resolver). */
    function _detectBase() {
        if (typeof document === 'undefined') return '';
        var cur = document.currentScript;
        if (cur && cur.src) {
            var clean = cur.src.split('?')[0];
            var idx = clean.indexOf('/shared/heraldic-items.js');
            if (idx >= 0) return clean.substring(0, idx + 1);
        }
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            var src = scripts[i].src || '';
            if (src.indexOf('heraldic-items.js') !== -1) {
                var clean2 = src.split('?')[0];
                var idx2 = clean2.indexOf('/shared/heraldic-items.js');
                if (idx2 >= 0) return clean2.substring(0, idx2 + 1);
            }
        }
        if (typeof location !== 'undefined' && location.origin) return location.origin + '/';
        return '';
    }

    var BASE = _detectBase();
    var ITEMS_PATH = BASE + 'shared/img/items/';

    /* Resolve via vItems (manifest + BASE_TO_SLUG). Retorna slug PNG real ou null. */
    function _resolveSlug(name) {
        var raw = _slug(name);
        if (!raw) return null;
        if (typeof window === 'undefined' || !window.vItems) return raw;
        if (window.vItems.has(raw)) return raw;
        // BASE_TO_SLUG nao e exposto como API publica. Caller usa fallback
        // emoji se manifest nao tiver. O slug raw e devolvido como tentativa.
        return raw;
    }

    /* Mark ready ASAP - nao ha mais sprite assincrono pra esperar. */
    window.__heraldicItemsReady = true;

    global.HeraldicItems = {
        ready: function () { return true; },
        onReady: function (cb) {
            if (typeof cb !== "function") return;
            try { cb(); } catch (_) {}
        },
        /**
         * Retorna <img> HTML para um item por name. Vazio se vItems sem PNG.
         * Caller decide fallback (emoji, etc).
         */
        iconSvg: function (name, size) {
            var slug = _resolveSlug(name);
            if (!slug) return "";
            var sz = size || "32px";
            // Se vItems ja carregou manifest e o slug NAO tem PNG, retorna vazio
            // pra caller usar fallback emoji.
            if (typeof window !== 'undefined' && window.vItems && window.vItems._state &&
                window.vItems._state.loaded && !window.vItems.has(slug)) {
                return "";
            }
            return '<img src="' + ITEMS_PATH + slug + '.webp" ' +
                'style="width:' + sz + ';height:' + sz +
                ';display:inline-block;vertical-align:middle;object-fit:contain" ' +
                'onerror="this.style.display=\'none\'" loading="lazy">';
        },
        /* Helpers de debug. */
        resolve: _resolveSlug,
        slug: _slug,
    };
})(window);

// ═══════════════════════════════════════════════════════════
//  LENDAS DE VALDORIA — Service Worker v5
//  Optimized for SPA: URL normalization, dual caches, FIFO trim
//  Cache-first for static assets, Network-first for HTML
// ═══════════════════════════════════════════════════════════

var CACHE_NAME = 'valdoria-v6';
var AUDIO_CACHE = 'valdoria-audio-v1';
var KNOWN_CACHES = [CACHE_NAME, AUDIO_CACHE];
var MAX_ENTRIES = 200;
var MAX_AUDIO = 50;

var PRE_CACHE = [
    // SPA Shell (boot path)
    '/valdoria-webapp/app.html',
    '/valdoria-webapp/valdoria-design.css',
    '/valdoria-webapp/favicon.svg',
    '/valdoria-webapp/manifest.json',
    '/valdoria-webapp/spa/router.js',
    '/valdoria-webapp/spa/spa-nav.js',
    '/valdoria-webapp/spa/routes.js',
    '/valdoria-webapp/spa/init.js',
    // Shell JS (loaded in app.html)
    '/valdoria-webapp/shared/font-apply.js',
    '/valdoria-webapp/shared/haptic.js',
    '/valdoria-webapp/shared/webapp-init.js',
    '/valdoria-webapp/shared/loading-guard.js',
    '/valdoria-webapp/shared/toast.js',
    '/valdoria-webapp/shared/motion.js',
    '/valdoria-webapp/shared/error-reporter.js',
    '/valdoria-webapp/shared/audio-manager.js',
    '/valdoria-webapp/shared/text-timing.js',
    '/valdoria-webapp/shared/wake-lock.js',
    // Shell CSS
    '/valdoria-webapp/shared/fonts.css',
    '/valdoria-webapp/shared/loading.css',
    '/valdoria-webapp/shared/animations.css',
    '/valdoria-webapp/shared/audio-manager.css',
    '/valdoria-webapp/shared/dice-roller.css',
    '/valdoria-webapp/shared/toast.css',
    '/valdoria-webapp/shared/popup.css',
    '/valdoria-webapp/shared/status-bars.css',
    '/valdoria-webapp/shared/tabs.css',
    '/valdoria-webapp/shared/image-popup.css',
    // Shared JS (frequently used by routes)
    '/valdoria-webapp/shared/bounce-back.js',
    '/valdoria-webapp/shared/action-guard.js',
    '/valdoria-webapp/shared/exit-confirm.js',
    '/valdoria-webapp/shared/typewriter.js',
    '/valdoria-webapp/shared/status-bars.js',
    '/valdoria-webapp/shared/image-popup.js',
    '/valdoria-webapp/shared/popup.js',
    '/valdoria-webapp/shared/api-discovery.js',
    '/valdoria-webapp/shared/device-id.js',
    '/valdoria-webapp/shared/session-heartbeat.js',
    '/valdoria-webapp/shared/dice-3d.js',
    '/valdoria-webapp/shared/fetch-utils.js',
    '/valdoria-webapp/shared/combat-vfx.js',
    '/valdoria-webapp/shared/dice-roller.js',
    // Fonts — critical path
    '/valdoria-webapp/shared/fonts/medievalsharp.woff2',
    '/valdoria-webapp/shared/fonts/cinzel.woff2',
    '/valdoria-webapp/shared/fonts/pirataone.woff2',
    '/valdoria-webapp/shared/fonts/almendra-regular.woff2',
    '/valdoria-webapp/shared/fonts/almendra-bold.woff2',
    '/valdoria-webapp/shared/fonts/imfell-regular.woff2',
    '/valdoria-webapp/shared/fonts/metamorphous.woff2',
    // Fonts — extended subsets
    '/valdoria-webapp/shared/fonts/almendra-regular-ext.woff2',
    '/valdoria-webapp/shared/fonts/almendra-bold-ext.woff2',
    '/valdoria-webapp/shared/fonts/cinzel-ext.woff2',
    '/valdoria-webapp/shared/fonts/medievalsharp-ext.woff2',
    '/valdoria-webapp/shared/fonts/metamorphous-ext.woff2',
    '/valdoria-webapp/shared/fonts/pirataone-ext.woff2',
];

// ── Helpers ──────────────────────────────────────────────

/** Strip query params from URL for cache key normalization.
 *  SPA router uses ?v=Date.now() to bust GitHub Pages cache.
 *  We store under the canonical URL (no query) so repeated visits
 *  hit the same cache entry instead of creating duplicates. */
function _stripSearch(urlOrRequest) {
    var href = typeof urlOrRequest === 'string' ? urlOrRequest : urlOrRequest.url;
    var u = new URL(href);
    u.search = '';
    return u.href;
}

/** FIFO cache eviction when entries exceed limit. */
async function _trimCache(cacheName, maxEntries) {
    var cache = await caches.open(cacheName);
    var keys = await cache.keys();
    if (keys.length > maxEntries) {
        var toDelete = keys.length - maxEntries;
        for (var i = 0; i < toDelete; i++) {
            await cache.delete(keys[i]);
        }
    }
}

// ── Install ──────────────────────────────────────────────

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            // Use allSettled so a single 404 doesn't block SW install
            return Promise.allSettled(
                PRE_CACHE.map(function (url) {
                    return cache.add(url).catch(function (err) {
                        console.warn('[SW] Pre-cache failed:', url, err.message || err);
                    });
                })
            );
        }).then(function () {
            return self.skipWaiting();
        })
    );
});

// ── Activate ─────────────────────────────────────────────

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys
                    .filter(function (k) { return KNOWN_CACHES.indexOf(k) === -1; })
                    .map(function (k) {
                        console.log('[SW] Deleting old cache:', k);
                        return caches.delete(k);
                    })
            );
        }).then(function () {
            return self.clients.claim();
        })
    );
});

// ── Fetch ────────────────────────────────────────────────

self.addEventListener('fetch', function (event) {
    var url = new URL(event.request.url);

    // Skip non-GET
    if (event.request.method !== 'GET') return;

    // Skip external origins (except CDN)
    if (url.hostname !== self.location.hostname &&
        !url.hostname.includes('cdn.jsdelivr.net')) {
        return;
    }

    // Audio — cache-first with separate audio cache
    if (url.pathname.endsWith('.mp3') || url.pathname.endsWith('.wav')) {
        event.respondWith(cacheFirst(event.request, AUDIO_CACHE, MAX_AUDIO));
        return;
    }

    // Static assets — cache-first (bypasses GitHub Pages 10min cache)
    if (url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.woff2') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.json') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.jpeg') ||
        url.pathname.endsWith('.webp') ||
        url.hostname.includes('cdn.jsdelivr.net')) {
        event.respondWith(cacheFirst(event.request, CACHE_NAME, MAX_ENTRIES));
        return;
    }

    // HTML — network-first (may change with URL params)
    if (event.request.headers.get('accept') &&
        event.request.headers.get('accept').includes('text/html')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Everything else — network-first
    event.respondWith(networkFirst(event.request));
});

// ── Cache-first strategy ─────────────────────────────────

async function cacheFirst(request, cacheName, maxEntries) {
    var key = _stripSearch(request);

    // 1. Check cache using normalized URL
    var cached = await caches.match(key);
    if (cached) return cached;

    // 2. Fetch from network (original URL with ?v= busts GitHub Pages cache)
    try {
        var response = await fetch(request);
        if (response.ok) {
            var cache = await caches.open(cacheName);
            // Store under normalized URL — prevents duplicates from ?v=timestamp
            cache.put(key, response.clone());
            _trimCache(cacheName, maxEntries);
        }
        return response;
    } catch (e) {
        return new Response('Offline', { status: 503 });
    }
}

// ── Network-first strategy ───────────────────────────────

async function networkFirst(request) {
    var key = _stripSearch(request);

    try {
        var response = await fetch(request);
        if (response.ok) {
            var cache = await caches.open(CACHE_NAME);
            cache.put(key, response.clone());
            _trimCache(CACHE_NAME, MAX_ENTRIES);
        }
        return response;
    } catch (e) {
        // Fallback to cache
        var cached = await caches.match(key);
        if (cached) return cached;

        // Fallback for HTML requests when offline
        if (request.headers.get('accept') &&
            request.headers.get('accept').includes('text/html')) {
            var fallback = await caches.match('/valdoria-webapp/app.html');
            if (fallback) return fallback;
        }

        return new Response('Offline', { status: 503 });
    }
}

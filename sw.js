// ═══════════════════════════════════════════════════════════
//  LENDAS DE VALDORIA — Service Worker v1
//  Cache-first for static assets, Network-first for HTML
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = 'valdoria-v1';

const PRE_CACHE = [
    '/valdoria-webapp/valdoria-design.css',
    '/valdoria-webapp/favicon.svg',
    '/valdoria-webapp/manifest.json',
];

// Install: pre-cache critical assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRE_CACHE))
            .then(() => self.skipWaiting())
    );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys
                .filter(k => k !== CACHE_NAME)
                .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch strategy
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip Telegram API and external APIs
    if (url.hostname !== self.location.hostname &&
        !url.hostname.includes('cdn.jsdelivr.net')) {
        return;
    }

    // CSS, SVG, manifest — Cache-first
    if (url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.json') ||
        url.hostname.includes('cdn.jsdelivr.net')) {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // HTML pages — Network-first (they may change with URL params)
    if (event.request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Everything else — Network-first
    event.respondWith(networkFirst(event.request));
});

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;

        // Fallback for HTML requests when offline
        if (request.headers.get('accept')?.includes('text/html')) {
            const fallback = await caches.match('/valdoria-webapp/');
            if (fallback) return fallback;
        }

        return new Response('Offline', { status: 503 });
    }
}

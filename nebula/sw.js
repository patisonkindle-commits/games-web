const CACHE_NAME = 'nebula-v1';

const PRECACHE_URLS = [
  '/nebula/',
  '/nebula/index.html',
];

// On install: activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Pre-cache failed for some URLs:', err);
      });
    })
  );
});

// On activate: claim clients and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

// On fetch: network-first strategy with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Only handle requests within our scope
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/nebula/')) return;

  event.respondWith(
    networkFirstWithCacheFallback(request)
  );
});

async function networkFirstWithCacheFallback(request) {
  try {
    // Try the network first
    const response = await fetch(request);
    // If we got a valid response, clone it and cache it
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Network failed — try the cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Nothing in cache either — return offline fallback
    console.warn('[SW] Network unavailable and no cache for:', request.url);
    return new Response('Offline', { status: 503 });
  }
}

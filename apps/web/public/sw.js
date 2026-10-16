const CACHE_NAME = 'blackfridaysv-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/data/deals-snapshot.json',
  '/fonts/dm-sans.ttf'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Handle same-origin requests
  if (url.origin === self.location.origin) {
    // 1. Navigation requests (HTML)
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request).catch(() => caches.match('/index.html') || caches.match('/'))
      );
      return;
    }

    // 2. Deals snapshot data: Stale-While-Revalidate
    if (url.pathname.includes('/data/deals-snapshot.json')) {
      event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
          const cachedResponse = await cache.match(request);
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        })
      );
      return;
    }

    // 3. Static assets: Cache-First with network fallback
    if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/fonts/') || url.pathname.endsWith('.svg')) {
      event.respondWith(
        caches.match(request).then((cached) => cached || fetch(request).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        }))
      );
      return;
    }
  }

  // Default network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

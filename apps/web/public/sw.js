const CACHE_NAME = 'blackfridaysv-v2';
const STATIC_ASSETS = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest', '/fonts/dm-sans.ttf'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('blackfridaysv-') && key !== CACHE_NAME).map(key => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (url.pathname === '/data/deals-snapshot.json') {
    // Always try the current edge snapshot before returning an offline copy.
    let update;
    const response = (async () => {
      try {
        const fresh = await fetch(request, { signal: AbortSignal.timeout(2500) });
        if (!fresh.ok) throw new Error('Catalog unavailable');
        const copy = fresh.clone();
        update = caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        return fresh;
      } catch {
        return (await caches.match(request)) || new Response('Catalog unavailable', { status: 503 });
      }
    })();
    event.respondWith(response);
    event.waitUntil(response.then(() => update));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.match('/index.html')) || (await caches.match('/')) || new Response('Sin conexión', { status: 503 })));
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/fonts/') || url.pathname.endsWith('.svg')) {
    let update;
    const response = (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const fresh = await fetch(request);
      if (fresh.ok) {
        const copy = fresh.clone();
        update = caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
      }
      return fresh;
    })();
    event.respondWith(response);
    event.waitUntil(response.then(() => update).catch(() => {}));
  }
});

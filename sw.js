// Best Card service worker
// Bump VERSION on every publish to force the home-screen shortcut to update.
const VERSION = '2026-09-26g';
const CACHE = 'bestcard-' + VERSION;

// Files safe to pre-cache for offline use.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
];

// Install: pre-cache the shell, then activate immediately.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate: delete any older version caches, take control of open pages.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
//  - Navigation / HTML requests: network-first, so a fresh launch always tries
//    to pull the latest index.html and only falls back to cache when offline.
//  - Everything else (icons, manifest): cache-first for speed.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // Spend totals: never cache, always go to the network.
  if (new URL(req.url).pathname.endsWith('/ff-spend.json')) return;

  const isHTML = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }))
  );
});

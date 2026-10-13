// KrushiMitra AI - Service Worker for PWA
const CACHE_NAME = 'krushimitra-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/static/css/style.css',
  '/static/js/chat.js',
  '/static/manifest.json',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
  '/static/icons/favicon.png'
];

// Install Event - Pre-cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache partial warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network first with cache fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  
  // Skip non-GET requests
  if (req.method !== 'GET') return;

  // For API endpoints, prefer fresh network response
  if (req.url.includes('/api/')) {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match(req);
      })
    );
    return;
  }

  // For page and static assets: try network first, then cache
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone);
          });
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(req).then((cachedRes) => {
          if (cachedRes) return cachedRes;
          if (req.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

/* Bump version to bust ALL old caches — forces fresh index.html on every device */
var CACHE = 'haad-v3';
var ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); /* take over immediately, don't wait for old SW to die */
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim(); /* take control of all open tabs immediately */
});

self.addEventListener('fetch', function(e) {
  /* Always hit network for Supabase */
  if (e.request.url.indexOf('supabase.co') !== -1) return;
  /* Always hit network for the HTML itself so updates are instant */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE).then(function(cache){ cache.put(e.request, clone); });
        return response;
      }).catch(function() {
        return caches.match('/index.html');
      })
    );
    return;
  }
  /* For other assets: cache first */
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (e.request.method === 'GET' && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache){ cache.put(e.request, clone); });
        }
        return response;
      });
    })
  );
});

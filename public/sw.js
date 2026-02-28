var CACHE_NAME = 'klarzeit-cache-v8';
var MAX_CACHE_ITEMS = 100;
var STATIC_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Marcellus&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(c) {
      return c.addAll(STATIC_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(ks) {
      return Promise.all(
        ks.filter(function(k) { return k !== CACHE_NAME; })
          .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      trimCache(CACHE_NAME, MAX_CACHE_ITEMS);
    })
  );
  self.clients.claim();
});

function trimCache(cacheName, maxItems) {
  caches.open(cacheName).then(function(cache) {
    cache.keys().then(function(keys) {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(function() {
          trimCache(cacheName, maxItems);
        });
      }
    });
  });
}

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co')) return;

  // HTML navigation requests: network-first with offline fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function(res) {
        var c = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, c); });
        return res;
      }).catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/offline.html');
        });
      })
    );
    return;
  }

  // JS/CSS assets: network-first (Vite uses hashed filenames, so new builds = new URLs)
  if (e.request.url.match(/\.(js|css)(\?|$)/)) {
    e.respondWith(
      fetch(e.request).then(function(res) {
        if (res && res.status === 200) {
          var c = res.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, c); });
        }
        return res;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Everything else (fonts, images): cache-first
  e.respondWith(
    caches.match(e.request).then(function(r) {
      return r || fetch(e.request).then(function(res) {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
          var c = res.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, c);
          });
        }
        return res;
      }).catch(function() {
        return caches.match(e.request);
      });
    })
  );
});

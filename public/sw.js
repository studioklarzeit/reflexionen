var CACHE_NAME = 'klarzeit-cache-v3';
var STATIC_URLS = [
  'https://fonts.googleapis.com/css2?family=Marcellus&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap'
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
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co')) return;

  // HTML navigation requests: network-first (always get latest)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function(res) {
        var c = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, c); });
        return res;
      }).catch(function() {
        return caches.match(e.request);
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
        if (res && res.status === 200 && res.type === 'basic') {
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

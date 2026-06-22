const CACHE_NAME = 'agunya-mania-v1';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/script.js',
  './assets/agunya1.png',
  './assets/agunya2.png',
  './assets/agunya3.png',
  './assets/icon_192.png',
  './assets/icon_512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

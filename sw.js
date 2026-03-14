const CACHE_NAME = "haferflocken-app-v10";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css?v=10",
  "./script.js?v=10",
  "./data.js?v=10",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {

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

self.addEventListener("fetch", (event) => {

  const request = event.request;

  if (request.method !== "GET") return;

  event.respondWith(

    caches.match(request).then((cachedResponse) => {

      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {

        return caches.open(CACHE_NAME).then((cache) => {

          cache.put(request, networkResponse.clone());

          return networkResponse;

        });

      });

    })

  );

});
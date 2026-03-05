const CACHE_NAME = "shkala-signal-v4"

const 
"./
./index.html
./manifest.webmanifest
./icon-180.png
./icon-192.png
./icon-512.png
./icon-maskable-512.png"
];

// install
self.skipWaiting();
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// activate
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // тільки для свого домену
  if (url.origin !== location.origin) return;

  // HTML: спочатку мережа, якщо нема — кеш
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname === "/") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // все інше: спочатку кеш, якщо нема — мережа і докешувати
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});

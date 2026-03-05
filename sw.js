/* sw.js — stable offline for GitHub Pages + iOS PWA */

const VERSION = "v5"; // <-- міняй (v6, v7...) коли хочеш примусове оновлення
const CACHE_NAME = `shkala-signal-${VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./sw.js"
];

// Install: cache app shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: clean old caches + take control
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("shkala-signal-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Fetch strategy:
// - Navigation (HTML): network-first, fallback cache (щоб офлайн відкривалось)
// - Other same-origin: cache-first, fallback network
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // only for our origin (do not touch 3rd party)
  if (url.origin !== self.location.origin) return;

  // HTML navigation requests
  const isNav =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isNav) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: "no-store" });
          const cache = await caches.open(CACHE_NAME);
          cache.put("./index.html", fresh.clone()); // keep latest shell
          return fresh;
        } catch (e) {
          const cached = await caches.match("./index.html");
          return cached || caches.match("./") || new Response("Offline", { status: 503 });
        }
      })()
    );
    return;
  }

  // Static assets
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      const res = await fetch(req);
      // cache successful same-origin GET
      if (req.method === "GET" && res.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
      }
      return res;
    })()
  );
});

// HeatSignal service worker: network first, cached copy when offline.
// Pages, app files and Open-Meteo readings are cached as you use them, so the last data you saw and the
// first-aid guide still open without a connection. AI requests (/api/) are never cached.
const CACHE = "heatsignal-v1";
const PRECACHE = ["/", "/first-aid"];
const DATA_HOSTS = ["api.open-meteo.com", "air-quality-api.open-meteo.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!(sameOrigin || DATA_HOSTS.includes(url.hostname)) || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(async () => (await caches.match(req)) ?? (req.mode === "navigate" ? caches.match("/first-aid") : Response.error())),
  );
});

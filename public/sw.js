const CACHE_NAME = "settlesmart-commerce-shell-v1";
const STATIC_ASSETS = ["/manifest.json", "/globe.svg", "/window.svg", "/file.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const dynamicOrderingPath = url.pathname.startsWith("/api/") || url.pathname.startsWith("/order/") || url.pathname.startsWith("/track/") || url.pathname.startsWith("/receipt/");
  if (event.request.method !== "GET" || dynamicOrderingPath) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});

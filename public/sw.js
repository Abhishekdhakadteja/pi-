// Clinic Easy service worker. Deliberately tiny: it caches NOTHING except one offline page.
// All normal requests go straight to the network, so it can never show stale app data.
// Only when a page cannot be loaded at all (internet or website down) does it show
// /offline.html, which reads today's list saved on this device.
const CACHE = "ce-offline-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(new Request("/offline.html", { cache: "reload" }))));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return; // scripts, images, data: browser default
  e.respondWith(
    fetch(e.request).catch(() => caches.match("/offline.html").then((r) => r || Response.error())),
  );
});

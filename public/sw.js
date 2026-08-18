// Bump this whenever the caching strategy changes, so old installs clean
// up their stale cache automatically.
const CACHE_NAME = "field-crm-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first: always try to fetch the latest version so new deploys take
// effect immediately for anyone online. Only fall back to the cache (for
// offline use) if the network request fails.
//
// GitHub Pages sends `index.html` with `cache-control: max-age=600`, and a
// plain `fetch()` here honours that — so for up to 10 minutes after a new
// deploy, "network-first" could still be quietly served the *previous*
// build's index.html (and therefore its old, already-fixed-on-the-server
// bug) straight from the browser's HTTP cache. Force a real round-trip for
// navigations so a reload always gets the build that's actually live.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const isNavigation = event.request.mode === "navigate" || event.request.destination === "document";
  event.respondWith(
    fetch(isNavigation ? new Request(event.request, { cache: "no-store" }) : event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

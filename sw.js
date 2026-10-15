// Lets FitTrack open offline. Network first, so an updated app is picked up as soon as
// you're online; the saved copy is only used when the network fails. Your ticks never
// go through here (they live in localStorage).
// 'no-cache' makes the browser re-check with the server instead of reusing its own copy
// (GitHub Pages lets browsers keep files for 10 minutes, which made updates look stuck).
const CACHE = 'fittrack-shell-v2';

// A new version of this file waits until the app is closed, then takes over on the next
// launch. Taking over mid-load (skipWaiting / clients.claim) cuts off the requests the old
// worker is making and falls back to stale copies. App updates don't need it anyway:
// every file is fetched fresh from the network.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })));
});

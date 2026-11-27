// pwa-sw.js
// Safe PWA Service Worker
// This is a minimal service worker that allows the app to be installed (PWA requirement)
// BUT intentionally does NOT cache any assets (HTML, JS, CSS).
// This completely prevents the infamous "Stale ChunkLoadError / Blank White Screen" bug 
// that happens when a PWA caches an old index.html pointing to deleted Vite chunks.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // We explicitly do NOT intercept and serve from cache.
  // We just let the browser handle all network requests natively.
  // The mere presence of this 'fetch' listener is enough to pass Chrome's PWA install criteria.
  return;
});

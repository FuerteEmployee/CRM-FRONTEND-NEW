// location-sw.js — Background Service Worker for HRMS Location Tracking
//
// Registered under its own dedicated scope (see LocationService.ts) that no
// real app page ever navigates to, so this registration never competes with
// the main app-shell service worker (vite.config.ts's VitePWA workbox
// output) for control of "/". skipWaiting/clients.claim are safe here
// precisely because no real client ever falls under this scope.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", async (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === "LOCATION_UPDATE") {
    const { location, token, apiUrl } = data;
    if (location && token && apiUrl) {
      try {
        await fetch(`${apiUrl}/locations/update`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(location)
        });
      } catch (err) {
        // Network offline or unreachable — local IndexedDB queue will retry later
      }
    }
  } else if (data.type === "FLUSH_QUEUE") {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage({ type: "FLUSH_QUEUE" }));
    });
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "loc-heartbeat") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "FLUSH_QUEUE" }));
      })
    );
  }
});

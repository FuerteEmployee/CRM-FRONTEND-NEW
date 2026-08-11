import { registerSW } from "virtual:pwa-register";

let reloaded = false;

registerSW({
  immediate: true,
  onNeedRefresh() {
    // New SW is waiting. skipWaiting+clientsClaim in vite.config.ts already
    // put it in control; a full reload here is what actually swaps the
    // running page's in-memory chunks for the new build's, so an open tab
    // never keeps executing a stale module against a fresh one.
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  },
  onOfflineReady() {
    console.log("App ready to work offline");
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    // Long-lived tabs (dashboard left open for hours) otherwise never
    // notice a new deploy until their next full navigation.
    setInterval(() => registration.update(), 60 * 60 * 1000);
  },
});

// Browser push registration for the web app (localhost:8080 / production web).
// Native (Android/iOS) push is handled separately by Capacitor in LiveTracker.
import { getToken, onMessage } from "firebase/messaging";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { apiClient } from "@/hrms/services/apiClient";
import { getMessagingIfSupported, VAPID_KEY } from "./firebase";

let started = false;

/**
 * Requests notification permission, registers the FCM service worker, obtains a
 * web push token and sends it to the backend (/fcm-token). Safe to call multiple
 * times — it only runs once. No-op on native platforms and unsupported browsers.
 */
export async function registerWebPush(): Promise<void> {
  if (started) return;

  // Native apps use Capacitor push; this path is web-only.
  if ((Capacitor as any)?.isNativePlatform?.()) return;
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

  const messaging = await getMessagingIfSupported();
  if (!messaging) return;

  started = true;
  try {
    // Register on a DEDICATED scope so it coexists with the app's existing
    // location-sw.js (which owns the root "/" scope). Without this, only one SW
    // controls "/" and Firebase's background push handler never receives messages.
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/firebase-cloud-messaging-push-scope",
    });

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      started = false; // allow a retry later (e.g. after the user enables it)
      return;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      await apiClient.post("/users/fcm-token", { fcmToken: token });
      console.log("[WebPush] registered token:", token.slice(0, 14) + "…");
    } else {
      console.warn("[WebPush] getToken returned empty — no token registered");
    }

    // Foreground messages don't auto-display. Show BOTH an in-app toast and a
    // real OS notification (via the SW) so it's visible even with the tab focused.
    onMessage(messaging, (payload) => {
      console.log("[WebPush] foreground message received:", payload);
      const n = payload.notification || {};
      const title = n.title || "Stock Alert";
      const body = n.body || "";
      toast(title, { description: body });
      if (Notification.permission === "granted") {
        registration.showNotification(title, { body, icon: "/favicon.ico" });
      }
    });
  } catch (e) {
    console.warn("[WebPush] registration failed:", e);
    started = false;
  }
}

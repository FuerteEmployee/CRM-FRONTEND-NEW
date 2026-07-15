// Firebase web app config (client-side, safe to expose) + Web Push VAPID key.
// Used for browser push notifications. The matching values are also hardcoded in
// public/firebase-messaging-sw.js (a service worker cannot read these from here).
import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

export const firebaseConfig = {
  apiKey: "AIzaSyAoxxgW_8lELG_hqBapZgRZdvqetwrlSQE",
  authDomain: "screentime-digital.firebaseapp.com",
  projectId: "screentime-digital",
  storageBucket: "screentime-digital.firebasestorage.app",
  messagingSenderId: "176617224972",
  appId: "1:176617224972:web:f5c03ac9ebba9f6d4ea729",
  measurementId: "G-JQ4M4DJG6R",
};

// Web Push certificate (public key of the VAPID key pair) from Firebase Console.
export const VAPID_KEY =
  "BM9wlCW44E7KyNAsp2eAUI_qazDOqk8ZtsT0Yfp0sAWbZ00yrCjSsH2unsSFsEJVSFQTunAX2r0sYDcGr7-_UHE";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let _messaging: Messaging | null = null;

/** Returns a Messaging instance only if the browser supports FCM web push, else null. */
export async function getMessagingIfSupported(): Promise<Messaging | null> {
  try {
    if (!(await isSupported())) return null;
    if (!_messaging) _messaging = getMessaging(app);
    return _messaging;
  } catch {
    return null;
  }
}

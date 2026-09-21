import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";

const DEVICE_ID_KEY = "std_device_id";
const DEVICE_NAME_KEY = "std_device_name";

/**
 * Returns a stable hardware-based ID:
 * - Android/iOS (Capacitor native): uses Device.getId() → real hardware identifier
 * - Browser/laptop: uses a SHA-256 hash of hardware characteristics (screen, CPU, memory, etc.)
 */
export async function getDeviceId(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await Device.getId();
      return info.identifier;
    } catch {
      // fallback to stored/fingerprint if plugin fails
    }
  }
  return getBrowserFingerprint();
}

/**
 * Returns a human-readable device name:
 * - Android/iOS: "Samsung SM-G991B (Android 14)" or "iPhone 15 (iOS 17)"
 * - Browser: "Chrome on Windows 10/11" or "Safari on macOS"
 */
export async function getDeviceName(): Promise<string> {
  const cached = sessionStorage.getItem(DEVICE_NAME_KEY);
  if (cached) return cached;

  let name = "Unknown Device";

  if (Capacitor.isNativePlatform()) {
    try {
      const info = await Device.getInfo();
      const os = info.operatingSystem === "android"
        ? `Android ${info.osVersion}`
        : info.operatingSystem === "ios"
        ? `iOS ${info.osVersion}`
        : info.operatingSystem;
      name = `${info.manufacturer || ""} ${info.model} (${os})`.trim();
    } catch {
      name = "Mobile Device";
    }
  } else {
    name = getBrowserDeviceName();
  }

  sessionStorage.setItem(DEVICE_NAME_KEY, name);
  return name;
}

/**
 * Best-effort GPS fix for a login's Session Log entry. A single short-timeout
 * attempt — never blocks or delays login. Resolves null on denial/timeout/
 * unsupported browser, same non-fatal philosophy as the rest of this file.
 */
export async function getLoginLocation(): Promise<{ lat: number; lng: number } | null> {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 4000, enableHighAccuracy: false, maximumAge: 300000 },
    );
  });
}

/** Builds deviceInfo payload for the login request. */
export async function getDeviceInfo() {
  const [deviceId, deviceName] = await Promise.all([getDeviceId(), getDeviceName()]);
  return {
    deviceId,
    deviceName,
    userAgent: navigator.userAgent,
    platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : "web",
  };
}

// ─── Browser helpers ───────────────────────────────────────────────────────

/** Derives a stable browser/machine fingerprint using hardware properties. */
async function getBrowserFingerprint(): Promise<string> {
  // Check cached fingerprint first
  const cached = localStorage.getItem(DEVICE_ID_KEY);
  if (cached) return cached;

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    `${screen.width}x${screen.height}`,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    (navigator as any).deviceMemory || 0,
  ].join("|");

  let fingerprint: string;
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(components));
    fingerprint = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 36);
    // Format as UUID-like string for consistency
    fingerprint = `${fingerprint.slice(0, 8)}-${fingerprint.slice(8, 12)}-${fingerprint.slice(12, 16)}-${fingerprint.slice(16, 20)}-${fingerprint.slice(20, 32)}`;
  } catch {
    // crypto.subtle not available — fall back to random UUID
    fingerprint = crypto.randomUUID();
  }

  localStorage.setItem(DEVICE_ID_KEY, fingerprint);
  return fingerprint;
}

/** Derives a human-readable name for the browser/laptop. */
function getBrowserDeviceName(): string {
  const ua = navigator.userAgent;

  let os = "Unknown OS";
  if (/android/i.test(ua)) {
    const m = ua.match(/Android\s([0-9.]+)/i);
    os = m ? `Android ${m[1]}` : "Android";
  } else if (/iphone/i.test(ua)) {
    const m = ua.match(/OS\s([0-9_]+)/i);
    os = m ? `iOS ${m[1].replace(/_/g, ".")}` : "iPhone";
  } else if (/ipad/i.test(ua)) {
    os = "iPad";
  } else if (/windows nt/i.test(ua)) {
    const m = ua.match(/Windows NT\s([0-9.]+)/i);
    os = m?.[1] === "10.0" ? "Windows 10/11" : m ? `Windows ${m[1]}` : "Windows";
  } else if (/macintosh/i.test(ua)) {
    os = "macOS";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
  }

  let browser = "Browser";
  if (/chrome\/[0-9]/i.test(ua) && !/edg\//i.test(ua) && !/opr\//i.test(ua)) {
    browser = "Chrome";
  } else if (/firefox\/[0-9]/i.test(ua)) {
    browser = "Firefox";
  } else if (/safari\/[0-9]/i.test(ua) && !/chrome/i.test(ua)) {
    browser = "Safari";
  } else if (/edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/opr\/|opera/i.test(ua)) {
    browser = "Opera";
  }

  return `${browser} on ${os}`;
}

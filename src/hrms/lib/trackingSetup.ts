import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { BackgroundTracker, type PermStatus } from "@/hrms/plugins/backgroundTracker";

export interface OemProfile {
  key: string;
  label: string;
  /** Whether this OEM is known to aggressively kill background services. */
  aggressive: boolean;
  /** Short, user-facing steps for the Autostart / background screen. */
  autostartSteps: string[];
}

const OEMS: Record<string, OemProfile> = {
  xiaomi: {
    key: "xiaomi",
    label: "Xiaomi / Redmi / POCO (MIUI / HyperOS)",
    aggressive: true,
    autostartSteps: [
      "On the screen that opens, find “Screen Time Digital”.",
      "Turn ON “Autostart”.",
      "Then go back to App info → Battery saver → set to “No restrictions”.",
    ],
  },
  oppo: {
    key: "oppo",
    label: "OPPO (ColorOS)",
    aggressive: true,
    autostartSteps: [
      "Enable “Allow Auto Startup” for Screen Time Digital.",
      "Then Settings → Battery → App Battery Management → allow background activity.",
    ],
  },
  vivo: {
    key: "vivo",
    label: "vivo / iQOO (Funtouch / OriginOS)",
    aggressive: true,
    autostartSteps: [
      "Enable background autostart for Screen Time Digital.",
      "Battery → High background power consumption → allow this app.",
    ],
  },
  realme: {
    key: "realme",
    label: "realme (realme UI)",
    aggressive: true,
    autostartSteps: [
      "Enable “Auto Startup” for Screen Time Digital.",
      "Battery → allow background activity / disable optimization for this app.",
    ],
  },
  oneplus: {
    key: "oneplus",
    label: "OnePlus (OxygenOS)",
    aggressive: true,
    autostartSteps: [
      "Allow auto-launch for Screen Time Digital.",
      "Battery → Battery optimization → set this app to “Don’t optimize”.",
    ],
  },
  samsung: {
    key: "samsung",
    label: "Samsung (One UI)",
    aggressive: true,
    autostartSteps: [
      "In the screen that opens, set Battery usage to “Unrestricted” for this app.",
      "Settings → Battery → turn OFF “Put unused apps to sleep” or add this app to “Never sleeping apps”.",
    ],
  },
  huawei: {
    key: "huawei",
    label: "Huawei / Honor (EMUI)",
    aggressive: true,
    autostartSteps: [
      "Phone Manager → Startup → enable manual management for this app (Auto-launch, Secondary launch, Run in background).",
      "If no Google Play Services, GPS still works via the built-in fallback.",
    ],
  },
  other: {
    key: "other",
    label: "your device",
    aggressive: false,
    autostartSteps: [
      "Allow the app to run in the background and disable any battery optimization for it.",
    ],
  },
};

export function detectOem(manufacturer: string): OemProfile {
  const m = (manufacturer || "").toLowerCase();
  if (m.includes("xiaomi") || m.includes("redmi") || m.includes("poco")) return OEMS.xiaomi;
  if (m.includes("oppo")) return OEMS.oppo;
  if (m.includes("vivo") || m.includes("iqoo")) return OEMS.vivo;
  if (m.includes("realme")) return OEMS.realme;
  if (m.includes("oneplus")) return OEMS.oneplus;
  if (m.includes("samsung")) return OEMS.samsung;
  if (m.includes("huawei") || m.includes("honor")) return OEMS.huawei;
  return OEMS.other;
}

export async function getOemProfile(): Promise<OemProfile> {
  try {
    const info = await Device.getInfo();
    return detectOem(info.manufacturer || "");
  } catch {
    return OEMS.other;
  }
}

export interface TrackingReadiness {
  perms: PermStatus;
  batteryOk: boolean;
  ready: boolean;
}

/**
 * On native, "ready" means: foreground + background location granted,
 * notifications granted (Android 13+), and the app is exempt from battery
 * optimization. Web always reports ready (no native gating there).
 */
export async function getTrackingReadiness(): Promise<TrackingReadiness> {
  if (!Capacitor.isNativePlatform()) {
    return {
      perms: { location: "granted", background: "granted", notifications: "granted" },
      batteryOk: true,
      ready: true,
    };
  }
  const perms = await BackgroundTracker.checkAllPermissions();
  let batteryOk = true;
  try {
    batteryOk = (await BackgroundTracker.isIgnoringBatteryOptimizations()).ignoring;
  } catch { /* assume ok if unavailable */ }

  const ready =
    perms.location === "granted" &&
    perms.background === "granted" &&
    perms.notifications === "granted" &&
    batteryOk;

  return { perms, batteryOk, ready };
}

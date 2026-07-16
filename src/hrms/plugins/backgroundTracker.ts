import { registerPlugin } from "@capacitor/core";

export type PermState = "granted" | "denied" | "prompt" | "prompt-with-rationale";

export interface PermStatus {
  location: PermState;
  background: PermState;
  notifications: PermState;
}

export interface StartTrackingOptions {
  /** Tracking-scoped JWT minted at /locations/tracking-token. */
  token: string;
  /** API base incl. /api, e.g. https://node.fuertedevelopers.com/api */
  apiBase: string;
  sessionId: string;
  userId: string;
  storeId?: string;
  /** metres; default 15 */
  distanceFilter?: number;
  /** ms; stationary heartbeat, default 60000 */
  heartbeatMs?: number;
}

export interface TrackerStatus {
  active: boolean;
  queued: number;
  usingFallback: boolean;
}

/**
 * Native Android background tracker (custom Capacitor plugin).
 * The foreground service records to native SQLite and syncs over HTTP even
 * when the app is killed, so none of these calls depend on the WebView staying
 * alive — they only kick the native service into the right state.
 */
export interface BackgroundTrackerPlugin {
  checkAllPermissions(): Promise<PermStatus>;
  requestForegroundPermissions(): Promise<PermStatus>;
  requestBackgroundPermission(): Promise<PermStatus>;
  requestNotificationPermission(): Promise<PermStatus>;

  startTracking(options: StartTrackingOptions): Promise<{ started: boolean }>;
  updateToken(options: { token: string }): Promise<void>;
  stopTracking(): Promise<void>;
  getStatus(): Promise<TrackerStatus>;

  isIgnoringBatteryOptimizations(): Promise<{ ignoring: boolean }>;
  requestIgnoreBatteryOptimizations(): Promise<void>;
  openAutostartSettings(): Promise<void>;
  openBatterySettings(): Promise<void>;
  openAppDetailsSettings(): Promise<void>;
  isDeveloperOptionsEnabled(): Promise<{ enabled: boolean }>;
}

export const BackgroundTracker =
  registerPlugin<BackgroundTrackerPlugin>("BackgroundTracker");

import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { offlineQueueService } from "./OfflineQueueService";
import { employeeApi } from "./api";
import { getAuthToken } from "./apiClient";
import { BackgroundTracker } from "@/hrms/plugins/backgroundTracker";

// ── Constants ──────────────────────────────────────────────────────────────
const MIN_DISTANCE = 15;              // metres — skip updates < 15 m to avoid noise
const MOVING_INTERVAL = 15_000;          // ms — upload every 15 s while moving
const STATIONARY_HEARTBEAT = 60_000;          // ms — heartbeat every 60 s when stationary
const ACCURACY_THRESHOLD = 50;              // metres — reject coarse cell-tower fixes
const WEB_POLL_INTERVAL = 30_000;          // ms — backup poll every 30 s on web
const SW_PATH = "/location-sw.js";

// ── LocationService class ──────────────────────────────────────────────────
class LocationService {
  private watcherId: string | null = null;
  private lastLocation: { lat: number; lng: number } | null = null;
  private lastSyncTime = 0;
  private isTracking = false;
  private sessionId: string | null = null;
  private user: any = null;
  private flushInterval: any = null;
  private heartbeatInterval: any = null;
  private pollInterval: any = null;
  private wakeLock: any = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private swToken = "";
  private swApiUrl = "";

  constructor() {
    this.restoreLastLocation();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async startTracking(user: any) {
    const userId = user._id || user.id || user.userId || "unknown";

    // ── Native (Android): fully delegate to the native foreground service ────
    // The service records to native SQLite and syncs over HTTP even when the
    // app is killed. No JS timers / IndexedDB are involved on this path.
    if (Capacitor.isNativePlatform()) {
      this.user = user;
      this.sessionId = `session_${userId}_${Date.now()}`;
      this.isTracking = true;
      // Try native plugin first; fall back to Capacitor Geolocation if the
      // BackgroundTracker plugin is not registered in this build.
      try {
        await this.initNativeTracking();
        return; // Native plugin took over — done
      } catch (err) {
        console.warn("[LocationService] Native BackgroundTracker unavailable, using Capacitor Geolocation fallback:", err);
        // Fall through to Capacitor-based JS tracking below
      }

      // ── Capacitor Geolocation fallback (no BackgroundTracker plugin) ────
      try {
        await this.captureInitialFix();
      } catch { /* ignore */ }
      // Heartbeat: push location every 60 s using Capacitor Geolocation
      this.heartbeatInterval = setInterval(async () => {
        if (!this.isTracking) return;
        try {
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 });
          await this.handleNewLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.speed ?? 0, true);
        } catch { /* silent */ }
      }, STATIONARY_HEARTBEAT);
      return;
    }

    // ── Web / dev path (browser preview only) ────────────────────────────────
    // If a prior session set isTracking=true but the watcher was killed by the
    // browser (watcherId is null/stale), reset so we can restart cleanly.
    if (this.isTracking && !this.watcherId) {
      if (this.flushInterval) { clearInterval(this.flushInterval); this.flushInterval = null; }
      if (this.heartbeatInterval) { clearInterval(this.heartbeatInterval); this.heartbeatInterval = null; }
      if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      this.isTracking = false;
    }
    if (this.isTracking) return;

    this.user = user;
    this.sessionId = `session_${userId}_${Date.now()}`;
    this.isTracking = true;

    // Token for SW uploads
    this.swToken = user.token || getAuthToken() || "";
    this.swApiUrl = this.resolveApiBase();

    await this.registerServiceWorker();
    this.acquireWakeLock();
    this.registerPeriodicSync();
    document.addEventListener("visibilitychange", this.onVisibilityChange);

    // Drain any offline queue from previous sessions
    try { await offlineQueueService.migrate(); } catch { /* non-fatal */ }

    // Immediate first fix
    await this.captureInitialFix();
    this.initWebTracking();

    // Safety-net: flush queue every 60 s
    this.flushInterval = setInterval(() => offlineQueueService.processQueue(), 60_000);
    offlineQueueService.processQueue();

    // Stationary heartbeat
    this.heartbeatInterval = setInterval(() => this.forceUpdate(), STATIONARY_HEARTBEAT);
  }

  async stopTracking() {
    // Native: tell the foreground service to stop and clear its boot flag.
    if (Capacitor.isNativePlatform()) {
      try { await BackgroundTracker.stopTracking(); }
      catch (err) { console.warn("[LocationService] native stopTracking failed:", err); }
      this.watcherId = null;
      this.isTracking = false;
      this.lastLocation = null;
      this.sessionId = null;
      return;
    }

    if (this.watcherId) {
      navigator.geolocation.clearWatch(parseInt(this.watcherId, 10));
      this.watcherId = null;
    }

    if (this.flushInterval) { clearInterval(this.flushInterval); this.flushInterval = null; }
    if (this.heartbeatInterval) { clearInterval(this.heartbeatInterval); this.heartbeatInterval = null; }
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }

    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.releaseWakeLock();
    this.isTracking = false;
    this.lastLocation = null;
    this.sessionId = null;
  }

  // ── Forced update (ping request from admin) ───────────────────────────────

  async forceUpdate() {
    if (!this.isTracking) return;
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      });
      const { latitude, longitude, accuracy, speed } = pos.coords;
      if (Capacitor.isNativePlatform()) {
        // Native steady-state stream already runs; for an admin ping we post the
        // instant fix directly (JS is alive when the user is responding).
        const batteryLevel = await this.getBatteryLevel();
        await employeeApi.updateLocation({
          lat: latitude, lng: longitude,
          accuracy, speed: speed ?? 0, batteryLevel,
          activityType: (speed ?? 0) > 0.5 ? "moving" : "stationary",
          sessionId: this.sessionId,
          storeId: this.user?.storeId,
          isPingResponse: true,
          trackedAt: new Date().toISOString(),
        } as any, { silent: true }).catch(() => { });
      } else {
        await this.handleNewLocation(latitude, longitude, accuracy, speed ?? 0, true);
      }
    } catch (err) {
      console.warn("[LocationService] Forced update failed:", err);
    }
  }

  // ── Native (Android) — drive the custom foreground-service plugin ──────────

  private async initNativeTracking() {
    // Check that the BackgroundTracker plugin is actually available on this
    // build — registerPlugin() returns a proxy that only throws when called.
    // We detect availability by calling a lightweight method first.
    let perms: any;
    perms = await BackgroundTracker.checkAllPermissions();

    if (perms.location !== "granted") {
      perms = await BackgroundTracker.requestForegroundPermissions();
    }
    if (perms.location !== "granted") {
      console.warn(
        "[LocationService] Location permission not granted — skipping native tracking start."
      );
      throw new Error("Location permission denied");
    }

    // Mint a long-lived tracking-scoped token so syncs survive app-kill even
    // after the 1d login token would have expired. Fall back to the login
    // token if the endpoint is unreachable (degraded, but tracking still runs).
    let token: string | null = null;
    try { token = await employeeApi.getTrackingToken(); }
    catch { /* fall through to login token */ }
    const finalToken = token || getAuthToken() || "";
    if (!token) {
      console.warn("[LocationService] tracking-token unavailable; using login token (may expire mid-shift)");
    }

    const userId = this.user?._id || this.user?.id || this.user?.userId || "";
    await BackgroundTracker.startTracking({
      token: finalToken,
      apiBase: this.resolveApiBase(),
      sessionId: this.sessionId || "",
      userId: String(userId),
      storeId: this.user?.storeId,
      distanceFilter: MIN_DISTANCE,
      heartbeatMs: STATIONARY_HEARTBEAT,
    });
    this.watcherId = "native-bg";
    this.isTracking = true;
    console.log("[LocationService] Native background tracking started");
  }

  // ── Web tracking ──────────────────────────────────────────────────────────
  // Uses both watchPosition AND a poll interval for resilience.
  // When the page goes to background the browser may throttle watchPosition;
  // the poll interval (via SW keepalive) catches any missed fixes.

  private initWebTracking() {
    const opts: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,       // always fresh — no cached positions
      timeout: 8_000,
    };

    const id = navigator.geolocation.watchPosition(
      (pos) => this.handleNewLocation(
        pos.coords.latitude,
        pos.coords.longitude,
        pos.coords.accuracy,
        pos.coords.speed ?? 0
      ),
      (err) => {
        if (err?.code === 1 || String(err?.message || "").toLowerCase().includes("denied")) {
          console.warn("[LocationService] Geolocation permission denied by user. Stopping background location tracker.");
          this.stopTracking();
        } else {
          console.warn("[LocationService] Web GPS error:", err.message);
        }
      },
      opts
    );
    this.watcherId = id.toString();

    // Backup poll — ensures a fix even if watchPosition stalls in background
    this.pollInterval = setInterval(async () => {
      if (!this.isTracking) return;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 6_000,
          })
        );
        this.handleNewLocation(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy,
          pos.coords.speed ?? 0
        );
      } catch { /* position unavailable in background — that's OK */ }
    }, WEB_POLL_INTERVAL);
  }

  // ── Service Worker integration ────────────────────────────────────────────

  private async registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    try {
      // Register on a DEDICATED scope, not "/" — the main app-shell service
      // worker (vite-plugin-pwa's workbox output, registered in src/pwa.ts)
      // already owns scope "/", and both it and this SW are configured with
      // skipWaiting+clientsClaim. Two registrations fighting over the same
      // scope forces a takeover on every single page load, which src/pwa.ts's
      // onNeedRefresh reacts to with window.location.reload() — an infinite
      // full-page reload loop. See webPush.ts's firebase-messaging-sw.js
      // registration for the same pattern already used to avoid this.
      const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/location-tracking-sw-scope" });
      this.swRegistration = reg;
      // Flush any IDB queue immediately
      reg.active?.postMessage({ type: "FLUSH_QUEUE" });
      console.log("[LocationService] SW registered");
    } catch (err) {
      console.warn("[LocationService] SW registration failed:", err);
    }
  }

  private postToSW(location: any) {
    if (!this.swRegistration?.active) return;
    this.swRegistration.active.postMessage({
      type: "LOCATION_UPDATE",
      location,
      token: this.swToken,
      apiUrl: this.swApiUrl,
    });
  }

  private async registerPeriodicSync() {
    if (!this.swRegistration) return;
    try {
      // @ts-ignore — PeriodicSyncManager not in all TS lib versions
      const status = await navigator.permissions.query({ name: "periodic-background-sync" });
      if (status.state === "granted") {
        // @ts-ignore
        await this.swRegistration.periodicSync.register("loc-heartbeat", {
          minInterval: 60_000,  // 1 minute
        });
      }
    } catch { /* periodic sync not supported */ }
  }

  // ── WakeLock (prevents device sleep during field sessions) ────────────────

  private async acquireWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      this.wakeLock = await (navigator as any).wakeLock.request("screen");
    } catch { /* not supported or denied */ }
  }

  private releaseWakeLock() {
    this.wakeLock?.release().catch(() => { });
    this.wakeLock = null;
  }

  private onVisibilityChange = async () => {
    if (Capacitor.isNativePlatform()) return;
    if (document.visibilityState === "hidden") {
      if (!this.isTracking) return;
      // Screen locking / going to background — save last known position immediately
      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 5_000,
          maximumAge: 0,
        });
        await this.handleNewLocation(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy,
          pos.coords.speed ?? 0,
          true
        );
      } catch { /* GPS unavailable mid-transition — OK */ }
      return;
    }

    // App returned to foreground / screen unlocked
    // If the native watcher was killed by the OS while in the background,
    // watcherId will be null even though isTracking=true — restart cleanly.
    if (this.isTracking && !this.watcherId) {
      const savedUser = this.user;
      await this.stopTracking();
      if (savedUser) {
        await this.startTracking(savedUser);
      }
      return;
    }

    if (!this.isTracking) return;

    if (!Capacitor.isNativePlatform()) this.acquireWakeLock();
    this.swRegistration?.active?.postMessage({ type: "FLUSH_QUEUE" });
    try {
      // maximumAge: 0 — returning to foreground must never reuse a fix the OS
      // cached while the tab was backgrounded; a stale fix here can make the
      // employee look like they're at a completely different spot than they
      // actually are, and this path is "forced" straight past the debounce.
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8_000, maximumAge: 0 });
      this.handleNewLocation(
        pos.coords.latitude,
        pos.coords.longitude,
        pos.coords.accuracy,
        pos.coords.speed ?? 0,
        true
      );
    } catch { /* silent */ }
  };

  // ── Core location processor ───────────────────────────────────────────────

  private async handleNewLocation(
    lat: number,
    lng: number,
    accuracy: number,
    speed = 0,
    force = false
  ) {
    // "force" bypasses the normal debounce (distance/time throttle) for
    // foreground/background transitions, but it must never bypass a basic
    // sanity check on the fix itself — a cell-tower-grade fix (100s of
    // metres off) forced straight through as authoritative is exactly what
    // produces false "employee left the branch" signals downstream.
    if (accuracy > 150) return;
    if (!force) {
      if (accuracy > ACCURACY_THRESHOLD) return;
      const dist = this.lastLocation
        ? this.haversine(this.lastLocation.lat, this.lastLocation.lng, lat, lng)
        : Infinity;
      if (dist < MIN_DISTANCE) return;
      if (Date.now() - this.lastSyncTime < MOVING_INTERVAL) return;
    }

    const batteryLevel = await this.getBatteryLevel();
    const now = Date.now();
    const trackedAt = new Date(now).toISOString();
    const activityType = speed > 0.5 ? "moving" : "stationary";

    // Update in-memory state immediately — before any async I/O
    this.lastSyncTime = now;
    this.lastLocation = { lat, lng };
    this.persistLastLocation(lat, lng);

    // Real-time channels (fire-and-forget — ok if these fail)
    const realtimePayload = {
      lat, lng, batteryLevel, speed, accuracy,
      sessionId: this.sessionId,
      storeId: this.user?.storeId,
      activityType,
      address: "",
      trackedAt,
    };
    // Decoupled: Backend broadcasts location updates upon HTTP update, so client socket emit is redundant
    this.postToSW(realtimePayload);

    // ── ALWAYS persist to IndexedDB first ─────────────────────────────────
    // IndexedDB survives app close / process kill. Even if the HTTP call
    // never starts (app terminated mid-flight), the data stays here and
    // syncs automatically on the next launch via processQueue().
    try {
      await offlineQueueService.enqueue({
        lat, lng, batteryLevel, speed, accuracy,
        sessionId: this.sessionId,
        storeId: this.user?.storeId,
        activityType,
        address: "",
        trackedAt: now,   // stored as numeric ms for Dexie range queries
      });
    } catch (e) {
      console.warn("[LocationService] Local persist failed:", e);
    }

    // Flush queue to server immediately (non-blocking — failures retry later)
    offlineQueueService.processQueue().catch(() => { });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async captureInitialFix() {
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      });
      await this.handleNewLocation(
        pos.coords.latitude,
        pos.coords.longitude,
        pos.coords.accuracy,
        pos.coords.speed ?? 0,
        true
      );
    } catch (err: any) {
      if (err?.code === 1 || String(err?.message || "").toLowerCase().includes("denied")) {
        console.warn("[LocationService] Geolocation permission denied by user.");
      } else {
        console.warn("[LocationService] Initial fix failed:", err?.message || err);
      }
    }
  }

  private restoreLastLocation() {
    try {
      const saved = localStorage.getItem("last_tracked_location");
      if (saved) {
        const parsed = JSON.parse(saved);
        this.lastLocation = parsed.coords;
        this.lastSyncTime = parsed.time;
      }
    } catch { /* ignore */ }
  }

  private persistLastLocation(lat: number, lng: number) {
    try {
      localStorage.setItem(
        "last_tracked_location",
        JSON.stringify({ coords: { lat, lng }, time: Date.now() })
      );
    } catch { /* ignore */ }
  }

  private resolveApiBase(): string {
    try {
      // Same base the HTTP client uses — already includes the /api suffix
      // (e.g. https://node.fuertedevelopers.com/api).
      const base = (import.meta as any).env?.VITE_API_BASE_URL || (window.location.origin + "/api");
      return String(base).replace(/\/$/, "");
    } catch {
      return window.location.origin + "/api";
    }
  }

  private async getBatteryLevel(): Promise<number> {
    try {
      if ("getBattery" in navigator) {
        const b: any = await (navigator as any).getBattery();
        return Math.round(b.level * 100);
      }
    } catch { /* unavailable */ }
    return 100;
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6_371_000;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

export const locationService = new LocationService();

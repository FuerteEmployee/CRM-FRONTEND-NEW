import { useEffect } from "react";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { employeeApi } from "@/hrms/services/api";
import { toast } from "@/hrms/components/ui/use-toast";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { locationService } from "@/hrms/services/LocationService";
import { realtimeService } from "@/hrms/services/RealtimeService";
import { attendanceService } from "@/hrms/services/attendanceService";
import { apiClient } from "@/hrms/services/apiClient";
import { PushNotifications } from "@capacitor/push-notifications";

// Background tracking is orchestrated via LocationService

// Haversine formula to calculate distance between two coordinates in meters
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth radius in meters
  const toRad = (val: number) => (val * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};



/**
 * Enterprise Live Tracker Component
 * Lightweight controller that orchestrates the LocationService and RealtimeService
 */
export const LiveTracker = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const initTracking = async () => {
      // 1. Initialize Real-time communication
      if (user.token) {
        realtimeService.init(user.token);
        
        // Join personal room to receive targeted pings from admin
        const userId = user._id || user.id || user.userId;
        if (userId) {
          realtimeService.emit("join-room", `user-${userId}`);
        }

        // Listen for forced location update requests from Admin dashboard
        realtimeService.on("force_location_update", () => {
          console.log("[LiveTracker] Received ping from admin. Forcing location update...");
          locationService.forceUpdate();
        });
      }

      // 2. Register Push Notifications (FCM) to handle headless background pings
      if (Capacitor.isNativePlatform()) {
        try {
          // Clear any listeners from a previous effect run (user change / HMR)
          // so they don't accumulate and double-post the token.
          await PushNotifications.removeAllListeners();

          // register() can fail transiently with SERVICE_NOT_AVAILABLE when the
          // device can't reach FCM (e.g. WiFi blocking FCM ports 5228-5230).
          // Retry a few times with exponential backoff so flaky networks recover
          // on their own instead of silently ending up with no token.
          let registerAttempts = 0;
          const MAX_REGISTER_ATTEMPTS = 4; // 1 initial + 3 retries
          const attemptRegister = async () => {
            registerAttempts++;
            await PushNotifications.register();
          };

          // Attach listeners BEFORE register(). Capacitor does NOT buffer the
          // 'registration' event, so a listener added after register() can miss
          // the token entirely (common on fresh installs).
          await PushNotifications.addListener('registration', async (token) => {
            console.log("[LiveTracker] Push registration successful, token:", token.value);
            try {
              await apiClient.post("/users/fcm-token", { fcmToken: token.value });
              console.log("[LiveTracker] Successfully synced FCM token with backend.");
            } catch (err) {
              console.error("[LiveTracker] Failed to sync FCM token:", err);
            }
          });

          await PushNotifications.addListener('registrationError', (error: any) => {
            const msg = JSON.stringify(error);
            console.error("[LiveTracker] Error on push registration:", msg);
            if (/SERVICE_NOT_AVAILABLE/i.test(msg) && registerAttempts < MAX_REGISTER_ATTEMPTS) {
              const delayMs = 3000 * Math.pow(2, registerAttempts - 1); // 3s, 6s, 12s
              console.log(`[LiveTracker] Transient FCM error — retrying registration in ${delayMs}ms (attempt ${registerAttempts + 1}/${MAX_REGISTER_ATTEMPTS})`);
              setTimeout(() => { attemptRegister().catch(() => {}); }, delayMs);
            } else if (registerAttempts >= MAX_REGISTER_ATTEMPTS) {
              console.error("[LiveTracker] Push registration gave up after retries.");
            }
          });

          let permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
          }
          if (permStatus.receive === 'granted') {
            await attemptRegister();
          }
        } catch (err) {
          console.error("[LiveTracker] Push notification setup failed:", err);
        }
      }

      // 3. Start the tracking engine
      await locationService.startTracking(user);
    };

    initTracking();

    // ── Background geofence monitor ────────────────────────────────────────
    // Runs every 30 s regardless of which page is active, so auto punch-out
    // works even when the user is NOT on the AttendancePage.
    const roleKey   = (typeof user?.role === "object" ? (user?.role as any)?.role  : user?.role) ?? "";
    const roleLabel = (typeof user?.role === "object" ? (user?.role as any)?.label : "") ?? "";
    const isFieldStaff =
      user?.isSalesperson ||
      /field|sales|marketing_executive/i.test(roleKey) ||
      /field executive|marketing executive|field staff/i.test(roleLabel);

    let outsideCount = 0;
    let geoInterval: ReturnType<typeof setInterval> | null = null;

    if (!isFieldStaff) {
      geoInterval = setInterval(async () => {
        try {
          // Get current position (low accuracy is fine for geofence check)
          const pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 10_000,
            maximumAge: 30_000,
          });
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          const check = await attendanceService.checkGeoFence(lat, lng);
          // Geofence not configured for this branch — skip
          if (!check?.geoFenceEnabled) { outsideCount = 0; return; }

          if (!check.inside) {
            outsideCount++;
            if (outsideCount < 2) return; // require 2 consecutive outside readings
            const result = await attendanceService.autoPunchOut({ lat, lng });
            outsideCount = 0;
            if (result?.skipped) return;
            await locationService.stopTracking();
            toast({
              title: "Auto Punch-Out",
              description: "You have been automatically punched out because you left the permitted branch area.",
              variant: "destructive",
              duration: 8000,
            });
          } else {
            outsideCount = 0;
          }
        } catch { /* silent — transient GPS/network errors must not crash the interval */ }
      }, 30_000);
    }

    return () => {
      if (geoInterval) clearInterval(geoInterval);
      // Keep location tracking alive — only stop on explicit logout
    };
  }, [user]);

  // This component doesn't render any UI, it's a background worker
  return null;
};



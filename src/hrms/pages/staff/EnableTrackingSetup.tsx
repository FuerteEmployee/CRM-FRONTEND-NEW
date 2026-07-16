import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import {
  MapPin, BatteryCharging, Bell, RefreshCw, CheckCircle2, AlertTriangle, ChevronLeft,
} from "lucide-react";
import { Button } from "@/hrms/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/hrms/components/ui/card";
import { toast } from "@/hrms/hooks/use-toast";
import { BackgroundTracker } from "@/hrms/plugins/backgroundTracker";
import {
  getOemProfile, getTrackingReadiness, type OemProfile, type TrackingReadiness,
} from "@/hrms/lib/trackingSetup";

type StepState = "done" | "todo";

function StatusPill({ state }: { state: StepState }) {
  return state === "done" ? (
    <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-medium">
      <CheckCircle2 className="h-4 w-4" /> Done
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-amber-600 text-sm font-medium">
      <AlertTriangle className="h-4 w-4" /> Action needed
    </span>
  );
}

export default function EnableTrackingSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const isNative = Capacitor.isNativePlatform();
  const [oem, setOem] = useState<OemProfile | null>(null);
  const [readiness, setReadiness] = useState<TrackingReadiness | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setReadiness(await getTrackingReadiness());
  }, []);

  useEffect(() => {
    getOemProfile().then(setOem);
    refresh();
  }, [refresh]);

  const perms = readiness?.perms;
  const locationDone = perms?.location === "granted";
  const backgroundDone = perms?.background === "granted";
  const notifDone = perms?.notifications === "granted";
  const batteryDone = !!readiness?.batteryOk;

  const step = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } catch (e: any) {
      toast({ title: "Couldn't open settings", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      // Give the OS a beat, then re-read state when the user returns.
      setTimeout(refresh, 600);
      setBusy(false);
    }
  };

  const requestLocation = () => step(async () => {
    await BackgroundTracker.requestForegroundPermissions();
    // Background ("Allow all the time") must be requested separately and only
    // after foreground is granted (Android 10+ two-step flow).
    await BackgroundTracker.requestBackgroundPermission();
  });

  const requestNotifications = () => step(() => BackgroundTracker.requestNotificationPermission());
  const requestBattery = () => step(() => BackgroundTracker.requestIgnoreBatteryOptimizations());
  const openAutostart = () => step(() => BackgroundTracker.openAutostartSettings());

  if (!isNative) {
    return (
      <div className="max-w-xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Reliable tracking</CardTitle>
            <CardDescription>
              This setup only applies to the Android app. In a browser, tracking runs only while the tab is open.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <button onClick={() => navigate(-1)} className="inline-flex items-center text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold">Enable reliable tracking</h1>
        <p className="text-muted-foreground mt-1">
          So your route keeps recording even when the app is closed or the screen is off.
          Detected device: <span className="font-medium">{oem?.label ?? "…"}</span>
        </p>
      </div>

      {readiness?.ready && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 text-emerald-700 p-3 text-sm">
          <CheckCircle2 className="h-5 w-5" /> All set — background tracking is fully enabled.
        </div>
      )}

      {/* 1. Location — Allow all the time */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex gap-3">
            <MapPin className="h-5 w-5 mt-0.5 text-primary" />
            <div>
              <CardTitle className="text-base">Location: “Allow all the time”</CardTitle>
              <CardDescription>Required for tracking in the background.</CardDescription>
            </div>
          </div>
          <StatusPill state={locationDone && backgroundDone ? "done" : "todo"} />
        </CardHeader>
        <CardContent>
          <Button onClick={requestLocation} disabled={busy} variant={locationDone && backgroundDone ? "outline" : "default"}>
            {backgroundDone ? "Re-check permission" : "Grant location access"}
          </Button>
          {locationDone && !backgroundDone && (
            <p className="text-xs text-amber-600 mt-2">
              Foreground granted. Tap again and choose <strong>“Allow all the time”</strong> (Android may open Settings for this).
            </p>
          )}
        </CardContent>
      </Card>

      {/* 2. Notifications */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex gap-3">
            <Bell className="h-5 w-5 mt-0.5 text-primary" />
            <div>
              <CardTitle className="text-base">Allow the tracking notification</CardTitle>
              <CardDescription>The ongoing notification keeps the service alive (Android 13+).</CardDescription>
            </div>
          </div>
          <StatusPill state={notifDone ? "done" : "todo"} />
        </CardHeader>
        <CardContent>
          <Button onClick={requestNotifications} disabled={busy} variant={notifDone ? "outline" : "default"}>
            {notifDone ? "Re-check" : "Allow notifications"}
          </Button>
        </CardContent>
      </Card>

      {/* 3. Battery optimization */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex gap-3">
            <BatteryCharging className="h-5 w-5 mt-0.5 text-primary" />
            <div>
              <CardTitle className="text-base">Turn off battery optimization</CardTitle>
              <CardDescription>Stops Android from sleeping the tracker to save power.</CardDescription>
            </div>
          </div>
          <StatusPill state={batteryDone ? "done" : "todo"} />
        </CardHeader>
        <CardContent>
          <Button onClick={requestBattery} disabled={busy} variant={batteryDone ? "outline" : "default"}>
            {batteryDone ? "Re-check" : "Allow unrestricted battery"}
          </Button>
        </CardContent>
      </Card>

      {/* 4. OEM autostart — only meaningful on aggressive skins */}
      {oem?.aggressive && (
        <Card className="border-amber-300">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 text-amber-600" />
              <div>
                <CardTitle className="text-base">Allow autostart ({oem.label})</CardTitle>
                <CardDescription>
                  {oem.label} can still close the app after a while. This step is the most important on your phone.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              {oem.autostartSteps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
            <Button onClick={openAutostart} disabled={busy} variant="default">
              Open autostart settings
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button variant="outline" onClick={refresh} disabled={busy}>
          <RefreshCw className="h-4 w-4 mr-2" /> Re-check status
        </Button>
        <Button onClick={() => {
          const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";
          navigate(`${basePath}/staff/attendance`);
        }}>
          {readiness?.ready ? "Done" : "Continue anyway"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: after granting each item, return here and tap “Re-check status”.
      </p>
    </div>
  );
}

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Card,
} from "@/hrms/components/ui/card";
import { Badge } from "@/hrms/components/ui/badge";
import { Button } from "@/hrms/components/ui/button";
import { ScrollArea } from "@/hrms/components/ui/scroll-area";
import {
  MapPinOff,
  Navigation,
  ShieldCheck,
  Search,
  Users,
  RefreshCw,
  ExternalLink,
  Signal,
  Zap,
  RadioTower,
  Crosshair,
  Route,
  Lock,
  Unlock,
  Battery,
  Wifi,
  Activity,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  History,
} from "lucide-react";
import { Input } from "@/hrms/components/ui/input";
import { employeeApi } from "@/hrms/services/api";
import { staffService } from "@/hrms/services/staffService";
import type { User } from "@/hrms/types";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/hrms/lib/utils";
import { TrackingMap } from "@/hrms/components/staff/TrackingMap";
import { realtimeService } from "@/hrms/services/RealtimeService";
import { toast } from "@/hrms/components/ui/use-toast";
import { PersonnelCard, InfoPill, safeFormat } from "@/hrms/components/staff/HRMSShared";

const LiveTrackingPage = () => {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();

  // Data state
  const [employees, setEmployees] = useState<User[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trackingSearchQuery, setTrackingSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pathPoints, setPathPoints] = useState<any[]>([]);
  const [displayPath, setDisplayPath] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [showPath, setShowPath] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [isPathLoading, setIsPathLoading] = useState(false);
  const [isMapInteractionEnabled, setIsMapInteractionEnabled] = useState(true);
  const [activePersonnelId, setActivePersonnelId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const fetchLocations = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await employeeApi.getLatestLocations();
      const data = Array.isArray(res) ? res : (res?.data ?? []);
      setLocations(data);
      setSelectedLocation((current: any) => {
        if (!current) return current;
        const cId = current.userId || current.employeeId || current._id || current.employee?._id;
        const updated = data.find((l: any) =>
          l && (l.userId === cId || l.employeeId === cId || l.employee?._id === cId || l._id === cId)
        );
        return updated || current;
      });
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    } finally {
      if (manual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const role = typeof user.role === "string" ? user.role : user?.role?.role;
    if (role !== "admin" && role !== "super_admin") return;

    realtimeService.init(user.token || "");
    realtimeService.emit("join-room", "global-tracking");

    let buffer: any[] = [];
    let timer: NodeJS.Timeout | null = null;

    const flush = () => {
      if (!buffer.length) return;
      const currentPersonnelId = (window as any).activePersonnelId;

      setLocations((prev) => {
        const nextMap = new Map(prev.map(l => [l.userId || l.employeeId || l.employee?._id || l._id, l]));

        buffer.forEach((upd) => {
          const uid = upd.userId || upd.employeeId || upd.employee?._id || upd._id;
          if (!uid) return;

          const existing = nextMap.get(uid);
          nextMap.set(uid, { ...existing, ...upd });

          // Real-time trail update for the personnel being viewed. Must extend
          // BOTH arrays — the map draws displayPath when present, so appending
          // only to pathPoints never redrew the visible line (trail looked
          // frozen until a refresh). Same quality gate as server-side path
          // storage: skip coarse fixes and sub-20m jitter.
          if (uid === currentPersonnelId) {
            const updLat = upd.lat || upd.location?.lat;
            const updLng = upd.lng || upd.location?.lng;
            const acc = Number(upd.accuracy) || 0;
            if (updLat && updLng && acc <= 50) {
              const appendPoint = (prev: any[]) => {
                if (!prev.length) return prev; // only extend an already-loaded trail
                const last = prev[prev.length - 1];
                // don't graft live points onto a historical date's path
                if (last.timestamp && new Date(last.timestamp).toDateString() !== new Date().toDateString()) return prev;
                const toRad = (v: number) => (v * Math.PI) / 180;
                const dLat = toRad(updLat - last.lat), dLon = toRad(updLng - last.lng);
                const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(last.lat)) * Math.cos(toRad(updLat)) * Math.sin(dLon / 2) ** 2;
                const movedM = 6371e3 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
                if (movedM < 20) return prev;
                return [...prev, {
                  lat: updLat,
                  lng: updLng,
                  accuracy: acc,
                  timestamp: upd.trackedAt || new Date().toISOString()
                }];
              };
              setPathPoints(appendPoint);
              setDisplayPath(appendPoint);
            }
          }
        });
        return Array.from(nextMap.values());
      });

      setSelectedLocation((cur: any) => {
        if (!cur) return cur;
        const cId = cur.userId || cur.employeeId || cur._id || cur.employee?._id;
        const upd = buffer.find((l) => (l.userId || l.employeeId || l.employee?._id || l._id) === cId);
        return upd ? { ...cur, ...upd } : cur;
      });
      buffer = [];
      if (timer) clearTimeout(timer);
      timer = null;
    };

    realtimeService.on("location_update", (loc: any) => {
      buffer.push(loc);
      if (!timer) timer = setTimeout(flush, 300);

      if (loc.isPingResponse) {
        toast({
          title: "Ping Successful!",
          description: `Received fresh GPS location for ${loc.employee?.name || "personnel"}.`,
          variant: "default",
        });
      }
    });

    realtimeService.on("ping_status", (res: any) => {
      if (res.status === "sent_via_socket") {
        toast({ title: "Ping Sent (WebSocket)", description: "Device is active. Waiting for GPS response..." });
      } else if (res.status === "sent_via_fcm") {
        toast({ title: "Ping Sent (FCM Push)", description: "App is in background. Waking up device via push notification..." });
      } else if (res.status === "no_token") {
        toast({ title: "Device Unreachable", description: "Device is offline and has no push token registered.", variant: "destructive" });
      } else if (res.status === "error") {
        toast({ title: "Ping Failed", description: res.message || "Failed to relay ping request.", variant: "destructive" });
      }
    });

    return () => {
      realtimeService.off("location_update");
      realtimeService.off("ping_status");
    };
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const staff = await staffService.getAll();
        const all = Array.isArray(staff) ? staff : [];
        setEmployees(all);
        fetchLocations();
      } catch {
        toast({ title: "Sync Failed", description: "Could not load staff data.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    load();
    const poll = setInterval(fetchLocations, 5000);
    return () => clearInterval(poll);
  }, [fetchLocations]);

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const loadPathForDate = useCallback(async (empId: string, date: string) => {
    try {
      setIsPathLoading(true);
      const pathData = await employeeApi.getEmployeePath({ employeeId: empId, date });
      const points = pathData?.data || pathData || [];
      setStops(pathData?.stops || []);
      setDisplayPath(pathData?.displayPath || []);
      if (points.length > 0) {
        setPathPoints(points);
        setSelectedRoute({
          path: points,
          startTime: points[0]?.timestamp,
          endTime: points[points.length - 1]?.timestamp,
        });
        setShowPath(true);
      } else {
        setPathPoints([]);
        setSelectedRoute(null);
        setShowPath(false);
        toast({ title: "No Route Data", description: `No tracking data found for this date.`, variant: "destructive" });
      }
    } catch {
      setPathPoints([]);
      setStops([]);
      setDisplayPath([]);
    } finally {
      setIsPathLoading(false);
    }
  }, []);

  const handleSelectPersonnel = useCallback(async (emp: any, loc: any) => {
    const empId = emp._id || emp.id;
    setActivePersonnelId(empId);
    (window as any).activePersonnelId = empId;
    setShowPath(false);
    setSelectedRoute(null);

    if (loc) {
      setSelectedLocation(loc);
      setSelectedStaff(null);
    } else {
      setSelectedLocation(null);
      setSelectedStaff(emp);
    }

    await loadPathForDate(empId, selectedDate);
  }, [selectedDate, loadPathForDate]);

  // Reload path when date changes and an employee is selected
  useEffect(() => {
    if (activePersonnelId) {
      loadPathForDate(activePersonnelId, selectedDate);
    }
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link support:
  //   /staff/live-tracking?employeeId=..&date=YYYY-MM-DD
  //     &exitLat=..&exitLng=..&exitTime=HH:mm:ss&exitDist=..&exitAddr=..
  //
  // The attendance detail page links here to explain a disputed auto punch-out.
  // With the exit params present the map pins the exact position the server
  // decided on, alongside the branch fence and that day's movement trail —
  // which is the whole argument in one picture.
  const deepLinkApplied = useRef(false);
  const [exitMarker, setExitMarker] = useState<any>(null);
  useEffect(() => {
    if (deepLinkApplied.current || !employees.length) return;
    const params = new URLSearchParams(window.location.search);
    const empId = params.get("employeeId");
    const date = params.get("date");
    const exitLat = parseFloat(params.get("exitLat") || "");
    const exitLng = parseFloat(params.get("exitLng") || "");
    if (!empId && !date) return;
    deepLinkApplied.current = true;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) setSelectedDate(date);
    if (Number.isFinite(exitLat) && Number.isFinite(exitLng)) {
      const d = parseInt(params.get("exitDist") || "", 10);
      setExitMarker({
        lat: exitLat,
        lng: exitLng,
        time: params.get("exitTime") || undefined,
        distanceM: Number.isFinite(d) ? d : undefined,
        address: params.get("exitAddr") || undefined,
      });
      setShowPath(true); // the trail is the point — don't make them toggle it
    }
    if (empId) {
      const emp = employees.find((e: any) => String(e._id || e.id) === empId);
      if (emp) handleSelectPersonnel(emp, null);
    }
  }, [employees, handleSelectPersonnel]);

  // Markers to draw. When we arrived from "Show on map — why this happened",
  // the map is answering a question about ONE person on ONE day: every other
  // employee's marker is noise sitting on top of the evidence, and at a shared
  // office they pile up directly over the branch and the exit pin. So in that
  // mode only the subject is drawn; normal live-tracking is unchanged.
  const mapLocations = useMemo(() => {
    if (exitMarker && activePersonnelId) {
      const mine = locations.filter(
        (l: any) => String(l.userId || l.employeeId || l._id) === String(activePersonnelId),
      );
      return mine.length ? mine : [];
    }
    return selectedLocation ? [selectedLocation] : locations;
  }, [exitMarker, activePersonnelId, locations, selectedLocation]);

  // Geofence of whoever is selected. Comes from the employee's own branch, so
  // the circle always matches the fence that employee is actually judged
  // against — not a global default.
  const activeGeofence = useMemo(() => {
    if (!activePersonnelId) return null;
    const rec: any = locations.find((l: any) => String(l.userId || l._id) === String(activePersonnelId));
    const br = rec?.branch;
    if (!br || typeof br.latitude !== "number" || typeof br.longitude !== "number") return null;
    const radiusM = typeof br.radius === "number" ? br.radius : 500;
    // Mirrors exitBufferM() on the backend — keep in step if that changes.
    const buffer = Math.max(35, Math.min(50, Math.max(20, Math.round(radiusM * 0.5))));
    return { lat: br.latitude, lng: br.longitude, radiusM, thresholdM: radiusM + buffer, name: br.name };
  }, [activePersonnelId, locations]);

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    const today = new Date().toISOString().split('T')[0];
    const newDate = d.toISOString().split('T')[0];
    if (newDate <= today) setSelectedDate(newDate);
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (!hasPermission("view_live_tracking")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center p-8">
        <div className="h-20 w-20 rounded-3xl bg-red-50 flex items-center justify-center">
          <ShieldCheck className="h-10 w-10 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
        <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 space-y-6 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Live Field Tracking</h1>
          <p className="text-slate-400 text-sm mt-0.5">Real-time GPS monitoring and route history for field personnel</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Navigation */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl h-9 px-1 shadow-sm">
            <button onClick={() => changeDate(-1)} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => dateInputRef.current?.showPicker()}
              className={cn(
                "h-7 px-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors",
                isToday ? "text-indigo-600 bg-indigo-50" : "text-amber-600 bg-amber-50"
              )}
            >
              {isToday ? <Zap className="h-3 w-3" /> : <History className="h-3 w-3" />}
              {formatDateLabel(selectedDate)}
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="sr-only"
            />
            <button
              onClick={() => changeDate(1)}
              disabled={isToday}
              className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
                isToday ? "text-slate-200 cursor-not-allowed" : "text-slate-500 hover:bg-slate-100"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={() => fetchLocations(true)} variant="outline" className="h-9 rounded-xl border-slate-200">
            <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Live Now", value: locations.filter(l => l && (new Date().getTime() - new Date(l.trackedAt).getTime()) < 180000).length, icon: Zap, color: "emerald" },
          { label: "Offline", value: employees.length - locations.filter(l => l && (new Date().getTime() - new Date(l.trackedAt).getTime()) < 180000).length, icon: Signal, color: "slate" },
          { label: "Tracking Points", value: pathPoints.length || 0, icon: Route, color: "indigo" },
          { label: "Field Staff", value: employees.length, icon: Users, color: "blue" },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-3 p-3 rounded-2xl bg-${s.color}-50 border border-${s.color}-100`}>
            <div className={`h-8 w-8 rounded-xl bg-${s.color}-100 flex items-center justify-center`}>
              <s.icon className={`h-4 w-4 text-${s.color}-600`} />
            </div>
            <div>
               <p className={`text-lg font-bold text-${s.color}-700 tabular-nums`}>{s.value}</p>
              <p className={`text-[10px] font-medium text-${s.color}-500`}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row h-full min-h-[750px] lg:h-[520px]">
          <div className="lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col h-[300px] lg:h-full bg-slate-50/60 shrink-0">
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search personnel..."
                  className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 rounded-xl"
                  value={trackingSearchQuery}
                  onChange={(e) => setTrackingSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-3 py-3 space-y-2">
                {employees
                  .filter((e) => e.name.toLowerCase().includes(trackingSearchQuery.toLowerCase()))
                  .map((emp: any) => {
                    const empId = emp._id || emp.id;
                    const loc = locations.find((l) => l && (l.employeeId === empId || l.employee?._id === empId || l.userId === empId));
                    const isActive = activePersonnelId === empId;
                    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
                    const trackedMs = loc ? new Date(loc.trackedAt).getTime() : 0;
                    const isLive  = loc && (Date.now() - trackedMs) < 180_000;
                    const isStale = loc && trackedMs > 0 && (Date.now() - trackedMs) > TWO_HOURS_MS;
                    return (
                      <PersonnelCard
                        key={empId}
                        emp={emp}
                        loc={loc}
                        isActive={isActive}
                        isLive={!!isLive}

                        isStale={!!isStale}
                        isPathLoading={isPathLoading}
                        onClick={() => handleSelectPersonnel(emp, loc)}
                      />
                    );
                  })}
              </div>
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col min-h-[450px] lg:h-full relative">


            <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {selectedLocation || selectedStaff ? (
                  <>
                    <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                      {selectedLocation ? <Navigation className="h-4 w-4 text-white" /> : <MapPinOff className="h-4 w-4 text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {selectedLocation?.employee?.name || selectedStaff?.name || "Unknown"}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {selectedLocation?.location?.address ||
                          (selectedLocation ? `${selectedLocation.location?.lat.toFixed(4)}, ${selectedLocation.location?.lng.toFixed(4)}` :
                            (selectedStaff ? "GPS signal unavailable" : "Searching for signal..."))}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Crosshair className="h-4 w-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600">Tracking Console</p>
                      <p className="text-[11px] text-slate-400">Select a personnel to track</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedLocation && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 px-3 rounded-xl border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 shadow-sm transition-colors"
                      onClick={() => {
                        const eId = selectedLocation.employeeId || selectedLocation.userId || selectedLocation.employee?._id;
                        if (eId) {
                          realtimeService.emit("force_location_update_request", { employeeId: eId });
                        }
                      }}
                      title="Force Location Refresh"
                    >
                      <RadioTower className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline font-bold text-[11px]">Ping Device</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 rounded-xl border-slate-200 shadow-sm"
                      onClick={() => {
                        const lng = selectedLocation.location?.lng ?? selectedLocation.lng;
                        const lat = selectedLocation.location?.lat ?? selectedLocation.lat;
                        if (lng && lat) {
                          (window as any).mapRef?.flyTo({ center: [lng, lat], zoom: 15, duration: 1000 });
                        }
                      }}
                      title="Center on Personnel"
                    >
                      <Crosshair className="h-3.5 w-3.5 text-indigo-500" />
                    </Button>
                  </div>
                )}
                <Button
                  size="sm"
                  variant={isMapInteractionEnabled ? "default" : "outline"}
                  className="h-8 gap-1.5 px-3 rounded-xl text-[11px] shadow-sm"
                  onClick={() => setIsMapInteractionEnabled(!isMapInteractionEnabled)}
                >
                  {isMapInteractionEnabled ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {isMapInteractionEnabled ? "Unlocked" : "Locked"}
                </Button>

                {selectedLocation && (
                  <div className="hidden sm:flex items-center gap-4 ml-2 border-l pl-4 border-slate-100">
                    <InfoPill
                      icon={Route}
                      label="Distance"
                      value={`${((selectedLocation.totalDistance || 0) / 1000).toFixed(2)} km`}
                      color="indigo"
                    />
                    {selectedLocation.batteryLevel !== undefined && (
                      <InfoPill
                        icon={Battery}
                        label="Battery"
                        value={`${selectedLocation.batteryLevel}%`}
                        color={selectedLocation.batteryLevel < 20 ? "red" : "emerald"}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 relative bg-slate-100 min-h-[400px]">
              <TrackingMap
                locations={mapLocations}
                selectedLocation={selectedLocation}
                pathPoints={pathPoints}
                displayPath={displayPath}
                stops={stops}
                showPath={showPath}
                isMapInteractionEnabled={isMapInteractionEnabled}
                activePersonnelId={activePersonnelId}
                geofence={activeGeofence}
                exitMarker={exitMarker}
                onMarkerClick={(loc: any) => {
                  setSelectedLocation(loc);
                  setSelectedStaff(null);
                  setShowPath(false);
                  const eId = loc.employeeId || loc.userId || loc.employee?._id;
                  setActivePersonnelId(eId);
                  (window as any).activePersonnelId = eId;
                  if (eId) {
                    loadPathForDate(eId, selectedDate);
                  }
                }}
              />
              {!selectedLocation && !selectedStaff && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px] pointer-events-none">
                  <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-xs pointer-events-auto border">
                    <RadioTower className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
                    <h3 className="font-bold text-slate-700">Select Personnel</h3>
                    <p className="text-xs text-slate-400 mt-2">Select a member from the sidebar to view their live location and movement history.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LiveTrackingPage;

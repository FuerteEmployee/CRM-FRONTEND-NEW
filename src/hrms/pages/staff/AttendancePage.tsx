import { useState, useEffect, useRef, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/hrms/components/ui/card";
import { Button } from "@/hrms/components/ui/button";
import { Skeleton } from "@/hrms/components/ui/skeleton";
import {
  UserCheck,
  Coffee,
  History as HistoryIcon,
  Timer,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  ArrowRight,
  LayoutDashboard,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Sunrise,
  Sunset,
  AlarmClock,
  LogIn,
  LogOut,
  MapPinOff,
  MapPin,
  LayoutGrid,
  List,
  Camera,
  CameraOff,
  PartyPopper,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { attendanceService } from "@/hrms/services/attendanceService";
import { locationService } from "@/hrms/services/LocationService";
import { getTrackingReadiness } from "@/hrms/lib/trackingSetup";
import { BackgroundTracker } from "@/hrms/plugins/backgroundTracker";
import { realtimeService } from "@/hrms/services/RealtimeService";
import { shiftService, configuredLunchMinutes, type Shift } from "@/hrms/services/shiftService";
import { holidayService, type Holiday } from "@/hrms/services/holidayService";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { toast } from "@/hrms/hooks/use-toast";
import { ToastAction } from "@/hrms/components/ui/toast";
import {
  format,
  isValid,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  startOfDay,
  subMonths,
  addMonths,
  isAfter
} from "date-fns";
import { useHaptics } from "@/hrms/hooks/useHaptics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/hrms/components/ui/dialog";
import { Badge } from "@/hrms/components/ui/badge";
import { Attendance } from "@/hrms/types/hr";
import { cn } from "@/hrms/lib/utils";

const ATT_CAL_CELL: Record<string, { bg: string; border: string; label: string; labelColor: string; dot: string }> = {
  "Full Day": { bg: "bg-emerald-100", border: "border-emerald-200", label: "FULL", labelColor: "text-emerald-600", dot: "bg-emerald-500" },
  "Half Day": { bg: "bg-sky-100", border: "border-sky-200", label: "HALF", labelColor: "text-sky-500", dot: "bg-sky-400" },
  "Absent": { bg: "bg-rose-100", border: "border-rose-200", label: "ABSENT", labelColor: "text-rose-400", dot: "bg-rose-400" },
  "On Duty": { bg: "bg-blue-100", border: "border-blue-200", label: "ON DUTY", labelColor: "text-blue-500", dot: "bg-blue-400" },
  "Pending": { bg: "bg-sky-50", border: "border-sky-200", label: "TODAY", labelColor: "text-sky-500", dot: "bg-sky-400" },
  "Weekly Off": { bg: "bg-white", border: "border-slate-100", label: "OFF", labelColor: "text-slate-400", dot: "bg-slate-300" },
  "Holiday": { bg: "bg-violet-100", border: "border-violet-200", label: "HOLIDAY", labelColor: "text-violet-600", dot: "bg-violet-400" },
  // Punched in but never punched out, and the server never finalised a status.
  // Distinct from Absent: the employee did turn up.
  "No punch-out": { bg: "bg-orange-100", border: "border-orange-200", label: "NO OUT", labelColor: "text-orange-600", dot: "bg-orange-400" },
  "Upcoming": { bg: "bg-white", border: "border-slate-100", label: "–", labelColor: "text-slate-300", dot: "" },
};

const AttendancePage = () => {
  const { user, refreshUser } = useAuth();
  // `user` comes from the main CRM's PermissionContext, which stores
  // firstname/lastname — not a combined `name` field — so build it here.
  const staffName = [(user as any)?.firstname, (user as any)?.lastname].filter(Boolean).join(" ").trim() || (user as any)?.name || "User";
  const staffInitials = staffName !== "User" ? staffName.substring(0, 2).toUpperCase() : "US";
  const navigate = useNavigate();
  const location = useLocation();
  const { lightImpact } = useHaptics();

  // After a native punch-in, if background tracking isn't fully enabled
  // (background-location / battery / OEM autostart), send the user to the
  // one-time setup screen so tracking actually survives app-kill.
  const gateTrackingSetup = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { ready } = await getTrackingReadiness();
      if (!ready) {
        const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";
        navigate(`${basePath}/staff/enable-tracking`);
      }
    } catch { /* non-fatal */ }
  };
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showRePunchConfirm, setShowRePunchConfirm] = useState(false);
  const [attView, setAttView] = useState<"calendar" | "list">("calendar");
  // Camera modal state — opens when the user taps Punch In / Punch Out;
  // captures a selfie from the live camera feed and sends it with the punch.
  // If the camera is unavailable or denied, the punch still goes through without an image.
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraPunchAction, setCameraPunchAction] = useState<"punch-in" | "punch-out">("punch-in");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null); // data-URL preview
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const geoWatchRef = useRef<number | null>(null);   // watchPosition watch ID
  const gpsWarmRef = useRef<number | null>(null);     // keeps GPS hardware warm on page mount
  const outsideCountRef = useRef(0);                    // consecutive outside readings
  const lastCheckRef = useRef(0);                    // timestamp of last checkGeoFence call
  const [geoStatus, setGeoStatus] = useState<{ enabled: boolean; inside: boolean; outsideCount: number } | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [todayHoliday, setTodayHoliday] = useState<Holiday | null>(null);
  // Company holidays covering the month being viewed, so the history can label
  // them instead of calling them absences.
  const [monthHolidays, setMonthHolidays] = useState<Holiday[]>([]);

  // Company holiday today? Punch-in is optional and the day is paid — tell
  // the employee instead of letting the screen nag about the shift.
  useEffect(() => {
    const branchId = (user as any)?.hrmsBranchId || (user as any)?.storeId || undefined;
    holidayService
      .getToday(typeof branchId === "object" ? branchId?._id : branchId)
      .then(setTodayHoliday)
      .catch(() => { /* non-fatal — banner just stays hidden */ });
  }, [user]);

  // Holidays for the month on screen. A holiday may span days (date..endDate),
  // so it is expanded per-day, matching how payroll credits festivalDates.
  useEffect(() => {
    const branchRaw = (user as any)?.hrmsBranchId || (user as any)?.storeId || undefined;
    const branchId = typeof branchRaw === "object" ? branchRaw?._id : branchRaw;
    holidayService
      .getAll({
        year: selectedMonth.getFullYear(),
        month: selectedMonth.getMonth() + 1,
        branchId,
      })
      .then(setMonthHolidays)
      .catch(() => setMonthHolidays([]));
  }, [user, selectedMonth]);

  // date string -> holiday name, expanded across multi-day holidays.
  const holidayByDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of monthHolidays) {
      if (h.isActive === false || !h.date) continue;
      const last = h.endDate && h.endDate >= h.date ? h.endDate : h.date;
      const cursor = new Date(`${h.date}T00:00:00`);
      const stop = new Date(`${last}T00:00:00`);
      // Guard against a malformed range producing an unbounded loop.
      let guard = 0;
      while (cursor <= stop && guard < 400) {
        map.set(format(cursor, "yyyy-MM-dd"), h.name);
        cursor.setDate(cursor.getDate() + 1);
        guard += 1;
      }
    }
    return map;
  }, [monthHolidays]);

  // The cached profile (from login) never reflects admin-side edits made
  // afterwards — e.g. a shift assigned later would still show "No shift
  // assigned" until the employee logged out and back in. Pull a fresh
  // profile once when this screen opens instead.
  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user?.shiftId) {
      shiftService.getById(user.shiftId).then((s) => setShift(s || null)).catch(() => { });
    }
  }, [user?.shiftId]);

  const checkDeveloperOptions = async (): Promise<boolean> => {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        const res = await BackgroundTracker.isDeveloperOptionsEnabled();
        return res.enabled;
      } catch (e) {
        console.error("Failed to check developer options:", e);
        return false;
      }
    }
    return false;
  };

  // Open camera stream for the confirmation modal
  const openCameraStream = async () => {
    setCameraReady(false);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
    } catch (err: any) {
      setCameraError("Camera unavailable. You can still punch in without it.");
    }
  };

  // Stop camera stream when modal closes
  const closeCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setCameraError(null);
    setCapturedSelfie(null);
    setCapturedBlob(null);
  };

  // Capture a still frame from the video into a Blob + data-URL preview
  const captureSnapshot = (): Promise<{ blob: Blob; dataUrl: string } | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      if (!video || !cameraReady) { resolve(null); return; }
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      // Mirror horizontally to match the mirrored live preview
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (!blob) { resolve(null); return; }
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve({ blob, dataUrl });
      }, "image/jpeg", 0.85);
    });
  };

  // Opens the camera modal instead of punching directly
  const handlePunchWithCamera = async (action: "punch-in" | "punch-out") => {
    const isDevOn = await checkDeveloperOptions();
    if (isDevOn) {
      toast({
        title: "Action Denied",
        description: "Please turn off Developer Options in your phone settings to register attendance.",
        variant: "destructive",
        duration: 8000,
      });
      return;
    }
    setCameraPunchAction(action);
    setShowCameraModal(true);
    // Start camera stream after modal opens
    setTimeout(() => openCameraStream(), 150);
  };

  // Clock — runs once, independent of month/employee changes
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keep GPS hardware continuously warm on page mount so getCurrentPosition(maximumAge:0)
  // returns in ~1s instead of cold-starting (5–15s) when the user taps Punch In.
  useEffect(() => {
    if (!navigator.geolocation) return;
    gpsWarmRef.current = navigator.geolocation.watchPosition(
      () => { /* position updates just keep GPS warm — not used directly */ },
      () => { /* silent — permission errors handled on actual punch */ },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
    return () => {
      if (gpsWarmRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWarmRef.current);
        gpsWarmRef.current = null;
      }
    };
  }, []);

  // Fetch attendance when month changes
  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchTodayEvents = async () => {
    try {
      const events = await attendanceService.getTodayEvents();
      setTodayEvents(Array.isArray(events) ? events : []);
    } catch { /* non-fatal — activity list just stays empty */ }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [todayData, historyData] = await Promise.all([
        attendanceService.getTodayAttendance(),
        attendanceService.getAttendanceHistory({
          month: selectedMonth.getMonth() + 1,
          year: selectedMonth.getFullYear()
        })
      ]);
      setAttendance(todayData);
      setHistory(historyData.data || historyData);
      fetchTodayEvents();
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchToday = async () => {
    try {
      const todayData = await attendanceService.getTodayAttendance();
      setAttendance(todayData);
      fetchTodayEvents();
    } catch (error) {
      console.error("Error fetching today attendance:", error);
    }
  };

  // Resume tracking if user is punched in. Root punchOut only closes Session 1 —
  // during Sessions 2+ it is already set, so also check for an open additional
  // session or tracking silently never resumes after a page reload.
  useEffect(() => {
    if (!attendance || !user) return;
    const mainOpen = attendance.punchIn && !attendance.punchOut?.time;
    const additionalOpen = (attendance.sessions ?? []).some(
      (s) => s.punchIn?.time && !s.punchOut?.time
    );
    if (mainOpen || additionalOpen) {
      locationService.startTracking(user);
    }
  }, [attendance, user]);

  const status = useMemo(() => {
    if (!attendance) return "Out";
    const sessions = attendance.sessions ?? [];
    const hasOpenAdditional = sessions.some(s => s.punchIn?.time && !s.punchOut?.time);
    if (hasOpenAdditional) return "In";
    if (attendance.punchIn && !attendance.punchOut?.time) {
      if (attendance.lunchIn?.time && !attendance.lunchOut?.time) return "Lunch";
      return "In";
    }
    return "Out";
  }, [attendance]);

  // Expected WORK minutes: shift span minus configured lunch — mirrors the
  // backend's getEffectiveShiftHours (a 9h shift with 1h lunch targets 8h).
  const shiftDurationMins = useMemo(() => {
    if (!shift?.startTime || !shift?.endTime) return 480;
    try {
      const [sh, sm] = shift.startTime.split(":").map(Number);
      const [eh, em] = shift.endTime.split(":").map(Number);
      let mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins <= 0) mins += 24 * 60; // overnight shift
      mins -= configuredLunchMinutes(shift);
      return mins > 0 ? mins : 480;
    } catch { return 480; }
  }, [shift]);

  const todayWorkingHours = useMemo(() => {
    if (!attendance?.punchIn?.time) return null;

    const parseT = (t: string): Date | null => {
      try {
        const iso = new Date(t);
        if (!isNaN(iso.getTime()) && iso.getFullYear() > 2000) return iso;
        const parts = t.split(":").map(Number);
        const d = new Date();
        d.setHours(parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, 0);
        return isNaN(d.getTime()) ? null : d;
      } catch { return null; }
    };

    const inTime = parseT(attendance.punchIn!.time);
    if (!inTime) return null;

    const sessions = attendance.sessions ?? [];
    const hasOpenAdditional = sessions.some(s => s.punchIn?.time && !s.punchOut?.time);
    const isOnLunch = !!attendance.lunchIn?.time && !attendance.lunchOut?.time && !hasOpenAdditional;
    const isLive = !attendance.punchOut?.time || hasOpenAdditional;

    let diffMs = 0;

    // Main session (Session 1) — timer always runs, no freeze during lunch
    if (attendance.punchOut?.time) {
      const outTime = parseT(attendance.punchOut.time);
      if (outTime) diffMs += Math.max(0, outTime.getTime() - inTime.getTime());
    } else {
      diffMs += Math.max(0, currentTime.getTime() - inTime.getTime());
    }

    // Additional sessions (Sessions 2+)
    for (const session of sessions) {
      const sIn = parseT(session.punchIn.time);
      if (!sIn) continue;
      if (session.punchOut?.time) {
        const sOut = parseT(session.punchOut.time);
        if (sOut) diffMs += Math.max(0, sOut.getTime() - sIn.getTime());
      } else {
        diffMs += Math.max(0, currentTime.getTime() - sIn.getTime());
      }
    }

    const totalMs = Math.max(0, diffMs);
    const totalMins = Math.floor(totalMs / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const s = Math.floor((totalMs / 1000) % 60);

    return { h, m, s, totalMins, isLive, isOnLunch };
  }, [attendance, currentTime]);

  // Listen for server-triggered auto punch-out (fires even when app is backgrounded)
  useEffect(() => {
    if (!user) return;
    const handler = async (data: any) => {
      await locationService.stopTracking();
      await fetchData();
      toast({
        title: "Auto Punch-Out",
        description: data?.reason || "You have been automatically punched out because you left the permitted branch area.",
        variant: "destructive",
        duration: 12000,
        // One-tap self-service: clock back in (refused automatically if you really are outside).
        action: (
          <ToastAction altText="Re-punch in" onClick={() => handleDirectPunch("punch-in")}>
            Re-punch in
          </ToastAction>
        ),
      });
    };
    realtimeService.on("auto_punch_out", handler);

    // Shift/lunch reminders (in-app toast when the app is open; the same event
    // also arrives as a push notification via FCM when backgrounded).
    const reminderHandler = (data: any) => {
      toast({
        title: data?.title || "Reminder",
        description: data?.body || "",
        duration: 8000,
      });
    };
    realtimeService.on("attendance_reminder", reminderHandler);

    return () => {
      realtimeService.off("auto_punch_out");
      realtimeService.off("attendance_reminder");
    };
  }, [user]);

  // Continuous geo-fence monitor via watchPosition — auto punch-out if outside.
  // Does NOT apply to salespersons or field/marketing staff.
  // Throttle: max one checkGeoFence API call per 20 s.
  // Hysteresis: require 2 consecutive outside readings before acting,
  //             so a single GPS jitter spike never causes a false punch-out.
  useEffect(() => {
    if (status !== "In" || !navigator.geolocation) {
      if (geoWatchRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
        geoWatchRef.current = null;
      }
      outsideCountRef.current = 0;
      setGeoStatus(null);
      return;
    }

    const roleKey = (typeof user?.role === "object" ? (user?.role as any)?.role : user?.role) ?? "";
    const roleLabel = typeof user?.role === "object" ? ((user?.role as any)?.label ?? "") : "";
    const isFieldStaff =
      user?.isSalesperson ||
      /field|sales|marketing_executive/i.test(roleKey) ||
      /field executive|marketing executive|field staff/i.test(roleLabel);
    if (isFieldStaff) return;

    const THROTTLE_MS = 20_000; // min 20 s between API calls

    const handlePosition = async (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastCheckRef.current < THROTTLE_MS) return;
      lastCheckRef.current = now;

      // Skip readings worse than 50 m accuracy — unreliable for small radii
      if (pos.coords.accuracy > 50) return;

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      try {
        const check = await attendanceService.checkGeoFence(lat, lng);
        if (!check.geoFenceEnabled) {
          setGeoStatus({ enabled: false, inside: true, outsideCount: 0 });
          return;
        }

        if (!check.inside) {
          outsideCountRef.current += 1;
          setGeoStatus({ enabled: true, inside: false, outsideCount: outsideCountRef.current });
          if (outsideCountRef.current < 2) return; // wait for second reading to confirm
          const result = await attendanceService.autoPunchOut({ lat, lng, accuracy: pos.coords.accuracy });
          if (result?.skipped) return;
          if (geoWatchRef.current !== null) {
            navigator.geolocation.clearWatch(geoWatchRef.current);
            geoWatchRef.current = null;
          }
          await locationService.stopTracking();
          await fetchData();
          toast({
            title: "Auto Punch-Out",
            description: "You have been automatically punched out because you left the permitted branch area.",
            variant: "destructive",
            duration: 8000,
          });
        } else {
          outsideCountRef.current = 0; // reset on re-entry
          setGeoStatus({ enabled: true, inside: true, outsideCount: 0 });
        }
      } catch { /* silent — transient network errors must not crash the watch */ }
    };

    outsideCountRef.current = 0;
    lastCheckRef.current = 0;
    geoWatchRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      () => { /* ignore position errors silently */ },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 }
    );

    return () => {
      if (geoWatchRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
        geoWatchRef.current = null;
      }
    };
  }, [status, user]);

  const fullHistory = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const days = eachDayOfInterval({ start, end: endOfMonth(selectedMonth) });
    const shiftHours = shiftDurationMins / 60;

    return days.map(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      const record = history.find(h => h.date === dateStr);
      const isToday = isSameDay(date, new Date());

      if (record) {
        let status: string;
        if (record.punchOut?.time) {
          let hours = record.totalHours;
          if (!hours && record.punchIn?.time && record.punchOut?.time) {
            try {
              const inD = new Date(`${record.date}T${record.punchIn.time}`);
              const outD = new Date(`${record.date}T${record.punchOut.time}`);
              hours = Math.max(0, (outD.getTime() - inD.getTime()) / 3600000);
            } catch { hours = 0; }
          }
          // Full Day requires completing the ENTIRE assigned shift duration;
          // any completed punch under that is Half Day.
          status = record.status || (hours >= shiftHours ? "Full Day" : "Half Day");
        } else {
          // Still punched in (no punch-out yet): "On Duty" today, else it was
          // never completed — Absent until an admin corrects it.
          status = isToday ? "On Duty" : "Absent";
        }
        return { ...record, status };
      }

      const isPast = isBefore(date, startOfDay(new Date()));

      // Days with no record at all are not automatically absences. Company
      // holidays are PAID days in payroll, so labelling them "Absent" made an
      // employee's own page show phantom absences and disagree with their payslip.
      const holiday = holidayByDate.get(dateStr);
      if (holiday) {
        return { date: dateStr, status: "Holiday", holidayName: holiday } as any;
      }

      return {
        date: dateStr,
        status: isToday ? "Pending" : (isPast ? "Absent" : "Upcoming"),
      } as any;
    }).reverse();
  }, [selectedMonth, history, shiftDurationMins, holidayByDate]);

  const stats = useMemo(() => {
    const monthHistory = fullHistory.filter(h => h.status !== "Upcoming");
    const presentDays = monthHistory.filter(h => ["Full Day", "Half Day", "On Duty"].includes(h.status)).length;
    const absentDays = monthHistory.filter(h => h.status === "Absent").length;

    const totalMinutes = history.reduce((acc, curr) => {
      // Only count records in the selected month
      const recordDate = new Date(curr.date);
      if (recordDate.getMonth() !== selectedMonth.getMonth() || recordDate.getFullYear() !== selectedMonth.getFullYear()) return acc;

      if (curr.totalHours) return acc + (curr.totalHours * 60);

      if (curr.punchIn?.time && curr.punchOut?.time) {
        try {
          const start = new Date(`${curr.date}T${curr.punchIn.time}`);
          const end = new Date(`${curr.date}T${curr.punchOut.time}`);
          if (!isValid(start) || !isValid(end)) return acc;
          let diffMs = end.getTime() - start.getTime();
          const durationMins = diffMs / (1000 * 60);
          return isNaN(durationMins) ? acc : acc + Math.max(0, durationMins);
        } catch (e) { return acc; }
      }
      return acc;
    }, 0);

    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);

    return {
      presentDays,
      absentDays,
      totalHours: h,
      totalMins: m.toString().padStart(2, '0')
    };
  }, [fullHistory, history, selectedMonth]);

  const calendarGrid = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const startPad = monthStart.getDay();
    const monthDays = eachDayOfInterval({ start: monthStart, end: endOfMonth(selectedMonth) });
    return { monthDays, startPad };
  }, [selectedMonth]);

  const historyByDate = useMemo(() => {
    const map: Record<string, any> = {};
    fullHistory.forEach((d: any) => { map[d.date] = d; });
    return map;
  }, [fullHistory]);

  const getLocation = (): Promise<{ lat: number; lng: number; accuracy: number; fixAt: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      let settled = false;
      const finish = (fn: () => void) => {
        if (!settled) {
          settled = true;
          fn();
        }
      };

      // Absolute safety timeout so getLocation never hangs indefinitely —
      // must exceed both fresh-fix attempts below (9s + 8s) plus the final
      // cached-fix fallback attempt.
      const safetyTimer = setTimeout(() => {
        finish(() => reject(new Error("Location Timeout: Could not detect device location. Please check browser location permissions.")));
      }, 22000);

      const tryGetPos = (highAcc: boolean, timeoutMs: number, maxAge: number, onFail: (err: any) => void) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(safetyTimer);
            finish(() =>
              resolve({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                fixAt: pos.timestamp,
              })
            );
          },
          onFail,
          {
            timeout: timeoutMs,
            enableHighAccuracy: highAcc,
            maximumAge: maxAge,
          },
        );
      };

      // Try high accuracy first (GPS on mobile), then fall back to standard
      // accuracy (WiFi/IP on laptop/desktop). Both need a fresh fix
      // (maximumAge: 0) since they're the "real" attempts.
      tryGetPos(true, 9000, 0, (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          clearTimeout(safetyTimer);
          finish(() =>
            reject(
              new Error(
                "Location Permission Denied: Please allow location access in your browser or Windows privacy settings."
              )
            )
          );
        } else {
          tryGetPos(false, 8000, 0, (err2) => {
            if (err2.code === err2.PERMISSION_DENIED) {
              clearTimeout(safetyTimer);
              finish(() =>
                reject(
                  new Error(
                    "Location Permission Denied: Please allow location access in your browser or Windows privacy settings."
                  )
                )
              );
              return;
            }
            // Last resort: accept a recent cached fix (up to 60s old) instead of
            // failing outright on a transient GPS/WiFi-positioning hiccup. The
            // server still rejects anything worse than 150m accuracy, so this
            // never bypasses the geofence check — it just avoids blocking punch-in
            // when a fresh fix twice failed to arrive in time.
            tryGetPos(false, 3000, 60000, (err3) => {
              clearTimeout(safetyTimer);
              let msg = "Failed to get location.";
              if (err3.code === err3.PERMISSION_DENIED) {
                msg = "Location Permission Denied: Please allow location access in your browser or Windows privacy settings.";
              } else if (err3.code === err3.POSITION_UNAVAILABLE) {
                msg = "Location Unavailable: Please ensure Location Services are enabled on your device.";
              } else if (err3.code === err3.TIMEOUT) {
                msg = "Location Timeout: Could not detect location. Please check your network/location settings.";
              }
              finish(() => reject(new Error(msg)));
            });
          });
        }
      });
    });
  };

  // Fresh fix for a punch — never cached. Shows the specific failure reason
  // (permission denied / GPS off / timeout) with a Retry action and returns
  // null so the caller blocks the punch. Accuracy itself is NOT gated here —
  // indoor phone fixes are routinely ±60-150m and blocking them locks users
  // out; the accuracy value is sent with the punch and the SERVER rejects
  // anything worse than 150m where the geofence decision needs it.
  const acquireFreshLocation = async (
    onRetry: () => void,
  ): Promise<{ lat: number; lng: number; accuracy: number; fixAt: number } | null> => {
    setFetchingLocation(true);
    try {
      const pos = await getLocation();
      return pos;
    } catch (error: any) {
      console.warn("[AttendancePage] Could not acquire location for punch:", error);
      toast({
        title: "Location Required",
        description: error?.message || "Could not get your location.",
        variant: "destructive",
        duration: 8000,
        action: (
          <ToastAction altText="Retry" onClick={onRetry}>
            Retry
          </ToastAction>
        ),
      });
      return null;
    } finally {
      setFetchingLocation(false);
    }
  };

  // Geo-fence enforces presence. Selfie blob is optional — if camera was available
  // it is captured from the modal and sent with the punch; if denied or unavailable
  // the punch goes through without any image.
  const handleDirectPunch = async (action: "punch-in" | "punch-out", selfieBlob: Blob | null = null) => {
    const isDevOn = await checkDeveloperOptions();
    if (isDevOn) {
      toast({
        title: "Action Denied",
        description: "Please turn off Developer Options in your phone settings to register attendance.",
        variant: "destructive",
        duration: 8000,
      });
      return;
    }
    setIsProcessing(true);
    try {
      const pos = await acquireFreshLocation(() => handleDirectPunch(action, selfieBlob));
      if (!pos) return; // punch blocked — no valid location
      const location = { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, fixAt: pos.fixAt };
      if (action === "punch-in") {
        await attendanceService.punchIn(selfieBlob, location);
        toast({ title: "Punched In", description: "Punched in successfully." });
        if (user) locationService.startTracking(user);
        gateTrackingSetup();
      } else {
        await attendanceService.punchOut(selfieBlob, location);
        toast({ title: "Punched Out", description: "Punched out successfully." });
        locationService.stopTracking();
      }
      await fetchToday();
    } catch (error: any) {
      const responseData = error?.responseData ?? error?.response?.data;
      if (responseData?.geoFenceViolation) {
        toast({
          title: action === "punch-out"
            ? "Punch Out Denied — Outside Branch Area"
            : "Punch In Denied — Outside Branch Area",
          description: responseData.message || "You are not within your assigned branch location radius.",
          variant: "destructive",
          duration: 8000,
        });
      } else {
        toast({
          title: "Action Failed",
          description: responseData?.message || error.message || "Something went wrong.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDirectAction = async (action: "lunch-in" | "lunch-out") => {
    const isDevOn = await checkDeveloperOptions();
    if (isDevOn) {
      toast({
        title: "Action Denied",
        description: "Please turn off Developer Options in your phone settings to register attendance.",
        variant: "destructive",
        duration: 8000,
      });
      return;
    }
    setIsProcessing(true);
    try {
      const pos = await getLocation();
      const location = { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy };

      if (action === "lunch-in") {
        await attendanceService.lunchIn(location);
        toast({ title: "Success", description: "Lunch break started." });
      } else if (action === "lunch-out") {
        await attendanceService.lunchOut(location);
        toast({ title: "Success", description: "Lunch break ended." });
      }
      await fetchToday();
    } catch (error: any) {
      const msg = error?.responseData?.message ?? error?.response?.data?.message ?? error.message ?? "Something went wrong.";
      const outside = (error?.responseData ?? error?.response?.data)?.geoFenceViolation || /outside the office/i.test(msg);
      toast({
        title: outside ? "Outside Branch Area" : "Action Failed",
        description: msg,
        variant: "destructive",
        duration: outside ? 8000 : 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in font-['Outfit']">
      {/* Refined Professional Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Staff Portal</span>
            <span className="text-xs">/</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Attendance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Hi, {staffName}
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">Manage your shifts and track your working hours.</p>
        </div>

        <div className="flex items-center gap-3 p-2 pl-3 bg-muted/30 rounded-xl border border-border/50">
          <div className="text-right">
            <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">Signed In As</p>
            <p className="text-xs font-bold">{staffName}</p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold border border-primary/20">
            {staffInitials}
          </div>
        </div>
      </div>

      {/* Holiday Banner — punch-in not required today */}
      {todayHoliday && (
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-fuchsia-50/40 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <PartyPopper className="h-5 w-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-purple-800 leading-tight">
                Today is a holiday — {todayHoliday.name}
              </p>
              <p className="text-xs text-purple-500 mt-0.5">
                Punch-in is not required and your salary won't be deducted for today.
                {todayHoliday.description ? ` ${todayHoliday.description}` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Shift Info Banner */}
      {shift ? (
        <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-primary/5 to-primary/[0.02] p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Shift name */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <AlarmClock className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your Shift</p>
                <p className="text-sm font-bold text-foreground leading-tight">{shift.name}</p>
              </div>
            </div>
            {/* Start / End pills — full width on mobile, auto on sm+ */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 flex-1 sm:flex-none">
                <Sunrise className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider leading-none mb-0.5">Start</p>
                  <p className="text-xs font-bold text-emerald-700">{fmtShiftTime(shift.startTime)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 flex-1 sm:flex-none">
                <Sunset className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider leading-none mb-0.5">End</p>
                  <p className="text-xs font-bold text-blue-700">{fmtShiftTime(shift.endTime)}</p>
                </div>
              </div>
              {/* Lunch pill — only when the shift has lunch configured */}
              {shift.lunch?.enabled && (() => {
                const mins = configuredLunchMinutes(shift);
                const minsLabel = mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}` : `${mins}m`;
                const label = shift.lunch.mode === "fixed_window"
                  ? `${fmtShiftTime(shift.lunch.startTime)}–${fmtShiftTime(shift.lunch.endTime)}`
                  : `${minsLabel} flexible`;
                return (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 flex-1 sm:flex-none">
                    <Coffee className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider leading-none mb-0.5">Lunch</p>
                      <p className="text-xs font-bold text-amber-700">{label}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-border/50 bg-muted/10">
          <AlarmClock className="h-4 w-4 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground/50 font-semibold">No shift assigned — contact your manager</p>
        </div>
      )}

      {/* ── Today's Working Hours ─────────────────────────────────────── */}
      {(() => {
        const pct = Math.min(100, Math.round(((todayWorkingHours?.totalMins ?? 0) / shiftDurationMins) * 100));
        const isLunch = todayWorkingHours?.isOnLunch;
        const isLive = todayWorkingHours?.isLive;
        const done = !isLive && !!todayWorkingHours;

        return (
          <div className={cn(
            "rounded-2xl border bg-white p-5",
            isLunch ? "border-amber-200" : isLive ? "border-emerald-200" : done ? "border-border" : "border-dashed border-border/50"
          )}>
            <div className="flex items-center justify-between gap-4 flex-wrap">

              {/* Hours display */}
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                  isLunch ? "bg-amber-50" : isLive ? "bg-emerald-50" : "bg-muted/50"
                )}>
                  <Timer className={cn(
                    "h-5 w-5",
                    isLunch ? "text-amber-500" : isLive ? "text-emerald-500" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                    {isLunch ? "On Break  •  Live" : isLive ? "Working Hours  •  Live" : done ? "Total Working Hours" : "Working Hours"}
                    {shift && <span className="ml-2 text-muted-foreground/40 normal-case font-semibold">({shift.name})</span>}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className={cn(
                      "text-3xl font-black tabular-nums tracking-tight",
                      isLunch ? "text-amber-600" : isLive ? "text-emerald-600" : done ? "text-foreground" : "text-muted-foreground/30"
                    )}>
                      {todayWorkingHours
                        ? `${String(todayWorkingHours.h).padStart(2, "0")}h ${String(todayWorkingHours.m).padStart(2, "0")}m`
                        : "--h --m"}
                    </span>
                    {isLive && (
                      <span className="text-base font-bold text-muted-foreground/40 tabular-nums">
                        {String(todayWorkingHours!.s).padStart(2, "0")}s
                      </span>
                    )}
                    {isLive && (
                      <span className={cn(
                        "h-2 w-2 rounded-full animate-pulse ml-1",
                        isLunch ? "bg-amber-400" : "bg-emerald-400"
                      )} />
                    )}
                  </div>
                </div>
              </div>

              {/* Punch times */}
              <div className="flex items-center gap-4 text-center">
                {[
                  { label: "Punch In", val: safeTimeFormat((attendance as any)?.punchIn?.time), cls: "text-emerald-600" },
                  { label: "Lunch", val: safeTimeFormat((attendance as any)?.lunchIn?.time), cls: "text-amber-500" },
                  { label: "Punch Out", val: safeTimeFormat((attendance as any)?.punchOut?.time), cls: "text-blue-600" },
                ].map(({ label, val, cls }) => (
                  <div key={label}>
                    <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-0.5">{label}</p>
                    <p className={cn("text-sm font-bold tabular-nums", val && val !== "--:--" ? cls : "text-muted-foreground/25")}>
                      {val && val !== "--:--" ? val : "--:--"}
                    </p>
                  </div>
                ))}
              </div>

              {/* % badge */}
              {todayWorkingHours && (
                <div className={cn(
                  "text-lg font-black tabular-nums px-4 py-2 rounded-xl",
                  isLunch ? "bg-amber-50 text-amber-600" :
                    pct >= 100 ? "bg-emerald-50 text-emerald-600" :
                      "bg-muted/40 text-foreground"
                )}>
                  {pct}%
                </div>
              )}
            </div>

            {/* Progress bar — segmented (green / amber lunch / green) */}
            {todayWorkingHours && (() => {
              const shiftMs = shiftDurationMins * 60 * 1000;
              const punchInTime = attendance?.punchIn?.time;
              const lunchInTime = attendance?.lunchIn?.time;
              const lunchOutTime = attendance?.lunchOut?.time;

              const parseBar = (t: string): number | null => {
                try {
                  const iso = new Date(t);
                  if (!isNaN(iso.getTime()) && iso.getFullYear() > 2000) return iso.getTime();
                  const parts = t.split(":").map(Number);
                  const d = new Date();
                  d.setHours(parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, 0);
                  return isNaN(d.getTime()) ? null : d.getTime();
                } catch { return null; }
              };

              const tIn = punchInTime ? parseBar(punchInTime) : null;
              const tLI = lunchInTime ? parseBar(lunchInTime) : null;
              const tLO = lunchOutTime ? parseBar(lunchOutTime) : null;
              const tNow = currentTime.getTime();

              const toP = (ms: number) => Math.min(100, Math.max(0, (ms / shiftMs) * 100));

              // Has completed lunch — three segments
              if (tIn && tLI && tLO) {
                const p1 = toP(tLI - tIn);          // green: punchIn → lunchIn
                const p2 = toP(tLO - tLI);          // amber: lunchIn → lunchOut
                const p3 = toP(tNow - tLO);         // green: lunchOut → now/punchOut
                return (
                  <div className="mt-4">
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                      <div className="h-full bg-emerald-500 shrink-0" style={{ width: `${p1}%` }} />
                      <div className="h-full bg-amber-400 shrink-0" style={{ width: `${p2}%` }} />
                      <div className="h-full bg-emerald-500 shrink-0 transition-all duration-1000" style={{ width: `${p3}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground/50 font-semibold">0h</span>
                      <span className="text-[10px] text-muted-foreground/50 font-semibold">{Math.floor(shiftDurationMins / 2 / 60)}h</span>
                      <span className="text-[10px] text-muted-foreground/50 font-semibold">{Math.floor(shiftDurationMins / 60)}h target</span>
                    </div>
                  </div>
                );
              }

              // Currently on lunch — green + pulsing amber
              if (tIn && tLI && !tLO) {
                const p1 = toP(tLI - tIn);          // green: punchIn → lunchIn
                const p2 = toP(tNow - tLI);         // amber: lunchIn → now
                return (
                  <div className="mt-4">
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                      <div className="h-full bg-emerald-500 shrink-0" style={{ width: `${p1}%` }} />
                      <div className="h-full bg-amber-400 animate-pulse shrink-0 transition-all duration-1000" style={{ width: `${p2}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground/50 font-semibold">0h</span>
                      <span className="text-[10px] text-muted-foreground/50 font-semibold">{Math.floor(shiftDurationMins / 2 / 60)}h</span>
                      <span className="text-[10px] text-muted-foreground/50 font-semibold">{Math.floor(shiftDurationMins / 60)}h target</span>
                    </div>
                  </div>
                );
              }

              // No lunch — single green bar
              return (
                <div className="mt-4">
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground/50 font-semibold">0h</span>
                    <span className="text-[10px] text-muted-foreground/50 font-semibold">{Math.floor(shiftDurationMins / 2 / 60)}h</span>
                    <span className="text-[10px] text-muted-foreground/50 font-semibold">{Math.floor(shiftDurationMins / 60)}h target</span>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Clock & Actions - Glass Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-deep border-0 overflow-hidden relative">
            <div className="md:absolute top-0 right-0 p-4 md:p-6 flex flex-col items-center md:items-end gap-2 w-full md:w-auto z-10">
              <Badge variant="outline" className={cn(
                "px-3 py-1 border-2 font-bold uppercase tracking-wider",
                status === "In" ? "border-success text-success bg-success/5" :
                  status === "Lunch" ? "border-warning text-warning bg-warning/5" :
                    "border-muted-foreground/30 text-muted-foreground bg-muted/5"
              )}>
                {status === "In" ? "● On Duty" : status === "Lunch" ? "● On Break" : "○ Off Duty"}
              </Badge>

              {/* Live Geo-Fence Status — only shown when punched in */}
              {status === "In" && (
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold",
                  geoStatus === null
                    ? "border-muted-foreground/20 text-muted-foreground bg-muted/10"
                    : !geoStatus.enabled
                      ? "border-muted-foreground/20 text-muted-foreground bg-muted/10"
                      : geoStatus.inside
                        ? "border-emerald-400 text-emerald-600 bg-emerald-50"
                        : geoStatus.outsideCount >= 2
                          ? "border-red-400 text-red-600 bg-red-50 animate-pulse"
                          : "border-orange-400 text-orange-600 bg-orange-50"
                )}>
                  {geoStatus === null ? (
                    <><ShieldOff className="h-3 w-3" /> Checking zone...</>
                  ) : !geoStatus.enabled ? (
                    <><ShieldOff className="h-3 w-3" /> Geo-fence off</>
                  ) : geoStatus.inside ? (
                    <><ShieldCheck className="h-3 w-3" /> Inside Zone</>
                  ) : geoStatus.outsideCount >= 2 ? (
                    <><ShieldAlert className="h-3 w-3" /> Auto Punch-Out…</>
                  ) : (
                    <><ShieldAlert className="h-3 w-3" /> Outside Zone (1/2)</>
                  )}
                </div>
              )}
            </div>
            <CardContent className="p-6 md:p-10 flex flex-col items-center text-center">
              <div className="space-y-1 mb-6 md:mb-8 w-full pt-10 md:pt-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                  <Clock className="h-3 w-3" /> {format(currentTime, "eeee, dd MMMM")}
                </p>
                <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter tabular-nums text-foreground">
                  {format(currentTime, "hh:mm")}
                  <span className="text-base sm:text-lg md:text-xl font-semibold text-muted-foreground ml-2">{format(currentTime, "a")}</span>
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mb-4">
                {isLoading ? (
                  <>
                    <Skeleton className="h-20 rounded-2xl" />
                    <Skeleton className="h-20 rounded-2xl" />
                    <Skeleton className="h-20 rounded-2xl" />
                    <Skeleton className="h-20 rounded-2xl" />
                  </>
                ) : (
                  <>
                    <CompactTimeStatus label="Punch In" time={attendance?.punchIn?.time} active={status === "In" && !(attendance?.sessions ?? []).some(s => s.punchIn?.time && !s.punchOut?.time)} color="emerald" />
                    <CompactTimeStatus label="Lunch In" time={attendance?.lunchIn?.time} active={status === "Lunch"} color="amber" />
                    <CompactTimeStatus label="Lunch Out" time={attendance?.lunchOut?.time} />
                    <CompactTimeStatus label="Punch Out" time={attendance?.punchOut?.time} active={false} />
                  </>
                )}
              </div>

              {/* Sessions timeline (Session 2+) */}
              {!isLoading && (attendance?.sessions ?? []).length > 0 && (
                <div className="w-full mb-6 space-y-2">
                  {(attendance!.sessions ?? []).map((session) => {
                    const isOpenSession = !!session.punchIn?.time && !session.punchOut?.time;
                    return (
                      <div
                        key={session.sessionNumber}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-sm font-medium",
                          isOpenSession
                            ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                            : "bg-muted/40 border-border/60 text-muted-foreground"
                        )}
                      >
                        <LogIn className="h-4 w-4 shrink-0" />
                        <span className="font-bold">Session {session.sessionNumber}</span>
                        <span className="tabular-nums">{safeTimeFormat(session.punchIn?.time)}</span>
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        <span className="tabular-nums">
                          {session.punchOut?.time ? safeTimeFormat(session.punchOut.time) : (
                            <span className="text-emerald-600 animate-pulse font-bold">Live</span>
                          )}
                        </span>
                        {session.durationMins != null && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {Math.floor(session.durationMins / 60)}h {session.durationMins % 60}m
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
                {isLoading ? (
                  <Skeleton className="flex-1 h-14 rounded-xl" />
                ) : status === "Out" ? (
                  (() => {
                    const hasEverPunchedIn = !!attendance?.punchIn?.time;
                    const sessionCount = (attendance?.sessions ?? []).length;
                    const canRePunch = hasEverPunchedIn && sessionCount < 4;
                    if (!hasEverPunchedIn) {
                      return (
                        <Button
                          onClick={() => { lightImpact(); handlePunchWithCamera("punch-in"); }}
                          disabled={isProcessing}
                          className="flex-1 h-14 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold text-lg shadow-lg transition-all active:scale-95 group"
                        >
                          {isProcessing ? (
                            <><Loader2 className="animate-spin h-5 w-5 mr-2" />{fetchingLocation ? "Fetching location…" : ""}</>
                          ) : (
                            <><Camera className="mr-2 h-5 w-5" />Start Shift <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" /></>
                          )}
                        </Button>
                      );
                    }
                    if (canRePunch) {
                      return (
                        <Button
                          onClick={() => { lightImpact(); setShowRePunchConfirm(true); }}
                          disabled={isProcessing}
                          className="flex-1 h-14 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold text-lg shadow-lg transition-all active:scale-95 group"
                        >
                          {isProcessing ? (
                            <><Loader2 className="animate-spin h-5 w-5 mr-2" />{fetchingLocation ? "Fetching location…" : ""}</>
                          ) : (
                            <><LogIn className="mr-2 h-5 w-5" />Punch In Again</>
                          )}
                        </Button>
                      );
                    }
                    return (
                      <div className="flex-1 p-4 bg-muted/30 rounded-xl border-2 border-dashed border-muted-foreground/20 text-center">
                        <p className="text-sm font-bold text-muted-foreground">Today's Shift Completed</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mt-1">See you tomorrow!</p>
                      </div>
                    );
                  })()
                ) : (
                  <>
                    {/* End Shift hidden during lunch — must exit break first */}
                    {status !== "Lunch" && (
                      <Button
                        onClick={() => {
                          lightImpact();
                          handlePunchWithCamera("punch-out");
                        }}
                        variant="outline"
                        disabled={isProcessing}
                        className="flex-1 h-14 rounded-xl border-2 font-bold text-lg transition-all active:scale-95 bg-background"
                      >
                        {isProcessing ? (
                          <><Loader2 className="animate-spin h-5 w-5 mr-2" />{fetchingLocation ? "Fetching location…" : ""}</>
                        ) : <><Camera className="mr-2 h-5 w-5" />End Shift</>}
                      </Button>
                    )}
                    {/* Lunch Break — only for main session (Session 1), and only before any punch-out.
                        Once the employee has punched out (manual End Shift OR auto geo-fence exit),
                        the lunch buttons must never reappear — even in a later "Punch In Again" session. */}
                    {!(attendance?.sessions ?? []).some(s => s.punchIn?.time && !s.punchOut?.time) &&
                      !(attendance as any)?.punchOut?.time &&
                      !(attendance as any)?.autoPunchOut &&
                      !((attendance as any)?.lunchIn && (attendance as any)?.lunchOut) && (
                        <Button
                          onClick={() => { lightImpact(); handleDirectAction(status === "In" ? "lunch-in" : "lunch-out"); }}
                          variant="ghost"
                          disabled={isProcessing}
                          className={cn(
                            "flex-1 h-14 rounded-xl border-2 font-bold transition-all",
                            status === "Lunch" ? "bg-warning/10 border-warning text-warning" : "border-border hover:bg-muted"
                          )}
                        >
                          {isProcessing ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : (
                            <Coffee className={cn("h-5 w-5 mr-2", status === "Lunch" && "animate-bounce")} />
                          )}
                          {status === "Lunch" ? "Exit Break" : "Lunch Break"}
                        </Button>
                      )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today's Activity — chronological punch-event log with geo context */}
          {todayEvents.length > 0 && (
            <Card className="border shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <HistoryIcon className="h-4 w-4 text-primary" />
                  Today's Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 divide-y divide-border/60">
                {todayEvents.map((ev: any) => {
                  const isAuto = ev.type === "AUTO_PUNCH_OUT";
                  const isIn = ev.type === "PUNCH_IN";
                  const label = isAuto ? "Auto punched out" : isIn ? "Punched in" : "Punched out";
                  const timeLabel = safeTimeFormat(ev.time) || "--:--";
                  const distLabel =
                    ev.distanceFromBranch === null || ev.distanceFromBranch === undefined
                      ? null
                      : isAuto
                        ? `${ev.distanceFromBranch}m outside branch radius`
                        : `${ev.distanceFromBranch}m from ${ev.branchName || "branch"}`;
                  return (
                    <div key={ev._id} className="flex items-center gap-3 py-2.5">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                        isAuto ? "bg-red-50 text-red-500" : isIn ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {isAuto ? <MapPinOff className="h-4 w-4" /> : isIn ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight">
                          {label} — {timeLabel}
                        </p>
                        {distLabel && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />{distLabel}
                          </p>
                        )}
                      </div>
                      {ev.sessionNumber && (
                        <Badge variant="outline" className="ml-auto text-[10px] shrink-0">S{ev.sessionNumber}</Badge>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Quick Analytics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              title="Monthly Presence"
              value={`${stats.presentDays} Days`}
              subtitle={`${stats.absentDays} Absents recorded`}
              icon={<Calendar className="h-5 w-5 text-primary" />}
              progress={(stats.presentDays / (stats.presentDays + stats.absentDays || 1)) * 100}
              color="bg-emerald-500"
            />
            <StatCard
              title="Monthly Hours"
              value={`${stats.totalHours}h ${stats.totalMins}m`}
              subtitle="Total productive time"
              icon={<Timer className="h-5 w-5 text-primary" />}
              progress={Math.min(100, (stats.totalHours / 160) * 100)}
              color="bg-blue-500"
            />
          </div>
        </div>

        {/* Monthly Records Sidebar */}
        <Card className="border-0 bg-muted/20 flex flex-col overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-background sticky top-0 z-10 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between gap-2 mb-1">
              <CardTitle className="text-base font-bold truncate">Monthly Records</CardTitle>
              {/* View toggle */}
              <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-0.5 shrink-0">
                <Button
                  variant={attView === "list" ? "default" : "ghost"}
                  size="sm"
                  className="h-6 px-2 rounded-md text-[10px] gap-1"
                  onClick={() => setAttView("list")}
                >
                  <List className={cn("h-3 w-3", attView === "list" ? "text-white" : "")} /> List
                </Button>
                <Button
                  variant={attView === "calendar" ? "default" : "ghost"}
                  size="sm"
                  className="h-6 px-2 rounded-md text-[10px] gap-1"
                  onClick={() => setAttView("calendar")}
                >
                  <LayoutGrid className={cn("h-3 w-3", attView === "calendar" ? "text-white" : "")} /> Cal
                </Button>
              </div>
            </div>
            {/* Month navigator */}
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px]">
                {format(selectedMonth, "MMMM yyyy")}
              </CardDescription>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-md"
                  onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-md"
                  disabled={isAfter(startOfMonth(addMonths(selectedMonth, 1)), new Date())}
                  onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-y-auto max-h-[640px] custom-scrollbar flex-1">
            {attView === "calendar" ? (
              /* ── Calendar View ── */
              isLoading ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-6 w-full rounded-lg" />
                  <Skeleton className="h-48 w-full rounded-lg" />
                </div>
              ) : (
                <div className="p-3">
                  {/* Day-of-week headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                      <div key={d} className="text-center text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest py-1">
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: calendarGrid.startPad }).map((_, i) => (
                      <div key={`pad-${i}`} className="h-[50px]" />
                    ))}
                    {calendarGrid.monthDays.map(date => {
                      const dateStr = format(date, "yyyy-MM-dd");
                      const record = historyByDate[dateStr];
                      const isUpcoming = !isBefore(date, startOfDay(new Date())) && !isSameDay(date, new Date());
                      const isTodayDay = isSameDay(date, new Date());
                      const isSunday = date.getDay() === 0;
                      const isWeeklyOff = isSunday && !record && !isUpcoming;
                      const holidayName = holidayByDate.get(dateStr);
                      const cellStatus = record?.status
                        ?? (isUpcoming
                          ? "Upcoming"
                          : holidayName
                            ? "Holiday"
                            : isWeeklyOff
                              ? "Weekly Off"
                              : "Absent");
                      const c = ATT_CAL_CELL[cellStatus] ?? ATT_CAL_CELL["Upcoming"];
                      return (
                        <div key={dateStr} className={cn(
                          "h-[50px] rounded p-1 flex flex-col border relative",
                          c.bg, c.border,
                          isTodayDay && "ring-2 ring-slate-800 ring-offset-1",
                          isUpcoming && "opacity-40",
                        )}>
                          <div className="flex items-start justify-between">
                            {isTodayDay ? (
                              <div className="h-4 w-4 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                                <span className="text-[8px] font-bold text-white leading-none">{format(date, "d")}</span>
                              </div>
                            ) : (
                              <span className={cn(
                                "text-[11px] font-bold leading-none",
                                (isUpcoming || isWeeklyOff) ? "text-slate-400" : "text-slate-700"
                              )}>
                                {format(date, "d")}
                              </span>
                            )}
                            {c.dot && <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", c.dot)} />}
                          </div>
                          <div className="flex-1 flex items-end justify-center">
                            <span className={cn("text-[7px] font-bold uppercase tracking-widest text-center leading-none", c.labelColor)}>
                              {c.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-border/30">
                    {[
                      { label: "Full Day", color: "bg-emerald-500" },
                      { label: "Half Day", color: "bg-sky-400" },
                      { label: "Absent", color: "bg-rose-400" },
                    ].map(l => (
                      <div key={l.label} className="flex items-center gap-1">
                        <div className={`h-1.5 w-1.5 rounded-full ${l.color}`} />
                        <span className="text-[9px] font-medium text-muted-foreground">{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              /* ── List View ── */
              <div className="divide-y divide-border/50">
                {fullHistory.filter((h: any) => h.status !== "Upcoming").map((entry: any, idx: number) => (
                  <ActivityRow key={idx} entry={entry} />
                ))}
                {fullHistory.filter((h: any) => h.status !== "Upcoming").length === 0 && (
                  <div className="p-12 text-center text-muted-foreground">
                    <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-medium">No activity recorded yet.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Camera Confirmation Modal ─────────────────────────────────────── */}
      <Dialog
        open={showCameraModal}
        onOpenChange={(open) => {
          if (!open) {
            closeCameraStream();
            setShowCameraModal(false);
          }
        }}
      >
        <DialogContent className="rounded-3xl max-w-sm mx-auto p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-lg font-black text-center">
              {cameraPunchAction === "punch-in" ? "Starting Your Shift" : "Ending Your Shift"}
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground mt-1">
              {capturedSelfie
                ? "Selfie captured! Click Punch to confirm."
                : cameraError
                ? "Camera unavailable. You can still punch without a selfie."
                : "Take a selfie to confirm your attendance."}
            </DialogDescription>
          </DialogHeader>

          {/* Camera / Captured preview area */}
          <div className="relative mx-4 mb-2 rounded-2xl overflow-hidden bg-black aspect-[4/3]">
            {/* Loading spinner */}
            {!cameraReady && !cameraError && !capturedSelfie && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-xs font-medium">Starting camera…</span>
              </div>
            )}

            {/* Camera unavailable */}
            {cameraError && !capturedSelfie && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70 px-4 text-center">
                <CameraOff className="h-8 w-8" />
                <span className="text-xs font-medium">{cameraError}</span>
              </div>
            )}

            {/* Live video feed (hidden once selfie is captured) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover scale-x-[-1]",
                cameraReady && !capturedSelfie ? "opacity-100" : "opacity-0 absolute inset-0"
              )}
            />

            {/* Captured selfie preview */}
            {capturedSelfie && (
              <img
                src={capturedSelfie}
                alt="Captured selfie"
                className="w-full h-full object-cover"
              />
            )}

            {/* Corner frame guides — only on live feed */}
            {cameraReady && !capturedSelfie && (
              <>
                <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-white/60 rounded-tl-lg" />
                <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-white/60 rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-white/60 rounded-bl-lg" />
                <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-white/60 rounded-br-lg" />
              </>
            )}

            {/* Retake button overlay on captured preview */}
            {capturedSelfie && (
              <button
                onClick={() => { setCapturedSelfie(null); setCapturedBlob(null); }}
                className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-black/80 transition"
              >
                <Camera className="h-3 w-3" /> Retake
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 px-4 pb-6">
            {/* Capture selfie button — only shown when camera is live and no selfie yet */}
            {cameraReady && !capturedSelfie && (
              <Button
                onClick={async () => {
                  const snap = await captureSnapshot();
                  if (snap) {
                    setCapturedSelfie(snap.dataUrl);
                    setCapturedBlob(snap.blob);
                  }
                }}
                disabled={isProcessing}
                className="h-12 rounded-xl bg-white/10 border border-white/20 text-foreground font-bold text-base backdrop-blur"
                variant="outline"
              >
                <Camera className="mr-2 h-5 w-5" />Take Selfie
              </Button>
            )}

            {/* Main punch button */}
            <Button
              onClick={async () => {
                // If camera is ready but selfie not yet taken, capture it now
                let blob = capturedBlob;
                if (cameraReady && !blob) {
                  const snap = await captureSnapshot();
                  blob = snap?.blob ?? null;
                  if (snap) {
                    setCapturedSelfie(snap.dataUrl);
                    setCapturedBlob(snap.blob);
                  }
                }
                closeCameraStream();
                setShowCameraModal(false);
                handleDirectPunch(cameraPunchAction, blob);
              }}
              disabled={isProcessing}
              className="h-12 rounded-xl bg-primary text-white font-bold text-base"
            >
              {isProcessing ? (
                <><Loader2 className="animate-spin h-5 w-5 mr-2" />{fetchingLocation ? "Fetching location…" : "Processing…"}</>
              ) : (
                cameraPunchAction === "punch-in"
                  ? <><LogIn className="mr-2 h-5 w-5" />Punch In</>
                  : <><LogOut className="mr-2 h-5 w-5" />Punch Out</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                closeCameraStream();
                setShowCameraModal(false);
              }}
              disabled={isProcessing}
              className="h-12 rounded-xl font-bold text-base"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Re-Punch Confirmation Dialog ─────────────────────────────────── */}
      <Dialog open={showRePunchConfirm} onOpenChange={setShowRePunchConfirm}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-center">Start New Session?</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground mt-1">
              This will begin a new punch-in session for today.
              <br />
              <span className="font-semibold text-foreground">Make sure you are at your workplace.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            <Button
              onClick={() => {
                setShowRePunchConfirm(false);
                handlePunchWithCamera("punch-in");
              }}
              disabled={isProcessing}
              className="h-12 rounded-xl bg-primary text-white font-bold text-base"
            >
              {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : (
                <><LogIn className="mr-2 h-5 w-5" />Yes, Punch In</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowRePunchConfirm(false)}
              className="h-12 rounded-xl font-bold text-base"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/** Converts "HH:mm" or "HH:mm:ss" → "09:00 AM" */
const fmtShiftTime = (time?: string): string => {
  if (!time) return "--:--";
  try {
    const d = new Date(`2000-01-01T${time}`);
    if (isNaN(d.getTime())) return time;
    return format(d, "hh:mm a");
  } catch {
    return time;
  }
};

const safeTimeFormat = (time?: string) => {
  if (!time) return "--:--";
  try {
    // If it's already a full ISO string or similar, parse it directly
    let date = new Date(time);

    // If invalid, try the T-concatenation for HH:mm:ss strings, or space for 12-hour strings
    if (isNaN(date.getTime())) {
      if (time.includes(" ")) {
        date = new Date(`2000-01-01 ${time}`);
      } else {
        date = new Date(`2000-01-01T${time}`);
      }
    }

    // Final check before formatting
    if (isNaN(date.getTime())) return "--:--";

    return format(date, "hh:mm a");
  } catch (e) {
    return "--:--";
  }
};

const CompactTimeStatus = ({
  label,
  time,
  active,
  color = "primary",
}: {
  label: string;
  time?: string;
  active?: boolean;
  color?: "primary" | "emerald" | "amber";
}) => (
  <div className={cn(
    "p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center",
    active
      ? color === "emerald" ? "bg-emerald-50 border-emerald-500"
        : color === "amber" ? "bg-amber-50 border-amber-400"
          : "bg-primary/5 border-primary"
      : "bg-background border-border/60"
  )}>
    <p className={cn(
      "text-[10px] font-bold uppercase tracking-wider mb-1",
      active
        ? color === "emerald" ? "text-emerald-600"
          : color === "amber" ? "text-amber-600"
            : "text-primary"
        : "text-muted-foreground"
    )}>{label}</p>
    <p className={cn("text-lg font-bold tabular-nums", !time && "text-muted-foreground/20")}>
      {safeTimeFormat(time)}
    </p>
  </div>
);

const StatCard = ({ title, value, subtitle, icon, progress, color }: { title: string, value: string, subtitle: string, icon: React.ReactNode, progress?: number, color?: string }) => (
  <Card className="card-hover border-border/50 shadow-sm">
    <CardContent className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center">
          {icon}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          <span>{subtitle}</span>
          <span>{Math.round(progress || 0)}%</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full transition-all duration-1000", color || "bg-primary")} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ActivityRow = ({ entry }: { entry: any }) => {
  const punchInTime = entry.punchIn?.time;
  // lastPunchOut (server virtual) is the day's TRUE final out-time; root
  // punchOut only closes Session 1.
  const punchOutTime = entry.lastPunchOut?.time || entry.punchOut?.time;
  const selfieUrl = entry.punchIn?.selfieUrl;
  const status = entry.status;

  const formatDate = (dateStr: string, formatStr: string) => {
    const date = new Date(dateStr);
    return isValid(date) ? format(date, formatStr) : "??";
  };

  return (
    <div className={cn(
      "group p-4 hover:bg-muted/50 transition-all flex items-center gap-4",
      status === "Absent" && "bg-destructive/[0.02]"
    )}>
      <div className={cn(
        "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 text-center flex-col shadow-sm border",
        status === "Absent" ? "bg-destructive/10 border-destructive/20 text-destructive" :
          status === "Full Day" ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
            status === "Half Day" ? "bg-amber-50 border-amber-100 text-amber-600" :
              status === "On Duty" ? "bg-blue-50 border-blue-100 text-blue-600" :
                status === "Pending" ? "bg-blue-50 border-blue-100 text-blue-600" :
                  "bg-muted border-border/50 text-muted-foreground"
      )}>
        <p className="text-[10px] font-bold uppercase leading-none mb-1 opacity-70">{formatDate(entry.date, "MMM")}</p>
        <p className="text-xl font-black leading-none">{formatDate(entry.date, "dd")}</p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold truncate">{formatDate(entry.date, "eeee")}</p>
          <Badge variant="outline" className={cn(
            "text-[9px] font-bold uppercase tracking-tighter px-1.5 h-4",
            status === "Absent" ? "text-destructive border-destructive/30 bg-destructive/5" :
              status === "Full Day" ? "text-emerald-600 border-emerald-200 bg-emerald-50" :
                status === "Half Day" ? "text-amber-600 border-amber-200 bg-amber-50" :
                  status === "On Duty" ? "text-blue-600 border-blue-200 bg-blue-50" :
                    status === "Pending" ? "text-blue-600 border-blue-200 bg-blue-50" :
                      "text-muted-foreground border-border bg-muted/5"
          )}>
            {status}
          </Badge>
        </div>

        {status === "Absent" ? (
          <p className="text-[10px] font-bold text-destructive/60 uppercase tracking-widest">No record found</p>
        ) : status === "Upcoming" ? (
          <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Future date</p>
        ) : (
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span>IN <span className="text-foreground">{safeTimeFormat(punchInTime)}</span></span>
            <ArrowRight className="h-3 w-3 opacity-20" />
            <span>OUT <span className="text-foreground">{safeTimeFormat(punchOutTime)}</span></span>
          </div>
        )}
      </div>

      <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted border border-border/50 group-hover:scale-105 transition-transform flex items-center justify-center">
        {selfieUrl || entry.punchOut?.selfieUrl ? (
          <img
            src={selfieUrl || entry.punchOut?.selfieUrl}
            alt="Selfie"
            className="h-full w-full object-cover transition-all"
            onError={(e) => {
              (e.target as any).src = `https://ui-avatars.com/api/?name=${entry.status}&background=4f46e5&color=fff`;
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center opacity-20 bg-muted">
            <UserCheck className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;



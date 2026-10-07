import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ScanFace, Maximize, Minimize, ArrowLeft, LogIn, LogOut, AlertCircle, CameraOff } from "lucide-react";
import { Button } from "@/hrms/components/ui/button";
import { cn } from "@/hrms/lib/utils";
import { faceService, captureFrame, KioskFace, KioskPunchResult } from "@/hrms/services/faceService";

/* Face Attendance kiosk — runs on an office device (tablet / laptop / webcam).
 * Every ~0.8s a frame goes to /face/kiosk/recognize; a face recognised in 2
 * frames in a row is punched in or out via /face/kiosk/punch, which re-checks
 * the face and applies the normal attendance rules. */

const SCAN_INTERVAL_MS = 800;
const STREAK_TO_PUNCH = 2;
const RETRY_AFTER_FAIL_MS = 8000;

interface Banner { tone: "in" | "out" | "info" | "error"; title: string; detail?: string; avatar?: string }
interface RecentPunch { id: string; name: string; avatar: string; action: "punch-in" | "punch-out"; time: string }

const time12 = (t?: string) => {
  if (!t) return format(new Date(), "hh:mm a");
  const [h, m] = t.split(":").map(Number);
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export default function FaceKioskPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";

  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [faces, setFaces] = useState<KioskFace[]>([]);
  const [frameSize, setFrameSize] = useState({ width: 640, height: 480 });
  const [banner, setBanner] = useState<Banner | null>(null);
  const [recent, setRecent] = useState<RecentPunch[]>([]);
  const [cameraError, setCameraError] = useState("");
  const [serviceError, setServiceError] = useState("");
  const [now, setNow] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mutable loop state (the scan loop runs outside React renders).
  const busy = useRef(false);
  const streaks = useRef(new Map<string, number>());
  const holdUntil = useRef(new Map<string, number>());
  const cooldownMs = useRef(120_000);
  const bannerTimer = useRef<number>();

  const showBanner = (b: Banner) => {
    setBanner(b);
    window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), 4000);
  };

  // Clock
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Camera + screen wake lock
  useEffect(() => {
    let stream: MediaStream | null = null;
    let wakeLock: any = null;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setCameraError("Camera not available. Allow camera access for this site and reload."));
    if (!navigator.mediaDevices) setCameraError("This browser can't open the camera. Use Chrome or Edge over https.");
    (navigator as any).wakeLock?.request("screen").then((l: any) => { wakeLock = l; }).catch(() => {});
    faceService.getStatus().then((s) => { cooldownMs.current = (s.cooldownSeconds || 120) * 1000; }).catch(() => {});
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      wakeLock?.release?.().catch(() => {});
      window.clearTimeout(bannerTimer.current);
    };
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const handlePunchResult = (r: KioskPunchResult) => {
    const name = r.employee?.name || "Employee";
    if (r.success && r.action) {
      const isIn = r.action === "punch-in";
      showBanner({ tone: isIn ? "in" : "out", title: `${isIn ? "Welcome" : "Goodbye"}, ${name}`, detail: `${isIn ? "Punched in" : "Punched out"} at ${time12(r.time)}`, avatar: r.employee?.avatar });
      setRecent((prev) => [{ id: `${r.employee?._id}-${Date.now()}`, name, avatar: r.employee?.avatar || "", action: r.action!, time: time12(r.time) }, ...prev].slice(0, 12));
    } else if (r.skipped) {
      showBanner({ tone: "info", title: name, detail: r.message });
    } else {
      showBanner({ tone: "error", title: r.employee?.name || "Couldn't punch", detail: r.message });
    }
  };

  // Scan loop
  useEffect(() => {
    const tick = async () => {
      const video = videoRef.current;
      if (busy.current || !video || video.readyState < 2 || document.hidden) return;
      busy.current = true;
      try {
        const frame = await captureFrame(video, 640, 0.8);
        if (!frame) return;
        let result;
        try {
          result = await faceService.recognize(frame);
          setServiceError("");
        } catch (err: any) {
          setFaces([]);
          setServiceError(err?.responseData?.message || err?.message || "Face recognition unavailable");
          return;
        }
        setFaces(result.faces);
        setFrameSize({ width: result.width, height: result.height });

        // Count consecutive frames per recognised employee; forget anyone not in this frame.
        const seen = new Set<string>();
        for (const f of result.faces) {
          if (!f.match) continue;
          seen.add(f.match.userId);
          streaks.current.set(f.match.userId, (streaks.current.get(f.match.userId) || 0) + 1);
        }
        for (const id of [...streaks.current.keys()]) if (!seen.has(id)) streaks.current.delete(id);

        // Punch the first steady face that isn't on hold (one punch per tick).
        const ready = result.faces.find(
          (f) => f.match && (streaks.current.get(f.match.userId) || 0) >= STREAK_TO_PUNCH && (holdUntil.current.get(f.match.userId) || 0) < Date.now(),
        );
        if (ready?.match) {
          const id = ready.match.userId;
          holdUntil.current.set(id, Date.now() + RETRY_AFTER_FAIL_MS);
          const r = await faceService.kioskPunch(id, frame);
          holdUntil.current.set(id, Date.now() + (r.success || r.skipped ? cooldownMs.current : RETRY_AFTER_FAIL_MS));
          streaks.current.delete(id);
          handlePunchResult(r);
        }
      } finally {
        busy.current = false;
      }
    };
    const t = window.setInterval(tick, SCAN_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen?.().catch(() => {});
  };

  const bannerTone = {
    in: "bg-emerald-500/95 text-white",
    out: "bg-indigo-500/95 text-white",
    info: "bg-slate-800/90 text-white",
    error: "bg-red-500/95 text-white",
  };

  return (
    <div ref={rootRef} className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          {!isFullscreen && (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10" onClick={() => navigate(`${basePath}/staff/face-attendance`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <ScanFace className="h-5 w-5 text-indigo-400" />
          <div>
            <p className="text-sm font-bold">Face Attendance</p>
            <p className="text-[11px] text-white/50">Look at the camera to punch in or out</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums leading-none">{format(now, "hh:mm:ss a")}</p>
            <p className="text-[11px] text-white/50">{format(now, "EEEE, d MMM yyyy")}</p>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 p-4">
        <div className="relative flex items-center justify-center">
          {cameraError ? (
            <div className="flex flex-col items-center gap-2 text-white/70 text-sm"><CameraOff className="h-8 w-8" /> {cameraError}</div>
          ) : (
            <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="block w-full h-auto -scale-x-100" />
              {/* Boxes are in camera coordinates; the video is mirrored, so mirror x too. */}
              {faces.map((f, i) => {
                const [x, y, w, h] = f.box;
                const style = {
                  left: `${((frameSize.width - x - w) / frameSize.width) * 100}%`,
                  top: `${(y / frameSize.height) * 100}%`,
                  width: `${(w / frameSize.width) * 100}%`,
                  height: `${(h / frameSize.height) * 100}%`,
                };
                return (
                  <div key={i} style={style} className={cn("absolute rounded-xl border-[3px]", f.match ? "border-emerald-400" : "border-amber-400/80")}>
                    <span className={cn("absolute -top-7 left-0 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold", f.match ? "bg-emerald-500 text-white" : "bg-amber-400 text-slate-900")}>
                      {f.match ? `${f.match.name} · ${f.match.nextAction === "punch-in" ? "IN" : "OUT"}` : "Not recognised"}
                    </span>
                  </div>
                );
              })}
              {serviceError && (
                <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-red-600/90 px-4 py-2 text-xs font-semibold">
                  <AlertCircle className="h-4 w-4" /> {serviceError}
                </div>
              )}
              {banner && (
                <div className={cn("absolute inset-x-4 bottom-4 flex items-center gap-4 rounded-2xl px-5 py-4 shadow-2xl", bannerTone[banner.tone])}>
                  {banner.avatar ? (
                    <img src={banner.avatar} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-white/60" />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                      {banner.tone === "out" ? <LogOut className="h-6 w-6" /> : banner.tone === "error" ? <AlertCircle className="h-6 w-6" /> : <LogIn className="h-6 w-6" />}
                    </div>
                  )}
                  <div>
                    <p className="text-xl font-bold leading-tight">{banner.title}</p>
                    {banner.detail && <p className="text-sm opacity-90">{banner.detail}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex flex-col min-h-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 px-1 pb-2">Recent punches</p>
          {recent.length === 0 ? (
            <p className="text-xs text-white/40 px-1">Nobody yet. Recognised staff appear here.</p>
          ) : (
            <div className="space-y-1.5 overflow-y-auto">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 rounded-lg bg-white/5 px-2.5 py-2">
                  {r.avatar ? (
                    <img src={r.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">{r.name[0]?.toUpperCase()}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    <p className="text-[11px] text-white/50">{r.time}</p>
                  </div>
                  <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold", r.action === "punch-in" ? "bg-emerald-500/20 text-emerald-300" : "bg-indigo-500/20 text-indigo-300")}>
                    {r.action === "punch-in" ? "IN" : "OUT"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Camera, Upload, X, ScanFace, Trash2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/hrms/components/ui/button";
import { toast } from "@/hrms/hooks/use-toast";
import { cn } from "@/hrms/lib/utils";
import { faceService, captureFrame } from "@/hrms/services/faceService";

/* Enrol an employee's face for Face Attendance: 3 guided camera shots (or
 * uploaded photos, up to 5). Each photo must show only this employee. */

const STEPS = ["Look straight at the camera", "Turn your head slightly to one side", "Turn slightly to the other side"];
const MAX_PHOTOS = 5;

interface Props {
  employee: { _id: string; name: string };
  enrolled?: boolean;
  enrolledPhotoUrl?: string;
  onChanged?: () => void;
}

export function FaceEnrollPanel({ employee, enrolled = false, enrolledPhotoUrl, onChanged }: Props) {
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [shots, setShots] = useState<{ blob: Blob; url: string }[]>([]);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (mode !== "camera") return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    setCameraError("");
    setCameraReady(false);
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setCameraError("Camera not available. Allow camera access, or upload photos instead."));
    if (!navigator.mediaDevices) setCameraError("This browser can't open the camera. Upload photos instead.");
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [mode]);

  const shotsRef = useRef(shots);
  shotsRef.current = shots;
  useEffect(() => () => shotsRef.current.forEach((s) => URL.revokeObjectURL(s.url)), []);

  const addBlobs = (blobs: Blob[]) => {
    setError("");
    setShots((prev) => [...prev, ...blobs.map((blob) => ({ blob, url: URL.createObjectURL(blob) }))].slice(0, MAX_PHOTOS));
  };

  const takeShot = async () => {
    if (!videoRef.current) return;
    const blob = await captureFrame(videoRef.current, 1280, 0.92);
    if (blob) addBlobs([blob]);
  };

  const removeShot = (i: number) =>
    setShots((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, j) => j !== i);
    });

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res: any = await faceService.enroll(employee._id, shots.map((s) => s.blob));
      toast({ title: "Face enrolled", description: res?.message || `Face enrolled for ${employee.name}` });
      shots.forEach((s) => URL.revokeObjectURL(s.url));
      setShots([]);
      onChanged?.();
    } catch (err: any) {
      setError(err?.responseData?.message || err?.message || "Could not enrol the face");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Remove ${employee.name}'s face enrolment? The kiosk will stop recognising them and their selfies won't be face-checked.`)) return;
    try {
      await faceService.removeEnrollment(employee._id);
      toast({ title: "Enrolment removed", description: `${employee.name} is no longer enrolled` });
      onChanged?.();
    } catch (err: any) {
      toast({ title: "Could not remove", description: err?.responseData?.message || err?.message, variant: "destructive" });
    }
  };

  const nextStep = shots.length < STEPS.length ? STEPS[shots.length] : "Optional extra photo";

  return (
    <div className="space-y-4">
      {enrolled && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-emerald-800">
            {enrolledPhotoUrl ? (
              <img src={enrolledPhotoUrl} alt="" className="h-9 w-9 rounded-md object-cover" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span><b>{employee.name}</b> is enrolled. New photos below will replace the current ones.</span>
          </div>
          <Button size="sm" variant="ghost" className="h-8 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={remove}>
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </Button>
        </div>
      )}

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {([["camera", "Use camera", Camera], ["upload", "Upload photos", Upload]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold", mode === key ? "bg-white shadow-sm text-slate-800" : "text-slate-500")}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {mode === "camera" ? (
        cameraError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-6 text-center text-xs text-amber-800">{cameraError}</div>
        ) : (
          <div className="space-y-2">
            <div className="relative overflow-hidden rounded-xl bg-slate-900 aspect-video">
              {/* Cameras send a few dark frames while exposure settles — capture only once it has. */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onPlaying={() => window.setTimeout(() => setCameraReady(true), 700)}
                className="h-full w-full object-cover -scale-x-100"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[70%] aspect-[3/4] rounded-[45%] border-2 border-dashed border-white/60" />
              </div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white">
                {shots.length >= MAX_PHOTOS ? "Enough photos — save below" : `Photo ${shots.length + 1}: ${nextStep}`}
              </div>
            </div>
            <Button onClick={takeShot} disabled={!cameraReady || shots.length >= MAX_PHOTOS} className="w-full gap-2">
              <ScanFace className="h-4 w-4" /> {cameraReady ? "Capture photo" : "Starting camera..."}
            </Button>
          </div>
        )
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 text-xs text-slate-500 hover:border-slate-300">
          <Upload className="h-5 w-5" />
          <span className="font-semibold">Choose 1–{MAX_PHOTOS} clear photos of {employee.name}'s face</span>
          <span>Only this employee in each photo, face clearly visible</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addBlobs(Array.from(e.target.files || []));
              e.target.value = "";
            }}
          />
        </label>
      )}

      {shots.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {shots.map((s, i) => (
            <div key={s.url} className="relative">
              <img src={s.url} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-lg object-cover" />
              <button onClick={() => removeShot(i)} className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 shadow ring-1 ring-slate-200">
                <X className="h-3 w-3 text-slate-600" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400">3 photos from slightly different angles work best.</p>
        <Button onClick={save} disabled={!shots.length || saving} className="gap-2">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {enrolled ? "Replace enrolment" : "Save enrolment"}
        </Button>
      </div>
    </div>
  );
}

// Face tab on the staff profile (StaffViewPage).
export function EmployeeFaceCard({ employee }: { employee: { _id: string; name: string } }) {
  const [info, setInfo] = useState<{ enrolled: boolean; photoUrl: string } | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    faceService
      .getEnrollment(employee._id)
      .then((d) => setInfo({ enrolled: d.enrolled, photoUrl: d.photoUrl }))
      .catch((e: any) => setError(e?.responseData?.message || e?.message || "Could not load face enrolment"));
  };
  useEffect(load, [employee._id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-2xl bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
      <div>
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><ScanFace className="h-4 w-4 text-indigo-500" /> Face Attendance</h3>
        <p className="text-xs text-slate-400 mt-0.5">The office kiosk recognises enrolled staff, and their own punch selfies are checked against this face.</p>
      </div>
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : !info ? (
        <p className="text-xs text-slate-400 flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading...</p>
      ) : (
        <FaceEnrollPanel employee={employee} enrolled={info.enrolled} enrolledPhotoUrl={info.photoUrl} onChanged={load} />
      )}
    </div>
  );
}

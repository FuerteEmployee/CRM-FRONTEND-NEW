import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/hrms/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";
import { Camera, FlipHorizontal, Video } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

// Some machines have a virtual camera app (OBS Virtual Camera, Snap Camera,
// ManyCam, DroidCam, Iriun, etc.) registered as a video input device. If the
// browser picks one of these as the default, the identity-verification
// preview shows that app's own idle/branding output instead of a real face —
// not a bug in this component, just the wrong device selected. Deprioritize
// (but still allow selecting) anything whose label matches a known virtual
// camera so the real webcam is picked by default when one is present.
const VIRTUAL_CAMERA_HINTS = ["virtual", "obs", "snap camera", "manycam", "droidcam", "iriun", "epoccam", "camo"];
const looksVirtual = (label: string) => VIRTUAL_CAMERA_HINTS.some((hint) => label.toLowerCase().includes(hint));

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshDeviceList = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = all.filter((d) => d.kind === "videoinput");
      setDevices(videoInputs);
      return videoInputs;
    } catch {
      return [];
    }
  }, []);

  const startCamera = useCallback(async (constraints: { deviceId?: string; mode?: "user" | "environment" }) => {
    // Stop existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsReady(false);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: constraints.deviceId
          ? { deviceId: { exact: constraints.deviceId } }
          : { facingMode: constraints.mode || "user" },
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Some browsers' autoplay policy silently leaves the element paused
        // (showing a black frame) unless playback is kicked explicitly.
        videoRef.current.play().catch(() => { /* ignored — autoPlay will retry */ });
      }
      setIsReady(true);

      // Labels are blank on most browsers until permission is granted —
      // re-enumerate now so the device picker shows real names, and lock in
      // which device actually ended up active (deviceId constraint can
      // still fall back if the exact one becomes unavailable).
      const videoInputs = await refreshDeviceList();
      const activeId = mediaStream.getVideoTracks()[0]?.getSettings().deviceId;
      if (activeId) {
        setSelectedDeviceId(activeId);
      } else if (!constraints.deviceId && videoInputs.length) {
        const preferred = videoInputs.find((d) => !looksVirtual(d.label)) || videoInputs[0];
        setSelectedDeviceId(preferred.deviceId);
      }
    } catch {
      setError("Could not access camera. Please ensure permissions are granted.");
    }
  }, [refreshDeviceList]);

  useEffect(() => {
    startCamera({ mode: facingMode });
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // Only re-run for the facingMode flip button — device switches are
    // handled explicitly by handleDeviceChange below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flipCamera = () => {
    setSelectedDeviceId(null);
    setFacingMode((prev) => {
      const next = prev === "user" ? "environment" : "user";
      startCamera({ mode: next });
      return next;
    });
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    startCamera({ deviceId });
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Mirror the image only for front camera (user-facing)
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) onCapture(blob);
    }, "image/jpeg", 0.8);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-primary/20">
        {error ? (
          <div className="h-full flex items-center justify-center p-6 text-center text-white bg-destructive/20">
            <p className="text-sm font-bold">{error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            // Mirror visually for front camera so it feels natural
            className={`h-full w-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
          />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Flip camera button — top-right corner */}
        {!error && (
          <button
            type="button"
            onClick={flipCamera}
            className="absolute top-3 right-3 h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            title={facingMode === "user" ? "Switch to back camera" : "Switch to front camera"}
          >
            <FlipHorizontal className="h-5 w-5" />
          </button>
        )}

        {/* Camera mode indicator */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest">
          {facingMode === "user" ? "Front Camera" : "Back Camera"}
        </div>
      </div>

      {/* Device picker — only shown when more than one camera is available,
          e.g. a real webcam alongside a virtual camera app. Not seeing your
          face here usually means the wrong device is selected below. */}
      {!error && devices.length > 1 && (
        <div className="w-full max-w-sm space-y-1">
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <Video className="h-3 w-3" /> Camera source
          </label>
          <Select value={selectedDeviceId || undefined} onValueChange={handleDeviceChange}>
            <SelectTrigger className="h-9 rounded-xl text-sm">
              <SelectValue placeholder="Select camera" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((d, i) => (
                <SelectItem key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                  {looksVirtual(d.label) ? " (virtual)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-4 w-full max-w-sm">
        <Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className="flex-1 rounded-2xl h-12 gradient-primary"
          onClick={takePhoto}
          disabled={!!error || !isReady}
        >
          <Camera className="mr-2 h-5 w-5" /> Capture
        </Button>
      </div>
    </div>
  );
};

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
  onCapture: (blob: Blob, faceDetected: boolean) => void;
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
  const [faceDetected, setFaceDetected] = useState(false);
  const [trackerLoaded, setTrackerLoaded] = useState(false);

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
        videoRef.current.play().catch(() => { /* ignored — autoPlay will retry */ });
      }
      setIsReady(true);

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

  // Load tracking.js dynamically as a fallback for face detection
  useEffect(() => {
    if ('FaceDetector' in window) {
      return; // Use native browser FaceDetector
    }
    let active = true;
    const loadTrackingJs = async () => {
      if ((window as any).tracking) {
        if (active) setTrackerLoaded(true);
        return;
      }
      try {
        const s1 = document.createElement("script");
        s1.src = "https://cdnjs.cloudflare.com/ajax/libs/tracking.js/1.1.3/tracking-min.js";
        document.head.appendChild(s1);
        await new Promise((resolve) => (s1.onload = resolve));

        const s2 = document.createElement("script");
        s2.src = "https://cdnjs.cloudflare.com/ajax/libs/tracking.js/1.1.3/data/face-min.js";
        document.head.appendChild(s2);
        await new Promise((resolve) => (s2.onload = resolve));

        if (active) setTrackerLoaded(true);
      } catch (err) {
        console.error("Failed to load tracking.js fallback:", err);
      }
    };
    loadTrackingJs();
    return () => {
      active = false;
    };
  }, []);

  // Real-time face tracking scanner loop
  useEffect(() => {
    if (!videoRef.current || !isReady) return;

    let active = true;
    let trackerTask: any = null;
    let nativeInterval: any = null;

    if ('FaceDetector' in window) {
      const detector = new (window as any).FaceDetector({ maxDetectedFaces: 1, fastMode: true });
      const checkFaceNative = async () => {
        if (!active || !videoRef.current) return;
        try {
          const faces = await detector.detect(videoRef.current);
          if (active) setFaceDetected(faces.length > 0);
        } catch {
          // ignore
        }
        if (active) nativeInterval = setTimeout(checkFaceNative, 500);
      };
      checkFaceNative();
    } else if (trackerLoaded) {
      try {
        const tracker = new (window as any).tracking.ObjectTracker("face");
        tracker.setInitialScale(4);
        tracker.setStepSize(2);
        tracker.setEdgesDensity(0.1);

        tracker.on("track", (event: any) => {
          if (!active) return;
          if (event.data && event.data.length > 0) {
            setFaceDetected(true);
          } else {
            setFaceDetected(false);
          }
        });
        trackerTask = (window as any).tracking.track(videoRef.current, tracker);
      } catch (e) {
        console.error("Tracker loop start error:", e);
      }
    } else {
      setFaceDetected(false);
    }

    return () => {
      active = false;
      if (trackerTask) trackerTask.stop();
      if (nativeInterval) clearTimeout(nativeInterval);
    };
  }, [isReady, trackerLoaded, facingMode]);

  useEffect(() => {
    startCamera({ mode: facingMode });
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
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

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) onCapture(blob, faceDetected);
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
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
            />
            {isReady && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
                {/* Real-time Status Badge */}
                <div className="flex justify-between items-center w-full">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md transition-colors duration-300 ${faceDetected ? "bg-emerald-500/80" : "bg-rose-500/80 animate-pulse"}`}>
                    {faceDetected ? "Face Detected" : "No Face Detected"}
                  </span>
                </div>

                {/* Target Guides */}
                <div className="flex-1 flex items-center justify-center">
                  <div className={`w-48 h-48 rounded-full border-4 border-dashed transition-colors duration-300 ${faceDetected ? "border-emerald-400" : "border-rose-400/60 animate-pulse"}`} />
                </div>

                {/* Guide Text */}
                <div className="w-full text-center">
                  <p className="text-white text-[9px] bg-black/60 py-1 px-3 rounded-lg backdrop-blur-sm inline-block font-bold tracking-wide uppercase">
                    {faceDetected ? "Ready to capture" : "Align your face in the center frame"}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Flip camera button — top-right corner */}
        {!error && (
          <button
            type="button"
            onClick={flipCamera}
            className="absolute top-3 right-3 h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors z-20"
            title={facingMode === "user" ? "Switch to back camera" : "Switch to front camera"}
          >
            <FlipHorizontal className="h-5 w-5" />
          </button>
        )}

        {/* Camera mode indicator */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest z-20">
          {facingMode === "user" ? "Front Camera" : "Back Camera"}
        </div>
      </div>

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
          className="flex-1 rounded-2xl h-12 gradient-primary text-white font-bold animate-pulse"
          onClick={takePhoto}
          disabled={!!error || !isReady}
        >
          <Camera className="mr-2 h-5 w-5" /> Capture
        </Button>
      </div>
    </div>
  );
};

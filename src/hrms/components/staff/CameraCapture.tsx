import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/hrms/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";
import { Camera, FlipHorizontal, Video, Loader2 } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (blob: Blob, faceDetected: boolean) => void;
  onCancel: () => void;
}

// Deprioritize virtual cameras so the real webcam is picked by default
const VIRTUAL_CAMERA_HINTS = ["virtual", "obs", "snap camera", "manycam", "droidcam", "iriun", "epoccam", "camo"];
const looksVirtual = (label: string) => VIRTUAL_CAMERA_HINTS.some((hint) => label.toLowerCase().includes(hint));

// face-api.js tiny model weights — hosted on jsDelivr CDN (no server needed)
const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [confidence, setConfidence] = useState(0);

  // ── Load face-api.js + TinyFaceDetector model weights ──────────────────────
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const loadFaceApi = async () => {
      try {
        // Dynamically import face-api.js (avoids SSR issues)
        const faceapi = await import("face-api.js");

        if (cancelled) return;

        // Load only the TinyFaceDetector model — smallest & fastest
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

        if (cancelled) return;
        setModelLoaded(true);
        setModelLoading(false);
      } catch (err) {
        console.error("face-api model load error:", err);
        if (!cancelled) {
          // If model fails to load (e.g. offline), allow capture anyway
          setModelLoaded(false);
          setModelLoading(false);
          setFaceDetected(true); // Graceful degradation: don't block capture
        }
      }
    };

    loadFaceApi();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  // ── Enumerate camera devices ────────────────────────────────────────────────
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

  // ── Start camera stream ─────────────────────────────────────────────────────
  const startCamera = useCallback(async (constraints: { deviceId?: string; mode?: "user" | "environment" }) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsReady(false);
    setFaceDetected(false);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: constraints.deviceId
          ? { deviceId: { exact: constraints.deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { facingMode: constraints.mode || "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
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

  // ── Real-time face detection loop using face-api.js ─────────────────────────
  useEffect(() => {
    if (!isReady || !modelLoaded) return;

    let active = true;

    const runDetection = async () => {
      if (!active || !videoRef.current) return;

      const video = videoRef.current;

      // Skip if video not ready
      if (video.readyState < 2 || video.videoWidth === 0) {
        if (active) detectionLoopRef.current = setTimeout(runDetection, 300);
        return;
      }

      try {
        const faceapi = await import("face-api.js");

        // Use TinyFaceDetector — fast neural net, works in all lighting conditions
        const options = new faceapi.TinyFaceDetectorOptions({
          inputSize: 224,        // 128, 160, 224, 320, 416, 512, 608 — balance speed vs accuracy
          scoreThreshold: 0.35,  // Lower = more sensitive (detects partial/angled faces)
        });

        // Draw current video frame to offscreen canvas for detection
        // This avoids the CSS mirror transform issue — we detect on raw pixels
        const offscreen = document.createElement("canvas");
        offscreen.width = video.videoWidth;
        offscreen.height = video.videoHeight;
        const ctx = offscreen.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
        }

        const detection = await faceapi.detectSingleFace(offscreen, options);

        if (active) {
          const detected = !!detection;
          const score = detection?.score ?? 0;
          setFaceDetected(detected);
          setConfidence(Math.round(score * 100));
        }
      } catch (err) {
        console.error("Detection error:", err);
        // On error, allow capture to continue
        if (active) setFaceDetected(true);
      }

      if (active) {
        detectionLoopRef.current = setTimeout(runDetection, 400); // Run at ~2.5 FPS
      }
    };

    runDetection();

    return () => {
      active = false;
      if (detectionLoopRef.current) clearTimeout(detectionLoopRef.current);
    };
  }, [isReady, modelLoaded]);

  // ── Initial camera start ────────────────────────────────────────────────────
  useEffect(() => {
    startCamera({ mode: "user" });
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (detectionLoopRef.current) clearTimeout(detectionLoopRef.current);
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

    const vw = video.videoWidth || video.clientWidth || 640;
    const vh = video.videoHeight || video.clientHeight || 480;

    canvas.width = vw;
    canvas.height = vh;

    // Mirror front camera selfie so the saved image is correctly oriented
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob, faceDetected);
      } else {
        console.error("Camera capture failed: toBlob returned null.");
      }
    }, "image/jpeg", 0.85);
  };

  const statusLabel = !isReady
    ? "Starting camera..."
    : modelLoading
    ? "Loading face AI..."
    : faceDetected
    ? `Face Detected ${confidence > 0 ? `(${confidence}%)` : ""}`
    : "No Face Detected";

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
              style={{
                minWidth: '100%',
                minHeight: '100%',
                width: 'auto',
                height: 'auto',
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) ${facingMode === "user" ? "scaleX(-1)" : ""}`,
              }}
            />
            {isReady && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
                {/* Real-time Status Badge */}
                <div className="flex justify-between items-center w-full">
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md transition-colors duration-300 ${
                      modelLoading
                        ? "bg-blue-500/80"
                        : faceDetected
                        ? "bg-emerald-500/80"
                        : "bg-rose-500/80 animate-pulse"
                    }`}
                  >
                    {modelLoading && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                    {statusLabel}
                  </span>
                </div>

                {/* Oval face guide — glows green when detected */}
                <div className="flex-1 flex items-center justify-center">
                  <div
                    className={`w-44 h-56 rounded-full border-4 border-dashed transition-all duration-300 ${
                      faceDetected
                        ? "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                        : "border-rose-400/60 animate-pulse"
                    }`}
                  />
                </div>

                {/* Guide Text */}
                <div className="w-full text-center">
                  <p className="text-white text-[9px] bg-black/60 py-1 px-3 rounded-lg backdrop-blur-sm inline-block font-bold tracking-wide uppercase">
                    {faceDetected
                      ? "✓ Ready to capture — click Capture"
                      : modelLoading
                      ? "Loading AI model..."
                      : "Move closer · Improve lighting · Look at camera"}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Flip camera button */}
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
          className={`flex-1 rounded-2xl h-12 gradient-primary text-white font-bold transition-all ${
            faceDetected ? "animate-pulse" : ""
          }`}
          onClick={takePhoto}
          disabled={!!error || !isReady || modelLoading}
        >
          {modelLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading AI...</>
          ) : (
            <><Camera className="mr-2 h-5 w-5" /> Capture</>
          )}
        </Button>
      </div>
    </div>
  );
};

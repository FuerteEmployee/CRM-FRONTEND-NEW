import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/hrms/components/ui/button";
import { Camera, FlipHorizontal } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const startCamera = useCallback(async (mode: "user" | "environment") => {
    // Stop existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsReady(false);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
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
    } catch {
      setError("Could not access camera. Please ensure permissions are granted.");
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, startCamera]);

  const flipCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
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

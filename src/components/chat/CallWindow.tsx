import { useEffect, useRef, useState } from "react";
import { Loader2, Maximize2, Mic, MicOff, Minimize2, PhoneOff, Video, VideoOff, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCall, type CallPeer } from "@/context/CallContext";
import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

/** <video> bound to a MediaStream (srcObject can't be set as a prop). */
const StreamVideo = ({ stream, muted, className }: { stream: MediaStream | null; muted?: boolean; className?: string }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
};

const useElapsed = (since: number | null) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!since) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [since]);
  if (!since) return "";
  const sec = Math.max(0, Math.floor((now - since) / 1000));
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

/** One other person: their video, or their initials when the camera is off. */
const PeerTile = ({ peer, large }: { peer: CallPeer; large?: boolean }) => {
  const connecting = peer.connection !== "connected";
  return (
    <div className="relative w-full h-full min-h-0 rounded-xl overflow-hidden bg-zinc-900">
      {/* Always mounted: it also plays their audio. */}
      <StreamVideo stream={peer.stream} className={cn("w-full h-full object-cover", !peer.video && "opacity-0")} />
      {!peer.video && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
          <div className={cn("rounded-full bg-primary flex items-center justify-center font-semibold", large ? "h-24 w-24 text-3xl" : "h-14 w-14 text-lg")}>
            {initials(peer.name)}
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white">
        {!peer.audio && <MicOff className="h-3 w-3 text-red-400" aria-label="Muted" />}
        <span className="truncate max-w-[140px]">{peer.name}</span>
      </div>
      {connecting && (
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[11px] text-white">
          <Loader2 className="h-3 w-3 animate-spin" /> {peer.connection === "failed" ? "Reconnecting…" : "Connecting…"}
        </div>
      )}
    </div>
  );
};

/** The call itself: a small floating window, or large. Shown on any CRM page. */
export const CallWindow = () => {
  const { state, hangUp, toggleMute, toggleCamera, setMinimized } = useCall();
  const elapsed = useElapsed(state.answeredAt);
  const active = state.phase === "outgoing" || state.phase === "connecting" || state.phase === "active";
  if (!active) return null;

  const status =
    state.phase === "outgoing"
      ? "Calling…"
      : state.phase === "connecting"
        ? "Connecting…"
        : state.reconnecting
          ? "Reconnecting…"
          : elapsed;
  const large = !state.minimized;
  const peers = state.peers;

  const controls = (
    <div className="flex items-center justify-center gap-2">
      <Button
        size="icon"
        variant={state.muted ? "destructive" : "secondary"}
        className="h-11 w-11 rounded-full"
        onClick={toggleMute}
        title={state.muted ? "Unmute" : "Mute"}
        aria-label={state.muted ? "Unmute" : "Mute"}
      >
        {state.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>
      <Button
        size="icon"
        variant={state.cameraOn ? "secondary" : "outline"}
        className="h-11 w-11 rounded-full"
        onClick={toggleCamera}
        title={state.cameraOn ? "Turn camera off" : "Turn camera on"}
        aria-label={state.cameraOn ? "Turn camera off" : "Turn camera on"}
      >
        {state.cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="h-11 w-11 rounded-full"
        onClick={() => setMinimized(large)}
        title={large ? "Make small" : "Make large"}
        aria-label={large ? "Make small" : "Make large"}
      >
        {large ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </Button>
      <Button size="icon" variant="destructive" className="h-11 w-11 rounded-full" onClick={hangUp} title="End call" aria-label="End call">
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );

  const waiting = (
    <div className="flex flex-col items-center justify-center gap-3 text-white h-full">
      <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-2xl font-semibold animate-pulse">
        {initials(state.title)}
      </div>
      <p className="text-lg font-semibold">{state.title}</p>
      <p className="text-sm text-white/70">{status}</p>
    </div>
  );

  const localPreview = state.cameraOn && state.localStream && (
    <StreamVideo
      stream={state.localStream}
      muted
      className={cn(
        "absolute rounded-lg object-cover border border-white/20 shadow-lg -scale-x-100 bg-zinc-800",
        large ? "bottom-24 right-4 w-40 h-28 sm:w-48 sm:h-32" : "bottom-16 right-2 w-20 h-14"
      )}
    />
  );

  return (
    <div
      role="dialog"
      aria-label={`Call with ${state.title}`}
      className={cn(
        "fixed z-[60] bg-zinc-950 text-white shadow-2xl flex flex-col overflow-hidden",
        large ? "inset-0 sm:inset-6 sm:rounded-2xl" : "bottom-4 right-4 w-[calc(100%-2rem)] sm:w-80 h-64 rounded-2xl border border-white/10"
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-black/40">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{state.title}</p>
          <p className="text-xs text-white/70 flex items-center gap-1">
            {state.reconnecting && <WifiOff className="h-3 w-3" />}
            {state.type === "video" ? "Video call" : "Voice call"}
            {status && ` · ${status}`}
          </p>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 p-2">
        {peers.length === 0 ? (
          waiting
        ) : (
          <div
            className={cn(
              "grid gap-2 h-full",
              peers.length === 1 ? "grid-cols-1" : large ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"
            )}
          >
            {peers.map((p) => (
              <PeerTile key={p.userId} peer={p} large={large && peers.length === 1} />
            ))}
          </div>
        )}
        {localPreview}
      </div>

      <div className={cn("px-4", large ? "py-4" : "py-2")}>{controls}</div>
    </div>
  );
};

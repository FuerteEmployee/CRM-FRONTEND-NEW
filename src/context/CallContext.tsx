import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useNotificationContext } from "@/context/NotificationContext";
import { usePermissionContext } from "@/context/PermissionContext";
import { chatService } from "@/api/services/chat.service";
import { startRingback, startRingtone, stopTone } from "@/lib/callTones";
import { CallWindow } from "@/components/chat/CallWindow";
import { IncomingCallDialog } from "@/components/chat/IncomingCallDialog";

// Chat voice / video calls over our own WebRTC (no third party).
// Audio and video go straight between the browsers; the CRM socket only rings
// people and passes the connection set-up messages (Backend utils/callSignaling.js).
//
// Who sends the WebRTC offer: whoever joins a call offers to everyone already
// in it (and after a network drop, the person who came back offers again).
// Every connection always carries one audio and one video slot, so turning the
// camera on/off later only swaps the track (no re-negotiation).

export type CallType = "voice" | "video";
type Phase = "idle" | "outgoing" | "incoming" | "connecting" | "active";

export interface CallPeer {
  userId: string;
  name: string;
  stream: MediaStream | null;
  video: boolean; // their camera is on
  audio: boolean; // their mic is on
  connection: RTCPeerConnectionState | "new";
}

interface IncomingInfo {
  callId: string;
  type: CallType;
  isGroup: boolean;
  groupName: string;
  from: { _id: string; firstname: string; lastname: string };
}

export interface CallUiState {
  phase: Phase;
  callId: string | null;
  type: CallType;
  isGroup: boolean;
  title: string;
  answeredAt: number | null;
  peers: CallPeer[];
  incoming: IncomingInfo | null;
  muted: boolean;
  cameraOn: boolean;
  localStream: MediaStream | null;
  minimized: boolean;
  reconnecting: boolean;
}

interface StartCallInput {
  to: string;
  isGroup?: boolean;
  type: CallType;
  title: string; // contact or group name, shown in the call window
}

interface CallContextValue {
  state: CallUiState;
  inCall: boolean;
  startCall: (input: StartCallInput) => Promise<void>;
  accept: () => Promise<void>;
  reject: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleCamera: () => Promise<void>;
  setMinimized: (v: boolean) => void;
}

const IDLE: CallUiState = {
  phase: "idle",
  callId: null,
  type: "voice",
  isGroup: false,
  title: "",
  answeredAt: null,
  peers: [],
  incoming: null,
  muted: false,
  cameraOn: false,
  localStream: null,
  minimized: false,
  reconnecting: false,
};

const CallContext = createContext<CallContextValue | null>(null);

const INVITE_ERRORS: Record<string, string> = {
  OFFLINE: "is offline right now.",
  BUSY: "is on another call.",
  NOT_FOUND: "cannot be called.",
  ALREADY_IN_CALL: "— you are already in a call.",
  NOT_ALLOWED: "cannot be called from this account.",
  INVALID: "cannot be called.",
};

const mediaErrorText = (err: unknown, type: CallType) => {
  const name = (err as { name?: string })?.name;
  const what = type === "video" ? "microphone and camera" : "microphone";
  if (name === "NotAllowedError" || name === "SecurityError") return `Please allow ${what} access in your browser to make calls.`;
  if (name === "NotFoundError" || name === "OverconstrainedError") return `No ${what} found on this device.`;
  if (name === "NotReadableError") return `Your ${what} is being used by another app.`;
  return `Could not start your ${what}.`;
};

const callEndedText = (status: string, durationSec: number) => {
  if (status === "completed") {
    const m = Math.floor(durationSec / 60);
    const s = durationSec % 60;
    return `Call ended · ${m ? `${m} min ` : ""}${s} s`;
  }
  if (status === "rejected") return "Call declined";
  if (status === "missed") return "No answer";
  return "Call ended";
};

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { socket } = useNotificationContext();
  const { user } = usePermissionContext();
  const [state, setState] = useState<CallUiState>(IDLE);

  // Live values for socket handlers (they are attached once per socket).
  const stateRef = useRef(state);
  stateRef.current = state;
  const pcs = useRef(new Map<string, RTCPeerConnection>());
  const pendingIce = useRef(new Map<string, RTCIceCandidateInit[]>());
  const offererFor = useRef(new Set<string>());
  const localStream = useRef<MediaStream | null>(null);
  const iceCache = useRef<{ servers: RTCIceServer[]; until: number } | null>(null);
  const names = useRef(new Map<string, string>());
  const contactsLoaded = useRef(false);
  const titleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitle = useRef(document.title);

  const patch = (p: Partial<CallUiState>) => setState((s) => ({ ...s, ...p }));
  const updatePeer = (userId: string, p: Partial<CallPeer>) =>
    setState((s) => ({ ...s, peers: s.peers.map((x) => (x.userId === userId ? { ...x, ...p } : x)) }));

  // ---- helpers ---------------------------------------------------------------
  const flashTitle = (text: string | null) => {
    if (titleTimer.current) clearInterval(titleTimer.current);
    titleTimer.current = null;
    if (!text) {
      document.title = originalTitle.current;
      return;
    }
    originalTitle.current = document.title.startsWith("📞") ? originalTitle.current : document.title;
    let on = false;
    titleTimer.current = setInterval(() => {
      on = !on;
      document.title = on ? text : originalTitle.current;
    }, 1000);
  };

  const resolveName = useCallback(async (id: string) => {
    if (names.current.has(id)) return names.current.get(id)!;
    if (!contactsLoaded.current) {
      contactsLoaded.current = true;
      const list = await chatService.getContacts().catch(() => []);
      (list || []).forEach((c: any) => !c.isGroup && names.current.set(String(c._id), `${c.firstname || ""} ${c.lastname || ""}`.trim()));
    }
    return names.current.get(id) || "Staff";
  }, []);

  const iceServers = async (): Promise<RTCIceServer[]> => {
    if (iceCache.current && iceCache.current.until > Date.now()) return iceCache.current.servers;
    const res: any = await chatService.getIceServers().catch(() => null);
    const servers: RTCIceServer[] = res?.iceServers?.length ? res.iceServers : [{ urls: "stun:stun.l.google.com:19302" }];
    // Refresh a few minutes before the TURN password expires.
    iceCache.current = { servers, until: Date.now() + Math.max(60, (res?.ttlSeconds || 3600) - 300) * 1000 };
    return servers;
  };

  const getMedia = (type: CallType) =>
    navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: type === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
    });

  const signal = (to: string, data: unknown) => {
    const callId = stateRef.current.callId;
    if (socket && callId) socket.emit("call:signal", { callId, to, data });
  };

  const sendMediaState = (to?: string) => {
    const s = stateRef.current;
    const data = { type: "media", audio: !s.muted, video: s.cameraOn };
    if (to) signal(to, data);
    else pcs.current.forEach((_, id) => signal(id, data));
  };

  const closePeer = (userId: string) => {
    pcs.current.get(userId)?.close();
    pcs.current.delete(userId);
    pendingIce.current.delete(userId);
    offererFor.current.delete(userId);
  };

  const cleanup = useCallback(() => {
    stopTone();
    flashTitle(null);
    pcs.current.forEach((pc) => pc.close());
    pcs.current.clear();
    pendingIce.current.clear();
    offererFor.current.clear();
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    setState(IDLE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** One RTCPeerConnection to one other person in the call. */
  const createPeer = async (userId: string) => {
    closePeer(userId);
    const pc = new RTCPeerConnection({ iceServers: await iceServers() });
    pcs.current.set(userId, pc);
    const remote = new MediaStream();

    pc.onicecandidate = (e) => {
      if (e.candidate) signal(userId, { type: "ice", candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      if (!remote.getTracks().includes(e.track)) remote.addTrack(e.track);
      updatePeer(userId, { stream: new MediaStream(remote.getTracks()) });
    };
    pc.onconnectionstatechange = async () => {
      updatePeer(userId, { connection: pc.connectionState });
      if (pc.connectionState === "connected") sendMediaState(userId);
      // Network changed: the side that made the offer asks for a fresh route.
      if (pc.connectionState === "failed" && offererFor.current.has(userId)) {
        try {
          pc.restartIce();
          const offer = await pc.createOffer({ iceRestart: true });
          await pc.setLocalDescription(offer);
          signal(userId, { type: "offer", sdp: pc.localDescription });
        } catch {
          /* the server ends the call if the person really left */
        }
      }
    };
    return pc;
  };

  const localTrack = (kind: "audio" | "video") => localStream.current?.getTracks().find((t) => t.kind === kind) || null;

  /** We are the newcomer: offer to someone already in the call. */
  const offerTo = async (userId: string) => {
    const pc = await createPeer(userId);
    offererFor.current.add(userId);
    const stream = localStream.current!;
    pc.addTransceiver(localTrack("audio") || "audio", { direction: "sendrecv", streams: [stream] });
    pc.addTransceiver(localTrack("video") || "video", { direction: "sendrecv", streams: [stream] });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    signal(userId, { type: "offer", sdp: pc.localDescription });
  };

  const flushIce = async (userId: string, pc: RTCPeerConnection) => {
    const queued = pendingIce.current.get(userId) || [];
    pendingIce.current.delete(userId);
    for (const c of queued) await pc.addIceCandidate(c).catch(() => {});
  };

  const addPeer = (userId: string, name: string) =>
    setState((s) =>
      s.peers.some((p) => p.userId === userId)
        ? s
        : { ...s, peers: [...s.peers, { userId, name, stream: null, video: s.type === "video", audio: true, connection: "new" }] }
    );

  const handleSignal = async ({ from, data }: { from: string; data: any }) => {
    try {
      if (data?.type === "offer") {
        let pc = pcs.current.get(from);
        // An ICE-restart offer on a live connection keeps it; a first offer (or one
        // from someone who came back after a drop) starts a fresh connection.
        const reuse = !!pc && pc.signalingState === "stable" && !!pc.remoteDescription;
        if (!reuse) pc = await createPeer(from);
        await pc!.setRemoteDescription(data.sdp);
        // Put our mic / camera on the slots the offer created.
        for (const t of pc!.getTransceivers()) {
          const kind = t.receiver.track?.kind as "audio" | "video" | undefined;
          if (!kind) continue;
          t.direction = "sendrecv";
          await t.sender.replaceTrack(localTrack(kind)).catch(() => {});
          if (localStream.current) t.sender.setStreams?.(localStream.current);
        }
        const answer = await pc!.createAnswer();
        await pc!.setLocalDescription(answer);
        signal(from, { type: "answer", sdp: pc!.localDescription });
        await flushIce(from, pc!);
      } else if (data?.type === "answer") {
        const pc = pcs.current.get(from);
        if (pc && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(data.sdp);
          await flushIce(from, pc);
        }
      } else if (data?.type === "ice" && data.candidate) {
        const pc = pcs.current.get(from);
        if (pc && pc.remoteDescription) await pc.addIceCandidate(data.candidate).catch(() => {});
        else pendingIce.current.set(from, [...(pendingIce.current.get(from) || []), data.candidate]);
      } else if (data?.type === "media") {
        updatePeer(from, { audio: !!data.audio, video: !!data.video });
      }
    } catch (err) {
      console.error("[call] signal error:", err);
    }
  };

  // ---- actions -----------------------------------------------------------------
  const askNotificationPermission = () => {
    try {
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    } catch {
      /* not supported */
    }
  };

  const startCall = async ({ to, isGroup = false, type, title }: StartCallInput) => {
    if (!socket?.connected) {
      toast.error("Not connected. Please refresh the page and try again.");
      return;
    }
    if (stateRef.current.phase !== "idle") {
      toast.error("You are already in a call.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("This browser cannot make calls. Please use Chrome, Edge, Firefox or Safari (on https).");
      return;
    }
    askNotificationPermission();
    try {
      localStream.current = await getMedia(type);
    } catch (err) {
      toast.error(mediaErrorText(err, type));
      return;
    }
    if (!isGroup) names.current.set(to, title);
    setState({ ...IDLE, phase: "outgoing", type, isGroup, title, cameraOn: type === "video", localStream: localStream.current });
    startRingback();
    iceServers().catch(() => {}); // warm up

    socket.emit("call:invite", { to, isGroup, type }, (res: any) => {
      if (!res?.ok) {
        cleanup();
        toast.error(`${title} ${INVITE_ERRORS[res?.error] || "cannot be called right now."}`);
        return;
      }
      patch({ callId: res.callId });
    });
  };

  const accept = async () => {
    const inc = stateRef.current.incoming;
    if (!inc || !socket) return;
    stopTone();
    flashTitle(null);
    try {
      localStream.current = await getMedia(inc.type);
    } catch (err) {
      toast.error(mediaErrorText(err, inc.type));
      socket.emit("call:reject", { callId: inc.callId });
      cleanup();
      return;
    }
    const fromName = `${inc.from.firstname} ${inc.from.lastname}`.trim();
    names.current.set(inc.from._id, fromName);
    setState((s) => ({
      ...s,
      phase: "connecting",
      callId: inc.callId,
      type: inc.type,
      isGroup: inc.isGroup,
      title: inc.isGroup ? inc.groupName || "Group call" : fromName,
      incoming: null,
      cameraOn: inc.type === "video",
      localStream: localStream.current,
    }));
    await iceServers().catch(() => {});

    socket.emit("call:accept", { callId: inc.callId }, async (res: any) => {
      if (!res?.ok) {
        cleanup();
        toast.error(res?.error === "CALL_FULL" ? "This call is full." : "The call has already ended.");
        return;
      }
      patch({ phase: "active", answeredAt: Date.now() });
      for (const id of res.participants as string[]) {
        addPeer(id, await resolveName(id));
        await offerTo(id).catch((e) => console.error("[call] offer failed:", e));
      }
    });
  };

  const reject = () => {
    const inc = stateRef.current.incoming;
    if (inc && socket) socket.emit("call:reject", { callId: inc.callId });
    cleanup();
  };

  const hangUp = () => {
    const s = stateRef.current;
    if (socket && s.callId) {
      // Still ringing at the other end (nobody joined yet): cancel instead of leave.
      socket.emit(s.phase === "outgoing" ? "call:cancel" : "call:leave", { callId: s.callId });
    }
    cleanup();
  };

  const toggleMute = () => {
    const track = localTrack("audio");
    if (!track) return;
    track.enabled = !track.enabled;
    patch({ muted: !track.enabled });
    setTimeout(() => sendMediaState(), 0);
  };

  const toggleCamera = async () => {
    const stream = localStream.current;
    if (!stream) return;
    let track = localTrack("video");
    if (track) {
      // Off: stop the camera completely (light goes off).
      track.stop();
      stream.removeTrack(track);
      track = null;
    } else {
      try {
        const cam = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } });
        track = cam.getVideoTracks()[0];
        stream.addTrack(track);
      } catch (err) {
        toast.error(mediaErrorText(err, "video"));
        return;
      }
    }
    for (const pc of pcs.current.values()) {
      const t = pc.getTransceivers().find((x) => x.receiver.track?.kind === "video");
      await t?.sender.replaceTrack(track).catch(() => {});
    }
    patch({ cameraOn: !!track, localStream: new MediaStream(stream.getTracks()) });
    setTimeout(() => sendMediaState(), 0);
  };

  // ---- socket events -------------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    const onIncoming = (inc: IncomingInfo) => {
      if (stateRef.current.phase !== "idle") return; // server marks us busy anyway
      setState({ ...IDLE, phase: "incoming", incoming: inc, type: inc.type, isGroup: inc.isGroup });
      startRingtone();
      const who = `${inc.from.firstname} ${inc.from.lastname}`.trim();
      flashTitle(`📞 ${who} is calling…`);
      try {
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          const n = new Notification(`Incoming ${inc.type === "video" ? "video" : "voice"} call`, {
            body: inc.isGroup ? `${who} · ${inc.groupName}` : who,
            tag: `call-${inc.callId}`,
          });
          n.onclick = () => window.focus();
        }
      } catch {
        /* notifications not available */
      }
    };

    const onAcceptedElsewhere = ({ callId, socketId }: { callId: string; socketId: string }) => {
      const s = stateRef.current;
      if (socketId !== socket.id && s.phase === "incoming" && s.incoming?.callId === callId) cleanup();
    };

    const onJoined = async ({ callId, userId, rejoined }: { callId: string; userId: string; rejoined?: boolean }) => {
      const s = stateRef.current;
      if (s.callId !== callId) return;
      if (rejoined) closePeer(userId); // they will send a fresh offer
      if (s.phase === "outgoing") {
        stopTone();
        patch({ phase: "active", answeredAt: Date.now() });
      }
      addPeer(userId, await resolveName(userId));
    };

    const onLeft = ({ callId, userId }: { callId: string; userId: string }) => {
      if (stateRef.current.callId !== callId) return;
      closePeer(userId);
      setState((s) => ({ ...s, peers: s.peers.filter((p) => p.userId !== userId) }));
    };

    const onSignal = (msg: { callId: string; from: string; data: any }) => {
      if (stateRef.current.callId === msg.callId) handleSignal(msg);
    };

    const onEnded = ({ callId, status, durationSec }: { callId: string; status: string; durationSec: number }) => {
      const s = stateRef.current;
      const mine = s.callId === callId || s.incoming?.callId === callId;
      if (!mine) return;
      const wasRinging = s.phase === "incoming";
      cleanup();
      if (!wasRinging) toast.info(callEndedText(status, durationSec));
    };

    // Our connection dropped and came back during a call: re-attach to it.
    const onConnect = () => {
      const s = stateRef.current;
      if (!s.callId || (s.phase !== "active" && s.phase !== "connecting")) return;
      socket.emit("call:rejoin", { callId: s.callId }, async (res: any) => {
        if (!res?.ok) {
          cleanup();
          toast.info("Call ended");
          return;
        }
        patch({ reconnecting: false });
        for (const id of res.participants as string[]) {
          addPeer(id, await resolveName(id));
          await offerTo(id).catch(() => {});
        }
      });
    };
    const onDisconnect = () => {
      if (stateRef.current.phase === "active") patch({ reconnecting: true });
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted-elsewhere", onAcceptedElsewhere);
    socket.on("call:participant-joined", onJoined);
    socket.on("call:participant-left", onLeft);
    socket.on("call:signal", onSignal);
    socket.on("call:ended", onEnded);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted-elsewhere", onAcceptedElsewhere);
      socket.off("call:participant-joined", onJoined);
      socket.off("call:participant-left", onLeft);
      socket.off("call:signal", onSignal);
      socket.off("call:ended", onEnded);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Logging out (or switching user) ends any call.
  useEffect(() => {
    if (!user && stateRef.current.phase !== "idle") cleanup();
  }, [user, cleanup]);

  // Closing the tab mid-call: tell the server right away.
  useEffect(() => {
    const onUnload = () => {
      const s = stateRef.current;
      if (socket && s.callId) socket.emit(s.phase === "outgoing" ? "call:cancel" : "call:leave", { callId: s.callId });
      if (socket && s.incoming) socket.emit("call:reject", { callId: s.incoming.callId });
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [socket]);

  const value: CallContextValue = {
    state,
    inCall: state.phase !== "idle",
    startCall,
    accept,
    reject,
    hangUp,
    toggleMute,
    toggleCamera,
    setMinimized: (v) => patch({ minimized: v }),
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      <IncomingCallDialog />
      <CallWindow />
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used inside <CallProvider>");
  return ctx;
};

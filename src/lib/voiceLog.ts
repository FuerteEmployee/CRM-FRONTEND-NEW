// FuerteAI Logs (Setup → FuerteAI Logs): records what the "Hey CRM" assistant
// heard and did, so admins can see whether voice works for their users and
// find what to fix. Events are batched and sent every few seconds; logging
// failures are swallowed so they can never break the assistant itself.
import { apiClient } from "@/api/client";

export type VoiceLogEvent =
  | "mic_on"
  | "mic_off"
  | "wake"
  | "command"
  | "no_access"
  | "timeout"
  | "speech_error";

interface QueuedEvent {
  event: VoiceLogEvent;
  heard?: string;
  result?: string;
  detail?: string;
  source?: "voice" | "typed";
  page: string;
  browser: string;
  session_id: string;
}

// Groups everything from one page load, so a single user's attempt
// (wake → command → result) reads as one story in the log.
const SESSION_ID = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const browserLabel = (): string => {
  const ua = navigator.userAgent;
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    (navigator as any).brave ? "Brave" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "Other";
  const os =
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad/.test(ua) ? "iOS" :
    /Windows/.test(ua) ? "Windows" :
    /Mac OS/.test(ua) ? "Mac" :
    /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} / ${os}` : browser;
};

/** Context sent with AI chat requests so the server can log them the same way. */
export const voiceLogMeta = (source: "voice" | "typed") => ({
  source,
  page: window.location.pathname,
  browser: browserLabel(),
  session_id: SESSION_ID,
});

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

const flush = async () => {
  timer = null;
  if (!queue.length) return;
  const events = queue;
  queue = [];
  try {
    await apiClient.post("/assistant/voice-logs", { events });
  } catch {
    // Logging is best-effort only.
  }
};

export const logVoiceEvent = (
  event: VoiceLogEvent,
  data: { heard?: string; result?: string; detail?: string; source?: "voice" | "typed" } = {}
) => {
  queue.push({
    event,
    ...data,
    page: window.location.pathname,
    browser: browserLabel(),
    session_id: SESSION_ID,
  });
  if (queue.length >= 20) {
    flush();
  } else if (!timer) {
    timer = setTimeout(flush, 4000);
  }
};

// Send what's pending when the tab is hidden/closed.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

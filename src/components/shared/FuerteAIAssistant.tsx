import "regenerator-runtime/runtime";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Bot, Mic, X } from "lucide-react";
import { usePermissionContext } from "@/context/PermissionContext";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { resolveCommand, applyBasePath } from "@/lib/voiceCommands";

const WAKE_WORDS = ["fuerte", "for the ai", "forty", "forte", "four tay", "for tay"];

// Mirrors AppSidebar's URL_MODULE_MAP — route prefix → plan module key
const ROUTE_MODULE_MAP: Record<string, string> = {
  "/admin/invoices": "finance",
  "/admin/payments": "finance",
  "/admin/credit-notes": "finance",
  "/admin/items": "finance",
  "/admin/tasks": "tasks",
  "/admin/projects": "projects",
  "/admin/support": "support",
  "/admin/leads": "leads",
  "/admin/contracts": "contracts",
  "/admin/chat": "chat",
  "/admin/meetings": "meetings",
  "/admin/subscriptions": "subscriptions",
  "/admin/expenses": "expenses",
  "/admin/proposals": "proposals",
  "/admin/estimates": "estimates",
  "/admin/knowledge-base": "knowledge_base",
  "/admin/time-tracking": "time_tracking",
  "/admin/goals": "goals",
  "/admin/announcements": "announcements",
  "/admin/calendar": "calendar",
  "/admin/reports": "reports",
};

// Route prefix → permission feature key used in canView()
const ROUTE_PERMISSION_MAP: Record<string, string> = {
  "/admin/leads": "leads",
  "/admin/customers": "customers",
  "/admin/contacts": "contacts",
  "/admin/tasks": "tasks",
  "/admin/projects": "projects",
  "/admin/invoices": "invoices",
  "/admin/payments": "payments",
  "/admin/expenses": "expenses",
  "/admin/estimates": "estimates",
  "/admin/proposals": "proposals",
  "/admin/credit-notes": "credit_notes",
  "/admin/contracts": "contracts",
  "/admin/support": "support",
  "/admin/reports": "reports",
  "/admin/knowledge-base": "knowledge_base",
  "/admin/meetings": "meetings",
  "/admin/subscriptions": "subscriptions",
  "/admin/goals": "goals",
  "/admin/announcements": "announcements",
  "/admin/setup/staff": "staff",
};

type AIState = "sleeping" | "listening" | "awake";

export function FuerteAIAssistant() {
  const [aiState, setAIState] = useState<AIState>("sleeping");
  const [tooltip, setTooltip] = useState(false);
  const aiStateRef = useRef<AIState>("sleeping");
  const awakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useNavigate();
  const { isStaff, isModuleEnabled, canView } = usePermissionContext();
  const { toast } = useToast();

  // Returns true if the user's plan includes the module AND they have view permission.
  const canAccessRoute = (route: string): boolean => {
    // Strip query string and /create|/new suffixes to get the base route.
    const base = route.replace(/\?.*$/, "").replace(/\/(create|new)$/, "");
    const moduleKey = ROUTE_MODULE_MAP[base];
    if (moduleKey && !isModuleEnabled(moduleKey)) return false;
    const permKey = ROUTE_PERMISSION_MAP[base];
    if (permKey && !canView(permKey)) return false;
    return true;
  };

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition, isMicrophoneAvailable } = useSpeechRecognition();

const changeState = (s: AIState) => {
  setAIState(s);
  aiStateRef.current = s;
};

// ─── Process transcript on every change ─────────────────────────────────
useEffect(() => {
  if (!transcript) return;
  handleTranscript(transcript.toLowerCase());
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [transcript]);

// ─── Surface mic permission errors instead of failing silently ───────────
// Chrome scopes microphone permission per-origin, so a user who denied it once
// on this domain (or on an origin without a valid HTTPS cert) will see this
// flip to false even though everything works fine on localhost.
useEffect(() => {
  if (!isMicrophoneAvailable && aiStateRef.current !== "sleeping") {
    changeState("sleeping");
    setTooltip(false);
    resetTranscript();
    if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
    toast({
      title: "Fuerte AI",
      description: "Microphone access is blocked for this site. Check your browser's site permissions and allow microphone access, then try again.",
      variant: "destructive",
    });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isMicrophoneAvailable]);

if (!browserSupportsSpeechRecognition) return null;

// ─── FAB toggle ──────────────────────────────────────────────────────────
const toggleListening = () => {
  if (listening) {
    SpeechRecognition.stopListening();
    changeState("sleeping");
    resetTranscript();
    setTooltip(false);
    if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
    toast({ title: "Fuerte AI", description: "Microphone off. AI is sleeping." });
  } else if (!isMicrophoneAvailable) {
    toast({
      title: "Fuerte AI",
      description: "Microphone access is blocked for this site. Check your browser's site permissions and allow microphone access, then try again.",
      variant: "destructive",
    });
  } else {
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true, language: "en-US" });

    // Start directly in "awake" state when button is clicked manually
    changeState("awake");
    setTooltip(true);
    if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
    awakeTimerRef.current = setTimeout(() => {
      changeState("listening");
      resetTranscript();
      toast({ title: "Fuerte AI", description: "No command heard. Back to listening…" });
    }, 10000);
    toast({ title: "Fuerte AI", description: 'Awake! Say your command (e.g. "open Task")' });
  }
};

// ─── Resolve + navigate (create intent first, then plain navigation) ──────
const matchCommand = resolveCommand;

// ─── Keyword matcher ─────────────────────────────────────────────────────
const handleTranscript = (cmd: string) => {
  // Step 1 — check for wake word while in listening state
  if (aiStateRef.current === "listening") {
    const wakeWord = WAKE_WORDS.find((w) => cmd.includes(w));
    if (wakeWord) {
      // Extract anything said AFTER the wake word in the same utterance
      const afterWake = cmd.slice(cmd.indexOf(wakeWord) + wakeWord.length).trim();

      changeState("awake");
      resetTranscript();
      if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);

      // If a command was spoken in the same breath ("Fuerte open Task")
      if (afterWake.length > 2) {
        const match = matchCommand(afterWake);
        if (match) {
          if (!canAccessRoute(match.route)) {
            toast({ title: "Fuerte AI", description: `You don't have access to ${match.label}.`, variant: "destructive" });
            changeState("listening");
            return;
          }
          toast({ title: "Fuerte AI", description: `Opening ${match.label}…` });
          if (match.section) {
            window.dispatchEvent(new CustomEvent("fuerte:open-section", { detail: { section: match.section } }));
          }
          navigate(applyBasePath(match.route, isStaff));
          changeState("listening");
          return;
        }
      }

      // No command yet — wait up to 10 s for the next utterance
      awakeTimerRef.current = setTimeout(() => {
        changeState("listening");
        resetTranscript();
        toast({ title: "Fuerte AI", description: "No command heard. Back to listening…" });
      }, 10000);
      toast({ title: "Fuerte AI", description: 'Listening for your command… (e.g. "open Task")' });
      return;
    }
  }

  // Step 2 — only match commands when awake
  if (aiStateRef.current !== "awake") return;

  // Step 3 — keyword matcher: phrases → route
  const match = matchCommand(cmd);
  if (match) {
    if (!canAccessRoute(match.route)) {
      toast({ title: "Fuerte AI", description: `You don't have access to ${match.label}.`, variant: "destructive" });
      changeState("listening");
      resetTranscript();
      if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
      return;
    }
    toast({ title: "Fuerte AI", description: `Opening ${match.label}…` });
    if (match.section) {
      window.dispatchEvent(new CustomEvent("fuerte:open-section", { detail: { section: match.section } }));
    }
    navigate(applyBasePath(match.route, isStaff));
    changeState("listening");
    resetTranscript();
    if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
    return;
  }

  // Step 4 — no match fallback
  // We do not reset the transcript here because the Web Speech API continuously
  // fires interim results (e.g., "open" -> "open t" -> "open tasks").
  // If we reset on an incomplete mismatch, the user can never finish a command.

  // Reset the 10-second timer to give them time to finish their sentence
  if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
  awakeTimerRef.current = setTimeout(() => {
    changeState("listening");
    // Surface exactly what the mic heard — without this, a misheard word
    // (e.g. "task" transcribed as something else) looks identical to "nothing
    // happened" from the user's side, with no way to tell the two apart.
    const heard = cmd.trim();
    toast({
      title: "Fuerte AI",
      description: heard ? `Didn't recognize "${heard}" as a command. Back to listening…` : "No command heard. Back to listening…",
    });
    resetTranscript();
  }, 10000);
};

// ─── UI helpers ──────────────────────────────────────────────────────────
const fabColor =
  aiState === "awake"
    ? "bg-green-600 shadow-green-400/50 animate-pulse"
    : aiState === "listening"
      ? "bg-primary shadow-primary/40 animate-pulse"
      : "bg-slate-900 hover:bg-slate-800 hover:scale-105";

const statusLabel =
  aiState === "awake"
    ? "Say a command…"
    : aiState === "listening"
      ? 'Say "Fuerte" to wake me'
      : "Microphone off";

const statusDot =
  aiState === "awake"
    ? "bg-green-400"
    : aiState === "listening"
      ? "bg-blue-400 animate-pulse"
      : "bg-gray-400";

return (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

    {/* ── Tooltip panel ── */}
    {tooltip && listening && (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-72 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${statusDot}`} />
            <span className="text-sm font-bold text-gray-800">Fuerte AI</span>
          </div>
          <button
            onClick={() => setTooltip(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Status */}
        <p className="text-xs text-gray-500 mb-3">{statusLabel}</p>

        {/* Live transcript */}
        {transcript && (
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Hearing</p>
            <p className="text-xs text-gray-700 font-medium leading-snug line-clamp-2">{transcript}</p>
          </div>
        )}

        {/* State badge + API label */}
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${aiState === "awake"
              ? "bg-green-100 text-green-700"
              : "bg-blue-50 text-blue-600"
            }`}>
            {aiState === "awake" ? "Awake" : "Listening"}
          </span>
          <span className="text-[10px] text-gray-400">Web Speech API</span>
        </div>
      </div>
    )}

    {/* ── FAB button ── */}
    <button
      onClick={toggleListening}
      title={listening ? "Stop Fuerte AI" : "Start Fuerte AI"}
      className={`h-14 w-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 border-4 border-white text-white ${fabColor}`}
    >
      {aiState === "sleeping" ? (
        <Bot className="h-6 w-6" />
      ) : (
        <Mic className="h-6 w-6" />
      )}
    </button>
  </div>
);
}

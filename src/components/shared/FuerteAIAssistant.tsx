import "regenerator-runtime/runtime";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Mic, MicOff, X, Volume2, VolumeX, Trash2 } from "lucide-react";
import { usePermissionContext } from "@/context/PermissionContext";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { resolveCommand, applyBasePath } from "@/lib/voiceCommands";
import { assistantService } from "@/api/services/assistant.service";
import { speak, stopSpeaking, isVoiceReplyEnabled, setVoiceReplyEnabled, speechSupported } from "@/lib/speak";

// Wake phrase is English ("Hey CRM") instead of the Spanish brand name
// ("Fuerte") because the en-US recognizer mishears "Fuerte" constantly,
// and single fragments like "40" (a former fallback for "fuerte") were
// false-triggering on unrelated speech. Matching is substring-based, so
// keep entries as full "hey ..." phrases, not bare words, to avoid the
// same false-positive problem recurring.
const WAKE_WORDS = [
  "hey crm", "hey, crm", "hey c r m",
];

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
  "/admin/purchases": "purchases",
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
  // How much of `transcript` has already been acted on. react-speech-recognition's
  // resetTranscript() actually aborts + restarts the live mic session under the
  // hood (see node_modules/react-speech-recognition RecognitionManager.disconnect
  // -> abort()), which creates a real dead-air gap. Calling it after every wake /
  // command used to swallow whatever was said in that gap. Tracking a consumed
  // offset instead lets the mic run truly continuously through wake -> command
  // -> next command, and we only fall back to a real resetTranscript() during
  // genuine silence (the 10s idle timeout), where a brief restart is harmless.
  const consumedRef = useRef(0);

  // Claude-backed fallback for anything the local keyword matcher can't resolve
  // (free-form questions, data lookups, task creation, etc.)
  const [isThinking, setIsThinking] = useState(false);
  const [typedCommand, setTypedCommand] = useState("");

  // Phase 6 — persistent chat panel. Transcript is stored server-side per
  // user, so each admin/staff member sees only their own conversation and it
  // survives page reloads.
  type ChatMessage = { role: "user" | "assistant"; text: string };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!tooltip || historyLoaded) return;
    (async () => {
      try {
        const result = await assistantService.getHistory();
        setChatMessages(Array.isArray(result?.messages) ? result.messages : []);
      } catch {
        // history is a convenience — the assistant still works without it
      } finally {
        setHistoryLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tooltip]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isThinking]);

  const clearChat = async () => {
    try {
      await assistantService.clearHistory();
      setChatMessages([]);
      toast({ title: "Fuerte AI", description: "Conversation cleared." });
    } catch {
      toast({ title: "Fuerte AI", description: "Could not clear the conversation.", variant: "destructive" });
    }
  };

  // Hands-free mode: listen for the wake word from page load, no click needed.
  // Persisted per browser; on by default.
  const [autoListen, setAutoListen] = useState(
    () => localStorage.getItem("fuerte_auto_listen") !== "off"
  );

  const toggleAutoListen = () => {
    const next = !autoListen;
    setAutoListen(next);
    localStorage.setItem("fuerte_auto_listen", next ? "on" : "off");
    if (next) {
      SpeechRecognition.startListening({ continuous: true, language: "en-US" });
      changeState("listening");
      toast({ title: "Fuerte AI", description: 'Hands-free mode on — just say "Hey CRM" anytime.' });
    } else {
      SpeechRecognition.stopListening();
      stopSpeaking();
      changeState("sleeping");
      toast({ title: "Fuerte AI", description: "Hands-free mode off. Click the button to use voice." });
    }
  };

  // Phase 5 — voice replies (TTS). Mic is paused while the assistant speaks
  // so it never hears its own voice and re-triggers the wake word.
  const [voiceReplies, setVoiceReplies] = useState(isVoiceReplyEnabled());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const wasListeningRef = useRef(false);

  const toggleVoiceReplies = () => {
    const next = !voiceReplies;
    setVoiceReplies(next);
    setVoiceReplyEnabled(next);
    if (!next) stopSpeaking();
  };

  // Speak a reply aloud, pausing speech recognition for the duration.
  const speakReply = (text: string) => {
    if (!voiceReplies || !speechSupported()) return;
    speak(text, {
      onStart: () => {
        setIsSpeaking(true);
        wasListeningRef.current = aiStateRef.current !== "sleeping";
        if (wasListeningRef.current) SpeechRecognition.stopListening();
      },
      onEnd: () => {
        setIsSpeaking(false);
        if (wasListeningRef.current && aiStateRef.current !== "sleeping") {
          resetTranscript();
          consumedRef.current = 0;
          SpeechRecognition.startListening({ continuous: true, language: "en-US" });
        }
      },
    });
  };

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

  // Speech recognition (like getUserMedia) only runs in a secure context —
  // https or localhost. On plain http the browser never shows a permission
  // prompt at all and isMicrophoneAvailable just stays stuck, so this is
  // checked separately to give a distinct, accurate error instead of the
  // generic "microphone blocked" message.
  const isSecureCtx = typeof window !== "undefined" && window.isSecureContext;

const changeState = (s: AIState) => {
  setAIState(s);
  aiStateRef.current = s;
};

// ─── Process transcript on every change ─────────────────────────────────
// Only hand the NEW portion (since consumedRef) to the matcher — the mic
// itself never gets restarted here, so it keeps listening straight through.
useEffect(() => {
  if (!transcript) return;
  const unread = transcript.slice(consumedRef.current);
  if (!unread.trim()) return;
  handleTranscript(unread.toLowerCase());
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
    consumedRef.current = 0;
    if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
    toast({
      title: "Fuerte AI",
      description: "Microphone access is blocked for this site. Check your browser's site permissions and allow microphone access, then try again.",
      variant: "destructive",
    });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isMicrophoneAvailable]);

// ─── Hands-free wake word: start listening on page load ──────────────────
// Saying "Hey CRM" now works without clicking the button first. The browser
// will ask for microphone permission the first time; once allowed, the
// assistant is always waiting for the wake word. Users can opt out with the
// auto-listen toggle in the panel (persisted per browser).
useEffect(() => {
  if (!browserSupportsSpeechRecognition || !autoListen) return;
  if (!isSecureCtx) {
    toast({
      title: "Fuerte AI",
      description: "Voice control needs a secure (https) connection. This page is loaded over plain http, so the browser won't allow microphone access here.",
      variant: "destructive",
    });
    return;
  }
  SpeechRecognition.startListening({ continuous: true, language: "en-US" });
  changeState("listening");
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// ─── Watchdog: keep the mic alive ────────────────────────────────────────
// Chrome silently stops continuous recognition after long silence or a
// network hiccup. If we're supposed to be listening but the mic went quiet
// (and we're not deliberately paused for TTS), restart it.
useEffect(() => {
  if (listening || isSpeaking) return;
  if (aiState === "sleeping") return;
  if (isMicrophoneAvailable === false) return;
  const t = setTimeout(() => {
    if (aiStateRef.current !== "sleeping") {
      SpeechRecognition.startListening({ continuous: true, language: "en-US" });
    }
  }, 800);
  return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [listening, aiState, isSpeaking, isMicrophoneAvailable]);

if (!browserSupportsSpeechRecognition) return null;

// ─── FAB toggle ──────────────────────────────────────────────────────────
const toggleListening = () => {
  if (listening) {
    SpeechRecognition.stopListening();
    stopSpeaking();
    changeState("sleeping");
    resetTranscript();
    consumedRef.current = 0;
    setTooltip(false);
    if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
    toast({ title: "Fuerte AI", description: "Microphone off. AI is sleeping." });
  } else if (!isSecureCtx) {
    toast({
      title: "Fuerte AI",
      description: "Voice control needs a secure (https) connection. This page is loaded over plain http, so the browser won't allow microphone access here.",
      variant: "destructive",
    });
  } else if (!isMicrophoneAvailable) {
    toast({
      title: "Fuerte AI",
      description: "Microphone access is blocked for this site. Check your browser's site permissions and allow microphone access, then try again.",
      variant: "destructive",
    });
  } else {
    resetTranscript();
    consumedRef.current = 0;
    SpeechRecognition.startListening({ continuous: true, language: "en-US" });

    // Start directly in "awake" state when button is clicked manually
    changeState("awake");
    setTooltip(true);
    if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
    awakeTimerRef.current = setTimeout(() => {
      changeState("listening");
      resetTranscript();
      consumedRef.current = 0;
      toast({ title: "Fuerte AI", description: "No command heard. Back to listening…" });
    }, 30000);
    toast({ title: "Fuerte AI", description: 'Awake! Say your command (e.g. "open Task")' });
  }
};

// ─── Resolve + navigate (create intent first, then plain navigation) ──────
const matchCommand = resolveCommand;

// ─── Claude fallback — anything the local keyword matcher can't resolve ───
// (free-form questions, "show me overdue invoices from Acme", "create a task
// to call John tomorrow", etc.) Runs server-side against real CRM data.
const askFuerteAI = async (text: string) => {
  if (!text || !text.trim()) return;
  setIsThinking(true);
  setChatMessages((prev) => [...prev, { role: "user", text }]);
  try {
    // Conversation context lives server-side per user (Phase 6)
    const result = await assistantService.chat(text);

    if (result?.navigateTo) {
      if (!canAccessRoute(result.navigateTo)) {
        toast({ title: "Fuerte AI", description: "You don't have access to that section.", variant: "destructive" });
      } else {
        navigate(applyBasePath(result.navigateTo, isStaff));
      }
    }

    if (result?.reply) {
      setChatMessages((prev) => [...prev, { role: "assistant", text: result.reply }]);
      // Voice-only flow (panel closed): still surface the answer as a toast
      if (!tooltip) toast({ title: "Fuerte AI", description: result.reply });
      speakReply(result.reply);
    }
  } catch (error: any) {
    const msg = error?.response?.data?.message || "Something went wrong. Please try again.";
    setChatMessages((prev) => [...prev, { role: "assistant", text: msg }]);
    toast({ title: "Fuerte AI", description: msg, variant: "destructive" });
  } finally {
    setIsThinking(false);
  }
};

// ─── Keyword matcher ─────────────────────────────────────────────────────
const handleTranscript = (cmd: string) => {
  // Step 1 — check for the wake word regardless of current state (listening
  // OR already awake). Saying "Hey CRM" again while already awake used to
  // fall through to the command matcher, fail, and get shipped to the Claude
  // fallback as a nonsense query instead of just re-arming the 10s window —
  // that's why a second "Hey CRM" right after the first used to silently do
  // nothing useful.
  // Strip punctuation the recognizer sometimes inserts into acronyms
  // (e.g. "Hey C.R.M." or "Hey, CRM!") before comparing.
  const wakeCmd = cmd.replace(/[.,!?]/g, "").trim();
  const wakeWord = WAKE_WORDS.find((w) => wakeCmd.includes(w));
  if (wakeWord) {
    // Extract anything said AFTER the wake word in the same utterance
    const afterWake = wakeCmd.slice(wakeCmd.indexOf(wakeWord) + wakeWord.length).trim();

    changeState("awake");
    setTooltip(true); // pop the panel open so the wake is visible, not just a toast
    // Mark consumed WITHOUT calling resetTranscript() — that would abort/restart
    // the live mic session and swallow whatever the user says right after the
    // wake word. The mic just keeps running; only our own "already handled"
    // offset moves forward.
    consumedRef.current = transcript.length;
    if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);

    // If a command was spoken in the same breath ("Hey CRM open Task")
    if (afterWake.length > 2) {
      const match = matchCommand(afterWake);
      if (match) {
        if (!canAccessRoute(match.route)) {
          toast({ title: "Fuerte AI", description: `You don't have access to ${match.label}.`, variant: "destructive" });
          speakReply(`You don't have access to ${match.label}.`);
          changeState("listening");
          return;
        }
        toast({ title: "Fuerte AI", description: `Opening ${match.label}…` });
        speakReply(`Opening ${match.label}`);
        if (match.section) {
          window.dispatchEvent(new CustomEvent("fuerte:open-section", { detail: { section: match.section } }));
        }
        navigate(applyBasePath(match.route, isStaff));
        changeState("listening");
        return;
      }
    }

    // No command yet — wait up to 30 s for the next utterance. This timer only
    // fires on genuine silence (any new speech clears and re-arms it), so a real
    // resetTranscript() here is safe — it's also our one deliberate cleanup point
    // that keeps the accumulated transcript from growing unbounded all session.
    awakeTimerRef.current = setTimeout(() => {
      changeState("listening");
      resetTranscript();
      consumedRef.current = 0;
      toast({ title: "Fuerte AI", description: "No command heard. Back to listening…" });
    }, 30000);
    toast({ title: "Fuerte AI", description: 'Listening for your command… (e.g. "open Task")' });
    return;
  }

  // Step 2 — only match commands when awake
  if (aiStateRef.current !== "awake") return;

  // Step 3 — keyword matcher: phrases → route
  const match = matchCommand(cmd);
  if (match) {
    if (!canAccessRoute(match.route)) {
      toast({ title: "Fuerte AI", description: `You don't have access to ${match.label}.`, variant: "destructive" });
      speakReply(`You don't have access to ${match.label}.`);
      changeState("listening");
      // Consume without touching the mic — so a follow-up command right after
      // this one is heard instead of falling into the abort/restart gap.
      consumedRef.current = transcript.length;
      if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
      return;
    }
    toast({ title: "Fuerte AI", description: `Opening ${match.label}…` });
    speakReply(`Opening ${match.label}`);
    if (match.section) {
      window.dispatchEvent(new CustomEvent("fuerte:open-section", { detail: { section: match.section } }));
    }
    navigate(applyBasePath(match.route, isStaff));
    changeState("listening");
    consumedRef.current = transcript.length;
    if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
    return;
  }

  // Step 4 — no local match: fall back to Claude instead of giving up
  // We do not reset the transcript here because the Web Speech API continuously
  // fires interim results (e.g., "open" -> "open t" -> "open tasks").
  // If we reset on an incomplete mismatch, the user can never finish a command.

  // Debounce: every interim result restarts this timer, so it fires ~3 s after
  // the user STOPS talking — the question goes to the AI almost immediately
  // instead of waiting out a long fixed window.
  if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
  awakeTimerRef.current = setTimeout(() => {
    changeState("listening");
    const heard = cmd.trim();
    // Consume without aborting the mic — same reasoning as the wake/command
    // paths above: keep the session alive so the next thing said is heard.
    consumedRef.current = transcript.length;
    if (heard) {
      askFuerteAI(heard);
    } else {
      toast({ title: "Fuerte AI", description: "No command heard. Back to listening…" });
    }
  }, 3000);
};

// ─── UI helpers ──────────────────────────────────────────────────────────
// FAB follows the CRM design system: primary-color gradient pill that
// expands on hover, with a live status ring + badge per assistant state.
const fabColor =
  aiState === "awake"
    ? "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/40"
    : aiState === "listening"
      ? "bg-gradient-to-br from-primary to-primary/75 shadow-primary/40"
      : "bg-gradient-to-br from-slate-800 to-slate-950 shadow-slate-900/40";

const fabBadge = isThinking
  ? "bg-amber-400 animate-pulse"
  : isSpeaking
    ? "bg-purple-400 animate-pulse"
    : aiState === "awake"
      ? "bg-emerald-400"
      : aiState === "listening"
        ? "bg-sky-400 animate-pulse"
        : "bg-gray-400";

const fabLabel = isThinking
  ? "Thinking…"
  : isSpeaking
    ? "Speaking…"
    : aiState === "awake"
      ? "Listening…"
      : aiState === "listening"
        ? 'Say "Hey CRM"'
        : "FuerteAI";

const statusLabel =
  aiState === "awake"
    ? "Say a command…"
    : aiState === "listening"
      ? 'Say "Hey CRM" to wake me'
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
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleAutoListen}
              title={autoListen ? "Turn off hands-free wake word" : "Turn on hands-free wake word"}
              className={`transition-colors ${autoListen ? "text-primary hover:text-primary/80" : "text-gray-400 hover:text-gray-600"}`}
            >
              {autoListen ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
            </button>
            {chatMessages.length > 0 && (
              <button
                onClick={clearChat}
                title="Clear conversation"
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            {speechSupported() && (
              <button
                onClick={toggleVoiceReplies}
                title={voiceReplies ? "Mute voice replies" : "Unmute voice replies"}
                className={`transition-colors ${voiceReplies ? "text-primary hover:text-primary/80" : "text-gray-400 hover:text-gray-600"}`}
              >
                {voiceReplies ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              </button>
            )}
            <button
              onClick={() => setTooltip(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Status */}
        <p className="text-xs text-gray-500 mb-3">{statusLabel}</p>

        {/* Chat thread — persisted per user on the server (Phase 6) */}
        {(chatMessages.length > 0 || isThinking) && (
          <div className="max-h-64 overflow-y-auto space-y-2 mb-3 pr-1">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-xs leading-snug whitespace-pre-wrap break-words ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-400 rounded-2xl rounded-bl-sm px-3 py-1.5 text-xs animate-pulse">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Live transcript — only the part not yet acted on, not the whole
            session (the mic itself no longer resets between commands). */}
        {transcript.slice(consumedRef.current).trim() && (
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Hearing</p>
            <p className="text-xs text-gray-700 font-medium leading-snug line-clamp-2">{transcript.slice(consumedRef.current)}</p>
          </div>
        )}

        {/* Typed command — same Claude-backed assistant, no mic required */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const text = typedCommand.trim();
            if (!text) return;
            setTypedCommand("");
            askFuerteAI(text);
          }}
          className="flex items-center gap-2 mb-3"
        >
          <input
            type="text"
            value={typedCommand}
            onChange={(e) => setTypedCommand(e.target.value)}
            placeholder="Or type a command…"
            disabled={isThinking}
            className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isThinking || !typedCommand.trim()}
            className="text-xs font-bold text-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isThinking ? "…" : "Ask"}
          </button>
        </form>

        {/* State badge + API label */}
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${isThinking
              ? "bg-amber-100 text-amber-700 animate-pulse"
              : isSpeaking
                ? "bg-purple-100 text-purple-700 animate-pulse"
                : aiState === "awake"
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-50 text-blue-600"
            }`}>
            {isThinking ? "Thinking…" : isSpeaking ? "Speaking…" : aiState === "awake" ? "Awake" : "Listening"}
          </span>
          <span className="text-[10px] text-gray-400">FuerteAI</span>
        </div>
      </div>
    )}

    {/* ── FAB button — CRM-styled pill that expands on hover ── */}
    <button
      onClick={toggleListening}
      title={listening ? "Stop Fuerte AI" : "Start Fuerte AI"}
      className="group relative"
    >
      {/* Soft ping ring while the mic is live */}
      {aiState !== "sleeping" && (
        <span
          className={`absolute inset-0 rounded-full animate-ping opacity-25 ${
            aiState === "awake" ? "bg-emerald-500" : "bg-primary"
          }`}
        />
      )}

      <div
        className={`relative flex h-14 min-w-14 items-center justify-center rounded-full px-[14px] text-white shadow-xl ring-4 ring-background transition-all duration-300 group-hover:shadow-2xl group-hover:scale-[1.03] active:scale-95 ${fabColor}`}
      >
        {aiState === "sleeping" ? (
          <Sparkles className="h-6 w-6 shrink-0" />
        ) : (
          <Mic className="h-6 w-6 shrink-0" />
        )}
        {/* Label slides out on hover */}
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold tracking-tight opacity-0 transition-all duration-300 group-hover:ml-2 group-hover:max-w-[110px] group-hover:opacity-100">
          {fabLabel}
        </span>
      </div>

      {/* Status badge (thinking / speaking / awake / listening / off) */}
      <span
        className={`absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${fabBadge}`}
      />
    </button>
  </div>
);
}

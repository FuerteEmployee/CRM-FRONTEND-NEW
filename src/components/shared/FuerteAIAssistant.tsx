import "regenerator-runtime/runtime";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Bot, Mic, X } from "lucide-react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

// ─── Route map: keyword phrases → route paths ───────────────────────────────
// section matches the collapsible group label in AppSidebar ("Sales" | "Utilities" | "Reports" | null)
const COMMAND_MAP: { keywords: string[]; route: string; label: string; section: string | null }[] = [
  { keywords: ["dashboard", "home"],                  route: "/admin/dashboard",          label: "Dashboard",       section: null },
  { keywords: ["tasks", "task"],                       route: "/admin/tasks",               label: "Tasks",           section: null },
  { keywords: ["leads", "lead"],                       route: "/admin/leads",               label: "Leads",           section: "Sales" },
  { keywords: ["customers", "customer", "clients"],    route: "/admin/customers",           label: "Customers",       section: null },
  { keywords: ["projects", "project"],                 route: "/admin/projects",            label: "Projects",        section: null },
  { keywords: ["create project", "new project"],       route: "/admin/projects/create",     label: "Create Project",  section: null },
  { keywords: ["invoices", "invoice"],                 route: "/admin/invoices",            label: "Invoices",        section: null },
  { keywords: ["create invoice", "new invoice"],       route: "/admin/invoices/create",     label: "Create Invoice",  section: null },
  { keywords: ["expenses", "expense"],                 route: "/admin/expenses",            label: "Expenses",        section: null },
  { keywords: ["estimates", "estimate"],               route: "/admin/estimates",           label: "Estimates",       section: "Sales" },
  { keywords: ["proposals", "proposal"],               route: "/admin/proposals",           label: "Proposals",       section: "Sales" },
  { keywords: ["credit notes", "credit note"],         route: "/admin/credit-notes",        label: "Credit Notes",    section: "Sales" },
  { keywords: ["tickets", "support", "ticket"],        route: "/admin/support",             label: "Support",         section: null },
  { keywords: ["chat", "messages"],                    route: "/admin/chat",                label: "Chat",            section: "Utilities" },
  { keywords: ["calendar", "schedule"],                route: "/admin/calendar",            label: "Calendar",        section: "Utilities" },
  { keywords: ["meetings", "meeting"],                 route: "/admin/meetings",            label: "Meetings",        section: "Utilities" },
  { keywords: ["reports", "analytics"],                route: "/admin/reports",             label: "Reports",         section: "Reports" },
  { keywords: ["attendance", "time tracking"],         route: "/admin/time-tracking",       label: "Attendance",      section: "Utilities" },
  { keywords: ["staff", "team"],                       route: "/admin/setup/staff",         label: "Staff",           section: null },
  { keywords: ["settings", "setup"],                   route: "/admin/setup",               label: "Settings",        section: null },
  { keywords: ["contracts", "contract"],               route: "/admin/contracts",           label: "Contracts",       section: null },
  { keywords: ["payments", "payment"],                 route: "/admin/payments",            label: "Payments",        section: null },
  { keywords: ["subscriptions", "subscription"],       route: "/admin/subscriptions",       label: "Subscriptions",   section: "Utilities" },
  { keywords: ["goals", "goal"],                       route: "/admin/goals",               label: "Goals",           section: "Utilities" },
  { keywords: ["announcements", "announcement"],       route: "/admin/announcements",       label: "Announcements",   section: "Utilities" },
  { keywords: ["knowledge base", "faq"],               route: "/admin/knowledge-base",      label: "Knowledge Base",  section: "Utilities" },
  { keywords: ["media", "files"],                      route: "/admin/media",               label: "Media",           section: "Utilities" },
];

const WAKE_WORDS = ["fuerte", "for the ai", "forty", "forte", "four tay", "for tay"];

type AIState = "sleeping" | "listening" | "awake";

export function FuerteAIAssistant() {
  const [aiState, setAIState]   = useState<AIState>("sleeping");
  const [tooltip, setTooltip]   = useState(false);
  const aiStateRef              = useRef<AIState>("sleeping");
  const awakeTimerRef           = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate    = useNavigate();
  const { toast }   = useToast();

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

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
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true, language: "en-US" });
      changeState("listening");
      setTooltip(true);
      toast({ title: "Fuerte AI", description: 'Say "Fuerte" to wake me up.' });
    }
  };

    // ─── Strip action prefixes and match a command ──────────────────────────
  const matchCommand = (cmd: string): { route: string; label: string } | null => {
    // Remove leading action words so "open task" / "go to task" both hit "task"
    const stripped = cmd
      .replace(/^(open up|open|go to|navigate to|take me to|show me|show|visit|launch|load)\s+/i, "")
      .trim();

    for (const { keywords, route, label } of COMMAND_MAP) {
      if (keywords.some((k) => cmd.includes(k) || stripped.includes(k))) {
        return { route, label };
      }
    }
    return null;
  };

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
            toast({ title: "Fuerte AI", description: `Opening ${match.label}…` });
            if (match.section) {
              window.dispatchEvent(new CustomEvent("fuerte:open-section", { detail: { section: match.section } }));
            }
            navigate(match.route);
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
      toast({ title: "Fuerte AI", description: `Opening ${match.label}…` });
      if (match.section) {
        window.dispatchEvent(new CustomEvent("fuerte:open-section", { detail: { section: match.section } }));
      }
      navigate(match.route);
      changeState("listening");
      resetTranscript();
      if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
      return;
    }

    // Step 4 — no match fallback
    if (cmd.trim().length > 4) {
      toast({ title: "Fuerte AI", description: `Command not recognised: "${cmd}"`, variant: "destructive" });
      resetTranscript();
    }
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
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
              aiState === "awake"
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

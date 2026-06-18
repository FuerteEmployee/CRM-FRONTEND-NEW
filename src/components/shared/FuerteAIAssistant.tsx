import "regenerator-runtime/runtime";
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Bot, Mic, MicOff, X } from "lucide-react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

// ─── Route map: keyword phrases → route paths ───────────────────────────────
const COMMAND_MAP: { keywords: string[]; route: string; label: string }[] = [
  { keywords: ["dashboard", "home"], route: "/admin/dashboard", label: "Dashboard" },
  { keywords: ["tasks", "task"], route: "/admin/tasks", label: "Tasks" },
  { keywords: ["leads", "lead"], route: "/admin/leads", label: "Leads" },
  { keywords: ["customers", "customer", "clients"], route: "/admin/customers", label: "Customers" },
  { keywords: ["projects", "project"], route: "/admin/projects", label: "Projects" },
  { keywords: ["create project", "new project"], route: "/admin/projects/create", label: "Create Project" },
  { keywords: ["invoices", "invoice"], route: "/admin/invoices", label: "Invoices" },
  { keywords: ["create invoice", "new invoice"], route: "/admin/invoices/create", label: "Create Invoice" },
  { keywords: ["expenses", "expense"], route: "/admin/expenses", label: "Expenses" },
  { keywords: ["estimates", "estimate"], route: "/admin/estimates", label: "Estimates" },
  { keywords: ["proposals", "proposal"], route: "/admin/proposals", label: "Proposals" },
  { keywords: ["credit notes", "credit note"], route: "/admin/credit-notes", label: "Credit Notes" },
  { keywords: ["tickets", "support", "ticket"], route: "/admin/support", label: "Support" },
  { keywords: ["chat", "messages"], route: "/admin/chat", label: "Chat" },
  { keywords: ["calendar", "schedule"], route: "/admin/calendar", label: "Calendar" },
  { keywords: ["meetings", "meeting"], route: "/admin/meetings", label: "Meetings" },
  { keywords: ["reports", "analytics"], route: "/admin/reports", label: "Reports" },
  { keywords: ["attendance", "time tracking"], route: "/admin/time-tracking", label: "Attendance" },
  { keywords: ["staff", "team"], route: "/admin/setup/staff", label: "Staff" },
  { keywords: ["settings", "setup"], route: "/admin/setup", label: "Settings" },
];

const WAKE_WORDS = ["fuerte", "for the ai", "forty", "forte", "four tay", "for tay"];

type AIState = "sleeping" | "listening" | "awake";

export function FuerteAIAssistant() {
  const [aiState, setAIState]     = useState<AIState>("sleeping");
  const [tooltip, setTooltip]     = useState(false);
  const aiStateRef                = useRef<AIState>("sleeping");
  const awakeTimerRef             = useRef<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

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
  }, [transcript]);

  if (!browserSupportsSpeechRecognition) return null;

  // ─── FAB toggle ──────────────────────────────────────────────────────────
  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      changeState("sleeping");
      resetTranscript();
      setTooltip(false);
      toast({ title: "Fuerte AI", description: "Microphone off. AI is sleeping." });
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true, language: "en-US" });
      changeState("listening");
      setTooltip(true);
      toast({ title: "Fuerte AI", description: "AI is working and listening in the background." });
    }
  };

  // ─── Keyword matcher ─────────────────────────────────────────────────────
  const handleTranscript = (cmd: string) => {
    // Step 1 — check for wake word while in listening state
    if (aiStateRef.current === "listening") {
      const woken = WAKE_WORDS.some((w) => cmd.includes(w));
      if (woken) {
        changeState("awake");
        resetTranscript();
        if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
        // Auto-sleep after 10 s if no command
        awakeTimerRef.current = setTimeout(() => {
          changeState("listening");
          resetTranscript();
        }, 10000);
        toast({ title: "Fuerte AI", description: "Listening for your command…" });
        return;
      }
    }

    // Step 2 — only match commands when awake
    if (aiStateRef.current !== "awake") return;

    // Step 3 — keyword matcher: phrases → route
    for (const { keywords, route, label } of COMMAND_MAP) {
      if (keywords.some((k) => cmd.includes(k))) {
        toast({ title: "Fuerte AI", description: `Opening ${label}…` });
        navigate(route);
        changeState("listening");
        resetTranscript();
        if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
        return;
      }
    }

    // Step 4 — no match fallback (AI backend placeholder)
    if (cmd.length > 4) {
      toast({ title: "Fuerte AI", description: `Command not recognised: "${cmd}"` });
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
    aiState === "awake" ? "bg-green-400" : aiState === "listening" ? "bg-blue-400 animate-pulse" : "bg-gray-400";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">

      {/* ── Tooltip panel (shown while mic is active) ── */}
      {tooltip && listening && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-64 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${statusDot}`} />
              <span className="text-sm font-bold text-gray-800">Fuerte AI</span>
            </div>
            <button
              onClick={() => setTooltip(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Status */}
          <p className="text-xs text-gray-500 mb-3">{statusLabel}</p>

          {/* Live transcript */}
          {transcript && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">Hearing</p>
              <p className="text-xs text-gray-700 font-medium leading-snug line-clamp-2">{transcript}</p>
            </div>
          )}

          {/* State badge */}
          <div className="mt-3 flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full
              ${aiState === "awake" ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-600"}`}>
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
        {aiState === "awake"   ? <Mic className="h-6 w-6" /> :
         aiState === "listening" ? <Mic className="h-6 w-6" /> :
                                   <Bot className="h-6 w-6" />}
      </button>
    </div>
  );
}

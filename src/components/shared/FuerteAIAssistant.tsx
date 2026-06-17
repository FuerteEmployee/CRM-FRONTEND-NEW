import "regenerator-runtime/runtime";
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Bot, Mic } from "lucide-react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

export function FuerteAIAssistant() {
  const [isAwake, setIsAwake] = useState(false);
  const isAwakeRef = useRef(false);
  const awakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const setAwakeState = (awake: boolean) => {
    setIsAwake(awake);
    isAwakeRef.current = awake;
  };

  useEffect(() => {
    if (transcript) {
      processCommand(transcript.toLowerCase());
    }
  }, [transcript]);

  if (!browserSupportsSpeechRecognition) {
    return null; // Or show a fallback UI
  }

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      toast({
        title: "Fuerte AI",
        description: "Microphone off. AI is sleeping.",
      });
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
      toast({
        title: "Fuerte AI",
        description: "AI is working and listening in the background.",
      });
    }
  };

  const processCommand = (command: string) => {
    // Add multiple phonetic fallbacks for the Spanish word "Fuerte" to improve recognition accuracy in English
    const wakeWords = ["fuerte", "for the ai", "40 ai", "forty", "forte", "four tay", "for tay"];
    const isWakeWordPresent = wakeWords.some(word => command.includes(word));
    
    if (isWakeWordPresent && !isAwakeRef.current) {
      setAwakeState(true);
      toast({
        title: "Fuerte AI",
        description: "Listening...",
      });
      resetTranscript();
      if (awakeTimeoutRef.current) clearTimeout(awakeTimeoutRef.current);
      awakeTimeoutRef.current = setTimeout(() => {
        setAwakeState(false);
        resetTranscript();
      }, 10000);
      return; // Return early to wait for the actual command after wake word
    }

    if (!isAwakeRef.current) return;

    let handled = false;

    if (command.includes("go to dashboard") || command.includes("open dashboard") || command.includes("home")) {
      navigate("/admin/dashboard");
      handled = true;
    } else if (command.includes("create task") || command.includes("new task") || command.includes("add task") || command.includes("assign task")) {
      navigate("/admin/tasks");
      handled = true;
    } else if (command.includes("go to tasks") || command.includes("open tasks")) {
      navigate("/admin/tasks");
      handled = true;
    } else if (command.includes("create lead") || command.includes("new lead") || command.includes("add lead")) {
      navigate("/admin/leads");
      handled = true;
    } else if (command.includes("go to leads") || command.includes("open leads")) {
      navigate("/admin/leads");
      handled = true;
    } else if (command.includes("create customer") || command.includes("add customer") || command.includes("new customer")) {
      navigate("/admin/customers");
      handled = true;
    } else if (command.includes("go to customers") || command.includes("open customers")) {
      navigate("/admin/customers");
      handled = true;
    } else if (command.includes("create project") || command.includes("new project") || command.includes("add project")) {
      navigate("/admin/projects/create");
      handled = true;
    } else if (command.includes("go to projects") || command.includes("open projects")) {
      navigate("/admin/projects");
      handled = true;
    } else if (command.includes("create invoice") || command.includes("new invoice") || command.includes("add invoice")) {
      navigate("/admin/invoices/create");
      handled = true;
    } else if (command.includes("go to invoices") || command.includes("open invoices")) {
      navigate("/admin/invoices");
      handled = true;
    } else if (command.includes("create expense") || command.includes("new expense") || command.includes("add expense") || command.includes("record expense")) {
      navigate("/admin/expenses/create");
      handled = true;
    } else if (command.includes("go to expenses") || command.includes("open expenses")) {
      navigate("/admin/expenses");
      handled = true;
    } else if (command.includes("create estimate") || command.includes("new estimate") || command.includes("add estimate")) {
      navigate("/admin/estimates/create");
      handled = true;
    } else if (command.includes("go to estimates") || command.includes("open estimates")) {
      navigate("/admin/estimates");
      handled = true;
    } else if (command.includes("create proposal") || command.includes("new proposal") || command.includes("add proposal")) {
      navigate("/admin/proposals/create");
      handled = true;
    } else if (command.includes("go to proposals") || command.includes("open proposals")) {
      navigate("/admin/proposals");
      handled = true;
    } else if (command.includes("create credit note") || command.includes("new credit note") || command.includes("add credit note")) {
      navigate("/admin/credit-notes/create");
      handled = true;
    } else if (command.includes("go to credit notes") || command.includes("open credit notes")) {
      navigate("/admin/credit-notes");
      handled = true;
    } else if (command.includes("go to tickets") || command.includes("open tickets") || command.includes("support")) {
      navigate("/admin/support");
      handled = true;
    } else if (command.includes("create ticket") || command.includes("new ticket") || command.includes("open a ticket")) {
      navigate("/admin/support/create");
      handled = true;
    } else if (command.includes("go to chat") || command.includes("open chat") || command.includes("messages")) {
      navigate("/admin/chat");
      handled = true;
    } else if (command.includes("go to calendar") || command.includes("open calendar") || command.includes("schedule")) {
      navigate("/admin/calendar");
      handled = true;
    } else if (command.includes("go to meetings") || command.includes("open meetings") || command.includes("zoom")) {
      navigate("/admin/meetings");
      handled = true;
    } else if (command.includes("go to reports") || command.includes("open reports") || command.includes("analytics")) {
      navigate("/admin/reports");
      handled = true;
    } else if (command.includes("go to attendance") || command.includes("open attendance") || command.includes("time tracking")) {
      navigate("/admin/time-tracking");
      handled = true;
    } else if (command.includes("go to staff") || command.includes("open staff") || command.includes("team members")) {
      navigate("/admin/setup/staff");
      handled = true;
    } else if (command.includes("go to settings") || command.includes("open settings") || command.includes("setup")) {
      navigate("/admin/setup");
      handled = true;
    } else if (command.includes("logout") || command.includes("log out") || command.includes("sign out")) {
      navigate("/admin/login");
      handled = true;
    }

    if (handled) {
      toast({
        title: "Fuerte AI",
        description: `Executed: "${command}"`,
      });
      setAwakeState(false);
      resetTranscript();
    } else if (isAwakeRef.current && command.length > 3) {
      // Optional: Give feedback that it heard something but didn't match a command
      // Avoid spamming if it just picked up noise
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={toggleListening}
        className={`h-14 w-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 border-4 border-white ${listening ? 'bg-primary text-white animate-pulse shadow-primary/40' : 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-105'}`}
      >
        {listening ? <Mic className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>
    </div>
  );
}

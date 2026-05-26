import React, { useState, useEffect } from "react";
import { Textarea } from "./textarea";
import { Button } from "./button";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function VoiceTextarea({ value, onChange, className, placeholder, name, ...props }: any) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  const toggleVoiceRecord = () => {
    if (isRecording && recognitionInstance) {
      recognitionInstance.stop();
      setIsRecording(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast("Voice recording is not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }
      if (finalTranscript) {
        onChange({ target: { value: (value ? value + " " + finalTranscript : finalTranscript).trim(), name } });
      }
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    try {
      recognition.start();
      setRecognitionInstance(recognition);
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [recognitionInstance]);

  return (
    <div className="relative">
      <Textarea
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={cn(className, "pb-12")}
        {...props}
      />
      <Button
        size="sm"
        variant={isRecording ? "destructive" : "outline"}
        className="absolute bottom-2 left-2 h-8 rounded-lg gap-2 shadow-sm"
        onClick={toggleVoiceRecord}
        type="button"
      >
        {isRecording ? (
          <>
            <MicOff className="h-4 w-4 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Stop Voice</span>
          </>
        ) : (
          <>
            <Mic className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Voice Input</span>
          </>
        )}
      </Button>
    </div>
  );
}

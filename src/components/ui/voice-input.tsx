import React, { useState, useEffect } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function VoiceInput({ value, onChange, className, placeholder, name, type = "text", ...props }: any) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  
  const valueRef = React.useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

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
        const currentValue = valueRef.current || "";
        const newValue = (currentValue ? currentValue + " " + finalTranscript : finalTranscript).trim();
        valueRef.current = newValue; // Update ref immediately to prevent race conditions on next result
        onChange({ target: { value: newValue, name } });
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
    <div className="relative w-full flex items-center">
      <Input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={cn(className, "pr-8")}
        {...props}
      />
      <Button
        size="icon"
        variant="ghost"
        className="absolute right-1 h-6 w-6 rounded-md hover:bg-transparent"
        onClick={toggleVoiceRecord}
        type="button"
      >
        {isRecording ? (
          <MicOff className="h-3.5 w-3.5 text-destructive animate-pulse" />
        ) : (
          <Mic className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
        )}
      </Button>
    </div>
  );
}

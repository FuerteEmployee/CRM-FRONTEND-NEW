import * as React from "react";
import { cn } from "@/lib/utils";
import { Mic, MicOff } from "lucide-react";
import { Button } from "./button";
import { toast } from "sonner";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  disableVoice?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, disableVoice, ...props }, ref) => {
    const [isRecording, setIsRecording] = React.useState(false);
    const [recognitionInstance, setRecognitionInstance] = React.useState<any>(null);
    const internalRef = React.useRef<HTMLTextAreaElement>(null);

    React.useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    const toggleVoiceRecord = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

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

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = (event: any) => {
        console.error(event.error);
        setIsRecording(false);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          }
        }
        
        if (finalTranscript && internalRef.current) {
          const textareaNode = internalRef.current;
          const currentValue = textareaNode.value;
          const newValue = (currentValue ? currentValue + " " + finalTranscript : finalTranscript).trim();
          
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            "value"
          )?.set;
          
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(textareaNode, newValue);
            textareaNode.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      };

      try {
        recognition.start();
        setRecognitionInstance(recognition);
      } catch (err) {
        console.error(err);
        setIsRecording(false);
      }
    };

    React.useEffect(() => {
      return () => {
        if (recognitionInstance) {
          recognitionInstance.stop();
        }
      };
    }, [recognitionInstance]);

    if (disableVoice) {
      return (
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={internalRef}
          {...props}
        />
      );
    }

    return (
      <div className="relative w-full">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pb-12",
            className
          )}
          ref={internalRef}
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
              <span className="text-[10px] font-bold uppercase tracking-widest">Stop</span>
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Voice</span>
            </>
          )}
        </Button>
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };

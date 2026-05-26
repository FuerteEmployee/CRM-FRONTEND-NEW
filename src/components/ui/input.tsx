import * as React from "react";
import { cn } from "@/lib/utils";
import { Mic, MicOff } from "lucide-react";
import { Button } from "./button";
import { toast } from "sonner";

export interface InputProps extends React.ComponentProps<"input"> {
  disableVoice?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, disableVoice, ...props }, ref) => {
    const [isRecording, setIsRecording] = React.useState(false);
    const [recognitionInstance, setRecognitionInstance] = React.useState<any>(null);
    const internalRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    const isTextType = !type || type === "text" || type === "search" || type === "url" || type === "email";

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
          const inputNode = internalRef.current;
          const currentValue = inputNode.value;
          const newValue = (currentValue ? currentValue + " " + finalTranscript : finalTranscript).trim();
          
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;
          
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(inputNode, newValue);
            inputNode.dispatchEvent(new Event('input', { bubbles: true }));
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

    if (disableVoice || !isTextType) {
      return (
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          ref={internalRef}
          {...props}
        />
      );
    }

    return (
      <div className="relative w-full flex items-center">
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          ref={internalRef}
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
  },
);
Input.displayName = "Input";

export { Input };

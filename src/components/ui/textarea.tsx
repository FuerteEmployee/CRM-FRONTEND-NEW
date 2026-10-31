import * as React from "react";
import { cn } from "@/lib/utils";
import { Mic, MicOff } from "lucide-react";
import { Button } from "./button";
import { appendToField, useDictation } from "@/lib/dictation";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  disableVoice?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, disableVoice, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null);

    React.useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    // Spoken text is appended to whatever is already typed; the field does not need focus.
    const dictation = useDictation((text) => {
      if (internalRef.current) appendToField(internalRef.current, text);
    });

    const toggleVoiceRecord = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dictation.toggle();
    };

    if (disableVoice || props.disabled || props.readOnly) {
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
          variant={dictation.isRecording ? "destructive" : "outline"}
          className="absolute bottom-2 left-2 h-8 rounded-lg gap-2 shadow-sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleVoiceRecord}
          type="button"
        >
          {dictation.isRecording ? (
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

import * as React from "react";
import { cn } from "@/lib/utils";
import { Mic, MicOff } from "lucide-react";
import { Button } from "./button";
import { appendToField, useDictation } from "@/lib/dictation";

export interface InputProps extends React.ComponentProps<"input"> {
  disableVoice?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, disableVoice, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    // Spoken text is appended to whatever is already typed; the field does not need focus.
    // The mic stays on until the user clicks it off.
    const dictation = useDictation((text) => {
      if (internalRef.current) appendToField(internalRef.current, text);
    });

    const toggleVoiceRecord = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dictation.toggle();
    };

    const isTextType = !type || type === "text" || type === "search" || type === "url" || type === "email";

    if (disableVoice || !isTextType || props.disabled || props.readOnly) {
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
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleVoiceRecord}
          type="button"
          title={dictation.isRecording ? "Stop voice typing" : "Voice typing"}
        >
          {dictation.isRecording ? (
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

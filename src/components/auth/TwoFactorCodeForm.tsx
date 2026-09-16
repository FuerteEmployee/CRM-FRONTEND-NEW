import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface TwoFactorCodeFormProps {
  email: string;
  loading: boolean;
  onVerify: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
}

// Pure presentation + local input state — the decision to show this form,
// and whether a code is valid, is made entirely by the backend. This
// component never checks the code itself, it only forwards what the user
// typed to the caller.
export const TwoFactorCodeForm = ({ email, loading, onVerify, onResend, onBack }: TwoFactorCodeFormProps) => {
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length > 0) onVerify(code.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Verify your identity
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code sent to <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="otp-code" className="text-sm font-medium">
          Verification code
        </Label>
        <Input
          id="otp-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="Enter 6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="h-10 bg-muted/40 border-border/60 focus-visible:bg-background transition-colors tracking-widest text-center"
          autoFocus
        />
      </div>

      <Button type="submit" className="w-full h-10 font-semibold gap-2 shadow-sm" disabled={loading || code.length === 0}>
        {loading ? "Verifying..." : (
          <>
            Verify
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={loading}
          className="text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
        >
          Resend code
        </button>
      </div>
    </form>
  );
};

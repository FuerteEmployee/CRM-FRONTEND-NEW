import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Round 29 (S2): one row icon (View / Edit / Delete …) with a tooltip and an
// aria-label. A disabled icon stays visible; its tooltip says why
// ("Pending POs are locked", "No permission", …). A disabled <button> gets no
// pointer events, so the tooltip hangs on a focusable wrapper.
type Props = {
  icon: ComponentType<{ className?: string }>;
  label: string; // e.g. "Edit PO DA/03/26-27"
  tooltip: string; // e.g. "Edit"
  reason?: string | null; // set = disabled, shown as the tooltip
  onClick?: () => void;
  tone?: "default" | "danger" | "success";
  testId?: string;
};

export const ActionIcon = ({ icon: Icon, label, tooltip, reason, onClick, tone = "default", testId }: Props) => {
  const disabled = !!reason;
  const toneClass = disabled ? "" : tone === "danger" ? "hover:text-red-600" : tone === "success" ? "hover:text-emerald-600" : "hover:text-primary";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex" tabIndex={disabled ? 0 : -1} aria-label={disabled ? `${tooltip} — ${reason}` : undefined}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${toneClass} ${disabled ? "pointer-events-none opacity-40" : ""}`}
            aria-label={disabled ? `${label} (${reason})` : label}
            aria-disabled={disabled}
            disabled={disabled}
            data-testid={testId}
            onClick={(e) => { e.stopPropagation(); if (!disabled) onClick?.(); }}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{disabled ? reason : tooltip}</TooltipContent>
    </Tooltip>
  );
};

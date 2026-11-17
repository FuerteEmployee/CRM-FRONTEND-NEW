import { Clock, MessageSquareText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { quickTimeToDate, toLocalInputValue, useReminderSettings } from "@/lib/reminderSettings";

// Pieces every "Set Reminder" form shares, filled from Setup > Settings > Reminders.

/** Quick time buttons ("In 1 hour", "Tomorrow 10:00"…): fill the date/time field. */
export function ReminderQuickTimes({ onPick }: { onPick: (localValue: string) => void }) {
  const { quickTimes } = useReminderSettings();
  if (quickTimes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick reminder times">
      {quickTimes.map((q, i) => (
        <button
          key={`${q.label}-${i}`}
          type="button"
          onClick={() => onPick(toLocalInputValue(quickTimeToDate(q)))}
          className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          <Clock className="h-3 w-3" />
          {q.label}
        </button>
      ))}
    </div>
  );
}

/** "Ready text" dropdown: fills the description (can still be edited). */
export function ReminderReadyText({ onPick }: { onPick: (text: string) => void }) {
  const { texts } = useReminderSettings();
  if (texts.length === 0) return null;
  return (
    <Select value="" onValueChange={(v) => onPick(texts[Number(v)] ?? "")}>
      <SelectTrigger className="h-8 w-auto gap-1.5 rounded-lg text-xs" aria-label="Ready text">
        <MessageSquareText className="h-3.5 w-3.5 text-primary" />
        <SelectValue placeholder="Ready text" />
      </SelectTrigger>
      <SelectContent>
        {texts.map((t, i) => (
          <SelectItem key={`${t}-${i}`} value={String(i)}>{t}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

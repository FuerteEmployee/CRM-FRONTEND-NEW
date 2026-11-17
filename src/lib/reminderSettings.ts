import { useSettings } from "@/context/SettingsContext";
import { usePermissionContext } from "@/context/PermissionContext";

// Setup > Settings > Reminders — what every "Set Reminder" form uses:
// quick time buttons, ready descriptions and who it goes to by default.
// The early alert / repeat / module switches are applied by the server
// (Backend utils/reminderSettings.js + cron/reminderDelivery.js).

export type QuickTimeUnit = "minutes" | "hours" | "days";
export interface QuickTime {
  label: string;
  amount: number;
  unit: QuickTimeUnit;
  /** For "days": the time of day, "HH:mm" (e.g. "Tomorrow 10:00"). Empty = same time as now. */
  at?: string;
}
export type ReminderRelType = "lead" | "customer" | "task" | "credit_note";

export const DEFAULT_QUICK_TIMES: QuickTime[] = [
  { label: "In 30 minutes", amount: 30, unit: "minutes" },
  { label: "In 1 hour", amount: 1, unit: "hours" },
  { label: "In 3 hours", amount: 3, unit: "hours" },
  { label: "Tomorrow 10:00", amount: 1, unit: "days", at: "10:00" },
  { label: "In 3 days", amount: 3, unit: "days", at: "10:00" },
  { label: "Next week", amount: 7, unit: "days", at: "10:00" },
];

export const DEFAULT_REMINDER_TEXTS: string[] = [
  "Call back",
  "Follow up on the quotation",
  "Payment follow-up",
  "Send details on WhatsApp",
  "Schedule a meeting",
];

export const REMINDER_MODULES: { type: ReminderRelType; setting: string; label: string }[] = [
  { type: "lead", setting: "reminderModuleLead", label: "Lead reminders" },
  { type: "customer", setting: "reminderModuleCustomer", label: "Customer reminders" },
  { type: "task", setting: "reminderModuleTask", label: "Task reminders" },
  { type: "credit_note", setting: "reminderModuleCreditNote", label: "Credit Note reminders" },
];

const isQuickTime = (q: any): q is QuickTime =>
  q && typeof q.label === "string" && q.label.trim() !== "" && Number(q.amount) > 0 && ["minutes", "hours", "days"].includes(q.unit);

/** A setting saved as a list (JSON), else the default when it was never saved. */
export const readQuickTimes = (raw: unknown): QuickTime[] =>
  Array.isArray(raw) ? raw.filter(isQuickTime).map((q) => ({ ...q, amount: Number(q.amount) })) : DEFAULT_QUICK_TIMES;
export const readReminderTexts = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.map((t) => String(t ?? "").trim()).filter(Boolean) : DEFAULT_REMINDER_TEXTS;
const readBool = (raw: unknown, dflt: boolean) => (raw === true || raw === "true" ? true : raw === false || raw === "false" ? false : dflt);

/** The date a quick button means, from `now`. */
export const quickTimeToDate = (q: QuickTime, now = new Date()): Date => {
  const d = new Date(now.getTime());
  if (q.unit === "minutes") d.setMinutes(d.getMinutes() + q.amount);
  else if (q.unit === "hours") d.setHours(d.getHours() + q.amount);
  else {
    d.setDate(d.getDate() + q.amount);
    const m = /^(\d{1,2}):(\d{2})$/.exec(q.at || "");
    if (m) d.setHours(Math.min(23, Number(m[1])), Math.min(59, Number(m[2])), 0, 0);
  }
  d.setSeconds(0, 0);
  return d;
};

/** "YYYY-MM-DDTHH:mm" in local time, for <input type="datetime-local">. */
export const toLocalInputValue = (d: Date | string) => {
  const x = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

export function useReminderSettings() {
  const { getSetting } = useSettings();
  const { user } = usePermissionContext();
  const quickTimes = readQuickTimes(getSetting("reminderQuickTimes", undefined));
  const texts = readReminderTexts(getSetting("reminderTemplates", undefined));
  const defaultStaffMode: "me" | "assigned" = getSetting("reminderDefaultStaff", "me") === "assigned" ? "assigned" : "me";
  const moduleOn = (type: ReminderRelType) => {
    const m = REMINDER_MODULES.find((x) => x.type === type);
    return m ? readBool(getSetting(m.setting, undefined), true) : true;
  };
  /** Who a NEW reminder goes to: me, or the record's assigned staff (falls back to me). */
  const defaultStaff = (assignedStaffId?: string | null) =>
    (defaultStaffMode === "assigned" && assignedStaffId ? String(assignedStaffId) : "") || String(user?._id || "");
  return { quickTimes, texts, defaultStaffMode, moduleOn, defaultStaff };
}

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Clock, Loader2, MessageSquareText, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { settingsService } from "@/api/services/settings.service";
import { useSettings } from "@/context/SettingsContext";
import { usePermissionContext } from "@/context/PermissionContext";
import {
  DEFAULT_QUICK_TIMES,
  DEFAULT_REMINDER_TEXTS,
  REMINDER_MODULES,
  readQuickTimes,
  readReminderTexts,
  type QuickTime,
  type QuickTimeUnit,
} from "@/lib/reminderSettings";

// Setup > Settings > Other > Reminders. Saved per company:
//  - reminderQuickTimes / reminderTemplates / reminderDefaultStaff: the "Set Reminder" forms
//  - reminderBeforeMinutes / reminderRepeat* / reminderModule*: the server's delivery
//    (Backend utils/reminderSettings.js + cron/reminderDelivery.js)
// Only people with Settings > Edit can save (the API checks it too).

const BEFORE_OPTIONS = [0, 5, 10, 15, 30, 60, 120, 1440];
const beforeLabel = (m: number) => (m === 0 ? "Off" : m < 60 ? `${m} minutes before` : m === 60 ? "1 hour before" : m === 1440 ? "1 day before" : `${m / 60} hours before`);
const MAX_ITEMS = 12;

const asBool = (v: unknown, dflt: boolean) => (v === true || v === "true" ? true : v === false || v === "false" ? false : dflt);
const asNum = (v: unknown, dflt: number) => (Number.isFinite(Number(v)) && v !== "" && v != null ? Number(v) : dflt);

export function ReminderSettingsTab() {
  const { getSetting, refreshSettings } = useSettings();
  const { can } = usePermissionContext();
  const canEdit = can("Settings", "Edit");

  const load = () => ({
    quickTimes: readQuickTimes(getSetting("reminderQuickTimes", undefined)),
    texts: readReminderTexts(getSetting("reminderTemplates", undefined)),
    defaultStaff: getSetting("reminderDefaultStaff", "me") === "assigned" ? "assigned" : "me",
    before: asNum(getSetting("reminderBeforeMinutes", 0), 0),
    repeatEnabled: asBool(getSetting("reminderRepeatEnabled", false), false),
    repeatHours: asNum(getSetting("reminderRepeatHours", 2), 2),
    repeatMax: asNum(getSetting("reminderRepeatMax", 3), 3),
    modules: Object.fromEntries(REMINDER_MODULES.map((m) => [m.type, asBool(getSetting(m.setting, true), true)])) as Record<string, boolean>,
  });
  const [form, setForm] = useState(load);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);

  // Settings arrive after the first render on a fresh page load.
  const settingsKey = JSON.stringify([
    getSetting("reminderQuickTimes", null), getSetting("reminderTemplates", null), getSetting("reminderDefaultStaff", null),
    getSetting("reminderBeforeMinutes", null), getSetting("reminderRepeatEnabled", null), getSetting("reminderRepeatHours", null),
    getSetting("reminderRepeatMax", null), ...REMINDER_MODULES.map((m) => getSetting(m.setting, null)),
  ]);
  useEffect(() => {
    setForm(load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey]);

  const set = <K extends keyof ReturnType<typeof load>>(k: K, v: ReturnType<typeof load>[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setQuick = (i: number, patch: Partial<QuickTime>) =>
    set("quickTimes", form.quickTimes.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const save = async () => {
    const quickTimes = form.quickTimes
      .map((q) => ({ ...q, label: q.label.trim(), amount: Math.round(Number(q.amount)), at: q.unit === "days" ? q.at || "" : undefined }))
      .filter((q) => q.label && q.amount > 0);
    const repeatHours = Math.max(0.5, Number(form.repeatHours) || 2);
    const repeatMax = Math.min(10, Math.max(1, Math.round(Number(form.repeatMax) || 3)));
    setSaving(true);
    try {
      await settingsService.updateSettings({
        settings: [
          { name: "reminderQuickTimes", value: JSON.stringify(quickTimes) },
          { name: "reminderTemplates", value: JSON.stringify(form.texts.map((t) => t.trim()).filter(Boolean)) },
          { name: "reminderDefaultStaff", value: form.defaultStaff },
          { name: "reminderBeforeMinutes", value: String(form.before) },
          { name: "reminderRepeatEnabled", value: String(form.repeatEnabled) },
          { name: "reminderRepeatHours", value: String(repeatHours) },
          { name: "reminderRepeatMax", value: String(repeatMax) },
          ...REMINDER_MODULES.map((m) => ({ name: m.setting, value: String(form.modules[m.type] !== false) })),
        ],
      });
      await refreshSettings();
      toast.success("Reminder settings saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save reminder settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Quick time buttons */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Quick time buttons</CardTitle>
          </div>
          <CardDescription>Shown above the date in every "Set Reminder" form. One click fills the date and time.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          {form.quickTimes.length === 0 && <p className="text-sm text-muted-foreground">No buttons — the date is picked by hand.</p>}
          {form.quickTimes.map((q, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
              <div className="space-y-1 flex-1 min-w-[160px]">
                <Label className="text-xs">Button text</Label>
                <Input value={q.label} maxLength={40} onChange={(e) => setQuick(i, { label: e.target.value })} disabled={!canEdit} />
              </div>
              <div className="space-y-1 w-24">
                <Label className="text-xs">After</Label>
                <Input type="number" min={1} value={q.amount} onChange={(e) => setQuick(i, { amount: Number(e.target.value) })} disabled={!canEdit} />
              </div>
              <div className="space-y-1 w-32">
                <Label className="text-xs">Unit</Label>
                <Select value={q.unit} onValueChange={(v) => setQuick(i, { unit: v as QuickTimeUnit })} disabled={!canEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {q.unit === "days" && (
                <div className="space-y-1 w-32">
                  <Label className="text-xs">At (time)</Label>
                  <Input type="time" value={q.at || ""} onChange={(e) => setQuick(i, { at: e.target.value })} disabled={!canEdit} />
                </div>
              )}
              <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Remove ${q.label}`} disabled={!canEdit}
                onClick={() => set("quickTimes", form.quickTimes.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" disabled={!canEdit || form.quickTimes.length >= MAX_ITEMS}
              onClick={() => set("quickTimes", [...form.quickTimes, { label: "In 2 hours", amount: 2, unit: "hours" }])}>
              <Plus className="h-4 w-4" /> Add button
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5" disabled={!canEdit} onClick={() => set("quickTimes", DEFAULT_QUICK_TIMES)}>
              <RotateCcw className="h-4 w-4" /> Reset to default
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Ready texts */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Ready descriptions</CardTitle>
          </div>
          <CardDescription>Picked from the "Ready text" list in the form; the text can still be edited.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          {form.texts.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={t} maxLength={200} disabled={!canEdit}
                onChange={(e) => set("texts", form.texts.map((x, j) => (j === i ? e.target.value : x)))} />
              <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Remove ${t}`} disabled={!canEdit}
                onClick={() => set("texts", form.texts.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input placeholder="New ready text, e.g. Send the brochure" value={newText} maxLength={200} disabled={!canEdit || form.texts.length >= MAX_ITEMS * 2}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newText.trim()) {
                  set("texts", [...form.texts, newText.trim()]);
                  setNewText("");
                }
              }} />
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" disabled={!canEdit || !newText.trim()}
              onClick={() => { set("texts", [...form.texts, newText.trim()]); setNewText(""); }}>
              <Plus className="h-4 w-4" /> Add
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 shrink-0" disabled={!canEdit} onClick={() => set("texts", DEFAULT_REMINDER_TEXTS)}>
              <RotateCcw className="h-4 w-4" /> Default
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3–6. Who, early alert, repeats, modules */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Delivery</CardTitle>
          </div>
          <CardDescription>How and when people are notified (bell + popup).</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>"Set reminder to" by default</Label>
              <Select value={form.defaultStaff} onValueChange={(v) => set("defaultStaff", v as "me" | "assigned")} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="me">Me (the person setting it)</SelectItem>
                  <SelectItem value="assigned">The record's assigned staff</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Assigned = the lead's assigned staff, the task's first assignee, the customer's first Customer Admin. If there is none, it is you.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Early alert</Label>
              <Select value={String(form.before)} onValueChange={(v) => set("before", Number(v))} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BEFORE_OPTIONS.map((m) => <SelectItem key={m} value={String(m)}>{beforeLabel(m)}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">An extra "coming up" notification before the reminder time.</p>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="rem-repeat">Remind again until done</Label>
                <p className="text-xs text-muted-foreground">While a reminder is not marked Completed or Dismissed, notify again.</p>
              </div>
              <Switch id="rem-repeat" checked={form.repeatEnabled} onCheckedChange={(v) => set("repeatEnabled", v)} disabled={!canEdit} />
            </div>
            {form.repeatEnabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Every (hours)</Label>
                  <Input type="number" min={0.5} step={0.5} value={form.repeatHours} onChange={(e) => set("repeatHours", Number(e.target.value))} disabled={!canEdit} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">At most (times, 1–10)</Label>
                  <Input type="number" min={1} max={10} value={form.repeatMax} onChange={(e) => set("repeatMax", Number(e.target.value))} disabled={!canEdit} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Send reminder notifications for</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {REMINDER_MODULES.map((m) => (
                <div key={m.type} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <Label htmlFor={`rem-mod-${m.type}`} className="font-normal">{m.label}</Label>
                  <Switch id={`rem-mod-${m.type}`} checked={form.modules[m.type] !== false} disabled={!canEdit}
                    onCheckedChange={(v) => set("modules", { ...form.modules, [m.type]: v })} />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Turned off: reminders can still be set, but nobody is notified when they are due.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={!canEdit || saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save reminder settings
        </Button>
      </div>
      {!canEdit && <p className="text-xs text-muted-foreground text-right">You can view these settings; changing them needs Settings &gt; Edit permission.</p>}
    </div>
  );
}

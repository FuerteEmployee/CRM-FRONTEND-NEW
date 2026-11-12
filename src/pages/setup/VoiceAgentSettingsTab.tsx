import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AudioLines, CalendarClock, Copy, KeyRound, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { voiceAgentService } from "@/api/services/voiceAgent.service";

type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type Hours = { open: string; close: string } | null;

interface AppointmentSettings {
  slot_minutes: number;
  capacity: number;
  weekly_hours: Record<Day, Hours>;
  breaks: { start: string; end: string }[];
  holidays: string[];
  min_notice_minutes: number;
  max_days_ahead: number;
  reminder_time: string;
  count_calendar_events: boolean;
  whatsapp_template_name: string;
}

interface TokenStatus {
  exists: boolean;
  active?: boolean;
  hint?: string;
  last_used_at?: string | null;
  created_at?: string;
}

const DAYS: { key: Day; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];
const DEFAULT_HOURS = { open: "10:00", close: "19:00" };

// Setup > Settings > Integrations > AI Voice Agent (tenant add-on
// "voice_agent"). Appointment Settings the voice agent books against, plus
// the secret token the company's Pipecat server sends with every request.
export function VoiceAgentSettingsTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AppointmentSettings | null>(null);
  const [newHoliday, setNewHoliday] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [shownToken, setShownToken] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<{ settings: AppointmentSettings; token: TokenStatus }>({
    queryKey: ["voice-agent-settings"],
    queryFn: () => voiceAgentService.getSettings(),
  });

  useEffect(() => {
    if (data?.settings) setForm(data.settings);
  }, [data]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["voice-agent-settings"] });
  const set = <K extends keyof AppointmentSettings>(key: K, value: AppointmentSettings[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const setDay = (day: Day, hours: Hours) => setForm((f) => (f ? { ...f, weekly_hours: { ...f.weekly_hours, [day]: hours } } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await voiceAgentService.saveSettings(form);
      toast.success("Appointment settings saved");
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Couldn't save the settings");
    } finally {
      setSaving(false);
    }
  };

  const generate = async () => {
    setConfirmGenerate(false);
    try {
      const res = await voiceAgentService.generateToken();
      setShownToken(res.token);
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Couldn't create a token");
    }
  };

  const revoke = async () => {
    setConfirmRevoke(false);
    try {
      await voiceAgentService.revokeToken();
      toast.success("Token revoked. The voice agent can't reach the CRM until a new token is set.");
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Couldn't revoke the token");
    }
  };

  const copyToken = async () => {
    if (!shownToken) return;
    try {
      await navigator.clipboard.writeText(shownToken);
      toast.success("Token copied");
    } catch {
      toast.error("Couldn't copy. Select the token and copy it manually.");
    }
  };

  const addHoliday = () => {
    if (!form || !/^\d{4}-\d{2}-\d{2}$/.test(newHoliday)) return;
    if (!form.holidays.includes(newHoliday)) set("holidays", [...form.holidays, newHoliday].sort());
    setNewHoliday("");
  };

  if (isLoading || (!form && !error)) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (error || !form) {
    return <p className="text-sm text-destructive">Couldn't load the voice agent settings. Only company admins can manage them.</p>;
  }

  const token = data?.token;

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Appointment Settings</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            The AI voice agent only offers times that fit these hours. Booked appointments appear in Leads, the Calendar and Reminders.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="va-slot">Appointment length (minutes)</Label>
              <Input id="va-slot" type="number" min={5} max={240} value={form.slot_minutes} onChange={(e) => set("slot_minutes", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="va-capacity">Patients at the same time</Label>
              <Input id="va-capacity" type="number" min={1} max={50} value={form.capacity} onChange={(e) => set("capacity", Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">Number of chairs or rooms. 1 = one patient per time slot.</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-semibold">Opening hours</p>
            <div className="divide-y rounded-md border">
              {DAYS.map(({ key, label }) => {
                const hours = form.weekly_hours[key];
                return (
                  <div key={key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="w-28 font-medium">{label}</div>
                    <Switch
                      checked={Boolean(hours)}
                      onCheckedChange={(open) => setDay(key, open ? hours || DEFAULT_HOURS : null)}
                      aria-label={`${label} open`}
                    />
                    {hours ? (
                      <div className="flex items-center gap-2">
                        <Input type="time" className="w-32" value={hours.open} onChange={(e) => setDay(key, { ...hours, open: e.target.value })} aria-label={`${label} opens`} />
                        <span className="text-muted-foreground">to</span>
                        <Input type="time" className="w-32" value={hours.close} onChange={(e) => setDay(key, { ...hours, close: e.target.value })} aria-label={`${label} closes`} />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Breaks (e.g. lunch)</p>
              <Button variant="outline" size="sm" onClick={() => set("breaks", [...form.breaks, { start: "13:00", end: "14:00" }])}>
                <Plus className="h-4 w-4 mr-1" /> Add break
              </Button>
            </div>
            {form.breaks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No breaks.</p>
            ) : (
              form.breaks.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input type="time" className="w-32" value={b.start} onChange={(e) => set("breaks", form.breaks.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} aria-label="Break starts" />
                  <span className="text-muted-foreground">to</span>
                  <Input type="time" className="w-32" value={b.end} onChange={(e) => set("breaks", form.breaks.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} aria-label="Break ends" />
                  <Button variant="ghost" size="icon" onClick={() => set("breaks", form.breaks.filter((_, j) => j !== i))} aria-label="Remove break">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <p className="font-semibold">Holidays</p>
            <div className="flex items-center gap-2">
              <Input type="date" className="w-44" value={newHoliday} onChange={(e) => setNewHoliday(e.target.value)} aria-label="Holiday date" />
              <Button variant="outline" size="sm" onClick={addHoliday} disabled={!newHoliday}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.holidays.length === 0 && <p className="text-sm text-muted-foreground">No holidays.</p>}
              {form.holidays.map((d) => (
                <Badge key={d} variant="secondary" className="gap-1 pr-1">
                  {d}
                  <button type="button" onClick={() => set("holidays", form.holidays.filter((x) => x !== d))} aria-label={`Remove ${d}`} className="rounded p-0.5 hover:bg-muted">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="va-notice">Minimum notice (minutes)</Label>
              <Input id="va-notice" type="number" min={0} value={form.min_notice_minutes} onChange={(e) => set("min_notice_minutes", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="va-ahead">Book up to (days ahead)</Label>
              <Input id="va-ahead" type="number" min={1} max={365} value={form.max_days_ahead} onChange={(e) => set("max_days_ahead", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="va-reminder">Staff reminder, day before at</Label>
              <Input id="va-reminder" type="time" value={form.reminder_time} onChange={(e) => set("reminder_time", e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Calendar events block a seat</p>
              <p className="text-sm text-muted-foreground">Staff events in the Calendar (e.g. a meeting) take one seat in the slots they overlap.</p>
            </div>
            <Switch checked={form.count_calendar_events} onCheckedChange={(v) => set("count_calendar_events", v)} aria-label="Calendar events block a seat" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="va-template">WhatsApp confirmation template (optional)</Label>
            <Input id="va-template" placeholder="appointment_confirmation" value={form.whatsapp_template_name} onChange={(e) => set("whatsapp_template_name", e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Approved WhatsApp template name, used when a plain message can't be sent (outside WhatsApp's 24-hour window). Body: {"{{1}}"} name,{" "}
              {"{{2}}"} date, {"{{3}}"} time.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save appointment settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <AudioLines className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Voice agent connection</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            The voice agent server uses this secret token to read free slots and book appointments for this company. Put it in the server's{" "}
            <code>CRM_VOICE_TOKEN</code> setting.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {token?.exists ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <span>
                Token ending in <code>…{token.hint}</code>
              </span>
              <Badge variant={token.active ? "default" : "secondary"}>{token.active ? "Active" : "Revoked"}</Badge>
              <span className="text-muted-foreground">
                {token.last_used_at ? `Last used ${new Date(token.last_used_at).toLocaleString()}` : "Not used yet"}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No token yet. Create one to connect the voice agent.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => (token?.exists ? setConfirmGenerate(true) : generate())}>
              <KeyRound className="h-4 w-4 mr-1" /> {token?.exists ? "Create a new token" : "Create token"}
            </Button>
            {token?.exists && token.active && (
              <Button variant="outline" onClick={() => setConfirmRevoke(true)}>
                Revoke token
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmGenerate} onOpenChange={setConfirmGenerate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create a new token?</AlertDialogTitle>
            <AlertDialogDescription>
              The current token stops working right away. The voice agent can't reach the CRM until its server has the new token.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={generate}>Create new token</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke the voice agent token?</AlertDialogTitle>
            <AlertDialogDescription>The voice agent stops booking appointments for this company until you create a new token.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={revoke}>Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(shownToken)} onOpenChange={(open) => !open && setShownToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your new token now</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This is the only time it's shown. Store it in the voice agent server's settings, not in chat or email.</p>
          <code className="block break-all rounded-md border bg-muted/40 px-3 py-2 text-sm">{shownToken}</code>
          <DialogFooter>
            <Button variant="outline" onClick={copyToken}>
              <Copy className="h-4 w-4 mr-1" /> Copy
            </Button>
            <Button onClick={() => setShownToken(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

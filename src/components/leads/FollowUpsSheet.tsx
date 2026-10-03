import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Check, X, CalendarClock, ExternalLink, Phone } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/dateFormat";
import { leadService } from "@/api/services/lead.service";
import { reminderService } from "@/api/services/reminder.service";
import { staffService } from "@/api/services/staff.service";
import { LeadReminderModal, type LeadReminderFormData } from "@/components/leads/LeadReminderModal";

export type FollowUpBucket = "today" | "overdue" | "upcoming";

const toLocalInputValue = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface FollowUpsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: FollowUpBucket;
  onBucketChange: (bucket: FollowUpBucket) => void;
  counts?: { today?: number; overdue?: number; upcoming?: number };
  onOpenLead: (leadId: string) => void;
}

export function FollowUpsSheet({ open, onOpenChange, bucket, onBucketChange, counts, onOpenLead }: FollowUpsSheetProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<LeadReminderFormData>({ date: "", staff: "", description: "", notify_by_email: false });

  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: ["leads", "follow-ups", bucket],
    queryFn: () => leadService.getFollowUps(bucket, 100),
    enabled: open,
  });

  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["staff", "assignable"],
    queryFn: staffService.getAssignable,
    enabled: !!editing,
  });
  const staffOptions = useMemo(
    () => staff.map((s: any) => ({ label: `${s.firstname || ""} ${s.lastname || ""}`.trim() || s.email, value: s._id })),
    [staff]
  );

  const refresh = (leadId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    if (leadId) queryClient.invalidateQueries({ queryKey: ["lead-reminders", leadId] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "complete" | "dismiss"; leadId: string }) =>
      action === "complete" ? reminderService.completeReminder(id) : reminderService.dismissReminder(id),
    onSuccess: (_d, v) => {
      toast.success(v.action === "complete" ? "Follow-up completed" : "Follow-up dismissed");
      refresh(v.leadId);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || "Failed to update reminder"),
  });

  const rescheduleMutation = useMutation({
    mutationFn: () =>
      reminderService.updateReminder(editing._id, {
        date: new Date(form.date).toISOString(),
        staff: form.staff,
        description: form.description,
        notify_by_email: form.notify_by_email,
      }),
    onSuccess: () => {
      toast.success("Follow-up updated");
      refresh(String(editing?.rel_id));
      setEditing(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || "Failed to update reminder"),
  });

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      date: toLocalInputValue(r.date),
      staff: r.staff?._id || r.staff || "",
      description: r.description || "",
      notify_by_email: !!r.notify_by_email,
    });
  };

  const now = Date.now();

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <SheetTitle className="flex items-center gap-2 text-lg font-black">
              <Bell className="h-4 w-4 text-primary" /> Lead Follow-ups
            </SheetTitle>
            <SheetDescription className="text-xs">Pending reminders on leads you can access.</SheetDescription>
            <Tabs value={bucket} onValueChange={(v) => onBucketChange(v as FollowUpBucket)} className="pt-2">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="overdue">Overdue{counts?.overdue ? ` (${counts.overdue})` : ""}</TabsTrigger>
                <TabsTrigger value="today">Today{counts?.today ? ` (${counts.today})` : ""}</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming{counts?.upcoming ? ` (${counts.upcoming})` : ""}</TabsTrigger>
              </TabsList>
            </Tabs>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
            ) : items.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Bell className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-sm text-slate-400 font-medium">No {bucket} follow-ups</p>
              </div>
            ) : (
              items.map((r: any) => {
                const lead = r.lead || {};
                const isLate = bucket === "overdue" || (bucket === "today" && new Date(r.date).getTime() < now);
                const isConfirmed = /^confirm/i.test(lead.status?.name || "");
                const busy = statusMutation.isPending && statusMutation.variables?.id === r._id;
                return (
                  <div
                    key={r._id}
                    className={cn(
                      "rounded-2xl border p-4 space-y-2 bg-white",
                      isLate ? "border-red-200 bg-red-50/30" : "border-slate-200"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onOpenLead(String(lead._id))}
                          className="font-black text-sm text-slate-900 hover:text-primary flex items-center gap-1 truncate"
                        >
                          {lead.name} <ExternalLink className="h-3 w-3 shrink-0" />
                        </button>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {lead.status?.name && (
                            <Badge
                              className="rounded-md text-[9px] font-black uppercase border-none"
                              style={{ backgroundColor: `${lead.status.color || "#64748b"}1a`, color: lead.status.color || "#64748b" }}
                            >
                              {lead.status.name}
                            </Badge>
                          )}
                          {isConfirmed && <Badge className="rounded-md text-[9px] font-black uppercase bg-violet-100 text-violet-700 border-none">Confirmed</Badge>}
                          {lead.phonenumber && (
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {lead.phonenumber}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={cn("text-right text-[11px] font-black shrink-0", isLate ? "text-red-600" : "text-slate-600")}>
                        {formatDateTime(r.date)}
                        {isLate && <div className="text-[9px] uppercase tracking-wider">Overdue</div>}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap">{r.description}</p>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[10px] font-bold text-slate-400">
                        {r.staff ? `Remind: ${r.staff.firstname || ""} ${r.staff.lastname || ""}` : ""}
                      </span>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-black gap-1" onClick={() => openEdit(r)}>
                          <CalendarClock className="h-3.5 w-3.5" /> Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          className="h-8 rounded-lg text-[10px] font-black gap-1 text-slate-500"
                          onClick={() => statusMutation.mutate({ id: r._id, action: "dismiss", leadId: String(lead._id) })}
                        >
                          <X className="h-3.5 w-3.5" /> Dismiss
                        </Button>
                        <Button
                          size="sm"
                          disabled={busy}
                          className="h-8 rounded-lg text-[10px] font-black gap-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => statusMutation.mutate({ id: r._id, action: "complete", leadId: String(lead._id) })}
                        >
                          <Check className="h-3.5 w-3.5" /> Done
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      <LeadReminderModal
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        formData={form}
        setFormData={setForm}
        staffOptions={staffOptions}
        onSave={() => rescheduleMutation.mutate()}
        isPending={rescheduleMutation.isPending}
        isEdit
      />
    </>
  );
}

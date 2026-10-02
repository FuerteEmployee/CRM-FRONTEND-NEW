import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Bell, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/dateFormat";
import { reminderService } from "@/api/services/reminder.service";
import { staffService } from "@/api/services/staff.service";
import { LeadReminderModal, type LeadReminderFormData } from "@/components/leads/LeadReminderModal";
import { useNotificationContext } from "@/context/NotificationContext";
import { toast } from "sonner";

const emptyForm: LeadReminderFormData = { date: "", staff: "", description: "", notify_by_email: false };

// datetime-local expects "YYYY-MM-DDTHH:mm" in local time, not an ISO string.
const toLocalInputValue = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function LeadRemindersTab({ lead }: { lead: any }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LeadReminderFormData>(emptyForm);

  const { data: reminders = [], isLoading } = useQuery<any[]>({
    queryKey: ["lead-reminders", lead._id],
    queryFn: () => reminderService.getReminders(lead._id, "lead"),
  });

  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["staff", "assignable"],
    queryFn: staffService.getAssignable,
  });
  const staffOptions = useMemo(
    () => staff.map((s: any) => ({ label: `${s.firstname || ""} ${s.lastname || ""}`.trim() || s.email, value: s._id })),
    [staff],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["lead-reminders", lead._id] });
    queryClient.invalidateQueries({ queryKey: ["lead-activity-log", lead._id] });
  };

  // The reminderDelivery cron marks isnotified server-side (and may also
  // flip this lead's status to Pending) the moment a reminder fires —
  // refetch this lead's table + the Profile tab's lead data live, instead
  // of only updating on the next unrelated refetch.
  const { socket } = useNotificationContext();
  useEffect(() => {
    if (!socket) return;
    const handler = (payload: any) => {
      if (payload?.relType === "lead" && payload?.relId === lead._id) {
        invalidate();
        queryClient.invalidateQueries({ queryKey: ["leads"] });
      }
    };
    socket.on("reminderDue", handler);
    return () => { socket.off("reminderDue", handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, lead._id]);

  const createMutation = useMutation({
    mutationFn: () =>
      reminderService.createReminder({
        rel_id: lead._id,
        rel_type: "lead",
        date: new Date(form.date).toISOString(),
        staff: form.staff,
        description: form.description,
        notify_by_email: form.notify_by_email,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Reminder set");
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || "Failed to set reminder"),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      reminderService.updateReminder(editingId!, {
        date: new Date(form.date).toISOString(),
        staff: form.staff,
        description: form.description,
        notify_by_email: form.notify_by_email,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Reminder updated");
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update reminder"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reminderService.deleteReminder(id),
    onSuccess: () => {
      invalidate();
      toast.success("Reminder deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete reminder"),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (r: any) => {
    setEditingId(r._id);
    setForm({
      date: toLocalInputValue(r.date),
      staff: r.staff?._id || r.staff,
      description: r.description,
      notify_by_email: !!r.notify_by_email,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">{reminders.length} Reminder{reminders.length === 1 ? "" : "s"}</p>
        <Button
          size="sm"
          onClick={openCreate}
          className="h-9 rounded-xl px-4 font-black uppercase text-[10px] tracking-widest gap-2"
        >
          <Plus className="h-3.5 w-3.5" />
          Set Lead Reminder
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : reminders.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <Bell className="h-8 w-8 mx-auto text-slate-300" />
          <p className="text-sm text-slate-400 font-medium">No reminders set for this lead</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Remind</th>
                <th className="text-left px-4 py-3">Is notified?</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reminders.map((r: any) => (
                <tr key={r._id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => openEdit(r)}>
                  <td className="px-4 py-3 font-bold text-slate-800 max-w-xs truncate">{r.description}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(r.date)}</td>
                  <td className="px-4 py-3 text-slate-600">{r.staff ? `${r.staff.firstname} ${r.staff.lastname}` : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`rounded-lg font-bold text-[10px] ${r.isnotified ? "text-emerald-600 border-emerald-200" : "text-slate-400 border-slate-200"}`}>
                      {r.isnotified ? "Yes" : "No"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Delete this reminder?")) deleteMutation.mutate(r._id);
                        }}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LeadReminderModal
        open={modalOpen}
        onOpenChange={(open) => (open ? setModalOpen(true) : closeModal())}
        formData={form}
        setFormData={setForm}
        staffOptions={staffOptions}
        onSave={() => (editingId ? updateMutation.mutate() : createMutation.mutate())}
        isPending={createMutation.isPending || updateMutation.isPending}
        isEdit={!!editingId}
      />
    </div>
  );
}

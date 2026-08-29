import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell } from "lucide-react";

export interface LeadReminderFormData {
  date: string;
  staff: string;
  description: string;
  notify_by_email: boolean;
}

interface LeadReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: LeadReminderFormData;
  setFormData: (updater: (prev: LeadReminderFormData) => LeadReminderFormData) => void;
  staffOptions: { label: string; value: string }[];
  onSave: () => void;
  isPending: boolean;
  isEdit?: boolean;
}

export function LeadReminderModal({
  open, onOpenChange, formData, setFormData, staffOptions, onSave, isPending, isEdit,
}: LeadReminderModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Header and footer are pinned (shrink-0); only the middle field
          section scrolls (min-h-0 is required for a flex child to shrink
          below its content height and actually become scrollable) — so at
          high browser zoom the form never gets silently clipped, it scrolls. */}
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white">
        <div className="flex flex-col max-h-[calc(100vh-8rem)]">
          <div className="shrink-0 bg-primary/5 px-8 py-6 border-b border-primary/10">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                {isEdit ? "Edit Reminder" : "Set Lead Reminder"}
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-8 space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Date to be notified *
              </Label>
              <Input
                type="datetime-local"
                value={formData.date}
                onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                className="h-11 rounded-xl bg-slate-50/50 border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Set reminder to *
              </Label>
              <Select value={formData.staff} onValueChange={(v) => setFormData((p) => ({ ...p, staff: v }))}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-300">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Description *
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                className="min-h-[100px] rounded-xl bg-slate-50/50 border-slate-300"
              />
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <Checkbox
                id="lead-reminder-email"
                checked={formData.notify_by_email}
                onCheckedChange={(v) => setFormData((p) => ({ ...p, notify_by_email: !!v }))}
              />
              <Label htmlFor="lead-reminder-email" className="text-xs font-black text-slate-700 cursor-pointer">
                Send also an email for this reminder
              </Label>
            </div>
          </div>

          <div className="shrink-0 p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold h-10 px-6">
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={isPending || !formData.date || !formData.staff || !formData.description.trim()}
              className="rounded-xl px-6 h-10 font-black uppercase text-[10px] tracking-widest"
            >
              {isPending ? "Saving..." : "Save Reminder"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

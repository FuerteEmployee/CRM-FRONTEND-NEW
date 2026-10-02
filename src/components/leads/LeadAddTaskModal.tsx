import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { taskService } from "@/api/services/task.service";
import { toast } from "sonner";

const PRIORITY_OPTIONS = [
  { value: "1", label: "Low" },
  { value: "2", label: "Medium" },
  { value: "3", label: "High" },
  { value: "4", label: "Urgent" },
];

interface LeadAddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any;
  staffOptions: { label: string; value: string }[];
}

const emptyForm = { name: "", description: "", duedate: "", priority: "2", assignees: [] as string[] };

export function LeadAddTaskModal({ open, onOpenChange, lead, staffOptions }: LeadAddTaskModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const createMutation = useMutation({
    mutationFn: () =>
      taskService.create({
        name: form.name,
        description: form.description,
        duedate: form.duedate || undefined,
        priority: Number(form.priority),
        assignees: form.assignees,
        related_to: "lead",
        rel_id: lead._id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-tasks", lead._id] });
      queryClient.invalidateQueries({ queryKey: ["lead-activity-log", lead._id] });
      toast.success("Task added");
      setForm(emptyForm);
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to add task"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white">
        {/* Header/footer pinned (shrink-0); only the field section scrolls
            (min-h-0 lets a flex child shrink below its content height and
            actually scroll) — so at high browser zoom the form scrolls
            instead of silently clipping. */}
        <div className="flex flex-col max-h-[calc(100vh-8rem)]">
          <div className="shrink-0 px-8 py-6 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 tracking-tight">Add New Task</DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-8 space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Title *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="h-11 rounded-xl bg-slate-50/50 border-slate-300"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="min-h-[80px] rounded-xl bg-slate-50/50 border-slate-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Due Date</Label>
                <Input
                  type="date"
                  value={form.duedate}
                  onChange={(e) => setForm((p) => ({ ...p, duedate: e.target.value }))}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assignees</Label>
              <SearchableSelect
                options={staffOptions}
                value={form.assignees}
                onValueChange={(v) => setForm((p) => ({ ...p, assignees: v }))}
                multiple
                placeholder="Select assignees"
                className="h-11 rounded-xl border-slate-300"
              />
            </div>
          </div>
          <div className="shrink-0 p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold h-10 px-6">
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.name.trim() || createMutation.isPending}
              className="rounded-xl px-6 h-10 font-black uppercase text-[10px] tracking-widest"
            >
              {createMutation.isPending ? "Saving..." : "Save Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

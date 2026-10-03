import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Plus, CheckSquare } from "lucide-react";
import { formatDate } from "@/lib/dateFormat";
import { taskService } from "@/api/services/task.service";
import { staffService } from "@/api/services/staff.service";
import { TaskViewModal } from "@/components/tasks/TaskViewModal";
import { LeadAddTaskModal } from "@/components/leads/LeadAddTaskModal";

const STATUS_LABELS: Record<number, { label: string; className: string }> = {
  1: { label: "Not Started", className: "bg-slate-100 text-slate-600" },
  2: { label: "Awaiting Feedback", className: "bg-amber-500/10 text-amber-600" },
  3: { label: "Testing", className: "bg-purple-500/10 text-purple-600" },
  4: { label: "In Progress", className: "bg-blue-500/10 text-blue-600" },
  5: { label: "Complete", className: "bg-emerald-500/10 text-emerald-600" },
};
const PRIORITY_LABELS: Record<number, string> = { 1: "Low", 2: "Medium", 3: "High", 4: "Urgent" };

export function LeadTasksTab({ lead }: { lead: any }) {
  const [addOpen, setAddOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<any>(null);

  const { data: tasks = [], isLoading } = useQuery<any[]>({
    queryKey: ["lead-tasks", lead._id],
    queryFn: () => taskService.getAll({ rel_id: lead._id, rel_type: "lead" }),
  });

  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["staff", "assignable"],
    queryFn: staffService.getAssignable,
  });
  const staffOptions = useMemo(
    () => staff.map((s: any) => ({ label: `${s.firstname || ""} ${s.lastname || ""}`.trim() || s.email, value: s._id })),
    [staff],
  );
  const staffById = useMemo(() => new Map(staff.map((s: any) => [s._id, s])), [staff]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">{tasks.length} Task{tasks.length === 1 ? "" : "s"}</p>
        <Button
          size="sm"
          onClick={() => setAddOpen(true)}
          className="h-9 rounded-xl px-4 font-black uppercase text-[10px] tracking-widest gap-2"
        >
          <Plus className="h-3.5 w-3.5" />
          Add New Task
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <CheckSquare className="h-8 w-8 mx-auto text-slate-300" />
          <p className="text-sm text-slate-400 font-medium">No tasks yet for this lead</p>
        </div>
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t: any) => {
                const status = STATUS_LABELS[t.status] ?? STATUS_LABELS[1];
                const assignedNames = (t.assignees || [])
                  .map((id: string) => staffById.get(id))
                  .filter(Boolean)
                  .map((s: any) => `${s.firstname} ${s.lastname}`.trim())
                  .join(", ");
                return (
                  <TableRow
                    key={t._id}
                    className="cursor-pointer"
                    onClick={() => setViewingTask(t)}
                  >
                    <TableCell><span className="font-semibold">{t.name}</span></TableCell>
                    <TableCell>{assignedNames || "—"}</TableCell>
                    <TableCell>{t.duedate ? formatDate(t.duedate) : "—"}</TableCell>
                    <TableCell>{PRIORITY_LABELS[t.priority] || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`rounded-lg font-bold ${status.className}`}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <LeadAddTaskModal open={addOpen} onOpenChange={setAddOpen} lead={lead} staffOptions={staffOptions} />
      {viewingTask && (
        <TaskViewModal
          isOpen={!!viewingTask}
          onClose={() => setViewingTask(null)}
          task={viewingTask}
          staffOptions={staffOptions}
        />
      )}
    </div>
  );
}

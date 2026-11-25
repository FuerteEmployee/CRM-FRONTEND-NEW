// Project > View: the data for every tab (Tasks, Timesheets, Milestones, Files,
// Discussions, Gantt, Tickets, Contracts, Sales, Notes, Activity).
// Each tab loads its own data when it is opened, so it is always current.
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/components/ui/table";
import { Plus, Trash2, Upload, Paperclip, MessageSquare, ChevronLeft, Send, Pencil, X } from "lucide-react";
import { apiClient } from "@/api/client";
import { taskService } from "@/api/services/task.service";
import { fileService } from "@/api/services/file.service";
import { noteService } from "@/api/services/note.service";
import { contractService } from "@/api/services/contract.service";
import { supportService } from "@/api/services/support.service";
import { salesService } from "@/api/services/sales.service";
import { estimateService } from "@/api/services/estimate.service";
import { TaskViewModal } from "@/components/tasks/TaskViewModal";
import { InquiryOutcomeDialog } from "@/components/tasks/InquiryOutcomeDialog";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/CurrencyContext";
import { formatDate, formatDateTime } from "@/lib/dateFormat";
import { cn } from "@/lib/utils";

// ── Shared ────────────────────────────────────────────────────────────────

// Same ids as the Tasks module (Backend models/Task.js).
export const TASK_STATUSES = [
  { id: 1, label: "Not Started", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: 2, label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: 3, label: "Testing", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: 4, label: "Awaiting Feedback", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { id: 5, label: "Complete", color: "bg-green-50 text-green-700 border-green-200" },
];
const PRIORITY_LABELS: Record<number, string> = { 1: "Low", 2: "Medium", 3: "High", 4: "Urgent" };

const listOf = (r: any): any[] => {
  if (Array.isArray(r)) return r;
  if (Array.isArray(r?.data)) return r.data;
  if (Array.isArray(r?.data?.data)) return r.data.data;
  return [];
};

const idOf = (v: any): string => String(v && typeof v === "object" ? v._id ?? "" : v ?? "");

const personName = (p: any): string =>
  p && typeof p === "object" ? `${p.firstname || ""} ${p.lastname || ""}`.trim() || p.email || "" : "";

const fileUrl = (attachmentKey: string) => {
  const apiBase = (import.meta.env.VITE_API_URL as string) || "/api";
  return `${apiBase.replace(/\/api\/?$/, "")}/uploads/${attachmentKey}`;
};

const errText = (err: any) => err?.response?.data?.message || err?.message || "Something went wrong";

const Loading = () => (
  <div className="space-y-2">
    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
  </div>
);

const ErrorBox = ({ error }: { error: any }) => (
  <Card className="rounded-2xl border-red-200 bg-red-50">
    <CardContent className="p-6 text-sm text-red-700">
      {error?.status === 403 ? "You don't have permission to see this." : `Could not load: ${errText(error)}`}
    </CardContent>
  </Card>
);

/** Staff id → name, from the assignable staff list. */
export const useStaffNames = (staff: any[]) =>
  useMemo(() => {
    const map = new Map<string, string>();
    staff.forEach((s: any) => map.set(String(s._id), personName(s)));
    return map;
  }, [staff]);

// ── Tasks ─────────────────────────────────────────────────────────────────

export function ProjectTasksTab({
  tasks,
  isLoading,
  staff,
  readOnly,
}: {
  tasks: any[];
  isLoading: boolean;
  staff: any[];
  readOnly?: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const staffNames = useStaffNames(staff);
  const [viewId, setViewId] = useState<string | null>(null);
  const [outcomeTask, setOutcomeTask] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const staffOptions = useMemo(
    () => staff.map((s: any) => ({ label: personName(s), value: s._id })),
    [staff]
  );

  // The modal always gets the task from the freshly loaded list, so a status
  // change made inside it (or anywhere else) shows up straight away.
  const viewTask = useMemo(() => {
    const t = tasks.find((x: any) => x._id === viewId);
    return t ? { ...t, displayStatus: t.status || 1, displayPriority: t.priority || 2, isTodo: false } : null;
  }, [tasks, viewId]);

  const statusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => taskService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-activity"] });
      toast({ title: "Task status updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: errText(err), variant: "destructive" }),
  });

  const changeStatus = (task: any, status: number) => {
    if (status === Number(task.status)) return;
    // An Inquiry task can only be completed as Won or Lost (same rule as the Tasks page).
    if (status === 5 && task.category === "Inquiry") {
      setOutcomeTask(task);
      return;
    }
    statusMutation.mutate({ id: task._id, data: { status } });
  };

  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    tasks.forEach((t: any) => { const s = Number(t.status) || 1; c[s] = (c[s] || 0) + 1; });
    return c;
  }, [tasks]);

  const shown = statusFilter === "all" ? tasks : tasks.filter((t: any) => String(Number(t.status) || 1) === statusFilter);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {TASK_STATUSES.map((s) => (
          <button
            key={s.id}
            onClick={() => setStatusFilter(statusFilter === String(s.id) ? "all" : String(s.id))}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              statusFilter === String(s.id) ? "border-primary bg-primary/5" : "border-border/50 hover:bg-muted/40"
            )}
          >
            <p className="text-lg font-black">{counts[s.id] || 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              {["Name", "Status", "Priority", "Assignees", "Created By", "Start Date", "Due Date"].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableEmpty colSpan={7}>No tasks linked to this project yet.</TableEmpty>
            ) : (
              shown.map((t: any) => {
                const statusId = Number(t.status) || 1;
                const status = TASK_STATUSES.find((s) => s.id === statusId) || TASK_STATUSES[0];
                const assignees = (t.assignees || [])
                  .map((a: any) => staffNames.get(idOf(a)) || personName(a))
                  .filter(Boolean)
                  .join(", ");
                return (
                  <TableRow key={t._id} className="cursor-pointer" onClick={() => setViewId(t._id)}>
                    <TableCell className="font-medium text-primary hover:underline">{t.name}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {readOnly ? (
                        <Badge variant="outline" className={cn("font-bold", status.color)}>{status.label}</Badge>
                      ) : (
                        <Select value={String(statusId)} onValueChange={(v) => changeStatus(t, Number(v))}>
                          <SelectTrigger className={cn("h-8 w-[160px] rounded-lg text-xs font-bold border", status.color)}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TASK_STATUSES.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{PRIORITY_LABELS[t.priority] || "Medium"}</TableCell>
                    <TableCell className="text-muted-foreground">{assignees || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{t.created_by_name || staffNames.get(idOf(t.created_by)) || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{t.startdate ? formatDate(t.startdate) : "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{t.duedate ? formatDate(t.duedate) : "-"}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {viewTask && (
        <TaskViewModal
          isOpen={!!viewTask}
          onClose={() => setViewId(null)}
          task={viewTask}
          staffOptions={staffOptions}
        />
      )}
      <InquiryOutcomeDialog
        isOpen={!!outcomeTask}
        onClose={() => setOutcomeTask(null)}
        taskName={outcomeTask?.name}
        onSelect={(outcome: "Won" | "Lost") => {
          if (outcomeTask) statusMutation.mutate({ id: outcomeTask._id, data: { status: 5, inquiry_outcome: outcome } });
          setOutcomeTask(null);
        }}
      />
    </div>
  );
}

// ── Timesheets ────────────────────────────────────────────────────────────

const formatHM = (hoursFloat: number): string => {
  const totalMinutes = Math.round((hoursFloat || 0) * 60);
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
};

export function ProjectTimesheetsTab({ entries, tasks, staff }: { entries: any[]; tasks: any[]; staff: any[] }) {
  const staffNames = useStaffNames(staff);
  const taskNames = useMemo(() => new Map(tasks.map((t: any) => [String(t._id), t.name])), [tasks]);
  const total = entries.reduce((s: number, e: any) => s + (Number(e.hours) || 0), 0);
  const billable = entries.filter((e: any) => e.billable).reduce((s: number, e: any) => s + (Number(e.hours) || 0), 0);
  const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <Card className="rounded-xl"><CardContent className="p-4"><p className="text-lg font-black">{formatHM(total)}</p><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Logged</p></CardContent></Card>
        <Card className="rounded-xl"><CardContent className="p-4"><p className="text-lg font-black">{formatHM(billable)}</p><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Billable</p></CardContent></Card>
      </div>
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              {["Member", "Task", "Date", "Time (h:m)", "Billable"].map((h) => <TableHead key={h}>{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableEmpty colSpan={5}>No time logged on this project yet. Start a task's timer to log time.</TableEmpty>
            ) : (
              sorted.map((e: any) => (
                <TableRow key={e._id}>
                  <TableCell>{staffNames.get(String(e.member)) || e.member || staffNames.get(idOf(e.created_by)) || "-"}</TableCell>
                  <TableCell>{taskNames.get(String(e.task)) || e.task || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.date ? formatDate(e.date) : "-"}</TableCell>
                  <TableCell className="font-bold">{formatHM(Number(e.hours) || 0)}</TableCell>
                  <TableCell className="text-muted-foreground">{e.billable ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

// ── Milestones ────────────────────────────────────────────────────────────

const emptyMilestone = { name: "", description: "", due_date: "", milestone_order: "0" };

export function ProjectMilestonesTab({ projectId, readOnly }: { projectId: string; readOnly?: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyMilestone);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const key = ["project-milestones", projectId];

  const { data: milestones = [], isLoading, error } = useQuery<any[]>({
    queryKey: key,
    queryFn: () => apiClient.get(`/milestones?project=${projectId}`).then(listOf),
  });

  const done = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ["project-activity", projectId] });
  };
  const close = () => { setForm(emptyMilestone); setEditingId(null); setShowForm(false); };

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, milestone_order: Number(form.milestone_order) || 0, due_date: form.due_date || null, project: projectId };
      return editingId ? apiClient.put(`/milestones/${editingId}`, payload) : apiClient.post("/milestones", payload);
    },
    onSuccess: () => { done(); toast({ title: editingId ? "Milestone updated" : "Milestone created" }); close(); },
    onError: (err: any) => toast({ title: "Error", description: errText(err), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/milestones/${id}`),
    onSuccess: () => { done(); toast({ title: "Milestone deleted" }); },
    onError: (err: any) => toast({ title: "Error", description: errText(err), variant: "destructive" }),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex justify-end">
          <Button size="sm" className="rounded-xl gap-2" onClick={() => { setForm(emptyMilestone); setEditingId(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> New Milestone
          </Button>
        </div>
      )}

      {showForm && (
        <Card className="rounded-2xl">
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold">Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-bold">Due Date</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
              </div>
              <div>
                <Label className="text-xs font-bold">Order</Label>
                <Input type="number" value={form.milestone_order} onChange={(e) => setForm((p) => ({ ...p, milestone_order: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={close}>Cancel</Button>
              <Button
                size="sm"
                disabled={save.isPending}
                onClick={() => {
                  if (!form.name.trim()) return toast({ title: "Name is required", variant: "destructive" });
                  save.mutate();
                }}
              >
                {save.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              {["#", "Name", "Description", "Due Date", "Created", ""].map((h, i) => <TableHead key={i}>{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.length === 0 ? (
              <TableEmpty colSpan={6}>No milestones yet.</TableEmpty>
            ) : (
              milestones.map((m: any) => (
                <TableRow key={m._id}>
                  <TableCell className="text-muted-foreground">{m.milestone_order ?? 0}</TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[320px] truncate">{m.description || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{m.due_date ? formatDate(m.due_date) : "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(m.datecreated || m.createdAt)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {!readOnly && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingId(m._id);
                            setForm({
                              name: m.name || "",
                              description: m.description || "",
                              due_date: m.due_date ? String(m.due_date).slice(0, 10) : "",
                              milestone_order: String(m.milestone_order ?? 0),
                            });
                            setShowForm(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => { if (window.confirm(`Delete milestone "${m.name}"?`)) remove.mutate(m._id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

// ── Files ─────────────────────────────────────────────────────────────────

export function ProjectFilesTab({ projectId, readOnly }: { projectId: string; readOnly?: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const key = ["project-files", projectId];

  const { data: files = [], isLoading, error } = useQuery<any[]>({
    queryKey: key,
    queryFn: () => fileService.getFiles(projectId, "project").then(listOf),
  });

  const upload = useMutation({
    mutationFn: (list: File[]) => fileService.uploadFiles(projectId, "project", list),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ["project-activity", projectId] });
      toast({ title: "Files uploaded" });
    },
    onError: (err: any) => toast({ title: "Upload failed", description: errText(err), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => fileService.deleteFile(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: "File deleted" }); },
    onError: (err: any) => toast({ title: "Error", description: errText(err), variant: "destructive" }),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  return (
    <div className="space-y-4">
      {!readOnly && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const list = Array.from(e.target.files || []);
              if (list.length) upload.mutate(list);
              e.target.value = "";
            }}
          />
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const list = Array.from(e.dataTransfer.files || []);
              if (list.length) upload.mutate(list);
            }}
            className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-bold text-muted-foreground">
              {upload.isPending ? "Uploading..." : "Drop files here or click to upload"}
            </span>
          </div>
        </>
      )}

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              {["File", "Type", "Uploaded By", "Date", ""].map((h, i) => <TableHead key={i}>{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.length === 0 ? (
              <TableEmpty colSpan={5}>No files uploaded to this project.</TableEmpty>
            ) : (
              files.map((f: any) => (
                <TableRow key={f._id}>
                  <TableCell>
                    <a href={fileUrl(f.attachment_key)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline font-medium">
                      <Paperclip className="h-4 w-4 shrink-0" /> {f.file_name}
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{f.filetype || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{personName(f.addedfrom) || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(f.dateadded || f.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {!readOnly && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (window.confirm(`Delete "${f.file_name}"?`)) remove.mutate(f._id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

// ── Discussions ───────────────────────────────────────────────────────────

export function ProjectDiscussionsTab({ projectId, currentUserId, isAdmin }: { projectId: string; currentUserId?: string; isAdmin?: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const key = ["project-discussions", projectId];
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ subject: "", description: "" });
  const [comment, setComment] = useState("");

  const { data: discussions = [], isLoading, error } = useQuery<any[]>({
    queryKey: key,
    queryFn: () => apiClient.get(`/project-discussions?project=${projectId}`).then(listOf),
  });
  const open = discussions.find((d: any) => d._id === openId);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ["project-activity", projectId] });
  };

  const create = useMutation({
    mutationFn: () => apiClient.post("/project-discussions", { ...newForm, project: projectId }),
    onSuccess: (d: any) => { refresh(); setShowNew(false); setNewForm({ subject: "", description: "" }); setOpenId(d?._id || null); },
    onError: (err: any) => toast({ title: "Error", description: errText(err), variant: "destructive" }),
  });
  const addComment = useMutation({
    mutationFn: () => apiClient.post(`/project-discussions/${openId}/comments`, { text: comment }),
    onSuccess: () => { refresh(); setComment(""); },
    onError: (err: any) => toast({ title: "Error", description: errText(err), variant: "destructive" }),
  });
  const deleteComment = useMutation({
    mutationFn: (commentId: string) => apiClient.delete(`/project-discussions/${openId}/comments/${commentId}`),
    onSuccess: refresh,
    onError: (err: any) => toast({ title: "Error", description: errText(err), variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/project-discussions/${id}`),
    onSuccess: () => { refresh(); setOpenId(null); toast({ title: "Discussion deleted" }); },
    onError: (err: any) => toast({ title: "Error", description: errText(err), variant: "destructive" }),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  if (open) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <button onClick={() => setOpenId(null)} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                <ChevronLeft className="h-3.5 w-3.5" /> All discussions
              </button>
              <h3 className="text-lg font-black">{open.subject}</h3>
              <p className="text-xs text-muted-foreground">
                Started by {personName(open.created_by) || "Unknown"} · {formatDateTime(open.createdAt)}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (window.confirm("Delete this discussion and all its comments?")) remove.mutate(open._id); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {open.description && <p className="text-sm whitespace-pre-wrap text-foreground/80">{open.description}</p>}

          <div className="space-y-3 border-t pt-4">
            {(open.comments || []).length === 0 && <p className="text-sm text-muted-foreground italic">No comments yet.</p>}
            {(open.comments || []).map((c: any) => (
              <div key={c._id} className="bg-muted/40 rounded-xl p-3 border border-border/50">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{personName(c.added_by) || "Unknown"}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground">{formatDateTime(c.dateadded)}</span>
                    {(isAdmin || idOf(c.added_by) === currentUserId) && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteComment.mutate(c._id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap mt-1">{c.text}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment..." rows={2} className="resize-none" />
            <Button className="self-end gap-1" disabled={!comment.trim() || addComment.isPending} onClick={() => addComment.mutate()}>
              <Send className="h-4 w-4" /> Post
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="rounded-xl gap-2" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" /> New Discussion
        </Button>
      </div>
      {showNew && (
        <Card className="rounded-2xl">
          <CardContent className="p-5 space-y-3">
            <div>
              <Label className="text-xs font-bold">Subject *</Label>
              <Input value={newForm.subject} onChange={(e) => setNewForm((p) => ({ ...p, subject: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs font-bold">Description</Label>
              <Textarea value={newForm.description} onChange={(e) => setNewForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button size="sm" disabled={!newForm.subject.trim() || create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              {["Subject", "Started By", "Comments", "Last Activity"].map((h) => <TableHead key={h}>{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {discussions.length === 0 ? (
              <TableEmpty colSpan={4}>No discussions yet. Start one to talk about this project.</TableEmpty>
            ) : (
              discussions.map((d: any) => (
                <TableRow key={d._id} className="cursor-pointer" onClick={() => setOpenId(d._id)}>
                  <TableCell className="font-medium text-primary flex items-center gap-2"><MessageSquare className="h-4 w-4" /> {d.subject}</TableCell>
                  <TableCell className="text-muted-foreground">{personName(d.created_by) || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{(d.comments || []).length}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(d.last_activity || d.updatedAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

// ── Gantt ─────────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;
const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

export function ProjectGanttTab({ tasks, project }: { tasks: any[]; project: any }) {
  const rows = useMemo(() => {
    return tasks
      .map((t: any) => {
        const startRaw = t.startdate || t.dateadded || t.createdAt;
        if (!startRaw) return null;
        const start = dayStart(new Date(startRaw));
        let end = t.duedate ? dayStart(new Date(t.duedate)) : new Date(start.getTime());
        if (end < start) end = new Date(start.getTime());
        return { task: t, start, end, noDue: !t.duedate };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.start.getTime() - b.start.getTime()) as { task: any; start: Date; end: Date; noDue: boolean }[];
  }, [tasks]);

  if (rows.length === 0) {
    return (
      <Card className="rounded-2xl"><CardContent className="p-10 text-center text-sm text-muted-foreground">No tasks to show on the chart yet.</CardContent></Card>
    );
  }

  const dates = rows.flatMap((r) => [r.start.getTime(), r.end.getTime()]);
  if (project?.start_date) dates.push(dayStart(new Date(project.start_date)).getTime());
  if (project?.deadline) dates.push(dayStart(new Date(project.deadline)).getTime());
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const totalDays = Math.max(Math.round((max - min) / DAY) + 1, 1);
  const pct = (t: number) => ((t - min) / DAY / totalDays) * 100;
  const today = dayStart(new Date()).getTime();
  const showToday = today >= min && today <= max;

  // Month ticks along the top.
  const ticks: { left: number; label: string }[] = [];
  const cursor = new Date(min);
  cursor.setDate(1);
  while (cursor.getTime() <= max) {
    if (cursor.getTime() >= min) ticks.push({ left: pct(cursor.getTime()), label: cursor.toLocaleString(undefined, { month: "short", year: "2-digit" }) });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const barColor: Record<number, string> = { 1: "bg-slate-400", 2: "bg-blue-500", 3: "bg-purple-500", 4: "bg-yellow-500", 5: "bg-green-500" };

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5 space-y-3 overflow-x-auto">
        <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {TASK_STATUSES.map((s) => (
            <span key={s.id} className="flex items-center gap-1"><span className={cn("h-2 w-4 rounded", barColor[s.id])} />{s.label}</span>
          ))}
        </div>
        <div className="min-w-[640px]">
          <div className="flex">
            <div className="w-56 shrink-0" />
            <div className="relative flex-1 h-6 border-b">
              {ticks.map((t, i) => (
                <span key={i} className="absolute text-[10px] font-bold text-muted-foreground" style={{ left: `${t.left}%` }}>{t.label}</span>
              ))}
            </div>
          </div>
          {rows.map(({ task, start, end, noDue }) => {
            const left = pct(start.getTime());
            const width = Math.max(((end.getTime() - start.getTime()) / DAY + 1) / totalDays * 100, 0.8);
            return (
              <div key={task._id} className="flex items-center h-9 border-b border-border/40">
                <div className="w-56 shrink-0 pr-3 text-xs font-medium truncate" title={task.name}>{task.name}</div>
                <div className="relative flex-1 h-full">
                  {showToday && <div className="absolute top-0 bottom-0 w-px bg-red-400" style={{ left: `${pct(today)}%` }} />}
                  <div
                    className={cn("absolute top-2 h-5 rounded-md", barColor[Number(task.status) || 1], noDue && "opacity-60")}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${task.name}: ${formatDate(start.toISOString())} → ${noDue ? "no due date" : formatDate(end.toISOString())}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground">Bars run from each task's start date to its due date. The red line is today. Faded bars have no due date.</p>
      </CardContent>
    </Card>
  );
}

// ── Tickets ───────────────────────────────────────────────────────────────

export function ProjectTicketsTab({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const { data: tickets = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["project-tickets", projectId],
    queryFn: () => supportService.getTickets({ project: projectId }).then(listOf),
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            {["Subject", "Department", "Priority", "Status", "Assigned", "Last Reply", "Created"].map((h) => <TableHead key={h}>{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.length === 0 ? (
            <TableEmpty colSpan={7}>No tickets linked to this project.</TableEmpty>
          ) : (
            tickets.map((t: any) => (
              <TableRow key={t._id} className="cursor-pointer" onClick={() => navigate(`/admin/support/view/${t._id}`)}>
                <TableCell className="font-medium text-primary">{t.subject}</TableCell>
                <TableCell className="text-muted-foreground">{t.department?.name || "-"}</TableCell>
                <TableCell className="text-muted-foreground">{t.priority?.name || "-"}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize font-bold">{String(t.status || "open").replace(/_/g, " ")}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{personName(t.assigned) || "-"}</TableCell>
                <TableCell className="text-muted-foreground">{t.lastreply ? formatDateTime(t.lastreply) : "No reply yet"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(t.date || t.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ── Contracts ─────────────────────────────────────────────────────────────

export function ProjectContractsTab({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const { symbol } = useCurrency();
  const { data: contracts = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["project-contracts", projectId],
    queryFn: () => contractService.getContracts({ project: projectId }).then(listOf),
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            {["Subject", "Customer", "Value", "Start Date", "End Date", "Signature"].map((h) => <TableHead key={h}>{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.length === 0 ? (
            <TableEmpty colSpan={6}>No contracts linked to this project.</TableEmpty>
          ) : (
            contracts.map((c: any) => (
              <TableRow key={c._id} className="cursor-pointer" onClick={() => navigate(`/admin/contracts/view/${c._id}`)}>
                <TableCell className="font-medium text-primary">{c.subject}</TableCell>
                <TableCell className="text-muted-foreground">{c.client?.company || "-"}</TableCell>
                <TableCell>{symbol}{Number(c.contract_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-muted-foreground">{c.datestart ? formatDate(c.datestart) : "-"}</TableCell>
                <TableCell className="text-muted-foreground">{c.dateend ? formatDate(c.dateend) : "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("font-bold", c.is_signed ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-600")}>
                    {c.is_signed ? "Signed" : "Not Signed"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ── Sales ─────────────────────────────────────────────────────────────────

const PROPOSAL_STATUS: Record<number, string> = { 1: "Draft", 2: "Sent", 3: "Open", 4: "Revised", 5: "Declined", 6: "Accepted" };
const titleCase = (s: string) => String(s || "-").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function ProjectSalesTab({ projectId, expenses }: { projectId: string; expenses: any[] }) {
  const navigate = useNavigate();
  const { symbol } = useCurrency();
  const [section, setSection] = useState<"invoices" | "estimates" | "proposals" | "expenses">("invoices");
  const money = (n: any) => `${symbol}${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const invoicesQ = useQuery<any[]>({
    queryKey: ["project-invoices", projectId],
    queryFn: () => salesService.getInvoices({ project: projectId }).then(listOf),
  });
  const estimatesQ = useQuery<any[]>({
    queryKey: ["project-estimates", projectId],
    queryFn: () => estimateService.getEstimates({ project: projectId }).then(listOf),
  });
  const proposalsQ = useQuery<any[]>({
    queryKey: ["project-proposals", projectId],
    queryFn: () => salesService.getProposals({ project: projectId }).then(listOf),
  });

  const sections = [
    { key: "invoices", label: "Invoices", count: (invoicesQ.data || []).length },
    { key: "estimates", label: "Estimates", count: (estimatesQ.data || []).length },
    { key: "proposals", label: "Proposals", count: (proposalsQ.data || []).length },
    { key: "expenses", label: "Expenses", count: expenses.length },
  ] as const;

  const active = { invoices: invoicesQ, estimates: estimatesQ, proposals: proposalsQ, expenses: null }[section];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {sections.map((s) => (
          <Button key={s.key} size="sm" variant={section === s.key ? "default" : "outline"} className="rounded-xl gap-2" onClick={() => setSection(s.key)}>
            {s.label} <Badge variant="secondary" className="rounded-full px-1.5">{s.count}</Badge>
          </Button>
        ))}
      </div>

      {active?.isLoading ? <Loading /> : active?.error ? <ErrorBox error={active.error} /> : (
        <TableContainer>
          <Table>
            {section === "invoices" && (
              <>
                <TableHeader><TableRow>{["Invoice #", "Customer", "Date", "Due Date", "Amount", "Status"].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {(invoicesQ.data || []).length === 0 ? <TableEmpty colSpan={6}>No invoices for this project. Use "Invoice Project" to create one.</TableEmpty> :
                    (invoicesQ.data || []).map((inv: any) => (
                      <TableRow key={inv._id} className="cursor-pointer" onClick={() => navigate(`/admin/invoices/edit/${inv._id}`)}>
                        <TableCell className="font-medium text-primary">{inv.number || inv._id.slice(-6).toUpperCase()}</TableCell>
                        <TableCell className="text-muted-foreground">{inv.client?.company || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{inv.date ? formatDate(inv.date) : "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{inv.duedate ? formatDate(inv.duedate) : "-"}</TableCell>
                        <TableCell className="font-bold">{money(inv.total)}</TableCell>
                        <TableCell><Badge variant="outline" className="font-bold">{titleCase(inv.status)}</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </>
            )}
            {section === "estimates" && (
              <>
                <TableHeader><TableRow>{["Estimate #", "Customer", "Date", "Expiry", "Amount", "Status"].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {(estimatesQ.data || []).length === 0 ? <TableEmpty colSpan={6}>No estimates for this project.</TableEmpty> :
                    (estimatesQ.data || []).map((e: any) => (
                      <TableRow key={e._id} className="cursor-pointer" onClick={() => navigate(`/admin/estimates/edit/${e._id}`)}>
                        <TableCell className="font-medium text-primary">{e.number || e._id.slice(-6).toUpperCase()}</TableCell>
                        <TableCell className="text-muted-foreground">{e.client?.company || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{e.date ? formatDate(e.date) : "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{e.expirydate ? formatDate(e.expirydate) : "-"}</TableCell>
                        <TableCell className="font-bold">{money(e.total)}</TableCell>
                        <TableCell><Badge variant="outline" className="font-bold">{titleCase(e.status)}</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </>
            )}
            {section === "proposals" && (
              <>
                <TableHeader><TableRow>{["Proposal #", "Subject", "To", "Date", "Open Till", "Amount", "Status"].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {(proposalsQ.data || []).length === 0 ? <TableEmpty colSpan={7}>No proposals for this project.</TableEmpty> :
                    (proposalsQ.data || []).map((p: any) => (
                      <TableRow key={p._id} className="cursor-pointer" onClick={() => navigate(`/admin/proposals/edit/${p._id}`)}>
                        <TableCell className="font-medium text-primary">{p.number || `PRO-${p._id.slice(-6).toUpperCase()}`}</TableCell>
                        <TableCell>{p.subject || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{p.proposal_to || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{p.date ? formatDate(p.date) : "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{p.open_till ? formatDate(p.open_till) : "-"}</TableCell>
                        <TableCell className="font-bold">{money(p.total)}</TableCell>
                        <TableCell><Badge variant="outline" className="font-bold">{PROPOSAL_STATUS[Number(p.status)] || titleCase(String(p.status))}</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </>
            )}
            {section === "expenses" && (
              <>
                <TableHeader><TableRow>{["Name", "Category", "Date", "Amount", "Billable", "Invoiced"].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {expenses.length === 0 ? <TableEmpty colSpan={6}>No expenses recorded on this project.</TableEmpty> :
                    expenses.map((e: any) => (
                      <TableRow key={e._id} className="cursor-pointer" onClick={() => navigate(`/admin/expenses/edit/${e._id}`)}>
                        <TableCell className="font-medium text-primary">{e.expense_name || e.name || e.note || "Expense"}</TableCell>
                        <TableCell className="text-muted-foreground">{e.category?.name || (typeof e.category === "string" ? e.category : "-")}</TableCell>
                        <TableCell className="text-muted-foreground">{e.date ? formatDate(e.date) : "-"}</TableCell>
                        <TableCell className="font-bold">{money(e.amount)}</TableCell>
                        <TableCell className="text-muted-foreground">{e.billable ? "Yes" : "No"}</TableCell>
                        <TableCell className="text-muted-foreground">{e.invoiceid ? "Yes" : "No"}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </>
            )}
          </Table>
        </TableContainer>
      )}
    </div>
  );
}

// ── Notes ─────────────────────────────────────────────────────────────────

export function ProjectNotesTab({ projectId, readOnly }: { projectId: string; readOnly?: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const key = ["project-notes", projectId];
  const [text, setText] = useState("");

  const { data: notes = [], isLoading, error } = useQuery<any[]>({
    queryKey: key,
    queryFn: () => noteService.getAll(projectId, "project").then(listOf),
  });

  const create = useMutation({
    mutationFn: () => noteService.create({ description: text.trim(), rel_id: projectId, rel_type: "project" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); setText(""); toast({ title: "Note added" }); },
    onError: (err: any) => toast({ title: "Error", description: errText(err), variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => noteService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (err: any) => toast({ title: "Error", description: errText(err), variant: "destructive" }),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  return (
    <div className="space-y-4">
      {!readOnly && (
        <Card className="rounded-2xl">
          <CardContent className="p-5 space-y-3">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a private note about this project..." rows={3} />
            <div className="flex justify-end">
              <Button size="sm" disabled={!text.trim() || create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? "Saving..." : "Add Note"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {notes.length === 0 ? (
        <Card className="rounded-2xl"><CardContent className="p-10 text-center text-sm text-muted-foreground">No notes yet.</CardContent></Card>
      ) : (
        notes.map((n: any) => (
          <Card key={n._id} className="rounded-2xl">
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-bold text-muted-foreground">
                  {personName(n.addedfrom) || "Unknown"} · {formatDateTime(n.dateadded || n.createdAt)}
                </p>
                <p className="text-sm whitespace-pre-wrap break-words">{n.description}</p>
              </div>
              {!readOnly && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => { if (window.confirm("Delete this note?")) remove.mutate(n._id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ── Activity ──────────────────────────────────────────────────────────────

export function ProjectActivityTab({ projectId }: { projectId: string }) {
  const { data: logs = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["project-activity", projectId],
    queryFn: () => apiClient.get(`/activity-logs?rel_id=${projectId}&rel_type=project`).then(listOf),
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (logs.length === 0) {
    return <Card className="rounded-2xl"><CardContent className="p-10 text-center text-sm text-muted-foreground">No activity yet.</CardContent></Card>;
  }
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <ol className="relative border-l border-border ml-2 space-y-4">
          {logs.map((l: any) => (
            <li key={l._id} className="ml-4">
              <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
              <p className="text-sm font-medium">{l.description}</p>
              <p className="text-xs text-muted-foreground">
                {personName(l.staffid) || "System"} · {formatDateTime(l.date || l.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

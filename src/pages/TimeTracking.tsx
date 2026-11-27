import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Play, Pause, Clock, Timer, BarChart3, Plus, Search, Trash2, Edit } from "lucide-react";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { timeEntryService } from "@/api/services/time_entry.service";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useQuery } from "@tanstack/react-query";
import { projectService } from "@/api/services/project.service";
import { taskService } from "@/api/services/task.service";
import { staffService } from "@/api/services/staff.service";
import { usePermissions } from "@/hooks/usePermissions";

// Project / Task / Member are picked from the CRM's own lists and saved as ids,
// so the time shows up in Reports (Staff Work, Project Work, Customer Work).
// Older entries that were typed as free text still show their text.
const OID = /^[0-9a-f]{24}$/i;
const listOf = (d: any): any[] => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);
const personName = (s: any) => (s ? `${s.firstname || ""} ${s.lastname || ""}`.trim() || s.email || "" : "");

// Today as YYYY-MM-DD in the viewer's timezone (toISOString would give the UTC day).
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const TimeTracking = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState("all");
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any | null>(null);
  const [editItem, setEditItem] = useState<any | null>(null);
  const { toast } = useToast();
  const { user } = usePermissions();
  const me = String(user?._id || "");

  const { data: projectsRaw } = useQuery({ queryKey: ["time-tracking", "projects"], queryFn: () => projectService.getAll() });
  const { data: tasksRaw } = useQuery({ queryKey: ["time-tracking", "tasks"], queryFn: () => taskService.getAll() });
  const { data: staffRaw } = useQuery({ queryKey: ["staff", "assignable"], queryFn: () => staffService.getAssignable() });
  const projectList = listOf(projectsRaw);
  const taskList = listOf(tasksRaw);
  const staffList = listOf(staffRaw);
  const projectById = new Map(projectList.map((p: any) => [String(p._id), p]));
  const taskById = new Map(taskList.map((t: any) => [String(t._id), t]));
  const staffById = new Map(staffList.map((s: any) => [String(s._id), s]));
  const projectIdOfTask = (t: any) => (t?.rel_type === "project" && t.rel_id ? String(typeof t.rel_id === "object" ? t.rel_id._id : t.rel_id) : "");
  const projectOptions = projectList.map((p: any) => ({ value: String(p._id), label: p.name }));
  const taskOptionsFor = (projectId: string) =>
    taskList.filter((t: any) => !projectId || projectIdOfTask(t) === projectId).map((t: any) => ({ value: String(t._id), label: t.name }));
  const staffOptions = staffList.map((s: any) => ({ value: String(s._id), label: personName(s) }));
  // Names for an entry (id → name; old free-text entries keep their text).
  const taskName = (v: any) => (OID.test(String(v || "")) ? taskById.get(String(v))?.name || "Task (not visible)" : v || "-");
  const projectIdOf = (e: any) => (OID.test(String(e.project || "")) ? String(e.project) : projectIdOfTask(taskById.get(String(e.task))));
  const projectName = (e: any) => { const id = projectIdOf(e); return id ? projectById.get(id)?.name || "-" : e.project || "-"; };
  const memberName = (e: any) => (OID.test(String(e.member || "")) ? personName(staffById.get(String(e.member))) || "-" : e.member || personName(staffById.get(String(e.created_by))) || "-");

  const [formData, setFormData] = useState({
    task: "",
    project: "",
    member: "",
    hours: "",
    billable: "no",
    date: localToday()
  });

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const data = await timeEntryService.getTimeEntries();
      setEntries(data || []);
    } catch (error) {
      console.error("Failed to fetch time entries:", error);
    } finally {
      setLoading(false);
    }
  };

  // Closing the Log form (saved, ✕, Esc or outside click) always starts the next one blank.
  const closeAddForm = () => {
    setIsAddOpen(false);
    setFormData({
      task: "", project: "", member: me, hours: "", billable: "no", date: localToday()
    });
  };

  // Same rules for Log and Edit (the backend enforces them too).
  const validateEntry = (entry: { task?: string; hours?: string | number; date?: string }) => {
    if (!String(entry.task || "").trim() || entry.hours === "" || entry.hours == null || !entry.date) {
      return "Please choose the task and fill hours and date";
    }
    const hours = Number(entry.hours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      return "Hours must be more than 0 and at most 24";
    }
    return null;
  };

  const handleCreate = async () => {
    const error = validateEntry(formData);
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      return;
    }
    try {
      const payload = {
        ...formData,
        task: formData.task.trim(),
        member: formData.member || me,
        project: formData.project || projectIdOfTask(taskById.get(formData.task)) || undefined,
        hours: Number(formData.hours),
        billable: formData.billable === "yes"
      };
      await timeEntryService.createTimeEntry(payload);
      toast({ title: "Created", description: "Time entry logged." });
      closeAddForm();
      fetchEntries();
    } catch (error) {
      toast({ title: "Error", description: "Failed to log time.", variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    const error = validateEntry(editItem);
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
      return;
    }
    try {
      const payload = {
        ...editItem,
        task: String(editItem.task).trim(),
        hours: Number(editItem.hours),
        billable: editItem.billable === "yes" || editItem.billable === true
      };
      await timeEntryService.updateTimeEntry(editItem._id, payload);
      toast({ title: "Updated", description: "Time entry updated." });
      setIsEditOpen(false);
      setEditItem(null);
      fetchEntries();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await timeEntryService.deleteTimeEntry(id);
      toast({ title: "Deleted", description: "Time entry deleted." });
      fetchEntries();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  // Project names typed with different capitals ("Alpha"/"alpha") are one project.
  const projectKey = (p?: string) => String(p || "").trim().toLowerCase();
  const projectNames = new Map<string, string>();
  entries.forEach((t) => {
    const name = projectName(t);
    const key = projectKey(name === "-" ? "" : name);
    if (key && !projectNames.has(key)) projectNames.set(key, name);
  });
  const projects = ["all", ...projectNames.keys()];

  const filtered = entries.filter((t) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [taskName(t.task), projectName(t), memberName(t)].some((v) => String(v || "").toLowerCase().includes(q));
    const matchesProject = projectFilter === "all" || projectKey(projectName(t)) === projectFilter;
    return matchesSearch && matchesProject;
  });

  // Cards follow the current search/project filter.
  const sumHours = (list: any[]) => list.reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  const totalHours = sumHours(filtered);
  // Entry dates are saved as the picked calendar day (UTC midnight), so compare
  // against the viewer's local calendar day, not the UTC one.
  const todayHours = sumHours(filtered.filter((t) => t.date && t.date.startsWith(localToday())));

  // simple week calculation (last 7 days)
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const weekHours = sumHours(filtered.filter((t) => t.date && new Date(t.date) >= lastWeek));

  const billableHours = sumHours(filtered.filter((t) => t.billable));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Time Tracking</h1><p className="text-muted-foreground">Track time spent on projects and tasks</p></div>
          <Dialog open={isAddOpen} onOpenChange={(open) => (open ? setIsAddOpen(true) : closeAddForm())}>
            <DialogTrigger asChild><Button className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"><Plus className="h-4 w-4" />Log Time</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Time Entry</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2"><Label>Project</Label>
                  <SearchableSelect options={projectOptions} value={formData.project} placeholder="Any project" onValueChange={(v) => setFormData({ ...formData, project: v || "", task: "" })} />
                </div>
                <div className="space-y-2"><Label>Task *</Label>
                  <SearchableSelect options={taskOptionsFor(formData.project)} value={formData.task} placeholder="What did you work on?" onValueChange={(v) => setFormData({ ...formData, task: v || "", project: formData.project || projectIdOfTask(taskById.get(String(v))) })} />
                </div>
                <div className="space-y-2"><Label>Member</Label>
                  <SearchableSelect options={staffOptions} value={formData.member || me} placeholder="Who did the work" onValueChange={(v) => setFormData({ ...formData, member: v || me })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Hours *</Label><Input type="number" placeholder="0" step="0.5" value={formData.hours} onChange={e => setFormData({...formData, hours: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Date *</Label><Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                </div>
                <div className="space-y-2"><Label>Billable</Label>
                  <Select value={formData.billable} onValueChange={v => setFormData({...formData, billable: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select>
                </div>
                <Button className="w-full" onClick={handleCreate}>Log Entry</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{todayHours.toFixed(1)}h</p><p className="text-xs text-muted-foreground">Today</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-info/10"><Timer className="h-5 w-5 text-info" /></div><div><p className="text-2xl font-bold">{weekHours.toFixed(1)}h</p><p className="text-xs text-muted-foreground">Last 7 Days</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><BarChart3 className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p><p className="text-xs text-muted-foreground">Total</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div><div><p className="text-2xl font-bold">{billableHours.toFixed(1)}h</p><p className="text-xs text-muted-foreground">Billable</p></div></CardContent></Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search entries..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <Select value={projectFilter} onValueChange={setProjectFilter}><SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p} value={p}>{p === "all" ? "All Projects" : projectNames.get(p)}</SelectItem>)}</SelectContent></Select>
        </div>

        <TableContainer>
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableEmpty colSpan={7}>Loading...</TableEmpty>
                  ) : filtered.length === 0 ? (
                    <TableEmpty colSpan={7}>No entries found.</TableEmpty>
                  ) : filtered.map((entry) => (
                    <TableRow key={entry._id}>
                      <TableCell className="font-medium">{taskName(entry.task)}</TableCell>
                      <TableCell className="text-muted-foreground">{projectName(entry)}</TableCell>
                      <TableCell className="text-muted-foreground">{memberName(entry)}</TableCell>
                      <TableCell>{entry.hours}h</TableCell>
                      <TableCell><Badge variant="outline" className={entry.billable ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>{entry.billable ? "Yes" : "No"}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{entry.date ? formatDate(entry.date) : "-"}</TableCell>
                      <TableCell>
                        <TableActions 
                          onView={() => setViewItem(entry)} 
                          onEdit={() => {
                            setEditItem({
                              ...entry,
                              date: entry.date ? entry.date.split("T")[0] : "",
                              billable: entry.billable ? "yes" : "no"
                            });
                            setIsEditOpen(true);
                          }} 
                          onDelete={() => handleDelete(entry._id)} 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
        </TableContainer>
      </div>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Time Entry Details</DialogTitle></DialogHeader>
          {viewItem && (<div className="space-y-3 pt-2"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><p className="text-xs text-muted-foreground">Task</p><p className="text-sm font-medium">{taskName(viewItem.task)}</p></div>
            <div><p className="text-xs text-muted-foreground">Project</p><p className="text-sm">{projectName(viewItem)}</p></div>
            <div><p className="text-xs text-muted-foreground">Member</p><p className="text-sm">{memberName(viewItem)}</p></div>
            <div><p className="text-xs text-muted-foreground">Hours</p><p className="text-sm">{viewItem.hours}h</p></div>
            <div><p className="text-xs text-muted-foreground">Billable</p><p className="text-sm">{viewItem.billable ? "Yes" : "No"}</p></div>
            <div><p className="text-xs text-muted-foreground">Date</p><p className="text-sm">{viewItem.date ? formatDate(viewItem.date) : "-"}</p></div>
          </div></div>)}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent><DialogHeader><DialogTitle>Edit Time Entry</DialogTitle></DialogHeader>
          {editItem && (<div className="space-y-4 pt-2">
            {!OID.test(String(editItem.task || "")) && editItem.task && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">Typed before: “{editItem.task}”{editItem.project && !OID.test(String(editItem.project)) ? ` · ${editItem.project}` : ""}. Pick the real task so it counts in the reports.</p>
            )}
            <div className="space-y-2"><Label>Project</Label>
              <SearchableSelect options={projectOptions} value={OID.test(String(editItem.project || "")) ? editItem.project : ""} placeholder="Any project" onValueChange={(v) => setEditItem({ ...editItem, project: v || "", task: OID.test(String(editItem.task || "")) && v && projectIdOfTask(taskById.get(String(editItem.task))) !== v ? "" : editItem.task })} />
            </div>
            <div className="space-y-2"><Label>Task *</Label>
              <SearchableSelect options={taskOptionsFor(OID.test(String(editItem.project || "")) ? editItem.project : "")} value={OID.test(String(editItem.task || "")) ? editItem.task : ""} placeholder="What did you work on?" onValueChange={(v) => setEditItem({ ...editItem, task: v || editItem.task, project: OID.test(String(editItem.project || "")) ? editItem.project : projectIdOfTask(taskById.get(String(v))) || editItem.project })} />
            </div>
            <div className="space-y-2"><Label>Member</Label>
              <SearchableSelect options={staffOptions} value={OID.test(String(editItem.member || "")) ? editItem.member : ""} placeholder={editItem.member && !OID.test(String(editItem.member)) ? editItem.member : "Who did the work"} onValueChange={(v) => setEditItem({ ...editItem, member: v || editItem.member })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Hours *</Label><Input type="number" step="0.5" value={editItem.hours || ""} onChange={e => setEditItem({...editItem, hours: e.target.value})} /></div>
              <div className="space-y-2"><Label>Date *</Label><Input type="date" value={editItem.date || ""} onChange={e => setEditItem({...editItem, date: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Billable</Label><Select value={editItem.billable} onValueChange={v => setEditItem({...editItem, billable: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select></div>
            <Button className="w-full" onClick={handleUpdate}>Save Changes</Button>
          </div>)}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TimeTracking;

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

  const [formData, setFormData] = useState({
    task: "",
    project: "",
    member: "",
    hours: "",
    billable: "no",
    date: new Date().toISOString().split("T")[0]
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

  const handleCreate = async () => {
    if (!formData.task || !formData.hours || !formData.date) {
      toast({ title: "Error", description: "Please fill required fields", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        ...formData,
        hours: Number(formData.hours),
        billable: formData.billable === "yes"
      };
      await timeEntryService.createTimeEntry(payload);
      toast({ title: "Created", description: "Time entry logged." });
      setIsAddOpen(false);
      setFormData({
        task: "", project: "", member: "", hours: "", billable: "no", date: new Date().toISOString().split("T")[0]
      });
      fetchEntries();
    } catch (error) {
      toast({ title: "Error", description: "Failed to log time.", variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    try {
      const payload = {
        ...editItem,
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

  const projects = ["all", ...new Set(entries.map((t) => t.project).filter(Boolean))];
  
  const filtered = entries.filter((t) => {
    const matchesSearch = (t.task || "").toLowerCase().includes(search.toLowerCase());
    const matchesProject = projectFilter === "all" || t.project === projectFilter;
    return matchesSearch && matchesProject;
  });

  const totalHours = entries.reduce((sum, t) => sum + (t.hours || 0), 0);
  const todayDate = new Date().toISOString().split("T")[0];
  const todayHours = entries.filter((t) => t.date && t.date.startsWith(todayDate)).reduce((sum, t) => sum + (t.hours || 0), 0);
  
  // simple week calculation (last 7 days)
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const weekHours = entries.filter((t) => t.date && new Date(t.date) >= lastWeek).reduce((sum, t) => sum + (t.hours || 0), 0);
  
  const billableHours = entries.filter((t) => t.billable).reduce((sum, t) => sum + (t.hours || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Time Tracking</h1><p className="text-muted-foreground">Track time spent on projects and tasks</p></div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild><Button className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"><Plus className="h-4 w-4" />Log Time</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Time Entry</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2"><Label>Project</Label>
                   <Input placeholder="Project Name" value={formData.project} onChange={e => setFormData({...formData, project: e.target.value})} />
                </div>
                <div className="space-y-2"><Label>Task *</Label><Input placeholder="What did you work on?" value={formData.task} onChange={e => setFormData({...formData, task: e.target.value})} /></div>
                <div className="space-y-2"><Label>Member</Label><Input placeholder="Team member name" value={formData.member} onChange={e => setFormData({...formData, member: e.target.value})} /></div>
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
          <Select value={projectFilter} onValueChange={setProjectFilter}><SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p} value={p}>{p === "all" ? "All Projects" : p}</SelectItem>)}</SelectContent></Select>
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
                      <TableCell className="font-medium">{entry.task}</TableCell>
                      <TableCell className="text-muted-foreground">{entry.project || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{entry.member || "-"}</TableCell>
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
            <div><p className="text-xs text-muted-foreground">Task</p><p className="text-sm font-medium">{viewItem.task}</p></div>
            <div><p className="text-xs text-muted-foreground">Project</p><p className="text-sm">{viewItem.project || "-"}</p></div>
            <div><p className="text-xs text-muted-foreground">Member</p><p className="text-sm">{viewItem.member || "-"}</p></div>
            <div><p className="text-xs text-muted-foreground">Hours</p><p className="text-sm">{viewItem.hours}h</p></div>
            <div><p className="text-xs text-muted-foreground">Billable</p><p className="text-sm">{viewItem.billable ? "Yes" : "No"}</p></div>
            <div><p className="text-xs text-muted-foreground">Date</p><p className="text-sm">{viewItem.date ? formatDate(viewItem.date) : "-"}</p></div>
          </div></div>)}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent><DialogHeader><DialogTitle>Edit Time Entry</DialogTitle></DialogHeader>
          {editItem && (<div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Task *</Label><Input value={editItem.task || ""} onChange={e => setEditItem({...editItem, task: e.target.value})} /></div>
            <div className="space-y-2"><Label>Project</Label><Input value={editItem.project || ""} onChange={e => setEditItem({...editItem, project: e.target.value})} /></div>
            <div className="space-y-2"><Label>Member</Label><Input value={editItem.member || ""} onChange={e => setEditItem({...editItem, member: e.target.value})} /></div>
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

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Play, Pause, Clock, Timer, BarChart3, Plus, Search } from "lucide-react";
import { timeEntries, type TimeEntry } from "@/data/mockData";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";

const TimeTracking = () => {
  const [search, setSearch] = useState("");
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState("all");
  const [viewItem, setViewItem] = useState<TimeEntry | null>(null);
  const [editItem, setEditItem] = useState<TimeEntry | null>(null);
  const { toast } = useToast();

  const projects = ["all", ...new Set(timeEntries.map((t) => t.project))];
  const filtered = timeEntries.filter((t) => {
    const matchesSearch = t.task.toLowerCase().includes(search.toLowerCase());
    const matchesProject = projectFilter === "all" || t.project === projectFilter;
    return matchesSearch && matchesProject;
  });

  const totalHours = timeEntries.reduce((sum, t) => sum + t.hours, 0);
  const todayHours = timeEntries.filter((t) => t.date === "2026-03-07").reduce((sum, t) => sum + t.hours, 0);
  const weekHours = timeEntries.filter((t) => new Date(t.date) >= new Date("2026-03-03")).reduce((sum, t) => sum + t.hours, 0);
  const billableHours = timeEntries.filter((t) => t.billable).reduce((sum, t) => sum + t.hours, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Time Tracking</h1><p className="text-muted-foreground">Track time spent on projects and tasks</p></div>
          <Dialog>
            <DialogTrigger asChild><Button className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"><Plus className="h-4 w-4" />Log Time</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Time Entry</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2"><Label>Project</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger><SelectContent>{projects.filter(p => p !== "all").map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2"><Label>Task</Label><Input placeholder="What did you work on?" /></div>
                <div className="space-y-2"><Label>Member</Label><Input placeholder="Team member name" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Hours</Label><Input type="number" placeholder="0" step="0.5" /></div>
                  <div className="space-y-2"><Label>Date</Label><Input type="date" /></div>
                </div>
                <div className="space-y-2"><Label>Billable</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select>
                </div>
                <Button className="w-full">Log Entry</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{todayHours}h</p><p className="text-xs text-muted-foreground">Today</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-info/10"><Timer className="h-5 w-5 text-info" /></div><div><p className="text-2xl font-bold">{weekHours}h</p><p className="text-xs text-muted-foreground">This Week</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><BarChart3 className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold">{totalHours}h</p><p className="text-xs text-muted-foreground">Total</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div><div><p className="text-2xl font-bold">{billableHours}h</p><p className="text-xs text-muted-foreground">Billable</p></div></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Input placeholder="What are you working on?" className="flex-1" />
              <Select><SelectTrigger className="w-[200px]"><SelectValue placeholder="Select project" /></SelectTrigger><SelectContent>{projects.filter(p => p !== "all").map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
              <Button variant={activeTimer ? "destructive" : "default"} onClick={() => setActiveTimer(activeTimer ? null : "running")} className="gap-2">
                {activeTimer ? <><Pause className="h-4 w-4" />Stop</> : <><Play className="h-4 w-4" />Start</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search entries..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <Select value={projectFilter} onValueChange={setProjectFilter}><SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p} value={p}>{p === "all" ? "All Projects" : p}</SelectItem>)}</SelectContent></Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Task</th>
                    <th className="p-3 font-medium">Project</th>
                    <th className="p-3 font-medium">Member</th>
                    <th className="p-3 font-medium">Hours</th>
                    <th className="p-3 font-medium">Billable</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="p-3 text-sm font-medium">{entry.task}</td>
                      <td className="p-3 text-sm text-muted-foreground">{entry.project}</td>
                      <td className="p-3 text-sm text-muted-foreground">{entry.member}</td>
                      <td className="p-3 text-sm font-medium">{entry.hours}h</td>
                      <td className="p-3"><Badge variant="outline" className={entry.billable ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>{entry.billable ? "Yes" : "No"}</Badge></td>
                      <td className="p-3 text-sm text-muted-foreground">{formatDate(entry.date)}</td>
                      <td className="p-3"><TableActions onView={() => setViewItem(entry)} onEdit={() => setEditItem(entry)} onDelete={() => toast({ title: "Deleted", description: "Time entry deleted." })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Time Entry Details</DialogTitle></DialogHeader>
          {viewItem && (<div className="space-y-3 pt-2"><div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-muted-foreground">Task</p><p className="text-sm font-medium">{viewItem.task}</p></div>
            <div><p className="text-xs text-muted-foreground">Project</p><p className="text-sm">{viewItem.project}</p></div>
            <div><p className="text-xs text-muted-foreground">Member</p><p className="text-sm">{viewItem.member}</p></div>
            <div><p className="text-xs text-muted-foreground">Hours</p><p className="text-sm">{viewItem.hours}h</p></div>
            <div><p className="text-xs text-muted-foreground">Billable</p><p className="text-sm">{viewItem.billable ? "Yes" : "No"}</p></div>
            <div><p className="text-xs text-muted-foreground">Date</p><p className="text-sm">{formatDate(viewItem.date)}</p></div>
          </div></div>)}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Time Entry</DialogTitle></DialogHeader>
          {editItem && (<div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Task</Label><Input defaultValue={editItem.task} /></div>
            <div className="space-y-2"><Label>Project</Label><Select defaultValue={editItem.project}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{projects.filter(p => p !== "all").map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Member</Label><Input defaultValue={editItem.member} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Hours</Label><Input type="number" defaultValue={editItem.hours} step="0.5" /></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" defaultValue={editItem.date} /></div>
            </div>
            <div className="space-y-2"><Label>Billable</Label><Select defaultValue={editItem.billable ? "yes" : "no"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select></div>
            <Button className="w-full" onClick={() => { setEditItem(null); toast({ title: "Updated", description: "Time entry updated." }); }}>Save Changes</Button>
          </div>)}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TimeTracking;

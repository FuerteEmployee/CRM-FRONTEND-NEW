import { useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  ChevronLeft,
  ChevronDown,
  Plus,
  Receipt,
  Pin,
  PinOff,
  Pencil,
  Copy,
  PlayCircle,
  PauseCircle,
  XCircle,
  CheckCircle2,
  Download,
  Eye,
  Trash2,
  Clock,
  Wallet,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { projectService } from "@/api/services/project.service";
import { staffService } from "@/api/services/staff.service";
import { salesService } from "@/api/services/sales.service";
import { timeEntryService } from "@/api/services/time_entry.service";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/dateFormat";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";

const statusConfig = [
  { id: 1, label: "Not Started", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: 2, label: "In Progress", color: "bg-primary/10 text-primary border-primary/20" },
  { id: 3, label: "On Hold", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { id: 5, label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200" },
  { id: 4, label: "Finished", color: "bg-green-50 text-green-700 border-green-200" },
];

const billingTypeLabels: Record<number, string> = { 1: "Fixed Rate", 2: "Project Hours", 3: "Task Hours" };

const TABS = ["Overview", "Tasks", "Timesheets", "Milestones", "Files", "Discussions", "Gantt", "Tickets", "Contracts", "Sales", "Notes", "Activity"];

const TAB_VISIBILITY_IDS: Record<string, string[]> = {
  Overview: ["project_overview"],
  Tasks: ["project_tasks"],
  Timesheets: ["project_timesheets"],
  Milestones: ["project_milestones"],
  Files: ["project_files"],
  Discussions: ["project_discussions"],
  Gantt: ["project_gantt"],
  Tickets: ["project_tickets"],
  Contracts: ["project_contracts"],
  Sales: ["project_proposals", "project_estimates", "project_invoices", "project_subscriptions", "project_credit_notes"],
  Notes: ["project_notes"],
  Activity: ["project_activity"],
};

const formatHM = (hoursFloat: number): string => {
  const totalMinutes = Math.round((hoursFloat || 0) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export default function ProjectView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { symbol } = useCurrency();
  const asCustomer = new URLSearchParams(location.search).get("asCustomer") === "1";

  const [activeTab, setActiveTab] = useState("Overview");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskForm, setTaskForm] = useState({ name: "", description: "", priority: "2", assignee: "", duedate: "" });
  const [invoiceMode, setInvoiceMode] = useState<"single" | "task">("single");
  const [billTimesheets, setBillTimesheets] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectService.getById(id!).then((r: any) => r.data || r),
    enabled: !!id,
  });

  const { data: allTasks = [] } = useQuery<any[]>({
    queryKey: ["project-tasks-source"],
    queryFn: () => projectService.getTasks().then((r: any) => r.data || r),
  });

  const tasks = useMemo(
    () => allTasks.filter((t: any) => (t.rel_id?._id || t.rel_id) === id),
    [allTasks, id]
  );

  const { data: allTimeEntries = [] } = useQuery<any[]>({
    queryKey: ["time-entries-source"],
    queryFn: () => timeEntryService.getTimeEntries().then((r: any) => r.data || r),
  });

  const timeEntries = useMemo(
    () => allTimeEntries.filter((e: any) => e.project === id || (project?.name && e.project === project.name)),
    [allTimeEntries, id, project]
  );

  const { data: allExpenses = [] } = useQuery<any[]>({
    queryKey: ["expenses-source"],
    queryFn: () => salesService.getExpenses().then((r: any) => r.data || r),
  });

  const expenses = useMemo(
    () => allExpenses.filter((e: any) => (e.project?._id || e.project) === id),
    [allExpenses, id]
  );

  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["staff", "assignable"],
    queryFn: staffService.getAssignable,
  });

  const statusMutation = useMutation({
    mutationFn: (status: number) => projectService.update(id!, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Status Updated", description: "Project status updated successfully.", className: "bg-green-600 text-white font-bold rounded-2xl" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to update status.", variant: "destructive" }),
  });

  const pinMutation = useMutation({
    mutationFn: (pinned: boolean) => projectService.update(id!, { pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: project?.pinned ? "Project Unpinned" : "Project Pinned", description: "", className: "bg-green-600 text-white font-bold rounded-2xl" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to update project.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Deleted", description: "Project deleted successfully.", className: "bg-green-600 text-white font-bold rounded-2xl" });
      navigate("/admin/projects");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to delete project.", variant: "destructive" }),
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload: any) => projectService.createTask(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks-source"] });
      toast({ title: "Task Created", description: "New task added to this project.", className: "bg-green-600 text-white font-bold rounded-2xl" });
      setShowTaskModal(false);
      setTaskForm({ name: "", description: "", priority: "2", assignee: "", duedate: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to create task.", variant: "destructive" }),
  });

  const handleCreateTask = () => {
    if (!taskForm.name.trim()) {
      toast({ title: "Validation Error", description: "Task name is required.", variant: "destructive" });
      return;
    }
    createTaskMutation.mutate({
      name: taskForm.name,
      description: taskForm.description,
      priority: Number(taskForm.priority),
      related_to: "project",
      rel_id: id,
      assignees: taskForm.assignee ? [taskForm.assignee] : [],
      duedate: taskForm.duedate || undefined,
    });
  };

  const handleCopyProject = async () => {
    if (!project) return;
    try {
      const { _id, createdAt, updatedAt, __v, ...rest } = project;
      const created: any = await projectService.create({
        ...rest,
        name: `${project.name} (Copy)`,
        status: 1,
        pinned: false,
        clientid: project.clientid?._id || project.clientid,
      });
      const newProject = created?.data || created;
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Project Copied", description: "A duplicate project has been created.", className: "bg-green-600 text-white font-bold rounded-2xl" });
      navigate(`/admin/projects/edit/${newProject._id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to copy project.", variant: "destructive" });
    }
  };

  const handleExportProjectData = () => {
    if (!project) return;
    const rows = [
      ["Field", "Value"],
      ["Project Name", project.name],
      ["Customer", project.clientid?.company || "Unknown"],
      ["Status", statusConfig.find(s => s.id === project.status)?.label || ""],
      ["Billing Type", billingTypeLabels[project.billing_type] || ""],
      ["Total Rate", String(project.project_cost || 0)],
      ["Start Date", project.start_date ? formatDate(project.start_date) : ""],
      ["Deadline", project.deadline ? formatDate(project.deadline) : ""],
      ["Total Logged Hours", formatHM(timeEntries.reduce((s: number, e: any) => s + (Number(e.hours) || 0), 0))],
      ["Description", project.description || ""],
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `project_${project.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Project data exported as CSV." });
  };

  const unbilledTasks = useMemo(() => tasks.filter((t: any) => t.billable && !t.billed), [tasks]);

  const handleInvoiceProject = () => {
    if (!project) return;
    let seedItems: any[] = [];
    if (invoiceMode === "single") {
      seedItems = [{ description: project.name, long_description: project.description || "", qty: 1, rate: Number(project.project_cost) || 0, tax: "", unit: "" }];
    } else {
      seedItems = unbilledTasks.map((t: any) => ({
        description: t.name,
        long_description: t.description || "",
        qty: 1,
        rate: Number(project.project_rate_per_hour) || Number(t.hourly_rate) || 0,
        tax: "",
        unit: "",
      }));
    }
    if (billTimesheets) {
      const billableEntries = timeEntries.filter((e: any) => e.billable);
      seedItems = [
        ...seedItems,
        ...billableEntries.map((e: any) => ({
          description: e.task || project.name,
          long_description: "",
          qty: Number(e.hours) || 0,
          rate: Number(project.project_rate_per_hour) || 0,
          tax: "",
          unit: "hrs",
        })),
      ];
    }
    setShowInvoiceModal(false);
    navigate(`/admin/invoices/create/${project.clientid?._id || project.clientid}`, { state: { projectId: id, seedItems } });
  };

  const startOfWeek = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);

  const chartData = useMemo(() => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return days.map((dayName, idx) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + idx);
      const dayHours = timeEntries
        .filter((e: any) => new Date(e.date).toDateString() === date.toDateString())
        .reduce((sum: number, e: any) => sum + (Number(e.hours) || 0), 0);
      return { label: `${String(date.getDate()).padStart(2, "0")} - ${dayName}`, hours: dayHours };
    });
  }, [startOfWeek, timeEntries]);

  const totalLoggedHours = timeEntries.reduce((s: number, e: any) => s + (Number(e.hours) || 0), 0);

  const doneTasksCount = tasks.filter((t: any) => Number(t.status) === 5).length;
  const openTasksCount = tasks.length - doneTasksCount;
  const tasksPct = tasks.length > 0 ? Math.round((doneTasksCount / tasks.length) * 100) : 0;
  const progressPct = project?.progress_from_tasks ? tasksPct : (project?.progress || 0);

  const totalExpenses = expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
  const billableExpenses = expenses.filter((e: any) => e.billable).reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
  const billedExpenses = expenses.filter((e: any) => e.invoiceid).reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
  const unbilledExpenses = expenses.filter((e: any) => e.billable && !e.invoiceid).reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);

  const visibleTabs = asCustomer
    ? TABS.filter(tab => TAB_VISIBILITY_IDS[tab].some(tid => (project?.visible_tabs || []).includes(tid)))
    : TABS;

  if (isLoading || !project) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  const status = statusConfig.find(s => s.id === project.status) || statusConfig[0];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 animate-in fade-in duration-500">
        {asCustomer && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-4 py-2 rounded-xl">
            Viewing as Customer — only tabs enabled in Project Settings are shown, and admin actions are hidden.
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/projects")} className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-foreground">{project.name}</h1>
                <span className="text-muted-foreground font-bold">-</span>
                <span className="text-sm font-black uppercase text-primary">{project.clientid?.company || "Unknown"}</span>
                {project.pinned && <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
              </div>
              <Badge variant="outline" className={cn("mt-1 text-[10px] font-black uppercase tracking-widest", status.color)}>
                {status.label}
              </Badge>
            </div>
          </div>

          {!asCustomer && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowTaskModal(true)} className="rounded-xl font-black gap-2 text-xs uppercase tracking-widest">
                <Plus className="h-4 w-4" /> New Task
              </Button>
              <Button onClick={() => setShowInvoiceModal(true)} className="rounded-xl font-black gap-2 text-xs uppercase tracking-widest">
                <Receipt className="h-4 w-4" /> Invoice Project
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-xl font-black gap-1 text-xs uppercase tracking-widest">
                    More <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => pinMutation.mutate(!project.pinned)}>
                    {project.pinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                    {project.pinned ? "Unpin Project" : "Pin Project"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/admin/projects/edit/${id}`)}>
                    <Pencil className="h-4 w-4 mr-2" /> Edit Project
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyProject}>
                    <Copy className="h-4 w-4 mr-2" /> Copy Project
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => statusMutation.mutate(1)}>
                    <PlayCircle className="h-4 w-4 mr-2" /> Mark as Not Started
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => statusMutation.mutate(3)}>
                    <PauseCircle className="h-4 w-4 mr-2" /> Mark as On Hold
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => statusMutation.mutate(5)}>
                    <XCircle className="h-4 w-4 mr-2" /> Mark as Cancelled
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => statusMutation.mutate(4)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Finished
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExportProjectData}>
                    <Download className="h-4 w-4 mr-2" /> Export project data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/admin/projects/view/${id}?asCustomer=1`)}>
                    <Eye className="h-4 w-4 mr-2" /> View project as customer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <p className="text-xs font-bold text-muted-foreground">Project Progress {progressPct}%</p>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border/50 overflow-x-auto">
          {visibleTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition-colors",
                activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "Overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="rounded-2xl border-border/50 shadow-sm h-fit">
              <CardContent className="p-6">
                <h3 className="text-sm font-black text-foreground mb-5">Overview</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Project #</p>
                    <p className="text-sm font-bold">{project._id?.substring(0, 8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Customer</p>
                    <p
                      onClick={() => navigate(`/admin/customers/${project.clientid?._id}`)}
                      className="text-sm font-bold text-primary hover:underline cursor-pointer"
                    >
                      {project.clientid?.company || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Billing Type</p>
                    <p className="text-sm font-bold">{billingTypeLabels[project.billing_type] || "Fixed Rate"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Rate</p>
                    <p className="text-sm font-bold">{symbol}{Number(project.project_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</p>
                    <p className="text-sm font-bold">{status.label}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date Created</p>
                    <p className="text-sm font-bold">{project.project_created || project.createdAt ? formatDate(project.project_created || project.createdAt) : "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Start Date</p>
                    <p className="text-sm font-bold">{project.start_date ? formatDate(project.start_date) : "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Logged Hours</p>
                    <p className="text-sm font-bold">{formatHM(totalLoggedHours)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description</p>
                    <p className="text-sm text-muted-foreground">{project.description || "No description for this project"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-foreground">{project.name}</h3>

              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-5 space-y-2">
                  <p className="text-sm font-bold text-foreground">{openTasksCount} / {tasks.length} Open Tasks</p>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${tasksPct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{tasksPct}%</p>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 text-sm font-black text-foreground">
                <Wallet className="h-4 w-4 text-primary" /> Expenses
              </div>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground font-bold uppercase text-[10px]">Total Expenses</p>
                    <p className="font-bold text-foreground">{symbol}{totalExpenses.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-blue-600 font-bold uppercase text-[10px]">Billable Expenses</p>
                    <p className="font-bold text-foreground">{symbol}{billableExpenses.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-emerald-600 font-bold uppercase text-[10px]">Billed Expenses</p>
                    <p className="font-bold text-foreground">{symbol}{billedExpenses.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-rose-600 font-bold uppercase text-[10px]">Unbilled Expenses</p>
                    <p className="font-bold text-foreground">{symbol}{unbilledExpenses.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-black text-foreground">
                  <Clock className="h-4 w-4 text-primary" /> Total Logged Hours
                </div>
                <span className="text-xs font-bold text-primary">This Week</span>
              </div>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-5">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" className="text-[10px]" />
                      <YAxis className="text-[10px]" tickFormatter={(v: any) => formatHM(Number(v))} />
                      <Tooltip formatter={(v: any) => [formatHM(Number(v)), "Logged Hours"]} />
                      <Bar dataKey="hours" name="Logged Hours" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "Tasks" && (
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-0">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-10">No tasks linked to this project yet.</p>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                    <tr>
                      {["Name", "Priority", "Status", "Due Date"].map(h => (
                        <th key={h} className="px-4 py-3 font-black uppercase tracking-wider text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {tasks.map((t: any) => (
                      <tr key={t._id}>
                        <td className="px-4 py-3 font-bold text-foreground">{t.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{["", "Low", "Medium", "High", "Urgent"][t.priority] || "Medium"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{["", "Not Started", "Awaiting Feedback", "Testing", "In Progress", "Complete"][t.status] || "Not Started"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{t.duedate ? formatDate(t.duedate) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}

        {!["Overview", "Tasks"].includes(activeTab) && (
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-10 text-center">
              <p className="text-sm text-muted-foreground italic">{activeTab} — coming soon.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* New Task Dialog */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm font-medium block mb-1.5">Task Name</Label>
              <Input value={taskForm.name} onChange={(e) => setTaskForm(p => ({ ...p, name: e.target.value }))} className="rounded-lg border-border/60" />
            </div>
            <div>
              <Label className="text-sm font-medium block mb-1.5">Description</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm(p => ({ ...p, description: e.target.value }))}
                className="rounded-lg border-border/60 min-h-[80px] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium block mb-1.5">Priority</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger className="rounded-lg border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Low</SelectItem>
                    <SelectItem value="2">Medium</SelectItem>
                    <SelectItem value="3">High</SelectItem>
                    <SelectItem value="4">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium block mb-1.5">Due Date</Label>
                <Input type="date" value={taskForm.duedate} onChange={(e) => setTaskForm(p => ({ ...p, duedate: e.target.value }))} className="rounded-lg border-border/60" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium block mb-1.5">Assignee</Label>
              <Select value={taskForm.assignee} onValueChange={(v) => setTaskForm(p => ({ ...p, assignee: v }))}>
                <SelectTrigger className="rounded-lg border-border/60">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s: any) => (
                    <SelectItem key={s._id} value={s._id}>{s.firstname} {s.lastname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskModal(false)}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Project Dialog */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle>Project Invoice Info</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="radio"
                  name="invoiceMode"
                  checked={invoiceMode === "single"}
                  onChange={() => setInvoiceMode("single")}
                  className="h-4 w-4 accent-primary"
                />
                Single line [{billingTypeLabels[project.billing_type] || "Fixed Rate"}]
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="radio"
                  name="invoiceMode"
                  checked={invoiceMode === "task"}
                  onChange={() => setInvoiceMode("task")}
                  className="h-4 w-4 accent-primary"
                />
                Task per item
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="bill-timesheets" checked={billTimesheets} onCheckedChange={(c) => setBillTimesheets(!!c)} />
              <Label htmlFor="bill-timesheets" className="text-sm font-medium cursor-pointer">All timesheets individually</Label>
            </div>
            {unbilledTasks.length === 0 && (
              <p className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-xl">
                No tasks to bill. Feel free to add whatever you want in the invoice items.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceModal(false)}>Close</Button>
            <Button onClick={handleInvoiceProject}>Invoice Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{project.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

import React, { useState } from "react";
import { AdminDashboardSkeleton } from "@/components/ui/page-skeleton";
import { useMinimumLoading } from "@/hooks/useMinimumLoading";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FolderKanban,
  CheckSquare,
  Users,
  FileText,
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Megaphone,
  Bell,
  ListTodo,
  ClipboardList,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { usePermissionContext } from "@/context/PermissionContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
import { estimateService } from "@/api/services/estimate.service";
import { taskService } from "@/api/services/task.service";
import { projectService } from "@/api/services/project.service";
import { supportService } from "@/api/services/support.service";
import { utilityService } from "@/api/services/utility.service";
import { leadService } from "@/api/services/lead.service";
import { customerService } from "@/api/services/customer.service";
import { formatDate } from "@/lib/dateFormat";

const OverviewSection = ({ title, icon: Icon, items }: { title: string; icon: React.ElementType; items: { label: string; value: number; percentage: string; color?: string }[] }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 font-semibold text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {title}
    </div>
    {items.map((item) => (
      <div key={item.label} className="flex items-center justify-between text-sm">
        <span className={item.color || "text-foreground"}>{item.value} {item.label}</span>
        <div className="flex items-center gap-2">
          {parseFloat(item.percentage) > 0 && (
            <Progress value={parseFloat(item.percentage)} className="w-16 h-1.5" />
          )}
          <span className="text-muted-foreground text-xs w-12 text-right">{item.percentage}%</span>
        </div>
      </div>
    ))}
  </div>
);

const Dashboard = () => {
  const { user } = usePermissionContext();

  // 1. Fetching all dynamic datasets from backend APIs
  const { data: invoicesList = [], isLoading } = useQuery({
    queryKey: ["dashboard-invoices"],
    queryFn: async () => {
      const res = await salesService.getInvoices();
      return Array.isArray(res) ? res : res?.data || [];
    }
  });

  const { data: estimatesList = [] } = useQuery({
    queryKey: ["dashboard-estimates"],
    queryFn: async () => {
      const res = await estimateService.getEstimates();
      return Array.isArray(res) ? res : res?.data || [];
    }
  });

  const { data: proposalsList = [] } = useQuery({
    queryKey: ["dashboard-proposals"],
    queryFn: async () => {
      const res = await salesService.getProposals();
      return Array.isArray(res) ? res : res?.data || [];
    }
  });

  const { data: tasksList = [] } = useQuery({
    queryKey: ["dashboard-tasks"],
    queryFn: async () => {
      const res = await taskService.getAll();
      return Array.isArray(res) ? res : res?.data || [];
    }
  });

  const { data: projectsList = [] } = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: async () => {
      const res = await projectService.getAll();
      return Array.isArray(res) ? res : res?.data || [];
    }
  });

  const { data: ticketsList = [] } = useQuery({
    queryKey: ["dashboard-tickets"],
    queryFn: async () => {
      const res = await supportService.getTickets();
      return Array.isArray(res) ? res : res?.data || [];
    }
  });

  const { data: announcementsList = [] } = useQuery({
    queryKey: ["dashboard-announcements"],
    queryFn: async () => {
      const res = await utilityService.getAnnouncements();
      return Array.isArray(res) ? res : res?.data || [];
    }
  });

  const { data: leadsList = [] } = useQuery({
    queryKey: ["dashboard-leads"],
    queryFn: async () => {
      const res = await leadService.getAll();
      return Array.isArray(res) ? res : res?.data || [];
    }
  });

  const { data: todosList = [], refetch: refetchTodos } = useQuery({
    queryKey: ["dashboard-todos"],
    queryFn: async () => {
      const res = await utilityService.getTodos();
      return Array.isArray(res) ? res : res?.data || [];
    }
  });

  const { data: expensesList = [] } = useQuery({
    queryKey: ["dashboard-expenses"],
    queryFn: async () => {
      const res = await salesService.getExpenses();
      return Array.isArray(res) ? res : res?.data || [];
    }
  });

  const { data: activityLogsList = [] } = useQuery({
    queryKey: ["dashboard-activity-logs"],
    queryFn: async () => {
      const res = await utilityService.getActivityLogs();
      return Array.isArray(res) ? res : res?.data || [];
    }
  });

  const { data: clientsRes = [] } = useQuery({
    queryKey: ["dashboard-clients-reminders"],
    queryFn: async () => {
      const res = await customerService.getAll();
      return Array.isArray(res) ? res : res?.data || [];
    }
  });

  // Fetch reminders for the first client if available
  const firstClientId = clientsRes[0]?._id || clientsRes[0]?.id;
  const { data: remindersRes = [] } = useQuery({
    queryKey: ["dashboard-reminders", firstClientId],
    queryFn: async () => {
      if (!firstClientId) return [];
      const res = await customerService.getReminders(firstClientId);
      return Array.isArray(res) ? res : res?.data || [];
    },
    enabled: !!firstClientId
  });

  // mutations for Todo
  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      return utilityService.updateTodo(id, { completed });
    },
    onSuccess: () => {
      refetchTodos();
    }
  });

  const createTodoMutation = useMutation({
    mutationFn: async (title: string) => {
      return utilityService.createTodo({ title, completed: false, priority: "Medium" });
    },
    onSuccess: () => {
      refetchTodos();
    }
  });

  const toggleTodo = (id: string) => {
    const todo = todosList.find((t: any) => t._id === id || t.id === id);
    if (todo) {
      toggleTodoMutation.mutate({ id: todo._id || todo.id, completed: !todo.completed });
    } else {
      setFallbackTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    }
  };

  const handleNewTodo = () => {
    const title = window.prompt("Enter new to-do item title:");
    if (title && title.trim()) {
      createTodoMutation.mutate(title.trim());
    }
  };

  // Helper status converters
  const getTaskPriorityLabel = (priority: any) => {
    const p = Number(priority);
    if (p === 1) return "Low";
    if (p === 2) return "Medium";
    if (p === 3) return "High";
    if (p === 4) return "Urgent";
    return String(priority || "Medium");
  };

  const getTaskStatusLabel = (status: any) => {
    const s = Number(status);
    if (s === 1) return "To Do";
    if (s === 2) return "Awaiting Feedback";
    if (s === 3) return "Testing";
    if (s === 4) return "In Progress";
    if (s === 5) return "Done";
    return String(status || "To Do");
  };

  const getProjectStatusLabel = (status: any) => {
    const s = Number(status);
    if (s === 1) return "Not Started";
    if (s === 2) return "Active";
    if (s === 3) return "On Hold";
    if (s === 4) return "Completed";
    if (s === 5) return "Cancelled";
    return String(status || "Active");
  };

  // Fallbacks for empty database states so dashboard is never empty/broken
  const [fallbackTodos, setFallbackTodos] = useState([
    { id: "td1", title: "Review project proposal for Acme Corp", completed: false, dueDate: "2026-03-10", priority: "High" },
    { id: "td2", title: "Send follow-up to Globex Inc", completed: false, dueDate: "2026-03-08", priority: "Medium" },
    { id: "td3", title: "Update team meeting agenda", completed: true, dueDate: "2026-03-06", priority: "Low" },
    { id: "td4", title: "Prepare monthly expense report", completed: true, dueDate: "2026-03-05", priority: "Medium" },
  ]);

  const activeTodos = todosList.length > 0 
    ? todosList.filter((t: any) => !t.completed) 
    : fallbackTodos.filter(t => !t.completed);

  const completedTodos = todosList.length > 0 
    ? todosList.filter((t: any) => t.completed) 
    : fallbackTodos.filter(t => t.completed);

  // 1. Outstanding / Overdue / Paid Invoices total calculations
  const outstandingInvoicesTotal = invoicesList.length > 0
    ? invoicesList
        .filter((inv: any) => {
          const status = String(inv.status || "").toLowerCase();
          return status === "unpaid" || status === "pending" || status === "1" || status === "partially_paid" || status === "3";
        })
        .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0)
    : 23600;

  const overdueInvoicesTotal = invoicesList.length > 0
    ? invoicesList
        .filter((inv: any) => {
          const status = String(inv.status || "").toLowerCase();
          return status === "overdue" || status === "4";
        })
        .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0)
    : 5600;

  const paidInvoicesTotal = invoicesList.length > 0
    ? invoicesList
        .filter((inv: any) => {
          const status = String(inv.status || "").toLowerCase();
          return status === "paid" || status === "2";
        })
        .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0)
    : 37300;

  // 2. Stat cards
  // - Invoices Awaiting Payment
  const unpaidInvoicesCount = invoicesList.filter((inv: any) => {
    const status = String(inv.status || "").toLowerCase();
    return status === "unpaid" || status === "pending" || status === "1" || status === "overdue" || status === "4";
  }).length;
  const totalInvoicesCount = invoicesList.length;
  const invoicesProgress = totalInvoicesCount > 0 ? (unpaidInvoicesCount / totalInvoicesCount) * 100 : 60;

  // - Converted Leads
  const convertedLeadsCount = leadsList.filter((l: any) => {
    const statusName = (typeof l.status === "object" && l.status?.name) || String(l.status || "");
    return statusName.toLowerCase().includes("customer") || l.isConverted === true;
  }).length;
  const totalLeadsCount = leadsList.length;
  const leadsProgress = totalLeadsCount > 0 ? (convertedLeadsCount / totalLeadsCount) * 100 : 50;

  // - Projects In Progress
  const activeProjectsCount = projectsList.filter((p: any) => {
    const status = Number(p.status);
    return status === 2 || String(p.status).toLowerCase().includes("active") || String(p.status).toLowerCase().includes("progress");
  }).length;
  const totalProjectsCount = projectsList.length;
  const projectsProgress = totalProjectsCount > 0 ? (activeProjectsCount / totalProjectsCount) * 100 : 60;

  // - Tasks Not Finished
  const unfinishedTasksCount = tasksList.filter((t: any) => {
    const status = Number(t.status);
    return status !== 5 && !String(t.status).toLowerCase().includes("complete") && !String(t.status).toLowerCase().includes("done");
  }).length;
  const totalTasksCount = tasksList.length;
  const tasksProgress = totalTasksCount > 0 ? (unfinishedTasksCount / totalTasksCount) * 100 : 70;

  const statCards = [
    { label: "Invoices Awaiting Payment", value: totalInvoicesCount > 0 ? `${unpaidInvoicesCount} / ${totalInvoicesCount}` : "3 / 5", icon: FileText, progress: invoicesProgress },
    { label: "Converted Leads", value: totalLeadsCount > 0 ? `${convertedLeadsCount} / ${totalLeadsCount}` : "6 / 12", icon: TrendingUp, progress: leadsProgress },
    { label: "Projects In Progress", value: totalProjectsCount > 0 ? `${activeProjectsCount} / ${totalProjectsCount}` : "3 / 5", icon: FolderKanban, progress: projectsProgress },
    { label: "Tasks Not Finished", value: totalTasksCount > 0 ? `${unfinishedTasksCount} / ${totalTasksCount}` : "7 / 10", icon: CheckSquare, progress: tasksProgress },
  ];

  // - Invoice Overview Section Items
  const invoiceOverviewDraft = invoicesList.filter((i: any) => String(i.status || "").toLowerCase() === "draft").length;
  const invoiceOverviewNotSent = invoicesList.filter((i: any) => String(i.status || "").toLowerCase().replace("_", " ") === "not sent").length;
  const invoiceOverviewUnpaid = invoicesList.filter((i: any) => {
    const status = String(i.status || "").toLowerCase();
    return status === "unpaid" || status === "pending" || status === "1";
  }).length;
  const invoiceOverviewPartiallyPaid = invoicesList.filter((i: any) => {
    const status = String(i.status || "").toLowerCase().replace("_", " ");
    return status === "partially paid" || status === "3";
  }).length;
  const invoiceOverviewOverdue = invoicesList.filter((i: any) => String(i.status || "").toLowerCase() === "overdue" || String(i.status) === "4").length;
  const invoiceOverviewPaid = invoicesList.filter((i: any) => String(i.status || "").toLowerCase() === "paid" || String(i.status) === "2").length;
  const invoiceOverviewTotal = invoicesList.length || 1;

  const invoiceItems = invoicesList.length > 0 ? [
    { label: "Draft", value: invoiceOverviewDraft, percentage: ((invoiceOverviewDraft / invoiceOverviewTotal) * 100).toFixed(2) },
    { label: "Not Sent", value: invoiceOverviewNotSent, percentage: ((invoiceOverviewNotSent / invoiceOverviewTotal) * 100).toFixed(2) },
    { label: "Unpaid", value: invoiceOverviewUnpaid, percentage: ((invoiceOverviewUnpaid / invoiceOverviewTotal) * 100).toFixed(2), color: "text-destructive" },
    { label: "Partially Paid", value: invoiceOverviewPartiallyPaid, percentage: ((invoiceOverviewPartiallyPaid / invoiceOverviewTotal) * 100).toFixed(2), color: "text-yellow-600" },
    { label: "Overdue", value: invoiceOverviewOverdue, percentage: ((invoiceOverviewOverdue / invoiceOverviewTotal) * 100).toFixed(2), color: "text-destructive" },
    { label: "Paid", value: invoiceOverviewPaid, percentage: ((invoiceOverviewPaid / invoiceOverviewTotal) * 100).toFixed(2), color: "text-green-600" },
  ] : [
    { label: "Draft", value: 0, percentage: "0.00" },
    { label: "Not Sent", value: 0, percentage: "0.00" },
    { label: "Unpaid", value: 2, percentage: "40.00", color: "text-destructive" },
    { label: "Partially Paid", value: 0, percentage: "0.00", color: "text-yellow-600" },
    { label: "Overdue", value: 1, percentage: "20.00", color: "text-destructive" },
    { label: "Paid", value: 2, percentage: "40.00", color: "text-green-600" },
  ];

  // - Estimate Overview Section Items
  const estimateOverviewDraft = estimatesList.filter((e: any) => String(e.status || "").toLowerCase() === "draft").length;
  const estimateOverviewNotSent = estimatesList.filter((e: any) => String(e.status || "").toLowerCase().replace("_", " ") === "not sent").length;
  const estimateOverviewSent = estimatesList.filter((e: any) => String(e.status || "").toLowerCase() === "sent").length;
  const estimateOverviewExpired = estimatesList.filter((e: any) => String(e.status || "").toLowerCase() === "expired").length;
  const estimateOverviewDeclined = estimatesList.filter((e: any) => String(e.status || "").toLowerCase() === "declined").length;
  const estimateOverviewAccepted = estimatesList.filter((e: any) => String(e.status || "").toLowerCase() === "accepted").length;
  const estimateOverviewTotal = estimatesList.length || 1;

  const estimateItems = estimatesList.length > 0 ? [
    { label: "Draft", value: estimateOverviewDraft, percentage: ((estimateOverviewDraft / estimateOverviewTotal) * 100).toFixed(2) },
    { label: "Not Sent", value: estimateOverviewNotSent, percentage: ((estimateOverviewNotSent / estimateOverviewTotal) * 100).toFixed(2) },
    { label: "Sent", value: estimateOverviewSent, percentage: ((estimateOverviewSent / estimateOverviewTotal) * 100).toFixed(2), color: "text-primary" },
    { label: "Expired", value: estimateOverviewExpired, percentage: ((estimateOverviewExpired / estimateOverviewTotal) * 100).toFixed(2) },
    { label: "Declined", value: estimateOverviewDeclined, percentage: ((estimateOverviewDeclined / estimateOverviewTotal) * 100).toFixed(2), color: "text-destructive" },
    { label: "Accepted", value: estimateOverviewAccepted, percentage: ((estimateOverviewAccepted / estimateOverviewTotal) * 100).toFixed(2), color: "text-green-600" },
  ] : [
    { label: "Draft", value: 0, percentage: "0.00" },
    { label: "Not Sent", value: 0, percentage: "0.00" },
    { label: "Sent", value: 1, percentage: "50.00", color: "text-primary" },
    { label: "Expired", value: 0, percentage: "0.00" },
    { label: "Declined", value: 0, percentage: "0.00", color: "text-destructive" },
    { label: "Accepted", value: 1, percentage: "50.00", color: "text-green-600" },
  ];

  // - Proposal Overview Section Items
  const proposalOverviewDraft = proposalsList.filter((p: any) => Number(p.status) === 1 || String(p.status).toLowerCase() === "draft").length;
  const proposalOverviewSent = proposalsList.filter((p: any) => Number(p.status) === 2 || String(p.status).toLowerCase() === "sent").length;
  const proposalOverviewOpen = proposalsList.filter((p: any) => Number(p.status) === 3 || String(p.status).toLowerCase() === "open").length;
  const proposalOverviewRevised = proposalsList.filter((p: any) => Number(p.status) === 4 || String(p.status).toLowerCase() === "revised").length;
  const proposalOverviewDeclined = proposalsList.filter((p: any) => Number(p.status) === 5 || String(p.status).toLowerCase() === "declined").length;
  const proposalOverviewAccepted = proposalsList.filter((p: any) => Number(p.status) === 6 || String(p.status).toLowerCase() === "accepted").length;
  const proposalOverviewTotal = proposalsList.length || 1;

  const proposalItems = proposalsList.length > 0 ? [
    { label: "Draft", value: proposalOverviewDraft, percentage: ((proposalOverviewDraft / proposalOverviewTotal) * 100).toFixed(2) },
    { label: "Sent", value: proposalOverviewSent, percentage: ((proposalOverviewSent / proposalOverviewTotal) * 100).toFixed(2), color: "text-primary" },
    { label: "Open", value: proposalOverviewOpen, percentage: ((proposalOverviewOpen / proposalOverviewTotal) * 100).toFixed(2) },
    { label: "Revised", value: proposalOverviewRevised, percentage: ((proposalOverviewRevised / proposalOverviewTotal) * 100).toFixed(2), color: "text-yellow-600" },
    { label: "Declined", value: proposalOverviewDeclined, percentage: ((proposalOverviewDeclined / proposalOverviewTotal) * 100).toFixed(2), color: "text-destructive" },
    { label: "Accepted", value: proposalOverviewAccepted, percentage: ((proposalOverviewAccepted / proposalOverviewTotal) * 100).toFixed(2), color: "text-green-600" },
  ] : [
    { label: "Draft", value: 1, percentage: "50.00" },
    { label: "Sent", value: 0, percentage: "0.00", color: "text-primary" },
    { label: "Open", value: 0, percentage: "0.00" },
    { label: "Revised", value: 0, percentage: "0.00", color: "text-yellow-600" },
    { label: "Declined", value: 0, percentage: "0.00", color: "text-destructive" },
    { label: "Accepted", value: 1, percentage: "50.00", color: "text-green-600" },
  ];

  // Leads overview data chart
  const leadsChartData = React.useMemo(() => {
    const groups: Record<string, { value: number; fill: string }> = {
      "Pending": { value: 0, fill: "hsl(270, 60%, 50%)" },
      "Followup": { value: 0, fill: "hsl(45, 90%, 50%)" },
      "Hot Lead": { value: 0, fill: "hsl(142, 71%, 45%)" },
      "Cold Lead": { value: 0, fill: "hsl(25, 90%, 55%)" },
      "Warm Lead": { value: 0, fill: "hsl(45, 70%, 45%)" },
      "Dead Lead": { value: 0, fill: "hsl(0, 70%, 55%)" },
      "Customer": { value: 0, fill: "hsl(142, 60%, 40%)" },
      "Lost Leads": { value: 0, fill: "hsl(0, 80%, 50%)" },
    };

    leadsList.forEach((lead: any) => {
      const statusName = (typeof lead.status === "object" && lead.status?.name) || String(lead.status || "Pending");
      if (groups[statusName]) {
        groups[statusName].value++;
      } else {
        const normalized = statusName.toLowerCase();
        if (normalized.includes("follow")) groups["Followup"].value++;
        else if (normalized.includes("hot")) groups["Hot Lead"].value++;
        else if (normalized.includes("cold")) groups["Cold Lead"].value++;
        else if (normalized.includes("warm")) groups["Warm Lead"].value++;
        else if (normalized.includes("dead")) groups["Dead Lead"].value++;
        else if (normalized.includes("customer")) groups["Customer"].value++;
        else if (normalized.includes("lost")) groups["Lost Leads"].value++;
        else groups["Pending"].value++;
      }
    });

    if (leadsList.length === 0) {
      return [
        { name: "Pending", value: 3, fill: "hsl(270, 60%, 50%)" },
        { name: "Followup", value: 5, fill: "hsl(45, 90%, 50%)" },
        { name: "Hot Lead", value: 2, fill: "hsl(142, 71%, 45%)" },
        { name: "Cold Lead", value: 4, fill: "hsl(25, 90%, 55%)" },
        { name: "Warm Lead", value: 3, fill: "hsl(45, 70%, 45%)" },
        { name: "Dead Lead", value: 1, fill: "hsl(0, 70%, 55%)" },
        { name: "Customer", value: 6, fill: "hsl(142, 60%, 40%)" },
        { name: "Lost Leads", value: 2, fill: "hsl(0, 80%, 50%)" },
      ];
    }

    return Object.entries(groups)
      .map(([name, item]) => ({ name, ...item }))
      .filter(item => item.value > 0);
  }, [leadsList]);

  // Project status chart data
  const projectStatusChartData = React.useMemo(() => {
    const groups: Record<string, { value: number; fill: string }> = {
      "Not Started": { value: 0, fill: "hsl(215, 20%, 35%)" },
      "In Progress": { value: 0, fill: "hsl(213, 44%, 25%)" },
      "On Hold": { value: 0, fill: "hsl(25, 90%, 55%)" },
      "Cancelled": { value: 0, fill: "hsl(215, 16%, 75%)" },
      "Finished": { value: 0, fill: "hsl(142, 71%, 45%)" },
    };

    projectsList.forEach((p: any) => {
      const statusLabel = getProjectStatusLabel(p.status);
      if (statusLabel === "Active" || statusLabel === "In Progress") {
        groups["In Progress"].value++;
      } else if (statusLabel === "Completed" || statusLabel === "Finished") {
        groups["Finished"].value++;
      } else if (groups[statusLabel]) {
        groups[statusLabel].value++;
      }
    });

    if (projectsList.length === 0) {
      return [
        { name: "Not Started", value: 2, fill: "hsl(215, 20%, 35%)" },
        { name: "In Progress", value: 3, fill: "hsl(213, 44%, 25%)" },
        { name: "On Hold", value: 1, fill: "hsl(25, 90%, 55%)" },
        { name: "Cancelled", value: 0, fill: "hsl(215, 16%, 75%)" },
        { name: "Finished", value: 1, fill: "hsl(142, 71%, 45%)" },
      ];
    }

    return Object.entries(groups)
      .map(([name, item]) => ({ name, ...item }))
      .filter(item => item.value > 0);
  }, [projectsList]);

  // Task progress chart data
  const taskProgressChartData = React.useMemo(() => {
    const groups: Record<string, { value: number; fill: string }> = {
      "To Do": { value: 0, fill: "hsl(215, 16%, 47%)" },
      "In Progress": { value: 0, fill: "hsl(213, 44%, 25%)" },
      "Done": { value: 0, fill: "hsl(142, 71%, 45%)" },
    };

    tasksList.forEach((t: any) => {
      const statusLabel = getTaskStatusLabel(t.status);
      if (groups[statusLabel]) {
        groups[statusLabel].value++;
      } else if (statusLabel === "Complete") {
        groups["Done"].value++;
      } else {
        groups["To Do"].value++;
      }
    });

    if (tasksList.length === 0) {
      return [
        { name: "To Do", value: 35, fill: "hsl(215, 16%, 47%)" },
        { name: "In Progress", value: 45, fill: "hsl(213, 44%, 25%)" },
        { name: "Done", value: 76, fill: "hsl(142, 71%, 45%)" },
      ];
    }

    return Object.entries(groups).map(([name, item]) => ({ name, ...item }));
  }, [tasksList]);

  // Revenue & Expenses chart data
  const dynamicRevenueData = React.useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const aggregated = months.map(m => ({ month: m, revenue: 0, expenses: 0 }));

    invoicesList.forEach((inv: any) => {
      const status = String(inv.status || "").toLowerCase();
      if (status === "paid" || status === "2") {
        const date = new Date(inv.date || inv.issueDate || inv.createdAt);
        if (!isNaN(date.getTime())) {
          const monthIdx = date.getMonth();
          aggregated[monthIdx].revenue += (inv.total || 0);
        }
      }
    });

    expensesList.forEach((exp: any) => {
      const date = new Date(exp.date || exp.createdAt);
      if (!isNaN(date.getTime())) {
        const monthIdx = date.getMonth();
        aggregated[monthIdx].expenses += (exp.amount || 0);
      }
    });

    const totalRev = aggregated.reduce((sum, item) => sum + item.revenue, 0);
    const totalExp = aggregated.reduce((sum, item) => sum + item.expenses, 0);

    if (totalRev === 0 && totalExp === 0) {
      return [
        { month: "Jan", revenue: 12400, expenses: 8200 },
        { month: "Feb", revenue: 15800, expenses: 9100 },
        { month: "Mar", revenue: 18200, expenses: 10400 },
        { month: "Apr", revenue: 16900, expenses: 9800 },
        { month: "May", revenue: 21500, expenses: 11200 },
        { month: "Jun", revenue: 24100, expenses: 12800 },
        { month: "Jul", revenue: 22800, expenses: 11900 },
        { month: "Aug", revenue: 26400, expenses: 13500 },
        { month: "Sep", revenue: 28900, expenses: 14200 },
        { month: "Oct", revenue: 25600, expenses: 12900 },
        { month: "Nov", revenue: 30200, expenses: 15100 },
        { month: "Dec", revenue: 32800, expenses: 16400 },
      ];
    }

    return aggregated;
  }, [invoicesList, expensesList]);

  // Recent activity logs
  const dynamicRecentActivities = React.useMemo(() => {
    if (activityLogsList.length === 0) {
      return [
        { id: 1, user: "Sarah Chen", action: "completed task", target: "Homepage Redesign", time: "5 min ago", avatar: "SC" },
        { id: 2, user: "Mike Johnson", action: "created invoice", target: "INV-0042", time: "15 min ago", avatar: "MJ" },
        { id: 3, user: "Emily Davis", action: "added customer", target: "Acme Corp", time: "1 hour ago", avatar: "ED" },
        { id: 4, user: "Alex Turner", action: "updated project", target: "Mobile App v2", time: "2 hours ago", avatar: "AT" },
        { id: 5, user: "Lisa Park", action: "submitted expense", target: "₹450 - Software License", time: "3 hours ago", avatar: "LP" },
        { id: 6, user: "Tom Wilson", action: "moved task to Done", target: "API Integration", time: "4 hours ago", avatar: "TW" },
      ];
    }

    return activityLogsList.slice(0, 10).map((log: any, idx: number) => {
      const userFull = log.staff?.firstname ? `${log.staff.firstname} ${log.staff.lastname || ""}` : (log.created_by?.firstname ? `${log.created_by.firstname}` : "User");
      const initials = userFull.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() || "US";
      
      const logDate = new Date(log.createdAt || log.date);
      let timeStr = "";
      if (!isNaN(logDate.getTime())) {
        const diffMs = new Date().getTime() - logDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) {
          timeStr = `${Math.max(1, diffMins)} min ago`;
        } else {
          const diffHours = Math.floor(diffMins / 60);
          if (diffHours < 24) {
            timeStr = `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
          } else {
            timeStr = logDate.toLocaleDateString();
          }
        }
      } else {
        timeStr = "recently";
      }

      return {
        id: log._id || idx,
        user: userFull,
        action: log.description || "performed action",
        target: log.additional_data || "",
        time: timeStr,
        avatar: initials,
      };
    });
  }, [activityLogsList]);

  // Announcements list
  const dynamicAnnouncements = React.useMemo(() => {
    if (announcementsList.length === 0) {
      return [
        { id: "a1", title: "System Maintenance", message: "Scheduled maintenance on March 15, 2026 from 2-4 AM UTC", date: "2026-03-07", author: "System Admin" },
        { id: "a2", title: "New Feature: Calendar View", message: "We've added a calendar view to help you manage schedules better", date: "2026-03-05", author: "Product Team" },
        { id: "a3", title: "Q1 Review Meeting", message: "All-hands meeting on March 20 at 10 AM. Please prepare your reports.", date: "2026-03-04", author: "HR Team" },
      ];
    }

    return announcementsList.slice(0, 5).map((a: any) => ({
      id: a._id || a.id,
      title: a.title,
      message: a.message,
      date: formatDate(a.createdAt || a.date),
      author: a.created_by?.firstname ? `${a.created_by.firstname} ${a.created_by.lastname || ""}` : "System Admin",
    }));
  }, [announcementsList]);

  // Tickets list
  const dynamicTickets = React.useMemo(() => {
    if (ticketsList.length === 0) {
      return [
        { id: "tk1", subject: "Login issue with SSO", status: "Open", priority: "High", customer: "Acme Corp", createdAt: "2026-03-06" },
        { id: "tk2", subject: "Feature request: Export CSV", status: "In Progress", priority: "Medium", customer: "Globex Inc", createdAt: "2026-03-05" },
        { id: "tk3", subject: "Billing discrepancy", status: "Open", priority: "High", customer: "Wayne Enterprises", createdAt: "2026-03-04" },
        { id: "tk4", subject: "UI bug on mobile", status: "Closed", priority: "Low", customer: "Stark Industries", createdAt: "2026-03-02" },
      ];
    }

    return ticketsList.slice(0, 5).map((tk: any) => ({
      id: tk._id || tk.id,
      subject: tk.subject,
      status: tk.status || "Open",
      priority: tk.priority?.name || tk.priority || "Medium",
      customer: tk.client?.company || tk.client?.name || "Acme Corp",
      createdAt: formatDate(tk.createdAt || tk.date),
    }));
  }, [ticketsList]);

  // Reminders list
  const dynamicReminders = React.useMemo(() => {
    if (remindersRes.length === 0) {
      return [
        { id: "r1", title: "Follow up with Acme Corp", date: "2026-03-10", isNotified: false, description: "Discuss renewal terms" },
        { id: "r2", title: "Submit quarterly report", date: "2026-03-15", isNotified: false, description: "Q1 financial report" },
        { id: "r3", title: "Team standup", date: "2026-03-08", isNotified: true, description: "Daily sync" },
      ];
    }

    return remindersRes.map((r: any) => ({
      id: r._id || r.id,
      title: r.description || r.title,
      date: formatDate(r.date),
      isNotified: r.isnotified || false,
      description: r.description,
    }));
  }, [remindersRes]);

  // Tasks list (filtered for incomplete)
  const dynamicTasksToShow = React.useMemo(() => {
    const list = tasksList.length > 0 ? tasksList : [
      { id: "t1", title: "Design landing page mockup", status: "To Do", priority: "High", startDate: "2026-03-01", tags: ["design", "ui"] },
      { id: "t2", title: "Implement user authentication", status: "In Progress", priority: "High", startDate: "2026-03-02", tags: ["backend", "auth"] },
      { id: "t3", title: "Write API documentation", status: "To Do", priority: "Medium", startDate: "2026-03-05", tags: ["docs"] },
      { id: "t4", title: "Fix navigation bug", status: "In Progress", priority: "High", startDate: "2026-03-03", tags: ["bug", "mobile"] },
      { id: "t7", title: "Database optimization", status: "In Progress", priority: "Medium", startDate: "2026-03-04", tags: ["backend", "performance"] },
    ];

    return list
      .filter((t: any) => {
        const s = getTaskStatusLabel(t.status);
        return s !== "Done" && s !== "Complete";
      })
      .slice(0, 5)
      .map((t: any) => ({
        id: t._id || t.id,
        title: t.name || t.title,
        status: getTaskStatusLabel(t.status),
        startDate: formatDate(t.startdate || t.startDate || t.createdAt),
        tags: t.tags || [],
        priority: getTaskPriorityLabel(t.priority),
      }));
  }, [tasksList]);

  // Projects list
  const dynamicProjectsToShow = React.useMemo(() => {
    const list = projectsList.length > 0 ? projectsList : [
      { id: "p1", name: "Website Redesign", status: "Active", startDate: "2026-01-15", progress: 65 },
      { id: "p2", name: "Mobile App v2", status: "Active", startDate: "2026-02-01", progress: 40 },
      { id: "p3", name: "CRM Integration", status: "Completed", startDate: "2025-10-01", progress: 100 },
      { id: "p4", name: "Data Analytics Dashboard", status: "On Hold", startDate: "2026-01-01", progress: 20 },
      { id: "p5", name: "E-commerce Platform", status: "Active", startDate: "2025-12-01", progress: 55 },
    ];

    return list.map((p: any) => ({
      id: p._id || p.id,
      name: p.name,
      status: getProjectStatusLabel(p.status),
      startDate: formatDate(p.start_date || p.startDate || p.createdAt),
      progress: p.progress || 0,
    }));
  }, [projectsList]);

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      steps: [
        {
          element: '#tour-header',
          popover: {
            title: 'Welcome to the Dashboard Tour!',
            description: 'This is the CRM Dashboard. Here you can see a high-level overview of everything happening in your business.',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '#tour-topnav',
          popover: {
            title: 'Top Navigation Bar',
            description: 'Use the top bar to search globally, toggle themes, view notifications, and manage your profile settings.',
            side: "bottom",
            align: 'center'
          }
        },
        {
          element: '#tour-sidebar',
          popover: {
            title: 'Main Navigation',
            description: 'Use this sidebar to navigate through your Customers, Sales, Projects, Support, and Settings.',
            side: "right",
            align: 'start'
          }
        },
        {
          element: '#tour-stats',
          popover: {
            title: 'Key Statistics',
            description: 'These metric cards give you an instant read on Invoices, Leads, Projects, and Tasks progress.',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '#tour-overview',
          popover: {
            title: 'Financial & Sales Overview',
            description: 'A detailed breakdown of all your Estimates, Invoices, and Proposals by their current status.',
            side: "bottom",
            align: 'start'
          }
        },
        {
          element: '#tour-todo',
          popover: {
            title: 'Personal To-Do List',
            description: 'Your personal quick task manager. Add, complete, and track small reminders here without creating full tasks.',
            side: "left",
            align: 'start'
          }
        },
        {
          element: '#tour-charts',
          popover: {
            title: 'Interactive Visualizations',
            description: 'Scroll down to explore interactive charts, revenue timelines, leads distribution, and your activity logs!',
            side: "top",
            align: 'center'
          }
        },
        {
          element: '#tour-setup',
          popover: {
            title: 'Setup Configuration',
            description: 'This is the Setup menu. Clicking this will flip the sidebar to reveal administrative tools for configuring your CRM.',
            side: "right",
            align: 'start',
            onNextClick: () => {
              const setupBtn = document.getElementById('tour-setup');
              if (setupBtn) setupBtn.click();
              setTimeout(() => {
                driverObj.moveNext();
              }, 200);
            }
          }
        },
        {
          element: '#tour-settings',
          popover: {
            title: 'System Settings',
            description: 'Once inside Setup, you can access global Settings to manage company details, localizations, and integrations!',
            side: "right",
            align: 'start'
          }
        }
      ]
    });
    driverObj.drive();
  };

  const showSkeleton = useMinimumLoading(isLoading);
  if (showSkeleton) return <DashboardLayout><AdminDashboardSkeleton /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between" id="tour-header">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.firstname || "User"}. Here's what's happening.</p>
          </div>
          <Button onClick={startTour} className="gap-2 rounded-xl shadow-lg shadow-primary/20 bg-primary font-bold uppercase tracking-widest text-[10px]">
            <Megaphone className="h-4 w-4" />
            Start Demo Tour
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="tour-stats">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
                <Progress value={s.progress} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Invoice / Estimate / Proposal Overview + To Do */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card className="lg:col-span-3" id="tour-overview">
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-border">
                <OverviewSection
                  title="Invoice overview"
                  icon={FileText}
                  items={invoiceItems}
                />
                <div className="pt-4 md:pt-0 md:pl-6">
                  <OverviewSection
                    title="Estimate overview"
                    icon={ClipboardList}
                    items={estimateItems}
                  />
                </div>
                <div className="pt-4 md:pt-0 md:pl-6">
                  <OverviewSection
                    title="Proposal overview"
                    icon={FileText}
                    items={proposalItems}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* To Do Items */}
          <Card id="tour-todo">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  My To Do Items
                </CardTitle>
                <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={handleNewTodo}>New To Do</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="space-y-1">
                <p className="text-xs font-medium text-yellow-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Latest to do's
                </p>
                {activeTodos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No todos found</p>
                ) : (
                  activeTodos.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2 py-1">
                      <Checkbox checked={t.completed} onCheckedChange={() => toggleTodo(t.id)} className="h-3.5 w-3.5" />
                      <span className="text-xs truncate">{t.title}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-1 pt-2">
                <p className="text-xs font-medium text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Latest finished to do's
                </p>
                {completedTodos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No finished todos found</p>
                ) : (
                  completedTodos.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2 py-1">
                      <Checkbox checked={t.completed} onCheckedChange={() => toggleTodo(t.id)} className="h-3.5 w-3.5" />
                      <span className="text-xs text-muted-foreground line-through truncate">{t.title}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <p className="text-sm text-yellow-600 font-medium">Outstanding Invoices</p>
              <p className="text-xl font-bold">₹{outstandingInvoicesTotal.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-4">
              <p className="text-sm text-destructive font-medium">Past Due Invoices</p>
              <p className="text-xl font-bold">₹{overdueInvoicesTotal.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <p className="text-sm text-green-600 font-medium">Paid Invoices</p>
              <p className="text-xl font-bold">₹{paidInvoicesTotal.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Section + Side Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="tour-charts">
          {/* My Tasks / Projects / Reminders / Tickets / Announcements */}
          <Card className="lg:col-span-2">
            <CardContent className="p-0">
              <Tabs defaultValue="tasks">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
                  <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 text-xs">
                    <ListTodo className="h-3.5 w-3.5" /> My Tasks
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 text-xs">
                    <FolderKanban className="h-3.5 w-3.5" /> My Projects
                  </TabsTrigger>
                  <TabsTrigger value="reminders" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 text-xs">
                    <Clock className="h-3.5 w-3.5" /> My Reminders
                  </TabsTrigger>
                  <TabsTrigger value="tickets" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 text-xs">
                    <Bell className="h-3.5 w-3.5" /> Tickets
                  </TabsTrigger>
                  <TabsTrigger value="announcements" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 text-xs">
                    <Megaphone className="h-3.5 w-3.5" /> Announcements
                  </TabsTrigger>
                </TabsList>

                <div className="p-4">
                  <TabsContent value="tasks" className="m-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="pb-2 font-medium">#</th>
                            <th className="pb-2 font-medium">Name</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium hidden sm:table-cell">Start Date</th>
                            <th className="pb-2 font-medium hidden md:table-cell">Tags</th>
                            <th className="pb-2 font-medium">Priority</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dynamicTasksToShow.map((t, i) => (
                            <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-2 text-muted-foreground">{i + 1}</td>
                              <td className="py-2 font-medium">{t.title}</td>
                              <td className="py-2">
                                <Badge variant="outline" className={t.status === "In Progress" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"}>
                                  {t.status}
                                </Badge>
                              </td>
                              <td className="py-2 hidden sm:table-cell text-muted-foreground">{t.startDate || "-"}</td>
                              <td className="py-2 hidden md:table-cell">
                                <div className="flex gap-1">
                                  {t.tags?.map((tag: string) => (
                                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2">
                                <Badge variant="outline" className={
                                  t.priority === "High" || t.priority === "Urgent" ? "bg-destructive/10 text-destructive border-destructive/20" :
                                  t.priority === "Medium" ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400" :
                                  "bg-muted text-muted-foreground"
                                }>
                                  {t.priority}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {dynamicTasksToShow.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">No entries found</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="projects" className="m-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="pb-2 font-medium">#</th>
                            <th className="pb-2 font-medium">Name</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium hidden sm:table-cell">Start Date</th>
                            <th className="pb-2 font-medium">Progress</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dynamicProjectsToShow.map((p, i) => (
                            <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-2 text-muted-foreground">{i + 1}</td>
                              <td className="py-2 font-medium">{p.name}</td>
                              <td className="py-2">
                                <Badge variant="outline" className={
                                  p.status === "Active" || p.status === "In Progress" ? "bg-primary/10 text-primary border-primary/20" :
                                  p.status === "Completed" || p.status === "Finished" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400" :
                                  "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400"
                                }>
                                  {p.status}
                                </Badge>
                              </td>
                              <td className="py-2 hidden sm:table-cell text-muted-foreground">{p.startDate}</td>
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  <Progress value={p.progress} className="w-16 h-1.5" />
                                  <span className="text-xs text-muted-foreground">{p.progress}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="reminders" className="m-0">
                    <div className="space-y-3">
                      {dynamicReminders.map(r => (
                        <div key={r.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{r.title}</p>
                            {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                          </div>
                          <span className="text-xs text-muted-foreground">{r.date}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="tickets" className="m-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="pb-2 font-medium">Subject</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium">Priority</th>
                            <th className="pb-2 font-medium hidden sm:table-cell">Customer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dynamicTickets.map(tk => (
                            <tr key={tk.id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-2 font-medium">{tk.subject}</td>
                              <td className="py-2">
                                <Badge variant="outline" className={
                                  tk.status === "Open" ? "bg-primary/10 text-primary border-primary/20" :
                                  tk.status === "In Progress" ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400" :
                                  "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400"
                                }>
                                  {tk.status}
                                </Badge>
                              </td>
                              <td className="py-2">
                                <Badge variant="outline" className={
                                  tk.priority === "High" || tk.priority === "Urgent" ? "bg-destructive/10 text-destructive border-destructive/20" :
                                  tk.priority === "Medium" ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400" :
                                  "bg-muted text-muted-foreground"
                                }>
                                  {tk.priority}
                                </Badge>
                              </td>
                              <td className="py-2 hidden sm:table-cell text-muted-foreground">{tk.customer}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="announcements" className="m-0">
                    <div className="space-y-3">
                      {dynamicAnnouncements.map(a => (
                        <div key={a.id} className="py-2 border-b last:border-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{a.title}</p>
                            <span className="text-xs text-muted-foreground">{a.date}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{a.message}</p>
                          <p className="text-xs text-primary mt-1">— {a.author}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>

          {/* Leads Overview + Project Status */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Leads Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {leadsChartData.map(l => (
                    <div key={l.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: l.fill }} />
                      <span className="text-muted-foreground">{l.name}</span>
                    </div>
                  ))}
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={leadsChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                        {leadsChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  Statistics by Project Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {projectStatusChartData.map(s => (
                    <div key={s.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: s.fill }} />
                      <span className="text-muted-foreground">{s.name}</span>
                    </div>
                  ))}
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={projectStatusChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                        {projectStatusChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue & Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dynamicRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(215, 16%, 47%)" }} />
                    <YAxis className="text-xs" tick={{ fill: "hsl(215, 16%, 47%)" }} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, undefined]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(213, 44%, 25%)" fill="hsl(213, 44%, 25%)" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="expenses" stroke="hsl(215, 16%, 47%)" fill="hsl(215, 16%, 47%)" fillOpacity={0.08} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Task Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskProgressChartData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {taskProgressChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dynamicRecentActivities.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{a.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{a.user}</span>{" "}
                      <span className="text-muted-foreground">{a.action}</span>{" "}
                      <span className="font-medium">{a.target}</span>
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

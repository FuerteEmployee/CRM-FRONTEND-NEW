import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import {
  Download, FileText, TrendingUp, Users, IndianRupee, ChevronDown,
  FileSpreadsheet, FileJson, FileType, Printer, LayoutDashboard,
  ArrowUpRight, ArrowDownRight, Loader2,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useQueries } from "@tanstack/react-query";
import { customerService } from "@/api/services/customer.service";
import { salesService } from "@/api/services/sales.service";
import { taskService } from "@/api/services/task.service";
import { projectService } from "@/api/services/project.service";
import { leadService } from "@/api/services/lead.service";
import { supportService } from "@/api/services/support.service";
import { contractService } from "@/api/services/contract.service";
import { estimateService } from "@/api/services/estimate.service";
import { staffService } from "@/api/services/staff.service";
import { timeEntryService } from "@/api/services/time_entry.service";
import { useCurrency } from "@/context/CurrencyContext";
import { useSettings } from "@/context/SettingsContext";
import { formatDate } from "@/lib/dateFormat";

// ── Status ids as the modules store them ────────────────────────────────────
// Projects (Backend models/Project.js, Frontend pages/Projects.tsx)
const PROJECT_STATUSES = [
  { id: 1, label: "Not Started", fill: "hsl(215, 16%, 57%)" },
  { id: 2, label: "In Progress", fill: "hsl(213, 70%, 45%)" },
  { id: 3, label: "On Hold", fill: "hsl(38, 92%, 50%)" },
  { id: 4, label: "Finished", fill: "hsl(142, 71%, 40%)" },
  { id: 5, label: "Cancelled", fill: "hsl(0, 72%, 51%)" },
];
const TASK_DONE = 5; // Tasks: 5 = Complete
const PROPOSAL_ACCEPTED = 6; // Proposals: 6 = Accepted
const PAID_INVOICE = ["paid", "recorded"];
const CANCELLED_INVOICE = ["cancelled", "void", "draft"];
const CLOSED_TICKET = ["closed", "resolved", "answered_closed"];

type Period = "all" | "week" | "month" | "quarter" | "year";
const PERIOD_LABEL: Record<Period, string> = {
  all: "All Time", week: "This Week", month: "This Month", quarter: "This Quarter", year: "This Year",
};

const periodStart = (p: Period): Date | null => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (p === "week") { const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d; }
  if (p === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (p === "quarter") return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  if (p === "year") return new Date(now.getFullYear(), 0, 1);
  return null;
};

const toList = (d: any): any[] => {
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  return [];
};
const st = (v: any): string => (v == null ? "" : String(v).toLowerCase());
const idOf = (v: any): string => String(v && typeof v === "object" ? v._id ?? "" : v ?? "");
const num = (v: any) => Number(v) || 0;
const personName = (s: any) => `${s?.firstname || ""} ${s?.lastname || ""}`.trim() || s?.email || "Unknown";

const firstDate = (row: any, fields: string[]): Date | null => {
  for (const f of [...fields, "createdAt"]) {
    if (!row?.[f]) continue;
    const d = new Date(row[f]);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

const Reports = () => {
  const { toast } = useToast();
  const { symbol } = useCurrency();
  const { getSetting } = useSettings();
  const [period, setPeriod] = useState<Period>("all");
  const [activeTab, setActiveTab] = useState("master");

  // ─── Parallel data fetching ───
  const results = useQueries({
    queries: [
      { queryKey: ["customers"], queryFn: () => customerService.getAll() },
      { queryKey: ["invoices-report"], queryFn: () => salesService.getInvoices({}) },
      { queryKey: ["proposals-report"], queryFn: () => salesService.getProposals({}) },
      { queryKey: ["payments-report"], queryFn: () => salesService.getPayments() },
      { queryKey: ["expenses-report"], queryFn: () => salesService.getExpenses({}) },
      { queryKey: ["credit-notes-report"], queryFn: () => salesService.getCreditNotes({}) },
      { queryKey: ["subscriptions-report"], queryFn: () => salesService.getSubscriptions() },
      { queryKey: ["tasks-report"], queryFn: () => taskService.getAll() },
      { queryKey: ["projects-report"], queryFn: () => projectService.getAll() },
      { queryKey: ["leads-report"], queryFn: () => leadService.getAll() },
      { queryKey: ["tickets-report"], queryFn: () => supportService.getTickets({}) },
      { queryKey: ["contracts-report"], queryFn: () => contractService.getContracts({}) },
      { queryKey: ["estimates-report"], queryFn: () => estimateService.getEstimates({}) },
      { queryKey: ["staff", "assignable"], queryFn: () => staffService.getAssignable() },
      // Same key as Project View — keep the same (plain array) shape.
      { queryKey: ["time-entries-source"], queryFn: () => timeEntryService.getTimeEntries().then(toList) },
    ],
  });
  const isAnyLoading = results.some((r) => r.isLoading);
  // A module the user has no permission for (403) is hidden, not shown as 0 —
  // otherwise "0 invoices" would look like real numbers.
  const isForbidden = (e: any) => e?.status === 403 || e?.response?.status === 403;
  const allowed = (i: number) => !isForbidden(results[i].error);
  const failed = results.filter((r) => r.isError && !isForbidden(r.error)).length;
  const hiddenCount = results.slice(0, 13).filter((r) => isForbidden(r.error)).length;

  // ─── Period filter: each module by its own date ───
  const start = periodStart(period);
  const inPeriod = (fields: string[]) => (row: any) => {
    if (!start) return true;
    const d = firstDate(row, fields);
    return !!d && d >= start;
  };
  const data = (i: number, fields: string[]) => toList(results[i].data).filter(inPeriod(fields));

  const customers = data(0, ["datecreated"]);
  const invoices = data(1, ["date"]);
  const proposals = data(2, ["date"]);
  const payments = data(3, ["date"]);
  const expenses = data(4, ["date"]);
  const creditNotes = data(5, ["date"]);
  const subscriptions = data(6, ["date"]);
  const tasks = data(7, ["dateadded", "startdate"]);
  const projects = data(8, ["start_date", "project_created"]);
  const leads = data(9, ["dateadded"]);
  const tickets = data(10, ["date"]);
  const contracts = data(11, ["datestart"]);
  const estimates = data(12, ["date"]);
  const staff = toList(results[13].data);
  const timeEntries = data(14, ["date"]);

  const money = (n: number) => `${symbol}${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  // ─── Master numbers ───
  const liveInvoices = invoices.filter((i: any) => !CANCELLED_INVOICE.includes(st(i.status)));
  const totalRevenue = liveInvoices.reduce((s: number, i: any) => s + num(i.total), 0);
  const paidInvoices = liveInvoices.filter((i: any) => PAID_INVOICE.includes(st(i.status))).length;
  const unpaidInvoices = liveInvoices.length - paidInvoices;
  const acceptedProposals = proposals.filter((p: any) => Number(p.status) === PROPOSAL_ACCEPTED || st(p.status) === "accepted").length;
  const completedTasks = tasks.filter((t: any) => Number(t.status) === TASK_DONE).length;
  const projectCount = (id: number) => projects.filter((p: any) => Number(p.status || 1) === id).length;
  const activeProjects = projectCount(2);
  const finishedProjects = projectCount(4);
  const resolvedTickets = tickets.filter((t: any) => CLOSED_TICKET.includes(st(t.status))).length;
  const openTickets = tickets.length - resolvedTickets;
  const convertedLeads = leads.filter((l: any) => !!l.client_id || !!l.date_converted).length;
  const totalExpenseAmt = expenses.reduce((s: number, e: any) => s + (num(e.amount) || num(e.total)), 0);
  const activeSubscriptions = subscriptions.filter((s: any) => ["active", "in_trial"].includes(st(s.status))).length;
  const signedContracts = contracts.filter((c: any) => c.is_signed || ["signed", "active"].includes(st(c.status))).length;
  const acceptedEstimates = estimates.filter((e: any) => st(e.status) === "accepted").length;
  const totalPaymentsAmt = payments.reduce((s: number, p: any) => s + num(p.amount), 0);
  const totalCNAmt = creditNotes.reduce((s: number, c: any) => s + num(c.total), 0);
  const openCN = creditNotes.filter((c: any) => Number(c.status || 1) === 1).length;
  const billableExpenses = expenses.filter((e: any) => e.billable).length;
  const activeCustomers = customers.filter((c: any) => c.active !== false && c.active !== 0).length;

  const summaryKPIs = [
    { i: 1, label: "Total Revenue", value: money(totalRevenue), color: "text-primary" },
    { i: 8, label: "Active Projects", value: `${activeProjects} / ${projects.length}`, color: "text-emerald-500" },
    { i: 1, label: "Open Invoices", value: String(unpaidInvoices), color: "text-amber-500" },
    { i: 0, label: "Total Customers", value: String(customers.length), color: "text-blue-500" },
    { i: 9, label: "Leads Converted", value: `${convertedLeads} / ${leads.length}`, color: "text-violet-500" },
    { i: 7, label: "Tasks Completed", value: `${completedTasks} / ${tasks.length}`, color: "text-emerald-500" },
  ].filter((k) => allowed(k.i));

  // `i` = which query above the row is counted from (hidden without permission).
  const masterTableData = ([
    { i: 1, module: "Invoices", total: liveInvoices.length, amount: money(totalRevenue), posKey: "Paid", posVal: paidInvoices, negKey: "Unpaid", negVal: unpaidInvoices },
    { i: 2, module: "Proposals", total: proposals.length, amount: money(proposals.reduce((s: number, p: any) => s + num(p.total), 0)), posKey: "Accepted", posVal: acceptedProposals, negKey: "Other", negVal: proposals.length - acceptedProposals },
    { i: 12, module: "Estimates", total: estimates.length, amount: money(estimates.reduce((s: number, e: any) => s + num(e.total), 0)), posKey: "Accepted", posVal: acceptedEstimates, negKey: "Other", negVal: estimates.length - acceptedEstimates },
    { i: 3, module: "Payments", total: payments.length, amount: money(totalPaymentsAmt), posKey: "Received", posVal: payments.length, negKey: "—", negVal: 0 },
    { i: 5, module: "Credit Notes", total: creditNotes.length, amount: money(totalCNAmt), posKey: "Closed", posVal: creditNotes.length - openCN, negKey: "Open", negVal: openCN },
    { i: 4, module: "Expenses", total: expenses.length, amount: money(totalExpenseAmt), posKey: "Billable", posVal: billableExpenses, negKey: "Non-billable", negVal: expenses.length - billableExpenses },
    { i: 8, module: "Projects", total: projects.length, amount: "—", posKey: "Finished", posVal: finishedProjects, negKey: "In Progress", negVal: activeProjects },
    { i: 7, module: "Tasks", total: tasks.length, amount: "—", posKey: "Completed", posVal: completedTasks, negKey: "Pending", negVal: tasks.length - completedTasks },
    { i: 10, module: "Support Tickets", total: tickets.length, amount: "—", posKey: "Resolved", posVal: resolvedTickets, negKey: "Open", negVal: openTickets },
    { i: 9, module: "Leads", total: leads.length, amount: "—", posKey: "Converted", posVal: convertedLeads, negKey: "Not converted", negVal: leads.length - convertedLeads },
    { i: 6, module: "Subscriptions", total: subscriptions.length, amount: "—", posKey: "Active", posVal: activeSubscriptions, negKey: "Inactive", negVal: subscriptions.length - activeSubscriptions },
    { i: 11, module: "Contracts", total: contracts.length, amount: money(contracts.reduce((s: number, c: any) => s + num(c.contract_value), 0)), posKey: "Signed", posVal: signedContracts, negKey: "Not signed", negVal: contracts.length - signedContracts },
    { i: 0, module: "Customers", total: customers.length, amount: "—", posKey: "Active", posVal: activeCustomers, negKey: "Inactive", negVal: customers.length - activeCustomers },
  ] as any[]).filter((r) => allowed(r.i));

  // ─── Revenue by month: invoiced vs collected vs expenses ───
  const revenueByMonth = useMemo(() => {
    const map = new Map<string, { key: string; month: string; invoiced: number; collected: number; expenses: number }>();
    const add = (d: Date | null, field: "invoiced" | "collected" | "expenses", amt: number) => {
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, { key, month: d.toLocaleString("en", { month: "short", year: "2-digit" }), invoiced: 0, collected: 0, expenses: 0 });
      map.get(key)![field] += amt;
    };
    liveInvoices.forEach((i: any) => add(firstDate(i, ["date"]), "invoiced", num(i.total)));
    payments.forEach((p: any) => add(firstDate(p, ["date"]), "collected", num(p.amount)));
    expenses.forEach((e: any) => add(firstDate(e, ["date"]), "expenses", num(e.amount) || num(e.total)));
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, period]);

  const outstanding = Math.max(totalRevenue - totalPaymentsAmt, 0);

  // ─── Projects ───
  const tasksByProject = useMemo(() => {
    const m = new Map<string, { total: number; done: number }>();
    toList(results[7].data).forEach((t: any) => {
      if (t.rel_type !== "project" || !t.rel_id) return;
      const k = idOf(t.rel_id);
      const v = m.get(k) || { total: 0, done: 0 };
      v.total++;
      if (Number(t.status) === TASK_DONE) v.done++;
      m.set(k, v);
    });
    return m;
  }, [results]);

  const projectsByStatus = PROJECT_STATUSES.map((s) => ({ name: s.label, value: projectCount(s.id), fill: s.fill })).filter((s) => s.value > 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const projectRows = projects.map((p: any) => {
    const t = tasksByProject.get(String(p._id)) || { total: 0, done: 0 };
    const statusId = Number(p.status || 1);
    const progress = p.progress_from_tasks !== false && t.total ? Math.round((t.done / t.total) * 100) : num(p.progress);
    const overdue = !!p.deadline && new Date(p.deadline) < today && ![4, 5].includes(statusId);
    return {
      name: p.name,
      customer: p.clientid?.company || "-",
      status: PROJECT_STATUSES.find((s) => s.id === statusId)?.label || "Not Started",
      tasks: `${t.done} / ${t.total}`,
      progress,
      deadline: p.deadline ? formatDate(p.deadline) : "-",
      overdue,
      value: num(p.project_cost),
    };
  });
  const overdueProjects = projectRows.filter((p) => p.overdue).length;

  // ─── Team performance ───
  const teamRows = useMemo(() => {
    const now = new Date();
    return staff
      .map((s: any) => {
        const sid = String(s._id);
        const mine = tasks.filter((t: any) => (t.assignees || []).some((a: any) => idOf(a) === sid));
        const done = mine.filter((t: any) => Number(t.status) === TASK_DONE).length;
        const overdue = mine.filter((t: any) => Number(t.status) !== TASK_DONE && t.duedate && new Date(t.duedate) < now).length;
        const hours = timeEntries
          .filter((e: any) => String(e.member) === sid || (!e.member && idOf(e.created_by) === sid))
          .reduce((sum: number, e: any) => sum + num(e.hours), 0);
        return {
          name: personName(s),
          assigned: mine.length,
          completed: done,
          open: mine.length - done,
          overdue,
          hours: Math.round(hours * 100) / 100,
          rate: mine.length ? Math.round((done / mine.length) * 100) : 0,
        };
      })
      .filter((r: any) => r.assigned > 0 || r.hours > 0)
      .sort((a: any, b: any) => b.completed - a.completed || b.assigned - a.assigned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, period]);

  // ─── Export ───
  const companyName = String(getSetting("companyName", "") || "");
  const fileDate = new Date().toISOString().split("T")[0];
  const masterSheet = {
    title: "All Modules — Summary",
    headers: ["Module", "Total", "Amount / Value", "Positive", "Count", "Pending / Other", "Count", "Health %"],
    rows: masterTableData.map((r) => [r.module, r.total, r.amount, r.posKey, r.posVal, r.negKey, r.negVal, `${r.total ? Math.round((r.posVal / r.total) * 100) : 0}%`]),
  };
  const revenueSheet = {
    title: "Revenue by Month",
    headers: ["Month", "Invoiced", "Collected", "Expenses", "Net (Collected - Expenses)"],
    rows: revenueByMonth.map((m) => [m.month, money(m.invoiced), money(m.collected), money(m.expenses), money(m.collected - m.expenses)]),
  };
  const projectSheet = {
    title: "Projects",
    headers: ["Project", "Customer", "Status", "Tasks Done", "Progress", "Deadline", "Value"],
    rows: projectRows.map((p) => [p.name, p.customer, p.status, p.tasks, `${p.progress}%`, `${p.deadline}${p.overdue ? " (overdue)" : ""}`, money(p.value)]),
  };
  const teamSheet = {
    title: "Team Performance",
    headers: ["Staff", "Tasks Assigned", "Completed", "Open", "Overdue", "Completion %", "Hours Logged"],
    rows: teamRows.map((r: any) => [r.name, r.assigned, r.completed, r.open, r.overdue, `${r.rate}%`, r.hours]),
  };
  // Revenue compares money in and out: it needs Invoices, Payments and Expenses.
  const canRevenue = allowed(1) && allowed(3) && allowed(4);
  const canProjects = allowed(8);
  const canTeam = allowed(7);
  const sheets = [masterSheet, canRevenue && revenueSheet, canProjects && projectSheet, canTeam && teamSheet].filter(Boolean) as typeof masterSheet[];
  const sheetForTab: Record<string, typeof masterSheet> = { master: masterSheet, revenue: revenueSheet, projects: projectSheet, team: teamSheet };

  const buildPdf = async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    // The built-in PDF fonts have no ₹ sign.
    const pdfText = (v: any) => String(v ?? "").replace(/₹/g, "Rs. ");

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageW, 64, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("Master Dashboard Report", 40, 30);
    doc.setFontSize(9);
    doc.text(pdfText(companyName), 40, 48);
    doc.text(`Period: ${PERIOD_LABEL[period]}   |   Generated: ${new Date().toLocaleString("en-IN")}`, pageW - 40, 48, { align: "right" });
    doc.setTextColor(30, 41, 59);

    // KPI boxes
    const kpis = [
      allowed(1) && ["Total Revenue", pdfText(money(totalRevenue))],
      allowed(3) && ["Collected", pdfText(money(totalPaymentsAmt))],
      allowed(1) && allowed(3) && ["Outstanding", pdfText(money(outstanding))],
      allowed(4) && ["Expenses", pdfText(money(totalExpenseAmt))],
      allowed(8) && ["Active Projects", `${activeProjects} / ${projects.length}`],
      allowed(7) && ["Tasks Completed", `${completedTasks} / ${tasks.length}`],
    ].filter(Boolean) as string[][];
    const boxW = (pageW - 80 - 5 * 8) / 6;
    kpis.forEach(([label, value], i) => {
      const x = 40 + i * (boxW + 8);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, 80, boxW, 46, 4, 4, "FD");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(label.toUpperCase(), x + 8, 94);
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(value, x + 8, 115);
    });

    let y = 146;
    sheets.forEach((s) => {
      if (y > doc.internal.pageSize.getHeight() - 90) { doc.addPage(); y = 50; }
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(s.title, 40, y);
      autoTable(doc, {
        startY: y + 8,
        head: [s.headers],
        body: s.rows.length ? s.rows.map((r) => r.map(pdfText)) : [[{ content: "No data for this period", colSpan: s.headers.length, styles: { halign: "center", textColor: [148, 163, 184] } } as any]],
        styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 40, right: 40, top: 40 },
      });
      y = (doc as any).lastAutoTable.finalY + 28;
    });

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      const h = doc.internal.pageSize.getHeight();
      doc.text(pdfText(companyName ? `${companyName} — Master Dashboard` : "Master Dashboard"), 40, h - 20);
      doc.text(`Page ${i} of ${pages}`, pageW - 40, h - 20, { align: "right" });
    }
    return doc;
  };

  const handleExport = async (type: "xlsx" | "csv" | "pdf" | "print") => {
    if (isAnyLoading) {
      toast({ title: "Please wait", description: "Report data is still loading." });
      return;
    }
    try {
      if (type === "pdf" || type === "print") {
        const doc = await buildPdf();
        if (type === "pdf") {
          doc.save(`master_dashboard_${fileDate}.pdf`);
        } else {
          doc.autoPrint();
          window.open(doc.output("bloburl"), "_blank");
        }
      } else if (type === "xlsx") {
        const XLSX = await import("xlsx");
        const wb = XLSX.utils.book_new();
        sheets.forEach((s) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([s.headers, ...s.rows]), s.title.slice(0, 31).replace(/[\\/?*[\]:]/g, "")));
        XLSX.writeFile(wb, `master_dashboard_${fileDate}.xlsx`);
      } else {
        const s = sheetForTab[activeTab] || masterSheet;
        const csv = [s.headers, ...s.rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${s.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${fileDate}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      toast({ title: "Exported", description: `Master Dashboard exported as ${type === "xlsx" ? "Excel" : type.toUpperCase()}` });
    } catch (err) {
      console.error(err);
      toast({ title: "Export failed", description: "Could not create the file.", variant: "destructive" });
    }
  };

  const Empty = ({ text }: { text: string }) => (
    <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">{isAnyLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : text}</div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-muted-foreground text-sm">Analytics and insights across all CRM modules · {PERIOD_LABEL[period]}</p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => <SelectItem key={p} value={p}>{PERIOD_LABEL[p]}</SelectItem>)}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />Export<ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => handleExport("xlsx")} className="gap-3 cursor-pointer"><FileSpreadsheet className="h-4 w-4 text-green-600" /><span>Excel</span></DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-3 cursor-pointer"><FileJson className="h-4 w-4 text-blue-600" /><span>CSV</span></DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-3 cursor-pointer"><FileType className="h-4 w-4 text-red-600" /><span>PDF</span></DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("print")} className="gap-3 cursor-pointer"><Printer className="h-4 w-4 text-gray-600" /><span>Print</span></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {failed > 0 && !isAnyLoading && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
            {failed} module(s) could not be loaded (server error) — their numbers show as 0.
          </div>
        )}
        {hiddenCount > 0 && !isAnyLoading && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-800">
            {hiddenCount} module(s) are hidden because your role has no permission for them. Numbers with "own" permission count only your own records.
          </div>
        )}

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {allowed(1) && <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><IndianRupee className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{money(totalRevenue)}</p><p className="text-xs text-muted-foreground">Total Revenue</p></div></CardContent></Card>}
          {allowed(8) && <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><TrendingUp className="h-5 w-5 text-emerald-500" /></div><div><p className="text-2xl font-bold">{projects.length}</p><p className="text-xs text-muted-foreground">Total Projects</p></div></CardContent></Card>}
          {allowed(1) && <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><FileText className="h-5 w-5 text-blue-500" /></div><div><p className="text-2xl font-bold">{liveInvoices.length}</p><p className="text-xs text-muted-foreground">Total Invoices</p></div></CardContent></Card>}
          {allowed(0) && <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-violet-500/10"><Users className="h-5 w-5 text-violet-500" /></div><div><p className="text-2xl font-bold">{customers.length}</p><p className="text-xs text-muted-foreground">Customers</p></div></CardContent></Card>}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="master" className="gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" />Master Dashboard</TabsTrigger>
            {canRevenue && <TabsTrigger value="revenue">Revenue</TabsTrigger>}
            {canProjects && <TabsTrigger value="projects">Projects</TabsTrigger>}
            {canTeam && <TabsTrigger value="team">Team Performance</TabsTrigger>}
          </TabsList>

          {/* ─── MASTER DASHBOARD ─── */}
          <TabsContent value="master" className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {summaryKPIs.map((kpi) => (
                <Card key={kpi.label} className="border-border/50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">{kpi.label}</p>
                    <p className={`text-xl font-black ${kpi.color}`}>{isAnyLoading ? "…" : kpi.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="overflow-hidden">
              <CardHeader className="bg-accent/5 border-b border-border/40 px-6 py-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">All Modules — Live Summary</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Real-time data across all CRM modules · {PERIOD_LABEL[period]}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isAnyLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1">{masterTableData.length} Modules</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead>Amount / Value</TableHead>
                        <TableHead className="text-center">Positive</TableHead>
                        <TableHead className="text-center">Pending / Other</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {masterTableData.map((row) => {
                        const posRatio = row.total > 0 ? (row.posVal / row.total) * 100 : 0;
                        const isHealthy = posRatio >= 50;
                        return (
                          <TableRow key={row.module}>
                            <TableCell className="font-semibold">{row.module}</TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-muted text-sm font-black">
                                {isAnyLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : row.total}
                              </span>
                            </TableCell>
                            <TableCell className="font-semibold">{row.amount}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] text-muted-foreground font-semibold">{row.posKey}</span>
                                <span className="font-black text-emerald-600 text-sm">{isAnyLoading ? "—" : row.posVal}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] text-muted-foreground font-semibold">{row.negKey}</span>
                                <span className="font-black text-amber-500 text-sm">{isAnyLoading ? "—" : row.negVal}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full ${isHealthy ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                                {isHealthy ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {isAnyLoading ? "..." : `${Math.round(posRatio)}%`}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── REVENUE ─── */}
          {canRevenue && <TabsContent value="revenue" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ["Invoiced", money(totalRevenue), "text-primary"],
                ["Collected", money(totalPaymentsAmt), "text-emerald-600"],
                ["Outstanding", money(outstanding), "text-amber-600"],
                ["Expenses", money(totalExpenseAmt), "text-red-600"],
              ].map(([label, value, color]) => (
                <Card key={label}><CardContent className="p-4"><p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p><p className={`text-xl font-black ${color}`}>{value}</p></CardContent></Card>
              ))}
            </div>
            <Card>
              <CardHeader><CardTitle>Revenue by Month</CardTitle></CardHeader>
              <CardContent>
                {revenueByMonth.length === 0 ? <Empty text="No invoices, payments or expenses in this period." /> : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v: any) => Number(v).toLocaleString("en-IN", { notation: "compact" })} />
                      <Tooltip formatter={(v: any, name: any) => [money(Number(v)), name]} />
                      <Legend />
                      <Bar dataKey="invoiced" name="Invoiced" fill="hsl(213, 44%, 35%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="collected" name="Collected" fill="hsl(142, 71%, 40%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="hsl(0, 72%, 55%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            {revenueByMonth.length > 0 && (
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader><TableRow>{revenueSheet.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {revenueByMonth.map((m) => (
                      <TableRow key={m.key}>
                        <TableCell className="font-semibold">{m.month}</TableCell>
                        <TableCell>{money(m.invoiced)}</TableCell>
                        <TableCell className="text-emerald-600">{money(m.collected)}</TableCell>
                        <TableCell className="text-red-600">{money(m.expenses)}</TableCell>
                        <TableCell className="font-bold">{money(m.collected - m.expenses)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>}

          {/* ─── PROJECTS ─── */}
          {canProjects && <TabsContent value="projects" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {PROJECT_STATUSES.map((s) => (
                <Card key={s.id}><CardContent className="p-4"><p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{s.label}</p><p className="text-xl font-black" style={{ color: s.fill }}>{projectCount(s.id)}</p></CardContent></Card>
              ))}
              <Card><CardContent className="p-4"><p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Overdue</p><p className="text-xl font-black text-red-600">{overdueProjects}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle>Projects by Status</CardTitle></CardHeader>
              <CardContent>
                {projectsByStatus.length === 0 ? <Empty text="No projects in this period." /> : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={projectsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                        {projectsByStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            {projectRows.length > 0 && (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>{projectSheet.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                      {projectRows.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-semibold">{p.name}</TableCell>
                          <TableCell>{p.customer}</TableCell>
                          <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                          <TableCell>{p.tasks}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[110px]">
                              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${p.progress}%` }} /></div>
                              <span className="text-xs font-bold">{p.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell className={p.overdue ? "text-red-600 font-bold" : ""}>{p.deadline}{p.overdue ? " · overdue" : ""}</TableCell>
                          <TableCell>{money(p.value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>}

          {/* ─── TEAM PERFORMANCE ─── */}
          {canTeam && <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Team Performance</CardTitle></CardHeader>
              <CardContent>
                {teamRows.length === 0 ? <Empty text="No assigned tasks or logged hours in this period." /> : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={teamRows}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="assigned" fill="hsl(215, 16%, 65%)" radius={[4, 4, 0, 0]} name="Tasks Assigned" />
                      <Bar dataKey="completed" fill="hsl(213, 44%, 35%)" radius={[4, 4, 0, 0]} name="Tasks Completed" />
                      <Bar dataKey="hours" fill="hsl(142, 71%, 40%)" radius={[4, 4, 0, 0]} name="Hours Logged" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            {teamRows.length > 0 && (
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader><TableRow>{teamSheet.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {teamRows.map((r: any) => (
                      <TableRow key={r.name}>
                        <TableCell className="font-semibold">{r.name}</TableCell>
                        <TableCell>{r.assigned}</TableCell>
                        <TableCell className="text-emerald-600 font-bold">{r.completed}</TableCell>
                        <TableCell>{r.open}</TableCell>
                        <TableCell className={r.overdue ? "text-red-600 font-bold" : ""}>{r.overdue}</TableCell>
                        <TableCell>{r.rate}%</TableCell>
                        <TableCell>{r.hours}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;

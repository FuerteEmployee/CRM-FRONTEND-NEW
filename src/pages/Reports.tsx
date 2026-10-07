import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  Download, FileText, TrendingUp, Users, IndianRupee, ChevronDown,
  FileSpreadsheet, FileJson, FileType, Printer, LayoutDashboard,
  ArrowUpRight, ArrowDownRight, Loader2
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const projectsByStatus = [
  { name: "Active", value: 3, fill: "hsl(213, 44%, 25%)" },
  { name: "Completed", value: 1, fill: "hsl(142, 71%, 45%)" },
  { name: "On Hold", value: 1, fill: "hsl(38, 92%, 50%)" },
];

const teamPerformance = [
  { name: "Sarah", tasks: 24, hours: 160 }, { name: "Alex", tasks: 21, hours: 152 },
  { name: "Mike", tasks: 18, hours: 144 }, { name: "Tom", tasks: 16, hours: 136 },
  { name: "Emily", tasks: 15, hours: 148 }, { name: "Lisa", tasks: 12, hours: 128 },
];

const Reports = () => {
  const { toast } = useToast();

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
      { queryKey: ["contracts-report"], queryFn: () => contractService.getAll() },
      { queryKey: ["estimates-report"], queryFn: () => estimateService.getAll() },
    ],
  });

  const isAnyLoading = results.some(r => r.isLoading);

  const safe = (r: any): any[] => {
    const d = r?.data;
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.data)) return d.data;
    if (d && Array.isArray(d.invoices)) return d.invoices;
    if (d && Array.isArray(d.proposals)) return d.proposals;
    if (d && Array.isArray(d.payments)) return d.payments;
    if (d && Array.isArray(d.expenses)) return d.expenses;
    if (d && Array.isArray(d.tasks)) return d.tasks;
    if (d && Array.isArray(d.projects)) return d.projects;
    if (d && Array.isArray(d.leads)) return d.leads;
    if (d && Array.isArray(d.tickets)) return d.tickets;
    if (d && Array.isArray(d.contracts)) return d.contracts;
    if (d && Array.isArray(d.estimates)) return d.estimates;
    if (d && Array.isArray(d.subscriptions)) return d.subscriptions;
    if (d && Array.isArray(d.creditNotes)) return d.creditNotes;
    return [];
  };

  const customers  = safe(results[0]);
  const invoices   = safe(results[1]);
  const proposals  = safe(results[2]);
  const payments   = safe(results[3]);
  const expenses   = safe(results[4]);
  const creditNotes = safe(results[5]);
  const subscriptions = safe(results[6]);
  const tasks      = safe(results[7]);
  const projects   = safe(results[8]);
  const leads      = safe(results[9]);
  const tickets    = safe(results[10]);
  const contracts  = safe(results[11]);
  const estimates  = safe(results[12]);

  // Computed stats
  const st = (v: any): string => (v == null ? "" : String(v).toLowerCase());

  const totalRevenue      = invoices.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
  const paidInvoices      = invoices.filter((i: any) => st(i.status) === "paid").length;
  const unpaidInvoices    = invoices.filter((i: any) => st(i.status) !== "paid").length;
  const acceptedProposals = proposals.filter((p: any) => st(p.status) === "accepted").length;
  const completedTasks    = tasks.filter((t: any) => ["completed", "done"].includes(st(t.status))).length;
  const activeProjects    = projects.filter((p: any) => ["in progress", "active"].includes(st(p.status))).length;
  const completedProjects = projects.filter((p: any) => st(p.status) === "completed").length;
  const openTickets       = tickets.filter((t: any) => !["closed", "resolved"].includes(st(t.status))).length;
  const resolvedTickets   = tickets.filter((t: any) => ["closed", "resolved"].includes(st(t.status))).length;
  const convertedLeads    = leads.filter((l: any) => ["converted", "won"].includes(st(l.status))).length;
  const totalExpenseAmt   = expenses.reduce((s: number, e: any) => s + (Number(e.amount) || Number(e.total) || 0), 0);
  const activeSubscriptions = subscriptions.filter((s: any) => st(s.status) === "active").length;
  const signedContracts   = contracts.filter((c: any) => ["signed", "active"].includes(st(c.status))).length;
  const acceptedEstimates = estimates.filter((e: any) => st(e.status) === "accepted").length;
  const totalPaymentsAmt  = payments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
  const totalCNAmt        = creditNotes.reduce((s: number, c: any) => s + (Number(c.total) || 0), 0);

  // Revenue by month from invoices
  const revenueByMonth = (() => {
    const monthMap: Record<string, number> = {};
    invoices.forEach((inv: any) => {
      if (!inv.date) return;
      const d = new Date(inv.date);
      if (isNaN(d.getTime())) return;
      const key = d.toLocaleString("en", { month: "short" });
      monthMap[key] = (monthMap[key] || 0) + (inv.total || 0);
    });
    const monthOrder = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return monthOrder.filter(m => monthMap[m]).map(m => ({ month: m, revenue: monthMap[m] }));
  })();

  const revenueChartData = revenueByMonth.length > 0 ? revenueByMonth : [
    { month: "Jan", revenue: 0 }, { month: "Feb", revenue: 0 }, { month: "Mar", revenue: 0 },
  ];

  const summaryKPIs = [
    { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}`, color: "text-primary" },
    { label: "Active Projects", value: `${activeProjects} / ${projects.length}`, color: "text-emerald-500" },
    { label: "Open Invoices", value: String(unpaidInvoices), color: "text-amber-500" },
    { label: "Total Customers", value: String(customers.length), color: "text-blue-500" },
    { label: "Leads Converted", value: `${convertedLeads} / ${leads.length}`, color: "text-violet-500" },
    { label: "Tasks Completed", value: `${completedTasks} / ${tasks.length}`, color: "text-emerald-500" },
  ];

  const masterTableData = [
    { module: "Invoices",          total: invoices.length,       amount: `₹${totalRevenue.toLocaleString("en-IN")}`, posKey: "Paid",      posVal: paidInvoices,       negKey: "Unpaid",       negVal: unpaidInvoices },
    { module: "Proposals",         total: proposals.length,      amount: "—",                                         posKey: "Accepted",  posVal: acceptedProposals,  negKey: "Pending",      negVal: proposals.length - acceptedProposals },
    { module: "Estimates",         total: estimates.length,      amount: "—",                                         posKey: "Accepted",  posVal: acceptedEstimates,  negKey: "Pending",      negVal: estimates.length - acceptedEstimates },
    { module: "Payments",          total: payments.length,       amount: `₹${totalPaymentsAmt.toLocaleString("en-IN")}`, posKey: "Received", posVal: payments.length,  negKey: "Failed",       negVal: 0 },
    { module: "Credit Notes",      total: creditNotes.length,    amount: `₹${totalCNAmt.toLocaleString("en-IN")}`,   posKey: "Applied",   posVal: creditNotes.length, negKey: "Open",         negVal: 0 },
    { module: "Expenses",          total: expenses.length,       amount: `₹${totalExpenseAmt.toLocaleString("en-IN")}`, posKey: "Logged",  posVal: expenses.length,    negKey: "Unreviewed",   negVal: 0 },
    { module: "Projects",          total: projects.length,       amount: "—",                                         posKey: "Active",    posVal: activeProjects,     negKey: "Completed",    negVal: completedProjects },
    { module: "Tasks",             total: tasks.length,          amount: "—",                                         posKey: "Completed", posVal: completedTasks,     negKey: "Pending",      negVal: tasks.length - completedTasks },
    { module: "Support Tickets",   total: tickets.length,        amount: "—",                                         posKey: "Resolved",  posVal: resolvedTickets,    negKey: "Open",         negVal: openTickets },
    { module: "Leads",             total: leads.length,          amount: "—",                                         posKey: "Converted", posVal: convertedLeads,     negKey: "Active",       negVal: leads.length - convertedLeads },
    { module: "Subscriptions",     total: subscriptions.length,  amount: "—",                                         posKey: "Active",    posVal: activeSubscriptions, negKey: "Expired",    negVal: subscriptions.length - activeSubscriptions },
    { module: "Contracts",         total: contracts.length,      amount: "—",                                         posKey: "Signed",    posVal: signedContracts,    negKey: "Pending",      negVal: contracts.length - signedContracts },
    { module: "Customers",         total: customers.length,      amount: "—",                                         posKey: "Total",     posVal: customers.length,   negKey: "Active",       negVal: customers.length },
  ];

  const handleExport = (type: "xlsx" | "csv" | "pdf" | "print") => {
    if (type === "print" || type === "pdf") { window.print(); return; }
    const headers = ["Module", "Total", "Amount", "Positive Key", "Positive Value", "Negative Key", "Negative Value"];
    const rows = masterTableData.map(r => [r.module, r.total, r.amount, r.posKey, r.posVal, r.negKey, r.negVal]);
    const csv = "data:text/csv;charset=utf-8," + [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `master_dashboard_${new Date().toISOString().split('T')[0]}.${type}`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast({ title: "Exported", description: `Exported as ${type.toUpperCase()}` });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-muted-foreground text-sm">Analytics and insights across all CRM modules</p>
          </div>
          <div className="flex gap-2">
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
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

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><IndianRupee className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">₹{(totalRevenue/1000).toFixed(0)}K</p><p className="text-xs text-muted-foreground">Total Revenue</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><TrendingUp className="h-5 w-5 text-emerald-500" /></div><div><p className="text-2xl font-bold">{projects.length}</p><p className="text-xs text-muted-foreground">Total Projects</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><FileText className="h-5 w-5 text-blue-500" /></div><div><p className="text-2xl font-bold">{invoices.length}</p><p className="text-xs text-muted-foreground">Total Invoices</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-violet-500/10"><Users className="h-5 w-5 text-violet-500" /></div><div><p className="text-2xl font-bold">{customers.length}</p><p className="text-xs text-muted-foreground">Customers</p></div></CardContent></Card>
        </div>

        <Tabs defaultValue="master" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="master" className="gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5" />Master Dashboard
            </TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="team">Team Performance</TabsTrigger>
          </TabsList>

          {/* ─── MASTER DASHBOARD TAB (Dynamic) ─── */}
          <TabsContent value="master" className="space-y-6 animate-in fade-in duration-300">

            {/* KPI Mini-Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {summaryKPIs.map((kpi) => (
                <Card key={kpi.label} className="border-border/50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">{kpi.label}</p>
                    <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Master Table */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-accent/5 border-b border-border/40 px-6 py-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">All Modules — Live Summary</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Real-time data across all CRM modules</p>
                </div>
                <div className="flex items-center gap-2">
                  {isAnyLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1">
                    {masterTableData.length} Modules
                  </Badge>
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
                              <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-muted text-sm font-black">
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

          {/* ─── REVENUE TAB ─── */}
          <TabsContent value="revenue">
            <Card>
              <CardHeader><CardTitle>Revenue Overview (from Invoices)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]} />
                    <Bar dataKey="revenue" fill="hsl(213, 44%, 25%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── PROJECTS TAB ─── */}
          <TabsContent value="projects">
            <Card>
              <CardHeader><CardTitle>Projects by Status</CardTitle></CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={projectsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                      {projectsByStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TEAM PERFORMANCE TAB ─── */}
          <TabsContent value="team">
            <Card>
              <CardHeader><CardTitle>Team Performance</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={teamPerformance}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="tasks" fill="hsl(213, 44%, 25%)" radius={[4, 4, 0, 0]} name="Tasks Completed" />
                    <Bar dataKey="hours" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Hours Logged" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;

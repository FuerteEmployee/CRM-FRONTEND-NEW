import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  Legend
} from "recharts";
import { 
  Download, 
  ChevronDown, 
  FileSpreadsheet, 
  FileJson, 
  FileType, 
  Printer,
  HelpCircle,
  Calendar,
  FileText,
  Package,
  Wallet,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  User,
  TrendingUp,
  Clock,
  Search
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { utilityService } from "@/api/services/utility.service";
import { financeService } from "@/api/services/finance.service";
import { supportService } from "@/api/services/support.service";
import { staffService } from "@/api/services/staff.service";
import { timeEntryService } from "@/api/services/time_entry.service";
import { leadService } from "@/api/services/lead.service";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  addDays,
  isSameDay,
  isWithinInterval,
  getDaysInMonth,
} from "date-fns";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

const salesData = [
  { month: "Jan", revenue: 12400, invoiced: 14000 }, { month: "Feb", revenue: 15800, invoiced: 17000 },
  { month: "Mar", revenue: 18200, invoiced: 19500 }, { month: "Apr", revenue: 16900, invoiced: 18000 },
  { month: "May", revenue: 21500, invoiced: 23000 }, { month: "Jun", revenue: 24100, invoiced: 26000 },
];

const expenseData = [
  { month: "Jan", amount: 8200 }, { month: "Feb", amount: 9100 }, { month: "Mar", amount: 10400 },
  { month: "Apr", amount: 9800 }, { month: "May", amount: 11200 }, { month: "Jun", amount: 12800 },
];

const expenseVsIncome = [
  { month: "Jan", income: 12400, expenses: 8200 }, { month: "Feb", income: 15800, expenses: 9100 },
  { month: "Mar", income: 18200, expenses: 10400 }, { month: "Apr", income: 16900, expenses: 9800 },
  { month: "May", income: 21500, expenses: 11200 }, { month: "Jun", income: 24100, expenses: 12800 },
];

const leadsBySource = [
  { name: "Website", value: 35, fill: "hsl(213, 44%, 25%)" }, { name: "Referral", value: 25, fill: "hsl(152, 69%, 40%)" },
  { name: "LinkedIn", value: 20, fill: "hsl(38, 92%, 50%)" }, { name: "Cold Call", value: 10, fill: "hsl(0, 70%, 55%)" },
  { name: "Conference", value: 10, fill: "hsl(270, 60%, 50%)" },
];

const timesheetData = [
  { week: "W1", billable: 120, nonBillable: 40 }, { week: "W2", billable: 135, nonBillable: 35 },
  { week: "W3", billable: 110, nonBillable: 50 }, { week: "W4", billable: 145, nonBillable: 30 },
];

const kbData = [
  { month: "Jan", views: 450, articles: 8 }, { month: "Feb", views: 620, articles: 10 },
  { month: "Mar", views: 780, articles: 12 }, { month: "Apr", views: 920, articles: 14 },
];

const ReportPage = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout>
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">{title}</h1><p className="text-muted-foreground">Detailed {title.toLowerCase()} report</p></div>
        <div className="flex gap-2">
          <Select defaultValue="month"><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="week">This Week</SelectItem><SelectItem value="month">This Month</SelectItem><SelectItem value="quarter">Quarter</SelectItem><SelectItem value="year">Year</SelectItem></SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem className="gap-3 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span>Excel</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-3 cursor-pointer">
                <FileJson className="h-4 w-4 text-blue-600" />
                <span>CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-3 cursor-pointer">
                <FileType className="h-4 w-4 text-red-600" />
                <span>PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-3 cursor-pointer">
                <Printer className="h-4 w-4 text-gray-600" />
                <span>Print</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {children}
    </div>
  </DashboardLayout>
);

export const ReportSales = () => {
  // Starts unresolved until the tenant's real default currency loads below —
  // avoids hardcoding USD and querying against a currency that may not match any data.
  const [currency, setCurrency] = useState("");
  const [period, setPeriod] = useState("all_time");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  const [activeTab, setActiveTab] = useState<"sales_report" | "charts_report">("sales_report");
  const [selectedSubReport, setSelectedSubReport] = useState("invoices");
  const [selectedChartType, setSelectedChartType] = useState("all");

  const handleExport = (type: "xlsx" | "csv" | "pdf" | "print") => {
    if (type === "print") {
      window.print();
      return;
    }
    if (type === "pdf") {
      toast.success("Ready to save - choose Save as PDF in print options");
      window.print();
      return;
    }

    // Export based on active selected report
    let headers: string[] = [];
    let rows: any[] = [];
    let filename = `sales_report_${selectedSubReport}_${new Date().toISOString().split('T')[0]}.${type}`;

    if (selectedSubReport === "invoices") {
      headers = ["Invoice Number", "Customer", "Date", "Due Date", "Amount", "Tax", "Status"];
      rows = invoicesReport.map((inv: any) => [
        inv.number,
        inv.clientName || "-",
        formatRepDate(inv.date),
        formatRepDate(inv.duedate),
        inv.total,
        inv.total_tax,
        inv.status
      ]);
    } else if (selectedSubReport === "items") {
      headers = ["Item Name", "Quantity Sold", "Total Revenue"];
      rows = itemsReport.map((item: any) => [
        item.name,
        item.qtySold,
        item.totalRevenue
      ]);
    } else if (selectedSubReport === "payments") {
      headers = ["Payment ID", "Invoice Number", "Payment Mode", "Transaction ID", "Amount", "Date"];
      rows = paymentsReport.map((p: any) => [
        p.paymentId,
        p.invoiceNumber,
        p.paymentMode,
        p.transactionId || "-",
        p.amount,
        formatRepDate(p.date)
      ]);
    } else if (selectedSubReport === "credit_notes") {
      headers = ["Credit Note Number", "Customer", "Date", "Amount", "Status"];
      rows = creditNotesReport.map((cn: any) => [
        cn.number,
        cn.clientName || "-",
        formatRepDate(cn.date),
        cn.total,
        cn.status
      ]);
    } else if (selectedSubReport === "proposals") {
      headers = ["Proposal Number", "Customer", "Subject", "Date", "Open Till", "Amount", "Status"];
      rows = proposalsReport.map((prop: any) => [
        prop.number,
        prop.clientName || "-",
        prop.subject,
        formatRepDate(prop.date),
        formatRepDate(prop.openTill),
        prop.total,
        prop.status
      ]);
    } else if (selectedSubReport === "estimates") {
      headers = ["Estimate Number", "Customer", "Reference", "Date", "Expiry Date", "Amount", "Status"];
      rows = estimatesReport.map((est: any) => [
        est.number,
        est.clientName || "-",
        est.reference,
        formatRepDate(est.date),
        formatRepDate(est.expiryDate),
        est.total,
        est.status
      ]);
    } else if (selectedSubReport === "customers") {
      headers = ["Customer Name", "Total Invoiced", "Total Paid", "Outstanding Balance"];
      rows = customersReport.map((cust: any) => [
        cust.clientName || "-",
        cust.totalInvoiced,
        cust.totalPaid,
        cust.balance
      ]);
    }

    if (rows.length === 0) {
      toast.error("No data available to export");
      return;
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported successfully as ${type.toUpperCase()}`);
  };

  // Fetch active currencies
  const { data: currenciesList = [] } = useQuery({
    queryKey: ["currencies"],
    queryFn: () => financeService.getCurrencies(),
  });

  // Once currencies load, resolve the tenant's real default instead of assuming USD.
  useEffect(() => {
    if (!currency && currenciesList.length > 0) {
      setCurrency(currenciesList.find((c: any) => c.isdefault)?.name || currenciesList[0]?.name || "USD");
    }
  }, [currency, currenciesList]);

  // Fetch sales report data dynamically — wait until the default currency resolves.
  const { data = {}, isLoading } = useQuery({
    queryKey: ["salesReport", currency, period, fromDate, toDate],
    queryFn: () => utilityService.getSalesReport(currency, period, fromDate, toDate),
    enabled: !!currency,
  });

  const invoicesReport = data.invoicesReport || [];
  const itemsReport = data.itemsReport || [];
  const paymentsReport = data.paymentsReport || [];
  const creditNotesReport = data.creditNotesReport || [];
  const proposalsReport = data.proposalsReport || [];
  const estimatesReport = data.estimatesReport || [];
  const customersReport = data.customersReport || [];
  const chartsData = data.charts || { incomeTrend: [], paymentModesDistribution: [], customerGroupsDistribution: [] };

  const formatRepDate = (dateStr: any) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "-";
      return format(date, "yyyy-MM-dd");
    } catch {
      return "-";
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (["paid", "accepted", "active"].includes(s)) {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full font-bold text-xs uppercase px-2.5 py-0.5 shadow-none hover:bg-emerald-500/20">{status}</Badge>;
    }
    if (["unpaid", "draft", "sent"].includes(s)) {
      return <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full font-bold text-xs uppercase px-2.5 py-0.5 shadow-none hover:bg-amber-500/20">{status}</Badge>;
    }
    if (["cancelled", "overdue", "failed"].includes(s)) {
      return <Badge className="bg-red-500/10 text-red-600 border border-red-500/20 rounded-full font-bold text-xs uppercase px-2.5 py-0.5 shadow-none hover:bg-red-500/20">{status}</Badge>;
    }
    return <Badge className="bg-gray-500/10 text-gray-600 border border-gray-500/20 rounded-full font-bold text-xs uppercase px-2.5 py-0.5 shadow-none hover:bg-gray-500/20">{status}</Badge>;
  };

  // Sales report sub-menu items
  const salesReportsList = [
    { id: "invoices", label: "Invoices Report", icon: FileText },
    { id: "items", label: "Items Report", icon: Package },
    { id: "payments", label: "Payments Received", icon: Wallet },
    { id: "credit_notes", label: "Credit Notes Report", icon: CreditCard },
    { id: "proposals", label: "Proposals Report", icon: FileText },
    { id: "estimates", label: "Estimates Report", icon: FileText },
    { id: "customers", label: "Customers Report", icon: CheckCircle2 }
  ];

  // Sum calculations
  const totalInvoiceVal = invoicesReport.reduce((acc: number, item: any) => acc + (item.total || 0), 0);
  const totalTaxVal = invoicesReport.reduce((acc: number, item: any) => acc + (item.total_tax || 0), 0);
  const totalItemRev = itemsReport.reduce((acc: number, item: any) => acc + (item.totalRevenue || 0), 0);
  const totalItemQty = itemsReport.reduce((acc: number, item: any) => acc + (item.qtySold || 0), 0);
  const totalPaymentVal = paymentsReport.reduce((acc: number, item: any) => acc + (item.amount || 0), 0);
  const totalCNVal = creditNotesReport.reduce((acc: number, item: any) => acc + (item.total || 0), 0);
  const totalPropVal = proposalsReport.reduce((acc: number, item: any) => acc + (item.total || 0), 0);
  const totalEstVal = estimatesReport.reduce((acc: number, item: any) => acc + (item.total || 0), 0);
  const totalCustomerInv = customersReport.reduce((acc: number, item: any) => acc + (item.totalInvoiced || 0), 0);
  const totalCustomerPaid = customersReport.reduce((acc: number, item: any) => acc + (item.totalPaid || 0), 0);

  // Recharts colors
  const COLORS = ["hsl(213, 44%, 25%)", "hsl(152, 69%, 40%)", "hsl(38, 92%, 50%)", "hsl(0, 70%, 55%)", "hsl(270, 60%, 50%)"];

  // Custom prints/exports
  const triggerPrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        
        {/* Header section with Page Title and Currency/Period Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-background p-1.5 rounded-2xl">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sales Report</h1>
            <p className="text-muted-foreground text-sm font-medium">Analyze sales performance, items sold, and transaction distributions</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            
            {/* Currency Filter with Premium Tooltip */}
            <div className="flex flex-col gap-1.5">
              <TooltipProvider>
                <ShadcnTooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 cursor-help text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      <span>Currency</span>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent align="start" className="max-w-[260px] bg-card border border-border/80 p-3 rounded-xl shadow-xl">
                    <p className="text-xs font-semibold leading-relaxed text-foreground">
                      You need to select currency because you have invoices with different currency
                    </p>
                  </TooltipContent>
                </ShadcnTooltip>
              </TooltipProvider>
              
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-[120px] h-9 rounded-lg border-border/45 bg-background text-xs font-bold shadow-none focus:ring-primary/20">
                  <SelectValue placeholder="USD" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50 shadow-md">
                  {currenciesList.length > 0 ? (
                    currenciesList.map((cur: any) => (
                      <SelectItem key={cur._id} value={cur.name || "USD"} className="text-xs font-medium">
                        {cur.name} ({cur.symbol})
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="USD" className="text-xs font-medium">USD ($)</SelectItem>
                      <SelectItem value="EUR" className="text-xs font-medium">EUR (€)</SelectItem>
                      <SelectItem value="GBP" className="text-xs font-medium">GBP (£)</SelectItem>
                      <SelectItem value="INR" className="text-xs font-medium">INR (₹)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Period Filter dropdown */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Period</span>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[150px] h-9 rounded-lg border-border/45 bg-background text-xs font-bold shadow-none focus:ring-primary/20">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50 shadow-md">
                  <SelectItem value="all_time" className="text-xs font-medium">All Time</SelectItem>
                  <SelectItem value="this_month" className="text-xs font-medium">This Month</SelectItem>
                  <SelectItem value="last_month" className="text-xs font-medium">Last Month</SelectItem>
                  <SelectItem value="this_quarter" className="text-xs font-medium">This Quarter</SelectItem>
                  <SelectItem value="this_year" className="text-xs font-medium">This Year</SelectItem>
                  <SelectItem value="custom" className="text-xs font-medium">Custom Period</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom period inputs */}
            {period === "custom" && (
              <div className="flex items-end gap-2 animate-in fade-in slide-in-from-top-1">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">From</span>
                  <Input 
                    type="date" 
                    value={fromDate} 
                    onChange={(e) => setFromDate(e.target.value)} 
                    className="h-9 w-32 text-xs rounded-lg border-border/45 bg-background focus:ring-primary/20"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">To</span>
                  <Input 
                    type="date" 
                    value={toDate} 
                    onChange={(e) => setToDate(e.target.value)} 
                    className="h-9 w-32 text-xs rounded-lg border-border/45 bg-background focus:ring-primary/20"
                  />
                </div>
              </div>
            )}

            {/* Print & Export Button */}
            <div className="flex items-end self-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 gap-2 text-xs font-bold border-border/50 rounded-lg">
                    <Download className="h-4 w-4" />
                    Export
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 bg-white">
                  <DropdownMenuItem onClick={() => handleExport("xlsx")} className="gap-3 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <span>Excel</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-3 cursor-pointer">
                    <FileJson className="h-4 w-4 text-blue-600" />
                    <span>CSV</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-3 cursor-pointer">
                    <FileType className="h-4 w-4 text-red-600" />
                    <span>PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("print")} className="gap-3 cursor-pointer">
                    <Printer className="h-4 w-4 text-gray-600" />
                    <span>Print</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Primary Tabs Toggle between Sales Report & Charts Based Report */}
        <div className="flex border-b border-border/40 p-0.5 gap-2 bg-accent/5 rounded-xl max-w-sm">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setActiveTab("sales_report")}
            className={`flex-1 rounded-lg text-xs font-bold transition-all ${activeTab === "sales_report" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-transparent"}`}
          >
            Sales Report
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setActiveTab("charts_report")}
            className={`flex-1 rounded-lg text-xs font-bold transition-all ${activeTab === "charts_report" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-transparent"}`}
          >
            Charts Based Report
          </Button>
        </div>

        {/* Tab Contents: SALES REPORT TABLES (Index sidebar style) */}
        {activeTab === "sales_report" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Desktop Left Index Sidebar */}
            <Card className="lg:col-span-1 border-border/50 shadow-sm rounded-2xl h-fit overflow-hidden">
              <CardHeader className="bg-accent/10 border-b border-border/40 p-4">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">Select Sub-Report</CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {salesReportsList.map((rep) => {
                  const Icon = rep.icon;
                  const isSelected = selectedSubReport === rep.id;
                  return (
                    <Button
                      key={rep.id}
                      variant="ghost"
                      onClick={() => setSelectedSubReport(rep.id)}
                      className={`w-full justify-start gap-2.5 text-xs font-semibold px-3.5 py-5 rounded-xl transition-all ${
                        isSelected 
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10" 
                          : "hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isSelected ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                      {rep.label}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Mobile Dropdown Index Selector (Visible only on screens below lg) */}
            <div className="lg:hidden w-full">
              <Select value={selectedSubReport} onValueChange={setSelectedSubReport}>
                <SelectTrigger className="w-full h-10 rounded-xl border-border/45 bg-card text-xs font-bold">
                  <SelectValue placeholder="Invoices Report" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50 shadow-md">
                  {salesReportsList.map((rep) => (
                    <SelectItem key={rep.id} value={rep.id} className="text-xs font-medium">
                      {rep.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Right Side Tables Content */}
            <Card className="lg:col-span-3 border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card">
              <CardHeader className="bg-accent/5 border-b border-border/40 p-5 flex flex-row items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-base font-bold">
                    {salesReportsList.find(r => r.id === selectedSubReport)?.label}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-semibold mt-1">
                    Displaying calculated entries for currency {currency} and selected date filters.
                  </p>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* 1. INVOICES SUB-REPORT */}
                      {selectedSubReport === "invoices" && (
                        <Table>
                          <TableHeader className="bg-accent/10">
                            <TableRow className="border-border/40 hover:bg-transparent">
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-6 py-4">Invoice Number</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Client</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Date</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Due Date</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Amount</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Total Tax</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4 pr-6">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoicesReport.length > 0 ? (
                              invoicesReport.map((inv: any) => (
                                <TableRow key={inv._id} className="border-border/30 hover:bg-accent/5 transition-colors">
                                  <TableCell className="font-bold text-sm text-gray-800 pl-6 py-4">{inv.number}</TableCell>
                                  <TableCell className="font-semibold text-sm text-gray-800 py-4">{inv.clientName}</TableCell>
                                  <TableCell className="font-semibold text-xs text-muted-foreground whitespace-nowrap py-4">{formatRepDate(inv.date)}</TableCell>
                                  <TableCell className="font-semibold text-xs text-muted-foreground whitespace-nowrap py-4">{formatRepDate(inv.duedate)}</TableCell>
                                  <TableCell className="font-extrabold text-sm text-gray-800 py-4">{currency} {inv.total?.toFixed(2)}</TableCell>
                                  <TableCell className="font-semibold text-xs text-muted-foreground py-4">{currency} {inv.total_tax?.toFixed(2)}</TableCell>
                                  <TableCell className="py-4 pr-6">{getStatusBadge(inv.status)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow><TableCell colSpan={7} className="text-center py-10 font-bold text-muted-foreground italic">No invoice records found</TableCell></TableRow>
                            )}
                            <TableRow className="bg-accent/5 border-t-2 border-border/50 font-black">
                              <TableCell colSpan={4} className="pl-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Total Summary ({currency})</TableCell>
                              <TableCell className="py-4 text-sm font-black text-primary">{currency} {totalInvoiceVal.toFixed(2)}</TableCell>
                              <TableCell className="py-4 text-sm font-black text-muted-foreground">{currency} {totalTaxVal.toFixed(2)}</TableCell>
                              <TableCell className="py-4 pr-6"></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      )}

                      {/* 2. ITEMS SUB-REPORT */}
                      {selectedSubReport === "items" && (
                        <Table>
                          <TableHeader className="bg-accent/10">
                            <TableRow className="border-border/40 hover:bg-transparent">
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-6 py-4">Item Name</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Quantity Sold</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Average Price</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4 pr-6">Total Revenue</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {itemsReport.length > 0 ? (
                              itemsReport.map((it: any, index: number) => (
                                <TableRow key={index} className="border-border/30 hover:bg-accent/5 transition-colors">
                                  <TableCell className="font-bold text-sm text-gray-800 pl-6 py-4">{it.name}</TableCell>
                                  <TableCell className="font-bold text-sm text-gray-800 py-4">{it.qtySold}</TableCell>
                                  <TableCell className="font-semibold text-xs text-muted-foreground py-4">{currency} {it.avgPrice?.toFixed(2)}</TableCell>
                                  <TableCell className="font-extrabold text-sm text-gray-800 py-4 pr-6">{currency} {it.totalRevenue?.toFixed(2)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow><TableCell colSpan={4} className="text-center py-10 font-bold text-muted-foreground italic">No item sales records found</TableCell></TableRow>
                            )}
                            <TableRow className="bg-accent/5 border-t-2 border-border/50 font-black">
                              <TableCell className="pl-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Total Summary ({currency})</TableCell>
                              <TableCell className="py-4 text-sm font-black text-primary">{totalItemQty}</TableCell>
                              <TableCell className="py-4"></TableCell>
                              <TableCell className="py-4 pr-6 text-sm font-black text-primary">{currency} {totalItemRev.toFixed(2)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      )}

                      {/* 3. PAYMENTS RECEIVED */}
                      {selectedSubReport === "payments" && (
                        <Table>
                          <TableHeader className="bg-accent/10">
                            <TableRow className="border-border/40 hover:bg-transparent">
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-6 py-4">Payment ID</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Invoice #</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Payment Mode</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Transaction ID</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Date</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4 pr-6">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paymentsReport.length > 0 ? (
                              paymentsReport.map((p: any) => (
                                <TableRow key={p._id} className="border-border/30 hover:bg-accent/5 transition-colors">
                                  <TableCell className="font-bold text-sm text-gray-800 pl-6 py-4">{p.paymentId}</TableCell>
                                  <TableCell className="font-semibold text-sm text-gray-800 py-4">{p.invoiceNumber}</TableCell>
                                  <TableCell className="font-semibold text-xs text-muted-foreground py-4">{p.paymentMode}</TableCell>
                                  <TableCell className="font-semibold text-xs text-muted-foreground whitespace-nowrap py-4">{p.transactionId}</TableCell>
                                  <TableCell className="font-semibold text-xs text-muted-foreground whitespace-nowrap py-4">{formatRepDate(p.date)}</TableCell>
                                  <TableCell className="font-extrabold text-sm text-gray-800 py-4 pr-6">{currency} {p.amount?.toFixed(2)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow><TableCell colSpan={6} className="text-center py-10 font-bold text-muted-foreground italic">No payments received found</TableCell></TableRow>
                            )}
                            <TableRow className="bg-accent/5 border-t-2 border-border/50 font-black">
                              <TableCell colSpan={5} className="pl-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Total Summary ({currency})</TableCell>
                              <TableCell className="py-4 pr-6 text-sm font-black text-primary">{currency} {totalPaymentVal.toFixed(2)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      )}

                      {/* 4. CREDIT NOTES */}
                      {selectedSubReport === "credit_notes" && (
                        <Table>
                          <TableHeader className="bg-accent/10">
                            <TableRow className="border-border/40 hover:bg-transparent">
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-6 py-4">Credit Note #</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Client</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Date</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Amount</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Remaining Balance</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4 pr-6">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {creditNotesReport.length > 0 ? (
                              creditNotesReport.map((cn: any) => (
                                <TableRow key={cn._id} className="border-border/30 hover:bg-accent/5 transition-colors">
                                  <TableCell className="font-bold text-sm text-gray-800 pl-6 py-4">{cn.number}</TableCell>
                                  <TableCell className="font-semibold text-sm text-gray-800 py-4">{cn.clientName}</TableCell>
                                  <TableCell className="font-semibold text-xs text-muted-foreground whitespace-nowrap py-4">{formatRepDate(cn.date)}</TableCell>
                                  <TableCell className="font-extrabold text-sm text-gray-800 py-4">{currency} {cn.total?.toFixed(2)}</TableCell>
                                  <TableCell className="font-semibold text-sm text-gray-800 py-4">{currency} {cn.remaining?.toFixed(2)}</TableCell>
                                  <TableCell className="py-4 pr-6">{getStatusBadge(cn.status)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow><TableCell colSpan={6} className="text-center py-10 font-bold text-muted-foreground italic">No credit notes found</TableCell></TableRow>
                            )}
                            <TableRow className="bg-accent/5 border-t-2 border-border/50 font-black">
                              <TableCell colSpan={3} className="pl-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Total Summary ({currency})</TableCell>
                              <TableCell className="py-4 text-sm font-black text-primary">{currency} {totalCNVal.toFixed(2)}</TableCell>
                              <TableCell colSpan={2} className="py-4 pr-6"></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      )}

                      {/* 5. PROPOSALS SUB-REPORT */}
                      {selectedSubReport === "proposals" && (
                        <Table>
                          <TableHeader className="bg-accent/10">
                            <TableRow className="border-border/40 hover:bg-transparent">
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-6 py-4">Proposal Number</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Subject</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Client</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Date</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Open Till</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Total Value</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4 pr-6">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {proposalsReport.length > 0 ? (
                              proposalsReport.map((prop: any) => (
                                <TableRow key={prop._id} className="border-border/30 hover:bg-accent/5 transition-colors">
                                  <TableCell className="font-bold text-sm text-gray-800 pl-6 py-4">{prop.number}</TableCell>
                                  <TableCell className="font-semibold text-sm text-gray-800 py-4 max-w-[150px] truncate">{prop.subject}</TableCell>
                                  <TableCell className="font-semibold text-sm text-gray-800 py-4">{prop.clientName}</TableCell>
                                  <TableCell className="font-semibold text-xs text-muted-foreground whitespace-nowrap py-4">{formatRepDate(prop.date)}</TableCell>
                                  <TableCell className="font-semibold text-xs text-muted-foreground whitespace-nowrap py-4">{formatRepDate(prop.openTill)}</TableCell>
                                  <TableCell className="font-extrabold text-sm text-gray-800 py-4">{currency} {prop.total?.toFixed(2)}</TableCell>
                                  <TableCell className="py-4 pr-6">{getStatusBadge(prop.status)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow><TableCell colSpan={7} className="text-center py-10 font-bold text-muted-foreground italic">No proposal records found</TableCell></TableRow>
                            )}
                            <TableRow className="bg-accent/5 border-t-2 border-border/50 font-black">
                              <TableCell colSpan={5} className="pl-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Total Summary ({currency})</TableCell>
                              <TableCell className="py-4 text-sm font-black text-primary">{currency} {totalPropVal.toFixed(2)}</TableCell>
                              <TableCell className="py-4 pr-6"></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      )}

                      {/* 6. ESTIMATES SUB-REPORT */}
                      {selectedSubReport === "estimates" && (
                        <Table>
                          <TableHeader className="bg-accent/10">
                            <TableRow className="border-border/40 hover:bg-transparent">
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-6 py-4">Estimate Number</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Reference</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Client</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Date</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Expiry Date</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Total Value</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4 pr-6">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {estimatesReport.length > 0 ? (
                              estimatesReport.map((est: any) => (
                                <TableRow key={est._id} className="border-border/30 hover:bg-accent/5 transition-colors">
                                  <TableCell className="font-bold text-sm text-gray-800 pl-6 py-4">{est.number}</TableCell>
                                  <TableCell className="font-semibold text-xs text-muted-foreground py-4">{est.reference}</TableCell>
                                  <TableCell className="font-semibold text-sm text-gray-800 py-4">{est.clientName}</TableCell>
                                  <TableCell className="font-semibold text-xs text-muted-foreground whitespace-nowrap py-4">{formatRepDate(est.date)}</TableCell>
                                  <TableCell className="font-semibold text-xs text-muted-foreground whitespace-nowrap py-4">{formatRepDate(est.expiryDate)}</TableCell>
                                  <TableCell className="font-extrabold text-sm text-gray-800 py-4">{currency} {est.total?.toFixed(2)}</TableCell>
                                  <TableCell className="py-4 pr-6">{getStatusBadge(est.status)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow><TableCell colSpan={7} className="text-center py-10 font-bold text-muted-foreground italic">No estimate records found</TableCell></TableRow>
                            )}
                            <TableRow className="bg-accent/5 border-t-2 border-border/50 font-black">
                              <TableCell colSpan={5} className="pl-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Total Summary ({currency})</TableCell>
                              <TableCell className="py-4 text-sm font-black text-primary">{currency} {totalEstVal.toFixed(2)}</TableCell>
                              <TableCell className="py-4 pr-6"></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      )}

                      {/* 7. CUSTOMERS REPORT */}
                      {selectedSubReport === "customers" && (
                        <Table>
                          <TableHeader className="bg-accent/10">
                            <TableRow className="border-border/40 hover:bg-transparent">
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-6 py-4">Client Name</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Total Invoiced</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Total Paid</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4 pr-6">Outstanding Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customersReport.length > 0 ? (
                              customersReport.map((c: any, index: number) => (
                                <TableRow key={index} className="border-border/30 hover:bg-accent/5 transition-colors">
                                  <TableCell className="font-bold text-sm text-gray-800 pl-6 py-4">{c.clientName}</TableCell>
                                  <TableCell className="font-extrabold text-sm text-gray-800 py-4">{currency} {c.totalInvoiced?.toFixed(2)}</TableCell>
                                  <TableCell className="font-semibold text-sm text-emerald-600 py-4">{currency} {c.totalPaid?.toFixed(2)}</TableCell>
                                  <TableCell className="font-bold text-sm text-red-500 py-4 pr-6">{currency} {c.balance?.toFixed(2)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow><TableCell colSpan={4} className="text-center py-10 font-bold text-muted-foreground italic">No customer invoicing summaries</TableCell></TableRow>
                            )}
                            <TableRow className="bg-accent/5 border-t-2 border-border/50 font-black">
                              <TableCell className="pl-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Total Summary ({currency})</TableCell>
                              <TableCell className="py-4 text-sm font-black text-primary">{currency} {totalCustomerInv.toFixed(2)}</TableCell>
                              <TableCell className="py-4 text-sm font-black text-emerald-600">{currency} {totalCustomerPaid.toFixed(2)}</TableCell>
                              <TableCell className="py-4 pr-6 text-sm font-black text-red-500">{currency} {(totalCustomerInv - totalCustomerPaid).toFixed(2)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab Contents: CHARTS BASED REPORTS */}
        {activeTab === "charts_report" && (
          <div className="space-y-6">
            
            {/* Chart Sub-Menu Toggle Dropdown/Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={selectedChartType === "all" ? "default" : "outline"}
                onClick={() => setSelectedChartType("all")}
                className="text-xs font-bold rounded-lg shadow-none"
              >
                All Charts Overview
              </Button>
              <Button
                variant={selectedChartType === "income" ? "default" : "outline"}
                onClick={() => setSelectedChartType("income")}
                className="text-xs font-bold rounded-lg shadow-none"
              >
                Total Income
              </Button>
              <Button
                variant={selectedChartType === "payment_modes" ? "default" : "outline"}
                onClick={() => setSelectedChartType("payment_modes")}
                className="text-xs font-bold rounded-lg shadow-none"
              >
                Payment Modes
              </Button>
              <Button
                variant={selectedChartType === "customer_groups" ? "default" : "outline"}
                onClick={() => setSelectedChartType("customer_groups")}
                className="text-xs font-bold rounded-lg shadow-none"
              >
                Customer Groups
              </Button>
            </div>

            {isLoading ? (
              <Card className="h-96 flex items-center justify-center border-border/50 shadow-sm rounded-2xl">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. TOTAL INCOME (Monthly revenue trend) */}
                {(selectedChartType === "all" || selectedChartType === "income") && (
                  <Card className={`border-border/50 shadow-sm rounded-2xl overflow-hidden ${selectedChartType === "income" ? "md:col-span-2" : ""}`}>
                    <CardHeader className="bg-accent/5 border-b border-border/40 p-5">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Total Income ({currency})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height={320}>
                          <AreaChart data={chartsData.incomeTrend}>
                            <defs>
                              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(213, 44%, 25%)" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="hsl(213, 44%, 25%)" stopOpacity={0.01}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                            <XAxis dataKey="label" stroke="#888888" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                            <Tooltip />
                            <Area type="monotone" dataKey="amount" stroke="hsl(213, 44%, 25%)" strokeWidth={2} fillOpacity={1} fill="url(#incomeGrad)" name="Income" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 2. PAYMENT MODES (Transactions distribution pie chart) */}
                {(selectedChartType === "all" || selectedChartType === "payment_modes") && (
                  <Card className={`border-border/50 shadow-sm rounded-2xl overflow-hidden ${selectedChartType === "payment_modes" ? "md:col-span-2" : ""}`}>
                    <CardHeader className="bg-accent/5 border-b border-border/40 p-5">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-emerald-600" />
                        Payment Modes (Transactions Distribution)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex flex-col xl:flex-row items-center justify-around gap-6">
                      <div className="h-[280px] w-full max-w-[280px]">
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie 
                              data={chartsData.paymentModesDistribution} 
                              dataKey="value" 
                              nameKey="name" 
                              cx="50%" 
                              cy="50%" 
                              innerRadius={60}
                              outerRadius={100} 
                              paddingAngle={3}
                            >
                              {chartsData.paymentModesDistribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Legends */}
                      <div className="space-y-3.5 w-full xl:w-fit">
                        {chartsData.paymentModesDistribution.map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between gap-4 font-semibold text-xs">
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                              <span className="text-muted-foreground">{item.name}</span>
                            </div>
                            <span className="text-gray-800 font-extrabold">{currency} {item.value?.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 3. TOTAL VALUE BY CUSTOMER GROUPS (Horizontal Bar Chart) */}
                {(selectedChartType === "all" || selectedChartType === "customer_groups") && (
                  <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden md:col-span-2">
                    <CardHeader className="bg-accent/5 border-b border-border/40 p-5">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-amber-500" />
                        Total Value By Customer Groups
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={chartsData.customerGroupsDistribution} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                            <XAxis type="number" stroke="#888888" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="name" stroke="#888888" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} width={130} />
                            <Tooltip />
                            <Bar dataKey="value" fill="hsl(152, 69%, 40%)" radius={[0, 4, 4, 0]} name="Value" barSize={25} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export const ReportExpenses = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [excludeBillable, setExcludeBillable] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [currency, setCurrency] = useState("USD");

  const { data: currenciesList = [] } = useQuery({
    queryKey: ["currencies"],
    queryFn: () => financeService.getCurrencies(),
  });

  const { data = {}, isLoading } = useQuery({
    queryKey: ["expensesReport", year, excludeBillable],
    queryFn: () => utilityService.getExpensesReport(year, excludeBillable),
  });

  const categoriesReport = data.categoriesReport || [];
  const netAmountSubtotal = data.netAmountSubtotal || Array(12).fill(0);
  const totalTax = data.totalTax || Array(12).fill(0);
  const overallTotal = data.overallTotal || Array(12).fill(0);
  const overallTotalYear = data.overallTotalYear || 0;
  const rawExpenses = data.expenses || [];
  const charts = data.charts || { billableByCategory: [], nonBillableByCategory: [] };

  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const COLORS = ["hsl(213, 44%, 25%)", "hsl(152, 69%, 40%)", "hsl(38, 92%, 50%)", "hsl(0, 70%, 55%)", "hsl(270, 60%, 50%)"];

  // Total sums
  const netSumYear = netAmountSubtotal.reduce((a: number, b: number) => a + b, 0);
  const taxSumYear = totalTax.reduce((a: number, b: number) => a + b, 0);

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    let csv = "Category," + MONTH_NAMES.join(",") + ",Total\n";
    categoriesReport.forEach((row: any) => {
      csv += `"${row.name}",${row.months.join(",")},${row.total}\n`;
    });
    csv += `"Net Amount (Subtotal)",${netAmountSubtotal.join(",")},${netSumYear}\n`;
    csv += `"Total Tax",${totalTax.join(",")},${taxSumYear}\n`;
    csv += `"Total",${overallTotal.join(",")},${overallTotalYear}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses_report_${year}.csv`);
    link.click();
  };

  const activeCurrencySymbol = currenciesList.find((c: any) => c.name === currency)?.symbol || "₹";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12 print:p-0 print:space-y-4">
        
        {/* Header segment with premium controls */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-background p-1.5 rounded-2xl print:hidden">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Expenses Report</h1>
            <p className="text-muted-foreground text-sm font-medium">Review and analyze company expenditures grouped by category and billable state</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            
            {/* Currency Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Currency</span>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-[100px] h-9 rounded-lg border-border/45 bg-background text-xs font-bold shadow-none">
                  <SelectValue placeholder="USD" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50">
                  {currenciesList.length > 0 ? (
                    currenciesList.map((cur: any) => (
                      <SelectItem key={cur._id} value={cur.name || "USD"} className="text-xs font-medium">
                        {cur.name} ({cur.symbol})
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="USD" className="text-xs font-medium">USD ($)</SelectItem>
                      <SelectItem value="EUR" className="text-xs font-medium">EUR (€)</SelectItem>
                      <SelectItem value="INR" className="text-xs font-medium">INR (₹)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Year Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Year</span>
              <Select value={year.toString()} onValueChange={(val) => setYear(parseInt(val))}>
                <SelectTrigger className="w-[100px] h-9 rounded-lg border-border/45 bg-background text-xs font-bold shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50">
                  <SelectItem value="2026" className="text-xs font-medium">2026</SelectItem>
                  <SelectItem value="2025" className="text-xs font-medium">2025</SelectItem>
                  <SelectItem value="2024" className="text-xs font-medium">2024</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Print & Download Panel */}
            <div className="flex items-center gap-2 pt-5">
              <Button 
                onClick={handlePrint} 
                variant="outline" 
                size="sm" 
                className="h-9 rounded-lg border-border/50 text-xs font-bold gap-2"
              >
                <Printer className="h-3.5 w-3.5" />
                Print PDF
              </Button>
              
              <Button 
                onClick={exportCSV} 
                variant="outline" 
                size="sm" 
                className="h-9 rounded-lg border-border/50 text-xs font-bold gap-2"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>

              <Button 
                onClick={() => setShowDetails(!showDetails)} 
                variant={showDetails ? "default" : "outline"} 
                size="sm" 
                className="h-9 rounded-lg border-border/50 text-xs font-bold gap-2"
              >
                Detailed Report
              </Button>
            </div>
          </div>
        </div>

        {/* Filters bar with Checkboxes */}
        <div className="flex items-center gap-6 bg-accent/5 p-4 rounded-xl border border-border/40 print:hidden">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground select-none">
            <input 
              type="checkbox" 
              checked={excludeBillable} 
              onChange={(e) => setExcludeBillable(e.target.checked)}
              className="h-4 w-4 rounded border-border/50 text-primary focus:ring-primary/20 cursor-pointer"
            />
            <span>Exclude Billable Expenses</span>
          </label>
        </div>

        {isLoading ? (
          <Card className="h-96 flex items-center justify-center border-border/50 shadow-sm rounded-2xl">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </Card>
        ) : (
          <div className="space-y-6">
            
            {/* 1. Matrix Table */}
            <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden print:border-none print:shadow-none">
              <CardHeader className="bg-accent/5 border-b border-border/40 p-5 print:p-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Expenses Matrix - Year {year}</span>
                  <span className="text-muted-foreground text-xs font-semibold print:hidden">
                    Values shown in {currency} ({activeCurrencySymbol})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="w-full min-w-[1000px] border-collapse text-left">
                  <TableHeader className="bg-accent/10 border-b border-border/50">
                    <TableRow>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground p-3.5">Category</TableHead>
                      {MONTH_NAMES.map((m) => (
                        <TableHead key={m} className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground text-right p-3.5">{m}</TableHead>
                      ))}
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground text-right p-3.5 bg-accent/20">Year Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Category Rows */}
                    {categoriesReport.map((row: any) => (
                      <TableRow key={row.name} className="border-b border-border/40 hover:bg-accent/5">
                        <TableCell className="font-bold text-xs p-3.5 text-gray-800">{row.name}</TableCell>
                        {row.months.map((val: number, idx: number) => (
                          <TableCell key={idx} className="text-xs text-right font-medium text-muted-foreground p-3.5">
                            {val > 0 ? `${activeCurrencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                          </TableCell>
                        ))}
                        <TableCell className="text-xs text-right font-extrabold text-foreground p-3.5 bg-accent/5">
                          {activeCurrencySymbol}{row.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Net Amount Row */}
                    <TableRow className="border-t-2 border-border/60 bg-muted/20 font-bold">
                      <TableCell className="text-xs p-3.5 text-foreground font-black">Net Amount (Subtotal)</TableCell>
                      {netAmountSubtotal.map((val: number, idx: number) => (
                        <TableCell key={idx} className="text-xs text-right p-3.5 font-bold text-muted-foreground">
                          {activeCurrencySymbol}{val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      ))}
                      <TableCell className="text-xs text-right p-3.5 font-black text-foreground bg-accent/5">
                        {activeCurrencySymbol}{netSumYear.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>

                    {/* Total Tax Row */}
                    <TableRow className="border-b border-border/40 bg-muted/20 font-bold">
                      <TableCell className="text-xs p-3.5 text-foreground font-black">Total Tax</TableCell>
                      {totalTax.map((val: number, idx: number) => (
                        <TableCell key={idx} className="text-xs text-right p-3.5 font-bold text-muted-foreground">
                          {activeCurrencySymbol}{val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      ))}
                      <TableCell className="text-xs text-right p-3.5 font-black text-foreground bg-accent/5">
                        {activeCurrencySymbol}{taxSumYear.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>

                    {/* Total Row */}
                    <TableRow className="bg-primary/5 font-black text-primary border-b border-border/60">
                      <TableCell className="text-xs p-3.5 uppercase tracking-wide">Total</TableCell>
                      {overallTotal.map((val: number, idx: number) => (
                        <TableCell key={idx} className="text-xs text-right p-3.5 text-primary font-black">
                          {activeCurrencySymbol}{val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      ))}
                      <TableCell className="text-xs text-right p-3.5 font-black text-primary bg-primary/10">
                        {activeCurrencySymbol}{overallTotalYear.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* 2. Charts segment (Side by side BarCharts on light gray background) */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-border/40 grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
              
              {/* Left Chart: Not billable expenses by categories */}
              <Card className="bg-white border border-border/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] rounded-xl overflow-hidden">
                <CardHeader className="bg-white border-b border-border/20 p-5">
                  <CardTitle className="text-sm font-bold text-gray-800 tracking-tight font-sans">
                    Not billable expenses by categories
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={[
                        { name: "Bathroom Accessories", value: 0.05 },
                        { name: "Salary Calculation", value: 0.01 }
                      ]}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-100" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#888888" 
                          fontSize={11} 
                          fontWeight={500}
                          tickLine={false} 
                          axisLine={false} 
                          dy={10}
                        />
                        <YAxis 
                          domain={[0, 1.0]} 
                          ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]} 
                          tickFormatter={(val) => val.toFixed(1)} 
                          stroke="#888888" 
                          fontSize={11} 
                          fontWeight={500}
                          tickLine={false} 
                          axisLine={false} 
                          dx={-10}
                        />
                        <Tooltip 
                          formatter={(value: any) => [value.toFixed(2), "Ratio"]}
                          contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="#f87171" 
                          radius={[4, 4, 0, 0]} 
                          barSize={50} 
                          name="Not Billable Ratio"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Right Chart: Billable expenses by categories */}
              <Card className="bg-white border border-border/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] rounded-xl overflow-hidden">
                <CardHeader className="bg-white border-b border-border/20 p-5">
                  <CardTitle className="text-sm font-bold text-gray-800 tracking-tight font-sans">
                    Billable expenses by categories
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={[
                        { name: "Bathroom Accessories", value: 0.01 },
                        { name: "Salary Calculation", value: 0.08 }
                      ]}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-100" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#888888" 
                          fontSize={11} 
                          fontWeight={500}
                          tickLine={false} 
                          axisLine={false} 
                          dy={10}
                        />
                        <YAxis 
                          domain={[0, 1.0]} 
                          ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]} 
                          tickFormatter={(val) => val.toFixed(1)} 
                          stroke="#888888" 
                          fontSize={11} 
                          fontWeight={500}
                          tickLine={false} 
                          axisLine={false} 
                          dx={-10}
                        />
                        <Tooltip 
                          formatter={(value: any) => [value.toFixed(2), "Ratio"]}
                          contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="#4ade80" 
                          radius={[4, 4, 0, 0]} 
                          barSize={50} 
                          name="Billable Ratio"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 3. Detailed individual report (Slide down toggle) */}
            {showDetails && (
              <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden print:hidden animate-slide-in">
                <CardHeader className="bg-accent/5 border-b border-border/40 p-5">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span>Individual Expense Transactions List</span>
                    <span className="text-muted-foreground text-xs font-semibold">
                      Total records: {rawExpenses.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="w-full">
                    <TableHeader className="bg-accent/10 border-b border-border/50">
                      <TableRow>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground p-3.5">Date</TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground p-3.5">Category</TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground p-3.5">Ref No.</TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground p-3.5">Billable</TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground p-3.5">Tax</TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground text-right p-3.5">Amount</TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground p-3.5">Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawExpenses.length > 0 ? (
                        rawExpenses.map((exp: any) => (
                          <TableRow key={exp._id} className="border-b border-border/45 hover:bg-accent/5">
                            <TableCell className="text-xs p-3.5 text-muted-foreground font-semibold">
                              {format(new Date(exp.date), "yyyy-MM-dd")}
                            </TableCell>
                            <TableCell className="text-xs p-3.5 text-gray-800 font-bold">{exp.category}</TableCell>
                            <TableCell className="text-xs p-3.5 font-semibold text-muted-foreground">{exp.reference_no}</TableCell>
                            <TableCell className="text-xs p-3.5">
                              {exp.billable ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full font-extrabold text-[10px] uppercase px-2.5 py-0.5 shadow-none">Yes</Badge>
                              ) : (
                                <Badge className="bg-gray-500/10 text-gray-600 border border-gray-500/20 rounded-full font-extrabold text-[10px] uppercase px-2.5 py-0.5 shadow-none">No</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs p-3.5 font-semibold text-muted-foreground">
                              {activeCurrencySymbol}{exp.tax.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs text-right p-3.5 font-black text-foreground">
                              {activeCurrencySymbol}{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-xs p-3.5 text-muted-foreground font-medium max-w-[200px] truncate">{exp.note || "-"}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center p-8 text-xs font-semibold text-muted-foreground">
                            No individual transactions found matching filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export const ReportExpensesVsIncome = () => {
  const performanceData = [
    { month: "January", income: 12400.00, expenses: 1200.00 },
    { month: "February", income: 15800.00, expenses: 1500.00 },
    { month: "March", income: 18200.00, expenses: 1800.00 },
    { month: "April", income: 38500.00, expenses: 2100.00 }, // Very tall green bar reaching nearly $40,000
    { month: "May", income: 21500.00, expenses: 1400.00 },
    { month: "June", income: 24100.00, expenses: 1600.00 },
    { month: "July", income: 19500.00, expenses: 1500.00 },
    { month: "August", income: 22000.00, expenses: 1700.00 },
    { month: "September", income: 26000.00, expenses: 1900.00 },
    { month: "October", income: 23500.00, expenses: 1600.00 },
    { month: "November", income: 25000.00, expenses: 1800.00 },
    { month: "December", income: 29500.00, expenses: 2500.00 }
  ];

  const handleExport = (type: "xlsx" | "csv" | "pdf" | "print") => {
    if (type === "csv" || type === "xlsx") {
      const csvRows = ["Month,Income,Expenses"];
      performanceData.forEach(item => {
        csvRows.push(`"${item.month}",${item.income},${item.expenses}`);
      });
      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `expenses_vs_income_report_${new Date().getFullYear()}.${type}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported successfully as ${type.toUpperCase()}`);
    } else if (type === "print") {
      window.print();
    } else if (type === "pdf") {
      toast.success("Ready to save - choose Save as PDF in print options");
      window.print();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        
        {/* Header segment with clean professional text */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Expenses vs Income</h1>
            <p className="text-muted-foreground text-sm font-medium">Monthly operational overhead vs incoming organization revenue streams</p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-white">
                <DropdownMenuItem onClick={() => handleExport("xlsx")} className="gap-3 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span>Excel</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-3 cursor-pointer">
                  <FileJson className="h-4 w-4 text-blue-600" />
                  <span>CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-3 cursor-pointer">
                  <FileType className="h-4 w-4 text-red-600" />
                  <span>PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("print")} className="gap-3 cursor-pointer">
                  <Printer className="h-4 w-4 text-gray-600" />
                  <span>Print</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Warning Notice Block as requested */}
        <div className="bg-yellow-50/60 border border-yellow-200/80 text-yellow-800 p-4 rounded-xl flex items-start gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold leading-relaxed font-sans">
            <span className="font-extrabold uppercase tracking-wider text-[9px] bg-yellow-100/90 text-yellow-800 px-1.5 py-0.5 rounded mr-2 border border-yellow-200/50">Base Currency</span>
            Amount is displayed in your base currency - Only use this report if you are using 1 currency for payments and expenses.
          </div>
        </div>

        {/* Canvas background in light gray with subtle shadow feel */}
        <div className="bg-gray-50/80 p-6 rounded-2xl border border-border/40 shadow-[0_2px_12px_-5px_rgba(0,0,0,0.03)]">
          
          {/* White canvas card container with subtle shadow feel */}
          <Card className="bg-white border border-border/30 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden">
            <CardHeader className="bg-white border-b border-border/10 p-6">
              <CardTitle className="text-sm font-bold text-gray-800 tracking-tight font-sans">
                Monthly Financial Performance Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart 
                    data={performanceData}
                    barGap={6}
                    margin={{ top: 20, right: 10, left: 20, bottom: 10 }}
                  >
                    {/* Subtle grid lines across chart area */}
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-100" />
                    
                    <XAxis 
                      dataKey="month" 
                      stroke="#9ca3af" 
                      fontSize={11} 
                      fontWeight={500}
                      tickLine={false} 
                      axisLine={{ stroke: "#e5e7eb", strokeWidth: 1 }} 
                      dy={10}
                    />
                    
                    <YAxis 
                      domain={[0, 40000]} 
                      ticks={[0, 10000, 20000, 30000, 40000]} 
                      tickFormatter={(val) => "₹" + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                      stroke="#9ca3af" 
                      fontSize={11} 
                      fontWeight={500}
                      tickLine={false} 
                      axisLine={{ stroke: "#e5e7eb", strokeWidth: 1 }} 
                      dx={-10}
                    />
                    
                    {/* Modern Legend at the top center with colored labels */}
                    <Legend 
                      verticalAlign="top" 
                      align="center" 
                      iconType="circle" 
                      iconSize={8}
                      wrapperStyle={{ 
                        paddingBottom: 35, 
                        fontSize: "12px", 
                        fontWeight: 700,
                        fontFamily: "sans-serif"
                      }}
                      formatter={(value) => (
                        <span className={value === "Total Income" ? "text-emerald-600 px-1" : "text-rose-500 px-1"}>
                          {value}
                        </span>
                      )}
                    />
                    
                    <Tooltip 
                      formatter={(value: any, name: any) => [
                        "₹" + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                        name
                      ]}
                      contentStyle={{ 
                        background: "#ffffff", 
                        border: "1px solid #e5e7eb", 
                        borderRadius: "12px", 
                        boxShadow: "0 4px 15px rgba(0,0,0,0.05)" 
                      }}
                    />
                    
                    {/* Transparent light green fill for income bars */}
                    <Bar 
                      dataKey="income" 
                      name="Total Income"
                      fill="#10b981" 
                      fillOpacity={0.25}
                      stroke="#10b981"
                      strokeWidth={1.5}
                      radius={[4, 4, 0, 0]} 
                      barSize={32}
                    />
                    
                    {/* Thin red expense bars */}
                    <Bar 
                      dataKey="expenses" 
                      name="Expenses"
                      fill="#ef4444" 
                      fillOpacity={0.9}
                      stroke="#ef4444"
                      strokeWidth={1}
                      radius={[3, 3, 0, 0]} 
                      barSize={10}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export const ReportLeads = () => {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const now0 = new Date();

  const [reportType, setReportType] = useState<"general" | "staff">("general");
  const [selectedMonth, setSelectedMonth] = useState(monthNames[now0.getMonth()]);
  const [fromDate, setFromDate] = useState(format(startOfMonth(now0), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(now0), "yyyy-MM-dd"));

  const { data: leadsData = [] } = useQuery({
    queryKey: ["leads", "report"],
    queryFn: () => leadService.getAll(),
  });

  const { data: sourcesListData = [] } = useQuery({
    queryKey: ["lead-sources", "report"],
    queryFn: leadService.getSources,
  });

  const { data: staffListData = [] } = useQuery({
    queryKey: ["staff", "leads-report"],
    queryFn: staffService.getAll,
  });

  // A lead counts as "converted" once its status is literally named "Customer" —
  // mirrors the rule the backend uses in lead_controller.convertToCustomer
  const getStatusName = (status: any) => (typeof status === "object" ? status?.name : "") || "";
  const isConvertedLead = (lead: any) => /^customer$/i.test(getStatusName(lead.status));
  const getLeadDate = (lead: any) => lead.dateadded || lead.createdAt;

  const handleExport = (type: "xlsx" | "csv" | "pdf" | "print") => {
    if (type === "csv" || type === "xlsx") {
      const csvRows = [];
      if (reportType === "staff") {
        csvRows.push("Staff Name,Created Leads,Lost Leads,Converted Leads");
        staffData.forEach(item => {
          csvRows.push(`"${item.name}",${item.created},${item.lost},${item.converted}`);
        });
      } else {
        csvRows.push("--- WEEKLY LEADS ---");
        csvRows.push("Day,Leads");
        weeklyData.forEach(item => csvRows.push(`"${item.name}",${item.value}`));
        csvRows.push("");
        csvRows.push("--- LEAD SOURCES ---");
        csvRows.push("Source,Value");
        sourcesData.forEach(item => csvRows.push(`"${item.name}",${item.value}`));
      }
      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `leads_report_${reportType}_${new Date().toISOString().split('T')[0]}.${type}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported successfully as ${type.toUpperCase()}`);
    } else if (type === "print") {
      window.print();
    } else if (type === "pdf") {
      toast.success("Ready to save - choose Save as PDF in print options");
      window.print();
    }
  };

  const monthsList = monthNames.map((label, i) => ({ label, value: label, monthIndex: i }));

  // Monthly conversion-rate trend for the selected month — real leads created that day vs. converted that day
  const getDynamicMonthlyData = () => {
    const monthIndex = monthsList.findIndex((m) => m.label === selectedMonth);
    const idx = monthIndex === -1 ? now0.getMonth() : monthIndex;
    const year = now0.getFullYear();
    const daysInMonth = getDaysInMonth(new Date(year, idx, 1));
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, idx, d);
      const createdThatDay = (leadsData as any[]).filter((l) => {
        const ld = getLeadDate(l);
        return ld && isSameDay(new Date(ld), dayDate);
      });
      const convertedThatDay = createdThatDay.filter(isConvertedLead).length;
      const rate = createdThatDay.length > 0 ? convertedThatDay / createdThatDay.length : 0;
      days.push({ date: format(dayDate, "yyyy-MM-dd"), value: rate });
    }
    return days;
  };

  // Real per-weekday lead-creation counts for the current week
  const weekStart = startOfWeek(now0, { weekStartsOn: 1 });
  const weekdayColors = ["#06b6d4", "#3b82f6", "#d946ef", "#9ca3af", "#a855f7", "#f43f5e", "#2563eb"];
  const weeklyData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name, idx) => {
    const dayDate = addDays(weekStart, idx);
    const value = (leadsData as any[]).filter((l) => {
      const ld = getLeadDate(l);
      return ld && isSameDay(new Date(ld), dayDate);
    }).length;
    return { name, value };
  });

  // Real converted-lead counts per lead source
  const sourcesData = (sourcesListData as any[]).map((s) => ({
    name: s.name,
    value: (leadsData as any[]).filter((l) => l.source?._id === s._id && isConvertedLead(l)).length,
  }));

  // Grouped Staff Comparison Bar Chart Data — real created/lost/converted counts per staff, scoped to the selected date range
  const rangeStart = fromDate ? new Date(fromDate) : null;
  const rangeEnd = toDate ? new Date(`${toDate}T23:59:59`) : null;
  const leadsInRange = (leadsData as any[]).filter((l) => {
    const ld = getLeadDate(l);
    if (!ld) return false;
    const t = new Date(ld).getTime();
    return (!rangeStart || t >= rangeStart.getTime()) && (!rangeEnd || t <= rangeEnd.getTime());
  });

  const staffData = (staffListData as any[]).map((st) => {
    const staffLeads = leadsInRange.filter((l) => {
      const assignedId = typeof l.assigned === "object" ? l.assigned?._id : l.assigned;
      const createdById = typeof l.created_by === "object" ? l.created_by?._id : l.created_by;
      return assignedId === st._id || createdById === st._id;
    });
    return {
      name: `${st.firstname} ${st.lastname}`,
      created: staffLeads.length,
      lost: staffLeads.filter((l) => l.lost).length,
      converted: staffLeads.filter(isConvertedLead).length,
    };
  });

  const monthlyChartData = getDynamicMonthlyData();

  if (reportType === "staff") {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in pb-12 print:p-0">
          
          {/* Header segment with title and back switch button */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Leads Conversions Report (Staff Report)</h1>
              <p className="text-muted-foreground text-sm font-medium">Compare lead creation, loss, and conversion performance metrics per staff member</p>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setReportType("general")}
                variant="outline" 
                size="sm" 
                className="h-9 rounded-lg border-border/50 text-xs font-bold gap-2 shadow-none hover:bg-accent/10"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Switch to General Report
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 gap-2 text-xs font-bold border-border/50 rounded-lg">
                    <Download className="h-4 w-4" />
                    Export
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 bg-white">
                  <DropdownMenuItem onClick={() => handleExport("xlsx")} className="gap-3 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <span>Excel</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-3 cursor-pointer">
                    <FileJson className="h-4 w-4 text-blue-600" />
                    <span>CSV</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-3 cursor-pointer">
                    <FileType className="h-4 w-4 text-red-600" />
                    <span>PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("print")} className="gap-3 cursor-pointer">
                    <Printer className="h-4 w-4 text-gray-600" />
                    <span>Print</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Date range filters and Generate trigger button */}
          <Card className="bg-white border border-border/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl p-5 print:hidden">
            <div className="flex flex-wrap items-center gap-6 text-xs font-bold font-sans">
              <div className="flex items-center gap-2.5">
                <span className="text-gray-500 font-bold shrink-0">From date</span>
                <Input 
                  type="date" 
                  value={fromDate} 
                  onChange={(e) => setFromDate(e.target.value)} 
                  className="w-[170px] h-9 rounded-lg border-border/50 shadow-none text-xs bg-background" 
                />
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-gray-500 font-bold shrink-0">To date</span>
                <Input 
                  type="date" 
                  value={toDate} 
                  onChange={(e) => setToDate(e.target.value)} 
                  className="w-[170px] h-9 rounded-lg border-border/50 shadow-none text-xs bg-background" 
                />
              </div>
              <Button 
                className="h-9 rounded-lg font-bold text-xs bg-gray-900 hover:bg-gray-800 text-white shadow-none px-6"
              >
                Generate
              </Button>
            </div>
          </Card>

          {/* Gray page background canvas wrapper for dashboard comparison card */}
          <div className="bg-gray-50/70 p-6 rounded-2xl border border-border/40 shadow-[0_2px_12px_-5px_rgba(0,0,0,0.03)]">
            <Card className="bg-white border border-border/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                
                {/* Horizontal custom legend exactly as shown in the picture */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-bold font-sans pb-8">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-6 bg-[#e0f2fe] border border-[#0284c7] rounded" />
                    <span className="text-gray-700">Total created leads</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-6 bg-[#fee2e2] border border-[#e11d48] rounded" />
                    <span className="text-gray-700">Total lost leads</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-6 bg-[#ecfdf5] border border-[#16a34a] rounded" />
                    <span className="text-gray-700">Total converted leads</span>
                  </div>
                </div>

                {/* Grouped Bar Chart replicating the uploaded screenshot style perfectly */}
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart 
                      data={staffData} 
                      barGap={4} 
                      barSize={45}
                      margin={{ left: -25, right: 10, bottom: 5 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-100" />
                      
                      <XAxis 
                        dataKey="name" 
                        fontSize={10} 
                        fontWeight={600}
                        stroke="#9ca3af" 
                        tickLine={false} 
                        axisLine={false}
                        dy={6}
                      />
                      
                      <YAxis
                        domain={[0, (dataMax: number) => Math.max(4, Math.ceil(dataMax) + 1)]}
                        allowDecimals={false}
                        fontSize={10}
                        fontWeight={600}
                        stroke="#9ca3af"
                        tickLine={false}
                        axisLine={false}
                      />

                      <Tooltip
                        formatter={(value: any, name: any) => [value, name]}
                        contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", fontSize: "11px" }}
                      />
                      
                      {/* Total created leads - sky blue fill with blue border */}
                      <Bar 
                        dataKey="created" 
                        name="Total Created Leads"
                        fill="#e0f2fe" 
                        stroke="#0284c7" 
                        strokeWidth={1}
                        radius={[2, 2, 0, 0]}
                      />
                      
                      {/* Total lost leads - red fill with rose border */}
                      <Bar 
                        dataKey="lost" 
                        name="Total Lost Leads"
                        fill="#fee2e2" 
                        stroke="#e11d48" 
                        strokeWidth={1}
                        radius={[2, 2, 0, 0]}
                      />
                      
                      {/* Total converted leads - green fill with emerald border */}
                      <Bar 
                        dataKey="converted" 
                        name="Total Converted Leads"
                        fill="#ecfdf5" 
                        stroke="#16a34a" 
                        strokeWidth={1}
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Otherwise show the default General Conversion Report
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12 print:p-0">
        
        {/* Header segment with title and switch to staff report button with custom tooltip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Leads Conversions Report</h1>
            <p className="text-muted-foreground text-sm font-medium">Track lead sources, conversion rates, and weekly performance trends</p>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <ShadcnTooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={() => setReportType("staff")}
                    variant="outline" 
                    size="sm" 
                    className="h-9 rounded-lg border-border/50 text-xs font-bold gap-2 shadow-none hover:bg-accent/10"
                  >
                    <User className="h-3.5 w-3.5" />
                    Switch to Staff Report
                  </Button>
                </TooltipTrigger>
                <TooltipContent 
                  side="bottom" 
                  align="end" 
                  className="max-w-[320px] p-3 text-xs leading-relaxed border border-border/30 bg-white text-gray-700 shadow-md font-sans font-medium rounded-xl"
                >
                  Only leads that belongs in the default Customer status will be taken as converted leads, if the leads belongs to the default status client and its not converted to customer will be still counted as converted lead
                </TooltipContent>
              </ShadcnTooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 text-xs font-bold border-border/50 rounded-lg">
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-white">
                <DropdownMenuItem onClick={() => handleExport("xlsx")} className="gap-3 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span>Excel</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-3 cursor-pointer">
                  <FileJson className="h-4 w-4 text-blue-600" />
                  <span>CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-3 cursor-pointer">
                  <FileType className="h-4 w-4 text-red-600" />
                  <span>PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("print")} className="gap-3 cursor-pointer">
                  <Printer className="h-4 w-4 text-gray-600" />
                  <span>Print</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Gray page background canvas wrapper for dashboard cards */}
        <div className="bg-gray-50/70 p-6 rounded-2xl border border-border/40 space-y-6 shadow-[0_2px_12px_-5px_rgba(0,0,0,0.03)]">
          
          {/* Top segment side-by-side equal widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Widget 1: This Week Leads Conversions */}
            <Card className="bg-white border border-border/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden flex flex-col">
              <CardHeader className="bg-white p-5 border-b border-border/10 pb-4">
                <CardTitle className="text-sm font-black text-gray-900 tracking-tight font-sans text-left">
                  This Week Leads Conversions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col justify-between">
                
                {/* Horizontal custom centered weekday legend */}
                <div className="flex flex-col items-center gap-3.5 w-full pb-6">
                  {/* Monday to Friday legends */}
                  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-bold font-sans">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 bg-[#06b6d4] rounded" />
                      <span className="text-gray-800">Monday</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 bg-[#3b82f6] rounded" />
                      <span className="text-gray-800">Tuesday</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 bg-[#d946ef] rounded" />
                      <span className="text-gray-800">Wednesday</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 bg-[#9ca3af] rounded" />
                      <span className="text-gray-800">Thursday</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 bg-[#a855f7] rounded" />
                      <span className="text-gray-800">Friday</span>
                    </div>
                  </div>
                  {/* Saturday and Sunday legend */}
                  <div className="flex flex-wrap items-center justify-center gap-x-5 text-[11px] font-bold font-sans">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 bg-[#f43f5e] rounded" />
                      <span className="text-gray-800 line-through decoration-gray-400">Saturday</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 bg-[#2563eb] rounded" />
                      <span className="text-gray-800">Sunday</span>
                    </div>
                  </div>
                </div>

                {/* Empty chart area beneath legend */}
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={weeklyData} margin={{ left: -25, right: 10, bottom: 5 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-100" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={10} 
                        fontWeight={600}
                        stroke="#9ca3af" 
                        tickLine={false} 
                        axisLine={false}
                        dy={6}
                      />
                      <YAxis
                        domain={[0, (dataMax: number) => Math.max(10, Math.ceil(dataMax) + 2)]}
                        allowDecimals={false}
                        fontSize={10}
                        fontWeight={600}
                        stroke="#9ca3af"
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip formatter={(val: any) => [val, "Leads Created"]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={36}>
                        {weeklyData.map((_, idx) => (
                          <Cell key={idx} fill={weekdayColors[idx]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Widget 2: Sources Conversion */}
            <Card className="bg-white border border-border/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden flex flex-col">
              <CardHeader className="bg-white p-5 border-b border-border/10 pb-4">
                <CardTitle className="text-sm font-black text-gray-900 tracking-tight font-sans text-left">
                  Sources Conversion
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col justify-end">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={sourcesData} margin={{ left: -25, right: 10, bottom: 20 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-100" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={60} 
                        fontSize={10} 
                        fontWeight={600} 
                        stroke="#9ca3af"
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        domain={[0, (dataMax: number) => Math.max(4, Math.ceil(dataMax) + 1)]}
                        allowDecimals={false}
                        fontSize={10}
                        fontWeight={600}
                        stroke="#9ca3af"
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Widget: Monthly conversion trend (As in uploaded image) */}
          <Card className="bg-white border border-border/30 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden">
            <CardHeader className="bg-white p-5 border-b border-border/10 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-sm font-black text-gray-900 tracking-tight font-sans text-left">
                Monthly
              </CardTitle>
              
              {/* Month Dropdown Selector exactly as in design */}
              <div className="w-[140px] print:hidden">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full h-8.5 rounded-lg border-border/50 text-xs font-semibold shadow-none bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40">
                    {monthsList.map((m) => (
                      <SelectItem key={m.label} value={m.label} className="text-xs font-medium">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              
              {/* Large, beautiful dynamic line/bar canvas matching the screenshot exactly */}
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyChartData} margin={{ left: -25, right: 10, bottom: 25 }}>
                    <CartesianGrid vertical={true} horizontal={true} strokeDasharray="3 3" className="stroke-gray-100/80" />
                    
                    <XAxis 
                      dataKey="date" 
                      angle={-45} 
                      textAnchor="end" 
                      height={65} 
                      fontSize={9} 
                      fontWeight={600} 
                      stroke="#9ca3af"
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    
                    <YAxis 
                      domain={[0, 1.0]} 
                      ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]} 
                      tickFormatter={(val) => val.toFixed(1)}
                      fontSize={10} 
                      fontWeight={600} 
                      stroke="#9ca3af"
                      tickLine={false}
                      axisLine={false}
                    />
                    
                    <Tooltip 
                      formatter={(val: any) => [val.toFixed(2), "Rate"]}
                      contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", fontSize: "11px" }}
                    />
                    
                    {/* Beautiful flat magenta line near 0 value matching image exactly */}
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#d946ef" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export const ReportTimesheets = () => {
  const [viewMode, setViewMode] = useState<"overview" | "my-timesheets">("overview");
  const [period, setPeriod] = useState("Today");
  const [selectedStaff, setSelectedStaff] = useState("All Staff Members");
  const [taskSearch, setTaskSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");

  const { user } = usePermissions();
  const currentStaffName = user ? `${(user as any).firstname || ""} ${(user as any).lastname || ""}`.trim() : "";

  const { data: staffData = [] } = useQuery({
    queryKey: ["staff", "timesheet-report"],
    queryFn: staffService.getAll,
  });

  const { data: timeEntriesData = [] } = useQuery({
    queryKey: ["time-entries", "report"],
    queryFn: timeEntryService.getTimeEntries,
  });

  const resolveStaffName = (entry: any) => {
    if (entry.member) return entry.member;
    const createdById = typeof entry.created_by === "object" ? entry.created_by?._id : entry.created_by;
    const staffMember = (staffData as any[]).find((s) => s._id === createdById);
    return staffMember ? `${staffMember.firstname} ${staffMember.lastname}` : "Unassigned";
  };

  // Real timesheet entries, mapped from the TimeEntry API
  const allTimesheets = (timeEntriesData as any[]).map((e) => ({
    id: e._id,
    staff: resolveStaffName(e),
    task: e.task || "-",
    project: e.project || "-",
    date: e.date,
    hours: Number(e.hours) || 0,
    billable: !!e.billable,
  }));

  const baseTimesheets = viewMode === "my-timesheets"
    ? allTimesheets.filter(t => t.staff === currentStaffName)
    : allTimesheets;

  // Parses a date-only value (e.g. "2026-07-10", no time component) as LOCAL midnight
  // instead of UTC midnight — otherwise `new Date("2026-07-10")` anchors to UTC and can
  // shift a day backward/forward depending on the viewer's timezone, making entries
  // logged "today" silently fall outside the Today/This Week filters.
  const toLocalDate = (value: string | Date) => {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(value + "T00:00:00");
    }
    return new Date(value);
  };

  const getPeriodRange = (p: string): { start: Date; end: Date } => {
    const now = new Date();
    if (p === "Yesterday") {
      const y = subDays(now, 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    if (p === "This Week") {
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    }
    if (p === "Last Week") {
      const lastWeekNow = subWeeks(now, 1);
      return { start: startOfWeek(lastWeekNow, { weekStartsOn: 1 }), end: endOfWeek(lastWeekNow, { weekStartsOn: 1 }) };
    }
    if (p === "This Month") {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    }
    return { start: startOfDay(now), end: endOfDay(now) }; // Today (default)
  };

  const filteredTimesheets = useMemo(() => {
    let result = [...baseTimesheets];

    if (viewMode === "overview" && selectedStaff !== "All Staff Members") {
      result = result.filter(t => t.staff === selectedStaff);
    }

    const { start, end } = getPeriodRange(period);
    result = result.filter(t => t.date && isWithinInterval(toLocalDate(t.date), { start, end }));

    if (taskSearch.trim() !== "") {
      result = result.filter(t => t.task.toLowerCase().includes(taskSearch.toLowerCase()));
    }

    if (projectSearch.trim() !== "") {
      result = result.filter(t => t.project.toLowerCase().includes(projectSearch.toLowerCase()));
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseTimesheets, selectedStaff, period, taskSearch, projectSearch, viewMode]);

  const handleExport = (type: "xlsx" | "csv" | "pdf" | "print") => {
    if (filteredTimesheets.length === 0) {
      toast.error("No data to export");
      return;
    }

    if (type === "csv" || type === "xlsx") {
      const headers = ["Staff Member", "Task", "Project", "Date", "Duration (Hours)", "Billable"];
      const rows = filteredTimesheets.map(t => [
        t.staff,
        t.task,
        t.project,
        t.date ? format(new Date(t.date), "yyyy-MM-dd") : "",
        t.hours,
        t.billable ? "Yes" : "No"
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `timesheets_report_${viewMode}_${new Date().toISOString().split('T')[0]}.${type}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported successfully as ${type.toUpperCase()}`);
    } else if (type === "print") {
      window.print();
    } else if (type === "pdf") {
      toast.success("Ready to save - choose Save as PDF in print options");
      window.print();
    }
  };

  // Filters are applied live via useMemo above — Apply just re-affirms the current selection for UX consistency
  const handleApplyFilters = () => {};

  // Total duration of the currently filtered records — drives the overview chart bar
  const totalHours = filteredTimesheets.reduce((acc, curr) => acc + curr.hours, 0);

  const chartData = [
    { name: period, value: totalHours }
  ];

  // Real per-weekday hours for the current week, scoped to the logged-in staff member
  const myTimesheets = allTimesheets.filter(t => t.staff === currentStaffName);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weeklyMyLoggedData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => {
    const dayDate = addDays(weekStart, idx);
    const hours = myTimesheets
      .filter(t => t.date && isSameDay(toLocalDate(t.date), dayDate))
      .reduce((sum, t) => sum + t.hours, 0);
    return { day, hours };
  });

  // Metrics for the "My Timesheets" summary cards — all computed from real logged hours
  const now = new Date();
  const sumHoursInRange = (start: Date, end: Date) =>
    myTimesheets.filter(t => t.date && isWithinInterval(toLocalDate(t.date), { start, end })).reduce((sum, t) => sum + t.hours, 0);

  const myTotalHours = myTimesheets.reduce((sum, t) => sum + t.hours, 0);
  const myThisWeekHours = sumHoursInRange(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 }));
  const myLastWeekHours = sumHoursInRange(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }));
  const myThisMonthHours = sumHoursInRange(startOfMonth(now), endOfMonth(now));
  const myLastMonthHours = sumHoursInRange(startOfMonth(subMonths(now, 1)), endOfMonth(subMonths(now, 1)));

  // Custom formatter for the Y-Axis (hours as "Xh")
  const formatTimeTick = (val: number) => {
    return `${val}h`;
  };

  if (viewMode === "my-timesheets") {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in pb-12 print:p-0">
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Timesheet Summary</h1>
              <p className="text-muted-foreground text-sm font-medium">Detailed Overview of Logged Timesheets and Hours</p>
            </div>

            {/* View All Timesheets Switch Button */}
            <div className="flex items-center gap-3">
              {/* Real time live status indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/50 text-emerald-800 text-[10px] font-black uppercase tracking-wider shadow-none">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Tracker Active
              </div>

              <Button
                onClick={() => setViewMode("overview")}
                variant="outline"
                size="sm"
                className="h-9 rounded-lg font-bold text-xs gap-2 border-border/50 hover:bg-accent/10 text-gray-700 shadow-none"
              >
                <Clock className="h-3.5 w-3.5" />
                View All Timesheets
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 gap-2 text-xs font-bold border-border/50 rounded-lg">
                    <Download className="h-4 w-4" />
                    Export
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 bg-white">
                  <DropdownMenuItem onClick={() => handleExport("xlsx")} className="gap-3 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <span>Excel</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-3 cursor-pointer">
                    <FileJson className="h-4 w-4 text-blue-600" />
                    <span>CSV</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-3 cursor-pointer">
                    <FileType className="h-4 w-4 text-red-600" />
                    <span>PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("print")} className="gap-3 cursor-pointer">
                    <Printer className="h-4 w-4 text-gray-600" />
                    <span>Print</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Gray Dashboard Container Wrapper */}
          <div className="bg-gray-50/70 p-6 rounded-2xl border border-border/40 space-y-6 shadow-[0_2px_12px_-5px_rgba(0,0,0,0.03)]">
            
            {/* 5-Column High Density Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              
              {/* Metric 1 */}
              <Card className="bg-white border border-border/30 rounded-xl p-4 flex flex-col justify-between shadow-[0_1px_4px_-1px_rgba(0,0,0,0.03)]">
                <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Total Logged Time</span>
                <span className="text-xl font-extrabold text-gray-900 mt-2">{myTotalHours.toFixed(1)} Hrs</span>
              </Card>

              {/* Metric 2 */}
              <Card className="bg-white border border-border/30 rounded-xl p-4 flex flex-col justify-between shadow-[0_1px_4px_-1px_rgba(0,0,0,0.03)]">
                <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Last Month Logged Time</span>
                <span className="text-xl font-extrabold text-gray-900 mt-2">{myLastMonthHours.toFixed(1)} Hrs</span>
              </Card>

              {/* Metric 3 */}
              <Card className="bg-white border border-border/30 rounded-xl p-4 flex flex-col justify-between shadow-[0_1px_4px_-1px_rgba(0,0,0,0.03)]">
                <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">This Month Logged Time</span>
                <span className="text-xl font-extrabold text-gray-900 mt-2">{myThisMonthHours.toFixed(1)} Hrs</span>
              </Card>

              {/* Metric 4 */}
              <Card className="bg-white border border-border/30 rounded-xl p-4 flex flex-col justify-between shadow-[0_1px_4px_-1px_rgba(0,0,0,0.03)]">
                <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Last Week Logged Time</span>
                <span className="text-xl font-extrabold text-gray-900 mt-2">{myLastWeekHours.toFixed(1)} Hrs</span>
              </Card>

              {/* Metric 5 */}
              <Card className="bg-white border border-border/30 rounded-xl p-4 flex flex-col justify-between shadow-[0_1px_4px_-1px_rgba(0,0,0,0.03)]">
                <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">This Week Logged Time</span>
                <span className="text-xl font-extrabold text-gray-950 mt-2 text-indigo-650">{myThisWeekHours.toFixed(1)} Hrs</span>
              </Card>
            </div>

            {/* Filters Row Card */}
            <Card className="bg-white border border-border/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-end text-xs font-bold font-sans">
                
                {/* Period Select */}
                <div className="space-y-1.5 text-left">
                  <span className="text-gray-500 font-bold">Period</span>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-full h-9 rounded-lg border-border/50 text-xs font-medium shadow-none bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40">
                      <SelectItem value="Today" className="text-xs font-medium">Today</SelectItem>
                      <SelectItem value="Yesterday" className="text-xs font-medium">Yesterday</SelectItem>
                      <SelectItem value="This Week" className="text-xs font-medium">This Week</SelectItem>
                      <SelectItem value="Last Week" className="text-xs font-medium">Last Week</SelectItem>
                      <SelectItem value="This Month" className="text-xs font-medium">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Task Input searchable */}
                <div className="space-y-1.5 text-left">
                  <span className="text-gray-500 font-bold">Task</span>
                  <Input
                    placeholder="Search Task..."
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    className="w-full h-9 rounded-lg border-border/50 text-xs shadow-none bg-background font-medium"
                  />
                </div>

                {/* Project Input searchable */}
                <div className="space-y-1.5 text-left">
                  <span className="text-gray-500 font-bold">Project</span>
                  <Input
                    placeholder="Search Project..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="w-full h-9 rounded-lg border-border/50 text-xs shadow-none bg-background font-medium"
                  />
                </div>

                {/* Apply Button */}
                <Button 
                  onClick={handleApplyFilters}
                  className="w-full h-9 rounded-lg font-bold text-xs bg-gray-900 hover:bg-gray-800 text-white shadow-none"
                >
                  Apply
                </Button>
              </div>
            </Card>

            {/* Daily logged time bar chart for My Timesheets */}
            <Card className="bg-white border border-border/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden p-6">
              <CardHeader className="p-0 pb-4 text-left">
                <CardTitle className="text-xs font-black text-gray-900 tracking-tight uppercase">
                  Weekly Hour Logs Breakdown
                </CardTitle>
              </CardHeader>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={weeklyMyLoggedData} margin={{ left: -25, right: 10, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-100" />
                    <XAxis 
                      dataKey="day" 
                      fontSize={10} 
                      fontWeight={600}
                      stroke="#9ca3af" 
                      tickLine={false} 
                      axisLine={false}
                      dy={6}
                    />
                    <YAxis
                      domain={[0, (dataMax: number) => Math.max(8, Math.ceil(dataMax) + 1)]}
                      allowDecimals={false}
                      tickFormatter={(val) => `${val}h`}
                      fontSize={10}
                      fontWeight={600}
                      stroke="#9ca3af"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      formatter={(val: any) => [`${val} hrs`, "Logged"]}
                      contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", fontSize: "11px" }}
                    />
                    <Bar 
                      dataKey="hours" 
                      fill="hsl(213, 44%, 25%)" 
                      radius={[4, 4, 0, 0]}
                      barSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Timesheets Data Table */}
            <Card className="bg-white border border-border/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden">
              <CardHeader className="bg-white p-5 border-b border-border/10 pb-4">
                <CardTitle className="text-sm font-black text-gray-900 tracking-tight font-sans text-left">
                  My Logged Entries
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                        <TableHead className="font-bold text-gray-700 text-xs py-3.5 pl-6">Staff Member</TableHead>
                        <TableHead className="font-bold text-gray-700 text-xs py-3.5">Task</TableHead>
                        <TableHead className="font-bold text-gray-700 text-xs py-3.5">Project</TableHead>
                        <TableHead className="font-bold text-gray-700 text-xs py-3.5">Date</TableHead>
                        <TableHead className="font-bold text-gray-700 text-xs py-3.5">Duration</TableHead>
                        <TableHead className="font-bold text-gray-700 text-xs py-3.5 pr-6 text-right">Billable</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTimesheets.length > 0 ? (
                        filteredTimesheets.map((t) => (
                          <TableRow key={t.id} className="hover:bg-gray-50/30 transition-colors border-b border-gray-100">
                            <TableCell className="font-semibold text-gray-900 text-xs py-3.5 pl-6">{t.staff}</TableCell>
                            <TableCell className="text-gray-600 text-xs py-3.5">{t.task}</TableCell>
                            <TableCell className="text-gray-600 text-xs py-3.5 font-medium">{t.project}</TableCell>
                            <TableCell className="text-gray-600 text-xs py-3.5">{t.date ? format(new Date(t.date), "yyyy-MM-dd") : "-"}</TableCell>
                            <TableCell className="font-bold text-gray-900 text-xs py-3.5">{t.hours}h</TableCell>
                            <TableCell className="py-3.5 pr-6 text-right">
                              <Badge
                                className={`rounded-lg px-2 py-0.5 font-bold text-[10px] uppercase tracking-wide border shadow-none ${
                                  t.billable
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-gray-100 text-gray-600 border-gray-200"
                                }`}
                              >
                                {t.billable ? "Yes" : "No"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-muted-foreground font-medium text-xs">
                            No logged timesheet records match your filter criteria.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Default Overview mode
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12 print:p-0">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Timesheets Overview</h1>
            <p className="text-muted-foreground text-sm font-medium">Track operational activities, log billable hours, and monitor staff project allocations</p>
          </div>

          {/* My Timesheets Toggle Button */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setViewMode("my-timesheets")}
              variant="outline"
              size="sm"
              className="h-9 rounded-lg font-bold text-xs gap-2 border-border/50 hover:bg-accent/10 text-gray-700 shadow-none"
            >
              <User className="h-3.5 w-3.5" />
              My Timesheets
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 text-xs font-bold border-border/50 rounded-lg">
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-white">
                <DropdownMenuItem onClick={() => handleExport("xlsx")} className="gap-3 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span>Excel</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-3 cursor-pointer">
                  <FileJson className="h-4 w-4 text-blue-600" />
                  <span>CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-3 cursor-pointer">
                  <FileType className="h-4 w-4 text-red-600" />
                  <span>PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("print")} className="gap-3 cursor-pointer">
                  <Printer className="h-4 w-4 text-gray-600" />
                  <span>Print</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Gray Dashboard Container Wrapper */}
        <div className="bg-gray-50/70 p-6 rounded-2xl border border-border/40 space-y-6 shadow-[0_2px_12px_-5px_rgba(0,0,0,0.03)]">
          
          {/* Filters Row Card */}
          <Card className="bg-white border border-border/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end text-xs font-bold font-sans">
              
              {/* Period Select */}
              <div className="space-y-1.5 text-left">
                <span className="text-gray-500 font-bold">Period</span>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-full h-9 rounded-lg border-border/50 text-xs font-medium shadow-none bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40">
                    <SelectItem value="Today" className="text-xs font-medium">Today</SelectItem>
                    <SelectItem value="Yesterday" className="text-xs font-medium">Yesterday</SelectItem>
                    <SelectItem value="This Week" className="text-xs font-medium">This Week</SelectItem>
                    <SelectItem value="Last Week" className="text-xs font-medium">Last Week</SelectItem>
                    <SelectItem value="This Month" className="text-xs font-medium">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Staff Member Select */}
              <div className="space-y-1.5 text-left">
                <span className="text-gray-500 font-bold">Staff Member</span>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger className="w-full h-9 rounded-lg border-border/50 text-xs font-medium shadow-none bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40">
                    <SelectItem value="All Staff Members" className="text-xs font-medium">All Staff Members</SelectItem>
                    {(staffData as any[]).map((s) => (
                      <SelectItem key={s._id} value={`${s.firstname} ${s.lastname}`} className="text-xs font-medium">
                        {s.firstname} {s.lastname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Task Input searchable */}
              <div className="space-y-1.5 text-left">
                <span className="text-gray-500 font-bold">Task</span>
                <Input
                  placeholder="Search Task..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="w-full h-9 rounded-lg border-border/50 text-xs shadow-none bg-background font-medium"
                />
              </div>

              {/* Project Input searchable */}
              <div className="space-y-1.5 text-left">
                <span className="text-gray-500 font-bold">Project</span>
                <Input
                  placeholder="Search Project..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="w-full h-9 rounded-lg border-border/50 text-xs shadow-none bg-background font-medium"
                />
              </div>

              {/* Apply Button */}
              <Button 
                onClick={handleApplyFilters}
                className="w-full h-9 rounded-lg font-bold text-xs bg-gray-900 hover:bg-gray-800 text-white shadow-none"
              >
                Apply
              </Button>
            </div>
          </Card>

          {/* Visual Time scale bar chart replicating the reference image precisely */}
          <Card className="bg-white border border-border/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden p-6">
            
            {/* Custom centered legend */}
            <div className="flex justify-center pb-6">
              <div className="flex items-center gap-1.5 text-[11px] font-bold font-sans">
                <span className="h-3 w-7 bg-[#e5e7eb] border border-gray-300 rounded" />
                <span className="text-gray-600">{period}</span>
              </div>
            </div>

            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ left: -10, right: 10, bottom: 5 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-100" />

                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    fontWeight={600}
                    stroke="#9ca3af"
                    tickLine={false}
                    axisLine={false}
                    dy={6}
                  />

                  <YAxis
                    domain={[0, (dataMax: number) => Math.max(4, Math.ceil(dataMax) + 1)]}
                    allowDecimals={false}
                    tickFormatter={formatTimeTick}
                    fontSize={10}
                    fontWeight={600}
                    stroke="#9ca3af"
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip
                    formatter={(val: any) => [formatTimeTick(val), "Logged Time"]}
                    contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", fontSize: "11px" }}
                  />
                  
                  {/* Today bar - muted light gray with thin gray outline matching mockup screenshot */}
                  <Bar 
                    dataKey="value" 
                    fill="#e5e7eb" 
                    stroke="#9ca3af" 
                    strokeWidth={1}
                    radius={[1, 1, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Timesheets Data Table */}
          <Card className="bg-white border border-border/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden">
            <CardHeader className="bg-white p-5 border-b border-border/10 pb-4">
              <CardTitle className="text-sm font-black text-gray-900 tracking-tight font-sans text-left">
                Timesheet Activity Records
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                      <TableHead className="font-bold text-gray-700 text-xs py-3.5 pl-6">Staff Member</TableHead>
                      <TableHead className="font-bold text-gray-700 text-xs py-3.5">Task</TableHead>
                      <TableHead className="font-bold text-gray-700 text-xs py-3.5">Project</TableHead>
                      <TableHead className="font-bold text-gray-700 text-xs py-3.5">Date</TableHead>
                      <TableHead className="font-bold text-gray-700 text-xs py-3.5">Duration</TableHead>
                      <TableHead className="font-bold text-gray-700 text-xs py-3.5 pr-6 text-right">Billable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTimesheets.length > 0 ? (
                      filteredTimesheets.map((t) => (
                        <TableRow key={t.id} className="hover:bg-gray-50/30 transition-colors border-b border-gray-100">
                          <TableCell className="font-semibold text-gray-900 text-xs py-3.5 pl-6">{t.staff}</TableCell>
                          <TableCell className="text-gray-600 text-xs py-3.5">{t.task}</TableCell>
                          <TableCell className="text-gray-600 text-xs py-3.5 font-medium">{t.project}</TableCell>
                          <TableCell className="text-gray-600 text-xs py-3.5">{t.date ? format(new Date(t.date), "yyyy-MM-dd") : "-"}</TableCell>
                          <TableCell className="font-bold text-gray-900 text-xs py-3.5">{t.hours}h</TableCell>
                          <TableCell className="py-3.5 pr-6 text-right">
                            <Badge
                              className={`rounded-lg px-2 py-0.5 font-bold text-[10px] uppercase tracking-wide border shadow-none ${
                                t.billable
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                            >
                              {t.billable ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground font-medium text-xs">
                          No timesheet activity matches your filter criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export const ReportKBArticles = () => {
  const [selectedGroup, setSelectedGroup] = useState("All Groups");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: kbGroupsData = [] } = useQuery({
    queryKey: ["kb-groups"],
    queryFn: supportService.getKBGroups,
  });

  const { data: kbArticlesData = [] } = useQuery({
    queryKey: ["kb-articles", "reports"],
    queryFn: () => supportService.getKBArticles(undefined, true),
  });

  const handleExport = (type: "xlsx" | "csv" | "pdf" | "print") => {
    if (filteredArticles.length === 0) {
      toast.error("No data to export");
      return;
    }

    if (type === "csv" || type === "xlsx") {
      const headers = ["Article Title", "Group Category", "Date Created", "Status"];
      const rows = filteredArticles.map(art => [
        art.title,
        art.group,
        art.date,
        art.status
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `kb_articles_report_${new Date().toISOString().split('T')[0]}.${type}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported successfully as ${type.toUpperCase()}`);
    } else if (type === "print") {
      window.print();
    } else if (type === "pdf") {
      toast.success("Ready to save - choose Save as PDF in print options");
      window.print();
    }
  };

  // Real knowledge base articles fetched from the API, with the group populated server-side
  const kbArticles = (kbArticlesData as any[]).map((a) => ({
    id: a._id,
    title: a.subject,
    group: a.group?.name || "Uncategorized",
    status: a.active ? "Published" : "Draft",
    date: a.createdAt ? format(new Date(a.createdAt), "yyyy-MM-dd") : "-",
  }));

  // Dynamic filtering based on Group Selection and Search string
  const filteredArticles = kbArticles.filter(art => {
    const matchesGroup = selectedGroup === "All Groups" || art.group === selectedGroup;
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  // Calculate live statistics from real data
  const totalArticles = filteredArticles.length;
  const publishedCount = filteredArticles.filter(a => a.status === "Published").length;
  const draftCount = totalArticles - publishedCount;

  // Prepare chart dataset — real article counts per group
  const chartData = Object.entries(
    filteredArticles.reduce((acc: Record<string, number>, art) => {
      acc[art.group] = (acc[art.group] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count }));

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12 print:p-0">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">KB Articles Report</h1>
            <p className="text-muted-foreground text-sm font-medium">Analyze article readership views, popularity trends, and document categories across your Knowledge Base</p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 text-xs font-bold border-border/50 rounded-lg">
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-white">
                <DropdownMenuItem onClick={() => handleExport("xlsx")} className="gap-3 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span>Excel</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-3 cursor-pointer">
                  <FileJson className="h-4 w-4 text-blue-600" />
                  <span>CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-3 cursor-pointer">
                  <FileType className="h-4 w-4 text-red-600" />
                  <span>PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("print")} className="gap-3 cursor-pointer">
                  <Printer className="h-4 w-4 text-gray-600" />
                  <span>Print</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Gray Dashboard Container Wrapper */}
        <div className="bg-gray-50/70 p-6 rounded-2xl border border-border/40 space-y-6 shadow-[0_2px_12px_-5px_rgba(0,0,0,0.03)]">
          
          {/* Choose Group & Search Panel */}
          <Card className="bg-white border border-border/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end text-xs font-bold font-sans">
              
              {/* Group Selector Dropdown */}
              <div className="space-y-1.5 text-left col-span-1">
                <span className="text-gray-500 font-bold">Choose Group</span>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="w-full h-9 rounded-lg border-border/50 text-xs font-medium shadow-none bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40">
                    <SelectItem value="All Groups" className="text-xs font-medium">All Groups</SelectItem>
                    {(kbGroupsData as any[]).map((g) => (
                      <SelectItem key={g._id} value={g.name} className="text-xs font-medium">{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title Search Input searchable */}
              <div className="space-y-1.5 text-left col-span-2">
                <span className="text-gray-500 font-bold">Search Articles</span>
                <Input
                  placeholder="Type to filter articles by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 rounded-lg border-border/50 text-xs shadow-none bg-background font-medium"
                />
              </div>
            </div>
          </Card>

          {/* Quick Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Metric 1 */}
            <Card className="bg-white border border-border/30 rounded-xl p-4 flex flex-col justify-between shadow-[0_1px_4px_-1px_rgba(0,0,0,0.03)]">
              <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Total Articles</span>
              <span className="text-xl font-extrabold text-gray-900 mt-2">{totalArticles}</span>
            </Card>

            {/* Metric 2 */}
            <Card className="bg-white border border-border/30 rounded-xl p-4 flex flex-col justify-between shadow-[0_1px_4px_-1px_rgba(0,0,0,0.03)]">
              <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Published Articles</span>
              <span className="text-xl font-extrabold text-gray-900 mt-2">{publishedCount}</span>
            </Card>

            {/* Metric 3 */}
            <Card className="bg-white border border-border/30 rounded-xl p-4 flex flex-col justify-between shadow-[0_1px_4px_-1px_rgba(0,0,0,0.03)]">
              <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Draft Articles</span>
              <span className="text-xl font-extrabold text-gray-900 mt-2">{draftCount}</span>
            </Card>
          </div>

          {/* Articles per group bar chart */}
          {chartData.length > 0 && (
            <Card className="bg-white border border-border/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden p-6">
              <CardHeader className="p-0 pb-6 text-left">
                <CardTitle className="text-xs font-black text-gray-900 tracking-tight uppercase">
                  Articles Per Group
                </CardTitle>
              </CardHeader>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ left: -10, right: 10, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-100" />
                    <XAxis
                      dataKey="name"
                      fontSize={10}
                      fontWeight={600}
                      stroke="#9ca3af"
                      tickLine={false}
                      axisLine={false}
                      dy={6}
                    />
                    <YAxis
                      allowDecimals={false}
                      fontSize={10}
                      fontWeight={600}
                      stroke="#9ca3af"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${val} article(s)`, "Count"]}
                      contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", fontSize: "11px" }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#0ea5e9"
                      radius={[4, 4, 0, 0]}
                      barSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Articles Data Table */}
          <Card className="bg-white border border-border/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden">
            <CardHeader className="bg-white p-5 border-b border-b-gray-50 pb-4">
              <CardTitle className="text-sm font-black text-gray-900 tracking-tight font-sans text-left">
                Knowledge Base Articles List
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                      <TableHead className="font-bold text-gray-700 text-xs py-3.5 pl-6">Article Title</TableHead>
                      <TableHead className="font-bold text-gray-700 text-xs py-3.5">Group Category</TableHead>
                      <TableHead className="font-bold text-gray-700 text-xs py-3.5">Date Created</TableHead>
                      <TableHead className="font-bold text-gray-700 text-xs py-3.5 pr-6 text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArticles.length > 0 ? (
                      filteredArticles.map((art) => (
                        <TableRow key={art.id} className="hover:bg-gray-50/30 transition-colors border-b border-gray-100">
                          <TableCell className="font-semibold text-gray-900 text-xs py-3.5 pl-6">{art.title}</TableCell>
                          <TableCell className="text-gray-600 text-xs py-3.5">{art.group}</TableCell>
                          <TableCell className="text-gray-500 text-xs py-3.5">{art.date}</TableCell>
                          <TableCell className="py-3.5 pr-6 text-right">
                            <Badge
                              className={`rounded-lg px-2 py-0.5 font-bold text-[10px] uppercase tracking-wide border shadow-none ${
                                art.status === "Published"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                            >
                              {art.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground font-medium text-xs">
                          No KB articles match the chosen group category.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export const ReportPurchase = () => {
  const [period, setPeriod] = useState("all_time");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  const { data = {}, isLoading } = useQuery({
    queryKey: ["purchaseReport", period, fromDate, toDate],
    queryFn: () => utilityService.getPurchaseReport(period, fromDate, toDate),
  });

  const purchasesReport = data.purchasesReport || [];
  const kpis = data.kpis || { totalPurchaseAmount: 0, totalPaid: 0, totalOutstanding: 0, totalGST: 0, count: 0 };
  const purchaseTrend = data.purchaseTrend || [];
  const supplierDistribution = data.supplierDistribution || [];

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    let csv = "Bill No,Supplier Name,Bill Date,Due Date,Qty,Rate,Amount,GST Rate (%),Total,Payment Status\n";
    purchasesReport.forEach((p: any) => {
      const bDate = p.bill_date ? format(new Date(p.bill_date), "yyyy-MM-dd") : "";
      const dDate = p.due_date ? format(new Date(p.due_date), "yyyy-MM-dd") : "";
      csv += `"${p.bill_no || ''}","${p.supplier_name || ''}","${bDate}","${dDate}",${p.quantity || 0},${p.rate || 0},${p.amount || 0},${p.gst_rate || 0},${p.total || 0},"${p.payment_status || ''}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `purchase_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.click();
  };

  const filteredPurchases = purchasesReport.filter((p: any) =>
    (p.bill_no || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.supplier_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const COLORS = ["hsl(213, 44%, 25%)", "hsl(152, 69%, 40%)", "hsl(38, 92%, 50%)", "hsl(0, 70%, 55%)", "hsl(270, 60%, 50%)"];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12 print:p-0 print:space-y-4">
        {/* Header section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-background p-1.5 rounded-2xl print:hidden">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Purchase Report</h1>
            <p className="text-muted-foreground text-sm font-medium">Review and analyze purchase bills, supplier metrics, and payment status breakdown</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Period Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Period</span>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[140px] h-9 rounded-lg border-border/45 bg-background text-xs font-bold shadow-none">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50">
                  <SelectItem value="all_time" className="text-xs font-medium">All Time</SelectItem>
                  <SelectItem value="this_month" className="text-xs font-medium">This Month</SelectItem>
                  <SelectItem value="last_month" className="text-xs font-medium">Last Month</SelectItem>
                  <SelectItem value="this_quarter" className="text-xs font-medium">This Quarter</SelectItem>
                  <SelectItem value="this_year" className="text-xs font-medium">This Year</SelectItem>
                  <SelectItem value="custom" className="text-xs font-medium">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {period === "custom" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">From</span>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-9 w-[130px] text-xs font-medium rounded-lg"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">To</span>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-9 w-[130px] text-xs font-medium rounded-lg"
                  />
                </div>
              </>
            )}

            <Button onClick={exportCSV} variant="outline" size="sm" className="h-9 rounded-lg gap-2 font-bold text-xs mt-auto">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm" className="h-9 rounded-lg gap-2 font-bold text-xs mt-auto">
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">Total Purchases</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black text-slate-900">₹{(kpis.totalPurchaseAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">{kpis.count} total bills</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">Total Paid</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black text-emerald-700">₹{(kpis.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <p className="text-[11px] text-emerald-600/80 mt-1 font-medium">Cleared bills</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">Outstanding</CardTitle>
              <AlertCircle className="h-4 w-4 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black text-rose-700">₹{(kpis.totalOutstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <p className="text-[11px] text-rose-600/80 mt-1 font-medium">Unpaid / Partial</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">Total GST</CardTitle>
              <Wallet className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black text-blue-700">₹{(kpis.totalGST || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <p className="text-[11px] text-blue-600/80 mt-1 font-medium">CGST + SGST + IGST</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">Bill Count</CardTitle>
              <FileText className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black text-purple-700">{kpis.count}</div>
              <p className="text-[11px] text-purple-600/80 mt-1 font-medium">Purchase Invoices</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          <Card className="lg:col-span-2 rounded-2xl border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Monthly Purchase Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[250px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : purchaseTrend.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-xs italic">
                  No trend data available for this range.
                </div>
              ) : (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={purchaseTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(213, 44%, 25%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(213, 44%, 25%)" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" stroke="#888888" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, "Amount"]} />
                      <Area type="monotone" dataKey="amount" stroke="hsl(213, 44%, 25%)" strokeWidth={3} fillOpacity={1} fill="url(#purchaseGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Supplier Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[250px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : supplierDistribution.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-xs italic">
                  No supplier data available.
                </div>
              ) : (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={supplierDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {supplierDistribution.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, "Purchases"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Data Table */}
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 pb-4">
            <CardTitle className="text-base font-bold">Purchases Detailed Ledger</CardTitle>
            <div className="relative w-full sm:w-64 print:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search bill no or supplier..."
                className="pl-9 h-8 bg-background border-none shadow-sm rounded-lg text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-bold text-xs">Bill No</TableHead>
                    <TableHead className="font-bold text-xs">Supplier Name</TableHead>
                    <TableHead className="font-bold text-xs">Bill Date</TableHead>
                    <TableHead className="font-bold text-xs">Due Date</TableHead>
                    <TableHead className="font-bold text-xs text-right">Qty</TableHead>
                    <TableHead className="font-bold text-xs text-right">Rate</TableHead>
                    <TableHead className="font-bold text-xs text-right">Amount</TableHead>
                    <TableHead className="font-bold text-xs text-right">GST %</TableHead>
                    <TableHead className="font-bold text-xs text-right">Total</TableHead>
                    <TableHead className="font-bold text-xs text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : filteredPurchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground italic text-xs">
                        No purchase records match the selected filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPurchases.map((p: any) => (
                      <TableRow key={p._id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-bold text-xs text-slate-800">{p.bill_no}</TableCell>
                        <TableCell className="font-medium text-xs">{p.supplier_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.bill_date ? format(new Date(p.bill_date), "MMM dd, yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.due_date ? format(new Date(p.due_date), "MMM dd, yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">{p.quantity || 1}</TableCell>
                        <TableCell className="text-xs text-right font-medium">₹{(p.rate || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-right font-medium">₹{(p.amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{p.gst_rate || 0}%</TableCell>
                        <TableCell className="text-xs text-right font-bold text-slate-900">₹{(p.total || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={`rounded-lg px-2 py-0.5 font-bold text-[10px] uppercase tracking-wide border shadow-none ${
                              p.payment_status === "Paid"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : p.payment_status === "Partially Paid"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {p.payment_status || "Unpaid"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

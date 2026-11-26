// Reports: Sales, Expenses, Expenses vs Income, Leads Conversions, Timesheets,
// KB Articles, Purchase. Every number comes from the company's own records
// (no sample data). All pages share the same period filter and the same
// export (PDF / Excel / CSV / Print) from lib/reportExport.
import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, ComposedChart,
} from "recharts";
import {
  Download, ChevronDown, FileSpreadsheet, FileJson, FileType, Printer, Loader2,
  FileText, Package, Wallet, CreditCard, Users, AlertCircle, Search, TrendingUp, User,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { utilityService } from "@/api/services/utility.service";
import { financeService } from "@/api/services/finance.service";
import { supportService } from "@/api/services/support.service";
import { staffService } from "@/api/services/staff.service";
import { leadService } from "@/api/services/lead.service";
import { taskService } from "@/api/services/task.service";
import { projectService } from "@/api/services/project.service";
import { usePermissions } from "@/hooks/usePermissions";
import { useSettings } from "@/context/SettingsContext";
import { useCurrency } from "@/context/CurrencyContext";
import { formatDate } from "@/lib/dateFormat";
import { exportReport, type ExportKind, type ReportExportInput } from "@/lib/reportExport";
import { REPORT_RULES, reportAllowed, viewLevel } from "@/lib/reportAccess";

// ════════════════════════════════════════════════════════════════════════════
// Shared helpers
// ════════════════════════════════════════════════════════════════════════════

const COLORS = ["#1e3a5f", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#64748b", "#f97316"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toList = (d: any): any[] => {
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  return [];
};
const idOf = (v: any): string => String(v && typeof v === "object" ? v._id ?? "" : v ?? "");
const personName = (s: any) => (s ? `${s.firstname || ""} ${s.lastname || ""}`.trim() || s.email || "" : "");
const num = (v: any) => Number(v) || 0;
const isObjectIdLike = (v: any) => typeof v === "string" && /^[0-9a-f]{24}$/i.test(v);
const fmtDate = (v: any) => (v ? formatDate(v) : "-");
const titleCase = (s: any) => String(s ?? "-").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const PERIODS = [
  { value: "all_time", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "date", label: "Specific Date" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year", label: "This Year" },
  { value: "last_year", label: "Last Year" },
  { value: "custom", label: "Custom Period" },
];
export const periodLabel = (p: string, from?: string, to?: string) =>
  p === "date" ? (from ? fmtDate(from) : "-") : p === "custom" ? `${from ? fmtDate(from) : "start"} – ${to ? fmtDate(to) : "today"}` : PERIODS.find((x) => x.value === p)?.label || p;

/** Today as "YYYY-MM-DD" in the browser's time zone. */
export const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** A period that still needs a date typed in (Specific Date / Custom with no dates). */
export const needsDate = (period: string, from?: string, to?: string) => (period === "custom" && !from && !to) || (period === "date" && !from);

/** Same ranges as the backend (controllers/report_controller.js periodRange). null = all time. */
export const periodRange = (period: string, from?: string, to?: string): { start?: Date; end?: Date } | null => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const monday = (d: Date) => { const x = day(d); const wd = x.getDay(); x.setDate(x.getDate() - (wd === 0 ? 6 : wd - 1)); return x; };
  switch (period) {
    case "today": return { start: day(now), end: endOf(now) };
    case "yesterday": { const d = new Date(now); d.setDate(d.getDate() - 1); return { start: day(d), end: endOf(d) }; }
    case "date": { const d = toLocal(from); return d ? { start: day(d), end: endOf(d) } : { start: day(now), end: endOf(now) }; }
    case "this_week": { const s = monday(now); const e = new Date(s); e.setDate(e.getDate() + 6); return { start: s, end: endOf(e) }; }
    case "last_week": { const s = monday(now); s.setDate(s.getDate() - 7); const e = new Date(s); e.setDate(e.getDate() + 6); return { start: s, end: endOf(e) }; }
    case "this_month": return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59, 999) };
    case "last_month": return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59, 999) };
    case "this_quarter": { const q = Math.floor(m / 3); return { start: new Date(y, q * 3, 1), end: new Date(y, q * 3 + 3, 0, 23, 59, 59, 999) }; }
    case "this_year": return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59, 999) };
    case "last_year": return { start: new Date(y - 1, 0, 1), end: new Date(y - 1, 11, 31, 23, 59, 59, 999) };
    case "custom": {
      const r: { start?: Date; end?: Date } = {};
      if (from) r.start = new Date(`${from}T00:00:00`);
      if (to) r.end = new Date(`${to}T23:59:59.999`);
      return r.start || r.end ? r : null;
    }
    default: return null;
  }
};

/** A date-only "YYYY-MM-DD" is read as local midnight, not UTC (so "today" stays today). */
const toLocal = (v: any): Date | null => {
  if (!v) return null;
  const d = typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const inRange = (v: any, r: { start?: Date; end?: Date } | null) => {
  if (!r) return true;
  const d = toLocal(v);
  if (!d) return false;
  return (!r.start || d >= r.start) && (!r.end || d <= r.end);
};

/** Buckets for a time chart: by day for ranges up to ~2 months, else by month. */
const timeBuckets = (dates: Date[], r: { start?: Date; end?: Date } | null) => {
  const valid = dates.filter(Boolean);
  const start = r?.start || (valid.length ? new Date(Math.min(...valid.map((d) => d.getTime()))) : new Date());
  const end = r?.end && r.end < new Date(Date.now() + 366 * 864e5) ? r.end : valid.length ? new Date(Math.max(...valid.map((d) => d.getTime()), Date.now())) : new Date();
  const days = Math.round((end.getTime() - start.getTime()) / 864e5) + 1;
  const daily = days <= 62;
  const keyOf = (d: Date) => (daily ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  const labelOf = (key: string) => {
    const [yy, mm, dd] = key.split("-");
    return daily ? `${dd} ${MONTHS[Number(mm) - 1]}` : `${MONTHS[Number(mm) - 1]} ${yy.slice(2)}`;
  };
  const keys: string[] = [];
  const c = new Date(start.getFullYear(), start.getMonth(), daily ? start.getDate() : 1);
  let guard = 0;
  while (c <= end && guard++ < 400) {
    keys.push(keyOf(c));
    if (daily) c.setDate(c.getDate() + 1); else c.setMonth(c.getMonth() + 1);
  }
  return { keys, keyOf, labelOf, daily };
};

const useMoney = (symbolOverride?: string) => {
  const { symbol } = useCurrency();
  const sym = symbolOverride || symbol || "₹";
  return (n: any) => `${sym}${num(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const useCompanyName = () => {
  const { getSetting } = useSettings();
  return String(getSetting("companyName", "") || "");
};

function ExportMenu({ onExport, disabled }: { onExport: (k: ExportKind) => void; disabled?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 text-xs font-bold rounded-lg" disabled={disabled}>
          <Download className="h-4 w-4" /> Export <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => onExport("pdf")} className="gap-3 cursor-pointer"><FileType className="h-4 w-4 text-red-600" />PDF</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("xlsx")} className="gap-3 cursor-pointer"><FileSpreadsheet className="h-4 w-4 text-green-600" />Excel</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("csv")} className="gap-3 cursor-pointer"><FileJson className="h-4 w-4 text-blue-600" />CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("print")} className="gap-3 cursor-pointer"><Printer className="h-4 w-4 text-gray-600" />Print</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const runExport = async (kind: ExportKind, input: ReportExportInput) => {
  try {
    await exportReport(kind, input);
    if (kind !== "print") toast.success(`Exported as ${kind === "xlsx" ? "Excel" : kind.toUpperCase()}`);
  } catch (e) {
    console.error(e);
    toast.error("Could not create the export file");
  }
};

function FilterLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{children}</span>;
}

function PeriodFilter({
  period, setPeriod, from, setFrom, to, setTo, options = PERIODS,
}: {
  period: string; setPeriod: (v: string) => void; from: string; setFrom: (v: string) => void; to: string; setTo: (v: string) => void;
  options?: { value: string; label: string }[];
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <FilterLabel>Period</FilterLabel>
        <Select value={period} onValueChange={(v) => { setPeriod(v); if (v === "date" && !from) setFrom(todayYmd()); }}>
          <SelectTrigger className="w-[150px] h-9 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
          <SelectContent>{options.map((p) => <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {period === "date" && (
        <div className="flex flex-col gap-1.5"><FilterLabel>Date</FilterLabel><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px] text-xs rounded-lg" /></div>
      )}
      {period === "custom" && (
        <>
          <div className="flex flex-col gap-1.5"><FilterLabel>From</FilterLabel><Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[140px] text-xs rounded-lg" /></div>
          <div className="flex flex-col gap-1.5"><FilterLabel>To</FilterLabel><Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="h-9 w-[140px] text-xs rounded-lg" /></div>
        </>
      )}
    </>
  );
}

/** Small search input used in the report headers. */
function SearchBox({ value, onChange, placeholder, width = 170 }: { value: string; onChange: (v: string) => void; placeholder: string; width?: number }) {
  return (
    <div className="relative">
      <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 pl-8 text-xs rounded-lg" style={{ width }} />
    </div>
  );
}
/** Does any field of the row contain the search text? */
const matchesSearch = (row: any, q: string) => {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  return Object.values(row || {}).some((v) => v != null && typeof v !== "object" && String(v).toLowerCase().includes(t));
};

function ReportHeader({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm font-medium">{description}</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </div>
  );
}

function Kpi({ label, value, hint, tone = "text-foreground" }: { label: string; value: React.ReactNode; hint?: string; tone?: string }) {
  return (
    <Card className="rounded-2xl border-border/50 shadow-sm">
      <CardContent className="p-4">
        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-xl font-black mt-1 ${tone}`}>{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children, empty, height = 300 }: { title: string; children: React.ReactNode; empty?: boolean; height?: number }) {
  return (
    <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="border-b border-border/40 py-3 px-5"><CardTitle className="text-sm font-bold">{title}</CardTitle></CardHeader>
      <CardContent className="p-4">
        {empty ? (
          <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>No data for the selected filters</div>
        ) : (
          <div style={{ height }}><ResponsiveContainer width="100%" height="100%">{children as any}</ResponsiveContainer></div>
        )}
      </CardContent>
    </Card>
  );
}

const isForbidden = (e: any) => e?.status === 403 || e?.response?.status === 403;
/** Load error banner: a clear "no permission" text for 403, else a generic error. */
function LoadError({ error, what }: { error: any; what: string }) {
  if (!error) return null;
  if (isForbidden(error)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>{error?.response?.data?.message || `You do not have permission to see ${what}.`} Ask your admin to give you the permission in Setup &gt; Roles.</span>
      </div>
    );
  }
  return <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Could not load {what}.</div>;
}

const Loading = () => (
  <Card className="h-80 flex items-center justify-center rounded-2xl"><Loader2 className="h-6 w-6 text-primary animate-spin" /></Card>
);

/** Blue note shown when the user sees only their own records (role permission "View (Own)"). */
export function OwnRecordsNote({ what }: { what: string }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-medium text-blue-800">
      You see only your own records for: {what} (your role's permission).
    </div>
  );
}

/**
 * Page guard: the report opens only for people with Reports > View and the
 * permission of the module(s) it is built from (lib/reportAccess.ts) — the
 * same rule as the sidebar. Otherwise the yellow "no permission" message.
 */
export function ReportGate({ slug, title, children }: { slug: string; title: string; children: React.ReactNode }) {
  const { canView } = usePermissions();
  if (reportAllowed(slug, canView)) return <>{children}</>;
  const rule = REPORT_RULES[slug];
  const needs = canView("Reports") ? rule?.label : "Reports";
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        <ReportHeader title={title} description="" />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>You do not have permission to see the {title}{needs ? ` (it needs the ${needs} permission)` : ""}. Ask your admin to give you the permission in Setup &gt; Roles.</span>
        </div>
      </div>
    </DashboardLayout>
  );
}

const compact = (v: any) => num(v).toLocaleString("en-IN", { notation: "compact", maximumFractionDigits: 1 });

function SimplePie({ data, money }: { data: { name: string; value: number }[]; money?: (n: any) => string }) {
  return (
    <PieChart>
      <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={45} paddingAngle={2}>
        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
      </Pie>
      <Tooltip formatter={(v: any, n: any) => [money ? money(v) : v, n]} />
      <Legend wrapperStyle={{ fontSize: 11 }} />
    </PieChart>
  );
}

const statusTone = (s: string) => {
  const v = String(s || "").toLowerCase();
  if (["paid", "accepted", "active", "published", "closed", "complete", "converted"].includes(v)) return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  if (["cancelled", "overdue", "declined", "void", "lost", "expired"].includes(v)) return "bg-red-500/10 text-red-700 border-red-500/20";
  if (["unpaid", "draft", "sent", "open", "partially_paid", "partially paid", "pending"].includes(v)) return "bg-amber-500/10 text-amber-700 border-amber-500/20";
  return "bg-slate-500/10 text-slate-700 border-slate-500/20";
};
const StatusBadge = ({ s }: { s: string }) => <Badge variant="outline" className={`rounded-full text-[10px] font-bold uppercase ${statusTone(s)}`}>{titleCase(s)}</Badge>;

// ════════════════════════════════════════════════════════════════════════════
// Sales Report
// ════════════════════════════════════════════════════════════════════════════

const SALES_SUBREPORTS = [
  { id: "invoices", label: "Invoices Report", icon: FileText },
  { id: "items", label: "Items Report", icon: Package },
  { id: "payments", label: "Payments Received", icon: Wallet },
  { id: "credit_notes", label: "Credit Notes Report", icon: CreditCard },
  { id: "proposals", label: "Proposals Report", icon: FileText },
  { id: "estimates", label: "Estimates Report", icon: FileText },
  { id: "customers", label: "Customers Report", icon: Users },
] as const;
type SalesSub = (typeof SALES_SUBREPORTS)[number]["id"];

export const ReportSales = () => {
  const [currency, setCurrency] = useState("");
  const [period, setPeriod] = useState("all_time");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [view, setView] = useState<"tables" | "charts">("tables");
  const [sub, setSub] = useState<SalesSub>("invoices");
  const [search, setSearch] = useState("");
  const companyName = useCompanyName();

  const { data: currenciesList = [] } = useQuery({ queryKey: ["currencies"], queryFn: () => financeService.getCurrencies() });
  const customIncomplete = needsDate(period, from, to);
  const { data = {} as any, isLoading, error: loadError } = useQuery({
    queryKey: ["salesReport", currency, period, from, to],
    queryFn: () => utilityService.getSalesReport(currency, period, from, to),
    enabled: !customIncomplete,
    retry: (n: number, e: any) => !isForbidden(e) && n < 1,
  });
  // Which parts this user may see (same rules as the Invoices / Payments /
  // Proposals / Estimates pages). Before the first load everything is assumed.
  const access = data.access || { invoices: "global", payments: "global", proposals: "global", estimates: "global" };
  const subAllowed = (id: SalesSub) =>
    ({ invoices: access.invoices, items: access.invoices, credit_notes: access.invoices, customers: access.invoices, payments: access.payments, proposals: access.proposals, estimates: access.estimates } as any)[id];
  const visibleSubs = SALES_SUBREPORTS.filter((r) => subAllowed(r.id));
  const ownNote = Object.entries(access).filter(([, v]) => v === "own").map(([k]) => titleCase(k));

  const activeCurrency = data.currency || currency;
  const symbol = toList(currenciesList).find((c: any) => c.name === activeCurrency)?.symbol;
  const money = useMoney(symbol || (activeCurrency && activeCurrency !== "INR" ? `${activeCurrency} ` : undefined));
  const usedCurrencies: { code: string; count: number }[] = data.currencies || [];
  const s = data.summary || {};
  const charts = data.charts || {};
  const rows = {
    invoices: data.invoicesReport || [],
    items: data.itemsReport || [],
    payments: data.paymentsReport || [],
    credit_notes: data.creditNotesReport || [],
    proposals: data.proposalsReport || [],
    estimates: data.estimatesReport || [],
    customers: data.customersReport || [],
  } as Record<SalesSub, any[]>;
  const sum = (list: any[], k: string) => list.reduce((a, r) => a + num(r[k]), 0);

  // Table definition per sub-report: used for the screen AND the export.
  const tableFor = (id: SalesSub) => {
    // Search (number, customer, status …) narrows the table and its totals.
    const r = rows[id].filter((x) => matchesSearch(x, search));
    switch (id) {
      case "invoices": return { headers: ["Invoice #", "Customer", "Date", "Due Date", "Tax", "Amount", "Status"], rows: r.map((x) => [x.number, x.clientName, fmtDate(x.date), fmtDate(x.duedate), money(x.total_tax), money(x.total), titleCase(x.status)]), footer: ["Total", `${r.length} invoices`, "", "", money(sum(r, "total_tax")), money(sum(r, "total")), ""], status: 6 };
      case "items": return { headers: ["Item", "Quantity Sold", "Average Price", "Total Revenue"], rows: r.map((x) => [x.name, x.qtySold, money(x.avgPrice), money(x.totalRevenue)]), footer: ["Total", sum(r, "qtySold"), "", money(sum(r, "totalRevenue"))] };
      case "payments": return { headers: ["Date", "Invoice #", "Customer", "Payment Mode", "Transaction ID", "Amount"], rows: r.map((x) => [fmtDate(x.date), x.invoiceNumber, x.clientName, x.paymentMode, x.transactionId, money(x.amount)]), footer: ["Total", `${r.length} payments`, "", "", "", money(sum(r, "amount"))] };
      case "credit_notes": return { headers: ["Credit Note #", "Customer", "Date", "Amount", "Status"], rows: r.map((x) => [x.number, x.clientName, fmtDate(x.date), money(x.total), x.status]), footer: ["Total", "", "", money(sum(r, "total")), ""], status: 4 };
      case "proposals": return { headers: ["Proposal #", "Subject", "To", "Date", "Open Till", "Amount", "Status"], rows: r.map((x) => [x.number, x.subject, x.clientName, fmtDate(x.date), fmtDate(x.openTill), money(x.total), x.status]), footer: ["Total", "", "", "", "", money(sum(r, "total")), ""], status: 6 };
      case "estimates": return { headers: ["Estimate #", "Customer", "Reference", "Date", "Expiry Date", "Amount", "Status"], rows: r.map((x) => [x.number, x.clientName, x.reference, fmtDate(x.date), fmtDate(x.expiryDate), money(x.total), titleCase(x.status)]), footer: ["Total", "", "", "", "", money(sum(r, "total")), ""], status: 6 };
      case "customers": return { headers: ["Customer", "Invoices", "Total Invoiced", "Total Received", "Outstanding"], rows: r.map((x) => [x.clientName, x.invoices, money(x.totalInvoiced), money(x.totalPaid), money(x.balance)]), footer: ["Total", sum(r, "invoices"), money(sum(r, "totalInvoiced")), money(sum(r, "totalPaid")), money(sum(r, "balance"))] };
    }
  };

  // A box is shown only when the user may see the module it is counted from.
  const kpis = [
    access.invoices && { label: "Total Invoiced", value: money(s.totalInvoiced) },
    access.payments && { label: "Received", value: money(s.totalReceived) },
    access.invoices && access.payments && { label: "Outstanding", value: money(s.outstanding) },
    access.invoices && { label: "Tax", value: money(s.totalTax) },
    access.invoices && { label: "Invoices", value: String(s.invoiceCount || 0) },
    access.invoices && { label: "Credit Notes", value: money(s.creditNotes) },
  ].filter(Boolean) as { label: string; value: string }[];
  // The chosen sub-report may not be allowed (e.g. no Invoices permission).
  const activeSub: SalesSub = subAllowed(sub) ? sub : visibleSubs[0]?.id || "invoices";

  const onExport = (kind: ExportKind) => {
    const subtitle = `Period: ${periodLabel(period, from, to)} · Currency: ${activeCurrency || "-"}`;
    const sections = view === "tables"
      ? [{ title: SALES_SUBREPORTS.find((x) => x.id === activeSub)!.label, ...tableFor(activeSub) }]
      : [
          { title: "Income by Month", headers: ["Month", "Invoiced", "Received"], rows: (charts.incomeTrend || []).map((m: any) => [m.label, money(m.invoiced), money(m.received)]) },
          access.payments && { title: "Payment Modes", headers: ["Mode", "Amount"], rows: (charts.paymentModesDistribution || []).map((m: any) => [m.name, money(m.value)]) },
          access.invoices && { title: "Sales by Customer Group", headers: ["Group", "Amount"], rows: (charts.customerGroupsDistribution || []).map((m: any) => [m.name, money(m.value)]) },
          access.invoices && { title: "Invoices by Status", headers: ["Status", "Invoices"], rows: (charts.invoiceStatusDistribution || []).map((m: any) => [titleCase(m.name), m.value]) },
        ].filter(Boolean) as any[];
    runExport(kind, { title: "Sales Report", subtitle: (search.trim() ? `Search: ${search.trim()} · ` : "") + (ownNote.length ? `${subtitle} · Own records only: ${ownNote.join(", ")}` : subtitle), companyName, kpis, sections, fileName: `sales_report_${view === "tables" ? activeSub : "charts"}` });
  };

  const t = tableFor(activeSub);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        <ReportHeader title="Sales Report" description="Invoices, items, payments, credit notes, proposals, estimates and customers — your company's data only">
          <div className="flex flex-col gap-1.5">
            <FilterLabel>Currency</FilterLabel>
            <Select value={activeCurrency || ""} onValueChange={setCurrency} disabled={usedCurrencies.length === 0}>
              <SelectTrigger className="w-[120px] h-9 rounded-lg text-xs font-bold"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {usedCurrencies.map((c) => <SelectItem key={c.code} value={c.code} className="text-xs">{c.code} ({c.count})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
          <div className="flex flex-col gap-1.5">
            <FilterLabel>Search</FilterLabel>
            <SearchBox value={search} onChange={setSearch} placeholder="Number, customer, status" />
          </div>
          <ExportMenu onExport={onExport} disabled={isLoading} />
        </ReportHeader>

        <LoadError error={loadError} what="the Sales Report" />
        {customIncomplete && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{period === "date" ? "Choose the date." : "Choose a From or To date for the custom period."}</div>}
        {ownNote.length > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-medium text-blue-800">
            You see only your own records for: {ownNote.join(", ")} (your role's permission).
          </div>
        )}

        {isForbidden(loadError) ? null : (
        <>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map((k) => <Kpi key={k.label} label={k.label} value={isLoading ? "…" : k.value} />)}
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant={view === "tables" ? "default" : "outline"} className="rounded-lg" onClick={() => setView("tables")}>Sales Report</Button>
          <Button size="sm" variant={view === "charts" ? "default" : "outline"} className="rounded-lg" onClick={() => setView("charts")}>Charts Based Report</Button>
        </div>

        {isLoading ? <Loading /> : view === "tables" ? (
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
            <Card className="rounded-2xl p-2 h-fit">
              {visibleSubs.map((r) => (
                <button key={r.id} onClick={() => setSub(r.id)} className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-colors ${activeSub === r.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  <span className="flex items-center gap-2"><r.icon className="h-4 w-4" />{r.label}</span>
                  <span className="text-[10px] font-black opacity-70">{rows[r.id].length}</span>
                </button>
              ))}
            </Card>
            <Card className="rounded-2xl overflow-hidden">
              <CardHeader className="border-b py-3 px-5"><CardTitle className="text-sm font-bold">{SALES_SUBREPORTS.find((x) => x.id === activeSub)?.label}</CardTitle></CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>{t.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {t.rows.length === 0 ? <TableEmpty colSpan={t.headers.length}>No records for the selected filters.</TableEmpty> : (
                      <>
                        {t.rows.map((r, i) => (
                          <TableRow key={i}>
                            {r.map((c, j) => <TableCell key={j} className={j === 0 ? "font-medium" : ""}>{(t as any).status === j ? <StatusBadge s={String(c)} /> : c}</TableCell>)}
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/40 font-bold">{t.footer.map((c, j) => <TableCell key={j}>{c}</TableCell>)}</TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="lg:col-span-2">
              <ChartCard title="Income by Month — Invoiced vs Received" empty={!(charts.incomeTrend || []).length} height={320}>
                <BarChart data={charts.incomeTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={compact} />
                  <Tooltip formatter={(v: any, n: any) => [money(v), n]} />
                  <Legend />
                  <Bar dataKey="invoiced" name="Invoiced" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="received" name="Received" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartCard>
            </div>
            {access.payments && <ChartCard title="Payments by Payment Mode" empty={!(charts.paymentModesDistribution || []).length}><SimplePie data={charts.paymentModesDistribution || []} money={money} /></ChartCard>}
            {access.invoices && <ChartCard title="Sales by Customer Group" empty={!(charts.customerGroupsDistribution || []).length}><SimplePie data={charts.customerGroupsDistribution || []} money={money} /></ChartCard>}
            {access.invoices && <ChartCard title="Invoices by Status" empty={!(charts.invoiceStatusDistribution || []).length}><SimplePie data={(charts.invoiceStatusDistribution || []).map((d: any) => ({ ...d, name: titleCase(d.name) }))} /></ChartCard>}
            {access.invoices && (
            <ChartCard title="Top 10 Items by Revenue" empty={!rows.items.length}>
              <BarChart data={rows.items.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={11} tickFormatter={compact} />
                <YAxis type="category" dataKey="name" width={130} fontSize={10} />
                <Tooltip formatter={(v: any) => [money(v), "Revenue"]} />
                <Bar dataKey="totalRevenue" fill={COLORS[4]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartCard>
            )}
          </div>
        )}
        </>
        )}
      </div>
    </DashboardLayout>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Expenses Report
// ════════════════════════════════════════════════════════════════════════════

export const ReportExpenses = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [excludeBillable, setExcludeBillable] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const money = useMoney();
  const companyName = useCompanyName();

  const { data = {} as any, isLoading, error: loadError } = useQuery({
    queryKey: ["expensesReport", year, excludeBillable],
    queryFn: () => utilityService.getExpensesReport(year, excludeBillable),
  });
  const categories: any[] = data.categoriesReport || [];
  const monthTotals: number[] = data.overallTotal || Array(12).fill(0);
  const yearTotal = num(data.overallTotalYear);
  const expenses: any[] = data.expenses || [];
  const [search, setSearch] = useState("");
  // Search narrows the Expense Details table (category / month totals stay for the whole year).
  const shownExpenses = expenses.filter((e) => matchesSearch(e, search));
  const years: number[] = data.years || [new Date().getFullYear()];
  const charts = data.charts || { billableByCategory: [], nonBillableByCategory: [] };
  const billableTotal = expenses.filter((e) => e.billable).reduce((a, e) => a + num(e.amount), 0);
  const monthly = MONTHS.map((m, i) => ({ month: m, amount: monthTotals[i] || 0 }));

  const matrix = {
    headers: ["Category", ...MONTHS, "Year Total"],
    rows: categories.map((c) => [c.name, ...c.months.map((v: number) => (v ? money(v) : "-")), money(c.total)]),
    footer: ["Total", ...monthTotals.map((v) => money(v)), money(yearTotal)],
  };
  const details = {
    headers: ["Date", "Name", "Category", "Customer", "Project", "Payment Mode", "Ref No.", "Billable", "Amount"],
    rows: shownExpenses.map((e) => [fmtDate(e.date), e.name || "-", e.category, e.customer || "-", e.project || "-", e.paymentmode || "-", e.reference_no || "-", e.billable ? (e.invoiced ? "Yes (invoiced)" : "Yes") : "No", money(e.amount)]),
    footer: ["Total", `${shownExpenses.length} expenses`, "", "", "", "", "", "", money(search.trim() ? shownExpenses.reduce((a, e) => a + num(e.amount), 0) : yearTotal)],
  };

  const onExport = (kind: ExportKind) =>
    runExport(kind, {
      title: "Expenses Report",
      subtitle: `Year: ${year}${excludeBillable ? " · Billable expenses excluded" : ""}`,
      companyName,
      kpis: [
        { label: "Total Expenses", value: money(yearTotal) },
        { label: "Billable", value: money(billableTotal) },
        { label: "Not Billable", value: money(yearTotal - billableTotal) },
        { label: "Expenses", value: String(expenses.length) },
        { label: "Categories", value: String(categories.length) },
      ],
      sections: [{ title: `Expenses by Category — ${year}`, ...matrix }, { title: "Expense Details", ...details }],
      fileName: `expenses_report_${year}`,
    });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        <ReportHeader title="Expenses Report" description="Your company's expenses by category and month">
          <div className="flex flex-col gap-1.5">
            <FilterLabel>Year</FilterLabel>
            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
              <SelectTrigger className="w-[100px] h-9 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 h-9 cursor-pointer text-xs font-bold text-muted-foreground select-none">
            <input type="checkbox" checked={excludeBillable} onChange={(e) => setExcludeBillable(e.target.checked)} className="h-4 w-4" /> Exclude billable
          </label>
          <Button variant={showDetails ? "default" : "outline"} className="h-9 rounded-lg text-xs font-bold" onClick={() => setShowDetails(!showDetails)}>Detailed Report</Button>
          <div className="flex flex-col gap-1.5">
            <FilterLabel>Search</FilterLabel>
            <SearchBox value={search} onChange={setSearch} placeholder="Name, category, customer" />
          </div>
          <ExportMenu onExport={onExport} disabled={isLoading} />
        </ReportHeader>

        <LoadError error={loadError} what="the Expenses Report" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Total Expenses" value={money(yearTotal)} hint={`Year ${year}`} tone="text-red-600" />
          <Kpi label="Billable" value={money(billableTotal)} />
          <Kpi label="Not Billable" value={money(yearTotal - billableTotal)} />
          <Kpi label="Expenses" value={expenses.length} hint={`${categories.length} categories`} />
        </div>

        {isLoading ? <Loading /> : (
          <>
            <Card className="rounded-2xl overflow-hidden">
              <CardHeader className="border-b py-3 px-5"><CardTitle className="text-sm font-bold">Expenses by Category — {year}</CardTitle></CardHeader>
              <div className="overflow-x-auto">
                <Table className="min-w-[1100px]">
                  <TableHeader><TableRow>{matrix.headers.map((h, i) => <TableHead key={h} className={i ? "text-right" : ""}>{h}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {matrix.rows.length === 0 ? <TableEmpty colSpan={matrix.headers.length}>No expenses in {year}.</TableEmpty> : (
                      <>
                        {matrix.rows.map((r, i) => <TableRow key={i}>{r.map((c, j) => <TableCell key={j} className={j ? "text-right text-muted-foreground" : "font-medium"}>{c}</TableCell>)}</TableRow>)}
                        <TableRow className="bg-primary/5 font-bold">{matrix.footer.map((c, j) => <TableCell key={j} className={j ? "text-right" : ""}>{c}</TableCell>)}</TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <ChartCard title={`Expenses by Month — ${year}`} empty={yearTotal === 0}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={compact} />
                <Tooltip formatter={(v: any) => [money(v), "Expenses"]} />
                <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[["Not billable expenses by category", charts.nonBillableByCategory, "#f87171"], ["Billable expenses by category", charts.billableByCategory, "#10b981"]].map(([title, list, color]: any) => (
                <ChartCard key={title} title={title} empty={!list?.length}>
                  <BarChart data={list}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={10} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis fontSize={11} tickFormatter={compact} />
                    <Tooltip formatter={(v: any) => [money(v), "Amount"]} />
                    <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ChartCard>
              ))}
            </div>

            {showDetails && (
              <Card className="rounded-2xl overflow-hidden">
                <CardHeader className="border-b py-3 px-5"><CardTitle className="text-sm font-bold">Expense Details ({shownExpenses.length}{search.trim() ? ` of ${expenses.length}` : ""})</CardTitle></CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>{details.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                      {details.rows.length === 0 ? <TableEmpty colSpan={details.headers.length}>No expenses.</TableEmpty> :
                        details.rows.map((r, i) => <TableRow key={i}>{r.map((c, j) => <TableCell key={j} className={j === 8 ? "text-right font-semibold" : ""}>{c}</TableCell>)}</TableRow>)}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Expenses vs Income
// ════════════════════════════════════════════════════════════════════════════

const EVI_PERIODS = [{ value: "year", label: "Year (month by month)" }, ...PERIODS];

export const ReportExpensesVsIncome = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState("year");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const money = useMoney();
  const companyName = useCompanyName();
  const yearMode = period === "year";
  const waiting = !yearMode && needsDate(period, from, to);
  const { data = {} as any, isLoading, error: loadError } = useQuery({
    queryKey: ["expensesVsIncome", year, period, from, to],
    queryFn: () => utilityService.getExpensesVsIncome(year, period, from, to),
    enabled: !waiting,
  });
  // Row label: "Jan 2026" for the year view; the server's own label (a day or a month) otherwise.
  const rowLabel = (m: any) => (yearMode ? `${m.month} ${year}` : m.month);
  const periodText = yearMode ? `Year: ${year}` : `Period: ${periodLabel(period, from, to)}`;
  const months: any[] = data.months || [];
  const totals = data.totals || {};
  const years: number[] = data.years || [new Date().getFullYear()];
  const hasData = months.some((m) => m.income || m.expenses);
  // "Invoiced" is shown only to users who may see all invoices.
  const showInv = data.showInvoiced !== false;
  const pick = <T,>(arr: T[]) => (showInv ? arr : arr.filter((_, i) => i !== 1));

  const table = {
    headers: pick(["Month", "Invoiced", "Income (Received)", "Expenses", "Profit / Loss"]),
    rows: months.map((m) => pick([rowLabel(m), money(m.invoiced), money(m.income), money(m.expenses), money(m.profit)])),
    footer: pick(["Total", money(totals.invoiced), money(totals.income), money(totals.expenses), money(totals.profit)]),
  };

  const onExport = (kind: ExportKind) =>
    runExport(kind, {
      title: "Expenses vs Income",
      subtitle: periodText,
      companyName,
      kpis: [
        { label: "Income (Received)", value: money(totals.income) },
        { label: "Expenses", value: money(totals.expenses) },
        { label: "Profit / Loss", value: money(totals.profit) },
        { label: "Profit Margin", value: `${num(totals.margin)}%` },
        ...(showInv ? [{ label: "Invoiced", value: money(totals.invoiced) }] : []),
      ],
      sections: [{ title: yearMode ? `Month by Month — ${year}` : data.daily ? "Day by Day" : "Month by Month", ...table }],
      fileName: yearMode ? `expenses_vs_income_${year}` : `expenses_vs_income_${period}`,
    });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        <ReportHeader title="Expenses vs Income" description="Money received (payments) compared with money spent (expenses), by month or by day">
          <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} options={EVI_PERIODS} />
          {yearMode && <div className="flex flex-col gap-1.5">
            <FilterLabel>Year</FilterLabel>
            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
              <SelectTrigger className="w-[100px] h-9 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>}
          <ExportMenu onExport={onExport} disabled={isLoading || waiting} />
        </ReportHeader>

        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl flex items-start gap-2 text-xs font-medium">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          Income = payments actually received in that {yearMode || !data.daily ? "month" : "day"}. Amounts are added as they are stored, so use this report when payments and expenses are in one currency.
        </div>
        <LoadError error={loadError} what="Expenses vs Income (it needs both Payments and Expenses permission)" />
        {waiting && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{period === "date" ? "Choose the date." : "Choose a From or To date for the custom period."}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Income (Received)" value={money(totals.income)} tone="text-emerald-600" />
          <Kpi label="Expenses" value={money(totals.expenses)} tone="text-red-600" />
          <Kpi label="Profit / Loss" value={money(totals.profit)} tone={num(totals.profit) >= 0 ? "text-emerald-700" : "text-red-700"} />
          <Kpi label="Profit Margin" value={`${num(totals.margin)}%`} hint={showInv ? `Invoiced: ${money(totals.invoiced)}` : undefined} />
        </div>

        {isLoading ? <Loading /> : (
          <>
            <ChartCard title={`Income vs Expenses — ${yearMode ? year : periodLabel(period, from, to)}`} empty={!hasData} height={380}>
              <ComposedChart data={months}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={compact} />
                <Tooltip formatter={(v: any, n: any) => [money(v), n]} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="profit" name="Profit / Loss" stroke="#1e3a5f" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ChartCard>
            <Card className="rounded-2xl overflow-hidden">
              <Table>
                <TableHeader><TableRow>{table.headers.map((h, i) => <TableHead key={h} className={i ? "text-right" : ""}>{h}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {months.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{rowLabel(m)}</TableCell>
                      {showInv && <TableCell className="text-right text-muted-foreground">{money(m.invoiced)}</TableCell>}
                      <TableCell className="text-right text-emerald-700">{money(m.income)}</TableCell>
                      <TableCell className="text-right text-red-600">{money(m.expenses)}</TableCell>
                      <TableCell className={`text-right font-bold ${m.profit < 0 ? "text-red-700" : ""}`}>{money(m.profit)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-primary/5 font-bold">{table.footer.map((c, j) => <TableCell key={j} className={j ? "text-right" : ""}>{c}</TableCell>)}</TableRow>
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Leads Conversions Report
// ════════════════════════════════════════════════════════════════════════════

const CONVERTED_STATUS = /^(customer|converted|won)$/i;

export const ReportLeads = () => {
  const [mode, setMode] = useState<"general" | "staff">("general");
  const [period, setPeriod] = useState("this_year");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [staffId, setStaffId] = useState("all");
  const [sourceId, setSourceId] = useState("all");
  const [search, setSearch] = useState("");
  const companyName = useCompanyName();
  const { permissions, isAdmin: isAdminUser, user: me } = usePermissions();
  const leadsLevel = viewLevel(permissions, isAdminUser || !!me?.is_superadmin || me?.admin === true, "Leads");

  const leadsQ = useQuery({ queryKey: ["leads", "report"], queryFn: () => leadService.getAll() });
  const { data: sourcesRaw } = useQuery({ queryKey: ["lead-sources", "report"], queryFn: leadService.getSources });
  const { data: statusesRaw } = useQuery({ queryKey: ["lead-statuses", "report"], queryFn: leadService.getStatuses });
  const { data: staffRaw } = useQuery({ queryKey: ["staff", "assignable"], queryFn: staffService.getAssignable });
  const leads = toList(leadsQ.data);
  const sources = toList(sourcesRaw);
  const statuses = toList(statusesRaw);
  const staff = toList(staffRaw);

  const statusName = (l: any) => (typeof l.status === "object" ? l.status?.name : statuses.find((s: any) => s._id === l.status)?.name) || "No status";
  const sourceName = (l: any) => (typeof l.source === "object" ? l.source?.name : sources.find((s: any) => s._id === l.source)?.name) || "No source";
  const isConverted = (l: any) => !!l.client_id || CONVERTED_STATUS.test(statusName(l));
  const staffName = (id: string) => personName(staff.find((s: any) => String(s._id) === id)) || "Unknown";
  const leadDate = (l: any) => l.dateadded || l.createdAt;

  const range = periodRange(period, from, to);
  const filtered = leads.filter((l) =>
    inRange(leadDate(l), range) &&
    (staffId === "all" || idOf(l.assigned) === staffId || idOf(l.addedfrom) === staffId) &&
    (sourceId === "all" || idOf(l.source) === sourceId) &&
    (!search.trim() || [l.name, l.company, l.email, l.phonenumber, l.title, l.city].filter(Boolean).join(" ").toLowerCase().includes(search.trim().toLowerCase()))
  );
  const converted = filtered.filter(isConverted);
  const lost = filtered.filter((l) => l.lost);
  const junk = filtered.filter((l) => l.junk);
  const rate = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

  const trend = useMemo(() => {
    const b = timeBuckets(filtered.map((l) => toLocal(leadDate(l))!).filter(Boolean), range);
    const map = new Map(b.keys.map((k) => [k, { key: k, label: b.labelOf(k), created: 0, converted: 0, rate: 0 }]));
    filtered.forEach((l) => {
      const d = toLocal(leadDate(l));
      if (!d) return;
      const row = map.get(b.keyOf(d));
      if (!row) return;
      row.created++;
      if (isConverted(l)) row.converted++;
    });
    return [...map.values()].map((r) => ({ ...r, rate: rate(r.converted, r.created) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length, period, from, to, staffId, sourceId, search, leadsQ.dataUpdatedAt]);

  const group = (keyFn: (l: any) => string) => {
    const m = new Map<string, { name: string; created: number; converted: number; lost: number }>();
    filtered.forEach((l) => {
      const k = keyFn(l);
      const r = m.get(k) || { name: k, created: 0, converted: 0, lost: 0 };
      r.created++;
      if (isConverted(l)) r.converted++;
      if (l.lost) r.lost++;
      m.set(k, r);
    });
    return [...m.values()].map((r) => ({ ...r, rate: rate(r.converted, r.created) })).sort((a, b) => b.created - a.created);
  };
  const bySource = group(sourceName);
  const byStatus = group(statusName).map((r) => ({ name: r.name, value: r.created }));
  const byStaff = (() => {
    const m = new Map<string, any>();
    filtered.forEach((l) => {
      const id = idOf(l.assigned) || "";
      const name = id ? staffName(id) : "Not assigned";
      const r = m.get(name) || { name, created: 0, converted: 0, lost: 0, junk: 0 };
      r.created++;
      if (isConverted(l)) r.converted++;
      if (l.lost) r.lost++;
      if (l.junk) r.junk++;
      m.set(name, r);
    });
    return [...m.values()].map((r) => ({ ...r, rate: rate(r.converted, r.created) })).sort((a, b) => b.converted - a.converted || b.created - a.created);
  })();

  const kpis = [
    { label: "Leads", value: String(filtered.length) },
    { label: "Converted", value: String(converted.length) },
    { label: "Conversion Rate", value: `${rate(converted.length, filtered.length)}%` },
    { label: "Lost", value: String(lost.length) },
    { label: "Junk", value: String(junk.length) },
  ];

  const onExport = (kind: ExportKind) => {
    const filters = [`Period: ${periodLabel(period, from, to)}`, staffId !== "all" ? `Staff: ${staffName(staffId)}` : "", sourceId !== "all" ? `Source: ${sources.find((s: any) => s._id === sourceId)?.name}` : "", search.trim() ? `Search: ${search.trim()}` : ""].filter(Boolean).join(" · ");
    const sections = mode === "staff"
      ? [{ title: "Conversions by Staff (assigned)", headers: ["Staff", "Leads", "Converted", "Lost", "Junk", "Conversion %"], rows: byStaff.map((r) => [r.name, r.created, r.converted, r.lost, r.junk, `${r.rate}%`]), footer: ["Total", filtered.length, converted.length, lost.length, junk.length, `${rate(converted.length, filtered.length)}%`] }]
      : [
          { title: trend.length && trend[0].key.length > 7 ? "Leads by Day" : "Leads by Month", headers: ["Period", "Leads Created", "Converted", "Conversion %"], rows: trend.filter((r) => r.created).map((r) => [r.label, r.created, r.converted, `${r.rate}%`]), footer: ["Total", filtered.length, converted.length, `${rate(converted.length, filtered.length)}%`] },
          { title: "Leads by Source", headers: ["Source", "Leads", "Converted", "Lost", "Conversion %"], rows: bySource.map((r) => [r.name, r.created, r.converted, r.lost, `${r.rate}%`]) },
          { title: "Leads by Status", headers: ["Status", "Leads"], rows: byStatus.map((r) => [r.name, r.value]) },
        ];
    runExport(kind, { title: `Leads Conversions Report${mode === "staff" ? " — Staff" : ""}`, subtitle: filters, companyName, kpis, sections, fileName: `leads_report_${mode}` });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        <ReportHeader title={`Leads Conversions Report${mode === "staff" ? " (Staff)" : ""}`} description="How many leads came in, from where, and how many became customers">
          <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
          <div className="flex flex-col gap-1.5">
            <FilterLabel>Staff</FilterLabel>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="w-[160px] h-9 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Staff</SelectItem>
                {staff.map((s: any) => <SelectItem key={s._id} value={String(s._id)} className="text-xs">{personName(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <FilterLabel>Source</FilterLabel>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger className="w-[150px] h-9 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Sources</SelectItem>
                {sources.map((s: any) => <SelectItem key={s._id} value={String(s._id)} className="text-xs">{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="h-9 rounded-lg text-xs font-bold gap-2" onClick={() => setMode(mode === "general" ? "staff" : "general")}>
            {mode === "general" ? <><User className="h-3.5 w-3.5" />Staff Report</> : <><TrendingUp className="h-3.5 w-3.5" />General Report</>}
          </Button>
          <div className="flex flex-col gap-1.5">
            <FilterLabel>Search</FilterLabel>
            <SearchBox value={search} onChange={setSearch} placeholder="Name, company, email, phone" />
          </div>
          <ExportMenu onExport={onExport} disabled={leadsQ.isLoading} />
        </ReportHeader>

        <LoadError error={leadsQ.error} what="leads" />
        {leadsLevel === "own" && <OwnRecordsNote what="Leads" />}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {kpis.map((k) => <Kpi key={k.label} label={k.label} value={leadsQ.isLoading ? "…" : k.value} />)}
        </div>

        {leadsQ.isLoading ? <Loading /> : mode === "general" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="lg:col-span-2">
              <ChartCard title="Leads Created vs Converted" empty={!filtered.length} height={320}>
                <ComposedChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} minTickGap={8} />
                  <YAxis yAxisId="l" fontSize={11} allowDecimals={false} />
                  <YAxis yAxisId="r" orientation="right" fontSize={11} unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(v: any, n: any) => [n === "Conversion %" ? `${v}%` : v, n]} />
                  <Legend />
                  <Bar yAxisId="l" dataKey="created" name="Leads Created" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="l" dataKey="converted" name="Converted" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="r" type="monotone" dataKey="rate" name="Conversion %" stroke={COLORS[2]} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ChartCard>
            </div>
            <ChartCard title="Leads by Source — Created vs Converted" empty={!bySource.length}>
              <BarChart data={bySource.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" name="Leads" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="converted" name="Converted" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartCard>
            <ChartCard title="Leads by Status" empty={!byStatus.length}><SimplePie data={byStatus} /></ChartCard>
            <Card className="rounded-2xl overflow-hidden lg:col-span-2">
              <CardHeader className="border-b py-3 px-5"><CardTitle className="text-sm font-bold">Conversion by Source</CardTitle></CardHeader>
              <Table>
                <TableHeader><TableRow>{["Source", "Leads", "Converted", "Lost", "Conversion %"].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {bySource.length === 0 ? <TableEmpty colSpan={5}>No leads for the selected filters.</TableEmpty> :
                    bySource.map((r) => <TableRow key={r.name}><TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.created}</TableCell><TableCell className="text-emerald-700 font-bold">{r.converted}</TableCell><TableCell>{r.lost}</TableCell><TableCell>{r.rate}%</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <ChartCard title="Leads per Staff (assigned) — Created, Converted, Lost" empty={!byStaff.length} height={340}>
              <BarChart data={byStaff}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} interval={0} angle={-15} textAnchor="end" height={55} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" name="Leads" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="converted" name="Converted" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="lost" name="Lost" fill={COLORS[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartCard>
            <Card className="rounded-2xl overflow-hidden">
              <Table>
                <TableHeader><TableRow>{["Staff", "Leads", "Converted", "Lost", "Junk", "Conversion %"].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {byStaff.length === 0 ? <TableEmpty colSpan={6}>No leads for the selected filters.</TableEmpty> :
                    byStaff.map((r) => <TableRow key={r.name}><TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.created}</TableCell><TableCell className="text-emerald-700 font-bold">{r.converted}</TableCell><TableCell>{r.lost}</TableCell><TableCell>{r.junk}</TableCell><TableCell>{r.rate}%</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Timesheets Overview
// ════════════════════════════════════════════════════════════════════════════

const TIMESHEET_PERIODS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "date", label: "Specific Date" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_year", label: "This Year" },
  { value: "all_time", label: "All Time" },
  { value: "custom", label: "Custom Period" },
];
/** "10:05 am – 12:40 pm" from the timer start/end (old entries have none: "-"). */
export const clockTime = (v: any) => (v ? new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "");
export const clockSpan = (a: any, b: any) => (a ? clockTime(a) + (b ? " – " + clockTime(b) : "") : "-");
export const hm = (h: number) => {
  const mins = Math.round(num(h) * 60);
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
};

export const ReportTimesheets = () => {
  const [mode, setMode] = useState<"overview" | "mine">("overview");
  const [period, setPeriod] = useState("this_week");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [staffKey, setStaffKey] = useState("all");
  const [projectKey, setProjectKey] = useState("all");
  const [search, setSearch] = useState("");
  const [billable, setBillable] = useState("all");
  const { user } = usePermissions();
  const companyName = useCompanyName();

  // Everyone's entries for admins / Reports > "View Timesheets Report" / Tasks View (Global); else only their own.
  const entriesQ = useQuery({ queryKey: ["timesheets-report"], queryFn: () => utilityService.getTimesheetsReport() });
  const allStaff = (entriesQ.data as any)?.access?.allStaff !== false;
  const { data: staffRaw } = useQuery({ queryKey: ["staff", "assignable"], queryFn: staffService.getAssignable });
  const { data: tasksRaw } = useQuery({ queryKey: ["tasks-report"], queryFn: () => taskService.getAll() });
  const { data: projectsRaw } = useQuery({ queryKey: ["projects-report"], queryFn: () => projectService.getAll() });
  const staff = toList(staffRaw);
  const taskById = useMemo(() => new Map(toList(tasksRaw).map((t: any) => [String(t._id), t])), [tasksRaw]);
  const projectById = useMemo(() => new Map(toList(projectsRaw).map((p: any) => [String(p._id), p])), [projectsRaw]);
  const staffById = useMemo(() => new Map(staff.map((s: any) => [String(s._id), s])), [staff]);

  // Each entry with real names: member may be a staff id or a typed name;
  // task / project may be an id (task timer) or typed text (Time Tracking page).
  const entries = useMemo(() => toList((entriesQ.data as any)?.entries).map((e: any) => {
    const task = isObjectIdLike(e.task) ? taskById.get(e.task) : null;
    const projectId = isObjectIdLike(e.project) ? e.project : task?.rel_type === "project" ? idOf(task.rel_id) : "";
    const project = projectId ? projectById.get(projectId) : null;
    const memberStaff = isObjectIdLike(e.member) ? staffById.get(e.member) : null;
    const creator = staffById.get(idOf(e.created_by));
    const staffName = personName(memberStaff) || (e.member && !isObjectIdLike(e.member) ? e.member : "") || personName(creator) || "Unknown";
    return {
      id: e._id,
      staffKey: memberStaff ? String(memberStaff._id) : e.member && !isObjectIdLike(e.member) ? `name:${e.member}` : creator ? String(creator._id) : "unknown",
      staff: staffName,
      mine: idOf(e.created_by) === String(user?._id) || idOf(e.member) === String(user?._id),
      task: task?.name || (isObjectIdLike(e.task) ? "Deleted task" : e.task || "-"),
      projectKey: project ? String(project._id) : e.project && !isObjectIdLike(e.project) ? `name:${e.project}` : "none",
      project: project?.name || (e.project && !isObjectIdLike(e.project) ? e.project : "-"),
      date: e.date,
      start: e.start_time || null,
      end: e.end_time || null,
      hours: num(e.hours),
      billable: !!e.billable,
    };
  }), [entriesQ.data, taskById, projectById, staffById, user?._id]);

  const range = periodRange(period, from, to);
  const base = mode === "mine" ? entries.filter((e) => e.mine) : entries;
  const filtered = base
    .filter((e) => inRange(e.date, range))
    .filter((e) => mode === "mine" || staffKey === "all" || e.staffKey === staffKey)
    .filter((e) => projectKey === "all" || e.projectKey === projectKey)
    .filter((e) => billable === "all" || (billable === "yes" ? e.billable : !e.billable))
    .filter((e) => !search.trim() || `${e.task} ${e.project}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => (toLocal(b.date)?.getTime() || 0) - (toLocal(a.date)?.getTime() || 0));

  const staffOptions = useMemo(() => {
    const m = new Map<string, string>();
    entries.forEach((e) => m.set(e.staffKey, e.staff));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [entries]);
  const projectOptions = useMemo(() => {
    const m = new Map<string, string>();
    entries.forEach((e) => e.projectKey !== "none" && m.set(e.projectKey, e.project));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [entries]);

  const total = filtered.reduce((a, e) => a + e.hours, 0);
  const billableHrs = filtered.filter((e) => e.billable).reduce((a, e) => a + e.hours, 0);

  const b = timeBuckets(filtered.map((e) => toLocal(e.date)!).filter(Boolean), range);
  const byTime = (() => {
    const map = new Map(b.keys.map((k) => [k, { label: b.labelOf(k), billable: 0, nonBillable: 0 }]));
    filtered.forEach((e) => {
      const d = toLocal(e.date);
      const r = d && map.get(b.keyOf(d));
      if (!r) return;
      if (e.billable) r.billable += e.hours; else r.nonBillable += e.hours;
    });
    return [...map.values()].map((r) => ({ ...r, billable: Math.round(r.billable * 100) / 100, nonBillable: Math.round(r.nonBillable * 100) / 100 }));
  })();
  const sumBy = (keyFn: (e: any) => string) => {
    const m = new Map<string, { name: string; hours: number; billable: number; entries: number }>();
    filtered.forEach((e) => {
      const k = keyFn(e);
      const r = m.get(k) || { name: k, hours: 0, billable: 0, entries: 0 };
      r.hours += e.hours;
      if (e.billable) r.billable += e.hours;
      r.entries++;
      m.set(k, r);
    });
    return [...m.values()].map((r) => ({ ...r, hours: Math.round(r.hours * 100) / 100, billable: Math.round(r.billable * 100) / 100 })).sort((a, c) => c.hours - a.hours);
  };
  const byStaff = sumBy((e) => e.staff);
  const byProject = sumBy((e) => (e.project === "-" ? "No project" : e.project));

  const onExport = (kind: ExportKind) => {
    const filterText = [
      `Period: ${periodLabel(period, from, to)}`,
      mode === "mine" ? `Staff: ${personName(user) || "Me"}` : staffKey !== "all" ? `Staff: ${staffOptions.find(([k]) => k === staffKey)?.[1]}` : "",
      projectKey !== "all" ? `Project: ${projectOptions.find(([k]) => k === projectKey)?.[1]}` : "",
      billable !== "all" ? (billable === "yes" ? "Billable only" : "Not billable only") : "",
      search.trim() ? `Search: ${search.trim()}` : "",
    ].filter(Boolean).join(" · ");
    runExport(kind, {
      title: mode === "mine" ? "My Timesheets" : "Timesheets Overview",
      subtitle: filterText,
      companyName,
      kpis: [
        { label: "Total Time (h:m)", value: hm(total) },
        { label: "Billable", value: hm(billableHrs) },
        { label: "Not Billable", value: hm(total - billableHrs) },
        { label: "Entries", value: String(filtered.length) },
      ],
      sections: [
        ...(mode === "overview" ? [{ title: "Time by Staff", headers: ["Staff", "Entries", "Billable (h:m)", "Total (h:m)"], rows: byStaff.map((r) => [r.name, r.entries, hm(r.billable), hm(r.hours)]) }] : []),
        { title: "Time by Project", headers: ["Project", "Entries", "Billable (h:m)", "Total (h:m)"], rows: byProject.map((r) => [r.name, r.entries, hm(r.billable), hm(r.hours)]) },
        { title: "Time Entries", headers: ["Date", "Start – End", "Staff", "Task", "Project", "Billable", "Time (h:m)"], rows: filtered.map((e) => [fmtDate(e.date), clockSpan(e.start, e.end), e.staff, e.task, e.project, e.billable ? "Yes" : "No", hm(e.hours)]), footer: ["Total", "", "", "", "", "", hm(total)] },
      ],
      fileName: `timesheets_${mode}`,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        <ReportHeader title={mode === "mine" ? "My Timesheets" : "Timesheets Overview"} description="Time logged on tasks — from task timers and the Time Tracking page">
          <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} options={TIMESHEET_PERIODS} />
          {mode === "overview" && allStaff && (
            <div className="flex flex-col gap-1.5">
              <FilterLabel>Staff</FilterLabel>
              <Select value={staffKey} onValueChange={setStaffKey}>
                <SelectTrigger className="w-[160px] h-9 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Staff</SelectItem>
                  {staffOptions.map(([k, n]) => <SelectItem key={k} value={k} className="text-xs">{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <FilterLabel>Project</FilterLabel>
            <Select value={projectKey} onValueChange={setProjectKey}>
              <SelectTrigger className="w-[160px] h-9 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Projects</SelectItem>
                {projectOptions.map(([k, n]) => <SelectItem key={k} value={k} className="text-xs">{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <FilterLabel>Billable</FilterLabel>
            <Select value={billable} onValueChange={setBillable}>
              <SelectTrigger className="w-[120px] h-9 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All</SelectItem>
                <SelectItem value="yes" className="text-xs">Billable</SelectItem>
                <SelectItem value="no" className="text-xs">Not billable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <FilterLabel>Search task</FilterLabel>
            <div className="relative"><Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Task or project" className="h-9 w-[170px] pl-8 text-xs rounded-lg" /></div>
          </div>
          {allStaff && (
            <Button variant="outline" className="h-9 rounded-lg text-xs font-bold" onClick={() => setMode(mode === "overview" ? "mine" : "overview")}>
              {mode === "overview" ? "My Timesheets" : "All Staff Overview"}
            </Button>
          )}
          <ExportMenu onExport={onExport} disabled={entriesQ.isLoading} />
        </ReportHeader>

        <LoadError error={entriesQ.error} what="time entries" />
        {!entriesQ.isLoading && !allStaff && <OwnRecordsNote what="Timesheets (to see all staff, your role needs Reports > View Timesheets Report)" />}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Total Time" value={hm(total)} hint="hours:minutes" />
          <Kpi label="Billable" value={hm(billableHrs)} tone="text-emerald-600" />
          <Kpi label="Not Billable" value={hm(total - billableHrs)} tone="text-amber-600" />
          <Kpi label="Entries" value={filtered.length} />
        </div>

        {entriesQ.isLoading ? <Loading /> : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="lg:col-span-2">
                <ChartCard title={`Hours ${b.daily ? "per Day" : "per Month"} — Billable vs Not Billable`} empty={!filtered.length}>
                  <BarChart data={byTime}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" fontSize={11} minTickGap={6} />
                    <YAxis fontSize={11} unit="h" />
                    <Tooltip formatter={(v: any, n: any) => [hm(v), n]} />
                    <Legend />
                    <Bar dataKey="billable" stackId="h" name="Billable" fill={COLORS[1]} />
                    <Bar dataKey="nonBillable" stackId="h" name="Not Billable" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartCard>
              </div>
              {mode === "overview" && (
                <ChartCard title="Hours by Staff" empty={!byStaff.length}>
                  <BarChart data={byStaff.slice(0, 12)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={10} interval={0} angle={-15} textAnchor="end" height={55} />
                    <YAxis fontSize={11} unit="h" />
                    <Tooltip formatter={(v: any) => [hm(v), "Hours"]} />
                    <Bar dataKey="hours" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartCard>
              )}
              <ChartCard title="Hours by Project" empty={!byProject.length}><SimplePie data={byProject.slice(0, 10).map((r) => ({ name: r.name, value: r.hours }))} /></ChartCard>
            </div>
            <Card className="rounded-2xl overflow-hidden">
              <CardHeader className="border-b py-3 px-5"><CardTitle className="text-sm font-bold">Time Entries ({filtered.length})</CardTitle></CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>{["Date", "Start – End", "Staff", "Task", "Project", "Billable", "Time (h:m)"].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? <TableEmpty colSpan={7}>No time logged for the selected filters.</TableEmpty> : (
                      <>
                        {filtered.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>{fmtDate(e.date)}</TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap">{clockSpan(e.start, e.end)}</TableCell>
                            <TableCell className="font-medium">{e.staff}</TableCell>
                            <TableCell>{e.task}</TableCell>
                            <TableCell className="text-muted-foreground">{e.project}</TableCell>
                            <TableCell>{e.billable ? <Badge variant="outline" className="text-emerald-700 border-emerald-200">Yes</Badge> : <span className="text-muted-foreground">No</span>}</TableCell>
                            <TableCell className="font-bold">{hm(e.hours)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/40 font-bold"><TableCell colSpan={6}>Total</TableCell><TableCell>{hm(total)}</TableCell></TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// KB Articles Report
// ════════════════════════════════════════════════════════════════════════════

export const ReportKBArticles = () => {
  const [groupId, setGroupId] = useState("all");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState("all_time");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const companyName = useCompanyName();

  const { data: groupsRaw } = useQuery({ queryKey: ["kb-groups"], queryFn: supportService.getKBGroups });
  const articlesQ = useQuery({ queryKey: ["kb-articles", "reports"], queryFn: () => supportService.getKBArticles(undefined, true) });
  const groups = toList(groupsRaw);

  const articles = toList(articlesQ.data).map((a: any) => ({
    id: a._id,
    title: a.subject || "-",
    groupId: idOf(a.group),
    group: (typeof a.group === "object" ? a.group?.name : groups.find((g: any) => g._id === a.group)?.name) || "No group",
    published: a.active !== false,
    staffOnly: !!a.staff_article,
    created: a.createdAt,
    updated: a.updatedAt,
  }));
  const range = periodRange(period, from, to);
  const filtered = articles.filter((a) =>
    (groupId === "all" || a.groupId === groupId) &&
    (status === "all" || (status === "published" ? a.published : !a.published)) &&
    inRange(a.created, range) &&
    (!search.trim() || a.title.toLowerCase().includes(search.trim().toLowerCase()))
  );
  const published = filtered.filter((a) => a.published).length;
  const staffOnly = filtered.filter((a) => a.staffOnly).length;

  const byGroup = (() => {
    const m = new Map<string, { name: string; published: number; draft: number }>();
    filtered.forEach((a) => {
      const r = m.get(a.group) || { name: a.group, published: 0, draft: 0 };
      if (a.published) r.published++; else r.draft++;
      m.set(a.group, r);
    });
    return [...m.values()].sort((x, y) => y.published + y.draft - (x.published + x.draft));
  })();
  const b = timeBuckets(filtered.map((a) => toLocal(a.created)!).filter(Boolean), range);
  const byTime = (() => {
    const map = new Map(b.keys.map((k) => [k, { label: b.labelOf(k), articles: 0 }]));
    filtered.forEach((a) => { const d = toLocal(a.created); const r = d && map.get(b.keyOf(d)); if (r) r.articles++; });
    return [...map.values()];
  })();

  const onExport = (kind: ExportKind) =>
    runExport(kind, {
      title: "KB Articles Report",
      subtitle: [`Created: ${periodLabel(period, from, to)}`, groupId !== "all" ? `Group: ${groups.find((g: any) => g._id === groupId)?.name}` : "", status !== "all" ? `Status: ${titleCase(status)}` : ""].filter(Boolean).join(" · "),
      companyName,
      kpis: [
        { label: "Articles", value: String(filtered.length) },
        { label: "Published", value: String(published) },
        { label: "Draft / Inactive", value: String(filtered.length - published) },
        { label: "Staff only", value: String(staffOnly) },
        { label: "Groups", value: String(byGroup.length) },
      ],
      sections: [
        { title: "Articles by Group", headers: ["Group", "Published", "Draft", "Total"], rows: byGroup.map((g) => [g.name, g.published, g.draft, g.published + g.draft]) },
        { title: "Articles", headers: ["Title", "Group", "Status", "Visible to", "Created", "Last Updated"], rows: filtered.map((a) => [a.title, a.group, a.published ? "Published" : "Draft", a.staffOnly ? "Staff only" : "Everyone", fmtDate(a.created), fmtDate(a.updated)]) },
      ],
      fileName: "kb_articles_report",
    });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        <ReportHeader title="KB Articles Report" description="Knowledge Base articles by group, status and when they were written">
          <div className="flex flex-col gap-1.5">
            <FilterLabel>Group</FilterLabel>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger className="w-[160px] h-9 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Groups</SelectItem>
                {groups.map((g: any) => <SelectItem key={g._id} value={String(g._id)} className="text-xs">{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <FilterLabel>Status</FilterLabel>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[130px] h-9 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All</SelectItem>
                <SelectItem value="published" className="text-xs">Published</SelectItem>
                <SelectItem value="draft" className="text-xs">Draft / Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
          <div className="flex flex-col gap-1.5">
            <FilterLabel>Search</FilterLabel>
            <div className="relative"><Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Article title" className="h-9 w-[170px] pl-8 text-xs rounded-lg" /></div>
          </div>
          <ExportMenu onExport={onExport} disabled={articlesQ.isLoading} />
        </ReportHeader>

        <LoadError error={articlesQ.error} what="KB articles" />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi label="Articles" value={filtered.length} />
          <Kpi label="Published" value={published} tone="text-emerald-600" />
          <Kpi label="Draft / Inactive" value={filtered.length - published} tone="text-amber-600" />
          <Kpi label="Staff only" value={staffOnly} />
          <Kpi label="Groups" value={byGroup.length} />
        </div>

        {articlesQ.isLoading ? <Loading /> : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Articles by Group" empty={!byGroup.length}>
                <BarChart data={byGroup}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} interval={0} angle={-15} textAnchor="end" height={55} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="published" stackId="a" name="Published" fill={COLORS[1]} />
                  <Bar dataKey="draft" stackId="a" name="Draft" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartCard>
              <ChartCard title={`Articles Written ${b.daily ? "per Day" : "per Month"}`} empty={!filtered.length}>
                <LineChart data={byTime}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} minTickGap={6} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="articles" name="Articles" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ChartCard>
            </div>
            <Card className="rounded-2xl overflow-hidden">
              <CardHeader className="border-b py-3 px-5"><CardTitle className="text-sm font-bold">Articles ({filtered.length})</CardTitle></CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>{["Title", "Group", "Status", "Visible to", "Created", "Last Updated"].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? <TableEmpty colSpan={6}>No articles for the selected filters.</TableEmpty> :
                      filtered.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.title}</TableCell>
                          <TableCell>{a.group}</TableCell>
                          <TableCell><StatusBadge s={a.published ? "Published" : "Draft"} /></TableCell>
                          <TableCell className="text-muted-foreground">{a.staffOnly ? "Staff only" : "Everyone"}</TableCell>
                          <TableCell className="text-muted-foreground">{fmtDate(a.created)}</TableCell>
                          <TableCell className="text-muted-foreground">{fmtDate(a.updated)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Purchase Report
// ════════════════════════════════════════════════════════════════════════════

export const ReportPurchase = () => {
  const [period, setPeriod] = useState("all_time");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [payStatus, setPayStatus] = useState("all");
  const money = useMoney();
  const companyName = useCompanyName();
  const customIncomplete = needsDate(period, from, to);

  const { data = {} as any, isLoading, error: loadError } = useQuery({
    queryKey: ["purchaseReport", period, from, to],
    queryFn: () => utilityService.getPurchaseReport(period, from, to),
    enabled: !customIncomplete,
  });
  const all: any[] = data.purchasesReport || [];
  const statuses = [...new Set(all.map((p) => p.payment_status || "Unknown"))];
  const list = all.filter((p) =>
    (payStatus === "all" || (p.payment_status || "Unknown") === payStatus) &&
    (!search.trim() || `${p.bill_no || ""} ${p.supplier_name || ""}`.toLowerCase().includes(search.trim().toLowerCase()))
  );
  const k = data.kpis || {};
  const totalOf = (key: string) => list.reduce((a, p) => a + num(p[key]), 0);

  const table = {
    headers: ["Bill No", "Supplier", "Bill Date", "Due Date", "Qty", "Rate", "Amount", "GST %", "Total", "Status"],
    rows: list.map((p) => [p.bill_no || "-", p.supplier_name || "-", fmtDate(p.bill_date), fmtDate(p.due_date), num(p.quantity), money(p.rate), money(p.amount), `${num(p.gst_rate)}%`, money(p.total), p.payment_status || "-"]),
    footer: ["Total", `${list.length} bills`, "", "", totalOf("quantity"), "", money(totalOf("amount")), "", money(totalOf("total")), ""],
  };

  const onExport = (kind: ExportKind) =>
    runExport(kind, {
      title: "Purchase Report",
      subtitle: [`Period: ${periodLabel(period, from, to)}`, payStatus !== "all" ? `Status: ${payStatus}` : "", search.trim() ? `Search: ${search.trim()}` : ""].filter(Boolean).join(" · "),
      companyName,
      kpis: [
        { label: "Total Purchases", value: money(k.totalPurchaseAmount) },
        { label: "Paid", value: money(k.totalPaid) },
        { label: "Outstanding", value: money(k.totalOutstanding) },
        { label: "GST", value: money(k.totalGST) },
        { label: "Bills", value: String(k.count || 0) },
      ],
      sections: [
        { title: "Purchase Bills", ...table },
        { title: "Purchases by Supplier", headers: ["Supplier", "Amount"], rows: (data.supplierDistribution || []).map((s: any) => [s.name, money(s.value)]) },
      ],
      fileName: "purchase_report",
    });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        <ReportHeader title="Purchase Report" description="Purchase bills, suppliers and payment status">
          <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
          <div className="flex flex-col gap-1.5">
            <FilterLabel>Payment Status</FilterLabel>
            <Select value={payStatus} onValueChange={setPayStatus}>
              <SelectTrigger className="w-[140px] h-9 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All</SelectItem>
                {statuses.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <FilterLabel>Search</FilterLabel>
            <div className="relative"><Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Bill no or supplier" className="h-9 w-[170px] pl-8 text-xs rounded-lg" /></div>
          </div>
          <ExportMenu onExport={onExport} disabled={isLoading} />
        </ReportHeader>

        <LoadError error={loadError} what="the Purchase Report" />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi label="Total Purchases" value={money(k.totalPurchaseAmount)} hint={`${k.count || 0} bills`} />
          <Kpi label="Paid" value={money(k.totalPaid)} tone="text-emerald-600" />
          <Kpi label="Outstanding" value={money(k.totalOutstanding)} tone="text-red-600" />
          <Kpi label="GST" value={money(k.totalGST)} />
          <Kpi label="Suppliers" value={(data.supplierDistribution || []).length} />
        </div>

        {isLoading ? <Loading /> : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <ChartCard title="Purchases by Month" empty={!(data.purchaseTrend || []).length}>
                  <BarChart data={data.purchaseTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={compact} />
                    <Tooltip formatter={(v: any) => [money(v), "Purchases"]} />
                    <Bar dataKey="amount" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartCard>
              </div>
              <ChartCard title="By Payment Status" empty={!(data.statusDistribution || []).length}><SimplePie data={data.statusDistribution || []} money={money} /></ChartCard>
            </div>
            <ChartCard title="Top Suppliers" empty={!(data.supplierDistribution || []).length}>
              <BarChart data={(data.supplierDistribution || []).slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={11} tickFormatter={compact} />
                <YAxis type="category" dataKey="name" width={140} fontSize={10} />
                <Tooltip formatter={(v: any) => [money(v), "Amount"]} />
                <Bar dataKey="value" fill={COLORS[4]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartCard>
            <Card className="rounded-2xl overflow-hidden">
              <CardHeader className="border-b py-3 px-5"><CardTitle className="text-sm font-bold">Purchase Bills ({list.length})</CardTitle></CardHeader>
              <div className="overflow-x-auto">
                <Table className="min-w-[1000px]">
                  <TableHeader><TableRow>{table.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {table.rows.length === 0 ? <TableEmpty colSpan={table.headers.length}>No purchase bills for the selected filters.</TableEmpty> : (
                      <>
                        {table.rows.map((r, i) => <TableRow key={i}>{r.map((c, j) => <TableCell key={j} className={j === 0 ? "font-medium" : ""}>{j === 9 ? <StatusBadge s={String(c)} /> : c}</TableCell>)}</TableRow>)}
                        <TableRow className="bg-muted/40 font-bold">{table.footer.map((c, j) => <TableCell key={j}>{c}</TableCell>)}</TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// Shared building blocks for the other report pages (pages/WorkReports.tsx).
export { ExportMenu, runExport, FilterLabel, PeriodFilter, ReportHeader, Kpi, ChartCard, LoadError, Loading, isForbidden, useCompanyName, fmtDate, COLORS, toList, num, titleCase };

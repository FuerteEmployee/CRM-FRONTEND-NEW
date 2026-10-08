import { useEffect, useState } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { PiggyBank, ChevronLeft, ChevronRight, Download, RefreshCw, Users, CalendarClock, CalendarDays, AlertCircle, Search, X } from "lucide-react";
import { Button } from "@/hrms/components/ui/button";
import { Badge } from "@/hrms/components/ui/badge";
import { apiClient } from "@/hrms/services/apiClient";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";
import { cn } from "@/hrms/lib/utils";

/* PF Records — admin view: every PF employee for a month with their PF setting
 * (Yes/No, Fixed monthly / Per day) and the PF payroll actually deducted.
 * mine = the logged-in employee's own PF, month by month for a year. */

interface PfRow {
  employeeId: string;
  name: string;
  employeeCode: string;
  branch: string;
  isActive: boolean;
  pfApplicable: boolean;
  pfMode: "fixed_monthly" | "per_day";
  pfConfigured: number;
  pfRate?: number;
  basic: number;
  payrollGenerated: boolean;
  payableDays: number | null;
  grossSalary: number | null;
  pfDeducted: number;
  paymentStatus: string | null;
}
interface PfSummary { employees: number; fixedMonthly: number; perDay: number; payrollPending: number; totalPfDeducted: number }
interface MyPf {
  name: string;
  pfApplicable: boolean;
  pfMode: "fixed_monthly" | "per_day";
  pfConfigured: number;
  pfRate?: number;
  basic: number;
  year: number;
  months: { month: number; year: number; payableDays: number; grossSalary: number; pfDeducted: number; paymentStatus: string }[];
  totalPfDeducted: number;
}

const inr = (n?: number | null) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const modeLabel = (m: string) => (m === "fixed_monthly" ? "Fixed monthly" : "Per day");
const pfSettingText = (r: { pfApplicable: boolean; pfMode: string; pfConfigured: number; basic: number; pfRate?: number }) => {
  const rate = r.pfRate ?? 12;
  return !r.pfApplicable ? "No PF" : `${modeLabel(r.pfMode)} · ${r.pfConfigured > 0 ? `${inr(r.pfConfigured)}/mo` : `${rate}% of Basic (${inr((r.basic * rate) / 100)})`}`;
};

function Tile({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string | number; tone: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", tone)}><Icon className="h-4 w-4" /></div>
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-base font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export default function PFRecordsPage({ mine = false }: { mine?: boolean }) {
  return mine ? <MyPfView /> : <AdminPfView />;
}

function AdminPfView() {
  const [month, setMonth] = useState(() => subMonths(new Date(), 1)); // payroll is usually for last month
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<any[]>([]);
  const [rows, setRows] = useState<PfRow[]>([]);
  const [summary, setSummary] = useState<PfSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    hrmsbranchService.getAll({ limit: 1000 }).then((r) => setBranches(r.data || []));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    apiClient
      .get("/payroll/pf-records", { params: { month: month.getMonth() + 1, year: month.getFullYear(), storeId: branchId || undefined }, silent: true })
      .then((res: any) => {
        if (cancelled) return;
        setRows(Array.isArray(res?.data) ? res.data : []);
        setSummary(res?.summary || null);
      })
      .catch((e: any) => { if (!cancelled) { setRows([]); setSummary(null); setError(e.message || "Failed to load PF records"); } })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [month, branchId]);

  // Client-side search over the loaded month — name, employee code or branch.
  const q = search.trim().toLowerCase();
  const visibleRows = q
    ? rows.filter((r) => [r.name, r.employeeCode, r.branch].some((v) => String(v || "").toLowerCase().includes(q)))
    : rows;
  const visiblePfTotal = q ? visibleRows.reduce((s, r) => s + (r.payrollGenerated ? Number(r.pfDeducted) || 0 : 0), 0) : summary?.totalPfDeducted;

  const exportCsv = () => {
    const header = ["Employee", "Code", "Branch", "PF Applicable", "PF Mode", "PF Configured (per month)", "Payable Days", "Gross", "PF Deducted", "Payroll Status"];
    const lines = visibleRows.map((r) => [
      r.name, r.employeeCode, r.branch, r.pfApplicable ? "Yes" : "No", r.pfApplicable ? modeLabel(r.pfMode) : "",
      r.pfConfigured > 0 ? r.pfConfigured : `${r.pfRate ?? 12}% of Basic`, r.payableDays ?? "", r.grossSalary ?? "", r.pfDeducted,
      r.payrollGenerated ? r.paymentStatus || "" : "Not generated",
    ]);
    const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `PF_Records_${format(month, "MMM_yyyy")}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50/50 space-y-4 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-emerald-500" /> PF Records
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Each employee's PF setting and the PF deducted in that month's payroll</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, code, branch..."
              className="h-9 w-56 rounded-lg border border-slate-200 bg-white pl-8 pr-7 text-xs shadow-sm outline-none focus:border-slate-300"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold shadow-sm">
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>)}
          </select>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth((m) => subMonths(m, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs font-bold text-slate-700 px-2 min-w-[90px] text-center uppercase tracking-wider">{format(month, "MMM yyyy")}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={exportCsv} disabled={!visibleRows.length}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile icon={Users} label="PF Employees" value={summary?.employees ?? 0} tone="text-slate-600 bg-slate-100" />
        <Tile icon={CalendarClock} label="Fixed monthly" value={summary?.fixedMonthly ?? 0} tone="text-indigo-600 bg-indigo-50" />
        <Tile icon={CalendarDays} label="Per day" value={summary?.perDay ?? 0} tone="text-violet-600 bg-violet-50" />
        <Tile icon={PiggyBank} label={`Total PF deducted · ${format(month, "MMM")}`} value={inr(summary?.totalPfDeducted)} tone="text-emerald-600 bg-emerald-50" />
      </div>

      {!!summary?.payrollPending && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertCircle className="h-3.5 w-3.5" />
          Payroll not generated yet for {summary.payrollPending} PF employee(s) in {format(month, "MMMM yyyy")} — generate it in Salary Management to see their PF deducted.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Loading PF records...</div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-red-500">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No employees with PF {branchId ? "in this branch" : ""}. Turn PF on in the staff form (Salary &amp; Banking).</div>
        ) : visibleRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No PF records match "{search}".</div>
        ) : (
          <table className="w-full text-xs min-w-[820px]">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left font-semibold px-4 py-2.5">Employee</th>
                <th className="text-left font-semibold px-4 py-2.5">Branch</th>
                <th className="text-left font-semibold px-4 py-2.5">PF Setting</th>
                <th className="text-center font-semibold px-4 py-2.5">Payable Days</th>
                <th className="text-right font-semibold px-4 py-2.5">Gross</th>
                <th className="text-right font-semibold px-4 py-2.5">PF Deducted</th>
                <th className="text-right font-semibold px-4 py-2.5">Payroll</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.employeeId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-slate-700">{r.name}</p>
                    <p className="text-[10px] text-slate-400">{r.employeeCode || "—"}{!r.isActive && " · inactive"}</p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{r.branch || "—"}</td>
                  <td className="px-4 py-2.5">
                    <Badge className={cn("border-0 text-[10px] font-semibold", !r.pfApplicable ? "bg-slate-100 text-slate-500" : r.pfMode === "fixed_monthly" ? "bg-indigo-100 text-indigo-700" : "bg-violet-100 text-violet-700")}>
                      {pfSettingText(r)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-center text-slate-600">{r.payableDays ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{r.grossSalary != null ? inr(r.grossSalary) : "—"}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{r.payrollGenerated ? inr(r.pfDeducted) : "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    {r.payrollGenerated
                      ? <Badge className={cn("border-0 text-[10px]", r.paymentStatus === "Paid" || r.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700")}>{r.paymentStatus === "Paid" || r.paymentStatus === "paid" ? "Paid" : "Due"}</Badge>
                      : <span className="text-[10px] text-amber-600 font-semibold">Not generated</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={5} className="px-4 py-2.5 text-right font-semibold text-slate-600">Total PF deducted{q && ` (${visibleRows.length} shown)`}</td>
                <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{inr(visiblePfTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

function MyPfView() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [data, setData] = useState<MyPf | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    apiClient
      .get("/payroll/pf-records/me", { params: { year }, silent: true })
      .then((res: any) => { if (!cancelled) setData(res?.data || null); })
      .catch((e: any) => { if (!cancelled) { setData(null); setError(e.message || "Failed to load your PF records"); } })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [year]);

  return (
    <div className="min-h-screen bg-slate-50/50 space-y-4 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-emerald-500" /> My PF
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Your PF setting and the PF deducted from each month's salary</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear((y) => y - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-xs font-bold text-slate-700 px-3">{year}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear((y) => y + 1)} disabled={year >= new Date().getFullYear()}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Loading...</div>
      ) : error || !data ? (
        <div className="py-12 text-center text-sm text-slate-400">{error || "No PF data."}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Tile icon={PiggyBank} label="PF Applicable" value={data.pfApplicable ? "Yes" : "No"} tone="text-slate-600 bg-slate-100" />
            <Tile icon={CalendarClock} label="PF Setting" value={pfSettingText(data)} tone="text-indigo-600 bg-indigo-50" />
            <Tile icon={PiggyBank} label={`Total PF deducted · ${year}`} value={inr(data.totalPfDeducted)} tone="text-emerald-600 bg-emerald-50" />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {data.months.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">No payroll generated for you in {year} yet.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="text-left font-semibold px-4 py-2.5">Month</th>
                    <th className="text-center font-semibold px-4 py-2.5">Payable Days</th>
                    <th className="text-right font-semibold px-4 py-2.5">Gross</th>
                    <th className="text-right font-semibold px-4 py-2.5">PF Deducted</th>
                    <th className="text-right font-semibold px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((m) => (
                    <tr key={`${m.year}-${m.month}`} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2.5 font-semibold text-slate-700">{format(new Date(m.year, m.month - 1, 1), "MMMM yyyy")}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600">{m.payableDays}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{inr(m.grossSalary)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{inr(m.pfDeducted)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Badge className={cn("border-0 text-[10px]", m.paymentStatus === "Paid" || m.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700")}>
                          {m.paymentStatus === "Paid" || m.paymentStatus === "paid" ? "Paid" : "Due"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

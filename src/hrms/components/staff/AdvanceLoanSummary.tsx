import { useEffect, useState } from "react";
import { format } from "date-fns";
import { HandCoins, Landmark, Wallet, ShieldCheck, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Badge } from "@/hrms/components/ui/badge";
import { apiClient } from "@/hrms/services/apiClient";
import { cn } from "@/hrms/lib/utils";

/* Advance Salary + Loan summary for one employee — used on the HRMS Employee
 * Profile (Advance & Loans tab) and on the user's own My Profile page.
 * employeeId = HRMS User id, or "me" for the logged-in user. */

interface Installment { month: number; year: number; amount: number; deductedAt?: string; source?: "payroll" | "manual"; note?: string }
interface AdvanceRecord {
  _id: string;
  type: "Advance Salary" | "Loan";
  amount: number;
  reason: string;
  requestDate: string;
  status: "Pending" | "Approved" | "Rejected" | "Repaid";
  monthlyInstallmentAmount?: number;
  remainingAmount?: number | null;
  installments?: Installment[];
}
interface Limit { fixedSalary: number; capPercent: number; maxAllowed: number; outstanding: number; available: number }

const STATUS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
  Repaid: "bg-slate-100 text-slate-600",
};
const inr = (n?: number | null) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const balanceOf = (r: AdvanceRecord) => (r.status === "Approved" ? Number(r.remainingAmount ?? r.amount) || 0 : 0);

export function AdvanceLoanSummary({ employeeId, hideWhenEmpty = false }: { employeeId: string; hideWhenEmpty?: boolean }) {
  const [records, setRecords] = useState<AdvanceRecord[]>([]);
  const [limit, setLimit] = useState<Limit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasEmployee, setHasEmployee] = useState(true);
  const [openLoan, setOpenLoan] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    setIsLoading(true);
    Promise.allSettled([
      apiClient.get("/advance-salary", { params: { employeeId }, silent: true }),
      apiClient.get(`/advance-salary/limit/${employeeId}`, { silent: true }),
    ]).then(([recs, lim]) => {
      if (cancelled) return;
      const raw = recs.status === "fulfilled" ? ((recs.value as any)?.data ?? []) : [];
      setRecords(Array.isArray(raw) ? raw : []);
      setLimit(lim.status === "fulfilled" ? ((lim.value as any)?.data ?? null) : null);
      // No HRMS employee record behind this login (limit lookup 404s).
      setHasEmployee(lim.status === "fulfilled");
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [employeeId]);

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Loading advance &amp; loans...</div>;
  }
  if (!hasEmployee && records.length === 0) {
    return hideWhenEmpty ? null : <div className="py-10 text-center text-sm text-slate-400">No HRMS employee record linked to this account.</div>;
  }

  const advances = records.filter((r) => r.type === "Advance Salary");
  const loans = records.filter((r) => r.type === "Loan");
  const loanBalance = loans.reduce((s, r) => s + balanceOf(r), 0);
  const monthlyEmi = loans.filter((r) => r.status === "Approved").reduce((s, r) => s + (Number(r.monthlyInstallmentAmount) || 0), 0);

  const tiles = [
    { label: "Fixed Salary", value: inr(limit?.fixedSalary), icon: Wallet, tone: "text-slate-600 bg-slate-100" },
    { label: `Advance Available (${limit?.capPercent ?? 100}% cap)`, value: inr(limit?.available), icon: ShieldCheck, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Advance Outstanding", value: inr(limit?.outstanding), icon: HandCoins, tone: "text-indigo-600 bg-indigo-50" },
    { label: monthlyEmi ? `Loan Balance · ${inr(monthlyEmi)}/mo EMI` : "Loan Balance", value: inr(loanBalance), icon: Landmark, tone: "text-violet-600 bg-violet-50" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", tone)}><Icon className="h-4 w-4" /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide truncate" title={label}>{label}</p>
              <p className="text-base font-bold text-slate-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Advance Salary */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <HandCoins className="h-4 w-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-700">Advance Salary</h3>
          <Badge className="ml-auto bg-slate-100 text-slate-600 border-0 text-[10px]">{advances.length}</Badge>
        </div>
        {advances.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-slate-400">No advance salary requests.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left font-semibold px-4 py-2">Date</th>
                <th className="text-left font-semibold px-4 py-2">Reason</th>
                <th className="text-right font-semibold px-4 py-2">Amount</th>
                <th className="text-right font-semibold px-4 py-2">Outstanding</th>
                <th className="text-right font-semibold px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {advances.map((r) => (
                <tr key={r._id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{r.requestDate ? format(new Date(r.requestDate), "dd MMM yyyy") : "—"}</td>
                  <td className="px-4 py-2 text-slate-500 max-w-[220px] truncate" title={r.reason}>{r.reason}</td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-700">{inr(r.amount)}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{r.status === "Approved" ? inr(balanceOf(r)) : "—"}</td>
                  <td className="px-4 py-2 text-right"><Badge className={cn("border-0 text-[10px]", STATUS[r.status])}>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Loans */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Landmark className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-slate-700">Loans</h3>
          <Badge className="ml-auto bg-slate-100 text-slate-600 border-0 text-[10px]">{loans.length}</Badge>
        </div>
        {loans.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-slate-400">No loans.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {loans.map((r) => {
              const paid = (r.installments || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
              const pct = r.amount ? Math.min(100, Math.round((paid / r.amount) * 100)) : 0;
              const isOpen = openLoan === r._id;
              return (
                <div key={r._id} className="px-4 py-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="font-semibold text-slate-700">{inr(r.amount)}</span>
                    <span className="text-slate-400">{r.requestDate ? format(new Date(r.requestDate), "dd MMM yyyy") : ""}</span>
                    <span className="text-slate-500 truncate max-w-[220px]" title={r.reason}>{r.reason}</span>
                    <Badge className={cn("border-0 text-[10px] ml-auto", STATUS[r.status])}>{r.status}</Badge>
                  </div>
                  {(r.status === "Approved" || r.status === "Repaid") && (
                    <>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span>Paid {inr(paid)} ({pct}%)</span>
                        <span className="font-semibold text-violet-700">Balance {inr(balanceOf(r))}</span>
                        {Number(r.monthlyInstallmentAmount) > 0 && <span>EMI {inr(r.monthlyInstallmentAmount)}/month</span>}
                        {!!r.installments?.length && (
                          <button type="button" className="ml-auto flex items-center gap-1 text-violet-600 font-semibold hover:underline"
                            onClick={() => setOpenLoan(isOpen ? null : r._id)}>
                            Repayment history {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                  {isOpen && (
                    <table className="w-full text-[11px] border border-violet-100 rounded-lg overflow-hidden">
                      <thead className="bg-violet-50/60 text-slate-500">
                        <tr>
                          <th className="text-left font-semibold px-3 py-1.5">Date</th>
                          <th className="text-left font-semibold px-3 py-1.5">How</th>
                          <th className="text-right font-semibold px-3 py-1.5">Repaid</th>
                          <th className="text-right font-semibold px-3 py-1.5">Balance after</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let balance = r.amount || 0;
                          return [...(r.installments || [])]
                            .sort((a, b) => new Date(a.deductedAt || new Date(a.year, a.month - 1, 1)).getTime() - new Date(b.deductedAt || new Date(b.year, b.month - 1, 1)).getTime())
                            .map((ins, i) => {
                              balance = Math.max(0, balance - (ins.amount || 0));
                              const manual = ins.source === "manual";
                              return (
                                <tr key={i} className="border-t border-slate-100">
                                  <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap">
                                    {manual && ins.deductedAt ? format(new Date(ins.deductedAt), "dd MMM yyyy") : format(new Date(ins.year, ins.month - 1, 1), "MMM yyyy")}
                                  </td>
                                  <td className="px-3 py-1.5 text-slate-500">
                                    <Badge className={cn("border-0 text-[9px] mr-1", manual ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700")}>{manual ? "Manual" : "Payroll"}</Badge>
                                    {ins.note}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-semibold text-slate-700">{inr(ins.amount)}</td>
                                  <td className="px-3 py-1.5 text-right text-slate-500">{inr(balance)}</td>
                                </tr>
                              );
                            });
                        })()}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

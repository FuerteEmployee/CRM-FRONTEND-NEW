import { useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw, CheckCircle2, Scale } from "lucide-react";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/hrms/components/ui/dialog";
import { toast } from "@/hrms/components/ui/use-toast";
import { apiClient } from "@/hrms/services/apiClient";

/* Loan Limits — admin-editable salary slabs, e.g. ₹20,000–35,000 monthly
 * salary → max ₹3,00,000 loan. Enforced by the backend on loan requests and
 * approvals (advance_salary_controller.checkLoanLimit). */

interface SlabRow { minSalary: string; maxSalary: string; maxLoan: string }

const toRow = (s: any): SlabRow => ({
  minSalary: String(s.minSalary ?? ""),
  maxSalary: s.maxSalary == null ? "" : String(s.maxSalary),
  maxLoan: String(s.maxLoan ?? ""),
});

export function LoanLimitsDialog() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<SlabRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setLoading(true);
    apiClient
      .get("/advance-salary/loan-policy", { silent: true })
      .then((res: any) => {
        const slabs = res?.data?.slabs ?? res?.data?.data?.slabs ?? [];
        setRows(slabs.length ? slabs.map(toRow) : [{ minSalary: "20000", maxSalary: "35000", maxLoan: "" }]);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [open]);

  const update = (i: number, key: keyof SlabRow, value: string) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  const addRow = () => {
    const last = rows[rows.length - 1];
    const nextMin = last?.maxSalary ? String(Number(last.maxSalary) + 1) : "";
    setRows((p) => [...p, { minSalary: nextMin, maxSalary: "", maxLoan: "" }]);
  };

  // Same checks as the backend, shown inside the dialog (a toast behind the
  // modal was easy to miss, so Save looked like it did nothing).
  const validate = (filled: SlabRow[]): string => {
    if (filled.some((r) => r.minSalary === "" || r.maxLoan === "")) return "Each slab needs a 'Salary from' and a 'Max loan'.";
    const slabs = filled
      .map((r) => ({ min: Number(r.minSalary), max: r.maxSalary === "" ? null : Number(r.maxSalary), loan: Number(r.maxLoan) }))
      .sort((a, b) => a.min - b.min);
    for (let i = 0; i < slabs.length; i++) {
      const s = slabs[i];
      const label = `₹${s.min.toLocaleString("en-IN")}${s.max == null ? "+" : `–₹${s.max.toLocaleString("en-IN")}`}`;
      if (s.max != null && s.max < s.min) return `${label}: 'Salary to' must be at least 'Salary from'.`;
      if (!(s.loan > 0)) return `${label}: max loan must be more than ₹0.`;
      const next = slabs[i + 1];
      if (next && (s.max == null || next.min < s.max)) return `${label} overlaps the next slab — salary ranges can't overlap.`;
    }
    return "";
  };

  const save = async () => {
    const filled = rows.filter((r) => r.minSalary !== "" || r.maxSalary !== "" || r.maxLoan !== "");
    const problem = validate(filled);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await apiClient.put("/advance-salary/loan-policy", {
        slabs: filled.map((r) => ({
          minSalary: Number(r.minSalary),
          maxSalary: r.maxSalary === "" ? null : Number(r.maxSalary),
          maxLoan: Number(r.maxLoan),
        })),
      });
      toast({ title: "Loan limits saved", description: filled.length ? `${filled.length} salary slab(s) active.` : "No slabs — every employee gets the default 10× salary limit." });
      setOpen(false);
    } catch (err: any) {
      setError(err?.message || "Couldn't save loan limits.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-9 px-4 font-medium border-slate-200 bg-white shadow-sm hover:bg-slate-50 rounded-lg flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <Scale className="h-3.5 w-3.5 text-violet-500" /> Loan Limits
      </Button>

      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="max-w-lg rounded-2xl border border-slate-200 shadow-2xl bg-white p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
              <Scale className="h-5 w-5 text-violet-500" /> Loan Limits by Salary
            </DialogTitle>
            <p className="text-sm text-slate-500 mt-0.5">Maximum loan an employee can take, based on their monthly salary.</p>
          </DialogHeader>

          <div className="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_1fr_1.2fr_28px] gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 px-0.5">
                  <span>Salary from (₹)</span>
                  <span>Salary to (₹)</span>
                  <span>Max loan (₹)</span>
                  <span />
                </div>
                {rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1.2fr_28px] gap-2 items-center">
                    <Input type="number" min={0} placeholder="20000" value={r.minSalary} onChange={(e) => update(i, "minSalary", e.target.value)} className="h-9 text-sm" />
                    <Input type="number" min={0} placeholder="and above" value={r.maxSalary} onChange={(e) => update(i, "maxSalary", e.target.value)} className="h-9 text-sm" />
                    <Input type="number" min={1} placeholder="300000" value={r.maxLoan} onChange={(e) => update(i, "maxLoan", e.target.value)} className="h-9 text-sm font-semibold" />
                    <button type="button" onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))} className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">{error}</div>
                )}
                <Button type="button" variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5 border-dashed" onClick={addRow}>
                  <Plus className="h-3.5 w-3.5" /> Add salary slab
                </Button>
                <ul className="text-[11px] text-slate-500 space-y-0.5 list-disc pl-4 pt-1">
                  <li>Leave "Salary to" blank for "and above".</li>
                  <li>The limit counts loans still outstanding — a ₹3,00,000 limit with ₹1,00,000 unpaid leaves ₹2,00,000 available.</li>
                  <li>A salary not covered by any slab gets the default limit: 10× monthly salary (e.g. ₹25,000 → ₹2,50,000).</li>
                </ul>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving} className="rounded-lg font-semibold text-sm">Cancel</Button>
            <Button onClick={save} disabled={saving || loading} className="rounded-lg text-white border-0 font-semibold shadow-sm px-6 text-sm bg-violet-500 hover:bg-violet-600">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Save Limits
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

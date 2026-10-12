import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Plus, RefreshCw, Save, Trash2, Users } from "lucide-react";
import { Button } from "@/hrms/components/ui/button";
import { Badge } from "@/hrms/components/ui/badge";
import { staffService } from "@/hrms/services/staffService";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";
import { departmentService } from "@/hrms/services/departmentService";
import { designationService } from "@/hrms/services/designationService";
import { shiftService } from "@/hrms/services/shiftService";
import { toast } from "@/hrms/hooks/use-toast";
import { cn } from "@/hrms/lib/utils";
import { clampPhone10, isValidPhone10 } from "@/lib/validation";

/* Row keys match the backend's import system keys (import_employees_controller.js),
 * so POST /users/bulk-create runs the exact same validation as the Excel import. */
interface StaffRow {
    key: number;
    name: string;
    email: string;
    mobile: string;
    gender: string;
    department: string;
    designation: string;
    hrmsBranchId: string;
    shiftId: string;
    payType: string;
    salaryAmount: string;
    pfApplicable: string; // "Yes" | "No"
    pfMode: string;       // "Fixed monthly" | "Per day"
    pfAmount: string;
    password: string;
}

let nextKey = 1;
const emptyRow = (from?: Partial<StaffRow>): StaffRow => ({
    name: "", email: "", mobile: "", gender: "",
    department: "", designation: "", hrmsBranchId: "", shiftId: "",
    payType: "Monthly", salaryAmount: "",
    pfApplicable: "No", pfMode: "Per day", pfAmount: "",
    password: "",
    ...from,
    key: nextKey++,
});

const idOf = (o: any) => String(o?._id || o?.id || "");
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export default function BulkAddStaffPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";

    const [rows, setRows] = useState<StaffRow[]>(() => [emptyRow(), emptyRow(), emptyRow()]);
    const [branches, setBranches] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [designations, setDesignations] = useState<any[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        Promise.allSettled([
            hrmsbranchService.getAll({ limit: 1000 }),
            departmentService.getAll(),
            designationService.getAll(),
            shiftService.getAll(),
        ]).then(([b, d, g, s]) => {
            if (b.status === "fulfilled") setBranches(b.value.data || []);
            if (d.status === "fulfilled") setDepartments(d.value || []);
            if (g.status === "fulfilled") setDesignations(g.value || []);
            if (s.status === "fulfilled") setShifts(s.value || []);
        });
    }, []);

    const update = (key: number, field: keyof StaffRow, value: string) =>
        setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

    const addRows = (n: number) => setRows((prev) => [...prev, ...Array.from({ length: n }, () => emptyRow())]);

    // Copy everything except the person-specific fields — fast for a batch joining the same branch/shift.
    const duplicateRow = (r: StaffRow) =>
        setRows((prev) => {
            const i = prev.findIndex((x) => x.key === r.key);
            const copy = emptyRow({ ...r, name: "", email: "", mobile: "", password: "" });
            return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
        });

    const removeRow = (key: number) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));

    const filledRows = rows.filter((r) => r.name.trim() || r.email.trim() || r.mobile.trim());
    const rowProblem = (r: StaffRow): string | null => {
        if (!r.name.trim() && !r.email.trim() && !r.mobile.trim()) return null; // blank row, ignored
        if (!r.name.trim()) return "Name required";
        if (!isEmail(r.email)) return "Valid email required";
        // One mobile = one account, exactly 10 digits (backend checks it's not already used).
        if (!isValidPhone10(r.mobile)) return "10-digit mobile required";
        return null;
    };
    const hasProblems = filledRows.some((r) => rowProblem(r));

    const handleSave = async () => {
        if (filledRows.length === 0 || hasProblems) return;
        setIsSaving(true);
        setErrors([]);
        try {
            const payload = filledRows.map(({ key, ...r }) => ({
                ...r,
                email: r.email.trim().toLowerCase(),
                // Only send PF when it's on — any PF column makes the backend create a
                // salary structure, which "No" with no salary breakdown doesn't need.
                pfApplicable: r.pfApplicable === "Yes" ? "Yes" : "",
                pfMode: r.pfApplicable === "Yes" ? r.pfMode : "",
                pfAmount: r.pfApplicable === "Yes" ? r.pfAmount : "",
            }));
            const res = await staffService.bulkCreate(payload);
            toast({
                title: res.failed ? "Bulk add finished with errors" : "Staff added",
                description: `${res.success} added, ${res.failed} failed`,
                variant: res.failed ? "destructive" : undefined,
            });
            if (!res.failed) {
                navigate(`${basePath}/staff/users`);
                return;
            }
            // Keep only the rows that failed (errors are "Row N: ..." in payload order).
            const failedIdx = new Set(
                (res.errors || [])
                    .map((e) => Number(/^Row (\d+):/.exec(e)?.[1]) - 1)
                    .filter((n) => n >= 0)
            );
            setRows(filledRows.filter((_, i) => failedIdx.has(i)).concat(failedIdx.size ? [] : [emptyRow()]));
            setErrors(res.errors || []);
        } catch (error: any) {
            toast({ title: "Bulk add failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const cell = "h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40";
    const th = "px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap";

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(`${basePath}/staff/users`)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold text-[#1a1a1a] tracking-tight flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" /> Bulk Add Staff
                        </h1>
                        <p className="text-[13px] text-slate-500">
                            Each row creates an employee and their login (email + password, default 12345678). Blank rows are ignored.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9" onClick={() => addRows(1)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Row
                    </Button>
                    <Button variant="outline" size="sm" className="h-9" onClick={() => addRows(5)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> 5 Rows
                    </Button>
                    <Button size="sm" className="h-9 gradient-primary text-white border-0" disabled={isSaving || filledRows.length === 0 || hasProblems} onClick={handleSave}>
                        {isSaving ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        Save {filledRows.length || ""} Staff
                    </Button>
                </div>
            </div>

            {errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 space-y-1">
                    <p className="font-semibold">These rows were not saved — fix and save again (row numbers refer to the list as it was):</p>
                    {errors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
            )}

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full min-w-[1500px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className={th}>#</th>
                            <th className={th}>Name *</th>
                            <th className={th}>Email *</th>
                            <th className={th}>Mobile</th>
                            <th className={th}>Gender</th>
                            <th className={th}>Department</th>
                            <th className={th}>Designation</th>
                            <th className={th}>Branch</th>
                            <th className={th}>Shift</th>
                            <th className={th}>Pay Cycle</th>
                            <th className={th}>Salary ₹</th>
                            <th className={th}>PF</th>
                            <th className={th}>PF Mode</th>
                            <th className={th}>PF ₹/mo</th>
                            <th className={th}>Password</th>
                            <th className={th}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => {
                            const problem = rowProblem(r);
                            return (
                                <tr key={r.key} className={cn("border-b border-slate-100 align-top", problem && "bg-red-50/40")}>
                                    <td className="px-2 py-1.5 text-xs text-slate-400">
                                        {i + 1}
                                        {problem && <Badge className="ml-1 bg-red-100 text-red-600 border-0 text-[9px]">{problem}</Badge>}
                                    </td>
                                    <td className="px-1 py-1.5 min-w-[150px]"><input className={cell} value={r.name} onChange={(e) => update(r.key, "name", e.target.value)} /></td>
                                    <td className="px-1 py-1.5 min-w-[190px]"><input type="email" className={cell} value={r.email} onChange={(e) => update(r.key, "email", e.target.value)} /></td>
                                    <td className="px-1 py-1.5 min-w-[120px]"><input className={cell} inputMode="numeric" maxLength={10} placeholder="10 digits" value={r.mobile} onChange={(e) => update(r.key, "mobile", clampPhone10(e.target.value))} /></td>
                                    <td className="px-1 py-1.5 min-w-[90px]">
                                        <select className={cell} value={r.gender} onChange={(e) => update(r.key, "gender", e.target.value)}>
                                            <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
                                        </select>
                                    </td>
                                    <td className="px-1 py-1.5 min-w-[130px]">
                                        <select className={cell} value={r.department} onChange={(e) => update(r.key, "department", e.target.value)}>
                                            <option value="">General</option>
                                            {departments.map((d) => <option key={idOf(d)} value={idOf(d)}>{d.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-1 py-1.5 min-w-[130px]">
                                        <select className={cell} value={r.designation} onChange={(e) => update(r.key, "designation", e.target.value)}>
                                            <option value="">—</option>
                                            {designations.map((d) => <option key={idOf(d)} value={idOf(d)}>{d.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-1 py-1.5 min-w-[130px]">
                                        <select className={cell} value={r.hrmsBranchId} onChange={(e) => update(r.key, "hrmsBranchId", e.target.value)}>
                                            <option value="">—</option>
                                            {branches.map((b) => <option key={idOf(b)} value={idOf(b)}>{b.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-1 py-1.5 min-w-[120px]">
                                        <select className={cell} value={r.shiftId} onChange={(e) => update(r.key, "shiftId", e.target.value)}>
                                            <option value="">—</option>
                                            {shifts.map((s) => <option key={idOf(s)} value={idOf(s)}>{s.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-1 py-1.5 min-w-[100px]">
                                        <select className={cell} value={r.payType} onChange={(e) => update(r.key, "payType", e.target.value)}>
                                            {["Monthly", "Weekly", "Daily", "Hourly"].map((p) => <option key={p}>{p}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-1 py-1.5 min-w-[100px]"><input type="number" min={0} className={cell} value={r.salaryAmount} onChange={(e) => update(r.key, "salaryAmount", e.target.value)} /></td>
                                    <td className="px-1 py-1.5 min-w-[70px]">
                                        <select className={cell} value={r.pfApplicable} onChange={(e) => update(r.key, "pfApplicable", e.target.value)}>
                                            <option>No</option><option>Yes</option>
                                        </select>
                                    </td>
                                    <td className="px-1 py-1.5 min-w-[120px]">
                                        <select className={cell} value={r.pfMode} disabled={r.pfApplicable !== "Yes"} onChange={(e) => update(r.key, "pfMode", e.target.value)}>
                                            <option>Fixed monthly</option><option>Per day</option>
                                        </select>
                                    </td>
                                    <td className="px-1 py-1.5 min-w-[90px]">
                                        <input type="number" min={0} placeholder="12% Basic" className={cell} value={r.pfAmount} disabled={r.pfApplicable !== "Yes"} onChange={(e) => update(r.key, "pfAmount", e.target.value)} />
                                    </td>
                                    <td className="px-1 py-1.5 min-w-[110px]"><input className={cell} placeholder="12345678" value={r.password} onChange={(e) => update(r.key, "password", e.target.value)} /></td>
                                    <td className="px-1 py-1.5 whitespace-nowrap">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" title="Duplicate row (keeps branch, shift, salary...)" onClick={() => duplicateRow(r)}>
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" title="Remove row" onClick={() => removeRow(r.key)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

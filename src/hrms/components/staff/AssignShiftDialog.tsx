import { useEffect, useMemo, useState } from "react";
import { Users, Search, RefreshCw } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/hrms/components/ui/dialog";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import { Checkbox } from "@/hrms/components/ui/checkbox";
import { Badge } from "@/hrms/components/ui/badge";
import { staffService } from "@/hrms/services/staffService";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";
import { departmentService } from "@/hrms/services/departmentService";
import { shiftService, Shift } from "@/hrms/services/shiftService";
import { toast } from "@/hrms/hooks/use-toast";

const idOf = (v: any): string => (v && typeof v === "object" ? String(v._id || v.id || "") : String(v || ""));

interface Props {
    shift: Shift | null;
    allShifts: Shift[];
    onClose: () => void;
    onAssigned: () => void;
}

/**
 * Bulk shift allocation: pick many employees (filter by branch / department)
 * and move them all onto `shift` in one call.
 */
export function AssignShiftDialog({ shift, allShifts, onClose, onAssigned }: Props) {
    const [employees, setEmployees] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [branchFilter, setBranchFilter] = useState("all");
    const [deptFilter, setDeptFilter] = useState("all");
    const [hideAlreadyOnShift, setHideAlreadyOnShift] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!shift) return;
        setSelected(new Set());
        setSearch("");
        setIsLoading(true);
        Promise.allSettled([staffService.getAll(), hrmsbranchService.getAll({ limit: 1000 }), departmentService.getAll()])
            .then(([emp, br, dep]) => {
                if (emp.status === "fulfilled") setEmployees(emp.value.filter((e: any) => e.isActive !== false));
                if (br.status === "fulfilled") setBranches(br.value.data || []);
                if (dep.status === "fulfilled") setDepartments(dep.value || []);
            })
            .finally(() => setIsLoading(false));
    }, [shift]);

    const shiftName = useMemo(() => {
        const m = new Map(allShifts.map((s) => [s._id, s.name]));
        return (id: string) => m.get(id) || "";
    }, [allShifts]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return employees.filter((e) => {
            if (hideAlreadyOnShift && idOf(e.shiftId) === shift?._id) return false;
            if (branchFilter !== "all" && idOf(e.hrmsBranchId) !== branchFilter) return false;
            if (deptFilter !== "all" && idOf(e.department) !== deptFilter) return false;
            if (!q) return true;
            return (
                (e.name || "").toLowerCase().includes(q) ||
                (e.employeeCode || "").toLowerCase().includes(q) ||
                (e.email || "").toLowerCase().includes(q)
            );
        });
    }, [employees, search, branchFilter, deptFilter, hideAlreadyOnShift, shift]);

    const allVisibleSelected = visible.length > 0 && visible.every((e) => selected.has(idOf(e)));

    const toggle = (id: string) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const toggleAllVisible = () =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (allVisibleSelected) visible.forEach((e) => next.delete(idOf(e)));
            else visible.forEach((e) => next.add(idOf(e)));
            return next;
        });

    const handleAssign = async () => {
        if (!shift || selected.size === 0) return;
        setIsSaving(true);
        try {
            const res = await shiftService.assign(shift._id, [...selected]);
            toast({ title: "Shift allocated", description: res?.message || `${selected.size} employee(s) assigned to ${shift.name}` });
            onAssigned();
            onClose();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to assign shift", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const selectClass = "h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm";

    return (
        <Dialog open={!!shift} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl rounded-2xl bg-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="px-6 pt-6 pb-3 border-b border-slate-100 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-5 w-5 text-primary" /> Assign Staff to "{shift?.name}"
                    </DialogTitle>
                    <DialogDescription>
                        {shift?.startTime} – {shift?.endTime}. Selected employees are moved to this shift, replacing their current one.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-3 space-y-3 border-b border-slate-100 shrink-0">
                    <div className="flex flex-wrap gap-2">
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search name, code, email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 h-9 rounded-lg bg-slate-50 border-slate-200 text-sm"
                            />
                        </div>
                        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className={selectClass}>
                            <option value="all">All branches</option>
                            {branches.map((b) => (
                                <option key={idOf(b)} value={idOf(b)}>{b.name}</option>
                            ))}
                        </select>
                        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={selectClass}>
                            <option value="all">All departments</option>
                            {departments.map((d) => (
                                <option key={idOf(d)} value={idOf(d)}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAllVisible} disabled={visible.length === 0} />
                            Select all shown ({visible.length})
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox checked={hideAlreadyOnShift} onCheckedChange={(v) => setHideAlreadyOnShift(!!v)} />
                            Hide staff already on this shift
                        </label>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2">
                    {isLoading ? (
                        <div className="py-10 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" /> Loading staff...
                        </div>
                    ) : visible.length === 0 ? (
                        <div className="py-10 text-center text-sm text-slate-400">No staff match these filters.</div>
                    ) : (
                        visible.map((e) => {
                            const id = idOf(e);
                            const current = shiftName(idOf(e.shiftId));
                            return (
                                <label
                                    key={id}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                                >
                                    <Checkbox checked={selected.has(id)} onCheckedChange={() => toggle(id)} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700 truncate">
                                            {e.name}
                                            {e.employeeCode && <span className="ml-2 text-xs text-slate-400">{e.employeeCode}</span>}
                                        </p>
                                        <p className="text-[11px] text-slate-400 truncate">
                                            {typeof e.department === "object" && e.department?.name ? e.department.name : "—"}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] shrink-0">
                                        {current ? `Current: ${current}` : "No shift"}
                                    </Badge>
                                </label>
                            );
                        })
                    )}
                </div>

                <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleAssign} disabled={isSaving || selected.size === 0} className="gradient-primary text-white border-0">
                        {isSaving && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                        Assign {selected.size > 0 ? `${selected.size} ` : ""}employee(s)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

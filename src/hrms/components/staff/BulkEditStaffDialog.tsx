import { useEffect, useState } from "react";
import { PencilLine, RefreshCw } from "lucide-react";
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
import { Label } from "@/hrms/components/ui/label";
import { staffService, type BulkStaffUpdates } from "@/hrms/services/staffService";
import { toast } from "@/hrms/hooks/use-toast";

// "keep" = leave the field unchanged; "none" = clear it.
const KEEP = "keep";
const NONE = "none";

interface Option { _id?: string; id?: string; name: string }

interface Props {
    open: boolean;
    userIds: string[];
    branches: Option[];
    shifts: Option[];
    departments: Option[];
    designations: Option[];
    onClose: () => void;
    onUpdated: () => void;
}

const idOf = (o: Option) => String(o._id || o.id || "");

/** Bulk edit for the Staff Directory — applies the chosen fields to every selected employee. */
export function BulkEditStaffDialog({ open, userIds, branches, shifts, departments, designations, onClose, onUpdated }: Props) {
    const [branch, setBranch] = useState(KEEP);
    const [shift, setShift] = useState(KEEP);
    const [department, setDepartment] = useState(KEEP);
    const [designation, setDesignation] = useState(KEEP);
    const [payType, setPayType] = useState(KEEP);
    const [status, setStatus] = useState(KEEP);
    const [pfApplicable, setPfApplicable] = useState(KEEP);
    const [pfMode, setPfMode] = useState(KEEP);
    const [pfAmount, setPfAmount] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        [setBranch, setShift, setDepartment, setDesignation, setPayType, setStatus, setPfApplicable, setPfMode].forEach((s) => s(KEEP));
        setPfAmount("");
    }, [open]);

    const refValue = (v: string) => (v === NONE ? null : v);

    const buildUpdates = (): BulkStaffUpdates => {
        const u: BulkStaffUpdates = {};
        if (branch !== KEEP) u.hrmsBranchId = refValue(branch);
        if (shift !== KEEP) u.shiftId = refValue(shift);
        if (department !== KEEP) u.department = refValue(department);
        if (designation !== KEEP) u.designation = refValue(designation);
        if (payType !== KEEP) u.payType = payType;
        if (status !== KEEP) u.isActive = status === "active";
        const pf: BulkStaffUpdates["pf"] = {};
        if (pfApplicable !== KEEP) pf.isIncluded = pfApplicable === "yes";
        if (pfMode !== KEEP) pf.mode = pfMode as "fixed_monthly" | "per_day";
        if (pfAmount !== "") pf.value = Number(pfAmount) || 0;
        if (Object.keys(pf).length) u.pf = pf;
        return u;
    };

    const changes = buildUpdates();
    const hasChanges = Object.keys(changes).length > 0;

    const handleSave = async () => {
        if (!hasChanges) return;
        setIsSaving(true);
        try {
            const res = await staffService.bulkUpdate(userIds, changes);
            toast({ title: "Staff updated", description: res.message });
            onUpdated();
            onClose();
        } catch (error: any) {
            toast({ title: "Bulk update failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const selectClass = "h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-sm";
    const labelClass = "text-[10px] font-bold uppercase tracking-widest text-slate-500";

    const refSelect = (label: string, value: string, onChange: (v: string) => void, options: Option[], noneLabel: string) => (
        <div className="space-y-1">
            <Label className={labelClass}>{label}</Label>
            <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
                <option value={KEEP}>— Don't change —</option>
                <option value={NONE}>{noneLabel}</option>
                {options.map((o) => <option key={idOf(o)} value={idOf(o)}>{o.name}</option>)}
            </select>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-xl rounded-2xl bg-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><PencilLine className="h-5 w-5 text-primary" /> Bulk Edit {userIds.length} Staff</DialogTitle>
                    <DialogDescription>Only the fields you change are updated; everything else stays as it is.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
                    {refSelect("Branch", branch, setBranch, branches, "No branch")}
                    {refSelect("Shift", shift, setShift, shifts, "No shift")}
                    {refSelect("Department", department, setDepartment, departments, "No department")}
                    {refSelect("Designation", designation, setDesignation, designations, "No designation")}
                    <div className="space-y-1">
                        <Label className={labelClass}>Pay Cycle</Label>
                        <select value={payType} onChange={(e) => setPayType(e.target.value)} className={selectClass}>
                            <option value={KEEP}>— Don't change —</option>
                            {["Monthly", "Weekly", "Daily", "Hourly"].map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label className={labelClass}>Status</Label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
                            <option value={KEEP}>— Don't change —</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 rounded-md border border-slate-200 bg-slate-50/60">
                        <div className="space-y-1">
                            <Label className={labelClass}>PF Applicable</Label>
                            <select value={pfApplicable} onChange={(e) => setPfApplicable(e.target.value)} className={selectClass}>
                                <option value={KEEP}>— Don't change —</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label className={labelClass}>PF Calculation</Label>
                            <select value={pfMode} onChange={(e) => setPfMode(e.target.value)} className={selectClass}>
                                <option value={KEEP}>— Don't change —</option>
                                <option value="fixed_monthly">Fixed monthly</option>
                                <option value="per_day">Per day</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label className={labelClass}>PF / month (₹)</Label>
                            <Input type="number" placeholder="Don't change" value={pfAmount} onChange={(e) => setPfAmount(e.target.value)} className="h-9 bg-slate-50 border-slate-200 text-sm" />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !hasChanges} className="gradient-primary text-white border-0">
                        {isSaving && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                        Update {userIds.length} staff
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

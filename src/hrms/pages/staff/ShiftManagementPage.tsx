import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/hrms/components/ui/badge";
import { PageHeader } from "@/hrms/components/common/PageHeader";
import { DataTable } from "@/hrms/components/common/DataTable";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    AlarmClock,
    Clock,
    CalendarDays,
    Timer,
    AlertCircle,
    TrendingUp,
    IndianRupee,
} from "lucide-react";
import { shiftService, Shift } from "@/hrms/services/shiftService";
import { useConfirm } from "@/hrms/contexts/ConfirmContext";
import { toast } from "@/hrms/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/hrms/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/hrms/components/ui/form";
import { cn } from "@/hrms/lib/utils";

const WEEK_DAYS = [
    { key: "Mon", label: "Mo", holiday: false },
    { key: "Tue", label: "Tu", holiday: false },
    { key: "Wed", label: "We", holiday: false },
    { key: "Thu", label: "Th", holiday: false },
    { key: "Fri", label: "Fr", holiday: false },
    { key: "Sat", label: "Sa", holiday: false },
    { key: "Sun", label: "Su", holiday: true },
];

const DEFAULT_WORKING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const shiftSchema = z.object({
    name: z.string().min(2, "Shift name must be at least 2 characters"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    lateGraceMinutes: z.coerce.number().min(0).max(120),
    allowedLateCountPerMonth: z.coerce.number().min(0).max(31),
    workingDays: z.array(z.string()).min(1, "Select at least one working day"),
    overtimeGraceMinutes: z.coerce.number().min(0, "Cannot be negative").max(120, "Max 120 minutes"),
    overtimeRatePerHour: z.coerce.number().min(0, "Cannot be negative"),
    lunch: z.object({
        enabled: z.boolean().default(false),
        mode: z.enum(["fixed_window", "flexible_duration"]).default("flexible_duration"),
        startTime: z.string().default("13:00"),
        endTime: z.string().default("14:00"),
        durationMinutes: z.coerce.number().min(0).max(480).default(60),
        deduction: z.enum(["auto", "punch"]).default("auto"),
    }).default({}),
    isActive: z.boolean().default(true),
});

const DEFAULT_LUNCH = {
    enabled: false,
    mode: "flexible_duration" as const,
    startTime: "13:00",
    endTime: "14:00",
    durationMinutes: 60,
    deduction: "auto" as const,
};

type ShiftFormValues = z.infer<typeof shiftSchema>;

export default function ShiftManagementPage() {
    const confirm = useConfirm();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ShiftFormValues>({
        resolver: zodResolver(shiftSchema),
        defaultValues: {
            name: "",
            startTime: "09:30",
            endTime: "18:30",
            lateGraceMinutes: 5,
            allowedLateCountPerMonth: 3,
            workingDays: DEFAULT_WORKING_DAYS,
            overtimeGraceMinutes: 30,
            overtimeRatePerHour: 0,
            lunch: DEFAULT_LUNCH,
            isActive: true,
        },
    });

    useEffect(() => {
        if (editingShift) {
            form.reset({
                name: editingShift.name,
                startTime: editingShift.startTime,
                endTime: editingShift.endTime,
                lateGraceMinutes: editingShift.lateGraceMinutes,
                allowedLateCountPerMonth: editingShift.allowedLateCountPerMonth ?? 3,
                workingDays: editingShift.workingDays?.length ? editingShift.workingDays : DEFAULT_WORKING_DAYS,
                overtimeGraceMinutes: editingShift.overtimeGraceMinutes ?? 30,
                overtimeRatePerHour: editingShift.overtimeRatePerHour ?? 0,
                lunch: { ...DEFAULT_LUNCH, ...(editingShift.lunch || {}) },
                isActive: editingShift.isActive ?? true,
            });
        }
    }, [editingShift]);

    useEffect(() => {
        if (!isAddOpen) {
            form.reset({
                name: "",
                startTime: "09:30",
                endTime: "18:30",
                lateGraceMinutes: 5,
                allowedLateCountPerMonth: 3,
                workingDays: DEFAULT_WORKING_DAYS,
                overtimeGraceMinutes: 30,
                overtimeRatePerHour: 0,
                lunch: DEFAULT_LUNCH,
                isActive: true,
            });
        }
    }, [isAddOpen]);

    useEffect(() => {
        loadShifts();
    }, []);

    const loadShifts = async () => {
        setIsLoading(true);
        try {
            const data = await shiftService.getAll();
            setShifts(data);
        } catch {
            toast({ title: "Error", description: "Failed to load shifts", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const filteredShifts = useMemo(() => {
        return shifts.filter((s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [shifts, searchQuery]);

    const handleDelete = async (id: string) => {
        const ok = await confirm({
            title: "Delete Shift",
            description: "This shift will be permanently deleted. Employees assigned to it may be affected.",
            variant: "danger",
        });
        if (!ok) return;
        try {
            await shiftService.delete(id);
            setShifts((prev) => prev.filter((s) => s._id !== id));
            toast({ title: "Shift Deleted", description: "The shift has been removed.", variant: "destructive" });
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to delete shift", variant: "destructive" });
        }
    };

    const onFormSubmit = async (values: ShiftFormValues) => {
        setIsSubmitting(true);
        try {
            if (editingShift) {
                const updated = await shiftService.update(editingShift._id, values);
                // Merge submitted values into backend response so new fields (workingDays,
                // allowedLateCountPerMonth) are reflected in the table immediately even if
                // the backend doesn't return them yet.
                const merged: Shift = { ...editingShift, ...updated, ...values };
                setShifts((prev) => prev.map((s) => (s._id === editingShift._id ? merged : s)));
                toast({ title: "Shift Updated", description: `${merged.name} has been updated.` });
            } else {
                const created = await shiftService.create(values);
                const merged: Shift = { ...created, ...values };
                setShifts((prev) => [...prev, merged]);
                toast({ title: "Shift Created", description: `${merged.name} has been added.` });
            }
            setIsAddOpen(false);
            setEditingShift(null);
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (t: string) => {
        if (!t) return "-";
        const [h, m] = t.split(":").map(Number);
        const suffix = h >= 12 ? "PM" : "AM";
        const hour = h % 12 || 12;
        return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
    };

    const lateGraceMinutes = form.watch("lateGraceMinutes");
    const startTime = form.watch("startTime");
    const endTime = form.watch("endTime");
    const overtimeGraceMinutes = form.watch("overtimeGraceMinutes");

    const addMins = (time: string, mins: number): string | null => {
        try {
            const [h, m] = time.split(":").map(Number);
            const total = h * 60 + m + Number(mins || 0);
            const ch = Math.floor(total / 60) % 24;
            const cm = total % 60;
            const suffix = ch >= 12 ? "PM" : "AM";
            const hour = ch % 12 || 12;
            return `${hour}:${String(cm).padStart(2, "0")} ${suffix}`;
        } catch { return null; }
    };

    const lateCutoff = useMemo(() => startTime ? addMins(startTime, lateGraceMinutes) : null, [startTime, lateGraceMinutes]);
    const overtimeCutoff = useMemo(() => endTime ? addMins(endTime, overtimeGraceMinutes) : null, [endTime, overtimeGraceMinutes]);

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <PageHeader
                    title="Shift Management"
                    subtitle="Configure work shifts, late rules and working days"
                />
                <Dialog
                    open={isAddOpen}
                    onOpenChange={(open) => {
                        setIsAddOpen(open);
                        if (!open) setEditingShift(null);
                    }}
                >
                    <DialogTrigger asChild>
                        <Button className="rounded-md gradient-primary text-white border-0 shadow-sm hover:opacity-95 px-4 h-9 font-medium text-xs flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Shift
                        </Button>
                    </DialogTrigger>

                    <DialogContent className="bg-white border-0 rounded-[2.5rem] max-w-lg shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                        <DialogHeader className="p-8 pb-4 shrink-0">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 shrink-0 rounded-xl gradient-primary flex items-center justify-center text-white shadow-soft">
                                    <AlarmClock className="h-6 w-6 shrink-0" />
                                </div>
                                <div className="min-w-0">
                                    <DialogTitle className="text-2xl font-bold truncate">
                                        {editingShift ? "Update Shift" : "New Shift"}
                                    </DialogTitle>
                                    <DialogDescription className="text-muted-foreground font-medium">
                                        Set shift timings, late rules and working days.
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
                                <div className="overflow-y-auto flex-1 space-y-6 px-8 py-4">

                                    {/* Shift Name */}
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold text-foreground/70">Shift Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Morning Shift" {...field} className="h-12 rounded-xl" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Start / End Time */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="startTime"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold text-foreground/70">Start Time</FormLabel>
                                                    <FormControl>
                                                        <Input type="time" {...field} className="h-12 rounded-xl" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="endTime"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold text-foreground/70">End Time</FormLabel>
                                                    <FormControl>
                                                        <Input type="time" {...field} className="h-12 rounded-xl" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Working Days */}
                                    <FormField
                                        control={form.control}
                                        name="workingDays"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold text-foreground/70 flex items-center gap-1.5">
                                                    <CalendarDays className="h-3.5 w-3.5" />
                                                    Working Days
                                                </FormLabel>
                                                <div className="flex gap-2 mt-1 flex-wrap">
                                                    {WEEK_DAYS.map((day) => {
                                                        if (day.holiday) {
                                                            return (
                                                                <div
                                                                    key={day.key}
                                                                    className="h-10 w-10 rounded-xl text-[9px] font-black border-2 flex flex-col items-center justify-center cursor-not-allowed bg-red-50 text-red-400 border-red-200"
                                                                    title="Sunday is always a holiday"
                                                                >
                                                                    {day.label}
                                                                    <span className="block text-[7px] font-bold leading-none mt-0.5 opacity-80">Holiday</span>
                                                                </div>
                                                            );
                                                        }
                                                        const selected = field.value?.includes(day.key);
                                                        return (
                                                            <button
                                                                key={day.key}
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = field.value ?? [];
                                                                    field.onChange(
                                                                        selected
                                                                            ? current.filter((d) => d !== day.key)
                                                                            : [...current, day.key]
                                                                    );
                                                                }}
                                                                className={cn(
                                                                    "h-10 w-10 rounded-xl text-[9px] font-black border-2 transition-all flex flex-col items-center justify-center",
                                                                    selected
                                                                        ? "bg-primary text-white border-primary shadow-sm"
                                                                        : "bg-muted/30 text-muted-foreground border-border hover:border-primary/40"
                                                                )}
                                                            >
                                                                {day.label}
                                                                <span className="block text-[7px] font-bold opacity-70 leading-none mt-0.5">
                                                                    {selected ? "Work" : "Off"}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Late Policy Section */}
                                    <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Timer className="h-4 w-4 text-orange-500" />
                                            <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Late Punch-In Policy</p>
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="lateGraceMinutes"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold text-foreground/70">
                                                        Grace Period (minutes after start time)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min={0} max={120} {...field} className="h-12 rounded-xl bg-white" />
                                                    </FormControl>
                                                    {lateCutoff && (
                                                        <p className="text-[11px] text-orange-600 font-semibold flex items-center gap-1 mt-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            Punch-in after <strong>{lateCutoff}</strong> will be marked Late
                                                        </p>
                                                    )}
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="allowedLateCountPerMonth"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold text-foreground/70">
                                                        Allowed Late Count Per Month
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min={0} max={31} {...field} className="h-12 rounded-xl bg-white" />
                                                    </FormControl>
                                                    <p className="text-[11px] text-muted-foreground font-semibold mt-1">
                                                        After this many lates in a month, each extra late = <strong>Half Day</strong>
                                                    </p>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Live Preview */}
                                        <div className="rounded-xl bg-white border border-orange-100 p-3 space-y-1">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Rule Preview</p>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                                                <span>Punch-in ≤ {lateCutoff ?? "—"} → <strong>Present</strong></span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="h-2 w-2 rounded-full bg-orange-400 shrink-0" />
                                                <span>Punch-in after {lateCutoff ?? "—"} → <strong>Late</strong> (up to {form.watch("allowedLateCountPerMonth")} times/month)</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />
                                                <span>After {form.watch("allowedLateCountPerMonth")} lates/month → <strong>Half Day</strong></span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Overtime Policy Section */}
                                    <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-blue-500" />
                                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Overtime Policy</p>
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="overtimeGraceMinutes"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold text-foreground/70">
                                                        Grace Period After Shift End (minutes)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min={0} max={120} {...field} className="h-12 rounded-xl bg-white" />
                                                    </FormControl>
                                                    {overtimeCutoff && (
                                                        <p className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 mt-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            Punch-out after <strong>{overtimeCutoff}</strong> will count as Overtime
                                                        </p>
                                                    )}
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="overtimeRatePerHour"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold text-foreground/70 flex items-center gap-1">
                                                        <IndianRupee className="h-3 w-3" />
                                                        Overtime Rate Per Hour (₹)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min={0} {...field} className="h-12 rounded-xl bg-white" placeholder="e.g. 50" />
                                                    </FormControl>
                                                    <p className="text-[11px] text-muted-foreground font-semibold mt-1">
                                                        Each overtime hour is paid at this rate. Set 0 to track only (no extra pay).
                                                    </p>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Live Overtime Preview */}
                                        <div className="rounded-xl bg-white border border-blue-100 p-3 space-y-1">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Overtime Rule Preview</p>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                                                <span>Punch-out ≤ {overtimeCutoff ?? "—"} → <strong>No Overtime</strong></span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                                                <span>Punch-out after {overtimeCutoff ?? "—"} → <strong>Overtime counted</strong></span>
                                            </div>
                                            {Number(form.watch("overtimeRatePerHour")) > 0 && (
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                                                    <span>Pay = OT hours × <strong>₹{form.watch("overtimeRatePerHour")}/hr</strong> added to salary</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── Lunch Break configuration ── */}
                                    {(() => {
                                        const lunch = form.watch("lunch") || DEFAULT_LUNCH;
                                        const setLunch = (patch: Partial<typeof DEFAULT_LUNCH>) =>
                                            form.setValue("lunch", { ...DEFAULT_LUNCH, ...lunch, ...patch }, { shouldDirty: true });
                                        // Effective configured minutes for the preview.
                                        let mins = 0;
                                        if (lunch.mode === "fixed_window" && lunch.startTime && lunch.endTime) {
                                            const [sh, sm] = lunch.startTime.split(":").map(Number);
                                            const [eh, em] = lunch.endTime.split(":").map(Number);
                                            mins = eh * 60 + em - (sh * 60 + sm);
                                            if (mins < 0) mins += 24 * 60;
                                        } else {
                                            mins = Number(lunch.durationMinutes) || 0;
                                        }
                                        const minsLabel = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
                                        return (
                                            <div className="space-y-3 border-t pt-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-bold">Lunch Break</p>
                                                        <p className="text-[11px] text-muted-foreground">Deducted from worked hours before Full/Half is decided</p>
                                                    </div>
                                                    <button type="button" onClick={() => setLunch({ enabled: !lunch.enabled })}
                                                        className={cn("px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all",
                                                            lunch.enabled ? "bg-primary text-white border-primary" : "bg-white text-slate-500 border-slate-200")}>
                                                        {lunch.enabled ? "Enabled" : "Disabled"}
                                                    </button>
                                                </div>

                                                {lunch.enabled && (
                                                    <div className="space-y-3">
                                                        {/* Mode */}
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {([["flexible_duration", "Fixed duration"], ["fixed_window", "Fixed window"]] as const).map(([m, lbl]) => (
                                                                <button key={m} type="button" onClick={() => setLunch({ mode: m })}
                                                                    className={cn("rounded-xl border-2 py-2 text-[12px] font-bold transition-all",
                                                                        lunch.mode === m ? "bg-primary/10 border-primary text-primary" : "bg-white border-slate-200 text-slate-500")}>
                                                                    {lbl}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {lunch.mode === "flexible_duration" ? (
                                                            <div>
                                                                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Duration (minutes)</label>
                                                                <Input type="number" min={0} max={480} value={lunch.durationMinutes}
                                                                    onChange={(e) => setLunch({ durationMinutes: Number(e.target.value) })}
                                                                    className="h-10 rounded-xl mt-1" placeholder="60" />
                                                                <p className="text-[11px] text-muted-foreground mt-1">Any {minsLabel} within the shift.</p>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Lunch start</label>
                                                                    <Input type="time" value={lunch.startTime} onChange={(e) => setLunch({ startTime: e.target.value })} className="h-10 rounded-xl mt-1" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Lunch end</label>
                                                                    <Input type="time" value={lunch.endTime} onChange={(e) => setLunch({ endTime: e.target.value })} className="h-10 rounded-xl mt-1" />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Deduction mode */}
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {([["auto", "Auto-deduct"], ["punch", "From punches"]] as const).map(([d, lbl]) => (
                                                                <button key={d} type="button" onClick={() => setLunch({ deduction: d })}
                                                                    className={cn("rounded-xl border-2 py-2 text-[12px] font-bold transition-all",
                                                                        lunch.deduction === d ? "bg-primary/10 border-primary text-primary" : "bg-white border-slate-200 text-slate-500")}>
                                                                    {lbl}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {/* Preview */}
                                                        <div className="rounded-xl bg-white border border-amber-100 p-3 space-y-1">
                                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Lunch Rule Preview</p>
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                                                                <span>
                                                                    {lunch.mode === "fixed_window"
                                                                        ? <>Lunch <strong>{lunch.startTime}–{lunch.endTime}</strong> ({minsLabel})</>
                                                                        : <>Lunch <strong>{minsLabel}</strong>, any time in shift</>}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                                                                <span>
                                                                    {lunch.deduction === "auto"
                                                                        ? <><strong>{minsLabel}</strong> always deducted (no lunch punch needed)</>
                                                                        : <>Actual lunch deducted, <strong>minimum {minsLabel}</strong> — a longer lunch costs its full time; a shorter one still costs {minsLabel}</>}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                </div>

                                <DialogFooter className="px-8 py-4 border-t border-gray-100 shrink-0 flex items-center gap-3">
                                    <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)} className="rounded-xl h-12">
                                        Cancel
                                    </Button>
                                    <Button disabled={isSubmitting} type="submit" className="flex-1 rounded-xl h-12 gradient-primary font-bold shadow-glow">
                                        {isSubmitting && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                                        {editingShift ? "Save Changes" : "Create Shift"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center text-white shadow-soft">
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Shift List</h2>
                            <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                                {filteredShifts.length} Shifts Configured
                            </p>
                        </div>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <Input
                            placeholder="Search shifts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-11 rounded-xl border-gray-200 bg-white"
                        />
                    </div>
                </div>

                <DataTable
                    data={filteredShifts}
                    isLoading={isLoading}
                    columns={[
                        {
                            header: "Shift Name",
                            accessorKey: (s) => (
                                <div className="font-bold text-foreground">{s.name}</div>
                            ),
                        },
                        {
                            header: "Timing",
                            accessorKey: (s) => (
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <Clock className="h-4 w-4 text-primary/60" />
                                    {formatTime(s.startTime)} – {formatTime(s.endTime)}
                                </div>
                            ),
                        },
                        {
                            header: "Working Days",
                            accessorKey: (s) => {
                                const days = s.workingDays?.length ? s.workingDays : DEFAULT_WORKING_DAYS;
                                return (
                                    <div className="flex gap-1 flex-wrap items-center">
                                        {WEEK_DAYS.map((d) => {
                                            if (d.holiday) {
                                                return (
                                                    <div key={d.key} className="flex flex-col items-center gap-0.5">
                                                        <span className="h-7 w-7 rounded-lg text-[9px] font-black flex items-center justify-center border bg-red-50 text-red-400 border-red-200">
                                                            {d.label}
                                                        </span>
                                                        <span className="text-[7px] font-bold text-red-400 leading-none">Hol</span>
                                                    </div>
                                                );
                                            }
                                            const active = days.includes(d.key);
                                            return (
                                                <div key={d.key} className="flex flex-col items-center gap-0.5">
                                                    <span
                                                        className={cn(
                                                            "h-7 w-7 rounded-lg text-[9px] font-black flex items-center justify-center border transition-all",
                                                            active
                                                                ? "bg-primary text-white border-primary shadow-sm"
                                                                : "bg-muted/40 text-muted-foreground/30 border-border/40 line-through"
                                                        )}
                                                    >
                                                        {d.label}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[7px] font-bold leading-none",
                                                        active ? "text-primary" : "text-muted-foreground/30"
                                                    )}>
                                                        {active ? "Work" : "Off"}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            },
                        },
                        {
                            header: "Late Policy",
                            accessorKey: (s) => (
                                <div className="space-y-1">
                                    <Badge variant="outline" className="bg-amber-50 border-amber-100 text-amber-700 px-2 py-0.5 rounded-lg text-[10px]">
                                        Grace: {s.lateGraceMinutes} min
                                    </Badge>
                                    <div>
                                        <Badge variant="outline" className="bg-sky-50 border-sky-100 text-sky-700 px-2 py-0.5 rounded-lg text-[10px]">
                                            Half Day after {s.allowedLateCountPerMonth ?? 3} lates/mo
                                        </Badge>
                                    </div>
                                </div>
                            ),
                        },
                        {
                            header: "Overtime",
                            accessorKey: (s) => {
                                const grace = s.overtimeGraceMinutes ?? 0;
                                const rate = s.overtimeRatePerHour ?? 0;
                                const otStart = (() => {
                                    try {
                                        const [h, m] = s.endTime.split(":").map(Number);
                                        const total = h * 60 + m + grace;
                                        const ch = Math.floor(total / 60) % 24;
                                        const cm = total % 60;
                                        const suffix = ch >= 12 ? "PM" : "AM";
                                        const hour = ch % 12 || 12;
                                        return `${hour}:${String(cm).padStart(2, "0")} ${suffix}`;
                                    } catch { return null; }
                                })();
                                return (
                                    <div className="space-y-1">
                                        <Badge variant="outline" className="bg-blue-50 border-blue-100 text-blue-700 px-2 py-0.5 rounded-lg text-[10px]">
                                            OT starts: {otStart ?? "—"}
                                        </Badge>
                                        <div>
                                            <Badge variant="outline" className={cn(
                                                "px-2 py-0.5 rounded-lg text-[10px]",
                                                rate > 0
                                                    ? "bg-purple-50 border-purple-100 text-purple-700"
                                                    : "bg-muted/40 border-border/40 text-muted-foreground"
                                            )}>
                                                {rate > 0 ? `₹${rate}/hr` : "Track only"}
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            },
                        },
                        {
                            header: "Status",
                            accessorKey: (s) => (
                                <Badge className={s.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-50 text-gray-600 border-gray-100"}>
                                    {s.isActive ? "Active" : "Inactive"}
                                </Badge>
                            ),
                        },
                        {
                            header: "Actions",
                            accessorKey: (s) => (
                                <div className="flex items-center justify-end gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10"
                                        onClick={() => { setEditingShift(s); setIsAddOpen(true); }}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(s._id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ),
                        },
                    ]}
                />
            </div>
        </div>
    );
}

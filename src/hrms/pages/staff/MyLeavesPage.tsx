import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/hrms/components/ui/card";
import { Button } from "@/hrms/components/ui/button";
import {
  Briefcase,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Loader2,
  LayoutDashboard,
  ArrowRight,
  Info,
  ArrowLeftRight,
  MoonStar,
  RefreshCw,
  Check,
} from "lucide-react";
import { employeeService } from "@/hrms/services/hrService";
import { staffService } from "@/hrms/services/staffService";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { toast } from "@/hrms/hooks/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/hrms/components/ui/dialog";
import { Badge } from "@/hrms/components/ui/badge";
import { Input } from "@/hrms/components/ui/input";
import { Label } from "@/hrms/components/ui/label";
import { Textarea } from "@/hrms/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";
import { cn } from "@/hrms/lib/utils";

/* ── Week-day helpers for swap dialog ── */
const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEK_SHORT = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function normDay(d: string) {
  return d.toLowerCase().replace(/day$/, "");
}

function WeekGrid({
  holidays,
  selectedDay,
  onSelect,
}: {
  holidays: string[];
  selectedDay?: string;
  onSelect?: (day: string) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {WEEK_DAYS.map((day, i) => {
        const off = holidays.some((h) => normDay(h) === normDay(day));
        const selected = selectedDay ? normDay(selectedDay) === normDay(day) : false;
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelect?.(day)}
            disabled={!onSelect}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold transition-all",
              selected
                ? "bg-primary text-white border-2 border-primary/70 shadow scale-105"
                : off
                ? "bg-red-100 text-red-600 border border-red-200"
                : "bg-emerald-50 text-emerald-600 border border-emerald-100",
              onSelect && !selected && "hover:scale-105 hover:shadow-sm cursor-pointer"
            )}
          >
            {WEEK_SHORT[i]}
          </button>
        );
      })}
    </div>
  );
}

const MyLeavesPage = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── Swap Weekly Leaves state ── */
  const [employees, setEmployees] = useState<any[]>([]);
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [swapEmp1Id, setSwapEmp1Id] = useState("");
  const [swapEmp2Id, setSwapEmp2Id] = useState("");
  const [emp1OffDay, setEmp1OffDay] = useState("");
  const [emp2OffDay, setEmp2OffDay] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);

  const loggedInUserId = user?.id || (user as any)?._id || "";

  const openSwap = () => {
    if (loggedInUserId) setSwapEmp1Id(loggedInUserId);
    setIsSwapOpen(true);
  };

  const closeSwap = () => {
    setIsSwapOpen(false);
    setSwapEmp1Id(""); setSwapEmp2Id("");
    setEmp1OffDay(""); setEmp2OffDay("");
  };

  const emp1 = employees.find((u) => (u.id || u._id) === swapEmp1Id) ?? (swapEmp1Id === loggedInUserId ? user : undefined);
  const emp2 = employees.find((u) => (u.id || u._id) === swapEmp2Id);
  const canConfirmSwap = !!swapEmp1Id && !!swapEmp2Id && !!emp1OffDay && !!emp2OffDay && emp1OffDay !== emp2OffDay;

  const handleSwap = async () => {
    if (!canConfirmSwap || !emp1 || !emp2) return;
    setIsSwapping(true);
    try {
      await staffService.update(emp1.id || emp1._id, { weeklyHolidays: [emp2OffDay] });
      await staffService.update(emp2.id || emp2._id, { weeklyHolidays: [emp1OffDay] });
      toast({
        title: "Weekly Off Days Swapped",
        description: `${emp1.name} is now off on ${emp2OffDay}. ${emp2.name} is now off on ${emp1OffDay}.`,
      });
      closeSwap();
    } catch (err: any) {
      toast({ title: "Swap Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSwapping(false);
    }
  };

  const nonAdminEmployees = employees.filter((u) => {
    const r = typeof u.role === "string" ? u.role : u.role?.role || "";
    return !["admin", "super_admin", "superadmin", "owner"].includes(r.toLowerCase());
  });

  const [newLeave, setNewLeave] = useState({
    leaveTypeId: "",
    leaveOption: "full_day", // full_day, multiple_days, half_day
    fromDate: "",
    toDate: "",
    reason: "",
    isHalfDay: false,
    halfDayPeriod: "first_half",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [leavesData, typesData, balancesData, staffData] = await Promise.all([
        employeeService.getLeaves({ employeeId: user?.id }),
        employeeService.getLeaveTypes(),
        employeeService.getLeaveBalances(),
        staffService.getAll(),
      ]);
      setEmployees(Array.isArray(staffData) ? staffData : []);
      
      // If no leave types in DB, provide some defaults for the UI
      const defaultTypes = [
        { _id: "sick_id", name: "Sick Leave", code: "SL" },
        { _id: "casual_id", name: "Casual Leave", code: "CL" },
        { _id: "earned_id", name: "Earned Leave", code: "EL" },
        { _id: "paid_id", name: "Paid Leave", code: "PL" },
      ];

      setLeaveTypes(typesData.length > 0 ? typesData : defaultTypes);
      setLeaves(leavesData);
      setBalances(balancesData);
    } catch (error) {
      console.error("Error fetching leave data:", error);
      toast({ title: "Error", description: "Failed to load leave information.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDays = () => {
    if (newLeave.leaveOption === "half_day") return 0.5;
    if (newLeave.leaveOption === "full_day") return 1;
    if (!newLeave.fromDate || !newLeave.toDate) return 0;
    
    const start = parseISO(newLeave.fromDate);
    const end = parseISO(newLeave.toDate);
    const diff = differenceInDays(end, start) + 1;
    return Math.max(0, diff);
  };

  const handleApply = async () => {
    if (!newLeave.leaveTypeId || !newLeave.fromDate || !newLeave.reason) {
      toast({ title: "Missing Fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    if (newLeave.leaveOption === "multiple_days" && !newLeave.toDate) {
      toast({ title: "Missing Date", description: "Please select an end date.", variant: "destructive" });
      return;
    }

    const payload = {
      ...newLeave,
      toDate: newLeave.leaveOption === "multiple_days" ? newLeave.toDate : newLeave.fromDate,
      totalDays: calculateDays(),
      isHalfDay: newLeave.leaveOption === "half_day",
    };

    setIsSubmitting(true);
    try {
      await employeeService.applyLeave(payload);
      toast({ title: "Success", description: "Leave request submitted successfully." });
      setIsApplyOpen(false);
      setNewLeave({
        leaveTypeId: "",
        leaveOption: "full_day",
        fromDate: "",
        toDate: "",
        reason: "",
        isHalfDay: false,
        halfDayPeriod: "first_half",
      });
      fetchData();
    } catch (error: any) {
      toast({ 
        title: "Application Failed", 
        description: error.message || "Failed to submit request.", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const pending = leaves.filter(l => l.status === "pending").length;
    const approved = leaves.filter(l => l.status === "approved").length;
    const rejected = leaves.filter(l => l.status === "rejected").length;
    return { pending, approved, rejected, total: leaves.length };
  }, [leaves]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in font-['Outfit']">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Staff Portal</span>
            <span className="text-xs">/</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">My Leaves</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Leave <span className="text-primary">Management</span>
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">Apply for time off and track your leave status.</p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={openSwap}
            className="h-12 rounded-xl px-5 font-bold border-border/40 flex items-center gap-2"
          >
            <ArrowLeftRight className="h-4 w-4 text-primary" /> Swap Weekly Leaves
          </Button>
          <Button
            onClick={() => setIsApplyOpen(true)}
            className="gradient-primary text-white border-0 shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 h-12 rounded-xl px-6 font-bold"
          >
            <Plus className="mr-2 h-5 w-5" /> Apply for Leave
          </Button>
        </div>
      </div>

      {/* Balance Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.length > 0 ? balances.map((bal, idx) => (
          <Card key={idx} className="glass-deep border-0 overflow-hidden group">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <Briefcase className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="bg-background/50 font-bold border-primary/20">
                  {bal.leaveTypeId?.code || "LV"}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
                  {bal.leaveTypeId?.name}
                </p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-black text-foreground">
                    {(bal.totalAllocated || 0) + (bal.carriedForward || 0) - (bal.used || 0) - (bal.pending || 0)}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Days Left</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/20 flex justify-between text-[10px] font-bold">
                <span className="text-muted-foreground">USED: {bal.used}</span>
                <span className="text-warning">PENDING: {bal.pending}</span>
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card className="glass-deep border-0 col-span-full py-10 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-bold text-muted-foreground">No leave balances assigned to your profile yet.</p>
            <p className="text-xs text-muted-foreground/60">Please contact HR to configure your leave quota.</p>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* History Table/List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-deep border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">My Leave History</CardTitle>
                  <CardDescription className="text-xs">Tracking your recent time-off requests</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="bg-muted/50 text-[10px] font-bold">{stats.total} TOTAL</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/20">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-6 flex items-center justify-between animate-pulse">
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-48 bg-muted rounded" />
                      </div>
                      <div className="h-6 w-16 bg-muted rounded-full" />
                    </div>
                  ))
                ) : leaves.length > 0 ? (
                  leaves.map((lv) => (
                    <div key={lv._id || lv.id} className="p-6 hover:bg-muted/30 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex flex-col items-center justify-center text-center border shadow-sm",
                          lv.status === "approved" ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                          lv.status === "rejected" ? "bg-destructive/5 border-destructive/10 text-destructive" :
                          "bg-warning/5 border-warning/20 text-warning"
                        )}>
                          <p className="text-[9px] font-bold uppercase leading-none mb-1 opacity-70">
                            {format(new Date(lv.fromDate), "MMM")}
                          </p>
                          <p className="text-lg font-black leading-none">
                            {format(new Date(lv.fromDate), "dd")}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground/90">
                            {lv.leaveTypeId?.name || "Leave"} • {lv.totalDays} Days
                          </p>
                          <p className="text-xs text-muted-foreground font-medium">
                            {format(new Date(lv.fromDate), "dd MMM")} to {format(new Date(lv.toDate), "dd MMM yyyy")}
                          </p>
                          <p className="text-[10px] text-muted-foreground italic mt-1.5 line-clamp-1">"{lv.reason}"</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={cn(
                          "rounded-lg text-[10px] font-bold uppercase tracking-widest px-3 py-1 border-0",
                          lv.status === "approved" ? "bg-emerald-100 text-emerald-700 shadow-sm" :
                          lv.status === "rejected" ? "bg-destructive/10 text-destructive" :
                          "bg-warning/10 text-warning"
                        )}>
                          {lv.status}
                        </Badge>
                        <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase tracking-tighter">
                          SUBMITTED {format(new Date(lv.createdAt), "dd/MM/yy")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-20 text-center text-muted-foreground">
                    <Briefcase className="h-16 w-16 mx-auto mb-4 opacity-5" />
                    <p className="text-sm font-bold">No leave requests found.</p>
                    <p className="text-xs mt-1">Start by clicking 'Apply for Leave' button.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informative Sidebar */}
        <div className="space-y-6">
          <Card className="glass-deep border-0 overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-125 transition-transform duration-500">
                <Info className="h-24 w-24 text-primary" />
             </div>
             <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">Leave Policy</CardTitle>
                <CardDescription className="text-xs font-medium">Quick rules to remember</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4 pt-4">
                {[
                  { text: "Requests should be submitted 3 days in advance.", icon: Clock },
                  { text: "Medical certificates required for sick leave > 2 days.", icon: FileText },
                  { text: "Half-day leaves must be specified (Morning/Evening).", icon: Briefcase },
                  { text: "Balance is refreshed every calendar year.", icon: Calendar },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="mt-0.5 h-5 w-5 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                      <item.icon className="h-3 w-3 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">{item.text}</p>
                  </div>
                ))}
             </CardContent>
             <CardFooter className="bg-primary/5 border-t border-primary/10 mt-2 p-5">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center text-success">
                      <CheckCircle2 className="h-4 w-4" />
                   </div>
                   <p className="text-[10px] font-bold text-foreground/70 uppercase leading-tight">Your attendance is at 98% this month!</p>
                </div>
             </CardFooter>
          </Card>

          <Card className="glass-deep border-0">
             <CardHeader>
                <CardTitle className="text-lg font-bold">Pending Approval</CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
                {leaves.filter(l => l.status === "pending").map((l, i) => (
                  <div key={i} className="p-3 bg-muted/20 rounded-xl border border-border/30">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-bold">{l.leaveTypeId?.name}</p>
                      <Badge variant="secondary" className="text-[9px] h-4">{l.totalDays} Days</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(l.fromDate), "dd MMM")} - {format(new Date(l.toDate), "dd MMM")}</p>
                  </div>
                ))}
                {stats.pending === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4 italic">No pending requests.</p>
                )}
             </CardContent>
          </Card>
        </div>
      </div>      {/* ── Swap Weekly Leaves Dialog ── */}
      <Dialog open={isSwapOpen} onOpenChange={(o) => { if (!o) closeSwap(); }}>
        <DialogContent className="max-w-2xl rounded-2xl border border-border/40 shadow-2xl bg-background p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/20 bg-gradient-to-r from-primary/5 to-transparent shrink-0">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" /> Swap Weekly Off Days
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select an employee to swap your weekly off day with.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              {/* You (Employee A — read-only, pre-filled) */}
              <div className="space-y-3">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">You</Label>
                <div className="h-9 rounded-xl border border-border/40 bg-muted/30 text-sm font-semibold flex items-center px-3 text-foreground">
                  {user?.name || "You"}
                </div>
                {swapEmp1Id && (
                  <div className="p-3 rounded-xl border border-border/20 bg-muted/10 space-y-2">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Tap to select your off day</p>
                    <WeekGrid
                      holidays={emp1?.weeklyHolidays || []}
                      selectedDay={emp1OffDay}
                      onSelect={(d) => setEmp1OffDay(d === emp1OffDay ? "" : d)}
                    />
                    {emp1OffDay
                      ? <p className="text-[11px] text-primary font-semibold flex items-center gap-1"><MoonStar className="h-3 w-3" /> Off on <b>{emp1OffDay}</b></p>
                      : <p className="text-[11px] text-muted-foreground">No day selected</p>}
                  </div>
                )}
              </div>

              {/* Swap With (Employee B) */}
              <div className="space-y-3">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">Swap With</Label>
                <Select value={swapEmp2Id} onValueChange={(v) => { setSwapEmp2Id(v); setEmp2OffDay(""); }}>
                  <SelectTrigger className="h-9 rounded-xl border-border/40 bg-muted/20 text-sm">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56 rounded-xl">
                    {nonAdminEmployees.filter((u) => (u.id || u._id) !== swapEmp1Id).map((u) => {
                      const id = u.id || u._id;
                      return <SelectItem key={id} value={id}>{u.name}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                {swapEmp2Id && (
                  <div className="p-3 rounded-xl border border-border/20 bg-muted/10 space-y-2">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Tap to select off day</p>
                    <WeekGrid
                      holidays={emp2?.weeklyHolidays || []}
                      selectedDay={emp2OffDay}
                      onSelect={(d) => setEmp2OffDay(d === emp2OffDay ? "" : d)}
                    />
                    {emp2OffDay
                      ? <p className="text-[11px] text-primary font-semibold flex items-center gap-1"><MoonStar className="h-3 w-3" /> Off on <b>{emp2OffDay}</b></p>
                      : <p className="text-[11px] text-muted-foreground">No day selected</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            {emp1OffDay && emp2OffDay && (
              emp1OffDay === emp2OffDay
                ? <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-xs text-warning font-medium text-center">Both employees selected the same day — please choose different days.</div>
                : <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-primary/10 bg-primary/5 space-y-1">
                      <p className="text-xs font-semibold">{emp1?.name}</p>
                      <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1"><MoonStar className="h-3 w-3" /> Off on <b>{emp2OffDay}</b></p>
                      <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1"><Briefcase className="h-3 w-3" /> Works on <b>{emp1OffDay}</b></p>
                    </div>
                    <div className="p-3 rounded-xl border border-primary/10 bg-primary/5 space-y-1">
                      <p className="text-xs font-semibold">{emp2?.name}</p>
                      <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1"><MoonStar className="h-3 w-3" /> Off on <b>{emp1OffDay}</b></p>
                      <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1"><Briefcase className="h-3 w-3" /> Works on <b>{emp2OffDay}</b></p>
                    </div>
                  </div>
            )}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border/20 bg-muted/10 shrink-0">
            <Button variant="ghost" onClick={closeSwap} disabled={isSwapping} className="rounded-xl font-bold text-sm">Cancel</Button>
            <Button
              onClick={handleSwap}
              disabled={isSwapping || !canConfirmSwap}
              className="rounded-xl gradient-primary text-white border-0 font-bold shadow-sm px-6 text-sm flex items-center gap-2"
            >
              {isSwapping ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirm Swap
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply Leave Dialog */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden glass-deep border-border/40 shadow-2xl rounded-3xl animate-in zoom-in-95 duration-300">
          <div className="gradient-primary h-1.5 w-full" />
          <DialogHeader className="px-6 pt-6 pb-4 bg-accent/40 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight">Apply for Leave</DialogTitle>
                  <DialogDescription className="text-[10px]">New time-off request</DialogDescription>
                </div>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 rounded-lg font-bold text-xs">
                {calculateDays()} Days
              </Badge>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category</Label>
                <Select 
                  value={newLeave.leaveTypeId} 
                  onValueChange={(val) => setNewLeave({ ...newLeave, leaveTypeId: val })}
                >
                  <SelectTrigger className="rounded-xl border-border/40 h-10 bg-background/50 text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40">
                    {leaveTypes.map((type) => (
                      <SelectItem key={type._id} value={type._id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Leave Option</Label>
                <Select 
                  value={newLeave.leaveOption} 
                  onValueChange={(val) => setNewLeave({ ...newLeave, leaveOption: val })}
                >
                  <SelectTrigger className="rounded-xl border-border/40 h-10 bg-background/50 text-sm">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40">
                    <SelectItem value="full_day">Full Day</SelectItem>
                    <SelectItem value="multiple_days">Multiple Days</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={cn("grid gap-4", newLeave.leaveOption === "multiple_days" ? "grid-cols-2" : "grid-cols-1")}>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {newLeave.leaveOption === "multiple_days" ? "From Date" : "Select Date"}
                </Label>
                <Input 
                  type="date" 
                  value={newLeave.fromDate}
                  onChange={(e) => setNewLeave({ ...newLeave, fromDate: e.target.value })}
                  className="rounded-xl border-border/40 h-10 bg-background/50 text-sm" 
                />
              </div>
              {newLeave.leaveOption === "multiple_days" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To Date</Label>
                  <Input 
                    type="date" 
                    value={newLeave.toDate}
                    onChange={(e) => setNewLeave({ ...newLeave, toDate: e.target.value })}
                    className="rounded-xl border-border/40 h-10 bg-background/50 text-sm" 
                  />
                </div>
              )}
            </div>

            {newLeave.leaveOption === "half_day" && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Half</Label>
                <div className="flex gap-2">
                  {["first_half", "second_half"].map((period) => (
                    <Button
                      key={period}
                      variant="outline"
                      size="sm"
                      onClick={() => setNewLeave({ ...newLeave, halfDayPeriod: period })}
                      className={cn(
                        "flex-1 h-9 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all",
                        newLeave.halfDayPeriod === period ? "bg-primary/10 border-primary text-primary" : "border-border/40"
                      )}
                    >
                      {period.replace("_", " ")}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason</Label>
              <Textarea 
                placeholder="Reason for leave..."
                value={newLeave.reason}
                onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                className="rounded-xl border-border/40 bg-background/50 min-h-[70px] max-h-[120px] text-sm resize-none p-3"
              />
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-0 border-t-0">
            <div className="flex gap-3 w-full">
              <Button 
                variant="ghost" 
                onClick={() => setIsApplyOpen(false)}
                className="flex-1 rounded-xl font-bold h-11 text-xs"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleApply}
                disabled={isSubmitting}
                className="flex-[2] gradient-primary text-white border-0 shadow-lg rounded-xl font-bold h-11 text-xs"
              >
                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Submit Request"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyLeavesPage;

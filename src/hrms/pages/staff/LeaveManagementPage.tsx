import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/hrms/components/ui/card";
import { Badge } from "@/hrms/components/ui/badge";
import { Button } from "@/hrms/components/ui/button";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  ShieldCheck,
  ArrowLeftRight,
  Check,
  RefreshCw,
  Briefcase,
  MoonStar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/hrms/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";
import { Label } from "@/hrms/components/ui/label";
import { format } from "date-fns";
import { Input } from "@/hrms/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/hrms/components/ui/dropdown-menu";
import { employeeApi } from "@/hrms/services/api";
import { staffService } from "@/hrms/services/staffService";
import type { LeaveRequest, User } from "@/hrms/types";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/hrms/lib/utils";
import { Progress } from "@/hrms/components/ui/progress";
import { TablePagination } from "@/hrms/components/ui/table";
import { toast } from "@/hrms/components/ui/use-toast";

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEK_SHORT = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function normDay(d: string) {
  return d.toLowerCase().replace(/day$/, "");
}

function isOff(day: string, holidays: string[]) {
  return holidays.some((h) => normDay(h) === normDay(day));
}

/** Clickable 7-day strip. onSelect is optional – makes cells clickable */
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
        const off = isOff(day, holidays);
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
                ? "bg-indigo-500 text-white border-2 border-indigo-400 shadow scale-105"
                : off
                ? "bg-red-100 text-red-600 border border-red-200"
                : "bg-emerald-50 text-emerald-600 border border-emerald-100",
              onSelect && !selected && "hover:scale-105 hover:shadow-sm cursor-pointer"
            )}
            title={selected ? `${day} – Selected` : off ? `${day} – Off` : `${day} – Work`}
          >
            {WEEK_SHORT[i]}
          </button>
        );
      })}
    </div>
  );
}

const LeaveManagementPage = () => {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();

  const userRoleKey = user
    ? typeof user.role === "string"
      ? user.role
      : (user.role as any)?.role || ""
    : "";
  const isAdmin = ["admin", "super_admin", "superadmin", "owner"].includes(userRoleKey.toLowerCase());
  const loggedInUserId = user ? (user.id || (user as any)._id || "") : "";


  const [employees, setEmployees] = useState<User[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("all");
  const [isSwapLeavesOpen, setIsSwapLeavesOpen] = useState(false);
  const [swapEmp1Id, setSwapEmp1Id] = useState<string>("");
  const [swapEmp2Id, setSwapEmp2Id] = useState<string>("");
  const [emp1OffDay, setEmp1OffDay] = useState<string>("");
  const [emp2OffDay, setEmp2OffDay] = useState<string>("");
  const [isSwapping, setIsSwapping] = useState(false);

  // Server-side pagination for the Requests list — status is passed through
  // to the backend as a real query param (already supported by getLeaveRequests);
  // free-text search (below) stays client-side, scoped to the current page,
  // since the backend has no text-search support for leaves.
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [totalLeaves, setTotalLeaves] = useState(0);
  const [totalLeavePages, setTotalLeavePages] = useState(1);

  const load = async () => {
    setIsLoading(true);
    try {
      const [staff, leavesRes, balances] = await Promise.all([
        staffService.getAll(),
        employeeApi.getLeavesPage({
          page: currentPage,
          limit: itemsPerPage,
          status: leaveStatusFilter === "all" ? undefined : leaveStatusFilter,
        }),
        employeeApi.getLeaveBalances(),
      ]);
      setEmployees(Array.isArray(staff) ? staff : []);
      setLeaves(Array.isArray(leavesRes.data) ? leavesRes.data : []);
      setTotalLeaves(leavesRes.total);
      setTotalLeavePages(leavesRes.pages);
      setLeaveBalances(Array.isArray(balances) ? balances : []);
    } catch {
      toast({ title: "Sync Failed", description: "Could not load leave records.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [currentPage, leaveStatusFilter]);

  // Reset back to page 1 whenever the status filter changes, since it's now
  // sent as a server param and a stale page could point past the new set.
  useEffect(() => {
    setCurrentPage(1);
  }, [leaveStatusFilter]);

  const handleApprove = async (id: string) => {
    try {
      await employeeApi.approveLeave(id);
      setLeaves((p) => p.map((l) => (l._id === id || l.id === id ? { ...l, status: "Approved" as const } : l)));
      toast({ title: "Leave Approved" });
    } catch (err: any) {
      toast({ title: "Approve Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await employeeApi.rejectLeave(id);
      setLeaves((p) => p.map((l) => (l._id === id || l.id === id ? { ...l, status: "Rejected" as const } : l)));
      toast({ title: "Leave Rejected" });
    } catch (err: any) {
      toast({ title: "Reject Failed", description: err.message, variant: "destructive" });
    }
  };

  const closeSwapDialog = () => {
    setIsSwapLeavesOpen(false);
    setSwapEmp1Id("");
    setSwapEmp2Id("");
    setEmp1OffDay("");
    setEmp2OffDay("");
  };

  const handleSwapLeaves = async () => {
    if (!swapEmp1Id || !swapEmp2Id || !emp1OffDay || !emp2OffDay) return;
    const emp1 = employees.find((u) => (u.id || (u as any)._id) === swapEmp1Id);
    const emp2 = employees.find((u) => (u.id || (u as any)._id) === swapEmp2Id);
    if (!emp1 || !emp2) return;

    setIsSwapping(true);
    try {
      // Employee A gets Employee B's chosen off day
      // Employee B gets Employee A's chosen off day
      await staffService.update(emp1.id || (emp1 as any)._id, { weeklyHolidays: [emp2OffDay] });
      await staffService.update(emp2.id || (emp2 as any)._id, { weeklyHolidays: [emp1OffDay] });

      toast({
        title: "Weekly Off Days Swapped",
        description: `${emp1.name} is now off on ${emp2OffDay}. ${emp2.name} is now off on ${emp1OffDay}.`,
      });
      closeSwapDialog();
      load();
    } catch (err: any) {
      toast({
        title: "Swap Failed",
        description: err.message || "Failed to swap weekly off days. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const getEmployeeName = (idOrObj: any): string => {
    if (!idOrObj) return "Staff Member";
    if (typeof idOrObj === "object") return idOrObj.name || "Staff Member";
    const emp = employees.find((e) => String((e as any)._id || e.id) === String(idOrObj));
    return emp ? emp.name : "Staff Member";
  };

  const emp1 = employees.find((u) => (u.id || (u as any)._id) === swapEmp1Id);
  const emp2 = employees.find((u) => (u.id || (u as any)._id) === swapEmp2Id);

  const canConfirm = !!swapEmp1Id && !!swapEmp2Id && !!emp1OffDay && !!emp2OffDay && emp1OffDay !== emp2OffDay;

  const nonAdminEmployees = employees.filter((u) => {
    const r = typeof u.role === "string" ? u.role : (u.role as any)?.role || "";
    return !["admin", "super_admin", "superadmin"].includes(r.toLowerCase());
  });

  if (!hasPermission("view_leaves")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center p-8">
        <div className="h-20 w-20 rounded-3xl bg-red-50 flex items-center justify-center">
          <ShieldCheck className="h-10 w-10 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
        <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 space-y-6 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Leave Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">Review and approve staff leave requests and track balances</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-md h-9 px-4 font-medium border-slate-200 bg-white shadow-sm hover:bg-slate-50 flex items-center gap-2"
          onClick={() => {
            if (!isAdmin && loggedInUserId) setSwapEmp1Id(loggedInUserId);
            setIsSwapLeavesOpen(true);
          }}
        >
          <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-500" /> Swap Weekly Leaves
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <Card className="border border-slate-200 bg-white shadow-sm md:col-span-2 overflow-hidden">
          <CardHeader className="py-4 border-b border-slate-100">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base font-semibold text-slate-700">Requests</CardTitle>
                <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
                  {leaves.filter((l) => l.status?.toLowerCase() === "pending").length} Pending
                </Badge>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 w-40 text-xs bg-slate-50 border-slate-200 rounded-lg"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 gap-1.5 text-xs border-slate-200 rounded-lg",
                        leaveStatusFilter !== "all" && "border-indigo-200 bg-indigo-50 text-indigo-600"
                      )}
                    >
                      <Filter className="h-3.5 w-3.5" />
                      {leaveStatusFilter === "all" ? "Filter" : leaveStatusFilter.charAt(0).toUpperCase() + leaveStatusFilter.slice(1)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                    {[
                      { val: "all",      label: "All Requests" },
                      { val: "pending",  label: "Pending" },
                      { val: "approved", label: "Approved" },
                      { val: "rejected", label: "Rejected" },
                    ].map((s) => (
                      <DropdownMenuItem key={s.val} className="text-xs font-medium" onClick={() => setLeaveStatusFilter(s.val)}>
                        {s.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {leaves
              // Status is now filtered server-side (see load()); free-text search
              // still runs client-side, scoped to the currently loaded page.
              .filter((lv) => {
                const name = getEmployeeName(lv.employeeId).toLowerCase();
                return (
                  name.includes(searchQuery.toLowerCase()) ||
                  (lv.reason || "").toLowerCase().includes(searchQuery.toLowerCase())
                );
              })
              .map((lv: any) => {
                const statusBadgeClass =
                  lv.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                  lv.status === "rejected" ? "bg-red-100 text-red-700" :
                  lv.status === "cancelled" ? "bg-slate-100 text-slate-600" :
                  "bg-amber-100 text-amber-700";
                const empName = lv.employeeId?.name || getEmployeeName(lv.employeeId);
                return (
                  <div
                    key={lv._id || lv.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{empName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          <span className="text-indigo-500 font-medium">{lv.leaveTypeId?.name || lv.type} Leave</span>
                          {" · "}
                          {lv.fromDate || lv.startDate
                            ? format(new Date(lv.fromDate || lv.startDate), "dd MMM")
                            : "—"}{" "}
                          →{" "}
                          {lv.toDate || lv.endDate
                            ? format(new Date(lv.toDate || lv.endDate), "dd MMM yyyy")
                            : "—"}
                        </p>
                      </div>
                      <Badge className={cn("shrink-0 text-[10px] font-semibold border-0", statusBadgeClass)}>
                        {lv.status.charAt(0).toUpperCase() + lv.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 italic bg-white border border-slate-100 rounded-lg px-3 py-2">
                      "{lv.reason}"
                    </p>
                    {lv.status.toLowerCase() === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                          onClick={() => handleApprove(lv._id || lv.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-[11px] text-red-500 border-red-200 hover:bg-red-50 rounded-lg"
                          onClick={() => handleReject(lv._id || lv.id)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            {leaves.length === 0 && !isLoading && (
              <div className="py-12 text-center">
                <CalendarDays className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No leave requests found.</p>
              </div>
            )}

            {/* Pagination Footer */}
            <TablePagination
              page={currentPage}
              pageSize={itemsPerPage}
              total={totalLeaves}
              onPageChange={setCurrentPage}
              className="mt-1 rounded-lg border"
            />
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden h-fit">
          <CardHeader className="py-4 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-700">Org Balances</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {leaveBalances.map((bal: any, idx: number) => {
              const remaining =
                (bal.totalAllocated || 0) + (bal.carriedForward || 0) - (bal.used || 0) - (bal.pending || 0);
              const pct = Math.round(((bal.used || 0) / (bal.totalAllocated || 1)) * 100);
              return (
                <div key={bal._id || idx} className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="flex justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-600">{bal.leaveTypeId?.name || "Leave"}</p>
                    <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 text-indigo-600 bg-indigo-50">
                      {remaining} left
                    </Badge>
                  </div>
                  <Progress value={pct} className="h-1.5 bg-slate-200" />
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Used {bal.used} of {bal.totalAllocated} days
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* ── Swap Weekly Leaves Dialog ── */}
      <Dialog open={isSwapLeavesOpen} onOpenChange={(open) => { if (!open) closeSwapDialog(); }}>
        <DialogContent className="max-w-2xl rounded-2xl border border-slate-200 shadow-2xl bg-white p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-white">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
              <ArrowLeftRight className="h-5 w-5 shrink-0 text-indigo-500" />
              Swap Weekly Off Days
            </DialogTitle>
            <p className="text-sm text-slate-400 mt-0.5">
              {isAdmin
                ? "Select each employee and tap the day they should have off — then confirm to swap."
                : "Select an employee to swap your weekly off day with."}
            </p>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5">
            {/* ── Employee columns ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Employee A column */}
              <div className="space-y-3">
                <div>
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">
                    {isAdmin ? "Employee A" : "You"}
                  </Label>
                  {isAdmin ? (
                    <Select
                      value={swapEmp1Id}
                      onValueChange={(val) => {
                        setSwapEmp1Id(val);
                        setEmp1OffDay("");
                        if (val === swapEmp2Id) { setSwapEmp2Id(""); setEmp2OffDay(""); }
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-lg bg-slate-50 border border-slate-200 text-sm font-medium">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 bg-white">
                        {nonAdminEmployees.map((u) => {
                          const id = u.id || (u as any)._id;
                          return <SelectItem key={id} value={id}>{u.name}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="h-9 rounded-lg bg-slate-100 border border-slate-200 text-sm font-semibold flex items-center px-3 text-slate-700">
                      {user?.name || "You"}
                    </div>
                  )}
                </div>

                {swapEmp1Id && (
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Tap to select your off day
                    </p>
                    <WeekGrid
                      holidays={emp1?.weeklyHolidays || []}
                      selectedDay={emp1OffDay}
                      onSelect={(day) => setEmp1OffDay(day === emp1OffDay ? "" : day)}
                    />
                    {emp1OffDay ? (
                      <p className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1 pt-0.5">
                        <MoonStar className="h-3 w-3" /> Off on <span className="font-bold">{emp1OffDay}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400">No day selected</p>
                    )}
                  </div>
                )}
              </div>

              {/* Employee B column */}
              <div className="space-y-3">
                <div>
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">
                    {isAdmin ? "Employee B" : "Swap With"}
                  </Label>
                  <Select
                    value={swapEmp2Id}
                    onValueChange={(val) => {
                      setSwapEmp2Id(val);
                      setEmp2OffDay("");
                    }}
                  >
                    <SelectTrigger className="h-9 rounded-lg bg-slate-50 border border-slate-200 text-sm font-medium">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 bg-white">
                      {nonAdminEmployees
                        .filter((u) => (u.id || (u as any)._id) !== swapEmp1Id)
                        .map((u) => {
                          const id = u.id || (u as any)._id;
                          return <SelectItem key={id} value={id}>{u.name}</SelectItem>;
                        })}
                    </SelectContent>
                  </Select>
                </div>

                {swapEmp2Id && (
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Tap to select off day
                    </p>
                    <WeekGrid
                      holidays={emp2?.weeklyHolidays || []}
                      selectedDay={emp2OffDay}
                      onSelect={(day) => setEmp2OffDay(day === emp2OffDay ? "" : day)}
                    />
                    {emp2OffDay ? (
                      <p className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1 pt-0.5">
                        <MoonStar className="h-3 w-3" /> Off on <span className="font-bold">{emp2OffDay}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400">No day selected</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Swap result preview ── */}
            {emp1OffDay && emp2OffDay && (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">After Swap</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {emp1OffDay === emp2OffDay ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700 font-medium text-center">
                    Both employees selected the same day — please choose different days to swap.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-1.5">
                      <p className="text-xs font-semibold text-slate-700">{emp1?.name}</p>
                      <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                        <MoonStar className="h-3 w-3" /> Off on <span className="font-bold">{emp2OffDay}</span>
                      </p>
                      <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> Works on <span className="font-bold">{emp1OffDay}</span>
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-1.5">
                      <p className="text-xs font-semibold text-slate-700">{emp2?.name}</p>
                      <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                        <MoonStar className="h-3 w-3" /> Off on <span className="font-bold">{emp1OffDay}</span>
                      </p>
                      <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> Works on <span className="font-bold">{emp2OffDay}</span>
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Steps hint */}
            {(!swapEmp1Id || !swapEmp2Id || !emp1OffDay || !emp2OffDay) && (
              <ol className="text-[11px] text-slate-400 space-y-0.5 list-decimal list-inside font-medium">
                {isAdmin && <li className={swapEmp1Id ? "text-slate-600" : ""}>Select Employee A</li>}
                <li className={emp1OffDay ? "text-slate-600" : ""}>
                  {isAdmin ? "Tap Employee A's off day on the calendar" : "Tap your off day on the calendar"}
                </li>
                <li className={swapEmp2Id ? "text-slate-600" : ""}>
                  {isAdmin ? "Select Employee B" : "Select the employee to swap with"}
                </li>
                <li className={emp2OffDay ? "text-slate-600" : ""}>Tap their off day on the calendar</li>
              </ol>
            )}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <Button
              variant="ghost"
              onClick={closeSwapDialog}
              disabled={isSwapping}
              className="rounded-lg font-semibold text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSwapLeaves}
              disabled={isSwapping || !canConfirm}
              className="rounded-lg gradient-primary text-white border-0 font-semibold shadow-sm px-6 text-sm flex items-center gap-2"
            >
              {isSwapping ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirm Swap
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveManagementPage;

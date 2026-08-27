import React, { useEffect, useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/hrms/components/ui/card";
import { Badge } from "@/hrms/components/ui/badge";
import { Skeleton } from "@/hrms/components/ui/skeleton";
import { Button } from "@/hrms/components/ui/button";
import {
  UserCheck,
  CalendarDays,
  Clock,
  AlertCircle,
  UserX,
  Phone,
  ChevronLeft,
  ChevronRight,
  MapPinOff,
  Smartphone,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  FileSpreadsheet,
  LogIn,
  ArrowRight,
  Edit2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { format, isAfter, isSameDay } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";
import { Input } from "@/hrms/components/ui/input";
import { employeeApi, storeApi } from "@/hrms/services/api";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";
import { apiClient } from "@/hrms/services/apiClient";
import { attendanceService } from "@/hrms/services/attendanceService";
import { staffService } from "@/hrms/services/staffService";
import { shiftService, getShiftDurationHours, getEffectiveShiftHours, type Shift } from "@/hrms/services/shiftService";
import type { User } from "@/hrms/types";
import { DataTable } from "@/hrms/components/common/DataTable";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { cn } from "@/hrms/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/hrms/components/ui/dialog";
import { toast } from "@/hrms/components/ui/use-toast";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { StatCard, safeFormat, statusColor } from "@/hrms/components/staff/HRMSShared";
import { realtimeService } from "@/hrms/services/RealtimeService";

const fmtTime = (time?: string) => {
  if (!time) return null;
  try {
    let d = new Date(time);
    if (isNaN(d.getTime())) d = new Date(`2000-01-01T${time}`);
    if (isNaN(d.getTime())) d = new Date(`2000-01-01 ${time}`);
    if (isNaN(d.getTime())) return time;
    return format(d, "hh:mm a");
  } catch {
    return time;
  }
};

const AttendanceDashboardPage: React.FC = () => {
  const { hasPermission, user } = useAuth();

  const [employees, setEmployees] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [absentList, setAbsentList] = useState<any[]>([]); // server-side absent employees
  const [leaves, setLeaves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [attLoading, setAttLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [branches, setBranches] = useState<any[]>([]);
  const [viewingAttendance, setViewingAttendance] = useState<any>(null);
  const [resolvedAddresses, setResolvedAddresses] = useState<Record<string, string>>({});
  const [datePresentCount, setDatePresentCount] = useState(0); // count of attendance records for the currently selected date
  const [dateAbsentees, setDateAbsentees] = useState<any[]>([]); // absentees for the currently selected date
  const [absentSearchQuery, setAbsentSearchQuery] = useState("");
  const [deviceApprovals, setDeviceApprovals] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const selectedDateStr = useMemo(() => format(selectedMonth, "yyyy-MM-dd"), [selectedMonth]);

  // Admin punch correction dialog state
  const [overrideTarget, setOverrideTarget] = useState<{ userId: string; name: string; date: string } | null>(null);
  const [overridePunchIn, setOverridePunchIn] = useState("");
  const [overridePunchOut, setOverridePunchOut] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [overrideSaving, setOverrideSaving] = useState(false);
  // "" = auto-derive from punch times; otherwise a direct status override.
  const [overrideStatus, setOverrideStatus] = useState<"" | "Full Day" | "Half Day">("");

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    try {
      const [staff, leavesData, branchesData, deviceReqs, shiftsData] = await Promise.all([
        staffService.getAll(),
        employeeApi.getLeaves(),
        hrmsbranchService.getAll(),
        apiClient.get("/users/device-approvals?status=pending").then((r: any) => r?.data || []).catch(() => []),
        shiftService.getAll(),
      ]);
      setEmployees(staff);
      setLeaves(leavesData);
      setBranches((Array.isArray(branchesData.data) ? branchesData.data : (Array.isArray(branchesData) ? branchesData : [])) as any[]);
      setDeviceApprovals(deviceReqs);
      setShifts(shiftsData);
    } catch {
      toast({ title: "Load Error", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  useEffect(() => {
    if (!viewingAttendance) return;
    const resolveAddr = async (lat: number, lng: number) => {
      const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      if (resolvedAddresses[cacheKey]) return;
      // Server-side provider chain — street-precise when a geocoding API key
      // is configured on the backend (key never reaches the browser).
      try {
        const res: any = await apiClient.get("/locations/reverse-geocode", {
          params: { lat, lng },
          silent: true,
        } as any);
        const addr = res?.address ?? res?.data?.address;
        if (addr) {
          setResolvedAddresses(prev => ({ ...prev, [cacheKey]: addr }));
          return;
        }
      } catch { /* fall through to direct OSM lookup */ }
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          { headers: { "User-Agent": "ScreenTimeERP/1.0" }, signal: controller.signal },
        );
        clearTimeout(timer);
        const data = await res.json();
        const addr = data?.display_name;
        if (addr) setResolvedAddresses(prev => ({ ...prev, [cacheKey]: addr }));
      } catch { }
    };
    const locations = [
      viewingAttendance.punchIn?.location,
      viewingAttendance.punchOut?.location,
      ...(viewingAttendance.sessions || []).flatMap((s: any) => [s.punchIn?.location, s.punchOut?.location]),
    ];
    locations.forEach(loc => {
      if (loc?.lat && loc?.lng && !loc.address) resolveAddr(loc.lat, loc.lng);
    });
  }, [viewingAttendance]);

  // Fetch attendance from server — all filters sent as query params (including Absent)
  const fetchAtt = useCallback(async () => {
    setAttLoading(true);
    try {
      const dateStr = format(selectedMonth, "yyyy-MM-dd");
      const branchParam = selectedBranch === "all" ? undefined : selectedBranch;
      const shiftParam = shiftFilter === "all" ? undefined : shiftFilter;

      // Always pull the full unfiltered set for the selected date — this
      // drives the "Present" stat tile and the absent list, independent of
      // whichever status chip is currently selected.
      const [allForDate, absentData] = await Promise.all([
        employeeApi.getAttendance({ date: dateStr, hrmsBranchId: branchParam, shiftId: shiftParam }),
        employeeApi.getAbsentEmployees({ date: dateStr, hrmsBranchId: branchParam, shiftId: shiftParam }),
      ]);
      setDatePresentCount(allForDate.length);
      setDateAbsentees(absentData);

      if (statusFilter === "Absent") {
        setAbsentList(absentData);
        setAttendance([]);
      } else if (statusFilter === "all") {
        setAttendance(allForDate);
        setAbsentList([]);
      } else {
        const filtered = await employeeApi.getAttendance({
          date: dateStr,
          hrmsBranchId: branchParam,
          shiftId: shiftParam,
          statusFilter,
        });
        setAttendance(filtered);
        setAbsentList([]);
      }
    } catch {
      toast({ title: "Failed to load attendance", variant: "destructive" });
    } finally {
      setAttLoading(false);
    }
  }, [selectedMonth, selectedBranch, shiftFilter, statusFilter]);

  useEffect(() => { fetchAtt(); }, [fetchAtt]);

  // Live-refresh when anyone punches in/out today — without this, the stat
  // tiles and Records table only ever update on a manual reload or filter
  // change, even while this dashboard is open and being watched.
  useEffect(() => {
    realtimeService.init((user as any)?.token || "", (user as any)?._id || (user as any)?.id);
    const handleAttendanceUpdate = (payload: any) => {
      if (payload?.date === selectedDateStr) fetchAtt();
    };
    realtimeService.on("attendance_update", handleAttendanceUpdate);
    return () => realtimeService.off("attendance_update");
  }, [fetchAtt, selectedDateStr, user]);

  // The attendance API already returns each record with `userId` populated
  // (see getAllAttendance's populate("userId", "name ...")) — prefer that
  // name directly. The local `employees` cross-reference is only a fallback
  // for callers (like row actions) that only have a bare id to work with.
  const getEmployeeName = (id: string | any, populatedName?: string) => {
    if (populatedName) return populatedName;
    const emp = employees.find((e: User) => String((e as any)._id || e.id) === String(id));
    return emp ? emp.name : "Staff";
  };

  const isViewingToday = isSameDay(selectedMonth, new Date());

  // Full Day / Half Day are finalized server-side at punch-out (against the
  // employee's assigned shift duration) — trust att.status once the day is
  // complete. "On Duty" is a live-only label for today while still in
  // progress; a past day that never got a punch-out reads back as Absent.
  const getEffectiveStatus = (att: any) => {
    const hasPunchIn = att.punchIn?.time || att.punchIn;
    const hasOpenSession = (att.sessions || []).some((s: any) => s.punchIn?.time && !s.punchOut?.time);
    const hasPunchOut = (att.punchOut?.time || att.punchOut) && !hasOpenSession;
    if (!hasPunchIn) return "Absent";
    if (!hasPunchOut) return isViewingToday ? "On Duty" : "Absent";
    return att.status || "Absent";
  };

  const openOverride = (userId: string, name: string, date: string) => {
    setOverrideTarget({ userId, name, date });
    setOverridePunchIn("");
    setOverridePunchOut("");
    setOverrideNote("");
    setOverrideStatus("");
  };

  const correctionCalc = (() => {
    if (!overridePunchIn || !overridePunchOut) return null;
    const [ih, im] = overridePunchIn.split(":").map(Number);
    const [oh, om] = overridePunchOut.split(":").map(Number);
    const totalMins = (oh * 60 + om) - (ih * 60 + im);
    if (totalMins <= 0) return null;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    // Full Day requires completing the employee's ENTIRE assigned shift
    // duration — mirrors finalizeStatus() on the backend.
    const emp = employees.find((e: User) => String((e as any)._id || e.id) === String(overrideTarget?.userId));
    const shift = shifts.find((sh) => sh._id === (emp as any)?.shiftId);
    const shiftMins = getEffectiveShiftHours(shift) * 60;
    const label = totalMins >= shiftMins ? "Full Day" : "Half Day";
    return { h, m, label };
  })();

  const handleAdminCorrect = async () => {
    if (!overrideTarget || (!overridePunchIn && !overridePunchOut && !overrideStatus)) return;
    setOverrideSaving(true);
    try {
      await attendanceService.adminCorrectPunch({
        userId: overrideTarget.userId,
        date: overrideTarget.date,
        ...(overridePunchIn && { punchInTime: overridePunchIn }),
        ...(overridePunchOut && { punchOutTime: overridePunchOut }),
        ...(overrideStatus && { statusOverride: overrideStatus }),
        note: overrideNote.trim(),
      });
      toast({ title: "Attendance Corrected", description: `${overrideTarget.name} — ${overrideStatus || correctionCalc?.label || "updated"}.` });
      setOverrideTarget(null);
      const branchParam = selectedBranch === "all" ? undefined : selectedBranch;
      const shiftParam = shiftFilter === "all" ? undefined : shiftFilter;
      const dateStr = format(selectedMonth, "yyyy-MM-dd");
      const [allForDate, absentData] = await Promise.all([
        employeeApi.getAttendance({ date: dateStr, hrmsBranchId: branchParam, shiftId: shiftParam }),
        employeeApi.getAbsentEmployees({ date: dateStr, hrmsBranchId: branchParam, shiftId: shiftParam }),
      ]);
      setDatePresentCount(allForDate.length);
      setDateAbsentees(absentData);
      if (statusFilter === "Absent") {
        setAbsentList(absentData);
        setAttendance([]);
      } else if (statusFilter === "all") {
        setAttendance(allForDate);
        setAbsentList([]);
      } else {
        const filtered = await employeeApi.getAttendance({ date: dateStr, hrmsBranchId: branchParam, shiftId: shiftParam, statusFilter });
        setAttendance(filtered);
        setAbsentList([]);
      }
    } catch {
      toast({ title: "Error", description: "Failed to correct attendance", variant: "destructive" });
    } finally {
      setOverrideSaving(false);
    }
  };


  // displayData: server already filtered; just apply local search for absent
  const displayData = useMemo(() => {
    if (statusFilter === "Absent") {
      return searchQuery
        ? absentList.filter((e: any) =>
          (e.name || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
        : absentList;
    }
    return searchQuery
      ? attendance.filter((att: any) =>
        getEmployeeName(att.userId?._id || att.userId, att.userId?.name)
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
      : attendance;
  }, [attendance, absentList, statusFilter, searchQuery]);

  // Approved leaves that actually cover the currently selected date — the
  // stat tile must move when the date changes, not show a running total.
  const onLeaveForDate = useMemo(() => {
    return leaves.filter((l: any) => {
      if ((l.status || "").toLowerCase() !== "approved") return false;
      if (!l.fromDate) return false;
      const from = format(new Date(l.fromDate), "yyyy-MM-dd");
      const to = l.toDate ? format(new Date(l.toDate), "yyyy-MM-dd") : from;
      return selectedDateStr >= from && selectedDateStr <= to;
    });
  }, [leaves, selectedDateStr]);

  // Exports exactly what's on screen — respects the date, branch, shift and
  // status filter currently selected (e.g. "Full Day" only exports Full Day rows).
  const handleExportExcel = () => {
    if (!displayData.length) {
      toast({ title: "Nothing to export", description: "No records match the current filter.", variant: "destructive" });
      return;
    }
    try {
      let sheetData: any[];
      if (statusFilter === "Absent") {
        sheetData = displayData.map((emp: any, idx: number) => ({
          "S.No": idx + 1,
          "Employee": emp.name || "",
          "Email": emp.email || "",
          "Mobile": emp.mobile || "",
          "Role": emp.role?.label || "",
          "Date": selectedDateStr,
          "Status": "Absent",
        }));
      } else {
        sheetData = displayData.map((att: any, idx: number) => {
          const hours = Number(att.totalHours) || 0;
          const h = Math.floor(hours);
          const m = Math.round((hours - h) * 60);
          return {
            "S.No": idx + 1,
            "Employee": getEmployeeName(att.userId?._id || att.userId, att.userId?.name),
            "Date": att.date || selectedDateStr,
            "Punch In": fmtTime(att.punchIn?.time || att.punchIn) || "--:--",
            "Punch Out": fmtTime(att.punchOut?.time || att.punchOut) || "--:--",
            "Total Hours": hours ? `${h}h ${m}m` : "",
            "Status": getEffectiveStatus(att),
          };
        });
      }
      const ws = XLSX.utils.json_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");
      const colWidths = Object.keys(sheetData[0]).map((key) => ({
        wch: Math.max(key.length, ...sheetData.map((r: any) => String(r[key] ?? "").length)) + 2,
      }));
      ws["!cols"] = colWidths;
      const filterLabel = statusFilter === "all" ? "All" : statusFilter.replace(/\s+/g, "");
      XLSX.writeFile(wb, `Attendance_${selectedDateStr}_${filterLabel}.xlsx`);
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 space-y-6 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Attendance Dashboard</h1>
          <p className="text-sm text-slate-400">Daily presence tracking and regularizations</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={UserCheck} label="Present" value={datePresentCount} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
        <StatCard icon={CalendarDays} label="On Leave" value={onLeaveForDate.length} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
        <StatCard icon={AlertCircle} label="Absent" value={dateAbsentees.length} gradient="bg-gradient-to-br from-red-500 to-rose-600" />
      </div>

      <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 py-4 border-b border-slate-100">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <CardTitle className="text-base font-semibold text-slate-700">Records</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="w-64 h-8 text-xs"
                />
                {branches.length > 0 && (
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="h-8 text-xs w-36 bg-white">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((b: any) => (
                        <SelectItem key={b._id || b.id} value={b._id || b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {shifts.length > 0 && (
                  <Select value={shiftFilter} onValueChange={setShiftFilter}>
                    <SelectTrigger className="h-8 text-xs w-36 bg-white">
                      <SelectValue placeholder="All Shifts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Shifts</SelectItem>
                      {shifts.map((sh) => (
                        <SelectItem key={sh._id} value={sh._id}>
                          {sh.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="flex items-center gap-1 bg-white border rounded-lg p-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const d = new Date(selectedMonth); d.setDate(d.getDate() - 1); setSelectedMonth(d); }}><ChevronLeft className="h-4 w-4" /></Button>
                  <input
                    type="date"
                    value={format(selectedMonth, "yyyy-MM-dd")}
                    max={format(new Date(), "yyyy-MM-dd")}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [year, month, day] = e.target.value.split('-').map(Number);
                        setSelectedMonth(new Date(year, month - 1, day));
                      }
                    }}
                    className="h-7 px-1 text-[11px] font-bold text-slate-700 bg-transparent border-0 focus:outline-none cursor-pointer w-[110px]"
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isAfter(selectedMonth, new Date())} onClick={() => { const d = new Date(selectedMonth); d.setDate(d.getDate() + 1); setSelectedMonth(d); }}><ChevronRight className="h-4 w-4" /></Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs font-semibold bg-white"
                  onClick={handleExportExcel}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Export Excel
                </Button>
              </div>
            </div>
            {/* Status filter chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {(["all", "Full Day", "Half Day", "Absent"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all",
                    statusFilter === s
                      ? s === "all" ? "bg-slate-700 text-white border-slate-700"
                        : s === "Full Day" ? "bg-emerald-500 text-white border-emerald-500"
                          : s === "Half Day" ? "bg-amber-400 text-white border-amber-400"
                            : "bg-red-600 text-white border-red-600"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                  )}
                >
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        {attLoading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-36 rounded" />
                  <Skeleton className="h-2.5 w-20 rounded" />
                </div>
                {statusFilter !== "Absent" && (
                  <>
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </>
                )}
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <DataTable
            data={displayData}
            columns={statusFilter === "Absent" ? [
              {
                header: "Staff",
                accessorKey: (emp: any) => (
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{emp.name || emp.userId?.name || "—"}</p>
                    <p className="text-[10px] text-slate-400">{emp.role?.label || emp.email || ""}</p>
                  </div>
                ),
              },
              {
                header: "Status",
                accessorKey: () => (
                  <Badge className="bg-red-100 text-red-700 border-0 font-bold">Absent</Badge>
                ),
              },
              {
                header: "",
                id: "absent-actions",
                accessorKey: (emp: any) => {
                  const empId = String(emp._id || emp.id);
                  return (
                    <div className="flex items-center gap-1">
                      {hasPermission("manage_attendance") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-violet-500 hover:bg-violet-50"
                          title="Mark Attendance"
                          onClick={() => openOverride(empId, emp.name, selectedDateStr)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.open(`tel:${emp.mobile}`, "_self")}><Phone className="h-3.5 w-3.5" /></Button>
                    </div>
                  );
                },
              },
            ] : [
              {
                header: "Staff",
                accessorKey: (att: any) => (
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{getEmployeeName(att.userId?._id || att.userId, att.userId?.name)}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{att.status}</p>
                  </div>
                ),
              },
              { header: "Punch In", accessorKey: (att: any) => <Badge variant="outline" className="bg-emerald-50 text-emerald-600 text-[10px]">{fmtTime(att.punchIn?.time || att.punchIn) || "--:--"}</Badge> },
              { header: "Lunch In", accessorKey: (att: any) => <Badge variant="outline" className={`text-[10px] ${att.lunchIn?.time || att.lunchIn ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-300"}`}>{fmtTime(att.lunchIn?.time || att.lunchIn) || "--:--"}</Badge> },
              {
                header: "Lunch Out",
                accessorKey: (att: any) => {
                  const hasOut = att.lunchOut?.time || att.lunchOut;
                  const over = att.lunchOverLimit;
                  const mins = Number(att.lunchMinutes) || 0;
                  return (
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant="outline" className={`text-[10px] ${
                        over ? "bg-red-50 text-red-600 border-red-200"
                          : hasOut ? "bg-orange-50 text-orange-600"
                            : "bg-slate-50 text-slate-300"
                      }`}>
                        {fmtTime(att.lunchOut?.time || att.lunchOut) || "--:--"}
                      </Badge>
                      {mins > 0 && (
                        <span className={`flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide ${over ? "text-red-600" : "text-slate-400"}`}>
                          {over && <AlertTriangle className="h-2.5 w-2.5" />}
                          {Math.floor(mins / 60)}h {mins % 60}m{over ? " over" : ""}
                        </span>
                      )}
                    </div>
                  );
                },
              },
              {
                header: "Punch Out",
                accessorKey: (att: any) => {
                  // Root punchOut is Session 1's out-time; lastPunchOut (server
                  // virtual) is the day's TRUE final out — null while a later
                  // session is still open.
                  const hasOpenSession = (att.sessions || []).some((s: any) => s.punchIn?.time && !s.punchOut?.time);
                  const hasPunchOut = hasOpenSession
                    ? null
                    : att.lastPunchOut?.time || att.punchOut?.time || att.punchOut;
                  const noOutLabel = isViewingToday ? "On Duty" : "Absent";
                  return (
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant="outline" className={`text-[10px] ${att.autoPunchOut ? "bg-red-50 text-red-600 border-red-200"
                        : hasPunchOut ? "bg-blue-50 text-blue-600"
                          : isViewingToday ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : "bg-orange-50 text-orange-600 border-orange-200"
                        }`}>
                        {fmtTime(hasPunchOut) || noOutLabel}
                      </Badge>
                      {att.autoPunchOut && (
                        <div className="flex items-center gap-1">
                          <MapPinOff className="h-3 w-3 text-red-500" />
                          <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide">Auto</span>
                        </div>
                      )}
                    </div>
                  );
                },
              },
              {
                header: "Selfie",
                id: "selfie",
                accessorKey: (att: any) => {
                  const punchInSelfie = resolveImageUrl(att.punchIn?.selfieUrl || att.selfieInUrl);
                  const punchOutSelfie = resolveImageUrl(att.punchOut?.selfieUrl || att.selfieOutUrl);
                  const punchInFailed = att.selfieVerificationStatus === "failed";
                  return (
                    <div className="flex items-center gap-1.5">
                      <div className="relative group/selfie shrink-0">
                        <button
                          type="button"
                          disabled={!punchInSelfie}
                          onClick={() => punchInSelfie && window.open(punchInSelfie, "_blank")}
                          className={`h-8 w-8 rounded-lg overflow-hidden border shadow-sm flex items-center justify-center bg-slate-50 transition active:scale-95 ${
                            punchInFailed 
                              ? "border-red-500 ring-2 ring-red-500/20" 
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <img
                            src={punchInSelfie || `https://ui-avatars.com/api/?name=IN&background=10b981&color=fff`}
                            alt="Punch In"
                            className="h-full w-full object-cover"
                            onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=IN&background=10b981&color=fff`)}
                          />
                        </button>
                        <span className={`absolute -top-1.5 -right-1 px-1 rounded text-white font-black text-[7px] uppercase shadow-sm pointer-events-none ${
                          punchInFailed ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                        }`}>
                          {punchInFailed ? "Failed" : "IN"}
                        </span>
                      </div>

                      {punchOutSelfie ? (
                        <div className="relative group/selfie shrink-0">
                          <button
                            type="button"
                            onClick={() => window.open(punchOutSelfie, "_blank")}
                            className="h-8 w-8 rounded-lg overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center bg-slate-50 transition hover:border-slate-300 active:scale-95"
                          >
                            <img
                              src={punchOutSelfie}
                              alt="Punch Out"
                              className="h-full w-full object-cover"
                              onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=OUT&background=3b82f6&color=fff`)}
                            />
                          </button>
                          <span className="absolute -top-1.5 -right-1 px-1 rounded bg-rose-500 text-white font-black text-[7px] uppercase shadow-sm pointer-events-none">OUT</span>
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-300 select-none shrink-0">
                          OUT
                        </div>
                      )}
                    </div>
                  );
                },
              },
              {
                header: "Total Hrs",
                accessorKey: (att: any) => {
                  let hours = att.totalHours;
                  if (!hours && att.punchIn?.time && att.punchOut?.time) {
                    try {
                      const inD = new Date(`2000-01-01T${att.punchIn.time}`);
                      const outD = new Date(`2000-01-01T${att.punchOut.time}`);
                      hours = Math.max(0, (outD.getTime() - inD.getTime()) / 3600000);
                    } catch { /* ignore */ }
                  }
                  if (!hours) return <span className="text-slate-300 text-xs font-bold">—</span>;
                  const h = Math.floor(hours);
                  const m = Math.round((hours - h) * 60);
                  // Full Day requires completing the employee's ENTIRE assigned
                  // shift duration; any completed punch under that is Half Day —
                  // mirrors finalizeAttendanceStatus() on the backend.
                  const shift = shifts.find((sh) => sh._id === att.shiftId);
                  const shiftHrs = getEffectiveShiftHours(shift);
                  const tier = hours >= shiftHrs ? "Full Day" : "Half Day";
                  // Tailwind's JIT scanner needs literal class strings — avoid
                  // building class names from a runtime template.
                  const [textCls, labelCls] =
                    tier === "Full Day" ? ["text-emerald-600", "text-emerald-400"]
                    : ["text-amber-600", "text-amber-400"];
                  return (
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-sm font-bold ${textCls}`}>
                        {h}h {m}m
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${labelCls}`}>
                        {tier}
                      </span>
                    </div>
                  );
                },
              },
              {
                header: "Status",
                accessorKey: (att: any) => {
                  const effective = getEffectiveStatus(att);
                  const statusMap: Record<string, { bg: string; text: string }> = {
                    "Full Day": { bg: "bg-emerald-100", text: "text-emerald-700" },
                    "Half Day": { bg: "bg-amber-100", text: "text-amber-700" },
                    "On Duty": { bg: "bg-blue-100", text: "text-blue-700" },
                    "Absent": { bg: "bg-red-100", text: "text-red-700" },
                  };
                  const cfg = statusMap[effective] || { bg: "bg-slate-100", text: "text-slate-700" };
                  const lateMins = Number(att.lateMinutes) || 0;
                  const lateLabel = lateMins > 0
                    ? (lateMins >= 60 ? `${Math.floor(lateMins / 60)}h ${lateMins % 60}m late` : `${lateMins} min late`)
                    : null;
                  const earlyMins = Number(att.earlyOutMinutes) || 0;
                  const earlyLabel = earlyMins > 0
                    ? (earlyMins >= 60 ? `${Math.floor(earlyMins / 60)}h ${earlyMins % 60}m early out` : `${earlyMins} min early out`)
                    : null;
                  return (
                    <div className="flex flex-col gap-1 items-start">
                      <Badge className={`${cfg.bg} ${cfg.text} border-0 font-bold`}>{effective}</Badge>
                      {lateLabel && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-orange-600 uppercase tracking-wide">
                          <Clock className="h-2.5 w-2.5" /> {lateLabel}
                        </span>
                      )}
                      {earlyLabel && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-rose-600 uppercase tracking-wide">
                          <Clock className="h-2.5 w-2.5" /> {earlyLabel}
                        </span>
                      )}
                      {att.source === "admin" && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-violet-600 uppercase tracking-wide">
                          <ShieldCheck className="h-2.5 w-2.5" /> Admin Entry
                        </span>
                      )}
                      {att.autoPunchOut && (
                        <Badge className="bg-red-100 text-red-600 border-0 text-[9px] font-bold gap-0.5">
                          <MapPinOff className="h-2.5 w-2.5" /> Geo Exit
                        </Badge>
                      )}
                    </div>
                  );
                },
              },
              {
                header: "",
                id: "actions",
                accessorKey: (att: any) => {
                  const staffId = att.userId?._id || att.userId;
                  const empName = getEmployeeName(staffId, att.userId?.name);
                  return (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10"
                        onClick={() => setViewingAttendance(att)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {hasPermission("manage_attendance") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-violet-500 hover:bg-violet-50"
                          title="Override Attendance"
                          onClick={() => openOverride(staffId, empName, att.date || selectedDateStr)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                },
              },
            ]}
          />
        )}
      </Card>

      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="py-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-500">
              <UserX className="w-4 h-4" /> {isViewingToday ? "Absent Today" : `Absent — ${format(selectedMonth, "MMM d, yyyy")}`}
            </CardTitle>
            <Input
              placeholder="Search absent employee..."
              value={absentSearchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAbsentSearchQuery(e.target.value)}
              className="w-full sm:w-64 h-8 text-xs"
            />
          </div>
        </CardHeader>
        <div className="divide-y max-h-64 overflow-auto">
          {dateAbsentees
            .filter((emp: any) => (emp.name || "").toLowerCase().includes(absentSearchQuery.toLowerCase()))
            .map((emp: any) => (
              <div key={emp._id || emp.id} className="px-4 py-3 flex items-center justify-between gap-2">
                <p className="text-sm font-bold flex-1 min-w-0 truncate">{emp.name}</p>
                <div className="flex items-center gap-1 shrink-0">
                  {hasPermission("manage_attendance") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-[11px] font-bold text-violet-600 hover:bg-violet-50 px-2"
                      onClick={() => openOverride(String(emp._id || emp.id), emp.name, selectedDateStr)}
                    >
                      <Edit2 className="h-3 w-3" /> Mark
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.open(`tel:${emp.mobile}`, "_self")}><Phone className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* Device Approval Requests */}
      {deviceApprovals.length > 0 && (
        <Card className="border border-amber-200 bg-amber-50/40 shadow-sm overflow-hidden">
          <CardHeader className="py-4 border-b border-amber-100">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700">
              <Smartphone className="w-4 h-4" /> New Device Login Requests ({deviceApprovals.length})
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-amber-100 max-h-64 overflow-auto">
            {deviceApprovals.map((req: any) => (
              <div key={req._id} className="p-4 flex justify-between items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{req.userId?.name || "Unknown"}</p>
                  <p className="text-[10px] text-slate-400 truncate">{req.userId?.email}</p>
                  <p className="text-[10px] text-amber-600 font-semibold mt-0.5 truncate">
                    Device: {req.requestedDeviceId?.slice(0, 12)}…
                  </p>
                  <p className="text-[9px] text-slate-400 truncate">{req.deviceInfo?.userAgent?.slice(0, 40)}…</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="h-7 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
                    onClick={async () => {
                      await apiClient.patch(`/users/device-approvals/${req._id}/approve`, {});
                      setDeviceApprovals((prev) => prev.filter((r) => r._id !== req._id));
                      toast({ title: "Device Approved", description: `${req.userId?.name} can now log in from this device.` });
                    }}
                  >
                    <CheckCircle2 className="h-3 w-3" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] border-red-200 text-red-600 hover:bg-red-50 gap-1"
                    onClick={async () => {
                      await apiClient.patch(`/users/device-approvals/${req._id}/reject`, {});
                      setDeviceApprovals((prev) => prev.filter((r) => r._id !== req._id));
                      toast({ title: "Device Rejected", description: "Request has been rejected.", variant: "destructive" });
                    }}
                  >
                    <XCircle className="h-3 w-3" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Admin Punch Correction Dialog ───────────────────────────────── */}
      <Dialog open={!!overrideTarget} onOpenChange={() => setOverrideTarget(null)}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 shrink-0 text-violet-500" /> Correct Attendance
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-slate-700">{overrideTarget?.name}</span>
              <span className="text-slate-400 mx-1">·</span>
              For{" "}
              <span className="font-bold text-violet-600">
                {overrideTarget?.date && safeFormat(overrideTarget.date, "dd MMM yyyy")}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {/* Time inputs — both optional, fill whichever needs correcting */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Punch In <span className="text-slate-300 normal-case font-normal">(optional)</span>
                </p>
                <Input
                  type="time"
                  value={overridePunchIn}
                  onChange={e => setOverridePunchIn(e.target.value)}
                  className={cn(
                    "rounded-xl text-sm font-semibold",
                    overridePunchIn ? "text-emerald-700 border-emerald-300" : "text-slate-400 border-slate-200"
                  )}
                />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Punch Out <span className="text-slate-300 normal-case font-normal">(optional)</span>
                </p>
                <Input
                  type="time"
                  value={overridePunchOut}
                  onChange={e => setOverridePunchOut(e.target.value)}
                  className={cn(
                    "rounded-xl text-sm font-semibold",
                    overridePunchOut ? "text-blue-700 border-blue-300" : "text-slate-400 border-slate-200"
                  )}
                />
              </div>
            </div>
            {/* Live hours preview — only when both times are filled */}
            {correctionCalc ? (
              <div className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-bold",
                correctionCalc.label === "Full Day" ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : correctionCalc.label === "Half Day" ? "bg-amber-50 border-amber-300 text-amber-700"
                    : "bg-orange-50 border-orange-300 text-orange-700"
              )}>
                <span>{correctionCalc.h}h {correctionCalc.m}m worked</span>
                <span className="uppercase tracking-widest text-[11px]">{correctionCalc.label}</span>
              </div>
            ) : overridePunchIn && overridePunchOut ? (
              <p className="text-xs text-red-500 font-semibold px-1">Punch-out must be after punch-in</p>
            ) : null}
            {/* Direct status override — skips the hours-based calculation entirely */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Set Status Directly <span className="text-slate-300 normal-case font-normal">(optional — overrides the calculation above)</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(["Full Day", "Half Day"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setOverrideStatus((prev) => (prev === s ? "" : s))}
                    className={cn(
                      "rounded-xl border-2 py-2 text-[11px] font-bold uppercase tracking-wide transition-all",
                      overrideStatus === s
                        ? s === "Full Day" ? "bg-emerald-500 border-emerald-500 text-white"
                          : "bg-amber-400 border-amber-400 text-white"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-400"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {/* Reason */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Reason <span className="text-slate-300 normal-case font-normal">(optional)</span></p>
              <textarea
                className="w-full rounded-xl border border-slate-200 text-sm px-3 py-2 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-slate-50"
                placeholder="e.g. Employee had prior permission to leave early..."
                value={overrideNote}
                onChange={e => setOverrideNote(e.target.value)}
              />
            </div>
            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setOverrideTarget(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                onClick={handleAdminCorrect}
                disabled={overrideSaving || (!overridePunchIn && !overridePunchOut && !overrideStatus) || (overridePunchIn !== "" && overridePunchOut !== "" && !correctionCalc)}
              >
                <ShieldCheck className="h-4 w-4" />
                {overrideSaving ? "Saving..." : "Save Correction"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingAttendance} onOpenChange={() => setViewingAttendance(null)}>
        <DialogContent className="rounded-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Attendance Detail</DialogTitle></DialogHeader>
          {viewingAttendance && (
            <div className="space-y-4">
              {/* Punch In / Punch Out selfies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: "punchIn", label: "Punch In", color: "emerald", bg: "10b981" },
                  { key: "punchOut", label: "Punch Out", color: "blue", bg: "3b82f6" },
                ].map(({ key, label, color, bg }) => {
                  const rawSelfie = viewingAttendance[key]?.selfieUrl || (key === "punchIn" ? viewingAttendance.selfieInUrl : viewingAttendance.selfieOutUrl);
                  const selfieUrl = resolveImageUrl(rawSelfie);
                  return (
                    <div key={key} className="space-y-2">
                      <p className={`text-[10px] font-bold uppercase tracking-widest text-${color}-500`}>{label}</p>
                      <div className="h-28 w-full rounded-xl overflow-hidden border border-slate-100">
                        {selfieUrl ? (
                          <img
                            src={selfieUrl}
                            alt={label}
                            className="h-full w-full object-cover cursor-pointer"
                            onClick={() => window.open(selfieUrl, "_blank")}
                            onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${label}&background=${bg}&color=fff&size=200`)}
                          />
                        ) : (
                          <div className="h-full w-full bg-slate-50 flex items-center justify-center border border-dashed border-slate-200 rounded-xl">
                            {/* A missing selfie is NOT the same as "no punch". Auto
                                punch-outs, admin corrections and session 2+ punches
                                have a valid time but no selfie — those must read
                                "No Selfie", never "Still On Duty". Only a genuinely
                                absent punch (no time at all) is Still On Duty /
                                Not Recorded. */}
                            <p className="text-[10px] text-slate-400 font-semibold uppercase">
                              {(viewingAttendance[key]?.time || (key === "punchIn" && viewingAttendance[key]))
                                ? "No Selfie"
                                : key === "punchOut" ? "Still On Duty" : "Not Recorded"}
                            </p>
                          </div>
                        )}
                      </div>
                      <p className={`text-sm font-bold text-${color}-600 text-center`}>
                        {fmtTime(viewingAttendance[key]?.time || viewingAttendance[key]) || "--:--"}
                      </p>
                      <p className="text-[10px] text-slate-500 text-center leading-tight px-1">
                        {viewingAttendance[key]?.location?.address
                          ? viewingAttendance[key].location.address
                          : viewingAttendance[key]?.location?.lat
                            ? resolvedAddresses[`${Number(viewingAttendance[key].location.lat).toFixed(5)},${Number(viewingAttendance[key].location.lng).toFixed(5)}`] || "Fetching address..."
                            : ""}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Lunch In / Lunch Out */}
              {(viewingAttendance.lunchIn?.time || viewingAttendance.lunchOut?.time) && (
                <div className={cn(
                  "grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border",
                  viewingAttendance.lunchOverLimit ? "bg-red-50/70 border-red-200" : "bg-amber-50/60 border-amber-100"
                )}>
                  {[
                    { key: "lunchIn", label: "Lunch Break Start", color: "amber" },
                    { key: "lunchOut", label: "Lunch Break End", color: "orange" },
                  ].map(({ key, label, color }) => (
                    <div key={key} className="text-center">
                      <p className={`text-[9px] uppercase font-bold text-${color}-400 mb-1`}>{label}</p>
                      <p className={`text-base font-bold ${viewingAttendance[key]?.time || viewingAttendance[key] ? `text-${color}-600` : "text-slate-300"}`}>
                        {fmtTime(viewingAttendance[key]?.time || viewingAttendance[key]) || "--:--"}
                      </p>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        {viewingAttendance[key]?.location?.address
                          ? viewingAttendance[key].location.address
                          : viewingAttendance[key]?.location?.lat
                            ? resolvedAddresses[`${Number(viewingAttendance[key].location.lat).toFixed(5)},${Number(viewingAttendance[key].location.lng).toFixed(5)}`] || "Fetching address..."
                            : ""}
                      </p>
                    </div>
                  ))}
                  {/* Actual break length — red when it exceeds the shift allowance.
                      The full over-limit time is already subtracted from worked hours. */}
                  {viewingAttendance.lunchMinutes != null && viewingAttendance.lunchMinutes > 0 && (
                    <div className={cn(
                      "col-span-2 flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-lg py-1.5",
                      viewingAttendance.lunchOverLimit ? "bg-red-100 text-red-700" : "text-slate-500"
                    )}>
                      {viewingAttendance.lunchOverLimit && <AlertTriangle className="h-3.5 w-3.5" />}
                      Break taken: {Math.floor(viewingAttendance.lunchMinutes / 60)}h {viewingAttendance.lunchMinutes % 60}m
                      {viewingAttendance.lunchOverLimit && " — over allowed limit (deducted in full)"}
                    </div>
                  )}
                </div>
              )}

              {/* Additional Sessions (Session 2+) */}
              {(viewingAttendance.sessions || []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Additional Sessions</p>
                  {(viewingAttendance.sessions as any[]).map((s: any) => (
                    <div key={s.sessionNumber} className={cn(
                      "px-3 py-2 rounded-xl border text-[11px] font-semibold space-y-1",
                      s.punchIn?.time && !s.punchOut?.time
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-slate-50 border-slate-100 text-slate-600"
                    )}>
                      <div className="flex items-center gap-2">
                        <LogIn className="h-3 w-3 shrink-0" />
                        <span className="font-bold">S{s.sessionNumber}</span>
                        <span>{fmtTime(s.punchIn?.time) || "--:--"}</span>
                        <ArrowRight className="h-3 w-3 opacity-40 shrink-0" />
                        <span>{s.punchOut?.time ? fmtTime(s.punchOut.time) : <span className="text-emerald-500 font-bold">Live</span>}</span>
                        {s.durationMins != null && (
                          <span className="ml-auto text-slate-400">
                            {Math.floor(s.durationMins / 60)}h {s.durationMins % 60}m
                          </span>
                        )}
                        {s.closeReason === "auto_geofence" && (
                          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-red-100 text-red-600 text-[9px] font-bold uppercase">Auto Exit</span>
                        )}
                      </div>
                      {s.punchIn?.location && (
                        <p className="text-[10px] text-slate-400 font-normal leading-tight pl-5">
                          In: {s.punchIn.location.address
                            ? s.punchIn.location.address
                            : s.punchIn.location.lat
                              ? resolvedAddresses[`${Number(s.punchIn.location.lat).toFixed(5)},${Number(s.punchIn.location.lng).toFixed(5)}`] || "Fetching address..."
                              : ""}
                        </p>
                      )}
                      {s.punchOut?.location && (
                        <p className="text-[10px] text-slate-400 font-normal leading-tight pl-5">
                          Out: {s.punchOut.location.address
                            ? s.punchOut.location.address
                            : s.punchOut.location.lat
                              ? resolvedAddresses[`${Number(s.punchOut.location.lat).toFixed(5)},${Number(s.punchOut.location.lng).toFixed(5)}`] || "Fetching address..."
                              : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Stats row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Total Hours</p>
                  <p className="text-sm font-bold text-slate-700">{viewingAttendance.totalHours ? Number(viewingAttendance.totalHours).toFixed(2) : "0.00"} hrs</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Geo Status</p>
                  {viewingAttendance.autoPunchOut ? (
                    <Badge className="text-[9px] border-0 bg-red-100 text-red-700">Auto Exit</Badge>
                  ) : viewingAttendance.geoStatus === "inside_geofence" ? (
                    <Badge className="text-[9px] border-0 bg-emerald-100 text-emerald-700">✓ Inside</Badge>
                  ) : (
                    <p className="text-sm font-semibold text-slate-400">—</p>
                  )}
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Status</p>
                  {(() => {
                    const eff = getEffectiveStatus(viewingAttendance);
                    const c = statusColor(eff);
                    return <Badge className={`text-[9px] border-0 bg-${c}-100 text-${c}-700`}>{eff}</Badge>;
                  })()}
                </div>
              </div>

              {/* Auto punch-out banner */}
              {viewingAttendance.autoPunchOut && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
                  <div className="h-8 w-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <MapPinOff className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-700 mb-0.5">Auto Punch-Out — Geofence Exit</p>
                    <p className="text-[11px] text-red-500 leading-relaxed">
                      {viewingAttendance.autoPunchOutReason || "Employee left the assigned branch geo-fence area."}
                    </p>
                    {viewingAttendance.calculatedDistance && (
                      <p className="text-[10px] font-semibold text-red-400 mt-1">
                        Distance from branch: {(viewingAttendance.calculatedDistance / 1000).toFixed(2)} km
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceDashboardPage;

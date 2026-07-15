import { useState, useEffect, useMemo } from "react";
import { Button } from "@/hrms/components/ui/button";
import { Badge } from "@/hrms/components/ui/badge";
import { Skeleton } from "@/hrms/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/hrms/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User as UserIcon,
  Download,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Coffee,
  Timer,
  Smartphone,
  Phone,
  Mail,
  Building2,
  TrendingUp,
  LogIn,
  LogOut,
} from "lucide-react";
import { employeeApi } from "@/hrms/services/api";
import { staffService } from "@/hrms/services/staffService";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  startOfDay,
  subMonths,
  addMonths,
  isAfter,
  isToday,
} from "date-fns";
import { cn } from "@/hrms/lib/utils";
import { useSearchParams } from "react-router-dom";
import { toast } from "@/hrms/components/ui/use-toast";

// ─── Helpers ────────────────────────────────────────────────────────────────

const safeFormat = (dateInput: any, fmt: string) => {
  if (!dateInput) return "--";
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return isNaN(d.getTime()) ? "--" : format(d, fmt);
  } catch { return "--"; }
};

const fmtTime = (time?: string) => {
  if (!time) return null;
  try {
    let d = new Date(time);
    if (isNaN(d.getTime())) d = new Date(`2000-01-01T${time}`);
    if (isNaN(d.getTime())) d = new Date(`2000-01-01 ${time}`);
    return isNaN(d.getTime()) ? time : format(d, "hh:mm a");
  } catch { return time; }
};

const STATUS_CFG: Record<string, { gradient: string; ring: string; badge: string; dot: string; text: string }> = {
  "Full Day":   { gradient: "from-emerald-500 to-teal-500",  ring: "border-l-emerald-500", badge: "bg-emerald-500 text-white",   dot: "bg-emerald-500",  text: "text-emerald-600" },
  "Half Day":   { gradient: "from-amber-400 to-orange-400",  ring: "border-l-amber-400",   badge: "bg-amber-400 text-white",     dot: "bg-amber-400",    text: "text-amber-600" },
  "Late":       { gradient: "from-orange-400 to-red-400",    ring: "border-l-orange-400",  badge: "bg-orange-400 text-white",    dot: "bg-orange-400",   text: "text-orange-600" },
  "Short":      { gradient: "from-rose-400 to-pink-500",     ring: "border-l-rose-400",    badge: "bg-rose-400 text-white",      dot: "bg-rose-400",     text: "text-rose-600" },
  "Incomplete": { gradient: "from-yellow-400 to-amber-400",  ring: "border-l-yellow-400",  badge: "bg-yellow-400 text-white",    dot: "bg-yellow-400",   text: "text-yellow-600" },
  "Absent":     { gradient: "from-slate-300 to-slate-400",   ring: "border-l-slate-300",   badge: "bg-slate-200 text-slate-600", dot: "bg-slate-300",    text: "text-slate-500" },
  "Pending":    { gradient: "from-blue-400 to-indigo-400",   ring: "border-l-blue-400",    badge: "bg-blue-400 text-white",      dot: "bg-blue-400",     text: "text-blue-600" },
};
const cfg = (status: string) => STATUS_CFG[status] ?? STATUS_CFG["Absent"];

// ─── Component ───────────────────────────────────────────────────────────────

const StaffAttendanceDetail = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(searchParams.get("staffId") || "");
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    const id = searchParams.get("staffId");
    if (id && id !== selectedStaffId) setSelectedStaffId(id);
  }, [searchParams]);

  useEffect(() => {
    staffService.getAll().then(d => setEmployees(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedStaffId || isNaN(selectedMonth.getTime())) return;
    setIsLoading(true);
    setHistory([]);
    employeeApi
      .getAttendance({ userId: selectedStaffId, month: selectedMonth.getMonth() + 1, year: selectedMonth.getFullYear() })
      .then(d => setHistory(Array.isArray(d) ? d : []))
      .catch(() => setHistory([]))
      .finally(() => setIsLoading(false));
  }, [selectedStaffId, selectedMonth]);

  const selectedStaff = useMemo(
    () => employees.find(e => e.id === selectedStaffId || e._id === selectedStaffId),
    [employees, selectedStaffId]
  );

  const fullHistory = useMemo(() => {
    if (!selectedStaffId) return [];
    const days = eachDayOfInterval({ start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) });
    return days.map(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      const record = history.find(h => {
        const hd = typeof h.date === "string" ? h.date : new Date(h.date).toISOString().split("T")[0];
        return hd === dateStr;
      });
      if (record) {
        let status = "Incomplete";
        if (record.punchOut) {
          let hours = record.totalHours;
          if (!hours && record.punchIn?.time && record.punchOut?.time) {
            try {
              hours = Math.max(0, (new Date(`${dateStr}T${record.punchOut.time}`).getTime() - new Date(`${dateStr}T${record.punchIn.time}`).getTime()) / 3600000);
            } catch { hours = 0; }
          }
          if ((record.status || "").toLowerCase() === "late") status = "Late";
          else if (hours >= 8) status = "Full Day";
          else if (hours >= 4) status = "Half Day";
          else status = "Short";
        }
        return { ...record, status, _hours: record.totalHours || 0 };
      }
      const isPast = isBefore(date, startOfDay(new Date()));
      return { date: dateStr, status: isToday(date) ? "Pending" : isPast ? "Absent" : "Upcoming" } as any;
    }).filter(d => d.status !== "Upcoming").reverse();
  }, [selectedMonth, history, selectedStaffId]);

  const stats = useMemo(() => {
    const worked = fullHistory.filter(h => ["Full Day","Half Day","Late","Short","Incomplete"].includes(h.status));
    const totalHours = history.reduce((acc: number, r: any) => {
      let h = r.totalHours;
      if (!h && r.punchIn?.time && r.punchOut?.time) {
        try { h = Math.max(0, (new Date(`${r.date}T${r.punchOut.time}`).getTime() - new Date(`${r.date}T${r.punchIn.time}`).getTime()) / 3600000); }
        catch { h = 0; }
      }
      return acc + (h || 0);
    }, 0);
    const th = Math.floor(totalHours);
    const tm = Math.round((totalHours - th) * 60);
    return {
      present:  worked.length,
      fullDays: worked.filter(h => h.status === "Full Day").length,
      halfDays: worked.filter(h => h.status === "Half Day").length,
      late:     worked.filter(h => h.status === "Late").length,
      absent:   fullHistory.filter(h => h.status === "Absent").length,
      totalHoursLabel: `${th}h ${tm}m`,
      totalHours,
    };
  }, [fullHistory, history]);

  const handleExport = () => {
    if (!fullHistory.length || !selectedStaff) return;
    const csv = [
      [`Attendance Report — ${selectedStaff.name}`],
      [`Period: ${format(selectedMonth, "MMMM yyyy")}`],
      [],
      ["Date", "Day", "Status", "Punch In", "Punch Out", "Lunch In", "Lunch Out", "Total Hrs"],
      ...fullHistory.map((d: any) => [
        d.date, safeFormat(d.date, "EEEE"), d.status,
        fmtTime(d.punchIn?.time) || "--", fmtTime(d.punchOut?.time) || "--",
        fmtTime(d.lunchIn?.time) || "--", fmtTime(d.lunchOut?.time) || "--",
        d.totalHours ? Number(d.totalHours).toFixed(2) : "0.00",
      ]),
    ].map(r => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `Attendance_${selectedStaff.name.replace(/\s+/g, "_")}_${format(selectedMonth, "MMM_yyyy")}.csv`;
    link.click();
    toast({ title: "Exported", description: "CSV downloaded successfully." });
  };

  const STAT_CARDS = [
    { label: "Present",   value: stats.present,           icon: CheckCircle2,   from: "from-emerald-500", to: "to-teal-500" },
    { label: "Full Day",  value: stats.fullDays,          icon: TrendingUp,     from: "from-teal-500",    to: "to-cyan-500" },
    { label: "Half Day",  value: stats.halfDays,          icon: Timer,          from: "from-amber-400",   to: "to-orange-400" },
    { label: "Late",      value: stats.late,              icon: AlertCircle,    from: "from-orange-400",  to: "to-red-400" },
    { label: "Absent",    value: stats.absent,            icon: XCircle,        from: "from-rose-500",    to: "to-red-600" },
    { label: "Total Hrs", value: stats.totalHoursLabel,   icon: Clock,          from: "from-blue-500",    to: "to-indigo-500" },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-24 max-w-6xl mx-auto">

      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
        {/* decorative blobs */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          {/* Left — Employee info */}
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-2xl bg-white/10 border border-white/20 overflow-hidden shadow-xl">
                {selectedStaff?.avatar ? (
                  <img src={selectedStaff.avatar} className="h-full w-full object-cover" alt={selectedStaff.name} />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <span className="text-3xl font-black text-white/80">
                      {selectedStaff?.name?.substring(0, 2).toUpperCase() || "—"}
                    </span>
                  </div>
                )}
              </div>
              <div className={cn(
                "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-slate-800",
                selectedStaff ? "bg-emerald-400" : "bg-slate-500"
              )} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.25em] mb-1">Attendance Report</p>
              <h1 className="text-2xl font-black text-white leading-tight">
                {selectedStaff?.name || "Select Employee"}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {selectedStaff?.role?.label && (
                  <span className="text-[10px] font-bold text-white/60 bg-white/10 border border-white/10 px-2 py-0.5 rounded-lg">
                    {selectedStaff.role.label}
                  </span>
                )}
                {selectedStaff?.mobile && (
                  <span className="text-[10px] font-bold text-white/50 flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {selectedStaff.mobile}
                  </span>
                )}
                {selectedStaff?.email && (
                  <span className="text-[10px] font-bold text-white/50 flex items-center gap-1 hidden sm:flex">
                    <Mail className="h-3 w-3" /> {selectedStaff.email}
                  </span>
                )}
                {selectedStaff?.storeId?.name && (
                  <span className="text-[10px] font-bold text-white/50 flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> {selectedStaff.storeId.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right — Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Month navigator */}
            <div className="flex items-center gap-1 bg-white/10 border border-white/15 rounded-2xl p-1.5">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-white hover:bg-white/15"
                onClick={() => setSelectedMonth(p => subMonths(p, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-black text-white min-w-[120px] text-center px-2">
                {format(selectedMonth, "MMMM yyyy")}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-white hover:bg-white/15"
                disabled={isAfter(startOfMonth(addMonths(selectedMonth, 1)), new Date())}
                onClick={() => setSelectedMonth(p => addMonths(p, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Employee switcher */}
            <Select value={selectedStaffId} onValueChange={val => {
              setSelectedStaffId(val);
              setSearchParams(p => { const n = new URLSearchParams(p); n.set("staffId", val); return n; });
            }}>
              <SelectTrigger className="h-10 w-[180px] rounded-2xl bg-white/10 border-white/20 text-white text-xs font-bold focus:ring-white/30 [&>svg]:text-white/60">
                <SelectValue placeholder="Switch Staff" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {employees.map(e => (
                  <SelectItem key={e.id || e._id} value={e.id || e._id} className="text-xs font-bold">
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleExport} disabled={!selectedStaffId || !fullHistory.length}
              className="h-10 rounded-2xl bg-white text-slate-900 hover:bg-white/90 font-bold text-xs gap-2 shadow-lg">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      {!selectedStaffId ? (
        /* ── Empty State ──────────────────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-32 rounded-3xl border-2 border-dashed border-border/40 bg-muted/20">
          <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5">
            <UserIcon className="h-10 w-10 text-primary/60" />
          </div>
          <h3 className="text-xl font-black text-foreground">No Employee Selected</h3>
          <p className="text-sm text-muted-foreground mt-2">Use the switcher above to pick a staff member.</p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── Stat Cards ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {STAT_CARDS.map(({ label, value, icon: Icon, from, to }) => (
              <div key={label}
                className="relative overflow-hidden rounded-3xl bg-white border border-border/40 p-5 shadow-sm hover:shadow-md transition-shadow group">
                <div className={cn("absolute -top-4 -right-4 h-16 w-16 rounded-full bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity", from, to)} />
                <div className={cn("h-9 w-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm mb-3", from, to)}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-black text-foreground leading-none">{value}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Attendance Progress Bar ────────────────────────────────────── */}
          {stats.present + stats.absent > 0 && (
            <div className="bg-white rounded-3xl border border-border/40 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-black text-foreground">Monthly Attendance Rate</p>
                  <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                    {stats.present} of {stats.present + stats.absent} working days
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-600">
                    {Math.round((stats.present / (stats.present + stats.absent)) * 100)}%
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Attendance</p>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
                  style={{ width: `${Math.round((stats.present / (stats.present + stats.absent)) * 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-4 mt-3">
                {[
                  { label: "Full Day", color: "bg-emerald-500", count: stats.fullDays },
                  { label: "Half Day", color: "bg-amber-400",   count: stats.halfDays },
                  { label: "Late",     color: "bg-orange-400",  count: stats.late },
                  { label: "Absent",   color: "bg-slate-300",   count: stats.absent },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={`h-2.5 w-2.5 rounded-full ${l.color}`} />
                    <span className="text-[10px] font-bold text-muted-foreground">{l.label} ({l.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Records List ───────────────────────────────────────────────── */}
          <div className="bg-white rounded-3xl border border-border/40 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">Daily Records</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {format(selectedMonth, "MMMM yyyy")} · {fullHistory.length} entries
                  </p>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : fullHistory.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center px-6">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-bold text-muted-foreground">No records for this month</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {fullHistory.map((day: any) => {
                  const c = cfg(day.status);
                  const punchIn  = fmtTime(day.punchIn?.time);
                  const punchOut = fmtTime(day.punchOut?.time);
                  const lunchIn  = fmtTime(day.lunchIn?.time);
                  const lunchOut = fmtTime(day.lunchOut?.time);
                  const hours = day.totalHours ? Number(day.totalHours) : day._hours || 0;
                  const hLabel = hours ? `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m` : null;
                  const isAbsent = day.status === "Absent";
                  const selfieUrl = day.punchIn?.selfieUrl;

                  return (
                    <div key={day.date}
                      className={cn(
                        "flex items-center gap-4 px-5 py-4 border-l-4 hover:bg-slate-50/60 transition-colors group",
                        c.ring,
                        isAbsent && "opacity-60"
                      )}>

                      {/* Date chip */}
                      <div className={cn(
                        "h-14 w-14 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm border",
                        isAbsent
                          ? "bg-slate-50 border-slate-200 text-slate-400"
                          : "bg-gradient-to-br text-white shadow-md border-0",
                        !isAbsent && c.gradient.replace("from-", "bg-gradient-to-br from-")
                      )}>
                        <span className="text-lg font-black leading-none">{safeFormat(day.date, "dd")}</span>
                        <span className="text-[9px] font-black uppercase opacity-80">{safeFormat(day.date, "EEE")}</span>
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="text-sm font-bold text-foreground">{safeFormat(day.date, "dd MMMM yyyy")}</p>
                          <Badge className={cn("border-0 text-[10px] font-black px-2.5 py-0.5 rounded-full", c.badge)}>
                            {day.status}
                          </Badge>
                          {day.lateMinutes > 0 && (
                            <span className="text-[10px] font-bold text-orange-500">
                              +{Math.floor(day.lateMinutes / 60) > 0 ? `${Math.floor(day.lateMinutes / 60)}h ` : ""}{day.lateMinutes % 60}m late
                            </span>
                          )}
                        </div>

                        {isAbsent ? (
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No attendance recorded</p>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3">
                            {punchIn && (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                <LogIn className="h-3 w-3" /> {punchIn}
                              </div>
                            )}
                            {(lunchIn || lunchOut) && (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                                <Coffee className="h-3 w-3" />
                                {lunchIn && <span>{lunchIn}</span>}
                                {lunchIn && lunchOut && <span className="opacity-40">→</span>}
                                {lunchOut && <span>{lunchOut}</span>}
                              </div>
                            )}
                            {punchOut && (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600">
                                <LogOut className="h-3 w-3" /> {punchOut}
                              </div>
                            )}
                            {!punchOut && punchIn && (
                              <span className="text-[11px] font-bold text-muted-foreground/50 italic">Not punched out</span>
                            )}
                            {/* Additional sessions (Session 2+) */}
                            {(day.sessions || []).map((s: any) => (
                              <div key={s.sessionNumber} className={cn(
                                "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border",
                                s.punchIn?.time && !s.punchOut?.time
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                  : "bg-slate-50 border-slate-200 text-slate-500"
                              )}>
                                <LogIn className="h-3 w-3" />
                                <span>S{s.sessionNumber}</span>
                                <span>{fmtTime(s.punchIn?.time) || "--"}</span>
                                <span className="opacity-30">→</span>
                                <span>{s.punchOut?.time ? fmtTime(s.punchOut.time) : <span className="text-emerald-500">Live</span>}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right section */}
                      <div className="flex items-center gap-4 shrink-0">
                        {/* Hours */}
                        {hLabel && (
                          <div className="text-right hidden sm:block">
                            <p className={cn("text-base font-black", c.text)}>{hLabel}</p>
                            <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden mt-1">
                              <div
                                className={cn("h-full rounded-full bg-gradient-to-r", c.gradient)}
                                style={{ width: `${Math.min(100, (hours / 9) * 100)}%` }}
                              />
                            </div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Duration</p>
                          </div>
                        )}

                        {/* Selfie */}
                        <div className={cn(
                          "h-12 w-12 rounded-2xl overflow-hidden border-2 shadow-sm group-hover:scale-105 transition-transform",
                          isAbsent ? "border-slate-200" : "border-white"
                        )}>
                          <img
                            src={selfieUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStaff?.name || "NA")}&background=4f46e5&color=fff&size=96`}
                            alt="selfie"
                            className={cn("h-full w-full object-cover", isAbsent && "grayscale opacity-30")}
                            onError={e => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStaff?.name || "NA")}&background=4f46e5&color=fff&size=96`)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffAttendanceDetail;

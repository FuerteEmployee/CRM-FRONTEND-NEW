import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/hrms/components/ui/card";
import { Badge } from "@/hrms/components/ui/badge";
import { WhatsAppQuickChat } from "@/components/shared/WhatsAppQuickChat";
import { Skeleton } from "@/hrms/components/ui/skeleton";
import { Button } from "@/hrms/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/hrms/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/hrms/components/ui/tabs";
import { ScrollArea } from "@/hrms/components/ui/scroll-area";
import {
  UserCheck,
  MapPin,
  MapPinOff,
  CalendarDays,
  Receipt,
  Camera,
  Map as MapIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Navigation,
  ShieldCheck,
  Target,
  TrendingUp,
  Percent,
  ArrowUpRight,
  IndianRupee,
  MoreVertical,
  Filter,
  Search,
  AlertCircle,
  User as UserIcon,
  UserX,
  Wallet,
  Landmark,
  Phone,
  ChevronLeft,
  ChevronRight,
  Users,
  Timer,
  Activity,
  Battery,
  Wifi,
  Lock,
  Unlock,
  RefreshCw,
  ExternalLink,
  Signal,
  Zap,
  Circle,
  RadioTower,
  Crosshair,
  Route,
  Eye,
  TrendingDown,
  Award,
  AlertTriangle,
} from "lucide-react";
import {
  format,
  isAfter,
} from "date-fns";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { Input } from "@/hrms/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/hrms/components/ui/dropdown-menu";
import { employeeApi, storeApi } from "@/hrms/services/api";
import { apiClient } from "@/hrms/services/apiClient";
import { staffService } from "@/hrms/services/staffService";
import type { LeaveRequest, EmployeeExpense, User } from "@/hrms/types";
import { Progress } from "@/hrms/components/ui/progress";
import { DataTable } from "@/hrms/components/common/DataTable";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { cn } from "@/hrms/lib/utils";
import { TrackingMap } from "@/hrms/components/staff/TrackingMap";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/hrms/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/hrms/components/ui/popover";
import { Calendar } from "@/hrms/components/ui/calendar";
import { realtimeService } from "@/hrms/services/RealtimeService";
import { toast } from "@/hrms/components/ui/use-toast";

// ─── Tiny helpers ────────────────────────────────────────────────────────────

const safeFormat = (date: any, fmt: string) => {
  if (!date) return "N/A";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return format(d, fmt);
  } catch {
    return "—";
  }
};

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

const statusColor = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === "present") return "emerald";
  if (s === "late") return "amber";
  if (s === "absent") return "red";
  if (s === "approved") return "emerald";
  if (s === "rejected") return "red";
  if (s === "pending") return "amber";
  if (s === "paid") return "emerald";
  return "slate";
};

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  gradient: string;
  delta?: string;
  deltaUp?: boolean;
}

const StatCard = ({ icon: Icon, label, value, gradient, delta, deltaUp }: StatCardProps) => (
  <Card className="relative overflow-hidden border border-white/60 bg-inherit backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 group">
    <div className={`absolute inset-0 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity ${gradient}`} />
    <CardContent className="p-4 flex items-center gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${gradient}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase truncate">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{value}</p>
          {delta && (
            <span className={`text-[10px] font-semibold ${deltaUp ? "text-emerald-500" : "text-red-400"}`}>
              {deltaUp ? "↑" : "↓"} {delta}
            </span>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── Personnel Card (sidebar item) ──────────────────────────────────────────

interface PersonnelCardProps {
  emp: any;
  loc: any;
  isActive: boolean;
  isLive: boolean;
  onClick: () => void;
  isPathLoading: boolean;
}

const PersonnelCard = ({ emp, loc, isActive, isLive, onClick, isPathLoading }: PersonnelCardProps) => {
  const roleLabel = typeof emp.role === "string" ? emp.role : emp.role?.label || "Staff";
  const isSales = roleLabel.toLowerCase().includes("sales");
  const initials = emp.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") || "E";
  const lastSeen = loc ? safeFormat(loc.trackedAt, "HH:mm") : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left group flex items-center gap-3 p-3 rounded-2xl border transition-all duration-150",
        isActive
          ? "bg-indigo-50 border-indigo-200 shadow-sm"
          : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold overflow-hidden border-2",
          isActive ? "border-indigo-200" : "border-slate-100"
        )}>
          {emp.avatar ? (
            <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
          ) : (
            <div className={cn("w-full h-full flex items-center justify-center text-white text-xs font-bold",
              isActive ? "bg-indigo-500" : "bg-slate-400"
            )}>
              {initials}
            </div>
          )}
        </div>
        {loc && (
          <span className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white",
            isLive ? "bg-emerald-400 animate-pulse" : "bg-slate-300"
          )} />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className={cn("text-sm font-semibold truncate", isActive ? "text-indigo-700" : "text-slate-700")}>
            {emp.name}
          </p>
          {isSales && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-md">Sales</span>
          )}
        </div>
        <p className={cn("text-[11px] font-medium truncate", isActive ? "text-indigo-500" : "text-slate-400")}>
          {loc ? (isLive ? "● Live now" : `Last seen ${lastSeen}`) : "Offline"}
        </p>
      </div>

      {/* Status icon */}
      <div className="shrink-0">
        {isPathLoading && isActive ? (
          <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin" />
        ) : loc ? (
          <Navigation className={cn("h-4 w-4 transition-colors", isActive ? "text-indigo-500" : "text-slate-300 group-hover:text-slate-400")} />
        ) : (
          <Signal className="h-4 w-4 text-slate-200" />
        )}
      </div>
    </button>
  );
};

// ─── Tracking Info Pill ──────────────────────────────────────────────────────

const InfoPill = ({ icon: Icon, label, value, color = "slate" }: { icon: React.ElementType; label: string; value: string; color?: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">{label}</span>
    <div className="flex items-center gap-1">
      <Icon className={`h-3.5 w-3.5 text-${color}-500`} />
      <span className="text-[11px] font-bold text-slate-700">{value}</span>
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const EmployeePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission, user } = useAuth();

  // Data state
  const [employees, setEmployees] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<EmployeeExpense[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [stores, setStores] = useState<any[]>([]);
  const [viewingAttendance, setViewingAttendance] = useState<any>(null);
  const [resolvedAddresses, setResolvedAddresses] = useState<Record<string, string>>({});
  const [pendingRegularizations, setPendingRegularizations] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);

  // Tracking state
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [trackingSearchQuery, setTrackingSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pathPoints, setPathPoints] = useState<any[]>([]);
  const [displayPath, setDisplayPath] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [showPath, setShowPath] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [isPathLoading, setIsPathLoading] = useState(false);
  const [isMapInteractionEnabled, setIsMapInteractionEnabled] = useState(false);
  const [activePersonnelId, setActivePersonnelId] = useState<string | null>(null);

  // Filter state
  const [expenseStatusFilter, setExpenseStatusFilter] = useState("all");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("all");

  // Server-side pagination for the Daily Attendance Record table
  const [attCurrentPage, setAttCurrentPage] = useState(1);
  const attPageSize = 25;
  const [attTotalCount, setAttTotalCount] = useState(0);

  // ─── API helpers ─────────────────────────────────────────────────────────

  const fetchLocations = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await employeeApi.getLatestLocations();
      const data = Array.isArray(res) ? res : (res?.data ?? []);
      setLocations(data);
      setSelectedLocation((current: any) => {
        if (!current) return current;
        const cId = current.userId || current.employeeId || current._id || current.employee?._id;
        const updated = data.find((l: any) =>
          l && (l.userId === cId || l.employeeId === cId || l.employee?._id === cId || l._id === cId)
        );
        return updated || current;
      });
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    } finally {
      if (manual) setIsRefreshing(false);
    }
  }, []);

  // ─── Resolve missing addresses when attendance detail modal opens ────────
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
        const a = data?.address || {};
        const parts = [
          a.road || a.amenity || a.building || a.neighbourhood,
          a.suburb || a.quarter,
          a.city || a.town || a.village,
          a.state,
        ].filter(Boolean);
        const addr = parts.length >= 2 ? parts.join(", ") : data?.display_name;
        if (addr) setResolvedAddresses(prev => ({ ...prev, [cacheKey]: addr }));
      } catch { /* non-fatal */ }
    };

    const locations = [
      viewingAttendance.punchIn?.location,
      viewingAttendance.punchOut?.location,
      viewingAttendance.lunchIn?.location,
      viewingAttendance.lunchOut?.location,
      ...(viewingAttendance.sessions || []).flatMap((s: any) => [s.punchIn?.location, s.punchOut?.location]),
    ];

    locations.forEach(loc => {
      if (loc?.lat && loc?.lng) {
        resolveAddr(loc.lat, loc.lng);
      }
    });
  }, [viewingAttendance]);

  // ─── Realtime ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    const role = typeof user.role === "string" ? user.role : user?.role?.role;
    if (role !== "admin" && role !== "super_admin") return;

    realtimeService.init(user.token || "");
    const storeId = typeof user.storeId === "string" ? user.storeId : user.storeId?._id;
    if (storeId) realtimeService.emit("join-room", `store-${storeId}`);
    realtimeService.emit("join-room", "global-tracking");

    let buffer: any[] = [];
    let timer: NodeJS.Timeout | null = null;

    const flush = () => {
      if (!buffer.length) return;
      const currentPersonnelId = (window as any).activePersonnelId;
      
      setLocations((prev) => {
        const next = [...prev];
        buffer.forEach((upd) => {
          const uid = upd.userId || upd.employeeId || upd.employee?._id;
          const idx = next.findIndex((l) =>
            l.userId === uid || l.employeeId === uid || l.employee?._id === uid || l._id === uid
          );
          idx !== -1 ? (next[idx] = { ...next[idx], ...upd }) : next.unshift(upd);
          
          // Real-time path update for active user
          if (uid === currentPersonnelId) {
            setPathPoints(prevPath => {
              const lastPoint = prevPath[prevPath.length - 1];
              const updLat = upd.lat || upd.location?.lat;
              const updLng = upd.lng || upd.location?.lng;
              if (updLat && updLng && (!lastPoint || lastPoint.lat !== updLat || lastPoint.lng !== updLng)) {
                return [...prevPath, {
                  lat: updLat,
                  lng: updLng,
                  timestamp: upd.trackedAt || new Date().toISOString()
                }];
              }
              return prevPath;
            });
          }
        });
        return next;
      });

      setSelectedLocation((cur: any) => {
        if (!cur) return cur;
        const cId = cur.userId || cur.employeeId || cur._id || cur.employee?._id;
        const upd = buffer.find((l) => (l.userId || l.employeeId || l.employee?._id) === cId);
        return upd ? { ...cur, ...upd } : cur;
      });
      buffer = [];
      timer = null;
    };

    realtimeService.on("location_update", (loc: any) => {
      buffer.push(loc);
      if (!timer) timer = setTimeout(flush, 2000);
    });

    return () => { realtimeService.off("location_update"); };
  }, [user]);

  // ─── Initial data fetch ───────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      try {
        const [staff, leavesData, balances, payrollData, expensesData, storesData, regularizations, todayAtt] =
          await Promise.all([
            staffService.getAll(),
            employeeApi.getLeaves(),
            employeeApi.getLeaveBalances(),
            employeeApi.getPayroll({ month: now.getMonth() + 1, year: now.getFullYear() }),
            employeeApi.getExpenses(),
            storeApi.getAll(),
            employeeApi.getRegularizations(),
            employeeApi.getAttendance({ date: todayStr }),
          ]);

        setEmployees(Array.isArray(staff) ? staff : []);
        setLeaves(Array.isArray(leavesData) ? leavesData : []);
        setLeaveBalances(Array.isArray(balances) ? balances : []);
        setPayroll(Array.isArray(payrollData) ? payrollData : []);
        setExpenses(Array.isArray(expensesData) ? expensesData : []);
        setStores(Array.isArray(storesData) ? storesData : (storesData?.data ?? []));
        setPendingRegularizations(Array.isArray(regularizations) ? regularizations : []);
        setTodayAttendance(Array.isArray(todayAtt) ? todayAtt : []);
        fetchLocations();
      } catch {
        toast({ title: "Sync Failed", description: "Could not load all data. Showing cached results.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    load();
    const poll = setInterval(() => {
      fetchLocations();
      employeeApi.getAttendance({ date: new Date().toISOString().split("T")[0] }).then(setTodayAttendance).catch(() => { });
    }, 15000);
    return () => clearInterval(poll);
  }, [fetchLocations]);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await employeeApi.getAttendancePage({
          date: format(selectedMonth, "yyyy-MM-dd"),
          storeId: selectedStore === "all" ? undefined : selectedStore,
          page: attCurrentPage,
          limit: attPageSize,
        });
        setAttendance(res.data);
        setAttTotalCount(res.total);
      } catch { setAttendance([]); setAttTotalCount(0); }
    };
    const fetchPayroll = async () => {
      try {
        const data = await employeeApi.getPayroll({
          month: selectedMonth.getMonth() + 1,
          year: selectedMonth.getFullYear(),
          storeId: selectedStore === "all" ? undefined : selectedStore,
        });
        setPayroll(Array.isArray(data) ? data : []);
      } catch { setPayroll([]); }
    };
    fetchAttendance();
    fetchPayroll();
  }, [selectedMonth, selectedStore, attCurrentPage]);

  // Reset back to page 1 whenever the date/store filter changes.
  useEffect(() => {
    setAttCurrentPage(1);
  }, [selectedMonth, selectedStore]);

  // ─── Derived helpers ──────────────────────────────────────────────────────

  const getEmployeeName = (idOrObj: any): string => {
    if (!idOrObj) return "Staff Member";
    if (typeof idOrObj === "object") return idOrObj.name || "Staff Member";
    if (["system", "admin"].includes(String(idOrObj).toLowerCase())) return "System";
    const emp = employees.find((e) => String((e as any)._id || e.id) === String(idOrObj));
    return emp ? emp.name : "Staff Member";
  };

  const getEmployeeRole = (id: string): string => {
    const emp = employees.find((e) => String((e as any)._id || e.id) === String(id));
    if (!emp) return "Staff";
    return typeof emp.role === "string" ? emp.role : (emp.role as any)?.label || "Staff";
  };

  const absentEmployees = useMemo(() => {
    const presentIds = attendance.filter(Boolean).map((att) => {
      const uid = att.userId && typeof att.userId === "object" ? att.userId._id || att.userId.id : att.userId;
      return String(uid);
    });
    return employees.filter((emp) => {
      const id = String((emp as any)._id || emp.id);
      const role = typeof emp.role === "string" ? emp.role : (emp.role as any)?.role;
      return !presentIds.includes(id) && role !== "admin" && role !== "super_admin";
    });
  }, [employees, attendance]);

  // ─── Tracking handler ─────────────────────────────────────────────────────

  const handleSelectPersonnel = useCallback(async (emp: any, loc: any) => {
    const empId = emp._id || emp.id;
    setActivePersonnelId(empId);
    (window as any).activePersonnelId = empId;
    setShowPath(false);
    setSelectedRoute(null);

    if (loc) {
      setSelectedLocation(loc);
      setSelectedStaff(null);
    } else {
      setSelectedLocation(null);
      setSelectedStaff(emp);
    }

    try {
      setIsPathLoading(true);
      const pathData = await employeeApi.getEmployeePath({ employeeId: empId });
      const points = pathData?.data || pathData || [];
      setStops(pathData?.stops || []);
      setDisplayPath(pathData?.displayPath || []);
      if (points.length > 0) {
        setPathPoints(points);
        setSelectedRoute({
          path: points,
          startTime: points[0]?.timestamp,
          endTime: points[points.length - 1]?.timestamp,
        });
        setShowPath(true);
      } else {
        setPathPoints([]);
        setSelectedRoute(null);
        setShowPath(false);
      }
    } catch {
      setPathPoints([]);
      setStops([]);
      setDisplayPath([]);
    } finally {
      setIsPathLoading(false);
    }
  }, []);

  // ─── Tabs ─────────────────────────────────────────────────────────────────

  const tabs = useMemo(() => [
    { id: "attendance", label: "Attendance", icon: Clock, permission: "view_attendance" },
    { id: "tracking", label: "Live Tracking", icon: RadioTower, permission: "view_live_tracking" },
    { id: "leaves", label: "Leaves", icon: CalendarDays, permission: "view_leaves" },
    { id: "expenses", label: "Expenses", icon: Wallet, permission: "manage_expenses" },
    { id: "targets", label: "Targets", icon: Target, permission: "view_targets" },
    { id: "payroll", label: "Payroll", icon: Landmark, permission: "view_payroll" },
  ], []);

  // Per-tenant override (set on the Tenant document, see Tenant.hidden_hrms_features) —
  // hides the combined Targets/Incentive-Slabs tab for tenants that don't use it.
  const hiddenHrmsFeatures: string[] = (user as any)?.tenant?.hidden_hrms_features || [];
  const targetsTabHidden = hiddenHrmsFeatures.includes("targets") || hiddenHrmsFeatures.includes("incentive_slabs");

  const allowedTabs = useMemo(
    () => tabs.filter((t) => hasPermission(t.permission) && !(t.id === "targets" && targetsTabHidden)),
    [tabs, hasPermission, targetsTabHidden]
  );

  const activeTab = useMemo(() => {
    const p = searchParams.get("tab");
    return p && allowedTabs.some((t) => t.id === p) ? p : allowedTabs[0]?.id || "attendance";
  }, [searchParams, allowedTabs]);

  const handleTabChange = (tab: string) => {
    if (tab === "attendance") {
      setSearchParams((p) => { p.delete("tab"); return p; });
    } else {
      setSearchParams((p) => { p.set("tab", tab); return p; });
    }
  };

  const mockSalesTargets = [
    { id: "TGT-001", employeeId: "USR-002", name: "Rahul Sharma", revenueTarget: 500000, revenueAchieved: 425000, marginTarget: 15, actualMargin: 16.5, productTarget: "20 BLDC Fans", productAchieved: 14, incentive: "0.5%" },
    { id: "TGT-002", employeeId: "USR-003", name: "Priya Patel", revenueTarget: 400000, revenueAchieved: 450000, marginTarget: 15, actualMargin: 14.8, productTarget: "15 Water Heaters", productAchieved: 18, incentive: "1.0%" },
  ];

  if (allowedTabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center p-8">
        <div className="h-20 w-20 rounded-3xl bg-red-50 flex items-center justify-center">
          <ShieldCheck className="h-10 w-10 text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
          <p className="text-slate-500 text-sm max-w-sm">You don't have permission to view this dashboard. Contact your administrator for access.</p>
        </div>
        <Button variant="outline" onClick={() => {
          const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";
          navigate(`${basePath}/staff/attendance`);
        }}>
          <Clock className="mr-2 h-4 w-4" /> My Attendance
        </Button>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50/50 space-y-6 p-1">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">User & Attendance</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage field personnel, attendance, and organizational workflows</p>
        </div>
        {(() => {
          const role = String(typeof user?.role === "string" ? user.role : user?.role?.role || "").toLowerCase();
          if (role === "admin" || role === "super_admin") return null;
          return (
            <Button onClick={() => {
              const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";
              navigate(`${basePath}/staff/attendance`);
            }} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold h-9 px-4 text-sm shadow-sm">
              <Clock className="mr-2 h-4 w-4" /> My Attendance
            </Button>
          );
        })()}
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border border-white/60 bg-inherit shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-10" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            {hasPermission("view_attendance") && <StatCard icon={UserCheck} label={format(selectedMonth, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") ? "Present Today" : `Present (${format(selectedMonth, "dd MMM")})`} value={attendance.length} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />}
            {hasPermission("view_attendance") && <StatCard icon={Clock} label="Late Arrivals" value={2} gradient="bg-gradient-to-br from-amber-400 to-orange-500" />}
            {hasPermission("view_leaves") && <StatCard icon={CalendarDays} label="On Leave" value={leaves.filter((l) => l.status === "Approved").length} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />}
            {hasPermission("manage_expenses") && <StatCard icon={Receipt} label="Exp. Claims" value={expenses.filter((e) => e.status === "Pending").length} gradient="bg-gradient-to-br from-purple-500 to-violet-600" />}
            {hasPermission("view_attendance") && <StatCard icon={AlertCircle} label="Missing Punch" value={2} gradient="bg-gradient-to-br from-red-500 to-rose-600" />}
          </>
        )}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="border-b border-slate-200">
          <TabsList className="bg-transparent p-0 h-auto gap-0 rounded-none">
            {allowedTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-none border-b-2 transition-all",
                  "text-slate-500 border-transparent",
                  "data-[state=active]:text-indigo-600 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent"
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ════════════════════════════════════
            ATTENDANCE TAB
        ════════════════════════════════════ */}
        {hasPermission("view_attendance") && (
          <TabsContent value="attendance" className="mt-6 space-y-6">
            <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden [&>.space-y-4>div]:rounded-none [&>.space-y-4>div]:border-0 [&>.space-y-4>div]:shadow-none">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <CardTitle className="text-base font-semibold text-slate-700">Daily Attendance Record</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        placeholder="Search employee..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-48 h-8 text-xs bg-white border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="flex items-center gap-1 border border-slate-200 rounded-lg bg-white p-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => { const d = new Date(selectedMonth); d.setDate(d.getDate() - 1); setSelectedMonth(d); }}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
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
                        className="h-7 px-1 text-[11px] font-semibold text-slate-600 bg-transparent border-0 focus:outline-none cursor-pointer w-[110px]"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" disabled={isAfter(selectedMonth, new Date())} onClick={() => { const d = new Date(selectedMonth); d.setDate(d.getDate() + 1); setSelectedMonth(d); }}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <select
                      value={selectedStore}
                      onChange={(e) => setSelectedStore(e.target.value)}
                      className="h-8 px-2.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    >
                      <option value="all">All Stores</option>
                      {stores.map((s) => <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <DataTable
                data={attendance.filter((att) => {
                  if (!att) return false;
                  const uid = att.userId?.id || att.userId?._id || att.userId || att.employeeId;
                  const uObj = att.userId && typeof att.userId === "object" ? att.userId : att.employee && typeof att.employee === "object" ? att.employee : null;
                  const name = (uObj?.name || att.employeeName || att.userName || getEmployeeName(uid)).toLowerCase();
                  return name.includes(searchQuery.toLowerCase());
                })}
                isLoading={isLoading}
                totalItems={attTotalCount}
                currentPage={attCurrentPage}
                onPageChange={setAttCurrentPage}
                pageSize={attPageSize}
                columns={[
                  {
                    header: "Employee",
                    accessorKey: (att: any) => {
                      const uid = att.userId?.id || att.userId?._id || att.userId || att.employeeId;
                      const uObj = att.userId && typeof att.userId === "object" ? att.userId : att.employee && typeof att.employee === "object" ? att.employee : null;
                      const name = uObj?.name || att.employeeName || getEmployeeName(uid);
                      const role = uObj?.role?.label || uObj?.role?.role || uObj?.role || getEmployeeRole(uid);
                      return (
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{role}</p>
                        </div>
                      );
                    },
                  },
                  {
                    header: "Date",
                    accessorKey: (att: any) => <span className="text-sm font-medium text-slate-600">{safeFormat(att.date, "dd MMM yyyy")}</span>,
                  },
                  {
                    header: "Store",
                    accessorKey: (att: any) => {
                      const store = att.storeId || (att.userId && typeof att.userId === "object" ? att.userId.storeId : null);
                      return <Badge variant="outline" className="text-[10px] font-medium border-indigo-200 text-indigo-600 bg-indigo-50">{store?.name || "Main Store"}</Badge>;
                    },
                  },
                  {
                    header: "Shift",
                    accessorKey: (att: any) => {
                      const punchInTime  = fmtTime(att.punchIn?.time  || att.punchIn);
                      const punchOutTime = fmtTime(att.punchOut?.time || att.punchOut);
                      const lunchInTime  = fmtTime(att.lunchIn?.time  || att.lunchIn);
                      const lunchOutTime = fmtTime(att.lunchOut?.time || att.lunchOut);
                      return (
                        <div className="space-y-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1">
                            <Badge variant="outline" className="text-[10px] font-medium bg-emerald-50 text-emerald-600 border-emerald-100 justify-center">
                              ↑ {punchInTime || "--:--"}
                            </Badge>
                            <Badge variant="outline" className={cn("text-[10px] font-medium justify-center", att.autoPunchOut ? "bg-red-50 text-red-600 border-red-200" : punchOutTime ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-400 border-slate-100")}>
                              ↓ {punchOutTime || "On Duty"}
                            </Badge>
                            <Badge variant="outline" className={cn("text-[10px] font-medium justify-center", lunchInTime ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-50 text-slate-300 border-slate-100")}>
                              🍽 {lunchInTime || "--:--"}
                            </Badge>
                            <Badge variant="outline" className={cn("text-[10px] font-medium justify-center", lunchOutTime ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-slate-50 text-slate-300 border-slate-100")}>
                              ↩ {lunchOutTime || "--:--"}
                            </Badge>
                          </div>
                          {att.autoPunchOut && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 border border-red-100">
                              <MapPinOff className="h-3 w-3 text-red-500 shrink-0" />
                              <span className="text-[9px] font-bold text-red-600 uppercase tracking-wide">Auto Punch-Out</span>
                              {att.calculatedDistance && (
                                <span className="text-[9px] text-red-400 ml-auto">{(att.calculatedDistance / 1000).toFixed(1)} km</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    header: "Selfie",
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
                    header: "Status",
                    accessorKey: (att: any) => {
                      const c = statusColor(att.status);
                      return (
                        <div className="flex flex-col gap-1 items-start">
                          <Badge className={`text-[10px] font-semibold border-0 bg-${c}-100 text-${c}-700`}>
                            {att.status}
                          </Badge>
                          {att.autoPunchOut && (
                            <Badge className="text-[9px] font-bold border-0 bg-red-100 text-red-600 gap-0.5">
                              <MapPinOff className="h-2.5 w-2.5" /> Geo Exit
                            </Badge>
                          )}
                          {att.geoFenceViolation && !att.autoPunchOut && (
                            <Badge className="text-[9px] font-bold border-0 bg-orange-100 text-orange-600">
                              ⚠ Geo Violation
                            </Badge>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    header: "",
                    id: "actions",
                    accessorKey: (att: any) => (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl shadow-lg border-slate-100">
                          <DropdownMenuItem className="text-xs font-medium" onClick={() => setViewingAttendance(att)}>View Details</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs font-medium">Approve Correction</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs font-medium text-red-500">Mark Absent</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ),
                  },
                ]}
              />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Pending Regularizations */}
              <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
                <CardHeader className="py-4 border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Pending Regularizations
                    {pendingRegularizations.length > 0 && (
                      <Badge className="ml-auto bg-amber-100 text-amber-700 border-0 text-[10px] font-bold">{pendingRegularizations.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-20" /></div>
                            <Skeleton className="h-5 w-20 rounded-full" />
                          </div>
                          <Skeleton className="h-8 w-full rounded-lg" />
                          <div className="flex gap-2"><Skeleton className="h-8 flex-1 rounded-lg" /><Skeleton className="h-8 flex-1 rounded-lg" /></div>
                        </div>
                      ))
                    ) : pendingRegularizations.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">No pending requests</div>
                    ) : pendingRegularizations.map((reg: any) => (
                      <div key={reg._id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{reg.userId?.name || "Staff"}</p>
                            <p className="text-[11px] text-slate-400">{safeFormat(reg.date, "dd MMM yyyy")}</p>
                          </div>
                          <Badge className="bg-amber-50 text-amber-600 border-0 text-[10px]">Correction</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 italic mb-3 bg-slate-50 p-2 rounded-lg">"{reg.regularizationReason || "No reason provided"}"</p>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 h-8 text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                            onClick={() => employeeApi.approveRegularization(reg._id).then(() => {
                              setPendingRegularizations((p) => p.filter((r) => r._id !== reg._id));
                              toast({ title: "Approved", description: "Attendance regularized." });
                            })}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px] text-red-500 border-red-200 hover:bg-red-50 rounded-lg"
                            onClick={() => employeeApi.rejectRegularization(reg._id).then(() => {
                              setPendingRegularizations((p) => p.filter((r) => r._id !== reg._id));
                              toast({ title: "Rejected" });
                            })}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Absent On Date */}
              <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
                <CardHeader className="py-4 border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-500">
                    <UserX className="w-4 h-4" />
                    {format(selectedMonth, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") ? "Absent Today" : `Absent (${format(selectedMonth, "dd MMM")})`}
                    {absentEmployees.length > 0 && (
                      <Badge className="ml-auto bg-red-100 text-red-500 border-0 text-[10px] font-bold">{absentEmployees.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 max-h-72 overflow-y-auto">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                          <div className="space-y-1.5"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3 w-20" /></div>
                        </div>
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
                    ))
                  ) : absentEmployees.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">All staff present today</div>
                  ) : absentEmployees.map((emp: any) => (
                    <div key={emp._id || emp.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200">
                          {emp.avatar ? <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" /> : <UserIcon className="w-4 h-4 text-slate-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{emp.name}</p>
                          {emp.mobile ? (
                            <WhatsAppQuickChat phone={emp.mobile} data={{ customer_name: emp.name }} />
                          ) : (
                            <p className="text-[10px] text-slate-400">No contact</p>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-lg border-slate-200 hover:bg-slate-50"
                        onClick={() => window.open(`tel:${emp.mobile}`, "_self")}>
                        <Phone className="h-3.5 w-3.5 text-slate-500" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* ════════════════════════════════════
            LIVE TRACKING TAB — Redesigned
        ════════════════════════════════════ */}
        {hasPermission("view_live_tracking") && (
          <TabsContent value="tracking" className="mt-6">
            <div className="flex flex-col gap-4">

              {/* ── Top bar with summary stats ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Live Now", value: locations.filter(l => l && (new Date().getTime() - new Date(l.trackedAt).getTime()) < 600000).length, icon: Zap, color: "emerald" },
                  { label: "Offline", value: employees.length - locations.filter(l => l && (new Date().getTime() - new Date(l.trackedAt).getTime()) < 600000).length, icon: Signal, color: "slate" },
                  { label: "Tracking Points", value: pathPoints.length || 0, icon: Route, color: "indigo" },
                  { label: "Field Staff", value: employees.filter(e => { const r = typeof e.role === "string" ? e.role : (e.role as any)?.role || ""; return r.includes("sales") || r.includes("field"); }).length, icon: Users, color: "blue" },
                ].map((s) => (
                  <div key={s.label} className={`flex items-center gap-3 p-3 rounded-2xl bg-${s.color}-50 border border-${s.color}-100`}>
                    <div className={`h-8 w-8 rounded-xl bg-${s.color}-100 flex items-center justify-center`}>
                      <s.icon className={`h-4 w-4 text-${s.color}-600`} />
                    </div>
                    <div>
                      <p className={`text-lg font-bold text-${s.color}-700 tabular-nums`}>{s.value}</p>
                      <p className={`text-[10px] font-medium text-${s.color}-500`}>{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Main tracking panel ── */}
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-col lg:flex-row h-auto lg:h-[680px]">

                  {/* ── LEFT: Personnel Sidebar ── */}
                  <div className="lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col h-64 lg:h-full bg-slate-50/60">
                    {/* Sidebar Header */}
                    <div className="p-4 border-b border-slate-100 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Users className="h-4 w-4 text-indigo-500" />
                          Field Personnel
                        </h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn("h-7 w-7 p-0 rounded-lg", isRefreshing && "animate-spin")}
                          onClick={() => fetchLocations(true)}
                          title="Refresh"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                        </Button>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          placeholder="Search personnel..."
                          className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 rounded-xl"
                          value={trackingSearchQuery}
                          onChange={(e) => setTrackingSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Personnel List */}
                    <ScrollArea className="flex-1">
                      <div className="p-3 space-y-1.5">
                        {isLoading ? (
                          Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white">
                              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-3.5 w-28" />
                                <Skeleton className="h-3 w-20" />
                              </div>
                              <Skeleton className="h-4 w-4 rounded" />
                            </div>
                          ))
                        ) : employees
                          .filter((e) => e.name.toLowerCase().includes(trackingSearchQuery.toLowerCase()))
                          .sort((a, b) => {
                            const aId = (a as any)._id || a.id;
                            const bId = (b as any)._id || b.id;
                            const aLoc = locations.find((l) => l && (l.userId === aId || l.employeeId === aId));
                            const bLoc = locations.find((l) => l && (l.userId === bId || l.employeeId === bId));
                            if (aLoc && !bLoc) return -1;
                            if (!aLoc && bLoc) return 1;
                            return 0;
                          })
                          .map((emp: any) => {
                            const empId = emp._id || emp.id;
                            const loc = locations.find((l) => l && (l.employeeId === empId || l.employee?._id === empId || l.userId === empId));
                            const isActive = activePersonnelId === empId;
                            const isLive = loc && (new Date().getTime() - new Date(loc.trackedAt).getTime()) < 600000;
                            return (
                              <PersonnelCard
                                key={empId}
                                emp={emp}
                                loc={loc}
                                isActive={isActive}
                                isLive={!!isLive}
                                isPathLoading={isPathLoading}
                                onClick={() => handleSelectPersonnel(emp, loc)}
                              />
                            );
                          })}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* ── RIGHT: Map Panel ── */}
                  <div className="flex-1 flex flex-col h-[450px] lg:h-full relative">

                    {/* Map Toolbar */}
                    <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {selectedLocation || selectedStaff ? (
                          <>
                            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                              {selectedLocation ? <Navigation className="h-4 w-4 text-white" /> : <MapPinOff className="h-4 w-4 text-white" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">
                                {selectedLocation?.employee?.name || selectedStaff?.name || "Unknown"}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {selectedLocation?.location?.address || (selectedStaff ? "GPS signal unavailable" : "")}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                              <Crosshair className="h-4 w-4 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-600">Live Tracking Console</p>
                              <p className="text-[11px] text-slate-400">Select a personnel to track</p>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {showPath && pathPoints.length > 0 && (
                          <Badge className="bg-indigo-50 text-indigo-600 border-0 text-[10px] font-semibold gap-1">
                            <Route className="h-3 w-3" />
                            {pathPoints.length} points
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant={isMapInteractionEnabled ? "default" : "outline"}
                          className={cn("h-8 gap-1.5 px-3 rounded-xl text-[11px] font-semibold",
                            isMapInteractionEnabled ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" : "border-slate-200 text-slate-600"
                          )}
                          onClick={() => setIsMapInteractionEnabled((p) => !p)}
                        >
                          {isMapInteractionEnabled ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          {isMapInteractionEnabled ? "Locked" : "Interact"}
                        </Button>
                        {selectedLocation && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-xl border-slate-200"
                            onClick={() => window.open(`https://www.google.com/maps?q=${selectedLocation.location?.lat},${selectedLocation.location?.lng}`, "_blank")}
                            title="Open in Google Maps"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Map */}
                    <div className="flex-1 relative overflow-hidden bg-slate-100">
                      <TrackingMap
                        locations={locations}
                        selectedLocation={selectedLocation}
                        pathPoints={pathPoints}
                        displayPath={displayPath}
                        stops={stops}
                        showPath={showPath}
                        isMapInteractionEnabled={isMapInteractionEnabled}
                        activePersonnelId={activePersonnelId}
                        onMarkerClick={(loc: any) => {
                          setSelectedLocation(loc);
                          setSelectedStaff(null);
                          setShowPath(false);
                          const eId = loc.employeeId || loc.userId || loc.employee?._id;
                          setActivePersonnelId(eId);
                        }}
                      />

                      {/* Empty State Overlay */}
                      {!selectedLocation && !selectedStaff && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm pointer-events-none">
                          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center max-w-xs pointer-events-auto">
                            <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                              <RadioTower className="h-8 w-8 text-indigo-400" />
                            </div>
                            <h3 className="text-base font-bold text-slate-700 mb-1">Live Tracking Console</h3>
                            <p className="text-[12px] text-slate-400 leading-relaxed">
                              Select a personnel from the directory to begin real-time GPS tracking.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* No Signal State */}
                      {selectedStaff && !selectedLocation && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm pointer-events-none">
                          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center max-w-xs">
                            <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                              <MapPinOff className="h-8 w-8 text-red-400" />
                            </div>
                            <h3 className="text-base font-bold text-slate-700 mb-1">Signal Unavailable</h3>
                            <p className="text-[12px] text-slate-400 leading-relaxed">
                              GPS signal for <span className="font-semibold text-slate-600">{selectedStaff.name}</span> is offline or location tracking is disabled.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Live Data Overlay (bottom-left) */}
                      {selectedLocation && (
                        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-80">
                          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-100 shadow-xl p-4">
                            {/* Header row */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Live Signal</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {showPath && (
                                  <Badge className="bg-indigo-50 text-indigo-600 border-0 text-[9px] font-bold">
                                    Path Mode
                                  </Badge>
                                )}
                                <Badge className={cn("border-0 text-[9px] font-bold",
                                  (selectedLocation?.location?.batteryLevel || 0) < 20
                                    ? "bg-red-50 text-red-500"
                                    : "bg-emerald-50 text-emerald-600"
                                )}>
                                  <Battery className="h-2.5 w-2.5 mr-1" />
                                  {selectedLocation?.location?.batteryLevel || 0}%
                                </Badge>
                              </div>
                            </div>

                            {/* Stats grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                              <InfoPill icon={Wifi} label="Signal" value="Strong" color="emerald" />
                              <InfoPill icon={Activity} label="Speed" value={`${(selectedLocation?.location?.speed || 0).toFixed(1)} km/h`} color="indigo" />
                              <InfoPill icon={Crosshair} label="Accuracy" value={`±${selectedLocation?.location?.accuracy || 0}m`} color="blue" />
                            </div>

                            {/* Last update */}
                            <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-slate-300" />
                                <span className="text-[10px] text-slate-400">Updated {safeFormat(selectedLocation?.trackedAt, "HH:mm:ss")}</span>
                              </div>
                              {pathPoints.length > 0 && (
                                <span className="text-[10px] font-semibold text-indigo-500">{pathPoints.length} path pts</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Path loading indicator */}
                      {isPathLoading && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2">
                          <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-slate-100 flex items-center gap-2">
                            <RefreshCw className="h-3.5 w-3.5 text-indigo-500 animate-spin" />
                            <span className="text-[11px] font-semibold text-slate-600">Loading route...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        {/* ════════════════════════════════════
            LEAVES TAB
        ════════════════════════════════════ */}
        {hasPermission("view_leaves") && (
          <TabsContent value="leaves" className="mt-6">
            <div className="grid md:grid-cols-3 gap-5">
              <Card className="border border-slate-200 bg-white shadow-sm md:col-span-2 overflow-hidden">
                <CardHeader className="py-4 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base font-semibold text-slate-700">Leave Requests</CardTitle>
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">{leaves.filter((l) => l.status === "Pending").length} Pending</Badge>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 w-40 text-xs bg-slate-50 border-slate-200 rounded-lg" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs border-slate-200 rounded-lg", leaveStatusFilter !== "all" && "border-indigo-200 bg-indigo-50 text-indigo-600")}>
                            <Filter className="h-3.5 w-3.5" />
                            {leaveStatusFilter === "all" ? "Filter" : leaveStatusFilter}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                          {["all", "Pending", "Approved", "Rejected"].map((s) => (
                            <DropdownMenuItem key={s} className="text-xs font-medium" onClick={() => setLeaveStatusFilter(s)}>
                              {s === "all" ? "All Requests" : s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 rounded-2xl border border-slate-100 space-y-3">
                        <div className="flex justify-between"><Skeleton className="h-4 w-32" /><Skeleton className="h-6 w-20 rounded-full" /></div>
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-8 w-full rounded-lg" />
                      </div>
                    ))
                  ) : leaves
                    .filter((lv) => {
                      if (!lv) return false;
                      const name = getEmployeeName(lv.employeeId).toLowerCase();
                      const matchSearch = name.includes(searchQuery.toLowerCase()) || (lv.reason || "").toLowerCase().includes(searchQuery.toLowerCase());
                      const matchStatus = leaveStatusFilter === "all" || lv.status.toLowerCase() === leaveStatusFilter.toLowerCase();
                      return matchSearch && matchStatus;
                    })
                    .map((lv: any) => {
                      const c = statusColor(lv.status);
                      return (
                        <div key={lv._id || lv.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-700">{lv.employeeId?.name || getEmployeeName(lv.employeeId)}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                <span className="text-indigo-500 font-medium">{lv.leaveTypeId?.name || lv.type} Leave</span>
                                {" · "}
                                {lv.fromDate || lv.startDate ? format(new Date(lv.fromDate || lv.startDate), "dd MMM") : "—"} → {lv.toDate || lv.endDate ? format(new Date(lv.toDate || lv.endDate), "dd MMM yyyy") : "—"}
                              </p>
                            </div>
                            <Badge className={`shrink-0 text-[10px] font-semibold border-0 bg-${c}-100 text-${c}-700`}>
                              {lv.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500 italic bg-white border border-slate-100 rounded-lg px-3 py-2">
                            "{lv.reason}"
                          </p>
                          {hasPermission("manage_leaves") && lv.status.toLowerCase() === "pending" && (
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" className="flex-1 h-8 text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                                onClick={() => employeeApi.approveLeave(lv._id || lv.id).then(() => {
                                  setLeaves((p) => p.map((l) => ((l._id === lv._id || l.id === lv.id) ? { ...l, status: "Approved" } : l)));
                                  toast({ title: "Approved" });
                                })}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px] text-red-500 border-red-200 hover:bg-red-50 rounded-lg"
                                onClick={() => employeeApi.rejectLeave(lv._id || lv.id).then(() => {
                                  setLeaves((p) => p.map((l) => ((l._id === lv._id || l.id === lv.id) ? { ...l, status: "Rejected" } : l)));
                                  toast({ title: "Rejected" });
                                })}>
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </CardContent>
              </Card>

              <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden h-fit">
                <CardHeader className="py-4 border-b border-slate-100">
                  <CardTitle className="text-base font-semibold text-slate-700">Leave Balances</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {leaveBalances.length > 0 ? leaveBalances.map((bal: any, idx: number) => {
                    const remaining = (bal.totalAllocated || 0) + (bal.carriedForward || 0) - (bal.used || 0) - (bal.pending || 0);
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
                        <p className="text-[10px] text-slate-400 mt-1.5">Used {bal.used} of {bal.totalAllocated} days</p>
                      </div>
                    );
                  }) : (
                    <p className="text-sm text-slate-400 text-center py-6">No balances configured.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* ════════════════════════════════════
            EXPENSES TAB
        ════════════════════════════════════ */}
        {hasPermission("manage_expenses") && (
          <TabsContent value="expenses" className="mt-6">
            <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
              <CardHeader className="py-4 border-b border-slate-100">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-base font-semibold text-slate-700">Expense Claims</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 w-44 text-xs bg-slate-50 border-slate-200 rounded-lg" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs border-slate-200 rounded-lg", expenseStatusFilter !== "all" && "border-indigo-200 bg-indigo-50 text-indigo-600")}>
                          <Filter className="h-3.5 w-3.5" />
                          {expenseStatusFilter === "all" ? "Filter" : expenseStatusFilter}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                        {["all", "Pending", "Approved", "Paid", "Rejected"].map((s) => (
                          <DropdownMenuItem key={s} className="text-xs font-medium" onClick={() => setExpenseStatusFilter(s)}>
                            {s === "all" ? "All Status" : s}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /></div>
                      <Skeleton className="h-6 w-16 rounded-lg" />
                    </div>
                  ))
                ) : expenses
                  .filter((exp) => {
                    if (!exp) return false;
                    const name = getEmployeeName((exp as any).createdBy || exp.employeeId);
                    const matchSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase()) || name.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchStatus = expenseStatusFilter === "all" || exp.status.toLowerCase() === expenseStatusFilter.toLowerCase();
                    return matchSearch && matchStatus;
                  })
                  .map((exp) => {
                    const c = statusColor(exp.status);
                    return (
                      <div key={exp._id || exp.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center gap-4 hover:bg-white hover:border-slate-200 transition-all">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                          <Receipt className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">{exp.description}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {getEmployeeName((exp as any).createdBy || exp.employeeId)} · {exp.date && !isNaN(new Date(exp.date).getTime()) ? format(new Date(exp.date), "dd MMM yyyy") : "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-700">₹{exp.amount.toLocaleString("en-IN")}</p>
                            <Badge className={`mt-0.5 text-[9px] font-bold border-0 bg-${c}-100 text-${c}-700`}>{exp.status}</Badge>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg"><MoreVertical className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                              <DropdownMenuItem className="text-xs font-medium" onClick={() => exp.receiptUrl && window.open(exp.receiptUrl, "_blank")} disabled={!exp.receiptUrl}>View Receipt</DropdownMenuItem>
                              {hasPermission("manage_expenses") && exp.status === "Pending" && (
                                <>
                                  <DropdownMenuItem className="text-xs font-medium text-emerald-600" onClick={() => employeeApi.approveExpense(exp._id || exp.id).then(() => { setExpenses((p) => p.map((e) => ((e._id === exp._id || e.id === exp.id) ? { ...e, status: "Approved" } : e))); toast({ title: "Approved" }); })}>Approve</DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs font-medium text-red-500" onClick={() => employeeApi.rejectExpense(exp._id || exp.id).then(() => { setExpenses((p) => p.map((e) => ((e._id === exp._id || e.id === exp.id) ? { ...e, status: "Rejected" } : e))); toast({ title: "Rejected" }); })}>Reject</DropdownMenuItem>
                                </>
                              )}
                              {hasPermission("manage_expenses") && exp.status.toLowerCase() === "approved" && (
                                <DropdownMenuItem className="text-xs font-medium text-blue-600" onClick={() => employeeApi.payExpense(exp._id || exp.id).then(() => { setExpenses((p) => p.map((e) => ((e._id === exp._id || e.id === exp.id) ? { ...e, status: "Paid" } : e))); toast({ title: "Paid" }); })}>Mark as Paid</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ════════════════════════════════════
            TARGETS TAB
        ════════════════════════════════════ */}
        {hasPermission("view_targets") && !targetsTabHidden && (
          <TabsContent value="targets" className="mt-6 space-y-5">
            <div className="grid lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden [&>.space-y-4>div]:rounded-none [&>.space-y-4>div]:border-0 [&>.space-y-4>div]:shadow-none">
                  <CardHeader className="py-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                          <Target className="h-4 w-4 text-indigo-500" />
                          Sales Target Tracking
                        </CardTitle>
                        <CardDescription className="text-[11px] text-slate-400 mt-0.5">Monthly performance against revenue & product targets</CardDescription>
                      </div>
                      {hasPermission("manage_targets") && (
                        <Button size="sm" className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-sm">
                          Set Target
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <DataTable
                    data={mockSalesTargets}
                    columns={[
                      {
                        header: "Salesperson",
                        accessorKey: (t: any) => (
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{t.name}</p>
                            <p className="text-[10px] text-slate-400">{t.employeeId}</p>
                          </div>
                        ),
                      },
                      {
                        header: "Revenue",
                        accessorKey: (t: any) => {
                          const pct = (t.revenueAchieved / t.revenueTarget) * 100;
                          return (
                            <div className="w-48 space-y-1.5">
                              <div className="flex justify-between text-[11px] font-semibold">
                                <span className="text-slate-600">₹{(t.revenueAchieved / 1000).toFixed(0)}k</span>
                                <span className={pct >= 100 ? "text-emerald-500" : "text-indigo-500"}>{pct.toFixed(0)}%</span>
                              </div>
                              <Progress value={pct} className="h-2 bg-slate-100" />
                              <p className="text-[10px] text-slate-400">Target ₹{(t.revenueTarget / 1000).toFixed(0)}k</p>
                            </div>
                          );
                        },
                      },
                      {
                        header: "Product",
                        accessorKey: (t: any) => (
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                              {t.productAchieved >= parseInt(t.productTarget) ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Clock className="h-3.5 w-3.5 text-amber-400" />}
                              {t.productAchieved}/{t.productTarget.split(" ")[0]}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">{t.productTarget.split(" ").slice(1).join(" ")}</p>
                          </div>
                        ),
                      },
                      {
                        header: "Margin",
                        accessorKey: (t: any) => (
                          <div className="text-center">
                            <p className={cn("text-sm font-bold", t.actualMargin >= t.marginTarget ? "text-emerald-500" : "text-amber-500")}>{t.actualMargin}%</p>
                            <p className="text-[10px] text-slate-400">min {t.marginTarget}%</p>
                          </div>
                        ),
                      },
                      {
                        header: "Incentive",
                        accessorKey: (t: any) => (
                          <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 font-bold text-xs">{t.incentive}</Badge>
                        ),
                      },
                    ]}
                  />
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <CardHeader className="bg-indigo-600 py-5">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Incentive Slabs
                    </CardTitle>
                    <CardDescription className="text-indigo-200 text-[11px] mt-0.5">Performance reward structure</CardDescription>
                  </CardHeader>
                  <div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Achievement</TableHead>
                          <TableHead className="text-center">Rate</TableHead>
                          <TableHead className="text-right">Est. Bonus</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { range: "< 80%", rate: "0%", bonus: "₹0", color: "text-slate-400" },
                          { range: "80–100%", rate: "0.5%", bonus: "₹500", color: "text-blue-500" },
                          { range: "100–120%", rate: "1.0%", bonus: "₹1,000", color: "text-emerald-500" },
                          { range: "> 120%", rate: "1.5%", bonus: "₹1,500", color: "text-emerald-600 font-bold" },
                        ].map((s) => (
                          <TableRow key={s.range}>
                            <TableCell>{s.range}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={cn("text-[10px] font-bold border-slate-200", s.color)}>{s.rate}</Badge>
                            </TableCell>
                            <TableCell className={cn("text-right font-semibold", s.color)}>{s.bonus}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                      <Award className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-400 leading-relaxed">Calculated on ₹1,00,000 target. Applied once threshold is exceeded.</p>
                    </div>
                  </div>
                </Card>

                <Card className="border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white shadow-sm overflow-hidden">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                      <IndianRupee className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">Total Pending Payouts</p>
                      <p className="text-2xl font-bold text-indigo-700">₹12,450</p>
                      <p className="text-[10px] text-indigo-300 mt-0.5">March 2026</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        )}

        {/* ════════════════════════════════════
            PAYROLL TAB
        ════════════════════════════════════ */}
        {hasPermission("view_payroll") && (
          <TabsContent value="payroll" className="mt-6">
            <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden [&>.space-y-4>div]:rounded-none [&>.space-y-4>div]:border-0 [&>.space-y-4>div]:shadow-none">
              <CardHeader className="py-4 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-700">Monthly Payroll Management</CardTitle>
                    <CardDescription className="text-[11px] text-slate-400 mt-0.5">Review and process monthly salaries</CardDescription>
                  </div>
                  {hasPermission("manage_payroll") && (
                    <Button size="sm" className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-sm"
                      onClick={() => {
                        const month = new Date().getMonth() + 1;
                        const year = new Date().getFullYear();
                        const storeId = (employees.find((e) => (e as any).storeId) as any)?.storeId;
                        if (storeId) {
                          employeeApi.generatePayroll({ month, year, storeId }).then((res: any) => {
                            if (res?.success) { setPayroll(res.data); toast({ title: "Payroll generated", description: `${res.count} employees processed.` }); }
                          });
                        } else {
                          toast({ title: "No store found", variant: "destructive" });
                        }
                      }}>
                      Generate Payroll
                    </Button>
                  )}
                </div>
              </CardHeader>
              <DataTable
                data={payroll}
                isLoading={isLoading}
                columns={[
                  {
                    header: "Employee",
                    accessorKey: (row: any) => (
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{row?.employeeId?.name || "N/A"}</p>
                        <p className="text-[10px] text-slate-400">{row?.employeeId?.employeeCode || "—"}</p>
                      </div>
                    ),
                  },
                  {
                    header: "Period",
                    accessorKey: (row: any) => <span className="text-sm font-medium text-slate-600">{row ? `${row.month}/${row.year}` : "—"}</span>,
                  },
                  {
                    header: "Days",
                    accessorKey: (row: any) => (
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">{row?.payableDays}</p>
                        <p className="text-[10px] text-slate-400">Present: {row?.presentDays}</p>
                      </div>
                    ),
                  },
                  {
                    header: "Earnings",
                    accessorKey: (row: any) => (
                      <div className="text-right">
                        <p className="text-sm font-bold text-indigo-600">₹{row?.grossSalary?.toLocaleString("en-IN")}</p>
                        <p className="text-[10px] text-slate-400">Net: ₹{row?.netSalary?.toLocaleString("en-IN")}</p>
                      </div>
                    ),
                  },
                  {
                    header: "Status",
                    accessorKey: (row: any) => {
                      const c = statusColor(row?.status);
                      return <Badge className={`text-[10px] font-semibold border-0 bg-${c}-100 text-${c}-700`}>{row?.status}</Badge>;
                    },
                  },
                  {
                    header: "",
                    id: "actions",
                    accessorKey: (row: any) => (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Receipt className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreVertical className="h-3.5 w-3.5" /></Button>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ── Attendance Detail Modal ── */}
      <Dialog open={!!viewingAttendance} onOpenChange={() => setViewingAttendance(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 shadow-2xl rounded-3xl">
          <DialogHeader className="p-6 bg-indigo-600">
            <div className="flex items-start justify-between gap-4 min-w-0">
              <div className="min-w-0">
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2 truncate">
                  <UserCheck className="h-5 w-5 shrink-0" />
                  <span className="truncate">{viewingAttendance ? getEmployeeName((viewingAttendance.userId && typeof viewingAttendance.userId === "object" ? viewingAttendance.userId._id : viewingAttendance.userId) || viewingAttendance.employeeId) : ""}</span>
                </DialogTitle>
                <DialogDescription className="text-indigo-200 text-xs mt-1">
                  {viewingAttendance ? getEmployeeRole((viewingAttendance.userId && typeof viewingAttendance.userId === "object" ? viewingAttendance.userId._id : viewingAttendance.userId) || viewingAttendance.employeeId) : ""}
                </DialogDescription>
              </div>
              <Badge className="bg-white/20 text-white border-0 text-[10px] font-semibold shrink-0">
                {viewingAttendance?.date ? safeFormat(viewingAttendance.date, "dd MMM yyyy") : ""}
              </Badge>
            </div>
          </DialogHeader>

          {viewingAttendance && (
            <div className="p-6 space-y-6 bg-white">
              {/* Punch In / Punch Out selfies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { key: "punchIn", label: "Punch In", color: "emerald", bgHex: "10b981" },
                  { key: "punchOut", label: "Punch Out", color: "blue", bgHex: "3b82f6" },
                ].map(({ key, label, color, bgHex }) => {
                  const rawSelfie = viewingAttendance[key]?.selfieUrl || (key === "punchIn" ? viewingAttendance.selfieInUrl : viewingAttendance.selfieOutUrl);
                  const selfieUrl = resolveImageUrl(rawSelfie);
                  return (
                    <div key={key} className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <Camera className="h-3 w-3" /> {label}
                      </h4>
                      {viewingAttendance[key]?.time || (key === "punchIn" && viewingAttendance[key]) ? (
                        <div className="flex gap-3">
                          <div className="h-20 w-20 rounded-xl overflow-hidden border border-slate-100 shrink-0">
                            <img
                              src={selfieUrl || `https://ui-avatars.com/api/?name=${label}&background=${bgHex}&color=fff`}
                              className="w-full h-full object-cover"
                              alt=""
                              onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${label}&background=${bgHex}&color=fff`)}
                            />
                          </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-[9px] uppercase font-bold text-slate-400">Time</p>
                            <p className={`text-sm font-bold text-${color}-600`}>{fmtTime(viewingAttendance[key]?.time || viewingAttendance[key]) || "--:--"}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase font-bold text-slate-400">Location</p>
                            <p className="text-[11px] text-slate-600 leading-tight">
                              {viewingAttendance[key]?.location?.lat
                                ? resolvedAddresses[`${Number(viewingAttendance[key].location.lat).toFixed(5)},${Number(viewingAttendance[key].location.lng).toFixed(5)}`] || "Fetching address..."
                                : "Not Recorded"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-20 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">{key === "punchOut" ? "Still On Duty" : "Not Recorded"}</p>
                      </div>
                    )}
                  </div>
                );
                })}
              </div>

              {/* Lunch In / Lunch Out */}
              <div className={cn(
                "grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border",
                viewingAttendance.lunchOverLimit ? "bg-red-50/60 border-red-200" : "bg-amber-50/50 border-amber-100"
              )}>
                {[
                  { key: "lunchIn", label: "Lunch Break Start", color: "amber" },
                  { key: "lunchOut", label: "Lunch Break End", color: "orange" },
                ].map(({ key, label, color }) => (
                  <div key={key} className="text-center">
                    <p className={`text-[9px] uppercase font-bold text-${color}-400 mb-1`}>{label}</p>
                    {viewingAttendance[key]?.time || (typeof viewingAttendance[key] === "string" && viewingAttendance[key]) ? (
                      <p className={`text-base font-bold text-${color}-600`}>
                        {fmtTime(viewingAttendance[key]?.time || viewingAttendance[key]) || "--:--"}
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-slate-300">--:--</p>
                    )}
                  </div>
                ))}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-center">
                  <p className="text-[9px] uppercase font-bold text-slate-400 mb-1.5">Status</p>
                  <Badge className={cn("text-[10px] border-0", statusColor(viewingAttendance.status) === "emerald" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{viewingAttendance.status}</Badge>
                </div>
                <div className="text-center">
                  <p className="text-[9px] uppercase font-bold text-slate-400 mb-1.5">Geo Status</p>
                  {viewingAttendance.autoPunchOut ? (
                    <Badge className="text-[10px] border-0 bg-red-100 text-red-700 gap-1">
                      <MapPinOff className="h-3 w-3" /> Auto Punched Out
                    </Badge>
                  ) : viewingAttendance.geoFenceViolation ? (
                    <Badge className="text-[10px] border-0 bg-orange-100 text-orange-700">⚠ Geo Violation</Badge>
                  ) : viewingAttendance.geoStatus === "inside_geofence" ? (
                    <Badge className="text-[10px] border-0 bg-emerald-100 text-emerald-700">✓ Inside Zone</Badge>
                  ) : (
                    <p className="text-xs font-semibold text-slate-500">—</p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[9px] uppercase font-bold text-slate-400 mb-1.5">Total Hours</p>
                  <p className="text-xs font-semibold text-slate-700">{viewingAttendance.totalHours ? Number(viewingAttendance.totalHours).toFixed(2) : "0.00"} hrs</p>
                </div>
              </div>

              {/* Auto Punch-Out detail banner */}
              {viewingAttendance.autoPunchOut && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
                  <div className="h-8 w-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <MapPinOff className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="min-w-0">
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

export default EmployeePage;
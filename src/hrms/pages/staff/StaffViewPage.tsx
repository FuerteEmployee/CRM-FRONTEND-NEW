import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Users,
  Store,
  Edit2,
  Mail,
  Phone,
  CreditCard,
  Banknote,
  Calendar,
  ArrowLeft,
  FileText as FileIcon,
  Zap,
  X,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Timer,
  TrendingUp,
  AlertCircle,
  LogIn,
  LogOut,
  Coffee,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/hrms/components/ui/button";
import { Badge } from "@/hrms/components/ui/badge";
import { Skeleton } from "@/hrms/components/ui/skeleton";
import { staffService } from "@/hrms/services/staffService";
import { storeService } from "@/hrms/services/storeService";
import { employeeApi } from "@/hrms/services/api";
import { API_BASE_URL } from "@/hrms/services/apiClient";
import { User, Store as StoreType } from "@/hrms/types";
import { toast } from "@/hrms/hooks/use-toast";
import { cn } from "@/hrms/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isBefore,
  startOfDay,
  subMonths,
  addMonths,
  isAfter,
  isToday,
} from "date-fns";

const getFileUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const baseUrl = API_BASE_URL.replace(/\/api$/, "");
  const cleanPath = url.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${baseUrl}/${cleanPath}`;
};

const isPdf = (url?: string) => url?.toLowerCase().endsWith('.pdf');

const handleDownload = async (url: string, filename: string) => {
  const fileUrl = getFileUrl(url);

  try {
    // Try to fetch the file as a blob to force a download
    const response = await fetch(fileUrl, { mode: 'cors' });
    if (!response.ok) throw new Error('Fetch failed');

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    // Fallback: If fetch fails (CORS), open in new tab
    // Some browsers will still trigger download if they can't preview it
    console.warn("Download fetch failed, falling back to window.open", err);
    window.open(fileUrl, '_blank');
  }
};

const getThumbnailUrl = (url: string) => {
  const fileUrl = getFileUrl(url);
  if (isPdf(url) && fileUrl.includes('cloudinary.com')) {
    return fileUrl.replace(/\.pdf$/i, '.jpg').replace('/upload/', '/upload/pg_1/');
  }
  return fileUrl;
};

export default function StaffViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "attendance">("profile");
  const [attMonth, setAttMonth] = useState(new Date());
  const [attHistory, setAttHistory] = useState<any[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attView, setAttView] = useState<"list" | "calendar">("list");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [userData, storesData] = await Promise.all([
          staffService.getById(id as string),
          storeService.getAll()
        ]);
        setUser(userData);
        setStores(storesData.data || []);
      } catch (err: any) {
        toast({ title: "Error", description: "Failed to load employee details", variant: "destructive" });
        navigate("/staff/users");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    setAttLoading(true);
    setAttHistory([]);
    employeeApi
      .getAttendance({ userId: id, month: attMonth.getMonth() + 1, year: attMonth.getFullYear() })
      .then(d => setAttHistory(Array.isArray(d) ? d : []))
      .catch(() => setAttHistory([]))
      .finally(() => setAttLoading(false));
  }, [id, attMonth]);

  const fmtTime = (time?: string) => {
    if (!time) return null;
    try {
      let d = new Date(time);
      if (isNaN(d.getTime())) d = new Date(`2000-01-01T${time}`);
      return isNaN(d.getTime()) ? time : format(d, "hh:mm a");
    } catch { return time; }
  };

  // Four statuses only — Full Day / Half Day / Present / Absent — finalized
  // server-side (finalizeAttendanceStatus) against the assigned shift's
  // duration; trust record.status directly instead of re-deriving it from a
  // separate hardcoded-hours heuristic. "On Duty" / "Pending" are live-only
  // labels for today while still in progress, never persisted.
  const fullAttHistory = useMemo(() => {
    const days = eachDayOfInterval({ start: startOfMonth(attMonth), end: endOfMonth(attMonth) });
    return days.map(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      const record = attHistory.find(h => {
        const hd = typeof h.date === "string" ? h.date : new Date(h.date).toISOString().split("T")[0];
        return hd === dateStr;
      });
      const todayFlag = isToday(date);
      if (record) {
        const hasOpenSession = (record.sessions || []).some((s: any) => s.punchIn?.time && !s.punchOut?.time);
        const hasPunchOut = record.punchOut?.time && !hasOpenSession;
        const status = !hasPunchOut ? (todayFlag ? "On Duty" : "Absent") : (record.status || "Absent");
        return { ...record, status };
      }
      const isPast = isBefore(date, startOfDay(new Date()));
      return { date: dateStr, status: todayFlag ? "Pending" : isPast ? "Absent" : "Upcoming" } as any;
    }).filter(d => d.status !== "Upcoming").reverse();
  }, [attMonth, attHistory]);

  const attStats = useMemo(() => {
    const worked = fullAttHistory.filter(h => ["Full Day","Half Day","On Duty"].includes(h.status));
    const totalHours = attHistory.reduce((acc: number, r: any) => {
      let h = r.totalHours;
      if (!h && r.punchIn?.time && r.punchOut?.time) {
        try { h = Math.max(0, (new Date(`${r.date}T${r.punchOut.time}`).getTime() - new Date(`${r.date}T${r.punchIn.time}`).getTime()) / 3600000); }
        catch { h = 0; }
      }
      return acc + (h || 0);
    }, 0);
    const th = Math.floor(totalHours), tm = Math.round((totalHours - th) * 60);
    return {
      present:     worked.length,
      fullDays:    worked.filter(h => h.status === "Full Day").length,
      halfDays:    worked.filter(h => h.status === "Half Day").length,
      absent:      fullAttHistory.filter(h => h.status === "Absent").length,
      totalHoursLabel: `${th}h ${tm}m`,
    };
  }, [fullAttHistory, attHistory]);

  const calendarGrid = useMemo(() => {
    const monthStart = startOfMonth(attMonth);
    const startPad = monthStart.getDay(); // Sunday-first: 0=Sun, 1=Mon, ...
    const monthDays = eachDayOfInterval({ start: monthStart, end: endOfMonth(attMonth) });
    return { monthDays, startPad };
  }, [attMonth]);

  const ATT_STATUS_CFG: Record<string, { gradient: string; ring: string; badge: string; dot: string; text: string }> = {
    "Full Day":   { gradient: "from-emerald-500 to-teal-500",  ring: "border-l-emerald-500", badge: "bg-emerald-500 text-white",   dot: "bg-emerald-500",  text: "text-emerald-600" },
    "Half Day":   { gradient: "from-amber-400 to-orange-400",  ring: "border-l-amber-400",   badge: "bg-amber-400 text-white",     dot: "bg-amber-400",    text: "text-amber-600" },
    "Absent":     { gradient: "from-slate-300 to-slate-400",   ring: "border-l-slate-300",   badge: "bg-slate-200 text-slate-600", dot: "bg-slate-300",    text: "text-slate-500" },
    "On Duty":    { gradient: "from-blue-400 to-indigo-400",   ring: "border-l-blue-400",    badge: "bg-blue-400 text-white",      dot: "bg-blue-400",     text: "text-blue-600" },
    "Pending":    { gradient: "from-blue-400 to-indigo-400",   ring: "border-l-blue-400",    badge: "bg-blue-400 text-white",      dot: "bg-blue-400",     text: "text-blue-600" },
  };
  const attCfg = (s: string) => ATT_STATUS_CFG[s] ?? ATT_STATUS_CFG["Absent"];

  const safeFormat = (dateInput: any, fmt: string) => {
    if (!dateInput) return "--";
    try { const d = dateInput instanceof Date ? dateInput : new Date(dateInput); return isNaN(d.getTime()) ? "--" : format(d, fmt); }
    catch { return "--"; }
  };

  const ATT_STAT_CARDS = [
    { label: "Full Day",  value: attStats.fullDays,        from: "from-emerald-500", to: "to-teal-500",    Icon: CheckCircle2 },
    { label: "Half Day",  value: attStats.halfDays,        from: "from-amber-400",   to: "to-orange-400",  Icon: Timer },
    { label: "Absent",    value: attStats.absent,          from: "from-rose-500",    to: "to-red-600",     Icon: XCircle },
    { label: "Total Hrs", value: attStats.totalHoursLabel, from: "from-blue-500",    to: "to-indigo-500",  Icon: Clock },
  ];

  const handleAttExport = () => {
    if (!fullAttHistory.length || !user) return;
    const csv = [
      [`Attendance Report — ${user.name}`],
      [`Period: ${format(attMonth, "MMMM yyyy")}`],
      [],
      ["Date", "Day", "Status", "Punch In", "Punch Out", "Lunch In", "Lunch Out", "Total Hrs"],
      ...fullAttHistory.map((d: any) => [
        d.date, safeFormat(d.date, "EEEE"), d.status,
        fmtTime(d.punchIn?.time) || "--", fmtTime(d.punchOut?.time) || "--",
        fmtTime(d.lunchIn?.time) || "--", fmtTime(d.lunchOut?.time) || "--",
        d.totalHours ? Number(d.totalHours).toFixed(2) : "0.00",
      ]),
    ].map(r => (r as any[]).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `Attendance_${user.name.replace(/\s+/g, "_")}_${format(attMonth, "MMM_yyyy")}.csv`;
    link.click();
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]">Loading profile...</div>;
  if (!user) return <div className="p-8 text-center">User not found</div>;

  const resolvedStoreName = typeof user.storeId === 'object'
    ? (user.storeId as any)?.name ?? stores.find(s => s.id === ((user.storeId as any)?._id || (user.storeId as any)?.id))?.name
    : stores.find(s => s.id === user.storeId)?.name;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/staff/users")} className="rounded-full hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              Employee Profile
            </h1>
            <p className="text-[13px] font-medium text-slate-500">Viewing detailed record for {user.name}</p>
          </div>
        </div>
        <Button size="sm" className="rounded-md gradient-primary font-medium shadow-sm flex items-center gap-2 h-9 px-5" onClick={() => navigate(`/staff/users/edit/${user.id}`)}>
          <Edit2 className="h-3.5 w-3.5" /> Edit Profile
        </Button>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-slate-200 -mt-2">
        {([
          { key: "profile",    label: "Profile",    icon: <Users className="h-3.5 w-3.5" /> },
          { key: "attendance", label: "Attendance", icon: <Calendar className="h-3.5 w-3.5" /> },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-colors",
              activeTab === tab.key
                ? "text-primary border-primary"
                : "text-slate-400 border-transparent hover:text-slate-600"
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Summary Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col items-center text-center">
            <div className="relative mb-4 group">
              <div className="h-32 w-32 rounded-md border-2 border-slate-100 shadow-md overflow-hidden bg-slate-50 flex items-center justify-center">
                <img src={getFileUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">{user.name}</h2>
            <div className="flex flex-col gap-3 w-full mt-4">
              <Badge variant="outline" className="rounded-md py-1 px-3 bg-slate-50 text-slate-600 border-slate-200 font-semibold uppercase tracking-wider text-[10px] mx-auto">
                {(user.role && typeof user.role === "object") ? (user.role as any).label : (user.role as string)}
              </Badge>

              <div className="flex items-center justify-center gap-1.5 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                <Store className="h-3.5 w-3.5" />
                {resolvedStoreName || "Unassigned"}
              </div>

              <div className="flex items-center justify-center">
                <Badge className={cn("rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wider", user.status === "active" ? "bg-emerald-500" : "bg-slate-400")}>
                  {user.status}
                </Badge>
              </div>
            </div>

            <div className="w-full border-t border-slate-100 my-6" />

            <div className="w-full space-y-4">
              <div className="flex items-center gap-3 text-left">
                <div className="h-8 w-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-400"><Mail className="h-4 w-4" /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                  <p className="text-sm font-medium text-slate-700">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="h-8 w-8 rounded-md bg-slate-50 flex items-center justify-center text-slate-400"><Phone className="h-4 w-4" /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mobile</p>
                  <p className="text-sm font-medium text-slate-700">{user.mobile}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Personal Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Users className="h-3.5 w-3.5" /></div>
                  Personal & Identity
                </h3>
                <div className="space-y-4 pl-9">
                  <InfoItem label="Gender" value={user.gender} />
                  <InfoItem label="Date of Birth" value={user.dob ? new Date(user.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "—"} icon={<Calendar className="h-3 w-3" />} />
                  <InfoItem label="Blood Group" value={user.bloodGroup} />
                </div>
              </div>

              {/* Employment Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center"><Zap className="h-3.5 w-3.5" /></div>
                  Employment Record
                </h3>
                <div className="space-y-4 pl-9">
                  <InfoItem label="Employee ID" value={user.id?.substring(0, 8).toUpperCase()} />
                  <InfoItem label="Joining Date" value={user.joiningDate ? new Date(user.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "—"} icon={<Calendar className="h-3 w-3" />} />
                  <InfoItem label="Pay Cycle" value={user.payType} icon={<Banknote className="h-3 w-3" />} />
                  <InfoItem label="Base Salary" value={`₹${user.salaryAmount?.toLocaleString("en-IN")}`} icon={<CreditCard className="h-3 w-3" />} />
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="space-y-4 pb-10 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center"><FileIcon className="h-3.5 w-3.5" /></div>
                Legal Documents
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-9">
                {user.legalDocuments?.panUrl && (
                  <div className="space-y-3">
                    <div className="relative group rounded-md overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                      <div className="aspect-video">
                        <img src={getThumbnailUrl(user.legalDocuments.panUrl)} alt="PAN" className="w-full h-full object-cover" />
                      </div>

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 backdrop-blur-[1px]">
                        <Button size="sm" variant="secondary" className="h-7 rounded-md text-[10px] font-bold px-3" onClick={() => setPreviewUrl(getFileUrl(user.legalDocuments?.panUrl))}>
                          <Eye className="h-3 w-3 mr-1" /> Preview
                        </Button>
                        <Button size="sm" variant="secondary" className="h-7 rounded-md text-[10px] font-bold px-3" onClick={() => handleDownload(user.legalDocuments?.panUrl!, `PAN_${user.name?.replace(/\s+/g, '_')}`)}>
                          <Download className="h-3 w-3 mr-1" /> Download
                        </Button>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">PAN Card</p>
                      <p className="text-[10px] font-bold text-slate-700">{user.legalDocuments.panNumber}</p>
                    </div>
                  </div>
                )}
                {user.legalDocuments?.aadhaarUrl && (
                  <div className="space-y-3">
                    <div className="relative group rounded-md overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                      <div className="aspect-video">
                        <img src={getThumbnailUrl(user.legalDocuments.aadhaarUrl)} alt="Aadhaar" className="w-full h-full object-cover" />
                      </div>

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 backdrop-blur-[1px]">
                        <Button size="sm" variant="secondary" className="h-7 rounded-md text-[10px] font-bold px-3" onClick={() => setPreviewUrl(getFileUrl(user.legalDocuments?.aadhaarUrl))}>
                          <Eye className="h-3 w-3 mr-1" /> Preview
                        </Button>
                        <Button size="sm" variant="secondary" className="h-7 rounded-md text-[10px] font-bold px-3" onClick={() => handleDownload(user.legalDocuments?.aadhaarUrl!, `Aadhaar_${user.name?.replace(/\s+/g, '_')}`)}>
                          <Download className="h-3 w-3 mr-1" /> Download
                        </Button>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Aadhaar Card</p>
                      <p className="text-[10px] font-bold text-slate-700">{user.legalDocuments.aadhaarNumber}</p>
                    </div>
                  </div>
                )}
                {user.legalDocuments?.passportPhotoUrl && (
                  <div className="space-y-3">
                    <div className="relative group rounded-md overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                      <div className="aspect-video">
                        <img src={getFileUrl(user.legalDocuments.passportPhotoUrl)} alt="Passport Photo" className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 backdrop-blur-[1px]">
                        <Button size="sm" variant="secondary" className="h-7 rounded-md text-[10px] font-bold px-3" onClick={() => setPreviewUrl(getFileUrl(user.legalDocuments?.passportPhotoUrl))}>
                          <Eye className="h-3 w-3 mr-1" /> Preview
                        </Button>
                        <Button size="sm" variant="secondary" className="h-7 rounded-md text-[10px] font-bold px-3" onClick={() => handleDownload(user.legalDocuments?.passportPhotoUrl!, `PassportPhoto_${user.name?.replace(/\s+/g, '_')}`)}>
                          <Download className="h-3 w-3 mr-1" /> Download
                        </Button>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Passport Photo</p>
                      <p className="text-[10px] font-bold text-slate-700">Official ID Photo</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Account Information */}
            <div className="space-y-4 pb-10 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center"><CreditCard className="h-3.5 w-3.5" /></div>
                Bank Account Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-9">
                <InfoItem label="Bank Name" value={user.bankInfo?.bankName} />
                <InfoItem label="IFSC Code" value={user.bankInfo?.ifscCode} />
                <InfoItem label="Account Number" value={user.bankInfo?.accountNumber} />
                <InfoItem label="Beneficiary Name" value={user.bankInfo?.accountName} />
              </div>
            </div>

            {/* Salary Configuration */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center"><Banknote className="h-3.5 w-3.5" /></div>
                  Salary Configuration
                </h3>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total CTC</p>
                  <p className="text-xl font-bold text-emerald-600">₹{user.salaryAmount?.toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="bg-slate-50/50 rounded-xl p-6 ml-9 border border-slate-100 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InfoItem label="Pay Cycle" value={user.payType} />
                  <InfoItem label="Base Salary" value={`₹${user.salaryAmount?.toLocaleString("en-IN")}`} />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <div className="h-4 w-1 rounded-full bg-primary/40" />
                    Salary Breakdown
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <InfoItem label="Basic Salary" value={renderSalaryValue(user.salaryConfig?.basic, user.salaryAmount)} />
                    <InfoItem label="HRA" value={renderSalaryValue(user.salaryConfig?.hra, user.salaryAmount)} />
                    <InfoItem label="PF (Employee)" value={renderSalaryValue(user.salaryConfig?.pf, user.salaryAmount)} />
                    <InfoItem label="ESIC" value={renderSalaryValue(user.salaryConfig?.esic, user.salaryAmount)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === "attendance" && (
      <div className="space-y-6">

        {/* Month Navigator + View Toggle + Export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-border/60 rounded-2xl p-1.5 shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-slate-100"
              onClick={() => setAttMonth(p => subMonths(p, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-black text-foreground min-w-[130px] text-center px-2">
              {format(attMonth, "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-slate-100"
              disabled={isAfter(startOfMonth(addMonths(attMonth, 1)), new Date())}
              onClick={() => setAttMonth(p => addMonths(p, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1 bg-white border border-border/60 rounded-2xl p-1 shadow-sm ml-auto">
            <Button
              variant={attView === "list" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 rounded-xl text-xs gap-1.5"
              onClick={() => setAttView("list")}
            >
              <List className="h-3.5 w-3.5" /> List
            </Button>
            <Button
              variant={attView === "calendar" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2.5 rounded-xl text-xs gap-1.5"
              onClick={() => setAttView("calendar")}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Calendar
            </Button>
          </div>
          <Button onClick={handleAttExport} disabled={!fullAttHistory.length}
            size="sm" className="rounded-2xl font-bold text-xs gap-2 h-9 px-4">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {ATT_STAT_CARDS.map(({ label, value, from, to, Icon }) => (
            <div key={label}
              className="bg-white border border-border/40 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
              <div className={cn("h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white", from, to)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <p className="text-xl font-bold text-foreground leading-none">{attLoading ? "—" : value}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        {/* Attendance Rate Progress */}
        {!attLoading && (attStats.present + attStats.absent) > 0 && (
          <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Attendance Rate</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {attStats.present} of {attStats.present + attStats.absent} days present
                </p>
              </div>
              <p className="text-xl font-bold text-emerald-600">
                {Math.round((attStats.present / (attStats.present + attStats.absent)) * 100)}%
              </p>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                style={{ width: `${Math.round((attStats.present / (attStats.present + attStats.absent)) * 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {[
                { label: "Full Day", color: "bg-emerald-500", count: attStats.fullDays },
                { label: "Half Day", color: "bg-amber-400",   count: attStats.halfDays },
                { label: "Absent",   color: "bg-slate-300",   count: attStats.absent },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${l.color}`} />
                  <span className="text-[11px] font-medium text-muted-foreground">{l.label} · {l.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendar View */}
        {attView === "calendar" && (
          <div className="bg-white rounded-2xl border border-border/40 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
              <LayoutGrid className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Monthly Calendar</p>
              <span className="text-xs text-muted-foreground ml-auto">{format(attMonth, "MMMM yyyy")}</span>
            </div>
            {attLoading ? (
              <div className="p-5 space-y-3">
                <Skeleton className="h-8 w-full rounded-xl" />
                <Skeleton className="h-56 w-full rounded-xl" />
              </div>
            ) : (
              <div className="p-3">
                {/* Day-of-week headers: Sunday-first */}
                <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                  {["SUN","MON","TUE","WED","THU","FRI","SAT"].map(d => (
                    <div key={d} className="text-center text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest py-1">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: calendarGrid.startPad }).map((_, i) => (
                    <div key={`pad-${i}`} className="h-[72px]" />
                  ))}
                  {calendarGrid.monthDays.map(date => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    const record = fullAttHistory.find((d: any) => d.date === dateStr);
                    const isUpcoming = !isBefore(date, startOfDay(new Date())) && !isToday(date);
                    const status = record?.status ?? (isUpcoming ? "Upcoming" : "Absent");
                    const todayDay = isToday(date);

                    // Three finalized statuses (Full Day / Half Day / Absent)
                    // plus the live-only "On Duty" / "Pending" / "Upcoming"
                    // labels — mirrors finalizeAttendanceStatus() on the backend.
                    const CAL_CELL: Record<string, { bg: string; border: string; label: string; labelColor: string; dot: string }> = {
                      "Full Day":  { bg: "bg-emerald-100", border: "border-emerald-200", label: "FULL DAY", labelColor: "text-emerald-600", dot: "bg-emerald-500" },
                      "Half Day":  { bg: "bg-sky-100",     border: "border-sky-200",     label: "HALF-DAY", labelColor: "text-sky-500",     dot: "bg-sky-400" },
                      "Absent":    { bg: "bg-rose-100",    border: "border-rose-200",    label: "ABSENT",   labelColor: "text-rose-400",    dot: "bg-rose-400" },
                      "On Duty":   { bg: "bg-sky-50",      border: "border-sky-200",     label: "ON DUTY",  labelColor: "text-sky-500",     dot: "bg-sky-400" },
                      "Pending":   { bg: "bg-sky-50",      border: "border-sky-200",     label: "TODAY",    labelColor: "text-sky-500",     dot: "bg-sky-400" },
                      "Upcoming":  { bg: "bg-white",       border: "border-slate-100",   label: "UPCOMING", labelColor: "text-slate-300",   dot: "" },
                    };
                    const c = CAL_CELL[status] ?? CAL_CELL["Upcoming"];

                    return (
                      <div key={dateStr} className={cn(
                        "h-[72px] rounded-xl p-1.5 flex flex-col border-2 relative",
                        c.bg, c.border,
                        todayDay && "ring-2 ring-slate-800 ring-offset-1",
                        isUpcoming && "opacity-50",
                      )}>
                        {/* Top row: date number + status dot */}
                        <div className="flex items-start justify-between">
                          {todayDay ? (
                            <div className="h-5 w-5 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-white leading-none">{format(date, "d")}</span>
                            </div>
                          ) : (
                            <span className={cn(
                              "text-[12px] font-bold leading-none",
                              isUpcoming ? "text-slate-400" : "text-slate-800"
                            )}>
                              {format(date, "d")}
                            </span>
                          )}
                          {c.dot && (
                            <div className={cn("h-2 w-2 rounded-full shrink-0", c.dot)} />
                          )}
                        </div>
                        {/* Bottom: status label */}
                        <div className="flex-1 flex items-end justify-center pb-0.5">
                          <span className={cn(
                            "text-[7px] font-bold uppercase tracking-widest text-center leading-none",
                            c.labelColor,
                          )}>
                            {c.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Legend — exactly the three finalized statuses */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-border/30">
                  {[
                    { label: "Full Day", color: "bg-emerald-500" },
                    { label: "Half Day", color: "bg-sky-400" },
                    { label: "Absent",   color: "bg-rose-400" },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${l.color}`} />
                      <span className="text-[10px] font-medium text-muted-foreground">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Records List */}
        {attView === "list" && (
        <div className="bg-white rounded-2xl border border-border/40 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
            <Calendar className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Daily Records</p>
            <span className="text-xs text-muted-foreground ml-auto">{format(attMonth, "MMMM yyyy")} · {fullAttHistory.length} entries</span>
          </div>

          {attLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : fullAttHistory.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center px-6">
              <Calendar className="h-10 w-10 text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground">No records for this month</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {fullAttHistory.map((day: any) => {
                const c = attCfg(day.status);
                const punchIn     = fmtTime(day.punchIn?.time);
                const punchOut    = fmtTime(day.punchOut?.time);
                const lunchIn     = fmtTime(day.lunchIn?.time);
                const lunchOut    = fmtTime(day.lunchOut?.time);
                const hours       = day.totalHours ? Number(day.totalHours) : 0;
                const hLabel      = hours ? `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m` : null;
                const isAbsent    = day.status === "Absent";
                const punchInSelfie  = day.punchIn?.selfieUrl;
                const punchOutSelfie = day.punchOut?.selfieUrl;
                const avatarUrl  = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "NA")}&background=4f46e5&color=fff&size=96`;

                return (
                  <div key={day.date}
                    className={cn(
                      "flex items-center gap-4 px-5 py-3.5 border-l-4 hover:bg-slate-50/40 transition-colors",
                      c.ring,
                      isAbsent && "opacity-55"
                    )}>

                    {/* Date chip */}
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex flex-col items-center justify-center shrink-0 text-center",
                      isAbsent ? "bg-slate-100 text-slate-400" : cn("bg-gradient-to-br text-white", c.gradient)
                    )}>
                      <span className="text-base font-bold leading-none">{safeFormat(day.date, "dd")}</span>
                      <span className="text-[9px] font-semibold uppercase opacity-80 leading-none mt-0.5">{safeFormat(day.date, "EEE")}</span>
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{safeFormat(day.date, "dd MMMM yyyy")}</p>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", c.badge)}>
                          {day.status}
                        </span>
                        {day.lateMinutes > 0 && (
                          <span className="text-[10px] font-medium text-orange-500">
                            +{Math.floor(day.lateMinutes / 60) > 0 ? `${Math.floor(day.lateMinutes / 60)}h ` : ""}{day.lateMinutes % 60}m late
                          </span>
                        )}
                      </div>

                      {isAbsent ? (
                        <p className="text-[11px] text-slate-400">No attendance recorded</p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          {punchIn && (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                              <LogIn className="h-3 w-3" /> {punchIn}
                            </span>
                          )}
                          {(lunchIn || lunchOut) && (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-500">
                              <Coffee className="h-3 w-3" />
                              {lunchIn}{lunchIn && lunchOut && " → "}{lunchOut}
                            </span>
                          )}
                          {punchOut && (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-blue-600">
                              <LogOut className="h-3 w-3" /> {punchOut}
                            </span>
                          )}
                          {!punchOut && punchIn && (
                            <span className="text-[11px] text-muted-foreground/50 italic">Not punched out</span>
                          )}
                          {/* Additional sessions (Session 2+) */}
                          {(day.sessions || []).map((s: any) => (
                            <span key={s.sessionNumber} className={cn(
                              "flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg border",
                              s.punchIn?.time && !s.punchOut?.time
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-slate-50 border-slate-200 text-slate-500"
                            )}>
                              <LogIn className="h-3 w-3" />
                              S{s.sessionNumber} {fmtTime(s.punchIn?.time) || "--"}
                              <span className="opacity-30">→</span>
                              {s.punchOut?.time ? fmtTime(s.punchOut.time) : <span className="text-emerald-500">Live</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Hours */}
                    {hLabel && (
                      <div className="text-right hidden sm:block shrink-0">
                        <p className={cn("text-sm font-semibold", c.text)}>{hLabel}</p>
                        <div className="h-1 w-16 bg-muted rounded-full overflow-hidden mt-1">
                          <div className={cn("h-full rounded-full bg-gradient-to-r", c.gradient)}
                            style={{ width: `${Math.min(100, (hours / 9) * 100)}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Selfies — In & Out */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Punch In selfie */}
                      <div className="flex flex-col items-center gap-0.5">
                        <div className={cn("h-10 w-10 rounded-xl overflow-hidden border-2",
                          isAbsent ? "border-slate-200" : "border-emerald-200")}>
                          <img
                            src={punchInSelfie || avatarUrl}
                            alt="in"
                            className={cn("h-full w-full object-cover", isAbsent && "grayscale opacity-30")}
                            onError={e => (e.currentTarget.src = avatarUrl)}
                          />
                        </div>
                        <span className="text-[8px] font-medium text-muted-foreground uppercase tracking-wide">In</span>
                      </div>
                      {/* Punch Out selfie */}
                      <div className="flex flex-col items-center gap-0.5">
                        <div className={cn("h-10 w-10 rounded-xl overflow-hidden border-2",
                          punchOutSelfie ? "border-blue-200" : "border-slate-100")}>
                          <img
                            src={punchOutSelfie || avatarUrl}
                            alt="out"
                            className={cn("h-full w-full object-cover",
                              (!punchOutSelfie || isAbsent) && "grayscale opacity-30")}
                            onError={e => (e.currentTarget.src = avatarUrl)}
                          />
                        </div>
                        <span className="text-[8px] font-medium text-muted-foreground uppercase tracking-wide">Out</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}
      </div>
      )}

      {/* Image/PDF Preview Overlay */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 md:p-10 animate-in fade-in duration-300" onClick={() => setPreviewUrl(null)}>
          <Button variant="ghost" size="icon" className="absolute top-6 right-6 text-white hover:bg-white/20 rounded-full z-[110]" onClick={() => setPreviewUrl(null)}>
            <X className="h-8 w-8" />
          </Button>

          <div className="w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {isPdf(previewUrl) ? (
              <iframe
                src={`${previewUrl}#toolbar=0`}
                className="w-full h-full max-w-5xl rounded-md bg-white shadow-2xl border-0"
                title="PDF Preview"
              />
            ) : (
              <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain shadow-2xl rounded-md" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, icon, isLong }: { label: string, value?: string, icon?: React.ReactNode, isLong?: boolean }) {
  return (
    <div className={cn("space-y-1", isLong && "col-span-2")}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        {icon} {label}
      </p>
      <p className="text-sm font-semibold text-slate-700 leading-snug">{value || "—"}</p>
    </div>
  );
}

const renderSalaryValue = (config?: { value: number; type: "amount" | "percent"; isIncluded: boolean }, baseSalary?: number) => {
  if (!config || !config.isIncluded) return "—";
  if (config.type === "amount") return `₹${config.value.toLocaleString("en-IN")}`;
  if (baseSalary) {
    const calculated = (baseSalary * config.value) / 100;
    return `₹${calculated.toLocaleString("en-IN")} (${config.value}%)`;
  }
  return `${config.value}%`;
};


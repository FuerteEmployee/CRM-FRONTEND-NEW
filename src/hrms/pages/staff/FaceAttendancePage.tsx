import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ScanFace, Users, UserCheck, UserX, Search, MonitorPlay, RefreshCw, Server, AlertCircle } from "lucide-react";
import { Button } from "@/hrms/components/ui/button";
import { Badge } from "@/hrms/components/ui/badge";
import { Input } from "@/hrms/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/hrms/components/ui/dialog";
import { FaceEnrollPanel } from "@/hrms/components/face/FaceEnrollPanel";
import { faceService, FaceEnrollment, FaceStatus } from "@/hrms/services/faceService";
import { cn } from "@/hrms/lib/utils";

/* Face Attendance — enrol staff faces and launch the office kiosk. Enrolled
 * staff are punched in/out by the kiosk camera, and their own "My Attendance"
 * selfies are checked against the enrolled face. */

function Tile({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", tone)}><Icon className="h-4 w-4" /></div>
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-base font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export default function FaceAttendancePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";

  const [status, setStatus] = useState<FaceStatus | null>(null);
  const [rows, setRows] = useState<FaceEnrollment[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "enrolled" | "pending">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [enrolling, setEnrolling] = useState<FaceEnrollment | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [s, list] = await Promise.all([faceService.getStatus(), faceService.listEnrollments()]);
      setStatus(s);
      setRows(list);
    } catch (e: any) {
      setError(e?.responseData?.code === "FEATURE_DISABLED"
        ? "Face Attendance isn't switched on for your company. Ask the super admin to enable it (Companies → Manage → Add-on features)."
        : e?.message || "Failed to load face enrolments");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      (filter === "all" || (filter === "enrolled" ? r.enrolled : !r.enrolled)) &&
      (!q || [r.name, r.employeeCode, r.mobile, r.branch].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [rows, search, filter]);

  const enrolledCount = rows.filter((r) => r.enrolled).length;

  return (
    <div className="min-h-screen bg-slate-50/50 space-y-4 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <ScanFace className="h-5 w-5 text-indigo-500" /> Face Attendance
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Enrol staff faces, then run the kiosk on an office device to punch them in and out</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={load}>
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} /> Refresh
          </Button>
          <Button size="sm" className="h-9 gap-1.5" onClick={() => navigate(`${basePath}/staff/face-kiosk`)} disabled={!enrolledCount}>
            <MonitorPlay className="h-3.5 w-3.5" /> Open Kiosk
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile
          icon={Server}
          label="Face service"
          value={status ? (status.serviceUp ? <span className="text-emerald-600">Running</span> : <span className="text-red-600">Not running</span>) : "—"}
          tone={status?.serviceUp === false ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50"}
        />
        <Tile icon={Users} label="Active staff" value={rows.length} tone="text-slate-600 bg-slate-100" />
        <Tile icon={UserCheck} label="Face enrolled" value={enrolledCount} tone="text-indigo-600 bg-indigo-50" />
        <Tile icon={UserX} label="Not enrolled" value={rows.length - enrolledCount} tone="text-amber-600 bg-amber-50" />
      </div>

      {status && !status.serviceUp && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          The face recognition service isn't running, so enrolment and the kiosk won't work. Selfie punches still go through (marked for review).
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-slate-100">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, code, mobile or branch" className="pl-8 h-9" />
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {([["all", "All"], ["enrolled", "Enrolled"], ["pending", "Not enrolled"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn("rounded-md px-3 py-1 text-xs font-semibold", filter === key ? "bg-white shadow-sm text-slate-800" : "text-slate-500")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Loading staff...</div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-500">{error}</div>
          ) : visible.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No staff match these filters.</div>
          ) : (
            <table className="w-full text-xs min-w-[640px]">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="text-left font-semibold px-4 py-2.5">Employee</th>
                  <th className="text-left font-semibold px-4 py-2.5">Branch</th>
                  <th className="text-left font-semibold px-4 py-2.5">Face</th>
                  <th className="text-right font-semibold px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r._id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {r.photoUrl || r.avatar ? (
                          <img src={r.photoUrl || r.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-500">{r.name?.[0]?.toUpperCase()}</div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-700">{r.name}</p>
                          <p className="text-[10px] text-slate-400">{r.employeeCode || r.mobile || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{r.branch || "—"}</td>
                    <td className="px-4 py-2.5">
                      {r.enrolled ? (
                        <Badge className="border-0 bg-emerald-100 text-emerald-700 text-[10px] font-semibold">Enrolled · {r.photoCount} photo{r.photoCount === 1 ? "" : "s"}</Badge>
                      ) : (
                        <Badge className="border-0 bg-slate-100 text-slate-500 text-[10px] font-semibold">Not enrolled</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant={r.enrolled ? "outline" : "default"} className="h-7 text-xs gap-1" onClick={() => setEnrolling(r)}>
                        <ScanFace className="h-3.5 w-3.5" /> {r.enrolled ? "Manage" : "Enrol face"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={!!enrolling} onOpenChange={(open) => !open && setEnrolling(null)}>
        <DialogContent className="max-w-xl rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ScanFace className="h-5 w-5 text-indigo-500" /> {enrolling?.name}</DialogTitle>
            <DialogDescription>Capture the employee's face for the kiosk and selfie checks.</DialogDescription>
          </DialogHeader>
          {enrolling && (
            <FaceEnrollPanel
              employee={enrolling}
              enrolled={enrolling.enrolled}
              enrolledPhotoUrl={enrolling.photoUrl}
              onChanged={() => { setEnrolling(null); load(); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

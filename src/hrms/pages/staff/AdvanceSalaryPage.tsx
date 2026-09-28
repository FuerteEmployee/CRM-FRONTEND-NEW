import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/hrms/components/ui/card";
import { Badge } from "@/hrms/components/ui/badge";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import { Label } from "@/hrms/components/ui/label";
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
import {
  Wallet,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  IndianRupee,
  CalendarDays,
  Landmark,
  HandCoins,
  Filter,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { staffService } from "@/hrms/services/staffService";
import { apiClient } from "@/hrms/services/apiClient";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { toast } from "@/hrms/components/ui/use-toast";
import { cn } from "@/hrms/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/hrms/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/hrms/components/ui/tabs";

/* ─── Types ─── */
type RequestType = "Advance Salary" | "Loan";
type RequestStatus = "Pending" | "Approved" | "Rejected" | "Repaid";

interface Installment {
  month: number;
  year: number;
  amount: number;
  deductedAt: string;
}

interface SalaryLoanRecord {
  _id: string;
  employeeId: any;
  type: RequestType;
  amount: number;
  reason: string;
  requestDate: string;
  status: RequestStatus;
  notes?: string;
  // Loan-only — set at approval time when repayment is spread over several
  // months instead of deducted all at once (see payroll_controller.js).
  monthlyInstallmentAmount?: number;
  remainingAmount?: number;
  installments?: Installment[];
}

const STATUS_BADGE: Record<RequestStatus, string> = {
  Pending:  "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
  Repaid:   "bg-slate-100 text-slate-600",
};


type StatColor = "amber" | "emerald" | "red" | "slate";

const STAT_BG: Record<StatColor, string> = {
  amber: "bg-amber-50",
  emerald: "bg-emerald-50",
  red: "bg-red-50",
  slate: "bg-slate-100",
};
const STAT_ICON: Record<StatColor, string> = {
  amber: "text-amber-500",
  emerald: "text-emerald-500",
  red: "text-red-500",
  slate: "text-slate-500",
};

/* ─── Stat Card ─── */
function StatCard({
  icon: Icon,
  label,
  amount,
  color,
}: {
  icon: React.ElementType;
  label: string;
  amount: number;
  color: StatColor;
}) {
  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", STAT_BG[color])}>
          <Icon className={cn("h-5 w-5", STAT_ICON[color])} />
        </div>
        <div>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
          <p className="text-base font-bold text-slate-800 flex items-center gap-0.5">
            <IndianRupee className="h-3.5 w-3.5" />
            {amount.toLocaleString("en-IN")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main Page ─── */
const AdvanceSalaryPage = () => {
  const { user: authUser } = useAuth();

  /* Role helpers
   *  isSuperAdmin  → super_admin / owner   : full access (approve + reject + delete + see all)
   *  isAdmin       → admin role only        : approve + reject, see all (no delete)
   *  canManage     → either of the above    : used for all "management" views/actions
   *  isEmployee    → everyone else          : submit own requests, view own only
   */
  const roleKey = String(
    typeof authUser?.role === "string" ? authUser.role : (authUser?.role as any)?.role || ""
  ).toLowerCase();
  // Tenant admins are commonly flagged via Staff.admin (a boolean, set at
  // account creation) rather than via an assigned Role named "Admin" — a
  // role-name-only check here misses them entirely, showing the self-service
  // "My Advance Salary" view to someone who should see the management view.
  // Mirrors the same boolean checks useResolvedHrmsPermissions.isAdmin uses.
  const isSuperAdmin = !!authUser?.is_superadmin || ["super_admin", "superadmin", "owner"].includes(roleKey);
  const isAdmin     = roleKey === "admin" ||
    authUser?.admin === true || authUser?.admin === 1 || authUser?.admin === "1" || authUser?.admin === "true";
  const canManage   = isSuperAdmin || isAdmin;
  const isEmployee  = !canManage;

  const myId = String(authUser?.id || (authUser as any)?._id || "");

  const [records, setRecords] = useState<SalaryLoanRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /* Filters */
  const [activeTab, setActiveTab] = useState<"all" | RequestType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  /* Dialog */
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    type: "Advance Salary" as RequestType,
    employeeId: isEmployee ? myId : "",
    amount: "",
    reason: "",
    notes: "",
  });

  /* ─── Load ─── */
  const load = useCallback(async () => {
    setIsLoading(true);

    // Load employees and records independently so one failure can't block the other
    const [staffResult, recordsResult] = await Promise.allSettled([
      canManage ? staffService.getAll() : Promise.resolve([]),
      apiClient.get("/advance-salary").catch(() => ({ data: [] })),
    ]);

    if (staffResult.status === "fulfilled") {
      setEmployees(Array.isArray(staffResult.value) ? staffResult.value : []);
    }
    if (recordsResult.status === "fulfilled") {
      const raw = (recordsResult.value as any)?.data?.data ?? (recordsResult.value as any)?.data ?? [];
      setRecords(Array.isArray(raw) ? raw : []);
    }

    setIsLoading(false);
  }, [canManage]);

  useEffect(() => {
    load();
  }, [load]);

  /* ─── Helpers ─── */
  const getEmployeeName = (idOrObj: any): string => {
    if (!idOrObj) return "Staff Member";
    if (typeof idOrObj === "object") return idOrObj.name || "Staff Member";
    const emp = employees.find((e) => String(e._id || e.id) === String(idOrObj));
    return emp ? emp.name : "Staff Member";
  };

  const resetForm = () =>
    setForm({
      type: "Advance Salary",
      employeeId: isEmployee ? myId : "",
      amount: "",
      reason: "",
        notes: "",
    });

  /* ─── Filtered records ───
   * No client-side "is this mine" re-filter here — the backend's GET
   * /advance-salary already scopes non-admins to their own records
   * (query.employeeId = the JWT-derived id). Re-checking against
   * authUser._id on the frontend used to silently drop every record for a
   * Staff-portal login, because authUser._id there is the Staff document's
   * id, not the linked HRMS User id that employeeId actually stores. */
  const visibleRecords = records.filter((r) => {
    const matchTab = activeTab === "all" || r.type === activeTab;
    const name = getEmployeeName(r.employeeId).toLowerCase();
    const matchSearch =
      !searchQuery ||
      name.includes(searchQuery.toLowerCase()) ||
      (r.reason || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchTab && matchSearch && matchStatus;
  });

  /* ─── Summary ─── */
  const sumBy = (status: RequestStatus) =>
    records.filter((r) => r.status === status).reduce((s, r) => s + (r.amount || 0), 0);

  /* ─── Actions ─── */
  const handleSubmit = async () => {
    if (!form.employeeId || !form.amount || !form.reason) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await apiClient.post("/advance-salary", {
        type: form.type,
        employeeId: form.employeeId,
        amount: Number(form.amount),
        reason: form.reason,
        notes: form.notes,
        requestDate: new Date().toISOString(),
        status: "Pending",
      });
      await load();
      toast({ title: `${form.type} request submitted` });
      setIsDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: RequestStatus, extra?: { monthlyInstallmentAmount?: number }) => {
    try {
      const res = await apiClient.put(`/advance-salary/${id}`, { status, ...extra });
      const updated = res?.data ?? res;
      setRecords((p) => p.map((r) => (r._id === id ? { ...r, ...updated } : r)));
      toast({ title: `Marked as ${status}` });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  // Per-row draft value for the optional Loan installment amount, entered
  // just before clicking Approve (Loan only — Advance Salary always deducts
  // in full, see advance_salary_controller.js).
  const [installmentDrafts, setInstallmentDrafts] = useState<Record<string, string>>({});

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/advance-salary/${id}`);
      setRecords((p) => p.filter((r) => r._id !== id));
      toast({ title: "Record deleted" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  /* ─── UI ─── */
  return (
    <div className="min-h-screen bg-slate-50/50 space-y-5 p-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-indigo-500" />
            {canManage ? "Advance Salary & Loan" : "My Advance Salary"}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {canManage
              ? "Manage employee advance salary and loan requests"
              : "View and submit your advance salary or loan requests"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin role badge */}
          {isSuperAdmin && (
            <Badge className="bg-indigo-100 text-indigo-700 border-0 text-[11px] font-semibold px-3 py-1 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Super Admin
            </Badge>
          )}
          {!isSuperAdmin && isAdmin && (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[11px] font-semibold px-3 py-1 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Admin
            </Badge>
          )}
          {!canManage && (
            <Button
              size="sm"
              className="h-9 px-4 gradient-primary text-white border-0 font-medium shadow-sm rounded-lg flex items-center gap-2"
              onClick={() => { resetForm(); setIsDialogOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5" /> New Request
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Clock} label="Pending" amount={sumBy("Pending")} color="amber" />
        <StatCard icon={CheckCircle2} label="Approved" amount={sumBy("Approved")} color="emerald" />
        <StatCard icon={XCircle} label="Rejected" amount={sumBy("Rejected")} color="red" />
        <StatCard icon={Wallet} label="Repaid" amount={sumBy("Repaid")} color="slate" />
      </div>

      {/* Records */}
      <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="py-3 border-b border-slate-100">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Type tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="h-8 bg-slate-100 rounded-lg p-0.5 gap-0.5">
                {(["all", "Advance Salary", "Loan"] as const).map((t) => (
                  <TabsTrigger
                    key={t}
                    value={t}
                    className="h-7 px-3 text-xs font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    {t === "all" ? "All" : t}
                    <Badge className="ml-1.5 bg-slate-200 text-slate-600 border-0 text-[9px] font-bold">
                      {t === "all"
                        ? visibleRecords.length
                        : visibleRecords.filter((r) => r.type === t).length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Search + filter */}
            <div className="flex gap-2">
              {canManage && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 w-36 text-xs bg-slate-50 border-slate-200 rounded-lg"
                  />
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 gap-1.5 text-xs border-slate-200 rounded-lg",
                      statusFilter !== "all" && "border-indigo-200 bg-indigo-50 text-indigo-600"
                    )}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    {statusFilter === "all" ? "Status" : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl shadow-lg bg-white">
                  {["all", "Pending", "Approved", "Rejected", "Repaid"].map((s) => (
                    <DropdownMenuItem
                      key={s}
                      className="text-xs font-medium"
                      onClick={() => setStatusFilter(s)}
                    >
                      {s === "all" ? "All Status" : s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-slate-200 rounded-lg"
                onClick={load}
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-slate-400">Loading...</div>
          ) : visibleRecords.length === 0 ? (
            <div className="py-12 text-center">
              <HandCoins className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No records found.</p>
              {!canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-lg text-xs"
                  onClick={() => { resetForm(); setIsDialogOpen(true); }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Create Request
                </Button>
              )}
            </div>
          ) : (
            visibleRecords.map((r) => {
              const statusBadge = STATUS_BADGE[r.status] || "bg-slate-100 text-slate-600";
              const empName = getEmployeeName(r.employeeId);
              const isLoan = r.type === "Loan";

              return (
                <div
                  key={r._id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-all"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                          isLoan ? "bg-violet-50" : "bg-indigo-50"
                        )}
                      >
                        {isLoan ? (
                          <Landmark className="h-4 w-4 text-violet-400" />
                        ) : (
                          <HandCoins className="h-4 w-4 text-indigo-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-slate-700">{empName}</p>
                          <Badge
                            className={cn(
                              "text-[9px] font-bold border-0",
                              isLoan
                                ? "bg-violet-100 text-violet-600"
                                : "bg-indigo-100 text-indigo-600"
                            )}
                          >
                            {r.type}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <CalendarDays className="h-3 w-3" />
                          {r.requestDate
                            ? format(new Date(r.requestDate), "dd MMM yyyy")
                            : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-base font-bold text-slate-800 flex items-center gap-0.5">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {(r.amount || 0).toLocaleString("en-IN")}
                      </p>
                      <Badge
                        className={cn("text-[10px] font-semibold border-0", statusBadge)}
                      >
                        {r.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Reason */}
                  <p className="text-[11px] text-slate-500 italic bg-white border border-slate-100 rounded-lg px-3 py-2 mb-2">
                    "{r.reason}"
                  </p>

                  {/* Installment plan / repayment progress — Loan only, once approved */}
                  {isLoan && r.status !== "Pending" && r.status !== "Rejected" && (Number(r.monthlyInstallmentAmount) > 0 || (r.installments && r.installments.length > 0)) && (
                    <div className="text-[11px] text-slate-500 bg-violet-50/60 border border-violet-100 rounded-lg px-3 py-2 mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>₹{(r.amount || 0).toLocaleString("en-IN")} total</span>
                      <span className="text-violet-400">·</span>
                      <span className="font-semibold text-violet-700">
                        ₹{Number(r.remainingAmount ?? r.amount ?? 0).toLocaleString("en-IN")} remaining
                      </span>
                      {Number(r.monthlyInstallmentAmount) > 0 && (
                        <>
                          <span className="text-violet-400">·</span>
                          <span>₹{Number(r.monthlyInstallmentAmount).toLocaleString("en-IN")}/month</span>
                        </>
                      )}
                      <span className="text-violet-400">·</span>
                      <span>{r.installments?.length || 0} installment(s) paid</span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-end">
                    {/* Admin actions */}
                    {canManage && (
                      <div className="flex gap-1.5 items-center flex-wrap justify-end">
                        {r.status === "Pending" && (
                          <>
                            {isLoan && (
                              <Input
                                type="number"
                                placeholder="Monthly installment (optional)"
                                value={installmentDrafts[r._id] || ""}
                                onChange={(e) => setInstallmentDrafts((p) => ({ ...p, [r._id]: e.target.value }))}
                                className="h-7 w-44 text-[11px] rounded-lg"
                              />
                            )}
                            <Button
                              size="sm"
                              className="h-7 px-3 text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                              onClick={() => {
                                const draft = Number(installmentDrafts[r._id]);
                                handleStatusChange(r._id, "Approved", isLoan && draft > 0 ? { monthlyInstallmentAmount: draft } : undefined);
                              }}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-3 text-[11px] text-red-500 border-red-200 hover:bg-red-50 rounded-lg"
                              onClick={() => handleStatusChange(r._id, "Rejected")}
                            >
                              <XCircle className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {r.status === "Approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-3 text-[11px] text-slate-600 border-slate-200 hover:bg-slate-50 rounded-lg"
                            onClick={() => handleStatusChange(r._id, "Repaid")}
                          >
                            <Wallet className="h-3 w-3 mr-1" /> Mark Repaid
                          </Button>
                        )}
                        {/* Only super_admin can delete */}
                        {isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-400 hover:bg-red-50 rounded-lg"
                            onClick={() => handleDelete(r._id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ── New Request Dialog ── */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border border-slate-200 shadow-2xl bg-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-white shrink-0">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
              <HandCoins className="h-5 w-5 shrink-0 text-indigo-500" />
              New Request
            </DialogTitle>
            <p className="text-sm text-slate-400 mt-0.5">
              Submit an advance salary or loan request.
            </p>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            {/* Request type toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Request Type *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(["Advance Salary", "Loan"] as RequestType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                      form.type === t
                        ? t === "Loan"
                          ? "bg-violet-500 text-white border-violet-500 shadow-sm"
                          : "bg-indigo-500 text-white border-indigo-500 shadow-sm"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {t === "Loan" ? (
                      <Landmark className="h-3.5 w-3.5" />
                    ) : (
                      <HandCoins className="h-3.5 w-3.5" />
                    )}
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Employee selector — super admin & admin only */}
            {canManage && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Employee *</Label>
                <Select
                  value={form.employeeId}
                  onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}
                >
                  <SelectTrigger className="h-9 rounded-lg bg-slate-50 border-slate-200 text-sm">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56 bg-white">
                    {employees
                      .filter((u) => {
                        const r =
                          typeof u.role === "string" ? u.role : u.role?.role || "";
                        return !["super_admin", "owner"].includes(r.toLowerCase());
                      })
                      .map((u) => (
                        <SelectItem key={u._id || u.id} value={u._id || u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Amount (₹) *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="number"
                  placeholder="e.g. 10000"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="pl-8 h-9 rounded-lg bg-slate-50 border-slate-200 text-sm"
                />
              </div>
            </div>


            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Reason *</Label>
              <textarea
                placeholder={
                  form.type === "Loan"
                    ? "Reason for loan (e.g. medical emergency, home repair...)"
                    : "Reason for advance salary..."
                }
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-300"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Notes (optional)</Label>
              <Input
                placeholder="Additional notes..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="h-9 rounded-lg bg-slate-50 border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
            <Button
              variant="ghost"
              onClick={() => { setIsDialogOpen(false); resetForm(); }}
              disabled={isSaving}
              className="rounded-lg font-semibold text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving || !form.employeeId || !form.amount || !form.reason}
              className={cn(
                "rounded-lg text-white border-0 font-semibold shadow-sm px-6 text-sm flex items-center gap-2",
                form.type === "Loan" ? "bg-violet-500 hover:bg-violet-600" : "gradient-primary"
              )}
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvanceSalaryPage;

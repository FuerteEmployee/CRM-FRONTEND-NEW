import { useEffect, useState, useCallback, useMemo } from "react";
import { Input } from "@/hrms/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/hrms/components/ui/card";
import { Badge } from "@/hrms/components/ui/badge";
import { Button } from "@/hrms/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/hrms/components/ui/tabs";
import {
  Landmark,
  Receipt,
  LayoutTemplate,
  ShieldCheck,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Search,
  X,
} from "lucide-react";
import { employeeApi } from "@/hrms/services/api";
import { useConfirm } from "@/hrms/contexts/ConfirmContext";
import { staffService } from "@/hrms/services/staffService";
import { DataTable } from "@/hrms/components/common/DataTable";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { hrmsbranchService, type HRMSBranch } from "@/hrms/services/hrmsbranchService";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hrms/components/ui/use-toast";
import { statusColor } from "@/hrms/components/staff/HRMSShared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";
import SalarySlipViewer from "@/hrms/components/payroll/SalarySlipViewer";
import SalaryTemplateBuilder from "@/hrms/components/payroll/SalaryTemplateBuilder";

const PayrollManagementPage = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { hasPermission, user } = useAuth();


  const [branches, setBranches] = useState<HRMSBranch[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [payroll, setPayroll] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    recordId: string | null;
    name: string;
  }>({ isOpen: false, recordId: null, name: "" });
  const [slipPayrollId, setSlipPayrollId] = useState<string | null>(null);

  // Every active employee (same people as the Staff Directory) — used to also
  // list staff who have no payslip for the month, so both screens match.
  const [employees, setEmployees] = useState<any[]>([]);
  const idOf = (v: any) => String((v && typeof v === "object" ? v._id || v.id : v) || "");

  // Staff without a payslip this month: "no_salary" (no salary set up — payroll
  // skips them) or "not_generated" (salary set, Generate not run for them yet).
  const missingRows = useMemo(() => {
    const withPayslip = new Set(payroll.map((r: any) => idOf(r?.employeeId)));
    return employees
      .filter((e) => e.isActive !== false && e.status !== "inactive")
      .filter((e) => selectedStoreId === "all" || idOf(e.hrmsBranchId) === selectedStoreId || idOf(e.storeId) === selectedStoreId)
      .filter((e) => !withPayslip.has(idOf(e)))
      .map((e) => ({
        _id: `missing-${idOf(e)}`,
        _missing: e.salaryStructureId ? "not_generated" : "no_salary",
        employeeId: { _id: idOf(e), name: e.name, employeeCode: e.employeeCode },
      }));
  }, [employees, payroll, selectedStoreId]);

  // Search the month's list by employee name / code / status.
  const [searchQuery, setSearchQuery] = useState("");
  const visiblePayroll = useMemo(() => {
    const rows = [...payroll, ...missingRows];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row: any) =>
      [row?.employeeId?.name, row?.employeeId?.employeeCode, row?.status, row?.paymentStatus,
        row?._missing === "no_salary" ? "no salary set" : row?._missing ? "not generated" : ""]
        .some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [payroll, missingRows, searchQuery]);
  const noSalaryCount = missingRows.filter((r) => r._missing === "no_salary").length;
  const notGeneratedCount = missingRows.length - noSalaryCount;
  const hrmsBase = (typeof window !== "undefined" && window.location.pathname.includes("/staff/hrms")) ? "/staff/hrms" : "/admin/hrms";

  const load = useCallback(async () => {
    setIsLoading(true);
    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();
    const storeId = selectedStoreId === "all" ? "" : selectedStoreId || user?.storeId || "";
    try {
      const [branchesRes, payrollData, staff] = await Promise.all([
        hrmsbranchService.getAll({ status: "Active" }),
        employeeApi.getPayroll({ month, year, storeId: storeId || undefined }),
        staffService.getAll().catch(() => []),
      ]);
      if (branchesRes.success) {
        setBranches(branchesRes.data);
      }
      setPayroll(Array.isArray(payrollData) ? payrollData : []);
      setEmployees(Array.isArray(staff) ? staff : []);
    } catch {
      toast({ title: "Sync Failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedStoreId, user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGeneratePayroll = async () => {
    setIsGenerating(true);
    toast({
      title: "Generating Payroll…",
      description: "Please wait while we process salaries.",
    });

    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();
    // "All Branches" = every salaried employee in the company (no storeId),
    // including staff without a branch.
    const storeId = selectedStoreId === "all" ? "" : selectedStoreId || user?.storeId || "";

    try {
      const response: any = await employeeApi.generatePayroll({ month, year, ...(storeId ? { storeId } : {}) });
      if (response.success || response.count !== undefined) {
        const skipped = Number(response.skippedNoSalary) || 0;
        toast({
          title: "Success",
          description:
            `Generated payroll for ${response.count || 0} employees${selectedStoreId === "all" ? " across all branches" : ""}.` +
            (skipped ? ` ${skipped} active employee(s) skipped — no salary set (Staff → Edit → Salary & Banking).` : ""),
        });
        load();
      } else {
        toast({
          title: "Generation Failed",
          description: response.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.response?.data?.message || error.message || "Failed to generate",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeletePayroll = async (id: string) => {
    const ok = await confirm({
      title: "Delete Payroll Record",
      description:
        "This payroll record will be permanently deleted. This action cannot be undone.",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await employeeApi.deletePayroll(id);
      toast({ title: "Success", description: "Payroll record deleted." });
      setPayroll((prev) => prev.filter((item: any) => item._id !== id));
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };

  const handlePayPayroll = async (id: string) => {
    try {
      await employeeApi.payPayroll(id);
      toast({ title: "Success", description: "Marked payroll as Paid." });
      load();
    } catch (error: any) {
      toast({ title: "Action Failed", description: error.message, variant: "destructive" });
    }
  };

  if (!hasPermission("view_payroll")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center p-8">
        <div className="h-20 w-20 rounded-3xl bg-red-50 flex items-center justify-center">
          <ShieldCheck className="h-10 w-10 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
        <Button variant="outline" onClick={() => navigate("/")}>
          Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 space-y-4 p-4">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            Salary Management
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Review, process, and customise salary slips for all staff
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {branches.length > 0 && (
            <div className="w-[180px]">
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger className="h-10 text-xs font-semibold rounded-xl bg-white border-slate-200 shadow-sm">
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                  <SelectItem
                    value="all"
                    className="text-xs font-semibold py-2 rounded-lg text-indigo-600"
                  >
                    All Branches
                  </SelectItem>
                  {branches.map((b) => (
                    <SelectItem
                      key={b.id || b._id}
                      value={(b.id || b._id)!}
                      className="text-xs font-medium py-2 rounded-lg"
                    >
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Month selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-600"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setMonth(d.getMonth() - 1);
                setSelectedDate(d);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-bold text-slate-700 px-3 uppercase tracking-wider min-w-[100px] text-center">
              {selectedDate.toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-600"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setMonth(d.getMonth() + 1);
                setSelectedDate(d);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            className="gradient-primary text-white rounded-xl flex items-center gap-2 font-medium"
            onClick={handleGeneratePayroll}
            disabled={isGenerating}
          >
            {isGenerating && <RefreshCw className="h-4 w-4 animate-spin" />}
            Generate {selectedDate.toLocaleDateString("en-US", { month: "short" })}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="payroll" className="w-full">
        <TabsList className="rounded-xl bg-white border border-slate-200 shadow-sm p-1 mb-2 w-auto inline-flex">
          <TabsTrigger
            value="payroll"
            className="rounded-lg text-xs font-semibold px-4 data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5"
          >
            <Landmark className="h-3.5 w-3.5" />
            Payroll
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="rounded-lg text-xs font-semibold px-4 data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5"
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            Slip Templates
          </TabsTrigger>
        </TabsList>

        {/* ── Payroll Tab ── */}
        <TabsContent value="payroll">
          <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden [&>.space-y-4>div]:rounded-none [&>.space-y-4>div]:border-0 [&>.space-y-4>div]:shadow-none">
            <CardHeader className="py-4 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-primary" />
                  Monthly Payroll
                  <Badge className="bg-slate-100 text-slate-600 border-0 text-[10px] font-semibold">
                    {payroll.length} payslip{payroll.length === 1 ? "" : "s"}
                  </Badge>
                  {noSalaryCount > 0 && (
                    <Badge className="bg-red-50 text-red-600 border-0 text-[10px] font-semibold">{noSalaryCount} no salary set</Badge>
                  )}
                  {notGeneratedCount > 0 && (
                    <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px] font-semibold">{notGeneratedCount} not generated</Badge>
                  )}
                  {searchQuery && (
                    <Badge className="bg-slate-100 text-slate-600 border-0 text-[10px] font-semibold">
                      showing {visiblePayroll.length}
                    </Badge>
                  )}
                </CardTitle>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search employee name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-8 h-9 rounded-lg border-slate-200 bg-slate-50 text-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <DataTable
              data={visiblePayroll}
              isLoading={isLoading}
              emptyMessage={searchQuery
                ? `No employee matching "${searchQuery}" in ${selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
                : `No payroll records for ${selectedDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}`}
              columns={[
                {
                  header: "Employee",
                  accessorKey: (row: any) => (
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {row?.employeeId?.name || "N/A"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {row?.employeeId?.employeeCode || "—"}
                      </p>
                    </div>
                  ),
                },
                {
                  header: "Period",
                  accessorKey: (row: any) => (
                    <span className="text-sm font-medium text-slate-600">
                      {row && !row._missing ? `${row.month}/${row.year}` : "—"}
                    </span>
                  ),
                },
                {
                  header: "Days",
                  accessorKey: (row: any) => row?._missing ? <div className="text-center text-slate-300">—</div> : (
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700">
                        {row?.payableDays}
                      </p>
                      <p className="text-[10px] text-slate-400">P: {row?.presentDays}</p>
                    </div>
                  ),
                },
                {
                  header: "Net Salary",
                  accessorKey: (row: any) => row?._missing ? (
                    <div className="text-right text-[11px] text-slate-400">
                      {row._missing === "no_salary" ? "No salary set — payroll skips" : "Salary set — click Generate"}
                    </div>
                  ) : (
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">
                        ₹{row?.netSalary?.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Gross: ₹{row?.grossSalary?.toLocaleString("en-IN")}
                      </p>
                    </div>
                  ),
                },
                {
                  header: "Status",
                  accessorKey: (row: any) => {
                    if (row?._missing) {
                      return (
                        <Badge className={`text-[10px] font-semibold border-0 pointer-events-none ${row._missing === "no_salary" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {row._missing === "no_salary" ? "No salary set" : "Not generated"}
                        </Badge>
                      );
                    }
                    const c = statusColor(row?.status);
                    return (
                      <Badge
                        className={`text-[10px] font-semibold border-0 bg-${c}-100 text-${c}-700 hover:bg-${c}-100 pointer-events-none`}
                      >
                        {row?.status}
                      </Badge>
                    );
                  },
                },
                {
                  header: "Payment",
                  accessorKey: (row: any) => {
                    if (row?._missing) return <div className="text-center text-slate-300">—</div>;
                    const isPaid =
                      row?.paymentStatus === "Paid" || row?.status === "paid";
                    const bg = isPaid
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                      : "bg-orange-100 text-orange-800 hover:bg-orange-100";

                    let paidDateStr = "";
                    if (isPaid && row?.paidAt) {
                      try {
                        paidDateStr = new Date(row.paidAt).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        });
                      } catch (_) { }
                    }

                    return (
                      <div className="flex flex-col items-center gap-0.5">
                        <Badge
                          className={`text-[10px] font-bold border-0 pointer-events-none ${bg}`}
                        >
                          {isPaid ? "Paid" : "Due"}
                        </Badge>
                        {paidDateStr && (
                          <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap mt-0.5">
                            {paidDateStr}
                          </span>
                        )}
                      </div>
                    );
                  },
                },
                {
                  header: "",
                  id: "actions",
                  accessorKey: (row: any) => row?._missing ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-[11px] rounded-lg"
                        title={row._missing === "no_salary" ? "Open the employee and set Salary / Basic" : "Open the employee's salary details"}
                        onClick={() => navigate(`${hrmsBase}/staff/users/edit/${row.employeeId._id}`)}
                      >
                        {row._missing === "no_salary" ? "Set Salary" : "View Salary"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10"
                        title="View Salary Slip"
                        onClick={() => setSlipPayrollId(row._id)}
                      >
                        <Receipt className="h-3.5 w-3.5" />
                      </Button>
                      {row?.paymentStatus !== "Paid" && row?.status !== "paid" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              recordId: row._id,
                              name: row?.employeeId?.name || "Employee",
                            })
                          }
                          title="Mark as Paid"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeletePayroll(row._id)}
                        title="Delete Record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </TabsContent>

        {/* ── Templates Tab ── */}
        <TabsContent value="templates">
          <SalaryTemplateBuilder />
        </TabsContent>
      </Tabs>

      {/* ── Salary Slip Viewer ── */}
      {slipPayrollId && (
        <SalarySlipViewer
          payrollId={slipPayrollId}
          onClose={() => setSlipPayrollId(null)}
        />
      )}

      {/* ── Mark Paid Confirmation ── */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full mx-4 transform transition-all scale-100 animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4 border border-emerald-100">
                <CheckCircle className="h-7 w-7 text-emerald-500" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Confirm Payment</h3>
              <p className="text-slate-400 text-xs px-2 mb-6">
                Are you sure you want to mark the monthly salary for{" "}
                <strong className="text-slate-700">{confirmModal.name}</strong> as fully
                paid?
              </p>
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl text-slate-600 font-medium h-10 border-slate-200"
                  onClick={() =>
                    setConfirmModal({ isOpen: false, recordId: null, name: "" })
                  }
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl text-white font-medium bg-emerald-600 hover:bg-emerald-700 border-0 h-10"
                  onClick={async () => {
                    const id = confirmModal.recordId;
                    if (id) {
                      await handlePayPayroll(id);
                      setConfirmModal({ isOpen: false, recordId: null, name: "" });
                    }
                  }}
                >
                  Mark Paid
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollManagementPage;

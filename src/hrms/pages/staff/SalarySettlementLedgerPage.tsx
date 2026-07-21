import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/hrms/components/ui/card";
import { Badge } from "@/hrms/components/ui/badge";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import { Skeleton } from "@/hrms/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/hrms/components/ui/dialog";
import { ArrowUp, ArrowDown, FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { salarySettlementService, type SalarySettlementRecord } from "@/hrms/services/salarySettlementService";
import { managingCompanyService, type ManagingCompany } from "@/hrms/services/managingCompanyService";
import { staffService } from "@/hrms/services/staffService";
import { toast } from "@/hrms/components/ui/use-toast";
import { useConfirm } from "@/hrms/contexts/ConfirmContext";
import { cn } from "@/hrms/lib/utils";

// managingCompanyId / employeeId come back populated (objects) from list/history reads
const companyName = (val: string | { _id: string; name: string } | undefined) =>
  typeof val === "object" && val ? val.name : "—";

const SalarySettlementLedgerPage = () => {
  const confirm = useConfirm();
  const [settlements, setSettlements] = useState<SalarySettlementRecord[]>([]);
  const [companies, setCompanies] = useState<ManagingCompany[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [managingCompanyId, setManagingCompanyId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [direction, setDirection] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number | null>(null);

  // Add-to-settlement dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addEmployeeId, setAddEmployeeId] = useState<string>("");
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    loadData();
  }, [month, year, managingCompanyId, status, direction]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [settlementsData, companiesData, employeesData] = await Promise.all([
        salarySettlementService.list({
          month: Number(month),
          year: Number(year),
          managingCompanyId: managingCompanyId === "all" ? undefined : managingCompanyId,
          status: status === "all" ? undefined : status,
          direction: direction === "all" ? undefined : direction,
        }),
        managingCompanyService.list(),
        staffService.getAll(),
      ]);

      setSettlements(settlementsData);
      setCompanies(companiesData);
      setEmployees(employeesData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // employeeId arrives populated ({_id, name}) from the list API; fall back
  // to the staff list for any record where it's still a raw ID string.
  const employeeName = (s: SalarySettlementRecord) => {
    const emp: any = s.employeeId;
    if (emp && typeof emp === "object" && emp.name) return emp.name;
    return employees.find((e) => String(e._id || e.id) === String(emp))?.name || "—";
  };

  // Only branch-managed employees with a managing company assigned are eligible
  const eligibleEmployees = useMemo(() => {
    const alreadyInLedger = new Set(
      settlements.map((s) => String((s.employeeId as any)?._id || s.employeeId))
    );
    return employees.filter(
      (e: any) =>
        e.salaryManagedBy === "branch" &&
        e.managingCompanyId &&
        !alreadyInLedger.has(String(e._id || e.id))
    );
  }, [employees, settlements]);

  const summary = useMemo(() => {
    let totalEmployeeToGE = 0;
    let totalGEToEmployee = 0;

    settlements.forEach((s) => {
      const amount = s.settlementAmount || 0;
      if (s.direction === "employee_to_ge") {
        totalEmployeeToGE += amount;
      } else if (s.direction === "ge_to_employee") {
        totalGEToEmployee += amount;
      }
    });

    return {
      totalEmployeeToGE,
      totalGEToEmployee,
      net: totalEmployeeToGE - totalGEToEmployee,
    };
  }, [settlements]);

  const handleAddToSettlement = async () => {
    if (!addEmployeeId) {
      toast({ title: "Error", description: "Select an employee"});
      return;
    }

    setIsCalculating(true);
    try {
      await salarySettlementService.calculateEstimate(addEmployeeId, Number(month), Number(year));
      toast({ title: "Success", description: "Settlement estimate calculated" });
      setIsAddOpen(false);
      setAddEmployeeId("");
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to calculate estimate",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSetBrandSlipAmount = async (id: string, amount: number) => {
    setIsSaving(true);
    try {
      await salarySettlementService.setBrandSlipAmount(id, amount);
      toast({ title: "Success", description: "Brand slip amount updated" });
      setEditingId(null);
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkSettled = async (s: SalarySettlementRecord) => {
    const id = s._id || s.id || "";
    const dirLabel =
      s.direction === "employee_to_ge"
        ? `${employeeName(s)} pays GE`
        : s.direction === "ge_to_employee"
          ? `GE pays ${employeeName(s)}`
          : "no money movement";
    const ok = await confirm({
      title: "Settle this record?",
      description: `₹${(s.settlementAmount || 0).toLocaleString("en-IN")} — ${dirLabel}. This becomes permanent and immutable; the brand slip amount can never be edited afterwards.`,
      confirmText: "Settle",
      variant: "warning",
    });
    if (!ok) return;

    try {
      await salarySettlementService.markSettled(id);
      toast({ title: "Success", description: "Settlement marked as settled" });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to mark settled",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (s: SalarySettlementRecord) => {
    const id = s._id || s.id || "";
    const isSettled = s.status === "settled";
    const ok = await confirm({
      title: isSettled ? "Delete a SETTLED record?" : "Delete this record?",
      description: isSettled
        ? `This permanently removes a finalized settlement of ₹${(s.settlementAmount || 0).toLocaleString("en-IN")} for ${employeeName(s)} from the ledger. Only do this to correct a data-entry mistake.`
        : `Removes the pending settlement for ${employeeName(s)}. You can re-add them via "Add to Settlement" anytime.`,
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await salarySettlementService.remove(id, isSettled);
      toast({ title: "Deleted", description: "Settlement record removed" });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete record",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = () => {
    if (!settlements.length) {
      toast({ title: "Error", description: "No data to export", variant: "destructive" });
      return;
    }

    try {
      const sheetData = settlements.map((s, idx) => ({
        "S.No": idx + 1,
        Employee: employeeName(s),
        Company: companyName(s.managingCompanyId),
        Month: s.month,
        Year: s.year,
        "Decided Salary": s.decidedSalary,
        Target: s.targetAmount || "—",
        "Achieved Revenue": s.achievedRevenue || "—",
        "Est. Actual": s.computedActualSalary || "—",
        "Brand Slip": s.brandSlipAmount || "—",
        Variance: s.variance || "—",
        Direction: s.direction === "employee_to_ge" ? "GE Incoming" : s.direction === "ge_to_employee" ? "GE Outgoing" : "None",
        "Settlement Amount": s.settlementAmount || 0,
        Status: s.status,
      }));

      const ws = XLSX.utils.json_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Settlements");
      const colWidths = Object.keys(sheetData[0]).map((key) => ({
        wch: Math.max(key.length, ...sheetData.map((r: any) => String(r[key] ?? "").length)) + 2,
      }));
      ws["!cols"] = colWidths;
      XLSX.writeFile(wb, `Salary_Settlements_${month}_${year}.xlsx`);
    } catch (error) {
      toast({ title: "Error", description: "Export failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Salary Settlement Ledger</h1>
          <p className="text-sm text-muted-foreground">Track employee↔GE salary settlements</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add to Settlement
          </Button>
          <Button onClick={handleExportExcel} className="gap-2" variant="outline">
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Employee → GE Incoming
                </p>
                <p className="text-3xl font-bold text-blue-700">
                  ₹{summary.totalEmployeeToGE.toLocaleString("en-IN")}
                </p>
              </div>
              <ArrowUp className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  GE → Employee Outgoing
                </p>
                <p className="text-3xl font-bold text-emerald-700">
                  ₹{summary.totalGEToEmployee.toLocaleString("en-IN")}
                </p>
              </div>
              <ArrowDown className="h-6 w-6 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-slate-50 to-gray-50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Net Settlement
                </p>
                <p className={cn(
                  "text-3xl font-bold",
                  summary.net > 0 ? "text-blue-700" : summary.net < 0 ? "text-emerald-700" : "text-slate-600"
                )}>
                  ₹{summary.net.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="py-4 border-b">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Month</label>
              <Input
                type="number"
                min="1"
                max="12"
                value={month}
                onChange={(e) => setMonth(String(Number(e.target.value)).padStart(2, "0"))}
                className="h-9 text-sm rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Year</label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="h-9 text-sm rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Company</label>
              <Select value={managingCompanyId} onValueChange={setManagingCompanyId}>
                <SelectTrigger className="h-9 text-sm rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c._id || c.id} value={c._id || c.id || ""}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 text-sm rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_slip">Pending Slip</SelectItem>
                  <SelectItem value="pending_settlement">Pending Settlement</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Direction</label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger className="h-9 text-sm rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Directions</SelectItem>
                  <SelectItem value="employee_to_ge">Employee → GE</SelectItem>
                  <SelectItem value="ge_to_employee">GE → Employee</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="py-4 border-b">
          <CardTitle className="text-base">Settlements ({settlements.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-none" />
              ))}
            </div>
          ) : settlements.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No settlements found. Click "Add to Settlement" to calculate one for an employee.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Employee</th>
                  <th className="text-left py-3 px-4 font-semibold">Company</th>
                  <th className="text-right py-3 px-4 font-semibold">Decided</th>
                  <th className="text-right py-3 px-4 font-semibold">Est.</th>
                  <th className="text-right py-3 px-4 font-semibold">Brand Slip</th>
                  <th className="text-right py-3 px-4 font-semibold">Settlement</th>
                  <th className="text-center py-3 px-4 font-semibold">Direction</th>
                  <th className="text-center py-3 px-4 font-semibold">Status</th>
                  <th className="text-right py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {settlements.map((s) => {
                  const isSettled = s.status === "settled";
                  const recordId = s._id || s.id || "";
                  return (
                    <tr key={recordId} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium">{employeeName(s)}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {companyName(s.managingCompanyId)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">₹{s.decidedSalary.toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4 text-right text-xs">
                        {s.flags?.noTargetSet ? (
                          <span className="text-amber-600 font-semibold">No target</span>
                        ) : (
                          s.computedActualSalary ? `₹${s.computedActualSalary.toLocaleString("en-IN")}` : "—"
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isSettled ? (
                          <span className="font-semibold">
                            {s.brandSlipAmount ? `₹${s.brandSlipAmount.toLocaleString("en-IN")}` : "—"}
                          </span>
                        ) : editingId === recordId ? (
                          <Input
                            type="number"
                            value={editValue ?? ""}
                            onChange={(e) => setEditValue(Number(e.target.value) || null)}
                            className="h-7 text-xs w-24"
                            autoFocus
                          />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingId(recordId);
                              setEditValue(s.brandSlipAmount ?? null);
                            }}
                            className="text-xs h-6"
                          >
                            {s.brandSlipAmount ? `₹${s.brandSlipAmount.toLocaleString("en-IN")}` : "Enter"}
                          </Button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {s.settlementAmount ? `₹${s.settlementAmount.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            s.direction === "employee_to_ge"
                              ? "default"
                              : s.direction === "ge_to_employee"
                                ? "secondary"
                                : "outline"
                          }
                          className={
                            s.direction === "employee_to_ge"
                              ? "bg-blue-100 text-blue-700"
                              : s.direction === "ge_to_employee"
                                ? "bg-emerald-100 text-emerald-700"
                                : ""
                          }
                        >
                          {s.direction === "employee_to_ge"
                            ? "↑ GE"
                            : s.direction === "ge_to_employee"
                              ? "↓ Emp"
                              : "—"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            isSettled
                              ? "default"
                              : s.status === "pending_settlement"
                                ? "secondary"
                                : "outline"
                          }
                          className={
                            isSettled
                              ? "bg-emerald-100 text-emerald-700"
                              : s.status === "pending_settlement"
                                ? "bg-amber-100 text-amber-700"
                                : ""
                          }
                        >
                          {isSettled
                            ? "Settled"
                            : s.status === "pending_settlement"
                              ? "Pending"
                              : "Slip?"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        {editingId === recordId ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (editValue !== null) {
                                  handleSetBrandSlipAmount(recordId, editValue);
                                }
                                setEditingId(null);
                              }}
                              disabled={isSaving || editValue === null}
                              className="h-7 text-xs"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                              className="h-7 text-xs text-slate-400"
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            {!isSettled && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMarkSettled(s)}
                                disabled={s.brandSlipAmount === null || s.brandSlipAmount === undefined}
                                className="h-7 text-xs text-emerald-600"
                              >
                                Settle
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(s)}
                              title={isSettled ? "Delete settled record (admin correction)" : "Delete record"}
                              className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Add to Settlement Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Add to Settlement</DialogTitle>
            <DialogDescription>
              Calculate a settlement estimate for {month}/{year}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">
                Employee (branch-managed only)
              </label>
              <Select value={addEmployeeId} onValueChange={setAddEmployeeId}>
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleEmployees.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No eligible employees for this period — assign "Branch Managed" +
                      a Managing Company on the staff form first.
                    </div>
                  ) : (
                    eligibleEmployees.map((e: any) => (
                      <SelectItem key={e._id || e.id} value={String(e._id || e.id)}>
                        {e.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-lg"
                onClick={() => setIsAddOpen(false)}
                disabled={isCalculating}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-lg"
                onClick={handleAddToSettlement}
                disabled={isCalculating || !addEmployeeId}
              >
                {isCalculating ? "Calculating..." : "Calculate"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalarySettlementLedgerPage;

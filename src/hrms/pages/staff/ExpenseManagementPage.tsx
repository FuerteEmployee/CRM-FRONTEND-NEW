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
  Receipt,
  Filter,
  Search,
  ShieldCheck,
  MoreVertical,
} from "lucide-react";
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
import type { EmployeeExpense, User } from "@/hrms/types";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/hrms/lib/utils";
import { toast } from "@/hrms/components/ui/use-toast";
import { statusColor } from "@/hrms/components/staff/HRMSShared";

const ExpenseManagementPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [employees, setEmployees] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<EmployeeExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState("all");

  const load = async () => {
    setIsLoading(true);
    try {
      const [staff, expensesData] = await Promise.all([
        staffService.getAll(),
        employeeApi.getExpenses(),
      ]);
      setEmployees(Array.isArray(staff) ? staff : []);
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
    } catch {
      toast({ title: "Sync Failed", description: "Could not load expense records.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getEmployeeName = (idOrObj: any): string => {
    if (!idOrObj) return "Staff Member";
    if (typeof idOrObj === "object") return idOrObj.name || "Staff Member";
    const emp = employees.find((e) => String((e as any)._id || e.id) === String(idOrObj));
    return emp ? emp.name : "Staff Member";
  };

  if (!hasPermission("manage_expenses")) {
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
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Expense Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">Review, approve, and process staff expense claims</p>
        </div>
      </div>

      <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="py-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-500" />
              Claims
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input placeholder="Search description..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 w-44 text-xs bg-slate-50 border-slate-200 rounded-lg" />
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
          {expenses
            .filter((exp) => {
              const name = getEmployeeName((exp as any).createdBy || exp.employeeId);
              const matchSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase()) || name.toLowerCase().includes(searchQuery.toLowerCase());
              const matchStatus = expenseStatusFilter === "all" || exp.status.toLowerCase() === expenseStatusFilter.toLowerCase();
              return matchSearch && matchStatus;
            })
            .map((exp) => {
              const c = statusColor(exp.status);
              return (
                <div key={exp._id || exp.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center gap-4 hover:bg-white transition-all">
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
                        {exp.status === "Pending" && (
                          <>
                            <DropdownMenuItem className="text-xs font-medium text-emerald-600" onClick={() => employeeApi.approveExpense(exp._id || exp.id).then(() => { setExpenses((p) => p.map((e) => ((e._id === exp._id || e.id === exp.id) ? { ...e, status: "Approved" } : e))); toast({ title: "Approved" }); })}>Approve</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs font-medium text-red-500" onClick={() => employeeApi.rejectExpense(exp._id || exp.id).then(() => { setExpenses((p) => p.map((e) => ((e._id === exp._id || e.id === exp.id) ? { ...e, status: "Rejected" } : e))); toast({ title: "Rejected" }); })}>Reject</DropdownMenuItem>
                          </>
                        )}
                        {exp.status.toLowerCase() === "approved" && (
                          <DropdownMenuItem className="text-xs font-medium text-blue-600" onClick={() => employeeApi.payExpense(exp._id || exp.id).then(() => { setExpenses((p) => p.map((e) => ((e._id === exp._id || e.id === exp.id) ? { ...e, status: "Paid" } : e))); toast({ title: "Paid" }); })}>Mark as Paid</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          {expenses.length === 0 && !isLoading && (
            <div className="py-12 text-center">
              <Receipt className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No expense claims found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseManagementPage;

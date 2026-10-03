import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/hrms/components/ui/card";
import { Badge } from "@/hrms/components/ui/badge";
import { Button } from "@/hrms/components/ui/button";
import { Progress } from "@/hrms/components/ui/progress";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { useStore } from "@/hrms/contexts/StoreContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/hrms/lib/utils";
import { DataTable } from "@/hrms/components/common/DataTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/hrms/components/ui/dialog";
import { Input } from "@/hrms/components/ui/input";
import { Label } from "@/hrms/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/hrms/components/ui/table";
import {
  Target as TargetIcon,
  TrendingUp,
  ShieldCheck,
  IndianRupee,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { toast } from "@/hrms/hooks/use-toast";
import { useConfirm } from "@/hrms/contexts/ConfirmContext";
import { targetService, TargetProfile } from "@/hrms/services/targetService";
import { userApi } from "@/hrms/services/api";
import { User } from "@/hrms/types";
import { apiClient } from "@/hrms/services/apiClient";

const TargetsManagementPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { selectedStoreId } = useStore();
  const confirm = useConfirm();

  // State
  const [targets, setTargets] = useState<TargetProfile[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TargetProfile | null>(null);

  // Form State
  const [selectedUser, setSelectedUser] = useState("");
  const [revenueTarget, setRevenueTarget] = useState("");
  const [marginTarget, setMarginTarget] = useState("");
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const fetchTargets = async () => {
    const startTime = Date.now();
    setLoading(true);

    // Safety timeout of 10 seconds (maximum duration)
    const timeoutId = setTimeout(() => {
      setLoading(false);
      toast({
        title: "Request Timed Out",
        description: "The database query took too long. Please try refreshing.",
        variant: "destructive",
      });
    }, 10000);

    try {
      const data = await targetService.getTargets(selectedStoreId);

      // Compute actual revenue achieved per salesperson from invoices + orders
      const revenueMap: Record<string, number> = {};
      const periods = [...new Set(data.map((t: any) => `${t.month}-${t.year}`))];

      await Promise.all(
        periods.map(async (period) => {
          const [month, year] = (period as string).split("-").map(Number);
          const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

          const [invRes, ordRes] = await Promise.all([
            apiClient.get(`/sales-invoices?startDate=${startDate}&endDate=${endDate}&limit=10000`).catch(() => ({ data: [] })),
            apiClient.get(`/orders?startDate=${startDate}&endDate=${endDate}&limit=10000`).catch(() => ({ data: [] })),
          ]);

          const docs = [
            ...(invRes.data?.data || invRes.data || []),
            ...(ordRes.data?.data || ordRes.data || []),
          ];

          docs.forEach((doc: any) => {
            const spId = typeof doc.salespersonId === "object" ? doc.salespersonId?._id : doc.salespersonId;
            if (!spId) return;
            const value =
              doc.summary?.netInvoiceValue ||
              doc.summary?.total ||
              doc.totalAmount ||
              doc.grandTotal ||
              0;
            const key = `${spId}-${month}-${year}`;
            revenueMap[key] = (revenueMap[key] || 0) + value;
          });
        })
      );

      const enriched = data.map((t: any) => ({
        ...t,
        revenueAchieved: revenueMap[`${t.employeeId}-${t.month}-${t.year}`] || t.revenueAchieved || 0,
      }));

      setTargets(enriched);
    } catch (error: any) {
      toast({
        title: "Error loading targets",
        description: error.message || "Failed to retrieve target records",
        variant: "destructive",
      });
    } finally {
      clearTimeout(timeoutId);
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 1000 - elapsedTime); // 1s minimum delay
      setTimeout(() => {
        setLoading(false);
      }, remainingTime);
    }
  };

  const fetchUsers = async () => {
    try {
      // No branch filter on salespersons — branchId is optional on salesperson records
      const [spRes, usersRes] = await Promise.all([
        apiClient.get("/salespersons"),
        apiClient.get("/users?limit=1000").catch(() => ({ data: [] })),
      ]);
      const spList: any[] = spRes.data?.data || spRes.data || [];
      const users: any[] = usersRes.data?.data || usersRes.data || [];

      // Track userIds that already have a salesperson record
      const spUserIds = new Set<string>(
        spList
          .map((sp: any) => (typeof sp.userId === "object" ? sp.userId?._id : sp.userId))
          .filter(Boolean)
      );

      // Active salesperson records, deduplicated by userId
      const seenUserIds = new Set<string>();
      const spItems = spList
        .filter((sp: any) => sp.isActive !== false)
        .filter((sp: any) => {
          const uid = typeof sp.userId === "object" ? sp.userId?._id : sp.userId;
          if (!uid || seenUserIds.has(uid)) return false;
          seenUserIds.add(uid);
          return true;
        })
        .map((sp: any) => {
          const userIdStr = typeof sp.userId === "object" ? sp.userId?._id : sp.userId;
          const user = users.find((u: any) => u._id === userIdStr || u.id === userIdStr);
          return {
            id: sp._id,
            _id: sp._id,
            name: user?.name || sp.userId?.name || "Unknown",
            email: user?.email || "",
            role: sp.salespersonCode || "Salesperson",
            storeId: sp.branchId || user?.storeId || "",
            status: "active" as const,
            permissions: [],
          };
        });

      // Also include users with isSalesperson=true who have no salesperson record yet
      const extraItems = users
        .filter(
          (u: any) =>
            u.isSalesperson === true &&
            u.status !== "inactive" &&
            u.isActive !== false &&
            !spUserIds.has(u._id) &&
            !spUserIds.has(u.id)
        )
        .map((u: any) => ({
          id: u._id || u.id,
          _id: u._id || u.id,
          name: u.name || "Unknown",
          email: u.email || "",
          role: "Salesperson",
          storeId: u.storeId || u.branchId || "",
          status: "active" as const,
          permissions: [],
        }));

      setUsersList([...spItems, ...extraItems]);
    } catch (error: any) {
      console.error("Failed to load salesperson list:", error);
    }
  };

  useEffect(() => {
    if (hasPermission("view_targets")) {
      fetchTargets();
      fetchUsers();
    }
  }, [selectedStoreId]);

  if (!hasPermission("view_targets")) {
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

  const handleNewTarget = () => {
    setEditingTarget(null);
    setSelectedUser("");
    setRevenueTarget("");
    setMarginTarget("15");
    setMonth(new Date().getMonth() + 1);
    setYear(new Date().getFullYear());
    setDialogOpen(true);
  };

  const handleEditTarget = (target: TargetProfile) => {
    setEditingTarget(target);
    setSelectedUser(target.employeeId);
    setRevenueTarget(target.revenueTarget.toString());
    setMarginTarget(target.marginTarget.toString());
    setMonth(target.month);
    setYear(target.year);
    setDialogOpen(true);
  };

  const handleDeleteTarget = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Delete Target",
      description: "Are you sure you want to delete this target?",
      confirmText: "Confirm",
      cancelText: "Cancel",
      variant: "danger"
    });
    if (!isConfirmed) return;
    try {
      await targetService.deleteTarget(id);
      setTargets((prev) => prev.filter((t) => t._id !== id));
      toast({
        title: "Target Deleted",
        description: "Staff target has been successfully removed.",
      });
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete target",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !revenueTarget || !marginTarget) {
      toast({
        title: "Validation Error",
        description: "Please fill out all required fields",
        variant: "destructive",
      });
      return;
    }

    const payload: Partial<TargetProfile> = {
      employeeId: selectedUser,
      branchId: selectedStoreId || "",
      month: Number(month),
      year: Number(year),
      revenueTarget: Number(revenueTarget),
      marginTarget: Number(marginTarget),
    };

    try {
      if (editingTarget?._id) {
        await targetService.updateTarget(editingTarget._id, payload);
        toast({
          title: "Target Updated",
          description: "Staff performance target updated successfully.",
        });
      } else {
        await targetService.createTarget(payload);
        toast({
          title: "Target Set",
          description: "New staff performance target allocated successfully.",
        });
      }
      fetchTargets();
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Saving Failed",
        description: error.response?.data?.message || error.message || "Failed to save target record",
        variant: "destructive",
      });
    }
  };

  const totalPayout = targets.reduce((sum, t) => sum + (t.incentiveAmount || 0), 0);

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 space-y-6 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Performance Targets</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track sales goals, revenue achievements and incentives</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden [&>.space-y-4>div]:rounded-none [&>.space-y-4>div]:border-0 [&>.space-y-4>div]:shadow-none">
          <CardHeader className="py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                  <TargetIcon className="h-4 w-4 text-primary" />
                  Staff Targets
                </CardTitle>
              </div>
              <Button
                onClick={handleNewTarget}
                size="sm"
                className="h-9 px-5 bg-primary text-white hover:bg-primary/90 rounded-lg text-xs font-bold shadow-sm"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Set New Target
              </Button>
            </div>
          </CardHeader>
          {loading ? (
            <div className="p-6 space-y-4 animate-fade-in">
                <div className="space-y-3">
                  {/* Header row skeleton */}
                  <div className="grid grid-cols-6 gap-4 pb-3 border-b border-slate-100">
                    <div className="h-4 bg-slate-200/60 rounded animate-pulse col-span-1"></div>
                    <div className="h-4 bg-slate-200/60 rounded animate-pulse col-span-2"></div>
                    <div className="h-4 bg-slate-200/60 rounded animate-pulse col-span-1"></div>
                    <div className="h-4 bg-slate-200/60 rounded animate-pulse col-span-1"></div>
                    <div className="h-4 bg-slate-200/60 rounded animate-pulse col-span-1"></div>
                  </div>
                  {/* Row skeletons */}
                  {[1, 2].map((row) => (
                    <div key={row} className="grid grid-cols-6 gap-4 py-4 items-center border-b border-slate-50 last:border-0">
                      <div className="space-y-2 col-span-1">
                        <div className="h-4 bg-slate-200/80 rounded animate-pulse w-3/4"></div>
                        <div className="h-3 bg-slate-200/50 rounded animate-pulse w-1/2"></div>
                      </div>
                      <div className="space-y-2 col-span-2">
                        <div className="flex justify-between w-full pr-4">
                          <div className="h-3 bg-slate-200/60 rounded animate-pulse w-1/3"></div>
                          <div className="h-3 bg-slate-200/60 rounded animate-pulse w-8"></div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full w-full overflow-hidden relative">
                          <div className="h-full bg-slate-200/80 rounded-full animate-pulse w-1/3"></div>
                        </div>
                      </div>
                      <div className="space-y-1.5 flex flex-col items-center col-span-1">
                        <div className="h-4 bg-slate-200/80 rounded animate-pulse w-10"></div>
                        <div className="h-3 bg-slate-200/50 rounded animate-pulse w-16"></div>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <div className="h-6 bg-slate-200/60 rounded-full animate-pulse w-14"></div>
                      </div>
                      <div className="col-span-1">
                        <div className="h-4 bg-slate-200/80 rounded animate-pulse w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          ) : (
              <DataTable
                data={targets}
                columns={[
                  {
                    header: "Salesperson",
                    accessorKey: (t: any) => {
                      const user = usersList.find((u) => u.id === t.employeeId);
                      return (
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{user?.name || t.name || "Unknown"}</p>
                          <p className="text-[10px] text-slate-400">{t.employeeIdCode}</p>
                        </div>
                      );
                    },
                  },
                  {
                    header: "Revenue Tracker",
                    accessorKey: (t: any) => {
                      const pct = t.revenueTarget > 0 ? (t.revenueAchieved / t.revenueTarget) * 100 : 0;
                      const remaining = Math.max(0, t.revenueTarget - t.revenueAchieved);
                      return (
                        <div className="w-full max-w-[280px] space-y-1.5">
                          <div className="flex justify-between text-[11px] font-semibold">
                            <span className="text-slate-600">
                              {remaining > 0 ? `₹${(remaining / 1000).toFixed(0)}k pending` : "Goal Achieved"}
                            </span>
                            <span className={pct >= 100 ? "text-emerald-500" : "text-primary"}>{pct.toFixed(0)}%</span>
                          </div>
                          <Progress value={pct} className="h-2 bg-slate-100" />
                        </div>
                      );
                    },
                  },
                  {
                    header: "Margin Target",
                    accessorKey: (t: any) => (
                      <div className="text-center">
                        <p className={cn("text-sm font-bold", t.actualMargin >= t.marginTarget ? "text-emerald-500" : "text-amber-500")}>
                          {t.actualMargin}%
                        </p>
                        <p className="text-[10px] text-slate-400">target {t.marginTarget}%</p>
                      </div>
                    ),
                  },
                  {
                    header: "Incentive Slab",
                    accessorKey: (t: any) => (
                      <Badge className="bg-accent text-accent-foreground border border-primary/20 font-bold text-xs">
                        {t.incentive}
                      </Badge>
                    ),
                  },
                  {
                    header: "Earned Incentive",
                    accessorKey: (t: any) => (
                      <p className="text-sm font-bold text-slate-700">
                        ₹{(t.incentiveAmount || 0).toLocaleString("en-IN")}
                      </p>
                    ),
                  },
                  {
                    header: "Actions",
                    accessorKey: (t: any) => (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-slate-100"
                          onClick={() => handleEditTarget(t)}
                        >
                          <Edit className="h-3.5 w-3.5 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-50 text-red-500"
                          onClick={() => handleDeleteTarget(t._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
          )}
            </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
              <CardHeader className="bg-primary py-4">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Incentive Slabs
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Achievement</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { range: "< 80%", rate: "0%", color: "text-slate-400" },
                    { range: "80–100%", rate: "0.5%", color: "text-primary" },
                    { range: "100–120%", rate: "1.0%", color: "text-emerald-500 font-semibold" },
                    { range: "> 120%", rate: "1.5%", color: "text-emerald-600 font-bold" },
                  ].map((s) => (
                    <TableRow key={s.range}>
                      <TableCell>{s.range}</TableCell>
                      <TableCell className={cn("text-right font-semibold", s.color)}>{s.rate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <Card className="border border-primary/10 bg-gradient-to-br from-accent/50 to-white shadow-sm overflow-hidden flex flex-col justify-center min-h-[180px]">
              <CardContent className="p-6 flex items-center gap-6">
                <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-md shadow-primary/10 shrink-0">
                  <IndianRupee className={cn("h-7 w-7 text-white", loading && "animate-pulse")} />
                </div>
                {loading ? (
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-primary/20 rounded animate-pulse w-24"></div>
                    <div className="h-8 bg-primary/30 rounded animate-pulse w-32"></div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-primary/70 uppercase tracking-wider mb-1">Est. Total Payout</p>
                    <p className="text-3xl font-extrabold text-primary">₹{totalPayout.toLocaleString("en-IN")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
      </div>

      {/* Target Set/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl border-0 p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-800">
                {editingTarget ? "Update Target Profile" : "Allocate Performance Target"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Define the sales revenue and product margin targets for employees.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Employee Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="employee" className="text-xs font-bold text-slate-500">Salesperson / Employee</Label>
                <Select
                  value={selectedUser}
                  onValueChange={setSelectedUser}
                  disabled={!!editingTarget}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {usersList.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="font-semibold text-xs text-slate-700">
                        {u.name} ({(u.role && typeof u.role === "object" ? u.role.label : u.role) || "Staff"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month & Year Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="month" className="text-xs font-bold text-slate-500">Target Month</Label>
                  <Select
                    value={month.toString()}
                    onValueChange={(val) => setMonth(Number(val))}
                    disabled={!!editingTarget}
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()} className="font-semibold text-xs text-slate-700">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="year" className="text-xs font-bold text-slate-500">Target Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={year}
                    disabled={!!editingTarget}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Revenue & Margin Targets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="revenueTarget" className="text-xs font-bold text-slate-500">Revenue Goal (₹)</Label>
                  <Input
                    id="revenueTarget"
                    type="number"
                    placeholder="e.g. 500000"
                    value={revenueTarget}
                    onChange={(e) => setRevenueTarget(e.target.value)}
                    className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="marginTarget" className="text-xs font-bold text-slate-500">Margin Target (%)</Label>
                  <Input
                    id="marginTarget"
                    type="number"
                    placeholder="e.g. 15"
                    value={marginTarget}
                    onChange={(e) => setMarginTarget(e.target.value)}
                    className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Achievements are calculated automatically from sales invoices */}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="h-10 rounded-xl border border-slate-200 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold"
              >
                {editingTarget ? "Save Changes" : "Allocate Target"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TargetsManagementPage;

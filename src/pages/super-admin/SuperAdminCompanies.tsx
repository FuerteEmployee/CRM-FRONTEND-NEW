import React, { useEffect, useState } from "react";
import {
  Building2, Plus, Search, Activity, Trash2,
  Package, CheckCircle2, XCircle, Settings, Clock,
  AlertTriangle, X, Mail, Lock, Eye, EyeOff, Edit, Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient as api } from "@/api/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { SuperAdminTablePageSkeleton } from "@/components/ui/page-skeleton";
import { useMinimumLoading } from "@/hooks/useMinimumLoading";

interface SaasPlan {
  _id: string;
  name: string;
  price: number;
  billing_cycle?: "monthly" | "yearly" | "lifetime";
  trial_days?: number;
  banner_warning_days?: number;
}

interface Owner {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
}

interface Tenant {
  _id: string;
  company_name: string;
  subdomain?: string;
  plan_id: SaasPlan | null;
  owner_id: Owner | null;
  status: "active" | "inactive" | "trial" | "expired";
  trial_ends_at?: string;
  billing_cycle_start?: string;
  billing_cycle_end?: string;
  createdAt: string;
}

const STATUS_CONFIG = {
  active:   { label: "Active",   icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  inactive: { label: "Inactive", icon: XCircle,      cls: "bg-red-50 text-red-700 border-red-200" },
  trial:    { label: "Trial",    icon: Clock,        cls: "bg-blue-50 text-blue-700 border-blue-200" },
  expired:  { label: "Expired",  icon: AlertTriangle, cls: "bg-orange-50 text-orange-700 border-orange-200" },
};

const DEFAULT_CREATE = { company_name: "", email: "", password: "", plan_id: "" };
const DEFAULT_MANAGE = { company_name: "", email: "", password: "", plan_id: "", status: "trial" as Tenant["status"] };

export default function SuperAdminCompanies() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [createForm, setCreateForm] = useState(DEFAULT_CREATE);
  const [manageForm, setManageForm] = useState(DEFAULT_MANAGE);
  const [showPassword, setShowPassword] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, plansRes] = await Promise.all([
        api.get("/super-admin/tenants"),
        api.get("/super-admin/plans"),
      ]);
      setTenants(tenantsRes);
      setPlans(plansRes);
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/super-admin/tenants", createForm);
      toast.success("Customer created successfully");
      setIsCreateOpen(false);
      setCreateForm(DEFAULT_CREATE);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create customer");
    }
  };

  const handleManageSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    try {
      await api.put(`/super-admin/tenants/${selectedTenant._id}`, manageForm);
      toast.success("Updated successfully");
      setIsManageOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/super-admin/tenants/${id}`);
      toast.success("Customer deleted");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const openManage = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setManageForm({
      company_name: tenant.company_name,
      email: tenant.owner_id?.email || "",
      password: "",
      plan_id: tenant.plan_id?._id || "",
      status: tenant.status,
    });
    setIsManageOpen(true);
  };

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      t.company_name.toLowerCase().includes(q) ||
      (t.owner_id?.email || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    active:   tenants.filter((t) => t.status === "active").length,
    inactive: tenants.filter((t) => t.status === "inactive").length,
    trial:    tenants.filter((t) => t.status === "trial").length,
    expired:  tenants.filter((t) => t.status === "expired").length,
  };

  const StatusBadge = ({ status }: { status: Tenant["status"] }) => {
    const cfg = STATUS_CONFIG[status];
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
        <Icon className="h-3.5 w-3.5" />
        {cfg.label}
      </span>
    );
  };

  const showSkeleton = useMinimumLoading(loading);
  if (showSkeleton) return <SuperAdminTablePageSkeleton />;

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Customer</h1>
          <p className="text-gray-500 text-sm mt-1">Manage tenant customers, subscriptions, and account status.</p>
        </div>
        <Button onClick={() => { setCreateForm(DEFAULT_CREATE); setIsCreateOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["active", "trial", "inactive", "expired"] as const).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          const textCls = cfg.cls.split(" ").find((c) => c.startsWith("text-")) || "text-gray-600";
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              className={`bg-white border rounded-xl p-4 text-left transition-all shadow-sm hover:shadow-md ${
                statusFilter === s ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${textCls}`} />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{counts[s]}</p>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by company or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
          {statusFilter !== "all" && (
            <button
              onClick={() => setStatusFilter("all")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg"
            >
              {STATUS_CONFIG[statusFilter as Tenant["status"]]?.label} <X className="h-3 w-3" />
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 bg-blue-50 rounded-full mb-4">
              <Building2 className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">No customers found</h3>
            <p className="text-sm text-gray-400 max-w-sm">
              {search || statusFilter !== "all" ? "Try adjusting your search or filter." : "Add your first customer using the button above."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company Name</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email ID</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Banner Shows</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((tenant) => (
                  <tr key={tenant._id} className="hover:bg-gray-50 transition-colors group">
                    {/* Company */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {tenant.company_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">{tenant.company_name}</span>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-6 py-4">
                      {tenant.owner_id?.email ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                          {tenant.owner_id.email}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No owner</span>
                      )}
                    </td>
                    {/* Plan */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-300 flex-shrink-0" />
                        <span className="text-sm text-gray-700 font-medium">
                          {tenant.plan_id ? tenant.plan_id.name : <span className="text-gray-400 italic font-normal">No Plan</span>}
                        </span>
                      </div>
                    </td>
                    {/* Banner Shows */}
                    <td className="px-6 py-4">
                      {tenant.plan_id?.banner_warning_days ? (() => {
                        const d = tenant.plan_id.banner_warning_days!;
                        const label = d === 7 ? "7 days" : d === 30 ? "1 month" : d === 90 ? "3 months" : d === 180 ? "6 months" : `${d} days`;
                        const cls = d <= 7
                          ? "bg-red-50 text-red-600 border-red-200"
                          : d <= 30
                          ? "bg-amber-50 text-amber-600 border-amber-200"
                          : "bg-blue-50 text-blue-600 border-blue-200";
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
                            <Bell className="h-3 w-3" />
                            {label} before expiry
                          </span>
                        );
                      })() : (
                        <span className="text-xs text-gray-400 italic">Not set</span>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={tenant.status} />
                        {tenant.status === "trial" && (() => {
                          const trialDays = tenant.plan_id?.trial_days ?? 14;
                          const trialEnd = tenant.trial_ends_at
                            || new Date(new Date(tenant.createdAt).getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString();
                          const days = Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 3600 * 24));
                          if (days > 0) {
                            return <span className={`text-[11px] font-semibold ${days <= 3 ? "text-red-500" : days <= 7 ? "text-amber-600" : "text-gray-500"}`}>{days} day{days !== 1 ? "s" : ""} left in trial</span>;
                          }
                          return <span className="text-[11px] text-red-500 font-semibold">Trial ended</span>;
                        })()}
                        {tenant.status === "active" && (() => {
                          const cycle = tenant.plan_id?.billing_cycle;
                          const cycleDays = cycle === "yearly" ? 365 : cycle === "lifetime" ? 99999 : 30;
                          const startDate = tenant.billing_cycle_start || tenant.createdAt;
                          const billingEnd = tenant.billing_cycle_end
                            || new Date(new Date(startDate).getTime() + cycleDays * 24 * 60 * 60 * 1000).toISOString();
                          const days = Math.ceil((new Date(billingEnd).getTime() - Date.now()) / (1000 * 3600 * 24));
                          if (days > 0) {
                            return <span className={`text-[11px] font-semibold ${days <= 3 ? "text-red-500" : days <= 7 ? "text-amber-600" : "text-gray-500"}`}>{days} day{days !== 1 ? "s" : ""} left</span>;
                          }
                          return <span className="text-[11px] text-red-500 font-semibold">Expired</span>;
                        })()}
                        {tenant.status === "expired" && (
                          <span className="text-[11px] text-red-500 font-semibold">Plan ended</span>
                        )}
                      </div>
                    </td>
                    {/* Joined */}
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {(() => {
                        const joinedDate = new Date(tenant.billing_cycle_start || tenant.createdAt);

                        // Calculate expiry: prefer stored date, fallback to start + billing days
                        let expiryDate: Date | null = null;
                        if (tenant.status === "trial") {
                          const trialDays = tenant.plan_id?.trial_days ?? 14;
                          expiryDate = tenant.trial_ends_at
                            ? new Date(tenant.trial_ends_at)
                            : new Date(new Date(tenant.createdAt).getTime() + trialDays * 86400000);
                        } else if (tenant.status === "active") {
                          const cycle = tenant.plan_id?.billing_cycle;
                          const cycleDays = cycle === "yearly" ? 365 : cycle === "lifetime" ? 36500 : 30;
                          expiryDate = tenant.billing_cycle_end
                            ? new Date(tenant.billing_cycle_end)
                            : new Date(joinedDate.getTime() + cycleDays * 86400000);
                        } else if (tenant.billing_cycle_end || tenant.trial_ends_at) {
                          expiryDate = new Date(tenant.billing_cycle_end || tenant.trial_ends_at!);
                        }

                        const daysLeft = expiryDate
                          ? Math.ceil((expiryDate.getTime() - Date.now()) / 86400000)
                          : null;

                        const expiryColor = daysLeft === null
                          ? "text-gray-400"
                          : daysLeft <= 3
                          ? "text-red-500 font-semibold"
                          : daysLeft <= 7
                          ? "text-orange-500 font-semibold"
                          : daysLeft <= 30
                          ? "text-amber-600 font-medium"
                          : "text-gray-400";

                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm text-gray-700">
                              {format(joinedDate, "MMM d, yyyy")}
                            </span>
                            {expiryDate && (
                              <span className={`text-[11px] ${expiryColor}`}>
                                Expires: {format(expiryDate, "MMM d, yyyy")}
                                {daysLeft !== null && daysLeft > 0 && (
                                  <span className="ml-1 opacity-75">({daysLeft}d left)</span>
                                )}
                                {daysLeft !== null && daysLeft <= 0 && (
                                  <span className="ml-1 text-red-500"> (expired)</span>
                                )}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openManage(tenant)}
                          className="h-8 text-xs font-medium text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(tenant._id, tenant.company_name)}
                          className="h-8 text-xs font-medium text-red-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    {/* ── Add Customer Modal ── */}
    {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Add New Customer
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Company Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Company Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={createForm.company_name}
                    onChange={(e) => setCreateForm({ ...createForm, company_name: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Acme Corp"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email ID</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="admin@company.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-10 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Plan */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Plan</label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                  <Select
                    value={createForm.plan_id}
                    onValueChange={(val) => setCreateForm({ ...createForm, plan_id: val })}
                  >
                    <SelectTrigger className="w-full pl-9 h-10 bg-white border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          <span className="flex items-center gap-2">
                            <Package className="h-3.5 w-3.5 text-gray-400" />
                            <span>{p.name}</span>
                            <span className="text-gray-400 text-xs">— ₹{p.price}/mo</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                <Button type="button" onClick={() => setIsCreateOpen(false)} variant="ghost">Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Add Customer</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Manage Subscription Modal ── */}
      {isManageOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Edit className="h-4 w-4 text-blue-600" />
                  Edit Customer — {selectedTenant.company_name}
                </h2>
                {selectedTenant.owner_id?.email && (
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {selectedTenant.owner_id.email}
                  </p>
                )}
              </div>
              <button onClick={() => setIsManageOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleManageSave} className="p-6 space-y-4">
              {/* Company Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Company Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={manageForm.company_name}
                    onChange={(e) => setManageForm({ ...manageForm, company_name: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Acme Corp"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email ID</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={manageForm.email}
                    onChange={(e) => setManageForm({ ...manageForm, email: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="admin@company.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={manageForm.password}
                    onChange={(e) => setManageForm({ ...manageForm, password: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-10 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Leave blank to keep current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Plan */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Plan</label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                  <Select
                    value={manageForm.plan_id}
                    onValueChange={(val) => setManageForm({ ...manageForm, plan_id: val })}
                  >
                    <SelectTrigger className="w-full pl-9 h-10 bg-white border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          <span className="flex items-center gap-2">
                            <Package className="h-3.5 w-3.5 text-gray-400" />
                            <span>{p.name}</span>
                            <span className="text-gray-400 text-xs">— ₹{p.price}/mo</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Account Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["trial", "active", "inactive", "expired"] as const).map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    const isSelected = manageForm.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setManageForm({ ...manageForm, status: s })}
                        className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                          isSelected ? `${cfg.cls} ring-2 ring-offset-1 ring-current/20` : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <div className="text-left">
                          <div>{cfg.label}</div>
                          <div className="text-[10px] font-normal opacity-60">
                            {s === "trial" && "Free period"}
                            {s === "active" && "Paid & active"}
                            {s === "inactive" && "Suspended"}
                            {s === "expired" && "Plan ended"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                <Button type="button" onClick={() => setIsManageOpen(false)} variant="ghost">Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

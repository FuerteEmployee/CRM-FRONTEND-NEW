import React, { useEffect, useState } from "react";
import {
  Plus, Edit2, Trash2, X, Package, Database, Users,
  IndianRupee, Target, HeadphonesIcon, FileSignature, FolderKanban, CheckSquare,
  MessageSquare, Video, CreditCard, Receipt, FileText, ClipboardList,
  BookOpen, BarChart3, Clock, Goal, Megaphone, CalendarDays, Bookmark, UserCog,
} from "lucide-react";
import { apiClient as api } from "@/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SuperAdminPlansSkeleton } from "@/components/ui/page-skeleton";
import { useMinimumLoading } from "@/hooks/useMinimumLoading";

interface SaasPlan {
  _id: string;
  name: string;
  description: string;
  price: number;
  billing_cycle: "monthly" | "yearly" | "lifetime";
  trial_days: number;
  banner_warning_days: number;
  active: boolean;
  features: {
    max_users: number;
    max_storage_gb: number;
    max_customers: number;
  };
  module_access: {
    finance: boolean;
    leads: boolean;
    support: boolean;
    contracts: boolean;
    projects: boolean;
    tasks: boolean;
    chat: boolean;
    meetings: boolean;
    subscriptions: boolean;
    expenses: boolean;
    estimates: boolean;
    proposals: boolean;
    estimate_request: boolean;
    knowledge_base: boolean;
    reports: boolean;
    time_tracking: boolean;
    goals: boolean;
    announcements: boolean;
    calendar: boolean;
    bookmarks: boolean;
    hrms: boolean;
  };
}

const MODULE_META: { key: keyof SaasPlan["module_access"]; label: string; icon: React.ElementType; color: string }[] = [
  { key: "finance",          label: "Finance",          icon: IndianRupee,    color: "text-green-500" },
  { key: "leads",            label: "Leads",            icon: Target,        color: "text-orange-500" },
  { key: "support",          label: "Support",          icon: HeadphonesIcon,color: "text-blue-500" },
  { key: "contracts",        label: "Contracts",        icon: FileSignature, color: "text-purple-500" },
  { key: "projects",         label: "Projects",         icon: FolderKanban,  color: "text-indigo-500" },
  { key: "tasks",            label: "Tasks",            icon: CheckSquare,   color: "text-rose-500" },
  { key: "chat",             label: "Chat",             icon: MessageSquare, color: "text-sky-500" },
  { key: "meetings",         label: "Meetings",         icon: Video,         color: "text-violet-500" },
  { key: "subscriptions",    label: "Subscriptions",    icon: CreditCard,    color: "text-teal-500" },
  { key: "expenses",         label: "Expenses",         icon: Receipt,       color: "text-red-500" },
  { key: "estimates",        label: "Estimates",        icon: FileText,      color: "text-amber-500" },
  { key: "proposals",        label: "Proposals",        icon: ClipboardList, color: "text-lime-600" },
  { key: "estimate_request", label: "Estimate Request", icon: ClipboardList, color: "text-cyan-500" },
  { key: "knowledge_base",   label: "Knowledge Base",   icon: BookOpen,      color: "text-emerald-500" },
  { key: "reports",          label: "Reports",          icon: BarChart3,     color: "text-blue-600" },
  { key: "time_tracking",    label: "Time Tracking",    icon: Clock,         color: "text-slate-500" },
  { key: "goals",            label: "Goals",            icon: Goal,          color: "text-pink-500" },
  { key: "announcements",    label: "Announcements",    icon: Megaphone,     color: "text-yellow-500" },
  { key: "calendar",         label: "Calendar",         icon: CalendarDays,  color: "text-fuchsia-500" },
  { key: "bookmarks",        label: "Bookmarks",        icon: Bookmark,      color: "text-amber-600" },
  { key: "hrms",             label: "HRMS",             icon: UserCog,       color: "text-indigo-600" },
];

const BANNER_PRESETS = [
  { label: "7 Days",   days: 7 },
  { label: "1 Month",  days: 30 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
];

const DEFAULT_PLAN: Partial<SaasPlan> = {
  name: "",
  description: "",
  price: 0,
  billing_cycle: "monthly",
  trial_days: 14,
  banner_warning_days: 30,
  active: true,
  features: { max_users: 1, max_storage_gb: 1, max_customers: -1 },
  module_access: {
    finance: true, leads: true, support: true, contracts: true, projects: true, tasks: true,
    chat: true, meetings: true, subscriptions: true, expenses: true, estimates: true,
    proposals: true, estimate_request: true, knowledge_base: true, reports: true,
    time_tracking: true, goals: true, announcements: true, calendar: true, bookmarks: true,
    hrms: true,
  },
};

export default function SuperAdminPlans() {
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null);
  const [formData, setFormData] = useState<Partial<SaasPlan>>(DEFAULT_PLAN);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    try {
      const response = await api.get("/super-admin/plans");
      setPlans(response);
    } catch (error: any) {
      toast.error(error.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData(JSON.parse(JSON.stringify(DEFAULT_PLAN)));
    setIsModalOpen(true);
  };

  const openEditModal = (plan: SaasPlan) => {
    setEditingPlan(plan);
    setFormData(JSON.parse(JSON.stringify(plan)));
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this plan? Existing subscriptions may be affected.")) return;
    try {
      await api.delete(`/super-admin/plans/${id}`);
      toast.success("Plan deleted");
      fetchPlans();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete plan");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingPlan) {
        await api.put(`/super-admin/plans/${editingPlan._id}`, formData);
        toast.success("Plan updated successfully");
      } else {
        await api.post("/super-admin/plans", formData);
        toast.success("Plan created successfully");
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (error: any) {
      toast.error(error.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const updateFeature = (field: keyof SaasPlan["features"], value: number) => {
    setFormData((prev) => ({ ...prev, features: { ...prev.features!, [field]: value } }));
  };

  const toggleModule = (field: keyof SaasPlan["module_access"]) => {
    setFormData((prev) => ({
      ...prev,
      module_access: { ...prev.module_access!, [field]: !prev.module_access?.[field] },
    }));
  };

  const showSkeleton = useMinimumLoading(loading);
  if (showSkeleton) return <SuperAdminPlansSkeleton />;

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Plan Management</h1>
          <p className="text-gray-500 text-sm mt-1">Create and configure subscription tiers, pricing, and module access.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="h-4 w-4" /> Create New Plan
        </Button>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No plans yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first subscription plan to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div key={plan._id} className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Card Header */}
              <div className={`p-5 border-b border-gray-100 ${plan.active ? "bg-gradient-to-br from-blue-50 to-indigo-50" : "bg-gray-50"}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2 rounded-lg ${plan.active ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-400"}`}>
                    <Package className="h-5 w-5" />
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${
                    plan.active ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-500 border-red-200"
                  }`}>
                    {plan.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                {plan.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{plan.description}</p>}
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-3xl font-extrabold text-gray-900">₹{plan.price}</span>
                  <span className="text-gray-400 text-sm mb-1">/{plan.billing_cycle}</span>
                </div>
                {plan.trial_days > 0 && (
                  <p className="text-xs text-blue-500 font-medium mt-1">{plan.trial_days}-day free trial</p>
                )}
                {plan.banner_warning_days > 0 && (
                  <p className="text-xs text-amber-600 font-medium mt-0.5">
                    Banner shows {plan.banner_warning_days === 7 ? "7 days" :
                     plan.banner_warning_days === 30 ? "1 month" :
                     plan.banner_warning_days === 90 ? "3 months" :
                     plan.banner_warning_days === 180 ? "6 months" :
                     `${plan.banner_warning_days} days`} before expiry
                  </p>
                )}
              </div>

              {/* Limits — Team Members only */}
              <div className="px-5 pt-4 pb-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Limits</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Team Members</span>
                  <span className="font-semibold text-gray-800">{plan.features.max_users === -1 ? "Unlimited" : plan.features.max_users}</span>
                </div>
              </div>

              {/* Module Access — compact icon chips */}
              <div className="px-5 pt-3 pb-4 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Module Access</p>
                  <span className="text-[10px] text-gray-400">
                    {MODULE_META.filter(({ key }) => plan.module_access?.[key]).length}/{MODULE_META.length} enabled
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {MODULE_META.map(({ key, label, icon: Icon, color }) => {
                    const enabled = plan.module_access?.[key];
                    return (
                      <div
                        key={key}
                        title={`${label}: ${enabled ? "On" : "Off"}`}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                          enabled
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-gray-50 border-gray-200 text-gray-400"
                        }`}
                      >
                        <Icon className={`h-3 w-3 shrink-0 ${enabled ? color : "text-gray-300"}`} />
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-1">
                <button onClick={() => openEditModal(plan)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(plan._id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

      {/* ── Centered Popup Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                {editingPlan ? <Edit2 className="h-4 w-4 text-blue-600" /> : <Plus className="h-4 w-4 text-blue-600" />}
                {editingPlan ? "Edit Plan" : "Create New Plan"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-1.5 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

          {/* Modal Body — Responsive columns, scrollable body */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* ── LEFT: Plan Details ── */}
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider pb-1.5 border-b border-gray-100">Plan Details</p>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-600">Plan Name *</label>
                    <input
                      type="text" required value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Starter, Pro, Enterprise"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-600">Description</label>
                    <textarea
                      rows={2} value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Short description..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-600">Price (₹)</label>
                      <input
                        type="number" required min="0" step="0.01" value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-600">Billing</label>
                      <select
                        value={formData.billing_cycle}
                        onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value as any })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="lifetime">Lifetime</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-600">Trial Days</label>
                      <input
                        type="number" min="0" value={formData.trial_days}
                        onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-600">Plan Status</label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, active: !formData.active })}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all text-sm font-medium ${
                          formData.active ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-gray-50 border-gray-300 text-gray-500"
                        }`}
                      >
                        <span className={`relative inline-flex h-4 w-8 shrink-0 rounded-full border-2 border-transparent transition-colors ${formData.active ? "bg-emerald-500" : "bg-gray-300"}`}>
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${formData.active ? "translate-x-4" : "translate-x-0"}`} />
                        </span>
                        {formData.active ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </div>

                  {/* Banner Warning Days */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                      Show Banner Before Expiry
                      <span className="text-[10px] font-normal text-gray-400">(admin dashboard)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {BANNER_PRESETS.map(preset => {
                        const active = formData.banner_warning_days === preset.days;
                        return (
                          <button
                            key={preset.days}
                            type="button"
                            onClick={() => setFormData({ ...formData, banner_warning_days: preset.days })}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                              active
                                ? "bg-amber-500 text-white border-amber-500"
                                : "bg-white text-gray-600 border-gray-300 hover:border-amber-400 hover:text-amber-600"
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="1"
                        value={formData.banner_warning_days ?? 30}
                        onChange={(e) => setFormData({ ...formData, banner_warning_days: parseInt(e.target.value) || 30 })}
                        className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                      <span className="text-xs text-gray-500">days before expiry</span>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      The renewal banner appears in the admin's dashboard this many days before their subscription expires. Colors: 🔵 healthy → 🟡 ≤30d → 🟠 ≤7d → 🔴 ≤3d.
                    </p>
                  </div>

                  {/* Usage Limits — hidden */}
                </div>

                {/* ── RIGHT: Module Access ── */}
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider pb-1.5 border-b border-gray-100">Module Access</p>
                  <div className="space-y-2">
                    {MODULE_META.map(({ key, label, icon: Icon, color }) => {
                      const isActive = formData.module_access?.[key] ?? true;
                      return (
                        <div
                          key={key}
                          onClick={() => toggleModule(key)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-lg border cursor-pointer select-none transition-all duration-150 ${
                            isActive
                              ? "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                              : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`h-4 w-4 shrink-0 ${isActive ? color : "text-gray-300"}`} />
                            <span className={`text-sm font-medium ${isActive ? "text-gray-800" : "text-gray-400"}`}>{label}</span>
                          </div>
                          <span className={`relative inline-flex h-5 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${isActive ? "bg-emerald-500" : "bg-gray-300"}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${isActive ? "translate-x-5" : "translate-x-0"}`} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400">Click any module to toggle</p>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button type="button" onClick={() => setIsModalOpen(false)} variant="ghost" className="text-gray-600 hover:bg-gray-100">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
                {saving ? "Saving..." : editingPlan ? "Save Changes" : "Create Plan"}
              </Button>
            </div>
          </form>
          </div>
        </div>
      )}
    </>
  );
}

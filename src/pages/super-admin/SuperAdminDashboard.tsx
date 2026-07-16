import React, { useEffect, useState } from "react";
import {
  Building2, Package, TrendingUp, Activity,
  ShieldCheck, Clock, AlertTriangle, CheckCircle2, RefreshCw,
} from "lucide-react";
import { apiClient as api } from "@/api/client";
import { SuperAdminDashboardSkeleton } from "@/components/ui/page-skeleton";
import { useMinimumLoading } from "@/hooks/useMinimumLoading";
import { formatDistanceToNow } from "date-fns";

interface DashboardMetrics {
  active_customers: number;
  trial_customers: number;
  expired_customers: number;
  total_customers: number;
  active_plans: number;
  admin_count: number;
  new_this_month: number;
  expiring_soon: number;
  monthly_revenue: string;
  recent_logs: Array<{
    _id: string;
    action: string;
    description: string;
    module: string;
    createdAt: string;
    admin_id?: { firstname: string; lastname: string; email: string } | null;
  }>;
}

const LOG_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  "Created Customer":  { icon: Building2,   color: "text-blue-600 bg-blue-50" },
  "Updated Customer":  { icon: Building2,   color: "text-indigo-600 bg-indigo-50" },
  "Deleted Customer":  { icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  "Created Plan":      { icon: Package,     color: "text-emerald-600 bg-emerald-50" },
  "Updated Plan":      { icon: Package,     color: "text-teal-600 bg-teal-50" },
  "Deleted Plan":      { icon: Package,     color: "text-orange-600 bg-orange-50" },
};

export default function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await api.get("/super-admin/dashboard");
      setMetrics(response);
    } catch (error) {
      console.error("Failed to fetch super admin metrics", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchMetrics(); }, []);

  const cards = [
    {
      title: "Active Customers",
      value: metrics?.active_customers ?? 0,
      sub: `${metrics?.total_customers ?? 0} total`,
      icon: CheckCircle2,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "On Trial",
      value: metrics?.trial_customers ?? 0,
      sub: metrics?.expiring_soon ? `${metrics.expiring_soon} expiring in 7d` : "all healthy",
      icon: Clock,
      color: "from-amber-400 to-orange-500",
    },
    {
      title: "Active Plans",
      value: metrics?.active_plans ?? 0,
      sub: `${metrics?.admin_count ?? 0} admins`,
      icon: Package,
      color: "from-indigo-500 to-purple-500",
    },
    {
      title: "Est. Monthly Revenue",
      value: metrics?.monthly_revenue?.replace('$', '₹') ?? "₹0.00",
      sub: `${metrics?.new_this_month ?? 0} new this month`,
      icon: TrendingUp,
      color: "from-emerald-500 to-teal-500",
    },
  ];

  const showSkeleton = useMinimumLoading(loading);
  if (showSkeleton) return <SuperAdminDashboardSkeleton />;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Super Admin Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time metrics across your entire SaaS platform.</p>
        </div>
        <button
          onClick={() => fetchMetrics(true)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className={`p-2.5 rounded-lg bg-gradient-to-br ${card.color} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-0.5">{card.value}</h3>
              <p className="text-sm text-gray-500 font-medium">{card.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Tenant Status Breakdown + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Activity Feed — real audit log */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              Recent Activity
            </h2>
            <span className="text-xs text-gray-400">Live from audit log</span>
          </div>
          {metrics?.recent_logs?.length ? (
            <div className="space-y-1.5">
              {metrics.recent_logs.map((log) => {
                const meta = LOG_ICON[log.action] ?? { icon: ShieldCheck, color: "text-gray-600 bg-gray-100" };
                const Icon = meta.icon;
                const who = log.admin_id
                  ? `${log.admin_id.firstname} ${log.admin_id.lastname}`
                  : "Super Admin";
                return (
                  <div key={log._id} className="flex gap-3 items-start p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`mt-0.5 p-2 rounded-lg ${meta.color} shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-700 leading-snug">{log.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {who} · {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-400 text-sm">No activity yet.</div>
          )}
        </div>

        {/* Customer Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">Customer Breakdown</h2>
          {[
            { label: "Active",   value: metrics?.active_customers  ?? 0, color: "bg-emerald-500", text: "text-emerald-700 bg-emerald-50" },
            { label: "On Trial", value: metrics?.trial_customers   ?? 0, color: "bg-amber-400",   text: "text-amber-700 bg-amber-50" },
            { label: "Expired",  value: metrics?.expired_customers ?? 0, color: "bg-red-400",     text: "text-red-700 bg-red-50" },
          ].map(({ label, value, color, text }) => {
            const total = metrics?.total_customers || 1;
            const pct = Math.round((value / total) * 100);
            return (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-600">{label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${text}`}>{value}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}

          {(metrics?.expiring_soon ?? 0) > 0 && (
            <div className="mt-2 flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 font-medium">
                {metrics!.expiring_soon} customer{metrics!.expiring_soon > 1 ? "s" : ""} expiring within 7 days
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">New this month</span>
            <span className="text-sm font-bold text-gray-900">{metrics?.new_this_month ?? 0}</span>
          </div>
        </div>

      </div>
    </div>
  );
}

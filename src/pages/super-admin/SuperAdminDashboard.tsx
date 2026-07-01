import React, { useEffect, useState } from "react";
import { Users, Building2, Package, TrendingUp, Activity, CreditCard, ShieldCheck } from "lucide-react";
import { apiClient as api } from "@/api/client";
import { SuperAdminDashboardSkeleton } from "@/components/ui/page-skeleton";
import { useMinimumLoading } from "@/hooks/useMinimumLoading";

interface DashboardMetrics {
  active_customers: number;
  active_plans: number;
  admin_count: number;
  revenue_summary: string;
}

export default function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await api.get("/super-admin/dashboard");
        setMetrics(response);
      } catch (error) {
        console.error("Failed to fetch super admin metrics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const cards = [
    {
      title: "Active Customers",
      value: metrics?.active_customers || 0,
      icon: Building2,
      trend: "+12%",
      color: "from-blue-500 to-cyan-500",
      shadow: "shadow-blue-500/20"
    },
    {
      title: "Active SaaS Plans",
      value: metrics?.active_plans || 0,
      icon: Package,
      trend: "+2%",
      color: "from-indigo-500 to-purple-500",
      shadow: "shadow-indigo-500/20"
    },
    {
      title: "System Admins",
      value: metrics?.admin_count || 0,
      icon: Users,
      trend: "+5%",
      color: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/20"
    },
    {
      title: "Monthly Revenue",
      value: metrics?.revenue_summary || "₹0.00",
      icon: TrendingUp,
      trend: "+18%",
      color: "from-orange-500 to-red-500",
      shadow: "shadow-orange-500/20"
    }
  ];

  const showSkeleton = useMinimumLoading(loading);
  if (showSkeleton) return <SuperAdminDashboardSkeleton />;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Super Admin Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor your entire SaaS ecosystem from a single pane of glass.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-lg bg-gradient-to-br ${card.color} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <TrendingUp className="h-3 w-3" />
                  {card.trend}
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-0.5">{card.value}</h3>
              <p className="text-sm text-gray-500">{card.title}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              Live System Activity
            </h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View Audit Log</button>
          </div>
          <div className="space-y-2">
            {[
              { time: "Just now", action: "Tenant 'Acme Corp' upgraded to Enterprise Plan", icon: Building2, color: "text-blue-600 bg-blue-50" },
              { time: "2 hours ago", action: "Super Admin 'John' suspended 'StartUp LLC'", icon: ShieldCheck, color: "text-orange-600 bg-orange-50" },
              { time: "5 hours ago", action: "New subscription payment received (₹299.00)", icon: CreditCard, color: "text-emerald-600 bg-emerald-50" },
            ].map((log, i) => (
              <div key={i} className="flex gap-3 items-start p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`mt-0.5 p-2 rounded-lg ${log.color}`}>
                  <log.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-gray-700">{log.action}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-5">System Health</h2>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-500">Database Storage</span>
                <span className="text-gray-900 font-semibold">45%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full w-[45%] bg-blue-600 rounded-full" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-500">Server CPU</span>
                <span className="text-gray-900 font-semibold">12%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full w-[12%] bg-emerald-500 rounded-full" />
              </div>
            </div>
            <div className="pt-4 mt-1 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  All Systems Operational
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

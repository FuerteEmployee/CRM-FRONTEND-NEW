import React, { useEffect, useState } from "react";
import { Bell, AlertTriangle, Info, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { apiClient as api } from "@/api/client";
import { toast } from "sonner";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { SuperAdminAlertsSkeleton } from "@/components/ui/page-skeleton";
import { useMinimumLoading } from "@/hooks/useMinimumLoading";
import { getDaysLeft, getExpiryDate, isLifetimePlan } from "@/lib/tenantExpiry";

interface Tenant {
  _id: string;
  company_name: string;
  status: "active" | "inactive" | "trial" | "expired";
  plan_id: {
    _id: string;
    name: string;
    price: number;
    billing_cycle?: string;
    trial_days?: number;
    banner_warning_days?: number;
    active?: boolean;
  } | null;
  createdAt: string;
  updatedAt?: string;
  trial_ends_at?: string;
  billing_cycle_start?: string;
  billing_cycle_end?: string;
}

interface Alert {
  id: string;
  type: "warning" | "info" | "success" | "danger";
  title: string;
  message: string;
  time: string;
  tenant: string;
}

const TYPE_CONFIG = {
  warning: {
    icon: AlertTriangle,
    bg: "bg-orange-50",
    border: "border-orange-200",
    iconClass: "text-orange-500",
    badge: "bg-orange-100 text-orange-700",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconClass: "text-blue-500",
    badge: "bg-blue-100 text-blue-700",
  },
  success: {
    icon: CheckCircle2,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    iconClass: "text-emerald-500",
    badge: "bg-emerald-100 text-emerald-700",
  },
  danger: {
    icon: XCircle,
    bg: "bg-red-50",
    border: "border-red-200",
    iconClass: "text-red-500",
    badge: "bg-red-100 text-red-700",
  },
};

function generateAlerts(tenants: Tenant[]): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();
  const ago = (d?: Date | string) => (d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : "");
  // Alert ids carry the end date, so a company that is renewed and later
  // expires again raises a fresh alert instead of staying dismissed forever.
  const day = (d?: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "none");
  const bannerWarned = new Set<string>();

  tenants.forEach((tenant) => {
    // Same date math as the Customers page (lib/tenantExpiry.ts, days rounded up).
    const end = getExpiryDate(tenant as any);
    const daysLeft = getDaysLeft(tenant as any);
    const lifetime = isLifetimePlan(tenant as any);
    const plan = tenant.plan_id;

    if (tenant.status === "expired") {
      alerts.push({
        id: `expired-${tenant._id}-${day(end)}`,
        type: "danger",
        title: "Plan Expired",
        message: `${tenant.company_name}'s plan has expired. Renew it from Customers to restore full access.`,
        time: end ? `ended ${ago(end)}` : ago(tenant.updatedAt),
        tenant: tenant.company_name,
      });
    }

    if (tenant.status === "inactive") {
      alerts.push({
        id: `suspended-${tenant._id}-${day(tenant.updatedAt)}`,
        type: "warning",
        title: "Account Suspended",
        message: `${tenant.company_name} is suspended — its staff can't log in to the CRM or HRMS until it is re-activated.`,
        time: ago(tenant.updatedAt || tenant.createdAt),
        tenant: tenant.company_name,
      });
    }

    // A plan switched to Inactive blocks every company on it.
    if (plan && plan.active === false && tenant.status !== "inactive") {
      alerts.push({
        id: `plan-inactive-${tenant._id}-${plan._id}`,
        type: "danger",
        title: "Plan Inactive — Company Blocked",
        message: `${tenant.company_name} is on "${plan.name}", which is Inactive, so it can't log in. Make the plan Active or move the company to another plan.`,
        time: ago(tenant.updatedAt || tenant.createdAt),
        tenant: tenant.company_name,
      });
    }

    if (tenant.status === "active" && !plan) {
      alerts.push({
        id: `no-plan-${tenant._id}`,
        type: "warning",
        title: "Active Without Plan",
        message: `${tenant.company_name} is marked active but has no plan assigned. Assign a plan immediately.`,
        time: ago(tenant.createdAt),
        tenant: tenant.company_name,
      });
    }

    if (tenant.status === "active" && plan && !lifetime && daysLeft !== null && end) {
      if (daysLeft <= 0) {
        alerts.push({
          id: `active-ended-${tenant._id}-${day(end)}`,
          type: "danger",
          title: "Plan Ended (still Active)",
          message: `${tenant.company_name}'s paid period has ended but it is still marked Active. Renew it, or the daily check will mark it Expired.`,
          time: `ended ${ago(end)}`,
          tenant: tenant.company_name,
        });
      } else if (daysLeft <= 5) {
        alerts.push({
          id: `billing-${tenant._id}-${day(end)}`,
          type: "info",
          title: "Billing Cycle Ending",
          message: `${tenant.company_name}'s plan ends ${daysLeft === 1 ? "within a day" : `in ${daysLeft} days`}. Ensure renewal is processed.`,
          time: `ends ${ago(end)}`,
          tenant: tenant.company_name,
        });
      }
    }

    if (tenant.status === "trial" && daysLeft !== null && end) {
      if (daysLeft <= 0) {
        alerts.push({
          id: `trial-ended-${tenant._id}-${day(end)}`,
          type: "danger",
          title: "Trial Period Ended",
          message: `${tenant.company_name}'s trial has ended. Move them to a paid plan (Customers → Renew or Edit).`,
          time: `ended ${ago(end)}`,
          tenant: tenant.company_name,
        });
      } else if (daysLeft <= 7) {
        alerts.push({
          id: `trial-expiring-${tenant._id}-${day(end)}`,
          type: "warning",
          title: "Trial Expiring Soon",
          message: `${tenant.company_name}'s trial ends ${daysLeft === 1 ? "within a day" : `in ${daysLeft} days`}. Upgrade them to a paid plan.`,
          time: `ends ${ago(end)}`,
          tenant: tenant.company_name,
        });
      }
    }

    // A banner window longer than the plan itself shows the whole time.
    if (plan?._id && !bannerWarned.has(plan._id) && plan.banner_warning_days && plan.billing_cycle !== "lifetime") {
      const maxDays = plan.billing_cycle === "yearly" ? 365 : 30;
      if (plan.banner_warning_days > maxDays) {
        bannerWarned.add(plan._id);
        alerts.push({
          id: `banner-too-long-${plan._id}-${plan.banner_warning_days}`,
          type: "info",
          title: "Expiry Banner Always Showing",
          message: `Plan "${plan.name}" shows the expiry banner ${plan.banner_warning_days} days before expiry, but a ${plan.billing_cycle || "monthly"} plan only lasts ${maxDays} days — so its companies see the banner all the time. Edit the plan to fix it.`,
          time: "",
          tenant: plan.name,
        });
      }
    }

    if (tenant.status === "active" && differenceInDays(now, new Date(tenant.createdAt)) <= 3) {
      alerts.push({
        id: `new-${tenant._id}`,
        type: "success",
        title: "New Customer Active",
        message: `${tenant.company_name} just activated their account and is now live on the platform.`,
        time: ago(tenant.createdAt),
        tenant: tenant.company_name,
      });
    }
  });

  const order = { danger: 0, warning: 1, info: 2, success: 3 };
  return alerts.sort((a, b) => order[a.type] - order[b.type]);
}

export default function SuperAdminAlerts() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, dismissedRes] = await Promise.all([
        api.get("/super-admin/tenants"),
        api.get("/super-admin/alerts/dismissed"),
      ]);
      setTenants(tenantsRes);
      setAlerts(generateAlerts(tenantsRes));
      setDismissed(new Set(dismissedRes));
    } catch (error: any) {
      toast.error(error.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Optimistic: update locally right away, persist to the server so the
  // dismissal survives a refresh; roll back and notify on failure.
  const dismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
    api.post("/super-admin/alerts/dismiss", { alert_id: id }).catch(() => {
      setDismissed((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.error("Failed to save dismissal — please try again");
    });
  };

  const dismissAll = () => {
    const idsToMark = visible.map((a) => a.id);
    if (idsToMark.length === 0) return;
    setDismissed((prev) => new Set([...prev, ...idsToMark]));
    api.post("/super-admin/alerts/dismiss-all", { alert_ids: idsToMark }).catch(() => {
      setDismissed((prev) => {
        const next = new Set(prev);
        idsToMark.forEach((id) => next.delete(id));
        return next;
      });
      toast.error("Failed to save dismissal — please try again");
    });
  };

  const visible = alerts.filter(
    (a) => !dismissed.has(a.id) && (filterType === "all" || a.type === filterType)
  );

  const counts = {
    danger: alerts.filter((a) => !dismissed.has(a.id) && a.type === "danger").length,
    warning: alerts.filter((a) => !dismissed.has(a.id) && a.type === "warning").length,
    info: alerts.filter((a) => !dismissed.has(a.id) && a.type === "info").length,
    success: alerts.filter((a) => !dismissed.has(a.id) && a.type === "success").length,
  };

  const showSkeleton = useMinimumLoading(loading);
  if (showSkeleton) return <SuperAdminAlertsSkeleton />;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Alerts</h1>
          <p className="text-gray-500 text-sm mt-1">
            Live system alerts based on {tenants.length} customer{tenants.length !== 1 ? "s" : ""} — trials, expired and suspended accounts, inactive plans and billing events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {visible.length > 0 && (
            <button
              onClick={dismissAll}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {(["all", "danger", "warning", "info", "success"] as const).map((type) => {
          const isAll = type === "all";
          const count = isAll ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[type as keyof typeof counts];
          const labels: Record<string, string> = { all: "All", danger: "Critical", warning: "Warning", info: "Info", success: "Success" };
          const colors: Record<string, string> = {
            all: "bg-gray-100 text-gray-700",
            danger: "bg-red-100 text-red-700",
            warning: "bg-orange-100 text-orange-700",
            info: "bg-blue-100 text-blue-700",
            success: "bg-emerald-100 text-emerald-700",
          };
          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                filterType === type ? "ring-2 ring-offset-1 ring-current/30 border-current/30" : "border-transparent"
              } ${colors[type]}`}
            >
              {labels[type]}
              <span className="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px] font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Alert list */}
      {visible.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 bg-emerald-50 rounded-full mb-4">
            <Bell className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">All clear!</h3>
          <p className="text-sm text-gray-400 max-w-xs">
            {tenants.length === 0
              ? "No customers found. Add customers to start seeing alerts."
              : "No alerts for your current customers. Everything looks good."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((alert) => {
            const cfg = TYPE_CONFIG[alert.type];
            const Icon = cfg.icon;
            return (
              <div
                key={alert.id}
                className={`bg-white border rounded-xl p-4 shadow-sm flex items-start gap-4 ${cfg.border}`}
              >
                <div className={`p-2.5 rounded-lg flex-shrink-0 ${cfg.bg}`}>
                  <Icon className={`h-5 w-5 ${cfg.iconClass}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 ${cfg.badge}`}>
                        {alert.type === "danger" ? "Critical" : alert.type}
                      </span>
                      <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                    </div>
                    {alert.time && (
                      <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {alert.time}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{alert.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{alert.tenant}</span>
                    <button
                      onClick={() => dismiss(alert.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

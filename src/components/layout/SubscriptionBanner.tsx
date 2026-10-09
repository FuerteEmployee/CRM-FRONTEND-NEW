import { AlertTriangle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePermissionContext } from "@/context/PermissionContext";
import { bannerWarningDays, getDaysLeft } from "@/lib/tenantExpiry";

// "Plan expiring soon" banner shown on every CRM page. It starts showing the
// number of days before expiry that Super Admin set on the plan
// ("Banner Shows": 7 days / 1 month / 3 months / 6 months), default 30.
export function SubscriptionBanner() {
  const { user, isAdmin } = usePermissionContext();
  const navigate = useNavigate();

  const tenant = (user as any)?.tenant;
  if (!tenant || user?.is_superadmin) return null;

  const daysLeft = getDaysLeft(tenant);
  if (daysLeft === null || daysLeft <= 0 || daysLeft > bannerWarningDays(tenant)) return null;

  const urgent = daysLeft <= 7;
  return (
    <div
      className={`mb-4 flex flex-col gap-3 rounded-xl border p-4 shadow-sm md:flex-row md:items-center md:justify-between ${
        urgent
          ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20"
          : "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20"
      }`}
    >
      <div className="flex items-start gap-3 md:items-center">
        <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 md:mt-0 ${urgent ? "text-red-600" : "text-amber-600"}`} />
        <div>
          <p className={`text-sm font-bold ${urgent ? "text-red-800 dark:text-red-400" : "text-amber-800 dark:text-amber-400"}`}>
            Your plan expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
          </p>
          <p className={`text-xs ${urgent ? "text-red-700/80" : "text-amber-700/80"}`}>
            {isAdmin
              ? "Renew now to keep your CRM running without interruption."
              : "Please ask your company admin to renew the plan."}
          </p>
        </div>
      </div>
      {isAdmin && (
        <Button size="sm" onClick={() => navigate("/admin/pricing")} className="gap-2 self-start md:self-auto">
          Renew Plan <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

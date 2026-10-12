import { Lock } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePermissionContext } from "@/context/PermissionContext";
import { MODULE_LABELS, moduleForPath } from "@/lib/planModules";
import { DashboardLayout } from "./DashboardLayout";

// Route-level guard: renders "Not included in your plan" INSTEAD of a page
// whose module is switched off in the company's SaaS plan, so typing the URL
// directly no longer opens it (and the page never mounts / calls its APIs).
// The backend blocks the same module's APIs (src/middleware/planModules.js).
export function ModuleGuard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { isModuleEnabled } = usePermissionContext();

  const moduleKey = moduleForPath(pathname);
  if (!moduleKey || isModuleEnabled(moduleKey)) return <>{children}</>;

  return (
    <DashboardLayout>
      <NotInPlan moduleKey={moduleKey} />
    </DashboardLayout>
  );
}

function NotInPlan({ moduleKey }: { moduleKey: string }) {
  const { isStaff } = usePermissionContext();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="mb-2 text-xl font-semibold">Not included in your plan</p>
        <p className="mb-6 text-sm text-muted-foreground">
          {MODULE_LABELS[moduleKey] || "This module"} isn't part of your company's current plan.
          {isStaff ? " Please contact your admin." : " Upgrade your plan to use it."}
        </p>
        <Button onClick={() => navigate(isStaff ? "/staff/dashboard" : "/admin/dashboard")} variant="outline">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

import React from "react";
import { usePermission } from "@/hrms/hooks/usePermission";
import { Navigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/hrms/components/ui/button";

interface PermissionGuardProps {
  requiredPermission?: string;
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
  redirectTo?: string;
  mode?: "hide" | "redirect" | "message";
}

export function PermissionGuard({
  requiredPermission,
  requiredPermissions,
  fallback,
  children,
  redirectTo,
  mode = "hide",
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, isAdmin } = usePermission();

  const isAuthorized = isAdmin || 
    (requiredPermission ? hasPermission(requiredPermission) : true) &&
    (requiredPermissions ? hasAnyPermission(requiredPermissions) : true);

  if (isAuthorized) {
    return <>{children}</>;
  }

  if (mode === "redirect" && redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  if (mode === "message") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            You don't have the necessary permissions to access this feature. 
            Please contact your administrator if you believe this is an error.
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
          <Button onClick={() => window.location.href = "/"}>
            Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (fallback as JSX.Element) || null;
}

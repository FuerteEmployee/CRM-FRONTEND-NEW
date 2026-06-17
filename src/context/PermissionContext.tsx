import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { queryClient } from "@/lib/queryClient";

interface User {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  admin: boolean;
  is_superadmin?: boolean;
  role?: any;
}

interface PermissionContextType {
  user: User | null;
  permissions: Record<string, Record<string, boolean>>;
  planModules: Record<string, boolean> | null;
  isAdmin: boolean;
  can: (feature: string, capability: string) => boolean;
  canView: (feature: string) => boolean;
  isModuleEnabled: (moduleKey: string) => boolean;
  loading: boolean;
  refreshPermissions: () => void;
  logout: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined,
);

export const PermissionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem("crm_user");
    return cached ? JSON.parse(cached) : null;
  });
  const [permissions, setPermissions] = useState<
    Record<string, Record<string, boolean>>
  >(() => {
    const cached = localStorage.getItem("crm_permissions");
    return cached ? JSON.parse(cached) : {};
  });
  const [planModules, setPlanModules] = useState<Record<string, boolean> | null>(() => {
    const cached = localStorage.getItem("crm_plan_modules");
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);

  const syncPermissions = async () => {
    // Only set loading if we don't have cached data to show
    if (!user) setLoading(true);
    
    try {
      const { authService } = await import("@/api/services/auth.service");
      const data = await authService.getMe();
      if (data.user) {
        setUser(data.user);
        localStorage.setItem("crm_user", JSON.stringify(data.user));
      }
      if (data.permissions) {
        setPermissions(data.permissions);
        localStorage.setItem("crm_permissions", JSON.stringify(data.permissions));
      }
      if (data.plan_modules) {
        setPlanModules(data.plan_modules);
        localStorage.setItem("crm_plan_modules", JSON.stringify(data.plan_modules));
      }
    } catch (error) {
      console.error("Error syncing permissions:", error);
      // Only clear if the error is an actual 401/Unauthorized
      setUser(null);
      setPermissions({});
      localStorage.removeItem("crm_user");
      localStorage.removeItem("crm_permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncPermissions();
  }, []);

  const isAdmin = user?.admin === true;

  const can = (feature: string, capability: string): boolean => {
    if (isAdmin) return true;
    return permissions[feature]?.[capability] === true;
  };

  const canView = (feature: string): boolean => {
    if (isAdmin) return true;
    if (!feature) return true; // Items with no permission key are visible

    const featurePerms = permissions[feature];
    if (!featurePerms) return false;

    // Menu is visible only if the user has at least one View permission
    // (either "View(Global)" or "View (Own)")
    return (
      featurePerms["View(Global)"] === true ||
      featurePerms["View (Own)"] === true
    );
  };

  const logout = async () => {
    try {
      const { authService } = await import("@/api/services/auth.service");
      await authService.logout();
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      setUser(null);
      setPermissions({});
      setPlanModules(null);
      localStorage.removeItem("crm_user");
      localStorage.removeItem("crm_permissions");
      localStorage.removeItem("crm_plan_modules");
      queryClient.clear();
    }
  };

  const isModuleEnabled = (moduleKey: string): boolean => {
    if (!planModules) return true; // no plan restriction → show everything
    return planModules[moduleKey] !== false;
  };

  const refreshPermissions = () => {
    syncPermissions();
  };

  return (
    <PermissionContext.Provider
      value={{
        user,
        permissions,
        planModules,
        isAdmin,
        can,
        canView,
        isModuleEnabled,
        loading,
        refreshPermissions,
        logout,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissionContext = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error(
      "usePermissionContext must be used within a PermissionProvider",
    );
  }
  return context;
};

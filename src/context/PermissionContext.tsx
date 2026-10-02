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
  // Backend returns this as boolean, 0/1, or "0"/"1"/"true" depending on version
  admin: any;
  is_superadmin?: boolean;
  is_hrms_staff?: boolean;
  role?: any;
  tenant?: any;
  phonenumber?: string;
  notification_sound?: string;
}

interface PermissionContextType {
  user: User | null;
  permissions: Record<string, Record<string, boolean>>;
  planModules: Record<string, boolean> | null;
  isAdmin: boolean;
  isStaff: boolean;
  can: (feature: string, capability: string) => boolean;
  canView: (feature: string) => boolean;
  isModuleEnabled: (moduleKey: string) => boolean;
  loading: boolean;
  refreshPermissions: () => Promise<void>;
  setFromLoginResponse: (userData: User, permsData: Record<string, Record<string, boolean>>, planModulesData?: Record<string, boolean> | null) => void;
  logout: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined,
);

// A corrupted/partial value here (e.g. a browser extension, a crashed write,
// or a race between tabs) would otherwise throw synchronously during the
// very first render of PermissionProvider — which wraps the whole app and
// has no error boundary above it — permanently blanking #root. Falling back
// to `fallback` and dropping the bad key lets the app mount instead of
// getting stuck forever.
const readCachedJson = <T,>(key: string, fallback: T): T => {
  const cached = localStorage.getItem(key);
  if (!cached) return fallback;
  try {
    return JSON.parse(cached);
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

export const PermissionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => readCachedJson("crm_user", null));
  const [permissions, setPermissions] = useState<
    Record<string, Record<string, boolean>>
  >(() => readCachedJson("crm_permissions", {}));
  const [planModules, setPlanModules] = useState<Record<string, boolean> | null>(
    () => readCachedJson("crm_plan_modules", null)
  );
  const [loading, setLoading] = useState(true);

  const syncPermissions = async () => {
    // No token yet (e.g. on the public login page) — nothing to sync, and
    // calling /auth/me here would just be a guaranteed 401.
    if (!localStorage.getItem("crm_token")) {
      setLoading(false);
      return;
    }

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
      // Always sync plan_modules — even when null (super admin has no plan restrictions)
      const modules = data.plan_modules ?? null;
      setPlanModules(modules);
      if (modules) {
        localStorage.setItem("crm_plan_modules", JSON.stringify(modules));
      } else {
        localStorage.removeItem("crm_plan_modules");
      }
    } catch (error: any) {
      console.error("Error syncing permissions:", error);
      // Only clear session on actual auth failures (401/403), not network errors
      const status = error?.response?.status ?? error?.status ?? error?.response?.data?.status;
      if (status === 401 || status === 403) {
        setUser(null);
        setPermissions({});
        setPlanModules(null);
        localStorage.removeItem("crm_token");
        localStorage.removeItem("crm_user");
        localStorage.removeItem("crm_permissions");
        localStorage.removeItem("crm_plan_modules");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncPermissions();
  }, []);

  // Staff members always have a `role` assigned; tenant admins do not.
  // Use this to break the ambiguity when the backend sets admin: 1 for all CRM users.
  const hasRole = !!user?.role && (
    typeof user.role === "object"
      ? !!(user.role._id || user.role.name)
      : true
  );
  const isAdmin =
    !hasRole &&
    !user?.is_superadmin &&
    (user?.admin === true || user?.admin === 1 || user?.admin === "1" || user?.admin === "true");
  const isStaff = user !== null && !isAdmin && !user?.is_superadmin;

  const can = (feature: string, capability: string): boolean => {
    const roleName = typeof user?.role === "object" ? (user.role?.role || user.role?.name || "") : String(user?.role || "");
    const rk = roleName.toLowerCase();
    const isUserAdminOrSuper = user?.is_superadmin || user?.admin === true || user?.admin === 1 || user?.admin === "1" || user?.admin === "true" || rk.includes("admin") || rk.includes("owner") || rk.includes("super") || isAdmin;

    if (isUserAdminOrSuper) return true;
    return permissions[feature]?.[capability] === true;
  };

  const canView = (feature: string): boolean => {
    const roleName = typeof user?.role === "object" ? (user.role?.role || user.role?.name || "") : String(user?.role || "");
    const rk = roleName.toLowerCase();
    const isUserAdminOrSuper = user?.is_superadmin || user?.admin === true || user?.admin === 1 || user?.admin === "1" || user?.admin === "true" || rk.includes("admin") || rk.includes("owner") || rk.includes("super") || isAdmin;

    if (isUserAdminOrSuper) return true;
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
      localStorage.removeItem("crm_token");
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
    return syncPermissions();
  };

  const setFromLoginResponse = (
    userData: User,
    permsData: Record<string, Record<string, boolean>>,
    planModulesData?: Record<string, boolean> | null,
  ) => {
    // Clear any previous admin's cached query data before loading the new admin's session.
    queryClient.clear();
    setUser(userData);
    localStorage.setItem("crm_user", JSON.stringify(userData));
    setPermissions(permsData || {});
    localStorage.setItem("crm_permissions", JSON.stringify(permsData || {}));
    // Always set plan_modules — null means super admin (no restrictions)
    const modules = planModulesData ?? null;
    setPlanModules(modules);
    if (modules) {
      localStorage.setItem("crm_plan_modules", JSON.stringify(modules));
    } else {
      localStorage.removeItem("crm_plan_modules");
    }
  };

  return (
    <PermissionContext.Provider
      value={{
        user,
        permissions,
        planModules,
        isAdmin,
        isStaff,
        can,
        canView,
        isModuleEnabled,
        loading,
        refreshPermissions,
        setFromLoginResponse,
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

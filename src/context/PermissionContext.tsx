import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface User {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  admin: boolean;
  role?: any;
}

interface PermissionContextType {
  user: User | null;
  permissions: Record<string, Record<string, boolean>>;
  isAdmin: boolean;
  can: (feature: string, capability: string) => boolean;
  canView: (feature: string) => boolean;
  loading: boolean;
  refreshPermissions: () => void;
}

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined,
);

export const PermissionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [loading, setLoading] = useState(true);

  const syncPermissions = async () => {
    try {
      const { authService } = await import("@/api/services/auth.service");
      const data = await authService.getMe();
      if (data.user) setUser(data.user);
      if (data.permissions) setPermissions(data.permissions);
    } catch (error) {
      console.error("Error syncing permissions:", error);
      setUser(null);
      setPermissions({});
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

  const refreshPermissions = () => {
    syncPermissions();
  };

  return (
    <PermissionContext.Provider
      value={{
        user,
        permissions,
        isAdmin,
        can,
        canView,
        loading,
        refreshPermissions,
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

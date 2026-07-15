import { useAuth } from "@/hrms/contexts/AuthContext";
import { useEffect, useState } from "react";
import { roleService } from "@/hrms/services/roleService";
import { RoleDefinition } from "@/hrms/types";

export function usePermission() {
  const { user } = useAuth();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setUserPermissions([]);
      return;
    }

    const roleKey = typeof user.role === "object" ? (user.role?.role || "") : (user.role || "");
    const rk = roleKey.toLowerCase();

    // Check if user is admin/owner (Full Access)
    const adminDetected = user.is_superadmin || user.admin === 1 || user.admin === true || user.admin === "1" || user.admin === "true" || rk.includes("owner") || rk.includes("super") || rk === "super_admin" || rk === "admin";
    setIsAdmin(adminDetected);

    // If role is already a populated object with permissions, use them directly
    if (typeof user.role === "object" && user.role.permissions?.length) {
      setUserPermissions(user.role.permissions);
    } else if (user.permissions?.length) {
      setUserPermissions(user.permissions);
    } else if (roleKey) {
      // Fallback: Fetch role details from API to get permissions
      roleService.getAll().then((roles) => {
        const userRole = roles.find((r) => r.id === roleKey || r.role === rk);
        if (userRole) {
          setUserPermissions(userRole.permissions || []);
        }
      });
    }
  }, [user]);

  const hasPermission = (permission: string) => {
    if (isAdmin) return true;
    const permissionList = permission.split("|");
    return permissionList.some(p => userPermissions.includes(p));
  };

  const hasAnyPermission = (permissions: string[]) => {
    if (isAdmin) return true;
    return permissions.some((p) => userPermissions.includes(p));
  };

  return { hasPermission, hasAnyPermission, isAdmin, userPermissions };
}

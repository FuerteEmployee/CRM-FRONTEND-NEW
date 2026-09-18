import { useAuth } from "@/hrms/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { roleService } from "@/hrms/services/roleService";

export const mapCrmToHrms = (permissionsMap: any): string[] => {
  if (!permissionsMap) return [];
  if (Array.isArray(permissionsMap)) return permissionsMap;

  const hrmsPerms: string[] = [];
  const getCap = (feat: string, cap: string): boolean => {
    const featObj = permissionsMap[feat];
    if (!featObj) return false;
    if (Array.isArray(featObj)) return featObj.includes(cap);
    if (typeof featObj === "object") return featObj[cap] === true;
    return false;
  };

  // Branch Management
  if (getCap("HRMS Branch Management", "View(Global)")) hrmsPerms.push("view_branches");
  if (getCap("HRMS Branch Management", "Create")) hrmsPerms.push("create_branches");
  if (getCap("HRMS Branch Management", "Edit")) hrmsPerms.push("edit_branches");
  if (getCap("HRMS Branch Management", "Delete")) hrmsPerms.push("delete_branches");

  // Attendance
  if (getCap("HRMS Attendance", "View(Global)")) hrmsPerms.push("view_attendance");

  // Leaves
  if (getCap("HRMS Leave Management", "View(Global)")) hrmsPerms.push("view_leaves");

  // Expenses
  if (getCap("HRMS Expense Management", "View(Global)")) hrmsPerms.push("manage_expenses");

  // Payroll
  if (getCap("HRMS Salary Management", "View(Global)")) {
    hrmsPerms.push("view_payroll");
    hrmsPerms.push("manage_payroll");
  }

  // Shifts
  if (getCap("HRMS Shift Management", "View(Global)")) hrmsPerms.push("manage_shifts");

  // Staff
  if (getCap("HRMS Staff Directory", "View(Global)")) {
    hrmsPerms.push("manage_users");
    hrmsPerms.push("view_staff");
    hrmsPerms.push("manage_staff"); // gates the "Device Approvals" sidebar item
  }
  if (getCap("HRMS Staff Directory", "Create")) hrmsPerms.push("create_staff");
  if (getCap("HRMS Staff Directory", "Edit")) hrmsPerms.push("edit_staff");
  if (getCap("HRMS Staff Directory", "Delete")) hrmsPerms.push("delete_staff");

  // Departments
  if (getCap("HRMS Departments", "View(Global)")) hrmsPerms.push("view_departments");

  // Designations
  if (getCap("HRMS Designations", "View(Global)")) hrmsPerms.push("manage_designations");

  return hrmsPerms;
};

// Takes `user` as a plain argument (rather than reading it via useAuth()) so it can be
// called both from usePermission() (HRMS pages/route guards) AND from AuthContext.tsx's
// own AuthProvider itself (which exposes `hasPermission` to ~26 files including the
// sidebar) without a circular hook dependency — AuthProvider can't call useAuth().
export function useResolvedHrmsPermissions(user: any) {
  // isAdmin and any permissions already embedded on `user` are derived synchronously
  // (useMemo) instead of via useEffect+setState — the effect version left a one-render
  // window right after this hook mounts (e.g. every fresh route/page) where isAdmin was
  // still its initial `false`, which was enough for PermissionGuard to flash "Access
  // Denied" or render blank before flipping to authorized. Only the rare fallback path
  // (role is a bare string with no embedded permissions, needing a roleService fetch)
  // still needs to be async.
  const roleKey = user ? ((user.role && typeof user.role === "object") ? (user.role?.role || "") : (user.role || "")) : "";
  const rk = roleKey.toLowerCase();

  const isAdmin = !!user && !!(
    user.is_superadmin || user.admin === 1 || user.admin === true || user.admin === "1" || user.admin === "true" ||
    rk.includes("owner") || rk.includes("super") || rk === "super_admin" || rk === "admin"
  );

  const directPermissions = useMemo(() => {
    if (!user) return null;
    if (user.role && typeof user.role === "object" && user.role.permissions) return mapCrmToHrms(user.role.permissions);
    if (user.permissions) return mapCrmToHrms(user.permissions);
    return null;
  }, [user]);

  const [fetchedPermissions, setFetchedPermissions] = useState<string[]>([]);
  useEffect(() => {
    if (!user || directPermissions !== null || !roleKey) return;
    let cancelled = false;
    roleService.getAll().then((roles) => {
      if (cancelled) return;
      const userRole = roles.find((r) => r.id === roleKey || r.role === rk);
      if (userRole) setFetchedPermissions(mapCrmToHrms(userRole.permissions) || []);
    });
    return () => { cancelled = true; };
  }, [user, directPermissions, roleKey, rk]);

  const userPermissions = directPermissions !== null ? directPermissions : fetchedPermissions;

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

export function usePermission() {
  const { user } = useAuth();
  return useResolvedHrmsPermissions(user);
}

// @refresh reset
import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "@/hrms/types";
import { authService } from "@/hrms/services/api";
import { staffService } from "@/hrms/services/staffService";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  previewLogin: () => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

import { usePermissionContext } from "@/context/PermissionContext";
import { useResolvedHrmsPermissions } from "@/hrms/hooks/usePermission";

// Setup > Staff's per-staff permission overrides (and Setup > Roles) only cover the
// "HRMS ..." feature group — the wider ERP modules below (masters/sales/purchase/
// inventory/accounts/operations/billing/marketing/system) have no per-staff granting
// UI at all yet. Only enforce real gating for permission keys the HRMS staff-management
// mapping actually produces (see mapCrmToHrms in hooks/usePermission.ts); anything else
// keeps the previous unrestricted behavior for any authenticated staff so the rest of
// the ERP doesn't go dark with no way to grant it back.
const KNOWN_HRMS_PERMISSIONS = new Set([
  "view_branches", "create_branches", "edit_branches", "delete_branches",
  "view_attendance", "view_leaves", "manage_expenses",
  "view_payroll", "manage_payroll", "manage_shifts",
  "manage_users", "view_staff", "create_staff", "edit_staff", "delete_staff",
  "view_departments", "manage_designations",
]);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, permissions, loading, logout } = usePermissionContext();

  // The main CRM's PermissionContext keeps `user` and `permissions` as separate
  // state (a staff member's per-user overrides aren't nested under user.role
  // unless they also have a Role assigned) — merge them here so downstream HRMS
  // code that reads `user.permissions` (see hrms/hooks/usePermission.ts) sees
  // the real per-staff overrides instead of always finding it undefined.
  const userWithPermissions = React.useMemo(() => {
    if (!user) return null;
    return { ...user, permissions: (user as any).permissions || permissions || {} };
  }, [user, permissions]);

  const resolved = useResolvedHrmsPermissions(userWithPermissions);

  const hasPermission = React.useCallback((permission: string): boolean => {
    if (!userWithPermissions) return false;
    if (resolved.isAdmin) return true;
    const parts = permission.split("|");
    const relevant = parts.filter((p) => KNOWN_HRMS_PERMISSIONS.has(p));
    if (relevant.length === 0) return true; // unmapped permission key — see comment above
    return relevant.some((p) => resolved.userPermissions.includes(p));
  }, [userWithPermissions, resolved]);

  const login = async (): Promise<string | null> => null;
  const previewLogin = () => {};
  const refreshUser = async () => {};

  return (
    <AuthContext.Provider
      value={{
        user: userWithPermissions as any,
        isLoading: loading,
        login,
        previewLogin,
        logout: async () => { await logout(); },
        hasPermission,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = usePermissionContext();

  const hasPermission = React.useCallback((permission: string): boolean => {
    // Basic mapping: Super admin bypasses all.
    // In a real system you might map HRMS permission strings to CRM permissions.
    // For now we allow access if the user is authenticated.
    if (!user) return false;
    if (user.is_superadmin || user.admin) return true;
    return true; // Staff can also access their HRMS modules
  }, [user]);

  const login = async (): Promise<string | null> => null;
  const previewLogin = () => {};
  const refreshUser = async () => {};

  return (
    <AuthContext.Provider
      value={{
        user: user as any,
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

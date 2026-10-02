import { apiClient } from "../client";
import { setTokens } from "@/lib/session";

export const authService = {
  login: async (data) => {
    const response = await apiClient.post("/auth/login", data);
    if (response.token) {
      setTokens(response.token, response.refreshToken);
    }
    return response;
  },

  verify2FA: async (data) => {
    const response = await apiClient.post("/auth/verify-2fa", data);
    if (response.token) {
      setTokens(response.token, response.refreshToken);
    }
    return response;
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
    localStorage.clear();
  },

  isAuthenticated: () => {
    return true;
  },

  getUser: () => null,
  getPermissions: () => null,

  getMe: async () => {
    const response = await apiClient.get("/auth/me");
    return response;
  },
};

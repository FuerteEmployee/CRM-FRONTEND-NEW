import { apiClient } from "./apiClient";
import { User } from "@/hrms/types";
import { mapUser } from "./apiUtils";
import { getDeviceInfo } from "@/hrms/utils/deviceId";

export const authService = {
  login: async (email: string, password: string): Promise<User | null> => {
    const deviceInfo = await getDeviceInfo();
    const response = await apiClient.post(
      "/users/login",
      { email, password, deviceId: deviceInfo.deviceId, deviceInfo },
      { silent: true }
    );
    if (response && response.user) {
      const user = mapUser(response.user);
      return { ...user, token: response.token } as User & { token: string };
    }
    return null;
  },
  getCurrentUser: async (): Promise<User | null> => {
    const stored = localStorage.getItem("std_user");
    if (!stored) return null;
    try {
      return mapUser(JSON.parse(stored));
    } catch {
      return null;
    }
  },
  logout: async () => {
    try {
      await apiClient.post("/users/logout", {}, { silent: true });
    } catch { /* ignore */ }
    localStorage.removeItem("std_user");
  },
};

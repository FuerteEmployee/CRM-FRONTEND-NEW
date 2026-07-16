import { apiClient } from "./apiClient";
import { User } from "@/hrms/types";
import { mapUser } from "./apiUtils";

export const userService = {
  getAll: async (params?: any): Promise<User[]> => {
    try {
      const query = params ? `?${new URLSearchParams(params).toString()}` : "?limit=1000";
      const res = await apiClient.get(`/users${query}`);
      const usersData = res.data || [];
      return usersData.map(mapUser);
    } catch {
      return [];
    }
  },

  getTechnicians: async (): Promise<User[]> => {
    const allUsers = await userService.getAll({ isActive: true });
    return allUsers.filter(u => {
      const roleName =
        typeof u.role === 'object'
          ? (u.role?.label || u.role?.role || "")
          : (u.role || "");
      return roleName.toLowerCase() === "technician";
    });
  }

};

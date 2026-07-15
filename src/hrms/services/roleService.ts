import { apiClient } from "./apiClient";
import type { Role } from "@/hrms/types";

export const roleService = {
  getAll: async (): Promise<Role[]> => {
    try {
      const res = await apiClient.get<any>("/roles");
      const data = res.data || res;
      const roles = Array.isArray(data) ? data : [];
      return roles.map((r: any) => ({
        ...r,
        id: r._id || r.id,
        label: r.label || "",
        description: r.description || "",
        permissions: r.permissions || [],
      }));
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      return [];
    }
  },

  create: async (data: Partial<Role>): Promise<Role> => {
    const res = await apiClient.post<any>("/roles", data);
    const result = res.data || res;
    return { ...result, id: result._id || result.id };
  },

  update: async (id: string, data: Partial<Role>): Promise<Role> => {
    const res = await apiClient.put<any>(`/roles/${id}`, data);
    const result = res.data || res;
    return { ...result, id: result._id || result.id };
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/roles/${id}`);
  },
};

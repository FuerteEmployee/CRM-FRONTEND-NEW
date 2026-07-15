import { apiClient } from "./apiClient";
import type { User } from "@/hrms/types";
import { mapUser } from "./apiUtils";


export const staffService = {
  getAll: async (): Promise<User[]> => {
    try {
      const res = await apiClient.get("/users?limit=1000");
      // Handle backend response wrapper { success: true, data: [...] }
      const usersData = res.data?.data || res.data || [];
      return Array.isArray(usersData) ? usersData.map(mapUser) : [];
    } catch (error) {
      console.error("Failed to fetch staff members:", error);
      return [];
    }
  },

  getById: async (id: string): Promise<User | undefined> => {
    try {
      const res = await apiClient.get(`/users/${id}`);
      const userData = res.data?.data || res.data;
      return userData ? mapUser(userData) : undefined;
    } catch (error) {
      console.error(`Failed to fetch staff member with id ${id}:`, error);
      return undefined;
    }
  },

  create: async (data: Partial<User>): Promise<User> => {
    const res = await apiClient.post("/users", data);
    const userData = res.data?.data || res.data;
    return mapUser(userData);
  },

  update: async (id: string, data: Partial<User>): Promise<User> => {
    const res = await apiClient.put(`/users/${id}`, data);
    const userData = res.data?.data || res.data;
    return mapUser(userData);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  bulkImport: async (formData: FormData): Promise<{ message: string; data: any }> => {
    const res = await apiClient.post("/import/bulk", formData);
    return res.data;
  },

  importStaff: async (data: any[]): Promise<{ count: number; message: string }> => {
    const res = await apiClient.post("/users/import", { staff: data });
    return res.data;
  },

  getSalespersons: async (): Promise<{ _id: string; name: string; mobile?: string }[]> => {
    try {
      const res = await apiClient.get("/users/salespersons");
      return res.data || [];
    } catch (error) {
      console.error("Failed to fetch salespersons:", error);
      return [];
    }
  }
};

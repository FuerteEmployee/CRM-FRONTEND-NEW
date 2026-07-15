import { apiClient } from "./apiClient";
import type { Store } from "@/hrms/types";

const mapStore = (s: any): Store => {
  if (!s) return s;
  return {
    ...s,
    id: s.id || s._id,
  };
};

export const storeService = {
  getAll: async (params?: any): Promise<{ data: Store[]; success: boolean; pagination?: any; stats?: any }> => {
    try {
      const res = await apiClient.get("/stores", { params });
      return {
        ...res,
        data: Array.isArray(res.data) ? res.data.map(mapStore) : []
      };
    } catch (error) {
      console.error("Failed to fetch stores:", error);
      return { success: false, data: [] };
    }
  },

  getById: async (id: string): Promise<Store | undefined> => {
    try {
      const res = await apiClient.get(`/stores/${id}`);
      return res.data ? mapStore(res.data) : undefined;
    } catch (error) {
      console.error(`Failed to fetch store with id ${id}:`, error);
      return undefined;
    }
  },

  create: async (data: Partial<Store>): Promise<any> => {
    return await apiClient.post("/stores", data);
  },

  update: async (id: string, data: Partial<Store>): Promise<any> => {
    return await apiClient.patch(`/stores/${id}`, data);
  },

  delete: async (id: string): Promise<any> => {
    return await apiClient.delete(`/stores/${id}`);
  }
};

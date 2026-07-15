import { apiClient } from "./apiClient";

export const departmentService = {
  getAll: async (): Promise<any[]> => {
    try {
      const res = await apiClient.get("/departments");
      return res.data?.data || res.data || [];
    } catch {
      return [];
    }
  },

  getById: async (id: string): Promise<any> => {
    const res = await apiClient.get(`/departments/${id}`);
    return res.data?.data || res.data;
  },

  create: async (data: any): Promise<any> => {
    const res = await apiClient.post("/departments", data);
    return res.data?.data || res.data;
  },

  update: async (id: string, data: any): Promise<any> => {
    const res = await apiClient.patch(`/departments/${id}`, data);
    return res.data?.data || res.data;
  },

  delete: async (id: string): Promise<any> => {
    const res = await apiClient.delete(`/departments/${id}`);
    return res;
  },
};

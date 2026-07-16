import { apiClient } from "./apiClient";

export interface Designation {
  _id: string;
  name: string;
  code: string;
  description?: string;
  level?: number;
  departmentId?: any;
  isActive: boolean;
}

export const designationService = {
  getAll: async (): Promise<Designation[]> => {
    try {
      const res = await apiClient.get("/designations");
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error("Failed to fetch designations:", error);
      return [];
    }
  },

  getById: async (id: string): Promise<Designation | undefined> => {
    const res = await apiClient.get(`/designations/${id}`);
    return res.data?.data || res.data;
  },

  create: async (data: Partial<Designation>): Promise<Designation> => {
    const res = await apiClient.post("/designations", data);
    return res.data?.data || res.data;
  },

  update: async (id: string, data: Partial<Designation>): Promise<Designation> => {
    const res = await apiClient.patch(`/designations/${id}`, data);
    return res.data?.data || res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/designations/${id}`);
  }
};

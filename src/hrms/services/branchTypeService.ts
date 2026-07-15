import { apiClient } from "./apiClient";

export interface BranchType {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

export const branchTypeService = {
  getAll: async (): Promise<BranchType[]> => {
    try {
      const res = await apiClient.get("/branch-types");
      return res.data?.data || res.data || [];
    } catch {
      return [];
    }
  },

  create: async (data: Partial<BranchType>): Promise<BranchType> => {
    const res = await apiClient.post("/branch-types", data);
    return res.data?.data || res.data;
  },

  update: async (id: string, data: Partial<BranchType>): Promise<BranchType> => {
    const res = await apiClient.patch(`/branch-types/${id}`, data);
    return res.data?.data || res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/branch-types/${id}`);
  },
};

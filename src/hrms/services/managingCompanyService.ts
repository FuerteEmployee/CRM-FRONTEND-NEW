import { apiClient } from "./apiClient";

export interface ManagingCompany {
  _id?: string;
  id?: string;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const managingCompanyService = {
  /**
   * List all managing companies
   */
  async list(active?: boolean): Promise<ManagingCompany[]> {
    const params = active !== undefined ? { active } : {};
    const response = await apiClient.get("/managing-companies", { params });
    return Array.isArray(response?.data) ? response.data : [];
  },

  /**
   * Get a single managing company by ID
   */
  async getById(id: string): Promise<ManagingCompany | null> {
    try {
      const response = await apiClient.get(`/managing-companies/${id}`);
      return response?.data || null;
    } catch {
      return null;
    }
  },

  /**
   * Create a new managing company
   */
  async create(data: Omit<ManagingCompany, "_id" | "id">): Promise<ManagingCompany> {
    const response = await apiClient.post("/managing-companies", data);
    return response?.data || {};
  },

  /**
   * Update a managing company
   */
  async update(id: string, data: Partial<ManagingCompany>): Promise<ManagingCompany> {
    const response = await apiClient.put(`/managing-companies/${id}`, data);
    return response?.data || {};
  },

  /**
   * Deactivate a managing company
   */
  async deactivate(id: string): Promise<ManagingCompany> {
    const response = await apiClient.patch(`/managing-companies/${id}/deactivate`);
    return response?.data || {};
  },

  /**
   * Hard-delete a managing company (server rejects with 409 while
   * any employee or settlement record still references it)
   */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/managing-companies/${id}`);
  },
};

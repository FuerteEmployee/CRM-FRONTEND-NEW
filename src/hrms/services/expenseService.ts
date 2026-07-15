import { apiClient } from "./apiClient";
import type { Expense } from "@/hrms/types";

export const expenseService = {
  getAll: async (params?: Record<string, string>) => {
    const response = await apiClient.get<Expense[]>("/expenses", params);
    return response.data.map(item => ({
      ...item,
      id: (item as any)._id || item.id
    }));
  },

  getById: async (id: string) => {
    const response = await apiClient.get<Expense>(`/expenses/${id}`);
    const data = response.data;
    return { ...data, id: (data as any)._id || data.id };
  },

  create: async (data: Partial<Expense>) => {
    const response = await apiClient.post<Expense>("/expenses", data);
    const item = response.data;
    return { ...item, id: (item as any)._id || item.id };
  },

  update: async (id: string, data: Partial<Expense>) => {
    const response = await apiClient.put<Expense>(`/expenses/${id}`, data);
    const item = response.data;
    return { ...item, id: (item as any)._id || item.id };
  },

  delete: async (id: string) => {
    return await apiClient.delete(`/expenses/${id}`);
  },
  updateStatus: async (id: string, status: string, notes?: string) => {
    const response = await apiClient.patch<Expense>(`/expenses/${id}/status`, { status, notes });
    const item = response.data;
    return { ...item, id: (item as any)._id || item.id };
  },
};

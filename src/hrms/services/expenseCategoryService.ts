import { apiClient } from "./apiClient";

export interface ExpenseCategory {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export const expenseCategoryService = {
  getAll: async (): Promise<ExpenseCategory[]> => {
    const response = await apiClient.get("/expense-categories");
    return response.data;
  },

  create: async (data: Partial<ExpenseCategory>): Promise<ExpenseCategory> => {
    const response = await apiClient.post("/expense-categories", data);
    return response.data;
  },

  update: async (id: string, data: Partial<ExpenseCategory>): Promise<ExpenseCategory> => {
    const response = await apiClient.put(`/expense-categories/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/expense-categories/${id}`);
  },
};

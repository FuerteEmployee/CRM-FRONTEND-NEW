import { apiClient } from "./apiClient";

export interface ChecklistItem {
  id: string;
  task: string;
  category: "Morning" | "Afternoon" | "Evening" | "Closing";
  completed: boolean;
  assignedTo?: string;
  userId?: string;
  roleId?: string;
  isGlobal?: boolean;
  date?: string;
  createdAt?: string;
}

export const checklistService = {
  getChecklist: async (userId: string, storeId?: string, date?: string): Promise<ChecklistItem[]> => {
    const today = date || new Date().toLocaleDateString("en-CA");
    const response = await apiClient.get(`/checklist?userId=${userId}&date=${today}${storeId ? `&storeId=${storeId}` : ""}`);
    return response.data || [];
  },

  toggleTask: async (taskId: string, completed: boolean, date?: string) => {
    const today = date || new Date().toLocaleDateString("en-CA");
    const response = await apiClient.post("/checklist/toggle", { taskId, completed, date: today });
    return response.data;
  },
  createTask: async (taskData: any) => {
    const response = await apiClient.post("/checklist/task", taskData);
    return response.data;
  },
  deleteTask: async (taskId: string) => {
    const response = await apiClient.delete(`/checklist/task/${taskId}`);
    return response.success;
  },
};

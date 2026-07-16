import { apiClient } from "./apiClient";

export interface TodoTask {
  _id: string;
  title: string;
  description?: string;
  category: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Completed" | "Ignored" | "Snoozed";
  relatedModule?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  branchId?: { _id: string; name: string };
  franchiseId?: { _id: string; name: string };
  assignedTo?: { _id: string; name: string };
  dueDate?: string;
  completedAt?: string;
  isSystemGenerated: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const todoService = {
  getTodos: async (params?: Record<string, any>) => {
    return apiClient.get(`/todos`, { params });
  },

  updateStatus: async (id: string, status: TodoTask["status"]) => {
    return apiClient.patch(`/todos/${id}/status`, { status });
  },

  deleteTodo: async (id: string) => {
    return apiClient.delete(`/todos/${id}`);
  },

  triggerGenerator: async () => {
    return apiClient.post(`/todos/generate`);
  },
};

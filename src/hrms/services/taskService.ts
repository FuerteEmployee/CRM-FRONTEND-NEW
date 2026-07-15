import { apiClient } from "./apiClient";

export interface Task {
  _id?: string;
  name: string;
  subtitle?: string;
  status?: string;
  startDate?: string;
  dueDate?: string;
  assignedTo?: any[];
  followers?: any[];
  description?: string;
  isPublic?: boolean;
  isBillable?: boolean;
  hourlyRate?: string;
  tags?: string[];
  priority?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const taskService = {
  getAll: async (): Promise<Task[]> => {
    const res = await apiClient.get("/tasks");
    return res.data || (Array.isArray(res) ? res : []);
  },

  createTask: async (data: Task): Promise<Task> => {
    const res = await apiClient.post("/tasks", data);
    return res.data || res;
  },

  updateTask: async (id: string, data: Partial<Task>): Promise<Task> => {
    const res = await apiClient.put(`/tasks/${id}`, data);
    return res.data || res;
  },

  create: async (data: Task): Promise<Task> => {
    return taskService.createTask(data);
  },

  update: async (id: string, data: Partial<Task>): Promise<Task> => {
    return taskService.updateTask(id, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  }
};

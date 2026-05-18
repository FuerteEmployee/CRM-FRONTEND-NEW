import { apiClient } from "../client";

export const taskService = {
  getAll: (params = {}) => apiClient.get("/tasks", { params }),

  getById: (id) => apiClient.get(`/tasks/${id}`),

  create: (data) => apiClient.post("/tasks", data),

  update: (id, data) => apiClient.put(`/tasks/${id}`, data),

  delete: (id) => apiClient.delete(`/tasks/${id}`),

  updateStatus: (id, status) => apiClient.patch(`/tasks/${id}/status`, { status })
};

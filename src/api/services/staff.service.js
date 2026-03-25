import { apiClient } from "../client";

export const staffService = {
  
  // Staff
  getAll: () => apiClient.get("/staff"),
  getById: (id) => apiClient.get(`/staff/${id}`),
  create: (data) => apiClient.post("/staff", data),
  update: (id, data) => apiClient.put(`/staff/${id}`, data),
  delete: (id) => apiClient.delete(`/staff/${id}`),

  // Roles
  getRoles: () => apiClient.get("/roles"),
  getRoleById: (id) => apiClient.get(`/roles/${id}`),
  createRole: (data) => apiClient.post("/roles", data),
  updateRole: (id, data) => apiClient.put(`/roles/${id}`, data),
  deleteRole: (id) => apiClient.delete(`/roles/${id}`),
};

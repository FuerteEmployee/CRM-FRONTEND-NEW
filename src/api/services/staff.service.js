import { apiClient } from "../client";

export const staffService = {
  
  // Staff
  getAll: () => apiClient.get("/staff"),
  // Lightweight list for Assignees/Followers-style pickers — not gated by the
  // "Staff" module permission, so any staff member can populate these dropdowns.
  getAssignable: () => apiClient.get("/staff/assignable"),
  getById: (id) => apiClient.get(`/staff/${id}`),
  create: (data) => apiClient.post("/staff", data),
  import: (rows) => apiClient.post("/staff/import", rows),
  update: (id, data) => apiClient.put(`/staff/${id}`, data),
  delete: (id) => apiClient.delete(`/staff/${id}`),

  // Roles
  getRoles: () => apiClient.get("/roles"),
  getRoleById: (id) => apiClient.get(`/roles/${id}`),
  createRole: (data) => apiClient.post("/roles", data),
  updateRole: (id, data) => apiClient.put(`/roles/${id}`, data),
  deleteRole: (id) => apiClient.delete(`/roles/${id}`),
};

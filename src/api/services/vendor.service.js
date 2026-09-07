import { apiClient } from "../client";

export const vendorService = {
  getAll: (params = {}) => apiClient.get("/vendors", { params }),

  getById: (id) => apiClient.get(`/vendors/${id}`),

  create: (data) => apiClient.post("/vendors", data),

  update: (id, data) => apiClient.put(`/vendors/${id}`, data),

  delete: (id) => apiClient.delete(`/vendors/${id}`),

  bulkDelete: (ids) => apiClient.post("/vendors/bulk-delete", { ids }),

  importVendors: (data) => apiClient.post("/vendors/import", data)
};

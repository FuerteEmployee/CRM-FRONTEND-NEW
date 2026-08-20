import { apiClient } from "../client";

export const purchaseService = {
  getAll: (params = {}) => apiClient.get("/purchases", { params }),

  getById: (id) => apiClient.get(`/purchases/${id}`),

  create: (data) => apiClient.post("/purchases", data),

  update: (id, data) => apiClient.put(`/purchases/${id}`, data),

  delete: (id) => apiClient.delete(`/purchases/${id}`),

  bulkDelete: (ids) => apiClient.post("/purchases/bulk-delete", { ids }),

  importPurchases: (data) => apiClient.post("/purchases/import", data)
};

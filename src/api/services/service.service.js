import { apiClient } from "../client";

export const serviceService = {
  getAll: () => apiClient.get("/services"),
  getById: (id) => apiClient.get(`/services/${id}`),
  create: (data) => apiClient.post("/services", data),
  bulkCreate: (data) => apiClient.post("/services/bulk", data),
  update: (id, data) => apiClient.put(`/services/${id}`, data),
  delete: (id) => apiClient.delete(`/services/${id}`),
};

import { apiClient } from "../client";

export const spamService = {
  getAll: () => apiClient.get("/spam-filters"),
  create: (data) => apiClient.post("/spam-filters", data),
  update: (id, data) => apiClient.patch(`/spam-filters/${id}`, data),
  delete: (id) => apiClient.delete(`/spam-filters/${id}`),
};

import { apiClient } from "../client";

export const procurementService = {
  // Categories
  listCategories: (params = {}) => apiClient.get("/purchase-categories", { params }),
  getCategory: (id) => apiClient.get(`/purchase-categories/${id}`),
  createCategory: (data) => apiClient.post("/purchase-categories", data),
  updateCategory: (id, data) => apiClient.put(`/purchase-categories/${id}`, data),
  archiveCategory: (id) => apiClient.patch(`/purchase-categories/${id}/archive`),

  // Factory Locations
  listLocations: (params = {}) => apiClient.get("/locations", { params }),
  createLocation: (data) => apiClient.post("/locations", data),
  updateLocation: (id, data) => apiClient.put(`/locations/${id}`, data),
  deleteLocation: (id) => apiClient.delete(`/locations/${id}`),
};

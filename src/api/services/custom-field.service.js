import { apiClient } from "../client";

export const customFieldService = {
  getAll: (fieldto) => apiClient.get(`/custom-fields${fieldto ? `?fieldto=${fieldto}` : ""}`),
};

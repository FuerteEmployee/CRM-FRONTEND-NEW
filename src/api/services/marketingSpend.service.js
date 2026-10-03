import { apiClient } from "../client";

// Daily marketing "burning amount" (ad spend). Leads and cost-per-lead in the
// responses are computed by the backend from real lead data.
export const marketingSpendService = {
  // params: { dateFrom?: "YYYY-MM-DD", dateTo?: "YYYY-MM-DD", source?, campaign? }
  list: (params) => apiClient.get("/marketing-spend", params ? { params } : undefined),
  summary: () => apiClient.get("/marketing-spend/summary"),
  // data: { day: "YYYY-MM-DD", amount, source?, campaign?, notes? }
  create: (data) => apiClient.post("/marketing-spend", data),
  update: (id, data) => apiClient.put(`/marketing-spend/${id}`, data),
  delete: (id) => apiClient.delete(`/marketing-spend/${id}`),
};

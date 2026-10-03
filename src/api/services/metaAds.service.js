import { apiClient } from "../client";

// Per-company Meta Ads ad-account connections (tokens are never returned).
export const metaAdsService = {
  listAccounts: () => apiClient.get("/meta-ads/accounts"),
  // data: { ad_account_id: "act_123…", access_token }
  connect: (data) => apiClient.post("/meta-ads/accounts", data),
  // data: { access_token?, is_active? }
  update: (id, data) => apiClient.patch(`/meta-ads/accounts/${id}`, data),
  disconnect: (id) => apiClient.delete(`/meta-ads/accounts/${id}`),
  syncNow: (days = 7) => apiClient.post("/meta-ads/sync", { days }),
};

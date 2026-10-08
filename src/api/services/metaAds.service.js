import { apiClient } from "../client";

// Per-company Meta Ads ad-account connections (tokens are never returned).
export const metaAdsService = {
  listAccounts: () => apiClient.get("/meta-ads/accounts"),
  // Facebook Pages an ad account advertises — before connecting (data:
  // { ad_account_id, access_token }) or for a connected account (id).
  previewPages: (data) => apiClient.post("/meta-ads/pages", data),
  accountPages: (id) => apiClient.get(`/meta-ads/accounts/${id}/pages`),
  // data: { ad_account_id: "act_123…", access_token, page_ids? }
  connect: (data) => apiClient.post("/meta-ads/accounts", data),
  // data: { access_token?, is_active?, page_ids? }
  update: (id, data) => apiClient.patch(`/meta-ads/accounts/${id}`, data),
  disconnect: (id) => apiClient.delete(`/meta-ads/accounts/${id}`),
  syncNow: (days = 7) => apiClient.post("/meta-ads/sync", { days }),
};

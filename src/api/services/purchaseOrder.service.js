import { apiClient } from "../client";

// Purchase Orders add-on — see CRM-BACKEND/src/routes/purchase_order_routes.js.
export const purchaseOrderService = {
  list: (params) => apiClient.get("/purchase-orders", params ? { params } : undefined),
  stats: (params) => apiClient.get("/purchase-orders/stats", params ? { params } : undefined),
  getById: (id) => apiClient.get(`/purchase-orders/${id}`),
  create: (data) => apiClient.post("/purchase-orders", data),
  update: (id, data) => apiClient.put(`/purchase-orders/${id}`, data),
  delete: (id) => apiClient.delete(`/purchase-orders/${id}`),
  submit: (id) => apiClient.post(`/purchase-orders/${id}/submit`),
  approve: (id, reason) => apiClient.post(`/purchase-orders/${id}/approve`, { reason }),
  reject: (id, reason) => apiClient.post(`/purchase-orders/${id}/reject`, { reason }),
  changeStatus: (id, status, note) => apiClient.post(`/purchase-orders/${id}/status`, { status, note }),
  pendingApprovals: () => apiClient.get("/purchase-orders/approvals/pending"),
  // pdf: a Blob of the generated PO; to: optional number override.
  sendWhatsApp: (id, pdf, filename, to) => {
    const form = new FormData();
    form.append("file", pdf, filename);
    if (to) form.append("to", to);
    return apiClient.post(`/purchase-orders/${id}/whatsapp`, form);
  },

  getSettings: () => apiClient.get("/purchase-orders/settings"),
  updateSettings: (data) => apiClient.put("/purchase-orders/settings", data),

  priceList: (params) => apiClient.get("/purchase-orders/price-list", params ? { params } : undefined),
  previewPrices: (rows) => apiClient.post("/purchase-orders/price-list/preview", { rows }),
  importPrices: (rows) => apiClient.post("/purchase-orders/price-list/import", { rows }),
  updateItemPrices: (itemId, data) => apiClient.put(`/purchase-orders/price-list/${itemId}`, data),
};

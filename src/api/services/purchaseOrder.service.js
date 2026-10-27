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
  // received: [{ line_id, qty_received }] — required for "partially_received".
  changeStatus: (id, status, note, received) => apiClient.post(`/purchase-orders/${id}/status`, { status, note, received }),
  pendingApprovals: () => apiClient.get("/purchase-orders/approvals/pending"),
  // pdf: a Blob of the generated PO; to: optional number override.
  sendWhatsApp: (id, pdf, filename, to) => {
    const form = new FormData();
    form.append("file", pdf, filename);
    if (to) form.append("to", to);
    return apiClient.post(`/purchase-orders/${id}/whatsapp`, form);
  },

  // The customer's own PO (PDF / JPG / PNG, up to 10 MB) on the Purchase PO. Replaces any earlier file.
  uploadCustomerPoFile: (id, file) => {
    const form = new FormData();
    form.append("file", file, file.name);
    return apiClient.post(`/purchase-orders/${id}/customer-po-file`, form);
  },
  // R4: { po, company } for the PO PDF — only after the approver's Yes (else 400).
  printData: (id) => apiClient.get(`/purchase-orders/${id}/print`),

  getSettings: () => apiClient.get("/purchase-orders/settings"),
  updateSettings: (data) => apiClient.put("/purchase-orders/settings", data),
  // Q2: a customer's price level ("end_user" | "distributor").
  setPriceLevel: (customer, level) => apiClient.put("/purchase-orders/settings/price-level", { customer, level }),

  // PO Items: the module's own item list + price master (not the CRM Items module).
  // params: search, page, limit, active ("true" = only switched-on items, for the picker).
  items: (params) => apiClient.get("/purchase-orders/items", params ? { params } : undefined),
  createItem: (data) => apiClient.post("/purchase-orders/items", data),
  updateItem: (itemId, data) => apiClient.put(`/purchase-orders/items/${itemId}`, data),
  deleteItem: (itemId) => apiClient.delete(`/purchase-orders/items/${itemId}`),
  previewItems: (rows) => apiClient.post("/purchase-orders/items/import/preview", { rows }),
  importItems: (rows) => apiClient.post("/purchase-orders/items/import", { rows }),
  exportItems: () => apiClient.get("/purchase-orders/items/export"),
  itemCategories: () => apiClient.get("/purchase-orders/items/categories"),
  // Round 29 (S1): series (price-list sheets) with item counts + the default series.
  // params: active ("true" = switched-on items only, for the picker).
  itemSeries: (params) => apiClient.get("/purchase-orders/items/series", params ? { params } : undefined),
  // Round 29 (S3): read the customer PO (text PDF / .xlsx) -> review lines. Nothing is saved.
  readCustomerPo: (file, customer) => {
    const form = new FormData();
    form.append("file", file, file.name);
    if (customer) form.append("customer", customer);
    return apiClient.post("/purchase-orders/customer-po/read", form);
  },
  // R3: the Brady price list — scan (header + mapping per sheet), preview, import one batch.
  scanPriceList: (sheets) => apiClient.post("/purchase-orders/items/pricelist/scan", { sheets }),
  previewPriceList: (body) => apiClient.post("/purchase-orders/items/pricelist/preview", body),
  importPriceList: (body) => apiClient.post("/purchase-orders/items/pricelist/import", body),
  // Round 30 (S6): the whole price list kept as a reference (batches; done: true switches over).
  saveReference: (body) => apiClient.post("/purchase-orders/items/pricelist/reference", body),
  referenceStatus: () => apiClient.get("/purchase-orders/items/pricelist/reference"),
  // "+ Add Catalog No.": text = one or more catalog nos. / Y codes / obsolete catalogs.
  findCatalogs: (text) => apiClient.post("/purchase-orders/items/catalog/find", { text }),
  addCatalogs: (text) => apiClient.post("/purchase-orders/items/catalog/add", { text }),

  // R5: Proforma invoices.
  // again: true = make another one although the PO already has a proforma.
  createProforma: (poId, again) => apiClient.post(`/purchase-orders/${poId}/proforma`, again ? { again: true } : {}),
  proformas: (params) => apiClient.get("/purchase-orders/proformas", params ? { params } : undefined),
  getProforma: (id) => apiClient.get(`/purchase-orders/proformas/${id}`),
  updateProforma: (id, data) => apiClient.put(`/purchase-orders/proformas/${id}`, data),
  cancelProforma: (id) => apiClient.post(`/purchase-orders/proformas/${id}/cancel`),
  proformaPrint: (id) => apiClient.get(`/purchase-orders/proformas/${id}/print`),
  sendProformaWhatsApp: (id, pdf, filename, to) => {
    const form = new FormData();
    form.append("file", pdf, filename);
    if (to) form.append("to", to);
    return apiClient.post(`/purchase-orders/proformas/${id}/whatsapp`, form);
  },
};

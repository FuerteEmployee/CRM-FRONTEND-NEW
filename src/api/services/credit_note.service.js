import { apiClient } from "../client";

export const creditNoteService = {
  getAll: (params) => apiClient.get("/credit-notes", { params }),
  getById: (id) => apiClient.get(`/credit-notes/${id}`),
  getByInvoice: (invoiceId) => apiClient.get(`/credit-notes/invoice/${invoiceId}`),
  create: (data) => apiClient.post("/credit-notes", data),
  update: (id, data) => apiClient.put(`/credit-notes/${id}`, data),
  delete: (id) => apiClient.delete(`/credit-notes/${id}`),
  import: (data) => apiClient.post("/credit-notes/import", data),
  applyToInvoice: (id, data) => apiClient.post(`/credit-notes/${id}/apply`, data),
};

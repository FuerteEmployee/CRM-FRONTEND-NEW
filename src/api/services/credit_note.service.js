import { apiClient } from "../client";

export const creditNoteService = {
  getAll: (params) => apiClient.get("/credit-notes", { params }),
  getById: (id) => apiClient.get(`/credit-notes/${id}`),
  // Next credit note number + Setup > Settings > Credit Notes defaults for a new credit note.
  getNextNumber: (date) => apiClient.get(`/credit-notes/next-number${date ? `?date=${encodeURIComponent(date)}` : ""}`),
  getByInvoice: (invoiceId) => apiClient.get(`/credit-notes/invoice/${invoiceId}`),
  create: (data) => apiClient.post("/credit-notes", data),
  update: (id, data) => apiClient.put(`/credit-notes/${id}`, data),
  delete: (id) => apiClient.delete(`/credit-notes/${id}`),
  import: (data) => apiClient.post("/credit-notes/import", data),
  applyToInvoice: (id, data) => apiClient.post(`/credit-notes/${id}/apply`, data),
};

import { apiClient } from "../client";

export const estimateService = {
  /** Fetch all estimates. Pass query params as needed: ?type=form_submission */
  getEstimates: (params = {}) => {
    // Drop undefined/null so callers can pass optional filters without them
    // literally becoming the string "undefined" in the query (URLSearchParams
    // stringifies every value it's given, undefined included).
    const cleaned = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const query = new URLSearchParams(cleaned).toString();
    return apiClient.get(`/estimates${query ? `?${query}` : ""}`);
  },
  getEstimateById: (id) => apiClient.get(`/estimates/${id}`),
  createEstimate: (data) => apiClient.post("/estimates", data),
  updateEstimate: (id, data) => apiClient.put(`/estimates/${id}`, data),
  deleteEstimate: (id) => apiClient.delete(`/estimates/${id}`),
  bulkDeleteEstimates: (ids) => apiClient.post("/estimates/bulk-delete", { ids }),
  getFormSubmissions: () => apiClient.get("/estimates"),

  // ─────────────────────────────────────────────
  // Estimate Statuses
  // ─────────────────────────────────────────────

  getEstimateStatuses: () => apiClient.get("/estimate-statuses"),
  createEstimateStatus: (data) => apiClient.post("/estimate-statuses", data),
  updateEstimateStatus: (id, data) =>
    apiClient.put(`/estimate-statuses/${id}`, data),
  deleteEstimateStatus: (id) => apiClient.delete(`/estimate-statuses/${id}`),

  // ─────────────────────────────────────────────
  // Estimate Request Forms (form builder)
  // ─────────────────────────────────────────────

  getEstimateRequestForms: () => apiClient.get("/estimate-request-forms"),

  getEstimateRequestFormById: (id) =>
    apiClient.get(`/estimate-request-forms/${id}`),

  createEstimateRequestForm: (data) =>
    apiClient.post("/estimate-request-forms", data),

  updateEstimateRequestForm: (id, data) =>
    apiClient.put(`/estimate-request-forms/${id}`, data),

  deleteEstimateRequestForm: (id) =>
    apiClient.delete(`/estimate-request-forms/${id}`),

  // ─────────────────────────────────────────────
  // Public Form (unauthenticated — customer-facing)
  // ─────────────────────────────────────────────

  /** Fetch the public (embeddable) form definition by form id */
  getPublicForm: (id) => apiClient.get(`/estimate-request-forms/public/${id}`),

  /** Submit the public form — sends structured field data as form_data in body */
  submitPublicForm: (id, data) =>
    apiClient.post(`/estimate-request-forms/public/${id}/submit`, data),

  // ─────────────────────────────────────────────
  // Estimate Requests (submissions)
  // ─────────────────────────────────────────────

  getRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/estimate-requests${query ? `?${query}` : ""}`);
  },

  getRequestById: (id) => apiClient.get(`/estimate-requests/${id}`),

  updateRequestStatus: (id, status) =>
    apiClient.patch(`/estimate-requests/${id}/status`, { status }),

  updateRequest: (id, data) =>
    apiClient.put(`/estimate-requests/${id}`, data),

  deleteRequest: (id) => apiClient.delete(`/estimate-requests/${id}`),

  convertToInvoice: (id) => apiClient.post(`/estimates/${id}/convert-to-invoice`),
  import: (data) => apiClient.post("/estimates/import", data),
};

import { apiClient } from "../client";

class QuotationService {
  async getStats(quotationTypeId) {
    return apiClient.get(quotationTypeId ? `/quotations/stats?quotation_type=${quotationTypeId}` : "/quotations/stats");
  }

  async getQuotations(limit, quotationTypeId) {
    const params = new URLSearchParams();
    if (limit) params.set("limit", limit);
    if (quotationTypeId) params.set("quotation_type", quotationTypeId);
    const qs = params.toString();
    return apiClient.get(qs ? `/quotations?${qs}` : "/quotations");
  }

  async create(data) {
    return apiClient.post("/quotations", data);
  }

  async getById(id) {
    return apiClient.get(`/quotations/${id}`);
  }

  async update(id, data) {
    return apiClient.put(`/quotations/${id}`, data);
  }

  async delete(id) {
    return apiClient.delete(`/quotations/${id}`);
  }
}

export const quotationService = new QuotationService();

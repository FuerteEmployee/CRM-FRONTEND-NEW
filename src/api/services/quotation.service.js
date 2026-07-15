import { apiClient } from "../client";

class QuotationService {
  async getStats() {
    return apiClient.get("/quotations/stats");
  }

  async getQuotations(limit) {
    return apiClient.get(limit ? `/quotations?limit=${limit}` : "/quotations");
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

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
}

export const quotationService = new QuotationService();

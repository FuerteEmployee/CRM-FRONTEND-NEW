import { apiClient as api } from "../client";

export const faqService = {
  getAll: async () => {
    const response = await api.get("/faqs");
    return response;
  },

  create: async (data: any) => {
    const response = await api.post("/faqs", data);
    return response;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/faqs/${id}`, data);
    return response;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/faqs/${id}`);
    return response;
  },
};


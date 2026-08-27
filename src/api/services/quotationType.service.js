import { apiClient } from '../client';

export const quotationTypeService = {
  getQuotationTypes: (activeOnly) => apiClient.get(activeOnly ? '/quotation-types?activeOnly=true' : '/quotation-types'),
  createQuotationType: (data) => apiClient.post('/quotation-types', data),
  updateQuotationType: (id, data) => apiClient.put(`/quotation-types/${id}`, data),
  deleteQuotationType: (id) => apiClient.delete(`/quotation-types/${id}`),
  reorderQuotationTypes: (items) => apiClient.put('/quotation-types/reorder', { items }),
};

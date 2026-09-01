import { apiClient } from '../client';

export const itemService = {
  getAll: (params) => apiClient.get('/items', params ? { params } : undefined),
  create: (data) => apiClient.post('/items', data),
  update: (id, data) => apiClient.put(`/items/${id}`, data),
  delete: (id) => apiClient.delete(`/items/${id}`),
  bulkDelete: (ids) => apiClient.post('/items/bulk-delete', { ids }),
  import: (data) => apiClient.post('/items/import', data),
};

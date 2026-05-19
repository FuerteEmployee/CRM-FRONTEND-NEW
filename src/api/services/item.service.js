import { apiClient } from '../client';

export const itemService = {
  getAll: () => apiClient.get('/items'),
  create: (data) => apiClient.post('/items', data),
  update: (id, data) => apiClient.put(`/items/${id}`, data),
  delete: (id) => apiClient.delete(`/items/${id}`),
};

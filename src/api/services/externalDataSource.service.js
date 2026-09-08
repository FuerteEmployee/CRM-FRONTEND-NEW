import { apiClient } from '../client';

export const externalDataSourceService = {
  getAll: () => apiClient.get('/external-data-sources'),
  create: (data) => apiClient.post('/external-data-sources', data),
  update: (id, data) => apiClient.put(`/external-data-sources/${id}`, data),
  delete: (id) => apiClient.delete(`/external-data-sources/${id}`),
  getData: (id) => apiClient.get(`/external-data-sources/${id}/data`),
};

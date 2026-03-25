
import { apiClient } from '../client';

export const leadService = {
  getAll: () => apiClient.get('/leads'),
  
  getById: (id) => apiClient.get(`/leads/${id}`),
  
  create: (data) => apiClient.post('/leads', data),
  
  update: (id, data) => apiClient.put(`/leads/${id}`, data),

  delete: (id) => apiClient.delete(`/leads/${id}`),
  
  // Lead Sources
  getSources: () => apiClient.get('/lead-sources'),
  createSource: (data) => apiClient.post('/lead-sources', data),
  updateSource: (id, data) => apiClient.patch(`/lead-sources/${id}`, data),
  deleteSource: (id) => apiClient.delete(`/lead-sources/${id}`),

  // Lead Statuses
  getStatuses: () => apiClient.get('/lead-statuses'),
  createStatus: (data) => apiClient.post('/lead-statuses', data),
  updateStatus: (id, data) => apiClient.patch(`/lead-statuses/${id}`, data),
  deleteStatus: (id) => apiClient.delete(`/lead-statuses/${id}`),
};

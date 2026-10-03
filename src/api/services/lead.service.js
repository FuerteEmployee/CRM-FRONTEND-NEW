
import { apiClient } from '../client';

export const leadService = {
  getAll: (params) => apiClient.get('/leads', params ? { params } : undefined),
  
  getById: (id) => apiClient.get(`/leads/${id}`),
  
  create: (data) => apiClient.post('/leads', data),
  
  update: (id, data) => apiClient.put(`/leads/${id}`, data),

  updateLeadStatus: (id, status) => apiClient.patch(`/leads/${id}/status`, { status }),

  delete: (id) => apiClient.delete(`/leads/${id}`),

  bulkDelete: (ids) => apiClient.post('/leads/bulk-delete', { ids }),

  // data: { treatment_item?, treatment_name, treatment_amount, notes?, converted_at? }
  convertToCustomer: (id, data) => apiClient.post(`/leads/${id}/convert`, data || {}),

  getOverview: () => apiClient.get('/leads/overview'),

  // bucket: "today" | "overdue" | "upcoming"
  getFollowUps: (bucket, limit = 50) => apiClient.get('/leads/follow-ups', { params: { bucket, limit } }),

  getConversions: (params) => apiClient.get('/leads/conversions', params ? { params } : undefined),

  updateConversion: (id, data) => apiClient.put(`/leads/conversions/${id}`, data),

  setupPipelineStatuses: () => apiClient.post('/leads/pipeline-statuses', {}),

  markAsLost: (id) => apiClient.patch(`/leads/${id}/lost`),

  markAsJunk: (id) => apiClient.patch(`/leads/${id}/junk`),

  importLeads: (data) => apiClient.post('/leads/import', data),
  
  // Lead Sources
  getSources: () => apiClient.get('/lead-sources'),
  createSource: (data) => apiClient.post('/lead-sources', data),
  bulkCreateSource: (data) => apiClient.post('/lead-sources/bulk', data),
  updateSource: (id, data) => apiClient.patch(`/lead-sources/${id}`, data),
  deleteSource: (id) => apiClient.delete(`/lead-sources/${id}`),

  // Lead Statuses
  getStatuses: () => apiClient.get('/lead-statuses'),
  createStatus: (data) => apiClient.post('/lead-statuses', data),
  bulkCreateStatus: (data) => apiClient.post('/lead-statuses/bulk', data),
  updateStatus: (id, data) => apiClient.patch(`/lead-statuses/${id}`, data),
  deleteStatus: (id) => apiClient.delete(`/lead-statuses/${id}`),
};

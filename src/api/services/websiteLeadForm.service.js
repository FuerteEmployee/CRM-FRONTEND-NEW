import { apiClient } from '../client';

export const websiteLeadFormService = {
  list: () => apiClient.get('/website-lead-forms'),

  create: (name) => apiClient.post('/website-lead-forms', { name }),

  remove: (id) => apiClient.delete(`/website-lead-forms/${id}`),
};

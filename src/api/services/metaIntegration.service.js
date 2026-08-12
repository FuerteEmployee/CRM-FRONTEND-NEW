import { apiClient } from '../client';

export const metaIntegrationService = {
  get: () => apiClient.get('/meta-integration'),

  connect: (data) => apiClient.post('/meta-integration/connect', data),

  sync: (pageId) => apiClient.post(`/meta-integration/${pageId}/sync`),

  importLeads: (pageId, formId) =>
    apiClient.post(`/meta-integration/${pageId}/import-leads`, formId ? { form_id: formId } : {}),

  disconnect: (pageId) => apiClient.delete(`/meta-integration/${pageId}`),
};

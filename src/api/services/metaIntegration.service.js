import { apiClient } from '../client';

export const metaIntegrationService = {
  get: () => apiClient.get('/meta-integration'),

  connect: (data) => apiClient.post('/meta-integration/connect', data),

  sync: () => apiClient.post('/meta-integration/sync'),

  importLeads: (formId) => apiClient.post('/meta-integration/import-leads', formId ? { form_id: formId } : {}),

  disconnect: () => apiClient.delete('/meta-integration'),
};

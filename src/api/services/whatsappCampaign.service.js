import { apiClient } from '../client';

export const whatsappCampaignService = {
  getTemplates: (refresh) => apiClient.get('/whatsapp/campaigns/templates', { params: refresh ? { refresh: 'true' } : {} }),
  getAnalytics: () => apiClient.get('/whatsapp/campaigns/analytics'),
  getLogs: (params) => apiClient.get('/whatsapp/campaigns/logs', { params }),
  getCampaigns: () => apiClient.get('/whatsapp/campaigns'),

  // `data` may be a plain object (JSON body) or a FormData instance (when an
  // image header file is attached) — apiClient's post/put already detect
  // FormData and skip JSON-stringifying it.
  createCampaign: (data) => apiClient.post('/whatsapp/campaigns', data),
  updateCampaign: (id, data) => apiClient.put(`/whatsapp/campaigns/${id}`, data),
  deleteCampaign: (id) => apiClient.delete(`/whatsapp/campaigns/${id}`),
  triggerCampaign: (id, recipients) => apiClient.post(`/whatsapp/campaigns/${id}/trigger`, recipients ? { recipients } : {}),
  stopCampaign: (id) => apiClient.post(`/whatsapp/campaigns/${id}/stop`),
};

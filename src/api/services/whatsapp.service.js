import { apiClient } from '../client';

export const whatsappService = {
  getIntegrations: () => apiClient.get('/whatsapp-integration'),
  connect: (data) => apiClient.post('/whatsapp-integration/connect', data),
  setLiveMode: (id, isLive) => apiClient.patch(`/whatsapp-integration/${id}/live-mode`, { is_live: isLive }),
  disconnect: (id) => apiClient.delete(`/whatsapp-integration/${id}`),

  getConditions: () => apiClient.get('/whatsapp/conditions'),
  createCondition: (data) => apiClient.post('/whatsapp/conditions', data),
  updateCondition: (id, data) => apiClient.put(`/whatsapp/conditions/${id}`, data),
  deleteCondition: (id) => apiClient.delete(`/whatsapp/conditions/${id}`),
};

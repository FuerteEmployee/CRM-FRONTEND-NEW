import { apiClient } from '../client';

export const whatsappInboxService = {
  getInbox: () => apiClient.get('/whatsapp/inbox'),
  replyToInbox: (id, text) => apiClient.post(`/whatsapp/inbox/${id}/reply`, { text }),
  ignoreInboxMessage: (id) => apiClient.patch(`/whatsapp/inbox/${id}/ignore`),

  getConversations: () => apiClient.get('/whatsapp/inbox/conversations'),
  getConversationMessages: (mobile) => apiClient.get(`/whatsapp/inbox/conversations/${mobile}`),
  getWindowStatus: (mobile) => apiClient.get(`/whatsapp/inbox/window/${mobile}`),
  getContactInfo: (mobile) => apiClient.get(`/whatsapp/inbox/contact/${mobile}`),
  // `data` is a FormData instance when a file attachment is included, else a plain object.
  replyToConversation: (mobile, data) => apiClient.post(`/whatsapp/inbox/conversations/${mobile}/reply`, data),
  sendTemplateToConversation: (mobile, templateId, bodyParams) =>
    apiClient.post(`/whatsapp/inbox/conversations/${mobile}/send-template`, { templateId, bodyParams }),
};

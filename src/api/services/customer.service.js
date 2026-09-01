import { apiClient } from "../client";

export const customerService = {
  // Clients
  getAll: (params) => apiClient.get("/clients", params ? { params } : undefined),

  getById: (id) => apiClient.get(`/clients/${id}`),

  create: (data) => apiClient.post("/clients", data),

  update: (id, data) => apiClient.put(`/clients/${id}`, data),

  delete: (id) => apiClient.delete(`/clients/${id}`),

  importClients: (data, branchId) =>
    apiClient.post("/clients/import", branchId ? { clients: data, branchId } : data),

  importContacts: (data) => apiClient.post("/clients/contacts/import", data),
  getStatement: (id, params) => apiClient.get(`/clients/${id}/statement`, { params }),

  // Contacts
  getContacts: (clientId) => apiClient.get(`/clients/${clientId}/contacts`),

  getAllContacts: () => apiClient.get("/clients/contacts/all"),

  createContact: (clientId, data) =>
    apiClient.post(`/clients/${clientId}/contacts`, data),

  updateContact: (id, data) => apiClient.put(`/clients/contacts/${id}`, data),

  deleteContact: (id) => apiClient.delete(`/clients/contacts/${id}`),

  // Vault
  getVault: (clientId) => apiClient.get(`/clients/${clientId}/vault`),

  createVaultEntry: (clientId, data) =>
    apiClient.post(`/clients/${clientId}/vault`, data),

  // Groups
  getGroups: () => apiClient.get("/client-groups"),
  createGroup: (data) => apiClient.post("/client-groups", data),
  bulkCreateGroup: (data) => apiClient.post("/client-groups/bulk", data),
  updateGroup: (id, data) => apiClient.put(`/client-groups/${id}`, data),
  deleteGroup: (id) => apiClient.delete(`/client-groups/${id}`),

  // Files
  getFiles: (clientId) => apiClient.get(`/clients/${clientId}/files`),
  uploadFile: (clientId, data) => apiClient.post(`/clients/${clientId}/files`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteFile: (clientId, fileId) => apiClient.delete(`/clients/${clientId}/files/${fileId}`),
  
  // Reminders
  getReminders: (clientId) => apiClient.get(`/clients/${clientId}/reminders`),
  createReminder: (clientId, data) => apiClient.post(`/clients/${clientId}/reminders`, data),
};

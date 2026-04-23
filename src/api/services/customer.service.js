import { apiClient } from "../client";

export const customerService = {
  // Clients
  getAll: () => apiClient.get("/clients"),

  getById: (id) => apiClient.get(`/clients/${id}`),

  create: (data) => apiClient.post("/clients", data),

  update: (id, data) => apiClient.put(`/clients/${id}`, data),

  delete: (id) => apiClient.delete(`/clients/${id}`),
  getStatement: (id, params) => apiClient.get(`/clients/${id}/statement`, { params }),

  // Contacts
  getContacts: (clientId) => apiClient.get(`/clients/${clientId}/contacts`),

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
  updateGroup: (id, data) => apiClient.put(`/client-groups/${id}`, data),
  deleteGroup: (id) => apiClient.delete(`/client-groups/${id}`),
};

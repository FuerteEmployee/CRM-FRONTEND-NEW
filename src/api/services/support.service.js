import { apiClient } from "../client";

export const supportService = {
  // Tickets
  getTickets: () => apiClient.get("/tickets"),
  getTicketById: (id) => apiClient.get(`/tickets/${id}`),
  createTicket: (data) => apiClient.post("/tickets", data),

  // Knowledge Base
  getKBGroups: () => apiClient.get("/knowledge-base/groups"),

  getKBArticles: (groupId) => {
    const query = groupId ? `?group=${groupId}` : "";
    return apiClient.get(`/knowledge-base/articles${query}`);
  },

  // Departments
  getDepartments: () => apiClient.get("/departments"),
  createDepartment: (data) => apiClient.post("/departments", data),
  updateDepartment: (id, data) => apiClient.put(`/departments/${id}`, data),
  deleteDepartment: (id) => apiClient.delete(`/departments/${id}`),

  // Priorities
  getPriorities: () => apiClient.get("/priorities"),
  createPriority: (data) => apiClient.post("/priorities", data),
  updatePriority: (id, data) => apiClient.put(`/priorities/${id}`, data),
  deletePriority: (id) => apiClient.delete(`/priorities/${id}`),

  // Ticket Statuses
  getTicketStatuses: () => apiClient.get("/ticket-statuses"),
  createTicketStatus: (data) => apiClient.post("/ticket-statuses", data),
  updateTicketStatus: (id, data) =>
    apiClient.put(`/ticket-statuses/${id}`, data),
  deleteTicketStatus: (id) => apiClient.delete(`/ticket-statuses/${id}`),
};

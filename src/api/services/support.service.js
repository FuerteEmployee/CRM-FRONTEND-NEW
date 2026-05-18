import { apiClient } from "../client";

export const supportService = {
  // Tickets
  getTickets: (params) => apiClient.get("/tickets", { params }),
  getTicketById: (id) => apiClient.get(`/tickets/${id}`),
  createTicket: (data) => apiClient.post("/tickets", data),
  updateTicket: (id, data) => apiClient.put(`/tickets/${id}`, data),
  deleteTicket: (id) => apiClient.delete(`/tickets/${id}`),

  // Knowledge Base
  getKBGroups: () => apiClient.get("/kb/groups"),

  getKBArticles: (groupId) => {
    const query = groupId ? `?group=${groupId}` : "";
    return apiClient.get(`/kb/articles${query}`);
  },
  createKBGroup: (data) => apiClient.post("/kb/groups", data),
  createKBArticle: (data) => apiClient.post("/kb/articles", data),

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

  // Services
  getServices: () => apiClient.get("/services"),
  createService: (data) => apiClient.post("/services", data),
};

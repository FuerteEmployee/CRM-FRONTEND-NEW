import { apiClient } from "../client";

export const supportService = {
  // Tickets
  getTickets: (params) => apiClient.get("/tickets", { params }),
  getTicketById: (id) => apiClient.get(`/tickets/${id}`),
  createTicket: (data) => apiClient.post("/tickets", data),
  updateTicket: (id, data) => apiClient.put(`/tickets/${id}`, data),
  deleteTicket: (id) => apiClient.delete(`/tickets/${id}`),
  bulkDeleteTickets: (ids) => apiClient.post("/tickets/bulk-delete", { ids }),
  addTicketReply: (id, data) => apiClient.post(`/tickets/${id}/replies`, data),

  // Knowledge Base
  getKBGroups: () => apiClient.get("/kb/groups"),

  getKBArticles: (groupId, includeInactive) => {
    const params = new URLSearchParams();
    if (groupId) params.set("group", groupId);
    if (includeInactive) params.set("all", "true");
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get(`/kb/articles${query}`);
  },
  createKBGroup: (data) => apiClient.post("/kb/groups", data),
  updateKBGroup: (id, data) => apiClient.put(`/kb/groups/${id}`, data),
  deleteKBGroup: (id) => apiClient.delete(`/kb/groups/${id}`),

  createKBArticle: (data) => apiClient.post("/kb/articles", data),
  updateKBArticle: (id, data) => apiClient.put(`/kb/articles/${id}`, data),
  deleteKBArticle: (id) => apiClient.delete(`/kb/articles/${id}`),

  // Departments
  getDepartments: () => apiClient.get("/departments"),
  createDepartment: (data) => apiClient.post("/departments", data),
  bulkCreateDepartment: (data) => apiClient.post("/departments/bulk", data),
  updateDepartment: (id, data) => apiClient.put(`/departments/${id}`, data),
  deleteDepartment: (id) => apiClient.delete(`/departments/${id}`),

  // Priorities
  getPriorities: () => apiClient.get("/priorities"),
  createPriority: (data) => apiClient.post("/priorities", data),
  bulkCreatePriority: (data) => apiClient.post("/priorities/bulk", data),
  updatePriority: (id, data) => apiClient.put(`/priorities/${id}`, data),
  deletePriority: (id) => apiClient.delete(`/priorities/${id}`),

  // Ticket Statuses
  getTicketStatuses: () => apiClient.get("/ticket-statuses"),
  createTicketStatus: (data) => apiClient.post("/ticket-statuses", data),
  bulkCreateTicketStatus: (data) => apiClient.post("/ticket-statuses/bulk", data),
  updateTicketStatus: (id, data) =>
    apiClient.put(`/ticket-statuses/${id}`, data),
  deleteTicketStatus: (id) => apiClient.delete(`/ticket-statuses/${id}`),

  // Services
  getServices: () => apiClient.get("/services"),
  createService: (data) => apiClient.post("/services", data),

  // Predefined Replies
  getPredefinedReplies: () => apiClient.get("/predefined-replies"),
  createPredefinedReply: (data) => apiClient.post("/predefined-replies", data),
  bulkCreatePredefinedReply: (data) => apiClient.post("/predefined-replies/bulk", data),
  updatePredefinedReply: (id, data) => apiClient.put(`/predefined-replies/${id}`, data),
  deletePredefinedReply: (id) => apiClient.delete(`/predefined-replies/${id}`),
};


import { apiClient } from '../client';

export const utilityService = {
  // Announcements
  getAnnouncements: () => apiClient.get('/announcements'),
  
  createAnnouncement: (data) => apiClient.post('/announcements', data),

  // Internal Tasks (Todo)
  getTodos: () => apiClient.get('/todos'),
  
  createTodo: (data) => apiClient.post('/todos', data),
  
  updateTodo: (id, data) => apiClient.put(`/todos/${id}`, data),
  
  deleteTodo: (id) => apiClient.delete(`/todos/${id}`),

  // Settings
  getSettings: () => apiClient.get(`/settings?cb=${new Date().getTime()}`),
  
  updateSettings: (data) => apiClient.post('/settings', data),
  
  getActivityLogs: () => apiClient.get('/activity-logs'),
  
  getFinancialReport: (fromDate, toDate) => 
    apiClient.get(`/reports/financial?fromDate=${fromDate}&toDate=${toDate}`),
};


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
  
  deleteActivityLog: (id) => apiClient.delete(`/activity-logs/${id}`),
  
  getTicketPipeLogs: () => apiClient.get('/ticket-pipe-logs'),
  
  getFinancialReport: (fromDate, toDate) => 
    apiClient.get(`/reports/financial?fromDate=${fromDate}&toDate=${toDate}`),

  getSalesReport: (currency, period, fromDate, toDate) =>
    apiClient.get(`/reports/sales?currency=${currency || 'USD'}&period=${period || 'all_time'}&fromDate=${fromDate || ''}&toDate=${toDate || ''}`),

  getExpensesReport: (year, excludeBillable) =>
    apiClient.get(`/reports/expenses?year=${year || new Date().getFullYear()}&excludeBillable=${excludeBillable || false}`),

  getPurchaseReport: (period, fromDate, toDate) =>
    apiClient.get(`/reports/purchase?period=${period || 'all_time'}&fromDate=${fromDate || ''}&toDate=${toDate || ''}`),
};

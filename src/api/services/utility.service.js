
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
  
  getActivityLogs: (params) => apiClient.get('/activity-logs', { params }),
  
  deleteActivityLog: (id) => apiClient.delete(`/activity-logs/${id}`),
  
  getTicketPipeLogs: () => apiClient.get('/ticket-pipe-logs'),
  
  getFinancialReport: (fromDate, toDate) => 
    apiClient.get(`/reports/financial?fromDate=${fromDate}&toDate=${toDate}`),

  getSalesReport: (currency, period, fromDate, toDate) =>
    apiClient.get(`/reports/sales?currency=${encodeURIComponent(currency || '')}&period=${period || 'all_time'}&fromDate=${fromDate || ''}&toDate=${toDate || ''}`),

  getExpensesReport: (year, excludeBillable) =>
    apiClient.get(`/reports/expenses?year=${year || new Date().getFullYear()}&excludeBillable=${excludeBillable || false}`),

  // period "year" (default) = month by month for `year`; any other period
  // (today, date, this_week, custom …) = by day / month for that range.
  getExpensesVsIncome: (year, period, fromDate, toDate) =>
    apiClient.get(`/reports/expenses-vs-income?year=${year || new Date().getFullYear()}&period=${period || 'year'}&fromDate=${fromDate || ''}&toDate=${toDate || ''}`),

  getPurchaseReport: (period, fromDate, toDate) =>
    apiClient.get(`/reports/purchase?period=${period || 'all_time'}&fromDate=${fromDate || ''}&toDate=${toDate || ''}`),

  getProjectWorkReport: (period, fromDate, toDate, status) =>
    apiClient.get(`/reports/project-work?period=${period || 'this_month'}&fromDate=${fromDate || ''}&toDate=${toDate || ''}&status=${status || 'all'}`),

  getStaffWorkReport: (period, fromDate, toDate, staff) =>
    apiClient.get(`/reports/staff-work?period=${period || 'today'}&fromDate=${fromDate || ''}&toDate=${toDate || ''}&staff=${staff || ''}`),

  getTimesheetsReport: () => apiClient.get('/reports/timesheets'),

  getCustomerWorkReport: (period, fromDate, toDate) =>
    apiClient.get(`/reports/customer-work?period=${period || 'this_month'}&fromDate=${fromDate || ''}&toDate=${toDate || ''}`),

  getWorkOverview: (period, fromDate, toDate) =>
    apiClient.get(`/reports/work-overview?period=${period || 'this_month'}&fromDate=${fromDate || ''}&toDate=${toDate || ''}`),

  // One staff member's report: their tasks project-wise with descriptions and hours.
  getStaffReport: (staffId, period, fromDate, toDate) =>
    apiClient.get(`/reports/staff-report/${staffId}?period=${period || 'this_month'}&fromDate=${fromDate || ''}&toDate=${toDate || ''}`),

  // Logout check: tasks due today / overdue that block logging out.
  // attempt=true when the person pressed Logout (admins are told if blocked).
  logoutCheck: (attempt) => apiClient.get(`/work/logout-check${attempt ? '?attempt=1' : ''}`),
  completeMyTask: (id) => apiClient.post(`/work/tasks/${id}/complete`),
};

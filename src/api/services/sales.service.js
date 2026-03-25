
import { apiClient } from '../client';

export const salesService = {
  // Invoices
  getInvoices: () => apiClient.get('/invoices'),
  
  getInvoiceById: (id) => apiClient.get(`/invoices/${id}`),
  
  createInvoice: (data) => apiClient.post('/invoices', data),
  
  // Payments
  getPayments: () => apiClient.get('/payments'),
  
  createPayment: (data) => apiClient.post('/payments', data),

  // Expenses
  getExpenses: () => apiClient.get('/expenses'),
  
  createExpense: (data) => apiClient.post('/expenses', data),

  // Subscriptions
  getSubscriptions: () => apiClient.get('/subscriptions'),
  
  createSubscription: (data) => apiClient.post('/subscriptions', data),

  // Estimates & Proposals
  getEstimates: () => apiClient.get('/estimates'),
  
  getProposals: () => apiClient.get('/proposals'),

  // Estimate Statuses
  getEstimateStatuses: () => apiClient.get('/estimate-statuses'),
  createEstimateStatus: (data) => apiClient.post('/estimate-statuses', data),
  updateEstimateStatus: (id, data) => apiClient.put(`/estimate-statuses/${id}`, data),
  deleteEstimateStatus: (id) => apiClient.delete(`/estimate-statuses/${id}`),

  // Estimate Request Forms
  getEstimateRequestForms: () => apiClient.get("/estimate-request-forms"),
  getEstimateRequestFormById: (id) => apiClient.get(`/estimate-request-forms/${id}`),
  createEstimateRequestForm: (data) => apiClient.post("/estimate-request-forms", data),
  updateEstimateRequestForm: (id, data) => apiClient.put(`/estimate-request-forms/${id}`, data),
  deleteEstimateRequestForm: (id) => apiClient.delete(`/estimate-request-forms/${id}`),
  getPublicForm: (id) => apiClient.get(`/estimate-request-forms/public/${id}`),
  submitPublicForm: (id, data) => apiClient.post(`/estimate-request-forms/public/${id}/submit`, data),
};

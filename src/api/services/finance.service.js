import { apiClient } from '../client';

export const financeService = {
  // Tax Rates
  getTaxes: () => apiClient.get('/taxes'),
  createTax: (data) => apiClient.post('/taxes', data),
  bulkCreateTax: (data) => apiClient.post('/taxes/bulk', data),
  updateTax: (id, data) => apiClient.patch(`/taxes/${id}`, data),
  deleteTax: (id) => apiClient.delete(`/taxes/${id}`),

  // Currencies
  getCurrencies: () => apiClient.get('/currencies'),
  createCurrency: (data) => apiClient.post('/currencies', data),
  bulkCreateCurrency: (data) => apiClient.post('/currencies/bulk', data),
  updateCurrency: (id, data) => apiClient.patch(`/currencies/${id}`, data),
  deleteCurrency: (id) => apiClient.delete(`/currencies/${id}`),

  // Payment Modes
  getPaymentModes: () => apiClient.get('/payment-modes'),
  createPaymentMode: (data) => apiClient.post('/payment-modes', data),
  bulkCreatePaymentMode: (data) => apiClient.post('/payment-modes/bulk', data),
  updatePaymentMode: (id, data) => apiClient.patch(`/payment-modes/${id}`, data),
  deletePaymentMode: (id) => apiClient.delete(`/payment-modes/${id}`),

  // Expense Categories
  getExpenseCategories: () => apiClient.get('/expense-categories'),
  createExpenseCategory: (data) => apiClient.post('/expense-categories', data),
  bulkCreateExpenseCategory: (data) => apiClient.post('/expense-categories/bulk', data),
  updateExpenseCategory: (id, data) => apiClient.patch(`/expense-categories/${id}`, data),
  deleteExpenseCategory: (id) => apiClient.delete(`/expense-categories/${id}`),

  // Contract Types
  getContractTypes: () => apiClient.get('/contract-types'),
  createContractType: (data) => apiClient.post('/contract-types', data),
  updateContractType: (id, data) => apiClient.patch(`/contract-types/${id}`, data),
  deleteContractType: (id) => apiClient.delete(`/contract-types/${id}`),

  // Bank Details
  getBankDetails: () => apiClient.get('/bank-details'),
  createBankDetail: (data) => apiClient.post('/bank-details', data),
  updateBankDetail: (id, data) => apiClient.patch(`/bank-details/${id}`, data),
  deleteBankDetail: (id) => apiClient.delete(`/bank-details/${id}`),
};

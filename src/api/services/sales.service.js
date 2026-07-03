import { apiClient } from "../client";

// NOTE: All estimate-related methods have been moved to estimate.service.js
// This file retains only: Invoices, Payments, Expenses, Subscriptions, Proposals.

export const salesService = {
  // ─────────────────────────────────────────────
  // Invoices
  // ─────────────────────────────────────────────
  getInvoices: (params) => apiClient.get("/invoices", { params }),
  getProposals: (params) => apiClient.get("/proposals", { params }),
  getProposalById: (id) => apiClient.get(`/proposals/${id}`),
  getInvoiceById: (id) => apiClient.get(`/invoices/${id}`),
  createInvoice: (data) => apiClient.post("/invoices", data),
  updateInvoice: (id, data) => apiClient.put(`/invoices/${id}`, data),
  deleteInvoice: (id) => apiClient.delete(`/invoices/${id}`),
  createProposal: (data) => apiClient.post("/proposals", data),
  updateProposal: (id, data) => apiClient.put(`/proposals/${id}`, data),
  deleteProposal: (id) => apiClient.delete(`/proposals/${id}`),

  // ─────────────────────────────────────────────
  // Payments
  // ─────────────────────────────────────────────
  getPayments: () => apiClient.get("/payments"),
  getPaymentsByCustomer: (clientId) => apiClient.get(`/payments/customer/${clientId}`),
  createPayment: (data) => apiClient.post("/payments", data),

  // ─────────────────────────────────────────────
  // Expenses
  // ─────────────────────────────────────────────
  getExpenses: (params) => apiClient.get("/expenses", { params }),
  createExpense: (data) => apiClient.post("/expenses", data),
  updateExpense: (id, data) => apiClient.put(`/expenses/${id}`, data),
  getExpenseById: (id) => apiClient.get(`/expenses/${id}`),
  deleteExpense: (id) => apiClient.delete(`/expenses/${id}`),

  // ─────────────────────────────────────────────
  // Subscriptions
  // ─────────────────────────────────────────────
  getSubscriptions: () => apiClient.get("/subscriptions"),
  createSubscription: (data) => apiClient.post("/subscriptions", data),
  updateSubscription: (id, data) => apiClient.put(`/subscriptions/${id}`, data),

  // ─────────────────────────────────────────────
  // Proposals
  // ─────────────────────────────────────────────


  // ─────────────────────────────────────────────
  // Credit Notes
  // ─────────────────────────────────────────────
  getCreditNotes: (params) => apiClient.get("/credit-notes", { params }),
  getCreditNotesByCustomer: (clientId) => apiClient.get(`/credit-notes/customer/${clientId}`),

  // ─────────────────────────────────────────────
  // Imports
  // ─────────────────────────────────────────────
  importInvoices: (data) => apiClient.post("/invoices/import", data),
  importProposals: (data) => apiClient.post("/proposals/import", data),
  importPayments: (data) => apiClient.post("/payments/import", data),
};

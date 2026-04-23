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
  createProposal: (data) => apiClient.post("/proposals", data),
  updateProposal: (id, data) => apiClient.put(`/proposals/${id}`, data),

  // ─────────────────────────────────────────────
  // Payments
  // ─────────────────────────────────────────────
  getPayments: () => apiClient.get("/payments"),
  getPaymentsByCustomer: (clientId) => apiClient.get(`/payments/customer/${clientId}`),
  createPayment: (data) => apiClient.post("/payments", data),

  // ─────────────────────────────────────────────
  // Expenses
  // ─────────────────────────────────────────────
  getExpenses: () => apiClient.get("/expenses"),
  createExpense: (data) => apiClient.post("/expenses", data),

  // ─────────────────────────────────────────────
  // Subscriptions
  // ─────────────────────────────────────────────
  getSubscriptions: () => apiClient.get("/subscriptions"),
  createSubscription: (data) => apiClient.post("/subscriptions", data),

  // ─────────────────────────────────────────────
  // Proposals
  // ─────────────────────────────────────────────
  getProposals: () => apiClient.get("/proposals"),
};

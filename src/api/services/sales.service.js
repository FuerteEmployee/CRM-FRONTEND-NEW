import { apiClient } from "../client";

// NOTE: All estimate-related methods have been moved to estimate.service.js
// This file retains only: Invoices, Payments, Expenses, Subscriptions, Proposals.

export const salesService = {
  // ─────────────────────────────────────────────
  // Invoices
  // ─────────────────────────────────────────────
  getInvoices: () => apiClient.get("/invoices"),
  getInvoiceById: (id) => apiClient.get(`/invoices/${id}`),
  createInvoice: (data) => apiClient.post("/invoices", data),

  // ─────────────────────────────────────────────
  // Payments
  // ─────────────────────────────────────────────
  getPayments: () => apiClient.get("/payments"),
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

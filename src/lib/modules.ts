// ─── Canonical list of app modules shown in the main sidebar ───────────────
// Used by Setup > Custom Fields' "Field Belongs To" selector so a custom
// field can be attached to any module the main sidebar exposes, not just a
// hardcoded handful. Values must match `CustomField.fieldto`'s Mongoose enum
// (Backend/src/models/CustomField.js) exactly — extend both together.

export type ModuleOption = { value: string; label: string };

export const SIDEBAR_MODULES: ModuleOption[] = [
  { value: "leads", label: "Leads" },
  { value: "customers", label: "Customers" },
  { value: "contacts", label: "Contacts" },
  { value: "staff", label: "Staff" },
  { value: "projects", label: "Projects" },
  { value: "tasks", label: "Tasks" },
  { value: "tickets", label: "Support" },
  { value: "invoice", label: "Invoices" },
  { value: "payments", label: "Payments" },
  { value: "estimate", label: "Estimates" },
  { value: "proposal", label: "Proposals" },
  { value: "credit_note", label: "Credit Notes" },
  { value: "contracts", label: "Contracts" },
  { value: "expenses", label: "Expenses" },
  { value: "items", label: "Items" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "meetings", label: "Meetings" },
  { value: "goals", label: "Goals" },
  { value: "announcements", label: "Announcements" },
  { value: "knowledge_base", label: "Knowledge Base" },
  { value: "reports", label: "Reports" },
  { value: "company", label: "Company" },
];

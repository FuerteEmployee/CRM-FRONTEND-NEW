// Which SaaS plan module (SaasPlan.module_access key) a CRM page belongs to.
// Shared by the sidebar (hide the link) and the page guard ("Not included in
// your plan"), and mirrors the backend's src/middleware/planModules.js, which
// blocks the matching APIs. Pages not listed (dashboard, customers, profile,
// staff setup, settings...) are core and always available.

// First path segment after /admin or /staff -> module key.
const SECTION_MODULES: Record<string, string> = {
  invoices: "finance",
  payments: "finance",
  "credit-notes": "finance",
  items: "finance",
  tasks: "tasks",
  projects: "projects",
  support: "support",
  leads: "leads",
  "calling-agent": "leads",
  contracts: "contracts",
  chat: "chat",
  meetings: "meetings",
  subscriptions: "subscriptions",
  expenses: "expenses",
  proposals: "proposals",
  estimates: "estimates",
  "estimate-request": "estimate_request",
  "knowledge-base": "knowledge_base",
  "time-tracking": "time_tracking",
  goals: "goals",
  announcements: "announcements",
  calendar: "calendar",
  bookmarks: "bookmarks",
  "website-forms": "website_forms",
  whatsapp: "whatsapp",
  reports: "reports",
  quotations: "sales",
  purchases: "sales",
  vendors: "sales",
  hrms: "hrms",
  utilities: "utility",
  media: "utility",
  "bulk-export": "utility",
  activity: "utility",
  "ticket-pipe-log": "utility",
};

// Setup pages that only make sense with a module: /admin/setup/<path>.
const SETUP_MODULES: [string, string][] = [
  ["support/", "support"],
  ["leads/", "leads"],
  ["finance/expense-categories", "expenses"],
  ["finance/currencies", ""], // core — used by every money document
  ["finance/", "finance"],
  ["contracts/", "contracts"],
  ["estimate-request/", "estimate_request"],
  ["quotation-types", "sales"],
];

/** Module key for a CRM path, or null when the page is always available. */
export function moduleForPath(pathname: string): string | null {
  const m = /^\/(admin|staff)\/([^/?#]+)(?:\/([^?#]*))?/.exec(pathname || "");
  if (!m) return null;
  const [, , section, rest = ""] = m;
  if (section === "setup") {
    const hit = SETUP_MODULES.find(([prefix]) => rest.startsWith(prefix));
    return hit && hit[1] ? hit[1] : null;
  }
  return SECTION_MODULES[section] || null;
}

/** Labels for the "not included in your plan" page. */
export const MODULE_LABELS: Record<string, string> = {
  finance: "Finance", leads: "Leads", support: "Support", contracts: "Contracts",
  projects: "Projects", tasks: "Tasks", chat: "Chat", meetings: "Meetings",
  subscriptions: "Subscriptions", expenses: "Expenses", estimates: "Estimates",
  proposals: "Proposals", estimate_request: "Estimate Request", knowledge_base: "Knowledge Base",
  reports: "Reports", time_tracking: "Time Tracking", goals: "Goals", announcements: "Announcements",
  calendar: "Calendar", bookmarks: "Bookmarks", hrms: "HRMS", sales: "Sales",
  utility: "Utilities", website_forms: "Website Forms", whatsapp: "WhatsApp",
};

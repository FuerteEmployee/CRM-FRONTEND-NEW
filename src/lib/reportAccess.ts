// Which permission each report needs, so a report is shown (sidebar link and
// page) only to people who may see the data it is built from — the same rule
// the Sales report uses. Every report also needs Reports > View (the backend
// /reports routes check it). Keep in sync with Backend report_controller.js /
// work_report_controller.js.

type Rule = { any?: string[]; all?: string[]; label: string };

export const REPORT_RULES: Record<string, Rule> = {
  sales: { any: ["Invoices", "Payments", "Proposals", "Estimates"], label: "Invoices, Payments, Proposals or Estimates" },
  expenses: { all: ["Expenses"], label: "Expenses" },
  "expenses-vs-income": { all: ["Payments", "Expenses"], label: "both Payments and Expenses" },
  leads: { all: ["Leads"], label: "Leads" },
  timesheets: { any: ["Tasks", "Projects"], label: "Tasks or Projects" },
  kb: { all: ["Knowledge Base"], label: "Knowledge Base" },
  "kb-articles": { all: ["Knowledge Base"], label: "Knowledge Base" },
  purchase: { all: ["Purchases"], label: "Purchases" },
  "project-work": { all: ["Projects"], label: "Projects" },
  "staff-work": { any: ["Tasks", "Projects"], label: "Tasks or Projects" },
  "customer-work": { any: ["Projects", "Customers"], label: "Projects or Customers" },
};

/** "/admin/reports/leads" → "leads"; null for anything that is not a sub-report. */
export const reportSlugOf = (url?: string): string | null => {
  const m = String(url || "").match(/\/reports\/([^/?#]+)/);
  return m ? m[1] : null;
};

type CanView = (feature: string) => boolean;

/** May this user open the report? (Reports > View plus the report's own modules.) */
export const reportAllowed = (slug: string | null, canView: CanView): boolean => {
  if (!canView("Reports")) return false;
  if (!slug) return true;
  const rule = REPORT_RULES[slug];
  if (!rule) return true;
  if (rule.all && !rule.all.every((m) => canView(m))) return false;
  if (rule.any && !rule.any.some((m) => canView(m))) return false;
  return true;
};

/** "global" | "own" | null for one module, from the user's permission map. */
export const viewLevel = (permissions: Record<string, any>, isAdminOrSuper: boolean, module: string): "global" | "own" | null => {
  if (isAdminOrSuper) return "global";
  const p = permissions?.[module];
  if (p?.["View(Global)"] === true) return "global";
  if (p?.["View (Own)"] === true) return "own";
  return null;
};

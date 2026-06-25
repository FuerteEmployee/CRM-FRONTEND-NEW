// ─── Shared command routing for the Fuerte AI assistant & global search bar ──
// Both the floating voice assistant (FuerteAIAssistant) and the top-bar search
// box resolve a spoken/typed phrase to a route using the maps below.

export type CommandEntry = {
  keywords: string[];
  route: string;
  label: string;
  section: string | null; // collapsible sidebar group: "Sales" | "Utilities" | "Reports" | null
};

// ─── Navigation map: keyword phrases → route paths ───────────────────────────
export const COMMAND_MAP: CommandEntry[] = [
  { keywords: ["dashboard", "home"],                route: "/admin/dashboard",      label: "Dashboard",     section: null },
  { keywords: ["tasks", "task"],                     route: "/admin/tasks",          label: "Tasks",         section: null },
  { keywords: ["leads", "lead"],                     route: "/admin/leads",          label: "Leads",         section: "Sales" },
  { keywords: ["customers", "customer", "clients"],  route: "/admin/customers",      label: "Customers",     section: null },
  { keywords: ["contacts", "contact"],               route: "/admin/contacts",       label: "Contacts",      section: null },
  { keywords: ["items", "products"],                 route: "/admin/items",          label: "Items",         section: null },
  { keywords: ["activity", "activity logs"],         route: "/admin/activity",       label: "Activity Logs", section: null },
  { keywords: ["projects", "project"],               route: "/admin/projects",       label: "Projects",      section: null },
  { keywords: ["invoices", "invoice"],               route: "/admin/invoices",       label: "Invoices",      section: null },
  { keywords: ["expenses", "expense"],               route: "/admin/expenses",       label: "Expenses",      section: null },
  { keywords: ["estimates", "estimate"],             route: "/admin/estimates",      label: "Estimates",     section: "Sales" },
  { keywords: ["proposals", "proposal"],             route: "/admin/proposals",      label: "Proposals",     section: "Sales" },
  { keywords: ["credit notes", "credit note"],       route: "/admin/credit-notes",   label: "Credit Notes",  section: "Sales" },
  { keywords: ["tickets", "support", "ticket"],      route: "/admin/support",        label: "Support",       section: null },
  { keywords: ["chat", "messages"],                  route: "/admin/chat",           label: "Chat",          section: "Utilities" },
  { keywords: ["calendar", "schedule"],              route: "/admin/calendar",       label: "Calendar",      section: "Utilities" },
  { keywords: ["meetings", "meeting"],               route: "/admin/meetings",       label: "Meetings",      section: "Utilities" },
  { keywords: ["reports", "analytics"],              route: "/admin/reports",        label: "Reports",       section: "Reports" },
  { keywords: ["attendance", "time tracking"],       route: "/admin/time-tracking",  label: "Attendance",    section: "Utilities" },
  { keywords: ["staff", "team"],                     route: "/admin/setup/staff",    label: "Staff",         section: null },
  { keywords: ["settings", "setup"],                 route: "/admin/setup",          label: "Settings",      section: null },
  { keywords: ["contracts", "contract"],             route: "/admin/contracts",      label: "Contracts",     section: null },
  { keywords: ["payments", "payment"],               route: "/admin/payments",       label: "Payments",      section: null },
  { keywords: ["subscriptions", "subscription"],     route: "/admin/subscriptions",  label: "Subscriptions", section: "Utilities" },
  { keywords: ["goals", "goal"],                     route: "/admin/goals",          label: "Goals",         section: "Utilities" },
  { keywords: ["announcements", "announcement"],     route: "/admin/announcements",  label: "Announcements", section: "Utilities" },
  { keywords: ["knowledge base", "faq"],             route: "/admin/knowledge-base", label: "Knowledge Base",section: "Utilities" },
  { keywords: ["media", "files"],                    route: "/admin/media",          label: "Media",         section: "Utilities" },
];

// ─── Create map: "create/new <thing>" → opens that module's create form/modal ──
// Modal-based modules use "<route>?new=1" — the target page reads the `new` param
// (via useOpenCreateModal) and pops its create modal on mount.
// Route-based modules navigate straight to their dedicated create page.
export const CREATE_MAP: CommandEntry[] = [
  // Modal-based create
  { keywords: ["task"],                              route: "/admin/tasks?new=1",                            label: "New Task",         section: null },
  { keywords: ["customer", "client"],                route: "/admin/customers?new=1",                        label: "New Customer",     section: null },
  { keywords: ["lead"],                              route: "/admin/leads?new=1",                            label: "New Lead",         section: "Sales" },
  { keywords: ["item", "product"],                   route: "/admin/items?new=1",                            label: "New Item",         section: null },
  { keywords: ["article", "knowledge base"],         route: "/admin/knowledge-base?new=1",                   label: "New Article",      section: "Utilities" },
  { keywords: ["meeting"],                           route: "/admin/meetings?new=1",                         label: "New Meeting",      section: "Utilities" },
  { keywords: ["contract"],                          route: "/admin/contracts?new=1",                        label: "New Contract",     section: null },
  // Route-based create
  { keywords: ["project"],                           route: "/admin/projects/create",                        label: "New Project",      section: null },
  { keywords: ["invoice"],                           route: "/admin/invoices/create",                        label: "New Invoice",      section: null },
  { keywords: ["estimate"],                          route: "/admin/estimates/create",                       label: "New Estimate",     section: "Sales" },
  { keywords: ["proposal"],                          route: "/admin/proposals/create",                       label: "New Proposal",     section: "Sales" },
  { keywords: ["credit note"],                       route: "/admin/credit-notes/create",                    label: "New Credit Note",  section: "Sales" },
  { keywords: ["subscription"],                      route: "/admin/subscriptions/create",                   label: "New Subscription", section: "Utilities" },
  { keywords: ["expense"],                           route: "/admin/expenses/create",                        label: "New Expense",      section: null },
  { keywords: ["ticket", "support"],                 route: "/admin/support/create",                         label: "New Ticket",       section: null },
  { keywords: ["goal"],                              route: "/admin/goals/new",                              label: "New Goal",         section: "Utilities" },
  { keywords: ["announcement"],                      route: "/admin/announcements/new",                      label: "New Announcement", section: "Utilities" },
  { keywords: ["staff", "team member", "employee"],  route: "/admin/setup/staff/new",                        label: "New Staff",        section: null },
  { keywords: ["form builder", "form field", "form"],route: "/admin/setup/estimate-request/form-fields/new", label: "New Form Builder", section: null },
];

// Words that signal the user wants to CREATE something rather than just navigate.
export const CREATE_INTENT_RE = /\b(create|creating|new|add|make)\b/i;

export type CommandMatch = { route: string; label: string; section: string | null };

// ─── Strip action prefixes and match against a keyword map ───────────────────
const matchIn = (cmd: string, map: CommandEntry[]): CommandMatch | null => {
  // Remove punctuation like commas and periods
  const cleanCmd = cmd.toLowerCase().replace(/[.,!?]/g, "").trim();

  // Remove leading action words so "open task" / "create task" both reach "task"
  const stripped = cleanCmd
    .replace(/^(open up|open|go to|navigate to|take me to|show me|show|visit|launch|load|search|find|create|creating|new|add|make)\s+/i, "")
    .trim();

  // Collapse-spaces variants so "creditnotes" can match "credit notes"
  const cleanNoSpace = cleanCmd.replace(/\s+/g, "");

  // Most specific match wins: the longest keyword present in the utterance,
  // regardless of its order in the map.
  let best: (CommandMatch & { len: number }) | null = null;

  for (const { keywords, route, label, section } of map) {
    for (const k of keywords) {
      const kNoSpace = k.replace(/\s+/g, "");
      const hit =
        cleanCmd.includes(k) ||
        stripped.includes(k) ||
        cleanNoSpace.includes(kNoSpace);
      if (hit && (!best || k.length > best.len)) {
        best = { route, label, section, len: k.length };
      }
    }
  }

  return best ? { route: best.route, label: best.label, section: best.section } : null;
};

// ─── Resolve an utterance: create intent first, then plain navigation ────────
export const resolveCommand = (cmd: string): CommandMatch | null => {
  if (!cmd || !cmd.trim()) return null;
  if (CREATE_INTENT_RE.test(cmd)) {
    const created = matchIn(cmd, CREATE_MAP);
    if (created) return created;
  }
  return matchIn(cmd, COMMAND_MAP);
};

// Rewrite the "/admin" prefix to the active base path (admin vs staff).
export const applyBasePath = (route: string, isStaff: boolean): string =>
  route.replace("/admin", isStaff ? "/staff" : "/admin");

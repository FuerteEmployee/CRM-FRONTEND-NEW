export type TourTarget = string | (() => Element | null);

export interface TourStep {
  target: TourTarget;
  title: string;
  description: string;
  side?: "top" | "bottom" | "left" | "right";
}

/** Finds the first visible <button> whose text matches the pattern. */
export const findButtonByText = (re: RegExp) => (): Element | null =>
  Array.from(document.querySelectorAll("button")).find(
    (b) => re.test((b.textContent || "").trim()) && b.getClientRects().length > 0,
  ) || null;


const SEARCH = 'input[placeholder*="earch" i]';
const addBtn = findButtonByText(/^\s*(\+\s*)?(add|new|create)\b/i);
const exportBtn = findButtonByText(/export/i);
const importBtn = findButtonByText(/import/i);

const heading = (title: string, description: string): TourStep => ({
  target: "h1, h2", title, description,
});
const search = (what: string): TourStep => ({
  target: SEARCH, title: "Search", description: `Type here to quickly find ${what}.`,
});
const table = (title: string, description: string): TourStep => ({
  target: "table", title, description, side: "top",
});

export const customersTour: TourStep[] = [
  heading("Customers", "All your customers live here, with quick counts by status."),
  { target: "main .grid", title: "Status Cards", description: "Click a card to filter the list by Active, Inactive and more." },
  search("a customer by name, company, phone or email"),
  { target: addBtn, title: "Add Customer", description: "Create a new customer record." },
  table("Customer List", "Open a customer to see their invoices, projects, contacts and notes."),
];

export const leadsTour: TourStep[] = [
  heading("Leads", "Your sales pipeline. Track every enquiry from first contact to conversion."),
  search("a lead by name, company, phone or email"),
  { target: 'button[aria-label*="view" i]', title: "List / Kanban View", description: "Switch between a table and a drag-and-drop Kanban board." },
  { target: addBtn, title: "Add Lead", description: "Create a new lead." },
  table("Lead List", "Change status, assign staff, set reminders and convert leads to customers."),
];

const salesTour = (name: string, plural: string): TourStep[] => [
  heading(plural, `Create, send and track all your ${plural.toLowerCase()}.`),
  { target: addBtn, title: `New ${name}`, description: `Create a new ${name.toLowerCase()} for a customer.` },
  { target: importBtn, title: "Import", description: `Bulk-import ${plural.toLowerCase()} from a file.` },
  { target: exportBtn, title: "Export", description: "Download the list as a file." },
  search(`a ${name.toLowerCase()} by number or customer`),
  table(`${name} List`, "Use the row actions to view, edit, email, download or record payments."),
];

export const invoicesTour = salesTour("Invoice", "Invoices");
export const estimatesTour = salesTour("Estimate", "Estimates");
export const proposalsTour = salesTour("Proposal", "Proposals");

export const quotationsTour: TourStep[] = [
  heading("Quotations", "Create and manage quotations."),
  { target: "main aside", title: "Quotation Menu", description: "Switch between Dashboard, Create, List and Approvals." },
  search("a quotation"),
  table("Quotation List", "View, edit, send or approve quotations from here."),
];

export const tasksTour: TourStep[] = [
  heading("Tasks", "Plan and track work for you and your team."),
  { target: 'button[aria-label*="view" i]', title: "List / Kanban View", description: "Switch between a table and a Kanban board." },
  search("a task by name"),
  { target: addBtn, title: "New Task", description: "Create a task and assign it to staff." },
  table("Task List", "Update status, priority and due dates, or open a task for details."),
];

export const hrmsDashboardTour: TourStep[] = [
  heading("HRMS Owner Dashboard", "Live sales, profit and staff activity at a glance."),
  { target: "main .grid, .grid", title: "Key Numbers", description: "Today's sales, net profit and other core business KPIs." },
];

/** Order of modules visited by the full tour, after the Dashboard. */
export const tourSequence = (prefix: string): { path: string; steps: TourStep[] }[] => [
  { path: `${prefix}/customers`, steps: customersTour },
  { path: `${prefix}/leads`, steps: leadsTour },
  { path: `${prefix}/invoices`, steps: invoicesTour },
  { path: `${prefix}/estimates`, steps: estimatesTour },
  { path: `${prefix}/proposals`, steps: proposalsTour },
  { path: `${prefix}/quotations`, steps: quotationsTour },
  { path: `${prefix}/tasks`, steps: tasksTour },
  { path: `${prefix}/hrms`, steps: hrmsDashboardTour },
];

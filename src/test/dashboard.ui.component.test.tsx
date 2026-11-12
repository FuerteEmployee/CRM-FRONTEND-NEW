// DASHBOARD — Unit (widget maths) + UI component tests for pages/Dashboard.tsx.
// Every service is mocked with data in the exact shape the backend returns, then the
// NUMBERS on screen are checked against the business rules in test-prompts/01-dashboard.md.
// No network, no live server. A failing test = a bug (see the report).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------- mocks ----------
vi.mock("@/hooks/useMinimumLoading", () => ({ useMinimumLoading: () => false }));
vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="layout">{children}</div>,
}));
vi.mock("driver.js", () => ({ driver: () => ({ drive: vi.fn() }) }));
vi.mock("@/context/CurrencyContext", () => ({
  useCurrency: () => ({ symbol: "₹", formatAmount: (n: number) => `₹${Number(n || 0).toFixed(2)}` }),
}));
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (orig) => ({ ...(await orig<typeof import("react-router-dom")>()), useNavigate: () => mockNavigate }));

let ctx: any;
vi.mock("@/context/PermissionContext", () => ({ usePermissionContext: () => ctx }));

const svc = vi.hoisted(() => ({
  getInvoices: vi.fn(), getProposals: vi.fn(), getExpenses: vi.fn(), getEstimates: vi.fn(),
  getTasks: vi.fn(), getProjects: vi.fn(), getTickets: vi.fn(), getAnnouncements: vi.fn(),
  getTodos: vi.fn(), createTodo: vi.fn(), updateTodo: vi.fn(), getActivityLogs: vi.fn(),
  getLeads: vi.fn(), getQuotations: vi.fn(), getReminders: vi.fn(),
}));
vi.mock("@/api/services/sales.service", () => ({ salesService: { getInvoices: svc.getInvoices, getProposals: svc.getProposals, getExpenses: svc.getExpenses } }));
vi.mock("@/api/services/estimate.service", () => ({ estimateService: { getEstimates: svc.getEstimates } }));
vi.mock("@/api/services/task.service", () => ({ taskService: { getAll: svc.getTasks } }));
vi.mock("@/api/services/project.service", () => ({ projectService: { getAll: svc.getProjects } }));
vi.mock("@/api/services/support.service", () => ({ supportService: { getTickets: svc.getTickets } }));
vi.mock("@/api/services/utility.service", () => ({ utilityService: {
  getAnnouncements: svc.getAnnouncements, getTodos: svc.getTodos, createTodo: svc.createTodo,
  updateTodo: svc.updateTodo, getActivityLogs: svc.getActivityLogs,
} }));
vi.mock("@/api/services/lead.service", () => ({ leadService: { getAll: svc.getLeads } }));
vi.mock("@/api/services/quotation.service", () => ({ quotationService: { getQuotations: svc.getQuotations } }));
vi.mock("@/api/services/reminder.service", () => ({ reminderService: { getAll: svc.getReminders } }));

import Dashboard from "../pages/Dashboard";

// ---------- fixtures (backend shapes) ----------
const day = (n: number) => new Date(Date.UTC(2026, 9, n)).toISOString();
const inv = (status: string, total: number, i: number) => ({ _id: `inv${i}`, number: `INV-${i}`, status, total, currency: "INR", date: day(i + 1) });
const INVOICES = [
  inv("unpaid", 1000, 1), inv("unpaid", 1000, 2), inv("sent", 500, 3), inv("sent_later", 500, 4),
  inv("partially_paid", 1000, 5), inv("overdue", 2000, 6), inv("paid", 3000, 7), inv("paid", 3000, 8),
  inv("recorded", 700, 9), inv("draft", 100, 10),
];
const LEADS = [
  { _id: "l1", name: "L1", converted: true, status: { name: "Hot Lead" } },
  { _id: "l2", name: "L2", converted: true, status: { name: "Hot Lead" } },
  { _id: "l3", name: "L3", converted: false, status: { name: "Customer" } },
  { _id: "l4", name: "L4", converted: false, status: { name: "New" } },
  { _id: "l5", name: "L5", converted: false, status: { name: "New" } },
];
const task = (i: number, status: number, created: string) => ({ _id: `t${i}`, name: `Task ${i}`, status, priority: 2, startdate: created, createdAt: created, assignees: ["user-1"] });
// API order = oldest first (what GET /api/tasks returns today).
const TASKS = [
  task(1, 1, day(1)), task(2, 2, day(2)), task(3, 3, day(3)), task(4, 4, day(4)),
  task(5, 1, day(5)), task(6, 1, day(6)), task(7, 1, day(7)), task(8, 5, day(8)),
];
const TODOS = [
  { _id: "td1", description: "Pay electricity bill", finished: false, staff: "user-1" },
  { _id: "td2", description: "Renew domain", finished: true, staff: "user-1" },
];
const LOGS = [{ _id: "log1", description: "Created invoice INV-1", staffid: { _id: "user-2", firstname: "Rajesh", lastname: "Patel" }, createdAt: new Date().toISOString() }];
const TICKETS = [
  { _id: "tk1", subject: "Old ticket", status: "Open", createdAt: day(1) },
  { _id: "tk2", subject: "Ticket 2", status: "Open", createdAt: day(2) },
  { _id: "tk3", subject: "Ticket 3", status: "Open", createdAt: day(3) },
  { _id: "tk4", subject: "Ticket 4", status: "Open", createdAt: day(4) },
  { _id: "tk5", subject: "Ticket 5", status: "Open", createdAt: day(5) },
  { _id: "tk6", subject: "Newest ticket", status: "Open", createdAt: day(6) },
];

const ADMIN = { _id: "user-1", firstname: "Asha", lastname: "Admin", admin: true, tenant: { status: "active" } };

function setCtx({ admin = true, perms = {} as Record<string, any>, off = [] as string[], user = ADMIN } = {}) {
  ctx = {
    user,
    isAdmin: admin,
    isStaff: !admin,
    permissions: perms,
    canView: (f: string) => admin || !!(perms[f]?.["View(Global)"] || perms[f]?.["View (Own)"]),
    can: (f: string, c: string) => admin || perms[f]?.[c] === true,
    isModuleEnabled: (m: string) => !off.includes(m),
  };
}

function seedServices() {
  svc.getInvoices.mockResolvedValue(INVOICES);
  svc.getProposals.mockResolvedValue([]);
  svc.getExpenses.mockResolvedValue([]);
  svc.getEstimates.mockResolvedValue([]);
  svc.getTasks.mockResolvedValue(TASKS);
  svc.getProjects.mockResolvedValue([{ _id: "p1", name: "P1", status: 2 }, { _id: "p2", name: "P2", status: 4 }]);
  svc.getTickets.mockResolvedValue(TICKETS);
  svc.getAnnouncements.mockResolvedValue([]);
  svc.getTodos.mockResolvedValue(TODOS);
  svc.createTodo.mockResolvedValue({});
  svc.updateTodo.mockResolvedValue({});
  svc.getActivityLogs.mockResolvedValue(LOGS);
  svc.getLeads.mockResolvedValue(LEADS);
  svc.getQuotations.mockResolvedValue([]);
  svc.getReminders.mockResolvedValue([]);
}

const renderDash = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><Dashboard /></MemoryRouter>
    </QueryClientProvider>,
  );
};
const card = (label: string) => screen.getByText(label).closest(".relative") as HTMLElement;
const moneyCard = (label: string) => screen.getByText(label).parentElement as HTMLElement;

beforeEach(() => { vi.clearAllMocks(); setCtx(); seedServices(); });
afterEach(cleanup);

// ===================== Unit: stat cards & overview maths =====================
describe("[Unit] stat cards and money cards (business rules from 01-dashboard.md §2)", () => {
  it("Tasks Not Finished = 7 of 8 (status 5 = complete)", async () => {
    renderDash();
    await waitFor(() => expect(within(card("Tasks Not Finished")).getByText("7 / 8")).toBeInTheDocument());
  });
  it("Projects In Progress = 1 of 2", async () => {
    renderDash();
    await waitFor(() => expect(within(card("Projects In Progress")).getByText("1 / 2")).toBeInTheDocument());
  });
  it("Invoices Awaiting Payment counts unpaid + sent + sent_later + partially_paid + overdue = 6 / 10", async () => {
    renderDash();
    await screen.findByText("Invoices Awaiting Payment");
    await waitFor(() => expect(within(card("Invoices Awaiting Payment")).getByText(/\d+ \/ 10/)).toBeInTheDocument());
    expect(within(card("Invoices Awaiting Payment")).getByText(/\d+ \/ 10/).textContent).toBe("6 / 10");
  });
  it("Converted Leads counts `converted: true` (and status Customer) = 3 / 5", async () => {
    renderDash();
    await waitFor(() => expect(within(card("Converted Leads")).getByText(/\d+ \/ 5/)).toBeInTheDocument());
    expect(within(card("Converted Leads")).getByText(/\d+ \/ 5/).textContent).toBe("3 / 5");
  });
  it("Past Due money card = overdue total ₹2000.00", async () => {
    renderDash();
    await waitFor(() => expect(within(moneyCard("Past Due Invoices")).getByText("₹2000.00")).toBeInTheDocument());
  });
  it("Paid money card = paid + recorded = ₹6700.00", async () => {
    renderDash();
    await screen.findByText("Paid Invoices");
    await waitFor(() => expect(within(moneyCard("Paid Invoices")).getByText(/₹\d/)).toBeInTheDocument());
    expect(within(moneyCard("Paid Invoices")).getByText(/₹\d/).textContent).toBe("₹6700.00");
  });
  it("Invoice overview percentages add up to 100%", async () => {
    renderDash();
    const title = await screen.findByText("Invoice overview");
    const section = title.closest(".space-y-3") as HTMLElement;
    await waitFor(() => expect(within(section).getByText(/Overdue$/).textContent).toMatch(/^1 /));
    const pcts = within(section).getAllByText(/%$/).map((n) => parseFloat(n.textContent || "0"));
    expect(Math.round(pcts.reduce((a, b) => a + b, 0))).toBe(100);
  });
});

// ===================== UI: widgets =====================
describe("[UI] My To Do Items (backend shape: description / finished / _id)", () => {
  it("shows the to-do text and puts finished items under 'Latest finished to do's'", async () => {
    renderDash();
    expect(await screen.findByText("Pay electricity bill")).toBeInTheDocument();
    const done = screen.getByText(/Latest finished to do's/).parentElement as HTMLElement;
    expect(within(done).getByText("Renew domain")).toBeInTheDocument();
  });
  it("New To Do sends the field the backend requires (description), trimmed", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("  Call the bank  ");
    renderDash();
    fireEvent.click(await screen.findByText("New To Do"));
    await waitFor(() => expect(svc.createTodo).toHaveBeenCalled());
    expect(svc.createTodo.mock.calls[0][0]).toMatchObject({ description: "Call the bank" });
  });
  it("New To Do with only spaces does not call the API", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("    ");
    renderDash();
    fireEvent.click(await screen.findByText("New To Do"));
    expect(svc.createTodo).not.toHaveBeenCalled();
  });
  it("ticking a to-do saves `finished: true` on the right id", async () => {
    svc.getTodos.mockResolvedValue([{ _id: "td1", description: "Pay electricity bill", finished: false }]);
    renderDash();
    await screen.findByText("My To Do Items");
    await waitFor(() => expect(screen.queryByText("No todos found")).toBeNull());
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    await waitFor(() => expect(svc.updateTodo).toHaveBeenCalled());
    expect(svc.updateTodo.mock.calls[0][0]).toBe("td1");
    expect(svc.updateTodo.mock.calls[0][1]).toMatchObject({ finished: true });
  });
  it("empty list shows 'No todos found'", async () => {
    svc.getTodos.mockResolvedValue([]);
    renderDash();
    expect(await screen.findByText("No todos found")).toBeInTheDocument();
  });
});

describe("[UI] My Tasks tab", () => {
  it("status labels match the Tasks page (2 = In Progress, 4 = Awaiting Feedback, 1 = Not Started)", async () => {
    renderDash();
    const row2 = (await screen.findByText("Task 2")).closest("tr") as HTMLElement;
    const row4 = screen.getByText("Task 4").closest("tr") as HTMLElement;
    expect(within(row2).getByText("In Progress")).toBeInTheDocument();
    expect(within(row4).getByText("Awaiting Feedback")).toBeInTheDocument();
  });
  it("shows the 5 MOST RECENT unfinished tasks (newest Task 7 shown, oldest Task 1 not)", async () => {
    renderDash();
    await screen.findByText("Task 2");
    expect(screen.queryByText("Task 7")).toBeInTheDocument();
    expect(screen.queryByText("Task 1")).toBeNull();
  });
});

describe("[UI] Tickets tab", () => {
  it("shows the newest ticket, not the oldest, and never invents a customer ('Acme Corp')", async () => {
    renderDash();
    const trigger = await screen.findByRole("tab", { name: /Tickets/ });
    fireEvent.mouseDown(trigger, { button: 0 });
    await screen.findByText("Ticket 2");
    expect(screen.queryByText("Newest ticket")).toBeInTheDocument();
    expect(screen.queryByText("Old ticket")).toBeNull();
    expect(screen.queryByText("Acme Corp")).toBeNull();
  });
});

describe("[UI] Recent Activity", () => {
  it("shows the real staff name from `staffid` (not 'User')", async () => {
    renderDash();
    expect(await screen.findByText("Recent Activity")).toBeInTheDocument();
    await screen.findByText("Created invoice INV-1");
    expect(screen.getByText(/Rajesh Patel/)).toBeInTheDocument();
    expect(screen.queryByText("User")).toBeNull();
  });
  it("is hidden and not requested when the plan's `utility` module is off", async () => {
    setCtx({ off: ["utility"] });
    renderDash();
    await screen.findByText("My To Do Items");
    expect(screen.queryByText("Recent Activity")).toBeNull();
    expect(svc.getActivityLogs).not.toHaveBeenCalled();
  });
});

describe("[UI] permission & plan gating (01-dashboard.md §5.1–5.2)", () => {
  const TASKS_ONLY = { Tasks: { "View (Own)": true } };
  it("staff without View Invoices / Leads: those widgets are absent and their APIs are not called", async () => {
    setCtx({ admin: false, perms: TASKS_ONLY, user: { ...ADMIN, admin: false, role: { name: "Sales" } } });
    renderDash();
    await screen.findByText("Tasks Not Finished");
    expect(screen.queryByText("Invoices Awaiting Payment")).toBeNull();
    expect(screen.queryByText("Converted Leads")).toBeNull();
    expect(screen.queryByText("Outstanding Invoices")).toBeNull();
    expect(svc.getInvoices).not.toHaveBeenCalled();
    expect(svc.getLeads).not.toHaveBeenCalled();
  });
  it("staff without View Projects does not get a 'Projects In Progress 0 / 0' card", async () => {
    setCtx({ admin: false, perms: TASKS_ONLY, user: { ...ADMIN, admin: false, role: { name: "Sales" } } });
    renderDash();
    await screen.findByText("Tasks Not Finished");
    expect(screen.queryByText("Projects In Progress")).toBeNull();
  });
  it("staff without View Announcements: announcements are not requested (would 403)", async () => {
    setCtx({ admin: false, perms: TASKS_ONLY, user: { ...ADMIN, admin: false, role: { name: "Sales" } } });
    renderDash();
    await screen.findByText("Tasks Not Finished");
    expect(svc.getAnnouncements).not.toHaveBeenCalled();
  });
  it("staff without View Activity Log: no Recent Activity card", async () => {
    setCtx({ admin: false, perms: TASKS_ONLY, user: { ...ADMIN, admin: false, role: { name: "Sales" } } });
    renderDash();
    await screen.findByText("Tasks Not Finished");
    expect(screen.queryByText("Recent Activity")).toBeNull();
  });
  it("plan `finance` off: invoice cards hidden and invoices not requested", async () => {
    setCtx({ off: ["finance"] });
    renderDash();
    await screen.findByText("Tasks Not Finished");
    expect(screen.queryByText("Invoices Awaiting Payment")).toBeNull();
    expect(screen.queryByText("Paid Invoices")).toBeNull();
    expect(svc.getInvoices).not.toHaveBeenCalled();
  });
  it("plan `tasks` off: no task card, no My Tasks tab, tasks not requested", async () => {
    setCtx({ off: ["tasks"] });
    renderDash();
    await screen.findByText("Converted Leads");
    expect(screen.queryByText("Tasks Not Finished")).toBeNull();
    expect(screen.queryByRole("tab", { name: /My Tasks/ })).toBeNull();
    expect(svc.getTasks).not.toHaveBeenCalled();
  });
});

describe("[UI] navigation, states and expiry", () => {
  it("stat card opens its module on click (admin path)", async () => {
    renderDash();
    fireEvent.click(await screen.findByText("Tasks Not Finished"));
    expect(mockNavigate).toHaveBeenCalledWith("/admin/tasks");
  });
  it("stat card opens on Enter with the staff path for staff", async () => {
    setCtx({ admin: false, perms: { Tasks: { "View(Global)": true } }, user: { ...ADMIN, admin: false, role: { name: "Sales" } } });
    renderDash();
    const c = card(await screen.findByText("Tasks Not Finished").then((n) => n.textContent as string));
    fireEvent.keyDown(c, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith("/staff/tasks");
  });
  it("no 'undefined' / 'NaN' / 'null' text anywhere with empty data", async () => {
    for (const k of Object.keys(svc)) (svc as any)[k].mockResolvedValue([]);
    const { container } = renderDash();
    await screen.findByText("My To Do Items");
    expect(container.textContent).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b/);
  });
  it("plan past the 7-day grace: 'Subscription Expired' modal with Renew Plan, no data requested", async () => {
    const ended = new Date(Date.now() - 20 * 86400000).toISOString();
    setCtx({ user: { ...ADMIN, tenant: { status: "active", billing_cycle_end: ended, plan_id: { name: "Pro", price: 999, billing_cycle: "monthly" } } } });
    renderDash();
    expect(await screen.findByText("Subscription Expired")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Renew Plan/ })).toBeInTheDocument();
    expect(svc.getInvoices).not.toHaveBeenCalled();
    expect(svc.getTodos).not.toHaveBeenCalled();
  });
});

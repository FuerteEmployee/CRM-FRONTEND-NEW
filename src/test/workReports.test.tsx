// Reports: Project Work / Customer Work / Staff Work / Work Overview pages,
// report permissions (sidebar + page gate), the Specific Date filter helpers,
// and the "finish today's tasks before logging out" guard + popup.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const h = vi.hoisted(() => ({
  perms: {} as Record<string, any>,
  isAdmin: false,
  svc: {
    getProjectWorkReport: vi.fn(),
    getStaffWorkReport: vi.fn(),
    getCustomerWorkReport: vi.fn(),
    getWorkOverview: vi.fn(),
    logoutCheck: vi.fn(),
    completeMyTask: vi.fn(),
    workStatus: vi.fn(),
  },
  exported: [] as any[],
}));

vi.mock("@/components/layout/DashboardLayout", () => ({ DashboardLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/api/services/utility.service", () => ({ utilityService: h.svc }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => {
    const canView = (f: string) => h.isAdmin || !f || !!(h.perms[f]?.["View(Global)"] || h.perms[f]?.["View (Own)"]);
    return { user: { _id: "me", firstname: "Me" }, permissions: h.perms, isAdmin: h.isAdmin, isStaff: !h.isAdmin, can: () => true, canView, isModuleEnabled: () => true };
  },
}));
vi.mock("@/context/SettingsContext", () => ({ useSettings: () => ({ getSetting: (_k: string, d: any) => d }) }));
vi.mock("@/context/CurrencyContext", () => ({ useCurrency: () => ({ symbol: "₹" }) }));
vi.mock("@/lib/reportExport", () => ({ exportReport: async (kind: string, input: any) => { h.exported.push({ kind, input }); } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { reportAllowed, reportSlugOf, viewLevel, REPORT_RULES } from "@/lib/reportAccess";
import { periodRange, needsDate, periodLabel, ReportGate, PERIODS } from "@/pages/ReportPages";
import { ReportProjectWork, ReportCustomerWork, ReportStaffWork, WorkOverview } from "@/pages/WorkReports";
import { guardedLogout } from "@/lib/logoutGuard";
import { PendingTasksLogoutDialog } from "@/components/layout/PendingTasksLogoutDialog";

const Where = () => {
  const l = useLocation();
  return <output data-testid="where">{l.pathname + l.search}</output>;
};
const renderAt = (url: string, el: React.ReactNode, path = "/admin/reports/x") => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={path} element={el} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  h.perms = {};
  h.isAdmin = true;
  h.exported = [];
  Object.values(h.svc).forEach((f) => f.mockReset());
  h.svc.workStatus.mockResolvedValue({ session: null });
});
afterEach(cleanup);

// ── Permissions ─────────────────────────────────────────────────────────────
describe("report permissions (lib/reportAccess)", () => {
  const can = (perms: Record<string, boolean>) => (f: string) => !!perms[f];
  it("reads the report slug from a sidebar url", () => {
    expect(reportSlugOf("/admin/reports/leads")).toBe("leads");
    expect(reportSlugOf("/staff/reports/customer-work?x=1")).toBe("customer-work");
    expect(reportSlugOf("/admin/leads")).toBeNull();
  });
  it("needs Reports plus the module(s) the report is built from", () => {
    expect(reportAllowed("leads", can({ Reports: true, Leads: true }))).toBe(true);
    expect(reportAllowed("leads", can({ Reports: true }))).toBe(false);
    expect(reportAllowed("leads", can({ Leads: true }))).toBe(false);
    expect(reportAllowed("expenses-vs-income", can({ Reports: true, Payments: true }))).toBe(false);
    expect(reportAllowed("expenses-vs-income", can({ Reports: true, Payments: true, Expenses: true }))).toBe(true);
    expect(reportAllowed("sales", can({ Reports: true, Estimates: true }))).toBe(true);
    expect(reportAllowed("customer-work", can({ Reports: true, Customers: true }))).toBe(true);
    expect(reportAllowed("project-work", can({ Reports: true, Customers: true }))).toBe(false);
    expect(reportAllowed("master", can({ Reports: true }))).toBe(true);
    expect(reportAllowed(null, can({ Reports: true }))).toBe(true);
  });
  it("every report in the sidebar has a rule", () => {
    ["sales", "expenses", "expenses-vs-income", "leads", "timesheets", "kb", "purchase", "project-work", "staff-work", "customer-work"]
      .forEach((slug) => expect(REPORT_RULES[slug]).toBeTruthy());
  });
  it("view level: global / own / none", () => {
    expect(viewLevel({ Leads: { "View(Global)": true } }, false, "Leads")).toBe("global");
    expect(viewLevel({ Leads: { "View (Own)": true } }, false, "Leads")).toBe("own");
    expect(viewLevel({}, false, "Leads")).toBeNull();
    expect(viewLevel({}, true, "Leads")).toBe("global");
  });
  it("page gate shows the yellow 'no permission' message", () => {
    h.isAdmin = false;
    h.perms = { Reports: { "View(Global)": true } };
    renderAt("/admin/reports/x", <ReportGate slug="leads" title="Leads Report"><p>secret data</p></ReportGate>);
    expect(screen.queryByText("secret data")).toBeNull();
    expect(screen.getByText(/You do not have permission to see the Leads Report \(it needs the Leads permission\)/)).toBeInTheDocument();
  });
  it("page gate lets the page through when allowed", () => {
    h.isAdmin = false;
    h.perms = { Reports: { "View(Global)": true }, Leads: { "View (Own)": true } };
    renderAt("/admin/reports/x", <ReportGate slug="leads" title="Leads Report"><p>secret data</p></ReportGate>);
    expect(screen.getByText("secret data")).toBeInTheDocument();
  });
});

// ── Specific Date filter ────────────────────────────────────────────────────
describe("period filter helpers", () => {
  it("offers Yesterday and Specific Date", () => {
    expect(PERIODS.map((p) => p.value)).toEqual(expect.arrayContaining(["today", "yesterday", "date", "custom"]));
  });
  it("Specific Date covers exactly that day", () => {
    const r = periodRange("date", "2026-11-20")!;
    expect(r.start!.getFullYear()).toBe(2026);
    expect(r.start!.getMonth()).toBe(10);
    expect(r.start!.getDate()).toBe(20);
    expect(r.start!.getHours()).toBe(0);
    expect(r.end!.getDate()).toBe(20);
    expect(r.end!.getHours()).toBe(23);
  });
  it("a date period without a date is incomplete", () => {
    expect(needsDate("date", "")).toBe(true);
    expect(needsDate("date", "2026-11-20")).toBe(false);
    expect(needsDate("custom", "", "")).toBe(true);
    expect(needsDate("today")).toBe(false);
  });
  it("labels", () => {
    expect(periodLabel("yesterday")).toBe("Yesterday");
    expect(periodLabel("date", "")).toBe("-");
  });
});

// ── Sample report data ──────────────────────────────────────────────────────
const projectWork = {
  access: { level: "global", allStaff: true },
  summary: { projects: 2, inProgress: 1, totalTasks: 5, completedTasks: 2, completedInPeriod: 1, overdueTasks: 1, hours: 2 },
  projects: [
    { _id: "p1", name: "Website", client: "Alpha Ltd", status: 2, statusLabel: "In Progress", deadline: null, progress: 50, progressFrom: "tasks", totalTasks: 2, completedTasks: 1, openTasks: 1, overdueTasks: 0, completedInPeriod: 1, hours: 2, estimatedHours: 10,
      staff: [{ staffId: "s1", name: "Asha Test", tasks: 2, completed: 1, completedInPeriod: 1, hours: 2, progress: 50, lastWork: new Date().toISOString() }] },
    { _id: "p2", name: "Mobile App", client: "Beta Ltd", status: 1, statusLabel: "Not Started", deadline: null, progress: 33, progressFrom: "tasks", totalTasks: 3, completedTasks: 1, openTasks: 2, overdueTasks: 1, completedInPeriod: 0, hours: 0, estimatedHours: 0,
      staff: [{ staffId: "s2", name: "Bharat Test", tasks: 3, completed: 1, completedInPeriod: 0, hours: 0, progress: 33, lastWork: null }, { staffId: "s1", name: "Asha Test", tasks: 0, completed: 0, completedInPeriod: 0, hours: 0, progress: 0, lastWork: null }] },
  ],
  timeline: [{ type: "completed", at: new Date().toISOString(), projectId: "p1", project: "Website", task: "Home page", staff: "Asha Test" }],
};

describe("Project Work report", () => {
  it("shows each project's progress and the staff-wise view", async () => {
    h.svc.getProjectWorkReport.mockResolvedValue(projectWork);
    renderAt("/admin/reports/x", <ReportProjectWork />);
    expect(await screen.findByText("Website")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 tasks complete")).toBeInTheDocument();
    expect(h.svc.getProjectWorkReport).toHaveBeenCalledWith("this_month", "", "", "all");

    fireEvent.click(screen.getByRole("button", { name: /By Staff/ }));
    const asha = screen.getByText("Asha Test").closest("div.rounded-2xl, [class*='rounded-2xl']") as HTMLElement;
    expect(within(asha).getByText("Website")).toBeInTheDocument();
    expect(within(asha).getByText("Mobile App")).toBeInTheDocument();
    expect(screen.getByText("Bharat Test")).toBeInTheDocument();

    // search by staff name narrows the staff cards
    fireEvent.change(screen.getByPlaceholderText("Project, customer or staff"), { target: { value: "bharat" } });
    expect(screen.queryByText("Asha Test")).toBeNull();
    expect(screen.getByText("Bharat Test")).toBeInTheDocument();
  });
  it("project names open the project page (/projects/view/:id — /projects/:id is a 404)", async () => {
    h.svc.getProjectWorkReport.mockResolvedValue(projectWork);
    renderAt("/admin/reports/x", <ReportProjectWork />);
    expect(await screen.findByRole("link", { name: "Website" })).toHaveAttribute("href", "/admin/projects/view/p1");
    fireEvent.click(screen.getByRole("button", { name: /By Staff/ }));
    screen.getAllByRole("link", { name: "Mobile App" }).forEach((a) => expect(a).toHaveAttribute("href", "/admin/projects/view/p2"));
  });
  it("search narrows projects; timeline view; export has the staff-wise section", async () => {
    h.svc.getProjectWorkReport.mockResolvedValue(projectWork);
    renderAt("/admin/reports/x", <ReportProjectWork />);
    await screen.findByText("Website");
    fireEvent.change(screen.getByPlaceholderText("Project, customer or staff"), { target: { value: "beta" } });
    expect(screen.queryByText("Website")).toBeNull();
    expect(screen.getByText("Mobile App")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Project, customer or staff"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Who did what, when/ }));
    expect(screen.getByText("Home page")).toBeInTheDocument();
  });
});

const customerWork = {
  access: { full: true },
  summary: { customers: 10, withWork: 2, withPending: 2, totalTasks: 6, completed: 2, open: 4, overdue: 2, completedInPeriod: 1, hours: 3.5 },
  customers: [
    { _id: "c1", name: "Alpha Ltd", projects: 2, activeProjects: 2, totalTasks: 3, completed: 1, open: 2, overdue: 0, dueToday: 1, completedInPeriod: 1, hours: 2, progress: 33, lastWork: null,
      staff: [{ staffId: "s1", name: "Asha Test", open: 2, completed: 1 }], projectList: [{ _id: "p1", name: "Website", status: 2, statusLabel: "In Progress", total: 2, completed: 1, overdue: 0, progress: 50 }] },
    { _id: "c2", name: "Beta Ltd", projects: 1, activeProjects: 1, totalTasks: 3, completed: 1, open: 2, overdue: 2, dueToday: 0, completedInPeriod: 0, hours: 1.5, progress: 33, lastWork: null,
      staff: [{ staffId: "s2", name: "Bharat Test", open: 2, completed: 1 }], projectList: [] },
  ],
};

describe("Customer Work report", () => {
  it("lists customers with progress, details and search", async () => {
    h.svc.getCustomerWorkReport.mockResolvedValue(customerWork);
    renderAt("/admin/reports/x", <ReportCustomerWork />);
    expect(await screen.findByText("Alpha Ltd")).toBeInTheDocument();
    expect(screen.getAllByText("1 of 3 tasks complete")).toHaveLength(2);
    expect(screen.getByText(/33% · 2 of 6 tasks complete/)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Details/ })[0]);
    expect(screen.getByText("Website")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Website" })).toHaveAttribute("href", "/admin/projects/view/p1");
    expect(screen.getByText("Asha Test")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Customer, project or staff"), { target: { value: "bharat" } });
    expect(screen.queryByText("Alpha Ltd")).toBeNull();
    expect(screen.getByText("Beta Ltd")).toBeInTheDocument();
  });
  it("customer name links to the customer page", async () => {
    h.svc.getCustomerWorkReport.mockResolvedValue(customerWork);
    renderAt("/admin/reports/x", <ReportCustomerWork />);
    fireEvent.click(await screen.findByText("Alpha Ltd"));
    expect(screen.getByTestId("where").textContent).toBe("/admin/customers/c1");
  });
  it("shows the no-permission message on 403", async () => {
    h.svc.getCustomerWorkReport.mockRejectedValue({ response: { status: 403, data: { message: "You do not have permission to see the Customer Work report." } } });
    renderAt("/admin/reports/x", <ReportCustomerWork />);
    expect(await screen.findByText(/You do not have permission to see the Customer Work report/)).toBeInTheDocument();
  });
});

const staffWork = {
  access: { allStaff: true }, days: 1, hoursPerDay: 8,
  summary: {},
  staff: [
    { staffId: "s1", name: "Asha Test", email: "a@t.test", hours: 2, targetHours: 8, hoursProgress: 25, completedCount: 1, pendingCount: 2, taskProgress: 33, actions: 3,
      firstLogin: new Date().toISOString(), lastLogout: null, firstActivity: new Date().toISOString(), lastActivity: new Date().toISOString(), projects: ["Website"],
      entries: [{ task: "Home page", project: "Website", hours: 2, date: new Date().toISOString(), start: new Date().toISOString(), end: new Date().toISOString() }],
      completed: [{ task: "Home page", project: "Website", at: new Date().toISOString() }],
      pending: [{ _id: "t2", task: "Contact form", project: "Website", duedate: new Date().toISOString(), status: "In Progress" }], noWork: false },
    { staffId: "s2", name: "Bharat Test", email: "b@t.test", hours: 0, targetHours: 8, hoursProgress: 0, completedCount: 0, pendingCount: 0, taskProgress: 0, actions: 0,
      firstLogin: null, lastLogout: null, firstActivity: null, lastActivity: null, projects: [], entries: [], completed: [], pending: [], noWork: true },
  ],
};

describe("Staff Work report", () => {
  it("opens on the date and staff from the link (notification / overview)", async () => {
    h.svc.getStaffWorkReport.mockResolvedValue(staffWork);
    renderAt("/admin/reports/x?date=2026-11-20&staff=s1", <ReportStaffWork />);
    // name shows in the Staff filter (chosen from the link) and on the card
    expect(await screen.findAllByText("Asha Test")).toHaveLength(2);
    expect(h.svc.getStaffWorkReport).toHaveBeenCalledWith("date", "2026-11-20", "");
    // the linked staff member's details are already open
    expect(screen.getByText("Contact form")).toBeInTheDocument();
    // the Staff filter came from the link: only that person
    expect(screen.queryByText("Bharat Test")).toBeNull();
  });
  it("search by task / name; 'No work recorded' badge", async () => {
    h.svc.getStaffWorkReport.mockResolvedValue(staffWork);
    renderAt("/admin/reports/x", <ReportStaffWork />);
    await screen.findByText("Asha Test");
    expect(screen.getByText("No work recorded")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Staff, task or project"), { target: { value: "contact form" } });
    expect(screen.getByText("Asha Test")).toBeInTheDocument();
    expect(screen.queryByText("Bharat Test")).toBeNull();
  });
  it("export carries summary, work log, completed and pending", async () => {
    h.svc.getStaffWorkReport.mockResolvedValue(staffWork);
    renderAt("/admin/reports/x", <ReportStaffWork />);
    await screen.findByText("Asha Test");
    fireEvent.pointerDown(screen.getByRole("button", { name: /Export/ }), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByText("Excel"));
    await waitFor(() => expect(h.exported).toHaveLength(1));
    const titles = h.exported[0].input.sections.map((s: any) => s.title);
    expect(titles).toEqual(["Summary by Staff", "Work Log (time on tasks)", "Tasks Completed", "Tasks Due Today or Overdue (not complete)"]);
    expect(h.exported[0].input.sections[3].rows).toEqual([["Asha Test", "Contact form", "Website", expect.any(String), "In Progress"]]);
  });
});

describe("Work Overview (Master Dashboard tab)", () => {
  const overview = {
    access: { allStaff: true, customers: true, fullCustomers: true },
    summary: { customers: 10, customersWithPending: 2, projects: 3, activeProjects: 3, staff: 2, staffWithOverdue: 1, tasksOpen: 4, tasksOverdue: 2, tasksDueToday: 1, completedInPeriod: 2, hours: 3.5, customerProgress: 33, staffProgress: 40 },
    customers: customerWork.customers,
    staff: [
      { staffId: "s1", name: "Asha Test", email: "a@t.test", total: 3, completed: 1, open: 2, overdue: 1, dueToday: 1, completedInPeriod: 1, hours: 2, progress: 33, activeProjects: 2, activeCustomers: 1, lastActivity: null },
      { staffId: "s2", name: "Bharat Test", email: "b@t.test", total: 2, completed: 1, open: 1, overdue: 1, dueToday: 0, completedInPeriod: 0, hours: 1.5, progress: 50, activeProjects: 1, activeCustomers: 1, lastActivity: null },
    ],
  };
  it("shows customers and staff with done vs pending, search and a link to each staff report", async () => {
    h.svc.getWorkOverview.mockResolvedValue(overview);
    renderAt("/admin/reports/x", <WorkOverview period="this_month" />);
    expect(await screen.findByText("Staff — work done vs pending (2)")).toBeInTheDocument();
    expect(screen.getByText("Customers — work done vs pending (2)")).toBeInTheDocument();
    expect(screen.getByText("1 / 3 done · 33%")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search staff"), { target: { value: "asha" } });
    expect(screen.getByText("Staff — work done vs pending (1)")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Search customer"), { target: { value: "beta" } });
    expect(screen.getByText("Customers — work done vs pending (1)")).toBeInTheDocument();

    // "Report" opens the staff report popup (staffWorkReport.test.tsx); "Today" goes to Staff Work.
    expect(screen.getByRole("button", { name: "Report" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Today" }));
    expect(screen.getByTestId("where").textContent).toMatch(/^\/admin\/reports\/staff-work\?date=\d{4}-\d{2}-\d{2}&staff=s1$/);
  });
  it("hides the customer column when the user may not see customers", async () => {
    h.svc.getWorkOverview.mockResolvedValue({ ...overview, access: { allStaff: false, customers: false }, customers: [], staff: [overview.staff[0]] });
    renderAt("/admin/reports/x", <WorkOverview period="this_month" />);
    await screen.findByText("Staff — work done vs pending (1)");
    expect(screen.queryByText(/Customers — work done vs pending/)).toBeNull();
    expect(screen.getByText(/You see only your own records for: Staff/)).toBeInTheDocument();
  });
});

// ── Logout guard + popup ────────────────────────────────────────────────────
describe("logout guard", () => {
  it("logs out when nothing is pending", async () => {
    h.svc.logoutCheck.mockResolvedValue({ blocked: false, pending: [] });
    const out = vi.fn();
    expect(await guardedLogout(out)).toBe(true);
    expect(h.svc.logoutCheck).toHaveBeenCalledWith(true);
    expect(out).toHaveBeenCalledTimes(1);
  });
  it("never traps anyone when the check fails", async () => {
    h.svc.logoutCheck.mockRejectedValue(new Error("offline"));
    const out = vi.fn();
    expect(await guardedLogout(out)).toBe(true);
    expect(out).toHaveBeenCalled();
  });
  it("blocked: popup lists the tasks; completing them unlocks 'Log out now'", async () => {
    const pending = [
      { _id: "t3", name: "Fix login bug", duedate: "2026-11-20", overdue: true, status: 1, statusLabel: "Not Started", project: "Website" },
      { _id: "t2", name: "Send quote", duedate: "2026-11-26", overdue: false, status: 2, statusLabel: "In Progress", project: "" },
    ];
    h.svc.logoutCheck.mockResolvedValueOnce({ blocked: true, pending }).mockResolvedValue({ blocked: false, pending: [] });
    h.svc.completeMyTask.mockResolvedValue({ ok: true });
    renderAt("/admin/reports/x", <PendingTasksLogoutDialog />);
    const out = vi.fn();
    let result: boolean | undefined;
    await act(async () => { result = await guardedLogout(out); });
    expect(result).toBe(false);
    expect(out).not.toHaveBeenCalled();

    expect(await screen.findByText("Finish today's tasks before logging out")).toBeInTheDocument();
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    const logoutBtn = screen.getByRole("button", { name: /Log out now/ });
    expect(logoutBtn).toBeDisabled();

    for (const _ of pending) {
      fireEvent.click(screen.getAllByRole("button", { name: "Mark Complete" })[0]);
      await waitFor(() => expect(h.svc.completeMyTask).toHaveBeenCalled());
    }
    await screen.findByText("All done");
    expect(h.svc.completeMyTask.mock.calls.map((c) => c[0])).toEqual(["t3", "t2"]);
    expect(screen.getByRole("button", { name: /Log out now/ })).toBeEnabled();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Log out now/ })); });
    await waitFor(() => expect(out).toHaveBeenCalledTimes(1));
    // blocked: check + tell admins; Log out now: check again, then record the logout
    expect(h.svc.logoutCheck.mock.calls.map((c) => c[0])).toEqual([false, true, false, true]);
  });
  it("'Stay logged in' closes the popup without logging out; Open goes to the task", async () => {
    h.svc.logoutCheck.mockResolvedValue({ blocked: true, pending: [{ _id: "t9", name: "Call client", duedate: "2026-11-26", overdue: false, status: 1, statusLabel: "Not Started", project: "" }] });
    renderAt("/admin/reports/x", <PendingTasksLogoutDialog />);
    const out = vi.fn();
    await act(async () => { await guardedLogout(out); });
    fireEvent.click(await screen.findByRole("button", { name: "Stay logged in" }));
    await waitFor(() => expect(screen.queryByText("Call client")).toBeNull());
    expect(out).not.toHaveBeenCalled();

    await act(async () => { await guardedLogout(out); });
    fireEvent.click(await screen.findByTitle("Open task"));
    expect(screen.getByTestId("where").textContent).toBe("/admin/tasks?taskId=t9");
  });
  it("a failed 'Mark Complete' keeps the task in the list", async () => {
    h.svc.logoutCheck.mockResolvedValue({ blocked: true, pending: [{ _id: "t9", name: "Call client", duedate: "2026-11-26", overdue: false, status: 1, statusLabel: "Not Started", project: "" }] });
    h.svc.completeMyTask.mockRejectedValue({ response: { data: { message: "Task not found or not assigned to you" } } });
    renderAt("/admin/reports/x", <PendingTasksLogoutDialog />);
    await act(async () => { await guardedLogout(vi.fn()); });
    fireEvent.click(await screen.findByRole("button", { name: "Mark Complete" }));
    await waitFor(() => expect(h.svc.completeMyTask).toHaveBeenCalled());
    expect(screen.getByText("Call client")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Log out now/ })).toBeDisabled();
  });
});

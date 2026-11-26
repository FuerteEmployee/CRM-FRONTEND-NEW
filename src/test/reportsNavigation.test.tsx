// Reports > Master Dashboard: ONE Period filter and ONE Export at the top
// (Work Overview has none of its own), and the Work Overview / Staff Work /
// Project Work / Customer Work bar on every work report page.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const h = vi.hoisted(() => ({
  perms: {} as Record<string, any>,
  isAdmin: true,
  svc: {
    getWorkOverview: vi.fn(),
    getProjectWorkReport: vi.fn(),
    getStaffWorkReport: vi.fn(),
    getCustomerWorkReport: vi.fn(),
  },
  exported: [] as any[],
  empty: () => new Proxy({}, { get: () => () => Promise.resolve([]) }),
}));


vi.mock("@/components/layout/DashboardLayout", () => ({ DashboardLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/api/services/utility.service", () => ({ utilityService: h.svc }));
vi.mock("@/api/services/customer.service", () => ({ customerService: h.empty() }));
vi.mock("@/api/services/sales.service", () => ({ salesService: h.empty() }));
vi.mock("@/api/services/task.service", () => ({ taskService: h.empty() }));
vi.mock("@/api/services/project.service", () => ({ projectService: h.empty() }));
vi.mock("@/api/services/lead.service", () => ({ leadService: h.empty() }));
vi.mock("@/api/services/support.service", () => ({ supportService: h.empty() }));
vi.mock("@/api/services/contract.service", () => ({ contractService: h.empty() }));
vi.mock("@/api/services/estimate.service", () => ({ estimateService: h.empty() }));
vi.mock("@/api/services/staff.service", () => ({ staffService: h.empty() }));
vi.mock("@/api/services/time_entry.service", () => ({ timeEntryService: h.empty() }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => {
    const canView = (f: string) => h.isAdmin || !f || !!(h.perms[f]?.["View(Global)"] || h.perms[f]?.["View (Own)"]);
    return { user: { _id: "me" }, permissions: h.perms, isAdmin: h.isAdmin, isStaff: !h.isAdmin, can: () => true, canView, isModuleEnabled: () => true };
  },
}));
vi.mock("@/context/SettingsContext", () => ({ useSettings: () => ({ getSetting: (_k: string, d: any) => d }) }));
vi.mock("@/context/CurrencyContext", () => ({ useCurrency: () => ({ symbol: "₹" }) }));
vi.mock("@/lib/reportExport", () => ({ exportReport: async (kind: string, input: any) => { h.exported.push({ kind, input }); } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import Reports from "@/pages/Reports";
import { ReportProjectWork, ReportStaffWork, ReportCustomerWork } from "@/pages/WorkReports";

const Where = () => {
  const l = useLocation();
  return <output data-testid="where">{l.pathname + l.search}</output>;
};
const renderAt = (url: string, el: React.ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/admin/reports/:page" element={el} />
          <Route path="/staff/reports/:page" element={el} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const overview = {
  access: { allStaff: true, customers: true, fullCustomers: true },
  summary: { customers: 1, staff: 1, projects: 1, activeProjects: 1, tasksOpen: 1, customerProgress: 50, staffProgress: 50 },
  customers: [{ _id: "c1", name: "Alpha Ltd", projects: 1, activeProjects: 1, totalTasks: 2, completed: 1, open: 1, overdue: 0, progress: 50, staff: [], projectList: [] }],
  staff: [{ staffId: "s1", name: "Asha Test", email: "", total: 2, completed: 1, open: 1, overdue: 0, dueToday: 0, completedInPeriod: 1, hours: 1, progress: 50, activeProjects: 1, activeCustomers: 1, lastActivity: null }],
};

beforeEach(() => {
  h.perms = {};
  h.isAdmin = true;
  h.exported = [];
  Object.values(h.svc).forEach((f) => f.mockReset());
  h.svc.getWorkOverview.mockResolvedValue(overview);
  h.svc.getProjectWorkReport.mockResolvedValue({ access: { level: "global", allStaff: true }, summary: {}, projects: [], timeline: [] });
  h.svc.getStaffWorkReport.mockResolvedValue({ access: { allStaff: true }, summary: {}, staff: [] });
  h.svc.getCustomerWorkReport.mockResolvedValue({ access: { full: true }, summary: {}, customers: [] });
});
afterEach(cleanup);

describe("Reports page (Master Dashboard)", () => {
  it("opens on Work Overview with ONE Period filter and ONE Export button", async () => {
    renderAt("/admin/reports/master", <Reports />);
    expect(await screen.findByText("Staff — work done vs pending (1)")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Export/ })).toHaveLength(1);
    expect(screen.getAllByText("Period")).toHaveLength(1);
  });

  it("the top Period filter drives Work Overview (all filter choices, incl. Specific Date)", async () => {
    renderAt("/admin/reports/master", <Reports />);
    await screen.findByText("Staff — work done vs pending (1)");
    expect(h.svc.getWorkOverview).toHaveBeenLastCalledWith("all_time", "", "");

    // the first drop-down on the page is the Period filter at the top
    fireEvent.click(screen.getAllByRole("combobox")[0]);
    const list = await screen.findByRole("listbox");
    ["All Time", "Today", "Yesterday", "Specific Date", "This Week", "Last Week", "This Month", "Last Month", "This Quarter", "This Year", "Last Year", "Custom Period"]
      .forEach((label) => expect(within(list).getByText(label)).toBeInTheDocument());
    fireEvent.click(within(list).getByText("Specific Date"));
    // a date box appears, filled with today, and Work Overview reloads for that day
    const dateBox = await screen.findByDisplayValue(/^\d{4}-\d{2}-\d{2}$/);
    await waitFor(() => expect(h.svc.getWorkOverview).toHaveBeenLastCalledWith("date", (dateBox as HTMLInputElement).value, ""));
    fireEvent.change(dateBox, { target: { value: "2026-11-20" } });
    await waitFor(() => expect(h.svc.getWorkOverview).toHaveBeenLastCalledWith("date", "2026-11-20", ""));
  });

  it("the top Export exports Work Overview while that tab is open", async () => {
    renderAt("/admin/reports/master", <Reports />);
    await screen.findByText("Staff — work done vs pending (1)");
    fireEvent.pointerDown(screen.getByRole("button", { name: /Export/ }), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByText("Excel"));
    await waitFor(() => expect(h.exported).toHaveLength(1));
    expect(h.exported[0].input.title).toBe("Work Overview");
    expect(h.exported[0].input.sections.map((s: any) => s.title)).toEqual(["Staff — work done vs pending", "Customers — work done vs pending"]);
  });
});

describe("navigation between the work reports", () => {
  const pages: [string, React.ReactNode, string][] = [
    ["/admin/reports/project-work", <ReportProjectWork />, "Project Work"],
    ["/admin/reports/staff-work", <ReportStaffWork />, "Staff Work (daily)"],
    ["/admin/reports/customer-work", <ReportCustomerWork />, "Customer Work"],
    ["/admin/reports/master", <Reports />, "Work Overview"],
  ];

  it.each(pages)("%s shows all four buttons, the current one marked", async (url, el, current) => {
    renderAt(url, el);
    const nav = await screen.findByRole("navigation", { name: "Work reports" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Work Overview", "Staff Work (daily)", "Project Work", "Customer Work"]);
    expect(within(nav).getByRole("link", { name: current })).toHaveAttribute("aria-current", "page");
  });

  it("from any page to any page", async () => {
    const targets: Record<string, string> = {
      "Work Overview": "/admin/reports/master",
      "Staff Work (daily)": "/admin/reports/staff-work",
      "Project Work": "/admin/reports/project-work",
      "Customer Work": "/admin/reports/customer-work",
    };
    for (const [url, el] of pages.map((p) => [p[0], p[1]] as const)) {
      for (const [label, path] of Object.entries(targets)) {
        const { unmount } = renderAt(url, el);
        const nav = await screen.findByRole("navigation", { name: "Work reports" });
        expect(within(nav).getByRole("link", { name: label })).toHaveAttribute("href", path);
        unmount();
      }
    }
  });

  it("a report the user may not open is not offered", async () => {
    h.isAdmin = false;
    h.perms = { Reports: { "View(Global)": true }, Tasks: { "View (Own)": true } };
    renderAt("/admin/reports/staff-work", <ReportStaffWork />);
    const nav = await screen.findByRole("navigation", { name: "Work reports" });
    expect(within(nav).getAllByRole("link").map((l) => l.textContent)).toEqual(["Work Overview", "Staff Work (daily)"]);
  });

  it("staff pages use the /staff prefix", async () => {
    renderAt("/staff/reports/project-work", <ReportProjectWork />);
    const nav = await screen.findByRole("navigation", { name: "Work reports" });
    expect(within(nav).getByRole("link", { name: "Customer Work" })).toHaveAttribute("href", "/staff/reports/customer-work");
    expect(within(nav).getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/staff/reports/master", "/staff/reports/staff-work", "/staff/reports/project-work", "/staff/reports/customer-work"]);
  });
});

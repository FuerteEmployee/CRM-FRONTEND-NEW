// Reports > Work Overview: clicking a staff member opens their report — tasks
// grouped project-wise with descriptions (plain text, never HTML), filters,
// and an export with one section per project.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const h = vi.hoisted(() => ({
  svc: { getWorkOverview: vi.fn(), getStaffReport: vi.fn() },
  exported: [] as any[],
}));

vi.mock("@/api/services/utility.service", () => ({ utilityService: h.svc }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ user: { _id: "me" }, permissions: {}, isAdmin: true, isStaff: false, can: () => true, canView: () => true, isModuleEnabled: () => true }),
}));
vi.mock("@/context/SettingsContext", () => ({ useSettings: () => ({ getSetting: (_k: string, d: any) => d }) }));
vi.mock("@/context/CurrencyContext", () => ({ useCurrency: () => ({ symbol: "₹" }) }));
vi.mock("@/lib/reportExport", () => ({ exportReport: async (kind: string, input: any) => { h.exported.push({ kind, input }); } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { WorkOverview } from "@/pages/WorkReports";
import { descriptionText } from "@/components/reports/StaffWorkReportDialog";

const overview = {
  access: { allStaff: true, customers: false },
  summary: { staff: 1 },
  staff: [{ staffId: "s1", name: "Ravi Kumar", email: "r@x.com", total: 3, completed: 1, open: 2, overdue: 1, dueToday: 0, completedInPeriod: 1, hours: 2.5, workHours: 0, progress: 33, activeProjects: 1 }],
  customers: [],
};

const task = (o: any) => ({
  status: 1, statusLabel: "Not Started", priority: 2, priorityLabel: "Medium", startdate: null, duedate: null, datefinished: null,
  overdue: false, dueToday: false, daysOverdue: 0, doneInPeriod: false, hours: 0, timeLogs: [], checklist: { done: 0, total: 0 }, comments: 0, tags: [], description: "", ...o,
});
const report = {
  staff: { _id: "s1", name: "Ravi Kumar", email: "r@x.com", role: "Developer" },
  summary: { total: 3, completed: 1, open: 2, overdue: 1, dueToday: 0, completedInPeriod: 1, olderCompleted: 0, progress: 33, hours: 2.5, otherHours: 0, projects: 1, activeProjects: 1 },
  groups: [
    {
      type: "project", id: "p1", name: "Website Revamp", status: 2, statusLabel: "In Progress", customer: { id: "c1", name: "Acme Pvt Ltd" },
      total: 2, completed: 1, open: 1, overdue: 1, hours: 2.5, progress: 50,
      tasks: [
        task({ _id: "t1", name: "Design homepage", description: "<p>Hero <b>banner</b></p><ul><li>Logo</li></ul><script>alert(1)</script>", overdue: true, daysOverdue: 3, priority: 3, priorityLabel: "High", hours: 2.5,
          timeLogs: [{ date: "2026-11-20", hours: 2.5 }], checklist: { done: 1, total: 2 } }),
        task({ _id: "t2", name: "Deploy site", status: 5, statusLabel: "Complete", datefinished: "2026-11-25", doneInPeriod: true }),
      ],
    },
    { type: "none", id: null, name: "General tasks (no project)", total: 1, completed: 0, open: 1, overdue: 0, hours: 0, progress: 0, tasks: [task({ _id: "t3", name: "Personal todo" })] },
  ],
};

const renderOverview = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/admin/reports/master"]}>
        <WorkOverview period="this_month" />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const openReport = async () => {
  renderOverview();
  fireEvent.click(await screen.findByRole("button", { name: "Ravi Kumar" }));
  return screen.findByRole("dialog");
};

describe("Work Overview → staff report", () => {
  beforeEach(() => {
    h.exported = [];
    h.svc.getWorkOverview.mockResolvedValue(overview);
    h.svc.getStaffReport.mockResolvedValue(report);
  });

  it("clicking the name opens that staff member's report for the same period", async () => {
    const dialog = await openReport();
    expect(h.svc.getStaffReport).toHaveBeenCalledWith("s1", "this_month", "", "");
    expect(within(dialog).getByText("Ravi Kumar")).toBeInTheDocument();
    expect(within(dialog).getByText("Developer")).toBeInTheDocument();
  });

  it("the Report button opens it too", async () => {
    renderOverview();
    fireEvent.click(await screen.findByRole("button", { name: "Report" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("shows tasks project-wise with project, customer and details", async () => {
    const dialog = await openReport();
    expect(await within(dialog).findByText("Website Revamp")).toBeInTheDocument();
    expect(within(dialog).getByText("Customer: Acme Pvt Ltd")).toBeInTheDocument();
    expect(within(dialog).getByText("General tasks (no project)")).toBeInTheDocument();
    expect(within(dialog).getByText("Design homepage")).toBeInTheDocument();
    expect(within(dialog).getByText(/3 days overdue/)).toBeInTheDocument();
    expect(within(dialog).getByText("Checklist 1/2")).toBeInTheDocument();
    expect(within(dialog).getByText("Open project").getAttribute("href")).toBe("/admin/projects/view/p1");
    expect(within(dialog).getByText("Design homepage").getAttribute("href")).toBe("/admin/tasks?taskId=t1");
  });

  it("description is plain text — no HTML or script rendered", async () => {
    const dialog = await openReport();
    const desc = await within(dialog).findByText(/Hero banner/);
    expect(desc.textContent).toContain("• Logo");
    expect(desc.innerHTML).not.toContain("<b>");
    expect(dialog.querySelector("script")).toBeNull();
    expect(within(dialog).getAllByText("No description").length).toBe(2);
  });

  it("Overdue / Completed filters", async () => {
    const dialog = await openReport();
    await within(dialog).findByText("Design homepage");
    fireEvent.click(within(dialog).getByRole("button", { name: "Overdue" }));
    expect(within(dialog).getByText("Design homepage")).toBeInTheDocument();
    expect(within(dialog).queryByText("Deploy site")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Personal todo")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Completed" }));
    expect(within(dialog).getByText("Deploy site")).toBeInTheDocument();
    expect(within(dialog).queryByText("Design homepage")).not.toBeInTheDocument();
  });

  it("search finds a task by its description", async () => {
    const dialog = await openReport();
    await within(dialog).findByText("Design homepage");
    fireEvent.change(within(dialog).getByPlaceholderText(/search task/i), { target: { value: "logo" } });
    expect(within(dialog).getByText("Design homepage")).toBeInTheDocument();
    expect(within(dialog).queryByText("Personal todo")).not.toBeInTheDocument();
  });

  it("a project section can be collapsed", async () => {
    const dialog = await openReport();
    await within(dialog).findByText("Design homepage");
    fireEvent.click(within(dialog).getByText("Website Revamp"));
    expect(within(dialog).queryByText("Design homepage")).not.toBeInTheDocument();
  });

  it("export has one section per project with the task description", async () => {
    const dialog = await openReport();
    await within(dialog).findByText("Design homepage");
    fireEvent.pointerDown(within(dialog).getByRole("button", { name: /export/i }), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByText("Excel"));
    await waitFor(() => expect(h.exported.length).toBe(1));
    const input = h.exported[0].input;
    expect(input.title).toBe("Work Report — Ravi Kumar");
    expect(input.sections).toHaveLength(2);
    expect(input.sections[0].title).toContain("Project: Website Revamp (Acme Pvt Ltd)");
    expect(input.sections[0].rows[0][1]).toContain("Hero banner");
  });
});

describe("descriptionText", () => {
  it("turns rich text into readable lines", () => {
    expect(descriptionText("<p>One</p><p>Two&nbsp;three</p><ul><li>A</li><li>B</li></ul>")).toBe("One\nTwo three\n• A\n• B");
    expect(descriptionText("")).toBe("");
    expect(descriptionText("line1<br>line2")).toBe("line1\nline2");
  });
});

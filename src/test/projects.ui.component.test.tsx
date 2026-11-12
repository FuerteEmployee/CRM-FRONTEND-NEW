// Projects — UI COMPONENT tests (19-projects.md sections 3, 4, phase 6/7). Renders the REAL
// Projects list page and ProjectCreate form with API services mocked (no network, no live
// :5001 / :5183). Radix Select / SearchableSelect swapped for native elements for jsdom.
// Each test states the CORRECT behaviour; a failing test = a bug.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const toastSpy = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastSpy }), toast: (...a: any[]) => toastSpy(...a) }));
const sonner = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), sonner) }));
vi.mock("@/components/layout/DashboardLayout", () => ({ DashboardLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/shared/RichTextEditor", () => ({ RichTextEditor: () => <textarea aria-label="description" /> }));
vi.mock("@/context/CurrencyContext", () => ({ useCurrency: () => ({ symbol: "₹" }) }));
vi.mock("@/context/SettingsContext", () => ({ useSettings: () => ({ getSetting: (_k: string, d: any) => d, settings: {} }) }));
vi.mock("@/components/ui/select", () => {
  const Select = ({ value, onValueChange, children }: any) => (
    <select data-testid="select" value={value} onChange={(e) => onValueChange?.(e.target.value)}>{children}</select>
  );
  const Pass = ({ children }: any) => <>{children}</>;
  const Nothing = () => null;
  const SelectItem = ({ value, children }: any) => <option value={value}>{typeof children === "string" ? children : value}</option>;
  return { Select, SelectContent: Pass, SelectGroup: Pass, SelectItem, SelectTrigger: Nothing, SelectValue: Nothing, SelectLabel: Nothing, SelectSeparator: Nothing };
});
vi.mock("@/components/ui/searchable-select", () => ({
  SearchableSelect: ({ options, placeholder }: any) => (
    <ul data-testid={`ss-${placeholder}`}>{options.map((o: any) => <li key={o.value}>{o.label}</li>)}</ul>
  ),
}));

const perm = { current: {} as any };
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => perm.current }));

const api = vi.hoisted(() => ({
  getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), del: vi.fn(), bulkDelete: vi.fn(),
  staffGetAll: vi.fn(), staffAssignable: vi.fn(),
}));
vi.mock("@/api/services/project.service", () => ({
  projectService: { getAll: api.getAll, getById: api.getById, create: api.create, update: api.update, delete: api.del, bulkDelete: api.bulkDelete, getTasks: vi.fn().mockResolvedValue([]) },
}));
vi.mock("@/api/services/customer.service", () => ({ customerService: { getAll: vi.fn().mockResolvedValue([{ _id: "c1", company: "Acme Traders" }]) } }));
vi.mock("@/api/services/staff.service", () => ({ staffService: { getAll: api.staffGetAll, getAssignable: api.staffAssignable } }));
vi.mock("@/hrms/services/hrmsbranchService", () => ({ hrmsbranchService: { getAll: vi.fn().mockResolvedValue({ data: [] }) } }));

import Projects from "@/pages/Projects";
import ProjectCreate from "@/pages/ProjectCreate";

const STAFF = [
  { _id: "s1", firstname: "Ravi", lastname: "Kumar", active: true },
  { _id: "s2", firstname: "Priya", lastname: "Shah", active: true },
];
const PROJECTS = [
  { _id: "p1", name: "Website Revamp", status: 2, clientid: { _id: "c1", company: "Acme Traders" }, team: ["s1"], progress: 40, tags: ["web"] },
  { _id: "p2", name: "Office Fitout", status: 3, clientid: { _id: "c2", company: "Zenith Corp" }, team: ["s1", "s2"], progress: 75, tags: [] },
];
const listResponse = { data: PROJECTS, total: 2, page: 1, pages: 1, limit: 25, statusAgg: [{ status: 2, count: 1 }, { status: 3, count: 1 }] };

const ADMIN = { user: { _id: "admin", admin: true, email: "a@x.test" }, isAdmin: true, isStaff: false, can: () => true, isModuleEnabled: () => true };
// Mirrors PermissionContext.can(): exact feature/capability keys, as stored on Staff.permissions.
const staffWith = (caps: Record<string, boolean>) => ({
  user: { _id: "s9", email: "s@x.test", role: { name: "Sales" } }, isAdmin: false, isStaff: true,
  can: (f: string, c: string) => f === "Projects" && caps[c] === true, isModuleEnabled: () => true,
});

const wrap = (ui: React.ReactNode, url = "/admin/projects", path = "/admin/projects") => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={<div>navigated</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  perm.current = ADMIN;
  api.getAll.mockReset().mockResolvedValue(listResponse);
  api.del.mockReset().mockResolvedValue({});
  api.bulkDelete.mockReset().mockResolvedValue({ deletedCount: 1 });
  api.create.mockReset().mockResolvedValue({ _id: "new" });
  api.staffGetAll.mockReset().mockResolvedValue(STAFF);
  api.staffAssignable.mockReset().mockResolvedValue(STAFF);
  toastSpy.mockReset();
});
afterEach(() => cleanup());

// =============================================================================
describe("Projects list page", () => {
  it("renders rows with customer names and status badges", async () => {
    wrap(<Projects />);
    expect(await screen.findByText("Website Revamp")).toBeInTheDocument();
    expect(screen.getByText("Zenith Corp")).toBeInTheDocument();
  });

  it("status pills: All (2) + 5 statuses with server counts", async () => {
    wrap(<Projects />);
    await screen.findByText("Website Revamp");
    expect(screen.getByRole("button", { name: /^All\s*\(2\)/ })).toBeInTheDocument();
    for (const [label, n] of [["Not Started", 0], ["In Progress", 1], ["On Hold", 1], ["Finished", 0], ["Cancelled", 0]] as const) {
      expect(screen.getByRole("button", { name: new RegExp(`^${label}\\s*\\(${n}\\)`) })).toBeInTheDocument();
    }
  });

  it("clicking 'On Hold' pill → API called with status=3", async () => {
    wrap(<Projects />);
    await screen.findByText("Website Revamp");
    fireEvent.click(screen.getByRole("button", { name: /^On Hold/ }));
    await waitFor(() => expect(api.getAll).toHaveBeenCalledWith(expect.objectContaining({ status: 3 })));
  });

  it("search is debounced (~350 ms) and sent to the API", async () => {
    wrap(<Projects />);
    await screen.findByText("Website Revamp");
    fireEvent.change(screen.getByPlaceholderText("Search projects..."), { target: { value: "Zenith" } });
    expect(api.getAll).not.toHaveBeenCalledWith(expect.objectContaining({ search: "Zenith" }));
    await waitFor(() => expect(api.getAll).toHaveBeenCalledWith(expect.objectContaining({ search: "Zenith" })), { timeout: 1500 });
  });

  it("page size offers 10 / 25 / 50 / 100 / All", async () => {
    wrap(<Projects />);
    await screen.findByText("Website Revamp");
    const sel = screen.getAllByTestId("select").find((s) => within(s).queryByText("100")) as HTMLSelectElement;
    expect(Array.from(sel.options).map((o) => o.value)).toEqual(["10", "25", "50", "100", "All"]);
  });

  it("Members column shows the project's real team (not a hard-coded 'TM +2')", async () => {
    wrap(<Projects />);
    const row = (await screen.findByText("Website Revamp")).closest("tr")!;
    expect(within(row).queryByText("TM")).toBeNull();
    expect(within(row).queryByText("+2")).toBeNull();
  });

  it("table has a Progress column (bar + %) per 19-projects.md section 3", async () => {
    wrap(<Projects />);
    await screen.findByText("Website Revamp");
    expect(screen.getByRole("columnheader", { name: /progress/i })).toBeInTheDocument();
  });

  it("Actions column is sticky on the right", async () => {
    wrap(<Projects />);
    await screen.findByText("Website Revamp");
    expect(screen.getByRole("columnheader", { name: "Actions" }).className).toMatch(/sticky.*right-0|right-0.*sticky/);
  });

  it("row Delete asks ONCE (AlertDialog only, no extra window.confirm) and calls delete once", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    wrap(<Projects />);
    const row = (await screen.findByText("Website Revamp")).closest("tr")!;
    fireEvent.click(within(row).getByTitle("Delete"));
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(api.del).toHaveBeenCalledTimes(1));
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("bulk Mass Delete sends one bulk-delete request with the selected ids and closes", async () => {
    wrap(<Projects />);
    const row = (await screen.findByText("Office Fitout")).closest("tr")!;
    fireEvent.click(within(row).getByRole("checkbox"));
    fireEvent.click(screen.getByText("Bulk Actions"));
    fireEvent.click(await screen.findByLabelText(/mass delete/i));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(api.bulkDelete).toHaveBeenCalledWith(["p2"]));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Confirm" })).toBeNull());
  });
});

// =============================================================================
describe("Projects page permissions", () => {
  it("staff with Projects → Create sees '+ New Project'", async () => {
    perm.current = staffWith({ "View(Global)": true, Create: true });
    wrap(<Projects />);
    await screen.findByText("Website Revamp");
    expect(screen.getByRole("button", { name: /new project/i })).toBeInTheDocument();
  });

  it("staff without Create does NOT see '+ New Project'", async () => {
    perm.current = staffWith({ "View(Global)": true });
    wrap(<Projects />);
    await screen.findByText("Website Revamp");
    expect(screen.queryByRole("button", { name: /new project/i })).toBeNull();
  });

  it("staff with View only has no Edit / Delete row actions", async () => {
    perm.current = staffWith({ "View(Global)": true });
    wrap(<Projects />);
    const row = (await screen.findByText("Website Revamp")).closest("tr")!;
    expect(within(row).queryByTitle("Edit")).toBeNull();
    expect(within(row).queryByTitle("Delete")).toBeNull();
  });
});

// =============================================================================
describe("ProjectCreate form", () => {
  const renderCreate = () => wrap(<ProjectCreate />, "/admin/projects/create?clientId=c1", "/admin/projects/create");
  const fill = (name: string, value: string) => {
    const el = document.querySelector(`input[name="${name}"]`) as HTMLInputElement;
    fireEvent.change(el, { target: { name, value } });
  };
  const submit = () => fireEvent.click(screen.getByRole("button", { name: /save project/i }));

  it("valid project → create called with name / clientid / team payload", async () => {
    renderCreate();
    fill("name", "New Build");
    submit();
    await waitFor(() => expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ name: "New Build", clientid: "c1" })));
  });

  it("empty name → error toast, no API call", async () => {
    renderCreate();
    submit();
    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
    expect(api.create).not.toHaveBeenCalled();
  });

  it("deadline before start date → blocked with an error, no API call", async () => {
    renderCreate();
    fill("name", "Bad dates");
    fill("start_date", "2026-12-10");
    fill("deadline", "2026-12-01");
    submit();
    await new Promise((r) => setTimeout(r, 50));
    expect(api.create).not.toHaveBeenCalled();
  });

  it("negative Total Rate (budget) → blocked, not silently turned into a negative cost", async () => {
    renderCreate();
    fill("name", "Neg budget");
    fill("project_cost", "-500");
    submit();
    await new Promise((r) => setTimeout(r, 50));
    expect(api.create).not.toHaveBeenCalled();
  });

  it("members picker loads from /staff/assignable (works for staff without Staff-module permission)", async () => {
    renderCreate();
    await waitFor(() => expect(api.staffAssignable).toHaveBeenCalled());
    expect(api.staffGetAll).not.toHaveBeenCalled();
  });
});

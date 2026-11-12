// SETUP — Unit + UI component tests: Setup > Staff list (pages/setup/SetupStaff.tsx),
// Setup > Roles & Permissions (pages/setup/SetupRolesLegacy.tsx, the default layout) and the
// helpers that gate Setup pages / persist sidebar reordering (lib/planModules, lib/sidebarReorder).
// Services mocked with backend-shaped data — no network. A failing test = a bug.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/components/layout/DashboardLayout", () => ({ DashboardLayout: ({ children }: any) => <div>{children}</div> }));
const toastSpy = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastSpy, toasts: [], dismiss: vi.fn() }), toast: toastSpy }));
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (orig) => ({ ...(await orig<typeof import("react-router-dom")>()), useNavigate: () => mockNavigate }));

let perm: any;
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => perm }));
vi.mock("@/context/PermissionContext", () => ({ usePermissionContext: () => perm }));

const api = vi.hoisted(() => ({
  getAll: vi.fn(), update: vi.fn(), delete: vi.fn(), import: vi.fn(),
  getRoles: vi.fn(), createRole: vi.fn(), updateRole: vi.fn(), deleteRole: vi.fn(),
}));
vi.mock("@/api/services/staff.service", () => ({ staffService: api }));
vi.mock("@/api/services/mainsidebar.service", () => ({ mainSidebarService: { getSidebarItems: vi.fn(async () => []) } }));

import SetupStaff from "../pages/setup/SetupStaff";
import SetupRolesLegacy from "../pages/setup/SetupRolesLegacy";
import { moduleForPath } from "@/lib/planModules";
import { computeReorderPayload } from "@/lib/sidebarReorder";

const ADMIN = { _id: "u-admin", firstname: "Ada", admin: true };
function setPerm({ admin = true, caps = {} as Record<string, Record<string, boolean>>, user = ADMIN } = {}) {
  perm = {
    user, isAdmin: admin, isStaff: !admin, permissions: caps,
    can: (f: string, c: string) => admin || caps[f]?.[c] === true,
    canView: (f: string) => admin || !!(caps[f]?.["View(Global)"] || caps[f]?.["View (Own)"]),
    isModuleEnabled: () => true,
  };
}
const STAFF = [
  { _id: "s1", firstname: "Riya", lastname: "Shah", email: "riya@t.local", role: { _id: "r1", name: "Sales Rep" }, active: true, last_login: null },
  { _id: "s2", firstname: "Karan", lastname: "Mehta", email: "karan@t.local", role: null, active: false },
  { _id: "u-staff", firstname: "Self", lastname: "User", email: "self@t.local", role: { _id: "r1", name: "Sales Rep" }, active: true },
];
const ROLES = [ // backend GET /api/roles shape — no staffCount field
  { _id: "r1", name: "Sales Rep", permissions: { Leads: { "View(Global)": true } }, default_modules: [{ module: "dashboard", permission: "" }] },
  { _id: "r2", name: "HRMS", permissions: {}, default_modules: [{ module: "dashboard", permission: "" }] },
];

const wrap = (ui: React.ReactElement) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
};

beforeEach(() => {
  vi.clearAllMocks();
  setPerm();
  api.getAll.mockResolvedValue(STAFF);
  api.update.mockResolvedValue({});
  api.delete.mockResolvedValue({});
  api.getRoles.mockResolvedValue(ROLES);
  api.createRole.mockResolvedValue({});
  api.updateRole.mockResolvedValue({});
  api.deleteRole.mockResolvedValue({});
});
afterEach(cleanup);

// ===================== Unit =====================
describe("[Unit] Setup page plan gating (lib/planModules.moduleForPath)", () => {
  it.each([
    ["/admin/setup/staff", null],
    ["/admin/setup/settings", null],
    ["/admin/setup/finance/currencies", null],
    ["/admin/setup/finance/tax-rates", "finance"],
    ["/admin/setup/finance/expense-categories", "expenses"],
    ["/admin/setup/support/departments", "support"],
    ["/admin/setup/leads/sources", "leads"],
    ["/staff/setup/contracts/contract-types", "contracts"],
    ["/admin/setup/quotation-types", "sales"],
  ])("%s → %s", (path, mod) => expect(moduleForPath(path)).toBe(mod));
});

describe("[Unit] sidebar reorder payload (lib/sidebarReorder.computeReorderPayload)", () => {
  const rows = [{ _id: "a", order: 3 }, { _id: "b", order: 7 }, { _id: "c", order: 9 }];
  it("moving the last item to the top reuses the section's own order numbers", () => {
    expect(computeReorderPayload(rows, 2, 0).payload).toEqual([{ id: "c", order: 3 }, { id: "a", order: 7 }, { id: "b", order: 9 }]);
  });
  it("no move → same orders", () => {
    expect(computeReorderPayload(rows, 1, 1).payload).toEqual([{ id: "a", order: 3 }, { id: "b", order: 7 }, { id: "c", order: 9 }]);
  });
});

// ===================== Setup > Staff =====================
describe("[UI] Setup > Staff list", () => {
  it("shows name, email, role (or 'No Role') and 'Never' for no login; never a password", async () => {
    const { container } = wrap(<SetupStaff />);
    expect(await screen.findByText("Riya Shah")).toBeInTheDocument();
    const row = screen.getByText("Karan Mehta").closest("tr") as HTMLElement;
    expect(within(row).getByText("No Role")).toBeInTheDocument();
    expect(within(row).getByText("Never")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/password|undefined|NaN/i);
  });
  it("search narrows the list to matching staff", async () => {
    wrap(<SetupStaff />);
    await screen.findByText("Riya Shah");
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "karan" } });
    await waitFor(() => expect(screen.queryByText("Riya Shah")).toBeNull());
    expect(screen.getByText("Karan Mehta")).toBeInTheDocument();
  });
  it("empty list → 'No records found.'", async () => {
    api.getAll.mockResolvedValue([]);
    wrap(<SetupStaff />);
    expect(await screen.findByText("No records found.")).toBeInTheDocument();
  });
  it("admin: Add / Import / Edit / Delete / Bulk Actions are offered", async () => {
    wrap(<SetupStaff />);
    await screen.findByText("Riya Shah");
    expect(screen.getByText("Add New Staff Member")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Edit").length).toBe(3);
    expect(screen.getAllByLabelText("Delete").length).toBe(3);
  });
  it("view-only staff: no Add / Import / Edit / Delete / Bulk Actions, Active switches disabled", async () => {
    setPerm({ admin: false, caps: { Staff: { "View(Global)": true } }, user: { _id: "u-staff", firstname: "Self", admin: false } as any });
    wrap(<SetupStaff />);
    await screen.findByText("Riya Shah");
    expect(screen.queryByText("Add New Staff Member")).toBeNull();
    expect(screen.queryByText("Import")).toBeNull();
    expect(screen.queryAllByLabelText("Edit").length).toBe(0);
    expect(screen.queryAllByLabelText("Delete").length).toBe(0);
    expect(screen.queryByText("Bulk Actions")).toBeNull();
    screen.getAllByRole("switch").forEach((s) => expect(s).toBeDisabled());
  });
  it("Add New Staff Member opens /admin/setup/staff/new; Edit opens the row's id", async () => {
    wrap(<SetupStaff />);
    await screen.findByText("Riya Shah");
    fireEvent.click(screen.getByText("Add New Staff Member"));
    expect(mockNavigate).toHaveBeenCalledWith("/admin/setup/staff/new");
    fireEvent.click(within(screen.getByText("Karan Mehta").closest("tr") as HTMLElement).getByLabelText("Edit"));
    expect(mockNavigate).toHaveBeenCalledWith("/admin/setup/staff/s2");
  });
  it("Active switch sends {active:false} for the right staff member", async () => {
    wrap(<SetupStaff />);
    const row = (await screen.findByText("Riya Shah")).closest("tr") as HTMLElement;
    fireEvent.click(within(row).getByRole("switch"));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith("s1", { active: false }));
  });
  it("delete asks ONCE and deletes only after OK; Cancel deletes nothing", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    wrap(<SetupStaff />);
    const row = (await screen.findByText("Karan Mehta")).closest("tr") as HTMLElement;
    fireEvent.click(within(row).getByLabelText("Delete"));
    expect(api.delete).not.toHaveBeenCalled();
    fireEvent.click(within(row).getByLabelText("Delete"));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("s2"));
    expect(confirm).toHaveBeenCalledTimes(2);
  });
  it("a refused delete (API 400 'You cannot delete your own account') shows an error toast", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.delete.mockRejectedValue({ response: { status: 400, data: { message: "You cannot delete your own account" } }, message: "Request failed" });
    wrap(<SetupStaff />);
    const row = (await screen.findByText("Riya Shah")).closest("tr") as HTMLElement;
    fireEvent.click(within(row).getByLabelText("Delete"));
    await waitFor(() => expect(api.delete).toHaveBeenCalled());
    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" })));
  });
  it("a refused Active toggle (API 403) shows an error toast instead of silently failing", async () => {
    api.update.mockRejectedValue({ response: { status: 403, data: { message: "Forbidden" } }, message: "Forbidden" });
    wrap(<SetupStaff />);
    const row = (await screen.findByText("Riya Shah")).closest("tr") as HTMLElement;
    fireEvent.click(within(row).getByRole("switch"));
    await waitFor(() => expect(api.update).toHaveBeenCalled());
    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" })));
  });
  it("a non-admin with Staff Edit cannot toggle their OWN Active switch (the API ignores it, so the UI must not offer it)", async () => {
    setPerm({ admin: false, caps: { Staff: { "View(Global)": true, Edit: true, Delete: true } }, user: { _id: "u-staff", firstname: "Self", admin: false } as any });
    wrap(<SetupStaff />);
    const own = (await screen.findByText("Self User")).closest("tr") as HTMLElement;
    expect(within(own).getByRole("switch")).toBeDisabled();
    expect(within(own).queryByLabelText("Delete")).toBeNull();
  });
});

// ===================== Setup > Roles =====================
describe("[UI] Setup > Roles & Permissions", () => {
  it("lists the roles with how many staff use each (a number, never blank)", async () => {
    wrap(<SetupRolesLegacy />);
    const name = await screen.findByText("Sales Rep");
    expect(name.parentElement?.textContent).toMatch(/Total Users: \d+/);
  });
  it("Add New Role → form with required Role Name; empty name shows an error and saves nothing", async () => {
    wrap(<SetupRolesLegacy />);
    fireEvent.click(await screen.findByText("Add New Role"));
    expect(await screen.findByPlaceholderText("Enter role name")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /Save/ })[0]);
    expect(api.createRole).not.toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
  });
  it("a role name of only spaces is refused on the form (not sent to the API)", async () => {
    wrap(<SetupRolesLegacy />);
    fireEvent.click(await screen.findByText("Add New Role"));
    fireEvent.change(await screen.findByPlaceholderText("Enter role name"), { target: { value: "    " } });
    fireEvent.click(screen.getAllByRole("button", { name: /Save/ })[0]);
    await new Promise((r) => setTimeout(r, 20));
    expect(api.createRole).not.toHaveBeenCalled();
  });
  it("valid name → createRole called with that name", async () => {
    wrap(<SetupRolesLegacy />);
    fireEvent.click(await screen.findByText("Add New Role"));
    fireEvent.change(await screen.findByPlaceholderText("Enter role name"), { target: { value: "Accountant" } });
    fireEvent.click(screen.getAllByRole("button", { name: /Save/ })[0]);
    await waitFor(() => expect(api.createRole).toHaveBeenCalled());
    expect(api.createRole.mock.calls[0][0].name).toBe("Accountant");
  });
  it("view-only staff: no Add / Edit / Delete and no Bulk Actions (bulk delete of roles)", async () => {
    setPerm({ admin: false, caps: { "Staff Roles": { "View(Global)": true } }, user: { _id: "u-staff", firstname: "V", admin: false } as any });
    wrap(<SetupRolesLegacy />);
    await screen.findByText("Sales Rep");
    expect(screen.queryByText("Add New Role")).toBeNull();
    expect(screen.queryAllByLabelText("Delete").length).toBe(0);
    expect(screen.queryByText("Bulk Actions")).toBeNull();
  });
  it("delete role asks once; OK → deleteRole(id)", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    wrap(<SetupRolesLegacy />);
    const row = (await screen.findByText("HRMS")).closest("tr") as HTMLElement;
    fireEvent.click(within(row).getByLabelText("Delete"));
    await waitFor(() => expect(api.deleteRole).toHaveBeenCalledWith("r2"));
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});

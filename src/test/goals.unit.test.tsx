// Goals module — frontend unit/component tests (Goals.tsx, GoalCreate.tsx), 05-goals.md section 1.
// Each test states the CORRECT behaviour; a failure = a bug.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import fs from "fs";
import path from "path";
import React from "react";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const goalService = vi.hoisted(() => ({
  getGoals: vi.fn(), getGoalOptions: vi.fn(async () => ({ staff: [{ _id: "s1", firstname: "Pick", lastname: "One" }], contractTypes: [] })), getGoalById: vi.fn(), createGoal: vi.fn(), updateGoal: vi.fn(), deleteGoal: vi.fn(),
}));
const exportProps = vi.hoisted(() => ({ last: null as any }));

vi.mock("sonner", () => ({ toast }));
vi.mock("@/services/goal.service", () => ({ goalService }));
vi.mock("@/api/client", () => ({ apiClient: { get: vi.fn(async () => [{ _id: "s1", firstname: "Pick", lastname: "One" }]) } }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock("@/components/layout/DashboardLayout", () => ({ DashboardLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/ui/export-button", () => ({
  ExportButton: (p: any) => { exportProps.last = p; return <button>Export</button>; },
}));

import Goals from "@/pages/Goals";
import GoalCreate from "@/pages/GoalCreate";

const SRC = path.resolve(__dirname, "..");
// useMutation calls the service on a later tick — wait before asserting "not called".
const settle = () => new Promise((r) => setTimeout(r, 100));
const read = (p: string) => fs.readFileSync(path.join(SRC, p), "utf8");

const renderAt = (url: string, el: React.ReactNode, routePath: string) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes><Route path={routePath} element={el} /><Route path="*" element={<div>other page</div>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const fullGoal = {
  _id: "g1", subject: "Q4 revenue", goal_type: "total_income", staff_member: { _id: "s1", firstname: "Pick", lastname: "One" },
  achievement: "50000", start_date: "2026-11-01T00:00:00.000Z", end_date: "2026-12-31T00:00:00.000Z", description: "d",
  notify_on_achieve: true, notify_on_fail: true, progress: 0,
};

const mkGoals = (n: number) => Array.from({ length: n }, (_, i) => ({
  ...fullGoal, _id: `g${i + 1}`, subject: `Goal ${String(i + 1).padStart(2, "0")}`,
  goal_type: i % 2 ? "convert_leads" : "total_income", progress: i,
}));

beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);

// ---------------------------------------------------------------- GoalCreate
describe("GoalCreate — handleSave validation", () => {
  const openEdit = async (goal: any) => {
    goalService.getGoalById.mockResolvedValue(goal);
    goalService.updateGoal.mockResolvedValue(goal);
    renderAt("/admin/goals/edit/g1", <GoalCreate />, "/admin/goals/edit/:id");
    await screen.findByText("Update Goal");
  };

  it("new form: Save with everything empty → 'Please fill in all required fields', no API call", async () => {
    renderAt("/admin/goals/new", <GoalCreate />, "/admin/goals/new");
    fireEvent.click(await screen.findByText("Save Goal"));
    await settle();
    expect(toast.error).toHaveBeenCalledWith("Please fill in all required fields");
    expect(goalService.createGoal).not.toHaveBeenCalled();
  });

  it.each(["subject", "goal_type", "staff_member", "achievement", "start_date", "end_date"])(
    "missing %s → 'Please fill in all required fields', no API call", async (field) => {
      await openEdit({ ...fullGoal, [field]: field === "staff_member" ? null : "" });
      fireEvent.click(screen.getByText("Update Goal"));
      await settle();
      expect(toast.error).toHaveBeenCalledWith("Please fill in all required fields");
      expect(goalService.updateGoal).not.toHaveBeenCalled();
    });

  it("subject of only spaces is rejected (no API call)", async () => {
    await openEdit({ ...fullGoal, subject: "   " });
    fireEvent.click(screen.getByText("Update Goal"));
    await settle();
    expect(goalService.updateGoal).not.toHaveBeenCalled();
  });

  it("end date before start date is rejected (no API call)", async () => {
    await openEdit({ ...fullGoal, start_date: "2026-12-31T00:00:00.000Z", end_date: "2026-11-01T00:00:00.000Z" });
    fireEvent.click(screen.getByText("Update Goal"));
    await settle();
    expect(goalService.updateGoal).not.toHaveBeenCalled();
  });

  it("negative achievement is rejected (no API call)", async () => {
    await openEdit({ ...fullGoal, achievement: "-100" });
    fireEvent.click(screen.getByText("Update Goal"));
    await settle();
    expect(goalService.updateGoal).not.toHaveBeenCalled();
  });

  it("valid edit → updateGoal payload, toast 'Goal updated successfully', back to /admin/goals", async () => {
    await openEdit(fullGoal);
    fireEvent.click(screen.getByText("Update Goal"));
    await waitFor(() => expect(goalService.updateGoal).toHaveBeenCalled());
    expect(goalService.updateGoal.mock.calls[0][1]).toEqual({
      subject: "Q4 revenue", goal_type: "total_income", staff_member: "s1", achievement: "50000",
      start_date: "2026-11-01", end_date: "2026-12-31", description: "d", notify_on_achieve: true, notify_on_fail: true,
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Goal updated successfully"));
    expect(await screen.findByText("other page")).toBeTruthy();
  });

  it("API error → toast shows the server message (not a generic Axios text)", async () => {
    goalService.getGoalById.mockResolvedValue(fullGoal);
    goalService.updateGoal.mockRejectedValue(new Error("Goal not found"));
    renderAt("/admin/goals/edit/g1", <GoalCreate />, "/admin/goals/edit/:id");
    fireEvent.click(await screen.findByText("Update Goal"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Goal not found"));
  });
});

describe("GoalCreate — edit load mapping", () => {
  it("staff_member object → id, dates → yyyy-MM-dd, achievement → string, notify flags default true", async () => {
    goalService.getGoalById.mockResolvedValue({ ...fullGoal, achievement: 1500, notify_on_achieve: undefined, notify_on_fail: undefined });
    goalService.updateGoal.mockResolvedValue({});
    renderAt("/admin/goals/edit/g1", <GoalCreate />, "/admin/goals/edit/:id");
    fireEvent.click(await screen.findByText("Update Goal"));
    await waitFor(() => expect(goalService.updateGoal).toHaveBeenCalled());
    expect(goalService.updateGoal.mock.calls[0][1]).toMatchObject({
      staff_member: "s1", start_date: "2026-11-01", end_date: "2026-12-31", achievement: "1500", notify_on_achieve: true, notify_on_fail: true,
    });
  });

  it("date stored at local (IST) midnight loads as the same calendar day", async () => {
    // 2026-11-01 00:00 IST = 2026-10-31T18:30Z; toISOString().split('T')[0] gives 2026-10-31.
    goalService.getGoalById.mockResolvedValue({ ...fullGoal, start_date: "2026-10-31T18:30:00.000Z" });
    goalService.updateGoal.mockResolvedValue({});
    renderAt("/admin/goals/edit/g1", <GoalCreate />, "/admin/goals/edit/:id");
    fireEvent.click(await screen.findByText("Update Goal"));
    await waitFor(() => expect(goalService.updateGoal).toHaveBeenCalled());
    expect(goalService.updateGoal.mock.calls[0][1].start_date).toBe("2026-11-01");
  });
});

describe("GoalCreate — source checks", () => {
  const src = read("pages/GoalCreate.tsx");
  it("the 8 goal types have distinct labels", () => {
    const labels = [...read("lib/goalTypes.ts").matchAll(/value: "(\w+)", label: "([^"]+)"/g)].map((m) => m[2]);
    expect(labels).toHaveLength(8);
    expect(new Set(labels).size).toBe(8);
  });
  it("contract goal types have a Contract Type field (contract_type sent)", () => {
    expect(src).toMatch(/contract_type/);
  });
  it("after-save / back navigation respects the /staff base path", () => {
    expect(src).not.toMatch(/navigate\("\/admin\/goals"\)/);
  });
  it("uses can() permission checks", () => expect(src).toMatch(/\bcan\(/));
});

// ---------------------------------------------------------------- Goals list
describe("Goals list", () => {
  const openList = async (goals: any[]) => {
    goalService.getGoals.mockResolvedValue(goals);
    renderAt("/admin/goals", <Goals />, "/admin/goals");
  };
  const rows = () => screen.queryAllByText(/^Goal \d\d$/);

  it("default page size 25 shows the first 25 of 30", async () => {
    await openList(mkGoals(30));
    await screen.findByText("Goal 01");
    expect(rows()).toHaveLength(25);
  });

  it("goals after the page size can be reached (pagination / next page exists)", async () => {
    await openList(mkGoals(30));
    await screen.findByText("Goal 01");
    const nav = screen.queryAllByRole("button", { name: /next|›|»|2/i });
    expect(nav.length).toBeGreaterThan(0);
  });

  it("search matches subject case-insensitively", async () => {
    await openList(mkGoals(30));
    await screen.findByText("Goal 01");
    fireEvent.change(screen.getByPlaceholderText("Search goals..."), { target: { value: "gOaL 07" } });
    expect(rows().map((e) => e.textContent)).toEqual(["Goal 07"]);
  });

  it("search matches goal_type value ('convert_leads')", async () => {
    await openList(mkGoals(10));
    await screen.findByText("Goal 01");
    fireEvent.change(screen.getByPlaceholderText("Search goals..."), { target: { value: "convert_leads" } });
    expect(rows()).toHaveLength(5);
  });

  it("search matches the goal-type label shown in the form ('Achieve Total Income')", async () => {
    await openList(mkGoals(10));
    await screen.findByText("Goal 01");
    fireEvent.change(screen.getByPlaceholderText("Search goals..."), { target: { value: "Achieve Total Income" } });
    expect(rows()).toHaveLength(5);
  });

  it("table shows the goal-type label, not the raw value", async () => {
    await openList(mkGoals(2));
    await screen.findByText("Goal 01");
    expect(screen.queryByText("total_income")).toBeNull();
  });

  it("a goal with a missing start_date does not crash the page", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let crashed = false;
    try {
      await openList([{ ...fullGoal, start_date: undefined }]);
      await screen.findByText("Q4 revenue");
    } catch { crashed = true; }
    spy.mockRestore();
    expect(crashed).toBe(false);
  });

  it("export columns: Subject, Staff Member, Achievement, Start Date, End Date, Goal Type, Progress (with %)", async () => {
    await openList(mkGoals(3));
    await screen.findByText("Goal 01");
    const cols = exportProps.last.columns;
    expect(cols.map((c: any) => c.header)).toEqual(["Subject", "Staff Member", "Achievement", "Start Date", "End Date", "Goal Type", "Progress"]);
    const g = mkGoals(3)[2];
    expect(cols[1].key(g)).toBe("Pick One");
    expect(cols[3].key(g)).toBe("2026-11-01");
    expect(cols[6].key(g)).toBe("2%");
  });

  it("Bulk Actions with nothing selected → 'Please select at least one goal first.'", async () => {
    await openList(mkGoals(3));
    await screen.findByText("Goal 01");
    fireEvent.click(screen.getByText("Bulk Actions"));
    expect(toast.error).toHaveBeenCalledWith("Please select at least one goal first.");
  });

  it("uses can() permission checks for New Goal / Edit / Delete / Bulk", () => {
    expect(read("pages/Goals.tsx")).toMatch(/\bcan\(/);
  });
  it("New Goal / Edit links respect the /staff base path", () => {
    expect(read("pages/Goals.tsx")).not.toMatch(/navigate\(["`]\/admin\/goals/);
  });
});

describe("Permission keys (Setup > Staff / Roles) for Goals", () => {
  it.each(["pages/setup/SetupStaffForm.tsx", "pages/setup/SetupRolesNew.tsx", "pages/setup/SetupRolesLegacy.tsx", "hrms/pages/staff/StaffFormPage.tsx"])(
    "%s saves exactly View(Global), Create, Edit, Delete", (f) => {
      expect(read(f)).toContain('{ name: "Goals", caps: ["View(Global)", "Create", "Edit", "Delete"] }');
    });
});

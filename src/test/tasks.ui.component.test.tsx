// Tasks — UI COMPONENT tests (30-master section 4.2 "UI components", 08-tasks.md sections 3, 4, 7).
// Renders the REAL Tasks page / TasksKanban / InquiryOutcomeDialog with the API services mocked
// (no network, no live :5001 / :5183). Radix Select and SearchableSelect are swapped for native
// elements so jsdom can drive them. Each test states the CORRECT behaviour; failing = bug.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor, within, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------- mocks ----------
const toastSpy = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastSpy }), toast: (...a: any[]) => toastSpy(...a) }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("@/components/layout/DashboardLayout", () => ({ DashboardLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/tasks/TaskViewModal", () => ({
  TaskViewModal: ({ isOpen, task }: any) => (isOpen ? <div data-testid="task-view-modal">{task?.name}</div> : null),
}));
vi.mock("@/components/tasks/TaskVoiceNotes", () => ({ InlineVoiceRecorder: () => null, AttachedVoicePreview: () => null }));
vi.mock("@/components/shared/RichTextEditor", () => ({ RichTextEditor: () => <textarea aria-label="description" /> }));
vi.mock("@/context/SettingsContext", () => ({ useSettings: () => ({ getSetting: (_k: string, d: any) => d, settings: {} }) }));

// Native stand-ins for Radix Select / SearchableSelect.
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
  getTasks: vi.fn(),
  taskUpdate: vi.fn(),
  taskDelete: vi.fn(),
  taskCreate: vi.fn(),
  getAssignable: vi.fn(),
}));
vi.mock("@/api/services/project.service", () => ({ projectService: { getTasks: api.getTasks, getAll: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/api/services/task.service", () => ({
  taskService: { update: api.taskUpdate, delete: api.taskDelete, create: api.taskCreate, importTasks: vi.fn(), getAll: vi.fn() },
}));
vi.mock("@/api/services/utility.service", () => ({ utilityService: { getTodos: vi.fn().mockResolvedValue([]), deleteTodo: vi.fn(), updateTodo: vi.fn() } }));
vi.mock("@/api/services/staff.service", () => ({ staffService: { getAssignable: api.getAssignable } }));
vi.mock("@/api/services/customer.service", () => ({ customerService: { getAll: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/api/services/file.service", () => ({ fileService: {} }));
vi.mock("@/hrms/services/hrmsbranchService", () => ({ hrmsbranchService: { getAll: vi.fn().mockResolvedValue({ data: [] }) } }));

import Tasks, { taskStatusConfig } from "@/pages/Tasks";
import { TasksKanban } from "@/pages/TasksKanban";
import { InquiryOutcomeDialog } from "@/components/tasks/InquiryOutcomeDialog";
import { TooltipProvider } from "@/components/ui/tooltip";

// ---------- data ----------
const ME = "000000000000000000000001";
const OTHER = "000000000000000000000002";
const STAFF = [
  { _id: ME, firstname: "Meera", lastname: "Staff", active: true },
  { _id: OTHER, firstname: "Ravi", lastname: "Kumar", active: true },
  { _id: "000000000000000000000003", firstname: "Ina", lastname: "Gone", active: false },
];
const TASKS = [
  { _id: "t1", name: "My own task", status: 1, priority: 2, category: "To-Do", assignees: [ME], created_by: ME },
  { _id: "t2", name: "Ravi's task", status: 2, priority: 3, category: "Visit", assignees: [OTHER], created_by: OTHER },
  { _id: "t3", name: "Inquiry deal", status: 2, priority: 2, category: "Inquiry", assignees: [OTHER], created_by: OTHER },
];
const page = (rows = TASKS) => ({
  data: rows, total: rows.length, page: 1, pages: 1, limit: 25,
  statusCounts: [{ status: 1, count: 1 }, { status: 2, count: 2 }],
});

const ADMIN = { user: { _id: "admin", email: "a@x.test", admin: true }, isAdmin: true, isStaff: false, can: () => true, isModuleEnabled: () => true };
const staffWith = (caps: Record<string, boolean>) => ({
  user: { _id: ME, email: "s@x.test", role: { name: "Sales" } },
  isAdmin: false, isStaff: true,
  can: (f: string, c: string) => f === "Tasks" && !!caps[c],
  isModuleEnabled: () => true,
});

const renderTasks = (url = "/admin/tasks") => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[url]}><Tasks /></MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  perm.current = ADMIN;
  api.getTasks.mockReset().mockResolvedValue(page());
  api.getAssignable.mockReset().mockResolvedValue(STAFF);
  api.taskUpdate.mockReset().mockResolvedValue({});
  api.taskDelete.mockReset().mockResolvedValue({});
  toastSpy.mockReset();
});
afterEach(() => cleanup());

// =============================================================================
describe("Tasks list page — render, controls, filters", () => {
  it("renders header, Tasks Overview link and all rows", async () => {
    renderTasks();
    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tasks Overview" })).toHaveAttribute("href", "/admin/tasks/overview");
    for (const t of TASKS) expect(await screen.findByText(t.name)).toBeInTheDocument();
  });

  it("Bulk Actions button renders its Zap icon (no ReferenceError — suspected bug 3)", async () => {
    renderTasks();
    expect(await screen.findByText("Bulk Actions")).toBeInTheDocument();
  });

  it("5 status cards with server statusCounts", async () => {
    renderTasks();
    await screen.findByText("My own task");
    for (const s of taskStatusConfig) expect(screen.getAllByText(s.label).length).toBeGreaterThan(0);
  });

  it("page size offers 10 / 25 / 50 / 100 / All", async () => {
    renderTasks();
    await screen.findByText("My own task");
    const sizeSelect = screen.getAllByTestId("select").find((s) => within(s).queryByText("All") && within(s).queryByText("100"))!;
    expect(Array.from((sizeSelect as HTMLSelectElement).options).map((o) => o.value)).toEqual(["10", "25", "50", "100", "All"]);
  });

  it("category filter → API called with category=Visit", async () => {
    renderTasks();
    await screen.findByText("My own task");
    const cat = screen.getAllByTestId("select").find((s) => within(s).queryByText("All Categories"))!;
    fireEvent.change(cat, { target: { value: "Visit" } });
    await waitFor(() => expect(api.getTasks).toHaveBeenCalledWith(expect.objectContaining({ category: "Visit" })));
  });

  it("search is debounced (~350 ms): no API call with the text immediately, one after the delay", async () => {
    renderTasks();
    await screen.findByText("My own task");
    fireEvent.change(screen.getByPlaceholderText("Search tasks..."), { target: { value: "Ravi" } });
    expect(api.getTasks).not.toHaveBeenCalledWith(expect.objectContaining({ search: "Ravi" }));
    await waitFor(() => expect(api.getTasks).toHaveBeenCalledWith(expect.objectContaining({ search: "Ravi" })), { timeout: 1500 });
  });

  it("Clear Filters appears with a filter and resets search + category in one click", async () => {
    renderTasks();
    await screen.findByText("My own task");
    fireEvent.change(screen.getByPlaceholderText("Search tasks..."), { target: { value: "abc" } });
    const clear = await screen.findByText("Clear Filters");
    fireEvent.click(clear);
    expect((screen.getByPlaceholderText("Search tasks...") as HTMLInputElement).value).toBe("");
    expect(screen.queryByText("Clear Filters")).not.toBeInTheDocument();
  });

  it("Actions column is sticky on the right (header + cells)", async () => {
    renderTasks();
    await screen.findByText("My own task");
    expect(screen.getByText("Actions").className).toMatch(/sticky/);
    expect(screen.getByText("Actions").className).toMatch(/right-0/);
  });

  it("clicking a task name opens the Task View modal", async () => {
    renderTasks();
    fireEvent.click(await screen.findByText("Ravi's task"));
    expect(screen.getByTestId("task-view-modal")).toHaveTextContent("Ravi's task");
  });
});

// =============================================================================
describe("New Task modal", () => {
  it("?new=1 opens the 'Add new task' modal", async () => {
    renderTasks("/admin/tasks?new=1");
    expect(await screen.findByText("Add new task")).toBeInTheDocument();
  });

  it("Related To offers entity types only — not work locations home/office/field (suspected bug 1)", async () => {
    renderTasks("/admin/tasks?new=1");
    await screen.findByText("Add new task");
    const rel = screen.getAllByTestId("select").find((s) => within(s).queryByText("Nothing Selected"))!;
    const values = Array.from((rel as HTMLSelectElement).options).map((o) => o.value);
    expect(values).not.toEqual(expect.arrayContaining(["home"]));
    expect(values).not.toContain("office");
    expect(values).not.toContain("field");
  });

  it("every Related To option is accepted by the API (Task.rel_type enum)", async () => {
    // Mirror of CRM-BACKEND/src/models/Task.js rel_type enum, minus the work-location values.
    const backendEnum = ["project", "lead", "customer", "invoice", "estimate", "contract", "proposal", "ticket", "expense"];
    renderTasks("/admin/tasks?new=1");
    await screen.findByText("Add new task");
    const rel = screen.getAllByTestId("select").find((s) => within(s).queryByText("Nothing Selected"))!;
    const offered = Array.from((rel as HTMLSelectElement).options).map((o) => o.value).filter((v) => v !== "none");
    expect(offered.filter((v) => !backendEnum.includes(v))).toEqual([]);
  });

  it("Save with empty Subject → error toast, no API call", async () => {
    renderTasks("/admin/tasks?new=1");
    await screen.findByText("Add new task");
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ description: "Subject and Start Date are required fields" }));
    expect(api.taskCreate).not.toHaveBeenCalled();
  });

  it("assignee / follower pickers do NOT offer inactive staff (suspected bug 5)", async () => {
    renderTasks("/admin/tasks?new=1");
    await screen.findByText("Add new task");
    await waitFor(() => expect(within(screen.getByTestId("ss-Select Assignees")).getByText("Ravi Kumar")).toBeInTheDocument());
    expect(within(screen.getByTestId("ss-Select Assignees")).queryByText("Ina Gone")).toBeNull();
    expect(within(screen.getByTestId("ss-Select Followers")).queryByText("Ina Gone")).toBeNull();
  });
});

// =============================================================================
describe("Inline edits, Inquiry outcome, delete, bulk", () => {
  const statusSelectOf = (row: HTMLElement) =>
    within(row).getAllByTestId("select").find((s) => within(s).queryByText("Awaiting Feedback")) as HTMLSelectElement;

  it("inline status change on a normal task → PUT { status }", async () => {
    renderTasks();
    const row = (await screen.findByText("Ravi's task")).closest("tr")!;
    fireEvent.change(statusSelectOf(row), { target: { value: "3" } });
    await waitFor(() => expect(api.taskUpdate).toHaveBeenCalledWith("t2", { status: 3 }));
  });

  it("inline Inquiry → Complete opens Won/Lost dialog and does NOT save yet (suspected bug 6)", async () => {
    renderTasks();
    const row = (await screen.findByText("Inquiry deal")).closest("tr")!;
    fireEvent.change(statusSelectOf(row), { target: { value: "5" } });
    expect(await screen.findByText("Inquiry Outcome")).toBeInTheDocument();
    expect(api.taskUpdate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /won/i }));
    await waitFor(() => expect(api.taskUpdate).toHaveBeenCalledWith("t3", { status: 5, inquiry_outcome: "Won" }));
  });

  it("row delete asks ONCE (single AlertDialog, no extra window.confirm) and deletes once (suspected bug 4)", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderTasks();
    const row = (await screen.findByText("Ravi's task")).closest("tr")!;
    fireEvent.click(within(row).getByTitle("Delete"));
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(api.taskDelete).toHaveBeenCalledTimes(1));
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("bulk Mass Delete: deletes selected, closes dialog, no false 'Please select an action' warning (suspected bug 2)", async () => {
    renderTasks();
    const row = (await screen.findByText("Ravi's task")).closest("tr")!;
    fireEvent.click(within(row).getByRole("checkbox"));
    fireEvent.click(screen.getByText("Bulk Actions"));
    fireEvent.click(await screen.findByLabelText("Mass Delete"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(api.taskDelete).toHaveBeenCalledWith("t2"));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Confirm" })).toBeNull());
    expect(toastSpy).not.toHaveBeenCalledWith(expect.objectContaining({ description: "Please select an action or field to update." }));
  });

  it("bulk dialog with nothing chosen → warning toast, no API call", async () => {
    renderTasks();
    const row = (await screen.findByText("Ravi's task")).closest("tr")!;
    fireEvent.click(within(row).getByRole("checkbox"));
    fireEvent.click(screen.getByText("Bulk Actions"));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ description: "Please select an action or field to update." })));
    expect(api.taskUpdate).not.toHaveBeenCalled();
    expect(api.taskDelete).not.toHaveBeenCalled();
  });
});

// =============================================================================
describe("Permissions on the Tasks page", () => {
  it("staff with View(Global) sees ALL tasks the API returned (not only their own)", async () => {
    perm.current = staffWith({ "View(Global)": true, Create: true, Edit: true, Delete: true });
    renderTasks();
    expect(await screen.findByText("My own task")).toBeInTheDocument();
    expect(screen.queryByText("Ravi's task")).toBeInTheDocument();
  });

  it("staff WITHOUT Tasks Create does not get the '+ New Task' button", async () => {
    perm.current = staffWith({ "View(Global)": true });
    renderTasks();
    await screen.findByText("My own task");
    expect(screen.queryByRole("button", { name: /new task/i })).toBeNull();
  });

  it("staff WITHOUT Tasks Delete has no row Delete action", async () => {
    perm.current = staffWith({ "View(Global)": true });
    renderTasks();
    const row = (await screen.findByText("My own task")).closest("tr")!;
    expect(within(row).queryByTitle("Delete")).toBeNull();
  });
});

// =============================================================================
describe("List ↔ Kanban", () => {
  it("view switch button toggles to the 5-column kanban", async () => {
    renderTasks();
    await screen.findByText("My own task");
    fireEvent.click(screen.getByLabelText("Switch to Kanban view"));
    expect(await screen.findByLabelText("Switch to List view")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search tasks...")).toBeNull();
  });

  it("TasksKanban renders the 5 status columns with counts and cards", () => {
    const tasks = TASKS.map((t) => ({ ...t, displayStatus: t.status, displayPriority: t.priority, isTodo: false }));
    render(<TasksKanban tasks={tasks as any} staff={STAFF} isLoading={false} onOpenTask={vi.fn()} onStatusChange={vi.fn()} />);
    for (const s of taskStatusConfig) expect(screen.getByText(s.label)).toBeInTheDocument();
    expect(screen.getByText("Inquiry deal")).toBeInTheDocument();
    expect(screen.getAllByText("No tasks").length).toBe(3);
  });

  it("TasksKanban empty → 'No tasks found'", () => {
    render(<TasksKanban tasks={[]} staff={[]} isLoading={false} onOpenTask={vi.fn()} onStatusChange={vi.fn()} />);
    expect(screen.getByText("No tasks found")).toBeInTheDocument();
  });

  it("InquiryOutcomeDialog: Won / Lost / Cancel callbacks", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<InquiryOutcomeDialog isOpen onClose={onClose} taskName="Deal X" onSelect={onSelect} />);
    expect(screen.getByText(/"Deal X" is an Inquiry/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /lost/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onSelect).toHaveBeenCalledWith("Lost");
    expect(onClose).toHaveBeenCalled();
  });
});

// =============================================================================
describe("task.service ↔ API routes", () => {
  it("every taskService method maps to an existing backend route (no PATCH /tasks/:id/status route exists)", async () => {
    const actual: any = await vi.importActual("@/api/services/task.service");
    // Backend task_routes.js: GET/POST /, POST /import, GET/PUT/DELETE /:id.
    expect(Object.keys(actual.taskService)).not.toContain("updateStatus");
  });
});

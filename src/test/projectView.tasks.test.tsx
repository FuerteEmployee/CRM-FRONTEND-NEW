// Project > View > Tasks tab, and the "Created at … by <name>" line in the task popup.
// API services are mocked (no network). Radix Select is swapped for a native <select>.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";

const toastSpy = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastSpy }), toast: (...a: any[]) => toastSpy(...a) }));
vi.mock("@/context/SettingsContext", () => ({ useSettings: () => ({ getSetting: (_k: string, d: any) => d, settings: {} }) }));
vi.mock("@/context/CurrencyContext", () => ({ useCurrency: () => ({ symbol: "₹" }) }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ user: { _id: "me" }, isAdmin: true, isModuleEnabled: () => true }),
}));
vi.mock("@/lib/reminderSettings", () => ({
  useReminderSettings: () => ({ defaultStaff: () => "", moduleOn: () => true }),
}));
vi.mock("@/components/reminders/ReminderQuickFill", () => ({ ReminderQuickTimes: () => null, ReminderReadyText: () => null }));
vi.mock("@/components/tasks/TaskVoiceNotes", () => ({ TaskVoiceNotes: () => null, isAudioFile: () => false }));
vi.mock("@/components/shared/RichTextEditor", () => ({ RichTextEditor: () => <textarea aria-label="description" /> }));
vi.mock("@/components/ui/select", () => {
  const Select = ({ value, onValueChange, children }: any) => (
    <select data-testid="status-select" value={value} onChange={(e) => onValueChange?.(e.target.value)}>{children}</select>
  );
  const Pass = ({ children }: any) => <>{children}</>;
  const Nothing = () => null;
  const SelectItem = ({ value, children }: any) => <option value={value}>{children}</option>;
  return { Select, SelectContent: Pass, SelectItem, SelectTrigger: Nothing, SelectValue: Nothing };
});

const api = vi.hoisted(() => ({ getAll: vi.fn(), update: vi.fn() }));
vi.mock("@/api/services/task.service", () => ({ taskService: { getAll: api.getAll, update: api.update } }));
vi.mock("@/api/services/time_entry.service", () => ({ timeEntryService: { getTimeEntries: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/api/services/reminder.service", () => ({ reminderService: { getReminders: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/api/services/file.service", () => ({ fileService: { getFiles: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/api/services/utility.service", () => ({ utilityService: {} }));

import { ProjectTasksTab } from "@/components/projects/ProjectTabs";
import { TaskViewModal } from "@/components/tasks/TaskViewModal";

const STAFF = [
  { _id: "s1", firstname: "Tirth", lastname: "Patel" },
  { _id: "s2", firstname: "Ravi", lastname: "Kumar" },
];

// Mirrors how ProjectView loads tasks: key starts with "tasks".
function Harness() {
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["tasks", "project", "p1"], queryFn: () => api.getAll() });
  return <ProjectTasksTab tasks={data} isLoading={isLoading} staff={STAFF} />;
}

const renderWithClient = (ui: React.ReactElement) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

let serverTasks: any[];
beforeEach(() => {
  serverTasks = [
    { _id: "t1", name: "Design homepage", status: 2, priority: 3, assignees: ["s2"], created_by: "s1", created_by_name: "Tirth Patel", rel_id: "p1", dateadded: "2026-11-25T10:00:00Z" },
  ];
  api.getAll.mockImplementation(async () => serverTasks.map((t) => ({ ...t })));
  api.update.mockImplementation(async (id: string, data: any) => {
    serverTasks = serverTasks.map((t) => (t._id === id ? { ...t, ...data } : t));
    return serverTasks.find((t) => t._id === id);
  });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Project > Tasks tab", () => {
  it("shows the same status names as the Tasks module (2 = In Progress, not Awaiting Feedback)", async () => {
    renderWithClient(<Harness />);
    const select = (await screen.findByTestId("status-select")) as HTMLSelectElement;
    expect(select.value).toBe("2");
    expect(select.selectedOptions[0].textContent).toBe("In Progress");
  });

  it("shows who created the task and the assignee names", async () => {
    renderWithClient(<Harness />);
    expect(await screen.findByText("Tirth Patel")).toBeTruthy();
    expect(screen.getByText("Ravi Kumar")).toBeTruthy();
  });

  it("changing the status saves it and the list shows the new status (no stale value)", async () => {
    renderWithClient(<Harness />);
    const select = (await screen.findByTestId("status-select")) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "5" } });
    await waitFor(() => expect(api.update).toHaveBeenCalledWith("t1", { status: 5 }));
    // The list was reloaded from the server after the save.
    await waitFor(() => expect(api.getAll).toHaveBeenCalledTimes(2));
    await waitFor(() => expect((screen.getByTestId("status-select") as HTMLSelectElement).value).toBe("5"));
  });

  it("an Inquiry task asks Won/Lost before it can be completed", async () => {
    serverTasks[0].category = "Inquiry";
    renderWithClient(<Harness />);
    fireEvent.change(await screen.findByTestId("status-select"), { target: { value: "5" } });
    expect(api.update).not.toHaveBeenCalled();
  });
});

describe("Task popup — Created at … by <name>", () => {
  const baseTask = { _id: "t1", name: "Design homepage", displayStatus: 1, displayPriority: 2, isTodo: false, dateadded: "2026-11-25T10:00:00Z", assignees: [], followers: [], checklists: [], comments: [] };
  const opts = STAFF.map((s) => ({ label: `${s.firstname} ${s.lastname}`, value: s._id }));

  it("uses created_by_name from the server", () => {
    renderWithClient(<TaskViewModal isOpen onClose={() => {}} task={{ ...baseTask, created_by: "zz", created_by_name: "Tirth Patel" }} staffOptions={opts} />);
    const line = screen.getByText(/Created at/i);
    expect(line.textContent).toMatch(/by\s*Tirth Patel/);
  });

  it("falls back to the staff list when the server sent no name", () => {
    renderWithClient(<TaskViewModal isOpen onClose={() => {}} task={{ ...baseTask, created_by: "s2" }} staffOptions={opts} />);
    expect(screen.getByText(/Created at/i).textContent).toMatch(/by\s*Ravi Kumar/);
  });

  it("shows only the date when the creator is unknown (very old task)", () => {
    renderWithClient(<TaskViewModal isOpen onClose={() => {}} task={{ ...baseTask }} staffOptions={opts} />);
    expect(screen.getByText(/Created at/i).textContent).not.toMatch(/ by /);
  });
});

// Setup > Settings > Reminders: quick time buttons, ready texts, default staff,
// module switch warning, and the settings tab saving every value.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";

const h = vi.hoisted(() => ({
  settings: {} as Record<string, any>,
  canEdit: true,
  update: vi.fn(async () => ({})),
  refresh: vi.fn(async () => {}),
}));

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({
    getSetting: (k: string, d: any) => (h.settings[k] !== undefined ? h.settings[k] : d),
    refreshSettings: h.refresh,
    settings: h.settings,
  }),
}));
vi.mock("@/context/PermissionContext", () => ({
  usePermissionContext: () => ({ user: { _id: "me" }, can: () => h.canEdit }),
}));
vi.mock("@/api/services/settings.service", () => ({ settingsService: { updateSettings: h.update } }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { quickTimeToDate, readQuickTimes, readReminderTexts, DEFAULT_QUICK_TIMES, toLocalInputValue, useReminderSettings } from "@/lib/reminderSettings";
import { LeadReminderModal } from "@/components/leads/LeadReminderModal";
import { ReminderSettingsTab } from "@/pages/setup/ReminderSettingsTab";
import { useState } from "react";

beforeEach(() => {
  h.settings = {};
  h.canEdit = true;
  h.update.mockClear();
  h.refresh.mockClear();
});
afterEach(() => cleanup());

describe("reminder settings helpers", () => {
  it("quick times: minutes / hours from now; days at a fixed time", () => {
    const now = new Date(2026, 10, 20, 9, 15, 42);
    expect(quickTimeToDate({ label: "", amount: 30, unit: "minutes" }, now)).toEqual(new Date(2026, 10, 20, 9, 45, 0));
    expect(quickTimeToDate({ label: "", amount: 3, unit: "hours" }, now)).toEqual(new Date(2026, 10, 20, 12, 15, 0));
    expect(quickTimeToDate({ label: "", amount: 1, unit: "days", at: "10:00" }, now)).toEqual(new Date(2026, 10, 21, 10, 0, 0));
    expect(quickTimeToDate({ label: "", amount: 7, unit: "days" }, now)).toEqual(new Date(2026, 10, 27, 9, 15, 0));
  });

  it("never saved -> defaults; saved empty list -> none; bad rows dropped", () => {
    expect(readQuickTimes(undefined)).toEqual(DEFAULT_QUICK_TIMES);
    expect(readQuickTimes([])).toEqual([]);
    expect(readQuickTimes([{ label: "", amount: 1, unit: "hours" }, { label: "Ok", amount: "2", unit: "hours" }, { label: "Bad", amount: 1, unit: "weeks" }]))
      .toEqual([{ label: "Ok", amount: 2, unit: "hours" }]);
    expect(readReminderTexts(undefined).length).toBeGreaterThan(0);
    expect(readReminderTexts([" Call ", "", null])).toEqual(["Call"]);
  });

  it("default staff: me, or the record's assigned staff when set to 'assigned'", () => {
    let result: any;
    const Probe = () => { result = useReminderSettings(); return null; };
    render(<Probe />);
    expect(result.defaultStaff("lead-owner")).toBe("me");
    cleanup();
    h.settings.reminderDefaultStaff = "assigned";
    render(<Probe />);
    expect(result.defaultStaff("lead-owner")).toBe("lead-owner");
    expect(result.defaultStaff(undefined)).toBe("me"); // nobody assigned -> me
  });
});

describe("Set Reminder form", () => {
  const Form = ({ relType }: { relType?: any }) => {
    const [form, setForm] = useState({ date: "", staff: "me", description: "", notify_by_email: false });
    return (
      <>
        <LeadReminderModal open onOpenChange={() => {}} formData={form} setFormData={setForm} staffOptions={[{ label: "Me", value: "me" }]} onSave={() => {}} isPending={false} relType={relType} />
        <output data-testid="date">{form.date}</output>
        <output data-testid="desc">{form.description}</output>
      </>
    );
  };

  it("quick time buttons from Settings fill the date", () => {
    h.settings.reminderQuickTimes = [{ label: "In 2 hours", amount: 2, unit: "hours" }];
    render(<Form />);
    const before = Date.now();
    fireEvent.click(screen.getByRole("button", { name: /In 2 hours/ }));
    const picked = new Date(screen.getByTestId("date").textContent!).getTime();
    expect(picked).toBeGreaterThan(before + 2 * 3600000 - 61000);
    expect(picked).toBeLessThan(before + 2 * 3600000 + 61000);
    expect(screen.queryByRole("button", { name: /Tomorrow 10:00/ })).toBeNull(); // only the company's own list
  });

  it("ready texts from Settings are offered for the description", () => {
    h.settings.reminderTemplates = ["Send the brochure"];
    render(<Form />);
    expect(screen.getByRole("combobox", { name: "Ready text" })).toBeInTheDocument();
  });

  it("module turned off in Settings: the form warns nobody will be notified", () => {
    h.settings.reminderModuleTask = false;
    render(<Form relType="task" />);
    expect(screen.getByText(/turned off in Setup > Settings > Reminders/)).toBeInTheDocument();
    cleanup();
    render(<Form relType="lead" />);
    expect(screen.queryByText(/turned off in Setup > Settings > Reminders/)).toBeNull();
  });
});

describe("Setup > Settings > Reminders tab", () => {
  it("saves every reminder setting for this company", async () => {
    render(<ReminderSettingsTab />);
    fireEvent.click(screen.getByRole("switch", { name: "Remind again until done" }));
    fireEvent.click(screen.getByRole("switch", { name: "Task reminders" }));
    fireEvent.change(screen.getByPlaceholderText(/New ready text/), { target: { value: "Send the brochure" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/ }));
    fireEvent.click(screen.getByRole("button", { name: /Save reminder settings/ }));
    await waitFor(() => expect(h.update).toHaveBeenCalled());
    const saved = Object.fromEntries((h.update.mock.calls[0] as any)[0].settings.map((s: any) => [s.name, s.value]));
    expect(saved.reminderRepeatEnabled).toBe("true");
    expect(saved.reminderModuleTask).toBe("false");
    expect(saved.reminderModuleLead).toBe("true");
    expect(saved.reminderBeforeMinutes).toBe("0");
    expect(JSON.parse(saved.reminderTemplates)).toContain("Send the brochure");
    expect(JSON.parse(saved.reminderQuickTimes)).toHaveLength(DEFAULT_QUICK_TIMES.length);
    expect(saved.reminderDefaultStaff).toBe("me");
    expect(h.refresh).toHaveBeenCalled(); // forms everywhere pick it up at once
  });

  it("removing a quick button and saving stores the shorter list", async () => {
    render(<ReminderSettingsTab />);
    fireEvent.click(screen.getByRole("button", { name: "Remove In 30 minutes" }));
    fireEvent.click(screen.getByRole("button", { name: /Save reminder settings/ }));
    await waitFor(() => expect(h.update).toHaveBeenCalled());
    const saved = (h.update.mock.calls[0] as any)[0].settings.find((s: any) => s.name === "reminderQuickTimes");
    expect(JSON.parse(saved.value).map((q: any) => q.label)).not.toContain("In 30 minutes");
  });

  it("without Settings > Edit: view only, Save is off", () => {
    h.canEdit = false;
    render(<ReminderSettingsTab />);
    expect(screen.getByRole("button", { name: /Save reminder settings/ })).toBeDisabled();
    expect(screen.getByText(/needs Settings > Edit permission/)).toBeInTheDocument();
  });

  it("shows what is already saved", () => {
    h.settings.reminderRepeatEnabled = true;
    h.settings.reminderRepeatHours = 4;
    render(<ReminderSettingsTab />);
    expect(screen.getByRole("switch", { name: "Remind again until done" })).toBeChecked();
    expect(within(document.body).getByDisplayValue("4")).toBeInTheDocument();
  });
});

it("toLocalInputValue gives the datetime-local format", () => {
  expect(toLocalInputValue(new Date(2026, 0, 5, 7, 3))).toBe("2026-01-05T07:03");
});

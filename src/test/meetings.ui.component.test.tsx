// Meetings (/admin/meetings) — UI COMPONENT tests: the real Meetings page rendered with
// mocked services (no backend, no real speech / AI / Google Meet / clipboard).
// Each test states the CORRECT behaviour; a failing test = a UI bug.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const svc = vi.hoisted(() => ({
  getMeetings: vi.fn(),
  createMeeting: vi.fn(),
  updateMeeting: vi.fn(),
  deleteMeeting: vi.fn(),
  importMeetings: vi.fn(),
  summarizeMeeting: vi.fn(),
  scribeTurn: vi.fn(),
  scribeDiagnostic: vi.fn(),
  setRecordingConsent: vi.fn(),
  uploadRecording: vi.fn(),
  getRecordingUrl: vi.fn(),
  deleteRecording: vi.fn(),
  getMeeting: vi.fn(),
}));
const toastFn = vi.hoisted(() => vi.fn());
const perms = vi.hoisted(() => ({ current: { admin: true, caps: {} as Record<string, boolean> } }));

vi.mock("@/api/services/meeting.service", () => ({ meetingService: svc }));
vi.mock("@/api/services/staff.service", () => ({
  staffService: {
    getAll: vi.fn(async () => [
      { _id: "s1", firstname: "Asha", lastname: "Patel", admin: true },
      { _id: "s2", firstname: "Ravi", lastname: "Shah", admin: false },
    ]),
  },
}));
vi.mock("@/hrms/services/hrmsbranchService", () => ({ hrmsbranchService: { getAll: vi.fn(async () => ({ data: [] })) } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastFn }) }));
vi.mock("@/components/layout/DashboardLayout", () => ({ DashboardLayout: ({ children }: any) => <div data-testid="layout">{children}</div> }));
vi.mock("@/components/ui/export-button", () => ({ ExportButton: () => <button>Export</button> }));
vi.mock("@/components/ui/import-button", () => ({ ImportButton: () => <button>Import</button> }));
vi.mock("react-speech-recognition", () => ({
  default: { startListening: vi.fn(), stopListening: vi.fn(), browserSupportsSpeechRecognition: () => false },
  useSpeechRecognition: () => ({ finalTranscript: "", listening: false, resetTranscript: vi.fn(), browserSupportsSpeechRecognition: false }),
}));
vi.mock("@/lib/speechControl", () => ({ startListening: vi.fn(async () => {}), stopListening: vi.fn(async () => {}) }));
vi.mock("@/lib/dictation", async (importOriginal) => ({ ...(await importOriginal<any>()), onDictationBusyChange: () => () => {} }));
vi.mock("@/context/SettingsContext", () => ({ useSettings: () => ({ getSetting: (_k: string, d: any) => d }) }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    user: { _id: "u1", email: "admin@crm-test.local", admin: perms.current.admin },
    isAdmin: perms.current.admin,
    isModuleEnabled: () => true,
    can: (_f: string, cap: string) => perms.current.admin || !!perms.current.caps[cap],
    canView: () => true,
    permissions: {},
  }),
}));

import Meetings from "@/pages/Meetings";

const MEETINGS = [
  {
    _id: "m1", topic: "Weekly Sync", agenda: "Pipeline review", date: "2026-12-15T00:00:00.000Z", time: "11:00",
    status: "Scheduled", members: [{ _id: "s1", firstname: "Asha", lastname: "Patel" }], summary: "",
    meeting_link: "https://meet.google.com/abc-defg-hij", reminder_time: 15, recordings: [],
  },
  {
    _id: "m2", topic: "Client Review", agenda: "Quotation", date: "2026-12-16T00:00:00.000Z", time: "15:30",
    status: "Completed", members: [{ _id: "s2", firstname: "Ravi", lastname: "Shah" }], summary: "Approved the quote",
    meeting_link: "", reminder_time: 15, recordings: [],
  },
];

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/admin/meetings"]}>
        <Meetings />
      </MemoryRouter>
    </QueryClientProvider>
  );
};
const rowOf = async (topic: string) => (await screen.findByText(topic)).closest("tr") as HTMLElement;
const openNew = async () => {
  fireEvent.click(await screen.findByRole("button", { name: /new meeting/i }));
  return screen.findByRole("dialog");
};
const fill = (dlg: HTMLElement, { topic, date, link }: { topic?: string; date?: string; link?: string }) => {
  if (topic !== undefined) fireEvent.change(within(dlg).getByLabelText(/topic/i), { target: { id: "topic", value: topic } });
  if (date !== undefined) fireEvent.change(dlg.querySelector("#date")!, { target: { id: "date", value: date } });
  if (link !== undefined) fireEvent.change(dlg.querySelector("#meeting_link")!, { target: { id: "meeting_link", value: link } });
};

beforeEach(() => {
  vi.clearAllMocks();
  perms.current = { admin: true, caps: {} };
  svc.getMeetings.mockResolvedValue(MEETINGS);
  svc.createMeeting.mockResolvedValue({ _id: "new" });
  svc.updateMeeting.mockResolvedValue({ _id: "m1" });
  svc.deleteMeeting.mockResolvedValue({ message: "Meeting deleted" });
});
afterEach(() => cleanup());

describe("Meetings page — table and page states", () => {
  it("[ui] shows loading skeletons, then the rows with topic, agenda, date, time, members, status and summary", async () => {
    let resolve: (v: any) => void = () => {};
    svc.getMeetings.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    const { container } = renderPage();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    resolve(MEETINGS);
    const row = await rowOf("Weekly Sync");
    expect(within(row).getByText("Pipeline review")).toBeInTheDocument();
    expect(within(row).getByText("11:00")).toBeInTheDocument();
    expect(within(row).getByText("Asha Patel")).toBeInTheDocument();
    expect(within(row).getByText("Scheduled")).toBeInTheDocument();
    expect(within(row).getByText("No summary yet")).toBeInTheDocument();
    expect(within(await rowOf("Client Review")).getByText("Approved the quote")).toBeInTheDocument();
  });

  it("[ui] table headers are Topic / Date & Time / Members / Status / Summary / Actions", async () => {
    renderPage();
    await screen.findByText("Weekly Sync");
    const heads = screen.getAllByRole("columnheader").map((h) => h.textContent?.trim());
    expect(heads).toEqual(["Topic", "Date & Time", "Members", "Status", "Summary", "Actions"]);
  });

  it("[ui] empty state says 'No meetings found.'", async () => {
    svc.getMeetings.mockResolvedValueOnce([]);
    renderPage();
    expect(await screen.findByText("No meetings found.")).toBeInTheDocument();
  });

  it("[ui] a meeting with no date / members / time shows N/A and None — never undefined / null / NaN", async () => {
    svc.getMeetings.mockResolvedValueOnce([{ _id: "m3", topic: "Bare", status: "Scheduled" }]);
    const { container } = renderPage();
    const row = await rowOf("Bare");
    expect(within(row).getByText("N/A")).toBeInTheDocument();
    expect(within(row).getByText("None")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/undefined|null|NaN/);
  });

  it("[ui] API error shows an error message, not the 'No meetings found.' empty state", async () => {
    svc.getMeetings.mockRejectedValueOnce(new Error("Network Error"));
    renderPage();
    await waitFor(() => expect(svc.getMeetings).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/error|failed|could not/i)).toBeInTheDocument());
    expect(screen.queryByText("No meetings found.")).not.toBeInTheDocument();
  });

  it("[ui] search filters by topic, member name and status (case-insensitive) and shows empty state on no match", async () => {
    renderPage();
    await screen.findByText("Weekly Sync");
    const box = screen.getByPlaceholderText(/search meetings/i);
    fireEvent.change(box, { target: { value: "client" } });
    expect(screen.queryByText("Weekly Sync")).not.toBeInTheDocument();
    expect(screen.getByText("Client Review")).toBeInTheDocument();
    fireEvent.change(box, { target: { value: "asha" } });
    expect(screen.getByText("Weekly Sync")).toBeInTheDocument();
    expect(screen.queryByText("Client Review")).not.toBeInTheDocument();
    fireEvent.change(box, { target: { value: "COMPLETED" } });
    expect(screen.getByText("Client Review")).toBeInTheDocument();
    fireEvent.change(box, { target: { value: "zzz-no-match" } });
    expect(screen.getByText("No meetings found.")).toBeInTheDocument();
  });

  it("[ui] table scrolls sideways on mobile (overflow-x-auto wrapper)", async () => {
    const { container } = renderPage();
    await screen.findByText("Weekly Sync");
    expect(container.querySelector(".overflow-x-auto table")).not.toBeNull();
  });

  it("[ui] Actions column is sticky on the right (spec: sticky right-0)", async () => {
    renderPage();
    await screen.findByText("Weekly Sync");
    const actionsHead = screen.getByRole("columnheader", { name: "Actions" });
    expect(actionsHead.className).toMatch(/sticky/);
    expect(actionsHead.className).toMatch(/right-0/);
  });
});

describe("Meetings page — create / edit dialog", () => {
  it("[ui] New Meeting opens the dialog with Topic * and Date * marked required", async () => {
    renderPage();
    const dlg = await openNew();
    expect(within(dlg).getByText("Schedule New Meeting")).toBeInTheDocument();
    expect(within(dlg).getByText("Topic").parentElement?.textContent).toContain("*");
    expect(within(dlg).getByText("Date").parentElement?.textContent).toContain("*");
  });

  it("[ui] Save with an empty topic shows a validation toast and does NOT call the API", async () => {
    renderPage();
    const dlg = await openNew();
    fill(dlg, { date: "2026-12-15", link: "https://meet.google.com/x" });
    fireEvent.click(within(dlg).getByRole("button", { name: "Save" }));
    await new Promise((r) => setTimeout(r, 50));
    expect(toastFn).toHaveBeenCalledWith(expect.objectContaining({ title: "Validation Error", variant: "destructive" }));
    expect(svc.createMeeting).not.toHaveBeenCalled();
  });

  it("[ui] Save with a topic of only spaces is blocked (no API call)", async () => {
    renderPage();
    const dlg = await openNew();
    fill(dlg, { topic: "    ", date: "2026-12-15", link: "https://meet.google.com/x" });
    fireEvent.click(within(dlg).getByRole("button", { name: "Save" }));
    await new Promise((r) => setTimeout(r, 50));
    expect(svc.createMeeting).not.toHaveBeenCalled();
  });

  it("[ui] Save without a meeting link asks for a Google Meet link (no API call)", async () => {
    renderPage();
    const dlg = await openNew();
    fill(dlg, { topic: "Sync", date: "2026-12-15" });
    fireEvent.click(within(dlg).getByRole("button", { name: "Save" }));
    expect(toastFn).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringMatching(/Google Meet link/) }));
    expect(svc.createMeeting).not.toHaveBeenCalled();
  });

  it("[ui] valid Save calls createMeeting once with a numeric reminder_time, shows success toast and closes", async () => {
    renderPage();
    const dlg = await openNew();
    fill(dlg, { topic: "Board Meeting", date: "2026-12-15", link: "https://meet.google.com/board" });
    fireEvent.click(within(dlg).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(svc.createMeeting).toHaveBeenCalledTimes(1));
    expect(svc.createMeeting.mock.calls[0][0]).toEqual(expect.objectContaining({
      topic: "Board Meeting", date: "2026-12-15", meeting_link: "https://meet.google.com/board", reminder_time: 15, status: "Scheduled",
    }));
    await waitFor(() => expect(toastFn).toHaveBeenCalledWith(expect.objectContaining({ title: "Success" })));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("[ui] double-click Save creates only ONE meeting (button disabled while saving)", async () => {
    svc.createMeeting.mockImplementation(() => new Promise((r) => setTimeout(() => r({ _id: "x" }), 50)));
    renderPage();
    const dlg = await openNew();
    fill(dlg, { topic: "Double click", date: "2026-12-15", link: "https://meet.google.com/dbl" });
    const save = within(dlg).getByRole("button", { name: "Save" });
    fireEvent.click(save);
    fireEvent.click(save);
    await new Promise((r) => setTimeout(r, 100));
    expect(svc.createMeeting).toHaveBeenCalledTimes(1);
  });

  it("[ui] server error shows the server message and keeps the dialog open with typed values", async () => {
    svc.createMeeting.mockRejectedValueOnce({ response: { data: { message: "Meeting validation failed: agenda: Path `agenda` is required." } } });
    renderPage();
    const dlg = await openNew();
    fill(dlg, { topic: "Kept topic", date: "2026-12-15", link: "https://meet.google.com/kept" });
    fireEvent.click(within(dlg).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(toastFn).toHaveBeenCalledWith(expect.objectContaining({ title: "Error", variant: "destructive" })));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect((within(screen.getByRole("dialog")).getByLabelText(/topic/i) as HTMLInputElement).value).toBe("Kept topic");
  });

  it("[ui] Agenda is optional on screen, so a meeting without agenda must be accepted (front/back rule must match)", async () => {
    // The screen sends agenda: "" — the backend model requires agenda (see meetings.negative).
    renderPage();
    const dlg = await openNew();
    expect(within(dlg).getByText("Agenda").parentElement?.textContent).not.toContain("*");
    fill(dlg, { topic: "No agenda", date: "2026-12-15", link: "https://meet.google.com/na" });
    fireEvent.click(within(dlg).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(svc.createMeeting).toHaveBeenCalledTimes(1));
    expect(svc.createMeeting.mock.calls[0][0].agenda).toBe("");
  });

  it("[ui] Cancel closes the dialog and saves nothing", async () => {
    renderPage();
    const dlg = await openNew();
    fill(dlg, { topic: "Cancelled", date: "2026-12-15", link: "https://meet.google.com/c" });
    fireEvent.click(within(dlg).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(svc.createMeeting).not.toHaveBeenCalled();
  });

  it("[ui] Edit pre-fills the form and Update calls updateMeeting(id, …)", async () => {
    renderPage();
    const row = await rowOf("Weekly Sync");
    fireEvent.click(within(row).getByTitle("Edit"));
    const dlg = await screen.findByRole("dialog");
    expect(within(dlg).getByText("Edit Meeting")).toBeInTheDocument();
    expect((within(dlg).getByLabelText(/topic/i) as HTMLInputElement).value).toBe("Weekly Sync");
    expect((dlg.querySelector("#date") as HTMLInputElement).value).toBe("2026-12-15");
    fill(dlg, { topic: "Weekly Sync v2" });
    fireEvent.click(within(dlg).getByRole("button", { name: "Update" }));
    await waitFor(() => expect(svc.updateMeeting).toHaveBeenCalledWith("m1", expect.objectContaining({ topic: "Weekly Sync v2", members: ["s1"] })));
  });
});

describe("Meetings page — row actions and permissions", () => {
  it("[ui] Delete asks for confirmation once; Cancel deletes nothing, OK deletes once", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderPage();
    const row = await rowOf("Weekly Sync");
    fireEvent.click(within(row).getByTitle("Delete"));
    expect(svc.deleteMeeting).not.toHaveBeenCalled();
    fireEvent.click(within(row).getByTitle("Delete"));
    await waitFor(() => expect(svc.deleteMeeting).toHaveBeenCalledTimes(1));
    expect(svc.deleteMeeting.mock.calls[0][0]).toBe("m1");
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    confirmSpy.mockRestore();
  });

  it("[ui] Copy Link copies the meeting link and confirms with a toast; no link -> error toast", async () => {
    const writeText = vi.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });
    renderPage();
    fireEvent.click(within(await rowOf("Weekly Sync")).getByTitle("Copy Link"));
    expect(writeText).toHaveBeenCalledWith("https://meet.google.com/abc-defg-hij");
    expect(toastFn).toHaveBeenCalledWith(expect.objectContaining({ title: "Copied!" }));
    fireEvent.click(within(await rowOf("Client Review")).getByTitle("Copy Link"));
    expect(toastFn).toHaveBeenCalledWith(expect.objectContaining({ title: "Error", variant: "destructive" }));
  });

  it("[ui] view-only staff (no Create) does not see '+ New Meeting'", async () => {
    perms.current = { admin: false, caps: { "View(Global)": true } };
    renderPage();
    await screen.findByText("Weekly Sync");
    expect(screen.queryByRole("button", { name: /new meeting/i })).not.toBeInTheDocument();
  });

  it("[ui] view-only staff (no Edit / Delete) does not see the Edit and Delete row buttons", async () => {
    perms.current = { admin: false, caps: { "View(Global)": true } };
    renderPage();
    const row = await rowOf("Weekly Sync");
    expect(within(row).queryByTitle("Edit")).not.toBeInTheDocument();
    expect(within(row).queryByTitle("Delete")).not.toBeInTheDocument();
  });

  it("[ui] admin sees New Meeting, Join Meet, AI Scribe, Copy Link, Edit and Delete", async () => {
    renderPage();
    const row = await rowOf("Weekly Sync");
    expect(screen.getByRole("button", { name: /new meeting/i })).toBeInTheDocument();
    for (const t of ["Copy Link", "Edit", "Delete", "AI Meeting Scribe"]) expect(within(row).getByTitle(t)).toBeInTheDocument();
    expect(within(row).getByText("Join Meet")).toBeInTheDocument();
  });
});

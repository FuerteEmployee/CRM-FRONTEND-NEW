// Saved notifications: NotificationProvider (saved list, live "notification:new")
// + the Dashboard NotificationsPopup (opens by itself once per login when something
// is unread, reopens from its button; latest 10; mark read / all read).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const h = vi.hoisted(() => {
  const sockets: any[] = [];
  const makeSocket = () => {
    const handlers: Record<string, ((...a: any[]) => void)[]> = {};
    const s = {
      on: (ev: string, fn: any) => { (handlers[ev] ||= []).push(fn); return s; },
      off: () => s,
      emit: () => s,
      disconnect: () => {},
      fire: (ev: string, ...a: any[]) => (handlers[ev] || []).forEach((fn) => fn(...a)),
    };
    sockets.push(s);
    return s;
  };
  const service = { list: vi.fn(), create: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn(), remove: vi.fn() };
  // Same user object every render, like the real PermissionContext (state).
  const me = { _id: "me", firstname: "Mona" };
  return { sockets, makeSocket, service, me };
});

vi.mock("@/lib/appSocket", () => ({ createAppSocket: () => h.makeSocket() }));
vi.mock("@/api/services/notification.service", () => ({ notificationService: h.service }));
vi.mock("@/api/services/chat.service", () => ({ chatService: { getContacts: vi.fn(async () => []) } }));
vi.mock("@/api/services/meeting.service", () => ({ meetingService: { getMeetings: vi.fn(async () => []) } }));
vi.mock("@/api/services/quotation.service", () => ({ quotationService: { getPendingApprovals: vi.fn(async () => []) } }));
vi.mock("@/api/services/purchaseOrder.service", () => ({ purchaseOrderService: { pendingApprovals: vi.fn(async () => []) } }));
vi.mock("@/lib/soundUtils", () => ({ playNotificationSound: vi.fn() }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { info: vi.fn(), error: vi.fn(), success: vi.fn() }) }));
vi.mock("@/context/PermissionContext", () => ({
  usePermissionContext: () => ({ user: h.me, isStaff: false, can: () => false }),
}));

import { NotificationProvider } from "@/context/NotificationContext";
import { NotificationsPopup } from "@/components/dashboard/NotificationsPopup";
import { toast } from "sonner";

const n = (i: number, extra: any = {}) => ({
  _id: `n${i}`, type: "reminder", title: `Reminder ${i}`, message: `Call customer ${i}`, link: `/leads?leadView=L${i}`,
  read: false, createdAt: new Date(Date.now() - i * 60000).toISOString(), ref: {}, ...extra,
});

const renderPopup = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <NotificationProvider>
          <NotificationsPopup />
        </NotificationProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

beforeEach(() => {
  h.sockets.length = 0;
  Object.values(h.service).forEach((f) => f.mockReset());
  h.service.markRead.mockResolvedValue({});
  h.service.markAllRead.mockResolvedValue({});
  (toast.info as any).mockReset();
  sessionStorage.clear();
});
afterEach(() => cleanup());

describe("Dashboard notifications popup", () => {
  it("opens by itself after login with the SAVED notifications: latest 10 + unread count", async () => {
    h.service.list.mockResolvedValue({ items: Array.from({ length: 12 }, (_, i) => n(i + 1)), unread: 12 });
    renderPopup();
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Reminder 1")).toBeInTheDocument();
    expect(within(dialog).getByText("Reminder 10")).toBeInTheDocument();
    expect(within(dialog).queryByText("Reminder 11")).toBeNull(); // only 10
    expect(within(dialog).getByLabelText("12 unread")).toHaveTextContent("12");
  });

  it("opens by itself only once per login; the Notifications button reopens it", async () => {
    h.service.list.mockResolvedValue({ items: [n(1)], unread: 1 });
    renderPopup();
    // The footer "Close" (the dialog also has its own ✕ "Close").
    const closeButtons = within(await screen.findByRole("dialog")).getAllByRole("button", { name: "Close" });
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    cleanup();
    renderPopup(); // e.g. going back to the Dashboard in the same login
    await screen.findByRole("button", { name: /Notifications, 1 unread/ });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Notifications, 1 unread/ }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("nothing unread: does not pop up; the button shows the list", async () => {
    h.service.list.mockResolvedValue({ items: [n(1, { read: true })], unread: 0 });
    renderPopup();
    const btn = await screen.findByRole("button", { name: "Notifications" });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(btn);
    expect(within(await screen.findByRole("dialog")).getByText("Reminder 1")).toBeInTheDocument();
  });

  it("a new notification appears live in the open popup, with a toast", async () => {
    h.service.list.mockResolvedValue({ items: [n(1)], unread: 1 });
    renderPopup();
    const dialog = await screen.findByRole("dialog");
    act(() => h.sockets[0].fire("notification:new", n(99, { type: "chat", title: "New message from Ravi", message: "Hi", link: "/chat", createdAt: new Date().toISOString() })));
    expect(await within(dialog).findByText("New message from Ravi")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("2 unread")).toBeInTheDocument();
    expect(toast.info).toHaveBeenCalledWith("New message from Ravi", expect.objectContaining({ description: "Hi" }));
  });

  it("clicking one marks it read and goes there; Mark all as read clears the count", async () => {
    h.service.list.mockResolvedValue({ items: [n(1), n(2)], unread: 2 });
    renderPopup();
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Mark all as read/ }));
    expect(h.service.markAllRead).toHaveBeenCalled();
    await waitFor(() => expect(within(dialog).queryByLabelText(/unread/)).toBeNull());
    fireEvent.click(within(dialog).getByText("Reminder 1"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull()); // went to the lead
  });

  it("read elsewhere (other tab / opened the chat): the list reloads from the server", async () => {
    h.service.list.mockResolvedValueOnce({ items: [n(1)], unread: 1 }).mockResolvedValueOnce({ items: [n(1, { read: true })], unread: 0 });
    renderPopup();
    const dialog = await screen.findByRole("dialog");
    act(() => h.sockets[0].fire("notifications:changed"));
    await waitFor(() => expect(within(dialog).queryByLabelText(/unread/)).toBeNull());
  });
});

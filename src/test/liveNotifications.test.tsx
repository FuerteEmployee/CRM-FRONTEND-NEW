// Notifications: every NEW one pops up on its own side card (LiveNotifications),
// all of them, old and new, stay in the bell list (NotificationContext + "Load older").
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
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
  const perm = { allowed: true };
  return { sockets, makeSocket, service, me, perm };
});

vi.mock("@/lib/appSocket", () => ({ createAppSocket: () => h.makeSocket() }));
vi.mock("@/api/services/notification.service", () => ({ notificationService: h.service }));
vi.mock("@/api/services/chat.service", () => ({ chatService: { getContacts: vi.fn(async () => []) } }));
vi.mock("@/api/services/meeting.service", () => ({ meetingService: { getMeetings: vi.fn(async () => []) } }));
vi.mock("@/api/services/quotation.service", () => ({ quotationService: { getPendingApprovals: vi.fn(async () => []) } }));
vi.mock("@/api/services/purchaseOrder.service", () => ({ purchaseOrderService: { pendingApprovals: vi.fn(async () => []) } }));
vi.mock("@/lib/soundUtils", () => ({ playNotificationSound: vi.fn() }));
vi.mock("@/context/PermissionContext", () => ({
  usePermissionContext: () => ({ user: h.me, isStaff: false, can: () => false, canView: () => h.perm.allowed }),
}));

import { NotificationProvider, useNotificationContext } from "@/context/NotificationContext";
import { LiveNotifications } from "@/components/layout/LiveNotifications";
import { playNotificationSound } from "@/lib/soundUtils";

const n = (i: number, extra: any = {}) => ({
  _id: `n${i}`, type: "reminder", title: `Reminder ${i}`, message: `Call customer ${i}`, link: `/leads?leadView=L${i}`,
  read: false, createdAt: new Date(Date.now() - i * 60000).toISOString(), ref: {}, ...extra,
});

/** Stands in for the bell list. */
const BellProbe = () => {
  const { notifications, unreadCount, hasMore, loadMore } = useNotificationContext();
  const loc = useLocation();
  return (
    <div>
      <span data-testid="unread">{unreadCount}</span>
      <span data-testid="where">{loc.pathname + loc.search}</span>
      <ul aria-label="bell">{notifications.map((x) => <li key={x.id}>{x.title}</li>)}</ul>
      {hasMore && <button onClick={loadMore}>Load older</button>}
    </div>
  );
};

const renderAll = (durationMs = 7000) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <NotificationProvider>
          <BellProbe />
          <LiveNotifications durationMs={durationMs} />
        </NotificationProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

const popups = () => screen.queryByRole("region", { name: "New notifications" });
const live = (i: number, extra: any = {}) => n(i, { createdAt: new Date().toISOString(), ...extra });

const LOGIN_KEY = "notifications:loginPopupsShownFor";

beforeEach(() => {
  h.sockets.length = 0;
  h.perm.allowed = true;
  Object.values(h.service).forEach((f) => f.mockReset());
  h.service.markRead.mockResolvedValue({});
  h.service.markAllRead.mockResolvedValue({});
  (playNotificationSound as any).mockReset();
  sessionStorage.clear();
  // Most tests are about NEW notifications: the login popups were already shown.
  sessionStorage.setItem(LOGIN_KEY, "me");
});
afterEach(() => cleanup());

describe("Live notifications (one by one) + bell (all)", () => {
  it("already-read saved notifications only go to the bell — nothing pops up", async () => {
    sessionStorage.clear();
    h.service.list.mockResolvedValue({ items: [n(1, { read: true }), n(2, { read: true })], unread: 0 });
    renderAll();
    expect(await screen.findByText("Reminder 1")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(popups()).toBeNull();
    expect(playNotificationSound).not.toHaveBeenCalled();
  });

  it("on login / opening the CRM: unread ones pop up one by one (3 at a time), once per session", async () => {
    sessionStorage.clear();
    h.service.list.mockResolvedValue({ items: [n(1), n(2), n(3), n(4, { read: true })], unread: 3 });
    renderAll(120);
    const cards = await screen.findAllByRole("status");
    expect(cards.map((c) => c.textContent)).toEqual([
      expect.stringContaining("Reminder 1"), expect.stringContaining("Reminder 2"), expect.stringContaining("Reminder 3"),
    ]);
    expect(playNotificationSound).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(popups()).toBeNull(), { timeout: 1000 });
    cleanup();
    renderAll(); // same session (refresh / another page): not again
    await screen.findByText("Reminder 1");
    await new Promise((r) => setTimeout(r, 50));
    expect(popups()).toBeNull();
  });

  it("on login with more unread than fit: the newest 10 pop up, then an 'N more unread' card", async () => {
    sessionStorage.clear();
    const unread = Array.from({ length: 10 }, (_, i) => n(i + 1));
    h.service.list.mockImplementation(async (_l: number, _b: any, opts: any) => ({ items: unread, unread: 25, hasMore: true, ...(opts ? {} : {}) }));
    renderAll(60);
    // 10 + summary go through the 3 on-screen slots; wait for the summary card to show up.
    expect(await screen.findByText("15 more unread notifications", {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it("each new one pops up on its own card (newest on top), with sound, and is added to the bell", async () => {
    h.service.list.mockResolvedValue({ items: [n(1)], unread: 1 });
    renderAll();
    await screen.findByText("Reminder 1");
    act(() => h.sockets[0].fire("notification:new", live(50, { type: "chat", title: "New message from Ravi", message: "Hi", link: "/chat" })));
    act(() => h.sockets[0].fire("notification:new", live(51, { type: "call", title: "Missed call from Asha", message: "" })));
    const cards = await screen.findAllByRole("status");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Missed call from Asha");
    expect(cards[1]).toHaveTextContent("New message from Ravi");
    expect(cards[1]).toHaveTextContent("Hi");
    expect(playNotificationSound).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("unread")).toHaveTextContent("3");
    const bell = screen.getByRole("list", { name: "bell" });
    expect(bell.firstChild).toHaveTextContent("Missed call from Asha");
  });

  it("at most 3 on screen; closing one lets the next come up", async () => {
    h.service.list.mockResolvedValue({ items: [], unread: 0 });
    renderAll();
    await waitFor(() => expect(h.sockets.length).toBe(1));
    act(() => [1, 2, 3, 4].forEach((i) => h.sockets[0].fire("notification:new", live(i, { title: `Live ${i}` }))));
    expect(await screen.findAllByRole("status")).toHaveLength(3);
    expect(screen.getAllByRole("status").some((c) => c.textContent?.includes("Live 1"))).toBe(false); // oldest waits
    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[0]);
    await waitFor(() => expect(screen.getAllByRole("status").map((c) => c.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining("Live 1")])
    ));
    // Dismissing does not mark it read — it is still unread in the bell.
    expect(h.service.markRead).not.toHaveBeenCalled();
    expect(screen.getByTestId("unread")).toHaveTextContent("4");
  });

  it("hides by itself after a few seconds", async () => {
    h.service.list.mockResolvedValue({ items: [], unread: 0 });
    renderAll(120);
    await waitFor(() => expect(h.sockets.length).toBe(1));
    act(() => h.sockets[0].fire("notification:new", live(7, { title: "Task due" })));
    expect(await screen.findByRole("status")).toBeInTheDocument();
    await waitFor(() => expect(popups()).toBeNull(), { timeout: 1000 });
    expect(screen.getByText("Task due")).toBeInTheDocument(); // still in the bell
  });

  it("clicking a card marks it read and opens its page", async () => {
    h.service.list.mockResolvedValue({ items: [], unread: 0 });
    renderAll();
    await waitFor(() => expect(h.sockets.length).toBe(1));
    act(() => h.sockets[0].fire("notification:new", live(8, { title: "Lead reminder", link: "/leads?leadView=L8" })));
    fireEvent.click(await screen.findByRole("button", { name: /Lead reminder/ }));
    expect(h.service.markRead).toHaveBeenCalledWith("n8");
    await waitFor(() => expect(popups()).toBeNull());
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/leads?leadView=L8");
    expect(screen.getByTestId("unread")).toHaveTextContent("0");
  });

  it("role without the permission: no popups, but the bell still gets it", async () => {
    h.perm.allowed = false;
    h.service.list.mockResolvedValue({ items: [], unread: 0 });
    renderAll();
    await waitFor(() => expect(h.sockets.length).toBe(1));
    act(() => h.sockets[0].fire("notification:new", live(9, { title: "Goal reached" })));
    expect(await screen.findByText("Goal reached")).toBeInTheDocument();
    expect(popups()).toBeNull();
  });

  it("chat message for the chat that is open right now: no popup", async () => {
    h.service.list.mockResolvedValue({ items: [], unread: 0 });
    renderAll();
    await waitFor(() => expect(h.sockets.length).toBe(1));
    window.history.pushState({}, "", "/admin/chat");
    sessionStorage.setItem("activeChatId", "ravi");
    act(() => h.sockets[0].fire("newMessage", { _id: "m1", sender: { _id: "ravi" }, conversationId: "ravi" }));
    act(() => h.sockets[0].fire("notification:new", live(10, { type: "chat", title: "New message from Ravi", ref: { messageId: "m1" } })));
    expect(await screen.findByText("New message from Ravi")).toBeInTheDocument();
    expect(popups()).toBeNull();
    window.history.pushState({}, "", "/");
    sessionStorage.clear();
  });

  it("the bell loads the latest 10", async () => {
    h.service.list.mockResolvedValue({ items: [n(1)], unread: 1, hasMore: false });
    renderAll();
    await screen.findByText("Reminder 1");
    expect(h.service.list).toHaveBeenCalledWith(10);
  });
});

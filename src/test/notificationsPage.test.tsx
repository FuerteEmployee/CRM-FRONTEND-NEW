// Bell > "View All Notifications" page: newest first, grouped by day, Load more
// step by step, All / Unread, type filter, mark read, live new ones.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

const h = vi.hoisted(() => {
  const handlers: Record<string, ((...a: any[]) => void)[]> = {};
  const socket = {
    on: (ev: string, fn: any) => { (handlers[ev] ||= []).push(fn); },
    off: (ev: string, fn: any) => { handlers[ev] = (handlers[ev] || []).filter((f) => f !== fn); },
    fire: (ev: string, ...a: any[]) => (handlers[ev] || []).forEach((fn) => fn(...a)),
  };
  return {
    socket,
    handlers,
    list: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    unread: 3,
  };
});

vi.mock("@/components/layout/DashboardLayout", () => ({ DashboardLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/api/services/notification.service", () => ({ notificationService: { list: h.list } }));
vi.mock("@/context/NotificationContext", () => ({
  useNotificationContext: () => ({
    unreadCount: h.unread,
    markAsRead: h.markAsRead,
    markAllAsRead: h.markAllAsRead,
    socket: h.socket,
    toItem: (n: any) => ({ id: n._id, title: n.title, message: n.message, time: "x ago", read: !!n.read, link: n.link ? `/admin${n.link}` : undefined, createdAt: n.createdAt, type: n.type }),
  }),
}));

import NotificationsPage from "@/pages/Notifications";

const day = 86400000;
const doc = (i: number, extra: any = {}) => ({
  _id: `n${i}`, type: "task", title: `Title ${i}`, message: `Message ${i}`, link: `/tasks?taskId=t${i}`,
  read: false, createdAt: new Date(Date.now() - i * 60000).toISOString(), ...extra,
});

const Where = () => {
  const l = useLocation();
  return <output data-testid="where">{l.pathname + l.search}</output>;
};
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/admin/notifications"]}>
      <Routes>
        <Route path="/admin/notifications" element={<NotificationsPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  h.list.mockReset();
  h.markAsRead.mockReset();
  h.markAllAsRead.mockReset();
  h.unread = 3;
  Object.keys(h.handlers).forEach((k) => delete h.handlers[k]);
});
afterEach(() => cleanup());

describe("View All Notifications page", () => {
  it("shows 20 newest, then Load more brings the next 20 (step by step) until the end", async () => {
    const all = Array.from({ length: 45 }, (_, i) => doc(i + 1));
    h.list.mockImplementation(async (limit: number, before?: string) => {
      const start = before ? all.findIndex((d) => d.createdAt === before) + 1 : 0;
      const items = all.slice(start, start + limit);
      return { items, unread: 3, hasMore: start + limit < all.length };
    });
    renderPage();
    expect(await screen.findByText("Title 1")).toBeInTheDocument();
    expect(screen.queryByText("Title 21")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Title 40")).toBeInTheDocument();
    expect(h.list).toHaveBeenLastCalledWith(20, all[19].createdAt, { unread: false, type: undefined });
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Title 45")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
    expect(screen.getByText("That's everything from the last 1 year.")).toBeInTheDocument();
  }, 20000); // renders 45 rows in 3 steps — slow when the whole suite runs in parallel

  it("groups by day: Today / Yesterday / date", async () => {
    h.list.mockResolvedValue({ items: [doc(1), doc(2, { createdAt: new Date(Date.now() - day).toISOString() }), doc(3, { createdAt: "2026-01-05T10:00:00.000Z" })], unread: 3, hasMore: false });
    renderPage();
    expect(await screen.findByRole("region", { name: "Today" })).toHaveTextContent("Title 1");
    expect(screen.getByRole("region", { name: "Yesterday" })).toHaveTextContent("Title 2");
    expect(screen.getByRole("region", { name: /5 Jan 2026/ })).toHaveTextContent("Title 3");
  });

  it("Unread tab and type filter ask the server for just those", async () => {
    h.list.mockResolvedValue({ items: [doc(1)], unread: 1, hasMore: false });
    renderPage();
    await screen.findByText("Title 1");
    fireEvent.click(screen.getByRole("tab", { name: "Unread" }));
    await waitFor(() => expect(h.list).toHaveBeenLastCalledWith(20, undefined, { unread: true, type: undefined }));
  });

  it("clicking one marks it read and opens it", async () => {
    h.list.mockResolvedValue({ items: [doc(1)], unread: 1, hasMore: false });
    renderPage();
    fireEvent.click(await screen.findByText("Title 1"));
    expect(h.markAsRead).toHaveBeenCalledWith("n1");
    expect(await screen.findByTestId("where")).toHaveTextContent("/admin/tasks?taskId=t1");
  });

  it("'Mark read' on one row, and 'Mark all as read'", async () => {
    h.list.mockResolvedValue({ items: [doc(1), doc(2)], unread: 2, hasMore: false });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: 'Mark "Title 1" as read' }));
    expect(h.markAsRead).toHaveBeenCalledWith("n1");
    expect(screen.queryByRole("button", { name: 'Mark "Title 1" as read' })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Mark all as read/ }));
    expect(h.markAllAsRead).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Mark "Title 2" as read/ })).toBeNull();
  });

  it("a new notification appears at the top live", async () => {
    h.list.mockResolvedValue({ items: [doc(1)], unread: 1, hasMore: false });
    renderPage();
    await screen.findByText("Title 1");
    act(() => h.socket.fire("notification:new", doc(0, { _id: "fresh", title: "Brand new", createdAt: new Date().toISOString() })));
    const today = screen.getByRole("region", { name: "Today" });
    expect(within(today).getAllByRole("button")[0]).toHaveTextContent("Brand new");
  });

  it("empty and error states", async () => {
    h.list.mockResolvedValueOnce({ items: [], unread: 0, hasMore: false });
    renderPage();
    expect(await screen.findByText("No notifications yet.")).toBeInTheDocument();
    cleanup();
    h.list.mockRejectedValueOnce(new Error("Network down"));
    renderPage();
    expect(await screen.findByText("Network down")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

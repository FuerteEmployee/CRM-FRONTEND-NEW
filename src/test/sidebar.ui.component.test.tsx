// SIDEBAR NAVIGATION — UI component tests for components/layout/AppSidebar.tsx with the
// REAL PermissionProvider (so the real canView / can / isModuleEnabled rules are used).
// Users: admin, full staff, view-only staff, no-access staff, HRMS-only staff, plan with
// modules off, staff whose role NAME contains "admin". Also: active highlight, Chat unread
// badge, Setup mode gating, collapsed rail and the 375px mobile drawer.
// All services mocked — no network. A failing test = a bug (see the report).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------- mocks ----------
const sess = vi.hoisted(() => ({ me: null as any }));
vi.mock("@/lib/session", async (orig) => ({
  ...(await orig<any>()),
  getAccessToken: () => "test-token",
  getRefreshToken: () => null,
  refreshAccessToken: async () => false,
}));
vi.mock("@/api/services/auth.service", () => ({ authService: { getMe: async () => sess.me, logout: async () => ({}) } }));

const items = vi.hoisted(() => ({ list: [] as any[] }));
vi.mock("@/api/services/mainsidebar.service", () => ({
  mainSidebarService: { getSidebarItems: vi.fn(async () => items.list), reorderSidebarItems: vi.fn(async () => []) },
}));
vi.mock("@/api/services/quotationType.service", () => ({
  quotationTypeService: { getQuotationTypes: vi.fn(async () => []), reorderQuotationTypes: vi.fn(async () => []) },
}));
vi.mock("@/hrms/services/hrmsbranchService", () => ({ hrmsbranchService: { getMyScope: vi.fn(async () => ({ isSupervisor: false })) } }));
vi.mock("@/api/services/settings.service", () => ({ settingsService: { updateSettings: vi.fn(async () => ({})) } }));
vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({ getSetting: (k: string, d: any) => (k === "companyName" ? "Test Co" : d), settings: {}, refreshSettings: vi.fn() }),
}));
const notif = vi.hoisted(() => ({ chat: 0 }));
vi.mock("@/context/NotificationContext", () => ({
  useNotificationContext: () => ({ chatUnreadCount: notif.chat, notifications: [], unreadCount: 0 }),
}));

import { PermissionProvider } from "@/context/PermissionContext";
import { AppSidebar } from "../components/layout/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// ---------- fixtures ----------
const it_ = (id: string, title: string, url: string, group: string, permission = "", icon = "Circle") => ({ _id: id, title, url, group, permission, icon, active: true, order: Number(id.replace(/\D/g, "")) || 0 });
const MENU = [
  it_("m1", "Dashboard", "/admin/dashboard", "Main"),
  it_("m2", "Chat", "/admin/chat", "Main", "Chat"),
  it_("m3", "Customers", "/admin/customers", "Customers", "Customers"),
  it_("m4", "Invoices", "/admin/invoices", "Sales", "Invoices"),
  it_("m5", "Tasks", "/admin/tasks", "Management", "Tasks"),
  it_("m6", "Leads", "/admin/leads", "Management", "Leads"),
  it_("m7", "Announcements", "/admin/announcements", "Utilities", "Announcements"),
  it_("m8", "Master Dashboard", "/admin/reports/master", "Reports", "Reports"),
  it_("m9", "Staff Directory", "/admin/hrms/staff/users", "HRMS", "HRMS Staff Directory"),
  it_("m10", "My Attendance", "/admin/hrms/staff/attendance", "HRMS"),
];

const V = { "View(Global)": true };
const FULL = { "View(Global)": true, Create: true, Edit: true, Delete: true };
const ADMIN_USER = { _id: "u-admin", firstname: "Ada", lastname: "Admin", email: "a@t.local", admin: true, tenant: { status: "active" } };
const staffUser = (role: any = { _id: "r1", name: "Sales Executive" }, extra: any = {}) => ({ _id: "u-staff", firstname: "Sam", lastname: "Staff", email: "s@t.local", admin: false, role, tenant: { status: "active" }, ...extra });

type Opts = { user: any; perms?: Record<string, any>; plan?: Record<string, boolean> | null; path?: string; open?: boolean; withTrigger?: boolean };
function renderSidebar({ user, perms = {}, plan = null, path = "/admin/dashboard", open = true, withTrigger = false }: Opts) {
  localStorage.clear();
  localStorage.setItem("crm_user", JSON.stringify(user));
  localStorage.setItem("crm_permissions", JSON.stringify(perms));
  if (plan) localStorage.setItem("crm_plan_modules", JSON.stringify(plan));
  sess.me = { user, permissions: perms, plan_modules: plan };
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <PermissionProvider>
        <MemoryRouter initialEntries={[path]}>
          <SidebarProvider defaultOpen={open}>
            {withTrigger && <SidebarTrigger data-testid="hamburger" />}
            <AppSidebar />
          </SidebarProvider>
        </MemoryRouter>
      </PermissionProvider>
    </QueryClientProvider>,
  );
}
const ready = () => screen.findByText("Dashboard");
const has = (t: string) => screen.queryByText(t) !== null;

beforeEach(() => { items.list = MENU.map((i) => ({ ...i })); notif.chat = 0; Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1440 }); });
afterEach(() => { cleanup(); localStorage.clear(); });

// ===================== visibility by user type =====================
describe("[UI] item visibility per user type", () => {
  it("admin: every module, Setup and Subscription Details", async () => {
    renderSidebar({ user: ADMIN_USER });
    await ready();
    for (const t of ["Chat", "Customers", "Tasks", "Leads", "Sales", "HRMS", "Utilities", "Reports", "Setup", "Subscription Details"]) {
      expect(has(t), t).toBe(true);
    }
  });
  it("full staff (Chat, Customers, Tasks, Leads, Invoices, Settings): sees exactly those + Setup; links use /staff", async () => {
    renderSidebar({ user: staffUser(), perms: { Chat: FULL, Customers: FULL, Tasks: FULL, Leads: FULL, Invoices: FULL, Settings: FULL } });
    await ready();
    for (const t of ["Chat", "Customers", "Tasks", "Leads", "Sales", "Setup"]) expect(has(t), t).toBe(true);
    expect(has("Reports")).toBe(false);
    expect(has("Subscription Details")).toBe(false);
    expect(screen.getByText("Tasks").closest("a")?.getAttribute("href")).toBe("/staff/tasks");
  });
  it("view-only staff (Tasks View only): Dashboard + Tasks; no Chat/Customers/Leads/Sales/Setup", async () => {
    renderSidebar({ user: staffUser(), perms: { Tasks: V } });
    await ready();
    expect(has("Tasks")).toBe(true);
    for (const t of ["Chat", "Customers", "Leads", "Sales", "Utilities", "Reports", "Setup", "Subscription Details"]) expect(has(t), t).toBe(false);
  });
  it("no-access staff: only Dashboard (and personal HRMS pages), no Setup", async () => {
    renderSidebar({ user: staffUser(), perms: {} });
    await ready();
    for (const t of ["Chat", "Customers", "Tasks", "Leads", "Sales", "Setup"]) expect(has(t), t).toBe(false);
  });
  it("HRMS-only staff (only HRMS permissions): Dashboard + HRMS only", async () => {
    renderSidebar({ user: staffUser({ _id: "r2", name: "HRMS" }), perms: { "HRMS Staff Directory": V, "HRMS Attendance": V } });
    await ready();
    expect(has("HRMS")).toBe(true);
    for (const t of ["Chat", "Customers", "Leads", "Sales", "Utilities", "Reports", "Setup", "Subscription Details"]) expect(has(t), t).toBe(false);
  });
  it("is_hrms_staff flag also limits the menu to Dashboard + HRMS even with other permissions", async () => {
    renderSidebar({ user: staffUser(undefined, { is_hrms_staff: true }), perms: { Chat: V, Customers: V } });
    await ready();
    expect(has("Chat")).toBe(false);
    expect(has("Customers")).toBe(false);
  });
  it("[Security] staff whose ROLE NAME contains 'admin' ('Admin Assistant') still only sees what their permissions allow", async () => {
    renderSidebar({ user: staffUser({ _id: "r3", name: "Admin Assistant" }), perms: { Tasks: V } });
    await ready();
    expect(has("Tasks")).toBe(true);
    expect(has("Customers")).toBe(false);
    expect(has("Setup")).toBe(false);
  });
  it("plan with chat, leads and hrms OFF: those items disappear even for the admin", async () => {
    renderSidebar({ user: ADMIN_USER, plan: { chat: false, leads: false, hrms: false } });
    await ready();
    expect(has("Chat")).toBe(false);
    expect(has("Leads")).toBe(false);
    expect(has("HRMS")).toBe(false);
    expect(has("Tasks")).toBe(true);
  });
  it("plan past the 7-day grace: menu is locked (no module links)", async () => {
    const ended = new Date(Date.now() - 20 * 86400000).toISOString();
    renderSidebar({ user: { ...ADMIN_USER, tenant: { status: "active", billing_cycle_end: ended } } });
    await screen.findByText("Test Co");
    await waitFor(() => expect(has("Tasks")).toBe(false));
    expect(has("Chat")).toBe(false);
  });
});

// ===================== active state & setup mode =====================
describe("[UI] active highlight and Setup mode", () => {
  it("on /admin/tasks the Tasks link is highlighted and Dashboard is not", async () => {
    renderSidebar({ user: ADMIN_USER, path: "/admin/tasks" });
    const tasks = await screen.findByText("Tasks");
    expect(tasks.closest("a")).toHaveClass("sidebar-active-item");
    expect(screen.getByText("Dashboard").closest("a")).not.toHaveClass("sidebar-active-item");
  });
  it("staff on /staff/leads: Leads highlighted", async () => {
    renderSidebar({ user: staffUser(), perms: { Leads: V }, path: "/staff/leads" });
    expect((await screen.findByText("Leads")).closest("a")).toHaveClass("sidebar-active-item");
  });
  it("admin: Setup → Setup Menu with Back to Main; Back returns to the main menu", async () => {
    renderSidebar({ user: ADMIN_USER });
    await ready();
    fireEvent.click(screen.getByText("Setup"));
    expect(await screen.findByText("Back to Main")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Back to Main"));
    expect(await screen.findByText("Tasks")).toBeInTheDocument();
  });
  it("staff WITHOUT Settings who opens a /staff/setup/... URL does not get the Setup Menu", async () => {
    renderSidebar({ user: staffUser(), perms: { Tasks: V }, path: "/staff/setup/settings" });
    await screen.findByText("Test Co");
    await new Promise((r) => setTimeout(r, 50));
    expect(has("Setup Menu")).toBe(false);
    expect(has("Back to Main")).toBe(false);
  });
  it("admin (Settings Edit) gets drag handles to reorder the menu", async () => {
    renderSidebar({ user: ADMIN_USER });
    await ready();
    await waitFor(() => expect(document.querySelector('[aria-roledescription="sortable"]')).not.toBeNull());
  });
  it("drag handles are not offered to staff without Settings Edit", async () => {
    renderSidebar({ user: staffUser(), perms: { Tasks: V, Chat: V } });
    await ready();
    expect(document.querySelector('[aria-roledescription="sortable"]')).toBeNull();
  });
});

// ===================== Chat unread badge =====================
describe("[UI] Chat unread badge", () => {
  it("shows the unread count next to Chat", async () => {
    notif.chat = 3;
    renderSidebar({ user: ADMIN_USER });
    const chat = await screen.findByText("Chat");
    expect(chat.closest("a")?.textContent).toContain("3");
  });
  it("no badge when there is nothing unread", async () => {
    renderSidebar({ user: ADMIN_USER });
    const chat = await screen.findByText("Chat");
    expect(chat.closest("a")?.textContent).toBe("Chat");
  });
  it("badge still shows when the company renamed the Chat item (badge keyed on the page, not the title)", async () => {
    notif.chat = 4;
    items.list = MENU.map((i) => (i.url === "/admin/chat" ? { ...i, title: "Team Chat" } : { ...i }));
    renderSidebar({ user: ADMIN_USER });
    const chat = await screen.findByText("Team Chat");
    expect(chat.closest("a")?.textContent).toContain("4");
  });
  it("collapsed icon rail still signals unread chat", async () => {
    notif.chat = 2;
    renderSidebar({ user: ADMIN_USER, open: false });
    await waitFor(() => expect(document.querySelector('a[href="/admin/chat"]')).not.toBeNull());
    const link = document.querySelector('a[href="/admin/chat"]') as HTMLElement;
    expect(link.textContent).toContain("2");
  });
});

// ===================== mobile drawer =====================
describe("[UI] mobile drawer (375px)", () => {
  beforeEach(() => { Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 375 }); });
  it("menu is hidden until the hamburger is tapped, then opens as a drawer", async () => {
    renderSidebar({ user: ADMIN_USER, withTrigger: true });
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(has("Tasks")).toBe(false);
    fireEvent.click(screen.getByTestId("hamburger"));
    expect(await screen.findByText("Tasks")).toBeInTheDocument();
    expect(document.querySelector('[data-mobile="true"]')).not.toBeNull();
  });
  it("tapping a menu link closes the drawer", async () => {
    renderSidebar({ user: ADMIN_USER, withTrigger: true });
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    fireEvent.click(screen.getByTestId("hamburger"));
    fireEvent.click(await screen.findByText("Tasks"));
    await waitFor(() => expect(document.querySelector('[data-mobile="true"]')).toBeNull());
  });
  it("Escape closes the drawer", async () => {
    renderSidebar({ user: ADMIN_USER, withTrigger: true });
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    fireEvent.click(screen.getByTestId("hamburger"));
    await screen.findByText("Tasks");
    fireEvent.keyDown(document.activeElement || document.body, { key: "Escape" });
    await waitFor(() => expect(document.querySelector('[data-mobile="true"]')).toBeNull());
  });
});

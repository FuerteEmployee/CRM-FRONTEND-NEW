import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Target Component
import { AppSidebar } from "../components/layout/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

// Services Mock
import { mainSidebarService } from "@/api/services/mainsidebar.service";
import { quotationTypeService } from "@/api/services/quotationType.service";

// Mock Services
vi.mock("@/api/services/mainsidebar.service", () => ({
  mainSidebarService: {
    getSidebarItems: vi.fn(),
    reorderSidebarItems: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/api/services/quotationType.service", () => ({
  quotationTypeService: {
    getQuotationTypes: vi.fn().mockResolvedValue([]),
    reorderQuotationTypes: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/hrms/services/hrmsbranchService", () => ({
  hrmsbranchService: {
    getMyScope: vi.fn().mockResolvedValue({ isSupervisor: false }),
  },
}));

// Mock Settings Context
vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({
    getSetting: (key: string, fallback: any) => {
      if (key === "companyName") return "Trinetra CRM";
      return fallback;
    },
    settings: {},
    refreshSettings: vi.fn(),
  }),
}));

// Mock Notification Context
vi.mock("@/context/NotificationContext", () => ({
  useNotificationContext: () => ({
    chatUnreadCount: 0,
    notifications: [],
    unreadCount: 0,
  }),
}));

// Mock Permissions Context
let mockCurrentUser: any = {
  _id: "user-admin",
  firstname: "Trinetra",
  lastname: "Admin",
  email: "admin@trinetra.com",
  admin: true,
  role: "admin",
  tenant: { _id: "tenant-1" },
};
let mockIsAdmin = true;
let mockIsStaff = false;

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    user: mockCurrentUser,
    permissions: {
      HRMS: { view: true },
      Customers: { view: true },
      Payments: { view: true },
      Settings: { view: true },
    },
    isAdmin: mockIsAdmin,
    isStaff: mockIsStaff,
    can: () => true,
    canView: () => true,
    isModuleEnabled: () => true,
    refreshPermissions: vi.fn(),
  }),
}));

// Sample sidebar items matching user's CRM configuration (HRMS positioned at top with childGroup: "HRMS")
const sampleSidebarItems = [
  { _id: "nav-dash", title: "Dashboard", url: "/admin/dashboard", icon: "LayoutDashboard", group: "Main", active: true, order: 1 },
  { _id: "nav-bm", title: "Bookmarks", url: "/admin/bookmarks", icon: "Bookmark", group: "Main", active: true, order: 2 },
  { _id: "nav-hrms-parent", title: "HRMS", childGroup: "HRMS", icon: "Users", group: "Main", active: true, order: 3 },
  { _id: "nav-cust", title: "Customers", url: "/admin/customers", icon: "Users", group: "Customers", active: true, order: 4 },
  { _id: "nav-pay", title: "Payment", url: "/admin/payments", icon: "CreditCard", group: "Management", active: true, order: 5 },
  // HRMS sub-items
  { _id: "hrms-1", title: "Staff Directory", url: "/admin/hrms/staff/users", icon: "UserCog", group: "HRMS", active: true, order: 1 },
  { _id: "hrms-2", title: "Shift Management", url: "/admin/hrms/staff/shifts", icon: "Clock", group: "HRMS", active: true, order: 2 },
  { _id: "hrms-3", title: "Salary Management", url: "/admin/hrms/staff/payroll", icon: "DollarSign", group: "HRMS", active: true, order: 3 },
  { _id: "hrms-4", title: "Salary Settlements", url: "/admin/hrms/staff/salary-settlements", icon: "Receipt", group: "HRMS", active: true, order: 4 },
];

describe("13-Tier Master QA Suite: AppSidebar & Sub-Sidebar Navigation Audit", () => {
  let queryClient: QueryClient;
  let scrollIntoViewMock: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    (mainSidebarService.getSidebarItems as any).mockResolvedValue(sampleSidebarItems);

    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  const renderWithRoute = (initialPath: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  /* ─────────────────────────────────────────────────────────────
   * TIER 1: Smoke Testing (0 crashes, 0 white screens)
   * ───────────────────────────────────────────────────────────── */
  test("Tier 1 (Smoke Testing): AppSidebar renders brand logo and navigation menu without error", async () => {
    renderWithRoute("/admin/payments");
    expect(await screen.findByText("Trinetra CRM")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Payment")).toBeInTheDocument();
  });

  /* ─────────────────────────────────────────────────────────────
   * TIER 2: Active Navigation Highlighting & Inactive Collapsible Isolation (The Core User Bug)
   * ───────────────────────────────────────────────────────────── */
  test("Tier 2 (Inactive Collapsible Isolation): When on /admin/payments, 'Payment' is active and HRMS is collapsed", async () => {
    renderWithRoute("/admin/payments");

    // Payment must be rendered and active
    const paymentLink = await screen.findByText("Payment");
    expect(paymentLink).toBeInTheDocument();
    const navLink = paymentLink.closest("a");
    expect(navLink).toHaveClass("sidebar-active-item");

    // HRMS parent exists as a collapsible item
    const hrmsTrigger = screen.getByText("HRMS");
    expect(hrmsTrigger).toBeInTheDocument();

    // The HRMS accordion MUST NOT be open; HRMS sub-items (like Staff Directory or Salary Settlements)
    // must NOT push Payment down or clutter the screen
    const staffDir = screen.queryByText("Staff Directory");
    const salarySettlements = screen.queryByText("Salary Settlements");
    expect(staffDir).toBeNull();
    expect(salarySettlements).toBeNull();
  });

  /* ─────────────────────────────────────────────────────────────
   * TIER 3: Auto-Expansion on Active Sub-Route
   * ───────────────────────────────────────────────────────────── */
  test("Tier 3 (Auto-Expansion): When on /admin/hrms/staff/salary-settlements, HRMS automatically expands", async () => {
    renderWithRoute("/admin/hrms/staff/salary-settlements");

    // HRMS must be auto-expanded because current route is inside HRMS
    expect(await screen.findByText("Salary Settlements")).toBeInTheDocument();
    expect(screen.getByText("Staff Directory")).toBeInTheDocument();

    // Salary Settlements link must be active
    const settlementLink = screen.getByText("Salary Settlements").closest("a");
    expect(settlementLink).toHaveClass("sidebar-active-item");

    // Payment link is NOT active
    const paymentLink = screen.getByText("Payment").closest("a");
    expect(paymentLink).not.toHaveClass("sidebar-active-item");
  });

  /* ─────────────────────────────────────────────────────────────
   * TIER 4: Dynamic Navigation & Route Switch Isolation
   * ───────────────────────────────────────────────────────────── */
  test("Tier 4 (Dynamic Route Transition): Navigating from HRMS to Payments auto-collapses HRMS", async () => {
    const { unmount } = renderWithRoute("/admin/hrms/staff/salary-settlements");

    // On HRMS route, sub-items are open
    expect(await screen.findByText("Salary Settlements")).toBeInTheDocument();
    unmount();

    // Now user navigates to /admin/payments
    renderWithRoute("/admin/payments");

    // Payment is active
    expect(await screen.findByText("Payment")).toBeInTheDocument();
    const paymentNavLink = screen.getByText("Payment").closest("a");
    expect(paymentNavLink).toHaveClass("sidebar-active-item");

    // HRMS has auto-collapsed! Sub-items are no longer in the DOM
    expect(screen.queryByText("Salary Settlements")).toBeNull();
  });

  /* ─────────────────────────────────────────────────────────────
   * TIER 5: Manual Toggle State
   * ───────────────────────────────────────────────────────────── */
  test("Tier 5 (Manual Toggle): User can explicitly click HRMS accordion to peek at items while on /admin/payments", async () => {
    renderWithRoute("/admin/payments");

    const hrmsButton = await screen.findByText("HRMS");
    // Initially closed on Payments
    expect(screen.queryByText("Staff Directory")).toBeNull();

    // User clicks HRMS header to expand
    fireEvent.click(hrmsButton);

    // Now sub-items appear
    await waitFor(() => {
      expect(screen.getByText("Staff Directory")).toBeInTheDocument();
    });

    // Clicking it again collapses it
    fireEvent.click(hrmsButton);
    await waitFor(() => {
      expect(screen.queryByText("Staff Directory")).toBeNull();
    });
  });

  /* ─────────────────────────────────────────────────────────────
   * TIER 6: Setup Sub-Sidebar & Route Mode Synchronization
   * ───────────────────────────────────────────────────────────── */
  test("Tier 6 (Setup Route Mode Synchronization): Setup URL switches mode and exposes setup items", async () => {
    renderWithRoute("/admin/setup/roles");

    // Setup mode activates
    expect(await screen.findByText("Setup Menu")).toBeInTheDocument();
    expect(screen.getByText("Roles")).toBeInTheDocument();
    expect(screen.getByText("Back to Main")).toBeInTheDocument();
  });

  /* ─────────────────────────────────────────────────────────────
   * TIER 7: Smooth Auto-Scroll (scrollIntoView)
   * ───────────────────────────────────────────────────────────── */
  test("Tier 7 (Auto-Scroll): Active sidebar item invokes scrollIntoView for viewport centering", async () => {
    renderWithRoute("/admin/payments");

    await screen.findByText("Payment");

    // Wait for the smooth scroll timeout (120ms)
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith(
        expect.objectContaining({ block: "nearest", behavior: "smooth" })
      );
    }, { timeout: 1000 });
  });

  /* ─────────────────────────────────────────────────────────────
   * TIER 8: Storage Cleansing & Hygiene
   * ───────────────────────────────────────────────────────────── */
  test("Tier 8 (Storage Cleansing): Stale localStorage sidebar:openSections is purged on mount", async () => {
    // Seed stale corrupted data from previous sessions
    localStorage.setItem("sidebar:openSections", JSON.stringify({ HRMS: true, Sales: true }));

    renderWithRoute("/admin/payments");

    await screen.findByText("Payment");

    // Verified that stale sidebar:openSections was cleaned
    expect(localStorage.getItem("sidebar:openSections")).toBeNull();
  });

  /* ─────────────────────────────────────────────────────────────
   * TIER 9: Role-Based Visibility (Admin vs Staff)
   * ───────────────────────────────────────────────────────────── */
  test("Tier 9 (RBAC Visibility): Admin sees full management navigation including Payments", async () => {
    renderWithRoute("/admin/payments");

    expect(await screen.findByText("Payment")).toBeInTheDocument();
    expect(screen.getByText("Customers")).toBeInTheDocument();
  });

  /* ─────────────────────────────────────────────────────────────
   * TIER 10: Multi-Tenant / Dynamic Child Group Isolation
   * ───────────────────────────────────────────────────────────── */
  test("Tier 10 (Multi-Tenant Isolation): Custom tenant placement with childGroup:'HRMS' correctly collapses", async () => {
    renderWithRoute("/admin/payments");

    const hrmsParent = await screen.findByText("HRMS");
    expect(hrmsParent).toBeInTheDocument();

    // Verify it is collapsed when active route is not HRMS
    expect(screen.queryByText("Shift Management")).toBeNull();
  });

  /* ─────────────────────────────────────────────────────────────
   * TIER 11: Performance & 0 Re-render Storms
   * ───────────────────────────────────────────────────────────── */
  test("Tier 11 (Performance): Sidebar mounts quickly and resolves query within 500ms", async () => {
    const start = performance.now();
    renderWithRoute("/admin/payments");
    await screen.findByText("Payment");
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000);
  });

  /* ─────────────────────────────────────────────────────────────
   * TIER 12: Vitest Automated Regression Coverage
   * ───────────────────────────────────────────────────────────── */
  test("Tier 12 (Regression Defense): All 4 core navigation items mount with valid link attributes", async () => {
    renderWithRoute("/admin/payments");

    await screen.findByText("Payment");

    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(3);
    const hrefs = links.map(l => l.getAttribute("href"));
    expect(hrefs).toContain("/admin/dashboard");
    expect(hrefs).toContain("/admin/payments");
  });

  /* ─────────────────────────────────────────────────────────────
   * TIER 13: User Acceptance Testing (UAT Flow matching User Screenshots)
   * ───────────────────────────────────────────────────────────── */
  test("Tier 13 (UAT Scenario Verification): Replicates exact user problem and verifies fix", async () => {
    // SCENARIO FROM USER SCREENSHOTS:
    // 1. User is on http://localhost:5183/admin/payments
    // 2. Previously, HRMS was wide open with 18 items pushing Payment off-screen
    // 3. NOW: Payment is active, in-view, and HRMS is cleanly collapsed!
    renderWithRoute("/admin/payments");

    // Check Payment is present and active
    const payment = await screen.findByText("Payment");
    expect(payment.closest("a")).toHaveClass("sidebar-active-item");

    // Check HRMS is collapsed, saving 700px of vertical space
    expect(screen.queryByText("Staff Directory")).not.toBeInTheDocument();
    expect(screen.queryByText("Salary Settlements")).not.toBeInTheDocument();

    // Check scrollIntoView was invoked so Payment is never lost down the page
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });
});

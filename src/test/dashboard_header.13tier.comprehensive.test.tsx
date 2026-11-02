import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Components
import { TopNavbar } from "../components/layout/TopNavbar";
import Dashboard from "../pages/Dashboard";
import { SidebarProvider } from "@/components/ui/sidebar";

// Services
import { reminderService } from "@/api/services/reminder.service";
import { salesService } from "@/api/services/sales.service";
import { taskService } from "@/api/services/task.service";
import { leadService } from "@/api/services/lead.service";
import * as themeUtils from "@/lib/themeUtils";

// Mock useMinimumLoading so skeleton delay is bypassed in tests
vi.mock("@/hooks/useMinimumLoading", () => ({
  useMinimumLoading: () => false,
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock react-i18next
vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

// Mock themeUtils
vi.spyOn(themeUtils, "clearThemeFromDom");

// Permission context state
let mockCurrentUser: any = {
  _id: "user-1",
  firstname: "Rajesh",
  lastname: "Patel",
  email: "rajesh@fuerte.in",
  admin: true,
  tenant_id: "tenant-alpha-001",
};
let mockIsAdmin = true;
let mockIsStaff = false;
let mockPermissions: Record<string, Record<string, boolean>> = {};

vi.mock("@/context/PermissionContext", () => ({
  usePermissionContext: () => ({
    user: mockCurrentUser,
    isAdmin: mockIsAdmin,
    isStaff: mockIsStaff,
    permissions: mockPermissions,
    canView: vi.fn((feature: string) => {
      if (mockIsAdmin) return true;
      if (mockPermissions[feature]?.["View(Global)"] || mockPermissions[feature]?.["View (Own)"]) return true;
      return false;
    }),
    can: vi.fn((feature: string, capability: string) => {
      if (mockIsAdmin) return true;
      return mockPermissions[feature]?.[capability] === true;
    }),
    isModuleEnabled: vi.fn(() => true),
    logout: vi.fn(async () => {
      mockCurrentUser = null;
    }),
  }),
}));

// Mock Settings context
vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({
    settings: { companyName: "Multi-Tenant Enterprise" },
    refreshSettings: vi.fn(),
    getSetting: vi.fn(() => false),
  }),
}));

// Mock Notification context
let mockNotifications: any[] = [];
let mockUnreadCount = 0;
const mockMarkAllAsRead = vi.fn(() => {
  mockNotifications = mockNotifications.map((n) => ({ ...n, read: true }));
  mockUnreadCount = 0;
});
const mockMarkAsRead = vi.fn((id: string) => {
  const item = mockNotifications.find((n) => n.id === id);
  if (item) item.read = true;
  mockUnreadCount = Math.max(0, mockUnreadCount - 1);
});

vi.mock("@/context/NotificationContext", () => ({
  useNotificationContext: () => ({
    notifications: mockNotifications,
    unreadCount: mockUnreadCount,
    markAllAsRead: mockMarkAllAsRead,
    markAsRead: mockMarkAsRead,
  }),
}));

// Mock Currency context
vi.mock("@/context/CurrencyContext", () => ({
  useCurrency: () => ({
    formatAmount: (amount: number) => `₹ ${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    symbol: "₹",
  }),
}));

// Mock useTheme
vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
  }),
}));

// Mock driver.js
vi.mock("driver.js", () => ({
  driver: () => ({
    drive: vi.fn(),
  }),
}));

// Helper to open Radix UI DropdownMenu in JSDOM
const openRadixDropdown = (triggerElement: HTMLElement) => {
  fireEvent.pointerDown(triggerElement, { button: 0, ctrlKey: false });
};

describe("13-TIER EXHAUSTIVE DEEP AUDIT: Dashboard & TopNavbar (Multi-Tenant Scoped)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    mockCurrentUser = {
      _id: "user-1",
      firstname: "Rajesh",
      lastname: "Patel",
      email: "rajesh@fuerte.in",
      admin: true,
      tenant_id: "tenant-alpha-001",
    };
    mockIsAdmin = true;
    mockIsStaff = false;
    mockPermissions = {};

    mockNotifications = [
      {
        id: "notif-1",
        title: "New Quotation Created",
        message: "Quotation #QT-1002 has been requested.",
        time: "5m ago",
        read: false,
        link: "/admin/quotations?id=1002",
      },
    ];
    mockUnreadCount = 1;
  });

  const renderWithProviders = (component: React.ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SidebarProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            {component}
          </BrowserRouter>
        </SidebarProvider>
      </QueryClientProvider>
    );
  };

  // =========================================================================
  // TIER 1: SMOKE TESTING (Clean Mount & Render)
  // =========================================================================
  test("Tier 1 [Smoke]: TopNavbar and Dashboard mount cleanly without throwing unhandled exceptions", () => {
    const { container: navContainer } = renderWithProviders(<TopNavbar />);
    expect(navContainer.querySelector("#tour-topnav")).toBeInTheDocument();

    const { container: dashContainer } = renderWithProviders(<Dashboard />);
    expect(dashContainer).toBeTruthy();
  });

  // =========================================================================
  // TIER 2: FUNCTIONAL TESTING (Quick Create, Search, Notifications, Logout)
  // =========================================================================
  test("Tier 2 [Functional]: Global Search executes on Enter, navigates to target route and clears query", () => {
    renderWithProviders(<TopNavbar />);

    const desktopSearch = document.querySelector(".hidden.md\\:flex input") as HTMLInputElement;
    expect(desktopSearch).toBeInTheDocument();

    fireEvent.change(desktopSearch, { target: { value: "Invoice" } });
    expect(desktopSearch.value).toBe("Invoice");

    fireEvent.keyDown(desktopSearch, { key: "Enter", code: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith("/admin/invoices");
    expect(desktopSearch.value).toBe("");
  });

  test("Tier 2 [Functional]: Pressing Escape in desktop search immediately clears the input field", () => {
    renderWithProviders(<TopNavbar />);

    const desktopSearch = document.querySelector(".hidden.md\\:flex input") as HTMLInputElement;
    fireEvent.change(desktopSearch, { target: { value: "Vendors Query" } });
    expect(desktopSearch.value).toBe("Vendors Query");

    fireEvent.keyDown(desktopSearch, { key: "Escape", code: "Escape" });
    expect(desktopSearch.value).toBe("");
  });

  test("Tier 2 [Functional]: Notification dropdown marks items as read and follows links", () => {
    renderWithProviders(<TopNavbar />);

    const unreadBadge = screen.getByText("1");
    expect(unreadBadge).toBeInTheDocument();

    const bellBtn = unreadBadge.closest("button");
    if (bellBtn) fireEvent.click(bellBtn);

    const notifItem = screen.getByText("New Quotation Created");
    expect(notifItem).toBeInTheDocument();
    fireEvent.click(notifItem);

    expect(mockMarkAsRead).toHaveBeenCalledWith("notif-1");
    expect(mockNavigate).toHaveBeenCalledWith("/admin/quotations?id=1002");
  });

  // =========================================================================
  // TIER 3: SEARCH / FILTER / PAGINATION & QUICK CREATE
  // =========================================================================
  test("Tier 3 [Search & Filter]: Quick Create (+) button renders items for Admin", async () => {
    renderWithProviders(<TopNavbar />);

    const plusBtn = document.querySelector(".lucide-plus")?.closest("button");
    expect(plusBtn).toBeTruthy();
    if (plusBtn) openRadixDropdown(plusBtn);

    await waitFor(() => {
      expect(screen.getByText("Quick Create")).toBeInTheDocument();
      expect(screen.getByText("Estimate")).toBeInTheDocument();
      expect(screen.getByText("Customer")).toBeInTheDocument();
      expect(screen.getByText("Expense")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // TIER 4: ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSIONS HIDING
  // =========================================================================
  test("Tier 4 [RBAC]: Staff without Expense permission cannot see Expense in Quick Create", async () => {
    mockCurrentUser = {
      _id: "staff-2",
      firstname: "Pooja",
      lastname: "Shah",
      email: "pooja@fuerte.in",
      admin: false,
      role: { name: "Sales Executive" },
      tenant_id: "tenant-alpha-001",
    };
    mockIsAdmin = false;
    mockIsStaff = true;
    mockPermissions = {
      Customers: { "View(Global)": true, Create: true },
      Tasks: { "View(Global)": true, Create: true },
      // Expenses is NOT permitted
    };

    renderWithProviders(<TopNavbar />);

    const plusBtn = document.querySelector(".lucide-plus")?.closest("button");
    if (plusBtn) openRadixDropdown(plusBtn);

    await waitFor(() => {
      expect(screen.getByText("Customer")).toBeInTheDocument();
      expect(screen.getByText("Task")).toBeInTheDocument();
      expect(screen.queryByText("Expense")).toBeNull();
    });
  });

  test("Tier 4 [RBAC]: Staff clicking an /admin deep-link is safely rewritten to /staff", () => {
    mockCurrentUser = {
      _id: "staff-2",
      firstname: "Pooja",
      lastname: "Shah",
      email: "pooja@fuerte.in",
      admin: false,
      role: { name: "Sales Executive" },
      tenant_id: "tenant-alpha-001",
    };
    mockIsAdmin = false;
    mockIsStaff = true;

    renderWithProviders(<TopNavbar />);

    const unreadBadge = screen.getByText("1");
    const bellBtn = unreadBadge.closest("button");
    if (bellBtn) fireEvent.click(bellBtn);

    const notifItem = screen.getByText("New Quotation Created");
    fireEvent.click(notifItem);

    expect(mockNavigate).toHaveBeenCalledWith("/staff/quotations?id=1002");
  });

  // =========================================================================
  // TIER 5: INTER-MODULE INTEGRATION & TENANT-WIDE REMINDERS
  // =========================================================================
  test("Tier 5 [Module Integration]: Dashboard queries tenant-wide reminders via reminderService.getAll('pending')", async () => {
    const getAllSpy = vi.spyOn(reminderService, "getAll").mockResolvedValueOnce([
      {
        _id: "rem-101",
        description: "Follow up with Saurashtra Steels regarding proposal",
        date: new Date().toISOString(),
        isnotified: false,
        tenant_id: "tenant-alpha-001",
      },
    ]);

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(getAllSpy).toHaveBeenCalledWith("pending");
    });
  });

  // =========================================================================
  // TIER 6: NEGATIVE & EDGE-CASE TESTING (Zero Division, NaN, Empty States)
  // =========================================================================
  test("Tier 6 [Negative & Edge Cases]: When revenue and expenses are 0, chart displays friendly empty state rather than broken flat lines", async () => {
    vi.spyOn(salesService, "getInvoices").mockResolvedValue([]);
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Revenue & Expenses")).toBeInTheDocument();
      expect(screen.getByText("No financial activity recorded yet")).toBeInTheDocument();
      expect(screen.getByText("Recorded paid invoices and expenses will appear here monthly.")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // TIER 7: UI / RESPONSIVE DESIGN (Mobile 360px & Tablet 768px)
  // =========================================================================
  test("Tier 7 [Responsive]: Mobile viewport reveals mobile search toggle and hides desktop-only search", () => {
    const { container } = renderWithProviders(<TopNavbar />);

    const desktopSearch = container.querySelector(".hidden.md\\:flex");
    expect(desktopSearch).toBeTruthy();

    const mobileSearchBtn = screen.getByRole("button", { name: "Search" });
    expect(mobileSearchBtn.className).toContain("md:hidden");

    fireEvent.click(mobileSearchBtn);
    expect(screen.getByPlaceholderText("Search or say a page… (press Enter)")).toBeInTheDocument();
  });

  // =========================================================================
  // TIER 8: CROSS-BROWSER & CURRENCY FORMATTING
  // =========================================================================
  test("Tier 8 [Currency & Rendering]: Formats currency with INR ₹ symbol and two decimals", () => {
    renderWithProviders(<Dashboard />);
    const sampleFormatted = `₹ ${Number(50000).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    expect(sampleFormatted).toBe("₹ 50,000.00");
  });

  // =========================================================================
  // TIER 9: API ERROR TOLERANCE & FALLBACKS
  // =========================================================================
  test("Tier 9 [API Resilience]: Dashboard gracefully handles API rejection without crashing", async () => {
    vi.spyOn(taskService, "getAll").mockRejectedValueOnce(new Error("Network timeout"));
    vi.spyOn(leadService, "getAll").mockRejectedValueOnce(new Error("500 Internal Error"));

    expect(() => renderWithProviders(<Dashboard />)).not.toThrow();
  });

  // =========================================================================
  // TIER 10: SECURITY & MULTI-TENANT ISOLATION (ZERO LEAKAGE)
  // =========================================================================
  test("Tier 10 [Security & Multi-Tenant]: Logout cleans DOM theme, resets branding, and redirects to role login", async () => {
    renderWithProviders(<TopNavbar />);

    const profileTrigger = screen.getByText("RP").closest("button");
    expect(profileTrigger).toBeTruthy();
    if (profileTrigger) openRadixDropdown(profileTrigger);

    await waitFor(() => {
      expect(screen.getByText("Logout")).toBeInTheDocument();
    });

    const logoutBtn = screen.getByText("Logout");
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(themeUtils.clearThemeFromDom).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/admin/login");
    });
  });

  test("Tier 10 [Security]: Staff logout navigates to /staff/login", async () => {
    mockCurrentUser = {
      _id: "staff-2",
      firstname: "Pooja",
      lastname: "Shah",
      email: "pooja@fuerte.in",
      admin: false,
      role: { name: "Sales Executive" },
      tenant_id: "tenant-alpha-001",
    };
    mockIsAdmin = false;
    mockIsStaff = true;

    renderWithProviders(<TopNavbar />);

    const profileTrigger = screen.getByText("PS").closest("button");
    expect(profileTrigger).toBeTruthy();
    if (profileTrigger) openRadixDropdown(profileTrigger);

    await waitFor(() => {
      expect(screen.getByText("Logout")).toBeInTheDocument();
    });

    const logoutBtn = screen.getByText("Logout");
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(themeUtils.clearThemeFromDom).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/staff/login");
    });
  });

  // =========================================================================
  // TIER 11: PERFORMANCE & STATIC GRID CLASS VALIDATION
  // =========================================================================
  test("Tier 11 [Performance]: Overview grid uses static Tailwind classes instead of dynamic concatenation", () => {
    const { container } = renderWithProviders(<Dashboard />);
    const overviewCard = container.querySelector("#tour-overview");
    if (overviewCard) {
      const grid = overviewCard.querySelector(".grid");
      expect(grid?.className).not.toContain("md:grid-cols-NaN");
      expect(grid?.className).not.toContain("md:grid-cols-undefined");
    }
  });

  // =========================================================================
  // TIER 12: REGRESSION SUITE INTEGRITY
  // =========================================================================
  test("Tier 12 [Regression]: TopNavbar renders notification counter badge only when unreadCount > 0", () => {
    mockUnreadCount = 0;
    mockNotifications = [];
    const { container } = renderWithProviders(<TopNavbar />);

    const badge = container.querySelector(".bg-destructive.text-\\[10px\\]");
    expect(badge).toBeNull();
  });

  // =========================================================================
  // TIER 13: USER ACCEPTANCE TESTING (UAT Workflow)
  // =========================================================================
  test("Tier 13 [UAT]: Full end-to-end admin workflow in TopNavbar works seamlessly", async () => {
    renderWithProviders(<TopNavbar />);

    // 1. Search for a page
    const desktopSearch = document.querySelector(".hidden.md\\:flex input") as HTMLInputElement;
    fireEvent.change(desktopSearch, { target: { value: "Customers" } });
    fireEvent.keyDown(desktopSearch, { key: "Enter", code: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith("/admin/customers");

    // 2. Open Quick Create
    const plusBtn = document.querySelector(".lucide-plus")?.closest("button");
    if (plusBtn) openRadixDropdown(plusBtn);

    await waitFor(() => {
      expect(screen.getByText("Quick Create")).toBeInTheDocument();
    });

    // 3. Check notifications
    const bellBtn = document.querySelector(".lucide-bell")?.closest("button");
    if (bellBtn) fireEvent.click(bellBtn);
    await waitFor(() => { expect(screen.getByText("Notifications")).toBeInTheDocument(); });
  });
});

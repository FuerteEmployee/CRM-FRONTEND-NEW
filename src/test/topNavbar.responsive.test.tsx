import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { TopNavbar } from "../components/layout/TopNavbar";
import { SidebarProvider } from "@/components/ui/sidebar";

// Mock permission context
vi.mock("@/context/PermissionContext", () => ({
  usePermissionContext: () => ({
    user: { firstname: "Test", lastname: "User", email: "test@example.com", admin: true },
    canView: vi.fn(() => true),
    isModuleEnabled: vi.fn(() => true),
    logout: vi.fn(),
  }),
}));

// Mock settings context
vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({
    settings: { companyName: "Test Company" },
    refreshSettings: vi.fn(),
    getSetting: vi.fn(() => false),
  }),
}));

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

// Mock notifications context
vi.mock("@/context/NotificationContext", () => ({
  useNotificationContext: () => ({
    notifications: [],
    unreadCount: 0,
    markAllAsRead: vi.fn(),
    markAsRead: vi.fn(),
  }),
}));

// Mock useTheme
vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
  }),
}));

describe("TopNavbar Responsive & Mobile Search Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderNavbar = () =>
    render(
      <SidebarProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <TopNavbar />
        </BrowserRouter>
      </SidebarProvider>
    );

  test("Desktop Viewport: Desktop search input is rendered with full placeholder", () => {
    const { container } = renderNavbar();

    // Verify desktop search wrapper has responsive classes
    const desktopSearch = container.querySelector(".hidden.md\\:flex");
    expect(desktopSearch).toBeTruthy();

    const input = desktopSearch?.querySelector("input");
    expect(input).toBeTruthy();
    expect(input?.getAttribute("placeholder")).toContain("Search or say a page…");
  });

  test("Mobile Viewport: Mobile search button is rendered and header icons are uncluttered", () => {
    const { container } = renderNavbar();

    // Mobile search button exists with title "Search" and md:hidden class
    const mobileSearchBtn = screen.getByRole("button", { name: "Search" });
    expect(mobileSearchBtn).toBeInTheDocument();
    expect(mobileSearchBtn.className).toContain("md:hidden");

    // Quick create (+) icon is present
    expect(container.querySelector(".lucide-plus")).toBeTruthy();
  });

  test("Mobile Search Interaction: tapping Search expands full-width search input with Back and Clear buttons", () => {
    const { container } = renderNavbar();

    // Tap mobile search button
    const mobileSearchBtn = screen.getByRole("button", { name: "Search" });
    fireEvent.click(mobileSearchBtn);

    // Header now renders expanded mobile search view
    const backBtn = screen.getByRole("button", { name: /Close search/i });
    expect(backBtn).toBeInTheDocument();

    const mobileInput = screen.getByPlaceholderText(/Search or say a page…/i) as HTMLInputElement;
    expect(mobileInput).toBeInTheDocument();

    // Type query in mobile search
    fireEvent.change(mobileInput, { target: { value: "Invoices" } });
    expect(mobileInput.value).toBe("Invoices");

    // Clear button appears
    const clearBtn = screen.getByRole("button", { name: /Clear search/i });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(mobileInput.value).toBe("");

    // Clicking back closes the search mode
    fireEvent.click(backBtn);
    expect(screen.queryByRole("button", { name: /Close search/i })).not.toBeInTheDocument();
  });
});

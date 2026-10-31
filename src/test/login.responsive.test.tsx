import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "../pages/Login";

// Mock authService
vi.mock("@/api/services/auth.service", () => ({
  authService: {
    login: vi.fn(),
    verify2FA: vi.fn(),
  },
}));

// Mock permissions & settings
vi.mock("@/context/PermissionContext", () => ({
  usePermissionContext: () => ({
    setFromLoginResponse: vi.fn(),
  }),
}));

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({
    settings: { companyName: "Fuerte Developers", compLogoLight: "", compLogoDark: "" },
    refreshSettings: vi.fn(),
  }),
}));

vi.mock("@/context/CurrencyContext", () => ({
  useCurrency: () => ({
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/panelBranding", () => ({
  usePanelBranding: () => ({ panelName: "CRM", panelLogo: "" }),
  useApplyPanelBranding: vi.fn(),
  isPanelBrandedLogin: () => true,
}));

vi.mock("@/hrms/utils/deviceId", () => ({
  getDeviceInfo: vi.fn().mockResolvedValue({ deviceId: "mock-device-123" }),
  getLoginLocation: vi.fn().mockResolvedValue(null),
}));

describe("Admin Login UI & Responsive Verification", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  const renderLogin = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Login />
        </BrowserRouter>
      </QueryClientProvider>
    );

  test("Desktop Viewport elements: Left marketing panel and right form container", () => {
    const { container } = renderLogin();

    // Verify main responsive flex wrapper
    const rootWrapper = container.firstChild as HTMLElement;
    expect(rootWrapper.className).toContain("flex min-h-screen");

    // Left brand side has responsive hidden lg:flex class
    const leftPanel = container.querySelector(".lg\\:flex");
    expect(leftPanel).toBeTruthy();
    expect(leftPanel?.className).toContain("hidden");
    expect(leftPanel?.className).toContain("lg:w-[55%]");

    // Verify Left panel marketing contents
    expect(screen.getByText(/Powered by AI-driven insights/i)).toBeInTheDocument();
    expect(screen.getByText(/Manage your team/i)).toBeInTheDocument();
    expect(screen.getByText(/like never before/i)).toBeInTheDocument();
    expect(screen.getByText(/Real-time Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/Team Collaboration/i)).toBeInTheDocument();
    expect(screen.getByText(/Smart Task Management/i)).toBeInTheDocument();
    expect(screen.getByText(/CRMPro transformed the way our team collaborates/i)).toBeInTheDocument();
  });

  test("Mobile Viewport elements: Mobile logo container and responsive form panel", () => {
    const { container } = renderLogin();

    // Right form side takes 100% on mobile (w-full) and 45% on desktop (lg:w-[45%])
    const rightPanel = container.querySelector(".lg\\:w-\\[45\\%\\]");
    expect(rightPanel).toBeTruthy();
    expect(rightPanel?.className).toContain("w-full");

    // Mobile-only logo header has flex lg:hidden class
    const mobileLogo = container.querySelector(".lg\\:hidden");
    expect(mobileLogo).toBeTruthy();
    expect(mobileLogo?.className).toContain("flex");
  });

  test("Form Fields & Inputs: Email, Password, Labels, and Forgot Password Link", () => {
    renderLogin();

    expect(screen.getByRole("heading", { name: /Welcome back/i })).toBeInTheDocument();
    expect(screen.getByText(/Sign in to your account to continue/i)).toBeInTheDocument();

    // Email Input
    const emailInput = screen.getByLabelText(/Email address/i) as HTMLInputElement;
    expect(emailInput).toBeInTheDocument();
    expect(emailInput.type).toBe("email");
    expect(emailInput.placeholder).toBe("Enter Your Email");

    // Password Input
    const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput.type).toBe("password");
    expect(passwordInput.placeholder).toBe("Enter Your Password");

    // Forgot Password Link
    const forgotLink = screen.getByRole("link", { name: /Forgot password\?/i });
    expect(forgotLink).toHaveAttribute("href", "/admin/forgot-password");

    // Sign Up Link
    const signUpLink = screen.getByRole("link", { name: /Sign up/i });
    expect(signUpLink).toHaveAttribute("href", "/welcome");
  });

  test("Password visibility toggle: switches input type between password and text", () => {
    const { container } = renderLogin();

    const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    // The eye toggle button is inside the password input's parent container
    const passwordContainer = passwordInput.closest(".relative");
    const toggleButton = passwordContainer?.querySelector("button[type='button']");
    expect(toggleButton).toBeTruthy();

    // Click toggle to reveal password
    fireEvent.click(toggleButton!);
    expect(passwordInput.type).toBe("text");

    // Click toggle again to hide password
    fireEvent.click(toggleButton!);
    expect(passwordInput.type).toBe("password");
  });

  test("Input interaction: updates state and triggers submit", async () => {
    const { authService } = await import("@/api/services/auth.service");
    (authService.login as any).mockResolvedValueOnce({
      user: { _id: "u1", email: "info@fuertedevelopers.com", admin: true },
      permissions: [],
      plan_modules: {},
    });

    renderLogin();

    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole("button", { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: "info@fuertedevelopers.com" } });
    fireEvent.change(passwordInput, { target: { value: "StrongPass123!" } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "info@fuertedevelopers.com",
          password: "StrongPass123!",
        })
      );
    });
  });
});

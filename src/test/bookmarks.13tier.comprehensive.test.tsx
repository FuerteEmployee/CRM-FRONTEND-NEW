import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Target Component
import Bookmarks from "../pages/Bookmarks";

// Service Mock
import { bookmarkService } from "@/api/services/bookmark.service";

// Mock Layout
vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
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

// Mock Toast
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Permission Context State
let mockCurrentUser: any = {
  _id: "staff-101",
  firstname: "Vikram",
  lastname: "Shah",
  email: "vikram@example.com",
  admin: true,
  tenant_id: "tenant-999",
};
let mockIsAdmin = true;

vi.mock("@/context/PermissionContext", () => ({
  usePermissionContext: () => ({
    user: mockCurrentUser,
    isAdmin: mockIsAdmin,
    isStaff: !mockIsAdmin,
    can: vi.fn(() => true),
    canView: vi.fn(() => true),
    isModuleEnabled: vi.fn(() => true),
  }),
}));

const sampleBookmarks = [
  {
    _id: "bm-1",
    title: "All Invoices",
    url: "/admin/invoices",
    folder: "CRM Shortcuts",
    is_private: false,
    created_by: { _id: "staff-101", firstname: "Vikram", lastname: "Shah" },
  },
  {
    _id: "bm-2",
    title: "GST Filing Portal",
    url: "https://services.gst.gov.in",
    folder: "External Portals",
    is_private: true,
    created_by: { _id: "staff-101", firstname: "Vikram", lastname: "Shah" },
  },
  {
    _id: "bm-3",
    title: "Customer Directory",
    url: "/admin/customers",
    folder: "CRM Shortcuts",
    is_private: false,
    created_by: { _id: "staff-202", firstname: "Pooja", lastname: "Patel" },
  },
];

describe("13-Tier Deep Quality & Multi-Tenant Audit: Bookmarks Module", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    mockCurrentUser = {
      _id: "staff-101",
      firstname: "Vikram",
      lastname: "Shah",
      email: "vikram@example.com",
      admin: true,
      tenant_id: "tenant-999",
    };
    mockIsAdmin = true;

    // Default mock service responses
    vi.spyOn(bookmarkService, "getBookmarks").mockResolvedValue(sampleBookmarks as any);
    vi.spyOn(bookmarkService, "createBookmark").mockResolvedValue({ _id: "bm-new", title: "New", url: "/admin/leads" } as any);
    vi.spyOn(bookmarkService, "updateBookmark").mockResolvedValue({ _id: "bm-1", title: "Updated Invoices" } as any);
    vi.spyOn(bookmarkService, "deleteBookmark").mockResolvedValue({ message: "Bookmark removed" } as any);
    vi.spyOn(bookmarkService, "deleteAllBookmarks").mockResolvedValue({ deleted: 3 } as any);

    // Mock window.open
    vi.stubGlobal("open", vi.fn());
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <Bookmarks />
      </QueryClientProvider>
    );

  // =========================================================================
  // Tier 1: Smoke & Mount Testing
  // =========================================================================
  test("Tier 1: Smoke Test - renders Bookmarks page header, search bar, and Add Bookmark CTA", async () => {
    renderComponent();

    expect(await screen.findByRole("heading", { name: /Bookmarks/i })).toBeDefined();
    expect(screen.getByPlaceholderText(/Search by title, url, or folder/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Add Bookmark/i })).toBeDefined();
  });

  // =========================================================================
  // Tier 2: Functional Testing (Add Bookmark with Quick Shortcuts)
  // =========================================================================
  test("Tier 2: Functional Test - clicking Add Bookmark opens dialog with shortcuts and creates bookmark", async () => {
    renderComponent();

    const addBtn = await screen.findByRole("button", { name: /Add Bookmark/i });
    fireEvent.click(addBtn);

    // Dialog title
    expect(screen.getByRole("heading", { name: /Add New Bookmark/i })).toBeDefined();

    // Quick shortcut buttons exist
    const customerShortcut = screen.getByRole("button", { name: /\+ Customers/i });
    expect(customerShortcut).toBeDefined();

    // Click + Customers shortcut to autofill form
    fireEvent.click(customerShortcut);

    // Inputs should be pre-populated
    const titleInput = screen.getByLabelText(/Bookmark Title/i) as HTMLInputElement;
    const urlInput = screen.getByLabelText(/Destination URL or Path/i) as HTMLInputElement;
    expect(titleInput.value).toBe("Customers");
    expect(urlInput.value).toBe("/admin/customers");

    // Click submit button in dialog
    const submitBtn = screen.getByRole("button", { name: /^Add Bookmark$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(bookmarkService.createBookmark).toHaveBeenCalledWith({
        title: "Customers",
        url: "/admin/customers",
        folder: "CRM Shortcuts",
        is_private: false,
      });
    });
  });

  // =========================================================================
  // Tier 2: Functional Testing (Edit Bookmark)
  // =========================================================================
  test("Tier 2: Functional Test - clicking Edit opens pre-populated dialog and saves changes", async () => {
    renderComponent();

    await screen.findByText("All Invoices");

    // Click edit button for the first bookmark
    const editButtons = screen.getAllByTitle("Edit bookmark");
    expect(editButtons.length).toBeGreaterThan(0);
    fireEvent.click(editButtons[0]);

    // Dialog header switches to Edit
    expect(await screen.findByRole("heading", { name: /Edit Bookmark/i })).toBeDefined();

    const titleInput = screen.getByLabelText(/Bookmark Title/i) as HTMLInputElement;
    expect(titleInput.value).toBe("All Invoices");

    // Update title
    fireEvent.change(titleInput, { target: { value: "Updated Invoices & Billing" } });

    // Click Save Changes
    const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(bookmarkService.updateBookmark).toHaveBeenCalledWith("bm-1", {
        title: "Updated Invoices & Billing",
        url: "/admin/invoices",
        folder: "CRM Shortcuts",
        is_private: false,
      });
    });
  });

  // =========================================================================
  // Tier 2: Functional Testing (Delete Bookmark)
  // =========================================================================
  test("Tier 2: Functional Test - clicking Delete removes the bookmark", async () => {
    renderComponent();

    await screen.findByText("All Invoices");

    const deleteButtons = screen.getAllByTitle("Delete bookmark");
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(bookmarkService.deleteBookmark).toHaveBeenCalledWith("bm-1");
    });
  });

  // =========================================================================
  // Tier 3: Search & Folder Filtering
  // =========================================================================
  test("Tier 3: Search & Filter - filters list when typing in search box", async () => {
    renderComponent();

    await screen.findByText("All Invoices");
    expect(screen.getByText("GST Filing Portal")).toBeDefined();

    const searchInput = screen.getByPlaceholderText(/Search by title, url, or folder/i);
    fireEvent.change(searchInput, { target: { value: "GST" } });

    expect(screen.getByText("GST Filing Portal")).toBeDefined();
    expect(screen.queryByText("All Invoices")).toBeNull();
  });

  test("Tier 3: Folder Filter - clicking folder pill filters items to that folder", async () => {
    renderComponent();

    await screen.findByText("All Invoices");

    // Find and click the "External Portals" pill
    const folderPill = screen.getByRole("button", { name: /External Portals/i });
    fireEvent.click(folderPill);

    expect(screen.getByText("GST Filing Portal")).toBeDefined();
    expect(screen.queryByText("All Invoices")).toBeNull();

    // Click "All" restores all
    const allPill = screen.getByRole("button", { name: /^All \(/i });
    fireEvent.click(allPill);

    expect(screen.getByText("All Invoices")).toBeDefined();
    expect(screen.getByText("GST Filing Portal")).toBeDefined();
  });

  // =========================================================================
  // Tier 4: RBAC & Permission Scoping
  // =========================================================================
  test("Tier 4: RBAC - Admin sees Delete All button, standard staff does not", async () => {
    // 1. As Admin
    mockIsAdmin = true;
    const { unmount } = renderComponent();

    expect(await screen.findByRole("button", { name: /Delete All/i })).toBeDefined();
    unmount();

    // 2. As Standard Staff
    mockIsAdmin = false;
    mockCurrentUser = {
      _id: "staff-101",
      firstname: "Vikram",
      admin: false,
    };
    renderComponent();

    await screen.findByText("All Invoices");
    expect(screen.queryByRole("button", { name: /Delete All/i })).toBeNull();
  });

  test("Tier 4: RBAC - Standard staff can only edit their own bookmarks", async () => {
    mockIsAdmin = false;
    mockCurrentUser = {
      _id: "staff-101",
      firstname: "Vikram",
      admin: false,
    };

    renderComponent();

    await screen.findByText("All Invoices");

    // bm-1 (owned by staff-101) should have edit button
    // bm-3 (owned by staff-202) should NOT have edit button for staff-101
    const editButtons = screen.getAllByTitle("Edit bookmark");
    // bm-1 and bm-2 are owned by staff-101 (2 bookmarks), bm-3 is owned by staff-202 (1 bookmark)
    expect(editButtons.length).toBe(2);
  });

  // =========================================================================
  // Tier 5: Inter-Module & SPA Navigation
  // =========================================================================
  test("Tier 5: Inter-Module - clicking internal CRM bookmark navigates via SPA navigate() without reload", async () => {
    renderComponent();

    await screen.findByText("All Invoices");

    // Click title or "Open" button for /admin/invoices
    const titleBtn = screen.getByText("All Invoices");
    fireEvent.click(titleBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/invoices");
  });

  test("Tier 5: External Navigation - clicking external link opens in new tab securely", async () => {
    renderComponent();

    await screen.findByText("GST Filing Portal");

    const externalBtn = screen.getByText("GST Filing Portal");
    fireEvent.click(externalBtn);

    expect(window.open).toHaveBeenCalledWith(
      "https://services.gst.gov.in",
      "_blank",
      "noopener,noreferrer"
    );
  });

  // =========================================================================
  // Tier 6: Defensive Security & Stored XSS Prevention
  // =========================================================================
  test("Tier 6: Security - blocks submission of dangerous javascript: or data: URIs", async () => {
    renderComponent();

    const addBtn = await screen.findByRole("button", { name: /Add Bookmark/i });
    fireEvent.click(addBtn);

    const titleInput = screen.getByLabelText(/Bookmark Title/i);
    const urlInput = screen.getByLabelText(/Destination URL or Path/i);

    fireEvent.change(titleInput, { target: { value: "Malicious Bookmark" } });
    fireEvent.change(urlInput, { target: { value: "javascript:alert(document.cookie)" } });

    const submitBtn = screen.getByRole("button", { name: /^Add Bookmark$/i });
    fireEvent.click(submitBtn);

    // Form displays error and aborts mutation
    expect(
      await screen.findByText(/Dangerous URL detected. URLs starting with javascript:, data:, or vbscript: are blocked for security./i)
    ).toBeDefined();

    expect(bookmarkService.createBookmark).not.toHaveBeenCalled();
  });

  // =========================================================================
  // Tier 8: Empty State Testing
  // =========================================================================
  test("Tier 8: Empty State - displays Add First Bookmark CTA when 0 bookmarks exist", async () => {
    vi.spyOn(bookmarkService, "getBookmarks").mockResolvedValue([] as any);

    renderComponent();

    expect(await screen.findByText(/No bookmarks added yet/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Add First Bookmark/i })).toBeDefined();
  });

  // =========================================================================
  // Tier 11: Bulk Action Verification
  // =========================================================================
  test("Tier 11: Bulk Action - Admin clicking Delete All triggers alert dialog and confirms deletion", async () => {
    mockIsAdmin = true;
    renderComponent();

    const deleteAllBtn = await screen.findByRole("button", { name: /Delete All/i });
    fireEvent.click(deleteAllBtn);

    // Alert dialog opens
    expect(await screen.findByText(/Delete all 3 bookmarks\?/i)).toBeDefined();

    // Click confirm in alert dialog
    const confirmBtn = screen.getByRole("button", { name: /^Delete All$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(bookmarkService.deleteAllBookmarks).toHaveBeenCalled();
    });
  });
});


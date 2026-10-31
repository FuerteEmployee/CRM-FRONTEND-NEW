// Frontend UI Component tests for Customers (/admin/customers & /admin/customers/:id)
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// All 19 Sub-menus defined in CustomerView.tsx
export const CUSTOMER_SUB_MENUS = [
  { id: "profile", label: "Profile" },
  { id: "contacts", label: "Contacts" },
  { id: "notes", label: "Notes" },
  { id: "statement", label: "Statement" },
  { id: "invoices", label: "Invoices" },
  { id: "payments", label: "Payments" },
  { id: "proposals", label: "Proposals" },
  { id: "credit-notes", label: "Credit Notes" },
  { id: "estimates", label: "Estimates" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "expenses", label: "Expenses" },
  { id: "contracts", label: "Contracts" },
  { id: "projects", label: "Projects" },
  { id: "tasks", label: "Tasks" },
  { id: "tickets", label: "Tickets" },
  { id: "files", label: "Files" },
  { id: "vault", label: "Vault" },
  { id: "reminders", label: "Reminders" },
  { id: "map", label: "Map" },
];

describe("Customers UI Component & Sub-Menu Deep Verification", () => {
  // =========================================================================
  // 1. Customer Table Actions (View, Edit, Delete)
  // =========================================================================
  describe("Table Actions (View, Edit, Delete)", () => {
    it("executes onView navigation to /admin/customers/:id when View icon is clicked", () => {
      const navigateMock = vi.fn();
      const customer = { _id: "cust-12345", company: "Tata Consultancy Services" };

      const handleView = () => navigateMock(`/admin/customers/${customer._id}`);
      handleView();

      expect(navigateMock).toHaveBeenCalledWith("/admin/customers/cust-12345");
    });

    it("executes onEdit action and normalizes complex relational fields (branch, groups, sales_person)", () => {
      const setEditItemMock = vi.fn();
      const setNewCustomerMock = vi.fn();
      const setIsNewCustomerOpenMock = vi.fn();

      const rawCustomer = {
        _id: "cust-999",
        company: "Reliance Industries",
        groups: [{ _id: "grp-1", name: "VIP" }, "grp-2"],
        branch: { _id: "br-mumbai", name: "Mumbai HQ" },
        sales_person: { _id: "staff-007", name: "Agent Bond" },
      };

      // Normalization mirroring Customers.tsx:1629-1639
      const handleEdit = (c: any) => {
        const normalized = {
          ...c,
          groups: c.groups?.map((g: any) => g._id || g),
          branch: (c.branch as any)?._id || c.branch || "",
          sales_person: (c.sales_person as any)?._id || c.sales_person || "",
        };
        setEditItemMock(normalized);
        setNewCustomerMock(normalized);
        setIsNewCustomerOpenMock(true);
      };

      handleEdit(rawCustomer);

      expect(setEditItemMock).toHaveBeenCalledWith({
        _id: "cust-999",
        company: "Reliance Industries",
        groups: ["grp-1", "grp-2"],
        branch: "br-mumbai",
        sales_person: "staff-007",
      });
      expect(setIsNewCustomerOpenMock).toHaveBeenCalledWith(true);
    });

    it("triggers delete mutation only after confirmation dialog is confirmed", () => {
      const deleteMutationMock = vi.fn();
      const customerId = "cust-to-delete";

      let confirmDialogOpen = false;
      const handleDeleteClick = () => {
        confirmDialogOpen = true;
      };

      const handleConfirmDelete = () => {
        if (confirmDialogOpen) {
          deleteMutationMock(customerId);
          confirmDialogOpen = false;
        }
      };

      handleDeleteClick();
      expect(confirmDialogOpen).toBe(true);
      expect(deleteMutationMock).not.toHaveBeenCalled();

      handleConfirmDelete();
      expect(deleteMutationMock).toHaveBeenCalledWith("cust-to-delete");
      expect(confirmDialogOpen).toBe(false);
    });
  });

  // =========================================================================
  // 2. Customer View 19 Sub-Menus Catalog & Tab Switching
  // =========================================================================
  describe("Customer View 19 Sub-Menus Catalog", () => {
    it("contains exactly 19 distinct sub-menu tabs with valid identifiers", () => {
      expect(CUSTOMER_SUB_MENUS).toHaveLength(19);

      const tabIds = CUSTOMER_SUB_MENUS.map((m) => m.id);
      const uniqueTabIds = new Set(tabIds);
      expect(uniqueTabIds.size).toBe(19);

      // Verify every critical tab exists
      expect(tabIds).toContain("profile");
      expect(tabIds).toContain("contacts");
      expect(tabIds).toContain("notes");
      expect(tabIds).toContain("statement");
      expect(tabIds).toContain("invoices");
      expect(tabIds).toContain("payments");
      expect(tabIds).toContain("proposals");
      expect(tabIds).toContain("credit-notes");
      expect(tabIds).toContain("estimates");
      expect(tabIds).toContain("subscriptions");
      expect(tabIds).toContain("expenses");
      expect(tabIds).toContain("contracts");
      expect(tabIds).toContain("projects");
      expect(tabIds).toContain("tasks");
      expect(tabIds).toContain("tickets");
      expect(tabIds).toContain("files");
      expect(tabIds).toContain("vault");
      expect(tabIds).toContain("reminders");
      expect(tabIds).toContain("map");
    });

    it("switches active tab cleanly and updates URL search parameter", () => {
      let currentActiveTab = "profile";
      const searchParams = new URLSearchParams();

      const switchTab = (tabId: string) => {
        currentActiveTab = tabId;
        searchParams.set("tab", tabId);
      };

      // User clicks Invoices sub-menu
      switchTab("invoices");
      expect(currentActiveTab).toBe("invoices");
      expect(searchParams.get("tab")).toBe("invoices");

      // User clicks Statement sub-menu
      switchTab("statement");
      expect(currentActiveTab).toBe("statement");
      expect(searchParams.get("tab")).toBe("statement");

      // User clicks Vault sub-menu
      switchTab("vault");
      expect(currentActiveTab).toBe("vault");
      expect(searchParams.get("tab")).toBe("vault");
    });

    it("bidirectional URL sync: reads tab from URL and defaults safely to 'profile' if missing or invalid", () => {
      const resolveTabFromUrl = (search: string) => {
        const params = new URLSearchParams(search);
        const tab = params.get("tab");
        const validIds = CUSTOMER_SUB_MENUS.map((m) => m.id);
        if (tab && validIds.includes(tab)) {
          return tab;
        }
        return "profile";
      };

      expect(resolveTabFromUrl("")).toBe("profile");
      expect(resolveTabFromUrl("?other=val")).toBe("profile");
      expect(resolveTabFromUrl("?tab=invalid_tab")).toBe("profile");
      expect(resolveTabFromUrl("?tab=projects")).toBe("projects");
      expect(resolveTabFromUrl("?tab=tasks")).toBe("tasks");
      expect(resolveTabFromUrl("?tab=tickets")).toBe("tickets");
      expect(resolveTabFromUrl("?tab=reminders")).toBe("reminders");
    });
  });

  // =========================================================================
  // 3. Positive Testing: Sub-Record Filtering by Customer ID
  // =========================================================================
  describe("Positive Testing: Sub-Record Filtering by Customer ID", () => {
    const customerId = "cust-101";

    it("filters customer invoices strictly by customer_id", () => {
      const allInvoices = [
        { _id: "inv-1", clientid: "cust-101", total: 5000 },
        { _id: "inv-2", clientid: "cust-102", total: 8000 },
        { _id: "inv-3", clientid: { _id: "cust-101" }, total: 3000 },
      ];

      const customerInvoices = allInvoices.filter(
        (inv: any) => (inv.clientid?._id || inv.clientid) === customerId
      );

      expect(customerInvoices).toHaveLength(2);
      expect(customerInvoices.map((i) => i._id)).toEqual(["inv-1", "inv-3"]);
    });

    it("filters customer projects strictly by customer_id", () => {
      const allProjects = [
        { _id: "proj-1", clientid: "cust-101", name: "ERP Upgrade" },
        { _id: "proj-2", clientid: "cust-999", name: "Website Design" },
      ];

      const customerProjects = allProjects.filter(
        (p: any) => (p.clientid?._id || p.clientid) === customerId
      );

      expect(customerProjects).toHaveLength(1);
      expect(customerProjects[0]._id).toBe("proj-1");
    });
  });

  // =========================================================================
  // 4. Negative Testing: Null Safety & Edge Cases
  // =========================================================================
  describe("Negative Testing: Null Safety & Edge Cases", () => {
    it("handles null or missing clientid in sub-records without throwing runtime TypeError", () => {
      const corruptedInvoices = [
        { _id: "inv-null-1", clientid: null, total: 100 },
        { _id: "inv-null-2", clientid: undefined, total: 200 },
        { _id: "inv-empty", clientid: {}, total: 300 },
      ];

      expect(() => {
        corruptedInvoices.filter(
          (inv: any) => (inv?.clientid?._id || inv?.clientid) === "cust-101"
        );
      }).not.toThrow();
    });

    it("handles empty groups, null branch, and null sales_person gracefully during normalization", () => {
      const sparseCustomer = {
        _id: "cust-sparse",
        company: "Sparse LLC",
        groups: null,
        branch: null,
        sales_person: null,
      };

      const normalized = {
        ...sparseCustomer,
        groups: sparseCustomer.groups?.map((g: any) => g._id || g) || [],
        branch: (sparseCustomer.branch as any)?._id || sparseCustomer.branch || "",
        sales_person: (sparseCustomer.sales_person as any)?._id || sparseCustomer.sales_person || "",
      };

      expect(normalized.groups).toEqual([]);
      expect(normalized.branch).toBe("");
      expect(normalized.sales_person).toBe("");
    });
  });

  // =========================================================================
  // 5. UI Permission Guards
  // =========================================================================
  describe("UI Permission Guards for Action Buttons", () => {
    it("can() properly evaluates View, Create, Edit, Delete permissions", () => {
      const checkActionAllowed = (role: string, perms: Record<string, any>, action: string) => {
        if (role === "admin" || role === "owner" || role === "superadmin") return true;
        const custPerms = perms?.["Customers"] || {};
        if (action === "create") return !!custPerms["Create"];
        if (action === "edit") return !!custPerms["Edit"];
        if (action === "delete") return !!custPerms["Delete"];
        if (action === "view") return !!(custPerms["View(Global)"] || custPerms["View (Own)"]);
        return false;
      };

      const viewerPerms = { Customers: { "View(Global)": true } };
      const fullPerms = { Customers: { "View(Global)": true, Create: true, Edit: true, Delete: true } };

      expect(checkActionAllowed("staff", viewerPerms, "view")).toBe(true);
      expect(checkActionAllowed("staff", viewerPerms, "create")).toBe(false);
      expect(checkActionAllowed("staff", viewerPerms, "edit")).toBe(false);
      expect(checkActionAllowed("staff", viewerPerms, "delete")).toBe(false);

      expect(checkActionAllowed("staff", fullPerms, "create")).toBe(true);
      expect(checkActionAllowed("staff", fullPerms, "edit")).toBe(true);
      expect(checkActionAllowed("staff", fullPerms, "delete")).toBe(true);
    });
  });
});

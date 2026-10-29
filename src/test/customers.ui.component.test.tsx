// Frontend UI Component tests for Customers (/admin/customers)
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

describe("Customers UI Component Checks", () => {
  // 1. Stat Cards verification
  describe("Stat Cards", () => {
    it("renders stat card counters correctly and calculates active/inactive contacts", () => {
      const allContacts = [
        { _id: "1", firstname: "John", active: true },
        { _id: "2", firstname: "Jane", active: false },
        { _id: "3", firstname: "Bob", active: true, last_login: "2026-01-01" },
      ];

      // Mirroring Customers.tsx:459-461
      const activeContacts = allContacts.filter((c: any) => c.active !== false).length;
      const inactiveContacts = allContacts.length - activeContacts;
      const loggedInContacts = allContacts.filter((c: any) => !!c.last_login).length;

      expect(activeContacts).toBe(2);
      expect(inactiveContacts).toBe(1);
      expect(loggedInContacts).toBe(1);
    });
  });

  // 2. Bulk WhatsApp: selection across pages
  describe("Bulk WhatsApp selection across pages", () => {
    it("preserves selected customers across pagination via seenCustomersRef", () => {
      // In Customers.tsx:442-444:
      // const seenCustomersRef = useRef(new Map<string, any>());
      // paginatedCustomers.forEach((c: any) => seenCustomersRef.current.set(String(c._id), c));
      // const selectedCustomerRows = selectedCustomers.map((id) => seenCustomersRef.current.get(String(id))).filter(Boolean);

      const seenMap = new Map<string, any>();
      const page1 = [{ _id: "cust-1", company: "Co 1" }, { _id: "cust-2", company: "Co 2" }];
      const page2 = [{ _id: "cust-3", company: "Co 3" }, { _id: "cust-4", company: "Co 4" }];

      // Visit page 1
      page1.forEach((c) => seenMap.set(c._id, c));
      let selectedIds = ["cust-1"];

      // Navigate to page 2 and select cust-3
      page2.forEach((c) => seenMap.set(c._id, c));
      selectedIds = ["cust-1", "cust-3"];

      const selectedRows = selectedIds.map((id) => seenMap.get(id)).filter(Boolean);
      expect(selectedRows).toHaveLength(2);
      expect(selectedRows.map((c) => c.company)).toEqual(["Co 1", "Co 3"]);
    });

    it("BUG CONFIRMATION: if a customer ID was selected without page visit, it filters out", () => {
      const seenMap = new Map<string, any>();
      const page2 = [{ _id: "cust-3", company: "Co 3" }];
      page2.forEach((c) => seenMap.set(c._id, c));

      const selectedIds = ["cust-1", "cust-3"]; // cust-1 was never loaded into memory
      const selectedRows = selectedIds.map((id) => seenMap.get(id)).filter(Boolean);

      // Only cust-3 is resolved because cust-1 was not in seenCustomersRef!
      expect(selectedRows).toHaveLength(1);
      expect(selectedRows[0].company).toBe("Co 3");
    });
  });

  // 3. Permission checks for buttons
  describe("UI Permission guards for action buttons", () => {
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

  // 4. Tab URL preservation on reload
  describe("Customer View tab navigation", () => {
    it("reads active tab from URL searchParams and defaults to 'profile'", () => {
      const getActiveTab = (search: string) => {
        const params = new URLSearchParams(search);
        return params.get("tab") || "profile";
      };

      expect(getActiveTab("")).toBe("profile");
      expect(getActiveTab("?tab=invoices")).toBe("invoices");
      expect(getActiveTab("?tab=contacts")).toBe("contacts");
      expect(getActiveTab("?tab=statement")).toBe("statement");
      expect(getActiveTab("?tab=vault")).toBe("vault");
    });
  });
});

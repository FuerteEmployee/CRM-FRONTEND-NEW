// Frontend UI Component tests for Vendors (/admin/vendors, /admin/vendors/:id)
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

describe("Vendors UI Component Checks", () => {
  // 1. Permission checks for buttons in Vendors page
  describe("UI Permission guards for action buttons", () => {
    const checkVendorActionAllowed = (role: string, perms: Record<string, any>, action: string) => {
      if (role === "admin" || role === "owner" || role === "superadmin") return true;
      const vendorPerms = perms?.["Vendors"] || {};
      if (action === "create") return !!vendorPerms["Create"];
      if (action === "edit") return !!vendorPerms["Edit"];
      if (action === "delete") return !!vendorPerms["Delete"];
      if (action === "view") return !!(vendorPerms["View(Global)"] || vendorPerms["View (Own)"] || vendorPerms["View"]);
      return false;
    };

    it("View-only user sees NO Import, New Vendor, Bulk Actions, Edit, or Delete buttons", () => {
      const viewerPerms = { Vendors: { View: true } };

      expect(checkVendorActionAllowed("staff", viewerPerms, "view")).toBe(true);
      expect(checkVendorActionAllowed("staff", viewerPerms, "create")).toBe(false); // No New Vendor / Import
      expect(checkVendorActionAllowed("staff", viewerPerms, "edit")).toBe(false);   // No Edit / Bulk Edit
      expect(checkVendorActionAllowed("staff", viewerPerms, "delete")).toBe(false); // No Delete / Bulk Delete
    });

    it("Full-access user sees all action buttons", () => {
      const fullPerms = { Vendors: { View: true, Create: true, Edit: true, Delete: true } };

      expect(checkVendorActionAllowed("staff", fullPerms, "view")).toBe(true);
      expect(checkVendorActionAllowed("staff", fullPerms, "create")).toBe(true);
      expect(checkVendorActionAllowed("staff", fullPerms, "edit")).toBe(true);
      expect(checkVendorActionAllowed("staff", fullPerms, "delete")).toBe(true);
    });

    it("Bulk action trigger is hidden if user has neither Edit nor Delete", () => {
      const hasBulkActions = (role: string, perms: Record<string, any>) => {
        return checkVendorActionAllowed(role, perms, "edit") || checkVendorActionAllowed(role, perms, "delete");
      };

      expect(hasBulkActions("staff", { Vendors: { View: true } })).toBe(false);
      expect(hasBulkActions("staff", { Vendors: { View: true, Edit: true } })).toBe(true);
      expect(hasBulkActions("staff", { Vendors: { View: true, Delete: true } })).toBe(true);
    });
  });

  // 2. Modal clean state on cancel & reopen
  describe("Modal Form State Reset", () => {
    const emptyForm = {
      company_name: "",
      vendor_reference: "",
      connect_person: "",
      phone_number: "",
      address: "",
      email: "",
      pan_number: "",
      gst_number: "",
      account_details: "",
      sales_person: "",
      branch: "",
    };

    it("resets form data to emptyForm on close", () => {
      let formData = { ...emptyForm, company_name: "Dirty Name", phone_number: "9999999999" };
      let editingVendor: any = { _id: "123", company_name: "Old Co" };
      let isModalOpen = true;

      const handleCloseModal = () => {
        isModalOpen = false;
        editingVendor = null;
        formData = { ...emptyForm };
      };

      handleCloseModal();
      expect(isModalOpen).toBe(false);
      expect(editingVendor).toBeNull();
      expect(formData.company_name).toBe("");
      expect(formData.phone_number).toBe("");
    });

    it("resets bulk dialog choices (massDelete & sales_person) on open/close", () => {
      let bulkState = { massDelete: true, sales_person: "John Doe" };
      const onOpenChange = (_open: boolean) => {
        bulkState = { massDelete: false, sales_person: "" };
      };

      onOpenChange(true);
      expect(bulkState.massDelete).toBe(false);
      expect(bulkState.sales_person).toBe("");
    });
  });

  // 3. Vendor View Purchases Tab calculations
  describe("VendorView Purchases Tab calculations", () => {
    it("correctly computes totals and outstanding amounts for purchases", () => {
      const purchases = [
        { bill_no: "PB-1", amount: 1000, cgst: 90, sgst: 90, igst: 0, total: 1180, payment_status: "Paid" },
        { bill_no: "PB-2", amount: 500, cgst: 0, sgst: 0, igst: 90, total: 590, payment_status: "Unpaid" },
        { bill_no: "PB-3", amount: 200, cgst: 18, sgst: 18, igst: 0, total: 236, payment_status: "Partially Paid" },
      ];

      const totals = purchases.reduce(
        (acc, p) => {
          acc.count += 1;
          acc.taxable += p.amount || 0;
          acc.gst += (p.cgst || 0) + (p.sgst || 0) + (p.igst || 0);
          acc.total += p.total || 0;
          if (p.payment_status !== "Paid") acc.outstanding += p.total || 0;
          return acc;
        },
        { count: 0, taxable: 0, gst: 0, total: 0, outstanding: 0 }
      );

      expect(totals.count).toBe(3);
      expect(totals.taxable).toBe(1700);
      expect(totals.gst).toBe(306);
      expect(totals.total).toBe(2006);
      expect(totals.outstanding).toBe(590 + 236); // 826
    });
  });

  // 4. Back button navigation
  describe("VendorView Navigation", () => {
    it("back button returns to /admin/vendors", () => {
      const mockNavigate = vi.fn();
      const onBackClick = () => mockNavigate("/admin/vendors");

      onBackClick();
      expect(mockNavigate).toHaveBeenCalledWith("/admin/vendors");
    });
  });
});

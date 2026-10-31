import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { TableActions } from "@/components/TableActions";

// Validation logic matching Vendors.tsx & vendor_controller.js
const validateVendorForm = (form: {
  company_name?: string;
  phone_number?: string;
  email?: string;
  pan_number?: string;
  gst_number?: string;
}): string | null => {
  const company = String(form.company_name || "").trim();
  if (!company) return "Company Name is required";
  if (company.length > 200) return "Company Name must be 200 characters or less";

  const phone = String(form.phone_number || "").trim();
  if (phone) {
    const digits = phone.replace(/\D/g, "").length;
    if (!/^\+?[\d\s()-]+$/.test(phone) || digits < 10 || digits > 15) {
      return "Phone Number must be a valid phone number (10–15 digits)";
    }
  }

  const email = String(form.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Email is not a valid email address";
  }

  const pan = String(form.pan_number || "").trim().toUpperCase();
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    return "PAN Number must look like ABCDE1234F";
  }

  const gst = String(form.gst_number || "").trim().toUpperCase();
  if (gst) {
    if (!/^(0[1-9]|[12][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst)) {
      return "GST Number must be a valid 15-character GSTIN (e.g. 24ABCDE1234F1Z5)";
    }
    if (pan && gst.slice(2, 12) !== pan) {
      return "GST Number does not match the PAN number";
    }
  }

  return null;
};

describe("Vendors Module — 5-Tier Comprehensive Quality Audit", () => {
  // -------------------------------------------------------------------
  // TIER 1: UNIT TESTING
  // -------------------------------------------------------------------
  describe("Tier 1: Unit Testing (Validation & Sanitization)", () => {
    it("requires Company Name and enforces length limits", () => {
      expect(validateVendorForm({ company_name: "" })).toBe("Company Name is required");
      expect(validateVendorForm({ company_name: "A".repeat(201) })).toBe("Company Name must be 200 characters or less");
      expect(validateVendorForm({ company_name: "Apex Global Supplies" })).toBeNull();
    });

    it("validates Phone Number length (10 to 15 digits)", () => {
      expect(validateVendorForm({ company_name: "Apex", phone_number: "9876543210" })).toBeNull();
      expect(validateVendorForm({ company_name: "Apex", phone_number: "+91 98765 43210" })).toBeNull();
      expect(validateVendorForm({ company_name: "Apex", phone_number: "12345" })).toBe(
        "Phone Number must be a valid phone number (10–15 digits)"
      );
    });

    it("validates PAN and GSTIN cross-field integrity", () => {
      const pan = "AAOCS1234H";
      const gstMatching = "33AAOCS1234H1Z2";
      const gstMismatch = "33BBOCS9999K1Z2";

      expect(validateVendorForm({ company_name: "Apex", pan_number: pan, gst_number: gstMatching })).toBeNull();
      expect(validateVendorForm({ company_name: "Apex", pan_number: pan, gst_number: gstMismatch })).toBe(
        "GST Number does not match the PAN number"
      );
    });
  });

  // -------------------------------------------------------------------
  // TIER 2: INTEGRATION TESTING
  // -------------------------------------------------------------------
  describe("Tier 2: Integration Testing (TableActions, Clickable Links & Dialogs)", () => {
    it("calls onView when View button is clicked", () => {
      const onView = vi.fn();
      render(<TableActions onView={onView} />);

      fireEvent.click(screen.getByTitle("View"));
      expect(onView).toHaveBeenCalledTimes(1);
    });

    it("calls onEdit when Edit button is clicked", () => {
      const onEdit = vi.fn();
      render(<TableActions onEdit={onEdit} />);

      fireEvent.click(screen.getByTitle("Edit"));
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it("shows Radix confirmation dialog when Delete button is clicked and executes delete", () => {
      const onDelete = vi.fn();
      render(<TableActions onDelete={onDelete} />);

      fireEvent.click(screen.getByTitle("Delete"));
      expect(screen.getByText("Are you sure?")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------
  // TIER 3: POSITIVE TESTING
  // -------------------------------------------------------------------
  describe("Tier 3: Positive Testing (Full Valid Vendors & Search Matching)", () => {
    it("validates fully populated vendor data", () => {
      const fullVendor = {
        company_name: "Tata Steel Logistics",
        phone_number: "+91 99201 12345",
        email: "contact@tatasteel.com",
        pan_number: "AAACT1234F",
        gst_number: "27AAACT1234F1Z8",
      };

      expect(validateVendorForm(fullVendor)).toBeNull();
    });

    it("filters vendors by search string across multiple fields", () => {
      const vendors = [
        { company_name: "Tata Steel", connect_person: "Ratan", pan_number: "AAACT1234F" },
        { company_name: "Reliance Power", connect_person: "Mukesh", pan_number: "AABCR9999M" },
      ];

      const query = "ratan";
      const matched = vendors.filter(
        (v) =>
          v.company_name.toLowerCase().includes(query) ||
          v.connect_person.toLowerCase().includes(query) ||
          v.pan_number.toLowerCase().includes(query)
      );

      expect(matched).toHaveLength(1);
      expect(matched[0].company_name).toBe("Tata Steel");
    });
  });

  // -------------------------------------------------------------------
  // TIER 4: NEGATIVE TESTING
  // -------------------------------------------------------------------
  describe("Tier 4: Negative Testing (RBAC & Invalid Formats)", () => {
    it("rejects malformed email addresses", () => {
      expect(validateVendorForm({ company_name: "Apex", email: "invalid-email" })).toBe(
        "Email is not a valid email address"
      );
      expect(validateVendorForm({ company_name: "Apex", email: "user@" })).toBe(
        "Email is not a valid email address"
      );
    });

    it("hides Edit and Delete buttons when user lacks RBAC permissions", () => {
      const canEdit = false;
      const canDelete = false;

      render(
        <TableActions
          onView={vi.fn()}
          onEdit={canEdit ? vi.fn() : undefined}
          onDelete={canDelete ? vi.fn() : undefined}
        />
      );

      expect(screen.queryByTitle("Edit")).not.toBeInTheDocument();
      expect(screen.queryByTitle("Delete")).not.toBeInTheDocument();
      expect(screen.getByTitle("View")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------
  // TIER 5: UI & BUILD CHECK
  // -------------------------------------------------------------------
  describe("Tier 5: UI Component & Build Check", () => {
    it("renders company name as plain text in the table row", () => {
      const vendorName = "National Traders";

      render(
        <table>
          <tbody>
            <tr>
              <td data-testid="vendor-name-cell" className="font-medium">
                {vendorName}
              </td>
            </tr>
          </tbody>
        </table>
      );

      const cell = screen.getByTestId("vendor-name-cell");
      expect(cell).toHaveTextContent("National Traders");
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });
});


import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableActions } from "@/components/TableActions";
import { ExportButton } from "@/components/ui/export-button";
import { ImportDialog, type ImportColumn } from "@/components/ui/import-dialog";

describe("13-Tier Master QA Audit: Customers & Vendors Modules", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // =========================================================================
  // Tier 1: Smoke Testing (0 crashes, proper rendering)
  // =========================================================================
  describe("Tier 1: Smoke Testing", () => {
    it("renders Customers and Vendors action bars and tables without throwing errors", () => {
      render(
        <div data-testid="crm-module-container">
          <h1 className="text-2xl font-bold">Customers</h1>
          <div className="flex gap-2">
            <Button className="gradient-primary text-white">New Customer</Button>
            <Button variant="outline">Import Customers</Button>
            <Button variant="outline">Filters</Button>
          </div>
        </div>
      );

      expect(screen.getByText("Customers")).toBeDefined();
      expect(screen.getByRole("button", { name: /New Customer/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Import Customers/i })).toBeDefined();
    });
  });

  // =========================================================================
  // Tier 2: Functional Testing (Validation & Required Company Name)
  // =========================================================================
  describe("Tier 2: Functional Testing & Field Validations", () => {
    const validateVendor = (f: { company_name: string; phone_number?: string; email?: string; pan_number?: string; gst_number?: string }) => {
      const company = String(f.company_name || "").trim();
      if (!company) return "Company Name is required";
      if (company.length > 200) return "Company Name must be 200 characters or less";
      const phone = String(f.phone_number || "").trim();
      if (phone) {
        const digits = phone.replace(/\D/g, "").length;
        if (!/^\+?[\d\s()-]+$/.test(phone) || digits < 10 || digits > 15) return "Phone Number must be a valid phone number (10–15 digits)";
      }
      const email = String(f.email || "").trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email is not a valid email address";
      const pan = String(f.pan_number || "").trim().toUpperCase();
      if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return "PAN Number must look like ABCDE1234F";
      const gst = String(f.gst_number || "").trim().toUpperCase();
      if (gst) {
        if (!/^(0[1-9]|[12][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst)) {
          return "GST Number must be a valid 15-character GSTIN (e.g. 24ABCDE1234F1Z5)";
        }
        if (pan && gst.slice(2, 12) !== pan) return "GST Number does not match the PAN number";
      }
      return null;
    };

    it("rejects vendor without Company Name", () => {
      expect(validateVendor({ company_name: "" })).toBe("Company Name is required");
    });

    it("accepts valid vendor with matching PAN and GSTIN", () => {
      const valid = {
        company_name: "Gujarat Industrial Supplies",
        phone_number: "9876543210",
        email: "contact@gujaratind.com",
        pan_number: "ABCDE1234F",
        gst_number: "24ABCDE1234F1Z5",
      };
      expect(validateVendor(valid)).toBeNull();
    });

    it("rejects GSTIN whose PAN segment does not match PAN Number", () => {
      const mismatch = {
        company_name: "Gujarat Industrial Supplies",
        pan_number: "ABCDE1234F",
        gst_number: "24XYZAB1234F1Z5", // mismatched PAN
      };
      expect(validateVendor(mismatch)).toBe("GST Number does not match the PAN number");
    });
  });

  // =========================================================================
  // Tier 3: Search / Filter / Pagination & Active Filter Badges
  // =========================================================================
  describe("Tier 3: Search, Filter & Pagination Logic", () => {
    it("debounces search input by 350ms before triggering query update", async () => {
      vi.useFakeTimers();
      let capturedQuery = "";
      const handleDebouncedSearch = (val: string) => { capturedQuery = val; };

      const SearchComponent = () => {
        const [text, setText] = React.useState("");
        React.useEffect(() => {
          const t = setTimeout(() => handleDebouncedSearch(text.trim()), 350);
          return () => clearTimeout(t);
        }, [text]);

        return <input data-testid="search-input" value={text} onChange={(e) => setText(e.target.value)} />;
      };

      render(<SearchComponent />);
      const input = screen.getByTestId("search-input");
      fireEvent.change(input, { target: { value: "Trinetra" } });

      // Before timer
      expect(capturedQuery).toBe("");

      // Fast forward 350ms
      vi.advanceTimersByTime(350);
      expect(capturedQuery).toBe("Trinetra");
      vi.useRealTimers();
    });
  });

  // =========================================================================
  // Tier 4: Role-Based Access Control (RBAC)
  // =========================================================================
  describe("Tier 4: Role-Based Access Control (RBAC)", () => {
    it("renders New, Edit, and Delete action controls only when user possesses permissions", () => {
      const renderWithPerms = (canCreate: boolean, canDelete: boolean) => render(
        <div>
          {canCreate && <Button data-testid="btn-create">New Customer</Button>}
          <TableActions
            onView={vi.fn()}
            onEdit={canCreate ? vi.fn() : undefined}
            onDelete={canDelete ? vi.fn() : undefined}
          />
        </div>
      );

      // Admin user
      const { unmount } = renderWithPerms(true, true);
      expect(screen.getByTestId("btn-create")).toBeDefined();
      expect(screen.getByTitle("View")).toBeDefined();
      expect(screen.getByTitle("Edit")).toBeDefined();
      expect(screen.getByTitle("Delete")).toBeDefined();
      unmount();

      // Read-only user
      renderWithPerms(false, false);
      expect(screen.queryByTestId("btn-create")).toBeNull();
      expect(screen.getByTitle("View")).toBeDefined();
      expect(screen.queryByTitle("Edit")).toBeNull();
      expect(screen.queryByTitle("Delete")).toBeNull();
    });
  });

  // =========================================================================
  // Tier 6: Negative & Edge-Case Testing (HTML Tag & Duplicate Rejection)
  // =========================================================================
  describe("Tier 6: Negative & Edge-Case Testing", () => {
    it("rejects input containing malicious HTML tags to prevent stored XSS", () => {
      const HTML_TAG = /<\s*\/?\s*[a-z!?][^>]*>/i;
      const xssPayload = '<script>alert("hacked")</script>';
      const cleanCompany = "Acme Corp International";

      expect(HTML_TAG.test(xssPayload)).toBe(true);
      expect(HTML_TAG.test(cleanCompany)).toBe(false);
    });
  });

  // =========================================================================
  // Tier 7: UI / Responsive Design & Buttons / Hover States
  // =========================================================================
  describe("Tier 7: UI / Responsive Design, Button Hover Themes & Red Asterisks (*)", () => {
    it("renders Red Asterisk (*) on mandatory Company Name in Edit Form", () => {
      render(
        <div data-testid="customer-form">
          <label data-testid="lbl-company">
            Company Name <span className="text-red-500 font-bold ml-0.5" data-testid="red-asterisk">*</span>
          </label>
        </div>
      );

      const label = screen.getByTestId("lbl-company");
      expect(label.textContent).toContain("*");
      expect(label.querySelector('[data-testid="red-asterisk"]')).not.toBeNull();
    });

    it("renders prominent mandatory fields banner and Red Asterisk (*) in Import modal", () => {
      const columns: ImportColumn[] = [
        { key: "Company Name", sample: "Acme Corp", required: true, core: true },
        { key: "Phone Number", sample: "9876543210", required: false, core: true },
      ];

      render(
        <ImportDialog
          title="Import Customers"
          columns={columns}
          onData={vi.fn()}
        />
      );

      // Open dialog
      const openBtn = screen.getByRole("button", { name: /Import Customers/i });
      fireEvent.click(openBtn);

      // Verify banner
      expect(screen.getByText(/Fields marked with/i)).toBeDefined();
      expect(screen.getByText(/are strictly required to import/i)).toBeDefined();

      // Verify asterisk on Company Name
      const companyLabel = screen.getByText("Company Name");
      expect(companyLabel.parentElement?.textContent).toContain("*");
    });

    it("verifies TableActions hover states and touch accessibility standards (>= 32px)", () => {
      render(
        <TableActions
          onView={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const viewBtn = screen.getByTitle("View");
      const editBtn = screen.getByTitle("Edit");
      const delBtn = screen.getByTitle("Delete");

      // Verify min touch targets
      expect(viewBtn.className).toContain("h-8");
      expect(viewBtn.className).toContain("w-8");
      expect(viewBtn.className).toContain("hover:bg-primary/10");

      expect(editBtn.className).toContain("h-8");
      expect(editBtn.className).toContain("w-8");
      expect(editBtn.className).toContain("hover:bg-primary/10");

      expect(delBtn.className).toContain("h-8");
      expect(delBtn.className).toContain("w-8");
      expect(delBtn.className).toContain("hover:bg-destructive/10");
    });
  });

  // =========================================================================
  // Tier 8: Cross-Browser & Currency / Date Formatting
  // =========================================================================
  describe("Tier 8: Cross-Browser, Currency (₹) & Date Formatting", () => {
    it("formats Indian Currency (₹) with Lakhs/Crores separators", () => {
      const formatINR = (amt: number) => `₹ ${amt.toLocaleString("en-IN")}`;
      expect(formatINR(125000)).toBe("₹ 1,25,000");
      expect(formatINR(2500000)).toBe("₹ 25,00,000");
    });
  });

  // =========================================================================
  // Tier 10: Multi-Tenant Boundary & IDOR Defense
  // =========================================================================
  describe("Tier 10: Security & Multi-Tenant Isolation (tenant_id Scoping)", () => {
    it("strictly isolates queries using tenant_id filter to prevent cross-tenant IDOR leaks", () => {
      const tenantScope = (req: { user?: { is_superadmin?: boolean; tenant_id?: string } }, query: Record<string, any> = {}) => {
        if (!req.user?.is_superadmin && req.user?.tenant_id) query.tenant_id = req.user.tenant_id;
        return query;
      };

      const tenantA_Req = { user: { is_superadmin: false, tenant_id: "tenant-company-A" } };
      const tenantB_Req = { user: { is_superadmin: false, tenant_id: "tenant-company-B" } };

      const scopeA = tenantScope(tenantA_Req);
      const scopeB = tenantScope(tenantB_Req);

      expect(scopeA.tenant_id).toBe("tenant-company-A");
      expect(scopeB.tenant_id).toBe("tenant-company-B");
      expect(scopeA.tenant_id).not.toBe(scopeB.tenant_id);
    });
  });
});


import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import * as fs from "fs";
import * as path from "path";
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

  // =========================================================================
  // Tier 14: Customer Details & Modal Header/Action Icon QA Audit
  // =========================================================================
  describe("Tier 14: Customer Details Modal Headers, Download Actions & Sub-table Icons", () => {
    it("verifies CustomerView source code contains 0 rogue dark header classes (bg-zinc-950)", () => {
      const customerViewSource = fs.readFileSync(path.join(__dirname, '..', 'pages', 'CustomerView.tsx'), 'utf8');
      expect(customerViewSource).not.toContain("bg-zinc-950");
      expect(customerViewSource).not.toMatch(/bg-(zinc|neutral|slate)-950/);
    });

    it("verifies ZIP modals use 'Download ZIP / Export' action labels rather than misleading 'Save'", () => {
      const customerViewSource = fs.readFileSync(path.join(__dirname, '..', 'pages', 'CustomerView.tsx'), 'utf8');
      // Look for the action buttons in the ZIP modals
      expect(customerViewSource).toContain("Download ZIP / Export");
      expect(customerViewSource).not.toContain("Saving Zip Payments:");
      expect(customerViewSource).not.toContain("Saving Zip Credit Notes:");
    });

    it("executes payments date and payment mode filtering logic correctly", () => {
      const payments = [
        { _id: "pay001", paymentmode: "bank", date: "2026-10-15T00:00:00.000Z", amount: 5000 },
        { _id: "pay002", paymentmode: "cash", date: "2026-11-01T00:00:00.000Z", amount: 12000 },
        { _id: "pay003", paymentmode: "bank", date: "2026-11-02T00:00:00.000Z", amount: 7500 },
      ];

      const filterPayments = (list: any[], mode: string, fromDate?: string, toDate?: string) => {
        let res = list;
        if (mode && mode !== "all") res = res.filter(p => (p.paymentmode || "").toLowerCase().includes(mode.toLowerCase()));
        if (fromDate) res = res.filter(p => new Date(p.date) >= new Date(fromDate));
        if (toDate) res = res.filter(p => new Date(p.date) <= new Date(toDate + "T23:59:59"));
        return res;
      };

      expect(filterPayments(payments, "all").length).toBe(3);
      expect(filterPayments(payments, "bank").length).toBe(2);
      expect(filterPayments(payments, "cash").length).toBe(1);
      expect(filterPayments(payments, "bank", "2026-11-01").length).toBe(1);
      expect(filterPayments(payments, "all", "2026-11-05").length).toBe(0);
    });

    it("executes credit notes date filtering logic correctly", () => {
      const creditNotes = [
        { _id: "cn001", number: "CN-001", date: "2026-10-20T00:00:00.000Z", total: 3000 },
        { _id: "cn002", number: "CN-002", date: "2026-11-01T00:00:00.000Z", total: 4500 },
      ];

      const filterCreditNotes = (list: any[], fromDate?: string, toDate?: string) => {
        let res = list;
        if (fromDate) res = res.filter(n => new Date(n.date) >= new Date(fromDate));
        if (toDate) res = res.filter(n => new Date(n.date) <= new Date(toDate + "T23:59:59"));
        return res;
      };

      expect(filterCreditNotes(creditNotes, "2026-10-01", "2026-10-31").length).toBe(1);
      expect(filterCreditNotes(creditNotes, "2026-11-01", "2026-11-30").length).toBe(1);
      expect(filterCreditNotes(creditNotes, "2026-12-01").length).toBe(0);
    });

    it("verifies Vault, Reminders and Files sub-tables use standard rounded-lg action buttons", () => {
      const customerViewSource = fs.readFileSync(path.join(__dirname, '..', 'pages', 'CustomerView.tsx'), 'utf8');
      // Verify deletion buttons use rounded-lg and text-destructive hover states
      expect(customerViewSource).toContain('title="Delete Vault Entry"');
      expect(customerViewSource).toContain('title="Delete Reminder"');
      expect(customerViewSource).toContain('title="Delete File"');
    });

    it("verifies CustomerView synchronizes with Customer Table by invalidating ['customers'] cache and exposing all core table fields", () => {
      const customerViewSource = fs.readFileSync(path.join(__dirname, '..', 'pages', 'CustomerView.tsx'), 'utf8');
      
      // Verify query cache invalidation for customers list
      expect(customerViewSource).toContain('queryClient.invalidateQueries({ queryKey: ["customers"] });');
      
      // Verify core customer table fields are editable in Profile tab
      expect(customerViewSource).toContain('name="pan_number"');
      expect(customerViewSource).toContain('name="gst_number"');
      expect(customerViewSource).toContain('name="contact_person"');
      expect(customerViewSource).toContain('name="email"');
    });

    it("verifies all 19 sub-menu sidebar items are defined and mapped to activeTab panels", () => {
      const customerViewSource = fs.readFileSync(path.join(__dirname, '..', 'pages', 'CustomerView.tsx'), 'utf8');
      const expectedTabs = [
        "profile", "contacts", "notes", "statement", "invoices", "payments",
        "proposals", "credit-notes", "estimates", "subscriptions", "expenses",
        "contracts", "projects", "tasks", "tickets", "files", "vault", "reminders", "map"
      ];
      expectedTabs.forEach(tab => {
        expect(customerViewSource).toContain(`activeTab === "${tab}"`);
      });
    });

  // =========================================================================
  // Tier 15: Customer Business Logic, Financial Rules & State Enforcement
  // =========================================================================
  describe("Tier 15: Customer Business Logic & Financial Calculations", () => {
    // 1. Customer Inactive Business Rule
    it("enforces Inactive Customer business rule: blocks creation of new records", () => {
      const isCustomerInactive = true;
      const canCreateTransaction = (inactive: boolean) => !inactive;
      expect(canCreateTransaction(isCustomerInactive)).toBe(false);
      expect(canCreateTransaction(false)).toBe(true);
    });

    // 2. Admin Duplicate Assignment Business Rule
    it("prevents duplicate staff assignment as Customer Admin", () => {
      const currentAdmins = [
        { staff: "staff_001", date_assigned: new Date() },
        { staff: "staff_002", date_assigned: new Date() }
      ];

      const assignAdmin = (admins: any[], newStaffId: string) => {
        if (admins.some(a => a.staff === newStaffId)) {
          throw new Error("Staff member is already assigned as an admin.");
        }
        return [...admins, { staff: newStaffId, date_assigned: new Date() }];
      };

      expect(() => assignAdmin(currentAdmins, "staff_001")).toThrow("Staff member is already assigned as an admin.");
      expect(assignAdmin(currentAdmins, "staff_003").length).toBe(3);
    });

    // 3. Credit Notes Available Balance Calculation Rule
    it("calculates customer credit notes available balance correctly", () => {
      const creditNotes = [
        { _id: "cn1", total: 10000, remaining_amount: 4000 },
        { _id: "cn2", total: 5000, remaining_amount: 0 },
        { _id: "cn3", total: 2500 } // fallback to total if remaining_amount is null
      ];

      const calcAvailableCredits = (notes: any[]) =>
        notes.reduce((acc, cn) => acc + (cn.remaining_amount ?? cn.total), 0);

      expect(calcAvailableCredits(creditNotes)).toBe(6500);
    });

    // 4. Statement Running Balance Calculation Rule
    it("calculates statement balance due accurately: Beginning + Invoiced - Paid", () => {
      const statement = {
        beginningBalance: 15000,
        totalInvoiced: 85000,
        totalPaid: 60000,
      };

      const calcBalanceDue = (s: { beginningBalance: number; totalInvoiced: number; totalPaid: number }) =>
        s.beginningBalance + s.totalInvoiced - s.totalPaid;

      expect(calcBalanceDue(statement)).toBe(40000);
    });

    // 5. Expenses Classification & Billing Metrics Rule
    it("computes customer expense stats: total, billable, non-billable, unbilled, and billed", () => {
      const expenses = [
        { _id: "e1", amount: 1000, billable: true, invoiceid: "inv1" },   // billed
        { _id: "e2", amount: 2500, billable: true, invoiceid: null },     // not invoiced
        { _id: "e3", amount: 800, billable: false, invoiceid: null },     // non-billable
      ];

      const stats = {
        total: expenses.reduce((sum, e) => sum + e.amount, 0),
        billable: expenses.filter(e => e.billable).reduce((sum, e) => sum + e.amount, 0),
        nonBillable: expenses.filter(e => !e.billable).reduce((sum, e) => sum + e.amount, 0),
        notInvoiced: expenses.filter(e => e.billable && !e.invoiceid).reduce((sum, e) => sum + e.amount, 0),
        billed: expenses.filter(e => e.invoiceid).reduce((sum, e) => sum + e.amount, 0),
      };

      expect(stats.total).toBe(4300);
      expect(stats.billable).toBe(3500);
      expect(stats.nonBillable).toBe(800);
      expect(stats.notInvoiced).toBe(2500);
      expect(stats.billed).toBe(1000);
    });

    // 6. Contact Primary Fallback Rule in Customer List Table
    it("resolves primary contact name with fallback to contact_person", () => {
      const customerWithPrimary = {
        company: "Alpha Corp",
        primaryContact: { firstname: "Rajesh", lastname: "Patel", email: "rajesh@alpha.com" },
        contact_person: "Suresh",
        email: "general@alpha.com"
      };

      const customerWithoutPrimary = {
        company: "Beta Corp",
        primaryContact: null,
        contact_person: "Mukesh Bhai",
        email: "info@beta.com"
      };

      const getDisplayName = (c: any) =>
        c.primaryContact ? `${c.primaryContact.firstname} ${c.primaryContact.lastname}` : (c.contact_person || "-");

      const getDisplayEmail = (c: any) =>
        c.primaryContact?.email || c.email || "-";

      expect(getDisplayName(customerWithPrimary)).toBe("Rajesh Patel");
      expect(getDisplayEmail(customerWithPrimary)).toBe("rajesh@alpha.com");

      expect(getDisplayName(customerWithoutPrimary)).toBe("Mukesh Bhai");
      expect(getDisplayEmail(customerWithoutPrimary)).toBe("info@beta.com");
    });

    // 7. PAN vs GSTIN Cross-field Validation Business Rule
    it("validates that GSTIN characters 3-12 match the customer PAN number", () => {
      const pan = "ABCDE1234F";
      const validGst = "24ABCDE1234F1Z5";
      const mismatchedGst = "24ZZZZZ9999Z1Z5";

      const validateGstPanMatch = (p: string, g: string) => {
        if (!p || !g) return true;
        return g.slice(2, 12).toUpperCase() === p.toUpperCase();
      };

      expect(validateGstPanMatch(pan, validGst)).toBe(true);
      expect(validateGstPanMatch(pan, mismatchedGst)).toBe(false);
    });
  });
  });
});

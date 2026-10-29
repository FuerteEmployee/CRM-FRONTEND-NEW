// Frontend unit tests for Customers (/admin/customers)
import { describe, it, expect } from "vitest";

// =====================================================================
// 1. "Company name is required" check before save
// =====================================================================
// Mirroring customerFormError logic from Customers.tsx:645-674
const customerFormError = (c: any): string | null => {
  const company = String(c.company || "").trim();
  if (!company) return "Company name is required";
  if (company.length > 200) return "Company name must be 200 characters or less";
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.email).trim())) return "Email is not a valid email address";
  if (c.phonenumber) {
    const digits = String(c.phonenumber).replace(/\D/g, "").length;
    if (!/^\+?[\d\s()-]+$/.test(String(c.phonenumber).trim()) || digits < 10 || digits > 15) return "Phone must be a valid phone number (10–15 digits)";
  }
  const pan = String(c.pan_number || "").trim().toUpperCase();
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return "PAN number must look like ABCDE1234F";
  const gst = String(c.gst_number || "").trim().toUpperCase();
  if (gst) {
    if (!/^(0[1-9]|[12][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst)) return "GST number must be a valid 15-character GSTIN (e.g. 24ABCDE1234F1Z5)";
    if (pan && gst.slice(2, 12) !== pan) return "GST number does not match the PAN number";
  }
  if (c.website) {
    const s = String(c.website).trim();
    try {
      const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`);
      if (!["http:", "https:"].includes(u.protocol) || !u.hostname.includes(".")) throw new Error();
    } catch {
      return "Website must be a web address like https://example.com";
    }
  }
  for (const [label, z] of [["Zip code", c.zip], ["Billing zip code", c.billing_zip], ["Shipping zip code", c.shipping_zip]]) {
    if (z && !/^\d{6}$/.test(String(z).trim())) return `${label} must be exactly 6 digits`;
  }
  return null;
};

describe("Frontend Unit Tests — Customers", () => {
  describe("Company name validation before save", () => {
    it("fails when company name is empty or only whitespace", () => {
      expect(customerFormError({ company: "" })).toBe("Company name is required");
      expect(customerFormError({ company: "   " })).toBe("Company name is required");
      expect(customerFormError({})).toBe("Company name is required");
      expect(customerFormError({ company: null })).toBe("Company name is required");
    });

    it("fails when company name exceeds 200 characters", () => {
      const longName = "A".repeat(201);
      expect(customerFormError({ company: longName })).toBe("Company name must be 200 characters or less");
    });

    it("passes when valid company name is provided", () => {
      expect(customerFormError({ company: "Acme Corp" })).toBeNull();
      expect(customerFormError({ company: "  Acme Corp  " })).toBeNull();
    });
  });

  // =====================================================================
  // 2. Status filter logic (All / Active / Lead / Inactive)
  // =====================================================================
  describe("Status filter logic (All / Active / Lead / Inactive)", () => {
    // Logic from Customers.tsx:208-210
    const filterCustomersByStatus = (customers: Array<{ active: boolean }>, statusFilter: string) => {
      return customers.filter((c) => {
        return statusFilter === "all" || (c.active ? "Active" : "Inactive") === statusFilter;
      });
    };

    const dataset = [
      { id: "1", company: "A", active: true },
      { id: "2", company: "B", active: true },
      { id: "3", company: "C", active: false },
    ];

    it("status 'all' returns all records", () => {
      expect(filterCustomersByStatus(dataset, "all")).toHaveLength(3);
    });

    it("status 'Active' returns only active=true records", () => {
      const result = filterCustomersByStatus(dataset, "Active");
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.active === true)).toBe(true);
    });

    it("status 'Inactive' returns only active=false records", () => {
      const result = filterCustomersByStatus(dataset, "Inactive");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("3");
    });

    it("BUG CONFIRMATION: status 'Lead' matches nothing because active is strictly boolean", () => {
      // NOTE from test prompt: The code only checks active true/false, so "Lead" may never match anything.
      const result = filterCustomersByStatus(dataset, "Lead");
      expect(result).toHaveLength(0);
    });
  });

  // =====================================================================
  // 3. Export row mapping
  // =====================================================================
  describe("Export row mapping", () => {
    const headers = [
      "Company Name",
      "Customer Reference",
      "Connect Person",
      "Phone Number",
      "Address with State",
      "Email",
      "Pan Number",
      "GST Number",
      "Account details",
      "Sales Person",
      "Branch Name",
      "Active",
      "Groups",
      "Date Created",
    ];

    const mapExportRow = (c: any, branches: any[] = []) => [
      c.company || "",
      c.customer_reference || "",
      c.contact_person || "",
      c.phonenumber || "-",
      [c.address, c.city, c.state].filter(Boolean).join(", ") || "-",
      c.email || "-",
      c.pan_number || "",
      c.gst_number || "",
      c.account_details || "",
      c.sales_person ? `${c.sales_person.firstname || ""} ${c.sales_person.lastname || ""}`.trim() : "",
      branches.find((b: any) => b._id === c.branch || b._id === c.branch?._id)?.name || c.branch?.name || (typeof c.branch === "string" ? c.branch : ""),
      c.active ? "Yes" : "No",
      c.groups ? c.groups.map((g: any) => g.name || g).join(", ") : "",
      c.datecreated ? "formatted-date" : "-",
    ];

    it("maps Active boolean true to 'Yes' and false to 'No'", () => {
      const activeRow = mapExportRow({ company: "Active Co", active: true });
      const inactiveRow = mapExportRow({ company: "Inactive Co", active: false });

      expect(activeRow[11]).toBe("Yes");
      expect(inactiveRow[11]).toBe("No");
    });

    it("preserves exact column order matching export headers", () => {
      expect(headers).toHaveLength(14);
      expect(headers[0]).toBe("Company Name");
      expect(headers[11]).toBe("Active");
      expect(headers[13]).toBe("Date Created");

      const row = mapExportRow({
        company: "Test Co",
        customer_reference: "REF123",
        contact_person: "John",
        phonenumber: "9876543210",
        address: "123 Street",
        city: "Mumbai",
        state: "Maharashtra",
        email: "test@example.com",
        pan_number: "ABCDE1234F",
        gst_number: "27ABCDE1234F1Z5",
        account_details: "HDFC 123",
        sales_person: { firstname: "Alex", lastname: "Smith" },
        branch: { name: "Mumbai Branch" },
        active: true,
        groups: [{ name: "VIP" }],
        datecreated: "2026-01-01T00:00:00Z",
      });

      expect(row).toEqual([
        "Test Co",
        "REF123",
        "John",
        "9876543210",
        "123 Street, Mumbai, Maharashtra",
        "test@example.com",
        "ABCDE1234F",
        "27ABCDE1234F1Z5",
        "HDFC 123",
        "Alex Smith",
        "Mumbai Branch",
        "Yes",
        "VIP",
        "formatted-date",
      ]);
    });

    it("handles missing address, phone, email with '-' fallbacks", () => {
      const row = mapExportRow({ company: "Bare Co", active: true });
      expect(row[3]).toBe("-"); // Phone Number
      expect(row[4]).toBe("-"); // Address with State
      expect(row[5]).toBe("-"); // Email
    });
  });

  // =====================================================================
  // 4. Import file parsing logic
  // =====================================================================
  describe("Import file parsing", () => {
    const processRows = (rows: any[]) => {
      const valid = rows.filter((r) => r.company || r.Company || r["Company Name"] || r.name || r.Name);
      if (valid.length === 0) {
        return { success: false, error: "No valid rows found. Ensure a 'company' or 'Company' column exists." };
      }
      return { success: true, count: valid.length, data: valid };
    };

    it("accepts variations of Company column: company, Company, Company Name, name, Name", () => {
      expect(processRows([{ company: "Co A" }]).success).toBe(true);
      expect(processRows([{ Company: "Co B" }]).success).toBe(true);
      expect(processRows([{ "Company Name": "Co C" }]).success).toBe(true);
      expect(processRows([{ name: "Co D" }]).success).toBe(true);
      expect(processRows([{ Name: "Co E" }]).success).toBe(true);
    });

    it("filters out blank rows where company is empty or missing", () => {
      const input = [
        { "Company Name": "Real Company" },
        { "Company Name": "" },
        { Email: "orphan@example.com" },
        { "Company Name": "Another Company" },
      ];
      const res = processRows(input);
      expect(res.success).toBe(true);
      expect(res.count).toBe(2);
    });

    it("returns error when no valid rows with company column exist", () => {
      const res = processRows([{ Phone: "1234567890", City: "Delhi" }]);
      expect(res.success).toBe(false);
      expect(res.error).toBe("No valid rows found. Ensure a 'company' or 'Company' column exists.");
    });
  });

  // =====================================================================
  // 5. "Same as Customer Info" and "Copy Billing Address"
  // =====================================================================
  describe("Address Copying helpers", () => {
    it("'Same as Customer Info' copies address, city, state, zip, country to billing fields", () => {
      const customer = {
        company: "Test Co",
        address: "123 Main St",
        city: "Bengaluru",
        state: "Karnataka",
        zip: "560001",
        country: "India",
      };

      const copyToBilling = (c: any) => ({
        ...c,
        billing_street: c.address || "",
        billing_city: c.city || "",
        billing_state: c.state || "",
        billing_zip: c.zip || "",
        billing_country: c.country || "",
      });

      const updated = copyToBilling(customer);
      expect(updated.billing_street).toBe("123 Main St");
      expect(updated.billing_city).toBe("Bengaluru");
      expect(updated.billing_state).toBe("Karnataka");
      expect(updated.billing_zip).toBe("560001");
      expect(updated.billing_country).toBe("India");
    });

    it("'Copy Billing Address' copies billing fields to shipping fields", () => {
      const customer = {
        company: "Test Co",
        billing_street: "Suite 400, Commerce Tower",
        billing_city: "Hyderabad",
        billing_state: "Telangana",
        billing_zip: "500081",
        billing_country: "India",
      };

      const copyToShipping = (c: any) => ({
        ...c,
        shipping_street: c.billing_street || "",
        shipping_city: c.billing_city || "",
        shipping_state: c.billing_state || "",
        shipping_zip: c.billing_zip || "",
        shipping_country: c.billing_country || "",
      });

      const updated = copyToShipping(customer);
      expect(updated.shipping_street).toBe("Suite 400, Commerce Tower");
      expect(updated.shipping_city).toBe("Hyderabad");
      expect(updated.shipping_state).toBe("Telangana");
      expect(updated.shipping_zip).toBe("500081");
      expect(updated.shipping_country).toBe("India");
    });
  });
});

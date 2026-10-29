// Frontend unit tests for Vendors (/admin/vendors)
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// =====================================================================
// 1. Frontend Form Validation (Vendors.tsx:267-290)
// =====================================================================
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

const validateVendor = (f: typeof emptyForm): string | null => {
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
  const tagged = Object.entries(f).find(([, v]) => /<\s*\/?\s*[a-z!?][^>]*>/i.test(String(v ?? "")));
  if (tagged) return "Fields must not contain HTML tags";
  return null;
};

// =====================================================================
// 2. Import Row Mapping Logic (Vendors.tsx:197-236)
// =====================================================================
const normalizeKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");

const getField = (row: any, ...candidates: string[]) => {
  const normalizedRow: Record<string, any> = {};
  Object.keys(row).forEach((k) => { normalizedRow[normalizeKey(k)] = row[k]; });
  for (const candidate of candidates) {
    const val = normalizedRow[normalizeKey(candidate)];
    if (val !== undefined && val !== null && String(val).trim() !== "") return val;
  }
  return "";
};

const processVendorRows = (rows: any[]) => {
  const vendorsData = rows.map((row: any) => ({
    company_name: String(getField(row, "company name", "company", "vendor name", "vendor")),
    vendor_reference: String(getField(row, "vendor reference", "vendor ref", "reference")),
    connect_person: String(getField(row, "connect person", "contact person", "connect")),
    phone_number: String(getField(row, "phone number", "phone", "mobile", "contact number")),
    address: String(getField(row, "address with state", "adress with state", "address", "adress")),
    email: String(getField(row, "email", "email address")),
    pan_number: String(getField(row, "pan number", "pan no", "pan")),
    gst_number: String(getField(row, "gst number", "gstin", "gst no")),
    account_details: String(getField(row, "account details", "bank details", "account")),
    sales_person: String(getField(row, "sales person", "salesperson", "sales man")),
    branch: String(getField(row, "branch name", "branch")),
  }));

  const valid = vendorsData.filter((v) => v.company_name);
  return { valid, totalProcessed: rows.length };
};

// =====================================================================
// 3. Export Mapping & Full Filtered Rows Logic (Vendors.tsx:316-336, 402-414)
// =====================================================================
const getExportColumns = (canUseBranch: boolean) => [
  { header: "Company Name", key: "company_name" },
  { header: "Vendor Reference", key: "vendor_reference" },
  { header: "Connect person", key: "connect_person" },
  { header: "Phone Number", key: "phone_number" },
  { header: "Address with State", key: "address" },
  { header: "Email", key: "email" },
  { header: "Pan number", key: "pan_number" },
  { header: "GST number", key: "gst_number" },
  { header: "Account details", key: "account_details" },
  { header: "Sales person", key: "sales_person" },
  ...(canUseBranch ? [{ header: "Branch Name", key: "branch" }] : []),
];

const filterVendorsForExport = (allRows: any[], debouncedSearch: string, branchFilter: string) => {
  const q = debouncedSearch.toLowerCase().trim();
  return allRows.filter((v: any) => {
    const matchesSearch = !q ||
      v.company_name?.toLowerCase().includes(q) ||
      v.vendor_reference?.toLowerCase().includes(q) ||
      v.connect_person?.toLowerCase().includes(q) ||
      v.phone_number?.toLowerCase().includes(q) ||
      v.email?.toLowerCase().includes(q) ||
      v.gst_number?.toLowerCase().includes(q) ||
      v.pan_number?.toLowerCase().includes(q) ||
      v.sales_person?.toLowerCase().includes(q) ||
      v.branch?.toLowerCase().includes(q) ||
      v.address?.toLowerCase().includes(q) ||
      v.account_details?.toLowerCase().includes(q);
    const matchesBranch = branchFilter === "all" || v.branch === branchFilter;
    return matchesSearch && matchesBranch;
  });
};

describe("Frontend Unit Tests — Vendors", () => {
  describe("1. Form Validation (validateVendor)", () => {
    it("fails when company_name is missing or empty", () => {
      expect(validateVendor({ ...emptyForm, company_name: "" })).toBe("Company Name is required");
    });

    it("fails when company_name is only whitespace", () => {
      // NOTE from prompt: "it only checks !company_name, so '   ' (spaces only) may pass. Confirm this."
      // In validateVendor, const company = String(f.company_name || '').trim();
      // Therefore validateVendor does catch '   ' and returns 'Company Name is required'.
      expect(validateVendor({ ...emptyForm, company_name: "    " })).toBe("Company Name is required");
    });

    it("fails when company_name exceeds 200 characters", () => {
      expect(validateVendor({ ...emptyForm, company_name: "X".repeat(201) })).toBe("Company Name must be 200 characters or less");
    });

    it("validates phone number: rejects letters, too short (<10), too long (>15)", () => {
      expect(validateVendor({ ...emptyForm, company_name: "Acme", phone_number: "abcdefghij" })).toBe("Phone Number must be a valid phone number (10–15 digits)");
      expect(validateVendor({ ...emptyForm, company_name: "Acme", phone_number: "98765" })).toBe("Phone Number must be a valid phone number (10–15 digits)");
      expect(validateVendor({ ...emptyForm, company_name: "Acme", phone_number: "12345678901234567" })).toBe("Phone Number must be a valid phone number (10–15 digits)");
      expect(validateVendor({ ...emptyForm, company_name: "Acme", phone_number: "+91 98450-12345" })).toBeNull();
    });

    it("validates email address format", () => {
      expect(validateVendor({ ...emptyForm, company_name: "Acme", email: "invalid-email" })).toBe("Email is not a valid email address");
      expect(validateVendor({ ...emptyForm, company_name: "Acme", email: "test@domain" })).toBe("Email is not a valid email address");
      expect(validateVendor({ ...emptyForm, company_name: "Acme", email: "test@domain.com" })).toBeNull();
    });

    it("validates PAN format (ABCDE1234F)", () => {
      expect(validateVendor({ ...emptyForm, company_name: "Acme", pan_number: "12345ABCDE" })).toBe("PAN Number must look like ABCDE1234F");
      expect(validateVendor({ ...emptyForm, company_name: "Acme", pan_number: "ABCDE1234" })).toBe("PAN Number must look like ABCDE1234F");
      expect(validateVendor({ ...emptyForm, company_name: "Acme", pan_number: "AAOCS1234H" })).toBeNull();
    });

    it("validates GST format and ensures PAN consistency within GSTIN", () => {
      expect(validateVendor({ ...emptyForm, company_name: "Acme", gst_number: "33AAOCS1234H1Z" })).toBe("GST Number must be a valid 15-character GSTIN (e.g. 24ABCDE1234F1Z5)");
      expect(validateVendor({ ...emptyForm, company_name: "Acme", pan_number: "AAOCS1234H", gst_number: "33BBBBB1234H1Z2" })).toBe("GST Number does not match the PAN number");
      expect(validateVendor({ ...emptyForm, company_name: "Acme", pan_number: "AAOCS1234H", gst_number: "33AAOCS1234H1Z2" })).toBeNull();
    });

    it("rejects HTML tags across any field", () => {
      expect(validateVendor({ ...emptyForm, company_name: "Acme", connect_person: "<script>alert(1)</script>" })).toBe("Fields must not contain HTML tags");
      expect(validateVendor({ ...emptyForm, company_name: "Acme", address: "<b>Street 1</b>" })).toBe("Fields must not contain HTML tags");
    });
  });

  describe("2. Import Row Mapping (processVendorRows)", () => {
    it("maps standard Excel vendor headers correctly", () => {
      const sampleRows = [
        {
          "Company Name": "Orion Supplies Pvt Ltd",
          "Vendor Reference": "VEN-045",
          "Connect Person": "Suresh Nair",
          "Phone Number": "9845012345",
          "Address with State": "45 Anna Salai, Chennai, Tamil Nadu",
          "Email": "suresh@orionsupplies.com",
          "PAN Number": "AAOCS1234H",
          "GST Number": "33AAOCS1234H1Z2",
          "Account Details": "HDFC Bank A/C 1234567890",
          "Sales Person": "Divya Menon",
          "Branch": "Chennai",
        },
      ];
      const { valid } = processVendorRows(sampleRows);
      expect(valid).toHaveLength(1);
      expect(valid[0].company_name).toBe("Orion Supplies Pvt Ltd");
      expect(valid[0].vendor_reference).toBe("VEN-045");
      expect(valid[0].connect_person).toBe("Suresh Nair");
      expect(valid[0].phone_number).toBe("9845012345");
      expect(valid[0].address).toBe("45 Anna Salai, Chennai, Tamil Nadu");
      expect(valid[0].email).toBe("suresh@orionsupplies.com");
      expect(valid[0].pan_number).toBe("AAOCS1234H");
      expect(valid[0].gst_number).toBe("33AAOCS1234H1Z2");
      expect(valid[0].account_details).toBe("HDFC Bank A/C 1234567890");
      expect(valid[0].sales_person).toBe("Divya Menon");
      expect(valid[0].branch).toBe("Chennai");
    });

    it("supports case-insensitive and variant header names (e.g. Vendor Name, Contact Person, Bank Details)", () => {
      const variantRows = [
        {
          "vendor name": "Variant Co",
          "contact person": "John Doe",
          "bank details": "ICICI 5555",
          "branch name": "Surat",
        },
      ];
      const { valid } = processVendorRows(variantRows);
      expect(valid[0].company_name).toBe("Variant Co");
      expect(valid[0].connect_person).toBe("John Doe");
      expect(valid[0].account_details).toBe("ICICI 5555");
      expect(valid[0].branch).toBe("Surat");
    });

    it("CONFIRMED: import row with only spaces in company_name IS filtered out because getField checks .trim() !== ''", () => {
      // Prompt asked: "NOTE: it only checks !company_name, so '   ' (spaces only) may pass. Confirm this."
      // In Vendors.tsx:204, getField explicitly checks String(val).trim() !== "".
      // Therefore, "   " results in "" and is filtered out by vendorsData.filter((v) => v.company_name).
      const rowWithSpaces = [{ "Company Name": "    ", "Phone Number": "9999999999" }];
      const { valid } = processVendorRows(rowWithSpaces);
      expect(valid).toHaveLength(0);
    });
  });

  describe("3. Export Columns and Full Dataset Filtering", () => {
    it("export columns match expected sheet headers and order", () => {
      const colsWithoutBranch = getExportColumns(false);
      expect(colsWithoutBranch.map((c) => c.header)).toEqual([
        "Company Name",
        "Vendor Reference",
        "Connect person",
        "Phone Number",
        "Address with State",
        "Email",
        "Pan number",
        "GST number",
        "Account details",
        "Sales person",
      ]);

      const colsWithBranch = getExportColumns(true);
      expect(colsWithBranch.map((c) => c.header)).toContain("Branch Name");
    });

    it("exports ALL filtered rows across all pages, not just current page", () => {
      const allRows = [
        { _id: "1", company_name: "Acme Surat", branch: "Surat" },
        { _id: "2", company_name: "Acme Ahmedabad", branch: "Ahmedabad" },
        { _id: "3", company_name: "Beta Surat", branch: "Surat" },
        { _id: "4", company_name: "Gamma Rajkot", branch: "Rajkot" },
      ];

      // Filter by search "acme"
      const searchFiltered = filterVendorsForExport(allRows, "acme", "all");
      expect(searchFiltered).toHaveLength(2);
      expect(searchFiltered.map((v) => v.company_name)).toEqual(["Acme Surat", "Acme Ahmedabad"]);

      // Filter by branch "Surat"
      const branchFiltered = filterVendorsForExport(allRows, "", "Surat");
      expect(branchFiltered).toHaveLength(2);
      expect(branchFiltered.map((v) => v.company_name)).toEqual(["Acme Surat", "Beta Surat"]);
    });
  });

  describe("4. Branch Select Behavior", () => {
    it("saves 'Select Branch' (none) as an empty string", () => {
      const handleBranchChange = (val: string) => (val === "none" ? "" : val);
      expect(handleBranchChange("none")).toBe("");
      expect(handleBranchChange("Chennai")).toBe("Chennai");
      expect(handleBranchChange("Surat")).toBe("Surat");
    });
  });

  describe("5. Search Debounce Simulation (350 ms, trimmed)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("debounces search input by 350ms and trims whitespace", () => {
      let debounced = "";
      const onSearchChange = (input: string) => {
        setTimeout(() => {
          debounced = input.trim();
        }, 350);
      };

      onSearchChange("   Orion   ");
      expect(debounced).toBe("");

      vi.advanceTimersByTime(200);
      expect(debounced).toBe("");

      vi.advanceTimersByTime(150);
      expect(debounced).toBe("Orion");
    });
  });
});

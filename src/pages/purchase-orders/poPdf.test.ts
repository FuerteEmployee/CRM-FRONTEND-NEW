import { describe, expect, it } from "vitest";
import { buildPoPdf, poFilename } from "./poPdf";
import { buildProformaPdf, proformaFilename } from "./proformaPdf";
import { amountInWords, computeProforma } from "./proformaCalc";

// R2 / R5 / R6 / Q4 — the generated PDFs follow the client's layouts (F1 PO,
// F3 proforma): same blocks, labels, column order and totals rows; values
// come from the document + PO Settings (a FAKE company here). The margin and
// the customer's selling price never appear in the PO PDF, and the sample
// company names of the client's files never appear in any PDF.

const COMPANY = {
  name: "Test Traders Pvt Ltd", line2: "Industrial Labels", address: "12 Test Road, Surat, Gujarat", gstin: "24TESTT1234T1Z5", state: "Gujarat",
  phone: "9000012345", email: "accounts@testtraders.test", bank_account_name: "Test Traders Pvt Ltd", bank_name_branch: "Test Bank, Ring Road",
  bank_account_no: "000111222333", bank_ifsc: "TEST0000123", po_terms: "Deliver to the Surat warehouse.", payment_terms: "ADVANCE", delivery_terms: "8-10 WEEKS",
};
const SAMPLE_NAMES = ["DIS" + "HAN", "GLOB" + "SPOT"];

// jsPDF keeps text uncompressed by default: each text run is "(text) Tj".
const textOf = (doc: any) => String(doc.output()).replace(/\\\(/g, "(").replace(/\\\)/g, ")");
const inOrder = (text: string, labels: string[]) => {
  let at = -1;
  for (const l of labels) {
    const i = text.indexOf(l, at + 1);
    if (i < 0) throw new Error(`"${l}" missing or out of order`);
    at = i;
  }
  return true;
};

const PO = {
  type: "purchase",
  po_number: "DA/07/26-27",
  po_date: "2026-10-20",
  supplier: { name: "Brady Test Supplier", address: "Test Park, Bengaluru 560100", gstin: "29TESTB0000B1Z1" },
  notes: "Urgent",
  items: [
    { item_code: "FX-M7-1", y_code: "Y9000501", name: "FX-M7-1", hsn: "39199090", unit: "Nos", qty: 1, cost_price: 3207.37, rate: 3207, amount: 3207, tax_rate: 18, selling_price: 4800.55, margin_pct: 33.19, margin_amount: 1593.18 },
    { item_code: "FX-M7-2", y_code: "Y9000502", name: "FX-M7-2", hsn: "", unit: "Nos", qty: 1, cost_price: 1869.46, rate: 1869, amount: 1869, tax_rate: 18, selling_price: 2689.1, margin_pct: 30.48, margin_amount: 819.64 },
  ],
  totals: { subtotal: 5076, tax_total: 913.68, grand_total: 5989.68, sell_value: 7489.65, margin_pct: 32.22, margin_amount: 2412.82 },
};

describe("PO PDF = F1 layout", () => {
  it("blocks, labels, column order and totals rows in F1 order; values from the PO + company details", async () => {
    const t = textOf(await buildPoPdf(PO, COMPANY));
    expect(inOrder(t, [
      "Test Traders Pvt Ltd", "PURCHASE ORDER", "PO number", "DA/07/26-27", "PO date",
      "SUPPLIER", "Brady Test Supplier",
      "ORDER ITEMS", "Currency: INR",
      "Sr.", "Item of Requisition", "Description / Specification", "HSN / SAC", "Qty", "Unit", "Unit rate", "Taxable value", "GST %",
      "FX-M7-1", "Y9000501", "3,207.00", "FX-M7-2", "Y9000502", "1,869.00",
      "Taxable subtotal", "5,076.00", "GST amount", "913.68", "GRAND TOTAL (INR)", "5,989.68",
      "TERMS & CONDITIONS", "Deliver to the Surat warehouse.", "Prepared by", "For Test Traders Pvt Ltd", "Authorised Signatory",
    ])).toBe(true);
    expect(t).toContain("GSTIN: 24TESTT1234T1Z5");
  });
  it("NEVER the margin or the customer's selling price (R6)", async () => {
    const t = textOf(await buildPoPdf(PO, COMPANY));
    expect(t).not.toMatch(/margin/i);
    for (const v of ["4,800.55", "4800.55", "2,689.10", "7,489.65", "1,593.18", "2,412.82", "33.19", "32.22"]) expect(t).not.toContain(v);
  });
  it("no sample company of the client's files (Q4)", async () => {
    const t = textOf(await buildPoPdf(PO, COMPANY)).toUpperCase();
    SAMPLE_NAMES.forEach((n) => expect(t).not.toContain(n));
  });
  it("file name is file-safe", () => {
    expect(poFilename(PO)).toBe("DA-07-26-27.pdf");
  });
});

describe("Proforma PDF = F3 layout", () => {
  const lines = [
    { ref_no: "FX-M7-1", description: "Y9000501", hsn: "39199090", qty: 1, unit: "Nos", rate: 3691, disc_pct: 0, gst_pct: 18 },
    { ref_no: "FX-M7-2", description: "Y9000502", hsn: "", qty: 1, unit: "Nos", rate: 2151, disc_pct: 0, gst_pct: 18 },
  ];
  const { lines: computed, totals } = computeProforma(lines, "igst", 0);
  const PF = {
    number: "0197", date: "2026-10-20", valid_until: "2026-11-04", customer_po_number: "CUST-77", tax_type: "igst",
    bill_to: { name: "Sample Customer Ltd", address: "Ahmedabad", gstin: "24AAAAA0000A1Z5", email: "c@example.test", phone: "9876543210" },
    lines: computed, totals, amount_in_words: amountInWords(totals.grand_total), seller: COMPANY,
  };
  it("header, seller / invoice details, BILL TO, TAX TYPE, F3 columns, bank + totals, terms, words, footer — in order", async () => {
    const t = textOf(await buildProformaPdf(PF));
    expect(inOrder(t, [
      "Test Traders Pvt Ltd", "Industrial Labels", "PROFORMA", "INVOICE", "For quotation / payment reference",
      "Address", "GSTIN", "24TESTT1234T1Z5", "Email / Phone",
      "Invoice no.", "0197", "Date", "Valid until", "Customer PO", "CUST-77",
      "BILL TO", "Name", "Sample Customer Ltd", "TAX TYPE", "IGST",
      "REF No.", "DESCRIPTION", "HSN/SAC", "Qty", "Unit", "Rate", "Disc %", "Taxable", "GST %", "Total",
      "FX-M7-1", "Y9000501", "3,691.00", "4,355.38", "FX-M7-2", "2,538.18",
      "BANK DETAILS", "Account name", "Bank / Branch", "Account no.", "000111222333", "IFSC", "TEST0000123",
      "Taxable subtotal", "5,842.00", "CGST", "SGST / UTGST", "IGST", "1,051.56", "GRAND TOTAL", "6,893.56", "Advance received", "BALANCE PAYABLE",
      "COMMERCIAL TERMS", "Payment terms", "ADVANCE", "Delivery time", "8-10 WEEKS",
      "AMOUNT IN WORDS", "Six thousand eight hundred ninety three rupees and fifty six paisa only.",
      "PROFORMA ONLY. NOT A TAX INVOICE.",
    ])).toBe(true);
  });
  it("no margin, no sample company names", async () => {
    const t = textOf(await buildProformaPdf(PF));
    expect(t).not.toMatch(/margin/i);
    SAMPLE_NAMES.forEach((n) => expect(t.toUpperCase()).not.toContain(n));
    expect(proformaFilename(PF)).toBe("Proforma-0197.pdf");
  });
});

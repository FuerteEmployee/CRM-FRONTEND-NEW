// Invoices — frontend UNIT tests against the real exported helpers the invoice
// pages use (tenant gates, amount in words, tax labels, customer autofill).
// The page-level logic of InvoiceCreate.tsx / Invoices.tsx is not exported, so it
// is exercised for real in src/test/invoices.ui.test.mjs (Playwright).
// Convention: tests assert EXPECTED behaviour; a failing test is a finding.
import { describe, it, expect } from "vitest";
import { isTrinetraPilotUser } from "@/lib/trinetraPilot";
import { isRudraverseTenant } from "@/lib/rudraverseTenant";
import { canAccessBankDetails } from "@/lib/bankDetailsAccess";
import { isEkagraUser } from "@/lib/ekagraTenant";
import { amountToWords } from "@/lib/ekagraTaxInvoice";
import { amountInWords, itemTaxLabel, trimZeroDecimals } from "@/lib/invoiceDisplay";
import { customerDetails } from "@/lib/customerAutofill";

const TENANT_EMAILS = {
  BeOnTime: "admin@beontime.inv-test.local",
  CitySmile: "admin@citysmile.inv-test.local",
  Kiran: "admin@kiran.inv-test.local",
  OffixNest: "admin@offixnest.inv-test.local",
  Rudraverse: "info@trinetratechnoworld.com",
  Ekagra: "ekagraengineering@gmail.com",
};

describe("tenant gates (which company sees which invoice feature)", () => {
  const expected: Record<string, { pilot: boolean; bank: boolean; ekagra: boolean }> = {
    BeOnTime: { pilot: false, bank: false, ekagra: false },
    CitySmile: { pilot: false, bank: false, ekagra: false },
    Kiran: { pilot: false, bank: false, ekagra: false },
    OffixNest: { pilot: false, bank: false, ekagra: false },
    Rudraverse: { pilot: true, bank: true, ekagra: false },
    Ekagra: { pilot: false, bank: true, ekagra: true },
  };
  it.each(Object.entries(TENANT_EMAILS))("%s", (name, email) => {
    expect(isTrinetraPilotUser(email)).toBe(expected[name].pilot);
    expect(isRudraverseTenant(email)).toBe(expected[name].pilot);
    expect(canAccessBankDetails(email)).toBe(expected[name].bank);
    expect(isEkagraUser(email)).toBe(expected[name].ekagra);
  });
  it("gates are case/space-insensitive", () => {
    expect(isTrinetraPilotUser("  INFO@TrinetraTechnoWorld.com ")).toBe(true);
    expect(isEkagraUser("EkagraEngineering@Gmail.com")).toBe(true);
  });
  it("gates are off for empty / null email", () => {
    expect(isTrinetraPilotUser(null)).toBe(false);
    expect(canAccessBankDetails(undefined)).toBe(false);
  });
});

describe("amount in words", () => {
  it("1180 -> One Thousand One Hundred Eighty Only", () => {
    expect(amountToWords(1180)).toBe("One Thousand One Hundred Eighty Only");
  });
  it("Indian grouping: 1,23,45,678", () => {
    expect(amountToWords(12345678)).toBe("One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only");
  });
  it("0 -> Zero Only", () => expect(amountToWords(0)).toBe("Zero Only"));
  it("paise are written (1168.66 -> ... and Sixty Six Paise)", () => {
    expect(amountInWords(1168.66, { amountToWordsLower: false })).toMatch(/Sixty Eight.*Sixty Six Paise/);
  });
  it("the words match the printed total (1168.66 is not written as 1169)", () => {
    expect(amountInWords(1168.66, { amountToWordsLower: false })).not.toMatch(/Sixty Nine/);
  });
  it("negative total (credit) does not print 'undefined'", () => {
    expect(amountToWords(-50)).not.toMatch(/undefined/);
  });
  it("lower-case option", () => expect(amountInWords(5, { amountToWordsLower: true })).toBe("five only"));
});

describe("itemTaxLabel", () => {
  it("name + rate", () => expect(itemTaxLabel({ tax: 18, tax_name: "GST" }, { removeTaxName: false })).toBe("GST 18%"));
  it("name already has %", () => expect(itemTaxLabel({ tax: 18, tax_name: "GST 18%" }, { removeTaxName: false })).toBe("GST 18%"));
  it("removeTaxName", () => expect(itemTaxLabel({ tax: 5, tax_name: "GST" }, { removeTaxName: true })).toBe("5%"));
  // The server now charges the picked tax (0%) when tax is 0 — the label must match.
  it("tax 0 with gstPercentage 18 shows the rate the backend actually charges (0%)", () => {
    expect(itemTaxLabel({ tax: 0, gstPercentage: 18 }, { removeTaxName: true })).toBe("0%");
  });
  it("no tax set falls back to GST % (18%)", () => {
    expect(itemTaxLabel({ gstPercentage: 18 }, { removeTaxName: true })).toBe("18%");
  });
});

describe("trimZeroDecimals", () => {
  it("₹2.00 -> ₹2", () => expect(trimZeroDecimals("₹2.00", { removeDecimalsZero: true })).toBe("₹2"));
  it("₹2.25 stays", () => expect(trimZeroDecimals("₹2.25", { removeDecimalsZero: true })).toBe("₹2.25"));
  it("₹1,00,000.00 -> ₹1,00,000", () => expect(trimZeroDecimals("₹1,00,000.00", { removeDecimalsZero: true })).toBe("₹1,00,000"));
});

describe("customer autofill (picking a customer on the invoice form)", () => {
  it("fills GSTIN upper-case, VAT, currency, sales person", () => {
    const d = customerDetails({ company: "X", gst_number: "24aaaaa1111a1z5", vat: "V1", currency: "USD", sales_person: { _id: "s1", firstname: "Sam", lastname: "P" }, address: "1 Road", city: "Surat", state: "Gujarat" });
    expect(d.gstNumber).toBe("24AAAAA1111A1Z5");
    expect(d.vat).toBe("V1");
    expect(d.currency).toBe("USD");
    expect(d.salesPerson).toEqual({ id: "s1", name: "Sam P" });
    expect(d.billingText).toContain("Surat");
  });
  it("missing values come back as ''", () => {
    const d = customerDetails({ company: "Y" });
    expect(d.gstNumber).toBe("");
    expect(d.salesPerson).toEqual({ id: "", name: "" });
  });
});

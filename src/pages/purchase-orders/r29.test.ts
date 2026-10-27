// Round 29 — frontend unit tests: the S4 validators (same cases + messages as
// CRM-BACKEND/src/__tests__/purchaseOrders/r29-unit.test.js), the S2 action
// rules, the S3 auto-fill mapping, the S1 series helpers, the S5 "valid days"
// blur fix, and the Crystal Bunglows totals (same numbers as the backend).
import { describe, expect, test } from "vitest";
import * as V from "./poValidation";
import { deleteConfirmText, poItemActions, proformaActions, rowActions } from "./poActions";
import { addOrMerge, applyReadLines, BELOW_FLOOR, readFileError, type ReadLine } from "./autoFill";
import { computePo, costOf, purchaseRule } from "./poCalc";

describe("S4 validators (mirror of the server)", () => {
  test.each([
    ["M7-84-499", ""], [" M21-500-423 ", ""], ["M4-7-595/0.5in", ""], ["", "Catalog no. is required"], ["A", "Catalog no. must be 2 to 40 characters"],
    ["X".repeat(41), "Catalog no. must be 2 to 40 characters"], ["M7 84", "Catalog no. can only have letters, digits and - / . _ (no spaces)"], ["-AB", "Catalog no. can only have letters, digits and - / . _ (no spaces)"],
  ])("catalog %j -> %j", (v, m) => expect(V.catalogNoError(v)).toBe(m));
  test.each([["Y5075406", ""], ["", ""], ["Y1234", "Y code must be Y followed by 5 to 9 digits (e.g. Y5075406)"], ["Y1234567890", "Y code must be Y followed by 5 to 9 digits (e.g. Y5075406)"]])(
    "Y code %j -> %j", (v, m) => expect(V.yCodeError(v)).toBe(m));
  const PHONE = "Phone: Enter a 10-digit mobile (starting 6-9, +91 / 0 allowed) or a landline with STD code";
  test.each([["9876543210", ""], ["+91 98765 43210", ""], ["09876543210", ""], ["079-26581234", ""], ["+91 79 0000 0000", ""], ["12345", PHONE], ["5876543210", PHONE], ["abc", PHONE], ["98765-4321a", PHONE]])(
    "phone %j -> %j", (v, m) => expect(V.phoneError(v)).toBe(m));
  test.each([
    ["24ABCDE1234F1Z5", ""], ["24abcde1234f1z5", ""], ["99ABCDE1234F1Z5", "GSTIN: state code 99 is not valid (01-38)"], ["00ABCDE1234F1Z5", "GSTIN: state code 00 is not valid (01-38)"],
    ["24ABCDE1234F1Z", "GSTIN must be 15 characters like 24ABCDE1234F1Z5"], ["24ABCDE1234F0Z5", "GSTIN must be 15 characters like 24ABCDE1234F1Z5"],
  ])("GSTIN %j -> %j", (v, m) => expect(V.gstinError(v)).toBe(m));
  test.each([["SGE/PO/2026/145", ""], ["PO (rev 2)", ""], ["<b>x</b>", "Customer PO No. can only have letters, digits, space and - _ . ( ) /"], ["A".repeat(61), "Customer PO No. can't be longer than 60 characters"]])(
    "customer PO no. %j -> %j", (v, m) => expect(V.customerPoNoError(v)).toBe(m));
  test("customer PO no. required when the file is attached", () => expect(V.customerPoNoError("", { required: true })).toBe("Customer PO No. is required when the customer's PO file is attached"));
  test.each([["DA", ""], ["SPK-PPO", ""], ["", "PO number prefix is required"], ["DA/1", 'PO number prefix: 1 to 10 letters, digits or - (no "/" or spaces)'], ["ABCDEFGHIJK", 'PO number prefix: 1 to 10 letters, digits or - (no "/" or spaces)']])(
    "prefix %j -> %j", (v, m) => expect(V.poPrefixError(v)).toBe(m));
  test.each([["a@b.co", ""], ["a@b", "Email is not a valid email address"]])("email %j -> %j", (v, m) => expect(V.emailError(v)).toBe(m));
  test.each([["3919", ""], ["39199090", ""], ["39199", "HSN/SAC must be 4, 6 or 8 digits"]])("HSN %j -> %j", (v, m) => expect(V.hsnError(v)).toBe(m));
  test("GST 23 warned; slabs fine", () => {
    expect(V.gstWarning(18)).toBe("");
    expect(V.gstWarning(23)).toBe("GST % 23 is not a usual GST rate (0, 5, 12, 18, 28 or 40)");
  });
  test.each([[1, ""], [100000, ""], [0, "Quantity must be more than 0"], [-1, "Quantity must be more than 0"], [1.5, "Quantity must be a whole number"], ["abc", "Quantity: enter a number"], [100001, "Quantity can't be more than 1,00,000"]])(
    "qty %j -> %j", (v, m) => expect(V.quantityError(v)).toBe(m));
  test.each([[0, ""], [10000000, ""], ["abc", "Price: enter a number"], [-1, "Price can't be negative"], [1e12, "Price can't be more than 1,00,00,000"], [1.005, "Price: at most 2 decimals"]])(
    "price %j -> %j", (v, m) => expect(V.priceError(v)).toBe(m));
  test.each([[100, ""], [101, "Disc % must be from 0 to 100"]])("disc %j -> %j", (v, m) => expect(V.percentError(v)).toBe(m));
  test("dates: expected before PO date; customer PO date after PO date", () => {
    expect(V.expectedDateError("2026-10-27", "2026-10-26")).toBe("Expected delivery can't be before the PO date");
    expect(V.expectedDateError("2026-10-27", "2026-10-27")).toBe("");
    expect(V.customerPoDateError("2026-10-27", "2026-10-28")).toBe("Customer PO date can't be after the PO date");
  });
  test("S5: valid days keeps the typed text; on blur '05' -> 5; 0 / 400 / 1.5 are errors", () => {
    expect(V.daysOnBlur("05")).toBe(5);
    expect(V.daysOnBlur("")).toBe("");
    expect(V.validDaysError(V.daysOnBlur("05"))).toBe("");
    for (const v of [0, 400, 1.5, "abc"]) expect(V.validDaysError(v)).toBe("Valid for (days) must be a whole number from 1 to 365");
  });
});

describe("S1 series helpers", () => {
  test("clean / validate / reuse / from sheet", () => {
    expect(V.cleanSeriesName(" BMP71  M710 ")).toBe("BMP71 M710");
    expect(V.seriesNameError("")).toBe("Series is required");
    expect(V.seriesNameError("PMK&BBP")).toBe("Series name: 1 to 40 letters, digits, spaces, - or _");
    expect(V.reuseSeries("m210", ["M210"])).toBe("M210");
    expect(V.seriesFromSheet("PMK&BBP85_30.03.2026")).toBe("PMK-BBP85_30-03-2026");
  });
});

describe("S2 action rules", () => {
  test("pending / approved / sent / received / cancelled / with proforma / no permission", () => {
    const all = { canEdit: true, canDelete: true };
    expect(rowActions({ status: "draft" }, all)).toEqual({ view: { enabled: true, reason: null }, edit: { enabled: true, reason: null }, delete: { enabled: true, reason: null } });
    expect(rowActions({ status: "pending_approval" }, all).edit.reason).toBe("Pending POs are locked");
    expect(rowActions({ status: "pending_approval" }, all).delete.reason).toBe("Pending POs are locked");
    for (const s of ["approved", "sent", "partially_received", "received"]) {
      expect(rowActions({ status: s }, all).edit.reason).toBe("Approved POs are locked");
      expect(rowActions({ status: s }, all).delete.reason).toBe("Approved POs are locked");
    }
    expect(rowActions({ status: "cancelled" }, all).edit.reason).toBe("Cancelled POs are locked");
    expect(rowActions({ status: "cancelled" }, all).delete.enabled).toBe(true);
    expect(rowActions({ status: "draft", has_proforma: true }, all).delete.reason).toBe("Has a proforma invoice");
    expect(rowActions({ status: "draft" }, { canEdit: false, canDelete: false })).toMatchObject({ edit: { reason: "No permission" }, delete: { reason: "No permission" } });
    expect(deleteConfirmText("DA/03/26-27")).toBe("Delete PO DA/03/26-27? This can't be undone.");
  });
  test("proforma + PO item rows", () => {
    expect(proformaActions({ status: "draft" }, { canEdit: true })).toMatchObject({ edit: { enabled: true }, cancel: { enabled: true } });
    expect(proformaActions({ status: "sent" }, { canEdit: true }).edit.reason).toBe("Sent proformas are locked");
    expect(proformaActions({ status: "cancelled" }, { canEdit: true }).cancel.reason).toBe("Already cancelled");
    expect(proformaActions({ status: "draft" }, { canEdit: false }).edit.reason).toBe("No permission");
    expect(poItemActions({ canManage: false }).delete.reason).toBe("No permission");
  });
});

// The read answer for the Crystal Bunglows sample (as the server returns it).
const ITEM_M7 = { _id: "m7", item_code: "M7-84-499", y_code: "Y5075406", name: "M7-84-499", master_price: 3207.37, distributor_price: 3690.88, end_customer_price: 4613.6, tax_rate: 18 };
const ITEM_M21 = { _id: "m21", item_code: "M21-500-423", y_code: "Y4900629", name: "M21-500-423", master_price: 1914.44, distributor_price: 2203.04, end_customer_price: 2753.8, tax_rate: 18 };
const CRYSTAL: ReadLine[] = [
  { status: "matched", text: "1 | M7-84-499", item_id: "m7", qty: 2, rate: 5000, item: ITEM_M7 },
  { status: "matched", text: "2 | M21-500-423", item_id: "m21", qty: 5, rate: 3000, item: ITEM_M21 },
  { status: "not_found", text: "3 | ZZ-1", catalog: "ZZ-1" },
];

describe("S3 auto-fill mapping", () => {
  test("matched lines -> item, qty, cost / floor from PO Items, selling = customer rate; red lines are not added", () => {
    const out = applyReadLines([], CRYSTAL, "end_user");
    expect(out).toMatchObject({ added: 2, merged: 0, matched: 2, notFound: 1, qtyUnreadable: 0, belowFloor: 0 });
    expect(out.lines.map((l) => [l.item_code, l.qty, l.cost_price, l.list_price, l.selling_price])).toEqual([["M7-84-499", 2, 3207.37, 4613.6, 5000], ["M21-500-423", 5, 1914.44, 2753.8, 3000]]);
  });
  test("customer rate below the floor -> floor + flag; distributor level uses DP as the floor", () => {
    const low: ReadLine[] = [{ status: "matched", text: "", item_id: "m7", qty: 1, rate: 4000, item: ITEM_M7 }];
    const eu = applyReadLines([], low, "end_user");
    expect(eu.lines[0]).toMatchObject({ selling_price: 4613.6, list_price: 4613.6 });
    expect(eu.lines[0].note).toContain(BELOW_FLOOR);
    expect(eu.belowFloor).toBe(1);
    const dp = applyReadLines([], low, "distributor");
    expect(dp.lines[0]).toMatchObject({ selling_price: 4000, list_price: 3690.88 });
  });
  test("qty unreadable -> added with an empty qty (the line then says 'Quantity must be more than 0')", () => {
    const out = applyReadLines([], [{ status: "qty_unreadable", text: "", item_id: "m21", qty: null, rate: null, item: ITEM_M21 }], "end_user");
    expect(out.lines[0].qty).toBe("");
    expect(computePo(out.lines, "purchase", "intra", purchaseRule(undefined)).lines[0].errors).toContain("Quantity must be more than 0");
  });
  test("same item already on the PO -> merged (qty added)", () => {
    const first = applyReadLines([], CRYSTAL, "end_user").lines;
    const again = applyReadLines(first, CRYSTAL.slice(0, 1), "end_user");
    expect(again).toMatchObject({ added: 0, merged: 1 });
    expect(again.lines[0].qty).toBe(4);
  });
  test("picker add: same item again -> qty + 1 (merged)", () => {
    const a = addOrMerge([{ item_id: "x", qty: 2 }], { item_id: "x", qty: 1 });
    expect(a).toEqual({ lines: [{ item_id: "x", qty: 3 }], merged: true });
    expect(addOrMerge([{ item_id: "x", qty: 2 }], { item_id: "y", qty: 1 }).merged).toBe(false);
  });
  test("file checks before reading: image / empty / 11 MB / .exe / ok", () => {
    const f = (name: string, size: number) => ({ name, size }) as File;
    expect(readFileError(f("scan.png", 10))).toBe("Can't read a scanned file — add items by hand");
    expect(readFileError(f("po.pdf", 0))).toBe("The file is empty");
    expect(readFileError(f("po.pdf", 11 * 1024 * 1024))).toBe("The file is larger than 10 MB");
    expect(readFileError(f("setup.exe", 10))).toBe("Only a PDF or Excel (.xlsx) customer PO can be read");
    expect(readFileError(f("po.xlsx", 10))).toBe("");
  });
});

describe("Totals — Crystal Bunglows (same numbers as the backend test)", () => {
  const lines = applyReadLines([], CRYSTAL, "end_user").lines;
  test("taxable 15,984 (whole-rupee cost) / GST 2,877.12 / grand 18,861.12 / margin 36.05 %", () => {
    const c = computePo(lines, "purchase", "intra", purchaseRule(undefined));
    expect(c.lines.map((l) => [l.rate, l.amount])).toEqual([[3207, 6414], [1914, 9570]]);
    expect(c.totals).toMatchObject({ subtotal: 15984, cgst: 1438.56, sgst: 1438.56, igst: 0, tax_total: 2877.12, grand_total: 18861.12, sell_value: 25000, cost_value: 15986.94, margin_pct: 36.05, margin_amount: 9013.06 });
    expect(c.hasErrors).toBe(false);
    const inter = computePo(lines, "purchase", "inter", purchaseRule(undefined));
    expect(inter.totals).toMatchObject({ igst: 2877.12, cgst: 0, grand_total: 18861.12 });
  });
  test("qty 1.5 / 100001 and selling 3 decimals / > 1 crore are line errors", () => {
    const base = { ...lines[0] };
    const errs = (patch: any) => computePo([{ ...base, ...patch }], "purchase", "intra", purchaseRule(undefined)).lines[0].errors;
    expect(errs({ qty: 1.5 })).toContain("Quantity must be a whole number");
    expect(errs({ qty: 100001 })).toContain("Quantity can't be more than 1,00,000");
    expect(errs({ selling_price: 5000.555 })).toContain("Selling price: at most 2 decimals");
    expect(errs({ selling_price: 2e7 })).toContain("Selling price can't be more than 1,00,00,000");
  });
  test("costOf: MDP else DP (flag)", () => {
    expect(costOf({ master_price: 0, distributor_price: 10 })).toEqual({ cost_price: 10, cost_source: "dp" });
  });
});

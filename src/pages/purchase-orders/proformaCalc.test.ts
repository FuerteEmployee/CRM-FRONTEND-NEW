import { describe, expect, it } from "vitest";
import { amountError, amountInWords, computeProforma } from "./proformaCalc";

// R5 — the client's proforma sheet formulas; same numbers as the backend
// (CRM-BACKEND src/services/proformaMath.js, r28-unit.test.js).
const L = (qty: number, rate: number, disc: number, gst: number, extra = {}) => ({ qty, rate, disc_pct: disc, gst_pct: gst, ...extra });

describe("proforma maths", () => {
  it("IGST: taxable + ROUND(taxable x gst, 2); IGST = grand - taxable", () => {
    const r = computeProforma([L(1, 3691, 0, 18), L(1, 2151, 0, 18)], "igst", 0);
    expect(r.lines.map((l) => [l.taxable, l.total])).toEqual([[3691, 4355.38], [2151, 2538.18]]);
    expect(r.totals).toEqual({ taxable: 5842, cgst: 0, sgst: 0, igst: 1051.56, grand_total: 6893.56, advance: 0, balance: 6893.56 });
  });
  it("CGST + SGST: taxable + 2 x ROUND(taxable x gst / 2, 2)", () => {
    const r = computeProforma([L(1, 10.05, 0, 18), L(3, 333.33, 0, 5)], "cgst_sgst");
    expect(r.lines[0]).toMatchObject({ taxable: 10.05, tax: 1.8, total: 11.85 });
    expect(r.totals).toMatchObject({ taxable: 1010.04, cgst: 25.9, sgst: 25.9, igst: 0, grand_total: 1061.84 });
    expect(computeProforma([L(1, 10.05, 0, 18)], "igst").lines[0]).toMatchObject({ tax: 1.81, total: 11.86 });
  });
  it("Disc %, freight line, advance -> balance", () => {
    expect(computeProforma([L(3, 1000, 10, 18), L(7, 33.33, 12.5, 18)], "igst").lines.map((l) => l.taxable)).toEqual([2700, 204.15]);
    const r = computeProforma([L(1, 3691, 0, 18), L(1, 500, 0, 18, { is_extra: true })], "igst", "2000");
    expect(r.totals).toMatchObject({ taxable: 4191, igst: 754.38, grand_total: 4945.38, advance: 2000, balance: 2945.38 });
  });
  it("typed values: negative / over 100 / text -> error text", () => {
    expect(amountError("-1", "Disc %", 100)).toBe("Disc % can't be negative");
    expect(amountError("101", "Disc %", 100)).toBe("Disc % can't be more than 100");
    expect(amountError("abc", "Disc %", 100)).toBe("Disc %: enter a number");
    expect(amountError("10", "Disc %", 100)).toBeNull();
  });
});

describe("amount in words (Indian system)", () => {
  it.each([
    [0, "Zero rupees only."],
    [1, "One rupee only."],
    [999, "Nine hundred ninety nine rupees only."],
    [100000, "One lakh rupees only."],
    [6893.56, "Six thousand eight hundred ninety three rupees and fifty six paisa only."],
    [137540.8, "One lakh thirty seven thousand five hundred forty rupees and eighty paisa only."],
    [10000000, "One crore rupees only."],
  ])("%p -> %s", (n, words) => {
    expect(amountInWords(n)).toBe(words);
  });
});

import { describe, expect, it } from "vitest";
import { computePo, type PoRule } from "./poCalc";

// Same cases as CRM-BACKEND purchase_orders.test.js, so the live numbers in
// the editor agree with what the server decides on save.
const PURCHASE: PoRule = { list_price_field: "end_customer_price", max_discount_pct: 25, min_margin_pct: 13, allow_below_list: true };
const SALES: PoRule = { list_price_field: "end_customer_price", max_discount_pct: null, min_margin_pct: null, allow_below_list: false };
const line = (selling: number, cost = 70, list = 100) => ({
  item_id: "1", name: "Label", qty: 2, cost_price: cost, list_price: list, selling_price: selling, tax_rate: 18,
});

describe("computePo", () => {
  it("prints cost on a purchase PO and selling price on a sales PO", () => {
    expect(computePo([line(90)], "purchase", "intra", PURCHASE).lines[0].rate).toBe(70);
    expect(computePo([line(90)], "sales", "intra", SALES).lines[0].rate).toBe(90);
  });

  it("flags the same breaches as the server", () => {
    expect(computePo([line(100)], "purchase", "intra", PURCHASE).approvalRequired).toBe(false);
    expect(computePo([line(100, 87)], "purchase", "intra", PURCHASE).approvalRequired).toBe(false);
    expect(computePo([line(80)], "purchase", "intra", PURCHASE).approvalRequired).toBe(true);
    expect(computePo([line(74, 10)], "purchase", "intra", PURCHASE).approvalRequired).toBe(true);
    expect(computePo([line(100, 0)], "purchase", "intra", PURCHASE).approvalRequired).toBe(true);
    expect(computePo([line(120)], "sales", "intra", SALES).approvalRequired).toBe(false);
    expect(computePo([line(99.5)], "sales", "intra", SALES).approvalRequired).toBe(true);
  });

  it("splits GST", () => {
    expect(computePo([line(100)], "sales", "intra", SALES).totals).toMatchObject({ subtotal: 200, cgst: 18, sgst: 18, grand_total: 236 });
    expect(computePo([line(100)], "sales", "inter", SALES).totals).toMatchObject({ igst: 36, grand_total: 236 });
  });
});

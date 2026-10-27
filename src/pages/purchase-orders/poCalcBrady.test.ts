import { describe, expect, it } from "vitest";
import { computePo, costOf, marginAmount, marginPct, purchaseRule, type PoLine } from "./poCalc";

// Round 28 (R6 / Q1 / Q2 / Q3) — the editor's margin columns and floor. Same
// numbers as CRM-BACKEND src/__tests__/purchaseOrders/r28-unit.test.js.
const SAVED = { list_price_field: "end_customer_price" as const, max_discount_pct: null, min_margin_pct: 13, allow_below_list: false, price_floor: true };
const line = (selling: any, extra: Partial<PoLine> = {}): PoLine => ({
  item_id: "1", name: "M7", item_code: "FX-M7-1", qty: 2, cost_price: 3207.37, list_price: 4613.6, selling_price: selling, tax_rate: 18, cost_source: "mdp", ...extra,
});

describe("margin columns (screen only)", () => {
  it("Margin % = (selling - cost) / selling; Margin ₹ = (selling - cost) x qty; PO rate = cost in whole rupees (Q3)", () => {
    const r = computePo([line(4613.6)], "purchase", "inter", purchaseRule(SAVED));
    expect(r.lines[0]).toMatchObject({ margin_pct: 30.48, margin_amount: 2812.46, rate: 3207, amount: 6414, tax_amount: 1154.52 });
    expect(r.totals).toMatchObject({ subtotal: 6414, igst: 1154.52, grand_total: 7568.52, margin_pct: 30.48, margin_amount: 2812.46 });
  });
  it("totals row: margin over all lines; unknown cost -> no total margin", () => {
    const two = computePo([line(4613.6), line(2689.1, { item_id: "2", cost_price: 1869.46, list_price: 2689.1, qty: 1 })], "purchase", "intra", purchaseRule(SAVED));
    expect(two.totals.margin_amount).toBeCloseTo(2812.46 + 819.64, 2);
    expect(two.totals.margin_pct).toBe(marginPct(2 * 4613.6 + 2689.1, 2 * 3207.37 + 1869.46));
    const unknown = computePo([line(100, { cost_price: 0, list_price: 0 })], "purchase", "intra", purchaseRule(SAVED));
    expect(unknown.lines[0].margin_amount).toBeNull();
    expect(unknown.totals.margin_amount).toBeNull();
  });
  it("helpers", () => {
    expect(marginPct(100, 87)).toBe(13);
    expect(marginAmount(100, 87, 3)).toBe(39);
    expect(marginAmount(100, 0, 3)).toBeNull();
  });
});

describe("floor (price only up) and price level (Q2)", () => {
  it("selling = End User Price ok; EP - 0.01 error (Save / Submit blocked); raise -> reason for the approver", () => {
    const rule = purchaseRule(SAVED, "end_user");
    expect(computePo([line(4613.6)], "purchase", "intra", rule).lines[0].errors).toEqual([]);
    const low = computePo([line(4613.59)], "purchase", "intra", rule);
    expect(low.lines[0].errors).toEqual(["Can't be lower than 4613.6"]);
    expect(low.hasErrors).toBe(true);
    expect(computePo([line(5000)], "purchase", "intra", rule).lines[0].breaches).toEqual(["Price raised from 4613.6 to 5000"]);
  });
  it("purchaseRule: the floor is always on, even if the saved rule says off; distributor -> DP field", () => {
    expect(purchaseRule({ ...SAVED, price_floor: false }).price_floor).toBe(true);
    expect(purchaseRule(SAVED, "distributor").list_price_field).toBe("distributor_price");
    expect(purchaseRule(SAVED, "end_user").list_price_field).toBe("end_customer_price");
    expect(purchaseRule(undefined).min_margin_pct).toBe(13);
  });
});

describe("Q1 cost", () => {
  it("MDP, else DP (flagged to the approver), else landing cost", () => {
    expect(costOf({ master_price: 3207.37, distributor_price: 3690.88 })).toEqual({ cost_price: 3207.37, cost_source: "mdp" });
    expect(costOf({ master_price: 0, distributor_price: 34002 })).toEqual({ cost_price: 34002, cost_source: "dp" });
    expect(costOf({ cost_price: 50 })).toEqual({ cost_price: 50, cost_source: "landing" });
    const dp = computePo([line(39102, { cost_price: 34002, list_price: 39102, cost_source: "dp", qty: 1 })], "purchase", "intra", purchaseRule(SAVED));
    expect(dp.lines[0].breaches).toEqual(["Cost from DP (no Master Distributor Price)"]);
  });
});

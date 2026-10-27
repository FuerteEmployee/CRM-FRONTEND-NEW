import { describe, expect, it } from "vitest";
import { computePo, floorError, purchaseRule, type PoRule } from "./poCalc";

// "Price only up" (PO Settings price_floor) — same verdicts and texts as the
// server (CRM-BACKEND purchaseOrderRules.lineBreaches / floorError, tested in
// src/__tests__/purchaseOrders/g1-price-floor.test.js).
const SALES_FLOOR: PoRule = { list_price_field: "end_customer_price", max_discount_pct: null, min_margin_pct: null, allow_below_list: false, price_floor: true };
const SALES_NO_FLOOR: PoRule = { ...SALES_FLOOR, price_floor: false };
// Q1 default: off for Purchase POs.
const PURCHASE: PoRule = { list_price_field: "end_customer_price", max_discount_pct: 25, min_margin_pct: 13, allow_below_list: true, price_floor: false };

const line = (selling: any, list = 160, cost = 100) => ({
  item_id: "1", name: "I1", qty: 1, cost_price: cost, list_price: list, selling_price: selling, tax_rate: 18,
});
const one = (selling: any, rule: PoRule, list = 160, type: "sales" | "purchase" = "sales") => {
  const r = computePo([line(selling, list)], type, "intra", rule);
  return { errors: r.lines[0].errors, breaches: r.lines[0].breaches, approval: r.approvalRequired, hasErrors: r.hasErrors };
};

describe("price floor (price only up)", () => {
  it("selling = list: fine, no approval", () => {
    expect(one(160, SALES_FLOOR)).toEqual({ errors: [], breaches: [], approval: false, hasErrors: false });
  });

  it("list + 0.01: raised -> needs approval, same text as the server", () => {
    expect(one(160.01, SALES_FLOOR)).toEqual({ errors: [], breaches: ["Price raised from 160 to 160.01"], approval: true, hasErrors: false });
    expect(one("175", SALES_FLOOR).breaches).toEqual(["Price raised from 160 to 175"]);
  });

  it("list - 0.01 and 0: red error, Save / Submit blocked (hasErrors)", () => {
    expect(one(159.99, SALES_FLOOR)).toMatchObject({ errors: ["Can't be lower than 160"], breaches: [], hasErrors: true });
    expect(one(0, SALES_FLOOR)).toMatchObject({ errors: ["Can't be lower than 160"], hasErrors: true });
    expect(one("100", SALES_FLOOR)).toMatchObject({ errors: ["Can't be lower than 160"], hasErrors: true });
  });

  it("no list price (0): not checked", () => {
    expect(one(1, SALES_FLOOR, 0)).toEqual({ errors: [], breaches: [], approval: false, hasErrors: false });
    expect(one(500, SALES_FLOOR, 0)).toEqual({ errors: [], breaches: [], approval: false, hasErrors: false });
  });

  it("floor switched off: old behaviour (below list needs approval, raise is free)", () => {
    expect(one(159.99, SALES_NO_FLOOR)).toEqual({ errors: [], breaches: ["Below list price"], approval: true, hasErrors: false });
    expect(one(175, SALES_NO_FLOOR)).toEqual({ errors: [], breaches: [], approval: false, hasErrors: false });
  });

  // Round 28 (R6): the Purchase PO rule always has the floor (purchaseRule).
  it("purchase PO with the R6 rule (floor always on): below list is an error", () => {
    const r = one(150, purchaseRule(PURCHASE), 160, "purchase");
    expect(r.errors).toEqual(["Can't be lower than 160"]);
    expect(r.hasErrors).toBe(true);
  });

  it("purchase PO with the floor switched on: same block and raise rule", () => {
    const on = { ...PURCHASE, price_floor: true };
    expect(one(150, on, 160, "purchase").errors).toEqual(["Can't be lower than 160"]);
    expect(one(170, on, 160, "purchase").breaches).toContain("Price raised from 160 to 170");
  });

  it("a text / empty selling price shows the number error only, not the floor error", () => {
    expect(one("", SALES_FLOOR).errors).toEqual(["Selling price: enter a number"]);
    expect(one("abc", SALES_FLOOR).errors).toEqual(["Selling price: enter a number"]);
  });

  it("floorError helper", () => {
    expect(floorError(159.99, 160, SALES_FLOOR)).toBe("Can't be lower than 160");
    expect(floorError(160, 160, SALES_FLOOR)).toBeNull();
    expect(floorError(1, 0, SALES_FLOOR)).toBeNull();
    expect(floorError(1, 160, SALES_NO_FLOOR)).toBeNull();
    expect(floorError(1, 160, undefined)).toBeNull();
  });
});

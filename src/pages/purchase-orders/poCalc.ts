// Live margin/discount maths for the PO editor. Mirrors
// CRM-BACKEND/src/services/purchaseOrderRules.js — the server recomputes on
// save, so this is only for showing the numbers while typing.
//
// Round 28 (Brady flow): only Purchase POs are made. The PO to Brady prints
// the cost (Master Distributor Price, else Distributor Price) rounded to the
// rupee; the customer's selling price may only go up from the floor (End
// User Price, or Distributor Price for a "distributor" customer); the margin
// (% and ₹) is shown on screen only.

export type PoType = "purchase" | "sales";

export type PoRule = {
  list_price_field: "master_price" | "distributor_price" | "end_customer_price";
  max_discount_pct: number | null;
  min_margin_pct: number | null;
  allow_below_list: boolean;
  // "Price only up": below the list price is refused, a raise needs approval.
  price_floor?: boolean;
};

export type PoLine = {
  item_id: string;
  item_code?: string;
  y_code?: string;
  // Q1: "mdp" | "dp" (no Master Distributor Price) | "landing" | "none"
  cost_source?: string;
  replaced_by?: string;
  name: string;
  hsn?: string;
  unit?: string;
  qty: number;
  cost_price: number;
  list_price: number;
  selling_price: number;
  tax_rate: number;
};

export type ComputedLine = PoLine & {
  errors: string[];
  rate: number;
  amount: number;
  tax_amount: number;
  discount_pct: number;
  margin_pct: number | null;
  margin_amount: number | null;
  breaches: string[];
};

export type PriceLevel = "end_user" | "distributor";

// Q1: which item price is the cost (same as the server's costOf).
export const costOf = (item: any): { cost_price: number; cost_source: string } => {
  if (Number(item?.master_price) > 0) return { cost_price: round2(item.master_price), cost_source: "mdp" };
  if (Number(item?.distributor_price) > 0) return { cost_price: round2(item.distributor_price), cost_source: "dp" };
  const landing = Number(item?.cost_price) || 0;
  return { cost_price: round2(landing), cost_source: landing > 0 ? "landing" : "none" };
};

// R6 + Q2: the Purchase PO rule — the saved rule with the floor always on and
// the floor price taken from the customer's price level.
export const purchaseRule = (saved: Partial<PoRule> | undefined, level: PriceLevel = "end_user"): PoRule => ({
  list_price_field: "end_customer_price",
  max_discount_pct: null,
  min_margin_pct: 13,
  allow_below_list: false,
  ...(saved || {}),
  price_floor: true,
  ...(level === "distributor" ? { list_price_field: "distributor_price" as const } : {}),
} as PoRule);

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export const marginPct = (selling: number, cost: number) => (selling > 0 && cost > 0 ? round2(((selling - cost) / selling) * 100) : null);
// ₹ margin of a line = (selling − cost) × qty; null when cost isn't known.
export const marginAmount = (selling: number, cost: number, qty: number) => (cost > 0 ? round2((selling - cost) * qty) : null);
const discountPct = (selling: number, list: number) => (list > 0 ? round2(((list - selling) / list) * 100) : 0);

// The same checks the server makes on typed amounts (purchase_order_controller
// lineAmount): a cleared box, text or a negative value is an error, never 0.
const amountError = (v: unknown, label: string, max = Infinity): string | null => {
  if (v === undefined || v === null) return null;
  const text = String(v).trim();
  const n = Number(text);
  if (text === "" || !Number.isFinite(n)) return `${label}: enter a number`;
  if (n < 0) return `${label} can't be negative`;
  if (n > max) return `${label} can't be more than ${max}`;
  return null;
};

// "Price only up" (rule.price_floor): the server refuses a selling price below
// the list price (purchaseOrderRules.floorError). Lines with no list price
// (0) are not checked.
export const floorError = (selling: unknown, list: number, rule?: PoRule): string | null => {
  const n = Number(String(selling ?? "").trim());
  if (!rule?.price_floor || !(list > 0) || String(selling ?? "").trim() === "" || !Number.isFinite(n)) return null;
  return n < list ? `Can't be lower than ${list}` : null;
};

// Round 29 (S4): qty is a whole number up to 1,00,000; a price is at most
// 1,00,00,000 with 2 decimals (same as the server's poValidation).
const qtyError = (v: unknown): string | null => {
  const qty = Number(v);
  if (String(v ?? "").trim() === "" || !(qty > 0)) return "Quantity must be more than 0";
  if (!Number.isInteger(qty)) return "Quantity must be a whole number";
  if (qty > 100000) return "Quantity can't be more than 1,00,000";
  return null;
};
const priceLimitError = (v: unknown, label: string): string | null => {
  const n = Number(String(v ?? "").trim());
  if (!Number.isFinite(n)) return null;
  if (n > 10000000) return `${label} can't be more than 1,00,00,000`;
  if (Math.abs(Math.round(n * 100) - n * 100) > 1e-6) return `${label}: at most 2 decimals`;
  return null;
};

const lineErrors = (raw: PoLine, rule?: PoRule): string[] => {
  const sellingError = amountError(raw.selling_price, "Selling price") || priceLimitError(raw.selling_price, "Selling price");
  return [
    qtyError(raw.qty),
    sellingError,
    sellingError ? null : floorError(raw.selling_price, Number(raw.list_price) || 0, rule),
    amountError(raw.tax_rate, "GST %", 100),
  ].filter((e): e is string => !!e);
};

const breachesFor = (l: Omit<ComputedLine, "breaches">, rule: PoRule): string[] => {
  const out: string[] = [];
  if (rule.min_margin_pct !== null && rule.min_margin_pct !== undefined) {
    if (!(l.cost_price > 0)) out.push("Cost price not set");
    else if (l.margin_pct === null || l.margin_pct < rule.min_margin_pct) out.push(`Margin below ${rule.min_margin_pct}%`);
  }
  if (rule.max_discount_pct !== null && rule.max_discount_pct !== undefined && l.list_price > 0 && l.discount_pct > rule.max_discount_pct) {
    out.push(`Discount above ${rule.max_discount_pct}%`);
  }
  if (rule.price_floor) {
    // Same text as the server's lineBreaches.
    if (l.list_price > 0 && l.selling_price > l.list_price) out.push(`Price raised from ${l.list_price} to ${l.selling_price}`);
  } else if (rule.allow_below_list === false && l.list_price > 0 && l.selling_price < l.list_price) out.push("Below list price");
  if (l.cost_source === "dp") out.push("Cost from DP (no Master Distributor Price)");
  return out;
};

export const computePo = (lines: PoLine[], type: PoType, taxMode: "intra" | "inter", rule?: PoRule) => {
  const computed: ComputedLine[] = lines.map((raw) => {
    const qty = Math.max(Number(raw.qty) || 0, 0);
    const cost = Number(raw.cost_price) || 0;
    const list = Number(raw.list_price) || 0;
    const selling = Number(raw.selling_price) || 0;
    const taxRate = Math.max(Number(raw.tax_rate) || 0, 0);
    // Q3: the PO to Brady prints whole-rupee rates.
    const rate = type === "purchase" ? Math.round(cost) : selling;
    const amount = round2(qty * rate);
    const base = {
      ...raw,
      errors: lineErrors(raw, rule),
      qty,
      cost_price: cost,
      list_price: list,
      selling_price: selling,
      tax_rate: taxRate,
      rate,
      amount,
      tax_amount: round2((amount * taxRate) / 100),
      discount_pct: discountPct(selling, list),
      margin_pct: marginPct(selling, cost),
      margin_amount: marginAmount(selling, cost, qty),
    };
    return { ...base, breaches: rule ? breachesFor(base, rule) : [] };
  });
  const subtotal = round2(computed.reduce((s, l) => s + l.amount, 0));
  const taxTotal = round2(computed.reduce((s, l) => s + l.tax_amount, 0));
  const sellValue = round2(computed.reduce((s, l) => s + l.qty * l.selling_price, 0));
  const costValue = round2(computed.reduce((s, l) => s + l.qty * l.cost_price, 0));
  const half = round2(taxTotal / 2);
  const allCosted = costValue > 0 && computed.every((l) => l.cost_price > 0);
  return {
    lines: computed,
    totals: {
      subtotal,
      cgst: taxMode === "intra" ? half : 0,
      sgst: taxMode === "intra" ? round2(taxTotal - half) : 0,
      igst: taxMode === "inter" ? taxTotal : 0,
      tax_total: taxTotal,
      grand_total: round2(subtotal + taxTotal),
      sell_value: sellValue,
      cost_value: costValue,
      margin_pct: allCosted ? marginPct(sellValue, costValue) : null,
      margin_amount: allCosted ? round2(sellValue - costValue) : null,
    },
    approvalRequired: computed.some((l) => l.breaches.length > 0),
    hasErrors: computed.some((l) => l.errors.length > 0),
  };
};

export const PO_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  sent: "Sent",
  partially_received: "Partially Received",
  received: "Received",
  cancelled: "Cancelled",
};

export const PO_STATUS_CLASS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  partially_received: "bg-indigo-50 text-indigo-700 border-indigo-200",
  received: "bg-teal-50 text-teal-700 border-teal-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

// Same moves the server allows (purchase_order_controller.js STATUS_MOVES).
export const PO_STATUS_MOVES: Record<string, string[]> = {
  draft: ["cancelled"],
  pending_approval: ["cancelled"],
  approved: ["sent", "cancelled"],
  sent: ["partially_received", "received", "cancelled"],
  partially_received: ["partially_received", "received", "cancelled"],
  received: [],
  cancelled: [],
};

export const PRICE_FIELD_LABEL: Record<string, string> = {
  master_price: "Master Distributor Price",
  cost_price: "Cost (landing) price",
  distributor_price: "Distributor Price",
  end_customer_price: "End User Price",
};

export const PRICE_LEVEL_LABEL: Record<PriceLevel, string> = { end_user: "End user", distributor: "Distributor" };

// "Cost from DP" etc. next to the cost on a line (Q1).
export const COST_SOURCE_LABEL: Record<string, string> = {
  mdp: "MDP",
  dp: "cost from DP",
  landing: "landing cost",
  none: "no cost",
};

export const formatInr = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const marginClass = (m: number | null, min?: number | null) => {
  if (m === null || m === undefined) return "text-slate-400";
  if (min !== null && min !== undefined && m < min) return "text-red-600";
  return "text-emerald-600";
};

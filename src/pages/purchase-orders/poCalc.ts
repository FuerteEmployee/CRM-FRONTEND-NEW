// Live margin/discount maths for the PO editor. Mirrors
// CRM-BACKEND/src/services/purchaseOrderRules.js — the server recomputes on
// save, so this is only for showing the numbers while typing.

export type PoType = "purchase" | "sales";

export type PoRule = {
  list_price_field: "master_price" | "distributor_price" | "end_customer_price";
  max_discount_pct: number | null;
  min_margin_pct: number | null;
  allow_below_list: boolean;
};

export type PoLine = {
  item_id: string;
  item_code?: string;
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
  rate: number;
  amount: number;
  tax_amount: number;
  discount_pct: number;
  margin_pct: number | null;
  breaches: string[];
};

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

const marginPct = (selling: number, cost: number) => (selling > 0 && cost > 0 ? round2(((selling - cost) / selling) * 100) : null);
const discountPct = (selling: number, list: number) => (list > 0 ? round2(((list - selling) / list) * 100) : 0);

const breachesFor = (l: Omit<ComputedLine, "breaches">, rule: PoRule): string[] => {
  const out: string[] = [];
  if (rule.min_margin_pct !== null && rule.min_margin_pct !== undefined) {
    if (!(l.cost_price > 0)) out.push("Cost price not set");
    else if (l.margin_pct === null || l.margin_pct < rule.min_margin_pct) out.push(`Margin below ${rule.min_margin_pct}%`);
  }
  if (rule.max_discount_pct !== null && rule.max_discount_pct !== undefined && l.list_price > 0 && l.discount_pct > rule.max_discount_pct) {
    out.push(`Discount above ${rule.max_discount_pct}%`);
  }
  if (rule.allow_below_list === false && l.list_price > 0 && l.selling_price < l.list_price) out.push("Below list price");
  return out;
};

export const computePo = (lines: PoLine[], type: PoType, taxMode: "intra" | "inter", rule?: PoRule) => {
  const computed: ComputedLine[] = lines.map((raw) => {
    const qty = Math.max(Number(raw.qty) || 0, 0);
    const cost = Number(raw.cost_price) || 0;
    const list = Number(raw.list_price) || 0;
    const selling = Number(raw.selling_price) || 0;
    const taxRate = Math.max(Number(raw.tax_rate) || 0, 0);
    const rate = type === "purchase" ? cost : selling;
    const amount = round2(qty * rate);
    const base = {
      ...raw,
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
    };
    return { ...base, breaches: rule ? breachesFor(base, rule) : [] };
  });
  const subtotal = round2(computed.reduce((s, l) => s + l.amount, 0));
  const taxTotal = round2(computed.reduce((s, l) => s + l.tax_amount, 0));
  const sellValue = round2(computed.reduce((s, l) => s + l.qty * l.selling_price, 0));
  const costValue = round2(computed.reduce((s, l) => s + l.qty * l.cost_price, 0));
  const half = round2(taxTotal / 2);
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
      margin_pct: costValue > 0 && computed.every((l) => l.cost_price > 0) ? marginPct(sellValue, costValue) : null,
    },
    approvalRequired: computed.some((l) => l.breaches.length > 0),
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
  partially_received: ["received", "cancelled"],
  received: [],
  cancelled: [],
};

export const PRICE_FIELD_LABEL: Record<string, string> = {
  master_price: "Master price",
  cost_price: "Cost (landing) price",
  distributor_price: "Distributor price",
  end_customer_price: "End-customer price",
};

export const formatInr = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const marginClass = (m: number | null, min?: number | null) => {
  if (m === null || m === undefined) return "text-slate-400";
  if (min !== null && min !== undefined && m < min) return "text-red-600";
  return "text-emerald-600";
};

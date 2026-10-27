// Proforma Invoice maths (R5) — the client's proforma sheet formulas, the
// same as CRM-BACKEND/src/services/proformaMath.js (the server's result is
// the one saved; this is for the live editor and the PDF).
//   Taxable          = ROUND(qty × rate × (1 − disc), 2)
//   IGST line total  = taxable + ROUND(taxable × gst, 2)
//   CGST+SGST total  = taxable + 2 × ROUND(taxable × gst / 2, 2)
//   Grand total      = Σ line totals; IGST = grand − taxable; CGST = SGST = half
//   Balance payable  = grand − advance

export type TaxType = "igst" | "cgst_sgst";

export type ProformaLine = {
  _id?: string;
  ref_no?: string;
  description?: string;
  hsn?: string;
  qty: number | string;
  unit?: string;
  rate: number | string;
  disc_pct: number | string;
  gst_pct: number | string;
  is_extra?: boolean;
};

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100 + Number.EPSILON * 100) / 100;

export const proformaLine = <T extends ProformaLine>(line: T, taxType: TaxType) => {
  const qty = Number(line.qty) || 0;
  const rate = Number(line.rate) || 0;
  const disc = (Number(line.disc_pct) || 0) / 100;
  const gst = (Number(line.gst_pct) || 0) / 100;
  const taxable = round2(qty * rate * (1 - disc));
  const tax = taxType === "igst" ? round2(taxable * gst) : 2 * round2((taxable * gst) / 2);
  return { ...line, taxable, tax: round2(tax), total: round2(taxable + tax) };
};

export const computeProforma = <T extends ProformaLine>(lines: T[], taxType: TaxType, advance: number | string = 0) => {
  const computed = lines.map((l) => proformaLine(l, taxType));
  const taxable = round2(computed.reduce((s, l) => s + l.taxable, 0));
  const grand = round2(computed.reduce((s, l) => s + l.total, 0));
  const taxAll = round2(grand - taxable);
  const half = taxType === "cgst_sgst" ? round2(taxAll / 2) : 0;
  const adv = round2(Number(advance) || 0);
  return {
    lines: computed,
    totals: { taxable, cgst: half, sgst: half, igst: taxType === "igst" ? taxAll : 0, grand_total: grand, advance: adv, balance: round2(grand - adv) },
  };
};

// ─── Amount in words (Indian system) ───────────────────────────────────────
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const below100 = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`);
const below1000 = (n: number) => {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} hundred` : "", r ? below100(r) : ""].filter(Boolean).join(" ");
};
export const integerWords = (n: number): string => {
  if (n === 0) return "zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1e3);
  const rest = n % 1e3;
  if (crore) parts.push(`${integerWords(crore)} crore`);
  if (lakh) parts.push(`${below100(lakh)} lakh`);
  if (thousand) parts.push(`${below100(thousand)} thousand`);
  if (rest) parts.push(below1000(rest));
  return parts.join(" ");
};

// "One lakh thirty seven thousand five hundred forty rupees and eighty paisa only."
export const amountInWords = (amount: number) => {
  const paiseAll = Math.round(Math.abs(Number(amount) || 0) * 100);
  const rupees = Math.floor(paiseAll / 100);
  const paise = paiseAll % 100;
  let text = `${integerWords(rupees)} ${rupees === 1 ? "rupee" : "rupees"}`;
  if (paise) text += ` and ${integerWords(paise)} paisa`;
  text += " only.";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// A typed percentage / amount: "" / text / negative / over max -> error text.
export const amountError = (v: unknown, label: string, max = Infinity): string | null => {
  const text = String(v ?? "").trim();
  const n = Number(text);
  if (text === "" || !Number.isFinite(n)) return `${label}: enter a number`;
  if (n < 0) return `${label} can't be negative`;
  if (n > max) return `${label} can't be more than ${max}`;
  return null;
};

export const TAX_TYPE_LABEL: Record<TaxType, string> = { igst: "IGST", cgst_sgst: "CGST + SGST/UTGST" };

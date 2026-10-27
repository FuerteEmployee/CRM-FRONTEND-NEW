// Round 29 (S4): field formats for the Purchase Orders forms. Mirrors
// CRM-BACKEND/src/services/poValidation.js — SAME rules and SAME messages, so
// the message under a field is the one the API would give (the server is the
// source of truth and checks everything again on save).
//
// Each validator returns an error message, or "" when the value is fine.

const isEmpty = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");
const text = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v).trim() : null);

export const catalogNoError = (v: unknown, { required = true, label = "Catalog no." } = {}) => {
  if (isEmpty(v)) return required ? `${label} is required` : "";
  const t = text(v);
  if (t === null) return `${label}: enter text`;
  if (t.length < 2 || t.length > 40) return `${label} must be 2 to 40 characters`;
  if (!/^[A-Za-z0-9][A-Za-z0-9\-/._]*$/.test(t)) return `${label} can only have letters, digits and - / . _ (no spaces)`;
  return "";
};

export const yCodeError = (v: unknown) => {
  if (isEmpty(v)) return "";
  const t = text(v);
  return t === null || !/^Y\d{5,9}$/i.test(t) ? "Y code must be Y followed by 5 to 9 digits (e.g. Y5075406)" : "";
};

const PHONE_MSG = "Enter a 10-digit mobile (starting 6-9, +91 / 0 allowed) or a landline with STD code";
export const phoneError = (v: unknown, { label = "Phone" } = {}) => {
  if (isEmpty(v)) return "";
  const t = text(v);
  if (t === null || !/^\+?[\d][\d\s-]*$/.test(t)) return `${label}: ${PHONE_MSG}`;
  const d = t.replace(/\D/g, "");
  if (/^(91|0)?[6-9]\d{9}$/.test(d)) return "";
  const plus91 = t.startsWith("+") && d.startsWith("91");
  if ((d.startsWith("0") || plus91) && d.length >= 8 && d.length <= 15) return "";
  return `${label}: ${PHONE_MSG}`;
};

export const gstinError = (v: unknown, { label = "GSTIN" } = {}) => {
  if (isEmpty(v)) return "";
  const t = text(v);
  const up = t === null ? "" : t.toUpperCase().replace(/\s+/g, "");
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(up)) return `${label} must be 15 characters like 24ABCDE1234F1Z5`;
  const state = Number(up.slice(0, 2));
  if (state < 1 || state > 38) return `${label}: state code ${up.slice(0, 2)} is not valid (01-38)`;
  return "";
};

export const customerPoNoError = (v: unknown, { required = false } = {}) => {
  if (isEmpty(v)) return required ? "Customer PO No. is required when the customer's PO file is attached" : "";
  const t = text(v);
  if (t === null) return "Customer PO No.: enter text";
  if (t.length > 60) return "Customer PO No. can't be longer than 60 characters";
  if (!/^[A-Za-z0-9 \-_.()/]+$/.test(t)) return "Customer PO No. can only have letters, digits, space and - _ . ( ) /";
  return "";
};

export const poPrefixError = (v: unknown, { label = "PO number prefix" } = {}) => {
  if (isEmpty(v)) return `${label} is required`;
  const t = text(v);
  return t === null || t.length > 10 || !/^[A-Za-z0-9-]+$/.test(t) ? `${label}: 1 to 10 letters, digits or - (no "/" or spaces)` : "";
};

export const emailError = (v: unknown, { label = "Email" } = {}) => {
  if (isEmpty(v)) return "";
  const t = text(v);
  return t === null || t.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t) ? `${label} is not a valid email address` : "";
};

export const hsnError = (v: unknown, { label = "HSN/SAC" } = {}) => {
  if (isEmpty(v)) return "";
  const t = text(v);
  return t === null || !/^(\d{4}|\d{6}|\d{8})$/.test(t) ? `${label} must be 4, 6 or 8 digits` : "";
};

export const GST_SLABS = [0, 5, 12, 18, 28, 40];
export const gstWarning = (rate: unknown, label = "GST %") =>
  rate === undefined || rate === null || rate === "" || GST_SLABS.includes(Number(rate)) ? "" : `${label} ${rate} is not a usual GST rate (0, 5, 12, 18, 28 or 40)`;

const toNumber = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.trim()) : NaN);

export const quantityError = (v: unknown, { label = "Quantity" } = {}) => {
  const n = toNumber(v);
  if (!Number.isFinite(n)) return `${label}: enter a number`;
  if (n <= 0) return `${label} must be more than 0`;
  if (!Number.isInteger(n)) return `${label} must be a whole number`;
  if (n > 100000) return `${label} can't be more than 1,00,000`;
  return "";
};

export const priceError = (v: unknown, { label = "Price" } = {}) => {
  const n = toNumber(v);
  if (!Number.isFinite(n)) return `${label}: enter a number`;
  if (n < 0) return `${label} can't be negative`;
  if (n > 10000000) return `${label} can't be more than 1,00,00,000`;
  if (Math.abs(Math.round(n * 100) - n * 100) > 1e-6) return `${label}: at most 2 decimals`;
  return "";
};

export const percentError = (v: unknown, { label = "Disc %" } = {}) => {
  const n = toNumber(v);
  if (!Number.isFinite(n)) return `${label}: enter a number`;
  if (n < 0 || n > 100) return `${label} must be from 0 to 100`;
  return "";
};

export const validDaysError = (v: unknown) => {
  const n = toNumber(v);
  return !Number.isInteger(n) || n < 1 || n > 365 ? "Valid for (days) must be a whole number from 1 to 365" : "";
};

// "Valid for (days)" box (S5): the typed text is kept while typing; on blur it
// becomes the number ("05" → 5); anything else stays as typed and shows the error.
export const daysOnBlur = (typed: string): number | string => {
  const t = String(typed ?? "").trim();
  return /^\d+$/.test(t) ? Number(t) : typed;
};

// Series (price-list sheet) name: 1-40 letters, digits, spaces, - or _.
export const cleanSeriesName = (v: unknown) => (text(v) ?? "").replace(/\s+/g, " ");
export const seriesNameError = (v: unknown) => {
  const c = cleanSeriesName(v);
  if (!c) return "Series is required";
  return c.length > 40 || !/^[A-Za-z0-9 _-]+$/.test(c) ? "Series name: 1 to 40 letters, digits, spaces, - or _" : "";
};
// A typed series that matches an existing one (any case) uses the existing name.
export const reuseSeries = (name: string, existing: string[]) => existing.find((s) => s.toLowerCase() === name.toLowerCase()) || name;
// A sheet name as a series (same as the server's seriesFromSheet).
export const seriesFromSheet = (name: string) =>
  String(name || "")
    .replace(/[^A-Za-z0-9 _-]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[\s-]+|[\s-]+$/g, "")
    .slice(0, 40)
    .trim() || "Series";

// Calendar day in India time — the same day the user sees in the date box.
const dayKey = (d: string | Date) => {
  const t = new Date(d);
  return isNaN(t.getTime()) ? null : new Date(t.getTime() + 330 * 60000).toISOString().slice(0, 10);
};
export const expectedDateError = (poDate: string, expected: string) =>
  expected && poDate && (dayKey(expected) || "") < (dayKey(poDate) || "") ? "Expected delivery can't be before the PO date" : "";
export const customerPoDateError = (poDate: string, customerPoDate: string) =>
  customerPoDate && poDate && (dayKey(customerPoDate) || "") > (dayKey(poDate) || "") ? "Customer PO date can't be after the PO date" : "";

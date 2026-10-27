// Round 30 (S6): "first sheet by default" + "+ Add Catalog No." helpers (pure,
// unit-tested in r30.test.ts). The server checks the same things
// (CRM-BACKEND/src/services/poReference.js).
import { seriesFromSheet } from "./poValidation";

export const MAX_PASTE = 200;
export const NO_REFERENCE = "Upload the price list first";
export const NOT_IN_REFERENCE = "Not in the uploaded price list — add it by hand";
export const ALREADY = "Already in PO Items";

// One per line / comma / semicolon / tab; duplicates (any case) once; max 200.
export const parseCatalogPaste = (text: string): { list: string[]; error: string } => {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const part of String(text ?? "").split(/[\r\n,;\t]+/)) {
    const t = part.trim().replace(/^["']+|["']+$/g, "").trim();
    if (!t) continue;
    if (t.length > 100) return { list: [], error: `"${t.slice(0, 20)}…" is too long for a catalog no. (max 100 characters)` };
    if (seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    list.push(t);
  }
  if (!list.length) return { list, error: "Type a catalog no. (or Y code / obsolete catalog no.)" };
  if (list.length > MAX_PASTE) return { list: [], error: `Paste at most ${MAX_PASTE} catalog nos. at a time (${list.length} given)` };
  return { list, error: "" };
};

// Upload wizard: only the FIRST item sheet is ticked (F2: M210); skipped
// sheets stay unticked. The rest of the file is kept as the reference list.
export const firstSheetOnly = <T extends { skip_reason?: string }>(sheets: T[]): (T & { include: boolean })[] => {
  const first = sheets.findIndex((s) => !s.skip_reason);
  return sheets.map((s, i) => ({ ...s, include: i === first }));
};

// "Price from sheet: …" when the prices came from another sheet than the series.
export const priceSheetNote = (item: { price_sheet?: string; category?: string }): string => {
  const sheet = (item?.price_sheet || "").trim();
  if (!sheet) return "";
  const series = (item?.category || "").trim().toLowerCase();
  if (sheet.toLowerCase() === series || seriesFromSheet(sheet).toLowerCase() === series) return "";
  return `Price from sheet: ${sheet}`;
};

export type FindResult = {
  query: string;
  status: "found" | "already" | "not_found" | "added";
  via?: "catalog" | "y_code" | "obsolete" | null;
  note?: string;
  message?: string;
  entry?: any;
  item?: { _id: string; item_code: string; name: string; category: string; active: boolean } | null;
};

export const RESULT_LABEL: Record<FindResult["status"], string> = {
  found: "Found in the price list",
  already: ALREADY,
  not_found: NOT_IN_REFERENCE,
  added: "Added to PO Items",
};

// A new id for one upload's reference batches.
export const newUploadId = (): string => {
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `up-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

// The reference list in batches (the last one switches the company over).
export const referenceBatches = <T,>(entries: T[], size = 2000): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < entries.length; i += size) out.push(entries.slice(i, i + size));
  return out.length ? out : [[]];
};

// The picker's hint when the search finds nothing in PO Items.
export const pickerHint = (r: FindResult | null | undefined, canManage: boolean): { text: string; action: "add" | "open" | "none" } | null => {
  if (!r) return null;
  if (r.status === "found") {
    const code = r.entry?.item_code || r.entry?.y_code || r.query;
    return canManage ? { text: `Not in PO Items yet — Add ${code} from the price list`, action: "add" } : { text: `Not in PO Items yet — ${code} is in the price list. Ask an admin to add it`, action: "none" };
  }
  if (r.status === "already" && r.item && !r.item.active) return { text: `${r.item.item_code || r.item.name} is switched off in PO Items`, action: "none" };
  return null;
};

// Round 29 (S3): turn the server's "read the customer PO" answer
// (POST /purchase-orders/customer-po/read) into editor lines.
//   - matched (green): item, qty, cost / floor from PO Items, selling price =
//     the customer's rate; below the floor → the floor, flagged
//     "customer rate below floor";
//   - qty unreadable (amber): added with an EMPTY qty so the line shows
//     "Quantity must be more than 0" until the user types it;
//   - not found (red): only listed in the review, never added.
// The same item already on the PO (or twice in the file) is merged: qty added.
import { costOf, round2, type PoLine, type PriceLevel } from "./poCalc";

export type ReadLine = {
  status: "matched" | "not_found" | "qty_unreadable";
  text: string;
  catalog?: string;
  note?: string;
  item_id?: string;
  item_code?: string;
  qty?: number | null;
  rate?: number | null;
  item?: any;
};

export type FillLine = PoLine & { ep?: number; dp?: number; note?: string };

export const BELOW_FLOOR = "customer rate below floor";

const floorOf = (item: any, level: PriceLevel) => round2(Number(level === "distributor" ? item?.distributor_price : item?.end_customer_price) || 0);

export const lineFromRead = (r: ReadLine, level: PriceLevel): FillLine | null => {
  if (r.status === "not_found" || !r.item) return null;
  const it = r.item;
  const floor = floorOf(it, level);
  const rate = r.rate === null || r.rate === undefined ? null : round2(r.rate);
  const below = rate !== null && floor > 0 && rate < floor;
  return {
    item_id: String(it._id),
    item_code: it.item_code,
    y_code: it.y_code,
    name: it.name,
    hsn: it.hsn,
    unit: it.unit,
    qty: r.status === "matched" && r.qty ? r.qty : ("" as any),
    ...costOf(it),
    list_price: floor,
    selling_price: rate === null || below ? floor : rate,
    tax_rate: Number(it.tax_rate) || 0,
    replaced_by: it.replaced_by,
    ep: Number(it.end_customer_price) || 0,
    dp: Number(it.distributor_price) || 0,
    note: [below ? `${BELOW_FLOOR} (${rate} → ${floor})` : "", r.note || ""].filter(Boolean).join("; "),
  };
};

// Adds the read lines to the editor's lines. Returns the new list and what
// happened (for the toast and the review list).
export const applyReadLines = (existing: FillLine[], read: ReadLine[], level: PriceLevel) => {
  const lines = existing.map((l) => ({ ...l }));
  let added = 0;
  let merged = 0;
  let belowFloor = 0;
  for (const r of read) {
    const l = lineFromRead(r, level);
    if (!l) continue;
    if (l.note?.includes(BELOW_FLOOR)) belowFloor++;
    const same = lines.find((x) => x.item_id === l.item_id);
    if (same) {
      const a = Number(same.qty);
      const b = Number(l.qty);
      if (Number.isFinite(a) && Number.isFinite(b) && String(same.qty).trim() !== "" && String(l.qty).trim() !== "") same.qty = a + b;
      same.note = [same.note, "merged — qty added"].filter(Boolean).join("; ");
      merged++;
      continue;
    }
    lines.push(l);
    added++;
  }
  const count = (s: ReadLine["status"]) => read.filter((r) => r.status === s).length;
  return { lines, added, merged, belowFloor, matched: count("matched"), notFound: count("not_found"), qtyUnreadable: count("qty_unreadable") };
};

// The editor's own "add item" (picker): the same item again → qty + 1 (S4: merged with a toast).
export const addOrMerge = <T extends { item_id: string; qty: any }>(lines: T[], line: T): { lines: T[]; merged: boolean } => {
  const i = lines.findIndex((l) => l.item_id === line.item_id);
  if (i < 0) return { lines: [...lines, line], merged: false };
  const cur = Number(lines[i].qty);
  const add = Number(line.qty) || 1;
  return { lines: lines.map((l, idx) => (idx === i ? { ...l, qty: (Number.isFinite(cur) ? cur : 0) + add } : l)), merged: true };
};

// What the customer PO file picker accepts for reading (S3).
export const READABLE_FILE = /\.(pdf|xlsx)$/i;
export const readFileError = (f: File | null) => {
  if (!f) return "";
  if (f.size === 0) return "The file is empty";
  if (f.size > 10 * 1024 * 1024) return "The file is larger than 10 MB";
  if (/\.(jpe?g|png)$/i.test(f.name)) return "Can't read a scanned file — add items by hand";
  if (!READABLE_FILE.test(f.name)) return "Only a PDF or Excel (.xlsx) customer PO can be read";
  return "";
};

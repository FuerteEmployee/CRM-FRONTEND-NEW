import * as XLSX from "xlsx";

// R3: reads the Brady price list (all sheets) in the browser and turns every
// sheet into rows of cells for the server's scan / preview
// (/purchase-orders/items/pricelist/*). The same trimming as the backend
// test helper (priceListFixtures.cjs rowsOf).

export const MAX_PRICE_LIST_BYTES = 15 * 1024 * 1024;

export type SheetRows = { name: string; rows: (string | number | boolean | null)[][] };

// What the file really is, from its first bytes: .xlsx/.xlsm are ZIP ("PK"),
// old .xls are OLE ("D0 CF 11 E0"). A renamed text / PDF / image is refused.
export const priceListFileError = (name: string, size: number, head?: Uint8Array): string => {
  if (!/\.(xlsx|xlsm|xls)$/i.test(name)) return "Choose an Excel file (.xlsx or .xls)";
  if (size === 0) return "The file is empty";
  if (size > MAX_PRICE_LIST_BYTES) return "The file is larger than 15 MB";
  if (head && head.length >= 4) {
    const zip = head[0] === 0x50 && head[1] === 0x4b;
    const ole = head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0;
    if (!zip && !ole) return "This is not a real Excel file (it may have been renamed)";
  }
  return "";
};

export const sheetsFromWorkbook = (wb: XLSX.WorkBook): SheetRows[] =>
  wb.SheetNames.map((name) => {
    let rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name], { header: 1, defval: null, raw: true, blankrows: true });
    rows = rows.map((row) => {
      const a = [...row].map((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v));
      while (a.length && (a[a.length - 1] === null || a[a.length - 1] === "")) a.pop();
      return a;
    });
    while (rows.length && rows[rows.length - 1].length === 0) rows.pop();
    return { name, rows };
  });

export const readPriceListBuffer = (buf: ArrayBuffer | Uint8Array): SheetRows[] =>
  sheetsFromWorkbook(XLSX.read(buf instanceof Uint8Array ? buf : new Uint8Array(buf), { type: "array" }));

export const readPriceListFile = async (file: File): Promise<SheetRows[]> => {
  const buf = new Uint8Array(await file.arrayBuffer());
  const err = priceListFileError(file.name, file.size, buf.subarray(0, 8));
  if (err) throw new Error(err);
  const sheets = readPriceListBuffer(buf);
  if (!sheets.some((s) => s.rows.length)) throw new Error("The workbook has no rows");
  return sheets;
};

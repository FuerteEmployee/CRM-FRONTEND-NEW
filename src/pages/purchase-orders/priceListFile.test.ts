import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { MAX_PRICE_LIST_BYTES, priceListFileError, readPriceListBuffer } from "./priceListFile";

// R3 — reading the price-list workbook in the browser (all sheets, own headers).
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
const OLE = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]);

describe("price-list file checks", () => {
  it("accepts a real .xlsx (zip) and an old .xls (OLE)", () => {
    expect(priceListFileError("prices.xlsx", 1000, ZIP)).toBe("");
    expect(priceListFileError("prices.xls", 1000, OLE)).toBe("");
  });
  it("refuses: other extensions, empty, over 15 MB (e.g. 20 MB), a renamed text / PDF file", () => {
    expect(priceListFileError("prices.csv", 1000, ZIP)).toBe("Choose an Excel file (.xlsx or .xls)");
    expect(priceListFileError("prices.xlsx", 0, ZIP)).toBe("The file is empty");
    expect(priceListFileError("prices.xlsx", 20 * 1024 * 1024, ZIP)).toBe("The file is larger than 15 MB");
    expect(MAX_PRICE_LIST_BYTES).toBe(15 * 1024 * 1024);
    expect(priceListFileError("renamed.xls", 1000, new TextEncoder().encode("hello,world"))).toBe("This is not a real Excel file (it may have been renamed)");
    expect(priceListFileError("doc.xlsx", 1000, new TextEncoder().encode("%PDF-1.4"))).toBe("This is not a real Excel file (it may have been renamed)");
  });
});

describe("workbook -> sheets of rows", () => {
  it("every sheet, with spacer rows kept, trailing empty cells / rows dropped", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Catalog No", "Y Code", "MDP ( INR / UOM)", null], ["FX-1", "Y9000001", 1000.123456, null], [], []]), "M410");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[""], ["Y NUMBER", "CATALOG NUMBER", "Distributor Price"], ["Y9000002", 123, 55.5]]), "M611");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const sheets = readPriceListBuffer(buf);
    expect(sheets.map((s) => s.name)).toEqual(["M410", "M611"]);
    expect(sheets[0].rows).toEqual([["Catalog No", "Y Code", "MDP ( INR / UOM)"], ["FX-1", "Y9000001", 1000.123456]]);
    expect(sheets[1].rows[0]).toEqual([]);
    expect(sheets[1].rows[2]).toEqual(["Y9000002", 123, 55.5]);
  });
});

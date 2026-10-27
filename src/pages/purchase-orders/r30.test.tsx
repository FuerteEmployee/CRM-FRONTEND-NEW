// Round 30 — frontend tests: S6 helpers (multi-paste, first sheet ticked,
// "Price from sheet", picker hint, reference batches), the Add Catalog No.
// dialog (find → add, already, not found → add by hand, no price list), the
// Delete reason with a proforma, and the /api/currencies guard (no 403 for
// staff without Settings › View).
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { firstSheetOnly, parseCatalogPaste, pickerHint, priceSheetNote, referenceBatches, NO_REFERENCE } from "./catalogAdd";
import { deleteBlock, rowActions } from "./poActions";

const svc = vi.hoisted(() => ({ findCatalogs: vi.fn(), addCatalogs: vi.fn() }));
vi.mock("@/api/services/purchaseOrder.service", () => ({ purchaseOrderService: svc }));
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
const perm = vi.hoisted(() => ({ user: null as any, canView: vi.fn() }));
vi.mock("@/context/PermissionContext", () => ({ usePermissionContext: () => perm }));
const fin = vi.hoisted(() => ({ getCurrencies: vi.fn() }));
vi.mock("@/api/services/finance.service", () => ({ financeService: fin }));

import { AddCatalogDialog } from "./AddCatalogDialog";
import { CurrencyProvider } from "@/context/CurrencyContext";

afterEach(() => cleanup());

describe("S6 helpers", () => {
  test("multi-paste: lines / commas / tabs, duplicates once, 200 max, empty", () => {
    expect(parseCatalogPaste("M7-84-499\nM21-500-423, y4900609\tm7-84-499")).toEqual({ list: ["M7-84-499", "M21-500-423", "y4900609"], error: "" });
    expect(parseCatalogPaste(" , \n").error).toBe("Type a catalog no. (or Y code / obsolete catalog no.)");
    expect(parseCatalogPaste(Array.from({ length: 201 }, (_, i) => `C${i}`).join("\n")).error).toBe("Paste at most 200 catalog nos. at a time (201 given)");
    expect(parseCatalogPaste(Array.from({ length: 200 }, (_, i) => `C${i}`).join("\n")).list).toHaveLength(200);
  });
  test("upload wizard: only the first item sheet is ticked (skipped sheets never)", () => {
    const s = firstSheetOnly([{ name: "Notes", skip_reason: "No catalog" }, { name: "M210", skip_reason: "" }, { name: "BMP41", skip_reason: "" }]);
    expect(s.map((x) => [x.name, x.include])).toEqual([["Notes", false], ["M210", true], ["BMP41", false]]);
    expect(firstSheetOnly([{ name: "Codesoft", skip_reason: "x" }]).map((x) => x.include)).toEqual([false]);
  });
  test("Price from sheet: shown only when it differs from the series", () => {
    expect(priceSheetNote({ category: "BMP71 M710", price_sheet: "New Replacement Part M611 M710" })).toBe("Price from sheet: New Replacement Part M611 M710");
    expect(priceSheetNote({ category: "BMP71 M710", price_sheet: "BMP71  M710" })).toBe(""); // same sheet, series name cleaned
    expect(priceSheetNote({ category: "PMK-BBP85_30-03-2026", price_sheet: "PMK&BBP85_30.03.2026" })).toBe("");
    expect(priceSheetNote({ category: "M210" })).toBe("");
  });
  test("picker hint: add (Manage Prices) / ask an admin / switched off / nothing", () => {
    const found = { query: "M7-84-499", status: "found" as const, entry: { item_code: "M7-84-499" } };
    expect(pickerHint(found, true)).toEqual({ text: "Not in PO Items yet — Add M7-84-499 from the price list", action: "add" });
    expect(pickerHint(found, false)).toEqual({ text: "Not in PO Items yet — M7-84-499 is in the price list. Ask an admin to add it", action: "none" });
    expect(pickerHint({ query: "x", status: "already", item: { _id: "1", item_code: "X-1", name: "X-1", category: "", active: false } }, true)?.text).toBe("X-1 is switched off in PO Items");
    expect(pickerHint({ query: "x", status: "not_found" }, true)).toBeNull();
    expect(pickerHint(null, true)).toBeNull();
  });
  test("reference batches of 2000 (6,152 → 4)", () => {
    expect(referenceBatches(Array.from({ length: 6152 }, (_, i) => i)).map((b) => b.length)).toEqual([2000, 2000, 2000, 152]);
    expect(referenceBatches([])).toEqual([[]]);
  });
});

describe("FIX (INFO): Delete reason with a proforma", () => {
  test("locked + proforma → both; draft + proforma → proforma only", () => {
    expect(deleteBlock({ status: "approved", has_proforma: true }, { canDelete: true })).toBe("Approved POs are locked · has a proforma invoice");
    expect(rowActions({ status: "sent" }, { canEdit: true, canDelete: true, hasProforma: true }).delete.reason).toBe("Approved POs are locked · has a proforma invoice");
    expect(deleteBlock({ status: "draft", has_proforma: true }, { canDelete: true })).toBe("Has a proforma invoice");
    expect(deleteBlock({ status: "approved" }, { canDelete: true })).toBe("Approved POs are locked");
  });
});

const ENTRY = { item_code: "M7-84-499", y_code: "Y5075406", category: "BMP71 M710", price_sheet: "New Replacement Part M611 M710", master_price: 3207.37, distributor_price: 3690.88, end_customer_price: 4613.6, lead_time: "8-10 weeks" };

describe("Add Catalog No. dialog", () => {
  const setup = () => {
    const props = { open: true, onOpenChange: vi.fn(), onAdded: vi.fn(), onOpenItem: vi.fn(), onAddByHand: vi.fn() };
    render(<AddCatalogDialog {...props} />);
    return props;
  };
  beforeEach(() => {
    svc.findCatalogs.mockReset();
    svc.addCatalogs.mockReset();
    toast.mockReset();
  });
  test("empty → inline message, no request", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /find/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Type a catalog no. (or Y code / obsolete catalog no.)");
    expect(svc.findCatalogs).not.toHaveBeenCalled();
  });
  test("find → found row with sheet / prices → Add to PO Items → Added; list refreshed", async () => {
    const p = setup();
    svc.findCatalogs.mockResolvedValue({ reference: { count: 6152, file_name: "F2.xlsx" }, results: [{ query: "M7-84-499", status: "found", via: "catalog", note: "", entry: ENTRY }] });
    svc.addCatalogs.mockResolvedValue({ added: 1, results: [{ query: "M7-84-499", status: "added", entry: ENTRY, item: { _id: "i1", item_code: "M7-84-499", name: "M7-84-499", category: "BMP71 M710", active: true } }] });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "M7-84-499" } });
    fireEvent.click(screen.getByRole("button", { name: /find/i }));
    const row = await screen.findByTestId("add-catalog-row-M7-84-499");
    expect(row).toHaveTextContent("Found in the price list");
    expect(row).toHaveTextContent("BMP71 M710");
    expect(row).toHaveTextContent("Price from sheet: New Replacement Part M611 M710");
    expect(row).toHaveTextContent("3,207.37");
    expect(row).toHaveTextContent("4,613.6");
    fireEvent.click(screen.getByRole("button", { name: "Add M7-84-499 to PO Items" }));
    await waitFor(() => expect(screen.getByTestId("add-catalog-row-M7-84-499")).toHaveTextContent("Added to PO Items"));
    expect(svc.addCatalogs).toHaveBeenCalledWith("M7-84-499");
    expect(p.onAdded).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Added 1 PO item" }));
  });
  test("paste several: already (Open link) + not found (Add by hand) + Add all found", async () => {
    const p = setup();
    svc.findCatalogs.mockResolvedValue({ reference: { count: 10, file_name: "" }, results: [
      { query: "A-1", status: "found", entry: { ...ENTRY, item_code: "A-1" } },
      { query: "B-1", status: "found", entry: { ...ENTRY, item_code: "B-1" } },
      { query: "C-1", status: "already", entry: ENTRY, item: { _id: "c", item_code: "C-1", name: "C-1", category: "M210", active: true } },
      { query: "NOPE", status: "not_found", entry: null },
    ] });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "A-1\nB-1, C-1\nNOPE" } });
    fireEvent.click(screen.getByRole("button", { name: /find/i }));
    await screen.findByTestId("add-catalog-row-NOPE");
    expect(screen.getByTestId("add-catalog-row-C-1")).toHaveTextContent("Already in PO Items");
    expect(screen.getByTestId("add-catalog-row-NOPE")).toHaveTextContent("Not in the uploaded price list — add it by hand");
    expect(screen.getByTestId("add-catalog-summary")).toHaveTextContent("2 found");
    expect(screen.getByRole("button", { name: "Add all found (2)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add by hand" }));
    expect(p.onAddByHand).toHaveBeenCalledWith("NOPE");
  });
  test("no price list uploaded → 'Upload the price list first'", async () => {
    setup();
    svc.findCatalogs.mockRejectedValue(Object.assign(new Error(NO_REFERENCE), { response: { data: { code: "no_reference" } } }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "M7-84-499" } });
    fireEvent.click(screen.getByRole("button", { name: /find/i }));
    expect(await screen.findByTestId("add-catalog-problem")).toHaveTextContent("Upload the price list first");
  });
});

describe("FIX (LOW): /api/currencies only with Settings › View", () => {
  const renderProvider = () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><CurrencyProvider><span>child</span></CurrencyProvider></QueryClientProvider>);
  };
  beforeEach(() => {
    fin.getCurrencies.mockReset().mockResolvedValue([]);
    localStorage.setItem("crm_token", "t");
  });
  test("staff without Settings › View (e.g. a PO maker) → no call", async () => {
    perm.user = { _id: "s1" };
    perm.canView = vi.fn((f: string) => f === "Purchase Orders");
    renderProvider();
    await new Promise((r) => setTimeout(r, 30));
    expect(fin.getCurrencies).not.toHaveBeenCalled();
    expect(perm.canView).toHaveBeenCalledWith("Settings");
  });
  test("admin / Settings viewer → loaded", async () => {
    perm.user = { _id: "a1", admin: true };
    perm.canView = vi.fn(() => true);
    renderProvider();
    await waitFor(() => expect(fin.getCurrencies).toHaveBeenCalled());
  });
  test("not signed in → no call", async () => {
    perm.user = null;
    perm.canView = vi.fn(() => true);
    renderProvider();
    await new Promise((r) => setTimeout(r, 30));
    expect(fin.getCurrencies).not.toHaveBeenCalled();
  });
});

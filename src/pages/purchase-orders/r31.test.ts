// Round 31 (2026-10-28): the new PO Settings / PO item field rules (same
// messages as CRM-BACKEND/src/services/poValidation.js) and reading a list of
// catalog nos. from an Excel / CSV sheet for "+ Add Catalog No.".
import { describe, expect, test } from "vitest";
import { bankAccountNoError, ifscError, logoUrlError, marginPctError, nameError, proformaPrefixError, stateError, unitError, waLanguageError, waTemplateNameError } from "./poValidation";
import { catalogsFromRows } from "./catalogAdd";

describe("r31 field rules", () => {
  test("name / state", () => {
    expect(nameError("3M India Ltd")).toBe("");
    expect(nameError("12345", { label: "Company name" })).toBe("Company name must have letters, not only numbers or symbols");
    expect(nameError("<b>x</b>", { label: "Supplier name" })).toBe("Supplier name can't contain < or >");
    expect(stateError("Jammu & Kashmir")).toBe("");
    expect(stateError("24", { label: "Company state" })).toBe("Company state can only have letters, spaces and & . -");
  });
  test("bank account no. / IFSC", () => {
    expect(bankAccountNoError("123456789012")).toBe("");
    expect(bankAccountNoError("1234")).toBe("Account no. must be 9 to 18 digits");
    expect(bankAccountNoError("123456789, 987654321")).toMatch(/digits only/);
    expect(bankAccountNoError("12AB5678")).toMatch(/digits only/);
    expect(ifscError("sbin0001234")).toBe("");
    expect(ifscError("SBIN1234567")).toMatch(/IFSC must be 11 characters/);
  });
  test("logo URL / proforma prefix / margin / unit / WhatsApp", () => {
    expect(logoUrlError("https://cdn.example.com/l.png")).toBe("");
    expect(logoUrlError("not a url")).toMatch(/https/);
    expect(proformaPrefixError("TT/PI/")).toBe("");
    expect(proformaPrefixError("P I")).toMatch(/no spaces/);
    expect(marginPctError("")).toBe("");
    expect(marginPctError("150")).toMatch(/0 to 100/);
    expect(unitError("Nos")).toBe("");
    expect(unitError("12345")).toMatch(/letters/);
    expect(waTemplateNameError("po_document")).toBe("");
    expect(waTemplateNameError("PO Doc!")).toMatch(/lower-case/);
    expect(waLanguageError("en_US")).toBe("");
    expect(waLanguageError("english")).toMatch(/en_US/);
  });
});

describe("r31 catalogsFromRows (Add Catalog No. from a file)", () => {
  test("uses the column titled Catalog No. (header in the first rows)", () => {
    const rows = [["Customer list"], [], ["Sr", "Catalog No.", "Qty"], [1, "M7-84-499", 2], [2, "M21-500-423", 5], [3, "", 1]];
    expect(catalogsFromRows(rows)).toEqual(["M7-84-499", "M21-500-423"]);
  });
  test("Y code / item code / part no. titles work too", () => {
    expect(catalogsFromRows([["Y Code"], ["Y4900609"]])).toEqual(["Y4900609"]);
    expect(catalogsFromRows([["Name", "Item code"], ["x", "ABC-1"]])).toEqual(["ABC-1"]);
    expect(catalogsFromRows([["Part No"], ["P-9"]])).toEqual(["P-9"]);
  });
  test("no title → the first column with values (numbers as text)", () => {
    expect(catalogsFromRows([[null, "M7-84-499"], [null, 12345]])).toEqual(["M7-84-499", "12345"]);
  });
  test("empty sheet → empty list", () => {
    expect(catalogsFromRows([])).toEqual([]);
    expect(catalogsFromRows([[], [""]])).toEqual([]);
  });
});

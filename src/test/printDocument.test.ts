// Estimate Print / PDF: the header is repeated on every page and the totals /
// item rows are never split across pages (lib/printDocument.ts). Checked in
// Chrome on real A4 PDFs during development; here the HTML/CSS contract.
import { describe, it, expect } from "vitest";
import { buildPrintBody, PRINT_LAYOUT_CSS } from "@/lib/printDocument";

const doc = () => {
  const root = document.createElement("div");
  root.innerHTML = `
    <div data-print-header="">ACME · ESTIMATE · EST-0001</div>
    <div class="meta">Date</div>
    <table data-print-items=""><thead><tr><th>Item</th></tr></thead><tbody><tr><td>Row 1</td></tr></tbody></table>
    <div data-print-keep="">Sub Total … GRAND TOTAL</div>`;
  return root;
};

describe("printDocument", () => {
  it("repeatHeader: the header goes into a <thead> (printed on every page), once, before the rest", () => {
    const host = document.createElement("div");
    host.innerHTML = buildPrintBody(doc(), true);
    const wrap = host.querySelector("table.print-wrap")!;
    expect(wrap.querySelector(":scope > thead [data-print-header]")?.textContent).toContain("ESTIMATE");
    expect(host.querySelectorAll("[data-print-header]")).toHaveLength(1);
    const body = wrap.querySelector(":scope > tbody")!;
    expect(body.querySelector("[data-print-items]")).not.toBeNull();
    expect(body.querySelector("[data-print-keep]")?.textContent).toContain("GRAND TOTAL");
  });

  it("does not touch the page it was given", () => {
    const root = doc();
    buildPrintBody(root, true);
    expect(root.querySelector("[data-print-header]")).not.toBeNull();
  });

  it("without repeatHeader (or without a header) the body is unchanged", () => {
    const root = doc();
    expect(buildPrintBody(root, false)).toBe(root.innerHTML);
    root.querySelector("[data-print-header]")!.remove();
    expect(buildPrintBody(root, true)).toBe(root.innerHTML);
  });

  it("CSS: header group repeats, totals / item rows never split, the big wrapper row may split", () => {
    const css = PRINT_LAYOUT_CSS.replace(/\s+/g, "");
    expect(css).toContain(".print-wrap>thead{display:table-header-group}");
    expect(css).toContain("[data-print-keep]{break-inside:avoid;page-break-inside:avoid}");
    expect(css).toContain("[data-print-items]tr{break-inside:avoid;page-break-inside:avoid}");
    expect(css).toContain(".print-wrap>tbody>tr{break-inside:auto;page-break-inside:auto}");
  });
});

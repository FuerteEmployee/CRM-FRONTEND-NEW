// Multi-page printing of invoices / estimates / proposals.
//
// Markers put on the document markup:
//   data-print-header  the top header (company, INVOICE / ESTIMATE / PROPOSAL, number…)
//   data-print-items   the items table (its column names repeat; rows are never cut)
//   data-print-keep    a block that must stay on one page (Sub Total … GRAND TOTAL,
//                      amount in words, notes / terms, bank details, signature)
//
// Browser printing (Print / PDF, View PDF): wrapPrintHtml puts the header in a
// <thead>, which the browser prints again at the top of EVERY page. Only pages
// that are really needed are printed — a short document stays one page.
//
// Download / e-mail PDF (lib/htmlToPdf.ts renders an image and cuts it into
// A4 pages): paginateForPdf moves anything that would be cut by a page end to
// the next page and puts the header (and the column names) on top of it.

/** White space under the repeated header on page 2+ (page 1 is unchanged). */
export const PRINT_HEADER_GAP_PX = 18;

export const PRINT_LAYOUT_CSS = `
  .print-wrap{width:100%;border-collapse:collapse;border-spacing:0;margin:0!important}
  .print-wrap>thead{display:table-header-group}
  .print-wrap>thead>tr>td,.print-wrap>tbody>tr>td{padding:0!important;border:0!important;background:transparent;vertical-align:top}
  .print-wrap>tbody>tr{break-inside:auto;page-break-inside:auto}
  .print-wrap>thead>tr.print-gap>td{height:var(--print-gap,${PRINT_HEADER_GAP_PX}px)}
  /* page 1: the body moves up into the gap again, so page 1 looks exactly as before */
  .print-body{margin-top:calc(-1 * var(--print-gap,${PRINT_HEADER_GAP_PX}px));padding-top:.1px}
  [data-print-items] thead{display:table-header-group}
  [data-print-items] tr{break-inside:avoid;page-break-inside:avoid}
  [data-print-keep]{break-inside:avoid;page-break-inside:avoid}
`;

/**
 * Header repeated on every printed page + the rest of the document.
 * "printable-table": the CRM's own @media print rules (index.css) hide the first
 * and last column of every other table — on this one-column wrapper that would
 * hide the whole document.
 */
export function wrapPrintHtml(headerHtml: string, bodyHtml: string, gapPx = PRINT_HEADER_GAP_PX): string {
  return `<table class="print-wrap printable-table" style="--print-gap:${gapPx}px"><thead><tr><td>${headerHtml}</td></tr><tr class="print-gap"><td></td></tr></thead><tbody><tr><td><div class="print-body">${bodyHtml}</div></td></tr></tbody></table>`;
}

/** Inner HTML of a rendered printable element, with the header repeated on every page when asked. */
export function buildPrintBody(root: HTMLElement, repeatHeader: boolean, gapPx = PRINT_HEADER_GAP_PX): string {
  if (!repeatHeader) return root.innerHTML;
  const clone = root.cloneNode(true) as HTMLElement;
  const header = clone.querySelector<HTMLElement>("[data-print-header]");
  if (!header) return root.innerHTML;
  header.remove();
  return wrapPrintHtml(header.outerHTML, clone.innerHTML, gapPx);
}

/**
 * For the image-based Download / e-mail PDF: page `pageHeight` px tall (CSS px of
 * the rendered document). Nothing marked as a row / keep-block is cut by a page
 * end; whatever does not fit starts the next page under a copy of the header
 * (and, for item rows, the column names). Returns the number of page breaks added.
 */
export function paginateForPdf(doc: Document, pageHeight: number, opts: { top?: number; bottom?: number } = {}): number {
  const top = opts.top ?? 40;
  const bottom = opts.bottom ?? 40;
  const win = doc.defaultView!;
  const header = doc.querySelector<HTMLElement>("[data-print-header]");
  const items = doc.querySelector<HTMLTableElement>("[data-print-items]");
  const colHead = items?.tHead?.rows[0] || null;
  const headerH = header ? header.getBoundingClientRect().height : 0;
  const colHeadH = colHead ? colHead.getBoundingClientRect().height : 0;
  const atoms = Array.from(doc.querySelectorAll<HTMLElement>("[data-print-items] > tbody > tr, [data-print-keep]"));
  const pos = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { y: r.top + win.scrollY, h: r.height };
  };
  const breakContent = (spacer: number) => {
    const box = doc.createElement("div");
    box.setAttribute("data-pdf-break", "");
    box.style.cssText = `height:${spacer}px;`;
    const wrap = doc.createElement("div");
    wrap.appendChild(box);
    if (header) {
      const h = header.cloneNode(true) as HTMLElement;
      h.removeAttribute("data-print-header");
      wrap.appendChild(h);
      const gap = doc.createElement("div");
      gap.style.height = `${PRINT_HEADER_GAP_PX}px`;
      wrap.appendChild(gap);
    }
    return wrap;
  };

  let breaks = 0;
  for (const atom of atoms) {
    const { y, h } = pos(atom);
    const page = Math.floor(y / pageHeight);
    const pageEnd = (page + 1) * pageHeight - bottom;
    if (y + h <= pageEnd) continue;
    const isRow = atom.tagName === "TR";
    // Too tall for any page even after moving: let it split rather than loop.
    if (h > pageHeight - top - bottom - headerH - (isRow ? colHeadH : 0)) continue;
    const spacer = Math.max(0, (page + 1) * pageHeight + top - y);
    const content = breakContent(spacer);
    if (isRow && atom.parentElement) {
      const section = atom.parentElement as HTMLTableSectionElement;
      const cols = Math.max(1, ...Array.from(section.rows).map((r) => r.cells.length));
      const tr = doc.createElement("tr");
      tr.setAttribute("data-pdf-break", "");
      const td = doc.createElement("td");
      td.colSpan = cols;
      td.style.cssText = "padding:0!important;border:0!important;background:#fff!important;";
      td.appendChild(content);
      tr.appendChild(td);
      atom.parentElement.insertBefore(tr, atom);
      if (colHead) atom.parentElement.insertBefore(colHead.cloneNode(true), atom);
    } else {
      atom.parentElement?.insertBefore(content, atom);
    }
    breaks++;
  }
  return breaks;
}

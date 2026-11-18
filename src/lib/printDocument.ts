// Print / PDF of the document preview (components/DocumentPreviewDialog.tsx):
// the HTML body that goes into the hidden print frame.
//
// - repeatHeader: the element marked data-print-header (company, ESTIMATE,
//   number, status) is moved into a <thead>, which the browser prints again at
//   the top of EVERY page; the items table's column headings repeat too.
// - Blocks marked data-print-keep (Sub Total … GRAND TOTAL, notes, bank
//   details, signature) are never split across pages: if one does not fit, it
//   moves to the next page whole. Item rows are never cut in half either.

/** White space under the header on every page after the first. */
export const PRINT_HEADER_GAP_PX = 18;

export const PRINT_LAYOUT_CSS = `
  .print-wrap{width:100%;border-collapse:collapse;border-spacing:0}
  .print-wrap>thead{display:table-header-group}
  .print-wrap>thead>tr>td,.print-wrap>tbody>tr>td{padding:0;vertical-align:top}
  .print-wrap>tbody>tr{break-inside:auto;page-break-inside:auto}
  [data-print-items] thead{display:table-header-group}
  [data-print-items] tr{break-inside:avoid;page-break-inside:avoid}
  [data-print-keep]{break-inside:avoid;page-break-inside:avoid}
  /* Space between the repeated header and the column names (DESCRIPTION, QTY…)
     on page 2+. On page 1 the first block moves up into that space, so page 1
     looks exactly as before (header straight onto the date bar). */
  .print-wrap>thead>tr.print-gap>td{height:${PRINT_HEADER_GAP_PX}px;padding:0}
  .print-wrap>tbody>tr>td>:first-child{margin-top:-${PRINT_HEADER_GAP_PX}px}
`;

/** Inner HTML of the printable element, with the header repeated on every page when asked. */
export function buildPrintBody(root: HTMLElement, repeatHeader: boolean): string {
  if (!repeatHeader) return root.innerHTML;
  const clone = root.cloneNode(true) as HTMLElement;
  const header = clone.querySelector<HTMLElement>("[data-print-header]");
  if (!header) return root.innerHTML;
  header.remove();
  // "printable-table": the app's own @media print rules (index.css) hide the
  // first + last column of every other table (list checkboxes / actions) —
  // on this one-column wrapper that hid the WHOLE document.
  return `<table class="print-wrap printable-table"><thead><tr><td>${header.outerHTML}</td></tr><tr class="print-gap"><td></td></tr></thead><tbody><tr><td>${clone.innerHTML}</td></tr></tbody></table>`;
}

// Print / PDF of the document preview (components/DocumentPreviewDialog.tsx):
// the HTML body that goes into the hidden print frame.
//
// - repeatHeader: the element marked data-print-header (company, ESTIMATE,
//   number, status) is moved into a <thead>, which the browser prints again at
//   the top of EVERY page; the items table's column headings repeat too.
// - Blocks marked data-print-keep (Sub Total … GRAND TOTAL, notes, bank
//   details, signature) are never split across pages: if one does not fit, it
//   moves to the next page whole. Item rows are never cut in half either.

export const PRINT_LAYOUT_CSS = `
  .print-wrap{width:100%;border-collapse:collapse;border-spacing:0}
  .print-wrap>thead{display:table-header-group}
  .print-wrap>thead>tr>td,.print-wrap>tbody>tr>td{padding:0;vertical-align:top}
  .print-wrap>tbody>tr{break-inside:auto;page-break-inside:auto}
  [data-print-items] thead{display:table-header-group}
  [data-print-items] tr{break-inside:avoid;page-break-inside:avoid}
  [data-print-keep]{break-inside:avoid;page-break-inside:avoid}
`;

/** Inner HTML of the printable element, with the header repeated on every page when asked. */
export function buildPrintBody(root: HTMLElement, repeatHeader: boolean): string {
  if (!repeatHeader) return root.innerHTML;
  const clone = root.cloneNode(true) as HTMLElement;
  const header = clone.querySelector<HTMLElement>("[data-print-header]");
  if (!header) return root.innerHTML;
  header.remove();
  return `<table class="print-wrap"><thead><tr><td>${header.outerHTML}</td></tr></thead><tbody><tr><td>${clone.innerHTML}</td></tr></tbody></table>`;
}

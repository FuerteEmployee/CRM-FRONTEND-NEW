import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtDate, loadLogo, num2, sectionBar, type CompanyDetails } from "./poPdf";
import { TAX_TYPE_LABEL, type TaxType } from "./proformaCalc";

// R5: the Proforma Invoice PDF — one fixed layout, the client's proforma
// sheet (F3): company name / second line + PROFORMA INVOICE, "For quotation /
// payment reference", seller Address / GSTIN / Email / Phone with Invoice
// no. / Date / Valid until / Customer PO, BILL TO, TAX TYPE, the item table
// (REF No. | DESCRIPTION | HSN/SAC | Qty | Unit | Rate | Disc % | Taxable |
// GST % | Total), BANK DETAILS next to the totals (Taxable subtotal, CGST,
// SGST / UTGST, IGST, GRAND TOTAL, Advance received, BALANCE PAYABLE),
// COMMERCIAL TERMS, AMOUNT IN WORDS and "PROFORMA ONLY. NOT A TAX INVOICE.".
// Every value printed comes from the saved proforma (its seller block is the
// company's own details from PO Settings, Q4). The margin is never printed.

const DARK: [number, number, number] = [30, 41, 59];
const BAR: [number, number, number] = [226, 232, 240];

const kv = (doc: jsPDF, startY: number, rows: [string, string][], left: number, width: number, labelW = 30) => {
  autoTable(doc, {
    startY,
    margin: { left, right: doc.internal.pageSize.getWidth() - left - width },
    tableWidth: width,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 1.5, valign: "top" },
    columnStyles: { 0: { fontStyle: "bold", fillColor: BAR, cellWidth: labelW } },
    body: rows,
  });
  return (doc as any).lastAutoTable.finalY as number;
};

export const buildProformaPdf = async (pf: any, opts: { logoUrl?: string } = {}) => {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14;
  const seller: CompanyDetails = pf.seller || {};
  let y = M;

  // Header: company name + second line (left), PROFORMA INVOICE (right).
  const logo = await loadLogo(seller.logo_url || opts.logoUrl);
  let x = M;
  if (logo) {
    const h = 16;
    const w = Math.min((logo.w / logo.h) * h, 40);
    try {
      doc.addImage(logo.dataUrl, "PNG", M, y, w, h);
      x = M + w + 4;
    } catch {
      /* print without it */
    }
  }
  doc.setFont("helvetica", "bold").setFontSize(15).text(doc.splitTextToSize(seller.name || "", pageW * 0.6 - x), x, y + 6);
  if (seller.line2) doc.setFont("helvetica", "normal").setFontSize(10).text(seller.line2, x, y + 12);
  doc.setFillColor(...DARK).rect(pageW - M - 52, y, 52, 16, "F");
  doc.setTextColor(255).setFont("helvetica", "bold").setFontSize(12).text(["PROFORMA", "INVOICE"], pageW - M - 26, y + 6.5, { align: "center" });
  doc.setTextColor(0);
  y += 20;
  doc.setFont("helvetica", "italic").setFontSize(8.5).setTextColor(90).text("For quotation / payment reference", pageW / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 3;

  // Seller details (left) + invoice details (right).
  const half = (pageW - 2 * M - 4) / 2;
  const leftEnd = kv(doc, y, [
    ["Address", seller.address || ""],
    ["GSTIN", seller.gstin || ""],
    ["Email / Phone", [seller.email, seller.phone].filter(Boolean).join(" / ")],
  ], M, half);
  const rightEnd = kv(doc, y, [
    ["Invoice no.", pf.number || ""],
    ["Date", fmtDate(pf.date)],
    ["Valid until", fmtDate(pf.valid_until)],
    ["Customer PO", [pf.customer_po_number, pf.customer_po_date ? fmtDate(pf.customer_po_date) : ""].filter(Boolean).join(" / ")],
  ], M + half + 4, half, 26);
  y = Math.max(leftEnd, rightEnd) + 4;

  // BILL TO + TAX TYPE
  y = sectionBar(doc, y, "BILL TO");
  const b = pf.bill_to || {};
  y = kv(doc, y, [
    ["Name", b.name || ""],
    ["Address", b.address || ""],
    ["GSTIN", b.gstin || ""],
    ["Email / Phone", [b.email, b.phone].filter(Boolean).join(" / ")],
  ], M, pageW - 2 * M) + 2;
  y = kv(doc, y, [["TAX TYPE", TAX_TYPE_LABEL[(pf.tax_type as TaxType) || "igst"]]], M, 90) + 3;

  // Items
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: "grid",
    head: [["REF No.", "DESCRIPTION", "HSN/SAC", "Qty", "Unit", "Rate", "Disc %", "Taxable", "GST %", "Total"]],
    body: (pf.lines || []).map((l: any) => [
      l.ref_no || "",
      l.description || "",
      l.hsn || "",
      String(l.qty ?? ""),
      l.unit || "",
      num2(l.rate),
      `${Number(l.disc_pct) || 0}%`,
      num2(l.taxable),
      `${Number(l.gst_pct) || 0}%`,
      num2(l.total),
    ]),
    styles: { fontSize: 8, cellPadding: 1.5, valign: "middle" },
    headStyles: { fillColor: DARK, textColor: 255, fontStyle: "bold", halign: "center" },
    columnStyles: { 3: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right" }, 9: { halign: "right" } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;
  if (y + 70 > pageH - 10) {
    doc.addPage();
    y = M;
  }

  // BANK DETAILS (left) + totals (right)
  const t = pf.totals || {};
  const top = y;
  const bankEnd = (() => {
    const yy = sectionBar(doc, top, "BANK DETAILS");
    return kv(doc, yy - 2, [
      ["Account name", seller.bank_account_name || ""],
      ["Bank / Branch", seller.bank_name_branch || ""],
      ["Account no.", seller.bank_account_no || ""],
      ["IFSC", seller.bank_ifsc || ""],
    ], M, half);
  })();
  const totEnd = kv(doc, top, [
    ["Taxable subtotal", num2(t.taxable)],
    ["CGST", num2(t.cgst)],
    ["SGST / UTGST", num2(t.sgst)],
    ["IGST", num2(t.igst)],
    ["GRAND TOTAL", num2(t.grand_total)],
    ["Advance received", num2(t.advance)],
    ["BALANCE PAYABLE", num2(t.balance)],
  ], M + half + 4, half, 40);
  y = Math.max(bankEnd, totEnd) + 4;

  // COMMERCIAL TERMS
  y = sectionBar(doc, y, "COMMERCIAL TERMS");
  y = kv(doc, y - 2, [
    ["Payment terms", seller.payment_terms || ""],
    ["Delivery time", seller.delivery_terms || ""],
  ], M, pageW - 2 * M) + 4;

  // AMOUNT IN WORDS (always from the real grand total, made on the server)
  y = sectionBar(doc, y, "AMOUNT IN WORDS");
  const words = doc.splitTextToSize(pf.amount_in_words || "", pageW - 2 * M - 4);
  doc.setFont("helvetica", "normal").setFontSize(9).text(words, M + 2, y + 2);
  y += words.length * 4 + 6;
  if (pf.notes) {
    const n = doc.splitTextToSize(String(pf.notes), pageW - 2 * M - 4);
    doc.setFontSize(8.5).text(n, M + 2, y);
    y += n.length * 3.8 + 4;
  }

  doc.setFont("helvetica", "bold").setFontSize(9).text("PROFORMA ONLY. NOT A TAX INVOICE.", pageW / 2, Math.max(y + 4, pageH - 12), { align: "center" });
  return doc;
};

export const proformaFilename = (pf: any) => `Proforma-${String(pf.number || "").replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;

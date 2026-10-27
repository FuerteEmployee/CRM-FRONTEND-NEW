import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

// R2 (round 28): the PO PDF has ONE fixed layout — the client's PO format
// (F1): title PURCHASE ORDER, the company's own block (buyer) with PO number /
// PO date, the SUPPLIER block, ORDER ITEMS (Sr. | Item of Requisition |
// Description / Specification | HSN / SAC | Qty | Unit | Unit rate (INR) |
// Taxable value (INR) | GST %), Taxable subtotal / GST amount / GRAND TOTAL
// (INR), then the terms and signature area. Only the layout comes from the
// client's sample — every name, address and number printed comes from the PO
// and from PO Settings → "Company details for PO and proforma" (Q4).
// Rates are the cost (Master Distributor Price) in whole rupees (Q3); the
// customer's selling price and the margin are NEVER printed (R6).

export type CompanyDetails = {
  name?: string;
  line2?: string;
  address?: string;
  gstin?: string;
  state?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  bank_account_name?: string;
  bank_name_branch?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  po_terms?: string;
  payment_terms?: string;
  delivery_terms?: string;
};

// Placeholders usable in the WhatsApp template parameters (kept in step with
// the backend's fillPlaceholders).
export const PO_PLACEHOLDERS = [
  "{{po_number}}",
  "{{po_date}}",
  "{{expected_date}}",
  "{{party_name}}",
  "{{customer.name}}",
  "{{supplier.name}}",
  "{{customer_po_number}}",
  "{{grand_total}}",
];

export const fmtDate = (d?: string | Date) => (d ? new Date(d).toLocaleDateString("en-IN") : "");
// jsPDF's built-in fonts have no ₹ glyph (see QuotationModule.tsx), so amounts print as plain numbers.
export const num2 = (n: number) => (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => `${Number(n) || 0}%`;

export const loadLogo = (url?: string) =>
  new Promise<{ dataUrl: string; w: number; h: number } | null>((resolve) => {
    if (!url || typeof Image === "undefined") return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 200;
        canvas.height = img.naturalHeight || 100;
        canvas.getContext("2d")?.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = resolveImageUrl(url);
  });

const DARK: [number, number, number] = [30, 41, 59];
const BAR: [number, number, number] = [226, 232, 240];

// A full-width grey bar with a bold label (F1 "SUPPLIER", "ORDER ITEMS").
export const sectionBar = (doc: jsPDF, y: number, left: string, right = "") => {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BAR).rect(14, y, pageW - 28, 6.5, "F");
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...DARK).text(left, 16, y + 4.5);
  if (right) doc.setFont("helvetica", "normal").text(right, pageW - 16, y + 4.5, { align: "right" });
  doc.setTextColor(0);
  return y + 8.5;
};

export const buildPoPdf = async (po: any, company: CompanyDetails = {}, opts: { logoUrl?: string } = {}) => {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14;
  let y = M;

  // Buyer block (the company's own details) — left; title + PO number / date — right.
  const logo = await loadLogo(company.logo_url || opts.logoUrl);
  let textX = M;
  if (logo) {
    const h = 16;
    const w = Math.min((logo.w / logo.h) * h, 40);
    try {
      doc.addImage(logo.dataUrl, "PNG", M, y, w, h);
      textX = M + w + 4;
    } catch {
      /* unreadable logo — print without it */
    }
  }
  const leftW = pageW * 0.58 - textX;
  doc.setFont("helvetica", "bold").setFontSize(13).text(doc.splitTextToSize(company.name || "", leftW), textX, y + 5);
  let by = y + 10;
  doc.setFont("helvetica", "normal").setFontSize(8.5);
  [company.line2, company.address, company.gstin ? `GSTIN: ${company.gstin}` : "", [company.phone, company.email].filter(Boolean).join("  |  ")]
    .filter(Boolean)
    .forEach((l) => {
      const wrapped = doc.splitTextToSize(String(l), leftW);
      doc.text(wrapped, textX, by);
      by += wrapped.length * 3.8;
    });

  const rx = pageW * 0.6;
  doc.setFont("helvetica", "bold").setFontSize(16).text("PURCHASE ORDER", pageW - M, y + 6, { align: "right" });
  autoTable(doc, {
    startY: y + 10,
    margin: { left: rx, right: M },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 1.6 },
    columnStyles: { 0: { fontStyle: "bold", fillColor: BAR, cellWidth: 26 } },
    body: [
      ["PO number", po.po_number || ""],
      ["PO date", fmtDate(po.po_date)],
    ],
  });
  y = Math.max(by, (doc as any).lastAutoTable.finalY) + 6;

  // SUPPLIER
  y = sectionBar(doc, y, "SUPPLIER");
  const s = po.supplier || {};
  doc.setFont("helvetica", "bold").setFontSize(10).text(s.name || "", M + 2, y + 3);
  y += 7;
  doc.setFont("helvetica", "normal").setFontSize(8.5);
  [s.address, s.gstin ? `GSTIN: ${s.gstin}` : "", [s.phone, s.email].filter(Boolean).join("  |  ")]
    .filter(Boolean)
    .forEach((l: string) => {
      const wrapped = doc.splitTextToSize(l, pageW - 2 * M - 4);
      doc.text(wrapped, M + 2, y);
      y += wrapped.length * 3.8;
    });
  y += 3;

  // ORDER ITEMS
  y = sectionBar(doc, y, "ORDER ITEMS", "Currency: INR");
  const items = po.items || [];
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: "grid",
    head: [["Sr.", "Item of Requisition", "Description / Specification", "HSN / SAC", "Qty", "Unit", "Unit rate\n(INR)", "Taxable value\n(INR)", "GST %"]],
    body: items.map((l: any, i: number) => [
      String(i + 1),
      l.item_code || l.name || "",
      l.y_code || l.description || l.name || "",
      l.hsn || "",
      String(l.qty ?? ""),
      l.unit || "",
      num2(l.rate),
      num2(l.amount),
      pct(l.tax_rate),
    ]),
    styles: { fontSize: 8, cellPadding: 1.6, valign: "middle" },
    headStyles: { fillColor: DARK, textColor: 255, fontStyle: "bold", halign: "center" },
    columnStyles: { 0: { halign: "center", cellWidth: 9 }, 4: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right" } },
  });
  y = (doc as any).lastAutoTable.finalY + 2;

  // Totals (F1: Taxable subtotal, GST amount, GRAND TOTAL (INR))
  const t = po.totals || {};
  if (y + 24 > pageH - 20) {
    doc.addPage();
    y = M;
  }
  autoTable(doc, {
    startY: y,
    margin: { left: pageW - M - 85, right: M },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 1.6 },
    columnStyles: { 0: { fontStyle: "bold", fillColor: BAR }, 1: { halign: "right" } },
    body: [
      ["Taxable subtotal", num2(t.subtotal)],
      ["GST amount", num2(t.tax_total ?? (t.cgst || 0) + (t.sgst || 0) + (t.igst || 0))],
      [{ content: "GRAND TOTAL (INR)", styles: { fontStyle: "bold" } }, { content: num2(t.grand_total), styles: { fontStyle: "bold" } }],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Terms + signature area (F1 rows 19–29).
  const terms = [company.po_terms, po.notes].filter((x) => x && String(x).trim()).join("\n");
  const wrapped = doc.splitTextToSize(terms || " ", pageW - 2 * M - 4);
  if (y + 12 + wrapped.length * 3.8 + 34 > pageH - 10) {
    doc.addPage();
    y = M;
  }
  y = sectionBar(doc, y, "TERMS & CONDITIONS");
  doc.setFont("helvetica", "normal").setFontSize(8.5).text(wrapped, M + 2, y + 2);
  y += Math.max(wrapped.length * 3.8, 8) + 6;
  const boxW = (pageW - 2 * M - 6) / 2;
  doc.setDrawColor(180).rect(M, y, boxW, 26).rect(M + boxW + 6, y, boxW, 26);
  doc.setFont("helvetica", "bold").setFontSize(8.5).text("Prepared by", M + 2, y + 5);
  doc.text(`For ${company.name || ""}`, M + boxW + 8, y + 5);
  doc.setFont("helvetica", "normal").text("Authorised Signatory", M + 2 * boxW + 4, y + 23, { align: "right" });

  return doc;
};

// "PPO/01/26-27" -> "PPO-01-26-27.pdf" (a "/" can't be in a file name).
export const poFilename = (po: any) => `${String(po.po_number || "PO").replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

// Builds a PO PDF from the PO Format saved in PO Settings (the version the PO
// was created with, so an old PO reprints exactly as issued). Nothing about
// the layout's wording lives in code: titles, header, columns and footer all
// come from `format`.

export type PoFormat = {
  title_purchase: string;
  title_sales: string;
  header: { company_name: string; address: string; gstin: string; phone: string; email: string; show_logo: boolean };
  branding_line: string;
  show_supplier_block: boolean;
  columns: { key: string; label: string; visible: boolean }[];
  footer: { terms: string; payment_terms: string; delivery_terms: string; bank_details: string; signature_label: string };
};

// Placeholders usable in any text of the format (and in the WhatsApp
// template parameters — kept in step with the backend's fillPlaceholders).
export const PO_PLACEHOLDERS = [
  "{{po_number}}",
  "{{po_date}}",
  "{{expected_date}}",
  "{{party_name}}",
  "{{customer.name}}",
  "{{supplier.name}}",
  "{{grand_total}}",
  "{{company_name}}",
];

const fmtDate = (d?: string | Date) => (d ? new Date(d).toLocaleDateString("en-IN") : "");
// jsPDF's built-in fonts have no ₹ glyph (see QuotationModule.tsx), so the PDF uses "Rs.".
const money = (n: number) => `Rs. ${(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fillPlaceholders = (text: string, po: any, companyName = "") => {
  const party = po.type === "purchase" ? po.supplier : po.customer_snapshot;
  const values: Record<string, string> = {
    po_number: po.po_number || "",
    po_date: fmtDate(po.po_date),
    expected_date: fmtDate(po.expected_date),
    party_name: party?.name || "",
    "customer.name": po.customer_snapshot?.name || "",
    "supplier.name": po.supplier?.name || "",
    grand_total: (po.totals?.grand_total || 0).toFixed(2),
    company_name: companyName,
  };
  return String(text || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => (key in values ? values[key] : m));
};

const loadLogo = (url?: string) =>
  new Promise<{ dataUrl: string; w: number; h: number } | null>((resolve) => {
    if (!url) return resolve(null);
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

const cellValue = (key: string, line: any, i: number) => {
  switch (key) {
    case "sr": return String(i + 1);
    case "item_code": return line.item_code || "";
    case "name": return line.description ? `${line.name}\n${line.description}` : line.name;
    case "hsn": return line.hsn || "";
    case "qty": return String(line.qty);
    case "unit": return line.unit || "";
    case "rate": return money(line.rate);
    case "discount": return `${line.discount_pct ?? 0}%`;
    case "tax": return `${line.tax_rate ?? 0}%`;
    case "amount": return money(line.amount);
    default: return "";
  }
};

const RIGHT_ALIGNED = new Set(["qty", "rate", "discount", "tax", "amount"]);

export const buildPoPdf = async (po: any, format: PoFormat, opts: { logoUrl?: string; companyName?: string } = {}) => {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14;
  const companyName = format.header?.company_name || opts.companyName || "";
  const fill = (t: string) => fillPlaceholders(t, po, companyName);
  let y = M;

  // Header: logo, company block, branding line.
  const logo = format.header?.show_logo !== false ? await loadLogo(opts.logoUrl) : null;
  let textX = M;
  if (logo) {
    const h = 18;
    const w = Math.min((logo.w / logo.h) * h, 45);
    try {
      doc.addImage(logo.dataUrl, "PNG", M, y, w, h);
      textX = M + w + 6;
    } catch {
      /* unreadable logo — print without it */
    }
  }
  doc.setFont("helvetica", "bold").setFontSize(14).text(companyName, textX, y + 5);
  doc.setFont("helvetica", "normal").setFontSize(8.5);
  const headerLines = [
    format.header?.address,
    format.header?.gstin ? `GSTIN: ${format.header.gstin}` : "",
    [format.header?.phone, format.header?.email].filter(Boolean).join("  |  "),
  ].filter(Boolean).map(fill);
  let hy = y + 10;
  headerLines.forEach((l) => {
    const wrapped = doc.splitTextToSize(l, pageW - textX - M);
    doc.text(wrapped, textX, hy);
    hy += wrapped.length * 3.8;
  });
  y = Math.max(y + 20, hy) + 1;
  if (format.branding_line) {
    doc.setFont("helvetica", "italic").setFontSize(9).setTextColor(30, 64, 175).text(fill(format.branding_line), M, y);
    doc.setTextColor(0, 0, 0);
    y += 4;
  }
  doc.setDrawColor(200).line(M, y, pageW - M, y);
  y += 8;

  // Title
  const title = fill(po.type === "sales" ? format.title_sales : format.title_purchase);
  doc.setFont("helvetica", "bold").setFontSize(15).text(title.toUpperCase(), pageW / 2, y, { align: "center" });
  y += 8;

  // Party block (left) and PO details (right)
  const party = po.type === "purchase" ? po.supplier : po.customer_snapshot;
  const showParty = po.type === "sales" || format.show_supplier_block !== false;
  const boxTop = y;
  if (showParty && party) {
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(110).text(po.type === "purchase" ? "SUPPLIER" : "CUSTOMER", M, y);
    doc.setTextColor(0);
    doc.setFontSize(11).text(party.name || "", M, y + 5);
    doc.setFont("helvetica", "normal").setFontSize(8.5);
    let py = y + 10;
    [party.address, party.gstin ? `GSTIN: ${party.gstin}` : "", [party.phone, party.email].filter(Boolean).join("  |  ")]
      .filter(Boolean)
      .forEach((l: string) => {
        const wrapped = doc.splitTextToSize(l, pageW / 2 - M - 4);
        doc.text(wrapped, M, py);
        py += wrapped.length * 3.8;
      });
    y = py;
  }
  const details: [string, string][] = [
    ["PO No.", po.po_number],
    ["Date", fmtDate(po.po_date)],
  ];
  if (po.expected_date) details.push(["Expected", fmtDate(po.expected_date)]);
  if (po.type === "purchase" && po.customer_snapshot?.name) details.push(["Customer", po.customer_snapshot.name]);
  let dy = boxTop;
  details.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold").setFontSize(9).text(`${k}:`, pageW - M - 62, dy + 5);
    doc.setFont("helvetica", "normal").text(doc.splitTextToSize(v || "", 40), pageW - M - 40, dy + 5);
    dy += 5.5;
  });
  y = Math.max(y, dy + 2) + 4;

  // Items
  const cols = (format.columns || []).filter((c) => c.visible);
  autoTable(doc, {
    startY: y,
    head: [cols.map((c) => c.label)],
    body: (po.items || []).map((line: any, i: number) => cols.map((c) => cellValue(c.key, line, i))),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 1.8, valign: "middle" },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
    columnStyles: Object.fromEntries(
      cols.map((c, i) => [i, { halign: RIGHT_ALIGNED.has(c.key) ? "right" : c.key === "sr" ? "center" : "left" }]),
    ),
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // Totals
  const t = po.totals || {};
  const totalRows: [string, string][] = [["Subtotal", money(t.subtotal)]];
  if (po.tax_mode === "inter") totalRows.push(["IGST", money(t.igst)]);
  else totalRows.push(["CGST", money(t.cgst)], ["SGST", money(t.sgst)]);
  totalRows.push(["Grand Total", money(t.grand_total)]);
  if (y + totalRows.length * 6 > pageH - 20) {
    doc.addPage();
    y = M;
  }
  totalRows.forEach(([k, v], i) => {
    const last = i === totalRows.length - 1;
    doc.setFont("helvetica", last ? "bold" : "normal").setFontSize(last ? 10.5 : 9);
    doc.text(k, pageW - M - 60, y + 4);
    doc.text(v, pageW - M, y + 4, { align: "right" });
    y += last ? 7 : 5.5;
  });
  y += 4;

  // Footer sections
  const sections: [string, string][] = [
    ["Notes", po.notes],
    ["Terms & Conditions", format.footer?.terms],
    ["Payment Terms", format.footer?.payment_terms],
    ["Delivery Terms", format.footer?.delivery_terms],
    ["Bank Details", format.footer?.bank_details],
  ];
  sections
    .filter(([, body]) => body && String(body).trim())
    .forEach(([heading, body]) => {
      const wrapped = doc.splitTextToSize(fill(String(body)), pageW - M * 2);
      if (y + 6 + wrapped.length * 3.8 > pageH - 30) {
        doc.addPage();
        y = M;
      }
      doc.setFont("helvetica", "bold").setFontSize(9).text(heading, M, y);
      doc.setFont("helvetica", "normal").setFontSize(8.5).text(wrapped, M, y + 4.5);
      y += 6 + wrapped.length * 3.8;
    });

  // Signature
  if (y > pageH - 30) {
    doc.addPage();
    y = M;
  }
  const sigY = Math.max(y + 10, pageH - 30);
  doc.setFont("helvetica", "bold").setFontSize(9).text(`For ${companyName}`, pageW - M, sigY, { align: "right" });
  doc.setFont("helvetica", "normal").text(fill(format.footer?.signature_label || "Authorised Signatory"), pageW - M, sigY + 14, { align: "right" });

  return doc;
};

export const poFilename = (po: any) => `${po.po_number || "PO"}.pdf`;

// One export format for every report (Reports > Sales, Expenses, Leads, …).
// PDF: A4 landscape, title band, period line, KPI boxes, then each section as a
// table. jspdf-autotable breaks tables across pages between rows and repeats
// the header row, so nothing is cut. Every page gets "Page X of Y".

export type ReportCell = string | number | null | undefined;
export interface ReportSection {
  title: string;
  headers: string[];
  rows: ReportCell[][];
  /** Optional bold last row (totals). */
  footer?: ReportCell[];
}
export interface ReportExportInput {
  title: string;
  /** e.g. "Period: This Month · Currency: INR" */
  subtitle?: string;
  companyName?: string;
  kpis?: { label: string; value: string }[];
  sections: ReportSection[];
  /** File name without date / extension. */
  fileName: string;
}
export type ExportKind = "pdf" | "print" | "xlsx" | "csv";

// The built-in PDF fonts have no ₹ sign (it prints as a wrong glyph).
const pdfSafe = (v: ReportCell) => String(v ?? "").replace(/₹/g, "Rs. ");
const stamp = () => new Date().toISOString().split("T")[0];
const sheetName = (s: string, used: Set<string>) => {
  let n = s.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Sheet";
  let i = 2;
  while (used.has(n)) n = `${n.slice(0, 28)} ${i++}`;
  used.add(n);
  return n;
};

async function buildPdf(input: ReportExportInput) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;

  // Title band
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageW, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(pdfSafe(input.title), margin, 28);
  doc.setFontSize(9);
  if (input.companyName) doc.text(pdfSafe(input.companyName), margin, 46);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, pageW - margin, 28, { align: "right" });
  if (input.subtitle) doc.text(pdfSafe(input.subtitle), pageW - margin, 46, { align: "right" });

  let y = 78;
  // KPI boxes, wrapped onto more lines when there are many.
  const kpis = input.kpis || [];
  if (kpis.length) {
    const perRow = Math.min(kpis.length, 6);
    const gap = 8;
    const boxW = (pageW - margin * 2 - gap * (perRow - 1)) / perRow;
    kpis.forEach((k, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = margin + col * (boxW + gap);
      const by = y + row * 52;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, by, boxW, 44, 4, 4, "FD");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(pdfSafe(k.label).toUpperCase(), x + 8, by + 14, { maxWidth: boxW - 16 });
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(pdfSafe(k.value), x + 8, by + 34, { maxWidth: boxW - 16 });
    });
    y += Math.ceil(kpis.length / perRow) * 52 + 12;
  }

  input.sections.forEach((s) => {
    // Keep a section title together with at least a few rows of its table.
    if (y > pageH - 110) { doc.addPage(); y = margin + 8; }
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(pdfSafe(s.title), margin, y);
    const body = s.rows.length
      ? s.rows.map((r) => r.map(pdfSafe))
      : [[{ content: "No data for the selected filters", colSpan: s.headers.length, styles: { halign: "center", textColor: [148, 163, 184] } } as any]];
    autoTable(doc, {
      startY: y + 8,
      head: [s.headers.map(pdfSafe)],
      body,
      foot: s.footer ? [s.footer.map(pdfSafe)] : undefined,
      showFoot: "lastPage",
      showHead: "everyPage",
      rowPageBreak: "avoid",
      theme: "grid",
      styles: { fontSize: s.headers.length > 10 ? 6.5 : 8, cellPadding: 3.5, overflow: "linebreak", lineColor: [226, 232, 240], lineWidth: 0.5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin, top: margin, bottom: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 26;
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(pdfSafe(input.companyName ? `${input.companyName} — ${input.title}` : input.title), margin, pageH - 18);
    doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 18, { align: "right" });
  }
  return doc;
}

export async function exportReport(kind: ExportKind, input: ReportExportInput) {
  const name = `${input.fileName}_${stamp()}`;
  if (kind === "pdf" || kind === "print") {
    const doc = await buildPdf(input);
    if (kind === "pdf") {
      doc.save(`${name}.pdf`);
    } else {
      doc.autoPrint();
      const url = doc.output("bloburl");
      const w = window.open(url, "_blank");
      // Pop-up blocked: download instead so the user still gets the file.
      if (!w) doc.save(`${name}.pdf`);
    }
    return;
  }
  if (kind === "xlsx") {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const used = new Set<string>();
    if (input.kpis?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Summary", ""], ...input.kpis.map((k) => [k.label, k.value])]), sheetName("Summary", used));
    }
    input.sections.forEach((s) => {
      const aoa = [s.headers, ...s.rows.map((r) => r.map((v) => v ?? "")), ...(s.footer ? [s.footer.map((v) => v ?? "")] : [])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), sheetName(s.title, used));
    });
    XLSX.writeFile(wb, `${name}.xlsx`);
    return;
  }
  // CSV: every section one after another, with a blank line between.
  const esc = (v: ReportCell) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines: string[] = [];
  input.sections.forEach((s, i) => {
    if (i > 0) lines.push("");
    if (input.sections.length > 1) lines.push(esc(s.title));
    lines.push(s.headers.map(esc).join(","));
    s.rows.forEach((r) => lines.push(r.map(esc).join(",")));
    if (s.footer) lines.push(s.footer.map(esc).join(","));
  });
  const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

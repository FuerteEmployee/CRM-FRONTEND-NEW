import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { paginateForPdf } from "@/lib/printDocument";

// Turns one of the invoice print layouts (a full <html> string) into a real
// A4 PDF, so Download and "Send Invoice to Email" use exactly what View PDF shows.
// The HTML is rendered in a hidden same-origin iframe, captured with
// html2canvas and split across as many A4 pages as it needs.
const A4_WIDTH_PX = 794; // 210mm at 96dpi
const SCALE = 2;
// One A4 page in CSS px of the rendered document — the exact height the image is cut at below.
export const A4_PAGE_CSS_PX = Math.floor(297 * ((A4_WIDTH_PX * SCALE) / 210)) / SCALE;

export async function htmlToPdf(html: string): Promise<jsPDF> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  // Kept short on purpose: the layouts have no <!DOCTYPE> (quirks mode), where
  // <body> is at least as tall as the frame — a 1123px frame made every short
  // invoice 1123px tall, 0.5px more than one A4 page, so its PDF got an almost
  // empty second page. A short frame makes body.scrollHeight the real content.
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${A4_WIDTH_PX}px;height:100px;border:0;visibility:hidden;`;
  document.body.appendChild(iframe);
  try {
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();
    await new Promise((resolve) => (doc.readyState === "complete" ? resolve(null) : iframe.addEventListener("load", resolve, { once: true })));
    await Promise.all(
      Array.from(doc.images).map((img) =>
        img.complete ? null : new Promise((resolve) => { img.onload = img.onerror = resolve; }),
      ),
    );
    await (doc as any).fonts?.ready;

    // Where each page will be cut: rows / totals that would be cut move to the
    // next page under a copy of the header (documents marked up for it).
    paginateForPdf(doc, A4_PAGE_CSS_PX, { top: 40, bottom: 40 });

    const body = doc.body;
    const canvas = await html2canvas(body, {
      scale: SCALE,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: A4_WIDTH_PX,
      windowWidth: A4_WIDTH_PX,
      height: body.scrollHeight,
      windowHeight: body.scrollHeight,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const pxPerMm = canvas.width / pageW;
    const pagePx = Math.floor(pageH * pxPerMm);

    const minLastPx = Math.ceil(2 * pxPerMm); // a leftover strip under 2mm is not worth a page
    for (let y = 0, page = 0; y < canvas.height; y += pagePx, page++) {
      if (page > 0 && canvas.height - y < minLastPx) break;
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = Math.min(pagePx, canvas.height - y);
      slice.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, slice.height / pxPerMm);
    }
    return pdf;
  } finally {
    iframe.remove();
  }
}

/** Base64 of the PDF bytes (no "data:" prefix), for sending to the API. */
export async function htmlToPdfBase64(html: string): Promise<string> {
  const pdf = await htmlToPdf(html);
  return pdf.output("datauristring").split(",")[1];
}

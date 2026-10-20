import { isEkagraUser } from "./ekagraTenant";
import { resolveImageUrl } from "./resolveImageUrl";

export interface InvoicePdfFormat {
  key: string;
  label: string;
  // Which tenant(s) are allowed to see/select this format — formats that bake
  // in one company's own letterhead (GSTIN, address, etc.) must stay scoped
  // to that tenant rather than appearing for everyone.
  isAvailable: (email?: string | null) => boolean;
}

export const INVOICE_PDF_FORMATS: InvoicePdfFormat[] = [
  { key: "generic", label: "Standard", isAvailable: () => true },
  { key: "classic_invoice", label: "Classic Invoice", isAvailable: () => true },
  { key: "ekagra_tax_invoice", label: "Tax Invoice (GST)", isAvailable: (email) => isEkagraUser(email) },
  { key: "letterhead_invoice", label: "Letterhead — Invoice", isAvailable: (email) => isEkagraUser(email) },
  { key: "letterhead_proforma", label: "Letterhead — Proforma Invoice", isAvailable: (email) => isEkagraUser(email) },
];

export const getAvailableInvoicePdfFormats = (email?: string | null): InvoicePdfFormat[] =>
  INVOICE_PDF_FORMATS.filter((f) => f.isAvailable(email));

export const DEFAULT_INVOICE_PDF_FORMAT = "generic";

export const LETTERHEAD_FORMATS = ["letterhead_invoice", "letterhead_proforma"];

export const isLetterheadFormat = (format?: string | null): boolean => !!format && LETTERHEAD_FORMATS.includes(format);

/**
 * Company block for the letterhead layout, read from Setup > Settings.
 * The logo URL is made absolute because Print/Download open the page from a
 * blob: URL, where a relative /uploads/... path would not load.
 */
export const getLetterheadCompany = (get: (key: string) => string | undefined) => {
  const logo = resolveImageUrl(get("pdfLogoUrl") || get("compLogoLight") || "");
  let logoUrl = "";
  if (logo) {
    try {
      logoUrl = new URL(logo, window.location.origin).href;
    } catch {
      logoUrl = logo;
    }
  }
  // 120 is the Settings default sized for the Standard PDF; the letterhead
  // logo sits beside a 40px title, so it uses 200 unless a width was chosen.
  const width = parseInt(get("pdfLogoWidth") || "", 10);
  return {
    name: get("companyName") || "",
    phone: get("compPhone") || "",
    email: get("compEmail") || "",
    gstin: get("compVat") || "",
    logoUrl,
    logoWidth: width > 0 && width !== 120 ? width : 200,
  };
};

/**
 * Title for the letterhead layout. The invoice's own Document Type wins;
 * otherwise the format picked in Settings decides.
 */
export const getLetterheadTitle = (documentType?: string | null, format?: string | null): string => {
  if (documentType === "proforma") return "PROFORMA INVOICE";
  if (documentType === "invoice") return "INVOICE";
  return format === "letterhead_proforma" ? "PROFORMA INVOICE" : "INVOICE";
};

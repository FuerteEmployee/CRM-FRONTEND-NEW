import { isEkagraUser } from "./ekagraTenant";

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
];

export const getAvailableInvoicePdfFormats = (email?: string | null): InvoicePdfFormat[] =>
  INVOICE_PDF_FORMATS.filter((f) => f.isAvailable(email));

export const DEFAULT_INVOICE_PDF_FORMAT = "generic";

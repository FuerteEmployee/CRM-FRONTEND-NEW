// Shared between the Setup > Settings live preview and the actual
// <WhatsAppQuickChat> component, so the preview never drifts from what
// actually gets sent when someone clicks the icon.

export const WHATSAPP_QC_PLACEHOLDERS = [
  "customer_name",
  "phone_number",
  "lead_id",
  "invoice_no",
  "company_name",
  "staff_name",
] as const;

export type WhatsappQcPlaceholder = (typeof WHATSAPP_QC_PLACEHOLDERS)[number];

export const DEFAULT_WHATSAPP_QC_TEMPLATE = "Hi {customer_name}, this is {company_name}.";

export interface WhatsappQcTemplateEntry {
  id: string;
  name: string;
  template: string;
}

export const DEFAULT_WHATSAPP_QC_TEMPLATES: WhatsappQcTemplateEntry[] = [
  { id: "default", name: "Default", template: DEFAULT_WHATSAPP_QC_TEMPLATE },
];

// Unmatched/unsupported placeholders resolve to "" rather than being left
// as literal "{invoice_no}" text — e.g. a template using {invoice_no} on a
// Leads row where there's no invoice.
export function resolveWhatsappTemplate(
  template: string,
  data: Partial<Record<WhatsappQcPlaceholder, string>>
): string {
  const safeTemplate = template && template.trim() ? template : DEFAULT_WHATSAPP_QC_TEMPLATE;
  return WHATSAPP_QC_PLACEHOLDERS.reduce(
    (msg, key) => msg.split(`{${key}}`).join(data[key] ?? ""),
    safeTemplate
  );
}

// India-only default for now (per spec) — strips everything but digits,
// then assumes a bare 10-digit number is a local Indian mobile missing its
// country code. Returns null for anything that isn't plausibly a phone
// number, so callers know to hide the icon rather than open a broken link.
export function normalizeWhatsappPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

export function buildWhatsappUrl(
  phone: string | null | undefined,
  template: string,
  data: Partial<Record<WhatsappQcPlaceholder, string>>
): string | null {
  const normalized = normalizeWhatsappPhone(phone);
  if (!normalized) return null;
  const message = resolveWhatsappTemplate(template, { ...data, phone_number: data.phone_number ?? phone ?? "" });
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

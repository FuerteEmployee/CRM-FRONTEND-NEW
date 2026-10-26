import { escapeHtml } from "./richText";

// Company block for documents (Invoice / Estimate / Proposal / Credit Note
// preview and PDFs), from Setup > Settings > Company Information.
// "Company Information Format" (compInfoFormat) decides the layout when set;
// otherwise a default layout is used.

export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email: string;
  vat: string;
  format: string;
}

export const getCompanyInfo = (get: (key: string) => any): CompanyInfo => {
  const s = (k: string) => String(get(k) ?? "").trim();
  return {
    name: s("companyName"),
    address: s("compAddress"),
    city: s("compCity"),
    state: s("compState"),
    zip: s("compZip"),
    country: s("compCountry"),
    phone: s("compPhone"),
    email: s("compEmail"),
    vat: s("compVat"),
    format: String(get("compInfoFormat") ?? ""),
  };
};

export const COMPANY_INFO_MERGE_FIELDS = [
  "{company_name}", "{address}", "{city}", "{state}", "{zip_code}", "{country_code}", "{phone}", "{email}", "{vat_number}",
];

const DEFAULT_FORMAT = "{address}\n{city}, {state} {zip_code}\n{country_code}\nPhone: {phone}\nEmail: {email}\nGSTIN: {vat_number}";

/**
 * Company detail lines below the company name. Lines whose merge fields are
 * all empty are dropped, so an unfilled field never leaves "Phone:" alone.
 */
export const companyInfoLines = (info: CompanyInfo, { includeName = false } = {}): string[] => {
  const values: Record<string, string> = {
    company_name: info.name,
    address: info.address,
    city: info.city,
    state: info.state,
    zip_code: info.zip,
    country_code: info.country,
    country: info.country,
    phone: info.phone,
    email: info.email,
    vat_number: info.vat,
    gstin: info.vat,
  };
  const template = info.format.trim() ? info.format : (includeName ? "{company_name}\n" : "") + DEFAULT_FORMAT;
  // One part of a line ("Phone: {phone}"): dropped when all its fields are empty.
  const fillPart = (part: string): string => {
    const fields: string[] = part.match(/\{[a-z_]+\}/g) || [];
    if (fields.length && !fields.some((f) => values[f.slice(1, -1)])) return "";
    // The caller prints the company name itself above these lines.
    if (!includeName && fields.length === 1 && fields[0] === "{company_name}" && part.trim() === "{company_name}") return "";
    return part
      .replace(/\{([a-z_]+)\}/g, (_, k) => values[k] ?? "")
      .replace(/\s*,\s*(,|$)/g, "$1")
      .replace(/^\s*,\s*/, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  };
  return template
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/\r?\n/)
    // "Phone: {phone} | {email}" — each "|" part is kept or dropped on its own.
    .map((line) => line.split(/\s*\|\s*/).map(fillPart).filter(Boolean).join(" | "))
    .filter(Boolean);
};

/** Same lines as HTML (escaped, one <div> per line) for the static PDF templates. */
export const companyInfoHtml = (info: CompanyInfo, style = "font-size:12px;color:#64748b;line-height:1.5;"): string =>
  companyInfoLines(info)
    .map((l) => `<div style="${style}">${escapeHtml(l)}</div>`)
    .join("");

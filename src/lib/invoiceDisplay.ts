import { amountToWords } from "./ekagraTaxInvoice";

// Setup > Settings > Finance (General + Invoices) display options for the
// standard document preview (DocumentPreviewDialog) and the invoice PDF
// (Invoices.tsx). Older rows store Yes/No as 1/0.

const on = (v: any) => v === true || v === 1 || v === "1" || v === "true";
export const settingOn = on;

export interface DocDisplayOptions {
  showTaxPerItem: boolean;
  removeTaxName: boolean;
  excludeCurrency: boolean;
  removeDecimalsZero: boolean;
  amountToWords: boolean;
  amountToWordsLower: boolean;
  showSaleAgent: boolean;
  showProject: boolean;
  showTotalPaid: boolean;
  showCredits: boolean;
  showAmountDue: boolean;
}

export const getDocDisplayOptions = (get: (key: string) => any): DocDisplayOptions => ({
  showTaxPerItem: on(get("showTaxPerItem")),
  removeTaxName: on(get("removeTaxName")),
  excludeCurrency: on(get("excludeCurrency")),
  removeDecimalsZero: on(get("removeDecimalsZero")),
  amountToWords: on(get("amountToWordsEnable")),
  amountToWordsLower: on(get("amountToWordsLower")),
  showSaleAgent: on(get("invShowSaleAgent")),
  showProject: on(get("invShowProject")),
  showTotalPaid: on(get("invShowTotalPaid")),
  showCredits: on(get("invShowCredits")),
  showAmountDue: on(get("invShowAmountDue")),
});

/** "Remove decimals on numbers/money with zero decimals": 2.00 -> 2, 2.25 stays 2.25. */
export const trimZeroDecimals = (formatted: string, opts: Pick<DocDisplayOptions, "removeDecimalsZero">) =>
  // Only the trailing decimal part (keeps "1,00,000" grouping and a symbol placed after).
  opts.removeDecimalsZero ? formatted.replace(/[.,]00(\D*)$/, "$1") : formatted;

/** Strips a leading/trailing currency symbol (for "Exclude currency symbol from items table Amount"). */
export const stripCurrencySymbol = (formatted: string, symbol: string) =>
  symbol ? formatted.replace(symbol, "").trim() : formatted;

/** Tax cell of an item row: "GST 18%" (name + rate) or just "18%" with "Remove the tax name". */
export const itemTaxLabel = (item: any, opts: Pick<DocDisplayOptions, "removeTaxName">) => {
  const rate = Number(item.tax || item.gstPercentage || 0);
  const pct = `${rate}%`;
  const name = String(item.tax_name || "").trim();
  if (!rate) return "0%";
  if (opts.removeTaxName || !name) return pct;
  return name.includes("%") ? name : `${name} ${pct}`;
};

/** "Amount to words" line, e.g. "Fifty Five Thousand Nine Hundred Four Only". */
export const amountInWords = (amount: number, opts: Pick<DocDisplayOptions, "amountToWordsLower">) => {
  const words = amountToWords(Math.round(Number(amount) || 0));
  return opts.amountToWordsLower ? words.toLowerCase() : words;
};

export const saleAgentName = (data: any) => {
  if (data?.sale_agent_name) return String(data.sale_agent_name);
  const a = data?.created_by;
  return a && typeof a === "object" ? [a.firstname, a.lastname].filter(Boolean).join(" ") : "";
};

export const projectName = (data: any) =>
  data?.project_name ? String(data.project_name) : data?.project && typeof data.project === "object" ? data.project.name || "" : "";

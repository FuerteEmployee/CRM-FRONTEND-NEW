// Ekagra Engineering's registered details for the Tax Invoice header — this
// tenant-specific layout mirrors their existing Tally-printed invoice format.
// Shared by the PDF/print/download generator (Invoices.tsx) and the on-screen
// "View" preview (DocumentPreviewDialog.tsx) so both stay in sync.
export const EKAGRA_COMPANY_INFO = {
  name: "EKAGRA ENGINEERING",
  addressLines: ["2, GROUND FLOOR, SANDHYA DEVI", "CHHAWAHI ROAD, NEAR KALI MANDIR, TOLA, GOPALGANJ, BIHAR"],
  gstin: "10CLJPK3880J1Z1",
  state: "Bihar",
  stateCode: "10",
  pan: "CLJPK3880J",
};

// Standard India GST state codes — used to render "Place of Supply" as
// "<code> - <state name>" from the client's stored state name.
const GST_STATE_CODES: Record<string, string> = {
  "jammu and kashmir": "01", "himachal pradesh": "02", "punjab": "03", "chandigarh": "04",
  "uttarakhand": "05", "haryana": "06", "delhi": "07", "rajasthan": "08", "uttar pradesh": "09",
  "bihar": "10", "sikkim": "11", "arunachal pradesh": "12", "nagaland": "13", "manipur": "14",
  "mizoram": "15", "tripura": "16", "meghalaya": "17", "assam": "18", "west bengal": "19",
  "jharkhand": "20", "odisha": "21", "chhattisgarh": "22", "madhya pradesh": "23", "gujarat": "24",
  "daman and diu": "25", "dadra and nagar haveli": "26", "maharashtra": "27", "andhra pradesh (old)": "28",
  "karnataka": "29", "goa": "30", "lakshadweep": "31", "kerala": "32", "tamil nadu": "33",
  "puducherry": "34", "andaman and nicobar islands": "35", "telangana": "36", "andhra pradesh": "37",
  "ladakh": "38",
};
export const getPlaceOfSupply = (state?: string): string => {
  if (!state) return "—";
  const code = GST_STATE_CODES[state.trim().toLowerCase()];
  return code ? `${code} - ${state}` : state;
};

// Default Terms & Conditions text when an invoice has no custom notes —
// mirrors the standard jurisdiction clause from Ekagra's existing Tally
// invoices, using the company's actual registered city from Settings.
export const getDefaultTermsText = (city?: string): string =>
  `Subject to ${(city || EKAGRA_COMPANY_INFO.addressLines[1]?.split(",").slice(-2, -1)[0]?.trim() || "").toUpperCase()} jurisdiction.`;

export const amountToWords = (num: number): string => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const c = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + c(n % 100) : "");
    if (n < 100000) return c(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + c(n % 1000) : "");
    if (n < 10000000) return c(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + c(n % 100000) : "");
    return c(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + c(n % 10000000) : "");
  };
  const rupees = Math.floor(num);
  return (c(rupees) || "Zero") + " Only";
};

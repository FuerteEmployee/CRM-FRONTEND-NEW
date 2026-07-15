
/**
 * Generates a dynamic financial year string based on April to March cycle.
 * Example: May 2026 -> "2627"
 */
export const getFinancialYear = (date: Date = new Date()): string => {
  const month = date.getMonth() + 1; // 1-indexed
  const year = date.getFullYear();
  
  let startYear, endYear;
  
  if (month >= 4) {
    // April or later: Current Year to Next Year
    startYear = year;
    endYear = year + 1;
  } else {
    // March or earlier: Previous Year to Current Year
    startYear = year - 1;
    endYear = year;
  }
  
  const startStr = startYear.toString().slice(-2);
  const endStr = endYear.toString().slice(-2);
  
  return `${startStr}${endStr}`;
};

/**
 * Generates a dynamic document sequence number.
 * Format: {Prefix}/{FinancialYear}/{StoreCode}/{Sequence}
 */
export const generateSequenceNumber = (
  prefix: string,
  storeCode: string,
  sequence: string | number = "1",
  date: Date = new Date()
): string => {
  const fy = getFinancialYear(date);
  const cleanStoreCode = (storeCode || "WH").toUpperCase();
  const formattedSequence = sequence.toString();
  
  return `${prefix}/${fy}/${cleanStoreCode}/${formattedSequence}`;
};

export const getSequenceParts = (
  prefix: string,
  storeCode: string,
  sequence: string | number = "1",
  date: Date = new Date()
) => {
  const fy = getFinancialYear(date);
  const cleanStoreCode = (storeCode || "WH").toUpperCase();
  const formattedSequence = sequence.toString();
  
  return {
    prefixPart: `${prefix}/${fy}/${cleanStoreCode}/`,
    sequencePart: formattedSequence
  };
};

export const DOC_PREFIXES = {
  SALES_INVOICE: "SI",
  SALES_ORDER: "SO",
  QUOTATION: "QT",
  SALES_RETURN: "SR",
  DELIVERY_ORDER: "DO",
  SALES_DC: "SDC",
  PURCHASE_BILL: "PI",
  PURCHASE_ORDER: "PO",
  PURCHASE_RETURN: "PR",
  PURCHASE_DC: "PDC",
};

/**
 * Formats a document number dynamically to the Prefix/FinancialYear/BranchCode/Number format.
 * Returns the existing document number if it is already in this format.
 */
export const formatDocNumber = (
  prefix: string,
  createdAt: string | Date | undefined,
  branch: any,
  dbDocNo: string,
  index: number
): string => {
  const cleanDbDocNo = dbDocNo || "";

  // If already in new format, return it
  if (cleanDbDocNo.includes("/")) return cleanDbDocNo;

  const date = createdAt ? new Date(createdAt) : new Date();
  const fy = getFinancialYear(date);

  const branchCode = ((branch?.shortName || branch?.code || branch?.name || "WH") as string)
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 8);

  let seq = String(index);
  if (cleanDbDocNo.includes("-")) {
    const parts = cleanDbDocNo.split("-");
    const lastPart = parts[parts.length - 1];
    if (lastPart && !isNaN(Number(lastPart))) {
      seq = lastPart;
    }
  } else if (cleanDbDocNo) {
    seq = cleanDbDocNo;
  }

  return `${prefix}/${fy}/${branchCode}/${seq}`;
};


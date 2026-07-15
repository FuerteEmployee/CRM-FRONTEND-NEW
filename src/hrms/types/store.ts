export interface Store {
  id: string;
  _id?: string;
  
  // Core Fields
  name: string;
  shortName: string;
  allowTransactionSince?: string;
  accountGroup?: any; // ObjectId reference
  branchCategory?: string;
  openedOn?: string;
  status: "Active" | "Inactive";

  // Address Info Tab
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  pincode?: string;
  city?: string;
  state?: string;
  mobile?: string;
  phone1?: string;
  email?: string;
  fax?: string;
  otherInfo?: string;
  areaSqFt?: string;

  // Others1 Tab
  lstNo?: string;
  cstNo?: string;
  gstin?: string;
  taxClassInward?: string;
  branchType?: string;
  stockTransferCreditLimit?: string;
  cashLimit?: string;
  pan?: string;
  taxClassOutward?: string;

  // Others2 Tab
  purchasePriceTemplate?: string;
  salesPriceTemplate?: string;
  validate2ndMinSellingPrice?: string;
  validateMaxExchangePurcDCPrice?: string;
  validateMinSellingPrice?: string;
  validateMaxSellingPrice?: string;
  validateMaxPurchasesPrice?: string;
  internalStockTransferPriceTemplate?: string;

  // Others3 Tab
  branchCompanyName?: string;
  sisTemplate?: string;
  outwardAccount?: string;
  companyGroup?: string;
  sisDealer?: string;
  inwardAccount?: string;

  // Others4 Tab
  merchantId?: string;
  terminalId?: string;
  
  // Legacy for compatibility
  location?: string;
  code?: string;
  description?: string;
  image?: string;
  isWarehouse?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Franchise {
  id: string;
  name: string;
  code: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  stores: string[] | Store[];
  isActive: boolean;
  agreementDate?: string;
  expiryDate?: string;
  notes?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    bannerFrame?: string;
  };

  // ── Franchise Master extension ──────────────────────────────────────
  businessName?: string;
  gstNumber?: string;
  panNumber?: string;
  city?: string;
  state?: string;
  pincode?: string;
  bankInfo?: {
    accountName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    branchCity?: string;
  };
  upiId?: string;
  securityDeposit?: number;
  status?: "Active" | "Inactive" | "Suspended" | "Terminated";
  logoUrl?: string;
  documents?: { name: string; url: string }[];
  createdAt?: string;
  updatedAt?: string;
}

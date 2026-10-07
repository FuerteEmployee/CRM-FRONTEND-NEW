import { useState, useMemo, useEffect } from "react";
import { useOpenCreateModal } from "@/hooks/useOpenCreateModal";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, ShoppingCart } from "lucide-react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { purchaseService } from "@/api/services/purchase.service";
import { staffService } from "@/api/services/staff.service";
import { formatDate } from "@/lib/dateFormat";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTableRows } from "@/components/ui/skeleton-table-rows";
import { usePermissions } from "@/hooks/usePermissions";
import { isTrinetraPilotUser } from "@/lib/trinetraPilot";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";
import { useCurrency } from "@/context/CurrencyContext";
import { ExportButton } from "@/components/ui/export-button";
import { ImportDialog, type ImportColumn } from "@/components/ui/import-dialog";
import { useSettings } from "@/context/SettingsContext";
import { VendorSelect, type VendorRecord } from "@/components/VendorSelect";
import { vendorService } from "@/api/services/vendor.service";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ItemSelect, gstRateFromItem, type ItemRecord } from "@/components/ItemSelect";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, TablePagination } from "@/components/ui/table";

const PURCHASE_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "Bill Date", sample: "27-08-2026", core: true },
  { key: "Particulars", sample: "Sunrise Traders", required: true, core: true },
  { key: "Voucher Type", sample: "Purchase", core: true },
  { key: "Voucher No.", sample: "PB-3301", required: true, core: true },
  { key: "Quantity", sample: 5, core: true },
  { key: "Rate", sample: 2000, core: true },
  { key: "Amount", sample: 10000, core: true },
  { key: "Total", sample: 11800, core: true },
  { key: "CGST 9%", sample: 900, core: true },
  { key: "SGST 9%", sample: 900, core: true },
  { key: "PURCHASE IGST", sample: 0, core: true },
  { key: "Round off", sample: 0, core: true },
  { key: "Branch", sample: "Chennai", core: true },
  { key: "Item Description", sample: "Office Chairs", core: false },
  { key: "Freight Percentage", sample: 1, core: false },
];

const HOME_STATE = "Gujarat";
const HOME_STATE_GST_CODE = "24";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const GST_RATES = ["0", "5", "12", "18", "28"];

// Mirrors Backend/src/utils/gstStateCodes.js — used only for the live
// supplier_state preview when a vendor is selected; the server recomputes
// this authoritatively from the vendor's GSTIN on save.
const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
  "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
};

// Mirrors the backend rule: GSTIN state code wins, otherwise the state name
const isIntraState = (state: string, gstin: string) => {
  const g = (gstin || "").trim();
  if (/^\d{2}/.test(g)) return g.substring(0, 2) === HOME_STATE_GST_CODE;
  return (state || "").trim().toLowerCase() === HOME_STATE.toLowerCase();
};

const emptyForm = {
  vendor_id: "",
  item_id: "",
  supplier_name: "",
  supplier_address: "",
  supplier_state: HOME_STATE,
  supplier_gstin: "",
  bill_no: "",
  bill_date: new Date().toISOString().split("T")[0],
  due_date: "",
  voucher_type: "",
  branch: "",
  product: "",
  hsn_code: "",
  quantity: "1",
  rate: "",
  amount: "",
  freight_charge: "",
  gst_rate: "18",
  payment_status: "Unpaid",
  payment_date: "",
  paymentmode: "",
  journal: "",
  bank_details: "",
  sales_person: "",
  note: "",
};

const toDateInput = (d: any) => (d ? new Date(d).toISOString().split("T")[0] : "");

const Purchases = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can, user, isModuleEnabled } = usePermissions();
  const isPilot = isTrinetraPilotUser(user?.email);
  // Branch is sourced from the HRMS module — only show/fetch the HRMS branch
  // picker when the tenant's plan actually includes HRMS, even for a
  // pilot-flagged user (fall back to a plain text Branch field otherwise).
  const canUseBranch = isPilot && isModuleEnabled("hrms");
  const { symbol } = useCurrency();
  const { getSetting } = useSettings();
  const vendorLinkageEnabled = !!getSetting("vendor_linked_purchases", false);
  const simplifiedRegister = !!getSetting("simplified_purchase_register", false);
  const getNewPurchaseForm = () => ({ ...emptyForm, gst_rate: simplifiedRegister ? "0" : emptyForm.gst_rate });
  const [vendorFilter, setVendorFilter] = useState<string[]>([]);
  const [branchFilter, setBranchFilter] = useState("all");

  const { data: vendors = [] } = useQuery<VendorRecord[]>({
    queryKey: ["vendors"],
    queryFn: () => vendorService.getAll(),
  });

  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["staff"],
    queryFn: () => staffService.getAll(),
  });

  const { data: branchesRaw = [] } = useQuery<any[]>({
    queryKey: ["hrms-branches-list"],
    queryFn: () => hrmsbranchService.getAll().then((r) => r.data || []),
    enabled: canUseBranch,
    staleTime: 5 * 60 * 1000,
  });
  // Branch names that arrived via Excel import are free text, not HRMS branch
  // records — without this they'd show correctly in the table but could never
  // be picked from the filter dropdown (which only listed the HRMS master).
  const { data: importedBranches = [] } = useQuery<string[]>({
    queryKey: ["purchase-branches-list"],
    queryFn: () => purchaseService.getBranches().then((r: any) => r.data || r || []),
    enabled: canUseBranch,
    staleTime: 5 * 60 * 1000,
  });
  const branches: { _id: string; name: string }[] = useMemo(() => {
    const seen = new Set<string>();
    const merged: { _id: string; name: string }[] = [];
    [...branchesRaw.map((b: any) => b.name), ...importedBranches].forEach((name) => {
      if (!name || seen.has(name)) return;
      seen.add(name);
      merged.push({ _id: name, name });
    });
    return merged;
  }, [branchesRaw, importedBranches]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<any>(null);
  const [formData, setFormData] = useState<any>(emptyForm);
  const [freightPercent, setFreightPercent] = useState("1");
  // Products already added to the bill being created/edited — the "Product &
  // Amount" fields below are the draft row for the *next* item, mirroring
  // Invoice Create's items table. Left empty means "just this one product",
  // which keeps today's single-line behavior exactly as it was.
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState<number | "all">(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkState, setBulkState] = useState({
    massDelete: false,
    payment_status: "",
    payment_date: "",
    paymentmode: "",
  });

  // Freight is entered as a percentage of Price (default 1%, editable) and
  // always drives the stored rupee freight_charge — recomputed live whenever
  // either Price or the percentage changes, for every tenant (not just the
  // Trinetra pilot). Skipped in simplifiedRegister mode, which has no Freight
  // field at all and must not have freight_charge silently injected.
  useEffect(() => {
    if (simplifiedRegister || !isModalOpen) return;
    const amt = parseFloat(formData.amount) || 0;
    const pct = parseFloat(freightPercent) || 0;
    const calcFreight = amt > 0 && pct > 0 ? (Math.round(amt * (pct / 100) * 100) / 100).toString() : "0";
    setFormData((f: any) => ({ ...f, freight_charge: calcFreight }));
  }, [simplifiedRegister, formData.amount, freightPercent, isModalOpen]);

  useOpenCreateModal(() => { setEditingPurchase(null); setFormData(getNewPurchaseForm()); setFreightPercent("1"); setLineItems([]); setIsModalOpen(true); });

  // Paginated server-side once a finite page size is chosen; "all" keeps
  // the legacy full fetch, filtered client-side exactly as this page always
  // has (needed for the vendor-name/GSTIN fuzzy fallback matching).
  type PurchaseTotals = { amount: number; cgst: number; sgst: number; igst: number; total: number };
  const ZERO_TOTALS: PurchaseTotals = { amount: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
  interface PurchasesPage { rows: any[]; total: number; pages: number; totals: PurchaseTotals }
  const { data: purchasesResult, isLoading } = useQuery<PurchasesPage>({
    queryKey: ["purchases", itemsPerPage, currentPage, debouncedSearch, branchFilter, vendorFilter],
    queryFn: async () => {
      if (itemsPerPage === "all") {
        const response = await purchaseService.getAll();
        const rows: any[] = Array.isArray(response) ? response : response?.data || [];
        return { rows, total: rows.length, pages: 1, totals: ZERO_TOTALS };
      }

      const res: any = await purchaseService.getAll({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch || undefined,
        branch: branchFilter !== "all" ? branchFilter : undefined,
        vendor: vendorFilter.length ? vendorFilter.join(",") : undefined,
      });
      if (Array.isArray(res)) return { rows: [], total: 0, pages: 1, totals: ZERO_TOTALS };
      return {
        rows: res?.data ?? [],
        total: res?.total ?? 0,
        pages: res?.pages ?? 1,
        totals: res?.totals ?? ZERO_TOTALS,
      };
    },
    placeholderData: keepPreviousData,
  });
  // In "all" mode the vendor filter's fuzzy name/GSTIN fallback still runs
  // client-side over the full fetch (see filteredPurchases below); in
  // paginated mode the server already applied it, so purchases is just the
  // current page and filteredPurchases becomes a light pass-through.
  const purchases: any[] = purchasesResult?.rows ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["purchases"] });

  const createMutation = useMutation({
    mutationFn: purchaseService.create,
    onSuccess: () => {
      invalidate();
      toast({ title: "Success", description: "Purchase bill saved successfully" });
      handleCloseModal();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => purchaseService.update(id, data),
    onSuccess: () => {
      invalidate();
      toast({ title: "Success", description: "Purchase bill updated successfully" });
      handleCloseModal();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: purchaseService.delete,
    onSuccess: () => {
      invalidate();
      toast({ title: "Success", description: "Purchase bill deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: purchaseService.importPurchases,
    onSuccess: async (data: any) => {
      await invalidate();
      toast({
        title: data.count === 0 ? "No Purchases Imported" : "Import Successful",
        description: data.message || "Imported purchase bills",
        variant: data.count === 0 ? "destructive" : "default",
      });
    },
    onError: (err: any) => {
      toast({ title: "Import Failed", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const normalizeKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");

  const getField = (row: any, ...candidates: string[]) => {
    const normalizedRow: Record<string, any> = {};
    Object.keys(row).forEach((k) => { normalizedRow[normalizeKey(k)] = row[k]; });
    for (const candidate of candidates) {
      const val = normalizedRow[normalizeKey(candidate)];
      if (val !== undefined && val !== null && String(val).trim() !== "") return val;
    }
    return "";
  };

  // Numbers coming out of Excel/CSV often carry thousand separators
  // ("33,164.50") or a currency symbol ("Rs. 872.75") — plain parseFloat()
  // stops at the first comma and silently returns just the leading digits.
  const parseNum = (val: any) => parseFloat(String(val ?? "").replace(/[^0-9.-]/g, "")) || 0;

  // Matches the Tally Purchase Day Book column layout (see exportColumns
  // above): Bill Date | Particulars | Voucher Type | Voucher No. | Quantity |
  // Rate | Amount | Total | PURCHASE GST | CGST 9% | SGST 9% | PURCHASE IGST |
  // FREIGHT 1% | IGST 18% | Round off.
  // "PURCHASE GST" is the same taxable value as Amount — read as a fallback
  // for Amount, never a separate field. "IGST 18%" is intentionally not read
  // at all — it duplicates PURCHASE IGST in Tally's export and would double
  // the igst value if both were summed.
  const processPurchaseRows = (rows: any[]) => {
    const purchasesData = rows.map((row: any) => {
      const amount = parseNum(getField(row, "amount", "purchase gst", "price", "taxable value", "taxable amount"));
      const quantity = parseNum(getField(row, "quantity", "qty"));
      const rate = parseNum(getField(row, "rate"));
      const finalAmount = amount || (quantity * rate) || 0;

      // "Freight Percentage" (the column this dialog's sample file offers) is a
      // % of Amount, same rule the New Purchase form uses — NOT a rupee value.
      // "FREIGHT 1%"/"Freight Charge"/"Freight"/"Shipping" stay rupee aliases
      // (real historical Tally exports carry an already-computed currency
      // amount under a column literally named "FREIGHT 1%"; reinterpreting
      // those as a percentage would silently corrupt re-imports of that data).
      // Blank in all of them defaults to 1% of Amount rather than 0.
      const rawFreightPct = getField(row, "freight percentage", "freight percent", "freight pct");
      const rawFreightAmt = getField(row, "freight 1%", "freight charge", "freight", "shipping");
      let freightVal: number;
      if (String(rawFreightPct).trim() !== "") {
        freightVal = Math.round(finalAmount * (parseNum(rawFreightPct) / 100) * 100) / 100;
      } else if (String(rawFreightAmt).trim() !== "") {
        freightVal = parseNum(rawFreightAmt);
      } else {
        freightVal = Math.round(finalAmount * 0.01 * 100) / 100;
      }

      return {
        supplier_name: String(getField(row, "particulars", "company name", "company", "supplier name", "supplier", "vendor", "vendor name", "party", "party name", "firm name")),
        bill_date: getField(row, "bill date", "date", "invoice date"),
        bill_no: String(getField(row, "voucher no.", "voucher no", "voucher number", "bill reference", "bill ref", "bill no", "billno", "bill number", "invoice no", "invoice number", "invoice reference", "ref no", "bill ref no")),
        voucher_type: String(getField(row, "voucher type")),
        branch: String(getField(row, "branch name", "branch")),
        sales_person: String(getField(row, "sales person", "salesperson")),
        product: String(getField(row, "item description", "product", "item", "description", "particulars 2")),
        quantity,
        rate,
        amount: finalAmount,
        total: parseNum(getField(row, "total")),
        cgst: parseNum(getField(row, "cgst 9%", "cgst")),
        sgst: parseNum(getField(row, "sgst 9%", "sgst")),
        igst: parseNum(getField(row, "purchase igst", "igst")),
        freight_charge: freightVal,
        round_off: parseNum(getField(row, "round off", "roundoff")),
      };
    });

    const valid = purchasesData.filter(
      (p) => p.bill_no && p.supplier_name && (p.amount > 0 || (p.quantity > 0 && p.rate > 0))
    );
    if (valid.length === 0) {
      const missing: string[] = [];
      if (!purchasesData.some((p) => p.bill_no)) missing.push("Voucher No.");
      if (!purchasesData.some((p) => p.supplier_name)) missing.push("Particulars");
      if (!purchasesData.some((p) => p.amount > 0 || (p.quantity > 0 && p.rate > 0))) missing.push("Amount (or Quantity + Rate)");
      const foundHeaders = rows[0] ? Object.keys(rows[0]).join(", ") : "(file appears empty)";
      toast({
        title: "Error",
        description: `Missing or unreadable: ${missing.join(", ")}. Columns found in the file: ${foundHeaders}`,
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate(valid as any);
  };

  // Detects a Tally-exported "Purchase Register": one rollup row per bill
  // (Bill Date, Particulars = party name, Voucher Type, Voucher No., a
  // Quantity/Amount that is the SUM of every item below it, and the bill's
  // tax-inclusive grand Total), followed by one row per line item where
  // Bill Date/Voucher No./Total are blank and Particulars holds the item name.
  // Header presence alone ("Particulars" + "Voucher No.") isn't enough to
  // tell this apart from our own single-row-per-record export (Purchases.tsx
  // exportColumns), which has the exact same two headers but fills Voucher
  // No. on every row — so this also requires at least one row with a blank
  // Voucher No., which only the multi-row rollup+item-line format produces.
  const isTallyPurchaseRegister = (rows: any[]) => {
    if (!rows.length) return false;
    const keys = Object.keys(rows[0]).map(normalizeKey);
    const hasExpectedHeaders = keys.includes("particulars") && keys.some((k) => k.includes("voucherno"));
    if (!hasExpectedHeaders) return false;
    return rows.some((row) => !String(getField(row, "voucher no.", "voucher no", "voucher number")).trim());
  };

  // Carries Bill Date/Voucher No./Party Name/Voucher Type down from each
  // rollup row onto the item rows beneath it. The rollup row's own
  // Quantity/Rate/Amount is never turned into a Purchase line — it's just
  // the sum of the item rows that follow, so including it would double the
  // bill's total. Some Purchase Register exports DO carry CGST/SGST/PURCHASE
  // IGST on the rollup row (verified against PURCHASE18-19 import 1.xlsx) —
  // when present, derive an effective GST rate from that bill's total tax ÷
  // taxable value and apply it to every item line below, so per-line tax
  // (split proportionally by each line's own amount) matches the bill total.
  // Falls back to 0% when the rollup row has no tax columns at all (e.g.
  // PURCHASE25-26.xlsx), same as before.
  const processTallyPurchaseRows = (rows: any[]) => {
    let currentBillNo = "";
    let currentSupplier = "";
    let currentBillDate: any = "";
    let currentVoucherType = "";
    let currentBranch = "";
    let currentSalesPerson = "";
    let currentGstRate = 0;
    // supplier_state drives the backend's CGST+SGST vs IGST split (it has no
    // GSTIN column to read here) — set to home state when the rollup row's
    // own CGST/SGST columns are filled, left blank (→ inter-state/IGST) when
    // only "IGST 18%" is filled or neither is present.
    let currentSupplierState = "";
    // The rollup row's own Freight/Amount — item rows never carry their own
    // freight value, so each item's share is distributed proportionally by
    // its amount (freight is 1% of amount, i.e. linear, so this reproduces
    // the sheet's per-bill freight and downstream tax total exactly instead
    // of leaving item-line freight at 0).
    let currentBillFreight = 0;
    let currentBillAmount = 0;

    const purchasesData: any[] = [];
    rows.forEach((row: any) => {
      const voucherNo = String(getField(row, "voucher no.", "voucher no", "voucher number")).trim();
      const particulars = String(getField(row, "particulars")).trim();
      const qty = parseNum(getField(row, "quantity", "qty"));
      const rate = parseNum(getField(row, "rate"));
      const amount = parseNum(getField(row, "amount")) || (qty * rate) || 0;

      if (voucherNo) {
        // Rollup row for a new bill — capture context, skip creating a line.
        currentBillNo = voucherNo;
        currentSupplier = particulars;
        currentBillDate = getField(row, "bill date", "date");
        currentVoucherType = String(getField(row, "voucher type")).trim();
        currentBranch = String(getField(row, "branch name", "branch")).trim();
        currentSalesPerson = String(getField(row, "sales person", "salesperson")).trim();

        // "PURCHASE IGST" duplicates the taxable Amount (a ledger-split
        // column, same trick as "PURCHASE GST") — NOT the tax value. The
        // actual IGST tax sits under "IGST 18%", so that's read here instead
        // (verified: PURCHASE18-19 import 1.xlsx bill 230 — PURCHASE IGST is
        // 16761, equal to Amount, while IGST 18% is 3047.15 = 18% of
        // Amount+Freight, the real tax).
        const rollupCgst = parseNum(getField(row, "cgst 9%", "cgst"));
        const rollupSgst = parseNum(getField(row, "sgst 9%", "sgst"));
        const rollupIgst = parseNum(getField(row, "igst 18%", "igst"));
        // "Freight Percentage" (this dialog's sample column) is a % of Amount;
        // "FREIGHT 1%"/"Freight Charge"/"Freight"/"Shipping" stay rupee aliases
        // for real historical Tally exports (see note below).
        const rollupFreightPct = getField(row, "freight percentage", "freight percent", "freight pct");
        const rollupFreight = String(rollupFreightPct).trim() !== ""
          ? Math.round(amount * (parseNum(rollupFreightPct) / 100) * 100) / 100
          : parseNum(getField(row, "freight 1%", "freight charge", "freight", "shipping"));
        const rollupTax = rollupCgst + rollupSgst + rollupIgst;
        const rollupTaxable = amount + rollupFreight;
        currentGstRate = rollupTax > 0 && rollupTaxable > 0 ? Math.round((rollupTax / rollupTaxable) * 100) : 0;
        currentSupplierState = rollupCgst > 0 || rollupSgst > 0 ? HOME_STATE : "";
        currentBillFreight = rollupFreight;
        currentBillAmount = amount;
        return;
      }

      if (!currentBillNo || !particulars || !(amount > 0 || (qty > 0 && rate > 0))) return;

      // Freight Percentage (% of this item's own Amount) wins if present.
      // Otherwise, a blank item-line Freight cell means the bill's rollup row
      // carries the freight instead (split proportionally below); if the
      // rollup row has none either, default to 1% of this item's Amount —
      // same default the New Purchase form applies — rather than 0.
      const rawFreightPct = getField(row, "freight percentage", "freight percent", "freight pct");
      const rawFreight = getField(row, "freight 1%", "freight charge", "freight", "shipping");
      let freightVal: number;
      if (String(rawFreightPct).trim() !== "") {
        freightVal = Math.round(amount * (parseNum(rawFreightPct) / 100) * 100) / 100;
      } else if (String(rawFreight).trim() !== "") {
        freightVal = parseNum(rawFreight);
      } else {
        freightVal = currentBillFreight > 0 && currentBillAmount > 0
          ? Math.round(currentBillFreight * (amount / currentBillAmount) * 100) / 100
          : Math.round(amount * 0.01 * 100) / 100;
      }

      purchasesData.push({
        bill_no: currentBillNo,
        supplier_name: currentSupplier,
        bill_date: currentBillDate,
        voucher_type: currentVoucherType,
        branch: currentBranch,
        sales_person: currentSalesPerson,
        product: particulars,
        quantity: qty,
        rate,
        amount,
        gst_rate: currentGstRate,
        supplier_state: currentSupplierState,
        freight_charge: freightVal,
      });
    });

    if (purchasesData.length === 0) {
      toast({
        title: "Error",
        description: "No item rows found under any bill in this Purchase Register.",
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate(purchasesData as any);
  };

  // Import entry point wired to the Import button — picks the parser based
  // on which column headers the uploaded file actually has, so the full
  // bill-format sheet and a Tally Purchase Register export both work from
  // the same button.
  const handlePurchaseImport = (rows: any[]) => {
    if (isTallyPurchaseRegister(rows)) processTallyPurchaseRows(rows);
    else processPurchaseRows(rows);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPurchase(null);
    setFormData(emptyForm);
    setLineItems([]);
  };

  const handleEdit = (p: any) => {
    setEditingPurchase(p);
    // A bill saved with multiple products carries its own `items` array — load
    // those into the table and leave the draft row empty for adding more.
    // A legacy/imported single-line bill has no items array; keep loading it
    // straight into the draft row exactly as this always has, so editing an
    // old purchase still looks and behaves the same as before.
    const hasMultipleItems = Array.isArray(p.items) && p.items.length > 0;
    setLineItems(hasMultipleItems ? p.items.map((it: any) => ({
      id: Math.random().toString(36).substring(2, 9),
      item_id: it.item_id?._id || it.item_id || "",
      product: it.product || "",
      hsn_code: it.hsn_code || "",
      quantity: it.quantity ?? 1,
      rate: it.rate ?? 0,
      amount: it.amount ?? 0,
      freight_charge: it.freight_charge ?? 0,
      gst_rate: it.gst_rate ?? 0,
    })) : []);
    setFormData({
      vendor_id: p.vendor_id?._id || p.vendor_id || "",
      item_id: hasMultipleItems ? "" : (p.item_id?._id || p.item_id || ""),
      supplier_name: p.supplier_name || "",
      supplier_address: p.supplier_address || "",
      // Blank supplier_state with tax_type "IGST" means this bill was correctly
      // computed/imported as inter-state (see processTallyPurchaseRows) — defaulting
      // it to HOME_STATE here would flip isIntraState() to true and make the GST/IGST
      // preview below show a fake CGST+SGST split for a genuinely inter-state bill.
      // Only default to HOME_STATE when the record has no tax_type opinion at all.
      supplier_state: p.supplier_state || (p.tax_type === "IGST" ? "" : HOME_STATE),
      supplier_gstin: p.supplier_gstin || "",
      bill_no: p.bill_no || "",
      bill_date: toDateInput(p.bill_date),
      due_date: toDateInput(p.due_date),
      voucher_type: p.voucher_type || "",
      branch: p.branch || "",
      product: hasMultipleItems ? "" : (p.product || ""),
      hsn_code: hasMultipleItems ? "" : (p.hsn_code || ""),
      quantity: hasMultipleItems ? "1" : (p.quantity ?? 1).toString(),
      rate: hasMultipleItems ? "" : ((p.rate ?? 0) ? p.rate.toString() : ""),
      amount: hasMultipleItems ? "" : (p.amount?.toString() || ""),
      freight_charge: hasMultipleItems ? "" : ((p.freight_charge ?? 0) ? p.freight_charge.toString() : ""),
      gst_rate: hasMultipleItems ? (simplifiedRegister ? "0" : "18") : (p.gst_rate ?? 18).toString(),
      payment_status: p.payment_status || "Unpaid",
      payment_date: toDateInput(p.payment_date),
      paymentmode: p.paymentmode || "",
      journal: p.journal || "",
      bank_details: p.bank_details || "",
      sales_person: p.sales_person || "",
      note: p.note || "",
    });
    // Re-derive the percentage this bill's freight actually works out to
    // (rather than resetting to the 1% default), so editing an existing bill
    // doesn't silently change a freight amount that was entered at some other
    // rate — Amount changes afterward still scale freight by this same rate.
    const existingAmt = Number(p.amount) || 0;
    const existingFreight = Number(p.freight_charge) || 0;
    setFreightPercent(
      hasMultipleItems || existingAmt <= 0
        ? "1"
        : (Math.round((existingFreight / existingAmt) * 100 * 100) / 100).toString()
    );
    setIsModalOpen(true);
  };

  const setField = (field: string, value: any) =>
    setFormData((f: any) => ({ ...f, [field]: value }));

  // Selecting a vendor snapshots its fields onto the form; changing vendor on
  // an existing bill re-derives the GST/IGST split since the state may differ.
  const handleVendorChange = (vendor: VendorRecord | null) => {
    if (!vendor) {
      setField("vendor_id", "");
      return;
    }
    const hadDifferentVendor = formData.vendor_id && formData.vendor_id !== vendor._id;
    const gstin = String(vendor.gst_number || "").trim();
    const stateCode = /^\d{2}/.test(gstin) ? gstin.substring(0, 2) : "";
    const detectedState = GST_STATE_CODES[stateCode];

    setFormData((f: any) => ({
      ...f,
      vendor_id: vendor._id,
      supplier_name: vendor.company_name,
      supplier_gstin: vendor.gst_number || "",
      supplier_address: vendor.address || "",
      supplier_state: detectedState || f.supplier_state,
    }));

    if (hadDifferentVendor && parseFloat(formData.amount) > 0) {
      toast({ title: "Vendor changed", description: "GST/IGST split has been recalculated for the new vendor's state." });
    }
  };

  // Auto-fills product/HSN/rate/GST% from the catalog item — every field
  // stays a plain editable input afterward, so the user can override any of
  // them without a later item-master edit silently changing this bill.
  const handleItemChange = (item: ItemRecord) => {
    setFormData((f: any) => {
      const next = {
        ...f,
        item_id: item._id,
        product: item.name,
        hsn_code: item.hsn_sac_code || f.hsn_code,
        rate: item.rate != null ? String(item.rate) : f.rate,
      };
      const gstRate = gstRateFromItem(item);
      if (gstRate) next.gst_rate = String(gstRate);
      const q = parseFloat(next.quantity) || 0;
      const r = parseFloat(next.rate) || 0;
      if (q > 0 && r > 0) next.amount = (Math.round(q * r * 100) / 100).toString();
      return next;
    });
  };

  // Quantity/rate changes recompute Price automatically
  const setQtyRate = (field: "quantity" | "rate", value: string) => {
    setFormData((f: any) => {
      const next = { ...f, [field]: value };
      const q = parseFloat(next.quantity) || 0;
      const r = parseFloat(next.rate) || 0;
      if (q > 0 && r > 0) next.amount = (Math.round(q * r * 100) / 100).toString();
      return next;
    });
  };

  // Pushes the current draft row (Product & Amount fields) onto the bill's
  // item list, then clears the draft so another product can be entered —
  // same "add row, keep going" flow as Invoice Create's items table.
  const addLineItem = () => {
    const amt = parseFloat(formData.amount) || 0;
    if (!(amt > 0)) {
      toast({ title: "Error", description: "Enter a price (or Qty × Rate) before adding the item", variant: "destructive" });
      return;
    }
    setLineItems((items) => [...items, {
      id: Math.random().toString(36).substring(2, 9),
      item_id: formData.item_id || "",
      product: formData.product || "",
      hsn_code: formData.hsn_code || "",
      quantity: parseFloat(formData.quantity) || 0,
      rate: parseFloat(formData.rate) || 0,
      amount: amt,
      freight_charge: parseFloat(formData.freight_charge) || 0,
      gst_rate: parseFloat(formData.gst_rate) || 0,
    }]);
    toast({ title: "Item added", description: formData.product ? `"${formData.product}" added to the bill.` : "Item added to the bill." });
    setFormData((f: any) => ({
      ...f,
      item_id: "",
      product: "",
      hsn_code: "",
      quantity: "1",
      rate: "",
      amount: "",
      freight_charge: "",
      gst_rate: simplifiedRegister ? "0" : "18",
    }));
    setFreightPercent("1");
  };

  const removeLineItem = (id: string) => setLineItems((items) => items.filter((it) => it.id !== id));

  const handleSave = () => {
    if (canUseBranch && !formData.branch) {
      toast({ title: "Error", description: "Branch is required", variant: "destructive" });
      return;
    }
    if (!formData.bill_no || !formData.supplier_name) {
      toast({ title: "Error", description: "Bill Reference and Company Name are required", variant: "destructive" });
      return;
    }
    if (vendorLinkageEnabled && !formData.vendor_id) {
      toast({ title: "Error", description: "Please select a vendor", variant: "destructive" });
      return;
    }

    const payload: any = {
      ...formData,
      due_date: formData.due_date || null,
      payment_date: formData.payment_date || null,
    };

    if (simplifiedRegister) {
      // Unchanged legacy single-amount flow — always one flat line, no items table.
      if (!(parseFloat(formData.amount) > 0)) {
        toast({ title: "Error", description: "Amount is required", variant: "destructive" });
        return;
      }
      payload.quantity = parseFloat(formData.quantity) || 0;
      payload.rate = parseFloat(formData.rate) || 0;
      payload.amount = parseFloat(formData.amount) || 0;
      payload.freight_charge = parseFloat(formData.freight_charge) || 0;
      payload.gst_rate = parseFloat(formData.gst_rate) || 0;
    } else {
      // Whatever's still sitting in the draft row counts as one more item —
      // so filling the fields once and hitting Save (without ever clicking
      // "Add Item") still creates a normal single-product bill, exactly like
      // it always has.
      const draftAmt = parseFloat(formData.amount) || 0;
      const items = draftAmt > 0
        ? [...lineItems, {
            item_id: formData.item_id || undefined,
            product: formData.product || "",
            hsn_code: formData.hsn_code || "",
            quantity: parseFloat(formData.quantity) || 0,
            rate: parseFloat(formData.rate) || 0,
            amount: draftAmt,
            freight_charge: parseFloat(formData.freight_charge) || 0,
            gst_rate: parseFloat(formData.gst_rate) || 0,
          }]
        : lineItems;

      if (items.length === 0) {
        toast({ title: "Error", description: "Add at least one product with a price", variant: "destructive" });
        return;
      }

      payload.items = items;
      delete payload.product;
      delete payload.hsn_code;
      delete payload.quantity;
      delete payload.rate;
      delete payload.amount;
      delete payload.freight_charge;
      delete payload.gst_rate;
      delete payload.item_id; // per-item item_id now lives inside payload.items[]
    }

    if (editingPurchase) {
      updateMutation.mutate({ id: editingPurchase._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Live preview — mirrors the backend: each item's taxable value is its own
  // price + freight, taxed at its own GST rate, then summed for the bill.
  // Includes whatever's currently in the draft row (not yet "added") so the
  // preview stays live while typing, same as the single-item flow always was.
  const taxPreview = useMemo(() => {
    const draftAmt = parseFloat(formData.amount) || 0;
    const effectiveItems = draftAmt > 0
      ? [...lineItems, { amount: draftAmt, freight_charge: formData.freight_charge, gst_rate: formData.gst_rate }]
      : lineItems;

    let subtotal = 0;
    let freightTotal = 0;
    let taxTotal = 0;
    effectiveItems.forEach((it: any) => {
      const amt = Number(it.amount) || 0;
      const fr = Number(it.freight_charge) || 0;
      const gr = Number(it.gst_rate) || 0;
      subtotal += amt;
      freightTotal += fr;
      taxTotal += (amt + fr) * (gr / 100);
    });

    const intra = isIntraState(formData.supplier_state, formData.supplier_gstin);
    const rawTotal = Math.round((subtotal + freightTotal + taxTotal) * 100) / 100;
    const total = Math.round(rawTotal);
    return {
      intra,
      subtotal,
      freightTotal,
      cgst: intra ? taxTotal / 2 : 0,
      sgst: intra ? taxTotal / 2 : 0,
      igst: intra ? 0 : taxTotal,
      roundOff: Math.round((total - rawTotal) * 100) / 100,
      total,
    };
  }, [lineItems, formData.amount, formData.freight_charge, formData.gst_rate, formData.supplier_state, formData.supplier_gstin]);

  // Only needed in "all" mode: the server already applies this exact
  // search/vendor/branch filtering when paginated, so `purchases` there is
  // already the correct (current-page) result and this becomes a pass-through.
  const filterPurchasesClientSide = (rows: any[], q: string) => {
    const selectedIds = Array.isArray(vendorFilter) ? vendorFilter : (vendorFilter ? [vendorFilter] : []);
    const selectedVendors = vendors.filter((v) => selectedIds.includes(v._id));
    const selectedNames = selectedVendors.map((v) => (v.company_name || "").toLowerCase().trim()).filter(Boolean);
    const selectedNorms = selectedNames.map((name) => name.replace(/[^a-z0-9]/g, ""));
    const selectedGstins = selectedVendors.map((v) => (v.gst_number || "").toLowerCase().trim()).filter(Boolean);

    return rows.filter((p) => {
      const matchesSearch = !q ||
        p.bill_no?.toLowerCase().includes(q) ||
        p.supplier_name?.toLowerCase().includes(q) ||
        p.supplier_state?.toLowerCase().includes(q) ||
        p.supplier_gstin?.toLowerCase().includes(q) ||
        p.product?.toLowerCase().includes(q) ||
        p.hsn_code?.toLowerCase().includes(q) ||
        p.sales_person?.toLowerCase().includes(q) ||
        p.branch?.toLowerCase().includes(q) ||
        p.voucher_type?.toLowerCase().includes(q);

      let matchesVendor = selectedIds.length === 0;
      if (!matchesVendor) {
        const pVendorId = typeof p.vendor_id === "object" ? p.vendor_id?._id : p.vendor_id;
        const pSupplierName = (p.supplier_name || "").toLowerCase().trim();
        const pSupplierNorm = pSupplierName.replace(/[^a-z0-9]/g, "");
        const pSupplierGstin = (p.supplier_gstin || "").toLowerCase().trim();

        matchesVendor = Boolean(
          (pVendorId && selectedIds.includes(String(pVendorId))) ||
          (pSupplierGstin && selectedGstins.includes(pSupplierGstin)) ||
          (pSupplierName && selectedNames.includes(pSupplierName)) ||
          (pSupplierNorm && selectedNorms.some((norm) => pSupplierNorm.includes(norm) || norm.includes(pSupplierNorm)))
        );
      }

      const matchesBranch = branchFilter === "all" || p.branch === branchFilter;
      return matchesSearch && matchesVendor && matchesBranch;
    });
  };

  const filteredPurchases = useMemo(() => {
    if (itemsPerPage !== "all") return purchases;
    return filterPurchasesClientSide(purchases as any[], debouncedSearch.toLowerCase());
  }, [purchases, debouncedSearch, vendorFilter, branchFilter, vendors, itemsPerPage]);

  const totals: PurchaseTotals = useMemo(() => {
    if (itemsPerPage !== "all") return purchasesResult?.totals ?? ZERO_TOTALS;
    return filteredPurchases.reduce(
      (acc: PurchaseTotals, p: any) => {
        acc.amount += p.amount || 0;
        acc.cgst += p.cgst || 0;
        acc.sgst += p.sgst || 0;
        acc.igst += p.igst || 0;
        acc.total += p.total || 0;
        return acc;
      },
      { amount: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
    );
  }, [filteredPurchases, itemsPerPage, purchasesResult]);

  const money = (n: number | null | undefined, showZeroAsDash = true) => {
    if (n == null || isNaN(Number(n))) return "-";
    const val = Number(n);
    if (val === 0 && showZeroAsDash) return "-";
    return `${symbol}${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Pagination — in "all" mode `purchasesResult.total` is the raw unfiltered
  // fetch count, so the true total is however many survive client filtering.
  const totalItems = itemsPerPage === "all" ? filteredPurchases.length : (purchasesResult?.total ?? 0);
  const pageSize = itemsPerPage === "all" ? (totalItems || 1) : itemsPerPage;
  const totalPages = itemsPerPage === "all" ? 1 : (purchasesResult?.pages ?? 1);
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPurchases = filteredPurchases;

  // Export needs the full filtered set, not just the current page — fetched
  // on demand only when the user actually exports.
  const loadAllFilteredPurchases = async () => {
    const response = await purchaseService.getAll();
    const rows: any[] = Array.isArray(response) ? response : response?.data || [];
    return filterPurchasesClientSide(rows, debouncedSearch.toLowerCase());
  };

  // Selection (page-scoped select-all)
  const pageIds = paginatedPurchases.map((p: any) => p._id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id: string) => selectedIds.includes(id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      allPageSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]
    );
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) {
      toast({ title: "Error", description: "No purchase bills selected."});
      return;
    }
    setIsBulkLoading(true);
    try {
      if (bulkState.massDelete) {
        const { data } = await purchaseService.bulkDelete(selectedIds);
        toast({ title: "Success", description: data?.message || `Deleted ${selectedIds.length} purchase bills.` });
      } else {
        const updates: any = {};
        if (bulkState.payment_status) updates.payment_status = bulkState.payment_status;
        if (bulkState.payment_date) updates.payment_date = bulkState.payment_date;
        if (bulkState.paymentmode) updates.paymentmode = bulkState.paymentmode;
        if (Object.keys(updates).length === 0) {
          toast({ title: "Error", description: "Choose Mass Delete or at least one field to update.", variant: "destructive" });
          setIsBulkLoading(false);
          return;
        }
        await Promise.all(selectedIds.map((id) => purchaseService.update(id, updates)));
        toast({ title: "Success", description: `Updated ${selectedIds.length} purchase bills.` });
      }
      setSelectedIds([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false, payment_status: "", payment_date: "", paymentmode: "" });
      invalidate();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Export headers match Tally's Purchase Day Book column layout exactly
  // (Bill Date | Particulars | Voucher Type | Voucher No. | Quantity | Rate |
  // Amount | Total | PURCHASE GST | CGST 9% | SGST 9% | PURCHASE IGST |
  // FREIGHT 1% | IGST 18% | Round off). Column headers/order match what the
  // importer reads (see processPurchaseRows below) so an exported file can be
  // edited and re-imported without renaming columns. Amount/date columns are
  // typed "number"/"date" so Excel gets real numeric/date cells — not text —
  // and SUM/AutoFilter/date-sort work without a manual "convert to number" step.
  const exportColumns = useMemo(() => [
    { header: "Bill Date", key: "bill_date", type: "date" as const },
    { header: "Particulars", key: "supplier_name" },
    { header: "Voucher Type", key: "voucher_type" },
    { header: "Voucher No.", key: "bill_no" },
    ...(isPilot ? [{ header: "Sales Person", key: "sales_person" }] : []),
    { header: "Quantity", key: "quantity", type: "number" as const },
    { header: "Rate", key: "rate", type: "number" as const },
    { header: "Amount", key: "amount", type: "number" as const },
    { header: "Total", key: "total", type: "number" as const },
    { header: "PURCHASE GST", key: "amount", type: "number" as const },
    { header: "CGST 9%", key: "cgst", type: "number" as const },
    { header: "SGST 9%", key: "sgst", type: "number" as const },
    { header: "PURCHASE IGST", key: "igst", type: "number" as const },
    { header: "Freight", key: "freight_charge", type: "number" as const },
    { header: "IGST 18%", key: "igst", type: "number" as const },
    { header: "Round off", key: "round_off", type: "number" as const },
    ...(canUseBranch ? [{ header: "Branch Name", key: "branch" }] : []),
  ], [isPilot, canUseBranch]);

  const tableColSpan = 1 + (14 + 1 + (isPilot ? 1 : 0) + (canUseBranch ? 1 : 0)) + 1;

  const inputCls = "h-11 rounded-xl border-slate-200";
  const labelCls = "text-[10px] font-black uppercase tracking-widest text-slate-500";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Purchases</h1>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {can("Purchases", "Create") && (
              <ImportDialog
                title="Import Purchases"
                columns={PURCHASE_IMPORT_COLUMNS}
                onData={handlePurchaseImport}
                loading={importMutation.isPending}
                triggerLabel="Import Purchases"
                templateFilename="purchases_sample_import.xlsx"
                sheetName="Purchases"
                mappingNote="Your Excel columns (Bill Date, Particulars, Voucher No., Quantity, Rate, Amount, Total, CGST, SGST, Branch) will be automatically detected and mapped to purchases."
              />
            )}
            <ExportButton data={loadAllFilteredPurchases} filename="purchases" columns={exportColumns} />
            {can("Purchases", "Create") && (
              <Button
                onClick={() => { setEditingPurchase(null); setFormData(getNewPurchaseForm()); setIsModalOpen(true); }}
                className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
              >
                <Plus className="h-4 w-4" />
                New Purchase
              </Button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className={`grid grid-cols-2 gap-4 ${simplifiedRegister ? "md:grid-cols-2" : "md:grid-cols-5"}`}>
          {[
            { label: "Taxable Amount", value: totals.amount, color: "text-slate-800" },
            ...(simplifiedRegister ? [] : [
              { label: "CGST", value: totals.cgst, color: "text-blue-600" },
              { label: "SGST", value: totals.sgst, color: "text-blue-600" },
              { label: "IGST", value: totals.igst, color: "text-violet-600" },
            ]),
            { label: "Grand Total", value: totals.total, color: "text-green-600" },
          ].map((c) => (
            <Card key={c.label} className="rounded-2xl border-slate-100 shadow-sm">
              <CardContent className="p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.label}</div>
                <div className={`text-lg font-black mt-1 ${c.color}`}>{money(c.value, false)}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card className="rounded-lg shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {/* Toolbar: per-page, bulk actions, search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b bg-white">
              <div className="flex items-center gap-2">
                <Select
                  value={itemsPerPage === "all" ? "all" : itemsPerPage.toString()}
                  onValueChange={(v) => { setItemsPerPage(v === "all" ? "all" : parseInt(v)); setCurrentPage(1); }}
                >
                  <SelectTrigger className="w-[90px] h-9 text-xs font-bold bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs font-medium text-slate-400">per page</span>

                {(can("Purchases", "Edit") || can("Purchases", "Delete")) && (
                  <Dialog open={bulkActionOpen} onOpenChange={(open) => {
                    if (open && selectedIds.length === 0) {
                      toast({ title: "Error", description: "Please select at least one purchase bill first."});
                      return;
                    }
                    setBulkActionOpen(open);
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 px-4 rounded-lg gap-2 font-black uppercase text-[10px] tracking-widest bg-slate-50 border-slate-200 text-slate-700">
                        Bulk Actions{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Bulk Actions — {selectedIds.length} selected</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-5 pt-4">
                        {can("Purchases", "Delete") && (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="massDelete"
                              className="border-red-500 data-[state=checked]:bg-red-500"
                              checked={bulkState.massDelete}
                              onCheckedChange={(checked) => setBulkState({ ...bulkState, massDelete: checked as boolean })}
                            />
                            <Label htmlFor="massDelete" className="text-red-600 font-bold">Mass Delete</Label>
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-5 pt-5 border-t">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment Status</Label>
                            <Select value={bulkState.payment_status} onValueChange={(v) => setBulkState({ ...bulkState, payment_status: v })} disabled={bulkState.massDelete}>
                              <SelectTrigger className="h-10"><SelectValue placeholder="Select Status" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Unpaid">Unpaid</SelectItem>
                                <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                                <SelectItem value="Paid">Paid</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment Date</Label>
                            <Input
                              type="date"
                              className="h-10"
                              value={bulkState.payment_date}
                              onChange={(e) => setBulkState({ ...bulkState, payment_date: e.target.value })}
                              disabled={bulkState.massDelete}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment Method</Label>
                            <Input
                              placeholder="e.g. Bank Transfer, UPI, Cash"
                              className="h-10"
                              value={bulkState.paymentmode}
                              onChange={(e) => setBulkState({ ...bulkState, paymentmode: e.target.value })}
                              disabled={bulkState.massDelete}
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="mt-6 border-t pt-4">
                        <DialogClose asChild>
                          <Button variant="outline" className="font-bold uppercase tracking-wider text-xs">Close</Button>
                        </DialogClose>
                        <Button
                          className={`font-bold uppercase tracking-wider text-xs ${bulkState.massDelete ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-slate-800"} text-white`}
                          onClick={handleBulkAction}
                          disabled={isBulkLoading}
                        >
                          {isBulkLoading ? "Processing..." : bulkState.massDelete ? `Delete ${selectedIds.length} Bills` : "Confirm"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {vendorLinkageEnabled && (
                  <SearchableSelect
                    multiple
                    options={Array.from(
                      new Map(vendors.filter((v) => Boolean(v.company_name)).map((v) => [(v.company_name || "").trim().toLowerCase(), v])).values()
                    ).map((v) => ({ label: v.company_name, value: v._id }))}
                    value={vendorFilter}
                    onValueChange={(v) => { setVendorFilter(v); setCurrentPage(1); }}
                    placeholder="Filter by vendor"
                    className="h-9 w-full sm:w-[200px] text-sm bg-slate-50 border-slate-200"
                  />
                )}
                {canUseBranch && (
                  <Select value={branchFilter} onValueChange={(v) => { setBranchFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-9 w-full sm:w-[180px] text-sm bg-slate-50 border-slate-200">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((b: any) => (
                        <SelectItem key={b._id || b.id} value={b.name}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search bill, company, product, HSN, GSTIN..."
                    className="pl-9 h-9 w-full sm:w-[280px] text-sm bg-slate-50 border-slate-200 focus-visible:ring-primary/20"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox className="border-slate-300" checked={allPageSelected} onCheckedChange={toggleSelectAll} />
                    </TableHead>
                    {/* Fixed 15-column Tally-style Purchase Day Book layout — kept in sync
                        with exportColumns above; no simplifiedRegister toggle here anymore. */}
                    <TableHead>Bill Date</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead>Voucher Type</TableHead>
                    <TableHead>Voucher No.</TableHead>
                    {isPilot && <TableHead>Sales Person</TableHead>}
                    <TableHead>Quantity</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>PURCHASE GST</TableHead>
                    <TableHead>CGST 9%</TableHead>
                    <TableHead>SGST 9%</TableHead>
                    <TableHead>PURCHASE IGST</TableHead>
                    <TableHead>Freight</TableHead>
                    <TableHead>IGST 18%</TableHead>
                    <TableHead>Round off</TableHead>
                    {canUseBranch && <TableHead>Branch</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <SkeletonTableRows rows={6} colSpan={tableColSpan} />
                  ) : paginatedPurchases.length === 0 ? (
                    <TableEmpty colSpan={tableColSpan}>No purchase bills found. Create one or import from Excel.</TableEmpty>
                  ) : (
                    paginatedPurchases.map((p: any) => (
                      <TableRow key={p._id} className={`${selectedIds.includes(p._id) ? "bg-primary/5" : ""}`}>
                        <TableCell>
                          <Checkbox
                            className="border-slate-300"
                            checked={selectedIds.includes(p._id)}
                            onCheckedChange={() => toggleSelect(p._id)}
                          />
                        </TableCell>
                        {/* Fixed Tally-style Purchase Day Book layout — kept in sync with exportColumns above. */}
                        <TableCell>{p.bill_date ? formatDate(p.bill_date) : "-"}</TableCell>
                        <TableCell className="font-medium">{p.supplier_name || "-"}</TableCell>
                        <TableCell>{p.voucher_type || "-"}</TableCell>
                        <TableCell>{p.bill_no || "-"}</TableCell>
                        {isPilot && <TableCell>{p.sales_person || "-"}</TableCell>}
                        <TableCell>{p.quantity ?? "-"}</TableCell>
                        <TableCell>{money(p.rate)}</TableCell>
                        <TableCell>{money(p.amount)}</TableCell>
                        <TableCell className="font-semibold text-green-700">{money(p.total)}</TableCell>
                        {/* PURCHASE GST = taxable value (same as Amount) */}
                        <TableCell>{money(p.amount)}</TableCell>
                        {/* Zero tax cells show "-" instead of ₹0.00 */}
                        <TableCell>{money(p.cgst)}</TableCell>
                        <TableCell>{money(p.sgst)}</TableCell>
                        <TableCell>{money(p.igst)}</TableCell>
                        <TableCell>{money(p.freight_charge)}</TableCell>
                        <TableCell>{money(p.igst)}</TableCell>
                        <TableCell>{p.round_off ? money(p.round_off) : "-"}</TableCell>
                        {canUseBranch && <TableCell>{p.branch || "-"}</TableCell>}
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {can("Purchases", "Edit") && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleEdit(p)}>
                                <Pencil className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                            )}
                            {can("Purchases", "Delete") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500"
                                onClick={() => { if (window.confirm(`Delete bill ${p.bill_no}?`)) deleteMutation.mutate(p._id); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination footer */}
            {totalItems > 0 && (
              <div className="flex items-center border-t bg-muted/30">
                <TablePagination
                  className="flex-1 border-t-0"
                  page={safePage}
                  pageSize={pageSize}
                  total={totalItems}
                  onPageChange={(p) => setCurrentPage(Math.min(Math.max(p, 1), totalPages))}
                />
                {selectedIds.length > 0 && <span className="px-4 text-xs text-primary font-bold whitespace-nowrap">{selectedIds.length} selected</span>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add / Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) handleCloseModal(); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPurchase ? "Edit Purchase Bill" : "New Purchase Bill"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-2">

              {/* Branch Selection (Top of form, required for pilot) */}
              {canUseBranch && (
                <div className="space-y-1.5">
                  <Label className={labelCls}>* Branch</Label>
                  <Select value={formData.branch || "none"} onValueChange={(val) => setField("branch", val === "none" ? "" : val)}>
                    <SelectTrigger className={inputCls}>
                      <SelectValue placeholder="Select branch..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select Branch</SelectItem>
                      {branches.map((b: any) => (
                        <SelectItem key={b._id} value={b.name}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Supplier */}
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-primary mb-3">Supplier</div>
                {vendorLinkageEnabled ? (
                  <div className="space-y-1.5">
                    <Label className={labelCls}>* Vendor</Label>
                    <VendorSelect value={formData.vendor_id} onChange={handleVendorChange} />
                  </div>
                ) : simplifiedRegister ? (
                  <div className="space-y-1.5">
                    <Label className={labelCls}>* Particulars (Party Name)</Label>
                    <Input value={formData.supplier_name} onChange={(e) => setField("supplier_name", e.target.value)} placeholder="Supplier / party name" className={inputCls} />
                  </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className={labelCls}>* Company Name</Label>
                    <Input value={formData.supplier_name} onChange={(e) => setField("supplier_name", e.target.value)} placeholder="Supplier / company name" className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>GST Number</Label>
                    <Input value={formData.supplier_gstin} onChange={(e) => setField("supplier_gstin", e.target.value.toUpperCase())} placeholder="e.g. 24ABCDE1234F1Z5" className={`${inputCls} uppercase`} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Address with State</Label>
                    <Input value={formData.supplier_address} onChange={(e) => setField("supplier_address", e.target.value)} placeholder="Full address including state" className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>State (for GST/IGST)</Label>
                    <Select value={formData.supplier_state} onValueChange={(v) => setField("supplier_state", v)}>
                      <SelectTrigger className={`${inputCls} bg-white font-medium`}>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {INDIAN_STATES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                )}
              </div>

              {/* Bill */}
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-primary mb-3">Bill</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className={labelCls}>{simplifiedRegister ? "* Voucher No." : "* Bill Reference"}</Label>
                    <Input value={formData.bill_no} onChange={(e) => setField("bill_no", e.target.value)} placeholder={simplifiedRegister ? "e.g. 1648" : "e.g. PB-1024"} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Bill Date</Label>
                    <Input type="date" value={formData.bill_date} onChange={(e) => setField("bill_date", e.target.value)} className={inputCls} />
                  </div>
                  {simplifiedRegister ? (
                    <div className="space-y-1.5">
                      <Label className={labelCls}>Voucher Type</Label>
                      <Input value={formData.voucher_type} onChange={(e) => setField("voucher_type", e.target.value)} placeholder="e.g. Purchase" className={inputCls} />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label className={labelCls}>Due Date</Label>
                        <Input type="date" value={formData.due_date} onChange={(e) => setField("due_date", e.target.value)} className={inputCls} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className={labelCls}>Journal</Label>
                        <Input value={formData.journal} onChange={(e) => setField("journal", e.target.value)} placeholder="Journal entry / ledger" className={inputCls} />
                      </div>
                      {!canUseBranch && (
                        <div className="space-y-1.5">
                          <Label className={labelCls}>Branch</Label>
                          <Input value={formData.branch} onChange={(e) => setField("branch", e.target.value)} placeholder="e.g. Sparkling Techo Tools" className={inputCls} />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label className={labelCls}>Sales Person</Label>
                        {isPilot ? (
                          <Select value={formData.sales_person || "none"} onValueChange={(val) => setField("sales_person", val === "none" ? "" : val)}>
                            <SelectTrigger className={inputCls}>
                              <SelectValue placeholder="Select sales person..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {staff.map((s: any) => {
                                const fullName = `${s.firstname || ""} ${s.lastname || ""}`.trim() || s.name || s.email;
                                return (
                                  <SelectItem key={s._id || s.id} value={fullName}>
                                    {fullName}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input value={formData.sales_person} onChange={(e) => setField("sales_person", e.target.value)} placeholder="Supplier's sales person" className={inputCls} />
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Product & Amount */}
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-primary mb-3">Product & Amount</div>
                {(isPilot || !simplifiedRegister) && (
                  <div className="mb-4 space-y-1.5">
                    <Label className={labelCls}>Pick from catalog (optional)</Label>
                    <ItemSelect
                      value={formData.item_id}
                      onChange={handleItemChange}
                      placeholder="Search catalog items, or just type below..."
                    />
                  </div>
                )}
                {/* Fields read left-to-right, top-to-bottom in the order you'd fill
                    a bill by hand: what the item is, how much of it, what it costs,
                    what's added on top, then how it's taxed. */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label className={labelCls}>{simplifiedRegister ? "Particulars (Item)" : "1. Product"}</Label>
                    <Input value={formData.product} onChange={(e) => setField("product", e.target.value)} placeholder="Product / goods description" className={inputCls} />
                  </div>
                  {!simplifiedRegister && (
                    <div className="space-y-1.5">
                      <Label className={labelCls}>HSN/SAC Code</Label>
                      <Input value={formData.hsn_code} onChange={(e) => setField("hsn_code", e.target.value)} placeholder="e.g. 8471" className={inputCls} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className={labelCls}>2. Quantity</Label>
                    <Input type="number" value={formData.quantity} onChange={(e) => setQtyRate("quantity", e.target.value)} placeholder="1" className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>3. Rate</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{symbol}</span>
                      <Input type="number" value={formData.rate} onChange={(e) => setQtyRate("rate", e.target.value)} placeholder="0.00" className={`${inputCls} pl-7`} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>{simplifiedRegister ? "* Amount" : "4. Price (Qty × Rate)"}</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{symbol}</span>
                      <Input type="number" value={formData.amount} onChange={(e) => setField("amount", e.target.value)} placeholder="0.00" className={`${inputCls} pl-7`} />
                    </div>
                  </div>
                  {!simplifiedRegister && (
                    <div className="space-y-1.5">
                      <Label className={labelCls}>5. Freight %</Label>
                      <div className="relative">
                        <Input type="number" value={freightPercent} onChange={(e) => setFreightPercent(e.target.value)} placeholder="1" className={`${inputCls} pr-7`} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                      </div>
                      <p className="text-[10px] text-slate-400">= {symbol}{(Number(formData.freight_charge) || 0).toFixed(2)}</p>
                    </div>
                  )}
                  {!simplifiedRegister && (
                    <div className="space-y-1.5">
                      <Label className={labelCls}>6. GST Rate % → CGST/SGST</Label>
                      <Select value={formData.gst_rate} onValueChange={(v) => setField("gst_rate", v)}>
                        <SelectTrigger className={`${inputCls} bg-white font-medium`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GST_RATES.map((r) => (
                            <SelectItem key={r} value={r}>{r}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {!simplifiedRegister && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3">
                    <p className="text-[11px] text-slate-500">
                      {lineItems.length === 0
                        ? "Only one product on this bill? Just fill the fields above and hit Save Purchase below — no need to click Add."
                        : `${lineItems.length} item${lineItems.length > 1 ? "s" : ""} added so far. Fill the fields above for another product, or Save Purchase to finish.`}
                    </p>
                    <Button type="button" onClick={addLineItem} className="gap-2 font-bold shrink-0">
                      <Plus className="h-4 w-4" /> Add Another Product
                    </Button>
                  </div>
                )}

                {!simplifiedRegister && lineItems.length > 0 && (
                  <TableContainer className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>HSN</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Sub Total</TableHead>
                          <TableHead>Freight</TableHead>
                          <TableHead>GST %</TableHead>
                          <TableHead>Tax Amount</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.map((it) => {
                          const taxable = (Number(it.amount) || 0) + (Number(it.freight_charge) || 0);
                          const taxAmt = taxable * ((Number(it.gst_rate) || 0) / 100);
                          return (
                            <TableRow key={it.id}>
                              <TableCell>{it.product || "-"}</TableCell>
                              <TableCell>{it.hsn_code || "-"}</TableCell>
                              <TableCell>{it.quantity}</TableCell>
                              <TableCell>{money(it.rate)}</TableCell>
                              <TableCell>{money(it.amount)}</TableCell>
                              <TableCell>{money(it.freight_charge)}</TableCell>
                              <TableCell>{it.gst_rate}%</TableCell>
                              <TableCell>{money(taxAmt)}</TableCell>
                              <TableCell className="font-semibold">{money(taxable + taxAmt)}</TableCell>
                              <TableCell className="text-right">
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-50" onClick={() => removeLineItem(it.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </div>

              {/* Auto tax preview */}
              {simplifiedRegister ? (
                <div className="space-y-1.5">
                  <div className="rounded-xl border p-4 text-sm font-bold bg-slate-50 border-slate-200 text-slate-800">
                    <span>Total: {money(taxPreview.total)}</span>
                  </div>
                </div>
              ) : (
              <div className="space-y-1.5">
                <Label className={labelCls}>GST / IGST (Automatic)</Label>
                <div className={`rounded-xl border p-4 text-sm font-bold flex flex-wrap items-center gap-x-6 gap-y-1 ${taxPreview.intra ? "bg-blue-50/50 border-blue-200 text-blue-800" : "bg-violet-50/50 border-violet-200 text-violet-800"}`}>
                  {(lineItems.length > 0 || taxPreview.freightTotal > 0) && (
                    <>
                      <span>Sub Total: {money(taxPreview.subtotal)}</span>
                      {taxPreview.freightTotal > 0 && <span>Freight: {money(taxPreview.freightTotal)}</span>}
                    </>
                  )}
                  {taxPreview.intra ? (
                    <>
                      <span>Within Gujarat → GST</span>
                      <span>CGST: {money(taxPreview.cgst)}</span>
                      <span>SGST: {money(taxPreview.sgst)}</span>
                    </>
                  ) : (
                    <>
                      <span>Outside Gujarat → IGST</span>
                      <span>IGST: {money(taxPreview.igst)}</span>
                    </>
                  )}
                  <span className="text-slate-500">Round Off: {taxPreview.roundOff > 0 ? "+" : ""}{taxPreview.roundOff.toFixed(2)}</span>
                  <span className="ml-auto text-slate-800">Total: {money(taxPreview.total)}</span>
                </div>
              </div>
              )}

              {/* Payment */}
              {!simplifiedRegister && (
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-primary mb-3">Payment</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Payment Status</Label>
                    <Select value={formData.payment_status} onValueChange={(v) => setField("payment_status", v)}>
                      <SelectTrigger className={`${inputCls} bg-white font-medium`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Unpaid">Unpaid</SelectItem>
                        <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Payment Date</Label>
                    <Input type="date" value={formData.payment_date} onChange={(e) => setField("payment_date", e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Payment Method</Label>
                    <Input value={formData.paymentmode} onChange={(e) => setField("paymentmode", e.target.value)} placeholder="e.g. Bank Transfer, UPI, Cash" className={inputCls} />
                  </div>
                  <div className="space-y-1.5 md:col-span-3">
                    <Label className={labelCls}>Bank Details</Label>
                    <Input value={formData.bank_details} onChange={(e) => setField("bank_details", e.target.value)} placeholder="Bank name / account / IFSC" className={inputCls} />
                  </div>
                </div>
              </div>
              )}

              <div className="space-y-1.5">
                <Label className={labelCls}>Note</Label>
                <Textarea value={formData.note} onChange={(e) => setField("note", e.target.value)} placeholder="Optional note..." className="rounded-xl border-slate-200 resize-none min-h-[70px]" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={handleCloseModal} className="font-bold">Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="font-bold px-8"
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Purchase"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Purchases;

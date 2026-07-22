import { useState, useMemo } from "react";
import { useOpenCreateModal } from "@/hooks/useOpenCreateModal";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchaseService } from "@/api/services/purchase.service";
import { formatDate } from "@/lib/dateFormat";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { useCurrency } from "@/context/CurrencyContext";
import { ExportButton } from "@/components/ui/export-button";
import { ImportButton } from "@/components/ui/import-button";

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

// Mirrors the backend rule: GSTIN state code wins, otherwise the state name
const isIntraState = (state: string, gstin: string) => {
  const g = (gstin || "").trim();
  if (/^\d{2}/.test(g)) return g.substring(0, 2) === HOME_STATE_GST_CODE;
  return (state || "").trim().toLowerCase() === HOME_STATE.toLowerCase();
};

const emptyForm = {
  supplier_name: "",
  supplier_address: "",
  supplier_state: HOME_STATE,
  supplier_gstin: "",
  bill_no: "",
  bill_date: new Date().toISOString().split("T")[0],
  due_date: "",
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
  const { can } = usePermissions();
  const { symbol } = useCurrency();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<any>(null);
  const [formData, setFormData] = useState<any>(emptyForm);
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
  useOpenCreateModal(() => { setEditingPurchase(null); setFormData(emptyForm); setIsModalOpen(true); });

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: purchaseService.getAll,
  });

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

  // Matches the bill format headers: Company Name | Adress with State | GST number |
  // Bill date | Due date | Bill reference | Payment Method | Payment Date | Journal |
  // Bank details | Product | HSN/SAC code | Quantity | Rate | Price | Freight charge |
  // GST/IGST | Total | Round Off | Sales person
  // (GST/IGST, Total and Round Off are computed automatically — never read from the file.)
  const processPurchaseRows = (rows: any[]) => {
    const purchasesData = rows.map((row: any) => ({
      supplier_name: String(getField(row, "company name", "company", "supplier name", "supplier", "vendor", "party")),
      supplier_address: String(getField(row, "address with state", "adress with state", "address", "adress")),
      supplier_state: String(getField(row, "supplier state", "state", "place of supply")),
      supplier_gstin: String(getField(row, "gst number", "gstin", "gst no", "supplier gstin")),
      bill_date: getField(row, "bill date", "date", "invoice date"),
      due_date: getField(row, "due date"),
      bill_no: String(getField(row, "bill reference", "bill ref", "bill no", "billno", "bill number", "invoice no")),
      paymentmode: String(getField(row, "payment method", "payment mode", "mode")),
      payment_date: getField(row, "payment date", "paid date", "paid on"),
      journal: String(getField(row, "journal")),
      bank_details: String(getField(row, "bank details", "bank")),
      product: String(getField(row, "product", "item", "description of goods")),
      hsn_code: String(getField(row, "hsn/sac code", "hsn sac code", "hsn code", "hsn", "sac")),
      quantity: parseFloat(getField(row, "quantity", "qty")) || 0,
      rate: parseFloat(getField(row, "rate")) || 0,
      amount: parseFloat(getField(row, "price", "amount", "taxable value", "taxable amount")) || 0,
      freight_charge: parseFloat(getField(row, "freight charge", "freight", "shipping")) || 0,
      gst_rate: parseFloat(getField(row, "gst rate", "gst rate %", "tax rate", "gst %")) || 18,
      sales_person: String(getField(row, "sales person", "salesperson", "sales man")),
      note: String(getField(row, "note", "remarks")),
    }));

    const valid = purchasesData.filter(
      (p) => p.bill_no && p.supplier_name && (p.amount > 0 || (p.quantity > 0 && p.rate > 0))
    );
    if (valid.length === 0) {
      toast({
        title: "Error",
        description: "No valid rows found. The file needs 'Bill reference', 'Company Name' and 'Price' (or Quantity + Rate) columns.",
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate(valid as any);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPurchase(null);
    setFormData(emptyForm);
  };

  const handleEdit = (p: any) => {
    setEditingPurchase(p);
    setFormData({
      supplier_name: p.supplier_name || "",
      supplier_address: p.supplier_address || "",
      supplier_state: p.supplier_state || HOME_STATE,
      supplier_gstin: p.supplier_gstin || "",
      bill_no: p.bill_no || "",
      bill_date: toDateInput(p.bill_date),
      due_date: toDateInput(p.due_date),
      product: p.product || "",
      hsn_code: p.hsn_code || "",
      quantity: (p.quantity ?? 1).toString(),
      rate: (p.rate ?? 0) ? p.rate.toString() : "",
      amount: p.amount?.toString() || "",
      freight_charge: (p.freight_charge ?? 0) ? p.freight_charge.toString() : "",
      gst_rate: (p.gst_rate ?? 18).toString(),
      payment_status: p.payment_status || "Unpaid",
      payment_date: toDateInput(p.payment_date),
      paymentmode: p.paymentmode || "",
      journal: p.journal || "",
      bank_details: p.bank_details || "",
      sales_person: p.sales_person || "",
      note: p.note || "",
    });
    setIsModalOpen(true);
  };

  const setField = (field: string, value: any) =>
    setFormData((f: any) => ({ ...f, [field]: value }));

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

  const handleSave = () => {
    if (!formData.bill_no || !formData.supplier_name || !(parseFloat(formData.amount) > 0)) {
      toast({ title: "Error", description: "Bill Reference, Company Name and Price are required", variant: "destructive" });
      return;
    }
    const payload = {
      ...formData,
      quantity: parseFloat(formData.quantity) || 0,
      rate: parseFloat(formData.rate) || 0,
      amount: parseFloat(formData.amount) || 0,
      freight_charge: parseFloat(formData.freight_charge) || 0,
      gst_rate: parseFloat(formData.gst_rate) || 0,
      due_date: formData.due_date || null,
      payment_date: formData.payment_date || null,
    };
    if (editingPurchase) {
      updateMutation.mutate({ id: editingPurchase._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Live preview — mirrors the backend: taxable = price + freight, tax by state,
  // grand total rounded to the rupee with round-off shown.
  const taxPreview = useMemo(() => {
    const amount = parseFloat(formData.amount) || 0;
    const freight = parseFloat(formData.freight_charge) || 0;
    const rate = parseFloat(formData.gst_rate) || 0;
    const taxable = amount + freight;
    const tax = (taxable * rate) / 100;
    const intra = isIntraState(formData.supplier_state, formData.supplier_gstin);
    const rawTotal = Math.round((taxable + tax) * 100) / 100;
    const total = Math.round(rawTotal);
    return {
      intra,
      cgst: intra ? tax / 2 : 0,
      sgst: intra ? tax / 2 : 0,
      igst: intra ? 0 : tax,
      roundOff: Math.round((total - rawTotal) * 100) / 100,
      total,
    };
  }, [formData.amount, formData.freight_charge, formData.gst_rate, formData.supplier_state, formData.supplier_gstin]);

  const filteredPurchases = useMemo(() => {
    const q = search.toLowerCase();
    return (purchases as any[]).filter((p) =>
      !q ||
      p.bill_no?.toLowerCase().includes(q) ||
      p.supplier_name?.toLowerCase().includes(q) ||
      p.supplier_state?.toLowerCase().includes(q) ||
      p.supplier_gstin?.toLowerCase().includes(q) ||
      p.product?.toLowerCase().includes(q) ||
      p.hsn_code?.toLowerCase().includes(q) ||
      p.sales_person?.toLowerCase().includes(q)
    );
  }, [purchases, search]);

  const totals = useMemo(() => {
    return filteredPurchases.reduce(
      (acc: any, p: any) => {
        acc.amount += p.amount || 0;
        acc.cgst += p.cgst || 0;
        acc.sgst += p.sgst || 0;
        acc.igst += p.igst || 0;
        acc.total += p.total || 0;
        return acc;
      },
      { amount: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
    );
  }, [filteredPurchases]);

  const money = (n: number) => `${symbol}${(n || 0).toFixed(2)}`;

  // Pagination
  const totalItems = filteredPurchases.length;
  const pageSize = itemsPerPage === "all" ? (totalItems || 1) : itemsPerPage;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPurchases =
    itemsPerPage === "all"
      ? filteredPurchases
      : filteredPurchases.slice((safePage - 1) * pageSize, safePage * pageSize);

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
        await Promise.all(selectedIds.map((id) => purchaseService.delete(id)));
        toast({ title: "Success", description: `Deleted ${selectedIds.length} purchase bills.` });
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

  // Export headers match the company's bill format exactly
  const exportColumns = [
    { header: "Company Name", key: "supplier_name" },
    { header: "Address with State", key: "supplier_address" },
    { header: "GST Number", key: "supplier_gstin" },
    { header: "Bill Date", key: (p: any) => (p.bill_date ? formatDate(p.bill_date) : "") },
    { header: "Due Date", key: (p: any) => (p.due_date ? formatDate(p.due_date) : "") },
    { header: "Bill Reference", key: "bill_no" },
    { header: "Payment Method", key: "paymentmode" },
    { header: "Payment Date", key: (p: any) => (p.payment_date ? formatDate(p.payment_date) : "") },
    { header: "Journal", key: "journal" },
    { header: "Bank Details", key: "bank_details" },
    { header: "Product", key: "product" },
    { header: "HSN/SAC Code", key: "hsn_code" },
    { header: "Quantity", key: (p: any) => String(p.quantity ?? 0) },
    { header: "Rate", key: (p: any) => (p.rate || 0).toFixed(2) },
    { header: "Price", key: (p: any) => (p.amount || 0).toFixed(2) },
    { header: "Freight Charge", key: (p: any) => (p.freight_charge || 0).toFixed(2) },
    {
      header: "GST/IGST",
      key: (p: any) =>
        p.tax_type === "IGST"
          ? `IGST ${(p.igst || 0).toFixed(2)}`
          : `CGST ${(p.cgst || 0).toFixed(2)} + SGST ${(p.sgst || 0).toFixed(2)}`,
    },
    { header: "Total", key: (p: any) => (p.total || 0).toFixed(2) },
    { header: "Round Off", key: (p: any) => (p.round_off || 0).toFixed(2) },
    { header: "Sales Person", key: "sales_person" },
    { header: "Payment Status", key: "payment_status" },
  ];

  const inputCls = "h-11 rounded-xl border-slate-200";
  const labelCls = "text-[10px] font-black uppercase tracking-widest text-slate-500";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Purchases</h1>
          </div>
          <div className="flex gap-2 items-center">
            {can("Purchases", "Create") && (
              <ImportButton onData={processPurchaseRows} loading={importMutation.isPending} label="Import Purchases" />
            )}
            <ExportButton data={filteredPurchases} filename="purchases" columns={exportColumns} />
            {can("Purchases", "Create") && (
              <Button
                onClick={() => { setEditingPurchase(null); setFormData(emptyForm); setIsModalOpen(true); }}
                className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
              >
                <Plus className="h-4 w-4" />
                New Purchase
              </Button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Taxable Amount", value: totals.amount, color: "text-slate-800" },
            { label: "CGST", value: totals.cgst, color: "text-blue-600" },
            { label: "SGST", value: totals.sgst, color: "text-blue-600" },
            { label: "IGST", value: totals.igst, color: "text-violet-600" },
            { label: "Grand Total", value: totals.total, color: "text-green-600" },
          ].map((c) => (
            <Card key={c.label} className="rounded-2xl border-slate-100 shadow-sm">
              <CardContent className="p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.label}</div>
                <div className={`text-lg font-black mt-1 ${c.color}`}>{money(c.value)}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
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

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/50 text-left text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="p-4 font-bold w-12">
                      <Checkbox className="border-slate-300" checked={allPageSelected} onCheckedChange={toggleSelectAll} />
                    </th>
                    <th className="p-4 font-bold">Bill Ref</th>
                    <th className="p-4 font-bold">Bill / Due Date</th>
                    <th className="p-4 font-bold">Company</th>
                    <th className="p-4 font-bold">Product</th>
                    <th className="p-4 font-bold">Qty × Rate</th>
                    <th className="p-4 font-bold">Price</th>
                    <th className="p-4 font-bold">GST/IGST</th>
                    <th className="p-4 font-bold">Total</th>
                    <th className="p-4 font-bold">Payment</th>
                    <th className="p-4 font-bold">Sales Person</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={12} className="p-4"><Skeleton className="h-6 w-full" /></td>
                      </tr>
                    ))
                  ) : paginatedPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-10 text-center text-slate-400 font-medium">
                        No purchase bills found. Create one or import from Excel.
                      </td>
                    </tr>
                  ) : (
                    paginatedPurchases.map((p: any) => (
                      <tr key={p._id} className={`border-b hover:bg-slate-50/50 transition-colors ${selectedIds.includes(p._id) ? "bg-primary/5" : ""}`}>
                        <td className="p-4">
                          <Checkbox
                            className="border-slate-300"
                            checked={selectedIds.includes(p._id)}
                            onCheckedChange={() => toggleSelect(p._id)}
                          />
                        </td>
                        <td className="p-4 font-bold text-slate-800">{p.bill_no}</td>
                        <td className="p-4 text-xs font-medium text-slate-600">
                          <div>{p.bill_date ? formatDate(p.bill_date) : "-"}</div>
                          {p.due_date && <div className="text-[10px] text-orange-500 font-bold">Due {formatDate(p.due_date)}</div>}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{p.supplier_name}</div>
                          <div className="text-[10px] font-bold text-slate-400 tracking-wide">
                            {[p.supplier_gstin, p.supplier_state].filter(Boolean).join(" · ")}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-xs font-medium text-slate-700">{p.product || "-"}</div>
                          {p.hsn_code && <div className="text-[10px] font-bold text-slate-400">HSN {p.hsn_code}</div>}
                        </td>
                        <td className="p-4 text-xs font-medium text-slate-600">
                          {p.quantity ? `${p.quantity} × ${money(p.rate)}` : "-"}
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          {money(p.amount)}
                          {p.freight_charge > 0 && (
                            <div className="text-[10px] font-bold text-slate-400">+ freight {money(p.freight_charge)}</div>
                          )}
                        </td>
                        <td className="p-4">
                          {p.tax_type === "IGST" ? (
                            <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 font-bold text-[10px]">
                              IGST {money(p.igst)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[10px]">
                              CGST {money(p.cgst)} + SGST {money(p.sgst)}
                            </Badge>
                          )}
                          <div className="text-[10px] font-bold text-slate-400 mt-1">@ {p.gst_rate || 0}%</div>
                        </td>
                        <td className="p-4 font-black text-green-700">
                          {money(p.total)}
                          {p.round_off !== 0 && p.round_off != null && (
                            <div className="text-[10px] font-bold text-slate-400">r/o {p.round_off > 0 ? "+" : ""}{p.round_off.toFixed(2)}</div>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge
                            variant="outline"
                            className={`font-bold text-[10px] ${p.payment_status === "Paid"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : p.payment_status === "Partially Paid"
                                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                : "bg-red-50 text-red-700 border-red-200"}`}
                          >
                            {p.payment_status || "Unpaid"}
                          </Badge>
                          {p.payment_date && (
                            <div className="text-[10px] font-bold text-slate-400 mt-1">{formatDate(p.payment_date)}</div>
                          )}
                          {p.paymentmode && (
                            <div className="text-[10px] font-medium text-slate-400">{p.paymentmode}</div>
                          )}
                        </td>
                        <td className="p-4 text-xs font-medium text-slate-600">{p.sales_person || "-"}</td>
                        <td className="p-4">
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
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t bg-white">
                <div className="text-xs font-medium text-slate-500">
                  Showing {itemsPerPage === "all" ? 1 : (safePage - 1) * pageSize + 1} to {itemsPerPage === "all" ? totalItems : Math.min(safePage * pageSize, totalItems)} of {totalItems} entries
                  {selectedIds.length > 0 && <span className="ml-2 text-primary font-bold">· {selectedIds.length} selected</span>}
                </div>
                {itemsPerPage !== "all" && totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs font-bold"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={safePage === 1}
                    >
                      Previous
                    </Button>
                    <Button variant="default" size="sm" className="h-8 w-8 p-0 text-xs font-bold bg-primary text-primary-foreground">
                      {safePage}
                    </Button>
                    <span className="text-xs text-slate-400 px-1">of {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs font-bold"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={safePage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
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

              {/* Supplier */}
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-primary mb-3">Supplier</div>
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
              </div>

              {/* Bill */}
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-primary mb-3">Bill</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className={labelCls}>* Bill Reference</Label>
                    <Input value={formData.bill_no} onChange={(e) => setField("bill_no", e.target.value)} placeholder="e.g. PB-1024" className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Bill Date</Label>
                    <Input type="date" value={formData.bill_date} onChange={(e) => setField("bill_date", e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Due Date</Label>
                    <Input type="date" value={formData.due_date} onChange={(e) => setField("due_date", e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Journal</Label>
                    <Input value={formData.journal} onChange={(e) => setField("journal", e.target.value)} placeholder="Journal entry / ledger" className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Sales Person</Label>
                    <Input value={formData.sales_person} onChange={(e) => setField("sales_person", e.target.value)} placeholder="Supplier's sales person" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Product & Amount */}
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-primary mb-3">Product & Amount</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label className={labelCls}>Product</Label>
                    <Input value={formData.product} onChange={(e) => setField("product", e.target.value)} placeholder="Product / goods description" className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>HSN/SAC Code</Label>
                    <Input value={formData.hsn_code} onChange={(e) => setField("hsn_code", e.target.value)} placeholder="e.g. 8471" className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>GST Rate %</Label>
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
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Quantity</Label>
                    <Input type="number" value={formData.quantity} onChange={(e) => setQtyRate("quantity", e.target.value)} placeholder="1" className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Rate</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{symbol}</span>
                      <Input type="number" value={formData.rate} onChange={(e) => setQtyRate("rate", e.target.value)} placeholder="0.00" className={`${inputCls} pl-7`} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>* Price (Qty × Rate)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{symbol}</span>
                      <Input type="number" value={formData.amount} onChange={(e) => setField("amount", e.target.value)} placeholder="0.00" className={`${inputCls} pl-7`} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Freight Charge</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{symbol}</span>
                      <Input type="number" value={formData.freight_charge} onChange={(e) => setField("freight_charge", e.target.value)} placeholder="0.00" className={`${inputCls} pl-7`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto tax preview */}
              <div className="space-y-1.5">
                <Label className={labelCls}>GST / IGST (Automatic)</Label>
                <div className={`rounded-xl border p-4 text-sm font-bold flex flex-wrap items-center gap-x-6 gap-y-1 ${taxPreview.intra ? "bg-blue-50/50 border-blue-200 text-blue-800" : "bg-violet-50/50 border-violet-200 text-violet-800"}`}>
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

              {/* Payment */}
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

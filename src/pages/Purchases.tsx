import { useState, useMemo } from "react";
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
} from "@/components/ui/dialog";
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
  bill_no: "",
  bill_date: new Date().toISOString().split("T")[0],
  supplier_name: "",
  supplier_state: HOME_STATE,
  supplier_gstin: "",
  amount: "",
  gst_rate: "18",
  payment_status: "Unpaid",
  payment_date: "",
  paymentmode: "",
  note: "",
};

const Purchases = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { symbol } = useCurrency();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<any>(null);
  const [formData, setFormData] = useState<any>(emptyForm);

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

  const processPurchaseRows = (rows: any[]) => {
    const purchasesData = rows.map((row: any) => ({
      bill_no: String(getField(row, "bill no", "billno", "bill number", "invoice no")),
      bill_date: getField(row, "bill date", "date", "invoice date"),
      supplier_name: String(getField(row, "supplier name", "supplier", "vendor", "party")),
      supplier_state: String(getField(row, "supplier state", "state", "place of supply")) || HOME_STATE,
      supplier_gstin: String(getField(row, "gstin", "gst no", "gst number", "supplier gstin")),
      amount: parseFloat(getField(row, "amount", "taxable value", "taxable amount")) || 0,
      gst_rate: parseFloat(getField(row, "gst rate", "gst rate %", "tax rate", "gst %")) || 0,
      payment_date: getField(row, "payment date", "paid date", "paid on"),
      paymentmode: String(getField(row, "payment mode", "mode")),
      note: String(getField(row, "note", "remarks", "description")),
    }));

    const valid = purchasesData.filter((p) => p.bill_no && p.supplier_name && p.amount > 0);
    if (valid.length === 0) {
      toast({
        title: "Error",
        description: "No valid rows found. The file needs 'Bill No', 'Supplier Name' and 'Amount' columns.",
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
      bill_no: p.bill_no || "",
      bill_date: p.bill_date ? new Date(p.bill_date).toISOString().split("T")[0] : "",
      supplier_name: p.supplier_name || "",
      supplier_state: p.supplier_state || HOME_STATE,
      supplier_gstin: p.supplier_gstin || "",
      amount: p.amount?.toString() || "",
      gst_rate: (p.gst_rate ?? 18).toString(),
      payment_status: p.payment_status || "Unpaid",
      payment_date: p.payment_date ? new Date(p.payment_date).toISOString().split("T")[0] : "",
      paymentmode: p.paymentmode || "",
      note: p.note || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.bill_no || !formData.supplier_name || !formData.amount) {
      toast({ title: "Error", description: "Bill No, Supplier Name and Amount are required", variant: "destructive" });
      return;
    }
    const payload = {
      ...formData,
      amount: parseFloat(formData.amount) || 0,
      gst_rate: parseFloat(formData.gst_rate) || 0,
      payment_date: formData.payment_date || null,
    };
    if (editingPurchase) {
      updateMutation.mutate({ id: editingPurchase._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Live tax preview inside the form — same rule the backend applies on save
  const taxPreview = useMemo(() => {
    const amount = parseFloat(formData.amount) || 0;
    const rate = parseFloat(formData.gst_rate) || 0;
    const tax = (amount * rate) / 100;
    const intra = isIntraState(formData.supplier_state, formData.supplier_gstin);
    return {
      intra,
      cgst: intra ? tax / 2 : 0,
      sgst: intra ? tax / 2 : 0,
      igst: intra ? 0 : tax,
      total: amount + tax,
    };
  }, [formData.amount, formData.gst_rate, formData.supplier_state, formData.supplier_gstin]);

  const filteredPurchases = useMemo(() => {
    const q = search.toLowerCase();
    return (purchases as any[]).filter((p) =>
      !q ||
      p.bill_no?.toLowerCase().includes(q) ||
      p.supplier_name?.toLowerCase().includes(q) ||
      p.supplier_state?.toLowerCase().includes(q) ||
      p.supplier_gstin?.toLowerCase().includes(q)
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

  const exportColumns = [
    { header: "Bill No", key: "bill_no" },
    { header: "Bill Date", key: (p: any) => (p.bill_date ? formatDate(p.bill_date) : "") },
    { header: "Supplier Name", key: "supplier_name" },
    { header: "Supplier State", key: "supplier_state" },
    { header: "GSTIN", key: "supplier_gstin" },
    { header: "Amount", key: (p: any) => (p.amount || 0).toFixed(2) },
    { header: "GST Rate %", key: (p: any) => String(p.gst_rate ?? 0) },
    { header: "Tax Type", key: "tax_type" },
    { header: "CGST", key: (p: any) => (p.cgst || 0).toFixed(2) },
    { header: "SGST", key: (p: any) => (p.sgst || 0).toFixed(2) },
    { header: "IGST", key: (p: any) => (p.igst || 0).toFixed(2) },
    { header: "Total", key: (p: any) => (p.total || 0).toFixed(2) },
    { header: "Payment Status", key: "payment_status" },
    { header: "Payment Date", key: (p: any) => (p.payment_date ? formatDate(p.payment_date) : "") },
    { header: "Payment Mode", key: "paymentmode" },
    { header: "Note", key: "note" },
  ];

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

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search bill no, supplier, state, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-xl border-slate-200"
          />
        </div>

        {/* Table */}
        <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/50 text-left text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="p-4 font-bold">Bill No</th>
                    <th className="p-4 font-bold">Bill Date</th>
                    <th className="p-4 font-bold">Supplier</th>
                    <th className="p-4 font-bold">State</th>
                    <th className="p-4 font-bold">Amount</th>
                    <th className="p-4 font-bold">Tax</th>
                    <th className="p-4 font-bold">Total</th>
                    <th className="p-4 font-bold">Payment</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={9} className="p-4"><Skeleton className="h-6 w-full" /></td>
                      </tr>
                    ))
                  ) : filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-400 font-medium">
                        No purchase bills found. Create one or import from Excel.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((p: any) => (
                      <tr key={p._id} className="border-b hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{p.bill_no}</td>
                        <td className="p-4 text-xs font-medium text-slate-600">{p.bill_date ? formatDate(p.bill_date) : "-"}</td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{p.supplier_name}</div>
                          {p.supplier_gstin && <div className="text-[10px] font-bold text-slate-400 tracking-wide">{p.supplier_gstin}</div>}
                        </td>
                        <td className="p-4 text-xs font-medium text-slate-600">{p.supplier_state || "-"}</td>
                        <td className="p-4 font-bold text-slate-800">{money(p.amount)}</td>
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
                        <td className="p-4 font-black text-green-700">{money(p.total)}</td>
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
                        </td>
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
          </CardContent>
        </Card>

        {/* Add / Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) handleCloseModal(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPurchase ? "Edit Purchase Bill" : "New Purchase Bill"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">* Bill No</Label>
                <Input
                  value={formData.bill_no}
                  onChange={(e) => setFormData((f: any) => ({ ...f, bill_no: e.target.value }))}
                  placeholder="e.g. PB-1024"
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bill Date</Label>
                <Input
                  type="date"
                  value={formData.bill_date}
                  onChange={(e) => setFormData((f: any) => ({ ...f, bill_date: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">* Supplier Name</Label>
                <Input
                  value={formData.supplier_name}
                  onChange={(e) => setFormData((f: any) => ({ ...f, supplier_name: e.target.value }))}
                  placeholder="Supplier / vendor name"
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Supplier State</Label>
                <Select
                  value={formData.supplier_state}
                  onValueChange={(v) => setFormData((f: any) => ({ ...f, supplier_state: v }))}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white font-medium">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Supplier GSTIN</Label>
                <Input
                  value={formData.supplier_gstin}
                  onChange={(e) => setFormData((f: any) => ({ ...f, supplier_gstin: e.target.value.toUpperCase() }))}
                  placeholder="e.g. 24ABCDE1234F1Z5"
                  className="h-11 rounded-xl border-slate-200 uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">* Amount (Taxable Value)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{symbol}</span>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData((f: any) => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="h-11 rounded-xl border-slate-200 pl-7"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">GST Rate %</Label>
                <Select
                  value={formData.gst_rate}
                  onValueChange={(v) => setFormData((f: any) => ({ ...f, gst_rate: v }))}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GST_RATES.map((r) => (
                      <SelectItem key={r} value={r}>{r}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Auto GST/IGST preview — read-only, decided by supplier state / GSTIN */}
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tax (Automatic)</Label>
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
                  <span className="ml-auto text-slate-800">Total: {money(taxPreview.total)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payment Status</Label>
                <Select
                  value={formData.payment_status}
                  onValueChange={(v) => setFormData((f: any) => ({ ...f, payment_status: v }))}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white font-medium">
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
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payment Date</Label>
                <Input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData((f: any) => ({ ...f, payment_date: e.target.value }))}
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payment Mode</Label>
                <Input
                  value={formData.paymentmode}
                  onChange={(e) => setFormData((f: any) => ({ ...f, paymentmode: e.target.value }))}
                  placeholder="e.g. Bank Transfer, UPI, Cash"
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Note</Label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => setFormData((f: any) => ({ ...f, note: e.target.value }))}
                  placeholder="Optional note..."
                  className="rounded-xl border-slate-200 resize-none min-h-[80px]"
                />
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

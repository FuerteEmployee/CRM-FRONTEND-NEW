import { useState, useMemo, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Download,
  FileText,
  Printer,
  Eye,
  CreditCard,
  Zap,
  Mail,
  Trash2,
  ChevronDown,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient, useMutation, keepPreviousData } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
import { financeService } from "@/api/services/finance.service";
import { customerService } from "@/api/services/customer.service";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { SkeletonTableRows } from "@/components/ui/skeleton-table-rows";
import { usePermissions } from "@/hooks/usePermissions";
import { useCurrency } from "@/context/CurrencyContext";
import { ExportButton } from "@/components/ui/export-button";
import { ImportButton } from "@/components/ui/import-button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { isTrinetraPilotUser } from "@/lib/trinetraPilot";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const Payments = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewItem, setViewItem] = useState<any>(null);
  const [viewTab, setViewTab] = useState<"receipt" | "payment">("receipt");
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: "", paymentmode: "", paymentmethod: "", transactionid: "", note: "", companyName: "", voucherNumber: "", billDate: "", journal: "" });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { toast } = useToast();
  const { can, user, isModuleEnabled } = usePermissions();
  const { symbol } = useCurrency();
  const queryClient = useQueryClient();

  // "New Payment" (a standalone, non-invoice payment entry with a Branch
  // field) is a Trinetra-pilot-only feature, same gating as Branch on
  // Invoices/Purchases/Projects — not available for other tenants.
  const isPilot = isTrinetraPilotUser(user?.email);
  const canUseBranch = isPilot && isModuleEnabled("hrms");

  // Branch list (HRMS branch master) — the first field in New Payment, so
  // the customer dropdown below it can be server-filtered down to just that
  // branch's customers instead of showing the whole tenant's list.
  const { data: hrmsBranches = [] } = useQuery<any[]>({
    queryKey: ["hrms-branches-list"],
    queryFn: () => hrmsbranchService.getAll().then((r: any) => r.data || []),
    enabled: isPilot,
    staleTime: 5 * 60 * 1000,
  });

  const [isNewPaymentOpen, setIsNewPaymentOpen] = useState(false);
  const emptyNewPaymentForm = {
    branchId: "", branch: "", client: "", companyName: "", invoice: "", voucherNumber: "", amount: "", date: "",
    billDate: "", paymentmode: "", journal: "", paymentmethod: "", transactionid: "", note: "",
  };
  const [newPaymentForm, setNewPaymentForm] = useState(emptyNewPaymentForm);

  // Customers for the selected branch only — a real server-side filter
  // (GET /clients?branch=<id>), not a client-side filter over every
  // customer, so this stays fast as the customer list grows.
  const { data: branchClients = [] } = useQuery<any[]>({
    queryKey: ["customers-by-branch", newPaymentForm.branchId],
    queryFn: () =>
      customerService
        .getAll({ branch: newPaymentForm.branchId, limit: 500 })
        .then((r: any) => (Array.isArray(r) ? r : r?.data || [])),
    enabled: isPilot && !!newPaymentForm.branchId,
  });

  // That customer's invoices — also a real server fetch (GET /invoices?client=<id>),
  // so the payment can be tied to a real invoice instead of only a free-text
  // voucher. Linking an invoice here is what makes the invoice's paid/
  // partially-paid/unpaid status recompute automatically once the payment
  // is saved (handled server-side in InvoiceService.updateStatus).
  const { data: clientInvoices = [] } = useQuery<any[]>({
    queryKey: ["invoices-by-client", newPaymentForm.client],
    queryFn: () =>
      salesService.getInvoices({ client: newPaymentForm.client }).then((r: any) => (Array.isArray(r) ? r : r?.data || [])),
    enabled: isPilot && !!newPaymentForm.client,
  });

  const handleSelectBranch = (branchId: string) => {
    const branch = hrmsBranches.find((b: any) => b._id === branchId);
    setNewPaymentForm(() => ({
      ...emptyNewPaymentForm,
      branchId,
      branch: branch?.name || "",
    }));
  };

  const handleSelectPaymentClient = (clientId: string) => {
    const client = branchClients.find((c: any) => c._id === clientId);
    setNewPaymentForm((p) => ({
      ...p,
      client: clientId,
      companyName: client?.company || p.companyName,
      invoice: "",
      voucherNumber: "",
    }));
  };

  const handleSelectPaymentInvoice = (invoiceId: string) => {
    const invoice = clientInvoices.find((i: any) => i._id === invoiceId);
    setNewPaymentForm((p) => ({
      ...p,
      invoice: invoiceId,
      voucherNumber: invoice?.number || p.voucherNumber,
    }));
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => salesService.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      if (newPaymentForm.invoice) queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Payment Recorded",
        description: newPaymentForm.invoice
          ? "Payment added — the invoice's paid status has been recalculated."
          : "New payment has been added.",
        className: "bg-green-600 text-white font-bold rounded-2xl",
      });
      setIsNewPaymentOpen(false);
      setNewPaymentForm(emptyNewPaymentForm);
    },
    onError: (err: any) => toast({ title: "Error", description: err?.response?.data?.message || err.message || "Failed to record payment.", variant: "destructive" }),
  });

  const handleCreatePayment = () => {
    const amount = Number(newPaymentForm.amount);
    if (!amount || amount <= 0) {
      toast({ title: "Validation Error", description: "Enter a valid amount received.", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      client: newPaymentForm.client || undefined,
      invoice: newPaymentForm.invoice || undefined,
      companyName: newPaymentForm.companyName,
      branch: newPaymentForm.branch,
      voucherNumber: newPaymentForm.voucherNumber,
      amount,
      date: newPaymentForm.date,
      billDate: newPaymentForm.billDate,
      paymentmode: newPaymentForm.paymentmode,
      journal: newPaymentForm.journal,
      paymentmethod: newPaymentForm.paymentmethod,
      transactionid: newPaymentForm.transactionid,
      note: newPaymentForm.note,
    });
  };
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({ massDelete: false });
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = (items: any[]) => {
    const pageIds = items.map(i => i._id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
    setSelectedIds(prev => allSelected ? prev.filter(id => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]);
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) {
      toast({ title: "Error", description: "No items selected."});
      return;
    }
    setIsBulkLoading(true);
    try {
      if (bulkState.massDelete) {
        await salesService.bulkDeletePayments(selectedIds);
        toast({ title: "Success", description: `Deleted ${selectedIds.length} items.` });
      }
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setSelectedIds([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false });
    } catch {
      toast({ title: "Error", description: "Failed to perform bulk action."});
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Paginated server-side once a finite page size is chosen; "All" keeps
  // the legacy full fetch, filtered client-side exactly as this page always has.
  interface PaymentsPage { rows: any[]; total: number; pages: number; totalAmount: number }
  const { data: paymentsResult, isLoading } = useQuery<PaymentsPage>({
    queryKey: ["payments", itemsPerPage, currentPage, debouncedSearch],
    queryFn: async () => {
      const matchesSearch = (p: any, q: string) =>
        !q ||
        (p._id || "").toLowerCase().includes(q) ||
        (p.invoice?.number || "").toLowerCase().includes(q) ||
        (p.invoice?.client?.company || "").toLowerCase().includes(q) ||
        (p.transactionid || "").toLowerCase().includes(q) ||
        (p.paymentmode || "").toLowerCase().includes(q) ||
        (p.companyName || "").toLowerCase().includes(q) ||
        (p.voucherNumber || "").toLowerCase().includes(q) ||
        (p.journal || "").toLowerCase().includes(q);

      if (itemsPerPage === "All") {
        const response = await salesService.getPayments();
        const rows: any[] = Array.isArray(response) ? response : response?.data || [];
        // "Total Received" always reflects the whole tenant, before the
        // search filter — matches the paginated path's server-side sum.
        const totalAmount = rows.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const q = debouncedSearch.toLowerCase();
        const rowsFiltered = rows.filter((p: any) => matchesSearch(p, q));
        return { rows: rowsFiltered, total: rowsFiltered.length, pages: 1, totalAmount };
      }

      const res: any = await salesService.getPayments({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch || undefined,
      });
      if (Array.isArray(res)) return { rows: [], total: 0, pages: 1, totalAmount: 0 };
      return { rows: res?.data ?? [], total: res?.total ?? 0, pages: res?.pages ?? 1, totalAmount: res?.totalAmount ?? 0 };
    },
    placeholderData: keepPreviousData,
  });
  const payments: any[] = paymentsResult?.rows ?? [];

  const { data: paymentModes = [] } = useQuery<any[]>({
    queryKey: ["payment-modes"],
    queryFn: () => financeService.getPaymentModes().then((res: any) => res.data || res),
  });

  const openView = (p: any) => {
    setViewItem(p);
    setViewTab("receipt");
    setPaymentForm({
      amount: String(p.amount ?? ""),
      date: p.date ? new Date(p.date).toISOString().split("T")[0] : "",
      paymentmode: p.paymentmode || "",
      paymentmethod: p.paymentmethod || "",
      transactionid: p.transactionid || "",
      note: p.note || "",
      companyName: p.companyName || "",
      voucherNumber: p.voucherNumber || "",
      billDate: p.billDate ? new Date(p.billDate).toISOString().split("T")[0] : "",
      journal: p.journal || "",
    });
  };

  const updateMutation = useMutation({
    mutationFn: (data: any) => salesService.updatePayment(viewItem._id, data),
    onSuccess: (updated: any) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      const merged = { ...viewItem, ...(updated?.data || updated) };
      setViewItem(merged);
      setViewTab("receipt");
      toast({ title: "Payment Updated", description: "Invoice status recalculated based on the new amount.", className: "bg-green-600 text-white font-bold rounded-2xl" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to update payment.", variant: "destructive" }),
  });

  const deleteOneMutation = useMutation({
    mutationFn: (id: string) => salesService.deletePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "Deleted", description: "Payment deleted successfully.", className: "bg-green-600 text-white font-bold rounded-2xl" });
      setViewItem(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to delete payment.", variant: "destructive" }),
  });

  const handleSavePayment = () => {
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      toast({ title: "Validation Error", description: "Enter a valid amount received.", variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      amount,
      date: paymentForm.date,
      paymentmode: paymentForm.paymentmode,
      paymentmethod: paymentForm.paymentmethod,
      transactionid: paymentForm.transactionid,
      note: paymentForm.note,
      companyName: paymentForm.companyName,
      voucherNumber: paymentForm.voucherNumber,
      billDate: paymentForm.billDate,
      journal: paymentForm.journal,
    });
  };

  const importMutation = useMutation({
    mutationFn: (rows: any[]) => salesService.importPayments(rows),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      const count = data?.data?.count ?? data?.count ?? 0;
      const skipped = data?.data?.skipped ?? data?.skipped ?? 0;
      toast({ title: count === 0 ? "No New Payments" : "Import Successful", description: count === 0 ? "All payments already exist." : `Imported ${count} payment(s)${skipped ? `, skipped ${skipped} duplicate(s)` : ""}.`, variant: count === 0 ? "destructive" : "default" });
    },
    onError: (err: any) => toast({ title: "Import Failed", description: err?.response?.data?.message || err.message, variant: "destructive" }),
  });

  const handleImportData = (rows: Record<string, any>[]) => {
    // Accept any row that has at least one meaningful payment field
    const valid = rows.filter(r =>
      r["Amount"] || r["amount"] ||
      r["Company Name"] || r["companyName"] ||
      r["Voucher Number"] || r["voucherNumber"] ||
      r["Invoice #"] || r["invoice"] ||
      r["Transaction ID"] || r["transactionid"]
    );
    if (!valid.length) { toast({ title: "No valid rows", description: "File must have at least an 'Amount', 'Company Name', or 'Voucher Number' column.", variant: "destructive" }); return; }
    importMutation.mutate(valid as any);
  };

  const totalPayments = paymentsResult?.total ?? 0;
  const paymentPageSize = itemsPerPage === "All" ? (totalPayments || 1) : parseInt(itemsPerPage);
  const totalPaymentPages = paymentsResult?.pages ?? 1;
  const safePaymentPage = Math.min(currentPage, totalPaymentPages);
  const paginatedPayments = payments;

  // Always the whole tenant's total, independent of the active search —
  // computed server-side since only the current page is kept in memory.
  const totalReceived = paymentsResult?.totalAmount ?? 0;

  // Export needs the full filtered set, not just the current page — fetched
  // on demand only when the user actually exports.
  const loadAllFilteredPayments = async () => {
    const response = await salesService.getPayments();
    const rows: any[] = Array.isArray(response) ? response : response?.data || [];
    const q = debouncedSearch.toLowerCase();
    return rows.filter((p: any) =>
      !q ||
      (p._id || "").toLowerCase().includes(q) ||
      (p.invoice?.number || "").toLowerCase().includes(q) ||
      (p.invoice?.client?.company || "").toLowerCase().includes(q) ||
      (p.transactionid || "").toLowerCase().includes(q) ||
      (p.paymentmode || "").toLowerCase().includes(q) ||
      (p.companyName || "").toLowerCase().includes(q) ||
      (p.voucherNumber || "").toLowerCase().includes(q) ||
      (p.journal || "").toLowerCase().includes(q)
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8 animate-in fade-in duration-500">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Payments</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Track all incoming client payments
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-emerald-100 bg-emerald-50/30 rounded-2xl overflow-hidden shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">
                  Total Received
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-black text-slate-900">
                    ₹{totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-blue-100 bg-blue-50/30 rounded-2xl overflow-hidden shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600">
                  Total Transactions
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-black text-slate-900">
                    {payments.length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={itemsPerPage} onValueChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 w-[80px] bg-background border-none shadow-sm rounded-lg text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["10", "25", "50", "100", "All"].map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={bulkActionOpen} onOpenChange={(open) => {
              if (open && selectedIds.length === 0) {
                toast({ title: "Error", description: "Please select at least one item first."});
                return;
              }
              setBulkActionOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-11 px-6 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest bg-slate-50 border-slate-200 text-slate-700">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  Bulk Actions
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Bulk Actions</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mass_delete"
                      className="border-red-200 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                      checked={bulkState.massDelete}
                      onCheckedChange={(checked) => setBulkState({...bulkState, massDelete: checked as boolean})}
                    />
                    <Label htmlFor="mass_delete" className="text-sm font-semibold text-red-600">Mass Delete</Label>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="ghost" onClick={() => setBulkActionOpen(false)} className="font-bold uppercase tracking-widest text-[10px]">Close</Button>
                  <Button onClick={handleBulkAction} disabled={isBulkLoading} className="font-bold uppercase tracking-widest text-[10px]">
                    {isBulkLoading ? "Processing..." : "Confirm"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <ExportButton
              data={loadAllFilteredPayments}
              filename="payments"
              columns={[
                { header: "Company Name", key: (p) => p.companyName || p.invoice?.client?.company || "-" },
                { header: "Voucher Number", key: (p) => p.voucherNumber || "-" },
                { header: "Bill Date", key: "billDate", type: "date" },
                { header: "Payment Mode", key: (p) => p.paymentmode || "Bank Transfer" },
                { header: "Journal", key: (p) => p.journal || "-" },
                { header: "Amount", key: "amount", type: "number" },
                { header: "Transaction ID", key: (p) => p.transactionid || "-" },
              ]}
            />
            <ImportButton onData={handleImportData} loading={importMutation.isPending} />
            {isPilot && can("Payments", "create") && (
              <Button
                size="sm"
                className="h-11 px-6 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest"
                onClick={() => setIsNewPaymentOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                New Payment
              </Button>
            )}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search payments..."
              className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* Payments Table */}
        <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
              <tr>
                <th className="w-10 px-3 py-4">
                  <Checkbox
                    checked={paginatedPayments.length > 0 && paginatedPayments.every((p: any) => selectedIds.includes(p._id))}
                    onCheckedChange={() => toggleSelectAll(paginatedPayments)}
                  />
                </th>
                {["Company Name", "Voucher Number", "Bill Date", "Payment Mode", "Journal", "Amount", "Transaction ID", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <SkeletonTableRows rows={6} colSpan={9} />
              ) : paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground italic">
                    No payments found.
                  </td>
                </tr>
              ) : (
                paginatedPayments
                  .map((p: any) => (
                    <tr key={p._id} className={`hover:bg-muted/30 transition-colors ${selectedIds.includes(p._id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={selectedIds.includes(p._id)}
                          onCheckedChange={() => toggleSelect(p._id)}
                        />
                      </td>
                      <td
                        className="px-6 py-4 font-bold text-primary cursor-pointer hover:underline"
                        onClick={() => openView(p)}
                      >
                        {p.companyName || p.invoice?.client?.company || "-"}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {p.voucherNumber || "-"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {p.billDate ? formatDate(p.billDate) : "-"}
                      </td>
                      <td className="px-6 py-4 uppercase text-[10px] font-black tracking-widest text-muted-foreground">
                        {p.paymentmode || "Bank Transfer"}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {p.journal || "-"}
                      </td>
                      <td className="px-6 py-4 font-black text-emerald-600">
                        ₹{(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px] text-foreground">
                        {p.transactionid || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <TableActions
                          onView={() => openView(p)}
                        />
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4 mb-4">
          <p className="text-xs font-bold text-muted-foreground italic">
            Showing {totalPayments === 0 ? 0 : (safePaymentPage - 1) * paymentPageSize + 1} to {Math.min(safePaymentPage * paymentPageSize, totalPayments)} of {totalPayments} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-4 rounded-lg font-bold text-xs"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePaymentPage <= 1}
            >
              Previous
            </Button>
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">
              {safePaymentPage}
            </div>
            <span className="text-xs text-muted-foreground px-1">of {totalPaymentPages}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-4 rounded-lg font-bold text-xs"
              onClick={() => setCurrentPage(p => Math.min(totalPaymentPages, p + 1))}
              disabled={safePaymentPage >= totalPaymentPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null); }}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
          {viewItem && (
            <>
              <div className="bg-slate-50 px-6 pt-5 pb-4 border-b border-slate-200">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black text-slate-900 tracking-tight">
                    Payment for Invoice{" "}
                    <span className="text-primary">{viewItem.invoice?.number || "N/A"}</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="flex gap-1 mt-4 bg-slate-200/60 p-1 rounded-lg w-fit">
                  <button
                    onClick={() => setViewTab("receipt")}
                    className={cn(
                      "px-4 py-1.5 text-xs font-bold rounded-md transition-colors",
                      viewTab === "receipt" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Payment Receipt
                  </button>
                  <button
                    onClick={() => setViewTab("payment")}
                    className={cn(
                      "px-4 py-1.5 text-xs font-bold rounded-md transition-colors",
                      viewTab === "payment" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    Payment
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 max-h-[65vh] overflow-y-auto">
                <div className="flex justify-end gap-2 mb-5">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-lg"
                    title="Email Receipt"
                    onClick={() => toast({ title: "Email Sent", description: "Receipt emailed to the customer (simulation)." })}
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8 px-2 rounded-lg gap-0.5 text-xs">
                        <FileText className="h-3.5 w-3.5" />
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View PDF</DropdownMenuItem>
                      <DropdownMenuItem>Download</DropdownMenuItem>
                      <DropdownMenuItem>Print</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" className="h-8 w-8 rounded-lg bg-destructive hover:bg-destructive/90" title="Delete Payment">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove the payment and recalculate the invoice's status.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteOneMutation.mutate(viewItem._id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {viewTab === "receipt" ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="text-sm">
                        <p className="font-bold text-slate-900">{viewItem.invoice?.client?.company || "N/A"}</p>
                        {viewItem.invoice?.client?.address && <p className="text-slate-500">{viewItem.invoice.client.address}</p>}
                        {(viewItem.invoice?.client?.city || viewItem.invoice?.client?.state) && (
                          <p className="text-slate-500">{[viewItem.invoice?.client?.city, viewItem.invoice?.client?.state, viewItem.invoice?.client?.zip].filter(Boolean).join(" ")}</p>
                        )}
                        {viewItem.invoice?.client?.country && <p className="text-slate-500">{viewItem.invoice.client.country}</p>}
                      </div>
                      <p className="text-sm font-bold text-primary uppercase">
                        {viewItem.created_by ? `${viewItem.created_by.firstname || ""} ${viewItem.created_by.lastname || ""}`.trim() : "-"}
                      </p>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 tracking-tight">PAYMENT RECEIPT</h3>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-500">Payment Date:</span>
                        <span className="font-medium text-slate-800">{viewItem.date ? formatDate(viewItem.date) : "-"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-500">Payment Mode:</span>
                        <span className="font-medium text-slate-800">{viewItem.paymentmode || "-"}</span>
                      </div>
                      {viewItem.paymentmethod && (
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                          <span className="text-slate-500">Payment Method:</span>
                          <span className="font-medium text-slate-800">{viewItem.paymentmethod}</span>
                        </div>
                      )}
                      {viewItem.transactionid && (
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                          <span className="text-slate-500">Transaction ID:</span>
                          <span className="font-mono text-slate-800">{viewItem.transactionid}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Amount</p>
                      <p className="text-xl font-black text-slate-900">₹{(viewItem.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-900 mb-2">Payment For</p>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-3 py-2 text-left font-bold">Invoice Number</th>
                              <th className="px-3 py-2 text-left font-bold">Invoice Date</th>
                              <th className="px-3 py-2 text-left font-bold">Invoice Amount</th>
                              <th className="px-3 py-2 text-left font-bold">Payment Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t border-slate-100">
                              <td className="px-3 py-2 text-primary font-bold">{viewItem.invoice?.number || "N/A"}</td>
                              <td className="px-3 py-2 text-slate-700">{viewItem.invoice?.date ? formatDate(viewItem.invoice.date) : "-"}</td>
                              <td className="px-3 py-2 text-slate-700">₹{(viewItem.invoice?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="px-3 py-2 font-bold text-slate-900">₹{(viewItem.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {viewItem.note && (
                      <div className="border-t border-slate-100 pt-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Note</p>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{viewItem.note}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium block mb-1.5">Company Name</Label>
                        <Input
                          value={paymentForm.companyName}
                          onChange={(e) => setPaymentForm(p => ({ ...p, companyName: e.target.value }))}
                          className="rounded-lg border-border/60"
                          placeholder="Company name"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium block mb-1.5">Voucher Number</Label>
                        <Input
                          value={paymentForm.voucherNumber}
                          onChange={(e) => setPaymentForm(p => ({ ...p, voucherNumber: e.target.value }))}
                          className="rounded-lg border-border/60"
                          placeholder="Voucher number"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium block mb-1.5">Amount Received</Label>
                      <Input
                        type="number"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                        className="rounded-lg border-border/60"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium block mb-1.5">Payment Date</Label>
                      <Input
                        type="date"
                        value={paymentForm.date}
                        onChange={(e) => setPaymentForm(p => ({ ...p, date: e.target.value }))}
                        className="rounded-lg border-border/60"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium block mb-1.5">Bill Date</Label>
                      <Input
                        type="date"
                        value={paymentForm.billDate}
                        onChange={(e) => setPaymentForm(p => ({ ...p, billDate: e.target.value }))}
                        className="rounded-lg border-border/60"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium block mb-1.5">Payment Mode</Label>
                        <Select value={paymentForm.paymentmode} onValueChange={(v) => setPaymentForm(p => ({ ...p, paymentmode: v }))}>
                          <SelectTrigger className="rounded-lg border-border/60">
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentModes.length > 0 ? (
                              paymentModes.map((m: any) => (
                                <SelectItem key={m._id} value={m.name}>{m.name}</SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="bank">Bank</SelectItem>
                                <SelectItem value="cash">Cash</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium block mb-1.5">Journal</Label>
                        <Select value={paymentForm.journal} onValueChange={(v) => setPaymentForm(p => ({ ...p, journal: v }))}>
                          <SelectTrigger className="rounded-lg border-border/60">
                            <SelectValue placeholder="Select journal" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="purchase">Purchase</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium block mb-1.5">Payment Method</Label>
                      <Input
                        value={paymentForm.paymentmethod}
                        onChange={(e) => setPaymentForm(p => ({ ...p, paymentmethod: e.target.value }))}
                        className="rounded-lg border-border/60"
                        placeholder="e.g. Bank Transfer"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium block mb-1.5">Transaction ID</Label>
                      <Input
                        value={paymentForm.transactionid}
                        onChange={(e) => setPaymentForm(p => ({ ...p, transactionid: e.target.value }))}
                        className="rounded-lg border-border/60"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium block mb-1.5">Note</Label>
                      <Textarea
                        value={paymentForm.note}
                        onChange={(e) => setPaymentForm(p => ({ ...p, note: e.target.value }))}
                        className="rounded-lg border-border/60 min-h-[90px] resize-none"
                        placeholder="Optional note..."
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button
                        className="rounded-lg"
                        onClick={handleSavePayment}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isNewPaymentOpen} onOpenChange={(open) => { setIsNewPaymentOpen(open); if (!open) setNewPaymentForm(emptyNewPaymentForm); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">New Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {canUseBranch && (
              <div>
                <Label className="text-sm font-medium block mb-1.5">Branch</Label>
                <SearchableSelect
                  options={hrmsBranches.map((b: any) => ({ label: b.name, value: b._id }))}
                  value={newPaymentForm.branchId}
                  onValueChange={handleSelectBranch}
                  placeholder="Select a branch first..."
                />
              </div>
            )}
            <div>
              <Label className="text-sm font-medium block mb-1.5">Customer</Label>
              <SearchableSelect
                options={branchClients.map((c: any) => ({ label: c.company || c.firstname || "Unnamed", value: c._id }))}
                value={newPaymentForm.client}
                onValueChange={handleSelectPaymentClient}
                disabled={canUseBranch && !newPaymentForm.branchId}
                placeholder={canUseBranch && !newPaymentForm.branchId ? "Select a branch first" : "Select a customer..."}
              />
            </div>
            <div>
              <Label className="text-sm font-medium block mb-1.5">Invoice (optional)</Label>
              <SearchableSelect
                options={clientInvoices.map((i: any) => ({
                  label: `${i.number} — ₹${(i.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} (${i.status})`,
                  value: i._id,
                }))}
                value={newPaymentForm.invoice}
                onValueChange={handleSelectPaymentInvoice}
                disabled={!newPaymentForm.client}
                placeholder={!newPaymentForm.client ? "Select a customer first" : "Link to an invoice, or leave blank for a standalone voucher"}
              />
              {newPaymentForm.invoice && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Saving this payment will recalculate that invoice's paid status automatically.
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium block mb-1.5">Company Name</Label>
                <Input
                  value={newPaymentForm.companyName}
                  onChange={(e) => setNewPaymentForm(p => ({ ...p, companyName: e.target.value }))}
                  className="rounded-lg border-border/60"
                  placeholder="Company name"
                />
              </div>
              <div>
                <Label className="text-sm font-medium block mb-1.5">Voucher Number</Label>
                <Input
                  value={newPaymentForm.voucherNumber}
                  onChange={(e) => setNewPaymentForm(p => ({ ...p, voucherNumber: e.target.value }))}
                  className="rounded-lg border-border/60"
                  placeholder="Voucher number"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium block mb-1.5">Amount Received</Label>
              <Input
                type="number"
                value={newPaymentForm.amount}
                onChange={(e) => setNewPaymentForm(p => ({ ...p, amount: e.target.value }))}
                className="rounded-lg border-border/60"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium block mb-1.5">Payment Date</Label>
                <Input
                  type="date"
                  value={newPaymentForm.date}
                  onChange={(e) => setNewPaymentForm(p => ({ ...p, date: e.target.value }))}
                  className="rounded-lg border-border/60"
                />
              </div>
              <div>
                <Label className="text-sm font-medium block mb-1.5">Bill Date</Label>
                <Input
                  type="date"
                  value={newPaymentForm.billDate}
                  onChange={(e) => setNewPaymentForm(p => ({ ...p, billDate: e.target.value }))}
                  className="rounded-lg border-border/60"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium block mb-1.5">Payment Mode</Label>
                <Select value={newPaymentForm.paymentmode} onValueChange={(v) => setNewPaymentForm(p => ({ ...p, paymentmode: v }))}>
                  <SelectTrigger className="rounded-lg border-border/60">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModes.length > 0 ? (
                      paymentModes.map((m: any) => (
                        <SelectItem key={m._id} value={m.name}>{m.name}</SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium block mb-1.5">Journal</Label>
                <Select value={newPaymentForm.journal} onValueChange={(v) => setNewPaymentForm(p => ({ ...p, journal: v }))}>
                  <SelectTrigger className="rounded-lg border-border/60">
                    <SelectValue placeholder="Select journal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="purchase">Purchase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium block mb-1.5">Payment Method</Label>
              <Input
                value={newPaymentForm.paymentmethod}
                onChange={(e) => setNewPaymentForm(p => ({ ...p, paymentmethod: e.target.value }))}
                className="rounded-lg border-border/60"
                placeholder="e.g. Bank Transfer"
              />
            </div>
            <div>
              <Label className="text-sm font-medium block mb-1.5">Transaction ID</Label>
              <Input
                value={newPaymentForm.transactionid}
                onChange={(e) => setNewPaymentForm(p => ({ ...p, transactionid: e.target.value }))}
                className="rounded-lg border-border/60"
                placeholder="Optional"
              />
            </div>
            <div>
              <Label className="text-sm font-medium block mb-1.5">Note</Label>
              <Textarea
                value={newPaymentForm.note}
                onChange={(e) => setNewPaymentForm(p => ({ ...p, note: e.target.value }))}
                className="rounded-lg border-border/60 min-h-[80px] resize-none"
                placeholder="Optional note..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setIsNewPaymentOpen(false)}>Cancel</Button>
              <Button className="rounded-lg" onClick={handleCreatePayment} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Payments;

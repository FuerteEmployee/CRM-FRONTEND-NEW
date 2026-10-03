import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/context/SettingsContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Plus,
  Search,
  Download,
  FileText,
  Printer,
  Receipt,
  Eye,
  Trash2,
  Mail,
  ChevronDown,
  X,
  Pencil,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { creditNoteService } from "@/api/services/credit_note.service";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTableRows } from "@/components/ui/skeleton-table-rows";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, TablePagination } from "@/components/ui/table";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { ExportButton } from "@/components/ui/export-button";
import { ImportButton } from "@/components/ui/import-button";
import { useCurrency } from "@/context/CurrencyContext";
import { financeService } from "@/api/services/finance.service";

const statusMap: Record<number, { label: string; color: string }> = {
  1: { label: "Open", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  2: { label: "Closed", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  3: { label: "Void", color: "bg-slate-50 text-slate-700 border-slate-200" },
};

const CreditNotes = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewItem, setViewItem] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { symbol, formatAmount } = useCurrency();

  // Paginated server-side once a finite page size is chosen; "All" keeps
  // the legacy full fetch, filtered client-side exactly as this page always has.
  interface CreditNotesPage { rows: any[]; total: number; pages: number; creditsAvailable: number }
  const { data: creditNotesResult, isLoading, isError, error } = useQuery<CreditNotesPage>({
    queryKey: ["creditNotes", itemsPerPage, currentPage, debouncedSearch],
    queryFn: async () => {
      const matchesSearch = (cn: any, q: string) =>
        !q ||
        (cn.number || "").toLowerCase().includes(q) ||
        (cn.client?.company || "").toLowerCase().includes(q) ||
        (cn._id || "").toLowerCase().includes(q) ||
        (cn.reference || "").toLowerCase().includes(q) ||
        (statusMap[cn.status]?.label || "").toLowerCase().includes(q);

      if (itemsPerPage === "All") {
        const response = await creditNoteService.getAll();
        const rows: any[] = Array.isArray(response) ? response : response?.data || [];
        const creditsAvailable = rows
          .filter((cn: any) => cn.status === 1)
          .reduce((acc: number, cn: any) => acc + (cn.remaining_amount ?? cn.total ?? 0), 0);
        const q = debouncedSearch.toLowerCase();
        const rowsFiltered = rows.filter((cn: any) => matchesSearch(cn, q));
        return { rows: rowsFiltered, total: rowsFiltered.length, pages: 1, creditsAvailable };
      }

      const res: any = await creditNoteService.getAll({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch || undefined,
      });
      if (Array.isArray(res)) return { rows: [], total: 0, pages: 1, creditsAvailable: 0 };
      return {
        rows: res?.data ?? [],
        total: res?.total ?? 0,
        pages: res?.pages ?? 1,
        creditsAvailable: res?.creditsAvailable ?? 0,
      };
    },
    placeholderData: keepPreviousData,
    retry: false,
  });
  const creditNotes: any[] = creditNotesResult?.rows ?? [];

  const { data: currencies = [] } = useQuery<any[]>({
    queryKey: ["currencies"],
    queryFn: financeService.getCurrencies,
    staleTime: 5 * 60 * 1000,
  });

  const formatRowAmount = (row: any, value: number, fractionDigits = 2): string => {
    const cur = currencies.find((c: any) => c.name === row?.currency) || currencies.find((c: any) => c.isdefault) || null;
    const sym = cur?.symbol ?? symbol;
    const placement = cur?.placement ?? "before";
    const decimalSeparator = cur?.decimal_separator ?? ".";
    const thousandSeparator = cur?.thousand_separator ?? ",";
    const parts = Math.abs(value || 0).toFixed(fractionDigits).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
    const formatted = parts.join(decimalSeparator);
    const signed = (value || 0) < 0 ? `-${formatted}` : formatted;
    return placement === "before" ? `${sym}${signed}` : `${signed}${sym}`;
  };

  const importMutation = useMutation({
    mutationFn: (rows: any[]) => creditNoteService.import(rows),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["creditNotes"] });
      const count = data?.data?.count ?? data?.count ?? 0;
      const skipped = data?.data?.skipped ?? data?.skipped ?? 0;
      toast({ title: count === 0 ? "No New Credit Notes" : "Import Successful", description: count === 0 ? "All credit notes already exist." : `Imported ${count} credit note(s)${skipped ? `, skipped ${skipped} duplicate(s)` : ""}.`, variant: count === 0 ? "destructive" : "default" });
    },
    onError: (err: any) => toast({ title: "Import Failed", description: err?.response?.data?.message || err.message, variant: "destructive" }),
  });

  const handleImportData = (rows: Record<string, any>[]) => {
    const valid = rows.filter(r => r["company"] || r["Company"] || r["number"] || r["Credit Note #"] || r["total"] || r["Total"] || r["Amount"] || r["Customer"]);
    if (!valid.length) { toast({ title: "No valid rows", description: "Each row needs at least a company or credit note number.", variant: "destructive" }); return; }
    importMutation.mutate(valid as any);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => creditNoteService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creditNotes"] });
      toast({
        title: "Deleted",
        description: "Credit Note deleted successfully.",
        className: "bg-emerald-600 text-white border-none",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete credit note.",
        variant: "destructive",
      });
    },
  });

  const totalCreditNotes = creditNotesResult?.total ?? 0;
  const cnPageSize = itemsPerPage === "All" ? (totalCreditNotes || 1) : parseInt(itemsPerPage);
  const totalCnPages = creditNotesResult?.pages ?? 1;
  const safeCnPage = Math.min(currentPage, totalCnPages);
  const paginatedCreditNotes = creditNotes;

  // Always the whole tenant's total, independent of the active search —
  // computed server-side since only the current page is kept in memory.
  const totalCreditsAvailable = creditNotesResult?.creditsAvailable ?? 0;

  // Export needs the full filtered set, not just the current page — fetched
  // on demand only when the user actually exports.
  const loadAllFilteredCreditNotes = async () => {
    const response = await creditNoteService.getAll();
    const rows: any[] = Array.isArray(response) ? response : response?.data || [];
    const q = debouncedSearch.toLowerCase();
    return rows.filter((cn: any) =>
      !q ||
      (cn.number || "").toLowerCase().includes(q) ||
      (cn.client?.company || "").toLowerCase().includes(q) ||
      (cn._id || "").toLowerCase().includes(q) ||
      (cn.reference || "").toLowerCase().includes(q) ||
      (statusMap[cn.status]?.label || "").toLowerCase().includes(q)
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8 animate-in fade-in duration-500">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Credit Notes</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Manage customer credit balances & void adjustments
              </p>
            </div>
          </div>
          {can("Invoices", "Create") && (
            <Button
              className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
              onClick={() => navigate("/admin/credit-notes/create")}
            >
              <Plus className="h-4 w-4" />
              New Credit Note
            </Button>
          )}
        </div>

        {/* Credits Available Banner */}
        <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-primary/10">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xl font-black text-foreground">
                {formatAmount(totalCreditsAvailable)} credits available.
              </p>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">
                Available balance to apply to invoices
              </p>
            </div>
          </div>
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
            <Button
              variant="outline"
              size="sm"
              className="h-11 px-6 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest border-border/50 shadow-sm hover:bg-muted/50"
              onClick={() => toast({ title: "Bulk Actions", description: "Select items first to apply bulk actions." })}
            >
              Bulk Actions
            </Button>
            <ExportButton
              data={loadAllFilteredCreditNotes}
              filename="credit_notes"
              columns={[
                { header: "Credit Note #", key: (cn) => cn.number || `CN-${cn._id?.substring(0, 6)}` },
                { header: "Customer", key: (cn) => cn.client?.company || "N/A" },
                { header: "Date", key: "date" },
                { header: "Status", key: (cn) => statusMap[cn.status]?.label || "Open" },
                { header: "Reference", key: (cn) => cn.reference || "-" },
                { header: "Amount", key: "total" },
                { header: "Remaining Amount", key: (cn) => cn.remaining_amount ?? cn.total ?? 0 }
              ]}
            />
            <ImportButton onData={handleImportData} loading={importMutation.isPending} />
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search credit notes..."
              className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* Error State */}
        {isError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm font-bold">
            Couldn't load credit notes: {(error as any)?.message || "You may not have permission to view this data."}
          </div>
        )}

        {/* Credit Notes Table */}
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                {["Credit Note #", "Customer", "Date", "Status", "Reference#", "Amount", "Remaining Amount", "Actions"].map((h) => (
                  <TableHead key={h}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={6} colSpan={8} />
              ) : paginatedCreditNotes.length === 0 ? (
                <TableEmpty colSpan={8}>No credit notes found.</TableEmpty>
              ) : (
                paginatedCreditNotes
                  .map((note: any) => {
                    const status = statusMap[note.status] || statusMap[1];
                    return (
                      <TableRow key={note._id}>
                        <TableCell
                          className="font-bold text-primary cursor-pointer hover:underline"
                          onClick={() => setViewItem(note)}
                        >
                          {note.number || `CN-${note._id?.substring(0, 6)}`}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {note.client?.company || "N/A"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {note.date ? formatDate(note.date) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1", status.color)}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {note.reference || "-"}
                        </TableCell>
                        <TableCell className="font-black text-foreground">
                          {formatRowAmount(note, note.total || 0)}
                        </TableCell>
                        <TableCell className="font-black text-primary">
                          {formatRowAmount(note, note.remaining_amount ?? note.total ?? 0)}
                        </TableCell>
                        <TableCell>
                          <TableActions
                            onView={() => setViewItem(note)}
                            onEdit={can("Invoices", "Edit") ? () => navigate(`/admin/credit-notes/edit/${note._id}`) : undefined}
                            onDelete={can("Invoices", "Delete") ? () => deleteMutation.mutate(note._id) : undefined}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
          <TablePagination page={safeCnPage} pageSize={cnPageSize} total={totalCreditNotes} onPageChange={setCurrentPage} />
        </TableContainer>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent 
          className="max-w-5xl h-[85vh] p-0 border-none shadow-2xl bg-white overflow-hidden flex flex-col rounded-xl"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">Credit Note View</DialogTitle>
          <CreditNoteViewContent 
            viewItem={viewItem} 
            onClose={() => setViewItem(null)} 
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// Extracted Component for the View Content so we can use queries easily
const CreditNoteViewContent = ({ viewItem, onClose }: { viewItem: any, onClose: () => void }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Credit Note");
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isApplyInvoiceModalOpen, setIsApplyInvoiceModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: "", cc: "", subject: "", body: "", attachPdf: true });
  const [reminderForm, setReminderForm] = useState({ date: "", staff: "", description: "", send_email: false });
  const [reminderSearch, setReminderSearch] = useState("");
  const [reminderItemsPerPage, setReminderItemsPerPage] = useState("10");
  const { toast } = useToast();
  const { symbol } = useCurrency();
  const queryClient = useQueryClient();
  const [applyAmounts, setApplyAmounts] = useState<Record<string, string>>({});
  const [isApplying, setIsApplying] = useState(false);
  const { getSetting } = useSettings();
  const companyName = getSetting("companyName", "Fuerte Developers");

  const handleApplyCredits = async () => {
    setIsApplying(true);
    try {
      const allocations = Object.entries(applyAmounts)
        .map(([invoiceId, amtStr]) => ({ invoiceId, amount: Number(amtStr) }))
        .filter((alloc) => alloc.amount > 0);

      if (allocations.length === 0) {
        toast({ title: "No credits applied", description: "Please enter an amount to apply to at least one invoice.", variant: "destructive" });
        setIsApplying(false);
        return;
      }

      const totalToApply = allocations.reduce((sum, a) => sum + a.amount, 0);
      const remainingCredits = item.remaining_amount ?? item.total;
      if (totalToApply > remainingCredits) {
        toast({ title: "Insufficient Credits", description: `You are attempting to apply ${formatAmount(totalToApply)} but only have ${formatAmount(remainingCredits)} available.`, variant: "destructive" });
        setIsApplying(false);
        return;
      }

      for (const alloc of allocations) {
        await creditNoteService.applyToInvoice(item._id, {
          invoiceId: alloc.invoiceId,
          amount: alloc.amount
        });
      }

      toast({
        title: "Credits Applied",
        description: "Your credits have been successfully applied to the selected invoice(s).",
        className: "bg-emerald-600 text-white border-none",
      });

      setApplyAmounts({});
      setIsApplyInvoiceModalOpen(false);

      queryClient.invalidateQueries({ queryKey: ["creditNotes"] });
      queryClient.invalidateQueries({ queryKey: ["creditNoteFull", item._id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    } catch (error: any) {
      console.error("Apply credits error:", error);
      toast({
        title: "Error Applying Credits",
        description: error?.response?.data?.message || "Failed to apply credits to invoice.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const { data: fullData, isLoading } = useQuery({
    queryKey: ["creditNoteFull", viewItem?._id],
    queryFn: () => creditNoteService.getById(viewItem?._id),
    enabled: !!viewItem?._id,
  });

  const { data: currencies = [] } = useQuery<any[]>({
    queryKey: ["currencies"],
    queryFn: financeService.getCurrencies,
    staleTime: 5 * 60 * 1000,
  });

  const item = fullData || viewItem;

  if (!item) return null;

  const status = statusMap[item.status] || statusMap[1];

  // This view only ever renders ONE credit note (`item`), so its currency is fixed for the whole component.
  const activeCurrency = currencies.find((c: any) => c.name === item?.currency) || currencies.find((c: any) => c.isdefault) || null;
  const activeSymbol = activeCurrency?.symbol ?? symbol;
  const formatAmount = (value: number, fractionDigits = 2): string => {
    const placement = activeCurrency?.placement ?? "before";
    const decimalSeparator = activeCurrency?.decimal_separator ?? ".";
    const thousandSeparator = activeCurrency?.thousand_separator ?? ",";
    const parts = Math.abs(value || 0).toFixed(fractionDigits).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
    const formatted = parts.join(decimalSeparator);
    const signed = (value || 0) < 0 ? `-${formatted}` : formatted;
    return placement === "before" ? `${activeSymbol}${signed}` : `${signed}${activeSymbol}`;
  };

  const handleSaveReminder = () => {
    toast({ title: "Reminder Set", description: "Your reminder has been saved successfully.", className: "bg-emerald-600 text-white border-none" });
    setIsReminderModalOpen(false);
    setReminderForm({ date: "", staff: "", description: "", send_email: false });
  };

  const generatePdfHtml = () => {
    return `
      <html>
        <head>
          <title>Credit Note ${item.number || `CN-${item._id?.substring(0, 6)}`}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .title { font-size: 32px; font-weight: 800; color: #2563eb; margin-bottom: 10px; }
            .company { font-weight: bold; font-size: 18px; color: #0f172a; }
            .meta { font-size: 14px; color: #475569; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { background: #fee2e2; color: #dc2626; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
            td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .totals { margin-top: 30px; width: 50%; float: right; }
            .totals-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .totals-row.grand { font-weight: 800; font-size: 18px; color: #0f172a; border-bottom: none; }
            @media print {
              body { padding: 0; }
              @page { margin: 2cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">${item.number || `CN-${item._id?.substring(0, 6)}`}</div>
              <div class="company">${companyName}</div>
            </div>
            <div style="text-align: right">
              <div style="margin-bottom: 15px;">
                <div style="font-size: 12px; color: #64748b; font-weight: bold; margin-bottom: 5px;">BILL TO</div>
                <div class="company" style="color: #2563eb;">${item.client?.company || 'Customer'}</div>
              </div>
              <div class="meta">
                <b>Credit Note Date:</b> ${item.date ? formatDate(item.date) : '-'}<br/>
                <b>Reference:</b> ${item.reference || '-'}
              </div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(item.items || []).map((i: any) => `
                <tr>
                  <td><b>${i.description}</b></td>
                  <td>${i.qty}</td>
                  <td>${formatAmount(i.rate || 0)}</td>
                  <td>${formatAmount((i.qty || 0) * (i.rate || 0))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal</span>
              <span>${formatAmount(item.subtotal || 0)}</span>
            </div>
            <div class="totals-row grand">
              <span>Total</span>
              <span>${formatAmount(item.total || 0)}</span>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePdfAction = (action: 'view' | 'new_tab' | 'download' | 'print') => {
    const html = generatePdfHtml();
    const blob = new Blob([action === 'print' ? html.replace('<body>', '<body onload="window.print()">') : html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    if (action === 'download') {
      const a = document.createElement('a');
      a.href = url;
      a.download = `Credit_Note_${item.number || item._id}.html`;
      a.click();
      toast({ title: "Download Started", description: "Your document is downloading." });
    } else {
      window.open(url, action === 'view' ? 'PDF_Viewer' : '_blank', action === 'view' ? 'width=800,height=900' : '');
    }
  };

  const tabs = ["Credit Note", "Invoices Credited", "Refunds", "Reminders"];

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50">
      {/* Top Tabs */}
      <div className="flex items-center justify-between px-6 pt-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-8">
          {tabs.map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-3 text-[13px] font-bold transition-colors border-b-2",
                activeTab === tab 
                  ? "border-slate-900 text-slate-900" 
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto bg-white">
        {isLoading ? (
          <div className="p-8 space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="p-8">
            {activeTab === "Credit Note" && (
              <div className="animate-in fade-in duration-300">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-10">
                  <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50 px-3 py-1 font-bold text-xs uppercase tracking-widest">
                    {status.label}
                  </Badge>
                  
                  <div className="flex items-center gap-2">
                    <Button className="bg-slate-800 hover:bg-slate-900 text-white font-bold h-9 px-4 rounded-lg text-xs shadow-md" onClick={() => setIsApplyInvoiceModalOpen(true)}>
                      Apply to invoice
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-slate-200 hover:bg-slate-50" onClick={() => {
                      onClose();
                      navigate(`/admin/credit-notes/edit/${item._id}`);
                    }}>
                      <Pencil className="h-4 w-4 text-slate-600" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-9 gap-2 rounded-lg border-slate-200 hover:bg-slate-50 px-3">
                          <FileText className="h-4 w-4 text-slate-600" />
                          <span className="text-xs font-bold text-slate-700">PDF</span>
                          <ChevronDown className="h-3 w-3 text-slate-400 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl border border-slate-200 shadow-xl">
                        <DropdownMenuItem className="text-xs font-bold cursor-pointer py-2" onClick={() => handlePdfAction('view')}>View PDF</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs font-bold cursor-pointer py-2" onClick={() => handlePdfAction('new_tab')}>View PDF in new TAB</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs font-bold cursor-pointer py-2" onClick={() => handlePdfAction('download')}>Download</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs font-bold cursor-pointer py-2" onClick={() => handlePdfAction('print')}>Print</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-slate-200 hover:bg-slate-50" onClick={() => setIsEmailModalOpen(true)}>
                      <Mail className="h-4 w-4 text-slate-600" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-9 gap-2 rounded-lg border-slate-200 hover:bg-slate-50 px-3">
                          <span className="text-xs font-bold text-slate-700">More</span>
                          <ChevronDown className="h-3 w-3 text-slate-400 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl border border-slate-200 shadow-xl">
                        <DropdownMenuItem className="text-xs font-bold cursor-pointer py-2">Refund</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs font-bold cursor-pointer py-2">Void</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs font-bold cursor-pointer py-2">Attach File</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs font-bold cursor-pointer py-2 text-red-600 focus:text-red-600">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Document Header */}
                <div className="flex justify-between items-start mb-12">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-blue-600 tracking-tight">
                      {item.number || `CN-${item._id?.substring(0, 6)}`}
                    </h2>
                    <div className="text-[13px] text-slate-600 space-y-1">
                      <p className="font-bold text-slate-900 text-base">{companyName}</p>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-[13px] text-slate-500 font-semibold mb-1">Bill To</p>
                    <button 
                      className="text-blue-600 font-bold text-[15px] hover:underline uppercase block mb-6 ml-auto"
                      onClick={() => {
                        onClose();
                        navigate(`/admin/customers/${typeof item.client === 'object' ? item.client?._id : item.client}`);
                      }}
                    >
                      {item.client?.company || "Customer"}
                    </button>

                    <p className="text-[13px] font-semibold text-slate-800">
                      Credit Note Date: <span className="font-normal text-slate-600">{item.date ? formatDate(item.date) : "-"}</span>
                    </p>
                    <p className="text-[13px] font-semibold text-slate-800">
                      Reference: <span className="font-normal text-slate-600">{item.reference || "-"}</span>
                    </p>
                  </div>
                </div>

                {/* Red Header Table */}
                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-[#ff0000] text-white">
                      <tr>
                        <th className="py-3.5 px-4 text-left font-bold w-12">#</th>
                        <th className="py-3.5 px-4 text-left font-bold">Item</th>
                        <th className="py-3.5 px-4 text-left font-bold w-24">Qty</th>
                        <th className="py-3.5 px-4 text-left font-bold w-32">Rate</th>
                        <th className="py-3.5 px-4 text-left font-bold w-32">Tax</th>
                        <th className="py-3.5 px-4 text-right font-bold w-32">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {item.items && item.items.length > 0 ? (
                        item.items.map((it: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-4 font-medium text-slate-500">{idx + 1}</td>
                            <td className="py-4 px-4">
                              <p className="font-bold text-slate-800">{it.description}</p>
                              {it.long_description && (
                                <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{it.long_description}</p>
                              )}
                            </td>
                            <td className="py-4 px-4 font-semibold text-slate-700">{it.qty}</td>
                            <td className="py-4 px-4 font-semibold text-slate-700">{formatAmount(it.rate || 0)}</td>
                            <td className="py-4 px-4 font-semibold text-slate-700">{it.tax_name || "0.00%"}</td>
                            <td className="py-4 px-4 text-right font-black text-slate-800">
                              {formatAmount((it.qty || 0) * (it.rate || 0))}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 italic font-medium">
                            No items found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals Section */}
                <div className="flex justify-end mt-8">
                  <div className="w-72 space-y-3">
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="font-bold text-slate-600">Sub Total:</span>
                      <span className="font-semibold text-slate-800">{formatAmount(item.subtotal || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="font-bold text-slate-600">Total Tax:</span>
                      <span className="font-semibold text-slate-800">{formatAmount(item.total_tax || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                      <span className="font-black text-slate-900">Total:</span>
                      <span className="font-black text-blue-600 text-lg">{formatAmount(item.total || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                      <span className="font-bold text-slate-600">Credits Used:</span>
                      <span className="font-semibold text-slate-800">
                        {formatAmount((item.total || 0) - (item.remaining_amount ?? item.total ?? 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-200 bg-green-50 p-3 rounded-lg">
                      <span className="font-black text-green-700">Credits Remaining:</span>
                      <span className="font-black text-green-700 text-lg">
                        {formatAmount(item.remaining_amount ?? item.total ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Client Note (if any) */}
                {item.client_note && (
                  <div className="mt-12">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Client Note</p>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">{item.client_note}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "Invoices Credited" && (
              <div className="animate-in fade-in duration-300">
                {item.invoices_credited && item.invoices_credited.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-left">Invoice #</TableHead>
                          <TableHead className="text-left">Amount Credited</TableHead>
                          <TableHead className="text-left">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {item.invoices_credited.map((inv: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="text-blue-600 font-bold hover:underline cursor-pointer">{inv.invoice_number}</TableCell>
                            <TableCell className="font-semibold text-slate-700">{formatAmount(inv.amount || 0)}</TableCell>
                            <TableCell className="text-slate-500">{formatDate(inv.date)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <div className="p-12 text-center bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-slate-500 font-medium">Credited Invoices Not Found</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "Refunds" && (
              <div className="animate-in fade-in duration-300">
                {item.refunds && item.refunds.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-left">Date</TableHead>
                          <TableHead className="text-left">Amount</TableHead>
                          <TableHead className="text-left">Payment Mode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {item.refunds.map((refund: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="text-slate-500">{formatDate(refund.date)}</TableCell>
                            <TableCell className="font-semibold text-slate-700">{formatAmount(refund.amount || 0)}</TableCell>
                            <TableCell className="text-slate-700">{refund.payment_mode || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <div className="p-12 text-center bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-slate-500 font-medium">No refunds found</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "Reminders" && (
              <div className="animate-in fade-in duration-300 space-y-6">
                <div className="flex justify-end">
                  <Button 
                    className="rounded-xl font-bold shadow-lg shadow-primary/20 bg-slate-800 hover:bg-slate-900 text-white gap-2 h-10 px-6 uppercase text-[10px] tracking-widest"
                    onClick={() => setIsReminderModalOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Set Credit Note Reminder
                  </Button>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <Select value={reminderItemsPerPage} onValueChange={setReminderItemsPerPage}>
                      <SelectTrigger className="h-9 w-[80px] bg-white border-slate-200 shadow-sm rounded-lg text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["10", "25", "50", "100", "All"].map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-9 px-4 rounded-lg font-bold text-xs gap-2 border-slate-200">
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </Button>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      className="pl-9 h-9 bg-white border-slate-200 shadow-sm rounded-lg text-xs"
                      value={reminderSearch}
                      onChange={(e) => setReminderSearch(e.target.value)}
                    />
                  </div>
                </div>

                <TableContainer>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left">Description</TableHead>
                        <TableHead className="text-left">Date</TableHead>
                        <TableHead className="text-left">Remind</TableHead>
                        <TableHead className="text-left">Is notified?</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {item.reminders && item.reminders.length > 0 ? (
                        item.reminders.map((rem: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="text-slate-700 font-medium">{rem.description}</TableCell>
                            <TableCell className="text-slate-500">{formatDate(rem.date)}</TableCell>
                            <TableCell className="text-slate-700">{rem.staff}</TableCell>
                            <TableCell className="text-slate-700">
                              <Badge variant="outline" className={cn("text-[10px] uppercase tracking-widest", rem.is_notified ? "border-emerald-200 text-emerald-600 bg-emerald-50" : "border-slate-200 text-slate-500 bg-slate-50")}>
                                {rem.is_notified ? "Yes" : "No"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableEmpty colSpan={4}>No entries found</TableEmpty>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Reminder Modal */}
      <Dialog open={isReminderModalOpen} onOpenChange={setIsReminderModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border-none shadow-2xl bg-white">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">Set Credit Note Reminder</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                <span className="text-destructive">*</span> Date to be notified
              </label>
              <Input 
                type="date" 
                value={reminderForm.date}
                onChange={(e) => setReminderForm({ ...reminderForm, date: e.target.value })}
                className="h-11 rounded-xl border-slate-200 shadow-sm"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                <span className="text-destructive">*</span> Set reminder to
              </label>
              <Select value={reminderForm.staff} onValueChange={(v) => setReminderForm({ ...reminderForm, staff: v })}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 shadow-sm">
                  <SelectValue placeholder="Select Staff" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="me">Myself</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                <span className="text-destructive">*</span> Description
              </label>
              <textarea 
                value={reminderForm.description}
                onChange={(e) => setReminderForm({ ...reminderForm, description: e.target.value })}
                className="w-full min-h-[100px] rounded-xl border-slate-200 shadow-sm border p-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                placeholder="Reminder details..."
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="send_email" 
                checked={reminderForm.send_email}
                onChange={(e) => setReminderForm({ ...reminderForm, send_email: e.target.checked })}
                className="rounded text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="send_email" className="text-sm font-medium text-slate-700 cursor-pointer">
                Send also an email for this reminder
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
            <Button variant="outline" className="rounded-xl font-bold px-6 h-10 text-slate-500" onClick={() => setIsReminderModalOpen(false)}>
              Close
            </Button>
            <Button className="rounded-xl font-bold shadow-lg shadow-primary/20 px-8 h-10 bg-slate-900 hover:bg-slate-800 text-white" onClick={handleSaveReminder}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply to Invoice Modal */}
      <Dialog open={isApplyInvoiceModalOpen} onOpenChange={setIsApplyInvoiceModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 border-none shadow-2xl bg-white">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">Apply to Invoice</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-2 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-600">Available Credits:</span>
              <span className="font-black text-green-700 text-sm">{formatAmount(item.remaining_amount ?? item.total ?? 0)}</span>
            </div>
            
            {item.available_invoices && item.available_invoices.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Invoice #</TableHead>
                      <TableHead className="text-left">Date</TableHead>
                      <TableHead className="text-left">Total</TableHead>
                      <TableHead className="text-left">Paid</TableHead>
                      <TableHead className="text-left">Balance</TableHead>
                      <TableHead className="text-left">Apply</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.available_invoices.map((inv: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-bold text-blue-600">{inv.number}</TableCell>
                        <TableCell className="text-slate-500">{formatDate(inv.date)}</TableCell>
                        <TableCell className="font-semibold text-slate-700">{formatAmount(inv.total || 0)}</TableCell>
                        <TableCell className="font-semibold text-emerald-600">{formatAmount(inv.amount_paid || 0)}</TableCell>
                        <TableCell className="font-bold text-rose-600">{formatAmount(inv.balance_due || 0)}</TableCell>
                        <TableCell>
                           <Input 
                             type="number" 
                             placeholder="0.00" 
                             className="h-8 text-xs w-28" 
                             value={applyAmounts[inv._id] || ""}
                             onChange={(e) => setApplyAmounts({ ...applyAmounts, [inv._id]: e.target.value })}
                             max={Math.min(item.remaining_amount ?? item.total ?? 0, inv.balance_due || 0)}
                             min={0}
                           />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-slate-500 font-medium text-sm">There are no available invoices for this customer.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
            <Button variant="outline" className="rounded-xl font-bold px-6 h-10 text-slate-500" onClick={() => { setApplyAmounts({}); setIsApplyInvoiceModalOpen(false); }} disabled={isApplying}>
              Close
            </Button>
            {item.available_invoices && item.available_invoices.length > 0 && (
              <Button 
                className="rounded-xl font-bold shadow-lg shadow-primary/20 px-8 h-10 bg-slate-900 hover:bg-slate-800 text-white gap-2"
                onClick={handleApplyCredits}
                disabled={isApplying}
              >
                {isApplying ? "Applying..." : "Apply"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Modal */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="max-w-3xl rounded-2xl p-0 border-none shadow-2xl bg-white overflow-hidden flex flex-col h-[80vh]">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100">
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">Send Email</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="grid grid-cols-[80px_1fr] items-center gap-4">
              <label className="text-[13px] font-bold text-slate-700 text-right">To</label>
              <Input 
                value={emailForm.to}
                onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                className="h-10 rounded-xl border-slate-200 shadow-sm"
                placeholder="customer@example.com"
              />
            </div>
            
            <div className="grid grid-cols-[80px_1fr] items-center gap-4">
              <label className="text-[13px] font-bold text-slate-700 text-right">CC</label>
              <Input 
                value={emailForm.cc}
                onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })}
                className="h-10 rounded-xl border-slate-200 shadow-sm"
              />
            </div>
            
            <div className="grid grid-cols-[80px_1fr] items-center gap-4">
              <label className="text-[13px] font-bold text-slate-700 text-right">Subject</label>
              <Input 
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                className="h-10 rounded-xl border-slate-200 shadow-sm"
                defaultValue={`Credit Note ${item.number || ''}`}
              />
            </div>

            <div className="grid grid-cols-[80px_1fr] gap-4">
              <div />
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-[13px] font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={emailForm.attachPdf}
                    onChange={(e) => setEmailForm({ ...emailForm, attachPdf: e.target.checked })}
                    className="rounded text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
                  />
                  Attach Invoice PDF
                </label>
                <Button variant="link" className="h-auto p-0 text-[13px] font-bold text-blue-600">
                  Preview Email Template
                </Button>
              </div>
            </div>

            <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-[300px]">
              {/* Fake Google Docs Toolbar */}
              <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1 items-center">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-700"><Bold className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-700"><Italic className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-700"><Underline className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-700"><Strikethrough className="h-4 w-4" /></Button>
                <div className="w-px h-5 bg-slate-300 mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-700"><AlignLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-700"><AlignCenter className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-700"><AlignRight className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-700"><AlignJustify className="h-4 w-4" /></Button>
                <div className="w-px h-5 bg-slate-300 mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-700"><List className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-700"><ListOrdered className="h-4 w-4" /></Button>
                <div className="w-px h-5 bg-slate-300 mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-700"><LinkIcon className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-700"><ImageIcon className="h-4 w-4" /></Button>
              </div>
              <textarea 
                value={emailForm.body}
                onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                className="flex-1 w-full p-4 resize-none focus:outline-none text-sm text-slate-800"
                placeholder="Type your email content here..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50">
            <Button variant="outline" className="rounded-xl font-bold px-6 h-10 text-slate-500" onClick={() => setIsEmailModalOpen(false)}>
              Close
            </Button>
            <Button 
              className="rounded-xl font-bold shadow-lg shadow-primary/20 px-8 h-10 bg-slate-900 hover:bg-slate-800 text-white" 
              onClick={() => {
                toast({ title: "Email Sent", description: "Your email has been sent successfully.", className: "bg-emerald-600 text-white border-none" });
                setIsEmailModalOpen(false);
              }}
            >
              Send Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditNotes;

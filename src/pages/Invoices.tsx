import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  Eye,
  Receipt,
  Edit2,
  Trash2,
  Zap,
  Mail,
  Maximize2,
  Pencil,
  ChevronDown
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { ExportButton } from "@/components/ui/export-button";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";

const statusMap: Record<number, { label: string; color: string }> = {
  1: { label: "Unpaid", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  2: { label: "Paid", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  3: { label: "Partially Paid", color: "bg-blue-50 text-blue-700 border-blue-200" },
  4: { label: "Overdue", color: "bg-rose-50 text-rose-700 border-rose-200" },
  5: { label: "Cancelled", color: "bg-slate-50 text-slate-700 border-slate-200" },
};

const statusCardConfig = [
  { label: "Unpaid", color: "text-yellow-600", bg: "bg-yellow-50/50", border: "border-yellow-100", statusId: 1 },
  { label: "Paid", color: "text-emerald-600", bg: "bg-emerald-50/50", border: "border-emerald-100", statusId: 2 },
  { label: "Partially Paid", color: "text-blue-600", bg: "bg-blue-50/50", border: "border-blue-100", statusId: 3 },
  { label: "Overdue", color: "text-rose-600", bg: "bg-rose-50/50", border: "border-rose-100", statusId: 4 },
  { label: "Cancelled", color: "text-slate-500", bg: "bg-slate-50/50", border: "border-slate-100", statusId: 5 },
];

const getStatus = (statusId: any) => {
  return statusMap[Number(statusId)] ?? { label: "Unpaid", color: "bg-yellow-50 text-yellow-700 border-yellow-200" };
};

const DETAIL_TABS = ["Invoice", "Comments", "Reminders", "Tasks", "Notes", "Templates"];

const InvoiceDetailPanel = ({ invoice, onClose, onEdit, onView, isFullscreen, setIsFullscreen }: {
  invoice: any;
  onClose: () => void;
  onEdit: () => void;
  onView: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
}) => {
  const navigate = useNavigate();
  const invoiceNumber = invoice.number || `INV-${invoice._id?.substring(0, 6)}`;
  const status = getStatus(invoice.status);
  const [activeTab, setActiveTab] = useState("Invoice");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [ccEmail, setCcEmail] = useState("");
  const [attachPdf, setAttachPdf] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateStatusMutation = useMutation({
    mutationFn: (status: number) => salesService.updateInvoice(d._id || d.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoice._id || invoice.id] });
      toast({ title: "Status Updated", description: "Invoice status updated successfully.", className: "bg-green-600 text-white font-bold rounded-2xl" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update status.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesService.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Deleted", description: "Invoice deleted successfully.", className: "bg-green-600 text-white font-bold rounded-2xl" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete invoice.", variant: "destructive" });
    }
  });

  const handleCopy = () => {
    const link = `${window.location.origin}/invoice/${d._id || d.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied",
      description: "Invoice link copied to clipboard!",
      className: "bg-green-600 text-white font-bold rounded-2xl"
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast({
        title: "File Attached",
        description: `File "${file.name}" attached successfully (simulation).`,
        className: "bg-green-600 text-white font-bold rounded-2xl"
      });
    }
  };

  const { data: detail, isLoading } = useQuery({
    queryKey: ["invoice-detail", invoice._id || invoice.id],
    queryFn: () => salesService.getInvoiceById(invoice._id || invoice.id).then((res: any) => res.data || res),
    enabled: !!(invoice._id || invoice.id),
  });

  const d = detail || invoice;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <div className="flex flex-col">
        {/* ── Tab header row ── */}
        <div className="border-b border-border/50 px-4 pt-3 bg-background">
          <div className="flex items-end justify-between">
            <div className="flex items-end gap-0 overflow-x-auto">
              {DETAIL_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                    activeTab === tab
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* Icon tabs — right side */}
            <div className="flex items-center gap-0.5 pb-1 ml-2 shrink-0">
              <button
                title="Emails Tracking"
                onClick={() => setActiveTab("Emails Tracking")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  activeTab === "Emails Tracking"
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Mail className="h-4 w-4" />
              </button>
              <button
                title="View Tracking"
                onClick={() => setActiveTab("View Tracking")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  activeTab === "View Tracking"
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                title="Toggle full view"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Action bar ── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-background">
          <Badge variant="outline" className={cn("text-xs font-semibold px-2.5 py-0.5 bg-transparent", status.color)}>
            {status.label}
          </Badge>
          <div className="flex items-center gap-1.5">
            {/* Edit */}
            <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" title="Edit" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>

            {/* PDF dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 px-2 rounded-lg gap-0.5 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View PDF</DropdownMenuItem>
                <DropdownMenuItem>View PDF in New Tab</DropdownMenuItem>
                <DropdownMenuItem>Download</DropdownMenuItem>
                <DropdownMenuItem>Print</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Email — opens Send dialog */}
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-lg"
              title="Send Email"
              onClick={() => setShowEmailDialog(true)}
            >
              <Mail className="h-3.5 w-3.5" />
            </Button>

            {/* More dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 px-2.5 rounded-lg gap-1 text-xs font-medium">
                  More <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView}>View Invoice</DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>Attach File</DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopy}>Copy</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate(1)}>Mark as Unpaid</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate(2)}>Mark as Paid</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate(3)}>Mark as Partially Paid</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate(5)}>Mark as Cancelled</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteMutation.mutate(d._id || d.id)}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Convert dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 px-3 rounded-lg gap-1 text-xs font-bold bg-green-600 hover:bg-green-700 text-white">
                  Convert <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/admin/credit-notes/create", { state: { prepopulate: d } })}>
                  Convert to Credit Note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="px-6 py-5 overflow-y-auto max-h-[60vh]">
          {/* Invoice tab */}
          {activeTab === "Invoice" && (
            isLoading ? (
              <div className="space-y-3">
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header card */}
                <div className="border border-border/40 rounded-xl p-5">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-base font-bold text-primary">{invoiceNumber}</p>
                      {d.client?.company && <p className="text-sm font-bold text-foreground mt-3">{d.client?.company}</p>}
                      {d.client?.address && <p className="text-xs text-muted-foreground">{d.client?.address}</p>}
                      {(d.client?.city || d.client?.state) && (
                        <p className="text-xs text-muted-foreground">{[d.client?.city, d.client?.state, d.client?.zip].filter(Boolean).join(" ")}</p>
                      )}
                      {d.client?.country && <p className="text-xs text-muted-foreground">{d.client?.country}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground mb-0.5">To:</p>
                      <p className="text-sm font-semibold text-primary">{d.client?.company || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Items breakdown */}
                <div className="border border-border/40 rounded-xl p-5 min-h-[100px]">
                  {d.items?.length > 0 ? (
                    <>
                      <table className="w-full text-xs mb-4">
                        <thead className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest">
                          <tr>
                            <th className="px-3 py-2.5 text-left w-12">#</th>
                            <th className="px-3 py-2.5 text-left">Item</th>
                            <th className="px-3 py-2.5 text-left w-16">Qty</th>
                            <th className="px-3 py-2.5 text-left w-24">Rate</th>
                            <th className="px-3 py-2.5 text-left w-16">Tax</th>
                            <th className="px-3 py-2.5 text-left w-28">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {d.items.map((item: any, i: number) => (
                            <tr key={i} className="hover:bg-muted/20">
                              <td className="px-3 py-2.5 text-foreground font-medium">{i + 1}</td>
                              <td className="px-3 py-2.5 text-foreground align-top">
                                <div className="font-bold">{item.description || item.name || "—"}</div>
                                {item.long_description && <div className="text-[10px] text-muted-foreground mt-0.5 whitespace-pre-wrap">{item.long_description}</div>}
                              </td>
                              <td className="px-3 py-2.5 text-muted-foreground align-top">{item.qty || item.quantity || 1}</td>
                              <td className="px-3 py-2.5 text-muted-foreground align-top">₹{Number(item.rate || item.price || 0).toFixed(2)}</td>
                              <td className="px-3 py-2.5 text-muted-foreground align-top">{item.tax ? `${item.tax}%` : "0%"}</td>
                              <td className="px-3 py-2.5 font-bold text-foreground align-top">₹{Number((item.qty || 1) * (item.rate || item.price || 0)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex flex-col items-end gap-1.5 pt-2 border-t border-border/30">
                        {d.subtotal !== undefined && (
                          <div className="flex gap-4 text-xs">
                            <span className="text-muted-foreground font-medium">Sub Total:</span>
                            <span className="font-bold">₹{Number(d.subtotal).toFixed(2)}</span>
                          </div>
                        )}
                        {d.discount_percent > 0 && (
                          <div className="flex gap-4 text-xs text-destructive">
                            <span className="font-medium">Discount ({d.discount_percent}%):</span>
                            <span className="font-bold">-₹{Number(d.subtotal * (d.discount_percent / 100)).toFixed(2)}</span>
                          </div>
                        )}
                        {d.total_tax > 0 && (
                          <div className="flex gap-4 text-xs">
                            <span className="text-muted-foreground font-medium">Total Tax:</span>
                            <span className="font-bold">₹{Number(d.total_tax).toFixed(2)}</span>
                          </div>
                        )}
                        {d.adjustment !== 0 && d.adjustment !== undefined && (
                          <div className="flex gap-4 text-xs">
                            <span className="text-muted-foreground font-medium">Adjustment:</span>
                            <span className="font-bold">₹{Number(d.adjustment).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="text-right mt-1 pt-1 border-t border-border/20 w-40">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total</p>
                          <p className="text-lg font-black text-foreground">
                            ₹{Number(d.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground font-mono">{"{invoice_items}"}</p>
                  )}
                </div>

                {/* Tags */}
                {d.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {d.tags.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-[9px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-none">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {/* Comments tab */}
          {activeTab === "Comments" && (
            <div className="space-y-3 pt-2">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-border/50 p-3 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary bg-background"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-4 h-9 rounded-lg text-xs"
                  onClick={() => setCommentText("")}
                >
                  Add Comment
                </Button>
              </div>
            </div>
          )}

          {activeTab === "Reminders" && (
            <p className="text-sm text-muted-foreground italic text-center py-10">No reminders set.</p>
          )}
          {activeTab === "Tasks" && (
            <p className="text-sm text-muted-foreground italic text-center py-10">No tasks linked.</p>
          )}
          {activeTab === "Notes" && (
            <p className="text-sm text-muted-foreground italic text-center py-10">No notes added.</p>
          )}
          {activeTab === "Templates" && (
            <p className="text-sm text-muted-foreground italic text-center py-10">No templates available.</p>
          )}
          {activeTab === "Emails Tracking" && (
            <p className="text-sm text-muted-foreground italic text-center py-10">No tracked emails sent.</p>
          )}
          {activeTab === "View Tracking" && (
            <p className="text-sm text-muted-foreground italic text-center py-10">No views tracked yet.</p>
          )}
        </div>
      </div>

      {/* ── Send Invoice Email Dialog ── */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Send Invoice to Email</h2>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="attach-pdf"
                checked={attachPdf}
                onChange={e => setAttachPdf(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <label htmlFor="attach-pdf" className="text-sm font-medium cursor-pointer">Attach PDF</label>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">CC</label>
              <Input
                value={ccEmail}
                onChange={e => setCcEmail(e.target.value)}
                className="rounded-lg border-border/60"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">Preview Template</label>
              <div className="border border-border/50 rounded-xl overflow-hidden">
                <div className="flex items-center gap-4 px-3 py-2 border-b border-border/40 bg-muted/30 text-xs text-muted-foreground">
                  {["File", "Edit", "View", "Insert", "Format", "Tools", "Table"].map(m => (
                    <span key={m} className="cursor-pointer hover:text-foreground">{m}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40 bg-muted/20 text-xs text-muted-foreground">
                  <span className="border border-border/40 rounded px-2 py-0.5">System Font</span>
                  <span className="border border-border/40 rounded px-2 py-0.5">12pt</span>
                </div>
                <textarea
                  rows={8}
                  className="w-full p-4 text-sm resize-none focus:outline-none bg-background"
                  defaultValue={`Dear {contact_name}\n\nPlease find our attached invoice.\n\nThis invoice is due on: {invoice_duedate}\nYou can view the invoice on the following link: {invoice_number}\n\nPlease don't hesitate to comment online if you have any questions.\n\nWe look forward to your communication.\n\nKind Regards,\n{email_signature}`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" className="rounded-lg" onClick={() => setShowEmailDialog(false)}>Cancel</Button>
              <Button className="rounded-lg">Send</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Invoices = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const { data: invoices = [], isLoading } = useQuery<any[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      const response = await salesService.getInvoices();
      return Array.isArray(response) ? response : response?.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesService.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Deleted",
        description: "Invoice deleted successfully.",
        className: "bg-emerald-600 text-white border-none",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice.",
        variant: "destructive",
      });
    },
  });

  const stats = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const totals = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    invoices.forEach((inv: any) => {
      const status = inv.status || 1;
      if (counts[status] !== undefined) {
        counts[status]++;
        totals[status] += inv.total || 0;
      }
    });
    return { counts, totals };
  }, [invoices]);

  const filtered = useMemo(() => {
    return invoices.filter((i: any) => {
      const matchSearch =
        (i.number || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.client?.company || "").toLowerCase().includes(search.toLowerCase()) ||
        (i._id || "").toLowerCase().includes(search.toLowerCase());
      
      const matchStatus =
        statusFilter === "all" || String(i.status) === statusFilter;
      
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  const handleExport = (type: "pdf" | "csv" | "print") => {
    if (filtered.length === 0) {
      toast({
        title: "No data",
        description: "There are no invoices to export.",
        variant: "destructive",
      });
      return;
    }

    if (type === "csv") {
      const headers = ["Invoice #", "Customer", "Amount", "Total Tax", "Date", "Due Date", "Status"];
      const rows = filtered.map((inv: any) => [
        inv.number || `INV-${inv._id?.substring(0, 6)}`,
        inv.client?.company || "N/A",
        `INR ${inv.total || 0}`,
        `INR ${inv.total_tax || 0}`,
        inv.date ? formatDate(inv.date) : "-",
        inv.duedate ? formatDate(inv.duedate) : "-",
        statusMap[inv.status]?.label || "Unpaid",
      ]);

      const csvData = [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `invoices_export_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: "CSV exported successfully." });
    } else {
      window.print();
    }
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
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Invoices</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Manage corporate billing & payments
              </p>
            </div>
          </div>
          {can("Invoices", "Create") && (
            <Button
              className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
              onClick={() => navigate("/admin/invoices/create")}
            >
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
          )}
        </div>

        {/* Dynamic Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statusCardConfig.map((config) => {
            const count = stats.counts[config.statusId] || 0;
            const total = stats.totals[config.statusId] || 0;

            return (
              <Card
                key={config.statusId}
                className={cn(
                  "border shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer",
                  config.bg,
                  config.border,
                  statusFilter === String(config.statusId) ? "ring-2 ring-primary border-transparent" : ""
                )}
                onClick={() => setStatusFilter(statusFilter === String(config.statusId) ? "all" : String(config.statusId))}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-1">
                    <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", config.color)}>
                      {config.label}
                    </span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-xl font-black text-slate-900">{count}</span>
                      <span className="text-[11px] font-bold text-slate-500">
                        ₹{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Table Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
          <div className="flex items-center gap-3">
            <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
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
              <Zap className="h-3.5 w-3.5 text-primary" />
              Bulk Actions
            </Button>
            <ExportButton 
              data={filtered} 
              filename="invoices" 
              columns={[
                { header: "Invoice #", key: (inv) => inv.number || `INV-${inv._id?.substring(0, 6)}` },
                { header: "Customer", key: (inv) => inv.client?.company || "N/A" },
                { header: "Amount", key: "total" },
                { header: "Total Tax", key: "total_tax" },
                { header: "Date", key: "date" },
                { header: "Due Date", key: "duedate" },
                { header: "Status", key: (inv) => statusMap[inv.status]?.label || "Unpaid" }
              ]} 
            />
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Invoices Table */}
        <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
              <tr>
                {["Invoice #", "Customer", "Amount", "Total Tax", "Date", "Due Date", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="p-4">
                        <Skeleton className="h-10 w-full" />
                      </td>
                    </tr>
                  ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground italic">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filtered
                  .slice(0, itemsPerPage === "All" ? filtered.length : parseInt(itemsPerPage))
                  .map((inv: any) => {
                    const status = statusMap[inv.status] || statusMap[1];
                    return (
                      <tr key={inv._id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <button
                            className="font-bold text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer text-left"
                            onClick={() => setSelectedInvoice(inv)}
                          >
                            {inv.number || `INV-${inv._id?.substring(0, 6)}`}
                          </button>
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground">
                          {inv.client?.company || "N/A"}
                        </td>
                        <td className="px-6 py-4 font-black text-foreground">
                          ₹{(inv.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          ₹{(inv.total_tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {inv.date ? formatDate(inv.date) : "-"}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {inv.duedate ? formatDate(inv.duedate) : "-"}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1", status.color)}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <TableActions
                            onView={() => setPreviewInvoice(inv)}
                            onEdit={can("Invoices", "Edit") ? () => navigate(`/admin/invoices/edit/${inv._id}`) : undefined}
                            onDelete={can("Invoices", "Delete") ? () => deleteMutation.mutate(inv._id) : undefined}
                          />
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4 mb-4">
          <p className="text-xs font-bold text-muted-foreground italic">
            Showing 1 to {filtered.length} of {filtered.length} entries
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>
              Previous
            </Button>
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">
              1
            </div>
            <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Centered popup dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => { if (!open) { setSelectedInvoice(null); setIsFullscreen(false); } }}>
        <DialogContent className={cn("w-full p-0 overflow-hidden rounded-2xl transition-all", isFullscreen ? "max-w-[95vw]" : "max-w-3xl")}>
          {selectedInvoice && (
            <InvoiceDetailPanel
              invoice={selectedInvoice}
              onClose={() => setSelectedInvoice(null)}
              onView={() => {
                setPreviewInvoice(selectedInvoice);
                setSelectedInvoice(null);
              }}
              isFullscreen={isFullscreen}
              setIsFullscreen={setIsFullscreen}
              onEdit={() => {
                navigate(`/admin/invoices/edit/${selectedInvoice._id || selectedInvoice.id}`);
                setSelectedInvoice(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Custom preview dialog */}
      <DocumentPreviewDialog
        open={!!previewInvoice}
        onOpenChange={(open) => { if (!open) setPreviewInvoice(null); }}
        type="invoice"
        data={previewInvoice}
      />
    </DashboardLayout>
  );
};

export default Invoices;

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Download, FileText, Target, Printer, Zap, Mail, Eye, Maximize2, Pencil, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState, useMemo, useRef, useEffect } from "react";
import { formatDate } from "@/lib/dateFormat";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { estimateService } from "@/api/services/estimate.service";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTableRows } from "@/components/ui/skeleton-table-rows";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, TablePagination } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { isTrinetraPilotUser } from "@/lib/trinetraPilot";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { ExportButton } from "@/components/ui/export-button";
import { ImportDialog, type ImportColumn } from "@/components/ui/import-dialog";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";
import { WhatsAppQuickChat } from "@/components/shared/WhatsAppQuickChat";
import { useCurrency } from "@/context/CurrencyContext";
import { financeService } from "@/api/services/finance.service";
import { hrmsbranchService } from "@/api/services/hrmsbranch.service";
import { useSettings } from "@/context/SettingsContext";
import { canAccessBankDetails } from "@/lib/bankDetailsAccess";

const ESTIMATE_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "Company Name", sample: "Acme Traders", required: true, core: true },
  { key: "Connect Person", sample: "Rahul Mehta", core: true },
  { key: "Phone Number", sample: "9876543210", core: true },
  { key: "Mail Id", sample: "rahul@acme.com", core: true },
  { key: "Item", sample: "Website Design", core: true },
  { key: "Quantity", sample: 2, core: true },
  { key: "Rate", sample: 15000, core: true },
  { key: "Amount", sample: 30000, core: true },
  { key: "Sales Person", sample: "Priya Singh", core: true },
  { key: "Date", sample: "27-08-2026", core: true },
  { key: "Branch", sample: "Mumbai", core: true },
  { key: "Subject", sample: "Website Redesign Proposal", core: false },
  { key: "Status", sample: "sent", core: false },
  { key: "Open Till", sample: "10-09-2026", core: false },
  { key: "Estimate #", sample: "EST-1042", core: false },
];

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  "draft": { label: "Draft", className: "bg-slate-100 text-slate-600" },
  "sent": { label: "Sent", className: "bg-blue-50 text-blue-600" },
  "accepted": { label: "Accepted", className: "bg-emerald-50 text-emerald-600" },
  "declined": { label: "Declined", className: "bg-red-50 text-red-600" },
  "expired": { label: "Expired", className: "bg-amber-50 text-amber-600" },
};

const getStatus = (status: any) => {
  const s = String(status).toLowerCase();
  return STATUS_MAP[s] ?? { label: status || "Unknown", className: "bg-muted text-muted-foreground" };
};

const DETAIL_TABS = ["Estimate", "Comments", "Reminders", "Tasks", "Notes", "Templates"];

const EstimateDetailPanel = ({ estimate, onClose, onEdit, onView, isFullscreen, setIsFullscreen }: {
  estimate: any;
  onClose: () => void;
  onEdit: () => void;
  onView: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatAmount, symbol } = useCurrency();
  const { user } = usePermissions();
  const { getSetting } = useSettings();
  const companyName = getSetting("companyName", "Fuerte Developers");
  const canUseBankDetails = canAccessBankDetails(user?.email);

  const { data: currencies = [] } = useQuery({
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

  const estimateNumber = estimate.number || (estimate._id || estimate.id)?.slice(-6).toUpperCase();
  const status = getStatus(estimate.status);
  const [activeTab, setActiveTab] = useState("Estimate");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [ccEmail, setCcEmail] = useState("");
  const [attachPdf, setAttachPdf] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => estimateService.updateEstimate(d._id || d.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      queryClient.invalidateQueries({ queryKey: ["estimate-detail", estimate._id || estimate.id] });
      toast({ title: "Status Updated", description: "Estimate status updated successfully.", className: "bg-green-600 text-white font-bold rounded-2xl" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update status.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => estimateService.deleteEstimate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast({ title: "Deleted", description: "Estimate deleted successfully.", className: "bg-green-600 text-white font-bold rounded-2xl" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete estimate.", variant: "destructive" });
    }
  });

  const handleCopy = () => {
    const link = `${window.location.origin}/estimate/${d._id || d.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied",
      description: "Estimate link copied to clipboard!",
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
    queryKey: ["estimate-detail", estimate._id || estimate.id],
    queryFn: () => estimateService.getEstimateById(estimate._id || estimate.id).then((res: any) => res.data || res),
    enabled: !!(estimate._id || estimate.id),
  });

  const d = detail || estimate;

  const convertMutation = useMutation({
    mutationFn: (id: string) => estimateService.convertToInvoice(id),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      queryClient.invalidateQueries({ queryKey: ["estimate-detail", estimate._id || estimate.id] });
      toast({
        title: "Converted",
        description: "Estimate successfully converted to invoice.",
        className: "bg-green-600 text-white font-bold rounded-2xl",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to convert estimate to invoice.",
        variant: "destructive",
      });
    }
  });

  const handleConvertToInvoice = (id: string) => {
    convertMutation.mutate(id);
  };

  const generatePdfHtml = () => {
    const bd = d.bank_detail;
    const bankDetailsHtml = (canUseBankDetails && bd)
      ? `
          <div class="bank-details">
            <div class="bank-details-title">Payment / Bank Details</div>
            <div class="bank-details-row">
              <b>${bd.accountHolderName || "—"}</b><br/>
              Bank: ${bd.bankName || "—"}<br/>
              A/C No: ${bd.accountNumber || "—"} &nbsp; IFSC: ${bd.ifscCode || "—"}
              ${bd.branch?.name ? `<br/>Branch: ${bd.branch.name}` : ""}
            </div>
          </div>
        `
      : '';

    return `
      <html>
        <head>
          <title>Estimate ${estimateNumber}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .title { font-size: 32px; font-weight: 800; color: #2563eb; margin-bottom: 10px; }
            .company { font-weight: bold; font-size: 18px; color: #0f172a; }
            .meta { font-size: 14px; color: #475569; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { background: #dbeafe; color: #2563eb; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
            td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .totals { margin-top: 30px; width: 50%; float: right; }
            .totals-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .totals-row.grand { font-weight: 800; font-size: 18px; color: #0f172a; border-bottom: none; }
            .bank-details { clear: both; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 13px; }
            .bank-details-title { font-weight: bold; color: #2563eb; margin-bottom: 8px; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; }
            .bank-details-row { color: #334155; line-height: 1.6; margin-bottom: 8px; }
            @media print {
              body { padding: 0; }
              @page { margin: 2cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">${estimateNumber}</div>
              <div class="company">${companyName}</div>
            </div>
            <div style="text-align: right">
              <div style="margin-bottom: 15px;">
                <div style="font-size: 12px; color: #64748b; font-weight: bold; margin-bottom: 5px;">BILL TO</div>
                <div class="company" style="color: #2563eb;">${d.contact_name || d.client_id?.company || d.rel_id || 'Customer'}</div>
              </div>
              <div class="meta">
                <b>Estimate Date:</b> ${d.date ? formatDate(d.date) : '-'}<br/>
                <b>Status:</b> ${status.label}
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
              ${(d.items || []).map((item: any) => `
                <tr>
                  <td><b>${item.description || item.name || "—"}</b></td>
                  <td>${item.qty || item.quantity || 1}</td>
                  <td>${formatRowAmount(d, Number(item.rate || item.price || 0))}</td>
                  <td>${formatRowAmount(d, Number((item.qty || item.quantity || 1) * (item.rate || item.price || 0)))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            ${d.subtotal !== undefined ? `
              <div class="totals-row">
                <span>Subtotal</span>
                <span>${formatRowAmount(d, Number(d.subtotal))}</span>
              </div>
            ` : ''}
            <div class="totals-row grand">
              <span>Total</span>
              <span>${formatRowAmount(d, Number(d.total || 0))}</span>
            </div>
          </div>

          ${bankDetailsHtml}
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
      a.download = `Estimate_${estimateNumber}.html`;
      a.click();
      toast({ title: "Download Started", description: "Your document is downloading." });
    } else {
      window.open(url, action === 'view' ? 'PDF_Viewer' : '_blank', action === 'view' ? 'width=800,height=900' : '');
    }
  };

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
          <Badge variant="outline" className={cn("text-xs font-semibold px-2.5 py-0.5 bg-transparent", status.className)}>
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
                <DropdownMenuItem onClick={() => handlePdfAction('view')}>View PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePdfAction('new_tab')}>View PDF in New Tab</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePdfAction('download')}>Download</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePdfAction('print')}>Print</DropdownMenuItem>
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
                <DropdownMenuItem onClick={onView}>View Estimate</DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>Attach File</DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopy}>Copy</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("draft")}>Mark as Draft</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("sent")}>Mark as Sent</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("accepted")}>Mark as Accepted</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("declined")}>Mark as Declined</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteMutation.mutate(d._id || d.id)}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Convert dropdown / Converted Invoice Badge */}
            {d.invoice_id ? (
              <Button
                size="sm"
                className="bg-slate-950 hover:bg-slate-800 text-white font-mono text-xs px-3 h-8 rounded-lg font-bold"
                onClick={() => navigate("/admin/invoices")}
              >
                {typeof d.invoice_id === "object" ? d.invoice_id?.number : d.invoice_id}
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="h-8 px-3 rounded-lg gap-1 text-xs font-bold bg-green-600 hover:bg-green-700 text-white"
                    disabled={convertMutation.isPending}
                  >
                    {convertMutation.isPending ? "Converting..." : "Convert"} <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleConvertToInvoice(d._id || d.id)}>
                    Invoice
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="px-6 py-5 overflow-y-auto max-h-[60vh]">
          {/* Estimate tab */}
          {activeTab === "Estimate" && (
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
                      <p className="text-base font-bold text-primary">{estimateNumber}</p>
                      <p className="text-sm font-semibold text-muted-foreground mt-0.5">{d.subject}</p>
                      {d.billing_street && <p className="text-xs text-muted-foreground mt-3">{d.billing_street}</p>}
                      {(d.billing_city || d.billing_state) && (
                        <p className="text-xs text-muted-foreground">{[d.billing_city, d.billing_state, d.billing_zip].filter(Boolean).join(" ")}</p>
                      )}
                      {d.billing_country && <p className="text-xs text-muted-foreground">{d.billing_country}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground mb-0.5">To:</p>
                      <p className="text-sm font-semibold text-primary">{d.contact_name || d.client_id?.company || d.rel_id || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Items breakdown */}
                <div className="border border-border/40 rounded-xl p-5 min-h-[100px]">
                  {d.items?.length > 0 ? (
                    <>
                      <Table className="mb-4">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-left w-12">#</TableHead>
                            <TableHead className="text-left">Item</TableHead>
                            <TableHead className="text-left w-16">Qty</TableHead>
                            <TableHead className="text-left w-24">Rate</TableHead>
                            <TableHead className="text-left w-16">Tax</TableHead>
                            <TableHead className="text-left w-28">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {d.items.map((item: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="text-foreground font-medium">{i + 1}</TableCell>
                              <TableCell className="text-foreground align-top">
                                <div className="font-bold">{item.description || item.name || "—"}</div>
                                {item.long_description && <div className="text-[10px] text-muted-foreground mt-0.5 whitespace-pre-wrap">{item.long_description}</div>}
                              </TableCell>
                              <TableCell className="text-muted-foreground align-top">{item.qty || item.quantity || 1}</TableCell>
                              <TableCell className="text-muted-foreground align-top">{formatRowAmount(d, Number(item.rate || item.price || 0))}</TableCell>
                              <TableCell className="text-muted-foreground align-top">{item.tax ? `${item.tax}%` : "0%"}</TableCell>
                              <TableCell className="font-bold text-foreground align-top">{formatRowAmount(d, Number((item.qty || 1) * (item.rate || item.price || 0)))}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="flex flex-col items-end gap-1.5 pt-2 border-t border-border/30">
                        {d.subtotal !== undefined && (
                          <div className="flex gap-4 text-xs">
                            <span className="text-muted-foreground font-medium">Sub Total:</span>
                            <span className="font-bold">{formatRowAmount(d, Number(d.subtotal))}</span>
                          </div>
                        )}
                        {d.discount_percent > 0 && (
                          <div className="flex gap-4 text-xs text-destructive">
                            <span className="font-medium">Discount ({d.discount_percent}%):</span>
                            <span className="font-bold">-{formatRowAmount(d, Number(d.subtotal * (d.discount_percent / 100)))}</span>
                          </div>
                        )}
                        {d.total_tax > 0 && (
                          <div className="flex gap-4 text-xs">
                            <span className="text-muted-foreground font-medium">Total Tax:</span>
                            <span className="font-bold">{formatRowAmount(d, Number(d.total_tax))}</span>
                          </div>
                        )}
                        {d.adjustment !== 0 && d.adjustment !== undefined && (
                          <div className="flex gap-4 text-xs">
                            <span className="text-muted-foreground font-medium">Adjustment:</span>
                            <span className="font-bold">{formatRowAmount(d, Number(d.adjustment))}</span>
                          </div>
                        )}
                        <div className="text-right mt-1 pt-1 border-t border-border/20 w-40">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total</p>
                          <p className="text-lg font-black text-foreground">
                            {formatRowAmount(d, Number(d.total || 0))}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground font-mono">{"{estimate_items}"}</p>
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

      {/* ── Send Estimate Email Dialog ── */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Send Estimate to Email</h2>

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
                  defaultValue={`Dear {contact_name}\n\nPlease find our attached estimate.\n\nThis estimate is valid until: {estimate_expirydate}\nYou can view the estimate on the following link: {estimate_number}\n\nPlease don't hesitate to comment online if you have any questions.\n\nWe look forward to your communication.\n\nKind Regards,\n{email_signature}`}
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

const Estimates = () => {
  const [estimateSearch, setEstimateSearch] = useState("");
  const [debouncedEstimateSearch, setDebouncedEstimateSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedEstimateSearch(estimateSearch.trim()), 350);
    return () => clearTimeout(t);
  }, [estimateSearch]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [estimateItemsPerPage, setEstimateItemsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEstimate, setSelectedEstimate] = useState<any>(null);
  const [previewEstimate, setPreviewEstimate] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const navigate = useNavigate();
  const { can, user, isModuleEnabled } = usePermissions();
  const isPilot = isTrinetraPilotUser(user?.email);
  // Branch is sourced from the HRMS module — only show it when the
  // tenant's plan actually includes HRMS, even for a pilot-flagged user.
  const canUseBranch = isPilot && isModuleEnabled("hrms");
  const canUseBankDetails = canAccessBankDetails(user?.email);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatAmount, symbol } = useCurrency();

  const { data: branchesData } = useQuery({
    queryKey: ["hrms-branches"],
    queryFn: () => hrmsbranchService.getAll(),
    enabled: canUseBranch,
    staleTime: 5 * 60 * 1000,
  });
  const branches = branchesData?.data || [];

  const { data: currencies = [] } = useQuery({
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

  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({ massDelete: false, status: "" });
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = (pageIds: string[]) => {
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
        await estimateService.bulkDeleteEstimates(selectedIds);
        toast({ title: "Success", description: `Deleted ${selectedIds.length} items.` });
      } else if (bulkState.status) {
        await Promise.all(selectedIds.map(id => estimateService.updateEstimate(id, { status: bulkState.status })));
        toast({ title: "Success", description: `Updated ${selectedIds.length} items.` });
      }
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      setSelectedIds([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false, status: "" });
    } catch {
      toast({ title: "Error", description: "Failed to perform bulk action."});
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Paginated server-side (per estimate document) once a finite page size is
  // chosen; "All" keeps the legacy full fetch, filtered client-side exactly
  // as this page always has.
  interface EstimatesPage { rows: any[]; total: number; pages: number }
  const { data: estimatesResult, isLoading: isLoadingEstimates } = useQuery<EstimatesPage>({
    queryKey: ["estimates", estimateItemsPerPage, currentPage, debouncedEstimateSearch, branchFilter],
    queryFn: async () => {
      if (estimateItemsPerPage === "All") {
        const response = await estimateService.getEstimates();
        const rows: any[] = (Array.isArray(response) ? response : response?.data || []).filter((item: any) => !item.form);
        const q = debouncedEstimateSearch.toLowerCase();
        const rowsFiltered = rows.filter((e: any) => {
          const matchesSearch = estimateMatchesSearch(e, q);
          const matchesBranch = branchFilter === "all" || getBranchName(e) === branchFilter;
          return matchesSearch && matchesBranch;
        });
        return { rows: rowsFiltered, total: rowsFiltered.length, pages: 1 };
      }

      const res: any = await estimateService.getEstimates({
        page: currentPage,
        limit: estimateItemsPerPage,
        search: debouncedEstimateSearch || undefined,
        branch: branchFilter !== "all" ? branchFilter : undefined,
      });
      if (Array.isArray(res)) return { rows: [], total: 0, pages: 1 };
      const rows: any[] = (res?.data ?? []).filter((item: any) => !item.form);
      return { rows, total: res?.total ?? 0, pages: res?.pages ?? 1 };
    },
    placeholderData: keepPreviousData,
  });
  const estimates: any[] = estimatesResult?.rows ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => estimateService.deleteEstimate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast({ title: "Deleted", description: "Estimate deleted successfully.", className: "bg-green-600 text-white" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete estimate.", variant: "destructive" });
    }
  });

  const importMutation = useMutation({
    mutationFn: (rows: any[]) => estimateService.import(rows),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      const count = data?.data?.count ?? data?.count ?? 0;
      const skipped = data?.data?.skipped ?? data?.skipped ?? 0;
      toast({ title: count === 0 ? "No New Estimates" : "Import Successful", description: count === 0 ? "All estimates already exist." : `Imported ${count} estimate(s)${skipped ? `, skipped ${skipped} duplicate(s)` : ""}.`, variant: count === 0 ? "destructive" : "default" });
    },
    onError: (err: any) => toast({ title: "Import Failed", description: err?.response?.data?.message || err.message, variant: "destructive" }),
  });

  const handleImportData = (rows: Record<string, any>[]) => {
    const RECOGNIZED_KEYS = [
      "subject", "company", "companyname", "total", "estimate#", "to",
      "connectperson", "phonenumber", "mailid", "item", "quantity", "rate", "amount", "salesperson", "date",
    ];
    const normalize = (key: string) => key.toLowerCase().replace(/[^a-z0-9#]/g, "");
    const valid = rows.filter(r =>
      Object.keys(r).some(key => RECOGNIZED_KEYS.includes(normalize(key)) && String(r[key]).trim() !== "")
    );
    if (!valid.length) { toast({ title: "No valid rows", description: "Rows need at least one recognizable column (Company Name, Item, Amount, etc).", variant: "destructive" }); return; }
    importMutation.mutate(valid as any);
  };

  const getBranchName = (e: any) => (typeof e.branch === "object" ? (e.branch?.name || "") : (e.branch || ""));

  // Shared by both client-side fallback filters below ("All" page-size mode
  // and the export-time refetch) — mirrors every field the backend's
  // getEstimates search now also matches. `subject` isn't a real Estimate
  // field, but is left in place (pre-existing, harmless dead check).
  const estimateMatchesSearch = (e: any, q: string): boolean => {
    if (!q) return true;
    if ((e.subject || e.number || "").toLowerCase().includes(q)) return true;
    if (getBranchName(e).toLowerCase().includes(q)) return true;
    const companyName = e.contact_name || e.client?.company || e.client_id?.company || e.rel_id || "";
    if (String(companyName).toLowerCase().includes(q)) return true;
    if ((e.connectPerson || "").toLowerCase().includes(q)) return true;
    if ((e.phone || "").toLowerCase().includes(q)) return true;
    if ((e.mailId || "").toLowerCase().includes(q)) return true;
    if ((e.salesPerson || "").toLowerCase().includes(q)) return true;
    if ((e.items || []).some((item: any) => (item.description || "").toLowerCase().includes(q))) return true;
    return false;
  };

  // `estimates` is already filtered by search/branch — server-side when
  // paginated, client-side (over the full fetch) in "All" mode — so no
  // second filter pass is needed here.

  // One export row per line item — an estimate with 3 items produces 3 rows,
  // each repeating the estimate-level fields and varying only Item/Qty/Rate/Amount.
  const buildEstimateExportRows = (list: any[]) => list.flatMap((e: any) => {
    const companyName = e.contact_name || e.client?.company || e.client_id?.company || e.rel_id || "N/A";
    const estimateNumber = e.number || "";
    const rowBase = {
      "Estimate #": estimateNumber,
      "Company Name": companyName,
      "Connect Person": e.connectPerson || "",
      "Phone Number": e.phone || "",
      "Mail Id": e.mailId || "",
      "Sales Person": e.salesPerson || "",
      "Date": e.date ? new Date(e.date).toLocaleDateString("en-GB") : "",
      "Status": e.status || "draft",
      ...(canUseBranch ? { "Branch": getBranchName(e) } : {}),
      ...(canUseBankDetails ? { "Bank Details": e.bank_detail ? `${e.bank_detail.bankName || ""} — ${e.bank_detail.accountNumber || ""}` : "" } : {}),
    };
    const items = e.items?.length ? e.items : [{ description: "", qty: "", rate: "", amount: "" }];
    return items.map((item: any) => ({
      ...rowBase,
      "Item": item.description || "",
      "Quantity": item.qty ?? "",
      "Rate": item.rate ?? "",
      "Amount": item.amount ?? (item.qty && item.rate ? item.qty * item.rate : ""),
    }));
  });

  // Export needs the full filtered set, not just the current page — fetched
  // on demand only when the user actually exports.
  const loadAllFilteredEstimates = async () => {
    const response = await estimateService.getEstimates();
    const rows: any[] = (Array.isArray(response) ? response : response?.data || []).filter((item: any) => !item.form);
    const q = debouncedEstimateSearch.toLowerCase();
    return rows.filter((e: any) => {
      const matchesSearch = estimateMatchesSearch(e, q);
      const matchesBranch = branchFilter === "all" || getBranchName(e) === branchFilter;
      return matchesSearch && matchesBranch;
    });
  };

  // Same flattening as buildEstimateExportRows, but keeps a reference to the
  // parent estimate so the on-screen table can render one row per line item
  // while checkbox selection / view / edit / delete still target the parent.
  const tableRows = useMemo(() => estimates.flatMap((e: any) => {
    const companyName = e.contact_name || e.client?.company || e.client_id?.company || e.rel_id || "N/A";
    const rowBase = {
      estimate: e,
      companyName,
      connectPerson: e.connectPerson || "",
      phone: e.phone || "",
      mailId: e.mailId || "",
      salesPerson: e.salesPerson || "",
      date: e.date,
    };
    const items = e.items?.length ? e.items : [{ description: "", qty: "", rate: "", amount: "" }];
    return items.map((item: any, idx: number) => ({
      ...rowBase,
      key: `${e._id || e.id}-${idx}`,
      itemDescription: item.description || "",
      qty: item.qty ?? "",
      rate: item.rate ?? "",
      amount: item.amount ?? (item.qty && item.rate ? item.qty * item.rate : ""),
    }));
  }), [estimates]);

  // Pagination is per estimate document (matching how the server paginates),
  // not per flattened line-item row — "10 per page" means 10 estimates,
  // which can render as more or fewer table rows depending on item counts.
  const totalRows = estimatesResult?.total ?? 0;
  const pageSize = estimateItemsPerPage === "All" ? (totalRows || 1) : parseInt(estimateItemsPerPage);
  const totalPages = estimatesResult?.pages ?? 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = tableRows;
  const pageEstIds = [...new Set(paginatedRows.map((r: any) => r.estimate._id || r.estimate.id))] as string[];
  const allPageSelected = pageEstIds.length > 0 && pageEstIds.every(id => selectedIds.includes(id));

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8 animate-in fade-in duration-500">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Estimates</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Financial proposal documents</p>
            </div>
          </div>
          {can("Estimates", "Create") && (
            <Button
              className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
              onClick={() => navigate(`/admin/estimates/create`)}
            >
              <Plus className="h-4 w-4" />
              New Estimate
            </Button>
          )}
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: "Draft", color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200" },
            { label: "Sent", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
            { label: "Expired", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
            { label: "Declined", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
            { label: "Accepted", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
          ].map((status) => {
            const count = estimates.filter((e: any) => e.status?.toLowerCase() === status.label.toLowerCase()).length;
            const total = estimates
              .filter((e: any) => e.status?.toLowerCase() === status.label.toLowerCase())
              .reduce((sum: number, e: any) => sum + (e.total || 0), 0);

            return (
              <Card key={status.label} className={cn("border shadow-sm rounded-2xl overflow-hidden", status.bg, status.border)}>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-1">
                    <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", status.color)}>
                      {status.label}
                    </span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-xl font-black text-slate-900">{count}</span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {formatAmount(total)}
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
          <div className="flex flex-wrap items-center gap-3">
            <Select value={estimateItemsPerPage} onValueChange={(v) => { setEstimateItemsPerPage(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 w-[80px] bg-background border-none shadow-sm rounded-lg text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["10", "25", "50", "100", "All"].map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
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
                  <div className="space-y-1.5 pt-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Change Status</Label>
                    <Select value={bulkState.status} onValueChange={(val) => setBulkState({...bulkState, status: val})} disabled={bulkState.massDelete}>
                      <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-lg">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
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
              data={async () => buildEstimateExportRows(await loadAllFilteredEstimates())}
              filename="estimates"
              columns={[
                { header: "Estimate #", key: "Estimate #" },
                { header: "Company Name", key: "Company Name" },
                { header: "Connect Person", key: "Connect Person" },
                { header: "Phone Number", key: "Phone Number" },
                { header: "Mail Id", key: "Mail Id" },
                { header: "Item", key: "Item" },
                { header: "Quantity", key: "Quantity", type: "number" },
                { header: "Rate", key: "Rate", type: "number" },
                { header: "Amount", key: "Amount", type: "number" },
                { header: "Sales Person", key: "Sales Person" },
                { header: "Date", key: "Date" },
                { header: "Status", key: "Status" },
                ...(canUseBranch ? [{ header: "Branch", key: "Branch" }] : []),
                ...(canUseBankDetails ? [{ header: "Bank Details", key: "Bank Details" }] : []),
              ]}
            />
            <ImportDialog
              title="Import Estimates"
              columns={ESTIMATE_IMPORT_COLUMNS}
              onData={handleImportData}
              loading={importMutation.isPending}
              triggerLabel="Import"
              templateFilename="estimates_sample_import.xlsx"
              sheetName="Estimates"
              mappingNote="Your Excel columns (Company Name, Connect Person, Phone Number, Mail Id, Item, Quantity, Rate, Amount, Sales Person, Date, Branch) will be automatically detected and mapped to estimates."
            />
            {canUseBranch && (
              <Select value={branchFilter} onValueChange={(v) => { setBranchFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-9 w-[180px] bg-background border-none shadow-sm rounded-lg text-xs font-bold">
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
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search estimates or branch..."
              className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
              value={estimateSearch}
              onChange={(e) => { setEstimateSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* Estimates Table */}
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={() => toggleSelectAll(pageEstIds)}
                  />
                </TableHead>
                {["Company Name", "Connect Person", "Phone Number", "Mail Id", "Item", "Quantity", "Rate", "Amount", "Sales Person", "Date", ...(canUseBranch ? ["Branch"] : []), ...(canUseBankDetails ? ["Bank Details"] : []), "Actions"].map(h => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingEstimates ? (
                <SkeletonTableRows rows={6} colSpan={12 + (canUseBranch ? 1 : 0) + (canUseBankDetails ? 1 : 0)} />
              ) : tableRows.length === 0 ? (
                <TableEmpty colSpan={12 + (canUseBranch ? 1 : 0) + (canUseBankDetails ? 1 : 0)}>No estimates found.</TableEmpty>
              ) : (
                paginatedRows.map((row: any) => {
                  const est = row.estimate;
                  const estId = est._id || est.id;
                  return (
                    <TableRow key={row.key} className={`${selectedIds.includes(estId) ? 'bg-primary/5' : ''}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(estId)}
                          onCheckedChange={() => toggleSelect(estId)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{row.companyName}</div>
                        <button
                          className="text-[10px] font-bold text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer text-left"
                          onClick={() => setSelectedEstimate(est)}
                        >
                          {est.number || estId?.slice(-6).toUpperCase()}
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.connectPerson || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.phone ? (
                          <WhatsAppQuickChat
                            phone={row.phone}
                            data={{ customer_name: row.companyName, invoice_no: est.number || estId?.slice(-6).toUpperCase() }}
                          />
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.mailId || "-"}</TableCell>
                      <TableCell className="font-medium text-foreground">{row.itemDescription || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{row.qty !== "" ? row.qty : "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{row.rate !== "" ? formatRowAmount(est, Number(row.rate)) : "-"}</TableCell>
                      <TableCell className="font-black text-foreground">{row.amount !== "" ? formatRowAmount(est, Number(row.amount)) : "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{row.salesPerson || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{row.date ? formatDate(row.date) : "-"}</TableCell>
                      {canUseBranch && (
                        <TableCell className="text-muted-foreground">
                          {getBranchName(est) || "-"}
                        </TableCell>
                      )}
                      {canUseBankDetails && (
                        <TableCell className="text-muted-foreground">
                          {est.bank_detail ? `${est.bank_detail.bankName || ""} — ${est.bank_detail.accountNumber || ""}` : "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        <TableActions
                          onView={() => setPreviewEstimate(est)}
                          onEdit={can("Estimates", "Edit") ? () => navigate(`/admin/estimates/edit/${estId}`) : undefined}
                          onDelete={can("Estimates", "Delete") ? () => deleteMutation.mutate(estId) : undefined}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <TablePagination page={safePage} pageSize={pageSize} total={totalRows} onPageChange={setCurrentPage} />
        </TableContainer>
      </div>

      {/* Centered popup dialog */}
      <Dialog open={!!selectedEstimate} onOpenChange={(open) => { if (!open) { setSelectedEstimate(null); setIsFullscreen(false); } }}>
        <DialogContent className={cn("w-full p-0 overflow-hidden rounded-2xl transition-all", isFullscreen ? "max-w-[95vw]" : "max-w-3xl")}>
          {selectedEstimate && (
            <EstimateDetailPanel
              estimate={selectedEstimate}
              onClose={() => setSelectedEstimate(null)}
              onView={() => {
                setPreviewEstimate(selectedEstimate);
                setSelectedEstimate(null);
              }}
              isFullscreen={isFullscreen}
              setIsFullscreen={setIsFullscreen}
              onEdit={() => {
                navigate(`/admin/estimates/edit/${selectedEstimate._id || selectedEstimate.id}`);
                setSelectedEstimate(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Custom preview dialog */}
      <DocumentPreviewDialog
        open={!!previewEstimate}
        onOpenChange={(open) => { if (!open) setPreviewEstimate(null); }}
        type="estimate"
        data={previewEstimate}
      />
    </DashboardLayout>
  );
};

export default Estimates;

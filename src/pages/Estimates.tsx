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
import { useState, useMemo, useRef } from "react";
import { formatDate } from "@/lib/dateFormat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { estimateService } from "@/api/services/estimate.service";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { ExportButton } from "@/components/ui/export-button";
import { ImportButton } from "@/components/ui/import-button";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";
import { useCurrency } from "@/context/CurrencyContext";
import { financeService } from "@/api/services/finance.service";

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
                              <td className="px-3 py-2.5 text-muted-foreground align-top">{formatRowAmount(d, Number(item.rate || item.price || 0))}</td>
                              <td className="px-3 py-2.5 text-muted-foreground align-top">{item.tax ? `${item.tax}%` : "0%"}</td>
                              <td className="px-3 py-2.5 font-bold text-foreground align-top">{formatRowAmount(d, Number((item.qty || 1) * (item.rate || item.price || 0)))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
  const [estimateItemsPerPage, setEstimateItemsPerPage] = useState("10");
  const [selectedEstimate, setSelectedEstimate] = useState<any>(null);
  const [previewEstimate, setPreviewEstimate] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const navigate = useNavigate();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatAmount, symbol } = useCurrency();

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

  const toggleSelectAll = (items: any[]) => {
    setSelectedIds(prev => prev.length === items.length ? [] : items.map(i => i._id || i.id));
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) {
      toast({ title: "Error", description: "No items selected.", variant: "destructive" });
      return;
    }
    setIsBulkLoading(true);
    try {
      if (bulkState.massDelete) {
        await Promise.all(selectedIds.map(id => estimateService.deleteEstimate(id)));
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
      toast({ title: "Error", description: "Failed to perform bulk action.", variant: "destructive" });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const { data: allData = [], isLoading: isLoadingEstimates } = useQuery({
    queryKey: ["estimates"],
    queryFn: async () => {
      const response = await estimateService.getEstimates();
      return Array.isArray(response) ? response : response?.data || [];
    },
  });

  const estimates = useMemo(
    () => allData.filter((item: any) => !item.form),
    [allData]
  );

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
    const valid = rows.filter(r => r["subject"] || r["Subject"] || r["company"] || r["Company"] || r["total"] || r["Total"] || r["Estimate #"] || r["To"]);
    if (!valid.length) { toast({ title: "No valid rows", description: "Rows need at least a subject or company column.", variant: "destructive" }); return; }
    importMutation.mutate(valid as any);
  };

  const filtered = estimates.filter((e: any) => 
    (e.subject || e.number || "").toLowerCase().includes(estimateSearch.toLowerCase())
  );

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
          <div className="flex items-center gap-3">
            <Select value={estimateItemsPerPage} onValueChange={setEstimateItemsPerPage}>
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
                toast({ title: "Error", description: "Please select at least one item first.", variant: "destructive" });
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
              data={filtered}
              filename="estimates"
              columns={[
                { header: "Estimate #", key: (e) => e.number || e._id },
                { header: "Subject", key: "subject" },
                { header: "To", key: (e) => e.contact_name || e.client_id?.company || e.rel_id || "N/A" },
                { header: "Total", key: "total" },
                { header: "Date", key: "date" },
                { header: "Status", key: "status" }
              ]}
            />
            <ImportButton onData={handleImportData} loading={importMutation.isPending} />
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search estimates..."
              className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
              value={estimateSearch}
              onChange={(e) => setEstimateSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Estimates Table */}
        <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
              <tr>
                <th className="w-10 px-3 py-4">
                  {(() => {
                    const pageData = filtered.slice(0, estimateItemsPerPage === "All" ? filtered.length : parseInt(estimateItemsPerPage));
                    return (
                      <Checkbox
                        checked={selectedIds.length === pageData.length && pageData.length > 0}
                        onCheckedChange={() => toggleSelectAll(pageData)}
                      />
                    );
                  })()}
                </th>
                {["Estimate #", "Subject", "To", "Total", "Date", "Open Till", "Tags", "Date Created", "Status", "Actions"].map(h => (
                  <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoadingEstimates ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={11} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-muted-foreground italic">
                    No estimates found.
                  </td>
                </tr>
              ) : (
                filtered.map((est: any) => (
                  <tr key={est._id || est.id} className={`hover:bg-muted/30 transition-colors ${selectedIds.includes(est._id || est.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={selectedIds.includes(est._id || est.id)}
                        onCheckedChange={() => toggleSelect(est._id || est.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className="font-bold text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer text-left"
                        onClick={() => setSelectedEstimate(est)}
                      >
                        {est.number || (est._id || est.id)?.slice(-6).toUpperCase()}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">{est.subject}</td>
                    <td className="px-6 py-4 text-muted-foreground">{est.contact_name || est.client_id?.company || est.rel_id || "N/A"}</td>
                    <td className="px-6 py-4 font-black text-foreground">{formatRowAmount(est, est.total || 0)}</td>
                    <td className="px-6 py-4 text-muted-foreground">{est.date ? formatDate(est.date) : "-"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{est.open_till ? formatDate(est.open_till) : "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {est.tags?.map((tag: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[9px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-none">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{est.createdAt ? formatDate(est.createdAt) : "-"}</td>
                    <td className="px-6 py-4">
                      <Badge className={cn(
                        "text-[10px] font-black uppercase tracking-widest border-none px-3 py-1",
                        est.status?.toLowerCase() === "draft" ? "bg-slate-100 text-slate-600" :
                        est.status?.toLowerCase() === "sent" ? "bg-blue-50 text-blue-600" :
                        est.status?.toLowerCase() === "accepted" ? "bg-emerald-50 text-emerald-600" :
                        est.status?.toLowerCase() === "declined" ? "bg-red-50 text-red-600" :
                        est.status?.toLowerCase() === "expired" ? "bg-amber-50 text-amber-600" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {est.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <TableActions
                        onView={() => setPreviewEstimate(est)}
                        onEdit={can("Estimates", "Edit") ? () => navigate(`/admin/estimates/edit/${est._id || est.id}`) : undefined}
                        onDelete={can("Estimates", "Delete") ? () => deleteMutation.mutate(est._id || est.id) : undefined}
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
            Showing 1 to {filtered.length} of {filtered.length} entries
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Previous</Button>
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">1</div>
            <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Next</Button>
          </div>
        </div>
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

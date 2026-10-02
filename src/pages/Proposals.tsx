import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useRef, useEffect } from "react";
import { Search, FileText, Plus, Zap, Mail, Eye, Maximize2, Pencil, ChevronDown } from "lucide-react";
import { formatDate } from "@/lib/dateFormat";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTableRows } from "@/components/ui/skeleton-table-rows";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { isTrinetraPilotUser } from "@/lib/trinetraPilot";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { ExportButton } from "@/components/ui/export-button";
import { ImportDialog, type ImportColumn } from "@/components/ui/import-dialog";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";
import { WhatsAppQuickChat } from "@/components/shared/WhatsAppQuickChat";
import { useCurrency } from "@/context/CurrencyContext";
import { financeService } from "@/api/services/finance.service";
import { hrmsbranchService } from "@/api/services/hrmsbranch.service";

const PROPOSAL_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "Subject", sample: "Q3 Marketing Proposal", required: true, core: true },
  { key: "Company", sample: "Bright Solutions Pvt Ltd", required: true, core: true },
  { key: "Total", sample: 50000, core: true },
  { key: "Date", sample: "27-08-2026", core: true },
  { key: "Branch", sample: "Delhi", core: true },
  { key: "Status", sample: 1, core: false },
];

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  "1": { label: "Draft", className: "bg-muted text-muted-foreground" },
  "2": { label: "Sent", className: "bg-blue-500/10 text-blue-500" },
  "3": { label: "Open", className: "bg-primary/10 text-primary" },
  "4": { label: "Revised", className: "bg-orange-500/10 text-orange-500" },
  "5": { label: "Declined", className: "bg-destructive/10 text-destructive" },
  "6": { label: "Accepted", className: "bg-green-500/10 text-green-500" },
};

const getStatus = (status: any) => STATUS_MAP[String(status)] ?? { label: "Unknown", className: "bg-muted text-muted-foreground" };

const DETAIL_TABS = ["Proposal", "Comments", "Reminders", "Tasks", "Notes", "Templates"];

const ProposalDetailPanel = ({ proposal, onClose, onEdit, onView, isFullscreen, setIsFullscreen }: {
  proposal: any;
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
  const { data: currencies = [] } = useQuery<any>({
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
  const proposalNumber = (proposal._id || proposal.id)?.slice(-6).toUpperCase();
  const status = getStatus(proposal.status);
  const [activeTab, setActiveTab] = useState("Proposal");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [commentText, setCommentText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => salesService.updateProposal(d._id || d.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposal-detail", proposal._id || proposal.id] });
      toast({ title: "Status Updated", description: "Proposal status updated successfully.", className: "bg-green-600 text-white font-bold rounded-2xl" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update status.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesService.deleteProposal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({ title: "Deleted", description: "Proposal deleted successfully.", className: "bg-green-600 text-white font-bold rounded-2xl" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete proposal.", variant: "destructive" });
    }
  });

  const handleCopy = () => {
    const link = `${window.location.origin}/proposal/${d._id || d.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied",
      description: "Proposal link copied to clipboard!",
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
  const [ccEmail, setCcEmail] = useState("");
  const [attachPdf, setAttachPdf] = useState(true);

  const { data: detail, isLoading } = useQuery({
    queryKey: ["proposal-detail", proposal._id || proposal.id],
    queryFn: () => salesService.getProposalById(proposal._id || proposal.id).then((res: any) => res.data || res),
    enabled: !!(proposal._id || proposal.id),
  });

  const d = detail || proposal;

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
                <DropdownMenuItem onClick={onView}>View Proposal</DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>Attach File</DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopy}>Copy</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("2")}>Mark as Sent</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("3")}>Mark as Open</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("4")}>Mark as Revised</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("5")}>Mark as Declined</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("6")}>Mark as Accepted</DropdownMenuItem>
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
                <DropdownMenuItem onClick={() => navigate("/admin/estimates/create", { state: { prepopulate: d } })}>
                  Estimate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/invoices/create", { state: { prepopulate: d } })}>
                  Invoice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="px-6 py-5 overflow-y-auto max-h-[60vh]">
          {/* Proposal tab */}
          {activeTab === "Proposal" && (
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
                      <p className="text-base font-bold text-primary">PRO-{proposalNumber}</p>
                      <p className="text-sm font-semibold text-muted-foreground mt-0.5">{d.subject || d.title}</p>
                      {d.company && <p className="text-sm font-bold text-foreground mt-3">{d.company}</p>}
                      {d.address && <p className="text-xs text-muted-foreground">{d.address}</p>}
                      {(d.city || d.state) && (
                        <p className="text-xs text-muted-foreground">{[d.city, d.state, d.zip].filter(Boolean).join(" ")}</p>
                      )}
                      {d.country && <p className="text-xs text-muted-foreground">{d.country}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground mb-0.5">To:</p>
                      <p className="text-sm font-semibold text-primary">{d.proposal_to || d.rel_id || d.customer || "—"}</p>
                      {d.phone && (
                        <WhatsAppQuickChat
                          phone={d.phone}
                          data={{ customer_name: d.company || d.proposal_to || d.customer, invoice_no: `PRO-${proposalNumber}` }}
                          className="mt-2"
                        />
                      )}
                      {d.email && <p className="text-xs text-primary">{d.email}</p>}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/30 text-right">
                    <button className="text-xs text-primary hover:underline">Available merge fields</button>
                  </div>
                </div>

                {/* Items / proposal body */}
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
                            {formatRowAmount(d, Number(d.total || d.amount || 0))}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground font-mono">{"{proposal_items}"}</p>
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

      {/* ── Send Proposal Email Dialog ── */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Send Proposal to Email</h2>

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
                  defaultValue={`Dear {proposal_proposal_to}\n\nPlease find our attached proposal.\n\nThis proposal is valid until: {proposal_open_till}\nYou can view the proposal on the following link: {proposal_number}\n\nPlease don't hesitate to comment online if you have any questions.\n\nWe look forward to your communication.\n\nKind Regards,\n{email_signature}`}
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

const Proposals = () => {
  const [proposalSearch, setProposalSearch] = useState("");
  const [debouncedProposalSearch, setDebouncedProposalSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedProposalSearch(proposalSearch.trim()), 350);
    return () => clearTimeout(t);
  }, [proposalSearch]);
  const [proposalItemsPerPage, setProposalItemsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [previewProposal, setPreviewProposal] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();
  const { can, user, isModuleEnabled } = usePermissions();
  const isPilot = isTrinetraPilotUser(user?.email);
  // Branch is sourced from the HRMS module — only show it when the
  // tenant's plan actually includes HRMS, even for a pilot-flagged user.
  const canUseBranch = isPilot && isModuleEnabled("hrms");
  const [branchFilter, setBranchFilter] = useState("all");
  const { data: branchesRaw = [] } = useQuery<any[]>({
    queryKey: ["hrms-branches-list"],
    queryFn: () => hrmsbranchService.getAll().then((r) => r.data || []),
    enabled: canUseBranch,
    staleTime: 5 * 60 * 1000,
  });
  const branches: { _id: string; name: string }[] = branchesRaw;
  const { formatAmount, symbol } = useCurrency();
  const { data: currencies = [] } = useQuery<any>({
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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedProposals, setSelectedProposals] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({ massDelete: false, status: "" });
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const getProposalBranchName = (p: any) => (typeof p.branch === "object" ? (p.branch?.name || "") : (p.branch || ""));

  // Shared by both client-side fallback filters below ("All" page-size mode
  // and the export-time refetch). The backend searches `proposal_to`, but
  // the client fallback searches what's actually shown in the "To" column
  // (rel_id/customer) so "some pages" vs "all pages" mode stay internally
  // consistent — see resolveProposalNames in proposal_controller.js.
  const proposalMatchesSearch = (p: any, q: string): boolean => {
    if (!q) return true;
    if ((p.subject || p.title || "").toLowerCase().includes(q)) return true;
    if (getProposalBranchName(p).toLowerCase().includes(q)) return true;
    const toValue = p.proposal_to || p.rel_id || p.customer || "";
    if (String(toValue).toLowerCase().includes(q)) return true;
    if ((getStatus(p.status).label || "").toLowerCase().includes(q)) return true;
    if (p.tags && String(p.tags).toLowerCase().includes(q)) return true;
    return false;
  };

  interface ProposalsPage { rows: any[]; total: number; pages: number }
  const { data: proposalsResult, isLoading: isLoadingProposals } = useQuery<ProposalsPage>({
    queryKey: ["proposals", proposalItemsPerPage, currentPage, debouncedProposalSearch, branchFilter],
    queryFn: async () => {
      if (proposalItemsPerPage === "All") {
        const response = await salesService.getProposals();
        const rows: any[] = Array.isArray(response) ? response : response?.data || [];
        const q = debouncedProposalSearch.toLowerCase();
        const rowsFiltered = rows.filter((p: any) => {
          const matchesSearch = proposalMatchesSearch(p, q);
          const matchesBranch = branchFilter === "all" || getProposalBranchName(p) === branchFilter;
          return matchesSearch && matchesBranch;
        });
        return { rows: rowsFiltered, total: rowsFiltered.length, pages: 1 };
      }

      const res: any = await salesService.getProposals({
        page: currentPage,
        limit: proposalItemsPerPage,
        search: debouncedProposalSearch || undefined,
        branch: branchFilter !== "all" ? branchFilter : undefined,
      });
      if (Array.isArray(res)) return { rows: [], total: 0, pages: 1 };
      return { rows: res?.data ?? [], total: res?.total ?? 0, pages: res?.pages ?? 1 };
    },
    placeholderData: keepPreviousData,
  });
  const proposals: any[] = proposalsResult?.rows ?? [];

  const importMutation = useMutation({
    mutationFn: (rows: any[]) => salesService.importProposals(rows),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      const count = data?.data?.count ?? data?.count ?? 0;
      const skipped = data?.data?.skipped ?? data?.skipped ?? 0;
      toast({ title: count === 0 ? "No New Proposals" : "Import Successful", description: count === 0 ? "All proposals already exist." : `Imported ${count} proposal(s)${skipped ? `, skipped ${skipped} duplicate(s)` : ""}.`, variant: count === 0 ? "destructive" : "default" });
    },
    onError: (err: any) => toast({ title: "Import Failed", description: err?.response?.data?.message || err.message, variant: "destructive" }),
  });

  const handleImportData = (rows: Record<string, any>[]) => {
    const valid = rows.filter(r => r["subject"] || r["Subject"]);
    if (!valid.length) { toast({ title: "No valid rows", description: "Each row needs a 'subject' or 'Subject' column.", variant: "destructive" }); return; }
    importMutation.mutate(valid as any);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesService.deleteProposal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({ title: "Deleted", description: "Proposal deleted successfully.", className: "bg-green-600 text-white font-bold rounded-2xl" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete proposal.", variant: "destructive" });
    }
  });


  const handleBulkAction = async () => {
    if (selectedProposals.length === 0) {
      toast({ title: "Error", description: "No items selected." });
      return;
    }
    setIsBulkLoading(true);
    try {
      if (bulkState.massDelete) {
        await salesService.bulkDeleteProposals(selectedProposals);
        toast({ title: "Success", description: `Deleted ${selectedProposals.length} items.` });
      } else if (bulkState.status) {
        await Promise.all(selectedProposals.map(id => salesService.updateProposal(id, { status: bulkState.status })));
        toast({ title: "Success", description: `Updated ${selectedProposals.length} items.` });
      }
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      setSelectedProposals([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false, status: "" });
    } catch {
      toast({ title: "Error", description: "Failed to perform bulk action." });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const totalRows = proposalsResult?.total ?? 0;
  const pageSize = proposalItemsPerPage === "All" ? (totalRows || 1) : parseInt(proposalItemsPerPage);
  const totalPages = proposalsResult?.pages ?? 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProposals = proposals;
  const pageIds = paginatedProposals.map((p: any) => p._id || p.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id: string) => selectedProposals.includes(id));

  // Export needs the full filtered set, not just the current page — fetched
  // on demand only when the user actually exports.
  const loadAllFilteredProposals = async () => {
    const response = await salesService.getProposals();
    const rows: any[] = Array.isArray(response) ? response : response?.data || [];
    const q = debouncedProposalSearch.toLowerCase();
    return rows.filter((p: any) => {
      const matchesSearch = proposalMatchesSearch(p, q);
      const matchesBranch = branchFilter === "all" || getProposalBranchName(p) === branchFilter;
      return matchesSearch && matchesBranch;
    });
  };

  const handleSelectAll = () => {
    setSelectedProposals(prev =>
      allPageSelected ? prev.filter(id => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8 animate-in fade-in duration-500">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Proposals</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Manage commercial proposals and quotes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {can("Proposals", "Create") && (
              <Button
                className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
                onClick={() => navigate(`/admin/proposals/create`)}
              >
                <Plus className="h-4 w-4" />
                New Proposal
              </Button>
            )}
          </div>
        </div>

        {/* Table Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={proposalItemsPerPage} onValueChange={(v) => { setProposalItemsPerPage(v); setCurrentPage(1); }}>
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
              if (open && selectedProposals.length === 0) {
                toast({ title: "Error", description: "Please select at least one item first." });
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
                      onCheckedChange={(checked) => setBulkState({ ...bulkState, massDelete: checked as boolean })}
                    />
                    <Label htmlFor="mass_delete" className="text-sm font-semibold text-red-600">Mass Delete</Label>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Change Status</Label>
                    <Select value={bulkState.status} onValueChange={(val) => setBulkState({ ...bulkState, status: val })} disabled={bulkState.massDelete}>
                      <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-lg">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Draft</SelectItem>
                        <SelectItem value="2">Sent</SelectItem>
                        <SelectItem value="3">Open</SelectItem>
                        <SelectItem value="4">Revised</SelectItem>
                        <SelectItem value="5">Declined</SelectItem>
                        <SelectItem value="6">Accepted</SelectItem>
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
              data={loadAllFilteredProposals}
              filename="proposals"
              columns={[
                { header: "Proposal #", key: (p) => p.number || p._id },
                { header: "Subject", key: "subject" },
                { header: "To", key: (p) => p.proposal_to || p.rel_id || p.customer || "N/A" },
                { header: "Total", key: (p) => p.total || p.amount || "0" },
                { header: "Date", key: "date" },
                { header: "Status", key: "status" },
                ...(canUseBranch ? [{ header: "Branch", key: (p: any) => (typeof p.branch === "object" ? (p.branch?.name || "-") : (p.branch || "-")) }] : []),
              ]}
            />
            <ImportDialog
              title="Import Proposals"
              columns={PROPOSAL_IMPORT_COLUMNS}
              onData={handleImportData}
              loading={importMutation.isPending}
              triggerLabel="Import"
              templateFilename="proposals_sample_import.xlsx"
              sheetName="Proposals"
              mappingNote="Your Excel columns (Subject, Company, Total, Date, Branch) will be automatically detected and mapped to proposals. Company must match an existing customer."
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
              placeholder="Search proposals or branch..."
              className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
              value={proposalSearch}
              onChange={(e) => { setProposalSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* Proposals Table */}
        <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
              <tr>
                <th className="p-3 font-medium w-8">
                  <input
                    type="checkbox"
                    className="rounded border-border"
                    checked={allPageSelected}
                    onChange={handleSelectAll}
                  />
                </th>
                {[
                  "Proposal #", "Subject", "To", "Total", "Date", "Open Till", "Tags", "Date Created", "Status",
                  ...(canUseBranch ? ["Branch"] : []),
                  "Actions",
                ].map(h => (
                  <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoadingProposals ? (
                <SkeletonTableRows rows={6} colSpan={11 + (canUseBranch ? 1 : 0)} />
              ) : paginatedProposals.length === 0 ? (
                <tr>
                  <td colSpan={11 + (canUseBranch ? 1 : 0)} className="px-6 py-12 text-center text-muted-foreground italic">
                    No proposals found.
                  </td>
                </tr>
              ) : (
                paginatedProposals.map((prop: any) => {
                  const status = getStatus(prop.status);
                  const proposalNum = (prop._id || prop.id)?.slice(-6).toUpperCase();
                  return (
                    <tr
                      key={prop._id || prop.id}
                      className={`hover:bg-muted/30 transition-colors ${selectedProposals.includes(prop._id || prop.id) ? 'bg-primary/5' : ''}`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          className="rounded border-border"
                          checked={selectedProposals.includes(prop._id || prop.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedProposals(prev => [...prev, prop._id || prop.id]);
                            else setSelectedProposals(prev => prev.filter(id => id !== (prop._id || prop.id)));
                          }}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          className="font-bold text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer"
                          onClick={() => setSelectedProposal(prop)}
                        >
                          {proposalNum}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">{prop.subject || prop.title}</td>
                      <td className="px-6 py-4 text-muted-foreground">{prop.rel_id || prop.customer || "N/A"}</td>
                      <td className="px-6 py-4 font-black text-foreground">{formatRowAmount(prop, prop.total || prop.amount || 0)}</td>
                      <td className="px-6 py-4 text-muted-foreground">{prop.date ? formatDate(prop.date) : "-"}</td>
                      <td className="px-6 py-4 text-muted-foreground">{prop.open_till ? formatDate(prop.open_till) : "-"}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {prop.tags?.map((tag: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[9px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-none">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{prop.createdAt ? formatDate(prop.createdAt) : "-"}</td>
                      <td className="px-6 py-4">
                        <Badge className={cn("text-[10px] font-black uppercase tracking-widest border-none px-3 py-1", status.className)}>
                          {status.label}
                        </Badge>
                      </td>
                      {canUseBranch && (
                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                          {typeof prop.branch === "object" ? (prop.branch?.name || "-") : (prop.branch || "-")}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <TableActions
                          onView={() => setPreviewProposal(prop)}
                          onEdit={can("Proposals", "Edit") ? () => navigate(`/admin/proposals/edit/${prop._id || prop.id}`) : undefined}
                          onDelete={can("Proposals", "Delete") ? () => deleteMutation.mutate(prop._id || prop.id) : undefined}
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
            Showing {totalRows === 0 ? 0 : (safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, totalRows)} of {totalRows} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-4 rounded-lg font-bold text-xs"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              Previous
            </Button>
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">{safePage}</div>
            <span className="text-xs text-muted-foreground px-1">of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-4 rounded-lg font-bold text-xs"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Centered popup dialog */}
      <Dialog open={!!selectedProposal} onOpenChange={(open) => { if (!open) { setSelectedProposal(null); setIsFullscreen(false); } }}>
        <DialogContent className={cn("w-full p-0 overflow-hidden rounded-2xl transition-all", isFullscreen ? "max-w-[95vw]" : "max-w-3xl")}>
          {selectedProposal && (
            <ProposalDetailPanel
              proposal={selectedProposal}
              onClose={() => setSelectedProposal(null)}
              onView={() => {
                setPreviewProposal(selectedProposal);
                setSelectedProposal(null);
              }}
              isFullscreen={isFullscreen}
              setIsFullscreen={setIsFullscreen}
              onEdit={() => {
                navigate(`/admin/proposals/edit/${selectedProposal._id || selectedProposal.id}`);
                setSelectedProposal(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Custom preview dialog */}
      <DocumentPreviewDialog
        open={!!previewProposal}
        onOpenChange={(open) => { if (!open) setPreviewProposal(null); }}
        type="proposal"
        data={previewProposal}
      />
    </DashboardLayout>
  );
};

export default Proposals;

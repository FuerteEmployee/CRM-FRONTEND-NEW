import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Send, FileText } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/dateFormat";
import { cn } from "@/lib/utils";

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "proposal" | "estimate" | "invoice";
  data: any;
}

export function DocumentPreviewDialog({ open, onOpenChange, type, data }: DocumentPreviewDialogProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "discussion">("summary");
  const [commentText, setCommentText] = useState("");
  
  // Custom interactive comment state per session
  const [sessionComments, setSessionComments] = useState<Array<{ id: number; author: string; text: string; date: string }>>([
    { id: 1, author: "System Log", text: `${type.toUpperCase()} created successfully.`, date: "Just now" }
  ]);

  if (!data) return null;

  const isProposal = type === "proposal";
  const isEstimate = type === "estimate";
  const isInvoice = type === "invoice";

  // Currency helper
  const currencySymbol = isInvoice ? "₹" : "$";

  // Document Number extraction
  let num = "";
  if (isProposal) {
    num = `PRO-${(data._id || data.id)?.slice(-6).toUpperCase()}`;
  } else if (isEstimate) {
    num = data.number || `EST-${(data._id || data.id)?.slice(-6).toUpperCase()}`;
  } else {
    num = data.number || `INV-${(data._id || data.id)?.substring(0, 6).toUpperCase()}`;
  }

  // Document Subject/Title extraction
  const subject = data.subject || data.title || (isInvoice ? "Corporate Invoice" : "Commercial Document");

  // Date formatted
  const date = data.date ? formatDate(data.date) : "-";

  // Expiry or Due Date
  let expiryDate = "-";
  if (isProposal) {
    expiryDate = data.open_till ? formatDate(data.open_till) : "-";
  } else if (isEstimate) {
    expiryDate = data.open_till || data.estimate_expirydate ? formatDate(data.open_till || data.estimate_expirydate) : "-";
  } else {
    expiryDate = data.duedate ? formatDate(data.duedate) : "-";
  }
  const expiryLabel = isInvoice ? "Due Date" : "Open Till";

  // Status mapping
  let statusLabel = "Draft";
  let statusClass = "bg-slate-100 text-slate-600";
  if (isProposal) {
    const sMap: any = { 
      "1": { label: "Draft", className: "bg-muted text-muted-foreground" },
      "2": { label: "Sent", className: "bg-blue-500/10 text-blue-500" },
      "3": { label: "Open", className: "bg-primary/10 text-primary" },
      "4": { label: "Revised", className: "bg-orange-500/10 text-orange-500" },
      "5": { label: "Declined", className: "bg-destructive/10 text-destructive" },
      "6": { label: "Accepted", className: "bg-green-500/10 text-green-500" },
    };
    const s = sMap[String(data.status)] ?? { label: "Unknown", className: "bg-muted text-muted-foreground" };
    statusLabel = s.label;
    statusClass = s.className;
  } else if (isEstimate) {
    statusLabel = data.status || "Draft";
    statusClass = 
      statusLabel.toLowerCase() === "draft" ? "bg-slate-100 text-slate-600" :
      statusLabel.toLowerCase() === "sent" ? "bg-blue-50 text-blue-600" :
      statusLabel.toLowerCase() === "accepted" ? "bg-emerald-50 text-emerald-600" :
      statusLabel.toLowerCase() === "declined" ? "bg-red-50 text-red-600" :
      statusLabel.toLowerCase() === "expired" ? "bg-amber-50 text-amber-600" :
      "bg-muted text-muted-foreground";
  } else {
    const sMap: any = {
      1: { label: "Unpaid", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
      2: { label: "Paid", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      3: { label: "Partially Paid", className: "bg-blue-50 text-blue-700 border-blue-200" },
      4: { label: "Overdue", className: "bg-rose-50 text-rose-700 border-rose-200" },
      5: { label: "Cancelled", className: "bg-slate-50 text-slate-700 border-slate-200" },
    };
    const s = sMap[Number(data.status)] ?? { label: "Unpaid", className: "bg-yellow-50 text-yellow-700 border-yellow-200" };
    statusLabel = s.label;
    statusClass = s.className;
  }

  // Client Details
  const clientCompany = isProposal
    ? (data.company || data.proposal_to || data.customer || "N/A")
    : isEstimate
    ? (data.client_id?.company || data.contact_name || data.rel_id || "N/A")
    : (data.client?.company || "N/A");

  const clientAddress = isProposal
    ? data.address
    : isEstimate
    ? data.billing_street
    : data.client?.address;

  const clientCityStateZip = isProposal
    ? [data.city, data.state, data.zip].filter(Boolean).join(" ")
    : isEstimate
    ? [data.billing_city, data.billing_state, data.billing_zip].filter(Boolean).join(" ")
    : [data.client?.city, data.client?.state, data.client?.zip].filter(Boolean).join(" ");

  const clientCountry = isProposal
    ? data.country
    : isEstimate
    ? data.billing_country
    : data.client?.country;

  const clientEmail = isProposal
    ? data.email
    : isEstimate
    ? data.email || data.client_id?.email
    : data.client?.email;

  const items = data.items || [];
  const subtotal = data.subtotal || 0;
  const discountPercent = data.discount_percent || 0;
  const totalTax = data.total_tax || 0;
  const adjustment = data.adjustment || 0;
  const total = data.total || data.amount || 0;

  // Print Logic for PDF Download
  const handlePrint = () => {
    window.print();
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    setSessionComments(prev => [
      ...prev,
      {
        id: Date.now(),
        author: "Me (User)",
        text: commentText,
        date: "Just now"
      }
    ]);
    setCommentText("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-5xl rounded-3xl p-6 md:p-8 overflow-y-auto max-h-[90vh] bg-background border border-border shadow-2xl">
        
        {/* Printable Area starts */}
        <div className="flex flex-col space-y-6 print:p-0">
          
          {/* Header Row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border/50 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                  <span>{num}</span>
                  <Badge variant="outline" className={cn("text-xs font-black uppercase tracking-widest px-2.5 py-0.5 border-none", statusClass)}>
                    {statusLabel}
                  </Badge>
                </h1>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                  {subject}
                </p>
              </div>
            </div>

            {/* Print / Download Button */}
            <div className="flex items-center gap-2 self-stretch md:self-auto print:hidden">
              <Button 
                onClick={handlePrint} 
                className="w-full md:w-auto rounded-xl font-bold gap-2 shadow-lg shadow-primary/20 px-5 uppercase text-xs tracking-widest bg-primary text-primary-foreground hover:bg-primary/95"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column - Document Content (Table) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Client Info Block */}
              <div className="bg-muted/10 border border-border/50 rounded-2xl p-5 shadow-sm">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Recipient Information</p>
                <h2 className="text-base font-extrabold text-foreground">{clientCompany}</h2>
                {clientAddress && <p className="text-xs text-muted-foreground mt-1">{clientAddress}</p>}
                {clientCityStateZip && <p className="text-xs text-muted-foreground">{clientCityStateZip}</p>}
                {clientCountry && <p className="text-xs text-muted-foreground">{clientCountry}</p>}
                {clientEmail && <p className="text-xs font-semibold text-primary mt-2">{clientEmail}</p>}
              </div>

              {/* Items Table container */}
              <div className="border border-border/50 rounded-2xl overflow-hidden bg-background shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-4 py-3 text-left w-12">#</th>
                      <th className="px-4 py-3 text-left">Item Description</th>
                      <th className="px-4 py-3 text-left w-16">Qty</th>
                      <th className="px-4 py-3 text-left w-24">Rate</th>
                      <th className="px-4 py-3 text-left w-16">Tax</th>
                      <th className="px-4 py-3 text-left w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {items.length > 0 ? (
                      items.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3.5 text-foreground font-bold text-xs">{i + 1}</td>
                          <td className="px-4 py-3.5 align-top">
                            <div className="font-extrabold text-foreground text-xs">{item.description || item.name || "—"}</div>
                            {item.long_description && (
                              <div className="text-[10px] text-muted-foreground mt-0.5 whitespace-pre-wrap">
                                {item.long_description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground text-xs">{item.qty || item.quantity || 1}</td>
                          <td className="px-4 py-3.5 text-muted-foreground text-xs">{currencySymbol}{Number(item.rate || item.price || 0).toFixed(2)}</td>
                          <td className="px-4 py-3.5 text-muted-foreground text-xs">{item.tax ? `${item.tax}%` : "0%"}</td>
                          <td className="px-4 py-3.5 font-bold text-foreground text-xs">
                            {currencySymbol}{Number((item.qty || 1) * (item.rate || item.price || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground italic text-xs">
                          No items added to this document.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Pricing summary */}
                <div className="flex flex-col items-end gap-2 p-5 bg-muted/5 border-t border-border/30">
                  {subtotal !== undefined && (
                    <div className="flex justify-between w-64 text-xs">
                      <span className="text-muted-foreground font-semibold">Sub Total:</span>
                      <span className="font-bold text-foreground">{currencySymbol}{Number(subtotal).toFixed(2)}</span>
                    </div>
                  )}
                  {discountPercent > 0 && (
                    <div className="flex justify-between w-64 text-xs text-destructive">
                      <span className="font-semibold">Discount ({discountPercent}%):</span>
                      <span className="font-bold">-{currencySymbol}{Number(subtotal * (discountPercent / 100)).toFixed(2)}</span>
                    </div>
                  )}
                  {totalTax > 0 && (
                    <div className="flex justify-between w-64 text-xs">
                      <span className="text-muted-foreground font-semibold">Total Tax:</span>
                      <span className="font-bold text-foreground">{currencySymbol}{Number(totalTax).toFixed(2)}</span>
                    </div>
                  )}
                  {adjustment !== 0 && adjustment !== undefined && (
                    <div className="flex justify-between w-64 text-xs">
                      <span className="text-muted-foreground font-semibold">Adjustment:</span>
                      <span className="font-bold text-foreground">{currencySymbol}{Number(adjustment).toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between w-64 border-t border-border/40 pt-2.5 mt-1.5">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest self-center">Grand Total</span>
                    <span className="text-xl font-black text-foreground">
                      {currencySymbol}{Number(total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Tabs Side Panel */}
            <div className="space-y-6 print:hidden">
              
              <div className="bg-background border border-border/50 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[300px]">
                
                {/* Tabs Headers */}
                <div className="flex border-b border-border/40 bg-muted/20">
                  <button 
                    onClick={() => setActiveTab("summary")}
                    className={cn(
                      "flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all",
                      activeTab === "summary" 
                        ? "border-primary text-primary bg-background" 
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Summary
                  </button>
                  <button 
                    onClick={() => setActiveTab("discussion")}
                    className={cn(
                      "flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all",
                      activeTab === "discussion" 
                        ? "border-primary text-primary bg-background" 
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Discussion
                  </button>
                </div>

                {/* Tab Content Area */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  
                  {activeTab === "summary" ? (
                    
                    /* Summary Tab content */
                    <div className="space-y-5">
                      
                      {/* Sender details */}
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">From</p>
                        <p className="text-xs font-black text-foreground">Ekagra Engineering</p>
                        <p className="text-[11px] text-muted-foreground whitespace-pre-line mt-0.5 leading-relaxed">
                          405, The Spireee
                          Rajkot Rajkot
                          India 360007
                        </p>
                      </div>

                      {/* Document Details metadata */}
                      <div className="border-t border-border/30 pt-3">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2.5">
                          {type.toUpperCase()} INFORMATION
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Status:</span>
                            <span className={cn("font-bold", statusClass.split(" ")[1])}>{statusLabel}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-bold text-foreground">{date}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{expiryLabel}:</span>
                            <span className="font-bold text-foreground">{expiryDate}</span>
                          </div>
                        </div>
                      </div>

                      {/* Large Total Indicator */}
                      <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 text-center">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Total Value</p>
                        <p className="text-2xl font-black text-primary">
                          {currencySymbol}{Number(total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                    </div>
                  ) : (
                    
                    /* Discussion Tab content */
                    <div className="flex flex-col h-full justify-between gap-4 flex-1">
                      
                      {/* Comments list */}
                      <div className="space-y-3 overflow-y-auto max-h-[250px] pr-1 flex-1">
                        {sessionComments.map(comment => (
                          <div key={comment.id} className="bg-muted/30 border border-border/30 rounded-xl p-3 text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-foreground">{comment.author}</span>
                              <span className="text-[10px] text-muted-foreground">{comment.date}</span>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">{comment.text}</p>
                          </div>
                        ))}
                      </div>

                      {/* Comment Input */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-border/30 mt-auto">
                        <input
                          type="text"
                          placeholder="Type comment..."
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleAddComment()}
                          className="flex-1 text-xs border border-border/50 bg-background hover:border-border focus:border-primary outline-none px-3 py-2 rounded-xl transition-colors"
                        />
                        <Button 
                          onClick={handleAddComment}
                          size="icon" 
                          className="h-8 w-8 rounded-xl shrink-0 bg-primary text-primary-foreground hover:bg-primary/95"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

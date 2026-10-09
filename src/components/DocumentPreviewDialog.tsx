import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Send, Printer } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/dateFormat";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { salesService } from "@/api/services/sales.service";
import { isRudraverseTenant } from "@/lib/rudraverseTenant";
import { canAccessBankDetails } from "@/lib/bankDetailsAccess";
import { isEkagraUser } from "@/lib/ekagraTenant";
import { EkagraTaxInvoiceLayout, ClassicInvoiceLayout } from "@/components/invoiceFormatLayouts";
import { usePermissions } from "@/hooks/usePermissions";
import { settingsService } from "@/api/services/settings.service";
import { customerBillingParts } from "@/lib/customerAutofill";

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "proposal" | "estimate" | "invoice";
  data: any;
}

export function DocumentPreviewDialog({ open, onOpenChange, type, data }: DocumentPreviewDialogProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "discussion">("preview");
  const [commentText, setCommentText] = useState("");
  const [sessionComments, setSessionComments] = useState<Array<{ id: number; author: string; text: string; date: string }>>([
    { id: 1, author: "System Log", text: `${type.toUpperCase()} created successfully.`, date: "Just now" }
  ]);

  const invoiceId = type === "invoice" ? (data?._id || data?.id) : null;
  const { data: paymentsData } = useQuery({
    queryKey: ["invoice-payments-preview", invoiceId],
    queryFn: () => salesService.getPaymentsByInvoice(invoiceId).then((res: any) => res.data || res),
    enabled: !!invoiceId,
  });

  const { symbol: currencySymbol } = useCurrency();
  const { user } = usePermissions();

  const { data: rawSettings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => settingsService.getSettings().then((res: any) => res.data || res),
    staleTime: 10 * 60 * 1000,
  });
  const S: Record<string, string> = Array.isArray(rawSettings)
    ? Object.fromEntries(rawSettings.map((s: any) => [s.name, s.value]))
    : (rawSettings ?? {});

  if (!data) return null;

  const isProposal = type === "proposal";
  const isEstimate = type === "estimate";
  const isInvoice = type === "invoice";
  const isRudraverse = isRudraverseTenant(user?.email);
  const canUseBankDetails = canAccessBankDetails(user?.email);
  const bankDetail = canUseBankDetails ? data.bank_detail : null;
  const showEkagraTaxInvoice = isInvoice && S.invPdfFormat === "ekagra_tax_invoice" && isEkagraUser(user?.email);
  const showClassicInvoice = isInvoice && S.invPdfFormat === "classic_invoice";

  const payments = paymentsData || [];
  const totalPaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

  let num = "";
  if (isProposal) num = `PRO-${(data._id || data.id)?.slice(-6).toUpperCase()}`;
  else if (isEstimate) num = data.number || `EST-${(data._id || data.id)?.slice(-6).toUpperCase()}`;
  else num = data.number || `INV-${(data._id || data.id)?.substring(0, 6).toUpperCase()}`;

  const docLabel = isProposal ? "PROPOSAL" : isEstimate ? "ESTIMATE" : "TAX INVOICE";
  const date = data.date ? formatDate(data.date) : "-";
  let dueDate = "-";
  if (isProposal) dueDate = data.open_till ? formatDate(data.open_till) : "-";
  else if (isEstimate) dueDate = (data.open_till || data.estimate_expirydate) ? formatDate(data.open_till || data.estimate_expirydate) : "-";
  else dueDate = data.duedate ? formatDate(data.duedate) : "-";
  const dueDateLabel = isInvoice ? "Due Date" : "Valid Till";

  // Status
  let statusLabel = "Draft";
  let statusBg = "bg-slate-100 text-slate-700";
  if (isInvoice) {
    const sm: any = {
      unpaid: { l: "Unpaid", c: "bg-amber-100 text-amber-800" },
      sent: { l: "Unpaid", c: "bg-amber-100 text-amber-800" },
      draft: { l: "Draft", c: "bg-slate-100 text-slate-700" },
      paid: { l: "Paid", c: "bg-emerald-100 text-emerald-800" },
      recorded: { l: "Paid", c: "bg-emerald-100 text-emerald-800" },
      partially_paid: { l: "Partial", c: "bg-blue-100 text-blue-800" },
      overdue: { l: "Overdue", c: "bg-red-100 text-red-800" },
      cancelled: { l: "Cancelled", c: "bg-slate-100 text-slate-500" },
    };
    const s = sm[String(data.status)] ?? sm.unpaid;
    statusLabel = s.l; statusBg = s.c;
  }

  // Client
  // Customer block. Documents save their own buyer details where they have
  // them (estimate billing_*, proposal address...); otherwise the populated
  // customer is used — billing address first (lib/customerAutofill.ts).
  const cust = (data.client && typeof data.client === "object" ? data.client : null) || (data.client_id && typeof data.client_id === "object" ? data.client_id : null);
  const custBilling = customerBillingParts(cust);
  const docHasBilling = !!(data.billing_street || data.billing_city || data.billing_state || data.billing_zip);
  const clientCompany = isProposal
    ? (data.company || data.proposal_to || "N/A")
    : (cust?.company || data.contact_name || data.proposal_to || "N/A");
  const clientAddress = isProposal ? data.address : docHasBilling ? data.billing_street : custBilling.street;
  const clientCityStateZip = isProposal
    ? [data.city, data.state, data.zip].filter(Boolean).join(", ")
    : docHasBilling
    ? [data.billing_city, data.billing_state, data.billing_zip].filter(Boolean).join(", ")
    : [custBilling.city, custBilling.state, custBilling.zip].filter(Boolean).join(", ");
  const clientCountry = isProposal ? data.country : docHasBilling ? data.billing_country : custBilling.country;
  const clientEmail = isProposal ? data.email : (data.mailId || data.email || cust?.email || "");
  const clientPhone = (isProposal ? data.phone : data.phone) || cust?.phonenumber || cust?.phone || "";
  // GSTIN: the document's own value, else the customer's GST number. VAT is
  // shown on its own line (it used to be printed labelled as "GSTIN").
  const clientGstin = (data.gstin || cust?.gst_number || "").toString();
  const clientVat = (data.vat || cust?.vat || "").toString();

  const items = data.items || [];
  const subtotal = data.subtotal || 0;
  const totalFreight = data.total_freight || 0;
  const discountPercent = data.discount_percent || 0;
  const discountAmt = discountPercent > 0 ? subtotal * (discountPercent / 100) : 0;
  const totalTax = data.total_tax || 0;
  const adjustment = data.adjustment || 0;
  const total = data.total || data.amount || 0;
  const balanceDue = Math.max(total - totalPaid, 0);

  const fmt = (v: number) => `${currencySymbol}${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Rudraverse GST breakdown
  const discountAmtRV = discountPercent > 0 ? subtotal * (discountPercent / 100) : 0;
  const untaxedAmount = subtotal - discountAmtRV;
  const rawTotal = untaxedAmount + totalFreight + totalTax + adjustment;
  const roundedTotal = Math.round(rawTotal);
  const rounding = roundedTotal - rawTotal;
  const balanceDueRounded = Math.max(roundedTotal - totalPaid, 0);

  // ─── Print handler ───────────────────────────────────────────────────────
  const handlePrint = () => {
    const el = document.getElementById("official-invoice-printable");
    if (!el) return;
    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "none" });
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><title>${num}</title>
    <style>
      *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;background:#fff}
      @page{size:A4 portrait;margin:12mm 14mm}
      .no-print{display:none!important}
    </style>
    </head><body>${el.innerHTML}</body></html>`);
    doc.close();
    Array.from(document.head.querySelectorAll("style,link[rel='stylesheet']")).forEach(s => doc.head.appendChild(s.cloneNode(true)));
    const trigger = () => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1200); };
    const links = Array.from(doc.head.querySelectorAll("link[rel='stylesheet']"));
    if (!links.length) { setTimeout(trigger, 300); } else { let n = 0; links.forEach((l: any) => { l.onload = l.onerror = () => { if (++n === links.length) setTimeout(trigger, 300); }; }); setTimeout(trigger, 1500); }
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    setSessionComments(p => [...p, { id: Date.now(), author: "Me", text: commentText, date: "Just now" }]);
    setCommentText("");
  };

  // ─── Company sender info ─────────────────────────────────────────────────
  const companyName  = S.companyName || "Your Company";
  const compAddress  = S.compAddress || "";
  const compCity     = S.compCity || "";
  const compState    = S.compState || "";
  const compZip      = S.compZip || "";
  const compCountry  = S.compCountry || "";
  const compPhone    = S.compPhone || "";
  const compVat      = S.compVat || "";
  const compCityStateZip = [compCity, compState, compZip].filter(Boolean).join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[96vw] md:max-w-4xl rounded-2xl p-0 overflow-hidden max-h-[95vh] flex flex-col bg-background border border-border shadow-2xl"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{`${docLabel} — ${num}`}</DialogTitle>

        {/* ── Toolbar ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-muted/30 shrink-0">
          <div className="flex items-center gap-1">
            {(["preview", "discussion"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors",
                  activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >{tab}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("px-2.5 py-0.5 rounded-md text-[11px] font-bold", statusBg)}>{statusLabel}</span>
            <Button onClick={handlePrint} size="sm" className="h-8 gap-1.5 text-xs rounded-lg px-3 font-semibold">
              <Printer className="h-3.5 w-3.5" /> Print / PDF
            </Button>
            <Button onClick={handlePrint} size="sm" variant="outline" className="h-8 gap-1.5 text-xs rounded-lg px-3 font-semibold">
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          </div>
        </div>

        {/* ── Preview tab ─────────────────────────────────── */}
        {activeTab === "preview" && (
          <div className="overflow-y-auto flex-1 bg-gray-100 p-4 md:p-6">
            {/* A4 Paper */}
            <div
              id="official-invoice-printable"
              style={{
                background: "#fff",
                maxWidth: "794px",
                margin: "0 auto",
                boxShadow: "0 2px 24px rgba(0,0,0,0.13)",
                fontFamily: "Arial, Helvetica, sans-serif",
                fontSize: "12px",
                color: "#111",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              {showEkagraTaxInvoice ? (
                <EkagraTaxInvoiceLayout data={data} date={date} bankDetail={bankDetail} compCity={compCity} />
              ) : showClassicInvoice ? (
                <ClassicInvoiceLayout data={data} date={date} companyName={companyName} compPhone={compPhone} />
              ) : (
              <>
              {/* ── Invoice Header ── */}
              <div style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)", padding: "28px 32px 20px", color: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  {/* Company */}
                  <div>
                    <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "-0.5px", marginBottom: "4px" }}>{companyName}</div>
                    {compAddress && <div style={{ fontSize: "11px", opacity: 0.85 }}>{compAddress}</div>}
                    {compCityStateZip && <div style={{ fontSize: "11px", opacity: 0.85 }}>{compCityStateZip}</div>}
                    {compCountry && <div style={{ fontSize: "11px", opacity: 0.85 }}>{compCountry}</div>}
                    {compPhone && <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "4px" }}>📞 {compPhone}</div>}
                    {compVat && <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "2px" }}>GSTIN: {compVat}</div>}
                  </div>
                  {/* Invoice Title */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "2px", opacity: 0.95 }}>{docLabel}</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, marginTop: "4px", opacity: 0.9 }}>{num}</div>
                    <div style={{ display: "inline-block", marginTop: "8px", background: "rgba(255,255,255,0.2)", borderRadius: "6px", padding: "3px 12px", fontSize: "11px", fontWeight: 700, letterSpacing: "1px" }}>
                      {statusLabel.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Invoice Meta Bar ── */}
              <div style={{ background: "#f1f5f9", padding: "12px 32px", display: "flex", gap: "32px", borderBottom: "1px solid #e2e8f0" }}>
                {[
                  { l: "Invoice Date", v: date },
                  { l: dueDateLabel, v: dueDate },
                  ...(data.voucherType ? [{ l: "Voucher Type", v: data.voucherType }] : []),
                  ...(data.termsOfPayment ? [{ l: "Payment Terms", v: data.termsOfPayment }] : []),
                  ...(data.partyGroup ? [{ l: "Party Group", v: data.partyGroup }] : []),
                ].map(({ l, v }) => (
                  <div key={l}>
                    <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#64748b", marginBottom: "2px" }}>{l}</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* ── Billing Details ── */}
              <div style={{ display: "flex", padding: "20px 32px", gap: "24px", borderBottom: "1px solid #e2e8f0" }}>
                {/* Seller */}
                <div style={{ flex: 1, background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", padding: "14px 16px" }}>
                  <div style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#2563eb", marginBottom: "8px", borderBottom: "1px solid #dbeafe", paddingBottom: "4px" }}>
                    From (Seller)
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e293b", marginBottom: "4px" }}>{companyName}</div>
                  {compAddress && <div style={{ color: "#475569", marginBottom: "2px" }}>{compAddress}</div>}
                  {compCityStateZip && <div style={{ color: "#475569", marginBottom: "2px" }}>{compCityStateZip}</div>}
                  {compCountry && <div style={{ color: "#475569", marginBottom: "2px" }}>{compCountry}</div>}
                  {compPhone && <div style={{ color: "#475569", marginBottom: "2px" }}>Ph: {compPhone}</div>}
                  {compVat && (
                    <div style={{ marginTop: "6px", fontSize: "10px", fontWeight: 700, color: "#065f46", background: "#d1fae5", display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontFamily: "monospace" }}>
                      GSTIN: {compVat}
                    </div>
                  )}
                </div>

                {/* Buyer */}
                <div style={{ flex: 1, background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", padding: "14px 16px" }}>
                  <div style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#2563eb", marginBottom: "8px", borderBottom: "1px solid #dbeafe", paddingBottom: "4px" }}>
                    Bill To (Buyer)
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e293b", marginBottom: "4px" }}>{clientCompany}</div>
                  {clientAddress && <div style={{ color: "#475569", marginBottom: "2px" }}>{clientAddress}</div>}
                  {clientCityStateZip && <div style={{ color: "#475569", marginBottom: "2px" }}>{clientCityStateZip}</div>}
                  {clientCountry && <div style={{ color: "#475569", marginBottom: "2px" }}>{clientCountry}</div>}
                  {clientEmail && <div style={{ color: "#2563eb", marginBottom: "2px" }}>{clientEmail}</div>}
                  {clientPhone && <div style={{ color: "#475569", marginBottom: "2px" }}>Ph: {clientPhone}</div>}
                  {clientGstin && (
                    <div style={{ marginTop: "6px", fontSize: "10px", fontWeight: 700, color: "#065f46", background: "#d1fae5", display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontFamily: "monospace" }}>
                      GSTIN: {clientGstin}
                    </div>
                  )}
                  {clientVat && (
                    <div style={{ marginTop: "6px", marginLeft: clientGstin ? "6px" : 0, fontSize: "10px", fontWeight: 700, color: "#1e3a8a", background: "#dbeafe", display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontFamily: "monospace" }}>
                      VAT: {clientVat}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Items Table ── */}
              <div style={{ padding: "0 32px 0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
                  <thead>
                    <tr style={{ background: "#1e3a5f", color: "#fff" }}>
                      {["#", "Description", "Qty", "Rate", "Tax %", "Amount"].map((h, i) => (
                        <th key={h} style={{
                          padding: "10px 10px",
                          textAlign: i === 0 ? "center" : i >= 2 ? "right" : "left",
                          fontSize: "10px",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.6px",
                          whiteSpace: "nowrap",
                          width: i === 0 ? "36px" : i === 2 ? "50px" : i === 3 ? "80px" : i === 4 ? "56px" : i === 5 ? "90px" : "auto",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? items.map((item: any, i: number) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "9px 10px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: "9px 10px" }}>
                          <div style={{ fontWeight: 700, color: "#1e293b" }}>{item.description || item.name || "—"}</div>
                          {item.long_description && <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{item.long_description}</div>}
                          {item.hsn && <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "1px" }}>HSN: {item.hsn}</div>}
                        </td>
                        <td style={{ padding: "9px 10px", textAlign: "right", color: "#475569" }}>{item.qty || item.quantity || 1}{item.unit ? ` ${item.unit}` : ""}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", color: "#475569" }}>{fmt(Number(item.rate || item.price || 0))}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", color: "#475569" }}>{(item.tax || item.gstPercentage) ? `${item.tax || item.gstPercentage}%` : "0%"}</td>
                        <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, color: "#1e293b" }}>
                          {fmt(Number((item.qty || 1) * (item.rate || item.price || 0) + (Number(item.freight_charge) || 0)))}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}>No items added.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Totals ── */}
              <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 32px 8px" }}>
                <div style={{ width: "280px" }}>
                  {/* Standard totals */}
                  {isRudraverse && (data.tax_type || data.total_cgst || data.total_sgst || data.total_igst) ? (
                    <>
                      {[
                        { l: "Untaxed Amount", v: fmt(untaxedAmount) },
                        ...(totalFreight > 0 ? [{ l: "Freight", v: fmt(totalFreight) }] : []),
                        ...(data.tax_type === "GST"
                          ? [{ l: "SGST/UTGST", v: fmt(Number(data.total_sgst ?? totalTax / 2)) }, { l: "CGST", v: fmt(Number(data.total_cgst ?? totalTax / 2)) }]
                          : [{ l: "IGST", v: fmt(Number(data.total_igst ?? totalTax)) }]),
                        ...(adjustment !== 0 ? [{ l: "Adjustment", v: fmt(adjustment) }] : []),
                        ...(Math.abs(rounding) > 0.001 ? [{ l: "Rounding", v: fmt(rounding) }] : []),
                      ].map(({ l, v }) => (
                        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #f1f5f9" }}>
                          <span style={{ color: "#64748b" }}>{l}</span>
                          <span style={{ fontWeight: 600 }}>{v}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#1e3a5f", color: "#fff", borderRadius: "6px", marginTop: "8px", fontWeight: 800, fontSize: "14px" }}>
                        <span>TOTAL</span><span>{fmt(roundedTotal)}</span>
                      </div>
                      {isInvoice && totalPaid > 0 && <>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", marginTop: "6px" }}>
                          <span style={{ color: "#16a34a", fontWeight: 600 }}>Amount Paid</span>
                          <span style={{ color: "#16a34a", fontWeight: 700 }}>− {fmt(totalPaid)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: balanceDueRounded > 0 ? "#fef2f2" : "#f0fdf4", border: `1px solid ${balanceDueRounded > 0 ? "#fecaca" : "#bbf7d0"}`, borderRadius: "6px", marginTop: "4px", fontWeight: 800, fontSize: "13px", color: balanceDueRounded > 0 ? "#dc2626" : "#16a34a" }}>
                          <span>BALANCE DUE</span><span>{fmt(balanceDueRounded)}</span>
                        </div>
                      </>}
                    </>
                  ) : (
                    <>
                      {[
                        { l: "Sub Total", v: fmt(subtotal), show: true },
                        { l: `Freight`, v: fmt(totalFreight), show: totalFreight > 0 },
                        { l: `Discount (${discountPercent}%)`, v: `− ${fmt(discountAmt)}`, show: discountPercent > 0, red: true },
                        { l: "Total Tax", v: fmt(totalTax), show: totalTax > 0 },
                        { l: "Adjustment", v: fmt(adjustment), show: adjustment !== 0 },
                      ].filter(r => r.show).map(({ l, v, red }) => (
                        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #f1f5f9", color: red ? "#dc2626" : undefined }}>
                          <span style={{ color: red ? "#dc2626" : "#64748b" }}>{l}</span>
                          <span style={{ fontWeight: 600 }}>{v}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#1e3a5f", color: "#fff", borderRadius: "6px", marginTop: "8px", fontWeight: 800, fontSize: "14px" }}>
                        <span>GRAND TOTAL</span><span>{fmt(total)}</span>
                      </div>
                      {isInvoice && totalPaid > 0 && <>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", marginTop: "6px" }}>
                          <span style={{ color: "#16a34a", fontWeight: 600 }}>Amount Paid</span>
                          <span style={{ color: "#16a34a", fontWeight: 700 }}>− {fmt(totalPaid)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: balanceDue > 0 ? "#fef2f2" : "#f0fdf4", border: `1px solid ${balanceDue > 0 ? "#fecaca" : "#bbf7d0"}`, borderRadius: "6px", marginTop: "4px", fontWeight: 800, fontSize: "13px", color: balanceDue > 0 ? "#dc2626" : "#16a34a" }}>
                          <span>BALANCE DUE</span><span>{fmt(balanceDue)}</span>
                        </div>
                      </>}
                    </>
                  )}
                </div>
              </div>

              {/* ── Notes / Terms ── */}
              {(data.clientnote || data.terms) && (
                <div style={{ padding: "0 32px 20px", display: "flex", gap: "20px" }}>
                  {data.clientnote && (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px", color: "#64748b", marginBottom: "4px" }}>Notes</div>
                      <div style={{ fontSize: "11px", color: "#475569", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{data.clientnote}</div>
                    </div>
                  )}
                  {data.terms && (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px", color: "#64748b", marginBottom: "4px" }}>Terms & Conditions</div>
                      <div style={{ fontSize: "11px", color: "#475569", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{data.terms}</div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Bank Details ── */}
              {bankDetail && (
                <div style={{ padding: "0 32px 20px" }}>
                  <div style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px", color: "#64748b", marginBottom: "6px" }}>
                    Payment / Bank Details
                  </div>
                  <div style={{ background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", padding: "12px 16px", fontSize: "11px", color: "#334155", lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 700, color: "#1e293b" }}>{bankDetail.accountHolderName || "—"}</div>
                    <div>Bank: {bankDetail.bankName || "—"}</div>
                    <div>A/C No: {bankDetail.accountNumber || "—"} &nbsp; IFSC: {bankDetail.ifscCode || "—"}</div>
                    {bankDetail.branch?.name && <div>Branch: {bankDetail.branch.name}</div>}
                  </div>
                </div>
              )}

              {/* ── Footer ── */}
              <div style={{ background: "#f1f5f9", borderTop: "1px solid #e2e8f0", padding: "12px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>
                  <strong>{companyName}</strong>{compPhone ? `  |  📞 ${compPhone}` : ""}{compVat ? `  |  GSTIN: ${compVat}` : ""}
                </div>
                <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                  {num} — {date}
                </div>
              </div>
              </>
              )}
            </div>
          </div>
        )}

        {/* ── Discussion tab ───────────────────────────────── */}
        {activeTab === "discussion" && (
          <div className="flex-1 flex flex-col p-5 gap-3 overflow-y-auto">
            <div className="space-y-3 flex-1">
              {sessionComments.map(c => (
                <div key={c.id} className="bg-muted/30 border border-border/30 rounded-xl p-3 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold">{c.author}</span>
                    <span className="text-muted-foreground text-[10px]">{c.date}</span>
                  </div>
                  <p className="text-muted-foreground">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t border-border/30">
              <input
                type="text"
                placeholder="Type a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddComment()}
                className="flex-1 text-xs border border-border/50 bg-background focus:border-primary outline-none px-3 py-2 rounded-xl"
              />
              <Button onClick={handleAddComment} size="icon" className="h-9 w-9 rounded-xl shrink-0">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

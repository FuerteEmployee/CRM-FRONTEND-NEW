import { useState, useMemo, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { isTrinetraPilotUser } from "@/lib/trinetraPilot";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  ChevronDown,
  Wallet
} from "lucide-react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
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
import { ImportDialog, type ImportColumn } from "@/components/ui/import-dialog";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";
import { useCurrency } from "@/context/CurrencyContext";
import { financeService } from "@/api/services/finance.service";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";
import { useSettings } from "@/context/SettingsContext";
import { getCompanyInfo, companyInfoHtml } from "@/lib/companyInfo";
import { getDocDisplayOptions, trimZeroDecimals, stripCurrencySymbol, itemTaxLabel, amountInWords, saleAgentName, projectName } from "@/lib/invoiceDisplay";
import { htmlToPdf, htmlToPdfBase64 } from "@/lib/htmlToPdf";
import { Textarea } from "@/components/ui/textarea";
import { escapeHtml } from "@/lib/richText";
import { canAccessBankDetails } from "@/lib/bankDetailsAccess";
import { isEkagraUser } from "@/lib/ekagraTenant";
import { renderToStaticMarkup } from "react-dom/server";
import { EkagraTaxInvoiceLayout, ClassicInvoiceLayout, LetterheadInvoiceLayout } from "@/components/invoiceFormatLayouts";
import { getLetterheadCompany, getLetterheadTitle, isLetterheadFormat } from "@/lib/invoicePdfFormats";
import { defaultPageSize } from "@/lib/tablePageSize";

const INVOICE_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "Voucher Number", sample: "INV-2201", core: true },
  { key: "Bill Date", sample: "27-08-2026", core: true },
  { key: "Voucher Type", sample: "Sales", core: true },
  { key: "Party Name", sample: "Bright Solutions Pvt Ltd", required: true, core: true },
  { key: "Party Address", sample: "12 MG Road, Bangalore", core: true },
  { key: "Party Group", sample: "Retail", core: true },
  { key: "GSTIN/UIN", sample: "29ABCDE1234F1Z5", core: true },
  { key: "Item Name", sample: "Consulting Services", core: true },
  { key: "Quantity", sample: 1, core: true },
  { key: "Rate", sample: 25000, core: true },
  { key: "Amount", sample: 25000, core: true },
  { key: "Branch", sample: "Bangalore", core: true },
  { key: "Terms of Payment", sample: "Net 30", core: false },
  { key: "Item Group", sample: "Services", core: false },
  { key: "Item HSN", sample: "9983", core: false },
  { key: "GST percentage", sample: 18, core: false },
  { key: "Freight %", sample: 1, core: false },
  { key: "Item Batch", sample: "B-01", core: false },
  { key: "Unit", sample: "Nos", core: false },
  { key: "Due Date", sample: "26-09-2026", core: false },
  { key: "Status", sample: "unpaid", core: false },
];

const statusMap: Record<string, { label: string; color: string }> = {
  unpaid: { label: "Unpaid", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  sent: { label: "Unpaid", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  sent_later: { label: "Unpaid", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  draft: { label: "Draft", color: "bg-slate-50 text-slate-700 border-slate-200" },
  paid: { label: "Paid", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  recorded: { label: "Paid", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  partially_paid: { label: "Partially Paid", color: "bg-blue-50 text-blue-700 border-blue-200" },
  overdue: { label: "Overdue", color: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelled: { label: "Cancelled", color: "bg-slate-50 text-slate-700 border-slate-200" },
};

const statusCardConfig = [
  { label: "Unpaid", color: "text-yellow-600", bg: "bg-yellow-50/50", border: "border-yellow-100", statusId: "unpaid" },
  { label: "Paid", color: "text-emerald-600", bg: "bg-emerald-50/50", border: "border-emerald-100", statusId: "paid" },
  { label: "Partially Paid", color: "text-blue-600", bg: "bg-blue-50/50", border: "border-blue-100", statusId: "partially_paid" },
  { label: "Overdue", color: "text-rose-600", bg: "bg-rose-50/50", border: "border-rose-100", statusId: "overdue" },
  { label: "Cancelled", color: "text-slate-500", bg: "bg-slate-50/50", border: "border-slate-100", statusId: "cancelled" },
];

// The 5 status cards: sent / sent_later count as Unpaid and recorded as Paid,
// the same buckets the server uses for the paginated list.
const statusBucket = (raw: string) =>
  raw === "sent" || raw === "sent_later" ? "unpaid" : raw === "recorded" ? "paid" : (raw || "unpaid");

const getStatus = (statusId: any) => {
  return statusMap[String(statusId)] ?? { label: "Unpaid", color: "bg-yellow-50 text-yellow-700 border-yellow-200" };
};

const DETAIL_TABS = ["Invoice", "Comments", "Reminders", "Tasks", "Notes", "Templates"];

const InvoiceDetailPanel = ({ invoice, onClose, onEdit, onView, isFullscreen, setIsFullscreen, autoOpenEmail = false, emailOnly = false }: {
  invoice: any;
  onClose: () => void;
  onEdit: () => void;
  onView: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
  /** Open "Send Invoice to Email" straight away (Save & Send on the create page). */
  autoOpenEmail?: boolean;
  /** Render only the email window (Save & Send), closing it closes the panel. */
  emailOnly?: boolean;
}) => {
  const navigate = useNavigate();
  const invoiceNumber = invoice.number || `INV-${invoice._id?.substring(0, 6)}`;
  const status = getStatus(invoice.status);
  const [activeTab, setActiveTab] = useState("Invoice");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [emailForm, setEmailForm] = useState({ to: "", cc: "", subject: "", message: "" });
  const [attachPdf, setAttachPdf] = useState(true);
  const [emailDraftLoading, setEmailDraftLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", paymentmode: "", date: new Date().toISOString().split("T")[0], transactionid: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, can } = usePermissions();
  const { getSetting } = useSettings();
  // Company name + details from Setup > Settings > Company Information (no other company's name as fallback).
  const companyName = getSetting("companyName", "");
  const companyInfoBlock = companyInfoHtml(getCompanyInfo((k) => getSetting(k, "")));
  const compCity = getSetting("compCity", "");
  const canUseBankDetails = canAccessBankDetails(user?.email);

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => salesService.updateInvoice(d._id || d.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoice._id || invoice.id] });
      toast({ title: "Status Updated", description: "Invoice status updated successfully.", className: "bg-green-600 text-white font-bold rounded-2xl" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message || "Failed to update status.", variant: "destructive" });
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
      toast({ title: "Error", description: err.response?.data?.message || err.message || "Failed to delete invoice.", variant: "destructive" });
    }
  });

  const handleDelete = () => {
    if (window.confirm(`Delete invoice ${invoiceNumber}? This cannot be undone.`)) deleteMutation.mutate(d._id || d.id);
  };

  const handleCopy = () => {
    // Opens the Invoices list with this invoice's panel open.
    const link = `${window.location.origin}/admin/invoices?view=${d._id || d.id}`;
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

  const { data: payments = [] } = useQuery({
    queryKey: ["invoice-payments", invoice._id || invoice.id],
    queryFn: () => salesService.getPaymentsByInvoice(invoice._id || invoice.id).then((res: any) => res.data || res),
    enabled: !!(invoice._id || invoice.id),
  });

  const { data: paymentModes = [] } = useQuery({
    queryKey: ["payment-modes"],
    queryFn: () => financeService.getPaymentModes().then((res: any) => res.data || res),
  });

  const totalPaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  const balanceDue = Math.max((d.total || 0) - totalPaid, 0);

  const { data: appliedCreditNotes = [] } = useQuery({
    queryKey: ["invoice-credit-notes", invoice._id || invoice.id],
    queryFn: () => creditNoteService.getByInvoice(invoice._id || invoice.id),
    enabled: !!(invoice._id || invoice.id),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (payload: any) => salesService.createPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoice._id || invoice.id] });
      queryClient.invalidateQueries({ queryKey: ["invoice-payments", invoice._id || invoice.id] });
      toast({ title: "Payment Recorded", description: "Invoice status updated based on the new balance.", className: "bg-green-600 text-white font-bold rounded-2xl" });
      setShowPaymentDialog(false);
      setPaymentForm({ amount: "", paymentmode: "", date: new Date().toISOString().split("T")[0], transactionid: "" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message || "Failed to record payment.", variant: "destructive" });
    }
  });

  // Paid / Partially Paid come from payments, so "Mark as" opens Record Payment.
  const openPaymentDialog = (amount: number | "") => {
    setPaymentForm({ amount: amount === "" ? "" : String(Number(amount).toFixed(2)), paymentmode: paymentModes[0]?.name || "", date: new Date().toISOString().split("T")[0], transactionid: "" });
    setShowPaymentDialog(true);
  };

  const handleRecordPayment = () => {
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      toast({ title: "Validation Error", description: "Enter a valid payment amount.", variant: "destructive" });
      return;
    }
    if (amount > balanceDue + 0.005) {
      toast({ title: "Validation Error", description: `Amount is more than the balance due (${balanceDue.toFixed(2)}).`, variant: "destructive" });
      return;
    }
    if (!paymentForm.paymentmode) {
      toast({ title: "Validation Error", description: "Please select a payment mode.", variant: "destructive" });
      return;
    }
    recordPaymentMutation.mutate({
      invoice: d._id || d.id,
      amount,
      paymentmode: paymentForm.paymentmode,
      date: paymentForm.date,
      transactionid: paymentForm.transactionid,
    });
  };

  const { symbol } = useCurrency();
  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies"],
    queryFn: () => financeService.getCurrencies().then((res: any) => res.data || res),
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

  // Both custom formats render via the exact same React components the "View"
  // eye-icon preview uses (components/invoiceFormatLayouts.tsx) — rendered
  // here to a static HTML string instead of live DOM, so Print/Download can
  // never drift from what Preview shows.
  const generateEkagraTaxInvoiceHtml = () => {
    const markup = renderToStaticMarkup(
      <EkagraTaxInvoiceLayout
        data={d}
        date={d.date ? formatDate(d.date) : "-"}
        bankDetail={d.bank_detail}
        compCity={compCity}
      />
    );
    return `
      <html>
        <head>
          <title>Tax Invoice ${escapeHtml(invoiceNumber)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 24px; font-size: 12px; }
            @media print {
              body { padding: 0; }
              @page { margin: 1.2cm; }
            }
          </style>
        </head>
        <body>${markup}</body>
      </html>
    `;
  };

  const generateClassicInvoiceHtml = () => {
    const markup = renderToStaticMarkup(
      <ClassicInvoiceLayout
        data={d}
        date={d.date ? formatDate(d.date) : "-"}
        companyName={companyName}
        compPhone={getSetting("compPhone", "")}
      />
    );
    return `
      <html>
        <head>
          <title>Invoice ${escapeHtml(invoiceNumber)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 24px; font-size: 12px; }
            @media print {
              body { padding: 0; }
              @page { margin: 1.2cm; }
            }
          </style>
        </head>
        <body>${markup}</body>
      </html>
    `;
  };

  const generateLetterheadInvoiceHtml = (pdfFormat: string) => {
    const title = getLetterheadTitle(d.document_type, pdfFormat);
    const markup = renderToStaticMarkup(
      <LetterheadInvoiceLayout
        data={d}
        title={title}
        company={getLetterheadCompany((k) => getSetting(k, ""))}
        bankDetail={canUseBankDetails ? d.bank_detail : null}
      />
    );
    return `
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title === "PROFORMA INVOICE" ? "Proforma Invoice" : "Invoice"} ${escapeHtml(invoiceNumber)}</title>
          <style>
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { margin: 0; padding: 24px; background: #fff; }
            @media print {
              body { padding: 0; }
              @page { size: A4 portrait; margin: 1cm; }
            }
          </style>
        </head>
        <body>${markup}</body>
      </html>
    `;
  };

  const generatePdfHtml = () => {
    const pdfFormat = getSetting("invPdfFormat", "generic");
    if (isLetterheadFormat(pdfFormat) && isEkagraUser(user?.email)) {
      return generateLetterheadInvoiceHtml(pdfFormat);
    }
    if (pdfFormat === "ekagra_tax_invoice" && isEkagraUser(user?.email)) {
      return generateEkagraTaxInvoiceHtml();
    }
    if (pdfFormat === "classic_invoice") {
      return generateClassicInvoiceHtml();
    }
    // Standard PDF follows Setup > Settings > Finance display options (lib/invoiceDisplay.ts).
    const D = getDocDisplayOptions((k) => getSetting(k, ""));
    const esc = escapeHtml;
    const money = (v: number) => trimZeroDecimals(formatRowAmount(d, v), D);
    const rowCur = currencies.find((c: any) => c.name === d?.currency) || currencies.find((c: any) => c.isdefault);
    const itemMoney = (v: number) => (D.excludeCurrency ? stripCurrencySymbol(money(v), rowCur?.symbol ?? symbol) : money(v));
    const pdfPaid = Number(d.total_paid) || 0;
    const pdfCredits = Number(d.credits_applied) || 0;
    const metaRows = [
      d.duedate ? `<b>Due Date:</b> ${esc(formatDate(d.duedate))}` : "",
      D.showSaleAgent && saleAgentName(d) ? `<b>Sale Agent:</b> ${esc(saleAgentName(d))}` : "",
      D.showProject && projectName(d) ? `<b>Project:</b> ${esc(projectName(d))}` : "",
    ].filter(Boolean);
    const pdfMetaHtml = metaRows.length ? `<div class="meta" style="margin: -20px 0 24px;">${metaRows.join(" &nbsp;·&nbsp; ")}</div>` : "";
    const bd = d.bank_detail;
    const bankDetailsHtml = (canUseBankDetails && bd)
      ? `
          <div class="bank-details">
            <div class="bank-details-title">Payment / Bank Details</div>
            <div class="bank-details-row">
              <b>${esc(bd.accountHolderName || "—")}</b><br/>
              Bank: ${esc(bd.bankName || "—")}<br/>
              A/C No: ${esc(bd.accountNumber || "—")} &nbsp; IFSC: ${esc(bd.ifscCode || "—")}
              ${bd.branch?.name ? `<br/>Branch: ${esc(bd.branch.name)}` : ""}
            </div>
          </div>
        `
      : '';

    return `
      <html>
        <head>
          <title>Invoice ${escapeHtml(invoiceNumber)}</title>
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
              <div class="title">${esc(invoiceNumber)}</div>
              <div class="company">${esc(companyName)}</div>${companyInfoBlock}
            </div>
            <div style="text-align: right">
              <div style="margin-bottom: 15px;">
                <div style="font-size: 12px; color: #64748b; font-weight: bold; margin-bottom: 5px;">BILL TO</div>
                <div class="company" style="color: #2563eb;">${esc(d.client?.company || 'Customer')}</div>
              </div>
              <div class="meta">
                <b>Invoice Date:</b> ${d.date ? formatDate(d.date) : '-'}<br/>
                <b>Status:</b> ${status.label}
              </div>
            </div>
          </div>

          ${pdfMetaHtml}

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Rate</th>
                ${D.showTaxPerItem ? "<th>Tax</th>" : ""}
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(d.items || []).map((item: any) => `
                <tr>
                  <td><b>${esc(item.description || item.name || "—")}</b></td>
                  <td>${item.qty || item.quantity || 1}</td>
                  <td>${itemMoney(Number(item.rate || item.price || 0))}</td>
                  ${D.showTaxPerItem ? `<td>${esc(itemTaxLabel(item, D))}</td>` : ""}
                  <td>${itemMoney(Number((item.qty || item.quantity || 1) * (item.rate || item.price || 0)))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            ${d.subtotal !== undefined ? `
              <div class="totals-row">
                <span>Subtotal</span>
                <span>${money(Number(d.subtotal))}</span>
              </div>
            ` : ''}
            ${Number(d.discount_total) > 0 ? `<div class="totals-row"><span>Discount</span><span>− ${money(Number(d.discount_total))}</span></div>` : ""}
            ${Number(d.total_tax) > 0 ? `<div class="totals-row"><span>Total Tax</span><span>${money(Number(d.total_tax))}</span></div>` : ""}
            ${Number(d.adjustment) ? `<div class="totals-row"><span>Adjustment</span><span>${money(Number(d.adjustment))}</span></div>` : ""}
            <div class="totals-row grand">
              <span>Total</span>
              <span>${money(Number(d.total || 0))}</span>
            </div>
            ${D.showTotalPaid ? `<div class="totals-row"><span>Total Paid</span><span>− ${money(pdfPaid)}</span></div>` : ""}
            ${D.showCredits && pdfCredits > 0 ? `<div class="totals-row"><span>Credits Applied</span><span>− ${money(pdfCredits)}</span></div>` : ""}
            ${D.showAmountDue ? `<div class="totals-row grand"><span>Amount Due</span><span>${money(Math.max(Number(d.total || 0) - pdfPaid - pdfCredits, 0))}</span></div>` : ""}
          </div>

          ${D.amountToWords ? `<div style="clear: both; padding-top: 16px; font-size: 13px; color: #334155;"><b>Amount in words:</b> ${esc(amountInWords(Number(d.total || 0), D))}</div>` : ""}
          ${d.notes ? `<div style="clear: both; margin-top: 24px; font-size: 13px;"><div class="bank-details-title">Notes</div><div style="white-space: pre-wrap; color: #334155;">${esc(d.notes)}</div></div>` : ""}
          ${d.terms ? `<div style="clear: both; margin-top: 16px; font-size: 13px;"><div class="bank-details-title">Terms &amp; Conditions</div><div style="white-space: pre-wrap; color: #334155;">${esc(d.terms)}</div></div>` : ""}

          ${bankDetailsHtml}
        </body>
      </html>
    `;
  };

  const pdfFileName = `Invoice_${String(invoiceNumber).replace(/[^\w.-]+/g, "_")}.pdf`;

  const handlePdfAction = async (action: 'view' | 'new_tab' | 'download' | 'print') => {
    const html = generatePdfHtml();
    if (action === 'download') {
      try {
        (await htmlToPdf(html)).save(pdfFileName);
        toast({ title: "Download Started", description: `${pdfFileName} is downloading.` });
      } catch (err: any) {
        toast({ title: "Error", description: err?.message || "Could not create the PDF.", variant: "destructive" });
      }
      return;
    }
    const blob = new Blob([action === 'print' ? html.replace('<body>', '<body onload="window.print()">') : html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, action === 'view' ? 'PDF_Viewer' : '_blank', action === 'view' ? 'width=800,height=900' : '');
  };

  // ── Send Invoice to Email ──
  const openEmailDialog = async () => {
    setAttachPdf(true);
    setEmailForm({ to: "", cc: "", subject: "", message: "" });
    setShowEmailDialog(true);
    setEmailDraftLoading(true);
    try {
      const draft: any = await salesService.getInvoiceEmailDraft(invoice._id || invoice.id);
      setEmailForm({ to: (draft?.to || []).join(", "), cc: "", subject: draft?.subject || "", message: draft?.message || "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || err.message || "Could not load the email template.", variant: "destructive" });
    } finally {
      setEmailDraftLoading(false);
    }
  };

  useEffect(() => {
    if (autoOpenEmail) openEmailDialog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenEmail]);

  const handleSendEmail = async () => {
    if (!emailForm.to.trim()) {
      toast({ title: "Validation Error", description: "Please enter at least one email address in To.", variant: "destructive" });
      return;
    }
    if (!emailForm.subject.trim() || !emailForm.message.trim()) {
      toast({ title: "Validation Error", description: "Subject and message are required.", variant: "destructive" });
      return;
    }
    setEmailSending(true);
    try {
      const pdf_base64 = attachPdf ? await htmlToPdfBase64(generatePdfHtml()) : undefined;
      const res: any = await salesService.sendInvoiceEmail(d._id || d.id, { ...emailForm, pdf_base64 });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoice._id || invoice.id] });
      toast({ title: "Email Sent", description: res?.message || "Invoice emailed.", className: "bg-green-600 text-white font-bold rounded-2xl" });
      setShowEmailDialog(false);
      if (emailOnly) onClose();
    } catch (err: any) {
      toast({ title: "Email not sent", description: err.response?.data?.message || err.message || "Failed to send the email.", variant: "destructive" });
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <>
      {/* Save & Send shows only the email window, not the whole invoice panel behind it. */}
      {!emailOnly && <>
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
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {/* Edit */}
            {can("Invoices", "Edit") && (
              <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" title="Edit" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Record Payment */}
            {can("Payments", "Create") && d.status !== "cancelled" && balanceDue > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 rounded-lg gap-1.5 text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                title="Record Payment"
                // start from a clean form so values from a cancelled attempt don't carry over
                onClick={() => openPaymentDialog(balanceDue)}
              >
                <Wallet className="h-3.5 w-3.5" />
                Record Payment
              </Button>
            )}

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
            {can("Invoices", "Edit") && (
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-lg"
                title="Send Email"
                onClick={openEmailDialog}
              >
                <Mail className="h-3.5 w-3.5" />
              </Button>
            )}

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
                <DropdownMenuItem onClick={handleCopy}>Copy link</DropdownMenuItem>
                {can("Invoices", "Edit") && totalPaid === 0 && <DropdownMenuItem onClick={() => updateStatusMutation.mutate("unpaid")}>Mark as Unpaid</DropdownMenuItem>}
                {can("Payments", "Create") && d.status !== "cancelled" && balanceDue > 0 && (
                  <>
                    <DropdownMenuItem onClick={() => openPaymentDialog(balanceDue)}>Mark as Paid (record payment)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openPaymentDialog("")}>Mark as Partially Paid (record payment)</DropdownMenuItem>
                  </>
                )}
                {can("Invoices", "Edit") && <DropdownMenuItem onClick={() => updateStatusMutation.mutate("cancelled")}>Mark as Cancelled</DropdownMenuItem>}
                {can("Invoices", "Delete") && <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>Delete</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Convert dropdown */}
            {can("Invoices", "Create") && <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 px-3 rounded-lg gap-1 text-xs font-bold bg-green-600 hover:bg-green-700 text-white">
                  Convert <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    navigate(`/admin/credit-notes/create/${d.client?._id || ""}`, {
                      state: {
                        prepopulate: {
                          invoice_id: d._id || d.id,
                          invoice_number: d.number,
                          client: d.client,
                          currency: d.currency,
                          balance_due: balanceDue,
                        },
                      },
                    })
                  }
                >
                  Convert to Credit Note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>}
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
                      {d.gstin && (
                        <p className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 mt-2 inline-block">
                          GSTIN: {d.gstin}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground mb-0.5">To:</p>
                      <p className="text-sm font-semibold text-primary">{d.client?.company || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Invoice meta details grid */}
                <div className="border border-border/40 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: "GSTIN / UIN",        value: d.gstin || "—" },
                    { label: "Voucher Type",        value: d.voucherType || "—" },
                    { label: "Bill Date",           value: d.date ? new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
                    { label: "Due Date",            value: d.duedate ? new Date(d.duedate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
                    { label: "Terms of Payment",   value: d.termsOfPayment || "—" },
                    { label: "Party Group",         value: d.partyGroup || "—" },
                    { label: "Party Address",       value: d.partyAddress || "—" },
                    { label: "Currency",            value: d.currency || "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
                      <span className={`text-xs font-semibold text-foreground break-all ${label === "GSTIN / UIN" && value !== "—" ? "font-mono text-emerald-700" : ""}`}>
                        {value}
                      </span>
                    </div>
                  ))}
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
                            {formatRowAmount(d, d.total || 0)}
                          </p>
                        </div>
                        {totalPaid > 0 && (
                          <>
                            <div className="flex gap-4 text-xs text-emerald-600">
                              <span className="font-medium">Amount Paid:</span>
                              <span className="font-bold">{formatRowAmount(d, totalPaid)}</span>
                            </div>
                            <div className="text-right w-40">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Balance Due</p>
                              <p className={cn("text-sm font-black", balanceDue > 0 ? "text-rose-600" : "text-emerald-600")}>
                                {formatRowAmount(d, balanceDue)}
                              </p>
                            </div>
                          </>
                        )}
                        {appliedCreditNotes.length > 0 && (
                          <div className="text-right w-56 mt-2 pt-2 border-t border-border/20 space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Credit Notes Applied</p>
                            {appliedCreditNotes.map((cn: any) => (
                              <div key={cn._id} className="flex justify-between gap-4 text-xs">
                                <span className="text-muted-foreground font-medium">{cn.number || `CN-${cn._id?.substring(0, 6)}`}</span>
                                <span className="font-bold text-emerald-600">{formatRowAmount(d, cn.applied_amount || 0)}</span>
                              </div>
                            ))}
                          </div>
                        )}
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
            (d.email_log || []).length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-10">No emails sent yet.</p>
            ) : (
              <div className="divide-y rounded-lg border text-sm">
                {[...(d.email_log || [])].reverse().map((e: any, i: number) => (
                  <div key={i} className="p-3 space-y-0.5">
                    <div className="font-medium break-words">{e.subject}</div>
                    <div className="text-muted-foreground break-words">To: {(e.to || []).join(", ")}{(e.cc || []).length ? ` · CC: ${e.cc.join(", ")}` : ""}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.sent_at ? new Date(e.sent_at).toLocaleString() : ""}{e.pdf_attached ? " · PDF attached" : ""}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
          {activeTab === "View Tracking" && (
            <p className="text-sm text-muted-foreground italic text-center py-10">No views tracked yet.</p>
          )}
        </div>
      </div>
      </>}

      {/* ── Send Invoice Email Dialog ── */}
      <Dialog
        open={showEmailDialog}
        onOpenChange={(open) => {
          if (emailSending) return;
          setShowEmailDialog(open);
          if (!open && emailOnly) onClose();
        }}
      >
        <DialogContent className="max-w-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Send Invoice to Email</h2>

            {emailDraftLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-9 bg-muted animate-pulse rounded-md" />)}
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="email-to">To</Label>
                  <Input
                    id="email-to"
                    placeholder="customer@example.com, accounts@example.com"
                    value={emailForm.to}
                    onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))}
                  />
                  {!emailForm.to && (
                    <p className="text-xs text-muted-foreground">This customer has no contact with "Invoice emails" ticked. Type an email address.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email-cc">CC</Label>
                  <Input
                    id="email-cc"
                    placeholder="Optional, separate with commas"
                    value={emailForm.cc}
                    onChange={e => setEmailForm(f => ({ ...f, cc: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email-subject">Subject</Label>
                  <Input
                    id="email-subject"
                    maxLength={300}
                    value={emailForm.subject}
                    onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email-message">Message</Label>
                  <Textarea
                    id="email-message"
                    rows={9}
                    value={emailForm.message}
                    onChange={e => setEmailForm(f => ({ ...f, message: e.target.value }))}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="attach-pdf"
                    checked={attachPdf}
                    onChange={e => setAttachPdf(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  />
                  <label htmlFor="attach-pdf" className="text-sm cursor-pointer">Attach PDF ({pdfFileName})</label>
                </div>
              </>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <Button variant="outline" disabled={emailSending} onClick={() => setShowEmailDialog(false)}>Cancel</Button>
              <Button disabled={emailSending || emailDraftLoading} onClick={handleSendEmail}>
                {emailSending ? (attachPdf ? "Creating PDF & sending..." : "Sending...") : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Record Payment Dialog ── */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Record Payment for {invoiceNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center text-xs font-bold text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              <span>Balance Due</span>
              <span className="text-foreground">{formatRowAmount(d, balanceDue)}</span>
            </div>
            <div>
              <Label className="text-sm font-medium block mb-1.5">Amount</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                className="rounded-lg border-border/60"
              />
            </div>
            <div>
              <Label className="text-sm font-medium block mb-1.5">Payment Mode</Label>
              <Select value={paymentForm.paymentmode} onValueChange={(v) => setPaymentForm(p => ({ ...p, paymentmode: v }))}>
                <SelectTrigger className="rounded-lg border-border/60">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {paymentModes.map((m: any) => (
                    <SelectItem key={m._id} value={m.name}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium block mb-1.5">Date</Label>
              <Input
                type="date"
                value={paymentForm.date}
                onChange={(e) => setPaymentForm(p => ({ ...p, date: e.target.value }))}
                className="rounded-lg border-border/60"
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
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" className="rounded-lg" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
              <Button
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleRecordPayment}
                disabled={recordPaymentMutation.isPending}
              >
                {recordPaymentMutation.isPending ? "Saving..." : "Record Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Invoices = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(() => String(defaultPageSize(10)));
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  // "Copy link" gives /admin/invoices?view=<id>: open that invoice's panel.
  const [searchParams, setSearchParams] = useSearchParams();
  const viewId = searchParams.get("view");
  // Save & Send on the create page lands here with ?view=<id>&send=1.
  const [autoEmailId, setAutoEmailId] = useState<string | null>(null);
  useEffect(() => {
    if (!viewId) return;
    const sendNow = searchParams.get("send") === "1";
    salesService.getInvoiceById(viewId)
      .then((res: any) => {
        const doc = res?.data || res;
        if (doc?._id) {
          setSelectedInvoice(doc);
          setAutoEmailId(sendNow ? doc._id : null);
        } else {
          toast({ title: "Invoice not found", variant: "destructive" });
        }
      })
      .catch(() => toast({ title: "Invoice not found", variant: "destructive" }))
      .finally(() => setSearchParams((p) => { p.delete("view"); p.delete("send"); return p; }, { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId]);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  // The list row only carries the customer's company name; load the full
  // invoice (customer GST/VAT/address/email/phone) for the print preview.
  const openInvoicePreview = async (inv: any) => {
    setPreviewInvoice(inv);
    try {
      const full: any = await salesService.getInvoiceById(inv._id);
      const doc = full?.data || full;
      if (doc && doc._id) setPreviewInvoice(doc);
    } catch {
      /* keep the list-row preview */
    }
  };
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can, user, isModuleEnabled } = usePermissions();
  const isPilot = isTrinetraPilotUser(user?.email);
  // Branch is sourced from the HRMS module — only show/fetch it when the
  // tenant's plan actually includes HRMS, even for a pilot-flagged user.
  const canUseBranch = isPilot && isModuleEnabled("hrms");
  const canUseBankDetails = canAccessBankDetails(user?.email);

  const { data: branchesRaw = [] } = useQuery({
    queryKey: ["hrms-branches-list"],
    queryFn: () => hrmsbranchService.getAll().then((r) => r.data || []),
    enabled: canUseBranch,
    staleTime: 5 * 60 * 1000,
  });
  // Branch names that arrived via Excel import are free text, not HRMS branch
  // records — without this they'd show correctly in the table but could never
  // be picked from the filter dropdown (which only listed the HRMS master).
  const { data: importedBranches = [] } = useQuery<string[]>({
    queryKey: ["invoice-branches-list"],
    queryFn: () => salesService.getInvoiceBranches().then((r: any) => r.data || r || []),
    enabled: canUseBranch,
    staleTime: 5 * 60 * 1000,
  });
  const branches: { _id: string; name: string }[] = useMemo(() => {
    const seen = new Set<string>();
    const merged: { _id: string; name: string }[] = [];
    [...branchesRaw.map((b: any) => b.name), ...importedBranches].forEach((name) => {
      if (!name || seen.has(name)) return;
      seen.add(name);
      merged.push({ _id: name, name });
    });
    return merged;
  }, [branchesRaw, importedBranches]);
  const { symbol } = useCurrency();
  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies"],
    queryFn: () => financeService.getCurrencies().then((res: any) => res.data || res),
    staleTime: 5 * 60 * 1000,
  });

  const tableHeaders = useMemo(() => [
    "Voucher Number", "Bill Date", "Voucher Type",
    ...(isPilot ? ["Sales Person"] : []),
    "Party Name", "Party Address", "Party Group", "Terms of Payment", "GSTIN/UIN",
    "Item Name", "Item Group", "Item HSN", "GST percentage", "Item Batch",
    "Quantity", "Rate", "Unit",
    "Amount", "Freight", "Total",
    ...(canUseBranch ? ["Branch"] : []),
    ...(canUseBankDetails ? ["Bank Details"] : []),
  ], [isPilot, canUseBranch, canUseBankDetails]);

  const exportColumns = useMemo(() => [
    { header: "Voucher Number", key: "voucherNumber" },
    { header: "Bill Date", key: "billDate", type: "date" as const },
    { header: "Voucher Type", key: "voucherType" },
    ...(isPilot ? [{ header: "Sales Person", key: "salesPerson" }] : []),
    { header: "Party Name", key: "partyName" },
    { header: "Party Address", key: "partyAddress" },
    { header: "Party Group", key: "partyGroup" },
    { header: "Terms of Payment", key: "termsOfPayment" },
    { header: "GSTIN/UIN", key: "gstin" },
    { header: "Item Name", key: "itemName" },
    { header: "Item Group", key: "itemGroup" },
    { header: "Item HSN", key: "itemHSN" },
    { header: "GST percentage", key: "gstPercentage", type: "number" as const },
    { header: "Item Batch", key: "itemBatch" },
    { header: "Quantity", key: "quantity", type: "number" as const },
    { header: "Rate", key: "rate", type: "number" as const },
    { header: "Unit", key: "unit" },
    { header: "Amount", key: "amount", type: "number" as const },
    { header: "Freight", key: "freight", type: "number" as const },
    { header: "Total", key: "total", type: "number" as const },
    ...(canUseBranch ? [{ header: "Branch", key: "branch" }] : []),
    ...(canUseBankDetails ? [{ header: "Bank Details", key: "bankDetails" }] : []),
  ], [isPilot, canUseBranch, canUseBankDetails]);

  const TABLE_COLUMN_COUNT = 1 + tableHeaders.length + 1;

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
        // The server skips invoices with payments — show its own count/message.
        const res: any = await salesService.bulkDeleteInvoices(selectedIds);
        const body = res?.data ?? res;
        toast({ title: "Done", description: body?.message || `Deleted ${body?.deletedCount ?? 0} invoice(s).` });
      } else if (bulkState.status) {
        const results = await Promise.allSettled(selectedIds.map(id => salesService.updateInvoice(id, { status: bulkState.status })));
        const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
        const updated = results.length - failed.length;
        const reason = failed[0]?.reason?.response?.data?.message;
        toast({
          title: failed.length ? "Partly done" : "Success",
          description: `Updated ${updated} invoice(s).${failed.length ? ` ${failed.length} not changed${reason ? `: ${reason}` : "."}` : ""}`,
          variant: failed.length ? "destructive" : "default",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setSelectedIds([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false, status: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.message || "Failed to perform bulk action.", variant: "destructive" });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const getInvoiceBranchName = (i: any) => (i.branch?.name || i.branch || "");

  // Shared by both client-side fallback filters below ("All" page-size mode
  // and the export-time refetch) so the two stay in sync — mirrors every
  // field the backend's getInvoices search now also matches.
  const invoiceMatchesSearch = (i: any, q: string): boolean => {
    if (!q) return true;
    if ((i.number || "").toLowerCase().includes(q)) return true;
    if ((i.client?.company || "").toLowerCase().includes(q)) return true;
    if ((i.salesPerson || "").toLowerCase().includes(q)) return true;
    if ((i._id || "").toLowerCase().includes(q)) return true;
    if (getInvoiceBranchName(i).toLowerCase().includes(q)) return true;
    if ((i.voucherType || "").toLowerCase().includes(q)) return true;
    if ((i.partyAddress || "").toLowerCase().includes(q)) return true;
    if ((i.partyGroup || "").toLowerCase().includes(q)) return true;
    if ((i.termsOfPayment || "").toLowerCase().includes(q)) return true;
    if ((i.gstin || "").toLowerCase().includes(q)) return true;
    if ((getStatus(i.status).label || "").toLowerCase().includes(q)) return true;
    if ((i.items || []).some((item: any) =>
      (item.description || "").toLowerCase().includes(q) ||
      (item.itemGroup || "").toLowerCase().includes(q) ||
      (item.itemHSN || "").toLowerCase().includes(q) ||
      (item.itemBatch || "").toLowerCase().includes(q)
    )) return true;
    return false;
  };

  interface InvoicesPage {
    rows: any[];
    total: number;
    pages: number;
    statusAgg: { status: string; count: number; total: number; byCurrency?: Record<string, number> }[];
  }

  // Paginated server-side once a finite page size is chosen; "All" keeps
  // the legacy full fetch (also used by dashboard/report aggregation),
  // filtered client-side exactly as this page always has.
  const { data: invoicesResult, isLoading } = useQuery<InvoicesPage>({
    queryKey: ["invoices", itemsPerPage, currentPage, debouncedSearch, statusFilter, branchFilter],
    queryFn: async () => {
      if (itemsPerPage === "All") {
        const response = await salesService.getInvoices();
        const rows: any[] = Array.isArray(response) ? response : response?.data || [];

        // Status-card counts/totals always reflect the whole tenant list,
        // independent of the currently active filters — matches the
        // paginated path's server-side aggregate below.
        const aggMap = new Map<string, { count: number; total: number; byCurrency: Record<string, number> }>();
        rows.forEach((inv: any) => {
          const b = statusBucket(inv.status);
          const cur = aggMap.get(b) || { count: 0, total: 0, byCurrency: {} };
          cur.count++;
          cur.total += inv.total || 0;
          cur.byCurrency[inv.currency || ""] = (cur.byCurrency[inv.currency || ""] || 0) + (inv.total || 0);
          aggMap.set(b, cur);
        });
        const statusAgg = Array.from(aggMap.entries()).map(([status, v]) => ({ status, ...v }));

        const q = debouncedSearch.toLowerCase();
        const rowsFiltered = rows.filter((i: any) => {
          const matchSearch = invoiceMatchesSearch(i, q);
          const matchStatus = statusFilter === "all" || statusBucket(i.status) === statusFilter;
          const matchBranch = branchFilter === "all" || getInvoiceBranchName(i) === branchFilter;
          return matchSearch && matchStatus && matchBranch;
        });
        return { rows: rowsFiltered, total: rowsFiltered.length, pages: 1, statusAgg };
      }

      const res: any = await salesService.getInvoices({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        branch: branchFilter !== "all" ? branchFilter : undefined,
      });
      if (Array.isArray(res)) return { rows: [], total: 0, pages: 1, statusAgg: [] };
      return {
        rows: res?.data ?? [],
        total: res?.total ?? 0,
        pages: res?.pages ?? 1,
        statusAgg: res?.statusAgg ?? [],
      };
    },
    placeholderData: keepPreviousData,
  });
  const invoices: any[] = invoicesResult?.rows ?? [];

  const importMutation = useMutation({
    mutationFn: (rows: any[]) => salesService.importInvoices(rows),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      const body = data?.data ?? data;
      const count = body?.count ?? 0;
      // The server message says exactly what was renamed / skipped and why.
      toast({ title: count === 0 ? "Nothing Imported" : "Import Successful", description: body?.message || `Imported ${count} invoice(s).`, variant: count === 0 ? "destructive" : "default" });
    },
    onError: (err: any) => toast({ title: "Import Failed", description: err?.response?.data?.message || err.message, variant: "destructive" }),
  });

  const handleImportData = (rows: Record<string, any>[]) => {
    const valid = rows.filter(r => r["company"] || r["Company"] || r["number"] || r["Invoice #"] || r["Voucher Number"] || r["total"] || r["Total"] || r["Amount"] || r["Customer"] || r["Party Name"]);
    if (!valid.length) { toast({ title: "No valid rows", description: "Rows need at least a company/party or invoice/voucher number column.", variant: "destructive" }); return; }
    importMutation.mutate(valid as any);
  };

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
        description: error.response?.data?.message || error.message || "Failed to delete invoice.",
        variant: "destructive",
      });
    },
  });

  const stats = useMemo(() => {
    const counts: Record<string, number> = { unpaid: 0, paid: 0, partially_paid: 0, overdue: 0, cancelled: 0 };
    const totals: Record<string, number> = { unpaid: 0, paid: 0, partially_paid: 0, overdue: 0, cancelled: 0 };
    const byCurrency: Record<string, Record<string, number>> = {};
    (invoicesResult?.statusAgg ?? []).forEach((s) => {
      if (counts[s.status] !== undefined) {
        counts[s.status] = s.count;
        totals[s.status] = s.total;
        byCurrency[s.status] = s.byCurrency || { "": s.total };
      }
    });
    return { counts, totals, byCurrency };
  }, [invoicesResult]);

  // Flatten invoices into one row per line item for export — invoice-level
  // fields repeat across each of that invoice's item rows.
  const buildExportRows = (invoiceList: any[]) => invoiceList.flatMap((inv: any) => {
    const items = inv.items?.length > 0 ? inv.items : [{}];
    return items.map((item: any, idx: number) => ({
      voucherNumber: inv.number || `INV-${inv._id?.substring(0, 6)}`,
      billDate: inv.date || null,
      voucherType: inv.voucherType || "",
      partyName: inv.client?.company || "N/A",
      partyAddress: inv.partyAddress || "",
      partyGroup: inv.partyGroup || "",
      termsOfPayment: inv.termsOfPayment || "",
      gstin: inv.gstin || "",
      salesPerson: inv.salesPerson || "",
      itemName: item.description || "",
      itemGroup: item.itemGroup || "",
      itemHSN: item.itemHSN || "",
      gstPercentage: item.gstPercentage || 0,
      itemBatch: item.itemBatch || "",
      quantity: item.qty || 0,
      rate: item.rate || 0,
      unit: item.unit || "",
      amount: item.amount ?? ((item.qty || 0) * (item.rate || 0)),
      freight: item.freight_charge || 0,
      // Invoice-level grand total (already includes freight + tax, same figure
      // shown on the invoice detail/view panel) — repeats across every item
      // row of the same invoice, same convention the Purchases register uses.
      total: inv.total || 0,
      // branch — resolved from branchId if populated as object, else use stored name string
      branch: inv.branch?.name || inv.branch || "",
      bankDetails: inv.bank_detail ? `${inv.bank_detail.bankName || ""} — ${inv.bank_detail.accountNumber || ""}` : "",
      // Extra fields (ignored by ExportButton since it only reads the
      // configured `columns` keys) used to render the on-screen table:
      invoice: inv,
      rowKey: `${inv._id || inv.id}-${idx}`,
    }));
  });

  const totalInvoiceRows = invoicesResult?.total ?? 0;
  const invoicePageSize = itemsPerPage === "All" ? (totalInvoiceRows || 1) : parseInt(itemsPerPage);
  const totalInvoicePages = invoicesResult?.pages ?? 1;
  const safeInvoicePage = Math.min(currentPage, totalInvoicePages);
  const pageInvoices = invoices;

  // Export needs the full filtered set, not just the current page — fetched
  // on demand only when the user actually exports.
  const loadAllFilteredInvoices = async () => {
    const response = await salesService.getInvoices();
    const rows: any[] = Array.isArray(response) ? response : response?.data || [];
    const q = debouncedSearch.toLowerCase();
    return rows.filter((i: any) => {
      const matchSearch = invoiceMatchesSearch(i, q);
      const matchStatus = statusFilter === "all" || statusBucket(i.status) === statusFilter;
      const matchBranch = branchFilter === "all" || getInvoiceBranchName(i) === branchFilter;
      return matchSearch && matchStatus && matchBranch;
    });
  };

  // One row per line item for the on-screen table (mirrors buildExportRows),
  // keeping a reference to the parent invoice for checkbox/actions handling.
  const flatRows = useMemo(() => buildExportRows(pageInvoices), [pageInvoices]);

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
                onClick={() => { setStatusFilter(statusFilter === String(config.statusId) ? "all" : String(config.statusId)); setCurrentPage(1); }}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-1">
                    <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", config.color)}>
                      {config.label}
                    </span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-xl font-black text-slate-900">{count}</span>
                      <span className="text-[11px] font-bold text-slate-500 text-right">
                        {Object.entries(stats.byCurrency[config.statusId] || { "": total })
                          .filter(([, amt], _i, all) => amt !== 0 || all.length === 1)
                          .map(([cur, amt]) => {
                            const c = currencies.find((x: any) => x.name === cur) || currencies.find((x: any) => x.isdefault);
                            return `${c?.symbol ?? symbol}${Number(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          })
                          .join(" + ")}
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
            {(can("Invoices", "Delete") || can("Invoices", "Edit")) && <Dialog open={bulkActionOpen} onOpenChange={(open) => {
              if (open && selectedIds.length === 0) {
                toast({ title: "Error", description: "Please select at least one item first."});
                return;
              }
              setBulkState({ massDelete: false, status: "" }); // clear unsaved bulk choices on open/close
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
                  {can("Invoices", "Delete") && <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mass_delete"
                      className="border-red-200 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                      checked={bulkState.massDelete}
                      onCheckedChange={(checked) => setBulkState({...bulkState, massDelete: checked as boolean})}
                    />
                    <Label htmlFor="mass_delete" className="text-sm font-semibold text-red-600">Mass Delete</Label>
                  </div>}
                  {can("Invoices", "Edit") && <div className="space-y-1.5 pt-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Change Status</Label>
                    <Select value={bulkState.status} onValueChange={(val) => setBulkState({...bulkState, status: val})} disabled={bulkState.massDelete}>
                      <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-lg">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>}
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="ghost" onClick={() => setBulkActionOpen(false)} className="font-bold uppercase tracking-widest text-[10px]">Close</Button>
                  <Button onClick={handleBulkAction} disabled={isBulkLoading} className="font-bold uppercase tracking-widest text-[10px]">
                    {isBulkLoading ? "Processing..." : "Confirm"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>}
            <ExportButton
              data={async () => buildExportRows(await loadAllFilteredInvoices())}
              filename="invoices"
              columns={exportColumns}
            />
            {can("Invoices", "Create") && <ImportDialog
              title="Import Invoices"
              columns={INVOICE_IMPORT_COLUMNS}
              onData={handleImportData}
              loading={importMutation.isPending}
              triggerLabel="Import"
              templateFilename="invoices_sample_import.xlsx"
              sheetName="Invoices"
              mappingNote="Your Excel columns (Voucher Number, Bill Date, Party Name, GSTIN/UIN, Item Name, Quantity, Rate, Amount, Branch) will be automatically detected and mapped to invoices."
            />}
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
              placeholder="Search invoices..."
              className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* Invoices Table */}
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={pageInvoices.length > 0 && pageInvoices.every((i: any) => selectedIds.includes(i._id))}
                    onCheckedChange={() => toggleSelectAll(pageInvoices)}
                  />
                </TableHead>
                {tableHeaders.map((h) => (
                  <TableHead key={h} className="whitespace-nowrap">
                    {h}
                  </TableHead>
                ))}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={6} colSpan={TABLE_COLUMN_COUNT} />
              ) : flatRows.length === 0 ? (
                <TableEmpty colSpan={TABLE_COLUMN_COUNT}>No invoices found.</TableEmpty>
              ) : (
                flatRows.map((row: any) => {
                  const inv = row.invoice;
                  const status = statusMap[inv.status] || statusMap["unpaid"];
                  return (
                    <TableRow key={row.rowKey} className={`${selectedIds.includes(inv._id) ? 'bg-primary/5' : ''}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(inv._id)}
                          onCheckedChange={() => toggleSelect(inv._id)}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            className="font-bold text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer text-left"
                            onClick={() => setSelectedInvoice(inv)}
                          >
                            {row.voucherNumber}
                          </button>
                          <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5", status.color)}>
                            {status.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {row.billDate ? formatDate(row.billDate) : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{row.voucherType || "-"}</TableCell>
                      {isPilot && <TableCell className="text-muted-foreground whitespace-nowrap">{row.salesPerson || "-"}</TableCell>}

                      <TableCell className="font-medium text-foreground whitespace-nowrap">{row.partyName}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{row.partyAddress || "-"}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{row.partyGroup || "-"}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{row.termsOfPayment || "-"}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{row.gstin || "-"}</TableCell>
                      <TableCell className="font-medium text-foreground whitespace-nowrap">{row.itemName || "-"}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{row.itemGroup || "-"}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{row.itemHSN || "-"}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{row.gstPercentage || 0}%</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{row.itemBatch || "-"}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{row.quantity || 0}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{formatRowAmount(inv, row.rate || 0)}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{row.unit || "-"}</TableCell>
                      <TableCell className="font-black text-foreground whitespace-nowrap">{formatRowAmount(inv, row.amount || 0)}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{formatRowAmount(inv, row.freight || 0)}</TableCell>
                      <TableCell className="font-black text-primary whitespace-nowrap">{formatRowAmount(inv, row.total || 0)}</TableCell>
                      {canUseBranch && <TableCell className="text-muted-foreground whitespace-nowrap">{row.branch || "-"}</TableCell>}
                      {canUseBankDetails && <TableCell className="text-muted-foreground whitespace-nowrap">{row.bankDetails || "-"}</TableCell>}
                      <TableCell>
                        <TableActions
                          onView={() => openInvoicePreview(inv)}
                          onEdit={can("Invoices", "Edit") ? () => navigate(`/admin/invoices/edit/${inv._id}`) : undefined}
                          onDelete={can("Invoices", "Delete") ? () => deleteMutation.mutate(inv._id) : undefined}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <TablePagination page={safeInvoicePage} pageSize={invoicePageSize} total={totalInvoiceRows} onPageChange={setCurrentPage} />
        </TableContainer>
      </div>

      {/* Save & Send: only the "Send Invoice to Email" window, no invoice panel behind it. */}
      {selectedInvoice && autoEmailId === (selectedInvoice._id || selectedInvoice.id) && (
        <InvoiceDetailPanel
          invoice={selectedInvoice}
          emailOnly
          autoOpenEmail
          onClose={() => { setSelectedInvoice(null); setAutoEmailId(null); }}
          onView={() => {}}
          onEdit={() => {}}
          isFullscreen={false}
          setIsFullscreen={() => {}}
        />
      )}

      {/* Centered popup dialog */}
      <Dialog
        open={!!selectedInvoice && autoEmailId !== (selectedInvoice._id || selectedInvoice.id)}
        onOpenChange={(open) => { if (!open) { setSelectedInvoice(null); setIsFullscreen(false); } }}
      >
        <DialogContent className={cn("w-full p-0 overflow-hidden rounded-2xl transition-all", isFullscreen ? "max-w-[95vw]" : "max-w-3xl")}>
          {selectedInvoice && (
            <InvoiceDetailPanel
              invoice={selectedInvoice}
              onClose={() => setSelectedInvoice(null)}
              onView={() => {
                openInvoicePreview(selectedInvoice);
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

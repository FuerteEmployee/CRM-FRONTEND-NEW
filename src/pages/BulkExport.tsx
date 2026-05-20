import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileDown, Calendar, Tag, Download, Info } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { salesService } from "@/api/services/sales.service";
import { estimateService } from "@/api/services/estimate.service";

const EXPORT_TYPES = [
  { id: "invoices", label: "Invoices" },
  { id: "estimates", label: "Estimates" },
  { id: "payments", label: "Payments" },
  { id: "credit_notes", label: "Credit Notes" },
  { id: "proposals", label: "Proposals" },
  { id: "expenses", label: "Expenses" },
];

const STATUS_CONFIG: Record<string, string[]> = {
  invoices: ["Unpaid", "Paid", "Partially Paid", "Overdue", "Draft", "Cancelled"],
  estimates: ["Draft", "Sent", "Accepted", "Declined", "Expired"],
  payments: ["Completed", "Pending", "Failed"],
  credit_notes: ["Open", "Closed", "Void"],
  proposals: ["Open", "Sent", "Revised", "Declined", "Accepted"],
  expenses: ["Unbilled", "Billed", "Billable", "Non-Billable"],
};

const PAYMENT_MODES = ["Bank", "UPI"];

const BulkExport = () => {
  const [exportType, setExportType] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [tag, setTag] = useState<string>("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [paymentMode, setPaymentMode] = useState<string>("");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleTypeChange = (value: string) => {
    setExportType(value);
    setSelectedStatuses([]); 
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleBulkExport = async () => {
    if (!exportType) return;
    setIsExporting(true);
    try {
      let data = [];
      let headers: string[] = [];
      let rows: any[][] = [];

      if (exportType === "invoices") {
        const response = await salesService.getInvoices();
        data = response || [];
        headers = ["Invoice Number", "Customer Name", "Date", "Due Date", "Total", "Tax", "Status"];
        rows = data.map((inv: any) => [
          inv.number || inv.invoice_number || "-",
          inv.customer_name || inv.customer?.company || "-",
          inv.date ? inv.date.split("T")[0] : "-",
          inv.due_date ? inv.due_date.split("T")[0] : "-",
          inv.total || 0,
          inv.total_tax || 0,
          inv.status || "Draft"
        ]);
      } else if (exportType === "estimates") {
        const response = await estimateService.getEstimates();
        data = response || [];
        headers = ["Estimate Number", "Customer Name", "Date", "Expiry Date", "Total", "Status"];
        rows = data.map((est: any) => [
          est.number || est.estimate_number || "-",
          est.customer_name || est.customer?.company || "-",
          est.date ? est.date.split("T")[0] : "-",
          est.expiry_date ? est.expiry_date.split("T")[0] : "-",
          est.total || 0,
          est.status || "Draft"
        ]);
      } else if (exportType === "payments") {
        const response = await salesService.getPayments();
        data = response || [];
        headers = ["Payment ID", "Invoice Number", "Payment Mode", "Transaction ID", "Amount", "Date"];
        rows = data.map((p: any) => [
          p._id || p.id || "-",
          p.invoice_number || "-",
          p.payment_mode || "-",
          p.transaction_id || "-",
          p.amount || 0,
          p.date ? p.date.split("T")[0] : "-"
        ]);
      } else if (exportType === "credit_notes") {
        const response = await salesService.getCreditNotes();
        data = response || [];
        headers = ["Credit Note Number", "Customer Name", "Date", "Total", "Status"];
        rows = data.map((cn: any) => [
          cn.number || cn.credit_note_number || "-",
          cn.customer_name || cn.customer?.company || "-",
          cn.date ? cn.date.split("T")[0] : "-",
          cn.total || 0,
          cn.status || "Open"
        ]);
      } else if (exportType === "proposals") {
        const response = await salesService.getProposals();
        data = response || [];
        headers = ["Proposal Number", "Customer Name", "Subject", "Date", "Open Till", "Total", "Status"];
        rows = data.map((prop: any) => [
          prop.number || prop.proposal_number || "-",
          prop.customer_name || prop.customer?.company || "-",
          prop.subject || "-",
          prop.date ? prop.date.split("T")[0] : "-",
          prop.open_till ? prop.open_till.split("T")[0] : "-",
          prop.total || 0,
          prop.status || "Open"
        ]);
      } else if (exportType === "expenses") {
        const response = await salesService.getExpenses();
        data = response || [];
        headers = ["Category", "Customer Name", "Date", "Amount", "Tax", "Note", "Billable", "Status"];
        rows = data.map((exp: any) => [
          exp.category?.name || exp.category || "-",
          exp.client?.company || exp.customer_name || "-",
          exp.date ? exp.date.split("T")[0] : "-",
          exp.amount || 0,
          exp.tax || 0,
          exp.note || "-",
          exp.billable ? "Yes" : "No",
          exp.status || "Unbilled"
        ]);
      }

      // Filter rows based on fromDate, toDate, selectedStatuses
      let filteredRows = rows;
      if (fromDate) {
        filteredRows = filteredRows.filter(r => r[2] >= fromDate);
      }
      if (toDate) {
        filteredRows = filteredRows.filter(r => r[2] <= toDate);
      }
      if (selectedStatuses.length > 0) {
        const statusIdx = exportType === "expenses" ? 7 : (exportType === "payments" ? 2 : (exportType === "proposals" ? 6 : (exportType === "estimates" ? 5 : (exportType === "invoices" ? 6 : 4))));
        filteredRows = filteredRows.filter(r => {
          const rowStatus = String(r[statusIdx]).toLowerCase();
          return selectedStatuses.some(s => s.toLowerCase() === rowStatus);
        });
      }

      if (filteredRows.length === 0) {
        toast.error("No matching records found for export");
        return;
      }

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...filteredRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `bulk_export_${exportType}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`${filteredRows.length} ${exportType} records exported successfully!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export bulk data from API");
    } finally {
      setIsExporting(false);
    }
  };

  const currentStatuses = exportType ? STATUS_CONFIG[exportType] : [];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
        {/* Header */}
        <div className="flex items-center gap-4 bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <FileDown className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bulk PDF Export</h1>
            <p className="text-muted-foreground text-sm font-medium">Export documents in bulk based on your filters</p>
          </div>
        </div>

        {/* Main Form */}
        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-8 space-y-8">
            
            {/* 1. Select Type - Full Row */}
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select Type <span className="text-destructive">*</span>
              </Label>
              <Select value={exportType} onValueChange={handleTypeChange}>
                <SelectTrigger className="h-12 rounded-xl bg-accent/20 border-border/40">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {EXPORT_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. From Date - Full Row */}
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3 w-3" /> From Date
              </Label>
              <Input 
                type="date" 
                className="h-12 rounded-xl bg-accent/20 border-border/40 w-full" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            {/* 3. To Date - Full Row */}
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3 w-3" /> To Date
              </Label>
              <Input 
                type="date" 
                className="h-12 rounded-xl bg-accent/20 border-border/40 w-full" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            {/* 4. Include Tag - Full Row */}
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Tag className="h-3 w-3" /> Include Tag
              </Label>
              <Input 
                placeholder="Enter tag..." 
                className="h-12 rounded-xl bg-accent/20 border-border/40 w-full" 
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              />
            </div>

            {/* 5. Payment Mode - Conditional Full Row */}
            {exportType === "payments" && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger className="h-12 rounded-xl bg-accent/20 border-border/40 w-full">
                    <SelectValue placeholder="All Modes" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode.toLowerCase()}>{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 6. Statuses - Full Width Grid inside row */}
            {exportType && (
              <div className="pt-6 border-t border-border/40 space-y-4 animate-in fade-in duration-500">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-4">
                  Select Statuses to Export
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {currentStatuses.map((status) => (
                    <div 
                      key={status}
                      onClick={() => toggleStatus(status)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200",
                        selectedStatuses.includes(status) 
                          ? "bg-primary/5 border-primary text-primary shadow-sm" 
                          : "bg-accent/10 border-border/40 hover:border-border"
                      )}
                    >
                      <Checkbox checked={selectedStatuses.includes(status)} className="rounded-full h-5 w-5 data-[state=checked]:bg-primary border-border/60" />
                      <span className="text-xs font-bold uppercase tracking-tighter">{status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Export Button - Standard Size */}
            <div className="pt-6 flex justify-start">
              <Button 
                className="h-10 px-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
                disabled={!exportType || isExporting}
                onClick={handleBulkExport}
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Export"}
              </Button>
            </div>

            <div className="flex gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
               <Info className="h-5 w-5 text-primary shrink-0" />
               <p className="text-[11px] text-muted-foreground leading-normal">
                 Large exports are processed in the background. You will receive a notification when the archive is ready for download.
               </p>
            </div>

          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BulkExport;

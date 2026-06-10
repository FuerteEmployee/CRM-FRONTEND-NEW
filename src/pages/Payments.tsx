import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Search,
  Download,
  FileText,
  Printer,
  Eye,
  CreditCard,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { ExportButton } from "@/components/ui/export-button";

const Payments = () => {
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [viewItem, setViewItem] = useState<any>(null);
  const { toast } = useToast();
  const { can } = usePermissions();

  const { data: payments = [], isLoading } = useQuery<any[]>({
    queryKey: ["payments"],
    queryFn: async () => {
      const response = await salesService.getPayments();
      return Array.isArray(response) ? response : response?.data || [];
    },
  });

  const filtered = useMemo(() => {
    return payments.filter((p: any) => {
      const matchSearch =
        (p._id || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.invoice?.number || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.invoice?.client?.company || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.transactionid || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.paymentmode || "").toLowerCase().includes(search.toLowerCase());
      
      return matchSearch;
    });
  }, [payments, search]);

  const totalReceived = useMemo(() => {
    return payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  }, [payments]);

  const handleExport = (type: "pdf" | "csv" | "print") => {
    if (filtered.length === 0) {
      toast({
        title: "No data",
        description: "There are no payments to export.",
        variant: "destructive",
      });
      return;
    }

    if (type === "csv") {
      const headers = ["Payment #", "Invoice #", "Customer", "Payment Mode", "Transaction ID", "Amount", "Date"];
      const rows = filtered.map((p: any) => [
        p._id?.substring(0, 8) || "",
        p.invoice?.number || "N/A",
        p.invoice?.client?.company || "N/A",
        p.paymentmode || "Bank Transfer",
        p.transactionid || "-",
        `INR ${p.amount || 0}`,
        p.date ? formatDate(p.date) : "-",
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `payments_export_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
              filename="payments" 
              columns={[
                { header: "Payment #", key: (p) => p._id?.substring(0, 8) || "" },
                { header: "Invoice #", key: (p) => p.invoice?.number || "N/A" },
                { header: "Customer", key: (p) => p.invoice?.client?.company || "N/A" },
                { header: "Payment Mode", key: (p) => p.paymentmode || "Bank Transfer" },
                { header: "Transaction ID", key: (p) => p.transactionid || "-" },
                { header: "Amount", key: "amount" },
                { header: "Date", key: "date" }
              ]} 
            />
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search payments..."
              className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Payments Table */}
        <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
              <tr>
                {["Payment #", "Invoice #", "Customer", "Payment Mode", "Transaction ID", "Amount", "Date", "Actions"].map((h) => (
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
                    No payments found.
                  </td>
                </tr>
              ) : (
                filtered
                  .slice(0, itemsPerPage === "All" ? filtered.length : parseInt(itemsPerPage))
                  .map((p: any) => (
                    <tr key={p._id} className="hover:bg-muted/30 transition-colors">
                      <td
                        className="px-6 py-4 font-bold text-primary cursor-pointer hover:underline"
                        onClick={() => setViewItem(p)}
                      >
                        {p._id?.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {p.invoice?.number || "N/A"}
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {p.invoice?.client?.company || "N/A"}
                      </td>
                      <td className="px-6 py-4 uppercase text-[10px] font-black tracking-widest text-muted-foreground">
                        {p.paymentmode || "Bank Transfer"}
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px] text-foreground">
                        {p.transactionid || "-"}
                      </td>
                      <td className="px-6 py-4 font-black text-emerald-600">
                        ₹{(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {p.date ? formatDate(p.date) : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <TableActions
                          onView={() => setViewItem(p)}
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

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none shadow-2xl bg-white/95 backdrop-blur-md">
          <DialogHeader className="border-b border-border/50 pb-4 mb-4">
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Details
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Payment ID</p>
                  <p className="text-sm font-bold text-slate-800">{viewItem._id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Invoice #</p>
                  <p className="text-sm font-bold text-slate-800">{viewItem.invoice?.number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Customer</p>
                  <p className="text-sm font-medium text-slate-700">{viewItem.invoice?.client?.company || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Payment Mode</p>
                  <p className="text-sm font-bold text-slate-700 uppercase tracking-widest text-[10px]">{viewItem.paymentmode || "Bank Transfer"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Transaction ID</p>
                  <p className="text-sm font-mono text-slate-700">{viewItem.transactionid || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Amount</p>
                  <p className="text-sm font-black text-emerald-600">₹{(viewItem.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Payment Date</p>
                  <p className="text-sm font-medium text-slate-700">{viewItem.date ? formatDate(viewItem.date) : "-"}</p>
                </div>
              </div>
              {viewItem.note && (
                <div className="border-t border-border/50 pt-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Payment Note</p>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{viewItem.note}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Payments;

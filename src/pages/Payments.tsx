import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Search,
  Download,
  FileText,
  Printer,
  Eye,
  CreditCard,
  Zap,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { toast } = useToast();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({ massDelete: false });
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = (items: any[]) => {
    setSelectedIds(prev => prev.length === items.length ? [] : items.map(i => i._id));
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) {
      toast({ title: "Error", description: "No items selected.", variant: "destructive" });
      return;
    }
    setIsBulkLoading(true);
    try {
      if (bulkState.massDelete) {
        await Promise.all(selectedIds.map(id => salesService.deletePayment(id)));
        toast({ title: "Success", description: `Deleted ${selectedIds.length} items.` });
      }
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setSelectedIds([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false });
    } catch {
      toast({ title: "Error", description: "Failed to perform bulk action.", variant: "destructive" });
    } finally {
      setIsBulkLoading(false);
    }
  };

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
                <th className="w-10 px-3 py-4">
                  {(() => {
                    const pageData = filtered.slice(0, itemsPerPage === "All" ? filtered.length : parseInt(itemsPerPage));
                    return (
                      <Checkbox
                        checked={selectedIds.length === pageData.length && pageData.length > 0}
                        onCheckedChange={() => toggleSelectAll(pageData)}
                      />
                    );
                  })()}
                </th>
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
                      <td colSpan={9} className="p-4">
                        <Skeleton className="h-10 w-full" />
                      </td>
                    </tr>
                  ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground italic">
                    No payments found.
                  </td>
                </tr>
              ) : (
                filtered
                  .slice(0, itemsPerPage === "All" ? filtered.length : parseInt(itemsPerPage))
                  .map((p: any) => (
                    <tr key={p._id} className={`hover:bg-muted/30 transition-colors ${selectedIds.includes(p._id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={selectedIds.includes(p._id)}
                          onCheckedChange={() => toggleSelect(p._id)}
                        />
                      </td>
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

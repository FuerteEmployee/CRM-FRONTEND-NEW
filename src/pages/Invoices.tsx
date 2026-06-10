import { useState, useMemo } from "react";
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
  Zap
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

const Invoices = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [viewItem, setViewItem] = useState<any>(null);
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
                        <td
                          className="px-6 py-4 font-bold text-primary cursor-pointer hover:underline"
                          onClick={() => setViewItem(inv)}
                        >
                          {inv.number || `INV-${inv._id?.substring(0, 6)}`}
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
                            onView={() => setViewItem(inv)}
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

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 border-none shadow-2xl bg-white/95 backdrop-blur-md">
          <DialogHeader className="border-b border-border/50 pb-4 mb-4">
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Invoice #{viewItem?.number || viewItem?._id?.substring(0, 8)}
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Customer</p>
                  <p className="text-sm font-bold text-slate-800">{viewItem.client?.company || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Status</p>
                  <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5", statusMap[viewItem.status]?.color)}>
                    {statusMap[viewItem.status]?.label || "Unpaid"}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Issue Date</p>
                  <p className="text-sm font-medium text-slate-700">{viewItem.date ? formatDate(viewItem.date) : "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Due Date</p>
                  <p className="text-sm font-medium text-slate-700">{viewItem.duedate ? formatDate(viewItem.duedate) : "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Total Amount</p>
                  <p className="text-sm font-extrabold text-slate-900">₹{(viewItem.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Total Tax</p>
                  <p className="text-sm font-bold text-slate-600">₹{(viewItem.total_tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {viewItem.short_description && (
                <div className="border-t border-border/50 pt-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Notes / Description</p>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{viewItem.short_description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Invoices;

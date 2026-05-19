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
  Receipt,
  Eye,
  Trash2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { creditNoteService } from "@/api/services/credit_note.service";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

const statusMap: Record<number, { label: string; color: string }> = {
  1: { label: "Open", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  2: { label: "Closed", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  3: { label: "Void", color: "bg-slate-50 text-slate-700 border-slate-200" },
};

const CreditNotes = () => {
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [viewItem, setViewItem] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const { data: creditNotes = [], isLoading } = useQuery<any[]>({
    queryKey: ["creditNotes"],
    queryFn: async () => {
      const response = await creditNoteService.getAll();
      return Array.isArray(response) ? response : response?.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => creditNoteService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creditNotes"] });
      toast({
        title: "Deleted",
        description: "Credit Note deleted successfully.",
        className: "bg-emerald-600 text-white border-none",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete credit note.",
        variant: "destructive",
      });
    },
  });

  const filtered = useMemo(() => {
    return creditNotes.filter((cn: any) => {
      const matchSearch =
        (cn.number || "").toLowerCase().includes(search.toLowerCase()) ||
        (cn.client?.company || "").toLowerCase().includes(search.toLowerCase()) ||
        (cn._id || "").toLowerCase().includes(search.toLowerCase()) ||
        (cn.reference || "").toLowerCase().includes(search.toLowerCase());
      
      return matchSearch;
    });
  }, [creditNotes, search]);

  const totalCreditsAvailable = useMemo(() => {
    return creditNotes
      .filter((cn: any) => cn.status === 1)
      .reduce((acc: number, cn: any) => acc + (cn.remaining_amount ?? cn.total), 0);
  }, [creditNotes]);

  const handleExport = (type: "pdf" | "csv" | "print") => {
    if (filtered.length === 0) {
      toast({
        title: "No data",
        description: "There are no credit notes to export.",
        variant: "destructive",
      });
      return;
    }

    if (type === "csv") {
      const headers = ["Credit Note #", "Customer", "Date", "Status", "Reference", "Amount", "Remaining Amount"];
      const rows = filtered.map((cn: any) => [
        cn.number || `CN-${cn._id?.substring(0, 6)}`,
        cn.client?.company || "N/A",
        cn.date ? formatDate(cn.date) : "-",
        statusMap[cn.status]?.label || "Open",
        cn.reference || "-",
        `INR ${cn.total || 0}`,
        `INR ${cn.remaining_amount ?? cn.total ?? 0}`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `credit_notes_export_${new Date().toISOString().split("T")[0]}.csv`);
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
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Credit Notes</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Manage customer credit balances & void adjustments
              </p>
            </div>
          </div>
          {can("Invoices", "Create") && (
            <Button
              className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
              onClick={() => navigate("/admin/credit-notes/create")}
            >
              <Plus className="h-4 w-4" />
              New Credit Note
            </Button>
          )}
        </div>

        {/* Credits Available Banner */}
        <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-primary/10">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xl font-black text-foreground">
                ₹{totalCreditsAvailable.toLocaleString(undefined, { minimumFractionDigits: 2 })} credits available.
              </p>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">
                Available balance to apply to invoices
              </p>
            </div>
          </div>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg font-bold uppercase tracking-wider text-[10px] gap-2 border-none bg-background shadow-sm"
                >
                  <Download className="h-3.5 w-3.5 text-primary" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40 rounded-xl border-border/50 shadow-xl p-1">
                <DropdownMenuItem
                  onClick={() => handleExport("pdf")}
                  className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group"
                >
                  <FileText className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport("csv")}
                  className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group"
                >
                  <FileText className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">CSV</span>
                </DropdownMenuItem>
                <div className="h-px bg-border/50 my-1 mx-1" />
                <DropdownMenuItem
                  onClick={() => handleExport("print")}
                  className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group"
                >
                  <Printer className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Print</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search credit notes..."
              className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Credit Notes Table */}
        <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
              <tr>
                {["Credit Note #", "Customer", "Date", "Status", "Reference#", "Amount", "Remaining Amount", "Actions"].map((h) => (
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
                    No credit notes found.
                  </td>
                </tr>
              ) : (
                filtered
                  .slice(0, itemsPerPage === "All" ? filtered.length : parseInt(itemsPerPage))
                  .map((note: any) => {
                    const status = statusMap[note.status] || statusMap[1];
                    return (
                      <tr key={note._id} className="hover:bg-muted/30 transition-colors">
                        <td
                          className="px-6 py-4 font-bold text-primary cursor-pointer hover:underline"
                          onClick={() => setViewItem(note)}
                        >
                          {note.number || `CN-${note._id?.substring(0, 6)}`}
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground">
                          {note.client?.company || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {note.date ? formatDate(note.date) : "-"}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1", status.color)}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-mono text-[11px] text-foreground">
                          {note.reference || "-"}
                        </td>
                        <td className="px-6 py-4 font-black text-foreground">
                          ₹{(note.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 font-black text-primary">
                          ₹{(note.remaining_amount ?? note.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <TableActions
                            onView={() => setViewItem(note)}
                            onEdit={can("Invoices", "Edit") ? () => navigate(`/admin/credit-notes/edit/${note._id}`) : undefined}
                            onDelete={can("Invoices", "Delete") ? () => deleteMutation.mutate(note._id) : undefined}
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
              Credit Note #{viewItem?.number || viewItem?._id?.substring(0, 8)}
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
                    {statusMap[viewItem.status]?.label || "Open"}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Issue Date</p>
                  <p className="text-sm font-medium text-slate-700">{viewItem.date ? formatDate(viewItem.date) : "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Reference</p>
                  <p className="text-sm font-medium text-slate-700">{viewItem.reference || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Total Amount</p>
                  <p className="text-sm font-extrabold text-slate-900">₹{(viewItem.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Remaining Credits</p>
                  <p className="text-sm font-extrabold text-primary">₹{(viewItem.remaining_amount ?? viewItem.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {viewItem.client_note && (
                <div className="border-t border-border/50 pt-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Client Note</p>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{viewItem.client_note}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CreditNotes;

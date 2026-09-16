import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Search, Download, FileText, FileSpreadsheet, Printer, ChevronLeft, ChevronRight, MoreHorizontal, Zap, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
import { formatDate } from "@/lib/dateFormat";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const Subscriptions = () => {
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({ massDelete: false });
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptions = [], isLoading } = useQuery<any[]>({
    queryKey: ["subscriptions"],
    queryFn: salesService.getSubscriptions,
  });

  const filtered = subscriptions.filter((s: any) =>
    (s.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.client?.company || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.status || "").toLowerCase().includes(search.toLowerCase())
  );

  const subPageSize = itemsPerPage === "All" ? (filtered.length || 1) : parseInt(itemsPerPage);
  const totalSubPages = Math.max(1, Math.ceil(filtered.length / subPageSize));
  const safeSubPage = Math.min(currentPage, totalSubPages);
  const paginatedSubs = itemsPerPage === "All" ? filtered : filtered.slice((safeSubPage - 1) * subPageSize, safeSubPage * subPageSize);

  const handleBulkAction = async () => {
    if (selectedItems.length === 0) {
      toast({ title: "Error", description: "No items selected."});
      return;
    }
    setIsBulkLoading(true);

    try {
      if (bulkState.massDelete) {
        await Promise.all(selectedItems.map(id => salesService.deleteSubscription(id)));
        toast({ title: "Success", description: `Deleted ${selectedItems.length} subscriptions.` });
      }
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      setSelectedItems([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false });
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to perform bulk action."});
    } finally {
      setIsBulkLoading(false);
    }
  };

  const allSubPageSelected = paginatedSubs.length > 0 && paginatedSubs.every((s: any) => selectedItems.includes(s._id));

  const handleSelectAll = (checked: boolean) => {
    const pageIds = paginatedSubs.map((s: any) => s._id);
    if (checked) {
      setSelectedItems(prev => [...new Set([...prev, ...pageIds])]);
    } else {
      setSelectedItems(prev => prev.filter((id: string) => !pageIds.includes(id)));
    }
  };

  const handleExport = (type: "csv" | "pdf" | "print") => {
    if (filtered.length === 0) {
      toast({ title: "Error", description: "No data to export", variant: "destructive" });
      return;
    }

    if (type === "csv") {
      const headers = ["Subscription Name", "Client", "Amount", "Status", "Date Created"];
      const rows = filtered.map((s: any) => [
        s.name || "",
        s.client?.company || "-",
        s.amount || "0.00",
        s.status || "active",
        s.datecreated ? formatDate(s.datecreated) : "-"
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `subscriptions_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Success", description: "Exported successfully as CSV" });
    } else if (type === "print") {
      window.print();
    } else if (type === "pdf") {
      toast({ title: "Print Mode", description: "Ready to save - choose Save as PDF in print options" });
      window.print();
    }
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    active: { label: "Active", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    future: { label: "Future", color: "bg-blue-50 text-blue-700 border-blue-200" },
    in_trial: { label: "In Trial", color: "bg-amber-50 text-amber-700 border-amber-200" },
    past_due: { label: "Past Due", color: "bg-orange-50 text-orange-700 border-orange-200" },
    canceled: { label: "Canceled", color: "bg-red-50 text-red-700 border-red-200" },
    unpaid: { label: "Unpaid", color: "bg-slate-50 text-slate-700 border-slate-200" },
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2 tracking-tight">
              Subscriptions
            </h1>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">
              Manage recurring customer billing
            </p>
          </div>
          <Button 
            className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
            onClick={() => navigate("/admin/subscriptions/create")}
          >
            <Plus className="h-4 w-4" />
            New Subscription
          </Button>
        </div>

        <Card className="border-none shadow-2xl shadow-primary/5 rounded-[2.5rem] bg-background/60 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-8 space-y-6">
            {/* Table Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Select value={itemsPerPage} onValueChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-10 w-[80px] rounded-xl bg-white border-slate-200 shadow-sm font-bold text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="All">All</SelectItem>
                  </SelectContent>
                </Select>

                <Dialog open={bulkActionOpen} onOpenChange={(open) => {
                  if (open && selectedItems.length === 0) {
                    toast({ title: "Error", description: "Please select at least one item first."});
                    return;
                  }
                  setBulkActionOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all"
                    >
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      Bulk Actions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Bulk Actions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 pt-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="massDelete" 
                          className="border-red-500 data-[state=checked]:bg-red-500"
                          checked={bulkState.massDelete}
                          onCheckedChange={(checked) => setBulkState({...bulkState, massDelete: checked as boolean})}
                        />
                        <Label htmlFor="massDelete" className="text-red-600 font-bold">Mass Delete</Label>
                      </div>
                      <Button 
                        onClick={handleBulkAction} 
                        disabled={!bulkState.massDelete || isBulkLoading} 
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold tracking-widest uppercase text-xs h-12"
                      >
                        {isBulkLoading ? "Processing..." : "Confirm"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all">
                      <Download className="h-3.5 w-3.5 text-primary" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 rounded-2xl border-slate-200 shadow-2xl p-2">
                    <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-3 py-2.5 px-3 cursor-pointer rounded-xl hover:bg-primary/5 transition-colors group">
                      <FileText className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold uppercase tracking-wider">Export PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-3 py-2.5 px-3 cursor-pointer rounded-xl hover:bg-primary/5 transition-colors group">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold uppercase tracking-wider">Export CSV</span>
                    </DropdownMenuItem>
                    <div className="h-px bg-slate-100 my-1 mx-1" />
                    <DropdownMenuItem onClick={() => handleExport("print")} className="gap-3 py-2.5 px-3 cursor-pointer rounded-xl hover:bg-primary/5 transition-colors group">
                      <Printer className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold uppercase tracking-wider">Print List</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="relative w-full md:w-72 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search subscriptions..."
                  className="pl-10 h-10 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-primary/20 transition-all text-sm font-medium"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>

            {/* Subscriptions Table */}
            <div className="rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm bg-white/50">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-slate-500 w-12 text-center">
                      <Checkbox
                        checked={allSubPageSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-slate-500 w-16">#</th>
                    <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-slate-500">Subscription Name</th>
                    <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-slate-500">Project</th>
                    <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-slate-500">Status</th>
                    <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-slate-500">Next Billing Cycle</th>
                    <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-slate-500">Date Subscribed</th>
                    <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-slate-500">Last Sent</th>
                    <th className="px-6 py-5 font-black uppercase tracking-[0.2em] text-[10px] text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4 text-center"><Skeleton className="h-4 w-4 rounded mx-auto" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-4 rounded" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-40 rounded" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-24 rounded" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-24 rounded" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-24 rounded" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-24 rounded" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-8 w-8 rounded-full ml-auto" /></td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-bold italic bg-slate-50/20">
                        No entries found
                      </td>
                    </tr>
                  ) : (
                    paginatedSubs.map((s: any, index: number) => {
                      const status = statusMap[s.status] || statusMap.active;
                      return (
                        <tr
                          key={s._id}
                          className="hover:bg-primary/[0.02] transition-colors group border-b border-slate-50 last:border-0"
                        >
                          <td className="px-6 py-5 text-center">
                            <Checkbox 
                              checked={selectedItems.includes(s._id)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedItems([...selectedItems, s._id]);
                                else setSelectedItems(selectedItems.filter(id => id !== s._id));
                              }}
                            />
                          </td>
                          <td className="px-6 py-5 text-xs font-black text-slate-400">
                            {index + 1}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-black text-slate-900 group-hover:text-primary transition-colors cursor-pointer">
                                {s.name}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">
                                {s.client?.company || "No Client"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-xs font-bold text-slate-600 italic">
                            {s.project?.name || "N/A"}
                          </td>
                          <td className="px-6 py-5">
                            <Badge variant="outline" className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border-none shadow-sm", status.color)}>
                              {status.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-5 text-xs font-bold text-slate-600 uppercase">
                            {s.next_billing_cycle ? formatDate(s.next_billing_cycle) : "N/A"}
                          </td>
                          <td className="px-6 py-5 text-xs font-bold text-slate-400 tracking-tight">
                            {s.date_subscribed ? formatDate(s.date_subscribed) : "-"}
                          </td>
                          <td className="px-6 py-5 text-xs font-bold text-slate-400 tracking-tight italic">
                            {s.last_sent ? formatDate(s.last_sent) : "Never"}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-all">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">
                Showing {filtered.length === 0 ? 0 : (safeSubPage - 1) * subPageSize + 1} to {Math.min(safeSubPage * subPageSize, filtered.length)} of {filtered.length} entries
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-xl font-bold text-xs border-slate-200 hover:bg-slate-50 group disabled:opacity-50"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeSubPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-0.5 transition-transform" />
                  Previous
                </Button>
                <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-primary text-white font-black text-xs shadow-lg shadow-primary/20 scale-110">{safeSubPage}</div>
                <span className="text-[11px] text-slate-400 font-black px-1">of {totalSubPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-xl font-bold text-xs border-slate-200 hover:bg-slate-50 group disabled:opacity-50"
                  onClick={() => setCurrentPage(p => Math.min(totalSubPages, p + 1))}
                  disabled={safeSubPage >= totalSubPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Subscriptions;

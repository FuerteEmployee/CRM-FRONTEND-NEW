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
  Plus, 
  Search, 
  Download, 
  FileText, 
  Printer, 
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  FileDown,
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { salesService } from "@/api/services/sales.service";
import { formatDate } from "@/lib/dateFormat";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";

const Expenses = () => {
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can } = usePermissions();

  const { data: expenses = [], isLoading } = useQuery<any[]>({
    queryKey: ["expenses"],
    queryFn: salesService.getExpenses,
  });

  const filtered = expenses.filter((e: any) => {
    const searchStr = search.toLowerCase();
    return (
      (e.expense_name || "").toLowerCase().includes(searchStr) ||
      (e.category || "").toLowerCase().includes(searchStr) ||
      (e.reference_no || "").toLowerCase().includes(searchStr)
    );
  });

  // Calculate Statistics
  const stats = {
    total: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    billable: expenses.filter(e => e.billable).reduce((sum, e) => sum + (e.amount || 0), 0),
    nonBillable: expenses.filter(e => !e.billable).reduce((sum, e) => sum + (e.amount || 0), 0),
    notInvoiced: expenses.filter(e => e.billable && !e.invoiceid).reduce((sum, e) => sum + (e.amount || 0), 0),
    billed: expenses.filter(e => e.invoiceid).reduce((sum, e) => sum + (e.amount || 0), 0),
  };

  const statusCards = [
    { title: "Total", value: stats.total, icon: Wallet, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Billable", value: stats.billable, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Non Billable", value: stats.nonBillable, icon: XCircle, color: "text-rose-600", bg: "bg-rose-50" },
    { title: "Not Invoiced", value: stats.notInvoiced, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { title: "Billed", value: stats.billed, icon: FileDown, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Expenses</h1>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest mt-1">
              Manage and track business expenditures
            </p>
          </div>
          <div className="flex items-center gap-3">
            {can("Expenses", "Create") && (
              <Button 
                className="rounded-2xl h-12 px-6 shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs gap-3"
                onClick={() => navigate("/admin/expenses/create")}
              >
                <Plus className="h-4 w-4" />
                Record Expense
              </Button>
            )}
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statusCards.map((card, i) => (
            <Card key={i} className="border-none shadow-2xl shadow-primary/5 rounded-[2rem] bg-background/60 backdrop-blur-xl overflow-hidden group hover:scale-[1.02] transition-all duration-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${card.bg} ${card.color} transition-transform group-hover:rotate-12`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                    {card.title}
                  </p>
                  <p className="text-2xl font-black text-foreground">
                    ${card.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Card */}
        <Card className="border-none shadow-2xl shadow-primary/5 rounded-[2.5rem] bg-background/60 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-8">
            {/* Table Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                  <SelectTrigger className="h-12 w-[100px] rounded-2xl border-none bg-muted/50 font-bold text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {["10", "25", "50", "100", "All"].map((v) => (
                      <SelectItem key={v} value={v} className="font-bold py-3 rounded-xl">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-3 border-none bg-muted/50 px-6">
                      <Download className="h-4 w-4 text-primary" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 rounded-[1.5rem] border-none shadow-2xl p-2 bg-background/95 backdrop-blur-md">
                    <DropdownMenuItem className="gap-3 py-3 px-4 cursor-pointer rounded-xl hover:bg-primary/5 transition-colors group">
                      <FileText className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-black uppercase tracking-widest">PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 py-3 px-4 cursor-pointer rounded-xl hover:bg-primary/5 transition-colors group">
                      <FileText className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-black uppercase tracking-widest">CSV</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 py-3 px-4 cursor-pointer rounded-xl hover:bg-primary/5 transition-colors group">
                      <Printer className="h-4 w-4 text-slate-600 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-black uppercase tracking-widest">Print</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="relative w-full md:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search expenses..."
                  className="pl-12 h-12 rounded-2xl border-none bg-muted/50 font-bold text-xs focus-visible:ring-primary/20 transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                    <th className="px-6 pb-2">Category</th>
                    <th className="px-6 pb-2">Amount</th>
                    <th className="px-6 pb-2">Name</th>
                    <th className="px-6 pb-2">Receipt</th>
                    <th className="px-6 pb-2">Date</th>
                    <th className="px-6 pb-2">Project</th>
                    <th className="px-6 pb-2">Invoice</th>
                    <th className="px-6 pb-2">Reference #</th>
                    <th className="px-6 pb-2">Payment Mode</th>
                    <th className="px-6 pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="bg-muted/5 animate-pulse">
                        <td colSpan={10} className="p-4 rounded-3xl h-16">
                          <Skeleton className="h-full w-full rounded-2xl" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-20 bg-muted/5 rounded-[2rem]">
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-6 bg-background rounded-full shadow-inner">
                            <Receipt className="h-12 w-12 text-muted-foreground/20" />
                          </div>
                          <p className="text-sm font-black uppercase tracking-widest text-muted-foreground/40">No entries found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((e: any) => (
                      <tr key={e._id} className="group bg-muted/5 hover:bg-primary/5 transition-all duration-300 rounded-[1.5rem] relative">
                        <td className="px-6 py-5 first:rounded-l-[1.5rem] last:rounded-r-[1.5rem]">
                          <Badge variant="outline" className="rounded-lg bg-background border-none shadow-sm text-[10px] font-black uppercase tracking-widest px-3 py-1">
                            {e.category || "General"}
                          </Badge>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-sm font-black text-foreground">
                            ${(e.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-bold text-slate-600">{e.expense_name || "-"}</span>
                        </td>
                        <td className="px-6 py-5">
                          {e.receipt ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-background shadow-sm hover:text-primary">
                              <Eye className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase">No Receipt</span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-bold text-slate-500">{e.date ? formatDate(e.date) : "-"}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-bold text-slate-600 italic">{e.project?.name || e.project || "-"}</span>
                        </td>
                        <td className="px-6 py-5">
                          {e.invoiceid ? (
                            <Badge className="rounded-lg bg-indigo-50 text-indigo-600 border-none font-black text-[10px] tracking-tighter">
                              {e.invoiceid?.number || "INV-MATCHED"}
                            </Badge>
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground/30 italic">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-mono font-bold text-slate-400">{e.reference_no || "-"}</span>
                        </td>
                        <td className="px-6 py-5">
                          <Badge variant="secondary" className="rounded-lg bg-slate-100 text-slate-600 border-none text-[10px] font-bold uppercase tracking-widest">
                            {e.paymentmode || "Cash"}
                          </Badge>
                        </td>
                        <td className="px-6 py-5 text-right first:rounded-l-[1.5rem] last:rounded-r-[1.5rem]">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-background shadow-none transition-all">
                                <MoreHorizontal className="h-5 w-5 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl border-none shadow-2xl p-1 bg-background/95 backdrop-blur-md">
                              <DropdownMenuItem className="gap-3 py-2.5 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                <Eye className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                <span className="text-xs font-bold">View Details</span>
                              </DropdownMenuItem>
                              {can("Expenses", "Edit") && (
                                <DropdownMenuItem className="gap-3 py-2.5 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                  <Edit className="h-4 w-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                                  <span className="text-xs font-bold">Edit Expense</span>
                                </DropdownMenuItem>
                              )}
                              {can("Expenses", "Delete") && (
                                <DropdownMenuItem className="gap-3 py-2.5 px-3 cursor-pointer rounded-lg hover:bg-rose-50 transition-colors group">
                                  <Trash2 className="h-4 w-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
                                  <span className="text-xs font-bold text-rose-500">Delete</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Info */}
            <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-6 rounded-[2rem] border border-border/50">
              <p className="text-xs font-bold text-muted-foreground/60 tracking-widest uppercase">
                Showing {filtered.length > 0 ? 1 : 0} to {filtered.length} of {filtered.length} entries
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-10 rounded-xl font-black text-[10px] uppercase tracking-widest px-6 bg-background border-none shadow-sm disabled:opacity-30" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="h-10 w-10 rounded-xl font-black text-xs bg-primary text-white border-none shadow-lg shadow-primary/20">
                  1
                </Button>
                <Button variant="outline" size="sm" className="h-10 rounded-xl font-black text-[10px] uppercase tracking-widest px-6 bg-background border-none shadow-sm disabled:opacity-30" disabled>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Expenses;

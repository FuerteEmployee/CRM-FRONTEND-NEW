import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Download, FileText, Target, Printer } from "lucide-react";
import { useState, useMemo } from "react";
import { formatDate } from "@/lib/dateFormat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { estimateService } from "@/api/services/estimate.service";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { ExportButton } from "@/components/ui/export-button";

const Estimates = () => {
  const [estimateSearch, setEstimateSearch] = useState("");
  const [estimateItemsPerPage, setEstimateItemsPerPage] = useState("10");
  const navigate = useNavigate();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: allData = [], isLoading: isLoadingEstimates } = useQuery({
    queryKey: ["estimates"],
    queryFn: async () => {
      const response = await estimateService.getEstimates();
      return Array.isArray(response) ? response : response?.data || [];
    },
  });

  const estimates = useMemo(
    () => allData.filter((item: any) => !item.form),
    [allData]
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => estimateService.deleteEstimate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast({ title: "Deleted", description: "Estimate deleted successfully.", className: "bg-green-600 text-white" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete estimate.", variant: "destructive" });
    }
  });

  const filtered = estimates.filter((e: any) => 
    (e.subject || e.number || "").toLowerCase().includes(estimateSearch.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8 animate-in fade-in duration-500">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Estimates</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Financial proposal documents</p>
            </div>
          </div>
          {can("Estimates", "Create") && (
            <Button
              className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
              onClick={() => navigate(`/admin/estimates/create`)}
            >
              <Plus className="h-4 w-4" />
              New Estimate
            </Button>
          )}
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: "Draft", color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200" },
            { label: "Sent", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
            { label: "Expired", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
            { label: "Declined", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
            { label: "Accepted", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
          ].map((status) => {
            const count = estimates.filter((e: any) => e.status?.toLowerCase() === status.label.toLowerCase()).length;
            const total = estimates
              .filter((e: any) => e.status?.toLowerCase() === status.label.toLowerCase())
              .reduce((sum: number, e: any) => sum + (e.total || 0), 0);

            return (
              <Card key={status.label} className={cn("border shadow-sm rounded-2xl overflow-hidden", status.bg, status.border)}>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-1">
                    <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", status.color)}>
                      {status.label}
                    </span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-xl font-black text-slate-900">{count}</span>
                      <span className="text-[11px] font-bold text-slate-500">
                        ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
            <Select value={estimateItemsPerPage} onValueChange={setEstimateItemsPerPage}>
              <SelectTrigger className="h-9 w-[80px] bg-background border-none shadow-sm rounded-lg text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["10", "25", "50", "100", "All"].map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportButton 
              data={filtered} 
              filename="estimates" 
              columns={[
                { header: "Estimate #", key: (e) => e.number || e._id },
                { header: "Subject", key: "subject" },
                { header: "To", key: (e) => e.contact_name || e.client_id?.company || e.rel_id || "N/A" },
                { header: "Total", key: "total" },
                { header: "Date", key: "date" },
                { header: "Status", key: "status" }
              ]} 
            />
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search estimates..."
              className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
              value={estimateSearch}
              onChange={(e) => setEstimateSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Estimates Table */}
        <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
              <tr>
                {["Estimate #", "Subject", "To", "Total", "Date", "Open Till", "Tags", "Date Created", "Status", "Actions"].map(h => (
                  <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoadingEstimates ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={10} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-muted-foreground italic">
                    No estimates found.
                  </td>
                </tr>
              ) : (
                filtered.map((est: any) => (
                  <tr key={est._id || est.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-primary">{est.number || (est._id || est.id)?.slice(-6).toUpperCase()}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{est.subject}</td>
                    <td className="px-6 py-4 text-muted-foreground">{est.contact_name || est.client_id?.company || est.rel_id || "N/A"}</td>
                    <td className="px-6 py-4 font-black text-foreground">${(est.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-muted-foreground">{est.date ? formatDate(est.date) : "-"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{est.open_till ? formatDate(est.open_till) : "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {est.tags?.map((tag: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[9px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-none">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{est.createdAt ? formatDate(est.createdAt) : "-"}</td>
                    <td className="px-6 py-4">
                      <Badge className={cn(
                        "text-[10px] font-black uppercase tracking-widest border-none px-3 py-1",
                        est.status?.toLowerCase() === "draft" ? "bg-slate-100 text-slate-600" :
                        est.status?.toLowerCase() === "sent" ? "bg-blue-50 text-blue-600" :
                        est.status?.toLowerCase() === "accepted" ? "bg-emerald-50 text-emerald-600" :
                        est.status?.toLowerCase() === "declined" ? "bg-red-50 text-red-600" :
                        est.status?.toLowerCase() === "expired" ? "bg-amber-50 text-amber-600" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {est.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <TableActions
                        onView={() => navigate(`/admin/estimates/edit/${est._id || est.id}`)}
                        onEdit={can("Estimates", "Edit") ? () => navigate(`/admin/estimates/edit/${est._id || est.id}`) : undefined}
                        onDelete={can("Estimates", "Delete") ? () => deleteMutation.mutate(est._id || est.id) : undefined}
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
            <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Previous</Button>
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">1</div>
            <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Next</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Estimates;

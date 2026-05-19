import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FilePlus, Search, Download, FileText } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/dateFormat";
import { useQuery } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";

const Proposals = () => {
  const [proposalSearch, setProposalSearch] = useState("");
  const [proposalItemsPerPage, setProposalItemsPerPage] = useState("10");
  const navigate = useNavigate();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: proposals = [], isLoading: isLoadingProposals } = useQuery({
    queryKey: ["proposals"],
    queryFn: () => salesService.getProposals().then((res: any) => res.data || res),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesService.deleteProposal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({ title: "Deleted", description: "Proposal deleted successfully.", className: "bg-green-600 text-white" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete proposal.", variant: "destructive" });
    }
  });

  const filtered = (Array.isArray(proposals) ? proposals : []).filter((p: any) => 
    (p.subject || p.title || "").toLowerCase().includes(proposalSearch.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8 animate-in fade-in duration-500">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Proposals
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {can("Proposals", "Create") && (
              <Button
                className="rounded-xl font-bold gap-2 shadow-lg shadow-primary/20"
                onClick={() => navigate(`/admin/proposals/create`)}
              >
                <FilePlus className="h-4 w-4" />
                New Proposal
              </Button>
            )}
          </div>
        </div>

        {/* Table Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
          <div className="flex items-center gap-3">
            <Select value={proposalItemsPerPage} onValueChange={setProposalItemsPerPage}>
              <SelectTrigger className="h-9 w-[80px] bg-background border-none shadow-sm rounded-lg text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["10", "25", "50", "100", "All"].map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 rounded-lg font-bold uppercase tracking-wider text-[10px] gap-2 border-none bg-background shadow-sm">
                  <Download className="h-3.5 w-3.5 text-primary" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40 rounded-xl border-border/50 shadow-xl p-1">
                {["PDF", "CSV", "Excel", "Print"].map(type => (
                  <DropdownMenuItem key={type} className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                    <FileText className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold">{type}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search proposals..."
              className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
              value={proposalSearch}
              onChange={(e) => setProposalSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Proposals Table */}
        <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
              <tr>
                {["Proposal #", "Subject", "To", "Total", "Date", "Open Till", "Tags", "Date Created", "Status", "Actions"].map(h => (
                  <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoadingProposals ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={10} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-muted-foreground italic">
                    No proposals found.
                  </td>
                </tr>
              ) : (
                filtered.map((prop: any) => (
                  <tr key={prop._id || prop.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-primary">{(prop._id || prop.id)?.slice(-6).toUpperCase()}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{prop.subject || prop.title}</td>
                    <td className="px-6 py-4 text-muted-foreground">{prop.rel_id || prop.customer || "N/A"}</td>
                    <td className="px-6 py-4 font-black text-foreground">${(prop.total || prop.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-muted-foreground">{prop.date ? formatDate(prop.date) : "-"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{prop.open_till ? formatDate(prop.open_till) : "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {prop.tags?.map((tag: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[9px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-none">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{prop.createdAt ? formatDate(prop.createdAt) : "-"}</td>
                    <td className="px-6 py-4">
                      <Badge className={cn(
                        "text-[10px] font-black uppercase tracking-widest border-none px-3 py-1",
                        String(prop.status) === "1" ? "bg-muted text-muted-foreground" :
                          String(prop.status) === "2" ? "bg-blue-500/10 text-blue-500" :
                            String(prop.status) === "3" ? "bg-primary/10 text-primary" :
                              String(prop.status) === "4" ? "bg-orange-500/10 text-orange-500" :
                                String(prop.status) === "5" ? "bg-destructive/10 text-destructive" :
                                  String(prop.status) === "6" ? "bg-green-500/10 text-green-500" :
                                    "bg-muted text-muted-foreground"
                      )}>
                        {String(prop.status) === "1" ? "Draft" :
                          String(prop.status) === "2" ? "Sent" :
                            String(prop.status) === "3" ? "Open" :
                              String(prop.status) === "4" ? "Revised" :
                                String(prop.status) === "5" ? "Declined" :
                                  String(prop.status) === "6" ? "Accepted" : "Unknown"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <TableActions
                        onView={() => navigate(`/admin/proposals/edit/${prop._id || prop.id}`)}
                        onEdit={can("Proposals", "Edit") ? () => navigate(`/admin/proposals/edit/${prop._id || prop.id}`) : undefined}
                        onDelete={can("Proposals", "Delete") ? () => deleteMutation.mutate(prop._id || prop.id) : undefined}
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

export default Proposals;

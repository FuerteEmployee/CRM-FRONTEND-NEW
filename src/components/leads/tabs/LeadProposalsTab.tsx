import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText } from "lucide-react";
import { formatDate } from "@/lib/dateFormat";
import { useCurrency } from "@/context/CurrencyContext";
import { salesService } from "@/api/services/sales.service";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  "1": { label: "Draft", className: "bg-muted text-muted-foreground" },
  "2": { label: "Sent", className: "bg-blue-500/10 text-blue-500" },
  "3": { label: "Open", className: "bg-primary/10 text-primary" },
  "4": { label: "Revised", className: "bg-orange-500/10 text-orange-500" },
  "5": { label: "Declined", className: "bg-destructive/10 text-destructive" },
  "6": { label: "Accepted", className: "bg-green-500/10 text-green-500" },
};
const getStatus = (status: any) => STATUS_MAP[String(status)] ?? { label: "Unknown", className: "bg-muted text-muted-foreground" };

export function LeadProposalsTab({ lead }: { lead: any }) {
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();

  const { data: proposals = [], isLoading } = useQuery<any[]>({
    queryKey: ["lead-proposals", lead._id],
    queryFn: () => salesService.getProposals({ rel_id: lead._id, rel_type: "lead" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">{proposals.length} Proposal{proposals.length === 1 ? "" : "s"}</p>
        <Button
          size="sm"
          onClick={() => navigate(`/admin/proposals/create/${lead._id}?relType=lead`)}
          className="h-9 rounded-xl px-4 font-black uppercase text-[10px] tracking-widest gap-2"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Proposal
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : proposals.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <FileText className="h-8 w-8 mx-auto text-slate-300" />
          <p className="text-sm text-slate-400 font-medium">No proposals yet for this lead</p>
        </div>
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((p: any) => {
                const status = getStatus(p.status);
                return (
                  <TableRow
                    key={p._id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/proposals/edit/${p._id}`)}
                  >
                    <TableCell><span className="font-semibold">{p.subject}</span></TableCell>
                    <TableCell>
                      <Badge className={`rounded-lg font-bold ${status.className}`}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>{p.date ? formatDate(p.date) : "—"}</TableCell>
                    <TableCell>{p.open_till ? formatDate(p.open_till) : "—"}</TableCell>
                    <TableCell className="text-right"><span className="font-bold">{formatAmount(p.total || 0)}</span></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}

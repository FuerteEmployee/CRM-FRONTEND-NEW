import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText } from "lucide-react";
import { formatDate } from "@/lib/dateFormat";
import { useCurrency } from "@/context/CurrencyContext";
import { salesService } from "@/api/services/sales.service";

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
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Subject</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Valid Until</th>
                <th className="text-right px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {proposals.map((p: any) => {
                const status = getStatus(p.status);
                return (
                  <tr
                    key={p._id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/proposals/edit/${p._id}`)}
                  >
                    <td className="px-4 py-3 font-bold text-slate-800">{p.subject}</td>
                    <td className="px-4 py-3">
                      <Badge className={`rounded-lg font-bold ${status.className}`}>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.date ? formatDate(p.date) : "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{p.open_till ? formatDate(p.open_till) : "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{formatAmount(p.total || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

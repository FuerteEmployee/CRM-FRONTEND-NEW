import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, TablePagination } from "@/components/ui/table";
import { SkeletonTableRows } from "@/components/ui/skeleton-table-rows";
import { Ban, Eye, Pencil, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { purchaseOrderService } from "@/api/services/purchaseOrder.service";
import { PO_MODULE } from "@/lib/purchaseOrders";
import { formatInr } from "./poCalc";
import { ActionIcon } from "./ActionIcon";
import { proformaActions } from "./poActions";

// R5: Proforma invoices of the PO module (each one made from an approved PO).
const PAGE_SIZE = 25;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN") : "-");
const STATUS_CLASS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

// onOpen(id, mode): "view" = read-only, "edit" = the draft editor.
export const ProformasTab = ({ onOpen, onOpenPo }: { onOpen: (id: string, mode?: "view" | "edit") => void; onOpenPo: (id: string) => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canEdit = can(PO_MODULE, "Edit");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data, isLoading } = useQuery<any>({
    queryKey: ["po-proformas", debounced, status, page],
    queryFn: () => purchaseOrderService.proformas({ search: debounced || undefined, status: status === "all" ? undefined : status, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const rows = (data as any)?.data || [];
  // S2: Cancel from the row (asks first).
  const cancelMutation = useMutation({
    mutationFn: (id: string) => purchaseOrderService.cancelProforma(id),
    onSuccess: (pf: any) => {
      queryClient.invalidateQueries({ queryKey: ["po-proformas"] });
      queryClient.invalidateQueries({ queryKey: ["po-proforma", String(pf?._id)] });
      toast({ title: `Proforma ${pf?.number || ""} cancelled` });
    },
    onError: (err: any) => toast({ title: "Could not cancel", description: err.message, variant: "destructive" }),
  });
  return (
    <Card className="rounded-lg shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row gap-2 p-4 border-b">
          <div className="relative flex-1 min-w-0 sm:max-w-[360px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-9 h-9" placeholder="Search proforma no., PO no., customer..." aria-label="Search proforma invoices" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[160px] h-9" aria-label="Proforma status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proforma No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>PO No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Customer PO</TableHead>
                <TableHead className="text-right">Grand total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTableRows rows={5} colSpan={9} />
              ) : rows.length === 0 ? (
                <TableEmpty colSpan={9}>
                  {/* S5: a search / filter with no result says so (not "no proformas yet"). */}
                  {debounced || status !== "all" ? "No proforma invoices match your search." : 'No proforma invoices yet. Open an approved PO and press "Create Proforma Invoice".'}
                </TableEmpty>
              ) : rows.map((p: any) => (
                <TableRow key={p._id} className="cursor-pointer" onClick={() => onOpen(p._id, "view")}>
                  <TableCell className="font-semibold">{p.number}</TableCell>
                  <TableCell>{fmtDate(p.date)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {p.po?._id ? <button type="button" className="text-primary underline text-sm" onClick={() => onOpenPo(String(p.po._id))}>{p.po_number}</button> : p.po_number}
                  </TableCell>
                  <TableCell>{p.bill_to?.name || "-"}</TableCell>
                  <TableCell className="text-xs break-all">{p.customer_po_number || "-"}</TableCell>
                  <TableCell className="text-right">{formatInr(p.totals?.grand_total)}</TableCell>
                  <TableCell className="text-right">{formatInr(p.totals?.balance)}</TableCell>
                  <TableCell><Badge variant="outline" className={STATUS_CLASS[p.status]}>{p.status}</Badge></TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const acts = proformaActions(p, { canEdit });
                      return (
                        <div className="flex justify-end gap-0.5" data-testid={`pf-actions-${p.number}`}>
                          <ActionIcon icon={Eye} tooltip="View" label={`View proforma ${p.number}`} onClick={() => onOpen(p._id, "view")} />
                          <ActionIcon icon={Pencil} tooltip="Edit" label={`Edit proforma ${p.number}`} reason={acts.edit.reason} onClick={() => onOpen(p._id, "edit")} />
                          <ActionIcon icon={Ban} tooltip="Cancel proforma" tone="danger" label={`Cancel proforma ${p.number}`} reason={acts.cancel.reason}
                            onClick={() => { if (window.confirm(`Cancel proforma ${p.number}? It stays on record as cancelled.`)) cancelMutation.mutate(p._id); }} />
                        </div>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination page={page} pageSize={PAGE_SIZE} total={(data as any)?.total || 0} onPageChange={setPage} />
      </CardContent>
    </Card>
  );
};

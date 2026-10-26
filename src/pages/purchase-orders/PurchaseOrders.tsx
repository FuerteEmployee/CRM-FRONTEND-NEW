import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, TablePagination } from "@/components/ui/table";
import { SkeletonTableRows } from "@/components/ui/skeleton-table-rows";
import { ExportButton } from "@/components/ui/export-button";
import { ClipboardList, Eye, Plus, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { purchaseOrderService } from "@/api/services/purchaseOrder.service";
import { hasPurchaseOrders, PO_MODULE } from "@/lib/purchaseOrders";
import { formatInr, marginClass, PO_STATUS_CLASS, PO_STATUS_LABEL, type PoType } from "./poCalc";
import { PoEditorDialog } from "./PoEditorDialog";
import { PriceListTab } from "./PriceListTab";
import { PoSettingsTab } from "./PoSettingsTab";

const PAGE_SIZE = 25;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN") : "-");

const PurchaseOrders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, can, canView } = usePermissions();
  const [params, setParams] = useSearchParams();
  const enabled = hasPurchaseOrders(user);

  const [tab, setTab] = useState(params.get("tab") || "orders");
  const [type, setType] = useState<string>("all");
  const [division, setDivision] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ open: boolean; id?: string | null; type?: PoType }>({ open: false });

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Notifications link straight to a PO with ?po=<id>.
  useEffect(() => {
    const id = params.get("po");
    if (id) {
      setEditor({ open: true, id });
      params.delete("po");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const { data: settings } = useQuery<any>({
    queryKey: ["po-settings"],
    queryFn: purchaseOrderService.getSettings,
    enabled,
  });

  const filters = {
    type: type === "all" ? undefined : type,
    division: division === "all" ? undefined : division,
    status: status === "all" ? undefined : status,
    from: from || undefined,
    to: to || undefined,
    search: debounced || undefined,
  };

  const { data: list, isLoading } = useQuery({
    queryKey: ["purchase-orders", filters, page],
    queryFn: () => purchaseOrderService.list({ ...filters, page, limit: PAGE_SIZE }),
    enabled,
    placeholderData: keepPreviousData,
  });

  const { data: stats } = useQuery({
    queryKey: ["purchase-order-stats", filters.type, filters.division],
    queryFn: () => purchaseOrderService.stats({ type: filters.type, division: filters.division }),
    enabled,
  });

  const canApprove = can(PO_MODULE, "Approve");
  const { data: pending = [] } = useQuery({
    queryKey: ["purchase-order-approvals"],
    queryFn: purchaseOrderService.pendingApprovals,
    enabled: enabled && canApprove,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => purchaseOrderService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order-stats"] });
      toast({ title: "Deleted" });
    },
    onError: (err: any) => toast({ title: "Could not delete", description: err.message, variant: "destructive" }),
  });

  if (!enabled || !canView(PO_MODULE)) return <Navigate to="/admin/dashboard" replace />;

  const rows = (list as any)?.data || [];
  const byStatus = (stats as any)?.byStatus || {};
  const divisionName = (key: string) => settings?.divisions?.find((d: any) => d.key === key)?.name || key;

  const loadAllForExport = async () => {
    const res: any = await purchaseOrderService.list({ ...filters, page: 1, limit: 500 });
    return (res?.data || []).map((p: any) => ({
      ...p,
      type_label: p.type === "sales" ? "Sales" : "Purchase",
      division_name: divisionName(p.division),
      customer_name: p.customer_snapshot?.name || (p.type === "purchase" ? "Stock" : ""),
      date: fmtDate(p.po_date),
      grand_total: p.totals?.grand_total,
      margin: p.totals?.margin_pct,
      status_label: PO_STATUS_LABEL[p.status],
    }));
  };

  const summaryCards = [
    { key: "pending_approval", label: "Waiting for approval" },
    { key: "approved", label: "Approved" },
    { key: "sent", label: "Sent" },
    { key: "received", label: "Received" },
  ];

  const renderTable = (data: any[], loading: boolean, emptyText: string) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PO No.</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Division</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Margin</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created by</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <SkeletonTableRows rows={6} colSpan={10} />
          ) : data.length === 0 ? (
            <TableEmpty colSpan={10}>{emptyText}</TableEmpty>
          ) : (
            data.map((p: any) => (
              <TableRow key={p._id} className="cursor-pointer" onClick={() => setEditor({ open: true, id: p._id })}>
                <TableCell className="font-semibold">{p.po_number}</TableCell>
                <TableCell>{p.type === "sales" ? "Sales" : "Purchase"}</TableCell>
                <TableCell>{divisionName(p.division)}</TableCell>
                <TableCell>{fmtDate(p.po_date)}</TableCell>
                <TableCell>{p.customer_snapshot?.name || (p.type === "purchase" ? <span className="text-muted-foreground">Stock</span> : "-")}</TableCell>
                <TableCell className="text-right font-medium">{formatInr(p.totals?.grand_total)}</TableCell>
                <TableCell className={`text-right font-semibold ${marginClass(p.totals?.margin_pct, settings?.rules?.[p.type]?.min_margin_pct)}`}>
                  {p.totals?.margin_pct === null || p.totals?.margin_pct === undefined ? "—" : `${p.totals.margin_pct}%`}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={PO_STATUS_CLASS[p.status]}>{PO_STATUS_LABEL[p.status]}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {[p.created_by?.firstname, p.created_by?.lastname].filter(Boolean).join(" ") ||
                    [p.approval?.requested_by?.firstname, p.approval?.requested_by?.lastname].filter(Boolean).join(" ") || "-"}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditor({ open: true, id: p._id })}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {can(PO_MODULE, "Delete") && ["draft", "cancelled"].includes(p.status) && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-500"
                        onClick={() => { if (window.confirm(`Delete ${p.po_number}?`)) deleteMutation.mutate(p._id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Purchase Orders</h1>
          </div>
          {can(PO_MODULE, "Create") && (
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => setEditor({ open: true, id: null, type: "sales" })}>
                <Plus className="h-4 w-4" /> New Sales PO
              </Button>
              <Button className="gap-2" onClick={() => setEditor({ open: true, id: null, type: "purchase" })}>
                <Plus className="h-4 w-4" /> New Purchase PO
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((c) => (
            <Card key={c.key} className="cursor-pointer" onClick={() => { setTab("orders"); setStatus(c.key); setPage(1); }}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className="text-2xl font-bold">{byStatus[c.key]?.count || 0}</div>
                <div className="text-xs text-muted-foreground">{formatInr(byStatus[c.key]?.value || 0)}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            {canApprove && (
              <TabsTrigger value="approvals">
                Approvals {(pending as any[]).length > 0 && <Badge className="ml-2 h-5 px-1.5">{(pending as any[]).length}</Badge>}
              </TabsTrigger>
            )}
            <TabsTrigger value="prices">Price List</TabsTrigger>
            <TabsTrigger value="settings">PO Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card className="rounded-lg shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-wrap items-center gap-2 p-4 border-b">
                  <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
                    <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="purchase">Purchase PO</SelectItem>
                      <SelectItem value="sales">Sales PO</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={division} onValueChange={(v) => { setDivision(v); setPage(1); }}>
                    <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All divisions</SelectItem>
                      {(settings?.divisions || []).map((d: any) => <SelectItem key={d.key} value={d.key}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                    <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {Object.entries(PO_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="date" className="h-9 w-[150px]" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} title="From" />
                  <Input type="date" className="h-9 w-[150px]" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} title="To" />
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input className="pl-9 h-9" placeholder="Search PO no., customer, item..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <ExportButton
                    data={loadAllForExport}
                    filename="purchase_orders"
                    columns={[
                      { key: "po_number", header: "PO No." },
                      { key: "type_label", header: "Type" },
                      { key: "division_name", header: "Division" },
                      { key: "date", header: "Date" },
                      { key: "customer_name", header: "Customer" },
                      { key: "grand_total", header: "Total", type: "number" },
                      { key: "margin", header: "Margin %", type: "number" },
                      { key: "status_label", header: "Status" },
                    ]}
                  />
                </div>
                {renderTable(rows, isLoading, "No purchase orders yet.")}
                <TablePagination page={page} pageSize={PAGE_SIZE} total={(list as any)?.total || 0} onPageChange={setPage} />
              </CardContent>
            </Card>
          </TabsContent>

          {canApprove && (
            <TabsContent value="approvals">
              <Card className="rounded-lg shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {renderTable(pending as any[], false, "Nothing is waiting for your approval.")}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="prices">
            <PriceListTab />
          </TabsContent>

          <TabsContent value="settings">
            <PoSettingsTab settings={settings} />
          </TabsContent>
        </Tabs>
      </div>

      {settings && (
        <PoEditorDialog
          open={editor.open}
          onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
          poId={editor.id}
          initialType={editor.type}
          settings={settings}
        />
      )}
    </DashboardLayout>
  );
};

export default PurchaseOrders;

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
import { CheckCircle2, ClipboardList, Eye, Pencil, Plus, Search, Trash2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { purchaseOrderService } from "@/api/services/purchaseOrder.service";
import { hasPurchaseOrders, PO_MODULE } from "@/lib/purchaseOrders";
import { formatInr, marginClass, PO_STATUS_CLASS, PO_STATUS_LABEL } from "./poCalc";
import { PoEditorDialog } from "./PoEditorDialog";
import { PoItemsTab } from "./PoItemsTab";
import { PoSettingsTab } from "./PoSettingsTab";
import { ProformasTab } from "./ProformasTab";
import { ProformaEditorDialog } from "./ProformaEditorDialog";
import { ActionIcon } from "./ActionIcon";
import { deleteConfirmText, rowActions } from "./poActions";

const PAGE_SIZE = 25;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN") : "-");

const PurchaseOrders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, can, canView } = usePermissions();
  const [params, setParams] = useSearchParams();
  const enabled = hasPurchaseOrders(user);

  const [tab, setTab] = useState(params.get("tab") || "orders");
  // R1: only Purchase POs are made now — no type filter (old Sales POs still list, marked "old").
  const [division, setDivision] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  // mode "view" = read-only (eye icon); "edit" = the normal editor (pencil / new).
  const [editor, setEditor] = useState<{ open: boolean; id?: string | null; mode?: "view" | "edit" }>({ open: false });
  const [proforma, setProforma] = useState<{ open: boolean; id?: string | null; mode?: "view" | "edit" }>({ open: false });

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
    queryKey: ["purchase-order-stats", filters.division],
    queryFn: () => purchaseOrderService.stats({ division: filters.division }),
    enabled,
  });

  const canApprove = can(PO_MODULE, "Approve");
  const { data: pending = [] } = useQuery({
    queryKey: ["purchase-order-approvals"],
    queryFn: purchaseOrderService.pendingApprovals,
    enabled: enabled && canApprove,
  });

  const refreshLists = () => {
    queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    queryClient.invalidateQueries({ queryKey: ["purchase-order-stats"] });
    queryClient.invalidateQueries({ queryKey: ["purchase-order-approvals"] });
  };
  const deleteMutation = useMutation({
    mutationFn: (id: string) => purchaseOrderService.delete(id),
    onSuccess: () => {
      refreshLists();
      toast({ title: "Deleted" });
    },
    onError: (err: any) => toast({ title: "Could not delete", description: err.message, variant: "destructive" }),
  });
  // S2: the approver's quick Yes / No on the Approvals tab (No asks for the reason).
  const quickDecision = useMutation({
    mutationFn: ({ id, yes, reason }: { id: string; yes: boolean; reason?: string }) =>
      yes ? purchaseOrderService.approve(id, "") : purchaseOrderService.reject(id, reason || ""),
    onSuccess: (saved: any) => {
      refreshLists();
      toast({ title: saved.po_number, description: saved.status === "approved" ? "Approved — the PDF and WhatsApp to Brady are now available." : "Sent back to draft." });
    },
    onError: (err: any) => toast({ title: "Could not save the decision", description: err.message, variant: "destructive" }),
  });
  const sayNo = (p: any) => {
    const reason = window.prompt(`Reason for No on ${p.po_number} (the maker sees this)`);
    if (reason === null) return;
    if (!reason.trim()) {
      toast({ title: "Please give a reason for saying No", variant: "destructive" });
      return;
    }
    quickDecision.mutate({ id: p._id, yes: false, reason: reason.trim() });
  };

  if (!enabled || !canView(PO_MODULE)) return <Navigate to="/admin/dashboard" replace />;

  const rows = (list as any)?.data || [];
  const filtersOn = division !== "all" || status !== "all" || !!from || !!to || !!debounced;
  const datesBackwards = !!from && !!to && from > to;
  const clearFilters = () => { setDivision("all"); setStatus("all"); setFrom(""); setTo(""); setSearch(""); setDebounced(""); setPage(1); };
  const byStatus = (stats as any)?.byStatus || {};
  const divisionName = (key: string) => settings?.divisions?.find((d: any) => d.key === key)?.name || key;

  // R6: the export never carries the margin or selling prices (it may be sent out).
  const loadAllForExport = async () => {
    const res: any = await purchaseOrderService.list({ ...filters, page: 1, limit: 500 });
    return (res?.data || []).map((p: any) => ({
      po_number: p.po_number,
      division_name: divisionName(p.division),
      customer_name: p.customer_snapshot?.name || (p.type === "purchase" ? "Stock" : ""),
      customer_po: p.customer_po_number || "",
      date: fmtDate(p.po_date),
      grand_total: p.totals?.grand_total,
      status_label: PO_STATUS_LABEL[p.status],
    }));
  };

  const summaryCards = [
    { key: "pending_approval", label: "Waiting for approval" },
    { key: "approved", label: "Approved" },
    { key: "sent", label: "Sent" },
    { key: "received", label: "Received" },
  ];

  const canEditPo = can(PO_MODULE, "Edit");
  const canDeletePo = can(PO_MODULE, "Delete");
  const renderTable = (data: any[], loading: boolean, emptyText: string, approvals = false) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PO No.</TableHead>
            <TableHead>Division</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Margin %</TableHead>
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
              // Round 30: every row the same height — one line per cell (long
              // names / customer PO nos. are cut with "…", full text on hover).
              <TableRow key={p._id} className="cursor-pointer h-[60px]" onClick={() => setEditor({ open: true, id: p._id, mode: "view" })}>
                <TableCell className="font-semibold whitespace-nowrap">
                  {p.po_number}
                  {p.type === "sales" && <Badge variant="outline" className="ml-2 text-[10px]">old Sales PO</Badge>}
                </TableCell>
                <TableCell className="whitespace-nowrap">{divisionName(p.division)}</TableCell>
                <TableCell className="whitespace-nowrap">{fmtDate(p.po_date)}</TableCell>
                <TableCell className="max-w-[240px]">
                  <div className="truncate" title={p.customer_snapshot?.name || undefined}>
                    {p.customer_snapshot?.name || (p.type === "purchase" ? <span className="text-muted-foreground">Stock</span> : "-")}
                  </div>
                  {p.customer_po_number && (
                    <div className="text-[11px] leading-4 text-muted-foreground truncate" title={"Cust. PO " + p.customer_po_number} data-testid="cust-po-line">
                      Cust. PO {p.customer_po_number}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">{formatInr(p.totals?.grand_total)}</TableCell>
                <TableCell className={`text-right font-semibold ${marginClass(p.totals?.margin_pct, settings?.rules?.purchase?.min_margin_pct)}`}>
                  {p.totals?.margin_pct === null || p.totals?.margin_pct === undefined ? "—" : `${p.totals.margin_pct}%`}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={PO_STATUS_CLASS[p.status]}>{PO_STATUS_LABEL[p.status]}</Badge>
                </TableCell>
                <TableCell className="text-sm max-w-[160px]">
                  {(() => {
                    const by = [p.created_by?.firstname, p.created_by?.lastname].filter(Boolean).join(" ") ||
                      [p.approval?.requested_by?.firstname, p.approval?.requested_by?.lastname].filter(Boolean).join(" ") || "-";
                    return <div className="truncate" title={by}>{by}</div>;
                  })()}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    // S2: View / Edit / Delete on every row; a disabled icon says why.
                    const acts = rowActions(p, { canEdit: canEditPo, canDelete: canDeletePo, hasProforma: !!p.has_proforma });
                    return (
                      <div className="flex justify-end items-center gap-0.5 whitespace-nowrap" data-testid={`po-actions-${p.po_number}`}>
                        {approvals && (
                          <>
                            <Button type="button" size="sm" className="h-7 px-2 gap-1 bg-emerald-600 hover:bg-emerald-700" aria-label={`Approve ${p.po_number}`}
                              disabled={quickDecision.isPending} onClick={() => quickDecision.mutate({ id: p._id, yes: true })}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                            </Button>
                            <Button type="button" size="sm" variant="outline" className="h-7 px-2 gap-1 text-red-600" aria-label={`Say No to ${p.po_number}`}
                              disabled={quickDecision.isPending} onClick={() => sayNo(p)}>
                              <XCircle className="h-3.5 w-3.5" /> No
                            </Button>
                          </>
                        )}
                        <ActionIcon icon={Eye} tooltip="View" label={`View PO ${p.po_number}`} onClick={() => setEditor({ open: true, id: p._id, mode: "view" })} />
                        <ActionIcon icon={Pencil} tooltip="Edit" label={`Edit PO ${p.po_number}`} reason={acts.edit.reason}
                          onClick={() => setEditor({ open: true, id: p._id, mode: "edit" })} />
                        <ActionIcon icon={Trash2} tooltip="Delete" tone="danger" label={`Delete PO ${p.po_number}`} reason={acts.delete.reason}
                          onClick={() => { if (window.confirm(deleteConfirmText(p.po_number))) deleteMutation.mutate(p._id); }} />
                      </div>
                    );
                  })()}
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
              <Button className="gap-2" onClick={() => setEditor({ open: true, id: null, mode: "edit" })}>
                <Plus className="h-4 w-4" /> New Purchase PO
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((c) => (
            <Card key={c.key} className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/40" title={`Show ${c.label.toLowerCase()} POs`} onClick={() => { setTab("orders"); setStatus(c.key); setPage(1); }}>
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
            <TabsTrigger value="proformas">Proforma Invoices</TabsTrigger>
            <TabsTrigger value="prices">PO Items</TabsTrigger>
            <TabsTrigger value="settings">PO Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card className="rounded-lg shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-wrap items-center gap-2 p-4 border-b">
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
                  <Input type="date" className="h-9 w-[150px]" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1); }} title="From" aria-label="From date" />
                  <Input type="date" className="h-9 w-[150px]" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} title="To" aria-label="To date" />
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input className="pl-9 h-9" placeholder="Search PO no., customer PO no., customer, item..." aria-label="Search purchase orders" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  {filtersOn && (
                    <Button variant="ghost" size="sm" className="h-9 gap-1" onClick={clearFilters}>
                      <XCircle className="h-4 w-4" /> Clear filters
                    </Button>
                  )}
                  <ExportButton
                    data={loadAllForExport}
                    filename="purchase_orders"
                    pdfTitle="Purchase Orders"
                    columns={[
                      { key: "po_number", header: "PO No." },
                      { key: "division_name", header: "Division" },
                      { key: "date", header: "Date" },
                      { key: "customer_name", header: "Customer" },
                      { key: "customer_po", header: "Customer PO No." },
                      { key: "grand_total", header: "Total", type: "number" },
                      { key: "status_label", header: "Status" },
                    ]}
                  />
                </div>
                {datesBackwards && (
                  <p className="px-4 pt-3 text-xs text-red-700" role="alert">The From date is after the To date — change one of them.</p>
                )}
                {renderTable(rows, isLoading, filtersOn ? "No purchase orders match these filters." : "No purchase orders yet. Press New Purchase PO to make one.")}
                <TablePagination page={page} pageSize={PAGE_SIZE} total={(list as any)?.total || 0} onPageChange={setPage} />
              </CardContent>
            </Card>
          </TabsContent>

          {canApprove && (
            <TabsContent value="approvals">
              <Card className="rounded-lg shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {renderTable(pending as any[], false, "Nothing is waiting for your approval.", true)}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="proformas">
            <ProformasTab onOpen={(id, mode) => setProforma({ open: true, id, mode })} onOpenPo={(id) => setEditor({ open: true, id, mode: "view" })} />
          </TabsContent>

          <TabsContent value="prices">
            <PoItemsTab />
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
          readOnly={editor.mode === "view"}
          settings={settings}
          onOpenPo={(id) => setEditor({ open: true, id, mode: "view" })}
          onOpenProforma={(id) => { setEditor((e) => ({ ...e, open: false })); setProforma({ open: true, id }); }}
        />
      )}
      <ProformaEditorDialog
        open={proforma.open}
        onOpenChange={(open) => setProforma((p) => ({ ...p, open }))}
        proformaId={proforma.id}
        readOnly={proforma.mode === "view"}
        onOpenPo={(id) => { setProforma((p) => ({ ...p, open: false })); setEditor({ open: true, id, mode: "view" }); }}
      />
    </DashboardLayout>
  );
};

export default PurchaseOrders;

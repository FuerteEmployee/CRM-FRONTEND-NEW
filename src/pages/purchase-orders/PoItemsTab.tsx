import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, TablePagination } from "@/components/ui/table";
import { SkeletonTableRows } from "@/components/ui/skeleton-table-rows";
import { ExportButton } from "@/components/ui/export-button";
import { Eye, Info, Layers, Lock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { purchaseOrderService } from "@/api/services/purchaseOrder.service";
import { PO_MODULE } from "@/lib/purchaseOrders";
import { formatInr, PRICE_FIELD_LABEL } from "./poCalc";
import { PriceListImportDialog } from "./PriceListImportDialog";
import { AddCatalogDialog } from "./AddCatalogDialog";
import { priceSheetNote } from "./catalogAdd";
import { ActionIcon } from "./ActionIcon";
import { poItemActions } from "./poActions";
import { catalogNoError, cleanSeriesName, gstWarning, hsnError, reuseSeries, seriesNameError, yCodeError } from "./poValidation";

// The PO module's own item list + price master (backend PoItem). Separate
// from the CRM Items module (/admin/items): nothing is read from or written
// there. This tab is the only place PO prices change ("Manage Prices").
// Round 28 (R3): filled from the Brady price list ("Upload items (Excel)").
// Round 29 (S1): the price-list sheet is the item's SERIES (M210, BMP71 M710…).
// The tab opens on the default series (PO Settings, "M210"; All series when it
// has no items); a panel on the RIGHT lists every series with its count (a
// dropdown above the table on small screens). Search stays inside the chosen
// series unless "Search all series" is on. (S2) View / Edit / Delete icons.

const PRICE_KEYS = ["master_price", "distributor_price", "end_customer_price"] as const;
const FORM_PRICE_KEYS = ["master_price", "distributor_price", "end_customer_price", "cost_price"] as const;
const PAGE_SIZE = 25;
const SHORT_PRICE: Record<string, string> = { master_price: "Master (MDP)", distributor_price: "Distributor (DP)", end_customer_price: "End-user (EP)" };
const ALL = "all";
const NONE = "__none__";
const NEW_SERIES = "__new__";

type ItemForm = {
  _id?: string;
  item_code: string;
  y_code: string;
  name: string;
  description: string;
  hsn: string;
  unit: string;
  tax_rate: string;
  master_price: string;
  cost_price: string;
  distributor_price: string;
  end_customer_price: string;
  lead_time: string;
  remarks: string;
  category: string; // the series; NEW_SERIES = "New series…"
  new_series: string;
};

// Q6: GST % per item, 18 by default.
const emptyForm = (series: string): ItemForm => ({
  item_code: "", y_code: "", name: "", description: "", hsn: "", unit: "Nos", tax_rate: "18",
  master_price: "0", cost_price: "0", distributor_price: "0", end_customer_price: "", lead_time: "", remarks: "", category: series, new_series: "",
});

const toForm = (it: any): ItemForm => ({
  _id: it._id,
  item_code: it.item_code || "",
  y_code: it.y_code || "",
  name: it.name || "",
  description: it.description || "",
  hsn: it.hsn || "",
  unit: it.unit || "Nos",
  tax_rate: String(it.tax_rate ?? 0),
  master_price: String(it.master_price ?? 0),
  cost_price: String(it.cost_price ?? 0),
  distributor_price: String(it.distributor_price ?? 0),
  end_customer_price: String(it.end_customer_price ?? 0),
  lead_time: it.lead_time || "",
  remarks: it.remarks || "",
  category: it.category || "",
  new_series: "",
});

// Same rules as the server (purchase_order_controller cleanPoItem + strictPoItem);
// one message per field.
export const itemFormErrors = (f: ItemForm): Record<string, string> => {
  const e: Record<string, string> = {};
  const set = (k: string, m: string) => { if (m && !e[k]) e[k] = m; };
  set("item_code", catalogNoError(f.item_code));
  set("category", f.category === NEW_SERIES ? seriesNameError(f.new_series) : f.category ? "" : "Series is required");
  if (f.name.trim().length > 300) set("name", "Name can't be longer than 300 characters");
  set("y_code", yCodeError(f.y_code));
  set("hsn", hsnError(f.hsn, { label: "HSN" }));
  const gst = Number(f.tax_rate);
  if (f.tax_rate.trim() === "" || !Number.isFinite(gst) || gst < 0 || gst > 100) set("tax_rate", "GST % must be a number from 0 to 100");
  FORM_PRICE_KEYS.forEach((k) => {
    const n = Number(f[k]);
    if (k === "end_customer_price" && (f[k].trim() === "" || !(n > 0))) set(k, "End User Price is required");
    else if (f[k].trim() === "" || !Number.isFinite(n) || n < 0) set(k, `${PRICE_FIELD_LABEL[k]} must be 0 or more`);
    else if (n > 10000000) set(k, `${PRICE_FIELD_LABEL[k]} can't be more than 1,00,00,000`);
  });
  return e;
};

export const PoItemsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManage = can(PO_MODULE, "Manage Prices");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [searchAll, setSearchAll] = useState(false);
  const [active, setActive] = useState("all");
  // null until the default series is known (then the saved default, else All).
  const [series, setSeries] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ItemForm | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [addCatalogOpen, setAddCatalogOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: seriesData } = useQuery<any>({ queryKey: ["po-item-series", "all"], queryFn: () => purchaseOrderService.itemSeries() });
  const seriesList: { name: string; count: number }[] = seriesData?.series || [];
  const seriesNames = useMemo(() => seriesList.map((s) => s.name), [seriesList]);
  useEffect(() => {
    if (series === null && seriesData) setSeries(seriesData.resolved || ALL);
  }, [seriesData, series]);

  const current = series ?? ALL;
  const categoryParam = (searchAll && debounced) || current === ALL ? undefined : current;
  const { data, isLoading } = useQuery<any>({
    queryKey: ["po-items", debounced, active, categoryParam, page],
    queryFn: () => purchaseOrderService.items({ search: debounced, active, category: categoryParam, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    enabled: series !== null,
  });
  const items = (data as any)?.data || [];
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["po-items"] });
    queryClient.invalidateQueries({ queryKey: ["po-item-categories"] });
    queryClient.invalidateQueries({ queryKey: ["po-item-series"] });
  };
  const pickSeries = (s: string) => { setSeries(s); setPage(1); };
  const seriesLabel = (s: string) => (s === ALL ? "All series" : s === NONE ? "No series" : s);

  const saveMutation = useMutation({
    mutationFn: (f: ItemForm) => {
      const { _id, new_series, category, ...body } = f;
      const finalSeries = category === NEW_SERIES ? reuseSeries(cleanSeriesName(new_series), seriesNames) : category;
      if (!body.name.trim()) body.name = body.item_code.trim(); // name empty = the catalog no.
      return _id ? purchaseOrderService.updateItem(_id, { ...body, category: finalSeries }) : purchaseOrderService.createItem({ ...body, category: finalSeries });
    },
    onSuccess: (res: any, f) => {
      toast({ title: f._id ? "PO item updated" : "PO item added", description: res?.category ? `Series: ${res.category}` : undefined });
      (res?.warnings || []).forEach((w: string) => toast({ title: "Please check", description: w }));
      setEditing(null);
      refresh();
    },
    onError: (err: any) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => purchaseOrderService.updateItem(id, { active: on }),
    onSuccess: (res: any) => {
      toast({ title: res.active ? "Switched on" : "Switched off", description: res.active ? `${res.name} can be picked on new POs.` : `${res.name} is hidden from new POs.` });
      refresh();
    },
    onError: (err: any) => toast({ title: "Could not change", description: err.message, variant: "destructive" }),
  });

  // Delete, or — for an item already used on a PO — offer to switch it off.
  const deleteMutation = useMutation({
    mutationFn: (it: any) => purchaseOrderService.deleteItem(it._id),
    onSuccess: () => {
      toast({ title: "PO item deleted" });
      refresh();
    },
    onError: (err: any, it: any) => {
      if (/switch it off/i.test(err.message || "") && it.active !== false && window.confirm(`${it.item_code || it.name} is used on a PO, so it can't be deleted. Switch it off instead?`)) {
        activeMutation.mutate({ id: it._id, on: false });
        return;
      }
      toast({ title: "Could not delete", description: err.message, variant: "destructive" });
    },
  });

  const loadAllForExport = async () => {
    const res: any = await purchaseOrderService.exportItems();
    return (res?.rows || []).map((r: any) => ({ ...r, active_label: r.active ? "Yes" : "No" }));
  };

  const errors = editing ? itemFormErrors(editing) : {};
  const hasErrors = Object.keys(errors).length > 0;
  const gstNote = editing ? gstWarning(editing.tax_rate) : "";
  const colSpan = 12;
  const acts = poItemActions({ canManage });
  const defaultFormSeries = current !== ALL && current !== NONE ? current : seriesNames[0] || NEW_SERIES;

  const seriesButtons = (
    <nav aria-label="Series" className="space-y-0.5" data-testid="po-series-panel">
      {[{ name: ALL, count: seriesData?.total ?? 0 }, ...seriesList, ...(seriesData?.none ? [{ name: NONE, count: seriesData.none }] : [])].map((s) => {
        const on = s.name === current;
        return (
          <button key={s.name} type="button" aria-current={on ? "true" : undefined}
            className={`w-full flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${on ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"}`}
            onClick={() => pickSeries(s.name)}>
            <span className="truncate" title={seriesLabel(s.name)}>{seriesLabel(s.name)}</span>
            <span className={`text-xs tabular-nums ${on ? "" : "text-muted-foreground"}`}>{s.count.toLocaleString("en-IN")}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Lock className="h-4 w-4 shrink-0" />
          {canManage
            ? "The Purchase Orders module's own item list (separate from Items). Every change is recorded in the Activity Log."
            : "Prices are locked. Only staff with Purchase Orders › Manage Prices can change PO items."}
        </p>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Button className="gap-2" onClick={() => setEditing(emptyForm(defaultFormSeries))}>
              <Plus className="h-4 w-4" /> Add item
            </Button>
          )}
          {canManage && (
            <Button variant="outline" className="gap-2" onClick={() => setAddCatalogOpen(true)}>
              <Plus className="h-4 w-4" /> Add Catalog No.
            </Button>
          )}
          {canManage && <PriceListImportDialog onDone={refresh} existingSeries={seriesNames} />}
          <ExportButton
            data={loadAllForExport}
            filename="po_items"
            columns={[
              { key: "item_code", header: "Catalog No" },
              { key: "y_code", header: "Y Code" },
              { key: "description", header: "Description" },
              { key: "hsn", header: "HSN" },
              { key: "unit", header: "UoM" },
              { key: "tax_rate", header: "GST %", type: "number" },
              { key: "master_price", header: "Master Distributor Price", type: "number" },
              { key: "distributor_price", header: "Distributor Price", type: "number" },
              { key: "end_customer_price", header: "End User Price", type: "number" },
              { key: "lead_time", header: "Lead Time" },
              { key: "category", header: "Series" },
              { key: "active_label", header: "Active" },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <Card className="rounded-lg shadow-sm overflow-hidden flex-1 min-w-0 w-full">
          <CardContent className="p-0">
            <div className="p-4 border-b flex flex-col gap-2">
              {/* Small screens: the series panel becomes this dropdown above the table. */}
              <div className="lg:hidden">
                <Select value={current} onValueChange={pickSeries}>
                  <SelectTrigger className="w-full h-9" aria-label="Series"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All series ({seriesData?.total ?? 0})</SelectItem>
                    {seriesList.map((s) => <SelectItem key={s.name} value={s.name}>{s.name} ({s.count})</SelectItem>)}
                    {seriesData?.none ? <SelectItem value={NONE}>No series ({seriesData.none})</SelectItem> : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative w-full sm:w-[320px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input className="pl-9 h-9" placeholder={searchAll || current === ALL ? "Search catalog, Y code, description..." : `Search in ${seriesLabel(current)}...`} aria-label="Search PO items"
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-xs whitespace-nowrap">
                  <Switch checked={searchAll} onCheckedChange={(on) => { setSearchAll(on); setPage(1); }} aria-label="Search all series" />
                  Search all series
                </label>
                <Select value={active} onValueChange={(v) => { setActive(v); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[170px] h-9" aria-label="Show"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All items</SelectItem>
                    <SelectItem value="true">Active only</SelectItem>
                    <SelectItem value="false">Switched off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1" data-testid="po-items-scope">
                <Layers className="h-3.5 w-3.5" />
                {categoryParam ? <>Series <span className="font-semibold text-foreground">{seriesLabel(categoryParam)}</span></> : searchAll && debounced ? "Searching all series" : "All series"}
                {" · "}{((data as any)?.total ?? 0).toLocaleString("en-IN")} item{(data as any)?.total === 1 ? "" : "s"}
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catalog</TableHead>
                    <TableHead>Y code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>HSN</TableHead>
                    <TableHead>Unit</TableHead>
                    {PRICE_KEYS.map((k) => <TableHead key={k} className="text-right whitespace-nowrap">{SHORT_PRICE[k]}</TableHead>)}
                    <TableHead>Lead time</TableHead>
                    <TableHead>Series</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[150px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading || series === null ? (
                    <SkeletonTableRows rows={6} colSpan={colSpan} />
                  ) : items.length === 0 ? (
                    <TableEmpty colSpan={colSpan}>
                      {debounced || active !== "all"
                        ? "No PO items match."
                        : categoryParam
                          ? `No PO items in series ${seriesLabel(categoryParam)}.`
                          : canManage
                            ? "No PO items yet. Add an item or upload them from Excel."
                            : "No PO items yet."}
                    </TableEmpty>
                  ) : (
                    items.map((it: any) => (
                      <TableRow key={it._id} className={`cursor-pointer ${it.active === false ? "opacity-60" : ""}`} onClick={() => setDetails(it)}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {it.item_code || it.name}
                          {it.replaced_by && <div className="text-[10px] text-amber-700">obsolete → {it.replaced_by}</div>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{it.y_code || "-"}</TableCell>
                        <TableCell className="text-xs max-w-[220px]"><div className="line-clamp-2">{it.description || ""}</div></TableCell>
                        <TableCell className="text-xs">{it.hsn || "-"}</TableCell>
                        <TableCell className="text-xs">{it.unit || "-"}</TableCell>
                        {PRICE_KEYS.map((k) => <TableCell key={k} className="text-right whitespace-nowrap">{Number(it[k]) > 0 ? formatInr(it[k]) : "—"}</TableCell>)}
                        <TableCell className="text-xs whitespace-nowrap">{it.lead_time || "-"}</TableCell>
                        <TableCell className="text-xs max-w-[160px]">
                          {it.category ? <Badge variant="outline" className="max-w-full truncate font-normal" title={[it.category, priceSheetNote(it)].filter(Boolean).join(" · ")}>{it.category}</Badge> : "-"}
                          {priceSheetNote(it) && <div className="text-[10px] text-muted-foreground truncate" title={priceSheetNote(it)}>{priceSheetNote(it)}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={it.active === false ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}>
                            {it.active === false ? "Off" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5" data-testid={`po-item-actions-${it.item_code || it.name}`}>
                            {canManage && (
                              <Switch checked={it.active !== false} disabled={activeMutation.isPending} className="mr-1"
                                aria-label={`${it.active === false ? "Switch on" : "Switch off"} ${it.item_code || it.name}`}
                                onCheckedChange={(on) => activeMutation.mutate({ id: it._id, on })} />
                            )}
                            <ActionIcon icon={Eye} tooltip="View" label={`View PO item ${it.item_code || it.name}`} onClick={() => setDetails(it)} />
                            <ActionIcon icon={Pencil} tooltip="Edit" label={`Edit PO item ${it.item_code || it.name}`} reason={acts.edit.reason} onClick={() => setEditing(toForm(it))} />
                            <ActionIcon icon={Trash2} tooltip="Delete (or switch off if used on a PO)" tone="danger" label={`Delete PO item ${it.item_code || it.name}`} reason={acts.delete.reason}
                              onClick={() => { if (window.confirm(`Delete ${it.item_code || it.name}? An item already used on a PO can only be switched off.`)) deleteMutation.mutate(it); }} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <TablePagination page={page} pageSize={PAGE_SIZE} total={(data as any)?.total || 0} onPageChange={setPage} />
          </CardContent>
        </Card>

        {/* S1: the series panel on the RIGHT (large screens). */}
        <aside className="hidden lg:block w-64 shrink-0 rounded-lg border bg-card p-3 shadow-sm lg:sticky lg:top-4" aria-label="Series panel">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Layers className="h-4 w-4" /> Series</div>
          <div className="max-h-[70vh] overflow-y-auto pr-1">{seriesButtons}</div>
        </aside>
      </div>

      {/* Round 30 (S6): + Add Catalog No. (from the uploaded price list) */}
      {canManage && (
        <AddCatalogDialog open={addCatalogOpen} onOpenChange={setAddCatalogOpen} onAdded={refresh}
          onOpenItem={(code) => { setSearch(code); setSearchAll(true); }}
          onAddByHand={(catalog) => setEditing({ ...emptyForm(defaultFormSeries), item_code: catalog })} />
      )}

      {/* Item details (R3: extra price-list columns are kept as attributes) */}
      <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Info className="h-4 w-4" /> {details?.item_code || details?.name}</DialogTitle>
          </DialogHeader>
          {details && (
            <div className="space-y-3 text-sm">
              <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1">
                {[
                  ["Series", details.category], ["Price from sheet", priceSheetNote(details) ? details.price_sheet : ""], ["Y code", details.y_code], ["Description", details.description], ["HSN", details.hsn], ["Unit", details.unit],
                  ["GST %", `${details.tax_rate ?? 0}%`], ...PRICE_KEYS.map((k) => [PRICE_FIELD_LABEL[k], Number(details[k]) > 0 ? formatInr(details[k]) : "—"]),
                  ["Landing cost", Number(details.cost_price) > 0 ? formatInr(details.cost_price) : "—"],
                  ["Lead time", details.lead_time], ["Remarks", details.remarks],
                  ["Replaces", (details.replaces || []).join(", ")], ["Replaced by", details.replaced_by],
                ].filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => (
                  <div key={String(k)} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="break-words">{String(v)}</dd></div>
                ))}
              </dl>
              {details.attributes && Object.keys(details.attributes).length > 0 && (
                <div>
                  <div className="font-semibold text-xs mb-1">Other details from the price list</div>
                  <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1 text-xs">
                    {Object.entries(details.attributes).map(([k, v]) => (
                      <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="break-words">{String(v)}</dd></div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {canManage && details && <Button variant="outline" className="gap-2" onClick={() => { setEditing(toForm(details)); setDetails(null); }}><Pencil className="h-4 w-4" /> Edit</Button>}
            <Button variant="outline" onClick={() => setDetails(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / edit one item. Required fields are marked * (S4). */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?._id ? `Edit ${editing.item_code || editing.name}` : "Add PO item"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold" htmlFor="po-item-code">Catalog No. *</Label>
                <Input id="po-item-code" maxLength={40} value={editing.item_code} aria-invalid={!!errors.item_code} onChange={(e) => setEditing({ ...editing, item_code: e.target.value })} />
                {errors.item_code && <p className="text-[11px] text-red-700">{errors.item_code}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold" htmlFor="po-item-series">Series *</Label>
                <Select value={editing.category || undefined} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger id="po-item-series" aria-label="Series" aria-invalid={!!errors.category}><SelectValue placeholder="Choose series" /></SelectTrigger>
                  <SelectContent>
                    {editing.category && editing.category !== NEW_SERIES && !seriesNames.includes(editing.category) && <SelectItem value={editing.category}>{editing.category}</SelectItem>}
                    {seriesNames.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    <SelectItem value={NEW_SERIES}>New series…</SelectItem>
                  </SelectContent>
                </Select>
                {editing.category === NEW_SERIES && (
                  <Input aria-label="New series name" placeholder="New series name, e.g. M210" maxLength={40} value={editing.new_series}
                    onChange={(e) => setEditing({ ...editing, new_series: e.target.value })} />
                )}
                {editing.category === NEW_SERIES && !errors.category && cleanSeriesName(editing.new_series) && reuseSeries(cleanSeriesName(editing.new_series), seriesNames) !== cleanSeriesName(editing.new_series) && (
                  <p className="text-[11px] text-amber-700">Series {reuseSeries(cleanSeriesName(editing.new_series), seriesNames)} already exists — the item goes there.</p>
                )}
                {errors.category && <p className="text-[11px] text-red-700">{errors.category}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold" htmlFor="po-item-name">Name</Label>
                <Input id="po-item-name" maxLength={300} placeholder="Empty = the catalog no." value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                {errors.name && <p className="text-[11px] text-red-700">{errors.name}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold" htmlFor="po-item-ycode">Y code</Label>
                <Input id="po-item-ycode" maxLength={10} placeholder="Y5075406" value={editing.y_code} aria-invalid={!!errors.y_code} onChange={(e) => setEditing({ ...editing, y_code: e.target.value })} />
                {errors.y_code && <p className="text-[11px] text-red-700">{errors.y_code}</p>}
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold" htmlFor="po-item-desc">Description</Label>
                <Textarea id="po-item-desc" rows={2} maxLength={2000} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold" htmlFor="po-item-hsn">HSN</Label>
                <Input id="po-item-hsn" maxLength={8} inputMode="numeric" placeholder="4, 6 or 8 digits" value={editing.hsn} aria-invalid={!!errors.hsn} onChange={(e) => setEditing({ ...editing, hsn: e.target.value })} />
                {errors.hsn && <p className="text-[11px] text-red-700">{errors.hsn}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold" htmlFor="po-item-unit">Unit</Label>
                <Input id="po-item-unit" maxLength={30} value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold" htmlFor="po-item-gst">GST %</Label>
                <Input id="po-item-gst" type="number" min={0} max={100} step="0.01" value={editing.tax_rate} aria-invalid={!!errors.tax_rate}
                  onChange={(e) => setEditing({ ...editing, tax_rate: e.target.value })} />
                {errors.tax_rate ? <p className="text-[11px] text-red-700">{errors.tax_rate}</p> : gstNote && <p className="text-[11px] text-amber-700">{gstNote}</p>}
              </div>
              {FORM_PRICE_KEYS.map((k) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs font-semibold" htmlFor={`po-item-${k}`}>{PRICE_FIELD_LABEL[k]}{k === "end_customer_price" ? " *" : ""}</Label>
                  <Input id={`po-item-${k}`} type="number" min={0} step="0.01" value={editing[k]} aria-invalid={!!errors[k]}
                    onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
                  {errors[k] && <p className="text-[11px] text-red-700">{errors[k]}</p>}
                </div>
              ))}
              {(["lead_time", "remarks"] as const).map((k) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs font-semibold" htmlFor={`po-item-${k}`}>{{ lead_time: "Lead time", remarks: "Remarks" }[k]}</Label>
                  <Input id={`po-item-${k}`} maxLength={k === "remarks" ? 500 : 100} value={editing[k]} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={saveMutation.isPending || hasErrors} onClick={() => editing && saveMutation.mutate(editing)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

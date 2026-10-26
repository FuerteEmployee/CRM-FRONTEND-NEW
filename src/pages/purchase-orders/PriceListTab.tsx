import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, TablePagination } from "@/components/ui/table";
import { SkeletonTableRows } from "@/components/ui/skeleton-table-rows";
import { ImportDialog, type ImportColumn } from "@/components/ui/import-dialog";
import { Lock, Pencil, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { purchaseOrderService } from "@/api/services/purchaseOrder.service";
import { PO_MODULE } from "@/lib/purchaseOrders";
import { formatInr, PRICE_FIELD_LABEL } from "./poCalc";

const PRICE_KEYS = ["master_price", "cost_price", "distributor_price", "end_customer_price"] as const;

const PRICE_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "Item Code", sample: "BRD-M21-750", core: true },
  { key: "Item Name", sample: "M21 Label Printer Cartridge", core: true },
  { key: "Master Price", sample: 1500, core: true },
  { key: "Cost Price", sample: 950, core: true },
  { key: "Distributor Price", sample: 1150, core: true },
  { key: "End Customer Price", sample: 1350, core: true },
  { key: "HSN", sample: "84439959", core: false },
  { key: "Unit", sample: "Nos", core: false },
];

// Excel headers -> API field names (spacing/case/underscores ignored).
const HEADER_MAP: Record<string, string> = {
  itemcode: "item_code", code: "item_code", sku: "item_code", partno: "item_code", partnumber: "item_code",
  itemname: "name", name: "name", item: "name", description: "name", product: "name",
  masterprice: "master_price",
  costprice: "cost_price", landingprice: "cost_price", landingcost: "cost_price", cost: "cost_price",
  distributorprice: "distributor_price", dealerprice: "distributor_price",
  endcustomerprice: "end_customer_price", customerprice: "end_customer_price", enduserprice: "end_customer_price",
  hsn: "hsn", hsncode: "hsn", hsnsac: "hsn",
  unit: "unit", uom: "unit",
};

const mapRow = (row: Record<string, any>) => {
  const out: Record<string, any> = {};
  Object.entries(row).forEach(([k, v]) => {
    const field = HEADER_MAP[k.toLowerCase().replace(/[^a-z0-9]/g, "")];
    if (field && out[field] === undefined) out[field] = v;
  });
  return out;
};

export const PriceListTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManage = can(PO_MODULE, "Manage Prices");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<{ rows: any[]; summary: any; source: any[] } | null>(null);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["po-price-list", debounced, page],
    queryFn: () => purchaseOrderService.priceList({ search: debounced, page, limit: 25 }),
    placeholderData: keepPreviousData,
  });
  const items = (data as any)?.data || [];

  const previewMutation = useMutation({
    mutationFn: (rows: any[]) => purchaseOrderService.previewPrices(rows),
    onSuccess: (res: any, rows) => setPreview({ ...res, source: rows }),
    onError: (err: any) => toast({ title: "Could not read the sheet", description: err.message, variant: "destructive" }),
  });

  const importMutation = useMutation({
    mutationFn: (rows: any[]) => purchaseOrderService.importPrices(rows),
    onSuccess: (res: any) => {
      toast({ title: "Price list saved", description: res.message });
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["po-price-list"] });
    },
    onError: (err: any) => toast({ title: "Import failed", description: err.message, variant: "destructive" }),
  });

  const saveItemMutation = useMutation({
    mutationFn: (item: any) =>
      purchaseOrderService.updateItemPrices(item._id, Object.fromEntries(["item_code", ...PRICE_KEYS].map((k) => [k, item[k]]))),
    onSuccess: () => {
      toast({ title: "Prices updated" });
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["po-price-list"] });
    },
    onError: (err: any) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Lock className="h-4 w-4" />
          {canManage
            ? "Click an item (or its Edit button) to set its prices. Every change is recorded in the Activity Log."
            : "Prices are locked. Only staff with Purchase Orders › Manage Prices can change them."}
        </p>
        {canManage && (
          <ImportDialog
            title="Upload Price List"
            triggerLabel="Upload price list (Excel)"
            columns={PRICE_IMPORT_COLUMNS}
            templateFilename="price_list_template.xlsx"
            sheetName="Price List"
            loading={previewMutation.isPending}
            mappingNote="Rows are matched to existing items by Item Code, otherwise by Item Name. Unknown items are added as new. A blank price cell leaves that price unchanged. You see a preview before anything is saved."
            onData={(rows) => previewMutation.mutate(rows.map(mapRow))}
          />
        )}
      </div>

      <Card className="rounded-lg shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative w-full sm:w-[320px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input className="pl-9 h-9" placeholder="Search item code, name, HSN..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item</TableHead>
                  {PRICE_KEYS.map((k) => <TableHead key={k} className="text-right">{PRICE_FIELD_LABEL[k]}</TableHead>)}
                  {canManage && <TableHead className="w-[90px] text-right">Edit</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonTableRows rows={6} colSpan={7} />
                ) : items.length === 0 ? (
                  <TableEmpty colSpan={7}>No items yet. Upload the price list from Excel.</TableEmpty>
                ) : (
                  items.map((it: any) => (
                    <TableRow
                      key={it._id}
                      className={canManage ? "cursor-pointer" : ""}
                      onClick={canManage ? () => setEditing({ ...it }) : undefined}
                    >
                      <TableCell className="font-mono text-xs">{it.item_code || "-"}</TableCell>
                      <TableCell className="font-medium">{it.name}</TableCell>
                      {PRICE_KEYS.map((k) => <TableCell key={k} className="text-right">{formatInr(it[k])}</TableCell>)}
                      {canManage && (
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="h-8 gap-1.5"
                            onClick={(e) => { e.stopPropagation(); setEditing({ ...it }); }}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination page={page} pageSize={25} total={(data as any)?.total || 0} onPageChange={setPage} />
        </CardContent>
      </Card>

      {/* Upload preview */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto grid-cols-1">
          <DialogHeader>
            <DialogTitle>Check the price list before saving</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap text-xs">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700">{preview.summary.new} new</Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">{preview.summary.update} price changes</Badge>
                <Badge variant="outline">{preview.summary.unchanged} unchanged</Badge>
                {preview.summary.error > 0 && <Badge variant="outline" className="bg-red-50 text-red-700">{preview.summary.error} errors (skipped)</Badge>}
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Changes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.filter((r) => r.status !== "unchanged").map((r) => (
                      <TableRow key={r.row} className={r.status === "error" ? "bg-red-50/60" : ""}>
                        <TableCell className="text-xs">{r.row}</TableCell>
                        <TableCell className="text-sm">{[r.item_code, r.name].filter(Boolean).join(" · ")}</TableCell>
                        <TableCell className="text-xs capitalize">{r.status}</TableCell>
                        <TableCell className="text-xs">
                          {r.status === "error"
                            ? <span className="text-red-600">{r.error}</span>
                            : Object.entries(r.changes || {}).map(([f, c]: any) => (
                              <div key={f}>{PRICE_FIELD_LABEL[f] || f.replace(/_/g, " ")}: {c.from ?? "—"} → <b>{c.to}</b></div>
                            ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
            <Button
              disabled={importMutation.isPending || !preview || preview.summary.new + preview.summary.update === 0}
              onClick={() => preview && importMutation.mutate(preview.source)}
            >
              Save {preview ? preview.summary.new + preview.summary.update : 0} rows
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single item */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold">Item Code</label>
                <Input value={editing.item_code || ""} onChange={(e) => setEditing({ ...editing, item_code: e.target.value })} />
              </div>
              {PRICE_KEYS.map((k) => (
                <div key={k} className="space-y-1">
                  <label className="text-xs font-semibold">{PRICE_FIELD_LABEL[k]}</label>
                  <Input type="number" min={0} step="0.01" value={editing[k] ?? 0} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={saveItemMutation.isPending} onClick={() => saveItemMutation.mutate(editing)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

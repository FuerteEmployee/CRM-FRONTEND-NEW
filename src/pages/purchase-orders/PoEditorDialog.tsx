import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, Download, Loader2, MessageCircle, Plus, Send, Trash2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useSettings } from "@/context/SettingsContext";
import { purchaseOrderService } from "@/api/services/purchaseOrder.service";
import { customerService } from "@/api/services/customer.service";
import { PO_MODULE } from "@/lib/purchaseOrders";
import {
  computePo,
  formatInr,
  marginClass,
  PO_STATUS_CLASS,
  PO_STATUS_LABEL,
  PO_STATUS_MOVES,
  PRICE_FIELD_LABEL,
  type PoLine,
  type PoType,
} from "./poCalc";
import { buildPoPdf, poFilename } from "./poPdf";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poId?: string | null; // null/undefined = new PO
  initialType?: PoType;
  settings: any;
};

// Line inputs keep the raw text while typing (so a field can be cleared and
// retyped); computePo and the server turn it into a number. Narrow padding
// leaves room for the digits next to the browser's number spinner.
const NUM_INPUT = "h-8 w-full min-w-[80px] px-2 text-right";

const todayStr = () => new Date().toISOString().slice(0, 10);
const dateStr = (d?: string) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const personName = (p: any) => (p ? [p.firstname, p.lastname].filter(Boolean).join(" ") || p.email : "");

// Searches the price list as you type (it can hold thousands of items).
const ItemPicker = ({ onPick, disabled }: { onPick: (item: any) => void; disabled?: boolean }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);
  const { data, isFetching } = useQuery<any>({
    queryKey: ["po-price-list-search", debounced],
    queryFn: () => purchaseOrderService.priceList({ search: debounced, limit: 20 }),
    enabled: open,
  });
  const items = (data as any)?.data || [];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={disabled}>
          <Plus className="h-4 w-4" /> Add item from price list
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search item code or name..." value={search} onValueChange={setSearch} />
          <CommandList>
            {isFetching && <div className="p-3 text-xs text-muted-foreground">Searching...</div>}
            <CommandEmpty>No items found.</CommandEmpty>
            <CommandGroup>
              {items.map((it: any) => (
                <CommandItem
                  key={it._id}
                  value={it._id}
                  onSelect={() => {
                    onPick(it);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {it.item_code ? `${it.item_code} · ` : ""}
                      {it.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Cost {formatInr(it.cost_price)} · End customer {formatInr(it.end_customer_price)}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const PoEditorDialog = ({ open, onOpenChange, poId, initialType = "purchase", settings }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can, user } = usePermissions();
  const { getSetting } = useSettings();
  const isNew = !poId;

  const { data: po, isLoading } = useQuery<any>({
    queryKey: ["purchase-order", poId],
    queryFn: () => purchaseOrderService.getById(poId),
    enabled: open && !!poId,
  });
  const { data: customers = [] } = useQuery<any>({
    queryKey: ["customers-all"],
    queryFn: () => customerService.getAll(),
    enabled: open,
  });

  const activeDivisions = (settings?.divisions || []).filter((d: any) => d.active !== false);
  const [type, setType] = useState<PoType>(initialType);
  const [division, setDivision] = useState<string>("");
  const [customer, setCustomer] = useState<string>("");
  const [poDate, setPoDate] = useState(todayStr());
  const [expectedDate, setExpectedDate] = useState("");
  const [taxMode, setTaxMode] = useState<"intra" | "inter">("intra");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PoLine[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [waTo, setWaTo] = useState("");

  // Load the PO (or reset for a new one) whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setShowReject(false);
    setRejectReason("");
    if (isNew) {
      setType(initialType);
      setDivision(activeDivisions[0]?.key || "");
      setCustomer("");
      setPoDate(todayStr());
      setExpectedDate("");
      setTaxMode("intra");
      setNotes("");
      setLines([]);
    } else if (po) {
      setType(po.type);
      setDivision(po.division);
      setCustomer(po.customer ? String(po.customer) : "");
      setPoDate(dateStr(po.po_date));
      setExpectedDate(dateStr(po.expected_date));
      setTaxMode(po.tax_mode || "intra");
      setNotes(po.notes || "");
      setLines(
        (po.items || []).map((l: any) => ({
          item_id: String(l.item_id || ""),
          item_code: l.item_code,
          name: l.name,
          hsn: l.hsn,
          unit: l.unit,
          qty: l.qty,
          cost_price: l.cost_price,
          list_price: l.list_price,
          selling_price: l.selling_price,
          tax_rate: l.tax_rate,
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, po, isNew]);

  const rule = settings?.rules?.[type];
  const status: string = isNew ? "draft" : po?.status || "draft";
  const editable = status === "draft" && (isNew ? can(PO_MODULE, "Create") : can(PO_MODULE, "Edit"));
  const canApprove = can(PO_MODULE, "Approve");
  const calc = useMemo(() => computePo(lines, type, taxMode, rule), [lines, type, taxMode, rule]);
  const divisionName = (key: string) => settings?.divisions?.find((d: any) => d.key === key)?.name || key;

  const customerOptions = useMemo(
    () => (Array.isArray(customers) ? customers : (customers as any)?.data || []).map((c: any) => ({ label: c.company, value: c._id })),
    [customers],
  );

  const addItem = (it: any) => {
    if (lines.some((l) => l.item_id === it._id)) {
      toast({ title: "Already added", description: "Change the quantity on the existing line instead." });
      return;
    }
    const list = Number(it[rule?.list_price_field || "end_customer_price"]) || 0;
    const tax = (it.tax?.taxrate || 0) + (it.tax2?.taxrate || 0);
    setLines((prev) => [
      ...prev,
      {
        item_id: it._id,
        item_code: it.item_code,
        name: it.name,
        hsn: it.hsn_sac_code,
        unit: it.unit,
        qty: 1,
        cost_price: Number(it.cost_price) || 0,
        list_price: list,
        selling_price: list,
        tax_rate: tax,
      },
    ]);
  };

  const updateLine = (i: number, patch: Partial<PoLine>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const refresh = (saved?: any) => {
    queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    queryClient.invalidateQueries({ queryKey: ["purchase-order-stats"] });
    queryClient.invalidateQueries({ queryKey: ["purchase-order-approvals"] });
    if (saved?._id) queryClient.invalidateQueries({ queryKey: ["purchase-order", String(saved._id)] });
  };

  const saveMutation = useMutation({
    mutationFn: (submit: boolean) => {
      const payload = {
        type,
        division,
        customer: customer || undefined,
        po_date: poDate,
        expected_date: expectedDate || undefined,
        tax_mode: taxMode,
        notes,
        items: lines.map((l) => ({ item_id: l.item_id, qty: l.qty, selling_price: l.selling_price, tax_rate: l.tax_rate })),
        submit,
      };
      return isNew ? purchaseOrderService.create(payload) : purchaseOrderService.update(poId, payload);
    },
    onSuccess: (saved: any) => {
      refresh(saved);
      const msg =
        saved.status === "approved"
          ? "Approved and locked."
          : saved.status === "pending_approval"
            ? "Sent to an approver — it breaks the pricing rules."
            : "Saved as draft.";
      toast({ title: `${saved.po_number}`, description: msg });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  const decideMutation = useMutation({
    mutationFn: ({ yes }: { yes: boolean }) =>
      yes ? purchaseOrderService.approve(poId, "") : purchaseOrderService.reject(poId, rejectReason),
    onSuccess: (saved: any) => {
      refresh(saved);
      toast({ title: saved.po_number, description: saved.status === "approved" ? "Approved and locked." : "Sent back to draft." });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ title: "Could not save the decision", description: err.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: (next: string) => purchaseOrderService.changeStatus(poId, next),
    onSuccess: (saved: any) => {
      refresh(saved);
      toast({ title: saved.po_number, description: `Marked ${PO_STATUS_LABEL[saved.status]}.` });
    },
    onError: (err: any) => toast({ title: "Could not change status", description: err.message, variant: "destructive" }),
  });

  const pdfOptions = { logoUrl: getSetting("compLogoLight"), companyName: getSetting("companyName") };

  const downloadPdf = async () => {
    try {
      const doc = await buildPoPdf(po, po.format, pdfOptions);
      doc.save(poFilename(po));
    } catch (err: any) {
      toast({ title: "Could not build the PDF", description: err.message, variant: "destructive" });
    }
  };

  const waMutation = useMutation({
    mutationFn: async () => {
      const doc = await buildPoPdf(po, po.format, pdfOptions);
      return purchaseOrderService.sendWhatsApp(poId, doc.output("blob"), poFilename(po), waTo.trim() || undefined);
    },
    onSuccess: (saved: any) => {
      refresh(saved);
      const last = saved.whatsapp_log?.[saved.whatsapp_log.length - 1];
      toast({
        title: "Sent on WhatsApp",
        description: last?.status === "simulated" ? "Test mode: the number isn't live, nothing was really sent." : `PDF sent to ${last?.to}.`,
      });
      setWaOpen(false);
    },
    onError: (err: any) => {
      refresh({ _id: poId });
      toast({ title: "WhatsApp send failed", description: err.message, variant: "destructive" });
    },
  });

  const openWhatsApp = () => {
    const party = po?.type === "purchase" ? po?.supplier : po?.customer_snapshot;
    setWaTo(party?.whatsapp || party?.phone || "");
    setWaOpen(true);
  };

  const sendable = ["approved", "sent", "partially_received", "received"].includes(status);
  const title = isNew
    ? `New ${type === "purchase" ? "Purchase" : "Sales"} PO`
    : `${po?.type === "sales" ? "Sales" : "Purchase"} PO ${po?.po_number || ""}`;
  const partyLabel = type === "purchase" ? "Customer price" : "Selling price";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {/* grid-cols-1 caps the dialog's grid track at the dialog width;
            otherwise the wide items table stretches it and the totals box
            on the right gets clipped. The table scrolls sideways instead. */}
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto grid-cols-1">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 flex-wrap">
              {title}
              {!isNew && po && (
                <Badge variant="outline" className={PO_STATUS_CLASS[status]}>
                  {PO_STATUS_LABEL[status]}
                </Badge>
              )}
              {!isNew && po && <span className="text-xs font-normal text-muted-foreground">{divisionName(po.division)}</span>}
            </DialogTitle>
          </DialogHeader>

          {!isNew && isLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-5 min-w-0">
              {/* Header fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {isNew && (
                  <div className="space-y-1.5">
                    <Label>PO type</Label>
                    <Select value={type} onValueChange={(v) => { setType(v as PoType); setLines([]); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchase">Purchase PO (to supplier)</SelectItem>
                        <SelectItem value="sales">Sales PO (to customer)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {isNew && (
                  <div className="space-y-1.5">
                    <Label>Division</Label>
                    <Select value={division} onValueChange={setDivision}>
                      <SelectTrigger><SelectValue placeholder="Choose division" /></SelectTrigger>
                      <SelectContent>
                        {activeDivisions.map((d: any) => (
                          <SelectItem key={d.key} value={d.key}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>{type === "sales" ? "Customer *" : "Customer (optional — leave empty for stock)"}</Label>
                  {editable ? (
                    <div className="flex gap-2">
                      <SearchableSelect
                        className="flex-1"
                        options={customerOptions}
                        value={customer}
                        onValueChange={(v) => setCustomer(v)}
                        placeholder="Choose customer"
                      />
                      {type === "purchase" && customer && (
                        <Button variant="ghost" size="icon" onClick={() => setCustomer("")} title="Clear (stock PO)">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="h-10 flex items-center text-sm font-medium">{po?.customer_snapshot?.name || "Stock (no customer)"}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>PO date</Label>
                  <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} disabled={!editable} />
                </div>
                <div className="space-y-1.5">
                  <Label>Expected delivery</Label>
                  <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} disabled={!editable} />
                </div>
                <div className="space-y-1.5">
                  <Label>GST</Label>
                  <Select value={taxMode} onValueChange={(v) => setTaxMode(v as any)} disabled={!editable}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intra">CGST + SGST (same state)</SelectItem>
                      <SelectItem value="inter">IGST (other state)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {type === "purchase" && (
                <div className="text-sm rounded-md border bg-slate-50 px-3 py-2">
                  Supplier: <span className="font-semibold">{(isNew ? settings?.supplier?.name : po?.supplier?.name) || "Brady"}</span>
                  <span className="text-muted-foreground"> (fixed — change the details in PO Settings)</span>
                </div>
              )}

              {/* Lines */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="min-w-[110px] text-right">Qty</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">List ({PRICE_FIELD_LABEL[rule?.list_price_field] || "list"})</TableHead>
                      <TableHead className="min-w-[140px] text-right">{partyLabel}</TableHead>
                      <TableHead className="text-right">Disc %</TableHead>
                      <TableHead className="text-right">Margin %</TableHead>
                      <TableHead className="min-w-[100px] text-right">GST %</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      {editable && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calc.lines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                          No items yet. Add items from the price list.
                        </TableCell>
                      </TableRow>
                    ) : (
                      calc.lines.map((l, i) => (
                        <TableRow key={l.item_id || i} className={l.breaches.length ? "bg-red-50/60" : ""}>
                          <TableCell>
                            <div className="font-medium text-sm">{l.name}</div>
                            <div className="text-[11px] text-muted-foreground">{[l.item_code, l.hsn && `HSN ${l.hsn}`].filter(Boolean).join(" · ")}</div>
                            {l.breaches.map((b) => (
                              <div key={b} className="text-[11px] text-red-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> {b}
                              </div>
                            ))}
                          </TableCell>
                          <TableCell className="text-right px-2">
                            {editable ? (
                              <Input type="number" min={0} className={NUM_INPUT} value={lines[i].qty}
                                onChange={(e) => updateLine(i, { qty: e.target.value as any })} />
                            ) : l.qty}
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatInr(l.cost_price)}</TableCell>
                          <TableCell className="text-right text-sm">{formatInr(l.list_price)}</TableCell>
                          <TableCell className="text-right px-2">
                            {editable ? (
                              <Input type="number" min={0} step="0.01" className={NUM_INPUT} value={lines[i].selling_price}
                                onChange={(e) => updateLine(i, { selling_price: e.target.value as any })} />
                            ) : formatInr(l.selling_price)}
                          </TableCell>
                          <TableCell className="text-right text-sm">{l.discount_pct}%</TableCell>
                          <TableCell className={`text-right text-sm font-semibold ${marginClass(l.margin_pct, rule?.min_margin_pct)}`}>
                            {l.margin_pct === null ? "—" : `${l.margin_pct}%`}
                          </TableCell>
                          <TableCell className="text-right px-2">
                            {editable ? (
                              <Input type="number" min={0} className={NUM_INPUT} value={lines[i].tax_rate}
                                onChange={(e) => updateLine(i, { tax_rate: e.target.value as any })} />
                            ) : `${l.tax_rate}%`}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatInr(l.amount)}</TableCell>
                          {editable && (
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}>
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {editable && <ItemPicker onPick={addItem} disabled={!rule} />}
              {type === "purchase" && (
                <p className="text-[11px] text-muted-foreground">
                  The PO to the supplier shows the cost price. "Customer price" is what this order sells at — it is only used to work out the margin.
                </p>
              )}

              {/* Totals + rule verdict */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 min-w-0">
                  {editable && calc.lines.length > 0 && (
                    calc.approvalRequired ? (
                      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 flex gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>This PO breaks the pricing rules and will need an approver's Yes.</span>
                      </div>
                    ) : (
                      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 flex gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>Within the pricing rules — it is approved as soon as you submit.</span>
                      </div>
                    )
                  )}
                  {!isNew && po?.approval?.reasons?.length > 0 && status !== "draft" && (
                    <div className="rounded-md border bg-slate-50 p-3 text-xs space-y-1">
                      <div className="font-semibold">Why it needed approval</div>
                      {po.approval.reasons.map((r: string) => <div key={r}>• {r}</div>)}
                    </div>
                  )}
                  {!isNew && po?.approval?.decision === "rejected" && status === "draft" && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      Approver said No{po.approval.decided_by ? ` (${personName(po.approval.decided_by)})` : ""}: {po.approval.reason}
                    </div>
                  )}
                  {!isNew && ["approved", "auto_approved"].includes(po?.approval?.decision) && (
                    <div className="text-xs text-muted-foreground">
                      Approved{po.approval.decided_by ? ` by ${personName(po.approval.decided_by)}` : " automatically (within rules)"}
                      {po.approval.decided_at ? ` on ${new Date(po.approval.decided_at).toLocaleString("en-IN")}` : ""}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Notes</Label>
                    <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!editable} />
                  </div>
                </div>
                <div className="rounded-md border p-4 space-y-1.5 text-sm h-fit min-w-0">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatInr(calc.totals.subtotal)}</span></div>
                  {taxMode === "inter" ? (
                    <div className="flex justify-between"><span>IGST</span><span>{formatInr(calc.totals.igst)}</span></div>
                  ) : (
                    <>
                      <div className="flex justify-between"><span>CGST</span><span>{formatInr(calc.totals.cgst)}</span></div>
                      <div className="flex justify-between"><span>SGST</span><span>{formatInr(calc.totals.sgst)}</span></div>
                    </>
                  )}
                  <div className="flex justify-between font-bold text-base border-t pt-2"><span>Grand total</span><span>{formatInr(calc.totals.grand_total)}</span></div>
                  <div className="flex justify-between pt-2 border-t">
                    <span>PO margin</span>
                    <span className={`font-bold ${marginClass(calc.totals.margin_pct, rule?.min_margin_pct)}`}>
                      {calc.totals.margin_pct === null ? "—" : `${calc.totals.margin_pct}%`}
                    </span>
                  </div>
                  {rule && (
                    <div className="text-[11px] text-muted-foreground">
                      Rule: {[
                        rule.max_discount_pct !== null && `discount ≤ ${rule.max_discount_pct}%`,
                        rule.min_margin_pct !== null && `margin ≥ ${rule.min_margin_pct}%`,
                        rule.allow_below_list === false && "no price below list",
                      ].filter(Boolean).join(", ") || "none"}
                    </div>
                  )}
                </div>
              </div>

              {/* Approver decision */}
              {!isNew && status === "pending_approval" && canApprove && (
                <div className="rounded-md border border-amber-300 p-4 space-y-3">
                  <div className="font-semibold text-sm">Your decision</div>
                  {showReject && (
                    <Textarea rows={2} placeholder="Reason for No (the maker sees this)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                  )}
                  <div className="flex gap-2">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" disabled={decideMutation.isPending}
                      onClick={() => decideMutation.mutate({ yes: true })}>
                      <CheckCircle2 className="h-4 w-4" /> Yes, approve
                    </Button>
                    {showReject ? (
                      <Button variant="destructive" disabled={!rejectReason.trim() || decideMutation.isPending}
                        onClick={() => decideMutation.mutate({ yes: false })}>
                        Send back with reason
                      </Button>
                    ) : (
                      <Button variant="outline" className="text-red-600" onClick={() => setShowReject(true)}>No</Button>
                    )}
                  </div>
                </div>
              )}

              {/* History */}
              {!isNew && po && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-md border p-3 space-y-1 max-h-48 overflow-y-auto">
                    <div className="font-semibold text-sm mb-1">History</div>
                    {[...(po.history || [])].reverse().map((h: any, i: number) => (
                      <div key={i}>
                        <span className="text-muted-foreground">{new Date(h.at).toLocaleString("en-IN")}</span>{" "}
                        <span className="font-medium">{personName(h.by) || "—"}</span>{" "}
                        {h.action.replace("status:", "marked ").replace(/_/g, " ")}
                        {h.note ? ` — ${h.note}` : ""}
                      </div>
                    ))}
                  </div>
                  <div className="rounded-md border p-3 space-y-1 max-h-48 overflow-y-auto">
                    <div className="font-semibold text-sm mb-1">WhatsApp sends</div>
                    {(po.whatsapp_log || []).length === 0 && <div className="text-muted-foreground">Not sent yet.</div>}
                    {[...(po.whatsapp_log || [])].reverse().map((w: any, i: number) => (
                      <div key={i}>
                        <span className="text-muted-foreground">{new Date(w.at).toLocaleString("en-IN")}</span>{" "}
                        to {w.to} ({w.method}) —{" "}
                        <span className={w.status === "failed" ? "text-red-600 font-medium" : "text-emerald-600 font-medium"}>{w.status}</span>
                        {w.error ? `: ${w.error}` : ""}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <div className="flex gap-2 flex-wrap">
              {!isNew && po && (
                <Button variant="outline" className="gap-2" onClick={downloadPdf}>
                  <Download className="h-4 w-4" /> PDF
                </Button>
              )}
              {!isNew && po && sendable && can(PO_MODULE, "Edit") && (
                <Button variant="outline" className="gap-2 text-emerald-700" onClick={openWhatsApp}>
                  <MessageCircle className="h-4 w-4" /> Send on WhatsApp
                </Button>
              )}
              {!isNew && po && can(PO_MODULE, "Edit") && (PO_STATUS_MOVES[status] || []).length > 0 && (
                <Select value="" onValueChange={(v) => {
                  if (v === "cancelled" && !window.confirm(`Cancel ${po.po_number}?`)) return;
                  statusMutation.mutate(v);
                }}>
                  <SelectTrigger className="w-[190px]"><SelectValue placeholder="Change status..." /></SelectTrigger>
                  <SelectContent>
                    {PO_STATUS_MOVES[status].map((s) => (
                      <SelectItem key={s} value={s}>{s === "sent" ? (po.type === "sales" ? "Sent to customer" : "Sent to supplier") : PO_STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              {editable && (
                <>
                  <Button variant="outline" disabled={saveMutation.isPending || !lines.length} onClick={() => saveMutation.mutate(false)}>
                    Save draft
                  </Button>
                  <Button className="gap-2" disabled={saveMutation.isPending || !lines.length || (type === "sales" && !customer)}
                    onClick={() => saveMutation.mutate(true)}>
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {calc.approvalRequired && !canApprove ? "Submit for approval" : "Submit & approve"}
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send {po?.po_number} on WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-1.5">
              <Label>WhatsApp number</Label>
              <Input value={waTo} onChange={(e) => setWaTo(e.target.value)} placeholder="10-digit mobile or with country code" />
            </div>
            <p className="text-xs text-muted-foreground">
              If this number messaged you in the last 24 hours the PDF goes directly. Otherwise the WhatsApp template set in PO Settings is used.
            </p>
            {user && !settings?.whatsapp?.template_name && (
              <p className="text-xs text-amber-700">No template is set yet, so only numbers that messaged you in the last 24 hours can receive it.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaOpen(false)}>Cancel</Button>
            <Button className="gap-2" disabled={waMutation.isPending || waTo.replace(/\D/g, "").length < 10} onClick={() => waMutation.mutate()}>
              {waMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

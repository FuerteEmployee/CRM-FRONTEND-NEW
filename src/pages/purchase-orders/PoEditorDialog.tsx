import { useEffect, useMemo, useRef, useState } from "react";
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
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, Download, FileSearch, FileText, Info, Link2, Loader2, MessageCircle, Paperclip, Pencil, Plus, Send, Trash2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useSettings } from "@/context/SettingsContext";
import { purchaseOrderService } from "@/api/services/purchaseOrder.service";
import { customerService } from "@/api/services/customer.service";
import { PO_MODULE } from "@/lib/purchaseOrders";
import {
  computePo,
  costOf,
  COST_SOURCE_LABEL,
  formatInr,
  marginClass,
  PO_STATUS_CLASS,
  PO_STATUS_LABEL,
  PO_STATUS_MOVES,
  PRICE_LEVEL_LABEL,
  purchaseRule,
  type PoLine,
  type PriceLevel,
} from "./poCalc";
import { buildPoPdf, poFilename } from "./poPdf";
import { addOrMerge, applyReadLines, readFileError, type ReadLine } from "./autoFill";
import { customerPoDateError, customerPoNoError, expectedDateError } from "./poValidation";
import { pickerHint, type FindResult } from "./catalogAdd";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

// Round 28 (Brady flow): the editor makes only Purchase POs to Brady (R1).
// A customer's PO is entered here: customer + customer PO no. / date / file
// (R6), items from the price list. Each line shows the cost (Master
// Distributor Price — what is printed on the PO), the floor (End User Price,
// or Distributor Price for a "distributor" customer, Q2), the customer's
// selling price (only up), and — as the LAST columns — "Margin %" and
// "Margin ₹" with a totals row. The margin is on screen only. Every PO goes to
// an approver (R4); PDF / WhatsApp / proforma only after the Yes.

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poId?: string | null; // null/undefined = new PO
  settings: any;
  // Opens another PO in this dialog (an old linked Sales / Brady PO).
  onOpenPo?: (id: string) => void;
  // Opens a proforma invoice made from this PO.
  onOpenProforma?: (id: string) => void;
  // Round 29 (S2): opened with the eye icon — read-only until "Edit" is pressed.
  readOnly?: boolean;
};

type EditorLine = PoLine & { ep?: number; dp?: number; note?: string };

const NUM_INPUT = "h-8 w-full min-w-[80px] px-2 text-right";
const CUSTOMER_PO_MAX_BYTES = 10 * 1024 * 1024;
// Round 29 (S3): an .xlsx customer PO can be READ (items filled in) but only a
// PDF / JPG / PNG is kept on the PO as the attached file.
const CUSTOMER_PO_ACCEPT = ".pdf,.jpg,.jpeg,.png,.xlsx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ATTACHABLE = /\.(pdf|jpe?g|png)$/i;
const customerPoFileError = (f: File | null) => {
  if (!f) return "";
  if (!/\.(pdf|jpe?g|png|xlsx)$/i.test(f.name)) return "Only a PDF, JPG, PNG (or an Excel .xlsx to read items from) can be chosen";
  if (f.size === 0) return "The file is empty";
  if (f.size > CUSTOMER_PO_MAX_BYTES) return "The file is larger than 10 MB";
  return "";
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const HISTORY_LABEL: Record<string, string> = {
  customer_po_file: "attached the customer PO",
  purchase_po_created: "created the Brady PO",
  proforma_created: "created proforma invoice",
};
const dateStr = (d?: string) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const personName = (p: any) => (p ? [p.firstname, p.lastname].filter(Boolean).join(" ") || p.email : "");
const SENDABLE = ["approved", "sent", "partially_received", "received"];

const lineFromItem = (it: any, level: PriceLevel): EditorLine => {
  const ep = Number(it.end_customer_price) || 0;
  const dp = Number(it.distributor_price) || 0;
  const list = level === "distributor" ? dp : ep;
  return {
    item_id: it._id,
    item_code: it.item_code,
    y_code: it.y_code,
    name: it.name,
    hsn: it.hsn,
    unit: it.unit,
    qty: 1,
    ...costOf(it),
    list_price: list,
    selling_price: list,
    tax_rate: Number(it.tax_rate) || 0,
    replaced_by: it.replaced_by,
    ep,
    dp,
  };
};

// Searches the PO module's own item list (catalog, Y code, description, or an
// obsolete catalog that an item replaces); switched-off items are not offered.
// Round 29 (S1): a series filter (default = the default series, "All series"
// to search everything); each result shows its series badge.
// Round 30 (S6): when the search finds nothing in PO Items but the catalog is
// in the uploaded price list → "Not in PO Items yet — Add <catalog> from the
// price list" (Manage Prices; otherwise "Ask an admin to add it").
// Several items can be picked in one go: the list stays open, a picked item
// shows "✓ on PO" (picking it again adds 1 to its qty), "Done" closes it.
const ItemPicker = ({ onPick, disabled, onPoIds }: { onPick: (item: any) => void; disabled?: boolean; onPoIds?: Set<string> }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManagePrices = can(PO_MODULE, "Manage Prices");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(0);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [series, setSeries] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);
  const { data: seriesData } = useQuery<any>({ queryKey: ["po-item-series", "active"], queryFn: () => purchaseOrderService.itemSeries({ active: "true" }), enabled: open });
  useEffect(() => {
    if (series === null && seriesData) setSeries(seriesData.resolved || "all");
  }, [seriesData, series]);
  const current = series ?? "all";
  const { data, isFetching } = useQuery<any>({
    queryKey: ["po-items-search", debounced, current],
    queryFn: () => purchaseOrderService.items({ search: debounced, active: "true", limit: 20, category: current === "all" ? undefined : current }),
    enabled: open && series !== null,
  });
  const items = (data as any)?.data || [];
  const term = debounced.trim();
  const { data: refHit } = useQuery<FindResult | null>({
    queryKey: ["po-catalog-find", term],
    queryFn: async () => {
      try {
        const res: any = await purchaseOrderService.findCatalogs(term);
        return (res.results || [])[0] || null;
      } catch {
        return null; // no price list uploaded / bad text: no hint
      }
    },
    enabled: open && series !== null && !isFetching && items.length === 0 && term.length >= 2 && !/[,;\n]/.test(term),
    staleTime: 30000,
  });
  const hint = items.length === 0 && term.length >= 2 ? pickerHint(refHit, canManagePrices) : null;
  const addFromPriceList = async () => {
    if (!refHit) return;
    setAdding(true);
    try {
      const res: any = await purchaseOrderService.addCatalogs(refHit.query);
      const item = (res.items || [])[0];
      queryClient.invalidateQueries({ queryKey: ["po-items"] });
      queryClient.invalidateQueries({ queryKey: ["po-items-search"] });
      queryClient.invalidateQueries({ queryKey: ["po-item-series"] });
      queryClient.invalidateQueries({ queryKey: ["po-catalog-find"] });
      if (item) {
        toast({ title: `${item.item_code || item.name} added to PO Items`, description: `Series ${item.category || "-"} · prices from the price list` });
        onPick(item);
        setOpen(false);
        setSearch("");
      } else {
        toast({ title: "Not added", description: (res.results || [])[0]?.message || "It is already in PO Items." });
      }
    } catch (err: any) {
      toast({ title: "Could not add", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };
  const closePicker = () => { setOpen(false); setSearch(""); setPicked(0); };
  return (
    <Popover open={open} onOpenChange={(o) => (o ? setOpen(true) : closePicker())}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={disabled}>
          <Plus className="h-4 w-4" /> Add item from PO items
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(460px,92vw)] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center gap-2 border-b px-2 py-1.5">
            <span className="text-xs text-muted-foreground">Series</span>
            <select aria-label="Item picker series" className="h-7 flex-1 rounded-md border bg-background px-2 text-xs" value={current} onChange={(e) => setSeries(e.target.value)}>
              <option value="all">All series</option>
              {(seriesData?.series || []).map((s: any) => <option key={s.name} value={s.name}>{s.name} ({s.count})</option>)}
            </select>
          </div>
          <CommandInput placeholder={current === "all" ? "Search catalog no., Y code, description..." : `Search in ${current}...`} value={search} onValueChange={setSearch} />
          <CommandList>
            {isFetching && <div className="p-3 text-xs text-muted-foreground">Searching...</div>}
            {hint ? (
              <div className="p-3 space-y-2 text-xs" data-testid="picker-price-list-hint">
                <div className="text-amber-800">{hint.text}</div>
                {refHit?.entry && (
                  <div className="text-muted-foreground">
                    {refHit.entry.item_code}{refHit.entry.y_code ? ` · ${refHit.entry.y_code}` : ""} · series {refHit.entry.category} · MDP {formatInr(refHit.entry.master_price)} · EP {formatInr(refHit.entry.end_customer_price)}
                  </div>
                )}
                {hint.action === "add" && (
                  <Button type="button" size="sm" className="h-7 gap-1" disabled={adding} onClick={addFromPriceList}>
                    {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add {refHit?.entry?.item_code || refHit?.query} from the price list
                  </Button>
                )}
              </div>
            ) : (
              <CommandEmpty>{current === "all" ? "No PO items found. Upload the price list in the PO Items tab." : `No PO items found in series ${current} — try All series.`}</CommandEmpty>
            )}
            <CommandGroup>
              {items.map((it: any) => (
                <CommandItem key={it._id} value={it._id} onSelect={() => { onPick(it); setPicked((n) => n + 1); }}>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {it.item_code || it.name}{it.y_code ? ` · ${it.y_code}` : ""}
                      {it.category && <Badge variant="outline" className="ml-2 h-4 px-1 text-[10px] font-normal">{it.category}</Badge>}
                      {it.replaced_by && <span className="ml-2 text-[10px] text-amber-700">obsolete → {it.replaced_by}</span>}
                      {onPoIds?.has(String(it._id)) && <span className="ml-2 text-[10px] font-semibold text-emerald-700" data-testid="picker-on-po">✓ on PO</span>}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {it.description ? `${it.description.slice(0, 60)} · ` : ""}MDP {Number(it.master_price) > 0 ? formatInr(it.master_price) : "—"} · EP {formatInr(it.end_customer_price)}
                      {(it.replaces || []).length > 0 && ` · replaces ${(it.replaces || []).join(", ")}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="flex items-center justify-between gap-2 border-t px-2 py-1.5">
            <span className="text-[11px] text-muted-foreground">{picked ? `${picked} picked — pick more or press Done` : "Click items to add them — you can pick several"}</span>
            <Button type="button" size="sm" className="h-7" onClick={closePicker}>Done</Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const PoEditorDialog = ({ open, onOpenChange, poId, settings, onOpenPo, onOpenProforma, readOnly }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can, user, isAdmin } = usePermissions();
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
  const [division, setDivision] = useState<string>("");
  const [customer, setCustomer] = useState<string>("");
  const [poDate, setPoDate] = useState(todayStr());
  const [expectedDate, setExpectedDate] = useState("");
  const [taxMode, setTaxMode] = useState<"intra" | "inter">("intra");
  const [notes, setNotes] = useState("");
  const [customerPoNo, setCustomerPoNo] = useState("");
  const [customerPoDate, setCustomerPoDate] = useState("");
  const [customerPoFile, setCustomerPoFile] = useState<File | null>(null);
  const [lines, setLines] = useState<EditorLine[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [waTo, setWaTo] = useState("");
  const [recvOpen, setRecvOpen] = useState(false);
  const [recvQty, setRecvQty] = useState<Record<string, string>>({});
  const decidingRef = useRef(false);
  // Unsaved-changes check: the form as it was opened vs now (Close / X / Esc ask first).
  const baselineRef = useRef("");
  const [needBaseline, setNeedBaseline] = useState(false);
  // S2: "Edit" pressed in a read-only (eye) view.
  const [unlocked, setUnlocked] = useState(false);
  // S4: per-field messages — shown after the first Save / Submit, plus what the server said.
  const [showErrors, setShowErrors] = useState(false);
  const [serverError, setServerError] = useState<{ field?: string; message: string; existing?: { _id: string; po_number: string }[] } | null>(null);
  // S3: the review list of "Read items from the customer PO".
  const [review, setReview] = useState<{ lines: ReadLine[]; summary: string; source?: string } | null>(null);
  const [reading, setReading] = useState(false);
  // S5: a failed WhatsApp send shows its error inside the dialog (no toast on top of it).
  const [waError, setWaError] = useState("");

  useEffect(() => {
    if (!open) return;
    setShowReject(false);
    setRejectReason("");
    setCustomerPoFile(null);
    setUnlocked(false);
    setShowErrors(false);
    setServerError(null);
    setReview(null);
    setNeedBaseline(true);
    if (isNew) {
      setDivision(activeDivisions[0]?.key || "");
      setCustomer("");
      setPoDate(todayStr());
      setExpectedDate("");
      setTaxMode("intra");
      setNotes("");
      setCustomerPoNo("");
      setCustomerPoDate("");
      setLines([]);
    } else if (po) {
      setDivision(po.division);
      setCustomer(po.customer ? String(po.customer) : "");
      setPoDate(dateStr(po.po_date));
      setExpectedDate(dateStr(po.expected_date));
      setTaxMode(po.tax_mode || "intra");
      setNotes(po.notes || "");
      setCustomerPoNo(po.customer_po_number || "");
      setCustomerPoDate(dateStr(po.customer_po_date));
      setLines(
        (po.items || []).map((l: any) => ({
          item_id: String(l.item_id || ""),
          item_code: l.item_code,
          y_code: l.y_code,
          name: l.name,
          hsn: l.hsn,
          unit: l.unit,
          qty: l.qty,
          cost_price: l.cost_price,
          cost_source: l.cost_source,
          list_price: l.list_price,
          selling_price: l.selling_price,
          tax_rate: l.tax_rate,
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, po, isNew]);

  const formSignature = JSON.stringify([division, customer, poDate, expectedDate, taxMode, notes, customerPoNo, customerPoDate, customerPoFile?.name || "",
    lines.map((l) => [l.item_id, String(l.qty), String(l.selling_price), String(l.tax_rate)])]);
  useEffect(() => {
    if (needBaseline) { baselineRef.current = formSignature; setNeedBaseline(false); }
  }, [needBaseline, formSignature]);

  const isOldSales = !isNew && po?.type === "sales";
  const levels = settings?.customer_price_levels || {};
  const savedLevel: PriceLevel = customer && levels[customer] === "distributor" ? "distributor" : "end_user";
  const level: PriceLevel = isNew || po?.status === "draft" ? savedLevel : po?.price_level || "end_user";
  const rule = isOldSales ? settings?.rules?.sales : purchaseRule(settings?.rules?.purchase, level);
  const status: string = isNew ? "draft" : po?.status || "draft";
  const mayEdit = !isOldSales && status === "draft" && (isNew ? can(PO_MODULE, "Create") : can(PO_MODULE, "Edit"));
  const editable = mayEdit && (isNew || !readOnly || unlocked);
  const canApprove = can(PO_MODULE, "Approve");
  const canSetLevel = !!(isAdmin || user?.admin || can(PO_MODULE, "Manage Prices"));

  // Q2: a level change moves the floor of lines whose item prices are known.
  useEffect(() => {
    if (!editable) return;
    setLines((prev) => prev.map((l) => {
      if (l.ep === undefined) return l;
      const list = level === "distributor" ? l.dp || 0 : l.ep || 0;
      return { ...l, list_price: list, selling_price: Number(l.selling_price) < list ? list : l.selling_price };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const calc = useMemo(() => computePo(lines, isOldSales ? "sales" : "purchase", taxMode, rule), [lines, taxMode, rule, isOldSales]);
  const divisionName = (key: string) => settings?.divisions?.find((d: any) => d.key === key)?.name || key;

  const customerOptions = useMemo(
    () => (Array.isArray(customers) ? customers : (customers as any)?.data || []).map((c: any) => ({ label: c.company, value: c._id })),
    [customers],
  );

  // S4: the same item again is merged into its line (qty + 1) with a toast.
  const addItem = (it: any) => {
    const { lines: next, merged } = addOrMerge(lines, lineFromItem(it, level));
    if (merged) {
      const line = next.find((l) => l.item_id === it._id);
      toast({ title: "Already on this PO — qty added", description: `${it.item_code || it.name}: qty is now ${line?.qty}.` });
    } else if (it.replaced_by) {
      toast({ title: `${it.item_code || it.name} is obsolete`, description: `Brady replaced it with ${it.replaced_by}. Use the button on the line to switch.` });
    }
    setLines(next);
  };

  // S3: read the chosen customer PO file → fill the item table + review list.
  const readCustomerPo = async (file: File | null = customerPoFile) => {
    const err = readFileError(file);
    if (!file || err) {
      setReview({ lines: [], summary: err || "Choose the customer PO file first" });
      return;
    }
    setReading(true);
    try {
      const res: any = await purchaseOrderService.readCustomerPo(file, customer || undefined);
      const out = applyReadLines(lines, res.lines || [], level);
      setLines(out.lines);
      if (!customerPoNo && res.customer_po_number) setCustomerPoNo(res.customer_po_number);
      if (!customerPoDate && res.customer_po_date) setCustomerPoDate(res.customer_po_date);
      const parts = [`${out.matched} matched`, out.notFound ? `${out.notFound} not in PO Items` : "", out.qtyUnreadable ? `${out.qtyUnreadable} qty unreadable` : "", out.merged ? `${out.merged} merged` : ""].filter(Boolean);
      setReview({ lines: res.lines || [], summary: res.message || parts.join(" · "), source: res.source });
      if (out.merged) toast({ title: "Same item more than once", description: `${out.merged} line(s) merged — qty added.` });
      if (out.belowFloor) toast({ title: "Customer rate below floor", description: `${out.belowFloor} line(s) set to the floor price — check them.` });
    } catch (e: any) {
      setReview({ lines: [], summary: e.message || "The file could not be read — add items by hand" });
    } finally {
      setReading(false);
    }
  };
  const onCustomerPoFile = (f: File | null) => {
    setCustomerPoFile(f);
    setReview(null);
    // S3: offered automatically after choosing a readable file (asks first).
    if (f && !readFileError(f) && editable && window.confirm("Read the items from this customer PO now? You can check them before saving.")) readCustomerPo(f);
  };

  // Obsolete catalog -> the replacement item from the price list.
  const switchToReplacement = async (i: number) => {
    const code = lines[i].replaced_by;
    if (!code) return;
    try {
      const res: any = await purchaseOrderService.items({ search: code, active: "true", limit: 10 });
      const it = (res?.data || []).find((x: any) => String(x.item_code).toLowerCase() === code.toLowerCase());
      if (!it) throw new Error(`${code} is not in PO Items (upload the latest price list)`);
      setLines((prev) => prev.map((l, idx) => (idx === i ? { ...lineFromItem(it, level), qty: l.qty } : l)));
    } catch (err: any) {
      toast({ title: "Could not switch", description: err.message, variant: "destructive" });
    }
  };

  const updateLine = (i: number, patch: Partial<EditorLine>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const refresh = (saved?: any) => {
    queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    queryClient.invalidateQueries({ queryKey: ["purchase-order-stats"] });
    queryClient.invalidateQueries({ queryKey: ["purchase-order-approvals"] });
    queryClient.invalidateQueries({ queryKey: ["po-proformas"] });
    if (saved?._id) queryClient.invalidateQueries({ queryKey: ["purchase-order", String(saved._id)] });
  };

  const levelMutation = useMutation({
    mutationFn: (next: PriceLevel) => purchaseOrderService.setPriceLevel(customer, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["po-settings"] });
      toast({ title: "Price level saved", description: "Used for this customer's POs from now on." });
    },
    onError: (err: any) => toast({ title: "Could not change the price level", description: err.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async (submit: boolean) => {
      const payload = {
        type: "purchase",
        division,
        customer: customer || undefined,
        po_date: poDate,
        expected_date: expectedDate || undefined,
        tax_mode: taxMode,
        notes,
        items: lines.map((l) => ({ item_id: l.item_id, qty: l.qty, selling_price: l.selling_price, tax_rate: l.tax_rate })),
        customer_po_number: customerPoNo,
        customer_po_date: customerPoDate || null,
        submit,
      };
      const saved: any = isNew ? await purchaseOrderService.create(payload) : await purchaseOrderService.update(poId, payload);
      let fileError = "";
      if (customerPoFile && ATTACHABLE.test(customerPoFile.name)) {
        try {
          await purchaseOrderService.uploadCustomerPoFile(saved._id, customerPoFile);
        } catch (err: any) {
          fileError = err.message;
        }
      }
      return { ...saved, fileError };
    },
    onSuccess: (saved: any) => {
      refresh(saved);
      toast({ title: `${saved.po_number}`, description: saved.status === "pending_approval" ? "Sent to an approver — they say Yes or No." : "Saved as draft." });
      (saved.warnings || []).forEach((w: string) => toast({ title: "Please check", description: w }));
      if (saved.fileError) toast({ title: "PO saved, but the customer PO file was not attached", description: saved.fileError, variant: "destructive" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      const data = err?.response?.data || {};
      setShowErrors(true);
      setServerError({ field: data.field, message: err.message, existing: data.existing });
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    },
  });

  const decideMutation = useMutation({
    mutationFn: ({ yes }: { yes: boolean }) => (yes ? purchaseOrderService.approve(poId, "") : purchaseOrderService.reject(poId, rejectReason)),
    onSettled: () => { decidingRef.current = false; },
    onSuccess: (saved: any) => {
      refresh(saved);
      toast({ title: saved.po_number, description: saved.status === "approved" ? "Approved — the PDF and WhatsApp to Brady are now available." : "Sent back to draft." });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ title: "Could not save the decision", description: err.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ next, received }: { next: string; received?: { line_id: string; qty_received: string }[] }) =>
      purchaseOrderService.changeStatus(poId, next, undefined, received),
    onSuccess: (saved: any) => {
      refresh(saved);
      setRecvOpen(false);
      toast({ title: saved.po_number, description: `Marked ${PO_STATUS_LABEL[saved.status]}.` });
    },
    onError: (err: any) => toast({ title: "Could not change status", description: err.message, variant: "destructive" }),
  });

  // R5: "Create Proforma Invoice" — asks before making a second one.
  const proformaMutation = useMutation({
    mutationFn: async () => {
      try {
        return await purchaseOrderService.createProforma(poId);
      } catch (err: any) {
        if (err?.response?.data?.code === "proforma_exists" && window.confirm(err.message)) {
          return purchaseOrderService.createProforma(poId, true);
        }
        throw err;
      }
    },
    onSuccess: (pf: any) => {
      refresh({ _id: poId });
      toast({ title: `Proforma ${pf.number}`, description: "Made from this PO — check it and send it to the customer." });
      onOpenProforma?.(String(pf._id));
    },
    onError: (err: any) => {
      if (err?.response?.data?.code === "proforma_exists") return;
      toast({ title: "Could not make the proforma", description: err.message, variant: "destructive" });
    },
  });

  const buildPdf = async () => {
    const data: any = await purchaseOrderService.printData(poId);
    return buildPoPdf(data.po, data.company, { logoUrl: getSetting("compLogoLight") });
  };

  const downloadPdf = async () => {
    try {
      const doc = await buildPdf();
      doc.save(poFilename(po));
    } catch (err: any) {
      toast({ title: "Could not build the PDF", description: err.message, variant: "destructive" });
    }
  };

  const waMutation = useMutation({
    mutationFn: async () => {
      const doc = await buildPdf();
      return purchaseOrderService.sendWhatsApp(poId, doc.output("blob"), poFilename(po), waTo.trim() || undefined);
    },
    onSuccess: (saved: any) => {
      refresh(saved);
      const last = saved.whatsapp_log?.[saved.whatsapp_log.length - 1];
      toast({ title: "Sent on WhatsApp", description: last?.status === "simulated" ? "Test mode: the number isn't live, nothing was really sent." : `PDF sent to ${last?.to}.` });
      setWaOpen(false);
    },
    onError: (err: any) => {
      refresh({ _id: poId });
      setWaError(err.message || "WhatsApp send failed");
    },
  });

  const openWhatsApp = () => {
    setWaTo(po?.supplier?.whatsapp || po?.supplier?.phone || "");
    setWaError("");
    setWaOpen(true);
  };

  const sendable = !isOldSales && SENDABLE.includes(status);
  const linkedPurchase = po?.linked_purchase_po && typeof po.linked_purchase_po === "object" ? po.linked_purchase_po : null;
  const sourceSales = po?.source_sales_po && typeof po.source_sales_po === "object" ? po.source_sales_po : null;
  const proformas: any[] = po?.proformas || [];
  const canProforma = sendable && !!po?.customer_snapshot?.name && (can(PO_MODULE, "Create") || can(PO_MODULE, "Edit"));
  const showReceived = ["partially_received", "received"].includes(status);

  const openReceived = () => {
    setRecvQty(Object.fromEntries((po?.items || []).map((l: any) => [String(l._id), String(l.qty_received || 0)])));
    setRecvOpen(true);
  };
  const recvError = (po?.items || []).some((l: any) => {
    const text = String(recvQty[String(l._id)] ?? "").trim();
    const n = Number(text);
    return text === "" || !Number.isFinite(n) || n < 0 || n > l.qty;
  });
  const decide = (yes: boolean) => {
    if (decidingRef.current) return;
    decidingRef.current = true;
    decideMutation.mutate({ yes });
  };
  const title = isNew ? "New Purchase PO" : `${isOldSales ? "Sales PO (old)" : "Purchase PO"} ${po?.po_number || ""}`;
  const attention = calc.lines.flatMap((l, i) => l.breaches.map((b) => `Line ${i + 1} (${l.item_code || l.name}): ${b}`));
  const floorLabel = level === "distributor" ? "Floor (DP)" : "Floor (EP)";
  // S4: the header fields' messages (same text as the server).
  const fileChosenOrKept = !!(customerPoFile && ATTACHABLE.test(customerPoFile.name)) || !!po?.customer_po_file?.url;
  const fieldErrors: Record<string, string> = {
    customer: customer ? "" : "Customer is required",
    po_date: poDate ? "" : "PO date is required",
    expected_date: expectedDateError(poDate, expectedDate),
    customer_po_number: customerPoNoError(customerPoNo, { required: fileChosenOrKept }),
    customer_po_date: customerPoDateError(poDate, customerPoDate),
    items: lines.length ? "" : "Add at least one item",
  };
  const fieldError = (k: string) => (serverError?.field === k ? serverError.message : showErrors ? fieldErrors[k] : "");
  const formInvalid = Object.values(fieldErrors).some(Boolean);
  const trySave = (submit: boolean) => {
    setServerError(null);
    if (formInvalid || calc.hasErrors || customerPoFileError(customerPoFile)) {
      setShowErrors(true);
      toast({ title: "Please fix the marked fields", description: Object.values(fieldErrors).filter(Boolean)[0] || "Check the item lines.", variant: "destructive" });
      return;
    }
    saveMutation.mutate(submit);
  };

  const requestClose = () => {
    if (editable && !needBaseline && formSignature !== baselineRef.current && !window.confirm("Close without saving? Your changes to this PO will be lost.")) return;
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : requestClose())}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto grid-cols-1">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 flex-wrap">
              {title}
              {!isNew && po && <Badge variant="outline" className={PO_STATUS_CLASS[status]}>{PO_STATUS_LABEL[status]}</Badge>}
              {!isNew && po && <span className="text-xs font-normal text-muted-foreground">{divisionName(po.division)}</span>}
              {proformas.map((p) => (
                <Button key={p._id} type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" aria-label={`Open proforma ${p.number}`}
                  onClick={() => onOpenProforma?.(String(p._id))}>
                  <FileText className="h-3 w-3" /> Proforma {p.number} · {p.status}
                </Button>
              ))}
              {linkedPurchase && (
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onOpenPo?.(String(linkedPurchase._id))}>
                  <Link2 className="h-3 w-3" /> Brady PO {linkedPurchase.po_number}
                </Button>
              )}
              {sourceSales && (
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onOpenPo?.(String(sourceSales._id))}>
                  <Link2 className="h-3 w-3" /> From Sales PO {sourceSales.po_number}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {!isNew && isLoading ? (
            <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-5 min-w-0">
              {isOldSales && (
                <div className="rounded-md border border-slate-300 bg-slate-50 p-3 text-sm flex gap-2">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" /> Old Sales PO — read-only. Sales PO was removed; new orders are Purchase POs with the customer on them.
                </div>
              )}
              {/* Header fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {isNew && activeDivisions.length > 1 && (
                  <div className="space-y-1.5">
                    <Label>Division</Label>
                    <Select value={division} onValueChange={setDivision}>
                      <SelectTrigger><SelectValue placeholder="Choose division" /></SelectTrigger>
                      <SelectContent>
                        {activeDivisions.map((d: any) => <SelectItem key={d.key} value={d.key}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5 min-w-0">
                  <Label>Customer (end user) *</Label>
                  {editable ? (
                    <div className="flex gap-2">
                      <SearchableSelect className="flex-1" options={customerOptions} value={customer} onValueChange={(v) => setCustomer(v)} placeholder="Choose customer" />
                      {customer && (
                        <Button variant="ghost" size="icon" onClick={() => setCustomer("")} title="Clear customer"><XCircle className="h-4 w-4" /></Button>
                      )}
                    </div>
                  ) : (
                    <div className="h-10 flex items-center text-sm font-medium">{po?.customer_snapshot?.name || "No customer (old stock PO)"}</div>
                  )}
                  {editable && fieldError("customer") && <p className="text-[11px] text-red-700" data-testid="err-customer">{fieldError("customer")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="po-price-level">Price level (selling-price floor)</Label>
                  {editable && customer && canSetLevel ? (
                    <Select value={level} onValueChange={(v) => levelMutation.mutate(v as PriceLevel)}>
                      <SelectTrigger id="po-price-level"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="end_user">End user — floor = End User Price</SelectItem>
                        <SelectItem value="distributor">Distributor — floor = Distributor Price</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="h-10 flex items-center text-sm">{PRICE_LEVEL_LABEL[level]}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="po-date">PO date *</Label>
                  <Input id="po-date" type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} disabled={!editable} />
                  {editable && fieldError("po_date") && <p className="text-[11px] text-red-700">{fieldError("po_date")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="po-expected-date">Expected delivery</Label>
                  <Input id="po-expected-date" type="date" value={expectedDate} min={poDate || undefined} onChange={(e) => setExpectedDate(e.target.value)} disabled={!editable} />
                  {editable && fieldError("expected_date") && <p className="text-[11px] text-red-700">{fieldError("expected_date")}</p>}
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

              {/* The customer's own PO */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-md border p-3">
                <div className="space-y-1.5 min-w-0">
                  <Label htmlFor="po-customer-po-no">Customer PO No.{fileChosenOrKept ? " *" : ""}</Label>
                  {editable ? (
                    <Input id="po-customer-po-no" maxLength={60} placeholder="e.g. their PO number" value={customerPoNo} aria-invalid={!!fieldError("customer_po_number")}
                      onChange={(e) => { setCustomerPoNo(e.target.value); if (serverError?.field === "customer_po_number") setServerError(null); }} />
                  ) : (
                    <div className="h-10 flex items-center text-sm font-medium break-all">{po?.customer_po_number || "—"}</div>
                  )}
                  {editable && (fieldError("customer_po_number") || (customerPoNo && customerPoNoError(customerPoNo))) && (
                    <p className="text-[11px] text-red-700" data-testid="err-customer-po-number">{fieldError("customer_po_number") || customerPoNoError(customerPoNo)}</p>
                  )}
                  {editable && serverError?.field === "customer_po_number" && (serverError.existing || []).map((x) => (
                    <button key={x._id} type="button" className="text-[11px] text-primary underline mr-2" onClick={() => onOpenPo?.(x._id)}>Open {x.po_number}</button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="po-customer-po-date">Customer PO date</Label>
                  <Input id="po-customer-po-date" type="date" value={customerPoDate} max={poDate || undefined} disabled={!editable} onChange={(e) => setCustomerPoDate(e.target.value)} />
                  {editable && fieldError("customer_po_date") && <p className="text-[11px] text-red-700">{fieldError("customer_po_date")}</p>}
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label htmlFor="po-customer-po-file">Customer PO file (PDF / JPG / PNG, or Excel to read items; max 10 MB)</Label>
                  {editable && (
                    <Input id="po-customer-po-file" type="file" accept={CUSTOMER_PO_ACCEPT} className="cursor-pointer" onChange={(e) => onCustomerPoFile(e.target.files?.[0] || null)} />
                  )}
                  {customerPoFileError(customerPoFile) && <p className="text-[11px] text-red-700">{customerPoFileError(customerPoFile)}</p>}
                  {customerPoFile && /\.xlsx$/i.test(customerPoFile.name) && <p className="text-[11px] text-muted-foreground">Excel files are read for items; only a PDF / JPG / PNG is kept on the PO.</p>}
                  {editable && customerPoFile && (
                    <Button type="button" variant="outline" size="sm" className="gap-2 mt-1" disabled={reading} onClick={() => readCustomerPo()}>
                      {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />} Read items from the customer PO
                    </Button>
                  )}
                  {po?.customer_po_file?.url ? (
                    <a href={resolveImageUrl(po.customer_po_file.url)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline break-all inline-flex items-center gap-1">
                      <Paperclip className="h-3 w-3 shrink-0" /> {po.customer_po_file.name || "Customer PO"}
                    </a>
                  ) : (!editable && <div className="text-sm text-muted-foreground">No file attached</div>)}
                </div>
              </div>

              {review && (
                <div className="rounded-md border p-3 space-y-2" data-testid="po-read-review">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold flex items-center gap-2"><FileSearch className="h-4 w-4" /> Read from the customer PO</div>
                    <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setReview(null)}>Hide</button>
                  </div>
                  <p className="text-xs text-muted-foreground">{review.summary}. Nothing is saved until you press Save draft or Submit for approval.</p>
                  {review.lines.length > 0 && (
                    <ul className="space-y-1 text-xs">
                      {review.lines.map((l, i) => {
                        const cls = l.status === "matched" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : l.status === "qty_unreadable" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-900";
                        const label = l.status === "matched" ? "Matched" : l.status === "qty_unreadable" ? "Qty unreadable — type it on the line" : "Not in PO Items";
                        return (
                          <li key={i} className={`rounded border px-2 py-1 ${cls}`} data-status={l.status}>
                            <span className="font-semibold">{label}</span>
                            {l.item_code ? <> · {l.item_code}</> : l.catalog ? <> · {l.catalog}</> : null}
                            {l.qty ? <> · qty {l.qty}</> : null}
                            {l.rate !== null && l.rate !== undefined ? <> · rate {formatInr(l.rate)}</> : null}
                            {l.note ? <> · {l.note}</> : null}
                            <div className="text-[10px] opacity-80 break-all">{l.text}</div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              <div className="text-sm rounded-md border bg-slate-50 px-3 py-2">
                Supplier: <span className="font-semibold">{(isNew ? settings?.supplier?.name : po?.supplier?.name) || "—"}</span>
                <span className="text-muted-foreground"> (fixed — change it in PO Settings)</span>
              </div>

              {/* Lines — margin columns are the LAST columns (R6). The table scrolls sideways on small screens. */}
              <div className="rounded-md border overflow-x-auto" data-testid="po-items-table">
                <Table className="min-w-[1080px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Item</TableHead>
                      <TableHead className="min-w-[90px] text-right">Qty *</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Cost (MDP)</TableHead>
                      <TableHead className="text-right whitespace-nowrap">{floorLabel}</TableHead>
                      <TableHead className="min-w-[130px] text-right whitespace-nowrap">Selling price *</TableHead>
                      <TableHead className="min-w-[90px] text-right">GST %</TableHead>
                      <TableHead className="text-right whitespace-nowrap">PO amount</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Margin %</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Margin ₹</TableHead>
                      {editable && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calc.lines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">No items yet. Add items from the PO items.</TableCell>
                      </TableRow>
                    ) : (
                      calc.lines.map((l, i) => (
                        <TableRow key={l.item_id || i} className={l.errors.length ? "bg-red-50/60" : ""}>
                          <TableCell>
                            <div className="font-medium text-sm">{l.item_code || l.name}{l.y_code ? <span className="text-muted-foreground font-normal"> · {l.y_code}</span> : null}</div>
                            <div className="text-[11px] text-muted-foreground">{[l.item_code && l.name !== l.item_code ? l.name : "", l.hsn && `HSN ${l.hsn}`].filter(Boolean).join(" · ")}</div>
                            {showReceived && po?.items?.[i] && <div className="text-[11px] text-indigo-700">Received {po.items[i].qty_received || 0} of {po.items[i].qty}</div>}
                            {lines[i]?.replaced_by && editable && (
                              <div className="text-[11px] text-amber-700 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Obsolete — replaced by {lines[i].replaced_by}
                                <button type="button" className="underline" onClick={() => switchToReplacement(i)}>Use {lines[i].replaced_by}</button>
                              </div>
                            )}
                            {lines[i]?.note && <div className="text-[11px] text-amber-700">{lines[i].note}</div>}
                            {l.errors.map((e) => (
                              <div key={e} className="text-[11px] text-red-700 font-medium flex items-center gap-1"><XCircle className="h-3 w-3" /> {e}</div>
                            ))}
                          </TableCell>
                          <TableCell className="text-right px-2">
                            {editable ? (
                              <Input type="number" min={1} max={100000} step={1} className={NUM_INPUT} aria-label={`Quantity for ${l.item_code || l.name}`} value={lines[i].qty}
                                onChange={(e) => updateLine(i, { qty: e.target.value as any })} />
                            ) : l.qty}
                          </TableCell>
                          <TableCell className="text-right text-sm whitespace-nowrap" title={`On the PO to Brady: ${formatInr(l.rate)} (whole rupees)`}>
                            {/* S5: 2 decimals on screen so cost + margin add up; the PO PDF keeps whole rupees. */}
                            {formatInr(l.cost_price)}
                            {l.cost_source && l.cost_source !== "mdp" && (
                              <div className={`text-[10px] ${l.cost_source === "dp" ? "text-amber-700" : "text-muted-foreground"}`}>{COST_SOURCE_LABEL[l.cost_source]}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm whitespace-nowrap">{l.list_price > 0 ? formatInr(l.list_price) : "—"}</TableCell>
                          <TableCell className="text-right px-2">
                            {editable ? (
                              <>
                                <Input type="number" step="0.01" className={NUM_INPUT} min={l.list_price > 0 ? l.list_price : 0}
                                  aria-label={`Selling price for ${l.item_code || l.name}`} aria-invalid={l.errors.length > 0}
                                  value={lines[i].selling_price} onChange={(e) => updateLine(i, { selling_price: e.target.value as any })} />
                                {l.list_price > 0 && l.selling_price > l.list_price && (
                                  <div className="text-[10px] text-amber-700 mt-0.5">raised from {l.list_price}</div>
                                )}
                              </>
                            ) : (
                              <span className="text-sm">
                                {formatInr(l.selling_price)}
                                {l.list_price > 0 && l.selling_price > l.list_price && <span className="block text-[10px] text-amber-700">raised</span>}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right px-2">
                            {editable ? (
                              <Input type="number" min={0} className={NUM_INPUT} aria-label={`GST % for ${l.item_code || l.name}`} value={lines[i].tax_rate}
                                onChange={(e) => updateLine(i, { tax_rate: e.target.value as any })} />
                            ) : `${l.tax_rate}%`}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium whitespace-nowrap">{formatInr(l.amount)}</TableCell>
                          <TableCell className={`text-right text-sm font-semibold ${marginClass(l.margin_pct, rule?.min_margin_pct)}`}>
                            {l.margin_pct === null ? "—" : `${l.margin_pct}%`}
                          </TableCell>
                          <TableCell className={`text-right text-sm font-semibold whitespace-nowrap ${marginClass(l.margin_pct, rule?.min_margin_pct)}`}>
                            {l.margin_amount === null ? "—" : formatInr(l.margin_amount)}
                          </TableCell>
                          {editable && (
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Remove ${l.item_code || l.name}`} onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}>
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {calc.lines.length > 0 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={6} className="text-right text-sm font-semibold">Total</TableCell>
                        <TableCell className="text-right text-sm font-bold whitespace-nowrap">{formatInr(calc.totals.subtotal)}</TableCell>
                        <TableCell className={`text-right text-sm font-bold ${marginClass(calc.totals.margin_pct, rule?.min_margin_pct)}`} data-testid="po-total-margin-pct">
                          {calc.totals.margin_pct === null ? "—" : `${calc.totals.margin_pct}%`}
                        </TableCell>
                        <TableCell className={`text-right text-sm font-bold whitespace-nowrap ${marginClass(calc.totals.margin_pct, rule?.min_margin_pct)}`} data-testid="po-total-margin-amount">
                          {calc.totals.margin_amount === null ? "—" : formatInr(calc.totals.margin_amount)}
                        </TableCell>
                        {editable && <TableCell />}
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>
              {editable && <ItemPicker onPick={addItem} disabled={!rule} onPoIds={new Set(lines.map((l) => String(l.item_id)))} />}
              {editable && fieldError("items") && <p className="text-[11px] text-red-700">{fieldError("items")}</p>}
              <p className="text-[11px] text-muted-foreground">
                The PO to Brady prints the cost (Master Distributor Price, whole rupees). The selling price can only go up from the floor; the margin columns are for you only — never printed or sent.
              </p>

              {/* Totals + approval notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 min-w-0">
                  {editable && calc.lines.length > 0 && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 space-y-1">
                      <div className="flex gap-2"><Info className="h-4 w-4 mt-0.5 shrink-0" /> Every PO goes to an approver, who says Yes or No.</div>
                      {attention.length > 0 && (
                        <div className="text-xs text-amber-800">
                          The approver will see: {attention.map((a) => <div key={a}>• {a}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                  {!isNew && po?.approval?.reasons?.length > 0 && status !== "draft" && (
                    <div className="rounded-md border bg-slate-50 p-3 text-xs space-y-1">
                      <div className="font-semibold">Points for the approver</div>
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
                      Approved{po.approval.decided_by ? ` by ${personName(po.approval.decided_by)}` : " automatically (old rule)"}
                      {po.approval.decided_at ? ` on ${new Date(po.approval.decided_at).toLocaleString("en-IN")}` : ""}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Notes (printed in the terms box of the PO)</Label>
                    <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!editable} />
                  </div>
                </div>
                <div className="rounded-md border p-4 space-y-1.5 text-sm h-fit min-w-0">
                  <div className="flex justify-between"><span>Taxable subtotal</span><span>{formatInr(calc.totals.subtotal)}</span></div>
                  <div className="flex justify-between"><span>GST amount</span><span>{formatInr(calc.totals.tax_total)}</span></div>
                  <div className="flex justify-between font-bold text-base border-t pt-2"><span>Grand total (to Brady)</span><span>{formatInr(calc.totals.grand_total)}</span></div>
                  <div className="flex justify-between pt-2 border-t text-xs text-muted-foreground"><span>Customer value (selling)</span><span>{formatInr(calc.totals.sell_value)}</span></div>
                  {rule && (
                    <div className="text-[11px] text-muted-foreground" data-testid="po-rule-line">
                      {rule.min_margin_pct === null || rule.min_margin_pct === undefined || rule.min_margin_pct === ""
                        ? "Rule: price only up; no minimum margin is set (PO Settings)."
                        : `Rule: price only up; a margin below ${rule.min_margin_pct}% is pointed out to the approver.`}
                    </div>
                  )}
                </div>
              </div>

              {/* Approver decision */}
              {!isNew && status === "pending_approval" && canApprove && !isOldSales && (
                <div className="rounded-md border border-amber-300 p-4 space-y-3">
                  <div className="font-semibold text-sm">Your decision{String(po?.created_by?._id || po?.created_by) === String(user?._id) ? " (you made this PO)" : ""}</div>
                  {showReject && <Textarea rows={2} placeholder="Reason for No (the maker sees this)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />}
                  <div className="flex gap-2">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" disabled={decideMutation.isPending} onClick={() => decide(true)}>
                      <CheckCircle2 className="h-4 w-4" /> Yes, approve
                    </Button>
                    {showReject ? (
                      <Button variant="destructive" disabled={!rejectReason.trim() || decideMutation.isPending} onClick={() => decide(false)}>Send back with reason</Button>
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
                        {HISTORY_LABEL[h.action] || h.action.replace("status:", "marked ").replace(/_/g, " ")}
                        {h.note ? ` — ${h.note}` : ""}
                      </div>
                    ))}
                  </div>
                  <div className="rounded-md border p-3 space-y-1 max-h-48 overflow-y-auto">
                    <div className="font-semibold text-sm mb-1">WhatsApp sends</div>
                    {(po.whatsapp_log || []).length === 0 && <div className="text-muted-foreground">Not sent yet.</div>}
                    {[...(po.whatsapp_log || [])].reverse().map((w: any, i: number) => (
                      <div key={i}>
                        <span className="text-muted-foreground">{new Date(w.at).toLocaleString("en-IN")}</span> to {w.to} ({w.method}) —{" "}
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
              {/* R4: PDF / WhatsApp / proforma only after the approver's Yes. */}
              {sendable && (
                <Button variant="outline" className="gap-2" onClick={downloadPdf}><Download className="h-4 w-4" /> Download PDF</Button>
              )}
              {sendable && can(PO_MODULE, "Edit") && (
                <Button variant="outline" className="gap-2 text-emerald-700" onClick={openWhatsApp}><MessageCircle className="h-4 w-4" /> Send on WhatsApp</Button>
              )}
              {canProforma && (
                <Button variant="outline" className="gap-2" disabled={proformaMutation.isPending} onClick={() => proformaMutation.mutate()}>
                  {proformaMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Create Proforma Invoice
                </Button>
              )}
              {!isNew && po && !isOldSales && can(PO_MODULE, "Edit") && (PO_STATUS_MOVES[status] || []).length > 0 && (
                <Select value="" onValueChange={(v) => {
                  if (v === "cancelled" && !window.confirm(`Cancel ${po.po_number}?`)) return;
                  if (v === "partially_received") return openReceived();
                  statusMutation.mutate({ next: v });
                }}>
                  <SelectTrigger className="w-[190px]"><SelectValue placeholder="Change status..." /></SelectTrigger>
                  <SelectContent>
                    {PO_STATUS_MOVES[status].map((s) => (
                      <SelectItem key={s} value={s}>{s === "sent" ? "Sent to supplier" : s === status ? "Record another delivery" : PO_STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={requestClose}>Close</Button>
              {mayEdit && !editable && (
                <Button variant="outline" className="gap-2" onClick={() => setUnlocked(true)}><Pencil className="h-4 w-4" /> Edit</Button>
              )}
              {editable && (
                <>
                  <Button variant="outline" disabled={saveMutation.isPending} onClick={() => trySave(false)}>
                    Save draft
                  </Button>
                  <Button className="gap-2" disabled={saveMutation.isPending} onClick={() => trySave(true)}>
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Submit for approval
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={recvOpen} onOpenChange={setRecvOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Received so far — {po?.po_number}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-xs text-muted-foreground">Enter the total quantity received for each item up to now.</p>
            {(po?.items || []).map((l: any) => (
              <div key={l._id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">{l.item_code || l.name}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <Input type="number" min={0} max={l.qty} step="any" className={`${NUM_INPUT} w-24`} aria-label={`Received quantity for ${l.name}`}
                    value={recvQty[String(l._id)] ?? ""} onChange={(e) => setRecvQty((p) => ({ ...p, [String(l._id)]: e.target.value }))} />
                  <span className="text-xs text-muted-foreground">of {l.qty}</span>
                </span>
              </div>
            ))}
            {recvError && <p className="text-xs text-red-700">Each quantity must be from 0 up to the ordered quantity.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecvOpen(false)}>Cancel</Button>
            <Button disabled={recvError || statusMutation.isPending}
              onClick={() => statusMutation.mutate({ next: "partially_received", received: Object.entries(recvQty).map(([line_id, qty_received]) => ({ line_id, qty_received })) })}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={waOpen} onOpenChange={(o) => { setWaOpen(o); if (!o) setWaError(""); }}>
        <DialogContent className="max-w-md" onEscapeKeyDown={() => setWaOpen(false)}>
          <DialogHeader><DialogTitle>Send {po?.po_number} to Brady on WhatsApp</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-1.5">
              <Label>WhatsApp number</Label>
              <Input value={waTo} onChange={(e) => setWaTo(e.target.value)} placeholder="10-digit mobile or with country code" />
            </div>
            <p className="text-xs text-muted-foreground">The PO PDF goes directly if this number messaged you in the last 24 hours; otherwise the WhatsApp template set in PO Settings is used.</p>
            {!settings?.whatsapp?.template_name && <p className="text-xs text-amber-700">No template is set yet, so only numbers that messaged you in the last 24 hours can receive it.</p>}
            {waError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">WhatsApp send failed: {waError}</p>}
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

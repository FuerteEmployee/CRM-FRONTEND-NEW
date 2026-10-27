import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Ban, Download, Link2, Loader2, MessageCircle, Plus, Save, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useSettings } from "@/context/SettingsContext";
import { purchaseOrderService } from "@/api/services/purchaseOrder.service";
import { PO_MODULE } from "@/lib/purchaseOrders";
import { formatInr } from "./poCalc";
import { amountError, amountInWords, computeProforma, TAX_TYPE_LABEL, type ProformaLine, type TaxType } from "./proformaCalc";
import { buildProformaPdf, proformaFilename } from "./proformaPdf";
import { customerPoNoError, emailError, gstinError, hsnError, phoneError, quantityError } from "./poValidation";

// R5: Proforma Invoice editor — made from an approved PO for its customer.
// Draft: Disc % / GST % per line, freight / packing lines, tax type (IGST or
// CGST + SGST/UTGST), advance received, valid-until, bill-to details. Sent
// (on WhatsApp) or cancelled = read-only. The PDF uses the client's proforma
// layout (F3); the amount in words always follows the real grand total.

// readOnly (round 29, S2): opened with the eye icon — nothing editable until "Edit" is pressed.
type Props = { open: boolean; onOpenChange: (o: boolean) => void; proformaId?: string | null; onOpenPo?: (id: string) => void; readOnly?: boolean };

const NUM = "h-8 w-full min-w-[70px] px-2 text-right";
const dateStr = (d?: string) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const STATUS_CLASS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};
const PARTY = [["name", "Name *"], ["address", "Address"], ["gstin", "GSTIN"], ["state", "State"], ["email", "Email"], ["phone", "Phone"], ["whatsapp", "WhatsApp"]] as const;
// S4: the same checks as the server, shown under each Bill-to field.
const partyError = (k: string, v: string) =>
  k === "name" ? (String(v || "").trim() ? "" : "The customer name is required")
  : k === "gstin" ? gstinError(v, { label: "Bill to GSTIN" })
  : k === "email" ? emailError(v, { label: "Bill to email" })
  : k === "phone" ? phoneError(v, { label: "Bill to phone" })
  : k === "whatsapp" ? phoneError(v, { label: "Bill to WhatsApp" })
  : "";

export const ProformaEditorDialog = ({ open, onOpenChange, proformaId, onOpenPo, readOnly }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can, user } = usePermissions();
  const { getSetting } = useSettings();
  const { data: pf, isLoading } = useQuery<any>({
    queryKey: ["po-proforma", proformaId],
    queryFn: () => purchaseOrderService.getProforma(proformaId),
    enabled: open && !!proformaId,
  });

  const [form, setForm] = useState<any>(null);
  const [lines, setLines] = useState<(ProformaLine & { _id?: string })[]>([]);
  const [waOpen, setWaOpen] = useState(false);
  const [waTo, setWaTo] = useState("");
  // S5: a failed send shows its error inside the WhatsApp dialog (a toast on top
  // of the dialog took the Escape key / X click away from it).
  const [waError, setWaError] = useState("");
  // "Edit" pressed in a read-only (eye) view.
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => { if (open) setUnlocked(false); }, [open, proformaId]);

  useEffect(() => {
    if (!pf) return;
    setForm({
      date: dateStr(pf.date),
      valid_until: dateStr(pf.valid_until),
      tax_type: pf.tax_type,
      customer_po_number: pf.customer_po_number || "",
      customer_po_date: dateStr(pf.customer_po_date),
      bill_to: { ...(pf.bill_to || {}) },
      advance: String(pf.totals?.advance ?? 0),
      notes: pf.notes || "",
    });
    setLines((pf.lines || []).map((l: any) => ({ ...l, disc_pct: String(l.disc_pct ?? 0), gst_pct: String(l.gst_pct ?? 18), qty: l.is_extra ? String(l.qty) : l.qty, rate: l.is_extra ? String(l.rate) : l.rate })));
  }, [pf]);

  const own = String(pf?.created_by?._id || pf?.created_by) === String(user?._id) && can(PO_MODULE, "Create");
  const mayEdit = !!pf && pf.status === "draft" && (can(PO_MODULE, "Edit") || own);
  const editable = mayEdit && (!readOnly || unlocked);
  const calc = useMemo(() => computeProforma(lines, (form?.tax_type || "igst") as TaxType, form?.advance || 0), [lines, form?.tax_type, form?.advance]);

  const lineErrors = lines.map((l) => [
    amountError(l.disc_pct, "Disc %", 100),
    amountError(l.gst_pct, "GST %", 100),
    l.is_extra ? amountError(l.rate, "Rate") : null,
    l.is_extra ? quantityError(l.qty) || null : null,
    l.is_extra && !String(l.description || "").trim() ? "Describe the charge" : null,
    l.is_extra ? hsnError(l.hsn) || null : null,
  ].filter(Boolean) as string[]);
  const billErrors: Record<string, string> = Object.fromEntries(PARTY.map(([k]) => [k, form ? partyError(k, form.bill_to?.[k] || "") : ""]));
  const customerPoError = form ? customerPoNoError(form.customer_po_number) : "";
  const advanceError = form ? amountError(form.advance, "Advance received") || (Number(form.advance) > calc.totals.grand_total ? "Advance can't be more than the grand total" : null) : null;
  const hasErrors = lineErrors.some((e) => e.length) || !!advanceError || Object.values(billErrors).some(Boolean) || !!customerPoError;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["po-proforma", proformaId] });
    queryClient.invalidateQueries({ queryKey: ["po-proformas"] });
    if (pf?.po?._id) queryClient.invalidateQueries({ queryKey: ["purchase-order", String(pf.po._id)] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      purchaseOrderService.updateProforma(proformaId, {
        date: form.date,
        valid_until: form.valid_until || null,
        tax_type: form.tax_type,
        customer_po_number: form.customer_po_number,
        customer_po_date: form.customer_po_date || null,
        bill_to: form.bill_to,
        advance: form.advance,
        notes: form.notes,
        lines: lines.map((l) => (l.is_extra
          ? { is_extra: true, ref_no: l.ref_no, description: l.description, hsn: l.hsn, qty: l.qty, unit: l.unit, rate: l.rate, disc_pct: l.disc_pct, gst_pct: l.gst_pct }
          : { _id: l._id, disc_pct: l.disc_pct, gst_pct: l.gst_pct })),
      }),
    onSuccess: () => {
      refresh();
      toast({ title: `Proforma ${pf.number} saved` });
    },
    onError: (err: any) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => purchaseOrderService.cancelProforma(proformaId),
    onSuccess: () => { refresh(); toast({ title: `Proforma ${pf.number} cancelled` }); },
    onError: (err: any) => toast({ title: "Could not cancel", description: err.message, variant: "destructive" }),
  });

  const buildPdf = async () => {
    const data: any = await purchaseOrderService.proformaPrint(proformaId);
    return buildProformaPdf(data.proforma, { logoUrl: getSetting("compLogoLight") });
  };
  const download = async () => {
    try {
      (await buildPdf()).save(proformaFilename(pf));
    } catch (err: any) {
      toast({ title: "Could not build the PDF", description: err.message, variant: "destructive" });
    }
  };
  const waMutation = useMutation({
    mutationFn: async () => {
      const doc = await buildPdf();
      return purchaseOrderService.sendProformaWhatsApp(proformaId, doc.output("blob"), proformaFilename(pf), waTo.trim() || undefined);
    },
    onSuccess: (saved: any) => {
      refresh();
      const last = saved.whatsapp_log?.[saved.whatsapp_log.length - 1];
      toast({ title: "Sent on WhatsApp", description: last?.status === "simulated" ? "Test mode: nothing was really sent." : `Proforma sent to ${last?.to}.` });
      setWaOpen(false);
    },
    onError: (err: any) => { refresh(); setWaError(err.message || "WhatsApp send failed"); },
  });

  const setBill = (k: string, v: string) => setForm((f: any) => ({ ...f, bill_to: { ...f.bill_to, [k]: v } }));
  const updateLine = (i: number, patch: any) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const dirtyWarning = editable && pf && JSON.stringify(calc.totals.grand_total) !== JSON.stringify(pf.totals?.grand_total);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto grid-cols-1">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 flex-wrap">
              Proforma Invoice {pf?.number || ""}
              {pf && <Badge variant="outline" className={STATUS_CLASS[pf.status]}>{pf.status}</Badge>}
              {pf?.po && (
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" aria-label={`Open PO ${pf.po.po_number}`} onClick={() => onOpenPo?.(String(pf.po._id))}>
                  <Link2 className="h-3 w-3" /> PO {pf.po.po_number}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {isLoading || !form ? (
            <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-5 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.date} disabled={!editable} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Valid until</Label><Input type="date" value={form.valid_until} disabled={!editable} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label htmlFor="pf-tax-type">Tax type</Label>
                  <Select value={form.tax_type} disabled={!editable} onValueChange={(v) => setForm({ ...form, tax_type: v })}>
                    <SelectTrigger id="pf-tax-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="igst">{TAX_TYPE_LABEL.igst}</SelectItem>
                      <SelectItem value="cgst_sgst">{TAX_TYPE_LABEL.cgst_sgst}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pf-customer-po">Customer PO</Label>
                  <Input id="pf-customer-po" maxLength={60} value={form.customer_po_number} disabled={!editable} aria-invalid={!!customerPoError} onChange={(e) => setForm({ ...form, customer_po_number: e.target.value })} />
                  {editable && customerPoError && <p className="text-[11px] text-red-700">{customerPoError}</p>}
                </div>
                <div className="space-y-1.5"><Label>Customer PO date</Label><Input type="date" value={form.customer_po_date} disabled={!editable} onChange={(e) => setForm({ ...form, customer_po_date: e.target.value })} /></div>
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <div className="font-semibold text-sm">Bill to</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {PARTY.map(([k, label]) => (
                    <div key={k} className={`space-y-1 ${k === "address" ? "sm:col-span-2" : ""}`}>
                      <Label className="text-xs" htmlFor={`pf-bill-${k}`}>{label}</Label>
                      <Input id={`pf-bill-${k}`} value={form.bill_to?.[k] || ""} disabled={!editable} aria-invalid={!!billErrors[k]} onChange={(e) => setBill(k, e.target.value)} />
                      {editable && billErrors[k] && <p className="text-[11px] text-red-700">{billErrors[k]}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>REF No.</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>HSN/SAC</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right min-w-[80px]">Disc %</TableHead>
                      <TableHead className="text-right">Taxable</TableHead>
                      <TableHead className="text-right min-w-[80px]">GST %</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {editable && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calc.lines.map((l, i) => (
                      <TableRow key={l._id || `x${i}`} className={lineErrors[i].length ? "bg-red-50/60" : ""}>
                        <TableCell className="font-mono text-xs">
                          {l.is_extra && editable ? <Input className="h-8" value={lines[i].ref_no || ""} onChange={(e) => updateLine(i, { ref_no: e.target.value })} /> : l.ref_no}
                        </TableCell>
                        <TableCell className="text-sm">
                          {l.is_extra && editable ? <Input className="h-8 min-w-[160px]" aria-label="Charge description" value={lines[i].description || ""} onChange={(e) => updateLine(i, { description: e.target.value })} /> : l.description}
                          {lineErrors[i].map((e) => <div key={e} className="text-[11px] text-red-700">{e}</div>)}
                        </TableCell>
                        <TableCell className="text-xs">{l.is_extra && editable ? <Input className="h-8 w-24" value={lines[i].hsn || ""} onChange={(e) => updateLine(i, { hsn: e.target.value })} /> : l.hsn}</TableCell>
                        <TableCell className="text-right">{l.is_extra && editable ? <Input type="number" className={NUM} value={lines[i].qty} onChange={(e) => updateLine(i, { qty: e.target.value })} /> : l.qty}</TableCell>
                        <TableCell className="text-xs">{l.unit}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{l.is_extra && editable ? <Input type="number" className={NUM} aria-label="Charge rate" value={lines[i].rate} onChange={(e) => updateLine(i, { rate: e.target.value })} /> : formatInr(Number(l.rate))}</TableCell>
                        <TableCell className="text-right">{editable ? <Input type="number" className={NUM} aria-label={`Disc % line ${i + 1}`} value={lines[i].disc_pct} onChange={(e) => updateLine(i, { disc_pct: e.target.value })} /> : `${l.disc_pct}%`}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{formatInr(l.taxable)}</TableCell>
                        <TableCell className="text-right">{editable ? <Input type="number" className={NUM} aria-label={`GST % line ${i + 1}`} value={lines[i].gst_pct} onChange={(e) => updateLine(i, { gst_pct: e.target.value })} /> : `${l.gst_pct}%`}</TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">{formatInr(l.total)}</TableCell>
                        {editable && (
                          <TableCell>
                            {l.is_extra && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Remove charge" onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}>
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {editable && (
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setLines((p) => [...p, { is_extra: true, ref_no: "", description: "Freight / packing", hsn: "", qty: "1", unit: "", rate: "0", disc_pct: "0", gst_pct: "18" }])}>
                  <Plus className="h-4 w-4" /> Add freight / packing
                </Button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="rounded-md border p-3 text-xs space-y-1">
                    <div className="font-semibold text-sm">Bank details & terms (from PO Settings)</div>
                    <div>{pf.seller?.bank_account_name || "—"} · {pf.seller?.bank_name_branch || "—"}</div>
                    <div>A/c {pf.seller?.bank_account_no || "—"} · IFSC {pf.seller?.bank_ifsc || "—"}</div>
                    <div>Payment: {pf.seller?.payment_terms || "—"} · Delivery: {pf.seller?.delivery_terms || "—"}</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes</Label>
                    <Textarea rows={2} value={form.notes} disabled={!editable} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>
                <div className="rounded-md border p-4 space-y-1.5 text-sm h-fit">
                  <div className="flex justify-between"><span>Taxable subtotal</span><span>{formatInr(calc.totals.taxable)}</span></div>
                  <div className="flex justify-between"><span>CGST</span><span>{formatInr(calc.totals.cgst)}</span></div>
                  <div className="flex justify-between"><span>SGST / UTGST</span><span>{formatInr(calc.totals.sgst)}</span></div>
                  <div className="flex justify-between"><span>IGST</span><span>{formatInr(calc.totals.igst)}</span></div>
                  <div className="flex justify-between font-bold text-base border-t pt-2"><span>Grand total</span><span>{formatInr(calc.totals.grand_total)}</span></div>
                  <div className="flex justify-between items-center gap-3">
                    <Label htmlFor="pf-advance">Advance received</Label>
                    {editable ? <Input id="pf-advance" type="number" className="h-8 w-36 text-right" value={form.advance} onChange={(e) => setForm({ ...form, advance: e.target.value })} /> : <span>{formatInr(calc.totals.advance)}</span>}
                  </div>
                  {advanceError && <p className="text-xs text-red-700 text-right">{advanceError}</p>}
                  <div className="flex justify-between font-bold border-t pt-2"><span>Balance payable</span><span>{formatInr(calc.totals.balance)}</span></div>
                  <div className="text-xs text-muted-foreground pt-1"><span className="font-semibold">Amount in words:</span> {amountInWords(calc.totals.grand_total)}</div>
                  {dirtyWarning && <div className="text-[11px] text-amber-700">Not saved yet — Save before downloading or sending.</div>}
                </div>
              </div>

              <div className="rounded-md border p-3 text-xs space-y-1 max-h-40 overflow-y-auto">
                <div className="font-semibold text-sm">History</div>
                {[...(pf.history || [])].reverse().map((h: any, i: number) => (
                  <div key={i}>
                    <span className="text-muted-foreground">{new Date(h.at).toLocaleString("en-IN")}</span>{" "}
                    <span className="font-medium">{[h.by?.firstname, h.by?.lastname].filter(Boolean).join(" ") || "—"}</span> {h.action}{h.note ? ` — ${h.note}` : ""}
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <div className="flex gap-2 flex-wrap">
              {pf && pf.status !== "cancelled" && <Button variant="outline" className="gap-2" onClick={download}><Download className="h-4 w-4" /> Download PDF</Button>}
              {pf && pf.status !== "cancelled" && can(PO_MODULE, "Edit") && (
                <Button variant="outline" className="gap-2 text-emerald-700" onClick={() => { setWaTo(pf.bill_to?.whatsapp || pf.bill_to?.phone || ""); setWaError(""); setWaOpen(true); }}>
                  <MessageCircle className="h-4 w-4" /> Send on WhatsApp
                </Button>
              )}
              {pf && pf.status !== "cancelled" && can(PO_MODULE, "Edit") && (
                <Button variant="outline" className="gap-2 text-red-600" disabled={cancelMutation.isPending}
                  onClick={() => { if (window.confirm(`Cancel proforma ${pf.number}?`)) cancelMutation.mutate(); }}>
                  <Ban className="h-4 w-4" /> Cancel proforma
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              {mayEdit && !editable && (
                <Button variant="outline" className="gap-2" onClick={() => setUnlocked(true)}>Edit</Button>
              )}
              {editable && (
                <Button className="gap-2" disabled={saveMutation.isPending || hasErrors} onClick={() => saveMutation.mutate()}>
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={waOpen} onOpenChange={(o) => { setWaOpen(o); if (!o) setWaError(""); }}>
        <DialogContent className="max-w-md" onEscapeKeyDown={() => setWaOpen(false)}>
          <DialogHeader><DialogTitle>Send proforma {pf?.number} to the customer</DialogTitle></DialogHeader>
          <div className="space-y-1.5 text-sm">
            <Label htmlFor="pf-wa-to">WhatsApp number</Label>
            <Input id="pf-wa-to" value={waTo} onChange={(e) => setWaTo(e.target.value)} placeholder="10-digit mobile or with country code" />
            <p className="text-xs text-muted-foreground">Once sent, the proforma is locked.</p>
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

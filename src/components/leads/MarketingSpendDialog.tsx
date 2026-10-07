import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flame, Pencil, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { marketingSpendService } from "@/api/services/marketingSpend.service";
import { MetaAdsAccountsPanel } from "@/components/leads/MetaAdsAccountsPanel";
import { useCurrency } from "@/context/CurrencyContext";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/components/ui/table";

const NO_SOURCE = "none";
const pad = (n: number) => String(n).padStart(2, "0");
const toDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDay(d);
};

type SpendForm = { id: string | null; day: string; amount: string; source: string; campaign: string; notes: string };
const emptyForm = (): SpendForm => ({ id: null, day: toDay(new Date()), amount: "", source: NO_SOURCE, campaign: "", notes: "" });

interface MarketingSpendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: any[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isAdmin: boolean;
}

export function MarketingSpendDialog({ open, onOpenChange, sources, canCreate, canEdit, canDelete, isAdmin }: MarketingSpendDialogProps) {
  const queryClient = useQueryClient();
  const { formatAmount, symbol } = useCurrency();
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(toDay(new Date()));
  const [form, setForm] = useState<SpendForm | null>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["leads", "marketing-spend", from, to],
    queryFn: () => marketingSpendService.list({ dateFrom: from, dateTo: to }),
    enabled: open,
  });
  const rows: any[] = data?.data || [];

  const campaignOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.campaign).filter(Boolean))).sort(),
    [rows]
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["leads"] });

  const saveMutation = useMutation({
    mutationFn: (f: SpendForm) => {
      const payload = {
        day: f.day,
        amount: Number(f.amount),
        source: f.source === NO_SOURCE ? null : f.source,
        campaign: f.campaign.trim(),
        notes: f.notes.trim(),
      };
      return f.id ? marketingSpendService.update(f.id, payload) : marketingSpendService.create(payload);
    },
    onSuccess: () => {
      toast.success("Spend saved");
      setForm(null);
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || "Failed to save spend"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => marketingSpendService.delete(id),
    onSuccess: () => {
      toast.success("Spend entry deleted");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || "Failed to delete"),
  });

  const amountValid = form && form.amount !== "" && Number.isFinite(Number(form.amount)) && Number(form.amount) >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white">
        <div className="flex flex-col max-h-[calc(100vh-6rem)]">
          <div className="shrink-0 bg-orange-50 px-8 py-6 border-b border-orange-100">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-xl">
                  <Flame className="h-4 w-4 text-orange-600" />
                </div>
                Daily Burning Amount
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-slate-500">
                Ad spend per day, optionally per lead source / campaign. Leads and cost per lead are counted from actual
                leads created that day.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
            {open && <MetaAdsAccountsPanel isAdmin={isAdmin} canSync={canEdit} />}

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">From</Label>
                <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">To</Label>
                <Input type="date" value={to} min={from} max={toDay(new Date())} onChange={(e) => setTo(e.target.value)} className="h-9 w-40 text-xs" />
              </div>
              <div className="flex-1" />
              {canCreate && !form && (
                <Button onClick={() => setForm(emptyForm())} className="h-9 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest">
                  <Plus className="h-3.5 w-3.5" /> Add spend
                </Button>
              )}
            </div>

            {form && (
              <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4 space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-600">{form.id ? "Edit spend" : "New spend"}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Date *</Label>
                    <Input type="date" value={form.day} max={toDay(new Date())} onChange={(e) => setForm({ ...form, day: e.target.value })} className="h-10 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Amount ({symbol}) *</Label>
                    <Input type="number" min={0} step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-10 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lead source</Label>
                    <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                      <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_SOURCE}>General / all sources</SelectItem>
                        {sources.map((s: any) => (
                          <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Campaign</Label>
                    <Input list="spend-campaigns" value={form.campaign} maxLength={200} onChange={(e) => setForm({ ...form, campaign: e.target.value })} placeholder="Optional" className="h-10 text-xs" />
                    <datalist id="spend-campaigns">
                      {campaignOptions.map((c) => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notes</Label>
                  <Input value={form.notes} maxLength={1000} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="h-10 text-xs" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setForm(null)} disabled={saveMutation.isPending} className="h-9 rounded-xl font-bold">Cancel</Button>
                  <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !amountValid || !form.day} className="h-9 rounded-xl font-black uppercase text-[10px] tracking-widest">
                    {saveMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-tight text-slate-400">Spend in range</p>
                <p className="text-base font-black text-orange-600">{formatAmount(data?.totals?.amount || 0)}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-tight text-slate-400">Leads in range</p>
                <p className="text-base font-black text-slate-900">{data?.totals?.leads ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-tight text-slate-400">Cost per lead</p>
                <p className="text-base font-black text-slate-900">
                  {data?.totals?.costPerLead != null ? formatAmount(data.totals.costPerLead) : "—"}
                </p>
              </div>
            </div>

            <TableContainer>
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Cost / lead</TableHead>
                    {(canEdit || canDelete) && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7}><Skeleton className="h-10 w-full rounded-xl" /></TableCell></TableRow>
                  ) : rows.length === 0 ? (
                    <TableEmpty colSpan={7}>No spend recorded in this range</TableEmpty>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell>{String(r.day).split("-").reverse().join("-")}</TableCell>
                        <TableCell>{r.source_name || "General"}</TableCell>
                        <TableCell>
                          {r.campaign || "—"}
                          {r.sync_source === "meta_ads" && (
                            <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-600">Meta</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right"><span className="font-bold">{formatAmount(r.amount)}</span></TableCell>
                        <TableCell className="text-right">{r.leads_count}</TableCell>
                        <TableCell className="text-right">{r.cost_per_lead != null ? formatAmount(r.cost_per_lead) : "—"}</TableCell>
                        {(canEdit || canDelete) && (
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              {r.sync_source === "meta_ads" ? (
                                <span className="text-[10px] font-bold text-slate-400" title="Synced from Meta Ads">Auto</span>
                              ) : canEdit && (
                                <button
                                  type="button"
                                  aria-label="Edit spend"
                                  onClick={() => setForm({ id: r._id, day: r.day, amount: String(r.amount), source: r.source || NO_SOURCE, campaign: r.campaign || "", notes: r.notes || "" })}
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {canDelete && r.sync_source !== "meta_ads" && (
                                <button
                                  type="button"
                                  aria-label="Delete spend"
                                  onClick={() => window.confirm("Delete this spend entry?") && deleteMutation.mutate(r._id)}
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

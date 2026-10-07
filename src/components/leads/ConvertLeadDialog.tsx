import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { leadService } from "@/api/services/lead.service";
import { itemService } from "@/api/services/item.service";
import { useCurrency } from "@/context/CurrencyContext";

const CUSTOM = "__custom__";

const todayLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

interface ConvertLeadDialogProps {
  lead: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted?: () => void;
}

// Lead → patient conversion: captures the treatment and its amount so the
// treatment totals on the Leads page come from real conversion records.
export function ConvertLeadDialog({ lead, open, onOpenChange, onConverted }: ConvertLeadDialogProps) {
  const queryClient = useQueryClient();
  const { symbol, formatAmount } = useCurrency();
  const [itemId, setItemId] = useState<string>(CUSTOM);
  const [treatmentName, setTreatmentName] = useState("");
  const [amount, setAmount] = useState("");
  const [convertedOn, setConvertedOn] = useState(todayLocal());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setItemId(CUSTOM);
    setTreatmentName("");
    setAmount("");
    setConvertedOn(todayLocal());
    setNotes("");
  }, [open, lead?._id]);

  // The Items catalog doubles as the treatment list. Staff without access to
  // Items simply get the free-text field.
  const { data: itemsRaw = [] } = useQuery<any[]>({
    queryKey: ["items", "treatment-picker"],
    queryFn: async () => {
      try {
        const res: any = await itemService.getAll();
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const items = useMemo(() => itemsRaw.filter((i: any) => i?._id && i?.name), [itemsRaw]);

  const onPickItem = (value: string) => {
    setItemId(value);
    if (value === CUSTOM) return;
    const item = items.find((i: any) => i._id === value);
    if (item) {
      setTreatmentName(item.name);
      if (item.rate !== undefined && item.rate !== null && amount === "") setAmount(String(item.rate));
    }
  };

  const amountNum = Number(amount);
  const amountValid = amount !== "" && Number.isFinite(amountNum) && amountNum >= 0;
  const nameValid = treatmentName.trim().length > 0;

  const mutation = useMutation({
    mutationFn: () => {
      // Converted "today" keeps the real current time; a back-dated
      // conversion is stored at local noon of that day.
      const convertedAt = convertedOn === todayLocal() ? new Date() : new Date(`${convertedOn}T12:00:00`);
      return leadService.convertToCustomer(lead._id, {
        treatment_item: itemId !== CUSTOM ? itemId : undefined,
        treatment_name: treatmentName.trim(),
        treatment_amount: amountNum,
        notes: notes.trim(),
        converted_at: convertedAt.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success(`${lead?.name || "Lead"} converted to patient`);
      onOpenChange(false);
      onConverted?.();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || "Failed to convert lead"),
  });

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white">
        <div className="flex flex-col max-h-[calc(100vh-8rem)]">
          <div className="shrink-0 bg-emerald-50 px-8 py-6 border-b border-emerald-100">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <UserCheck className="h-4 w-4 text-emerald-700" />
                </div>
                Convert to Patient
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-slate-500">
                {lead.name}
                {lead.phonenumber ? ` · ${lead.phonenumber}` : ""} — creates (or links) the patient record and logs the
                treatment business.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-8 space-y-5">
            {items.length > 0 && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Treatment</Label>
                <Select value={itemId} onValueChange={onPickItem}>
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-300">
                    <SelectValue placeholder="Select treatment" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value={CUSTOM}>Other (type below)</SelectItem>
                    {items.map((i: any) => (
                      <SelectItem key={i._id} value={i._id}>
                        {i.name}
                        {i.rate ? ` — ${formatAmount(Number(i.rate) || 0)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Treatment name *</Label>
              <Input
                value={treatmentName}
                onChange={(e) => setTreatmentName(e.target.value)}
                placeholder="e.g. Root canal, Braces, Implant"
                maxLength={200}
                className="h-11 rounded-xl bg-slate-50/50 border-slate-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Treatment amount ({symbol}) *
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Converted on *</Label>
                <Input
                  type="date"
                  max={todayLocal()}
                  value={convertedOn}
                  onChange={(e) => setConvertedOn(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                className="min-h-[90px] rounded-xl bg-slate-50/50 border-slate-300"
              />
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-[11px] font-medium text-slate-500 space-y-1">
              <p>
                Source: <span className="font-bold text-slate-700">{lead.source?.name || "—"}</span>
                {lead.campaign ? (
                  <>
                    {" "}· Campaign: <span className="font-bold text-slate-700">{lead.campaign}</span>
                  </>
                ) : null}
              </p>
              <p>An existing patient with the same phone number is reused instead of creating a duplicate.</p>
            </div>
          </div>

          <div className="shrink-0 p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending} className="rounded-xl font-bold h-10 px-6">
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !nameValid || !amountValid || !convertedOn}
              className="rounded-xl px-6 h-10 font-black uppercase text-[10px] tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {mutation.isPending ? "Converting..." : "Convert to Patient"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

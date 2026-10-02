import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";

import { whatsappService } from "@/api/services/whatsapp.service";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Condition {
  _id: string;
  template_id: string;
  label: string;
  recency_days: number;
  frequency_cap: { max_messages: number; period_days: number };
  exclude_statuses: string[];
  is_active: boolean;
}

const EMPTY_FORM = {
  template_id: "",
  label: "",
  recency_days: 0,
  max_messages: 0,
  period_days: 30,
  exclude_statuses: "Purchased,Converted",
};

export function TemplateConditionsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp-conditions"],
    queryFn: () => whatsappService.getConditions(),
  });
  const conditions: Condition[] = data?.data || [];

  const createMutation = useMutation({
    mutationFn: () =>
      whatsappService.createCondition({
        template_id: form.template_id,
        label: form.label,
        recency_days: Number(form.recency_days) || 0,
        frequency_cap: { max_messages: Number(form.max_messages) || 0, period_days: Number(form.period_days) || 30 },
        exclude_statuses: form.exclude_statuses.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      toast({ title: "Audience rule saved" });
      setOpen(false);
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conditions"] });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      whatsappService.updateCondition(id, { is_active: isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp-conditions"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => whatsappService.deleteCondition(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp-conditions"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Per-template rules: how recently a lead was added, how often they can be messaged, and which statuses to skip.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Rule</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Audience Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Template Name (Meta)</Label>
                <Input value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })} />
              </div>
              <div>
                <Label>Label</Label>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Recency (days, 0 = no limit)</Label>
                  <Input
                    type="number"
                    value={form.recency_days}
                    onChange={(e) => setForm({ ...form, recency_days: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Max messages per period</Label>
                  <Input
                    type="number"
                    value={form.max_messages}
                    onChange={(e) => setForm({ ...form, max_messages: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>Period (days)</Label>
                <Input
                  type="number"
                  value={form.period_days}
                  onChange={(e) => setForm({ ...form, period_days: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Exclude Lead Statuses (comma-separated)</Label>
                <Input
                  value={form.exclude_statuses}
                  onChange={(e) => setForm({ ...form, exclude_statuses: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.template_id}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : conditions.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No audience rules yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {conditions.map((c) => (
            <Card key={c._id}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{c.label || c.template_id}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.template_id} · Recency {c.recency_days || "∞"}d · Max {c.frequency_cap?.max_messages || "∞"}/{c.frequency_cap?.period_days}d
                    {c.exclude_statuses?.length ? ` · Excludes: ${c.exclude_statuses.join(", ")}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: c._id, isActive: checked })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c._id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

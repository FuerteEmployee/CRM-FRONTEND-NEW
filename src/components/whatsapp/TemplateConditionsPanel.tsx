import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, Edit2 } from "lucide-react";

import { whatsappService } from "@/api/services/whatsapp.service";
import { whatsappCampaignService } from "@/api/services/whatsappCampaign.service";
import { leadService } from "@/api/services/lead.service";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  exclude_statuses: [] as string[],
};

const asList = (res: any): any[] => (Array.isArray(res) ? res : res?.data || []);

export function TemplateConditionsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp-conditions"],
    queryFn: () => whatsappService.getConditions(),
  });
  const conditions: Condition[] = data?.data || [];

  // Pick-lists instead of free text, so names always match exactly.
  const { data: templatesData } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: () => whatsappCampaignService.getTemplates(false),
    enabled: open,
  });
  const templateNames: string[] = Array.from(new Set((templatesData?.data || []).map((t: any) => t.id)));
  const { data: statusesRes } = useQuery({
    queryKey: ["lead-statuses"],
    queryFn: () => leadService.getStatuses(),
    enabled: open,
  });
  const statusNames: string[] = Array.from(new Set(asList(statusesRes).map((s: any) => s.name).filter(Boolean)));

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };
  const openEdit = (c: Condition) => {
    setEditingId(c._id);
    setForm({
      template_id: c.template_id,
      label: c.label || "",
      recency_days: c.recency_days || 0,
      max_messages: c.frequency_cap?.max_messages || 0,
      period_days: c.frequency_cap?.period_days || 30,
      exclude_statuses: c.exclude_statuses || [],
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        template_id: form.template_id,
        label: form.label,
        recency_days: Number(form.recency_days) || 0,
        frequency_cap: { max_messages: Number(form.max_messages) || 0, period_days: Number(form.period_days) || 30 },
        exclude_statuses: form.exclude_statuses,
      };
      return editingId ? whatsappService.updateCondition(editingId, payload) : whatsappService.createCondition(payload);
    },
    onSuccess: () => {
      toast({ title: "Audience rule saved" });
      setOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
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

  const toggleStatus = (name: string) =>
    setForm({
      ...form,
      exclude_statuses: form.exclude_statuses.includes(name)
        ? form.exclude_statuses.filter((s) => s !== name)
        : [...form.exclude_statuses, name],
    });

  // A rule saved before (or a template no longer in the list) still shows up.
  const templateOptions = form.template_id && !templateNames.includes(form.template_id)
    ? [form.template_id, ...templateNames]
    : templateNames;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Optional limits per template, used by <strong>Leads — by filter</strong> campaigns: how recently a lead was added,
          how often one person can get this template, and which lead statuses to skip.
        </p>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Rule</Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(EMPTY_FORM); setEditingId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Audience Rule" : "New Audience Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Template</Label>
              <Select value={form.template_id} onValueChange={(v) => setForm({ ...form, template_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
                <SelectContent>
                  {templateOptions.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Label (optional)</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Offer limits" />
            </div>
            <div>
              <Label>Only leads added in the last (days)</Label>
              <Input
                type="number"
                min={0}
                value={form.recency_days}
                onChange={(e) => setForm({ ...form, recency_days: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">0 = any age</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max messages per person</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.max_messages}
                  onChange={(e) => setForm({ ...form, max_messages: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground mt-1">0 = no limit</p>
              </div>
              <div>
                <Label>…within (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.period_days}
                  onChange={(e) => setForm({ ...form, period_days: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Skip leads with these statuses</Label>
              {statusNames.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-1">No lead statuses found.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {statusNames.map((s) => (
                    <Badge
                      key={s}
                      variant={form.exclude_statuses.includes(s) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleStatus(s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.template_id}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : conditions.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No audience rules yet — none are needed for one-off campaigns.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {conditions.map((c) => (
            <Card key={c._id}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{c.label || c.template_id}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.template_id} · Leads from last {c.recency_days || "∞"} days · Max {c.frequency_cap?.max_messages || "∞"} per{" "}
                    {c.frequency_cap?.period_days} days
                    {c.exclude_statuses?.length ? ` · Skips: ${c.exclude_statuses.join(", ")}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: c._id, isActive: checked })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
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

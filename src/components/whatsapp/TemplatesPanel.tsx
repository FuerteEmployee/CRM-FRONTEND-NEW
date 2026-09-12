import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, RefreshCw } from "lucide-react";

import { whatsappCampaignService } from "@/api/services/whatsappCampaign.service";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";

interface Template {
  id: string;
  name: string;
  label: string;
  language: string;
  category: string;
  status: string;
  body: string;
}

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-600 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-600 border-amber-200",
  REJECTED: "bg-red-50 text-red-600 border-red-200",
};

const emptyForm = { name: "", category: "MARKETING", language: "en_US", header: "", body: "", footer: "" };

export function TemplatesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["whatsapp-templates-all"],
    queryFn: () => whatsappCampaignService.getAllTemplates(),
  });
  const templates: Template[] = data?.data || [];

  const createMutation = useMutation({
    mutationFn: () => whatsappCampaignService.createTemplate(form),
    onSuccess: () => {
      toast({ title: "Submitted to Meta for review", description: "It will show up here as Pending until Meta approves it." });
      setOpen(false);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates-all"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    },
    onError: (err: any) => toast({ title: "Submission failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Templates still need Meta's approval before they can be used — this only saves the trip to WhatsApp Manager.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create Template</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create WhatsApp Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                    placeholder="e.g. order_confirmation"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="UTILITY">Utility</SelectItem>
                      <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Language</Label>
                  <Input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="en_US" />
                </div>
                <div>
                  <Label>Header (optional)</Label>
                  <Input value={form.header} onChange={(e) => setForm({ ...form, header: e.target.value })} />
                </div>
                <div>
                  <Label>Body</Label>
                  <Textarea
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    placeholder="Hello {{1}}, your order has been confirmed."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Footer (optional)</Label>
                  <Input value={form.footer} onChange={(e) => setForm({ ...form, footer: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !form.name || !form.body}
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Submit to Meta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No templates yet — create one above, or add one directly in Meta WhatsApp Manager.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.category} · {t.language} · {t.body}
                  </div>
                </div>
                <Badge variant="outline" className={STATUS_STYLES[t.status] || ""}>
                  {t.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

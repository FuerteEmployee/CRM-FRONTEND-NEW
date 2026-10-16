import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, RefreshCw, Image as ImageIcon, Upload, X } from "lucide-react";

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
  headerFormat?: string | null;
  rejectedReason?: string;
}

type HeaderType = "NONE" | "TEXT" | "IMAGE";

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-600 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-600 border-amber-200",
  REJECTED: "bg-red-50 text-red-600 border-red-200",
};

const LANGUAGES = [
  { value: "en_US", label: "English (US)" },
  { value: "en", label: "English" },
  { value: "en_GB", label: "English (UK)" },
  { value: "hi", label: "Hindi" },
  { value: "gu", label: "Gujarati" },
  { value: "mr", label: "Marathi" },
];

const emptyForm = {
  name: "",
  category: "MARKETING",
  language: "en_US",
  headerType: "NONE" as HeaderType,
  header: "",
  body: "",
  footer: "",
};

// Highest {{n}} in the body — "{{1}} … {{1}}" is one variable.
const countVariables = (text: string) =>
  Math.max(0, ...(text.match(/\{\{(\d+)\}\}/g) || []).map((m) => Number(m.replace(/\D/g, ""))));

export function TemplatesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [examples, setExamples] = useState<string[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["whatsapp-templates-all"],
    queryFn: () => whatsappCampaignService.getAllTemplates(),
  });
  const templates: Template[] = data?.data || [];

  // "Refresh" always asks Meta again, skipping the 5-minute server cache.
  const [refreshing, setRefreshing] = useState(false);
  const refreshFromMeta = async () => {
    setRefreshing(true);
    try {
      await whatsappCampaignService.getAllTemplates(true);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    } finally {
      setRefreshing(false);
    }
  };

  const varCount = useMemo(() => countVariables(form.body), [form.body]);

  useEffect(() => {
    setExamples((prev) => Array.from({ length: varCount }, (_, i) => prev[i] || (i === 0 ? "Ramesh" : "")));
  }, [varCount]);

  useEffect(() => {
    if (!image) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(image);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const reset = () => {
    setForm(emptyForm);
    setExamples([]);
    setImage(null);
  };

  const pickImage = (file?: File | null) => {
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) {
      toast({ title: "Use a JPG or PNG image", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image is larger than 5 MB", variant: "destructive" });
      return;
    }
    setImage(file);
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        category: form.category,
        language: form.language,
        body: form.body,
        footer: form.footer,
        header: form.headerType === "TEXT" ? form.header : "",
        headerType: form.headerType === "IMAGE" ? "IMAGE" : "TEXT",
        bodyExamples: examples,
      };
      if (form.headerType === "IMAGE" && image) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => fd.append(k, typeof v === "object" ? JSON.stringify(v) : String(v)));
        fd.append("image", image);
        return whatsappCampaignService.createTemplate(fd);
      }
      return whatsappCampaignService.createTemplate(payload);
    },
    onSuccess: () => {
      toast({ title: "Submitted to Meta for review", description: "It will show up here as Pending until Meta approves it." });
      setOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates-all"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    },
    onError: (err: any) => toast({ title: "Submission failed", description: err.message, variant: "destructive" }),
  });

  const missingExample = examples.some((e) => !e.trim());
  const canSubmit =
    !!form.name &&
    !!form.body.trim() &&
    !missingExample &&
    (form.headerType !== "IMAGE" || !!image) &&
    (form.headerType !== "TEXT" || !!form.header.trim());

  // Preview with the example values in place of {{n}}.
  const previewBody = form.body.replace(/\{\{(\d+)\}\}/g, (m, n) => examples[Number(n) - 1] || m);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Templates still need Meta's approval before they can be used — this only saves the trip to WhatsApp Manager.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshFromMeta} disabled={refreshing || isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing || isRefetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create Template</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create WhatsApp Template</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-[1fr_240px]">
                <div className="space-y-3">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                      placeholder="e.g. diwali_offer_2026"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Category</Label>
                      <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MARKETING">Marketing (offers, news)</SelectItem>
                          <SelectItem value="UTILITY">Utility (order / payment updates)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Language</Label>
                      <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((l) => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Header (optional)</Label>
                    <div className="flex gap-2 mt-1">
                      {(["NONE", "TEXT", "IMAGE"] as HeaderType[]).map((h) => (
                        <Button
                          key={h}
                          type="button"
                          size="sm"
                          variant={form.headerType === h ? "default" : "outline"}
                          onClick={() => setForm({ ...form, headerType: h })}
                        >
                          {h === "NONE" ? "None" : h === "TEXT" ? "Text" : "Image"}
                        </Button>
                      ))}
                    </div>
                    {form.headerType === "TEXT" && (
                      <Input
                        className="mt-2"
                        value={form.header}
                        maxLength={60}
                        onChange={(e) => setForm({ ...form, header: e.target.value })}
                        placeholder="e.g. Special offer for you"
                      />
                    )}
                    {form.headerType === "IMAGE" && (
                      <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <ImageIcon className="h-4 w-4" /> Sample image <Badge variant="outline">Required by Meta</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex flex-1 items-center gap-2 border rounded-md bg-background px-3 py-2 cursor-pointer text-sm text-muted-foreground min-w-0">
                            <Upload className="h-4 w-4 shrink-0" />
                            <span className="truncate">{image ? `${image.name} — click to change` : "Choose JPG or PNG"}</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png"
                              className="hidden"
                              onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ""; }}
                            />
                          </label>
                          {image && (
                            <Button type="button" variant="outline" size="sm" onClick={() => setImage(null)}>
                              <X className="h-4 w-4 mr-1" /> Remove
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Only for Meta's review — every campaign can send its own image. JPG or PNG, max 5 MB,
                          recommended 1080×1080 (square) or 1080×566 (landscape).
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Body</Label>
                    <Textarea
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      placeholder="Hi {{1}}, our {{2}} is live! Reply YES and our team will call you."
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {"{{1}}"} is filled with each person's name. Add {"{{2}}"}, {"{{3}}"}… for values you type in the campaign.
                    </p>
                  </div>

                  {varCount > 0 && (
                    <div className="space-y-2 rounded-md border p-3">
                      <Label className="text-xs">Example values (Meta needs one for each variable)</Label>
                      {examples.map((ex, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-12 text-xs text-muted-foreground">{`{{${i + 1}}}`}</span>
                          <Input
                            value={ex}
                            onChange={(e) => setExamples(examples.map((x, j) => (j === i ? e.target.value : x)))}
                            placeholder={i === 0 ? "e.g. Ramesh" : "e.g. Diwali Sale"}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <Label>Footer (optional)</Label>
                    <Input value={form.footer} maxLength={60} onChange={(e) => setForm({ ...form, footer: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Preview</Label>
                  <div className="mt-1 rounded-lg bg-[#efeae2] p-3">
                    <div className="rounded-lg bg-white shadow-sm overflow-hidden text-sm">
                      {form.headerType === "IMAGE" &&
                        (imagePreview ? (
                          <img src={imagePreview} alt="Header" className="w-full max-h-40 object-cover" />
                        ) : (
                          <div className="h-28 bg-muted flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        ))}
                      <div className="p-2.5 space-y-1">
                        {form.headerType === "TEXT" && form.header && <div className="font-semibold">{form.header}</div>}
                        <div className="whitespace-pre-wrap">{previewBody || "Your message text"}</div>
                        {form.footer && <div className="text-xs text-muted-foreground">{form.footer}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !canSubmit}>
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
            <Card key={`${t.id}-${t.language}`}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {t.label}
                    {t.headerFormat === "IMAGE" && (
                      <Badge variant="outline" className="gap-1"><ImageIcon className="h-3 w-3" /> Image</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {t.category} · {t.language} · {t.body}
                  </div>
                  {t.status === "REJECTED" && t.rejectedReason && (
                    <div className="text-xs text-red-600 mt-0.5">Meta: {t.rejectedReason.replace(/_/g, " ").toLowerCase()}</div>
                  )}
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

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ChevronLeft, Loader2, Copy } from "lucide-react";
import { settingsService } from "@/api/services/settings.service";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGE_NAMES } from "@/lib/languages";
import { getMergeFieldGroups } from "@/lib/emailMergeFields";

type Translation = { subject: string; message: string };

export default function EmailTemplateEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [fromName, setFromName] = useState("");
  const [plaintext, setPlaintext] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [message, setMessage] = useState("");
  const [translations, setTranslations] = useState<Record<string, Translation>>({});
  const [module, setModule] = useState("");

  const { data: template, isLoading } = useQuery<any>({
    queryKey: ["email-template", id],
    queryFn: () => settingsService.getEmailTemplateById(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (template) {
      setName(template.name || "");
      setSubject(template.subject || "");
      setFromName(template.from_name || "{companyname} | CRM");
      setPlaintext(!!template.plaintext);
      setDisabled(template.active === false);
      setMessage(template.message || "");
      setModule(template.module || "");
      const t: Record<string, Translation> = {};
      if (template.translations) {
        Object.entries(template.translations as Record<string, Translation>).forEach(([lang, val]) => {
          t[lang] = { subject: val?.subject || "", message: val?.message || "" };
        });
      }
      setTranslations(t);
    }
  }, [template]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => settingsService.updateEmailTemplate(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-template", id] });
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Success", description: "Template saved successfully", className: "bg-green-600 text-white font-bold rounded-2xl" });
    },
    onError: (err: any) => toast({ title: "Error", description: err?.response?.data?.message || "Failed to save template", variant: "destructive" }),
  });

  const handleSave = () => {
    if (!name.trim() || !subject.trim() || !message.trim()) {
      toast({ title: "Error", description: "Template Title, Subject and English message are required", variant: "destructive" });
      return;
    }
    // Only persist languages that actually have content, to avoid storing
    // ~100 empty translation entries per template.
    const cleanedTranslations: Record<string, Translation> = {};
    Object.entries(translations).forEach(([lang, val]) => {
      if (val.subject.trim() || val.message.trim()) cleanedTranslations[lang] = val;
    });

    updateMutation.mutate({
      name,
      subject,
      from_name: fromName,
      plaintext,
      active: !disabled,
      message,
      translations: cleanedTranslations,
    });
  };

  const setTranslation = (lang: string, field: keyof Translation, value: string) => {
    setTranslations((prev) => ({
      ...prev,
      [lang]: { subject: prev[lang]?.subject || "", message: prev[lang]?.message || "", [field]: value },
    }));
  };

  const copyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    toast({ title: "Copied", description: `${tag} copied to clipboard` });
  };

  if (isLoading || !template) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  const mergeFieldGroups = getMergeFieldGroups(module);

  return (
    <DashboardLayout>
      <div className="p-6 pb-24">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/setup/email-templates")} className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">{name}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
          {/* Left column */}
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">
                  <span className="text-red-500 mr-1">*</span>Template Title
                </Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-10" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">From Name</Label>
                <Input value={fromName} onChange={(e) => setFromName(e.target.value)} className="h-10" />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox id="plaintext" checked={plaintext} onCheckedChange={(v) => setPlaintext(!!v)} />
                  <label htmlFor="plaintext" className="text-sm cursor-pointer select-none">Send as Plaintext</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="disabled" checked={disabled} onCheckedChange={(v) => setDisabled(!!v)} />
                  <label htmlFor="disabled" className="text-sm cursor-pointer select-none">Disabled</label>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-sm font-bold">English</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[280px] font-mono text-sm"
                  placeholder="Email message body..."
                />
              </div>

              <div className="pt-2 border-t">
                <Accordion type="multiple" className="space-y-1">
                  {LANGUAGE_NAMES.map((lang) => (
                    <AccordionItem key={lang} value={lang} className="border rounded-lg px-4">
                      <AccordionTrigger className="text-sm font-bold hover:no-underline py-3">{lang}</AccordionTrigger>
                      <AccordionContent className="space-y-3 pb-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Subject</Label>
                          <Input
                            value={translations[lang]?.subject || ""}
                            onChange={(e) => setTranslation(lang, "subject", e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Email message</Label>
                          <Textarea
                            value={translations[lang]?.message || ""}
                            onChange={(e) => setTranslation(lang, "message", e.target.value)}
                            className="min-h-[140px] font-mono text-xs"
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </CardContent>
          </Card>

          {/* Right column — merge fields reference */}
          <Card className="rounded-2xl border-border/50 shadow-sm sticky top-4">
            <CardContent className="p-6 space-y-5">
              <h3 className="text-sm font-black text-foreground">Available merge fields</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                If ticket is imported with email piping and the contact does not exist in the CRM the fields won't be replaced.
              </div>
              {mergeFieldGroups.map((group) => (
                <div key={group.title} className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{group.title}</p>
                  <div className="space-y-1.5">
                    {group.fields.map((f) => (
                      <button
                        key={f.tag}
                        onClick={() => copyTag(f.tag)}
                        className="w-full flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors group text-left"
                        title="Click to copy"
                      >
                        <span className="text-foreground">{f.label}</span>
                        <span className="flex items-center gap-1 text-primary font-mono">
                          {f.tag}
                          <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed bottom-6 right-6">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="rounded-xl px-8 h-11 font-bold shadow-2xl bg-slate-900 hover:bg-slate-800 text-white"
        >
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </DashboardLayout>
  );
}

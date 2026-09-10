import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageCircle, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  resolveWhatsappTemplate,
  WHATSAPP_QC_PLACEHOLDERS,
  type WhatsappQcTemplateEntry,
} from "@/lib/whatsappQuickChat";
import { settingsService } from "@/api/services/settings.service";

interface Props {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  templates: WhatsappQcTemplateEntry[];
  setTemplates: (value: WhatsappQcTemplateEntry[]) => void;
  companyName: string;
  currentUser: any;
  /** Called after a template is successfully saved/deleted, to refresh the
   *  app-wide settings context so other pages (Leads, Customers, ...) see
   *  the change immediately without a full reload. */
  onPersisted?: () => void | Promise<void>;
}

const emptyDraft = { name: "", template: "" };

export function WhatsappQuickChatSettingsTab({ enabled, setEnabled, templates, setTemplates, companyName, currentUser, onPersisted }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Add/Edit/Delete persist immediately (their own API call) rather than
  // only updating local state — the alternative was two different "Save"
  // buttons meaning two different things (this dialog's Save vs. the page's
  // global Save Changes), which meant a template that looked saved here
  // could silently vanish on reload if the admin never clicked the other
  // one. Still updates local state too, so the global Save Changes button
  // (and the rest of this settings page) reflects the same value.
  const persistTemplates = async (next: WhatsappQcTemplateEntry[]) => {
    setIsSavingTemplates(true);
    try {
      await settingsService.updateSettings({ settings: [{ name: "whatsappQcTemplates", value: JSON.stringify(next) }] });
      setTemplates(next);
      await onPersisted?.();
      return true;
    } catch (error: any) {
      toast.error(error.message || "Failed to save template");
      return false;
    } finally {
      setIsSavingTemplates(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setIsDialogOpen(true);
  };

  const openEdit = (t: WhatsappQcTemplateEntry) => {
    setEditingId(t.id);
    setDraft({ name: t.name, template: t.template });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (templates.length <= 1) {
      toast.error("At least one message template is required.");
      return;
    }
    if (!window.confirm("Delete this template?")) return;
    if (await persistTemplates(templates.filter((t) => t.id !== id))) {
      toast.success("Template removed");
    }
  };

  // Inserts {placeholder} at the caret position rather than just appending
  // it to the end — lets an admin click a placeholder mid-sentence.
  const insertPlaceholder = (placeholder: string) => {
    const el = textareaRef.current;
    const token = `{${placeholder}}`;
    if (!el) {
      setDraft((p) => ({ ...p, template: p.template + token }));
      return;
    }
    const start = el.selectionStart ?? draft.template.length;
    const end = el.selectionEnd ?? draft.template.length;
    const next = draft.template.slice(0, start) + token + draft.template.slice(end);
    setDraft((p) => ({ ...p, template: next }));
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + token.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const handleSaveDraft = async () => {
    if (!draft.name.trim() || !draft.template.trim()) {
      toast.error("Template name and message are both required");
      return;
    }
    const next = editingId
      ? templates.map((t) => (t.id === editingId ? { ...t, name: draft.name, template: draft.template } : t))
      : [...templates, { id: `wa-${Date.now()}`, name: draft.name, template: draft.template }];

    if (await persistTemplates(next)) {
      toast.success(editingId ? "Template updated" : "Template added");
      setIsDialogOpen(false);
    }
  };

  const previewData = {
    customer_name: "John Doe",
    phone_number: "+91 98765 43210",
    lead_id: "LD-1024",
    invoice_no: "INV-2031",
    company_name: companyName || "Your Company",
    staff_name: currentUser?.firstname ? `${currentUser.firstname} ${currentUser.lastname || ""}`.trim() : "Staff Member",
  };

  return (
    <>
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">WhatsApp Quick Chat</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Shows a WhatsApp icon next to every phone number CRM-wide (Leads, Customers, Sales, Staff Directory, etc.). Clicking it opens WhatsApp with the number and a chosen message pre-filled.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-semibold">Enable WhatsApp Icon</Label>
            <div className="flex items-center space-x-6 pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox id="wa-qc-yes" checked={enabled === true} onCheckedChange={() => setEnabled(true)} />
                <label htmlFor="wa-qc-yes" className="text-sm cursor-pointer select-none">Yes</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="wa-qc-no" checked={enabled === false} onCheckedChange={() => setEnabled(false)} />
                <label htmlFor="wa-qc-no" className="text-sm cursor-pointer select-none">No</label>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-bold">Message Templates</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Give each template a name. If there's more than one, whoever clicks the WhatsApp icon picks which one to send.
                </p>
              </div>
              <Button size="sm" className="gap-2" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add Template
              </Button>
            </div>

            <div className="bg-card border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-2 px-4">Name</TableHead>
                    <TableHead className="py-2 px-4">Message</TableHead>
                    <TableHead className="py-2 px-4 w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="py-2.5 px-4 font-medium whitespace-nowrap">{t.name}</TableCell>
                      <TableCell className="py-2.5 px-4 text-muted-foreground truncate max-w-[360px]">{t.template}</TableCell>
                      <TableCell className="py-2.5 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(t.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Templates save immediately — no need to click the page's Save Changes button for these.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30">
            <DialogTitle>{editingId ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-sm font-bold"><span className="text-red-500">*</span> Template Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Payment Reminder"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold"><span className="text-red-500">*</span> Message</Label>
              <Textarea
                ref={textareaRef}
                value={draft.template}
                onChange={(e) => setDraft((p) => ({ ...p, template: e.target.value }))}
                placeholder="Hi {customer_name}, this is {company_name}."
                className="min-h-[110px]"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {WHATSAPP_QC_PLACEHOLDERS.map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertPlaceholder(ph)}
                    className="text-[11px] font-mono px-2 py-1 rounded-md border bg-muted/50 hover:bg-muted hover:border-primary/40 transition-colors"
                  >
                    {`{${ph}}`}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Click a placeholder to insert it at the cursor. Any placeholder not available on a given page resolves to blank.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Preview</Label>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                {resolveWhatsappTemplate(draft.template, previewData)}
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSavingTemplates}>Cancel</Button>
            <Button onClick={handleSaveDraft} disabled={isSavingTemplates}>
              {isSavingTemplates && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

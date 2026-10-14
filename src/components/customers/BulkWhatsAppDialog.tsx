import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, MessageCircle, RefreshCw, Upload } from "lucide-react";

import { whatsappCampaignService } from "@/api/services/whatsappCampaign.service";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface Template {
  id: string;
  label: string;
  body: string;
  requiresImage: boolean;
  variables: { index: number; source: string }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Customers currently loaded in the table (Client documents). */
  customers: any[];
  selectedIds: string[];
  onSent?: () => void;
}

// Sends an approved WhatsApp template to the selected customers by creating an
// "upload"-audience campaign (so it shows up in WhatsApp Marketing > Campaigns
// and Sent Messages) and triggering it immediately.
export function BulkWhatsAppDialog({ open, onOpenChange, customers, selectedIds, onSent }: Props) {
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setTemplateId("");
      setParams({});
      setImageFile(null);
    }
  }, [open]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: () => whatsappCampaignService.getTemplates(false),
    enabled: open,
  });
  const templates: Template[] = data?.data || [];
  const template = templates.find((t) => t.id === templateId);

  const { recipients, missingPhone, notLoaded } = useMemo(() => {
    const byId = new Map(customers.map((c) => [c._id, c]));
    const list: { name: string; mobile: string }[] = [];
    const seen = new Set<string>();
    let missing = 0;
    let off = 0;
    for (const id of selectedIds) {
      const c = byId.get(id);
      if (!c) {
        off++;
        continue;
      }
      const mobile = String(c.phonenumber || "").replace(/[^\d]/g, "");
      if (mobile.length < 10) {
        missing++;
        continue;
      }
      if (seen.has(mobile.slice(-10))) continue; // same number twice -> send once
      seen.add(mobile.slice(-10));
      list.push({ name: c.contact_person || c.company || "Customer", mobile });
    }
    return { recipients: list, missingPhone: missing, notLoaded: off };
  }, [customers, selectedIds]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const base: any = {
        name: `Customers bulk - ${new Date().toLocaleString()}`,
        templateId,
        templateParams: params,
        audienceSource: "upload",
        recipients,
        recurring: false,
      };
      let payload: any = base;
      if (imageFile) {
        payload = new FormData();
        Object.entries(base).forEach(([k, v]) =>
          payload.append(k, typeof v === "object" ? JSON.stringify(v) : String(v))
        );
        payload.append("image", imageFile);
      }
      const campaign: any = await whatsappCampaignService.createCampaign(payload);
      return whatsappCampaignService.triggerCampaign(campaign._id, recipients);
    },
    onSuccess: (res: any) => {
      toast({
        title: "WhatsApp broadcast started",
        description: `Sending to ${res?.targeted ?? recipients.length} customers. Track it under WhatsApp Marketing.`,
      });
      onOpenChange(false);
      onSent?.();
    },
    onError: (err: any) =>
      toast({
        title: "Could not send",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      }),
  });

  const canSend =
    recipients.length > 0 && !!templateId && (!template?.requiresImage || !!imageFile) && !sendMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" /> WhatsApp Bulk Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg bg-muted/40 border p-3 text-xs space-y-1">
            <p>
              <strong>{recipients.length}</strong> customer(s) will receive this message.
            </p>
            {missingPhone > 0 && (
              <p className="text-amber-600">{missingPhone} skipped: missing or invalid phone number.</p>
            )}
            {notLoaded > 0 && (
              <p className="text-amber-600">
                {notLoaded} selected on other pages skipped. Select them from the page they appear on or raise the
                rows-per-page.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Approved template</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {template && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{template.body}</p>}
          </div>

          {template?.requiresImage && (
            <div>
              <Label>Header image</Label>
              <label className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                {imageFile ? imageFile.name : "Choose an image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          )}

          {template?.variables
            ?.filter((v) => v.source === "campaign")
            .map((v) => (
              <div key={v.index}>
                <Label>Variable {`{{${v.index}}}`}</Label>
                <Input
                  value={params[String(v.index)] || ""}
                  onChange={(e) => setParams({ ...params, [String(v.index)]: e.target.value })}
                />
              </div>
            ))}
          {template?.variables?.some((v) => v.source !== "campaign") && (
            <p className="text-xs text-muted-foreground">Name variables are filled in per customer automatically.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => sendMutation.mutate()} disabled={!canSend} className="bg-green-600 hover:bg-green-700">
            {sendMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Send to {recipients.length}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

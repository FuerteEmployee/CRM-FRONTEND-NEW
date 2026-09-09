import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Upload } from "lucide-react";

import { whatsappCampaignService } from "@/api/services/whatsappCampaign.service";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  name: string;
  label: string;
  body: string;
  requiresImage: boolean;
  variables: { index: number; source: string }[];
}

interface Campaign {
  _id?: string;
  name: string;
  template_id: string;
  template_params: Record<string, string>;
  target_audience: string;
  audience_source: "leads" | "upload";
  recurring: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: Campaign | null;
}

export function CampaignForm({ open, onOpenChange, campaign }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!campaign?._id;

  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [targetAudience, setTargetAudience] = useState("");
  const [audienceSource, setAudienceSource] = useState<"leads" | "upload">("leads");
  const [recurring, setRecurring] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setName(campaign?.name || "");
      setTemplateId(campaign?.template_id || "");
      setTemplateParams(campaign?.template_params || {});
      setTargetAudience(campaign?.target_audience || "");
      setAudienceSource(campaign?.audience_source || "leads");
      setRecurring(campaign?.recurring || false);
      setImageFile(null);
    }
  }, [open, campaign]);

  const { data: templatesData, isLoading: templatesLoading, refetch } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: () => whatsappCampaignService.getTemplates(false),
    enabled: open,
  });
  const templates: Template[] = templatesData?.data || [];
  const selectedTemplate = templates.find((t) => t.id === templateId);

  const saveMutation = useMutation({
    mutationFn: () => {
      const needsFormData = !!imageFile;
      const payload: any = {
        name,
        templateId,
        templateParams,
        targetAudience,
        audienceSource,
        recurring,
      };

      if (needsFormData) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          formData.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
        });
        formData.append("image", imageFile as File);
        return isEdit
          ? whatsappCampaignService.updateCampaign(campaign!._id!, formData)
          : whatsappCampaignService.createCampaign(formData);
      }
      return isEdit
        ? whatsappCampaignService.updateCampaign(campaign!._id!, payload)
        : whatsappCampaignService.createCampaign(payload);
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Campaign updated" : "Campaign created" });
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-campaigns"] });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Campaign" : "New WhatsApp Campaign"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Campaign Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Template</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw className={`h-3.5 w-3.5 ${templatesLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Choose an approved template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{selectedTemplate.body}</p>
            )}
          </div>

          {selectedTemplate?.requiresImage && (
            <div>
              <Label>Header Image</Label>
              <label className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                {imageFile ? imageFile.name : "Choose an image"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          )}

          {selectedTemplate?.variables?.filter((v) => v.source === "campaign").map((v) => (
            <div key={v.index}>
              <Label>Variable {`{{${v.index}}}`}</Label>
              <Input
                value={templateParams[String(v.index)] || ""}
                onChange={(e) => setTemplateParams({ ...templateParams, [String(v.index)]: e.target.value })}
              />
            </div>
          ))}

          <div>
            <Label>Audience</Label>
            <Select value={audienceSource} onValueChange={(v) => setAudienceSource(v as "leads" | "upload")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="leads">Live Leads Query</SelectItem>
                <SelectItem value="upload">Uploaded List (set at trigger time)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {audienceSource === "leads" && (
            <div>
              <Label>Category / Tag filter (optional)</Label>
              <Input
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Matches against a lead's tags"
              />
            </div>
          )}

          <div className="flex items-center justify-between border rounded-md px-3 py-2">
            <div>
              <Label>Recurring monthly</Label>
              <p className="text-xs text-muted-foreground">Fires automatically on the 1st of every month</p>
            </div>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !name || !templateId}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

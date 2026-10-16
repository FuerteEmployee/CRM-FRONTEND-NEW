import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Loader2, RefreshCw, Upload, Users, X } from "lucide-react";
import * as XLSX from "xlsx";

import { whatsappCampaignService } from "@/api/services/whatsappCampaign.service";
import { leadService } from "@/api/services/lead.service";
import { useToast } from "@/hooks/use-toast";
import { AudiencePicker } from "./AudiencePicker";

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

interface Template {
  id: string;
  name: string;
  label: string;
  body: string;
  requiresImage: boolean;
  variables: { index: number; source: string }[];
}

type AudienceSource = "leads" | "selected_leads" | "customers" | "upload";

interface Recipient {
  name: string;
  mobile: string;
}

interface Campaign {
  _id?: string;
  name: string;
  template_id: string;
  template_params: Record<string, string>;
  target_audience: string;
  audience_source: AudienceSource;
  lead_status_ids?: string[];
  lead_source_ids?: string[];
  lead_ids?: string[];
  customer_ids?: string[];
  recipients?: Recipient[];
  recurring: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: Campaign | null;
}

const AUDIENCE_OPTIONS: { value: AudienceSource; label: string; hint: string }[] = [
  { value: "leads", label: "Leads — by filter", hint: "Every lead matching the status / source / tag filters below" },
  { value: "selected_leads", label: "Leads — pick from list", hint: "Only the leads you tick" },
  { value: "customers", label: "Customers", hint: "All active customers, or only the ones you tick" },
  { value: "upload", label: "Upload sheet (Excel / CSV)", hint: "Your own list with Name and Mobile columns" },
];

const asList = (res: any): any[] => (Array.isArray(res) ? res : res?.data || []);
const digits = (v: any) => String(v ?? "").replace(/\D/g, "");

// Reads the first sheet of an .xlsx/.xls/.csv file into {name, mobile} rows.
// The mobile column is any header containing mobile/phone/number/whatsapp;
// the name column is any header containing name.
const parseRecipientSheet = async (file: File) => {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: false });
  if (rows.length === 0) return { recipients: [] as Recipient[], skipped: 0, error: "The sheet is empty" };

  const headers = Object.keys(rows[0]);
  const mobileKey = headers.find((h) => /mobile|phone|number|whatsapp|contact/i.test(h));
  const nameKey = headers.find((h) => /name/i.test(h));
  if (!mobileKey) return { recipients: [], skipped: 0, error: "No Mobile column found (add a column named Mobile)" };

  const seen = new Set<string>();
  const recipients: Recipient[] = [];
  let skipped = 0;
  for (const row of rows) {
    const d = digits(row[mobileKey]);
    if (d.length < 10 || seen.has(d.slice(-10))) {
      skipped += 1;
      continue;
    }
    seen.add(d.slice(-10));
    recipients.push({ name: nameKey ? String(row[nameKey]).trim() : "", mobile: d });
  }
  return { recipients, skipped, error: "" };
};

const downloadSampleSheet = () => {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Name", "Mobile"],
    ["Ramesh Patel", "9876543210"],
    ["Priya Shah", "919812345678"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Recipients");
  XLSX.writeFile(wb, "whatsapp_recipients_sample.xlsx");
};

export function CampaignForm({ open, onOpenChange, campaign }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!campaign?._id;

  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [targetAudience, setTargetAudience] = useState("");
  const [audienceSource, setAudienceSource] = useState<AudienceSource>("leads");
  const [leadStatusIds, setLeadStatusIds] = useState<string[]>([]);
  const [leadSourceIds, setLeadSourceIds] = useState<string[]>([]);
  const [leadIds, setLeadIds] = useState<string[]>([]);
  const [customerIds, setCustomerIds] = useState<string[]>([]);
  const [customerMode, setCustomerMode] = useState<"all" | "pick">("all");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [sheetInfo, setSheetInfo] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setName(campaign?.name || "");
      setTemplateId(campaign?.template_id || "");
      setTemplateParams(campaign?.template_params || {});
      setTargetAudience(campaign?.target_audience || "");
      setAudienceSource(campaign?.audience_source || "leads");
      setLeadStatusIds((campaign?.lead_status_ids || []).map(String));
      setLeadSourceIds((campaign?.lead_source_ids || []).map(String));
      setLeadIds((campaign?.lead_ids || []).map(String));
      setCustomerIds((campaign?.customer_ids || []).map(String));
      setCustomerMode(campaign?.customer_ids?.length ? "pick" : "all");
      setRecipients(campaign?.recipients || []);
      setSheetInfo("");
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

  const { data: statusesRes } = useQuery({
    queryKey: ["lead-statuses"],
    queryFn: () => leadService.getStatuses(),
    enabled: open && audienceSource === "leads",
  });
  const { data: sourcesRes } = useQuery({
    queryKey: ["lead-sources"],
    queryFn: () => leadService.getSources(),
    enabled: open && audienceSource === "leads",
  });
  const leadStatuses = asList(statusesRes);
  const leadSources = asList(sourcesRes);

  // Only the fields of the chosen audience are sent, so switching audience
  // never leaves a stale list behind.
  const audiencePayload = useMemo(() => {
    const base: Record<string, any> = { audienceSource };
    if (audienceSource === "leads") {
      Object.assign(base, { targetAudience, leadStatusIds, leadSourceIds });
    } else if (audienceSource === "selected_leads") {
      base.leadIds = leadIds;
    } else if (audienceSource === "customers") {
      base.customerIds = customerMode === "pick" ? customerIds : [];
    } else {
      base.recipients = recipients;
    }
    return base;
  }, [audienceSource, targetAudience, leadStatusIds, leadSourceIds, leadIds, customerIds, customerMode, recipients]);

  const audienceIncomplete =
    (audienceSource === "selected_leads" && leadIds.length === 0) ||
    (audienceSource === "customers" && customerMode === "pick" && customerIds.length === 0) ||
    (audienceSource === "upload" && recipients.length === 0);

  // Debounced, read-only "N will receive" count, computed by the backend exactly
  // as a real send would (dedupe, opt-outs, filters).
  const [previewKey, setPreviewKey] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setPreviewKey(JSON.stringify({ ...audiencePayload, templateId })), 400);
    return () => clearTimeout(t);
  }, [audiencePayload, templateId]);
  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: ["wa-audience-preview", previewKey],
    queryFn: () => whatsappCampaignService.previewAudience(JSON.parse(previewKey)),
    enabled: open && !!previewKey && !audienceIncomplete,
  });

  const handleSheet = async (file?: File | null) => {
    if (!file) return;
    try {
      const { recipients: parsed, skipped, error } = await parseRecipientSheet(file);
      if (error) {
        toast({ title: "Could not read the sheet", description: error, variant: "destructive" });
        return;
      }
      setRecipients(parsed);
      setSheetInfo(`${file.name}: ${parsed.length} numbers${skipped ? `, ${skipped} skipped (empty, invalid or duplicate)` : ""}`);
    } catch (err: any) {
      toast({ title: "Could not read the sheet", description: err.message, variant: "destructive" });
    }
  };

  const toggleIn = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = { name, templateId, templateParams, recurring, ...audiencePayload };

      if (imageFile) {
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
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
              <div className="flex items-center gap-2">
                <label className="flex flex-1 items-center gap-2 border rounded-md px-3 py-2 cursor-pointer text-sm text-muted-foreground min-w-0">
                  <Upload className="h-4 w-4 shrink-0" />
                  <span className="truncate">{imageFile ? `${imageFile.name} — click to change` : "Choose an image"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => { setImageFile(e.target.files?.[0] || null); e.target.value = ""; }}
                  />
                </label>
                {imageFile && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setImageFile(null)}>
                    <X className="h-4 w-4 mr-1" /> Remove
                  </Button>
                )}
              </div>
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
            <Label>Send to</Label>
            <Select value={audienceSource} onValueChange={(v) => setAudienceSource(v as AudienceSource)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {AUDIENCE_OPTIONS.find((o) => o.value === audienceSource)?.hint}
            </p>
          </div>

          {audienceSource === "leads" && (
            <div className="space-y-3 border rounded-md p-3">
              {leadStatuses.length > 0 && (
                <div>
                  <Label className="text-xs">Lead status (none ticked = all)</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {leadStatuses.map((s: any) => (
                      <Badge
                        key={s._id}
                        variant={leadStatusIds.includes(s._id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleIn(leadStatusIds, setLeadStatusIds, s._id)}
                      >
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {leadSources.length > 0 && (
                <div>
                  <Label className="text-xs">Lead source (none ticked = all)</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {leadSources.map((s: any) => (
                      <Badge
                        key={s._id}
                        variant={leadSourceIds.includes(s._id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleIn(leadSourceIds, setLeadSourceIds, s._id)}
                      >
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs">Tag filter (optional)</Label>
                <Input
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Matches against a lead's tags"
                />
              </div>
            </div>
          )}

          {audienceSource === "selected_leads" && (
            <AudiencePicker kind="leads" selected={leadIds} onChange={setLeadIds} />
          )}

          {audienceSource === "customers" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={customerMode === "all" ? "default" : "outline"}
                  onClick={() => setCustomerMode("all")}
                >
                  All active customers
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={customerMode === "pick" ? "default" : "outline"}
                  onClick={() => setCustomerMode("pick")}
                >
                  Pick customers
                </Button>
              </div>
              {customerMode === "pick" && (
                <AudiencePicker kind="customers" selected={customerIds} onChange={setCustomerIds} />
              )}
            </div>
          )}

          {audienceSource === "upload" && (
            <div className="space-y-2 border rounded-md p-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  {recipients.length ? "Replace sheet" : "Choose Excel / CSV file"}
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      handleSheet(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={downloadSampleSheet}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Sample sheet
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Columns: <strong>Name</strong>, <strong>Mobile</strong> (10 digits, or with 91 country code).
              </p>
              {sheetInfo && <p className="text-xs">{sheetInfo}</p>}
              {!sheetInfo && recipients.length > 0 && (
                <p className="text-xs">{recipients.length} numbers saved on this campaign</p>
              )}
              {recipients.length > 0 && (
                <div className="max-h-32 overflow-y-auto text-xs border rounded">
                  {recipients.slice(0, 50).map((r, i) => (
                    <div key={i} className="flex justify-between px-2 py-1 odd:bg-muted/40">
                      <span className="truncate">{r.name || "—"}</span>
                      <span className="text-muted-foreground">{r.mobile}</span>
                    </div>
                  ))}
                  {recipients.length > 50 && (
                    <div className="px-2 py-1 text-muted-foreground">…and {recipients.length - 50} more</div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            {audienceIncomplete ? (
              <span className="text-muted-foreground">Choose who should receive this campaign</span>
            ) : previewLoading || !preview ? (
              <span className="text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Counting recipients…
              </span>
            ) : (
              <span>
                <strong>{preview.count}</strong> {preview.count === 1 ? "person" : "people"} will receive this
                <span className="text-muted-foreground"> (duplicates and opted-out numbers removed)</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between border rounded-md px-3 py-2">
            <div>
              <Label>Recurring monthly</Label>
              <p className="text-xs text-muted-foreground">Fires automatically on the 1st of every month</p>
            </div>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name || !templateId || audienceIncomplete}
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

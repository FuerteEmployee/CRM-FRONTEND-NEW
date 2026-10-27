import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useSettings } from "@/context/SettingsContext";
import { purchaseOrderService } from "@/api/services/purchaseOrder.service";
import { buildPoPdf, PO_PLACEHOLDERS } from "./poPdf";
import { buildProformaPdf } from "./proformaPdf";
import { amountInWords, computeProforma } from "./proformaCalc";
import { daysOnBlur, emailError, gstinError, phoneError, poPrefixError, validDaysError } from "./poValidation";

// PO Settings (round 28): the company's own details for the PO / proforma
// PDFs (Q4 — prefilled from the CRM company profile until saved), PO numbers
// "<prefix>/<nn>/<FY>" (R2), the Purchase PO pricing rule (R6: price only up
// is fixed; the margin minimum is pointed out to the approver), the supplier
// (Brady) block, proforma numbering, the WhatsApp template. The PDF layouts
// are fixed (F1 / F3) — "Preview" shows them with made-up sample lines.

const fy = (() => {
  const d = new Date(Date.now() + 330 * 60000);
  const start = d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return `${String(start % 100).padStart(2, "0")}-${String((start + 1) % 100).padStart(2, "0")}`;
})();

const COMPANY_FIELDS: [string, string, boolean?][] = [
  ["name", "Company name *"],
  ["line2", "Second line (e.g. what you do)"],
  ["gstin", "GSTIN"],
  ["state", "State (for IGST / CGST+SGST on proformas)"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["logo_url", "Logo URL (empty = the CRM logo)"],
  ["address", "Address", true],
];
const BANK_FIELDS: [string, string][] = [
  ["bank_account_name", "Account name"],
  ["bank_name_branch", "Bank / Branch"],
  ["bank_account_no", "Account no."],
  ["bank_ifsc", "IFSC"],
];
const TERM_FIELDS: [string, string][] = [
  ["payment_terms", "Payment terms (proforma)"],
  ["delivery_terms", "Delivery time (proforma)"],
];

// Made-up sample documents for the previews (no real data).
const samplePo = (form: any) => ({
  type: "purchase",
  po_number: `${form.divisions?.[0]?.purchase_prefix || "PPO"}/01/${fy}`,
  po_date: new Date().toISOString(),
  supplier: form.supplier,
  notes: "Sample notes",
  items: [
    { item_code: "SAMPLE-CAT-1", y_code: "Y0000001", hsn: "84439959", unit: "Nos", qty: 2, rate: 1000, amount: 2000, tax_rate: 18 },
    { item_code: "SAMPLE-CAT-2", y_code: "Y0000002", hsn: "39199090", unit: "Nos", qty: 1, rate: 500, amount: 500, tax_rate: 18 },
  ],
  totals: { subtotal: 2500, tax_total: 450, grand_total: 2950 },
});
const sampleProforma = (form: any) => {
  const { lines, totals } = computeProforma([
    { ref_no: "SAMPLE-CAT-1", description: "Y0000001", hsn: "84439959", qty: 2, unit: "Nos", rate: 1250, disc_pct: 0, gst_pct: 18 },
    { ref_no: "", description: "Freight / packing", hsn: "", qty: 1, unit: "", rate: 200, disc_pct: 0, gst_pct: 18, is_extra: true },
  ], "igst", 500);
  return {
    number: `${form.proforma?.prefix || ""}0001`, date: new Date().toISOString(), valid_until: new Date(Date.now() + 15 * 86400000).toISOString(),
    customer_po_number: "SAMPLE-PO-1", tax_type: "igst", bill_to: { name: "Sample Customer", address: "Sample address", gstin: "", email: "customer@example.test", phone: "9000000000" },
    lines, totals, amount_in_words: amountInWords(totals.grand_total), seller: form.company,
  };
};

// error (round 29, S4): the same message the server would give, under the field.
const Field = ({ label, children, hint, error }: { label: string; children: React.ReactNode; hint?: string; error?: string }) => (
  <div className="space-y-1.5 min-w-0">
    <Label className="text-xs font-semibold">{label}</Label>
    {children}
    {error ? <p className="text-[11px] text-red-700">{error}</p> : hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

// S4: per-field checks (same rules as the server).
const companyError = (k: string, v: string) =>
  k === "name" ? (String(v || "").trim() ? "" : "Company details: the company name is required")
  : k === "gstin" ? gstinError(v, { label: "Company GSTIN" })
  : k === "phone" ? phoneError(v, { label: "Company phone" })
  : k === "email" ? emailError(v, { label: "Company email" })
  : "";
const supplierError = (k: string, v: string) =>
  k === "name" ? (String(v || "").trim() ? "" : "The supplier needs a name")
  : k === "gstin" ? gstinError(v, { label: "Supplier GSTIN" })
  : k === "phone" ? phoneError(v, { label: "Supplier phone" })
  : k === "whatsapp" ? phoneError(v, { label: "Supplier WhatsApp number" })
  : k === "email" ? emailError(v, { label: "Supplier email" })
  : "";

export const PoSettingsTab = ({ settings }: { settings: any }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, user } = usePermissions();
  const { getSetting } = useSettings();
  const canEdit = !!(isAdmin || user?.admin === true || user?.is_superadmin);
  const [form, setForm] = useState<any>(null);
  const [companyDirty, setCompanyDirty] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  // S5: "Valid for (days)" keeps what is typed; the number is stored on blur.
  const [daysText, setDaysText] = useState("15");
  // S1: the series list for "Default series".
  const { data: seriesData } = useQuery<any>({ queryKey: ["po-item-series", "all"], queryFn: () => purchaseOrderService.itemSeries() });

  useEffect(() => {
    if (settings) {
      setForm(JSON.parse(JSON.stringify(settings)));
      setCompanyDirty(false);
      setDaysText(String(settings.proforma?.valid_days ?? 15));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const { prefilled, saved_at, ...company } = form.company || {};
      return purchaseOrderService.updateSettings({
        divisions: form.divisions,
        rules: { purchase: { ...form.rules.purchase } },
        supplier: form.supplier,
        whatsapp: form.whatsapp,
        proforma: { ...form.proforma, valid_days: daysOnBlur(daysText) },
        default_series: form.default_series ?? "",
        ...(companyDirty || !form.company?.prefilled ? { company } : {}),
      });
    },
    onSuccess: (saved: any) => {
      queryClient.setQueryData(["po-settings"], saved);
      toast({ title: "PO settings saved" });
    },
    onError: (err: any) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  if (!form) return null;

  const set = (path: string, value: any) => {
    if (path.startsWith("company.")) setCompanyDirty(true);
    setForm((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let obj = next;
      keys.slice(0, -1).forEach((k) => (obj = obj[k] ??= {}));
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const showPreview = async (kind: "po" | "proforma") => {
    setPreviewing(true);
    try {
      const doc = kind === "po"
        ? await buildPoPdf(samplePo(form), form.company, { logoUrl: getSetting("compLogoLight") })
        : await buildProformaPdf(sampleProforma(form), { logoUrl: getSetting("compLogoLight") });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(doc.output("blob")));
    } finally {
      setPreviewing(false);
    }
  };

  const disabled = !canEdit;
  const r = form.rules?.purchase || {};
  const daysError = validDaysError(daysOnBlur(daysText));
  const divisionErrors = (form.divisions || []).map((d: any) => ({
    name: String(d.name || "").trim() ? "" : "Every division needs a name",
    prefix: poPrefixError(d.purchase_prefix, { label: `Division "${d.name || ""}": PO number prefix` }),
  }));
  const formErrors = [
    ...COMPANY_FIELDS.map(([k]) => (companyDirty || !form.company?.prefilled ? companyError(k, form.company?.[k] || "") : "")),
    ...["name", "gstin", "phone", "whatsapp", "email"].map((k) => supplierError(k, form.supplier?.[k] || "")),
    ...divisionErrors.flatMap((e: any) => [e.name, e.prefix]),
    daysError,
  ].filter(Boolean);
  const seriesList: { name: string; count: number }[] = seriesData?.series || [];

  return (
    <div className="space-y-5">
      {!canEdit && <p className="text-sm text-muted-foreground">Only an admin can change PO settings.</p>}

      <Card>
        <CardHeader><CardTitle className="text-base">Company details for PO and proforma</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {form.company?.prefilled && (
            <p className="text-xs text-amber-700">Filled in from your company profile (Setup › Settings). Check them and press Save — the PDFs print only what is here.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {COMPANY_FIELDS.map(([k, label, wide]) => (
              <div key={k} className={wide ? "md:col-span-3" : ""}>
                <Field label={label} error={canEdit ? companyError(k, form.company?.[k] || "") : ""}>
                  {wide
                    ? <Textarea rows={2} value={form.company?.[k] || ""} disabled={disabled} onChange={(e) => set(`company.${k}`, e.target.value)} />
                    : <Input value={form.company?.[k] || ""} disabled={disabled} onChange={(e) => set(`company.${k}`, e.target.value)} />}
                </Field>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {BANK_FIELDS.map(([k, label]) => (
              <Field key={k} label={label}><Input value={form.company?.[k] || ""} disabled={disabled} onChange={(e) => set(`company.${k}`, e.target.value)} /></Field>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TERM_FIELDS.map(([k, label]) => (
              <Field key={k} label={label}><Input value={form.company?.[k] || ""} disabled={disabled} onChange={(e) => set(`company.${k}`, e.target.value)} /></Field>
            ))}
            <Field label="Terms printed on the PO">
              <Textarea rows={2} value={form.company?.po_terms || ""} disabled={disabled} onChange={(e) => set("company.po_terms", e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => showPreview("po")} disabled={previewing}>
              {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Preview PO PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => showPreview("proforma")} disabled={previewing}>
              <Eye className="h-4 w-4" /> Preview proforma PDF
            </Button>
          </div>
          {previewUrl && <iframe title="PDF preview" src={previewUrl} className="w-full h-[700px] rounded-md border" />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing rule (Purchase PO)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-sm space-y-1">
            <p>The selling price to the customer can only go <b>up</b> — never below the End User Price (or the Distributor Price for a customer set to "Distributor" in the PO editor).</p>
            <p className="text-xs text-muted-foreground">Every PO goes to an approver. A raised price, a margin under the minimum, or a cost taken from the Distributor Price is shown to them.</p>
          </div>
          <Field label="Minimum margin % (shown to the approver)" hint="Empty = no check">
            <Input type="number" min={0} max={100} value={r.min_margin_pct ?? ""} disabled={disabled}
              onChange={(e) => set("rules.purchase.min_margin_pct", e.target.value.trim() === "" ? null : Number(e.target.value))} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">PO numbers</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            A PO number looks like <b>{form.divisions?.[0]?.purchase_prefix || "DA"}/07/{fy}</b> — prefix / running number / financial year. The running number starts again every 1 April.
          </p>
          {form.divisions.map((d: any, i: number) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
              <Field label="Division name *" error={canEdit ? divisionErrors[i]?.name : ""}><Input value={d.name} disabled={disabled} onChange={(e) => set(`divisions.${i}.name`, e.target.value)} /></Field>
              <Field label="PO number prefix *" hint="1 to 10 letters, digits or -" error={canEdit ? divisionErrors[i]?.prefix : ""}>
                <Input value={d.purchase_prefix} maxLength={10} disabled={disabled} onChange={(e) => set(`divisions.${i}.purchase_prefix`, e.target.value)} />
              </Field>
              <div className="flex items-center gap-2 h-10">
                <Switch checked={d.active !== false} disabled={disabled} onCheckedChange={(on) => set(`divisions.${i}.active`, on)} />
                <span className="text-xs">Active</span>
              </div>
              <Button variant="ghost" size="icon" aria-label={`Remove division ${d.name}`} disabled={disabled || form.divisions.length <= 1}
                onClick={() => set("divisions", form.divisions.filter((_: any, idx: number) => idx !== i))}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-2" disabled={disabled}
            onClick={() => set("divisions", [...form.divisions, { key: "", name: "", purchase_prefix: "", sales_prefix: "", active: true }])}>
            <Plus className="h-4 w-4" /> Add division
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Supplier (printed on every Purchase PO)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[["name", "Name *"], ["gstin", "GSTIN"], ["state", "State"], ["phone", "Phone"], ["whatsapp", "WhatsApp number (PO PDFs go here)"], ["email", "Email"]].map(([k, label]) => (
            <Field key={k} label={label} error={canEdit ? supplierError(k, form.supplier?.[k] || "") : ""}><Input value={form.supplier?.[k] || ""} disabled={disabled} onChange={(e) => set(`supplier.${k}`, e.target.value)} /></Field>
          ))}
          <div className="md:col-span-3">
            <Field label="Address"><Textarea rows={2} value={form.supplier?.address || ""} disabled={disabled} onChange={(e) => set("supplier.address", e.target.value)} /></Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Proforma invoices</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Number prefix" hint={`Numbers look like ${form.proforma?.prefix || ""}0197 and start again every 1 April.`}>
            <Input value={form.proforma?.prefix || ""} disabled={disabled} onChange={(e) => set("proforma.prefix", e.target.value)} />
          </Field>
          <Field label="Valid for (days) *" hint="1 to 365" error={canEdit ? daysError : ""}>
            <Input inputMode="numeric" aria-label="Valid for (days)" value={daysText} disabled={disabled}
              onChange={(e) => setDaysText(e.target.value)}
              onBlur={() => { const v = daysOnBlur(daysText); setDaysText(String(v)); set("proforma.valid_days", v); }} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">PO Items</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Default series" hint="PO Items and the PO editor's item picker open on this series. A series with no items falls back to All series.">
            <Select value={form.default_series ? form.default_series : "__all__"} disabled={disabled} onValueChange={(v) => set("default_series", v === "__all__" ? "" : v)}>
              <SelectTrigger aria-label="Default series"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All series</SelectItem>
                {form.default_series && !seriesList.some((s) => s.name === form.default_series) && (
                  <SelectItem value={form.default_series}>{form.default_series} (no items yet)</SelectItem>
                )}
                {seriesList.map((s) => <SelectItem key={s.name} value={s.name}>{s.name} ({s.count})</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">WhatsApp template (outside the 24-hour window)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Template name" hint="A Meta-approved template with a DOCUMENT header.">
            <Input value={form.whatsapp?.template_name || ""} disabled={disabled} onChange={(e) => set("whatsapp.template_name", e.target.value)} />
          </Field>
          <Field label="Language code">
            <Input value={form.whatsapp?.template_language || "en"} disabled={disabled} onChange={(e) => set("whatsapp.template_language", e.target.value)} />
          </Field>
          <Field label="Body values, one per line" hint={`Fills {{1}}, {{2}}… in order. Placeholders: ${PO_PLACEHOLDERS.join(" ")}`}>
            <Textarea rows={3} disabled={disabled} value={(form.whatsapp?.body_params || []).join("\n")}
              onChange={(e) => set("whatsapp.body_params", e.target.value.split("\n").filter((l) => l.trim() !== ""))} />
          </Field>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <div className="flex flex-col items-end gap-1">
            <Button className="gap-2" disabled={saveMutation.isPending || formErrors.length > 0} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save PO settings
            </Button>
            {formErrors.length > 0 && <p className="text-[11px] text-red-700">Fix the fields marked in red first ({formErrors.length}).</p>}
          </div>
        </div>
      )}
    </div>
  );
};

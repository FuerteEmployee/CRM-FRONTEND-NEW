import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Eye, Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useSettings } from "@/context/SettingsContext";
import { purchaseOrderService } from "@/api/services/purchaseOrder.service";
import { PRICE_FIELD_LABEL } from "./poCalc";
import { buildPoPdf, PO_PLACEHOLDERS } from "./poPdf";

const LIST_PRICE_FIELDS = ["master_price", "distributor_price", "end_customer_price"];

// A made-up PO so the format can be previewed before any real PO exists.
const samplePo = (settings: any, type: "purchase" | "sales") => ({
  type,
  po_number: `${type === "purchase" ? settings.divisions?.[0]?.purchase_prefix || "PPO" : settings.divisions?.[0]?.sales_prefix || "SPO"}-${new Date().getFullYear()}-0001`,
  po_date: new Date().toISOString(),
  expected_date: new Date(Date.now() + 7 * 86400000).toISOString(),
  supplier: settings.supplier,
  customer_snapshot: { name: "Sample Customer Pvt Ltd", address: "Ahmedabad, Gujarat", gstin: "24AAAAA0000A1Z5", phone: "9876543210" },
  tax_mode: "intra",
  notes: "Sample notes",
  items: [
    { item_code: "BRD-001", name: "Sample label cartridge", hsn: "84439959", unit: "Nos", qty: 10, rate: type === "purchase" ? 950 : 1350, discount_pct: 0, tax_rate: 18, amount: type === "purchase" ? 9500 : 13500 },
    { item_code: "BRD-002", name: "Sample safety sign", hsn: "49111090", unit: "Nos", qty: 5, rate: type === "purchase" ? 200 : 300, discount_pct: 5, tax_rate: 12, amount: type === "purchase" ? 1000 : 1500 },
  ],
  totals: type === "purchase"
    ? { subtotal: 10500, cgst: 915, sgst: 915, igst: 0, grand_total: 12330 }
    : { subtotal: 15000, cgst: 1305, sgst: 1305, igst: 0, grand_total: 17610 },
});

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold">{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

export const PoSettingsTab = ({ settings }: { settings: any }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, user } = usePermissions();
  const { getSetting } = useSettings();
  const canEdit = !!(isAdmin || user?.admin === true || user?.is_superadmin);
  const [form, setForm] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"purchase" | "sales">("purchase");
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (settings) setForm(JSON.parse(JSON.stringify(settings)));
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () =>
      purchaseOrderService.updateSettings({
        divisions: form.divisions,
        rules: form.rules,
        supplier: form.supplier,
        whatsapp: form.whatsapp,
        format: form.format,
      }),
    onSuccess: (saved: any) => {
      queryClient.setQueryData(["po-settings"], saved);
      toast({ title: "PO settings saved", description: `PO format is now version ${saved.format_version}.` });
    },
    onError: (err: any) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  if (!form) return null;

  const set = (path: string, value: any) =>
    setForm((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let obj = next;
      keys.slice(0, -1).forEach((k) => (obj = obj[k] ??= {}));
      obj[keys[keys.length - 1]] = value;
      return next;
    });

  const setRule = (type: string, key: string, value: any) => set(`rules.${type}.${key}`, value);
  const pctValue = (v: any) => (v === null || v === undefined ? "" : v);
  const pctInput = (v: string) => (v.trim() === "" ? null : Number(v));

  const moveColumn = (i: number, dir: -1 | 1) => {
    const cols = [...form.format.columns];
    const j = i + dir;
    if (j < 0 || j >= cols.length) return;
    [cols[i], cols[j]] = [cols[j], cols[i]];
    set("format.columns", cols);
  };

  const showPreview = async () => {
    setPreviewing(true);
    try {
      const doc = await buildPoPdf(samplePo(form, previewType), form.format, {
        logoUrl: getSetting("compLogoLight"),
        companyName: getSetting("companyName"),
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(doc.output("blob")));
    } finally {
      setPreviewing(false);
    }
  };

  const disabled = !canEdit;

  return (
    <div className="space-y-5">
      {!canEdit && <p className="text-sm text-muted-foreground">Only an admin can change PO settings.</p>}

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing rules</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(["purchase", "sales"] as const).map((type) => {
            const r = form.rules[type];
            return (
              <div key={type} className="space-y-3 rounded-md border p-4">
                <div className="font-semibold text-sm">{type === "purchase" ? "Purchase PO" : "Sales PO"}</div>
                <Field label="List price is" hint="Discount is measured against this price.">
                  <Select value={r.list_price_field} onValueChange={(v) => setRule(type, "list_price_field", v)} disabled={disabled}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LIST_PRICE_FIELDS.map((f) => <SelectItem key={f} value={f}>{PRICE_FIELD_LABEL[f]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Max discount %" hint="Empty = no limit">
                    <Input type="number" min={0} max={100} value={pctValue(r.max_discount_pct)} disabled={disabled}
                      onChange={(e) => setRule(type, "max_discount_pct", pctInput(e.target.value))} />
                  </Field>
                  <Field label="Min margin %" hint="Empty = no check">
                    <Input type="number" min={0} max={100} value={pctValue(r.min_margin_pct)} disabled={disabled}
                      onChange={(e) => setRule(type, "min_margin_pct", pctInput(e.target.value))} />
                  </Field>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Selling below list price needs approval</Label>
                  <Switch checked={r.allow_below_list === false} disabled={disabled}
                    onCheckedChange={(on) => setRule(type, "allow_below_list", !on)} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Divisions and PO numbers</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Each division keeps its own POs and number series, e.g. PPO-2026-0001. A division that already has POs can be switched off but not removed.</p>
          {form.divisions.map((d: any, i: number) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 items-end">
              <Field label="Name">
                <Input value={d.name} disabled={disabled} onChange={(e) => set(`divisions.${i}.name`, e.target.value)} />
              </Field>
              <Field label="Purchase PO prefix">
                <Input value={d.purchase_prefix} disabled={disabled} onChange={(e) => set(`divisions.${i}.purchase_prefix`, e.target.value)} />
              </Field>
              <Field label="Sales PO prefix">
                <Input value={d.sales_prefix} disabled={disabled} onChange={(e) => set(`divisions.${i}.sales_prefix`, e.target.value)} />
              </Field>
              <div className="flex items-center gap-2 h-10">
                <Switch checked={d.active !== false} disabled={disabled} onCheckedChange={(on) => set(`divisions.${i}.active`, on)} />
                <span className="text-xs">Active</span>
              </div>
              <Button variant="ghost" size="icon" disabled={disabled || form.divisions.length <= 1}
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
        <CardHeader><CardTitle className="text-base">Supplier (fixed on every Purchase PO)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            ["name", "Name"], ["gstin", "GSTIN"], ["state", "State"],
            ["phone", "Phone"], ["whatsapp", "WhatsApp number (PO PDFs go here)"], ["email", "Email"],
          ].map(([k, label]) => (
            <Field key={k} label={label}>
              <Input value={form.supplier?.[k] || ""} disabled={disabled} onChange={(e) => set(`supplier.${k}`, e.target.value)} />
            </Field>
          ))}
          <div className="md:col-span-3">
            <Field label="Address">
              <Textarea rows={2} value={form.supplier?.address || ""} disabled={disabled} onChange={(e) => set("supplier.address", e.target.value)} />
            </Field>
          </div>
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
          <Field label="Body values, one per line" hint="Fills {{1}}, {{2}}… in order. Placeholders allowed, e.g. {{po_number}}.">
            <Textarea rows={3} disabled={disabled} value={(form.whatsapp?.body_params || []).join("\n")}
              onChange={(e) => set("whatsapp.body_params", e.target.value.split("\n").filter((l) => l.trim() !== ""))} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">PO format (PDF) — version {form.format_version}</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={previewType} onValueChange={(v) => setPreviewType(v as any)}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase">Purchase PO</SelectItem>
                <SelectItem value="sales">Sales PO</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2" onClick={showPreview} disabled={previewing}>
              {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Preview
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-xs text-muted-foreground">
            Saving a changed format creates a new version. New POs use it; existing POs keep printing with the version they were made with.
            Placeholders you can use in any text: {PO_PLACEHOLDERS.join(" ")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Purchase PO title">
              <Input value={form.format.title_purchase} disabled={disabled} onChange={(e) => set("format.title_purchase", e.target.value)} />
            </Field>
            <Field label="Sales PO title">
              <Input value={form.format.title_sales} disabled={disabled} onChange={(e) => set("format.title_sales", e.target.value)} />
            </Field>
            <Field label="Company name" hint="Empty = the company name from Settings.">
              <Input value={form.format.header.company_name} disabled={disabled} onChange={(e) => set("format.header.company_name", e.target.value)} />
            </Field>
            <Field label="GSTIN">
              <Input value={form.format.header.gstin} disabled={disabled} onChange={(e) => set("format.header.gstin", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={form.format.header.phone} disabled={disabled} onChange={(e) => set("format.header.phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <Input value={form.format.header.email} disabled={disabled} onChange={(e) => set("format.header.email", e.target.value)} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Address">
                <Textarea rows={2} value={form.format.header.address} disabled={disabled} onChange={(e) => set("format.header.address", e.target.value)} />
              </Field>
            </div>
            <Field label="Branding line">
              <Input value={form.format.branding_line} disabled={disabled} onChange={(e) => set("format.branding_line", e.target.value)} />
            </Field>
            <div className="flex flex-col gap-3 justify-end">
              <div className="flex items-center gap-2">
                <Switch checked={form.format.header.show_logo !== false} disabled={disabled} onCheckedChange={(on) => set("format.header.show_logo", on)} />
                <span className="text-sm">Show company logo</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.format.show_supplier_block !== false} disabled={disabled} onCheckedChange={(on) => set("format.show_supplier_block", on)} />
                <span className="text-sm">Show supplier block on Purchase PO</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Item table columns (order and visibility)</Label>
            <div className="rounded-md border divide-y">
              {form.format.columns.map((c: any, i: number) => (
                <div key={c.key} className="flex items-center gap-3 px-3 py-2">
                  <Switch checked={c.visible} disabled={disabled} onCheckedChange={(on) => set(`format.columns.${i}.visible`, on)} />
                  <Input className="h-8 max-w-[220px]" value={c.label} disabled={disabled} onChange={(e) => set(`format.columns.${i}.label`, e.target.value)} />
                  <span className="text-[11px] text-muted-foreground flex-1">{c.key}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={disabled || i === 0} onClick={() => moveColumn(i, -1)}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={disabled || i === form.format.columns.length - 1} onClick={() => moveColumn(i, 1)}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ["terms", "Terms & conditions"],
              ["payment_terms", "Payment terms"],
              ["delivery_terms", "Delivery terms"],
              ["bank_details", "Bank details"],
            ].map(([k, label]) => (
              <Field key={k} label={label}>
                <Textarea rows={3} value={form.format.footer[k] || ""} disabled={disabled} onChange={(e) => set(`format.footer.${k}`, e.target.value)} />
              </Field>
            ))}
            <Field label="Signature label">
              <Input value={form.format.footer.signature_label || ""} disabled={disabled} onChange={(e) => set("format.footer.signature_label", e.target.value)} />
            </Field>
          </div>

          {previewUrl && <iframe title="PO preview" src={previewUrl} className="w-full h-[700px] rounded-md border" />}
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button className="gap-2" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save PO settings
          </Button>
        </div>
      )}
    </div>
  );
};

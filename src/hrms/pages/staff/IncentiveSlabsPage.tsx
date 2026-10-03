import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Layers, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/hrms/components/common/PageHeader";
import { Button } from "@/hrms/components/ui/button";
import { Badge } from "@/hrms/components/ui/badge";
import { Card, CardContent } from "@/hrms/components/ui/card";
import { Input } from "@/hrms/components/ui/input";
import { Label } from "@/hrms/components/ui/label";
import { DataTable } from "@/hrms/components/common/DataTable";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/hrms/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/hrms/components/ui/sheet";
import { Switch } from "@/hrms/components/ui/switch";
import { toast } from "@/hrms/hooks/use-toast";
import { useConfirm } from "@/hrms/contexts/ConfirmContext";
import {
  incentiveRuleService, IncentiveRule, SlabEntry,
} from "@/hrms/services/incentiveRuleService";

const DEFAULT_SLABS: SlabEntry[] = [
  { minPct: 0,   maxPct: 80,   type: "percentage", value: 0   },
  { minPct: 80,  maxPct: 100,  type: "percentage", value: 0.5 },
  { minPct: 100, maxPct: 120,  type: "percentage", value: 1.0 },
  { minPct: 120, maxPct: null, type: "percentage", value: 1.5 },
];

/**
 * The IncentiveRule API type allows its reference fields to be either a plain id
 * or a populated `{ _id, name }` object, because the backend populates them on
 * read. The FORM only ever holds plain ids — openEdit normalises populated
 * objects on load — so it gets its own narrowed type.
 */
type IncentiveRuleForm = Omit<
  IncentiveRule,
  "_id" | "createdAt" | "appliesToRoleId" | "categoryId" | "brandId"
> & {
  appliesToRoleId: string | null;
  categoryId: string | null;
  brandId: string | null;
};

const EMPTY_RULE: IncentiveRuleForm = {
  name: "",
  description: "",
  appliesTo: "all",
  appliesToRoleId: null,
  scopeType: "all",
  categoryId: null,
  brandId: null,
  conditions: { minRevenue: 0, minMarginPercent: 0 },
  rewardType: "slab",
  rewardValue: 0,
  slabs: DEFAULT_SLABS,
  active: true,
};

export default function IncentiveSlabsPage() {
  const confirm = useConfirm();
  const [rules, setRules]       = useState<IncentiveRule[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing]   = useState<IncentiveRule | null>(null);
  const [form, setForm]         = useState({ ...EMPTY_RULE });

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await incentiveRuleService.getAll();
      setRules(data);
    } catch {
      toast({ title: "Error", description: "Failed to load incentive rules", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_RULE, slabs: DEFAULT_SLABS.map(s => ({ ...s })) });
    setSheetOpen(true);
  };

  const openEdit = (rule: IncentiveRule) => {
    setEditing(rule);
    setForm({
      name:             rule.name,
      description:      rule.description || "",
      appliesTo:        rule.appliesTo,
      appliesToRoleId:  null,
      scopeType:        "all",
      categoryId:       null,
      brandId:          null,
      conditions:       { ...rule.conditions },
      rewardType:       rule.rewardType,
      rewardValue:      rule.rewardValue,
      slabs:            rule.slabs.map(s => ({ ...s })),
      active:           rule.active,
    });
    setSheetOpen(true);
  };

  const handleDelete = async (rule: IncentiveRule) => {
    const ok = await confirm({
      title: "Delete Incentive Rule",
      description: `"${rule.name}" will be permanently deleted.`,
      variant: "danger",
    });
    if (!ok) return;
    try {
      await incentiveRuleService.delete(rule._id!);
      toast({ title: "Deleted", description: `${rule.name} deleted.` });
      fetchRules();
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const handleToggleActive = async (rule: IncentiveRule) => {
    try {
      await incentiveRuleService.update(rule._id!, { active: !rule.active });
      fetchRules();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  // Slab helpers
  const updateSlab = (i: number, field: keyof SlabEntry, val: any) => {
    setForm(f => {
      const slabs = f.slabs.map((s, idx) => idx === i ? { ...s, [field]: val } : s);
      return { ...f, slabs };
    });
  };

  const addSlab = () => {
    setForm(f => ({
      ...f,
      slabs: [...f.slabs, { minPct: 0, maxPct: null, type: "percentage", value: 0 }],
    }));
  };

  const removeSlab = (i: number) => {
    setForm(f => ({ ...f, slabs: f.slabs.filter((_, idx) => idx !== i) }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Validation", description: "Rule name is required", variant: "destructive" });
      return;
    }
    if (form.rewardType === "slab" && form.slabs.length === 0) {
      toast({ title: "Validation", description: "Add at least one slab entry", variant: "destructive" });
      return;
    }

    const payload = {
      ...form,
      appliesToRoleId: null,
      categoryId: null,
      brandId: null,
    };

    try {
      if (editing?._id) {
        await incentiveRuleService.update(editing._id, payload);
        toast({ title: "Updated", description: `${form.name} updated.` });
      } else {
        await incentiveRuleService.create(payload);
        toast({ title: "Created", description: `${form.name} created.` });
      }
      setSheetOpen(false);
      fetchRules();
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.message || "Save failed", variant: "destructive" });
    }
  };

  const activeCount   = rules.filter(r => r.active).length;
  const inactiveCount = rules.filter(r => !r.active).length;

  const columns = [
    {
      header: "Rule Name",
      accessorKey: (rule: IncentiveRule) => (
        <div className="flex flex-col gap-1 min-w-[200px]">
          <span className="font-bold text-slate-800">{rule.name}</span>
          {rule.description && <span className="text-[11px] text-slate-500 max-w-xs">{rule.description}</span>}
        </div>
      )
    },
    {
      header: "Status",
      accessorKey: (rule: IncentiveRule) => (
        <Badge variant={rule.active ? "default" : "secondary"}
          className={`text-[10px] font-bold ${rule.active ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"}`}>
          {rule.active ? "Active" : "Inactive"}
        </Badge>
      )
    },
    {
      header: "Reward Type",
      accessorKey: (rule: IncentiveRule) => (
        <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/20 capitalize">
          {rule.rewardType}
        </Badge>
      )
    },
    {
      header: "Reward Details",
      accessorKey: (rule: IncentiveRule) => {
        if (rule.rewardType === "slab" && rule.slabs.length > 0) {
          return (
            <div className="flex items-center gap-1 flex-wrap max-w-[250px]">
              {[...rule.slabs].sort((a, b) => a.minPct - b.minPct).map((s, i) => (
                <span key={i}
                  className="inline-flex items-center gap-1 text-[9.5px] font-semibold bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                  {s.minPct}%{s.maxPct != null ? `–${s.maxPct}%` : "+"}
                  <ChevronRight className="h-2.5 w-2.5 text-slate-300" />
                  <span className="text-primary">{s.type === "fixed" ? `₹${s.value}` : `${s.value}%`}</span>
                </span>
              ))}
            </div>
          );
        }
        return (
          <div className="text-[11px] text-slate-600">
            Reward: <b>{rule.rewardType === "fixed" ? `₹${rule.rewardValue}` : `${rule.rewardValue}%`}</b>
            {rule.conditions?.minRevenue > 0 && <span className="block mt-0.5">Min Revenue: ₹{rule.conditions.minRevenue.toLocaleString("en-IN")}</span>}
          </div>
        );
      }
    },
    {
      header: "Actions",
      accessorKey: (rule: IncentiveRule) => (
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={rule.active}
            onCheckedChange={() => handleToggleActive(rule)}
            className="data-[state=checked]:bg-emerald-500"
          />
          <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}
            className="h-8 w-8 text-amber-500 hover:bg-amber-50 rounded-lg">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(rule)}
            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <PageHeader
        title="Incentive Slabs"
        subtitle="Configure incentive calculation rules and slab structures for employee performance"
        action={
          <Button size="sm" onClick={openNew}
            className="rounded-md gradient-primary text-white border-0 shadow-sm h-9 px-4 text-xs font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Slab Config
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Rules", value: rules.length, icon: Layers, color: "gradient-primary" },
          { label: "Active",      value: activeCount,  icon: CheckCircle2, color: "gradient-success" },
          { label: "Inactive",    value: inactiveCount, icon: XCircle,    color: "gradient-warning" },
        ].map((s, i) => (
          <Card key={s.label} className="glass-deep card-hover border-0 overflow-hidden animate-slide-up"
            style={{ animationDelay: `${i * 60}ms` }}>
            <CardContent className="p-5 relative">
              <div className={`absolute top-0 right-0 w-20 h-20 ${s.color} opacity-[0.08] rounded-bl-[3rem]`} />
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color} text-white mb-3 shadow-glow`}>
                <s.icon className="h-5 w-5" />
              </div>
              <p className="text-3xl font-bold tracking-tight text-foreground">{s.value}</p>
              <p className="text-[12px] font-semibold text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rules list */}
      <div className="animate-fade-in">
        <DataTable
          data={rules}
          columns={columns}
          isLoading={loading}
          emptyMessage="No incentive rules found"
        />
      </div>

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-base font-bold">
              {editing ? "Edit Incentive Rule" : "New Incentive Rule"}
            </SheetTitle>
            <SheetDescription className="text-xs">
              Configure how incentives are calculated for employee targets.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500">Rule Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Standard Sales Incentive"
                className="h-10 rounded-xl bg-slate-50 border-slate-200"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500">Description</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                className="h-10 rounded-xl bg-slate-50 border-slate-200"
              />
            </div>

            {/* Reward Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500">Reward Type *</Label>
              <Select
                value={form.rewardType}
                onValueChange={val => setForm(f => ({ ...f, rewardType: val as any }))}
              >
                <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="slab">Slab (achievement % → incentive %)</SelectItem>
                  <SelectItem value="percentage">Flat Percentage of Revenue</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Flat reward value (for fixed / percentage) */}
            {form.rewardType !== "slab" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">
                  {form.rewardType === "fixed" ? "Fixed Amount (₹)" : "Percentage (%)"}
                </Label>
                <Input
                  type="number"
                  value={form.rewardValue}
                  onChange={e => setForm(f => ({ ...f, rewardValue: Number(e.target.value) }))}
                  className="h-10 rounded-xl bg-slate-50 border-slate-200"
                />
              </div>
            )}

            {/* Slab entries */}
            {form.rewardType === "slab" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-500">Slab Entries</Label>
                  <Button size="sm" variant="outline" onClick={addSlab}
                    className="h-7 text-[11px] rounded-lg border-primary/30 text-primary hover:bg-primary/5">
                    <Plus className="h-3 w-3 mr-1" /> Add Row
                  </Button>
                </div>

                {/* Header labels */}
                <div className="grid grid-cols-10 gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  <span className="col-span-2">Min %</span>
                  <span className="col-span-2">Max %</span>
                  <span className="col-span-3">Type</span>
                  <span className="col-span-2">Value</span>
                  <span />
                </div>

                {form.slabs.map((slab, i) => (
                  <div key={i} className="grid grid-cols-10 gap-1 items-center bg-slate-50 rounded-xl px-2 py-1.5 border border-slate-100">
                    <Input
                      type="number"
                      className="col-span-2 h-8 text-xs rounded-lg border-slate-200 bg-white"
                      value={slab.minPct}
                      onChange={e => updateSlab(i, "minPct", Number(e.target.value))}
                    />
                    <Input
                      type="number"
                      className="col-span-2 h-8 text-xs rounded-lg border-slate-200 bg-white"
                      placeholder="∞"
                      value={slab.maxPct ?? ""}
                      onChange={e => updateSlab(i, "maxPct", e.target.value === "" ? null : Number(e.target.value))}
                    />
                    <Select
                      value={slab.type}
                      onValueChange={val => updateSlab(i, "type", val)}
                    >
                      <SelectTrigger className="col-span-3 h-8 text-xs rounded-lg border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="percentage">% of Revenue</SelectItem>
                        <SelectItem value="fixed">Fixed ₹</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      className="col-span-2 h-8 text-xs rounded-lg border-slate-200 bg-white"
                      value={slab.value}
                      onChange={e => updateSlab(i, "value", Number(e.target.value))}
                    />
                    <button
                      onClick={() => removeSlab(i)}
                      className="text-slate-300 hover:text-red-500 transition-colors flex justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {form.slabs.length === 0 && (
                  <p className="text-[11px] text-slate-400 italic text-center py-2">
                    No slab rows. Click "Add Row" to define thresholds.
                  </p>
                )}
              </div>
            )}

            {/* Optional conditions */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Min Revenue Required (₹)</Label>
                <Input
                  type="number"
                  value={form.conditions.minRevenue}
                  onChange={e => setForm(f => ({ ...f, conditions: { ...f.conditions, minRevenue: Number(e.target.value) } }))}
                  className="h-10 rounded-xl bg-slate-50 border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Min Margin Required (%)</Label>
                <Input
                  type="number"
                  value={form.conditions.minMarginPercent}
                  onChange={e => setForm(f => ({ ...f, conditions: { ...f.conditions, minMarginPercent: Number(e.target.value) } }))}
                  className="h-10 rounded-xl bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.active}
                onCheckedChange={val => setForm(f => ({ ...f, active: val }))}
                className="data-[state=checked]:bg-emerald-500"
              />
              <Label className="text-xs font-semibold text-slate-600">
                {form.active ? "Active — visible for target assignment" : "Inactive — hidden from assignments"}
              </Label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)}
                className="flex-1 h-10 rounded-xl border-slate-200 text-xs font-bold">
                Cancel
              </Button>
              <Button onClick={handleSave}
                className="flex-1 h-10 rounded-xl gradient-primary text-white border-0 text-xs font-bold">
                {editing ? "Save Changes" : "Create Rule"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

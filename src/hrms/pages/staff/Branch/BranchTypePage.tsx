import { useEffect, useState, useMemo } from "react";
import { Plus, Edit2, Trash2, Search, Tags, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/hrms/components/common/PageHeader";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import { Label } from "@/hrms/components/ui/label";
import { Badge } from "@/hrms/components/ui/badge";
import { Switch } from "@/hrms/components/ui/switch";
import { DataTable } from "@/hrms/components/common/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/hrms/components/ui/dialog";
import { branchTypeService, type BranchType } from "@/hrms/services/branchTypeService";
import { useConfirm } from "@/hrms/contexts/ConfirmContext";
import { toast } from "sonner";
import { Card, CardContent } from "@/hrms/components/ui/card";

export default function BranchTypePage() {
  const confirm = useConfirm();
  const [types, setTypes] = useState<BranchType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BranchType | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const loadTypes = async () => {
    setLoading(true);
    try {
      const data = await branchTypeService.getAll();
      setTypes(data);
    } catch {
      toast.error("Failed to load branch types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setFormName("");
    setFormDescription("");
    setFormIsActive(true);
    setIsDialogOpen(true);
  };

  const openEdit = (bt: BranchType) => {
    setEditing(bt);
    setFormName(bt.name);
    setFormDescription(bt.description || "");
    setFormIsActive(bt.isActive);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return toast.error("Type name is required");
    setSubmitting(true);
    try {
      const payload = { name: formName.trim(), description: formDescription.trim(), isActive: formIsActive };
      if (editing) {
        const updated = await branchTypeService.update(editing._id || editing.id!, payload);
        setTypes(prev => prev.map(t => (t._id || t.id) === (editing._id || editing.id) ? updated : t));
        toast.success("Branch type updated");
      } else {
        const created = await branchTypeService.create(payload);
        setTypes(prev => [...prev, created]);
        toast.success("Branch type created");
      }
      setIsDialogOpen(false);
    } catch {
      toast.error("Failed to save branch type");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (bt: BranchType) => {
    const ok = await confirm({
      title: "Delete Branch Type",
      description: `Delete "${bt.name}"? This cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await branchTypeService.delete(bt._id || bt.id!);
      setTypes(prev => prev.filter(t => (t._id || t.id) !== (bt._id || bt.id)));
      toast.success("Branch type deleted");
    } catch {
      toast.error("Failed to delete branch type");
    }
  };

  const filtered = useMemo(() =>
    types
      .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
      .map((t, i) => ({ ...t, sNo: i + 1 })),
    [types, search]
  );

  const stats = useMemo(() => ({
    total: types.length,
    active: types.filter(t => t.isActive).length,
  }), [types]);

  const columns = [
    { header: "S.No", accessorKey: "sNo", minWidth: 70 },
    { header: "Type Name", accessorKey: "name", minWidth: 200, className: "font-semibold text-[#1a1a1a]" },
    { header: "Description", accessorKey: "description", minWidth: 280, className: "text-slate-500 text-xs" },
    {
      header: "Status",
      minWidth: 120,
      accessorKey: (row: BranchType) => (
        <Badge variant="outline" className={row.isActive
          ? "bg-emerald-50 text-emerald-700 border-emerald-100 font-bold"
          : "bg-slate-50 text-slate-500 border-slate-100 font-bold"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      className: "w-[100px] text-right sticky right-0 bg-inherit",
      accessorKey: (row: BranchType) => (
        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl" onClick={() => openEdit(row)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => handleDelete(row)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const labelClass = "text-[12px] font-semibold text-[#333333] tracking-wider mb-1.5 block";
  const inputClass = "h-10 rounded-md border-slate-300 bg-white text-[#333333] text-sm";

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <PageHeader
        title="Branch Types"
        subtitle="Define and manage types that can be assigned to branches"
        action={
          <Button
            size="sm"
            onClick={openAdd}
            className="rounded-md gradient-primary text-white border-0 shadow-sm hover:opacity-95 px-4 h-9 font-medium text-xs flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> New Branch Type
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {[
          { label: "Total Types", value: stats.total, icon: Tags, gradient: "gradient-primary" },
          { label: "Active Types", value: stats.active, icon: CheckCircle2, gradient: "gradient-success" },
          { label: "Inactive Types", value: stats.total - stats.active, icon: XCircle, gradient: "gradient-info" },
        ].map((card, i) => (
          <Card key={card.label} className="glass-deep card-hover border-0 overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <CardContent className="p-5 relative">
              <div className={`absolute top-0 right-0 w-20 h-20 ${card.gradient} opacity-[0.08] rounded-bl-[3rem]`} />
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.gradient} text-white mb-3 shadow-glow`}>
                <card.icon className="h-5 w-5" />
              </div>
              <p className="text-3xl font-bold tracking-tight text-foreground">{card.value}</p>
              <p className="text-[12px] font-semibold text-muted-foreground mt-1">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="glass-deep rounded-2xl p-5 border border-border/40 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search branch types..."
              className="pl-9 h-10 rounded-xl border-slate-200 bg-inherit text-sm"
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={loadTypes}>
            <RefreshCw className={`h-4 w-4 text-slate-400 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="animate-fade-in">
        <DataTable
          data={filtered}
          columns={columns}
          isLoading={loading}
          emptyMessage="No branch types found. Create one to get started."
        />
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1a1a1a]">
              {editing ? "Edit Branch Type" : "New Branch Type"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-1">
              <Label className={labelClass}>Type Name <span className="text-destructive">*</span></Label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Retail, Warehouse, Distribution"
                className={inputClass}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className={labelClass}>Description</Label>
              <Input
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Brief description (optional)"
                className={inputClass}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-sm font-semibold text-[#1a1a1a]">Active Status</p>
                <p className="text-[11px] text-muted-foreground">Inactive types won't appear in branch forms</p>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-9">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={submitting}
              className="gradient-primary text-white border-0 rounded-xl h-9 px-6 font-semibold shadow-sm hover:opacity-90"
            >
              {submitting ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

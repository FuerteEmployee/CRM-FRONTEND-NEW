import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Layers, AlertCircle, Edit, Trash2 } from "lucide-react";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { itemService } from "@/api/services/item.service";
import { financeService } from "@/api/services/finance.service";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";

const Items = () => {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const [createForm, setCreateForm] = useState({
    description: "",
    long_description: "",
    rate: "",
    unit: "",
    group: "",
    tax: "none",
  });

  const [editForm, setEditForm] = useState({
    description: "",
    long_description: "",
    rate: "",
    unit: "",
    group: "",
    tax: "none",
  });

  // Fetch Items
  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: ["items"],
    queryFn: async () => {
      const response = await itemService.getAll();
      return Array.isArray(response) ? response : response?.data || [];
    },
  });

  // Fetch Taxes
  const { data: taxes = [] } = useQuery<any[]>({
    queryKey: ["taxes"],
    queryFn: async () => {
      const response = await financeService.getTaxes();
      return Array.isArray(response) ? response : response?.data || [];
    },
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => itemService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast({
        title: "Success",
        description: "Item created successfully.",
        className: "bg-emerald-600 text-white border-none",
      });
      setIsCreateOpen(false);
      setCreateForm({
        description: "",
        long_description: "",
        rate: "",
        unit: "",
        group: "",
        tax: "none",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.response?.data?.message || err.message || "Failed to create item.",
        variant: "destructive",
      });
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => itemService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast({
        title: "Success",
        description: "Item updated successfully.",
        className: "bg-emerald-600 text-white border-none",
      });
      setEditItem(null);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.response?.data?.message || err.message || "Failed to update item.",
        variant: "destructive",
      });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => itemService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast({
        title: "Deleted",
        description: "Item deleted successfully from database.",
        className: "bg-emerald-600 text-white border-none",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.response?.data?.message || err.message || "Failed to delete item.",
        variant: "destructive",
      });
    },
  });

  const filtered = useMemo(() => {
    return items.filter(
      (i: any) =>
        (i.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.long_description || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.group || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.description) {
      toast({ title: "Required Field", description: "Item description/name is required.", variant: "destructive" });
      return;
    }
    const payload = {
      ...createForm,
      rate: Number(createForm.rate) || 0,
      tax: createForm.tax === "none" ? undefined : createForm.tax,
    };
    createMutation.mutate(payload);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.description) {
      toast({ title: "Required Field", description: "Item description/name is required.", variant: "destructive" });
      return;
    }
    const payload = {
      ...editForm,
      rate: Number(editForm.rate) || 0,
      tax: editForm.tax === "none" ? null : editForm.tax,
    };
    updateMutation.mutate({ id: editItem._id, data: payload });
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setEditForm({
      description: item.description || "",
      long_description: item.long_description || "",
      rate: String(item.rate || ""),
      unit: item.unit || "",
      group: item.group || "",
      tax: item.tax?._id || item.tax || "none",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8 animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Items Library</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Manage global products, inventory items, and services
              </p>
            </div>
          </div>

          {can("items", "create") && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest">
                  <Plus className="h-4 w-4" />
                  New Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg rounded-3xl p-6 border-none shadow-2xl bg-white">
                <DialogHeader className="border-b border-border/50 pb-4 mb-4">
                  <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Create New Item
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Item Name / Description <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="e.g. Graphic Design Services"
                      value={createForm.description}
                      onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                      className="rounded-xl h-11 border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Long Description</Label>
                    <Textarea
                      placeholder="Detailed item description for invoices and proposals..."
                      value={createForm.long_description}
                      onChange={(e) => setCreateForm((p) => ({ ...p, long_description: e.target.value }))}
                      className="rounded-xl min-h-[80px] border-slate-200 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">Rate (INR) <span className="text-destructive">*</span></Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={createForm.rate}
                        onChange={(e) => setCreateForm((p) => ({ ...p, rate: e.target.value }))}
                        className="rounded-xl h-11 border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">Unit</Label>
                      <Input
                        placeholder="e.g. hr, qty, month"
                        value={createForm.unit}
                        onChange={(e) => setCreateForm((p) => ({ ...p, unit: e.target.value }))}
                        className="rounded-xl h-11 border-slate-200"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">Group / Category</Label>
                      <Input
                        placeholder="e.g. Services, Hosting"
                        value={createForm.group}
                        onChange={(e) => setCreateForm((p) => ({ ...p, group: e.target.value }))}
                        className="rounded-xl h-11 border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">Tax Class</Label>
                      <Select value={createForm.tax} onValueChange={(v) => setCreateForm((p) => ({ ...p, tax: v }))}>
                        <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-white">
                          <SelectValue placeholder="No Tax" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                          <SelectItem value="none">No Tax</SelectItem>
                          {taxes.map((t: any) => (
                            <SelectItem key={t._id} value={t._id}>
                              {t.name} ({t.taxrate}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-xl font-bold mt-4" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Item"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="relative max-w-md bg-muted/10 p-2 rounded-2xl border border-border/50">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items library..."
            className="pl-10 h-10 bg-background border-none shadow-sm rounded-xl text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Items Data Grid */}
        <Card className="rounded-[2rem] border border-border/50 overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                  <tr>
                    {["Item Name", "Group", "Description", "Rate", "Unit", "Tax", "Actions"].map((h) => (
                      <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {isLoading ? (
                    Array(4)
                      .fill(0)
                      .map((_, i) => (
                        <tr key={i}>
                          <td colSpan={7} className="p-4">
                            <Skeleton className="h-10 w-full" />
                          </td>
                        </tr>
                      ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">
                        No database items found. Use "New Item" to populate the list.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item: any) => (
                      <tr key={item._id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{item.description}</td>
                        <td className="px-6 py-4">
                          {item.group ? (
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-bold uppercase tracking-wider text-[9px] px-2 py-0.5">
                              {item.group}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 font-medium">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">{item.long_description || "-"}</td>
                        <td className="px-6 py-4 font-black text-slate-900">
                          ₹{(item.rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-500">{item.unit || "item"}</td>
                        <td className="px-6 py-4">
                          {item.tax ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 border-none font-black text-[10px]">
                              {typeof item.tax === "object" ? item.tax.name : "Active Tax"} (
                              {typeof item.tax === "object" ? item.tax.taxrate : item.rate_tax || 0}%)
                            </Badge>
                          ) : (
                            <span className="text-slate-400 font-medium">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <TableActions
                            onView={() => setViewItem(item)}
                            onEdit={can("items", "edit") ? () => openEdit(item) : undefined}
                            onDelete={can("items", "delete") ? () => deleteMutation.mutate(item._id) : undefined}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Item Details */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none shadow-2xl bg-white">
          <DialogHeader className="border-b border-border/50 pb-4 mb-4">
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Item Information
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Item Name</p>
                <p className="text-sm font-bold text-slate-800">{viewItem.description}</p>
              </div>
              {viewItem.long_description && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Long Description</p>
                  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">{viewItem.long_description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Rate</p>
                  <p className="text-sm font-extrabold text-slate-900">₹{(viewItem.rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Unit</p>
                  <p className="text-sm font-bold text-slate-700">{viewItem.unit || "item"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Group / Category</p>
                  <p className="text-xs font-bold text-slate-700">{viewItem.group || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tax rate</p>
                  <p className="text-xs font-bold text-emerald-700">
                    {viewItem.tax ? `${typeof viewItem.tax === "object" ? viewItem.tax.name : "Active Tax"} (${typeof viewItem.tax === "object" ? viewItem.tax.taxrate : 0}%)` : "No Tax"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Item Details */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6 border-none shadow-2xl bg-white">
          <DialogHeader className="border-b border-border/50 pb-4 mb-4">
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Edit Item Settings
            </DialogTitle>
          </DialogHeader>
          {editItem && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Item Name / Description <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Item Name"
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="rounded-xl h-11 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Long Description</Label>
                <Textarea
                  placeholder="Detailed description..."
                  value={editForm.long_description}
                  onChange={(e) => setEditForm((p) => ({ ...p, long_description: e.target.value }))}
                  className="rounded-xl min-h-[80px] border-slate-200 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Rate (INR) <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={editForm.rate}
                    onChange={(e) => setEditForm((p) => ({ ...p, rate: e.target.value }))}
                    className="rounded-xl h-11 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Unit</Label>
                  <Input
                    placeholder="e.g. hr, qty"
                    value={editForm.unit}
                    onChange={(e) => setEditForm((p) => ({ ...p, unit: e.target.value }))}
                    className="rounded-xl h-11 border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Group / Category</Label>
                  <Input
                    placeholder="e.g. Services"
                    value={editForm.group}
                    onChange={(e) => setEditForm((p) => ({ ...p, group: e.target.value }))}
                    className="rounded-xl h-11 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Tax Class</Label>
                  <Select value={editForm.tax} onValueChange={(v) => setEditForm((p) => ({ ...p, tax: v }))}>
                    <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-white">
                      <SelectValue placeholder="No Tax" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      <SelectItem value="none">No Tax</SelectItem>
                      {taxes.map((t: any) => (
                        <SelectItem key={t._id} value={t._id}>
                          {t.name} ({t.taxrate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl font-bold mt-4" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Items;

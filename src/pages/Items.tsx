import { useState, useMemo } from "react";
import { useOpenCreateModal } from "@/hooks/useOpenCreateModal";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Layers, Edit, Zap } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { ImportButton } from "@/components/ui/import-button";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { itemService } from "@/api/services/item.service";
import { financeService } from "@/api/services/finance.service";
import { customFieldService } from "@/api/services/custom-field.service";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/context/CurrencyContext";

const Items = () => {
  const { symbol } = useCurrency();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  useOpenCreateModal(() => setIsCreateOpen(true));
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({ massDelete: false });
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const [createForm, setCreateForm] = useState<any>({
    name: "",
    long_description: "",
    quantity: "1",
    rate: "0",
    amount: "0",
    unit: "",
    group: "",
    tax: "none",
    custom_fields: {},
  });

  const [editForm, setEditForm] = useState<any>({
    name: "",
    long_description: "",
    quantity: "1",
    rate: "0",
    amount: "0",
    unit: "",
    group: "",
    tax: "none",
    custom_fields: {},
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

  // Fetch Custom Fields for "items"
  const { data: customFieldsRaw = [] } = useQuery<any[]>({
    queryKey: ["custom-fields", "items"],
    queryFn: async () => {
      const response = await customFieldService.getAll("items");
      return Array.isArray(response) ? response : response?.data || [];
    },
  });

  const customFieldDefs = useMemo(() => {
    return (Array.isArray(customFieldsRaw) ? customFieldsRaw : []).filter((cf: any) => cf.active !== false);
  }, [customFieldsRaw]);

  const tableCustomFields = useMemo(() => {
    return customFieldDefs.filter((cf: any) => cf.show_on_table);
  }, [customFieldDefs]);

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
        name: "",
        long_description: "",
        quantity: "1",
        rate: "0",
        amount: "0",
        unit: "",
        group: "",
        tax: "none",
        custom_fields: {},
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

  const importMutation = useMutation({
    mutationFn: (rows: any[]) => itemService.import(rows),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      const count = data?.data?.count ?? data?.count ?? 0;
      const skipped = data?.data?.skipped ?? data?.skipped ?? 0;
      toast({
        title: count === 0 ? "No New Items" : "Import Successful",
        description: count === 0 ? "All items already exist." : `Imported ${count} item(s)${skipped ? `, skipped ${skipped} duplicate(s)` : ""}.`,
        variant: count === 0 ? "destructive" : "default"
      });
    },
    onError: (err: any) => toast({ title: "Import Failed", description: err?.response?.data?.message || err.message, variant: "destructive" }),
  });

  const getRowValue = (row: Record<string, any>, aliases: string[]) => {
    if (!row || typeof row !== "object") return "";
    const keys = Object.keys(row);
    for (const alias of aliases) {
      const cleanAlias = alias.trim().toLowerCase().replace(/[\s_]+/g, "");
      for (const k of keys) {
        const cleanK = k.trim().toLowerCase().replace(/[\s_]+/g, "");
        if (cleanK === cleanAlias) {
          const val = row[k];
          if (val !== undefined && val !== null && String(val).trim() !== "") {
            return String(val).trim();
          }
        }
      }
    }
    return "";
  };

  const handleImportData = (rows: Record<string, any>[]) => {
    const valid = rows.filter(r => {
      const name = getRowValue(r, ["item_name", "item name", "name", "item", "title", "product", "product_name", "description", "item_description"]);
      return name && name !== "-";
    });
    if (!valid.length) {
      toast({ title: "No valid rows", description: "Each row needs an 'Item Name', 'Name', or 'Description' column.", variant: "destructive" });
      return;
    }
    importMutation.mutate(valid as any);
  };

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
        (i.name || i.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.long_description || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.group || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const handleSelectAll = (checked: boolean) => {
    const pageData = filtered.slice(0, itemsPerPage === "All" ? filtered.length : parseInt(itemsPerPage));
    if (checked) setSelectedItems(pageData.map((item: any) => item._id).filter(Boolean));
    else setSelectedItems([]);
  };

  const handleBulkAction = async () => {
    if (selectedItems.length === 0) {
      toast({ title: "Error", description: "No items selected." });
      return;
    }
    if (!bulkState.massDelete) {
      toast({ title: "Action Required", description: "Please select Mass Delete to proceed.", variant: "destructive" });
      return;
    }
    setIsBulkLoading(true);
    try {
      if (bulkState.massDelete) {
        try {
          await itemService.bulkDelete(selectedItems);
        } catch {
          await Promise.allSettled(selectedItems.map(id => itemService.delete(id)));
        }
        toast({
          title: "Success",
          description: `Deleted ${selectedItems.length} selected item(s).`,
          className: "bg-emerald-600 text-white border-none"
        });
      }
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setSelectedItems([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || err.message || "Failed to perform bulk action.",
        variant: "destructive"
      });
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Auto-calculation handlers
  const handleCreateQuantityChange = (val: string) => {
    const qty = Number(val) || 0;
    const rate = Number(createForm.rate) || 0;
    setCreateForm((p: any) => ({ ...p, quantity: val, amount: String(qty * rate) }));
  };

  const handleCreateRateChange = (val: string) => {
    const qty = Number(createForm.quantity) || 0;
    const rate = Number(val) || 0;
    setCreateForm((p: any) => ({ ...p, rate: val, amount: String(qty * rate) }));
  };

  const handleEditQuantityChange = (val: string) => {
    const qty = Number(val) || 0;
    const rate = Number(editForm.rate) || 0;
    setEditForm((p: any) => ({ ...p, quantity: val, amount: String(qty * rate) }));
  };

  const handleEditRateChange = (val: string) => {
    const qty = Number(editForm.quantity) || 0;
    const rate = Number(val) || 0;
    setEditForm((p: any) => ({ ...p, rate: val, amount: String(qty * rate) }));
  };

  const validateForm = (form: any) => {
    if (!form.name || !form.name.trim()) {
      toast({ title: "Required Field", description: "Item Name is required.", variant: "destructive" });
      return false;
    }

    for (const cf of customFieldDefs) {
      if (cf.required) {
        const val = form.custom_fields?.[cf._id] ?? form.custom_fields?.[cf.slug];
        if (val === undefined || val === null || String(val).trim() === "") {
          toast({ title: "Required Field", description: `${cf.name} is required.`, variant: "destructive" });
          return false;
        }
      }
    }
    return true;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(createForm)) return;

    const payload = {
      ...createForm,
      quantity: Number(createForm.quantity) || 1,
      rate: Number(createForm.rate) || 0,
      amount: Number(createForm.amount) || 0,
      tax: createForm.tax === "none" ? undefined : createForm.tax,
    };
    createMutation.mutate(payload);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(editForm)) return;

    const payload = {
      ...editForm,
      quantity: Number(editForm.quantity) || 1,
      rate: Number(editForm.rate) || 0,
      amount: Number(editForm.amount) || 0,
      tax: editForm.tax === "none" ? null : editForm.tax,
    };
    updateMutation.mutate({ id: editItem._id, data: payload });
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setEditForm({
      name: item.name || item.description || "",
      long_description: item.long_description || "",
      quantity: String(item.quantity ?? 1),
      rate: String(item.rate ?? 0),
      amount: String(item.amount ?? ((item.quantity ?? 1) * (item.rate ?? 0))),
      unit: item.unit || "",
      group: item.group || "",
      tax: item.tax?._id || item.tax || "none",
      custom_fields: item.custom_fields || {},
    });
  };

  const renderCustomFieldInput = (field: any, formState: any, setFormState: React.Dispatch<React.SetStateAction<any>>) => {
    const val = formState.custom_fields?.[field._id] ?? formState.custom_fields?.[field.slug] ?? field.default_value ?? "";

    const handleChange = (newVal: any) => {
      setFormState((prev: any) => ({
        ...prev,
        custom_fields: {
          ...prev.custom_fields,
          [field._id]: newVal,
          [field.slug]: newVal,
        },
      }));
    };

    return (
      <div key={field._id} className="space-y-2">
        <Label className="text-xs font-bold text-slate-700">
          {field.name} {field.required && <span className="text-destructive">*</span>}
        </Label>
        {field.type === "textarea" ? (
          <Textarea
            value={val}
            onChange={(e) => handleChange(e.target.value)}
            className="rounded-xl min-h-[70px] border-slate-200 resize-none text-xs"
          />
        ) : field.type === "select" || field.type === "multiselect" ? (
          <Select value={val} onValueChange={handleChange}>
            <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-white text-xs">
              <SelectValue placeholder={`Select ${field.name}`} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
              {(field.options || "").split(",").map((opt: string) => {
                const trimmed = opt.trim();
                return (
                  <SelectItem key={trimmed} value={trimmed} className="text-xs">
                    {trimmed}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        ) : field.type === "checkbox" ? (
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              checked={val === true || val === "true"}
              onCheckedChange={(checked) => handleChange(!!checked)}
            />
            <span className="text-xs font-medium text-slate-600">Enable</span>
          </div>
        ) : field.type === "date_picker" || field.type === "date_picker_time" ? (
          <Input
            type={field.type === "date_picker_time" ? "datetime-local" : "date"}
            value={val}
            onChange={(e) => handleChange(e.target.value)}
            className="rounded-xl h-11 border-slate-200 text-xs"
          />
        ) : field.type === "colorpicker" ? (
          <Input
            type="color"
            value={val || "#000000"}
            onChange={(e) => handleChange(e.target.value)}
            className="rounded-xl h-11 w-20 border-slate-200 p-1 cursor-pointer"
          />
        ) : field.type === "number" ? (
          <Input
            type="number"
            value={val}
            onChange={(e) => handleChange(e.target.value)}
            className="rounded-xl h-11 border-slate-200 text-xs"
          />
        ) : (
          <Input
            type={field.type === "link" ? "url" : "text"}
            placeholder={field.type === "link" ? "https://" : ""}
            value={val}
            onChange={(e) => handleChange(e.target.value)}
            className="rounded-xl h-11 border-slate-200 text-xs"
          />
        )}
      </div>
    );
  };

  const exportColumns = useMemo(() => {
    const cols = [
      { header: "Name", key: (i: any) => i.name || i.description },
      { header: "Group", key: (i: any) => i.group || "-" },
      { header: "Description", key: (i: any) => i.long_description || "-" },
      { header: "Quantity", key: (i: any) => i.quantity ?? 1 },
      { header: "Rate", key: "rate" },
      { header: "Amount", key: (i: any) => i.amount ?? ((i.quantity ?? 1) * (i.rate ?? 0)) },
      { header: "Unit", key: (i: any) => i.unit || "item" },
      { header: "Tax", key: (i: any) => i.tax ? (typeof i.tax === "object" ? `${i.tax.name} (${i.tax.taxrate}%)` : "Active Tax") : "-" }
    ];
    tableCustomFields.forEach((cf: any) => {
      cols.push({
        header: cf.name,
        key: (i: any) => i.custom_fields?.[cf.slug] ?? i.custom_fields?.[cf._id] ?? "-"
      });
    });
    return cols;
  }, [tableCustomFields]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8 animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Items Library</h2>
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
              <DialogContent className="max-w-lg rounded-3xl p-6 border-none shadow-2xl bg-white max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b border-border/50 pb-4 mb-4">
                  <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Create New Item
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Name <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="e.g. Graphic Design Services"
                      value={createForm.name}
                      onChange={(e) => setCreateForm((p: any) => ({ ...p, name: e.target.value }))}
                      className="rounded-xl h-11 border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Description</Label>
                    <Textarea
                      placeholder="Detailed item description for invoices and proposals..."
                      value={createForm.long_description}
                      onChange={(e) => setCreateForm((p: any) => ({ ...p, long_description: e.target.value }))}
                      className="rounded-xl min-h-[80px] border-slate-200 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">Quantity</Label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={createForm.quantity}
                        onChange={(e) => handleCreateQuantityChange(e.target.value)}
                        className="rounded-xl h-11 border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">Rate ({symbol})</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={createForm.rate}
                        onChange={(e) => handleCreateRateChange(e.target.value)}
                        className="rounded-xl h-11 border-slate-200"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">Amount ({symbol})</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={createForm.amount}
                        onChange={(e) => setCreateForm((p: any) => ({ ...p, amount: e.target.value }))}
                        className="rounded-xl h-11 border-slate-200 font-bold text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">Unit</Label>
                      <Input
                        placeholder="e.g. hr, qty, month"
                        value={createForm.unit}
                        onChange={(e) => setCreateForm((p: any) => ({ ...p, unit: e.target.value }))}
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
                        onChange={(e) => setCreateForm((p: any) => ({ ...p, group: e.target.value }))}
                        className="rounded-xl h-11 border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">Tax Class</Label>
                      <Select value={createForm.tax} onValueChange={(v) => setCreateForm((p: any) => ({ ...p, tax: v }))}>
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

                  {/* Render Custom Fields */}
                  {customFieldDefs.length > 0 && (
                    <div className="border-t border-border/50 pt-4 space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Custom Fields</p>
                      {customFieldDefs.map((cf: any) => renderCustomFieldInput(cf, createForm, setCreateForm))}
                    </div>
                  )}

                  <Button type="submit" className="w-full h-11 rounded-xl font-bold mt-4" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Item"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Table Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
          <div className="flex items-center gap-3">
            <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
              <SelectTrigger className="h-9 w-[80px] bg-background border-none shadow-sm rounded-lg text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["10", "25", "50", "100", "All"].map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={bulkActionOpen} onOpenChange={(open) => {
              if (open && selectedItems.length === 0) {
                toast({ title: "Error", description: "Please select at least one item first."});
                return;
              }
              setBulkActionOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-11 px-6 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest bg-slate-50 border-slate-200 text-slate-700">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  Bulk Actions
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Bulk Actions</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mass_delete"
                      className="border-red-200 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                      checked={bulkState.massDelete}
                      onCheckedChange={(checked) => setBulkState({...bulkState, massDelete: checked as boolean})}
                    />
                    <Label htmlFor="mass_delete" className="text-sm font-semibold text-red-600">Mass Delete</Label>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="ghost" onClick={() => setBulkActionOpen(false)} className="font-bold uppercase tracking-widest text-[10px]">Close</Button>
                  <Button onClick={handleBulkAction} disabled={isBulkLoading} className="font-bold uppercase tracking-widest text-[10px]">
                    {isBulkLoading ? "Processing..." : "Confirm"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <ExportButton
              data={filtered}
              filename="items"
              columns={exportColumns}
            />
            <ImportButton onData={handleImportData} loading={importMutation.isPending} />
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search items library..."
              className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Items Data Grid */}
        <Card className="rounded-[2rem] border border-border/50 overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                  <tr>
                    <th className="p-3 font-medium w-8">
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={(() => {
                          const pageData = filtered.slice(0, itemsPerPage === "All" ? filtered.length : parseInt(itemsPerPage));
                          return pageData.length > 0 && selectedItems.length === pageData.length;
                        })()}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Name</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Group</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Description</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Quantity</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Rate</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Amount</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Unit</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Tax</th>
                    {tableCustomFields.map((cf: any) => (
                      <th key={cf._id} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">
                        {cf.name}
                      </th>
                    ))}
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {isLoading ? (
                    Array(4)
                      .fill(0)
                      .map((_, i) => (
                        <tr key={i}>
                          <td colSpan={10 + tableCustomFields.length} className="p-4">
                            <Skeleton className="h-10 w-full" />
                          </td>
                        </tr>
                      ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10 + tableCustomFields.length} className="px-6 py-12 text-center text-muted-foreground italic">
                        No database items found. Use "New Item" to populate the list.
                      </td>
                    </tr>
                  ) : (
                    filtered
                      .slice(0, itemsPerPage === "All" ? filtered.length : parseInt(itemsPerPage))
                      .map((item: any) => (
                      <tr key={item._id} className={`hover:bg-muted/30 transition-colors ${selectedItems.includes(item._id) ? 'bg-primary/5' : ''}`}>
                        <td className="p-3">
                          <input
                            type="checkbox"
                            className="rounded border-border"
                            checked={selectedItems.includes(item._id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedItems(prev => [...prev, item._id]);
                              else setSelectedItems(prev => prev.filter(id => id !== item._id));
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">{item.name || item.description}</td>
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
                        <td className="px-6 py-4 font-bold text-slate-800">{item.quantity ?? 1}</td>
                        <td className="px-6 py-4 font-black text-slate-900">
                          {symbol}{(item.rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 font-black text-slate-900">
                          {symbol}{(item.amount ?? ((item.quantity ?? 1) * (item.rate ?? 0))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                        {tableCustomFields.map((cf: any) => {
                          const val = item.custom_fields?.[cf.slug] ?? item.custom_fields?.[cf._id] ?? "-";
                          return (
                            <td key={cf._id} className="px-6 py-4 font-medium text-slate-600">
                              {typeof val === "boolean" ? (val ? "Yes" : "No") : String(val || "-")}
                            </td>
                          );
                        })}
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

        {/* Pagination Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4 mb-4">
          <p className="text-xs font-bold text-muted-foreground italic">
            Showing 1 to {filtered.slice(0, itemsPerPage === "All" ? filtered.length : parseInt(itemsPerPage)).length} of {filtered.length} entries
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>
              Previous
            </Button>
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">
              1
            </div>
            <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* View Item Details */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none shadow-2xl bg-white max-h-[90vh] overflow-y-auto">
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
                <p className="text-sm font-bold text-slate-800">{viewItem.name || viewItem.description}</p>
              </div>
              {viewItem.long_description && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Description</p>
                  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">{viewItem.long_description}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Quantity</p>
                  <p className="text-sm font-extrabold text-slate-900">{viewItem.quantity ?? 1}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Rate</p>
                  <p className="text-sm font-extrabold text-slate-900">{symbol}{(viewItem.rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Amount</p>
                  <p className="text-sm font-extrabold text-slate-900">{symbol}{(viewItem.amount ?? ((viewItem.quantity ?? 1) * (viewItem.rate ?? 0))).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Unit</p>
                  <p className="text-sm font-bold text-slate-700">{viewItem.unit || "item"}</p>
                </div>
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

              {customFieldDefs.length > 0 && viewItem.custom_fields && (
                <div className="border-t border-border/50 pt-3 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Custom Fields</p>
                  <div className="grid grid-cols-2 gap-3">
                    {customFieldDefs.map((cf: any) => {
                      const val = viewItem.custom_fields?.[cf.slug] ?? viewItem.custom_fields?.[cf._id];
                      if (val === undefined || val === null || val === "") return null;
                      return (
                        <div key={cf._id}>
                          <p className="text-[10px] font-bold text-slate-500">{cf.name}</p>
                          <p className="text-xs font-semibold text-slate-800">
                            {typeof val === "boolean" ? (val ? "Yes" : "No") : String(val)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Item Details */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6 border-none shadow-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/50 pb-4 mb-4">
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Edit Item Settings
            </DialogTitle>
          </DialogHeader>
          {editItem && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Item Name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p: any) => ({ ...p, name: e.target.value }))}
                  className="rounded-xl h-11 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Description</Label>
                <Textarea
                  placeholder="Detailed description..."
                  value={editForm.long_description}
                  onChange={(e) => setEditForm((p: any) => ({ ...p, long_description: e.target.value }))}
                  className="rounded-xl min-h-[80px] border-slate-200 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Quantity</Label>
                  <Input
                    type="number"
                    placeholder="1"
                    value={editForm.quantity}
                    onChange={(e) => handleEditQuantityChange(e.target.value)}
                    className="rounded-xl h-11 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Rate ({symbol})</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={editForm.rate}
                    onChange={(e) => handleEditRateChange(e.target.value)}
                    className="rounded-xl h-11 border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Amount ({symbol})</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={editForm.amount}
                    onChange={(e) => setEditForm((p: any) => ({ ...p, amount: e.target.value }))}
                    className="rounded-xl h-11 border-slate-200 font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Unit</Label>
                  <Input
                    placeholder="e.g. hr, qty"
                    value={editForm.unit}
                    onChange={(e) => setEditForm((p: any) => ({ ...p, unit: e.target.value }))}
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
                    onChange={(e) => setEditForm((p: any) => ({ ...p, group: e.target.value }))}
                    className="rounded-xl h-11 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Tax Class</Label>
                  <Select value={editForm.tax} onValueChange={(v) => setEditForm((p: any) => ({ ...p, tax: v }))}>
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

              {/* Custom Fields in Edit */}
              {customFieldDefs.length > 0 && (
                <div className="border-t border-border/50 pt-4 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Custom Fields</p>
                  {customFieldDefs.map((cf: any) => renderCustomFieldInput(cf, editForm, setEditForm))}
                </div>
              )}

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

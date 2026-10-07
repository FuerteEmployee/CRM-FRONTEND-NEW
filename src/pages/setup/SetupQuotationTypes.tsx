import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from "@/components/ui/table";
import { Plus, Search, Edit2, Trash2, FileBarChart } from "lucide-react";
import * as Icons from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quotationTypeService } from "@/api/services/quotationType.service";
import { toast } from "sonner";

const DEFAULT_THEME = {
  primaryColor: "#3592ea",
  roomHeaderBg: "#882200",
  headerText: "#ffffff",
  topBorder: "#3592ea",
  flatTypeBg: "#1f2937",
  flatTypeText: "#ffffff",
};

const THEME_FIELDS: { key: keyof typeof DEFAULT_THEME; label: string; hint: string }[] = [
  { key: "primaryColor", label: "Primary Color", hint: "Main accent color" },
  { key: "roomHeaderBg", label: "Room Header BG", hint: "Room title background" },
  { key: "headerText", label: "Header Text", hint: "Room title text color" },
  { key: "topBorder", label: "Top Border", hint: "Header border accent" },
  { key: "flatTypeBg", label: "Flat Type BG", hint: "Flat type banner background" },
  { key: "flatTypeText", label: "Flat Type Text", hint: "Flat type text color" },
];

const emptyForm = () => ({
  name: "",
  icon: "FileBarChart",
  format: "both",
  order: 0,
  active: true,
  theme: { ...DEFAULT_THEME },
});

const SetupQuotationTypes = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>(emptyForm());

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["quotation-types"],
    queryFn: () => quotationTypeService.getQuotationTypes(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["quotation-types"] });
    // The sidebar reads this same list to build the "Quotation Maker" group.
    queryClient.invalidateQueries({ queryKey: ["quotation-types", "active"] });
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => quotationTypeService.createQuotationType(data),
    onSuccess: () => {
      invalidate();
      toast.success("Quotation type created");
      setIsModalOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || "Failed to create quotation type"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => quotationTypeService.updateQuotationType(id, data),
    onSuccess: () => {
      invalidate();
      toast.success("Quotation type updated");
      setIsModalOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || "Failed to update quotation type"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quotationTypeService.deleteQuotationType(id),
    onSuccess: () => {
      invalidate();
      toast.success("Quotation type deleted");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err.message || "Failed to delete quotation type"),
  });

  const handleDelete = (id: string) => {
    if (confirm("Delete this quotation type? Existing quotations created under it are kept, but it will disappear from the sidebar.")) {
      deleteMutation.mutate(id);
    }
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name || "",
        icon: item.icon || "FileBarChart",
        format: item.format || "both",
        order: item.order || 0,
        active: item.active !== false,
        theme: { ...DEFAULT_THEME, ...(item.theme || {}) },
      });
    } else {
      setEditingItem(null);
      setFormData(emptyForm());
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredData = types.filter((item: any) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quotation Maker — Types</h1>
            <p className="text-muted-foreground text-sm font-medium">
              Define the quotation types shown under "Quotation Maker" in the sidebar, each with its own PDF theme
            </p>
          </div>
          <Button
            className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
            onClick={() => openModal()}
          >
            <Plus className="h-4 w-4" />
            New Quotation Type
          </Button>
        </div>

        <Card className="border shadow-sm rounded-lg overflow-hidden">
          <CardHeader className="bg-accent/5 border-b border-border/40 p-4">
            <div className="flex-1 max-w-sm relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search quotation types..."
                className="pl-10 h-9 rounded-lg border-border/40 bg-background focus-visible:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Icon</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Theme</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Options</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell colSpan={7}>
                          <div className="h-4 bg-muted rounded w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredData.length > 0 ? (
                    filteredData.map((item: any) => {
                      const IconComponent = (Icons as any)[item.icon] || FileBarChart;
                      return (
                        <TableRow key={item._id} className="group">
                          <TableCell className="text-muted-foreground">
                            <IconComponent className="h-5 w-5" />
                          </TableCell>
                          <TableCell><span className="font-semibold">{item.name}</span></TableCell>
                          <TableCell className="text-muted-foreground">
                            <span className="px-2 py-1 bg-accent/10 border border-border/40 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              {item.format}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {THEME_FIELDS.slice(0, 4).map((f) => (
                                <span
                                  key={f.key}
                                  title={f.label}
                                  className="h-4 w-4 rounded-full border border-border/40"
                                  style={{ background: item.theme?.[f.key] || DEFAULT_THEME[f.key] }}
                                />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{item.order}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.active !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {item.active !== false ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                onClick={() => openModal(item)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                                onClick={() => handleDelete(item._id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableEmpty colSpan={7}>
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="p-4 rounded-full bg-accent/10 text-muted-foreground/40">
                            <FileBarChart className="h-8 w-8" />
                          </div>
                          <p>
                            No quotation types yet — create one to add it to the "Quotation Maker" sidebar group
                          </p>
                        </div>
                    </TableEmpty>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Quotation Type" : "Create Quotation Type"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Electrical, Interior, Home Automation"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Icon (Lucide Component Name)</Label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="e.g. FileBarChart, Lightbulb, Home"
              />
            </div>
            <div className="space-y-2">
              <Label>Create-Quotation Format</Label>
              <Select value={formData.format} onValueChange={(val) => setFormData({ ...formData, format: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Simple + Pro (user chooses)</SelectItem>
                  <SelectItem value="simple">Simple only</SelectItem>
                  <SelectItem value="pro">Pro only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked as boolean })}
              />
              <Label htmlFor="active">Active (visible in sidebar)</Label>
            </div>

            <div className="pt-2 border-t border-border/40">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Default PDF Theme
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {THEME_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs font-medium">{f.label}</Label>
                    <p className="text-[11px] text-muted-foreground -mt-0.5">{f.hint}</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.theme[f.key]}
                        onChange={(e) =>
                          setFormData({ ...formData, theme: { ...formData.theme, [f.key]: e.target.value } })
                        }
                        className="h-9 w-9 rounded border border-border/40 cursor-pointer shrink-0"
                      />
                      <Input
                        value={formData.theme[f.key]}
                        onChange={(e) =>
                          setFormData({ ...formData, theme: { ...formData.theme, [f.key]: e.target.value } })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SetupQuotationTypes;

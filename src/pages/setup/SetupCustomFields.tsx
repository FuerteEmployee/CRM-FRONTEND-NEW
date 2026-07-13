import { useState } from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "@/api/services/settings.service";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2 } from "lucide-react";
import { SIDEBAR_MODULES } from "@/lib/modules";

const FIELD_TYPES = [
  { value: "input", label: "Input" },
  { value: "number", label: "Number" },
  { value: "textarea", label: "Textarea" },
  { value: "select", label: "Select" },
  { value: "multiselect", label: "Multi Select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date_picker", label: "Date Picker" },
  { value: "date_picker_time", label: "Datetime Picker" },
  { value: "colorpicker", label: "Color Picker" },
  { value: "link", label: "Hyperlink" },
];

const OPTIONS_TYPES = ["select", "multiselect", "checkbox"];

const DEFAULT_FORM = {
  name: "",
  type: "input",
  fieldto: "customers",
  slug: "",
  options: "",
  default_value: "",
  field_order: 0,
  bs_column: 12,
  active: true,
  only_admin: false,
  required: false,
  show_on_table: false,
};

export default function SetupCustomFields() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { toast } = useToast();
  const canWrite = editingId ? can("Custom Fields", "Edit") : can("Custom Fields", "Create");

  const { data: customFields = [], isLoading } = useQuery({
    queryKey: ["custom-fields"],
    queryFn: async () => {
      try {
        const response = await settingsService.getCustomFields();
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching custom fields:", error);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => settingsService.createCustomField(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast({ title: "Success", description: "Custom field created successfully" });
      closeModal();
    },
    onError: (err: any) => toast({ title: "Error", description: err?.response?.data?.message || "Failed to create custom field", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => settingsService.updateCustomField(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast({ title: "Success", description: "Custom field updated successfully" });
      closeModal();
    },
    onError: (err: any) => toast({ title: "Error", description: err?.response?.data?.message || "Failed to update custom field", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsService.deleteCustomField(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast({ title: "Success", description: "Custom field deleted successfully" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete custom field", variant: "destructive" }),
  });

  const openModal = (field?: any) => {
    if (field) {
      setEditingId(field._id);
      setFormData({
        name: field.name || "",
        type: field.type || "input",
        fieldto: field.fieldto || "customers",
        slug: field.slug || "",
        options: field.options || "",
        default_value: field.default_value || "",
        field_order: field.field_order ?? 0,
        bs_column: field.bs_column ?? 12,
        active: field.active ?? true,
        only_admin: field.only_admin ?? false,
        required: field.required ?? false,
        show_on_table: field.show_on_table ?? false,
      });
    } else {
      setEditingId(null);
      setFormData(DEFAULT_FORM);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formData.name || !formData.type || !formData.fieldto) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const payload = {
      ...formData,
      slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      field_order: Number(formData.field_order) || 0,
      bs_column: Math.min(12, Math.max(1, Number(formData.bs_column) || 12)),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <>
      <DataTablePage
        title="Custom Fields"
        subtitle="Add custom fields to extend your CRM data"
        addLabel="Add Field"
        onAdd={can("Custom Fields", "Create") ? () => openModal() : undefined}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ["custom-fields"] })}
        isLoading={isLoading}
        data={customFields}
        onEdit={can("Custom Fields", "Edit") ? (p) => openModal(p) : undefined}
        onDelete={can("Custom Fields", "Delete") ? (p) => {
            if (confirm("Are you sure you want to delete this custom field?")) deleteMutation.mutate(p._id);
          } : undefined
        }
        columns={[
          { key: "name", label: "Field Name", className: "font-medium text-foreground w-1/4" },
          { key: "type", label: "Field Type", render: (f: any) => FIELD_TYPES.find((t) => t.value === f.type)?.label || f.type },
          { key: "fieldto", label: "Belongs To", render: (f: any) => SIDEBAR_MODULES.find((m) => m.value === f.fieldto)?.label || f.fieldto },
          { key: "required", label: "Required", render: (f: any) => (f.required ? "Yes" : "No") },
          { key: "active", label: "Status", render: (f: any) => (f.active === false ? "Disabled" : "Active") },
        ]}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden rounded-xl max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {editingId ? "Edit Custom Field" : "Add Custom Field"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4 overflow-y-auto">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Field Belongs to
              </label>
              <Select
                value={formData.fieldto}
                onValueChange={(val) => setFormData({ ...formData, fieldto: val })}
                disabled={!canWrite}
              >
                <SelectTrigger className="h-10 border-gray-300">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {SIDEBAR_MODULES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Field Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-10 border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="e.g. Industry"
                disabled={!canWrite}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Type
              </label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
                disabled={!canWrite}
              >
                <SelectTrigger className="h-10 border-gray-300">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {OPTIONS_TYPES.includes(formData.type) && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Options</label>
                <Input
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                  className="h-10 border-gray-300"
                  placeholder="Comma separated, e.g. Small, Medium, Large"
                  disabled={!canWrite}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Default Value</label>
              <Input
                value={formData.default_value}
                onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                className="h-10 border-gray-300"
                disabled={!canWrite}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Order</label>
                <Input
                  type="number"
                  value={formData.field_order}
                  onChange={(e) => setFormData({ ...formData, field_order: Number(e.target.value) })}
                  className="h-10 border-gray-300"
                  disabled={!canWrite}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Grid (Bootstrap Column eq. 12) - Max is 12
                </label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={formData.bs_column}
                  onChange={(e) => setFormData({ ...formData, bs_column: Number(e.target.value) })}
                  className="h-10 border-gray-300"
                  disabled={!canWrite}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cf-disabled"
                  checked={!formData.active}
                  onCheckedChange={(v) => setFormData({ ...formData, active: !v })}
                  disabled={!canWrite}
                />
                <label htmlFor="cf-disabled" className="text-sm font-medium text-foreground cursor-pointer">Disabled</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cf-only-admin"
                  checked={formData.only_admin}
                  onCheckedChange={(v) => setFormData({ ...formData, only_admin: !!v })}
                  disabled={!canWrite}
                />
                <label htmlFor="cf-only-admin" className="text-sm font-medium text-foreground cursor-pointer">
                  Restrict visibility for administrators only
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cf-required"
                  checked={formData.required}
                  onCheckedChange={(v) => setFormData({ ...formData, required: !!v })}
                  disabled={!canWrite}
                />
                <label htmlFor="cf-required" className="text-sm font-medium text-foreground cursor-pointer">Required</label>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm font-semibold text-foreground">Visibility</p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cf-show-table"
                  checked={formData.show_on_table}
                  onCheckedChange={(v) => setFormData({ ...formData, show_on_table: !!v })}
                  disabled={!canWrite}
                />
                <label htmlFor="cf-show-table" className="text-sm font-medium text-foreground cursor-pointer">Show on table</label>
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0 border-t">
            <Button variant="outline" onClick={closeModal} className="bg-white border-gray-300 text-foreground hover:bg-gray-100 px-6 h-10 font-medium">
              Close
            </Button>
            <Button onClick={handleSave} className="px-8 h-10 font-medium text-white" disabled={createMutation.isPending || updateMutation.isPending || !canWrite}>
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
